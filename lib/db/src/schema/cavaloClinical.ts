import { pgTable, serial, text, integer, real, boolean, timestamp, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pacientesTable } from "./pacientes";
import { usuariosTable } from "./usuarios";

export const acompanhamentoCavaloTable = pgTable("acompanhamento_cavalo", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  tipo: text("tipo", { enum: ["CHECKIN_MENSAL", "VISITA_CLINICA", "RETORNO", "INTERCORRENCIA"] }).notNull(),
  status: text("status", { enum: ["AGENDADO", "REALIZADO", "CANCELADO", "PENDENTE"] }).notNull().default("PENDENTE"),
  dataAgendada: timestamp("data_agendada", { withTimezone: true }),
  dataRealizada: timestamp("data_realizada", { withTimezone: true }),
  responsavelId: integer("responsavel_id").references(() => usuariosTable.id),
  observacoes: text("observacoes"),
  classificacaoAlerta: text("classificacao_alerta", { enum: ["VERDE", "AMARELO", "VERMELHO"] }).notNull().default("VERDE"),
  origem: text("origem", { enum: ["OPERACIONAL", "AUTONOMA"] }).notNull().default("OPERACIONAL"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAcompanhamentoCavaloSchema = createInsertSchema(acompanhamentoCavaloTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertAcompanhamentoCavalo = z.infer<typeof insertAcompanhamentoCavaloSchema>;
export type AcompanhamentoCavalo = typeof acompanhamentoCavaloTable.$inferSelect;

export const examesEvolucaoTable = pgTable("exames_evolucao", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  nomeExame: text("nome_exame").notNull(),
  categoria: text("categoria"),
  valor: real("valor"),
  unidade: text("unidade"),
  valorMinimo: real("valor_minimo"),
  valorMaximo: real("valor_maximo"),
  classificacao: text("classificacao", { enum: ["PREOCUPANTE", "BAIXO", "MEDIANO", "OTIMO", "ALERTA"] }),
  terco: integer("terco"),
  classificacaoAutomatica: text("classificacao_automatica", { enum: ["VERDE", "AMARELO", "VERMELHO"] }),
  classificacaoManual: text("classificacao_manual", { enum: ["VERDE", "AMARELO", "VERMELHO"] }),
  tendencia: text("tendencia", { enum: ["SUBINDO", "DESCENDO", "ESTAVEL"] }),
  deltaPercentual: real("delta_percentual"),
  formulaVigente: text("formula_vigente"),
  justificativaPrescricao: text("justificativa_prescricao"),
  dataColeta: date("data_coleta"),
  laboratorio: text("laboratorio"),
  registradoPorId: integer("registrado_por_id").references(() => usuariosTable.id),
  origem: text("origem", { enum: ["OPERACIONAL", "AUTONOMA"] }).notNull().default("OPERACIONAL"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertExamesEvolucaoSchema = createInsertSchema(examesEvolucaoTable).omit({ id: true, criadoEm: true });
export type InsertExamesEvolucao = z.infer<typeof insertExamesEvolucaoSchema>;
export type ExamesEvolucao = typeof examesEvolucaoTable.$inferSelect;

export function classificarExame(
  valor: number,
  min: number,
  max: number,
  valorAnterior?: number,
): {
  terco: number;
  classificacao: "VERDE" | "AMARELO" | "VERMELHO";
  tendencia: "SUBINDO" | "DESCENDO" | "ESTAVEL";
  deltaPercentual: number | null;
} {
  let terco = 3;
  let classificacao: "VERDE" | "AMARELO" | "VERMELHO" = "VERMELHO";

  if (valor < min) {
    terco = 0;
    classificacao = "VERMELHO";
  } else if (valor > max) {
    terco = 4;
    classificacao = "VERMELHO";
  } else {
    const range = max - min;
    const tercoInferior = min + range / 3;
    const tercoSuperior = min + (2 * range) / 3;
    if (valor <= tercoInferior) {
      terco = 1;
      classificacao = "AMARELO";
    } else if (valor <= tercoSuperior) {
      terco = 2;
      classificacao = "VERDE";
    } else {
      terco = 3;
      classificacao = "AMARELO";
    }
  }

  let tendencia: "SUBINDO" | "DESCENDO" | "ESTAVEL" = "ESTAVEL";
  let deltaPercentual: number | null = null;

  if (valorAnterior && valorAnterior !== 0) {
    deltaPercentual = ((valor - valorAnterior) / valorAnterior) * 100;
    deltaPercentual = Math.round(deltaPercentual * 10) / 10;
    if (Math.abs(deltaPercentual) < 2) {
      tendencia = "ESTAVEL";
    } else if (valor > valorAnterior) {
      tendencia = "SUBINDO";
    } else {
      tendencia = "DESCENDO";
    }
  }

  return { terco, classificacao, tendencia, deltaPercentual };
}

export const feedbackFormulasTable = pgTable("feedback_formulas", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  formulaId: integer("formula_id"),
  codigoPadcom: text("codigo_padcom"),
  nomeFormula: text("nome_formula").notNull(),
  efeitoPercebido: text("efeito_percebido", { enum: ["MELHORA", "SEM_EFEITO", "PIORA", "EFEITO_COLATERAL"] }).notNull(),
  descricaoEfeito: text("descricao_efeito"),
  nivelSatisfacao: integer("nivel_satisfacao"),
  relatadoPorId: integer("relatado_por_id").references(() => usuariosTable.id),
  origem: text("origem", { enum: ["OPERACIONAL", "AUTONOMA"] }).notNull().default("OPERACIONAL"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFeedbackFormulasSchema = createInsertSchema(feedbackFormulasTable).omit({ id: true, criadoEm: true });
export type InsertFeedbackFormulas = z.infer<typeof insertFeedbackFormulasSchema>;
export type FeedbackFormulas = typeof feedbackFormulasTable.$inferSelect;

export const dadosVisitaClinicaTable = pgTable("dados_visita_clinica", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  coletadoPorId: integer("coletado_por_id").references(() => usuariosTable.id),
  dataVisita: timestamp("data_visita", { withTimezone: true }).notNull().defaultNow(),
  pesoKg: real("peso_kg"),
  alturaCm: real("altura_cm"),
  imc: real("imc"),
  pressaoSistolica: integer("pressao_sistolica"),
  pressaoDiastolica: integer("pressao_diastolica"),
  frequenciaCardiaca: integer("frequencia_cardiaca"),
  bfPercentual: real("bf_percentual"),
  massaGordaKg: real("massa_gorda_kg"),
  massaMuscularKg: real("massa_muscular_kg"),
  adipometroBiceps: real("adipometro_biceps"),
  adipometroTriceps: real("adipometro_triceps"),
  adipometroSubescapular: real("adipometro_subescapular"),
  adipometroSuprailiaco: real("adipometro_suprailiaco"),
  percentualGorduraDobras: real("percentual_gordura_dobras"),
  classificacaoAlerta: text("classificacao_alerta", { enum: ["VERDE", "AMARELO", "VERMELHO"] }).notNull().default("VERDE"),
  relatoPaciente: text("relato_paciente"),
  observacaoEnfermeira: text("observacao_enfermeira"),
  adesaoPercebida: text("adesao_percebida", { enum: ["ALTA", "MEDIA", "BAIXA"] }),
  origem: text("origem", { enum: ["OPERACIONAL", "AUTONOMA"] }).notNull().default("OPERACIONAL"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDadosVisitaClinicaSchema = createInsertSchema(dadosVisitaClinicaTable).omit({ id: true, criadoEm: true });
export type InsertDadosVisitaClinica = z.infer<typeof insertDadosVisitaClinicaSchema>;
export type DadosVisitaClinica = typeof dadosVisitaClinicaTable.$inferSelect;

export const arquivosExamesTable = pgTable("arquivos_exames", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  tipo: text("tipo", { enum: ["SANGUE", "ULTRASSOM", "RESSONANCIA", "TOMOGRAFIA", "DENSITOMETRIA", "OUTRO"] }).notNull(),
  nomeExame: text("nome_exame"),
  areaCorporal: text("area_corporal"),
  arquivoUrl: text("arquivo_url"),
  nomeArquivo: text("nome_arquivo"),
  dataExame: date("data_exame"),
  status: text("status", { enum: ["RECEBIDO", "PROCESSADO"] }).notNull().default("RECEBIDO"),
  processadoPorId: integer("processado_por_id").references(() => usuariosTable.id),
  valoresExtraidos: jsonb("valores_extraidos"),
  processadoComOcr: boolean("processado_com_ocr").default(false),
  origem: text("origem", { enum: ["OPERACIONAL", "AUTONOMA"] }).notNull().default("OPERACIONAL"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertArquivosExamesSchema = createInsertSchema(arquivosExamesTable).omit({ id: true, criadoEm: true });
export type InsertArquivosExames = z.infer<typeof insertArquivosExamesSchema>;
export type ArquivosExames = typeof arquivosExamesTable.$inferSelect;

export const padroesFormulaExameTable = pgTable("padroes_formula_exame", {
  id: serial("id").primaryKey(),
  formulaId: integer("formula_id").references(() => formulasMasterTable.id),
  codigoPadcom: text("codigo_padcom"),
  nomeExame: text("nome_exame").notNull(),
  unidade: text("unidade"),
  mediaAntes: real("media_antes"),
  mediaDepois: real("media_depois"),
  deltaMedio: real("delta_medio"),
  melhoriaPercentual: real("melhoria_percentual"),
  pacientesTotal: integer("pacientes_total"),
  pacientesComMelhora: integer("pacientes_com_melhora"),
  periodoAnaliseDias: integer("periodo_analise_dias"),
  confianca: real("confianca"),
  origem: text("origem", { enum: ["OPERACIONAL", "AUTONOMA"] }).notNull().default("OPERACIONAL"),
  versaoSchema: integer("versao_schema").notNull().default(1),
  arquivadoEm: timestamp("arquivado_em", { withTimezone: true }),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPadroesFormulaExameSchema = createInsertSchema(padroesFormulaExameTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertPadroesFormulaExame = z.infer<typeof insertPadroesFormulaExameSchema>;
export type PadroesFormulaExame = typeof padroesFormulaExameTable.$inferSelect;

export const formulasMasterTable = pgTable("formulas_master", {
  id: serial("id").primaryKey(),
  codigoPadcom: text("codigo_padcom").unique(),
  nome: text("nome").notNull(),
  categoria: text("categoria"),
  via: text("via", { enum: ["ORAL", "IM", "EV", "TOPICA", "SUBLINGUAL"] }),
  composicao: text("composicao"),
  dosePadrao: text("dose_padrao"),
  funcaoPrincipal: text("funcao_principal"),
  efeitosEsperados: text("efeitos_esperados").array(),
  efeitosColateraisPossiveis: text("efeitos_colaterais_possiveis").array(),
  contraindicacoes: text("contraindicacoes").array(),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFormulasMasterSchema = createInsertSchema(formulasMasterTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertFormulasMaster = z.infer<typeof insertFormulasMasterSchema>;
export type FormulasMaster = typeof formulasMasterTable.$inferSelect;

export const cascataValidacaoConfigTable = pgTable("cascata_validacao_config", {
  id: serial("id").primaryKey(),
  ativa: boolean("ativa").notNull().default(false),
  requerEnfermeira03: boolean("requer_enfermeira_03").notNull().default(true),
  requerConsultor03: boolean("requer_consultor_03").notNull().default(true),
  requerMedico03: boolean("requer_medico_03").notNull().default(true),
  requerMedicoSenior: boolean("requer_medico_senior").notNull().default(true),
  certificadoA1Obrigatorio: boolean("certificado_a1_obrigatorio").notNull().default(false),
  atualizadoPorId: integer("atualizado_por_id").references(() => usuariosTable.id),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCascataValidacaoConfigSchema = createInsertSchema(cascataValidacaoConfigTable).omit({ id: true, atualizadoEm: true });
export type InsertCascataValidacaoConfig = z.infer<typeof insertCascataValidacaoConfigSchema>;
export type CascataValidacaoConfig = typeof cascataValidacaoConfigTable.$inferSelect;

export const validacoesCascataTable = pgTable("validacoes_cascata", {
  id: serial("id").primaryKey(),
  entidadeTipo: text("entidade_tipo", { enum: ["ANAMNESE", "EXAME", "FORMULA", "CHECKIN", "VISITA"] }).notNull(),
  entidadeId: integer("entidade_id").notNull(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  etapa: text("etapa", { enum: ["ENFERMEIRA03", "CONSULTOR03", "MEDICO03", "MEDICO_SENIOR"] }).notNull(),
  status: text("status", { enum: ["PENDENTE", "APROVADO", "REJEITADO"] }).notNull().default("PENDENTE"),
  validadoPorId: integer("validado_por_id").references(() => usuariosTable.id),
  observacao: text("observacao"),
  validadoEm: timestamp("validado_em", { withTimezone: true }),
  assinaturaA1: text("assinatura_a1"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertValidacoesCascataSchema = createInsertSchema(validacoesCascataTable).omit({ id: true, criadoEm: true });
export type InsertValidacoesCascata = z.infer<typeof insertValidacoesCascataSchema>;
export type ValidacoesCascata = typeof validacoesCascataTable.$inferSelect;
