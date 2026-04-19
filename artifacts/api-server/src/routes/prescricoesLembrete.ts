import { Router } from "express";
import {
  db,
  prescricoesLembreteTable,
  prescricaoLembreteEnviosTable,
  pacientesTable,
  insertPrescricaoLembreteSchema,
} from "@workspace/db";
import { and, desc, eq, gte, sql, type SQL } from "drizzle-orm";
import { executarLembretesPrescricao } from "../services/prescricaoLembreteService";

const router = Router();

router.get("/prescricoes-lembrete", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(prescricoesLembreteTable)
    .orderBy(desc(prescricoesLembreteTable.criadoEm));
  res.json(rows);
});

router.post("/prescricoes-lembrete", async (req, res): Promise<void> => {
  const parsed = insertPrescricaoLembreteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ erro: "Dados invalidos", detalhes: parsed.error.issues });
    return;
  }
  const [row] = await db.insert(prescricoesLembreteTable).values(parsed.data).returning();
  res.status(201).json(row);
});

router.put("/prescricoes-lembrete/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ erro: "ID invalido" });
    return;
  }
  const parsed = insertPrescricaoLembreteSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ erro: "Dados invalidos", detalhes: parsed.error.issues });
    return;
  }
  const [row] = await db
    .update(prescricoesLembreteTable)
    .set(parsed.data)
    .where(eq(prescricoesLembreteTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ erro: "Prescricao nao encontrada" });
    return;
  }
  res.json(row);
});

router.delete("/prescricoes-lembrete/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ erro: "ID invalido" });
    return;
  }
  const [row] = await db
    .delete(prescricoesLembreteTable)
    .where(eq(prescricoesLembreteTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ erro: "Prescricao nao encontrada" });
    return;
  }
  res.json({ sucesso: true });
});

router.get("/prescricoes-lembrete/:id/envios", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ erro: "ID invalido" });
    return;
  }
  const rows = await db
    .select()
    .from(prescricaoLembreteEnviosTable)
    .where(eq(prescricaoLembreteEnviosTable.prescricaoLembreteId, id))
    .orderBy(desc(prescricaoLembreteEnviosTable.enviadoEm))
    .limit(200);
  res.json(rows);
});

router.get("/prescricoes-lembrete/falhas/contagem", async (req, res): Promise<void> => {
  const { unidadeId, janelaHoras } = req.query;

  const ctxUnidade = req.tenantContext?.unidadeId ?? null;
  let unidadeFiltro: number | null = null;

  if (ctxUnidade != null) {
    unidadeFiltro = ctxUnidade;
    if (unidadeId !== undefined && unidadeId !== "") {
      const u = Number(unidadeId);
      if (!Number.isFinite(u)) {
        res.status(400).json({ erro: "unidadeId deve ser numero" });
        return;
      }
      if (u !== ctxUnidade) {
        res.status(403).json({ erro: "unidade fora do escopo do chamador" });
        return;
      }
    }
  } else {
    if (unidadeId === undefined || unidadeId === "") {
      res.status(400).json({ erro: "unidadeId e obrigatorio" });
      return;
    }
    const u = Number(unidadeId);
    if (!Number.isFinite(u)) {
      res.status(400).json({ erro: "unidadeId deve ser numero" });
      return;
    }
    unidadeFiltro = u;
  }

  let horas = 24;
  if (janelaHoras !== undefined && janelaHoras !== "") {
    const h = Number(janelaHoras);
    if (!Number.isFinite(h) || h < 1 || h > 168) {
      res.status(400).json({ erro: "janelaHoras deve ser numero entre 1 e 168" });
      return;
    }
    horas = Math.floor(h);
  }

  const desde = new Date(Date.now() - horas * 60 * 60 * 1000);

  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(prescricaoLembreteEnviosTable)
    .where(
      and(
        eq(prescricaoLembreteEnviosTable.status, "FALHOU"),
        eq(prescricaoLembreteEnviosTable.unidadeId, unidadeFiltro),
        gte(prescricaoLembreteEnviosTable.enviadoEm, desde),
      ),
    );

  res.json({
    unidadeId: unidadeFiltro,
    janelaHoras: horas,
    desde: desde.toISOString(),
    total: row?.total ?? 0,
  });
});

