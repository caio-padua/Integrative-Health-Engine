import { Router } from "express";
import { db, unidadesTable } from "@workspace/db";
import { eq, and, gt, sql } from "drizzle-orm";
import { CriarUnidadeBody } from "@workspace/api-zod";
import { z } from "zod";

const router = Router();

// Task #11 — validacao dos novos campos de janelas padrao de lembrete.
const HORARIO_HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const lembreteHorariosSchema = z
  .array(z.string().regex(HORARIO_HHMM, "Horario deve estar no formato HH:MM"))
  .max(24, "No maximo 24 horarios por unidade");
const lembreteToleranciaSchema = z
  .number()
  .int("Tolerancia deve ser inteira")
  .min(0, "Tolerancia nao pode ser negativa")
  .max(720, "Tolerancia maxima e 720 minutos (12h)");

router.get("/unidades", async (req, res): Promise<void> => {
  // Por padrao filtra arquivadas (ids 1-7 sao agendas-historicas confundidas).
  // ?incluirArquivadas=true para auditoria.
  const incluirArquivadas = req.query.incluirArquivadas === "true";
  const unidades = incluirArquivadas
    ? await db.select().from(unidadesTable).orderBy(unidadesTable.id)
    : await db.select().from(unidadesTable).where(gt(unidadesTable.id, 7)).orderBy(unidadesTable.id);
  res.json(unidades);
});

router.post("/unidades", async (req, res): Promise<void> => {
  const parsed = CriarUnidadeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  // Task #11 — aceita os defaults de lembrete na criacao (opcionais; sem
  // valor cai no default da coluna).
  const extras: Record<string, unknown> = {};
  if (req.body?.lembreteHorariosPadrao !== undefined) {
    const r = lembreteHorariosSchema.safeParse(req.body.lembreteHorariosPadrao);
    if (!r.success) {
      res.status(400).json({ error: r.error.issues[0]?.message ?? "lembreteHorariosPadrao invalido" });
      return;
    }
    extras.lembreteHorariosPadrao = r.data;
  }
  if (req.body?.lembreteToleranciaMinutos !== undefined) {
    const r = lembreteToleranciaSchema.safeParse(Number(req.body.lembreteToleranciaMinutos));
    if (!r.success) {
      res.status(400).json({ error: r.error.issues[0]?.message ?? "lembreteToleranciaMinutos invalido" });
      return;
    }
    extras.lembreteToleranciaMinutos = r.data;
  }
  const [unidade] = await db.insert(unidadesTable).values({ ...parsed.data, ...extras }).returning();
  res.status(201).json(unidade);
});

router.get("/unidades/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [unidade] = await db.select().from(unidadesTable).where(eq(unidadesTable.id, id));
  if (!unidade) { res.status(404).json({ error: "Unidade não encontrada" }); return; }
  res.json(unidade);
});

router.put("/unidades/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [existente] = await db.select().from(unidadesTable).where(eq(unidadesTable.id, id));
  if (!existente) { res.status(404).json({ error: "Unidade nao encontrada" }); return; }
  if (existente.tipo === "genesis_seed") {
    res.status(403).json({ error: "Instituto Genesis e semente perene — somente o administrador geral pode altera-la." });
    return;
  }
  const allowedFields = [
    "nome", "endereco", "bairro", "cidade", "estado", "cep", "cnpj",
    "telefone", "tipo", "googleCalendarId", "googleCalendarEmail", "cor", "ativa", "nick",
    "emailGeral", "emailAgenda", "emailEnfermagem01", "emailEnfermagem02",
    "emailConsultor01", "emailConsultor02", "emailSupervisor01", "emailSupervisor02",
    "emailFinanceiro01", "emailOuvidoria01",
    // Task #12 — janelas padrao de envio de lembrete por unidade
    "lembreteHorariosPadrao", "lembreteToleranciaMinutos",
  ];
  const updates: Record<string, any> = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  // Task #11 + #12 — defaults de lembrete validados via Zod (HH:MM real e
  // tolerancia inteira ate 720 min). Sobrescreve qualquer valor capturado
  // pelo loop allowedFields acima com o resultado canonico do schema.
  if (req.body?.lembreteHorariosPadrao !== undefined) {
    const r = lembreteHorariosSchema.safeParse(req.body.lembreteHorariosPadrao);
    if (!r.success) {
      res.status(400).json({ error: r.error.issues[0]?.message ?? "lembreteHorariosPadrao invalido" });
      return;
    }
    updates.lembreteHorariosPadrao = r.data.map((h) => h.trim());
  }
  if (req.body?.lembreteToleranciaMinutos !== undefined) {
    const r = lembreteToleranciaSchema.safeParse(Number(req.body.lembreteToleranciaMinutos));
    if (!r.success) {
      res.status(400).json({ error: r.error.issues[0]?.message ?? "lembreteToleranciaMinutos invalido" });
      return;
    }
    updates.lembreteToleranciaMinutos = r.data;
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nenhum campo para atualizar" });
    return;
  }
  const [updated] = await db.update(unidadesTable).set(updates).where(eq(unidadesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Unidade não encontrada" }); return; }
  res.json(updated);
});

router.delete("/unidades/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [unidade] = await db.select().from(unidadesTable).where(eq(unidadesTable.id, id));
  if (!unidade) { res.status(404).json({ error: "Unidade nao encontrada" }); return; }
  if (unidade.tipo === "genesis_seed") {
    res.status(403).json({ error: "Instituto Genesis e semente perene — nao pode ser excluido. Apenas adicoes sao permitidas." });
    return;
  }
  const [deleted] = await db.delete(unidadesTable).where(eq(unidadesTable.id, id)).returning();
  res.json({ ok: true });
});

export default router;
