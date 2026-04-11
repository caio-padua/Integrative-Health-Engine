import { Router } from "express";
import {
  db, whatsappConfigTable, whatsappMensagensLogTable,
  alertasNotificacaoTable, insertWhatsappConfigSchema,
} from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  enviarWhatsapp, enviarComTemplate, atualizarStatusWebhook, testarConexaoWhatsapp,
  obterAuthTokenParaValidacao,
} from "../services/whatsappService";
import { TEMPLATES_DISPONIVEIS } from "../services/whatsappTemplates";
import { encryptCredential, isEncrypted } from "../services/credentialEncryption";

type WhatsappMensagemStatus = "PENDENTE" | "ENVIADO" | "ENTREGUE" | "LIDO" | "FALHOU";

function encryptConfigFields(data: Record<string, unknown>): Record<string, unknown> {
  const result = { ...data };
  if (typeof result.authToken === "string" && result.authToken && !isEncrypted(result.authToken)) {
    result.authToken = encryptCredential(result.authToken);
  }
  if (typeof result.apiKey === "string" && result.apiKey && !isEncrypted(result.apiKey)) {
    result.apiKey = encryptCredential(result.apiKey);
  }
  if (typeof result.accountSid === "string" && result.accountSid && !isEncrypted(result.accountSid)) {
    result.accountSid = encryptCredential(result.accountSid);
  }
  return result;
}

const router = Router();

router.get("/whatsapp/config", async (_req, res): Promise<void> => {
  const configs = await db
    .select()
    .from(whatsappConfigTable)
    .orderBy(desc(whatsappConfigTable.criadoEm));

  const safe = configs.map(c => ({
    ...c,
    authToken: c.authToken ? "***configurado***" : null,
    apiKey: c.apiKey ? "***configurado***" : null,
    accountSid: c.accountSid ? "***configurado***" : null,
  }));

  res.json(safe);
});

router.post("/whatsapp/config", async (req, res): Promise<void> => {
  const parsed = insertWhatsappConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ erro: "Dados invalidos", detalhes: parsed.error.issues });
    return;
  }

  const encryptedData = encryptConfigFields(parsed.data as Record<string, unknown>);
  const [config] = await db.insert(whatsappConfigTable).values(encryptedData as typeof parsed.data).returning();
  res.status(201).json({
    ...config,
    authToken: config.authToken ? "***configurado***" : null,
    apiKey: config.apiKey ? "***configurado***" : null,
    accountSid: config.accountSid ? "***configurado***" : null,
  });
});

router.put("/whatsapp/config/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ erro: "ID invalido" }); return; }

  const { provedor, accountSid, authToken, apiKey, numeroRemetente, nomeExibicao, ativo, unidadeId } = req.body;

  const updateData: Partial<typeof whatsappConfigTable.$inferInsert> = {};
  if (provedor !== undefined) updateData.provedor = provedor;
  if (accountSid !== undefined) updateData.accountSid = isEncrypted(accountSid) ? accountSid : encryptCredential(accountSid);
  if (authToken !== undefined) updateData.authToken = isEncrypted(authToken) ? authToken : encryptCredential(authToken);
  if (apiKey !== undefined) updateData.apiKey = isEncrypted(apiKey) ? apiKey : encryptCredential(apiKey);
  if (numeroRemetente !== undefined) updateData.numeroRemetente = numeroRemetente;
  if (nomeExibicao !== undefined) updateData.nomeExibicao = nomeExibicao;
  if (ativo !== undefined) updateData.ativo = ativo;
  if (unidadeId !== undefined) updateData.unidadeId = unidadeId;

  const [updated] = await db
    .update(whatsappConfigTable)
    .set(updateData)
    .where(eq(whatsappConfigTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ erro: "Configuracao nao encontrada" }); return; }

  res.json({
    ...updated,
    authToken: updated.authToken ? "***configurado***" : null,
    apiKey: updated.apiKey ? "***configurado***" : null,
    accountSid: updated.accountSid ? "***configurado***" : null,
  });
});

router.delete("/whatsapp/config/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ erro: "ID invalido" }); return; }

  const [deleted] = await db
    .delete(whatsappConfigTable)
    .where(eq(whatsappConfigTable.id, id))
    .returning();

  if (!deleted) { res.status(404).json({ erro: "Configuracao nao encontrada" }); return; }
  res.json({ sucesso: true });
});

router.post("/whatsapp/config/:id/testar", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ erro: "ID invalido" }); return; }

  const resultado = await testarConexaoWhatsapp(id);
  res.json(resultado);
});

