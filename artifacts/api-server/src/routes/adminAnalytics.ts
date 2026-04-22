import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireRole } from "../middlewares/requireRole";

const router = Router();

/**
 * Guard explicito EXCLUSIVO de Dr. Caio (validador_mestre) — sem bypass de
 * ADMIN_TOKEN. Analytics multiplanar eh visao CEO real, nao ferramenta admin.
 * Aplicar APOS requireRole pra defender em profundidade.
 */
function requireMasterEstrito(req: Request, res: Response, next: NextFunction): void {
  if ((req as any).user?.perfil !== "validador_mestre") {
    res.status(403).json({
      error: "Acesso restrito ao Dr. Caio (perfil validador_mestre exclusivo)",
    });
    return;
  }
  next();
}

/** Valida formato YYYY-MM. Retorna a string se valida, null caso contrario. */
function validaAnoMes(v: string): string | null {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : null;
}

/**
 * Helper: calcula variacao percentual entre dois numeros, com guarda contra
 * divisao por zero. Retorna numero positivo/negativo ou null quando base=0.
 */
function variacaoPct(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Number((((atual - anterior) / anterior) * 100).toFixed(2));
}

/**
 * Helper: classifica variacao em cor semantica pra o frontend nao ter que
 * reimplementar a regra. Regra Mike Tyson × Eder Jofre: o que importa eh
 * a EVOLUCAO, entao o threshold eh agressivo (acima de 10% = ouro).
 */
function semanticoCor(varPct: number | null): string {
  if (varPct === null) return "neutro";
  if (varPct >= 10) return "excelente";
  if (varPct >= 0)  return "bom";
  if (varPct >= -10) return "atencao";
  return "critico";
}

/**
 * GET /api/admin/analytics/crescimento-clinicas?periodo_a=YYYY-MM&periodo_b=YYYY-MM
 *
 * Compara cada clinica entre 2 periodos. Default: penultimo mes vs ultimo.
 * Retorna ranking ordenado por variacao percentual.
 *
 * Filosofia: numero absoluto NUNCA isolado. Sempre acompanhado de
 * (var_pct, var_abs, cor_semantica, sparkline_6_meses).
 */
