import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { delegacoesTable, feedbackPacienteTable, usuariosTable, unidadesTable } from "@workspace/db";
import { eq, desc, and, sql, count, avg, lte, gte, isNull, isNotNull } from "drizzle-orm";
import { isTrelloConfigured, createTrelloCard, updateTrelloCard, getTrelloBoardLists, getTrelloListCards, TRELLO_STATUS_MAP } from "../lib/trello";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  const unidadeIdFilter = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : undefined;

  let query = db
    .select()
    .from(delegacoesTable)
    .orderBy(desc(delegacoesTable.criadoEm));

  const delegacoes = unidadeIdFilter
    ? await db.select().from(delegacoesTable).where(eq(delegacoesTable.unidadeId, unidadeIdFilter)).orderBy(desc(delegacoesTable.criadoEm))
    : await query;

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

router.get("/trello/status", async (_req: Request, res: Response) => {
  res.json({
    configurado: isTrelloConfigured(),
    boardId: process.env.TRELLO_BOARD_ID || null,
  });
});

router.post("/sync-trello", async (req: Request, res: Response) => {
  try {
    if (!isTrelloConfigured()) {
      res.status(400).json({ error: "Trello nao configurado. Defina TRELLO_API_KEY, TRELLO_TOKEN e TRELLO_BOARD_ID nas variaveis de ambiente." });
      return;
    }

    const boardId = process.env.TRELLO_BOARD_ID;
    if (!boardId) {
      res.status(400).json({ error: "TRELLO_BOARD_ID nao definido" });
      return;
    }

    const lists = await getTrelloBoardLists(boardId);
    const listMap: Record<string, string> = {};
    for (const list of lists) {
      const normalizedName = list.name.toLowerCase().replace(/\s+/g, "_");
      for (const [status, label] of Object.entries(TRELLO_STATUS_MAP)) {
        if (normalizedName.includes(status) || list.name.toLowerCase().includes(label.toLowerCase())) {
          listMap[status] = list.id;
        }
      }
    }

    if (Object.keys(listMap).length === 0 && lists.length > 0) {
      listMap["pendente"] = lists[0]?.id;
      if (lists[1]) listMap["em_andamento"] = lists[1].id;
      if (lists[2]) listMap["concluido"] = lists[2].id;
    }

    const delegacoes = await db.select().from(delegacoesTable);
    const usuarios = await db.select().from(usuariosTable);
    const usuarioMap = new Map(usuarios.map(u => [u.id, u.nome]));

    let criados = 0;
    let atualizados = 0;

    for (const d of delegacoes) {
      const targetListId = listMap[d.status] || listMap["pendente"];
      if (!targetListId) continue;

      const responsavelNome = usuarioMap.get(d.responsavelId) || "N/A";
      const cardName = `[${d.prioridade.toUpperCase()}] ${d.titulo}`;
      const cardDesc = `${d.descricao || ""}\n\nResponsavel: ${responsavelNome}\nCategoria: ${d.categoria}\nPrazo: ${d.prazo}\nStatus: ${d.status}`;

      if (!d.trelloCardId) {
        try {
          const card = await createTrelloCard(targetListId, cardName, cardDesc);
          await db.update(delegacoesTable).set({
            trelloCardId: card.id,
            trelloListId: targetListId,
            trelloLastSync: new Date(),
          }).where(eq(delegacoesTable.id, d.id));
          criados++;
        } catch (err: any) {
          console.error(`Erro ao criar card Trello para delegacao ${d.id}:`, err.message);
        }
      } else {
        try {
          await updateTrelloCard(d.trelloCardId, {
            name: cardName,
            desc: cardDesc,
            idList: targetListId,
          });
          await db.update(delegacoesTable).set({
            trelloListId: targetListId,
            trelloLastSync: new Date(),
          }).where(eq(delegacoesTable.id, d.id));
          atualizados++;
        } catch (err: any) {
          console.error(`Erro ao atualizar card Trello para delegacao ${d.id}:`, err.message);
        }
      }
    }

    res.json({
      mensagem: `Sync Trello concluido: ${criados} criados, ${atualizados} atualizados`,
      criados,
      atualizados,
      totalDelegacoes: delegacoes.length,
      listasEncontradas: Object.keys(listMap),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/pull-trello", async (req: Request, res: Response) => {
  try {
    if (!isTrelloConfigured()) {
      res.status(400).json({ error: "Trello nao configurado" });
      return;
    }

    const boardId = process.env.TRELLO_BOARD_ID;
    if (!boardId) {
      res.status(400).json({ error: "TRELLO_BOARD_ID nao definido" });
      return;
    }

    const lists = await getTrelloBoardLists(boardId);
    const reverseMap: Record<string, string> = {};

    for (const list of lists) {
      const normalizedName = list.name.toLowerCase().replace(/\s+/g, "_");
      for (const [status, label] of Object.entries(TRELLO_STATUS_MAP)) {
        if (normalizedName.includes(status) || list.name.toLowerCase().includes(label.toLowerCase())) {
          reverseMap[list.id] = status;
        }
      }
    }

    let atualizados = 0;

    for (const list of lists) {
      const statusLocal = reverseMap[list.id];
      if (!statusLocal) continue;

      const cards = await getTrelloListCards(list.id);
      for (const card of cards) {
        const [delegacao] = await db.select().from(delegacoesTable)
          .where(eq(delegacoesTable.trelloCardId, card.id));

        if (delegacao && delegacao.status !== statusLocal) {
          const updates: any = { status: statusLocal, trelloLastSync: new Date() };
          if (statusLocal === "concluido" && !delegacao.concluidoEm) {
            updates.concluidoEm = new Date();
          }
          await db.update(delegacoesTable).set(updates).where(eq(delegacoesTable.id, delegacao.id));
          atualizados++;
        }
      }
    }

    res.json({
      mensagem: `Pull Trello concluido: ${atualizados} delegacoes atualizadas`,
      atualizados,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
