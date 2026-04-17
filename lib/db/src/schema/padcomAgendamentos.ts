import { pgTable, varchar, timestamp, text, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

/**
 * PADCOM Agendamentos (Onda 3) — Agenda automática de retornos pós-anamnese.
 *
 * Disparado por POST /padcom-sessoes/:id/agendar-retorno após `finalizar`.
 * Calcula data com base em padcom_bandas.acoes_motor->>'retorno_dias':
 *   verde 90 / amarela 60 / laranja 15 / vermelha 7.
 *
 * status: pendente | confirmado | cancelado | realizado
 * tipo:   retorno | reavaliacao | exame | consulta_inicial
 *
 * Idempotência: uniqueIndex em (sessaoId, tipo) — re-execução não duplica.
 */
export const padcomAgendamentosTable = pgTable("padcom_agendamentos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clinicaId: varchar("clinica_id"),
  sessaoId: varchar("sessao_id").notNull(),
  pacienteId: varchar("paciente_id").notNull(),
  tipo: varchar("tipo", { length: 30 }).notNull().default("retorno"),
  status: varchar("status", { length: 20 }).notNull().default("pendente"),
  agendadoPara: timestamp("agendado_para").notNull(),
  bandaOrigem: varchar("banda_origem", { length: 30 }),
  observacao: text("observacao"),
  canceladoEm: timestamp("cancelado_em"),
  realizadoEm: timestamp("realizado_em"),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em").notNull().defaultNow(),
}, (t) => ({
  sessaoTipoUnique: uniqueIndex("padcom_agendamentos_sessao_tipo_uq").on(t.sessaoId, t.tipo),
}));

export const insertPadcomAgendamentoSchema = createInsertSchema(padcomAgendamentosTable);
export const selectPadcomAgendamentoSchema = createSelectSchema(padcomAgendamentosTable);
