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
  EV: 1, IM: 1, SC: 1, UI: 1,
  // peptideos (siglas oficiais — ficam em CAIXA ALTA; "Cu" NAO entra, fica "GHK-Cu")
  AOD: 1, PT: 1, CJC: 1, BPC: 1, TB: 1, GLOW: 1, MOTS: 1, GHK: 1
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

/** Normaliza UM pedaco simples (sem hifen): codigo->caixa alta, letra unica->maiuscula,
 *  sigla conhecida->caixa alta, senao titulo. Usado nos pedacos de nomes hifenizados. */
function normalizarTokenBase_(w) {
  if (!w) return '';
  if (ehTokenCodigo_(w)) return w.toUpperCase();
  if (w.length === 1) return w.toUpperCase();
  if (ACRONIMOS_SUBSTANCIA[w.toUpperCase()]) return w.toUpperCase();
  return tituloPalavraSub_(w);
}

/** Normaliza uma palavra do nome conforme as regras. */
function normalizarPalavraSub_(w) {
  if (!w) return '';
  // 1) token inteiro com digito/sinal fica em CAIXA ALTA (ET-7, CT-15, NAD+, 9604, 1296)
  if (ehTokenCodigo_(w)) return w.toUpperCase();
  if (w.length === 1) return w.toUpperCase();
  if (ACRONIMOS_SUBSTANCIA[w.toUpperCase()]) return w.toUpperCase();
  // 2) nome hifenizado SEM digito (GHK-Cu, MOTS-C): normaliza cada pedaco por sigla,
  //    preservando casos mistos como "Cu" (cobre) que nao sao siglas conhecidas
  if (w.indexOf('-') >= 0) return w.split('-').map(normalizarTokenBase_).join('-');
  return tituloPalavraSub_(w);
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
 * Indexa a aba APELIDOS SUBSTANCIA por chave de busca do "de" (texto livre).
 * apelidos: [{de, para, status}]. status: ATIVO (resolve), REVISAR_DOSE / SEM_CADASTRO
 *   (orfao intencional: o CEO ainda precisa preencher o "para").
 * Retorna mapa { chaveBusca(de) : {para, status} }.
 */
function indexarApelidos_(apelidos) {
  var idx = {};
  for (var i = 0; i < (apelidos || []).length; i++) {
    var a = apelidos[i];
    var k = chaveBuscaSub_(a.de);
    // status endurecido: tolera digitacao manual na planilha (espaco/caixa)
    var st = String(a.status == null ? 'ATIVO' : a.status).trim().toUpperCase();
    if (!st) st = 'ATIVO';
    if (k) idx[k] = { para: a.para || '', status: st };
  }
  return idx;
}

/** Acha no catalogo a entrada cujo nome canonico == 'para' (compara por chave de busca). */
function acharPorCanonico_(para, catalogo) {
  var alvo = chaveBuscaSub_(para);
  if (!alvo) return null;
  var cat = catalogo || [];
  for (var i = 0; i < cat.length; i++) {
    if (chaveBuscaSub_(montarNomeCanonico_(cat[i].nome, cat[i].dosagem)) === alvo) return cat[i];
  }
  return null;
}

/**
 * Casa um texto livre contra o catalogo canonico.
 * REGRA DE OURO (item 4 do CEO): a IDENTIDADE da substancia e NOME + DOSE juntos
 *   ("Coenzima Q10 100mg"); doses diferentes = itens diferentes do catalogo.
 *
 * Ordem de resolucao:
 *   1) APELIDOS SUBSTANCIA (fenotipo -> genotipo, decidido pelo CEO): se o texto bate
 *      um apelido ATIVO, usa o "para" — desde que o "para" exista no catalogo (senao
 *      fail-closed). Apelido REVISAR_DOSE / SEM_CADASTRO = orfao intencional -> null.
 *   2) Casamento por PREFIXO de palavra inteira contra o catalogo. Nome com varias
 *      dosagens (Testosterona Bio 25/200/1000) DESAMBIGUA pela dose do texto; se a dose
 *      nao bater em exatamente 1 candidato, retorna null (fail-closed, nunca chuta dose).
 *
 * catalogo: [{nome, dosagem}]; apelidos (opcional): [{de, para, status}].
 */
function resolverSubstanciaCanonica_(textoLivre, catalogo, apelidos) {
  var alvo = chaveBuscaSub_(textoLivre);
  if (!alvo) return null;
  var cat = catalogo || [];
  // 0) apelido tem prioridade absoluta
  var idx = indexarApelidos_(apelidos);
  if (idx[alvo]) {
    var ap = idx[alvo];
    if (ap.status !== 'ATIVO' || !ap.para) return null; // orfao intencional (CEO preenche depois)
    var alvoCat = acharPorCanonico_(ap.para, cat);
    if (!alvoCat) return null; // apelido aponta pra algo que nao existe no catalogo -> fail-closed
    return {
      canonico: montarNomeCanonico_(alvoCat.nome, alvoCat.dosagem),
      nome: alvoCat.nome, dosagem: alvoCat.dosagem, via: 'APELIDO'
    };
  }
  var alvoSp = alvo + ' ';
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
    dosagem: escolhido.dosagem,
    via: 'CATALOGO'
  };
}

/**
 * Planeja a varredura: para cada ocorrencia de nome livre nas abas, devolve o
 * destino canonico ou SEM_CORRESPONDENCIA. NUNCA escreve — so planeja (o glue do
 * Panel aplica). ocorrencias: [{aba, linha, texto}].
 */
function planejarVarredura_(ocorrencias, catalogo, apelidos) {
  var out = [];
  for (var i = 0; i < (ocorrencias || []).length; i++) {
    var o = ocorrencias[i];
    var r = resolverSubstanciaCanonica_(o.texto, catalogo, apelidos);
    out.push({
      aba: o.aba,
      linha: o.linha,
      de: o.texto,
      para: r ? r.canonico : o.texto,
      status: r ? 'OK' : 'SEM_CORRESPONDENCIA',
      via: r ? r.via : '',
      mudou: r ? (r.canonico !== o.texto) : false
    });
  }
  return out;
}
