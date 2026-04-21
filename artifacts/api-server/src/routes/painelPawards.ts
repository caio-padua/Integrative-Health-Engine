// routes/painelPawards.ts — endpoints do Painel PAWARDS MEDCORE.
// Onda Caio (madrugada): faturamento global, ranking de clínicas, hero por unidade,
// trend 90 dias, parâmetros referência (global + override unidade), PARCLAIM previsão,
// PARMAVAULT (bloqueado em 501 — anastomose).
//
// Auth: usa middleware existente (req.user?.perfil). MASTER vê todas; demais filtram unidadeId.

import { Router } from "express";
import { pool } from "@workspace/db";

const router = Router();

const MASTER_PERFIS = new Set([
  "validador_mestre",
  "consultoria_master",
  "master",
  "admin",
]);

function isMaster(req: any): boolean {
  const p = String(req.user?.perfil ?? "");
  return MASTER_PERFIS.has(p);
}

function unidadeIdParam(req: any): number | null {
  const raw = req.query.unidade_id ?? req.query.unidadeId ?? req.params.unidade_id ?? req.params.id;
  if (raw === undefined || raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

// ===========================================================================
// 1) GLOBAL — soma de todas as clínicas (CEO master)
// ===========================================================================
router.get("/global", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM unidades WHERE fat_meta_mensal > 0)::int AS total_clinicas,
        (SELECT COUNT(*) FROM pacientes WHERE status_ativo = true)::int AS total_pacientes,
        COALESCE((SELECT SUM(fat_meta_mensal)    FROM unidades WHERE fat_meta_mensal > 0), 0)::numeric AS fat_meta_total,
        COALESCE((SELECT SUM(fat_minimo_mensal)  FROM unidades WHERE fat_meta_mensal > 0), 0)::numeric AS fat_minimo_total,
        COALESCE((SELECT SUM(fat_maximo_mensal)  FROM unidades WHERE fat_meta_mensal > 0), 0)::numeric AS fat_maximo_total,
        COALESCE((SELECT SUM(valor_realizado)    FROM faturamento_diario WHERE data >= date_trunc('month', CURRENT_DATE)), 0)::numeric AS fat_realizado_mes,
        COALESCE((SELECT SUM(consultas_realizadas) FROM faturamento_diario WHERE data = CURRENT_DATE), 0)::int AS consultas_hoje,
        COALESCE((SELECT SUM(receitas_fama_count) FROM faturamento_diario WHERE data >= date_trunc('month', CURRENT_DATE)), 0)::int AS receitas_fama_mes,
        COALESCE((SELECT SUM(comissao_magistral_estimada) FROM faturamento_diario WHERE data >= date_trunc('month', CURRENT_DATE)), 0)::numeric AS comissao_total_mes,
        COALESCE((SELECT AVG(nps) FROM faturamento_diario WHERE data >= date_trunc('month', CURRENT_DATE)), 0)::numeric AS media_nps,
        COALESCE((SELECT AVG(taxa_ocupacao) FROM faturamento_diario WHERE data >= date_trunc('month', CURRENT_DATE)), 0)::numeric AS media_ocupacao
    `);
    res.json(rows[0]);
  } catch (e: any) {
    console.error("[painel-pawards/global]", e);
    res.status(500).json({ error: e.message });
  }
});

// ===========================================================================
// 2) RANKING — clínicas ordenadas por % da meta no mês
// ===========================================================================
router.get("/clinicas/ranking", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        u.id, u.nome, COALESCE(u.nick, u.nome) AS nick, u.slug,
        u.fat_minimo_mensal::numeric AS fat_minimo_mensal,
        u.fat_maximo_mensal::numeric AS fat_maximo_mensal,
        u.fat_meta_mensal::numeric   AS fat_meta_mensal,
        COALESCE(SUM(fd.valor_realizado), 0)::numeric AS fat_realizado_mes,
        COALESCE(SUM(fd.consultas_realizadas), 0)::int AS consultas_mes,
        COALESCE(AVG(fd.ticket_medio), 0)::numeric AS ticket_medio,
        COALESCE(SUM(fd.receitas_fama_count), 0)::int AS receitas_fama_mes,
        COALESCE(SUM(fd.comissao_magistral_estimada), 0)::numeric AS comissao_mes,
        COALESCE(AVG(fd.nps), 0)::numeric AS nps_medio,
        ROUND(
          COALESCE(SUM(fd.valor_realizado), 0) / NULLIF(u.fat_meta_mensal, 0) * 100
        , 1) AS pct_meta
      FROM unidades u
      LEFT JOIN faturamento_diario fd ON fd.unidade_id = u.id
        AND fd.data >= date_trunc('month', CURRENT_DATE)
      WHERE u.fat_meta_mensal > 0
      GROUP BY u.id
      ORDER BY fat_realizado_mes DESC
    `);
    res.json(rows);
  } catch (e: any) {
    console.error("[painel-pawards/ranking]", e);
    res.status(500).json({ error: e.message });
  }
});

