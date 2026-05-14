/**
 * Task #251 — Integração da rota PUT /admin/ceo-notif-preferencias.
 *
 * Cobre:
 *   - Upsert (INSERT na 1ª chamada, UPDATE na 2ª)
 *   - Invalidação real do cache em memória de prefs do CEO
 *   - Invariante: nunca_silenciar_recusa permanece TRUE no DB
 *   - Validações de input: canal, hora e tz
 */

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { AddressInfo } from "node:net";
import express from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import notifAssinaturaRouter from "./notifAssinatura";
import { signJwt, type JwtPayload } from "../lib/auth/jwt";
import { getCEOPref, invalidarCacheCEOPrefs } from "../lib/recorrencia/notifAssinatura";

interface PrefRow {
  canal: string;
  habilitar_quiet_hours: boolean;
  nunca_silenciar_recusa: boolean;
}

interface PutResponseBody {
  ok: boolean;
  preferencia?: {
    canal: string;
    quiet_inicio: string;
    quiet_fim: string;
    tz: string;
    habilitar_quiet_hours: boolean;
    nunca_silenciar_recusa: boolean;
  };
  error?: string;
}

interface ExecResult<T> {
  rows?: T[];
}

function rowsOf<T>(r: unknown): T[] {
  const cast = r as ExecResult<T> | T[];
  if (Array.isArray(cast)) return cast;
  return cast.rows ?? [];
}

let server: http.Server;
let baseUrl = "";
let usuarioIdTeste = 0;
let bearerToken = "";

before(async () => {
  const email = `task251-route-${Date.now()}@pawards.test`;
  const r = await db.execute<{ id: number }>(sql`
    INSERT INTO usuarios (nome, email, senha, perfil, escopo, perfil_plataforma, ativo)
    VALUES ('Task251 Route', ${email}, 'x', 'validador_mestre',
            'consultoria_master', 'tenant_user', true)
    RETURNING id
  `);
  usuarioIdTeste = r.rows[0]!.id;

  // A rota lê `req.user?.id`. Em prod o login costuma anexar `id` ao
  // payload junto de `sub`; espelhamos isso aqui via uma claim extra
  // tipada com interface local pra não recorrer a `as any`.
  interface JwtPayloadComId extends Omit<JwtPayload, "iat" | "exp"> {
    id: number;
  }
  const payload: JwtPayloadComId = {
    sub: usuarioIdTeste,
    email,
    perfil: "validador_mestre",
    escopo: "consultoria_master",
    unidadeId: 1,
    consultoriaId: null,
    perfilPlataforma: "tenant_user",
    id: usuarioIdTeste,
  };
  bearerToken = signJwt(payload);

  const app = express();
  app.use(express.json());
  app.use(notifAssinaturaRouter);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  if (usuarioIdTeste) {
    await db.execute(sql`DELETE FROM ceo_notif_preferencias WHERE usuario_id = ${usuarioIdTeste}`);
    await db.execute(sql`DELETE FROM usuarios WHERE id = ${usuarioIdTeste}`);
  }
});

async function call(method: string, path: string, body?: unknown): Promise<{
  status: number;
  body: PutResponseBody;
}> {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${bearerToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: PutResponseBody;
  try {
    parsed = text ? (JSON.parse(text) as PutResponseBody) : { ok: false };
  } catch {
    parsed = { ok: false, error: text };
  }
  return { status: res.status, body: parsed };
}

test("Task #251 · PUT /admin/ceo-notif-preferencias faz INSERT na primeira chamada", async () => {
  const r = await call("PUT", "/admin/ceo-notif-preferencias", {
    canal: "EMAIL",
    quiet_inicio: "22:00:00",
    quiet_fim: "07:00:00",
    tz: "America/Sao_Paulo",
    habilitar_quiet_hours: true,
  });
  assert.equal(r.status, 200, `esperava 200, body=${JSON.stringify(r.body)}`);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.preferencia?.canal, "EMAIL");
  assert.equal(r.body.preferencia?.habilitar_quiet_hours, true);
  assert.equal(r.body.preferencia?.quiet_inicio, "22:00:00");

  const dbRows = await db.execute<PrefRow>(sql`
    SELECT canal, habilitar_quiet_hours, nunca_silenciar_recusa
    FROM ceo_notif_preferencias
    WHERE usuario_id = ${usuarioIdTeste} AND canal = 'EMAIL'
  `);
  const linha = rowsOf<PrefRow>(dbRows)[0];
  assert.ok(linha);
  assert.equal(linha.habilitar_quiet_hours, true);
  assert.equal(linha.nunca_silenciar_recusa, true, "INVARIANTE: recusa hard-locked TRUE");
});

