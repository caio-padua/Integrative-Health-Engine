import { Router } from "express";
import { db, filasTable, pacientesTable, usuariosTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { MoverItemFilaBody } from "@workspace/api-zod";

const router = Router();

const buildFilaResult = async (tipo: string | undefined, unidadeId: number | undefined) => {
  const items = await db
    .select({
      id: filasTable.id,
      tipo: filasTable.tipo,
      pacienteId: filasTable.pacienteId,
      pacienteNome: pacientesTable.nome,
      descricao: filasTable.descricao,
      prioridade: filasTable.prioridade,
      status: filasTable.status,
      responsavelId: filasTable.responsavelId,
      responsavelNome: usuariosTable.nome,
      unidadeId: filasTable.unidadeId,
      criadoEm: filasTable.criadoEm,
      prazo: filasTable.prazo,
    })
    .from(filasTable)
    .leftJoin(pacientesTable, eq(filasTable.pacienteId, pacientesTable.id))
    .leftJoin(usuariosTable, eq(filasTable.responsavelId, usuariosTable.id));

  let result = items;
  if (tipo) result = result.filter(i => i.tipo === tipo);
  if (unidadeId) result = result.filter(i => i.unidadeId === unidadeId);
  return result;
};

router.get("/filas", async (req, res): Promise<void> => {
  const tipo = req.query.tipo as string | undefined;
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : undefined;

  const todos = await buildFilaResult(undefined, unidadeId);

  const filaAnamnese = todos.filter(i => i.tipo === "anamnese");
  const filaValidacao = todos.filter(i => i.tipo === "validacao");
  const filaProcedimento = todos.filter(i => i.tipo === "procedimento");
  const filaFollowup = todos.filter(i => i.tipo === "followup");
  const filaPagamento = todos.filter(i => i.tipo === "pagamento");

  if (tipo) {
    const filtered = todos.filter(i => i.tipo === tipo);
    res.json(filtered);
    return;
  }

  res.json({ filaAnamnese, filaValidacao, filaProcedimento, filaFollowup, filaPagamento });
});

router.post("/filas/:itemId/mover", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId;
  const id = parseInt(raw, 10);
  const parsed = MoverItemFilaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db
    .update(filasTable)
    .set({
      status: parsed.data.novoStatus,
      responsavelId: parsed.data.responsavelId,
    })
    .where(eq(filasTable.id, id))
    .returning();
  if (!item) { res.status(404).json({ error: "Item de fila não encontrado" }); return; }
  res.json(item);
});

export default router;
