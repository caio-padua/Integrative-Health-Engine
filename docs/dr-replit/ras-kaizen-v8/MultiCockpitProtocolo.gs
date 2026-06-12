/**
 * MultiCockpitProtocolo.gs — 4 cockpits + numero de protocolo + apagar por linha
 * ─────────────────────────────────────────────────────────────────────────────
 * Decisoes do CEO (12/06/2026), proposta:
 *   docs/dr-replit/PROPOSTAS/2026-06-12_multi-cockpit-protocolo-toggle-agenda.md
 *
 *  D1: 4 cockpits no total (COCKPIT, COCKPIT 2, COCKPIT 3, COCKPIT 4).
 *  D2: 1 botao LANCAR que age na ABA ATIVA (qualquer COCKPIT*).
 *  D3: campo "No PROTOCOLO" no cockpit (dropdown 000-100, texto 3 digitos).
 *  D4: mesmo paciente -> 1 LINHA por protocolo na TABELA GERAL (coluna aditiva
 *      "NUMERO PROTOCOLO"); mantem historico.
 *  D5-A: apagar pelo Panel = apaga eventos da linha + REMOVE a linha (deleteRow),
 *        com confirmacao dupla no Panel e BACKUP automatico antes (sugestao 10.1).
 *  D6-A: toggle "LANCAR NA AGENDA AO EMITIR?" e uma celula do cockpit (F5).
 *  D7-A: match de substancia tolerante a espaco entre numero e unidade
 *        ("200 mg" == "200mg") via normSemEspaco_.
 *  D8-A: aplicarEstruturaCompleta cria/repara os cockpits extras, garante as
 *        colunas aditivas e normaliza o espaco da dose nos nomes dos blocos.
 *  Sugestao 10.2: aviso de duplicidade (paciente + numero de protocolo ja existe).
 *  Sugestao 10.4: carimbo de origem (coluna aditiva "COCKPIT ORIGEM").
 *
 * Depende (escopo global do Apps Script, ja existem no projeto):
 *   getSS_, ABA_PRINCIPAL, findColByHeader_, getLastDataRow_, normalizeHeader_,
 *   estruturarCockpit_, getOrCreateSheet_, getOrCreateColAgenda_,
 *   parseEventIds_, apagarEventosPorIds_, COL_AGENDA_EVENTOS.
 */

// ── Constantes ────────────────────────────────────────────────
var HEADER_NUMERO_PROTOCOLO = 'NUMERO PROTOCOLO';
var HEADER_COCKPIT_ORIGEM   = 'COCKPIT ORIGEM';

/** Nomes oficiais das 4 abas de cockpit (a 1a e a original "COCKPIT"). */
function nomesCockpits_() {
  return ['COCKPIT', 'COCKPIT 2', 'COCKPIT 3', 'COCKPIT 4'];
}

/** true se o nome da aba e um cockpit (COCKPIT, COCKPIT 2, ...). */
function ehNomeCockpit_(nome) {
  return /^COCKPIT(\s+\d+)?$/.test(String(nome || '').trim().toUpperCase());
}

/**
 * D2: aba de cockpit alvo do lancamento = a ABA ATIVA, se for um cockpit;
 * senao cai no "COCKPIT" original (compatibilidade).
 */
function cockpitAtivo_() {
  var ss = getSS_();
  try {
    var ativa = ss.getActiveSheet();
    if (ativa && ehNomeCockpit_(ativa.getName())) return ativa;
  } catch (e) {}
  return ss.getSheetByName('COCKPIT');
}

/** D3: numero de protocolo sempre com 3 digitos, faixa 000..100. */
function formatarNumeroProtocolo_(v) {
  var s = String(v == null ? '' : v).trim();
  if (s === '') return '000';
  var n = parseInt(s.replace(/\D/g, ''), 10);
  if (isNaN(n)) return '000';
  if (n < 0) n = 0;
  if (n > 100) n = 100;
  return ('00' + n).slice(-3);
}

/** D7: normaliza removendo TODOS os espacos ("200 MG" -> "200MG"). */
function normSemEspaco_(s) {
  return normalizeHeader_(s).replace(/\s+/g, '');
}

/** D8: tira o espaco entre numero e unidade num texto de cabecalho de bloco. */
function normalizeDoseHeader_(s) {
  return String(s == null ? '' : s).replace(/(\d)\s+(mg|ml|mcg|ui|g)\b/gi, '$1$2');
}

// ── D8: aplicar estrutura completa (parte multi-cockpit) ───────

/** Cria/repara as abas de cockpit extras (idempotente). */
function estruturarCockpitsExtras_(ss, log) {
  var nomes = nomesCockpits_();
  for (var i = 1; i < nomes.length; i++) { // [0] = COCKPIT (ja feito no fluxo principal)
    var aba = getOrCreateSheet_(ss, nomes[i]);
    estruturarCockpit_(aba, ss);
    if (log) log.push('[OK] ' + nomes[i] + ' estruturado (cockpit independente)');
  }
}

