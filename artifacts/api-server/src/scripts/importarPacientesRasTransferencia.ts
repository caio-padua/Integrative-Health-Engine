/**
 * Importador da planilha "RAS TRANSFERENCIA FINAL" — 13/06/2026
 *
 * Lê a aba "TABELA GERAL" e materializa, por paciente:
 *  - cadastro            -> pacientes (upsert idempotente)
 *  - protocolo + valores -> tratamentos (1 por paciente)
 *  - cada bloco "SIM"    -> tratamento_itens (consulta/retorno/substancia)
 *
 * Princípios (Caio, autonomia + zelo): ver
 * docs/dr-replit/PROPOSTAS/2026-06-13_importacao_ras_transferencia.md
 *
 *  - IDEMPOTENTE: rodar 2x não duplica.
 *    - paciente: match por (unidade, CPF real) -> senão (unidade, nome+nasc).
 *    - tratamento: marcado com tag "[origem:RAS_TRANSFERENCIA]"; reexecução
 *      faz UPDATE do tratamento e REBUILD dos itens dessa origem.
 *  - NÃO-DESTRUTIVO no cadastro: UPDATE só preenche lacunas (COALESCE), nunca
 *    sobrescreve dado já gravado. Nome do banco é preservado.
 *  - Valores da planilha são verdade histórica (preços variam por época).
 *
 * Uso:
 *   RAS_DRY_RUN=1 pnpm --filter @workspace/api-server exec tsx src/scripts/importarPacientesRasTransferencia.ts
 *   pnpm --filter @workspace/api-server exec tsx src/scripts/importarPacientesRasTransferencia.ts
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { cpfCanonico, telefoneCanonico, emailCanonico } from "../lib/format/canonico";
import { gerarCodigoSemantico } from "../lib/arquivos/codigoSemantico";
import { getAccessToken } from "../lib/google-drive";

const SHEET_ID = "1SoCXulI-Ohb71JdW1Pcsro09-Wam8BCKOJQw9QUlrgs";
const TAB = "TABELA GERAL";
const UNIDADE_ID = 15; // INSTITUTO PADUA
const SLUG = "PADU";
const ORIGEM = "RAS_TRANSFERENCIA";
const TAG_TRATAMENTO = "[origem:RAS_TRANSFERENCIA]";
const CPF_PLACEHOLDER = "12345678900";

const BLOCO_INI = 14;
const BLOCO_TAM = 6;

const DRY_RUN = process.env.RAS_DRY_RUN === "1";

function norm(s: unknown): string {
  return (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function pick(row: string[], i: number): string {
  return (row[i] ?? "").toString().trim();
}

function parseCpf(raw: string): string | null {
  const c = cpfCanonico(raw ?? "");
  if (!c || c.length !== 11 || c === CPF_PLACEHOLDER) return null;
  return c;
}

function parseNascimento(dia: string, mes: string, ano: string): Date | null {
  if (!dia || !mes || !ano) return null;
  const d = parseInt(dia, 10);
  const m = parseInt(mes, 10);
  let a = parseInt(ano, 10);
  if (Number.isNaN(d) || Number.isNaN(m) || Number.isNaN(a)) return null;
  if (a < 100) a = a <= 30 ? 2000 + a : 1900 + a; // nascimento de 2 dígitos
  if (m < 1 || m > 12 || d < 1 || d > 31 || a < 1900 || a > 2026) return null;
  return new Date(Date.UTC(a, m - 1, d));
}

function parseAnoClinico(ano: string): string {
  if (!ano) return "";
  const a = parseInt(ano, 10);
  if (Number.isNaN(a)) return "";
  return String(a < 100 ? 2000 + a : a);
}

function parseMoeda(raw: string): number {
  if (!raw) return 0;
  const limpo = raw.replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(limpo);
  return Number.isFinite(n) ? n : 0;
}

function classificarTipo(nomeBloco: string): "consulta" | "retorno" | "substancia" {
  const n = norm(nomeBloco);
  if (n.includes("CONSULTA")) return "consulta";
  if (n.includes("RETORNO")) return "retorno";
  return "substancia";
}

interface ItemBloco {
  descricao: string;
  tipo: "consulta" | "retorno" | "substancia";
  numeroSessoes: number | null;
  freq: string;
  dataPrimeira: string; // dd/mm/aaaa ou ""
}

interface PacienteRas {
  numero: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  dataNascimento: Date | null;
  protocolo: string;
  valorBruto: number;
  valorPago: number;
  saldoDevedor: number;
  obs: string;
  itens: ItemBloco[];
}

async function lerPlanilha(): Promise<string[][]> {
  const token = await getAccessToken();
  const range = encodeURIComponent(`${TAB}!A1:FZ999`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`Sheets ${r.status}: ${await r.text()}`);
  return ((await r.json()) as { values?: string[][] }).values ?? [];
}

function carregarBlocos(head0: string[]): string[] {
  const nomes: string[] = [];
  for (let c = BLOCO_INI; c < 182; c += BLOCO_TAM) nomes.push(pick(head0, c));
  return nomes;
}

function normalizar(row: string[], nomesBloco: string[]): PacienteRas | null {
  const nome = pick(row, 1);
  if (!nome) return null;

  const itens: ItemBloco[] = [];
  for (let i = 0; i < nomesBloco.length; i++) {
    const nomeBloco = nomesBloco[i];
    if (!nomeBloco || norm(nomeBloco).includes("AGENDA HASH")) continue;
    const base = BLOCO_INI + i * BLOCO_TAM;
    if (pick(row, base).toUpperCase() !== "SIM") continue;
    const sessRaw = pick(row, base + 1);
    const sess = parseInt(sessRaw, 10);
    const dia = pick(row, base + 3);
    const mes = pick(row, base + 4);
    const ano = parseAnoClinico(pick(row, base + 5));
    itens.push({
      descricao: nomeBloco,
      tipo: classificarTipo(nomeBloco),
      numeroSessoes: Number.isNaN(sess) ? null : sess,
      freq: pick(row, base + 2),
      dataPrimeira: dia && mes && ano ? `${dia}/${mes}/${ano}` : "",
    });
  }

  return {
    numero: pick(row, 0),
    nome,
    cpf: parseCpf(pick(row, 2)),
    telefone: telefoneCanonico(pick(row, 3)),
    whatsapp: telefoneCanonico(pick(row, 3)),
    email: emailCanonico(pick(row, 4)),
    dataNascimento: parseNascimento(pick(row, 5), pick(row, 6), pick(row, 7)),
    protocolo: pick(row, 8),
    valorBruto: parseMoeda(pick(row, 9)),
    valorPago: parseMoeda(pick(row, 10)),
    saldoDevedor: parseMoeda(pick(row, 11)),
    obs: pick(row, 12),
    itens,
  };
}

interface ExistentePaciente {
  id: number;
  nome: string;
  cpf: string | null;
  data_nascimento: string | null;
}

function primeiroNomeNorm(nome: string): string {
  return norm(nome).split(" ")[0] ?? "";
}

function nascIsoDe(p: PacienteRas): string | null {
  return p.dataNascimento ? p.dataNascimento.toISOString().slice(0, 10) : null;
}

/**
 * Agrupa linhas da planilha que sao a MESMA pessoa e une os itens.
 * Chave separa mae/filha que compartilham CPF: usa CPF + primeiro nome.
 */
