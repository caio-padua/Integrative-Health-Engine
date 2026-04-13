import { pgTable, serial, integer, text, timestamp, jsonb, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pacientesTable } from "./pacientes";
import { tratamentosTable } from "./tratamentos";

export const revoSnapshotsTable = pgTable("revo_snapshots", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  tratamentoId: integer("tratamento_id").references(() => tratamentosTable.id),

  tipo: text("tipo", {
    enum: ["inicial", "transicao", "atual"]
  }).notNull(),

  dataSnapshot: timestamp("data_snapshot", { withTimezone: true }).notNull().defaultNow(),

  patologiasDiagnosticas: jsonb("patologias_diagnosticas").notNull().default([]),
  patologiasPotenciais: jsonb("patologias_potenciais").notNull().default([]),
  orgaosAfetados: jsonb("orgaos_afetados").notNull().default([]),
  medicamentos: jsonb("medicamentos").notNull().default([]),
  substituicoesNaturais: jsonb("substituicoes_naturais").notNull().default([]),
  estiloVida: jsonb("estilo_vida").notNull().default({}),
  scoreSistemico: jsonb("score_sistemico").notNull().default([]),

  observacoesMedicas: text("observacoes_medicas"),
  resumoClinico: text("resumo_clinico"),

  origem: text("origem").default("PADCOM_V15.2"),
  versaoSchema: text("versao_schema").default("1.0"),

  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const revoPatologiasTable = pgTable("revo_patologias", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  snapshotId: integer("snapshot_id").references(() => revoSnapshotsTable.id),

  nome: text("nome").notNull(),
  cid10: text("cid10"),
  tipo: text("tipo", {
    enum: ["diagnosticada", "potencial", "remissao", "resolvida"]
  }).notNull().default("diagnosticada"),

  orgaoSistema: text("orgao_sistema"),
  intensidadeInicial: text("intensidade_inicial", {
    enum: ["leve", "moderada", "alta", "critica"]
  }),
  intensidadeAtual: text("intensidade_atual", {
    enum: ["leve", "moderada", "alta", "critica", "remissao", "resolvida"]
  }),

  evolucaoPercentual: real("evolucao_percentual"),
  statusSemaforo: text("status_semaforo", {
    enum: ["verde", "amarelo", "vermelho"]
  }).default("amarelo"),

  medicacaoAtual: text("medicacao_atual"),
  medicacaoOriginal: text("medicacao_original"),
  substituicaoNatural: text("substituicao_natural"),
  leituraClinica: text("leitura_clinica"),

  dataDeteccao: timestamp("data_deteccao", { withTimezone: true }),
  dataUltimaAvaliacao: timestamp("data_ultima_avaliacao", { withTimezone: true }),

  ativo: boolean("ativo").notNull().default(true),

  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const revoCurvasTable = pgTable("revo_curvas", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),

  tipoCurva: text("tipo_curva", {
    enum: ["doenca", "saude"]
  }).notNull(),

  indicador: text("indicador").notNull(),
  valor: real("valor").notNull(),
  dataRegistro: timestamp("data_registro", { withTimezone: true }).notNull().defaultNow(),

  unidade: text("unidade"),
  observacao: text("observacao"),

  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const revoOrgaosTable = pgTable("revo_orgaos", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  snapshotId: integer("snapshot_id").references(() => revoSnapshotsTable.id),

  orgaoSistema: text("orgao_sistema").notNull(),
  intensidade: text("intensidade", {
    enum: ["leve", "moderada", "alta", "critica"]
  }).notNull(),
  riscoPrognostico: text("risco_prognostico", {
    enum: ["baixo", "moderado", "alto", "critico"]
  }).notNull(),

  patologiasRelacionadas: jsonb("patologias_relacionadas").default([]),
  observacao: text("observacao"),

  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const revoMedicamentosTable = pgTable("revo_medicamentos", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),

  nome: text("nome").notNull(),
  dose: text("dose"),
  motivoUso: text("motivo_uso"),
  tempoUso: text("tempo_uso"),

  statusAtual: text("status_atual", {
    enum: ["em_uso", "reduzido", "suspenso", "substituido"]
  }).notNull().default("em_uso"),

  criterioReducao: text("criterio_reducao"),
  substituicaoNatural: text("substituicao_natural"),
  evidenciaMelhora: text("evidencia_melhora"),

  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRevoSnapshotSchema = createInsertSchema(revoSnapshotsTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertRevoSnapshot = z.infer<typeof insertRevoSnapshotSchema>;
export type RevoSnapshot = typeof revoSnapshotsTable.$inferSelect;

export const insertRevoPatologiaSchema = createInsertSchema(revoPatologiasTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertRevoPatologia = z.infer<typeof insertRevoPatologiaSchema>;
export type RevoPatologia = typeof revoPatologiasTable.$inferSelect;

export const insertRevoCurvaSchema = createInsertSchema(revoCurvasTable).omit({ id: true, criadoEm: true });
export type InsertRevoCurva = z.infer<typeof insertRevoCurvaSchema>;
export type RevoCurva = typeof revoCurvasTable.$inferSelect;

export const insertRevoOrgaoSchema = createInsertSchema(revoOrgaosTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertRevoOrgao = z.infer<typeof insertRevoOrgaoSchema>;
export type RevoOrgao = typeof revoOrgaosTable.$inferSelect;

export const insertRevoMedicamentoSchema = createInsertSchema(revoMedicamentosTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertRevoMedicamento = z.infer<typeof insertRevoMedicamentoSchema>;
export type RevoMedicamento = typeof revoMedicamentosTable.$inferSelect;
