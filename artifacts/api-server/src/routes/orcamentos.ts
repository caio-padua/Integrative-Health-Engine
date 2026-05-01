// ════════════════════════════════════════════════════════════════════
// PAWARDS MEDCORE · Wave 10 F3.C — Orcamento Farmaceutico (Familia 3)
// Dispara envelope ZapSign duplo (paciente avancada + farmacia ICP)
// quando uma receita do PARMAVAULT eh roteada para uma farmacia parceira.
//
// Caminho 1 MVP minimal aprovado pelo Caio (Princípio 9 PADCON):
// orcamento = receita roteada com valor_formula_estimado preenchido.
// Reusa template ORCAMENTO_FORMAL_V1 (id=4) ja cadastrado.
//
// Auth: requireAuth + tenant via JWT unidadeId.
//
// Endpoints:
//   POST /orcamentos/:receitaId/disparar  — dispara envelope ZapSign duplo
//   GET  /orcamentos/:receitaId/status    — devolve status atual da assinatura
// ════════════════════════════════════════════════════════════════════
import { Router, type Request } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { requireRole as _requireRole } from "../middlewares/requireRole.js";
import {
  enviarOrcamentoFarmaceutico,
  type EnviarOrcamentoFarmaceuticoInput,
} from "../lib/assinatura/use-cases/enviarOrcamentoFarmaceutico.js";

const router = Router();

function getUnidadeId(req: Request): number | null {
  return (req as unknown as { user?: { unidadeId?: number } }).user?.unidadeId ?? null;
}

interface ReceitaTenantRow {
  id: number;
  unidade_id: number | null;
  paciente_id: number | null;
  farmacia_id: number | null;
}

async function carregarReceitaParaTenant(receitaId: number): Promise<ReceitaTenantRow | null> {
  const r = await db.execute(sql`
    SELECT id, unidade_id, paciente_id, farmacia_id
    FROM parmavault_receitas WHERE id = ${receitaId} LIMIT 1
  `);
  return ((r as unknown as { rows?: ReceitaTenantRow[] }).rows || [])[0] || null;
}

// ════════ POST /orcamentos/:receitaId/disparar ════════
// Idempotente. Retorna existente se ja disparado pra mesma receita.
router.post(
  "/orcamentos/:receitaId/disparar",
  _requireRole("medico", "validador_mestre", "operador_clinico"),
  async (req, res) => {
    const receitaId = Number(req.params["receitaId"]);
    if (!Number.isFinite(receitaId) || receitaId <= 0) {
      return res.status(400).json({
        ok: false,
        erro: "receitaId invalido",
        receitaId: req.params["receitaId"],
      });
    }

    // Multi-tenant: receita precisa pertencer a unidade do JWT.
    const unidadeJwt = getUnidadeId(req);
    if (!unidadeJwt) {
      return res.status(403).json({ ok: false, erro: "JWT sem unidadeId" });
    }
    const receita = await carregarReceitaParaTenant(receitaId);
    if (!receita) {
      return res.status(404).json({
        ok: false,
        erro: "receita nao encontrada",
        receitaId,
      });
    }
    if (receita.unidade_id !== unidadeJwt) {
      return res.status(403).json({
        ok: false,
        erro: "receita pertence a outra unidade",
        receitaId,
      });
    }

    const body = (req.body || {}) as Partial<EnviarOrcamentoFarmaceuticoInput>;

    try {
      const resultado = await enviarOrcamentoFarmaceutico({
        receitaId,
        farmaciaRepresentante: body.farmaciaRepresentante,
      });
      return res.status(resultado.reaproveitado ? 200 : 201).json(resultado);
    } catch (err) {
      const msg = (err as Error)?.message || "erro desconhecido";
      req.log?.warn(
        { err, receitaId, unidadeId: unidadeJwt },
        "Falha ao disparar orcamento farmaceutico",
      );
      return res.status(422).json({
        ok: false,
        erro: msg,
        receitaId,
      });
    }
  },
);

// ════════ GET /orcamentos/:receitaId/status ════════
// Devolve a ultima solicitacao de orcamento para a receita (read-only).
router.get(
  "/orcamentos/:receitaId/status",
  _requireRole("medico", "validador_mestre", "operador_clinico"),
  async (req, res) => {
    const receitaId = Number(req.params["receitaId"]);
    if (!Number.isFinite(receitaId) || receitaId <= 0) {
      return res.status(400).json({ ok: false, erro: "receitaId invalido" });
    }

    const unidadeJwt = getUnidadeId(req);
    if (!unidadeJwt) {
      return res.status(403).json({ ok: false, erro: "JWT sem unidadeId" });
    }
    const receita = await carregarReceitaParaTenant(receitaId);
    if (!receita) {
      return res.status(404).json({ ok: false, erro: "receita nao encontrada" });
    }
    if (receita.unidade_id !== unidadeJwt) {
      return res.status(403).json({ ok: false, erro: "receita de outra unidade" });
    }

    interface SolicitacaoRow {
      id: number;
      provedor_envelope_id: string | null;
      provedor_codigo: string;
      status: string;
      enviado_em: string | null;
      concluido_em: string | null;
      hash_original: string | null;
      hash_assinado: string | null;
      signatarios_snapshot: unknown;
      metadata: unknown;
    }

    const r = await db.execute(sql`
      SELECT id, provedor_envelope_id, provedor_codigo, status,
             enviado_em, concluido_em, hash_original, hash_assinado,
             signatarios_snapshot, metadata
      FROM assinatura_solicitacoes
      WHERE template_id = 4
        AND (metadata->>'receitaId')::bigint = ${receitaId}
      ORDER BY enviado_em DESC NULLS LAST
      LIMIT 1
    `);
    const row = ((r as unknown as { rows?: SolicitacaoRow[] }).rows || [])[0];

    if (!row) {
      return res.status(404).json({
        ok: false,
        erro: "Nenhum orcamento disparado para esta receita ainda",
        receitaId,
      });
    }
    return res.status(200).json({
      ok: true,
      receitaId,
      solicitacao: row,
    });
  },
);

export default router;
