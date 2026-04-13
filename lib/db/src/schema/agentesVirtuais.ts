import { pgTable, serial, text, integer, boolean, timestamp, varchar, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { unidadesTable } from "./unidades";

export const catalogoAgentesTable = pgTable("catalogo_agentes", {
  id: serial("id").primaryKey(),
  codigoAgente: varchar("codigo_agente", { length: 80 }).notNull().unique(),
  nomeAgente: varchar("nome_agente", { length: 200 }).notNull(),
  descricao: text("descricao"),
  versao: varchar("versao", { length: 20 }).notNull().default("1.0"),
  funcaoAgente: text("funcao_agente").notNull(),
  cargo: varchar("cargo", { length: 100 }).notNull(),
  indice: varchar("indice", { length: 20 }).notNull(),
  modalidade: varchar("modalidade", { length: 50 }).notNull().default("presencial"),
  emoji: varchar("emoji", { length: 20 }),
  corSemantica: varchar("cor_semantica", { length: 20 }).notNull(),
  tomDeVoz: text("tom_de_voz").notNull(),
  naoFaz: jsonb("nao_faz").$type<string[]>(),
  slaDefaultHoras: integer("sla_default_horas").notNull().default(2),
  escalaPara: varchar("escala_para", { length: 100 }),
  regrasTdahToc: jsonb("regras_tdah_toc").$type<{
    maxFrasesPorBloco: number;
    obrigaTopicos: boolean;
    obrigaLinhaEmBrancoEntreSecoes: boolean;
    obrigaEmojiSemantico: boolean;
    maxCaracteresPorMensagem: number;
    estruturaObrigatoria: string[];
  }>(),
  perfilMensagemPadrao: jsonb("perfil_mensagem_padrao").$type<{
    saudacao: string;
    despedida: string;
    assinatura: string;
    emojisPadrao: string[];
    fraseEscalada: string;
  }>(),
  schemaConfiguracao: jsonb("schema_configuracao").$type<Record<string, any>>(),
  ativoGlobal: boolean("ativo_global").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const modulosClinicaTable = pgTable("modulos_clinica", {
  id: serial("id").primaryKey(),
  clinicaId: integer("clinica_id").references(() => unidadesTable.id).notNull(),
  codigoModulo: varchar("codigo_modulo", { length: 80 }).notNull(),
  habilitado: boolean("habilitado").notNull().default(false),
  habilitadoEm: timestamp("habilitado_em", { withTimezone: true }),
  expiraEm: timestamp("expira_em", { withTimezone: true }),
  planoCobranca: varchar("plano_cobranca", { length: 50 }),
  observacoes: text("observacoes"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const agentesClinicaTable = pgTable("agentes_clinica", {
  id: serial("id").primaryKey(),
  clinicaId: integer("clinica_id").references(() => unidadesTable.id).notNull(),
  catalogoAgenteId: integer("catalogo_agente_id").references(() => catalogoAgentesTable.id).notNull(),
  identificadorAgente: varchar("identificador_agente", { length: 200 }).notNull(),
  emailAgente: varchar("email_agente", { length: 200 }),
  habilitado: boolean("habilitado").notNull().default(false),
  estadoProntidao: varchar("estado_prontidao", { length: 30 }).notNull().default("provisionado"),
  configuracaoCustomizadaJson: jsonb("configuracao_customizada_json").$type<Record<string, any>>(),
  tomDeVozCustomizado: text("tom_de_voz_customizado"),
  naoFazCustomizado: jsonb("nao_faz_customizado").$type<string[]>(),
  perfilMensagemCustomizado: jsonb("perfil_mensagem_customizado").$type<{
    saudacao: string;
    despedida: string;
    assinatura: string;
    emojisPadrao: string[];
    fraseEscalada: string;
  }>(),
  regrasTdahTocCustomizadas: jsonb("regras_tdah_toc_customizadas").$type<{
    maxFrasesPorBloco: number;
    obrigaTopicos: boolean;
    obrigaLinhaEmBrancoEntreSecoes: boolean;
    obrigaEmojiSemantico: boolean;
    maxCaracteresPorMensagem: number;
    estruturaObrigatoria: string[];
  }>(),
  posicaoSupervisorResponsavelId: integer("posicao_supervisor_responsavel_id"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const capacidadesAgenteClinicaTable = pgTable("capacidades_agente_clinica", {
  id: serial("id").primaryKey(),
  agenteClinicaId: integer("agente_clinica_id").references(() => agentesClinicaTable.id).notNull(),
  podeEnviarWhatsapp: boolean("pode_enviar_whatsapp").notNull().default(false),
  podeEnviarEmail: boolean("pode_enviar_email").notNull().default(false),
  podeCriarTarefa: boolean("pode_criar_tarefa").notNull().default(false),
  podeAtualizarTarefa: boolean("pode_atualizar_tarefa").notNull().default(false),
  podeLerAgenda: boolean("pode_ler_agenda").notNull().default(false),
  podeLerAcompanhamento: boolean("pode_ler_acompanhamento").notNull().default(false),
  podeEscalarSupervisor: boolean("pode_escalar_supervisor").notNull().default(true),
  requerValidacaoHumana: boolean("requer_validacao_humana").notNull().default(true),
  nuncaRespondeCasoVermelhoSemHumano: boolean("nunca_responde_caso_vermelho_sem_humano").notNull().default(true),
  podeConsultarProntuario: boolean("pode_consultar_prontuario").notNull().default(false),
  podeCriarAgendamento: boolean("pode_criar_agendamento").notNull().default(false),
  podeEnviarCodigoValidacao: boolean("pode_enviar_codigo_validacao").notNull().default(false),
  podeRegistrarMemoria: boolean("pode_registrar_memoria").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const execucoesAgenteTable = pgTable("execucoes_agente", {
  id: serial("id").primaryKey(),
  agenteClinicaId: integer("agente_clinica_id").references(() => agentesClinicaTable.id).notNull(),
  contextoTipo: varchar("contexto_tipo", { length: 80 }).notNull(),
  contextoId: integer("contexto_id"),
  gatilho: varchar("gatilho", { length: 100 }).notNull(),
  statusExecucao: varchar("status_execucao", { length: 40 }).notNull().default("pendente"),
  iniciadoEm: timestamp("iniciado_em", { withTimezone: true }).defaultNow(),
  finalizadoEm: timestamp("finalizado_em", { withTimezone: true }),
  resultadoResumo: text("resultado_resumo"),
  confiancaModelo: real("confianca_modelo"),
  exigiuValidacaoHumana: boolean("exigiu_validacao_humana").default(false),
  validadoPorUsuarioId: integer("validado_por_usuario_id"),
  erroExecucao: text("erro_execucao"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const acoesAgenteTable = pgTable("acoes_agente", {
  id: serial("id").primaryKey(),
  execucaoAgenteId: integer("execucao_agente_id").references(() => execucoesAgenteTable.id).notNull(),
  tipoAcao: varchar("tipo_acao", { length: 80 }).notNull(),
  alvoTipo: varchar("alvo_tipo", { length: 80 }),
  alvoId: integer("alvo_id"),
  payloadResumido: jsonb("payload_resumido").$type<Record<string, any>>(),
  canal: varchar("canal", { length: 50 }),
  statusAcao: varchar("status_acao", { length: 40 }).notNull().default("pendente"),
  executadoEm: timestamp("executado_em", { withTimezone: true }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const memoriasContextuaisAgenteTable = pgTable("memorias_contextuais_agente", {
  id: serial("id").primaryKey(),
  agenteClinicaId: integer("agente_clinica_id").references(() => agentesClinicaTable.id).notNull(),
  pacienteId: integer("paciente_id"),
  tipoMemoria: varchar("tipo_memoria", { length: 80 }).notNull(),
  conteudo: text("conteudo").notNull(),
  metadados: jsonb("metadados").$type<Record<string, any>>(),
  relevanciaPeso: real("relevancia_peso").default(1.0),
  expiraEm: timestamp("expira_em", { withTimezone: true }),
  ativa: boolean("ativa").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const validacoesHumanasAgenteTable = pgTable("validacoes_humanas_agente", {
  id: serial("id").primaryKey(),
  execucaoAgenteId: integer("execucao_agente_id").references(() => execucoesAgenteTable.id).notNull(),
  agenteClinicaId: integer("agente_clinica_id").references(() => agentesClinicaTable.id).notNull(),
  tipoValidacao: varchar("tipo_validacao", { length: 80 }).notNull(),
  perguntaAoHumano: text("pergunta_ao_humano"),
  respostaHumano: text("resposta_humano"),
  validadoPorId: integer("validado_por_id"),
  statusValidacao: varchar("status_validacao", { length: 40 }).notNull().default("aguardando"),
  solicitadoEm: timestamp("solicitado_em", { withTimezone: true }).defaultNow(),
  respondidoEm: timestamp("respondido_em", { withTimezone: true }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const eventosSaidaOperacionaisTable = pgTable("eventos_saida_operacionais", {
  id: serial("id").primaryKey(),
  codigoEvento: varchar("codigo_evento", { length: 80 }).notNull(),
  entidadeTipo: varchar("entidade_tipo", { length: 80 }).notNull(),
  entidadeId: integer("entidade_id"),
  clinicaId: integer("clinica_id").references(() => unidadesTable.id),
  payloadJson: jsonb("payload_json").$type<Record<string, any>>(),
  processado: boolean("processado").notNull().default(false),
  processadoEm: timestamp("processado_em", { withTimezone: true }),
  erro: text("erro"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const narrativasAgenteTable = pgTable("narrativas_agente", {
  id: serial("id").primaryKey(),
  catalogoAgenteId: integer("catalogo_agente_id").references(() => catalogoAgentesTable.id).notNull(),
  titulo: varchar("titulo", { length: 200 }).notNull(),
  tag: varchar("tag", { length: 80 }).notNull(),
  corTag: varchar("cor_tag", { length: 20 }),
  ordem: integer("ordem").notNull().default(0),
  mensagens: jsonb("mensagens").$type<Array<{
    lado: "paciente" | "agente";
    texto: string;
  }>>().notNull(),
  ativa: boolean("ativa").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const agentesPersonalidadeTable = pgTable("agentes_personalidade", {
  id: serial("id").primaryKey(),
  agenteClinicaId: integer("agente_clinica_id").references(() => agentesClinicaTable.id).notNull().unique(),
  formalidade: integer("formalidade").notNull().default(5),
  empatia: integer("empatia").notNull().default(5),
  autoridade: integer("autoridade").notNull().default(5),
  objetividade: integer("objetividade").notNull().default(5),
  calorHumano: integer("calor_humano").notNull().default(5),
  proatividade: integer("proatividade").notNull().default(5),
  paciencia: integer("paciencia").notNull().default(5),
  tomGeral: text("tom_geral"),
  pronomeTratamento: varchar("pronome_tratamento", { length: 100 }).notNull().default("Sr(a)."),
  exemploFraseTipica: text("exemplo_frase_tipica"),
  personalidadeResumo: text("personalidade_resumo"),
  generoVoz: varchar("genero_voz", { length: 30 }).notNull().default("neutro"),
  estiloConversacao: varchar("estilo_conversacao", { length: 50 }).notNull().default("profissional"),
  nivelHumanizacao: integer("nivel_humanizacao").notNull().default(5),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const agentesMotorEscritaTable = pgTable("agentes_motor_escrita", {
  id: serial("id").primaryKey(),
  agenteClinicaId: integer("agente_clinica_id").references(() => agentesClinicaTable.id).notNull().unique(),
  templateAbertura: text("template_abertura"),
  templateContexto: text("template_contexto"),
  templateInformacao: text("template_informacao"),
  templateOrientacao: text("template_orientacao"),
  templateAcao: text("template_acao"),
  templateEncerramento: text("template_encerramento"),
  maxLinhasPorBloco: integer("max_linhas_por_bloco").notNull().default(3),
  obrigarQuebraLinha: boolean("obrigar_quebra_linha").notNull().default(true),
  obrigarTopicos: boolean("obrigar_topicos").notNull().default(true),
  obrigarEmojiSemantico: boolean("obrigar_emoji_semantico").notNull().default(true),
  maxCaracteresMensagem: integer("max_caracteres_mensagem").notNull().default(500),
  espacamentoEntreSecoes: boolean("espacamento_entre_secoes").notNull().default(true),
  proibidoTextoCorrido: boolean("proibido_texto_corrido").notNull().default(true),
  proibidoLinguagemRobotica: boolean("proibido_linguagem_robotica").notNull().default(true),
  estruturaObrigatoria: jsonb("estrutura_obrigatoria").$type<string[]>().default(["ABERTURA", "CONTEXTO", "INFORMAÇÃO", "ORIENTAÇÃO", "AÇÃO"]),
  estiloVisual: text("estilo_visual"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCatalogoAgenteSchema = createInsertSchema(catalogoAgentesTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export const insertModuloClinicaSchema = createInsertSchema(modulosClinicaTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export const insertAgenteClinicaSchema = createInsertSchema(agentesClinicaTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export const insertCapacidadesAgenteSchema = createInsertSchema(capacidadesAgenteClinicaTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export const insertExecucaoAgenteSchema = createInsertSchema(execucoesAgenteTable).omit({ id: true, criadoEm: true });
export const insertAcaoAgenteSchema = createInsertSchema(acoesAgenteTable).omit({ id: true, criadoEm: true });
export const insertMemoriaContextualSchema = createInsertSchema(memoriasContextuaisAgenteTable).omit({ id: true, criadoEm: true });
export const insertValidacaoHumanaSchema = createInsertSchema(validacoesHumanasAgenteTable).omit({ id: true, criadoEm: true });
export const insertEventoSaidaSchema = createInsertSchema(eventosSaidaOperacionaisTable).omit({ id: true, criadoEm: true });
export const insertNarrativaAgenteSchema = createInsertSchema(narrativasAgenteTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export const insertPersonalidadeSchema = createInsertSchema(agentesPersonalidadeTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export const insertMotorEscritaSchema = createInsertSchema(agentesMotorEscritaTable).omit({ id: true, criadoEm: true, atualizadoEm: true });

export type CatalogoAgente = typeof catalogoAgentesTable.$inferSelect;
export type ModuloClinica = typeof modulosClinicaTable.$inferSelect;
export type AgenteClinica = typeof agentesClinicaTable.$inferSelect;
export type CapacidadesAgenteClinica = typeof capacidadesAgenteClinicaTable.$inferSelect;
export type ExecucaoAgente = typeof execucoesAgenteTable.$inferSelect;
export type AcaoAgente = typeof acoesAgenteTable.$inferSelect;
export type MemoriaContextualAgente = typeof memoriasContextuaisAgenteTable.$inferSelect;
export type ValidacaoHumanaAgente = typeof validacoesHumanasAgenteTable.$inferSelect;
export type EventoSaidaOperacional = typeof eventosSaidaOperacionaisTable.$inferSelect;
export type NarrativaAgente = typeof narrativasAgenteTable.$inferSelect;
export type AgentesPersonalidade = typeof agentesPersonalidadeTable.$inferSelect;
export type AgentesMotorEscrita = typeof agentesMotorEscritaTable.$inferSelect;
