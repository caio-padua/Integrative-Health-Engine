import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { requirePlataforma } from "./requirePlataforma";

type Status = number | undefined;
interface FakeRes {
  statusCode: Status;
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

function run(
  middleware: ReturnType<typeof requirePlataforma>,
  user: any,
  reqExtra: { params?: Record<string, string>; body?: Record<string, unknown> } = {},
): { res: FakeRes; nextCalled: boolean } {
  const req: any = { user, params: reqExtra.params ?? {}, body: reqExtra.body ?? {} };
  const res = makeRes();
  let nextCalled = false;
  const next = () => { nextCalled = true; };
  middleware(req, res, next as any);
  return { res, nextCalled };
}

describe("requirePlataforma · gradiente hierarquico", () => {
  it("401 quando req.user ausente", () => {
    const { res, nextCalled } = run(requirePlataforma("tenant_user"), undefined);
    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
  });

  it("platform_owner passa em platform_owner", () => {
    const { res, nextCalled } = run(
      requirePlataforma("platform_owner"),
      { perfil: "validador_mestre", perfilPlataforma: "platform_owner", unidadeId: 1 },
    );
    assert.equal(res.statusCode, undefined);
    assert.equal(nextCalled, true);
  });

  it("tenant_admin passa em tenant_user (gradiente)", () => {
    const { nextCalled } = run(
      requirePlataforma("tenant_user"),
      { perfilPlataforma: "tenant_admin", unidadeId: 1 },
    );
    assert.equal(nextCalled, true);
  });

  it("tenant_admin BLOQUEADO em platform_owner", () => {
    const { res, nextCalled } = run(
      requirePlataforma("platform_owner"),
      { perfilPlataforma: "tenant_admin", unidadeId: 1 },
    );
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
    assert.equal(res.body.perfil_minimo, "platform_owner");
    assert.equal(res.body.perfil_atual, "tenant_admin");
  });

  it("tenant_user BLOQUEADO em tenant_admin", () => {
    const { res, nextCalled } = run(
      requirePlataforma("tenant_admin"),
      { perfilPlataforma: "tenant_user", unidadeId: 1 },
    );
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
  });

  it("token sem perfilPlataforma e tratado como tenant_user (retro-compat)", () => {
    const { res, nextCalled } = run(
      requirePlataforma("tenant_admin"),
      { perfil: "medico", unidadeId: 1 },
    );
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
    assert.equal(res.body.perfil_atual, "tenant_user");
  });

  it("token sem perfilPlataforma passa em tenant_user", () => {
    const { nextCalled } = run(
      requirePlataforma("tenant_user"),
      { perfil: "enfermeira", unidadeId: 1 },
    );
    assert.equal(nextCalled, true);
  });

  it("perfilPlataforma desconhecido (token forjado/corrompido) e tratado como rank 0 e BLOQUEADO", () => {
    const { res, nextCalled } = run(
      requirePlataforma("tenant_user"),
      { perfilPlataforma: "super_root" as any, unidadeId: 1 },
    );
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
    assert.equal(res.body.perfil_atual, "super_root");
  });

  it("perfil legado 'admin' (ADMIN_TOKEN) bypassa tudo", () => {
    const { nextCalled } = run(
      requirePlataforma("platform_owner"),
      { perfil: "admin" },
    );
    assert.equal(nextCalled, true);
  });
});

describe("requirePlataforma · tenant isolation (mesmoTenant)", () => {
  it("platform_owner cruza tenants livremente", () => {
    const { nextCalled } = run(
      requirePlataforma("tenant_user", { mesmoTenant: true }),
      { perfilPlataforma: "platform_owner", unidadeId: 1 },
      { params: { unidadeId: "999" } },
    );
    assert.equal(nextCalled, true);
  });

  it("tenant_admin passa quando params.unidadeId === user.unidadeId", () => {
    const { nextCalled } = run(
      requirePlataforma("tenant_admin", { mesmoTenant: true }),
      { perfilPlataforma: "tenant_admin", unidadeId: 7 },
      { params: { unidadeId: "7" } },
    );
    assert.equal(nextCalled, true);
  });

  it("tenant_admin BLOQUEADO quando params.unidadeId !== user.unidadeId", () => {
    const { res, nextCalled } = run(
      requirePlataforma("tenant_admin", { mesmoTenant: true }),
      { perfilPlataforma: "tenant_admin", unidadeId: 7 },
      { params: { unidadeId: "8" } },
    );
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
    assert.equal(res.body.unidade_alvo, 8);
    assert.equal(res.body.unidade_usuario, 7);
  });

  it("HARDENING: NAO faz fallback implicito pra params.id (evita autz por campo errado)", () => {
    // params.id pode ser receitaId/pacienteId — usar isso como tenant target
    // abriria autorizacao por campo errado. Hardening F2: exigir paramKey explicito.
    const { res, nextCalled } = run(
      requirePlataforma("tenant_admin", { mesmoTenant: true }),
      { perfilPlataforma: "tenant_admin", unidadeId: 5 },
      { params: { id: "5" } },
    );
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
  });

  it("HARDENING: paramKey explicito 'id' funciona (opt-in consciente do autor da rota)", () => {
    const { nextCalled } = run(
      requirePlataforma("tenant_admin", { mesmoTenant: true, paramKey: "id" }),
      { perfilPlataforma: "tenant_admin", unidadeId: 5 },
      { params: { id: "5" } },
    );
    assert.equal(nextCalled, true);
  });

  it("usa body quando params ausente", () => {
    const { nextCalled } = run(
      requirePlataforma("tenant_admin", { mesmoTenant: true }),
      { perfilPlataforma: "tenant_admin", unidadeId: 3 },
      { body: { unidadeId: 3 } },
    );
    assert.equal(nextCalled, true);
  });

  it("paramKey customizado (ex: tenantId)", () => {
    const { nextCalled } = run(
      requirePlataforma("tenant_admin", { mesmoTenant: true, paramKey: "tenantId" }),
      { perfilPlataforma: "tenant_admin", unidadeId: 12 },
      { params: { tenantId: "12" } },
    );
    assert.equal(nextCalled, true);
  });

  it("BLOQUEADO quando user.unidadeId nulo (sem tenant atribuido)", () => {
    const { res, nextCalled } = run(
      requirePlataforma("tenant_admin", { mesmoTenant: true }),
      { perfilPlataforma: "tenant_admin", unidadeId: null },
      { params: { unidadeId: "1" } },
    );
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
  });

  it("BLOQUEADO quando target unidade nao numerica", () => {
    const { res, nextCalled } = run(
      requirePlataforma("tenant_admin", { mesmoTenant: true }),
      { perfilPlataforma: "tenant_admin", unidadeId: 1 },
      { params: {} },
    );
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
  });
});

describe("requirePlataforma · integracao JWT (signJwt → verifyJwt → middleware)", () => {
  it("perfilPlataforma sobrevive roundtrip de assinatura/verificacao do JWT", async () => {
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? "test-secret-dev-only";
    const { signJwt, verifyJwt } = await import("../lib/auth/jwt");
    const token = signJwt({
      sub: 999,
      email: "owner@pawards.com.br",
      perfil: "validador_mestre",
      escopo: "consultoria_master",
      unidadeId: 1,
      consultoriaId: null,
      perfilPlataforma: "platform_owner",
    });
    const decoded = verifyJwt(token);
    assert.equal(decoded.perfilPlataforma, "platform_owner");

    const { nextCalled } = run(
      requirePlataforma("platform_owner"),
      decoded,
    );
    assert.equal(nextCalled, true);
  });

  it("token legado (sem perfilPlataforma na assinatura) sobrevive verifyJwt e cai pra tenant_user no middleware", async () => {
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? "test-secret-dev-only";
    const { signJwt, verifyJwt } = await import("../lib/auth/jwt");
    const token = signJwt({
      sub: 1,
      email: "legado@pawards.com.br",
      perfil: "enfermeira",
      escopo: "clinica_enfermeira",
      unidadeId: 1,
      consultoriaId: null,
    });
    const decoded = verifyJwt(token);
    assert.equal(decoded.perfilPlataforma, undefined);

    const { res: bloqueado } = run(requirePlataforma("tenant_admin"), decoded);
    assert.equal(bloqueado.statusCode, 403);
    assert.equal(bloqueado.body.perfil_atual, "tenant_user");

    const { nextCalled } = run(requirePlataforma("tenant_user"), decoded);
    assert.equal(nextCalled, true);
  });
});

describe("requirePlataforma · interacao com requireRole legado (smoke)", () => {
  it("requirePlataforma NAO mexe em req.user.perfil legado", () => {
    const u = { perfil: "validador_mestre", perfilPlataforma: "platform_owner", unidadeId: 1 };
    const { nextCalled } = run(requirePlataforma("platform_owner"), u);
    assert.equal(nextCalled, true);
    assert.equal(u.perfil, "validador_mestre");
    assert.equal(u.perfilPlataforma, "platform_owner");
  });
});
