/**
 * Task #167 — Cobertura de regressao do worker `alertaBruteForceRetryEnvio`.
 *
 * Cenarios cobertos:
 *   (1) Alerta com `notif_email_falhas > 0 AND visualizado_em IS NULL` e
 *       re-tentado e, se todos os emails passarem, `notif_email_falhas`
 *       vira 0 e `notif_email_enviados` acumula os sucessos.
 *   (2) Backoff: alerta ja re-tentado dentro de RETRY_BACKOFF_MIN minutos
 *       NAO e re-tentado de novo no mesmo tick.
 *   (3) Cap: alerta com `notif_retry_tentativas >= RETRY_TENTATIVAS_MAX`
 *       fica fora do filtro (nao retenta em loop).
 *   (4) Alertas ja visualizados (visualizado_em != NULL) nao sao re-tentados.
 *   (5) Falha persistente: gmail.send sempre lanca → contador de tentativas
 *       incrementa + timestamp grava (defesa contra loop) e linha continua
 *       elegivel ate atingir o cap.
 *
 * Estrategia: usa o DB real (singleton @workspace/db) com cleanup explicito
 * por teste. Cliente Gmail injetado via `_setGmailClientFactoryParaTestes`
 * pra nao tocar a rede. Defaults RETRY_TENTATIVAS_MAX=3 e
 * RETRY_BACKOFF_MIN=30 sao validados via os contornos descritos no helper.
 */
import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  rodarRetryAlertaBruteForceAgora,
  _setGmailClientFactoryParaTestes,
  _resetGmailClientFactoryParaTestes,
  _setEnviarWhatsappParaTestes,
  _resetEnviarWhatsappParaTestes,
} from "./alertaBruteForceRetryEnvio";

interface SendCapture { to: string; subject: string }
const enviosCapturados: SendCapture[] = [];
let factorySends: () => boolean = () => true; // true = sucesso, false = lanca

