import { describe, it, before, after } from "node:test";
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

// Helper que aguarda a microtask do void async () dentro do requireAuth
// (Task #154 introduziu lookup async em usuarios.tokens_invalidos_apos
// pra implementar o kill-switch de sessoes). Polla por ate 3s em vez de
// timeout fixo pra absorver latencia de cold-start de conexao do pool pg.
async function aguardarAsync(checar: () => boolean): Promise<void> {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    if (checar()) return;
    await new Promise((r) => setTimeout(r, 20));
  }
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
    // Task #154: lookup async em usuarios.tokens_invalidos_apos.
    await aguardarAsync(() => nextCalled || res.statusCode !== undefined);
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

// Task #154 — kill-switch de sessoes via usuarios.tokens_invalidos_apos.
// Cobre o middleware rejeitando JWT cujo `iat` < cutoff e voltando a aceitar
// quando o cutoff e limpo (ou quando o JWT e re-emitido apos o bump).
describe("requireAuth · Task #154 kill-switch tokens_invalidos_apos", () => {
  let usuarioIdTeste = 0;

  before(async () => {
    const { db } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");
    // Cria um usuario alvo descartavel pra evitar interferir com o user 1
    // (platform_owner real). Email unico via timestamp.
    const email = `kill-switch-test-${Date.now()}@pawards.test`;
    const r = await db.execute<{ id: number }>(sql`
      INSERT INTO usuarios (nome, email, senha, perfil, escopo, perfil_plataforma)
      VALUES ('Teste KillSwitch', ${email}, 'x', 'enfermeira', 'clinica_enfermeira', 'tenant_user')
      RETURNING id
    `);
    usuarioIdTeste = r.rows[0]!.id;
  });

  after(async () => {
    if (!usuarioIdTeste) return;
    const { db } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`DELETE FROM usuarios WHERE id = ${usuarioIdTeste}`);
  });

  it("REJEITA JWT cujo iat < tokens_invalidos_apos (sessao invalidada)", async () => {
    const { signJwt } = await import("../lib/auth/jwt");
    const { requireAuth } = await import("./requireAuth");
    const { db } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");

    // 1) Emite JWT com iat = agora.
    const token = signJwt({
      sub: usuarioIdTeste,
      email: "kill-switch-test@pawards.test",
      perfil: "enfermeira",
      escopo: "clinica_enfermeira",
      unidadeId: null,
      consultoriaId: null,
      perfilPlataforma: "tenant_user",
    });

    // 2) Bumpa tokens_invalidos_apos pra 1 minuto NO FUTURO — garante que
    //    iat * 1000 < cutoff em qualquer relogio razoavel.
    const cutoff = new Date(Date.now() + 60_000);
    await db.execute(sql`
      UPDATE usuarios SET tokens_invalidos_apos = ${cutoff.toISOString()}::timestamptz
      WHERE id = ${usuarioIdTeste}
    `);

    const req: any = {
      path: "/pacientes",
      url: "/pacientes",
      header: (h: string) =>
        h.toLowerCase() === "authorization" ? `Bearer ${token}` : "",
      cookies: {},
    };
    const res = makeRes();
    let nextCalled = false;
    requireAuth(req, res as any, () => { nextCalled = true; });
    await aguardarAsync(() => nextCalled || res.statusCode !== undefined);
    assert.equal(nextCalled, false, "sessao invalidada NAO pode passar");
    assert.equal(res.statusCode, 401);
    assert.equal(res.body?.codigo, "SESSAO_INVALIDADA");
  });

  it("REJEITA JWT de platform_owner quando iat < cutoff (Task #154 follow-up: owner pode ser alvo)", async () => {
    const { signJwt } = await import("../lib/auth/jwt");
    const { requireAuth } = await import("./requireAuth");
    const { db } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");

    // Cria um segundo usuario de teste com perfil_plataforma=platform_owner
    // pra simular o cenario "owner teve sessao hijacked, outro owner forca
    // logout dele". Marcamos como inativo no after pra nao colidir com
    // o unique parcial de platform_owner ativo.
    const email = `kill-switch-owner-${Date.now()}@pawards.test`;
    const r = await db.execute<{ id: number }>(sql`
      INSERT INTO usuarios (nome, email, senha, perfil, escopo, perfil_plataforma, ativo)
      VALUES ('Owner KillSwitch', ${email}, 'x', 'validador_mestre', 'consultoria_master', 'platform_owner', false)
      RETURNING id
    `);
    const ownerId = r.rows[0]!.id;
    try {
      const cutoff = new Date(Date.now() + 60_000);
      await db.execute(sql`
        UPDATE usuarios SET tokens_invalidos_apos = ${cutoff.toISOString()}::timestamptz
        WHERE id = ${ownerId}
      `);

      const token = signJwt({
        sub: ownerId,
        email,
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
          h.toLowerCase() === "authorization" ? `Bearer ${token}` : "",
        cookies: {},
      };
      const res = makeRes();
      let nextCalled = false;
      requireAuth(req, res as any, () => { nextCalled = true; });
      await aguardarAsync(() => nextCalled || res.statusCode !== undefined);
      assert.equal(nextCalled, false, "JWT antigo do owner DEVE ser rejeitado");
      assert.equal(res.statusCode, 401);
      assert.equal(res.body?.codigo, "SESSAO_INVALIDADA");
    } finally {
      await db.execute(sql`DELETE FROM usuarios WHERE id = ${ownerId}`);
    }
  });

  it("ACEITA JWT cujo iat > tokens_invalidos_apos (re-login depois do bump)", async () => {
    const { signJwt } = await import("../lib/auth/jwt");
    const { requireAuth } = await import("./requireAuth");
    const { db } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");

    // Cutoff no PASSADO. JWT emitido agora tem iat > cutoff → passa.
    const cutoff = new Date(Date.now() - 60_000);
    await db.execute(sql`
      UPDATE usuarios SET tokens_invalidos_apos = ${cutoff.toISOString()}::timestamptz
      WHERE id = ${usuarioIdTeste}
    `);

    const token = signJwt({
      sub: usuarioIdTeste,
      email: "kill-switch-test@pawards.test",
      perfil: "enfermeira",
      escopo: "clinica_enfermeira",
      unidadeId: null,
      consultoriaId: null,
      perfilPlataforma: "tenant_user",
    });

    const req: any = {
      path: "/pacientes",
      url: "/pacientes",
      header: (h: string) =>
        h.toLowerCase() === "authorization" ? `Bearer ${token}` : "",
      cookies: {},
    };
    const res = makeRes();
    let nextCalled = false;
    requireAuth(req, res as any, () => { nextCalled = true; });
    await aguardarAsync(() => nextCalled || res.statusCode !== undefined);
    assert.equal(nextCalled, true, "JWT pos-bump deve passar");
    assert.equal(res.statusCode, undefined);
    assert.equal(req.user?.sub, usuarioIdTeste);
  });
});
