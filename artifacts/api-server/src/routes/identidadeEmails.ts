import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdminToken } from "../middlewares/requireAdminToken.js";
import {
  generateClinicEmailCatalog,
  slugifyClinicName,
  CARGOS,
  MODOS,
  HIERARQUIAS,
  DOMAIN,
  BASE_USERS_BY_CARGO,
} from "../lib/identidade-emails/catalogoGenerator.js";
import {
  getActiveProviderName,
  getEmailProvider,
  ALL_PROVIDERS,
} from "../lib/identidade-emails/providers/factory.js";
import { EmailProviderNotConfiguredError } from "../lib/identidade-emails/providers/types.js";

const router: IRouter = Router();

// Status do provider ativo + diagnóstico de TODOS os providers disponíveis.
router.get("/email-identity/provider-status", async (_req, res): Promise<void> => {
  const activeName = getActiveProviderName();
  const active = getEmailProvider(activeName);
  res.json({
    activeProvider: activeName,
    configured: active.isConfigured(),
    missingEnvVars: active.missingEnvVars(),
    setupSteps: active.setupSteps(),
    domain: DOMAIN,
    baseUsers: BASE_USERS_BY_CARGO,
    cargos: CARGOS,
    modos: MODOS,
    hierarquias: HIERARQUIAS,
    aliasLimitWarning: activeName === 'zoho'
      ? "Zoho limita 30 aliases por conta-base. Cada cargo aguenta ~7-8 clinicas. Apos isso, criar conta-base secundaria (ex: medico2@padwards.com.br)."
      : null,
    allProviders: ALL_PROVIDERS.map((p) => ({
      name: p.name,
      configured: p.isConfigured(),
      missingEnvVars: p.missingEnvVars(),
    })),
  });
});

// Compat com rota antiga (UI ja deployada).
router.get("/email-identity/google-status", async (_req, res): Promise<void> => {
  const active = getEmailProvider();
  res.json({
    configured: active.isConfigured(),
    activeProvider: getActiveProviderName(),
    domain: DOMAIN,
    baseUsers: BASE_USERS_BY_CARGO,
    cargos: CARGOS,
    modos: MODOS,
    hierarquias: HIERARQUIAS,
  });
});

