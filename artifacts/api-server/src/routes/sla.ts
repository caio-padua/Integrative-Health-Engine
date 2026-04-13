import { Router } from "express";
import { db, taskCardsTable, taskCardJustificativasTable, taskCardEscalationsTable, followupsTable, eventosClinicosTable, pacientesTable } from "@workspace/db";
import { eq, and, sql, or, isNull, lt, gte, desc } from "drizzle-orm";

const router = Router();

function calcSemaforo(criadoEm: Date, prazoHoras: number | null): { semaforo: string; restanteHoras: number; vencidoEm: Date | null } {
  const prazo = prazoHoras || 24;
  const vencidoEm = new Date(criadoEm.getTime() + prazo * 60 * 60 * 1000);
  const agora = new Date();
  const restanteMs = vencidoEm.getTime() - agora.getTime();
  const restanteHoras = Math.round(restanteMs / (60 * 60 * 1000) * 10) / 10;

  if (restanteMs <= 0) return { semaforo: "VERMELHO", restanteHoras, vencidoEm };
  if (restanteMs <= 12 * 60 * 60 * 1000) return { semaforo: "AMARELO", restanteHoras, vencidoEm };
  return { semaforo: "VERDE", restanteHoras, vencidoEm };
}

router.get("/sla/queue", async (req, res) => {
  try {
    const { unidadeId, status, role } = req.query;

    const tasks = await db
      .select({
        id: taskCardsTable.id,
        titulo: taskCardsTable.titulo,
        descricao: taskCardsTable.descricao,
        assignedRole: taskCardsTable.assignedRole,
        prioridade: taskCardsTable.prioridade,
        prazoHoras: taskCardsTable.prazoHoras,
        status: taskCardsTable.status,
        pacienteId: taskCardsTable.pacienteId,
        pacienteNome: pacientesTable.nome,
        criadoEm: taskCardsTable.criadoEm,
        concluidoEm: taskCardsTable.concluidoEm,
      })
      .from(taskCardsTable)
      .leftJoin(pacientesTable, eq(taskCardsTable.pacienteId, pacientesTable.id))
      .where(
        and(
          or(eq(taskCardsTable.status, "pendente"), eq(taskCardsTable.status, "em_andamento")),
          role ? eq(taskCardsTable.assignedRole, role as string) : undefined,
        )
      )
      .orderBy(desc(taskCardsTable.criadoEm));

    const followups = await db
      .select({
        id: followupsTable.id,
        tipo: followupsTable.tipo,
        status: followupsTable.status,
        dataAgendada: followupsTable.dataAgendada,
        dataRealizada: followupsTable.dataRealizada,
        observacoes: followupsTable.observacoes,
        pacienteId: followupsTable.pacienteId,
        pacienteNome: pacientesTable.nome,
        responsavelId: followupsTable.responsavelId,
        unidadeId: followupsTable.unidadeId,
        criadoEm: followupsTable.criadoEm,
      })
      .from(followupsTable)
      .leftJoin(pacientesTable, eq(followupsTable.pacienteId, pacientesTable.id))
      .where(
        and(
          or(eq(followupsTable.status, "agendado"), eq(followupsTable.status, "atrasado")),
          unidadeId ? eq(followupsTable.unidadeId, Number(unidadeId)) : undefined,
        )
      )
      .orderBy(desc(followupsTable.dataAgendada));

    const justificativas = await db.select().from(taskCardJustificativasTable);
    const justMap = new Map<string, any[]>();
    for (const j of justificativas) {
      const key = `${j.entityType}_${j.entityId}`;
      if (!justMap.has(key)) justMap.set(key, []);
      justMap.get(key)!.push(j);
    }

    const escalations = await db.select().from(taskCardEscalationsTable).where(isNull(taskCardEscalationsTable.resolvidoEm));

    const items: any[] = [];

    for (const t of tasks) {
      const sla = calcSemaforo(t.criadoEm, t.prazoHoras);
      const key = `TASK_${t.id}`;
      const justs = justMap.get(key) || [];
      const temJustificativa = justs.length > 0;
      const escalada = escalations.find(e => e.entityType === "TASK" && e.entityId === t.id);

      items.push({
        type: "TASK",
        id: t.id,
        titulo: t.titulo,
        descricao: t.descricao,
        assignedRole: t.assignedRole,
        prioridade: t.prioridade,
        status: t.status,
        pacienteId: t.pacienteId,
        pacienteNome: t.pacienteNome,
        sla: {
          dueAt: sla.vencidoEm,
          semaforo: sla.semaforo,
          restanteHoras: sla.restanteHoras,
        },
        temJustificativa,
        justificativas: justs,
        escalada: escalada || null,
        criadoEm: t.criadoEm,
      });
    }

    for (const f of followups) {
      const agora = new Date();
      const dataAgendada = new Date(f.dataAgendada);
      const restanteMs = dataAgendada.getTime() - agora.getTime();
      const restanteHoras = Math.round(restanteMs / (60 * 60 * 1000) * 10) / 10;
      let semaforo = "VERDE";
      if (restanteMs <= 0) semaforo = "VERMELHO";
      else if (restanteMs <= 12 * 60 * 60 * 1000) semaforo = "AMARELO";

      const key = `FOLLOWUP_${f.id}`;
      const justs = justMap.get(key) || [];
      const escalada = escalations.find(e => e.entityType === "FOLLOWUP" && e.entityId === f.id);

      items.push({
        type: "FOLLOWUP",
        id: f.id,
        titulo: `Follow-up: ${f.tipo}`,
        descricao: f.observacoes,
        assignedRole: f.responsavelId ? `USER_${f.responsavelId}` : "ADMIN",
        status: f.status,
        pacienteId: f.pacienteId,
        pacienteNome: f.pacienteNome,
        unidadeId: f.unidadeId,
        sla: {
          dueAt: dataAgendada,
          semaforo,
          restanteHoras,
        },
        temJustificativa: justs.length > 0,
        justificativas: justs,
        escalada: escalada || null,
        criadoEm: f.criadoEm,
      });
    }

    const semaforoOrder = { VERMELHO: 0, AMARELO: 1, VERDE: 2 };
    items.sort((a, b) => (semaforoOrder[a.sla.semaforo as keyof typeof semaforoOrder] ?? 2) - (semaforoOrder[b.sla.semaforo as keyof typeof semaforoOrder] ?? 2));

    if (status === "vencido") {
      const filtered = items.filter(i => i.sla.semaforo === "VERMELHO");
      res.json({
        asOf: new Date().toISOString(),
        items: filtered,
        summary: {
          vermelho: items.filter(i => i.sla.semaforo === "VERMELHO").length,
          amarelo: items.filter(i => i.sla.semaforo === "AMARELO").length,
          verde: items.filter(i => i.sla.semaforo === "VERDE").length,
          semJustificativa: items.filter(i => i.sla.semaforo === "VERMELHO" && !i.temJustificativa).length,
        },
      });
      return;
    }

    res.json({
      asOf: new Date().toISOString(),
      items,
      summary: {
        vermelho: items.filter(i => i.sla.semaforo === "VERMELHO").length,
        amarelo: items.filter(i => i.sla.semaforo === "AMARELO").length,
        verde: items.filter(i => i.sla.semaforo === "VERDE").length,
        semJustificativa: items.filter(i => i.sla.semaforo === "VERMELHO" && !i.temJustificativa).length,
      },
    });
  } catch (err: any) {
    console.error("Erro SLA queue:", err);
    res.status(500).json({ erro: err.message });
  }
});

