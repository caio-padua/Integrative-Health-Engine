import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  type SubstanciaCatalogoCategoria,
  rankCategoria,
  normalizarNomeParaMatch,
  categoriaCatalogo,
  ordenarSubstancias,
} from "./ordenacao.ts";

describe("rank por categoria (ordem travada 1..7)", () => {
  test("antioxidante -> 1", () => assert.equal(rankCategoria("ANTIOXIDANTE"), 1));
  test("vitamina -> 2", () => assert.equal(rankCategoria("VITAMINA"), 2));
  test("complexo vit. entra como vitamina -> 2", () => assert.equal(rankCategoria("COMPLEXO VIT."), 2));
  test("hormonio -> 3", () => assert.equal(rankCategoria("HORMONIO"), 3));
  test("esteroide -> 4", () => assert.equal(rankCategoria("ESTEROIDE"), 4));
  test("peptideo -> 5", () => assert.equal(rankCategoria("PEPTIDEO"), 5));
  test("mineral -> 6", () => assert.equal(rankCategoria("MINERAL"), 6));
  test("fitoterapico cai em demais -> 7", () => assert.equal(rankCategoria("FITOTERAPICO"), 7));
  test("vazio cai em demais -> 7", () => assert.equal(rankCategoria(""), 7));
  test("consulta cai em demais -> 7", () => assert.equal(rankCategoria("CONSULTA"), 7));
  test("acento/caixa nao quebram (antioxidante minusculo)", () => assert.equal(rankCategoria("antioxidante"), 1));
});

describe("ordenacao completa", () => {
  test("respeita a ordem travada por categoria", () => {
    const entrada = [
      { nome: "MINERAL X", categoria: "MINERAL" },
      { nome: "HORM Y", categoria: "HORMONIO" },
      { nome: "ANTIOX Z", categoria: "ANTIOXIDANTE" },
      { nome: "VIT W", categoria: "VITAMINA" },
    ];
    const saida = ordenarSubstancias(entrada).map((s) => s.nome);
    assert.deepEqual(saida, ["ANTIOX Z", "VIT W", "HORM Y", "MINERAL X"]);
  });
  test("estabilidade: mesmo grupo mantem ordem de entrada", () => {
    const pares = [
      { nome: "PEPT A", categoria: "PEPTIDEO" },
      { nome: "PEPT B", categoria: "PEPTIDEO" },
    ];
    assert.deepEqual(ordenarSubstancias(pares).map((s) => s.nome), ["PEPT A", "PEPT B"]);
  });
  test("array vazio volta vazio", () => assert.equal(ordenarSubstancias([]).length, 0));
  test("null volta array vazio", () => assert.equal(ordenarSubstancias(null).length, 0));
});

describe("categoria resolvida pelo catalogo (quando a substancia nao traz)", () => {
  const catalogo: SubstanciaCatalogoCategoria[] = [
    { nome: "COENZIMA Q10", categoria: "ANTIOXIDANTE" },
    { nome: "VITAMINA D3", categoria: "VITAMINA" },
    { nome: "TESTOSTERONA BIO", categoria: "HORMONIO" },
    { nome: "MAGNESIO", categoria: "MINERAL" },
  ];
  test("normaliza nome pra casar (acento/caixa/espaco)", () => {
    assert.equal(normalizarNomeParaMatch("  Coenzima   Q10  "), "COENZIMA Q10");
  });
  test("nome do catalogo contido no nome livre", () => {
    assert.equal(categoriaCatalogo("Coenzima Q10 100mg", catalogo), "ANTIOXIDANTE");
  });
  test("nome livre contido no nome do catalogo (reverso)", () => {
    assert.equal(categoriaCatalogo("Magnesio", catalogo), "MINERAL");
  });
  test("sem correspondencia -> vazio (cai em demais no rank)", () => {
    assert.equal(categoriaCatalogo("Substancia Inexistente", catalogo), "");
  });
  test("ordena usando o catalogo quando a substancia nao traz categoria", () => {
    const subs = [
      { nome: "Magnesio 500mg" },
      { nome: "Coenzima Q10 100mg" },
      { nome: "Vitamina D3 600.000ui" },
    ];
    const saida = ordenarSubstancias(subs, catalogo).map((s) => s.nome);
    assert.deepEqual(saida, ["Coenzima Q10 100mg", "Vitamina D3 600.000ui", "Magnesio 500mg"]);
  });
  test("categoria explicita vence o catalogo", () => {
    const subs = [{ nome: "Coenzima Q10 100mg", categoria: "PEPTIDEO" }];
    const saida = ordenarSubstancias(subs, catalogo);
    assert.equal(rankCategoria(saida[0].categoria), 5);
  });
});
