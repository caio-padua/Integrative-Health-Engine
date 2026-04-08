import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pacientesTable } from "./pacientes";
import { usuariosTable } from "./usuarios";
import { unidadesTable } from "./unidades";
import { substanciasTable } from "./substancias";

export const sessoesTable = pgTable("sessoes", {
  id: serial("id").primaryKey(),
  protocoloId: integer("protocolo_id"),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  profissionalId: integer("profissional_id").references(() => usuariosTable.id),
  unidadeId: integer("unidade_id").references(() => unidadesTable.id),
  dataAgendada: text("data_agendada").notNull(),
  horaAgendada: text("hora_agendada").notNull(),
  status: text("status").notNull().default("agendada"),
  tipoServico: text("tipo_servico").notNull().default("clinica"),
  numeroSemana: integer("numero_semana").notNull().default(1),
  notas: text("notas"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const aplicacoesSubstanciasTable = pgTable("aplicacoes_substancias", {
  id: serial("id").primaryKey(),
  sessaoId: integer("sessao_id").notNull().references(() => sessoesTable.id),
  substanciaId: integer("substancia_id").notNull().references(() => substanciasTable.id),
  dose: text("dose").notNull(),
  numeroSessao: integer("numero_sessao").notNull(),
  totalSessoes: integer("total_sessoes").notNull(),
  status: text("status").notNull().default("pendente"),
  disponibilidade: text("disponibilidade").notNull().default("disp"),
  aplicadoEm: text("aplicado_em"),
  notas: text("notas"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSessaoSchema = createInsertSchema(sessoesTable).omit({ id: true, criadoEm: true });
export type InsertSessao = z.infer<typeof insertSessaoSchema>;
export type Sessao = typeof sessoesTable.$inferSelect;

export const insertAplicacaoSubstanciaSchema = createInsertSchema(aplicacoesSubstanciasTable).omit({ id: true, criadoEm: true });
export type InsertAplicacaoSubstancia = z.infer<typeof insertAplicacaoSubstanciaSchema>;
export type AplicacaoSubstancia = typeof aplicacoesSubstanciasTable.$inferSelect;
