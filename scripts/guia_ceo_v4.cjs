'use strict';
// GUIA CEO PAWARDS v4 — DEFINITIVO: autoFirstPage:false + overflow guard + sem encadeamento
const PDF = require('../artifacts/api-server/node_modules/pdfkit/js/pdfkit.js');
const fs  = require('fs');
const OUT = './GUIA CEO PAWARDS DR CAIO 26.07.16.pdf';
const doc = new PDF({ size:'A4', margin:0, autoFirstPage:false });
var pageCount=0; doc.on('pageAdded', function(){ pageCount++; });
doc.pipe(fs.createWriteStream(OUT));

const NAVY='#0B2E4A',BLUE='#1565C0',TEAL='#00695C',GRAY='#F4F6F7',LGRAY='#EBF5FB';
const BLACK='#1A1A1A',DGRAY='#666666',GREEN='#1B5E20',RED='#B71C1C',GOLD='#7D5700';
const ORNG='#BF360C',WHT='#FFFFFF';
const PW=595,PH=842,M=36,CW=523,HDR_H=66,FTR_Y=818;
// GUARD: nenhum conteudo passa de MAXC (abaixo do rodapé menos margem de segurança)
const MAXC=FTR_Y-8;
var pgNum=0;

// Primitivas sem encadeamento de estado
function rfill(x,y,w,h,col){ if(y>MAXC)return; doc.fillColor(col); doc.rect(x,y,w,h).fill(); }
function rstroke(x,y,w,h,col,lw){ if(y>MAXC)return; doc.strokeColor(col); doc.lineWidth(lw||0.5); doc.rect(x,y,w,h).stroke(); }
function t(text,x,y,opts,fill,fs,font){
  // GUARD CRITICO: nunca renderizar texto alem da pagina — evita auto-paginacao
  if(y>MAXC) return;
  doc.fontSize(fs||8).font(font||'Helvetica').fillColor(fill||BLACK);
  doc.text(text,x,y,Object.assign({lineBreak:false},opts||{}));
}

function novaPagina(title,sub){
  pgNum++; doc.addPage();
  rfill(0,0,PW,HDR_H,NAVY); rfill(0,0,PW,3,TEAL);
  t('PAWARDS — CEO DR. CAIO HENRIQUE FERNANDES PADUA — PADCOM',M,10,{align:'center',width:CW},'#90CAF9',7,'Helvetica');
  t(title,M,22,{align:'center',width:CW},WHT,14,'Helvetica-Bold');
  t(sub,M,43,{align:'center',width:CW},'#B3E5FC',7.5,'Helvetica');
  t('PAG.'+pgNum+' | 16/07/2026',PW-92,56,{},'#90CAF9',7,'Helvetica');
  rfill(0,HDR_H,PW,2,TEAL);
  return HDR_H+8;
}
function rodape(){
  rfill(0,FTR_Y,PW,24,NAVY); rfill(0,FTR_Y,PW,2,TEAL);
  t('PAWARDS | CEO Dr. Caio Henrique Fernandes Padua | PADCOM | Confidencial',M,FTR_Y+9,{align:'center',width:CW},'#90CAF9',7,'Helvetica-Bold');
}
function sec(label,y,cor){ cor=cor||BLUE; if(y>MAXC)return y; rfill(M,y,5,18,cor); t(label,M+8,y+2,{width:CW-10},cor,10,'Helvetica-Bold'); rfill(M+8,y+18,CW-10,0.6,'#BBDEFB'); return y+24; }
function thdr(cols,widths,y,bg){ bg=bg||NAVY; if(y>MAXC)return y; rfill(M,y,CW,15,bg); var x=M; cols.forEach(function(c,i){ t(c,x+2,y+4,{width:widths[i]-3},WHT,7.5,'Helvetica-Bold'); x+=widths[i]; }); return y+16; }
function trow(cols,widths,y,alt,clrs){ clrs=clrs||[]; if(y>MAXC)return y; rfill(M,y,CW,15,alt?LGRAY:WHT); rstroke(M,y,CW,15,'#D5E8F5',0.3); var x=M; cols.forEach(function(v,i){ t(String(v||''),x+2,y+4,{width:widths[i]-3},clrs[i]||BLACK,7.5); x+=widths[i]; }); return y+16; }
function passo(num,titulo,linhas,y,cor){ cor=cor||TEAL; var h=20+linhas.length*10; if(y>MAXC)return y; rfill(M,y,CW,h,WHT); rstroke(M,y,CW,h,'#BBDEFB',0.5); rfill(M,y,30,h,cor); t(String(num),M,y+Math.floor(h/2)-7,{width:30,align:'center'},WHT,13,'Helvetica-Bold'); t(titulo,M+34,y+3,{width:CW-38},NAVY,8.5,'Helvetica-Bold'); rfill(M+34,y+14,CW-38,0.4,'#DDDDDD'); linhas.forEach(function(l,i){ if(y+17+i*10<=MAXC){ t('\u25B8 ',M+34,y+17+i*10,{width:9},cor,7,'Helvetica-Bold'); t(l,M+43,y+17+i*10,{width:CW-47},BLACK,7,'Helvetica'); }}); return y+h+3; }
function api(cod,titulo,linhas,y,cor){ cor=cor||BLUE; return passo(cod,titulo,linhas,y,cor); }

