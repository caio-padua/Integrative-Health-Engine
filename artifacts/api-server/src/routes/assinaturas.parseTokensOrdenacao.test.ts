import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTokensOrdenacao } from "./assinaturas.js";

test("retorna lista vazia para string vazia", () => {
  assert.deepEqual(parseTokensOrdenacao(""), []);
});

test("aceita tokens da whitelist e ignora tokens invalidos", () => {
  assert.deepEqual(
    parseTokensOrdenacao("template_asc,foo_bar,criado_desc"),
    ["template_asc", "criado_desc"],
  );
});

test("ignora token invalido isolado", () => {
  assert.deepEqual(parseTokensOrdenacao("xpto_desc"), []);
});

test("dedupe por coluna mantem primeira ocorrencia (template_asc vence template_desc)", () => {
  assert.deepEqual(
    parseTokensOrdenacao("template_asc,template_desc"),
    ["template_asc"],
  );
});

test("aplica cap de 4 colunas (MAX_ORDENACOES_TIMELINE)", () => {
  const tokens = parseTokensOrdenacao(
    "template_asc,paciente_desc,clinica_asc,status_desc,valor_asc,medico_desc",
  );
  assert.equal(tokens.length, 4);
  assert.deepEqual(tokens, [
    "template_asc",
    "paciente_desc",
    "clinica_asc",
    "status_desc",
  ]);
});

test("trim de espacos em volta dos tokens", () => {
  assert.deepEqual(
    parseTokensOrdenacao("  template_asc , criado_desc  "),
    ["template_asc", "criado_desc"],
  );
});

test("token invalido nao consome slot do cap de 4", () => {
  const tokens = parseTokensOrdenacao(
    "lixo,template_asc,outro_lixo,paciente_desc,clinica_asc,status_desc",
  );
  assert.equal(tokens.length, 4);
  assert.deepEqual(tokens, [
    "template_asc",
    "paciente_desc",
    "clinica_asc",
    "status_desc",
  ]);
});