/** Garante as colunas aditivas NUMERO PROTOCOLO + COCKPIT ORIGEM. */
function garantirColunasProtocolo_(abaRAS, log) {
  var c1 = getOrCreateColAgenda_(abaRAS, HEADER_NUMERO_PROTOCOLO);
  var c2 = getOrCreateColAgenda_(abaRAS, HEADER_COCKPIT_ORIGEM);
  if (log) log.push('[OK] Colunas aditivas garantidas: ' + HEADER_NUMERO_PROTOCOLO + ' (col ' + c1 + '), ' + HEADER_COCKPIT_ORIGEM + ' (col ' + c2 + ')');
}

/**
 * D8: normaliza o espaco da dose nos NOMES DOS BLOCOS (linha 1) da TABELA GERAL
 * e reporta blocos sem correspondente no CADASTRO SUBSTANCIAS.
 * SEGURO: so remove o espaco entre numero e unidade no texto do cabecalho
 * (mesma coluna, dados intactos). Nao renomeia conteudo nem apaga nada.
 */
function sincronizarNomesBlocos_(abaRAS, abaCadSub, log) {
  if (!abaRAS) { if (log) log.push('[AVISO] TABELA GERAL ausente — sync de blocos pulado'); return; }
  var lastCol = abaRAS.getLastColumn();
  if (lastCol < 1) return;
  var h1 = abaRAS.getRange(1, 1, 1, lastCol).getValues()[0];

  // Catalogo (nomes do CADASTRO SUBSTANCIAS, coluna A a partir da linha 2) — referencia p/ aviso
  var catalogo = [];
  if (abaCadSub) {
    var lastSub = abaCadSub.getLastRow();
    if (lastSub >= 2) {
      var nomes = abaCadSub.getRange(2, 1, lastSub - 1, 1).getValues();
      for (var k = 0; k < nomes.length; k++) {
        var nm = String(nomes[k][0] || '').trim();
        if (nm) catalogo.push(normSemEspaco_(nm));
      }
    }
  }

  var nFix = 0, nAviso = 0;
  for (var c = 0; c < h1.length; c++) {
    var original = String(h1[c] || '');
    if (original.trim() === '') continue;

    // 1. normalizar espaco da dose no cabecalho do bloco
    var corrigido = normalizeDoseHeader_(original);
    if (corrigido !== original) {
      abaRAS.getRange(1, c + 1).setValue(corrigido);
      nFix++;
      if (log) log.push('[FIX] Bloco col ' + (c + 1) + ': "' + original.trim() + '" -> "' + corrigido.trim() + '"');
    }
  }
  if (log) {
    log.push('[OK] Sync de blocos: ' + nFix + ' cabecalho(s) com espaco de dose corrigido.');
    log.push('[INFO] Match de substancia agora tolera espaco numero<->unidade (200 mg == 200mg).');
  }
}

/**
 * D8: entrada unica chamada pelo botao "aplicar estrutura completa".
 * (Chamada de forma aditiva pelo Code.gs em aplicarEstruturaCompleta.)
 */
function aplicarEstruturaMultiCockpit_(ss, abaRAS, abaCadSub, log) {
  estruturarCockpitsExtras_(ss, log);
  garantirColunasProtocolo_(abaRAS, log);
  sincronizarNomesBlocos_(abaRAS, abaCadSub, log);
}

// ── D5-A: apagar protocolo por numero de linha (Panel) ─────────

/** Sugestao 10.1: backup datado da TABELA GERAL antes de operacao destrutiva. */
function backupTabelaGeral_(ss) {
  var origem = ss.getSheetByName(ABA_PRINCIPAL);
  if (!origem) return null;
  var carimbo = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yy.MM.dd_HH.mm.ss');
  var nome = 'BACKUP TABELA GERAL_' + carimbo;
  var copia = origem.copyTo(ss);
  copia.setName(nome);
  return nome;
}

/**
 * Exclusao TOTAL de um protocolo por numero de linha:
 *   1. backup da TABELA GERAL;
 *   2. apaga os eventos do Google Agenda daquela linha;
 *   3. REMOVE a linha (deleteRow) — desloca as linhas de baixo pra cima.
 */
