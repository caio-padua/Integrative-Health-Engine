// ════════════════════════════════════════════════════════════════════
// PAWARDS MEDCORE · Wave 9 PARQ — Parceria de Qualidade
// Substituição jurídica de "comissão" por contraprestação Kaizen bimestral
// (CFM 2.386/2024 + CC 593-609 + STJ REsp 2.159.442/PR).
//
// 14 endpoints. Schema 100% alinhado a Migration 030 (sem ALTER adicional).
// Auth dupla: requireAuth (JWT user) + requireRole/requireMasterEstrito
// pra rotas administrativas. Multi-tenant via JwtPayload.unidadeId.
//
// Modalidades de assinatura suportadas (parq_assinatura_tipo enum):
//   icp_brasil_clinica, icp_brasil_farmacia, docusign, clicksign,
//   otp_email, otp_sms, manuscrita_upload, aceite_ip_geo
//
// OTP é mantido em memória (TTL 10min) — sem ALTER schema.
// ════════════════════════════════════════════════════════════════════
import { Router, type Request } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import * as crypto from "node:crypto";
import { requireRole as _requireRole } from "../middlewares/requireRole.js";
import { requireMasterEstrito as _requireMaster } from "../middlewares/requireMasterEstrito.js";
import { gerarTermoPARQ, type DadosTermoPARQ } from "../pdf/gerarTermoPARQ.js";
import { enviarPARQ } from "../lib/assinatura/use-cases/enviarPARQ.js";

const router = Router();
const guardMaster = [_requireRole("validador_mestre"), _requireMaster];

// ════════ Helpers ════════

function getUnidadeId(req: Request): number | null {
  return (req as any).user?.unidadeId ?? null;
}
function getUserId(req: Request): number | null {
  return (req as any).user?.sub ?? null;
}
function getClientIp(req: Request): string {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string") return xf.split(",")[0].trim();
  return req.ip ?? "0.0.0.0";
}

function gerarNumeroSerie(): string {
  const ym = new Date().toISOString().slice(0, 7).replace("-", "");
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `PARQ-${ym}-${rand}`;
}

