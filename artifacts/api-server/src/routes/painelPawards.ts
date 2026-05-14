// routes/painelPawards.ts — endpoints do Painel PAWARDS MEDCORE.
// Onda Caio (madrugada): faturamento global, ranking de clínicas, hero por unidade,
// trend 90 dias, parâmetros referência (global + override unidade), PARCLAIM previsão,
// PARMAVAULT (bloqueado em 501 — anastomose).
//
// Auth: usa middleware existente (req.user?.perfil). MASTER vê todas; demais filtram unidadeId.

import { Router, type Request, type Response, type NextFunction } from "express";
import { pool } from "@workspace/db";
import type { JwtPayload } from "../lib/auth/jwt";

const router = Router();

// Request com user opcional — espelha a augmentation declarada em requireAuth.ts
// sem depender da resolucao do modulo "express-serve-static-core" no tsconfig.
type AuthedRequest = Request & { user?: JwtPayload };

// Log identificado de cada acesso ao Painel PAWARDS — substitui o log "admin generico"
// herdado do x-admin-token. Mostra quem (email/perfil/sub) tocou cada endpoint
// e persiste em painel_pawards_auditoria pra trilha de compliance/LGPD.
function clientIp(req: Request): string | null {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0]!.trim();
  if (Array.isArray(fwd) && fwd.length > 0) return String(fwd[0]).split(",")[0]!.trim();
  return req.ip ?? req.socket?.remoteAddress ?? null;
}

