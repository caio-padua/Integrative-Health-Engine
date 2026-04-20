import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdminToken } from "../middlewares/requireAdminToken.js";
import { decifrarCredencial } from "../lib/crypto/credenciais.js";
import { focusAdapter } from "../lib/nfe/adapters/focus.js";
import { enotasAdapter } from "../lib/nfe/adapters/enotas.js";

const router: IRouter = Router();

function getAdapter(codigo: string) {
  if (codigo === "focus_nfe") return focusAdapter;
  if (codigo === "enotas") return enotasAdapter;
  return null;
}

// ═════════════ CATÁLOGO ═════════════
router.get("/provedores-nfe", async (_req, res): Promise<void> => {
  try {
    const r = await db.execute(sql`SELECT * FROM provedores_nfe WHERE ativo = TRUE ORDER BY recomendado DESC, codigo`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/provedores-pagamento", async (_req, res): Promise<void> => {
  try {
    const r = await db.execute(sql`SELECT * FROM provedores_pagamento WHERE ativo = TRUE ORDER BY codigo`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ═════════════ DASH NFe — PAINEL VISUAL ═════════════
router.get("/painel-nfe/dashboard", async (req, res): Promise<void> => {
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : null;
  try {
    const filtro = unidadeId ? sql`WHERE nf.unidade_id = ${unidadeId}` : sql``;
    const stats = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'RASCUNHO') AS rascunho,
        COUNT(*) FILTER (WHERE status = 'EMITIDA') AS emitida,
        COUNT(*) FILTER (WHERE status = 'CANCELADA') AS cancelada,
        COUNT(*) FILTER (WHERE status = 'ERRO') AS erro,
        COALESCE(SUM(valor) FILTER (WHERE status = 'EMITIDA'), 0) AS valor_emitido,
        COALESCE(SUM(valor) FILTER (WHERE status = 'CANCELADA'), 0) AS valor_cancelado
      FROM notas_fiscais_emitidas nf ${filtro}
    `);
    const recentes = await db.execute(sql`
      SELECT nf.id, nf.numero_externo, nf.data_emissao, nf.valor, nf.status, nf.provedor_codigo,
             nf.unidade_id, u.nome AS unidade_nome, u.cor AS unidade_cor,
             p.nome AS paciente_nome, nf.pdf_url, nf.cancelado_em, nf.motivo_cancelamento
      FROM notas_fiscais_emitidas nf
      LEFT JOIN unidades u ON u.id = nf.unidade_id
      LEFT JOIN pacientes p ON p.id = nf.paciente_id
      ${filtro}
      ORDER BY nf.criado_em DESC
      LIMIT 50
    `);
    res.json({ estatisticas: stats.rows[0], recentes: recentes.rows });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ═════════════ EMITIR ═════════════
const emitirSchema = z.object({
  unidadeId: z.number().int().positive(),
  pacienteId: z.number().int().positive(),
  appointmentId: z.number().int().positive().optional(),
  valor: z.number().positive(),
  descricao: z.string().min(10).max(2000),
  categoriaCodigo: z.string().optional(),
  serviceCode: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

router.post("/painel-nfe/emitir", requireAdminToken, async (req, res): Promise<void> => {
  const parsed = emitirSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Body invalido", detalhes: parsed.error.flatten() }); return; }
  const d = parsed.data;
  try {
    const cred = await db.execute(sql`
      SELECT c.*, p.codigo AS provedor FROM unidade_nfe_credenciais c
      JOIN provedores_nfe p ON p.codigo = c.provedor_codigo
      WHERE c.unidade_id = ${d.unidadeId} AND c.ativo = TRUE
      ORDER BY c.cadastrado_em DESC LIMIT 1
    `);
    if (cred.rows.length === 0) { res.status(412).json({ error: "Unidade nao tem credencial NFe cadastrada. Va em Painel NFe > Credenciais." }); return; }
    const c: any = cred.rows[0];

    const pac = await db.execute(sql`SELECT id, nome, cpf FROM pacientes WHERE id = ${d.pacienteId} LIMIT 1`);
    if (pac.rows.length === 0) { res.status(404).json({ error: "Paciente nao encontrado" }); return; }
    const p: any = pac.rows[0];

    const unid = await db.execute(sql`SELECT logotipo_url FROM unidades WHERE id = ${d.unidadeId} LIMIT 1`);
    const logoUrl = (unid.rows[0] as any)?.logotipo_url ?? null;

    const adapter = getAdapter(c.provedor);
    if (!adapter) { res.status(412).json({ error: `Provedor ${c.provedor} sem adapter` }); return; }

    const ref = `PAW-U${d.unidadeId}-N${Date.now()}`;
    const apiKeyClara = decifrarCredencial(c.api_key_cifrada);

    const ins = await db.execute(sql`
      INSERT INTO notas_fiscais_emitidas (paciente_id, appointment_id, unidade_id, numero_externo, valor, descricao_blindada, hash_descricao, status, provedor_codigo, categoria_codigo)
      VALUES (${d.pacienteId}, ${d.appointmentId ?? null}, ${d.unidadeId}, ${ref}, ${d.valor}, ${d.descricao}, ${"sha-" + Date.now()}, 'RASCUNHO', ${c.provedor}, ${d.categoriaCodigo ?? null})
      RETURNING id
    `);
    const nfId = (ins.rows[0] as any).id;

    const result = await adapter.emitir({
      unidadeId: d.unidadeId,
      pacienteNome: p.nome,
      pacienteCpf: p.cpf,
      valor: d.valor,
      descricao: d.descricao,
      serviceCode: d.serviceCode,
      numeroExterno: ref,
      logotipoUrl: logoUrl,
      cnpjEmissor: c.cnpj_emissor,
      inscricaoMunicipal: c.inscricao_municipal,
      ambiente: c.ambiente,
      apiKey: apiKeyClara,
      metadata: { ...(c.metadata ?? {}), ...(d.metadata ?? {}) },
    });

    await db.execute(sql`
      UPDATE notas_fiscais_emitidas
      SET status = ${result.status === "EMITIDA" ? "EMITIDA" : result.status === "ERRO" ? "ERRO" : "RASCUNHO"},
          pdf_url = ${result.pdfUrl ?? null},
          xml_url = ${result.xmlUrl ?? null},
          payload_provedor = ${JSON.stringify(result.payloadProvedor ?? {})}::jsonb,
          atualizado_em = NOW()
      WHERE id = ${nfId}
    `);

    await db.execute(sql`
      INSERT INTO nota_fiscal_eventos (nf_id, tipo_evento, descricao, payload, responsavel)
      VALUES (${nfId}, 'EMISSAO', ${result.sucesso ? "Emitida via " + c.provedor : "Erro: " + (result.mensagem ?? "?")},
              ${JSON.stringify({ resultado: result, ref })}::jsonb, 'admin')
    `);

    res.status(result.sucesso ? 201 : 502).json({ nfId, ref, ...result });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ═════════════ CANCELAR ═════════════
const cancelarSchema = z.object({ motivo: z.string().min(10).max(255) });

router.post("/painel-nfe/:id/cancelar", requireAdminToken, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "id invalido" }); return; }
  const parsed = cancelarSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "motivo obrigatorio (10-255 chars)", detalhes: parsed.error.flatten() }); return; }

  try {
    const nf = await db.execute(sql`SELECT * FROM notas_fiscais_emitidas WHERE id = ${id} LIMIT 1`);
    if (nf.rows.length === 0) { res.status(404).json({ error: "NF nao encontrada" }); return; }
    const n: any = nf.rows[0];
    if (n.status === "CANCELADA") { res.status(409).json({ error: "NF ja esta cancelada" }); return; }
    if (!n.unidade_id || !n.provedor_codigo || !n.numero_externo) {
      res.status(412).json({ error: "NF sem unidade/provedor/numero_externo (rascunho local). Use DELETE /painel-nfe/:id" });
      return;
    }
    const cred = await db.execute(sql`
      SELECT * FROM unidade_nfe_credenciais
      WHERE unidade_id = ${n.unidade_id} AND provedor_codigo = ${n.provedor_codigo} AND ativo = TRUE LIMIT 1
    `);
    if (cred.rows.length === 0) { res.status(412).json({ error: "Credencial nao cadastrada" }); return; }
    const c: any = cred.rows[0];

    const adapter = getAdapter(c.provedor_codigo);
    if (!adapter) { res.status(412).json({ error: "Adapter ausente" }); return; }

    const result = await adapter.cancelar({
      numeroExterno: n.numero_externo,
      motivo: parsed.data.motivo,
      apiKey: decifrarCredencial(c.api_key_cifrada),
      ambiente: c.ambiente,
    });

    if (!result.sucesso) {
      await db.execute(sql`
        INSERT INTO nota_fiscal_eventos (nf_id, tipo_evento, descricao, payload, responsavel)
        VALUES (${id}, 'CANCELAMENTO_FALHOU', ${result.mensagem ?? "?"}, ${JSON.stringify(result)}::jsonb, 'admin')
      `);
      res.status(502).json({ error: "Falha ao cancelar no provedor", detalhes: result }); return;
    }

    await db.execute(sql`
      UPDATE notas_fiscais_emitidas
      SET status = 'CANCELADA', cancelado_em = NOW(), cancelado_por = 'admin', motivo_cancelamento = ${parsed.data.motivo}, atualizado_em = NOW()
      WHERE id = ${id}
    `);
    await db.execute(sql`
      INSERT INTO nota_fiscal_eventos (nf_id, tipo_evento, descricao, payload, responsavel)
      VALUES (${id}, 'CANCELAMENTO', ${"Motivo: " + parsed.data.motivo}, ${JSON.stringify(result)}::jsonb, 'admin')
    `);
    res.json({ sucesso: true, id, ...result });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ═════════════ EDITAR (só rascunho) ═════════════
router.patch("/painel-nfe/:id", requireAdminToken, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "id invalido" }); return; }
  const { descricao, valor, categoriaCodigo } = req.body ?? {};
  try {
    const nf = await db.execute(sql`SELECT status FROM notas_fiscais_emitidas WHERE id = ${id} LIMIT 1`);
    if (nf.rows.length === 0) { res.status(404).json({ error: "NF nao encontrada" }); return; }
    if ((nf.rows[0] as any).status !== "RASCUNHO") { res.status(409).json({ error: "Edicao permitida apenas em RASCUNHO. Para emitidas, use cancelamento + reemissao." }); return; }

    const r = await db.execute(sql`
      UPDATE notas_fiscais_emitidas SET
        descricao_blindada = COALESCE(${descricao ?? null}, descricao_blindada),
        valor = COALESCE(${valor ?? null}, valor),
        categoria_codigo = COALESCE(${categoriaCodigo ?? null}, categoria_codigo),
        atualizado_em = NOW()
      WHERE id = ${id} RETURNING *
    `);
    await db.execute(sql`
      INSERT INTO nota_fiscal_eventos (nf_id, tipo_evento, descricao, payload, responsavel)
      VALUES (${id}, 'EDICAO_RASCUNHO', 'Campos editados antes da emissao', ${JSON.stringify(req.body ?? {})}::jsonb, 'admin')
    `);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ═════════════ APAGAR (só rascunho) ═════════════
router.delete("/painel-nfe/:id", requireAdminToken, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "id invalido" }); return; }
  try {
    const nf = await db.execute(sql`SELECT status FROM notas_fiscais_emitidas WHERE id = ${id} LIMIT 1`);
    if (nf.rows.length === 0) { res.status(404).json({ error: "NF nao encontrada" }); return; }
    if ((nf.rows[0] as any).status !== "RASCUNHO") { res.status(409).json({ error: "Apagar so permitido em RASCUNHO. Para emitidas, cancele." }); return; }
    await db.execute(sql`DELETE FROM nota_fiscal_eventos WHERE nf_id = ${id}`);
    await db.execute(sql`DELETE FROM notas_fiscais_emitidas WHERE id = ${id}`);
    res.json({ sucesso: true, id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ═════════════ TIMELINE ═════════════
router.get("/painel-nfe/:id/eventos", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "id invalido" }); return; }
  try {
    const r = await db.execute(sql`SELECT * FROM nota_fiscal_eventos WHERE nf_id = ${id} ORDER BY ocorrido_em DESC`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
