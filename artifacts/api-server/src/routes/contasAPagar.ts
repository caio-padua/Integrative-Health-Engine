import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireRole } from "../middlewares/requireRole";
import { requireMasterEstrito } from "../middlewares/requireMasterEstrito";

// Task #226 — CRUD de contas a pagar (folha, magistral, operacional, outros)
//
// Tabela: contas_a_pagar (migration 050_contas_a_pagar_saidas_reais.sql).
// O card "Fluxo de Caixa 30d" (GET /painel-pawards/caixa-30d) ja consome
// dessa tabela: SOMENTE linhas com data_pagamento NOT NULL, status='pago'
// e arquivado_em IS NULL viram saida real no grafico.
//
// Rotas (todas restritas a validador_mestre + masterEstrito, ja que e o
// painel financeiro do Dr. Caio):
//   GET    /api/contas-a-pagar                  -> lista + resumo
//   POST   /api/contas-a-pagar                  -> cria lancamento
//   PATCH  /api/contas-a-pagar/:id              -> edita campos
//   POST   /api/contas-a-pagar/:id/marcar-paga  -> atalho: status=pago + data_pagamento

const router = Router();

const CATEGORIAS = ["folha", "magistral", "operacional", "outros"] as const;
const STATUSES = ["aberto", "pago", "cancelado"] as const;

type Categoria = typeof CATEGORIAS[number];
type Status = typeof STATUSES[number];

function parseDataYmd(value: unknown): string | null {
  if (value == null || value === "") return null;
  const s = String(value);
  // Aceita ISO completo ou YYYY-MM-DD; converte tudo para YYYY-MM-DD.
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1]! : null;
}

router.get(
  "/contas-a-pagar",
  requireRole("validador_mestre"),
  requireMasterEstrito,
  async (req, res): Promise<void> => {
    const unidadeId = req.query["unidade_id"] ? Number(req.query["unidade_id"]) : null;
    const categoria = typeof req.query["categoria"] === "string" ? req.query["categoria"] : null;
    const status = typeof req.query["status"] === "string" ? req.query["status"] : null;

    const filtros: any[] = [sql`c.arquivado_em IS NULL`];
    if (unidadeId && !Number.isNaN(unidadeId)) filtros.push(sql`c.unidade_id = ${unidadeId}`);
    if (categoria && (CATEGORIAS as readonly string[]).includes(categoria)) {
      filtros.push(sql`c.categoria = ${categoria}`);
    }
    if (status && (STATUSES as readonly string[]).includes(status)) {
      filtros.push(sql`c.status = ${status}`);
    }
    const where = sql`WHERE ${sql.join(filtros, sql` AND `)}`;

    const linhas = await db.execute(sql`
      SELECT
        c.id, c.unidade_id, u.nome AS unidade_nome,
        c.categoria, c.descricao, c.fornecedor,
        c.valor_brl::numeric AS valor_brl,
        c.data_vencimento, c.data_pagamento,
        c.status, c.observacao,
        c.created_at, c.updated_at
      FROM contas_a_pagar c
      LEFT JOIN unidades u ON u.id = c.unidade_id
      ${where}
      ORDER BY
        CASE c.status WHEN 'aberto' THEN 0 WHEN 'pago' THEN 1 ELSE 2 END,
        COALESCE(c.data_vencimento, c.data_pagamento, c.created_at::date) DESC,
        c.id DESC
      LIMIT 500
    `);

    const totais = await db.execute(sql`
      SELECT
        c.status,
        c.categoria,
        COUNT(*)::int AS quantidade,
        COALESCE(SUM(c.valor_brl), 0)::numeric AS total_brl
      FROM contas_a_pagar c
      ${where}
      GROUP BY c.status, c.categoria
    `);

    res.json({
      contas: linhas.rows,
      resumo: totais.rows,
    });
  },
);

