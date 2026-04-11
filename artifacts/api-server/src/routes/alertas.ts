import { Router } from "express";
import {
  db, alertasNotificacaoTable, usuariosTable,
  criarAlerta, calcularTempoRestante,
} from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

router.post("/alertas", async (req, res): Promise<void> => {
  const { tipo, destinatarioId, mensagem, linkAcao, horasExpiracao } = req.body;

  if (!tipo || !destinatarioId || !mensagem) {
    res.status(400).json({ error: "tipo, destinatarioId e mensagem sao obrigatorios" });
    return;
  }

  const dados = criarAlerta(tipo, destinatarioId, mensagem, linkAcao, horasExpiracao);
  const [alerta] = await db.insert(alertasNotificacaoTable).values(dados).returning();

  res.status(201).json(alerta);
});

router.get("/alertas", async (req, res): Promise<void> => {
  const { destinatarioId, status } = req.query;

  if (!destinatarioId) {
    res.status(400).json({ error: "destinatarioId e obrigatorio" });
    return;
  }

  const conditions: any[] = [
    eq(alertasNotificacaoTable.destinatarioId, Number(destinatarioId)),
  ];
  if (status) conditions.push(eq(alertasNotificacaoTable.status, String(status) as any));

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