router.post("/sla/justify", async (req, res) => {
  try {
    const { entityType, entityId, motivoPadrao, justificativa, proximaAcaoEm, registradoPorId } = req.body;

    if (!entityType || !entityId || !motivoPadrao || !justificativa) {
      res.status(400).json({ erro: "entityType, entityId, motivoPadrao e justificativa são obrigatórios" });
      return;
    }

    const [inserted] = await db.insert(taskCardJustificativasTable).values({
      entityType,
      entityId: Number(entityId),
      taskCardId: entityType === "TASK" ? Number(entityId) : null,
      followupId: entityType === "FOLLOWUP" ? Number(entityId) : null,
      motivoPadrao,
      justificativa,
      proximaAcaoEm: proximaAcaoEm ? new Date(proximaAcaoEm) : null,
      registradoPorId: registradoPorId ? Number(registradoPorId) : null,
    }).returning();

    await db.insert(eventosClinicosTable).values({
      tipo: "ACAO_CLINICA",
      descricao: `Justificativa SLA registrada para ${entityType} #${entityId}: ${motivoPadrao}`,
      usuarioId: registradoPorId ? Number(registradoPorId) : null,
      entidadeTipo: entityType,
      entidadeId: Number(entityId),
      metadados: JSON.stringify({ motivoPadrao, justificativa, proximaAcaoEm }),
    });

    res.json({ ok: true, justificativa: inserted });
  } catch (err: any) {
    console.error("Erro SLA justify:", err);
    res.status(500).json({ erro: err.message });
  }
});

