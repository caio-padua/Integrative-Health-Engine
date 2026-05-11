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
    // Wave 10.5 task #34 — Mapeamento HTTP discriminado:
    //  - ok=true  -> 200 (sucesso ou duplicado real)
    //  - transient=true -> 502 (falha temporaria download/upload/storage:
    //    ZapSign trata 5xx como retriable e reentrega ate ack 200, garantindo
    //    a invariante "PDF persistido eh pre-condicao DURAVEL")
    //  - ok=false sem transient -> 400 (falha permanente: signature_invalid,
    //    payload malformado etc — reenvio nao resolve)
    const status = result.ok ? 200 : (result.transient ? 502 : 400);
    res.status(status).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
}

router.post("/webhooks/assinatura/clicksign", (req, res) => handler("clicksign", req, res));
router.post("/webhooks/assinatura/zapsign",   (req, res) => handler("zapsign",   req, res));

export default router;
