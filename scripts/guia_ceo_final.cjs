'use strict';
// GUIA CEO PAWARDS — VERSAO FINAL — FUNDO BRANCO PROFISSIONAL
// Executar: node scripts/guia_ceo_final.cjs
const PDF = require('../artifacts/api-server/node_modules/pdfkit/js/pdfkit.js');
const fs  = require('fs');

const OUT = './GUIA CEO PAWARDS DR CAIO 26.07.16.pdf';
const doc = new PDF({ size:'A4', margin:0, autoFirstPage:true, bufferPages:false });
doc.pipe(fs.createWriteStream(OUT));

// ── PALETA (fundo branco, impressao profissional) ───────────────────────────
const NAVY   = '#0B2E4A';   // azul escuro para cabecalhos
const BLUE   = '#1565C0';   // azul medio para titulos de secao
const TEAL   = '#006B75';   // teal escuro para destaques
const LIGHT  = '#EBF5FB';   // azul bem claro para linhas pares de tabela
const GRAY   = '#F4F6F7';   // cinza muito claro para linhas impares
const BLACK  = '#1A1A1A';   // preto suave para texto principal
const DGRAY  = '#555555';   // cinza medio para texto secundario
const GREEN  = '#1B5E20';   // verde escuro para OK / positivo
const RED    = '#B71C1C';   // vermelho escuro para erro / alerta
const GOLD   = '#7D5700';   // dourado escuro para destaque
const W      = '#FFFFFF';   // branco puro
const ORANGE = '#BF360C';   // laranja escuro para cuidado

const PW = 595, PH = 842, M = 36, CW = PW - M*2;
const FOOTER_Y = PH - 26;
const MAX_Y    = FOOTER_Y - 6;

// ── FUNCOES BASE ────────────────────────────────────────────────────────────

function pageHeader(title, sub, pg) {
  // Fundo branco (default), apenas faixa de cabecalho azul escuro
  doc.rect(0,0,PW,66).fill(NAVY);
  doc.rect(0,0,PW,3).fill(TEAL);
  doc.fontSize(7).fillColor('#90CAF9').font('Helvetica')
     .text('PAWARDS — SISTEMA CLINICO INTEGRATIVO  |  CEO: DR. CAIO HENRIQUE FERNANDES PADUA  |  PADCOM', M, 10, {align:'center', width:CW, lineBreak:false});
  doc.fontSize(15).fillColor(W).font('Helvetica-Bold')
     .text(title, M, 22, {align:'center', width:CW, lineBreak:false});
  if (sub) doc.fontSize(8.5).fillColor('#B3E5FC').font('Helvetica')
              .text(sub, M, 44, {align:'center', width:CW, lineBreak:false});
  doc.fontSize(7).fillColor('#90CAF9')
     .text('PAG. '+pg+' DE 6  |  16/07/2026', PW-100, 54, {lineBreak:false});
  doc.rect(0,66,PW,2).fill(TEAL);
  return 76;
}

function footer() {
  doc.rect(0,FOOTER_Y,PW,26).fill(NAVY);
  doc.rect(0,FOOTER_Y,PW,2).fill(TEAL);
  doc.fontSize(7).fillColor('#B3E5FC').font('Helvetica-Bold')
     .text('PAWARDS | CEO Dr. Caio Henrique Fernandes Padua | PADCOM | Confidencial | 16/07/2026', M, FOOTER_Y+10, {align:'center', width:CW, lineBreak:false});
}

function secTitle(txt, y, cor) {
  cor = cor || BLUE;
  doc.rect(M, y, 5, 20).fill(cor);
  doc.fontSize(11).fillColor(cor).font('Helvetica-Bold')
     .text(txt, M+10, y+3, {width:CW-12, lineBreak:false});
  doc.rect(M+10, y+20, CW-12, 0.8).fill('#BBDEFB');
  return y + 28;
}

function thRow(cols, widths, y, bgColor) {
  bgColor = bgColor || NAVY;
  doc.rect(M, y, CW, 17).fill(bgColor);
  var x = M;
  cols.forEach(function(c,i){
    doc.fontSize(8.5).fillColor(W).font('Helvetica-Bold')
       .text(c, x+4, y+5, {width:widths[i]-6, lineBreak:false});
    x += widths[i];
  });
  return y+18;
}

function tdRow(cols, widths, y, alt, colors) {
  colors = colors || [];
  doc.rect(M, y, CW, 17).fill(alt ? LIGHT : W);
  doc.rect(M, y, CW, 17).stroke('#D5E8F5').lineWidth(0.4);
  var x = M;
  cols.forEach(function(c,i){
    var cor = colors[i] || BLACK;
    var bold = c && c.bold;
    var txt  = bold ? c.text : String(c||'');
    doc.fontSize(8.5).fillColor(cor).font(bold?'Helvetica-Bold':'Helvetica')
       .text(txt, x+4, y+5, {width:widths[i]-6, lineBreak:false});
    x += widths[i];
  });
  return y+18;
}

// Caixa de passo numerado (passo 1, 2, 3...)
function step(n, title, lines, y) {
  var h = 26 + lines.length * 13;
  // Sombra sutil
  doc.rect(M+2, y+2, CW, h).fill('#E8E8E8');
  // Caixa principal
  doc.rect(M, y, CW, h).fill(W);
  doc.rect(M, y, CW, h).stroke('#BBDEFB').lineWidth(0.6);
  // Faixa lateral numerada
  doc.rect(M, y, 34, h).fill(TEAL);
  doc.fontSize(15).fillColor(W).font('Helvetica-Bold')
     .text(String(n), M+1, y + Math.floor(h/2) - 9, {width:32, align:'center', lineBreak:false});
  // Titulo
  doc.fontSize(9.5).fillColor(NAVY).font('Helvetica-Bold')
     .text(title, M+40, y+5, {width:CW-44, lineBreak:false});
  // Linha abaixo do titulo
  doc.rect(M+40, y+18, CW-44, 0.5).fill('#DDDDDD');
  // Linhas de conteudo
  lines.forEach(function(l,i){
    // Bullet triangulo
    doc.fontSize(8).fillColor(TEAL).text('\u25B8', M+40, y+21+i*13, {width:10, lineBreak:false});
    doc.fontSize(8).fillColor(BLACK).font('Helvetica')
       .text(l, M+50, y+21+i*13, {width:CW-56, lineBreak:false});
  });
  return y + h + 6;
}

