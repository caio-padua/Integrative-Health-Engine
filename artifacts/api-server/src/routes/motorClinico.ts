import { Router } from "express";
import { db, sugestoesTable, pacientesTable, itensTerapeuticosTable, usuariosTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { ValidarSugestaoBody, CriarItemTerapeuticoBody, ToggleItemTerapeuticoBody } from "@workspace/api-zod";

const router = Router();

router.get("/motor-clinico/sugestoes", async (req, res): Promise<void> => {
  const pacienteId = req.query.pacienteId ? parseInt(req.query.pacienteId as string, 10) : undefined;
  const status = req.query.status as string | undefined;
  const tipo = req.query.tipo as string | undefined;

  const sugestoes = await db
    .select({
      id: sugestoesTable.id,
      anamneseId: sugestoesTable.anamneseId,
      pacienteId: sugestoesTable.pacienteId,
      pacienteNome: pacientesTable.nome,
      tipo: sugestoesTable.tipo,
      itemTerapeuticoId: sugestoesTable.itemTerapeuticoId,
      itemNome: sugestoesTable.itemNome,
      itemDescricao: sugestoesTable.itemDescricao,
      justificativa: sugestoesTable.justificativa,
      prioridade: sugestoesTable.prioridade,
      status: sugestoesTable.status,
      validadoPorId: sugestoesTable.validadoPorId,
      validadoPorNome: usuariosTable.nome,
      validadoEm: sugestoesTable.validadoEm,
      observacaoValidacao: sugestoesTable.observacaoValidacao,
      criadoEm: sugestoesTable.criadoEm,
    })
    .from(sugestoesTable)
    .leftJoin(pacientesTable, eq(sugestoesTable.pacienteId, pacientesTable.id))
    .leftJoin(usuariosTable, eq(sugestoesTable.validadoPorId, usuariosTable.id));

  let result = sugestoes;
  if (pacienteId) result = result.filter(s => s.pacienteId === pacienteId);
  if (status) result = result.filter(s => s.status === status);
  if (tipo) result = result.filter(s => s.tipo === tipo);

  res.json(result);
});

router.post("/motor-clinico/sugestoes/:id/validar", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = ValidarSugestaoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { acao, observacao, validadoPorId } = parsed.data;
  const novoStatus = acao === "validar" ? "validado" : "rejeitado";
  const [sugestao] = await db
    .update(sugestoesTable)
    .set({
      status: novoStatus,
      validadoPorId,
      observacaoValidacao: observacao,
      validadoEm: new Date(),
    })
    .where(eq(sugestoesTable.id, id))
    .returning();
  if (!sugestao) { res.status(404).json({ error: "Sugestão não encontrada" }); return; }
  res.json(sugestao);
});

router.get("/motor-clinico/itens-terapeuticos", async (req, res): Promise<void> => {
  const categoria = req.query.categoria as string | undefined;
  const disponivel = req.query.disponivel !== undefined ? req.query.disponivel === "true" : undefined;

  const itens = await db.select().from(itensTerapeuticosTable).orderBy(itensTerapeuticosTable.nome);
  let result = itens;
  if (categoria) result = result.filter(i => i.categoria === categoria);
  if (disponivel !== undefined) result = result.filter(i => i.disponivel === disponivel);

  res.json(result);
});

router.post("/motor-clinico/itens-terapeuticos", async (req, res): Promise<void> => {
  const parsed = CriarItemTerapeuticoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db.insert(itensTerapeuticosTable).values(parsed.data).returning();
  res.status(201).json(item);
});

router.patch("/motor-clinico/itens-terapeuticos/:id/toggle", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = ToggleItemTerapeuticoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db
    .update(itensTerapeuticosTable)
    .set({ disponivel: parsed.data.disponivel })
    .where(eq(itensTerapeuticosTable.id, id))
    .returning();
  if (!item) { res.status(404).json({ error: "Item não encontrado" }); return; }
  res.json(item);
});

export default router;
