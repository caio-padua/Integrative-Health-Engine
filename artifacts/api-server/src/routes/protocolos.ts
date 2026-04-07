import { Router } from "express";
import { db, protocolosTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CriarProtocoloBody } from "@workspace/api-zod";

const router = Router();

router.get("/protocolos", async (req, res): Promise<void> => {
  const ativo = req.query.ativo !== undefined ? req.query.ativo === "true" : undefined;
  const categoria = req.query.categoria as string | undefined;

  const protocolos = await db.select().from(protocolosTable).orderBy(protocolosTable.nome);
  let result = protocolos;
  if (ativo !== undefined) result = result.filter(p => p.ativo === ativo);
  if (categoria) result = result.filter(p => p.categoria === categoria);

  res.json(result);
});

router.post("/protocolos", async (req, res): Promise<void> => {
  const parsed = CriarProtocoloBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [protocolo] = await db.insert(protocolosTable).values(parsed.data).returning();
  res.status(201).json(protocolo);
});

router.get("/protocolos/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [protocolo] = await db.select().from(protocolosTable).where(eq(protocolosTable.id, id));
  if (!protocolo) { res.status(404).json({ error: "Protocolo não encontrado" }); return; }
  res.json(protocolo);
});

export default router;
