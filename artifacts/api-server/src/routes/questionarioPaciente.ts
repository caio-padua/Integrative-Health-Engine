import { Router } from "express";
import { db, questionarioMasterTable, questionarioRespostasTable, estadoSaudePacienteTable, pacientesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

function parseId(raw: string | string[]): number {
  const val = parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
  return Number.isNaN(val) ? 0 : val;
}

router.get("/pacientes/:pacienteId/questionario/perguntas", async (req, res): Promise<void> => {
  const perguntas = await db.select().from(questionarioMasterTable).orderBy(questionarioMasterTable.bloco, questionarioMasterTable.perguntaId);
  res.json(perguntas);
});

router.get("/pacientes/:pacienteId/questionario/respostas", async (req, res): Promise<void> => {
  const pacienteId = parseId(req.params.pacienteId);
  if (!pacienteId) { res.status(400).json({ error: "pacienteId invalido" }); return; }
  const respostas = await db.select().from(questionarioRespostasTable)
    .where(eq(questionarioRespostasTable.pacienteId, pacienteId))
    .orderBy(desc(questionarioRespostasTable.dataPreenchimento));
  res.json(respostas);
});

router.post("/pacientes/:pacienteId/questionario/respostas", async (req, res): Promise<void> => {
  const pacienteId = parseId(req.params.pacienteId);
  if (!pacienteId) { res.status(400).json({ error: "pacienteId invalido" }); return; }

  const [paciente] = await db.select().from(pacientesTable).where(eq(pacientesTable.id, pacienteId));
  if (!paciente) {
    res.status(404).json({ error: "Paciente nao encontrado" });
    return;
  }

  const { periodo, respostas, observacoesMedico, preenchidoPor } = req.body;

  if (!periodo || typeof periodo !== "string") {
    res.status(400).json({ error: "Periodo e obrigatorio (string)" });
    return;
  }
  if (!respostas || typeof respostas !== "object") {
    res.status(400).json({ error: "Respostas e obrigatorio (object)" });
    return;
  }

  const [registro] = await db.insert(questionarioRespostasTable).values({
    pacienteId,
    periodo,
    respostas,
    observacoesMedico: observacoesMedico ?? null,
    preenchidoPor: preenchidoPor ?? null,
    status: "RASCUNHO",
  }).returning();

  res.status(201).json(registro);
});

router.put("/pacientes/:pacienteId/questionario/respostas/:id", async (req, res): Promise<void> => {
  const pacienteId = parseId(req.params.pacienteId);
  const id = parseId(req.params.id);
  if (!pacienteId || !id) { res.status(400).json({ error: "IDs invalidos" }); return; }

  const { respostas, observacoesMedico, status } = req.body;

  const updates: Record<string, unknown> = {};
  if (respostas !== undefined) updates.respostas = respostas;
  if (observacoesMedico !== undefined) updates.observacoesMedico = observacoesMedico;
  if (status !== undefined) {
    if (!["RASCUNHO", "VALIDADO", "APROVADO", "STAND BY"].includes(status)) {
      res.status(400).json({ error: "Status invalido" });
      return;
    }
    updates.status = status;
  }

  const [registro] = await db.update(questionarioRespostasTable)
    .set(updates)
    .where(and(eq(questionarioRespostasTable.id, id), eq(questionarioRespostasTable.pacienteId, pacienteId)))
    .returning();

  if (!registro) {
    res.status(404).json({ error: "Registro nao encontrado para este paciente" });
    return;
  }

  res.json(registro);
});

router.get("/pacientes/:pacienteId/estado-saude", async (req, res): Promise<void> => {
  const pacienteId = parseId(req.params.pacienteId);
  if (!pacienteId) { res.status(400).json({ error: "pacienteId invalido" }); return; }
  const estados = await db.select().from(estadoSaudePacienteTable)
    .where(eq(estadoSaudePacienteTable.pacienteId, pacienteId))
    .orderBy(desc(estadoSaudePacienteTable.dataAvaliacao));
  res.json(estados);
});

router.post("/pacientes/:pacienteId/estado-saude", async (req, res): Promise<void> => {
  const pacienteId = parseId(req.params.pacienteId);
  if (!pacienteId) { res.status(400).json({ error: "pacienteId invalido" }); return; }

  const [paciente] = await db.select().from(pacientesTable).where(eq(pacientesTable.id, pacienteId));
  if (!paciente) {
    res.status(404).json({ error: "Paciente nao encontrado" });
    return;
  }

  const {
    questionarioRespostaId,
    periodo,
    condicoesAtuais,
    sintomasAtivos,
    medicamentosEmUso,
    nivelEnergia,
    nivelDor,
    qualidadeSono,
    nivelEstresse,
    pesoKg,
    alturaM,
    pressaoArterial,
    observacoes,
    evolucao,
  } = req.body;

  if (!periodo || typeof periodo !== "string") {
    res.status(400).json({ error: "Periodo e obrigatorio (string)" });
    return;
  }
  if (!condicoesAtuais || typeof condicoesAtuais !== "object") {
    res.status(400).json({ error: "Condicoes atuais e obrigatorio (object)" });
    return;
  }

  const result = await db.transaction(async (tx) => {
    const anteriores = await tx.select().from(estadoSaudePacienteTable)
      .where(and(eq(estadoSaudePacienteTable.pacienteId, pacienteId), eq(estadoSaudePacienteTable.status, "ATIVO")))
      .orderBy(desc(estadoSaudePacienteTable.dataAvaliacao));

    if (anteriores.length > 0) {
      await tx.update(estadoSaudePacienteTable)
        .set({ status: "HISTORICO" })
        .where(eq(estadoSaudePacienteTable.id, anteriores[0].id));
    }

    const [estado] = await tx.insert(estadoSaudePacienteTable).values({
      pacienteId,
      questionarioRespostaId: questionarioRespostaId ?? null,
      periodo,
      condicoesAtuais,
      sintomasAtivos: sintomasAtivos ?? null,
      medicamentosEmUso: medicamentosEmUso ?? null,
      nivelEnergia: nivelEnergia ?? null,
      nivelDor: nivelDor ?? null,
      qualidadeSono: qualidadeSono ?? null,
      nivelEstresse: nivelEstresse ?? null,
      pesoKg: pesoKg ?? null,
      alturaM: alturaM ?? null,
      pressaoArterial: pressaoArterial ?? null,
      observacoes: observacoes ?? null,
      evolucao: evolucao ?? "INICIAL",
      status: "ATIVO",
    }).returning();

    return estado;
  });

  res.status(201).json(result);
});

router.put("/pacientes/:pacienteId/estado-saude/:id", async (req, res): Promise<void> => {
  const pacienteId = parseId(req.params.pacienteId);
  const id = parseId(req.params.id);
  if (!pacienteId || !id) { res.status(400).json({ error: "IDs invalidos" }); return; }

  const updates: Record<string, unknown> = {};
  const fields = ["condicoesAtuais", "sintomasAtivos", "medicamentosEmUso", "nivelEnergia", "nivelDor", "qualidadeSono", "nivelEstresse", "pesoKg", "alturaM", "pressaoArterial", "observacoes", "evolucao", "status"];
  for (const f of fields) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }

  const [estado] = await db.update(estadoSaudePacienteTable)
    .set(updates)
    .where(and(eq(estadoSaudePacienteTable.id, id), eq(estadoSaudePacienteTable.pacienteId, pacienteId)))
    .returning();

  if (!estado) {
    res.status(404).json({ error: "Estado de saude nao encontrado para este paciente" });
    return;
  }

  res.json(estado);
});

export default router;
