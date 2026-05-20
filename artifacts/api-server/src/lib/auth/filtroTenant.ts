import type { Request } from "express";
import type { JwtPayload } from "./jwt";

type AuthedRequest = Request & {
  user?: JwtPayload & { perfil?: string; perfilPlataforma?: string };
};

export interface FiltroTenantResult {
  /**
   * unidadeId a usar como filtro em queries.
   *
   * - null  → sem filtro (ver todos os registros da plataforma)
   * - number → filtrar apenas pela unidade informada
   */
  unidadeId: number | null;
  /**
   * true quando o usuário tem permissão irrestrita de plataforma
   * (platform_owner ou ADMIN_TOKEN). Pode ser usado para habilitar
   * campos extras ou comportamentos de visão global.
   */
  isPlatformOwner: boolean;
}

/**
 * Wave 13 F2 — Resolucao do filtro de tenant (unidadeId) para queries.
 *
 * Regra de isolamento por camada:
 *
 * 1. platform_owner / admin (bypass): usa `?unidadeId=` da query string
 *    (pode filtrar qualquer clínica ou ver tudo passando undefined).
 *
 * 2. tenant_admin / tenant_user COM unidadeId no JWT: o query param e
 *    IGNORADO e o unidadeId do JWT e FORCADO como filtro.
 *    Impede cross-tenant attack: usuario da Clínica A nao consegue
 *    passar `?unidadeId=B` para ler dados da Clínica B.
 *
 * 3. tenant_admin / tenant_user SEM unidadeId no JWT (unidadeId=null):
 *    usa `?unidadeId=` da query string — backward-compat para usuarios
 *    legados importados sem unidade_id definido (ex: consultores globais).
 *    Quando o sistema for totalmente multi-tenant, essa faixa desaparece.
 *
 * Uso nas rotas:
 *   const { unidadeId } = resolverFiltroTenant(req);
 *   if (unidadeId !== null) condicoes.push(eq(table.unidadeId, unidadeId));
 *
 * @param req - Express Request com `req.user` populado pelo requireAuth
 * @param queryParamKey - nome do query param a ler (default: "unidadeId")
 */
export function resolverFiltroTenant(
  req: Request,
  queryParamKey = "unidadeId",
): FiltroTenantResult {
  const u = (req as AuthedRequest).user;

  const isPlatformOwner =
    u?.perfilPlataforma === "platform_owner" || u?.perfil === "admin";

  if (isPlatformOwner) {
    const raw = req.query[queryParamKey];
    const parsed = raw !== undefined ? parseInt(String(raw), 10) : NaN;
    return {
      unidadeId: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
      isPlatformOwner: true,
    };
  }

  const jwtUnidadeId = u?.unidadeId ?? null;

  if (jwtUnidadeId !== null && Number.isInteger(jwtUnidadeId) && jwtUnidadeId > 0) {
    return { unidadeId: jwtUnidadeId, isPlatformOwner: false };
  }

  const raw = req.query[queryParamKey];
  const parsed = raw !== undefined ? parseInt(String(raw), 10) : NaN;
  return {
    unidadeId: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
    isPlatformOwner: false,
  };
}