router.use((req: AuthedRequest, _res: Response, next: NextFunction) => {
  const u = req.user;
  const who = u
    ? `user=${u.email} perfil=${u.perfil} sub=${u.sub}`
    : "user=<sem-jwt>";
  console.log(`[painel-pawards] ${req.method} ${req.originalUrl} ${who}`);

  // Persiste apenas leituras (GET) — endpoints PUT/DELETE de parametros ja tem trilha propria
  // em outras camadas e geram ruido grande aqui. Falha de auditoria nunca bloqueia o request.
  if (req.method === "GET") {
    const ua = req.header("user-agent") ?? null;
    const ip = clientIp(req);
    pool
      .query(
        `INSERT INTO painel_pawards_auditoria
          (usuario_id, email, perfil, metodo, endpoint, ip, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          u?.sub ?? null,
          u?.email ?? null,
          u?.perfil ?? null,
          req.method,
          req.originalUrl,
          ip,
          ua,
        ]
      )
      .catch((err) => console.error("[painel-pawards/auditoria]", err.message));
  }

  next();
});

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
router.get("/global", async (req, res) => {
  try {
    if (!isMaster(req)) { res.status(403).json({ error: 'Acesso restrito ao perfil master' }); return; }
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
router.get("/clinicas/ranking", async (req, res) => {
  try {
    if (!isMaster(req)) { res.status(403).json({ error: 'Acesso restrito ao perfil master' }); return; }
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
// 7) PARMAVAULT — painel das farmácias parceiras (anastomose 9 fechada).
// ===========================================================================

// 7a) Ranking global das farmácias PARMAVAULT (visível ao master).
router.get("/parmavault/farmacias/ranking", async (req, res) => {
  try {
    if (!isMaster(req)) { res.status(403).json({ error: 'Acesso restrito ao perfil master' }); return; }
    const { rows } = await pool.query(`
      SELECT
        f.id, f.nome_fantasia, f.cidade, f.estado, f.percentual_comissao,
        f.meta_receitas_mes, f.meta_valor_mes,
        COALESCE(rec_mes.qtd, 0)::int                       AS receitas_mes,
        COALESCE(rec_mes.valor, 0)::numeric(14,2)           AS valor_mes,
        COALESCE(rec_semana.qtd, 0)::int                    AS receitas_semana,
        COALESCE(rec_hoje.qtd, 0)::int                      AS receitas_hoje,
        COALESCE(comissao_mes.valor, 0)::numeric(14,2)      AS comissao_mes,
        CASE WHEN f.meta_receitas_mes > 0
             THEN ROUND(COALESCE(rec_mes.qtd, 0)::numeric / f.meta_receitas_mes * 100, 1)
             ELSE 0 END                                     AS pct_meta_receitas,
        CASE WHEN f.meta_valor_mes > 0
             THEN ROUND(COALESCE(rec_mes.valor, 0) / f.meta_valor_mes * 100, 1)
             ELSE 0 END                                     AS pct_meta_valor
      FROM farmacias_parmavault f
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS qtd, COALESCE(SUM(valor_formula_real), SUM(valor_formula_estimado)) AS valor
        FROM parmavault_receitas r
        WHERE r.farmacia_id = f.id
          AND r.entregue_em >= date_trunc('month', CURRENT_DATE)
          AND r.status IN ('entregue', 'retirada')
      ) rec_mes ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS qtd
        FROM parmavault_receitas r
        WHERE r.farmacia_id = f.id
          AND r.entregue_em >= date_trunc('week', CURRENT_DATE)
          AND r.status IN ('entregue', 'retirada')
      ) rec_semana ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS qtd
        FROM parmavault_receitas r
        WHERE r.farmacia_id = f.id
          AND r.entregue_em::date = CURRENT_DATE
          AND r.status IN ('entregue', 'retirada')
      ) rec_hoje ON true
      LEFT JOIN LATERAL (
        SELECT SUM(comissao_estimada) AS valor
        FROM parmavault_receitas r
        WHERE r.farmacia_id = f.id
          AND r.entregue_em >= date_trunc('month', CURRENT_DATE)
          AND r.status IN ('entregue', 'retirada')
      ) comissao_mes ON true
      WHERE f.ativo
      ORDER BY valor_mes DESC NULLS LAST
    `);
    res.json(rows);
  } catch (e: any) {
    console.error("[painel-pawards/parmavault/ranking]", e);
    res.status(500).json({ error: e.message });
  }
});

// 7b) Termômetros de uma farmácia específica.
router.get("/parmavault/:farmacia_id/termometros", async (req, res) => {
  if (!isMaster(req)) { res.status(403).json({ error: "Acesso restrito ao perfil master" }); return; }
  const fid = Number(req.params.farmacia_id);
  if (!Number.isFinite(fid)) { res.status(400).json({ error: "farmacia_id inválido" }); return; }
  try {
    const { rows } = await pool.query(
      `
      SELECT
        f.nome_fantasia, f.meta_receitas_semana, f.meta_receitas_mes,
        f.meta_valor_mes, f.percentual_comissao,
        COALESCE((SELECT COUNT(*) FROM parmavault_receitas
          WHERE farmacia_id=$1 AND entregue_em::date = CURRENT_DATE
            AND status IN ('entregue','retirada')), 0)::int AS receitas_hoje,
        COALESCE((SELECT COUNT(*) FROM parmavault_receitas
          WHERE farmacia_id=$1 AND entregue_em >= date_trunc('week', CURRENT_DATE)
            AND status IN ('entregue','retirada')), 0)::int AS receitas_semana,
        COALESCE((SELECT COUNT(*) FROM parmavault_receitas
          WHERE farmacia_id=$1 AND entregue_em >= date_trunc('month', CURRENT_DATE)
            AND status IN ('entregue','retirada')), 0)::int AS receitas_mes,
        COALESCE((SELECT SUM(valor_formula_real) FROM parmavault_receitas
          WHERE farmacia_id=$1 AND entregue_em >= date_trunc('month', CURRENT_DATE)
            AND status IN ('entregue','retirada')), 0)::numeric(14,2) AS valor_mes,
        COALESCE((SELECT AVG(valor_formula_real) FROM parmavault_receitas
          WHERE farmacia_id=$1 AND entregue_em >= CURRENT_DATE - INTERVAL '7 days'
            AND status IN ('entregue','retirada')), 0)::numeric(10,2) AS ticket_medio_semana,
        COALESCE((SELECT SUM(comissao_estimada) FROM parmavault_receitas
          WHERE farmacia_id=$1 AND entregue_em >= date_trunc('month', CURRENT_DATE)
            AND status IN ('entregue','retirada')), 0)::numeric(14,2) AS comissao_mes
      FROM farmacias_parmavault f WHERE f.id = $1
    `,
      [fid]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Farmácia não encontrada" });
    const r = rows[0];
    const pct_meta = r.meta_receitas_mes > 0
      ? Math.round((r.receitas_mes / r.meta_receitas_mes) * 100)
      : 0;
    const pct_valor = r.meta_valor_mes > 0
      ? Math.round((Number(r.valor_mes) / Number(r.meta_valor_mes)) * 100)
      : 0;
    const falta_meta = Math.max(0, r.meta_receitas_mes - r.receitas_mes);
    res.json({
      ...r,
      pct_meta,
      pct_valor,
      falta_meta,
      vai_bater: pct_meta >= 80,
      alerta: pct_meta < 50,
      banda: pct_meta >= 100 ? "excelente"
           : pct_meta >= 80 ? "boa"
           : pct_meta >= 50 ? "atencao"
           : "critica",
    });
  } catch (e: any) {
    console.error("[painel-pawards/parmavault/termometros]", e);
    res.status(500).json({ error: e.message });
  }
});

// 7c) Série diária da farmácia (últimos 30 dias) — pra gráfico de linha.
router.get("/parmavault/:farmacia_id/trend", async (req, res) => {
  if (!isMaster(req)) { res.status(403).json({ error: "Acesso restrito ao perfil master" }); return; }
  const fid = Number(req.params.farmacia_id);
  if (!Number.isFinite(fid)) { res.status(400).json({ error: "farmacia_id inválido" }); return; }
  try {
    const { rows } = await pool.query(
      `
      SELECT
        d::date AS data,
        COALESCE(COUNT(r.id) FILTER (WHERE r.status IN ('entregue','retirada')), 0)::int AS receitas,
        COALESCE(SUM(r.valor_formula_real) FILTER (WHERE r.status IN ('entregue','retirada')), 0)::numeric(14,2) AS valor,
        COALESCE(SUM(r.comissao_estimada) FILTER (WHERE r.status IN ('entregue','retirada')), 0)::numeric(14,2) AS comissao
      FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, INTERVAL '1 day') AS d
      LEFT JOIN parmavault_receitas r
        ON r.farmacia_id = $1 AND r.entregue_em::date = d::date
      GROUP BY d ORDER BY d
    `,
      [fid]
    );
    res.json(rows);
  } catch (e: any) {
    console.error("[painel-pawards/parmavault/trend]", e);
    res.status(500).json({ error: e.message });
  }
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
// Aceita PUT (legado) e PATCH (UI admin) — mesmo handler.
router.patch("/metas-faturamento/:unidade_id", (req, res) => metasFaturamentoHandler(req, res));
router.put("/metas-faturamento/:unidade_id", (req, res) => metasFaturamentoHandler(req, res));
async function metasFaturamentoHandler(req: any, res: any) {
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
}

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
// 11A) AGENDA HOJE — consultas do dia (real se houver, fallback sintético determinístico)
// ===========================================================================
router.get("/agenda-hoje", async (req, res) => {
  try {
    if (!isMaster(req)) { res.status(403).json({ error: 'Acesso restrito ao perfil master' }); return; }
    // Tenta tabela real primeiro
    const real = await pool.query(`
      SELECT
        a.id,
        a.hora_inicio AS horario,
        a.tipo_procedimento AS procedimento,
        a.status,
        COALESCE(p.nome, 'Paciente') AS paciente,
        a.paciente_id,
        COALESCE(u.nome, 'Profissional') AS profissional,
        COALESCE(un.nick, un.nome, '—') AS unidade,
        un.id AS unidade_id
      FROM appointments a
      LEFT JOIN pacientes  p  ON p.id  = a.paciente_id
      LEFT JOIN usuarios   u  ON u.id  = a.profissional_id
      LEFT JOIN unidades   un ON un.id = a.unidade_id
      WHERE a.data = CURRENT_DATE
      ORDER BY a.hora_inicio ASC, un.nome ASC
      LIMIT 80
    `).catch(() => ({ rows: [] as any[] }));

    if (real.rows.length > 0) {
      res.json({ origem: "real", consultas: real.rows });
      return;
    }

    // Fallback sintético: gera N slots por clínica usando consultas_agendadas de hoje
    // (ou estimativa default 12) e atribui pacientes reais da clínica.
    const sintetico = await pool.query(`
      WITH base AS (
        SELECT
          un.id AS unidade_id,
          COALESCE(un.nick, un.nome) AS unidade,
          COALESCE(
            (SELECT consultas_agendadas FROM faturamento_diario
              WHERE unidade_id = un.id AND data = CURRENT_DATE LIMIT 1),
            12
          ) AS slots
        FROM unidades un
        WHERE un.fat_meta_mensal > 0
      ),
      pacientes_por_unidade AS (
        SELECT
          p.id, p.nome, p.unidade_id,
          ROW_NUMBER() OVER (PARTITION BY p.unidade_id ORDER BY p.id) AS rn
        FROM pacientes p
        WHERE p.status_ativo = true
      ),
      profissionais_por_unidade AS (
        SELECT
          u.id, u.nome, u.unidade_id, u.especialidade,
          ROW_NUMBER() OVER (PARTITION BY u.unidade_id ORDER BY u.id) AS rn
        FROM usuarios u
        WHERE u.unidade_id IS NOT NULL
      )
      SELECT
        (b.unidade_id * 1000 + s.slot) AS id,
        TO_CHAR((TIME '08:00' + (s.slot * INTERVAL '40 min')), 'HH24:MI') AS horario,
        CASE (s.slot % 4)
          WHEN 0 THEN 'Consulta'
          WHEN 1 THEN 'Retorno'
          WHEN 2 THEN 'Avaliação'
          ELSE        'Procedimento'
        END AS procedimento,
        CASE (s.slot % 5)
          WHEN 4 THEN 'aguardando'
          WHEN 3 THEN 'em_atendimento'
          WHEN 2 THEN 'concluido'
          ELSE        'agendado'
        END AS status,
        COALESCE(pu.nome, 'Paciente ' || s.slot) AS paciente,
        pu.id AS paciente_id,
        COALESCE(pp.nome, 'Profissional') AS profissional,
        b.unidade,
        b.unidade_id
      FROM base b
      CROSS JOIN LATERAL generate_series(0, LEAST(b.slots, 14) - 1) AS s(slot)
      LEFT JOIN pacientes_por_unidade pu
             ON pu.unidade_id = b.unidade_id
            AND pu.rn = ((s.slot % 50) + 1)
      LEFT JOIN profissionais_por_unidade pp
             ON pp.unidade_id = b.unidade_id
            AND pp.rn = ((s.slot % 4) + 1)
      ORDER BY horario ASC, b.unidade ASC
      LIMIT 80
    `);
    res.json({ origem: "sintetico", consultas: sintetico.rows });
  } catch (e: any) {
    console.error("[painel-pawards/agenda-hoje]", e);
    res.status(500).json({ error: e.message });
  }
});

// ===========================================================================
// 11A.1) AGENDA HOJE — resumo rápido por paciente (popover na linha da agenda)
// ===========================================================================
router.get("/agenda-hoje/paciente-resumo/:id", async (req, res) => {
  try {
    if (!isMaster(req)) { res.status(403).json({ error: 'Acesso restrito ao perfil master' }); return; }
    const pacienteId = Number(req.params.id);
    if (!Number.isFinite(pacienteId) || pacienteId <= 0) {
      res.status(400).json({ error: "paciente_id invalido" });
      return;
    }

    const dadosPaciente = await pool.query(
      `SELECT id, nome, alergias, condicoes_clinicas, medicamentos_continuos, gestante
         FROM pacientes
        WHERE id = $1
        LIMIT 1`,
      [pacienteId],
    );
    if (dadosPaciente.rows.length === 0) {
      res.status(404).json({ error: "paciente nao encontrado" });
      return;
    }
    const p = dadosPaciente.rows[0];

    interface ConsultaResumoRow {
      data: string;
      hora_inicio: string;
      tipo_procedimento: string | null;
      status: string | null;
      unidade: string | null;
    }
    const ultima = await pool.query<ConsultaResumoRow>(
      `SELECT a.data, a.hora_inicio, a.tipo_procedimento, a.status,
              COALESCE(un.nick, un.nome) AS unidade
         FROM appointments a
         LEFT JOIN unidades un ON un.id = a.unidade_id
        WHERE a.paciente_id = $1
          AND (a.data::date < CURRENT_DATE
               OR (a.data::date = CURRENT_DATE AND a.status IN ('concluido','cancelado')))
        ORDER BY a.data::date DESC, a.hora_inicio DESC
        LIMIT 1`,
      [pacienteId],
    );

    const proxima = await pool.query<ConsultaResumoRow>(
      `SELECT a.data, a.hora_inicio, a.tipo_procedimento, a.status,
              COALESCE(un.nick, un.nome) AS unidade
         FROM appointments a
         LEFT JOIN unidades un ON un.id = a.unidade_id
        WHERE a.paciente_id = $1
          AND a.status NOT IN ('concluido','cancelado')
          AND (a.data::date > CURRENT_DATE
               OR (a.data::date = CURRENT_DATE AND a.hora_inicio > TO_CHAR(now(), 'HH24:MI')))
        ORDER BY a.data::date ASC, a.hora_inicio ASC
        LIMIT 1`,
      [pacienteId],
    );

    interface FinanceiroResumoRow {
      pendentes: number;
      total_pendente: string | number;
      pendente_mais_antigo: string | Date | null;
    }
    const financeiro = await pool.query<FinanceiroResumoRow>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'pendente')::int          AS pendentes,
         COALESCE(SUM(valor) FILTER (WHERE status = 'pendente'), 0)::numeric AS total_pendente,
         MIN(criado_em) FILTER (WHERE status = 'pendente')         AS pendente_mais_antigo
       FROM pagamentos
      WHERE paciente_id = $1`,
      [pacienteId],
    );

    const fin = financeiro.rows[0] ?? { pendentes: 0, total_pendente: 0, pendente_mais_antigo: null };
    const pendentes = Number(fin.pendentes ?? 0);
    const totalPendente = Number(fin.total_pendente ?? 0);
    let statusFinanceiro: "em_dia" | "pendente" | "atrasado" = "em_dia";
    if (pendentes > 0) {
      statusFinanceiro = "pendente";
      if (fin.pendente_mais_antigo) {
        const diasAtraso = Math.floor(
          (Date.now() - new Date(fin.pendente_mais_antigo as string).getTime()) / 86_400_000,
        );
        if (diasAtraso >= 7) statusFinanceiro = "atrasado";
      }
    }

    res.json({
      paciente_id: p.id,
      paciente_nome: p.nome,
      alergias: p.alergias ?? null,
      condicoes_clinicas: p.condicoes_clinicas ?? null,
      medicamentos_continuos: p.medicamentos_continuos ?? null,
      gestante: p.gestante ?? null,
      ultima_consulta: ultima.rows[0] ?? null,
      proxima_consulta: proxima.rows[0] ?? null,
      financeiro: {
        status: statusFinanceiro,
        pendentes,
        total_pendente: totalPendente,
      },
    });
  } catch (e: any) {
    console.error("[painel-pawards/agenda-hoje/paciente-resumo]", e);
    res.status(500).json({ error: e.message });
  }
});

