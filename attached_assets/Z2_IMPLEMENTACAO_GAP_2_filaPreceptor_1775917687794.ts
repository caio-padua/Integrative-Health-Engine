/**
 * GAP 2: FILA DO PRECEPTOR
 * ========================
 * Arquivo: lib/db/src/schema/filaPreceptor.ts
 * 
 * Tabela dedicada para prontuários aguardando validação do Dr. Caio:
 * - Prazo máximo: 48h
 * - Escalation automático se não validar
 * - Assinatura digital após validar
 * - Status: PENDENTE → VALIDADO → ASSINADO
 * - Histórico completo de validações
 */

import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pacientesTable } from "./pacientes";
import { usuariosTable } from "./usuarios";

export const filaPreceptorTable = pgTable("fila_preceptor", {
  id: serial("id").primaryKey(),
  
  // ========== REFERÊNCIAS ==========
  pacienteId: integer("paciente_id").notNull().references(() => pacientesTable.id),
  prontuarioId: integer("prontuario_id"),  // Referência ao prontuário/anamnese
  
  // ========== STATUS ==========
  status: text("status", { 
    enum: ["PENDENTE", "VALIDADO", "ASSINADO", "REJEITADO"] 
  }).notNull().default("PENDENTE"),
  
  // ========== PRAZO 48H ==========
  prazoMaximo: timestamp("prazo_maximo", { withTimezone: true }).notNull(),
  prazoUltimAviso: timestamp("prazo_ultim_aviso", { withTimezone: true }),
  
  // ========== ESCALATION AUTOMÁTICO ==========
  escalationAtivo: boolean("escalation_ativo").notNull().default(false),
  escalationEnviadoEm: timestamp("escalation_enviado_em", { withTimezone: true }),
  
  // ========== VALIDAÇÃO ==========
  validadoPorId: integer("validado_por_id").references(() => usuariosTable.id),
  validadoEm: timestamp("validado_em", { withTimezone: true }),
  observacaoValidacao: text("observacao_validacao"),
  
  // ========== REJEIÇÃO ==========
  rejeitadoEm: timestamp("rejeitado_em", { withTimezone: true }),
  motivoRejeicao: text("motivo_rejeicao"),
  
  // ========== ASSINATURA DIGITAL ==========
  assinaturaDigital: text("assinatura_digital"),
  assinadoEm: timestamp("assinado_em", { withTimezone: true }),
  
  // ========== RASTREABILIDADE ==========
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ========== SCHEMAS ZOD ==========
export const insertFilaPreceptorSchema = createInsertSchema(filaPreceptorTable).omit({
  id: true,
  criadoEm: true,
  atualizadoEm: true,
});

export type InsertFilaPreceptor = z.infer<typeof insertFilaPreceptorSchema>;
export type FilaPreceptor = typeof filaPreceptorTable.$inferSelect;

// ========== HELPER: CALCULAR TEMPO RESTANTE ==========
export function calcularTempoRestante(prazoMaximo: Date): {
  horas: number;
  minutos: number;
  segundos: number;
  expirado: boolean;
} {
  const agora = new Date();
  const diff = prazoMaximo.getTime() - agora.getTime();
  
  if (diff <= 0) {
    return { horas: 0, minutos: 0, segundos: 0, expirado: true };
  }
  
  const horas = Math.floor(diff / (1000 * 60 * 60));
  const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const segundos = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { horas, minutos, segundos, expirado: false };
}

// ========== HELPER: DETERMINAR COR DO SEMÁFORO ==========
export function determinarCorSemaforoFilaPreceptor(tempoRestante: number): "VERDE" | "AMARELO" | "VERMELHO" {
  if (tempoRestante > 24) return "VERDE";      // Mais de 24h
  if (tempoRestante > 6) return "AMARELO";     // Entre 6h e 24h
  return "VERMELHO";                            // Menos de 6h
}

// ========== HELPER: CRIAR FILA PRECEPTOR ==========
export function criarFilaPreceptor(pacienteId: number, prontuarioId?: number): InsertFilaPreceptor {
  const agora = new Date();
  const prazoMaximo = new Date(agora.getTime() + 48 * 60 * 60 * 1000);  // 48h
  
  return {
    pacienteId,
    prontuarioId,
    status: "PENDENTE",
    prazoMaximo,
    escalationAtivo: false,
  };
}
