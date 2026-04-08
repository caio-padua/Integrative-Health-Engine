import { pgTable, serial, text, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sessoesTable } from "./sessoes";
import { pacientesTable } from "./pacientes";

export const rasTable = pgTable("ras", {
  id: serial("id").primaryKey(),
  sessaoId: integer("sessao_id").notNull().references(() => sessoesTable.id),
  protocoloId: integer("protocolo_id"),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  nomePaciente: text("nome_paciente").notNull(),
  cpfPaciente: text("cpf_paciente").notNull(),
  nomeProfissional: text("nome_profissional").notNull(),
  crmProfissional: text("crm_profissional"),
  unidade: text("unidade").notNull(),
  dataServico: text("data_servico").notNull(),
  tipoServico: text("tipo_servico").notNull(),
  substancias: jsonb("substancias").notNull().default([]),
  observacoes: text("observacoes"),
  assinaturaPaciente: boolean("assinatura_paciente").notNull().default(false),
  assinaturaProfissional: boolean("assinatura_profissional").notNull().default(false),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRasSchema = createInsertSchema(rasTable).omit({ id: true, criadoEm: true });
export type InsertRas = z.infer<typeof insertRasSchema>;
export type Ras = typeof rasTable.$inferSelect;