function buildGmailStub() {
  return {
    users: {
      messages: {
        send: async ({ requestBody }: { requestBody: { raw: string } }) => {
          if (!factorySends()) {
            throw new Error("smtp down stub");
          }
          const raw = Buffer.from(requestBody.raw, "base64url").toString("utf8");
          const toLine = raw.split(/\r?\n/).find((l) => l.toLowerCase().startsWith("to:")) ?? "";
          const subjLine = raw.split(/\r?\n/).find((l) => l.toLowerCase().startsWith("subject:")) ?? "";
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

const SUFIXO = `task167-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const EMAIL_OWNER = `${SUFIXO}-owner@example.com`;
let usuarioAlvoId = 0;

async function inserirAlerta(args: {
  janelaInicioEm: Date;
  notifEmailFalhas: number;
  notifEmailEnviados?: number;
  notifRetryTentativas?: number;
  notifUltimoRetryEm?: Date | null;
  notifWppEnviados?: number;
  escalonadoWhatsappEm?: Date | null;
  visualizadoEm?: Date | null;
  destinatarios?: string[];
  criadoEm?: Date;
}): Promise<number> {
  const dest = args.destinatarios ?? [EMAIL_OWNER];
  const r = await db.execute<{ id: number }>(sql`
    INSERT INTO alertas_ceo_seguranca
      (tipo, usuario_id, janela_inicio_em, ip, user_agent, contexto,
       payload, notif_destinatarios, notif_email_enviados, notif_email_falhas,
       notif_retry_tentativas, notif_ultimo_retry_em, notif_wpp_enviados,
       escalonado_whatsapp_em, visualizado_em, criado_em)
    VALUES
      ('2FA_BRUTE_FORCE', ${usuarioAlvoId},
       ${args.janelaInicioEm.toISOString()}::timestamptz,
       '10.0.0.1', 'TestUA/1.0', 'LOGIN_2FA',
       ${JSON.stringify({ tentativas: 5 })}::jsonb,
       ${JSON.stringify(dest)}::jsonb,
       ${args.notifEmailEnviados ?? 0},
       ${args.notifEmailFalhas},
       ${args.notifRetryTentativas ?? 0},
       ${args.notifUltimoRetryEm ? args.notifUltimoRetryEm.toISOString() : null}::timestamptz,
       ${args.notifWppEnviados ?? 0},
       ${args.escalonadoWhatsappEm ? args.escalonadoWhatsappEm.toISOString() : null}::timestamptz,
       ${args.visualizadoEm ? args.visualizadoEm.toISOString() : null}::timestamptz,
       ${(args.criadoEm ?? new Date()).toISOString()}::timestamptz)
    RETURNING id
  `);
  const id = r.rows?.[0]?.id;
  if (!id) throw new Error("falha ao inserir alerta de teste");
  return id;
}

// Task #194 — captura dos envios WhatsApp do escalonamento.
interface WppCapture { telefone: string; mensagem: string }
const wppCapturados: WppCapture[] = [];
let wppRetorno: { sucesso: boolean; erro?: string } = { sucesso: true };

async function limparAlertas(): Promise<void> {
  await db.execute(sql`DELETE FROM alertas_ceo_seguranca WHERE usuario_id = ${usuarioAlvoId}`);
  enviosCapturados.length = 0;
  wppCapturados.length = 0;
  wppRetorno = { sucesso: true };
  factorySends = () => true;
}

before(async () => {
  _setGmailClientFactoryParaTestes(async () => buildGmailStub());
  _setEnviarWhatsappParaTestes(async (telefone: string, mensagem: string) => {
    wppCapturados.push({ telefone, mensagem });
    return { sucesso: wppRetorno.sucesso, erro: wppRetorno.erro };
  });
  const r = await db.execute<{ id: number }>(sql`
    INSERT INTO usuarios (nome, email, senha, perfil, escopo, ativo, perfil_plataforma)
    VALUES (${`Alvo BF Retry ${SUFIXO}`}, ${`${SUFIXO}-alvo@example.com`}, 'x',
            'enfermeira', 'clinica_enfermeira', true, 'tenant_user')
    RETURNING id
  `);
  usuarioAlvoId = r.rows![0]!.id;
});

after(async () => {
  await limparAlertas();
  await db.execute(sql`DELETE FROM usuarios WHERE id = ${usuarioAlvoId}`);
  _resetGmailClientFactoryParaTestes();
  _resetEnviarWhatsappParaTestes();
});

describe("alertaBruteForceRetryEnvio · worker (Task #167)", () => {
  beforeEach(limparAlertas);

  it("(1) re-tenta alerta com falha + nao visualizado: zera falhas + acumula enviados", async () => {
    const idA = await inserirAlerta({
      janelaInicioEm: new Date("2026-05-13T10:00:00.000Z"),
      notifEmailFalhas: 1,
      notifEmailEnviados: 0,
      destinatarios: [EMAIL_OWNER],
    });

    const out = await rodarRetryAlertaBruteForceAgora();
    assert.equal(out.candidatos_analisados, 1);
    assert.equal(out.retries_executados, 1);
    assert.equal(out.envios_ok, 1);
    assert.equal(out.envios_falha, 0);

    const r = await db.execute<{
      enviados: number; falhas: number; tentativas: number; ultimo: string | null;
    }>(sql`
      SELECT notif_email_enviados AS enviados,
             notif_email_falhas   AS falhas,
             notif_retry_tentativas AS tentativas,
             notif_ultimo_retry_em  AS ultimo
        FROM alertas_ceo_seguranca WHERE id = ${idA}
    `);
    const row = r.rows![0]!;
    assert.equal(row.enviados, 1, "sucesso acumulado em notif_email_enviados");
    assert.equal(row.falhas, 0, "falhas zeradas pos-retry bem sucedido");
    assert.equal(row.tentativas, 1, "contador de retries incrementado");
    assert.ok(row.ultimo, "notif_ultimo_retry_em preenchido");
    assert.equal(enviosCapturados.length, 1, "1 envio efetivo");
    assert.ok(
      enviosCapturados[0]!.subject.includes("re-envio #1"),
      "subject sinaliza re-envio + numero da tentativa",
    );
  });

  it("(2) backoff: alerta re-tentado ha 5min nao reentra (RETRY_BACKOFF_MIN=30)", async () => {
    const cincoMinAtras = new Date(Date.now() - 5 * 60 * 1000);
    await inserirAlerta({
      janelaInicioEm: new Date("2026-05-13T10:30:00.000Z"),
      notifEmailFalhas: 1,
      notifRetryTentativas: 1,
      notifUltimoRetryEm: cincoMinAtras,
    });

    const out = await rodarRetryAlertaBruteForceAgora();
    assert.equal(out.candidatos_analisados, 0, "backoff bloqueia reentry");
    assert.equal(enviosCapturados.length, 0);
  });

  it("(2b) backoff: alerta re-tentado ha 45min REENTRA (passou os 30min)", async () => {
    const id = await inserirAlerta({
      janelaInicioEm: new Date("2026-05-13T10:30:00.000Z"),
      notifEmailFalhas: 1,
      notifRetryTentativas: 1,
      notifUltimoRetryEm: new Date(Date.now() - 45 * 60 * 1000),
    });
    const out = await rodarRetryAlertaBruteForceAgora();
    assert.equal(out.candidatos_analisados, 1);
    const r = await db.execute<{ tentativas: number }>(sql`
      SELECT notif_retry_tentativas AS tentativas FROM alertas_ceo_seguranca WHERE id = ${id}
    `);
    assert.equal(r.rows![0]!.tentativas, 2);
  });

  it("(3) cap: alerta com tentativas >= RETRY_TENTATIVAS_MAX (3) nao reentra", async () => {
    await inserirAlerta({
      janelaInicioEm: new Date("2026-05-13T11:00:00.000Z"),
      notifEmailFalhas: 1,
      notifRetryTentativas: 3,
      notifUltimoRetryEm: new Date(Date.now() - 60 * 60 * 1000),
    });
    const out = await rodarRetryAlertaBruteForceAgora();
    assert.equal(out.candidatos_analisados, 0, "cap bloqueia reentry mesmo com backoff vencido");
    assert.equal(enviosCapturados.length, 0);
  });

  it("(4) alerta ja visualizado nao e re-tentado", async () => {
    await inserirAlerta({
      janelaInicioEm: new Date("2026-05-13T12:00:00.000Z"),
      notifEmailFalhas: 1,
      visualizadoEm: new Date(),
    });
    const out = await rodarRetryAlertaBruteForceAgora();
    assert.equal(out.candidatos_analisados, 0);
    assert.equal(enviosCapturados.length, 0);
  });

  it("(5) falha persistente: incrementa tentativas mas mantem falhas > 0", async () => {
    factorySends = () => false; // gmail.send sempre lanca
    const id = await inserirAlerta({
      janelaInicioEm: new Date("2026-05-13T13:00:00.000Z"),
      notifEmailFalhas: 1,
      destinatarios: [EMAIL_OWNER],
    });
    const out = await rodarRetryAlertaBruteForceAgora();
    assert.equal(out.candidatos_analisados, 1);
    assert.equal(out.envios_ok, 0);
    assert.equal(out.envios_falha, 1);

    const r = await db.execute<{
      enviados: number; falhas: number; tentativas: number;
    }>(sql`
      SELECT notif_email_enviados AS enviados,
             notif_email_falhas   AS falhas,
             notif_retry_tentativas AS tentativas
        FROM alertas_ceo_seguranca WHERE id = ${id}
    `);
    const row = r.rows![0]!;
    assert.equal(row.enviados, 0);
    assert.equal(row.falhas, 1, "falha continua > 0 → linha permanece elegivel");
    assert.equal(row.tentativas, 1, "tentativas incrementou");
  });

  // ==========================================================================
  // Task #194 — Escalonamento WhatsApp quando o cap estoura sem sucesso.
  // ==========================================================================
  describe("Task #194 — escalonamento WhatsApp pro CEO ao estourar o cap", () => {
    let originalCeoWpp: string | undefined;
    before(() => {
      originalCeoWpp = process.env["CEO_WHATSAPP"];
      process.env["CEO_WHATSAPP"] = "+5511999990000";
    });
    after(() => {
      if (originalCeoWpp === undefined) delete process.env["CEO_WHATSAPP"];
      else process.env["CEO_WHATSAPP"] = originalCeoWpp;
    });

    it("(194-a) cap atingido + email continua falhando + wpp original=0 → escala via WhatsApp e marca timestamp", async () => {
      factorySends = () => false; // gmail.send sempre lanca
      // Ja em tentativa 2; este tick vira a 3a (cap=3).
      const id = await inserirAlerta({
        janelaInicioEm: new Date("2026-05-13T14:00:00.000Z"),
        notifEmailFalhas: 1,
        notifRetryTentativas: 2,
        notifUltimoRetryEm: new Date(Date.now() - 60 * 60 * 1000),
        notifWppEnviados: 0,
        destinatarios: [EMAIL_OWNER],
      });

      await rodarRetryAlertaBruteForceAgora();

      const r = await db.execute<{ tentativas: number; escalonado: string | null }>(sql`
        SELECT notif_retry_tentativas AS tentativas,
               escalonado_whatsapp_em AS escalonado
          FROM alertas_ceo_seguranca WHERE id = ${id}
      `);
      assert.equal(r.rows![0]!.tentativas, 3, "tentativas atingiu o cap");
      assert.ok(r.rows![0]!.escalonado, "escalonado_whatsapp_em foi marcado");
      assert.equal(wppCapturados.length, 1, "1 envio WhatsApp pro CEO");
      assert.ok(
        wppCapturados[0]!.mensagem.includes(`#${id}`),
        "mensagem inclui o id do alerta",
      );
      assert.ok(
        wppCapturados[0]!.mensagem.includes("forcar-logout"),
        "mensagem inclui link pra acao corretiva",
      );
    });

    it("(194-b) idempotencia: ja escalonado nao escala de novo mesmo se a logica for revisitada", async () => {
      factorySends = () => false;
      const id = await inserirAlerta({
        janelaInicioEm: new Date("2026-05-13T15:00:00.000Z"),
        notifEmailFalhas: 1,
        notifRetryTentativas: 2,
        notifUltimoRetryEm: new Date(Date.now() - 60 * 60 * 1000),
        notifWppEnviados: 0,
        escalonadoWhatsappEm: new Date("2026-05-13T13:00:00.000Z"),
        destinatarios: [EMAIL_OWNER],
      });

      await rodarRetryAlertaBruteForceAgora();
      assert.equal(wppCapturados.length, 0, "nao escala de novo");

      const r = await db.execute<{ escalonado: string }>(sql`
        SELECT escalonado_whatsapp_em AS escalonado
          FROM alertas_ceo_seguranca WHERE id = ${id}
      `);
      assert.ok(r.rows![0]!.escalonado, "timestamp original preservado");
    });

    it("(194-c) WhatsApp original ja saiu (notif_wpp_enviados>0) → NAO escala", async () => {
      factorySends = () => false;
      await inserirAlerta({
        janelaInicioEm: new Date("2026-05-13T16:00:00.000Z"),
        notifEmailFalhas: 1,
        notifRetryTentativas: 2,
        notifUltimoRetryEm: new Date(Date.now() - 60 * 60 * 1000),
        notifWppEnviados: 1, // canal wpp original ja entregou
        destinatarios: [EMAIL_OWNER],
      });

      await rodarRetryAlertaBruteForceAgora();
      assert.equal(wppCapturados.length, 0, "wpp original ja entregou; nao escala");
    });

    it("(194-d) cap NAO atingido (vira 2/3) → NAO escala", async () => {
      factorySends = () => false;
      await inserirAlerta({
        janelaInicioEm: new Date("2026-05-13T17:00:00.000Z"),
        notifEmailFalhas: 1,
        notifRetryTentativas: 1, // este tick vira 2 (< cap=3)
        notifUltimoRetryEm: new Date(Date.now() - 60 * 60 * 1000),
        notifWppEnviados: 0,
        destinatarios: [EMAIL_OWNER],
      });

      await rodarRetryAlertaBruteForceAgora();
      assert.equal(wppCapturados.length, 0, "ainda ha tentativa de email; nao escala");
    });

    it("(194-f) factory Gmail caido + cap atingido → escala via WhatsApp mesmo sem email enviado", async () => {
      const id = await inserirAlerta({
        janelaInicioEm: new Date("2026-05-13T19:00:00.000Z"),
        notifEmailFalhas: 1,
        notifRetryTentativas: 2,
        notifUltimoRetryEm: new Date(Date.now() - 60 * 60 * 1000),
        notifWppEnviados: 0,
        destinatarios: [EMAIL_OWNER],
      });

      _setGmailClientFactoryParaTestes(async () => {
        throw new Error("gmail factory down stub");
      });
      try {
        await rodarRetryAlertaBruteForceAgora();
      } finally {
        _setGmailClientFactoryParaTestes(async () => buildGmailStub());
      }

      assert.equal(wppCapturados.length, 1, "escala mesmo sem o tick conseguir abrir Gmail");
      const r = await db.execute<{ tentativas: number; escalonado: string | null }>(sql`
        SELECT notif_retry_tentativas AS tentativas,
               escalonado_whatsapp_em AS escalonado
          FROM alertas_ceo_seguranca WHERE id = ${id}
      `);
      assert.equal(r.rows![0]!.tentativas, 3);
      assert.ok(r.rows![0]!.escalonado, "escalonado_whatsapp_em marcado");
    });

    it("(194-g) idempotencia forte: 2 chamadas paralelas gravam timestamp 1x e enviam 1x", async () => {
      factorySends = () => false;
      await inserirAlerta({
        janelaInicioEm: new Date("2026-05-13T20:00:00.000Z"),
        notifEmailFalhas: 1,
        notifRetryTentativas: 2,
        notifUltimoRetryEm: new Date(Date.now() - 60 * 60 * 1000),
        notifWppEnviados: 0,
        destinatarios: [EMAIL_OWNER],
      });

      // Disparos paralelos simulam o cenario "endpoint manual + worker
      // periodico tickando ao mesmo tempo". A claim atomica via UPDATE ...
      // WHERE escalonado_whatsapp_em IS NULL garante que so UMA das
      // execucoes envia WhatsApp pro CEO.
      await Promise.all([
        rodarRetryAlertaBruteForceAgora(),
        rodarRetryAlertaBruteForceAgora(),
      ]);

      assert.equal(wppCapturados.length, 1, "claim atomica garante 1 envio so");
    });

    it("(194-e) cap atingido mas email passou nesta tentativa (falha=0) → NAO escala", async () => {
      factorySends = () => true; // emails passam
      const id = await inserirAlerta({
        janelaInicioEm: new Date("2026-05-13T18:00:00.000Z"),
        notifEmailFalhas: 1,
        notifRetryTentativas: 2,
        notifUltimoRetryEm: new Date(Date.now() - 60 * 60 * 1000),
        notifWppEnviados: 0,
        destinatarios: [EMAIL_OWNER],
      });

      await rodarRetryAlertaBruteForceAgora();
      assert.equal(wppCapturados.length, 0, "email entregou; nao precisa escalar");
      const r = await db.execute<{ escalonado: string | null }>(sql`
        SELECT escalonado_whatsapp_em AS escalonado
          FROM alertas_ceo_seguranca WHERE id = ${id}
      `);
      assert.equal(r.rows![0]!.escalonado, null, "escalonado_whatsapp_em fica NULL");
    });
  });
});
