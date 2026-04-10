import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sessoesTable } from "./sessoes";
import { pacientesTable } from "./pacientes";
import { usuariosTable } from "./usuarios";

export const avaliacaoEnfermagemTable = pgTable("avaliacao_enfermagem", {
  id: serial("id").primaryKey(),
  sessaoId: integer("sessao_id").references(() => sessoesTable.id),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  profissionalId: integer("profissional_id").references(() => usuariosTable.id),

  pressaoArterial: text("pressao_arterial"),
  frequenciaCardiaca: integer("frequencia_cardiaca"),
  peso: real("peso"),

  altura: real("altura"),
  percentualGordura: real("percentual_gordura"),
  massaGorda: real("massa_gorda"),
  massaMuscular: real("massa_muscular"),

  dobraTricipital: real("dobra_tricipital"),
  dobraBicipital: real("dobra_bicipital"),
  dobraSubescapular: real("dobra_subescapular"),
  dobraSuprailiaca: real("dobra_suprailiaca"),
  dobraAbdominal: real("dobra_abdominal"),
  dobraPeitoral: real("dobra_peitoral"),
  dobraCoxaMedial: real("dobra_coxa_medial"),

  circunferenciaBraco: real("circunferencia_braco"),
  circunferenciaAntebraco: real("circunferencia_antebraco"),
  circunferenciaTorax: real("circunferencia_torax"),
  circunferenciaCintura: real("circunferencia_cintura"),
  circunferenciaAbdomen: real("circunferencia_abdomen"),
  circunferenciaQuadril: real("circunferencia_quadril"),
  circunferenciaCoxa: real("circunferencia_coxa"),
  circunferenciaPanturrilha: real("circunferencia_panturrilha"),

  corAlerta: text("cor_alerta").notNull().default("green"),
  observacoes: text("observacoes"),
  perguntaSemanal: text("pergunta_semanal"),
  nivelDor: integer("nivel_dor"),

  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAvaliacaoEnfermagemSchema = createInsertSchema(avaliacaoEnfermagemTable).omit({ id: true, criadoEm: true });
export type InsertAvaliacaoEnfermagem = z.infer<typeof insertAvaliacaoEnfermagemSchema>;
export type AvaliacaoEnfermagem = typeof avaliacaoEnfermagemTable.$inferSelect;
