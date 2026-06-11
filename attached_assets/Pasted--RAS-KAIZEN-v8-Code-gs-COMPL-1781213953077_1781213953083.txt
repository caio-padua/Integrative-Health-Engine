// ═══════════════════════════════════════════════════════════════
// RAS KAIZEN v8 — Code.gs COMPLETO
// Instituto Pádua — Medicina Integrativa
// ═══════════════════════════════════════════════════════════════

// ─── IDs FIXOS ───────────────────────────────────────────────
const SPREADSHEET_ID   = '1SoCXulI-Ohb71JdW1Pcsro09-Wam8BCKOJQw9QUlrgs';
const PASTA_TRANSFERENCIA = '1TbTIf9s3y3MwF1nPk9ABz5CaLgtFfveC';
const PASTA_RAS_CLIENTES  = '1ddFpMscOeokMiugeK6KngDRiIEsiy75b';
const PASTA_FINANCEIRO    = '1l9wk3M-vljXs4vidlJQAdkpOxDfEo5AZ';
const VERSAO = 'RAS KAIZEN v8';
const ABA_PRINCIPAL = 'TABELA GERAL'; // Nome da aba principal (era ABA_PRINCIPAL)
const PASTA_JURIDICO = '17ztkQlX8xiQ3SQAZs2-IheXAatSgsomx';

// ─── CATÁLOGO DE SUBSTÂNCIAS ─────────────────────────────────
// [nome, dosagem, categoria, via, freqPadrao, sessoesPadrao, precoUnit, preco3m, preco6m, preco12m, cardio, osteo, imuno, neuro, metab]
const CATALOGO_SUBSTANCIAS = [
  ['COENZIMA Q10','100MG','VITAMINA','IM',15,6,85,75,65,55,5,3,4,4,5],
  ['PQQ','20MG','ANTIOXIDANTE','IM',15,4,120,105,90,80,4,2,3,5,4],
  ['RESVERATROL','100MG','POLIFENOL','EV',15,6,95,85,75,65,5,3,5,4,4],
  ['EXYNUTRIMENT','20MG','SILICIO ORG.','IM',15,5,110,95,85,75,2,5,3,2,3],
  ['VITAMINA D3','600.000 UI','VITAMINA','IM',30,6,45,40,35,30,4,5,5,3,4],
  ['VITAMINA B12','2500MCG','VITAMINA','IM',15,6,35,30,25,22,3,2,4,5,5],
  ['VITAMINA ADEK','600.000 UI','COMPLEXO VIT.','IM',30,4,65,58,50,45,4,5,5,3,4],
  ['TRIO METILADOR','COMPLEXO','METILACAO','IM',15,6,75,65,58,50,4,2,4,5,5],
  ['NAC N-ACETIL CISTEINA','300MG','AMINOACIDO','EV',7,12,90,80,70,60,4,2,5,4,5],
  ['ACIDO ALFA LIPOICO','600MG','ANTIOXIDANTE','EV',7,12,95,85,75,65,5,2,5,5,5],
  ['GLUTATIONA','600MG','ANTIOXIDANTE','EV',7,12,130,115,100,88,4,2,5,4,5],
  ['VITAMINA C','10G','VITAMINA','EV',7,12,65,58,50,42,4,3,5,3,4],
  ['NAD+','250MG','COENZIMA','EV',15,5,350,310,280,250,5,3,4,5,5],
  ['TIRZEPATIDA','2,5MG','PEPTIDEO','SC',7,4,380,350,320,290,4,2,3,3,5],
  ['TIRZEPATIDA','5MG','PEPTIDEO','SC',7,4,520,480,440,400,4,2,3,3,5],
  ['TIRZEPATIDA','10MG','PEPTIDEO','SC',7,4,780,720,660,600,4,2,3,3,5],
  ['RETATRUTIDE','10MG','PEPTIDEO','SC',7,4,850,780,720,660,4,2,3,3,5],
  ['HCG','500 UI','HORMONIO','SC',7,8,45,40,35,30,2,2,3,2,5],
  ['HCG','5000 UI','HORMONIO','IM',7,4,85,75,68,60,2,2,3,2,5],
  ['TESAMORELIN','10MG','PEPTIDEO','SC',7,12,420,380,350,310,4,3,3,4,5],
  ['PROGESTERONA','200MG','HORMONIO','IM',30,6,55,48,42,38,3,4,3,5,3],
  ['TESTOSTERONA BIO','25MG','HORMONIO','IM',7,12,35,30,28,25,4,5,3,4,5],
  ['TESTOSTERONA BIO','200MG','HORMONIO','IM',15,8,65,58,52,45,4,5,3,4,5],
  ['TESTOSTERONA BIO','1000MG','HORMONIO','IM',60,4,180,165,150,135,4,5,3,4,5],
  ['COMPLEXO B','INJETAVEL','VITAMINA','IM',7,12,25,22,20,18,3,3,4,5,5],
  ['ZINCO QUELADO','20MG','MINERAL','IM',15,6,40,35,32,28,3,3,5,3,4],
  ['SELENIO','100MCG','MINERAL','IM',15,6,38,34,30,26,4,2,5,4,4],
  ['MAGNESIO','500MG','MINERAL','EV',7,8,55,48,42,38,5,5,4,5,4],
  ['TAURINA','500MG','AMINOACIDO','EV',7,8,48,42,38,34,5,3,4,5,4],
  ['DMSA','250MG','QUELANTE','EV',15,10,160,145,130,115,4,2,5,5,5],
  ['CURCUMINA','100MG','FITOTERAPICO','EV',15,6,75,65,58,50,5,4,5,4,4],
  ['FOSFATIDILCOLINA','500MG','FOSFOLIPIDEO','EV',7,10,85,75,68,60,5,2,3,5,5],
  ['MELATONINA','3MG','HORMONIO','SC',30,6,42,38,34,30,3,2,4,5,3],
  ['DHEA','50MG','HORMONIO','IM',30,6,55,48,42,38,4,4,4,4,5],
  ['OZONIO TERAPIA','60ML','OXIDATIVO','EV',7,10,120,108,96,85,5,4,5,4,5],
  ['ET-7 ENANTATO','250MG','ESTEROIDE','IM',7,12,45,40,36,32,4,5,3,3,5],
  ['CT-15 CIPIONATO','200MG','ESTEROIDE','IM',15,8,50,45,40,35,4,5,3,3,5],
  ['DA-7 DURATESTON','250MG','ESTEROIDE','IM',7,8,55,50,45,40,4,5,3,3,5],
  ['MT-7 METENOLONA','100MG','ESTEROIDE','IM',7,8,65,58,52,48,3,5,3,3,4],
  ['BD-7 BOLDENONA','200MG','ESTEROIDE','IM',7,8,55,50,45,40,4,5,3,2,4],
  ['DN-7 DROSTANOLONA','100MG','ESTEROIDE','IM',7,8,70,63,56,50,3,4,3,2,4],
];

// ─── INFO SUBSTÂNCIAS (para RAS Informativo) ─────────────────
const INFO_SUBSTANCIAS = [
  {nome:'COENZIMA Q10',descricao:'Coenzima essencial para producao de energia celular (ATP). Poderoso antioxidante mitocondrial.',vantagem:'Via injetavel: biodisponibilidade 95% vs 3-5% oral. Acao imediata na mitocondria.'},
  {nome:'NAC N-ACETIL CISTEINA',descricao:'Precursor da glutationa, principal antioxidante endogeno. Quelante de metais pesados.',vantagem:'Via EV: 100% biodisponibilidade. Acao hepatoprotetora imediata. Oral: 6-10% absorcao.'},
  {nome:'ACIDO ALFA LIPOICO',descricao:'Antioxidante universal (hidro e liposoluvel). Regenera vitaminas C, E e glutationa.',vantagem:'Via EV: acao neuroprotetora direta. Controle glicemico superior. Oral: absorcao variavel.'},
  {nome:'GLUTATIONA',descricao:'O mais poderoso antioxidante do corpo humano. Essencial para detoxificacao hepatica.',vantagem:'Via EV: unica forma eficaz. Via oral e destruida no trato gastrointestinal.'},
  {nome:'NAD+',descricao:'Coenzima presente em todas as celulas. Essencial para reparo de DNA e longevidade celular.',vantagem:'Via EV: restauracao direta dos niveis celulares. Via oral: degradacao quase total.'},
  {nome:'VITAMINA C',descricao:'Antioxidante, cofator em 300+ reacoes enzimaticas. Anti-inflamatorio potente.',vantagem:'Via EV: doses farmacologicas (10g+) impossiveis por oral. Acao anti-tumoral em altas doses.'},
  {nome:'MAGNESIO',descricao:'Cofator em 600+ reacoes enzimaticas. Relaxante muscular e neuroprotetor natural.',vantagem:'Via EV: correcao imediata de deficiencia. Oral: efeito laxativo limita absorcao.'},
  {nome:'VITAMINA D3',descricao:'Pro-hormonio essencial. Regula 2000+ genes. Imunomodulador potente.',vantagem:'Via IM: deposito de longa duracao (30-60 dias). Oral: absorcao depende de gordura.'},
  {nome:'VITAMINA B12',descricao:'Essencial para formacao de mielina, DNA e hemoglobina. Neuroprotetor.',vantagem:'Via IM: absorcao garantida independente de fator intrinseco. Oral: 1-2% absorcao.'},
];

// ─── CORES ───────────────────────────────────────────────────
const COR = {
  navy:     '#1B2A4A',
  dourado:  '#D4AF37',
  creme:    '#F5F0E8',
  offWhite: '#FDFCFB',
  azulSuave:'#7BA7CC',
  perola:   '#F9F6F1',
  azulPastel:'#E8F0FE',
  verdePastel:'#E6F4EA',
  amareloPastel:'#FEF7E0',
  rosaPastel:'#FCE8E6',
  cinzaZebra:'#F1F3F4',
  branco:   '#FFFFFF',
  verdeOk:  '#34A853',
  vermelhoNg:'#EA4335',
};


// ═══════════════════════════════════════════════════════════════
// UTILITÁRIOS
// ═══════════════════════════════════════════════════════════════

/**
 * Abre o Painel lateral
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🏥 RAS KAIZEN')
    .addItem('Abrir Painel', 'abrirPainel')
    .addToUi();
}

function abrirPainel() {
  const html = HtmlService.createHtmlOutputFromFile('Panel')
    .setTitle('RAS KAIZEN v8')
    .setWidth(420);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Retorna a planilha mãe
 */
function getSS_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/**
 * Normaliza string para comparação de cabeçalhos:
 * remove acentos, quebras de linha, espaços múltiplos, uppercase
 */
function normalizeHeader_(str) {
  if (!str) return '';
  return String(str)
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * REGRA OURO: busca coluna pelo nome do cabeçalho na linha 1 (1-indexed)
 * Nunca por posição fixa.
 */
function findColByHeader_(sheet, headerName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const target = normalizeHeader_(headerName);
  for (let i = 0; i < headers.length; i++) {
    if (normalizeHeader_(headers[i]) === target) return i + 1; // 1-indexed
  }
  // Tenta match parcial (contém)
  for (let i = 0; i < headers.length; i++) {
    if (normalizeHeader_(headers[i]).indexOf(target) !== -1) return i + 1;
  }
  return -1;
}

/**
 * Busca múltiplas colunas de uma vez. Retorna objeto {headerNormalizado: colIndex}
 */
function findColsByHeaders_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach(function(h, i) {
    map[normalizeHeader_(h)] = i + 1;
  });
  return map;
}

/**
 * CENTRAL: Acha as colunas DIA/MES/ANO de um bloco (ex: "CONSULTA MEDICA").
 *
 * Lida com header MESCLADO: o nome do bloco fica APENAS na 1ª coluna da linha 1
 * (as colunas SESS/FREQ/DIA/MES/ANO têm linha 1 VAZIA). Os sub-rótulos
 * (SIM/NAO, SESS, FREQ, DIA, MES, ANO) ficam na linha 2.
 *
 * Estratégia:
 *  1. Acha a coluna inicial do bloco (linha 1 contém o nome do bloco).
 *  2. Dentro das 6 colunas do bloco, usa a LINHA 2 para achar DIA/MES/ANO.
 *  3. Fallback: offset fixo +3/+4/+5 a partir do início do bloco.
 *
 * @param {Sheet} sheet
 * @param {string} nomeBloco - ex: 'CONSULTA MEDICA'
 * @returns {Object} {start, sim, sess, freq, dia, mes, ano} — todos 1-indexed, ou -1
 */
function findBlocoDatas_(sheet, nomeBloco) {
  var lastCol = sheet.getLastColumn();
  var headers1 = sheet.getRange(1, 1, 1, lastCol).getValues()[0]; // 0-indexed
  var headers2 = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
  var alvo = normalizeHeader_(nomeBloco);
  var palavras = alvo.split(' ').filter(function(w){ return w.length > 0; });
  
  var result = { start: -1, sim: -1, sess: -1, freq: -1, dia: -1, mes: -1, ano: -1 };
  
  // 1. Achar início do bloco (linha 1 contém TODAS as palavras do nome)
  var startIdx = -1; // 0-indexed
  for (var i = 0; i < headers1.length; i++) {
    var h1 = normalizeHeader_(headers1[i]);
    var todasPresentes = palavras.every(function(w){ return h1.indexOf(w) !== -1; });
    if (todasPresentes && h1.length > 0) { startIdx = i; break; }
  }
  if (startIdx === -1) return result; // bloco não encontrado
  
  result.start = startIdx + 1; // 1-indexed
  
  // 2. Dentro das 6 colunas do bloco, achar sub-rótulos pela linha 2
  var fim = Math.min(startIdx + 6, lastCol);
  for (var j = startIdx; j < fim; j++) {
    var h2 = normalizeHeader_(headers2[j]);
    if ((h2 === 'SIM/NAO' || h2 === 'SIM' || h2.indexOf('SIM') !== -1) && result.sim === -1) result.sim = j + 1;
    if (h2 === 'SESS' && result.sess === -1) result.sess = j + 1;
    if (h2 === 'FREQ' && result.freq === -1) result.freq = j + 1;
    if (h2 === 'DIA' && result.dia === -1) result.dia = j + 1;
    if (h2 === 'MES' && result.mes === -1) result.mes = j + 1;
    if (h2 === 'ANO' && result.ano === -1) result.ano = j + 1;
  }
  
  // 3. Fallback por offset fixo (SIM/NAO|SESS|FREQ|DIA|MES|ANO)
  if (result.sim === -1) result.sim = startIdx + 1;
  if (result.sess === -1) result.sess = startIdx + 2;
  if (result.freq === -1) result.freq = startIdx + 3;
  if (result.dia === -1) result.dia = startIdx + 4; // start(1) +3 em 1-indexed = startIdx+4
  if (result.mes === -1) result.mes = startIdx + 5;
  if (result.ano === -1) result.ano = startIdx + 6;
  
  return result;
}

/**
 * Remove acentos de string
 */
