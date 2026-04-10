import { Router } from "express";
import { db } from "@workspace/db";
import { taskCardsTable, insertTaskCardSchema, pacientesTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

router.get("/task-cards", async (req, res) => {
  const { assignedRole, status, corAlerta, pacienteId } = req.query;
  const conditions: any[] = [];
  if (assignedRole) conditions.push(eq(taskCardsTable.assignedRole, String(assignedRole)));
  if (status) conditions.push(eq(taskCardsTable.status, String(status)));
  if (corAlerta) conditions.push(eq(taskCardsTable.corAlerta, String(corAlerta)));
  if (pacienteId) conditions.push(eq(taskCardsTable.pacienteId, Number(pacienteId)));

  const result = await db
    .select({
      taskCard: taskCardsTable,
      pacienteNome: pacientesTable.nome,
    })
    .from(taskCardsTable)
    .leftJoin(pacientesTable, eq(taskCardsTable.pacienteId, pacientesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(taskCardsTable.criadoEm));

  res.json(result);
});

router.post("/task-cards", async (req, res) => {
  const parsed = insertTaskCardSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }
  const [created] = await db.insert(taskCardsTable).values(parsed.data).returning();
  res.status(201).json(created);
});

router.patch("/task-cards/:id", async (req, res) => {
  const { status, descricao } = req.body;
  const updates: Record<string, any> = {};
  if (status !== undefined) {
    updates.status = status;
    if (status === "concluido") updates.concluidoEm = new Date();
  }
  if (descricao !== undefined) updates.descricao = descricao;

  const [updated] = await db
    .update(taskCardsTable)
    .set(updates)
    .where(eq(taskCardsTable.id, Number(req.params.id)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Task card nao encontrado" }); return; }
  res.json(updated);
});

router.delete("/task-cards/:id", async (req, res) => {
  const [deleted] = await db
    .delete(taskCardsTable)
    .where(eq(taskCardsTable.id, Number(req.params.id)))
    .returning();

  if (!deleted) { res.status(404).json({ error: "Task card nao encontrado" }); return; }
  res.json({ ok: true });
});

export default router;
