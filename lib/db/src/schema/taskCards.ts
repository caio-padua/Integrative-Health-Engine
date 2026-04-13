import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sessoesTable } from "./sessoes";
import { pacientesTable } from "./pacientes";

export const taskCardsTable = pgTable("task_cards", {
  id: serial("id").primaryKey(),
  sessaoId: integer("sessao_id").references(() => sessoesTable.id),
  pacienteId: integer("paciente_id").references(() => pacientesTable.id),
  assignedRole: text("assigned_role").notNull(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  prioridade: text("prioridade").notNull().default("normal"),
  corAlerta: text("cor_alerta"),
  prazoHoras: integer("prazo_horas"),
  status: text("status").notNull().default("pendente"),
  concluidoEm: timestamp("concluido_em", { withTimezone: true }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const taskCardJustificativasTable = pgTable("task_card_justificativas", {
  id: serial("id").primaryKey(),
  taskCardId: integer("task_card_id").references(() => taskCardsTable.id),
  followupId: integer("followup_id"),
  entityType: text("entity_type", { enum: ["TASK", "FOLLOWUP"] }).notNull(),
  entityId: integer("entity_id").notNull(),
  motivoPadrao: text("motivo_padrao", {
    enum: [
      "SEM_CONTATO",
      "PACIENTE_PEDIU_ADIAR",
      "AGUARDANDO_RETORNO",
      "ERRO_ATRIBUICAO",
      "SOBRECARGA",
      "INSUMO_INDISPONIVEL",
      "PACIENTE_FALTOU",
      "OUTRO"
    ]
  }).notNull(),
  justificativa: text("justificativa").notNull(),
  proximaAcaoEm: timestamp("proxima_acao_em", { withTimezone: true }),
  registradoPorId: integer("registrado_por_id"),
  aceita: text("aceita", { enum: ["pendente", "aceita", "recusada"] }).notNull().default("pendente"),
  avaliadoPorId: integer("avaliado_por_id"),
  avaliadoEm: timestamp("avaliado_em", { withTimezone: true }),
  observacaoAvaliador: text("observacao_avaliador"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const taskCardEscalationsTable = pgTable("task_card_escalations", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type", { enum: ["TASK", "FOLLOWUP"] }).notNull(),
  entityId: integer("entity_id").notNull(),
  nivel: text("nivel", { enum: ["SUPERVISOR", "DIRETOR", "FILA_PRECEPTOR"] }).notNull(),
  motivo: text("motivo").notNull(),
  observacao: text("observacao"),
  escaladoPorId: integer("escalado_por_id"),
  resolvidoEm: timestamp("resolvido_em", { withTimezone: true }),
  resolvidoPorId: integer("resolvido_por_id"),
  resolucao: text("resolucao"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTaskCardSchema = createInsertSchema(taskCardsTable).omit({ id: true, criadoEm: true });
export type InsertTaskCard = z.infer<typeof insertTaskCardSchema>;
export type TaskCard = typeof taskCardsTable.$inferSelect;

export const insertTaskCardJustificativaSchema = createInsertSchema(taskCardJustificativasTable).omit({ id: true, criadoEm: true });
export type InsertTaskCardJustificativa = z.infer<typeof insertTaskCardJustificativaSchema>;
export type TaskCardJustificativa = typeof taskCardJustificativasTable.$inferSelect;

export const insertTaskCardEscalationSchema = createInsertSchema(taskCardEscalationsTable).omit({ id: true, criadoEm: true });
export type InsertTaskCardEscalation = z.infer<typeof insertTaskCardEscalationSchema>;
export type TaskCardEscalation = typeof taskCardEscalationsTable.$inferSelect;
