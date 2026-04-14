import { Router } from "express";
import {
  db, whatsappConfigTable, whatsappMensagensLogTable,
  alertasNotificacaoTable, insertWhatsappConfigSchema,
} from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  enviarWhatsapp, enviarComTemplate, atualizarStatusWebhook, testarConexaoWhatsapp,
  obterAuthTokenParaValidacao, obterConfigWhatsapp,
} from "../services/whatsappService";
import { TEMPLATES_DISPONIVEIS } from "../services/whatsappTemplates";
import { encryptCredential, isEncrypted } from "../services/credentialEncryption";
import { decryptCredential } from "../services/credentialEncryption";
import { gerarPdfRAS } from "../pdf/gerarRAS";

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
  const mensagemTeste = "Teste de conexao WhatsApp — Instituto Padua | Pawards\n\nEsta e uma mensagem de teste. Se voce recebeu, a integracao esta funcionando!\n\n" + new Date().toLocaleString("pt-BR");

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

router.get("/whatsapp/demo-ras.pdf", async (_req, res): Promise<void> => {
  try {
    const dadosDemo = {
      nomePaciente: "Maria Helena Oliveira Santos",
      cpfPaciente: "123.456.789-00",
      celularPaciente: "11946554000",
      idadePaciente: 42,
      medicoResponsavel: "Dr. Caio Padua",
      crmMedico: "CRM-SP 123456",
      enfermeira: "Ana Paula Ribeiro",
      agenda: "Clinica Padua — Unidade Jardins",
      unidadeEndereco: "Rua Oscar Freire, 1234 — Jardins, Sao Paulo/SP",
      dataAtendimento: "2026-04-12",
      nomeProtocolo: "Protocolo Anti-aging Premium",
      substancias: [
        {
          nome: "Vitamina C", abreviacao: "VIT C", qtde: 10, frequenciaDias: 7,
          dataInicio: "2026-04-12", via: "iv", cor: "#FF6B35", dosePadrao: "25g",
          categoria: "Antioxidante", descricao: "Acido ascorbico endovenoso em alta dose",
          funcaoPrincipal: "Antioxidante potente, estimula producao de colageno",
          efeitosPercebidos: "Mais energia, pele mais luminosa, menos gripes",
          tempoParaEfeito: "2-3 semanas", beneficioLongevidade: "Alto",
          impactoQualidadeVida: "Significativo", beneficioSono: "Moderado",
          beneficioEnergia: "Alto", beneficioLibido: "Leve",
          performanceFisica: "Moderado", forcaMuscular: "Leve",
          clarezaMental: "Moderado", peleCabeloUnhas: "Alto",
          suporteImunologico: "Muito Alto", contraindicacoes: "Deficiencia de G6PD, insuficiencia renal",
          evidenciaCientifica: "Nivel A — Meta-analises disponiveis",
          efeitosSistemasCorporais: { cardiovascular: 15, neurologico: 10, metabolismo: 25, imunologico: 40, endocrino: 5, dermatologico: 35 },
        },
        {
          nome: "Glutationa", abreviacao: "GLUT", qtde: 10, frequenciaDias: 7,
          dataInicio: "2026-04-12", via: "iv", cor: "#4ECDC4", dosePadrao: "600mg",
          categoria: "Detoxificante", descricao: "Master antioxidante endovenoso",
          funcaoPrincipal: "Detoxificacao hepatica, antioxidante master",
          efeitosPercebidos: "Pele mais clara, mais disposicao, melhor digestao",
          tempoParaEfeito: "3-4 semanas", beneficioLongevidade: "Muito Alto",
          impactoQualidadeVida: "Alto", beneficioSono: "Moderado",
          beneficioEnergia: "Alto", beneficioLibido: "Moderado",
          performanceFisica: "Moderado", forcaMuscular: "Leve",
          clarezaMental: "Alto", peleCabeloUnhas: "Muito Alto",
          suporteImunologico: "Alto", contraindicacoes: "Hipersensibilidade conhecida",
          evidenciaCientifica: "Nivel B — Estudos clinicos robustos",
          efeitosSistemasCorporais: { cardiovascular: 10, neurologico: 20, metabolismo: 30, imunologico: 25, hepatico: 45, dermatologico: 40 },
        },
        {
          nome: "NAD+", abreviacao: "NAD+", qtde: 8, frequenciaDias: 14,
          dataInicio: "2026-04-12", via: "iv", cor: "#7B68EE", dosePadrao: "250mg",
          categoria: "Longevidade", descricao: "Nicotinamida adenina dinucleotideo",
          funcaoPrincipal: "Reparo celular, anti-envelhecimento, energia mitocondrial",
          efeitosPercebidos: "Clareza mental, mais energia, melhor recuperacao",
          tempoParaEfeito: "1-2 semanas", beneficioLongevidade: "Excepcional",
          impactoQualidadeVida: "Muito Alto", beneficioSono: "Alto",
          beneficioEnergia: "Muito Alto", beneficioLibido: "Moderado",
          performanceFisica: "Alto", forcaMuscular: "Moderado",
          clarezaMental: "Excepcional", peleCabeloUnhas: "Moderado",
          suporteImunologico: "Moderado", contraindicacoes: "Infusao lenta obrigatoria",
          evidenciaCientifica: "Nivel A — Estudos de longevidade",
          efeitosSistemasCorporais: { cardiovascular: 20, neurologico: 45, metabolismo: 35, imunologico: 15, endocrino: 20, musculoesqueletico: 25 },
        },
        {
          nome: "Complexo B", abreviacao: "CX B", qtde: 10, frequenciaDias: 7,
          dataInicio: "2026-04-12", via: "im", cor: "#2196F3", dosePadrao: "2mL",
          categoria: "Neurotropico", descricao: "Complexo vitaminico B1, B6, B12",
          funcaoPrincipal: "Suporte neurologico, energia celular",
          efeitosPercebidos: "Menos cansaco, melhor humor, formigamento reduzido",
          tempoParaEfeito: "1 semana", beneficioLongevidade: "Moderado",
          impactoQualidadeVida: "Alto", beneficioSono: "Moderado",
          beneficioEnergia: "Alto", beneficioLibido: "Leve",
          performanceFisica: "Moderado", forcaMuscular: "Leve",
          clarezaMental: "Alto", peleCabeloUnhas: "Moderado",
          suporteImunologico: "Moderado", contraindicacoes: "Alergia a cobalamina",
          evidenciaCientifica: "Nivel A — Amplamente documentado",
          efeitosSistemasCorporais: { cardiovascular: 10, neurologico: 40, metabolismo: 20, imunologico: 15, endocrino: 10, musculoesqueletico: 10 },
        },
      ],
      marcacoes: Array.from({ length: 20 }, (_, i) => {
        const baseDate = new Date("2026-04-12");
        const prevDate = new Date(baseDate);
        prevDate.setDate(prevDate.getDate() + i * 7);
        const isCompleted = i < 3;
        return {
          numero: i + 1,
          dataPrevista: prevDate.toISOString().split("T")[0],
          dataEfetiva: isCompleted ? prevDate.toISOString().split("T")[0] : "",
          statusPorSubstancia: [
            { substanciaIndex: 0, numeroSessao: i + 1, totalSessoes: 10, status: isCompleted ? "aplicada" : "pendente" },
            { substanciaIndex: 1, numeroSessao: i + 1, totalSessoes: 10, status: isCompleted ? "aplicada" : "pendente" },
            ...(i % 2 === 0 ? [{ substanciaIndex: 2, numeroSessao: Math.floor(i / 2) + 1, totalSessoes: 8, status: isCompleted ? "aplicada" : "pendente" }] : []),
            { substanciaIndex: 3, numeroSessao: i + 1, totalSessoes: 10, status: isCompleted ? "aplicada" : "pendente" },
          ],
        };
      }),
      tratamentoFinanceiro: {
        nome: "Protocolo Anti-aging Premium — 10 semanas",
        valorBruto: 18500.00,
        desconto: 1850.00,
        valorFinal: 16650.00,
        numeroParcelas: 6,
        dataInicio: "2026-04-12",
        itens: [
          { descricao: "Vitamina C 25g — 10 sessoes IV", tipo: "substancia", quantidade: 10, valorUnitario: 350.00, valorTotal: 3500.00 },
          { descricao: "Glutationa 600mg — 10 sessoes IV", tipo: "substancia", quantidade: 10, valorUnitario: 420.00, valorTotal: 4200.00 },
          { descricao: "NAD+ 250mg — 8 sessoes IV", tipo: "substancia", quantidade: 8, valorUnitario: 650.00, valorTotal: 5200.00 },
          { descricao: "Complexo B — 10 sessoes IM", tipo: "substancia", quantidade: 10, valorUnitario: 80.00, valorTotal: 800.00 },
          { descricao: "Kit insumos descartaveis (seringas, equipos, scalps)", tipo: "insumo", quantidade: 10, valorUnitario: 85.00, valorTotal: 850.00 },
          { descricao: "Honorarios de enfermagem — sala de infusao", tipo: "honorario_enfermagem", quantidade: 10, valorUnitario: 150.00, valorTotal: 1500.00 },
          { descricao: "Taxa administrativa e logistica", tipo: "taxa_administrativa", quantidade: 1, valorUnitario: 950.00, valorTotal: 950.00 },
          { descricao: "Reserva tecnica e emergencia", tipo: "reserva_tecnica", quantidade: 1, valorUnitario: 1500.00, valorTotal: 1500.00 },
        ],
      },
    };

    const pdfBuffer = await gerarPdfRAS(dadosDemo);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="RAS_DEMO_Maria_Helena_2026-04-12.pdf"');
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(pdfBuffer);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[WhatsApp] Erro ao gerar RAS demo:", message);
    res.status(500).json({ erro: "Erro ao gerar PDF demo", detalhes: message });
  }
});

