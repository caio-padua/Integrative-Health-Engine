/**
 * Gerador da DESCRICAO da Nota Fiscal - V2 com hidratacao por categoria.
 *
 * Fonte: IMPLANTACAO 3 secao 3 (texto base) + secao 5 (frases por situacao)
 *        + manifestos IMPLANTACAO 1+2 secao 4 (bloqueio juridico).
 *
 * Caio (Onda 6.3): "NF tem que ser RELATIVA aos procedimentos, nao generica
 * igual pra todo mundo." A frase relativa entra de forma SEGURA: descreve a
 * NATUREZA do servico (consulta / exame / endovenoso / subcutaneo / implante /
 * programa) sem nomear medicamento, dose, substancia ou protocolo - tudo
 * passa pelo sanitizer + triggers SQL.
 *
 * Compliance (post code-review): texto NF mantem-se descritivo/tecnico
 * ("atendimento clinico", "procedimento assistido"); promessas emocionais
 * ficam restritas a frase_acolhimento/frase_convite, fora da NF fiscal.
 */

import { createHash } from "node:crypto";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { exigirTextoLimpo } from "./sanitizer";

export interface PacienteNF { id: number; name: string; cpf: string | null; }
export interface InvoiceInput { date: string; valor: number; appointmentId?: number; }
export interface CategoriaNF { codigo: string; rotulo: string; frase_nota_fiscal: string; }

const TEXTO_BASE = (
  "HONORARIOS MEDICOS\n" +
  "Paciente: {{NAME}}\n" +
  "CPF: {{CPF}}\n" +
  "Referente a conducao do acompanhamento clinico individualizado\n" +
  "Atendimento e monitoramento evolutivo conforme avaliacao medica\n" +
  "{{FRASE_CATEGORIA}}\n" +
  "Valores previamente acordados\n" +
  "Data: {{DATE}}"
);

// Cache TTL 60s para evitar query a cada emissao - invalidado por PATCH categoria.
const CACHE_TTL_MS = 60_000;
let cacheCategorias: Map<string, CategoriaNF> | null = null;
let cacheExpiraEm = 0;

export function invalidarCacheCategorias(): void {
  cacheCategorias = null;
  cacheExpiraEm = 0;
}

async function carregarCategoria(codigo: string | undefined): Promise<CategoriaNF | null> {
  if (!codigo) return null;
  const agora = Date.now();
  if (!cacheCategorias || agora >= cacheExpiraEm) {
    const r = await db.execute(sql`SELECT codigo, rotulo, frase_nota_fiscal FROM procedimento_categorias_nf WHERE ativo = true`);
    const items = ((r as unknown as { rows?: CategoriaNF[] }).rows || []);
    cacheCategorias = new Map(items.map((c) => [c.codigo, c]));
    cacheExpiraEm = agora + CACHE_TTL_MS;
  }
  return cacheCategorias.get(codigo) || null;
}

export function buildInvoiceDescription(
  patient: PacienteNF,
  invoice: InvoiceInput,
  categoria?: CategoriaNF | null
): string {
  const fraseCategoria = (categoria?.frase_nota_fiscal?.trim()) || "Aplicacao de condutas terapeuticas personalizadas";
  return TEXTO_BASE
    .replace("{{NAME}}", patient.name)
    .replace("{{CPF}}", patient.cpf || "-")
    .replace("{{FRASE_CATEGORIA}}", fraseCategoria)
    .replace("{{DATE}}", invoice.date);
}

export interface NFEmitidaResult { id: number; descricao: string; hash: string; status: string; categoria?: string; }

export async function emitirNotaFiscalBlindada(p: {
  pacienteId: number;
  appointmentId?: number;
  valor: number;
  provedorCodigo?: string;
  categoriaCodigo?: string;
}): Promise<NFEmitidaResult> {
  const pac = await db.execute(sql`SELECT id, nome AS name, cpf FROM pacientes WHERE id = ${p.pacienteId} LIMIT 1`);
  const patient = ((pac as unknown as { rows?: PacienteNF[] }).rows || [])[0];
  if (!patient) throw new Error(`Paciente ${p.pacienteId} nao encontrado`);

  const categoria = await carregarCategoria(p.categoriaCodigo);
  if (p.categoriaCodigo && !categoria) {
    throw new Error(`Categoria ${p.categoriaCodigo} nao encontrada/inativa`);
  }

  const date = new Date().toLocaleDateString("pt-BR");
  const descricao = buildInvoiceDescription(patient, { date, valor: p.valor, appointmentId: p.appointmentId }, categoria);

  await exigirTextoLimpo(descricao, "buildInvoiceDescription");

  const hash = createHash("sha256").update(descricao).digest("hex");
  const ins = await db.execute(sql`
    INSERT INTO notas_fiscais_emitidas (paciente_id, appointment_id, valor, descricao_blindada, hash_descricao, status, provedor_codigo, categoria_codigo)
    VALUES (${p.pacienteId}, ${p.appointmentId ?? null}, ${p.valor}, ${descricao}, ${hash}, 'RASCUNHO', ${p.provedorCodigo ?? null}, ${p.categoriaCodigo ?? null})
    RETURNING id, status
  `);
  const row = ((ins as unknown as { rows?: Array<{ id: number; status: string }> }).rows || [])[0];
  if (!row) throw new Error("Falha ao persistir NF");

  // Auto-upload Drive (fire-and-forget) - Onda 6.4
  void (async () => {
    try {
      const { uploadNFParaDrive } = await import("./notaFiscalDrive");
      await uploadNFParaDrive(row.id);
      console.log(`[NF Drive] NF ${row.id} arquivada na subpasta NOTAS FISCAIS`);
    } catch (e) {
      console.error(`[NF Drive] Falha auto-upload NF ${row.id}:`, (e as Error).message);
    }
  })();

  return { id: row.id, descricao, hash, status: row.status, categoria: categoria?.codigo };
}
