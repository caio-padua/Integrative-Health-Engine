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
import { logger } from "../lib/logger.js";

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
 * GET /api/assinaturas/resumo-hoje — Task #35 · resumo diario pra Painel CEO
 *
 * Agrega contagem de solicitacoes na janela ultimas 24h por status:
 *   - enviadas: criadas nas ultimas 24h (qualquer status)
 *   - assinadas: concluidas (CONCLUIDO) nas ultimas 24h
 *   - rejeitadas: REJEITADO nas ultimas 24h
 *   - pendentes: ENVIADO/CRIADO ainda em aberto nas ultimas 24h
 *
 * Mesmo guardMaster da timeline (validador_mestre + master estrito) — banner
 * so aparece pro CEO autenticado, nao vaza contagem pra outros perfis.
 */
router.get("/assinaturas/resumo-hoje", guardMaster, async (_req: Request, res: Response) => {
  try {
    const r = await db.execute(sql`
      WITH janela AS (
        SELECT * FROM assinatura_solicitacoes
        WHERE criado_em >= now() - interval '24 hours'
           OR concluido_em >= now() - interval '24 hours'
      )
      SELECT
        COUNT(*) FILTER (WHERE criado_em >= now() - interval '24 hours')::int            AS enviadas,
        COUNT(*) FILTER (WHERE status = 'CONCLUIDO' AND concluido_em >= now() - interval '24 hours')::int AS assinadas,
        COUNT(*) FILTER (WHERE status = 'REJEITADO' AND criado_em >= now() - interval '24 hours')::int    AS rejeitadas,
        COUNT(*) FILTER (WHERE status IN ('ENVIADO','CRIADO') AND criado_em >= now() - interval '24 hours')::int AS pendentes
      FROM janela
    `);
    const row = ((r as unknown as { rows?: Record<string, unknown>[] }).rows || [])[0] || {
      enviadas: 0, assinadas: 0, rejeitadas: 0, pendentes: 0,
    };
    res.json({
      janela_horas: 24,
      gerado_em: new Date().toISOString(),
      enviadas: Number(row["enviadas"] || 0),
      assinadas: Number(row["assinadas"] || 0),
      rejeitadas: Number(row["rejeitadas"] || 0),
      pendentes: Number(row["pendentes"] || 0),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/assinaturas/:id/signatario/:signatarioId/reenviar — Task #35
 *
 * Reenvia lembrete WhatsApp/email pro signatario via ZapSign
 * (POST /api/v1/docs/{token}/resend/). So funciona se o signatario estiver
 * PENDENTE/ENVIADO ha mais de 24h. Mesmo guardMaster da timeline/detalhe.
 *
 * Em ambiente sem ZAPSIGN_API_TOKEN (mock), apenas registra a tentativa em
 * `assinatura_notificacoes` e retorna `{ ok: true, mock: true }`.
 */
router.post("/assinaturas/:id/signatario/:signatarioId/reenviar", guardMaster, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params["id"]);
    const signatarioId = Number(req.params["signatarioId"]);
    if (!id || !signatarioId) { res.status(400).json({ error: "id e signatarioId obrigatorios" }); return; }

    const sigRow = await db.execute(sql`
      SELECT s.id, s.solicitacao_id, s.status, s.email, s.telefone, s.link_assinatura, s.papel,
             sol.provedor_codigo, sol.provedor_envelope_id, sol.criado_em
      FROM assinatura_signatarios s
      JOIN assinatura_solicitacoes sol ON sol.id = s.solicitacao_id
      WHERE s.id = ${signatarioId} AND s.solicitacao_id = ${id}
    `);
    const sig = ((sigRow as unknown as { rows?: Record<string, unknown>[] }).rows || [])[0];
    if (!sig) { res.status(404).json({ error: "Signatario nao encontrado" }); return; }
    // Enforce explicito server-side: somente PENDENTE ou ENVIADO podem ser
    // reenviados. ASSINADO/REJEITADO/EXPIRADO/qualquer outro = 409 (UI ja
    // esconde o botao, mas backend nao confia em UI).
    if (sig["status"] !== "PENDENTE" && sig["status"] !== "ENVIADO") {
      res.status(409).json({ error: `Signatario com status ${sig["status"]}, reenvio aplicavel apenas a PENDENTE/ENVIADO` });
      return;
    }
    const criadoEm = new Date(String(sig["criado_em"]));
    const horasDesde = (Date.now() - criadoEm.getTime()) / (1000 * 60 * 60);
    if (horasDesde < 24) {
      res.status(409).json({ error: "Signatario tem menos de 24h, aguarde antes de reenviar", horas_desde: Math.round(horasDesde * 10) / 10 });
      return;
    }

    const provedor = String(sig["provedor_codigo"] || "");
    const docToken = String(sig["provedor_envelope_id"] || "");
    const apiToken = process.env["ZAPSIGN_API_TOKEN"] || process.env["ZAPSIGN_TOKEN"];
    const baseUrl = process.env["ZAPSIGN_BASE_URL"] ||
      (process.env["NODE_ENV"] === "production" ? "https://api.zapsign.com.br" : "https://sandbox.api.zapsign.com.br");

    let providerStatus = 0;
    let providerBody: unknown = null;
    let mock = false;
    const isMockEnvelope = docToken.startsWith("MOCK-");

    if (provedor === "zapsign" && apiToken && !isMockEnvelope) {
      // ZapSign resend usa o doc token canonico (provedor_envelope_id), nao
      // parse de URL de signer. Falhar alto se nao houver doc token.
      if (!docToken) {
        res.status(409).json({ error: "Solicitacao sem provedor_envelope_id; resend ZapSign indisponivel" });
        return;
      }
      const r = await fetch(`${baseUrl}/api/v1/docs/${docToken}/resend/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({ resend_type: "whatsapp" }),
      });
      providerStatus = r.status;
      providerBody = await r.text().catch(() => null);
      if (!r.ok) {
        res.status(502).json({ error: `ZapSign resend falhou ${providerStatus}`, body: providerBody });
        return;
      }
    } else if (!apiToken || isMockEnvelope) {
      // Mock so quando ambiente nao tem credencial real OU envelope foi criado
      // em modo MOCK (BaseMockableAdapter). Demais casos = erro explicito.
      mock = true;
    } else {
      res.status(409).json({ error: `Reenvio nao suportado para provedor ${provedor || "(nenhum)"}` });
      return;
    }

    let notificacaoPersistida = true;
    try {
      await db.execute(sql`
        INSERT INTO assinatura_notificacoes (solicitacao_id, canal, momento, destinatario, status, tentativas, enviado_em)
        VALUES (${id}, 'WHATSAPP', 'REENVIO_LEMBRETE_24H', ${String(sig["telefone"] || sig["email"] || "")}, ${mock ? "MOCK" : "ENVIADO"}, 1, now())
      `);
    } catch (err) {
      notificacaoPersistida = false;
      logger.warn(
        { err, solicitacao_id: id, signatario_id: signatarioId, mock },
        "[assinaturas/reenviar] Falha ao persistir notificacao em assinatura_notificacoes (reenvio ZapSign ja foi disparado, registro manual necessario)",
      );
    }

    res.json({ ok: true, mock, provedor, provider_status: providerStatus, notificacao_persistida: notificacaoPersistida });
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
    const sigs = await db.execute(sql`SELECT id, papel, nome, email, ordem, status, link_assinatura, assinado_em FROM assinatura_signatarios WHERE solicitacao_id = ${id} ORDER BY ordem`);
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
