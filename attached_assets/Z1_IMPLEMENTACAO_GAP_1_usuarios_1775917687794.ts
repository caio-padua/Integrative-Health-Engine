/**
 * GAP 1: HIERARQUIA CLÍNICA COMPLETA
 * ===================================
 * Arquivo: lib/db/src/schema/usuarios.ts
 * 
 * Substitui o schema atual de usuários com hierarquia clínica de 10 níveis:
 * - MEDICO_DIRETOR_CLINICO (Dr. Caio — admin total, nunca opera)
 * - MEDICO_SUPERVISOR_1 a 5 (5 supervisores)
 * - MEDICO_ASSISTENTE (médico assistente)
 * - ENFERMEIRA (enfermeira)
 * - CONSULTOR (consultor)
 * - PACIENTE (paciente)
 * 
 * Adiciona permissões por role e proteção especial para Dr. Caio.
 */

import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { unidadesTable } from "./unidades";

export const usuariosTable = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  senha: text("senha").notNull(),
  
  // ========== HIERARQUIA CLÍNICA (10 NÍVEIS) ==========
  role: text("role", {
    enum: [
      "MEDICO_DIRETOR_CLINICO",      // Dr. Caio — admin total, só valida
      "MEDICO_SUPERVISOR_1",          // Supervisor 1
      "MEDICO_SUPERVISOR_2",          // Supervisor 2
      "MEDICO_SUPERVISOR_3",          // Supervisor 3
      "MEDICO_SUPERVISOR_4",          // Supervisor 4
      "MEDICO_SUPERVISOR_5",          // Supervisor 5
      "MEDICO_ASSISTENTE",            // Médico assistente
      "ENFERMEIRA",                   // Enfermeira
      "CONSULTOR",                    // Consultor
      "PACIENTE"                      // Paciente
    ]
  }).notNull(),
  
  // ========== PERMISSÕES POR ROLE ==========
  podeValidar: boolean("pode_validar").notNull().default(false),
  podeAssinar: boolean("pode_assinar").notNull().default(false),
  podeBypass: boolean("pode_bypass").notNull().default(false),
  podeEmitirNf: boolean("pode_emitir_nf").notNull().default(false),
  podeVerDadosOutrasEmpresas: boolean("pode_ver_dados_outras_empresas").notNull().default(false),
  
  // ========== PROTEÇÃO ESPECIAL PARA DR. CAIO ==========
  // Flag: Dr. Caio nunca opera (cria, edita, deleta)
  // Ele APENAS valida e supervisiona
  nunca_opera: boolean("nunca_opera").notNull().default(false),
  
  // ========== DADOS PROFISSIONAIS ==========
  unidadeId: integer("unidade_id").references(() => unidadesTable.id),
  crm: text("crm"),
  cpf: text("cpf"),
  cns: text("cns"),
  especialidade: text("especialidade"),
  telefone: text("telefone"),
  ativo: boolean("ativo").notNull().default(true),
  
  // ========== RASTREABILIDADE ==========
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ========== SCHEMAS ZOD ==========
export const insertUsuarioSchema = createInsertSchema(usuariosTable).omit({ 
  id: true, 
  criadoEm: true, 
  atualizadoEm: true 
});

export type InsertUsuario = z.infer<typeof insertUsuarioSchema>;
export type Usuario = typeof usuariosTable.$inferSelect;

// ========== HELPER: PERMISSÕES POR ROLE ==========
export const ROLE_PERMISSIONS: Record<string, {
  podeValidar: boolean;
  podeAssinar: boolean;
  podeBypass: boolean;
  podeEmitirNf: boolean;
  podeVerDadosOutrasEmpresas: boolean;
  nunca_opera: boolean;
}> = {
  MEDICO_DIRETOR_CLINICO: {
    podeValidar: true,
    podeAssinar: true,
    podeBypass: true,
    podeEmitirNf: true,
    podeVerDadosOutrasEmpresas: true,
    nunca_opera: true,  // ⚠️ CRÍTICO: Dr. Caio nunca opera
  },
  MEDICO_SUPERVISOR_1: {
    podeValidar: true,
    podeAssinar: true,
    podeBypass: true,
    podeEmitirNf: false,
    podeVerDadosOutrasEmpresas: false,
    nunca_opera: false,
  },
  MEDICO_SUPERVISOR_2: {
    podeValidar: true,
    podeAssinar: true,
    podeBypass: true,
    podeEmitirNf: false,
    podeVerDadosOutrasEmpresas: false,
    nunca_opera: false,
  },
  MEDICO_SUPERVISOR_3: {
    podeValidar: true,
    podeAssinar: true,
    podeBypass: true,
    podeEmitirNf: false,
    podeVerDadosOutrasEmpresas: false,
    nunca_opera: false,
  },
  MEDICO_SUPERVISOR_4: {
    podeValidar: true,
    podeAssinar: true,
    podeBypass: true,
    podeEmitirNf: false,
    podeVerDadosOutrasEmpresas: false,
    nunca_opera: false,
  },
  MEDICO_SUPERVISOR_5: {
    podeValidar: true,
    podeAssinar: true,
    podeBypass: true,
    podeEmitirNf: false,
    podeVerDadosOutrasEmpresas: false,
    nunca_opera: false,
  },
  MEDICO_ASSISTENTE: {
    podeValidar: false,
    podeAssinar: false,
    podeBypass: false,
    podeEmitirNf: false,
    podeVerDadosOutrasEmpresas: false,
    nunca_opera: false,
  },
  ENFERMEIRA: {
    podeValidar: false,
    podeAssinar: false,
    podeBypass: false,
    podeEmitirNf: false,
    podeVerDadosOutrasEmpresas: false,
    nunca_opera: false,
  },
  CONSULTOR: {
    podeValidar: false,
    podeAssinar: false,
    podeBypass: false,
    podeEmitirNf: false,
    podeVerDadosOutrasEmpresas: false,
    nunca_opera: false,
  },
  PACIENTE: {
    podeValidar: false,
    podeAssinar: false,
    podeBypass: false,
    podeEmitirNf: false,
    podeVerDadosOutrasEmpresas: false,
    nunca_opera: false,
  },
};

// ========== HELPER: VALIDAR OPERAÇÃO ==========
/**
 * Valida se um usuário pode executar uma operação
 * Retorna false se o usuário tem flag nunca_opera
 */
export function podeOperar(usuario: Usuario): boolean {
  if (usuario.nunca_opera) {
    return false;  // Dr. Caio nunca opera
  }
  return true;
}

/**
 * Valida se um usuário pode validar
 */
export function podeValidar(usuario: Usuario): boolean {
  return usuario.podeValidar === true;
}

/**
 * Valida se um usuário pode assinar digitalmente
 */
export function podeAssinar(usuario: Usuario): boolean {
  return usuario.podeAssinar === true;
}

/**
 * Valida se um usuário pode fazer bypass
 */
export function podeBypass(usuario: Usuario): boolean {
  return usuario.podeBypass === true;
}
