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

  it("codigo nulo/desconhecido nunca casa (sem ectoplasma)", () => {
    assert.equal(termoCasaMedicamento(null, b12IM), false);
    assert.equal(termoCasaMedicamento("CEIN", b12IM), false);
    assert.equal(termoCasaMedicamento("CETE", glutationaEV), false);
  });
});