function consolidar(pacientes: PacienteRas[]): PacienteRas[] {
  const grupos = new Map<string, PacienteRas[]>();
  for (const p of pacientes) {
    const ni = nascIsoDe(p);
    const chave = p.cpf
      ? `CPF:${p.cpf}|${primeiroNomeNorm(p.nome)}`
      : ni
        ? `NN:${norm(p.nome)}|${ni}`
        : `N:${norm(p.nome)}`;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave)!.push(p);
  }

  const saida: PacienteRas[] = [];
  for (const grupo of grupos.values()) {
    if (grupo.length === 1) {
      saida.push(grupo[0]);
      continue;
    }
    const base = [...grupo].sort((a, b) => b.itens.length - a.itens.length)[0];
    const itensUnidos = new Map<string, ItemBloco>();
    for (const g of grupo) {
      for (const it of g.itens) {
        const k = norm(it.descricao);
        const prev = itensUnidos.get(k);
        if (!prev || (it.numeroSessoes ?? 0) > (prev.numeroSessoes ?? 0)) itensUnidos.set(k, it);
      }
    }
    saida.push({
      ...base,
      cpf: grupo.map((g) => g.cpf).find(Boolean) ?? null,
      telefone: grupo.map((g) => g.telefone).find(Boolean) ?? null,
      whatsapp: grupo.map((g) => g.whatsapp).find(Boolean) ?? null,
      email: grupo.map((g) => g.email).find(Boolean) ?? null,
      dataNascimento: grupo.map((g) => g.dataNascimento).find(Boolean) ?? null,
      protocolo: grupo.map((g) => g.protocolo).find(Boolean) ?? "",
      valorBruto: Math.max(...grupo.map((g) => g.valorBruto)),
      valorPago: Math.max(...grupo.map((g) => g.valorPago)),
      saldoDevedor: Math.max(...grupo.map((g) => g.saldoDevedor)),
      obs: grupo.map((g) => g.obs).find(Boolean) ?? "",
      itens: [...itensUnidos.values()],
    });
  }
  return saida;
}

