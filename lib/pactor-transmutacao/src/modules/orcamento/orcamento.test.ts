import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  type ItemCatalogoPreco,
  arredondar2,
  calcularSubtotalItem,
  calcularTotalOrcamento,
  aplicarDesconto,
  economiaDesconto,
  cenarioAVista,
  cenarioEntrada,
  parcelaComTaxa,
  receitaMensal,
  mesesPrograma,
  chaveSubstancia,
  precoPorFaixaMeses,
  montarItensOrcamento,
  montarLancamentoFinanceiro,
} from "./orcamento.ts";

const luciano = [
  { nome: "Testosterona bioidentica", sessoes: 12, valorUnit: 150, freqDias: 7, incluir: true },
  { nome: "Tesamorelin", sessoes: 60, valorUnit: 120, freqDias: 1, incluir: true },
  { nome: "Tirzepatida", sessoes: 12, valorUnit: 450, freqDias: 7, incluir: true },
  { nome: "Coenzima Q10 injetavel", sessoes: 12, valorUnit: 90, freqDias: 7, incluir: true },
  { nome: "Vitamina D injetavel", sessoes: 6, valorUnit: 80, freqDias: 15, incluir: true },
  { nome: "Vitamina B12", sessoes: 6, valorUnit: 80, freqDias: 15, incluir: false },
  { nome: "Dieta personalizada", sessoes: 1, valorUnit: 500, freqDias: 90, incluir: false },
];

describe("arredondamento (centavos)", () => {
  test("arredonda 2 casas", () => assert.equal(arredondar2(3537.7999999), 3537.8));
  test("arredonda meio centavo", () => assert.equal(arredondar2(10.005), 10.01));
});

describe("subtotal de item", () => {
  test("subtotal incluido", () => assert.equal(calcularSubtotalItem(12, 150, true), 1800));
  test("subtotal NAO incluido = 0", () => assert.equal(calcularSubtotalItem(12, 150, false), 0));
  test("subtotal sessoes negativas = 0", () => assert.equal(calcularSubtotalItem(-5, 150, true), 0));
  test("subtotal valor negativo = 0", () => assert.equal(calcularSubtotalItem(12, -150, true), 0));
  test("subtotal string numerica", () => assert.equal(calcularSubtotalItem("6", "80", true), 480));
});

describe("total do orcamento (so itens incluidos)", () => {
  test("total Luciano = 15960", () => assert.equal(calcularTotalOrcamento(luciano), 15960));
  test("total vazio = 0", () => assert.equal(calcularTotalOrcamento([]), 0));
});

describe("descontos", () => {
  test("a vista 15% (15960 -> 13566)", () => assert.equal(aplicarDesconto(15960, 15), 13566));
  test("economia a vista (2394)", () => assert.equal(economiaDesconto(15960, 15), 2394));
  test("desconto clampa >100 -> 0", () => assert.equal(aplicarDesconto(100, 250), 0));
  test("desconto clampa <0 -> total", () => assert.equal(aplicarDesconto(100, -5), 100));
});

describe("cenario A (a vista)", () => {
  test("cenario A Luciano", () => assert.deepEqual(cenarioAVista(15960, 15), { valor: 13566, economia: 2394 }));
});

describe("cenario B (entrada 50% / 10% desc)", () => {
  test("cenario B Luciano", () => {
    assert.deepEqual(cenarioEntrada(15960, 10, 50, [1, 2, 3]), {
      valorComDesconto: 14364,
      economia: 1596,
      entrada: 7182,
      saldo: 7182,
      parcelas: { 1: 7182, 2: 3591, 3: 2394 },
    });
  });
});

describe("cenario C (entrada 30% / 5% desc)", () => {
  test("cenario C Luciano", () => {
    assert.deepEqual(cenarioEntrada(15960, 5, 30, [1, 2, 3]), {
      valorComDesconto: 15162,
      economia: 798,
      entrada: 4548.6,
      saldo: 10613.4,
      parcelas: { 1: 10613.4, 2: 5306.7, 3: 3537.8 },
    });
  });
});

describe("cenario entrada — extremos (clamp 0..100)", () => {
  const entAlta = cenarioEntrada(15960, 10, 150, [1, 2, 3]);
  test("entrada >100% clampa em 100% (saldo 0)", () => {
    assert.ok(entAlta.saldo === 0 && entAlta.entrada === 14364);
  });
  test("entrada >100% nunca gera parcela negativa", () => {
    assert.ok(entAlta.parcelas[2] === 0 && entAlta.parcelas[3] === 0);
  });
  const entNeg = cenarioEntrada(15960, 10, -10, [1, 2]);
  test("entrada <0 clampa em 0 (saldo = valor cheio com desc)", () => {
    assert.ok(entNeg.entrada === 0 && entNeg.saldo === 14364);
  });
});

