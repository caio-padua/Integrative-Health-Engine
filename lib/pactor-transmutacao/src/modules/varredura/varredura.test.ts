import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { type ItemCatalogo, type Apelido } from "../padronizacao/padronizacao.ts";
import {
  type OcorrenciaVarredura,
  colunaLetraParaIndice,
  montarReplicaSubstancias,
  montarVarreduraPreview,
} from "./varredura.ts";

const catalogo: ItemCatalogo[] = [
  { nome: "COENZIMA Q10", dosagem: "100MG" },
  { nome: "PQQ", dosagem: "20MG" },
  { nome: "VITAMINA D3", dosagem: "600.000 UI" },
  { nome: "VITAMINA B12", dosagem: "2500MCG" },
  { nome: "VITAMINA ADEK", dosagem: "600.000 UI" },
  { nome: "NAC N-ACETIL CISTEINA", dosagem: "300MG" },
  { nome: "VITAMINA C", dosagem: "10G" },
  { nome: "TIRZEPATIDA", dosagem: "2,5MG" },
  { nome: "TIRZEPATIDA", dosagem: "5MG" },
  { nome: "TIRZEPATIDA", dosagem: "10MG" },
  { nome: "HCG", dosagem: "500 UI" },
  { nome: "HCG", dosagem: "5000 UI" },
  { nome: "TESAMORELIN", dosagem: "10MG" },
  { nome: "TESTOSTERONA BIO", dosagem: "25MG" },
  { nome: "TESTOSTERONA BIO", dosagem: "200MG" },
  { nome: "TESTOSTERONA BIO", dosagem: "1000MG" },
  { nome: "ET-7 ENANTATO", dosagem: "250MG" },
  { nome: "DN-7 DROSTANOLONA", dosagem: "100MG" },
];

const apelidos: Apelido[] = [
  { de: "Vitamina D injetavel", para: "Vitamina D3 600.000ui", status: "ATIVO" },
  { de: "VITAMINA B12 2500MG", para: "Vitamina B12 2500mcg", status: "ATIVO" },
  { de: "Testosterona bioidentica", para: "", status: "REVISAR_DOSE" },
  { de: "Tirzepatida", para: "", status: "REVISAR_DOSE" },
  { de: "Peptideo X (emagrecimento)", para: "Tesamorelin 10mg", status: "ATIVO" },
];

const ocorrencias: OcorrenciaVarredura[] = [
  { aba: "ORCAMENTO/TABELA", linha: 5, texto: "Testosterona bioidentica", col: 2 },
  { aba: "ORCAMENTO/TABELA", linha: 6, texto: "Tesamorelin (peptideo)", col: 2 },
  { aba: "ORCAMENTO/TABELA", linha: 7, texto: "Tirzepatida", col: 2 },
  { aba: "ORCAMENTO/TABELA", linha: 8, texto: "Coenzima Q10 injetavel", col: 2 },
  { aba: "ORCAMENTO/TABELA", linha: 9, texto: "Vitamina D injetavel", col: 2 },
  { aba: "ORCAMENTO/TABELA", linha: 10, texto: "Vitamina B12 metilcobalamina", col: 2 },
  { aba: "TABELA(Edneia)", linha: 6, texto: "Peptideo X (emagrecimento)", col: 1 },
  { aba: "FINANCEIRO K", linha: 2, texto: "VITAMINA B12 2500MG", col: 1 },
  { aba: "FINANCEIRO K", linha: 3, texto: "VITAMINA D3 600K", col: 1 },
  { aba: "FINANCEIRO K", linha: 4, texto: "COENZIMA Q10 100MG", col: 1 },
  { aba: "FINANCEIRO K", linha: 5, texto: "PQQ 20MG", col: 1 },
  { aba: "FINANCEIRO K", linha: 6, texto: "TESTOSTERONA BIO 200MG", col: 1 },
  { aba: "FINANCEIRO K", linha: 7, texto: "TESTOSTERONA BIO 25MG", col: 1 },
  { aba: "FINANCEIRO K", linha: 8, texto: "TIRZEPATIDA 5MG", col: 1 },
  { aba: "FINANCEIRO K", linha: 11, texto: "DN-7 DROSTANOLONA 100MG", col: 1 },
  { aba: "FINANCEIRO K", linha: 12, texto: "VITAMINA ADEK 600K", col: 1 },
  { aba: "FINANCEIRO K", linha: 13, texto: "ET-7 ENANTATO 250MG", col: 1 },
];