// ===========================================================================
// 11B) ALERTAS — clínicas abaixo do mínimo, KPIs fora da faixa
// ===========================================================================
router.get("/alertas", async (req, res) => {
  try {
    if (!isMaster(req)) { res.status(403).json({ error: 'Acesso restrito ao perfil master' }); return; }
    // 1) Clínicas abaixo do mínimo no mês
    const abaixoMin = await pool.query(`
      SELECT
        u.id, COALESCE(u.nick, u.nome) AS unidade,
        u.fat_minimo_mensal::numeric AS minimo,
        COALESCE(SUM(fd.valor_realizado), 0)::numeric AS realizado,
        ROUND(
          COALESCE(SUM(fd.valor_realizado), 0) / NULLIF(u.fat_minimo_mensal, 0) * 100, 1
        ) AS pct_minimo
      FROM unidades u
      LEFT JOIN faturamento_diario fd ON fd.unidade_id = u.id
        AND fd.data >= date_trunc('month', CURRENT_DATE)
      WHERE u.fat_minimo_mensal > 0
      GROUP BY u.id
      HAVING COALESCE(SUM(fd.valor_realizado), 0) < u.fat_minimo_mensal
      ORDER BY pct_minimo ASC
    `);

    // 2) KPIs fora da faixa: ocupação ou NPS abaixo do faixa_baixa_max do parâmetro global
    const kpiOcupacao = await pool.query(`
      SELECT
        u.id, COALESCE(u.nick, u.nome) AS unidade,
        ROUND(COALESCE(AVG(fd.taxa_ocupacao), 0)::numeric, 1) AS valor,
        (SELECT faixa_baixa_max FROM parametros_referencia_global WHERE codigo='OCUPACAO') AS limite,
        'OCUPACAO' AS kpi, 'Taxa de ocupação baixa' AS label, '%' AS unidade_medida
      FROM unidades u
      LEFT JOIN faturamento_diario fd ON fd.unidade_id = u.id
        AND fd.data >= date_trunc('month', CURRENT_DATE)
      WHERE u.fat_meta_mensal > 0
      GROUP BY u.id
      HAVING COALESCE(AVG(fd.taxa_ocupacao), 0) <
             (SELECT faixa_baixa_max FROM parametros_referencia_global WHERE codigo='OCUPACAO')
    `);

    const kpiNps = await pool.query(`
      SELECT
        u.id, COALESCE(u.nick, u.nome) AS unidade,
        ROUND(COALESCE(AVG(fd.nps), 0)::numeric, 1) AS valor,
        (SELECT faixa_baixa_max FROM parametros_referencia_global WHERE codigo='NPS') AS limite,
        'NPS' AS kpi, 'NPS abaixo do esperado' AS label, 'pts' AS unidade_medida
      FROM unidades u
      LEFT JOIN faturamento_diario fd ON fd.unidade_id = u.id
        AND fd.data >= date_trunc('month', CURRENT_DATE)
      WHERE u.fat_meta_mensal > 0
      GROUP BY u.id
      HAVING COALESCE(AVG(fd.nps), 0) <
             (SELECT faixa_baixa_max FROM parametros_referencia_global WHERE codigo='NPS')
    `);

    // 3) Anastomoses abertas (proxy de "exames vencidos / pendências")
    const anastomoses = await pool.query(`
      SELECT id, modulo, criticidade, titulo
      FROM anastomoses_pendentes
      WHERE status = 'aberta'
      ORDER BY
        CASE criticidade WHEN 'critica' THEN 1 WHEN 'alta' THEN 2 WHEN 'media' THEN 3 ELSE 4 END,
        criado_em DESC
      LIMIT 6
    `).catch(() => ({ rows: [] as any[] }));

    res.json({
      clinicas_abaixo_minimo: abaixoMin.rows,
      kpis_fora_faixa: [...kpiOcupacao.rows, ...kpiNps.rows],
      pendencias: anastomoses.rows,
      total: abaixoMin.rows.length + kpiOcupacao.rows.length + kpiNps.rows.length + anastomoses.rows.length,
    });
  } catch (e: any) {
    console.error("[painel-pawards/alertas]", e);
    res.status(500).json({ error: e.message });
  }
});

