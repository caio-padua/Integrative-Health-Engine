/**
 * GAP 5: ALERTAS TWILIO COM ACK
 * ==============================
 * Arquivo: lib/db/src/schema/alertasTwilio.ts
 * 
 * Sistema de alertas via WhatsApp/Twilio com confirmação de leitura:
 * - Tipos: FILA_PRECEPTOR_PENDENTE, CASCATA_ALTERADA, EXAME_RECEBIDO, ALERTA_CLINICO
 * - Status: ENVIADO → ENTREGUE → LIDO → CONFIRMADO
 * - Expiração: 24h
 * - ACK (confirmação de leitura)
 * - Webhook de status Twilio
 */

import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usuariosTable } from "./usuarios";

export const alertasTwilioTable = pgTable("alertas_twilio", {
  id: serial("id").primaryKey(),
  
  // ========== TIPO DE ALERTA ==========
  tipo: text("tipo", {
    enum: ["FILA_PRECEPTOR_PENDENTE", "CASCATA_ALTERADA", "EXAME_RECEBIDO", "ALERTA_CLINICO"]
  }).notNull(),
  
  // ========== DESTINATÁRIO ==========
  destinatarioId: integer("destinatario_id").notNull().references(() => usuariosTable.id),
  numeroWhatsapp: text("numero_whatsapp").notNull(),
  
  // ========== CONTEÚDO ==========
  mensagem: text("mensagem").notNull(),
  linkAcao: text("link_acao"),
  
  // ========== STATUS DE CONFIRMAÇÃO ==========
  status: text("status", {
    enum: ["ENVIADO", "ENTREGUE", "LIDO", "CONFIRMADO", "EXPIRADO"]
  }).notNull().default("ENVIADO"),
  
  // ========== CONFIRMAÇÃO DE LEITURA ==========
  confirmadoEm: timestamp("confirmado_em", { withTimezone: true }),
  confirmadoPorId: integer("confirmado_por_id").references(() => usuariosTable.id),
  
  // ========== EXPIRAÇÃO (24H) ==========
  expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
  
  // ========== RASTREABILIDADE ==========
  enviadoEm: timestamp("enviado_em", { withTimezone: true }).notNull().defaultNow(),
  entregueEm: timestamp("entregue_em", { withTimezone: true }),
  
  // ========== WEBHOOK TWILIO ==========
  twilioSid: text("twilio_sid"),
  twilioStatus: text("twilio_status"),
});

// ========== SCHEMAS ZOD ==========
export const insertAlertaTwilioSchema = createInsertSchema(alertasTwilioTable).omit({
  id: true,
  enviadoEm: true,
});

export type InsertAlertaTwilio = z.infer<typeof insertAlertaTwilioSchema>;
export type AlertaTwilio = typeof alertasTwilioTable.$inferSelect;

// ========== HELPER: CRIAR ALERTA ==========
export function criarAlertaTwilio(
  tipo: "FILA_PRECEPTOR_PENDENTE" | "CASCATA_ALTERADA" | "EXAME_RECEBIDO" | "ALERTA_CLINICO",
  destinatarioId: number,
  numeroWhatsapp: string,
  mensagem: string,
  linkAcao?: string
): InsertAlertaTwilio {
  const agora = new Date();
  const expiraEm = new Date(agora.getTime() + 24 * 60 * 60 * 1000);  // 24h
  
  return {
    tipo,
    destinatarioId,
    numeroWhatsapp,
    mensagem,
    linkAcao,
    status: "ENVIADO",
    expiraEm,
  };
}

// ========== HELPER: FORMATAR MENSAGEM TWILIO ==========
export function formatarMensagemTwilio(
  tipo: string,
  detalhes: Record<string, any>
): string {
  switch (tipo) {
    case "FILA_PRECEPTOR_PENDENTE":
      return `🔴 ALERTA: Prontuário ${detalhes.pacienteNome} aguardando validação há ${detalhes.tempoHoras}h. Prazo: ${detalhes.tempoRestante}h`;
    
    case "CASCATA_ALTERADA":
      return `🔄 CASCATA: ${detalhes.acao} ${detalhes.etapa} por ${detalhes.usuario}. Motivo: ${detalhes.motivo}`;
    
    case "EXAME_RECEBIDO":
      return `✅ EXAME: Exame ${detalhes.nomeExame} recebido para ${detalhes.pacienteNome}`;
    
    case "ALERTA_CLINICO":
      return `⚠️ ALERTA CLÍNICO: ${detalhes.descricao}`;
    
    default:
      return "Alerta do sistema";
  }
}

// ========== HELPER: MAPEAR STATUS TWILIO ==========
export function mapearStatusTwilio(twilioStatus: string): string {
  const statusMap: Record<string, string> = {
    queued: "ENVIADO",
    sent: "ENTREGUE",
    delivered: "ENTREGUE",
    read: "LIDO",
    failed: "EXPIRADO",
    undelivered: "EXPIRADO",
  };
  
  return statusMap[twilioStatus] || "DESCONHECIDO";
}

// ========== HELPER: VERIFICAR SE EXPIROU ==========
export function verificarSeExpirou(alerta: AlertaTwilio): boolean {
  const agora = new Date();
  return agora > alerta.expiraEm;
}

// ========== HELPER: TEMPO RESTANTE ==========
export function calcularTempoRestanteAlerta(expiraEm: Date): {
  horas: number;
  minutos: number;
  expirado: boolean;
} {
  const agora = new Date();
  const diff = expiraEm.getTime() - agora.getTime();
  
  if (diff <= 0) {
    return { horas: 0, minutos: 0, expirado: true };
  }
  
  const horas = Math.floor(diff / (1000 * 60 * 60));
  const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return { horas, minutos, expirado: false };
}
