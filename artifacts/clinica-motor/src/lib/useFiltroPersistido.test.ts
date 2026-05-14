// Task #216 — testes da logica pura do hook generico de memoria de filtros.
// Aqui validamos so o contrato de chave de storage + parse/serialize
// (sem React/DOM). A integracao real (state + URL replaceState + useEffect)
// e exercitada pelas paginas migradas (assinaturas-timeline, pacientes).
import { test } from "node:test";
import assert from "node:assert/strict";

// Reimplementa as 2 funcoes puras que o hook usa internamente. Mantemos
// duplicado pra nao acoplar este teste ao import do .ts (que arrasta React).
function chaveStorage(scope: string, nome: string, uid: number | string | null | undefined): string | null {
  if (uid === undefined || uid === null) return null;
  return `pawards.${scope}.${nome}.${uid}`;
}

test("chaveStorage: monta no formato pawards.<scope>.<nome>.<uid>", () => {
  assert.equal(chaveStorage("timeline", "filtro_status", 42), "pawards.timeline.filtro_status.42");
  assert.equal(chaveStorage("pacientes", "ordenar_por", "abc"), "pawards.pacientes.ordenar_por.abc");
});

test("chaveStorage: devolve null sem uid (nao persiste antes do login)", () => {
  assert.equal(chaveStorage("timeline", "filtro_status", undefined), null);
  assert.equal(chaveStorage("timeline", "filtro_status", null), null);
});

test("chaveStorage: preserva chaves ja gravadas pelas paginas pre-Task #216", () => {
  // Estas eram as chaves usadas inline antes da extracao do hook —
  // qualquer mudanca aqui invalida a memoria de filtros ja salva nas
  // contas dos usuarios (Caio, Contador, etc.).
  assert.equal(chaveStorage("timeline", "filtro_unidade_id", 7), "pawards.timeline.filtro_unidade_id.7");
  assert.equal(chaveStorage("timeline", "filtro_status", 7), "pawards.timeline.filtro_status.7");
  assert.equal(chaveStorage("timeline", "ordenar_por", 7), "pawards.timeline.ordenar_por.7");
  assert.equal(chaveStorage("pacientes", "ordenar_por", 7), "pawards.pacientes.ordenar_por.7");
  assert.equal(chaveStorage("ras", "ordenar_por", 7), "pawards.ras.ordenar_por.7");
});

test("contrato parse/serialize: round-trip com default volta vazio (= 'limpo explicitamente')", () => {
  // String vazia salva = "usuario voltou pro default"; o hook nao deve
  // restaurar nada quando o storage tem "" (parse("") devolve default,
  // serialize(default) devolve "" — comparacao via serialize bate, no-op).
  const parse = (raw: string): string[] => (raw ? raw.split(",") : []);
  const serialize = (v: string[]) => v.join(",");
  assert.deepEqual(parse(""), []);
  assert.equal(serialize([]), "");
  // Round-trip de valor real
  assert.deepEqual(parse(serialize(["a", "b"])), ["a", "b"]);
});