// ===========================================================================
// 11C) FLUXO DE CAIXA 30d — entradas reais (faturamento_diario) vs saídas
// reais (contas_a_pagar pagas). Task #25: trocamos a heurística antiga
// (0.58 * entradas + comissao_magistral_estimada) por dados de pagamento
// efetivo registrados pelo módulo financeiro / contas a pagar (migration
// 050_contas_a_pagar_saidas_reais.sql).
// ===========================================================================
router.get("/caixa-30d", async (req, res) => {
  try {
    if (!isMaster(req)) { res.status(403).json({ error: 'Acesso restrito ao perfil master' }); return; }

    // 1) Entradas reais por dia (faturamento_diario).
    const entradasQ = await pool.query(`
      SELECT data::date AS data, SUM(valor_realizado)::numeric AS entradas
      FROM faturamento_diario
      WHERE data >= CURRENT_DATE - INTERVAL '30 days'
        AND data <= CURRENT_DATE
      GROUP BY data
      ORDER BY data ASC
    `);

    // 2) Saídas REAIS por dia, vindas de contas_a_pagar pagas na janela.
    // Considera apenas linhas com data_pagamento NOT NULL (pago de fato),
    // status='pago' e nao arquivadas. Fallback gracioso: se a tabela nao
    // existir ainda por algum motivo (migration 050 nao aplicada),
    // retorna saidas=0 ao inves de quebrar o card.
    let saidasRows: { data: string; saidas: string; folha: string; magistral: string; operacional: string; outros: string }[] = [];
    try {
      const saidasQ = await pool.query(`
        SELECT
          data_pagamento::date AS data,
          SUM(valor_brl)::numeric AS saidas,
          SUM(CASE WHEN categoria = 'folha'       THEN valor_brl ELSE 0 END)::numeric AS folha,
          SUM(CASE WHEN categoria = 'magistral'   THEN valor_brl ELSE 0 END)::numeric AS magistral,
          SUM(CASE WHEN categoria = 'operacional' THEN valor_brl ELSE 0 END)::numeric AS operacional,
          SUM(CASE WHEN categoria = 'outros'      THEN valor_brl ELSE 0 END)::numeric AS outros
        FROM contas_a_pagar
        WHERE data_pagamento IS NOT NULL
          AND status = 'pago'
          AND arquivado_em IS NULL
          AND data_pagamento >= CURRENT_DATE - INTERVAL '30 days'
          AND data_pagamento <= CURRENT_DATE
        GROUP BY data_pagamento
        ORDER BY data_pagamento ASC
      `);
      saidasRows = saidasQ.rows;
    } catch (err: any) {
      // Fallback estreito: SO engole "undefined_table" (Postgres 42P01),
      // que ocorre quando a migration 050 ainda nao foi aplicada num
      // ambiente. Qualquer outro erro (conexao, sintaxe, permissao) e
      // re-lancado pra nao mascarar problema operacional retornando R$ 0
      // como se fosse dado real.
      if (err?.code === "42P01") {
        console.warn("[caixa-30d] contas_a_pagar nao existe (migration 050 pendente), saidas=0");
      } else {
        throw err;
      }
    }

    // 3) Merge por data. Usamos um Map data->{entradas,saidas,...} pra
    // garantir que dias com so entrada ou so saida apareçam no grafico.
    type Ponto = {
      data: string;
      entradas: number;
      saidas: number;
      folha: number;
      magistral: number;
      operacional: number;
      outros: number;
    };
    const mapa = new Map<string, Ponto>();
    const chave = (d: any) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));
    for (const r of entradasQ.rows) {
      const k = chave(r.data);
      mapa.set(k, { data: k, entradas: Number(r.entradas), saidas: 0, folha: 0, magistral: 0, operacional: 0, outros: 0 });
    }
    for (const r of saidasRows) {
      const k = chave(r.data);
      const atual = mapa.get(k) ?? { data: k, entradas: 0, saidas: 0, folha: 0, magistral: 0, operacional: 0, outros: 0 };
      atual.saidas = Number(r.saidas);
      atual.folha = Number(r.folha);
      atual.magistral = Number(r.magistral);
      atual.operacional = Number(r.operacional);
      atual.outros = Number(r.outros);
      mapa.set(k, atual);
    }
    const pontos = Array.from(mapa.values()).sort((a, b) => a.data.localeCompare(b.data));

    const total_entradas = pontos.reduce((a, p) => a + p.entradas, 0);
    const total_saidas = pontos.reduce((a, p) => a + p.saidas, 0);
    const breakdown = {
      folha: pontos.reduce((a, p) => a + p.folha, 0),
      magistral: pontos.reduce((a, p) => a + p.magistral, 0),
      operacional: pontos.reduce((a, p) => a + p.operacional, 0),
      outros: pontos.reduce((a, p) => a + p.outros, 0),
    };

    res.json({
      pontos,
      total_entradas: Number(total_entradas.toFixed(2)),
      total_saidas: Number(total_saidas.toFixed(2)),
      saldo: Number((total_entradas - total_saidas).toFixed(2)),
      breakdown: {
        folha: Number(breakdown.folha.toFixed(2)),
        magistral: Number(breakdown.magistral.toFixed(2)),
        operacional: Number(breakdown.operacional.toFixed(2)),
        outros: Number(breakdown.outros.toFixed(2)),
      },
      // origem='real' indica que as saidas vem de contas_a_pagar pagas
      // (mesmo que zero, e dado real, nao mais a heuristica 0.58).
      origem_saidas: "real",
      legenda_saidas: "folha + custos magistrais pagos + despesas operacionais",
    });
  } catch (e: any) {
    console.error("[painel-pawards/caixa-30d]", e);
    res.status(500).json({ error: e.message });
  }
});

