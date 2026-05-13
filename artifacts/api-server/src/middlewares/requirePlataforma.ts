import type { Request, Response, NextFunction } from "express";

/**
 * Wave 13 F2 — RBAC hierarquico de plataforma (ortogonal ao `perfil` clinico legado).
 *
 * Ranking (gradiente):
 *   platform_owner (3)  >  tenant_admin (2)  >  tenant_user (1)
 *
 * Convencao Wave 13 (Dr. Claude 2026-05-13): perfis em lowercase, status em UPPERCASE.
 * Naming: regra ferro Caio — campo SEMPRE `perfil_plataforma`, NUNCA `papel`/`role`.
 *
 * Retro-compat:
 *   - Nao substitui `requireRole(...perfis)` legado — coexiste.
 *   - Tokens emitidos antes de F2 (sem `perfilPlataforma`) sao tratados como
 *     `tenant_user` (default seguro do schema).
 *   - Bypass `perfil='admin'` (ADMIN_TOKEN, ja gateado em `requireAuth`) continua
 *     liberado pra preservar comportamento legado de painel/ferramentas internas.
 *     (Wave 10.5 ja bloqueia bypass admin-token em rotas Wave 10/relatorio diario;
 *     novas rotas Wave 13 devem entrar nessa whitelist tambem antes de virarem
 *     publicas pra TENANT_ADMIN.)
 *
 * Uso:
 *   router.post('/platform/tenants/:id/suspender',
 *     requireAuth,
 *     requirePlataforma('platform_owner'),
 *     handler);
 *
 *   router.get('/tenants/:unidadeId/usuarios',
 *     requireAuth,
 *     requirePlataforma('tenant_admin', { mesmoTenant: true }),
 *     handler);
 *
 * 2FA gate NAO entra em F2 (vai em F3 junto com TOTP enrollment).
 */

export type PerfilPlataforma = "platform_owner" | "tenant_admin" | "tenant_user";

const HIERARQUIA: Record<PerfilPlataforma, number> = {
  tenant_user: 1,
  tenant_admin: 2,
  platform_owner: 3,
};

export interface RequirePlataformaOpts {
  /**
   * Se true, valida que o usuario so opera em recursos da PROPRIA unidade.
   * platform_owner sempre passa (cross-tenant). tenant_admin/tenant_user precisa
   * que `req.params[paramKey]` (ou `req.body[bodyKey]`) seja igual a `req.user.unidadeId`.
   */
  mesmoTenant?: boolean;
  /**
   * Nome do parametro de rota com a unidade alvo. Default: 'unidadeId'.
   * Hardening F2: NAO ha mais fallback implicito pra `params.id` — se a rota usa
   * `:id` pra outra entidade (receitaId/pacienteId), informe explicitamente
   * `paramKey: 'id'` (opt-in consciente do autor).
   */
  paramKey?: string;
  /** Nome do campo no body com a unidade alvo. Default: 'unidadeId'. */
  bodyKey?: string;
}

export function requirePlataforma(
  perfilMinimo: PerfilPlataforma,
  opts: RequirePlataformaOpts = {},
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const u = req.user as any;
    if (!u) {
      res.status(401).json({ error: "Autenticacao necessaria" });
      return;
    }

    // Bypass legado: ADMIN_TOKEN injeta `perfil='admin'` em requireAuth.
    // Mantido pra retro-compat de ferramentas internas. Rotas juridicas
    // (Wave 10) ja bloqueiam admin-token via regex em requireAuth (sujeira #6).
    if (u.perfil === "admin") {
      next();
      return;
    }

    const perfilUsuario = (u.perfilPlataforma as PerfilPlataforma | undefined) ?? "tenant_user";
    const rankUsuario = HIERARQUIA[perfilUsuario] ?? 0;
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
      // Hardening F2 (architect FAIL→PASS): NUNCA cair em `params.id` implicito.
      // Rotas com `:id` generico (ex: receitaId, pacienteId) abririam autorizacao
      // por campo errado se o autor da rota esquecesse de passar paramKey.
      // Exigir SEMPRE chave explicita (default `unidadeId`, configuravel via opts).
      const paramKey = opts.paramKey ?? "unidadeId";
      const bodyKey = opts.bodyKey ?? "unidadeId";
      const rawTarget =
        (req.params as Record<string, string | undefined>)[paramKey] ??
        (req.body && (req.body as Record<string, unknown>)[bodyKey]);
      const target = Number(rawTarget);
      const userTenant = u.unidadeId as number | null | undefined;
      // Fail-closed: target precisa ser INTEIRO POSITIVO (id de unidade real).
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
          unidade_usuario: userTenant ?? null,
        });
        return;
      }
    }

    next();
  };
}