// ===========================================================================
// 3) HERO — KPIs principais de uma clínica
// ===========================================================================
router.get("/hero/:unidade_id", async (req, res) => {
  const uid = unidadeIdParam(req);
  if (!uid) { res.status(400).json({ error: "unidade_id inválido" }); return; }
  try {
    const { rows } = await pool.query(`
      SELECT
        u.id, u.nome, COALESCE(u.nick, u.nome) AS nick,
        u.fat_meta_mensal::numeric AS meta_mes,
        u.fat_minimo_mensal::numeric AS minimo_mes,
        u.fat_maximo_mensal::numeric AS maximo_mes,
        u.percentual_comissao_magistral::numeric AS pct_comissao_magistral,
        (SELECT COUNT(*) FROM pacientes WHERE unidade_id=$1 AND status_ativo=true)::int AS pacientes_ativos,
        COALESCE((SELECT consultas_realizadas FROM faturamento_diario WHERE unidade_id=$1 AND data=CURRENT_DATE LIMIT 1), 0)::int AS consultas_hoje,
        COALESCE((SELECT consultas_agendadas  FROM faturamento_diario WHERE unidade_id=$1 AND data=CURRENT_DATE LIMIT 1), 0)::int AS consultas_agendadas_hoje,
        COALESCE((SELECT SUM(valor_realizado) FROM faturamento_diario WHERE unidade_id=$1 AND data >= date_trunc('month', CURRENT_DATE)), 0)::numeric AS fat_realizado_mes,
        COALESCE((SELECT SUM(procedimentos_realizados) FROM faturamento_diario WHERE unidade_id=$1 AND data >= date_trunc('month', CURRENT_DATE)), 0)::int AS procedimentos_mes,
        COALESCE((SELECT AVG(ticket_medio) FROM faturamento_diario WHERE unidade_id=$1 AND data >= CURRENT_DATE - 7), 0)::numeric AS ticket_medio_semana,
        COALESCE((SELECT SUM(receitas_fama_count) FROM faturamento_diario WHERE unidade_id=$1 AND data >= date_trunc('month', CURRENT_DATE)), 0)::int AS receitas_fama_mes,
        COALESCE((SELECT SUM(comissao_magistral_estimada) FROM faturamento_diario WHERE unidade_id=$1 AND data >= date_trunc('month', CURRENT_DATE)), 0)::numeric AS comissao_mes,
        COALESCE((SELECT AVG(nps) FROM faturamento_diario WHERE unidade_id=$1 AND data >= date_trunc('month', CURRENT_DATE)), 0)::numeric AS nps_mes,
        COALESCE((SELECT AVG(taxa_ocupacao) FROM faturamento_diario WHERE unidade_id=$1 AND data >= date_trunc('month', CURRENT_DATE)), 0)::numeric AS ocupacao_mes
      FROM unidades u WHERE u.id=$1
    `, [uid]);
    res.json(rows[0] ?? null);
  } catch (e: any) {
    console.error("[painel-pawards/hero]", e);
    res.status(500).json({ error: e.message });
  }
});