// ══ PAG 1: MISSAO + ORGANOGRAMA + MATEMATICA + ROADMAP ══
var y=novaPagina('MISSAO E ESTRATEGIA DO CEO','Organograma PADCOM  •  Matematica do Milhao  •  Roadmap');
rfill(M,y,CW,32,NAVY); rfill(M,y,5,32,TEAL);
t('MISSAO:',M+9,y+4,{},GOLD,8,'Helvetica-Bold');
t('Construir o SaaS clinico mais moderno do Brasil. Chegar a R$ 1.500.000/ano com 50 clinicas licenciadas. Comecar pelo Instituto Padua.',M+9,y+14,{width:CW-12},WHT,8,'Helvetica');
y+=36;

y=sec('ORGANOGRAMA — PIRAMIDE PADCOM',y,NAVY);
var cx=M+CW/2;
rfill(cx-90,y,180,22,NAVY); rstroke(cx-90,y,180,22,TEAL,0.8);
t('PADCOM',cx-90,y+3,{width:180,align:'center'},WHT,9,'Helvetica-Bold');
t('Holding — Empresa-Mae do CEO',cx-90,y+13,{width:180,align:'center'},'#B3E5FC',7,'Helvetica');
y+=22; t('\u2193',cx-4,y,{},TEAL,10,'Helvetica-Bold'); y+=12;
rfill(cx-100,y,200,22,BLUE); rstroke(cx-100,y,200,22,TEAL,0.8);
t('PAWARDS',cx-100,y+3,{width:200,align:'center'},WHT,9,'Helvetica-Bold');
t('Engenharia e Sistemas (sub-empresa)',cx-100,y+13,{width:200,align:'center'},'#B3E5FC',7,'Helvetica');
y+=22; t('\u2193',cx-4,y,{},TEAL,10,'Helvetica-Bold'); y+=12;
var w3=250;
rfill(M,y,w3,24,TEAL); rstroke(M,y,w3,24,TEAL,0.8);
t('Instituto Padua (ID=15)',M+2,y+3,{width:w3-4,align:'center'},WHT,8,'Helvetica-Bold');
t('5.270 pacientes — SUA CLINICA PROPRIA',M+2,y+13,{width:w3-4,align:'center'},WHT,7,'Helvetica');
rfill(M+w3+5,y,CW-w3-5,24,LGRAY); rstroke(M+w3+5,y,CW-w3-5,24,'#BBBBBB',0.4);
t('Clinicas Licenciadas',M+w3+7,y+3,{width:CW-w3-9,align:'center'},BLUE,8,'Helvetica-Bold');
t('Barros, Paluzze... R$ 2.500/mes cada',M+w3+7,y+13,{width:CW-w3-9,align:'center'},DGRAY,7,'Helvetica');
y+=28;

