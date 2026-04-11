/**
 * GAP 5: ROTAS DE ALERTAS TWILIO
 * ===============================
 * Arquivo: artifacts/api-server/src/routes/alertas.ts
 * 
 * Rotas para gerenciar alertas via WhatsApp/Twilio:
 * - POST /alertas — Criar alerta (interno, dispara Twilio)
 * - GET /alertas — Listar alertas do usuário
 * - POST /alertas/:id/ack — Confirmar leitura
 * - GET /alertas/stats — Estatísticas
 * - POST /webhooks/twilio/status — Webhook de status Twilio
 */

import { Router } from "express";
import { db, alertasTwilioTable, usuariosTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { 
  criarAlertaTwilio, 
  formatarMensagemTwilio, 
  mapearStatusTwilio,
  verificarSeExpirou,
  calcularTempoRestanteAlerta 
} from "@workspace/db/schema";

// Importar Twilio (instalar com: npm install twilio)
// import twilio from 'twilio';
// const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const router = Router();

// ========== POST /alertas — Criar alerta (interno, dispara Twilio) ==========
router.post("/alertas", async (req, res): Promise<void> => {
  const { 
    tipo, 
    destinatarioId, 
    numeroWhatsapp, 
    mensagem, 
    linkAcao,
    detalhes 
  } = req.body;
  
  if (!tipo || !destinatarioId || !numeroWhatsapp) {
    res.status(400).json({ 
      error: "tipo, destinatarioId e numeroWhatsapp são obrigatórios" 
    });
    return;
  }
  
  try {
    // Formatar mensagem se detalhes foram fornecidos
    const mensagemFinal = detalhes 
      ? formatarMensagemTwilio(tipo, detalhes)
      : mensagem;
    
    // Criar entrada no banco
    const alertaData = criarAlertaTwilio(
      tipo,
      destinatarioId,
      numeroWhatsapp,
      mensagemFinal,
      linkAcao
    );
    
    const [alerta] = await db.insert(alertasTwilioTable).values(alertaData).returning();
    
    // TODO: Enviar via Twilio
    // try {
    //   const message = await client.messages.create({
    //     body: `${mensagemFinal}\n\n${linkAcao ? `Link: ${linkAcao}` : ''}`,
    //     from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
    //     to: `whatsapp:+55${numeroWhatsapp}`,
    //     statusCallback: `${process.env.BASE_URL}/webhooks/twilio/status`,
    //   });
    //   
    //   // Atualizar com Twilio SID
    //   await db
    //     .update(alertasTwilioTable)
    //     .set({ twilioSid: message.sid })
    //     .where(eq(alertasTwilioTable.id, alerta.id));
    // } catch (twilioError: any) {
    //   console.error("Erro ao enviar via Twilio:", twilioError);
    // }
    
    res.status(201).json(alerta);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== GET /alertas — Listar alertas do usuário ==========
router.get("/alertas", async (req, res): Promise<void> => {
  const { destinatarioId, status } = req.query;
  
  if (!destinatarioId) {
    res.status(400).json({ error: "destinatarioId é obrigatório" });
    return;
  }
  
  try {
    const conditions: any[] = [
      eq(alertasTwilioTable.destinatarioId, Number(destinatarioId))
    ];
    
    if (status) {
      conditions.push(eq(alertasTwilioTable.status, String(status)));
    }
    
    const alertas = await db
      .select({
        alerta: alertasTwilioTable,
        usuarioNome: usuariosTable.nome,
      })
      .from(alertasTwilioTable)
      .leftJoin(usuariosTable, eq(alertasTwilioTable.confirmadoPorId, usuariosTable.id))
      .where(and(...conditions))
      .orderBy(sql`${alertasTwilioTable.enviadoEm} DESC`);
    
    // Adicionar tempo restante
    const alertasComTempo = alertas.map(a => {
      const tempoRestante = calcularTempoRestanteAlerta(a.alerta.expiraEm);
      const expirou = verificarSeExpirou(a.alerta);
      
      return {
        ...a,
        tempoRestante,
        expirou,
      };
    });
    
    res.json(alertasComTempo);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== GET /alertas/:id — Detalhe de um alerta ==========
router.get("/alertas/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  
  try {
    const [alerta] = await db
      .select({
        alerta: alertasTwilioTable,
        usuarioNome: usuariosTable.nome,
      })
      .from(alertasTwilioTable)
      .leftJoin(usuariosTable, eq(alertasTwilioTable.confirmadoPorId, usuariosTable.id))
      .where(eq(alertasTwilioTable.id, id));
    
    if (!alerta) {
      res.status(404).json({ error: "Alerta não encontrado" });
      return;
    }
    
    const tempoRestante = calcularTempoRestanteAlerta(alerta.alerta.expiraEm);
    const expirou = verificarSeExpirou(alerta.alerta);
    
    res.json({
      ...alerta,
      tempoRestante,
      expirou,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== POST /alertas/:id/ack — Confirmar leitura ==========
router.post("/alertas/:id/ack", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { confirmadoPorId } = req.body;
  
  if (!confirmadoPorId) {
    res.status(400).json({ error: "confirmadoPorId é obrigatório" });
    return;
  }
  
  try {
    const [alerta] = await db
      .update(alertasTwilioTable)
      .set({
        status: "CONFIRMADO",
        confirmadoEm: new Date(),
        confirmadoPorId,
      })
      .where(eq(alertasTwilioTable.id, id))
      .returning();
    
    if (!alerta) {
      res.status(404).json({ error: "Alerta não encontrado" });
      return;
    }
    
    res.json(alerta);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== GET /alertas/stats — Estatísticas ==========
router.get("/alertas/stats", async (_req, res): Promise<void> => {
  try {
    const stats = await db
      .select({
        status: alertasTwilioTable.status,
        count: sql<number>`count(*)`,
      })
      .from(alertasTwilioTable)
      .groupBy(alertasTwilioTable.status);
    
    // Contar expirados
    const expirados = await db
      .select({ count: sql<number>`count(*)` })
      .from(alertasTwilioTable)
      .where(sql`${alertasTwilioTable.expiraEm} < NOW()`);
    
    // Contar não confirmados
    const naoConfirmados = await db
      .select({ count: sql<number>`count(*)` })
      .where(sql`${alertasTwilioTable.status} IN ('ENVIADO', 'ENTREGUE', 'LIDO')`)
      .from(alertasTwilioTable);
    
    res.json({
      por_status: stats,
      expirados: Number(expirados[0]?.count || 0),
      nao_confirmados: Number(naoConfirmados[0]?.count || 0),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== POST /webhooks/twilio/status — Webhook de status Twilio ==========
/**
 * Webhook recebido do Twilio quando o status da mensagem muda
 * 
 * Twilio envia:
 * - MessageSid: ID único da mensagem
 * - MessageStatus: queued, sent, delivered, read, failed, undelivered
 */
router.post("/webhooks/twilio/status", async (req, res): Promise<void> => {
  const { MessageSid, MessageStatus } = req.body;
  
  if (!MessageSid || !MessageStatus) {
    res.status(400).json({ error: "MessageSid e MessageStatus são obrigatórios" });
    return;
  }
  
  try {
    // Mapear status Twilio para nosso status
    const novoStatus = mapearStatusTwilio(MessageStatus);
    
    // Atualizar no banco
    await db
      .update(alertasTwilioTable)
      .set({ 
        twilioStatus: MessageStatus,
        status: novoStatus as any,
        entregueEm: MessageStatus === "delivered" ? new Date() : undefined,
      })
      .where(eq(alertasTwilioTable.twilioSid, MessageSid));
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao processar webhook Twilio:", error);
    res.status(500).json({ error: error.message });
  }
});

// ========== POST /alertas/limpar-expirados — Limpar alertas expirados ==========
/**
 * Rota auxiliar para limpar alertas expirados
 * Deve ser chamada por um job/cron diariamente
 */
router.post("/alertas/limpar-expirados", async (_req, res): Promise<void> => {
  try {
    const agora = new Date();
    
    // Atualizar status de alertas expirados
    const result = await db
      .update(alertasTwilioTable)
      .set({ status: "EXPIRADO" })
      .where(and(
        sql`${alertasTwilioTable.expiraEm} < ${agora}`,
        sql`${alertasTwilioTable.status} != 'CONFIRMADO'`
      ));
    
    res.json({
      expirados_marcados: result.rowCount || 0,
      timestamp: new Date(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
