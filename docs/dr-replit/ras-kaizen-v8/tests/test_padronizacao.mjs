/**
 * Teste semantico das funcoes PURAS de Padronizacao.gs (extracao sem-drift do .gs real).
 * Rodar: node docs/dr-replit/ras-kaizen-v8/tests/test_padronizacao.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, '..', 'Padronizacao.gs'), 'utf8');

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
  'removerAcentosSub_', 'tituloPalavraSub_', 'ehTokenCodigo_', 'normalizarPalavraSub_',
  'padronizarNomeSubstancia_', 'padronizarDosagem_', 'montarNomeCanonico_',
  'chaveBuscaSub_', 'extrairDoseLivre_', 'indexarApelidos_', 'acharPorCanonico_',
  'resolverSubstanciaCanonica_', 'planejarVarredura_'
];
let combinado = 'var ACRONIMOS_SUBSTANCIA = { NAC:1,DMSA:1,HCG:1,DHEA:1,PQQ:1,ADEK:1,NAD:1,DMAE:1,EV:1,IM:1,SC:1,UI:1 };\n';
PURAS.forEach((n) => { combinado += extrair(n) + '\n'; });
combinado += 'return { ' + PURAS.join(', ') + ' };';
const api = new Function(combinado)();

let passou = 0, falhou = 0;
function ok(nome, real, esperado) {
  const r = JSON.stringify(real), e = JSON.stringify(esperado);
  if (r === e) { passou++; console.log('  [OK] ' + nome); }
  else { falhou++; console.log('  [FALHA] ' + nome + '\n     esperado: ' + e + '\n     obtido:   ' + r); }
}
function okTrue(nome, cond) {
  if (cond) { passou++; console.log('  [OK] ' + nome); }
  else { falhou++; console.log('  [FALHA] ' + nome); }
}

const catalogo = [
  { nome: 'COENZIMA Q10', dosagem: '100MG' },
  { nome: 'VITAMINA B12', dosagem: '2500MCG' },
  { nome: 'VITAMINA D3', dosagem: '600.000 UI' },
  { nome: 'TIRZEPATIDA', dosagem: '2,5MG' },
  { nome: 'TIRZEPATIDA', dosagem: '5MG' },
  { nome: 'TIRZEPATIDA', dosagem: '10MG' },
  { nome: 'TESTOSTERONA BIO', dosagem: '25MG' },
  { nome: 'TESTOSTERONA BIO', dosagem: '200MG' },
  { nome: 'TESTOSTERONA BIO', dosagem: '1000MG' },
  { nome: 'ET-7 ENANTATO', dosagem: '250MG' },
  { nome: 'NAC N-ACETIL CISTEINA', dosagem: '300MG' },
  { nome: 'VITAMINA C', dosagem: '10G' },
  { nome: 'COMPLEXO B', dosagem: 'INJETAVEL' }
];

console.log('== nome canonico (formato "Coenzima Q10 100mg") ==');
ok('exemplo do CEO', api.montarNomeCanonico_('COENZIMA Q10', '100MG'), 'Coenzima Q10 100mg');
ok('codigo com digito fica caixa alta', api.padronizarNomeSubstancia_('VITAMINA D3'), 'Vitamina D3');
ok('codigo ET-7 preserva', api.padronizarNomeSubstancia_('ET-7 ENANTATO'), 'ET-7 Enantato');
ok('sigla NAC + hifen', api.padronizarNomeSubstancia_('NAC N-ACETIL CISTEINA'), 'NAC N-Acetil Cisteina');
ok('letra unica caixa alta', api.padronizarNomeSubstancia_('VITAMINA C'), 'Vitamina C');
ok('Complexo B', api.padronizarNomeSubstancia_('COMPLEXO B'), 'Complexo B');
ok('NAD+ preserva sinal', api.padronizarNomeSubstancia_('NAD+'), 'NAD+');
ok('remove acentos', api.padronizarNomeSubstancia_('Acido Alfa Lipoico'), 'Acido Alfa Lipoico');

console.log('== dosagem canonica (cola unidade, minuscula) ==');
ok('100 mg -> 100mg', api.padronizarDosagem_('100 mg'), '100mg');
ok('100MG -> 100mg', api.padronizarDosagem_('100MG'), '100mg');
ok('2,5MG -> 2,5mg', api.padronizarDosagem_('2,5MG'), '2,5mg');
ok('600.000 UI -> 600.000ui', api.padronizarDosagem_('600.000 UI'), '600.000ui');
ok('10G -> 10g', api.padronizarDosagem_('10G'), '10g');
ok('60ML -> 60ml', api.padronizarDosagem_('60ML'), '60ml');
ok('nao-numerica vira minuscula', api.padronizarDosagem_('INJETAVEL'), 'injetavel');
ok('unidade nao reconhecida NAO cola (1 ampola)', api.padronizarDosagem_('1 ampola'), '1 ampola');
ok('unidade nao reconhecida NAO cola (60 min)', api.padronizarDosagem_('60 min'), '60 min');
ok('decimal ponto 2.5 mg -> 2.5mg', api.padronizarDosagem_('2.5 mg'), '2.5mg');

console.log('== casamento contra o catalogo (CADASTRO = fonte da verdade) ==');
ok('Coenzima Q10 injetavel -> canonico', api.resolverSubstanciaCanonica_('Coenzima Q10 injetavel', catalogo).canonico, 'Coenzima Q10 100mg');
ok('Vitamina B12 metilcobalamina -> canonico', api.resolverSubstanciaCanonica_('Vitamina B12 metilcobalamina', catalogo).canonico, 'Vitamina B12 2500mcg');
okTrue('VITAMINA B12 2500MG (mg!=mcg) NAO auto-coage -> null', api.resolverSubstanciaCanonica_('VITAMINA B12 2500MG', catalogo) === null);
ok('COENZIMA Q10 100MG dose bate -> casa', api.resolverSubstanciaCanonica_('COENZIMA Q10 100MG', catalogo).canonico, 'Coenzima Q10 100mg');
okTrue('Coenzima Q10 50mg (dose divergente, candidato unico) -> null', api.resolverSubstanciaCanonica_('Coenzima Q10 50mg', catalogo) === null);
okTrue('Vitamina D injetavel SEM correspondencia (nao casa D3)', api.resolverSubstanciaCanonica_('Vitamina D injetavel', catalogo) === null);
okTrue('Testosterona bioidentica SEM correspondencia (nao e BIO+espaco)', api.resolverSubstanciaCanonica_('Testosterona bioidentica', catalogo) === null);
ok('prefixo mais longo vence', api.resolverSubstanciaCanonica_('ET-7 Enantato 250 alguma coisa', catalogo).canonico, 'ET-7 Enantato 250mg');

console.log('== desambiguacao por dose (multiplas dosagens do mesmo nome) ==');
ok('extrai dose do texto livre', api.extrairDoseLivre_('TESTOSTERONA BIO 200MG'), '200mg');
ok('extrai 600K nao casa unidade -> vazio', api.extrairDoseLivre_('VITAMINA D3 600K'), '');
ok('Testosterona Bio 200MG -> 200mg (nao 25)', api.resolverSubstanciaCanonica_('TESTOSTERONA BIO 200MG', catalogo).canonico, 'Testosterona Bio 200mg');
ok('Testosterona Bio 25MG -> 25mg', api.resolverSubstanciaCanonica_('TESTOSTERONA BIO 25MG', catalogo).canonico, 'Testosterona Bio 25mg');
ok('Tirzepatida 5MG -> 5mg (nao 2,5)', api.resolverSubstanciaCanonica_('TIRZEPATIDA 5MG', catalogo).canonico, 'Tirzepatida 5mg');
ok('Tirzepatida 2,5MG -> 2,5mg', api.resolverSubstanciaCanonica_('TIRZEPATIDA 2,5MG', catalogo).canonico, 'Tirzepatida 2,5mg');
okTrue('Tirzepatida SEM dose = ambiguo -> null', api.resolverSubstanciaCanonica_('Tirzepatida', catalogo) === null);
okTrue('Testosterona Bio 999MG = dose inexistente -> null', api.resolverSubstanciaCanonica_('TESTOSTERONA BIO 999MG', catalogo) === null);

console.log('== APELIDOS (fenotipo -> genotipo, decidido pelo CEO) ==');
const apelidos = [
  { de: 'Vitamina D injetavel',       para: 'Vitamina D3 600.000ui', status: 'ATIVO' },
  { de: 'VITAMINA B12 2500MG',        para: 'Vitamina B12 2500mcg',  status: 'ATIVO' },
  { de: 'Testosterona bioidentica',   para: '',                      status: 'REVISAR_DOSE' },
  { de: 'Tirzepatida',                para: '',                      status: 'REVISAR_DOSE' },
  { de: 'Peptideo X (emagrecimento)', para: '',                      status: 'SEM_CADASTRO' }
];
// ATIVO resolve pro genotipo inequivoco
ok('apelido ATIVO: D injetavel -> D3 600.000ui', api.resolverSubstanciaCanonica_('Vitamina D injetavel', catalogo, apelidos).canonico, 'Vitamina D3 600.000ui');
ok('apelido marca via=APELIDO', api.resolverSubstanciaCanonica_('Vitamina D injetavel', catalogo, apelidos).via, 'APELIDO');
ok('apelido ATIVO: B12 2500mg(typo) -> 2500mcg', api.resolverSubstanciaCanonica_('VITAMINA B12 2500MG', catalogo, apelidos).canonico, 'Vitamina B12 2500mcg');
// apelido casa por chave (acento/caixa irrelevantes)
ok('apelido casa com acento+caixa diferente', api.resolverSubstanciaCanonica_('VITAMINA D INJETÁVEL', catalogo, apelidos).canonico, 'Vitamina D3 600.000ui');
// orfaos intencionais => null (CEO ainda nao decidiu a dose)
okTrue('REVISAR_DOSE Testosterona -> null (intencional)', api.resolverSubstanciaCanonica_('Testosterona bioidentica', catalogo, apelidos) === null);
okTrue('REVISAR_DOSE Tirzepatida -> null (intencional)', api.resolverSubstanciaCanonica_('Tirzepatida', catalogo, apelidos) === null);
okTrue('SEM_CADASTRO Peptideo X -> null (intencional)', api.resolverSubstanciaCanonica_('Peptideo X (emagrecimento)', catalogo, apelidos) === null);
// fail-closed: apelido que aponta pra algo fora do catalogo nao resolve
okTrue('apelido para inexistente -> null (fail-closed)', api.resolverSubstanciaCanonica_('Algo Estranho', catalogo, [{ de: 'Algo Estranho', para: 'Coenzima Q10 999mg', status: 'ATIVO' }]) === null);
// apelido tem PRIORIDADE sobre o catalogo
ok('apelido vence catalogo', api.resolverSubstanciaCanonica_('Coenzima Q10 injetavel', catalogo, [{ de: 'Coenzima Q10 injetavel', para: 'Vitamina C 10g', status: 'ATIVO' }]).canonico, 'Vitamina C 10g');
// quando NAO ha apelido pro texto, cai no catalogo normal (regressao)
ok('sem apelido aplicavel -> catalogo (via=CATALOGO)', api.resolverSubstanciaCanonica_('Coenzima Q10 injetavel', catalogo, apelidos).via, 'CATALOGO');
// retrocompat: chamar sem apelidos continua funcionando
ok('retrocompat sem 3o arg', api.resolverSubstanciaCanonica_('COENZIMA Q10 100MG', catalogo).canonico, 'Coenzima Q10 100mg');
// indexarApelidos_ default de status ausente = ATIVO
okTrue('indexarApelidos_ status default ATIVO', api.indexarApelidos_([{ de: 'X', para: 'Y' }]).X.status === 'ATIVO');
// status endurecido: digitacao manual com espaco/caixa nao quebra
okTrue('indexarApelidos_ status " ativo " -> ATIVO', api.indexarApelidos_([{ de: 'X', para: 'Y', status: ' ativo ' }]).X.status === 'ATIVO');
ok('apelido " ativo " (minusculo+espaco) resolve', api.resolverSubstanciaCanonica_('Vitamina D injetavel', catalogo, [{ de: 'Vitamina D injetavel', para: 'Vitamina D3 600.000ui', status: ' ativo ' }]).canonico, 'Vitamina D3 600.000ui');
okTrue('status "revisar_dose" minusculo -> orfao null', api.resolverSubstanciaCanonica_('Tirzepatida', catalogo, [{ de: 'Tirzepatida', para: '', status: 'revisar_dose' }]) === null);
// acharPorCanonico_ tolera grafia (caixa/espaco) do "para"
okTrue('acharPorCanonico_ tolera caixa/espaco', api.acharPorCanonico_('vitamina b12 2500MCG', catalogo) !== null);
okTrue('acharPorCanonico_ inexistente -> null', api.acharPorCanonico_('Coenzima Q10 7mg', catalogo) === null);

console.log('== planejar varredura (diff + fail-closed) ==');
const plano = api.planejarVarredura_([
  { aba: 'ORCAMENTO', linha: 8, texto: 'Coenzima Q10 injetavel' },
  { aba: 'FINANCEIRO', linha: 2, texto: 'COENZIMA Q10 100MG' },
  { aba: 'ORCAMENTO', linha: 9, texto: 'Vitamina D injetavel' }
], catalogo);
ok('linha 1 OK + mudou', { s: plano[0].status, p: plano[0].para, m: plano[0].mudou }, { s: 'OK', p: 'Coenzima Q10 100mg', m: true });
ok('linha 2 padroniza grafia', { s: plano[1].status, p: plano[1].para }, { s: 'OK', p: 'Coenzima Q10 100mg' });
ok('linha 3 fica intacta + flag', { s: plano[2].status, p: plano[2].para }, { s: 'SEM_CORRESPONDENCIA', p: 'Vitamina D injetavel' });

console.log('\n== RESULTADO PADRONIZACAO: ' + passou + ' OK / ' + falhou + ' FALHA ==');
if (falhou > 0) process.exit(1);
