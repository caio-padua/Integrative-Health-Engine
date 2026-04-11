import { db, whatsappConfigTable, whatsappMensagensLogTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export interface EnvioResult {
  sucesso: boolean;
  provedorMsgId?: string;
  erro?: string;
}

async function enviarViaTwilio(
  config: typeof whatsappConfigTable.$inferSelect,
  telefone: string,
  mensagem: string,
): Promise<EnvioResult> {
  try {
    const Twilio = (await import("twilio")).default;
    const client = Twilio(config.accountSid!, config.authToken!);

    const msg = await client.messages.create({
      body: mensagem,
      from: `whatsapp:${config.numeroRemetente}`,
      to: `whatsapp:+${telefone}`,
    });

    return { sucesso: true, provedorMsgId: msg.sid };
  } catch (err: any) {
    console.error("[WhatsApp/Twilio] Erro ao enviar:", err.message);
    return { sucesso: false, erro: err.message };
  }
}

async function enviarViaGupshup(
  config: typeof whatsappConfigTable.$inferSelect,
  telefone: string,
  mensagem: string,
): Promise<EnvioResult> {
  try {
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
        "apikey": config.apiKey || "",
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (response.ok && data.status === "submitted") {
      return { sucesso: true, provedorMsgId: data.messageId };
    }

    return { sucesso: false, erro: data.message || JSON.stringify(data) };
  } catch (err: any) {
    console.error("[WhatsApp/Gupshup] Erro ao enviar:", err.message);
    return { sucesso: false, erro: err.message };
  }
}

function formatarTelefone(telefone: string): string {
  const limpo = telefone.replace(/\D/g, "");
  return limpo.startsWith("55") ? limpo : `55${limpo}`;
}

export async function obterConfigWhatsapp(unidadeId?: number) {
  const conditions = [eq(whatsappConfigTable.ativo, true)];
  if (unidadeId) {
    conditions.push(eq(whatsappConfigTable.unidadeId, unidadeId));
  }

  const configs = await db
    .select()
    .from(whatsappConfigTable)
    .where(and(...conditions))
    .limit(1);

  if (configs.length === 0 && unidadeId) {
    const globalConfigs = await db
      .select()
      .from(whatsappConfigTable)
      .where(eq(whatsappConfigTable.ativo, true))
      .limit(1);
    return globalConfigs[0] || null;
  }

  return configs[0] || null;
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

  return {
    ...resultado,
    logId: log.id,
  };
}

export async function atualizarStatusWebhook(
  provedorMsgId: string,
  novoStatus: "ENTREGUE" | "LIDO" | "FALHOU",
  erroDetalhes?: string,
): Promise<boolean> {
  const updateData: Record<string, any> = { status: novoStatus };
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

  if (config.provedor === "TWILIO") {
    try {
      const Twilio = (await import("twilio")).default;
      const client = Twilio(config.accountSid!, config.authToken!);
      await client.api.accounts(config.accountSid!).fetch();
      return { sucesso: true, provedor: "TWILIO" };
    } catch (err: any) {
      return { sucesso: false, provedor: "TWILIO", erro: err.message };
    }
  } else {
    try {
      const response = await fetch("https://api.gupshup.io/wa/api/v1/wallet/balance", {
        headers: { "apikey": config.apiKey || "" },
      });
      if (response.ok) {
        return { sucesso: true, provedor: "GUPSHUP" };
      }
      const data = await response.json();
      return { sucesso: false, provedor: "GUPSHUP", erro: data.message || "Falha na autenticacao" };
    } catch (err: any) {
      return { sucesso: false, provedor: "GUPSHUP", erro: err.message };
    }
  }
}
