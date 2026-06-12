/**
 * Orcamento.gs — motor de orcamento do RAS KAIZEN v8 (Dr. Replit, 12/06/2026)
 *
 * Acopla a aba ORCAMENTO ao CADASTRO SUBSTANCIAS (precos/freq/sessoes), ao
 * CADASTRO PACIENTES e ao FINANCEIRO. Este arquivo so tem LOGICA PURA (sem
 * Sheet/UI) pra poder ser testada por node (tests/test_orcamento.mjs) sem drift.
 * A leitura/escrita viva nas abas mora na camada de glue (botoes do Panel),
 * que reusa estas funcoes.
 *
 * Parametros de desconto vem da planilha real do CEO (paciente Luciano):
 *   a vista 15% | entrada 50% com 10% | entrada 30% com 5% | calc livre sobre total cheio.
 */

var ORCAMENTO_CONFIG = {
  descAVistaPct: 15,
  cenarioBEntradaPct: 50,
  cenarioBDescPct: 10,
  cenarioCEntradaPct: 30,
  cenarioCDescPct: 5,
  parcelasPadrao: [1, 2, 3],
  diasPorMes: 30
};

/** Arredonda pra 2 casas (centavos), com epsilon contra ruido binario. */
function arredondar2_(n) {
  return Math.round((Number(n) + 1e-9) * 100) / 100;
}

/** Subtotal de 1 item: so conta se incluir; subtotal = sessoes x valorUnit. */
function calcularSubtotalItem_(sessoes, valorUnit, incluir) {
  if (!incluir) return 0;
  var s = Number(sessoes) || 0;
  var v = Number(valorUnit) || 0;
  if (s < 0) s = 0;
  if (v < 0) v = 0;
  return arredondar2_(s * v);
}

/** Total = soma dos subtotais dos itens incluidos. itens: [{sessoes,valorUnit,incluir}] */
function calcularTotalOrcamento_(itens) {
  var t = 0;
  for (var i = 0; i < (itens || []).length; i++) {
    t += calcularSubtotalItem_(itens[i].sessoes, itens[i].valorUnit, itens[i].incluir);
  }
  return arredondar2_(t);
}

/** Aplica desconto percentual sobre o total (clampa 0..100). */
function aplicarDesconto_(total, descPct) {
  var t = Number(total) || 0;
  var d = Number(descPct) || 0;
  if (d < 0) d = 0;
  if (d > 100) d = 100;
  return arredondar2_(t * (1 - d / 100));
}

/** Quanto o paciente economiza com um desconto. */
function economiaDesconto_(total, descPct) {
  return arredondar2_((Number(total) || 0) - aplicarDesconto_(total, descPct));
}

/** Cenario a vista: {valor, economia}. */
function cenarioAVista_(total, descPct) {
  return {
    valor: aplicarDesconto_(total, descPct),
    economia: economiaDesconto_(total, descPct)
  };
}

/**
 * Cenario com entrada: entradaPct sobre o valor JA com desconto; saldo dividido
 * em N parcelas SEM juros. Retorna {valorComDesconto, economia, entrada, saldo, parcelas:{n:valor}}.
 */
function cenarioEntrada_(total, descPct, entradaPct, listaParcelas) {
  var valor = aplicarDesconto_(total, descPct);
  var ep = Number(entradaPct) || 0;
  if (ep < 0) ep = 0;
  if (ep > 100) ep = 100;
  var ent = arredondar2_(valor * (ep / 100));
  var saldo = arredondar2_(valor - ent);
  var parc = {};
  var lp = listaParcelas || ORCAMENTO_CONFIG.parcelasPadrao;
  for (var i = 0; i < lp.length; i++) {
    var n = Number(lp[i]) || 1;
    if (n < 1) n = 1;
    parc[n] = arredondar2_(saldo / n);
  }
  return {
    valorComDesconto: valor,
    economia: economiaDesconto_(total, descPct),
    entrada: ent,
    saldo: saldo,
    parcelas: parc
  };
}

/** Calculadora livre: saldo no cartao com taxa%, dividido em n. {totalComTaxa, valorParcela}. */
function parcelaComTaxa_(saldo, parcelas, taxaPct) {
  var s = Number(saldo) || 0;
  if (s < 0) s = 0;
  var n = Number(parcelas) || 1;
  if (n < 1) n = 1;
  var taxa = Number(taxaPct) || 0;
  if (taxa < 0) taxa = 0;
  var totalComTaxa = arredondar2_(s * (1 + taxa / 100));
  return { totalComTaxa: totalComTaxa, valorParcela: arredondar2_(totalComTaxa / n) };
}

