/**
 * Relatorio OPERADOR: roda a varredura PURA sobre os nomes REAIS das abas e mostra
 * BEFORE -> AFTER + lista SEM_CORRESPONDENCIA (que o CEO precisa apelidar/decidir).
 * Rodar: node docs/dr-replit/ras-kaizen-v8/tests/relatorio_varredura.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, '..', 'Padronizacao.gs'), 'utf8');
function extrair(nome) {
  const m = new RegExp('function\\s+' + nome + '\\s*\\(').exec(src);
  const abre = src.indexOf('{', m.index);
  let d = 0, j = abre;
  for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (!d) { j++; break; } } }
  return src.slice(m.index, j);
}
const PURAS = ['removerAcentosSub_', 'tituloPalavraSub_', 'ehTokenCodigo_', 'normalizarPalavraSub_',
  'padronizarNomeSubstancia_', 'padronizarDosagem_', 'montarNomeCanonico_', 'chaveBuscaSub_',
  'extrairDoseLivre_', 'resolverSubstanciaCanonica_', 'planejarVarredura_'];
let comb = 'var ACRONIMOS_SUBSTANCIA = { NAC:1,DMSA:1,HCG:1,DHEA:1,PQQ:1,ADEK:1,NAD:1,DMAE:1,EV:1,IM:1,SC:1,UI:1 };\n';
PURAS.forEach((n) => { comb += extrair(n) + '\n'; });
comb += 'return { ' + PURAS.join(', ') + ' };';
const api = new Function(comb)();

// ---- CATALOGO REAL (CADASTRO SUBSTANCIAS) ----
const catalogo = [
  ['COENZIMA Q10', '100MG'], ['PQQ', '20MG'], ['RESVERATROL', '100MG'], ['EXYNUTRIMENT', '20MG'],
  ['VITAMINA D3', '600.000 UI'], ['VITAMINA B12', '2500MCG'], ['VITAMINA ADEK', '600.000 UI'],
  ['TRIO METILADOR', 'COMPLEXO'], ['NAC N-ACETIL CISTEINA', '300MG'], ['ACIDO ALFA LIPOICO', '600MG'],
  ['GLUTATIONA', '600MG'], ['VITAMINA C', '10G'], ['NAD+', '250MG'], ['TIRZEPATIDA', '2,5MG'],
  ['TIRZEPATIDA', '5MG'], ['TIRZEPATIDA', '10MG'], ['RETATRUTIDE', '10MG'], ['HCG', '500 UI'],
  ['HCG', '5000 UI'], ['TESAMORELIN', '10MG'], ['PROGESTERONA', '200MG'], ['TESTOSTERONA BIO', '25MG'],
  ['TESTOSTERONA BIO', '200MG'], ['TESTOSTERONA BIO', '1000MG'], ['COMPLEXO B', 'INJETAVEL'],
  ['ZINCO QUELADO', '20MG'], ['SELENIO', '100MCG'], ['MAGNESIO', '500MG'], ['TAURINA', '500MG'],
  ['DMSA', '250MG'], ['CURCUMINA', '100MG'], ['FOSFATIDILCOLINA', '500MG'], ['MELATONINA', '3MG'],
  ['DHEA', '50MG'], ['OZONIO TERAPIA', '60ML'], ['ET-7 ENANTATO', '250MG'], ['CT-15 CIPIONATO', '200MG'],
  ['DA-7 DURATESTON', '250MG'], ['MT-7 METENOLONA', '100MG'], ['BD-7 BOLDENONA', '200MG'],
  ['DN-7 DROSTANOLONA', '100MG']
].map(([nome, dosagem]) => ({ nome, dosagem }));

// ---- OCORRENCIAS REAIS (nomes livres nas demais abas) ----
const ocorrencias = [
  ['ORCAMENTO/TABELA', 5, 'Testosterona bioidentica'],
  ['ORCAMENTO/TABELA', 6, 'Tesamorelin (peptideo)'],
  ['ORCAMENTO/TABELA', 7, 'Tirzepatida'],
  ['ORCAMENTO/TABELA', 8, 'Coenzima Q10 injetavel'],
  ['ORCAMENTO/TABELA', 9, 'Vitamina D injetavel'],
  ['ORCAMENTO/TABELA', 10, 'Vitamina B12 metilcobalamina'],
  ['TABELA(Edneia)', 6, 'Peptideo X (emagrecimento)'],
  ['FINANCEIRO K', 2, 'VITAMINA B12 2500MG'],
  ['FINANCEIRO K', 3, 'VITAMINA D3 600K'],
  ['FINANCEIRO K', 4, 'COENZIMA Q10 100MG'],
  ['FINANCEIRO K', 5, 'PQQ 20MG'],
  ['FINANCEIRO K', 6, 'TESTOSTERONA BIO 200MG'],
  ['FINANCEIRO K', 7, 'TESTOSTERONA BIO 25MG'],
  ['FINANCEIRO K', 8, 'TIRZEPATIDA 5MG'],
  ['FINANCEIRO K', 11, 'DN-7 DROSTANOLONA 100MG'],
  ['FINANCEIRO K', 12, 'VITAMINA ADEK 600K'],
  ['FINANCEIRO K', 13, 'ET-7 ENANTATO 250MG']
].map(([aba, linha, texto]) => ({ aba, linha, texto }));

console.log('==== CATALOGO CANONICO (CADASTRO SUBSTANCIAS, fonte da verdade) ====\n');
catalogo.forEach((c) => {
  console.log('  ' + (c.nome + '/' + c.dosagem).padEnd(34) + ' ->  ' + api.montarNomeCanonico_(c.nome, c.dosagem));
});

const plano = api.planejarVarredura_(ocorrencias, catalogo);
console.log('\n==== VARREDURA NAS DEMAIS ABAS (BEFORE -> AFTER) ====\n');
plano.forEach((p) => {
  const tag = p.status === 'OK' ? (p.mudou ? '[corrige]' : '[ok-igual]') : '[!! REVISAR]';
  console.log('  ' + tag.padEnd(13) + (p.aba + ' L' + p.linha).padEnd(20) + ' "' + p.de + '"  ->  "' + p.para + '"');
});

const semCorr = plano.filter((p) => p.status === 'SEM_CORRESPONDENCIA');
console.log('\n==== SEM CORRESPONDENCIA (CEO precisa decidir o apelido) ====\n');
if (!semCorr.length) console.log('  (nenhum)');
semCorr.forEach((p) => console.log('  - ' + p.aba + ' L' + p.linha + ': "' + p.de + '"'));
console.log('\n  Total: ' + plano.length + ' ocorrencias | ' +
  plano.filter((p) => p.status === 'OK').length + ' casadas | ' + semCorr.length + ' sem correspondencia');
