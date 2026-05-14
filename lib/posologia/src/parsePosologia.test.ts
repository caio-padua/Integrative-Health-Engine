import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePosologia, formatarPosologiaEstruturada, formatarPosologiaLinhas } from "./parsePosologia.js";

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

/* -------------------------------------------------------------------------- */
/* Formatos compostos: escalonamento, ciclo, tomadas múltiplas, ranges        */
/* -------------------------------------------------------------------------- */

test("escalonamento numerico: '1 cap na 1ª semana, 2 caps na 2ª semana'", () => {
  const p = parsePosologia("1 cap na 1ª semana, 2 caps na 2ª semana");
  assert.equal(p.interpretado, true);
  assert.equal(p.unidadeForma, "capsula");
  assert.deepEqual(p.fases, [
    { semana: 1, quantidade: 1 },
    { semana: 2, quantidade: 2 },
  ]);
  assert.equal(p.quantidade, 1);
});

test("escalonamento numerico estendido: 3 semanas", () => {
  const p = parsePosologia("1 cap na 1ª semana, 2 caps na 2ª semana, 3 caps na 3ª semana");
  assert.deepEqual(p.fases, [
    { semana: 1, quantidade: 1 },
    { semana: 2, quantidade: 2 },
    { semana: 3, quantidade: 3 },
  ]);
});

test("escalonamento por extenso: 'na primeira semana e na segunda semana'", () => {
  const p = parsePosologia("1 capsula na primeira semana e 2 capsulas na segunda semana");
  assert.equal(p.interpretado, true);
  assert.deepEqual(p.fases, [
    { semana: 1, quantidade: 1 },
    { semana: 2, quantidade: 2 },
  ]);
});

test("ciclo on/off: '21 dias on / 7 dias off'", () => {
  const p = parsePosologia("21 dias on / 7 dias off");
  assert.equal(p.interpretado, true);
  assert.deepEqual(p.ciclo, { diasOn: 21, diasOff: 7 });
  // Ciclo puro NÃO deve contaminar quantidade nem duracaoDias.
  assert.equal(p.quantidade, undefined);
  assert.equal(p.duracaoDias, undefined);
});

test("ciclo via 'usar / pausar': 'usar 21 dias e pausar 7 dias'", () => {
  const p = parsePosologia("usar 21 dias e pausar 7 dias");
  assert.deepEqual(p.ciclo, { diasOn: 21, diasOff: 7 });
  assert.equal(p.quantidade, undefined);
  assert.equal(p.duracaoDias, undefined);
});

test("ciclo abreviado: 'ciclo 21/7'", () => {
  const p = parsePosologia("ciclo 21/7");
  assert.deepEqual(p.ciclo, { diasOn: 21, diasOff: 7 });
  assert.equal(p.quantidade, undefined);
  assert.equal(p.duracaoDias, undefined);
});

test("ciclo + dose explícita: '1 cap ao dia, 21 dias on / 7 dias off'", () => {
  const p = parsePosologia("1 cap ao dia, 21 dias on / 7 dias off");
  assert.deepEqual(p.ciclo, { diasOn: 21, diasOff: 7 });
  assert.equal(p.quantidade, 1);
  assert.equal(p.unidadeForma, "capsula");
  // Sem "por N dias" explícito, duracaoDias não deve aparecer só por causa do ciclo.
  assert.equal(p.duracaoDias, undefined);
});

test("formatador de ciclo puro não inclui 'por N dias'", () => {
  const p = parsePosologia("21 dias on / 7 dias off");
  const frase = formatarPosologiaEstruturada(p);
  assert.doesNotMatch(frase, /por \d+ dias/);
  assert.match(frase, /ciclo 21 dias on \/ 7 dias off/);
});

test("tomadas múltiplas com '+': '1 comp pela manhã + 2 comp à noite'", () => {
  const p = parsePosologia("1 comp pela manhã + 2 comp à noite");
  assert.equal(p.interpretado, true);
  assert.equal(p.unidadeForma, "comprimido");
  assert.deepEqual(p.tomadas, [
    { quantidade: 1, momento: "manha" },
    { quantidade: 2, momento: "noite" },
  ]);
  assert.deepEqual(p.frequencia, { tipo: "diaria", vezes: 2 });
  assert.deepEqual(p.momento, ["manha", "noite"]);
});

