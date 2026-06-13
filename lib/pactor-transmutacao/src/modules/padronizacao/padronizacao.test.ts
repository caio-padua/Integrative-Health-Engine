import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  type ItemCatalogo,
  type Apelido,
  acharPorCanonico,
  extrairDoseLivre,
  indexarApelidos,
  montarNomeCanonico,
  padronizarDosagem,
  padronizarNomeSubstancia,
  planejarVarredura,
  resolverSubstanciaCanonica,
} from "./padronizacao.ts";

const catalogo: ItemCatalogo[] = [
  { nome: "COENZIMA Q10", dosagem: "100MG" },
  { nome: "VITAMINA B12", dosagem: "2500MCG" },
  { nome: "VITAMINA D3", dosagem: "600.000 UI" },
  { nome: "TIRZEPATIDA", dosagem: "2,5MG" },
  { nome: "TIRZEPATIDA", dosagem: "5MG" },
  { nome: "TIRZEPATIDA", dosagem: "10MG" },
  { nome: "TESTOSTERONA BIO", dosagem: "25MG" },
  { nome: "TESTOSTERONA BIO", dosagem: "200MG" },
  { nome: "TESTOSTERONA BIO", dosagem: "1000MG" },
  { nome: "ET-7 ENANTATO", dosagem: "250MG" },
  { nome: "NAC N-ACETIL CISTEINA", dosagem: "300MG" },
  { nome: "VITAMINA C", dosagem: "10G" },
  { nome: "COMPLEXO B", dosagem: "INJETAVEL" },
  { nome: "TESAMORELIN", dosagem: "10MG" },
  { nome: "GHK-Cu", dosagem: "100MG" },
  { nome: "MOTS-C", dosagem: "10MG" },
  { nome: "CJC 1296 + Ipamorelin", dosagem: "5/5MG" },
];

const apelidos: Apelido[] = [
  { de: "Vitamina D injetavel", para: "Vitamina D3 600.000ui", status: "ATIVO" },
  { de: "VITAMINA B12 2500MG", para: "Vitamina B12 2500mcg", status: "ATIVO" },
  { de: "Testosterona bioidentica", para: "", status: "REVISAR_DOSE" },
  { de: "Tirzepatida", para: "", status: "REVISAR_DOSE" },
  { de: "Peptideo X (emagrecimento)", para: "Tesamorelin 10mg", status: "ATIVO" },
];

describe("nome canonico (formato Coenzima Q10 100mg)", () => {
  test("exemplo do CEO", () => {
    assert.equal(montarNomeCanonico("COENZIMA Q10", "100MG"), "Coenzima Q10 100mg");
  });
  test("codigo com digito fica caixa alta", () => {
    assert.equal(padronizarNomeSubstancia("VITAMINA D3"), "Vitamina D3");
  });
  test("codigo ET-7 preserva", () => {
    assert.equal(padronizarNomeSubstancia("ET-7 ENANTATO"), "ET-7 Enantato");
  });
  test("sigla NAC + hifen", () => {
    assert.equal(padronizarNomeSubstancia("NAC N-ACETIL CISTEINA"), "NAC N-Acetil Cisteina");
  });
  test("letra unica caixa alta", () => {
    assert.equal(padronizarNomeSubstancia("VITAMINA C"), "Vitamina C");
  });
  test("Complexo B", () => {
    assert.equal(padronizarNomeSubstancia("COMPLEXO B"), "Complexo B");
  });
  test("NAD+ preserva sinal", () => {
    assert.equal(padronizarNomeSubstancia("NAD+"), "NAD+");
  });
  test("remove acentos", () => {
    assert.equal(padronizarNomeSubstancia("Acido Alfa Lipoico"), "Acido Alfa Lipoico");
  });
});

