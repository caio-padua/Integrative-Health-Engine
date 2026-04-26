/**
 * Wave 10 F3.B Round 5 — Endpoint dedicado TCLE Familia 1.
 *
 * Controle medico explicito (decisao Dr. Claude + opcao a do plano senior):
 * o medico decide quando enviar o TCLE — sem hook automatico em rasDistribuir
 * ou cadastro de paciente. Evita race condition (envio pra paciente errado)
 * e respeita LGPD art. 7 IV (consentimento informado, voluntario, livre).
 *
 * Endpoints:
 *   POST /api/assinaturas/tcle/enviar             body: { pacienteId }
 *   GET  /api/assinaturas/tcle/status/:pacienteId
 *
 * Multi-tenant: ambas rodam sob requireAuth + tenantContextMiddleware
 * (montadas em app.ts:170). Validacao de unidade_id vs JWT eh delegada ao
 * middleware — esta rota assume paciente ja escopado.
 *
 * Reusa: src/lib/assinatura/use-cases/enviarTCLE.ts (early-fail + idempotencia
 * + assinaturaService.enviar com papel PACIENTE -> AuthMode avancada).
 */

import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { enviarTCLE } from "../lib/assinatura/use-cases/enviarTCLE";

const router = Router();

router.post("/assinaturas/tcle/enviar", async (req, res) => {
  try {
    const body = req.body as { pacienteId?: unknown };
    const pacienteId = Number(body.pacienteId);
    if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
      res.status(400).json({ ok: false, error: "pacienteId obrigatorio (integer > 0)" });
      return;
    }
    const r = await enviarTCLE({ pacienteId });
    res.status(r.reaproveitado ? 200 : 201).json(r);
  } catch (err) {
    const msg = (err as Error).message || "erro desconhecido";
    const status = /nao encontrado/i.test(msg)
      ? 404
      : /sem (email|telefone|canal)|nome invalido/i.test(msg)
        ? 422
        : 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

interface StatusRow {
  id: number;
  provedor_envelope_id: string;
  status: string;
  enviado_em: Date;
  concluido_em: Date | null;
  hash_original: string;
  hash_assinado: string | null;
  pdf_assinado_url: string | null;
}

router.get("/assinaturas/tcle/status/:pacienteId", async (req, res) => {
  try {
    const pid = Number(req.params.pacienteId);
    if (!Number.isInteger(pid) || pid <= 0) {
      res.status(400).json({ ok: false, error: "pacienteId invalido" });
      return;
    }
    const r = await db.execute(sql`
      SELECT id, provedor_envelope_id, status, enviado_em, concluido_em,
             hash_original, hash_assinado, pdf_assinado_url
      FROM assinatura_solicitacoes
      WHERE paciente_id = ${pid}
        AND template_id = 1
      ORDER BY enviado_em DESC
      LIMIT 1
    `);
    const row = ((r as unknown as { rows?: StatusRow[] }).rows || [])[0];
    if (!row) {
      res.status(404).json({ ok: false, error: "Nenhum TCLE enviado pra este paciente" });
      return;
    }
    res.json({
      ok: true,
      pacienteId: pid,
      templateCodigo: "TCLE_PADRAO_V1",
      templateId: 1,
      solicitacaoId: row.id,
      envelopeId: row.provedor_envelope_id,
      status: row.status,
      enviadoEm: row.enviado_em,
      concluidoEm: row.concluido_em,
      hashOriginal: row.hash_original,
      hashAssinado: row.hash_assinado,
      pdfAssinadoUrl: row.pdf_assinado_url,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

export default router;