y=sec('MATEMATICA DO MILHAO',y,GREEN);
y=thdr(['Clinicas x R$2.500/mes','Faturamento Mensal','Faturamento Anual','Status'],[185,112,112,114],y);
[[10,'R$ 25.000/mes','R$ 300.000/ano','20% da meta'],
 [20,'R$ 50.000/mes','R$ 600.000/ano','40% da meta'],
 [30,'R$ 75.000/mes','R$ 900.000/ano','60% da meta'],
 [50,'R$ 125.000/mes','R$ 1.500.000/ano','META FINAL'],
].forEach(function(r,i){ y=trow([r[0]+' clinicas',r[1],r[2],r[3]],[185,112,112,114],y,i%2===0,i===3?[GOLD,GOLD,GREEN,GREEN]:null); });
y+=6;

y=sec('ROADMAP — O QUE CONSTRUIR E QUANDO',y,BLUE);
y=thdr(['Prazo','Acao Prioritaria','Resultado'],[70,290,163],y);
[['HOJE',   'Verificar fluxo clinico com 1 paciente real do Padua (47 min)','1o atendimento digital'],
 ['SEM. 1', 'Fase C: INSERT herda empresa_id + Tela CEO swipe entre clinicas','Isolamento multi-tenant'],
 ['SEM. 2', 'IA Clinica: Claude gera atestado e sugere exames automaticamente','30 min a mais por consulta'],
 ['SEM. 3', 'ElevenLabs: voz clonada do medico via WhatsApp a cada tomada','Aderencia ao tratamento'],
 ['SEM. 4', 'Stripe Metered: billing por uso em tempo real','Receita proporcional'],
 ['MES 2',  'HeyGen: avatar video do medico por WhatsApp para cada paciente','Diferencial unico no Brasil'],
 ['MES 5',  'Primeira clinica licenciada pagando R$ 2.500 por mes','RECEITA REAL'],
].forEach(function(r,i){ var c1=i===0?RED:(i===6?GREEN:BLUE); y=trow([r[0],r[1],r[2]],[70,290,163],y,i%2===0,[c1,BLACK,DGRAY]); });
rodape();

// ══ PAG 2: FLUXO CLINICO ══
y=novaPagina('FLUXO CLINICO COMPLETO','Do login ao prontuario assinado — 47 minutos');
y=sec('FLUXOGRAMA — 8 ETAPAS DO ATENDIMENTO',y,NAVY);
var bwf=61,bhf=34,gapf=3;
var etapas=[['1','Login'],['2','Paciente'],['3','Sessao'],['4','Anamnese'],['5','Motor'],['6','RAS'],['7','Assinar'],['8','Drive']];
var corEt=[NAVY,BLUE,BLUE,TEAL,TEAL,BLUE,NAVY,GREEN];
etapas.forEach(function(e,i){
  var bx=M+i*(bwf+gapf);
  rfill(bx,y,bwf,bhf,corEt[i]); rstroke(bx,y,bwf,bhf,TEAL,0.8);
  t(e[0],bx+1,y+4,{width:bwf-2,align:'center'},WHT,7,'Helvetica-Bold');
  t(e[1],bx+1,y+15,{width:bwf-2,align:'center'},WHT,7,'Helvetica-Bold');
  if(i<7) t('\u2192',bx+bwf+0,y+bhf/2-4,{},TEAL,8,'Helvetica-Bold');
});
y+=bhf+10;

