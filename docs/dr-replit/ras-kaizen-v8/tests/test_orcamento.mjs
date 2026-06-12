/**
 * Teste semantico das funcoes PURAS de Orcamento.gs.
 * Le o .gs, extrai cada funcao por casamento de chaves e avalia o codigo REAL
 * (sem copia paralela) => zero drift. Os numeros batem com a planilha real do
 * CEO (paciente Luciano, total 15960).
 *
 * Rodar: node docs/dr-replit/ras-kaizen-v8/tests/test_orcamento.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gsPath = path.join(__dirname, '..', 'Orcamento.gs');
const src = fs.readFileSync(gsPath, 'utf8');

function extrair(nome) {
  const re = new RegExp('function\\s+' + nome + '\\s*\\(');
  const m = re.exec(src);
  if (!m) throw new Error('nao achei a funcao ' + nome);
  const abre = src.indexOf('{', m.index);
  let depth = 0, j = abre;
  for (; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) { j++; break; } }
  }
  return src.slice(m.index, j);
}

const PURAS = [
  'arredondar2_', 'calcularSubtotalItem_', 'calcularTotalOrcamento_',
  'aplicarDesconto_', 'economiaDesconto_', 'cenarioAVista_', 'cenarioEntrada_',
  'parcelaComTaxa_', 'receitaMensal_', 'mesesPrograma_', 'chaveSubstancia_',
  'precoPorFaixaMeses_', 'montarItensOrcamento_', 'montarLancamentoFinanceiro_'
];

let combinado = 'var ORCAMENTO_CONFIG = { descAVistaPct: 15, cenarioBEntradaPct: 50,'
  + ' cenarioBDescPct: 10, cenarioCEntradaPct: 30, cenarioCDescPct: 5,'
  + ' parcelasPadrao: [1,2,3], diasPorMes: 30 };\n';
PURAS.forEach((n) => { combinado += extrair(n) + '\n'; });
combinado += 'return { ' + PURAS.join(', ') + ' };';
const api = new Function(combinado)();

let passou = 0, falhou = 0;
function ok(nome, real, esperado) {
  const r = JSON.stringify(real);
  const e = JSON.stringify(esperado);
  if (r === e) { passou++; console.log('  [OK] ' + nome); }
  else { falhou++; console.log('  [FALHA] ' + nome + '\n       esperado: ' + e + '\n       obtido:   ' + r); }
}
function okTrue(nome, cond) {
  if (cond) { passou++; console.log('  [OK] ' + nome); }
  else { falhou++; console.log('  [FALHA] ' + nome); }
}

// itens incluidos do paciente Luciano (E=INCLUIR=1): somam 15960
const luciano = [
  { nome: 'Testosterona bioidentica', sessoes: 12, valorUnit: 150, freqDias: 7, incluir: true },  // 1800
  { nome: 'Tesamorelin', sessoes: 60, valorUnit: 120, freqDias: 1, incluir: true },                // 7200
  { nome: 'Tirzepatida', sessoes: 12, valorUnit: 450, freqDias: 7, incluir: true },                // 5400
  { nome: 'Coenzima Q10 injetavel', sessoes: 12, valorUnit: 90, freqDias: 7, incluir: true },      // 1080
  { nome: 'Vitamina D injetavel', sessoes: 6, valorUnit: 80, freqDias: 15, incluir: true },        // 480
  { nome: 'Vitamina B12', sessoes: 6, valorUnit: 80, freqDias: 15, incluir: false },               // excluido
  { nome: 'Dieta personalizada', sessoes: 1, valorUnit: 500, freqDias: 90, incluir: false },       // excluido
];

console.log('== arredondamento (centavos) ==');
ok('arredonda 2 casas', api.arredondar2_(3537.7999999), 3537.8);
ok('arredonda meio centavo', api.arredondar2_(10.005), 10.01);

console.log('== subtotal de item ==');
ok('subtotal incluido', api.calcularSubtotalItem_(12, 150, true), 1800);
ok('subtotal NAO incluido = 0', api.calcularSubtotalItem_(12, 150, false), 0);
ok('subtotal sessoes negativas = 0', api.calcularSubtotalItem_(-5, 150, true), 0);
ok('subtotal valor negativo = 0', api.calcularSubtotalItem_(12, -150, true), 0);
ok('subtotal string numerica', api.calcularSubtotalItem_('6', '80', true), 480);

console.log('== total do orcamento (so itens incluidos) ==');
ok('total Luciano = 15960', api.calcularTotalOrcamento_(luciano), 15960);
ok('total vazio = 0', api.calcularTotalOrcamento_([]), 0);

console.log('== descontos ==');
ok('a vista 15% (15960 -> 13566)', api.aplicarDesconto_(15960, 15), 13566);
ok('economia a vista (2394)', api.economiaDesconto_(15960, 15), 2394);
ok('desconto clampa >100 -> 0', api.aplicarDesconto_(100, 250), 0);
ok('desconto clampa <0 -> total', api.aplicarDesconto_(100, -5), 100);

console.log('== cenario A (a vista) ==');
ok('cenario A Luciano', api.cenarioAVista_(15960, 15), { valor: 13566, economia: 2394 });

console.log('== cenario B (entrada 50% / 10% desc) ==');
ok('cenario B Luciano', api.cenarioEntrada_(15960, 10, 50, [1, 2, 3]), {
  valorComDesconto: 14364, economia: 1596, entrada: 7182, saldo: 7182,
  parcelas: { 1: 7182, 2: 3591, 3: 2394 }
});

console.log('== cenario C (entrada 30% / 5% desc) ==');
ok('cenario C Luciano', api.cenarioEntrada_(15960, 5, 30, [1, 2, 3]), {
  valorComDesconto: 15162, economia: 798, entrada: 4548.6, saldo: 10613.4,
  parcelas: { 1: 10613.4, 2: 5306.7, 3: 3537.8 }
});

console.log('== cenario entrada — extremos (clamp 0..100) ==');
const entAlta = api.cenarioEntrada_(15960, 10, 150, [1, 2, 3]);
okTrue('entrada >100% clampa em 100% (saldo 0)', entAlta.saldo === 0 && entAlta.entrada === 14364);
okTrue('entrada >100% nunca gera parcela negativa', entAlta.parcelas[2] === 0 && entAlta.parcelas[3] === 0);
const entNeg = api.cenarioEntrada_(15960, 10, -10, [1, 2]);
okTrue('entrada <0 clampa em 0 (saldo = valor cheio com desc)', entNeg.entrada === 0 && entNeg.saldo === 14364);

console.log('== calculadora livre (taxa de cartao sobre total cheio) ==');
// entrada 20% de 15960 = 3192; saldo = 12768; 2x com taxa 5.59%
okTrue('entrada livre 20% = 3192', api.arredondar2_(15960 * 0.20) === 3192);
ok('saldo livre 12768 em 2x @5.59%', api.parcelaComTaxa_(12768, 2, 5.59), {
  totalComTaxa: 13481.73, valorParcela: 6740.87
});
ok('saldo sem taxa em 3x', api.parcelaComTaxa_(9000, 3, 0), { totalComTaxa: 9000, valorParcela: 3000 });

console.log('== receita mensal por forma de pagamento ==');
ok('avista recebe tudo no mes 1', api.receitaMensal_(13566, 'avista', 1, 0), 13566);
ok('parcelado 3x', api.receitaMensal_(19490, 'parcelado', 3, 0), 6496.67);
ok('entrada: saldo/parcelas por mes', api.receitaMensal_(14364, 'entrada', 2, 7182), 3591);

console.log('== meses do programa (item mais longo) ==');
// item mais longo do Luciano: Vit D/Tirze/Testo ~75-77 dias => ceil(77/30) = 3 meses
ok('Luciano = 3 meses (item mais longo ~77 dias)', api.mesesPrograma_(luciano), 3);
ok('vazio = 1 mes', api.mesesPrograma_([]), 1);

console.log('== faixa de preco por meses (CADASTRO SUBSTANCIAS) ==');
const precoQ10 = { unit: 85, p3m: 75, p6m: 65, p12m: 55 };
ok('1 mes -> UNIT 85', api.precoPorFaixaMeses_(precoQ10, 1), 85);
ok('3 meses -> 3M 75', api.precoPorFaixaMeses_(precoQ10, 3), 75);
ok('6 meses -> 6M 65', api.precoPorFaixaMeses_(precoQ10, 6), 65);
ok('12 meses -> 12M 55', api.precoPorFaixaMeses_(precoQ10, 12), 55);

console.log('== chave de substancia (casamento com catalogo) ==');
ok('chave normaliza caixa/espacos', api.chaveSubstancia_(' Coenzima  Q10 ', 'mg'), 'COENZIMA Q10|MG');

console.log('== montar itens a partir do catalogo ==');
const catalogo = [
  { nome: 'COENZIMA Q10', dosagem: '100MG', via: 'IM', freqDias: 15, sessoes: 6, unit: 85, p3m: 75, p6m: 65, p12m: 55 },
  { nome: 'PQQ', dosagem: '20MG', via: 'IM', freqDias: 15, sessoes: 4, unit: 120, p3m: 105, p6m: 90, p12m: 80 }
];
const itens = api.montarItensOrcamento_(
  [{ nome: 'COENZIMA Q10', dosagem: '100MG' }, { nome: 'PQQ', dosagem: '20MG', incluir: false }],
  catalogo, 6);
okTrue('puxou 2 itens', itens.length === 2);
okTrue('Q10 pegou via/freq/sessoes do catalogo', itens[0].via === 'IM' && itens[0].freqDias === 15 && itens[0].sessoes === 6);
okTrue('Q10 preco faixa 6M = 65', itens[0].valorUnit === 65);
okTrue('Q10 subtotal = 6*65 = 390', itens[0].subtotal === 390);
okTrue('PQQ excluido => subtotal 0', itens[1].subtotal === 0);
ok('total dos itens montados', api.calcularTotalOrcamento_(itens), 390);

console.log('== lancamento no FINANCEIRO (acoplamento) ==');
ok('lancamento a vista', api.montarLancamentoFinanceiro_('LUCIANO PERCINOTO', 13566, 'avista', 1, 0), {
  paciente: 'LUCIANO PERCINOTO', valorTratamento: 13566, formaPagamento: 'avista',
  valorEntrada: 0, parcelas: 1, valorParcela: 0, receitaMensal: 13566,
  valorPago: 0, valorPendente: 13566
});
ok('lancamento entrada 50% + 2x', api.montarLancamentoFinanceiro_('LUCIANO PERCINOTO', 14364, 'entrada', 2, 7182), {
  paciente: 'LUCIANO PERCINOTO', valorTratamento: 14364, formaPagamento: 'entrada',
  valorEntrada: 7182, parcelas: 2, valorParcela: 3591, receitaMensal: 3591,
  valorPago: 0, valorPendente: 14364
});
okTrue('entrada nunca maior que o valor (clamp)',
  api.montarLancamentoFinanceiro_('X', 1000, 'entrada', 2, 5000).valorEntrada === 1000);

console.log('\n== RESULTADO ORCAMENTO: ' + passou + ' OK / ' + falhou + ' FALHA ==');
if (falhou > 0) process.exit(1);
