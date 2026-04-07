import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pacientesTable } from "./pacientes";

export const anamnesesTable = pgTable("anamneses", {
  id: serial("id").primaryKey(),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  status: text("status", { enum: ["pendente", "em_andamento", "concluida", "validada"] }).notNull().default("pendente"),
  respostasClincias: jsonb("respostas_clincias"),
  respostasFinanceiras: jsonb("respostas_financeiras"),
  respostasPreferencias: jsonb("respostas_preferencias"),
  sinaisSemanticos: text("sinais_semanticos").array(),
  motorAtivadoEm: timestamp("motor_ativado_em", { withTimezone: true }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAnamneseSchema = createInsertSchema(anamnesesTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertAnamnese = z.infer<typeof insertAnamneseSchema>;
export type Anamnese = typeof anamnesesTable.$inferSelect;
