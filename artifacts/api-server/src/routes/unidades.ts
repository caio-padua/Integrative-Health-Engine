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

router.put("/unidades/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const allowedFields = [
    "nome", "endereco", "bairro", "cidade", "estado", "cep", "cnpj",
    "telefone", "tipo", "googleCalendarId", "googleCalendarEmail", "cor", "ativa", "nick",
  ];
  const updates: Record<string, any> = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nenhum campo para atualizar" });
    return;
  }
  const [updated] = await db.update(unidadesTable).set(updates).where(eq(unidadesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Unidade não encontrada" }); return; }
  res.json(updated);
});

router.delete("/unidades/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [unidade] = await db.select().from(unidadesTable).where(eq(unidadesTable.id, id));
  if (!unidade) { res.status(404).json({ error: "Unidade nao encontrada" }); return; }
  if (unidade.tipo === "genesis_seed") {
    res.status(403).json({ error: "Instituto Genesis e semente perene — nao pode ser excluido. Apenas adicoes sao permitidas." });
    return;
  }
  const [deleted] = await db.delete(unidadesTable).where(eq(unidadesTable.id, id)).returning();
  res.json({ ok: true });
});

export default router;
