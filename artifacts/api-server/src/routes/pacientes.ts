import { Router } from "express";
import { db, pacientesTable, unidadesTable } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";
import { CriarPacienteBody } from "@workspace/api-zod";

const router = Router();

router.get("/pacientes", async (req, res): Promise<void> => {
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : undefined;
  const busca = req.query.busca as string | undefined;

  let query = db
    .select({
      id: pacientesTable.id,
      nome: pacientesTable.nome,
      cpf: pacientesTable.cpf,
      dataNascimento: pacientesTable.dataNascimento,
      telefone: pacientesTable.telefone,
      email: pacientesTable.email,
      unidadeId: pacientesTable.unidadeId,
      statusAtivo: pacientesTable.statusAtivo,
      criadoEm: pacientesTable.criadoEm,
      atualizadoEm: pacientesTable.atualizadoEm,
    })
    .from(pacientesTable);

  const pacientes = await query;
  let result = pacientes;

  if (unidadeId) result = result.filter(p => p.unidadeId === unidadeId);
  if (busca) {
    const lower = busca.toLowerCase();
    result = result.filter(p =>
      p.nome.toLowerCase().includes(lower) ||
      (p.cpf && p.cpf.includes(lower)) ||
      (p.telefone && p.telefone.includes(lower))
    );
  }

  res.json(result);
});

router.post("/pacientes", async (req, res): Promise<void> => {
  const parsed = CriarPacienteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [paciente] = await db.insert(pacientesTable).values(parsed.data).returning();
  res.status(201).json(paciente);
});

router.get("/pacientes/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [paciente] = await db.select().from(pacientesTable).where(eq(pacientesTable.id, id));
  if (!paciente) { res.status(404).json({ error: "Paciente não encontrado" }); return; }
  res.json(paciente);
});

router.put("/pacientes/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = CriarPacienteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [paciente] = await db.update(pacientesTable).set(parsed.data).where(eq(pacientesTable.id, id)).returning();
  if (!paciente) { res.status(404).json({ error: "Paciente não encontrado" }); return; }
  res.json(paciente);
});

export default router;
