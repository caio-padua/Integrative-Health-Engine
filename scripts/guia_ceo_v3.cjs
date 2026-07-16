'use strict';
// GUIA CEO PAWARDS v3 — FUNDO BRANCO — SEM PAGINAS EM BRANCO
// Controle rigoroso de altura: cada pagina calculada antes de desenhar
const PDF = require('../artifacts/api-server/node_modules/pdfkit/js/pdfkit.js');
const fs  = require('fs');

const OUT = './GUIA CEO PAWARDS DR CAIO 26.07.16.pdf';
const doc = new PDF({ size:'A4', margin:0, autoFirstPage:true });
doc.pipe(fs.createWriteStream(OUT));

// CORES
const NAVY  = '#0B2E4A';
const BLUE  = '#1565C0';
const TEAL  = '#00695C';
const GRAY  = '#F4F6F7';
const LGRAY = '#EBF5FB';
const BLACK = '#1A1A1A';
const DGRAY = '#666666';
const GREEN = '#1B5E20';
const RED   = '#B71C1C';
const GOLD  = '#7D5700';
const ORNG  = '#BF360C';
const WHT   = '#FFFFFF';

// DIMENSOES
const PW=595, PH=842, M=36, CW=523;
const HDR_H=66;           // altura do cabecalho
const FTR_Y=PH-24;        // inicio do rodape
const MAX_Y=FTR_Y-6;      // limite inferior seguro para conteudo

var pageNum=0;
var curTitle='', curSub='';

// ── desenha cabecalho e retorna y inicial do conteudo
function newPage(title, sub) {
  pageNum++;
  curTitle=title; curSub=sub;
  doc.rect(0,0,PW,HDR_H).fill(NAVY);
  doc.rect(0,0,PW,3).fill(TEAL);
  doc.fontSize(7).fillColor('#90CAF9').font('Helvetica')
     .text('PAWARDS — CEO DR. CAIO HENRIQUE FERNANDES PADUA — PADCOM', M,10,{align:'center',width:CW,lineBreak:false});
  doc.fontSize(15).fillColor(WHT).font('Helvetica-Bold')
     .text(title, M,22,{align:'center',width:CW,lineBreak:false});
  doc.fontSize(8).fillColor('#B3E5FC').font('Helvetica')
     .text(sub, M,44,{align:'center',width:CW,lineBreak:false});
  doc.fontSize(7).fillColor('#90CAF9')
     .text('PAG.'+pageNum+' | 16/07/2026', PW-90,56,{lineBreak:false});
  doc.rect(0,HDR_H,PW,2).fill(TEAL);
  return HDR_H+10;
}

function footer() {
  doc.rect(0,FTR_Y,PW,24).fill(NAVY);
  doc.rect(0,FTR_Y,PW,2).fill(TEAL);
  doc.fontSize(7).fillColor('#90CAF9').font('Helvetica-Bold')
     .text('PAWARDS | CEO Dr. Caio Henrique Fernandes Padua | PADCOM | Confidencial', M,FTR_Y+9,{align:'center',width:CW,lineBreak:false});
}

// Titulo de secao — altura fixa = 26px
function sec(txt, y, cor) {
  cor=cor||BLUE;
  doc.rect(M,y,5,20).fill(cor);
  doc.fontSize(10.5).fillColor(cor).font('Helvetica-Bold')
     .text(txt, M+9,y+4,{width:CW-10,lineBreak:false});
  doc.rect(M+9,y+20,CW-10,0.6).fill('#BBDEFB');
  return y+26;
}

// Linha de cabecalho de tabela — altura 17px
function thdr(cols, widths, y) {
  doc.rect(M,y,CW,17).fill(NAVY);
  var x=M;
  cols.forEach(function(c,i){
    doc.fontSize(8).fillColor(WHT).font('Helvetica-Bold')
       .text(c, x+3,y+5,{width:widths[i]-4,lineBreak:false});
    x+=widths[i];
  });
  return y+18;
}

// Linha de dados de tabela — altura 17px
function trow(cols, widths, y, alt, clrs) {
  clrs=clrs||[];
  doc.rect(M,y,CW,17).fill(alt?LGRAY:WHT);
  doc.rect(M,y,CW,17).stroke('#D5E8F5').lineWidth(0.3);
  var x=M;
  cols.forEach(function(c,i){
    var cor=clrs[i]||BLACK;
    var v=typeof c==='object'?(c.v||''):String(c||'');
    var b=typeof c==='object'&&c.b;
    doc.fontSize(8).fillColor(cor).font(b?'Helvetica-Bold':'Helvetica')
       .text(v, x+3,y+5,{width:widths[i]-4,lineBreak:false});
    x+=widths[i];
  });
  return y+18;
}

// Caixa de passo com numero colorido
// Altura = 22 + n*11 (n = numero de linhas)
function passo(num, titulo, linhas, y, acentCor) {
  acentCor=acentCor||TEAL;
  var h=22+linhas.length*11;
  doc.rect(M,y,CW,h).fill(WHT);
  doc.rect(M,y,CW,h).stroke('#BBDEFB').lineWidth(0.5);
  doc.rect(M,y,32,h).fill(acentCor);
  doc.fontSize(14).fillColor(WHT).font('Helvetica-Bold')
     .text(String(num), M,y+Math.floor(h/2)-8,{width:32,align:'center',lineBreak:false});
  doc.fontSize(9).fillColor(NAVY).font('Helvetica-Bold')
     .text(titulo, M+36,y+4,{width:CW-40,lineBreak:false});
  doc.rect(M+36,y+15,CW-40,0.5).fill('#DDDDDD');
  linhas.forEach(function(l,i){
    doc.fontSize(7.5).fillColor(DGRAY).text('\u25B8 ',M+36,y+18+i*11,{width:10,lineBreak:false});
    doc.fontSize(7.5).fillColor(BLACK).font('Helvetica')
       .text(l, M+46,y+18+i*11,{width:CW-50,lineBreak:false});
  });
  return y+h+4;
}

