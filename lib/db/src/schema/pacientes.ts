import { pgTable, serial, text, boolean, integer, timestamp, date, numeric } from "drizzle-orm/pg-core";
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
  // Bug #2 (21/mai/2026): coluna `numero_endereco` JÁ EXISTE no banco
  // (criada por wave anterior, descoberta na auditoria information_schema
  // de 21/mai). Só faltava expor no schema Drizzle pra TypeScript +
  // formulário usarem. Nenhuma migration necessária. Antes vinha tudo
  // concatenado em `endereco` ("Rua, número") porque ViaCEP não retorna
  // número e o campo separado existia mas não estava plugado.
  numeroEndereco: text("numero_endereco"),
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
  senhaPortal: text("senha_portal"),
  fotoRosto: text("foto_rosto"),
  fotoCorpo: text("foto_corpo"),
  genero: text("genero", { enum: ["masculino", "feminino", "outro", "nao_informado"] }).notNull().default("nao_informado"),
  alturaCm: integer("altura_cm"),
  pesoKg: numeric("peso_kg", { precision: 5, scale: 2 }),
  alergias: text("alergias"),
  condicoesClinicas: text("condicoes_clinicas"),
  medicamentosContinuos: text("medicamentos_continuos"),
  gestante: boolean("gestante").notNull().default(false),
  fototipoFitzpatrick: text("fototipo_fitzpatrick", { enum: ["I", "II", "III", "IV", "V", "VI"] }),
  atividadeFisica: text("atividade_fisica", { enum: ["sedentario", "leve", "moderado", "intenso", "atleta"] }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPacienteSchema = createInsertSchema(pacientesTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertPaciente = z.infer<typeof insertPacienteSchema>;
export type Paciente = typeof pacientesTable.$inferSelect;
