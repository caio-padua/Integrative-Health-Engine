import { pgTable, serial, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { unidadesTable } from "./unidades";

export const whatsappConfigTable = pgTable("whatsapp_config", {
  id: serial("id").primaryKey(),
  unidadeId: integer("unidade_id").references(() => unidadesTable.id),
  provedor: text("provedor", { enum: ["TWILIO", "GUPSHUP"] }).notNull(),
  accountSid: text("account_sid"),
  authToken: text("auth_token"),
  apiKey: text("api_key"),
  numeroRemetente: text("numero_remetente").notNull(),
  nomeExibicao: text("nome_exibicao").notNull().default("Clinica PADCOM"),
  ativo: boolean("ativo").notNull().default(true),
  webhookUrl: text("webhook_url"),
  metadados: jsonb("metadados"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWhatsappConfigSchema = createInsertSchema(whatsappConfigTable).omit({
  id: true, criadoEm: true, atualizadoEm: true,
});
export type InsertWhatsappConfig = z.infer<typeof insertWhatsappConfigSchema>;
export type WhatsappConfig = typeof whatsappConfigTable.$inferSelect;

export const whatsappMensagensLogTable = pgTable("whatsapp_mensagens_log", {
  id: serial("id").primaryKey(),
  configId: integer("config_id").references(() => whatsappConfigTable.id),
  alertaNotificacaoId: integer("alerta_notificacao_id"),
  provedor: text("provedor", { enum: ["TWILIO", "GUPSHUP"] }).notNull(),
  provedorMsgId: text("provedor_msg_id"),
  telefoneDestino: text("telefone_destino").notNull(),
  templateNome: text("template_nome"),
  mensagem: text("mensagem").notNull(),
  status: text("status", {
    enum: ["PENDENTE", "ENVIADO", "ENTREGUE", "LIDO", "FALHOU"],
  }).notNull().default("PENDENTE"),
  erroDetalhes: text("erro_detalhes"),
  enviadoEm: timestamp("enviado_em", { withTimezone: true }),
  entregueEm: timestamp("entregue_em", { withTimezone: true }),
  lidoEm: timestamp("lido_em", { withTimezone: true }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWhatsappMensagemLogSchema = createInsertSchema(whatsappMensagensLogTable).omit({
  id: true, criadoEm: true,
});
export type InsertWhatsappMensagemLog = z.infer<typeof insertWhatsappMensagemLogSchema>;
export type WhatsappMensagemLog = typeof whatsappMensagensLogTable.$inferSelect;

export function statusIconeWhatsapp(status: string): string {
  switch (status) {
    case "ENVIADO": return "✓";
    case "ENTREGUE": return "✓✓";
    case "LIDO": return "✓✓✓";
    case "FALHOU": return "✗";
    default: return "⏳";
  }
}

export function statusCorWhatsapp(status: string): "VERDE" | "AMARELO" | "VERMELHO" | "CINZA" {
  switch (status) {
    case "LIDO": return "VERDE";
    case "ENTREGUE": return "VERDE";
    case "ENVIADO": return "AMARELO";
    case "FALHOU": return "VERMELHO";
    default: return "CINZA";
  }
}
