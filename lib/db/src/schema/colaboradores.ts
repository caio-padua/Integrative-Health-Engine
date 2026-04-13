import { pgTable, serial, text, integer, boolean, timestamp, varchar, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { unidadesTable } from "./unidades";

export const teamPositionsTable = pgTable("team_positions", {
  id: serial("id").primaryKey(),
  unidadeId: integer("unidade_id").references(() => unidadesTable.id),
  cargo: varchar("cargo", { length: 100 }).notNull(),
  indice: varchar("indice", { length: 20 }).notNull(),
  codigoCompleto: varchar("codigo_completo", { length: 50 }).notNull(),
  modalidade: varchar("modalidade", { length: 50 }).notNull().default("presencial"),
  slaDefault: varchar("sla_default", { length: 100 }),
  reportaA: varchar("reporta_a", { length: 50 }),
  quandoReporta: text("quando_reporta"),
  descricaoFuncao: text("descricao_funcao"),
  objetivos: text("objetivos"),
  metasPrincipais: jsonb("metas_principais").$type<string[]>(),
  direitos: jsonb("direitos").$type<string[]>(),
  deveres: jsonb("deveres").$type<string[]>(),
  advertenciaTriggers: jsonb("advertencia_triggers").$type<string[]>(),
  demissaoTriggers: jsonb("demissao_triggers").$type<string[]>(),
  justaCausaTriggers: jsonb("justa_causa_triggers").$type<string[]>(),
  permissoes: jsonb("permissoes").$type<Record<string, boolean>>(),
  podeSupervisionarOutros: boolean("pode_supervisionar_outros").default(false),
  podeAuditarCards: boolean("pode_auditar_cards").default(false),
  podeAprovarDespesas: boolean("pode_aprovar_despesas").default(false),
  podeEditarProtocolos: boolean("pode_editar_protocolos").default(false),
  podeAcessarFinanceiro: boolean("pode_acessar_financeiro").default(false),
  podeVerOuvidoria: boolean("pode_ver_ouvidoria").default(false),
  ativa: boolean("ativa").default(true),
  criadoEm: timestamp("criado_em").defaultNow(),
  atualizadoEm: timestamp("atualizado_em").defaultNow(),
});

export const teamMembersTable = pgTable("team_members", {
  id: serial("id").primaryKey(),
  posicaoId: integer("posicao_id").references(() => teamPositionsTable.id).notNull(),
  unidadeId: integer("unidade_id").references(() => unidadesTable.id).notNull(),
  nomeCompleto: varchar("nome_completo", { length: 200 }).notNull(),
  emailFuncional: varchar("email_funcional", { length: 200 }),
  telefone: varchar("telefone", { length: 30 }),
  cpf: varchar("cpf", { length: 14 }),
  dataAdmissao: varchar("data_admissao", { length: 10 }),
  dataDemissao: varchar("data_demissao", { length: 10 }),
  statusAtivo: boolean("status_ativo").default(true),
  fotoUrl: text("foto_url"),
  observacoes: text("observacoes"),
  criadoEm: timestamp("criado_em").defaultNow(),
  atualizadoEm: timestamp("atualizado_em").defaultNow(),
});

export const taskAttemptsTable = pgTable("task_attempts", {
  id: serial("id").primaryKey(),
  taskCardId: integer("task_card_id").notNull(),
  membroId: integer("membro_id").references(() => teamMembersTable.id),
  tentativaNumero: integer("tentativa_numero").notNull().default(1),
  canal: varchar("canal", { length: 50 }).notNull(),
  resultado: varchar("resultado", { length: 100 }).notNull(),
  observacoes: text("observacoes"),
  criadoEm: timestamp("criado_em").defaultNow(),
});

export const taskValidationsTable = pgTable("task_validations", {
  id: serial("id").primaryKey(),
  taskCardId: integer("task_card_id").notNull(),
  validadorId: integer("validador_id").references(() => teamMembersTable.id),
  tipoValidacao: varchar("tipo_validacao", { length: 50 }).notNull(),
  resultado: varchar("resultado", { length: 50 }).notNull(),
  observacoes: text("observacoes"),
  contatouPaciente: boolean("contatou_paciente").default(false),
  notaPaciente: integer("nota_paciente"),
  criadoEm: timestamp("criado_em").defaultNow(),
});

export const commissionEventsTable = pgTable("commission_events", {
  id: serial("id").primaryKey(),
  membroId: integer("membro_id").references(() => teamMembersTable.id).notNull(),
  unidadeId: integer("unidade_id").references(() => unidadesTable.id),
  categoria: varchar("categoria", { length: 100 }).notNull(),
  valorBase: real("valor_base").notNull(),
  multiplicador: real("multiplicador").notNull().default(1.0),
  valorFinal: real("valor_final").notNull(),
  taskCardId: integer("task_card_id"),
  validacaoId: integer("validacao_id").references(() => taskValidationsTable.id),
  bloqueadoPor: text("bloqueado_por"),
  status: varchar("status", { length: 30 }).notNull().default("pendente"),
  periodoReferencia: varchar("periodo_referencia", { length: 20 }),
  criadoEm: timestamp("criado_em").defaultNow(),
});

export const disciplinaryEventsTable = pgTable("disciplinary_events", {
  id: serial("id").primaryKey(),
  membroId: integer("membro_id").references(() => teamMembersTable.id).notNull(),
  unidadeId: integer("unidade_id").references(() => unidadesTable.id),
  nivel: varchar("nivel", { length: 50 }).notNull(),
  fundamentacaoClt: varchar("fundamentacao_clt", { length: 200 }),
  motivo: text("motivo").notNull(),
  triggers: jsonb("triggers").$type<string[]>(),
  validadeDias: integer("validade_dias"),
  dataExpiracao: varchar("data_expiracao", { length: 10 }),
  aplicadoPorId: integer("aplicado_por_id").references(() => teamMembersTable.id),
  status: varchar("status", { length: 30 }).notNull().default("ativa"),
  observacoes: text("observacoes"),
  criadoEm: timestamp("criado_em").defaultNow(),
});

export const agentActionsTable = pgTable("agent_actions", {
  id: serial("id").primaryKey(),
  agentType: varchar("agent_type", { length: 50 }).notNull(),
  actionType: varchar("action_type", { length: 100 }).notNull(),
  targetTable: varchar("target_table", { length: 100 }),
  targetId: integer("target_id"),
  unidadeId: integer("unidade_id").references(() => unidadesTable.id),
  membroId: integer("membro_id").references(() => teamMembersTable.id),
  inputData: jsonb("input_data").$type<Record<string, any>>(),
  outputData: jsonb("output_data").$type<Record<string, any>>(),
  status: varchar("status", { length: 30 }).notNull().default("pendente"),
  prioridade: varchar("prioridade", { length: 20 }).notNull().default("normal"),
  erro: text("erro"),
  tempoExecucaoMs: integer("tempo_execucao_ms"),
  criadoEm: timestamp("criado_em").defaultNow(),
  executadoEm: timestamp("executado_em"),
});

export const slaMonitoringTable = pgTable("sla_monitoring", {
  id: serial("id").primaryKey(),
  membroId: integer("membro_id").references(() => teamMembersTable.id).notNull(),
  unidadeId: integer("unidade_id").references(() => unidadesTable.id),
  tipoSla: varchar("tipo_sla", { length: 100 }).notNull(),
  prazoHoras: integer("prazo_horas").notNull(),
  inicioEm: timestamp("inicio_em").defaultNow(),
  venceEm: timestamp("vence_em").notNull(),
  resolvidoEm: timestamp("resolvido_em"),
  status: varchar("status", { length: 30 }).notNull().default("ativo"),
  taskCardId: integer("task_card_id"),
  escalonadoPara: varchar("escalonado_para", { length: 50 }),
  alertaAmareloEnviado: boolean("alerta_amarelo_enviado").default(false),
  alertaVermelhoEnviado: boolean("alerta_vermelho_enviado").default(false),
  criadoEm: timestamp("criado_em").defaultNow(),
});

export const insertTeamPositionSchema = createInsertSchema(teamPositionsTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export const insertTeamMemberSchema = createInsertSchema(teamMembersTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export const insertTaskAttemptSchema = createInsertSchema(taskAttemptsTable).omit({ id: true, criadoEm: true });
export const insertTaskValidationSchema = createInsertSchema(taskValidationsTable).omit({ id: true, criadoEm: true });
export const insertCommissionEventSchema = createInsertSchema(commissionEventsTable).omit({ id: true, criadoEm: true });
export const insertDisciplinaryEventSchema = createInsertSchema(disciplinaryEventsTable).omit({ id: true, criadoEm: true });
export const insertAgentActionSchema = createInsertSchema(agentActionsTable).omit({ id: true, criadoEm: true });
export const insertSlaMonitoringSchema = createInsertSchema(slaMonitoringTable).omit({ id: true, criadoEm: true });

export type TeamPosition = typeof teamPositionsTable.$inferSelect;
export type TeamMember = typeof teamMembersTable.$inferSelect;
export type TaskAttempt = typeof taskAttemptsTable.$inferSelect;
export type TaskValidation = typeof taskValidationsTable.$inferSelect;
export type CommissionEvent = typeof commissionEventsTable.$inferSelect;
export type DisciplinaryEvent = typeof disciplinaryEventsTable.$inferSelect;
export type AgentAction = typeof agentActionsTable.$inferSelect;
export type SlaMonitoring = typeof slaMonitoringTable.$inferSelect;