y=sec('6 PASSOS DETALHADOS',y,NAVY);
y=passo(1,'LOGIN (2 min)',[
  'Abrir o sistema PAWARDS no navegador -> usar e-mail e senha pessoais',
  'Selecionar unidade: INSTITUTO PADUA (unidade_id = 15)',
  'MFA (Multi-Factor Authentication): Google Authenticator -> codigo 6 digitos',
],y,NAVY);
y=passo(2,'PACIENTE E INTEGRACOES (5 min)',[
  'Menu lateral -> Pacientes -> buscar por NOME COMPLETO ou CPF',
  'Antes do 1o atendimento: Configuracoes -> Integracoes -> Google + Twilio + ZapSign = verde',
  'Se algum estiver com ERRO: consultar paginas 3 e 4 deste guia',
],y,BLUE);
y=passo(3,'NOVA SESSAO (5 min)',[
  'Prontuario do paciente -> botao "NOVA SESSAO" -> Tipo + Data + Hora + Profissional',
  'Confirmar -> Google Calendar sincroniza + WhatsApp disparado automaticamente',
],y,TEAL);
y=passo(4,'ANAMNESE + MOTOR CLINICO (20 min com o paciente)',[
  'Botao "INICIAR ANAMNESE" -> perguntas com SKIP-LOGIC (perguntas irrelevantes sao puladas)',
  'MOTOR CLINICO gera sugestoes de formulas + injetaveis + protocolos baseados no historico',
  'Medico revisa sugestoes, ajusta dose/via, confirma protocolo final',
],y,TEAL);
y=passo(5,'GERAR RAS + ASSINAR ICP-BRASIL (10 min)',[
  'RAS = Registro de Assistencia Sistemica (prontuario com validade juridica plena)',
  'Botao "GERAR RAS" -> PDF com CRM + nome + substancias (gerado em segundos)',
  'Botao "ASSINAR COM ICP-BRASIL" -> ZapSign envia link no e-mail e WhatsApp do medico',
  'ICP-Brasil = validade juridica identica a cartorio fisico',
],y,BLUE);
y=passo(6,'UPLOAD DRIVE + ENVIO AO PACIENTE (5 min — automatico)',[
  'Apos assinatura: sistema faz upload automatico para Google Drive na pasta do paciente',
  'Estrutura: /PAWARDS / Instituto Padua / Pacientes / [Nome] / RAS_2026-07-16.pdf',
  'E-mail automatico + WhatsApp ao paciente com PDF assinado',
],y,NAVY);
rodape();

// ══ PAG 3: TABELA DE EMAILS + GOOGLE + TWILIO ══
y=novaPagina('CADASTRO NAS APIS — PARTE 1','Tabela de E-mails  •  Google (Drive+Calendar+Gmail)  •  Twilio (WhatsApp)');
y=sec('REGRA: QUAL E-MAIL USAR PARA CADA SERVICO',y,NAVY);
y=thdr(['Servico','E-mail Correto','Observacao'],[140,200,183],y);
[['Instituto Padua (clinica propria)','e-mail institucional da clinica','Ja existe — verificar acesso'],
 ['Nova clinica licenciada','[nomeclinica]@gmail.com (criar novo)','1 Gmail diferente por clinica — nunca misturar'],
 ['Google APIs (Drive+Calendar+Gmail)','Mesmo e-mail da clinica especifica','1 conta Google por clinica — regra inegociavel'],
 ['Twilio (WhatsApp automatizado)','E-mail pessoal do CEO','1 conta Twilio master serve todas as clinicas'],
 ['Asaas (PIX e boleto)','E-mail financeiro da clinica','Vinculado ao CNPJ — 1 conta por CNPJ'],
 ['ZapSign (assinatura ICP-Brasil)','E-mail do medico responsavel','1 conta ZapSign central para tudo'],
 ['Claude Anthropic (IA clinica)','E-mail pessoal do CEO','1 conta Anthropic central para o sistema'],
].forEach(function(r,i){ y=trow(r,[140,200,183],y,i%2===0,[NAVY,BLUE,DGRAY]); });
y+=6;

y=sec('API 1 — GOOGLE (Drive + Calendar + Gmail) — 1 VEZ POR CLINICA',y,BLUE);
var gsw=100,gsh=28;
['1\nCriar Gmail\nda clinica','2\nGoogle Cloud\nAtivar APIs','3\nCredenciais\nOAuth 2.0','4\nConectar\nno PAWARDS','5\nAutorizar\nDrive+Cal+Gmail'].forEach(function(s,i){
  var bx=M+i*(gsw+5),ls=s.split('\n');
  rfill(bx,y,gsw,gsh,i===4?GREEN:BLUE); rstroke(bx,y,gsw,gsh,TEAL,0.8);
  var ly=y+2; ls.forEach(function(ln,j){ t(ln,bx+1,ly+j*9,{width:gsw-2,align:'center'},WHT,6.5,'Helvetica-Bold'); });
  if(i<4) t('\u2192',bx+gsw+1,y+gsh/2-4,{},TEAL,8,'Helvetica-Bold');
});
y+=gsh+6;
y=api('G1','Criar conta Google para cada clinica (5 min)',[
  'accounts.google.com -> "Criar conta" -> [nomeclinica]@gmail.com — 1 CONTA POR CLINICA',
  'Guardar e-mail e senha em cofre de senhas (LastPass, Bitwarden ou 1Password)',
],y,BLUE);
y=api('G2','Ativar APIs no Google Cloud Console (15 min)',[
  'console.cloud.google.com -> login com conta DA CLINICA -> "Novo Projeto"',
  'APIs e Servicos -> Biblioteca -> ativar: Drive API + Calendar API + Gmail API',
  'Credenciais -> Criar credenciais -> OAuth 2.0 -> Tipo: Aplicativo da Web -> Baixar JSON',
],y,BLUE);
y=api('G3','Conectar ao sistema PAWARDS — 1 vez por clinica (5 min)',[
  'PAWARDS -> Configuracoes -> Integracoes -> Google -> colar Client ID e Client Secret do JSON',
  'Clicar "Conectar" -> autorizar tudo -> Token salvo (90 dias, renovacao automatica)',
],y,BLUE);
y+=4;

