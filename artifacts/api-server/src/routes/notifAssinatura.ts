/**
 * PARMASUPRA-FECHAMENTO · F4 / WD14 · Endpoints admin do worker assinatura.
 *
 * - POST /admin/notif-assinatura/tick : roda 1 tick manual (smoke / debug).
 * - GET  /admin/notif-assinatura/status : sumario por status (PENDENTE / ENVIADO / FALHA).
 */

import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireRole } from "../middlewares/requireRole";
import { requireMasterEstrito } from "../middlewares/requireMasterEstrito";
import { tickNotifAssinatura } from "../lib/recorrencia/notifAssinatura";

const router = Router();

router.post(
  "/admin/notif-assinatura/tick",
  requireRole("validador_mestre"),
  requireMasterEstrito,
  async (_req: Request, res: Response) => {
    try {
      const r = await tickNotifAssinatura();
      res.json({ ok: true, ...r });
    } catch (e) {
      res.status(500).json({ ok: false, error: (e as Error).message });
    }
  }
);

router.get(
  "/admin/notif-assinatura/status",
  requireRole("validador_mestre"),
  requireMasterEstrito,
  async (_req: Request, res: Response) => {
    const r: any = await db.execute(sql`
      SELECT status, count(*)::int AS n,
             max(criado_em) AS ultimo_criado_em,
             max(enviado_em) AS ultimo_enviado_em
      FROM assinatura_notificacoes
      GROUP BY status ORDER BY status
    `);
    res.json({ por_status: r.rows ?? r });
  }
);

export default router;