// Caixa de API (codigo letra + titulo + linhas)
function api(cod, titulo, linhas, y, cor) {
  cor=cor||BLUE;
  var h=22+linhas.length*11;
  doc.rect(M,y,CW,h).fill(WHT);
  doc.rect(M,y,CW,h).stroke('#BBDEFB').lineWidth(0.5);
  doc.rect(M,y,32,h).fill(cor);
  doc.fontSize(11).fillColor(WHT).font('Helvetica-Bold')
     .text(cod, M,y+Math.floor(h/2)-7,{width:32,align:'center',lineBreak:false});
  doc.fontSize(9).fillColor(NAVY).font('Helvetica-Bold')
     .text(titulo, M+36,y+4,{width:CW-40,lineBreak:false});
  doc.rect(M+36,y+15,CW-40,0.5).fill('#DDDDDD');
  linhas.forEach(function(l,i){
    doc.fontSize(7.5).fillColor(cor).text('\u25B8 ',M+36,y+18+i*11,{width:10,lineBreak:false});
    doc.fontSize(7.5).fillColor(BLACK).font('Helvetica')
       .text(l, M+46,y+18+i*11,{width:CW-50,lineBreak:false});
  });
  return y+h+4;
}

// Caixa de fluxo simples (para organograma/fluxograma)
function fbox(txt, bx, by, bw, bh, bg, tc) {
  bg=bg||BLUE; tc=tc||WHT;
  doc.rect(bx,by,bw,bh).fill(bg);
  doc.rect(bx,by,bw,bh).stroke(TEAL).lineWidth(0.8);
  var fs=txt.length>28?7:8;
  var lines=txt.split('\n');
  var totalH=lines.length*fs*1.2;
  var startY=by+Math.floor((bh-totalH)/2);
  lines.forEach(function(ln,i){
    doc.fontSize(fs).fillColor(tc).font('Helvetica-Bold')
       .text(ln, bx+2,startY+i*fs*1.3,{width:bw-4,align:'center',lineBreak:false});
  });
}

// Caixa de erro critico
function erroBox(area, desc, cons, y) {
  var h=26;
  doc.rect(M,y,CW,h).fill('#FFF3F3');
  doc.rect(M,y,CW,h).stroke('#FFCDD2').lineWidth(0.4);
  doc.rect(M,y,56,h).fill(RED);
  doc.fontSize(7.5).fillColor(WHT).font('Helvetica-Bold')
     .text(area, M+2,y+9,{width:52,align:'center',lineBreak:false});
  doc.fontSize(8.5).fillColor(RED).font('Helvetica-Bold')
     .text('\u26A0 '+desc, M+62,y+4,{width:CW-66,lineBreak:false});
  doc.fontSize(7.5).fillColor(ORNG).font('Helvetica')
     .text('Consequencia: '+cons, M+62,y+16,{width:CW-66,lineBreak:false});
  return y+h+3;
}

// ═══════════════════════════════════════════════════════════════════════════
// PAG 1: MISSAO + ORGANOGRAMA + MATEMATICA + ROADMAP
// ═══════════════════════════════════════════════════════════════════════════
// Altura calculada: 38+26+26+14+26+14+38+8+26+17+72+8+26+17+144 = 500px < 734 ✓
var y = newPage('MISSAO E ESTRATEGIA DO CEO','Organograma PADCOM  *  Matematica do Milhao  *  Roadmap Completo');

// Missao — h=38
doc.rect(M,y,CW,36).fill(NAVY);
doc.rect(M,y,5,36).fill(TEAL);
doc.fontSize(8.5).fillColor('#B3E5FC').font('Helvetica-Bold')
   .text('MISSAO:', M+10,y+5,{lineBreak:false});
doc.fontSize(8.5).fillColor(WHT).font('Helvetica')
   .text('Construir o SaaS clinico mais moderno do Brasil. Chegar a R$ 1.500.000 por ano com 50 clinicas licenciadas. Comecar pelo Instituto Padua — 1 paciente real, hoje.', M+10,y+16,{width:CW-14,lineBreak:false});
y+=42;

// Organograma
y=sec('ORGANOGRAMA — PIRAMIDE PADCOM', y, NAVY);
// Caixas do organograma em coluna centralizada
var cx=M+CW/2;
var bw1=190, bw2=210, bh1=26;
// PADCOM
fbox('PADCOM  |  Holding — Empresa-Mae do CEO', cx-bw1/2,y,bw1,bh1, NAVY, WHT);
y+=bh1;
doc.fontSize(12).fillColor(TEAL).text('\u2193',cx-5,y,{lineBreak:false}); y+=14;
// PAWARDS
fbox('PAWARDS  |  Engenharia e Sistemas (sub-empresa do CEO)', cx-bw2/2,y,bw2,bh1, BLUE, WHT);
y+=bh1;
doc.fontSize(12).fillColor(TEAL).text('\u2193',cx-5,y,{lineBreak:false}); y+=14;
// linha lado a lado
var w3a=230, w3b=CW-w3a-8;
fbox('Instituto Padua (ID=15)\n5.270 pacientes reais — SUA CLINICA', M,y,w3a,34, TEAL, WHT);
fbox('Clinicas Licenciadas (futuras)\nBarros, Paluzze... pagam R$2.500/mes', M+w3a+8,y,w3b,34, LGRAY, NAVY);
y+=34;
doc.fontSize(7.5).fillColor(DGRAY).font('Helvetica')
   .text('Legenda:  [NAVY] Holding PADCOM  |  [AZUL] PAWARDS Tecnologia  |  [TEAL] Clinica propria  |  [CLARO] Licenciadas pagantes', M,y+4,{lineBreak:false});
y+=18;

