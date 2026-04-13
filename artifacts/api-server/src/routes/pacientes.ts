import { Router } from "express";
import { db, pacientesTable, unidadesTable } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";
import { CriarPacienteBody } from "@workspace/api-zod";

const router = Router();

router.get("/pacientes", async (req, res): Promise<void> => {
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : undefined;
  const busca = req.query.busca as string | undefined;

  let query = db
    .select()
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
  try {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "ID invalido" }); return; }
    const body = req.body;
    const allowed: Record<string, any> = {};
    const whitelist = ["nome", "cpf", "telefone", "email", "cep", "endereco", "complemento", "bairro", "cidade", "estado", "pais", "unidadeId", "dataNascimento", "statusAtivo", "planoAcompanhamento", "googleDriveFolderId"];
    for (const k of whitelist) {
      if (body[k] !== undefined) allowed[k] = body[k];
    }
    if (allowed.dataNascimento && typeof allowed.dataNascimento === "string") {
      allowed.dataNascimento = new Date(allowed.dataNascimento);
    }
    if (Object.keys(allowed).length === 0) { res.status(400).json({ error: "Nenhum campo para atualizar" }); return; }
    const [paciente] = await db.update(pacientesTable).set(allowed).where(eq(pacientesTable.id, id)).returning();
    if (!paciente) { res.status(404).json({ error: "Paciente não encontrado" }); return; }
    res.json(paciente);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Erro interno" });
  }
});

router.patch("/pacientes/:id/fotos", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { fotoRosto, fotoCorpo } = req.body;
  const updates: Record<string, string | null> = {};

  const validarBase64 = (v: unknown): boolean => {
    if (v === null) return true;
    if (typeof v !== "string") return false;
    if (!v.startsWith("data:image/")) return false;
    if (v.length > 5 * 1024 * 1024) return false;
    return true;
  };

  if (fotoRosto !== undefined) {
    if (!validarBase64(fotoRosto)) { res.status(400).json({ error: "Formato de foto de rosto invalido" }); return; }
    updates.fotoRosto = fotoRosto;
  }
  if (fotoCorpo !== undefined) {
    if (!validarBase64(fotoCorpo)) { res.status(400).json({ error: "Formato de foto de corpo invalido" }); return; }
    updates.fotoCorpo = fotoCorpo;
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nenhuma foto fornecida" });
    return;
  }
  const [paciente] = await db.update(pacientesTable).set(updates).where(eq(pacientesTable.id, id)).returning();
  if (!paciente) { res.status(404).json({ error: "Paciente nao encontrado" }); return; }
  res.json(paciente);
});

router.get("/cep/:cep", async (req, res): Promise<void> => {
  const cep = req.params.cep.replace(/\D/g, '');
  if (cep.length !== 8) { res.status(400).json({ error: "CEP invalido" }); return; }
  try {
    const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await resp.json();
    if (data.erro) { res.status(404).json({ error: "CEP nao encontrado" }); return; }
    res.json({
      cep: data.cep,
      endereco: data.logradouro,
      bairro: data.bairro,
      cidade: data.localidade,
      estado: data.uf,
      pais: "Brasil",
    });
  } catch {
    res.status(500).json({ error: "Erro ao consultar CEP" });
  }
});

export default router;
