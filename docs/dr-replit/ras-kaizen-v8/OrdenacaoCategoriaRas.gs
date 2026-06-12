/**
 * OrdenacaoCategoriaRas.gs — ORDEM POR CATEGORIA, SOMENTE NA GERACAO DO RAS
 * ───────────────────────────────────────────────────────────────────────
 * Decisao do CEO (11/06/2026, opcao A): a ordem das substancias deve sair
 * organizada por categoria SO no RAS/RASCO gerado. NADA muda na planilha
 * (a TABELA GERAL e o COCKPIT continuam exatamente como o cliente digitou).
 *
 * Ordem travada pelo CEO (1 a 7):
 *   1. ANTIOXIDANTE
 *   2. VITAMINA            (inclui "COMPLEXO VIT.")
 *   3. HORMONIO
 *   4. ESTEROIDE
 *   5. PEPTIDEO
 *   6. MINERAL
 *   7. DEMAIS              (qualquer outra categoria, ou sem categoria)
 *
 * Como ligar no RAS (1 linha, aditiva, no Code.gs / funcao montarPaginasRAS_):
 *   ANTES: var allSubst = paciente.substancias || [];
 *   DEPOIS: var allSubst = ordenarSubstanciasRas_(paciente.substancias || []);
 * Nenhuma outra alteracao e necessaria — a paginacao (grupos de 5) passa a
 * respeitar a ordem por categoria automaticamente.
 *
 * Depende (ja existem no projeto, escopo global do Apps Script):
 *   CATALOGO_SUBSTANCIAS, normalizeHeader_
 */

// Rank 1..7 a partir do NOME da categoria (vem do catalogo, campo [2]).
// Comparacao em maiusculas; casa por trecho para tolerar acentos/variacoes.
function rankCategoriaRas_(categoria) {
  var c = String(categoria || '').toUpperCase();
  if (c.indexOf('ANTIOX') !== -1) return 1;
  if (c.indexOf('COMPLEXO VIT') !== -1 || c.indexOf('VITAMIN') !== -1) return 2;
  if (c.indexOf('HORMON') !== -1) return 3;
  if (c.indexOf('ESTEROID') !== -1) return 4;
  if (c.indexOf('PEPTID') !== -1) return 5;
  if (c.indexOf('MINERAL') !== -1) return 6;
  return 7; // demais (aminoacido, fitoterapico, polifenol, consulta, retorno, vazio...)
}

// Descobre a categoria de uma substancia pelo NOME, lendo o CATALOGO_SUBSTANCIAS.
// Linha do catalogo: [nome, dosagem, categoria, via, ...] -> categoria = indice 2.
function categoriaCatalogoRas_(nome) {
  var alvo = normalizeHeader_(String(nome || ''));
  if (!alvo) return '';
  for (var j = 0; j < CATALOGO_SUBSTANCIAS.length; j++) {
    var catNome = normalizeHeader_(String(CATALOGO_SUBSTANCIAS[j][0] || ''));
    if (!catNome) continue;
    // mesmo criterio de match do lerPaciente_ (nome do catalogo contido no alvo),
    // mais o reverso para nomes curtos.
    if (alvo.indexOf(catNome) !== -1 || catNome.indexOf(alvo) !== -1) {
      return String(CATALOGO_SUBSTANCIAS[j][2] || '');
    }
  }
  return '';
}

// Categoria usada para ordenar: se a substancia ja trouxe .categoria resolvida
// (ex.: vinda do motor de agenda), usa ela; senao busca no catalogo pelo nome.
function categoriaParaOrdenarRas_(s) {
  if (s && s.categoria) return s.categoria;
  return categoriaCatalogoRas_(s ? s.nome : '');
}

// Ordena uma copia das substancias por categoria (1..7), MANTENDO a ordem
// original dentro do mesmo grupo (sort estavel via indice de desempate).
// Nao muda nada na planilha — opera so sobre o array em memoria do RAS.
function ordenarSubstanciasRas_(subs) {
  var arr = (subs || []).slice();
  return arr
    .map(function (s, i) {
      return { s: s, i: i, r: rankCategoriaRas_(categoriaParaOrdenarRas_(s)) };
    })
    .sort(function (a, b) { return (a.r - b.r) || (a.i - b.i); })
    .map(function (x) { return x.s; });
}

// ─── TESTES SEMANTICOS (rode pelo botao ou direto no editor) ───
// Nao tocam na planilha; validam so a logica pura de ordenacao.
function testesOrdenacaoCategoriaRas_() {
  var falhas = [];
  var ok = 0;
  function check(cond, msg) { if (cond) ok++; else falhas.push(msg); }

  // 1..7 — cada bucket no rank certo
  check(rankCategoriaRas_('ANTIOXIDANTE') === 1, '1. antioxidante deveria ser 1');
  check(rankCategoriaRas_('VITAMINA') === 2, '2. vitamina deveria ser 2');
  check(rankCategoriaRas_('COMPLEXO VIT.') === 2, '2b. complexo vit. deveria entrar como vitamina (2)');
  check(rankCategoriaRas_('HORMONIO') === 3, '3. hormonio deveria ser 3');
  check(rankCategoriaRas_('ESTEROIDE') === 4, '4. esteroide deveria ser 4');
  check(rankCategoriaRas_('PEPTIDEO') === 5, '5. peptideo deveria ser 5');
  check(rankCategoriaRas_('MINERAL') === 6, '6. mineral deveria ser 6');

  // 7 — qualquer outra coisa cai em "demais"
  check(rankCategoriaRas_('FITOTERAPICO') === 7, '7. fitoterapico deveria cair em demais (7)');
  check(rankCategoriaRas_('') === 7, '7b. categoria vazia deveria cair em demais (7)');
  check(rankCategoriaRas_('CONSULTA') === 7, '7c. consulta deveria cair em demais (7)');

  // 8 — ordenacao completa respeita a ordem travada
  var entrada = [
    { nome: 'MINERAL X', categoria: 'MINERAL' },
    { nome: 'HORM Y', categoria: 'HORMONIO' },
    { nome: 'ANTIOX Z', categoria: 'ANTIOXIDANTE' },
    { nome: 'VIT W', categoria: 'VITAMINA' }
  ];
  var saida = ordenarSubstanciasRas_(entrada).map(function (s) { return s.nome; });
  check(saida.join('|') === 'ANTIOX Z|VIT W|HORM Y|MINERAL X', '8. ordem por categoria errada: ' + saida.join('|'));

  // 9 — estabilidade: dois do mesmo grupo mantem a ordem de entrada
  var pares = [
    { nome: 'PEPT A', categoria: 'PEPTIDEO' },
    { nome: 'PEPT B', categoria: 'PEPTIDEO' }
  ];
  var ordPares = ordenarSubstanciasRas_(pares).map(function (s) { return s.nome; });
  check(ordPares.join('|') === 'PEPT A|PEPT B', '9. estabilidade quebrada dentro do mesmo grupo: ' + ordPares.join('|'));

  // 10 — entradas vazias/nulas nao quebram
  check(ordenarSubstanciasRas_([]).length === 0, '10. array vazio deveria voltar vazio');
  check(ordenarSubstanciasRas_(null).length === 0, '10b. null deveria voltar array vazio');

  var resumo = '[TESTES ORDENACAO RAS] ' + ok + ' passou, ' + falhas.length + ' falhou';
  if (falhas.length) resumo += '\n' + falhas.join('\n');
  Logger.log(resumo);
  return resumo;
}

function runTestesOrdenacaoRas() { return testesOrdenacaoCategoriaRas_(); }