describe("peptideos (siglas oficiais + combos + hifen)", () => {
  test("AOD 9604", () => {
    assert.equal(montarNomeCanonico("AOD 9604", "10MG"), "AOD 9604 10mg");
  });
  test("Ipamorelin", () => {
    assert.equal(montarNomeCanonico("Ipamorelin", "5MG"), "Ipamorelin 5mg");
  });
  test("PT 141", () => {
    assert.equal(montarNomeCanonico("PT 141", "10MG"), "PT 141 10mg");
  });
  test("CJC 1296 + Ipamorelin combo", () => {
    assert.equal(montarNomeCanonico("CJC 1296 + Ipamorelin", "5/5MG"), "CJC 1296 + Ipamorelin 5/5mg");
  });
  test("GLOW combo dose tripla", () => {
    assert.equal(montarNomeCanonico("GLOW", "10/10/5MG"), "GLOW 10/10/5mg");
  });
  test("GHK-Cu (Cu cobre fica misto)", () => {
    assert.equal(montarNomeCanonico("GHK-Cu", "100MG"), "GHK-Cu 100mg");
  });
  test("Selank", () => {
    assert.equal(montarNomeCanonico("Selank", "10MG"), "Selank 10mg");
  });
  test("MOTS-C (sigla + letra unica)", () => {
    assert.equal(montarNomeCanonico("MOTS-C", "10MG"), "MOTS-C 10mg");
  });
  test("BPC 157 + TB 500 combo", () => {
    assert.equal(montarNomeCanonico("BPC 157 + TB 500", "10/10MG"), "BPC 157 + TB 500 10/10mg");
  });
  test("GHK-Cu maiusculo ainda fica GHK-Cu", () => {
    assert.equal(padronizarNomeSubstancia("GHK-CU"), "GHK-Cu");
  });
  test("regressao ET-7 com nova logica", () => {
    assert.equal(padronizarNomeSubstancia("ET-7 ENANTATO"), "ET-7 Enantato");
  });
  test("regressao NAC-hifen com nova logica", () => {
    assert.equal(padronizarNomeSubstancia("NAC N-ACETIL CISTEINA"), "NAC N-Acetil Cisteina");
  });
});

describe("dosagem canonica (cola unidade, minuscula)", () => {
  test("100 mg -> 100mg", () => assert.equal(padronizarDosagem("100 mg"), "100mg"));
  test("100MG -> 100mg", () => assert.equal(padronizarDosagem("100MG"), "100mg"));
  test("2,5MG -> 2,5mg", () => assert.equal(padronizarDosagem("2,5MG"), "2,5mg"));
  test("600.000 UI -> 600.000ui", () => assert.equal(padronizarDosagem("600.000 UI"), "600.000ui"));
  test("10G -> 10g", () => assert.equal(padronizarDosagem("10G"), "10g"));
  test("60ML -> 60ml", () => assert.equal(padronizarDosagem("60ML"), "60ml"));
  test("nao-numerica vira minuscula", () => assert.equal(padronizarDosagem("INJETAVEL"), "injetavel"));
  test("unidade nao reconhecida NAO cola (1 ampola)", () => assert.equal(padronizarDosagem("1 ampola"), "1 ampola"));
  test("unidade nao reconhecida NAO cola (60 min)", () => assert.equal(padronizarDosagem("60 min"), "60 min"));
  test("decimal ponto 2.5 mg -> 2.5mg", () => assert.equal(padronizarDosagem("2.5 mg"), "2.5mg"));
});