// Caixa de API com letra/codigo
function apiStep(code, title, lines, y, accentColor) {
  accentColor = accentColor || BLUE;
  var h = 26 + lines.length * 13;
  doc.rect(M+2, y+2, CW, h).fill('#E8E8E8');
  doc.rect(M, y, CW, h).fill(W);
  doc.rect(M, y, CW, h).stroke('#BBDEFB').lineWidth(0.6);
  doc.rect(M, y, 34, h).fill(accentColor);
  doc.fontSize(13).fillColor(W).font('Helvetica-Bold')
     .text(code, M+1, y + Math.floor(h/2) - 8, {width:32, align:'center', lineBreak:false});
  doc.fontSize(9.5).fillColor(NAVY).font('Helvetica-Bold')
     .text(title, M+40, y+5, {width:CW-44, lineBreak:false});
  doc.rect(M+40, y+18, CW-44, 0.5).fill('#DDDDDD');
  lines.forEach(function(l,i){
    doc.fontSize(8).fillColor(accentColor).text('\u25B8', M+40, y+21+i*13, {width:10, lineBreak:false});
    doc.fontSize(8).fillColor(BLACK).font('Helvetica')
       .text(l, M+50, y+21+i*13, {width:CW-56, lineBreak:false});
  });
  return y + h + 6;
}

// Caixa de fluxo (para organogramas/fluxogramas)
function flowBox(txt, y, x, w, h, bg, txtColor, bold) {
  bg = bg || W;
  txtColor = txtColor || NAVY;
  bold = bold || false;
  doc.rect(x+1, y+1, w, h).fill('#CCCCCC');
  doc.rect(x, y, w, h).fill(bg);
  doc.rect(x, y, w, h).stroke(TEAL).lineWidth(0.8);
  var fontSize = txt.length > 30 ? 7.5 : 8.5;
  doc.fontSize(fontSize).fillColor(txtColor).font(bold?'Helvetica-Bold':'Helvetica')
     .text(txt, x+4, y + Math.floor(h/2) - (fontSize * 0.7), {width:w-8, align:'center', lineBreak:false});
  return { cx: x + w/2, cy: y + h/2, bottom: y + h, right: x + w };
}

// Seta para baixo entre caixas de fluxo
function arrowDown(x, y1, y2) {
  doc.moveTo(x, y1).lineTo(x, y2-6).stroke(TEAL).lineWidth(1.2);
  // Triangulo da seta
  doc.polygon([x-4, y2-6], [x+4, y2-6], [x, y2]).fill(TEAL);
}

// Seta para direita
function arrowRight(x1, x2, y) {
  doc.moveTo(x1, y).lineTo(x2-6, y).stroke(TEAL).lineWidth(1.2);
  doc.polygon([x2-6, y-4], [x2-6, y+4], [x2, y]).fill(TEAL);
}

