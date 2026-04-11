import { Router } from "express";
import {
  db, soberaniaConfigTable, profissionalConfiancaTable, filaPreceptorTable,
  eventosClinicosTable, usuariosTable, pacientesTable,
} from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

router.get("/soberania/config", async (req, res): Promise<void> => {
  const [config] = await db
    .select()
    .from(soberaniaConfigTable)
    .orderBy(desc(soberaniaConfigTable.criadoEm))
    .limit(1);

  res.json({
    validacaoSupremaAtiva: config?.validacaoSupremaAtiva ?? true,
    prazoHomologacaoHoras: config?.prazoHomologacaoHoras ?? 48,
    ultimaAlteracao: config?.criadoEm ?? null,
    motivo: config?.motivo ?? null,
    observacao: config?.observacao ?? null,
  });
});

router.post("/soberania/config", async (req, res): Promise<void> => {
  const { validacaoSupremaAtiva, prazoHomologacaoHoras, alteradoPorId, motivo, observacao } = req.body;

  if (!alteradoPorId || !motivo) {
    res.status(400).json({ error: "alteradoPorId e motivo são obrigatórios" });
    return;
  }

  const [diretor] = await db
    .select()
    .from(usuariosTable)
    .where(and(eq(usuariosTable.id, alteradoPorId), eq(usuariosTable.perfil, "validador_mestre")));

  if (!diretor) {
    res.status(403).json({ error: "Apenas o Diretor Clínico (validador_mestre) pode alterar a soberania" });
    return;
  }

  const [config] = await db
    .insert(soberaniaConfigTable)
    .values({
      validacaoSupremaAtiva,
      prazoHomologacaoHoras: prazoHomologacaoHoras ?? 48,
      alteradoPorId,
      motivo,
      observacao,
    })
    .returning();

  await db.insert(eventosClinicosTable).values({
    tipo: "SOBERANIA_TOGGLE",
    descricao: `Soberania médica ${validacaoSupremaAtiva ? "ATIVADA" : "DESATIVADA"} — Motivo: ${motivo}`,
    usuarioId: alteradoPorId,
    metadados: JSON.stringify({ validacaoSupremaAtiva, motivo, observacao }),
  });

  res.status(201).json(config);
});

router.get("/soberania/confianca", async (req, res): Promise<void> => {
  const lista = await db
    .select({
      id: profissionalConfiancaTable.id,
      profissionalId: profissionalConfiancaTable.profissionalId,
      profissionalNome: usuariosTable.nome,
      profissionalPerfil: usuariosTable.perfil,
      confiancaDelegada: profissionalConfiancaTable.confiancaDelegada,
      observacao: profissionalConfiancaTable.observacao,
      atualizadoEm: profissionalConfiancaTable.atualizadoEm,
    })
    .from(profissionalConfiancaTable)
    .leftJoin(usuariosTable, eq(profissionalConfiancaTable.profissionalId, usuariosTable.id));

  res.json(lista);
});

router.patch("/soberania/confianca/:profissionalId", async (req, res): Promise<void> => {
  const profissionalId = parseInt(req.params.profissionalId, 10);
  const { confiancaDelegada, delegadoPorId, observacao } = req.body;

  if (delegadoPorId === undefined || confiancaDelegada === undefined) {
    res.status(400).json({ error: "delegadoPorId e confiancaDelegada são obrigatórios" });
    return;
  }

  const [diretor] = await db
    .select()
    .from(usuariosTable)
    .where(and(eq(usuariosTable.id, delegadoPorId), eq(usuariosTable.perfil, "validador_mestre")));

  if (!diretor) {
    res.status(403).json({ error: "Apenas o Diretor Clínico pode delegar confiança" });
    return;
  }

  const existing = await db
    .select()
    .from(profissionalConfiancaTable)
    .where(eq(profissionalConfiancaTable.profissionalId, profissionalId));

  let resultado;
  if (existing.length > 0) {
    [resultado] = await db
      .update(profissionalConfiancaTable)
      .set({ confiancaDelegada, delegadoPorId, observacao, atualizadoEm: new Date() })
      .where(eq(profissionalConfiancaTable.profissionalId, profissionalId))
      .returning();
  } else {
    [resultado] = await db
      .insert(profissionalConfiancaTable)
      .values({ profissionalId, confiancaDelegada, delegadoPorId, observacao })
      .returning();
  }

  await db.insert(eventosClinicosTable).values({
    tipo: "CONFIANCA_DELEGADA",
    descricao: `Confiança ${confiancaDelegada ? "DELEGADA" : "REVOGADA"} para profissional ID ${profissionalId}`,
    usuarioId: delegadoPorId,
    metadados: JSON.stringify({ profissionalId, confiancaDelegada, observacao }),
  });

  res.json(resultado);
});

