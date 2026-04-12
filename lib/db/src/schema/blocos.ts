import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const blocosTable = pgTable("blocos", {
  id: serial("id").primaryKey(),
  codigoBloco: text("codigo_bloco").notNull().unique(),
  nomeBloco: text("nome_bloco").notNull(),
  codigoSemantico: text("codigo_semantico"),
  b1: text("b1"),
  b2: text("b2"),
  b3: text("b3"),
  b4: text("b4"),
  seq: text("seq"),
  usaGrade: boolean("usa_grade").notNull().default(true),
  grausDisponiveis: text("graus_disponiveis").array(),
  tipoMacro: text("tipo_macro"),
  totalItensMapeados: integer("total_itens_mapeados").default(0),
  observacao: text("observacao"),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const sintomasTable = pgTable("sintomas", {
  id: serial("id").primaryKey(),
  codigoSemantico: text("codigo_semantico").notNull().unique(),
  nomeSintoma: text("nome_sintoma").notNull(),
  b1: text("b1").notNull(),
  b2: text("b2").notNull(),
  b3: text("b3").notNull(),
  b4: text("b4").notNull(),
  seq: text("seq").notNull(),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const cirurgiasTable = pgTable("cirurgias", {
  id: serial("id").primaryKey(),
  codigoSemantico: text("codigo_semantico").notNull().unique(),
  nomeCirurgia: text("nome_cirurgia").notNull(),
  b1: text("b1").notNull(),
  b2: text("b2").notNull(),
  b3: text("b3").notNull(),
  b4: text("b4").notNull(),
  seq: text("seq").notNull(),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBlocoSchema = createInsertSchema(blocosTable).omit({ id: true, criadoEm: true });
export type InsertBloco = z.infer<typeof insertBlocoSchema>;
export type Bloco = typeof blocosTable.$inferSelect;

export const insertSintomaSchema = createInsertSchema(sintomasTable).omit({ id: true, criadoEm: true });
export type InsertSintoma = z.infer<typeof insertSintomaSchema>;
export type Sintoma = typeof sintomasTable.$inferSelect;

export const insertCirurgiaSchema = createInsertSchema(cirurgiasTable).omit({ id: true, criadoEm: true });
export type InsertCirurgia = z.infer<typeof insertCirurgiaSchema>;
export type Cirurgia = typeof cirurgiasTable.$inferSelect;