describe("casamento contra o catalogo (CADASTRO = fonte da verdade)", () => {
  test("Coenzima Q10 injetavel -> canonico", () => {
    assert.equal(resolverSubstanciaCanonica("Coenzima Q10 injetavel", catalogo)?.canonico, "Coenzima Q10 100mg");
  });
  test("Vitamina B12 metilcobalamina -> canonico", () => {
    assert.equal(resolverSubstanciaCanonica("Vitamina B12 metilcobalamina", catalogo)?.canonico, "Vitamina B12 2500mcg");
  });
  test("VITAMINA B12 2500MG (mg!=mcg) NAO auto-coage -> null", () => {
    assert.equal(resolverSubstanciaCanonica("VITAMINA B12 2500MG", catalogo), null);
  });
  test("COENZIMA Q10 100MG dose bate -> casa", () => {
    assert.equal(resolverSubstanciaCanonica("COENZIMA Q10 100MG", catalogo)?.canonico, "Coenzima Q10 100mg");
  });
  test("Coenzima Q10 50mg (dose divergente, candidato unico) -> null", () => {
    assert.equal(resolverSubstanciaCanonica("Coenzima Q10 50mg", catalogo), null);
  });
  test("Vitamina D injetavel SEM correspondencia (nao casa D3)", () => {
    assert.equal(resolverSubstanciaCanonica("Vitamina D injetavel", catalogo), null);
  });
  test("Testosterona bioidentica SEM correspondencia (nao e BIO+espaco)", () => {
    assert.equal(resolverSubstanciaCanonica("Testosterona bioidentica", catalogo), null);
  });
  test("prefixo mais longo vence", () => {
    assert.equal(resolverSubstanciaCanonica("ET-7 Enantato 250 alguma coisa", catalogo)?.canonico, "ET-7 Enantato 250mg");
  });
});

describe("desambiguacao por dose (multiplas dosagens do mesmo nome)", () => {
  test("extrai dose do texto livre", () => assert.equal(extrairDoseLivre("TESTOSTERONA BIO 200MG"), "200mg"));
  test("extrai 600K nao casa unidade -> vazio", () => assert.equal(extrairDoseLivre("VITAMINA D3 600K"), ""));
  test("Testosterona Bio 200MG -> 200mg (nao 25)", () => {
    assert.equal(resolverSubstanciaCanonica("TESTOSTERONA BIO 200MG", catalogo)?.canonico, "Testosterona Bio 200mg");
  });
  test("Testosterona Bio 25MG -> 25mg", () => {
    assert.equal(resolverSubstanciaCanonica("TESTOSTERONA BIO 25MG", catalogo)?.canonico, "Testosterona Bio 25mg");
  });
  test("Tirzepatida 5MG -> 5mg (nao 2,5)", () => {
    assert.equal(resolverSubstanciaCanonica("TIRZEPATIDA 5MG", catalogo)?.canonico, "Tirzepatida 5mg");
  });
  test("Tirzepatida 2,5MG -> 2,5mg", () => {
    assert.equal(resolverSubstanciaCanonica("TIRZEPATIDA 2,5MG", catalogo)?.canonico, "Tirzepatida 2,5mg");
  });
  test("Tirzepatida SEM dose = ambiguo -> null", () => {
    assert.equal(resolverSubstanciaCanonica("Tirzepatida", catalogo), null);
  });
  test("Testosterona Bio 999MG = dose inexistente -> null", () => {
    assert.equal(resolverSubstanciaCanonica("TESTOSTERONA BIO 999MG", catalogo), null);
  });
});

