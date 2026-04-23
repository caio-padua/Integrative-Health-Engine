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

export default router;
