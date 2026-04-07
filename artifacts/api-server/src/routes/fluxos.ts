import { Router } from "express";
import { db } from "@workspace/db";
import { fluxosAprovacoesTable, perfisPermissoesTable, mapaBlockExameTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router();

// GET /fluxos — lista todos os fluxos agrupados por tipoProcedimento
router.get("/fluxos", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(fluxosAprovacoesTable)
      .where(eq(fluxosAprovacoesTable.ativo, true))
      .orderBy(asc(fluxosAprovacoesTable.tipoProcedimento), asc(fluxosAprovacoesTable.etapaOrdem));

    const agrupados: Record<string, typeof rows> = {};
    for (const row of rows) {
      const tipo = row.tipoProcedimento;
      if (!agrupados[tipo]) agrupados[tipo] = [];
      agrupados[tipo].push(row);
    }

    res.json({ fluxos: agrupados, total: rows.length });
  } catch (err) {
    console.error("[fluxos] erro ao listar fluxos:", err);
    res.status(500).json({ error: "Erro ao listar fluxos de aprovacao." });
  }
});

// GET /fluxos/:tipo — etapas de um tipo de procedimento
router.get("/fluxos/:tipo", async (req, res) => {
  try {
    const tipo = req.params.tipo.toUpperCase();
    const rows = await db
      .select()
      .from(fluxosAprovacoesTable)
      .where(eq(fluxosAprovacoesTable.tipoProcedimento, tipo))
      .orderBy(asc(fluxosAprovacoesTable.etapaOrdem));

    res.json({ tipo, etapas: rows, total: rows.length });
  } catch (err) {
    console.error("[fluxos] erro ao buscar fluxo:", err);
    res.status(500).json({ error: "Erro ao buscar fluxo." });
  }
});

// GET /permissoes — lista todos os perfis de permissao
router.get("/permissoes", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(perfisPermissoesTable)
      .where(eq(perfisPermissoesTable.ativo, true))
      .orderBy(asc(perfisPermissoesTable.perfil));

    res.json({ perfis: rows, total: rows.length });
  } catch (err) {
    console.error("[permissoes] erro ao listar permissoes:", err);
    res.status(500).json({ error: "Erro ao listar perfis de permissao." });
  }
});

// GET /mapa-blocos — lista exames do mapa bloco→exame
router.get("/mapa-blocos", async (req, res) => {
  try {
    const { blocoId, grau } = req.query;

    let query = db.select().from(mapaBlockExameTable).where(eq(mapaBlockExameTable.ativo, true)).$dynamic();

    if (blocoId) {
      query = query.where(eq(mapaBlockExameTable.blocoId, blocoId as string));
    }

    const rows = await query.orderBy(asc(mapaBlockExameTable.blocoId), asc(mapaBlockExameTable.grau), asc(mapaBlockExameTable.ordemNoBloco));

    const filtrados = grau ? rows.filter((r) => r.grau === grau) : rows;

    res.json({ exames: filtrados, total: filtrados.length });
  } catch (err) {
    console.error("[mapa-blocos] erro ao listar mapa:", err);
    res.status(500).json({ error: "Erro ao listar mapa bloco-exame." });
  }
});

// GET /mapa-blocos/:blocoId — exames de um bloco especifico
router.get("/mapa-blocos/:blocoId", async (req, res) => {
  try {
    const { blocoId } = req.params;
    const { grau } = req.query;

    const rows = await db
      .select()
      .from(mapaBlockExameTable)
      .where(eq(mapaBlockExameTable.blocoId, blocoId.toUpperCase()))
      .orderBy(asc(mapaBlockExameTable.grau), asc(mapaBlockExameTable.ordemNoBloco));

    const filtrados = grau ? rows.filter((r) => r.grau === grau) : rows;

    const porGrau: Record<string, typeof filtrados> = {};
    for (const row of filtrados) {
      if (!porGrau[row.grau]) porGrau[row.grau] = [];
      porGrau[row.grau].push(row);
    }

    res.json({ blocoId: blocoId.toUpperCase(), graus: porGrau, total: filtrados.length });
  } catch (err) {
    console.error("[mapa-blocos] erro ao buscar bloco:", err);
    res.status(500).json({ error: "Erro ao buscar exames do bloco." });
  }
});

export default router;