y=sec('API 2 — TWILIO (WhatsApp Automatizado)',y,RED);
y=api('T1','Criar conta Twilio master — 1 conta para todas as clinicas (10 min)',[
  'twilio.com -> "Sign up free" -> usar e-mail pessoal do CEO (conta master unica)',
  'Copiar: Account SID e Auth Token — guardar no cofre de senhas',
],y,RED);
y=api('T2','Comprar numero WhatsApp por clinica (10 min + ate 48h aprovacao)',[
  'Painel Twilio -> Phone Numbers -> Buy a Number -> Brasil (+55) + WhatsApp capable',
  'Custo: ~R$ 5/mes por numero + R$ 0,03 por mensagem enviada',
  'PAWARDS -> Configuracoes -> Mensageria -> colar SID + Token + Numero',
],y,RED);
rodape();

// ══ PAG 4: ASAAS + ZAPSIGN + CLAUDE + ELEVENLABS + HEYGEN ══
y=novaPagina('CADASTRO NAS APIS — PARTE 2','Asaas (PIX)  •  ZapSign (Assinatura ICP)  •  Claude (IA)  •  ElevenLabs (Voz)  •  HeyGen (Video)');
y=sec('API 3 — ASAAS (PIX + Boleto + Cartao) — 1 CONTA POR CNPJ',y,GREEN);
var asw=Math.floor((CW-5*5)/6),ash=32;
['1\nAsaas.com','2\nCNPJ da\nclinica','3\nDocumentos','4\nAprovacao\n(ate 48h)','5\nPIX e\nWebhook','6\nAPI Key\nno PAWARDS'].forEach(function(s,i){
  var bx=M+i*(asw+5),ls=s.split('\n'),bg=[TEAL,BLUE,BLUE,ORNG,TEAL,GREEN][i];
  rfill(bx,y,asw,ash,bg); rstroke(bx,y,asw,ash,TEAL,0.8);
  var ly=y+4; ls.forEach(function(ln,j){ t(ln,bx+1,ly+j*11,{width:asw-2,align:'center'},WHT,7,'Helvetica-Bold'); });
  if(i<5) t('\u2192',bx+asw+1,y+ash/2-4,{},TEAL,8,'Helvetica-Bold');
});
y+=ash+4;
t('ATENCAO: Aprovacao Asaas demora ate 48h. Fazer Google e Twilio em paralelo enquanto espera.',M,y,{},ORNG,7.5,'Helvetica-Bold'); y+=12;
y=api('A1','Criar conta Asaas — 1 conta por CNPJ (30 min + 48h aprovacao)',[
  'asaas.com -> "Criar conta gratis" -> CNPJ DA CLINICA ESPECIFICA — nunca misturar CNPJs',
  'Enviar: Contrato Social ou MEI + RG do responsavel + comprovante de endereco',
  'Apos aprovacao: Painel Asaas -> API -> copiar API Key (comeca com: $aas_prod_...)',
],y,GREEN);
y=api('A2','Configurar PIX e Webhook (15 min — feito 1 vez)',[
  'Asaas -> Configuracoes -> Chave PIX -> Cadastrar o CNPJ como chave padrao',
  'Webhook -> URL: https://[url-sistema]/api/asaas/webhook -> ativar eventos de pagamento',
  'PAWARDS -> Configuracoes -> Financeiro -> Asaas -> colar API Key',
],y,GREEN);
y+=4;
y=sec('API 4 — ZAPSIGN (Assinatura Digital ICP-Brasil) — 1 CONTA PARA TUDO',y,'#6A0DAD');
y=api('Z1','Criar conta ZapSign e conectar ao PAWARDS (15 min)',[
  'ICP-Brasil: assinatura com validade juridica plena (igual a cartorio fisico)',
  'zapsign.com.br -> Plano Profissional (R$ 79/mes, 30 docs/mes)',
  'Configuracoes -> API -> "Gerar Token" -> PAWARDS -> Assinatura Digital -> colar token',
],y,'#6A0DAD');
y+=4;
y=sec('API 5 — CLAUDE ANTHROPIC (IA Clinica) — Semana 2',y,ORNG);
y=api('C1','Criar conta Anthropic — 1 conta para o sistema (10 min)',[
  'console.anthropic.com -> adicionar cartao -> API Keys -> "Create Key" -> copiar',
  'Funcionalidades: atestado em 3s, sugestao de exames, motor clinico, portal paciente',
  'PAWARDS -> Configuracoes -> IA -> Anthropic API Key -> colar',
],y,ORNG);
y+=4;
y=sec('API 6 — ELEVENLABS (Voz Clonada do Medico) — Semana 3',y,BLUE);
y=api('E1','Clonar a voz do medico — setup de 1 hora feito 1 unica vez',[
  'elevenlabs.io -> Plano Starter (US$ 22/mes) -> Voices -> Professional Voice Clone',
  'Gravar 2 min de audio do medico (microfone, sem ruido) -> copiar Voice ID',
  'PAWARDS -> Configuracoes -> ElevenLabs -> colar Voice ID',
],y,BLUE);
y+=4;
y=sec('API 7 — HEYGEN (Avatar Video do Medico) — Mes 2',y,TEAL);
y=api('H1','Criar avatar do medico — video personalizado por WhatsApp',[
  'heygen.com -> Plano Creator (US$ 29/mes) -> Avatar -> Criar com video 2 min do medico',
  'Sistema gera: "Bom dia [NOME]. Lembre da sua formula de longevidade agora." — voz + imagem reais',
],y,TEAL);
rodape();