// Matematica do milhao
y=sec('MATEMATICA DO MILHAO', y, GREEN);
y=thdr(['Clinicas Licenciadas x R$2.500/mes','Faturamento Mensal','Faturamento Anual','Progresso'],[180,120,120,103],y);
[[10,'R$ 25.000/mes','R$ 300.000/ano','20%'],
 [20,'R$ 50.000/mes','R$ 600.000/ano','40%'],
 [30,'R$ 75.000/mes','R$ 900.000/ano','60%'],
 [50,'R$ 125.000/mes','R$ 1.500.000/ano','100% — OBJETIVO'],
].forEach(function(r,i){
  var C=[BLACK,BLACK,i===3?{v:r[2],b:true}:r[2],i===3?GREEN:DGRAY];
  var cl=i===3?[GOLD,GOLD,GREEN,GREEN]:null;
  y=trow([r[0]+' clinicas',r[1],r[2],r[3]],[180,120,120,103],y,i%2===0,cl);
});
y+=8;

// Roadmap
y=sec('ROADMAP — O QUE CONSTRUIR E QUANDO', y, BLUE);
y=thdr(['Prazo','Acao Prioritaria','Resultado Esperado'],[72,280,171],y);
[['HOJE',     'Verificar fluxo clinico completo com 1 paciente real do Padua (47 min)','1o atendimento 100% digital'],
 ['SEM. 1',   'Fase C: INSERT herda empresa_id + Tela CEO swipe entre clinicas','Isolamento multi-tenant'],
 ['SEM. 2',   'IA Clinica: Claude gera atestado e sugere exames automaticamente','30 min a mais por consulta'],
 ['SEM. 3',   'ElevenLabs: voz clonada do medico via WhatsApp a cada tomada','Aderencia ao tratamento'],
 ['SEM. 4',   'Stripe Metered: billing por uso em tempo real','Receita proporcional'],
 ['MES 2',    'HeyGen: avatar video do medico falando com cada paciente','Diferencial unico no BR'],
 ['MES 3',    'IoT: bioimpedancia e pressao no cadastro automaticamente','Dados sem digitar'],
 ['MES 5-6',  'Primeira clinica licenciada pagando R$ 2.500 por mes','RECEITA REAL'],
].forEach(function(r,i){
  var c1=i===0?RED:(i===7?GREEN:BLUE);
  y=trow([r[0],r[1],r[2]],[72,280,171],y,i%2===0,[c1,BLACK,DGRAY]);
});

footer();

// ═══════════════════════════════════════════════════════════════════════════
// PAG 2: FLUXO CLINICO COMPLETO
// ═══════════════════════════════════════════════════════════════════════════
// Altura: 26+36+12+26+71+71+82+82+82+71 = 559px < 734 ✓
doc.addPage();
y=newPage('FLUXO CLINICO COMPLETO','Como atender 1 paciente do login ao prontuario assinado — 47 minutos');

y=sec('FLUXOGRAMA DO ATENDIMENTO (8 ETAPAS)', y, NAVY);
// 8 caixas em linha unica: (CW-7*4)/8 = (523-28)/8 = 61px por caixa
var bwf=61, bhf=36, gapf=4;
var etapas=[
  ['1','Login'],['2','Paciente'],['3','Sessao'],['4','Anamnese'],
  ['5','Motor\nClinico'],['6','Gerar\nRAS'],['7','Assinar\nICP-BR'],['8','Drive\n+Email']
];
var corEtapa=[NAVY,BLUE,BLUE,TEAL,TEAL,BLUE,NAVY,GREEN];
etapas.forEach(function(e,i){
  var bx=M+i*(bwf+gapf);
  fbox(e[0]+'\n'+e[1], bx,y,bwf,bhf, corEtapa[i], WHT);
  if(i<etapas.length-1){
    doc.fontSize(10).fillColor(TEAL).text('\u2192',bx+bwf+0,y+bhf/2-6,{lineBreak:false});
  }
});
y+=bhf+4;
doc.fontSize(7).fillColor(DGRAY).font('Helvetica')
   .text('Legenda: [NAVY]=Autenticacao  [AZUL]=Dados  [TEAL]=Motor Clinico  [VERDE]=Entrega Final', M,y,{lineBreak:false});
y+=14;

y=sec('6 PASSOS DETALHADOS — DO LOGIN AO PDF ASSINADO NO DRIVE', y, NAVY);

y=passo(1,'LOGIN NO SISTEMA (2 min)',[
  'URL: acesse o sistema PAWARDS via navegador no link fornecido pelo CEO',
  'E-mail e senha: suas credenciais pessoais cadastradas no sistema',
  'Selecionar unidade: INSTITUTO PADUA (unidade_id = 15)',
  'MFA (Multi-Factor Authentication = codigo duplo): abrir Google Authenticator no celular e digitar o codigo de 6 digitos',
], y, NAVY);

y=passo(2,'SELECIONAR PACIENTE E VERIFICAR INTEGRACOES (5 min)',[
  'Menu lateral -> Pacientes -> buscar pelo NOME COMPLETO ou CPF',
  'ANTES do 1o atendimento: Configuracoes -> Integracoes -> verificar Google CONECTADO, Twilio OK e ZapSign ATIVO',
  'Se alguma integracao mostrar ERRO: ver guia de cada API nas paginas 3 e 4 deste documento',
  'Clicar no nome do paciente para abrir o prontuario completo com historico',
], y, BLUE);

y=passo(3,'CRIAR NOVA SESSAO (5 min)',[
  'Dentro do prontuario: botao "NOVA SESSAO" (canto superior direito da tela)',
  'Preencher: Tipo (Consulta Medica / Protocolo / Avaliacao) + Data de hoje + Hora real da consulta',
  'Profissional: Dr. Caio Henrique Fernandes Padua (CRM aparece automaticamente)',
  'Confirmar -> sessao criada -> Google Calendar sincroniza e WhatsApp enviado ao paciente automaticamente',
], y, TEAL);