router.post(
  "/contas-a-pagar",
  requireRole("validador_mestre"),
  requireMasterEstrito,
  async (req, res): Promise<void> => {
    const {
      unidade_id, categoria, descricao, fornecedor,
      valor_brl, data_vencimento, data_pagamento,
      status, observacao,
    } = req.body ?? {};

    if (!categoria || !(CATEGORIAS as readonly string[]).includes(categoria)) {
      res.status(400).json({ error: `categoria invalida (use: ${CATEGORIAS.join(", ")})` });
      return;
    }
    if (typeof descricao !== "string" || descricao.trim().length === 0) {
      res.status(400).json({ error: "descricao obrigatoria" });
      return;
    }
    const valor = Number(valor_brl);
    if (Number.isNaN(valor) || valor < 0) {
      res.status(400).json({ error: "valor_brl invalido" });
      return;
    }

    const dataPag = parseDataYmd(data_pagamento);
    const dataVenc = parseDataYmd(data_vencimento);
    // Se status nao foi enviado: status='pago' quando ja vier data_pagamento,
    // senao 'aberto'. Garante que o card so soma o que foi pago de fato.
    let statusFinal: Status = "aberto";
    if (status && (STATUSES as readonly string[]).includes(status)) {
      statusFinal = status as Status;
    } else if (dataPag) {
      statusFinal = "pago";
    }
    // Coerencia: status=pago precisa de data_pagamento. Se vier 'pago' sem
    // data, usa hoje (mesmo comportamento do botao "marcar como paga").
    let dataPagFinal = dataPag;
    if (statusFinal === "pago" && !dataPagFinal) {
      dataPagFinal = new Date().toISOString().slice(0, 10);
    }

    const unidade = unidade_id != null && unidade_id !== "" ? Number(unidade_id) : null;

    const result = await db.execute(sql`
      INSERT INTO contas_a_pagar
        (unidade_id, categoria, descricao, fornecedor, valor_brl,
         data_vencimento, data_pagamento, status, observacao, origem)
      VALUES
        (${unidade}, ${categoria as Categoria}, ${descricao.trim()},
         ${fornecedor ?? null}, ${valor},
         ${dataVenc}, ${dataPagFinal}, ${statusFinal},
         ${observacao ?? null}, 'manual')
      RETURNING *
    `);
    res.status(201).json(result.rows[0]);
  },
);

router.patch(
  "/contas-a-pagar/:id",
  requireRole("validador_mestre"),
  requireMasterEstrito,
  async (req, res): Promise<void> => {
    const id = parseInt(String(req.params["id"]), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "id invalido" });
      return;
    }
    const {
      unidade_id, categoria, descricao, fornecedor,
      valor_brl, data_vencimento, data_pagamento,
      status, observacao,
    } = req.body ?? {};

    const sets: any[] = [];
    if (unidade_id !== undefined) {
      const u = unidade_id == null || unidade_id === "" ? null : Number(unidade_id);
      sets.push(sql`unidade_id = ${u}`);
    }
    if (categoria !== undefined) {
      if (!(CATEGORIAS as readonly string[]).includes(categoria)) {
        res.status(400).json({ error: "categoria invalida" });
        return;
      }
      sets.push(sql`categoria = ${categoria as Categoria}`);
    }
    if (descricao !== undefined) {
      if (typeof descricao !== "string" || descricao.trim().length === 0) {
        res.status(400).json({ error: "descricao invalida" });
        return;
      }
      sets.push(sql`descricao = ${descricao.trim()}`);
    }
    if (fornecedor !== undefined) sets.push(sql`fornecedor = ${fornecedor ?? null}`);
    if (valor_brl !== undefined) {
      const v = Number(valor_brl);
      if (Number.isNaN(v) || v < 0) {
        res.status(400).json({ error: "valor_brl invalido" });
        return;
      }
      sets.push(sql`valor_brl = ${v}`);
    }
    if (data_vencimento !== undefined) sets.push(sql`data_vencimento = ${parseDataYmd(data_vencimento)}`);
    if (data_pagamento !== undefined) sets.push(sql`data_pagamento = ${parseDataYmd(data_pagamento)}`);
    if (status !== undefined) {
      if (!(STATUSES as readonly string[]).includes(status)) {
        res.status(400).json({ error: "status invalido" });
        return;
      }
      sets.push(sql`status = ${status as Status}`);
      // Se virou 'pago' e nao enviou data_pagamento, marca hoje.
      if (status === "pago" && data_pagamento === undefined) {
        sets.push(sql`data_pagamento = COALESCE(data_pagamento, CURRENT_DATE)`);
      }
    }
    if (observacao !== undefined) sets.push(sql`observacao = ${observacao ?? null}`);

    if (sets.length === 0) {
      res.status(400).json({ error: "Nada a atualizar" });
      return;
    }
    sets.push(sql`updated_at = now()`);

    const result = await db.execute(sql`
      UPDATE contas_a_pagar
      SET ${sql.join(sets, sql`, `)}
      WHERE id = ${id} AND arquivado_em IS NULL
      RETURNING *
    `);
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Conta nao encontrada" });
      return;
    }
    res.json(result.rows[0]);
  },
);

// Atalho da UI: botao "Marcar como paga" — preenche data_pagamento (hoje
// se nao enviado) e status='pago' numa unica chamada idempotente.
router.post(
  "/contas-a-pagar/:id/marcar-paga",
  requireRole("validador_mestre"),
  requireMasterEstrito,
  async (req, res): Promise<void> => {
    const id = parseInt(String(req.params["id"]), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "id invalido" });
      return;
    }
    const dataPag = parseDataYmd(req.body?.data_pagamento) ?? new Date().toISOString().slice(0, 10);
    const result = await db.execute(sql`
      UPDATE contas_a_pagar
      SET status = 'pago',
          data_pagamento = ${dataPag},
          updated_at = now()
      WHERE id = ${id} AND arquivado_em IS NULL
      RETURNING *
    `);
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Conta nao encontrada" });
      return;
    }
    res.json(result.rows[0]);
  },
);

export default router;
