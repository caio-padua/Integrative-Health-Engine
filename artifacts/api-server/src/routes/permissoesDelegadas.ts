import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireRole } from "../middlewares/requireRole";
import { requireMasterEstrito } from "../middlewares/requireMasterEstrito";

const router = Router();

const PERMISSOES_VALIDAS = [
  "editar_catalogo_substancias",
  "editar_bloco_template",
  "editar_parametros_exames",
  "incluir_substancia_nova",
] as const;

/**
 * GET /api/admin/permissoes-delegadas
 * Lista TODAS as clinicas com seus 4 toggles (matriz unidade x permissao).
 * Inclui clinicas que ainda nao tem registro (mostra todos OFF).
 */
router.get(
  "/admin/permissoes-delegadas",
  requireRole("validador_mestre"),
  requireMasterEstrito,
  async (_req, res): Promise<void> => {
    const result = await db.execute(sql`
      SELECT
        u.id AS unidade_id,
        u.nome,
        u.tipo_unidade,
        u.ativa,
        u.fat_meta_mensal,
        COALESCE(
          json_agg(
            json_build_object(
              'permissao', pd.permissao,
              'ativo', pd.ativo,
              'preco_mensal_brl', pd.preco_mensal_brl,
              'preco_inclusao_substancia_brl', pd.preco_inclusao_substancia_brl
            ) ORDER BY pd.permissao
          ) FILTER (WHERE pd.permissao IS NOT NULL),
          '[]'::json
        ) AS toggles
      FROM unidades u
      LEFT JOIN permissoes_delegadas pd ON pd.unidade_id = u.id
      WHERE u.ativa = true
        AND u.nome NOT ILIKE '%(arquivada)%'
      GROUP BY u.id, u.nome, u.tipo_unidade, u.ativa, u.fat_meta_mensal
      ORDER BY u.tipo_unidade DESC, u.nome ASC
    `);
    res.json(result.rows);
  }
);

/**
 * GET /api/admin/permissoes-delegadas/:unidade_id
 * Toggles + precos de UMA clinica especifica.
 */
router.get(
  "/admin/permissoes-delegadas/:unidade_id",
  requireRole("validador_mestre"),
  requireMasterEstrito,
  async (req, res): Promise<void> => {
    const unidadeId = parseInt(req.params.unidade_id, 10);
    if (Number.isNaN(unidadeId)) {
      res.status(400).json({ error: "unidade_id invalido" });
      return;
    }
    const result = await db.execute(sql`
      SELECT permissao, ativo, preco_mensal_brl, preco_inclusao_substancia_brl, atualizado_em
      FROM permissoes_delegadas
      WHERE unidade_id = ${unidadeId}
      ORDER BY permissao
    `);
    res.json(result.rows);
  }
);

/**
 * PATCH /api/admin/permissoes-delegadas/:unidade_id
 * body: {
 *   permissao: 'editar_catalogo_substancias' | ...,
 *   ativo?: boolean,
 *   preco_mensal_brl?: number,
 *   preco_inclusao_substancia_brl?: number
 * }
 *
 * UPSERT: cria registro se nao existir, atualiza se existir.
 */
router.patch(
  "/admin/permissoes-delegadas/:unidade_id",
  requireRole("validador_mestre"),
  requireMasterEstrito,
  async (req, res): Promise<void> => {
    const unidadeId = parseInt(req.params.unidade_id, 10);
    const { permissao, ativo, preco_mensal_brl, preco_inclusao_substancia_brl } = req.body ?? {};

    if (Number.isNaN(unidadeId)) {
      res.status(400).json({ error: "unidade_id invalido" });
      return;
    }
    if (!PERMISSOES_VALIDAS.includes(permissao)) {
      res.status(400).json({
        error: "permissao invalida",
        validas: PERMISSOES_VALIDAS,
      });
      return;
    }

    const ativoVal = typeof ativo === "boolean" ? ativo : false;
    const mensal = preco_mensal_brl != null ? Number(preco_mensal_brl) : 0;
    const inclusao = preco_inclusao_substancia_brl != null ? Number(preco_inclusao_substancia_brl) : 150;
    const usuarioId = (req.user as any)?.id ?? null;

    const result = await db.execute(sql`
      INSERT INTO permissoes_delegadas
        (unidade_id, permissao, ativo, preco_mensal_brl, preco_inclusao_substancia_brl, delegado_por_usuario_id, atualizado_em)
      VALUES
        (${unidadeId}, ${permissao}, ${ativoVal}, ${mensal}, ${inclusao}, ${usuarioId}, now())
      ON CONFLICT (unidade_id, permissao) DO UPDATE SET
        ativo = EXCLUDED.ativo,
        preco_mensal_brl = EXCLUDED.preco_mensal_brl,
        preco_inclusao_substancia_brl = EXCLUDED.preco_inclusao_substancia_brl,
        delegado_por_usuario_id = EXCLUDED.delegado_por_usuario_id,
        atualizado_em = now()
      RETURNING *
    `);

    res.json(result.rows[0]);
  }
);

export default router;
