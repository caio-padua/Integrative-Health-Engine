import { Router } from "express";
import { db } from "@workspace/db";
import {
  avaliacaoEnfermagemTable, insertAvaliacaoEnfermagemSchema,
  taskCardsTable, pacientesTable, sessoesTable,
} from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

router.get("/avaliacao-enfermagem", async (req, res) => {
  const { pacienteId, sessaoId } = req.query;
  const conditions: any[] = [];
  if (pacienteId) conditions.push(eq(avaliacaoEnfermagemTable.pacienteId, Number(pacienteId)));
  if (sessaoId) conditions.push(eq(avaliacaoEnfermagemTable.sessaoId, Number(sessaoId)));

  const result = await db
    .select()
    .from(avaliacaoEnfermagemTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(avaliacaoEnfermagemTable.criadoEm));

  res.json(result);
});

router.get("/avaliacao-enfermagem/:id", async (req, res) => {
  const [result] = await db
    .select()
    .from(avaliacaoEnfermagemTable)
    .where(eq(avaliacaoEnfermagemTable.id, Number(req.params.id)));

  if (!result) { res.status(404).json({ error: "Avaliacao nao encontrada" }); return; }
  res.json(result);
});

router.post("/avaliacao-enfermagem", async (req, res) => {
  const parsed = insertAvaliacaoEnfermagemSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }

  const [created] = await db.insert(avaliacaoEnfermagemTable).values(parsed.data).returning();

  if (created.corAlerta !== "green") {
    const [paciente] = created.pacienteId
      ? await db.select({ nome: pacientesTable.nome }).from(pacientesTable).where(eq(pacientesTable.id, created.pacienteId))
      : [{ nome: "Desconhecido" }];

    const nomeCliente = paciente?.nome || "Desconhecido";

    if (created.corAlerta === "yellow") {
      await db.insert(taskCardsTable).values({
        sessaoId: created.sessaoId,
        pacienteId: created.pacienteId,
        assignedRole: "enfermeira_02",
        titulo: `Follow-up: ${nomeCliente}`,
        descricao: `Contatar cliente dentro de 36h. Observacao: ${created.observacoes || "Sem observacoes"}`,
        prioridade: "alta",
        corAlerta: "yellow",
        prazoHoras: 36,
      });
    }

    if (created.corAlerta === "red") {
      await db.insert(taskCardsTable).values([
        {
          sessaoId: created.sessaoId,
          pacienteId: created.pacienteId,
          assignedRole: "enfermeira_02",
          titulo: `ALERTA: ${nomeCliente}`,
          descricao: `Contato IMEDIATO necessario. Observacao: ${created.observacoes || "Sem observacoes"}`,
          prioridade: "urgente",
          corAlerta: "red",
          prazoHoras: 0,
        },
        {
          sessaoId: created.sessaoId,
          pacienteId: created.pacienteId,
          assignedRole: "medico_02",
          titulo: `ALERTA MEDICO: ${nomeCliente}`,
          descricao: `Avaliacao medica imediata necessaria. Observacao: ${created.observacoes || "Sem observacoes"}`,
          prioridade: "urgente",
          corAlerta: "red",
          prazoHoras: 0,
        },
      ]);
    }
  }

  res.status(201).json(created);
});

router.put("/avaliacao-enfermagem/:id", async (req, res) => {
  const allowedFields = [
    "pressaoArterial", "frequenciaCardiaca", "peso", "altura",
    "percentualGordura", "massaGorda", "massaMuscular",
    "dobraTricipital", "dobraBicipital", "dobraSubescapular",
    "dobraSuprailiaca", "dobraAbdominal", "dobraPeitoral", "dobraCoxaMedial",
    "circunferenciaBraco", "circunferenciaAntebraco", "circunferenciaTorax",
    "circunferenciaCintura", "circunferenciaAbdomen", "circunferenciaQuadril",
    "circunferenciaCoxa", "circunferenciaPanturrilha",
    "corAlerta", "observacoes", "perguntaSemanal", "nivelDor",
  ];

  const updates: Record<string, any> = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  const [updated] = await db
    .update(avaliacaoEnfermagemTable)
    .set(updates)
    .where(eq(avaliacaoEnfermagemTable.id, Number(req.params.id)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Avaliacao nao encontrada" }); return; }
  res.json(updated);
});

export default router;
