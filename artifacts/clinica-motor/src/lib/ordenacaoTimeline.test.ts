// Task #99 — testes da logica pura de ordenacao multi-coluna usada na
// timeline de assinaturas. Pos-rebase Task #98, a logica vive na lib
// generica `lib/ordenacao-multi.tsx`; aqui montamos a instancia da
// timeline (chaves + mapa de URL) e validamos os mesmos cenarios.
// Roda com `tsx --test` (mesma stack do api-server, sem precisar de Vitest).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dedupePorColuna,
  parseOrdenacoesFromString,
  serializarOrdenacoes,
  alternarOrdenacao,
  type Ordenacao as OrdenacaoLib,
} from "./ordenacao-multi.js";

type ChaveOrdenacao =
  | "VALOR" | "CRIADO" | "CONCLUIDO" | "STATUS"
  | "PACIENTE" | "MEDICO" | "FARMACIA" | "CLINICA" | "TEMPLATE";
type Ordenacao = OrdenacaoLib<ChaveOrdenacao>;
const MAX_ORDENACOES = 4;

const ORDENACAO_URL: Record<Ordenacao, string> = {
  VALOR_DESC: "valor_desc",       VALOR_ASC: "valor_asc",
  CRIADO_DESC: "criado_desc",     CRIADO_ASC: "criado_asc",
  CONCLUIDO_DESC: "concluido_desc", CONCLUIDO_ASC: "concluido_asc",
  STATUS_DESC: "status_desc",     STATUS_ASC: "status_asc",
  PACIENTE_DESC: "paciente_desc", PACIENTE_ASC: "paciente_asc",
  MEDICO_DESC: "medico_desc",     MEDICO_ASC: "medico_asc",
  FARMACIA_DESC: "farmacia_desc", FARMACIA_ASC: "farmacia_asc",
  CLINICA_DESC: "clinica_desc",   CLINICA_ASC: "clinica_asc",
  TEMPLATE_DESC: "template_desc", TEMPLATE_ASC: "template_asc",
};
const URL_TO_ORDENACAO: Record<string, Ordenacao> = Object.fromEntries(
  Object.entries(ORDENACAO_URL).map(([k, v]) => [v, k as Ordenacao]),
);

const dedupe = (lista: Ordenacao[]) =>
  dedupePorColuna<ChaveOrdenacao>(lista, MAX_ORDENACOES);
const parse = (raw: string) =>
  parseOrdenacoesFromString<ChaveOrdenacao>(raw, URL_TO_ORDENACAO, MAX_ORDENACOES);
const serializar = (lista: Ordenacao[]) =>
  serializarOrdenacoes<ChaveOrdenacao>(lista, ORDENACAO_URL);
const alternar = (atual: Ordenacao[], chave: ChaveOrdenacao, shift: boolean) =>
  alternarOrdenacao<ChaveOrdenacao>(chave, shift, atual);

test("dedupePorColuna: primeira ocorrencia da coluna vence", () => {
  const r = dedupe(["TEMPLATE_ASC", "TEMPLATE_DESC", "CRIADO_DESC"]);
  assert.deepEqual(r, ["TEMPLATE_ASC", "CRIADO_DESC"]);
});

test("dedupePorColuna: aplica cap de 4", () => {
  const r = dedupe([
    "TEMPLATE_ASC", "PACIENTE_DESC", "CLINICA_ASC", "STATUS_DESC", "VALOR_ASC", "MEDICO_DESC",
  ]);
  assert.equal(r.length, 4);
  assert.deepEqual(r, ["TEMPLATE_ASC", "PACIENTE_DESC", "CLINICA_ASC", "STATUS_DESC"]);
});

test("parseOrdenacoesFromString: vazio devolve []", () => {
  assert.deepEqual(parse(""), []);
});

test("parseOrdenacoesFromString: ignora tokens fora da whitelist", () => {
  assert.deepEqual(
    parse("template_asc,foo_bar,criado_desc"),
    ["TEMPLATE_ASC", "CRIADO_DESC"],
  );
});

test("parseOrdenacoesFromString: trim e case-insensitive", () => {
  assert.deepEqual(
    parse("  TEMPLATE_ASC , Criado_Desc "),
    ["TEMPLATE_ASC", "CRIADO_DESC"],
  );
});

test("serializarOrdenacoes: formato CSV de URL", () => {
  assert.equal(
    serializar(["TEMPLATE_ASC", "CRIADO_DESC"]),
    "template_asc,criado_desc",
  );
});

// ─── ciclo do CLIQUE SIMPLES (sem Shift) ─────────────────────────────────

test("clique simples em coluna nova: substitui a lista por [chave_DESC]", () => {
  const r = alternar(["PACIENTE_DESC"], "TEMPLATE", false);
  assert.deepEqual(r, ["TEMPLATE_DESC"]);
});

test("clique simples na unica coluna ativa em DESC: vira ASC", () => {
  const r = alternar(["TEMPLATE_DESC"], "TEMPLATE", false);
  assert.deepEqual(r, ["TEMPLATE_ASC"]);
});

test("clique simples na unica coluna ativa em ASC: volta pro padrao (lista vazia)", () => {
  const r = alternar(["TEMPLATE_ASC"], "TEMPLATE", false);
  assert.deepEqual(r, []);
});

test("clique simples ignora estado anterior multi-coluna e substitui", () => {
  const r = alternar(["TEMPLATE_ASC", "CRIADO_DESC"], "TEMPLATE", false);
  assert.deepEqual(r, ["TEMPLATE_DESC"]);
});

// ─── ciclo do SHIFT+CLIQUE (multi-sort) ──────────────────────────────────

test("shift+clique em coluna nova: appendiza como _DESC", () => {
  const r = alternar(["TEMPLATE_ASC"], "CRIADO", true);
  assert.deepEqual(r, ["TEMPLATE_ASC", "CRIADO_DESC"]);
});

test("shift+clique em coluna ja ativa como _DESC: inverte pra _ASC", () => {
  const r = alternar(["TEMPLATE_ASC", "CRIADO_DESC"], "CRIADO", true);
  assert.deepEqual(r, ["TEMPLATE_ASC", "CRIADO_ASC"]);
});

test("shift+clique em coluna ja ativa como _ASC: remove desse grupo", () => {
  const r = alternar(["TEMPLATE_ASC", "CRIADO_ASC"], "CRIADO", true);
  assert.deepEqual(r, ["TEMPLATE_ASC"]);
});

test("shift+clique respeita cap de 4 ao appendizar (via dedupePorColuna)", () => {
  // O consumidor da lib aplica `dedupePorColuna(..., MAX)` apos `alternarOrdenacao`
  // (ver `setOrdenacoes` em assinaturas-timeline.tsx). Este teste valida o
  // pipeline completo: append + dedupe corta a quinta coluna.
  const base: Ordenacao[] = [
    "TEMPLATE_ASC", "PACIENTE_DESC", "CLINICA_ASC", "STATUS_DESC",
  ];
  const r = dedupe(alternar(base, "VALOR", true));
  assert.equal(r.length, 4);
  assert.deepEqual(r, base);
});
