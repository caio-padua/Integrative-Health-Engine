import { Router } from "express";
import {
  db, acompanhamentoCavaloTable, examesEvolucaoTable, feedbackFormulasTable,
  dadosVisitaClinicaTable, arquivosExamesTable, formulasMasterTable,
  cascataValidacaoConfigTable, validacoesCascataTable, pacientesTable, usuariosTable,
} from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

router.get("/cavalo/acompanhamentos", async (req, res): Promise<void> => {
  const pacienteId = req.query.pacienteId ? parseInt(req.query.pacienteId as string, 10) : undefined;
  let query = db
    .select({
      id: acompanhamentoCavaloTable.id,
      pacienteId: acompanhamentoCavaloTable.pacienteId,
      pacienteNome: pacientesTable.nome,
      tipo: acompanhamentoCavaloTable.tipo,
      status: acompanhamentoCavaloTable.status,
      dataAgendada: acompanhamentoCavaloTable.dataAgendada,
      dataRealizada: acompanhamentoCavaloTable.dataRealizada,
      responsavelId: acompanhamentoCavaloTable.responsavelId,
      responsavelNome: usuariosTable.nome,
      observacoes: acompanhamentoCavaloTable.observacoes,
      classificacaoAlerta: acompanhamentoCavaloTable.classificacaoAlerta,
      origem: acompanhamentoCavaloTable.origem,
      criadoEm: acompanhamentoCavaloTable.criadoEm,
    })
    .from(acompanhamentoCavaloTable)
    .leftJoin(pacientesTable, eq(acompanhamentoCavaloTable.pacienteId, pacientesTable.id))
    .leftJoin(usuariosTable, eq(acompanhamentoCavaloTable.responsavelId, usuariosTable.id))
    .orderBy(desc(acompanhamentoCavaloTable.criadoEm));

  const results = await query;
  const filtered = pacienteId ? results.filter(r => r.pacienteId === pacienteId) : results;
  res.json(filtered);
});

router.post("/cavalo/acompanhamentos", async (req, res): Promise<void> => {
  try {
    const [created] = await db.insert(acompanhamentoCavaloTable).values(req.body).returning();
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch("/cavalo/acompanhamentos/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [updated] = await db.update(acompanhamentoCavaloTable).set(req.body).where(eq(acompanhamentoCavaloTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Acompanhamento não encontrado" }); return; }
  res.json(updated);
});

router.get("/cavalo/exames-evolucao", async (req, res): Promise<void> => {
  const pacienteId = req.query.pacienteId ? parseInt(req.query.pacienteId as string, 10) : undefined;
  const results = await db
    .select({
      id: examesEvolucaoTable.id,
      pacienteId: examesEvolucaoTable.pacienteId,
      pacienteNome: pacientesTable.nome,
      nomeExame: examesEvolucaoTable.nomeExame,
      categoria: examesEvolucaoTable.categoria,
      valor: examesEvolucaoTable.valor,
      unidade: examesEvolucaoTable.unidade,
      valorMinimo: examesEvolucaoTable.valorMinimo,
      valorMaximo: examesEvolucaoTable.valorMaximo,
      classificacao: examesEvolucaoTable.classificacao,
      dataColeta: examesEvolucaoTable.dataColeta,
      laboratorio: examesEvolucaoTable.laboratorio,
      origem: examesEvolucaoTable.origem,
      criadoEm: examesEvolucaoTable.criadoEm,
    })
    .from(examesEvolucaoTable)
    .leftJoin(pacientesTable, eq(examesEvolucaoTable.pacienteId, pacientesTable.id))
    .orderBy(desc(examesEvolucaoTable.criadoEm));
  const filtered = pacienteId ? results.filter(r => r.pacienteId === pacienteId) : results;
  res.json(filtered);
});

