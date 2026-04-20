import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdminToken } from "../middlewares/requireAdminToken.js";
import { cifrarCredencial, mascararCredencial, decifrarCredencial } from "../lib/crypto/credenciais.js";

const router: IRouter = Router();

// ═════════════ GATEWAY DE PAGAMENTO ═════════════
const gatewayCredSchema = z.object({
  unidadeId: z.number().int().positive(),
  provedorCodigo: z.enum(["asaas", "stripe", "mercadopago", "infinitpay", "vindi"]),
  ambiente: z.enum(["sandbox", "producao"]).default("sandbox"),
  apiKey: z.string().min(8).max(2048),
  webhookSecret: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

router.post("/credenciais/gateway", requireAdminToken, async (req, res): Promise<void> => {
  const parsed = gatewayCredSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Body invalido", detalhes: parsed.error.flatten() }); return; }
  const d = parsed.data;
  try {
    const cifrada = cifrarCredencial(d.apiKey);
    const r = await db.execute(sql`
      INSERT INTO unidade_gateway_credenciais (unidade_id, provedor_codigo, ambiente, api_key_cifrada, webhook_secret, metadata, cadastrado_por)
      VALUES (${d.unidadeId}, ${d.provedorCodigo}, ${d.ambiente}, ${cifrada}, ${d.webhookSecret ?? null}, ${d.metadata ? JSON.stringify(d.metadata) : null}::jsonb, 'admin')
      ON CONFLICT (unidade_id, provedor_codigo, ambiente) DO UPDATE SET
        api_key_cifrada = EXCLUDED.api_key_cifrada,
        webhook_secret = EXCLUDED.webhook_secret,
        metadata = EXCLUDED.metadata,
        ativo = TRUE,
        cadastrado_em = NOW()
      RETURNING id, unidade_id, provedor_codigo, ambiente, ativo, cadastrado_em
    `);
    res.status(201).json({ ...r.rows[0], apiKeyMasked: mascararCredencial(d.apiKey) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/credenciais/gateway", async (req, res): Promise<void> => {
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : null;
  try {
    const r = await db.execute(sql`
      SELECT c.id, c.unidade_id, u.nome AS unidade_nome, u.cor AS unidade_cor,
             c.provedor_codigo, p.nome_exibicao AS provedor_nome,
             c.ambiente, c.api_key_cifrada, c.ativo, c.cadastrado_em
      FROM unidade_gateway_credenciais c
      JOIN unidades u ON u.id = c.unidade_id
      JOIN provedores_pagamento p ON p.codigo = c.provedor_codigo
      ${unidadeId ? sql`WHERE c.unidade_id = ${unidadeId}` : sql``}
      ORDER BY c.unidade_id, c.provedor_codigo
    `);
    const rows = (r.rows as any[]).map((row) => ({
      ...row,
      api_key_cifrada: undefined,
      apiKeyMasked: mascararCredencial(decifrarCredencial(row.api_key_cifrada)),
    }));
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/credenciais/gateway/:id", requireAdminToken, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "id invalido" }); return; }
  try {
    await db.execute(sql`UPDATE unidade_gateway_credenciais SET ativo = FALSE WHERE id = ${id}`);
    res.json({ sucesso: true, id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ═════════════ NFe ═════════════
const nfeCredSchema = z.object({
  unidadeId: z.number().int().positive(),
  provedorCodigo: z.enum(["focus_nfe", "enotas"]),
  ambiente: z.enum(["homologacao", "producao"]).default("homologacao"),
  apiKey: z.string().min(8).max(2048),
  cnpjEmissor: z.string().min(14).max(20).optional(),
  inscricaoMunicipal: z.string().max(40).optional(),
  certificadoA1Url: z.string().url().optional(),
  certificadoSenha: z.string().min(1).max(120).optional(),
  webhookSecret: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

router.post("/credenciais/nfe", requireAdminToken, async (req, res): Promise<void> => {
  const parsed = nfeCredSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Body invalido", detalhes: parsed.error.flatten() }); return; }
  const d = parsed.data;
  try {
    const apiCif = cifrarCredencial(d.apiKey);
    const senhaCif = d.certificadoSenha ? cifrarCredencial(d.certificadoSenha) : null;
    const r = await db.execute(sql`
      INSERT INTO unidade_nfe_credenciais
        (unidade_id, provedor_codigo, ambiente, api_key_cifrada, certificado_a1_url, certificado_senha_cifrada, cnpj_emissor, inscricao_municipal, webhook_secret, metadata, cadastrado_por)
      VALUES (${d.unidadeId}, ${d.provedorCodigo}, ${d.ambiente}, ${apiCif}, ${d.certificadoA1Url ?? null}, ${senhaCif}, ${d.cnpjEmissor ?? null}, ${d.inscricaoMunicipal ?? null}, ${d.webhookSecret ?? null}, ${d.metadata ? JSON.stringify(d.metadata) : null}::jsonb, 'admin')
      ON CONFLICT (unidade_id, provedor_codigo, ambiente) DO UPDATE SET
        api_key_cifrada = EXCLUDED.api_key_cifrada,
        certificado_a1_url = EXCLUDED.certificado_a1_url,
        certificado_senha_cifrada = EXCLUDED.certificado_senha_cifrada,
        cnpj_emissor = EXCLUDED.cnpj_emissor,
        inscricao_municipal = EXCLUDED.inscricao_municipal,
        webhook_secret = EXCLUDED.webhook_secret,
        metadata = EXCLUDED.metadata,
        ativo = TRUE,
        cadastrado_em = NOW()
      RETURNING id, unidade_id, provedor_codigo, ambiente, ativo, cadastrado_em
    `);
    res.status(201).json({ ...r.rows[0], apiKeyMasked: mascararCredencial(d.apiKey) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/credenciais/nfe", async (req, res): Promise<void> => {
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : null;
  try {
    const r = await db.execute(sql`
      SELECT c.id, c.unidade_id, u.nome AS unidade_nome, u.cor AS unidade_cor,
             c.provedor_codigo, p.nome_exibicao AS provedor_nome,
             c.ambiente, c.api_key_cifrada, c.cnpj_emissor, c.inscricao_municipal,
             c.certificado_a1_url, c.ativo, c.cadastrado_em
      FROM unidade_nfe_credenciais c
      JOIN unidades u ON u.id = c.unidade_id
      JOIN provedores_nfe p ON p.codigo = c.provedor_codigo
      ${unidadeId ? sql`WHERE c.unidade_id = ${unidadeId}` : sql``}
      ORDER BY c.unidade_id, c.provedor_codigo
    `);
    const rows = (r.rows as any[]).map((row) => ({
      ...row,
      api_key_cifrada: undefined,
      apiKeyMasked: mascararCredencial(decifrarCredencial(row.api_key_cifrada)),
    }));
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ═════════════ LOGOTIPO DA CLINICA ═════════════
const logoSchema = z.object({
  unidadeId: z.number().int().positive(),
  logotipoUrl: z.string().url().max(2048),
});

router.put("/credenciais/logo", requireAdminToken, async (req, res): Promise<void> => {
  const parsed = logoSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Body invalido", detalhes: parsed.error.flatten() }); return; }
  try {
    const r = await db.execute(sql`
      UPDATE unidades SET logotipo_url = ${parsed.data.logotipoUrl}, logotipo_atualizado_em = NOW()
      WHERE id = ${parsed.data.unidadeId}
      RETURNING id, nome, logotipo_url, logotipo_atualizado_em
    `);
    if (r.rows.length === 0) { res.status(404).json({ error: "Unidade nao encontrada" }); return; }
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/credenciais/logo", async (_req, res): Promise<void> => {
  try {
    const r = await db.execute(sql`
      SELECT id, nome, cor, logotipo_url, logotipo_atualizado_em
      FROM unidades WHERE id NOT BETWEEN 1 AND 7 ORDER BY id
    `);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
