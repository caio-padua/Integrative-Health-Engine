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

  // Bypass via x-admin-token NAO e aceito para o Painel PAWARDS — esses endpoints
  // exigem identidade JWT para que o log "[painel-pawards]" sempre tenha quem acessou.
  const isPainelPawards = path === "/painel-pawards" || path.startsWith("/painel-pawards/");
  const adminToken = process.env["ADMIN_TOKEN"];
  if (!isPainelPawards && adminToken && adminToken.length >= 16 && req.header("x-admin-token") === adminToken) {
    req.user = { id: -1, perfil: "admin", nome: "ADMIN_TOKEN", email: "admin@pawards", unidadeId: null } as any;
    next();
    return;
  }

  // Aceita o JWT em 3 lugares: header Authorization (preferencial), cookie
  // "pawards.auth.token" (para bridges/SSR e paginas legadas que nao injetam
  // header), e query string ?_token= (debug pontual).
  const header = req.header("authorization") || "";
  const headerMatch = header.match(/^Bearer\s+(.+)$/i);
  const cookieToken = (req as any).cookies?.["pawards.auth.token"] as string | undefined;
  const queryToken = typeof req.query?._token === "string" ? (req.query._token as string) : undefined;
  const token = headerMatch?.[1] || cookieToken || queryToken;
  if (!token) {
    res.status(401).json({ error: "Autenticacao necessaria (Bearer token ausente)" });
    return;
  }

  try {
    req.user = verifyJwt(token);
    next();
  } catch (err: any) {
    res.status(401).json({ error: err?.message || "Token invalido" });
  }
}