router.post("/soberania/verificar-fluxo", async (req, res): Promise<void> => {
  const { assistenteId } = req.body;

  if (!assistenteId) {
    res.status(400).json({ error: "assistenteId é obrigatório" });
    return;
  }

  const [config] = await db
    .select()
    .from(soberaniaConfigTable)
    .orderBy(desc(soberaniaConfigTable.criadoEm))
    .limit(1);

  const soberaniaAtiva = config?.validacaoSupremaAtiva ?? true;

  if (!soberaniaAtiva) {
    res.json({
      requerHomologacaoDiretor: false,
      motivo: "Soberania global desativada — fluxo direto com supervisor",
    });
    return;
  }

  const [confianca] = await db
    .select()
    .from(profissionalConfiancaTable)
    .where(eq(profissionalConfiancaTable.profissionalId, assistenteId));

  if (confianca?.confiancaDelegada) {
    res.json({
      requerHomologacaoDiretor: false,
      motivo: "Profissional com confiança delegada — fluxo direto com supervisor",
    });
    return;
  }

  res.json({
    requerHomologacaoDiretor: true,
    prazoHomologacaoHoras: config?.prazoHomologacaoHoras ?? 48,
    motivo: "Soberania ativa + sem confiança delegada — entra na Fila do Preceptor",
  });
});

router.get("/fila-preceptor", async (req, res): Promise<void> => {
  const statusFilter = req.query.status as string | undefined;
  const results = await db
    .select({
      id: filaPreceptorTable.id,
      casoId: filaPreceptorTable.casoId,
      tipoCaso: filaPreceptorTable.tipoCaso,
      status: filaPreceptorTable.status,
      pacienteId: filaPreceptorTable.pacienteId,
      pacienteNome: pacientesTable.nome,
      assistenteId: filaPreceptorTable.assistenteId,
      supervisorValidouId: filaPreceptorTable.supervisorValidouId,
      supervisorValidouEm: filaPreceptorTable.supervisorValidouEm,
      observacaoSupervisor: filaPreceptorTable.observacaoSupervisor,
      prazoHomologacao: filaPreceptorTable.prazoHomologacao,
      homologadoPorId: filaPreceptorTable.homologadoPorId,
      homologadoEm: filaPreceptorTable.homologadoEm,
      observacaoDiretor: filaPreceptorTable.observacaoDiretor,
      motivoDevolucao: filaPreceptorTable.motivoDevolucao,
      criadoEm: filaPreceptorTable.criadoEm,
    })
    .from(filaPreceptorTable)
    .leftJoin(pacientesTable, eq(filaPreceptorTable.pacienteId, pacientesTable.id))
    .orderBy(filaPreceptorTable.prazoHomologacao);

  const filtered = statusFilter ? results.filter(r => r.status === statusFilter) : results;
  res.json(filtered);
});

router.post("/fila-preceptor", async (req, res): Promise<void> => {
  const { casoId, tipoCaso, assistenteId, pacienteId, supervisorValidouId, observacaoSupervisor } = req.body;

  if (!casoId || !tipoCaso || !assistenteId || !pacienteId || !supervisorValidouId) {
    res.status(400).json({ error: "Campos obrigatórios faltando: casoId, tipoCaso, assistenteId, pacienteId, supervisorValidouId" });
    return;
  }

  const [config] = await db
    .select()
    .from(soberaniaConfigTable)
    .orderBy(desc(soberaniaConfigTable.criadoEm))
    .limit(1);

  const prazoHoras = config?.prazoHomologacaoHoras ?? 48;
  const prazoHomologacao = new Date(Date.now() + prazoHoras * 60 * 60 * 1000);

  const [entrada] = await db
    .insert(filaPreceptorTable)
    .values({
      casoId,
      tipoCaso,
      assistenteId,
      pacienteId,
      supervisorValidouId,
      supervisorValidouEm: new Date(),
      observacaoSupervisor,
      status: "AGUARDANDO",
      prazoHomologacao,
    })
    .returning();

  await db.insert(eventosClinicosTable).values({
    tipo: "FILA_PRECEPTOR",
    descricao: `Caso #${casoId} (${tipoCaso}) entrou na Fila do Preceptor — prazo ${prazoHoras}h`,
    usuarioId: supervisorValidouId,
    pacienteId,
    entidadeTipo: tipoCaso,
    entidadeId: casoId,
    metadados: JSON.stringify({ casoId, tipoCaso, assistenteId, prazoHomologacao }),
  });

  res.status(201).json(entrada);
});

