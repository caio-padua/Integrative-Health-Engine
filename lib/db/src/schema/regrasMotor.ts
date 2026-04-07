import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const regrasMotorTable = pgTable("regras_motor", {
  id: serial("id").primaryKey(),
  regraId: text("regra_id").notNull(),
  perguntaId: text("pergunta_id").notNull(),
  palavraChave: text("palavra_chave").notNull(),
  segmento: text("segmento", { enum: ["exame", "formula", "injetavel", "implante", "protocolo"] }).notNull(),
  codigoReferencia: text("codigo_referencia"),
  blocoReferencia: text("bloco_referencia"),
  prioridade: text("prioridade", { enum: ["baixa", "media", "alta", "urgente"] }).notNull().default("media"),
  observacao: text("observacao"),
  ativo: text("ativo").notNull().default("SIM"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRegraMotorSchema = createInsertSchema(regrasMotorTable).omit({ id: true, criadoEm: true });
export type InsertRegraMotor = z.infer<typeof insertRegraMotorSchema>;
export type RegraMotor = typeof regrasMotorTable.$inferSelect;
