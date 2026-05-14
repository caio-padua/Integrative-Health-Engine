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

export interface HsmTemplateConfig {
  /** Twilio: Content SID (HX...) do template HSM aprovado pelo Meta. */
  twilioContentSid?: string;
  /** Gupshup: template id (UUID) do HSM aprovado. */
  gupshupTemplateId?: string;
  /** Lista ordenada das chaves de `variaveis` que viram parametros do HSM. */
  ordemVariaveis?: string[];
}

function obterHsmConfig(
  config: WhatsappConfig,
  templateNome: string,
): HsmTemplateConfig | null {
  const meta = (config.metadados as Record<string, unknown> | null) ?? null;
  if (!meta || typeof meta !== "object") return null;
  const hsm = (meta as { hsmTemplates?: Record<string, HsmTemplateConfig> })
    .hsmTemplates;
  if (!hsm || typeof hsm !== "object") return null;
  const entry = hsm[templateNome];
  if (!entry || typeof entry !== "object") return null;
  return entry;
}

function montarParametrosHsm(
  hsm: HsmTemplateConfig,
  variaveis: Record<string, string>,
): string[] {
  const ordem = hsm.ordemVariaveis ?? Object.keys(variaveis);
  return ordem.map((k) => variaveis[k] ?? "");
}

async function enviarViaTwilioHsm(
  config: WhatsappConfig,
  telefone: string,
  hsm: HsmTemplateConfig,
  variaveis: Record<string, string>,
): Promise<EnvioResult> {
  try {
    if (!hsm.twilioContentSid) {
      return { sucesso: false, erro: "twilioContentSid ausente no HSM config" };
    }
    const decrypted = decryptConfig(config);
    const Twilio = (await import("twilio")).default;
    const client = Twilio(decrypted.accountSid!, decrypted.authToken!);

    const params = montarParametrosHsm(hsm, variaveis);
    const contentVariables: Record<string, string> = {};
    params.forEach((v, i) => {
      contentVariables[String(i + 1)] = v;
    });

    const msg = await client.messages.create({
      from: `whatsapp:${config.numeroRemetente}`,
      to: `whatsapp:+${telefone}`,
      contentSid: hsm.twilioContentSid,
      contentVariables: JSON.stringify(contentVariables),
    });

    return { sucesso: true, provedorMsgId: msg.sid };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[WhatsApp/Twilio HSM] Erro ao enviar:", message);
    return { sucesso: false, erro: message };
  }
}

