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

router.put("/followup/:id", async (req, res): Promise<void> => {
  try {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "ID invalido" }); return; }
    const body = req.body;
    const allowed: Record<string, any> = {};
    const whitelist = ["tipo", "status", "dataAgendada", "observacoes", "recorrencia", "responsavelId", "unidadeId"];
    for (const k of whitelist) {
      if (body[k] !== undefined) allowed[k] = body[k];
    }
    if (allowed.dataAgendada && typeof allowed.dataAgendada === "string") {
      allowed.dataAgendada = new Date(allowed.dataAgendada);
    }
    if (Object.keys(allowed).length === 0) { res.status(400).json({ error: "Nenhum campo para atualizar" }); return; }
    const [followup] = await db.update(followupsTable).set(allowed).where(eq(followupsTable.id, id)).returning();
    if (!followup) { res.status(404).json({ error: "Follow-up nao encontrado" }); return; }
    res.json(followup);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Erro interno" });
  }
});

router.delete("/followup/:id", async (req, res): Promise<void> => {
  try {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "ID invalido" }); return; }
    const [deleted] = await db.delete(followupsTable).where(eq(followupsTable.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Follow-up nao encontrado" }); return; }
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Erro interno" });
  }
});

export default router;