router.get(
  "/admin/analytics/crescimento-clinicas",
  requireRole("validador_mestre"),
  requireMasterEstrito,
  async (req, res): Promise<void> => {
    let periodoA = (req.query.periodo_a as string) || "";
    let periodoB = (req.query.periodo_b as string) || "";

    if (!periodoA || !periodoB) {
      const ult = await db.execute(sql`
        SELECT DISTINCT ano_mes FROM analytics_clinica_mes
        ORDER BY ano_mes DESC LIMIT 2
      `);
      if (ult.rows.length < 2) {
        res.status(400).json({ error: "Snapshots insuficientes para comparar." });
        return;
      }
      periodoB = (ult.rows[0] as any).ano_mes;
      periodoA = (ult.rows[1] as any).ano_mes;
    } else {
      const a = validaAnoMes(periodoA);
      const b = validaAnoMes(periodoB);
      if (!a || !b) {
        res.status(400).json({ error: "periodo_a/periodo_b devem ser YYYY-MM (ex: 2026-04)" });
        return;
      }
      periodoA = a;
      periodoB = b;
    }

    // Pega dados dos 2 periodos + sparkline (ultimos 6 meses) por unidade
    const dados = await db.execute(sql`
      WITH a AS (
        SELECT * FROM analytics_clinica_mes WHERE ano_mes = ${periodoA}
      ),
      b AS (
        SELECT * FROM analytics_clinica_mes WHERE ano_mes = ${periodoB}
      ),
      spark AS (
        SELECT unidade_id,
               json_agg(json_build_object('ano_mes', ano_mes, 'fat', faturamento_brl)
                        ORDER BY ano_mes) AS serie
        FROM (
          SELECT unidade_id, ano_mes, faturamento_brl
          FROM analytics_clinica_mes
          WHERE ano_mes >= TO_CHAR(
            (TO_DATE(${periodoB} || '-01', 'YYYY-MM-DD') - INTERVAL '5 months'),
            'YYYY-MM'
          )
          ORDER BY ano_mes DESC
        ) sub GROUP BY unidade_id
      )
      SELECT
        u.id AS unidade_id, u.nome, u.tipo_unidade,
        COALESCE(a.faturamento_brl, 0)::numeric AS fat_a,
        COALESCE(b.faturamento_brl, 0)::numeric AS fat_b,
        COALESCE(a.receitas_count, 0)           AS rec_a,
        COALESCE(b.receitas_count, 0)           AS rec_b,
        COALESCE(a.pacientes_unicos, 0)         AS pac_a,
        COALESCE(b.pacientes_unicos, 0)         AS pac_b,
        s.serie AS sparkline
      FROM unidades u
      LEFT JOIN a ON a.unidade_id = u.id
      LEFT JOIN b ON b.unidade_id = u.id
      LEFT JOIN spark s ON s.unidade_id = u.id
      WHERE u.id IN (SELECT unidade_id FROM analytics_clinica_mes)
    `);

    const ranking = dados.rows.map((r: any) => {
      const fatA = Number(r.fat_a);
      const fatB = Number(r.fat_b);
      const recA = Number(r.rec_a);
      const recB = Number(r.rec_b);
      const pacA = Number(r.pac_a);
      const pacB = Number(r.pac_b);
      const varFat = variacaoPct(fatB, fatA);
      const varRec = variacaoPct(recB, recA);
      const varPac = variacaoPct(pacB, pacA);
      return {
        unidade_id: r.unidade_id,
        nome: r.nome,
        tipo_unidade: r.tipo_unidade,
        faturamento: {
          periodo_a: fatA, periodo_b: fatB,
          variacao_abs_brl: Number((fatB - fatA).toFixed(2)),
          variacao_pct: varFat,
          cor: semanticoCor(varFat),
        },
        receitas: {
          periodo_a: recA, periodo_b: recB,
          variacao_abs: recB - recA,
          variacao_pct: varRec,
          cor: semanticoCor(varRec),
        },
        pacientes: {
          periodo_a: pacA, periodo_b: pacB,
          variacao_abs: pacB - pacA,
          variacao_pct: varPac,
          cor: semanticoCor(varPac),
        },
        sparkline_faturamento: r.sparkline ?? [],
      };
    }).sort((x: any, y: any) => (y.faturamento.variacao_pct ?? -999) - (x.faturamento.variacao_pct ?? -999));

    // Agregado consolidado (totais + variacao geral)
    const totA = ranking.reduce((s: number, r: any) => s + r.faturamento.periodo_a, 0);
    const totB = ranking.reduce((s: number, r: any) => s + r.faturamento.periodo_b, 0);

    res.json({
      periodo_a: periodoA,
      periodo_b: periodoB,
      consolidado: {
        faturamento_a: Number(totA.toFixed(2)),
        faturamento_b: Number(totB.toFixed(2)),
        variacao_abs_brl: Number((totB - totA).toFixed(2)),
        variacao_pct: variacaoPct(totB, totA),
        cor: semanticoCor(variacaoPct(totB, totA)),
      },
      ranking,
    });
  }
);

/**
 * GET /api/admin/analytics/produtos-comparativo?ano_mes=YYYY-MM
 *
 * Matriz simplificada: clinica x metricas-chave do mes. Eh o "produto-mosaico"
 * pra o heatmap do CEO escanear de relance quem ta pulando, quem ta caindo.
 *
 * (Quando catalogo blends_pawards/produtos vier temporalizado, evolui pra
 * matriz produto x clinica. Por ora retorna metricas-chave no lugar.)
 */
router.get(
  "/admin/analytics/produtos-comparativo",
  requireRole("validador_mestre"),
  requireMasterEstrito,
  async (req, res): Promise<void> => {
    const anoMes = (req.query.ano_mes as string) || "";
    let mesAlvo = anoMes;
    if (mesAlvo) {
      const v = validaAnoMes(mesAlvo);
      if (!v) {
        res.status(400).json({ error: "ano_mes deve ser YYYY-MM (ex: 2026-04)" });
        return;
      }
      mesAlvo = v;
    } else {
      const ult = await db.execute(sql`
        SELECT MAX(ano_mes) AS m FROM analytics_clinica_mes
      `);
      mesAlvo = (ult.rows[0] as any)?.m;
    }

    const linhas = await db.execute(sql`
      SELECT
        u.id AS unidade_id, u.nome, u.tipo_unidade,
        a.faturamento_brl, a.comissao_brl, a.receitas_count,
        a.pacientes_unicos, a.blends_distintos, a.ticket_medio_brl,
        a.origem, a.atualizado_em
      FROM analytics_clinica_mes a
      JOIN unidades u ON u.id = a.unidade_id
      WHERE a.ano_mes = ${mesAlvo}
      ORDER BY a.faturamento_brl DESC NULLS LAST
    `);

    // Ranking percentil pra heatmap (cor por posicao no ranking, nao por absoluto)
    const total = linhas.rows.length;
    const matriz = linhas.rows.map((r: any, idx: number) => {
      const percentil = total > 1 ? Number(((1 - idx / (total - 1)) * 100).toFixed(0)) : 100;
      return {
        unidade_id: r.unidade_id,
        nome: r.nome,
        tipo_unidade: r.tipo_unidade,
        faturamento_brl:  Number(r.faturamento_brl),
        comissao_brl:     Number(r.comissao_brl),
        receitas_count:   Number(r.receitas_count),
        pacientes_unicos: Number(r.pacientes_unicos),
        blends_distintos: Number(r.blends_distintos),
        ticket_medio_brl: Number(r.ticket_medio_brl),
        posicao_ranking:  idx + 1,
        percentil,
        heatmap_cor:
          percentil >= 75 ? "ouro" :
          percentil >= 50 ? "verde" :
          percentil >= 25 ? "amarelo" : "vermelho",
        origem: r.origem,
      };
    });

    res.json({ ano_mes: mesAlvo, matriz });
  }
);

