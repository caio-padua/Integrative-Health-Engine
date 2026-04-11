/**
 * GAP 4: AUDITORIA DA CASCATA
 * ============================
 * Arquivo: lib/db/src/schema/auditoriaCascata.ts
 * 
 * Log completo de quem ligou/desligou a cascata e por quê:
 * - Ação: LIGOU, DESLIGOU, ALTEROU_ETAPA
 * - Etapa: ENFERMEIRA03, CONSULTOR03, MEDICO03, MEDICO_SENIOR
 * - Valor anterior e novo
 * - Quem fez (usuário)
 * - Por quê (motivo)
 * - Quando (timestamp)
 */

import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usuariosTable } from "./usuarios";

export const auditoriaCascataTable = pgTable("auditoria_cascata", {
  id: serial("id").primaryKey(),
  
  // ========== AÇÃO ==========
  acao: text("acao", { 
    enum: ["LIGOU", "DESLIGOU", "ALTEROU_ETAPA"] 
  }).notNull(),
  
  // ========== ETAPA AFETADA ==========
  etapa: text("etapa", {
    enum: ["ENFERMEIRA03", "CONSULTOR03", "MEDICO03", "MEDICO_SENIOR"]
  }),
  
  // ========== VALORES ==========
  valorAnterior: boolean("valor_anterior"),
  valorNovo: boolean("valor_novo"),
  
  // ========== QUEM FEZ ==========
  realizadoPorId: integer("realizado_por_id").notNull().references(() => usuariosTable.id),
  
  // ========== POR QUÊ ==========
  motivo: text("motivo"),
  
  // ========== QUANDO ==========
  realizadoEm: timestamp("realizado_em", { withTimezone: true }).notNull().defaultNow(),
});

// ========== SCHEMAS ZOD ==========
export const insertAuditoriaCascataSchema = createInsertSchema(auditoriaCascataTable).omit({
  id: true,
  realizadoEm: true,
});

export type InsertAuditoriaCascata = z.infer<typeof insertAuditoriaCascataSchema>;
export type AuditoriaCascata = typeof auditoriaCascataTable.$inferSelect;

// ========== HELPER: FORMATAR AÇÃO PARA EXIBIÇÃO ==========
export function formatarAcaoAuditoria(auditoria: AuditoriaCascata): string {
  switch (auditoria.acao) {
    case "LIGOU":
      return `🟢 LIGOU ${auditoria.etapa}`;
    case "DESLIGOU":
      return `🔴 DESLIGOU ${auditoria.etapa}`;
    case "ALTEROU_ETAPA":
      return `🔄 ALTEROU ${auditoria.etapa} (${auditoria.valorAnterior} → ${auditoria.valorNovo})`;
    default:
      return "DESCONHECIDA";
  }
}

// ========== HELPER: CRIAR ENTRADA AUDITORIA ==========
export function criarEntradaAuditoria(
  acao: "LIGOU" | "DESLIGOU" | "ALTEROU_ETAPA",
  etapa: "ENFERMEIRA03" | "CONSULTOR03" | "MEDICO03" | "MEDICO_SENIOR" | undefined,
  realizadoPorId: number,
  motivo?: string,
  valorAnterior?: boolean,
  valorNovo?: boolean
): InsertAuditoriaCascata {
  return {
    acao,
    etapa,
    realizadoPorId,
    motivo,
    valorAnterior,
    valorNovo,
  };
}
