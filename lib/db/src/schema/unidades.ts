import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const unidadesTable = pgTable("unidades", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  endereco: text("endereco"),
  cidade: text("cidade"),
  estado: text("estado"),
  cep: text("cep"),
  cnpj: text("cnpj"),
  telefone: text("telefone"),
  ativa: boolean("ativa").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUnidadeSchema = createInsertSchema(unidadesTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertUnidade = z.infer<typeof insertUnidadeSchema>;
export type Unidade = typeof unidadesTable.$inferSelect;
