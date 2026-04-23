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
  // Wave 4 PACIENTE-TSUNAMI · OTP login (paciente nao tem JWT antes de logar)
  "/portal/otp/solicitar",
  "/portal/otp/validar",
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
  // Wave 4 PACIENTE-TSUNAMI · historico + drive sao acessiveis pelo paciente apos OTP
  "/portal/historico/",
  "/portal/drive-links/",
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

  // HARDENED 22/abr/2026 (Dr. Claude correcao 2): JWT aceito apenas via
  // header Authorization (preferencial) ou cookie "pawards.auth.token".
  // REMOVIDO ?_token= — token na query string vaza em logs/referer/historico.
  const header = req.header("authorization") || "";
  const headerMatch = header.match(/^Bearer\s+(.+)$/i);
  const cookieToken = (req as any).cookies?.["pawards.auth.token"] as string | undefined;
  const token = headerMatch?.[1] || cookieToken;
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
