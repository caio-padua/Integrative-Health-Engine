import { Router } from "express";
import { db, pagamentosTable, pacientesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CriarPagamentoBody } from "@workspace/api-zod";

const router = Router();

router.get("/financeiro/pagamentos", async (req, res): Promise<void> => {
  const pacienteId = req.query.pacienteId ? parseInt(req.query.pacienteId as string, 10) : undefined;
  const status = req.query.status as string | undefined;
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : undefined;

  const pagamentos = await db
    .select({
      id: pagamentosTable.id,
      pacienteId: pagamentosTable.pacienteId,
      pacienteNome: pacientesTable.nome,
      valor: pagamentosTable.valor,
      status: pagamentosTable.status,
      formaPagamento: pagamentosTable.formaPagamento,
      descricao: pagamentosTable.descricao,
      unidadeId: pagamentosTable.unidadeId,
      criadoEm: pagamentosTable.criadoEm,
      paguEm: pagamentosTable.paguEm,
    })
    .from(pagamentosTable)
    .leftJoin(pacientesTable, eq(pagamentosTable.pacienteId, pacientesTable.id));

  let result = pagamentos;
  if (pacienteId) result = result.filter(p => p.pacienteId === pacienteId);
  if (status) result = result.filter(p => p.status === status);
  if (unidadeId) result = result.filter(p => p.unidadeId === unidadeId);

  res.json(result);
});

router.post("/financeiro/pagamentos", async (req, res): Promise<void> => {
  const parsed = CriarPagamentoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [pagamento] = await db.insert(pagamentosTable).values(parsed.data).returning();
  const [paciente] = await db.select().from(pacientesTable).where(eq(pacientesTable.id, pagamento.pacienteId));
  res.status(201).json({ ...pagamento, pacienteNome: paciente?.nome });
});

router.post("/financeiro/pagamentos/:id/confirmar", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [pagamento] = await db
    .update(pagamentosTable)
    .set({ status: "pago", paguEm: new Date() })
    .where(eq(pagamentosTable.id, id))
    .returning();
  if (!pagamento) { res.status(404).json({ error: "Pagamento não encontrado" }); return; }
  res.json(pagamento);
});

export default router;
