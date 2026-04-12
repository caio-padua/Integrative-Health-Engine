import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { delegacoesTable, feedbackPacienteTable, usuariosTable, unidadesTable } from "@workspace/db";
import { eq, desc, and, sql, count, avg, lte, gte } from "drizzle-orm";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const delegacoes = await db
    .select()
    .from(delegacoesTable)
    .orderBy(desc(delegacoesTable.criadoEm));

  const unidades = await db.select().from(unidadesTable);
  const unidadeMap = new Map(unidades.map(u => [u.id, { nome: u.nome, cor: u.cor }]));

  const enriched = await Promise.all(
    delegacoes.map(async (d) => {
      const [delegadoPor] = await db.select({ nome: usuariosTable.nome }).from(usuariosTable).where(eq(usuariosTable.id, d.delegadoPorId));
      const [responsavel] = await db.select({ nome: usuariosTable.nome }).from(usuariosTable).where(eq(usuariosTable.id, d.responsavelId));

      const agora = new Date();
      let statusEfetivo = d.status;
      if (d.status === "pendente" || d.status === "em_andamento") {
        if (d.dataLimite && new Date(d.dataLimite) < agora) {
          statusEfetivo = "atrasado";
          await db.update(delegacoesTable).set({ status: "atrasado" }).where(eq(delegacoesTable.id, d.id));
        }
      }

      const unidade = d.unidadeId ? unidadeMap.get(d.unidadeId) : null;

      return {
        ...d,
        status: statusEfetivo,
        delegadoPorNome: delegadoPor?.nome || "—",
        responsavelNome: responsavel?.nome || "—",
        unidadeNome: unidade?.nome || null,
        unidadeCor: unidade?.cor || null,
      };
    })
  );

  res.json(enriched);
});

router.post("/", async (req: Request, res: Response) => {
  const { titulo, descricao, prioridade, prazo, categoria, delegadoPorId, responsavelId, unidadeId } = req.body;

  const PRAZO_HORAS: Record<string, number> = {
    "24h": 24, "36h": 36, "48h": 48, "72h": 72, "1_semana": 168,
  };

  const horas = PRAZO_HORAS[prazo] || 48;
  const dataLimite = new Date(Date.now() + horas * 60 * 60 * 1000);

  const [nova] = await db.insert(delegacoesTable).values({
    titulo,
    descricao,
    prioridade,
    prazo,
    categoria,
    delegadoPorId,
    responsavelId,
    unidadeId,
    dataLimite,
    status: "pendente",
  }).returning();

  res.json(nova);
});

router.patch("/:id/status", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, observacaoFinal, notaQualidade } = req.body;

  const updates: Record<string, unknown> = { status };
  if (status === "concluido") {
    updates.concluidoEm = new Date();
  }
  if (observacaoFinal) updates.observacaoFinal = observacaoFinal;
  if (notaQualidade !== undefined) updates.notaQualidade = notaQualidade;

  const [updated] = await db
    .update(delegacoesTable)
    .set(updates)
    .where(eq(delegacoesTable.id, Number(id)))
    .returning();

  res.json(updated);
});

router.get("/scoring", async (_req: Request, res: Response) => {
  const usuarios = await db.select().from(usuariosTable).where(eq(usuariosTable.ativo, true));

  const scoring = await Promise.all(
    usuarios.map(async (u) => {
      const tarefas = await db
        .select()
        .from(delegacoesTable)
        .where(eq(delegacoesTable.responsavelId, u.id));

      const total = tarefas.length;
      const concluidas = tarefas.filter(t => t.status === "concluido").length;
      const atrasadas = tarefas.filter(t => t.status === "atrasado").length;
      const emAndamento = tarefas.filter(t => t.status === "em_andamento").length;
      const noPrazo = tarefas.filter(t =>
        t.status === "concluido" && t.dataLimite && t.concluidoEm && new Date(t.concluidoEm) <= new Date(t.dataLimite)
      ).length;

      const taxaResolucao = total > 0 ? Math.round((concluidas / total) * 100) : 0;
      const taxaNoPrazo = concluidas > 0 ? Math.round((noPrazo / concluidas) * 100) : 0;
      const notasQualidade = tarefas.filter(t => t.notaQualidade !== null).map(t => t.notaQualidade!);
      const mediaQualidade = notasQualidade.length > 0
        ? Math.round(notasQualidade.reduce((a, b) => a + b, 0) / notasQualidade.length * 10) / 10
        : null;

      return {
        id: u.id,
        nome: u.nome,
        perfil: u.perfil,
        total,
        concluidas,
        atrasadas,
        emAndamento,
        pendentes: total - concluidas - atrasadas - emAndamento,
        taxaResolucao,
        taxaNoPrazo,
        mediaQualidade,
      };
    })
  );

  scoring.sort((a, b) => b.taxaResolucao - a.taxaResolucao);
  res.json(scoring);
});

router.get("/feedback", async (_req: Request, res: Response) => {
  const feedbacks = await db
    .select()
    .from(feedbackPacienteTable)
    .orderBy(desc(feedbackPacienteTable.criadoEm));
  res.json(feedbacks);
});

router.post("/feedback", async (req: Request, res: Response) => {
  const { pacienteId, unidadeId, nota, comentario, canal, anamnaseId } = req.body;
  const [novo] = await db.insert(feedbackPacienteTable).values({
    pacienteId,
    unidadeId,
    nota,
    comentario,
    canal,
    anamnaseId,
  }).returning();
  res.json(novo);
});

router.get("/feedback/resumo", async (_req: Request, res: Response) => {
  const feedbacks = await db.select().from(feedbackPacienteTable);
  const total = feedbacks.length;
  const mediaGeral = total > 0
    ? Math.round(feedbacks.reduce((a, f) => a + f.nota, 0) / total * 10) / 10
    : 0;

  const distribuicao = [0, 0, 0, 0, 0, 0];
  feedbacks.forEach(f => {
    if (f.nota >= 0 && f.nota <= 5) distribuicao[f.nota]++;
  });

  const porCanal: Record<string, { total: number; media: number }> = {};
  feedbacks.forEach(f => {
    if (!porCanal[f.canal]) porCanal[f.canal] = { total: 0, media: 0 };
    porCanal[f.canal].total++;
    porCanal[f.canal].media += f.nota;
  });
  Object.keys(porCanal).forEach(k => {
    porCanal[k].media = Math.round(porCanal[k].media / porCanal[k].total * 10) / 10;
  });

  res.json({ total, mediaGeral, distribuicao, porCanal });
});

export default router;
