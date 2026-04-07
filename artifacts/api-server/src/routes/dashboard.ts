import { Router } from "express";
import { db, pacientesTable, anamnesesTable, sugestoesTable, followupsTable, pagamentosTable, filasTable } from "@workspace/db";
import { eq, and, gte, lt, sum, count } from "drizzle-orm";

const router = Router();

router.get("/dashboard/resumo", async (req, res): Promise<void> => {
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : undefined;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  const [totalPacientesResult] = await db.select({ count: count() }).from(pacientesTable);
  const [anamnesesPendentesResult] = await db.select({ count: count() }).from(anamnesesTable).where(eq(anamnesesTable.status, "pendente"));
  const [sugestoesPendentesResult] = await db.select({ count: count() }).from(sugestoesTable).where(eq(sugestoesTable.status, "pendente"));
  const [followupAtrasadosResult] = await db.select({ count: count() }).from(followupsTable).where(eq(followupsTable.status, "atrasado"));
  const [pagamentosPendentesResult] = await db.select({ count: count() }).from(pagamentosTable).where(eq(pagamentosTable.status, "pendente"));

  const pagamentosHoje = await db
    .select({ valor: pagamentosTable.valor })
    .from(pagamentosTable)
    .where(and(eq(pagamentosTable.status, "pago"), gte(pagamentosTable.paguEm, hoje), lt(pagamentosTable.paguEm, amanha)));

  const receitaHoje = pagamentosHoje.reduce((acc, p) => acc + (p.valor || 0), 0);

  const filaHoje = await db
    .select({ count: count() })
    .from(filasTable)
    .where(and(eq(filasTable.tipo, "procedimento"), gte(filasTable.criadoEm, hoje)));

  res.json({
    totalPacientes: totalPacientesResult.count,
    anamnesesPendentes: anamnesesPendentesResult.count,
    sugestoesPendentesValidacao: sugestoesPendentesResult.count,
    procedimentosHoje: filaHoje[0]?.count || 0,
    followupAtrasados: followupAtrasadosResult.count,
    pagamentosPendentes: pagamentosPendentesResult.count,
    receitaHoje,
    unidadeNome: unidadeId ? `Unidade ${unidadeId}` : "Todas as Unidades",
  });
});

router.get("/dashboard/metricas-motor", async (req, res): Promise<void> => {
  const periodo = (req.query.periodo as string) || "hoje";

  const todas = await db.select().from(sugestoesTable);
  const total = todas.length;
  const validadas = todas.filter(s => s.status === "validado").length;
  const rejeitadas = todas.filter(s => s.status === "rejeitado").length;
  const taxaValidacao = total > 0 ? Math.round((validadas / total) * 100) : 0;

  const tipos = ["exame", "formula", "injetavel_im", "injetavel_ev", "implante", "protocolo"];
  const sugestoesPorTipo = tipos.map(tipo => ({
    tipo,
    total: todas.filter(s => s.tipo === tipo).length,
    validadas: todas.filter(s => s.tipo === tipo && s.status === "validado").length,
  }));

  res.json({
    totalSugestoes: total,
    sugestoesValidadas: validadas,
    sugestoesRejeitadas: rejeitadas,
    taxaValidacao,
    sugestoesPorTipo,
    periodo,
  });
});

router.get("/dashboard/atividade-recente", async (req, res): Promise<void> => {
  const limite = req.query.limite ? parseInt(req.query.limite as string, 10) : 20;

  const sugestoes = await db.select().from(sugestoesTable).orderBy(sugestoesTable.criadoEm).limit(limite / 2);
  const anamneses = await db.select().from(anamnesesTable).orderBy(anamnesesTable.criadoEm).limit(limite / 2);

  const atividades = [
    ...sugestoes.map(s => ({
      id: s.id,
      tipo: "validacao" as const,
      descricao: `Sugestão de ${s.tipo} gerada: ${s.itemNome}`,
      pacienteNome: `Paciente ${s.pacienteId}`,
      usuarioNome: "Motor Clínico",
      criadoEm: s.criadoEm,
    })),
    ...anamneses.map(a => ({
      id: a.id + 10000,
      tipo: "anamnese" as const,
      descricao: `Anamnese ${a.status}`,
      pacienteNome: `Paciente ${a.pacienteId}`,
      usuarioNome: "Enfermeira",
      criadoEm: a.criadoEm,
    })),
  ].sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()).slice(0, limite);

  res.json(atividades);
});

router.get("/dashboard/filas-resumo", async (req, res): Promise<void> => {
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : undefined;

  const filas = await db.select().from(filasTable);
  let filtradas = filas;
  if (unidadeId) filtradas = filtradas.filter(f => f.unidadeId === unidadeId);

  const anamnese = filtradas.filter(f => f.tipo === "anamnese").length;
  const validacao = filtradas.filter(f => f.tipo === "validacao").length;
  const procedimento = filtradas.filter(f => f.tipo === "procedimento").length;
  const followup = filtradas.filter(f => f.tipo === "followup").length;
  const pagamento = filtradas.filter(f => f.tipo === "pagamento").length;
  const totalUrgente = filtradas.filter(f => f.prioridade === "urgente").length;

  res.json({ anamnese, validacao, procedimento, followup, pagamento, totalUrgente });
});

export default router;
