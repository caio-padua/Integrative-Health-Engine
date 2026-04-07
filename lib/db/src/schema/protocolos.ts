import { pgTable, serial, text, boolean, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const protocolosTable = pgTable("protocolos", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  categoria: text("categoria"),
  itens: jsonb("itens"),
  ativo: boolean("ativo").notNull().default(true),
  criadoPorId: integer("criado_por_id"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProtocoloSchema = createInsertSchema(protocolosTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertProtocolo = z.infer<typeof insertProtocoloSchema>;
export type Protocolo = typeof protocolosTable.$inferSelect;
