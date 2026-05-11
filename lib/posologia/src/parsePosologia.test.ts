import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePosologia, formatarPosologiaEstruturada } from "./parsePosologia.js";

test("formula: '1 CAPSULA 1 HORA ANTES DE DORMIR'", () => {
  const p = parsePosologia("1 CAPSULA 1 HORA ANTES DE DORMIR");
  assert.equal(p.interpretado, true);
  assert.equal(p.quantidade, 1);
  assert.equal(p.unidadeForma, "capsula");
  assert.deepEqual(p.momento, ["antes_dormir"]);
  assert.deepEqual(p.frequencia, { tipo: "diaria", vezes: 1 });
});

test("injetavel IM: '100mg / 2mL' com contexto", () => {
  const p = parsePosologia("100mg / 2mL", { categoria: "injetavel_im" });
  assert.equal(p.interpretado, true);
  assert.equal(p.doseMg, 100);
  assert.equal(p.volumeMl, 2);
  assert.equal(p.via, "intramuscular");
});

test("injetavel EV: '500mg / 10mL' com contexto", () => {
  const p = parsePosologia("500mg / 10mL", { categoria: "injetavel_ev" });
  assert.equal(p.doseMg, 500);
  assert.equal(p.volumeMl, 10);
  assert.equal(p.via, "endovenosa");
});

test("implante: '50 mg — 4 pellets'", () => {
  const p = parsePosologia("50 mg — 4 pellets");
  assert.equal(p.interpretado, true);
  assert.equal(p.doseMg, 50);
  assert.equal(p.quantidade, 4);
  assert.equal(p.unidadeForma, "pellet");
  assert.equal(p.via, "implante");
});

test("revo: '2 caps 2x/dia com refeições'", () => {
  const p = parsePosologia("2 caps 2x/dia com refeições");
  assert.equal(p.quantidade, 2);
  assert.equal(p.unidadeForma, "capsula");
  assert.deepEqual(p.frequencia, { tipo: "diaria", vezes: 2 });
  assert.deepEqual(p.momento, ["com_refeicao"]);
});

test("revo: '1 dose VO - 2h antes do almoço'", () => {
  const p = parsePosologia("1 dose VO - 2h antes do almoço");
  assert.equal(p.quantidade, 1);
  assert.equal(p.unidadeForma, "dose");
  assert.equal(p.via, "oral");
  assert.deepEqual(p.momento, ["antes_almoco"]);
});

test("revo: '1 comp em jejum 30min antes café'", () => {
  const p = parsePosologia("1 comp em jejum 30min antes café");
  assert.equal(p.quantidade, 1);
  assert.equal(p.unidadeForma, "comprimido");
  assert.deepEqual((p.momento ?? []).slice().sort(), ["antes_cafe", "jejum"].sort());
});

test("frequencia horaria: '1 cp de 8 em 8 horas'", () => {
  const p = parsePosologia("1 cp de 8 em 8 horas");
  assert.deepEqual(p.frequencia, { tipo: "horaria", intervaloHoras: 8 });
});

test("frequencia 8/8h", () => {
  const p = parsePosologia("1 capsula 8/8h");
  assert.deepEqual(p.frequencia, { tipo: "horaria", intervaloHoras: 8 });
});

test("duracao: '1 capsula ao dia por 7 dias'", () => {
  const p = parsePosologia("1 capsula ao dia por 7 dias");
  assert.deepEqual(p.frequencia, { tipo: "diaria", vezes: 1 });
  assert.equal(p.duracaoDias, 7);
});

test("dose unica", () => {
  const p = parsePosologia("administrar dose única");
  assert.deepEqual(p.frequencia, { tipo: "unica" });
});

test("semanal explicito: '1 ampola 1x/semana IM'", () => {
  const p = parsePosologia("1 ampola 1x/semana IM");
  assert.equal(p.unidadeForma, "ampola");
  assert.deepEqual(p.frequencia, { tipo: "semanal", vezes: 1 });
  assert.equal(p.via, "intramuscular");
});

test("fallback: texto livre incompreensível", () => {
  const p = parsePosologia("conforme orientação médica em consulta");
  assert.equal(p.interpretado, false);
  assert.equal(p.raw, "conforme orientação médica em consulta");
});

test("vazio devolve interpretado=false", () => {
  const p = parsePosologia("");
  assert.equal(p.interpretado, false);
  assert.equal(p.raw, "");
});

test("null/undefined devolve interpretado=false", () => {
  const p = parsePosologia(null);
  assert.equal(p.interpretado, false);
  const p2 = parsePosologia(undefined);
  assert.equal(p2.interpretado, false);
});

test("formatador canônico: '1 cápsula, via oral, 1x ao dia, antes de dormir'", () => {
  const p = parsePosologia("1 capsula VO ao dia antes de dormir");
  const frase = formatarPosologiaEstruturada(p);
  assert.match(frase, /1 cápsula/);
  assert.match(frase, /via oral/);
  assert.match(frase, /1x ao dia/);
  assert.match(frase, /antes de dormir/);
});

test("formatador devolve raw quando não interpretado", () => {
  const p = parsePosologia("xyz inintelivel");
  assert.equal(formatarPosologiaEstruturada(p), "xyz inintelivel");
});

test("via padrão é usada como fallback", () => {
  const p = parsePosologia("1 capsula ao dia", { viaPadrao: "oral" });
  assert.equal(p.via, "oral");
});

test("preserva texto raw original (case + acentos)", () => {
  const p = parsePosologia("1 CAPSULA 1 HORA ANTES DE DORMIR");
  assert.equal(p.raw, "1 CAPSULA 1 HORA ANTES DE DORMIR");
});
