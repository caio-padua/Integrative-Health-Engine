/**
 * Task #272 — Cobertura unitaria do worker de alerta diario de anomalia
 * de bloqueios 2FA. Sem DB: testa a heuristica pura compartilhada com a
 * Task #160, idempotencia do `iniciarWorker...` (so 1 setInterval), e
 * helpers internos puros (calculo de dia anterior BRT, grafico ASCII).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { classificarAnomaliaTotp } from "../seguranca/anomaliaTotp";

test("classificarAnomaliaTotp · ANOMALIA quando hoje >=10 e razao >=3", () => {
  const historico = Array.from({ length: 10 }, (_, i) => ({
    dia: `2026-05-0${i + 1}`,
    totalRemovidas: 2,
  }));
  const r = classificarAnomaliaTotp(15, historico);
  assert.equal(r.flag, "ANOMALIA");
  assert.equal(r.hojeTotal, 15);
  assert.ok(r.razaoVsMedia >= 3);
});

test("classificarAnomaliaTotp · ATENCAO quando hoje >=5 e razao >=2", () => {
  const historico = Array.from({ length: 10 }, (_, i) => ({
    dia: `2026-05-0${i + 1}`,
    totalRemovidas: 2,
  }));
  const r = classificarAnomaliaTotp(6, historico);
  assert.equal(r.flag, "ATENCAO");
});

test("classificarAnomaliaTotp · NORMAL quando volume baixo (evita falso-positivo)", () => {
  // hoje=4 nao atinge o piso de 5 da regra ATENCAO, mesmo com razao alta.
  const historico = Array.from({ length: 10 }, (_, i) => ({
    dia: `2026-05-0${i + 1}`,
    totalRemovidas: 0,
  }));
  const r = classificarAnomaliaTotp(4, historico);
  assert.equal(r.flag, "NORMAL");
});

test("classificarAnomaliaTotp · NORMAL quando historico vazio (sem media pra comparar)", () => {
  const r = classificarAnomaliaTotp(50, []);
  // hoje >= 10 mas razao=0 e zScore=0 (sem historico) — nao dispara.
  assert.equal(r.flag, "NORMAL");
});

test("iniciarWorkerAlertaAnomaliaTotp2faDiario · idempotente (so 1 setInterval)", async (t) => {
  const originalSetInterval = globalThis.setInterval;
  const originalSetTimeout = globalThis.setTimeout;
  let intervais = 0;
  let timeouts = 0;
  globalThis.setInterval = ((_fn: () => void, _ms: number) => {
    intervais += 1;
    return { unref: () => {}, ref: () => {} } as unknown as ReturnType<typeof setInterval>;
  }) as typeof setInterval;
  globalThis.setTimeout = ((_fn: () => void, _ms: number) => {
    timeouts += 1;
    return { unref: () => {}, ref: () => {} } as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout;
  t.after(() => {
    globalThis.setInterval = originalSetInterval;
    globalThis.setTimeout = originalSetTimeout;
  });

  const mod = await import("./alertaAnomaliaTotp2faDiario");
  mod.iniciarWorkerAlertaAnomaliaTotp2faDiario();
  mod.iniciarWorkerAlertaAnomaliaTotp2faDiario();
  mod.iniciarWorkerAlertaAnomaliaTotp2faDiario();

  assert.equal(intervais, 1, "setInterval deve ser chamado exatamente 1x");
  assert.equal(timeouts, 1, "setTimeout inicial deve ser chamado exatamente 1x");
});

test("alertaAnomaliaTotp2faDiario · expõe API esperada", async () => {
  const mod = await import("./alertaAnomaliaTotp2faDiario");
  assert.equal(typeof mod.iniciarWorkerAlertaAnomaliaTotp2faDiario, "function");
  assert.equal(typeof mod.dispararAlertaAnomalia2faAgora, "function");
  assert.equal(typeof mod._internals.diaAnteriorBrtISO, "function");
  assert.equal(typeof mod._internals.montarGraficoAscii, "function");
});

test("_internals.diaAnteriorBrtISO · subtrai 1 dia do dia BRT corrente", async () => {
  const mod = await import("./alertaAnomaliaTotp2faDiario");
  // 2026-05-14 12:00 UTC = 2026-05-14 09:00 BRT -> dia anterior = 2026-05-13
  const out = mod._internals.diaAnteriorBrtISO(new Date("2026-05-14T12:00:00Z"));
  assert.equal(out, "2026-05-13");
  // 2026-05-14 02:00 UTC = 2026-05-13 23:00 BRT -> dia anterior = 2026-05-12
  const out2 = mod._internals.diaAnteriorBrtISO(new Date("2026-05-14T02:00:00Z"));
  assert.equal(out2, "2026-05-12");
});

test("_internals.montarGraficoAscii · ultimas 7 linhas em ordem cronologica com barras proporcionais", async () => {
  const mod = await import("./alertaAnomaliaTotp2faDiario");
  const serie = [
    { dia: "2026-05-08", totalRemovidas: 4 },
    { dia: "2026-05-09", totalRemovidas: 0 },
    { dia: "2026-05-10", totalRemovidas: 20 },
  ];
  const g = mod._internals.montarGraficoAscii(serie);
  const linhas = g.split("\n");
  assert.equal(linhas.length, 3);
  assert.ok(linhas[0]!.startsWith("2026-05-08"));
  assert.ok(linhas[2]!.startsWith("2026-05-10"));
  // Linha do maximo deve ter barra cheia (sem '░').
  assert.ok(!linhas[2]!.includes("░"), "linha do maximo deve estar 100% cheia");
});

test("_internals.montarGraficoAscii · serie vazia devolve placeholder", async () => {
  const mod = await import("./alertaAnomaliaTotp2faDiario");
  assert.equal(mod._internals.montarGraficoAscii([]), "(sem dados)");
});
