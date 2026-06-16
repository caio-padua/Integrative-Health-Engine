import { Router, type Request, type Response } from "express";
import {
  db, filaPreceptorTable, validacoesCascataTable,
  alertasNotificacaoTable, eventosClinicosTable,
  usuariosTable, pacientesTable, corSemaforo,
} from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { resolverFiltroTenant, resolverFiltroTenantEstrito } from "../lib/auth/filtroTenant";
import { abrirCascata, validarEtapa, obterSeloCascata, calcularSelo, ORDEM_ETAPAS, type EntidadeTipo, type EtapaCascata, type StatusEtapa, type EtapaStatus } from "../lib/governanca/motorCascata";
import type { JwtPayload } from "../lib/auth/jwt";

// A augmentation global de Request nao e confiavel neste tsconfig (ver
// painelPawards.ts); usamos tipo local comprovado, padrao do repo.
type AuthedRequest = Request & { user?: JwtPayload };

const router = Router();

// Tipos de entidade que podem entrar em cascata de validacao.
const ENTIDADES_VALIDAS: EntidadeTipo[] = ["ANAMNESE", "EXAME", "FORMULA", "CHECKIN", "VISITA"];

/**
 * Guarda de tenant (cliente/unidade): confirma que o paciente existe E que o
 * usuario autenticado pode acessar a unidade dele. Fecha IDOR/cross-unidade
 * (acesso indevido por ID de outra clinica). Espelha o padrao de pulsoDiario.ts.
 */
async function autorizarAcessoPaciente(
  req: AuthedRequest,
  pacienteId: number,
): Promise<{ ok: true } | { ok: false; status: number; erro: string }> {
  const { unidadeId, isPlatformOwner } = resolverFiltroTenant(req);
  const [p] = await db
    .select({ id: pacientesTable.id, unidadeId: pacientesTable.unidadeId })
    .from(pacientesTable)
    .where(eq(pacientesTable.id, pacienteId))
    .limit(1);
  if (!p) return { ok: false, status: 404, erro: "Paciente nao encontrado" };
  if (isPlatformOwner) return { ok: true };
  if (unidadeId !== null && p.unidadeId !== unidadeId) {
    return { ok: false, status: 403, erro: "Paciente pertence a outra unidade" };
  }
  return { ok: true };
}

router.get("/governanca/painel", async (_req, res): Promise<void> => {
  const filaPendente = await db
    .select({ total: sql<number>`count(*)` })
    .from(filaPreceptorTable)
    .where(eq(filaPreceptorTable.status, "AGUARDANDO"));

  const validacoesPendentes = await db
    .select({ total: sql<number>`count(*)` })
    .from(validacoesCascataTable)
    .where(eq(validacoesCascataTable.status, "PENDENTE"));

  const alertasAbertos = await db
    .select({ total: sql<number>`count(*)` })
    .from(alertasNotificacaoTable)
    .where(sql`${alertasNotificacaoTable.status} IN ('ENVIADO', 'ENTREGUE', 'LIDO')`);

  const filaCount = Number(filaPendente[0]?.total ?? 0);
  const validCount = Number(validacoesPendentes[0]?.total ?? 0);
  const alertCount = Number(alertasAbertos[0]?.total ?? 0);

  let statusGeral: "VERDE" | "AMARELO" | "VERMELHO" = "VERDE";
  if (filaCount > 10 || validCount > 20 || alertCount > 5) statusGeral = "VERMELHO";
  else if (filaCount > 5 || validCount > 10 || alertCount > 3) statusGeral = "AMARELO";

  res.json({
    statusGeral,
    kpis: {
      filaPendente: {
        valor: filaCount,
        status: corSemaforo(filaCount > 5 ? 0 : filaCount > 2 ? 12 : 48),
        descricao: `${filaCount} prontuarios aguardando homologacao`,
      },
      validacoesPendentes: {
        valor: validCount,
        status: validCount > 10 ? "VERMELHO" : validCount > 5 ? "AMARELO" : "VERDE",
        descricao: `${validCount} validacoes cascata pendentes`,
      },
      alertasAbertos: {
        valor: alertCount,
        status: alertCount > 3 ? "VERMELHO" : alertCount > 1 ? "AMARELO" : "VERDE",
        descricao: `${alertCount} alertas nao confirmados`,
      },
    },
    timestamp: new Date(),
  });
});