function removerAcentos_(str) {
  if (!str) return '';
  return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Converte valor monetário pt-BR para número.
 * Aceita number direto, ou string "R$ 2.000,00" / "2000" / "1.500,50".
 * Retorna null se vazio, NaN-safe.
 */
function parseMoneyBR_(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  var s = String(val).trim();
  if (s === '' || s.indexOf('#') !== -1) return null; // vazio ou #ERROR
  // Remover R$, espaços, e pontos de milhar; trocar vírgula decimal por ponto
  s = s.replace(/R\$/gi, '').replace(/\s/g, '');
  s = s.replace(/\./g, '').replace(',', '.');
  var n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/**
 * Formata CPF: 12345678901 → 123.456.789-01
 */
function formatarCPF_(cpf) {
  if (!cpf) return '';
  var nums = String(cpf).replace(/\D/g, '');
  if (nums.length !== 11) return String(cpf);
  return nums.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata celular: 11999998888 → (11) 99999-8888
 */
function formatarCelular_(cel) {
  if (!cel) return '';
  var nums = String(cel).replace(/\D/g, '');
  if (nums.length === 11) {
    return '(' + nums.substr(0,2) + ') ' + nums.substr(2,5) + '-' + nums.substr(7,4);
  }
  if (nums.length === 10) {
    return '(' + nums.substr(0,2) + ') ' + nums.substr(2,4) + '-' + nums.substr(6,4);
  }
  return String(cel);
}

/**
 * Data formatada AA.MM.DD
 */
function dataFormatada_(d) {
  if (!d) d = new Date();
  var yy = String(d.getFullYear()).slice(-2);
  var mm = ('0' + (d.getMonth()+1)).slice(-2);
  var dd = ('0' + d.getDate()).slice(-2);
  return yy + '.' + mm + '.' + dd;
}

/**
 * Última linha com dados em uma coluna específica
 */
function getLastDataRow_(sheet, col) {
  var vals = sheet.getRange(1, col, sheet.getMaxRows(), 1).getValues();
  for (var i = vals.length - 1; i >= 0; i--) {
    if (vals[i][0] !== '' && vals[i][0] !== null) return i + 1;
  }
  return 1;
}

/**
 * Garante que a aba existe, cria se não
 */
function getOrCreateSheet_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
  }
  return sh;
}

/**
 * Token de autenticação para fetch
 */
function getAuthToken_() {
  return ScriptApp.getOAuthToken();
}


// ═══════════════════════════════════════════════════════════════
// ESTRUTURA — CRIAÇÃO DE ABAS
// ═══════════════════════════════════════════════════════════════

/**
 * BOTÃO: APLICAR ESTRUTURA COMPLETA
 * Cria abas, popula catálogo, formata tudo
 */
function aplicarEstruturaCompleta() {
  var ss = getSS_();
  var log = [];
  
  log.push('[INIT] Aplicando estrutura completa...');
  
  // 1. Garantir abas (NÃO criar GRAFICOS FINANCEIRO — fundido no FINANCEIRO)
  var abaCadSub = getOrCreateSheet_(ss, 'CADASTRO SUBSTANCIAS');
  var abaCadPac = getOrCreateSheet_(ss, 'CADASTRO PACIENTES');
  var abaCockpit = getOrCreateSheet_(ss, 'COCKPIT');
  var abaFin = getOrCreateSheet_(ss, 'FINANCEIRO');
  
  var abaRAS = ss.getSheetByName(ABA_PRINCIPAL);
  if (!abaRAS) {
    abaRAS = getOrCreateSheet_(ss, ABA_PRINCIPAL);
    log.push('[CRIADO] Aba TABELA GERAL');
  } else {
    log.push('[OK] Aba TABELA GERAL (existente)');
  }
  
  // 2. Catálogo de substâncias
  popularCatalogoSubstancias_(abaCadSub);
  log.push('[OK] Catalogo: ' + CATALOGO_SUBSTANCIAS.length + ' substancias');
  
  // 3. Corrigir RAS PROTOCOLOS (não destrói dados)
  corrigirRASProtocolos_(abaRAS);
  log.push('[OK] Estrutura TABELA GERAL verificada');
  
  // 4. Inserir EMAIL (ANTES do cadastro, p/ cadastro puxar email)
  var emailResult = inserirColunaEmail_();
  log.push(emailResult);
  
  // 5. Corrigir MES NASCIMENTO (#ERROR! + formato R$)
  corrigirMesNascimento_(abaRAS);
  log.push('[OK] Coluna G (MES nasc) corrigida: #ERROR! e R$ removidos');
  
  // 6. Numeração coluna A
  aplicarNumeracao_(abaRAS);
  log.push('[OK] Numeracao aplicada');
  
  // 7. Fórmulas financeiras (coluna L PENDENTE + cores)
  corrigirColunaFinanceira();
  log.push('[OK] Coluna L (PENDENTE) corrigida: formula IF + cores');
  
  // 8. CADASTRO PACIENTES — corrige o cabecalho (1 linha -> 2 linhas DIA/MES/ANO) SEM apagar dados
  var resCad = corrigirCabecalhoCadastro_(abaCadPac);
  log.push(resCad === 2 ? '[FIX] CADASTRO PACIENTES: cabecalho migrado p/ 2 linhas (DIA/MES/ANO) — dados preservados na linha 3+'
          : (resCad === 1 ? '[OK] CADASTRO PACIENTES: cabecalho ja estava correto (dados intactos)'
                          : '[OK] CADASTRO PACIENTES: cabecalho criado (estava vazio)'));
  
  // 9. COCKPIT (DEPOIS do cadastro — dropdown funciona)
  estruturarCockpit_(abaCockpit, ss);
  log.push('[OK] COCKPIT estruturado (3 blocos: paciente / data / substancias)');
  
  // 10. Formatação geral
  aplicarFormatacao_(abaRAS);
  log.push('[OK] Formatacao aplicada');
  
  // 11. Dashboard financeiro + gráficos
  atualizarAbaFinanceiro();
  log.push('[OK] Dashboard FINANCEIRO montado (resumo + graficos verticais)');
  
  // 12. Avisar sobre aba antiga
  var graficoAntigo = ss.getSheetByName('GRAFICOS FINANCEIRO');
  if (graficoAntigo) {
    log.push('[AVISO] Aba GRAFICOS FINANCEIRO antiga pode ser DELETADA (agora use a aba FINANCEIRO PACIENTE)');
  }
  
  log.push('[FIM] Estrutura completa aplicada com sucesso!');
  return log.join('\n');
}


/**
 * Popular aba CADASTRO SUBSTANCIAS com catálogo hardcoded
 */
function popularCatalogoSubstancias_(sheet) {
  // Limpar conteúdo existente
  sheet.clear();
  
  // Cabeçalhos
  var headers = [
    'NOME','DOSAGEM','CATEGORIA','VIA','FREQ (DIAS)','SESSOES',
    'PRECO UNIT','PRECO 3M','PRECO 6M','PRECO 12M',
    'CARDIO','OSTEO','IMUNO','NEURO','METAB'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground(COR.navy)
    .setFontColor(COR.branco)
    .setFontWeight('bold')
    .setFontSize(10);
  
  // Dados
  if (CATALOGO_SUBSTANCIAS.length > 0) {
    sheet.getRange(2, 1, CATALOGO_SUBSTANCIAS.length, CATALOGO_SUBSTANCIAS[0].length)
      .setValues(CATALOGO_SUBSTANCIAS);
  }
  
  // Formatação financeira nas colunas de preço (7-10)
  if (CATALOGO_SUBSTANCIAS.length > 0) {
    sheet.getRange(2, 7, CATALOGO_SUBSTANCIAS.length, 4)
      .setNumberFormat('R$ #,##0.00');
  }
  
  // Zebra
  for (var i = 0; i < CATALOGO_SUBSTANCIAS.length; i++) {
    var bg = (i % 2 === 0) ? COR.branco : COR.cinzaZebra;
    sheet.getRange(i + 2, 1, 1, headers.length).setBackground(bg);
  }
  
  // Auto-resize
  for (var c = 1; c <= headers.length; c++) {
    sheet.autoResizeColumn(c);
  }
}


/**
 * Estruturar CADASTRO PACIENTES e popular com dados da TABELA GERAL
 * Lê NOME, CPF, CELULAR, NASCIMENTO (DIA/MES/ANO) da aba existente.
 * EMAIL e campos que não existem ficam em branco.
 */
// Escreve SOMENTE o cabecalho de 2 linhas do CADASTRO (NAO toca em dados da linha 3+).
function garantirCabecalhoCadastro_(sheet) {
  try { sheet.getRange(1, 1, 2, 7).breakApart(); } catch (e) {}
  sheet.getRange(1, 1, 2, 7).clearContent();
  sheet.getRange(1, 1, 2, 1).merge().setValue('NOME DO PACIENTE');
  sheet.getRange(1, 2, 2, 1).merge().setValue('CPF');
  sheet.getRange(1, 3, 2, 1).merge().setValue('CELULAR');
  sheet.getRange(1, 4, 2, 1).merge().setValue('EMAIL');
  sheet.getRange(1, 5, 1, 3).merge().setValue('DATA NASCIMENTO');
  sheet.getRange(2, 5).setValue('DIA'); sheet.getRange(2, 6).setValue('MES'); sheet.getRange(2, 7).setValue('ANO');
  sheet.getRange(1, 1, 2, 7).setBackground(COR.navy).setFontColor(COR.branco).setFontWeight('bold')
    .setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.setFrozenRows(2);
}

// SEGURO: cria o cabecalho SOMENTE se a aba estiver vazia. Se ja houver QUALQUER dado,
// NAO TOCA EM NADA (nunca apaga o que o usuario digitou). Retorna 0 (criou) ou -1 (preservou).
function garantirCadastroSeguro_(sheet) {
  var lastRow = sheet.getLastRow();
  var temDados = false;
  if (lastRow >= 3) {
    temDados = true; // qualquer coisa na linha 3+ = dados do usuario
  } else if (lastRow >= 1) {
    var a1 = String(sheet.getRange(1, 1).getDisplayValue() || '').trim().toUpperCase();
    var a2 = String(sheet.getRange(2, 1).getDisplayValue() || '').trim();
    if ((a1 && a1 !== 'NOME DO PACIENTE' && a1 !== 'NOME') || a2) temDados = true;
  }
  if (temDados) return -1;            // tem dados -> NAO MEXE
  garantirCabecalhoCadastro_(sheet);  // vazio -> cria cabecalho
  return 0;
}

// Corrige o cabecalho do CADASTRO para o formato de 2 LINHAS (DATA NASCIMENTO + DIA/MES/ANO)
// SEM apagar dados. Se estiver no formato antigo (1 linha, dados na linha 2), insere uma linha
// em branco (empurra os dados p/ linha 3) e reescreve o cabecalho. Idempotente.
// Retorna: 0=criado (vazio) | 1=ja estava correto | 2=migrado (1 linha -> 2 linhas).
function corrigirCabecalhoCadastro_(sheet) {
  var e2 = String(sheet.getRange(2, 5).getDisplayValue() || '').trim().toUpperCase();
  // Ja esta no formato novo (linha 2, coluna E = DIA)?
  if (e2 === 'DIA') {
    garantirCabecalhoCadastro_(sheet); // reforca cabecalho (linhas 1-2); dados na linha 3+ intactos
    return 1;
  }
  // Detecta se ha dados (nome na coluna A, linha 2+)
  var last = sheet.getLastRow();
  var temDados = false;
  for (var r = 2; r <= Math.min(last, 8); r++) {
    var nm = String(sheet.getRange(r, 1).getDisplayValue() || '').trim().toUpperCase();
    if (nm && nm !== 'NOME' && nm !== 'NOME DO PACIENTE') { temDados = true; break; }
  }
  if (temDados) {
    // Formato ANTIGO com dados: dados comecam na linha 2. Inserir 1 linha em branco na posicao 2
    // -> todos os dados descem para a linha 3 (PRESERVADOS, insertRowBefore nao apaga nada).
    sheet.insertRowBefore(2);
  }
  garantirCabecalhoCadastro_(sheet); // escreve o cabecalho de 2 linhas
  return temDados ? 2 : 0;
}

function estruturarCadastroPacientes_(sheet) {
  var ss = getSS_();
  var abaRAS = ss.getSheetByName(ABA_PRINCIPAL);

  // ── 1. LER o que JÁ EXISTE no cadastro e PRESERVAR (nunca apagar o que o usuário digitou) ──
  var lastRow = sheet.getLastRow();
  var lastCol = Math.max(7, sheet.getLastColumn());
  var e1 = removerAcentos_(String(sheet.getRange(1, 5).getDisplayValue() || '')).toUpperCase();
  var e2 = removerAcentos_(String(sheet.getRange(2, 5).getDisplayValue() || '')).toUpperCase();
  var estruturaNova = (e2 === 'DIA') || (e1.indexOf('DATA NASCIMENTO') !== -1);
  var dataStart = estruturaNova ? 3 : 2; // estrutura antiga = dados na linha 2

  var existentes = []; // [nome, cpf, cel, email, dia, mes, ano]
  if (lastRow >= dataStart) {
    var raw = sheet.getRange(dataStart, 1, lastRow - dataStart + 1, lastCol).getValues();
    for (var i = 0; i < raw.length; i++) {
      var nome = String(raw[i][0] || '').trim();
      if (!nome) continue;
      var dia = '', mes = '', ano = '';
      if (estruturaNova) {
        dia = String(raw[i][4] || '').trim(); mes = String(raw[i][5] || '').trim(); ano = String(raw[i][6] || '').trim();
      } else {
        // estrutura antiga: coluna 5 = NASCIMENTO "DD/MM/AAAA" → migra para 3 colunas
        var partes = String(raw[i][4] || '').split(/[\/\-.]/);
        dia = (partes[0] || '').trim(); mes = (partes[1] || '').trim(); ano = (partes[2] || '').trim();
        if (dia === '??') dia = ''; if (mes === '??') mes = ''; if (ano === '????') ano = '';
      }
      existentes.push([nome, String(raw[i][1] || '').trim(), String(raw[i][2] || '').trim(), String(raw[i][3] || '').trim(), dia, mes, ano]);
    }
  }

  var idx = {};
  for (var j = 0; j < existentes.length; j++) {
    var nmj = removerAcentos_(String(existentes[j][0])).toUpperCase().trim();
    if (nmj && idx[nmj] === undefined) idx[nmj] = j;
  }

  // ── 2. MESCLAR com a TABELA GERAL: acrescenta quem falta + preenche SÓ campos vazios ──
  var adicionados = 0, preenchidos = 0;
  if (abaRAS) {
    var colNome = findColByHeader_(abaRAS, 'NOME DO PACIENTE'); if (colNome === -1) colNome = 2;
    var colCPF  = findColByHeader_(abaRAS, 'CPF');     if (colCPF === -1)  colCPF = 3;
    var colCel  = findColByHeader_(abaRAS, 'CELULAR'); if (colCel === -1)  colCel = 4;
    var colEmail = findColByHeader_(abaRAS, 'EMAIL');
    var blocoNasc = findBlocoDatas_(abaRAS, 'DATA NASCIMENTO');
    var lastRowTG = getLastDataRow_(abaRAS, colNome);
    if (lastRowTG >= 3) {
      var numTG = lastRowTG - 2;
      var cv = function (col, disp) {
        if (col <= 0) return [];
        var r = abaRAS.getRange(3, col, numTG, 1);
        return disp ? r.getDisplayValues() : r.getValues();
      };
      var lnum = function (v) {
        var s = String(v || '').trim();
        return (s.indexOf('#') !== -1 || s.toUpperCase().indexOf('ERROR') !== -1) ? '' : s;
      };
      var tgNomes = cv(colNome, false), tgCpfs = cv(colCPF, false), tgCels = cv(colCel, false);
      var tgEmails = colEmail > 0 ? cv(colEmail, false) : [];
      var tgDias = blocoNasc.dia > 0 ? cv(blocoNasc.dia, true) : [];
      var tgMeses = blocoNasc.mes > 0 ? cv(blocoNasc.mes, true) : [];
      var tgAnos = blocoNasc.ano > 0 ? cv(blocoNasc.ano, true) : [];
      var vistos = {};
      for (var t = 0; t < tgNomes.length; t++) {
        var nomeRaw = String(tgNomes[t][0] || '').trim();
        if (!nomeRaw) continue;
        var nomeNorm = removerAcentos_(nomeRaw).toUpperCase().trim();
        if (vistos[nomeNorm]) continue; vistos[nomeNorm] = true;
        var cpf = String(tgCpfs[t][0] || '').trim();
        var cel = String(tgCels[t][0] || '').trim();
        var email = tgEmails.length > t ? String(tgEmails[t][0] || '').trim() : '';
        var d2 = tgDias.length > t ? lnum(tgDias[t][0]) : '';
        var m2 = tgMeses.length > t ? lnum(tgMeses[t][0]) : '';
        var a2 = tgAnos.length > t ? lnum(tgAnos[t][0]) : '';
        if (idx[nomeNorm] !== undefined) {
          var row = existentes[idx[nomeNorm]];
          if (!row[1] && cpf) { row[1] = formatarCPF_(cpf); preenchidos++; }
          if (!row[2] && cel) { row[2] = formatarCelular_(cel); preenchidos++; }
          if (!row[3] && email) { row[3] = email; preenchidos++; }
          if (!row[4] && d2) { row[4] = d2; preenchidos++; }
          if (!row[5] && m2) { row[5] = m2; preenchidos++; }
          if (!row[6] && a2) { row[6] = a2; preenchidos++; }
        } else {
          existentes.push([removerAcentos_(nomeRaw).toUpperCase(), cpf ? formatarCPF_(cpf) : '', cel ? formatarCelular_(cel) : '', email, d2, m2, a2]);
          idx[nomeNorm] = existentes.length - 1;
          adicionados++;
        }
      }
    }
  }

  // ── 3. Reescrever: cabeçalho de 2 linhas + dados na linha 3 (dados já preservados em 'existentes') ──
  var clearRows = Math.max(sheet.getMaxRows(), 2);
  sheet.getRange(1, 1, clearRows, Math.max(7, lastCol)).clearContent();
  try { sheet.getRange(1, 1, 2, 7).breakApart(); } catch (e) {}
  sheet.getRange(1, 1, 2, 1).merge().setValue('NOME DO PACIENTE');
  sheet.getRange(1, 2, 2, 1).merge().setValue('CPF');
  sheet.getRange(1, 3, 2, 1).merge().setValue('CELULAR');
  sheet.getRange(1, 4, 2, 1).merge().setValue('EMAIL');
  sheet.getRange(1, 5, 1, 3).merge().setValue('DATA NASCIMENTO');
  sheet.getRange(2, 5).setValue('DIA'); sheet.getRange(2, 6).setValue('MES'); sheet.getRange(2, 7).setValue('ANO');
  sheet.getRange(1, 1, 2, 7).setBackground(COR.navy).setFontColor(COR.branco).setFontWeight('bold')
    .setFontSize(10).setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.setFrozenRows(2);

  if (existentes.length > 0) {
    sheet.getRange(3, 1, existentes.length, 7).setValues(existentes);
    for (var z = 0; z < existentes.length; z++) {
      sheet.getRange(z + 3, 1, 1, 7).setBackground((z % 2 === 0) ? COR.branco : COR.cinzaZebra);
    }
    sheet.getRange(3, 5, existentes.length, 3).setNumberFormat('0'); // DIA/MES/ANO número puro
  }
  for (var c = 1; c <= 7; c++) sheet.autoResizeColumn(c);

  return existentes.length;
}

/**
 * BOTÃO: POPULAR CADASTRO PACIENTES (standalone)
 * Pode ser chamado separadamente para atualizar a lista
 */
function popularCadastroPacientes() {
  var ss = getSS_();
  var sheet = getOrCreateSheet_(ss, 'CADASTRO PACIENTES');
  var count = estruturarCadastroPacientes_(sheet);
  return '[OK] CADASTRO PACIENTES sincronizado: ' + (count || 0) + ' pacientes no total\n' +
         '[SAFE] NAO-DESTRUTIVO: o que voce digitou (emails, datas) foi PRESERVADO\n' +
         '[INFO] So acrescentou quem faltava e preencheu campos vazios da TABELA GERAL';
}


/**
 * Estruturar COCKPIT com dropdowns
 */
function estruturarCockpit_(sheet, ss) {
  sheet.clear();
  // Desfazer merges/validacoes antigas (evita conflito de overlap ao re-mesclar)
  try { sheet.getRange(1, 1, sheet.getMaxRows(), Math.max(12, sheet.getMaxColumns())).breakApart(); } catch (e) {}
  sheet.getRange(1, 1, sheet.getMaxRows(), 12).clearDataValidations();

  var COLS = 9; // A:I

  // ═══ TITULO ═══
  sheet.getRange('A1:I1').merge().setValue('COCKPIT — CRIACAO DE PROTOCOLOS')
    .setFontSize(14).setFontWeight('bold').setBackground(COR.navy).setFontColor(COR.dourado)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.setRowHeight(1, 34);

  // ═══ 1. PACIENTE ═══
  sheet.getRange('A3:I3').merge().setValue('  1. PACIENTE')
    .setFontWeight('bold').setBackground(COR.navy).setFontColor(COR.branco).setHorizontalAlignment('left');
  sheet.getRange('A4').setValue('Selecione:').setFontWeight('bold').setHorizontalAlignment('left');
  sheet.getRange('B4:I4').merge().setBackground(COR.azulPastel)
    .setBorder(true, true, true, true, false, false, COR.azulSuave, SpreadsheetApp.BorderStyle.SOLID);
  var abaPac = ss.getSheetByName('CADASTRO PACIENTES');
  if (abaPac) {
    var rulePac = SpreadsheetApp.newDataValidation()
      .requireValueInRange(abaPac.getRange('A3:A500'), true).setAllowInvalid(false).build();
    sheet.getRange('B4').setDataValidation(rulePac);
  }

  // ═══ 2. DATA DE INICIO DO PROTOCOLO (padrao de todas as substancias) ═══
  sheet.getRange('A6:I6').merge().setValue('  2. DATA DE INICIO DO PROTOCOLO  (padrao de todas as substancias)')
    .setFontWeight('bold').setBackground('#1E7E34').setFontColor(COR.branco).setHorizontalAlignment('left');
  sheet.getRange('B7').setValue('DIA').setFontWeight('bold').setHorizontalAlignment('center').setBackground(COR.verdePastel);
  sheet.getRange('C7').setValue('MES').setFontWeight('bold').setHorizontalAlignment('center').setBackground(COR.verdePastel);
  sheet.getRange('D7').setValue('ANO').setFontWeight('bold').setHorizontalAlignment('center').setBackground(COR.verdePastel);
  sheet.getRange('B8:D8').setBackground(COR.branco)
    .setBorder(true, true, true, true, true, true, '#1E7E34', SpreadsheetApp.BorderStyle.SOLID)
    .setHorizontalAlignment('center').setFontSize(12).setNumberFormat('0');
  sheet.getRange('A8').setValue('Digite →').setFontWeight('bold').setHorizontalAlignment('left');

  // ═══ 3. SUBSTANCIAS ═══
  sheet.getRange('A10:I10').merge().setValue('  3. SUBSTANCIAS DO PROTOCOLO')
    .setFontWeight('bold').setBackground('#6A1B9A').setFontColor(COR.branco).setHorizontalAlignment('left');
  // Cabecalho em 2 linhas (11-12): SUBSTANCIA | SESSOES | FREQ | [INICIO -> DIA/MES/ANO]
  sheet.getRange('A11:C12').merge().setValue('  SUBSTANCIA').setFontWeight('bold')
    .setBackground('#E1BEE7').setHorizontalAlignment('left').setVerticalAlignment('middle');
  sheet.getRange('D11:D12').merge().setValue('SESSOES').setFontWeight('bold')
    .setBackground('#E1BEE7').setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.getRange('E11:F12').merge().setValue('FREQ (dias)').setFontWeight('bold')
    .setBackground('#E1BEE7').setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.getRange('G11:I11').merge().setValue('INICIO (opcional — vazio = data do protocolo)').setFontWeight('bold')
    .setBackground('#FFE0B2').setHorizontalAlignment('center').setFontSize(8).setWrap(true);
  sheet.getRange('G12').setValue('DIA').setFontWeight('bold').setHorizontalAlignment('center').setBackground('#FFE0B2').setFontSize(9);
  sheet.getRange('H12').setValue('MES').setFontWeight('bold').setHorizontalAlignment('center').setBackground('#FFE0B2').setFontSize(9);
  sheet.getRange('I12').setValue('ANO').setFontWeight('bold').setHorizontalAlignment('center').setBackground('#FFE0B2').setFontSize(9);

  // Linhas de substancia (13 a 27 = 15 linhas)
  var abaSub = ss.getSheetByName('CADASTRO SUBSTANCIAS');
  var ruleSub = null;
  if (abaSub) {
    ruleSub = SpreadsheetApp.newDataValidation()
      .requireValueInRange(abaSub.getRange('A2:A100'), true).setAllowInvalid(false).build();
  }
  for (var r = 13; r <= 27; r++) {
    var bg = (r % 2 === 1) ? COR.branco : '#F3E5F5';
    sheet.getRange(r, 1, 1, 3).merge().setBackground(bg).setHorizontalAlignment('left'); // A:C dropdown
    if (ruleSub) sheet.getRange(r, 1).setDataValidation(ruleSub);
    sheet.getRange(r, 4).setBackground(bg).setHorizontalAlignment('center'); // D sessoes
    sheet.getRange(r, 5, 1, 2).merge().setBackground(bg).setHorizontalAlignment('center'); // E:F freq
    sheet.getRange(r, 7, 1, 3).setBackground('#FFF3E0').setHorizontalAlignment('center').setNumberFormat('0'); // G/H/I = DIA/MES/ANO
  }
  sheet.getRange(11, 1, 17, COLS)
    .setBorder(true, true, true, true, false, false, '#6A1B9A', SpreadsheetApp.BorderStyle.SOLID);

  // ═══ INSTRUCOES ═══
  sheet.getRange('A29').setValue('INSTRUCOES:').setFontWeight('bold').setFontSize(11);
  sheet.getRange('A30').setValue('1. Selecione o PACIENTE no dropdown (B4)');
  sheet.getRange('A31').setValue('2. Digite DIA / MES / ANO de inicio do protocolo (B8 / C8 / D8)');
  sheet.getRange('A32').setValue('3. Selecione SUBSTANCIAS na coluna A (A13 ate A27)');
  sheet.getRange('A33').setValue('4. Digite SESSOES (col D) e FREQ em dias (col E)');
  sheet.getRange('A34').setValue('5. INICIO (G/H/I): deixe VAZIO p/ usar a data do protocolo. Preencha DIA/MES/ANO so p/ intercalar (ex: VIT B12 1 semana depois)');
  sheet.getRange('A35').setValue('6. Clique LANCAR PROTOCOLO no painel');

  // Larguras
  sheet.setColumnWidth(1, 110); sheet.setColumnWidth(2, 70); sheet.setColumnWidth(3, 70);
  sheet.setColumnWidth(4, 90); sheet.setColumnWidth(5, 70); sheet.setColumnWidth(6, 70);
  sheet.setColumnWidth(7, 50); sheet.setColumnWidth(8, 50); sheet.setColumnWidth(9, 55);
}
function corrigirRASProtocolos_(sheet) {
  // Verificar se linha 1 tem os cabeçalhos mínimos
  var h1 = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var colB = findColByHeader_(sheet, 'NOME DO PACIENTE');
  
  // Se não encontrou cabeçalhos básicos, não mexe (a aba já existe com dados)
  if (colB === -1 && h1[1] && String(h1[1]).trim() !== '') {
    // Tem dados mas sem header "NOME DO PACIENTE" — pode ser outro formato
    // Não destruir dados existentes
    return;
  }
}


/**
 * Aplicar numeração 1-500 na coluna A
 */
function aplicarNumeracao_(sheet) {
  var colA = findColByHeader_(sheet, '#');
  if (colA === -1) colA = 1; // fallback
  
  var nums = [];
  for (var i = 1; i <= 500; i++) {
    nums.push([i]);
  }
  // Verificar se existe linha 2 (dados começam em 3 geralmente, ou 2)
  var startRow = 3; // Dados começam na linha 3 (linha 1=header, 2=subheader)
  var existingStart = sheet.getRange(2, colA).getValue();
  if (existingStart === '' || existingStart === 1 || existingStart === '#') {
    startRow = 3;
  }
  
  sheet.getRange(startRow, colA, 500, 1).setValues(nums);
}


// ═══════════════════════════════════════════════════════════════
// NORMALIZAÇÃO — NOMES + CPF + CELULAR
// ═══════════════════════════════════════════════════════════════

/**
 * BOTÃO: NORMALIZAR NOMES + CPF + CELULAR
 * REGRA: SOMENTE colunas B (nome), C (CPF), D (celular). NUNCA E/F/G.
 */
function normalizarNomesCpfCelularRAS() {
  var ss = getSS_();
  var sheet = ss.getSheetByName(ABA_PRINCIPAL);
  if (!sheet) return 'ERRO: Aba TABELA GERAL nao encontrada';
  
  var log = [];
  log.push('[INIT] Normalizando B/C/D...');
  
  // Buscar colunas por nome
  var colB = findColByHeader_(sheet, 'NOME DO PACIENTE');
  var colC = findColByHeader_(sheet, 'CPF');
  var colD = findColByHeader_(sheet, 'CELULAR');
  
  if (colB === -1) { log.push('[WARN] Coluna NOME DO PACIENTE nao encontrada'); colB = 2; }
  if (colC === -1) { log.push('[WARN] Coluna CPF nao encontrada'); colC = 3; }
  if (colD === -1) { log.push('[WARN] Coluna CELULAR nao encontrada'); colD = 4; }
  
  var lastRow = getLastDataRow_(sheet, colB);
  if (lastRow < 3) { return log.join('\n') + '\n[FIM] Sem dados para normalizar'; }
  
  // Ler SOMENTE as 3 colunas individualmente
  var nomes = sheet.getRange(3, colB, lastRow - 2, 1).getValues();
  var cpfs  = sheet.getRange(3, colC, lastRow - 2, 1).getValues();
  var cels  = sheet.getRange(3, colD, lastRow - 2, 1).getValues();
  
  var countN = 0, countC = 0, countCel = 0;
  
  for (var i = 0; i < nomes.length; i++) {
    // Nome: uppercase sem acento
    if (nomes[i][0]) {
      var original = String(nomes[i][0]);
      var normalizado = removerAcentos_(original).toUpperCase().trim();
      if (normalizado !== original) {
        nomes[i][0] = normalizado;
        countN++;
      }
    }
    // CPF: formato XXX.XXX.XXX-XX
    if (cpfs[i][0]) {
      var cpfOrig = String(cpfs[i][0]);
      var cpfFmt = formatarCPF_(cpfOrig);
      if (cpfFmt !== cpfOrig) {
        cpfs[i][0] = cpfFmt;
        countC++;
      }
    }
    // Celular: formato (XX) XXXXX-XXXX
    if (cels[i][0]) {
      var celOrig = String(cels[i][0]);
      var celFmt = formatarCelular_(celOrig);
      if (celFmt !== celOrig) {
        cels[i][0] = celFmt;
        countCel++;
      }
    }
  }
  
  // Gravar SOMENTE as 3 colunas de volta (NUNCA E/F/G)
  sheet.getRange(3, colB, nomes.length, 1).setValues(nomes);
  sheet.getRange(3, colC, cpfs.length, 1).setValues(cpfs);
  sheet.getRange(3, colD, cels.length, 1).setValues(cels);
  
  log.push('[OK] Nomes normalizados: ' + countN);
  log.push('[OK] CPFs formatados: ' + countC);
  log.push('[OK] Celulares formatados: ' + countCel);
  log.push('[SAFE] Colunas E/F/G NAO tocadas');
  log.push('[FIM] Normalizacao concluida');
  
  return log.join('\n');
}


// ═══════════════════════════════════════════════════════════════
// MOTOR FINANCEIRO
// ═══════════════════════════════════════════════════════════════

/**
 * BOTÃO: CORRIGIR COLUNA FINANCEIRA
 * Busca VALOR TRATAMENTO / VALOR PAGO / VALOR PENDENTE por header name
 * Aplica fórmula IF (inglês!) com IFERROR
 */
function corrigirColunaFinanceira() {
  var ss = getSS_();
  var sheet = ss.getSheetByName(ABA_PRINCIPAL);
  if (!sheet) return 'ERRO: Aba TABELA GERAL nao encontrada';
  
  var log = [];
  log.push('[INIT] Corrigindo colunas financeiras...');
  
  var colI = findColByHeader_(sheet, 'VALOR TRATAMENTO'); // ex: J
  var colJ = findColByHeader_(sheet, 'VALOR PAGO');        // ex: K
  var colK = findColByHeader_(sheet, 'VALOR PENDENTE');    // ex: L
  
  if (colI === -1) { log.push('[WARN] VALOR TRATAMENTO nao encontrado'); return log.join('\n'); }
  if (colJ === -1) { log.push('[WARN] VALOR PAGO nao encontrado'); return log.join('\n'); }
  if (colK === -1) { log.push('[WARN] VALOR PENDENTE nao encontrado'); return log.join('\n'); }
  
  var lastRow = Math.max(getLastDataRow_(sheet, colI), getLastDataRow_(sheet, colJ), 3);
  var numRows = lastRow - 2;
  if (numRows < 1) { log.push('[WARN] Sem dados'); return log.join('\n'); }
  
  // ─── Ler TRATAMENTO e PAGO (display, p/ lidar com texto "R$ x") ───
  var tratVals = sheet.getRange(3, colI, numRows, 1).getDisplayValues();
  var pagoVals = sheet.getRange(3, colJ, numRows, 1).getDisplayValues();
  
  // ─── Calcular PENDENTE = TRATAMENTO - PAGO (NUMERO, sem formula) ───
  // >0 = deve (vermelho) | <=0 = quitado (verde). SEM #ERROR de locale.
  // SEGURANCA: NAO reescreve tratamento/pago (evita apagar dados).
  var pendVals = [];
  for (var i = 0; i < numRows; i++) {
    var trat = parseMoneyBR_(tratVals[i][0]);
    var pago = parseMoneyBR_(pagoVals[i][0]);
    if (trat === null) {
      pendVals.push(['']); // sem tratamento → pendente vazio
    } else {
      pendVals.push([trat - (pago || 0)]);
    }
  }
  
  // ─── Gravar SO o PENDENTE (numero puro) ───
  sheet.getRange(3, colK, numRows, 1).setValues(pendVals);
  
  // ─── Formato R$ (formato nao altera valores existentes) ───
  sheet.getRange(3, colI, numRows, 1).setNumberFormat('R$ #,##0.00');
  sheet.getRange(3, colJ, numRows, 1).setNumberFormat('R$ #,##0.00');
  sheet.getRange(3, colK, numRows, 1).setNumberFormat('R$ #,##0.00;[Red]-R$ #,##0.00;R$ 0.00');
  
  // ─── LIMPAR regras condicionais ANTIGAS (evita verde vazando na col G) ───
  // Mantém apenas regras que NÃO tocam as colunas financeiras nem nascimento.
  var oldRules = sheet.getConditionalFormatRules();
  var keptRules = [];
  for (var ri = 0; ri < oldRules.length; ri++) {
    var ranges = oldRules[ri].getRanges();
    var tocaFin = false;
    for (var rj = 0; rj < ranges.length; rj++) {
      var cStart = ranges[rj].getColumn();
      var cEnd = cStart + ranges[rj].getNumColumns() - 1;
      // Se a regra cobre QUALQUER coluna entre A e a coluna pendente, descartar
      if (cStart <= colK && cEnd >= 1) { tocaFin = true; break; }
    }
    if (!tocaFin) keptRules.push(oldRules[ri]);
  }
  
  // ─── Cor condicional SÓ na coluna PENDENTE: >0 vermelho, <=0 verde ───
  var rangePend = sheet.getRange(3, colK, numRows, 1);
  var ruleDeve = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(0)
    .setFontColor(COR.vermelhoNg)
    .setRanges([rangePend])
    .build();
  var ruleQuitado = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThanOrEqualTo(0)
    .setFontColor(COR.verdeOk)
    .setRanges([rangePend])
    .build();
  
  keptRules.push(ruleDeve);
  keptRules.push(ruleQuitado);
  sheet.setConditionalFormatRules(keptRules);
  
  log.push('[OK] PENDENTE calculado como NUMERO (sem formula, sem #ERROR)');
  log.push('[OK] ' + numRows + ' linhas. Formato R$ aplicado');
  log.push('[OK] Regras condicionais antigas limpas (col G nao fica mais verde)');
  log.push('[OK] Cores: deve=vermelho, quitado=verde (SO na coluna PENDENTE)');
  log.push('[FIM] Colunas financeiras corrigidas');
  
  return log.join('\n');
}

/**
 * Converte número de coluna para letra (1=A, 27=AA, etc.)
 */
function columnToLetter_(col) {
  var letter = '';
  while (col > 0) {
    var mod = (col - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}


// ═══════════════════════════════════════════════════════════════
// CORREÇÃO COLUNA CONSULTA
// ═══════════════════════════════════════════════════════════════

/**
 * BOTÃO: CORRIGIR COLUNA CONSULTA
 * Busca CONSULTA MEDICA DIA/MES/ANO pelo nome do header,
 * depois busca TODAS as substâncias com SIM cujas datas estão VAZIAS
 * e propaga as datas da consulta.
 *
 * BUG CORRIGIDO: headerMap retorna coluna 1-indexed, mas headers[] é 0-indexed.
 * Agora usa idx (0-indexed) para arrays e col1 (1-indexed) para getRange.
 */
function corrigirColunaConsulta() {
  var ss = getSS_();
  var sheet = ss.getSheetByName(ABA_PRINCIPAL);
  if (!sheet) return 'ERRO: Aba TABELA GERAL nao encontrada';
  
  var log = [];
  log.push('[INIT] Corrigindo datas de consulta...');
  
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0]; // 0-indexed array
  var headers2 = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
  
  // ─── 1. Achar DIA/MES/ANO da CONSULTA MEDICA (helper central) ───
  var consulta = findBlocoDatas_(sheet, 'CONSULTA MEDICA');
  var colDiaConsulta1 = consulta.dia;
  var colMesConsulta1 = consulta.mes;
  var colAnoConsulta1 = consulta.ano;
  
  if (colDiaConsulta1 === -1) {
    log.push('[ERRO] DIA da CONSULTA MEDICA nao encontrado');
    return log.join('\n');
  }
  
  log.push('[OK] CONSULTA MEDICA DIA=col ' + colDiaConsulta1 + 
           ', MES=col ' + colMesConsulta1 + 
           ', ANO=col ' + colAnoConsulta1);
  
  // ─── 2. Identificar inicio das substâncias (após RETORNO MEDICO) ───
  var substanciaStartIdx = -1; // 0-indexed
  for (var i = 0; i < headers.length; i++) {
    var h1 = normalizeHeader_(headers[i]);
    if (h1.indexOf('RETORNO') !== -1 && h1.indexOf('MEDICO') !== -1) {
      substanciaStartIdx = i + 6; // pular o bloco RETORNO (6 colunas)
      break;
    }
  }
  if (substanciaStartIdx === -1) {
    // Fallback: após CONSULTA MEDICA + 12 (CONSULTA 6 + RETORNO 6)
    if (consulta.start > 0) substanciaStartIdx = (consulta.start - 1) + 12;
  }
  if (substanciaStartIdx === -1 || substanciaStartIdx >= headers.length) {
    log.push('[ERRO] Nao encontrou inicio das substancias');
    return log.join('\n');
  }
  
  log.push('[OK] Substancias começam no idx ' + substanciaStartIdx + ' (col ' + (substanciaStartIdx + 1) + ')');
  
  // ─── 3. Mapear blocos de substância (6 colunas cada) ───
  var blocosSubst = [];
  for (var i = substanciaStartIdx; i < headers.length; i += 6) {
    var h1 = normalizeHeader_(headers[i]);
    if (!h1 && !normalizeHeader_(headers2[i])) continue;
    blocosSubst.push({
      idx0: i,
      col1: i + 1,
      nome: headers[i] || headers2[i] || ('COL_' + i)
    });
  }
  
  log.push('[OK] ' + blocosSubst.length + ' blocos de substancia encontrados');
  
  // ─── 4. Batch read dados ───
  var colNome = findColByHeader_(sheet, 'NOME DO PACIENTE');
  if (colNome === -1) colNome = 2;
  var lastRow = getLastDataRow_(sheet, colNome);
  if (lastRow < 3) { return log.join('\n') + '\n[FIM] Sem dados'; }
  
  var numRows = lastRow - 2;
  var allData = sheet.getRange(3, 1, numRows, lastCol).getValues();
  var count = 0;
  var skipped = 0;
  
  // ─── 5. Para cada paciente, propagar datas ───
  for (var r = 0; r < allData.length; r++) {
    var diaBase = allData[r][colDiaConsulta1 - 1]; // 1-indexed → 0-indexed
    var mesBase = allData[r][colMesConsulta1 - 1];
    var anoBase = allData[r][colAnoConsulta1 - 1];
    
    if (!diaBase && !mesBase && !anoBase) continue;
    
    for (var b = 0; b < blocosSubst.length; b++) {
      var bloco = blocosSubst[b];
      var simIdx0 = bloco.idx0;
      var diaIdx0 = bloco.idx0 + 3;
      var mesIdx0 = bloco.idx0 + 4;
      var anoIdx0 = bloco.idx0 + 5;
      
      if (anoIdx0 >= lastCol) continue;
      
      var simVal = String(allData[r][simIdx0] || '').toUpperCase().trim();
      if (simVal !== 'SIM' && simVal !== 'S' && simVal !== 'X') continue;
      
      // REGRA: NÃO sobrescrever datas já preenchidas
      var diaExistente = allData[r][diaIdx0];
      var mesExistente = allData[r][mesIdx0];
      var anoExistente = allData[r][anoIdx0];
      
      if (diaExistente || mesExistente || anoExistente) {
        skipped++;
        continue;
      }
      
      var sheetRow = r + 3;
      sheet.getRange(sheetRow, diaIdx0 + 1).setValue(diaBase);
      sheet.getRange(sheetRow, mesIdx0 + 1).setValue(mesBase);
      sheet.getRange(sheetRow, anoIdx0 + 1).setValue(anoBase);
      count++;
    }
  }
  
  log.push('[OK] Datas propagadas para ' + count + ' substancias');
  log.push('[SAFE] ' + skipped + ' substancias com data ja preenchida — NAO sobrescritas');
  log.push('[FIM] Correcao de consulta concluida');
  
  return log.join('\n');
}


// ═══════════════════════════════════════════════════════════════
// FORMATAÇÃO
// ═══════════════════════════════════════════════════════════════

/**
 * Aplicar formatação visual na aba RAS PROTOCOLOS
 */
function aplicarFormatacao_(sheet) {
  // Linhas 1-2: cabeçalho
  var lastCol = sheet.getLastColumn();
  if (lastCol < 2) return;
  
  sheet.getRange(1, 1, 2, lastCol)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);
  
  // Linha 1: fundo navy, texto branco
  sheet.getRange(1, 1, 1, lastCol)
    .setBackground(COR.navy)
    .setFontColor(COR.branco)
    .setFontSize(9);
  
  // Linha 2: fundo cinza
  sheet.getRange(2, 1, 1, lastCol)
    .setBackground(COR.cinzaZebra)
    .setFontColor(COR.navy)
    .setFontSize(8);
  
  // Headers uppercase sem acento
  var h1 = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var h2 = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
  for (var c = 0; c < lastCol; c++) {
    h1[c] = removerAcentos_(String(h1[c] || '')).toUpperCase();
    h2[c] = removerAcentos_(String(h2[c] || '')).toUpperCase();
  }
  sheet.getRange(1, 1, 1, lastCol).setValues([h1]);
  sheet.getRange(2, 1, 1, lastCol).setValues([h2]);
  
  // Congelar linhas 1-2
  sheet.setFrozenRows(2);
}


// ═══════════════════════════════════════════════════════════════
// VALIDAÇÃO DE PASTAS
// ═══════════════════════════════════════════════════════════════

function validarPastas() {
  var log = [];
  log.push('[INIT] Validando pastas...');
  
  try {
    var f1 = DriveApp.getFolderById(PASTA_TRANSFERENCIA);
    log.push('[OK] TRANSFERENCIA: ' + f1.getName());
  } catch(e) { log.push('[ERRO] TRANSFERENCIA nao encontrada: ' + PASTA_TRANSFERENCIA); }
  
  try {
    var f2 = DriveApp.getFolderById(PASTA_RAS_CLIENTES);
    log.push('[OK] RAS CLIENTES: ' + f2.getName());
  } catch(e) { log.push('[ERRO] RAS CLIENTES nao encontrada: ' + PASTA_RAS_CLIENTES); }
  
  try {
    var f3 = DriveApp.getFolderById(PASTA_FINANCEIRO);
    log.push('[OK] FINANCEIRO: ' + f3.getName());
  } catch(e) { log.push('[ERRO] FINANCEIRO nao encontrada: ' + PASTA_FINANCEIRO); }
  
  // Verificar pasta JURIDICO dedicada
  try {
    var f4 = DriveApp.getFolderById(PASTA_JURIDICO);
    log.push('[OK] JURIDICO: ' + f4.getName());
  } catch(e) { log.push('[ERRO] JURIDICO nao encontrada: ' + PASTA_JURIDICO); }
  
  log.push('[FIM] Validacao concluida');
  return log.join('\n');
}


// ═══════════════════════════════════════════════════════════════
// MOTOR DE CONFLUÊNCIA SEMANAL
// ═══════════════════════════════════════════════════════════════

/**
 * Regra Ouro: agrupa substâncias por semana e elege dia de maior confluência
 * @param {Array} substancias - [{nome, freqDias, sessoes, dataInicio}]
 * @returns {Array} - [{data, substancias: [{nome, sessao}]}]
 */
function calcularConfluencia_(substancias) {
  if (!substancias || substancias.length === 0) return [];
  
  // 1. Gerar todas as datas brutas para cada substância
  var todasDatas = {}; // chave: timestamp, valor: [{nome, sessao}]
  
  substancias.forEach(function(sub) {
    var dt = new Date(sub.dataInicio);
    for (var s = 1; s <= sub.sessoes; s++) {
      var key = dt.getTime();
      if (!todasDatas[key]) todasDatas[key] = [];
      todasDatas[key].push({nome: sub.nome, sessao: s + '/' + sub.sessoes});
      dt = new Date(dt.getTime() + sub.freqDias * 86400000);
    }
  });
  
  // 2. Agrupar por semana (segunda a domingo)
  var semanas = {}; // chave: timestamp da segunda-feira
  for (var ts in todasDatas) {
    var d = new Date(Number(ts));
    var dia = d.getDay(); // 0=dom, 1=seg...
    var seg = new Date(d);
    seg.setDate(d.getDate() - ((dia + 6) % 7)); // volta pra segunda
    seg.setHours(0,0,0,0);
    var semanaKey = seg.getTime();
    
    if (!semanas[semanaKey]) semanas[semanaKey] = {};
    
    var diaKey = d.getTime();
    if (!semanas[semanaKey][diaKey]) semanas[semanaKey][diaKey] = [];
    todasDatas[ts].forEach(function(item) {
      semanas[semanaKey][diaKey].push(item);
    });
  }
  
  // 3. Para cada semana, eleger o dia com maior confluência
  var resultado = [];
  var semanaKeys = Object.keys(semanas).sort(function(a,b) { return Number(a) - Number(b); });
  
  semanaKeys.forEach(function(sk) {
    var dias = semanas[sk];
    var melhorDia = null;
    var maxCount = 0;
    
    for (var dk in dias) {
      var count = dias[dk].length;
      if (count > maxCount || (count === maxCount && (!melhorDia || Number(dk) < melhorDia))) {
        maxCount = count;
        melhorDia = Number(dk);
      }
    }
    
    if (melhorDia) {
      // Todas as substâncias da semana vão para o dia eleito
      var substsSemana = [];
      for (var dk in dias) {
        dias[dk].forEach(function(item) {
          substsSemana.push(item);
        });
      }
      resultado.push({
        data: new Date(melhorDia),
        substancias: substsSemana
      });
    }
  });
  
  return resultado;
}


// ═══════════════════════════════════════════════════════════════
// LANÇAR PROTOCOLO (DO COCKPIT PARA TABELA GERAL)
// ═══════════════════════════════════════════════════════════════

/**
 * Busca identidade do paciente no CADASTRO PACIENTES por nome.
 * CADASTRO PACIENTES: NOME(1) | CPF(2) | CELULAR(3) | EMAIL(4) | NASCIMENTO(5)
 * @returns {Object} { found, cpf, celular, email, nascDia, nascMes, nascAno }
 */
function buscarPacienteCadastro_(nome) {
  var ss = getSS_();
  var cad = ss.getSheetByName('CADASTRO PACIENTES');
  var out = { found: false, cpf: '', celular: '', email: '', nascDia: '', nascMes: '', nascAno: '' };
  if (!cad) return out;

  var last = cad.getLastRow();
  if (last < 3) return out; // 2 linhas de cabecalho; dados a partir da linha 3

  // NOME(1) CPF(2) CELULAR(3) EMAIL(4) DIA(5) MES(6) ANO(7)
  var dados = cad.getRange(3, 1, last - 2, 7).getValues();
  var alvo = removerAcentos_(String(nome)).toUpperCase().trim();

  function nzc_(v){ return (v === '' || v === null || v === undefined) ? '' : v; }

  for (var i = 0; i < dados.length; i++) {
    var n = removerAcentos_(String(dados[i][0])).toUpperCase().trim();
    if (n === alvo) {
      out.found = true;
      out.cpf = dados[i][1] || '';
      out.celular = dados[i][2] || '';
      out.email = dados[i][3] || '';
      out.nascDia = nzc_(dados[i][4]);
      out.nascMes = nzc_(dados[i][5]);
      out.nascAno = nzc_(dados[i][6]);
      break;
    }
  }
  return out;
}


/**
 * RECONCILIA CADASTRO PACIENTES ⇄ TABELA GERAL.
 * Preenche SOMENTE celulas VAZIAS — NUNCA sobrescreve dado existente.
 * Casa por nome normalizado. Campos: CPF, CELULAR, EMAIL, NASCIMENTO.
 * Formata CPF/celular ao gravar. Reporta o que preencheu, conflitos e quem ainda falta.
 * (Leitura/escrita em lote pra nao estourar o limite de 6 min.)
 */
// Sincroniza CADASTRO PACIENTES <-> TABELA GERAL por nome normalizado.
// modo 'CAD_PARA_TG' = só CADASTRO → TABELA ; modo 'BIDIR' = preenche vazios dos dois lados.
// Preenche SOMENTE células vazias (NUNCA sobrescreve). CADASTRO: 7 colunas, dados na linha 3.
function sincronizarCadastroTabela_(modo) {
  var ss = getSS_();
  var tg = ss.getSheetByName(ABA_PRINCIPAL);
  var cad = ss.getSheetByName('CADASTRO PACIENTES');
  if (!tg || !cad) return JSON.stringify({error: 'Abas TABELA GERAL / CADASTRO PACIENTES nao encontradas'});

  var log = [];
  var nTG = 0, nCAD = 0, conflitos = 0;

  // Colunas da TABELA GERAL (por header, com fallback)
  var tgNome = findColByHeader_(tg, 'NOME DO PACIENTE'); if (tgNome === -1) tgNome = 2;
  var tgCpf  = findColByHeader_(tg, 'CPF');     if (tgCpf === -1)  tgCpf = tgNome + 1;
  var tgCel  = findColByHeader_(tg, 'CELULAR'); if (tgCel === -1)  tgCel = tgNome + 2;
  var tgEmail= findColByHeader_(tg, 'EMAIL');   if (tgEmail === -1) tgEmail = tgNome + 3;
  var tgNasc = findBlocoDatas_(tg, 'DATA NASCIMENTO');

  var tgLast = getLastDataRow_(tg, tgNome);
  var nLin = Math.max(0, tgLast - 2);
  function colArr_(sheet, col, startRow, n) {
    if (col <= 0 || n <= 0) return [];
    return sheet.getRange(startRow, col, n, 1).getValues().map(function(r){ return r[0]; });
  }
  var tgNomes = colArr_(tg, tgNome, 3, nLin);
  var tgCpfs  = colArr_(tg, tgCpf, 3, nLin);
  var tgCels  = colArr_(tg, tgCel, 3, nLin);
  var tgEmails= colArr_(tg, tgEmail, 3, nLin);
  var tgDias  = tgNasc.dia > 0 ? colArr_(tg, tgNasc.dia, 3, nLin) : [];
  var tgMeses = tgNasc.mes > 0 ? colArr_(tg, tgNasc.mes, 3, nLin) : [];
  var tgAnos  = tgNasc.ano > 0 ? colArr_(tg, tgNasc.ano, 3, nLin) : [];

  var idxTG = {};
  for (var i = 0; i < tgNomes.length; i++) {
    var nm = removerAcentos_(String(tgNomes[i])).toUpperCase().trim();
    if (nm && idxTG[nm] === undefined) idxTG[nm] = i;
  }

  // CADASTRO PACIENTES: 7 colunas (NOME,CPF,CELULAR,EMAIL,DIA,MES,ANO), dados a partir da linha 3
  var cadLast = cad.getLastRow();
  var nCad = Math.max(0, cadLast - 2);
  var cadData = nCad > 0 ? cad.getRange(3, 1, nCad, 7).getValues() : [];

  function dig_(s){ return String(s||'').replace(/\D/g,''); }
  function nz_(v){ return String(v == null ? '' : v).trim(); }

  for (var c = 0; c < cadData.length; c++) {
    var nomeCad = removerAcentos_(String(cadData[c][0])).toUpperCase().trim();
    if (!nomeCad) continue;
    var ti = idxTG[nomeCad];
    if (ti === undefined) continue;

    var cpfCad = nz_(cadData[c][1]), celCad = nz_(cadData[c][2]), emailCad = nz_(cadData[c][3]);
    var diaCad = nz_(cadData[c][4]), mesCad = nz_(cadData[c][5]), anoCad = nz_(cadData[c][6]);
    var cpfTG = nz_(tgCpfs[ti]), celTG = nz_(tgCels[ti]), emailTG = nz_(tgEmails[ti]);
    var diaTG = nz_(tgDias[ti]), mesTG = nz_(tgMeses[ti]), anoTG = nz_(tgAnos[ti]);

    // ── CADASTRO → TABELA GERAL (preenche TG vazio) ──
    if (!cpfTG && cpfCad) { tgCpfs[ti] = formatarCPF_(cpfCad); nTG++; log.push('[TG] ' + nomeCad + ': CPF'); }
    else if (cpfTG && cpfCad && dig_(cpfTG) !== dig_(cpfCad)) { conflitos++; log.push('[CONFLITO CPF] ' + nomeCad + ' cad=' + cpfCad + ' tg=' + cpfTG); }
    if (!celTG && celCad) { tgCels[ti] = formatarCelular_(celCad); nTG++; log.push('[TG] ' + nomeCad + ': celular'); }
    if (!emailTG && emailCad) { tgEmails[ti] = emailCad; nTG++; log.push('[TG] ' + nomeCad + ': email'); }
    if (tgNasc.dia > 0 && !diaTG && diaCad) { tgDias[ti] = diaCad; nTG++; log.push('[TG] ' + nomeCad + ': dia nasc'); }
    if (tgNasc.mes > 0 && !mesTG && mesCad) { tgMeses[ti] = mesCad; nTG++; }
    if (tgNasc.ano > 0 && !anoTG && anoCad) { tgAnos[ti] = anoCad; nTG++; }

    // ── TABELA GERAL → CADASTRO (só no modo BIDIR, preenche CADASTRO vazio) ──
    if (modo === 'BIDIR') {
      if (!cpfCad && cpfTG) { cadData[c][1] = formatarCPF_(cpfTG); nCAD++; }
      if (!celCad && celTG) { cadData[c][2] = formatarCelular_(celTG); nCAD++; }
      if (!emailCad && emailTG) { cadData[c][3] = emailTG; nCAD++; }
      if (!diaCad && diaTG) { cadData[c][4] = diaTG; nCAD++; }
      if (!mesCad && mesTG) { cadData[c][5] = mesTG; nCAD++; }
      if (!anoCad && anoTG) { cadData[c][6] = anoTG; nCAD++; }
    }
  }

  // ── Gravar de volta (só colunas tocadas) ──
  function writeCol_(sheet, col, startRow, arr) {
    if (col <= 0 || !arr.length) return;
    sheet.getRange(startRow, col, arr.length, 1).setValues(arr.map(function(v){ return [v]; }));
  }
  writeCol_(tg, tgCpf, 3, tgCpfs);
  writeCol_(tg, tgCel, 3, tgCels);
  writeCol_(tg, tgEmail, 3, tgEmails);
  if (tgNasc.dia > 0) writeCol_(tg, tgNasc.dia, 3, tgDias);
  if (tgNasc.mes > 0) writeCol_(tg, tgNasc.mes, 3, tgMeses);
  if (tgNasc.ano > 0) writeCol_(tg, tgNasc.ano, 3, tgAnos);
  if (modo === 'BIDIR' && nCad > 0) cad.getRange(3, 1, nCad, 7).setValues(cadData);

  var titulo = (modo === 'BIDIR') ? 'RECONCILIACAO CADASTRO <-> TABELA' : 'LANCAMENTO CADASTRO -> TABELA GERAL';
  log.unshift('[FIM] ' + titulo + ' | TABELA GERAL preenchida: ' + nTG +
              (modo === 'BIDIR' ? ' | CADASTRO preenchido: ' + nCAD : '') + ' | Conflitos: ' + conflitos);
  return JSON.stringify({ log: log.join('\n'), preenchidosTG: nTG, preenchidosCAD: nCAD, conflitos: conflitos });
}

// Reconciliação bidirecional (preenche vazios dos dois lados)
function reconciliarCadastro_() { return sincronizarCadastroTabela_('BIDIR'); }

// BOTÃO: joga tudo do CADASTRO PACIENTES para a TABELA GERAL (nome, CPF, celular, email, dia/mes/ano)
function lancarCadastroNaTabelaGeral_() { return sincronizarCadastroTabela_('CAD_PARA_TG'); }

function runReconciliarCadastro() { return reconciliarCadastro_(); }
function runCorrigirCabecalhoCadastro() {
  var ss = getSS_();
  var r = corrigirCabecalhoCadastro_(getOrCreateSheet_(ss, 'CADASTRO PACIENTES'));
  return r === 2 ? '[FIX] Cabecalho do CADASTRO migrado p/ 2 linhas (DATA NASCIMENTO + DIA/MES/ANO). Dados preservados na linha 3+.'
       : (r === 1 ? '[OK] Cabecalho ja estava no formato correto (2 linhas). Nada apagado.'
                  : '[OK] Cabecalho criado (a aba estava vazia).');
}
function runLancarCadastroTabela() { return lancarCadastroNaTabelaGeral_(); }


// Lê uma célula de data opcional: aceita Date (seletor) OU string "dd/mm/aaaa".
// Retorna {dia,mes,ano} ou null (vazio/invalido = usar a data padrão do protocolo).
function parseDataCelula_(v) {
  if (v === null || v === undefined || v === '') return null;
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) {
    return { dia: v.getDate(), mes: v.getMonth() + 1, ano: v.getFullYear() };
  }
  var s = String(v).trim();
  if (!s) return null;
  var p = s.split(/[\/\-.]/);
  if (p.length >= 3) {
    var d = parseInt(p[0], 10), m = parseInt(p[1], 10), a = parseInt(p[2], 10);
    if (d && m && a) { if (a < 100) a = 2000 + a; return { dia: d, mes: m, ano: a }; }
  }
  return null;
}

function lancarProtocolo() {
  var ss = getSS_();
  var cockpit = ss.getSheetByName('COCKPIT');
  var ras = ss.getSheetByName(ABA_PRINCIPAL);
  if (!cockpit || !ras) return 'ERRO: Abas nao encontradas';
  
  var log = [];
  log.push('[INIT] Lancando protocolo...');
  
  var paciente = cockpit.getRange('B4').getValue();
  if (!paciente) return '[ERRO] Selecione um paciente no COCKPIT (celula B4)';
  
  // Ler substâncias selecionadas: coluna A (merged A:C), SESSOES col D, FREQ col E, linhas 12-26
  var nomesSub = cockpit.getRange('A13:A27').getValues();
  var sessSub  = cockpit.getRange('D13:D27').getValues();
  var freqSub  = cockpit.getRange('E13:E27').getValues();
  var diaSub = cockpit.getRange('G13:G27').getValues(); // DIA inicio opcional por substancia
  var mesSub = cockpit.getRange('H13:H27').getValues(); // MES
  var anoSub = cockpit.getRange('I13:I27').getValues(); // ANO
  var substancias = [];
  for (var i = 0; i < nomesSub.length; i++) {
    if (nomesSub[i][0] && String(nomesSub[i][0]).trim() !== '') {
      var od = String(diaSub[i][0] || '').trim();
      var om = String(mesSub[i][0] || '').trim();
      var oa = String(anoSub[i][0] || '').trim();
      // override SO se DIA, MES e ANO estiverem todos preenchidos; senao usa a data do protocolo
      var override = (od && om && oa) ? { dia: parseInt(od, 10), mes: parseInt(om, 10), ano: parseInt(oa, 10) } : null;
      substancias.push({
        nome: String(nomesSub[i][0]).trim(),
        sessoes: Number(sessSub[i][0]) || 6,
        freqDias: Number(freqSub[i][0]) || 15,
        inicioOverride: override
      });
    }
  }
  
  if (substancias.length === 0) return '[ERRO] Nenhuma substancia selecionada (A12:A26)';
  
  // Data de início (B8=dia, C8=mes, D8=ano)
  var dia = cockpit.getRange('B8').getValue() || new Date().getDate();
  var mes = cockpit.getRange('C8').getValue() || (new Date().getMonth() + 1);
  var ano = cockpit.getRange('D8').getValue() || new Date().getFullYear();
  
  log.push('[OK] Paciente: ' + paciente);
  log.push('[OK] Substancias: ' + substancias.length);
  log.push('[OK] Data inicio: ' + dia + '/' + mes + '/' + ano);
  
  // Encontrar próxima linha vazia na TABELA GERAL (pela coluna NOME)
  var colNome = findColByHeader_(ras, 'NOME DO PACIENTE');
  if (colNome === -1) colNome = 2;
  var nextRow = getLastDataRow_(ras, colNome) + 1;
  if (nextRow < 3) nextRow = 3;

  // Colunas de identidade (por header, com fallback)
  var colCpf   = findColByHeader_(ras, 'CPF');     if (colCpf === -1)   colCpf   = colNome + 1;
  var colCel   = findColByHeader_(ras, 'CELULAR'); if (colCel === -1)   colCel   = colNome + 2;
  var colEmail = findColByHeader_(ras, 'EMAIL');   if (colEmail === -1) colEmail = colNome + 3;
  var blocoNasc = findBlocoDatas_(ras, 'DATA NASCIMENTO');

  // Buscar identidade no CADASTRO PACIENTES (link COCKPIT ↔ CADASTRO ↔ TABELA GERAL)
  var cad = buscarPacienteCadastro_(paciente);
  var nomeUpper = removerAcentos_(paciente).toUpperCase();

  // Gravar NOME sempre; CPF/celular/email/nascimento se achar no cadastro (formatados)
  ras.getRange(nextRow, colNome).setValue(nomeUpper);
  if (cad.found) {
    if (cad.cpf)     ras.getRange(nextRow, colCpf).setValue(formatarCPF_(cad.cpf));
    if (cad.celular) ras.getRange(nextRow, colCel).setValue(formatarCelular_(cad.celular));
    if (cad.email)   ras.getRange(nextRow, colEmail).setValue(cad.email);
    if (blocoNasc && blocoNasc.dia > 0) {
      if (cad.nascDia !== '') ras.getRange(nextRow, blocoNasc.dia).setValue(cad.nascDia).setNumberFormat('0');
      if (cad.nascMes !== '') ras.getRange(nextRow, blocoNasc.mes).setValue(cad.nascMes).setNumberFormat('0');
      if (cad.nascAno !== '') ras.getRange(nextRow, blocoNasc.ano).setValue(cad.nascAno).setNumberFormat('0');
    }
    log.push('[OK] Identidade puxada do CADASTRO PACIENTES (CPF/celular/email formatados)');
  } else {
    log.push('[AVISO] "' + paciente + '" nao encontrado no CADASTRO PACIENTES — gravado so o nome');
  }

  // Buscar colunas de substância e marcar SIM
  var headers = ras.getRange(1, 1, 1, ras.getLastColumn()).getValues()[0];
  
  substancias.forEach(function(sub) {
    // Data desta substancia: override proprio (col G) OU a data do protocolo (padrao)
    var sDia = sub.inicioOverride ? sub.inicioOverride.dia : dia;
    var sMes = sub.inicioOverride ? sub.inicioOverride.mes : mes;
    var sAno = sub.inicioOverride ? sub.inicioOverride.ano : ano;
    // Buscar coluna da substância pelo nome
    for (var c = 0; c < headers.length; c++) {
      if (normalizeHeader_(headers[c]).indexOf(normalizeHeader_(sub.nome)) !== -1) {
        // Bloco: SIM/NAO(c) | SESS(c+1) | FREQ(c+2) | DIA(c+3) | MES(c+4) | ANO(c+5)
        ras.getRange(nextRow, c + 1).setValue('SIM');
        ras.getRange(nextRow, c + 2).setValue(sub.sessoes);
        ras.getRange(nextRow, c + 3).setValue(sub.freqDias);
        ras.getRange(nextRow, c + 4).setValue(sDia);
        ras.getRange(nextRow, c + 5).setValue(sMes);
        ras.getRange(nextRow, c + 6).setValue(sAno);
        log.push('[OK] ' + sub.nome + ' marcado SIM' + (sub.inicioOverride ? ' (inicio proprio ' + sDia + '/' + sMes + '/' + sAno + ')' : ' (data do protocolo)'));
        break;
      }
    }
  });
  
  log.push('[FIM] Protocolo lancado na linha ' + nextRow);
  return log.join('\n');
}


// ═══════════════════════════════════════════════════════════════
// GERADOR RAS — LEITURA DE PACIENTES
// ═══════════════════════════════════════════════════════════════

/**
 * Lê dados de um paciente a partir de uma linha na RAS PROTOCOLOS
 * @returns {Object} dados do paciente
 */
function lerPaciente_(sheet, row) {
  var headerMap = findColsByHeaders_(sheet);
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];  // 0-indexed array
  var headers2 = lastCol > 0 ? sheet.getRange(2, 1, 1, lastCol).getValues()[0] : [];
  var rowData = sheet.getRange(row, 1, 1, lastCol).getValues()[0]; // 0-indexed array
  
  var pac = {
    linha: row,
    nome: '',
    cpf: '',
    celular: '',
    diaNasc: '', mesNasc: '', anoNasc: '',
    protocolo: '',
    valorTrat: '', valorPago: '', valorPend: '',
    obs: '',
    consultaDia: '', consultaMes: '', consultaAno: '',
    substancias: []
  };
  
  // Buscar campos básicos (headerMap é 1-indexed, converter com -1)
  for (var key in headerMap) {
    var c = headerMap[key] - 1; // converter para 0-indexed
    var val = rowData[c];
    
    if (key.indexOf('NOME DO PACIENTE') !== -1) pac.nome = val || '';
    if (key === 'CPF') pac.cpf = val || '';
    if (key === 'CELULAR') pac.celular = val || '';
    if (key.indexOf('DIA') !== -1 && key.indexOf('NASC') !== -1) pac.diaNasc = val || '';
    if (key.indexOf('MES') !== -1 && key.indexOf('NASC') !== -1) pac.mesNasc = val || '';
    if (key.indexOf('ANO') !== -1 && key.indexOf('NASC') !== -1) pac.anoNasc = val || '';
    if (key.indexOf('PROTOCOLO') !== -1) pac.protocolo = val || '';
    if (key.indexOf('VALOR TRATAMENTO') !== -1) pac.valorTrat = val || '';
    if (key.indexOf('VALOR PAGO') !== -1) pac.valorPago = val || '';
    if (key === 'OBS') pac.obs = val || '';
  }
  
  // ─── Buscar CONSULTA MEDICA DIA/MES/ANO (helper central) ───
  var consulta = findBlocoDatas_(sheet, 'CONSULTA MEDICA');
  if (consulta.dia > 0) pac.consultaDia = rowData[consulta.dia - 1] || ''; // 1-indexed → 0-indexed
  if (consulta.mes > 0) pac.consultaMes = rowData[consulta.mes - 1] || '';
  if (consulta.ano > 0) pac.consultaAno = rowData[consulta.ano - 1] || '';
  
  // ─── Buscar substâncias ativas ───
  // Encontrar onde começam as substâncias (depois de RETORNO MEDICO)
  var substStartIdx = -1; // 0-indexed
  
  // Método 1: match com catálogo pelo nome
  for (var i = 0; i < headers.length; i++) {
    var h = normalizeHeader_(headers[i]);
    for (var j = 0; j < CATALOGO_SUBSTANCIAS.length; j++) {
      if (h.indexOf(normalizeHeader_(CATALOGO_SUBSTANCIAS[j][0])) !== -1) {
        if (substStartIdx === -1 || i < substStartIdx) substStartIdx = i;
        break;
      }
    }
  }
  
  // Método 2: depois de RETORNO MEDICO
  if (substStartIdx === -1) {
    for (var i = 0; i < headers.length; i++) {
      var h = normalizeHeader_(headers[i]);
      if (h.indexOf('RETORNO') !== -1 && h.indexOf('MEDICO') !== -1) {
        substStartIdx = i + 6; // pular o bloco RETORNO (6 colunas)
        break;
      }
    }
  }
  
  if (substStartIdx >= 0) {
    for (var c = substStartIdx; c < headers.length; c += 6) {
      var subName = headers[c] || '';
      if (!subName) continue;
      
      // rowData[c] é 0-indexed, corresponde à coluna c+1 na planilha
      var simVal = String(rowData[c] || '').toUpperCase().trim();
      if (simVal === 'SIM' || simVal === 'S' || simVal === 'X') {
        pac.substancias.push({
          nome: normalizeHeader_(subName),
          nomeOriginal: String(subName).replace(/\n/g, ' ').trim(),
          sessoes: Number(rowData[c + 1]) || 0,
          freq: Number(rowData[c + 2]) || 0,
          dia: rowData[c + 3] || '',
          mes: rowData[c + 4] || '',
          ano: rowData[c + 5] || ''
        });
      }
    }
  }
  
  return pac;
}

