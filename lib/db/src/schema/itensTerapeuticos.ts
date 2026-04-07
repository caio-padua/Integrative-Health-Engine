import { pgTable, serial, text, boolean, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const itensTerapeuticosTable = pgTable("itens_terapeuticos", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  categoria: text("categoria", { enum: ["formula", "injetavel_im", "injetavel_ev", "implante", "exame", "protocolo"] }).notNull(),
  subCategoria: text("sub_categoria"),
  disponivel: boolean("disponivel").notNull().default(true),
  preco: real("preco"),
  tags: text("tags").array(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertItemTerapeuticoSchema = createInsertSchema(itensTerapeuticosTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertItemTerapeutico = z.infer<typeof insertItemTerapeuticoSchema>;
export type ItemTerapeutico = typeof itensTerapeuticosTable.$inferSelect;
