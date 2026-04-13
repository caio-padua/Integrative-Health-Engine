import { Router, Request, Response } from "express";
import { db, contratoClinicaTable, unidadesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/contratos", async (_req: Request, res: Response) => {
  const rows = await db.select({
    id: contratoClinicaTable.id,
    unidadeId: contratoClinicaTable.unidadeId,
    unidadeNome: unidadesTable.nome,
    consultoriaId: contratoClinicaTable.consultoriaId,
    modeloCobranca: contratoClinicaTable.modeloCobranca,
    valorMensalFixo: contratoClinicaTable.valorMensalFixo,
    creditosDemandas: contratoClinicaTable.creditosDemandas,
    creditosUsados: contratoClinicaTable.creditosUsados,
    valorOnboarding: contratoClinicaTable.valorOnboarding,
    onboardingPago: contratoClinicaTable.onboardingPago,
    status: contratoClinicaTable.status,
    dataInicio: contratoClinicaTable.dataInicio,
    dataFim: contratoClinicaTable.dataFim,
    observacoes: contratoClinicaTable.observacoes,
  }).from(contratoClinicaTable)
    .leftJoin(unidadesTable, eq(contratoClinicaTable.unidadeId, unidadesTable.id))
    .orderBy(contratoClinicaTable.dataInicio);
  res.json({ contratos: rows });
});

router.post("/contratos", async (req: Request, res: Response) => {
  const { unidadeNome, ...data } = req.body;
  const [row] = await db.insert(contratoClinicaTable).values(data).returning();
  res.json(row);
});

router.put("/contratos/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { id: _, criadoEm, atualizadoEm, unidadeNome, ...data } = req.body;
  const [row] = await db.update(contratoClinicaTable).set(data).where(eq(contratoClinicaTable.id, id)).returning();
  res.json(row);
});

router.delete("/contratos/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  await db.delete(contratoClinicaTable).where(eq(contratoClinicaTable.id, id));
  res.json({ ok: true });
});

export default router;
