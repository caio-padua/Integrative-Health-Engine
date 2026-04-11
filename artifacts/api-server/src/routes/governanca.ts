import { Router } from "express";
import {
  db, filaPreceptorTable, validacoesCascataTable,
  alertasNotificacaoTable, eventosClinicosTable,
  usuariosTable, corSemaforo,
} from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

router.get("/governanca/painel", async (_req, res): Promise<void> => {
  const filaPendente = await db
    .select({ total: sql<number>`count(*)` })
    .from(filaPreceptorTable)
    .where(eq(filaPreceptorTable.status, "AGUARDANDO"));

  const validacoesPendentes = await db
    .select({ total: sql<number>`count(*)` })
    .from(validacoesCascataTable)
    .where(eq(validacoesCascataTable.status, "PENDENTE"));

  const alertasAbertos = await db
    .select({ total: sql<number>`count(*)` })
    .from(alertasNotificacaoTable)
    .where(sql`${alertasNotificacaoTable.status} IN ('ENVIADO', 'ENTREGUE', 'LIDO')`);

  const filaCount = Number(filaPendente[0]?.total ?? 0);
  const validCount = Number(validacoesPendentes[0]?.total ?? 0);
  const alertCount = Number(alertasAbertos[0]?.total ?? 0);

  let statusGeral: "VERDE" | "AMARELO" | "VERMELHO" = "VERDE";
  if (filaCount > 10 || validCount > 20 || alertCount > 5) statusGeral = "VERMELHO";
  else if (filaCount > 5 || validCount > 10 || alertCount > 3) statusGeral = "AMARELO";

  res.json({
    statusGeral,
    kpis: {
      filaPendente: {
        valor: filaCount,
        status: corSemaforo(filaCount > 5 ? 0 : filaCount > 2 ? 12 : 48),
        descricao: `${filaCount} prontuarios aguardando homologacao`,
      },
      validacoesPendentes: {
        valor: validCount,
        status: validCount > 10 ? "VERMELHO" : validCount > 5 ? "AMARELO" : "VERDE",
        descricao: `${validCount} validacoes cascata pendentes`,
      },
      alertasAbertos: {
        valor: alertCount,
        status: alertCount > 3 ? "VERMELHO" : alertCount > 1 ? "AMARELO" : "VERDE",
        descricao: `${alertCount} alertas nao confirmados`,
      },
    },
    timestamp: new Date(),
  });
});

router.get("/governanca/semaforo", async (_req, res): Promise<void> => {
  const filasAguardando = await db
    .select({
      id: filaPreceptorTable.id,
      prazo: filaPreceptorTable.prazoHomologacao,
    })
    .from(filaPreceptorTable)
    .where(eq(filaPreceptorTable.status, "AGUARDANDO"));

  let criticas = 0;
  let atencao = 0;

  for (const fila of filasAguardando) {
    if (!fila.prazo) continue;
    const horasRestantes = (fila.prazo.getTime() - Date.now()) / (1000 * 60 * 60);
    if (horasRestantes <= 0) criticas++;
    else if (horasRestantes < 6) atencao++;
  }

  let semaforo: "VERDE" | "AMARELO" | "VERMELHO" = "VERDE";
  if (criticas > 0) semaforo = "VERMELHO";
  else if (atencao > 0) semaforo = "AMARELO";

  res.json({
    semaforo,
    filasCriticas: criticas,
    filasAtencao: atencao,
    descricao: semaforo === "VERDE"
      ? "Sistema operacional normal"
      : semaforo === "AMARELO"
        ? `${atencao} prontuarios com prazo critico (< 6h)`
        : `${criticas} prontuarios com prazo expirado`,
    timestamp: new Date(),
  });
});

router.get("/governanca/timeline", async (req, res): Promise<void> => {
  const limite = req.query.limite ? parseInt(req.query.limite as string, 10) : 20;

  const eventos = await db
    .select({
      id: eventosClinicosTable.id,
      tipo: eventosClinicosTable.tipo,
      descricao: eventosClinicosTable.descricao,
      usuarioId: eventosClinicosTable.usuarioId,
      usuarioNome: usuariosTable.nome,
      pacienteId: eventosClinicosTable.pacienteId,
      criadoEm: eventosClinicosTable.criadoEm,
    })
    .from(eventosClinicosTable)
    .leftJoin(usuariosTable, eq(eventosClinicosTable.usuarioId, usuariosTable.id))
    .orderBy(desc(eventosClinicosTable.criadoEm))
    .limit(limite);

  res.json({ total: eventos.length, eventos });
});

router.get("/fila-preceptor/stats", async (_req, res): Promise<void> => {
  const porStatus = await db
    .select({ status: filaPreceptorTable.status, total: sql<number>`count(*)` })
    .from(filaPreceptorTable)
    .groupBy(filaPreceptorTable.status);

  const expirados = await db
    .select({ total: sql<number>`count(*)` })
    .from(filaPreceptorTable)
    .where(sql`${filaPreceptorTable.prazoHomologacao} < NOW() AND ${filaPreceptorTable.status} = 'AGUARDANDO'`);

  res.json({
    porStatus,
    expirados: Number(expirados[0]?.total ?? 0),
  });
});

export default router;
