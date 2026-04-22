import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireRole } from "../middlewares/requireRole";

const router = Router();

/**
 * GET /api/admin/cobrancas-adicionais
 * Extrato auditavel de tudo que o Dr. Caio cobra a mais das clinicas.
 *
 * query (opcional):
 *   ?unidade_id=14
 *   ?status=pendente|cobrado|pago|cancelado
 *   ?desde=2026-01-01
 *
 * Resposta inclui agregado: total por status no rodape.
 */
router.get(
  "/admin/cobrancas-adicionais",
  requireRole("validador_mestre"),
  async (req, res): Promise<void> => {
    const unidadeId = req.query.unidade_id ? Number(req.query.unidade_id) : null;
    const status = typeof req.query.status === "string" ? req.query.status : null;
    const desde = typeof req.query.desde === "string" ? req.query.desde : null;

    const filtros: any[] = [];
    if (unidadeId) filtros.push(sql`ca.unidade_id = ${unidadeId}`);
    if (status)    filtros.push(sql`ca.status = ${status}`);
    if (desde)     filtros.push(sql`ca.criado_em >= ${desde}`);
    const where = filtros.length > 0
      ? sql`WHERE ${sql.join(filtros, sql` AND `)}`
      : sql``;

    const linhas = await db.execute(sql`
      SELECT
        ca.id, ca.unidade_id, u.nome AS unidade_nome, u.tipo_unidade,
        ca.tipo, ca.descricao, ca.valor_brl, ca.status,
        ca.referencia_id, ca.referencia_tipo,
        ca.criado_em, ca.cobrado_em, ca.pago_em
      FROM cobrancas_adicionais ca
      JOIN unidades u ON u.id = ca.unidade_id
      ${where}
      ORDER BY ca.criado_em DESC
      LIMIT 500
    `);

    const totais = await db.execute(sql`
      SELECT
        status,
        count(*)::int AS quantidade,
        COALESCE(sum(valor_brl), 0)::numeric AS total_brl
      FROM cobrancas_adicionais ca
      ${where}
      GROUP BY status
    `);

    res.json({
      cobrancas: linhas.rows,
      resumo_por_status: totais.rows,
    });
  }
);

/**
 * POST /api/admin/cobrancas-adicionais
 * Lancamento MANUAL (campo #4 do Dr. Caio):
 *   "consultoria estrategica abril R$ 2.500 pra Pazialle"
 *
 * body: { unidade_id, tipo, descricao, valor_brl, status? }
 */
router.post(
  "/admin/cobrancas-adicionais",
  requireRole("validador_mestre"),
  async (req, res): Promise<void> => {
    const { unidade_id, tipo, descricao, valor_brl, status } = req.body ?? {};

    if (!unidade_id || !tipo || !descricao || valor_brl == null) {
      res.status(400).json({
        error: "Campos obrigatorios: unidade_id, tipo, descricao, valor_brl",
      });
      return;
    }
    const valor = Number(valor_brl);
    if (Number.isNaN(valor) || valor < 0) {
      res.status(400).json({ error: "valor_brl invalido" });
      return;
    }
    const statusFinal = status && ["pendente","cobrado","pago","cancelado"].includes(status)
      ? status : "pendente";
    const usuarioId = (req.user as any)?.id ?? null;

    const result = await db.execute(sql`
      INSERT INTO cobrancas_adicionais
        (unidade_id, tipo, descricao, valor_brl, status, criado_por_usuario_id)
      VALUES
        (${Number(unidade_id)}, ${tipo}, ${descricao}, ${valor}, ${statusFinal}, ${usuarioId})
      RETURNING *
    `);
    res.status(201).json(result.rows[0]);
  }
);

/**
 * PATCH /api/admin/cobrancas-adicionais/:id
 * Permite mudar status (pendente -> cobrado -> pago -> cancelado) ou editar valor/descricao.
 * body: { status?, valor_brl?, descricao? }
 */
router.patch(
  "/admin/cobrancas-adicionais/:id",
  requireRole("validador_mestre"),
  async (req, res): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "id invalido" });
      return;
    }
    const { status, valor_brl, descricao } = req.body ?? {};

    const sets: any[] = [];
    if (status && ["pendente","cobrado","pago","cancelado"].includes(status)) {
      sets.push(sql`status = ${status}`);
      if (status === "cobrado") sets.push(sql`cobrado_em = now()`);
      if (status === "pago")    sets.push(sql`pago_em = now()`);
    }
    if (valor_brl != null) {
      const v = Number(valor_brl);
      if (!Number.isNaN(v) && v >= 0) sets.push(sql`valor_brl = ${v}`);
    }
    if (typeof descricao === "string") sets.push(sql`descricao = ${descricao}`);

    if (sets.length === 0) {
      res.status(400).json({ error: "Nada a atualizar" });
      return;
    }

    const result = await db.execute(sql`
      UPDATE cobrancas_adicionais
      SET ${sql.join(sets, sql`, `)}
      WHERE id = ${id}
      RETURNING *
    `);
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Cobranca nao encontrada" });
      return;
    }
    res.json(result.rows[0]);
  }
);

export default router;
