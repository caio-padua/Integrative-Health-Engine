import { Router } from "express";
import { db, unidadesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CriarUnidadeBody } from "@workspace/api-zod";

const router = Router();

router.get("/unidades", async (_req, res): Promise<void> => {
  const unidades = await db.select().from(unidadesTable).orderBy(unidadesTable.nome);
  res.json(unidades);
});

router.post("/unidades", async (req, res): Promise<void> => {
  const parsed = CriarUnidadeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [unidade] = await db.insert(unidadesTable).values(parsed.data).returning();
  res.status(201).json(unidade);
});

router.get("/unidades/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [unidade] = await db.select().from(unidadesTable).where(eq(unidadesTable.id, id));
  if (!unidade) { res.status(404).json({ error: "Unidade não encontrada" }); return; }
  res.json(unidade);
});

export default router;