y=passo(4,'ANAMNESE V2 — MOTOR CLINICO (20 min com o paciente)',[
  'Dentro da sessao: botao "INICIAR ANAMNESE" -> perguntas estruturadas aparecem na tela',
  'SKIP-LOGIC (skip = pular): perguntas irrelevantes para o perfil do paciente sao omitidas automaticamente',
  'Alertas: VERMELHO = urgencia clinica agir ja | AMARELO = monitorar proxima consulta | VERDE = normal',
  'Ao finalizar: MOTOR CLINICO gera sugestoes automaticas de formulas + injetaveis + protocolos',
  'Medico revisa cada sugestao, ajusta dose ou via se necessario, confirma o protocolo final',
], y, TEAL);

y=passo(5,'GERAR RAS E ASSINAR ICP-BRASIL (10 min)',[
  'RAS = Registro de Assistencia Sistemica (prontuario digital com validade juridica plena)',
  'Botao "GERAR RAS" -> PDF criado automaticamente: nome, protocolo, substancias, CRM e data',
  'REVISAR o PDF na tela antes de assinar: verificar CRM correto, nome e substancias',
  'Botao "ASSINAR COM ICP-BRASIL" -> ZapSign envia link de assinatura no e-mail e WhatsApp',
  'ICP-Brasil = Infraestrutura de Chaves Publicas Brasil: validade juridica igual a cartorio fisico',
], y, BLUE);

y=passo(6,'UPLOAD DRIVE E E-MAIL AO PACIENTE (5 min — automatico)',[
  'Apos assinatura: sistema faz upload automatico para Google Drive na pasta correta do paciente',
  'Caminho Drive: /PAWARDS / Instituto Padua / Pacientes / [Nome] / RAS_2026-07-16.pdf',
  'E-mail automatico enviado ao paciente com PDF assinado em anexo + WhatsApp com link',
  'VERIFICAR: abrir o Drive e confirmar que o arquivo esta na subpasta do paciente com data correta',
], y, NAVY);

footer();

// ═══════════════════════════════════════════════════════════════════════════
// PAG 3: TABELA DE EMAILS + GOOGLE + TWILIO
// ═══════════════════════════════════════════════════════════════════════════
// Altura: 26+17+7*18+8+26+36+8+71+93+71+6+26+71+82 = 641px < 734 ✓
doc.addPage();
y=newPage('CADASTRO NAS APIS — PARTE 1','Tabela de E-mails  *  Google (Drive + Calendar + Gmail)  *  Twilio (WhatsApp)');

y=sec('REGRA FUNDAMENTAL — QUAL E-MAIL USAR PARA CADA SERVICO', y, NAVY);
y=thdr(['Servico / Clinica','E-mail Correto a Usar','Observacao Importante'],[150,200,173],y);
[['Instituto Padua (clinica propria do CEO)','e-mail institucional da clinica','Ja existe — verificar acesso e senha'],
 ['Nova clinica licenciada','[nomeclinica]@gmail.com (criar novo)','1 Gmail DIFERENTE por clinica — nunca misturar'],
 ['Google APIs (Drive + Calendar + Gmail)','Mesmo e-mail da clinica especifica','1 conta Google por clinica — regra inegociavel'],
 ['Twilio (conta master WhatsApp)','E-mail pessoal do CEO','1 conta Twilio master serve todas as clinicas'],
 ['Asaas (PIX e boleto)','E-mail financeiro da clinica','Vinculado ao CNPJ da clinica — 1 conta por CNPJ'],
 ['ZapSign (assinatura digital)','E-mail do medico responsavel','Vinculado ao CRM — 1 conta ZapSign para tudo'],
 ['Claude Anthropic (IA clinica)','E-mail pessoal do CEO','1 conta Anthropic para todo o sistema PAWARDS'],
].forEach(function(r,i){
  y=trow(r,[150,200,173],y,i%2===0,[NAVY,BLUE,DGRAY]);
});
y+=8;

// Google OAuth fluxo
y=sec('API 1 — GOOGLE (Drive + Calendar + Gmail) — 1 VEZ POR CLINICA', y, BLUE);
// Fluxo horizontal: 5 caixas
var gsteps=['Criar conta\nGoogle p/ clinica','Google Cloud\nConsole','Ativar APIs:\nDrive+Cal+Gmail','Criar credenciais\nOAuth 2.0','Conectar no\nPAWARDS'];
var gsw=Math.floor((CW-4*5)/5), gsh=32;
gsteps.forEach(function(s,i){
  fbox(s, M+i*(gsw+5),y,gsw,gsh, i===4?GREEN:BLUE, WHT);
  if(i<gsteps.length-1){
    doc.fontSize(9).fillColor(TEAL).text('\u2192',M+i*(gsw+5)+gsw+1,y+gsh/2-6,{lineBreak:false});
  }
});
y+=gsh+4;
doc.fontSize(7).fillColor(DGRAY).font('Helvetica')
   .text('Este fluxo e feito 1 vez por clinica. Apos a 1a autorizacao, o token se renova sozinho a cada 90 dias.', M,y,{lineBreak:false});
y+=14;

y=api('G1','Criar conta Google para cada clinica (5 min)',[
  'Acesse: accounts.google.com -> "Criar conta" -> "Para minha empresa"',
  'E-mail: [nomeclinica]@gmail.com ou e-mail corporativo proprio — 1 CONTA DIFERENTE POR CLINICA',
  'Anotar e-mail e senha em cofre de senhas (LastPass, Bitwarden ou 1Password)',
  'Verificar a caixa de entrada: confirmar que o e-mail foi ativado e esta funcionando',
],y, BLUE);

y=api('G2','Ativar APIs no Google Cloud Console (15 min)',[
  'Acesse: console.cloud.google.com -> login com a conta DA CLINICA (nao a pessoal)',
  'Clicar "Novo Projeto" -> nomear "[Nome Clinica] Pawards" -> Criar',
  'Menu -> APIs e Servicos -> Biblioteca -> buscar e ATIVAR uma por uma:',
  '  Google Drive API (upload automatico dos PDFs assinados no Drive)',
  '  Google Calendar API (sincronizar agenda de consultas em tempo real)',
  '  Gmail API (enviar e-mails com PDF assinado ao paciente)',
  'Credenciais -> Criar credenciais -> ID do cliente OAuth 2.0 -> Tipo: Aplicativo da Web',
  'URI de redirecionamento autorizado: https://[url-sistema]/api/google/callback',
],y, BLUE);

