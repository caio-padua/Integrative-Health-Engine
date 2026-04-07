import { Router } from "express";
import { db, followupsTable, pacientesTable, usuariosTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CriarFollowupBody, ConcluirFollowupBody } from "@workspace/api-zod";

const router = Router();

router.get("/followup", async (req, res): Promise<void> => {
  const pacienteId = req.query.pacienteId ? parseInt(req.query.pacienteId as string, 10) : undefined;
  const status = req.query.status as string | undefined;
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : undefined;

  const followups = await db
    .select({
      id: followupsTable.id,
      pacienteId: followupsTable.pacienteId,
      pacienteNome: pacientesTable.nome,
      tipo: followupsTable.tipo,
      status: followupsTable.status,
      dataAgendada: followupsTable.dataAgendada,
      dataRealizada: followupsTable.dataRealizada,
      observacoes: followupsTable.observacoes,
      recorrencia: followupsTable.recorrencia,
      responsavelId: followupsTable.responsavelId,
      responsavelNome: usuariosTable.nome,
      unidadeId: followupsTable.unidadeId,
      criadoEm: followupsTable.criadoEm,
    })
    .from(followupsTable)
    .leftJoin(pacientesTable, eq(followupsTable.pacienteId, pacientesTable.id))
    .leftJoin(usuariosTable, eq(followupsTable.responsavelId, usuariosTable.id));

  let result = followups;
  if (pacienteId) result = result.filter(f => f.pacienteId === pacienteId);
  if (status) result = result.filter(f => f.status === status);
  if (unidadeId) result = result.filter(f => f.unidadeId === unidadeId);

  res.json(result);
});

router.post("/followup", async (req, res): Promise<void> => {
  const parsed = CriarFollowupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [followup] = await db.insert(followupsTable).values(parsed.data).returning();
  const [paciente] = await db.select().from(pacientesTable).where(eq(pacientesTable.id, followup.pacienteId));
  res.status(201).json({ ...followup, pacienteNome: paciente?.nome });
});

router.post("/followup/:id/concluir", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = ConcluirFollowupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [followup] = await db
    .update(followupsTable)
    .set({ status: "realizado", dataRealizada: new Date(), observacoes: parsed.data.observacoes })
    .where(eq(followupsTable.id, id))
    .returning();
  if (!followup) { res.status(404).json({ error: "Follow-up não encontrado" }); return; }
  res.json(followup);
});

export default router;
