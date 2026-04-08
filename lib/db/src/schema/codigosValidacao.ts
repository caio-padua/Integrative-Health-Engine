import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sessoesTable } from "./sessoes";
import { pacientesTable } from "./pacientes";

export const codigosValidacaoTable = pgTable("codigos_validacao", {
  id: serial("id").primaryKey(),
  sessaoId: integer("sessao_id").notNull().references(() => sessoesTable.id),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  codigo: text("codigo").notNull(),
  expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
  usado: boolean("usado").notNull().default(false),
  usadoEm: timestamp("usado_em", { withTimezone: true }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCodigoValidacaoSchema = createInsertSchema(codigosValidacaoTable).omit({ id: true, criadoEm: true });
export type InsertCodigoValidacao = z.infer<typeof insertCodigoValidacaoSchema>;
export type CodigoValidacao = typeof codigosValidacaoTable.$inferSelect;
