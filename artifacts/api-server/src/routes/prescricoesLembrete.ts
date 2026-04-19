import { Router } from "express";
import {
  db,
  prescricoesLembreteTable,
  prescricaoLembreteEnviosTable,
  insertPrescricaoLembreteSchema,
} from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { executarLembretesPrescricao } from "../services/prescricaoLembreteService";

const router = Router();

router.get("/prescricoes-lembrete", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(prescricoesLembreteTable)
    .orderBy(desc(prescricoesLembreteTable.criadoEm));
  res.json(rows);
});

router.post("/prescricoes-lembrete", async (req, res): Promise<void> => {
  const parsed = insertPrescricaoLembreteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ erro: "Dados invalidos", detalhes: parsed.error.issues });
    return;
  }
  const [row] = await db.insert(prescricoesLembreteTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.put("/prescricoes-lembrete/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ erro: "ID invalido" });
    return;
  }
  const parsed = insertPrescricaoLembreteSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ erro: "Dados invalidos", detalhes: parsed.error.issues });
    return;
  }
  const [row] = await db
    .update(prescricoesLembreteTable)
    .set(parsed.data)
    .where(eq(prescricoesLembreteTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ erro: "Prescricao nao encontrada" });
    return;
  }
  res.json(row);
});

router.delete("/prescricoes-lembrete/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ erro: "ID invalido" });
    return;
  }
  const [row] = await db
    .delete(prescricoesLembreteTable)
    .where(eq(prescricoesLembreteTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ erro: "Prescricao nao encontrada" });
    return;
  }
  res.json({ sucesso: true });
});

router.get("/prescricoes-lembrete/:id/envios", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ erro: "ID invalido" });
    return;
  }
  const rows = await db
    .select()
    .from(prescricaoLembreteEnviosTable)
    .where(eq(prescricaoLembreteEnviosTable.prescricaoLembreteId, id))
    .orderBy(desc(prescricaoLembreteEnviosTable.enviadoEm))
    .limit(200);
  res.json(rows);
});

router.post("/prescricoes-lembrete/executar", async (req, res): Promise<void> => {
  let toleranciaMinutos: number | undefined;
  if (req.body?.toleranciaMinutos !== undefined && req.body.toleranciaMinutos !== null) {
    const t = Number(req.body.toleranciaMinutos);
    if (!Number.isFinite(t) || t < 0 || t > 720) {
      res.status(400).json({ erro: "toleranciaMinutos deve ser numero entre 0 e 720" });
      return;
    }
    toleranciaMinutos = t;
  }

  let nowParam: Date | undefined;
  if (req.body?.now !== undefined && req.body.now !== null) {
    const d = new Date(req.body.now);
    if (Number.isNaN(d.getTime())) {
      res.status(400).json({ erro: "now deve ser uma data ISO valida" });
      return;
    }
    nowParam = d;
  }

  const result = await executarLembretesPrescricao({
    now: nowParam,
    toleranciaMinutos,
  });
  res.json(result);
});

export default router;