router.post("/whatsapp/enviar", async (req, res): Promise<void> => {
  const { telefone, mensagem, unidadeId, templateNome, alertaNotificacaoId, templateDados } = req.body;

  if (!telefone) {
    res.status(400).json({ erro: "telefone e obrigatorio" });
    return;
  }

  let resultado;
  if (templateNome && templateDados) {
    resultado = await enviarComTemplate(telefone, templateNome, templateDados, {
      unidadeId,
      alertaNotificacaoId,
    });
  } else if (mensagem) {
    resultado = await enviarWhatsapp(telefone, mensagem, {
      unidadeId,
      templateNome,
      alertaNotificacaoId,
    });
  } else {
    res.status(400).json({ erro: "mensagem ou (templateNome + templateDados) sao obrigatorios" });
    return;
  }

  if (resultado.sucesso) {
    res.json(resultado);
  } else {
    res.status(500).json(resultado);
  }
});

router.post("/whatsapp/enviar-teste", async (req, res): Promise<void> => {
  const { configId, telefone } = req.body;
  if (!configId || !telefone) {
    res.status(400).json({ erro: "configId e telefone sao obrigatorios" });
    return;
  }

  const configs = await db
    .select()
    .from(whatsappConfigTable)
    .where(eq(whatsappConfigTable.id, configId));

  if (configs.length === 0) {
    res.status(404).json({ erro: "Configuracao nao encontrada" });
    return;
  }

  const config = configs[0];
  const mensagemTeste = "Teste de conexao WhatsApp — Clinica Padua PADCOM\n\nEsta e uma mensagem de teste. Se voce recebeu, a integracao esta funcionando!\n\n" + new Date().toLocaleString("pt-BR");

  const telefoneFormatado = telefone.replace(/\D/g, "");
  const telefoneInt = telefoneFormatado.startsWith("55") ? telefoneFormatado : `55${telefoneFormatado}`;

  const { decryptCredential } = await import("../services/credentialEncryption");

  let resultado: { sucesso: boolean; provedorMsgId?: string; erro?: string };
  if (config.provedor === "TWILIO") {
    try {
      const Twilio = (await import("twilio")).default;
      const client = Twilio(
        decryptCredential(config.accountSid!),
        decryptCredential(config.authToken!),
      );
      const msg = await client.messages.create({
        body: mensagemTeste,
        from: `whatsapp:${config.numeroRemetente}`,
        to: `whatsapp:+${telefoneInt}`,
      });
      resultado = { sucesso: true, provedorMsgId: msg.sid };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      resultado = { sucesso: false, erro: message };
    }
  } else {
    try {
      const params = new URLSearchParams({
        channel: "whatsapp",
        source: config.numeroRemetente,
        destination: telefoneInt,
        "src.name": config.nomeExibicao,
        message: JSON.stringify({ type: "text", text: mensagemTeste }),
      });
      const response = await fetch("https://api.gupshup.io/wa/api/v1/msg", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "apikey": decryptCredential(config.apiKey || ""),
        },
        body: params.toString(),
      });
      const data = await response.json();
      resultado = response.ok && data.status === "submitted"
        ? { sucesso: true, provedorMsgId: data.messageId }
        : { sucesso: false, erro: data.message || JSON.stringify(data) };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      resultado = { sucesso: false, erro: message };
    }
  }

  await db.insert(whatsappMensagensLogTable).values({
    configId: config.id,
    provedor: config.provedor,
    provedorMsgId: resultado.provedorMsgId || null,
    telefoneDestino: telefoneInt,
    templateNome: "TESTE_CONEXAO",
    mensagem: mensagemTeste,
    status: resultado.sucesso ? "ENVIADO" : "FALHOU",
    erroDetalhes: resultado.erro || null,
    enviadoEm: resultado.sucesso ? new Date() : null,
  });

  res.json(resultado);
});

router.get("/whatsapp/templates", async (_req, res): Promise<void> => {
  res.json(TEMPLATES_DISPONIVEIS.map(t => ({ nome: t.nome, descricao: t.descricao })));
});

router.get("/whatsapp/mensagens", async (req, res): Promise<void> => {
  const { limite = "50", offset = "0", status } = req.query;

  const conditions = [];
  if (status) {
    const statusStr = String(status) as WhatsappMensagemStatus;
    conditions.push(eq(whatsappMensagensLogTable.status, statusStr));
  }

  const mensagens = await db
    .select()
    .from(whatsappMensagensLogTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(whatsappMensagensLogTable.criadoEm))
    .limit(Number(limite))
    .offset(Number(offset));

  res.json(mensagens);
});

router.get("/whatsapp/mensagens/stats", async (_req, res): Promise<void> => {
  const porStatus = await db
    .select({
      status: whatsappMensagensLogTable.status,
      total: sql<number>`count(*)::int`,
    })
    .from(whatsappMensagensLogTable)
    .groupBy(whatsappMensagensLogTable.status);

  const porProvedor = await db
    .select({
      provedor: whatsappMensagensLogTable.provedor,
      total: sql<number>`count(*)::int`,
    })
    .from(whatsappMensagensLogTable)
    .groupBy(whatsappMensagensLogTable.provedor);

  const totalHoje = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(whatsappMensagensLogTable)
    .where(sql`${whatsappMensagensLogTable.criadoEm} >= CURRENT_DATE`);

  res.json({
    porStatus,
    porProvedor,
    totalHoje: totalHoje[0]?.total ?? 0,
  });
});