router.post("/cavalo/exames-evolucao", async (req, res): Promise<void> => {
  try {
    const [created] = await db.insert(examesEvolucaoTable).values(req.body).returning();
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/cavalo/feedback-formulas", async (req, res): Promise<void> => {
  const pacienteId = req.query.pacienteId ? parseInt(req.query.pacienteId as string, 10) : undefined;
  const results = await db.select().from(feedbackFormulasTable).orderBy(desc(feedbackFormulasTable.criadoEm));
  const filtered = pacienteId ? results.filter(r => r.pacienteId === pacienteId) : results;
  res.json(filtered);
});

router.post("/cavalo/feedback-formulas", async (req, res): Promise<void> => {
  try {
    const [created] = await db.insert(feedbackFormulasTable).values(req.body).returning();
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/cavalo/visitas-clinicas", async (req, res): Promise<void> => {
  const pacienteId = req.query.pacienteId ? parseInt(req.query.pacienteId as string, 10) : undefined;
  const results = await db
    .select({
      id: dadosVisitaClinicaTable.id,
      pacienteId: dadosVisitaClinicaTable.pacienteId,
      pacienteNome: pacientesTable.nome,
      coletadoPorId: dadosVisitaClinicaTable.coletadoPorId,
      coletadoPorNome: usuariosTable.nome,
      dataVisita: dadosVisitaClinicaTable.dataVisita,
      pesoKg: dadosVisitaClinicaTable.pesoKg,
      alturaCm: dadosVisitaClinicaTable.alturaCm,
      imc: dadosVisitaClinicaTable.imc,
      pressaoSistolica: dadosVisitaClinicaTable.pressaoSistolica,
      pressaoDiastolica: dadosVisitaClinicaTable.pressaoDiastolica,
      frequenciaCardiaca: dadosVisitaClinicaTable.frequenciaCardiaca,
      bfPercentual: dadosVisitaClinicaTable.bfPercentual,
      massaMuscularKg: dadosVisitaClinicaTable.massaMuscularKg,
      classificacaoAlerta: dadosVisitaClinicaTable.classificacaoAlerta,
      adesaoPercebida: dadosVisitaClinicaTable.adesaoPercebida,
      origem: dadosVisitaClinicaTable.origem,
      criadoEm: dadosVisitaClinicaTable.criadoEm,
    })
    .from(dadosVisitaClinicaTable)
    .leftJoin(pacientesTable, eq(dadosVisitaClinicaTable.pacienteId, pacientesTable.id))
    .leftJoin(usuariosTable, eq(dadosVisitaClinicaTable.coletadoPorId, usuariosTable.id))
    .orderBy(desc(dadosVisitaClinicaTable.criadoEm));
  const filtered = pacienteId ? results.filter(r => r.pacienteId === pacienteId) : results;
  res.json(filtered);
});

router.post("/cavalo/visitas-clinicas", async (req, res): Promise<void> => {
  try {
    const [created] = await db.insert(dadosVisitaClinicaTable).values(req.body).returning();
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/cavalo/arquivos-exames", async (req, res): Promise<void> => {
  const pacienteId = req.query.pacienteId ? parseInt(req.query.pacienteId as string, 10) : undefined;
  const results = await db.select().from(arquivosExamesTable).orderBy(desc(arquivosExamesTable.criadoEm));
  const filtered = pacienteId ? results.filter(r => r.pacienteId === pacienteId) : results;
  res.json(filtered);
});

router.post("/cavalo/arquivos-exames", async (req, res): Promise<void> => {
  try {
    const [created] = await db.insert(arquivosExamesTable).values(req.body).returning();
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/cavalo/formulas-master", async (req, res): Promise<void> => {
  const results = await db.select().from(formulasMasterTable).orderBy(desc(formulasMasterTable.criadoEm));
  res.json(results);
});

router.post("/cavalo/formulas-master", async (req, res): Promise<void> => {
  try {
    const [created] = await db.insert(formulasMasterTable).values(req.body).returning();
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/cavalo/cascata-config", async (req, res): Promise<void> => {
  const [config] = await db.select().from(cascataValidacaoConfigTable).orderBy(desc(cascataValidacaoConfigTable.id)).limit(1);
  res.json(config || { ativa: false, requerEnfermeira03: true, requerConsultor03: true, requerMedico03: true, requerMedicoSenior: true });
});

router.patch("/cavalo/cascata-config/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [updated] = await db.update(cascataValidacaoConfigTable).set(req.body).where(eq(cascataValidacaoConfigTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Config não encontrada" }); return; }
  res.json(updated);
});

router.get("/cavalo/validacoes-cascata", async (req, res): Promise<void> => {
  const entidadeTipo = req.query.entidadeTipo as string | undefined;
  const entidadeId = req.query.entidadeId ? parseInt(req.query.entidadeId as string, 10) : undefined;
  const results = await db
    .select({
      id: validacoesCascataTable.id,
      entidadeTipo: validacoesCascataTable.entidadeTipo,
      entidadeId: validacoesCascataTable.entidadeId,
      pacienteId: validacoesCascataTable.pacienteId,
      etapa: validacoesCascataTable.etapa,
      status: validacoesCascataTable.status,
      validadoPorId: validacoesCascataTable.validadoPorId,
      validadoPorNome: usuariosTable.nome,
      observacao: validacoesCascataTable.observacao,
      validadoEm: validacoesCascataTable.validadoEm,
      criadoEm: validacoesCascataTable.criadoEm,
    })
    .from(validacoesCascataTable)
    .leftJoin(usuariosTable, eq(validacoesCascataTable.validadoPorId, usuariosTable.id))
    .orderBy(desc(validacoesCascataTable.criadoEm));

  let filtered = results;
  if (entidadeTipo) filtered = filtered.filter(r => r.entidadeTipo === entidadeTipo);
  if (entidadeId) filtered = filtered.filter(r => r.entidadeId === entidadeId);
  res.json(filtered);
});

router.post("/cavalo/validacoes-cascata", async (req, res): Promise<void> => {
  try {
    const [created] = await db.insert(validacoesCascataTable).values(req.body).returning();
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch("/cavalo/validacoes-cascata/:id/validar", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { status, validadoPorId, observacao } = req.body;

  if (!validadoPorId || !status) {
    res.status(400).json({ error: "validadoPorId e status são obrigatórios" });
    return;
  }

  const validador = await db.select().from(usuariosTable).where(eq(usuariosTable.id, validadoPorId));
  if (!validador.length) {
    res.status(404).json({ error: "Validador não encontrado" });
    return;
  }

  const [validacao] = await db.select().from(validacoesCascataTable).where(eq(validacoesCascataTable.id, id));
  if (!validacao) {
    res.status(404).json({ error: "Validação não encontrada" });
    return;
  }

  const perfilValidador = validador[0].perfil;
  const etapa = validacao.etapa;

  const perfilPermitido: Record<string, string[]> = {
    "ENFERMEIRA03": ["enfermeira", "validador_enfermeiro"],
    "CONSULTOR03": ["validador_enfermeiro", "medico_tecnico", "validador_mestre"],
    "MEDICO03": ["medico_tecnico", "validador_mestre"],
    "MEDICO_SENIOR": ["validador_mestre"],
  };

  if (!perfilPermitido[etapa]?.includes(perfilValidador)) {
    res.status(403).json({
      error: `Perfil '${perfilValidador}' não tem permissão para validar etapa '${etapa}'`,
      perfilRequerido: perfilPermitido[etapa],
    });
    return;
  }

  const [updated] = await db
    .update(validacoesCascataTable)
    .set({ status, validadoPorId, observacao, validadoEm: new Date() })
    .where(eq(validacoesCascataTable.id, id))
    .returning();

  res.json(updated);
});

export default router;