describe("colunaLetraParaIndice (A=1, AA=27)", () => {
  test("A -> 1", () => assert.equal(colunaLetraParaIndice("A"), 1));
  test("B -> 2", () => assert.equal(colunaLetraParaIndice("B"), 2));
  test("Z -> 26", () => assert.equal(colunaLetraParaIndice("Z"), 26));
  test("AA -> 27", () => assert.equal(colunaLetraParaIndice("AA"), 27));
  test("AB -> 28", () => assert.equal(colunaLetraParaIndice("AB"), 28));
  test("minuscula b -> 2", () => assert.equal(colunaLetraParaIndice("b"), 2));
  test("lixo nao-letra -> 0", () => assert.equal(colunaLetraParaIndice("3$"), 0));
  test("vazio -> 0", () => assert.equal(colunaLetraParaIndice(""), 0));
});

describe("replica do cadastro (espelho legivel)", () => {
  const replica = montarReplicaSubstancias(catalogo, apelidos);
  test("conta cadastro + apelidos", () => assert.equal(replica.length, catalogo.length + apelidos.length));
  test("primeira linha = canonico do catalogo", () => {
    assert.equal(replica[0].nomeCanonico, "Coenzima Q10 100mg");
  });
  test("apelido ATIVO mostra o para", () => {
    const ap = replica.find((r) => r.nomeCadastro === "Vitamina D injetavel");
    assert.equal(ap?.nomeCanonico, "Vitamina D3 600.000ui");
  });
  test("apelido REVISAR_DOSE mostra status entre parenteses", () => {
    const ap = replica.find((r) => r.nomeCadastro === "Tirzepatida");
    assert.equal(ap?.nomeCanonico, "(REVISAR_DOSE)");
  });
});

describe("varredura PREVIEW (dry-run, nada aplicado)", () => {
  const r = montarVarreduraPreview(ocorrencias, catalogo, apelidos, false);
  test("total = 17 ocorrencias", () => assert.equal(r.totalOcorrencias, 17));
  test("2 orfaos (Testosterona bioidentica + Tirzepatida)", () => assert.equal(r.orfaos, 2));
  test("preview nao gera write-back", () => assert.equal(r.writeBacks.length, 0));
  test("preview marca aplicado=PREVIEW", () => {
    assert.ok(r.linhas.every((l) => l.aplicado === "PREVIEW"));
  });
  test("os 2 orfaos sao exatamente os REVISAR_DOSE", () => {
    const semCorr = r.linhas.filter((l) => l.status === "SEM_CORRESPONDENCIA").map((l) => l.de);
    assert.deepEqual(semCorr.sort(), ["Testosterona bioidentica", "Tirzepatida"]);
  });
  test("Tesamorelin (peptideo) casa por catalogo", () => {
    assert.equal(r.linhas.find((l) => l.de === "Tesamorelin (peptideo)")?.para, "Tesamorelin 10mg");
  });
  test("apelido Peptideo X -> Tesamorelin 10mg via APELIDO", () => {
    const l = r.linhas.find((x) => x.de === "Peptideo X (emagrecimento)");
    assert.equal(l?.para, "Tesamorelin 10mg");
    assert.equal(l?.via, "APELIDO");
  });
  test("Testosterona Bio 200MG desambigua pela dose", () => {
    assert.equal(r.linhas.find((l) => l.de === "TESTOSTERONA BIO 200MG")?.para, "Testosterona Bio 200mg");
  });
});

describe("varredura APLICAR (fail-closed: so OK que mudou)", () => {
  const r = montarVarreduraPreview(ocorrencias, catalogo, apelidos, true);
  test("15 casadas viram write-back", () => assert.equal(r.aplicadas, 15));
  test("write-backs = aplicadas", () => assert.equal(r.writeBacks.length, 15));
  test("orfaos nunca entram no write-back", () => {
    const abas = r.writeBacks.map((w) => w.valor);
    assert.ok(!abas.includes("Testosterona bioidentica") && !abas.includes("Tirzepatida"));
  });
  test("write-back carrega aba/linha/col/valor", () => {
    const w = r.writeBacks.find((x) => x.aba === "FINANCEIRO K" && x.linha === 4);
    assert.deepEqual(w, { aba: "FINANCEIRO K", linha: 4, col: 1, valor: "Coenzima Q10 100mg" });
  });
});