router.get("/governanca/semaforo", async (_req, res): Promise<void> => {
  const filasAguardando = await db
    .select({
      id: filaPreceptorTable.id,
      prazo: filaPreceptorTable.prazoHomologacao,
    })
    .from(filaPreceptorTable)
    .where(eq(filaPreceptorTable.status, "AGUARDANDO"));

  let criticas = 0;
  let atencao = 0;

  for (const fila of filasAguardando) {
    if (!fila.prazo) continue;
    const horasRestantes = (fila.prazo.getTime() - Date.now()) / (1000 * 60 * 60);
    if (horasRestantes <= 0) criticas++;
    else if (horasRestantes < 6) atencao++;
  }

  let semaforo: "VERDE" | "AMARELO" | "VERMELHO" = "VERDE";
  if (criticas > 0) semaforo = "VERMELHO";
  else if (atencao > 0) semaforo = "AMARELO";

  res.json({
    semaforo,
    filasCriticas: criticas,
    filasAtencao: atencao,
    descricao: semaforo === "VERDE"
      ? "Sistema operacional normal"
      : semaforo === "AMARELO"
        ? `${atencao} prontuarios com prazo critico (< 6h)`
        : `${criticas} prontuarios com prazo expirado`,
    timestamp: new Date(),
  });
});

router.get("/governanca/timeline", async (req, res): Promise<void> => {
  const limite = req.query.limite ? parseInt(req.query.limite as string, 10) : 20;

  const eventos = await db
    .select({
      id: eventosClinicosTable.id,
      tipo: eventosClinicosTable.tipo,
      descricao: eventosClinicosTable.descricao,
      usuarioId: eventosClinicosTable.usuarioId,
      usuarioNome: usuariosTable.nome,
      pacienteId: eventosClinicosTable.pacienteId,
      criadoEm: eventosClinicosTable.criadoEm,
    })
    .from(eventosClinicosTable)
    .leftJoin(usuariosTable, eq(eventosClinicosTable.usuarioId, usuariosTable.id))
    .orderBy(desc(eventosClinicosTable.criadoEm))
    .limit(limite);

  res.json({ total: eventos.length, eventos });
});

router.get("/fila-preceptor/stats", async (_req, res): Promise<void> => {
  const porStatus = await db
    .select({ status: filaPreceptorTable.status, total: sql<number>`count(*)` })
    .from(filaPreceptorTable)
    .groupBy(filaPreceptorTable.status);

  const expirados = await db
    .select({ total: sql<number>`count(*)` })
    .from(filaPreceptorTable)
    .where(sql`${filaPreceptorTable.prazoHomologacao} < NOW() AND ${filaPreceptorTable.status} = 'AGUARDANDO'`);

  res.json({
    porStatus,
    expirados: Number(expirados[0]?.total ?? 0),
  });
});

// ============================================================================
// MOTOR DA CASCATA (Item 6 — A+B+C): endpoints ADITIVOS. Nao removem nada.
// Toda decisao passa pela funcao juiza e e auditada na timeline.
// ============================================================================

// Abre a cascata para uma entidade (cria as etapas requeridas, idempotente).
router.post("/governanca/cascata/abrir", requireAuth, async (req: AuthedRequest, res: Response): Promise<void> => {
  const usuarioId = req.user?.sub;
  if (typeof usuarioId !== "number") { res.status(401).json({ error: "Nao autenticado" }); return; }
  const { entidadeTipo, entidadeId, pacienteId } = req.body ?? {};
  if (!ENTIDADES_VALIDAS.includes(entidadeTipo) || typeof entidadeId !== "number" || typeof pacienteId !== "number") {
    res.status(400).json({ error: "entidadeTipo (ANAMNESE|EXAME|FORMULA|CHECKIN|VISITA), entidadeId (number) e pacienteId (number) sao obrigatorios" });
    return;
  }
  const auth = await autorizarAcessoPaciente(req, pacienteId);
  if (!auth.ok) { res.status(auth.status).json({ error: auth.erro }); return; }
  const resultado = await abrirCascata({ entidadeTipo, entidadeId, pacienteId, usuarioId, ip: req.ip ?? null });
  res.status(resultado.aberta ? 201 : 409).json(resultado);
});