router.post("/whatsapp/enviar-pdf", async (req, res): Promise<void> => {
  const { telefone, mediaUrl, mensagem, unidadeId } = req.body;
  if (!telefone || !mediaUrl) {
    res.status(400).json({ erro: "telefone e mediaUrl sao obrigatorios" });
    return;
  }

  const config = await obterConfigWhatsapp(unidadeId ? Number(unidadeId) : undefined);
  if (!config) {
    res.status(404).json({ erro: "Nenhuma configuracao WhatsApp ativa" });
    return;
  }

  try {
    const decrypted = {
      accountSid: config.accountSid ? decryptCredential(config.accountSid) : null,
      authToken: config.authToken ? decryptCredential(config.authToken) : null,
    };

    const telefoneFormatado = telefone.replace(/\D/g, "").startsWith("55")
      ? telefone.replace(/\D/g, "")
      : `55${telefone.replace(/\D/g, "")}`;

    if (config.provedor === "TWILIO") {
      const Twilio = (await import("twilio")).default;
      const client = Twilio(decrypted.accountSid!, decrypted.authToken!);
      const msg = await client.messages.create({
        body: mensagem || "Documento — Instituto Padua | Pawards",
        from: `whatsapp:${config.numeroRemetente}`,
        to: `whatsapp:+${telefoneFormatado}`,
        mediaUrl: [mediaUrl],
      });

      await db.insert(whatsappMensagensLogTable).values({
        configId: config.id,
        provedor: config.provedor,
        provedorMsgId: msg.sid,
        telefoneDestino: telefoneFormatado,
        templateNome: "PDF_DOCUMENTO",
        mensagem: mensagem || "Documento PDF enviado",
        status: "ENVIADO",
        enviadoEm: new Date(),
      });

      res.json({ sucesso: true, provedorMsgId: msg.sid });
    } else {
      res.status(400).json({ erro: "Envio de PDF via Gupshup nao implementado ainda" });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[WhatsApp] Erro ao enviar PDF:", message);
    res.status(500).json({ sucesso: false, erro: message });
  }
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