// ===========================================================================
// 11D) CONCILIACAO MAGISTRAL — Task #227
// Lista por unidade e periodo o custo magistral ESTIMADO (vindo de
// faturamento_diario.comissao_magistral_estimada) versus o que ja foi
// REGISTRADO como pago em contas_a_pagar (categoria='magistral',
// status='pago'). Permite confirmar a nota da manipuladora gerando
// uma linha real em contas_a_pagar (POST /confirmar) — assim o card
// "Fluxo de Caixa 30d" passa a refletir o custo real, nao mais a
// estimativa antiga 0.58 nem zero.
//
// Periodos sao mensais (date_trunc('month', data)) por padrao, que e a
// granularidade de fechamento usual com a manipuladora.
// ===========================================================================
router.get("/conciliacao-magistral", async (req, res) => {
  try {
    if (!isMaster(req)) { res.status(403).json({ error: 'Acesso restrito ao perfil master' }); return; }

    // Janela: padrao = ultimos 6 meses fechados + mes corrente.
    const inicio = req.query.inicio
      ? String(req.query.inicio)
      : null;
    const fim = req.query.fim ? String(req.query.fim) : null;
    const unidadeId = unidadeIdParam(req);

    const params: any[] = [];
    const whereFat: string[] = [];
    if (inicio) { params.push(inicio); whereFat.push(`data >= $${params.length}::date`); }
    if (fim)    { params.push(fim);    whereFat.push(`data <= $${params.length}::date`); }
    if (!inicio && !fim) {
      whereFat.push(`data >= (date_trunc('month', CURRENT_DATE) - INTERVAL '6 months')::date`);
    }
    if (unidadeId !== null) { params.push(unidadeId); whereFat.push(`unidade_id = $${params.length}`); }

    // 1) Estimado por (unidade, mes) a partir de faturamento_diario.
    const estimQ = await pool.query(`
      SELECT
        fd.unidade_id,
        u.nome AS unidade_nome,
        date_trunc('month', fd.data)::date AS periodo_inicio,
        (date_trunc('month', fd.data) + INTERVAL '1 month - 1 day')::date AS periodo_fim,
        SUM(fd.comissao_magistral_estimada)::numeric AS estimado,
        SUM(fd.receitas_fama_count)::int AS receitas_count
      FROM faturamento_diario fd
      LEFT JOIN unidades u ON u.id = fd.unidade_id
      ${whereFat.length ? `WHERE ${whereFat.join(' AND ')}` : ''}
      GROUP BY fd.unidade_id, u.nome, date_trunc('month', fd.data)
      ORDER BY periodo_inicio DESC, u.nome ASC
    `, params);

    // 2) Pago real por (unidade, COMPETENCIA) em contas_a_pagar.
    // IMPORTANTE: agregamos por mes da COMPETENCIA (data_vencimento), nao
    // pela data_pagamento. Razao: uma nota da competencia abril paga em
    // maio precisa abater o estimado de abril (e nao virar excedente em
    // maio). O POST /confirmar grava data_vencimento = periodo_fim, entao
    // date_trunc('month', data_vencimento) reconstroi a competencia.
    // O caixa-30d continua usando data_pagamento (timing real do caixa),
    // que e a chave correta pra fluxo de caixa — sao usos distintos.
    // Fallback gracioso se a tabela ainda nao existir.
    let pagosRows: { unidade_id: number | null; periodo_inicio: string; pago: string; lancamentos: number }[] = [];
    try {
      const paramsP: any[] = [];
      const wherePag: string[] = [
        `categoria = 'magistral'`,
        `status = 'pago'`,
        `arquivado_em IS NULL`,
        `data_vencimento IS NOT NULL`,
      ];
      if (inicio) { paramsP.push(inicio); wherePag.push(`data_vencimento >= $${paramsP.length}::date`); }
      if (fim)    { paramsP.push(fim);    wherePag.push(`data_vencimento <= $${paramsP.length}::date`); }
      if (!inicio && !fim) {
        wherePag.push(`data_vencimento >= (date_trunc('month', CURRENT_DATE) - INTERVAL '6 months')::date`);
      }
      if (unidadeId !== null) { paramsP.push(unidadeId); wherePag.push(`unidade_id = $${paramsP.length}`); }

      const pagosQ = await pool.query(`
        SELECT
          unidade_id,
          date_trunc('month', data_vencimento)::date AS periodo_inicio,
          SUM(valor_brl)::numeric AS pago,
          COUNT(*)::int AS lancamentos
        FROM contas_a_pagar
        WHERE ${wherePag.join(' AND ')}
        GROUP BY unidade_id, date_trunc('month', data_vencimento)
      `, paramsP);
      pagosRows = pagosQ.rows;
    } catch (err: any) {
      if (err?.code === "42P01") {
        console.warn("[conciliacao-magistral] contas_a_pagar nao existe (migration 050 pendente)");
      } else {
        throw err;
      }
    }

    // 3) Merge — chave (unidade_id, periodo_inicio). Inclui linhas
    // SOMENTE pagas (sem estimado correspondente) pra surfar anomalias
    // (pagamentos sem registro de receita estimada na competencia).
    const chave = (uid: any, d: any) => `${uid ?? 'null'}::${d instanceof Date ? d.toISOString().slice(0,10) : String(d).slice(0,10)}`;
    const isoDate = (d: any) => d instanceof Date ? d.toISOString().slice(0,10) : String(d).slice(0,10);
    const fimDoMes = (iniIso: string) => {
      // iniIso = YYYY-MM-01
      const [y, m] = iniIso.split('-').map((x) => Number(x));
      const ult = new Date(Date.UTC(y, m, 0));
      return ult.toISOString().slice(0,10);
    };

    type LinhaAgg = {
      unidade_id: number | null;
      unidade_nome: string | null;
      periodo_inicio: string;
      periodo_fim: string;
      receitas_count: number;
      estimado: number;
      pago: number;
      lancamentos: number;
    };
    const agg = new Map<string, LinhaAgg>();
    for (const r of estimQ.rows as any[]) {
      const ini = isoDate(r.periodo_inicio);
      const k = chave(r.unidade_id, ini);
      agg.set(k, {
        unidade_id: r.unidade_id ?? null,
        unidade_nome: r.unidade_nome ?? null,
        periodo_inicio: ini,
        periodo_fim: isoDate(r.periodo_fim),
        receitas_count: Number(r.receitas_count) || 0,
        estimado: Number(r.estimado),
        pago: 0,
        lancamentos: 0,
      });
    }

    // Resolve nomes das unidades que aparecem so no lado pago, em batch.
    const unidadesPagasSemEstim = new Set<number>();
    for (const r of pagosRows) {
      const ini = isoDate(r.periodo_inicio);
      const k = chave(r.unidade_id, ini);
      if (!agg.has(k) && r.unidade_id !== null) unidadesPagasSemEstim.add(Number(r.unidade_id));
    }
    let nomesUnidade = new Map<number, string>();
    if (unidadesPagasSemEstim.size > 0) {
      const ids = Array.from(unidadesPagasSemEstim);
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
      const nomeQ = await pool.query(
        `SELECT id, nome FROM unidades WHERE id IN (${placeholders})`,
        ids,
      );
      for (const u of nomeQ.rows) nomesUnidade.set(Number(u.id), u.nome);
    }

    for (const r of pagosRows) {
      const ini = isoDate(r.periodo_inicio);
      const k = chave(r.unidade_id, ini);
      const existente = agg.get(k);
      if (existente) {
        existente.pago = Number(r.pago);
        existente.lancamentos = Number(r.lancamentos);
      } else {
        agg.set(k, {
          unidade_id: r.unidade_id,
          unidade_nome: r.unidade_id !== null ? (nomesUnidade.get(Number(r.unidade_id)) ?? null) : null,
          periodo_inicio: ini,
          periodo_fim: fimDoMes(ini),
          receitas_count: 0,
          estimado: 0,
          pago: Number(r.pago),
          lancamentos: Number(r.lancamentos),
        });
      }
    }

    const linhas = Array.from(agg.values())
      .map((l) => {
        const pendente = Number((l.estimado - l.pago).toFixed(2));
        let status_conciliacao: 'pendente' | 'parcial' | 'conciliado' | 'excedido';
        if (l.pago === 0 && l.estimado > 0) status_conciliacao = 'pendente';
        else if (Math.abs(pendente) < 0.01) status_conciliacao = 'conciliado';
        else if (pendente > 0)              status_conciliacao = 'parcial';
        else                                 status_conciliacao = 'excedido';
        return {
          unidade_id: l.unidade_id,
          unidade_nome: l.unidade_nome,
          periodo_inicio: l.periodo_inicio,
          periodo_fim: l.periodo_fim,
          receitas_count: l.receitas_count,
          estimado: Number(l.estimado.toFixed(2)),
          pago: Number(l.pago.toFixed(2)),
          pendente,
          lancamentos: l.lancamentos,
          status_conciliacao,
        };
      })
      .sort((a, b) => {
        if (a.periodo_inicio !== b.periodo_inicio) return a.periodo_inicio < b.periodo_inicio ? 1 : -1;
        return (a.unidade_nome ?? '').localeCompare(b.unidade_nome ?? '');
      });

    res.json({
      linhas,
      total_estimado: Number(linhas.reduce((a, l) => a + l.estimado, 0).toFixed(2)),
      total_pago:     Number(linhas.reduce((a, l) => a + l.pago, 0).toFixed(2)),
      total_pendente: Number(linhas.reduce((a, l) => a + l.pendente, 0).toFixed(2)),
    });
  } catch (e: any) {
    console.error("[painel-pawards/conciliacao-magistral]", e);
    res.status(500).json({ error: e.message });
  }
});

