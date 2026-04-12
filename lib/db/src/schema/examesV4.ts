import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const examesBaseTable = pgTable("exames_base", {
  id: serial("id").primaryKey(),
  codigoExame: text("codigo_exame").notNull().unique(),
  codigoSemantico: text("codigo_semantico"),
  b1: text("b1"),
  b2: text("b2"),
  b3: text("b3"),
  b4: text("b4"),
  seq: text("seq"),
  ativo: boolean("ativo").notNull().default(true),
  grupoPrincipal: text("grupo_principal").notNull(),
  subgrupo: text("subgrupo"),
  nomeExame: text("nome_exame").notNull(),
  modalidade: text("modalidade"),
  materialOuSetor: text("material_ou_setor"),
  agrupamentoPdf: text("agrupamento_pdf"),
  preparo: text("preparo"),
  recomendacoes: text("recomendacoes"),
  corpoPedido: text("corpo_pedido"),
  hd1: text("hd_1"),
  cid1: text("cid_1"),
  hd2: text("hd_2"),
  cid2: text("cid_2"),
  hd3: text("hd_3"),
  cid3: text("cid_3"),
  justificativaObjetiva: text("justificativa_objetiva"),
  justificativaNarrativa: text("justificativa_narrativa"),
  justificativaRobusta: text("justificativa_robusta"),
  sexoAplicavel: text("sexo_aplicavel"),
  idadeInicialDiretriz: text("idade_inicial_diretriz"),
  idadeInicialAltoRisco: text("idade_inicial_alto_risco"),
  frequenciaDiretriz: text("frequencia_diretriz"),
  frequenciaProtocoloPadua: text("frequencia_protocolo_padua"),
  tipoIndicacao: text("tipo_indicacao"),
  gatilhoPorSintoma: text("gatilho_por_sintoma"),
  gatilhoPorDoenca: text("gatilho_por_doenca"),
  gatilhoPorHistoricoFamiliar: text("gatilho_por_historico_familiar"),
  gatilhoPorCheckUp: text("gatilho_por_check_up"),
  exigeValidacaoHumana: text("exige_validacao_humana"),
  prioridade: text("prioridade"),
  exameDeRastreio: text("exame_de_rastreio"),
  exameDeSeguimento: text("exame_de_seguimento"),
  permiteRecorrenciaAutomatica: text("permite_recorrencia_automatica"),
  intervaloRecorrenciaDias: text("intervalo_recorrencia_dias"),
  perfilDeRisco: text("perfil_de_risco"),
  fonteDaRegra: text("fonte_da_regra"),
  fonteUrl: text("fonte_url"),
  observacaoClinica: text("observacao_clinica"),
  blocoOficial: text("bloco_oficial"),
  grauDoBloco: text("grau_do_bloco"),
  usaGrade: text("usa_grade"),
  ordemNoBloco: integer("ordem_no_bloco"),
  finalidadePrincipal: text("finalidade_principal"),
  finalidadeSecundaria: text("finalidade_secundaria"),
  objetivoPratico: text("objetivo_pratico"),
  objetivoTecnico: text("objetivo_tecnico"),
  interpretacaoPratica: text("interpretacao_pratica"),
  quandoPensarNesteExame: text("quando_pensar_neste_exame"),
  limitacaoDoExame: text("limitacao_do_exame"),
  correlacaoClinica: text("correlacao_clinica"),
  legendaRapida: text("legenda_rapida"),
  inflamacaoVisual: text("inflamacao_visual"),
  oxidacaoVisual: text("oxidacao_visual"),
  riscoCardiometabolicoVisual: text("risco_cardiometabolico_visual"),
  valorClinicoVisual: text("valor_clinico_visual"),
  complexidadeInterpretativaVisual: text("complexidade_interpretativa_visual"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const matrizRastreioTable = pgTable("matriz_rastreio", {
  id: serial("id").primaryKey(),
  codigoExame: text("codigo_exame").notNull(),
  nomeExame: text("nome_exame").notNull(),
  blocoOficial: text("bloco_oficial"),
  grauDoBloco: text("grau_do_bloco"),
  sexoAplicavel: text("sexo_aplicavel"),
  idadeInicialDiretriz: text("idade_inicial_diretriz"),
  idadeInicialAltoRisco: text("idade_inicial_alto_risco"),
  frequenciaDiretriz: text("frequencia_diretriz"),
  frequenciaProtocoloPadua: text("frequencia_protocolo_padua"),
  tipoIndicacao: text("tipo_indicacao"),
  gatilhoPorSintoma: text("gatilho_por_sintoma"),
  prioridade: text("prioridade"),
  exameDeRastreio: text("exame_de_rastreio"),
  perfilDeRisco: text("perfil_de_risco"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const regrasTriagemTable = pgTable("regras_triagem", {
  id: serial("id").primaryKey(),
  regraId: text("regra_id").notNull().unique(),
  pergunta: text("pergunta").notNull(),
  respostaGatilho: text("resposta_gatilho").notNull(),
  tipoCondicao: text("tipo_condicao"),
  blocoSugerido: text("bloco_sugerido"),
  exameSugerido: text("exame_sugerido"),
  prioridade: text("prioridade"),
  tipoAcao: text("tipo_acao"),
  validacaoHumana: text("validacao_humana"),
  observacao: text("observacao"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const recorrenciaTable = pgTable("recorrencia", {
  id: serial("id").primaryKey(),
  regraId: text("regra_id").notNull().unique(),
  exameOuPainel: text("exame_ou_painel").notNull(),
  intervaloDias: integer("intervalo_dias"),
  acaoDisparada: text("acao_disparada"),
  geraNovoPagamento: text("gera_novo_pagamento"),
  exigeNovaValidacao: text("exige_nova_validacao"),
  permiteNovaEmissao: text("permite_nova_emissao"),
  prioridade: text("prioridade"),
  observacao: text("observacao"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const dicionarioGrausTable = pgTable("dicionario_graus", {
  id: serial("id").primaryKey(),
  grau: text("grau").notNull().unique(),
  descricao: text("descricao"),
  quandoUsar: text("quando_usar"),
  observacao: text("observacao"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertExameBaseSchema = createInsertSchema(examesBaseTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertExameBase = z.infer<typeof insertExameBaseSchema>;
export type ExameBase = typeof examesBaseTable.$inferSelect;

export const insertMatrizRastreioSchema = createInsertSchema(matrizRastreioTable).omit({ id: true, criadoEm: true });
export type InsertMatrizRastreio = z.infer<typeof insertMatrizRastreioSchema>;

export const insertRegraTriagemSchema = createInsertSchema(regrasTriagemTable).omit({ id: true, criadoEm: true });
export type InsertRegraTriagem = z.infer<typeof insertRegraTriagemSchema>;

export const insertRecorrenciaSchema = createInsertSchema(recorrenciaTable).omit({ id: true, criadoEm: true });
export type InsertRecorrencia = z.infer<typeof insertRecorrenciaSchema>;

export const insertDicionarioGrauSchema = createInsertSchema(dicionarioGrausTable).omit({ id: true, criadoEm: true });
export type InsertDicionarioGrau = z.infer<typeof insertDicionarioGrauSchema>;
