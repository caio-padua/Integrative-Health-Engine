// ════════════════════════════════════════════════════════════════════
// PARMAVAULT-TSUNAMI Wave 5 · Frente A · CRUD admin contratos
// /api/admin/contratos-farmacia
//
// Auth: requireRole("validador_mestre") + requireMasterEstrito (mesmo
// padrao Wave 3 — defesa em profundidade pra rotas que afetam a
// relacao parceria com farmacias externas).
//
// Endpoints:
//   GET    /admin/contratos-farmacia            → lista com nomes joinados
//   GET    /admin/contratos-farmacia/options    → opcoes de unidade+farmacia
//                                                pra dropdowns do form
//   POST   /admin/contratos-farmacia            → cria novo contrato
//   PATCH  /admin/contratos-farmacia/:id        → edita (ativar/desativar/datas)
//   DELETE /admin/contratos-farmacia/:id        → soft delete (ativo=false)
// ════════════════════════════════════════════════════════════════════

import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { requireRole as _requireRole } from "../middlewares/requireRole";
import { requireMasterEstrito as _requireMaster } from "../middlewares/requireMasterEstrito";

const router = Router();

const guardMaster = [
  _requireRole("validador_mestre"),
  _requireMaster,
];

// ───────────────────────────────────────────────────────────
// GET /admin/contratos-farmacia → lista com nomes joinados
// ───────────────────────────────────────────────────────────
router.get("/admin/contratos-farmacia", ...guardMaster, async (req, res) => {
  try {
    const incluirInativos = String(req.query.incluir_inativos || "false") === "true";
    const r = await db.execute(sql`
      SELECT
        fuc.id,
        fuc.unidade_id,
        u.nome                         AS unidade_nome,
        u.nick                         AS unidade_nick,
        fuc.farmacia_id,
        fp.nome_fantasia               AS farmacia_nome,
        fp.cnpj                        AS farmacia_cnpj,
        fuc.tipo_relacao,
        fuc.ativo,
        fuc.vigencia_inicio,
        fuc.vigencia_fim,
        fuc.observacoes,
        fuc.criado_em,
        fuc.atualizado_em
      FROM farmacias_unidades_contrato fuc
      LEFT JOIN unidades              u  ON u.id  = fuc.unidade_id
      LEFT JOIN farmacias_parmavault  fp ON fp.id = fuc.farmacia_id
      WHERE ${incluirInativos ? sql`TRUE` : sql`fuc.ativo = TRUE`}
      ORDER BY fuc.ativo DESC, u.nome ASC, fp.nome_fantasia ASC
    `);
    res.json({ ok: true, total: r.rows.length, contratos: r.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// ───────────────────────────────────────────────────────────
// GET /admin/contratos-farmacia/options → dropdowns do form
// ───────────────────────────────────────────────────────────
router.get("/admin/contratos-farmacia/options", ...guardMaster, async (_req, res) => {
  try {
    const [unidades, farmacias] = await Promise.all([
      db.execute(sql`
        SELECT id, nome, nick
        FROM unidades
        WHERE nome NOT ILIKE '%(ARQUIVADA)%'
        ORDER BY nome ASC
      `),
      db.execute(sql`
        SELECT id, nome_fantasia, cnpj
        FROM farmacias_parmavault
        WHERE COALESCE(ativo, TRUE) = TRUE
        ORDER BY nome_fantasia ASC
      `),
    ]);
    res.json({
      ok: true,
      unidades:  unidades.rows,
      farmacias: farmacias.rows,
      tipos_relacao: ["parceira", "preferencial", "exclusiva", "piloto"],
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// ───────────────────────────────────────────────────────────
// POST /admin/contratos-farmacia → cria novo
// ───────────────────────────────────────────────────────────
router.post("/admin/contratos-farmacia", ...guardMaster, async (req, res) => {
  try {
    const {
      unidade_id, farmacia_id,
      tipo_relacao, vigencia_inicio, vigencia_fim, observacoes,
    } = req.body || {};

    const uId = Number(unidade_id);
    const fId = Number(farmacia_id);
    if (!uId || uId <= 0 || !fId || fId <= 0) {
      return res.status(400).json({ ok: false, error: "unidade_id e farmacia_id obrigatorios" });
    }
    const tipo = String(tipo_relacao || "parceira").trim() || "parceira";
    const ini  = vigencia_inicio ? String(vigencia_inicio) : null;  // YYYY-MM-DD
    const fim  = vigencia_fim    ? String(vigencia_fim)    : null;
    const obs  = observacoes     ? String(observacoes).slice(0, 1000) : null;
    const userId = (req as any).user?.id ?? null;

    const r = await db.execute(sql`
      INSERT INTO farmacias_unidades_contrato
        (unidade_id, farmacia_id, tipo_relacao, ativo,
         vigencia_inicio, vigencia_fim, observacoes,
         criado_em, atualizado_em, criado_por_usuario_id)
      VALUES
        (${uId}, ${fId}, ${tipo}, TRUE,
         COALESCE(${ini}::date, CURRENT_DATE),
         ${fim}::date,
         ${obs},
         now(), now(), ${userId})
      RETURNING id, unidade_id, farmacia_id, tipo_relacao, ativo,
                vigencia_inicio, vigencia_fim, observacoes, criado_em
    `);
    res.json({ ok: true, contrato: r.rows[0] });
  } catch (err) {
    const msg = String(err);
    if (msg.includes("uniq_fuc_par_ativo")) {
      return res.status(409).json({
        ok: false,
        error: "Ja existe um contrato ativo para esta unidade+farmacia. Desative o anterior antes de criar novo.",
      });
    }
    res.status(500).json({ ok: false, error: msg });
  }
});

// ───────────────────────────────────────────────────────────
// PATCH /admin/contratos-farmacia/:id → edita campos seletivos
// ───────────────────────────────────────────────────────────
router.patch("/admin/contratos-farmacia/:id", ...guardMaster, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || id <= 0) return res.status(400).json({ ok: false, error: "id invalido" });

    const { tipo_relacao, ativo, vigencia_inicio, vigencia_fim, observacoes } = req.body || {};

    // Whitelist de campos editáveis (não permite trocar unidade/farmácia
    // — pra trocar par, crie contrato novo).
    const r = await db.execute(sql`
      UPDATE farmacias_unidades_contrato
      SET tipo_relacao    = COALESCE(${tipo_relacao !== undefined ? String(tipo_relacao) : null}, tipo_relacao),
          ativo           = COALESCE(${ativo !== undefined ? Boolean(ativo) : null}, ativo),
          vigencia_inicio = COALESCE(${vigencia_inicio !== undefined ? String(vigencia_inicio) : null}::date, vigencia_inicio),
          vigencia_fim    = ${vigencia_fim === null ? sql`NULL` : vigencia_fim !== undefined ? sql`${String(vigencia_fim)}::date` : sql`vigencia_fim`},
          observacoes     = ${observacoes === null ? sql`NULL` : observacoes !== undefined ? sql`${String(observacoes).slice(0, 1000)}` : sql`observacoes`},
          atualizado_em   = now()
      WHERE id = ${id}
      RETURNING id, unidade_id, farmacia_id, tipo_relacao, ativo,
                vigencia_inicio, vigencia_fim, observacoes, atualizado_em
    `);
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: "nao encontrado" });
    res.json({ ok: true, contrato: r.rows[0] });
  } catch (err) {
    const msg = String(err);
    if (msg.includes("uniq_fuc_par_ativo")) {
      return res.status(409).json({
        ok: false,
        error: "Ativar este contrato duplicaria par ativo. Desative o outro primeiro.",
      });
    }
    res.status(500).json({ ok: false, error: msg });
  }
});

// ───────────────────────────────────────────────────────────
// DELETE /admin/contratos-farmacia/:id → soft delete
// ───────────────────────────────────────────────────────────
router.delete("/admin/contratos-farmacia/:id", ...guardMaster, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || id <= 0) return res.status(400).json({ ok: false, error: "id invalido" });
    const r = await db.execute(sql`
      UPDATE farmacias_unidades_contrato
      SET ativo = FALSE, atualizado_em = now()
      WHERE id = ${id}
      RETURNING id
    `);
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: "nao encontrado" });
    res.json({ ok: true, desativado: id });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// ════════════════════════════════════════════════════════════════════
// Wave 5 · Onda 3 · Endpoints de regras de roteamento
// /api/admin/farmacias-roteamento
// ════════════════════════════════════════════════════════════════════
import { rotearFarmaciaParaReceita } from "../lib/roteamentoFarmacia";

// GET → lista farmácias com regras + métricas mês corrente
router.get("/admin/farmacias-roteamento", ...guardMaster, async (_req, res) => {
  try {
    const ano_mes = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    })();
    const r = await db.execute(sql`
      SELECT
        fp.id, fp.nome_fantasia, fp.cnpj, fp.cidade, fp.estado, fp.ativo,
        fp.nivel_exclusividade, fp.disponivel_manual, fp.acionavel_por_criterio,
        fp.cota_pct_max, fp.cota_receitas_max_mes, fp.prioridade,
        fp.aceita_blocos_tipos, fp.observacoes_roteamento,
        COALESCE(femm.qtd_emissoes, 0) AS qtd_emissoes_mes,
        COALESCE(femm.valor_total, 0)  AS valor_total_mes,
        (SELECT COUNT(*)::int FROM farmacias_unidades_contrato
          WHERE farmacia_id = fp.id AND ativo = TRUE) AS contratos_ativos
      FROM farmacias_parmavault fp
      LEFT JOIN farmacias_emissao_metricas_mes femm
        ON femm.farmacia_id = fp.id AND femm.ano_mes = ${ano_mes}
      ORDER BY fp.ativo DESC, fp.prioridade ASC, fp.nome_fantasia ASC
    `);
    const total = r.rows.reduce((s: number, x: any) => s + Number(x.qtd_emissoes_mes || 0), 0);
    const farmacias = r.rows.map((x: any) => ({
      ...x,
      qtd_emissoes_mes: Number(x.qtd_emissoes_mes),
      valor_total_mes: Number(x.valor_total_mes),
      pct_atual_mes: total > 0 ? Number(((Number(x.qtd_emissoes_mes) / total) * 100).toFixed(2)) : 0,
    }));
    res.json({ ok: true, ano_mes, total_emissoes_pool: total, farmacias });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// PATCH → edita regras de roteamento (whitelist)
router.patch("/admin/farmacias-roteamento/:id", ...guardMaster, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || id <= 0) return res.status(400).json({ ok: false, error: "id invalido" });
    const {
      nivel_exclusividade, disponivel_manual, acionavel_por_criterio,
      cota_pct_max, cota_receitas_max_mes, prioridade,
      aceita_blocos_tipos, observacoes_roteamento, ativo,
    } = req.body || {};

    if (nivel_exclusividade !== undefined &&
        !["parceira","preferencial","exclusiva","piloto","backup"].includes(String(nivel_exclusividade))) {
      return res.status(400).json({ ok: false, error: "nivel_exclusividade invalido" });
    }
    if (cota_pct_max !== undefined && cota_pct_max !== null) {
      const n = Number(cota_pct_max);
      if (Number.isNaN(n) || n < 0 || n > 100) {
        return res.status(400).json({ ok: false, error: "cota_pct_max deve estar entre 0 e 100" });
      }
    }
    const tipos = Array.isArray(aceita_blocos_tipos)
      ? aceita_blocos_tipos.map((t: any) => String(t).trim()).filter(Boolean)
      : null;

    const r = await db.execute(sql`
      UPDATE farmacias_parmavault
      SET nivel_exclusividade    = COALESCE(${nivel_exclusividade !== undefined ? String(nivel_exclusividade) : null}, nivel_exclusividade),
          disponivel_manual      = COALESCE(${disponivel_manual !== undefined ? Boolean(disponivel_manual) : null}, disponivel_manual),
          acionavel_por_criterio = COALESCE(${acionavel_por_criterio !== undefined ? Boolean(acionavel_por_criterio) : null}, acionavel_por_criterio),
          cota_pct_max           = ${cota_pct_max === null ? sql`NULL` : cota_pct_max !== undefined ? sql`${Number(cota_pct_max)}` : sql`cota_pct_max`},
          cota_receitas_max_mes  = ${cota_receitas_max_mes === null ? sql`NULL` : cota_receitas_max_mes !== undefined ? sql`${Number(cota_receitas_max_mes)}` : sql`cota_receitas_max_mes`},
          prioridade             = COALESCE(${prioridade !== undefined ? Number(prioridade) : null}, prioridade),
          aceita_blocos_tipos    = COALESCE(${tipos !== null ? sql`${tipos}::text[]` : sql`NULL`}, aceita_blocos_tipos),
          observacoes_roteamento = ${observacoes_roteamento === null ? sql`NULL` : observacoes_roteamento !== undefined ? sql`${String(observacoes_roteamento).slice(0,1000)}` : sql`observacoes_roteamento`},
          ativo                  = COALESCE(${ativo !== undefined ? Boolean(ativo) : null}, ativo),
          atualizado_em          = now()
      WHERE id = ${id}
      RETURNING id, nome_fantasia, nivel_exclusividade, disponivel_manual, acionavel_por_criterio,
                cota_pct_max, cota_receitas_max_mes, prioridade, aceita_blocos_tipos,
                observacoes_roteamento, ativo, atualizado_em
    `);
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: "nao encontrado" });
    res.json({ ok: true, farmacia: r.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST preview → simula roteamento sem persistir (debug + UI)
router.post("/admin/farmacias-roteamento/preview", ...guardMaster, async (req, res) => {
  try {
    const { unidade_id, tipo_bloco, override_farmacia_id } = req.body || {};
    const r = await rotearFarmaciaParaReceita({
      unidade_id: Number(unidade_id),
      tipo_bloco: tipo_bloco || null,
      override_farmacia_id: override_farmacia_id ? Number(override_farmacia_id) : null,
    });
    res.json({ ok: true, resultado: r });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
