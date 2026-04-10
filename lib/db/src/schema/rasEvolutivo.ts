import { pgTable, serial, text, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sessoesTable } from "./sessoes";
import { pacientesTable } from "./pacientes";

export const rasEvolutivoTable = pgTable("ras_evolutivo", {
  id: serial("id").primaryKey(),
  protocoloId: integer("protocolo_id"),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  sessaoId: integer("sessao_id").references(() => sessoesTable.id),
  percentualProgresso: integer("percentual_progresso").notNull().default(0),
  nivelAderencia: text("nivel_aderencia"),
  tolerancia: text("tolerancia"),
  observacaoSemanal: text("observacao_semanal"),
  historicoSessoes: jsonb("historico_sessoes").default([]),
  pdfUrl: text("pdf_url"),
  drivePdfId: text("drive_pdf_id"),
  isAntepenultima: boolean("is_antepenultima").notNull().default(false),
  isUltima: boolean("is_ultima").notNull().default(false),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRasEvolutivoSchema = createInsertSchema(rasEvolutivoTable).omit({ id: true, criadoEm: true });
export type InsertRasEvolutivo = z.infer<typeof insertRasEvolutivoSchema>;
export type RasEvolutivo = typeof rasEvolutivoTable.$inferSelect;
