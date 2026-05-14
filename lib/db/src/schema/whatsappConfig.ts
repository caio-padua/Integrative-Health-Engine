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

// Task #205 — Registro de mensagens INBOUND (recebidas pelo provedor).
// Cada linha representa um payload de inbound (texto, mídia, reaçao, etc.)
// que o destinatário enviou pra clínica via WhatsApp. Usado pra calcular
// se a "janela de 24h" do WhatsApp Business API está aberta pra um
// telefone — sem inbound recente, mensagens fora de template HSM
// podem ser bloqueadas silenciosamente pelo provedor.
export const whatsappInboundTable = pgTable("whatsapp_inbound", {
  id: serial("id").primaryKey(),
  configId: integer("config_id").references(() => whatsappConfigTable.id),
  unidadeId: integer("unidade_id").references(() => unidadesTable.id),
  provedor: text("provedor", { enum: ["TWILIO", "GUPSHUP"] }).notNull(),
  provedorMsgId: text("provedor_msg_id"),
  // Telefone do destinatário (quem mandou pra clínica). Sempre normalizado
  // pra dígitos puros com prefixo 55 (formato BR), pra casar com o
  // `telefone_destino` gravado em `whatsapp_mensagens_log`.
  telefoneOrigem: text("telefone_origem").notNull(),
  // Tipo do payload conforme reportado pelo provedor (text, image, audio,
  // video, document, location, button, interactive, etc.). Guardado pra
  // diagnóstico — qualquer inbound conta pra abrir a janela de 24h.
  tipoMensagem: text("tipo_mensagem"),
  // Snapshot do conteúdo (texto bruto ou metadado de mídia). Pode ser null
  // pra eventos sem corpo de texto.
  conteudo: text("conteudo"),
  // Payload bruto pra auditoria forense — útil quando o provedor muda o
  // formato e a gente precisa reprocessar histórico.
  payloadBruto: jsonb("payload_bruto"),
  recebidoEm: timestamp("recebido_em", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWhatsappInboundSchema = createInsertSchema(whatsappInboundTable).omit({
  id: true, recebidoEm: true,
});
export type InsertWhatsappInbound = z.infer<typeof insertWhatsappInboundSchema>;
export type WhatsappInbound = typeof whatsappInboundTable.$inferSelect;

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