y=api('G3','Conectar ao sistema PAWARDS — 1 vez por clinica (5 min)',[
  'Menu PAWARDS -> Configuracoes -> Integracoes -> Google',
  'Colar: Client ID e Client Secret (copiar do JSON baixado no passo G2)',
  'Clicar "Conectar" -> janela Google abre -> selecionar conta DA CLINICA (nao a pessoal)',
  'Autorizar: Drive (leitura+escrita) + Calendar (leitura+escrita) + Gmail (envio)',
  'Token salvo automaticamente no sistema. Valido 90 dias. Renova sozinho.',
],y, BLUE);
y+=6;

y=sec('API 2 — TWILIO (WhatsApp Automatizado)', y, RED);

y=api('T1','Criar conta Twilio master — 1 conta para todas as clinicas (10 min)',[
  'Acesse: twilio.com -> "Sign up free" -> usar e-mail pessoal do CEO (conta master unica)',
  'Verificar e-mail e celular: Twilio liga ou envia SMS para confirmar (obrigatorio)',
  'Painel Twilio -> copiar Account SID (identificador) e Auth Token (senha de API)',
  'GUARDAR no cofre de senhas: sao as chaves que dao acesso a todos os numeros',
],y, RED);

y=api('T2','Comprar numero WhatsApp por clinica (10 min + ate 48h aprovacao)',[
  'Painel Twilio -> Phone Numbers -> Buy a Number',
  'Filtrar: Pais = Brasil (+55) | Capacidade = WhatsApp (marcar checkbox "WhatsApp capable")',
  'Custo: ~R$ 5 por mes por numero + R$ 0,03 por mensagem enviada (muito barato)',
  'Apos compra: solicitar aprovacao WhatsApp Business no painel Twilio (ate 48 horas uteis)',
  'No PAWARDS: Configuracoes -> Mensageria -> Twilio -> colar SID + Token + Numero',
],y, RED);

footer();

// ═══════════════════════════════════════════════════════════════════════════
// PAG 4: ASAAS + ZAPSIGN + CLAUDE + ELEVENLABS + HEYGEN
// ═══════════════════════════════════════════════════════════════════════════
// Altura: 26+36+8+82+82+6+26+82+6+26+82+71+6+26+71+71 = 709px < 734 ✓
doc.addPage();
y=newPage('CADASTRO NAS APIS — PARTE 2','Asaas (PIX)  *  ZapSign (Assinatura)  *  Claude (IA)  *  ElevenLabs (Voz)  *  HeyGen (Video)');

y=sec('API 3 — ASAAS (PIX + BOLETO + CARTAO) — 1 CONTA POR CNPJ', y, GREEN);
var asteps=['1. Acesse\nasaas.com\nCriar conta','2. CNPJ da\nclinica\n(nao misturar)','3. Enviar\ndocumentos\ndo CNPJ','4. Aguardar\naprovacao\n(ate 48h)','5. Configurar\nPIX e\nWebhook','6. Colar\nAPI Key\nno PAWARDS'];
var asw2=Math.floor((CW-5*5)/6), ash2=34;
asteps.forEach(function(s,i){
  fbox(s, M+i*(asw2+5),y,asw2,ash2, i===3?ORNG:i===5?GREEN:TEAL, WHT);
  if(i<asteps.length-1){
    doc.fontSize(9).fillColor(TEAL).text('\u2192',M+i*(asw2+5)+asw2+1,y+ash2/2-6,{lineBreak:false});
  }
});
y+=ash2+4;
doc.fontSize(7).fillColor(ORNG).font('Helvetica-Bold')
   .text('ATENCAO: Aprovacao Asaas demora ate 48h. Fazer os passos de Google e Twilio em paralelo durante a espera.', M,y,{lineBreak:false});
y+=14;

y=api('A1','Criar conta Asaas para cada clinica — 1 conta por CNPJ (30 min + 48h)',[
  'Acesse: asaas.com -> "Criar conta gratis" (sem mensalidade fixa)',
  'CNPJ: usar OBRIGATORIAMENTE o CNPJ DA CLINICA ESPECIFICA — nunca misturar CNPJs diferentes',
  'E-mail: financeiro@[clinica].com.br | Documentos: CNPJ + RG responsavel + comprovante de endereco',
  'Plano indicado: Basic — sem mensalidade, cobra % sobre cada transacao (mais economico no inicio)',
  'Apos aprovacao: Painel Asaas -> API -> copiar API Key (comeca com: $aas_prod_...)',
],y, GREEN);

y=api('A2','Configurar chave PIX e Webhook no Asaas (15 min)',[
  'Painel Asaas -> Configuracoes -> Chave PIX -> Cadastrar o CNPJ como chave PIX padrao',
  'Webhook -> URL: https://[url-sistema]/api/asaas/webhook (recebe alertas automaticos)',
  'Ativar eventos: pagamento_recebido | cobranca_vencida | cobranca_cancelada',
  'No PAWARDS: Configuracoes -> Financeiro -> Asaas -> colar API Key -> Salvar e testar',
  'Verificar: tela mostra "Asaas: CONECTADO" com nome do CNPJ correto',
],y, GREEN);
y+=6;

y=sec('API 4 — ZAPSIGN (ASSINATURA DIGITAL ICP-BRASIL) — 1 CONTA PARA TUDO', y, '#6A0DAD');

y=api('Z1','Criar conta ZapSign e gerar API Token (15 min)',[
  'Acesse: zapsign.com.br -> "Criar conta" -> Plano Profissional (R$ 79/mes, 30 docs/mes)',
  'E-mail: e-mail pessoal do CEO (1 conta ZapSign central gerencia todas as clinicas)',
  'ICP-Brasil: infraestrutura que da validade juridica a assinatura digital (igual a cartorio fisico)',
  'Configuracoes -> API -> "Gerar Token" -> copiar (comeca com: zs_...)',
  'No PAWARDS: Configuracoes -> Assinatura Digital -> ZapSign -> colar token -> Salvar',
],y, '#6A0DAD');
y+=6;

