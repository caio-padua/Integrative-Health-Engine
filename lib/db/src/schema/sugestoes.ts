import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { anamnesesTable } from "./anamneses";
import { pacientesTable } from "./pacientes";
import { itensTerapeuticosTable } from "./itensTerapeuticos";

export const sugestoesTable = pgTable("sugestoes_clinicas", {
  id: serial("id").primaryKey(),
  anamneseId: integer("anamnese_id").notNull().references(() => anamnesesTable.id),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  tipo: text("tipo", { enum: ["exame", "formula", "injetavel_im", "injetavel_ev", "implante", "protocolo"] }).notNull(),
  itemTerapeuticoId: integer("item_terapeutico_id").references(() => itensTerapeuticosTable.id),
  itemNome: text("item_nome").notNull(),
  itemDescricao: text("item_descricao"),
  justificativa: text("justificativa"),
  prioridade: text("prioridade", { enum: ["baixa", "media", "alta", "urgente"] }).notNull().default("media"),
  status: text("status", { enum: ["pendente", "validado", "rejeitado", "em_execucao", "concluido"] }).notNull().default("pendente"),
  validadoPorId: integer("validado_por_id"),
  observacaoValidacao: text("observacao_validacao"),
  validadoEm: timestamp("validado_em", { withTimezone: true }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSugestaoSchema = createInsertSchema(sugestoesTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertSugestao = z.infer<typeof insertSugestaoSchema>;
export type Sugestao = typeof sugestoesTable.$inferSelect;
