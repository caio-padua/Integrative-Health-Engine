import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const blocosTable = pgTable("blocos", {
  id: serial("id").primaryKey(),
  codigoBloco: text("codigo_bloco").notNull().unique(),
  nomeBloco: text("nome_bloco").notNull(),
  usaGrade: boolean("usa_grade").notNull().default(true),
  grausDisponiveis: text("graus_disponiveis").array(),
  tipoMacro: text("tipo_macro"),
  totalItensMapeados: integer("total_itens_mapeados").default(0),
  observacao: text("observacao"),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBlocoSchema = createInsertSchema(blocosTable).omit({ id: true, criadoEm: true });
export type InsertBloco = z.infer<typeof insertBlocoSchema>;
export type Bloco = typeof blocosTable.$inferSelect;
