import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { demandasServicoTable, pacientesTable, usuariosTable, unidadesTable, PLANOS_ACOMPANHAMENTO, CUSTO_POR_COMPLEXIDADE } from "@workspace/db";
import { eq, desc, and, count, sql } from "drizzle-orm";

const router = Router();

router.get("/acompanhamento/planos", async (_req: Request, res: Response) => {
  res.json(PLANOS_ACOMPANHAMENTO);
});

router.patch("/acompanhamento/paciente/:id/plano", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const { plano } = req.body;
  if (!["diamante", "ouro", "prata", "cobre"].includes(plano)) {
    res.status(400).json({ error: "Plano invalido. Use: diamante, ouro, prata, cobre" });
    return;
  }
  const [paciente] = await db.update(pacientesTable).set({ planoAcompanhamento: plano }).where(eq(pacientesTable.id, id)).returning();
  if (!paciente) { res.status(404).json({ error: "Paciente nao encontrado" }); return; }
  res.json(paciente);
});

router.get("/demandas", async (req: Request, res: Response) => {
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : undefined;
  const consultorId = req.query.consultorId ? parseInt(req.query.consultorId as string, 10) : undefined;
  const status = req.query.status as string | undefined;

  let demandas = await db
    .select()
    .from(demandasServicoTable)
    .orderBy(desc(demandasServicoTable.criadoEm));

  if (unidadeId) demandas = demandas.filter(d => d.unidadeId === unidadeId);
  if (consultorId) demandas = demandas.filter(d => d.consultorId === consultorId);
  if (status) demandas = demandas.filter(d => d.status === status);

  const consultores = await db.select({ id: usuariosTable.id, nome: usuariosTable.nome }).from(usuariosTable);
  const pacientes = await db.select({ id: pacientesTable.id, nome: pacientesTable.nome }).from(pacientesTable);
  const unidades = await db.select({ id: unidadesTable.id, nome: unidadesTable.nome, cor: unidadesTable.cor }).from(unidadesTable);

  const consultorMap = new Map(consultores.map(c => [c.id, c.nome]));
  const pacienteMap = new Map(pacientes.map(p => [p.id, p.nome]));
  const unidadeMap = new Map(unidades.map(u => [u.id, { nome: u.nome, cor: u.cor }]));

  const enriched = demandas.map(d => ({
    ...d,
    consultorNome: consultorMap.get(d.consultorId) || "—",
    pacienteNome: d.pacienteId ? pacienteMap.get(d.pacienteId) || "—" : null,
    unidadeNome: unidadeMap.get(d.unidadeId)?.nome || "—",
    unidadeCor: unidadeMap.get(d.unidadeId)?.cor || null,
    complexidadeInfo: CUSTO_POR_COMPLEXIDADE[d.complexidade as keyof typeof CUSTO_POR_COMPLEXIDADE],
  }));

  res.json(enriched);
});

router.post("/demandas", async (req: Request, res: Response) => {
  const { consultorId, pacienteId, unidadeId, tipo, complexidade, titulo, descricao, tempoGastoMin, planoOrigem, delegacaoId } = req.body;

  const [nova] = await db.insert(demandasServicoTable).values({
    consultorId,
    pacienteId,
    unidadeId,
    tipo,
    complexidade: complexidade || "verde",
    titulo,
    descricao,
    tempoGastoMin,
    planoOrigem,
    delegacaoId,
    status: "aberta",
  }).returning();

  res.status(201).json(nova);
});

