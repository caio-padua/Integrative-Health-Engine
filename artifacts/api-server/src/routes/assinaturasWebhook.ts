/**
 * Webhooks dos provedores Clicksign + ZapSign.
 * REQUEREM raw body (Buffer) para validacao HMAC. Por isso o express.raw
 * eh aplicado especificamente nestes paths em src/app.ts ANTES do express.json.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { assinaturaService } from "../lib/assinatura/service";
import type { ProvedorCodigo } from "../lib/assinatura/types";

const router: IRouter = Router();

async function handler(provedor: ProvedorCodigo, req: Request, res: Response) {
  try {
    const raw: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
    const result = await assinaturaService.receberWebhook(provedor, raw, req.headers as Record<string, string | string[] | undefined>);
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
}

router.post("/webhooks/assinatura/clicksign", (req, res) => handler("clicksign", req, res));
router.post("/webhooks/assinatura/zapsign",   (req, res) => handler("zapsign",   req, res));

export default router;
