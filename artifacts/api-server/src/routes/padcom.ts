import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import {
  padcomQuestionariosTable,
  insertPadcomQuestionarioSchema,
  padcomSessoesTable,
  insertPadcomSessaoSchema,
  padcomRespostasTable,
  insertPadcomRespostaSchema,
  padcomBandasTable,
  insertPadcomBandaSchema,
  padcomAlertasTable,
  padcomAlertasRegrasTable,
  padcomAuditoriaTable,
  padcomCompetenciasRegulatoriasTable,
  insertPadcomCompetenciaRegulatoriaSchema,
  padcomValidacoesCascataTable,
  insertPadcomValidacaoCascataSchema,
} from "@workspace/db";
import { eq, asc, and, or, desc, sql, count, avg } from "drizzle-orm";

// Schemas Zod parciais para PATCH (whitelist contra mass assignment)
const updatePadcomCompetenciaSchema = insertPadcomCompetenciaRegulatoriaSchema
  .omit({ id: true, criadoEm: true, atualizadoEm: true })
  .partial();
const updatePadcomValidacaoDecidirSchema = insertPadcomValidacaoCascataSchema
  .pick({ decisao: true, observacao: true, validadoPor: true, certificadoDigital: true })
  .partial();

const router = Router();

// ═══════════════════════════════════════════════════════════════
// QUESTIONÁRIOS — CRUD do catálogo de perguntas
// ═══════════════════════════════════════════════════════════════

router.get("/padcom-questionarios", async (req: Request, res: Response): Promise<void> => {
  const { clinicaId, modulo, versao, ativo } = req.query;
  let query = db.select().from(padcomQuestionariosTable);

  const conditions = [];
  if (clinicaId) conditions.push(eq(padcomQuestionariosTable.clinicaId, String(clinicaId)));
  if (modulo) conditions.push(eq(padcomQuestionariosTable.modulo, Number(modulo)));
  if (versao) conditions.push(eq(padcomQuestionariosTable.versao, Number(versao)));
  if (ativo !== undefined) conditions.push(eq(padcomQuestionariosTable.ativo, ativo === "true"));

  const rows = conditions.length > 0
    ? await query.where(and(...conditions)).orderBy(asc(padcomQuestionariosTable.modulo), asc(padcomQuestionariosTable.ordem))
    : await query.orderBy(asc(padcomQuestionariosTable.modulo), asc(padcomQuestionariosTable.ordem));

  res.json(rows);
});

