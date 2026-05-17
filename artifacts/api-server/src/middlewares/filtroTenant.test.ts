import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolverFiltroTenant } from "../lib/auth/filtroTenant.js";

function makeReq(opts: {
  perfilPlataforma?: string;
  perfil?: string;
  unidadeId?: number | null;
  queryUnidadeId?: string;
}): any {
  return {
    user: {
      sub: 1,
      email: "test@test.com",
      perfil: opts.perfil ?? "medico",
      perfilPlataforma: opts.perfilPlataforma ?? "tenant_user",
      unidadeId: opts.unidadeId ?? null,
      escopo: null,
      consultoriaId: null,
      iat: 0,
      exp: 9999999999,
    },
    query: opts.queryUnidadeId !== undefined
      ? { unidadeId: opts.queryUnidadeId }
      : {},
  };
}

describe("resolverFiltroTenant · Wave 13 F2", () => {

  it("platform_owner sem query → unidadeId null (ver tudo)", () => {
    const req = makeReq({ perfilPlataforma: "platform_owner", unidadeId: 1 });
    const r = resolverFiltroTenant(req);
    assert.equal(r.unidadeId, null);
    assert.equal(r.isPlatformOwner, true);
  });

  it("platform_owner com ?unidadeId=5 → usa query param", () => {
    const req = makeReq({ perfilPlataforma: "platform_owner", unidadeId: 1, queryUnidadeId: "5" });
    const r = resolverFiltroTenant(req);
    assert.equal(r.unidadeId, 5);
    assert.equal(r.isPlatformOwner, true);
  });

  it("perfil admin (bypass ADMIN_TOKEN) → comportamento platform_owner", () => {
    const req = makeReq({ perfil: "admin", perfilPlataforma: undefined as any, unidadeId: null });
    const r = resolverFiltroTenant(req);
    assert.equal(r.isPlatformOwner, true);
  });

  it("tenant_user COM unidadeId no JWT → isola forcado, ignora query", () => {
    const req = makeReq({ perfilPlataforma: "tenant_user", unidadeId: 3, queryUnidadeId: "99" });
    const r = resolverFiltroTenant(req);
    assert.equal(r.unidadeId, 3);
    assert.equal(r.isPlatformOwner, false);
  });

  it("tenant_user SEM unidadeId no JWT → usa query param (backward compat consultor global)", () => {
    const req = makeReq({ perfilPlataforma: "tenant_user", unidadeId: null, queryUnidadeId: "7" });
    const r = resolverFiltroTenant(req);
    assert.equal(r.unidadeId, 7);
    assert.equal(r.isPlatformOwner, false);
  });

  it("tenant_user SEM unidadeId E sem query → null (sem filtro, backward compat)", () => {
    const req = makeReq({ perfilPlataforma: "tenant_user", unidadeId: null });
    const r = resolverFiltroTenant(req);
    assert.equal(r.unidadeId, null);
    assert.equal(r.isPlatformOwner, false);
  });

  it("tenant_admin COM unidadeId no JWT → isola forcado, ignora query", () => {
    const req = makeReq({ perfilPlataforma: "tenant_admin", unidadeId: 2, queryUnidadeId: "88" });
    const r = resolverFiltroTenant(req);
    assert.equal(r.unidadeId, 2);
    assert.equal(r.isPlatformOwner, false);
  });

  it("query param invalido (NaN) → null", () => {
    const req = makeReq({ perfilPlataforma: "platform_owner", unidadeId: 1, queryUnidadeId: "nao-e-numero" });
    const r = resolverFiltroTenant(req);
    assert.equal(r.unidadeId, null);
  });

  it("query param zero → null (id=0 invalido)", () => {
    const req = makeReq({ perfilPlataforma: "platform_owner", unidadeId: 1, queryUnidadeId: "0" });
    const r = resolverFiltroTenant(req);
    assert.equal(r.unidadeId, null);
  });
});