router.get("/prescricoes-lembrete/falhas", async (req, res): Promise<void> => {
  const { unidadeId, limit } = req.query;

  const conditions: SQL[] = [eq(prescricaoLembreteEnviosTable.status, "FALHOU")];

  // Tenant guard: se ha contexto de unidade, o filtro fica preso a ela.
  // Sem contexto, exige unidadeId explicito para evitar vazamento entre
  // unidades. Cross-unit listing nao e suportado por este endpoint.
  const ctxUnidade = req.tenantContext?.unidadeId ?? null;
  let unidadeFiltro: number | null = null;

  if (ctxUnidade != null) {
    unidadeFiltro = ctxUnidade;
    if (unidadeId !== undefined && unidadeId !== "") {
      const u = Number(unidadeId);
      if (!Number.isFinite(u)) {
        res.status(400).json({ erro: "unidadeId deve ser numero" });
        return;
      }
      if (u !== ctxUnidade) {
        res.status(403).json({ erro: "unidade fora do escopo do chamador" });
        return;
      }
    }
  } else {
    if (unidadeId === undefined || unidadeId === "") {
      res.status(400).json({ erro: "unidadeId e obrigatorio" });
      return;
    }
    const u = Number(unidadeId);
    if (!Number.isFinite(u)) {
      res.status(400).json({ erro: "unidadeId deve ser numero" });
      return;
    }
    unidadeFiltro = u;
  }
  conditions.push(eq(prescricaoLembreteEnviosTable.unidadeId, unidadeFiltro));

  let lim = 100;
  if (limit !== undefined && limit !== "") {
    const n = Number(limit);
    if (!Number.isFinite(n) || n < 1 || n > 500) {
      res.status(400).json({ erro: "limit deve ser numero entre 1 e 500" });
      return;
    }
    lim = Math.floor(n);
  }

  const rows = await db
    .select({
      id: prescricaoLembreteEnviosTable.id,
      prescricaoLembreteId: prescricaoLembreteEnviosTable.prescricaoLembreteId,
      pacienteId: prescricaoLembreteEnviosTable.pacienteId,
      pacienteNome: pacientesTable.nome,
      unidadeId: prescricaoLembreteEnviosTable.unidadeId,
      janela: prescricaoLembreteEnviosTable.janela,
      erro: prescricaoLembreteEnviosTable.erro,
      whatsappLogId: prescricaoLembreteEnviosTable.whatsappLogId,
      enviadoEm: prescricaoLembreteEnviosTable.enviadoEm,
    })
    .from(prescricaoLembreteEnviosTable)
    .innerJoin(
      pacientesTable,
      eq(pacientesTable.id, prescricaoLembreteEnviosTable.pacienteId),
    )
    .where(and(...conditions))
    .orderBy(desc(prescricaoLembreteEnviosTable.enviadoEm))
    .limit(lim);

  res.json(rows);
});

router.post("/prescricoes-lembrete/executar", async (req, res): Promise<void> => {
  let toleranciaMinutos: number | undefined;
  if (req.body?.toleranciaMinutos !== undefined && req.body.toleranciaMinutos !== null) {
    const t = Number(req.body.toleranciaMinutos);
    if (!Number.isFinite(t) || t < 0 || t > 720) {
      res.status(400).json({ erro: "toleranciaMinutos deve ser numero entre 0 e 720" });
      return;
    }
    toleranciaMinutos = t;
  }

  let nowParam: Date | undefined;
  if (req.body?.now !== undefined && req.body.now !== null) {
    const d = new Date(req.body.now);
    if (Number.isNaN(d.getTime())) {
      res.status(400).json({ erro: "now deve ser uma data ISO valida" });
      return;
    }
    nowParam = d;
  }

  const result = await executarLembretesPrescricao({
    now: nowParam,
    toleranciaMinutos,
  });
  res.json(result);
});

export default router;
