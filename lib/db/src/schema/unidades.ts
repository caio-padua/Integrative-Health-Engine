import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
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
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUnidadeSchema = createInsertSchema(unidadesTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertUnidade = z.infer<typeof insertUnidadeSchema>;
export type Unidade = typeof unidadesTable.$inferSelect;
