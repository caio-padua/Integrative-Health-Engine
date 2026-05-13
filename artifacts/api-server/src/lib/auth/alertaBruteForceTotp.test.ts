/**
 * Task #163 — Cobertura de regressao do `dispararAlertaBruteForceTotp`
 * (Task #143) e do par de endpoints da fila de alertas em
 * `routes/plataforma.ts` (Task #152).
 *
 * O helper e defensivo (try/catch global silencia erros). Sem teste,
 * uma regressao silenciosa passaria batido. Aqui exercemos:
 *   (1) gera 1 linha em `alertas_ceo_seguranca` quando chamado pela 1a vez;
 *   (2) ON CONFLICT DO NOTHING garante 1 linha por janela
 *       (chamadas adicionais com mesmo (usuario_id, janela_inicio_em) sao no-op);
 *   (3) GET /api/plataforma/alertas-seguranca devolve ip/user_agent/contexto
 *       corretos + filtro `apenas_nao_vistos`;
 *   (4) POST /:id/visualizar marca a linha como vista.
 *
 * Estrategia: usa o DB real (drizzle/pool ja sao um singleton no
 * @workspace/db) com cleanup explicito por linha de teste. O cliente
 * Gmail e injetado via `_setGmailClientFactoryParaTestes` pra nao
 * tocar a rede (mesmo padrao do `_setTotpRateLimitStoreParaTestes`,
 * Task #144). Os endpoints sao montados num express isolado com um
 * middleware-stub que coloca req.user pra burlar as guardas — o teste
 * de auth fica em requirePlataforma.test.ts.
 */
import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  dispararAlertaBruteForceTotp,
  _setGmailClientFactoryParaTestes,
  _resetGmailClientFactoryParaTestes,
} from "./alertaBruteForceTotp";

interface SendCapture { to: string; subject: string }
const enviosCapturados: SendCapture[] = [];

function buildGmailStub() {
  return {
    users: {
      messages: {
        send: async ({ requestBody }: { requestBody: { raw: string } }) => {
          // Decodifica o base64url do raw pra extrair To: e Subject: — assim
          // o teste valida com precisao QUEM o helper tentou notificar, sem
          // depender do estado real de owners do DB.
          const raw = Buffer.from(requestBody.raw, "base64url").toString("utf8");
          const toLine = raw.split(/\r?\n/).find((l) => l.toLowerCase().startsWith("to:")) ?? "";
          const subjLine = raw.split(/\r?\n/).find((l) => l.toLowerCase().startsWith("subject:")) ?? "";
          // Subject vai como `=?UTF-8?B?<base64>?=` (RFC 2047). Decodifica
          // pra que o assert nao precise saber dessa formatacao.
          const subjRaw = subjLine.replace(/^subject:\s*/i, "").trim();
          const m = subjRaw.match(/^=\?UTF-8\?B\?([^?]+)\?=$/i);
          const subject = m
            ? Buffer.from(m[1]!, "base64").toString("utf8")
            : subjRaw;
          enviosCapturados.push({
            to: toLine.replace(/^to:\s*/i, "").trim().toLowerCase(),
            subject,
          });
          return { data: { id: "stub" } };
        },
      },
    },
  } as unknown as Awaited<ReturnType<typeof import("../google-gmail").getGmailClient>>;
}