y=sec('API 5 — CLAUDE ANTHROPIC (IA CLINICA) — SEMANA 2', y, ORNG);

y=api('C1','Criar conta Anthropic e API Key (10 min) — 1 conta para todo o sistema',[
  'Acesse: console.anthropic.com -> "Sign up" -> e-mail pessoal do CEO',
  'Adicionar cartao de credito (cobranca por TOKEN = unidade de texto processada pela IA)',
  'API Keys -> "Create Key" -> nomear "Pawards Producao 2026" -> copiar a chave',
  'No PAWARDS: Configuracoes -> IA -> Anthropic API Key -> colar -> Salvar',
],y, ORNG);

y=api('C2','O que a IA faz automaticamente apos o setup — zero acao necessaria',[
  'Atestado medico: paciente pede via portal -> PDF gerado em 3 segundos com CRM + data + CID',
  'Sugestao de exames: paciente descreve queixa -> IA lista exames clinicamente relevantes',
  'Motor clinico: anamnese preenchida -> IA sugere formulas + injetaveis + protocolos personalizados',
],y, ORNG);
y+=6;

y=sec('API 6 — ELEVENLABS (VOZ CLONADA DO MEDICO) — SEMANA 3', y, BLUE);

y=api('E1','Clonar voz do medico — setup de 1 hora feito 1 unica vez',[
  'Acesse: elevenlabs.io -> Sign up -> Plano Starter (US$ 22/mes, 100 mil caracteres)',
  'Voices -> "Add Voice" -> "Professional Voice Clone" -> gravar 2 min de audio do medico',
  'Audio ideal: frases variadas, sem ruido, microfone de qualidade, ambiente silencioso',
  'Apos processamento (ate 24h): copiar Voice ID -> PAWARDS -> Configuracoes -> ElevenLabs',
],y, BLUE);

y=api('E2','Como o audio chega ao paciente — totalmente automatico apos o setup',[
  'Sistema detecta tomada da formula marcada para as 07h do paciente [NOME]',
  'Gera script: "Bom dia [NOME]. Hora da sua [FORMULA]. Dose: [X]mg. [N] dias restantes."',
  'ElevenLabs converte o texto em audio .mp3 usando a VOZ REAL CLONADA do medico',
  'Twilio envia o audio via WhatsApp exatamente no horario da tomada — 100% automatico',
],y, BLUE);
y+=6;

y=sec('API 7 — HEYGEN (AVATAR VIDEO DO MEDICO) — MES 2', y, TEAL);

y=api('H1','Criar avatar do medico e enviar video personalizado a cada paciente',[
  'Acesse: heygen.com -> Sign up -> Plano Creator (US$ 29/mes, 30 creditos)',
  'Avatar -> "Create Talking Photo" -> enviar video do medico: 2 min, fundo neutro, boa iluminacao',
  'Sistema gera script: "Bom dia [NOME]. Lembre da sua formula de longevidade agora."',
  'HeyGen renderiza video de 15s com avatar do medico falando o nome real do paciente',
],y, TEAL);

footer();

// ═══════════════════════════════════════════════════════════════════════════
// PAG 5: ONBOARDING DE NOVA CLINICA LICENCIADA
// ═══════════════════════════════════════════════════════════════════════════
doc.addPage();
y=newPage('ONBOARDING DE NOVA CLINICA LICENCIADA','6 passos: do contrato assinado ate a clinica 100% operacional e faturando');

// Fluxo onboarding
y=sec('FLUXO VISUAL DO ONBOARDING', y, NAVY);
var osteps2=['1\nContrato\nAssinado','2\nCriar conta\nGoogle','3\nTwilio\nWhatsApp','4\nAsaas\nCNPJ (48h)','5\nCadastrar\nno PAWARDS','6\nCLINICA\nATIVA'];
var osw2=Math.floor((CW-5*6)/6), osh2=36;
osteps2.forEach(function(s,i){
  fbox(s, M+i*(osw2+6),y,osw2,osh2, i===5?GREEN:i===0?NAVY:BLUE, WHT);
  if(i<osteps2.length-1){
    doc.fontSize(9).fillColor(TEAL).text('\u2192',M+i*(osw2+6)+osw2+1,y+osh2/2-6,{lineBreak:false});
  }
});
y+=osh2+4;
doc.fontSize(7).fillColor(ORNG).font('Helvetica-Bold')
   .text('NOTA: Passo 4 (aprovacao Asaas) demora ate 48h. Executar passos 2, 3 e 5 em paralelo enquanto espera.', M,y,{lineBreak:false});
y+=14;

// Tabela do que o licenciado recebe
y=sec('O QUE A CLINICA LICENCIADA RECEBE NO DIA 1', y, GREEN);
y=thdr(['Item Recebido','Automatico?','Prazo','Observacao'],[200,80,80,163],y);
[['Acesso ao sistema com login proprio da clinica','SIM','Imediato','Usuario e senha enviados por e-mail'],
 ['Pasta Google Drive criada e vinculada','SIM','Imediato','Sistema cria na hora do cadastro'],
 ['WhatsApp da clinica configurado e testado','SIM','Imediato','Numero Twilio comprado e conectado'],
 ['Calendario Google sincronizado com a agenda','SIM','Imediato','Todas as consultas aparecem no Google Calendar'],
 ['Catalogo com 217 substancias terapeuticas','SIM','Importado','Vem do Instituto Genesis (unidade_id=14)'],
 ['Protocolos-base prontos para customizar','SIM','Importado','Templates do Genesis adaptados para a clinica'],
 ['Dashboard com metricas em tempo real','SIM','Imediato','Sessoes, faturamento, adesao ao tratamento'],
 ['Suporte direto via WhatsApp por 30 dias','NAO','30 dias','CEO disponivel para duvidas iniciais'],
 ['Conta Asaas propria (PIX e boleto)','NAO','48h','CEO da clinica configura — aprovacao bancaria'],
 ['Clone de voz ElevenLabs do medico','Opcional','Mes 1','Medico grava audio e CEO faz o setup'],
].forEach(function(r,i){
  var c2=r[1]==='SIM'?GREEN:r[1]==='NAO'?RED:ORNG;
  y=trow(r,[200,80,80,163],y,i%2===0,[BLACK,c2,BLUE,DGRAY]);
});
y+=8;

