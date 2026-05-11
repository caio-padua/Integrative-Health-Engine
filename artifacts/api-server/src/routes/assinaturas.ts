/**
 * Rotas REST do modulo Assinatura Digital.
 * Expoe as 5 operacoes basicas + 2 webhooks (clicksign/zapsign).
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { assinaturaService } from "../lib/assinatura/service";
import type { ProvedorCodigo } from "../lib/assinatura/types";
import { requireRole as _requireRole } from "../middlewares/requireRole.js";
import { requireMasterEstrito as _requireMaster } from "../middlewares/requireMasterEstrito.js";

const router: IRouter = Router();

// Wave 10 F5 · gate alinhado ao padrao parq.ts (validador_mestre + master estrito).
// Endpoints que retornam manifesto SHA-256, IP, geo e CPF integral DEVEM
// passar por aqui — caso contrario abrem IDOR cross-tenant + vazamento PII.
const guardMaster = [_requireRole("validador_mestre"), _requireMaster];

// Mascaramento server-side defensivo (mesmo com guardMaster acima, principio
// de menor exposicao: CPF e IP completos viram log de auditoria, nao payload
// rotineiro de tela). Se um dia precisar de versao "raw" para forensics,
// criar endpoint dedicado /assinaturas/:id/forense com auditoria propria.
function mascararCpfServer(cpf: string | null | undefined): string {
  if (!cpf) return "";
  const limpo = cpf.replace(/\D/g, "");
  if (limpo.length < 11) return "***";
  return `${limpo.slice(0, 3)}.***.***-${limpo.slice(-2)}`;
}

function mascararIpServer(ip: string | null | undefined): string {
  if (!ip) return "";
  // IPv4: mantem 2 primeiros octetos; IPv6: mantem prefixo /32
  if (ip.includes(".")) {
    const partes = ip.split(".");
    if (partes.length === 4) return `${partes[0]}.${partes[1]}.***.***`;
  }
  if (ip.includes(":")) {
    const partes = ip.split(":");
    return partes.slice(0, 2).join(":") + ":****::***";
  }
  return "***";
}

function reduzirGeoServer(geo: unknown): Record<string, unknown> | null {
  if (!geo || typeof geo !== "object") return null;
  const g = geo as Record<string, unknown>;
  return {
    city: g["city"] ?? null,
    region: g["region"] ?? g["state"] ?? null,
    country: g["country"] ?? null,
    // lat/lng raw NAO expostos — somente cidade/estado/pais.
  };
}

/** GET /api/assinaturas/config — toggles + provedores + textos */
router.get("/assinaturas/config", async (_req: Request, res: Response) => {
  const [toggles, provedores, textos] = await Promise.all([
    db.execute(sql`SELECT * FROM assinatura_toggles_admin WHERE id = 1`),
    db.execute(sql`SELECT codigo, nome, prioridade, is_principal, is_failover, recomendado_pelo_manifesto, status_integracao FROM provedores_assinatura_digital ORDER BY prioridade`),
    db.execute(sql`SELECT codigo, canal, momento, assunto FROM assinatura_textos_institucionais WHERE ativo = true ORDER BY codigo`),
  ]);
  res.json({
    toggles: ((toggles as unknown as { rows?: unknown[] }).rows || [])[0],
    provedores: (provedores as unknown as { rows?: unknown[] }).rows || [],
    textos: (textos as unknown as { rows?: unknown[] }).rows || [],
  });
});

/** GET /api/assinaturas/templates — catalogo de templates */
router.get("/assinaturas/templates", async (_req: Request, res: Response) => {
  const r = await db.execute(sql`SELECT id, codigo, nome_exibicao, tipo_documento, categoria, exige_medico, exige_testemunhas, exige_clinica, ativo FROM assinatura_templates ORDER BY id`);
  res.json({ templates: (r as unknown as { rows?: unknown[] }).rows || [] });
});

