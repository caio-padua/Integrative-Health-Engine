import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { codigoEspecificoDoTermo, termoCasaMedicamento } from "./rasxPdf.js";

// ITEM 7 (CEO 17/06/2026): cada termo de consentimento ESPECIFICO so pode listar
// os itens prescritos que casam com a SUA via/tipo. Estes testes blindam o
// classificador contra regressao juridica (associar item ao termo errado).

describe("codigoEspecificoDoTermo · extrai codigo do titulo", () => {
  const mk = (titulo: string): any => ({ titulo });

  it("acha (CFOR) no titulo de formula manipulada", () => {
    assert.equal(codigoEspecificoDoTermo(mk("Consentimento Especifico — Formulas Manipuladas (CFOR)")), "CFOR");
  });

  it("acha (CIMU) na via intramuscular", () => {
    assert.equal(codigoEspecificoDoTermo(mk("Aplicacao de Injetaveis por Via Intramuscular (CIMU)")), "CIMU");
  });

  it("acha (CEND) na via endovenosa", () => {
    assert.equal(codigoEspecificoDoTermo(mk("Substancias por Via Endovenosa (CEND)")), "CEND");
  });

  it("acha (CIMP) no implante", () => {
    assert.equal(codigoEspecificoDoTermo(mk("Implantes Subcutaneos Hormonais e Pellets (CIMP)")), "CIMP");
  });

  it("acha (CSUB) no termo de peptideos/GLP-1/GH", () => {
    assert.equal(codigoEspecificoDoTermo(mk("Consentimento Especifico — Peptideos, Agonistas de GLP-1 e Hormonio do Crescimento (CSUB)")), "CSUB");
  });

  it("acha (CINC) no termo de incretinas/GLP-1 (split 18/06/2026)", () => {
    assert.equal(codigoEspecificoDoTermo(mk("Consentimento Especifico Informado — Analogos de Incretinas e Agonistas de GLP-1 (CINC)")), "CINC");
  });

  it("acha (CPEP) no termo de peptideos/secretagogos/moleculas metabolicas", () => {
    assert.equal(codigoEspecificoDoTermo(mk("Consentimento Especifico Informado — Peptideos, Secretagogos de Hormonio do Crescimento e Moleculas Metabolicas (CPEP)")), "CPEP");
  });

  it("acha (CLIP) no termo de agentes lipoliticos", () => {
    assert.equal(codigoEspecificoDoTermo(mk("Consentimento Especifico Informado — Agentes Lipoliticos Injetaveis Subcutaneos (CLIP)")), "CLIP");
  });

  it("retorna null em termo SEM codigo (LGPD, TCLE global)", () => {
    assert.equal(codigoEspecificoDoTermo(mk("Consentimento Livre para Tratamento de Dados Pessoais (LGPD)")), null);
    assert.equal(codigoEspecificoDoTermo(mk("TCLE Global do Protocolo Terapeutico Integrado")), null);
  });
});