// Passos detalhados
y=sec('PASSOS DETALHADOS DO ONBOARDING', y, NAVY);

y=passo(1,'CONTRATO ASSINADO E DADOS COLETADOS (30 min)',[
  'Tipo de licenca: A) Direta royalty 30% | B) Sublicenca | C) Por Demanda',
  'Coletar: CNPJ + e-mail do medico + e-mail financeiro + celular para WhatsApp',
  'Valor: minimo R$ 1.500/mes + R$ 0,03 por mensagem WhatsApp automatizada',
  'Assinar contrato via ZapSign -> PDF arquivado automaticamente no Drive /Contratos/',
],y, NAVY);

y=passo(2,'CRIAR CONTA GOOGLE PARA A CLINICA (15 min)',[
  'Criar Gmail novo especifico: [nomeclinica]@gmail.com — NUNCA usar e-mail pessoal',
  'Google Cloud Console: ativar Drive API + Calendar API + Gmail API (ver Pag. 3)',
  'Criar credenciais OAuth 2.0 -> copiar Client ID e Client Secret',
  'PAWARDS: Empresas -> [Nome] -> Integracoes -> Google -> Conectar -> autorizar',
],y, BLUE);

y=passo(3,'COMPRAR NUMERO WHATSAPP TWILIO (10 min + 48h aprovacao)',[
  'Painel Twilio -> Phone Numbers -> Buy a Number -> Brasil (+55) + WhatsApp capable',
  'Custo: ~R$ 5/mes por numero comprado',
  'PAWARDS: Empresas -> [Nome] -> Mensageria -> Twilio -> colar numero comprado',
  'Verificar: enviar mensagem de teste para o celular do medico licenciado',
],y, RED);

y=passo(4,'CRIAR CONTA ASAAS COM CNPJ DA CLINICA (48h de aprovacao bancaria)',[
  'Acesse asaas.com -> nova conta -> CNPJ DA CLINICA LICENCIADA (nunca o CNPJ proprio)',
  'Enviar documentos -> aguardar aprovacao bancaria (ate 48 horas uteis)',
  'Apos aprovacao: API Key -> PAWARDS -> Financeiro -> Asaas -> colar -> Salvar',
],y, GREEN);

y=passo(5,'CADASTRAR CLINICA NO SISTEMA PAWARDS (10 min)',[
  'Menu -> Empresas -> Nova Empresa -> preencher todos os campos obrigatorios',
  'Campos: nome oficial + CNPJ + tipo de licenca + royalty % + e-mails',
  'Sistema faz automaticamente: cria pasta Drive + conecta Calendar + testa WhatsApp',
  'Verificar: tela de status -> TODAS as integracoes com icone verde CONECTADO',
],y, TEAL);

y=passo(6,'VERIFICAR OPERACAO E HANDOFF AO MEDICO LICENCIADO (20 min)',[
  'Enviar WhatsApp de teste para o medico licenciado (deve chegar em menos de 60 segundos)',
  'Criar sessao de teste com paciente ficticio -> confirmar que aparece na agenda e no Drive',
  'Gerar RAS de teste -> assinar via ZapSign -> verificar PDF com carimbo no Drive',
  'Medico recebe por e-mail: login + senha temporaria + link para este guia de primeiros passos',
],y, NAVY);

// Estrutura Drive
y+=4;
y=sec('ESTRUTURA DE PASTAS GOOGLE DRIVE — 1 ARVORE POR CLINICA', y, TEAL);
[
  [GOLD,'  /PAWARDS/                              ','pasta raiz criada pelo CEO no primeiro setup'],
  [BLUE,'    /Instituto Padua/                    ','1 pasta por clinica (criada no onboarding)'],
  [BLACK,'      /Pacientes/                        ','1 subpasta por paciente (automatica)'],
  [BLACK,'        /[Nome Completo Paciente]/       ','pasta individual — NUNCA excluir'],
  [GREEN,'          RAS_2026-07-16.pdf             ','nome com data — nunca sobrescreve o anterior'],
  [BLACK,'          RACJ_2026-07-16_Consent.pdf   ','consentimento assinado via ZapSign'],
  [BLACK,'      /Contratos/                        ','contratos de licenca assinados'],
  [BLACK,'      /Relatorios/                       ','relatorios mensais gerados pelo sistema'],
  [DGRAY,'    /Barros Clinica/ (futura)            ','proxima clinica a ser licenciada'],
].forEach(function(r,i){
  doc.rect(M,y,CW,14).fill(i%2===0?GRAY:WHT);
  doc.fontSize(8).fillColor(r[0]).font('Courier').text(r[1], M+3,y+3,{width:225,lineBreak:false});
  doc.fontSize(7.5).fillColor(DGRAY).font('Helvetica').text('<- '+r[2], M+232,y+3,{width:CW-235,lineBreak:false});
  y+=15;
});

footer();

// ═══════════════════════════════════════════════════════════════════════════
// PAG 6: CHECKLIST DIARIO + ERROS CRITICOS + FRASE FINAL
// ═══════════════════════════════════════════════════════════════════════════
doc.addPage();
y=newPage('CHECKLIST DIARIO + ERROS CRITICOS','O que verificar todo dia + erros que nunca podem acontecer neste sistema');

// Dois checklists lado a lado
var half=Math.floor(CW/2)-4;
// Titulos
doc.rect(M,y,half,16).fill(GOLD);
doc.fontSize(8).fillColor(BLACK).font('Helvetica-Bold')
   .text('CHECKLIST DA MANHA — 10 MIN (TODO DIA)', M+4,y+4,{width:half-6,lineBreak:false});
