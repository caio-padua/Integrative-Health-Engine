import { Router } from "express";
import { db, blocosTable, regrasMotorTable, itensTerapeuticosTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /blocos - Lista todos os blocos PADCOM
router.get("/blocos", async (_req, res): Promise<void> => {
  const blocos = await db.select().from(blocosTable).orderBy(blocosTable.codigoBloco);
  res.json(blocos);
});

// GET /blocos/:codigo - Detalhes de um bloco com seus itens
router.get("/blocos/:codigo", async (req, res): Promise<void> => {
  const codigo = req.params.codigo as string;
  const [bloco] = await db.select().from(blocosTable).where(eq(blocosTable.codigoBloco, codigo));
  if (!bloco) { res.status(404).json({ error: "Bloco não encontrado" }); return; }

  const itens = await db.select().from(itensTerapeuticosTable)
    .where(eq(itensTerapeuticosTable.blocoId, codigo));

  res.json({ ...bloco, itens });
});

// GET /motor/regras - Lista todas as regras do motor PADCOM
router.get("/motor/regras", async (req, res): Promise<void> => {
  const segmento = req.query.segmento as string | undefined;
  const regras = await db.select().from(regrasMotorTable).where(eq(regrasMotorTable.ativo, "SIM"));
  const result = segmento ? regras.filter(r => r.segmento === segmento) : regras;
  res.json(result);
});

export default router;
