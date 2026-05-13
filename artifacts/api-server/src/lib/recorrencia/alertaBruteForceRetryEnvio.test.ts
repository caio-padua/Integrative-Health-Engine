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
  visualizadoEm?: Date | null;
  destinatarios?: string[];
  criadoEm?: Date;
}): Promise<number> {
  const dest = args.destinatarios ?? [EMAIL_OWNER];
  const r = await db.execute<{ id: number }>(sql`
    INSERT INTO alertas_ceo_seguranca
      (tipo, usuario_id, janela_inicio_em, ip, user_agent, contexto,
       payload, notif_destinatarios, notif_email_enviados, notif_email_falhas,
       notif_retry_tentativas, notif_ultimo_retry_em, visualizado_em, criado_em)
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
       ${args.visualizadoEm ? args.visualizadoEm.toISOString() : null}::timestamptz,
       ${(args.criadoEm ?? new Date()).toISOString()}::timestamptz)
    RETURNING id
  `);
  const id = r.rows?.[0]?.id;
  if (!id) throw new Error("falha ao inserir alerta de teste");
  return id;
}

async function limparAlertas(): Promise<void> {
  await db.execute(sql`DELETE FROM alertas_ceo_seguranca WHERE usuario_id = ${usuarioAlvoId}`);
  enviosCapturados.length = 0;
  factorySends = () => true;
}

before(async () => {
  _setGmailClientFactoryParaTestes(async () => buildGmailStub());
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
});
