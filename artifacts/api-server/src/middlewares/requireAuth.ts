import type { Request, Response, NextFunction } from "express";
import { verifyJwt, type JwtPayload } from "../lib/auth/jwt";

declare module "express-serve-static-core" {
  interface Request {
    user?: JwtPayload;
  }
}

const PUBLIC_EXACT = new Set<string>([
  "/healthz",
  "/health",
  "/usuarios/login",
  "/portal/categorias",
  "/portal/identificar",
  "/portal/definir-senha",
  "/portal/login",
  "/portal/slots-disponiveis",
  "/portal/reagendar",
]);

const PUBLIC_PREFIXES = [
  "/payments/webhooks/",
  "/webhooks/assinatura/",
  "/assinaturas/webhook/",
  "/portal/meus-agendamentos/",
  "/portal/upload/",
  "/padcom-sessoes",
  "/padcom-questionarios",
  "/padcom-bandas",
  "/questionario-paciente",
];

function isPublic(path: string): boolean {
  if (PUBLIC_EXACT.has(path)) return true;
  return PUBLIC_PREFIXES.some(p => path === p || path.startsWith(p));
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const path = req.path || req.url || "";
  if (isPublic(path)) {
    next();
    return;
  }

  const adminToken = process.env["ADMIN_TOKEN"];
  if (adminToken && adminToken.length >= 16 && req.header("x-admin-token") === adminToken) {
    next();
    return;
  }

  const header = req.header("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({ error: "Autenticacao necessaria (Bearer token ausente)" });
    return;
  }

  try {
    req.user = verifyJwt(match[1]);
    next();
  } catch (err: any) {
    res.status(401).json({ error: err?.message || "Token invalido" });
  }
}
