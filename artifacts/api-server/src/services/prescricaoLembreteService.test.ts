import { test } from "node:test";
import assert from "node:assert/strict";
import {
  partsParaTimezone,
  horarioDentroDaJanela,
} from "./prescricaoLembreteService.js";

test("partsParaTimezone calcula HH:MM e data em America/Sao_Paulo", () => {
  // 2026-04-19 12:00:00 UTC -> 09:00 em America/Sao_Paulo (UTC-3)
  const utc = new Date(Date.UTC(2026, 3, 19, 12, 0, 0));
  const r = partsParaTimezone(utc, "America/Sao_Paulo");
  assert.equal(r.data, "2026-04-19");
  assert.equal(r.horaMin, 9 * 60);
});

test("partsParaTimezone funciona em outra timezone (UTC)", () => {
  const utc = new Date(Date.UTC(2026, 3, 19, 23, 30, 0));
  const r = partsParaTimezone(utc, "UTC");
  assert.equal(r.data, "2026-04-19");
  assert.equal(r.horaMin, 23 * 60 + 30);
});


test("horarioDentroDaJanela aceita match exato", () => {
  const r = horarioDentroDaJanela(["07:00", "13:00", "20:00"], 7 * 60, 5);
  assert.equal(r, "07:00");
});

test("horarioDentroDaJanela aceita ate tolerancia DEPOIS do horario marcado", () => {
  const r = horarioDentroDaJanela(["07:00", "13:00"], 7 * 60 + 4, 5);
  assert.equal(r, "07:00");
  const r2 = horarioDentroDaJanela(["07:00", "13:00"], 13 * 60 + 5, 5);
  assert.equal(r2, "13:00");
});

test("horarioDentroDaJanela NAO dispara antes do horario marcado", () => {
  const r = horarioDentroDaJanela(["07:00", "13:00"], 7 * 60 - 1, 5);
  assert.equal(r, null);
  const r2 = horarioDentroDaJanela(["07:00", "13:00"], 13 * 60 - 5, 5);
  assert.equal(r2, null);
});

test("horarioDentroDaJanela retorna null fora da tolerancia", () => {
  const r = horarioDentroDaJanela(["07:00", "13:00"], 7 * 60 + 6, 5);
  assert.equal(r, null);
  const r2 = horarioDentroDaJanela(["07:00", "13:00"], 10 * 60, 5);
  assert.equal(r2, null);
});

test("horarioDentroDaJanela ignora horarios mal formatados", () => {
  const r = horarioDentroDaJanela(["nao-hora", "13:00"], 13 * 60, 5);
  assert.equal(r, "13:00");
  const r2 = horarioDentroDaJanela(["25:00"], 0, 5);
  assert.equal(r2, null);
});

test("horarioDentroDaJanela retorna o primeiro horario que casa", () => {
  // ambos dentro da tolerancia -> retorna o primeiro
  const r = horarioDentroDaJanela(["07:00", "07:05"], 7 * 60 + 2, 5);
  assert.equal(r, "07:00");
});
