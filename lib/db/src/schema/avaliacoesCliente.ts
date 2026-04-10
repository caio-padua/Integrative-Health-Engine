import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sessoesTable } from "./sessoes";
import { pacientesTable } from "./pacientes";
import { usuariosTable } from "./usuarios";

export const avaliacoesClienteTable = pgTable("avaliacoes_cliente", {
  id: serial("id").primaryKey(),
  sessaoId: integer("sessao_id").references(() => sessoesTable.id),
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  profissionalId: integer("profissional_id").references(() => usuariosTable.id),
  nota: integer("nota").notNull(),
  comentarios: text("comentarios"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAvaliacaoClienteSchema = createInsertSchema(avaliacoesClienteTable).omit({ id: true, criadoEm: true });
export type InsertAvaliacaoCliente = z.infer<typeof insertAvaliacaoClienteSchema>;
export type AvaliacaoCliente = typeof avaliacoesClienteTable.$inferSelect;
