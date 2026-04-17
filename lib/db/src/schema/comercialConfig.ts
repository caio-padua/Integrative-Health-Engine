import { pgTable, serial, text, real, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const comissoesConfigTable = pgTable("comissoes_config", {
  id: serial("id").primaryKey(),
  chave: text("chave").notNull().unique(),
  rotulo: text("rotulo").notNull(),
  categoria: text("categoria", { enum: ["procedimento", "indicacao", "consulta", "produto", "venda_externa"] }).notNull(),
  percentual: real("percentual").notNull(),
  ativa: boolean("ativa").notNull().default(true),
  observacoes: text("observacoes"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const descontosConfigTable = pgTable("descontos_config", {
  id: serial("id").primaryKey(),
  chave: text("chave").notNull().unique(),
  rotulo: text("rotulo").notNull(),
  tipo: text("tipo", { enum: ["forma_pagamento", "duracao_tratamento", "indicacao", "campanha"] }).notNull(),
  percentual: real("percentual").notNull(),
  duracaoMeses: integer("duracao_meses"),
  ativa: boolean("ativa").notNull().default(true),
  observacoes: text("observacoes"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const planosConsultaConfigTable = pgTable("planos_consulta_config", {
  id: serial("id").primaryKey(),
  chave: text("chave", { enum: ["premium", "intermediario", "standard", "basic"] }).notNull().unique(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  precoPresencial: real("preco_presencial").notNull(),
  precoOnline: real("preco_online").notNull(),
  envolveCaioInicio: boolean("envolve_caio_inicio").notNull().default(true),
  envolveCaioContinuidade: boolean("envolve_caio_continuidade").notNull().default(false),
  ativa: boolean("ativa").notNull().default(true),
  ordem: integer("ordem").notNull().default(0),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertComissaoConfigSchema = createInsertSchema(comissoesConfigTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export const insertDescontoConfigSchema = createInsertSchema(descontosConfigTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export const insertPlanoConsultaConfigSchema = createInsertSchema(planosConsultaConfigTable).omit({ id: true, criadoEm: true, atualizadoEm: true });

export type ComissaoConfig = typeof comissoesConfigTable.$inferSelect;
export type DescontoConfig = typeof descontosConfigTable.$inferSelect;
export type PlanoConsultaConfig = typeof planosConsultaConfigTable.$inferSelect;
export type InsertComissaoConfig = z.infer<typeof insertComissaoConfigSchema>;
export type InsertDescontoConfig = z.infer<typeof insertDescontoConfigSchema>;
export type InsertPlanoConsultaConfig = z.infer<typeof insertPlanoConsultaConfigSchema>;
