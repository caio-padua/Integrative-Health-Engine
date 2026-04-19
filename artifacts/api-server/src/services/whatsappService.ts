import { db, whatsappConfigTable, whatsappMensagensLogTable, alertasNotificacaoTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { decryptCredential } from "./credentialEncryption";
import { renderTemplate, type TemplateNome, type TemplateDadosMap } from "./whatsappTemplates";

export interface EnvioResult {
  sucesso: boolean;
  provedorMsgId?: string;
  erro?: string;
}

type WhatsappConfig = typeof whatsappConfigTable.$inferSelect;

interface WebhookUpdateData {
  status: "ENTREGUE" | "LIDO" | "FALHOU";
  entregueEm?: Date;
  lidoEm?: Date;
  erroDetalhes?: string;
}

function decryptConfig(config: WhatsappConfig): WhatsappConfig {
  return {
    ...config,
    authToken: config.authToken ? decryptCredential(config.authToken) : null,
    apiKey: config.apiKey ? decryptCredential(config.apiKey) : null,
    accountSid: config.accountSid ? decryptCredential(config.accountSid) : null,
  };
}

async function enviarViaTwilio(
  config: WhatsappConfig,
  telefone: string,
  mensagem: string,
): Promise<EnvioResult> {
  try {
    const decrypted = decryptConfig(config);
    const Twilio = (await import("twilio")).default;
    const client = Twilio(decrypted.accountSid!, decrypted.authToken!);

    const msg = await client.messages.create({
      body: mensagem,
      from: `whatsapp:${config.numeroRemetente}`,
      to: `whatsapp:+${telefone}`,
    });

    return { sucesso: true, provedorMsgId: msg.sid };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[WhatsApp/Twilio] Erro ao enviar:", message);
    return { sucesso: false, erro: message };
  }
}

async function enviarViaGupshup(
  config: WhatsappConfig,
  telefone: string,
  mensagem: string,
): Promise<EnvioResult> {
  try {
    const decrypted = decryptConfig(config);
    const params = new URLSearchParams({
      channel: "whatsapp",
      source: config.numeroRemetente,
      destination: telefone,
      "src.name": config.nomeExibicao,
      message: JSON.stringify({ type: "text", text: mensagem }),
    });

    const response = await fetch("https://api.gupshup.io/wa/api/v1/msg", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "apikey": decrypted.apiKey || "",
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (response.ok && data.status === "submitted") {
      return { sucesso: true, provedorMsgId: data.messageId };
    }

    return { sucesso: false, erro: data.message || JSON.stringify(data) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[WhatsApp/Gupshup] Erro ao enviar:", message);
    return { sucesso: false, erro: message };
  }
}

function formatarTelefone(telefone: string): string {
  const limpo = telefone.replace(/\D/g, "");
  return limpo.startsWith("55") ? limpo : `55${limpo}`;
}

export async function obterConfigWhatsapp(unidadeId?: number): Promise<WhatsappConfig | null> {
  if (unidadeId) {
    const unitConfigs = await db
      .select()
      .from(whatsappConfigTable)
      .where(and(
        eq(whatsappConfigTable.ativo, true),
        eq(whatsappConfigTable.unidadeId, unidadeId),
      ))
      .limit(1);

    if (unitConfigs.length > 0) return unitConfigs[0];
  }

  const globalConfigs = await db
    .select()
    .from(whatsappConfigTable)
    .where(and(
      eq(whatsappConfigTable.ativo, true),
      sql`${whatsappConfigTable.unidadeId} IS NULL`,
    ))
    .limit(1);

  return globalConfigs[0] || null;
}

export async function enviarWhatsapp(
  telefone: string,
  mensagem: string,
  options?: {
    unidadeId?: number;
    templateNome?: string;
    alertaNotificacaoId?: number;
  },
): Promise<EnvioResult & { logId?: number }> {
  const config = await obterConfigWhatsapp(options?.unidadeId);

  if (!config) {
    if (options?.alertaNotificacaoId) {
      await db
        .update(alertasNotificacaoTable)
        .set({ erroEnvio: "Nenhuma configuracao WhatsApp ativa encontrada" })
        .where(eq(alertasNotificacaoTable.id, options.alertaNotificacaoId));
    }
    return { sucesso: false, erro: "Nenhuma configuracao WhatsApp ativa encontrada" };
  }

  const telefoneFormatado = formatarTelefone(telefone);

  let resultado: EnvioResult;
  if (config.provedor === "TWILIO") {
    resultado = await enviarViaTwilio(config, telefoneFormatado, mensagem);
  } else {
    resultado = await enviarViaGupshup(config, telefoneFormatado, mensagem);
  }

  const [log] = await db.insert(whatsappMensagensLogTable).values({
    configId: config.id,
    alertaNotificacaoId: options?.alertaNotificacaoId,
    provedor: config.provedor,
    provedorMsgId: resultado.provedorMsgId,
    telefoneDestino: telefoneFormatado,
    templateNome: options?.templateNome,
    mensagem,
    status: resultado.sucesso ? "ENVIADO" : "FALHOU",
    erroDetalhes: resultado.erro,
    enviadoEm: resultado.sucesso ? new Date() : null,
  }).returning();

  if (options?.alertaNotificacaoId) {
    await db
      .update(alertasNotificacaoTable)
      .set({
        provedorMsgId: resultado.provedorMsgId || null,
        erroEnvio: resultado.erro || null,
        telefoneDestino: telefoneFormatado,
      })
      .where(eq(alertasNotificacaoTable.id, options.alertaNotificacaoId));
  }

  return {
    ...resultado,
    logId: log.id,
  };
}

export async function enviarComTemplate<N extends TemplateNome>(
  telefone: string,
  templateNome: N,
  dados: TemplateDadosMap[N],
  options?: {
    unidadeId?: number;
    alertaNotificacaoId?: number;
  },
): Promise<EnvioResult & { logId?: number }> {
  let mensagem: string;
  try {
    mensagem = renderTemplate(templateNome, dados);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { sucesso: false, erro: message };
  }

  return enviarWhatsapp(telefone, mensagem, {
    ...options,
    templateNome,
  });
}

export async function atualizarStatusWebhook(
  provedorMsgId: string,
  novoStatus: "ENTREGUE" | "LIDO" | "FALHOU",
  erroDetalhes?: string,
): Promise<boolean> {
  const updateData: WebhookUpdateData = { status: novoStatus };
  if (novoStatus === "ENTREGUE") updateData.entregueEm = new Date();
  if (novoStatus === "LIDO") updateData.lidoEm = new Date();
  if (erroDetalhes) updateData.erroDetalhes = erroDetalhes;

  const result = await db
    .update(whatsappMensagensLogTable)
    .set(updateData)
    .where(eq(whatsappMensagensLogTable.provedorMsgId, provedorMsgId));

  return (result.rowCount ?? 0) > 0;
}

export async function testarConexaoWhatsapp(configId: number): Promise<{
  sucesso: boolean;
  provedor: string;
  erro?: string;
}> {
  const configs = await db
    .select()
    .from(whatsappConfigTable)
    .where(eq(whatsappConfigTable.id, configId));

  if (configs.length === 0) {
    return { sucesso: false, provedor: "DESCONHECIDO", erro: "Configuracao nao encontrada" };
  }

  const config = configs[0];
  const decrypted = decryptConfig(config);

  if (config.provedor === "TWILIO") {
    try {
      const Twilio = (await import("twilio")).default;
      const client = Twilio(decrypted.accountSid!, decrypted.authToken!);
      await client.api.accounts(decrypted.accountSid!).fetch();
      return { sucesso: true, provedor: "TWILIO" };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { sucesso: false, provedor: "TWILIO", erro: message };
    }
  } else {
    try {
      const response = await fetch("https://api.gupshup.io/wa/api/v1/wallet/balance", {
        headers: { "apikey": decrypted.apiKey || "" },
      });
      if (response.ok) {
        return { sucesso: true, provedor: "GUPSHUP" };
      }
      const data = await response.json();
      return { sucesso: false, provedor: "GUPSHUP", erro: data.message || "Falha na autenticacao" };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { sucesso: false, provedor: "GUPSHUP", erro: message };
    }
  }
}

export async function obterAuthTokenParaValidacao(
  provedor: "TWILIO" | "GUPSHUP",
  provedorMsgId?: string,
): Promise<string | null> {
  if (provedorMsgId) {
    const logs = await db
      .select({ configId: whatsappMensagensLogTable.configId })
      .from(whatsappMensagensLogTable)
      .where(eq(whatsappMensagensLogTable.provedorMsgId, provedorMsgId))
      .limit(1);

    if (logs.length > 0 && logs[0].configId) {
      const configs = await db
        .select()
        .from(whatsappConfigTable)
        .where(eq(whatsappConfigTable.id, logs[0].configId))
        .limit(1);

      if (configs.length > 0) {
        const decrypted = decryptConfig(configs[0]);
        return provedor === "TWILIO" ? decrypted.authToken : decrypted.apiKey;
      }
    }
  }

  const configs = await db
    .select()
    .from(whatsappConfigTable)
    .where(eq(whatsappConfigTable.provedor, provedor))
    .limit(1);

  if (configs.length === 0) return null;

  const decrypted = decryptConfig(configs[0]);
  return provedor === "TWILIO" ? decrypted.authToken : decrypted.apiKey;
}
