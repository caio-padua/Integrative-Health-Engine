import { pgTable, serial, text, integer, timestamp, boolean, uniqueIndex, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usuariosTable } from "./usuarios";
import { unidadesTable } from "./unidades";
import { pacientesTable } from "./pacientes";

export const subAgendasTable = pgTable("sub_agendas", {
  id: serial("id").primaryKey(),
  unidadeId: integer("unidade_id").notNull().references(() => unidadesTable.id),
  nome: text("nome").notNull(),
  cor: text("cor").notNull().default("#3B82F6"),
  emoji: text("emoji"),
  tipo: text("tipo").notNull().default("medico"),
  profissionalId: integer("profissional_id").references(() => usuariosTable.id),
  modalidade: text("modalidade").notNull().default("presencial"),
  salaOuLocal: text("sala_ou_local"),
  descricao: text("descricao"),
  googleCalendarId: text("google_calendar_id"),
  certificadoDigitalNome: text("certificado_digital_nome"),
  certificadoDigitalCpfCnpj: text("certificado_digital_cpf_cnpj"),
  certificadoDigitalSenha: text("certificado_digital_senha"),
  certificadoDigitalValidade: text("certificado_digital_validade"),
  certificadoDigitalArquivoUrl: text("certificado_digital_arquivo_url"),
  requerCertificadoParaPrescricao: boolean("requer_certificado_para_prescricao").notNull().default(false),
  requerCertificadoParaProtocolo: boolean("requer_certificado_para_protocolo").notNull().default(false),
  ativa: boolean("ativa").notNull().default(true),
  ordem: integer("ordem").notNull().default(0),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSubAgendaSchema = createInsertSchema(subAgendasTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertSubAgenda = z.infer<typeof insertSubAgendaSchema>;
export type SubAgenda = typeof subAgendasTable.$inferSelect;

export const availabilityRulesTable = pgTable("availability_rules", {
  id: serial("id").primaryKey(),
  profissionalId: integer("profissional_id").notNull().references(() => usuariosTable.id),
  unidadeId: integer("unidade_id").notNull().references(() => unidadesTable.id),
  subAgendaId: integer("sub_agenda_id").references(() => subAgendasTable.id),
  diaSemana: integer("dia_semana").notNull(),
  horaInicio: text("hora_inicio").notNull(),
  horaFim: text("hora_fim").notNull(),
  duracaoSlotMin: integer("duracao_slot_min").notNull().default(30),
  tipoProcedimento: text("tipo_procedimento").notNull().default("CONSULTA_30_PRESENCIAL"),
  recorrencia: text("recorrencia").notNull().default("semanal"),
  ativa: boolean("ativa").notNull().default(true),
  validaDeAte: text("valida_de_ate"),
  observacoes: text("observacoes"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const agendaSlotsTable = pgTable("agenda_slots", {
  id: serial("id").primaryKey(),
  profissionalId: integer("profissional_id").notNull().references(() => usuariosTable.id),
  unidadeId: integer("unidade_id").notNull().references(() => unidadesTable.id),
  subAgendaId: integer("sub_agenda_id").references(() => subAgendasTable.id),
  availabilityRuleId: integer("availability_rule_id").references(() => availabilityRulesTable.id),
  data: text("data").notNull(),
  horaInicio: text("hora_inicio").notNull(),
  horaFim: text("hora_fim").notNull(),
  duracaoMin: integer("duracao_min").notNull(),
  tipoProcedimento: text("tipo_procedimento").notNull(),
  status: text("status").notNull().default("disponivel"),
  bloqueadoMotivo: text("bloqueado_motivo"),
  turno: text("turno").default("manha"),
  liberado: boolean("liberado").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("uq_slot_profissional_horario").on(table.profissionalId, table.data, table.horaInicio, table.horaFim),
]);

export const slotLocksTable = pgTable("slot_locks", {
  id: serial("id").primaryKey(),
  slotId: integer("slot_id").notNull().references(() => agendaSlotsTable.id),
  lockedBy: text("locked_by").notNull(),
  lockedAt: timestamp("locked_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  released: boolean("released").notNull().default(false),
});

export const appointmentsTable = pgTable("appointments", {
  id: serial("id").primaryKey(),
  slotId: integer("slot_id").notNull().references(() => agendaSlotsTable.id),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  profissionalId: integer("profissional_id").notNull().references(() => usuariosTable.id),
  unidadeId: integer("unidade_id").notNull().references(() => unidadesTable.id),
  sessaoId: integer("sessao_id"),
  tipoProcedimento: text("tipo_procedimento").notNull(),
  data: text("data").notNull(),
  horaInicio: text("hora_inicio").notNull(),
  horaFim: text("hora_fim").notNull(),
  duracaoMin: integer("duracao_min").notNull(),
  status: text("status").notNull().default("agendado"),
  googleEventId: text("google_event_id"),
  googleCalendarId: text("google_calendar_id"),
  observacoes: text("observacoes"),
  origemAgendamento: text("origem_agendamento").notNull().default("sistema"),
  reagendamentoAutomaticoDeId: integer("reagendamento_automatico_de_id"),
  motivoFalta: text("motivo_falta"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const appointmentReschedulesTable = pgTable("appointment_reschedules", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").notNull().references(() => appointmentsTable.id),
  slotAnteriorId: integer("slot_anterior_id").references(() => agendaSlotsTable.id),
  slotNovoId: integer("slot_novo_id").references(() => agendaSlotsTable.id),
  dataAnterior: text("data_anterior").notNull(),
  horaAnterior: text("hora_anterior").notNull(),
  dataNova: text("data_nova").notNull(),
  horaNova: text("hora_nova").notNull(),
  motivo: text("motivo"),
  reagendadoPorId: integer("reagendado_por_id").references(() => usuariosTable.id),
  origemReagendamento: text("origem_reagendamento").notNull().default("sistema"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const agendaAuditEventsTable = pgTable("agenda_audit_events", {
  id: serial("id").primaryKey(),
  entidadeTipo: text("entidade_tipo").notNull(),
  entidadeId: integer("entidade_id").notNull(),
  acao: text("acao").notNull(),
  detalhes: jsonb("detalhes"),
  usuarioId: integer("usuario_id").references(() => usuariosTable.id),
  ipOrigem: text("ip_origem"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const agendaBlocksTable = pgTable("agenda_blocks", {
  id: serial("id").primaryKey(),
  profissionalId: integer("profissional_id").notNull().references(() => usuariosTable.id),
  unidadeId: integer("unidade_id").references(() => unidadesTable.id),
  data: text("data").notNull(),
  horaInicio: text("hora_inicio"),
  horaFim: text("hora_fim"),
  diaTodo: boolean("dia_todo").notNull().default(false),
  motivo: text("motivo").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAvailabilityRuleSchema = createInsertSchema(availabilityRulesTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertAvailabilityRule = z.infer<typeof insertAvailabilityRuleSchema>;
export type AvailabilityRule = typeof availabilityRulesTable.$inferSelect;

export const insertAgendaSlotSchema = createInsertSchema(agendaSlotsTable).omit({ id: true, criadoEm: true });
export type InsertAgendaSlot = z.infer<typeof insertAgendaSlotSchema>;
export type AgendaSlot = typeof agendaSlotsTable.$inferSelect;

export const insertAppointmentSchema = createInsertSchema(appointmentsTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointmentsTable.$inferSelect;

export const insertAppointmentRescheduleSchema = createInsertSchema(appointmentReschedulesTable).omit({ id: true, criadoEm: true });
export type InsertAppointmentReschedule = z.infer<typeof insertAppointmentRescheduleSchema>;

export const insertAgendaAuditEventSchema = createInsertSchema(agendaAuditEventsTable).omit({ id: true, criadoEm: true });
export type InsertAgendaAuditEvent = z.infer<typeof insertAgendaAuditEventSchema>;

export const insertAgendaBlockSchema = createInsertSchema(agendaBlocksTable).omit({ id: true, criadoEm: true });
export type InsertAgendaBlock = z.infer<typeof insertAgendaBlockSchema>;

export const smartReleaseConfigTable = pgTable("smart_release_config", {
  id: serial("id").primaryKey(),
  unidadeId: integer("unidade_id").notNull().references(() => unidadesTable.id),
  profissionalId: integer("profissional_id").references(() => usuariosTable.id),
  turnoManhaInicio: text("turno_manha_inicio").notNull().default("08:00"),
  turnoManhaFim: text("turno_manha_fim").notNull().default("12:00"),
  turnoTardeInicio: text("turno_tarde_inicio").notNull().default("13:00"),
  turnoTardeFim: text("turno_tarde_fim").notNull().default("18:00"),
  limiarLiberacaoPercent: integer("limiar_liberacao_percent").notNull().default(60),
  ativa: boolean("ativa").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSmartReleaseConfigSchema = createInsertSchema(smartReleaseConfigTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertSmartReleaseConfig = z.infer<typeof insertSmartReleaseConfigSchema>;
export type SmartReleaseConfig = typeof smartReleaseConfigTable.$inferSelect;

export const TIPOS_PROCEDIMENTO = {
  CONSULTA_30_PRESENCIAL: { label: "Consulta Presencial", duracaoMin: 30, cor: "#3B82F6" },
  CONSULTA_30_ONLINE: { label: "Consulta Online", duracaoMin: 30, cor: "#8B5CF6" },
  CONSULTA_60_PRESENCIAL: { label: "Consulta Extensa", duracaoMin: 60, cor: "#2563EB" },
  RETORNO_15_PRESENCIAL: { label: "Retorno Rapido", duracaoMin: 15, cor: "#06B6D4" },
  INFUSAO_CURTA_60_PRESENCIAL: { label: "Infusao Curta (1h)", duracaoMin: 60, cor: "#10B981" },
  INFUSAO_MEDIA_120_PRESENCIAL: { label: "Infusao Media (2h)", duracaoMin: 120, cor: "#F59E0B" },
  INFUSAO_LONGA_180_PRESENCIAL: { label: "Infusao Longa (3h)", duracaoMin: 180, cor: "#EF4444" },
  INFUSAO_EXTRA_240_PRESENCIAL: { label: "Infusao Extra (4h)", duracaoMin: 240, cor: "#DC2626" },
  IMPLANTE_120_PRESENCIAL: { label: "Implante", duracaoMin: 120, cor: "#7C3AED" },
  IM_15_PRESENCIAL: { label: "Injecao IM", duracaoMin: 15, cor: "#14B8A6" },
  AVALIACAO_ENF_30_PRESENCIAL: { label: "Avaliacao Enfermagem", duracaoMin: 30, cor: "#F97316" },
  EXAME_30_PRESENCIAL: { label: "Coleta Exame", duracaoMin: 30, cor: "#64748B" },
} as const;

export type TipoProcedimento = keyof typeof TIPOS_PROCEDIMENTO;
