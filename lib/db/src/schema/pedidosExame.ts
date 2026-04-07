import { pgTable, serial, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pedidosExameTable = pgTable("pedidos_exame", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull(),
  medicoId: integer("medico_id").notNull(),
  unidadeId: integer("unidade_id"),
  status: text("status").notNull().default("RASCUNHO"),
  exames: jsonb("exames").notNull().$type<Array<{
    codigoExame: string;
    nomeExame: string;
    blocoOficial: string | null;
    grauDoBloco: string | null;
    corpoPedido: string;
    preparo: string | null;
    hd: string | null;
    cid: string | null;
  }>>(),
  hipoteseDiagnostica: text("hipotese_diagnostica"),
  cidPrincipal: text("cid_principal"),
  incluirJustificativa: boolean("incluir_justificativa").notNull().default(false),
  tipoJustificativa: text("tipo_justificativa"),
  observacaoMedica: text("observacao_medica"),
  pdfSolicitacaoUrl: text("pdf_solicitacao_url"),
  pdfJustificativaUrl: text("pdf_justificativa_url"),
  validadoEm: timestamp("validado_em", { withTimezone: true }),
  validadoPor: integer("validado_por"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPedidoExameSchema = createInsertSchema(pedidosExameTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertPedidoExame = z.infer<typeof insertPedidoExameSchema>;
export type PedidoExame = typeof pedidosExameTable.$inferSelect;
