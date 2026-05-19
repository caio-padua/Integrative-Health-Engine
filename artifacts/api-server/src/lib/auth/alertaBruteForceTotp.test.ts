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
  _setEnviarWhatsappParaTestes,
  _resetEnviarWhatsappParaTestes,
  _setResolverDestinatariosParaTestes,
  _resetResolverDestinatariosParaTestes,
  type OwnerDestinatarioRow,
} from "./alertaBruteForceTotp";
import type { EnvioResult } from "../../services/whatsappService";

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

describe("dispararAlertaBruteForceTotp · canal WhatsApp defensivo (Task #166)", () => {
  // Por que validador dedicado: garante que so este destinatario tem
  // telefone cadastrado (evita acoplar com o `validadorAtivoId` da suite
  // pai e mantem a contagem `notif_wpp_*` deterministica). O telefone
  // puro digito viabiliza o filtro `length >= 10` do helper.
  let validadorComTelefoneId = 0;
  const TELEFONE_VALIDADOR = "5511987654321";
  const wppCalls: Array<{ telefone: string; mensagem: string }> = [];

  before(async () => {
    // Wave 13 F2 — limpar debris de runs anteriores que nao foram deletados
    // pelo after (ex: falha de teste que interrompeu o cleanup). Sem isso,
    // o teste (c) encontra usuarios fantasma com o mesmo telefone e falha.
    await db.execute(sql`
      DELETE FROM alertas_ceo_seguranca
       WHERE usuario_id IN (
         SELECT id FROM usuarios
          WHERE perfil = 'validador_mestre'
            AND nome = 'Validador Mestre Com Telefone'
       )
    `);
    await db.execute(sql`
      DELETE FROM usuarios
       WHERE perfil = 'validador_mestre'
         AND nome = 'Validador Mestre Com Telefone'
    `);

    validadorComTelefoneId = await inserirUsuario({
      nome: "Validador Mestre Com Telefone",
      email: `${SUFIXO}-vmestre-tel@example.com`,
      perfil: "validador_mestre",
      ativo: true,
    });
    await db.execute(sql`
      UPDATE usuarios SET telefone = ${TELEFONE_VALIDADOR}
       WHERE id = ${validadorComTelefoneId}
    `);

    // Task #166 follow-up (2026-05-18) — isola o resolvedor de destinatarios
    // pra so enxergar os 2 usuarios criados por esta suite (validadorAtivoId
    // do `before` global + validadorComTelefoneId desta suite). Sem isso, o
    // DB compartilhado com producao traz o Caio (id=1, validador_mestre +
    // platform_owner ATIVO + telefone real `5511977154000` da Wave V46) e
    // contamina:
    //   (a-strict) `wppCalls.length === 1` vira 2;
    //   (c-fallback) o telefone do Caio "vence" o CEO_WHATSAPP no resultado.
    // O fake ainda CONSULTA o DB (respeita UPDATE telefone=NULL do teste c),
    // so restringe o universo. O resolvedor real e restaurado no `after`.
    _setResolverDestinatariosParaTestes(async (): Promise<OwnerDestinatarioRow[]> => {
      const r = await db.execute<OwnerDestinatarioRow>(sql`
        SELECT email, telefone FROM usuarios
        WHERE ativo = true
          AND id IN (${validadorAtivoId}, ${validadorComTelefoneId})
      `);
      return r.rows ?? [];
    });
  });

  after(async () => {
    await db.execute(sql`DELETE FROM alertas_ceo_seguranca WHERE usuario_id = ${alvoUsuarioId}`);
    await db.execute(sql`DELETE FROM usuarios WHERE id = ${validadorComTelefoneId}`);
    _resetEnviarWhatsappParaTestes();
    _resetResolverDestinatariosParaTestes();
  });

  beforeEach(async () => {
    await limparAlertasDoAlvo();
    wppCalls.length = 0;
  });

  it("(a) provedor WhatsApp lancando excecao NAO derruba o fluxo nem o canal email", async () => {
    // Arrange: wpp explode em toda chamada. Email continua usando o stub
    // padrao instalado no `before` global (gmailStub ok).
    _setEnviarWhatsappParaTestes(async () => {
      throw new Error("twilio crashed");
    });

    // Act: nunca deve rejeitar (helper e defensivo total).
    await assert.doesNotReject(
      dispararAlertaBruteForceTotp({
        usuarioId: alvoUsuarioId,
        ip: "5.5.5.5",
        userAgent: "ua-wpp-throw",
        janelaInicioEm: new Date("2026-05-13T13:00:00.000Z"),
        contexto: "LOGIN_2FA",
        tentativas: 5,
      }),
    );

    // Assert: linha persistida; wpp falhas contabilizadas; email NAO afetado.
    const r = await db.execute<{
      n: number;
      wpp_enviados: number;
      wpp_falhas: number;
      email_enviados: number;
      email_falhas: number;
    }>(sql`
      SELECT count(*)::int AS n,
             coalesce(notif_wpp_enviados, 0)::int   AS wpp_enviados,
             coalesce(notif_wpp_falhas, 0)::int     AS wpp_falhas,
             coalesce(notif_email_enviados, 0)::int AS email_enviados,
             coalesce(notif_email_falhas, 0)::int   AS email_falhas
        FROM alertas_ceo_seguranca
       WHERE usuario_id = ${alvoUsuarioId}
       GROUP BY notif_wpp_enviados, notif_wpp_falhas,
                notif_email_enviados, notif_email_falhas
    `);
    const row = r.rows![0]!;
    assert.equal(row.n, 1, "alerta persistido mesmo com wpp explodindo");
    assert.equal(row.wpp_enviados, 0, "nada enviado por wpp");
    assert.ok(row.wpp_falhas >= 1, "falha wpp contabilizada (>=1)");
    // Critico: email continuou funcionando — e o ponto inteiro da Task.
    assert.ok(row.email_enviados >= 1, "canal email nao foi afetado");
    assert.equal(row.email_falhas, 0, "email sem falhas");
    assert.ok(
      enviosCapturados.length >= 1,
      "stub do gmail recebeu pelo menos 1 send",
    );
  });

  it("(b) provedor retornando sucesso=false incrementa notif_wpp_falhas SEM afetar email", async () => {
    _setEnviarWhatsappParaTestes(async (telefone, mensagem): Promise<EnvioResult> => {
      wppCalls.push({ telefone, mensagem });
      return { sucesso: false, erro: "rate-limited pelo provedor" };
    });

    await dispararAlertaBruteForceTotp({
      usuarioId: alvoUsuarioId,
      ip: "6.6.6.6",
      userAgent: "ua-wpp-falhou",
      janelaInicioEm: new Date("2026-05-13T13:30:00.000Z"),
      contexto: "LOGIN_2FA",
      tentativas: 5,
    });

    // wpp foi chamado uma vez por destinatario com telefone.
    assert.ok(wppCalls.length >= 1, "wpp foi chamado pelo menos 1x");
    const r = await db.execute<{
      wpp_enviados: number;
      wpp_falhas: number;
      email_enviados: number;
      email_falhas: number;
    }>(sql`
      SELECT coalesce(notif_wpp_enviados, 0)::int   AS wpp_enviados,
             coalesce(notif_wpp_falhas, 0)::int     AS wpp_falhas,
             coalesce(notif_email_enviados, 0)::int AS email_enviados,
             coalesce(notif_email_falhas, 0)::int   AS email_falhas
        FROM alertas_ceo_seguranca
       WHERE usuario_id = ${alvoUsuarioId}
    `);
    const row = r.rows![0]!;
    assert.equal(row.wpp_enviados, 0, "sucesso=false nao conta como enviado");
    assert.equal(
      row.wpp_falhas, wppCalls.length,
      "1 falha wpp por chamada (provedor retornou sucesso=false)",
    );
    // Email permanece intacto: o canal independente continua entregando.
    assert.ok(row.email_enviados >= 1, "email continuou enviando");
    assert.equal(row.email_falhas, 0, "email sem falhas");
  });

  it("(a-strict) 1 unico WhatsApp por destinatario com telefone cadastrado (telefone normalizado)", async () => {
    // Arrange: provedor sucesso. So `validadorComTelefoneId` tem telefone
    // entre todos os elegiveis (perfil_plataforma=platform_owner OR
    // perfil=validador_mestre AND ativo=true). Logo: exatamente 1 envio.
    _setEnviarWhatsappParaTestes(async (telefone, mensagem): Promise<EnvioResult> => {
      wppCalls.push({ telefone, mensagem });
      return { sucesso: true, provedorMsgId: "stub-strict" };
    });

    await dispararAlertaBruteForceTotp({
      usuarioId: alvoUsuarioId,
      ip: "8.8.8.8",
      userAgent: "ua-wpp-strict",
      janelaInicioEm: new Date("2026-05-13T12:00:00.000Z"),
      contexto: "LOGIN_2FA",
      tentativas: 5,
    });

    // (a) Exatamente 1 envio — protege contra regressao na resolucao de
    //     telefones (ex: alguem largar o filtro `length >= 10` ou o Set dedupe).
    assert.equal(wppCalls.length, 1, "1 unico wpp pro unico validador com telefone");
    // E o telefone passado bate com o cadastrado, normalizado pra digitos.
    assert.equal(wppCalls[0]!.telefone, TELEFONE_VALIDADOR);
    // Mensagem leva assinatura institucional pra detectar regressao de copy.
    assert.ok(
      wppCalls[0]!.mensagem.includes("PAWARDS"),
      "mensagem wpp contem assinatura PAWARDS",
    );
    assert.ok(
      wppCalls[0]!.mensagem.includes(`#${alvoUsuarioId}`),
      "mensagem wpp identifica o usuario alvo",
    );

    // (d) Contadores no DB batem com a realidade.
    const r = await db.execute<{
      wpp_enviados: number; wpp_falhas: number;
    }>(sql`
      SELECT coalesce(notif_wpp_enviados, 0)::int AS wpp_enviados,
             coalesce(notif_wpp_falhas, 0)::int   AS wpp_falhas
        FROM alertas_ceo_seguranca
       WHERE usuario_id = ${alvoUsuarioId}
    `);
    assert.equal(r.rows![0]!.wpp_enviados, 1);
    assert.equal(r.rows![0]!.wpp_falhas, 0);
  });

  it("(c) fallback CEO_WHATSAPP entra quando NENHUM owner tem telefone cadastrado", async () => {
    // Arrange: zera o telefone do unico validador com telefone, e seta o
    // env CEO_WHATSAPP. O helper le o env lazy (lerCeoWhatsappEnv) entao
    // a mudanca em runtime e suficiente — sem reimportar o modulo.
    const ENV_PREVIO = process.env["CEO_WHATSAPP"];
    const FALLBACK_NUMERO_BRUTO = "+55 (11) 9 9999-1111"; // formato humano
    const FALLBACK_NORMALIZADO = "5511999991111";         // so digitos
    process.env["CEO_WHATSAPP"] = FALLBACK_NUMERO_BRUTO;
    await db.execute(sql`
      UPDATE usuarios SET telefone = NULL WHERE id = ${validadorComTelefoneId}
    `);

    _setEnviarWhatsappParaTestes(async (telefone, mensagem): Promise<EnvioResult> => {
      wppCalls.push({ telefone, mensagem });
      return { sucesso: true, provedorMsgId: "stub-fallback" };
    });

    try {
      await dispararAlertaBruteForceTotp({
        usuarioId: alvoUsuarioId,
        ip: "4.4.4.4",
        userAgent: "ua-wpp-fallback",
        janelaInicioEm: new Date("2026-05-13T12:30:00.000Z"),
        contexto: "LOGIN_2FA",
        tentativas: 5,
      });

      // Exatamente 1 envio — pro CEO_WHATSAPP normalizado (so digitos).
      // Protege contra regressao do `replace(/\D/g, "")` e do guarda
      // `length >= 10`.
      assert.equal(wppCalls.length, 1, "1 envio pro fallback CEO_WHATSAPP");
      assert.equal(wppCalls[0]!.telefone, FALLBACK_NORMALIZADO);

      const r = await db.execute<{
        wpp_enviados: number; email_enviados: number;
      }>(sql`
        SELECT coalesce(notif_wpp_enviados, 0)::int   AS wpp_enviados,
               coalesce(notif_email_enviados, 0)::int AS email_enviados
          FROM alertas_ceo_seguranca
         WHERE usuario_id = ${alvoUsuarioId}
      `);
      assert.equal(r.rows![0]!.wpp_enviados, 1, "contador refletindo o envio fallback");
      // Email continua via destinatarios resolvidos pelo email (nao depende
      // de telefone) — protege contra coupling indevido entre os canais.
      assert.ok(r.rows![0]!.email_enviados >= 1, "canal email indep do telefone");
    } finally {
      // Restaura estado (proximos testes assumem telefone cadastrado).
      await db.execute(sql`
        UPDATE usuarios SET telefone = ${TELEFONE_VALIDADOR}
         WHERE id = ${validadorComTelefoneId}
      `);
      if (ENV_PREVIO === undefined) delete process.env["CEO_WHATSAPP"];
      else process.env["CEO_WHATSAPP"] = ENV_PREVIO;
    }
  });

  it("(c) idempotencia: 2 chamadas na MESMA janela = 1 unico envio WhatsApp", async () => {
    _setEnviarWhatsappParaTestes(async (telefone, mensagem): Promise<EnvioResult> => {
      wppCalls.push({ telefone, mensagem });
      return { sucesso: true, provedorMsgId: "stub-msg-id" };
    });

    const janela = new Date("2026-05-13T14:00:00.000Z");
    const args = {
      usuarioId: alvoUsuarioId,
      ip: "7.7.7.7",
      userAgent: "ua-idem-wpp",
      janelaInicioEm: janela,
      contexto: "LOGIN_2FA" as const,
      tentativas: 5,
    };

    await dispararAlertaBruteForceTotp(args);
    const enviosAposPrimeiro = wppCalls.length;
    assert.ok(enviosAposPrimeiro >= 1, "1a chamada disparou pelo menos 1 wpp");

    // 2a chamada com MESMA janela: ON CONFLICT DO NOTHING → no-op total
    // (early-return ANTES de chamar enviarWhatsapp).
    await dispararAlertaBruteForceTotp({ ...args, tentativas: 9 });
    assert.equal(
      wppCalls.length, enviosAposPrimeiro,
      "ON CONFLICT no-op nao pode disparar wpp duplicado",
    );

    // E persistiu apenas 1 linha — UNIQUE garantiu.
    const r = await db.execute<{ n: number; wpp_enviados: number }>(sql`
      SELECT count(*)::int AS n,
             coalesce(notif_wpp_enviados, 0)::int AS wpp_enviados
        FROM alertas_ceo_seguranca
       WHERE usuario_id = ${alvoUsuarioId}
       GROUP BY notif_wpp_enviados
    `);
    assert.equal(r.rows![0]!.n, 1);
    assert.equal(
      r.rows![0]!.wpp_enviados, enviosAposPrimeiro,
      "contadores preservam o estado da 1a chamada",
    );
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