router.post("/sla/escalate", async (req, res) => {
  try {
    const { entityType, entityId, nivel, motivo, observacao, escaladoPorId } = req.body;

    if (!entityType || !entityId || !nivel || !motivo) {
      res.status(400).json({ erro: "entityType, entityId, nivel e motivo são obrigatórios" });
      return;
    }

    const [inserted] = await db.insert(taskCardEscalationsTable).values({
      entityType,
      entityId: Number(entityId),
      nivel,
      motivo,
      observacao: observacao || null,
      escaladoPorId: escaladoPorId ? Number(escaladoPorId) : null,
    }).returning();

    await db.insert(eventosClinicosTable).values({
      tipo: "ACAO_CLINICA",
      descricao: `Escalonamento SLA para ${nivel}: ${entityType} #${entityId} — ${motivo}`,
      usuarioId: escaladoPorId ? Number(escaladoPorId) : null,
      entidadeTipo: entityType,
      entidadeId: Number(entityId),
      metadados: JSON.stringify({ nivel, motivo, observacao }),
    });

    res.json({ ok: true, escalation: inserted });
  } catch (err: any) {
    console.error("Erro SLA escalate:", err);
    res.status(500).json({ erro: err.message });
  }
});

router.patch("/sla/justify/:id/avaliar", async (req, res) => {
  try {
    const { id } = req.params;
    const { aceita, avaliadoPorId, observacaoAvaliador } = req.body;

    const [updated] = await db
      .update(taskCardJustificativasTable)
      .set({
        aceita,
        avaliadoPorId: avaliadoPorId ? Number(avaliadoPorId) : null,
        avaliadoEm: new Date(),
        observacaoAvaliador: observacaoAvaliador || null,
      })
      .where(eq(taskCardJustificativasTable.id, Number(id)))
      .returning();

    res.json({ ok: true, justificativa: updated });
  } catch (err: any) {
    console.error("Erro avaliar justificativa:", err);
    res.status(500).json({ erro: err.message });
  }
});

router.post("/sla/escalate/:id/resolver", async (req, res) => {
  try {
    const { id } = req.params;
    const { resolvidoPorId, resolucao } = req.body;

    const [updated] = await db
      .update(taskCardEscalationsTable)
      .set({
        resolvidoEm: new Date(),
        resolvidoPorId: resolvidoPorId ? Number(resolvidoPorId) : null,
        resolucao: resolucao || null,
      })
      .where(eq(taskCardEscalationsTable.id, Number(id)))
      .returning();

    res.json({ ok: true, escalation: updated });
  } catch (err: any) {
    console.error("Erro resolver escalation:", err);
    res.status(500).json({ erro: err.message });
  }
});

export default router;
