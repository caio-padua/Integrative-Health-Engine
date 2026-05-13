import { pgTable, serial, text, boolean, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
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
  escopo: text("escopo", { enum: ["consultoria_master", "consultor_campo", "clinica_medico", "clinica_enfermeira", "clinica_admin"] }).notNull().default("clinica_enfermeira"),
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
  perfilPlataforma: text("perfil_plataforma", {
    enum: ["platform_owner", "tenant_admin", "tenant_user"],
  }).notNull().default("tenant_user"),
  totpSecretCifrado: text("totp_secret_cifrado"),
  totpAtivadoEm: timestamp("totp_ativado_em", { withTimezone: true }),
  ultimoLogin2faEm: timestamp("ultimo_login_2fa_em", { withTimezone: true }),
  // Task #146/Migration 047 — timestamp do ultimo aviso de expiracao 2FA
  // disparado pelo worker. Exposto em /usuarios/perfil-atual (Task #173)
  // pra UI mostrar "Ultimo aviso enviado: <data>" e amarelo perto do fim.
  ultimoAviso2faEm: timestamp("ultimo_aviso_2fa_em", { withTimezone: true }),
  // Task #159 — preferencia de canais pra aviso de expiracao 2FA
  // (Migration 048). Default ['email','whatsapp'] preserva comportamento
  // legado do worker avisoExpiracao2faOwner (Task #146).
  canaisAviso2fa: text("canais_aviso_2fa").array().notNull().default(["email", "whatsapp"]),
  // Task #123/Migration 050 — codigos de recuperacao 2FA bcrypt-hashed
  // gerados na ativacao e mostrados UMA UNICA VEZ. Array de objetos
  // { hash: string, usadoEm: string|null (ISO8601) }. Aceitos como
  // alternativa ao codigo TOTP em /usuarios/login/2fa-verificar.
  codigosRecuperacao2fa: jsonb("codigos_recuperacao_2fa")
    .$type<Array<{ hash: string; usadoEm: string | null }>>()
    .notNull()
    .default([]),
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