// ══ PAG 5: ONBOARDING DA CLINICA LICENCIADA ══
y=novaPagina('ONBOARDING DE NOVA CLINICA LICENCIADA','Do contrato assinado ate a clinica 100% operacional e faturando');
y=sec('FLUXO DO ONBOARDING',y,NAVY);
var osw=Math.floor((CW-5*6)/6),osh=30;
['1\nContrato\nAssinado','2\nConta\nGoogle','3\nTwilio\nWhatsApp','4\nAsaas\nCNPJ (48h)','5\nCadastrar\nno PAWARDS','6\nCLINICA\nATIVA'].forEach(function(s,i){
  var bx=M+i*(osw+6),ls=s.split('\n'),bg=[NAVY,BLUE,RED,GREEN,TEAL,GREEN][i];
  rfill(bx,y,osw,osh,bg); rstroke(bx,y,osw,osh,TEAL,0.8);
  var ly=y+2; ls.forEach(function(ln,j){ t(ln,bx+1,ly+j*9,{width:osw-2,align:'center'},WHT,i===5?8:7,'Helvetica-Bold'); });
  if(i<5) t('\u2192',bx+osw+1,y+osh/2-4,{},TEAL,8,'Helvetica-Bold');
});
y+=osh+4;
t('NOTA: Passo 4 (Asaas) demora ate 48h. Executar passos 2, 3 e 5 em paralelo enquanto espera.',M,y,{},ORNG,7.5,'Helvetica-Bold'); y+=12;