var xR=M+half+8;
doc.rect(xR,y,half,16).fill(TEAL);
doc.fontSize(8).fillColor(WHT).font('Helvetica-Bold')
   .text('CHECKLIST DE SEXTA-FEIRA — 30 MIN', xR+4,y+4,{width:half-6,lineBreak:false});
y+=17;

var yM=y, yS=y;
['Dashboard: todas as clinicas com status ONLINE?',
 'Fila de assinaturas: nenhum RAS sem assinar por 24h',
 'WhatsApp: algum lembrete falhou? (ver alertas)',
 'Asaas: inadimplencias > R$ 500 -> ligar para a clinica',
 'Drive: RAS do dia anterior foram enviados?',
 'Billing: uso do mes dentro da franquia de cada clinica?',
].forEach(function(item,i){
  doc.rect(M,yM,half,16).fill(i%2===0?GRAY:WHT);
  doc.rect(M,yM,half,16).stroke('#D5E8F5').lineWidth(0.3);
  doc.rect(M,yM,18,16).fill(GOLD);
  doc.fontSize(8).fillColor(BLACK).font('Helvetica-Bold').text(String(i+1),M+3,yM+4,{width:13,align:'center',lineBreak:false});
  doc.fontSize(7.5).fillColor(BLACK).font('Helvetica').text(item,M+22,yM+4,{width:half-24,lineBreak:false});
  yM+=17;
});

['Relatorio: sessoes, assinaturas, faltas e cobrancas',
 'Faturas licenciados: geradas, enviadas e pagas?',
 'Alertas: falhas no Drive, WhatsApp ou Asaas?',
 'OAuth Google: verificar data de vencimento (90 dias)',
 'Decisao semanal: prioridade A ou B ou C?',
 'Backup: export do banco de dados feito?',
].forEach(function(item,i){
  doc.rect(xR,yS,half,16).fill(i%2===0?LGRAY:WHT);
  doc.rect(xR,yS,half,16).stroke('#D5E8F5').lineWidth(0.3);
  doc.rect(xR,yS,18,16).fill(TEAL);
  doc.fontSize(8).fillColor(WHT).font('Helvetica-Bold').text(String(i+1),xR+3,yS+4,{width:13,align:'center',lineBreak:false});
  doc.fontSize(7.5).fillColor(BLACK).font('Helvetica').text(item,xR+22,yS+4,{width:half-24,lineBreak:false});
  yS+=17;
});
y=Math.max(yM,yS)+10;

// Erros criticos
y=sec('ERROS CRITICOS — O QUE NUNCA PODE ACONTECER NESTE SISTEMA', y, RED);
y=thdr(['Area de Risco','Erro Descrito','Consequencia Real'],[70,245,208],y,RED);

[['LGPD','Dado de clinica A aparecer para clinica B — vazamento','Multa ate R$ 50 milhoes + processo criminal'],
 ['JURIDICO','RAS assinado com CRM ou nome do paciente errado','Documento invalido + processo no conselho medico'],
 ['PRONTUARIO','Drive nao faz upload silencioso do RAS apos assinatura','Prontuario perdido + acao por ma pratica medica'],
 ['FINANCEIRO','Cobranca do licenciado sem detalhamento claro','Cancelamento de contrato + chargeback no cartao'],
 ['OPERACAO','Login cai no meio da consulta com o paciente','Medico sem protocolo em tempo real — risco clinico'],
 ['IMAGEM','Avatar ou voz fala nome errado do paciente','Constrangimento + perda imediata do contrato'],
 ['SEGURANCA','Credenciais de API salvas no codigo ou no GitHub','Invasao da conta + uso indevido das APIs'],
].forEach(function(r,i){
  y=erroBox(r[0],r[1],r[2],y);
});
y+=8;

// Por que o medico licenciado paga com gosto
y=sec('POR QUE O MEDICO LICENCIADO PAGA R$ 2.500 COM GOSTO', y, TEAL);
y=thdr(['O que o medico paga atualmente','Custo Mensal','O que o PAWARDS entrega','Economia Real'],[180,80,180,83],y);
[['2 recepcionistas ineficientes','R$ 4.800/mes','Automacao total do fluxo','R$ 2.300/mes economizado'],
 ['Paciente falta 30% das consultas','Prejuizo diario','WhatsApp automatizado reduz para 10%','R$ 1.200/mes recuperado'],
 ['Prontuario em papel','Risco juridico','RAS assinado digitalmente no Drive','Conformidade legal'],
 ['Anamnese manual sem historico','Dado perdido','Motor clinico com IA e historico completo','Qualidade clinica'],
].forEach(function(r,i){
  y=trow(r,[180,80,180,83],y,i%2===0,[RED,RED,GREEN,TEAL]);
});
y+=8;

// Frase final
doc.rect(M,y,CW,52).fill(NAVY);
doc.rect(M,y,5,52).fill(GOLD);
doc.fontSize(10.5).fillColor(WHT).font('Helvetica-Bold')
   .text('LEMBRE-SE TODO DIA:', M+12,y+6,{lineBreak:false});
doc.fontSize(9).fillColor('#B3E5FC').font('Helvetica')
   .text('O medico que licencia economiza R$ 5.800 por mes em pessoal. Paga R$ 2.500 com GOSTO.', M+12,y+20,{width:CW-16,lineBreak:false});
doc.fontSize(10).fillColor(GOLD).font('Helvetica-Bold')
   .text('50 medicos = R$ 125.000 por mes = R$ 1.500.000 por ano.', M+12,y+33,{width:CW-16,lineBreak:false});
doc.fontSize(8.5).fillColor('#90CAF9').font('Helvetica')
   .text('Voce esta construindo isso AGORA. Kaizen: melhoria continua, incremental, sem parar.', M+12,y+44,{width:CW-16,lineBreak:false});

footer();
doc.end();
console.log('PDF GERADO SEM ERROS:', OUT);