async function enviarViaGupshupHsm(
  config: WhatsappConfig,
  telefone: string,
  hsm: HsmTemplateConfig,
  variaveis: Record<string, string>,
): Promise<EnvioResult> {
  try {
    if (!hsm.gupshupTemplateId) {
      return { sucesso: false, erro: "gupshupTemplateId ausente no HSM config" };
    }
    const decrypted = decryptConfig(config);
    const params = montarParametrosHsm(hsm, variaveis);

    const body = new URLSearchParams({
      channel: "whatsapp",
      source: config.numeroRemetente,
      destination: telefone,
      "src.name": config.nomeExibicao,
      template: JSON.stringify({ id: hsm.gupshupTemplateId, params }),
    });

    const response = await fetch("https://api.gupshup.io/wa/api/v1/template/msg", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "apikey": decrypted.apiKey || "",
      },
      body: body.toString(),
    });

    const data = (await response.json()) as {
      status?: string;
      messageId?: string;
      message?: string;
    };
    if (response.ok && data.status === "submitted") {
      return { sucesso: true, provedorMsgId: data.messageId };
    }
    return { sucesso: false, erro: data.message || JSON.stringify(data) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[WhatsApp/Gupshup HSM] Erro ao enviar:", message);
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

/**
 * Envia mensagem usando template HSM aprovado pelo Meta quando configurado
 * em `whatsapp_config.metadados.hsmTemplates[templateNome]`. Se o HSM nao
 * estiver configurado (ou falhar) e `mensagemFallback` for fornecida, cai
 * pra texto livre.
 *
 * Esse caminho e necessario porque Twilio/Gupshup so aceitam texto livre
 * dentro da janela de 24h apos o destinatario ter mandado mensagem pra clinica.
 * Fora dessa janela (madrugada, fim de semana) o texto livre e bloqueado
 * silenciosamente — somente HSM aprovado entrega.
 */
/**
 * Dispara um HSM usando UMA configuracao especifica (em vez de deixar
 * `obterConfigWhatsapp` escolher). E pra rota de "Testar envio" da tela
 * de templates HSM, onde o usuario quer validar o template que ele acabou
 * de salvar naquela config — independente de a config ser a "ativa" pra
 * unidade dela.
 *
 * Diferente de `enviarComTemplateHsm`, NAO faz fallback pra texto livre:
 * o objetivo do teste e exatamente provar que o HSM aprovado entrega.
 */
export async function enviarHsmComConfig(
  config: WhatsappConfig,
  telefone: string,
  templateNome: string,
  variaveis: Record<string, string>,
): Promise<EnvioResult & { logId?: number }> {
  const hsm = obterHsmConfig(config, templateNome);
  if (!hsm) {
    return {
      sucesso: false,
      erro: `Template HSM '${templateNome}' nao configurado nesta config`,
    };
  }

  const telefoneFormatado = formatarTelefone(telefone);
  const resultado =
    config.provedor === "TWILIO"
      ? await enviarViaTwilioHsm(config, telefoneFormatado, hsm, variaveis)
      : await enviarViaGupshupHsm(config, telefoneFormatado, hsm, variaveis);

  const mensagemRegistro = `[HSM ${templateNome} TESTE] ${JSON.stringify(variaveis)}`;
  const [log] = await db
    .insert(whatsappMensagensLogTable)
    .values({
      configId: config.id,
      provedor: config.provedor,
      provedorMsgId: resultado.provedorMsgId,
      telefoneDestino: telefoneFormatado,
      templateNome,
      mensagem: mensagemRegistro,
      status: resultado.sucesso ? "ENVIADO" : "FALHOU",
      erroDetalhes: resultado.erro,
      enviadoEm: resultado.sucesso ? new Date() : null,
    })
    .returning();

  return { ...resultado, logId: log.id };
}

export async function enviarComTemplateHsm(
  telefone: string,
  templateNome: string,
  variaveis: Record<string, string>,
  options: {
    unidadeId?: number;
    alertaNotificacaoId?: number;
    mensagemFallback?: string;
  } = {},
): Promise<EnvioResult & { logId?: number; viaHsm?: boolean; usouFallback?: boolean }> {
  const config = await obterConfigWhatsapp(options.unidadeId);
  if (!config) {
    if (options.alertaNotificacaoId) {
      await db
        .update(alertasNotificacaoTable)
        .set({ erroEnvio: "Nenhuma configuracao WhatsApp ativa encontrada" })
        .where(eq(alertasNotificacaoTable.id, options.alertaNotificacaoId));
    }
    return { sucesso: false, erro: "Nenhuma configuracao WhatsApp ativa encontrada" };
  }

  const telefoneFormatado = formatarTelefone(telefone);
  const hsm = obterHsmConfig(config, templateNome);

  if (hsm) {
    const resultado = config.provedor === "TWILIO"
      ? await enviarViaTwilioHsm(config, telefoneFormatado, hsm, variaveis)
      : await enviarViaGupshupHsm(config, telefoneFormatado, hsm, variaveis);

    // Quando o envio sai por HSM, registramos no log um marcador
    // explicito ([HSM ...]) com o template e as variaveis usadas, mesmo
    // que exista mensagemFallback. Isso preserva auditoria de "o que
    // realmente saiu pelo provedor" — o texto livre so aparece no log
    // se o fallback for de fato acionado.
    const mensagemRegistro = `[HSM ${templateNome}] ${JSON.stringify(variaveis)}`;

    const [log] = await db.insert(whatsappMensagensLogTable).values({
      configId: config.id,
      alertaNotificacaoId: options.alertaNotificacaoId,
      provedor: config.provedor,
      provedorMsgId: resultado.provedorMsgId,
      telefoneDestino: telefoneFormatado,
      templateNome,
      mensagem: mensagemRegistro,
      status: resultado.sucesso ? "ENVIADO" : "FALHOU",
      erroDetalhes: resultado.erro,
      enviadoEm: resultado.sucesso ? new Date() : null,
    }).returning();

    if (options.alertaNotificacaoId) {
      await db
        .update(alertasNotificacaoTable)
        .set({
          provedorMsgId: resultado.provedorMsgId || null,
          erroEnvio: resultado.erro || null,
          telefoneDestino: telefoneFormatado,
        })
        .where(eq(alertasNotificacaoTable.id, options.alertaNotificacaoId));
    }

    if (resultado.sucesso) {
      return { ...resultado, logId: log.id, viaHsm: true, usouFallback: false };
    }

    if (!options.mensagemFallback) {
      return { ...resultado, logId: log.id, viaHsm: true, usouFallback: false };
    }
    // HSM falhou e tem fallback — segue pro texto livre abaixo.
  }

  if (!options.mensagemFallback) {
    return {
      sucesso: false,
      erro: `Template HSM '${templateNome}' nao configurado para este provedor e nenhum fallback fornecido`,
    };
  }

  const r = await enviarWhatsapp(telefone, options.mensagemFallback, {
    unidadeId: options.unidadeId,
    templateNome,
    alertaNotificacaoId: options.alertaNotificacaoId,
  });
  return { ...r, viaHsm: false, usouFallback: true };
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
