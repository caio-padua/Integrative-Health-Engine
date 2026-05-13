import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

before(() => {
  process.env["SESSION_SECRET"] =
    process.env["SESSION_SECRET"] ?? "test-secret-dev-only-requireauth";
});

interface FakeRes {
  statusCode: number | undefined;
  body: any;
  status: (n: number) => FakeRes;
  json: (b: any) => FakeRes;
}
function makeRes(): FakeRes {
  const res: FakeRes = {
    statusCode: undefined,
    body: undefined,
    status(n) { res.statusCode = n; return res; },
    json(b) { res.body = b; return res; },
  };
  return res;
}

describe("requireAuth · Wave 13 F3 hardening: 2FA challenge nao e bearer", () => {
  it("REJEITA token com twoFactorChallenge=true como Bearer em rotas protegidas", async () => {
    const { signJwt } = await import("../lib/auth/jwt");
    const { requireAuth } = await import("./requireAuth");
    const challenge = signJwt({
      sub: 1,
      email: "owner@pawards.com.br",
      perfil: "validador_mestre",
      escopo: "consultoria_master",
      unidadeId: 1,
      consultoriaId: null,
      perfilPlataforma: "platform_owner",
      twoFactorChallenge: true,
    });
    const req: any = {
      path: "/pacientes",
      url: "/pacientes",
      header: (h: string) =>
        h.toLowerCase() === "authorization" ? `Bearer ${challenge}` : "",
      cookies: {},
    };
    const res = makeRes();
    let nextCalled = false;
    requireAuth(req, res as any, () => { nextCalled = true; });
    assert.equal(nextCalled, false, "challenge NAO deve passar como sessao");
    assert.equal(res.statusCode, 401);
    assert.match(String(res.body?.error ?? ""), /challenge 2FA/i);
  });

  it("ACEITA token de sessao normal (sem flag twoFactorChallenge)", async () => {
    const { signJwt } = await import("../lib/auth/jwt");
    const { requireAuth } = await import("./requireAuth");
    const sessionToken = signJwt({
      sub: 1,
      email: "owner@pawards.com.br",
      perfil: "validador_mestre",
      escopo: "consultoria_master",
      unidadeId: 1,
      consultoriaId: null,
      perfilPlataforma: "platform_owner",
    });
    const req: any = {
      path: "/pacientes",
      url: "/pacientes",
      header: (h: string) =>
        h.toLowerCase() === "authorization" ? `Bearer ${sessionToken}` : "",
      cookies: {},
    };
    const res = makeRes();
    let nextCalled = false;
    requireAuth(req, res as any, () => { nextCalled = true; });
    assert.equal(nextCalled, true, "token normal deve passar");
    assert.equal(res.statusCode, undefined);
    assert.equal(req.user?.sub, 1);
  });

  it("rota publica /usuarios/login/2fa-verificar nao exige Bearer", async () => {
    const { requireAuth } = await import("./requireAuth");
    const req: any = {
      path: "/usuarios/login/2fa-verificar",
      url: "/usuarios/login/2fa-verificar",
      header: () => "",
      cookies: {},
    };
    const res = makeRes();
    let nextCalled = false;
    requireAuth(req, res as any, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, undefined);
  });
});