router.post("/email-identity/clinic/:unidadeId/generate", requireAdminToken, async (req, res): Promise<void> => {
  const unidadeId = parseInt(req.params.unidadeId, 10);
  if (!unidadeId || Number.isNaN(unidadeId)) { res.status(400).json({ error: "unidadeId invalido" }); return; }
  try {
    const u = await db.execute(sql`SELECT id, nome, nick FROM unidades WHERE id = ${unidadeId} LIMIT 1`);
    if (u.rows.length === 0) { res.status(404).json({ error: "Unidade nao encontrada" }); return; }
    const unidade = u.rows[0] as any;
    const slug = (unidade.nick && String(unidade.nick).trim()) ? slugifyClinicName(unidade.nick) : slugifyClinicName(unidade.nome);
    const provider = getActiveProviderName();
    const catalog = generateClinicEmailCatalog(unidadeId, slug, provider);
    let inserted = 0;
    for (const row of catalog) {
      const r = await db.execute(sql`
        INSERT INTO clinic_email_identity
          (unidade_id, cargo, modo, hierarquia, email, google_target_user, target_user_email, provider)
        VALUES
          (${row.unidade_id}, ${row.cargo}, ${row.modo}, ${row.hierarquia}, ${row.email},
           ${row.target_user_email}, ${row.target_user_email}, ${row.provider})
        ON CONFLICT (unidade_id, cargo, modo, hierarquia) DO NOTHING
        RETURNING id
      `);
      inserted += r.rows.length;
    }
    res.status(201).json({ unidadeId, slug, provider, totalSlots: catalog.length, novosInseridos: inserted });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/email-identity/clinic/:unidadeId", async (req, res): Promise<void> => {
  const unidadeId = parseInt(req.params.unidadeId, 10);
  if (!unidadeId || Number.isNaN(unidadeId)) { res.status(400).json({ error: "unidadeId invalido" }); return; }
  try {
    const r = await db.execute(sql`
      SELECT id, unidade_id, cargo, modo, hierarquia, email,
             COALESCE(target_user_email, google_target_user) AS target_user_email,
             provider, status,
             created_at, selected_at, provisioned_at, disabled_at, last_error, provider_external_id
      FROM clinic_email_identity
      WHERE unidade_id = ${unidadeId}
      ORDER BY cargo, modo, hierarquia
    `);
    const stats = {
      total: r.rows.length,
      available: 0, selected: 0, provisioning: 0, provisioned: 0, disabled: 0, failed: 0, archived: 0,
    };
    for (const row of r.rows as any[]) {
      if (row.status in stats) (stats as any)[row.status]++;
    }
    res.json({ identidades: r.rows, stats });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

const toggleSchema = z.object({ acao: z.enum(["selecionar", "desselecionar"]) });
router.post("/email-identity/:id/toggle", requireAdminToken, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (!id || Number.isNaN(id)) { res.status(400).json({ error: "id invalido" }); return; }
  const parsed = toggleSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Body invalido", detalhes: parsed.error.flatten() }); return; }
  try {
    const cur = await db.execute(sql`SELECT status FROM clinic_email_identity WHERE id = ${id}`);
    if (cur.rows.length === 0) { res.status(404).json({ error: "Identidade nao encontrada" }); return; }
    const status = (cur.rows[0] as any).status;
    if (parsed.data.acao === "selecionar") {
      if (status !== "available") { res.status(409).json({ error: `Nao pode selecionar (status atual: ${status})` }); return; }
      await db.execute(sql`UPDATE clinic_email_identity SET status = 'selected', selected_at = NOW() WHERE id = ${id}`);
    } else {
      if (status !== "selected") { res.status(409).json({ error: `Nao pode desselecionar (status atual: ${status})` }); return; }
      await db.execute(sql`UPDATE clinic_email_identity SET status = 'available', selected_at = NULL WHERE id = ${id}`);
    }
    res.json({ id, novoStatus: parsed.data.acao === "selecionar" ? "selected" : "available" });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/email-identity/clinic/:unidadeId/provision-selected", requireAdminToken, async (req, res): Promise<void> => {
  const unidadeId = parseInt(req.params.unidadeId, 10);
  if (!unidadeId || Number.isNaN(unidadeId)) { res.status(400).json({ error: "unidadeId invalido" }); return; }
  const provider = getEmailProvider();
  if (!provider.isConfigured()) {
    res.status(412).json({
      error: `Provider de email "${provider.name}" nao configurado`,
      activeProvider: provider.name,
      faltam: provider.missingEnvVars(),
      passos: provider.setupSteps(),
    });
    return;
  }
  try {
    const sel = await db.execute(sql`
      SELECT id, email, cargo,
             COALESCE(target_user_email, google_target_user) AS target_user_email,
             provider_external_id
      FROM clinic_email_identity
      WHERE unidade_id = ${unidadeId} AND status = 'selected'
    `);
    let success = 0, failed = 0;
    const detalhes: any[] = [];
    const slugRow = await db.execute(sql`
      SELECT COALESCE(nick, nome) AS slug_source FROM unidades WHERE id = ${unidadeId}
    `);
    const clinicSlug = slugifyClinicName((slugRow.rows[0] as any)?.slug_source ?? `clinica-${unidadeId}`);
    for (const item of sel.rows as any[]) {
      try {
        await db.execute(sql`UPDATE clinic_email_identity SET status = 'provisioning' WHERE id = ${item.id}`);
        const result = await provider.provisionAlias({
          aliasEmail: item.email,
          targetMailbox: item.target_user_email,
          cargo: item.cargo,
          clinicSlug,
        });
        await db.execute(sql`
          UPDATE clinic_email_identity
          SET status = 'provisioned', provisioned_at = NOW(), last_error = NULL,
              provider_external_id = ${result.externalId ?? null}
          WHERE id = ${item.id}
        `);
        success++;
        detalhes.push({ email: item.email, status: "provisioned", message: result.message });
      } catch (err: any) {
        const msg = err?.message || String(err);
        await db.execute(sql`UPDATE clinic_email_identity SET status = 'failed', last_error = ${msg} WHERE id = ${item.id}`);
        failed++;
        detalhes.push({ email: item.email, status: "failed", erro: msg });
      }
    }
    res.json({ unidadeId, provider: provider.name, totalSelecionados: sel.rows.length, success, failed, detalhes });
  } catch (e: any) {
    if (e instanceof EmailProviderNotConfiguredError) {
      res.status(412).json({ error: e.message, faltam: e.faltam, passos: e.passos });
      return;
    }
    res.status(500).json({ error: e.message });
  }
});

router.post("/email-identity/:id/disable", requireAdminToken, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (!id || Number.isNaN(id)) { res.status(400).json({ error: "id invalido" }); return; }
  try {
    const cur = await db.execute(sql`
      SELECT id, email, cargo, status,
             COALESCE(target_user_email, google_target_user) AS target_user_email,
             provider, provider_external_id
      FROM clinic_email_identity WHERE id = ${id}
    `);
    if (cur.rows.length === 0) { res.status(404).json({ error: "Identidade nao encontrada" }); return; }
    const item = cur.rows[0] as any;
    if (item.status === "provisioned") {
      const provider = getEmailProvider(item.provider);
      if (provider.isConfigured()) {
        try {
          await provider.removeAlias({
            aliasEmail: item.email,
            targetMailbox: item.target_user_email,
            cargo: item.cargo,
            clinicSlug: '',
            externalId: item.provider_external_id,
          });
        } catch (err: any) {
          await db.execute(sql`UPDATE clinic_email_identity SET last_error = ${"Falha ao remover alias no " + item.provider + ": " + (err?.message || String(err))} WHERE id = ${id}`);
        }
      }
    }
    await db.execute(sql`UPDATE clinic_email_identity SET status = 'disabled', disabled_at = NOW() WHERE id = ${id}`);
    res.json({ id, novoStatus: "disabled" });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
