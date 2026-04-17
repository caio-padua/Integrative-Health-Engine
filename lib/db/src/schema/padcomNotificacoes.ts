import { pgTable, varchar, timestamp, text, jsonb, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

/**
 * PADCOM Notificações (Onda 3) — Mensagens internas para a equipe da clínica.
 *
 * Disparadas automaticamente por:
 *  - finalizar sessão (banda crítica → notifica enfermeira/médico)
 *  - cascata pendente há > 24h (notifica preceptor)
 *  - agendamento se aproximando (notifica recepção)
 *
 * canal: in_app | email | whatsapp | trello   (in_app = único nativo; outros via integração futura)
 * status: pendente | enviada | lida | falha
 * severidade: info | aviso | critico
 *
 * destinatarioPapel: enfermeira | medico | preceptor | recepcao | farmaceutico
 *   (papel ao invés de userId concreto para roteamento dinâmico)
 */
export const padcomNotificacoesTable = pgTable("padcom_notificacoes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clinicaId: varchar("clinica_id"),
  sessaoId: varchar("sessao_id"),
  agendamentoId: varchar("agendamento_id"),
  destinatarioPapel: varchar("destinatario_papel", { length: 30 }).notNull(),
  destinatarioId: varchar("destinatario_id"),
  canal: varchar("canal", { length: 20 }).notNull().default("in_app"),
  severidade: varchar("severidade", { length: 20 }).notNull().default("info"),
  titulo: varchar("titulo", { length: 200 }).notNull(),
  mensagem: text("mensagem").notNull(),
  metadata: jsonb("metadata"),
  status: varchar("status", { length: 20 }).notNull().default("pendente"),
  lida: boolean("lida").notNull().default(false),
  enviadoEm: timestamp("enviado_em"),
  lidoEm: timestamp("lido_em"),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
});

export const insertPadcomNotificacaoSchema = createInsertSchema(padcomNotificacoesTable);
export const selectPadcomNotificacaoSchema = createSelectSchema(padcomNotificacoesTable);
