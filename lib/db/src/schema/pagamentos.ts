import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pacientesTable } from "./pacientes";
import { unidadesTable } from "./unidades";

export const pagamentosTable = pgTable("pagamentos", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  valor: real("valor").notNull(),
  status: text("status", { enum: ["pendente", "pago", "cancelado", "estornado"] }).notNull().default("pendente"),
  formaPagamento: text("forma_pagamento", { enum: ["dinheiro", "cartao_credito", "cartao_debito", "pix", "boleto", "plano_saude"] }).notNull(),
  descricao: text("descricao"),
  unidadeId: integer("unidade_id").notNull().references(() => unidadesTable.id),
  paguEm: timestamp("pagu_em", { withTimezone: true }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPagamentoSchema = createInsertSchema(pagamentosTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertPagamento = z.infer<typeof insertPagamentoSchema>;
export type Pagamento = typeof pagamentosTable.$inferSelect;
