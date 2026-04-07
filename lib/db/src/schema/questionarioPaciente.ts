import { pgTable, serial, text, integer, timestamp, jsonb, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pacientesTable } from "./pacientes";
import { questionarioMasterTable } from "./catalogo";

export const questionarioRespostasTable = pgTable("questionario_respostas", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  dataPreenchimento: timestamp("data_preenchimento", { withTimezone: true }).notNull().defaultNow(),
  periodo: text("periodo").notNull(),
  respostas: jsonb("respostas").notNull(),
  observacoesMedico: text("observacoes_medico"),
  preenchidoPor: text("preenchido_por"),
  status: text("status").notNull().default("RASCUNHO"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const estadoSaudePacienteTable = pgTable("estado_saude_paciente", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  questionarioRespostaId: integer("questionario_resposta_id").references(() => questionarioRespostasTable.id),
  dataAvaliacao: timestamp("data_avaliacao", { withTimezone: true }).notNull().defaultNow(),
  periodo: text("periodo").notNull(),
  condicoesAtuais: jsonb("condicoes_atuais").notNull(),
  sintomasAtivos: jsonb("sintomas_ativos"),
  medicamentosEmUso: jsonb("medicamentos_em_uso"),
  nivelEnergia: integer("nivel_energia"),
  nivelDor: integer("nivel_dor"),
  qualidadeSono: integer("qualidade_sono"),
  nivelEstresse: integer("nivel_estresse"),
  pesoKg: text("peso_kg"),
  alturaM: text("altura_m"),
  pressaoArterial: text("pressao_arterial"),
  observacoes: text("observacoes"),
  evolucao: text("evolucao").notNull().default("INICIAL"),
  status: text("status").notNull().default("ATIVO"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertQuestionarioRespostasSchema = createInsertSchema(questionarioRespostasTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertQuestionarioRespostas = z.infer<typeof insertQuestionarioRespostasSchema>;
export type QuestionarioRespostas = typeof questionarioRespostasTable.$inferSelect;

export const insertEstadoSaudePacienteSchema = createInsertSchema(estadoSaudePacienteTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertEstadoSaudePaciente = z.infer<typeof insertEstadoSaudePacienteSchema>;
export type EstadoSaudePaciente = typeof estadoSaudePacienteTable.$inferSelect;
