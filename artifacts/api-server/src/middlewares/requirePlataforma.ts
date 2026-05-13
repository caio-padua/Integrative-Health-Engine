import type { Request, Response, NextFunction } from "express";
import type { JwtPayload } from "../lib/auth/jwt";

export type PerfilPlataforma = "platform_owner" | "tenant_admin" | "tenant_user";

const HIERARQUIA: Record<PerfilPlataforma, number> = {
  tenant_user: 1,
  tenant_admin: 2,
  platform_owner: 3,
};

export interface RequirePlataformaOpts {
  mesmoTenant?: boolean;
  paramKey?: string;
  bodyKey?: string;
}

interface AuthUser extends Partial<JwtPayload> {
  perfil?: string;
}

export function requirePlataforma(
  perfilMinimo: PerfilPlataforma,
  opts: RequirePlataformaOpts = {},
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const u = req.user as AuthUser | undefined;
    if (!u) {
      res.status(401).json({ error: "Autenticacao necessaria" });
      return;
    }

    if (u.perfil === "admin") {
      next();
      return;
    }

    const perfilUsuario: PerfilPlataforma | string =
      u.perfilPlataforma ?? "tenant_user";
    const rankUsuario = HIERARQUIA[perfilUsuario as PerfilPlataforma] ?? 0;
    const rankMinimo = HIERARQUIA[perfilMinimo];

    if (rankUsuario < rankMinimo) {
      res.status(403).json({
        error: "Acesso negado: perfil de plataforma insuficiente para esta operacao.",
        perfil_minimo: perfilMinimo,
        perfil_atual: perfilUsuario,
      });
      return;
    }

    if (opts.mesmoTenant && perfilUsuario !== "platform_owner") {
      const paramKey = opts.paramKey ?? "unidadeId";
      const bodyKey = opts.bodyKey ?? "unidadeId";
      const params = req.params as Record<string, string | undefined>;
      const body = (req.body ?? {}) as Record<string, unknown>;
      const rawTarget = params[paramKey] ?? body[bodyKey];
      const target = Number(rawTarget);
      const userTenant = u.unidadeId;
      if (
        !Number.isInteger(target) ||
        target <= 0 ||
        typeof userTenant !== "number" ||
        !Number.isInteger(userTenant) ||
        userTenant <= 0 ||
        target !== userTenant
      ) {
        res.status(403).json({
          error:
            "Acesso negado: tenant isolado (so pode operar na propria unidade).",
          unidade_alvo: Number.isFinite(target) ? target : null,
          unidade_usuario: typeof userTenant === "number" ? userTenant : null,
        });
        return;
      }
    }

    next();
  };
}