/**
 * Lê todos os pacientes com dados
 */
function lerTodosPacientes_() {
  var ss = getSS_();
  var sheet = ss.getSheetByName(ABA_PRINCIPAL);
  if (!sheet) return [];
  
  var colB = findColByHeader_(sheet, 'NOME DO PACIENTE');
  if (colB === -1) colB = 2;
  var lastRow = getLastDataRow_(sheet, colB);
  
  var pacientes = [];
  for (var r = 3; r <= lastRow; r++) {
    var pac = lerPaciente_(sheet, r);
    if (pac.nome && String(pac.nome).trim() !== '') {
      pacientes.push(pac);
    }
  }
  return pacientes;
}

/**
 * Analisa substâncias prescritas em toda a TABELA GERAL.
 * Conta quantos pacientes têm SIM em cada substância + soma de sessões.
 * Usado para os gráficos (substâncias mais prescritas).
 * @returns {Array} [{nome, prescricoes, sessoes, pct}] ordenado por prescrições desc
 */
function analisarSubstancias_(sheet) {
  if (!sheet) {
    var ss = getSS_();
    sheet = ss.getSheetByName(ABA_PRINCIPAL);
  }
  if (!sheet) return [];
  
  var lastCol = sheet.getLastColumn();
  var headers1 = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var headers2 = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
  
  // Achar inicio das substâncias (após RETORNO MEDICO)
  var substStartIdx = -1;
  for (var i = 0; i < headers1.length; i++) {
    var h1 = normalizeHeader_(headers1[i]);
    if (h1.indexOf('RETORNO') !== -1 && h1.indexOf('MEDICO') !== -1) {
      substStartIdx = i + 6;
      break;
    }
  }
  if (substStartIdx === -1) return [];
  
  // Mapear blocos de substância
  var blocos = [];
  for (var i = substStartIdx; i < headers1.length; i += 6) {
    var nome = String(headers1[i] || '').replace(/\n/g, ' ').trim();
    if (!nome) continue;
    blocos.push({ idx0: i, nome: nome, prescricoes: 0, sessoes: 0 });
  }
  
  // Ler dados de todos os pacientes
  var colNome = findColByHeader_(sheet, 'NOME DO PACIENTE');
  if (colNome === -1) colNome = 2;
  var lastRow = getLastDataRow_(sheet, colNome);
  if (lastRow < 3) return blocos;
  
  var allData = sheet.getRange(3, 1, lastRow - 2, lastCol).getValues();
  
  for (var r = 0; r < allData.length; r++) {
    if (!allData[r][colNome - 1]) continue; // sem paciente
    for (var b = 0; b < blocos.length; b++) {
      var simVal = String(allData[r][blocos[b].idx0] || '').toUpperCase().trim();
      if (simVal === 'SIM' || simVal === 'S' || simVal === 'X') {
        blocos[b].prescricoes++;
        var sess = Number(allData[r][blocos[b].idx0 + 1]) || 0;
        blocos[b].sessoes += sess;
      }
    }
  }
  
  // Calcular total e percentuais
  var totalPrescricoes = 0;
  blocos.forEach(function(b) { totalPrescricoes += b.prescricoes; });
  blocos.forEach(function(b) {
    b.pct = totalPrescricoes > 0 ? (b.prescricoes / totalPrescricoes * 100) : 0;
  });
  
  // Ordenar por prescrições desc, remover zeros
  blocos = blocos.filter(function(b) { return b.prescricoes > 0; });
  blocos.sort(function(a, b) { return b.prescricoes - a.prescricoes; });
  
  return blocos;
}