describe("termoCasaMedicamento · casa item prescrito ao termo certo", () => {
  const formulaOral = { via: "Oral", tipo: "formula", forma: "Capsula" };
  const b12IM = { via: "Intramuscular profunda (deltoide ou gluteo)", tipo: "remedio", forma: "Solucao injetavel" };
  const glutationaEV = { via: "Endovenosa lenta (2-4h)", tipo: "remedio", forma: "Solucao para infusao" };
  const gestrinonaImplante = { via: "Subcutanea (implante/pellet)", tipo: "remedio", forma: "Pellet/implante subcutaneo" };
  // legados REVO antigo: tipo preenchido, via vazia
  const vitCLegado = { via: null, tipo: "endovenoso", forma: null };
  const testoImplanteLegado = { via: null, tipo: "implante", forma: null };
  // injetavel subcutaneo PURO (NAO e implante) — nao deve cair em CIMP
  const scPuro = { via: "Subcutanea", tipo: "remedio", forma: "Solucao injetavel" };
  // ITEM CSUB: peptideos / agonistas de GLP-1 / hormonio do crescimento (pelo NOME)
  const semaglutidaSC = { inline: "Semaglutida 2,4mg", via: "Subcutanea", tipo: "remedio", forma: "Solucao injetavel (caneta)" };
  const bpc157 = { inline: "BPC-157 250mcg", via: "Subcutanea", tipo: "remedio", forma: "Solucao injetavel" };
  const ghSomatropina = { inline: "Somatropina (hormonio do crescimento) 4UI", via: "Subcutanea", tipo: "remedio", forma: "Solucao injetavel" };
  const tirzepatidaIM = { inline: "Tirzepatida 5mg", via: "Intramuscular", tipo: "remedio", forma: "Solucao injetavel" };
  // GH lancado pela sigla isolada "GH" (sem "somatropina") — alias minimo critico
  const ghSiglaIsolada = { inline: "GH 4UI", via: "Subcutanea", tipo: "remedio", forma: "Solucao injetavel" };

  it("CFOR casa formula oral e EXCLUI qualquer injetavel", () => {
    assert.equal(termoCasaMedicamento("CFOR", formulaOral), true);
    assert.equal(termoCasaMedicamento("CFOR", b12IM), false);
    assert.equal(termoCasaMedicamento("CFOR", glutationaEV), false);
    assert.equal(termoCasaMedicamento("CFOR", gestrinonaImplante), false);
  });

  it("CIMU casa SO intramuscular", () => {
    assert.equal(termoCasaMedicamento("CIMU", b12IM), true);
    assert.equal(termoCasaMedicamento("CIMU", glutationaEV), false);
    assert.equal(termoCasaMedicamento("CIMU", formulaOral), false);
  });

  it("CEND casa endovenosa por via E por tipo legado", () => {
    assert.equal(termoCasaMedicamento("CEND", glutationaEV), true);
    assert.equal(termoCasaMedicamento("CEND", vitCLegado), true);
    assert.equal(termoCasaMedicamento("CEND", b12IM), false);
  });

  it("CIMP casa implante/pellet (incl. legado) mas NUNCA SC puro", () => {
    assert.equal(termoCasaMedicamento("CIMP", gestrinonaImplante), true);
    assert.equal(termoCasaMedicamento("CIMP", testoImplanteLegado), true);
    assert.equal(termoCasaMedicamento("CIMP", scPuro), false);
    assert.equal(termoCasaMedicamento("CIMP", b12IM), false);
  });

  it("CSUB casa peptideos/GLP-1/GH pelo NOME (semaglutida, BPC-157, somatropina)", () => {
    assert.equal(termoCasaMedicamento("CSUB", semaglutidaSC), true);
    assert.equal(termoCasaMedicamento("CSUB", bpc157), true);
    assert.equal(termoCasaMedicamento("CSUB", ghSomatropina), true);
    assert.equal(termoCasaMedicamento("CSUB", tirzepatidaIM), true);
    assert.equal(termoCasaMedicamento("CSUB", ghSiglaIsolada), true);
    assert.equal(termoCasaMedicamento("CSUB", formulaOral), false);
    assert.equal(termoCasaMedicamento("CSUB", b12IM), false);
  });

  it("peptideo NAO aparece em CFOR/CIMU/CEND/CIMP (so no CSUB, sem dupla listagem)", () => {
    for (const cod of ["CFOR", "CIMU", "CEND", "CIMP"] as const) {
      assert.equal(termoCasaMedicamento(cod, semaglutidaSC), false);
    }
    // tirzepatida via IM: mesmo sendo intramuscular, vai SO pro CSUB, nao pro CIMU
    assert.equal(termoCasaMedicamento("CIMU", tirzepatidaIM), false);
    assert.equal(termoCasaMedicamento("CSUB", tirzepatidaIM), true);
  });

  it("codigo nulo/desconhecido nunca casa (sem ectoplasma)", () => {
    assert.equal(termoCasaMedicamento(null, b12IM), false);
    assert.equal(termoCasaMedicamento("CEIN", b12IM), false);
    assert.equal(termoCasaMedicamento("CETE", glutationaEV), false);
  });
});