describe("calculadora livre (taxa de cartao sobre total cheio)", () => {
  test("entrada livre 20% = 3192", () => assert.equal(arredondar2(15960 * 0.2), 3192));
  test("saldo livre 12768 em 2x @5.59%", () => {
    assert.deepEqual(parcelaComTaxa(12768, 2, 5.59), { totalComTaxa: 13481.73, valorParcela: 6740.87 });
  });
  test("saldo sem taxa em 3x", () => {
    assert.deepEqual(parcelaComTaxa(9000, 3, 0), { totalComTaxa: 9000, valorParcela: 3000 });
  });
});

describe("receita mensal por forma de pagamento", () => {
  test("avista recebe tudo no mes 1", () => assert.equal(receitaMensal(13566, "avista", 1, 0), 13566));
  test("parcelado 3x", () => assert.equal(receitaMensal(19490, "parcelado", 3, 0), 6496.67));
  test("entrada: saldo/parcelas por mes", () => assert.equal(receitaMensal(14364, "entrada", 2, 7182), 3591));
});

describe("meses do programa (item mais longo)", () => {
  test("Luciano = 3 meses (item mais longo ~77 dias)", () => assert.equal(mesesPrograma(luciano), 3));
  test("vazio = 1 mes", () => assert.equal(mesesPrograma([]), 1));
});

describe("faixa de preco por meses (CADASTRO SUBSTANCIAS)", () => {
  const precoQ10 = { unit: 85, p3m: 75, p6m: 65, p12m: 55 };
  test("1 mes -> UNIT 85", () => assert.equal(precoPorFaixaMeses(precoQ10, 1), 85));
  test("3 meses -> 3M 75", () => assert.equal(precoPorFaixaMeses(precoQ10, 3), 75));
  test("6 meses -> 6M 65", () => assert.equal(precoPorFaixaMeses(precoQ10, 6), 65));
  test("12 meses -> 12M 55", () => assert.equal(precoPorFaixaMeses(precoQ10, 12), 55));
});

describe("chave de substancia (casamento com catalogo)", () => {
  test("chave normaliza caixa/espacos", () => assert.equal(chaveSubstancia(" Coenzima  Q10 ", "mg"), "COENZIMA Q10|MG"));
});

describe("montar itens a partir do catalogo", () => {
  const catalogo: ItemCatalogoPreco[] = [
    { nome: "COENZIMA Q10", dosagem: "100MG", via: "IM", freqDias: 15, sessoes: 6, unit: 85, p3m: 75, p6m: 65, p12m: 55 },
    { nome: "PQQ", dosagem: "20MG", via: "IM", freqDias: 15, sessoes: 4, unit: 120, p3m: 105, p6m: 90, p12m: 80 },
  ];
  const itens = montarItensOrcamento(
    [{ nome: "COENZIMA Q10", dosagem: "100MG" }, { nome: "PQQ", dosagem: "20MG", incluir: false }],
    catalogo,
    6,
  );
  test("puxou 2 itens", () => assert.equal(itens.length, 2));
  test("Q10 pegou via/freq/sessoes do catalogo", () => {
    assert.ok(itens[0].via === "IM" && itens[0].freqDias === 15 && itens[0].sessoes === 6);
  });
  test("Q10 preco faixa 6M = 65", () => assert.equal(itens[0].valorUnit, 65));
  test("Q10 subtotal = 6*65 = 390", () => assert.equal(itens[0].subtotal, 390));
  test("PQQ excluido => subtotal 0", () => assert.equal(itens[1].subtotal, 0));
  test("total dos itens montados", () => assert.equal(calcularTotalOrcamento(itens), 390));
});

describe("lancamento no FINANCEIRO (acoplamento)", () => {
  test("lancamento a vista", () => {
    assert.deepEqual(montarLancamentoFinanceiro("LUCIANO PERCINOTO", 13566, "avista", 1, 0), {
      paciente: "LUCIANO PERCINOTO",
      valorTratamento: 13566,
      formaPagamento: "avista",
      valorEntrada: 0,
      parcelas: 1,
      valorParcela: 0,
      receitaMensal: 13566,
      valorPago: 0,
      valorPendente: 13566,
    });
  });
  test("lancamento entrada 50% + 2x", () => {
    assert.deepEqual(montarLancamentoFinanceiro("LUCIANO PERCINOTO", 14364, "entrada", 2, 7182), {
      paciente: "LUCIANO PERCINOTO",
      valorTratamento: 14364,
      formaPagamento: "entrada",
      valorEntrada: 7182,
      parcelas: 2,
      valorParcela: 3591,
      receitaMensal: 3591,
      valorPago: 0,
      valorPendente: 14364,
    });
  });
  test("entrada nunca maior que o valor (clamp)", () => {
    assert.equal(montarLancamentoFinanceiro("X", 1000, "entrada", 2, 5000).valorEntrada, 1000);
  });
});