// ═══════════════════════════════════════════════════════════════
// GERADOR RAS — LAYOUT VALIDADO (extraído da versão 2026.05.28)
// REGISTRO DE ADMINISTRAÇÃO DE SUBSTÂNCIAS
// Núcleo: desenharPaginaRAS_ / montarPaginasRAS_ / montarAgendaParaSubstancias_
// Adaptado ao modelo de dados do v8 via pacienteParaRAS_()
// ═══════════════════════════════════════════════════════════════

// ─── TEMAS RAS (SIMPLES P&B  +  PREMIUM navy/dourado) ───
const RAS_THEME = {
  SIMPLES: {
    name: 'SIMPLES',
    bg: '#FFFFFF',
    header: '#E5E5E5',
    spine: '#F4F4F4',
    bar: '#BDBDBD',
    border: '#000000',
    gridLine: '#B8B8B8',
    text: '#181818',
    protocolHeader: '#E5E5E5',
    tableHeader: '#E5E5E5',
    signatureBg: '#FFFFFF',
    infoBg: '#FFFFFF'
  },
  PREMIUM: {
    name: 'PREMIUM',
    bg: '#FAFBFC',
    header: '#1A3A5C',
    headerText: '#FFFFFF',
    spine: '#1A3A5C',
    spineText: '#FFFFFF',
    bar: '#5B9BD5',
    border: '#2C3E50',
    gridLine: '#D6DCE4',
    text: '#2C3E50',
    protocolHeader: '#2C5F8A',
    protocolHeaderText: '#FFFFFF',
    tableHeader: '#34495E',
    tableHeaderText: '#FFFFFF',
    signatureBg: '#F7F9FC',
    infoBg: '#F0F4F8',
    accentGold: '#C9A84C',
    accentBlue: '#5B9BD5',
    zebra1: '#FFFFFF',
    zebra2: '#F2F6FA'
  }
};

