/**
 * Task #256 · Cobertura unitaria da funcao `decidirSilencioWebhook()` do
 * worker `webhookAssinaturaSilencio`. Cenarios puros (sem DB, sem rede) que
 * exercem a regra "AND" de gatilho:
 *   - dispara so quando ha pendentes na janela E
 *     (webhook nunca recebeu OU gap em horas >= horasJanela).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decidirSilencioWebhook,
  type DecidirSilencioWebhookInput,
} from "./webhookAssinaturaSilencio";

const AGORA = new Date("2026-05-14T12:00:00Z");

function fixture(over: Partial<DecidirSilencioWebhookInput> = {}): DecidirSilencioWebhookInput {
  return {
    ultimaAuditoriaEm: new Date("2026-05-14T11:00:00Z"), // 1h atras
    pendentesNoPeriodo: 5,
    agora: AGORA,
    horasJanela: 24,
    ...over,
  };
}

test("decidirSilencioWebhook · sem pendentes na janela NAO dispara, mesmo com silencio longo", () => {
  // Cenario saudavel: nao tem o que assinar, entao silencio do webhook eh
  // esperado. Disparar aqui seria falso positivo classico apos baixa demanda.
  const d = decidirSilencioWebhook(fixture({
    pendentesNoPeriodo: 0,
    ultimaAuditoriaEm: new Date("2026-04-01T10:00:00Z"), // semanas atras
  }));
  assert.equal(d.dispara, false);
  assert.equal(d.motivo, "SEM_PENDENTES_NA_JANELA");
});

test("decidirSilencioWebhook · pendentes + ultima auditoria recente NAO dispara", () => {
  // Webhook funcionando normalmente: ultima callback chegou ha 1h, ainda
  // tem pendentes em fluxo. Silencio aparente eh so cadencia natural.
  const d = decidirSilencioWebhook(fixture({
    pendentesNoPeriodo: 10,
    ultimaAuditoriaEm: new Date("2026-05-14T11:00:00Z"), // 1h atras
  }));
  assert.equal(d.dispara, false);
  assert.equal(d.motivo, "AUDITORIA_RECENTE");
  assert.equal(d.horasDesdeUltima, 1);
});

test("decidirSilencioWebhook · pendentes + gap exato na janela DISPARA", () => {
  const d = decidirSilencioWebhook(fixture({
    pendentesNoPeriodo: 3,
    ultimaAuditoriaEm: new Date("2026-05-13T12:00:00Z"), // exatamente 24h
    horasJanela: 24,
  }));
  assert.equal(d.dispara, true);
  assert.equal(d.motivo, "WEBHOOK_SILENCIOSO_COM_PENDENTES");
  assert.equal(d.horasDesdeUltima, 24);
});

test("decidirSilencioWebhook · pendentes + gap muito longo DISPARA", () => {
  const d = decidirSilencioWebhook(fixture({
    pendentesNoPeriodo: 8,
    ultimaAuditoriaEm: new Date("2026-05-10T12:00:00Z"), // 96h
    horasJanela: 24,
  }));
  assert.equal(d.dispara, true);
  assert.equal(d.motivo, "WEBHOOK_SILENCIOSO_COM_PENDENTES");
  assert.equal(d.horasDesdeUltima, 96);
});

test("decidirSilencioWebhook · ultimaAuditoria=null + pendentes DISPARA com sentinel", () => {
  // Cenario "sistema novo, ja temos pendentes mas webhook nunca recebeu nada".
  // Sintoma classico de URL configurada errada desde o dia 0.
  const d = decidirSilencioWebhook(fixture({
    pendentesNoPeriodo: 4,
    ultimaAuditoriaEm: null,
  }));
  assert.equal(d.dispara, true);
  assert.equal(d.motivo, "WEBHOOK_NUNCA_RECEBEU_COM_PENDENTES");
  assert.equal(d.horasDesdeUltima, 999_999);
});

test("decidirSilencioWebhook · ultimaAuditoria=null SEM pendentes NAO dispara (sistema novo limpo)", () => {
  // Sistema recem-instalado, sem ninguem pra assinar ainda. Disparar aqui
  // seria spam falso positivo logo no boot.
  const d = decidirSilencioWebhook(fixture({
    pendentesNoPeriodo: 0,
    ultimaAuditoriaEm: null,
  }));
  assert.equal(d.dispara, false);
  assert.equal(d.motivo, "SEM_PENDENTES_NA_JANELA");
});

test("decidirSilencioWebhook · janela custom (1h) com gap de 2h DISPARA", () => {
  const d = decidirSilencioWebhook(fixture({
    pendentesNoPeriodo: 2,
    ultimaAuditoriaEm: new Date("2026-05-14T10:00:00Z"), // 2h atras
    horasJanela: 1,
  }));
  assert.equal(d.dispara, true);
  assert.equal(d.horasDesdeUltima, 2);
});

test("decidirSilencioWebhook · janela 6h com gap de 5h NAO dispara (just abaixo)", () => {
  const d = decidirSilencioWebhook(fixture({
    pendentesNoPeriodo: 5,
    ultimaAuditoriaEm: new Date("2026-05-14T07:00:00Z"), // 5h atras
    horasJanela: 6,
  }));
  assert.equal(d.dispara, false);
  assert.equal(d.motivo, "AUDITORIA_RECENTE");
  assert.equal(d.horasDesdeUltima, 5);
});
