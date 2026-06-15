// ============================================================================
// IMPORTADOR DA TRANSMUTACAO  (chupa-cabra)  IHE -> Manager
// Braco escrito pelo Dr. Replit Pawards / IHE.
// Destino no repl do Manager: scripts/src/importar-transmutacao-ihe.ts
//
// PRE-REQUISITOS (ja entregues / a aplicar antes de rodar):
//   1. lib/db/src/schema/catalogo-ihe.ts  (schema_catalogo_ihe.ts)
//   2. export * from "./catalogo-ihe";  em lib/db/src/schema/index.ts
//   3. PATCH do clients.ts (clients_PATCH.md): afrouxar cpf/email/phone + 4 colunas
//   4. pnpm --filter @workspace/db run push   (cria tabelas e afrouxa restricoes)
//   5. scripts/package.json -> "scripts": { "transmutar": "tsx ./src/importar-transmutacao-ihe.ts" }
//      e dependencia "@workspace/db": "workspace:*".
//
// COMO RODAR (atras de token de admin, NUNCA exposto em rota publica):
//   ADMIN_TOKEN=<seu_token> pnpm --filter @workspace/scripts run transmutar
//
// SEGURANCA / IDEMPOTENCIA:
//   - Catalogo: upsert por chave (codigo_padcom / codigo_semantico / sigla / codigo_blend).
//   - Pacientes: de-dup pela regra da CARTA_02 6.3 (nunca casar so por CPF).
//   - Toda linha leva etiqueta "IHE_TRANSMUTACAO_26.06.13" -> da pra limpar e refazer.
//   - Rodar 2x NAO duplica.
// ============================================================================