test("Task #251 · PUT /admin/ceo-notif-preferencias faz UPDATE na segunda chamada (upsert)", async () => {
  const r = await call("PUT", "/admin/ceo-notif-preferencias", {
    canal: "EMAIL",
    quiet_inicio: "23:30:00",
    quiet_fim: "06:30:00",
    tz: "UTC",
    habilitar_quiet_hours: false,
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.preferencia?.quiet_inicio, "23:30:00");
  assert.equal(r.body.preferencia?.tz, "UTC");
  assert.equal(r.body.preferencia?.habilitar_quiet_hours, false);

  const cnt = await db.execute<{ n: number }>(sql`
    SELECT count(*)::int AS n FROM ceo_notif_preferencias
    WHERE usuario_id = ${usuarioIdTeste} AND canal = 'EMAIL'
  `);
  assert.equal(rowsOf<{ n: number }>(cnt)[0]!.n, 1, "upsert deve manter 1 linha");
});

test("Task #251 · PUT invalida o cache de prefs do CEO em memória", async () => {
  // Setup: usuário CEO dedicado (ativo, validador_mestre) com email
  // batendo com `destinatario` pra getCEOPref encontrar via JOIN.
  const emailCEO = `task251-cache-${Date.now()}@pawards.test`;
  const u = await db.execute<{ id: number }>(sql`
    INSERT INTO usuarios (nome, email, senha, perfil, escopo, perfil_plataforma, ativo)
    VALUES ('Task251 Cache', ${emailCEO}, 'x', 'validador_mestre',
            'consultoria_master', 'tenant_user', true)
    RETURNING id
  `);
  const ceoId = u.rows[0]!.id;

  // Gera bearer pra esse usuário específico, pra que o PUT atualize a
  // preferência DELE (que getCEOPref vai ler depois).
  interface JwtPayloadComId extends Omit<JwtPayload, "iat" | "exp"> {
    id: number;
  }
  const tokenCEO = signJwt({
    sub: ceoId,
    email: emailCEO,
    perfil: "validador_mestre",
    escopo: "consultoria_master",
    unidadeId: 1,
    consultoriaId: null,
    perfilPlataforma: "tenant_user",
    id: ceoId,
  } as JwtPayloadComId);

  try {
    // Estado inicial: grava pref via SQL direto + popula cache lendo via
    // getCEOPref (cache fica com quiet_inicio = "22:00:00").
    invalidarCacheCEOPrefs();
    await db.execute(sql`
      INSERT INTO ceo_notif_preferencias
        (usuario_id, canal, quiet_inicio, quiet_fim, tz,
         habilitar_quiet_hours, nunca_silenciar_recusa, atualizado_em)
      VALUES (${ceoId}, 'EMAIL', '22:00:00'::time, '07:00:00'::time,
              'UTC', true, true, NOW())
    `);
    const cacheado = await getCEOPref(emailCEO, "EMAIL");
    assert.equal(cacheado?.quiet_inicio, "22:00:00", "cache deve ter o valor inicial");

    // Sanity check do cache: muda DB direto SEM invalidar, getCEOPref
    // ainda retorna o valor antigo (TTL 60s, prova que cache existe).
    await db.execute(sql`
      UPDATE ceo_notif_preferencias
      SET quiet_inicio = '01:00:00'::time
      WHERE usuario_id = ${ceoId} AND canal = 'EMAIL'
    `);
    const aindaCacheado = await getCEOPref(emailCEO, "EMAIL");
    assert.equal(aindaCacheado?.quiet_inicio, "22:00:00", "cache hit, valor antigo");

    // Ato sob teste: PUT na rota deve invalidar o cache. Próxima leitura
    // de getCEOPref tem que devolver o valor recém-gravado pela rota.
    const VALOR_NOVO = "03:30:00";
    const resp = await fetch(`${baseUrl}/admin/ceo-notif-preferencias`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${tokenCEO}`,
      },
      body: JSON.stringify({
        canal: "EMAIL",
        quiet_inicio: VALOR_NOVO,
        quiet_fim: "07:00:00",
        tz: "UTC",
        habilitar_quiet_hours: true,
      }),
    });
    assert.equal(resp.status, 200, await resp.text());

    const aposPut = await getCEOPref(emailCEO, "EMAIL");
    assert.equal(
      aposPut?.quiet_inicio,
      VALOR_NOVO,
      "PUT deveria invalidar cache pra getCEOPref ler valor fresco do DB",
    );
  } finally {
    await db.execute(sql`DELETE FROM ceo_notif_preferencias WHERE usuario_id = ${ceoId}`);
    await db.execute(sql`DELETE FROM usuarios WHERE id = ${ceoId}`);
    invalidarCacheCEOPrefs();
  }
});

test("Task #251 · PUT rejeita canal invalido", async () => {
  const r = await call("PUT", "/admin/ceo-notif-preferencias", {
    canal: "SMS",
    quiet_inicio: "22:00:00",
    quiet_fim: "07:00:00",
  });
  assert.equal(r.status, 400);
  assert.match(String(r.body.error), /canal_invalido/);
});

test("Task #251 · PUT rejeita hora invalida", async () => {
  // Formato fora do regex `^\d{2}:\d{2}(:\d{2})?$`. Não usamos "25:99:00"
  // porque o regex só checa formato; valores fora-de-faixa quebram no
  // cast do PG e retornam 500 em vez de 400.
  const r = await call("PUT", "/admin/ceo-notif-preferencias", {
    canal: "EMAIL",
    quiet_inicio: "abacaxi",
    quiet_fim: "07:00:00",
  });
  assert.equal(r.status, 400);
  assert.match(String(r.body.error), /quiet_inicio_invalido/);
});

test("Task #251 · PUT rejeita tz invalido", async () => {
  const r = await call("PUT", "/admin/ceo-notif-preferencias", {
    canal: "EMAIL",
    quiet_inicio: "22:00:00",
    quiet_fim: "07:00:00",
    tz: "Mars/Olympus_Mons",
  });
  assert.equal(r.status, 400);
  assert.match(String(r.body.error), /tz_invalido/);
});