async function carregarCatalogoSubstancias(): Promise<Map<string, number>> {
  const r = (await db.execute(
    sql`SELECT id, nome FROM substancias WHERE deleted_at IS NULL`,
  )) as unknown as { rows: Array<{ id: number; nome: string }> };
  const m = new Map<string, number>();
  for (const s of r.rows) m.set(norm(s.nome), s.id);
  return m;
}

function matchSubstancia(catalogo: Map<string, number>, descricao: string): number | null {
  // remove tokens com dígito (doses: 100MG, 2,5MG, 600K, 5000UI...) e casa exato
  const semDose = norm(descricao)
    .split(" ")
    .filter((t) => t && !/\d/.test(t))
    .join(" ")
    .trim();
  if (!semDose) return null;
  return catalogo.get(semDose) ?? null;
}

async function main() {
  const inicio = Date.now();
  console.log(`[ras-transferencia] início${DRY_RUN ? " (DRY-RUN)" : ""}`);

  const rows = await lerPlanilha();
  const head0 = rows[0] ?? [];
  const nomesBloco = carregarBlocos(head0);
  const dataRows = rows.slice(2);

  const brutos: PacienteRas[] = [];
  for (const row of dataRows) {
    const p = normalizar(row, nomesBloco);
    if (p) brutos.push(p);
  }
  const pacientes = consolidar(brutos);
  console.log(`[ras-transferencia] linhas: ${brutos.length} -> pessoas unicas: ${pacientes.length}`);

  const catalogo = await carregarCatalogoSubstancias();

  // pré-carrega existentes da unidade 15 (match em memória)
  const ex = (await db.execute(sql`
    SELECT id, nome, cpf, data_nascimento::text AS data_nascimento
    FROM pacientes WHERE unidade_id = ${UNIDADE_ID}
  `)) as unknown as { rows: ExistentePaciente[] };
  const porCpf = new Map<string, { id: number; primeiro: string }>();
  const porNomeNasc = new Map<string, number>();
  const porNome = new Map<string, number>();
  for (const p of ex.rows) {
    if (p.cpf) porCpf.set(p.cpf, { id: p.id, primeiro: primeiroNomeNorm(p.nome) });
    if (!porNome.has(norm(p.nome))) porNome.set(norm(p.nome), p.id);
    if (p.data_nascimento) porNomeNasc.set(`${norm(p.nome)}|${p.data_nascimento}`, p.id);
  }

  const stats = {
    total: pacientes.length,
    inseridos: 0,
    atualizados: 0,
    tratamentos: 0,
    itens: 0,
    erros: 0,
    detalhesErros: [] as Array<{ nome: string; erro: string }>,
  };

  for (const p of pacientes) {
    try {
      const nascIso = p.dataNascimento ? p.dataNascimento.toISOString().slice(0, 10) : null;
      const primeiro = primeiroNomeNorm(p.nome);
      let pacienteId: number | null = null;
      const hitCpf = p.cpf ? porCpf.get(p.cpf) : undefined;
      // só casa por CPF se o primeiro nome também bate (protege mãe/filha que
      // compartilham CPF na planilha)
      if (hitCpf && hitCpf.primeiro === primeiro) pacienteId = hitCpf.id;
      else if (nascIso && porNomeNasc.has(`${norm(p.nome)}|${nascIso}`)) pacienteId = porNomeNasc.get(`${norm(p.nome)}|${nascIso}`)!;
      else if (porNome.has(norm(p.nome))) pacienteId = porNome.get(norm(p.nome))!;

      const codigoSemantico = gerarCodigoSemantico({
        slugClinica: SLUG,
        nomeCompleto: p.nome,
        sexo: "nao_informado",
        dataNascimento: p.dataNascimento,
        cpf: p.cpf,
      });
      const codigoExterno = p.numero ? `RAS-${p.numero}` : null;
      const tel = p.telefone ?? "";

      if (DRY_RUN) {
        if (pacienteId) stats.atualizados++;
        else stats.inseridos++;
        if (p.itens.length > 0 || p.valorBruto > 0 || p.protocolo) {
          stats.tratamentos++;
          stats.itens += p.itens.length;
        }
        continue;
      }

      if (pacienteId) {
        await db.execute(sql`
          UPDATE pacientes SET
            codigo_externo = COALESCE(codigo_externo, ${codigoExterno}),
            codigo_semantico = COALESCE(codigo_semantico, ${codigoSemantico}),
            cpf = COALESCE(cpf, ${p.cpf}),
            data_nascimento = COALESCE(data_nascimento, ${nascIso}),
            email = COALESCE(NULLIF(email, ''), ${p.email}),
            telefone = COALESCE(NULLIF(telefone, ''), ${tel}),
            whatsapp = COALESCE(NULLIF(whatsapp, ''), ${p.whatsapp}),
            origem_cadastro = COALESCE(origem_cadastro, ${ORIGEM}),
            atualizado_em = now()
          WHERE id = ${pacienteId}
        `);
        stats.atualizados++;
      } else {
        const ins = (await db.execute(sql`
          INSERT INTO pacientes (
            codigo_externo, codigo_semantico, nome, cpf, data_nascimento,
            genero, telefone, whatsapp, email,
            unidade_id, status_ativo, origem_cadastro
          ) VALUES (
            ${codigoExterno}, ${codigoSemantico}, ${p.nome}, ${p.cpf}, ${nascIso},
            'nao_informado', ${tel}, ${p.whatsapp}, ${p.email},
            ${UNIDADE_ID}, true, ${ORIGEM}
          )
          RETURNING id
        `)) as unknown as { rows: Array<{ id: number }> };
        pacienteId = ins.rows[0]!.id;
        porNome.set(norm(p.nome), pacienteId);
        if (p.cpf) porCpf.set(p.cpf, { id: pacienteId, primeiro });
        if (nascIso) porNomeNasc.set(`${norm(p.nome)}|${nascIso}`, pacienteId);
        stats.inseridos++;
      }

      // tratamento + itens (só se há conteúdo clínico/financeiro)
      if (p.itens.length === 0 && p.valorBruto === 0 && !p.protocolo) continue;

      const obsTratamento = `${p.obs ? p.obs + " " : ""}${TAG_TRATAMENTO}`.trim();
      const nomeTratamento = p.protocolo || "RAS TRANSFERENCIA";

      const achaTrat = (await db.execute(sql`
        SELECT id FROM tratamentos
        WHERE paciente_id = ${pacienteId} AND observacoes LIKE ${"%" + TAG_TRATAMENTO + "%"}
        LIMIT 1
      `)) as unknown as { rows: Array<{ id: number }> };

      let tratamentoId: number;
      if (achaTrat.rows[0]) {
        tratamentoId = achaTrat.rows[0].id;
        await db.execute(sql`
          UPDATE tratamentos SET
            nome = ${nomeTratamento},
            valor_bruto = ${p.valorBruto},
            valor_final = ${p.valorBruto},
            valor_pago = ${p.valorPago},
            saldo_devedor = ${p.saldoDevedor},
            observacoes = ${obsTratamento},
            unidade_id = ${UNIDADE_ID},
            atualizado_em = now()
          WHERE id = ${tratamentoId}
        `);
        await db.execute(sql`DELETE FROM tratamento_itens WHERE tratamento_id = ${tratamentoId}`);
      } else {
        const insT = (await db.execute(sql`
          INSERT INTO tratamentos (
            paciente_id, unidade_id, nome,
            valor_bruto, desconto, valor_final, valor_pago, saldo_devedor,
            numero_parcelas, status, observacoes
          ) VALUES (
            ${pacienteId}, ${UNIDADE_ID}, ${nomeTratamento},
            ${p.valorBruto}, 0, ${p.valorBruto}, ${p.valorPago}, ${p.saldoDevedor},
            1, 'ativo', ${obsTratamento}
          )
          RETURNING id
        `)) as unknown as { rows: Array<{ id: number }> };
        tratamentoId = insT.rows[0]!.id;
      }
      stats.tratamentos++;

      for (const it of p.itens) {
        const substanciaId = it.tipo === "substancia" ? matchSubstancia(catalogo, it.descricao) : null;
        const partes: string[] = [];
        if (it.freq) partes.push(`freq ${it.freq}d`);
        if (it.dataPrimeira) partes.push(`1a sessao ${it.dataPrimeira}`);
        const obsItem = partes.join("; ");
        await db.execute(sql`
          INSERT INTO tratamento_itens (
            tratamento_id, substancia_id, descricao, tipo,
            quantidade, valor_unitario, valor_total, numero_sessoes, observacoes
          ) VALUES (
            ${tratamentoId}, ${substanciaId}, ${it.descricao}, ${it.tipo},
            ${it.numeroSessoes ?? 1}, 0, 0, ${it.numeroSessoes}, ${obsItem || null}
          )
        `);
        stats.itens++;
      }
    } catch (e) {
      stats.erros++;
      if (stats.detalhesErros.length < 20) {
        stats.detalhesErros.push({ nome: p.nome, erro: (e as Error).message });
      }
    }
  }

  const dur = ((Date.now() - inicio) / 1000).toFixed(1);
  console.log("=".repeat(60));
  console.log(`[ras-transferencia] FIM em ${dur}s${DRY_RUN ? " (DRY-RUN — nada gravado)" : ""}`);
  console.log(`  total pacientes:    ${stats.total}`);
  console.log(`  inseridos:          ${stats.inseridos}`);
  console.log(`  atualizados:        ${stats.atualizados}`);
  console.log(`  tratamentos:        ${stats.tratamentos}`);
  console.log(`  tratamento_itens:   ${stats.itens}`);
  console.log(`  erros:              ${stats.erros}`);
  for (const e of stats.detalhesErros) console.log(`    ERRO ${e.nome}: ${e.erro}`);
  console.log("=".repeat(60));
  process.exit(0);
}

main().catch((e) => {
  console.error("[ras-transferencia] FATAL:", e);
  process.exit(1);
});