// Valida (aprova/rejeita) uma etapa: a funcao juiza decide quem pode.
router.post("/governanca/cascata/validar", requireAuth, async (req: AuthedRequest, res: Response): Promise<void> => {
  const usuarioId = req.user?.sub;
  if (typeof usuarioId !== "number") { res.status(401).json({ error: "Nao autenticado" }); return; }
  const { validacaoId, decisao, observacao, assinaturaA1 } = req.body ?? {};
  if (typeof validacaoId !== "number" || (decisao !== "APROVADO" && decisao !== "REJEITADO")) {
    res.status(400).json({ error: "validacaoId (number) e decisao (APROVADO|REJEITADO) sao obrigatorios" });
    return;
  }
  // Tenant guard: carrega o paciente da validacao e autoriza antes de agir.
  const [alvo] = await db
    .select({ pacienteId: validacoesCascataTable.pacienteId })
    .from(validacoesCascataTable)
    .where(eq(validacoesCascataTable.id, validacaoId))
    .limit(1);
  if (!alvo) { res.status(404).json({ error: "validacao inexistente" }); return; }
  const auth = await autorizarAcessoPaciente(req, alvo.pacienteId);
  if (!auth.ok) { res.status(auth.status).json({ error: auth.erro }); return; }
  const resultado = await validarEtapa({ validacaoId, usuarioId, decisao, observacao, assinaturaA1, ip: req.ip ?? null });
  res.status(resultado.permitido ? 200 : 403).json(resultado);
});

// Selo verde da cascata de uma entidade (cereja: prova ponta a ponta).
router.get("/governanca/cascata/selo/:entidadeTipo/:entidadeId", requireAuth, async (req: AuthedRequest, res: Response): Promise<void> => {
  const entidadeTipo = req.params.entidadeTipo as EntidadeTipo;
  if (!ENTIDADES_VALIDAS.includes(entidadeTipo)) { res.status(400).json({ error: "entidadeTipo invalido" }); return; }
  const entidadeId = Number(req.params.entidadeId);
  if (!Number.isInteger(entidadeId)) { res.status(400).json({ error: "entidadeId invalido" }); return; }
  // Tenant guard: se a cascata existe, autoriza pelo paciente dela (impede
  // enumeracao cross-unidade do selo). Sem cascata, nao ha dado sensivel.
  const [linha] = await db
    .select({ pacienteId: validacoesCascataTable.pacienteId })
    .from(validacoesCascataTable)
    .where(and(eq(validacoesCascataTable.entidadeTipo, entidadeTipo), eq(validacoesCascataTable.entidadeId, entidadeId)))
    .limit(1);
  if (linha) {
    const auth = await autorizarAcessoPaciente(req, linha.pacienteId);
    // Hardening anti-enumeracao: cross-unidade responde IDENTICO a "nao existe"
    // (selo CINZA vazio), sem vazar a existencia da cascata por side-channel.
    if (!auth.ok) { res.json({ selo: "CINZA", etapas: [] }); return; }
  }
  const resultado = await obterSeloCascata({ entidadeTipo, entidadeId });
  res.json(resultado);
});

