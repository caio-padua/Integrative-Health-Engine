import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usuariosTable } from "@workspace/db";
import type { JwtPayload } from "../lib/auth/jwt";

export const JANELA_2FA_HORAS = 8;

export interface Require2faRecenteOpts {
  janelaHoras?: number;
}

type AuthedRequest = Request & {
  user?: JwtPayload & { perfil?: string; perfilPlataforma?: string };
};

export function require2faRecente(opts: Require2faRecenteOpts = {}) {
  const janelaHoras = opts.janelaHoras ?? JANELA_2FA_HORAS;
  return function require2faRecenteMiddleware(
    req: Request, res: Response, next: NextFunction,
  ): void {
    const u = (req as AuthedRequest).user;
    if (!u) {
      res.status(401).json({ error: "Autenticacao necessaria" });
      return;
    }
    if (
      process.env.NODE_ENV !== "production" &&
      process.env.PLATFORM_BYPASS_2FA === "1"
    ) {
      next();
      return;
    }
    void (async () => {
      try {
        const userId = Number(u.sub);
        if (!Number.isInteger(userId) || userId <= 0) {
          res.status(401).json({ error: "Token sem identidade valida" });
          return;
        }
        const [row] = await db
          .select({ ultimo: usuariosTable.ultimoLogin2faEm })
          .from(usuariosTable)
          .where(eq(usuariosTable.id, userId));
        const ultimo = row?.ultimo ? new Date(row.ultimo) : null;
        const limite = Date.now() - janelaHoras * 60 * 60 * 1000;
        if (!ultimo || ultimo.getTime() < limite) {
          res.status(403).json({
            error: `Acao sensivel exige 2FA recente (<${janelaHoras}h). Refaca o login com TOTP.`,
            codigo: "2FA_EXPIRADO",
            requer_reverificacao_2fa: true,
            janela_horas: janelaHoras,
            ultimo_2fa_em: ultimo?.toISOString() ?? null,
          });
          return;
        }
        next();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro ao validar 2FA";
        res.status(500).json({ error: msg });
      }
    })();
  };
}