/** GET /api/assinaturas/testemunhas — lista testemunhas + pares */
router.get("/assinaturas/testemunhas", async (_req: Request, res: Response) => {
  const [testemunhas, pares] = await Promise.all([
    db.execute(sql`SELECT id, nome_completo, cargo, par_preferencial, ordem_assinatura, ativa FROM assinatura_testemunhas ORDER BY id`),
    db.execute(sql`SELECT p.id, p.nome_par, p.uso_padrao, ta.nome_completo as testemunha_a, tb.nome_completo as testemunha_b
                   FROM assinatura_pares_testemunhas p
                   JOIN assinatura_testemunhas ta ON ta.id = p.testemunha_a_id
                   JOIN assinatura_testemunhas tb ON tb.id = p.testemunha_b_id
                   ORDER BY p.id`),
  ]);
  res.json({
    testemunhas: (testemunhas as unknown as { rows?: unknown[] }).rows || [],
    pares: (pares as unknown as { rows?: unknown[] }).rows || [],
  });
});

/** PATCH /api/assinaturas/toggles — atualiza singleton */
router.patch("/assinaturas/toggles", async (req: Request, res: Response) => {
  const allowed = [
    "provedor_principal_codigo", "provedor_failover_codigo", "failover_automatico",
    "exigir_assinatura_medico", "exigir_testemunhas", "modo_testemunhas", "par_fixo_id",
    "enviar_por_email", "enviar_por_whatsapp", "arquivar_no_drive",
  ];
  const updates: string[] = [];
  const body = req.body as Record<string, unknown>;
  for (const k of allowed) {
    if (k in body) updates.push(`${k} = ${typeof body[k] === "string" ? `'${(body[k] as string).replace(/'/g, "''")}'` : body[k]}`);
  }
  if (updates.length === 0) { res.status(400).json({ error: "Nenhum campo valido enviado" }); return; }
  await db.execute(sql.raw(`UPDATE assinatura_toggles_admin SET ${updates.join(", ")}, atualizado_em = now() WHERE id = 1`));
  const r = await db.execute(sql`SELECT * FROM assinatura_toggles_admin WHERE id = 1`);
  res.json({ ok: true, toggles: ((r as unknown as { rows?: unknown[] }).rows || [])[0] });
});