// ─── ADAPTER: pac (v8 lerPaciente_) → paciente (layout validado) ───
function pacienteParaRAS_(pac) {
  var subs = (pac.substancias || []).map(function(s) {
    var freq = Number(s.freq) || 0;
    var inicio = makeDate_(s.dia, s.mes, s.ano);
    return {
      nome: String(s.nomeOriginal || s.nome || '').replace(/\n/g, ' ').trim(),
      sessoes: Number(s.sessoes) || 0,
      freq: freq,
      freqTxt: freq ? (freq + ' / ' + freq + ' DIAS') : '',
      inicio: inicio,
      inicioTxt: inicio ? dataCurta_(inicio) : ''
    };
  });

  var dConsulta = makeDate_(pac.consultaDia, pac.consultaMes, pac.consultaAno);
  var valorTratNum = parseMoney_(pac.valorTrat);

  return {
    nome: String(pac.nome || '').toUpperCase(),
    cpf: pac.cpf ? formatarCPF_(pac.cpf) : '',
    celular: pac.celular ? formatarCelular_(pac.celular) : '',
    idade: '',
    medico: 'DR. CAIO PÁDUA',
    enfermeira: 'EQUIPE DE ENFERMAGEM PÁDUA',
    unidade: 'INSTITUTO PÁDUA',
    protocolo: pac.protocolo || 'NOME DO TRATAMENTO',
    dataConsultaTxt: dConsulta ? dataCurta_(dConsulta) : '',
    valorTratamentoTxt: formatBRL_(valorTratNum),
    substancias: subs,
    cpfDigits: somenteDigitos_(pac.cpf),
    dataArquivo: dConsulta ? formatDateFile_(dConsulta) : formatDateFile_(new Date())
  };
}

// ─── WRAPPERS (mantêm a assinatura usada pelos botões): retornam spreadsheet temp ───
function gerarLayoutRASSimples_(pac, sheetName) {
  var ss = SpreadsheetApp.create('TEMP_RAS_S_' + String(pac.nome || '').substring(0, 20) + '_' + Date.now());
  montarPaginasRAS_(ss, pacienteParaRAS_(pac), RAS_THEME.SIMPLES, '');
  limparSheetPadrao_(ss);
  return ss;
}

function gerarLayoutRASPremium_(pac, sheetName) {
  var ss = SpreadsheetApp.create('TEMP_RAS_P_' + String(pac.nome || '').substring(0, 20) + '_' + Date.now());
  montarPaginasRAS_(ss, pacienteParaRAS_(pac), RAS_THEME.PREMIUM, '');
  limparSheetPadrao_(ss);
  return ss;
}

// ─── MONTAGEM DE PÁGINAS (grupos de 5 substâncias × 20 linhas/página) ───
// namePrefix garante nomes de aba únicos quando vários pacientes vão no mesmo spreadsheet.
function montarPaginasRAS_(ss, paciente, theme, namePrefix) {
  namePrefix = namePrefix || '';
  var ROWS_PER_PAGE = 20;
  var allSubst = paciente.substancias || [];
  var created = [];

  // Divide substâncias em grupos de 5 (máximo visual por página)
  var substSets = [];
  for (var i = 0; i < allSubst.length; i += 5) {
    substSets.push(allSubst.slice(i, i + 5));
  }
  if (substSets.length === 0) substSets.push([]);

  // Calcula total de páginas antes de gerar
  var totalPages = 0;
  substSets.forEach(function(substSet) {
    var schedule = montarAgendaParaSubstancias_(paciente, substSet);
    var chunks = chunk_(schedule, ROWS_PER_PAGE);
    totalPages += Math.max(1, chunks.length);
  });

  var globalPage = 0;
  substSets.forEach(function(substSet) {
    var schedule = montarAgendaParaSubstancias_(paciente, substSet);
    var chunks = chunk_(schedule, ROWS_PER_PAGE);
    var pages = chunks.length ? chunks : [[]];

    pages.forEach(function(items) {
      globalPage++;
      var sh = ss.insertSheet(namePrefix + 'RAS ' + globalPage);

      var pacienteSet = Object.assign({}, paciente);
      pacienteSet.substancias = substSet;

      desenharPaginaRAS_(sh, pacienteSet, items, globalPage, totalPages, theme);
      created.push(sh);
    });
  });

  return created;
}

// ─── AGENDA: união das datas (início + i×freq) de cada substância do grupo ───
// REGRA OURO — confluência semanal: o paciente vai à clínica no MÁXIMO 1x por semana.
// Todas as aplicações que caem na mesma semana (segunda a domingo) são consolidadas
// numa única DATA ELEGÍVEL = a PRIMEIRA aplicação daquela semana. Isso mantém a
// substância semanal (ex: Tirzepatida) na cadência e puxa as biquinzenais/mensais
// para o mesmo dia, evitando idas em dias consecutivos.
function montarAgendaParaSubstancias_(paciente, substSet) {
  // 1. Datas brutas exatas de cada substância (início + i × freq)
  var raw = {}; // ymd -> { date, sessions: {nome: "i/total"} }
  substSet.forEach(function(s) {
    if (!s.inicio || !s.sessoes || !s.freq) return;
    for (var i = 0; i < s.sessoes; i++) {
      var d = new Date(s.inicio.getTime());
      d.setDate(d.getDate() + (i * s.freq));
      var key = ymd_(d);
      if (!raw[key]) raw[key] = { date: d, sessions: {} };
      raw[key].sessions[s.nome] = (i + 1) + '/' + s.sessoes;
    }
  });

  // 2. Agrupar por SEMANA (segunda a domingo)
  var semanas = {}; // ymd-da-segunda -> [ {ymd, date, sessions} ]
  Object.keys(raw).forEach(function(key) {
    var d = raw[key].date;
    var dow = d.getDay();                          // 0=dom ... 6=sab
    var seg = new Date(d.getTime());
    seg.setDate(d.getDate() - ((dow + 6) % 7));    // recua até a segunda-feira
    seg.setHours(0, 0, 0, 0);
    var wk = ymd_(seg);
    if (!semanas[wk]) semanas[wk] = [];
    semanas[wk].push({ ymd: key, date: raw[key].date, sessions: raw[key].sessions });
  });

  // 3. Para cada semana: data elegível = PRIMEIRA aplicação da semana;
  //    funde todas as sessões da semana nessa data (1 ida por semana).
  var resultado = [];
  Object.keys(semanas).sort().forEach(function(wk) {
    var dias = semanas[wk].sort(function(a, b) { return a.ymd < b.ymd ? -1 : (a.ymd > b.ymd ? 1 : 0); });
    var elegivel = dias[0].date; // primeira aplicação da semana
    var merged = {};
    dias.forEach(function(item) {
      Object.keys(item.sessions).forEach(function(nome) { merged[nome] = item.sessions[nome]; });
    });
    resultado.push({ date: elegivel, dataTxt: dataCurta_(elegivel), sessions: merged });
  });

  return resultado;
}

// ─── DESENHO DA PÁGINA RAS (layout validado, 34 cols × 44 rows) ───
function desenharPaginaRAS_(sh, paciente, agendaRows, pageIndex, totalPages, theme) {
  var T = theme || RAS_THEME.SIMPLES;
  var isPremium = T.name === 'PREMIUM';
  var totalCols = 34;
  var totalRows = 44;

  // Canvas
  sh.clear();
  sh.setHiddenGridlines(true);
  if (sh.getMaxColumns() < totalCols) sh.insertColumnsAfter(sh.getMaxColumns(), totalCols - sh.getMaxColumns());
  if (sh.getMaxRows() < totalRows) sh.insertRowsAfter(sh.getMaxRows(), totalRows - sh.getMaxRows());

  sh.getRange(1, 1, totalRows, totalCols)
    .setFontFamily('Arial').setFontColor(T.text || T.border)
    .setVerticalAlignment('middle').setBackground(T.bg || '#FFFFFF').setWrap(true);

  // Larguras
  sh.setColumnWidth(1, 28); sh.setColumnWidth(2, 28);
  sh.setColumnWidth(3, 38); sh.setColumnWidth(4, 44); sh.setColumnWidth(5, 44); sh.setColumnWidth(6, 38);
  sh.setColumnWidth(7, 52); sh.setColumnWidth(8, 52); sh.setColumnWidth(9, 52); sh.setColumnWidth(10, 52);
  sh.setColumnWidth(11, 48); sh.setColumnWidth(12, 48); sh.setColumnWidth(13, 48);
  sh.setColumnWidth(14, 44); sh.setColumnWidth(15, 44); sh.setColumnWidth(16, 44);
  sh.setColumnWidth(17, 48); sh.setColumnWidth(18, 48); sh.setColumnWidth(19, 48);
  for (var c = 20; c <= 34; c++) sh.setColumnWidth(c, 45);

  // Alturas
  for (var r = 1; r <= totalRows; r++) sh.setRowHeight(r, 22);
  sh.setRowHeight(1, 32); sh.setRowHeight(2, 32);
  sh.setRowHeight(3, 8); sh.setRowHeight(9, 8); sh.setRowHeight(15, 8); sh.setRowHeight(37, 8); sh.setRowHeight(43, 8);
  for (var r2 = 4; r2 <= 8; r2++) sh.setRowHeight(r2, 22);
  for (var r3 = 10; r3 <= 14; r3++) sh.setRowHeight(r3, 19);
  sh.setRowHeight(16, 38);
  for (var r4 = 17; r4 <= 36; r4++) sh.setRowHeight(r4, 27);
  for (var r5 = 38; r5 <= 42; r5++) sh.setRowHeight(r5, 26);
  sh.setRowHeight(44, 18);

  var borderStyle = SpreadsheetApp.BorderStyle.SOLID_MEDIUM;

  // ── LOMBADA LATERAL ──
  var spine = sh.getRange(1, 1, 44, 2);
  spine.merge();
  spine.setValue('RAS  ' + paciente.nome)
    .setFontSize(15).setFontWeight('bold')
    .setBackground(T.spine)
    .setFontColor(isPremium ? T.spineText : T.text)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  try { spine.setTextRotation(90); } catch (e) {}
  spine.setBorder(true, true, true, true, false, false, T.border, borderStyle);

  // ── CABEÇALHO ──
  var headerBg = T.header;
  var headerTxt = isPremium ? T.headerText : T.text;
  sh.getRange(1, 3, 2, 32).setBackground(headerBg)
    .setBorder(true, true, true, true, false, false, T.border, borderStyle);

  sh.getRange(1, 3, 2, 2).merge().setValue('RAS').setFontSize(22).setFontWeight('bold')
    .setHorizontalAlignment('left').setFontColor(headerTxt);
  sh.getRange(1, 5, 2, 15).merge().setValue('REGISTRO DE ADMINISTRAÇÃO DE SUBSTÂNCIAS')
    .setFontSize(11).setHorizontalAlignment('left').setFontColor(headerTxt);

  sh.getRange(1, 25, 1, 4).merge().setValue('PAWARDS').setFontSize(11).setFontWeight('bold')
    .setHorizontalAlignment('center').setFontColor(headerTxt);
  sh.getRange(2, 25, 1, 4).merge().setValue('Clinical Intelligence System').setFontSize(8)
    .setFontWeight('bold').setHorizontalAlignment('center').setFontColor(headerTxt);
  sh.getRange(1, 30, 1, 5).merge().setValue('PADCON').setFontSize(11).setFontWeight('bold')
    .setHorizontalAlignment('center').setFontColor(headerTxt);
  sh.getRange(2, 30, 1, 5).merge().setValue('Advanced Systems Architecture').setFontSize(8)
    .setFontWeight('bold').setHorizontalAlignment('center').setFontColor(headerTxt);

  // ── DADOS DO PACIENTE ──
  sh.getRange(4, 3, 5, 32).setBorder(true, true, true, true, true, true, T.border, borderStyle);
  if (isPremium) sh.getRange(4, 3, 5, 32).setBackground(T.infoBg);

  var leftLabels = [
    ['NOME', paciente.nome], ['CPF', paciente.cpf], ['CELULAR', paciente.celular],
    ['MÉDICO RESPONSÁVEL', paciente.medico || 'DR. CAIO PÁDUA'],
    ['PROTOCOLO', paciente.protocolo || 'NOME DO TRATAMENTO']
  ];
  var rightLabels = [
    ['IDADE', paciente.idade || ''], ['ENFERMEIRA', paciente.enfermeira || 'EQUIPE DE ENFERMAGEM PÁDUA'],
    ['UNIDADE', paciente.unidade || 'INSTITUTO PÁDUA'],
    ['DATA ATENDIMENTO', paciente.dataConsultaTxt || ''],
    ['VALOR TRATAMENTO', paciente.valorTratamentoTxt || 'R$ 0,00']
  ];
  for (var li = 0; li < 5; li++) {
    sh.getRange(4 + li, 3, 1, 4).merge().setValue(leftLabels[li][0]).setFontWeight('bold').setFontSize(10);
    sh.getRange(4 + li, 7, 1, 13).merge().setValue(leftLabels[li][1]).setFontSize(10);
    sh.getRange(4 + li, 20, 1, 4).merge().setValue(rightLabels[li][0]).setFontWeight('bold').setFontSize(10);
    sh.getRange(4 + li, 24, 1, 11).merge().setValue(rightLabels[li][1]).setFontSize(10);
  }

  // ── PROTOCOLO ──
  var subst = (paciente.substancias || []).slice(0, 5);
  sh.getRange(10, 3, 5, 32).setBorder(true, true, true, true, true, true, T.border, borderStyle);

  var protHeaderBg = T.protocolHeader;
  var protHeaderTxt = isPremium ? T.protocolHeaderText : T.text;
  sh.getRange(10, 3, 1, 32).merge().setValue('PROTOCOLO').setFontSize(10).setFontWeight('bold')
    .setBackground(protHeaderBg).setFontColor(protHeaderTxt);

  sh.getRange(11, 3, 1, 17).merge().setValue('SUBSTÂNCIAS').setFontSize(9).setFontWeight('bold');
  sh.getRange(12, 3, 1, 17).merge().setValue('APLICAÇÕES').setFontSize(9).setFontWeight('bold');
  sh.getRange(13, 3, 1, 17).merge().setValue('FREQUÊNCIA').setFontSize(9).setFontWeight('bold');
  sh.getRange(14, 3, 1, 17).merge().setValue('INÍCIO DA APLICAÇÃO DA SUBSTÂNCIA').setFontSize(9).setFontWeight('bold');

  var blocos = [{s:20,e:22},{s:23,e:25},{s:26,e:28},{s:29,e:31},{s:32,e:34}];
  subst.forEach(function(s, i) {
    var b = blocos[i];
    sh.getRange(11, b.s, 1, 3).merge().setValue(s.nome).setFontSize(9).setFontWeight('bold').setHorizontalAlignment('center');
    sh.getRange(12, b.s, 1, 3).merge().setValue(s.sessoes).setFontSize(9).setFontWeight('bold').setHorizontalAlignment('center');
    sh.getRange(13, b.s, 1, 3).merge().setValue(s.freqTxt).setFontSize(9).setFontWeight('bold').setHorizontalAlignment('center');
    sh.getRange(14, b.s, 1, 3).merge().setValue(s.inicioTxt).setFontSize(9).setFontWeight('bold').setHorizontalAlignment('center');
  });

  // ── TABELA OPERACIONAL ──
  sh.getRange(16, 3, 21, 32).setBorder(true, true, true, true, true, true, T.border, borderStyle);

  var tabHeaderBg = T.tableHeader;
  var tabHeaderTxt = isPremium ? T.tableHeaderText : T.text;
  sh.getRange(16, 3, 1, 32).setBackground(tabHeaderBg).setFontColor(tabHeaderTxt)
    .setFontWeight('bold').setFontSize(9).setHorizontalAlignment('center');

  var headers = [[3,1,'SEM.'],[4,2,'DATA\nAGEND.'],[6,1,'HORA'],[7,4,'CIÊNCIA / RUBRICA\nPACIENTE'],
    [11,3,'RUBRICA\nENF.'],[14,3,'DATA\nEFETIVA'],[17,3,'OBS.']];
  headers.forEach(function(h) { sh.getRange(16, h[0], 1, h[1]).merge().setValue(h[2]); });

  subst.forEach(function(s, i) {
    var b = blocos[i];
    sh.getRange(16, b.s, 1, 3).merge().setValue(s.nome + '\nSESSÃO').setFontSize(9);
  });

  // Corpo — 20 linhas
  for (var i = 0; i < 20; i++) {
    var r = 17 + i;
    var item = agendaRows[i];

    if (isPremium && i % 2 === 1) {
      sh.getRange(r, 3, 1, 32).setBackground(T.zebra2);
    }

    sh.getRange(r, 3).setValue((pageIndex - 1) * 20 + i + 1).setFontSize(10).setFontWeight('bold').setHorizontalAlignment('center');
    sh.getRange(r, 4, 1, 2).merge().setValue(item ? item.dataTxt : '').setFontSize(10).setFontWeight('bold').setHorizontalAlignment('center');
    sh.getRange(r, 6).setValue('');
    sh.getRange(r, 7, 1, 4).merge();
    sh.getRange(r, 11, 1, 3).merge();
    sh.getRange(r, 14, 1, 3).merge();
    sh.getRange(r, 17, 1, 3).merge();

    subst.forEach(function(s, si) {
      var b = blocos[si];
      var session = item && item.sessions ? item.sessions[s.nome] : '';
      var barRange = sh.getRange(r, b.s, 1, 2);
      var sessRange = sh.getRange(r, b.s + 2);
      barRange.merge();

      if (session) {
        barRange.setBackground(T.bar).setValue('');
        sessRange.setValue(session).setFontSize(11).setFontWeight('bold')
          .setHorizontalAlignment('center').setVerticalAlignment('middle');
      } else {
        barRange.setValue('');
        sessRange.setValue('');
      }
    });
  }

  // ── ASSINATURAS ──
  sh.getRange(38, 3, 5, 32).setBorder(true, true, true, true, true, true, T.border, borderStyle);
  if (isPremium) sh.getRange(38, 3, 5, 32).setBackground(T.signatureBg);

  sh.getRange(38, 3, 5, 11).merge().setValue('\n\n______________________________\nASSINATURA DO PACIENTE')
    .setHorizontalAlignment('center').setVerticalAlignment('bottom').setFontSize(9).setFontWeight('bold');
  sh.getRange(38, 14, 5, 7).merge().setValue('\n\n________________________\nMÉDICO RESPONSÁVEL')
    .setHorizontalAlignment('center').setVerticalAlignment('bottom').setFontSize(9).setFontWeight('bold');
  sh.getRange(38, 21, 5, 4).merge().setValue('\n\n\nCARIMBO')
    .setHorizontalAlignment('center').setVerticalAlignment('bottom').setFontSize(9).setFontWeight('bold');
  sh.getRange(38, 25, 5, 6).merge().setValue('\n\n____________________\nENFERMAGEM RESPONSÁVEL')
    .setHorizontalAlignment('center').setVerticalAlignment('bottom').setFontSize(9).setFontWeight('bold');
  sh.getRange(38, 31, 5, 4).merge().setValue('\n\n\nCARIMBO')
    .setHorizontalAlignment('center').setVerticalAlignment('bottom').setFontSize(9).setFontWeight('bold');

  // ── PAGINAÇÃO ──
  sh.getRange(44, 32, 1, 3).merge().setValue('PÁG. ' + pageIndex + ' / ' + totalPages)
    .setFontSize(9).setFontWeight('bold').setHorizontalAlignment('right');

  // Eliminar excesso DELETANDO (não ocultar) → a aba fica exatamente 44×34.
  // Linhas/colunas vazias além do conteúdo são a causa das PÁGINAS EM BRANCO no PDF.
  var maxR = sh.getMaxRows();
  if (maxR > totalRows) sh.deleteRows(totalRows + 1, maxR - totalRows);
  var maxC = sh.getMaxColumns();
  if (maxC > totalCols) sh.deleteColumns(totalCols + 1, maxC - totalCols);
}