router.post("/padcom-questionarios", async (req: Request, res: Response): Promise<void> => {
  const parsed = insertPadcomQuestionarioSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [row] = await db.insert(padcomQuestionariosTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.patch("/padcom-questionarios/:id", async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updates = { ...req.body, atualizadoEm: new Date() };
  const [row] = await db.update(padcomQuestionariosTable)
    .set(updates)
    .where(eq(padcomQuestionariosTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Questionário não encontrado" }); return; }
  res.json(row);
});

router.delete("/padcom-questionarios/:id", async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const [row] = await db.update(padcomQuestionariosTable)
    .set({ ativo: false, atualizadoEm: new Date() })
    .where(eq(padcomQuestionariosTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Questionário não encontrado" }); return; }
  res.json(row);
});

// ═══════════════════════════════════════════════════════════════
// SESSÕES — Iniciar, responder, finalizar
// ═══════════════════════════════════════════════════════════════

router.post("/padcom-sessoes", async (req: Request, res: Response): Promise<void> => {
  const parsed = insertPadcomSessaoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  // Contar total de perguntas ativas para esta versão
  const perguntas = await db.select({ total: count() })
    .from(padcomQuestionariosTable)
    .where(and(
      eq(padcomQuestionariosTable.ativo, true),
      parsed.data.clinicaId
        ? eq(padcomQuestionariosTable.clinicaId, parsed.data.clinicaId)
        : sql`true`
    ));

  const [row] = await db.insert(padcomSessoesTable).values({
    ...parsed.data,
    totalPerguntas: perguntas[0]?.total ?? 34,
  }).returning();

  // Auditoria
  await db.insert(padcomAuditoriaTable).values({
    clinicaId: row.clinicaId,
    usuarioId: row.pacienteId,
    papel: "paciente",
    acao: "criar",
    entidadeTipo: "sessao",
    entidadeId: row.id,
    dadosDepois: row,
  });

  res.status(201).json(row);
});

router.post("/padcom-sessoes/:id/responder", async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const parsed = insertPadcomRespostaSchema.safeParse({ ...req.body, sessaoId: id });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  // Buscar a pergunta para calcular score parcial
  const pergunta = parsed.data.questionarioId
    ? await db.select().from(padcomQuestionariosTable)
        .where(eq(padcomQuestionariosTable.id, parsed.data.questionarioId))
        .then(r => r[0])
    : null;

  const scoreParcial = pergunta && parsed.data.valorNumerico != null
    ? parsed.data.valorNumerico * (pergunta.peso ?? 1)
    : parsed.data.scoreParcial ?? 0;

  const [resposta] = await db.insert(padcomRespostasTable).values({
    ...parsed.data,
    scoreParcial,
  }).returning();

  // Atualizar sessão: incrementar respondidas + último módulo
  const respostasCount = await db.select({ total: count() })
    .from(padcomRespostasTable)
    .where(eq(padcomRespostasTable.sessaoId, id));

  await db.update(padcomSessoesTable).set({
    perguntasRespondidas: respostasCount[0]?.total ?? 0,
    ultimoModuloVisitado: parsed.data.modulo,
    ultimaPerguntaRespondida: parsed.data.ordem,
    atualizadoEm: new Date(),
  }).where(eq(padcomSessoesTable.id, id));

  res.status(201).json(resposta);
});

router.post("/padcom-sessoes/:id/finalizar", async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  // Buscar todas as respostas da sessão
  const respostas = await db.select()
    .from(padcomRespostasTable)
    .where(eq(padcomRespostasTable.sessaoId, id))
    .orderBy(asc(padcomRespostasTable.modulo), asc(padcomRespostasTable.ordem));

  if (respostas.length === 0) {
    res.status(400).json({ error: "Sessão sem respostas" });
    return;
  }

  // Calcular score final (soma dos scores parciais, normalizado 0-100)
  const somaScores = respostas.reduce((acc, r) => acc + (r.scoreParcial ?? 0), 0);
  const maxPossivel = respostas.length * 10; // máximo teórico
  const scoreFinal = Math.round((somaScores / Math.max(maxPossivel, 1)) * 100);

  // Determinar banda
  const bandas = await db.select()
    .from(padcomBandasTable)
    .where(eq(padcomBandasTable.ativo, true))
    .orderBy(asc(padcomBandasTable.scoreMinimo));

  const bandaEncontrada = bandas.find(b =>
    scoreFinal >= b.scoreMinimo && scoreFinal <= b.scoreMaximo
  );

  // Criar snapshot imutável (Kaizen #2)
  const snapshot = {
    respostas: respostas.map(r => ({
      questionarioId: r.questionarioId,
      modulo: r.modulo,
      ordem: r.ordem,
      valorNumerico: r.valorNumerico,
      valorTexto: r.valorTexto,
      scoreParcial: r.scoreParcial,
      tempoRespostaMs: r.tempoRespostaMs,
    })),
    scoreFinal,
    banda: bandaEncontrada?.nome ?? "indefinida",
    finalizadoEm: new Date().toISOString(),
  };

  // Atualizar sessão
  const [sessao] = await db.update(padcomSessoesTable).set({
    status: "finalizada",
    scoreFinal,
    banda: bandaEncontrada?.nome ?? "indefinida",
    respostasSnapshot: snapshot,
    finalizadaEm: new Date(),
    atualizadoEm: new Date(),
  }).where(eq(padcomSessoesTable.id, id)).returning();

  // Avaliar regras de alerta
  const regras = await db.select()
    .from(padcomAlertasRegrasTable)
    .where(eq(padcomAlertasRegrasTable.ativo, true));

  for (const regra of regras) {
    const condicao = regra.condicao as any;
    let disparar = false;

    if (condicao?.campo === "scoreFinal") {
      const op = condicao.operador;
      const val = condicao.valor;
      if (op === ">" && scoreFinal > val) disparar = true;
      if (op === ">=" && scoreFinal >= val) disparar = true;
      if (op === "<" && scoreFinal < val) disparar = true;
      if (op === "==" && scoreFinal === val) disparar = true;
    }

    if (disparar) {
      await db.insert(padcomAlertasTable).values({
        clinicaId: sessao.clinicaId,
        sessaoId: id,
        pacienteId: sessao.pacienteId,
        tipo: "score_critico",
        severidade: regra.severidade,
        titulo: regra.nome,
        descricao: `Score ${scoreFinal} disparou regra: ${regra.nome}`,
        dadosExtra: { regra: regra.condicao, acao: regra.acaoJson },
      });
    }
  }

  // Auditoria
  await db.insert(padcomAuditoriaTable).values({
    clinicaId: sessao.clinicaId,
    usuarioId: sessao.pacienteId,
    papel: "sistema",
    acao: "finalizar",
    entidadeTipo: "sessao",
    entidadeId: id,
    dadosDepois: { scoreFinal, banda: bandaEncontrada?.nome },
  });

  res.json({
    sessao,
    banda: bandaEncontrada,
    alertasGerados: regras.filter(r => {
      const c = r.condicao as any;
      return c?.campo === "scoreFinal" && c?.operador === ">" && scoreFinal > c.valor;
    }).length,
  });
});

router.get("/padcom-sessoes/:id", async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const [sessao] = await db.select()
    .from(padcomSessoesTable)
    .where(eq(padcomSessoesTable.id, id));

  if (!sessao) { res.status(404).json({ error: "Sessão não encontrada" }); return; }

  const respostas = await db.select()
    .from(padcomRespostasTable)
    .where(eq(padcomRespostasTable.sessaoId, id))
    .orderBy(asc(padcomRespostasTable.modulo), asc(padcomRespostasTable.ordem));

  const alertas = await db.select()
    .from(padcomAlertasTable)
    .where(eq(padcomAlertasTable.sessaoId, id));

  res.json({ sessao, respostas, alertas });
});

// Listar sessões (admin) com filtros
router.get("/padcom-sessoes", async (req: Request, res: Response): Promise<void> => {
  const { clinicaId, status, banda, pacienteId, limit } = req.query;
  const conditions = [];
  if (clinicaId) conditions.push(eq(padcomSessoesTable.clinicaId, String(clinicaId)));
  if (status) conditions.push(eq(padcomSessoesTable.status, String(status)));
  if (banda) conditions.push(eq(padcomSessoesTable.banda, String(banda)));
  if (pacienteId) conditions.push(eq(padcomSessoesTable.pacienteId, String(pacienteId)));

  let query = db.select().from(padcomSessoesTable);
  if (conditions.length > 0) query = query.where(and(...conditions)) as any;

  const rows = await query
    .orderBy(desc(padcomSessoesTable.criadoEm))
    .limit(Number(limit) || 100);

  res.json(rows);
});

// ═══════════════════════════════════════════════════════════════
// BANDAS — Config das 4 bandas de conduta
// ═══════════════════════════════════════════════════════════════

router.get("/padcom-bandas", async (req: Request, res: Response): Promise<void> => {
  const rows = await db.select()
    .from(padcomBandasTable)
    .where(eq(padcomBandasTable.ativo, true))
    .orderBy(asc(padcomBandasTable.scoreMinimo));
  res.json(rows);
});

router.post("/padcom-bandas", async (req: Request, res: Response): Promise<void> => {
  const parsed = insertPadcomBandaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [row] = await db.insert(padcomBandasTable).values(parsed.data).returning();
  res.status(201).json(row);
});

// ═══════════════════════════════════════════════════════════════
// ALERTAS — CRUD + resolução
// ═══════════════════════════════════════════════════════════════

router.get("/padcom-alertas", async (req: Request, res: Response): Promise<void> => {
  const { clinicaId, status, severidade } = req.query;
  const conditions = [];
  if (clinicaId) conditions.push(eq(padcomAlertasTable.clinicaId, String(clinicaId)));
  if (status) conditions.push(eq(padcomAlertasTable.status, String(status)));
  if (severidade) conditions.push(eq(padcomAlertasTable.severidade, String(severidade)));

  let query = db.select().from(padcomAlertasTable);
  if (conditions.length > 0) query = query.where(and(...conditions)) as any;

  const rows = await query.orderBy(desc(padcomAlertasTable.criadoEm));
  res.json(rows);
});

router.patch("/padcom-alertas/:id/resolver", async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { resolvidoPor } = req.body;
  const [row] = await db.update(padcomAlertasTable).set({
    status: "resolvido",
    resolvidoPor,
    resolvidoEm: new Date(),
    atualizadoEm: new Date(),
  }).where(eq(padcomAlertasTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Alerta não encontrado" }); return; }
  res.json(row);
});

// ═══════════════════════════════════════════════════════════════
// DASHBOARD — Métricas agregadas (Kaizen #3 — score server-side)
// ═══════════════════════════════════════════════════════════════

router.get("/padcom-dashboard", async (req: Request, res: Response): Promise<void> => {
  const { clinicaId } = req.query;

  const conditions = clinicaId
    ? eq(padcomSessoesTable.clinicaId, String(clinicaId))
    : sql`true`;

  // Total de sessões por status
  const porStatus = await db.select({
    status: padcomSessoesTable.status,
    total: count(),
  }).from(padcomSessoesTable)
    .where(conditions)
    .groupBy(padcomSessoesTable.status);

  // Distribuição por banda
  const porBanda = await db.select({
    banda: padcomSessoesTable.banda,
    total: count(),
    scoreMedia: avg(padcomSessoesTable.scoreFinal),
  }).from(padcomSessoesTable)
    .where(and(conditions, eq(padcomSessoesTable.status, "finalizada")))
    .groupBy(padcomSessoesTable.banda);

  // Alertas pendentes
  const alertasPendentes = await db.select({ total: count() })
    .from(padcomAlertasTable)
    .where(and(
      clinicaId ? eq(padcomAlertasTable.clinicaId, String(clinicaId)) : sql`true`,
      eq(padcomAlertasTable.status, "pendente")
    ));

  // Telemetria de abandono (Kaizen #7)
  const abandonos = await db.select({
    ultimoModulo: padcomSessoesTable.ultimoModuloVisitado,
    total: count(),
  }).from(padcomSessoesTable)
    .where(and(conditions, eq(padcomSessoesTable.status, "em_andamento")))
    .groupBy(padcomSessoesTable.ultimoModuloVisitado);

  res.json({
    porStatus,
    porBanda,
    alertasPendentes: alertasPendentes[0]?.total ?? 0,
    abandonos,
  });
});

// ═══════════════════════════════════════════════════════════════
// AUDITORIA — Consulta de logs LGPD
// ═══════════════════════════════════════════════════════════════

router.get("/padcom-auditoria", async (req: Request, res: Response): Promise<void> => {
  const { clinicaId, entidadeTipo, acao, limit } = req.query;
  const conditions = [];
  if (clinicaId) conditions.push(eq(padcomAuditoriaTable.clinicaId, String(clinicaId)));
  if (entidadeTipo) conditions.push(eq(padcomAuditoriaTable.entidadeTipo, String(entidadeTipo)));
  if (acao) conditions.push(eq(padcomAuditoriaTable.acao, String(acao)));

  let query = db.select().from(padcomAuditoriaTable);
  if (conditions.length > 0) query = query.where(and(...conditions)) as any;

  const rows = await query
    .orderBy(desc(padcomAuditoriaTable.criadoEm))
    .limit(Number(limit) || 50);

  res.json(rows);
});

// ═══════════════════════════════════════════════════════════════
// ONDA 2 — P1: Competências Regulatórias (catálogo de itens terapêuticos)
// ═══════════════════════════════════════════════════════════════

router.get("/padcom-competencias", async (req: Request, res: Response): Promise<void> => {
  const { clinicaId, categoria, competencia, ativo } = req.query;
  const conds = [];
  // Multi-tenant: aceita registros globais (clinicaId=null) + os da clínica solicitada
  if (clinicaId) {
    conds.push(
      or(
        eq(padcomCompetenciasRegulatoriasTable.clinicaId, String(clinicaId)),
        sql`${padcomCompetenciasRegulatoriasTable.clinicaId} IS NULL`,
      )!,
    );
  }
  if (categoria) conds.push(eq(padcomCompetenciasRegulatoriasTable.categoria, String(categoria)));
  if (competencia) conds.push(eq(padcomCompetenciasRegulatoriasTable.competenciaMinima, String(competencia)));
  if (ativo !== undefined) conds.push(eq(padcomCompetenciasRegulatoriasTable.ativo, ativo === "true"));
  const rows = conds.length
    ? await db.select().from(padcomCompetenciasRegulatoriasTable).where(and(...conds)).orderBy(asc(padcomCompetenciasRegulatoriasTable.codigo))
    : await db.select().from(padcomCompetenciasRegulatoriasTable).orderBy(asc(padcomCompetenciasRegulatoriasTable.codigo));
  res.json(rows);
});

router.post("/padcom-competencias", async (req: Request, res: Response): Promise<void> => {
  const parsed = insertPadcomCompetenciaRegulatoriaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [row] = await db.insert(padcomCompetenciasRegulatoriasTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.patch("/padcom-competencias/:id", async (req: Request, res: Response): Promise<void> => {
  const parsed = updatePadcomCompetenciaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [row] = await db
    .update(padcomCompetenciasRegulatoriasTable)
    .set({ ...parsed.data, atualizadoEm: new Date() })
    .where(eq(padcomCompetenciasRegulatoriasTable.id, req.params.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "não encontrado" });
    return;
  }
  res.json(row);
});

// ═══════════════════════════════════════════════════════════════
// ONDA 2 — P2: Validações em Cascata (N1 / N2 / N3)
// ═══════════════════════════════════════════════════════════════

router.get("/padcom-validacoes-cascata", async (req: Request, res: Response): Promise<void> => {
  const { clinicaId, sessaoId, nivel, decisao } = req.query;
  const conds = [];
  if (clinicaId) conds.push(eq(padcomValidacoesCascataTable.clinicaId, String(clinicaId)));
  if (sessaoId) conds.push(eq(padcomValidacoesCascataTable.sessaoId, String(sessaoId)));
  if (nivel) conds.push(eq(padcomValidacoesCascataTable.nivel, String(nivel)));
  if (decisao) conds.push(eq(padcomValidacoesCascataTable.decisao, String(decisao)));
  const rows = conds.length
    ? await db.select().from(padcomValidacoesCascataTable).where(and(...conds)).orderBy(asc(padcomValidacoesCascataTable.etapa))
    : await db.select().from(padcomValidacoesCascataTable).orderBy(desc(padcomValidacoesCascataTable.criadoEm));
  res.json(rows);
});

router.post("/padcom-validacoes-cascata", async (req: Request, res: Response): Promise<void> => {
  const parsed = insertPadcomValidacaoCascataSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [row] = await db.insert(padcomValidacoesCascataTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.patch("/padcom-validacoes-cascata/:id/decidir", async (req: Request, res: Response): Promise<void> => {
  const parsed = updatePadcomValidacaoDecidirSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const decisao = parsed.data.decisao;
  if (!decisao || !["aprovado", "rejeitado", "escalado"].includes(decisao)) {
    res.status(400).json({ error: "decisao deve ser aprovado | rejeitado | escalado" });
    return;
  }
  // Multi-tenant: header opcional X-Clinica-Id força escopo da clínica no UPDATE
  const tenantHeader = req.header("x-clinica-id") ?? (req.query.clinicaId as string | undefined);
  const idCond = eq(padcomValidacoesCascataTable.id, req.params.id);
  const where = tenantHeader
    ? and(idCond, eq(padcomValidacoesCascataTable.clinicaId, String(tenantHeader)))
    : idCond;
  const [row] = await db
    .update(padcomValidacoesCascataTable)
    .set({ ...parsed.data, decisao, decididoEm: new Date() })
    .where(where!)
    .returning();
  if (!row) {
    res.status(404).json({ error: "não encontrado ou fora do escopo da clínica" });
    return;
  }
  res.json(row);
});

// Resolver cascata default a partir da banda + itens do motor
router.post("/padcom-sessoes/:id/iniciar-cascata", async (req: Request, res: Response): Promise<void> => {
  const sessao = (await db.select().from(padcomSessoesTable).where(eq(padcomSessoesTable.id, req.params.id)))[0];
  if (!sessao) {
    res.status(404).json({ error: "sessão não encontrada" });
    return;
  }
  if (!sessao.banda) {
    res.status(400).json({ error: "sessão sem banda — finalize antes" });
    return;
  }
  // Resiliente: aceita tanto 'cor' quanto 'nome' como chave (finalizar salva nome)
  const banda = (
    await db
      .select()
      .from(padcomBandasTable)
      .where(or(eq(padcomBandasTable.cor, sessao.banda), eq(padcomBandasTable.nome, sessao.banda)))
  )[0];
  if (!banda) {
    res.status(422).json({
      error: `banda '${sessao.banda}' não encontrada no catálogo`,
      aviso: "verifique consistência entre padcom_bandas (nome/cor) e padcom_sessoes.banda — nenhuma etapa criada",
    });
    return;
  }
  const nivel = banda.nivelValidacao;

  // Idempotência: se já existem etapas pra essa sessão+nivel, retorna as existentes
  const existentes = await db
    .select()
    .from(padcomValidacoesCascataTable)
    .where(
      and(
        eq(padcomValidacoesCascataTable.sessaoId, sessao.id),
        eq(padcomValidacoesCascataTable.nivel, nivel),
      ),
    )
    .orderBy(asc(padcomValidacoesCascataTable.etapa));
  if (existentes.length > 0) {
    res.status(200).json({ nivel, etapas: existentes, idempotente: true });
    return;
  }

  // Define cascata: N1=1 etapa, N2=2 etapas, N3=3 etapas
  const cascataMap: Record<string, Array<{ etapa: number; papel: string }>> = {
    N1: [{ etapa: 1, papel: "ia" }],
    N2: [
      { etapa: 1, papel: "ia" },
      { etapa: 2, papel: "consultora" },
    ],
    N3: [
      { etapa: 1, papel: "enfermeira" },
      { etapa: 2, papel: "medico" },
      { etapa: 3, papel: "preceptor" },
    ],
  };
  const etapas = cascataMap[nivel] ?? cascataMap.N3;
  const inseridos = await db
    .insert(padcomValidacoesCascataTable)
    .values(
      etapas.map((e) => ({
        clinicaId: sessao.clinicaId,
        sessaoId: sessao.id,
        pacienteId: sessao.pacienteId,
        nivel,
        etapa: e.etapa,
        papel: e.papel,
        decisao: "pendente",
        itensAvaliados: banda?.acoesMotor ?? null,
      })),
    )
    .returning();
  res.status(201).json({ nivel, etapas: inseridos });
});

// ═══════════════════════════════════════════════════════════════
// ONDA 2 — P3: Dashboard de Governança por Braço de Entrada
// ═══════════════════════════════════════════════════════════════

router.get("/padcom-dashboard-bracos", async (req: Request, res: Response): Promise<void> => {
  const { clinicaId } = req.query;
  const tenantWhere = clinicaId ? eq(padcomSessoesTable.clinicaId, String(clinicaId)) : undefined;

  const applyTenant = <T extends { where: (w: ReturnType<typeof eq>) => T }>(q: T) =>
    tenantWhere ? q.where(tenantWhere) : q;

  // Todas as agregações respeitam multi-tenant (clinicaId)
  const porBraco = await applyTenant(
    db
      .select({
        braco: padcomSessoesTable.bracoEntrada,
        total: count(),
        scoreMedio: avg(padcomSessoesTable.scoreFinal),
      })
      .from(padcomSessoesTable)
      .$dynamic(),
  ).groupBy(padcomSessoesTable.bracoEntrada);

  const porUtmSource = await applyTenant(
    db
      .select({ utm: padcomSessoesTable.utmSource, total: count() })
      .from(padcomSessoesTable)
      .$dynamic(),
  ).groupBy(padcomSessoesTable.utmSource);

  const porStatus = await applyTenant(
    db
      .select({ status: padcomSessoesTable.status, total: count() })
      .from(padcomSessoesTable)
      .$dynamic(),
  ).groupBy(padcomSessoesTable.status);

  // Funil por braço com filtro multi-tenant (parametrizado contra SQL injection)
  const funilSql = clinicaId
    ? sql`
      SELECT 
        COALESCE(braco_entrada, 'sem_braco') AS braco,
        COUNT(*)::int AS iniciadas,
        COUNT(*) FILTER (WHERE status IN ('finalizada','validada'))::int AS finalizadas,
        COUNT(*) FILTER (WHERE status = 'validada')::int AS validadas
      FROM padcom_sessoes
      WHERE clinica_id = ${String(clinicaId)}
      GROUP BY braco_entrada
      ORDER BY iniciadas DESC
    `
    : sql`
      SELECT 
        COALESCE(braco_entrada, 'sem_braco') AS braco,
        COUNT(*)::int AS iniciadas,
        COUNT(*) FILTER (WHERE status IN ('finalizada','validada'))::int AS finalizadas,
        COUNT(*) FILTER (WHERE status = 'validada')::int AS validadas
      FROM padcom_sessoes
      GROUP BY braco_entrada
      ORDER BY iniciadas DESC
    `;
  const funilRes = await db.execute(funilSql);
  const funil = (funilRes as { rows?: unknown[] }).rows ?? funilRes;

  res.json({
    bracos: ["trafego_pago", "consultora", "site", "vendedor_externo", "referral", "whatsapp"],
    porBraco,
    porUtmSource,
    porStatus,
    funil,
  });
});

export default router;
