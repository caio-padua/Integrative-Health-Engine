/**
 * Teste semantico das funcoes PURAS de AppEnfermagemRasFap.gs.
 * Le o .gs, extrai cada funcao pura por casamento de chaves e avalia o codigo
 * REAL (sem copia paralela), garantindo zero drift entre teste e fonte.
 *
 * Rodar: node docs/dr-replit/ras-kaizen-v8/tests/test_app_enfermagem.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gsPath = path.join(__dirname, '..', 'AppEnfermagemRasFap.gs');
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
  'removerAcentosFap_', 'somenteDigitosFap_', 'iniciaisNomesDoMeio_',
  'rubricaPaciente_', 'ajustarNomeCelula_', 'derivarPin_',
  'nomePastaCliente_', 'nomeArquivoRasFap_', 'chaveAplicacao_',
  'montarSetAplicadas_', 'corSubstanciaAgenda_', 'avaliarBloqueioPin_',
  'emailAutorizadoApp_'
];

let combinado = 'const FAP_CONFIG = { larguraRubricaPaciente: 32, larguraRubricaEnfermeira: 22,'
  + ' marcaCheck: "\\u2713", arquivoEstado: "aplicacoes.json", pastaRaizClientesId: "x" };\n';
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

console.log('== iniciais e rubrica ==');
ok('iniciais nomes do meio', api.iniciaisNomesDoMeio_('Caio Henrique Souza Padua'), 'C.H.S.');
ok('rubrica simples', api.rubricaPaciente_('Caio Henrique Souza Padua'), 'Padua, C.H.S.');
ok('rubrica com acento', api.rubricaPaciente_('Caio Henrique Souza P\u00e1dua'), 'Padua, C.H.S.');
ok('rubrica nome unico curto', api.rubricaPaciente_('Madonna'), 'Madonna');

console.log('== truncamento sobrenome longo (folga 2) ==');
const rubLonga = api.rubricaPaciente_('Joao Albuquerque Cavalcanti Wanderlei', 12);
okTrue('rubrica longa cabe com folga 2 (<=10)', rubLonga.length <= 10);
okTrue('rubrica longa mantem fixo ", J.A.C."', rubLonga.endsWith(', J.A.C.'));
okTrue('rubrica longa encurta so o sobrenome', rubLonga.startsWith('Wa'));

console.log('== nome enfermeira (folga 2) ==');
ok('enfermeira curta intacta', api.ajustarNomeCelula_('Ana Lima', 22), 'Ana Lima');
const enfLonga = api.ajustarNomeCelula_('Maria Aparecida da Silva Santos', 22);
okTrue('enfermeira longa truncada a max-2 (=20)', enfLonga.length === 20);

console.log('== PIN ==');
ok('pin Padua 14/11/78', api.derivarPin_('Padua', 14, 11, 78), 'padu7811');
ok('pin Padua ano 4 digitos', api.derivarPin_('Padua', 14, 11, 1978), 'padu7811');
ok('pin sobrenome curto+acento', api.derivarPin_('S\u00e1', 5, 3, 2002), 'sa0203');
ok('pin mes 1 digito padded', api.derivarPin_('Lima', 1, 2, 1990), 'lima9002');

console.log('== pastas e arquivos ==');
ok('pasta cliente', api.nomePastaCliente_('Caio Henrique Souza Padua', '123.456.789-00'),
  'Caio Henrique Souza Padua 12345678900');
ok('arquivo fap (1/4)', api.nomeArquivoRasFap_('RAS Katia', 1, 4), 'RAS Katia (1/4)');
ok('arquivo raiz sem sufixo', api.nomeArquivoRasFap_('RAS Katia', 0, 0), 'RAS Katia');

console.log('== chave e estado ==');
ok('chave aplicacao', api.chaveAplicacao_('Vitamina D3', '1/7'), 'VITAMINA D3|1/7');
ok('chave normaliza acento/caixa', api.chaveAplicacao_('vitamina  d\u00e9', '2/7'), 'VITAMINA DE|2/7');
ok('set aplicadas',
  api.montarSetAplicadas_({ aplicacoes: { 'VITAMINA D3|1/7': { x: 1 }, 'B12|3/7': { y: 2 } } }),
  { 'VITAMINA D3|1/7': true, 'B12|3/7': true });
ok('set vazio', api.montarSetAplicadas_(null), {});

console.log('== cores agenda ==');
ok('cor aplicada', api.corSubstanciaAgenda_('aplicada').token, 'APLICADA');
ok('cor proxima', api.corSubstanciaAgenda_('PROXIMA').token, 'PROXIMA');
ok('cor futura default', api.corSubstanciaAgenda_('qualquer').token, 'FUTURA');

console.log('== bloqueio anti-forca-bruta do PIN ==');
ok('pin 0/5 nao bloqueia', api.avaliarBloqueioPin_(0, 5).bloqueado, false);
ok('pin 4/5 nao bloqueia', api.avaliarBloqueioPin_(4, 5).bloqueado, false);
ok('pin 5/5 bloqueia', api.avaliarBloqueioPin_(5, 5).bloqueado, true);
ok('pin 6/5 bloqueia', api.avaliarBloqueioPin_(6, 5).bloqueado, true);
ok('pin restantes 2 em 3/5', api.avaliarBloqueioPin_(3, 5).restantes, 2);

console.log('== autorizacao runtime do app (fail-closed) ==');
ok('dono sempre autorizado', api.emailAutorizadoApp_('Dono@x.com', 'dono@x.com', ''), true);
ok('email vazio negado', api.emailAutorizadoApp_('', 'dono@x.com', 'a@x.com'), false);
ok('email na allowlist autorizado', api.emailAutorizadoApp_('enf@x.com', 'dono@x.com', 'enf@x.com, outra@x.com'), true);
ok('email fora da lista negado', api.emailAutorizadoApp_('intruso@x.com', 'dono@x.com', 'enf@x.com'), false);
ok('lista vazia + nao-dono negado (fail-closed)', api.emailAutorizadoApp_('alguem@x.com', 'dono@x.com', ''), false);

console.log('\n== RESULTADO: ' + passou + ' OK / ' + falhou + ' FALHA ==');
process.exit(falhou === 0 ? 0 : 1);
