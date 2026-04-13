import { Router, Request, Response } from "express";
import { db, consultoriasTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/consultorias", async (_req: Request, res: Response) => {
  const rows = await db.select().from(consultoriasTable).orderBy(consultoriasTable.nome);
  res.json(rows);
});

router.post("/consultorias", async (req: Request, res: Response) => {
  const [row] = await db.insert(consultoriasTable).values(req.body).returning();
  res.json(row);
});

router.put("/consultorias/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { id: _, criadoEm, atualizadoEm, ...data } = req.body;
  const [row] = await db.update(consultoriasTable).set(data).where(eq(consultoriasTable.id, id)).returning();
  res.json(row);
});

router.delete("/consultorias/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  await db.delete(consultoriasTable).where(eq(consultoriasTable.id, id));
  res.json({ ok: true });
});

export default router;
