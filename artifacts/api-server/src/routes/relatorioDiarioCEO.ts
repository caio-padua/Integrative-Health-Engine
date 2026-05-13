/**
 * Wave Blindagem CEO PDF Diario · Rota admin
 *
 * POST /api/admin/relatorio-diario/disparar
 *   Body: { destinatarioEmail?, janelaHoras?, forcar? }
 *   Auth: requireAuth + requireRole('admin','consultoria_master','validador_mestre')
 *   Retorna: { enviado, diaBrt, destinatario, pdfBytes, gmailMessageId, payloadKpis }
 *
 * GET  /api/admin/relatorio-diario/historico
 *   Lista ultimos 30 envios (auditoria + status).
 */
import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";
import { dispararRelatorioDiarioCEO } from "../lib/recorrencia/relatorioDiarioCEO";

const router = Router();

router.post(
  "/admin/relatorio-diario/disparar",
  requireAuth,
  requireRole("admin", "consultoria_master", "validador_mestre"),
  async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as {
        destinatarioEmail?: string;
        janelaHoras?: number;
        forcar?: boolean;
      };
      const out = await dispararRelatorioDiarioCEO({
        destinatarioEmail: body.destinatarioEmail,
        janelaHoras: body.janelaHoras,
        forcar: body.forcar === true,
        origem: "MANUAL",
      });
      res.json(out);
    } catch (e) {
      const msg = (e as Error).message;
      console.error("[relatorioDiarioCEO route] erro:", msg);
      res.status(500).json({ enviado: false, erro: msg });
    }
  },
);

router.get(
  "/admin/relatorio-diario/historico",
  requireAuth,
  requireRole("admin", "consultoria_master", "validador_mestre"),
  async (_req: Request, res: Response) => {
    try {
      const r: any = await db.execute(sql`
        SELECT id, dia_brt::text AS dia_brt, destinatario_email, status,
               enviado_em::text AS enviado_em, gmail_message_id, pdf_bytes,
               payload_kpis, erro, origem
        FROM relatorio_diario_ceo_envios
        ORDER BY enviado_em DESC
        LIMIT 30
      `);
      res.json({ historico: (r.rows ?? r) ?? [] });
    } catch (e) {
      const msg = (e as Error).message;
      console.error("[relatorioDiarioCEO historico] erro:", msg);
      res.status(500).json({ erro: msg });
    }
  },
);

export default router;
