import { pgTable, serial, text, integer, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pacientesTable } from "./pacientes";
import { protocolosTable } from "./protocolos";
import { unidadesTable } from "./unidades";
import { substanciasTable } from "./substancias";
import { usuariosTable } from "./usuarios";

export const tratamentosTable = pgTable("tratamentos", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  protocoloId: integer("protocolo_id").references(() => protocolosTable.id),
  unidadeId: integer("unidade_id").references(() => unidadesTable.id),
  medicoId: integer("medico_id").references(() => usuariosTable.id),

  nome: text("nome").notNull(),
  descricao: text("descricao"),

  valorBruto: real("valor_bruto").notNull().default(0),
  desconto: real("desconto").notNull().default(0),
  valorFinal: real("valor_final").notNull().default(0),
  valorPago: real("valor_pago").notNull().default(0),
  saldoDevedor: real("saldo_devedor").notNull().default(0),

  numeroParcelas: integer("numero_parcelas").notNull().default(1),
  condicoesPagamento: jsonb("condicoes_pagamento").default({}),

  status: text("status", {
    enum: ["ativo", "concluido", "cancelado", "desistencia", "suspenso"]
  }).notNull().default("ativo"),

  dataInicio: text("data_inicio"),
  dataPrevisaoFim: text("data_previsao_fim"),
  dataConclusao: text("data_conclusao"),

  motivoDesistencia: text("motivo_desistencia"),
  valorRetidoDesistencia: real("valor_retido_desistencia"),
  custosInsumos: real("custos_insumos"),
  custoReservaTecnica: real("custo_reserva_tecnica"),
  custoLogistica: real("custo_logistica"),
  detalhesRetencao: jsonb("detalhes_retencao"),

  observacoes: text("observacoes"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const tratamentoItensTable = pgTable("tratamento_itens", {
  id: serial("id").primaryKey(),
  tratamentoId: integer("tratamento_id").notNull().references(() => tratamentosTable.id),
  substanciaId: integer("substancia_id").references(() => substanciasTable.id),
  codigoSemantico: text("codigo_semantico"),
  revoPatologiaId: integer("revo_patologia_id"),

  descricao: text("descricao").notNull(),
  tipo: text("tipo", {
    enum: ["substancia", "insumo", "taxa_administrativa", "reserva_tecnica", "honorario_medico", "honorario_enfermagem"]
  }).notNull().default("substancia"),

  quantidade: real("quantidade").notNull().default(1),
  valorUnitario: real("valor_unitario").notNull().default(0),
  valorTotal: real("valor_total").notNull().default(0),

  numeroSessoes: integer("numero_sessoes"),
  via: text("via"),
  observacoes: text("observacoes"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTratamentoSchema = createInsertSchema(tratamentosTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertTratamento = z.infer<typeof insertTratamentoSchema>;
export type Tratamento = typeof tratamentosTable.$inferSelect;

export const insertTratamentoItemSchema = createInsertSchema(tratamentoItensTable).omit({ id: true, criadoEm: true });
export type InsertTratamentoItem = z.infer<typeof insertTratamentoItemSchema>;
export type TratamentoItem = typeof tratamentoItensTable.$inferSelect;