/**
 * GET /api/admin/analytics/tendencia-produto?unidade_id=N&meses=6
 *
 * Serie temporal de UMA unidade nos ultimos N meses, com pico/vale marcados.
 * Pode ser usada como drill-down de qualquer linha da matriz.
 */
router.get(
  "/admin/analytics/tendencia-produto",
  requireRole("validador_mestre"),
  requireMasterEstrito,
  async (req, res): Promise<void> => {
    const unidadeId = req.query.unidade_id ? Number(req.query.unidade_id) : null;
    const mesesRaw = req.query.meses ? Number(req.query.meses) : 6;
    const meses = Number.isFinite(mesesRaw) && mesesRaw > 0
      ? Math.min(24, Math.floor(mesesRaw))
      : 6;

    if (!unidadeId || Number.isNaN(unidadeId) || unidadeId <= 0) {
      res.status(400).json({ error: "unidade_id obrigatorio (inteiro positivo)" });
      return;
    }

    const serie = await db.execute(sql`
      SELECT ano_mes, faturamento_brl, comissao_brl, receitas_count,
             pacientes_unicos, ticket_medio_brl, origem
      FROM analytics_clinica_mes
      WHERE unidade_id = ${unidadeId}
      ORDER BY ano_mes DESC
      LIMIT ${meses}
    `);

    const pontos = serie.rows.map((r: any) => ({
      ano_mes: r.ano_mes,
      faturamento_brl:  Number(r.faturamento_brl),
      comissao_brl:     Number(r.comissao_brl),
      receitas_count:   Number(r.receitas_count),
      pacientes_unicos: Number(r.pacientes_unicos),
      ticket_medio_brl: Number(r.ticket_medio_brl),
      origem: r.origem,
    })).reverse(); // ordem cronologica ascendente

    if (pontos.length === 0) {
      res.json({ unidade_id: unidadeId, pontos: [], pico: null, vale: null });
      return;
    }

    // Marca pico e vale do faturamento
    let pico = pontos[0], vale = pontos[0];
    for (const p of pontos) {
      if (p.faturamento_brl > pico.faturamento_brl) pico = p;
      if (p.faturamento_brl < vale.faturamento_brl) vale = p;
    }

    // Variacao mes a mes pra anotar nos pontos
    const pontosComVar = pontos.map((p, i) => ({
      ...p,
      variacao_pct: i === 0 ? null : variacaoPct(p.faturamento_brl, pontos[i - 1].faturamento_brl),
      eh_pico: p.ano_mes === pico.ano_mes,
      eh_vale: p.ano_mes === vale.ano_mes,
    }));

    // Crescimento total no periodo (Mike Tyson × Eder Jofre)
    const primeiro = pontos[0].faturamento_brl;
    const ultimo = pontos[pontos.length - 1].faturamento_brl;
    const crescimentoPeriodo = variacaoPct(ultimo, primeiro);

    res.json({
      unidade_id: unidadeId,
      meses_solicitados: meses,
      pontos: pontosComVar,
      pico: { ano_mes: pico.ano_mes, valor: pico.faturamento_brl },
      vale: { ano_mes: vale.ano_mes, valor: vale.faturamento_brl },
      crescimento_periodo_pct: crescimentoPeriodo,
      crescimento_periodo_cor: semanticoCor(crescimentoPeriodo),
      narrativa: crescimentoPeriodo === null
        ? "Sem dados base."
        : crescimentoPeriodo >= 0
          ? `Cresceu ${crescimentoPeriodo}% no periodo (${pontos.length} meses).`
          : `Caiu ${Math.abs(crescimentoPeriodo)}% no periodo (${pontos.length} meses).`,
    });
  }
);

export default router;
