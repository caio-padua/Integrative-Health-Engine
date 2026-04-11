import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usuariosTable } from "./usuarios";

export const alertasNotificacaoTable = pgTable("alertas_notificacao", {
  id: serial("id").primaryKey(),
  tipo: text("tipo", {
    enum: ["FILA_PENDENTE", "CASCATA_ALTERADA", "EXAME_RECEBIDO", "ALERTA_CLINICO", "PRAZO_EXPIRANDO"],
  }).notNull(),
  destinatarioId: integer("destinatario_id").notNull().references(() => usuariosTable.id),
  canal: text("canal", { enum: ["SISTEMA", "WHATSAPP", "EMAIL"] }).notNull().default("SISTEMA"),
  mensagem: text("mensagem").notNull(),
  linkAcao: text("link_acao"),
  status: text("status", {
    enum: ["ENVIADO", "ENTREGUE", "LIDO", "CONFIRMADO", "EXPIRADO"],
  }).notNull().default("ENVIADO"),
  confirmadoEm: timestamp("confirmado_em", { withTimezone: true }),
  confirmadoPorId: integer("confirmado_por_id").references(() => usuariosTable.id),
  expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
  enviadoEm: timestamp("enviado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAlertaNotificacaoSchema = createInsertSchema(alertasNotificacaoTable).omit({ id: true, enviadoEm: true });
export type InsertAlertaNotificacao = z.infer<typeof insertAlertaNotificacaoSchema>;
export type AlertaNotificacao = typeof alertasNotificacaoTable.$inferSelect;

export function criarAlerta(
  tipo: InsertAlertaNotificacao["tipo"],
  destinatarioId: number,
  mensagem: string,
  linkAcao?: string,
  horasExpiracao: number = 24,
): InsertAlertaNotificacao {
  return {
    tipo,
    destinatarioId,
    canal: "SISTEMA",
    mensagem,
    linkAcao,
    status: "ENVIADO",
    expiraEm: new Date(Date.now() + horasExpiracao * 60 * 60 * 1000),
  };
}

export function calcularTempoRestante(expiraEm: Date): {
  horas: number;
  minutos: number;
  expirado: boolean;
} {
  const diff = expiraEm.getTime() - Date.now();
  if (diff <= 0) return { horas: 0, minutos: 0, expirado: true };
  return {
    horas: Math.floor(diff / (1000 * 60 * 60)),
    minutos: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    expirado: false,
  };
}

export function corSemaforo(horasRestantes: number): "VERDE" | "AMARELO" | "VERMELHO" {
  if (horasRestantes > 24) return "VERDE";
  if (horasRestantes > 6) return "AMARELO";
  return "VERMELHO";
}