test("tomadas múltiplas com ' e ': '1 cap manhã e 2 cap noite'", () => {
  const p = parsePosologia("1 cap manhã e 2 cap noite");
  assert.deepEqual(p.tomadas, [
    { quantidade: 1, momento: "manha" },
    { quantidade: 2, momento: "noite" },
  ]);
  assert.deepEqual(p.frequencia, { tipo: "diaria", vezes: 2 });
});

test("tomadas múltiplas 3 momentos com vírgula", () => {
  const p = parsePosologia("2 gotas pela manhã, 3 gotas à tarde e 4 gotas à noite");
  assert.equal(p.unidadeForma, "gota");
  assert.deepEqual(p.tomadas, [
    { quantidade: 2, momento: "manha" },
    { quantidade: 3, momento: "tarde" },
    { quantidade: 4, momento: "noite" },
  ]);
  assert.deepEqual(p.frequencia, { tipo: "diaria", vezes: 3 });
});

test("range numerico com hífen: '1-2 caps ao dia'", () => {
  const p = parsePosologia("1-2 caps ao dia");
  assert.equal(p.interpretado, true);
  assert.deepEqual(p.quantidadeRange, { min: 1, max: 2 });
  assert.equal(p.quantidade, 1);
  assert.equal(p.unidadeForma, "capsula");
  assert.deepEqual(p.frequencia, { tipo: "diaria", vezes: 1 });
});

test("range com 'a': '2 a 3 gotas 3x ao dia'", () => {
  const p = parsePosologia("2 a 3 gotas 3x ao dia");
  assert.deepEqual(p.quantidadeRange, { min: 2, max: 3 });
  assert.equal(p.unidadeForma, "gota");
  assert.deepEqual(p.frequencia, { tipo: "diaria", vezes: 3 });
});

test("ml com frequência: '5 ml 3x ao dia VO'", () => {
  const p = parsePosologia("5 ml 3x ao dia VO");
  assert.equal(p.interpretado, true);
  assert.equal(p.volumeMl, 5);
  assert.equal(p.unidadeForma, "ml");
  assert.deepEqual(p.frequencia, { tipo: "diaria", vezes: 3 });
  assert.equal(p.via, "oral");
});

test("gotas com frequência sublingual: '10 gotas sublingual 2x ao dia'", () => {
  const p = parsePosologia("10 gotas sublingual 2x ao dia");
  assert.equal(p.quantidade, 10);
  assert.equal(p.unidadeForma, "gota");
  assert.equal(p.via, "sublingual");
  assert.deepEqual(p.frequencia, { tipo: "diaria", vezes: 2 });
});

test("composto: range + ciclo + via", () => {
  const p = parsePosologia("1-2 caps ao dia, 21 dias on / 7 dias off, VO");
  assert.deepEqual(p.quantidadeRange, { min: 1, max: 2 });
  assert.deepEqual(p.ciclo, { diasOn: 21, diasOff: 7 });
  assert.equal(p.via, "oral");
  assert.deepEqual(p.frequencia, { tipo: "diaria", vezes: 1 });
});

test("composto: escalonamento + via padrão por contexto", () => {
  const p = parsePosologia(
    "1 cap na 1ª semana, 2 caps na 2ª semana, 3 caps na 3ª semana",
    { viaPadrao: "oral" },
  );
  assert.equal(p.via, "oral");
  assert.equal(p.fases?.length, 3);
});

test("formatador renderiza ciclo", () => {
  const p = parsePosologia("1 cap ao dia 21 dias on / 7 dias off");
  const frase = formatarPosologiaEstruturada(p);
  assert.match(frase, /ciclo 21 dias on \/ 7 dias off/);
});

test("formatador renderiza fases", () => {
  const p = parsePosologia("1 cap na 1ª semana, 2 caps na 2ª semana");
  const frase = formatarPosologiaEstruturada(p);
  assert.match(frase, /escalonamento: 1 na 1ª semana, 2 na 2ª semana/);
});

