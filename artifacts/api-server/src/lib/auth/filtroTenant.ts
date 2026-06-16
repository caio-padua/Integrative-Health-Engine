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

/**
 * Variante ESTRITA do filtro de tenant, para rotas sensiveis (dados clinicos
 * multiunidade). Diferenca em relacao ao resolverFiltroTenant:
 *
 * - platform_owner / admin: identico — usa `?unidadeId=` para refinar ou ver tudo.
 * - tenant COM unidadeId no JWT: forca o unidadeId do JWT (ignora query param).
 * - tenant SEM unidadeId no JWT: retorna unidadeId=null SEM olhar query param.
 *   NAO ha mais fallback por `?unidadeId=` para nao-owner legado — isso fecha o
 *   IDOR em que um usuario sem unidade passava `?unidadeId=<alvo>` e lia dados de
 *   outra clinica. O chamador deve tratar unidadeId=null como NEGAR (fail-closed).
 *
 * @param req - Express Request com `req.user` populado pelo requireAuth
 */
export function resolverFiltroTenantEstrito(req: Request): FiltroTenantResult {
  const u = (req as AuthedRequest).user;

  const isPlatformOwner =
    u?.perfilPlataforma === "platform_owner" || u?.perfil === "admin";

  if (isPlatformOwner) {
    const raw = req.query["unidadeId"];
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

  // Nao-owner sem unidade no JWT: NUNCA usa query param. Forca null para que o
  // chamador negue (fail-closed), em vez de permitir leitura cross-unidade.
  return { unidadeId: null, isPlatformOwner: false };
}