/**
 * Quanto recebemos por MES conforme a forma de pagamento.
 *   'avista'    -> tudo de uma vez (recebido no mes 1).
 *   'parcelado' -> valor / parcelas por mes.
 *   'entrada'   -> saldo / parcelas por mes (a entrada entra a parte no mes 1).
 */
function receitaMensal_(valor, forma, parcelas, entrada) {
  var v = Number(valor) || 0;
  var n = Number(parcelas) || 1;
  if (n < 1) n = 1;
  if (forma === 'avista') return arredondar2_(v);
  if (forma === 'entrada') {
    var saldo = arredondar2_(v - (Number(entrada) || 0));
    if (saldo < 0) saldo = 0;
    return arredondar2_(saldo / n);
  }
  return arredondar2_(v / n);
}

/** Meses estimados do programa pelo item de maior duracao ((sessoes-1)*freqDias / 30), min 1. */
function mesesPrograma_(itens) {
  var maxDias = 0;
  for (var i = 0; i < (itens || []).length; i++) {
    if (!itens[i].incluir) continue;
    var s = Number(itens[i].sessoes) || 0;
    var f = Number(itens[i].freqDias) || 0;
    var dias = (s > 0 && f > 0) ? (s - 1) * f : 0;
    if (dias > maxDias) maxDias = dias;
  }
  var meses = Math.ceil(maxDias / ORCAMENTO_CONFIG.diasPorMes);
  return meses < 1 ? 1 : meses;
}

/** Chave canonica pra casar substancia do orcamento com o CADASTRO SUBSTANCIAS. */
function chaveSubstancia_(nome, dosagem) {
  return (String(nome || '').trim() + '|' + String(dosagem || '').trim())
    .toUpperCase().replace(/\s+/g, ' ');
}

/** Escolhe o preco unitario pela duracao do programa em meses (12M/6M/3M/UNIT). */
function precoPorFaixaMeses_(precos, meses) {
  var p = precos || {};
  var m = Number(meses) || 0;
  if (m >= 12 && Number(p.p12m)) return Number(p.p12m);
  if (m >= 6 && Number(p.p6m)) return Number(p.p6m);
  if (m >= 3 && Number(p.p3m)) return Number(p.p3m);
  return Number(p.unit) || 0;
}

/**
 * Monta os itens do orcamento a partir das substancias escolhidas + catalogo.
 * escolhidas: [{nome, dosagem, sessoes?, incluir?}]
 * catalogo:   [{nome, dosagem, via, freqDias, sessoes, unit, p3m, p6m, p12m}]
 */
function montarItensOrcamento_(escolhidas, catalogo, mesesPrograma) {
  var idx = {};
  for (var i = 0; i < (catalogo || []).length; i++) {
    idx[chaveSubstancia_(catalogo[i].nome, catalogo[i].dosagem)] = catalogo[i];
  }
  var itens = [];
  for (var j = 0; j < (escolhidas || []).length; j++) {
    var e = escolhidas[j];
    var c = idx[chaveSubstancia_(e.nome, e.dosagem)] || {};
    var incluir = e.incluir !== false;
    var sessoes = (e.sessoes != null) ? e.sessoes : (c.sessoes || 0);
    var valorUnit = precoPorFaixaMeses_(
      { unit: c.unit, p3m: c.p3m, p6m: c.p6m, p12m: c.p12m }, mesesPrograma);
    itens.push({
      nome: e.nome,
      dosagem: e.dosagem || '',
      via: c.via || '',
      freqDias: Number(c.freqDias) || 0,
      sessoes: Number(sessoes) || 0,
      valorUnit: arredondar2_(valorUnit),
      incluir: incluir,
      subtotal: calcularSubtotalItem_(sessoes, valorUnit, incluir)
    });
  }
  return itens;
}

/**
 * DTO da linha que vai pro FINANCEIRO (acoplamento).
 * forma: 'avista' | 'parcelado' | 'entrada'.
 */
function montarLancamentoFinanceiro_(paciente, valorTratamento, forma, parcelas, entrada) {
  var v = arredondar2_(Number(valorTratamento) || 0);
  var ent = arredondar2_(Number(entrada) || 0);
  if (ent < 0) ent = 0;
  if (ent > v) ent = v;
  var saldo = arredondar2_(v - ent);
  var n = Number(parcelas) || 1;
  if (n < 1) n = 1;
  return {
    paciente: String(paciente || '').trim(),
    valorTratamento: v,
    formaPagamento: String(forma || '').trim(),
    valorEntrada: forma === 'avista' ? 0 : ent,
    parcelas: forma === 'avista' ? 1 : n,
    valorParcela: forma === 'avista' ? 0 : arredondar2_(saldo / n),
    receitaMensal: receitaMensal_(v, forma, n, ent),
    valorPago: 0,
    valorPendente: v
  };
}
