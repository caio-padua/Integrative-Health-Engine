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
  isGoogleWorkspaceConfigured,
  createGoogleAlias,
  deleteGoogleAlias,
  GoogleWorkspaceNotConfiguredError,
} from "../lib/identidade-emails/googleWorkspaceAdapter.js";

const router: IRouter = Router();

router.get("/email-identity/google-status", async (_req, res): Promise<void> => {
  res.json({
    configured: isGoogleWorkspaceConfigured(),
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
    const catalog = generateClinicEmailCatalog(unidadeId, slug);
    let inserted = 0;
    for (const row of catalog) {
      const r = await db.execute(sql`
        INSERT INTO clinic_email_identity (unidade_id, cargo, modo, hierarquia, email, google_target_user)
        VALUES (${row.unidade_id}, ${row.cargo}, ${row.modo}, ${row.hierarquia}, ${row.email}, ${row.google_target_user})
        ON CONFLICT (unidade_id, cargo, modo, hierarquia) DO NOTHING
        RETURNING id
      `);
      inserted += r.rows.length;
    }
    res.status(201).json({ unidadeId, slug, totalSlots: catalog.length, novosInseridos: inserted });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/email-identity/clinic/:unidadeId", async (req, res): Promise<void> => {
  const unidadeId = parseInt(req.params.unidadeId, 10);
  if (!unidadeId || Number.isNaN(unidadeId)) { res.status(400).json({ error: "unidadeId invalido" }); return; }
  try {
    const r = await db.execute(sql`
      SELECT id, unidade_id, cargo, modo, hierarquia, email, google_target_user, status,
             created_at, selected_at, provisioned_at, disabled_at, last_error
      FROM clinic_email_identity
      WHERE unidade_id = ${unidadeId}
      ORDER BY cargo, modo, hierarquia
    `);
    const stats = {
      total: r.rows.length,
      available: 0, selected: 0, provisioned: 0, disabled: 0, failed: 0,
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
  if (!isGoogleWorkspaceConfigured()) {
    res.status(412).json({
      error: "Google Workspace nao configurado",
      faltam: ["GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_PRIVATE_KEY", "GOOGLE_ADMIN_IMPERSONATION_EMAIL"],
      passos: [
        "1. Ativar Google Workspace para padwards.com.br",
        "2. Verificar dominio + apontar MX para Google",
        "3. Criar conta admin@padwards.com.br",
        "4. Criar 8 usuarios-base (medico@, gestao@, etc)",
        "5. Ativar Admin SDK Directory API no Google Cloud",
        "6. Criar service account com domain-wide delegation",
        "7. Setar as 3 variaveis de ambiente no Replit Secrets"
      ],
    });
    return;
  }
  try {
    const sel = await db.execute(sql`
      SELECT id, email, google_target_user FROM clinic_email_identity
      WHERE unidade_id = ${unidadeId} AND status = 'selected'
    `);
    let success = 0, failed = 0;
    const detalhes: any[] = [];
    for (const item of sel.rows as any[]) {
      try {
        await db.execute(sql`UPDATE clinic_email_identity SET status = 'provisioning' WHERE id = ${item.id}`);
        await createGoogleAlias(item.google_target_user, item.email);
        await db.execute(sql`UPDATE clinic_email_identity SET status = 'provisioned', provisioned_at = NOW(), last_error = NULL WHERE id = ${item.id}`);
        success++;
        detalhes.push({ email: item.email, status: "provisioned" });
      } catch (err: any) {
        const msg = err?.message || String(err);
        await db.execute(sql`UPDATE clinic_email_identity SET status = 'failed', last_error = ${msg} WHERE id = ${item.id}`);
        failed++;
        detalhes.push({ email: item.email, status: "failed", erro: msg });
      }
    }
    res.json({ unidadeId, totalSelecionados: sel.rows.length, success, failed, detalhes });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/email-identity/:id/disable", requireAdminToken, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (!id || Number.isNaN(id)) { res.status(400).json({ error: "id invalido" }); return; }
  try {
    const cur = await db.execute(sql`SELECT email, google_target_user, status FROM clinic_email_identity WHERE id = ${id}`);
    if (cur.rows.length === 0) { res.status(404).json({ error: "Identidade nao encontrada" }); return; }
    const item = cur.rows[0] as any;
    if (item.status === "provisioned" && isGoogleWorkspaceConfigured()) {
      try { await deleteGoogleAlias(item.google_target_user, item.email); } catch (err: any) {
        await db.execute(sql`UPDATE clinic_email_identity SET last_error = ${"Falha ao remover alias no Google: " + (err?.message || String(err))} WHERE id = ${id}`);
      }
    }
    await db.execute(sql`UPDATE clinic_email_identity SET status = 'disabled', disabled_at = NOW() WHERE id = ${id}`);
    res.json({ id, novoStatus: "disabled" });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
