/**
 * Gerador da DESCRICAO BLINDADA de Nota Fiscal.
 * Texto FIXO conforme MANIFESTO IMPLANTACAO secao 3 e 5 (Caio + Dr. Chat).
 *
 * Regra de ouro: texto generico e neutro, sem nomear medicamento, dose,
 * substancia ou protocolo - apenas "HONORARIOS MEDICOS / servicos
 * especializados / atendimento individualizado". Antes de qualquer emissao,
 * passa por sanitizer.exigirTextoLimpo (tripla defesa: codigo + banco + trigger).
 */

import { createHash } from "node:crypto";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { exigirTextoLimpo } from "./sanitizer";

export interface PacienteNF { id: number; name: string; cpf: string | null; }
export interface InvoiceInput { date: string; valor: number; appointmentId?: number; }

/**
 * Funcao buildInvoiceDescription EXATA do manifesto IMPLANTACAO
 * secoes 3 e 5. NAO ALTERAR sem aprovacao expressa do Caio.
 */
export function buildInvoiceDescription(patient: PacienteNF, invoice: InvoiceInput): string {
  return `HONORARIOS MEDICOS
Paciente: ${patient.name}
CPF: ${patient.cpf || "-"}
Referente a prestacao de servicos medicos especializados
Atendimento clinico individualizado
Consulta e acompanhamento evolutivo
Procedimentos terapeuticos realizados conforme avaliacao medica
Valores previamente acordados
Data: ${invoice.date}`;
}

export interface NFEmitidaResult { id: number; descricao: string; hash: string; status: string; }

/**
 * Persiste a NF com texto blindado. Tripla defesa antes do INSERT:
 * 1) Sanitizer TS lanca se houver termo proibido
 * 2) Trigger SQL bloqueia novamente no INSERT
 * 3) Texto gerado por funcao fixa, sem string interpolada do usuario
 */
export async function emitirNotaFiscalBlindada(p: { pacienteId: number; appointmentId?: number; valor: number; provedorCodigo?: string }): Promise<NFEmitidaResult> {
  const pac = await db.execute(sql`SELECT id, nome AS name, cpf FROM pacientes WHERE id = ${p.pacienteId} LIMIT 1`);
  const patient = ((pac as unknown as { rows?: PacienteNF[] }).rows || [])[0];
  if (!patient) throw new Error(`Paciente ${p.pacienteId} nao encontrado`);

  const date = new Date().toLocaleDateString("pt-BR");
  const descricao = buildInvoiceDescription(patient, { date, valor: p.valor, appointmentId: p.appointmentId });

  // Tripla defesa - falha ruidosa
  await exigirTextoLimpo(descricao, "buildInvoiceDescription");

  const hash = createHash("sha256").update(descricao).digest("hex");
  const ins = await db.execute(sql`
    INSERT INTO notas_fiscais_emitidas (paciente_id, appointment_id, valor, descricao_blindada, hash_descricao, status, provedor_codigo)
    VALUES (${p.pacienteId}, ${p.appointmentId ?? null}, ${p.valor}, ${descricao}, ${hash}, 'RASCUNHO', ${p.provedorCodigo ?? null})
    RETURNING id, status
  `);
  const row = ((ins as unknown as { rows?: Array<{ id: number; status: string }> }).rows || [])[0];
  if (!row) throw new Error("Falha ao persistir NF");
  return { id: row.id, descricao, hash, status: row.status };
}
