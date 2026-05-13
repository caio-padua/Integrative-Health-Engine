/**
 * Task #151 — Cobertura unitaria do worker de limpeza de bloqueios 2FA
 * expirados. Usa fake timers do node:test pra validar idempotencia real
 * (chamar `iniciarWorkerLimpezaTotpRateLimit` 2x registra APENAS 1
 * setInterval, nao 2).
 *
 * Nao depende de DB — apenas instrumenta os timers globais.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

test("iniciarWorkerLimpezaTotpRateLimit · idempotente (2 chamadas registram apenas 1 setInterval)", async (t) => {
  // Conta chamadas a setInterval globalmente. Salva original pra restaurar.
  const originalSetInterval = globalThis.setInterval;
  const originalSetTimeout = globalThis.setTimeout;
  let intervaisCriados = 0;
  let timeoutsCriados = 0;

  globalThis.setInterval = ((fn: () => void, ms: number) => {
    intervaisCriados += 1;
    // Devolve um handle compativel com .unref()
    return { unref: () => {}, ref: () => {} } as unknown as ReturnType<typeof setInterval>;
  }) as typeof setInterval;

  globalThis.setTimeout = ((fn: () => void, ms: number) => {
    timeoutsCriados += 1;
    return { unref: () => {}, ref: () => {} } as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout;

  t.after(() => {
    globalThis.setInterval = originalSetInterval;
    globalThis.setTimeout = originalSetTimeout;
  });

  // Import DEPOIS de stubar pra que o modulo nao tenha side-effects de
  // import-time usando o setInterval real.
  const mod = await import("./limpezaTotpRateLimit");

  mod.iniciarWorkerLimpezaTotpRateLimit();
  mod.iniciarWorkerLimpezaTotpRateLimit();
  mod.iniciarWorkerLimpezaTotpRateLimit();

  assert.equal(intervaisCriados, 1, "setInterval deve ser chamado exatamente 1x");
  assert.equal(timeoutsCriados, 1, "setTimeout inicial deve ser chamado exatamente 1x");
});

test("limpezaTotpRateLimit · exporta API esperada", async () => {
  const mod = await import("./limpezaTotpRateLimit");
  assert.equal(typeof mod.iniciarWorkerLimpezaTotpRateLimit, "function");
  assert.equal(typeof mod.rodarLimpezaTotpAgora, "function");
});