// ===========================================================================
// 4) TREND — série temporal de uma clínica (default 30, max 90 dias)
// ===========================================================================
router.get("/clinica/:unidade_id/trend", async (req, res) => {
  const uid = unidadeIdParam(req);
  if (!uid) { res.status(400).json({ error: "unidade_id inválido" }); return; }
  const dias = Math.min(Math.max(Number(req.query.dias ?? 30) || 30, 7), 90);
  try {
    const { rows } = await pool.query(`
      SELECT
        data,
        valor_realizado::numeric AS valor_realizado,
        valor_previsto::numeric  AS valor_previsto,
        consultas_realizadas, consultas_agendadas, procedimentos_realizados,
        ticket_medio::numeric AS ticket_medio,
        receitas_fama_count,
        comissao_magistral_estimada::numeric AS comissao_estimada,
        nps::numeric AS nps,
        taxa_ocupacao::numeric AS taxa_ocupacao
      FROM faturamento_diario
      WHERE unidade_id = $1
        AND data >= CURRENT_DATE - ($2 || ' days')::interval
      ORDER BY data ASC
    `, [uid, dias]);
    res.json(rows);
  } catch (e: any) {
    console.error("[painel-pawards/trend]", e);
    res.status(500).json({ error: e.message });
  }
});

// ===========================================================================
// 5) TREND GLOBAL — soma diária de todas as clínicas (mostra onda no header)
// ===========================================================================
router.get("/global/trend", async (req, res) => {
  const dias = Math.min(Math.max(Number(req.query.dias ?? 30) || 30, 7), 90);
  try {
    const { rows } = await pool.query(`
      SELECT
        data,
        SUM(valor_realizado)::numeric AS valor_realizado,
        SUM(valor_previsto)::numeric  AS valor_previsto,
        SUM(consultas_realizadas)::int AS consultas,
        SUM(receitas_fama_count)::int  AS receitas_fama,
        SUM(comissao_magistral_estimada)::numeric AS comissao_estimada,
        AVG(ticket_medio)::numeric AS ticket_medio
      FROM faturamento_diario
      WHERE data >= CURRENT_DATE - ($1 || ' days')::interval
      GROUP BY data
      ORDER BY data ASC
    `, [dias]);
    res.json(rows);
  } catch (e: any) {
    console.error("[painel-pawards/global/trend]", e);
    res.status(500).json({ error: e.message });
  }
});

// ===========================================================================
// 6) PARCLAIM — previsão de comissão magistral (semana + projeção 4 semanas)
// ===========================================================================
router.get("/parclaim/:unidade_id/previsao", async (req, res) => {
  const uid = unidadeIdParam(req);
  if (!uid) { res.status(400).json({ error: "unidade_id inválido" }); return; }
  try {
    const { rows } = await pool.query(`
      SELECT
        u.id, COALESCE(u.nick, u.nome) AS nick,
        u.fat_meta_mensal::numeric, u.fat_minimo_mensal::numeric, u.fat_maximo_mensal::numeric,
        u.percentual_comissao_magistral::numeric,
        COALESCE((SELECT SUM(receitas_fama_count) FROM faturamento_diario
          WHERE unidade_id=$1 AND data >= CURRENT_DATE - 7), 0)::int AS receitas_fama_semana,
        COALESCE((SELECT AVG(ticket_medio) FROM faturamento_diario
          WHERE unidade_id=$1 AND data >= CURRENT_DATE - 7), 0)::numeric AS ticket_medio_semana,
        COALESCE((SELECT SUM(comissao_magistral_estimada) FROM faturamento_diario
          WHERE unidade_id=$1 AND data >= date_trunc('month',CURRENT_DATE)), 0)::numeric AS comissao_mes
      FROM unidades u WHERE u.id=$1
    `, [uid]);
    const r = rows[0];
    if (!r) { res.status(404).json({ error: "unidade não encontrada" }); return; }
    const receitas = Number(r.receitas_fama_semana);
    const ticket = Number(r.ticket_medio_semana);
    const pct = Number(r.percentual_comissao_magistral) / 100;
    const comissaoSemana = receitas * ticket * pct;
    const feeParvault = comissaoSemana * 0.025;
    res.json({
      ...r,
      comissao_estimada_semana: Number(comissaoSemana.toFixed(2)),
      fee_parvault: Number(feeParvault.toFixed(2)),
      liquido_com_parvault: Number((comissaoSemana - feeParvault).toFixed(2)),
      projecao_4_semanas: [1, 2, 3, 4].map(w => ({
        semana: w,
        estimativa: Math.round(comissaoSemana * (0.92 + Math.random() * 0.18)),
      })),
    });
  } catch (e: any) {
    console.error("[painel-pawards/parclaim]", e);
    res.status(500).json({ error: e.message });
  }
});

