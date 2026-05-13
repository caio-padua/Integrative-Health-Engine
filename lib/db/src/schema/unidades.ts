import { pgTable, serial, text, boolean, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { consultoriasTable } from "./consultorias";

export const unidadesTable = pgTable("unidades", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  endereco: text("endereco"),
  bairro: text("bairro"),
  cidade: text("cidade"),
  estado: text("estado"),
  cep: text("cep"),
  cnpj: text("cnpj"),
  telefone: text("telefone"),
  tipo: text("tipo").notNull().default("clinic"),
  consultoriaId: integer("consultoria_id").references(() => consultoriasTable.id),
  codigoInterno: text("codigo_interno"),
  googleCalendarId: text("google_calendar_id"),
  googleCalendarEmail: text("google_calendar_email"),
  nick: text("nick"),
  emailGeral: text("email_geral"),
  emailAgenda: text("email_agenda"),
  emailEnfermagem01: text("email_enfermagem01"),
  emailEnfermagem02: text("email_enfermagem02"),
  emailConsultor01: text("email_consultor01"),
  emailConsultor02: text("email_consultor02"),
  emailSupervisor01: text("email_supervisor01"),
  emailSupervisor02: text("email_supervisor02"),
  emailFinanceiro01: text("email_financeiro01"),
  emailOuvidoria01: text("email_ouvidoria01"),
  cor: text("cor").notNull().default("#3B82F6"),
  ativa: boolean("ativa").notNull().default(true),
  timezone: text("timezone").notNull().default("America/Sao_Paulo"),
  // Task #12 (Migration 050) — janelas padrao de envio de lembrete por unidade.
  // Usados como fallback pelo prescricaoLembreteService quando a prescricao
  // nao define horariosEnvio proprios. Tolerancia em minutos define quanto
  // tempo APOS o horario alvo o worker ainda dispara o lembrete (para
  // recuperar ticks perdidos sem adiantar o envio).
  lembreteHorariosPadrao: jsonb("lembrete_horarios_padrao").notNull().$type<string[]>().default(["07:00", "13:00", "20:00"]),
  lembreteToleranciaMinutos: integer("lembrete_tolerancia_minutos").notNull().default(5),
  // Wave 13 F1 (Migration 044) — kill-switch lifecycle
  status: text("status", {
    enum: ["ATIVO", "SUSPENSO", "EXCLUIDO_PENDENTE", "EXCLUIDO"],
  }).notNull().default("ATIVO"),
  suspensoEm: timestamp("suspenso_em", { withTimezone: true }),
  suspensoPorUsuarioId: integer("suspenso_por_usuario_id"),
  suspensaoMotivo: text("suspensao_motivo"),
  exclusaoCarenciaAte: timestamp("exclusao_carencia_ate", { withTimezone: true }),
  lgpdExportUrl: text("lgpd_export_url"),
  lgpdExportEm: timestamp("lgpd_export_em", { withTimezone: true }),
  // Task #11 — Janelas padrao de envio de lembretes de prescricao por unidade.
  // Lista de horarios HH:MM herdada por prescricoes que nao definirem
  // `horariosEnvio` proprio. Tolerancia em minutos eh quanto tempo apos o
  // horario alvo o worker ainda pode disparar o lembrete (default 5 min,
  // que mantem a constante historica do prescricaoLembreteService).
  lembreteHorariosPadrao: jsonb("lembrete_horarios_padrao").notNull().$type<string[]>().default([]),
  lembreteToleranciaMinutos: integer("lembrete_tolerancia_minutos").notNull().default(5),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUnidadeSchema = createInsertSchema(unidadesTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertUnidade = z.infer<typeof insertUnidadeSchema>;
export type Unidade = typeof unidadesTable.$inferSelect;