function calcularSha256Acordo(acordo: any): string {
  const payload = JSON.stringify({
    id: acordo.id,
    numero_serie: acordo.numero_serie,
    farmacia_id: acordo.farmacia_id,
    unidade_id: acordo.unidade_id,
    versao_termo: acordo.versao_termo,
    emitido_em: acordo.emitido_em,
  });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function tsServerIso(): string {
  // 30 chars: 2026-04-25T12:34:56.789+00:00 → 29 chars; padroniza pra 30
  return new Date().toISOString().padEnd(30, " ").slice(0, 30);
}

// OTP em memória (TTL 10min) — sem ALTER schema
type OtpEntry = { hash: string; expira: number; canal: "email" | "sms"; destinatario: string };
const otpStore = new Map<number, OtpEntry>();
function otpCleanup() {
  const now = Date.now();
  for (const [k, v] of otpStore) if (v.expira < now) otpStore.delete(k);
}

/**
 * Helper compartilhado: registra assinatura em parq_assinaturas_farmacia_log
 * e atualiza parq_acordos com sha256_hash + dados do lado assinado.
 */
async function registrarAssinatura(params: {
  acordoId: number;
  tipo: string;
  signatarioNome: string;
  signatarioEmail: string | null;
  ip: string;
  userAgent: string;
  payloadValidacao: Record<string, any>;
  ladoAssinatura: "clinica" | "farmacia";
  certificadoClinicaCpfCnpj?: string | null;
  certificadoClinicaSerial?: string | null;
}): Promise<{ sha256Hash: string; assinaturaId: number }> {
  const acordoQ = await db.execute(sql`
    SELECT * FROM parq_acordos WHERE id = ${params.acordoId} LIMIT 1
  `);
  const a = (acordoQ.rows ?? acordoQ)[0] as any;
  if (!a) throw new Error("Acordo não encontrado");

  const sha256Hash = a.sha256_hash || calcularSha256Acordo(a);
  const tsIso = tsServerIso();

  const payloadCompleto = {
    ...params.payloadValidacao,
    signatario_nome: params.signatarioNome,
    signatario_email: params.signatarioEmail,
    ip_address: params.ip,
    user_agent: params.userAgent,
    lado: params.ladoAssinatura,
    timestamp_server_iso: tsIso,
  };

  const ins = await db.execute(sql`
    INSERT INTO parq_assinaturas_farmacia_log
      (acordo_id, tipo_assinatura, payload_evidencia,
       sha256_documento_assinado, timestamp_server_iso, valido,
       observacoes, created_at)
    VALUES
      (${params.acordoId}, ${params.tipo}::parq_assinatura_tipo,
       ${JSON.stringify(payloadCompleto)}::jsonb, ${sha256Hash},
       ${tsIso}, true, ${`Assinatura ${params.ladoAssinatura} via ${params.tipo}`},
       NOW())
    RETURNING id
  `);
  const assinaturaId = ((ins.rows ?? ins)[0] as any).id;

  if (params.ladoAssinatura === "clinica") {
    await db.execute(sql`
      UPDATE parq_acordos
      SET sha256_hash = ${sha256Hash},
          certificado_clinica_data = NOW(),
          certificado_clinica_cpf_cnpj = COALESCE(${params.certificadoClinicaCpfCnpj ?? null}, certificado_clinica_cpf_cnpj),
          certificado_clinica_serial = COALESCE(${params.certificadoClinicaSerial ?? null}, certificado_clinica_serial),
          updated_at = NOW()
      WHERE id = ${params.acordoId}
    `);
  } else {
    await db.execute(sql`
      UPDATE parq_acordos
      SET sha256_hash = ${sha256Hash},
          assinatura_farmacia_data = NOW(),
          assinatura_farmacia_tipo = ${params.tipo}::parq_assinatura_tipo,
          assinatura_farmacia_evidencia = ${JSON.stringify(payloadCompleto)}::jsonb,
          updated_at = NOW()
      WHERE id = ${params.acordoId}
    `);
  }
  return { sha256Hash, assinaturaId };
}

// ════════════════════════════════════════════════════════════════════
// ENDPOINT 1: POST /api/parq/emitir
// ════════════════════════════════════════════════════════════════════
router.post("/parq/emitir", guardMaster, async (req, res) => {
  try {
    const unidadeId = getUnidadeId(req);
    if (!unidadeId) {
      res.status(400).json({ error: "Token sem unidadeId — multi-tenant requerido" });
      return;
    }
    const { farmacia_id, validacao_simplificada, toggle_obrigatoriedade_farmacia, pdf_url } = req.body ?? {};
    if (!farmacia_id) {
      res.status(400).json({ error: "Campo obrigatório: farmacia_id" });
      return;
    }

    const numeroSerie = gerarNumeroSerie();
    const shaProvisorio = crypto.createHash("sha256")
      .update(`${numeroSerie}|${farmacia_id}|${unidadeId}|${Date.now()}`).digest("hex");

    const ins = await db.execute(sql`
      INSERT INTO parq_acordos
        (unidade_id, farmacia_id, numero_serie, versao_termo, status,
         emitido_em, sha256_hash, pdf_url, validacao_simplificada,
         toggle_obrigatoriedade_farmacia, created_at, updated_at)
      VALUES
        (${unidadeId}, ${farmacia_id}, ${numeroSerie}, 1,
         'vigente'::parq_status_acordo, NOW(), ${shaProvisorio},
         ${pdf_url ?? null}, ${!!validacao_simplificada},
         ${!!toggle_obrigatoriedade_farmacia}, NOW(), NOW())
      RETURNING *
    `);
    const acordo = (ins.rows ?? ins)[0] as { id: number; numero_serie: string };

    // ── Wave 10 F3.A · Dispara envelope ZapSign ICP-Brasil bilateral ──
    // Falha gracefully: acordo persiste mesmo se ZapSign indisponivel; pode
    // re-enviar via endpoint dedicado depois (idempotente por
    // zapsign_envelope_clinica/farmacia ja persistido).
    let assinatura: Record<string, unknown> | null = null;
    try {
      const r = await enviarPARQ({ acordoId: acordo.id });
      assinatura = {
        envelopeId: r.envelopeId,
        externalId: r.externalId,
        sha256: r.sha256,
        signatarios: r.signatarios,
        reaproveitado: r.reaproveitado,
      };
    } catch (e: any) {
      assinatura = { erro: e?.message || String(e), pendente: true };
    }
    res.status(201).json({ ok: true, acordo, assinatura });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao emitir acordo" });
  }
});

// ════════════════════════════════════════════════════════════════════
// ENDPOINT 2: POST /api/parq/assinar-clinica-icp
// ════════════════════════════════════════════════════════════════════
router.post("/parq/assinar-clinica-icp", guardMaster, async (req, res) => {
  try {
    const { acordo_id, certificado_subject, certificado_serial, certificado_cpf_cnpj, payload_pkcs7 } = req.body ?? {};
    if (!acordo_id || !certificado_subject) {
      res.status(400).json({ error: "Campos obrigatórios: acordo_id, certificado_subject" });
      return;
    }
    const result = await registrarAssinatura({
      acordoId: acordo_id,
      tipo: "icp_brasil_clinica",
      signatarioNome: (req as any).user?.email ?? "validador_mestre",
      signatarioEmail: (req as any).user?.email ?? null,
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"] ?? "unknown",
      payloadValidacao: {
        certificado_subject,
        certificado_serial: certificado_serial ?? null,
        payload_pkcs7_size: payload_pkcs7 ? String(payload_pkcs7).length : 0,
        validacao_pendente_icp_brasil: true,
      },
      ladoAssinatura: "clinica",
      certificadoClinicaCpfCnpj: certificado_cpf_cnpj ?? null,
      certificadoClinicaSerial: certificado_serial ?? null,
    });
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao assinar (clínica ICP)" });
  }
});

// ════════════════════════════════════════════════════════════════════
// ENDPOINT 3: POST /api/parq/assinar-farmacia-icp
// ════════════════════════════════════════════════════════════════════
router.post("/parq/assinar-farmacia-icp", async (req, res) => {
  try {
    const { acordo_id, certificado_subject, certificado_serial, payload_pkcs7, signatario_nome, signatario_email } = req.body ?? {};
    if (!acordo_id || !certificado_subject || !signatario_nome) {
      res.status(400).json({ error: "Campos obrigatórios: acordo_id, certificado_subject, signatario_nome" });
      return;
    }
    const result = await registrarAssinatura({
      acordoId: acordo_id,
      tipo: "icp_brasil_farmacia",
      signatarioNome: signatario_nome,
      signatarioEmail: signatario_email ?? null,
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"] ?? "unknown",
      payloadValidacao: {
        certificado_subject,
        certificado_serial: certificado_serial ?? null,
        payload_pkcs7_size: payload_pkcs7 ? String(payload_pkcs7).length : 0,
        validacao_pendente_icp_brasil: true,
      },
      ladoAssinatura: "farmacia",
    });
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao assinar (farmácia ICP)" });
  }
});

// ════════════════════════════════════════════════════════════════════
// ENDPOINT 4: POST /api/parq/assinar-farmacia-docusign
// ════════════════════════════════════════════════════════════════════
router.post("/parq/assinar-farmacia-docusign", async (req, res) => {
  try {
    const { acordo_id, envelope_id, status, signatario_nome, signatario_email, plataforma } = req.body ?? {};
    if (!acordo_id || !envelope_id || !signatario_nome) {
      res.status(400).json({ error: "Campos obrigatórios: acordo_id, envelope_id, signatario_nome" });
      return;
    }
    if (status && status !== "completed" && status !== "signed") {
      res.status(202).json({ ok: true, registrado: false, status });
      return;
    }
    const tipo = plataforma === "clicksign" ? "clicksign" : "docusign";
    const result = await registrarAssinatura({
      acordoId: acordo_id,
      tipo,
      signatarioNome: signatario_nome,
      signatarioEmail: signatario_email ?? null,
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"] ?? "unknown",
      payloadValidacao: { envelope_id, status, plataforma: tipo },
      ladoAssinatura: "farmacia",
    });
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao processar webhook" });
  }
});

// ════════════════════════════════════════════════════════════════════
// ENDPOINT 5: POST /api/parq/assinar-farmacia-otp-iniciar
// (OTP em memória, TTL 10min)
// ════════════════════════════════════════════════════════════════════
router.post("/parq/assinar-farmacia-otp-iniciar", async (req, res) => {
  try {
    const { acordo_id, canal, destinatario } = req.body ?? {};
    if (!acordo_id || !canal || !destinatario) {
      res.status(400).json({ error: "Campos obrigatórios: acordo_id, canal (email|sms), destinatario" });
      return;
    }
    if (canal !== "email" && canal !== "sms") {
      res.status(400).json({ error: "canal deve ser 'email' ou 'sms'" });
      return;
    }
    const acordoQ = await db.execute(sql`SELECT id FROM parq_acordos WHERE id = ${acordo_id}`);
    if (!(acordoQ.rows ?? acordoQ)[0]) {
      res.status(404).json({ error: "Acordo não encontrado" });
      return;
    }
    otpCleanup();
    const codigo = String(Math.floor(100000 + Math.random() * 900000));
    const hash = crypto.createHash("sha256").update(codigo).digest("hex");
    const expira = Date.now() + 10 * 60 * 1000;
    otpStore.set(Number(acordo_id), { hash, expira, canal, destinatario });
    // STUB envio: integração SendGrid/Twilio fica em F5 (worker comunicação)
    res.json({ ok: true, canal, destinatario, expira_em: new Date(expira).toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao iniciar OTP" });
  }
});

// ════════════════════════════════════════════════════════════════════
// ENDPOINT 6: POST /api/parq/assinar-farmacia-otp-validar
// ════════════════════════════════════════════════════════════════════
router.post("/parq/assinar-farmacia-otp-validar", async (req, res) => {
  try {
    const { acordo_id, codigo, signatario_nome, signatario_email } = req.body ?? {};
    if (!acordo_id || !codigo || !signatario_nome) {
      res.status(400).json({ error: "Campos obrigatórios: acordo_id, codigo, signatario_nome" });
      return;
    }
    const entry = otpStore.get(Number(acordo_id));
    if (!entry) {
      res.status(400).json({ error: "OTP não foi iniciado ou expirou" });
      return;
    }
    if (entry.expira < Date.now()) {
      otpStore.delete(Number(acordo_id));
      res.status(400).json({ error: "OTP expirou — solicite novo código" });
      return;
    }
    const hashRecebido = crypto.createHash("sha256").update(String(codigo)).digest("hex");
    if (hashRecebido !== entry.hash) {
      res.status(401).json({ error: "Código OTP inválido" });
      return;
    }
    const tipoOtp = entry.canal === "sms" ? "otp_sms" : "otp_email";
    const result = await registrarAssinatura({
      acordoId: acordo_id,
      tipo: tipoOtp,
      signatarioNome: signatario_nome,
      signatarioEmail: signatario_email ?? entry.destinatario ?? null,
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"] ?? "unknown",
      payloadValidacao: { canal: entry.canal, destinatario: entry.destinatario, validado_em: new Date().toISOString() },
      ladoAssinatura: "farmacia",
    });
    otpStore.delete(Number(acordo_id));
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao validar OTP" });
  }
});

// ════════════════════════════════════════════════════════════════════
// ENDPOINT 7: POST /api/parq/assinar-farmacia-upload-pdf
// ════════════════════════════════════════════════════════════════════
router.post("/parq/assinar-farmacia-upload-pdf", async (req, res) => {
  try {
    const { acordo_id, signatario_nome, signatario_email, pdf_url, sha256_pdf } = req.body ?? {};
    if (!acordo_id || !signatario_nome || !pdf_url || !sha256_pdf) {
      res.status(400).json({ error: "Campos obrigatórios: acordo_id, signatario_nome, pdf_url, sha256_pdf" });
      return;
    }
    if (!/^[a-f0-9]{64}$/i.test(String(sha256_pdf))) {
      res.status(400).json({ error: "sha256_pdf deve ser 64 chars hex" });
      return;
    }
    const result = await registrarAssinatura({
      acordoId: acordo_id,
      tipo: "manuscrita_upload",
      signatarioNome: signatario_nome,
      signatarioEmail: signatario_email ?? null,
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"] ?? "unknown",
      payloadValidacao: { pdf_url, sha256_pdf },
      ladoAssinatura: "farmacia",
    });
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao registrar upload" });
  }
});

// ════════════════════════════════════════════════════════════════════
// ENDPOINT 8: POST /api/parq/assinar-farmacia-aceite-ip-geo
// ════════════════════════════════════════════════════════════════════
router.post("/parq/assinar-farmacia-aceite-ip-geo", async (req, res) => {
  try {
    const { acordo_id, signatario_nome, signatario_email, geo_lat, geo_lng } = req.body ?? {};
    if (!acordo_id || !signatario_nome) {
      res.status(400).json({ error: "Campos obrigatórios: acordo_id, signatario_nome" });
      return;
    }
    const result = await registrarAssinatura({
      acordoId: acordo_id,
      tipo: "aceite_ip_geo",
      signatarioNome: signatario_nome,
      signatarioEmail: signatario_email ?? null,
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"] ?? "unknown",
      payloadValidacao: {
        geo_lat: geo_lat ?? null,
        geo_lng: geo_lng ?? null,
        aceite_em: new Date().toISOString(),
      },
      ladoAssinatura: "farmacia",
    });
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao registrar aceite" });
  }
});

// ════════════════════════════════════════════════════════════════════
// ENDPOINT 9: GET /api/parq/verificar-hash/:hash  (PÚBLICO)
// ════════════════════════════════════════════════════════════════════
router.get("/parq/verificar-hash/:hash", async (req, res) => {
  try {
    const { hash } = req.params;
    if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) {
      res.status(400).json({ error: "Hash SHA-256 inválido (64 chars hex)" });
      return;
    }
    const r = await db.execute(sql`
      SELECT a.id, a.numero_serie, a.farmacia_id, f.nome_fantasia AS farmacia_nome,
             a.unidade_id, u.nome AS unidade_nome, a.versao_termo, a.status,
             a.emitido_em, a.certificado_clinica_data, a.assinatura_farmacia_data,
             a.assinatura_farmacia_tipo, a.validacao_simplificada,
             a.toggle_obrigatoriedade_farmacia, a.sha256_hash
      FROM parq_acordos a
      LEFT JOIN farmacias_parmavault f ON f.id = a.farmacia_id
      LEFT JOIN unidades u             ON u.id = a.unidade_id
      WHERE a.sha256_hash = ${hash}
      LIMIT 1
    `);
    const acordo = (r.rows ?? r)[0];
    if (!acordo) {
      res.status(404).json({ ok: false, error: "Hash não encontrado" });
      return;
    }
    res.json({ ok: true, acordo });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao verificar hash" });
  }
});

// ════════════════════════════════════════════════════════════════════
// ENDPOINT 10: POST /api/parq/visitas/iniciar
// ════════════════════════════════════════════════════════════════════
router.post("/parq/visitas/iniciar", guardMaster, async (req, res) => {
  try {
    const unidadeId = getUnidadeId(req);
    const { acordo_id, farmacia_id, data_agendada, farmaceutico_tecnico_auditor_id, medico_responsavel_id, observacoes } = req.body ?? {};
    if (!acordo_id || !farmacia_id || !data_agendada) {
      res.status(400).json({ error: "Campos obrigatórios: acordo_id, farmacia_id, data_agendada" });
      return;
    }
    if (!unidadeId) {
      res.status(400).json({ error: "Token sem unidadeId — multi-tenant requerido" });
      return;
    }
    const ins = await db.execute(sql`
      INSERT INTO parq_visitas_bimestrais
        (acordo_id, unidade_id, farmacia_id, data_agendada,
         farmaceutico_tecnico_auditor_id, medico_responsavel_id,
         status, observacoes, created_at, updated_at)
      VALUES
        (${acordo_id}, ${unidadeId}, ${farmacia_id}, ${data_agendada},
         ${farmaceutico_tecnico_auditor_id ?? null},
         ${medico_responsavel_id ?? null},
         'em_andamento'::parq_visita_status, ${observacoes ?? null},
         NOW(), NOW())
      RETURNING *
    `);
    res.status(201).json({ ok: true, visita: (ins.rows ?? ins)[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao iniciar visita" });
  }
});

// ════════════════════════════════════════════════════════════════════
// ENDPOINT 11: POST /api/parq/visitas/concluir
// ════════════════════════════════════════════════════════════════════
router.post("/parq/visitas/concluir", guardMaster, async (req, res) => {
  try {
    const { visita_id, checklist, observacoes_finais, assinatura_digital_relatorio } = req.body ?? {};
    if (!visita_id || !Array.isArray(checklist) || checklist.length === 0) {
      res.status(400).json({
        error: "Campos obrigatórios: visita_id, checklist[] ({categoria, item_codigo, item_descricao, nota 1-5})",
      });
      return;
    }
    const categoriasValidas = new Set(["insumos", "processamento", "atendimento", "entrega", "qualidade_geral"]);
    let soma = 0;
    let qtd = 0;
    for (const item of checklist) {
      const nota = Number(item.nota);
      if (!item.categoria || !categoriasValidas.has(item.categoria)) {
        res.status(400).json({ error: `categoria inválida: ${item.categoria}` });
        return;
      }
      if (!item.item_codigo || !item.item_descricao) {
        res.status(400).json({ error: "item_codigo e item_descricao são obrigatórios" });
        return;
      }
      if (isNaN(nota) || nota < 1 || nota > 5) {
        res.status(400).json({ error: "nota deve estar entre 1 e 5" });
        return;
      }
      await db.execute(sql`
        INSERT INTO parq_checklist_auditoria
          (visita_id, categoria, item_codigo, item_descricao, nota,
           observacao, evidencia_urls, created_at)
        VALUES
          (${visita_id}, ${item.categoria}, ${item.item_codigo},
           ${item.item_descricao}, ${nota}, ${item.observacao ?? null},
           ${item.evidencia_urls ?? null}, NOW())
      `);
      soma += nota;
      qtd++;
    }
    const scoreGeral = qtd > 0 ? Number((soma / qtd).toFixed(2)) : 0;
    const novoStatus = scoreGeral >= 4 ? "aprovada" : scoreGeral >= 2.5 ? "aprovada_com_ressalvas" : "reprovada";

    const r = await db.execute(sql`
      UPDATE parq_visitas_bimestrais
      SET status = ${novoStatus}::parq_visita_status,
          score_geral = ${scoreGeral},
          observacoes = COALESCE(${observacoes_finais ?? null}, observacoes),
          assinatura_digital_relatorio = COALESCE(${assinatura_digital_relatorio ? JSON.stringify(assinatura_digital_relatorio) : null}::jsonb, assinatura_digital_relatorio),
          data_realizada = NOW(),
          updated_at = NOW()
      WHERE id = ${visita_id}
      RETURNING *
    `);
    res.json({
      ok: true,
      visita: (r.rows ?? r)[0],
      score_geral: scoreGeral,
      qtd_itens: qtd,
      status_calculado: novoStatus,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao concluir visita" });
  }
});

// ════════════════════════════════════════════════════════════════════
// ENDPOINT 12: POST /api/parq/visitas/reprovar
// ════════════════════════════════════════════════════════════════════
router.post("/parq/visitas/reprovar", guardMaster, async (req, res) => {
  try {
    const { visita_id, motivo, planos_acao } = req.body ?? {};
    if (!visita_id || !motivo) {
      res.status(400).json({ error: "Campos obrigatórios: visita_id, motivo" });
      return;
    }
    await db.execute(sql`
      UPDATE parq_visitas_bimestrais
      SET status = 'reprovada'::parq_visita_status,
          observacoes = ${motivo},
          data_realizada = COALESCE(data_realizada, NOW()),
          updated_at = NOW()
      WHERE id = ${visita_id}
    `);
    const planosCriados: any[] = [];
    if (Array.isArray(planos_acao)) {
      for (const p of planos_acao) {
        if (!p.descricao_nao_conformidade || !p.acao_corretiva_proposta) continue;
        const ins = await db.execute(sql`
          INSERT INTO parq_planos_acao_kaizen
            (visita_id, descricao_nao_conformidade, acao_corretiva_proposta,
             responsavel, prazo_dias, status)
          VALUES
            (${visita_id}, ${p.descricao_nao_conformidade},
             ${p.acao_corretiva_proposta}, ${p.responsavel ?? null},
             ${p.prazo_dias ?? 30}, 'aberto'::parq_plano_status)
          RETURNING *
        `);
        planosCriados.push((ins.rows ?? ins)[0]);
      }
    }
    res.json({ ok: true, visita_id, motivo, planos_criados: planosCriados });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao reprovar visita" });
  }
});

// ════════════════════════════════════════════════════════════════════
// ENDPOINT 13: PATCH /api/parq/planos/:id
// ════════════════════════════════════════════════════════════════════
router.patch("/parq/planos/:id", guardMaster, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, evidencia_conclusao_url, prazo_dias } = req.body ?? {};
    if (!status) {
      res.status(400).json({ error: "Campo obrigatório: status (aberto|em_andamento|concluido|atrasado)" });
      return;
    }
    const r = await db.execute(sql`
      UPDATE parq_planos_acao_kaizen
      SET status = ${status}::parq_plano_status,
          evidencia_conclusao_url = COALESCE(${evidencia_conclusao_url ?? null}, evidencia_conclusao_url),
          prazo_dias = COALESCE(${prazo_dias ?? null}, prazo_dias),
          concluido_em = CASE WHEN ${status} = 'concluido' THEN NOW() ELSE concluido_em END
      WHERE id = ${id}
      RETURNING *
    `);
    const plano = (r.rows ?? r)[0];
    if (!plano) {
      res.status(404).json({ error: "Plano não encontrado" });
      return;
    }
    res.json({ ok: true, plano });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao atualizar plano" });
  }
});

// ════════════════════════════════════════════════════════════════════
// ENDPOINT 14: GET /api/parq/status-farmacia/:id
// ════════════════════════════════════════════════════════════════════
router.get("/parq/status-farmacia/:id", async (req, res) => {
  try {
    const farmaciaId = Number(req.params.id);
    if (!farmaciaId) {
      res.status(400).json({ error: "farmacia_id inválido" });
      return;
    }
    const status = await db.execute(sql`
      SELECT s.farmacia_id, s.status, s.score_ultima_auditoria,
             s.proxima_visita_em, s.indicacoes_ativas, s.updated_at,
             f.nome_fantasia
      FROM parq_status_farmacia s
      LEFT JOIN farmacias_parmavault f ON f.id = s.farmacia_id
      WHERE s.farmacia_id = ${farmaciaId}
    `);
    const acordosVigentes = await db.execute(sql`
      SELECT id, numero_serie, emitido_em, sha256_hash, status,
             validacao_simplificada, certificado_clinica_data,
             assinatura_farmacia_data, assinatura_farmacia_tipo
      FROM parq_acordos
      WHERE farmacia_id = ${farmaciaId} AND status = 'vigente'::parq_status_acordo
      ORDER BY emitido_em DESC
    `);
    const ultimasVisitas = await db.execute(sql`
      SELECT id, data_agendada, data_realizada, score_geral, status
      FROM parq_visitas_bimestrais
      WHERE farmacia_id = ${farmaciaId}
      ORDER BY data_agendada DESC LIMIT 6
    `);
    const planosAbertos = await db.execute(sql`
      SELECT p.id, p.descricao_nao_conformidade, p.status,
             p.prazo_limite, p.prazo_dias
      FROM parq_planos_acao_kaizen p
      JOIN parq_visitas_bimestrais v ON v.id = p.visita_id
      WHERE v.farmacia_id = ${farmaciaId}
        AND p.status::text IN ('aberto','em_andamento','atrasado')
      ORDER BY p.prazo_limite ASC NULLS LAST
    `);
    const historico = await db.execute(sql`
      SELECT status_anterior, status_novo, motivo, mudado_em
      FROM parq_historico_status
      WHERE farmacia_id = ${farmaciaId}
      ORDER BY mudado_em DESC LIMIT 10
    `);
    res.json({
      ok: true,
      farmacia_id: farmaciaId,
      status_atual: (status.rows ?? status)[0] ?? null,
      acordos_vigentes: (acordosVigentes.rows ?? acordosVigentes),
      ultimas_visitas: (ultimasVisitas.rows ?? ultimasVisitas),
      planos_abertos: (planosAbertos.rows ?? planosAbertos),
      historico_status: (historico.rows ?? historico),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Erro ao buscar status" });
  }
});

// ════════════════════════════════════════════════════════════════════
// 15. GET /api/parq/:id/pdf — Gera PDF Termo PARQ on-the-fly
// (Wave 9 PARQ · F3 — pdfkit + qrcode, 4 paginas defensaveis)
// Requer master (autoridade institucional pra emitir/reemitir o termo).
// ════════════════════════════════════════════════════════════════════
router.get("/parq/:id/pdf", guardMaster, async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "id invalido" });
      return;
    }

    // 1. Acordo + clinica + farmacia (single query JOIN)
    const acordoRes = await db.execute(sql`
      SELECT
        a.id, a.numero_serie, a.sha256_hash, a.emitido_em,
        a.validacao_simplificada, a.toggle_obrigatoriedade_farmacia,
        a.unidade_id, a.farmacia_id,
        a.certificado_clinica_data, a.certificado_clinica_cpf_cnpj,
        a.assinatura_farmacia_tipo::text   AS assinatura_farmacia_tipo,
        a.assinatura_farmacia_data,
        a.assinatura_farmacia_evidencia,
        u.nome           AS clinica_nome,
        u.cnpj           AS clinica_cnpj,
        u.endereco       AS clinica_endereco,
        f.nome_fantasia  AS farmacia_nome,
        f.cnpj           AS farmacia_cnpj,
        f.cidade         AS farmacia_cidade,
        f.estado         AS farmacia_estado
      FROM parq_acordos a
      JOIN unidades u             ON u.id = a.unidade_id
      JOIN farmacias_parmavault f ON f.id = a.farmacia_id
      WHERE a.id = ${id}
      LIMIT 1
    `);

    const acordoRow = (acordoRes.rows ?? acordoRes)[0];
    if (!acordoRow) {
      res.status(404).json({ error: "Acordo PARQ nao encontrado" });
      return;
    }

    const r: any = acordoRow;

    // 2. Tenant guard: se o JWT tem unidadeId, exige bater com o acordo
    const reqUnidade = getUnidadeId(req);
    if (reqUnidade !== null && reqUnidade !== r.unidade_id) {
      res.status(403).json({ error: "Acordo nao pertence a esta unidade" });
      return;
    }

    // 3. Monta DadosTermoPARQ
    const baseUrl = process.env.PUBLIC_BASE_URL
      || (process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : "http://localhost:8080");

    const evid = r.assinatura_farmacia_evidencia || {};

    const dados: DadosTermoPARQ = {
      acordo: {
        id: Number(r.id),
        numero_serie: r.numero_serie,
        sha256_hash: r.sha256_hash,
        data_emissao: r.emitido_em,
        validacao_simplificada: !!r.validacao_simplificada,
        toggle_obrigatoriedade_farmacia: !!r.toggle_obrigatoriedade_farmacia,
      },
      clinica: {
        unidade_id: r.unidade_id,
        nome: r.clinica_nome,
        cnpj: r.clinica_cnpj,
        endereco: r.clinica_endereco,
        crm_responsavel: null,
        medico_responsavel: null,
      },
      farmacia: {
        id: r.farmacia_id,
        nome: r.farmacia_nome,
        cnpj: r.farmacia_cnpj,
        endereco: [r.farmacia_cidade, r.farmacia_estado]
          .filter(Boolean).join(" / ") || null,
        responsavel_tecnico: null,
        crf: null,
      },
      assinatura_clinica: r.certificado_clinica_data
        ? {
            tipo: "icp_brasil",
            data: r.certificado_clinica_data,
            cpf: r.certificado_clinica_cpf_cnpj,
            nome: null,
            ip: null,
          }
        : undefined,
      assinatura_farmacia: r.assinatura_farmacia_data
        ? {
            tipo: r.assinatura_farmacia_tipo as any,
            data: r.assinatura_farmacia_data,
            ip: evid.ip ?? null,
            geo: evid.geo ?? null,
            cpf: evid.cpf ?? null,
            nome: evid.signatario_nome ?? evid.nome ?? null,
            canal: evid.canal ?? null,
          }
        : undefined,
      url_verificacao_publica: `${baseUrl}/api/parq/verificar-hash/${r.sha256_hash}`,
      protocolo: r.numero_serie,
      geradoEm: new Date(),
    };

    // 4. Gera PDF
    const pdfBuffer = await gerarTermoPARQ(dados);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${r.numero_serie}.pdf"`,
    );
    res.setHeader("Cache-Control", "private, max-age=300");
    res.end(pdfBuffer);
  } catch (err: any) {
    res
      .status(500)
      .json({ error: err.message ?? "Erro ao gerar PDF do Termo PARQ" });
  }
});

export default router;
