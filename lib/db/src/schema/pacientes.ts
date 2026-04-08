import { pgTable, serial, text, boolean, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { unidadesTable } from "./unidades";

export const pacientesTable = pgTable("pacientes", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  cpf: text("cpf"),
  dataNascimento: date("data_nascimento"),
  telefone: text("telefone").notNull(),
  email: text("email"),
  endereco: text("endereco"),
  cep: text("cep"),
  unidadeId: integer("unidade_id").notNull().references(() => unidadesTable.id),
  statusAtivo: boolean("status_ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPacienteSchema = createInsertSchema(pacientesTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertPaciente = z.infer<typeof insertPacienteSchema>;
export type Paciente = typeof pacientesTable.$inferSelect;
