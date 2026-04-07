import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pacientesTable } from "./pacientes";
import { unidadesTable } from "./unidades";

export const followupsTable = pgTable("followups", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  tipo: text("tipo", { enum: ["consulta", "exame", "procedimento", "ligacao", "mensagem"] }).notNull(),
  status: text("status", { enum: ["agendado", "realizado", "cancelado", "atrasado"] }).notNull().default("agendado"),
  dataAgendada: timestamp("data_agendada", { withTimezone: true }).notNull(),
  dataRealizada: timestamp("data_realizada", { withTimezone: true }),
  observacoes: text("observacoes"),
  recorrencia: text("recorrencia", { enum: ["nenhuma", "diaria", "semanal", "quinzenal", "mensal", "trimestral"] }).notNull().default("nenhuma"),
  responsavelId: integer("responsavel_id"),
  unidadeId: integer("unidade_id").notNull().references(() => unidadesTable.id),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFollowupSchema = createInsertSchema(followupsTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertFollowup = z.infer<typeof insertFollowupSchema>;
export type Followup = typeof followupsTable.$inferSelect;