// ─── HELPERS (extraídos da v2026.05.28) ───
function limparSheetPadrao_(ss) {
  ss.getSheets().forEach(function(s) {
    var name = s.getName();
    if ((name === 'Sheet1' || name === 'Página1' || name === 'Planilha1') && ss.getSheets().length > 1) {
      try { ss.deleteSheet(s); } catch (e) {}
    }
  });
}

function somenteDigitos_(v) {
  return String(v || '').replace(/\D/g, '');
}

function parseMoney_(v) {
  if (typeof v === 'number') return v;
  var s = String(v || '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  var n = Number(s);
  return isNaN(n) ? 0 : n;
}

function formatBRL_(n) {
  return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function makeDate_(dia, mes, ano) {
  dia = parseInt(dia, 10);
  mes = parseInt(mes, 10);
  ano = parseInt(ano, 10);
  if (!dia || !mes || !ano) return null;
  if (ano < 100) ano = 2000 + ano;
  return new Date(ano, mes - 1, dia);
}

function dataCurta_(d) {
  if (!d) return '';
  var dd = String(d.getDate()).padStart(2, '0');
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var yy = String(d.getFullYear()).slice(-2);
  return dd + ' / ' + mm + ' / ' + yy;
}

function ymd_(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function formatDateFile_(d) {
  var yy = String(d.getFullYear()).slice(-2);
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  return yy + '.' + mm + '.' + dd;
}

function chunk_(arr, size) {
  var out = [];
  for (var i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}


// ═══════════════════════════════════════════════════════════════
// EXPORT PDF
// ═══════════════════════════════════════════════════════════════

/**
 * Exporta sheet como PDF (landscape, A4, sem margens)
 * NÃO usa SpreadsheetApp.PageOrientation.LANDSCAPE
 */
function exportSheetAsPDF_(ssId, sheetGid) {
  var url = 'https://docs.google.com/spreadsheets/d/' + ssId + '/export?' +
    'format=pdf&size=A4&portrait=false&fitw=true&sheetnames=false&' +
    'printtitle=false&pagenumbers=false&gridlines=false&fzr=false&' +
    'top_margin=0.20&bottom_margin=0.20&left_margin=0.20&right_margin=0.20';
  
  if (sheetGid !== undefined && sheetGid !== null) {
    url += '&gid=' + sheetGid;
  }
  
  var token = getAuthToken_();
  
  // Tentar até 3x (planilha temp recém-criada pode demorar a ficar pronta)
  var lastCode = 0;
  for (var attempt = 1; attempt <= 3; attempt++) {
    var response = UrlFetchApp.fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token },
      muteHttpExceptions: true
    });
    lastCode = response.getResponseCode();
    if (lastCode === 200) {
      return response.getBlob().setContentType('application/pdf');
    }
    // 429/500/503 = temporário → esperar e tentar de novo
    Utilities.sleep(1500);
  }
  throw new Error('Export PDF falhou (HTTP ' + lastCode + ') apos 3 tentativas');
}

/**
 * Exporta sheet como XLSX
 */
function exportSheetAsXLSX_(ssId) {
  var url = 'https://docs.google.com/spreadsheets/d/' + ssId + '/export?format=xlsx';
  var token = getAuthToken_();
  var response = UrlFetchApp.fetch(url, {
    headers: { 'Authorization': 'Bearer ' + token },
    muteHttpExceptions: true
  });
  return response.getBlob().setContentType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}


// ═══════════════════════════════════════════════════════════════
// BOTÕES RAS — GERAR SELECIONADO / TODOS / GRUPOS
// ═══════════════════════════════════════════════════════════════

/**
 * Resolve a linha do paciente: usa rowNum (digitado no painel) se valido (>=3);
 * caso contrario tenta a celula ativa. Retorna -1 se nada valido.
 */
function resolverLinha_(sheet, rowNum) {
  var n = Number(rowNum);
  if (n && n >= 3) return Math.floor(n);
  try {
    var r = sheet.getActiveRange();
    if (r) return r.getRow();
  } catch(e) {}
  return -1;
}

/**
 * Distribui arquivo para a pasta correta (regra final do Caio):
 *   JURIDICO                       → PASTA_JURIDICO
 *   SIMPLES / PREMIUM / EXCEL / COMBINADO → PASTA_RAS_CLIENTES
 * (TRANSFERENCIA nao e mais destino)
 * @returns {Object} {url, nome, avisos}
 */
function distribuirArquivo_(blob, tipo) {
  var result = {url: '', nome: blob.getName(), avisos: []};
  var destId = (tipo === 'JURIDICO') ? PASTA_JURIDICO : PASTA_RAS_CLIENTES;
  var destNome = (tipo === 'JURIDICO') ? 'RAS JURIDICO' : 'RAS CLIENTES';

  try {
    var pasta = DriveApp.getFolderById(destId);
    var file = pasta.createFile(blob);
    result.url = file.getUrl();
  } catch(e) {
    result.avisos.push('Pasta ' + destNome + ' falhou (' + e.message + ') — salvo na raiz do Drive');
    var f2 = DriveApp.createFile(blob);
    result.url = f2.getUrl();
  }

  return result;
}


/**
 * Une o RAS clinico PREMIUM + o contrato JURIDICO num UNICO PDF.
 * Estrategia: cria o premium (1 folha), copia a folha do juridico pra dentro dele
 * (2 folhas no mesmo arquivo) e exporta o arquivo INTEIRO (sem gid) → 1 PDF com tudo.
 * @returns {Blob} PDF combinado
 */
function gerarRASCombinado_(pac) {
  var ssPremium = gerarLayoutRASPremium_(pac, 'RAS_CLINICO');
  var ssJur = gerarRASJuridico_(pac);
  SpreadsheetApp.flush();
  Utilities.sleep(1500);

  // Copiar a folha do juridico para dentro do premium → vira a 2a folha
  var jurSheet = ssJur.getSheets()[0];
  var copia = jurSheet.copyTo(ssPremium);
  copia.setName('JURIDICO');
  SpreadsheetApp.flush();
  Utilities.sleep(1500);

  // Exportar o arquivo INTEIRO (sem gid) → PDF com as 2 folhas (clinico depois juridico)
  var blob = exportSheetAsPDF_(ssPremium.getId());

  // Limpar temporarios
  try { DriveApp.getFileById(ssJur.getId()).setTrashed(true); } catch(e) {}
  try { DriveApp.getFileById(ssPremium.getId()).setTrashed(true); } catch(e) {}

  return blob;
}


/**
 * BOTÃO: GERAR RAS SELECIONADO (1 paciente)
 * Sempre: PDF SIMPLES + PDF PREMIUM + EXCEL → RAS CLIENTES
 * Se comJuridico (toggle ON): + contrato JURIDICO → RAS JURIDICO
 *                             + PDF COMBINADO (clinico+juridico) → RAS CLIENTES
 * @param {number} rowNum - linha do paciente (digitada no painel)
 * @param {boolean} comJuridico - toggle RAS JURIDICO
 */
function gerarRASSelecionado(rowNum, comJuridico) {
  var ss = getSS_();
  var sheet = ss.getSheetByName(ABA_PRINCIPAL);
  if (!sheet) return JSON.stringify({error: 'Aba TABELA GERAL nao encontrada'});

  var activeRow = resolverLinha_(sheet, rowNum);
  if (activeRow < 3) return JSON.stringify({error: 'Linha invalida. Digite o numero da linha do paciente (3+) no campo do painel.'});
  
  var pac = lerPaciente_(sheet, activeRow);
  if (!pac.nome) return JSON.stringify({error: 'Linha sem paciente'});
  
  var log = [];
  log.push('[INIT] Gerando RAS para: ' + pac.nome);
  
  var dataStr = dataFormatada_();
  var cpfClean = String(pac.cpf).replace(/\D/g, '');
  var prefix = dataStr + ' RAS ' + pac.nome + ' ' + cpfClean;
  
  var links = [];
  
  // 1. PDF SIMPLES
  try {
    var ssSimples = gerarLayoutRASSimples_(pac, 'RAS_S');
    SpreadsheetApp.flush();
    Utilities.sleep(2000);
    var blobS = exportSheetAsPDF_(ssSimples.getId());
    blobS.setName(prefix + ' (PDF SIMPLES).pdf');
    var resultS = distribuirArquivo_(blobS, 'SIMPLES');
    links.push({tipo: 'SIMPLES', url: resultS.url, nome: resultS.nome});
    log.push('[OK] PDF SIMPLES gerado');
    if (resultS.avisos && resultS.avisos.length) resultS.avisos.forEach(function(a){ log.push('[AVISO] ' + a); });
    DriveApp.getFileById(ssSimples.getId()).setTrashed(true);
  } catch(e) { log.push('[ERRO] PDF SIMPLES: ' + e.message); }
  
  // 2. PDF PREMIUM
  try {
    var ssPremium = gerarLayoutRASPremium_(pac, 'RAS_P');
    SpreadsheetApp.flush();
    Utilities.sleep(2000);
    var blobP = exportSheetAsPDF_(ssPremium.getId());
    blobP.setName(prefix + ' (PDF PREMIUM).pdf');
    var resultP = distribuirArquivo_(blobP, 'PREMIUM');
    links.push({tipo: 'PREMIUM', url: resultP.url, nome: resultP.nome});
    log.push('[OK] PDF PREMIUM gerado');
    if (resultP.avisos && resultP.avisos.length) resultP.avisos.forEach(function(a){ log.push('[AVISO] ' + a); });
    DriveApp.getFileById(ssPremium.getId()).setTrashed(true);
  } catch(e) { log.push('[ERRO] PDF PREMIUM: ' + e.message); }
  
  // 3. EXCEL → RAS CLIENTES
  try {
    var ssExcel = gerarLayoutRASSimples_(pac, 'RAS_X');
    SpreadsheetApp.flush();
    Utilities.sleep(1000);
    var blobX = exportSheetAsXLSX_(ssExcel.getId());
    blobX.setName(prefix + ' (EXCEL).xlsx');
    var resultX = distribuirArquivo_(blobX, 'EXCEL');
    links.push({tipo: 'EXCEL', url: resultX.url, nome: resultX.nome});
    log.push('[OK] EXCEL → RAS CLIENTES');
    DriveApp.getFileById(ssExcel.getId()).setTrashed(true);
  } catch(e) { log.push('[ERRO] EXCEL: ' + e.message); }

  // 4. JURIDICO (so quando toggle ON): contrato sozinho → JURIDICO  +  combinado → CLIENTES
  if (comJuridico) {
    // 4a. Contrato sozinho → RAS JURIDICO
    try {
      var ssJ = gerarRASJuridico_(pac);
      SpreadsheetApp.flush();
      Utilities.sleep(2000);
      var blobJ = exportSheetAsPDF_(ssJ.getId(), ssJ.getSheets()[0].getSheetId());
      blobJ.setName(prefix + ' (JURIDICO).pdf');
      var resJ = distribuirArquivo_(blobJ, 'JURIDICO');
      links.push({tipo: 'JURIDICO', url: resJ.url, nome: resJ.nome});
      if (resJ.avisos && resJ.avisos.length) resJ.avisos.forEach(function(a){ log.push('[AVISO] ' + a); });
      log.push('[OK] Contrato JURIDICO → RAS JURIDICO');
      DriveApp.getFileById(ssJ.getId()).setTrashed(true);
    } catch(e) { log.push('[ERRO] JURIDICO: ' + e.message); }

    // 4b. Combinado [clinico premium + contrato] em 1 PDF → RAS CLIENTES (imprime os 2 juntos)
    try {
      var blobC = gerarRASCombinado_(pac);
      blobC.setName(prefix + ' (CLINICO + JURIDICO).pdf');
      var resC = distribuirArquivo_(blobC, 'COMBINADO');
      links.push({tipo: 'COMBINADO', url: resC.url, nome: resC.nome});
      if (resC.avisos && resC.avisos.length) resC.avisos.forEach(function(a){ log.push('[AVISO] ' + a); });
      log.push('[OK] PDF COMBINADO (clinico+juridico) → RAS CLIENTES');
    } catch(e) { log.push('[ERRO] COMBINADO: ' + e.message); }
  }

  log.push('[FIM] RAS → RAS CLIENTES' + (comJuridico ? ' + contrato/combinado em RAS JURIDICO/CLIENTES' : ''));

  return JSON.stringify({log: log.join('\n'), links: links});
}


/**
 * BOTÃO: GERAR TODOS
 */
function gerarRASTodos() {
  var pacientes = lerTodosPacientes_();
  if (pacientes.length === 0) return JSON.stringify({error: 'Nenhum paciente encontrado'});
  
  var log = [];
  var links = [];
  log.push('[INIT] Gerando RAS para ' + pacientes.length + ' pacientes...');
  
  var dataStr = dataFormatada_();
  
  for (var p = 0; p < pacientes.length; p++) {
    var pac = pacientes[p];
    var cpfClean = String(pac.cpf).replace(/\D/g, '');
    var prefix = dataStr + ' RAS ' + pac.nome + ' ' + cpfClean;
    
    log.push('[' + (p+1) + '/' + pacientes.length + '] ' + pac.nome);
    
    try {
      // PDF SIMPLES
      var ssS = gerarLayoutRASSimples_(pac, 'G' + p + '_S');
      SpreadsheetApp.flush();
      Utilities.sleep(1500);
      var blobS = exportSheetAsPDF_(ssS.getId());
      blobS.setName(prefix + ' (PDF SIMPLES).pdf');
      var rS = distribuirArquivo_(blobS, 'SIMPLES');
      links.push({tipo: 'SIMPLES', url: rS.url, nome: rS.nome});
      DriveApp.getFileById(ssS.getId()).setTrashed(true);
      
      // PDF PREMIUM
      var ssP = gerarLayoutRASPremium_(pac, 'G' + p + '_P');
      SpreadsheetApp.flush();
      Utilities.sleep(1500);
      var blobP = exportSheetAsPDF_(ssP.getId());
      blobP.setName(prefix + ' (PDF PREMIUM).pdf');
      var rP = distribuirArquivo_(blobP, 'PREMIUM');
      links.push({tipo: 'PREMIUM', url: rP.url, nome: rP.nome});
      DriveApp.getFileById(ssP.getId()).setTrashed(true);
      
      // EXCEL
      var ssX = gerarLayoutRASSimples_(pac, 'G' + p + '_X');
      SpreadsheetApp.flush();
      Utilities.sleep(1000);
      var blobX = exportSheetAsXLSX_(ssX.getId());
      blobX.setName(prefix + ' (EXCEL).xlsx');
      var rX = distribuirArquivo_(blobX, 'EXCEL');
      links.push({tipo: 'EXCEL', url: rX.url, nome: rX.nome});
      DriveApp.getFileById(ssX.getId()).setTrashed(true);
      
      log.push('  [OK] → TRANSFERENCIA + RAS CLIENTES');
    } catch(e) {
      log.push('  [ERRO] ' + e.message);
    }
  }
  
  log.push('[FIM] ' + pacientes.length + ' pacientes processados');
  return JSON.stringify({log: log.join('\n'), links: links});
}


/**
 * BOTÃO: GERAR PDF EM GRUPOS DE 20
 */
function gerarRASGrupos20() {
  var pacientes = lerTodosPacientes_();
  if (pacientes.length === 0) return JSON.stringify({error: 'Nenhum paciente encontrado'});
  
  var log = [];
  var links = [];
  var pasta = DriveApp.getFolderById(PASTA_TRANSFERENCIA);
  var dataStr = dataFormatada_();
  var grupoSize = 20;
  var totalGrupos = Math.ceil(pacientes.length / grupoSize);
  
  log.push('[INIT] Gerando ' + totalGrupos + ' grupos de ate 20 pacientes...');
  
  for (var g = 0; g < totalGrupos; g++) {
    var start = g * grupoSize;
    var end = Math.min(start + grupoSize, pacientes.length);
    var numStart = String(start + 1).padStart(3, '0');
    var numEnd = String(end).padStart(3, '0');
    var grupoNome = 'GRUPO ' + numStart + '-' + numEnd;
    
    log.push('[GRUPO ' + (g+1) + '/' + totalGrupos + '] ' + grupoNome);
    
    try {
      // Criar spreadsheet com múltiplas sheets
      var ssGrupo = SpreadsheetApp.create('TEMP_GRUPO_' + grupoNome);
      
      for (var p = start; p < end; p++) {
        montarPaginasRAS_(ssGrupo, pacienteParaRAS_(pacientes[p]), RAS_THEME.SIMPLES, 'P' + p + '_');
      }
      limparSheetPadrao_(ssGrupo);
      
      SpreadsheetApp.flush();
      Utilities.sleep(3000);
      
      // Exportar como PDF (todas as sheets)
      var blobS = exportSheetAsPDF_(ssGrupo.getId());
      blobS.setName(dataStr + ' RAS ' + grupoNome + ' (PDF SIMPLES).pdf');
      var fileS = pasta.createFile(blobS);
      links.push({tipo: 'SIMPLES', url: fileS.getUrl(), nome: fileS.getName()});
      
      DriveApp.getFileById(ssGrupo.getId()).setTrashed(true);
      log.push('  [OK] PDF SIMPLES do grupo gerado');
      
    } catch(e) {
      log.push('  [ERRO] ' + e.message);
    }
  }
  
  log.push('[FIM] Grupos processados');
  return JSON.stringify({log: log.join('\n'), links: links});
}

/**
 * BOTÃO: PDF ÚNICO IMPRESSÃO
 */
function gerarPDFUnicoImpressao() {
  var pacientes = lerTodosPacientes_();
  if (pacientes.length === 0) return JSON.stringify({error: 'Nenhum paciente encontrado'});
  
  var log = [];
  log.push('[INIT] Gerando PDF unico para impressao (' + pacientes.length + ' pacientes)...');
  
  var pasta = DriveApp.getFolderById(PASTA_TRANSFERENCIA);
  var dataStr = dataFormatada_();
  
  try {
    var ssUnico = SpreadsheetApp.create('TEMP_PDF_UNICO');
    
    for (var p = 0; p < pacientes.length; p++) {
      montarPaginasRAS_(ssUnico, pacienteParaRAS_(pacientes[p]), RAS_THEME.SIMPLES, 'P' + p + '_');
    }
    limparSheetPadrao_(ssUnico);
    
    SpreadsheetApp.flush();
    Utilities.sleep(3000);
    
    var blob = exportSheetAsPDF_(ssUnico.getId());
    blob.setName(dataStr + ' RAS TODOS (PDF UNICO IMPRESSAO).pdf');
    var file = pasta.createFile(blob);
    
    DriveApp.getFileById(ssUnico.getId()).setTrashed(true);
    
    log.push('[OK] PDF unico gerado com ' + pacientes.length + ' paginas');
    log.push('[FIM]');
    
    return JSON.stringify({
      log: log.join('\n'),
      links: [{tipo: 'SIMPLES', url: file.getUrl(), nome: file.getName()}]
    });
    
  } catch(e) {
    log.push('[ERRO] ' + e.message);
    return JSON.stringify({log: log.join('\n'), links: []});
  }
}


// ═══════════════════════════════════════════════════════════════
// RAS JURÍDICO
// ═══════════════════════════════════════════════════════════════

/**
 * Gera PDF do Termo de Consentimento Informado
 */
function gerarRASJuridico_(pac) {
  var ss = SpreadsheetApp.create('TEMP_JURIDICO_' + pac.nome);
  var sh = ss.getSheets()[0];
  sh.setName('TERMO');
  
  var COLS = 10;
  var ROWS = 80;
  if (sh.getMaxColumns() < COLS) sh.insertColumnsAfter(sh.getMaxColumns(), COLS - sh.getMaxColumns());
  if (sh.getMaxRows() < ROWS) sh.insertRowsAfter(sh.getMaxRows(), ROWS - sh.getMaxRows());
  
  for (var c = 1; c <= COLS; c++) sh.setColumnWidth(c, 75);
  
  var r = 1;
  
  // Título
  sh.getRange(r, 1, 1, COLS).merge().setValue('TERMO DE CONSENTIMENTO INFORMADO')
    .setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center').setBackground(COR.navy).setFontColor(COR.branco);
  r++;
  sh.getRange(r, 1, 1, COLS).merge().setValue('INSTITUTO PADUA — MEDICINA INTEGRATIVA')
    .setFontSize(10).setHorizontalAlignment('center').setBackground(COR.navy).setFontColor(COR.dourado);
  r += 2;
  
  // Seção 1: Identificação
  sh.getRange(r, 1, 1, COLS).merge().setValue('1. IDENTIFICACAO DO PACIENTE')
    .setFontWeight('bold').setFontSize(11).setBackground(COR.azulPastel);
  r++;
  sh.getRange(r, 1, 1, 2).merge().setValue('Nome:').setFontWeight('bold');
  sh.getRange(r, 3, 1, 8).merge().setValue(pac.nome || '');
  r++;
  sh.getRange(r, 1, 1, 2).merge().setValue('CPF:').setFontWeight('bold');
  sh.getRange(r, 3, 1, 3).merge().setValue(pac.cpf || '');
  sh.getRange(r, 6, 1, 2).merge().setValue('Data:').setFontWeight('bold');
  sh.getRange(r, 8, 1, 3).merge().setValue(dataFormatada_().replace(/\./g, '/'));
  r += 2;
  
  // Seção 2: Consentimento
  sh.getRange(r, 1, 1, COLS).merge().setValue('2. CONSENTIMENTO PARA PROCEDIMENTOS INJETAVEIS')
    .setFontWeight('bold').setFontSize(11).setBackground(COR.azulPastel);
  r++;
  sh.getRange(r, 1, 1, COLS).merge().setValue(
    'Declaro que fui informado(a) pelo medico responsavel, Dr. Caio Padua, sobre a natureza dos procedimentos injetaveis ' +
    '(intramuscular - IM, endovenoso - EV, subcutaneo - SC) propostos no meu protocolo de tratamento.'
  ).setWrap(true).setFontSize(9);
  r++;
  sh.getRange(r, 1, 1, COLS).merge().setValue(
    'Fui esclarecido(a) sobre: substancias utilizadas, dosagens, frequencia de aplicacao, duracao prevista do tratamento, ' +
    'beneficios esperados, riscos inerentes e alternativas terapeuticas disponiveis.'
  ).setWrap(true).setFontSize(9);
  r++;
  sh.getRange(r, 1, 1, COLS).merge().setValue(
    'Estou ciente de que posso revogar este consentimento a qualquer momento, sem prejuizo do meu atendimento.'
  ).setWrap(true).setFontSize(9);
  r += 2;
  
  // Seção 3: Riscos
  sh.getRange(r, 1, 1, COLS).merge().setValue('3. CIENCIA DE RISCOS ESPECIFICOS')
    .setFontWeight('bold').setFontSize(11).setBackground(COR.amareloPastel);
  r++;
  sh.getRange(r, 1, 1, COLS).merge().setValue(
    'VIA INTRAMUSCULAR (IM): dor local, hematoma, abscesso (raro), reacao vasovagal.'
  ).setWrap(true).setFontSize(9);
  r++;
  sh.getRange(r, 1, 1, COLS).merge().setValue(
    'VIA ENDOVENOSA (EV): flebite, infiltracao, reacao anafilatica (rara), desconforto no local da puncao.'
  ).setWrap(true).setFontSize(9);
  r++;
  sh.getRange(r, 1, 1, COLS).merge().setValue(
    'VIA SUBCUTANEA (SC): nodulo local, irritacao, lipodistrofia com uso prolongado.'
  ).setWrap(true).setFontSize(9);
  r += 2;
  
  // Seção 4: LGPD
  sh.getRange(r, 1, 1, COLS).merge().setValue('4. AUTORIZACAO LGPD (Lei 13.709/2018)')
    .setFontWeight('bold').setFontSize(11).setBackground(COR.verdePastel);
  r++;
  sh.getRange(r, 1, 1, COLS).merge().setValue(
    'Autorizo o Instituto Padua a coletar, armazenar e processar meus dados pessoais sensiveis de saude para as seguintes finalidades: ' +
    'registro de acompanhamento de saude (RAS), comunicacao sobre tratamento, obrigacoes fiscais e regulatorias.'
  ).setWrap(true).setFontSize(9);
  r++;
  sh.getRange(r, 1, 1, COLS).merge().setValue(
    'Estou ciente do meu direito de solicitar a exclusao dos meus dados a qualquer momento, conforme previsto na LGPD.'
  ).setWrap(true).setFontSize(9);
  r += 2;
  
  // Seção 5: Declaração
  sh.getRange(r, 1, 1, COLS).merge().setValue('5. DECLARACAO DE CIENCIA DO PROTOCOLO')
    .setFontWeight('bold').setFontSize(11).setBackground(COR.azulPastel);
  r++;
  sh.getRange(r, 1, 1, COLS).merge().setValue(
    'Declaro que li, compreendi e concordo com todos os termos acima. Recebi uma via deste documento. ' +
    'Todas as minhas duvidas foram esclarecidas antes da assinatura.'
  ).setWrap(true).setFontSize(9);
  r += 2;
  
  // Seção 6: Assinaturas
  sh.getRange(r, 1, 1, COLS).merge().setValue('6. ASSINATURAS')
    .setFontWeight('bold').setFontSize(11).setBackground(COR.perola);
  r += 2;
  sh.getRange(r, 1, 1, 4).merge().setValue('Paciente:');
  sh.getRange(r + 1, 1, 1, 4).merge().setValue('_________________________________');
  sh.getRange(r, 6, 1, 5).merge().setValue('Medico Responsavel:');
  sh.getRange(r + 1, 6, 1, 5).merge().setValue('Dr. Caio Padua');
  r += 3;
  sh.getRange(r, 1, 1, 4).merge().setValue('Testemunha 1:');
  sh.getRange(r + 1, 1, 1, 4).merge().setValue('_________________________________');
  sh.getRange(r, 6, 1, 5).merge().setValue('Testemunha 2:');
  sh.getRange(r + 1, 6, 1, 5).merge().setValue('_________________________________');
  r += 3;
  sh.getRange(r, 1, 1, COLS).merge().setValue('Data: ____/____/______').setHorizontalAlignment('center');
  r += 2;
  
  // Nota
  sh.getRange(r, 1, 1, COLS).merge().setValue(
    'NOTA: Este documento deve ser impresso em 2 vias. Template sujeito a revisao juridica.'
  ).setFontSize(8).setFontColor('#888888').setFontStyle('italic').setWrap(true);
  
  return ss;
}


/**
 * Gerar RAS Jurídico para paciente selecionado
 */
function gerarJuridicoSelecionado(rowNum) {
  var ss = getSS_();
  var sheet = ss.getSheetByName(ABA_PRINCIPAL);
  if (!sheet) return JSON.stringify({error: 'Aba nao encontrada'});

  var activeRow = resolverLinha_(sheet, rowNum);
  if (activeRow < 3) return JSON.stringify({error: 'Linha invalida. Digite o numero da linha do paciente (3+) no painel.'});

  var pac = lerPaciente_(sheet, activeRow);
  if (!pac.nome) return JSON.stringify({error: 'Linha sem paciente'});
  
  var log = [];
  log.push('[INIT] Gerando RAS Juridico para: ' + pac.nome);
  
  try {
    var ssJur = gerarRASJuridico_(pac);
    SpreadsheetApp.flush();
    Utilities.sleep(2000);
    
    var blob = exportSheetAsPDF_(ssJur.getId(), ssJur.getSheets()[0].getSheetId());
    var dataStr = dataFormatada_();
    var cpfClean = String(pac.cpf).replace(/\D/g, '');
    blob.setName(dataStr + ' RAS ' + pac.nome + ' ' + cpfClean + ' (JURIDICO).pdf');
    
    // Salvar na pasta RAS JURIDICO (id fixo)
    var resJ = distribuirArquivo_(blob, 'JURIDICO');
    if (resJ.avisos && resJ.avisos.length) resJ.avisos.forEach(function(a){ log.push('[AVISO] ' + a); });
    
    DriveApp.getFileById(ssJur.getId()).setTrashed(true);
    
    log.push('[OK] RAS Juridico → RAS JURIDICO');
    log.push('[FIM]');
    
    return JSON.stringify({
      log: log.join('\n'),
      links: [{tipo: 'JURIDICO', url: resJ.url, nome: resJ.nome}]
    });
  } catch(e) {
    log.push('[ERRO] ' + e.message);
    return JSON.stringify({log: log.join('\n'), links: []});
  }
}


// ═══════════════════════════════════════════════════════════════
// RAS INFORMATIVO
// ═══════════════════════════════════════════════════════════════

function gerarRASInformativo_(pac) {
  var ss = SpreadsheetApp.create('TEMP_INFO_' + pac.nome);
  var sh = ss.getSheets()[0];
  sh.setName('INFO');
  
  var COLS = 10;
  if (sh.getMaxColumns() < COLS) sh.insertColumnsAfter(sh.getMaxColumns(), COLS - sh.getMaxColumns());
  for (var c = 1; c <= COLS; c++) sh.setColumnWidth(c, 75);
  
  var r = 1;
  
  // Cabeçalho
  sh.getRange(r, 1, 1, COLS).merge().setValue('RAS INFORMATIVO — GUIA DO PACIENTE')
    .setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center').setBackground(COR.navy).setFontColor(COR.branco);
  r++;
  sh.getRange(r, 1, 1, COLS).merge().setValue('INSTITUTO PADUA — MEDICINA INTEGRATIVA')
    .setFontSize(10).setHorizontalAlignment('center').setBackground(COR.navy).setFontColor(COR.dourado);
  r++;
  sh.getRange(r, 1, 1, COLS).merge().setValue('Paciente: ' + (pac.nome || ''))
    .setFontSize(10).setFontWeight('bold').setBackground(COR.creme);
  r += 2;
  
  // Para cada substância ativa do paciente
  var substAtivas = pac.substancias || [];
  var cores = [COR.azulPastel, COR.verdePastel, COR.amareloPastel, COR.rosaPastel, COR.perola];
  
  for (var i = 0; i < substAtivas.length; i++) {
    var sub = substAtivas[i];
    var cor = cores[i % cores.length];
    
    // Título da substância
    sh.getRange(r, 1, 1, COLS).merge().setValue(sub.nomeOriginal || sub.nome)
      .setFontWeight('bold').setFontSize(12).setBackground(cor);
    r++;
    
    // Buscar info no catálogo
    var catInfo = null;
    for (var j = 0; j < CATALOGO_SUBSTANCIAS.length; j++) {
      if (normalizeHeader_(CATALOGO_SUBSTANCIAS[j][0]).indexOf(normalizeHeader_(sub.nome).split(' ')[0]) !== -1) {
        catInfo = CATALOGO_SUBSTANCIAS[j];
        break;
      }
    }
    
    // Buscar texto descritivo
    var infoTexto = null;
    for (var j = 0; j < INFO_SUBSTANCIAS.length; j++) {
      if (normalizeHeader_(INFO_SUBSTANCIAS[j].nome).indexOf(normalizeHeader_(sub.nome).split(' ')[0]) !== -1) {
        infoTexto = INFO_SUBSTANCIAS[j];
        break;
      }
    }
    
    if (infoTexto) {
      sh.getRange(r, 1, 1, 2).merge().setValue('O que e:').setFontWeight('bold').setFontSize(9);
      sh.getRange(r, 3, 1, 8).merge().setValue(infoTexto.descricao).setWrap(true).setFontSize(9);
      r++;
      sh.getRange(r, 1, 1, 2).merge().setValue('Vantagem:').setFontWeight('bold').setFontSize(9);
      sh.getRange(r, 3, 1, 8).merge().setValue(infoTexto.vantagem).setWrap(true).setFontSize(9);
      r++;
    }
    
    if (catInfo) {
      // Estrelas por aparelho
      sh.getRange(r, 1, 1, 2).merge().setValue('Beneficios:').setFontWeight('bold').setFontSize(9);
      r++;
      var aparelhos = ['CARDIO','OSTEO','IMUNO','NEURO','METAB'];
      for (var a = 0; a < aparelhos.length; a++) {
        var estrelas = catInfo[10 + a]; // posições 10-14 no catálogo
        var starStr = '';
        for (var s = 0; s < 5; s++) starStr += (s < estrelas) ? '★' : '☆';
        sh.getRange(r, 1 + a * 2, 1, 2).merge().setValue(aparelhos[a] + ' ' + starStr).setFontSize(8);
      }
      r++;
    }
    
    r += 1; // Espaço entre substâncias
  }
  
  return ss;
}

function gerarInformativoSelecionado(rowNum) {
  var ss = getSS_();
  var sheet = ss.getSheetByName(ABA_PRINCIPAL);
  if (!sheet) return JSON.stringify({error: 'Aba nao encontrada'});

  var activeRow = resolverLinha_(sheet, rowNum);
  if (activeRow < 3) return JSON.stringify({error: 'Linha invalida. Digite o numero da linha do paciente (3+) no painel.'});

  var pac = lerPaciente_(sheet, activeRow);
  if (!pac.nome) return JSON.stringify({error: 'Linha sem paciente'});
  
  var log = [];
  log.push('[INIT] Gerando RAS Informativo para: ' + pac.nome);
  
  try {
    var ssInfo = gerarRASInformativo_(pac);
    SpreadsheetApp.flush();
    Utilities.sleep(2000);
    
    var blob = exportSheetAsPDF_(ssInfo.getId(), ssInfo.getSheets()[0].getSheetId());
    var dataStr = dataFormatada_();
    var cpfClean = String(pac.cpf).replace(/\D/g, '');
    blob.setName(dataStr + ' RAS ' + pac.nome + ' ' + cpfClean + ' (INFORMATIVO).pdf');
    
    var pasta = DriveApp.getFolderById(PASTA_TRANSFERENCIA);
    var file = pasta.createFile(blob);
    
    DriveApp.getFileById(ssInfo.getId()).setTrashed(true);
    
    log.push('[OK] RAS Informativo gerado');
    return JSON.stringify({log: log.join('\n'), links: [{tipo: 'INFORMATIVO', url: file.getUrl(), nome: file.getName()}]});
  } catch(e) {
    log.push('[ERRO] ' + e.message);
    return JSON.stringify({log: log.join('\n'), links: []});
  }
}


// ═══════════════════════════════════════════════════════════════
// DASHBOARD ÚNICO (FINANCEIRO + GRÁFICOS) — TDH-friendly, blocos pastel
// ═══════════════════════════════════════════════════════════════

/**
 * Monta a aba FINANCEIRO com tudo: resumo, pendências, análise de substâncias
 * e gráficos VERTICAIS embaixo. Blocos pastel com faixa de título colorida.
 * Valores alinhados à ESQUERDA.
 */
function atualizarAbaFinanceiro() {
  var ss = getSS_();
  var shRAS = ss.getSheetByName(ABA_PRINCIPAL);
  var shFin = getOrCreateSheet_(ss, 'FINANCEIRO');
  if (!shRAS) return 'ERRO: TABELA GERAL nao encontrada';
  
  var log = [];
  log.push('[INIT] Montando dashboard financeiro completo...');
  
  // Remover gráficos antigos antes de limpar
  var oldCharts = shFin.getCharts();
  for (var c = 0; c < oldCharts.length; c++) shFin.removeChart(oldCharts[c]);
  shFin.clear();
  
  var colNome = findColByHeader_(shRAS, 'NOME DO PACIENTE');
  var colI = findColByHeader_(shRAS, 'VALOR TRATAMENTO');
  var colJ = findColByHeader_(shRAS, 'VALOR PAGO');
  
  if (colNome === -1 || colI === -1) {
    log.push('[ERRO] Colunas financeiras nao encontradas');
    return log.join('\n');
  }
  
  var lastRow = getLastDataRow_(shRAS, colNome);
  if (lastRow < 3) { log.push('[WARN] Sem dados'); return log.join('\n'); }
  
  // ─── Ler dados financeiros ───
  var nomes = shRAS.getRange(3, colNome, lastRow - 2, 1).getValues();
  var tratVals = shRAS.getRange(3, colI, lastRow - 2, 1).getValues();
  var pagoVals = colJ > 0 ? shRAS.getRange(3, colJ, lastRow - 2, 1).getValues() : [];
  
  var totalTrat = 0, totalPago = 0, totalPend = 0;
  var pacientesAtivos = 0;
  var pacComPend = [];
  
  for (var i = 0; i < nomes.length; i++) {
    if (!nomes[i][0]) continue;
    pacientesAtivos++;
    var trat = Number(tratVals[i][0]) || 0;
    var pago = pagoVals.length > i ? (Number(pagoVals[i][0]) || 0) : 0;
    var pend = trat - pago; // pendente = tratamento - pago (positivo = deve)
    totalTrat += trat;
    totalPago += pago;
    if (pend > 0) {
      totalPend += pend;
      pacComPend.push({nome: nomes[i][0], pendente: pend});
    }
  }
  
  var DASH_COLS = 8;
  var fmtBRL = 'R$ #,##0.00';
  var r = 1;
  
  // ═══ TÍTULO PRINCIPAL ═══
  shFin.getRange(r, 1, 1, DASH_COLS).merge().setValue('DASHBOARD FINANCEIRO')
    .setFontSize(15).setFontWeight('bold').setHorizontalAlignment('center')
    .setVerticalAlignment('middle').setBackground(COR.navy).setFontColor(COR.dourado);
  shFin.setRowHeight(r, 34);
  r += 2;
  
  // ═══ BLOCO 1: RESUMO GERAL (faixa azul) ═══
  shFin.getRange(r, 1, 1, DASH_COLS).merge().setValue('  RESUMO GERAL')
    .setFontWeight('bold').setFontSize(11).setBackground(COR.navy).setFontColor(COR.branco)
    .setHorizontalAlignment('left');
  r++;
  
  var resumo = [
    ['PACIENTES ATIVOS', pacientesAtivos, false],
    ['TOTAL EM TRATAMENTOS', totalTrat, true],
    ['TOTAL RECEBIDO', totalPago, true],
    ['TOTAL PENDENTE', totalPend, true],
    ['% INADIMPLENCIA', pacientesAtivos > 0 ? (pacComPend.length / pacientesAtivos * 100) : 0, 'pct'],
  ];
  var resumoStartRow = r;
  for (var i = 0; i < resumo.length; i++) {
    var bg = (i % 2 === 0) ? COR.azulPastel : COR.branco;
    shFin.getRange(r, 1, 1, 4).merge().setValue(resumo[i][0])
      .setFontWeight('bold').setBackground(bg).setHorizontalAlignment('left');
    var valCell = shFin.getRange(r, 5, 1, 4).merge().setBackground(bg)
      .setFontSize(12).setHorizontalAlignment('left'); // ESQUERDA
    if (resumo[i][2] === true) {
      valCell.setValue(resumo[i][1]).setNumberFormat(fmtBRL);
    } else if (resumo[i][2] === 'pct') {
      valCell.setValue(resumo[i][1] / 100).setNumberFormat('0.0%');
    } else {
      valCell.setValue(resumo[i][1]).setNumberFormat('0');
    }
    r++;
  }
  // Borda do bloco
  shFin.getRange(resumoStartRow, 1, resumo.length, DASH_COLS)
    .setBorder(true, true, true, true, false, false, COR.azulSuave, SpreadsheetApp.BorderStyle.SOLID);
  r += 2;
  
  // ═══ BLOCO 2: ADIMPLENCIA (faixa verde) — números, sem gráfico de devedor ═══
  shFin.getRange(r, 1, 1, DASH_COLS).merge().setValue('  ADIMPLENCIA')
    .setFontWeight('bold').setFontSize(11).setBackground('#1E7E34').setFontColor(COR.branco)
    .setHorizontalAlignment('left');
  r++;
  var adRow = r;
  var adimp = [
    ['RECEBIDO (ADIMPLENTE)', totalPago],
    ['PENDENTE (INADIMPLENTE)', totalPend],
  ];
  for (var i = 0; i < adimp.length; i++) {
    var bg = (i % 2 === 0) ? COR.verdePastel : COR.branco;
    shFin.getRange(r, 1, 1, 4).merge().setValue(adimp[i][0])
      .setFontWeight('bold').setBackground(bg).setHorizontalAlignment('left');
    shFin.getRange(r, 5, 1, 4).merge().setValue(adimp[i][1])
      .setNumberFormat(fmtBRL).setBackground(bg).setHorizontalAlignment('left')
      .setFontColor(i === 0 ? COR.verdeOk : COR.vermelhoNg).setFontWeight('bold');
    r++;
  }
  shFin.getRange(adRow, 1, adimp.length, DASH_COLS)
    .setBorder(true, true, true, true, false, false, '#1E7E34', SpreadsheetApp.BorderStyle.SOLID);
  r += 2;
  
  // ═══ BLOCO 3: PACIENTES COM PENDENCIA (faixa rosa) — TABELA de valores ═══
  shFin.getRange(r, 1, 1, DASH_COLS).merge().setValue('  PACIENTES COM PENDENCIA (valores)')
    .setFontWeight('bold').setFontSize(11).setBackground('#C0392B').setFontColor(COR.branco)
    .setHorizontalAlignment('left');
  r++;
  
  if (pacComPend.length === 0) {
    shFin.getRange(r, 1, 1, DASH_COLS).merge().setValue('  Nenhuma pendencia! ✓')
      .setFontColor(COR.verdeOk).setFontSize(11).setBackground(COR.verdePastel)
      .setHorizontalAlignment('left');
    r++;
  } else {
    shFin.getRange(r, 1, 1, 4).merge().setValue('  PACIENTE')
      .setFontWeight('bold').setBackground(COR.rosaPastel).setHorizontalAlignment('left');
    shFin.getRange(r, 5, 1, 4).merge().setValue('VALOR PENDENTE')
      .setFontWeight('bold').setBackground(COR.rosaPastel).setHorizontalAlignment('left');
    r++;
    var pendStartRow = r;
    pacComPend.sort(function(a,b) { return b.pendente - a.pendente; }); // maior devedor primeiro
    for (var i = 0; i < pacComPend.length; i++) {
      var bg = (i % 2 === 0) ? COR.branco : COR.rosaPastel;
      shFin.getRange(r, 1, 1, 4).merge().setValue(pacComPend[i].nome)
        .setBackground(bg).setHorizontalAlignment('left');
      shFin.getRange(r, 5, 1, 4).merge().setValue(pacComPend[i].pendente)
        .setNumberFormat(fmtBRL).setBackground(bg).setFontColor(COR.vermelhoNg)
        .setFontWeight('bold').setHorizontalAlignment('left');
      r++;
    }
    shFin.getRange(pendStartRow - 1, 1, pacComPend.length + 1, DASH_COLS)
      .setBorder(true, true, true, true, false, false, '#C0392B', SpreadsheetApp.BorderStyle.SOLID);
  }
  r += 2;
  
  // ═══ BLOCO 4: SUBSTANCIAS MAIS PRESCRITAS (faixa roxa) — TABELA + base gráficos ═══
  var substancias = analisarSubstancias_(shRAS);
  
  shFin.getRange(r, 1, 1, DASH_COLS).merge().setValue('  SUBSTANCIAS MAIS PRESCRITAS')
    .setFontWeight('bold').setFontSize(11).setBackground('#6A1B9A').setFontColor(COR.branco)
    .setHorizontalAlignment('left');
  r++;
  
  // Cabeçalho da tabela
  var subHeaderRow = r;
  shFin.getRange(r, 1, 1, 3).merge().setValue('  SUBSTANCIA').setFontWeight('bold')
    .setBackground('#E1BEE7').setHorizontalAlignment('left');
  shFin.getRange(r, 4, 1, 2).merge().setValue('PRESCRICOES').setFontWeight('bold')
    .setBackground('#E1BEE7').setHorizontalAlignment('left');
  shFin.getRange(r, 6, 1, 1).setValue('SESSOES').setFontWeight('bold')
    .setBackground('#E1BEE7').setHorizontalAlignment('left');
  shFin.getRange(r, 7, 1, 2).merge().setValue('%').setFontWeight('bold')
    .setBackground('#E1BEE7').setHorizontalAlignment('left');
  r++;
  
  // ── Dados da tabela (também servem de base para os gráficos) ──
  var chartDataStartRow = r;
  for (var i = 0; i < substancias.length; i++) {
    var s = substancias[i];
    var bg = (i % 2 === 0) ? COR.branco : '#F3E5F5';
    shFin.getRange(r, 1, 1, 3).merge().setValue(s.nome).setBackground(bg).setHorizontalAlignment('left');
    // PRESCRICOES e SESSOES = NUMERO INTEIRO (forçar formato '0', NUNCA R$)
    shFin.getRange(r, 4, 1, 2).merge().setValue(s.prescricoes).setNumberFormat('0').setBackground(bg).setHorizontalAlignment('left');
    shFin.getRange(r, 6, 1, 1).setValue(s.sessoes).setNumberFormat('0').setBackground(bg).setHorizontalAlignment('left');
    shFin.getRange(r, 7, 1, 2).merge().setValue(s.pct / 100).setNumberFormat('0.0%').setBackground(bg).setHorizontalAlignment('left');
    r++;
  }
  // Garantir formato numero em todo o range de prescricoes/sessoes (caso herdou R$)
  if (substancias.length > 0) {
    shFin.getRange(chartDataStartRow, 4, substancias.length, 3).setNumberFormat('0');
  }
  var chartDataEndRow = r - 1;
  if (substancias.length > 0) {
    shFin.getRange(subHeaderRow, 1, substancias.length + 1, DASH_COLS)
      .setBorder(true, true, true, true, false, false, '#6A1B9A', SpreadsheetApp.BorderStyle.SOLID);
  }
  r += 2;
  
  // ═══ GRÁFICOS VERTICAIS (embaixo de tudo) ═══
  if (substancias.length > 0) {
    // Montar tabela auxiliar oculta para gráficos (nome + prescricoes + sessoes)
    // Usamos colunas K/L/M (longe da vista) como fonte de dados limpos
    var auxCol = 11; // K
    shFin.getRange(1, auxCol).setValue('SUBSTANCIA');
    shFin.getRange(1, auxCol + 1).setValue('PRESCRICOES');
    shFin.getRange(1, auxCol + 2).setValue('SESSOES');
    var topN = Math.min(substancias.length, 15); // top 15 para não poluir
    for (var i = 0; i < topN; i++) {
      shFin.getRange(2 + i, auxCol).setValue(substancias[i].nome);
      shFin.getRange(2 + i, auxCol + 1).setValue(substancias[i].prescricoes);
      shFin.getRange(2 + i, auxCol + 2).setValue(substancias[i].sessoes);
    }
    
    // GRÁFICO 1: Substâncias mais prescritas (COLUNA = vertical)
    var chart1 = shFin.newChart()
      .setChartType(Charts.ChartType.COLUMN)
      .addRange(shFin.getRange(1, auxCol, topN + 1, 2)) // nome + prescricoes
      .setPosition(r, 1, 0, 0)
      .setOption('title', 'SUBSTANCIAS MAIS PRESCRITAS (nº de pacientes)')
      .setOption('width', 900)
      .setOption('height', 400)
      .setOption('colors', ['#6A1B9A'])
      .setOption('legend', {position: 'none'})
      .setOption('hAxis', {slantedText: true, slantedTextAngle: 45})
      .build();
    shFin.insertChart(chart1);
    r += 22;
    
    // GRÁFICO 2: Sessões por substância (COLUNA = vertical)
    var chart2 = shFin.newChart()
      .setChartType(Charts.ChartType.COLUMN)
      .addRange(shFin.getRange(1, auxCol, topN + 1, 1)) // nome
      .addRange(shFin.getRange(1, auxCol + 2, topN + 1, 1)) // sessoes
      .setPosition(r, 1, 0, 0)
      .setOption('title', 'TOTAL DE SESSOES POR SUBSTANCIA')
      .setOption('width', 900)
      .setOption('height', 400)
      .setOption('colors', ['#7BA7CC'])
      .setOption('legend', {position: 'none'})
      .setOption('hAxis', {slantedText: true, slantedTextAngle: 45})
      .build();
    shFin.insertChart(chart2);
    r += 22;
    
    // GRÁFICO 3: Adimplência vs Inadimplência (COLUNA = vertical)
    var adimpCol = 15; // O
    shFin.getRange(1, adimpCol).setValue('STATUS');
    shFin.getRange(1, adimpCol + 1).setValue('VALOR');
    shFin.getRange(2, adimpCol).setValue('RECEBIDO');
    shFin.getRange(2, adimpCol + 1).setValue(totalPago);
    shFin.getRange(3, adimpCol).setValue('PENDENTE');
    shFin.getRange(3, adimpCol + 1).setValue(totalPend);
    
    var chart3 = shFin.newChart()
      .setChartType(Charts.ChartType.COLUMN)
      .addRange(shFin.getRange(1, adimpCol, 3, 2))
      .setPosition(r, 1, 0, 0)
      .setOption('title', 'ADIMPLENCIA vs INADIMPLENCIA (R$)')
      .setOption('width', 700)
      .setOption('height', 380)
      .setOption('colors', ['#34A853'])
      .setOption('legend', {position: 'none'})
      .build();
    shFin.insertChart(chart3);
  }
  
  // Larguras
  for (var c = 1; c <= DASH_COLS; c++) shFin.setColumnWidth(c, 130);
  
  log.push('[OK] Resumo, adimplencia, pendencias (valores)');
  log.push('[OK] ' + substancias.length + ' substancias analisadas');
  log.push('[OK] 3 graficos VERTICAIS (prescricoes, sessoes, adimplencia)');
  // Tabela por paciente (aba FINANCEIRO PACIENTE) — TDAH friendly, cabecalho congelado
  atualizarFinanceiroPaciente_();
  log.push('[OK] Aba FINANCEIRO PACIENTE atualizada (tabela TDAH, cabecalho congelado)');
  log.push('[FIM] Dashboard completo');
  
  return log.join('\n');
}


/**
 * Redireciona para o dashboard único (compatibilidade com botão antigo)
 */
function atualizarGraficosFinanceiro() {
  return atualizarAbaFinanceiro();
}


// ═══════════════════════════════════════════════════════════════
// FINANCEIRO PACIENTE — tabela TDAH friendly por paciente (cabecalho congelado)
// ═══════════════════════════════════════════════════════════════
function atualizarFinanceiroPaciente_() {
  var ss = getSS_();
  var sh = getOrCreateSheet_(ss, 'FINANCEIRO PACIENTE');
  var ras = ss.getSheetByName(ABA_PRINCIPAL);
  if (!ras) return '[ERRO] TABELA GERAL nao encontrada';

  var colNome = findColByHeader_(ras, 'NOME DO PACIENTE'); if (colNome === -1) colNome = 2;
  var colTrat = findColByHeader_(ras, 'VALOR TRATAMENTO');
  var colPago = findColByHeader_(ras, 'VALOR PAGO');
  var colPend = findColByHeader_(ras, 'VALOR PENDENTE');

  var lastRow = getLastDataRow_(ras, colNome);
  var dados = [];
  if (lastRow >= 3) {
    var n = lastRow - 2;
    var nomes = ras.getRange(3, colNome, n, 1).getDisplayValues();
    var trat = colTrat > 0 ? ras.getRange(3, colTrat, n, 1).getDisplayValues() : null;
    var pago = colPago > 0 ? ras.getRange(3, colPago, n, 1).getDisplayValues() : null;
    var pend = colPend > 0 ? ras.getRange(3, colPend, n, 1).getDisplayValues() : null;
    for (var i = 0; i < n; i++) {
      var nome = String(nomes[i][0] || '').trim();
      if (!nome) continue;
      var vt = trat ? (parseMoneyBR_(trat[i][0]) || 0) : 0;
      var vp = pago ? (parseMoneyBR_(pago[i][0]) || 0) : 0;
      var vpend = pend ? parseMoneyBR_(pend[i][0]) : null;
      if (vpend === null || vpend === undefined) vpend = vt - vp;
      dados.push([nome, vt, vp, vpend]);
    }
  }

  sh.clear();
  try { sh.getRange(1, 1, sh.getMaxRows(), 4).breakApart(); } catch (e) {}
  sh.setHiddenGridlines(true);

  // Titulo (linha 1)
  sh.getRange('A1:D1').merge().setValue('FINANCEIRO POR PACIENTE')
    .setBackground(COR.navy).setFontColor(COR.dourado).setFontWeight('bold').setFontSize(14)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(1, 32);

  // Cabecalho (linha 2) — sera CONGELADO
  sh.getRange(2, 1, 1, 4).setValues([['PACIENTE', 'VALOR TRATAMENTO', 'VALOR PAGO', 'VALOR PENDENTE']])
    .setBackground(COR.azulPastel).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setFrozenRows(2);

  if (dados.length > 0) {
    sh.getRange(3, 1, dados.length, 4).setValues(dados);
    sh.getRange(3, 2, dados.length, 3).setNumberFormat('R$ #,##0.00');
    for (var z = 0; z < dados.length; z++) {
      sh.getRange(z + 3, 1, 1, 4).setBackground((z % 2 === 0) ? COR.branco : COR.cinzaZebra);
      sh.getRange(z + 3, 4).setFontWeight('bold').setFontColor(dados[z][3] > 0 ? '#C0392B' : '#1E7E34');
    }
    sh.getRange(2, 1, dados.length + 1, 4)
      .setBorder(true, true, true, true, true, true, '#9E9E9E', SpreadsheetApp.BorderStyle.SOLID);
  }

  sh.setColumnWidth(1, 260); sh.setColumnWidth(2, 150); sh.setColumnWidth(3, 150); sh.setColumnWidth(4, 150);
  return '[OK] FINANCEIRO PACIENTE: ' + dados.length + ' pacientes (tabela TDAH, cabecalho congelado)';
}

function runAtualizarFinanceiroPaciente() { return atualizarFinanceiroPaciente_(); }


// ═══════════════════════════════════════════════════════════════
// onEdit TRIGGER — Formatação automática
// ═══════════════════════════════════════════════════════════════

function onEdit(e) {
  if (!e) return;
  var sheet = e.range.getSheet();
  var nomeAba = sheet.getName();
  
  var row = e.range.getRow();
  var col = e.range.getColumn(); // 1-indexed
  
  // ─── CADASTRO PACIENTES: formatar CPF (col B) e CELULAR (col C) ───
  if (nomeAba === 'CADASTRO PACIENTES') {
    if (row < 3) return; // linhas 1-2 = cabecalho (2 linhas)
    var val0 = e.range.getValue();
    if (!val0) return;
    // Cabeçalho: NOME(1), CPF(2), CELULAR(3), EMAIL(4), NASCIMENTO(5)
    if (col === 2) { e.range.setValue(formatarCPF_(val0)); return; }
    if (col === 3) { e.range.setValue(formatarCelular_(val0)); return; }
    if (col === 1) { e.range.setValue(removerAcentos_(String(val0)).toUpperCase()); return; }
    return;
  }
  
  if (nomeAba !== ABA_PRINCIPAL) return;
  
  if (row < 3) return;
  
  var val = e.range.getValue();
  if (!val) return;
  var valStr = String(val).toUpperCase().trim();
  
  // ─── Formatação automática (B=nome, C=cpf, D=celular) ───
  var colB = findColByHeader_(sheet, 'NOME DO PACIENTE');
  var colC = findColByHeader_(sheet, 'CPF');
  var colD = findColByHeader_(sheet, 'CELULAR');
  
  if (col === colB && colB > 0) {
    e.range.setValue(removerAcentos_(valStr));
    return;
  }
  if (col === colC && colC > 0) {
    e.range.setValue(formatarCPF_(val));
    return;
  }
  if (col === colD && colD > 0) {
    e.range.setValue(formatarCelular_(val));
    return;
  }
  
  // ─── SIM/NAO numa substância ───
  // SIM → puxa DIA/MES/ANO da CONSULTA MEDICA
  // NAO → apaga DIA/MES/ANO da substância
  if (valStr === 'SIM' || valStr === 'S' || valStr === 'NAO' || valStr === 'NÃO' || valStr === 'N') {
    var lastCol = sheet.getLastColumn();
    var headers1 = sheet.getRange(1, 1, 1, lastCol).getValues()[0]; // 0-indexed
    var headers2 = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
    
    var editIdx0 = col - 1; // converter para 0-indexed
    var h1 = normalizeHeader_(headers1[editIdx0]);
    var h2 = normalizeHeader_(headers2[editIdx0]);
    
    // Verificar se esta coluna é SIM/NAO de uma substância
    var isSIMNAO = (h2 === 'SIM/NAO' || h2 === 'SIM' || h1.indexOf('SIM/NAO') !== -1 || h1.indexOf('SIM') !== -1);
    var isConsulta = h1.indexOf('CONSULTA') !== -1;
    var isRetorno = h1.indexOf('RETORNO') !== -1;
    
    // Só agir se for substância (não CONSULTA nem RETORNO)
    if (isSIMNAO && !isConsulta && !isRetorno) {
      var diaSubCol = col + 3;
      var mesSubCol = col + 4;
      var anoSubCol = col + 5;
      
      var ehSim = (valStr === 'SIM' || valStr === 'S');
      
      if (ehSim) {
        // ─── SIM: puxar data da CONSULTA MEDICA ───
        var consulta = findBlocoDatas_(sheet, 'CONSULTA MEDICA');
        if (consulta.dia > 0) {
          var diaBase = sheet.getRange(row, consulta.dia).getValue();
          var mesBase = sheet.getRange(row, consulta.mes).getValue();
          var anoBase = sheet.getRange(row, consulta.ano).getValue();
          
          if (diaBase || mesBase || anoBase) {
            // Só preencher se vazio (REGRA: não sobrescrever data já posta manualmente)
            if (!sheet.getRange(row, diaSubCol).getValue()) sheet.getRange(row, diaSubCol).setValue(diaBase);
            if (!sheet.getRange(row, mesSubCol).getValue()) sheet.getRange(row, mesSubCol).setValue(mesBase);
            if (!sheet.getRange(row, anoSubCol).getValue()) sheet.getRange(row, anoSubCol).setValue(anoBase);
          }
        }
      } else {
        // ─── NAO: apagar DIA/MES/ANO + SESS + FREQ da substância ───
        var sessCol = col + 1;
        var freqCol = col + 2;
        sheet.getRange(row, sessCol).clearContent();
        sheet.getRange(row, freqCol).clearContent();
        sheet.getRange(row, diaSubCol).clearContent();
        sheet.getRange(row, mesSubCol).clearContent();
        sheet.getRange(row, anoSubCol).clearContent();
      }
    }
  }
  
  // ─── VALOR TRATAMENTO ou PAGO editado → recalcular PENDENTE (NUMERO) ───
  var colI = findColByHeader_(sheet, 'VALOR TRATAMENTO');
  var colJ = findColByHeader_(sheet, 'VALOR PAGO');
  var colK = findColByHeader_(sheet, 'VALOR PENDENTE');
  
  if ((col === colI || col === colJ) && colK > 0 && colI > 0 && colJ > 0) {
    var tratV = parseMoneyBR_(sheet.getRange(row, colI).getDisplayValue());
    var pagoV = parseMoneyBR_(sheet.getRange(row, colJ).getDisplayValue());
    var cellK = sheet.getRange(row, colK);
    if (tratV === null) {
      cellK.clearContent(); // sem tratamento → pendente vazio
    } else {
      cellK.setValue(tratV - (pagoV || 0)); // NUMERO, sem formula
    }
    cellK.setNumberFormat('R$ #,##0.00;[Red]-R$ #,##0.00;R$ 0.00');
  }
}


/**
 * Inserir coluna EMAIL entre CELULAR e DIA NASCIMENTO (se não existir)
 */
function inserirColunaEmail_() {
  var ss = getSS_();
  var sheet = ss.getSheetByName(ABA_PRINCIPAL);
  if (!sheet) return '[ERRO] TABELA GERAL nao encontrada';
  
  // Verificar se EMAIL já existe
  var existente = findColByHeader_(sheet, 'EMAIL');
  if (existente > 0) return '[OK] Coluna EMAIL ja existe na posicao ' + existente;
  
  // Encontrar coluna CELULAR
  var colD = findColByHeader_(sheet, 'CELULAR');
  if (colD === -1) colD = 4; // fallback
  
  // Inserir coluna DEPOIS de CELULAR
  sheet.insertColumnAfter(colD);
  
  // Rotular a nova coluna
  var novaCol = colD + 1;
  sheet.getRange(1, novaCol).setValue('EMAIL')
    .setFontWeight('bold')
    .setBackground(COR.navy)
    .setFontColor(COR.branco)
    .setFontSize(9)
    .setHorizontalAlignment('center');
  
  // Linha 2 vazia (sub-header)
  sheet.getRange(2, novaCol).setValue('')
    .setBackground(COR.cinzaZebra);
  
  sheet.autoResizeColumn(novaCol);
  
  return '[OK] Coluna EMAIL inserida na posicao ' + novaCol + ' (entre CELULAR e DIA NASCIMENTO)';
}


/**
 * Corrigir MES NASCIMENTO — limpar fórmulas quebradas (#ERROR!)
 * Nascimento é SOMENTE display, nunca fórmula.
 */
function corrigirMesNascimento_(sheet) {
  if (!sheet) {
    var ss = getSS_();
    sheet = ss.getSheetByName(ABA_PRINCIPAL);
  }
  if (!sheet) return;
  
  // Achar bloco DATA NASCIMENTO (helper central lida com header mesclado)
  var nasc = findBlocoDatas_(sheet, 'DATA NASCIMENTO');
  
  // Fallback: tentar "NASCIMENTO" sozinho
  if (nasc.mes === -1) {
    nasc = findBlocoDatas_(sheet, 'NASCIMENTO');
  }
  
  var lastRow = getLastDataRow_(sheet, 2);
  if (lastRow < 3) return;
  var numRows = lastRow - 2;
  
  // Limpar DIA, MES e ANO do nascimento: remover #ERROR! e formato R$
  // Nascimento é SOMENTE display — número puro, sem fórmula, sem moeda.
  var cols = [nasc.dia, nasc.mes, nasc.ano];
  for (var c = 0; c < cols.length; c++) {
    var col = cols[c];
    if (col <= 0) continue;
    
    var rng = sheet.getRange(3, col, numRows, 1);
    var displayVals = rng.getDisplayValues();
    var cleanVals = [];
    for (var i = 0; i < displayVals.length; i++) {
      var v = displayVals[i][0];
      if (v && v.indexOf('#') !== -1) {
        cleanVals.push(['']); // limpar #ERROR!
      } else {
        // remover prefixo R$ se existir (caso tenha sido formatado errado)
        var limpo = String(v).replace(/R\$\s*/g, '').replace(/\./g, '').replace(/,00$/, '').trim();
        cleanVals.push([limpo]);
      }
    }
    rng.setValues(cleanVals);
    // Resetar formato para número puro (NÃO moeda)
    rng.setNumberFormat('0');
  }
}


// ═══════════════════════════════════════════════════════════════
// WRAPPER FUNCTIONS (chamadas do Panel.html via google.script.run)
// ═══════════════════════════════════════════════════════════════

function runAplicarEstrutura()        { return aplicarEstruturaCompleta(); }
function runCorrigirFinanceira()       { return corrigirColunaFinanceira(); }
function runCorrigirConsulta()         { return corrigirColunaConsulta(); }
function runNormalizar()               { return normalizarNomesCpfCelularRAS(); }
function runValidarPastas()            { return validarPastas(); }
function runGerarRASSelecionado(rowNum, comJuridico) { return gerarRASSelecionado(rowNum, comJuridico); }
function runGerarRASTodos()            { return gerarRASTodos(); }
function runGerarRASGrupos20()         { return gerarRASGrupos20(); }
function runGerarPDFUnico()            { return gerarPDFUnicoImpressao(); }
function runGerarJuridico(rowNum)      { return gerarJuridicoSelecionado(rowNum); }
function runGerarInformativo(rowNum)   { return gerarInformativoSelecionado(rowNum); }
function runAtualizarFinanceiro()      { return atualizarAbaFinanceiro(); }
function runAtualizarGraficos()        { return atualizarGraficosFinanceiro(); }
function runLancarProtocolo()          { return lancarProtocolo(); }
function runReestruturarCockpit()       { var ss = getSS_(); estruturarCockpit_(getOrCreateSheet_(ss, 'COCKPIT'), ss); return '[OK] COCKPIT reestruturado: coluna INICIO (opcional) por substancia adicionada (col G).\n[INFO] Deixe a coluna INICIO vazia para usar a data do protocolo; preencha so para intercalar.'; }
function runPopularCadastro()          { return popularCadastroPacientes(); }
function runInserirEmail()             { return inserirColunaEmail_(); }
function runCorrigirMesNasc()          { corrigirMesNascimento_(); return '[OK] MES NASCIMENTO corrigido'; }