y=sec('O QUE A CLINICA RECEBE NO DIA 1',y,GREEN);
y=thdr(['Item Recebido','Auto?','Prazo','Observacao'],[200,55,65,203],y);
[['Acesso ao sistema com login proprio','SIM','Imediato','Usuario e senha enviados por WhatsApp'],
 ['Pasta Google Drive criada e vinculada','SIM','Imediato','Sistema cria na hora do cadastro'],
 ['WhatsApp da clinica configurado','SIM','Imediato','Numero Twilio comprado e conectado'],
 ['Catalogo com 217 substancias terapeuticas','SIM','Importado','Vem do Instituto Genesis (ID=14)'],
 ['Protocolos-base prontos para customizar','SIM','Importado','Templates do Genesis prontos'],
 ['Dashboard com metricas em tempo real','SIM','Imediato','Sessoes, faturamento, adesao'],
 ['Conta Asaas propria (PIX e boleto)','NAO','48h','CEO da clinica configura com o proprio CNPJ'],
].forEach(function(r,i){ y=trow(r,[200,55,65,203],y,i%2===0,[BLACK,r[1]==='SIM'?GREEN:RED,BLUE,DGRAY]); });
y+=4;

y=sec('6 PASSOS DETALHADOS DO ONBOARDING',y,NAVY);
y=passo(1,'CONTRATO + DADOS (30 min)',['Tipo de licenca: A) Direta 30% royalty | B) Sublicenca | C) Por Demanda','Dados obrigatorios: CNPJ + e-mail medico + e-mail financeiro + celular para WhatsApp','Assinar via ZapSign -> PDF em /PAWARDS/Contratos/ automaticamente'],y,NAVY);
y=passo(2,'CONTA GOOGLE (15 min)',['Criar [nomeclinica]@gmail.com — NUNCA usar e-mail pessoal','Google Cloud: ativar Drive + Calendar + Gmail APIs (ver Pag. 3 passos G1-G3)'],y,BLUE);
y=passo(3,'NUMERO WHATSAPP TWILIO (10 min + 48h)',['Twilio -> Buy a Number -> Brasil (+55) + WhatsApp capable -> ~R$ 5/mes','PAWARDS -> Empresa -> Mensageria -> colar numero -> enviar mensagem de teste'],y,RED);
y=passo(4,'CONTA ASAAS COM CNPJ (48h)',['asaas.com -> nova conta -> CNPJ DA CLINICA LICENCIADA (nunca o proprio CNPJ)','Enviar documentos -> aguardar 48h -> API Key -> PAWARDS -> Financeiro'],y,GREEN);
y=passo(5,'CADASTRAR NO SISTEMA PAWARDS (10 min)',['Menu -> Empresas -> Nova Empresa -> preencher CNPJ + tipo licenca + royalty % + e-mails','Sistema faz automaticamente: Drive + Calendar + WhatsApp de teste'],y,TEAL);
y=passo(6,'VERIFICAR E HANDOFF AO MEDICO (20 min)',['WhatsApp de teste para o medico licenciado (deve chegar em menos de 60s)','Gerar RAS de teste -> assinar -> verificar PDF no Drive com carimbo de hoje','Medico recebe por e-mail: login + senha temporaria + link para este guia'],y,NAVY);
rodape();