router.patch("/demandas/:id/status", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const { status, tempoGastoMin } = req.body;

  const updates: Record<string, unknown> = { status };
  if (status === "concluida") updates.concluidaEm = new Date();
  if (tempoGastoMin !== undefined) updates.tempoGastoMin = tempoGastoMin;

  const [updated] = await db.update(demandasServicoTable).set(updates).where(eq(demandasServicoTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Demanda nao encontrada" }); return; }
  res.json(updated);
});

router.get("/demandas/resumo", async (req: Request, res: Response) => {
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : undefined;

  let demandas = await db.select().from(demandasServicoTable);
  if (unidadeId) demandas = demandas.filter(d => d.unidadeId === unidadeId);

  const total = demandas.length;
  const abertas = demandas.filter(d => d.status === "aberta").length;
  const emAtendimento = demandas.filter(d => d.status === "em_atendimento").length;
  const concluidas = demandas.filter(d => d.status === "concluida").length;

  const porComplexidade = {
    verde: demandas.filter(d => d.complexidade === "verde").length,
    amarela: demandas.filter(d => d.complexidade === "amarela").length,
    vermelha: demandas.filter(d => d.complexidade === "vermelha").length,
  };

  const porTipo: Record<string, number> = {};
  demandas.forEach(d => {
    porTipo[d.tipo] = (porTipo[d.tipo] || 0) + 1;
  });

  const porPlano = {
    diamante: demandas.filter(d => d.planoOrigem === "diamante").length,
    ouro: demandas.filter(d => d.planoOrigem === "ouro").length,
    prata: demandas.filter(d => d.planoOrigem === "prata").length,
    cobre: demandas.filter(d => d.planoOrigem === "cobre").length,
    sem_plano: demandas.filter(d => !d.planoOrigem).length,
  };

  const tempoTotal = demandas.reduce((acc, d) => acc + (d.tempoGastoMin || 0), 0);

  const custoBase = 50;
  const custoEstimado = demandas.reduce((acc, d) => {
    const mult = CUSTO_POR_COMPLEXIDADE[d.complexidade as keyof typeof CUSTO_POR_COMPLEXIDADE]?.multiplicador || 1;
    return acc + (custoBase * mult);
  }, 0);

  const consultores = await db.select({ id: usuariosTable.id, nome: usuariosTable.nome }).from(usuariosTable);
  const consultorMap = new Map(consultores.map(c => [c.id, c.nome]));

  const porConsultor: Record<string, { total: number; verdes: number; amarelas: number; vermelhas: number; tempoMin: number }> = {};
  demandas.forEach(d => {
    const nome = consultorMap.get(d.consultorId) || `Consultor ${d.consultorId}`;
    if (!porConsultor[nome]) porConsultor[nome] = { total: 0, verdes: 0, amarelas: 0, vermelhas: 0, tempoMin: 0 };
    porConsultor[nome].total++;
    if (d.complexidade === "verde") porConsultor[nome].verdes++;
    if (d.complexidade === "amarela") porConsultor[nome].amarelas++;
    if (d.complexidade === "vermelha") porConsultor[nome].vermelhas++;
    porConsultor[nome].tempoMin += d.tempoGastoMin || 0;
  });

  const unidades = await db.select({ id: unidadesTable.id, nome: unidadesTable.nome, cor: unidadesTable.cor }).from(unidadesTable);
  const unidadeMap = new Map(unidades.map(u => [u.id, { nome: u.nome, cor: u.cor }]));

  const porUnidade: Record<string, { total: number; cor: string | null; custo: number }> = {};
  demandas.forEach(d => {
    const u = unidadeMap.get(d.unidadeId);
    const nome = u?.nome || `Unidade ${d.unidadeId}`;
    if (!porUnidade[nome]) porUnidade[nome] = { total: 0, cor: u?.cor || null, custo: 0 };
    porUnidade[nome].total++;
    const mult = CUSTO_POR_COMPLEXIDADE[d.complexidade as keyof typeof CUSTO_POR_COMPLEXIDADE]?.multiplicador || 1;
    porUnidade[nome].custo += custoBase * mult;
  });

  res.json({
    total, abertas, emAtendimento, concluidas,
    porComplexidade, porTipo, porPlano,
    tempoTotalMin: tempoTotal,
    custoEstimado: Math.round(custoEstimado * 100) / 100,
    porConsultor,
    porUnidade,
  });
});

router.get("/acompanhamento/distribuicao", async (_req: Request, res: Response) => {
  const pacientes = await db.select({
    id: pacientesTable.id,
    nome: pacientesTable.nome,
    planoAcompanhamento: pacientesTable.planoAcompanhamento,
    unidadeId: pacientesTable.unidadeId,
  }).from(pacientesTable).where(eq(pacientesTable.statusAtivo, true));

  const distribuicao = {
    diamante: pacientes.filter(p => p.planoAcompanhamento === "diamante").length,
    ouro: pacientes.filter(p => p.planoAcompanhamento === "ouro").length,
    prata: pacientes.filter(p => p.planoAcompanhamento === "prata").length,
    cobre: pacientes.filter(p => !p.planoAcompanhamento || p.planoAcompanhamento === "cobre").length,
  };

  res.json({ total: pacientes.length, distribuicao, pacientes });
});

export default router;