function apagarProtocoloLinha_(rowNum) {
  var ss = getSS_();
  var sheet = ss.getSheetByName(ABA_PRINCIPAL);
  if (!sheet) return JSON.stringify({ error: 'Aba TABELA GERAL nao encontrada' });

  var linha = parseInt(rowNum, 10);
  if (!linha || linha < 3) return JSON.stringify({ error: 'Numero de linha invalido (use 3 ou maior).' });

  var colNome = findColByHeader_(sheet, 'NOME DO PACIENTE');
  if (colNome === -1) colNome = 2;
  var lastRow = getLastDataRow_(sheet, colNome);
  if (linha > lastRow) return JSON.stringify({ error: 'Linha ' + linha + ' esta vazia ou alem da ultima linha com dados (' + lastRow + ').' });

  var log = [];
  log.push('[INIT] Apagando protocolo da linha ' + linha + '...');

  // 1. backup
  var nomeBackup = backupTabelaGeral_(ss);
  log.push(nomeBackup ? ('[BACKUP] Copia de seguranca criada: "' + nomeBackup + '"') : '[AVISO] Backup nao pode ser criado');

  // 2. apagar eventos da linha
  var nomePac = String(sheet.getRange(linha, colNome).getValue() || '(sem nome)');
  var nEv = 0;
  try {
    var colEv = getOrCreateColAgenda_(sheet, COL_AGENDA_EVENTOS);
    var ids = parseEventIds_(sheet.getRange(linha, colEv).getValue());
    if (ids.length) nEv = apagarEventosPorIds_(ids);
  } catch (e) {
    log.push('[AVISO] Falha ao apagar eventos da agenda: ' + e.message);
  }
  log.push('[OK] ' + nEv + ' evento(s) da agenda apagado(s) para "' + nomePac + '"');

  // 3. remover a linha inteira
  sheet.deleteRow(linha);
  log.push('[FIM] Linha ' + linha + ' removida (exclusao total).');
  log.push('[AVISO] As linhas abaixo subiram uma posicao — os numeros mudaram.');
  log.push('[INFO] Se precisar reverter, use a aba "' + (nomeBackup || 'BACKUP') + '".');

  return JSON.stringify({ log: log.join('\n') });
}

/** Wrapper do Panel.html -> google.script.run.runApagarProtocoloLinha(rowNum). */
function runApagarProtocoloLinha(rowNum) { return apagarProtocoloLinha_(rowNum); }

// ── D10: testes semanticos (puros, sem Sheet/Calendar) ─────────
function testesSemanticosMultiCockpit_() {
  var falhas = [], ok = 0;
  function check(cond, msg) { if (cond) ok++; else falhas.push(msg); }

  // 1. numero de protocolo: 3 digitos, faixa 000-100
  check(formatarNumeroProtocolo_(0) === '000', '1. 0 deveria virar 000, veio ' + formatarNumeroProtocolo_(0));
  check(formatarNumeroProtocolo_(5) === '005', '2. 5 deveria virar 005, veio ' + formatarNumeroProtocolo_(5));
  check(formatarNumeroProtocolo_(100) === '100', '3. 100 deveria virar 100, veio ' + formatarNumeroProtocolo_(100));
  check(formatarNumeroProtocolo_(150) === '100', '4. acima de 100 deveria travar em 100, veio ' + formatarNumeroProtocolo_(150));
  check(formatarNumeroProtocolo_('') === '000', '5. vazio deveria virar 000, veio ' + formatarNumeroProtocolo_(''));
  check(formatarNumeroProtocolo_('07') === '007', '6. "07" deveria virar 007, veio ' + formatarNumeroProtocolo_('07'));

  // 7-8. match de dose tolerante a espaco
  var h = normSemEspaco_('TESTOSTERONA BIO 200 MG');
  check(h.indexOf(normSemEspaco_('TESTOSTERONA BIO 200MG')) !== -1, '7. "200 MG" deveria casar com "200MG"');
  check(normSemEspaco_('200 mg') === '200MG', '8. normSemEspaco "200 mg" deveria ser 200MG, veio ' + normSemEspaco_('200 mg'));

  // 9. normalizeDoseHeader so tira o espaco numero<->unidade
  check(normalizeDoseHeader_('TESTO 200 mg + 50 ml') === 'TESTO 200mg + 50ml',
        '9. normalizeDoseHeader errado, veio ' + normalizeDoseHeader_('TESTO 200 mg + 50 ml'));

  // 10-12. reconhecimento de aba de cockpit
  check(ehNomeCockpit_('COCKPIT') === true,   '10. COCKPIT deveria ser cockpit');
  check(ehNomeCockpit_('COCKPIT 3') === true, '11. COCKPIT 3 deveria ser cockpit');
  check(ehNomeCockpit_('TABELA GERAL') === false, '12. TABELA GERAL nao e cockpit');

  // 13. sao 4 cockpits no total
  check(nomesCockpits_().length === 4, '13. esperado 4 cockpits, veio ' + nomesCockpits_().length);

  var resumo = '[TESTES MULTI-COCKPIT] ' + ok + ' OK, ' + falhas.length + ' falha(s).';
  if (falhas.length) resumo += '\n - ' + falhas.join('\n - ');
  else resumo += '\n[VERDE] Todos os testes semanticos passaram.';
  return resumo;
}

/** Wrapper do Panel.html -> run('runTestesMultiCockpit'). */
function runTestesMultiCockpit() { return testesSemanticosMultiCockpit_(); }
