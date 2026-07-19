import { Router, Request, Response } from "express";
import {
  db,
  slaMonitoringTable,
  taskCardJustificativasTable,
  taskCardEscalationsTable,
  disciplinaryEventsTable,
  teamMembersTable,
  taskCardsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

// GET /api/padteam-governo/sla-ativos?unidadeId=X
// Retorna todos os SLA (Service Level Agreement) ativos com semáforo calculado
router.get("/sla-ativos", async (req: Request, res: Response) => {
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : undefined;

  const condicoes: any[] = [eq(slaMonitoringTable.status, "ativo")];
  if (unidadeId) condicoes.push(eq(slaMonitoringTable.unidadeId, unidadeId));

  const slas = await db
    .select()
    .from(slaMonitoringTable)
    .where(and(...condicoes));

  const membros = await db.select({ id: teamMembersTable.id, nomeCompleto: teamMembersTable.nomeCompleto }).from(teamMembersTable);
  const membroMap = new Map(membros.map((m) => [m.id, m.nomeCompleto]));

  const agora = new Date();

  const enriched = slas.map((s) => {
    const inicio = new Date(s.inicioEm!);
    const vence = new Date(s.venceEm);
    const totalMs = vence.getTime() - inicio.getTime();
    const consumidoMs = Math.min(agora.getTime() - inicio.getTime(), totalMs);
    const percentual = totalMs > 0 ? Math.round((consumidoMs / totalMs) * 100) : 100;

    let semaforo: "verde" | "amarelo" | "vermelho";
    if (agora > vence) semaforo = "vermelho";
    else if (percentual >= 75) semaforo = "amarelo";
    else semaforo = "verde";

    return {
      ...s,
      membroNome: membroMap.get(s.membroId) || "—",
      percentualConsumido: percentual,
      semaforo,
      vencido: agora > vence,
    };
  });

  enriched.sort((a, b) => b.percentualConsumido - a.percentualConsumido);
  res.json(enriched);
});

// GET /api/padteam-governo/justificativas-pendentes
// Justificativas de atraso aguardando avaliação do supervisor
router.get("/justificativas-pendentes", async (_req: Request, res: Response) => {
  const justificativas = await db
    .select()
    .from(taskCardJustificativasTable)
    .where(eq(taskCardJustificativasTable.aceita, "pendente"));

  const cards = await db.select({ id: taskCardsTable.id, titulo: taskCardsTable.titulo, assignedRole: taskCardsTable.assignedRole }).from(taskCardsTable);
  const cardMap = new Map(cards.map((c) => [c.id, c]));

  const enriched = justificativas.map((j) => ({
    ...j,
    cardTitulo: j.taskCardId ? cardMap.get(j.taskCardId)?.titulo ?? "—" : "—",
    cardRole: j.taskCardId ? cardMap.get(j.taskCardId)?.assignedRole ?? "—" : "—",
  }));

  res.json(enriched);
});

// PATCH /api/padteam-governo/justificativas/:id
// Supervisor avalia justificativa: aceita ou recusa
router.patch("/justificativas/:id", async (req: Request, res: Response) => {
  const { aceita, observacaoAvaliador, avaliadoPorId } = req.body;

  const [updated] = await db
    .update(taskCardJustificativasTable)
    .set({ aceita, observacaoAvaliador, avaliadoPorId, avaliadoEm: new Date() })
    .where(eq(taskCardJustificativasTable.id, parseInt(req.params.id, 10)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Justificativa não encontrada" }); return; }
  res.json(updated);
});

// GET /api/padteam-governo/escalamentos?status=aberto|resolvido
// Histórico de escalonamentos de task cards e follow-ups
router.get("/escalamentos", async (req: Request, res: Response) => {
  const todos = await db.select().from(taskCardEscalationsTable);
  const { status } = req.query;

  const filtrados = status === "aberto"
    ? todos.filter((e) => !e.resolvidoEm)
    : status === "resolvido"
    ? todos.filter((e) => !!e.resolvidoEm)
    : todos;

  res.json(filtrados);
});

// POST /api/padteam-governo/escalamentos
// Registra um escalonamento manual
router.post("/escalamentos", async (req: Request, res: Response) => {
  const { entityType, entityId, nivel, motivo, observacao, escaladoPorId } = req.body;

  const [novo] = await db
    .insert(taskCardEscalationsTable)
    .values({ entityType, entityId, nivel, motivo, observacao, escaladoPorId })
    .returning();

  res.status(201).json(novo);
});

// PATCH /api/padteam-governo/escalamentos/:id/resolver
// Marca escalamento como resolvido
router.patch("/escalamentos/:id/resolver", async (req: Request, res: Response) => {
  const { resolucao, resolvidoPorId } = req.body;

  const [updated] = await db
    .update(taskCardEscalationsTable)
    .set({ resolucao, resolvidoPorId, resolvidoEm: new Date() })
    .where(eq(taskCardEscalationsTable.id, parseInt(req.params.id, 10)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Escalamento não encontrado" }); return; }
  res.json(updated);
});

// GET /api/padteam-governo/disciplinar?unidadeId=X
// Eventos disciplinares (advertência / demissão / justa causa)
router.get("/disciplinar", async (req: Request, res: Response) => {
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : undefined;

  const eventos = unidadeId
    ? await db.select().from(disciplinaryEventsTable).where(eq(disciplinaryEventsTable.unidadeId, unidadeId))
    : await db.select().from(disciplinaryEventsTable);

  const membros = await db.select({ id: teamMembersTable.id, nomeCompleto: teamMembersTable.nomeCompleto }).from(teamMembersTable);
  const membroMap = new Map(membros.map((m) => [m.id, m.nomeCompleto]));

  const enriched = eventos.map((e) => ({ ...e, membroNome: membroMap.get(e.membroId) ?? "—" }));
  res.json(enriched);
});

// POST /api/padteam-governo/disciplinar
// Registra advertência, demissão ou justa causa
router.post("/disciplinar", async (req: Request, res: Response) => {
  const { membroId, unidadeId, nivel, fundamentacaoClt, motivo, triggers, validadeDias, aplicadoPorId } = req.body;

  let dataExpiracao: string | null = null;
  if (validadeDias) {
    const d = new Date();
    d.setDate(d.getDate() + validadeDias);
    dataExpiracao = d.toLocaleDateString("pt-BR");
  }

  const [novo] = await db
    .insert(disciplinaryEventsTable)
    .values({ membroId, unidadeId, nivel, fundamentacaoClt, motivo, triggers, validadeDias, dataExpiracao, aplicadoPorId })
    .returning();

  res.status(201).json(novo);
});

export default router;
