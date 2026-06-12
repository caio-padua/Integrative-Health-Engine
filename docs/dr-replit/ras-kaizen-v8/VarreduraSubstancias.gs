/**
 * VarreduraSubstancias.gs — GLUE (impuro: usa Sheet/UI) da padronizacao de nomes.
 *
 * Liga as funcoes PURAS de Padronizacao.gs (resolverSubstanciaCanonica_,
 * planejarVarredura_) com a planilha real:
 *
 *   1) CADASTRO SUBSTANCIAS  -> FONTE DA VERDADE (catalogo canonico).
 *   2) APELIDOS SUBSTANCIA   -> mapa fenotipo->genotipo decidido pelo CEO.
 *   3) REPLICA SUBSTANCIAS   -> aba EDITAVEL que o CEO pediu: replica catalogo
 *                              + apelidos num so lugar pra lancar/alterar.
 *   4) VARREDURA PREVIEW     -> diff BEFORE->AFTER (dry-run, NAO altera nada).
 *
 * Caio decide o que roda; nenhum agente executa Apps Script. O botao "VARREDURA
 * PREVIEW" e seguro (so escreve a aba de relatorio). O botao "APLICAR" so deve
 * ser clicado depois de conferir o PREVIEW.
 *
 * IMPORTANTE: a varredura NUNCA escreve quando status != OK (fail-closed das
 * funcoes puras). Orfaos (REVISAR_DOSE / SEM_CORRESPONDENCIA) ficam intactos.
 */

// Nomes canonicos das abas (semanticos, sem abreviar).
var ABA_CADASTRO_SUBSTANCIAS = 'CADASTRO SUBSTANCIAS';
var ABA_APELIDOS_SUBSTANCIA  = 'APELIDOS SUBSTANCIA';
var ABA_REPLICA_SUBSTANCIAS  = 'REPLICA SUBSTANCIAS';
var ABA_VARREDURA_PREVIEW    = 'VARREDURA PREVIEW';

/**
 * ALVOS_VARREDURA — CONFIGURAVEL pelo CEO.
 * Cada alvo: { aba, colunaLetra, linhaInicio }.
 * colunaLetra = coluna que contem o NOME LIVRE da substancia a padronizar.
 * Adicionar/remover linhas aqui controla onde a varredura atua. Vazio = nada.
 */
var ALVOS_VARREDURA = [
  // exemplo (descomentar/ajustar conforme o layout real):
  // { aba: 'ORCAMENTO', colunaLetra: 'B', linhaInicio: 3 },
  // { aba: 'FINANCEIRO K', colunaLetra: 'A', linhaInicio: 2 },
];

/** Converte letra de coluna ('A','B','AA') em indice 1-based. */
function colunaLetraParaIndice_(letra) {
  var s = String(letra || '').toUpperCase().replace(/[^A-Z]/g, '');
  var n = 0;
  for (var i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
  return n;
}

/** Le o catalogo canonico da aba CADASTRO SUBSTANCIAS (col A=nome, B=dosagem). */
function lerCatalogoSubstancias_(ss) {
  var sh = ss.getSheetByName(ABA_CADASTRO_SUBSTANCIAS);
  if (!sh) throw new Error('Aba "' + ABA_CADASTRO_SUBSTANCIAS + '" nao existe. Rode APLICAR ESTRUTURA antes.');
  var ultima = sh.getLastRow();
  if (ultima < 2) return [];
  var vals = sh.getRange(2, 1, ultima - 1, 2).getValues();
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    var nome = String(vals[i][0] == null ? '' : vals[i][0]).trim();
    var dose = String(vals[i][1] == null ? '' : vals[i][1]).trim();
    if (nome) out.push({ nome: nome, dosagem: dose });
  }
  return out;
}

/**
 * Le (criando com cabecalho se faltar) a aba APELIDOS SUBSTANCIA.
 * Colunas: A=de (texto livre), B=para (canonico), C=status.
 */
function lerApelidosSubstancia_(ss) {
  var sh = ss.getSheetByName(ABA_APELIDOS_SUBSTANCIA);
  if (!sh) {
    sh = ss.insertSheet(ABA_APELIDOS_SUBSTANCIA);
    sh.getRange(1, 1, 1, 3).setValues([['DE (texto livre)', 'PARA (canonico)', 'STATUS']])
      .setFontWeight('bold');
    sh.setFrozenRows(1);
    return [];
  }
  var ultima = sh.getLastRow();
  if (ultima < 2) return [];
  var vals = sh.getRange(2, 1, ultima - 1, 3).getValues();
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    var de = String(vals[i][0] == null ? '' : vals[i][0]).trim();
    if (!de) continue;
    out.push({
      de: de,
      para: String(vals[i][1] == null ? '' : vals[i][1]).trim(),
      status: String(vals[i][2] == null ? '' : vals[i][2]).trim()
    });
  }
  return out;
}

/**
 * REPLICA SUBSTANCIAS — aba editavel unica que o CEO pediu.
 * Replica o catalogo canonico + a resolucao dos apelidos, pra lancar/alterar
 * num so lugar. NAO e fonte da verdade (so espelho legivel); o CEO edita o
 * CADASTRO SUBSTANCIAS / APELIDOS e re-roda esta replica.
 */
