import { Router } from "express";
import {
  db, alertasNotificacaoTable, usuariosTable,
  criarAlerta, calcularTempoRestante,
} from "@workspace/db";
import { eq, and, desc, sql, type SQL } from "drizzle-orm";
import { enviarWhatsapp } from "../services/whatsappService";

const router = Router();

router.post("/alertas", async (req, res): Promise<void> => {
  const { tipo, destinatarioId, mensagem, linkAcao, horasExpiracao, canal, telefoneDestino, unidadeId } = req.body;

  if (!tipo || !destinatarioId || !mensagem) {
    res.status(400).json({ error: "tipo, destinatarioId e mensagem sao obrigatorios" });
    return;
  }

  const canalFinal = canal || "SISTEMA";
  const dados = criarAlerta(tipo, destinatarioId, mensagem, linkAcao, horasExpiracao, canalFinal);

  if (canalFinal === "WHATSAPP" && telefoneDestino) {
    dados.telefoneDestino = telefoneDestino;
  }

  const [alerta] = await db.insert(alertasNotificacaoTable).values(dados).returning();

  if (canalFinal === "WHATSAPP" && telefoneDestino) {
    const resultado = await enviarWhatsapp(telefoneDestino, mensagem, {
      alertaNotificacaoId: alerta.id,
      templateNome: tipo,
      unidadeId: unidadeId ? Number(unidadeId) : undefined,
    });

    if (!resultado.sucesso) {
      console.warn(`[Alertas] Falha ao enviar WhatsApp para alerta ${alerta.id}: ${resultado.erro}`);
    }

    const alertaAtualizado = await db
      .select()
      .from(alertasNotificacaoTable)
      .where(eq(alertasNotificacaoTable.id, alerta.id))
      .limit(1);

    res.status(201).json(alertaAtualizado[0] || alerta);
    return;
  }

  res.status(201).json(alerta);
});

router.get("/alertas", async (req, res): Promise<void> => {
  const { destinatarioId, status } = req.query;

  if (!destinatarioId) {
    res.status(400).json({ error: "destinatarioId e obrigatorio" });
    return;
  }

  const conditions: SQL[] = [
    eq(alertasNotificacaoTable.destinatarioId, Number(destinatarioId)),
  ];
  if (status) {
    const statusStr = String(status) as typeof alertasNotificacaoTable.$inferSelect.status;
    conditions.push(eq(alertasNotificacaoTable.status, statusStr));
  }

  const alertas = await db
    .select({
      alerta: alertasNotificacaoTable,
      confirmadoPorNome: usuariosTable.nome,
    })
    .from(alertasNotificacaoTable)
    .leftJoin(usuariosTable, eq(alertasNotificacaoTable.confirmadoPorId, usuariosTable.id))
    .where(and(...conditions))
    .orderBy(desc(alertasNotificacaoTable.enviadoEm));

  const resultado = alertas.map(a => ({
    ...a.alerta,
    confirmadoPorNome: a.confirmadoPorNome,
    tempoRestante: calcularTempoRestante(a.alerta.expiraEm),
  }));

  res.json(resultado);
});

router.post("/alertas/:id/confirmar", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { confirmadoPorId } = req.body;

  if (!confirmadoPorId) {
    res.status(400).json({ error: "confirmadoPorId e obrigatorio" });
    return;
  }

  const [alerta] = await db
    .update(alertasNotificacaoTable)
    .set({
      status: "CONFIRMADO",
      confirmadoEm: new Date(),
      confirmadoPorId,
    })
    .where(eq(alertasNotificacaoTable.id, id))
    .returning();

  if (!alerta) {
    res.status(404).json({ error: "Alerta nao encontrado" });
    return;
  }

  res.json(alerta);
});

router.get("/alertas/stats", async (_req, res): Promise<void> => {
  const porStatus = await db
    .select({ status: alertasNotificacaoTable.status, total: sql<number>`count(*)` })
    .from(alertasNotificacaoTable)
    .groupBy(alertasNotificacaoTable.status);

  const expirados = await db
    .select({ total: sql<number>`count(*)` })
    .from(alertasNotificacaoTable)
    .where(sql`${alertasNotificacaoTable.expiraEm} < NOW() AND ${alertasNotificacaoTable.status} != 'CONFIRMADO'`);

  res.json({
    porStatus,
    expirados: Number(expirados[0]?.total ?? 0),
  });
});

router.post("/alertas/limpar-expirados", async (_req, res): Promise<void> => {
  const result = await db
    .update(alertasNotificacaoTable)
    .set({ status: "EXPIRADO" })
    .where(and(
      sql`${alertasNotificacaoTable.expiraEm} < NOW()`,
      sql`${alertasNotificacaoTable.status} != 'CONFIRMADO'`,
      sql`${alertasNotificacaoTable.status} != 'EXPIRADO'`,
    ));

  res.json({ expiradosMarcados: result.rowCount ?? 0 });
});

export default router;