// Painel AO VIVO das cascatas: lista cada cascata em andamento/concluida com seu
// selo e o progresso das 4 etapas. Tenant-filtrado (so cascatas da unidade do
// usuario; platform_owner pode refinar por ?unidadeId). Alimenta a tela de
// governanca sem virar ectoplasma: estado vazio honesto quando nao ha cascata.
router.get("/governanca/cascata/painel", requireAuth, async (req: AuthedRequest, res: Response): Promise<void> => {
  const { unidadeId, isPlatformOwner } = resolverFiltroTenantEstrito(req);

  // Guarda de tenant (unidade/clinica) FAIL-CLOSED, aplicada no SQL via
  // resolverFiltroTenantEstrito (rota sensivel: dados clinicos multiunidade):
  // - platform_owner: ve tudo; pode refinar por unidade (?unidadeId).
  // - nao-owner COM unidade no JWT: so enxerga cascatas cujo paciente pertence
  //   aquela unidade (WHERE no banco). O ?unidadeId e IGNORADO (anti-IDOR).
  // - nao-owner SEM unidade no JWT (legado/consultor global): NEGA por padrao
  //   (lista vazia) — nao cai em "ver tudo" nem aceita ?unidadeId=<alvo>.
  //   Empty-state honesto na tela.
  const respostaVazia = {
    total: 0,
    resumo: { verde: 0, amarelo: 0, vermelho: 0, cinza: 0 },
    cascatas: [],
    timestamp: new Date(),
  };
  if (!isPlatformOwner && unidadeId === null) {
    res.json(respostaVazia);
    return;
  }

  const condicaoUnidade =
    unidadeId !== null ? eq(pacientesTable.unidadeId, unidadeId) : undefined;

  const linhas = await db
    .select({
      id: validacoesCascataTable.id,
      entidadeTipo: validacoesCascataTable.entidadeTipo,
      entidadeId: validacoesCascataTable.entidadeId,
      etapa: validacoesCascataTable.etapa,
      status: validacoesCascataTable.status,
      pacienteId: validacoesCascataTable.pacienteId,
      pacienteNome: pacientesTable.nome,
      unidadePaciente: pacientesTable.unidadeId,
    })
    .from(validacoesCascataTable)
    .leftJoin(pacientesTable, eq(validacoesCascataTable.pacienteId, pacientesTable.id))
    .where(condicaoUnidade)
    .orderBy(desc(validacoesCascataTable.id));

  type Grupo = {
    entidadeTipo: string;
    entidadeId: number;
    pacienteId: number | null;
    pacienteNome: string | null;
    maxId: number;
    etapasMap: Map<EtapaCascata, StatusEtapa>;
  };
  const grupos = new Map<string, Grupo>();

  for (const l of linhas) {
    const chave = `${l.entidadeTipo}#${l.entidadeId}`;
    let g = grupos.get(chave);
    if (!g) {
      g = {
        entidadeTipo: l.entidadeTipo,
        entidadeId: l.entidadeId,
        pacienteId: l.pacienteId,
        pacienteNome: l.pacienteNome,
        maxId: l.id,
        etapasMap: new Map(),
      };
      grupos.set(chave, g);
    }
    // Linhas chegam em desc(id): a 1a ocorrencia de cada etapa e a mais recente.
    // So grava se ainda nao vista, para nao sobrescrever com status historico.
    if (!g.etapasMap.has(l.etapa as EtapaCascata)) {
      g.etapasMap.set(l.etapa as EtapaCascata, l.status as StatusEtapa);
    }
    if (l.id > g.maxId) g.maxId = l.id;
  }

  const cascatas = [...grupos.values()]
    .sort((a, b) => b.maxId - a.maxId)
    .slice(0, 50)
    .map((g) => {
      const etapas: EtapaStatus[] = ORDEM_ETAPAS.filter((e) => g.etapasMap.has(e)).map((e) => ({
        etapa: e,
        status: g.etapasMap.get(e) as StatusEtapa,
      }));
      const aprovadas = etapas.filter((e) => e.status === "APROVADO").length;
      return {
        entidadeTipo: g.entidadeTipo,
        entidadeId: g.entidadeId,
        pacienteId: g.pacienteId,
        pacienteNome: g.pacienteNome,
        selo: calcularSelo(etapas),
        etapas,
        aprovadas,
        total: etapas.length,
      };
    });

  const resumo = { verde: 0, amarelo: 0, vermelho: 0, cinza: 0 };
  for (const c of cascatas) {
    if (c.selo === "VERDE") resumo.verde++;
    else if (c.selo === "AMARELO") resumo.amarelo++;
    else if (c.selo === "VERMELHO") resumo.vermelho++;
    else resumo.cinza++;
  }

  res.json({ total: cascatas.length, resumo, cascatas, timestamp: new Date() });
});

export default router;
