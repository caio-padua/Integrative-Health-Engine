/**
 * Task #252 · Cobertura unitaria da funcao `decidirSilencio()` do tick auxiliar
 * de pdfRetryUploadResumoDiario. Cenarios puros (sem DB, sem rede) que exercem
 * a regra "AND" de gatilho:
 *   - dispara so quando ha esgotados >= limiar E
 *     (worker nunca rodou OU gap em dias >= dias_min).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decidirSilencio,
  type DecidirSilencioInput,
} from "./pdfRetryUploadResumoDiario";

const AGORA = new Date("2026-05-14T12:00:00Z");

function fixture(over: Partial<DecidirSilencioInput> = {}): DecidirSilencioInput {
  return {
    ultimaEntradaEm: new Date("2026-05-13T10:00:00Z"), // 1 dia atras
    totalEsgotados24h: 5,
    agora: AGORA,
    diasMin: 7,
    limiarEsgotados: 3,
    ...over,
  };
}

test("decidirSilencio · sem esgotados (abaixo do limiar) NAO dispara, mesmo com gap longo", () => {
  // Cenario saudavel: faz semanas que nao ha esgotados (worker corretamente
  // nao gerou resumos). NAO eh sinal de worker quebrado — eh sinal de bucket
  // estavel. Falso positivo classico que precisamos evitar.
  const d = decidirSilencio(fixture({
    totalEsgotados24h: 0,
    ultimaEntradaEm: new Date("2026-04-01T10:00:00Z"), // 43 dias atras
  }));
  assert.equal(d.dispara, false);
  assert.equal(d.motivo, "ABAIXO_DO_LIMIAR_ESGOTADOS");
  assert.equal(d.diasSemResumo, 43);
});

test("decidirSilencio · esgotados acima do limiar + gap curto (1 dia) NAO dispara", () => {
  // Worker rodou ontem, esgotados pendentes hoje — comportamento normal,
  // o tick principal das 08:00 BRT cuida disso. Tick auxiliar cala.
  const d = decidirSilencio(fixture({
    totalEsgotados24h: 10,
    ultimaEntradaEm: new Date("2026-05-13T10:00:00Z"),
  }));
  assert.equal(d.dispara, false);
  assert.equal(d.motivo, "GAP_ABAIXO_DO_MIN");
  assert.equal(d.diasSemResumo, 1);
});

test("decidirSilencio · esgotados >= limiar + gap exato no diasMin DISPARA", () => {
  const d = decidirSilencio(fixture({
    totalEsgotados24h: 3,
    ultimaEntradaEm: new Date("2026-05-07T12:00:00Z"), // exatamente 7 dias
  }));
  assert.equal(d.dispara, true);
  assert.equal(d.motivo, "WORKER_SILENCIOSO_GAP_LONGO");
  assert.equal(d.diasSemResumo, 7);
});

test("decidirSilencio · esgotados >= limiar + gap muito longo (15 dias) DISPARA", () => {
  const d = decidirSilencio(fixture({
    totalEsgotados24h: 8,
    ultimaEntradaEm: new Date("2026-04-29T12:00:00Z"), // 15 dias atras
  }));
  assert.equal(d.dispara, true);
  assert.equal(d.motivo, "WORKER_SILENCIOSO_GAP_LONGO");
  assert.equal(d.diasSemResumo, 15);
});

test("decidirSilencio · ultimaEntrada=null (worker nunca rodou) + esgotados >= limiar DISPARA", () => {
  // Cenario "worker novo nunca foi acionado mas ja existem esgotados" —
  // tipico apos primeira instalacao do retry com bucket instavel desde o dia 0.
  const d = decidirSilencio(fixture({
    totalEsgotados24h: 4,
    ultimaEntradaEm: null,
  }));
  assert.equal(d.dispara, true);
  assert.equal(d.motivo, "WORKER_SILENCIOSO_NUNCA_RODOU");
  assert.equal(d.diasSemResumo, 9999);
});

test("decidirSilencio · ultimaEntrada=null mas SEM esgotados NAO dispara (sistema novo saudavel)", () => {
  // Sistema recem-instalado sem nenhum esgotado ainda — worker nunca precisou
  // rodar. Disparar aqui seria spam falso positivo logo no boot.
  const d = decidirSilencio(fixture({
    totalEsgotados24h: 0,
    ultimaEntradaEm: null,
  }));
  assert.equal(d.dispara, false);
  assert.equal(d.motivo, "ABAIXO_DO_LIMIAR_ESGOTADOS");
});

test("decidirSilencio · esgotados just abaixo do limiar (limiar-1) NAO dispara", () => {
  const d = decidirSilencio(fixture({
    totalEsgotados24h: 2,
    limiarEsgotados: 3,
    ultimaEntradaEm: new Date("2026-04-29T12:00:00Z"),
  }));
  assert.equal(d.dispara, false);
  assert.equal(d.motivo, "ABAIXO_DO_LIMIAR_ESGOTADOS");
});

test("decidirSilencio · diasMin custom (3) com gap=4 DISPARA", () => {
  const d = decidirSilencio(fixture({
    totalEsgotados24h: 5,
    diasMin: 3,
    ultimaEntradaEm: new Date("2026-05-10T12:00:00Z"), // 4 dias
  }));
  assert.equal(d.dispara, true);
  assert.equal(d.diasSemResumo, 4);
});
