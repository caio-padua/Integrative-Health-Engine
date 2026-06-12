/**
 * Padronizacao.gs — motor PURO de padronizacao de nomes de substancia (Dr. Replit, 12/06/2026)
 *
 * Objetivo: a MESMA substancia escrita igual em TODAS as abas, no formato canonico
 *   "Coenzima Q10 100mg" (primeira letra de cada palavra maiuscula, sem acentos,
 *    dosagem colada na unidade em minusculo: "100 MG" -> "100mg").
 * Codigos com digito/sinal ficam em CAIXA ALTA (Q10, B12, D3, ET-7, NAD+); siglas
 *   conhecidas tambem (NAC, HCG, DMSA, DHEA, PQQ, ADEK).
 *
 * O CADASTRO SUBSTANCIAS e a FONTE DA VERDADE. As demais abas (ORCAMENTO, FINANCEIRO,
 *   TABELA GERAL) tem nomes livres que sao CASADOS contra o catalogo. Sem correspondencia
 *   = fica marcado SEM_CORRESPONDENCIA (fail-closed, nunca casa errado em silencio).
 *
 * Tudo aqui e PURO (sem Sheet/UI) => testavel por node (tests/test_padronizacao.mjs).
 */

var ACRONIMOS_SUBSTANCIA = {
  NAC: 1, DMSA: 1, HCG: 1, DHEA: 1, PQQ: 1, ADEK: 1, NAD: 1, DMAE: 1,
  EV: 1, IM: 1, SC: 1, UI: 1
};

/** Remove acentos (funciona em node e no Apps Script V8). */
function removerAcentosSub_(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Capitaliza so a primeira letra; resto minusculo. */
function tituloPalavraSub_(p) {
  if (!p) return '';
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
}

/** True se a palavra e um codigo (tem digito ou sinal +). */
function ehTokenCodigo_(w) {
  return /[0-9]/.test(w) || w.indexOf('+') >= 0;
}

/** Normaliza uma palavra do nome conforme as regras. */
function normalizarPalavraSub_(w) {
  if (!w) return '';
  if (ehTokenCodigo_(w)) return w.toUpperCase();
  if (w.length === 1) return w.toUpperCase();
  if (ACRONIMOS_SUBSTANCIA[w.toUpperCase()]) return w.toUpperCase();
  return w.split('-').map(tituloPalavraSub_).join('-');
}

/** Nome da substancia no formato canonico (sem a dosagem). */
function padronizarNomeSubstancia_(nome) {
  var s = removerAcentosSub_(nome).replace(/\s+/g, ' ').trim();
  if (!s) return '';
  return s.split(' ').map(normalizarPalavraSub_).join(' ');
}

/**
 * Dosagem canonica: cola SO unidades reconhecidas (mg/mcg/g/kg/ml/l/ui).
 *   "100 MG" -> "100mg"; "600.000 UI" -> "600.000ui"; "2,5 mg" -> "2,5mg".
 * Unidade nao reconhecida ("1 ampola", "60 min") NAO cola: vira minuscula como esta.
 */
function padronizarDosagem_(d) {
  var s = removerAcentosSub_(d).replace(/\s+/g, ' ').trim();
  if (!s) return '';
  var m = s.match(/^([0-9][0-9.,]*)\s*(mcg|mg|kg|ml|ui|g|l)$/i);
  if (m) return m[1] + m[2].toLowerCase();
  return s.toLowerCase();
}

/** Nome canonico completo: nome + dosagem. Ex.: "Coenzima Q10 100mg". */
function montarNomeCanonico_(nome, dosagem) {
  var n = padronizarNomeSubstancia_(nome);
  var d = padronizarDosagem_(dosagem);
  return d ? (n + ' ' + d) : n;
}

/** Chave de busca: maiusculo, sem acento, so [A-Z0-9] separado por espaco. */
function chaveBuscaSub_(s) {
  return removerAcentosSub_(s).toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Extrai a dose canonica de um texto livre, se houver (ex.: "...200MG" -> "200mg"). */
function extrairDoseLivre_(texto) {
  var s = removerAcentosSub_(texto).toLowerCase();
  var m = s.match(/([0-9][0-9.,]*)\s*(mcg|mg|kg|ml|ui|g|l)(?![a-z])/);
  return m ? (m[1] + m[2]) : '';
}

/**
 * Casa um texto livre contra o catalogo canonico por PREFIXO de palavra inteira.
 * catalogo: [{nome, dosagem}]. Quando o nome casa com varias dosagens (ex.: Testosterona
 *   Bio 25/200/1000), DESAMBIGUA pela dose presente no texto; se a dose nao bater em
 *   exatamente 1 candidato, retorna null (fail-closed, nunca chuta a dose).
 */
function resolverSubstanciaCanonica_(textoLivre, catalogo) {
  var alvo = chaveBuscaSub_(textoLivre);
  if (!alvo) return null;
  var alvoSp = alvo + ' ';
  var cat = catalogo || [];
  // 1) maior comprimento de nome canonico que casa por prefixo de palavra inteira
  var melhorLen = -1;
  for (var i = 0; i < cat.length; i++) {
    var k = chaveBuscaSub_(cat[i].nome);
    if (!k) continue;
    if ((alvo === k || alvoSp.indexOf(k + ' ') === 0) && k.length > melhorLen) melhorLen = k.length;
  }
  if (melhorLen < 0) return null;
  // 2) todos os candidatos com esse nome (pode haver varias dosagens)
  var candidatos = [];
  for (var j = 0; j < cat.length; j++) {
    var kj = chaveBuscaSub_(cat[j].nome);
    if ((alvo === kj || alvoSp.indexOf(kj + ' ') === 0) && kj.length === melhorLen) candidatos.push(cat[j]);
  }
  var escolhido = null;
  var dose = extrairDoseLivre_(textoLivre);
  if (candidatos.length === 1) {
    // dose explicita divergente do unico candidato => fail-closed (nunca auto-coage)
    if (dose && padronizarDosagem_(candidatos[0].dosagem) !== dose) return null;
    escolhido = candidatos[0];
  } else if (dose) {
    var bate = candidatos.filter(function (c) { return padronizarDosagem_(c.dosagem) === dose; });
    if (bate.length === 1) escolhido = bate[0];
  }
  if (!escolhido) return null;
  return {
    canonico: montarNomeCanonico_(escolhido.nome, escolhido.dosagem),
    nome: escolhido.nome,
    dosagem: escolhido.dosagem
  };
}

/**
 * Planeja a varredura: para cada ocorrencia de nome livre nas abas, devolve o
 * destino canonico ou SEM_CORRESPONDENCIA. NUNCA escreve — so planeja (o glue do
 * Panel aplica). ocorrencias: [{aba, linha, texto}].
 */
function planejarVarredura_(ocorrencias, catalogo) {
  var out = [];
  for (var i = 0; i < (ocorrencias || []).length; i++) {
    var o = ocorrencias[i];
    var r = resolverSubstanciaCanonica_(o.texto, catalogo);
    out.push({
      aba: o.aba,
      linha: o.linha,
      de: o.texto,
      para: r ? r.canonico : o.texto,
      status: r ? 'OK' : 'SEM_CORRESPONDENCIA',
      mudou: r ? (r.canonico !== o.texto) : false
    });
  }
  return out;
}