router.post("/webhooks/whatsapp/status", async (req, res): Promise<void> => {
  const body = req.body;

  const isTwilioPayload = !!(body.MessageSid || body.SmsStatus);
  const isGupshupPayload = !!(body.type === "message-event" || body.payload);

  if (isTwilioPayload) {
    const twilioSignature = req.headers["x-twilio-signature"];
    if (!twilioSignature) {
      console.warn("[WhatsApp/Webhook] Callback Twilio sem assinatura — rejeitando");
      res.sendStatus(403);
      return;
    }

    try {
      const authToken = await obterAuthTokenParaValidacao("TWILIO", body.MessageSid);
      if (authToken) {
        const { validateRequest } = await import("twilio");
        const webhookUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
        const isValid = validateRequest(authToken, String(twilioSignature), webhookUrl, body);
        if (!isValid) {
          console.warn("[WhatsApp/Webhook] Assinatura Twilio invalida — rejeitando");
          res.sendStatus(403);
          return;
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[WhatsApp/Webhook] Erro ao validar assinatura Twilio:", message);
      res.sendStatus(403);
      return;
    }

    const msgId = body.MessageSid;
    const twilioStatus = body.MessageStatus || body.SmsStatus;

    let novoStatus: "ENTREGUE" | "LIDO" | "FALHOU";
    if (twilioStatus === "delivered") novoStatus = "ENTREGUE";
    else if (twilioStatus === "read") novoStatus = "LIDO";
    else if (["failed", "undelivered"].includes(twilioStatus)) novoStatus = "FALHOU";
    else { res.sendStatus(200); return; }

    await atualizarStatusWebhook(msgId, novoStatus, twilioStatus === "failed" ? body.ErrorMessage : undefined);

    if (msgId) {
      const logs = await db
        .select()
        .from(whatsappMensagensLogTable)
        .where(eq(whatsappMensagensLogTable.provedorMsgId, msgId));

      if (logs.length > 0 && logs[0].alertaNotificacaoId) {
        const alertaStatus = novoStatus === "FALHOU" ? "EXPIRADO" : novoStatus === "LIDO" ? "LIDO" : "ENTREGUE";
        await db
          .update(alertasNotificacaoTable)
          .set({
            status: alertaStatus,
            provedorMsgId: msgId,
          })
          .where(eq(alertasNotificacaoTable.id, logs[0].alertaNotificacaoId));
      }
    }

    res.sendStatus(200);
    return;
  }

  if (isGupshupPayload) {
    const gupshupApiKey = req.headers["apikey"] || req.headers["x-api-key"];
    if (!gupshupApiKey) {
      console.warn("[WhatsApp/Webhook] Callback Gupshup sem apikey — rejeitando");
      res.sendStatus(403);
      return;
    }

    const gupshupPayload = body.payload || body;
    const gupshupMsgId = gupshupPayload.id || gupshupPayload.gsId;
    const storedApiKey = await obterAuthTokenParaValidacao("GUPSHUP", gupshupMsgId);
    if (storedApiKey && String(gupshupApiKey) !== storedApiKey) {
      console.warn("[WhatsApp/Webhook] Apikey Gupshup invalida — rejeitando");
      res.sendStatus(403);
      return;
    }

    const msgId = gupshupMsgId;
    const gupshupType = gupshupPayload.type || body.type;

    let novoStatus: "ENTREGUE" | "LIDO" | "FALHOU" | undefined;
    if (gupshupType === "delivered") novoStatus = "ENTREGUE";
    else if (gupshupType === "read") novoStatus = "LIDO";
    else if (gupshupType === "failed" || gupshupType === "error") novoStatus = "FALHOU";

    if (novoStatus && msgId) {
      await atualizarStatusWebhook(msgId, novoStatus, gupshupPayload.failedReason);

      const logs = await db
        .select()
        .from(whatsappMensagensLogTable)
        .where(eq(whatsappMensagensLogTable.provedorMsgId, msgId));

      if (logs.length > 0 && logs[0].alertaNotificacaoId) {
        const alertaStatus = novoStatus === "FALHOU" ? "EXPIRADO" : novoStatus === "LIDO" ? "LIDO" : "ENTREGUE";
        await db
          .update(alertasNotificacaoTable)
          .set({
            status: alertaStatus,
            provedorMsgId: msgId,
          })
          .where(eq(alertasNotificacaoTable.id, logs[0].alertaNotificacaoId));
      }
    }

    res.sendStatus(200);
    return;
  }

  console.warn("[WhatsApp/Webhook] Payload nao reconhecido — rejeitando");
  res.sendStatus(400);
});

export default router;
