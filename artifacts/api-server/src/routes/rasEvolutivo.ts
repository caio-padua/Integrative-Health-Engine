import { Router } from "express";
import { db } from "@workspace/db";
import {
  rasEvolutivoTable, insertRasEvolutivoSchema,
  sessoesTable, aplicacoesSubstanciasTable, pacientesTable,
} from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

router.get("/ras-evolutivo", async (req, res) => {
  const { pacienteId, protocoloId } = req.query;
  const conditions: any[] = [];
  if (pacienteId) conditions.push(eq(rasEvolutivoTable.pacienteId, Number(pacienteId)));
  if (protocoloId) conditions.push(eq(rasEvolutivoTable.protocoloId, Number(protocoloId)));

  const result = await db
    .select()
    .from(rasEvolutivoTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(rasEvolutivoTable.criadoEm));

  res.json(result);
});

router.get("/ras-evolutivo/:id", async (req, res) => {
  const [result] = await db
    .select()
    .from(rasEvolutivoTable)
    .where(eq(rasEvolutivoTable.id, Number(req.params.id)));

  if (!result) { res.status(404).json({ error: "RAS Evolutivo nao encontrado" }); return; }
  res.json(result);
});

router.post("/ras-evolutivo/gerar/:sessaoId", async (req, res) => {
  const sessaoId = Number(req.params.sessaoId);

  const [sessao] = await db
    .select()
    .from(sessoesTable)
    .where(eq(sessoesTable.id, sessaoId));

  if (!sessao) { res.status(404).json({ error: "Sessao nao encontrada" }); return; }

  const protocoloId = sessao.protocoloId;

  let percentualProgresso = 0;
  let isAntepenultima = false;
  let isUltima = false;

  if (protocoloId) {
    const todasSessoes = await db
      .select()
      .from(sessoesTable)
      .where(eq(sessoesTable.protocoloId, protocoloId))
      .orderBy(sessoesTable.dataAgendada);

    const concluidas = todasSessoes.filter(s => s.status === "concluida").length;
    const total = todasSessoes.length;
    percentualProgresso = total > 0 ? Math.round((concluidas / total) * 100) : 0;

    const idx = todasSessoes.findIndex(s => s.id === sessaoId);
    if (idx >= 0) {
      isUltima = idx === total - 1;
      isAntepenultima = idx === total - 2;
    }
  }

  const aplicacoes = await db
    .select()
    .from(aplicacoesSubstanciasTable)
    .where(eq(aplicacoesSubstanciasTable.sessaoId, sessaoId));

  const aplicadas = aplicacoes.filter(a => a.status === "aplicada").length;
  const totalAplic = aplicacoes.filter(a => a.disponibilidade === "disp").length;

  let nivelAderencia = "bom";
  if (totalAplic > 0) {
    const taxa = aplicadas / totalAplic;
    if (taxa >= 0.9) nivelAderencia = "excelente";
    else if (taxa >= 0.7) nivelAderencia = "bom";
    else if (taxa >= 0.5) nivelAderencia = "regular";
    else nivelAderencia = "baixo";
  }

  const existingEvolutivos = protocoloId
    ? await db.select().from(rasEvolutivoTable).where(eq(rasEvolutivoTable.protocoloId, protocoloId)).orderBy(desc(rasEvolutivoTable.criadoEm)).limit(3)
    : [];

  const historicoSessoes = existingEvolutivos.map(e => ({
    id: e.id,
    sessaoId: e.sessaoId,
    progresso: e.percentualProgresso,
    aderencia: e.nivelAderencia,
    data: e.criadoEm,
  }));

  const [created] = await db.insert(rasEvolutivoTable).values({
    protocoloId,
    pacienteId: sessao.pacienteId,
    sessaoId,
    percentualProgresso,
    nivelAderencia,
    tolerancia: req.body.tolerancia || null,
    observacaoSemanal: req.body.observacaoSemanal || null,
    historicoSessoes,
    isAntepenultima,
    isUltima,
  }).returning();

  res.status(201).json(created);
});

router.post("/ras-evolutivo", async (req, res) => {
  const parsed = insertRasEvolutivoSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }
  const [created] = await db.insert(rasEvolutivoTable).values(parsed.data).returning();
  res.status(201).json(created);
});

export default router;
