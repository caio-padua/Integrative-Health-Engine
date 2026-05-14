import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usuariosTable } from "@workspace/db";
import { verifyJwt, type JwtPayload } from "../lib/auth/jwt";

type RequestLogger = {
  error?: (obj: Record<string, unknown>, msg?: string) => void;
};

declare module "express-serve-static-core" {
  interface Request {
    user?: JwtPayload;
  }
}

const PUBLIC_EXACT = new Set<string>([
  "/healthz",
  "/health",
  "/usuarios/login",
  "/usuarios/login/2fa-verificar",
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
  // Wave 9 PARQ · verificacao publica de hash (paciente/auditor) +
  // assinaturas farmacia (farmacia nao tem JWT no sistema) +
  // visualizacao de status (transparencia).
  // Paths SEM /api porque app.use("/api", requireAuth, router) consome o /api.
  "/parq/verificar-hash/",
  "/parq/assinar-farmacia-",
  "/parq/status-farmacia/",
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

  // Bypass via x-admin-token NAO e aceito para:
  //  - Painel PAWARDS: exige identidade JWT para que o log "[painel-pawards]"
  //    sempre tenha quem acessou.
  //  - Rotas Wave 10 com efeito juridico (assinaturas digitais ICP-Brasil):
  //    HARDENED 01/mai/2026 pos code-review architect FAIL — bypass admin nao
  //    pode disparar contratos/orcamentos/PARQ/TCLE em nome de tenants reais.
  //    Documentado como sujeira #6 herdada (Wave 10.5 deve remover bypass
  //    completamente e migrar /admin/* pra JWT real com role=admin).
  const isPainelPawards = path === "/painel-pawards" || path.startsWith("/painel-pawards/");
  // Match tanto rota raiz (POST /api/prescricoes) quanto sub-rotas (/api/prescricoes/123)
  const isWave10Juridico =
    /^\/(api\/)?(orcamentos|parq|prescricoes|admin\/relatorio-diario)(\/.*)?$/.test(path);
  const adminToken = process.env["ADMIN_TOKEN"];
  if (
    !isPainelPawards &&
    !isWave10Juridico &&
    adminToken &&
    adminToken.length >= 16 &&
    req.header("x-admin-token") === adminToken
  ) {
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

  let payload: JwtPayload;
  try {
    payload = verifyJwt(token);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token invalido";
    res.status(401).json({ error: message });
    return;
  }

  // Wave 13 F3 hardening: tokens com flag twoFactorChallenge sao
  // intermediarios de login e NAO podem ser usados como Bearer em rotas
  // protegidas — so servem pra POST /usuarios/login/2fa-verificar
  // (rota publica que valida o challenge + codigo TOTP separadamente).
  if (payload.twoFactorChallenge === true) {
    res.status(401).json({
      error:
        "Token de challenge 2FA nao pode ser usado como sessao. Conclua o login em POST /usuarios/login/2fa-verificar.",
    });
    return;
  }

  // Task #154 — kill-switch de sessoes. Se o platform_owner bumpou
  // `tokens_invalidos_apos` via POST /api/plataforma/usuarios/:id/forcar-logout,
  // qualquer JWT cujo `iat` seja anterior a esse timestamp deve ser rejeitado
  // (logout em massa). Defensivo: falha de DB NAO derruba o middleware — log
  // + 503 explicito pra o platform_owner notar (se silenciassemos, um attacker
  // com session-hijack continuaria operando enquanto o DB estivesse fora).
  const userId = Number(payload.sub);
  if (!Number.isInteger(userId) || userId <= 0) {
    // Tokens sintetizados (ADMIN_TOKEN bypass acima) nao chegam aqui — esses
    // sao filtrados antes. Aqui chegamos apenas com JWT verdadeiro.
    req.user = payload;
    next();
    return;
  }
  void (async () => {
    try {
      const [row] = await db
        .select({ tokensInvalidosApos: usuariosTable.tokensInvalidosApos })
        .from(usuariosTable)
        .where(eq(usuariosTable.id, userId));
      const cutoff = row?.tokensInvalidosApos ? new Date(row.tokensInvalidosApos) : null;
      if (cutoff && payload.iat * 1000 < cutoff.getTime()) {
        res.status(401).json({
          error:
            "Sessao invalidada pelo platform_owner (forcar logout). Refaca o login.",
          codigo: "SESSAO_INVALIDADA",
          invalidada_em: cutoff.toISOString(),
        });
        return;
      }
      req.user = payload;
      next();
    } catch (err) {
      // Falha defensiva: log + 503 explicito. NAO segue o request — se
      // seguisse, um attacker com hijack passaria por baixo do kill-switch
      // sempre que o DB tivesse blip.
      const log = (req as Request & { log?: RequestLogger }).log;
      log?.error?.({ err, userId }, "[requireAuth] falha checando tokens_invalidos_apos");
      res.status(503).json({
        error: "Indisponivel: nao foi possivel validar sessao. Tente novamente.",
      });
    }
  })();
}
