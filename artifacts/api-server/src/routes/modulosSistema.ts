import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdminToken } from "../middlewares/requireAdminToken.js";

const router: IRouter = Router();

// ═══════════════════════════════════════════════════════════════════
// MÓDULOS SISTEMA IHE — catálogo real (modulos_sistema + unidade_modulos_ativos)
// Distinto de modulos_padcon (sistema PADCON/Manager)
// ═══════════════════════════════════════════════════════════════════

router.get("/modulos-sistema/catalogo", async (_req, res): Promise<void> => {
  try {
    const result = await db.execute(sql`
      SELECT id, codigo, nome, categoria, preco_mensal, preco_por_uso, ativo
      FROM modulos_sistema
      ORDER BY id
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/modulos-sistema/matriz", async (_req, res): Promise<void> => {
  try {
    const modulos = await db.execute(sql`
      SELECT id, codigo, nome, categoria, preco_mensal, preco_por_uso
      FROM modulos_sistema
      ORDER BY id
    `);

    const empresas = await db.execute(sql`
      SELECT
        u.id,
        u.nome,
        u.cor,
        cc.modelo_cobranca,
        cc.valor_mensal_fixo,
        cc.status AS contrato_status
      FROM unidades u
      LEFT JOIN contrato_clinica cc ON cc.unidade_id = u.id
      WHERE u.id NOT BETWEEN 1 AND 7
        AND u.id <> 14
        AND u.nome NOT ILIKE '%(ARQUIVADA)%'
      ORDER BY u.id
    `);

    const ativacoes = await db.execute(sql`
      SELECT uma.unidade_id, uma.modulo_id, uma.ativo, uma.preco_personalizado
      FROM unidade_modulos_ativos uma
      JOIN unidades u ON u.id = uma.unidade_id
      WHERE u.id NOT BETWEEN 1 AND 7
        AND u.id <> 14
    `);

    res.json({
      modulos: modulos.rows,
      empresas: empresas.rows,
      ativacoes: ativacoes.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch(
  "/modulos-sistema/:unidadeId/:moduloId",
  requireAdminToken,
  async (req, res): Promise<void> => {
    const unidadeId = parseInt(req.params["unidadeId"] ?? "0", 10);
    const moduloId = parseInt(req.params["moduloId"] ?? "0", 10);
    const { ativo } = req.body as { ativo: boolean };

    if (!unidadeId || !moduloId || typeof ativo !== "boolean") {
      res.status(400).json({ error: "unidadeId, moduloId e ativo são obrigatórios" });
      return;
    }

    try {
      const result = await db.execute(sql`
        INSERT INTO unidade_modulos_ativos (unidade_id, modulo_id, ativo, ativado_em, ativado_por)
        VALUES (${unidadeId}, ${moduloId}, ${ativo}, NOW(), 'ceo')
        ON CONFLICT (unidade_id, modulo_id)
        DO UPDATE SET
          ativo = ${ativo},
          ativado_em = NOW(),
          ativado_por = 'ceo'
        RETURNING *
      `);
      res.json(result.rows[0] ?? null);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// COBRANÇAS MENSAIS — tabela cobrancas_mensais_modulos
// ═══════════════════════════════════════════════════════════════════

router.get("/cobrancas-modulos", async (req, res): Promise<void> => {
  const { competencia, unidadeId } = req.query as Record<string, string>;
  try {
    const result = await db.execute(sql`
      SELECT
        cm.id,
        u.nome AS empresa_nome,
        ms.codigo AS modulo_codigo,
        ms.nome AS modulo_nome,
        cm.competencia_mes,
        cm.valor,
        cm.status,
        cm.vencimento,
        cm.pago_em,
        cm.inadimplente_desde,
        cm.criada_em
      FROM cobrancas_mensais_modulos cm
      JOIN unidades u ON u.id = cm.unidade_id
      JOIN modulos_sistema ms ON ms.id = cm.modulo_id
      WHERE TRUE
        ${competencia ? sql`AND cm.competencia_mes = ${competencia}` : sql``}
        ${unidadeId ? sql`AND cm.unidade_id = ${parseInt(unidadeId, 10)}` : sql``}
      ORDER BY cm.competencia_mes DESC, u.nome, ms.nome
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// SUB-AGENDAS — listagem por empresa
// ═══════════════════════════════════════════════════════════════════

router.get("/sub-agendas-admin", async (_req, res): Promise<void> => {
  try {
    const result = await db.execute(sql`
      SELECT
        sa.id,
        sa.unidade_id,
        u.nome AS empresa_nome,
        sa.nome,
        sa.tipo,
        sa.modalidade,
        sa.sala_ou_local,
        sa.profissional_id,
        us.nome AS profissional_nome,
        sa.ativa,
        sa.cor,
        sa.ordem,
        (SELECT COUNT(*) FROM agenda_slots sl
          WHERE sl.unidade_id = sa.unidade_id
            AND sl.profissional_id = sa.profissional_id) AS total_slots
      FROM sub_agendas sa
      JOIN unidades u ON u.id = sa.unidade_id
      LEFT JOIN usuarios us ON us.id = sa.profissional_id
      WHERE sa.unidade_id NOT BETWEEN 1 AND 7
      ORDER BY u.nome, sa.ordem
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
