import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { unidadesTable } from "./unidades";
import { consultoriasTable } from "./consultorias";

export const usuariosTable = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  senha: text("senha").notNull(),
  perfil: text("perfil", { enum: ["enfermeira", "validador_enfermeiro", "medico_tecnico", "validador_mestre"] }).notNull(),
  escopo: text("escopo", { enum: ["consultoria_master", "clinica_medico", "clinica_enfermeira", "clinica_admin"] }).notNull().default("clinica_enfermeira"),
  unidadeId: integer("unidade_id").references(() => unidadesTable.id),
  consultoriaId: integer("consultoria_id").references(() => consultoriasTable.id),
  fotoRosto: text("foto_rosto"),
  fotoCorpo: text("foto_corpo"),
  crm: text("crm"),
  cpf: text("cpf"),
  cns: text("cns"),
  especialidade: text("especialidade"),
  telefone: text("telefone"),
  ativo: boolean("ativo").notNull().default(true),
  podeValidar: boolean("pode_validar").notNull().default(false),
  podeAssinar: boolean("pode_assinar").notNull().default(false),
  podeBypass: boolean("pode_bypass").notNull().default(false),
  nuncaOpera: boolean("nunca_opera").notNull().default(false),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUsuarioSchema = createInsertSchema(usuariosTable).omit({ id: true, criadoEm: true, atualizadoEm: true });
export type InsertUsuario = z.infer<typeof insertUsuarioSchema>;
export type Usuario = typeof usuariosTable.$inferSelect;

export const PERMISSOES_POR_PERFIL: Record<string, {
  podeValidar: boolean;
  podeAssinar: boolean;
  podeBypass: boolean;
  nuncaOpera: boolean;
}> = {
  validador_mestre: {
    podeValidar: true,
    podeAssinar: true,
    podeBypass: true,
    nuncaOpera: true,
  },
  medico_tecnico: {
    podeValidar: true,
    podeAssinar: true,
    podeBypass: false,
    nuncaOpera: false,
  },
  validador_enfermeiro: {
    podeValidar: false,
    podeAssinar: false,
    podeBypass: false,
    nuncaOpera: false,
  },
  enfermeira: {
    podeValidar: false,
    podeAssinar: false,
    podeBypass: false,
    nuncaOpera: false,
  },
};

export function verificarPodeOperar(usuario: Usuario): boolean {
  return !usuario.nuncaOpera;
}

export function verificarPodeValidar(usuario: Usuario): boolean {
  return usuario.podeValidar;
}
