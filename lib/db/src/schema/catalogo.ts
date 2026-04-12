import { pgTable, serial, text, boolean, real, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const injetaveisTable = pgTable("injetaveis", {
  id: serial("id").primaryKey(),
  codigoPadcom: text("codigo_padcom").notNull(),
  codigoSemantico: text("codigo_semantico"),
  b1: text("b1"),
  b2: text("b2"),
  b3: text("b3"),
  b4: text("b4"),
  seq: text("seq"),
  substanciaBase: text("substancia_base"),
  tipoLinha: text("tipo_linha").notNull(),
  nomeAmpola: text("nome_ampola").notNull(),
  nomeExibicao: text("nome_exibicao").notNull(),
  ativo: boolean("ativo").notNull().default(true),
  dosagem: text("dosagem"),
  volume: text("volume"),
  via: text("via"),
  valorUnidade: text("valor_unidade"),
  origemValor: text("origem_valor"),
  statusCadastro: text("status_cadastro").notNull().default("ATIVO"),
  observacao: text("observacao"),
  classificacao: text("classificacao"),
  eixoIntegrativo: text("eixo_integrativo"),
  palavraChaveMotor: text("palavra_chave_motor"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const endovenososTable = pgTable("endovenosos", {
  id: serial("id").primaryKey(),
  codigoPadcom: text("codigo_padcom").notNull(),
  codigoSemantico: text("codigo_semantico"),
  b1: text("b1"),
  b2: text("b2"),
  b3: text("b3"),
  b4: text("b4"),
  seq: text("seq"),
  tipoLinha: text("tipo_linha").notNull(),
  nomeSoro: text("nome_soro").notNull(),
  nomeExibicao: text("nome_exibicao").notNull(),
  ativo: boolean("ativo").notNull().default(true),
  dosagem: text("dosagem"),
  volume: text("volume"),
  via: text("via"),
  valorUnidade: text("valor_unidade"),
  origemValor: text("origem_valor"),
  statusCadastro: text("status_cadastro").notNull().default("ATIVO"),
  observacao: text("observacao"),
  classificacao: text("classificacao"),
  eixoIntegrativo: text("eixo_integrativo"),
  palavraChaveMotor: text("palavra_chave_motor"),
  frequenciaPadrao: text("frequencia_padrao"),
  complementar: text("complementar"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const implantesTable = pgTable("implantes", {
  id: serial("id").primaryKey(),
  codigoPadcom: text("codigo_padcom").notNull(),
  codigoSemantico: text("codigo_semantico"),
  b1: text("b1"),
  b2: text("b2"),
  b3: text("b3"),
  b4: text("b4"),
  seq: text("seq"),
  nomeImplante: text("nome_implante").notNull(),
  substanciaAtiva: text("substancia_ativa").notNull(),
  ativo: boolean("ativo").notNull().default(true),
  dosagem: text("dosagem"),
  unidade: text("unidade"),
  trocarte: text("trocarte"),
  liberacaoDiaria: text("liberacao_diaria"),
  doseRecomendada: text("dose_recomendada"),
  tempoAcao: text("tempo_acao"),
  indicacao: text("indicacao"),
  via: text("via"),
  valorUnidade: text("valor_unidade"),
  origemValor: text("origem_valor"),
  statusCadastro: text("status_cadastro").notNull().default("ATIVO"),
  observacao: text("observacao"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const formulasTable = pgTable("formulas", {
  id: serial("id").primaryKey(),
  codigoPadcom: text("codigo_padcom").notNull(),
  codigoSemantico: text("codigo_semantico"),
  b1: text("b1"),
  b2: text("b2"),
  b3: text("b3"),
  b4: text("b4"),
  seq: text("seq"),
  identificador: text("identificador").notNull(),
  conteudo: text("conteudo").notNull(),
  area: text("area"),
  funcao: text("funcao"),
  status: text("status").notNull().default("ATIVO"),
  tipoLinha: text("tipo_linha").notNull(),
  valorUnidade: text("valor_unidade"),
  origemValor: text("origem_valor"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const doencasTable = pgTable("doencas", {
  id: serial("id").primaryKey(),
  codigoDoenca: text("codigo_doenca").notNull(),
  codigoSemantico: text("codigo_semantico"),
  b1: text("b1"),
  b2: text("b2"),
  b3: text("b3"),
  b4: text("b4"),
  seq: text("seq"),
  grupo: text("grupo").notNull(),
  nomeDoenca: text("nome_doenca").notNull(),
  codigoLegado: text("codigo_legado"),
  codigoV14: text("codigo_v14"),
  eixo: text("eixo"),
  blocosMotor: text("blocos_motor"),
  blocoMotor: text("bloco_motor"),
  observacao: text("observacao"),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const regrasInjetaveisTable = pgTable("regras_injetaveis", {
  id: serial("id").primaryKey(),
  regraId: text("regra_id").notNull(),
  palavraChave: text("palavra_chave").notNull(),
  eixo: text("eixo"),
  codigoInjetavel: text("codigo_injetavel"),
  prioridade: text("prioridade"),
  nomeReferencia: text("nome_referencia"),
  justificativa: text("justificativa"),
  status: text("status").notNull().default("ATIVO"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const regrasEndovenososTable = pgTable("regras_endovenosos", {
  id: serial("id").primaryKey(),
  regraId: text("regra_id").notNull(),
  palavraChave: text("palavra_chave").notNull(),
  eixo: text("eixo"),
  codigoEndovenoso: text("codigo_endovenoso"),
  prioridade: text("prioridade"),
  nomeReferencia: text("nome_referencia"),
  justificativa: text("justificativa"),
  frequencia: text("frequencia"),
  complementar: text("complementar"),
  status: text("status").notNull().default("ATIVO"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const regrasImplantesTable = pgTable("regras_implantes", {
  id: serial("id").primaryKey(),
  condicao: text("condicao").notNull(),
  perfil: text("perfil"),
  codigoImplante: text("codigo_implante"),
  prioridade: text("prioridade"),
  eixo: text("eixo"),
  observacao: text("observacao"),
  status: text("status").notNull().default("ATIVO"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const protocolosMasterTable = pgTable("protocolos_master", {
  id: serial("id").primaryKey(),
  codigoProtocolo: text("codigo_protocolo").notNull(),
  nome: text("nome").notNull(),
  area: text("area"),
  objetivo: text("objetivo"),
  modoOferta: text("modo_oferta"),
  status: text("status").notNull().default("ATIVO"),
  observacao: text("observacao"),
  valorExames: text("valor_exames"),
  valorFormulas: text("valor_formulas"),
  valorInjetaveis: text("valor_injetaveis"),
  valorImplantes: text("valor_implantes"),
  valorTotal: text("valor_total"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const protocolosFasesTable = pgTable("protocolos_fases", {
  id: serial("id").primaryKey(),
  codigoProtocolo: text("codigo_protocolo").notNull(),
  fase: text("fase").notNull(),
  diaInicio: text("dia_inicio"),
  diaFim: text("dia_fim"),
  marco: text("marco"),
  observacao: text("observacao"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const protocolosAcoesTable = pgTable("protocolos_acoes", {
  id: serial("id").primaryKey(),
  codigoProtocolo: text("codigo_protocolo").notNull(),
  fase: text("fase").notNull(),
  tipoAcao: text("tipo_acao").notNull(),
  codigoReferencia: text("codigo_referencia"),
  ordem: integer("ordem"),
  obrigatorio: text("obrigatorio"),
  observacao: text("observacao"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const mapaAnamneseMotorTable = pgTable("mapa_anamnese_motor", {
  id: serial("id").primaryKey(),
  perguntaId: text("pergunta_id").notNull(),
  palavraChave: text("palavra_chave").notNull(),
  codigoDoenca: text("codigo_doenca"),
  eixo: text("eixo"),
  codigoExame: text("codigo_exame"),
  codigoFormula: text("codigo_formula"),
  codigoInjetavel: text("codigo_injetavel"),
  codigoImplante: text("codigo_implante"),
  codigoProtocolo: text("codigo_protocolo"),
  validacaoHumana: text("validacao_humana"),
  nomeExame: text("nome_exame"),
  nomeFormula: text("nome_formula"),
  nomeInjetavel: text("nome_injetavel"),
  nomeImplante: text("nome_implante"),
  nomeProtocolo: text("nome_protocolo"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const motorDecisaoTable = pgTable("motor_decisao_clinica", {
  id: serial("id").primaryKey(),
  casoId: text("caso_id").notNull(),
  palavraChave: text("palavra_chave").notNull(),
  codigoDoenca: text("codigo_doenca"),
  eixo: text("eixo"),
  codigoExame: text("codigo_exame"),
  nomeExame: text("nome_exame"),
  codigoFormula: text("codigo_formula"),
  nomeFormula: text("nome_formula"),
  codigoInjetavel: text("codigo_injetavel"),
  nomeInjetavel: text("nome_injetavel"),
  codigoImplante: text("codigo_implante"),
  nomeImplante: text("nome_implante"),
  codigoProtocolo: text("codigo_protocolo"),
  nomeProtocolo: text("nome_protocolo"),
  valorExame: text("valor_exame"),
  valorFormula: text("valor_formula"),
  valorInjetavel: text("valor_injetavel"),
  valorImplante: text("valor_implante"),
  valorTotal: text("valor_total"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const dietasTable = pgTable("dietas", {
  id: serial("id").primaryKey(),
  codigoDieta: text("codigo_dieta").notNull(),
  codigoSemantico: text("codigo_semantico"),
  b1: text("b1"),
  b2: text("b2"),
  b3: text("b3"),
  b4: text("b4"),
  seq: text("seq"),
  modeloDieta: text("modelo_dieta").notNull(),
  faixaCalorica: text("faixa_calorica"),
  refeicao: text("refeicao").notNull(),
  opcao1: text("opcao_1"),
  opcao2: text("opcao_2"),
  opcao3: text("opcao_3"),
  status: text("status").notNull().default("ATIVO"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const questionarioMasterTable = pgTable("questionario_master", {
  id: serial("id").primaryKey(),
  bloco: text("bloco").notNull(),
  perguntaId: text("pergunta_id").notNull(),
  pergunta: text("pergunta").notNull(),
  tipoResposta: text("tipo_resposta"),
  obrigatorio: text("obrigatorio"),
  exemplo: text("exemplo"),
  observacao: text("observacao"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const psicologiaTable = pgTable("psicologia", {
  id: serial("id").primaryKey(),
  codigoPsicologia: text("codigo_psicologia").notNull(),
  condicaoPrincipal: text("condicao_principal").notNull(),
  sinaisChave: text("sinais_chave"),
  indicacaoInicial: text("indicacao_inicial"),
  encaminhamento: text("encaminhamento"),
  status: text("status").notNull().default("ATIVO"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInjetavelSchema = createInsertSchema(injetaveisTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertInjetavel = z.infer<typeof insertInjetavelSchema>;
export type Injetavel = typeof injetaveisTable.$inferSelect;

export const insertEndovenosoSchema = createInsertSchema(endovenososTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertEndovenoso = z.infer<typeof insertEndovenosoSchema>;
export type Endovenoso = typeof endovenososTable.$inferSelect;

export const insertImplanteSchema = createInsertSchema(implantesTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertImplante = z.infer<typeof insertImplanteSchema>;
export type Implante = typeof implantesTable.$inferSelect;

export const insertFormulaSchema = createInsertSchema(formulasTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertFormula = z.infer<typeof insertFormulaSchema>;
export type Formula = typeof formulasTable.$inferSelect;

export const insertDoencaSchema = createInsertSchema(doencasTable).omit({ id: true, criadoEm: true });
export type InsertDoenca = z.infer<typeof insertDoencaSchema>;
export type Doenca = typeof doencasTable.$inferSelect;