// SPLIT CSUB -> CINC / CPEP / CLIP (CEO 18/06/2026): o termo combinado foi
// dividido em tres especificos. Estes testes blindam a classificacao por NOME e
// o portao data-driven (consentimento_sigla cadastrada vence o regex).
describe("termoCasaMedicamento · split CINC/CPEP/CLIP por NOME", () => {
  const tirzepatidaSC = { inline: "Tirzepatida 10mg", via: "Subcutanea", tipo: "remedio", forma: "Solucao injetavel" };
  const retatrutidaSC = { inline: "Retatrutida 40mg", via: "Subcutanea", tipo: "remedio", forma: "Solucao injetavel" };
  const bpc157 = { inline: "BPC-157 250mcg", via: "Subcutanea", tipo: "remedio", forma: "Solucao injetavel" };
  const ipamorelin = { inline: "Ipamorelin", via: "Subcutanea", tipo: "remedio", forma: "Solucao injetavel" };
  const lipoCB = { inline: "Lipo C + Lipo B", via: "Subcutanea", tipo: "remedio", forma: "Solucao injetavel" };

  it("CINC casa SO incretinas/GLP-1 (tirzepatida, retatrutida)", () => {
    assert.equal(termoCasaMedicamento("CINC", tirzepatidaSC), true);
    assert.equal(termoCasaMedicamento("CINC", retatrutidaSC), true);
    assert.equal(termoCasaMedicamento("CINC", bpc157), false);
    assert.equal(termoCasaMedicamento("CINC", lipoCB), false);
  });

  it("CPEP casa peptideos/secretagogos, NUNCA incretina nem lipolitico", () => {
    assert.equal(termoCasaMedicamento("CPEP", bpc157), true);
    assert.equal(termoCasaMedicamento("CPEP", ipamorelin), true);
    assert.equal(termoCasaMedicamento("CPEP", tirzepatidaSC), false);
    assert.equal(termoCasaMedicamento("CPEP", lipoCB), false);
  });

  it("CLIP casa SO agentes lipoliticos (Lipo C + Lipo B)", () => {
    assert.equal(termoCasaMedicamento("CLIP", lipoCB), true);
    assert.equal(termoCasaMedicamento("CLIP", bpc157), false);
    assert.equal(termoCasaMedicamento("CLIP", tirzepatidaSC), false);
  });

  it("especial nao aparece em termo de modalidade (sem dupla listagem)", () => {
    for (const cod of ["CFOR", "CIMU", "CEND", "CIMP"] as const) {
      assert.equal(termoCasaMedicamento(cod, tirzepatidaSC), false);
      assert.equal(termoCasaMedicamento(cod, bpc157), false);
      assert.equal(termoCasaMedicamento(cod, lipoCB), false);
    }
  });

  it("CSUB legado segue agregando incretina + peptideo (compat)", () => {
    assert.equal(termoCasaMedicamento("CSUB", tirzepatidaSC), true);
    assert.equal(termoCasaMedicamento("CSUB", bpc157), true);
    assert.equal(termoCasaMedicamento("CSUB", lipoCB), false);
  });

  it("portao data-driven: consentimento_sigla cadastrada VENCE o regex", () => {
    // substancia cujo NOME o regex nao reconhece (ex.: blend "Glow"), mas que
    // tem consentimento_sigla=CPEP cadastrada -> casa CPEP e exclui modalidade.
    const glow = { inline: "Glow (blend)", via: "Subcutanea", tipo: "remedio", consentimentoSigla: "CPEP" };
    assert.equal(termoCasaMedicamento("CPEP", glow), true);
    assert.equal(termoCasaMedicamento("CINC", glow), false);
    assert.equal(termoCasaMedicamento("CIMU", glow), false);
    assert.equal(termoCasaMedicamento("CSUB", glow), true); // legado agrega CPEP
  });
});
