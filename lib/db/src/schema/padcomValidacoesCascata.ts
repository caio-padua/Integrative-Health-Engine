import { pgTable, varchar, integer, timestamp, jsonb, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

/**
 * PADCOM Validações em Cascata (P2 / Onda 2) — Log de cada passo da cascata
 * de validação clínica de uma sessão.
 *
 * nivel: N1 (auto IA) | N2 (semi/1-clique) | N3 (manual cascata)
 * etapa: ordem da etapa dentro da cascata (1, 2, 3...).
 * papel: enfermeira | medico | preceptor | farmaceutico | ia
 * decisao: aprovado | rejeitado | escalado | pendente
 *
 * Quando uma sessão atinge banda Verde + itens só de farmacêutico → 1 linha N1 IA.
 * Quando atinge banda Vermelha + injetáveis → várias linhas N3 (enfermeira→medico→preceptor).
 */
export const padcomValidacoesCascataTable = pgTable("padcom_validacoes_cascata", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clinicaId: varchar("clinica_id"),
  sessaoId: varchar("sessao_id").notNull(),
  pacienteId: varchar("paciente_id").notNull(),
  nivel: varchar("nivel", { length: 5 }).notNull(),
  etapa: integer("etapa").notNull().default(1),
  papel: varchar("papel", { length: 30 }).notNull(),
  validadoPor: varchar("validado_por"),
  decisao: varchar("decisao", { length: 20 }).notNull().default("pendente"),
  observacao: text("observacao"),
  itensAvaliados: jsonb("itens_avaliados"),
  certificadoDigital: varchar("certificado_digital", { length: 200 }),
  iniciadoEm: timestamp("iniciado_em").notNull().defaultNow(),
  decididoEm: timestamp("decidido_em"),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
});

export const insertPadcomValidacaoCascataSchema = createInsertSchema(padcomValidacoesCascataTable);
export const selectPadcomValidacaoCascataSchema = createSelectSchema(padcomValidacoesCascataTable);