router.patch("/fila-preceptor/:id/homologar", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { homologadoPorId, observacaoDiretor } = req.body;

  if (!homologadoPorId) {
    res.status(400).json({ error: "homologadoPorId é obrigatório" });
    return;
  }

  const [diretor] = await db
    .select()
    .from(usuariosTable)
    .where(and(eq(usuariosTable.id, homologadoPorId), eq(usuariosTable.perfil, "validador_mestre")));

  if (!diretor) {
    res.status(403).json({ error: "Apenas o Diretor Clínico pode homologar" });
    return;
  }

  const [caso] = await db
    .update(filaPreceptorTable)
    .set({
      status: "HOMOLOGADO",
      homologadoPorId,
      homologadoEm: new Date(),
      observacaoDiretor,
    })
    .where(eq(filaPreceptorTable.id, id))
    .returning();

  if (!caso) {
    res.status(404).json({ error: "Caso não encontrado na fila" });
    return;
  }

  await db.insert(eventosClinicosTable).values({
    tipo: "HOMOLOGACAO",
    descricao: `Caso #${caso.casoId} HOMOLOGADO pelo Diretor`,
    usuarioId: homologadoPorId,
    pacienteId: caso.pacienteId,
    entidadeTipo: caso.tipoCaso,
    entidadeId: caso.casoId,
    metadados: JSON.stringify({ filaId: id, observacaoDiretor }),
  });

  res.json(caso);
});

router.patch("/fila-preceptor/:id/devolver", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { homologadoPorId, motivoDevolucao, observacaoDiretor } = req.body;

  if (!homologadoPorId || !motivoDevolucao) {
    res.status(400).json({ error: "homologadoPorId e motivoDevolucao são obrigatórios" });
    return;
  }

  const [diretor] = await db
    .select()
    .from(usuariosTable)
    .where(and(eq(usuariosTable.id, homologadoPorId), eq(usuariosTable.perfil, "validador_mestre")));

  if (!diretor) {
    res.status(403).json({ error: "Apenas o Diretor Clínico pode devolver" });
    return;
  }

  const [caso] = await db
    .update(filaPreceptorTable)
    .set({
      status: "DEVOLVIDO",
      homologadoPorId,
      homologadoEm: new Date(),
      motivoDevolucao,
      observacaoDiretor,
    })
    .where(eq(filaPreceptorTable.id, id))
    .returning();

  if (!caso) {
    res.status(404).json({ error: "Caso não encontrado na fila" });
    return;
  }

  await db.insert(eventosClinicosTable).values({
    tipo: "DEVOLUCAO",
    descricao: `Caso #${caso.casoId} DEVOLVIDO — Motivo: ${motivoDevolucao}`,
    usuarioId: homologadoPorId,
    pacienteId: caso.pacienteId,
    entidadeTipo: caso.tipoCaso,
    entidadeId: caso.casoId,
    metadados: JSON.stringify({ filaId: id, motivoDevolucao, observacaoDiretor }),
  });

  res.json(caso);
});

router.get("/soberania/eventos", async (req, res): Promise<void> => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const tipo = req.query.tipo as string | undefined;
  const results = await db
    .select({
      id: eventosClinicosTable.id,
      tipo: eventosClinicosTable.tipo,
      descricao: eventosClinicosTable.descricao,
      usuarioId: eventosClinicosTable.usuarioId,
      usuarioNome: usuariosTable.nome,
      pacienteId: eventosClinicosTable.pacienteId,
      entidadeTipo: eventosClinicosTable.entidadeTipo,
      entidadeId: eventosClinicosTable.entidadeId,
      metadados: eventosClinicosTable.metadados,
      criadoEm: eventosClinicosTable.criadoEm,
    })
    .from(eventosClinicosTable)
    .leftJoin(usuariosTable, eq(eventosClinicosTable.usuarioId, usuariosTable.id))
    .orderBy(desc(eventosClinicosTable.criadoEm))
    .limit(limit);

  const filtered = tipo ? results.filter(r => r.tipo === tipo) : results;
  res.json(filtered);
});

export default router;
