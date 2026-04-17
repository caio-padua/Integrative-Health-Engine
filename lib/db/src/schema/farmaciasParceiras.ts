import { pgTable, serial, text, real, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const farmaciasParceirasTable = pgTable("farmacias_parceiras", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  cnpj: text("cnpj"),
  email: text("email"),
  telefone: text("telefone"),
  endereco: text("endereco"),
  bairro: text("bairro"),
  cidade: text("cidade"),
  estado: text("estado"),
  responsavel: text("responsavel"),
  comissaoPercentual: real("comissao_percentual").notNull().default(30),
  modeloIntegracao: text("modelo_integracao", { enum: ["portal", "marketplace", "drive", "manual"] }).notNull().default("portal"),
  gatewaySplitId: text("gateway_split_id"),
  observacoes: text("observacoes"),
  capacidades: jsonb("capacidades").default({}),
  ativa: boolean("ativa").notNull().default(true),
  ficticia: boolean("ficticia").notNull().default(false),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFarmaciaParceiraSchema = createInsertSchema(farmaciasParceirasTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertFarmaciaParceira = z.infer<typeof insertFarmaciaParceiraSchema>;
export type FarmaciaParceira = typeof farmaciasParceirasTable.$inferSelect;
