import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usuariosTable } from "./usuarios";
import { unidadesTable } from "./unidades";

export const delegacoesTable = pgTable("delegacoes", {
  id: serial("id").primaryKey(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  prioridade: text("prioridade", { enum: ["urgente", "alta", "media", "baixa"] }).notNull().default("media"),
  prazo: text("prazo", { enum: ["24h", "36h", "48h", "72h", "1_semana"] }).notNull().default("48h"),
  status: text("status", { enum: ["pendente", "em_andamento", "concluido", "atrasado", "cancelado"] }).notNull().default("pendente"),
  categoria: text("categoria", { enum: ["clinico", "administrativo", "financeiro", "logistica", "atendimento", "outro"] }).notNull().default("administrativo"),
  delegadoPorId: integer("delegado_por_id").notNull().references(() => usuariosTable.id),
  responsavelId: integer("responsavel_id").notNull().references(() => usuariosTable.id),
  unidadeId: integer("unidade_id").references(() => unidadesTable.id),
  dataLimite: timestamp("data_limite", { withTimezone: true }),
  concluidoEm: timestamp("concluido_em", { withTimezone: true }),
  observacaoFinal: text("observacao_final"),
  notaQualidade: integer("nota_qualidade"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDelegacaoSchema = createInsertSchema(delegacoesTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertDelegacao = z.infer<typeof insertDelegacaoSchema>;
export type Delegacao = typeof delegacoesTable.$inferSelect;

export const feedbackPacienteTable = pgTable("feedback_pacientes", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull(),
  unidadeId: integer("unidade_id").references(() => unidadesTable.id),
  nota: integer("nota").notNull(),
  comentario: text("comentario"),
  canal: text("canal", { enum: ["whatsapp", "presencial", "email", "telefone"] }).notNull().default("whatsapp"),
  anamnaseId: integer("anamnese_id"),
  respondidoEm: timestamp("respondido_em", { withTimezone: true }).notNull().defaultNow(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFeedbackPacienteSchema = createInsertSchema(feedbackPacienteTable).omit({ id: true, criadoEm: true });
export type InsertFeedbackPaciente = z.infer<typeof insertFeedbackPacienteSchema>;
export type FeedbackPaciente = typeof feedbackPacienteTable.$inferSelect;