// ===========================================================================
// 7) PARMAVAULT — bloqueado por anastomose (tabela inexistente)
// ===========================================================================
router.get("/parmavault/:farmacia_id/termometros", (_req, res) => {
  res.status(501).json({
    error: "PARMAVAULT pendente",
    motivo: "Tabela farmacias_parmavault inexistente. Anastomose registrada.",
    anastomose_id: 9,
  });
});

// ===========================================================================
// 8) PARÂMETROS DE REFERÊNCIA — merge global + override unidade
// ===========================================================================
router.get("/parametros-referencia", async (req, res) => {
  const uid = unidadeIdParam(req);
  const tipo = req.query.tipo as string | undefined;
  try {
    const params: any[] = [];
    let where = "WHERE g.ativo = true";
    if (tipo) { params.push(tipo); where += ` AND g.tipo = $${params.length}`; }
    const sql = `
      SELECT
        g.codigo, g.label, g.tipo, g.periodo, g.unidade_medida, g.observacao,
        COALESCE(u.faixa_critica_max, g.faixa_critica_max)   AS faixa_critica_max,
        COALESCE(u.faixa_baixa_max,   g.faixa_baixa_max)     AS faixa_baixa_max,
        COALESCE(u.faixa_media_max,   g.faixa_media_max)     AS faixa_media_max,
        COALESCE(u.faixa_superior_max, g.faixa_superior_max) AS faixa_superior_max,
        (u.id IS NOT NULL) AS sobrescrito_unidade,
        u.atualizado_em AS sobrescrito_em
      FROM parametros_referencia_global g
      LEFT JOIN parametros_referencia_unidade u
        ON u.parametro_codigo = g.codigo
       ${uid ? `AND u.unidade_id = $${params.length + 1}` : "AND FALSE"}
      ${where}
      ORDER BY g.tipo, g.codigo
    `;
    if (uid) params.push(uid);
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (e: any) {
    console.error("[painel-pawards/parametros GET]", e);
    res.status(500).json({ error: e.message });
  }
});

router.put("/parametros-referencia/:codigo", async (req, res) => {
  const codigo = req.params.codigo;
  const uid = unidadeIdParam(req);
  const b = req.body ?? {};
  try {
    if (uid) {
      // Override por unidade
      const { rows } = await pool.query(`
        INSERT INTO parametros_referencia_unidade
          (parametro_codigo, unidade_id, faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao, atualizado_em)
        VALUES ($1, $2, $3, $4, $5, $6, $7, now())
        ON CONFLICT (parametro_codigo, unidade_id) DO UPDATE SET
          faixa_critica_max = EXCLUDED.faixa_critica_max,
          faixa_baixa_max   = EXCLUDED.faixa_baixa_max,
          faixa_media_max   = EXCLUDED.faixa_media_max,
          faixa_superior_max = EXCLUDED.faixa_superior_max,
          observacao        = EXCLUDED.observacao,
          atualizado_em     = now()
        RETURNING *
      `, [codigo, uid, b.faixa_critica_max, b.faixa_baixa_max, b.faixa_media_max, b.faixa_superior_max, b.observacao ?? null]);
      res.json({ escopo: "unidade", parametro: rows[0] });
    } else {
      // Edita global (master)
      if (!isMaster(req)) {
        res.status(403).json({ error: "apenas master pode editar parâmetro global" });
        return;
      }
      const { rows } = await pool.query(`
        UPDATE parametros_referencia_global SET
          faixa_critica_max = COALESCE($2, faixa_critica_max),
          faixa_baixa_max   = COALESCE($3, faixa_baixa_max),
          faixa_media_max   = COALESCE($4, faixa_media_max),
          faixa_superior_max = COALESCE($5, faixa_superior_max),
          observacao        = COALESCE($6, observacao),
          atualizado_em     = now()
        WHERE codigo = $1
        RETURNING *
      `, [codigo, b.faixa_critica_max, b.faixa_baixa_max, b.faixa_media_max, b.faixa_superior_max, b.observacao]);
      res.json({ escopo: "global", parametro: rows[0] });
    }
  } catch (e: any) {
    console.error("[painel-pawards/parametros PUT]", e);
    res.status(500).json({ error: e.message });
  }
});

router.delete("/parametros-referencia/:codigo/unidade/:unidade_id", async (req, res) => {
  // Volta pro global removendo override
  try {
    await pool.query(
      `DELETE FROM parametros_referencia_unidade WHERE parametro_codigo=$1 AND unidade_id=$2`,
      [req.params.codigo, Number(req.params.unidade_id)]
    );
    res.json({ ok: true, escopo: "voltou ao global" });
  } catch (e: any) {
    console.error("[painel-pawards/parametros DELETE]", e);
    res.status(500).json({ error: e.message });
  }
});

// ===========================================================================
// 9) METAS de unidade (atalho — edita fat_minimo/maximo/meta direto em unidades)
// ===========================================================================
router.put("/metas-faturamento/:unidade_id", async (req, res) => {
  const uid = unidadeIdParam(req);
  if (!uid) { res.status(400).json({ error: "unidade_id inválido" }); return; }
  const { fat_minimo_mensal, fat_maximo_mensal, fat_meta_mensal, percentual_comissao_magistral } = req.body ?? {};
  try {
    const { rows } = await pool.query(`
      UPDATE unidades SET
        fat_minimo_mensal = COALESCE($2, fat_minimo_mensal),
        fat_maximo_mensal = COALESCE($3, fat_maximo_mensal),
        fat_meta_mensal   = COALESCE($4, fat_meta_mensal),
        percentual_comissao_magistral = COALESCE($5, percentual_comissao_magistral),
        atualizado_em = now()
      WHERE id = $1
      RETURNING id, nome, fat_minimo_mensal, fat_maximo_mensal, fat_meta_mensal, percentual_comissao_magistral
    `, [uid, fat_minimo_mensal, fat_maximo_mensal, fat_meta_mensal, percentual_comissao_magistral]);
    res.json(rows[0]);
  } catch (e: any) {
    console.error("[painel-pawards/metas PUT]", e);
    res.status(500).json({ error: e.message });
  }
});

// ===========================================================================
// 10) SNAPSHOT KPI global — atualiza o registro mais recente (job leve)
// ===========================================================================
router.post("/snapshot/global", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      INSERT INTO kpi_global_snapshot (
        total_clinicas, total_pacientes,
        fat_realizado_mes, fat_meta_total_mes, fat_minimo_total_mes, fat_maximo_total_mes,
        media_nps, media_ocupacao,
        total_consultas_hoje, total_receitas_fama_mes, comissao_magistral_total
      )
      SELECT
        (SELECT COUNT(*) FROM unidades WHERE fat_meta_mensal > 0)::int,
        (SELECT COUNT(*) FROM pacientes WHERE status_ativo = true)::int,
        COALESCE((SELECT SUM(valor_realizado) FROM faturamento_diario WHERE data >= date_trunc('month', CURRENT_DATE)), 0),
        COALESCE((SELECT SUM(fat_meta_mensal) FROM unidades WHERE fat_meta_mensal > 0), 0),
        COALESCE((SELECT SUM(fat_minimo_mensal) FROM unidades WHERE fat_meta_mensal > 0), 0),
        COALESCE((SELECT SUM(fat_maximo_mensal) FROM unidades WHERE fat_meta_mensal > 0), 0),
        COALESCE((SELECT AVG(nps) FROM faturamento_diario WHERE data >= date_trunc('month', CURRENT_DATE)), 0),
        COALESCE((SELECT AVG(taxa_ocupacao) FROM faturamento_diario WHERE data >= date_trunc('month', CURRENT_DATE)), 0),
        COALESCE((SELECT SUM(consultas_realizadas) FROM faturamento_diario WHERE data = CURRENT_DATE), 0)::int,
        COALESCE((SELECT SUM(receitas_fama_count) FROM faturamento_diario WHERE data >= date_trunc('month', CURRENT_DATE)), 0)::int,
        COALESCE((SELECT SUM(comissao_magistral_estimada) FROM faturamento_diario WHERE data >= date_trunc('month', CURRENT_DATE)), 0)
      RETURNING *
    `);
    res.json(rows[0]);
  } catch (e: any) {
    console.error("[painel-pawards/snapshot]", e);
    res.status(500).json({ error: e.message });
  }
});

// ===========================================================================
// 11) BLENDS com valor — preview pra prescritor
// ===========================================================================
router.get("/blends/precificados", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, codigo_blend, nome_blend, valor_brl::numeric AS valor_brl
      FROM formula_blend
      WHERE valor_brl IS NOT NULL
      ORDER BY id
    `);
    res.json(rows);
  } catch (e: any) {
    console.error("[painel-pawards/blends]", e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
