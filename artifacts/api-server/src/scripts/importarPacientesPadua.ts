/**
 * Importador da Wave Cadastro Pádua — 13/mai/2026
 *
 * Lê planilha Google Sheets "CADASTRO MESTRE UNIFICADO DE PACIENTES" do
 * Instituto Pádua (4.278 pacientes) e materializa cada linha em pacientes.
 *
 * Princípios (Caio, autonomia total, zelo máximo):
 *  - IDEMPOTENTE: rodar 2x não cria duplicata. Chave: (unidade_id, codigo_externo)
 *    pra existentes; (unidade_id, cpf canônico) como fallback se sem código.
 *  - CANÔNICO: CPF/tel/CEP só dígitos no banco (lib/format/canonico).
 *  - CÓDIGO SEMÂNTICO: gerado e persistido em todas as linhas inseridas/atualizadas.
 *  - SEM PROVISIONAMENTO DRIVE: pasta-raiz e subpastas são criadas LAZY no
 *    1º upload de arquivo (uploadArquivoPaciente). Importar 4.278 + ~30 chamadas
 *    Drive cada estouraria quota e demoraria horas.
 *  - LOTE RASTREÁVEL: 1 linha em importacoes_lote com stats (inseridos/
 *    atualizados/pulados/erros) e duração.
 *
 * Uso:
 *   pnpm --filter @workspace/api-server exec tsx src/scripts/importarPacientesPadua.ts
 *
 * Variáveis de ambiente honradas:
 *   PADUA_DRY_RUN=1     → não escreve no banco, só relata o que faria
 *   PADUA_LIMIT=N       → importa só as N primeiras linhas (debug)
 *   PADUA_FORCE_RECALC=1 → recalcula código semântico mesmo se já existe
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { cpfCanonico, telefoneCanonico, emailCanonico, cepCanonico } from "../lib/format/canonico";
import { gerarCodigoSemantico } from "../lib/arquivos/codigoSemantico";
import { getAccessToken } from "../lib/google-drive";

const SHEET_ID = "1uR0jIx1rIQE3346EUQZhy52gDkrtslH91NGeIPF7QxY";
const TAB = "Cadastro Mestre";
const UNIDADE_ID = 15; // INSTITUTO PADUA
const SLUG = "PADU";
const ORIGEM = "planilha-padua-2026-05-13";
const HEADER_ROW_INDEX = 2; // linhas 0/1 são título/subtítulo, header está na linha 2

const DRY_RUN = process.env.PADUA_DRY_RUN === "1";
const LIMIT = process.env.PADUA_LIMIT ? parseInt(process.env.PADUA_LIMIT, 10) : 0;
const OFFSET = process.env.PADUA_OFFSET ? parseInt(process.env.PADUA_OFFSET, 10) : 0;
const FORCE_RECALC = process.env.PADUA_FORCE_RECALC === "1";

interface LinhaPlanilha {
  codigoExterno: string | null;
  status: string | null;
  nome: string;
  nomeSocial: string | null;
  cpf: string | null;        // canônico (só dígitos) ou null
  dataNascimento: Date | null;
  genero: "masculino" | "feminino" | "outro" | "nao_informado";
  estadoCivil: string | null;
  escolaridade: string | null;
  telefone: string | null;   // canônico
  whatsapp: string | null;   // canônico
  telefoneFixo: string | null; // canônico
  email: string | null;
  instagram: string | null;
  cep: string | null;        // canônico
  endereco: string | null;
  numeroEndereco: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  profissao: string | null;
  nomeMae: string | null;
  __linhaOriginal: number;   // pra debug
}

function pickStr(row: string[], idx: number): string | null {
  const v = row[idx];
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}

function parseGenero(s: string | null): LinhaPlanilha["genero"] {
  if (!s) return "nao_informado";
  const x = s.trim().toLowerCase();
  if (x.startsWith("masc")) return "masculino";
  if (x.startsWith("fem")) return "feminino";
  if (x === "outro" || x === "outros") return "outro";
  return "nao_informado";
}

function parseDataBR(s: string | null): Date | null {
  if (!s) return null;
  // formato esperado: DD/MM/YYYY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const dia = parseInt(m[1], 10);
  const mes = parseInt(m[2], 10);
  const ano = parseInt(m[3], 10);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31 || ano < 1900 || ano > 2030) return null;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function normalizar(row: string[], linhaOriginal: number): LinhaPlanilha | null {
  const nome = pickStr(row, 2);
  if (!nome) return null;

  return {
    codigoExterno: pickStr(row, 0),
    status: pickStr(row, 1),
    nome,
    nomeSocial: pickStr(row, 3),
    cpf: cpfCanonico(pickStr(row, 4) ?? ""),
    dataNascimento: parseDataBR(pickStr(row, 5)),
    genero: parseGenero(pickStr(row, 6)),
    estadoCivil: pickStr(row, 7),
    escolaridade: pickStr(row, 8),
    telefone: telefoneCanonico(pickStr(row, 9) ?? "") ?? telefoneCanonico(pickStr(row, 11) ?? ""),
    whatsapp: telefoneCanonico(pickStr(row, 11) ?? "") ?? telefoneCanonico(pickStr(row, 9) ?? ""),
    telefoneFixo: telefoneCanonico(pickStr(row, 13) ?? ""),
    email: emailCanonico(pickStr(row, 15) ?? ""),
    instagram: pickStr(row, 16),
    cep: cepCanonico(pickStr(row, 17) ?? ""),
    endereco: pickStr(row, 18),
    numeroEndereco: pickStr(row, 19),
    complemento: pickStr(row, 20),
    bairro: pickStr(row, 21),
    cidade: pickStr(row, 22),
    estado: pickStr(row, 23),
    profissao: pickStr(row, 24),
    nomeMae: pickStr(row, 25),
    __linhaOriginal: linhaOriginal,
  };
}

async function lerPlanilha(): Promise<string[][]> {
  const token = await getAccessToken();
  const range = encodeURIComponent(`${TAB}!A1:AZ5000`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`Sheets ${r.status}: ${await r.text()}`);
  const j = await r.json() as { values?: string[][] };
  return j.values ?? [];
}

interface Stats {
  total: number;
  inseridos: number;
  atualizados: number;
  pulados_sem_nome: number;
  pulados_sem_telefone: number;
  erros: number;
  detalhes_erros: Array<{ linha: number; nome: string; erro: string }>;
  detalhes_pulados_sem_telefone: Array<{ linha: number; nome: string; codigoExterno: string | null; cpf: string | null }>;
}

async function processar(linha: LinhaPlanilha, stats: Stats): Promise<void> {
  // Telefone NOT NULL — usa whatsapp ou fallback "0"
  const telPrincipal = linha.telefone ?? linha.whatsapp ?? linha.telefoneFixo;
  if (!telPrincipal) {
    stats.pulados_sem_telefone++;
    stats.detalhes_pulados_sem_telefone.push({
      linha: linha.__linhaOriginal,
      nome: linha.nome,
      codigoExterno: linha.codigoExterno,
      cpf: linha.cpf,
    });
    if (stats.pulados_sem_telefone <= 5) {
      console.warn(`[skip] sem telefone: linha ${linha.__linhaOriginal} ${linha.nome}`);
    }
    return;
  }

  const codigoSemantico = gerarCodigoSemantico({
    slugClinica: SLUG,
    nomeCompleto: linha.nome,
    sexo: linha.genero,
    dataNascimento: linha.dataNascimento,
    cpf: linha.cpf,
  });

  const statusAtivo = (linha.status ?? "").toLowerCase().startsWith("ativ");

  if (DRY_RUN) {
    if (stats.total < 5) {
      console.log(`[dry] ${codigoSemantico} ${linha.nome} (cpf=${linha.cpf ?? "—"}, tel=${telPrincipal})`);
    }
    stats.inseridos++;
    return;
  }

  // Idempotência: tenta achar por (unidade_id, codigo_externo) primeiro,
  // depois por (unidade_id, cpf canônico).
  let pacienteId: number | null = null;
  if (linha.codigoExterno) {
    const r = await db.execute(sql`
      SELECT id FROM pacientes
      WHERE unidade_id = ${UNIDADE_ID} AND codigo_externo = ${linha.codigoExterno}
      LIMIT 1
    `) as unknown as { rows: Array<{ id: number }> };
    if (r.rows[0]) pacienteId = r.rows[0].id;
  }
  if (!pacienteId && linha.cpf) {
    const r = await db.execute(sql`
      SELECT id FROM pacientes
      WHERE unidade_id = ${UNIDADE_ID} AND cpf = ${linha.cpf}
      LIMIT 1
    `) as unknown as { rows: Array<{ id: number }> };
    if (r.rows[0]) pacienteId = r.rows[0].id;
  }

  try {
    if (pacienteId) {
      // UPDATE — preserva colunas que o sistema gerou (google_drive_folder_id,
      // drive_subpastas, foto_rosto, etc). Atualiza só campos da planilha.
      await db.execute(sql`
        UPDATE pacientes SET
          codigo_externo = COALESCE(${linha.codigoExterno}, codigo_externo),
          codigo_semantico = CASE WHEN ${FORCE_RECALC} OR codigo_semantico IS NULL THEN ${codigoSemantico} ELSE codigo_semantico END,
          nome = ${linha.nome},
          cpf = COALESCE(${linha.cpf}, cpf),
          data_nascimento = COALESCE(${linha.dataNascimento}, data_nascimento),
          genero = ${linha.genero},
          estado_civil = COALESCE(${linha.estadoCivil}, estado_civil),
          escolaridade = COALESCE(${linha.escolaridade}, escolaridade),
          telefone = ${telPrincipal},
          whatsapp = COALESCE(${linha.whatsapp}, whatsapp),
          telefone_fixo = COALESCE(${linha.telefoneFixo}, telefone_fixo),
          email = COALESCE(${linha.email}, email),
          instagram = COALESCE(${linha.instagram}, instagram),
          cep = COALESCE(${linha.cep}, cep),
          endereco = COALESCE(${linha.endereco}, endereco),
          numero_endereco = COALESCE(${linha.numeroEndereco}, numero_endereco),
          complemento = COALESCE(${linha.complemento}, complemento),
          bairro = COALESCE(${linha.bairro}, bairro),
          cidade = COALESCE(${linha.cidade}, cidade),
          estado = COALESCE(${linha.estado}, estado),
          profissao = COALESCE(${linha.profissao}, profissao),
          nome_mae = COALESCE(${linha.nomeMae}, nome_mae),
          status_ativo = ${statusAtivo},
          origem_cadastro = COALESCE(origem_cadastro, ${ORIGEM}),
          atualizado_em = now()
        WHERE id = ${pacienteId}
      `);
      stats.atualizados++;
    } else {
      await db.execute(sql`
        INSERT INTO pacientes (
          codigo_externo, codigo_semantico, nome, cpf, data_nascimento,
          genero, estado_civil, escolaridade,
          telefone, whatsapp, telefone_fixo, email, instagram,
          cep, endereco, numero_endereco, complemento, bairro, cidade, estado,
          profissao, nome_mae,
          unidade_id, status_ativo, origem_cadastro
        ) VALUES (
          ${linha.codigoExterno}, ${codigoSemantico}, ${linha.nome}, ${linha.cpf}, ${linha.dataNascimento},
          ${linha.genero}, ${linha.estadoCivil}, ${linha.escolaridade},
          ${telPrincipal}, ${linha.whatsapp}, ${linha.telefoneFixo}, ${linha.email}, ${linha.instagram},
          ${linha.cep}, ${linha.endereco}, ${linha.numeroEndereco}, ${linha.complemento}, ${linha.bairro}, ${linha.cidade}, ${linha.estado},
          ${linha.profissao}, ${linha.nomeMae},
          ${UNIDADE_ID}, ${statusAtivo}, ${ORIGEM}
        )
        ON CONFLICT DO NOTHING
      `);
      stats.inseridos++;
    }
  } catch (e) {
    stats.erros++;
    if (stats.detalhes_erros.length < 20) {
      stats.detalhes_erros.push({
        linha: linha.__linhaOriginal,
        nome: linha.nome,
        erro: (e as Error).message,
      });
    }
  }
}

async function main() {
  const inicio = Date.now();
  console.log(`[wave-cadastro-padua] início${DRY_RUN ? " (DRY-RUN)" : ""}${LIMIT ? ` LIMIT=${LIMIT}` : ""}${FORCE_RECALC ? " FORCE_RECALC" : ""}`);

  const rows = await lerPlanilha();
  console.log(`[wave-cadastro-padua] planilha lida: ${rows.length} linhas brutas`);

  // header está na linha HEADER_ROW_INDEX, dados começam em HEADER_ROW_INDEX+1
  const dadoBrutoTotal = rows.slice(HEADER_ROW_INDEX + 1);
  const dadoBruto = OFFSET > 0 ? dadoBrutoTotal.slice(OFFSET) : dadoBrutoTotal;
  const linhas: LinhaPlanilha[] = [];
  let pulSemNome = 0;
  for (let i = 0; i < dadoBruto.length; i++) {
    const linhaOriginal = HEADER_ROW_INDEX + 2 + OFFSET + i; // 1-based pra debug
    const norm = normalizar(dadoBruto[i], linhaOriginal);
    if (!norm) {
      pulSemNome++;
      continue;
    }
    linhas.push(norm);
    if (LIMIT && linhas.length >= LIMIT) break;
  }
  console.log(`[wave-cadastro-padua] normalizadas: ${linhas.length} (puladas sem nome: ${pulSemNome})`);

  // registra lote
  let loteId: number | null = null;
  if (!DRY_RUN) {
    const r = await db.execute(sql`
      INSERT INTO importacoes_lote (
        origem, spreadsheet_id, unidade_id, total_linhas, detalhes
      ) VALUES (
        ${ORIGEM}, ${SHEET_ID}, ${UNIDADE_ID}, ${linhas.length},
        ${JSON.stringify({ tab: TAB, limit: LIMIT, force_recalc: FORCE_RECALC, descricao: "Wave Cadastro Pádua — 4.278 pacientes Instituto Pádua" })}::jsonb
      )
      RETURNING id
    `) as unknown as { rows: Array<{ id: number }> };
    loteId = r.rows[0]?.id ?? null;
    console.log(`[wave-cadastro-padua] lote criado: id=${loteId}`);
  }

  const stats: Stats = {
    total: linhas.length,
    inseridos: 0,
    atualizados: 0,
    pulados_sem_nome: pulSemNome,
    pulados_sem_telefone: 0,
    erros: 0,
    detalhes_erros: [],
    detalhes_pulados_sem_telefone: [],
  };

  for (let i = 0; i < linhas.length; i++) {
    await processar(linhas[i], stats);
    if ((i + 1) % 250 === 0) {
      console.log(`[wave-cadastro-padua] progresso ${i + 1}/${linhas.length} (ins=${stats.inseridos} upd=${stats.atualizados} skip=${stats.pulados_sem_telefone} err=${stats.erros})`);
    }
  }

  const duracaoMs = Date.now() - inicio;

  if (loteId && !DRY_RUN) {
    await db.execute(sql`
      UPDATE importacoes_lote SET
        finalizado_em = now(),
        importados = ${stats.inseridos + stats.atualizados},
        pulados_sem_telefone = ${stats.pulados_sem_telefone},
        erros = ${stats.erros},
        detalhes = COALESCE(detalhes, '{}'::jsonb) || ${JSON.stringify({
          inseridos: stats.inseridos,
          atualizados: stats.atualizados,
          pulados_sem_nome: stats.pulados_sem_nome,
          duracao_ms: duracaoMs,
          detalhes_erros: stats.detalhes_erros,
          detalhes_pulados_sem_telefone: stats.detalhes_pulados_sem_telefone,
        })}::jsonb
      WHERE id = ${loteId}
    `);
  }

  console.log("=".repeat(60));
  console.log(`[wave-cadastro-padua] FIM em ${(duracaoMs / 1000).toFixed(1)}s`);
  console.log(`  total normalizadas: ${stats.total}`);
  console.log(`  inseridos:          ${stats.inseridos}`);
  console.log(`  atualizados:        ${stats.atualizados}`);
  console.log(`  pulados sem nome:   ${stats.pulados_sem_nome}`);
  console.log(`  pulados sem tel:    ${stats.pulados_sem_telefone}`);
  console.log(`  erros:              ${stats.erros}`);
  if (stats.detalhes_erros.length > 0) {
    console.log("  primeiros erros:");
    for (const e of stats.detalhes_erros) {
      console.log(`    linha ${e.linha} ${e.nome}: ${e.erro}`);
    }
  }
  console.log("=".repeat(60));
  process.exit(0);
}

main().catch((e) => {
  console.error("[wave-cadastro-padua] FATAL:", e);
  process.exit(1);
});