function replicarCadastroSubstancias_() {
  var ss = getSS_();
  var catalogo = lerCatalogoSubstancias_(ss);
  var apelidos = lerApelidosSubstancia_(ss);

  var sh = getOrCreateSheet_(ss, ABA_REPLICA_SUBSTANCIAS);
  sh.clear();

  var linhas = [['#', 'NOME CANONICO', 'NOME (cadastro)', 'DOSAGEM', 'ORIGEM']];
  for (var i = 0; i < catalogo.length; i++) {
    var c = catalogo[i];
    linhas.push([
      i + 1,
      montarNomeCanonico_(c.nome, c.dosagem),
      c.nome, c.dosagem, 'CADASTRO'
    ]);
  }
  for (var j = 0; j < apelidos.length; j++) {
    var a = apelidos[j];
    var st = String(a.status || '').trim().toUpperCase();
    linhas.push([
      catalogo.length + j + 1,
      st === 'ATIVO' ? a.para : ('(' + (st || 'SEM STATUS') + ')'),
      a.de, '', 'APELIDO'
    ]);
  }

  sh.getRange(1, 1, linhas.length, 5).setValues(linhas);
  sh.getRange(1, 1, 1, 5).setFontWeight('bold');
  sh.setFrozenRows(1);
  return JSON.stringify({
    log: '[OK] REPLICA SUBSTANCIAS atualizada: ' + catalogo.length +
         ' do cadastro + ' + apelidos.length + ' apelidos.'
  });
}

/**
 * NUCLEO da varredura. modoAplicar=false (default) => SO escreve a aba
 * VARREDURA PREVIEW (dry-run, nao altera nada). modoAplicar=true => alem do
 * preview, escreve o nome canonico de volta nas celulas com status OK.
 */
function aplicarVarreduraNasAbas_(modoAplicar) {
  var ss = getSS_();
  var catalogo = lerCatalogoSubstancias_(ss);
  var apelidos = lerApelidosSubstancia_(ss);

  // 1) coletar ocorrencias reais das abas-alvo configuradas
  var ocorrencias = [];
  var celulas = []; // paralelo a ocorrencias: { sh, linha, col } pra write-back
  for (var t = 0; t < ALVOS_VARREDURA.length; t++) {
    var alvo = ALVOS_VARREDURA[t];
    var sh = ss.getSheetByName(alvo.aba);
    if (!sh) continue;
    var col = colunaLetraParaIndice_(alvo.colunaLetra);
    if (!col) continue;
    var ini = Math.max(1, alvo.linhaInicio || 1);
    var ultima = sh.getLastRow();
    if (ultima < ini) continue;
    var vals = sh.getRange(ini, col, ultima - ini + 1, 1).getValues();
    for (var r = 0; r < vals.length; r++) {
      var texto = String(vals[r][0] == null ? '' : vals[r][0]).trim();
      if (!texto) continue;
      ocorrencias.push({ aba: alvo.aba, linha: ini + r, texto: texto });
      celulas.push({ sh: sh, linha: ini + r, col: col });
    }
  }

  // 2) planejar (funcao PURA, fail-closed) e escrever PREVIEW
  var plano = planejarVarredura_(ocorrencias, catalogo, apelidos);
  var prev = getOrCreateSheet_(ss, ABA_VARREDURA_PREVIEW);
  prev.clear();
  var cab = [['ABA', 'LINHA', 'DE (antes)', 'PARA (depois)', 'STATUS', 'VIA', 'MUDOU', 'APLICADO']];
  var corpo = [];
  var aplicadas = 0, orfaos = 0;
  for (var p = 0; p < plano.length; p++) {
    var it = plano[p];
    var aplicar = !!(modoAplicar && it.status === 'OK' && it.mudou);
    if (it.status !== 'OK') orfaos++;
    if (aplicar) {
      celulas[p].sh.getRange(celulas[p].linha, celulas[p].col).setValue(it.para);
      aplicadas++;
    }
    corpo.push([
      it.aba, it.linha, it.de, it.para, it.status, it.via,
      it.mudou ? 'SIM' : 'nao',
      aplicar ? 'SIM' : (modoAplicar ? 'nao (sem mudanca)' : 'PREVIEW')
    ]);
  }
  var saida = cab.concat(corpo.length ? corpo : [['(sem ocorrencias — configure ALVOS_VARREDURA)', '', '', '', '', '', '', '']]);
  prev.getRange(1, 1, saida.length, 8).setValues(saida);
  prev.getRange(1, 1, 1, 8).setFontWeight('bold');
  prev.setFrozenRows(1);

  var resumo = modoAplicar
    ? ('[OK] APLICADO: ' + aplicadas + ' celula(s) padronizada(s). ' + orfaos +
       ' orfao(s) NAO tocado(s) (revise APELIDOS). Detalhe em "' + ABA_VARREDURA_PREVIEW + '".')
    : ('[OK] PREVIEW gerado em "' + ABA_VARREDURA_PREVIEW + '": ' + plano.length +
       ' ocorrencia(s), ' + orfaos + ' orfao(s). Nada foi alterado. Clique APLICAR pra gravar.');
  return JSON.stringify({ log: resumo });
}

// ─── Wrappers chamados pelos botoes do Panel ───────────────────
function runReplicarSubstancias() { return replicarCadastroSubstancias_(); }
function runVarreduraPreview()    { return aplicarVarreduraNasAbas_(false); }
function runVarreduraAplicar()    { return aplicarVarreduraNasAbas_(true); }