// Caixa de alerta / erro
function alertBox(tipo, descricao, consequencia, y) {
  var h = 28;
  doc.rect(M+2, y+2, CW, h).fill('#E8E8E8');
  doc.rect(M, y, CW, h).fill('#FFF8F8');
  doc.rect(M, y, CW, h).stroke('#FFCDD2').lineWidth(0.6);
  doc.rect(M, y, 52, h).fill(RED);
  doc.fontSize(7.5).fillColor(W).font('Helvetica-Bold')
     .text(tipo, M+2, y+9, {width:48, align:'center', lineBreak:false});
  doc.fontSize(8.5).fillColor(RED).font('Helvetica-Bold')
     .text('\u26A0 '+descricao, M+58, y+4, {width:CW-62, lineBreak:false});
  doc.fontSize(7.5).fillColor(ORANGE).font('Helvetica')
     .text('Consequencia: '+consequencia, M+58, y+17, {width:CW-62, lineBreak:false});
  return y + h + 4;
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGINA 1: MISSAO + ORGANOGRAMA + MATEMATICA + ROADMAP
// ═══════════════════════════════════════════════════════════════════════════
var y = pageHeader('MISSAO E ESTRATEGIA DO CEO', 'Organograma PADCOM * Matematica do Milhao * Roadmap Completo', 1);

// ── Missao destaque
doc.rect(M, y, CW, 36).fill(NAVY);
doc.rect(M, y, 4, 36).fill(TEAL);
doc.fontSize(9).fillColor('#B3E5FC').font('Helvetica-Bold')
   .text('MISSAO:', M+10, y+5, {lineBreak:false});
doc.fontSize(9).fillColor(W).font('Helvetica')
   .text('Construir o SaaS clinico mais moderno do Brasil e chegar a R$ 1.500.000 por ano com 50 clinicas licenciadas. Comecar pelo Instituto Padua — 1 paciente real, hoje.', M+10, y+17, {width:CW-14, lineBreak:false});
y += 42;

// ── ORGANOGRAMA
y = secTitle('ORGANOGRAMA — PIRAMIDE PADCOM', y, NAVY);

// Organograma em caixas reais conectadas por setas (fluxograma piramidal)
var bw1 = 180, bw2 = 200, bw3 = 220, bw4 = 220, bh = 30;
var cx = M + CW/2;

// Caixa 1: PADCOM
var b1 = flowBox('PADCOM\nHolding | Empresa-Mae do CEO', y, cx-bw1/2, bw1, bh, NAVY, W, true);
y += bh + 2;
arrowDown(cx, b1.bottom, y+4);
y += 12;

// Caixa 2: PAWARDS
var b2 = flowBox('PAWARDS\nEngenharia e Sistemas (Sub-empresa)', y, cx-bw2/2, bw2, bh, BLUE, W, true);
y += bh + 2;
arrowDown(cx, b2.bottom, y+4);
y += 12;

// Nivel 3: Instituto Padua e Clinicas em paralelo
var b3a = flowBox('Instituto Padua\n5.270 pacientes reais\n(unidade_id = 15)', y, M, 200, bh+10, TEAL, W, true);
var b3b = flowBox('Clinicas Licenciadas\nBarros, Paluzze, Nova Clinica...\nPagam R$ 2.500/mes', y, M+214, CW-214, bh+10, LIGHT, NAVY, false);
arrowDown(M+100, b2.bottom, y+4);
arrowDown(M+214+(CW-214)/2, b2.bottom, y+4);
y += bh + 10 + 10;

// Legenda
doc.fontSize(7.5).fillColor(DGRAY).font('Helvetica').text(
  'Legenda:  [NAVY] = Holding PADCOM  |  [AZUL] = PAWARDS Tecnologia  |  [TEAL] = Clinica Propria  |  [CLARO] = Licenciadas (pagantes)',
  M, y, {width:CW, lineBreak:false});
y += 14;

// ── MATEMATICA DO MILHAO
y = secTitle('MATEMATICA DO MILHAO — COMO CHEGAR A R$ 1.500.000/ANO', y, GREEN);
y = thRow(['Qtd. Clinicas', 'Faturamento Mensal', 'Faturamento Anual', 'Meta'], [120,160,160,83], y);
[[10,'R$ 25.000/mes','R$ 300.000/ano','-'],
 [20,'R$ 50.000/mes','R$ 600.000/ano','-'],
 [30,'R$ 75.000/mes','R$ 900.000/ano','-'],
 [50,'R$ 125.000/mes','R$ 1.500.000/ano','OBJETIVO'],
].forEach(function(r,i){
  var colors = i===3 ? [GOLD,GOLD,{bold:true,text:r[2]},GREEN] : [BLACK,BLACK,BLACK,DGRAY];
  y = tdRow([r[0]+' clinicas x R$2.500', r[1], r[2], r[3]], [120,160,160,83], y, i%2===0, i===3 ? [GOLD,GOLD,GOLD,GREEN] : null);
});
y += 8;

// ── ROADMAP
y = secTitle('ROADMAP — O QUE CONSTRUIR E QUANDO', y, BLUE);
y = thRow(['Prazo', 'Acao', 'Resultado Esperado'], [70,300,153], y);
[['HOJE',      'Verificar fluxo clinico completo — 1 paciente real (47 min)',            'Primeiro atendimento 100% digital'],
 ['SEMANA 1',  'Fase C: INSERT herda empresa_id + Tela CEO com todas as clinicas',       'Isolamento multi-tenant completo'],
 ['SEMANA 2',  'IA Clinica: Claude gera atestado + sugere exames automaticamente',        'Medico ganha 30 min por consulta'],
 ['SEMANA 3',  'ElevenLabs: voz clonada do medico no WhatsApp por tomada',                'Aderencia ao tratamento sobe'],
 ['SEMANA 4',  'Stripe Metered: billing por uso em tempo real',                           'Receita proporcional ao uso'],
 ['MES 2',     'HeyGen: avatar em video do medico para cada paciente',                    'Diferenciacal unico no mercado'],
 ['MES 3',     'IoT: bioimpedancia + pressao no cadastro automatico',                     'Dados clinicos sem digitar'],
 ['MES 5-6',   'Primeira clinica licenciada ativa pagando R$ 2.500/mes',                  'RECEITA REAL CONFIRMADA'],
].forEach(function(r,i){
  var cor3 = i===7 ? GREEN : DGRAY;
  var cor1 = i===0 ? RED : (i===7 ? GREEN : BLUE);
  y = tdRow([r[0],r[1],r[2]], [70,300,153], y, i%2===0, [cor1, BLACK, cor3]);
});

footer();

// ═══════════════════════════════════════════════════════════════════════════
// PAGINA 2: FLUXO CLINICO COMPLETO — COMO ATENDER 1 PACIENTE
// ═══════════════════════════════════════════════════════════════════════════
doc.addPage();
y = pageHeader('FLUXO CLINICO COMPLETO', 'Como atender 1 paciente do login ao prontuario assinado — Instituto Padua', 2);

// ── Fluxograma visual horizontal com caixas conectadas
y = secTitle('FLUXOGRAMA DO ATENDIMENTO', y, NAVY);

var bw = 74, bh2 = 34, gap = 8, startX = M;
var steps = ['1\nLogin','2\nPaciente','3\nSessao','4\nAnamnese','5\nMotor\nClinico','6\nRAS\nPDF','7\nAssinar\nICP','8\nDrive +\nEmail'];
var colors2 = [NAVY, BLUE, BLUE, TEAL, TEAL, BLUE, NAVY, GREEN];
var txts2   = [W, W, W, W, W, W, W, W];

steps.forEach(function(s, i){
  var bx = M + i*(bw+gap);
  var txt = s.replace(/\n/g,' ');
  doc.rect(bx+1, y+1, bw, bh2).fill('#CCCCCC');
  doc.rect(bx, y, bw, bh2).fill(colors2[i]);
  doc.rect(bx, y, bw, bh2).stroke(TEAL).lineWidth(0.8);
  doc.fontSize(7.5).fillColor(W).font('Helvetica-Bold').text(s.split('\n')[0], bx, y+5, {width:bw, align:'center', lineBreak:false});
  if(s.split('\n')[1]) doc.fontSize(6.5).text(s.split('\n').slice(1).join('\n'), bx, y+15, {width:bw, align:'center', lineBreak:false});
  if(i < steps.length-1){
    var ax = bx+bw+1;
    doc.moveTo(ax, y+bh2/2).lineTo(ax+gap-2, y+bh2/2).stroke(TEAL).lineWidth(1);
    doc.polygon([ax+gap-2, y+bh2/2-3], [ax+gap-2, y+bh2/2+3], [ax+gap, y+bh2/2]).fill(TEAL);
  }
});
y += bh2 + 14;

// Legenda do fluxograma
doc.fontSize(7.5).fillColor(DGRAY).font('Helvetica')
   .text('Legenda:  [Azul Escuro] = Autenticacao  |  [Azul Medio] = Gestao de Dados  |  [Teal] = Motor Clinico  |  [Verde] = Entrega Final', M, y, {lineBreak:false});
y += 14;

// ── Passos detalhados
y = secTitle('PASSOS DETALHADOS — 47 MINUTOS TOTAIS NO PRIMEIRO ATENDIMENTO', y, NAVY);

y = step(1,'LOGIN NO SISTEMA (2 min)',[
  'URL: acesse o sistema PAWARDS via navegador (link fornecido pelo CEO)',
  'E-mail: seu e-mail cadastrado | Senha: sua senha pessoal',
  'Selecionar unidade: INSTITUTO PADUA (unidade_id = 15)',
  'MFA (Multi-Factor Authentication = autenticacao dupla): abrir Google Authenticator no celular e digitar o codigo de 6 digitos',
  'Dashboard abre: fila operacional do dia aparece com as sessoes de hoje',
], y);

y = step(2,'SELECIONAR PACIENTE (3 min)',[
  'Menu lateral -> Pacientes',
  'Buscar pelo NOME COMPLETO ou pelo CPF do paciente',
  'Clicar no nome do paciente para abrir o prontuario completo',
  'Verificar: dados cadastrais estao atualizados? E-mail e celular corretos?',
], y);

y = step(3,'CRIAR NOVA SESSAO (5 min)',[
  'Dentro do prontuario: botao "NOVA SESSAO" (canto superior direito)',
  'Tipo de consulta: Consulta Medica | Protocolo | Avaliacao | Retorno',
  'Data: hoje | Hora: horario real da consulta',
  'Profissional: Dr. Caio Henrique Fernandes Padua (CRM: seu CRM)',
  'Confirmar -> sessao criada -> Google Calendar sincroniza automaticamente em segundos',
  'WhatsApp automatico disparado ao paciente: "Sua consulta e hoje as [hora]"',
], y);

y = step(4,'ANAMNESE V2 — MOTOR CLINICO (20 min com o paciente)',[
  'Dentro da sessao: botao "INICIAR ANAMNESE"',
  'Sistema exibe perguntas estruturadas com SKIP-LOGIC (skip = pular) — perguntas irrelevantes sao omitidas automaticamente',
  'Alertas: VERMELHO = urgencia clinica (mostrar ao medico imediatamente) | AMARELO = monitorar | VERDE = dentro do esperado',
  'Ao finalizar: MOTOR CLINICO analisa todas as respostas e gera sugestoes',
  'Sugestoes automaticas: formulas magistrais + injetaveis + protocolos baseados no historico do paciente',
  'Medico revisa cada sugestao, ajusta dose ou via se necessario, e confirma',
], y);

y = step(5,'GERAR RAS + ASSINAR ICP-BRASIL (10 min)',[
  'RAS = Registro de Assistencia Sistemica (prontuario digital com validade juridica)',
  'Botao "GERAR RAS" -> PDF gerado automaticamente: nome + protocolo + substancias + CRM + data + assinatura pendente',
  'REVISAR o PDF na tela antes de assinar: verificar CRM correto, nome do paciente, substancias',
  'Botao "ASSINAR COM ICP-BRASIL" -> ZapSign envia link de assinatura no seu e-mail e WhatsApp',
  'ICP-Brasil = Infrastructure de Chaves Publicas Brasil = assinatura digital com validade juridica igual a assinatura fisica em cartorio',
  'Abrir o link -> assinar -> PDF recebe carimbo de validade juridica',
], y);

y = step(6,'UPLOAD DRIVE + ENVIO AO PACIENTE (5 min — automatico)',[
  'Apos assinatura: sistema faz upload automatico para Google Drive na pasta do paciente',
  'Estrutura: /PAWARDS/Instituto Padua/Pacientes/[Nome Paciente]/RAS_2026-07-16.pdf',
  'E-mail automatico enviado ao paciente com o PDF assinado em anexo',
  'SMS/WhatsApp automatico: "Seu prontuario esta disponivel. Acesse pelo link..."',
  'VERIFICAR: abrir o Drive e confirmar que o arquivo esta na pasta correta',
  'TOTAL: ~47 min no 1o atendimento. A partir do 2o atendimento: ~20 min',
], y);

footer();

// ═══════════════════════════════════════════════════════════════════════════
// PAGINA 3: APIS PARTE 1 — GOOGLE + TWILIO
// ═══════════════════════════════════════════════════════════════════════════
doc.addPage();
y = pageHeader('CADASTRO NAS APIS — PARTE 1', 'Google Workspace (Drive + Calendar + Gmail) e Twilio (WhatsApp)', 3);

// Tabela de e-mails
y = secTitle('REGRA FUNDAMENTAL — QUAL E-MAIL USAR PARA CADA SERVICO', y, NAVY);
y = thRow(['Clinica / Servico','E-mail Correto','Por Que Este','Observacao'],[130,170,120,103],y);
[
  ['Instituto Padua (clinica propria)', 'e-mail institucional da clinica','Ja existe e tem historico', 'Verificar acesso antes de usar'],
  ['Google APIs (Drive + Calendar)','Mesmo e-mail da clinica','1 conta Google por clinica','Nunca misturar clinicas numa so conta'],
  ['Nova clinica licenciada','[nome]@gmail.com ou corporativo','Criar antes de iniciar onboarding','Anotar em cofre de senhas'],
  ['Twilio (WhatsApp geral)','E-mail pessoal do CEO','1 conta Twilio = N numeros','1 conta master serve todas as clinicas'],
  ['Asaas (cobranca PIX)','E-mail financeiro da clinica','Vinculado ao CNPJ da clinica','1 conta Asaas por CNPJ — OBRIGATORIO'],
  ['ZapSign (assinatura digital)','E-mail do medico responsavel','Assinatura vinculada ao CRM','1 conta ZapSign serve todas as clinicas'],
  ['Claude / Anthropic (IA)','E-mail pessoal do CEO','1 conta para todo o sistema','Cobranca por token (por uso)'],
  ['ElevenLabs (voz)','E-mail do medico ou CEO','Voz clonada do medico fica na conta','1 clone de voz por medico'],
].forEach(function(r,i){
  y = tdRow(r, [130,170,120,103], y, i%2===0, [NAVY, BLUE, DGRAY, DGRAY]);
});
y += 10;

// API Google
y = secTitle('API 1 — GOOGLE WORKSPACE (Drive + Calendar + Gmail)', y, '#1565C0');

// Fluxograma do Google OAuth
var gsteps = ['Criar conta\nGoogle para\na clinica','Acessar\nGoogle Cloud\nConsole','Ativar APIs:\nDrive+Calendar\n+Gmail','Criar credenciais\nOAuth 2.0\n(Client ID)','Conectar no\nsistema\nPAWARDS','Autorizar:\nDrive+Calendar\n+Gmail'];
var gsw = 84, gsh = 36, gsgap = 6, gsx = M;
gsteps.forEach(function(s,i){
  var bx = M + i*(gsw+gsgap);
  doc.rect(bx+1, y+1, gsw, gsh).fill('#CCCCCC');
  doc.rect(bx, y, gsw, gsh).fill(i===5?GREEN:BLUE);
  doc.rect(bx, y, gsw, gsh).stroke(TEAL).lineWidth(0.8);
  doc.fontSize(7).fillColor(W).font('Helvetica-Bold').text(s, bx+2, y+4, {width:gsw-4, align:'center'});
  if(i<gsteps.length-1){
    var ax=bx+gsw+1;
    doc.moveTo(ax,y+gsh/2).lineTo(ax+gsgap-1,y+gsh/2).stroke(TEAL).lineWidth(1);
    doc.polygon([ax+gsgap-2,y+gsh/2-3],[ax+gsgap-2,y+gsh/2+3],[ax+gsgap,y+gsh/2]).fill(TEAL);
  }
});
y += gsh+8;
doc.fontSize(7.5).fillColor(DGRAY).text('Legenda: este fluxo e feito 1 vez por clinica. Apos a 1a autorizacao, o token se renova sozinho por 90 dias.', M, y, {lineBreak:false});
y += 12;

y = apiStep('G1','Criar conta Google para cada clinica (5 min)',[
  'Acesse: accounts.google.com -> Criar conta -> Para minha empresa',
  'E-mail: [nomeclinica]@gmail.com OU e-mail corporativo proprio da clinica',
  'REGRA INEGOCIAVEL: 1 conta Google DIFERENTE por clinica — nunca misturar',
  'Anotar: e-mail + senha em cofre de senhas (LastPass, Bitwarden ou 1Password)',
  'Verificar o e-mail criado: confirmar a caixa de entrada funcionando',
], y, '#1565C0');

y = apiStep('G2','Ativar APIs no Google Cloud Console (15 min)',[
  'Acesse: console.cloud.google.com -> Login com a conta DA CLINICA (nao a pessoal)',
  'Clicar "Novo Projeto" -> Nome: "[Nome Clinica] Pawards" -> Criar',
  'Menu Esquerdo -> APIs e Servicos -> Biblioteca -> Buscar e ATIVAR:',
  '  GOOGLE DRIVE API: para upload automatico dos PDFs assinados dos pacientes',
  '  GOOGLE CALENDAR API: para sincronizar agenda de consultas em tempo real',
  '  GMAIL API: para enviar e-mails com PDF assinado ao paciente',
  'Credenciais -> Criar credenciais -> ID do cliente OAuth 2.0 -> Tipo: Aplicativo da Web',
  'URI autorizado de redirecionamento: https://[url-sistema]/api/google/callback',
  'Baixar o arquivo JSON -> guardar como google_[nomeclinica].json em local seguro',
], y, '#1565C0');

y = apiStep('G3','Conectar ao sistema Pawards (1 vez por clinica) (5 min)',[
  'Menu -> Configuracoes -> Integracoes -> Google',
  'Colar: Client ID e Client Secret (copiar do arquivo JSON baixado no G2)',
  'Clicar "Conectar" -> abre janela pop-up Google -> selecionar conta DA CLINICA',
  'Autorizar todos os escopos: Drive (leitura+escrita) + Calendar (leitura+escrita) + Gmail (envio)',
  'Token salvo automaticamente no sistema. Valido por 90 dias. Renova sozinho.',
  'Verificar: tela de Integracoes mostra "Google: CONECTADO" com fundo verde',
], y, '#1565C0');
y += 6;

// API Twilio
y = secTitle('API 2 — TWILIO (WhatsApp Automatizado)', y, RED);

y = apiStep('T1','Criar conta Twilio master — 1 conta para todas as clinicas (10 min)',[
  'Acesse: twilio.com -> "Sign up free" -> usar e-mail PESSOAL do CEO (conta master)',
  'Verificar e-mail + numero de celular: Twilio liga ou envia SMS para verificar',
  'Painel Twilio -> copiar: Account SID (identificador) e Auth Token (senha de API)',
  'Guardar ambos no cofre de senhas — eles sao as chaves de tudo',
  'IMPORTANTE: 1 conta Twilio master pode ter varios numeros de WhatsApp diferentes',
], y, RED);

y = apiStep('T2','Comprar numero WhatsApp por clinica (10 min + 48h aprovacao)',[
  'Painel Twilio -> Phone Numbers -> Buy a Number',
  'Filtrar: Pais = Brasil (+55) | Capacidade: WhatsApp (marcar o checkbox "WhatsApp capable")',
  'Custo: ~R$ 5/mes por numero + R$ 0,03 por mensagem enviada (muito barato)',
  'Selecionar o numero e comprar -> anotar: +5511XXXXXXXX (formato completo)',
  'WhatsApp Business: solicitar aprovacao do numero no painel Twilio (ate 48 horas uteis)',
  'No sistema: Configuracoes -> Mensageria -> Twilio -> colar SID + Token + Numero',
  'Testar: botao "Enviar mensagem de teste" -> deve chegar no celular em ate 60 segundos',
], y, RED);

footer();

// ═══════════════════════════════════════════════════════════════════════════
// PAGINA 4: APIS PARTE 2 — ASAAS + ZAPSIGN + IA + ELEVENLABS + HEYGEN
// ═══════════════════════════════════════════════════════════════════════════
doc.addPage();
y = pageHeader('CADASTRO NAS APIS — PARTE 2', 'Asaas (PIX) + ZapSign (Assinatura) + Claude (IA) + ElevenLabs (Voz) + HeyGen (Video)', 4);

y = secTitle('API 3 — ASAAS (PIX + BOLETO + CARTAO) — 1 CONTA POR CNPJ', y, GREEN);

// Fluxo de aprovacao Asaas
var asteps = ['Acesse\nasaas.com\nCriar conta','Informar\nCNPJ da\nclinica','Enviar\nDocumentos\ndo CNPJ','Aguardar\nAprovacao\n(ate 48h)','Configurar\nChave PIX\ne Webhook','Colar\nAPI Key\nno sistema'];
var asw=85, ash=34, asgap=5;
asteps.forEach(function(s,i){
  var bx=M+i*(asw+asgap);
  doc.rect(bx+1,y+1,asw,ash).fill('#CCCCCC');
  doc.rect(bx,y,asw,ash).fill(i===3?ORANGE:i===5?GREEN:TEAL);
  doc.rect(bx,y,asw,ash).stroke('#006B75').lineWidth(0.8);
  doc.fontSize(7).fillColor(W).font('Helvetica-Bold').text(s,bx+2,y+4,{width:asw-4,align:'center'});
  if(i<asteps.length-1){
    var ax=bx+asw+1;
    doc.moveTo(ax,y+ash/2).lineTo(ax+asgap-1,y+ash/2).stroke(TEAL).lineWidth(1);
    doc.polygon([ax+asgap-2,y+ash/2-3],[ax+asgap-2,y+ash/2+3],[ax+asgap,y+ash/2]).fill(TEAL);
  }
});
y += ash+8;
doc.fontSize(7.5).fillColor(ORANGE).font('Helvetica-Bold')
   .text('ATENCAO: Passo 4 (aprovacao) demora ate 48h — fazer os passos de Google e Twilio em paralelo durante a espera.', M, y, {lineBreak:false});
y += 12;

y = apiStep('A1','Criar conta Asaas para cada clinica (30 min + 48h aprovacao)',[
  'Acesse: asaas.com -> "Criar conta gratis" (sem mensalidade)',
  'CNPJ: usar OBRIGATORIAMENTE o CNPJ DA CLINICA ESPECIFICA — nunca misturar CNPJs',
  'E-mail: financeiro@[clinica].com.br (e-mail financeiro, nao pessoal)',
  'Documentos obrigatorios: Contrato Social ou MEI + RG do responsavel + comprovante de endereco',
  'Aprovacao bancaria: ate 48 horas uteis apos envio de todos os documentos',
  'Plano indicado: Basic — sem mensalidade fixa, cobra % sobre cada transacao processada',
], y, GREEN);

y = apiStep('A2','Configurar PIX + Webhook no Asaas (15 min — feito 1 vez)',[
  'Painel Asaas -> Configuracoes -> Chave PIX -> Cadastrar o CNPJ como chave PIX padrao',
  'Integracoes -> API -> copiar a API Key de PRODUCAO (comeca com: $aas_prod_...)',
  'Webhook -> URL: https://[url-sistema]/api/asaas/webhook (sistema recebe alertas automaticos)',
  'Ativar TODOS estes eventos: pagamento_recebido | cobranca_vencida | cobranca_cancelada',
  'No sistema Pawards: Configuracoes -> Financeiro -> Asaas -> colar API Key -> Salvar',
  'Verificar: tela de status mostra "Asaas: CONECTADO" e nome do CNPJ correto',
], y, GREEN);
y += 6;

y = secTitle('API 4 — ZAPSIGN (ASSINATURA DIGITAL ICP-BRASIL)', y, '#6A0DAD');

y = apiStep('Z1','Criar conta ZapSign — 1 conta serve todas as clinicas (15 min)',[
  'ICP-Brasil = Infraestrutura de Chaves Publicas Brasil = assinatura digital com validade juridica plena',
  'Acesse: zapsign.com.br -> "Criar conta"',
  'Plano recomendado: Profissional — R$ 79/mes com 30 documentos incluidos por mes',
  'E-mail: e-mail do CEO (1 conta ZapSign central gerencia todas as clinicas)',
  'Configuracoes -> API -> "Gerar Token" -> copiar o token (comeca com: zs_...)',
  'No sistema: Configuracoes -> Assinatura Digital -> ZapSign -> colar o token -> Salvar',
  'Testar: criar documento de teste e assinar via link -> verificar PDF com carimbo de validade',
], y, '#6A0DAD');
y += 6;

y = secTitle('API 5 — CLAUDE / ANTHROPIC (INTELIGENCIA ARTIFICIAL CLINICA) — SEMANA 2', y, ORANGE);

y = apiStep('C1','Criar conta Anthropic e obter API Key (10 min)',[
  'Acesse: console.anthropic.com -> "Sign up"',
  'E-mail: e-mail pessoal do CEO (1 conta Anthropic para todo o sistema Pawards)',
  'Adicionar cartao de credito — cobranca por TOKEN (token = unidade de texto processado pela IA)',
  'API Keys -> "Create Key" -> nomear "Pawards Producao 2026" -> copiar a chave',
  'No sistema: Configuracoes -> IA -> Anthropic API Key -> colar -> Salvar',
  'Custo estimado: US$ 10 a 50 por mes dependendo do volume de atestados e sugestoes clinicas',
], y, ORANGE);

// O que a IA faz — tabela de funcionalidades
doc.rect(M, y, CW, 14).fill(ORANGE);
doc.fontSize(8.5).fillColor(W).font('Helvetica-Bold').text('O QUE A IA FAZ AUTOMATICAMENTE — ZERO ACAO NECESSARIA DEPOIS DO SETUP', M+4, y+3, {lineBreak:false});
y += 15;
[['Atestado medico','Paciente pede via portal -> IA gera PDF com CRM + data + CID em 3 segundos'],
 ['Sugestao de exames','Paciente descreve queixa -> IA lista exames relevantes do protocolo'],
 ['Resposta ao paciente','Mensagem no portal -> IA responde com base no prontuario real do paciente'],
 ['Motor clinico','Anamnese preenchida -> IA sugere formulas + injetaveis + protocolos personalizados'],
].forEach(function(r,i){
  y = tdRow([r[0],r[1]], [130,393], y, i%2===0, [ORANGE, BLACK]);
});
y += 6;

y = secTitle('API 6 — ELEVENLABS (VOZ CLONADA DO MEDICO) — SEMANA 3', y, BLUE);

y = apiStep('E1','Clonar a voz do medico — setup de 1 hora, feito 1 vez so',[
  'Acesse: elevenlabs.io -> "Sign up" -> Plano Starter (US$ 22/mes, 100 mil caracteres)',
  'Voices -> "Add Voice" -> "Professional Voice Clone" (clone profissional da voz)',
  'Gravar 2 minutos de audio do medico: frases variadas, sem ruido, microfone de qualidade',
  'Upload do arquivo de audio -> processamento ate 24 horas -> voz clonada pronta',
  'Voice ID -> copiar o identificador -> No sistema: Configuracoes -> ElevenLabs -> colar',
  'A voz fica salva na conta — nao precisa regravar nunca mais',
], y, BLUE);

doc.rect(M, y, CW, 14).fill(BLUE);
doc.fontSize(8.5).fillColor(W).font('Helvetica-Bold').text('COMO O AUDIO CHEGA AO PACIENTE (100% AUTOMATICO)', M+4, y+3, {lineBreak:false});
y += 15;
var autoflow = ['Sistema detecta: tomada as 07h','ElevenLabs converte texto em audio com voz do medico','Twilio envia .mp3 via WhatsApp','Paciente ouve a voz real do medico'];
var afw = Math.floor(CW/autoflow.length) - 4;
autoflow.forEach(function(s,i){
  var bx = M + i*(afw+4);
  doc.rect(bx+1,y+1,afw,28).fill('#CCCCCC');
  doc.rect(bx,y,afw,28).fill(i===autoflow.length-1?GREEN:BLUE);
  doc.rect(bx,y,afw,28).stroke(TEAL).lineWidth(0.6);
  doc.fontSize(7).fillColor(W).font('Helvetica-Bold').text(s,bx+2,y+4,{width:afw-4,align:'center'});
  if(i<autoflow.length-1){
    doc.polygon([bx+afw+3,y+14-3],[bx+afw+3,y+14+3],[bx+afw+5,y+14]).fill(TEAL);
  }
});
y += 36;

y = apiStep('H1','HEYGEN (Avatar Video) — Mes 2 — criar avatar do medico (setup 24h)',[
  'Acesse: heygen.com -> Sign up -> Plano Creator (US$ 29/mes, 30 creditos por mes)',
  'Avatar -> "Create Talking Photo" -> enviar video do medico (2 min, fundo neutro, boa luz)',
  'Processamento: HeyGen demora ate 24h para criar o avatar a partir do video',
  'Sistema gera script: "Bom dia [NOME]. Lembre da sua formula de longevidade hoje."',
  'HeyGen renderiza video de 15 segundos com o avatar do medico falando o script',
  'Twilio envia o arquivo .mp4 via WhatsApp -> paciente ve o medico falando diretamente',
  'Resultado: wow factor unico no mercado — diferencial que fecha contratos de licenca',
], y, TEAL);

footer();

// ═══════════════════════════════════════════════════════════════════════════
// PAGINA 5: ONBOARDING DE NOVA CLINICA LICENCIADA
// ═══════════════════════════════════════════════════════════════════════════
doc.addPage();
y = pageHeader('ONBOARDING DE NOVA CLINICA LICENCIADA', '6 passos do contrato assinado ate a clinica 100% operacional e faturando', 5);

// Fluxograma onboarding
y = secTitle('FLUXO DE ONBOARDING — VISAO GERAL', y, NAVY);
var osteps=[
  '1\nContrato\nAssinado','2\nCriar conta\nGoogle','3\nComprar\nnumero\nTwilio','4\nCriar conta\nAsaas\n(CNPJ)','5\nCadastrar\nno sistema\nPawards','6\nCLINICA\nATIVA\nFATURANDO'
];
var osw=88, osh=40, osgap=5;
osteps.forEach(function(s,i){
  var bx=M+i*(osw+osgap);
  doc.rect(bx+1,y+1,osw,osh).fill('#CCCCCC');
  doc.rect(bx,y,osw,osh).fill(i===5?GREEN:i===0?NAVY:BLUE);
  doc.rect(bx,y,osw,osh).stroke(TEAL).lineWidth(0.8);
  doc.fontSize(i===5?8:7).fillColor(W).font('Helvetica-Bold').text(s,bx+2,y+4,{width:osw-4,align:'center'});
  if(i<osteps.length-1){
    var ax=bx+osw+1;
    doc.moveTo(ax,y+osh/2).lineTo(ax+osgap-1,y+osh/2).stroke(TEAL).lineWidth(1);
    doc.polygon([ax+osgap-2,y+osh/2-3],[ax+osgap-2,y+osh/2+3],[ax+osgap,y+osh/2]).fill(TEAL);
  }
});
y += osh+10;
doc.fontSize(7.5).fillColor(ORANGE).font('Helvetica-Bold')
   .text('NOTA: Passo 4 (Asaas) demora 48h de aprovacao bancaria. Fazer passos 2, 3 e 5 em paralelo durante a espera.', M, y, {lineBreak:false});
y += 14;

// Tabela comparativa: o que a clinica licenciada recebe
y = secTitle('O QUE A CLINICA LICENCIADA RECEBE NO DIA 1', y, GREEN);
y = thRow(['Item Recebido','Tipo','Automatico?','Obs.'],[190,100,100,133],y);
[['Acesso ao sistema com login proprio da clinica','Imediato','SIM','Usuario e senha enviados por e-mail'],
 ['Pasta Google Drive criada e vinculada ao sistema','Automatico','SIM','Sistema cria na hora do cadastro'],
 ['WhatsApp da clinica configurado e testado','Automatico','SIM','Numero Twilio comprado e conectado'],
 ['Calendario Google sincronizado com a agenda','Automatico','SIM','Todas as consultas aparecem no Calendar'],
 ['Catalogo de 217 substancias terapeuticas','Importado','SIM','Vem do sistema Instituto Genesis (ID=14)'],
 ['Protocolos-base disponíveis para customizar','Importado','SIM','Templates do Genesis prontos para uso'],
 ['Dashboard CEO com metricas em tempo real','Imediato','SIM','Sessoes, faturamento, adesao ao tratamento'],
 ['Suporte direto via WhatsApp pelo CEO (30 dias)','Humano','NAO','CEO disponivel para duvidas iniciais'],
 ['Conta Asaas propria (PIX + boleto)','Manual','NAO','CEO da clinica configura — demora 48h'],
 ['Clone de voz ElevenLabs do medico','Opcional','NAO','Configurado no Mes 1 apos onboarding'],
 ['Avatar video HeyGen do medico','Opcional','NAO','Configurado no Mes 2 apos onboarding'],
].forEach(function(r,i){
  var c3 = r[2]==='SIM' ? GREEN : r[2]==='NAO'?RED:ORANGE;
  y = tdRow([r[0],r[1],r[2],r[3]], [190,100,100,133], y, i%2===0, [BLACK,BLUE,c3,DGRAY]);
});
y += 8;

// Passos detalhados de onboarding
y = secTitle('PASSOS DETALHADOS DO ONBOARDING', y, NAVY);

y = step(1,'CONTRATO ASSINADO E DADOS COLETADOS (30 min)',[
  'Definir tipo de licenca: A) Direta (royalty 30%) | B) Sublicenca | C) Por Demanda',
  'Coletar obrigatoriamente: CNPJ da clinica + e-mail do medico + e-mail financeiro + celular',
  'Definir o valor mensal: minimo R$ 1.500/mes (plano basico) + R$ 0,03 por mensagem WhatsApp',
  'Assinar contrato via ZapSign -> PDF arquivado automaticamente no Drive em /Contratos/',
  'Criar a empresa no sistema: Menu -> Empresas -> Nova Empresa -> preencher todos os campos',
], y);

y = step(2,'CRIAR CONTA GOOGLE PARA A CLINICA (15 min)',[
  'Criar Gmail novo especifico: [nomeclinica]@gmail.com (usar e-mail novo, nunca pessoal)',
  'Ativar no Google Cloud Console: Drive API + Calendar API + Gmail API (ver Pag. 3)',
  'Criar credenciais OAuth 2.0 -> copiar Client ID e Client Secret',
  'No sistema: Empresas -> [Nome] -> Integracoes -> Google -> Conectar -> autorizar',
], y);

y = step(3,'COMPRAR NUMERO WHATSAPP TWILIO (10 min)',[
  'Painel Twilio -> Phone Numbers -> Buy a Number -> Filtrar: Brasil (+55) + WhatsApp capable',
  'Comprar o numero -> anotar: +5511XXXXXXXX',
  'No sistema: Empresas -> [Nome] -> Mensageria -> Twilio -> colar o numero',
  'Verificar: enviar mensagem de teste para o medico licenciado',
], y);

y = step(4,'CRIAR CONTA ASAAS COM CNPJ DA CLINICA (48h aprovacao)',[
  'Acesse asaas.com -> nova conta -> CNPJ ESPECIFICO DA CLINICA LICENCIADA',
  'Enviar documentos do CNPJ -> aguardar aprovacao bancaria (ate 48 horas uteis)',
  'Apos aprovacao: copiar API Key -> Empresas -> Financeiro -> Asaas -> colar -> Salvar',
  'ENQUANTO ESPERA: fazer os passos 2, 3 e 5 em paralelo para nao perder tempo',
], y);

y = step(5,'CADASTRAR CLINICA NO SISTEMA PAWARDS (10 min)',[
  'Menu -> Empresas -> Nova Empresa -> preencher todos os campos obrigatorios',
  'Campos: nome oficial + CNPJ + tipo de licenca + royalty % + e-mail medico + e-mail financeiro',
  'Apos salvar: sistema faz automaticamente — cria pasta Drive + conecta Calendar + testa WhatsApp',
  'Verificar tela de status: TODAS as integracoes devem mostrar icone verde CONECTADO',
], y);

y = step(6,'VERIFICAR OPERACAO E HANDOFF PARA O MEDICO (20 min)',[
  'Enviar WhatsApp de teste para o medico licenciado (deve chegar em menos de 60 segundos)',
  'Criar sessao de teste com paciente ficticio -> verificar se aparece na agenda e no Drive',
  'Gerar RAS de teste -> assinar -> verificar PDF assinado na pasta Drive',
  'Medico licenciado recebe por e-mail: login + senha temporaria + link para o guia de primeiros passos',
  'Suporte inicial: CEO disponivel via WhatsApp pelos primeiros 30 dias sem custo adicional',
], y);

// Estrutura Drive
y = secTitle('ESTRUTURA DE PASTAS GOOGLE DRIVE — 1 ARVORE POR CLINICA', y, TEAL);
[
  [GOLD,    '  /PAWARDS/                            ','pasta raiz criada pelo CEO no primeiro setup do sistema'],
  [BLUE,    '    /Instituto Padua/                  ','1 pasta por clinica (criada automaticamente no onboarding)'],
  [BLACK,   '      /Pacientes/                      ','1 subpasta por paciente (criada no primeiro RAS do paciente)'],
  [BLACK,   '        /[Nome Completo Paciente]/     ','pasta individual — nunca excluir'],
  [GREEN,   '          RAS_2026-07-16.pdf           ','nome semantico com data — nunca sobrescreve arquivo anterior'],
  [BLACK,   '          RACJ_2026-07-16_Consent.pdf ','consentimento informado assinado'],
  [BLACK,   '      /Contratos/                      ','contratos de licenca assinados via ZapSign'],
  [BLACK,   '      /Relatorios/                     ','relatorios mensais gerados pelo sistema'],
  [DGRAY,   '    /Barros Clinica/ (futura)          ','proxima clinica licenciada'],
].forEach(function(r,i){
  doc.rect(M,y,CW,14).fill(i%2===0?GRAY:W);
  doc.fontSize(8).fillColor(r[0]).font('Courier').text(r[1], M+4, y+3, {width:230, lineBreak:false});
  doc.fontSize(7.5).fillColor(DGRAY).font('Helvetica').text('<-  '+r[2], M+238, y+3, {width:CW-242, lineBreak:false});
  y += 15;
});

footer();

// ═══════════════════════════════════════════════════════════════════════════
// PAGINA 6: CHECKLIST DIARIO + ERROS CRITICOS + FRASE FINAL
// ═══════════════════════════════════════════════════════════════════════════
doc.addPage();
y = pageHeader('CHECKLIST DIARIO DO CEO + ERROS CRITICOS', 'O que verificar todos os dias + o que nunca pode acontecer', 6);

// Checklists lado a lado
var half = Math.floor(CW/2) - 4;

// Titulo esquerdo: manha
doc.rect(M, y, half, 16).fill(GOLD);
doc.fontSize(8.5).fillColor(BLACK).font('Helvetica-Bold').text('CHECKLIST DA MANHA (10 min — TODO DIA)', M+4, y+4, {width:half-6, lineBreak:false});
y += 17;
var yaM = y;
['Dashboard: todas as clinicas com status ONLINE',
 'Fila de assinaturas: nenhum RAS sem assinar por 24h',
 'WhatsApp: algum lembrete falhou? (ver alertas)',
 'Asaas: inadimplencias acima de R$ 500 -> ligar',
 'Drive: RAS do dia anterior enviados ao paciente?',
 'Billing: uso do mes dentro da franquia de cada clinica?',
].forEach(function(item,i){
  doc.rect(M, yaM, half, 16).fill(i%2===0?GRAY:W);
  doc.rect(M, yaM, half, 16).stroke('#D5E8F5').lineWidth(0.3);
  doc.rect(M, yaM, 20, 16).fill(GOLD);
  doc.fontSize(8.5).fillColor(BLACK).font('Helvetica-Bold').text(String(i+1), M+4, yaM+4, {width:14, align:'center', lineBreak:false});
  doc.fontSize(7.5).fillColor(BLACK).font('Helvetica').text(item, M+24, yaM+4, {width:half-26, lineBreak:false});
  yaM += 17;
});

// Titulo direito: semana
var xR = M + half + 8;
doc.rect(xR, y-17, half, 16).fill(TEAL);
doc.fontSize(8.5).fillColor(W).font('Helvetica-Bold').text('CHECKLIST DE SEXTA-FEIRA (30 min)', xR+4, y-13, {width:half-6, lineBreak:false});
var yaS = y;
['Relatorio: sessoes, assinaturas, faltas e cobrancas',
 'Faturas licenciados: geradas, enviadas e pagas?',
 'Alertas: falhas no Drive, WhatsApp ou Asaas?',
 'OAuth Google: verificar data de vencimento (90 dias)',
 'Decisao semanal: prioridade A ou B ou C?',
 'Backup: fazer export do banco de dados?',
].forEach(function(item,i){
  doc.rect(xR, yaS, half, 16).fill(i%2===0?LIGHT:W);
  doc.rect(xR, yaS, half, 16).stroke('#D5E8F5').lineWidth(0.3);
  doc.rect(xR, yaS, 20, 16).fill(TEAL);
  doc.fontSize(8.5).fillColor(W).font('Helvetica-Bold').text(String(i+1), xR+4, yaS+4, {width:14, align:'center', lineBreak:false});
  doc.fontSize(7.5).fillColor(BLACK).font('Helvetica').text(item, xR+24, yaS+4, {width:half-26, lineBreak:false});
  yaS += 17;
});

y = Math.max(yaM, yaS) + 10;

// Erros criticos
y = secTitle('ERROS CRITICOS — O QUE NUNCA PODE ACONTECER NESTE SISTEMA', y, RED);
y = thRow(['Area','Erro Descrito','Consequencia Real'],[70,260,193],y,RED);
[['LGPD','Dado de clinica A aparecer para clinica B — vazamento de dados','Multa ate R$ 50 milhoes + processo criminal'],
 ['JURIDICO','RAS assinado com CRM errado ou nome errado do paciente','Documento invalido juridicamente + processo no conselho do medico'],
 ['PRONTUARIO','Drive nao faz upload silencioso do RAS apos assinatura','Prontuario perdido para sempre + processo por ma pratica medica'],
 ['FINANCEIRO','Cobranca do licenciado sem detalhamento do que esta cobrando','Cancelamento do contrato + chargeback no cartao do medico'],
 ['OPERACAO','Login do sistema cai no meio da consulta com o paciente','Medico sem acesso ao protocolo em tempo real — risco clinico'],
 ['IMAGEM','Avatar fala nome errado ou informacao errada ao paciente','Constrangimento grave + perda imediata do contrato de licenca'],
 ['SEGURANCA','Credenciais de API salvas em codigo fonte no GitHub','Invasao da conta + uso indevido das APIs a custo do CEO'],
].forEach(function(r,i){
  y = alertBox(r[0],r[1],r[2],y);
});
y += 6;

// Frase final motivacional
doc.rect(M, y, CW, 54).fill(NAVY);
doc.rect(M, y, 5, 54).fill(GOLD);
doc.fontSize(11).fillColor(W).font('Helvetica-Bold')
   .text('LEMBRE-SE TODO DIA:', M+12, y+6, {lineBreak:false});
doc.fontSize(9).fillColor('#B3E5FC').font('Helvetica')
   .text('O medico que licencia o sistema economiza R$ 5.800 por mes em funcionarios ineficientes.', M+12, y+20, {width:CW-16, lineBreak:false});
doc.fontSize(10).fillColor(GOLD).font('Helvetica-Bold')
   .text('Ele paga R$ 2.500 por mes com GOSTO. 50 medicos = R$ 125.000 por mes = R$ 1.500.000 por ano.', M+12, y+34, {width:CW-16, lineBreak:false});
doc.fontSize(8.5).fillColor('#90CAF9').font('Helvetica')
   .text('Voce esta construindo isso AGORA. Kaizen: melhoria continua, incremental, sem parar.', M+12, y+46, {width:CW-16, lineBreak:false});

footer();
doc.end();
console.log('PDF GERADO:', OUT);
