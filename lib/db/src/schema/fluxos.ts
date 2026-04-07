import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const fluxosAprovacoesTable = pgTable("fluxos_aprovacoes", {
  id: serial("id").primaryKey(),
  codigoFluxo: text("codigo_fluxo").notNull(),
  tipoProcedimento: text("tipo_procedimento").notNull(),
  etapaOrdem: integer("etapa_ordem").notNull(),
  etapaNome: text("etapa_nome").notNull(),
  perfilResponsavel: text("perfil_responsavel").notNull(),
  requerido: boolean("requerido").notNull().default(true),
  condicional: boolean("condicional").notNull().default(false),
  regraCondicional: text("regra_condicional"),
  podeBypass: boolean("pode_bypass").notNull().default(false),
  somenteMedicoAdminPodeBypass: boolean("somente_medico_admin_pode_bypass").notNull().default(true),
  exigeJustificativa: boolean("exige_justificativa").notNull().default(false),
  bloqueiaSeoPendente: boolean("bloqueia_se_pendente").notNull().default(true),
  disparaNotificacao: boolean("dispara_notificacao").notNull().default(true),
  observacao: text("observacao"),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const perfisPermissoesTable = pgTable("perfis_permissoes", {
  id: serial("id").primaryKey(),
  perfil: text("perfil").notNull().unique(),
  escopo: text("escopo").notNull(),
  podeEditarQuestionario: boolean("pode_editar_questionario").notNull().default(false),
  podeValidar: boolean("pode_validar").notNull().default(false),
  podeBypass: boolean("pode_bypass").notNull().default(false),
  podeEmitirNf: boolean("pode_emitir_nf").notNull().default(false),
  podeVerDadosOutrasEmpresas: boolean("pode_ver_dados_outras_empresas").notNull().default(false),
  observacao: text("observacao"),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const mapaBlockExameTable = pgTable("mapa_bloco_exame", {
  id: serial("id").primaryKey(),
  blocoId: text("bloco_id").notNull(),
  nomeBloco: text("nome_bloco").notNull(),
  usaGrade: boolean("usa_grade").notNull().default(true),
  grau: text("grau").notNull(),
  ordemNoBloco: integer("ordem_no_bloco").notNull(),
  nomeExame: text("nome_exame").notNull(),
  codigoPadcom: text("codigo_padcom"),
  codigoLegado: text("codigo_legado"),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFluxoAprovacaoSchema = createInsertSchema(fluxosAprovacoesTable).omit({ id: true, criadoEm: true });
export type InsertFluxoAprovacao = z.infer<typeof insertFluxoAprovacaoSchema>;
export type FluxoAprovacao = typeof fluxosAprovacoesTable.$inferSelect;

export const insertPerfilPermissaoSchema = createInsertSchema(perfisPermissoesTable).omit({ id: true, criadoEm: true });
export type InsertPerfilPermissao = z.infer<typeof insertPerfilPermissaoSchema>;
export type PerfilPermissao = typeof perfisPermissoesTable.$inferSelect;

export const insertMapaBlocoExameSchema = createInsertSchema(mapaBlockExameTable).omit({ id: true, criadoEm: true });
export type InsertMapaBlocoExame = z.infer<typeof insertMapaBlocoExameSchema>;
export type MapaBlocoExame = typeof mapaBlockExameTable.$inferSelect;