let alvoUsuarioId = 0;
// Usuarios elegiveis pra receber o alerta: o helper resolve destinatarios
// com `perfil_plataforma = 'platform_owner' OR perfil = 'validador_mestre'`.
// `platform_owner` tem UNIQUE no DB (so 1 dono), entao usamos
// `validador_mestre` (pode ter N) — assim o teste nao depende de owners
// reais e pode validar a query de destinatarios deterministicamente.
let validadorAtivoId = 0;
let validadorInativoId = 0;
const SUFIXO = `task163-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const EMAIL_VALIDADOR_ATIVO = `${SUFIXO}-vmestre-ativo@example.com`;
const EMAIL_VALIDADOR_INATIVO = `${SUFIXO}-vmestre-inativo@example.com`;

async function inserirUsuario(args: {
  nome: string; email: string; perfil?: string; perfilPlataforma?: string; ativo?: boolean;
}): Promise<number> {
  const r = await db.execute<{ id: number }>(sql`
    INSERT INTO usuarios
      (nome, email, senha, perfil, escopo, ativo, perfil_plataforma)
    VALUES
      (${args.nome}, ${args.email}, 'x',
       ${args.perfil ?? "enfermeira"}, 'clinica_enfermeira',
       ${args.ativo ?? true}, ${args.perfilPlataforma ?? "tenant_user"})
    RETURNING id
  `);
  const id = r.rows?.[0]?.id;
  if (!id) throw new Error("falha ao inserir usuario de teste");
  return id;
}

async function limparAlertasDoAlvo(): Promise<void> {
  await db.execute(sql`DELETE FROM alertas_ceo_seguranca WHERE usuario_id = ${alvoUsuarioId}`);
  enviosCapturados.length = 0;
}

before(async () => {
  _setGmailClientFactoryParaTestes(async () => buildGmailStub());
  alvoUsuarioId = await inserirUsuario({
    nome: "Teste BF 163", email: `${SUFIXO}-alvo@example.com`,
  });
  validadorAtivoId = await inserirUsuario({
    nome: "Validador Mestre Ativo", email: EMAIL_VALIDADOR_ATIVO,
    perfil: "validador_mestre", ativo: true,
  });
  // Inativo: o helper filtra por `ativo = true`. Garantimos que nao recebe.
  validadorInativoId = await inserirUsuario({
    nome: "Validador Mestre Inativo", email: EMAIL_VALIDADOR_INATIVO,
    perfil: "validador_mestre", ativo: false,
  });
});

after(async () => {
  await limparAlertasDoAlvo();
  await db.execute(sql`DELETE FROM usuarios WHERE id IN (
    ${alvoUsuarioId}, ${validadorAtivoId}, ${validadorInativoId}
  )`);
  _resetGmailClientFactoryParaTestes();
});

describe("dispararAlertaBruteForceTotp · idempotencia + payload (Task #143)", () => {
  beforeEach(limparAlertasDoAlvo);

  it("(1) gera 1 linha + persiste destinatarios + envia 1 email por destinatario elegivel", async () => {
    const janela = new Date("2026-05-13T10:00:00.000Z");
    await dispararAlertaBruteForceTotp({
      usuarioId: alvoUsuarioId,
      ip: "10.0.0.1",
      userAgent: "TestUA/1.0",
      janelaInicioEm: janela,
      contexto: "LOGIN_2FA",
      tentativas: 5,
    });
    const r = await db.execute(sql`
      SELECT tipo, usuario_id, ip, user_agent, contexto, payload,
             janela_inicio_em, visualizado_em, notif_destinatarios,
             notif_email_enviados, notif_email_falhas
        FROM alertas_ceo_seguranca
       WHERE usuario_id = ${alvoUsuarioId}
    `);
    assert.equal(r.rows?.length, 1);
    const row = r.rows![0] as Record<string, unknown>;
    assert.equal(row["tipo"], "2FA_BRUTE_FORCE");
    assert.equal(row["usuario_id"], alvoUsuarioId);
    assert.equal(row["ip"], "10.0.0.1");
    assert.equal(row["user_agent"], "TestUA/1.0");
    assert.equal(row["contexto"], "LOGIN_2FA");
    assert.deepEqual(row["payload"], { tentativas: 5 });
    assert.equal(row["visualizado_em"], null);
    assert.equal(
      new Date(row["janela_inicio_em"] as string).getTime(),
      janela.getTime(),
    );

    // ── Destinatarios resolvidos pela query (perfil_plataforma=platform_owner
    //    OR perfil=validador_mestre, AND ativo=true) ─────────────────────
    const destinatarios = row["notif_destinatarios"] as string[];
    assert.ok(Array.isArray(destinatarios), "notif_destinatarios eh array");
    // INCLUI: validador_mestre ativo de teste.
    assert.ok(
      destinatarios.includes(EMAIL_VALIDADOR_ATIVO),
      `destinatarios deve conter ${EMAIL_VALIDADOR_ATIVO}, recebeu: ${JSON.stringify(destinatarios)}`,
    );
    // EXCLUI: validador_mestre INATIVO (filtro `ativo=true`) — protecao
    // contra regressao da clausula WHERE.
    assert.equal(
      destinatarios.includes(EMAIL_VALIDADOR_INATIVO), false,
      "destinatario inativo NAO deve aparecer (filtro ativo=true)",
    );
    // EXCLUI: o proprio alvo do brute-force (perfil 'enfermeira') —
    // nao deveria virar destinatario do alerta sobre si mesmo.
    const emailAlvoLower = `${SUFIXO}-alvo@example.com`.toLowerCase();
    assert.equal(destinatarios.includes(emailAlvoLower), false);

    // ── Envios efetivamente disparados ────────────────────────────────
    // 1 send por destinatario, sem duplicata (Set dedupe no helper).
    assert.equal(enviosCapturados.length, destinatarios.length);
    const enviosTo = enviosCapturados.map((e) => e.to).sort();
    assert.deepEqual(enviosTo, [...destinatarios].sort());
    // Subject institucional + assinatura da Task #143 (ajuda a detectar
    // regressao em re-branding silencioso).
    assert.ok(
      enviosCapturados.every((e) => e.subject.includes("PAWARDS")),
      "subject contem assinatura PAWARDS",
    );
    // Contadores persistidos refletem a realidade dos envios.
    assert.equal(row["notif_email_enviados"], destinatarios.length);
    assert.equal(row["notif_email_falhas"], 0);
  });

  it("(2) ON CONFLICT DO NOTHING: tentativas extras na MESMA janela = 0 linhas novas E 0 emails extras", async () => {
    const janela = new Date("2026-05-13T10:00:00.000Z");
    await dispararAlertaBruteForceTotp({
      usuarioId: alvoUsuarioId, ip: "10.0.0.1", userAgent: "TestUA/1.0",
      janelaInicioEm: janela, contexto: "LOGIN_2FA", tentativas: 5,
    });
    const enviosAposPrimeiro = enviosCapturados.length;
    assert.ok(enviosAposPrimeiro >= 1, "1a chamada disparou pelo menos 1 email");

    // 3 chamadas adicionais com mesma tupla — devem ser TODAS no-op.
    for (let i = 1; i < 4; i++) {
      await dispararAlertaBruteForceTotp({
        usuarioId: alvoUsuarioId, ip: "10.0.0.1", userAgent: "TestUA/1.0",
        janelaInicioEm: janela, contexto: "LOGIN_2FA", tentativas: 5 + i,
      });
    }

    const r = await db.execute<{ n: number }>(sql`
      SELECT count(*)::int AS n FROM alertas_ceo_seguranca WHERE usuario_id = ${alvoUsuarioId}
    `);
    assert.equal(r.rows?.[0]?.n, 1, "1 unica linha persistida");
    // O payload preservado e o da PRIMEIRA chamada (UNIQUE rejeitou as demais).
    const r2 = await db.execute(sql`
      SELECT payload FROM alertas_ceo_seguranca WHERE usuario_id = ${alvoUsuarioId}
    `);
    assert.deepEqual((r2.rows?.[0] as Record<string, unknown>)["payload"], { tentativas: 5 });
    // E — o ponto critico do code-review — ZERO emails extras nas 3 chamadas
    // adicionais (ON CONFLICT garante early-return ANTES do gmail.send).
    assert.equal(
      enviosCapturados.length, enviosAposPrimeiro,
      "ON CONFLICT no-op nao pode gerar email duplicado",
    );
  });

  it("janela diferente = nova linha (UNIQUE eh por (tipo,usuario_id,janela_inicio_em))", async () => {
    await dispararAlertaBruteForceTotp({
      usuarioId: alvoUsuarioId, ip: "1.1.1.1", userAgent: "ua-a",
      janelaInicioEm: new Date("2026-05-13T10:00:00.000Z"),
      contexto: "LOGIN_2FA", tentativas: 5,
    });
    await dispararAlertaBruteForceTotp({
      usuarioId: alvoUsuarioId, ip: "2.2.2.2", userAgent: "ua-b",
      janelaInicioEm: new Date("2026-05-13T10:30:00.000Z"),
      contexto: "STEP_UP_PAINEL", tentativas: 7,
    });
    const r = await db.execute<{ n: number }>(sql`
      SELECT count(*)::int AS n FROM alertas_ceo_seguranca WHERE usuario_id = ${alvoUsuarioId}
    `);
    assert.equal(r.rows?.[0]?.n, 2);
  });

  it("nunca lanca: erro do gmail factory marca notif_email_falhas = #destinatarios", async () => {
    _setGmailClientFactoryParaTestes(async () => { throw new Error("smtp down"); });
    try {
      await assert.doesNotReject(
        dispararAlertaBruteForceTotp({
          usuarioId: alvoUsuarioId, ip: "3.3.3.3", userAgent: "ua-c",
          janelaInicioEm: new Date("2026-05-13T11:00:00.000Z"),
          contexto: "LOGIN_2FA", tentativas: 5,
        }),
      );
      const r = await db.execute<{
        n: number; enviados: number; falhas: number; destinatarios: string[];
      }>(sql`
        SELECT count(*)::int AS n,
               coalesce(notif_email_enviados, 0)::int AS enviados,
               coalesce(notif_email_falhas, 0)::int AS falhas,
               notif_destinatarios AS destinatarios
          FROM alertas_ceo_seguranca WHERE usuario_id = ${alvoUsuarioId}
         GROUP BY notif_email_enviados, notif_email_falhas, notif_destinatarios
      `);
      assert.equal(r.rows?.[0]?.n, 1, "linha persistida mesmo com factory quebrado");
      const destinatarios = r.rows?.[0]?.destinatarios ?? [];
      assert.ok(
        destinatarios.includes(EMAIL_VALIDADOR_ATIVO),
        "destinatarios resolvidos antes do factory falhar",
      );
      // Contrato: factory crashou ANTES de enviar, entao enviados=0 e
      // falhas = #destinatarios (1 falha contabilizada por destinatario).
      assert.equal(r.rows?.[0]?.enviados, 0);
      assert.equal(r.rows?.[0]?.falhas, destinatarios.length);
      assert.equal(enviosCapturados.length, 0, "nenhum send chegou ao stub");
    } finally {
      _setGmailClientFactoryParaTestes(async () => buildGmailStub());
    }
  });
});

describe("GET/POST /api/plataforma/alertas-seguranca · filtro + visualizar (Task #152)", () => {
  let server: http.Server;
  let baseUrl = "";
  let actorId = 0;

  before(async () => {
    process.env["NODE_ENV"] = process.env["NODE_ENV"] ?? "development";
    process.env["PLATFORM_BYPASS_2FA"] = "1";
    // Nota: existe UNIQUE(perfil_plataforma) pra 'platform_owner' (so 1 dono),
    // entao gravamos o actor como tenant_user no DB. O middleware-stub abaixo
    // ainda injeta perfilPlataforma='platform_owner' em req.user pra burlar
    // as guardas — auth real vive em requirePlataforma.test.ts.
    actorId = await inserirUsuario({
      nome: "Actor 163", email: `${SUFIXO}-actor@example.com`,
      perfilPlataforma: "tenant_user",
    });

    const router = (await import("../../routes/plataforma")).default;
    const app = express();
    app.use(express.json());
    // Stub de auth: coloca req.user antes das guardas (requirePlataforma +
    // requirePlatformOwnerEstrito leem req.user.perfilPlataforma).
    app.use((req, _res, next) => {
      (req as unknown as { user: Record<string, unknown> }).user = {
        sub: actorId,
        email: `${SUFIXO}-actor@example.com`,
        perfil: "validador_mestre",
        perfilPlataforma: "platform_owner",
        escopo: "consultoria_master",
        unidadeId: null,
        consultoriaId: null,
      };
      next();
    });
    app.use("/api", router);

    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address() as { port: number };
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.execute(sql`DELETE FROM alertas_ceo_seguranca WHERE usuario_id = ${alvoUsuarioId}`);
    await db.execute(sql`DELETE FROM usuarios WHERE id = ${actorId}`);
  });

  it("(3) GET devolve ip/user_agent/contexto + nome do alvo, e (4) POST visualizar marca a linha", async () => {
    await limparAlertasDoAlvo();
    await dispararAlertaBruteForceTotp({
      usuarioId: alvoUsuarioId,
      ip: "9.9.9.9",
      userAgent: "Endpoint/UA",
      janelaInicioEm: new Date("2026-05-13T11:00:00.000Z"),
      contexto: "STEP_UP_PAINEL",
      tentativas: 5,
    });

    // (3) GET com filtro apenas_nao_vistos=true
    const res1 = await fetch(`${baseUrl}/api/plataforma/alertas-seguranca?apenas_nao_vistos=true`);
    assert.equal(res1.status, 200);
    const body1 = await res1.json() as { alertas: Array<Record<string, unknown>> };
    const meu = body1.alertas.find((a) => a["usuario_id"] === alvoUsuarioId);
    assert.ok(meu, "alerta do usuario alvo deve aparecer na fila");
    assert.equal(meu!["ip"], "9.9.9.9");
    assert.equal(meu!["user_agent"], "Endpoint/UA");
    assert.equal(meu!["contexto"], "STEP_UP_PAINEL");
    assert.equal(meu!["tipo"], "2FA_BRUTE_FORCE");
    assert.equal(meu!["usuario_nome"], "Teste BF 163");
    assert.equal(meu!["visualizado_em"], null);
    assert.deepEqual(meu!["payload"], { tentativas: 5 });

    // (4) POST visualizar
    const idAlerta = meu!["id"];
    const res2 = await fetch(`${baseUrl}/api/plataforma/alertas-seguranca/${idAlerta}/visualizar`, {
      method: "POST",
    });
    assert.equal(res2.status, 200);
    assert.deepEqual(await res2.json(), { ok: true });

    // Pos-visualizacao: some do filtro apenas_nao_vistos
    const res3 = await fetch(`${baseUrl}/api/plataforma/alertas-seguranca?apenas_nao_vistos=true`);
    const body3 = await res3.json() as { alertas: Array<Record<string, unknown>> };
    assert.equal(body3.alertas.find((a) => a["id"] === idAlerta), undefined);

    // Mas continua visivel sem filtro, com visualizado_em + visualizado_por
    const res4 = await fetch(`${baseUrl}/api/plataforma/alertas-seguranca`);
    const body4 = await res4.json() as { alertas: Array<Record<string, unknown>> };
    const persistido = body4.alertas.find((a) => a["id"] === idAlerta);
    assert.ok(persistido, "alerta visualizado continua na lista sem filtro");
    assert.ok(persistido!["visualizado_em"], "visualizado_em foi preenchido");
    assert.equal(persistido!["visualizado_por_usuario_id"], actorId);
  });

  it("POST visualizar com id invalido devolve 400", async () => {
    const r = await fetch(`${baseUrl}/api/plataforma/alertas-seguranca/abc/visualizar`, { method: "POST" });
    assert.equal(r.status, 400);
  });

  it("POST visualizar eh idempotente (visualizado_em preserva o 1o timestamp)", async () => {
    await limparAlertasDoAlvo();
    await dispararAlertaBruteForceTotp({
      usuarioId: alvoUsuarioId, ip: "4.4.4.4", userAgent: "ua-idem",
      janelaInicioEm: new Date("2026-05-13T12:00:00.000Z"),
      contexto: "LOGIN_2FA", tentativas: 5,
    });
    const r0 = await db.execute<{ id: number }>(sql`
      SELECT id FROM alertas_ceo_seguranca WHERE usuario_id = ${alvoUsuarioId} LIMIT 1
    `);
    const id = r0.rows![0]!.id;
    await fetch(`${baseUrl}/api/plataforma/alertas-seguranca/${id}/visualizar`, { method: "POST" });
    const r1 = await db.execute<{ visualizado_em: string }>(sql`
      SELECT visualizado_em FROM alertas_ceo_seguranca WHERE id = ${id}
    `);
    const t1 = r1.rows![0]!.visualizado_em;
    await new Promise((r) => setTimeout(r, 20));
    await fetch(`${baseUrl}/api/plataforma/alertas-seguranca/${id}/visualizar`, { method: "POST" });
    const r2 = await db.execute<{ visualizado_em: string }>(sql`
      SELECT visualizado_em FROM alertas_ceo_seguranca WHERE id = ${id}
    `);
    assert.equal(r2.rows![0]!.visualizado_em, t1);
  });
});