// POST /conciliacao-magistral/confirmar
// Body: { unidade_id, periodo_inicio (YYYY-MM-DD), periodo_fim (YYYY-MM-DD),
//         valor_real, fornecedor?, descricao?, data_pagamento? (default hoje),
//         observacao? }
// Cria 1 linha em contas_a_pagar (categoria='magistral', status='pago').
// Idempotencia leve: rejeita se ja existir lancamento magistral pago no
// mesmo (unidade_id, mes da data_pagamento) com a mesma descricao — pra
// o usuario nao confirmar a mesma nota duas vezes por engano. Pode ser
// forcado via { permitir_duplicado: true }.
router.post("/conciliacao-magistral/confirmar", async (req: AuthedRequest, res) => {
  try {
    if (!isMaster(req)) { res.status(403).json({ error: 'Acesso restrito ao perfil master' }); return; }

    const {
      unidade_id,
      periodo_inicio,
      periodo_fim,
      valor_real,
      fornecedor,
      descricao,
      data_pagamento,
      observacao,
      permitir_duplicado,
    } = req.body ?? {};

    const uid = unidade_id !== undefined && unidade_id !== null ? Number(unidade_id) : null;
    const valor = Number(valor_real);
    if (!Number.isFinite(valor) || valor < 0) {
      res.status(400).json({ error: "valor_real obrigatorio e deve ser >= 0" });
      return;
    }
    if (!periodo_inicio || !periodo_fim) {
      res.status(400).json({ error: "periodo_inicio e periodo_fim obrigatorios (YYYY-MM-DD)" });
      return;
    }

    const dataPag = data_pagamento ? String(data_pagamento) : new Date().toISOString().slice(0, 10);
    const desc = descricao && String(descricao).trim().length > 0
      ? String(descricao).trim()
      : `Custo magistral pago — competencia ${periodo_inicio} a ${periodo_fim}`;
    const forn = fornecedor ? String(fornecedor).trim() : null;
    const obs  = observacao ? String(observacao).trim() : null;

    if (!permitir_duplicado) {
      // Idempotencia por COMPETENCIA: usa data_vencimento (que o POST
      // grava = periodo_fim) pra detectar duplicata na mesma competencia,
      // independente de quando o pagamento foi feito. Combina com
      // descricao OU fornecedor pra discriminar notas distintas da mesma
      // manipuladora num mesmo mes.
      const dup = await pool.query(
        `SELECT id FROM contas_a_pagar
         WHERE categoria = 'magistral'
           AND status = 'pago'
           AND arquivado_em IS NULL
           AND ((unidade_id IS NULL AND $1::int IS NULL) OR unidade_id = $1::int)
           AND date_trunc('month', data_vencimento) = date_trunc('month', $2::date)
           AND (descricao = $3 OR (fornecedor IS NOT NULL AND fornecedor = $4))
         LIMIT 1`,
        [uid, periodo_fim, desc, forn],
      );
      if (dup.rows.length > 0) {
        res.status(409).json({
          error: "Lancamento magistral ja registrado pra essa competencia/descricao/fornecedor",
          existente_id: dup.rows[0].id,
          dica: "Envie permitir_duplicado: true pra forcar",
        });
        return;
      }
    }

    const ins = await pool.query(
      `INSERT INTO contas_a_pagar
         (unidade_id, categoria, descricao, valor_brl, data_vencimento,
          data_pagamento, status, fornecedor, observacao, origem, versao_schema)
       VALUES ($1, 'magistral', $2, $3, $4::date, $5::date, 'pago', $6, $7,
               'conciliacao_magistral', 'v1')
       RETURNING id, unidade_id, categoria, descricao, valor_brl::numeric AS valor_brl,
                 data_vencimento, data_pagamento, status, fornecedor, observacao,
                 origem, created_at`,
      [uid, desc, valor.toFixed(2), periodo_fim, dataPag, forn, obs],
    );

    res.status(201).json({ ok: true, lancamento: ins.rows[0] });
  } catch (e: any) {
    if (e?.code === "42P01") {
      res.status(503).json({ error: "Tabela contas_a_pagar ausente — migration 050 pendente" });
      return;
    }
    console.error("[painel-pawards/conciliacao-magistral/confirmar]", e);
    res.status(500).json({ error: e.message });
  }
});

