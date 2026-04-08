import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { substanciasTable } from "./substancias";

export const estoqueItensTable = pgTable("estoque_itens", {
  id: serial("id").primaryKey(),
  substanciaId: integer("substancia_id").notNull().references(() => substanciasTable.id),
  quantidade: real("quantidade").notNull().default(0),
  unidade: text("unidade").notNull(),
  estoqueMinimo: real("estoque_minimo").notNull().default(0),
  lote: text("lote"),
  dataValidade: text("data_validade"),
  fornecedor: text("fornecedor"),
  custoUnitario: real("custo_unitario"),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertEstoqueItemSchema = createInsertSchema(estoqueItensTable).omit({ id: true, atualizadoEm: true });
export type InsertEstoqueItem = z.infer<typeof insertEstoqueItemSchema>;
export type EstoqueItem = typeof estoqueItensTable.$inferSelect;
