import { Router } from "express";
import { db, tratamentosTable, tratamentoItensTable, sessoesTable, aplicacoesSubstanciasTable, substanciasTable, pacientesTable, unidadesTable } from "@workspace/db";
import { eq, and, sql, or, desc, gte, lte, inArray } from "drizzle-orm";

const router = Router();

async function queryTherapyFacts(params: Record<string, string | undefined>) {
  const {
    substanciaId,
    substanciaNome,
    via,
    statusTratamento,
    unidadeId,
    semRetornoDiasMin,
    semRetornoDiasMax,
    faltasMin,
    dataInicio,
    dataFim,
    page = "1",
    limit = "50",
  } = params;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(200, Math.max(1, Number(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [];

  if (statusTratamento) {
    const statuses = statusTratamento.split(",");
    conditions.push(inArray(tratamentosTable.status, statuses));
  }

  if (unidadeId) {
    conditions.push(eq(tratamentosTable.unidadeId, Number(unidadeId)));
  }

  if (dataInicio) {
    conditions.push(gte(tratamentosTable.dataInicio, dataInicio));
  }

  if (dataFim) {
    conditions.push(lte(tratamentosTable.dataInicio, dataFim));
  }

  let baseQuery = db
    .select({
      tratamentoId: tratamentosTable.id,
      tratamentoNome: tratamentosTable.nome,
      tratamentoStatus: tratamentosTable.status,
      dataInicio: tratamentosTable.dataInicio,
      dataPrevisaoFim: tratamentosTable.dataPrevisaoFim,
      pacienteId: pacientesTable.id,
      pacienteNome: pacientesTable.nome,
      pacienteTelefone: pacientesTable.telefone,
      unidadeId: tratamentosTable.unidadeId,
      unidadeNome: unidadesTable.nome,
      substanciaId: substanciasTable.id,
      substanciaNome: substanciasTable.nome,
      substanciaVia: substanciasTable.via,
      itemVia: tratamentoItensTable.via,
      numeroSessoes: tratamentoItensTable.numeroSessoes,
      valorTotal: tratamentoItensTable.valorTotal,
    })
    .from(tratamentosTable)
    .innerJoin(pacientesTable, eq(tratamentosTable.pacienteId, pacientesTable.id))
    .leftJoin(unidadesTable, eq(tratamentosTable.unidadeId, unidadesTable.id))
    .innerJoin(tratamentoItensTable, eq(tratamentoItensTable.tratamentoId, tratamentosTable.id))
    .leftJoin(substanciasTable, eq(tratamentoItensTable.substanciaId, substanciasTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(tratamentosTable.criadoEm));

  let allRows = await baseQuery;

  if (substanciaId) {
    const ids = substanciaId.split(",").map(Number);
    allRows = allRows.filter(r => r.substanciaId && ids.includes(r.substanciaId));
  }

  if (substanciaNome) {
    const names = substanciaNome.split(",").map(n => n.toLowerCase());
    allRows = allRows.filter(r => {
      const rowName = (r.substanciaNome || "sem_substancia").toLowerCase();
      return names.some(n => rowName.includes(n));
    });
  }

  if (via) {
    const vias = via.split(",").map(v => v.toLowerCase());
    allRows = allRows.filter(r => {
      const rowVia = (r.itemVia || r.substanciaVia || "").toLowerCase();
      return vias.some(v => rowVia.includes(v));
    });
  }

  const sessoesPorPaciente = await db
    .select({
      pacienteId: sessoesTable.pacienteId,
      totalSessoes: sql<number>`count(*)`.as("total_sessoes"),
      faltas: sql<number>`count(*) filter (where ${sessoesTable.status} = 'faltou' or ${sessoesTable.status} = 'nao_compareceu' or ${sessoesTable.status} = 'cancelada')`.as("faltas"),
      ultimaSessao: sql<string>`max(${sessoesTable.dataAgendada})`.as("ultima_sessao"),
    })
    .from(sessoesTable)
    .groupBy(sessoesTable.pacienteId);

  const sessaoMap = new Map<number, { totalSessoes: number; faltas: number; ultimaSessao: string | null }>();
  for (const s of sessoesPorPaciente) {
    sessaoMap.set(s.pacienteId, {
      totalSessoes: Number(s.totalSessoes),
      faltas: Number(s.faltas),
      ultimaSessao: s.ultimaSessao,
    });
  }

  const substComboPorPaciente = new Map<number, Set<string>>();
  for (const row of allRows) {
    if (!row.substanciaNome) continue;
    if (!substComboPorPaciente.has(row.pacienteId)) substComboPorPaciente.set(row.pacienteId, new Set());
    substComboPorPaciente.get(row.pacienteId)!.add(row.substanciaNome);
  }

  const hoje = new Date();
  let enrichedRows = allRows.map(row => {
    const sessaoInfo = sessaoMap.get(row.pacienteId);
    const ultimaSessao = sessaoInfo?.ultimaSessao || null;
    let semRetornoDias = 0;
    if (ultimaSessao) {
      const diff = hoje.getTime() - new Date(ultimaSessao).getTime();
      semRetornoDias = Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    return {
      ...row,
      totalSessoes: sessaoInfo?.totalSessoes || 0,
      faltas: sessaoInfo?.faltas || 0,
      ultimaSessao,
      semRetornoDias,
      substanciasCombo: Array.from(substComboPorPaciente.get(row.pacienteId) || []),
      viaEfetiva: row.itemVia || row.substanciaVia || "nd",
    };
  });

  if (semRetornoDiasMin) {
    enrichedRows = enrichedRows.filter(r => r.semRetornoDias >= Number(semRetornoDiasMin));
  }
  if (semRetornoDiasMax) {
    enrichedRows = enrichedRows.filter(r => r.semRetornoDias <= Number(semRetornoDiasMax));
  }
  if (faltasMin) {
    enrichedRows = enrichedRows.filter(r => r.faltas >= Number(faltasMin));
  }

  const facets = {
    vias: computeFacet(enrichedRows, r => r.viaEfetiva),
    statusTratamento: computeFacet(enrichedRows, r => r.tratamentoStatus),
    substancias: computeFacet(enrichedRows, r => r.substanciaNome || "sem_substancia"),
    unidades: computeFacet(enrichedRows, r => r.unidadeNome || "sem_unidade"),
  };

  const totalRows = enrichedRows.length;
  const paginatedRows = enrichedRows.slice(offset, offset + limitNum);

  return { facets, rows: paginatedRows, allRows: enrichedRows, pagination: { page: pageNum, limit: limitNum, total: totalRows, pages: Math.ceil(totalRows / limitNum) } };
}

router.get("/matrix/therapy-facts", async (req, res) => {
  try {
    const result = await queryTherapyFacts(req.query as Record<string, string>);
    const { allRows, ...response } = result;
    res.json(response);
  } catch (err: any) {
    console.error("Erro matrix therapy-facts:", err);
    res.status(500).json({ erro: err.message });
  }
});

router.get("/matrix/export", async (req, res) => {
  try {
    const params = { ...(req.query as Record<string, string>), page: "1", limit: "10000" };
    const result = await queryTherapyFacts(params);

    if (result.allRows.length === 0) {
      res.status(404).json({ erro: "Nenhum dado encontrado para exportar" });
      return;
    }

    const headers = [
      "Paciente ID",
      "Paciente",
      "Telefone",
      "Unidade",
      "Tratamento",
      "Status",
      "Substancia",
      "Via",
      "Data Inicio",
      "Previsao Fim",
      "Total Sessoes",
      "Faltas",
      "Ultima Sessao",
      "Dias Sem Retorno",
      "Substancias Combo",
    ];

    const csvRows = result.allRows.map((r: any) => [
      r.pacienteId,
      `"${(r.pacienteNome || "").replace(/"/g, '""')}"`,
      `"${(r.pacienteTelefone || "").replace(/"/g, '""')}"`,
      `"${(r.unidadeNome || "").replace(/"/g, '""')}"`,
      `"${(r.tratamentoNome || "").replace(/"/g, '""')}"`,
      r.tratamentoStatus,
      `"${(r.substanciaNome || "").replace(/"/g, '""')}"`,
      r.viaEfetiva,
      r.dataInicio || "",
      r.dataPrevisaoFim || "",
      r.totalSessoes,
      r.faltas,
      r.ultimaSessao || "",
      r.semRetornoDias,
      `"${(r.substanciasCombo || []).join(", ")}"`,
    ].join(","));

    const csv = [headers.join(","), ...csvRows].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="matriz_analitica_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send("\uFEFF" + csv);
  } catch (err: any) {
    console.error("Erro matrix export:", err);
    res.status(500).json({ erro: err.message });
  }
});

function computeFacet(rows: any[], getter: (r: any) => string): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const val = getter(row);
    counts.set(val, (counts.get(val) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

export default router;
