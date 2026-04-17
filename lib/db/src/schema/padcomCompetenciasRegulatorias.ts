import { pgTable, varchar, integer, timestamp, jsonb, boolean, text, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

/**
 * PADCOM Competências Regulatórias (P1 / Onda 2) — Catálogo de itens terapêuticos
 * com a competência mínima exigida para prescrição/dispensação.
 *
 * categoria:    formula_oral | injetavel_im_ev | implante | exame | orientacao
 * competenciaMinima:
 *   farmaceutico → pode ser dispensado sem CRM (ex.: CoQ10 oral, Vit D 10000UI)
 *   enfermeiro   → enfermagem com supervisão (curativo, orientação)
 *   medico       → exige CRM (injetável, implante, exame de sangue, controle especial)
 *   preceptor    → exige assinatura do médico preceptor (alto risco)
 *
 * niveisCascata: define a cascata default desse item (ex.: ["N1"], ["N2","N3"]).
 *
 * riskLevel: 1 (baixo) → 5 (crítico). Combinado com a banda determina nível final.
 */
export const padcomCompetenciasRegulatoriasTable = pgTable("padcom_competencias_regulatorias", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clinicaId: varchar("clinica_id"),
  codigo: varchar("codigo", { length: 80 }).notNull(),
  nome: varchar("nome", { length: 200 }).notNull(),
  descricao: text("descricao"),
  categoria: varchar("categoria", { length: 30 }).notNull(),
  competenciaMinima: varchar("competencia_minima", { length: 30 }).notNull(),
  niveisCascata: jsonb("niveis_cascata"),
  riskLevel: integer("risk_level").notNull().default(1),
  exigeCertificadoDigital: boolean("exige_certificado_digital").notNull().default(false),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em").notNull().defaultNow(),
}, (t) => ({
  // Garante idempotência do seed: ON CONFLICT DO NOTHING precisa de chave única
  competenciasCodigoUnique: uniqueIndex("padcom_competencias_codigo_uq").on(t.codigo),
}));

export const insertPadcomCompetenciaRegulatoriaSchema = createInsertSchema(padcomCompetenciasRegulatoriasTable);
export const selectPadcomCompetenciaRegulatoriaSchema = createSelectSchema(padcomCompetenciasRegulatoriasTable);
