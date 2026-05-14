import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { require2faRecente, JANELA_2FA_HORAS } from "./require2faRecente";

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

async function aguardarAsync(checar: () => boolean): Promise<void> {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    if (checar()) return;
    await new Promise((r) => setTimeout(r, 20));
  }
}

async function rodar(
  middleware: ReturnType<typeof require2faRecente>,
  user: any,
): Promise<{ res: FakeRes; nextCalled: boolean }> {
  const req: any = { user };
  const res = makeRes();
  let nextCalled = false;
  middleware(req, res as any, () => { nextCalled = true; });
  await aguardarAsync(() => nextCalled || res.statusCode !== undefined);
  return { res, nextCalled };
}

describe("require2faRecente · janela de 2FA pra acoes destrutivas", () => {
  let usuarioIdTeste = 0;
  const nodeEnvOriginal = process.env.NODE_ENV;
  const bypassOriginal = process.env.PLATFORM_BYPASS_2FA;

  before(async () => {
    const { db } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");
    const email = `require-2fa-recente-${Date.now()}@pawards.test`;
    const r = await db.execute<{ id: number }>(sql`
      INSERT INTO usuarios (nome, email, senha, perfil, escopo, perfil_plataforma, ativo)
      VALUES ('Teste 2FA Recente', ${email}, 'x', 'validador_mestre', 'consultoria_master', 'platform_owner', false)
      RETURNING id
    `);
    usuarioIdTeste = r.rows[0]!.id;
  });

  after(async () => {
    if (usuarioIdTeste) {
      const { db } = await import("@workspace/db");
      const { sql } = await import("drizzle-orm");
      await db.execute(sql`DELETE FROM usuarios WHERE id = ${usuarioIdTeste}`);
    }
    if (nodeEnvOriginal === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = nodeEnvOriginal;
    if (bypassOriginal === undefined) delete process.env.PLATFORM_BYPASS_2FA;
    else process.env.PLATFORM_BYPASS_2FA = bypassOriginal;
  });

  beforeEach(() => {
    delete process.env.PLATFORM_BYPASS_2FA;
    process.env.NODE_ENV = "test";
  });

  it("401 quando req.user ausente", async () => {
    const { res, nextCalled } = await rodar(require2faRecente(), undefined);
    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
  });

  it("403 com codigo 2FA_EXPIRADO quando ultimo_login_2fa_em e NULL", async () => {
    const { db } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`
      UPDATE usuarios SET ultimo_login_2fa_em = NULL WHERE id = ${usuarioIdTeste}
    `);

    const { res, nextCalled } = await rodar(
      require2faRecente(),
      { sub: usuarioIdTeste, perfilPlataforma: "platform_owner" },
    );
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
    assert.equal(res.body.codigo, "2FA_EXPIRADO");
    assert.equal(res.body.requer_reverificacao_2fa, true);
    assert.equal(res.body.janela_horas, JANELA_2FA_HORAS);
    assert.equal(res.body.ultimo_2fa_em, null);
  });

  it("403 quando 2FA expirou (fora da janela)", async () => {
    const { db } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");
    const antigo = new Date(Date.now() - (JANELA_2FA_HORAS + 1) * 60 * 60 * 1000);
    await db.execute(sql`
      UPDATE usuarios SET ultimo_login_2fa_em = ${antigo.toISOString()}::timestamptz
      WHERE id = ${usuarioIdTeste}
    `);

    const { res, nextCalled } = await rodar(
      require2faRecente(),
      { sub: usuarioIdTeste, perfilPlataforma: "platform_owner" },
    );
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
    assert.equal(res.body.codigo, "2FA_EXPIRADO");
    assert.equal(res.body.requer_reverificacao_2fa, true);
    assert.ok(res.body.ultimo_2fa_em, "ultimo_2fa_em deve vir preenchido com ISO");
  });

  it("next() quando 2FA esta dentro da janela", async () => {
    const { db } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");
    const recente = new Date(Date.now() - 60_000); // 1 min atras
    await db.execute(sql`
      UPDATE usuarios SET ultimo_login_2fa_em = ${recente.toISOString()}::timestamptz
      WHERE id = ${usuarioIdTeste}
    `);

    const { res, nextCalled } = await rodar(
      require2faRecente(),
      { sub: usuarioIdTeste, perfilPlataforma: "platform_owner" },
    );
    assert.equal(res.statusCode, undefined);
    assert.equal(nextCalled, true);
  });

  it("janela customizada (opts.janelaHoras=1) aperta o limite", async () => {
    const { db } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");
    // 2h atras: dentro da janela default (8h), FORA da janela custom (1h)
    const ha2h = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await db.execute(sql`
      UPDATE usuarios SET ultimo_login_2fa_em = ${ha2h.toISOString()}::timestamptz
      WHERE id = ${usuarioIdTeste}
    `);

    const { res: resOk } = await rodar(
      require2faRecente(),
      { sub: usuarioIdTeste, perfilPlataforma: "platform_owner" },
    );
    assert.equal(resOk.statusCode, undefined);

    const { res: resBloq, nextCalled } = await rodar(
      require2faRecente({ janelaHoras: 1 }),
      { sub: usuarioIdTeste, perfilPlataforma: "platform_owner" },
    );
    assert.equal(resBloq.statusCode, 403);
    assert.equal(nextCalled, false);
    assert.equal(resBloq.body.janela_horas, 1);
  });

  it("401 quando sub do JWT nao e id valido (sem tocar no DB)", async () => {
    const { res, nextCalled } = await rodar(
      require2faRecente(),
      { sub: "nao-numerico", perfilPlataforma: "platform_owner" },
    );
    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
  });

  it("BYPASS DEV: NODE_ENV!=production + PLATFORM_BYPASS_2FA=1 libera mesmo sem 2FA recente", async () => {
    const { db } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`
      UPDATE usuarios SET ultimo_login_2fa_em = NULL WHERE id = ${usuarioIdTeste}
    `);
    process.env.NODE_ENV = "development";
    process.env.PLATFORM_BYPASS_2FA = "1";

    const { res, nextCalled } = await rodar(
      require2faRecente(),
      { sub: usuarioIdTeste, perfilPlataforma: "platform_owner" },
    );
    assert.equal(res.statusCode, undefined);
    assert.equal(nextCalled, true);
  });

  it("BYPASS NAO se aplica em production (mesmo com PLATFORM_BYPASS_2FA=1)", async () => {
    const { db } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`
      UPDATE usuarios SET ultimo_login_2fa_em = NULL WHERE id = ${usuarioIdTeste}
    `);
    process.env.NODE_ENV = "production";
    process.env.PLATFORM_BYPASS_2FA = "1";

    const { res, nextCalled } = await rodar(
      require2faRecente(),
      { sub: usuarioIdTeste, perfilPlataforma: "platform_owner" },
    );
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
    assert.equal(res.body.codigo, "2FA_EXPIRADO");
  });

  it("BYPASS NAO se aplica quando flag PLATFORM_BYPASS_2FA esta ausente (apenas NODE_ENV dev)", async () => {
    const { db } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`
      UPDATE usuarios SET ultimo_login_2fa_em = NULL WHERE id = ${usuarioIdTeste}
    `);
    process.env.NODE_ENV = "development";
    delete process.env.PLATFORM_BYPASS_2FA;

    const { res, nextCalled } = await rodar(
      require2faRecente(),
      { sub: usuarioIdTeste, perfilPlataforma: "platform_owner" },
    );
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
    assert.equal(res.body.codigo, "2FA_EXPIRADO");
  });
});
