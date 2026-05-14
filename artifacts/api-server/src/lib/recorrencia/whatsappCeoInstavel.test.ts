/**
 * Task #274 · Cobertura unitaria da funcao pura `decidirWhatsappInstavel()`
 * do worker `whatsappCeoInstavel`. Cenarios sem DB/rede que exercem a
 * regra "AND" de gatilho (amostra suficiente E taxa >= limiar).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decidirWhatsappInstavel,
  type DecidirWhatsappInstavelInput,
} from "./whatsappCeoInstavel";

function fixture(over: Partial<DecidirWhatsappInstavelInput> = {}): DecidirWhatsappInstavelInput {
  return {
    totalEnviados: 5,
    totalFalhas: 5,
    minTentativas: 5,
    limiarPercent: 50,
    ...over,
  };
}

test("decidirWhatsappInstavel · 0 tentativas NAO dispara (amostra insuficiente)", () => {
  const d = decidirWhatsappInstavel(fixture({ totalEnviados: 0, totalFalhas: 0 }));
  assert.equal(d.dispara, false);
  assert.equal(d.motivo, "AMOSTRA_INSUFICIENTE");
  assert.equal(d.totalTentativas, 0);
  assert.equal(d.percentualFalhas, 0);
});

test("decidirWhatsappInstavel · 1 falha em 1 tentativa NAO dispara (proteje falso positivo 100%)", () => {
  // Cenario classico de divisao instavel: 1/1 = 100% mas sem
  // significancia estatistica. Sem o piso de minTentativas, o worker
  // dispararia toda vez que o primeiro envio do dia falhasse.
  const d = decidirWhatsappInstavel(fixture({ totalEnviados: 0, totalFalhas: 1 }));
  assert.equal(d.dispara, false);
  assert.equal(d.motivo, "AMOSTRA_INSUFICIENTE");
  assert.equal(d.percentualFalhas, 100);
});

test("decidirWhatsappInstavel · amostra OK + taxa abaixo do limiar NAO dispara", () => {
  // 2 falhas em 10 tentativas = 20% (saudavel). Provedor as vezes pisca
  // mas nao esta quebrado.
  const d = decidirWhatsappInstavel(fixture({ totalEnviados: 8, totalFalhas: 2 }));
  assert.equal(d.dispara, false);
  assert.equal(d.motivo, "TAXA_ABAIXO_DO_LIMIAR");
  assert.equal(d.totalTentativas, 10);
  assert.equal(d.percentualFalhas, 20);
});

test("decidirWhatsappInstavel · amostra OK + taxa exata no limiar DISPARA", () => {
  // 5 falhas em 10 = 50% bate com limiar 50% — dispara (>=).
  const d = decidirWhatsappInstavel(fixture({ totalEnviados: 5, totalFalhas: 5 }));
  assert.equal(d.dispara, true);
  assert.equal(d.motivo, "RAJADA_FALHAS_WHATSAPP");
  assert.equal(d.totalTentativas, 10);
  assert.equal(d.percentualFalhas, 50);
});

test("decidirWhatsappInstavel · provedor totalmente fora do ar (100% falha) DISPARA", () => {
  // Twilio/Gupshup completamente off: 0 enviados, 7 falhas.
  const d = decidirWhatsappInstavel(fixture({ totalEnviados: 0, totalFalhas: 7 }));
  assert.equal(d.dispara, true);
  assert.equal(d.motivo, "RAJADA_FALHAS_WHATSAPP");
  assert.equal(d.percentualFalhas, 100);
});

test("decidirWhatsappInstavel · just abaixo do limiar nao dispara", () => {
  // 4 falhas em 10 = 40% < 50% limiar.
  const d = decidirWhatsappInstavel(fixture({ totalEnviados: 6, totalFalhas: 4 }));
  assert.equal(d.dispara, false);
  assert.equal(d.motivo, "TAXA_ABAIXO_DO_LIMIAR");
  assert.equal(d.percentualFalhas, 40);
});

test("decidirWhatsappInstavel · limiar customizavel (75%) com 70% nao dispara", () => {
  const d = decidirWhatsappInstavel(fixture({
    totalEnviados: 3,
    totalFalhas: 7,
    limiarPercent: 75,
  }));
  assert.equal(d.dispara, false);
  assert.equal(d.percentualFalhas, 70);
});

test("decidirWhatsappInstavel · minTentativas customizavel (20) com 10 ainda eh insuficiente", () => {
  // 10 tentativas, todas falhas = 100%, mas minTentativas exigido = 20.
  const d = decidirWhatsappInstavel(fixture({
    totalEnviados: 0,
    totalFalhas: 10,
    minTentativas: 20,
  }));
  assert.equal(d.dispara, false);
  assert.equal(d.motivo, "AMOSTRA_INSUFICIENTE");
  assert.equal(d.percentualFalhas, 100);
});

test("decidirWhatsappInstavel · arredondamento percentual a 2 casas", () => {
  // 1 falha em 3 = 33.333...% → 33.33
  const d = decidirWhatsappInstavel(fixture({
    totalEnviados: 2,
    totalFalhas: 1,
    minTentativas: 3,
    limiarPercent: 50,
  }));
  assert.equal(d.percentualFalhas, 33.33);
  assert.equal(d.dispara, false);
});

test("decidirWhatsappInstavel · amostra grande saudavel (zero falhas) NAO dispara", () => {
  const d = decidirWhatsappInstavel(fixture({ totalEnviados: 100, totalFalhas: 0 }));
  assert.equal(d.dispara, false);
  assert.equal(d.motivo, "TAXA_ABAIXO_DO_LIMIAR");
  assert.equal(d.percentualFalhas, 0);
  assert.equal(d.totalTentativas, 100);
});