/** POST /api/assinaturas/enviar — orquestra hidratacao + envio + persistencia */
router.post("/assinaturas/enviar", async (req: Request, res: Response) => {
  try {
    const { pacienteId, templateCodigo, procedimento, valorOrcamento, riscos, forcarProvedor, canais } = req.body as Record<string, unknown>;
    if (!pacienteId || !templateCodigo) { res.status(400).json({ error: "pacienteId e templateCodigo obrigatorios" }); return; }
    const result = await assinaturaService.enviar({
      pacienteId: Number(pacienteId), templateCodigo: String(templateCodigo),
      procedimento: procedimento as string | undefined, valorOrcamento: valorOrcamento as string | undefined, riscos: riscos as string | undefined,
      forcarProvedor: forcarProvedor as ProvedorCodigo | undefined, canais: canais as ("EMAIL" | "WHATSAPP" | "DRIVE")[] | undefined,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/assinaturas/timeline — Wave 10 F5 · ultimas 50 solicitacoes enriquecidas
 *
 * Endpoint dedicado ao frontend `/assinaturas/timeline` (validador_mestre + admin).
 * Retorna agregado pronto pra tabela: template, paciente, status, contagem de
 * signatarios, data envio/conclusao, envelope ZapSign, marcador de auditoria.
 *
 * IMPORTANTE: declarado ANTES de `/assinaturas/:id` por causa do match em ordem
 * do express — senao /timeline cairia no handler dinamico.
 */
router.get("/assinaturas/timeline", guardMaster, async (_req: Request, res: Response) => {
  try {
    const r = await db.execute(sql`
      SELECT
        s.id,
        s.status,
        s.provedor_codigo,
        s.provedor_envelope_id,
        s.criado_em,
        s.enviado_em,
        s.concluido_em,
        s.expira_em,
        s.zapsign_external_id,
        t.codigo                     AS template_codigo,
        t.nome_exibicao              AS template_nome,
        t.tipo_documento             AS template_tipo,
        s.paciente_id,
        p.nome                       AS paciente_nome,
        (
          SELECT COUNT(*)::int FROM assinatura_signatarios sg
          WHERE sg.solicitacao_id = s.id
        ) AS signatarios_total,
        (
          SELECT COUNT(*)::int FROM assinatura_signatarios sg
          WHERE sg.solicitacao_id = s.id AND sg.status = 'ASSINADO'
        ) AS signatarios_assinados,
        (
          SELECT COUNT(*)::int FROM auditoria_assinaturas a
          WHERE a.solicitacao_id = s.id
        ) AS auditoria_eventos
      FROM assinatura_solicitacoes s
      JOIN assinatura_templates t   ON t.id = s.template_id
      LEFT JOIN pacientes p         ON p.id = s.paciente_id
      ORDER BY s.id DESC
      LIMIT 50
    `);
    const rows = (r as unknown as { rows?: unknown[] }).rows || [];
    res.json({ solicitacoes: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** GET /api/assinaturas/:id — status atual (pull live no provedor se ainda nao concluido)
 *  Wave 10 F5: gate master + mascaramento PII server-side (CPF, IP, geo). */
router.get("/assinaturas/:id", guardMaster, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params["id"]);
    const status = await assinaturaService.consultarStatus(id);
    const detalhes = await db.execute(sql`
      SELECT s.id, s.paciente_id, p.nome as paciente_nome, t.codigo as template, t.nome_exibicao as template_nome, s.provedor_codigo, s.provedor_envelope_id, s.zapsign_external_id, s.status, s.criado_em, s.enviado_em, s.concluido_em, s.expira_em, s.pdf_assinado_url, s.canais_distribuir, s.metadata
      FROM assinatura_solicitacoes s
      JOIN assinatura_templates t ON t.id = s.template_id
      LEFT JOIN pacientes p ON p.id = s.paciente_id
      WHERE s.id = ${id}
    `);
    const sigs = await db.execute(sql`SELECT papel, nome, email, ordem, status, link_assinatura, assinado_em FROM assinatura_signatarios WHERE solicitacao_id = ${id} ORDER BY ordem`);
    const notifs = await db.execute(sql`SELECT canal, momento, destinatario, status, tentativas, enviado_em FROM assinatura_notificacoes WHERE solicitacao_id = ${id} ORDER BY id`);
    // Wave 10 F5: junta auditoria (manifesto SHA-256 + IP + geo + auth_method) por signatario
    const audit = await db.execute(sql`
      SELECT signature_id, signer_papel, signer_name, signer_cpf, signer_ip::text AS signer_ip, signer_geo, auth_method, document_hash_sha256, document_hash_assinado, icp_brasil_serial, icp_brasil_ac, validation_url, pdf_storage_key, timestamp_utc, criado_em
      FROM auditoria_assinaturas
      WHERE solicitacao_id = ${id}
      ORDER BY timestamp_utc
    `);
    const auditoriaRaw = (audit as unknown as { rows?: Record<string, unknown>[] }).rows || [];
    const auditoria = auditoriaRaw.map((row) => ({
      ...row,
      signer_cpf: mascararCpfServer(row["signer_cpf"] as string | null),
      signer_ip: mascararIpServer(row["signer_ip"] as string | null),
      signer_geo: reduzirGeoServer(row["signer_geo"]),
    }));
    res.json({
      live: status,
      solicitacao: ((detalhes as unknown as { rows?: unknown[] }).rows || [])[0],
      signatarios: (sigs as unknown as { rows?: unknown[] }).rows || [],
      notificacoes: (notifs as unknown as { rows?: unknown[] }).rows || [],
      auditoria,
    });
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

/** GET /api/assinaturas — lista (filtros opcionais paciente_id, status) */
router.get("/assinaturas", async (req: Request, res: Response) => {
  const filtros: string[] = ["1=1"];
  if (req.query["paciente_id"]) filtros.push(`paciente_id = ${Number(req.query["paciente_id"])}`);
  if (req.query["status"]) filtros.push(`status = '${String(req.query["status"]).replace(/'/g, "")}'`);
  const r = await db.execute(sql.raw(`
    SELECT id, paciente_id, template_id, provedor_codigo, status, criado_em, concluido_em
    FROM assinatura_solicitacoes WHERE ${filtros.join(" AND ")} ORDER BY id DESC LIMIT 100
  `));
  res.json({ solicitacoes: (r as unknown as { rows?: unknown[] }).rows || [] });
});

export default router;