// ===========================================================================
// 11) BLENDS com valor — preview pra prescritor
// ===========================================================================
router.get("/blends/precificados", async (req, res) => {
  try {
    if (!isMaster(req)) { res.status(403).json({ error: 'Acesso restrito ao perfil master' }); return; }
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

// ===========================================================================
// 12) AUDITORIA — trilha de acessos ao Painel PAWARDS (master only)
// ===========================================================================
// Escapa um campo CSV conforme RFC 4180: envolve em aspas se contiver
// vírgula, aspas, quebra de linha ou ponto-e-vírgula; aspas duplas
// internas viram "" (escape padrão).
function csvField(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",;\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

router.get("/auditoria/acessos", async (req, res) => {
  try {
    if (!isMaster(req)) { res.status(403).json({ error: 'Acesso restrito ao perfil master' }); return; }
    const formato = typeof req.query.formato === "string" ? req.query.formato.toLowerCase() : "json";
    const isCsv = formato === "csv";
    const limit = Math.min(Math.max(Number(req.query.limit ?? 100) || 100, 1), 500);
    const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0);
    const usuarioId = req.query.usuario_id ? Number(req.query.usuario_id) : null;
    const desde = typeof req.query.desde === "string" ? req.query.desde : null;
    const endpointFiltro = typeof req.query.endpoint === "string" ? req.query.endpoint.trim() : "";
    const metodoFiltroRaw = typeof req.query.metodo === "string" ? req.query.metodo.trim().toUpperCase() : "";
    const METODOS_VALIDOS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
    const metodoFiltro = METODOS_VALIDOS.has(metodoFiltroRaw) ? metodoFiltroRaw : "";

    const where: string[] = [];
    const params: (string | number)[] = [];
    if (usuarioId && Number.isFinite(usuarioId)) {
      params.push(usuarioId);
      where.push(`usuario_id = $${params.length}`);
    }
    if (desde) {
      params.push(desde);
      where.push(`acessado_em >= $${params.length}::timestamptz`);
    }
    if (endpointFiltro) {
      params.push(`%${endpointFiltro}%`);
      where.push(`endpoint ILIKE $${params.length}`);
    }
    if (metodoFiltro) {
      params.push(metodoFiltro);
      where.push(`metodo = $${params.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    if (isCsv) {
      // Export CSV — respeita filtros, ignora paginação e devolve TODAS as
      // linhas do filtro (sem LIMIT). Streamado via cursor pra não estourar
      // memória mesmo com filtro vazio.
      const hoje = new Date().toISOString().slice(0, 10);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="auditoria-acessos-${hoje}.csv"`,
      );
      // BOM UTF-8 pra Excel abrir acentos corretamente. Header usa exatamente
      // os nomes pedidos no Done looks like (com hífen em "user-agent" e
      // acento em "método").
      res.write("\uFEFF");
      res.write("quando,email,perfil,método,endpoint,ip,user-agent\r\n");

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const cursorName = `aud_csv_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
        await client.query(
          `DECLARE ${cursorName} NO SCROLL CURSOR FOR
             SELECT acessado_em, email, perfil, metodo, endpoint, ip, user_agent
             FROM painel_pawards_auditoria
             ${whereSql}
             ORDER BY acessado_em DESC`,
          params,
        );
        // Lê em lotes pra streamar sem carregar tudo em memória.
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { rows } = await client.query(`FETCH 1000 FROM ${cursorName}`);
          if (rows.length === 0) break;
          for (const r of rows) {
            const quando = r.acessado_em instanceof Date
              ? r.acessado_em.toISOString()
              : String(r.acessado_em ?? "");
            res.write([
              csvField(quando),
              csvField(r.email),
              csvField(r.perfil),
              csvField(r.metodo),
              csvField(r.endpoint),
              csvField(r.ip),
              csvField(r.user_agent),
            ].join(",") + "\r\n");
          }
        }
        await client.query(`CLOSE ${cursorName}`);
        await client.query("COMMIT");
      } catch (err) {
        try { await client.query("ROLLBACK"); } catch { /* ignore */ }
        throw err;
      } finally {
        client.release();
      }
      res.end();
      return;
    }

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const sql = `
      SELECT id, usuario_id, email, perfil, metodo, endpoint, ip, user_agent, acessado_em
      FROM painel_pawards_auditoria
      ${whereSql}
      ORDER BY acessado_em DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;
    const { rows } = await pool.query(sql, params);

    // Total para paginação — sem limit/offset.
    const countParams = params.slice(0, params.length - 2);
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM painel_pawards_auditoria ${whereSql}`,
      countParams,
    );

    res.json({ items: rows, total: countRows[0]?.total ?? 0, limit, offset });
  } catch (e: any) {
    console.error("[painel-pawards/auditoria/acessos]", e);
    res.status(500).json({ error: e.message });
  }
});

// ===========================================================================
// 11C) APPOINTMENTS — mudar status direto pela agenda (Task #225)
// Permite que o badge de status na linha da AgendaHoje seja clicável e
// transicione entre estados válidos sem sair do dashboard.
// ===========================================================================
const STATUS_VALIDOS = new Set([
  "agendado",
  "aguardando",
  "em_atendimento",
  "concluido",
  "cancelado",
]);

// Transições permitidas a partir de cada estado. Estados terminais
// (concluido, cancelado) não permitem mudança — para reabrir use o
// fluxo completo /agenda-motor/reschedule.
const TRANSICOES_VALIDAS: Record<string, string[]> = {
  agendado:       ["aguardando", "em_atendimento", "concluido", "cancelado"],
  aguardando:     ["agendado", "em_atendimento", "concluido", "cancelado"],
  em_atendimento: ["aguardando", "concluido", "cancelado"],
  concluido:      [],
  cancelado:      [],
};

router.patch("/appointments/:id/status", async (req: AuthedRequest, res) => {
  try {
    if (!isMaster(req)) {
      res.status(403).json({ error: "Acesso restrito ao perfil master" });
      return;
    }
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "id inválido" });
      return;
    }
    const novoStatus = String(req.body?.status ?? "").trim();
    if (!STATUS_VALIDOS.has(novoStatus)) {
      res.status(400).json({ error: `status inválido (use: ${[...STATUS_VALIDOS].join(", ")})` });
      return;
    }

    const atual = await pool.query(
      `SELECT id, status FROM appointments WHERE id = $1 LIMIT 1`,
      [id],
    );
    if (atual.rows.length === 0) {
      res.status(404).json({ error: "Agendamento não encontrado" });
      return;
    }
    const statusAtual = String(atual.rows[0].status);
    if (statusAtual === novoStatus) {
      res.json({ ok: true, id, status: novoStatus, inalterado: true });
      return;
    }
    const permitidas = TRANSICOES_VALIDAS[statusAtual] ?? [];
    if (!permitidas.includes(novoStatus)) {
      res.status(409).json({
        error: `Transição inválida: ${statusAtual} → ${novoStatus}`,
        de: statusAtual,
        permitidas,
      });
      return;
    }

    const upd = await pool.query(
      `UPDATE appointments
          SET status = $1, atualizado_em = NOW()
        WHERE id = $2
        RETURNING id, status`,
      [novoStatus, id],
    );

    // Trilha em agenda_audit_events (mesma tabela usada por /agenda-motor)
    pool.query(
      `INSERT INTO agenda_audit_events (entidade_tipo, entidade_id, acao, detalhes, usuario_id)
       VALUES ('APPOINTMENT', $1, 'STATUS_ALTERADO', $2::jsonb, $3)`,
      [
        id,
        JSON.stringify({ de: statusAtual, para: novoStatus, origem: "agenda-hoje" }),
        req.user?.sub ? Number(req.user.sub) : null,
      ],
    ).catch((err) => console.error("[painel-pawards/appointments/status] audit", err));

    res.json({ ok: true, id, status: upd.rows[0].status, anterior: statusAtual });
  } catch (e: any) {
    console.error("[painel-pawards/appointments/status]", e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