describe("APELIDOS (fenotipo -> genotipo, decidido pelo CEO)", () => {
  test("apelido ATIVO: D injetavel -> D3 600.000ui", () => {
    assert.equal(resolverSubstanciaCanonica("Vitamina D injetavel", catalogo, apelidos)?.canonico, "Vitamina D3 600.000ui");
  });
  test("apelido marca via=APELIDO", () => {
    assert.equal(resolverSubstanciaCanonica("Vitamina D injetavel", catalogo, apelidos)?.via, "APELIDO");
  });
  test("apelido ATIVO: B12 2500mg(typo) -> 2500mcg", () => {
    assert.equal(resolverSubstanciaCanonica("VITAMINA B12 2500MG", catalogo, apelidos)?.canonico, "Vitamina B12 2500mcg");
  });
  test("apelido casa com acento+caixa diferente", () => {
    assert.equal(resolverSubstanciaCanonica("VITAMINA D INJETÁVEL", catalogo, apelidos)?.canonico, "Vitamina D3 600.000ui");
  });
  test("REVISAR_DOSE Testosterona -> null (intencional)", () => {
    assert.equal(resolverSubstanciaCanonica("Testosterona bioidentica", catalogo, apelidos), null);
  });
  test("REVISAR_DOSE Tirzepatida -> null (intencional)", () => {
    assert.equal(resolverSubstanciaCanonica("Tirzepatida", catalogo, apelidos), null);
  });
  test("Peptideo X -> Tesamorelin 10mg (CEO decidiu)", () => {
    assert.equal(resolverSubstanciaCanonica("Peptideo X (emagrecimento)", catalogo, apelidos)?.canonico, "Tesamorelin 10mg");
  });
  test("apelido para inexistente -> null (fail-closed)", () => {
    assert.equal(
      resolverSubstanciaCanonica("Algo Estranho", catalogo, [{ de: "Algo Estranho", para: "Coenzima Q10 999mg", status: "ATIVO" }]),
      null,
    );
  });
  test("apelido vence catalogo", () => {
    assert.equal(
      resolverSubstanciaCanonica("Coenzima Q10 injetavel", catalogo, [{ de: "Coenzima Q10 injetavel", para: "Vitamina C 10g", status: "ATIVO" }])?.canonico,
      "Vitamina C 10g",
    );
  });
  test("sem apelido aplicavel -> catalogo (via=CATALOGO)", () => {
    assert.equal(resolverSubstanciaCanonica("Coenzima Q10 injetavel", catalogo, apelidos)?.via, "CATALOGO");
  });
  test("retrocompat sem 3o arg", () => {
    assert.equal(resolverSubstanciaCanonica("COENZIMA Q10 100MG", catalogo)?.canonico, "Coenzima Q10 100mg");
  });
  test("indexarApelidos status default ATIVO", () => {
    assert.equal(indexarApelidos([{ de: "X", para: "Y" }]).X.status, "ATIVO");
  });
  test("indexarApelidos status ' ativo ' -> ATIVO", () => {
    assert.equal(indexarApelidos([{ de: "X", para: "Y", status: " ativo " }]).X.status, "ATIVO");
  });
  test("apelido ' ativo ' (minusculo+espaco) resolve", () => {
    assert.equal(
      resolverSubstanciaCanonica("Vitamina D injetavel", catalogo, [{ de: "Vitamina D injetavel", para: "Vitamina D3 600.000ui", status: " ativo " }])?.canonico,
      "Vitamina D3 600.000ui",
    );
  });
  test("status 'revisar_dose' minusculo -> orfao null", () => {
    assert.equal(
      resolverSubstanciaCanonica("Tirzepatida", catalogo, [{ de: "Tirzepatida", para: "", status: "revisar_dose" }]),
      null,
    );
  });
  test("acharPorCanonico tolera caixa/espaco", () => {
    assert.notEqual(acharPorCanonico("vitamina b12 2500MCG", catalogo), null);
  });
  test("acharPorCanonico inexistente -> null", () => {
    assert.equal(acharPorCanonico("Coenzima Q10 7mg", catalogo), null);
  });
});

describe("planejar varredura (diff + fail-closed)", () => {
  const plano = planejarVarredura(
    [
      { aba: "ORCAMENTO", linha: 8, texto: "Coenzima Q10 injetavel" },
      { aba: "FINANCEIRO", linha: 2, texto: "COENZIMA Q10 100MG" },
      { aba: "ORCAMENTO", linha: 9, texto: "Vitamina D injetavel" },
    ],
    catalogo,
  );
  test("linha 1 OK + mudou", () => {
    assert.deepEqual(
      { s: plano[0].status, p: plano[0].para, m: plano[0].mudou },
      { s: "OK", p: "Coenzima Q10 100mg", m: true },
    );
  });
  test("linha 2 padroniza grafia", () => {
    assert.deepEqual({ s: plano[1].status, p: plano[1].para }, { s: "OK", p: "Coenzima Q10 100mg" });
  });
  test("linha 3 fica intacta + flag", () => {
    assert.deepEqual({ s: plano[2].status, p: plano[2].para }, { s: "SEM_CORRESPONDENCIA", p: "Vitamina D injetavel" });
  });
});
