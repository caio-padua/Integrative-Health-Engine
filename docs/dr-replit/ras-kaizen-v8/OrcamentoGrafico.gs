/**
 * OrcamentoGrafico.gs — GLUE do grafico do orcamento pro cliente (Dr. Replit, 12/06/2026)
 *
 * Item 7.A do CEO: 1 grafico de COLUNAS comparando os 3 cenarios de pagamento
 *   (A vista | Entrada+parcelas 50/10 | Entrada+parcelas 30/5) pelo VALOR FINAL,
 *   pra o cliente VER a economia de cada caminho.
 *
 * Isto e GLUE (usa SpreadsheetApp/Charts): NENHUM AI executa Apps Script. O CEO
 *   clica o botao no Panel; o calculo dos cenarios vem das funcoes PURAS de
 *   Orcamento.gs (cenarioAVista_/cenarioEntrada_), entao o numero do grafico e
 *   exatamente o mesmo do orcamento (zero divergencia).
 */

/**
 * Monta a tabela-base do grafico (rotulo, valor final, economia) a partir do total
 * cheio, reusando as funcoes PURAS. Retorna [[cabecalho], [linha], ...].
 * total: numero (total cheio do orcamento).
 */
function montarDadosGraficoOrcamento_(total) {
  var c = ORCAMENTO_CONFIG;
  var aVista = cenarioAVista_(total, c.descAVistaPct);
  var b = cenarioEntrada_(total, c.cenarioBDescPct, c.cenarioBEntradaPct, c.parcelasPadrao);
  var cc = cenarioEntrada_(total, c.cenarioCDescPct, c.cenarioCEntradaPct, c.parcelasPadrao);
  return [
    ['Cenario', 'Valor final', 'Economia'],
    ['A vista (' + c.descAVistaPct + '%)', aVista.valor, aVista.economia],
    ['Entrada ' + c.cenarioBEntradaPct + '% (' + c.cenarioBDescPct + '%)', b.valorComDesconto, b.economia],
    ['Entrada ' + c.cenarioCEntradaPct + '% (' + c.cenarioCDescPct + '%)', cc.valorComDesconto, cc.economia]
  ];
}

/**
 * GLUE: escreve a tabela-base num canto da aba e insere/atualiza o grafico de colunas.
 * Remove um grafico anterior do mesmo titulo antes (idempotente).
 *   nomeAba: aba onde desenhar (ex.: 'ORCAMENTO').
 *   total:   total cheio do orcamento (pegue da celula do total).
 *   ancora:  {linha, coluna} 1-based onde comeca a tabela-base (default fundo a direita).
 */
function gerarGraficoOrcamento_(nomeAba, total, ancora) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName(nomeAba);
  if (!aba) throw new Error('Aba nao encontrada: ' + nomeAba);

  var dados = montarDadosGraficoOrcamento_(Number(total) || 0);
  var l0 = (ancora && ancora.linha) ? ancora.linha : 30;
  var c0 = (ancora && ancora.coluna) ? ancora.coluna : 9; // coluna I

  aba.getRange(l0, c0, dados.length, dados[0].length).setValues(dados);
  var faixaTabela = aba.getRange(l0, c0, dados.length, dados[0].length);

  // posicao FIXA do grafico (1 coluna a direita da tabela-base)
  var titulo = 'Comparativo de pagamento';
  var ancoraLinha = l0;
  var ancoraColuna = c0 + dados[0].length + 1;

  // idempotencia DETERMINISTICA: remove qualquer grafico ancorado nesta posicao
  // (nao depende de getOptions(), que em Apps Script nem sempre expoe .get('title')).
  var existentes = aba.getCharts();
  for (var i = 0; i < existentes.length; i++) {
    var info = existentes[i].getContainerInfo();
    if (info && info.getAnchorRow() === ancoraLinha && info.getAnchorColumn() === ancoraColuna) {
      aba.removeChart(existentes[i]);
    }
  }

  var grafico = aba.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(faixaTabela)
    .setNumHeaders(1)
    .setOption('title', titulo)
    .setOption('legend', { position: 'bottom' })
    .setOption('colors', ['#1f3a5f', '#7fb2d9']) // navy + azul pastel (PENUMBRA)
    .setOption('fontName', 'JetBrains Mono')
    .setPosition(ancoraLinha, ancoraColuna, 0, 0)
    .build();
  aba.insertChart(grafico);
  return { aba: nomeAba, linhas: dados.length };
}