// ══ PAG 6: CHECKLIST + ERROS + ROI ══
y=novaPagina('CHECKLIST DIARIO + ERROS CRITICOS','O que verificar todo dia + o que nunca pode acontecer + por que o medico paga com gosto');
var half=Math.floor(CW/2)-3,xR=M+half+6;
rfill(M,y,half,14,GOLD); t('CHECKLIST DA MANHA — 10 MIN (TODO DIA)',M+3,y+3,{width:half-5},BLACK,7.5,'Helvetica-Bold');
rfill(xR,y,half,14,TEAL); t('CHECKLIST DE SEXTA-FEIRA — 30 MIN',xR+3,y+3,{width:half-5},WHT,7.5,'Helvetica-Bold');
y+=15;
var yM=y,yS=y;
['Dashboard: todas as clinicas com status ONLINE?','Fila de assinaturas: nenhum RAS sem assinar por 24h','WhatsApp: algum lembrete falhou? (ver alertas)','Asaas: inadimplencias > R$ 500 -> ligar para a clinica','Drive: RAS do dia anterior foram enviados?','Billing: uso do mes dentro da franquia de cada clinica?'].forEach(function(item,i){
  rfill(M,yM,half,14,i%2===0?GRAY:WHT); rstroke(M,yM,half,14,'#D5E8F5',0.3);
  rfill(M,yM,16,14,GOLD); t(String(i+1),M+2,yM+3,{width:12,align:'center'},BLACK,7.5,'Helvetica-Bold');
  t(item,M+20,yM+3,{width:half-22},BLACK,7,'Helvetica'); yM+=15;
});
['Relatorio: sessoes, assinaturas, faltas e cobrancas','Faturas licenciados: geradas, enviadas e pagas?','Alertas: falhas no Drive, WhatsApp ou Asaas?','OAuth Google: verificar data de vencimento (90 dias)','Decisao semanal: prioridade A, B ou C?','Backup: export do banco de dados feito?'].forEach(function(item,i){
  rfill(xR,yS,half,14,i%2===0?LGRAY:WHT); rstroke(xR,yS,half,14,'#D5E8F5',0.3);
  rfill(xR,yS,16,14,TEAL); t(String(i+1),xR+2,yS+3,{width:12,align:'center'},WHT,7.5,'Helvetica-Bold');
  t(item,xR+20,yS+3,{width:half-22},BLACK,7,'Helvetica'); yS+=15;
});
y=Math.max(yM,yS)+8;

y=sec('ERROS CRITICOS — O QUE NUNCA PODE ACONTECER',y,RED);
y=thdr(['Area','Erro Descrito','Consequencia Real'],[65,255,203],y);
[['LGPD','Dado de clinica A aparecer para clinica B','Multa ate R$ 50 milhoes + processo criminal'],
 ['JURIDICO','RAS assinado com CRM ou nome errado','Documento invalido + processo no conselho medico'],
 ['PRONTUARIO','Drive nao faz upload do RAS apos assinatura','Prontuario perdido + acao por ma pratica'],
 ['FINANCEIRO','Cobranca sem detalhamento claro ao licenciado','Cancelamento + chargeback no cartao'],
 ['SEGURANCA','Credenciais de API salvas no codigo ou GitHub','Invasao + uso indevido das APIs a custo do CEO'],
].forEach(function(r,i){ y=trow(r,[65,255,203],y,i%2===0,[RED,BLACK,ORNG]); });
y+=6;

y=sec('POR QUE O MEDICO LICENCIADO PAGA R$ 2.500 COM GOSTO',y,TEAL);
y=thdr(['O que o medico paga hoje','Custo','O que o PAWARDS entrega','Economia'],[165,65,190,103],y);
[['2 recepcionistas ineficientes','R$ 4.800/mes','Automacao total do fluxo clinico','R$ 2.300/mes economizado'],
 ['30% de faltas nas consultas','Prejuizo diario','WhatsApp automatizado: faltas caem para 10%','R$ 1.200/mes recuperado'],
 ['Prontuario em papel','Risco juridico','RAS assinado ICP-Brasil no Drive','Conformidade legal plena'],
].forEach(function(r,i){ y=trow(r,[165,65,190,103],y,i%2===0,[RED,RED,GREEN,TEAL]); });
y+=6;

// Frase final
if(y+48<MAXC){
  rfill(M,y,CW,46,NAVY); rfill(M,y,5,46,GOLD);
  t('LEMBRE-SE TODO DIA:',M+10,y+5,{},GOLD,9,'Helvetica-Bold');
  t('O medico que licencia economiza R$ 5.800 por mes. Paga R$ 2.500 com GOSTO.',M+10,y+17,{width:CW-14},'#B3E5FC',8.5,'Helvetica');
  t('50 medicos = R$ 125.000 por mes = R$ 1.500.000 por ano. Voce esta construindo isso AGORA.',M+10,y+29,{width:CW-14},GOLD,9,'Helvetica-Bold');
  t('Kaizen: melhoria continua, sem parar. Um paciente real hoje. Cinquenta clinicas em 12 meses.',M+10,y+41,{width:CW-14},'#90CAF9',7.5,'Helvetica');
}
rodape();
doc.end();
console.log('PDF GUIA v4 GERADO — paginas pelo PDFKit:', pageCount);
