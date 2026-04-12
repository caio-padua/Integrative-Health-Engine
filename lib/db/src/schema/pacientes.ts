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
  cep: text("cep"),
  endereco: text("endereco"),
  complemento: text("complemento"),
  bairro: text("bairro"),
  cidade: text("cidade"),
  estado: text("estado"),
  pais: text("pais").default("Brasil"),
  unidadeId: integer("unidade_id").notNull().references(() => unidadesTable.id),
  statusAtivo: boolean("status_ativo").notNull().default(true),
  planoAcompanhamento: text("plano_acompanhamento", { enum: ["diamante", "ouro", "prata", "cobre"] }).default("cobre"),
  googleDriveFolderId: text("google_drive_folder_id"),
  senhaValidacao: text("senha_validacao"),
  fotoRosto: text("foto_rosto"),
  fotoCorpo: text("foto_corpo"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPacienteSchema = createInsertSchema(pacientesTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertPaciente = z.infer<typeof insertPacienteSchema>;
export type Paciente = typeof pacientesTable.$inferSelect;