test("formatador renderiza tomadas múltiplas", () => {
  const p = parsePosologia("1 comp pela manhã + 2 comp à noite");
  const frase = formatarPosologiaEstruturada(p);
  assert.match(frase, /tomadas: 1 pela manhã \+ 2 à noite/);
});

test("formatador renderiza range", () => {
  const p = parsePosologia("1-2 cps ao dia");
  const frase = formatarPosologiaEstruturada(p);
  assert.match(frase, /1-2 por tomada/);
});

test("não confunde 'por 7 dias' com ciclo", () => {
  const p = parsePosologia("1 capsula ao dia por 7 dias");
  assert.equal(p.ciclo, undefined);
  assert.equal(p.duracaoDias, 7);
});

test("não cria fases falsas em texto sem semana", () => {
  const p = parsePosologia("1 capsula ao dia");
  assert.equal(p.fases, undefined);
  assert.equal(p.tomadas, undefined);
  assert.equal(p.quantidadeRange, undefined);
  assert.equal(p.ciclo, undefined);
});

/* -------------------------------------------------------------------------- */
/* formatarPosologiaLinhas — Task #240 (blocos visualmente distintos no PDF)  */
/* -------------------------------------------------------------------------- */

test("linhas: fallback raw quando interpretado=false", () => {
  const p = parsePosologia("xpto-zlqr");
  const linhas = formatarPosologiaLinhas(p);
  assert.equal(linhas.fraseBase, "xpto-zlqr");
  assert.equal(linhas.fases, undefined);
  assert.equal(linhas.ciclo, undefined);
  assert.equal(linhas.tomadas, undefined);
  assert.equal(linhas.quantidadeRange, undefined);
});

test("linhas: posologia simples sem extras", () => {
  const p = parsePosologia("1 capsula 1 hora antes de dormir");
  const linhas = formatarPosologiaLinhas(p);
  assert.match(linhas.fraseBase, /1 cápsula/);
  assert.match(linhas.fraseBase, /antes de dormir/);
  assert.equal(linhas.fases, undefined);
  assert.equal(linhas.ciclo, undefined);
  assert.equal(linhas.tomadas, undefined);
});

test("linhas: escalonamento por semanas vira bloco fases", () => {
  const p = parsePosologia("1 cap na 1ª semana, 2 caps na 2ª semana, 3 caps na 3ª semana");
  const linhas = formatarPosologiaLinhas(p);
  assert.ok(linhas.fases && linhas.fases.length === 3);
  assert.equal(linhas.fases![0], "1ª semana → 1 cápsula");
  assert.equal(linhas.fases![1], "2ª semana → 2 cápsulas");
  assert.equal(linhas.fases![2], "3ª semana → 3 cápsulas");
});

test("linhas: ciclo on/off vira linha própria", () => {
  const p = parsePosologia("1 capsula ao dia, 21 dias on / 7 dias off");
  const linhas = formatarPosologiaLinhas(p);
  assert.equal(linhas.ciclo, "Ciclo: 21 dias em uso / 7 dias de pausa");
});

test("linhas: tomadas múltiplas viram bloco com momentos separados", () => {
  const p = parsePosologia("1 comp pela manhã + 2 comp à noite");
  const linhas = formatarPosologiaLinhas(p);
  assert.ok(linhas.tomadas && linhas.tomadas.length === 2);
  assert.equal(linhas.tomadas![0], "Pela manhã: 1 comprimido");
  assert.equal(linhas.tomadas![1], "À noite: 2 comprimidos");
  // frequência redundante (vezes=tomadas.length) não deve poluir base
  assert.doesNotMatch(linhas.fraseBase, /2x ao dia/);
});

test("linhas: quantidadeRange vira linha de faixa", () => {
  const p = parsePosologia("2 a 3 gotas ao dia");
  const linhas = formatarPosologiaLinhas(p);
  assert.ok(linhas.quantidadeRange);
  assert.match(linhas.quantidadeRange!, /2–3 gotas por tomada/);
});
