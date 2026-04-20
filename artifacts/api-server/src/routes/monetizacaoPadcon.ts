import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdminToken } from "../middlewares/requireAdminToken.js";

const router: IRouter = Router();

const dispararSchema = z.object({
  unidadeId: z.number().int().positive(),
  eventoCodigo: z.string().min(1).max(32),
  referenciaExterna: z.string().min(1).max(128).optional(),
  metadados: z.record(z.string(), z.any()).optional(),
});

// ═══════════════════════════════════════════════════════════════════
// MÓDULOS PADCON (M1-M7) — catálogo + ativação por unidade
// ═══════════════════════════════════════════════════════════════════

router.get("/modulos-padcon", async (_req, res): Promise<void> => {
  try {
    const result = await db.execute(sql`
      SELECT id, codigo, nome, descricao, preco_mensal, ordem, grupo, ativo
      FROM modulos_padcon
      WHERE ativo = TRUE
      ORDER BY ordem
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/modulos-padcon/matriz", async (_req, res): Promise<void> => {
  try {
    const result = await db.execute(sql`
      SELECT
        u.id AS unidade_id,
        u.nome AS unidade_nome,
        u.cor AS unidade_cor,
        m.id AS modulo_id,
        m.codigo AS modulo_codigo,
        m.nome AS modulo_nome,
        m.preco_mensal,
        m.grupo,
        COALESCE(uma.ativo, FALSE) AS ativo,
        uma.preco_personalizado,
        uma.ativado_em,
        uma.ativado_por
      FROM unidades u
      CROSS JOIN modulos_padcon m
      LEFT JOIN unidade_modulos_ativos uma ON uma.unidade_id = u.id AND uma.modulo_id = m.id
      WHERE u.id NOT BETWEEN 1 AND 7 AND m.ativo = TRUE
      ORDER BY u.id, m.ordem
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/modulos-padcon/ativar/:unidadeId/:moduloId", requireAdminToken, async (req, res): Promise<void> => {
  const { unidadeId, moduloId } = req.params;
  const { ativo, usuario, precoPersonalizado } = req.body ?? {};
  if (typeof ativo !== "boolean") {
    res.status(400).json({ error: "ativo (boolean) obrigatorio" });
    return;
  }
  try {
    const result = await db.execute(sql`
      INSERT INTO unidade_modulos_ativos (unidade_id, modulo_id, ativo, ativado_em, ativado_por, preco_personalizado)
      VALUES (${parseInt(unidadeId, 10)}, ${parseInt(moduloId, 10)}, ${ativo}, NOW(), ${usuario ?? "caio"}, ${precoPersonalizado ?? null})
      ON CONFLICT (unidade_id, modulo_id)
      DO UPDATE SET ativo = ${ativo}, ativado_em = NOW(), ativado_por = ${usuario ?? "caio"},
                    preco_personalizado = COALESCE(${precoPersonalizado ?? null}, unidade_modulos_ativos.preco_personalizado)
      RETURNING *
    `);
    res.json(result.rows[0] ?? null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// EVENTOS COBRÁVEIS (E1-E9) — catálogo + disparo (CORAÇÃO)
// ═══════════════════════════════════════════════════════════════════

router.get("/eventos-cobraveis", async (_req, res): Promise<void> => {
  try {
    const result = await db.execute(sql`
      SELECT id, codigo, nome, descricao, preco_unitario, unidade_medida, grupo, trigger_origem
      FROM eventos_cobraveis WHERE ativo = TRUE ORDER BY codigo
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CORAÇÃO: endpoint genérico que QUALQUER ação interna chama pra registrar consumo
// Hardening: Zod + idempotência via referencia_externa (UNIQUE parcial no DB)
router.post("/eventos-cobraveis/disparar", async (req, res): Promise<void> => {
  const parsed = dispararSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Body invalido", detalhes: parsed.error.flatten() });
    return;
  }
  const { unidadeId, eventoCodigo, referenciaExterna, metadados } = parsed.data;

  try {
    // Idempotência: se já existe lançamento com mesma referência, retorna o existente (200, não 201)
    if (referenciaExterna) {
      const existente = await db.execute(sql`
        SELECT * FROM unidade_eventos_ledger WHERE referencia_externa = ${referenciaExterna} LIMIT 1
      `);
      if (existente.rows.length > 0) {
        res.status(200).json({ ...existente.rows[0], idempotente: true });
        return;
      }
    }

    const evt = await db.execute(sql`
      SELECT id, preco_unitario FROM eventos_cobraveis WHERE codigo = ${eventoCodigo} AND ativo = TRUE
    `);
    if (evt.rows.length === 0) {
      res.status(404).json({ error: `Evento ${eventoCodigo} nao encontrado` });
      return;
    }
    const evento: any = evt.rows[0];

    // Confirma que unidade existe (4xx limpo se não)
    const unid = await db.execute(sql`SELECT id FROM unidades WHERE id = ${unidadeId} LIMIT 1`);
    if (unid.rows.length === 0) {
      res.status(404).json({ error: `Unidade ${unidadeId} nao encontrada` });
      return;
    }

    try {
      const result = await db.execute(sql`
        INSERT INTO unidade_eventos_ledger (unidade_id, evento_id, valor_cobrado, referencia_externa, metadados)
        VALUES (${unidadeId}, ${evento.id}, ${evento.preco_unitario}, ${referenciaExterna ?? null}, ${metadados ? JSON.stringify(metadados) : null}::jsonb)
        RETURNING *
      `);
      res.status(201).json(result.rows[0]);
    } catch (insertErr: any) {
      // Race condition: outra requisição inseriu entre nossa checagem e o INSERT
      if (insertErr.code === "23505" && referenciaExterna) {
        const existente = await db.execute(sql`
          SELECT * FROM unidade_eventos_ledger WHERE referencia_externa = ${referenciaExterna} LIMIT 1
        `);
        res.status(200).json({ ...existente.rows[0], idempotente: true });
        return;
      }
      throw insertErr;
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// LEDGER + FATURAMENTO LIVE
// ═══════════════════════════════════════════════════════════════════

router.get("/ledger/faturamento-live", async (req, res): Promise<void> => {
  const competencia = (req.query.competencia as string) ?? new Date().toISOString().slice(0, 7);
  try {
    const result = await db.execute(sql`
      SELECT
        u.id AS unidade_id,
        u.nome AS unidade_nome,
        u.cor AS unidade_cor,
        e.grupo,
        e.codigo AS evento_codigo,
        e.nome AS evento_nome,
        COUNT(l.id) AS qtd,
        COALESCE(SUM(l.valor_cobrado), 0) AS subtotal
      FROM unidades u
      LEFT JOIN unidade_eventos_ledger l ON l.unidade_id = u.id AND l.competencia_mes = ${competencia}
      LEFT JOIN eventos_cobraveis e ON e.id = l.evento_id
      WHERE u.id NOT BETWEEN 1 AND 7
      GROUP BY u.id, u.nome, u.cor, e.grupo, e.codigo, e.nome
      ORDER BY u.id, e.grupo NULLS LAST, e.codigo NULLS LAST
    `);
    const totaisPorUnidade = await db.execute(sql`
      SELECT
        u.id AS unidade_id,
        u.nome AS unidade_nome,
        COALESCE(SUM(l.valor_cobrado), 0) AS total_eventos,
        (SELECT COALESCE(SUM(m.preco_mensal), 0)
           FROM unidade_modulos_ativos uma
           JOIN modulos_padcon m ON m.id = uma.modulo_id
          WHERE uma.unidade_id = u.id AND uma.ativo = TRUE) AS total_modulos
      FROM unidades u
      LEFT JOIN unidade_eventos_ledger l ON l.unidade_id = u.id AND l.competencia_mes = ${competencia}
      WHERE u.id NOT BETWEEN 1 AND 7
      GROUP BY u.id, u.nome
      ORDER BY u.id
    `);
    res.json({ competencia, detalhe: result.rows, totaisPorUnidade: totaisPorUnidade.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// AGENDAS NUVEM — LIBERAÇÃO POR UNIDADE
// ═══════════════════════════════════════════════════════════════════

router.get("/agendas-nuvem-liberacao", async (_req, res): Promise<void> => {
  try {
    const result = await db.execute(sql`
      SELECT
        u.id AS unidade_id,
        u.nome AS unidade_nome,
        u.cor AS unidade_cor,
        l.agenda_template_codigo,
        l.liberada,
        l.estado,
        l.liberada_em,
        l.liberada_por
      FROM unidades u
      JOIN agendas_nuvem_liberacao l ON l.unidade_id = u.id
      WHERE u.id NOT BETWEEN 1 AND 7
      ORDER BY u.id, l.agenda_template_codigo
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/agendas-nuvem-liberacao/:unidadeId/:templateCodigo", async (req, res): Promise<void> => {
  const { unidadeId, templateCodigo } = req.params;
  const { liberada, estado, usuario } = req.body ?? {};
  try {
    const result = await db.execute(sql`
      UPDATE agendas_nuvem_liberacao
      SET liberada = COALESCE(${liberada ?? null}, liberada),
          estado = COALESCE(${estado ?? null}, estado),
          liberada_em = NOW(),
          liberada_por = ${usuario ?? "caio"}
      WHERE unidade_id = ${parseInt(unidadeId, 10)} AND agenda_template_codigo = ${templateCodigo}
      RETURNING *
    `);
    res.json(result.rows[0] ?? null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// DEMANDAS DE RESOLUÇÃO — Robô / IA / Humano + ping-pong
// ═══════════════════════════════════════════════════════════════════

router.get("/demandas-resolucao", async (req, res): Promise<void> => {
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : null;
  try {
    const result = await db.execute(sql`
      SELECT
        d.*,
        u.nome AS unidade_nome,
        u.cor AS unidade_cor
      FROM demandas_resolucao d
      JOIN unidades u ON u.id = d.unidade_id
      WHERE (${unidadeId}::int IS NULL OR d.unidade_id = ${unidadeId}::int)
      ORDER BY d.criado_em DESC
      LIMIT 200
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/demandas-resolucao", async (req, res): Promise<void> => {
  const { unidadeId, pacienteId, canalOrigem, assunto } = req.body ?? {};
  if (!unidadeId || !canalOrigem) {
    res.status(400).json({ error: "unidadeId e canalOrigem obrigatorios" });
    return;
  }
  try {
    const result = await db.execute(sql`
      INSERT INTO demandas_resolucao (unidade_id, paciente_id, canal_origem, assunto)
      VALUES (${unidadeId}, ${pacienteId ?? null}, ${canalOrigem}, ${assunto ?? null})
      RETURNING *
    `);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/demandas-resolucao/:id/turno", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { autorTipo, autorNome, canal, mensagem, eventoCobravelCodigo } = req.body ?? {};
  if (!autorTipo || !canal) {
    res.status(400).json({ error: "autorTipo e canal obrigatorios" });
    return;
  }
  try {
    const evtId = eventoCobravelCodigo
      ? (await db.execute(sql`SELECT id FROM eventos_cobraveis WHERE codigo = ${eventoCobravelCodigo}`)).rows[0]?.id ?? null
      : null;

    const turnoRes = await db.execute(sql`
      SELECT COALESCE(MAX(turno), 0) + 1 AS proximo FROM pingue_pongue_log WHERE demanda_id = ${id}
    `);
    const turno = (turnoRes.rows[0] as any).proximo;

    const inserted = await db.execute(sql`
      INSERT INTO pingue_pongue_log (demanda_id, turno, autor_tipo, autor_nome, canal, mensagem, evento_cobravel_id)
      VALUES (${id}, ${turno}, ${autorTipo}, ${autorNome ?? null}, ${canal}, ${mensagem ?? null}, ${evtId})
      RETURNING *
    `);

    // Atualiza contador da demanda + dispara evento cobrável se houver
    await db.execute(sql`
      UPDATE demandas_resolucao
      SET turnos_pingue_pongue = turnos_pingue_pongue + 1
      WHERE id = ${id}
    `);

    // Se há evento cobrável: dispara e contabiliza no ledger + valor_total da demanda
    if (evtId) {
      const demanda = (await db.execute(sql`SELECT unidade_id FROM demandas_resolucao WHERE id = ${id}`)).rows[0] as any;
      const evento = (await db.execute(sql`SELECT preco_unitario FROM eventos_cobraveis WHERE id = ${evtId}`)).rows[0] as any;
      await db.execute(sql`
        INSERT INTO unidade_eventos_ledger (unidade_id, evento_id, valor_cobrado, referencia_externa)
        VALUES (${demanda.unidade_id}, ${evtId}, ${evento.preco_unitario}, ${"demanda#" + id})
      `);
      await db.execute(sql`
        UPDATE demandas_resolucao SET valor_total_cobrado = valor_total_cobrado + ${evento.preco_unitario} WHERE id = ${id}
      `);
    }

    res.status(201).json(inserted.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/demandas-resolucao/:id/concluir", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { resolvidoPor, caminhoResolucao } = req.body ?? {};
  if (!resolvidoPor) {
    res.status(400).json({ error: "resolvidoPor (robo/ia/humano) obrigatorio" });
    return;
  }
  try {
    const result = await db.execute(sql`
      UPDATE demandas_resolucao
      SET resolvido = TRUE,
          resolvido_por = ${resolvidoPor},
          resolvido_em = NOW(),
          caminho_resolucao = ${caminhoResolucao ?? null}
      WHERE id = ${id}
      RETURNING *
    `);
    res.json(result.rows[0] ?? null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/demandas-resolucao/:id/timeline", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  try {
    const result = await db.execute(sql`
      SELECT p.*, e.codigo AS evento_codigo, e.preco_unitario AS evento_preco
      FROM pingue_pongue_log p
      LEFT JOIN eventos_cobraveis e ON e.id = p.evento_cobravel_id
      WHERE p.demanda_id = ${id}
      ORDER BY p.turno
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