import { db, pool } from "@workspace/db";
import {
  periodosDiaTable,
  catalogoItensTable,
  catalogoFormulasTable,
  catalogoInjetaveisTable,
  catalogoImplantesTable,
  catalogoBlendsTable,
  catalogoBlendAtivosTable,
  clientsTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";

const ORIGEM = "IHE_TRANSMUTACAO_26.06.13";

// Onde buscar (raw GitHub publico do IHE). Pode trocar por arquivo local se preferir.
const URL_CATALOGO =
  process.env.URL_CATALOGO ||
  "https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/docs/dr-replit/PARA_MANAGER/catalogo_terapeutico_export_26.06.13.json";
const URL_PACIENTES =
  process.env.URL_PACIENTES ||
  "https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/docs/dr-replit/PARA_MANAGER/pacientes_export_26.06.13.json";

// ---------- proteção: token de admin ----------
if (!process.env.ADMIN_TOKEN) {
  console.error("ABORTADO: defina ADMIN_TOKEN no ambiente antes de rodar.");
  process.exit(1);
}

// ---------- helpers ----------
const s = (v: unknown): string | null =>
  v === null || v === undefined ? null : String(v);
const onlyDigits = (v: unknown): string =>
  (v === null || v === undefined ? "" : String(v)).replace(/\D/g, "");
const firstName = (nome: unknown): string =>
  (nome === null || nome === undefined ? "" : String(nome))
    .trim()
    .toLowerCase()
    .split(/\s+/)[0] || "";

async function buscarJson(url: string): Promise<any> {
  console.log("  baixando:", url);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Falha ao baixar ${url}: HTTP ${r.status}`);
  return r.json();
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// ============================================================================
// 1) CATALOGO (sem PII) — upsert idempotente por chave
// ============================================================================
async function importarCatalogo() {
  console.log("\n=== CATALOGO ===");
  const cat = await buscarJson(URL_CATALOGO);
  const rel: Record<string, number> = {};

  // 1.1 periodos_dia (chave: sigla)
  for (const p of cat.periodos_dia ?? []) {
    await db
      .insert(periodosDiaTable)
      .values({
        sigla: s(p.sigla)!,
        ordem: p.ordem ?? null,
        nome: s(p.nome),
        janelaInicio: s(p.janela_inicio),
        janelaFim: s(p.janela_fim),
        emoji: s(p.emoji),
        corHex: s(p.cor_hex),
        descricao: s(p.descricao),
        origemTransmutacao: ORIGEM,
      })
      .onConflictDoUpdate({
        target: periodosDiaTable.sigla,
        set: {
          ordem: p.ordem ?? null,
          nome: s(p.nome),
          janelaInicio: s(p.janela_inicio),
          janelaFim: s(p.janela_fim),
          emoji: s(p.emoji),
          corHex: s(p.cor_hex),
          descricao: s(p.descricao),
        },
      });
  }
  rel.periodos_dia = (cat.periodos_dia ?? []).length;

  // 1.2 itens_terapeuticos (chave: codigo_padcom)
  for (const it of cat.itens_terapeuticos ?? []) {
    const row = {
      idIhe: it.id ?? null,
      nome: s(it.nome)!,
      descricao: s(it.descricao),
      categoria: s(it.categoria),
      subCategoria: s(it.sub_categoria),
      disponivel: it.disponivel ?? null,
      preco: s(it.preco),
      tags: it.tags ?? null,
      codigoPadcom: s(it.codigo_padcom)!,
      blocoId: it.bloco_id ?? null,
      grau: s(it.grau),
      viaUso: s(it.via_uso),
      frequenciaBase: s(it.frequencia_base),
      composicao: s(it.composicao),
      posologia: s(it.posologia),
      areaSemantica: s(it.area_semantica),
      exigeValidacaoHumana: it.exige_validacao_humana ?? null,
      unidadeId: it.unidade_id ?? null,
      posologiaEstruturada: it.posologia_estruturada ?? null,
      origemTransmutacao: ORIGEM,
    };
    const { codigoPadcom, ...upd } = row;
    await db
      .insert(catalogoItensTable)
      .values(row)
      .onConflictDoUpdate({ target: catalogoItensTable.codigoPadcom, set: upd });
  }
  rel.itens_terapeuticos = (cat.itens_terapeuticos ?? []).length;

  // 1.3 formulas (chave: codigo_semantico)
  for (const f of cat.formulas ?? []) {
    const row = {
      idIhe: f.id ?? null,
      codigoPadcom: s(f.codigo_padcom),
      identificador: s(f.identificador),
      conteudo: s(f.conteudo),
      area: s(f.area),
      funcao: s(f.funcao),
      status: s(f.status),
      tipoLinha: s(f.tipo_linha),
      valorUnidade: s(f.valor_unidade),
      origemValor: s(f.origem_valor),
      codigoSemantico: s(f.codigo_semantico)!,
      b1: s(f.b1),
      b2: s(f.b2),
      b3: s(f.b3),
      b4: s(f.b4),
      seq: s(f.seq),
      viaAdministracao: s(f.via_administracao),
      formaFarmaceutica: s(f.forma_farmaceutica),
      posologiaPadrao: f.posologia_padrao ?? null,
      periodosPadrao: f.periodos_padrao ?? null,
      efeitosColaterais: f.efeitos_colaterais ?? null,
      origemTransmutacao: ORIGEM,
    };
    const { codigoSemantico, ...upd } = row;
    await db
      .insert(catalogoFormulasTable)
      .values(row)
      .onConflictDoUpdate({ target: catalogoFormulasTable.codigoSemantico, set: upd });
  }
  rel.formulas = (cat.formulas ?? []).length;

  // 1.4 injetaveis (chave: codigo_semantico)
  for (const inj of cat.injetaveis ?? []) {
    const row = {
      idIhe: inj.id ?? null,
      codigoPadcom: s(inj.codigo_padcom),
      tipoLinha: s(inj.tipo_linha),
      nomeAmpola: s(inj.nome_ampola),
      nomeExibicao: s(inj.nome_exibicao),
      ativo: inj.ativo ?? null,
      dosagem: s(inj.dosagem),
      volume: s(inj.volume),
      via: s(inj.via),
      valorUnidade: s(inj.valor_unidade),
      origemValor: s(inj.origem_valor),
      statusCadastro: s(inj.status_cadastro),
      observacao: s(inj.observacao),
      classificacao: s(inj.classificacao),
      eixoIntegrativo: s(inj.eixo_integrativo),
      palavraChaveMotor: s(inj.palavra_chave_motor),
      codigoSemantico: s(inj.codigo_semantico)!,
      b1: s(inj.b1),
      b2: s(inj.b2),
      b3: s(inj.b3),
      b4: s(inj.b4),
      seq: s(inj.seq),
      substanciaBase: s(inj.substancia_base),
      origemTransmutacao: ORIGEM,
    };
    const { codigoSemantico, ...upd } = row;
    await db
      .insert(catalogoInjetaveisTable)
      .values(row)
      .onConflictDoUpdate({ target: catalogoInjetaveisTable.codigoSemantico, set: upd });
  }
  rel.injetaveis = (cat.injetaveis ?? []).length;

  // 1.5 implantes (chave: codigo_semantico)
  for (const im of cat.implantes ?? []) {
    const row = {
      idIhe: im.id ?? null,
      codigoPadcom: s(im.codigo_padcom),
      nomeImplante: s(im.nome_implante),
      substanciaAtiva: s(im.substancia_ativa),
      ativo: im.ativo ?? null,
      dosagem: s(im.dosagem),
      unidade: s(im.unidade),
      trocarte: s(im.trocarte),
      liberacaoDiaria: s(im.liberacao_diaria),
      doseRecomendada: s(im.dose_recomendada),
      tempoAcao: s(im.tempo_acao),
      indicacao: s(im.indicacao),
      via: s(im.via),
      valorUnidade: s(im.valor_unidade),
      origemValor: s(im.origem_valor),
      statusCadastro: s(im.status_cadastro),
      observacao: s(im.observacao),
      codigoSemantico: s(im.codigo_semantico)!,
      b1: s(im.b1),
      b2: s(im.b2),
      b3: s(im.b3),
      b4: s(im.b4),
      seq: s(im.seq),
      origemTransmutacao: ORIGEM,
    };
    const { codigoSemantico, ...upd } = row;
    await db
      .insert(catalogoImplantesTable)
      .values(row)
      .onConflictDoUpdate({ target: catalogoImplantesTable.codigoSemantico, set: upd });
  }
  rel.implantes = (cat.implantes ?? []).length;

  // 1.6 blends (cabecalho por codigo_blend) + ativos (filhos por codigo_blend+ordem)
  let totAtivos = 0;
  for (const b of cat.blends ?? []) {
    const head = {
      idIhe: b.id ?? null,
      codigoBlend: s(b.codigo_blend)!,
      nomeBlend: s(b.nome_blend),
      funcao: s(b.funcao),
      via: s(b.via),
      forma: s(b.forma),
      posologia: s(b.posologia),
      duracao: s(b.duracao),
      objetivo: s(b.objetivo),
      ativo: b.ativo ?? null,
      formulaId: b.formula_id ?? null,
      valorBrl: s(b.valor_brl),
      valorMin: s(b.valor_min),
      valorMax: s(b.valor_max),
      origemTransmutacao: ORIGEM,
    };
    const { codigoBlend, ...updHead } = head;
    await db
      .insert(catalogoBlendsTable)
      .values(head)
      .onConflictDoUpdate({ target: catalogoBlendsTable.codigoBlend, set: updHead });

    for (const a of b.ativos ?? []) {
      const ativo = {
        blendCodigo: s(b.codigo_blend)!,
        ordem: a.ordem ?? 0,
        componente: s(a.componente),
        dosagem: s(a.dosagem),
        unidade: s(a.unidade),
        observacao: s(a.observacao),
        valorBrl: s(a.valor_brl),
        valorMin: s(a.valor_min),
        valorMax: s(a.valor_max),
        origemTransmutacao: ORIGEM,
      };
      const { blendCodigo, ordem, ...updAtivo } = ativo;
      await db
        .insert(catalogoBlendAtivosTable)
        .values(ativo)
        .onConflictDoUpdate({
          target: [catalogoBlendAtivosTable.blendCodigo, catalogoBlendAtivosTable.ordem],
          set: updAtivo,
        });
      totAtivos++;
    }
  }
  rel.blends = (cat.blends ?? []).length;
  rel.blend_ativos = totAtivos;

  console.log("  catalogo importado:", rel);
  return rel;
}

// ============================================================================
// 2) PACIENTES (com PII) — de-dup pela regra CARTA_02 6.3
// ============================================================================
const DIRETOS = new Set([
  "id", "nome", "cpf", "data_nascimento", "telefone", "email", "unidade_id",
  "status_ativo", "endereco", "cep", "google_drive_folder_id", "complemento",
  "bairro", "cidade", "estado", "pais", "senha_validacao", "instagram",
  "numero_endereco", "como_nos_conheceu", "observacoes", "codigo_externo",
  "codigo_semantico", "criado_em", "atualizado_em",
]);

function montarEndereco(p: any): string | null {
  const partes = [
    p.endereco,
    p.numero_endereco,
    p.complemento,
    p.bairro,
    p.cidade,
    p.estado,
    p.cep,
  ]
    .map((x) => (x === null || x === undefined ? "" : String(x).trim()))
    .filter(Boolean);
  return partes.length ? partes.join(", ") : null;
}

function fichaClinica(p: any): Record<string, unknown> {
  const ficha: Record<string, unknown> = { _origem: ORIGEM };
  for (const [k, v] of Object.entries(p)) {
    if (!DIRETOS.has(k) && v !== null && v !== undefined && v !== "") ficha[k] = v;
  }
  return ficha;
}

async function importarPacientes() {
  console.log("\n=== PACIENTES ===");
  const dump = await buscarJson(URL_PACIENTES);
  const pacientes: any[] = dump.pacientes ?? [];

  // indices a partir do que ja existe no banco (idempotencia + de-dup)
  const existentes = await db
    .select({
      id: clientsTable.id,
      name: clientsTable.name,
      cpf: clientsTable.cpf,
      codigoOrigemIhe: clientsTable.codigoOrigemIhe,
    })
    .from(clientsTable);

  // indices do BANCO (id ja existente) — usados para UPDATE
  const porOrigem = new Map<string, number>();
  const porCpfNome = new Map<string, number>();
  // indices VIVOS (banco + novos ja decididos neste lote) — usados para DE-DUP intra-arquivo
  const origensVistas = new Set<string>(); // origem ja no banco OU ja staged neste run
  const cpfNomeStaged = new Set<string>(); // cpf|1o-nome ja staged como NOVO neste run
  const cpfNomes = new Map<string, Set<string>>(); // cpf -> conjunto de 1os nomes (banco + novos)
  for (const c of existentes) {
    if (c.codigoOrigemIhe) {
      porOrigem.set(c.codigoOrigemIhe, c.id);
      origensVistas.add(c.codigoOrigemIhe);
    }
    const cpf = onlyDigits(c.cpf);
    if (cpf) {
      porCpfNome.set(cpf + "|" + firstName(c.name), c.id);
      if (!cpfNomes.has(cpf)) cpfNomes.set(cpf, new Set());
      cpfNomes.get(cpf)!.add(firstName(c.name));
    }
  }

  const rel = { criados: 0, atualizados: 0, em_revisao: 0, pulados: 0 };
  const novos: any[] = [];

  for (const p of pacientes) {
    const origem = s(p.codigo_externo) || s(p.codigo_semantico) || "IHE#" + p.id;
    const cpf = onlyDigits(p.cpf);
    const nome1 = firstName(p.nome);

    const base = {
      name: s(p.nome) || "(sem nome)",
      cpf: s(p.cpf),
      email: s(p.email),
      phone: s(p.telefone),
      birthDate: s(p.data_nascimento),
      address: montarEndereco(p),
      pais: s(p.pais) || "BRASIL",
      instagram: s(p.instagram),
      comoConheceu: s(p.como_nos_conheceu),
      status: p.status_ativo === false ? "inactive" : "active",
      notes: s(p.observacoes),
      validationPassword: s(p.senha_validacao),
      driveFolderId: s(p.google_drive_folder_id),
      codigoOrigemIhe: origem,
      unidadeOrigemIhe: p.unidade_id ?? null,
      fichaClinicaIhe: fichaClinica(p),
      origemTransmutacao: ORIGEM,
    };

    // 1) ja importado antes (mesma origem) -> atualiza
    const idOrigem = porOrigem.get(origem!);
    if (idOrigem) {
      await db.update(clientsTable).set(base).where(sql`${clientsTable.id} = ${idOrigem}`);
      rel.atualizados++;
      continue;
    }

    // 1b) mesma origem ja vista neste run (registro repetido no proprio dump) -> pula
    if (origensVistas.has(origem!)) {
      rel.pulados++;
      continue;
    }

    // 2) CPF + 1o nome batem com registro do BANCO -> mesma pessoa -> atualiza
    if (cpf && porCpfNome.has(cpf + "|" + nome1)) {
      const idc = porCpfNome.get(cpf + "|" + nome1)!;
      await db.update(clientsTable).set(base).where(sql`${clientsTable.id} = ${idc}`);
      porOrigem.set(origem!, idc);
      origensVistas.add(origem!);
      rel.atualizados++;
      continue;
    }

    // 2b) CPF + 1o nome batem com um NOVO ja staged neste run (mesma pessoa 2x no dump) -> pula
    if (cpf && cpfNomeStaged.has(cpf + "|" + nome1)) {
      rel.pulados++;
      continue;
    }

    // 3) CPF existe com nome DIFERENTE (mae/filha), no BANCO ou em NOVO staged -> NAO funde, marca revisao
    if (cpf) {
      const nomes = cpfNomes.get(cpf);
      if (nomes && !nomes.has(nome1)) {
        base.notes = "[REVISAR_DUP_CPF] " + (base.notes || "");
        rel.em_revisao++;
      }
    }

    // grava como NOVO e atualiza os indices VIVOS (de-dup intra-arquivo)
    novos.push(base);
    origensVistas.add(origem!);
    if (cpf) {
      cpfNomeStaged.add(cpf + "|" + nome1);
      if (!cpfNomes.has(cpf)) cpfNomes.set(cpf, new Set());
      cpfNomes.get(cpf)!.add(nome1);
    }
    rel.criados++;
  }

  // insere os novos em lotes transacionais
  for (const lote of chunk(novos, 500)) {
    await db.transaction(async (tx) => {
      await tx.insert(clientsTable).values(lote);
    });
  }

  console.log("  pacientes importados:", rel);
  return rel;
}

// ============================================================================
// MAIN — ordem: periodos/catalogos -> pacientes
// ============================================================================
async function main() {
  console.log("TRANSMUTACAO IHE -> Manager | etiqueta:", ORIGEM);
  const relCat = await importarCatalogo();
  const relPac = await importarPacientes();

  console.log("\n================ RELATORIO FINAL ================");
  console.log("CATALOGO :", JSON.stringify(relCat));
  console.log("PACIENTES:", JSON.stringify(relPac));
  console.log("=================================================");
  console.log(
    "Conferir contagens esperadas: itens 457, formulas 54, injetaveis 305, implantes 32, blends 12 (63 ativos), periodos 9, pacientes 5416.",
  );
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error("ERRO NA TRANSMUTACAO:", e);
    await pool.end();
    process.exit(1);
  });
