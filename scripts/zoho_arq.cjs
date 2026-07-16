'use strict';
// PDF ARQUITETURA EMAIL ZOHO + AUTOMACAO PAXTER
// autoFirstPage:false — controle total de paginas, sem paginas em branco
const PDF = require('../artifacts/api-server/node_modules/pdfkit/js/pdfkit.js');
const fs  = require('fs');

const OUT = './ARQUITETURA EMAIL ZOHO PAXTER DR CAIO 26.07.16.pdf';
const doc = new PDF({ size:'A4', margin:0, autoFirstPage:false });
doc.pipe(fs.createWriteStream(OUT));

// PALETA
const NAVY  = '#0B2E4A', BLUE  = '#1565C0', TEAL  = '#006064';
const GRAY  = '#F4F6F7', LGRAY = '#E3F2FD', BLACK = '#1A1A1A';
const DGRAY = '#666666', GREEN = '#1B5E20', RED   = '#B71C1C';
const GOLD  = '#7D5700', ORNG  = '#BF360C', WHT   = '#FFFFFF';
const PURP  = '#4A148C', CYAN  = '#006B75';

const PW=595, PH=842, M=36, CW=523;
const HDR_H=66, FTR_Y=PH-24;
var pgNum=0;

// ── PRIMITIVAS ────────────────────────────────────────────────────────────────
function rect(x,y,w,h,fill,stroke,sw){
  if(fill){ doc.save(); doc.fillColor(fill); doc.rect(x,y,w,h).fill(); doc.restore(); }
  if(stroke){ doc.save(); doc.strokeColor(stroke); doc.lineWidth(sw||0.5); doc.rect(x,y,w,h).stroke(); doc.restore(); }
}
function txt(text,x,y,opts,fill,fs,font){
  doc.save(); doc.fontSize(fs||8).font(font||'Helvetica').fillColor(fill||BLACK);
  doc.text(text,x,y,Object.assign({lineBreak:false},opts||{})); doc.restore();
}
function novaPagina(title,sub){
  pgNum++; doc.addPage();
  rect(0,0,PW,HDR_H,NAVY);
  rect(0,0,PW,3,TEAL);
  txt('PAXTER — ARQUITETURA DE EMAIL E AUTOMACAO DE ONBOARDING | CEO DR. CAIO HENRIQUE FERNANDES PADUA',M,10,{align:'center',width:CW},'#90CAF9',7,'Helvetica');
  txt(title,M,22,{align:'center',width:CW},WHT,15,'Helvetica-Bold');
  txt(sub,M,44,{align:'center',width:CW},'#B3E5FC',8,'Helvetica');
  txt('PAG.'+pgNum+' DE 5  |  16/07/2026',PW-100,56,{},'#90CAF9',7,'Helvetica');
  rect(0,HDR_H,PW,2,TEAL);
  return HDR_H+10;
}
function rodape(){
  rect(0,FTR_Y,PW,24,NAVY);
  rect(0,FTR_Y,PW,2,TEAL);
  txt('PAXTER | CEO Dr. Caio Henrique Fernandes Padua | Documento Confidencial | 16/07/2026',M,FTR_Y+9,{align:'center',width:CW},'#90CAF9',7,'Helvetica-Bold');
}
function sec(t,y,cor){
  cor=cor||BLUE;
  rect(M,y,5,20,cor);
  txt(t,M+9,y+3,{width:CW-10},cor,10.5,'Helvetica-Bold');
  rect(M+9,y+20,CW-10,0.6,'#BBDEFB');
  return y+26;
}
function thdr(cols,widths,y,bg){
  bg=bg||NAVY;
  rect(M,y,CW,17,bg);
  var x=M;
  cols.forEach(function(c,i){ txt(c,x+3,y+5,{width:widths[i]-4},WHT,8,'Helvetica-Bold'); x+=widths[i]; });
  return y+18;
}
function trow(cols,widths,y,alt,clrs){
  clrs=clrs||[];
  rect(M,y,CW,17,alt?LGRAY:WHT,'#D5E8F5',0.3);
  var x=M;
  cols.forEach(function(c,i){
    var cor=clrs[i]||BLACK; var v=String(c||''); var b=false;
    txt(v,x+3,y+5,{width:widths[i]-4},cor,8,b?'Helvetica-Bold':'Helvetica'); x+=widths[i];
  });
  return y+18;
}
function caixa(num,titulo,linhas,y,cor){
  cor=cor||TEAL; var h=22+linhas.length*11;
  rect(M,y,CW,h,WHT,'#BBDEFB',0.5);
  rect(M,y,32,h,cor);
  txt(String(num),M,y+Math.floor(h/2)-8,{width:32,align:'center'},WHT,14,'Helvetica-Bold');
  txt(titulo,M+36,y+4,{width:CW-40},NAVY,9,'Helvetica-Bold');
  rect(M+36,y+15,CW-40,0.5,'#DDDDDD');
  linhas.forEach(function(l,i){
    txt('\u25B8 ',M+36,y+18+i*11,{width:10},cor,7.5,'Helvetica-Bold');
    txt(l,M+46,y+18+i*11,{width:CW-50},BLACK,7.5,'Helvetica');
  });
  return y+h+4;
}
function fbox(l1,l2,bx,by,bw,bh,bg,tc){
  bg=bg||BLUE; tc=tc||WHT;
  rect(bx,by,bw,bh,bg,TEAL,0.8);
  if(l1) txt(l1,bx+2,by+5,{width:bw-4,align:'center'},tc,7.5,'Helvetica-Bold');
  if(l2) txt(l2,bx+2,by+16,{width:bw-4,align:'center'},tc,7,'Helvetica');
}

// ═══════════════════════════════════════════════════════════════════════════
// PAG 1 — ESTRATEGIA MESTRE + POR QUE PAXTER CONTROLA O EMAIL
// ═══════════════════════════════════════════════════════════════════════════
var y=novaPagina('ARQUITETURA DE EMAIL ZOHO','Por que a PAXTER controla o dominio + Estrutura de caixas e aliases + Seguranca 2FA');

// Caixa de conceito central
rect(M,y,CW,52,NAVY);
rect(M,y,5,52,GOLD);
txt('CONCEITO CENTRAL — POSSE ESTRATEGICA DO DOMINIO',M+12,y+5,{},GOLD,9,'Helvetica-Bold');
txt('A PAXTER (empresa de tecnologia do CEO) compra e controla o dominio da clinica licenciada.',M+12,y+18,{width:CW-16},WHT,8.5,'Helvetica');
txt('Durante o contrato: a clinica usa os e-mails normalmente.',M+12,y+30,{width:CW-16},'#B3E5FC',8.5,'Helvetica');
txt('Fim do contrato: CEO revoga o acesso em segundos via painel Zoho. Sem transicao, sem drama.',M+12,y+42,{width:CW-16},GOLD,8.5,'Helvetica-Bold');
y+=58;

y=sec('POR QUE A PAXTER CONTROLA O DOMINIO — ARGUMENTOS SOLIDOS',y,NAVY);
y=thdr(['Argumento','O que a PAXTER ganha','O que a clinica ganha'],[110,207,206],y);
[['Posse juridica','Ativo digital da PAXTER (clinica nao leva o dominio ao sair)','Nao precisa se preocupar com registro, DNS e renovacao'],
 ['Alavancagem comercial','Clinica inadimplente perde site e email em 1 clique','Tudo pronto no dia 1 — zero burocracia inicial'],
 ['Padronizacao tecnica','1 conta Zoho multi-dominio gerencia tudo de 1 lugar','Suporte tecnico incluido no contrato mensal'],
 ['Seguranca de marca','Controla o que vai em @suaclinica.com.br','E-mails profissionais com o nome da propria clinica'],
 ['Recuperacao de conta','CEO e o destinatario final de qualquer redefinicao de senha','Clinica nao fica sem suporte se o medico sair'],
].forEach(function(r,i){ y=trow(r,[110,207,206],y,i%2===0,[NAVY,GREEN,BLUE]); });
y+=8;

y=sec('MODELO DE DOMINIO — O QUE A PAXTER COMPRA PARA CADA CLINICA',y,BLUE);
y=thdr(['Clinica Exemplo','Dominio Comprado','Registrado em Nome de','Custo Anual PAXTER'],[155,155,130,83],y);
[['Instituto Padua (piloto)','institutopadua.com.br','PAXTER / PAWARDS CNPJ','R$ 40/ano'],
 ['Clinica Barros (futura)','clinicabarros.com.br','PAXTER / PAWARDS CNPJ','R$ 40/ano'],
 ['Clinica Nova Vida (futura)','clinicanovavida.com.br','PAXTER / PAWARDS CNPJ','R$ 40/ano'],
 ['Consultorio Dr. Lima (futuro)','consultoriodrlima.com.br','PAXTER / PAWARDS CNPJ','R$ 40/ano'],
].forEach(function(r,i){ y=trow(r,[155,155,130,83],y,i%2===0,[NAVY,BLUE,DGRAY,GREEN]); });
y+=8;

y=sec('ESTRUTURA DE CAIXAS DE E-MAIL ZOHO POR CLINICA',y,CYAN);
y=thdr(['Caixa de Email (Conta Real Zoho)','Quem Usa','Para Que Serve','Exemplo Instituto Padua'],[165,120,110,128],y,CYAN);
[['medico@[clinica].com.br','Medico responsavel','Prontuarios, RAS, ZapSign','medico@institutopadua.com.br'],
 ['contato@[clinica].com.br','Recepcionista','Duvidas gerais dos pacientes','contato@institutopadua.com.br'],
 ['agendamento@[clinica].com.br','Recepcionista','Confirmar e reagendar consultas','agendamento@institutopadua.com.br'],
 ['financeiro@[clinica].com.br','Gestor financeiro','Boletos, Asaas, notas fiscais','financeiro@institutopadua.com.br'],
].forEach(function(r,i){ y=trow(r,[165,120,110,128],y,i%2===0,[BLUE,BLACK,DGRAY,CYAN]); });
y+=4;
txt('PLANO ZOHO: Zoho Mail Lite — US$ 48/ano por dominio — inclui ate 5 caixas + aliases ilimitados.',M,y,{},DGRAY,7.5,'Helvetica');
y+=12;

y=sec('ALIASES (APELIDOS) DE E-MAIL — O QUE SAO E POR QUE USAR',y,PURP);
rect(M,y,CW,30,LGRAY,'#BBDEFB',0.4);
txt('Alias = apelido de e-mail: o e-mail chega em contato@ mas tambem aceita outros enderecos que redirecionam para ela.',M+8,y+5,{width:CW-16},NAVY,8,'Helvetica');
txt('A caixa Zoho real e 1. O alias nao custa nada extra. Pode ter quantos quiser por caixa.',M+8,y+18,{width:CW-16},DGRAY,7.5,'Helvetica');
y+=36;
y=thdr(['Alias Configurado','Redireciona Para (Caixa Real)','Quando Usar'],[190,170,163],y,PURP);
[['falecom@[clinica].com.br','contato@[clinica].com.br','Landing page / formularios externos'],
 ['atendimento@[clinica].com.br','contato@[clinica].com.br','WhatsApp Business e redes sociais'],
 ['recepcao@[clinica].com.br','agendamento@[clinica].com.br','Comunicacao interna da equipe'],
 ['ceo@[clinica].com.br','medico@[clinica].com.br','Correspondencia de parceiros e fornecedores'],
 ['naoresponda@[clinica].com.br','medico@[clinica].com.br','E-mails automaticos do sistema (RAS, ZapSign)'],
 ['pawards@[clinica].com.br','medico@[clinica].com.br','Notificacoes tecnicas do sistema PAWARDS'],
].forEach(function(r,i){ y=trow(r,[190,170,163],y,i%2===0,[PURP,BLUE,DGRAY]); });

rodape();

// ═══════════════════════════════════════════════════════════════════════════
// PAG 2 — SEGURANCA 2FA + CICLO DE VIDA DO CONTRATO
// ═══════════════════════════════════════════════════════════════════════════
y=novaPagina('SEGURANCA 2FA E CICLO DE VIDA DO CONTRATO','Como o CEO mantem o controle total durante e apos o contrato');

// Fluxo 2FA
y=sec('ARQUITETURA DE SEGURANCA 2FA — CONTROLE DO CEO',y,NAVY);
rect(M,y,CW,36,NAVY);
rect(M,y,5,36,GOLD);
txt('REGRA DE OURO:',M+10,y+5,{},GOLD,9,'Helvetica-Bold');
txt('O e-mail de recuperacao de TODAS as contas Zoho (de TODAS as clinicas) aponta SEMPRE para o CEO.',M+10,y+17,{width:CW-14},WHT,8.5,'Helvetica');
txt('Se o medico licenciado tentar mudar a senha -> o codigo de confirmacao chega no CEO, nao nele.',M+10,y+29,{width:CW-14},'#B3E5FC',8,'Helvetica');
y+=42;

// Fluxo visual de segurança
var bws=Math.floor((CW-4*5)/5), bhs=34;
[['Clinica usa\nemail\nnormalmente','Medico pede\nredefinicao\nde senha','Zoho envia\ncodigo 2FA\n(6 digitos)','Codigo chega\nno CEO\n(nao no medico)','CEO decide\nliberar ou\nnegar acesso']].forEach(function(row){
  row.forEach(function(s,i){
    var bx=M+i*(bws+5), linhas=s.split('\n');
    rect(bx,y,bws,bhs,[GREEN,BLUE,TEAL,GOLD,RED][i],TEAL,0.8);
    var ly=y+3; linhas.forEach(function(ln,j){ txt(ln,bx+2,ly+j*10,{width:bws-4,align:'center'},WHT,7,'Helvetica-Bold'); });
    if(i<4) txt('\u2192',bx+bws+1,y+bhs/2-5,{},TEAL,9,'Helvetica-Bold');
  });
});
y+=bhs+4;
txt('Legenda: [VERDE]=Normal  [AZUL]=Pedido  [TEAL]=Zoho processa  [DOURADO]=CEO recebe  [VERMELHO]=CEO decide',M,y,{},DGRAY,7,'Helvetica');
y+=14;

y=sec('COMO CONFIGURAR O 2FA E RECUPERACAO DE CONTA NO ZOHO',y,BLUE);
y=caixa(1,'Criar conta Zoho Mail — 1 conta master para TODAS as clinicas (30 min)',[
  'Acesse: mail.zoho.com -> "Sign Up" -> usar e-mail PESSOAL do CEO: [email-ceo]@gmail.com',
  'Esta e a conta MASTER que gerencia todos os dominios e caixas de todas as clinicas',
  'Verificar e-mail do CEO -> confirmar o cadastro',
  'Ativar 2FA (Two-Factor Authentication = autenticacao de dois fatores) na conta master:',
  '  Perfil -> Seguranca -> "Verificacao em Duas Etapas" -> usar Google Authenticator',
  'Guardar o codigo de backup Zoho em cofre de senhas (LastPass ou Bitwarden)',
],y,NAVY);

y=caixa(2,'Adicionar dominio de cada clinica e configurar recuperacao de conta (30 min por clinica)',[
  'Painel Zoho -> "Dominios" -> "Adicionar Dominio" -> digitar o dominio da clinica',
  'TXT de verificacao: Zoho gera um codigo como "zoho-verification=zb24073810.zmverify.zoho.com"',
  'ANOTAR este codigo: precisa ser adicionado no DNS do dominio (passo 3)',
  'CONFIGURACAO CRITICA: em cada caixa de email criada -> Configuracoes -> E-mail de recuperacao',
  '  Definir SEMPRE: [email-ceo]@gmail.com (o e-mail pessoal do CEO)',
  '  NUNCA definir: e-mail do medico licenciado como recuperacao — isso quebraria o controle',
],y,BLUE);

y=caixa(3,'Configurar DNS do dominio no registro.br (20 min por clinica)',[
  'Acesse: registro.br -> login com o CNPJ da PAXTER -> selecionar o dominio da clinica',
  'Adicionar registro TXT: valor = "zoho-verification=zb24073810.zmverify.zoho.com" (variavel por clinica)',
  'Adicionar 3 registros MX (servidores de e-mail Zoho) — Zoho mostra os valores exatos:',
  '  MX Priority 10: mx.zoho.com  |  MX Priority 20: mx2.zoho.com  |  MX Priority 50: mx3.zoho.com',
  'Adicionar registro SPF: v=spf1 include:zoho.com ~all (evita spam e garante entrega)',
  'Aguardar propagacao DNS: de 1 a 24 horas (normalmente menos de 2 horas)',
  'Zoho confirma: tela muda para verde "Dominio verificado"',
],y,TEAL);

y=caixa(4,'Criar caixas de email e aliases no Zoho (15 min por clinica)',[
  'Painel Zoho -> "Usuarios" -> "Adicionar Usuario" -> criar cada caixa:',
  '  medico@[clinica].com.br | contato@ | agendamento@ | financeiro@',
  'CADA CAIXA: definir e-mail de recuperacao = [email-ceo]@gmail.com (NUNCA o do medico)',
  'ALIASES: em cada caixa -> "Aliases" -> adicionar os redirecionamentos:',
  '  contato@ recebe tambem: falecom@, atendimento@, naoresponda@, pawards@',
  'Enviar senha inicial ao medico via WhatsApp (NUNCA por email — seguranca)',
],y,PURP);
y+=4;

y=sec('CICLO DE VIDA DO CONTRATO — DO INICIO AO FIM',y,GREEN);
// Fluxo do ciclo de vida
var cvw=Math.floor((CW-5*4)/6), cvh=40;
[['CONTRATO\nASSINADO','PAXTER\nCOMPRA\nDOMINIO','ZOHO\nCONFIGURADO\n2FA CEO','CLINICA\nUSANDO\nNORMALMENTE','INADIM-\nPLENCIA\n>30 DIAS','CONTRATO\nENCERRADO'],
].forEach(function(row){
  row.forEach(function(s,i){
    var bx=M+i*(cvw+4), linhas=s.split('\n');
    var bg=[NAVY,BLUE,TEAL,GREEN,ORNG,RED][i];
    rect(bx,y,cvw,cvh,bg,CYAN,0.8);
    var ly=y+4; linhas.forEach(function(ln,j){ txt(ln,bx+1,ly+j*11,{width:cvw-2,align:'center'},WHT,6.5,'Helvetica-Bold'); });
    if(i<5) txt('\u2192',bx+cvw+1,y+cvh/2-5,{},CYAN,8,'Helvetica-Bold');
  });
});
y+=cvh+10;

y=thdr(['Fase do Contrato','Acoes da PAXTER','Status do Email','Tempo'],[130,200,120,73],y);
[['Contrato assinado','Comprar dominio no registro.br','Nao existe ainda','Dia 0'],
 ['Onboarding (setup)','Zoho configurado + 2FA + caixas + aliases + DNS','ATIVO — caixas criadas','1 a 2 dias'],
 ['Vigencia normal','Monitorar pagamentos e suporte tecnico','ATIVO — uso normal','Meses ativos'],
 ['Inadimplencia','Aviso 30 dias antes + suspender site PADSITE','ATIVO (ainda)','30 dias aviso'],
 ['Inadimplencia grave','Suspender as caixas de email no Zoho','SUSPENSO — email bloqueado','Imediato'],
 ['Encerramento','Apagar caixas + remover dominio + arquivar dados','DESATIVADO','Imediato'],
 ['Encerramento amigavel','Transferir dominio ou deixar expirar (opcao do CEO)','DESATIVADO','Opcao CEO'],
].forEach(function(r,i){
  var c1=[NAVY,BLUE,GREEN,ORNG,RED,RED,TEAL][i];
  var c3=i>=4?RED:(i===0?DGRAY:GREEN);
  y=trow(r,[130,200,120,73],y,i%2===0,[c1,BLACK,c3,DGRAY]);
});

rodape();

// ═══════════════════════════════════════════════════════════════════════════
// PAG 3 — DNS COMPLETO + CONFIGURACAO TECNICA
// ═══════════════════════════════════════════════════════════════════════════
y=novaPagina('CONFIGURACAO TECNICA DNS + ZOHO','SPF * DKIM * DMARC * MX — tudo que precisa configurar no registro.br');

y=sec('TABELA COMPLETA DNS — O QUE CONFIGURAR NO REGISTRO.BR POR CLINICA',y,NAVY);
rect(M,y,CW,22,NAVY);
txt('Como acessar: registro.br -> Entrar -> CNPJ da PAXTER -> Dominios -> [dominio da clinica] -> Editar DNS',M+8,y+7,{width:CW-14},WHT,8,'Helvetica-Bold');
y+=28;
y=thdr(['Tipo DNS','Nome/Host','Valor','Prioridade','Para Que Serve'],[55,90,165,70,143],y);
[['TXT','@','zoho-verification=zb24073810... (Zoho gera)','—','Verificar que o dominio pertence a esta conta Zoho'],
 ['MX','@','mx.zoho.com','10 (maior)','Servidor principal de e-mail do Zoho'],
 ['MX','@','mx2.zoho.com','20 (medio)','Servidor de backup de e-mail do Zoho'],
 ['MX','@','mx3.zoho.com','50 (baixo)','Servidor terciario de e-mail do Zoho'],
 ['TXT','@','v=spf1 include:zoho.com ~all','—','SPF: evita que spammers usem seu dominio para enviar spam'],
 ['CNAME','zmail._domainkey','zmail._domainkey.zoho.com','—','DKIM: assina digitalmente cada e-mail enviado (autenticidade)'],
 ['TXT','_dmarc','v=DMARC1; p=none; rua=mailto:admin@','—','DMARC: relatorio de autenticacao de e-mail (comecar com p=none)'],
 ['A','@','IP do Replit Deploy','—','Apontar o site da clinica para o sistema PAWARDS/PADSITE'],
 ['CNAME','www','@','—','Aceitar tanto www.clinica.com.br quanto clinica.com.br'],
].forEach(function(r,i){ y=trow(r,[55,90,165,70,143],y,i%2===0,[NAVY,TEAL,BLACK,BLUE,DGRAY]); });
y+=6;
txt('DKIM = DomainKeys Identified Mail (chaves que identificam o dominio). DMARC = Domain-based Message Authentication. SPF = Sender Policy Framework (politica de remetente autorizado).', M,y,{width:CW},DGRAY,7,'Helvetica');
y+=16;

y=sec('CONFIGURAR DKIM NO ZOHO (ASSINATURA DIGITAL DOS E-MAILS)',y,CYAN);
y=caixa('D1','Gerar e ativar DKIM no Zoho (10 min por dominio)',[
  'Painel Zoho Admin -> Email -> Configuracoes de Dominio -> [nome do dominio] -> DKIM',
  'Clicar "Adicionar Seletor" -> nome sugerido pelo Zoho: "zmail"',
  'Zoho gera o valor CNAME que voce precisa adicionar no DNS do registro.br',
  'Valor sera algo como: "zmail._domainkey.zoho.com" (variavel por conta Zoho)',
  'Adicionar no registro.br: Tipo=CNAME, Host=zmail._domainkey, Valor=o que o Zoho informou',
  'Aguardar propagacao (ate 24h) -> Zoho mostra "DKIM ativo" com icone verde',
],y,CYAN);

y=caixa('D2','Configurar DMARC — comecar conservador e depois endurecer (20 min)',[
  'DMARC = politica que diz o que fazer com e-mails que falham SPF ou DKIM',
  'PASSO 1 — comecar com p=none (apenas monitorar, nao rejeitar nada):',
  '  Registro.br: Tipo=TXT, Host=_dmarc, Valor: v=DMARC1; p=none; rua=mailto:medico@[clinica].com.br',
  'PASSO 2 — apos 30 dias sem problemas, mudar para p=quarantine (spam):',
  '  Valor: v=DMARC1; p=quarantine; pct=100; rua=mailto:medico@[clinica].com.br',
  'PASSO 3 — apos mais 30 dias, mudar para p=reject (rejeitar completamente):',
  '  Valor: v=DMARC1; p=reject; pct=100; rua=mailto:medico@[clinica].com.br',
],y,BLUE);
y+=6;

y=sec('VERIFICAR SE O EMAIL ESTA FUNCIONANDO CORRETAMENTE',y,GREEN);
y=thdr(['Teste','Ferramenta Gratuita','O Que Verificar','Resultado Esperado'],[115,130,145,133],y);
[['SPF do dominio','mxtoolbox.com -> SPF Lookup','Digitar o dominio da clinica','"v=spf1 include:zoho.com" aparece'],
 ['DKIM do dominio','mxtoolbox.com -> DKIM Lookup','Digitar dominio + seletor "zmail"','Registro CNAME encontrado e valido'],
 ['DMARC do dominio','mxtoolbox.com -> DMARC Lookup','Digitar o dominio da clinica','Politica DMARC encontrada'],
 ['MX records','mxtoolbox.com -> MX Lookup','Digitar o dominio da clinica','3 servidores Zoho com prioridades 10/20/50'],
 ['Entrega de email','mail-tester.com','Enviar e-mail para o endereço gerado','Score 10/10 = email perfeito, sem spam'],
 ['Blacklist','mxtoolbox.com -> Blacklist Check','Digitar o dominio da clinica','"0 de 90 listas" = limpo'],
].forEach(function(r,i){ y=trow(r,[115,130,145,133],y,i%2===0,[NAVY,BLUE,DGRAY,GREEN]); });
y+=8;

y=sec('SEGURANCA ADICIONAL — COFRE DE SENHAS E AUDITORIA',y,RED);
y=thdr(['Item de Seguranca','Ferramenta','Onde Guardar','Quem Tem Acesso'],[140,100,155,128],y);
[['Senha da conta Zoho master','LastPass ou Bitwarden','Cofre compartilhado CEO','Somente o CEO'],
 ['Codigo de backup Zoho (16 digitos)','Cofre fisico impresso','Gaveta com chave na PAXTER','Somente o CEO'],
 ['Senha de cada caixa de email','LastPass ou Bitwarden','Cofre do CEO — pasta Clinicas','CEO + financeiro PAXTER'],
 ['2FA Google Authenticator Zoho','Celular pessoal do CEO','Nao compartilhar nunca','Somente o CEO'],
 ['Token API do Zoho (se usar API)','LastPass ou Bitwarden','Cofre do CEO — pasta APIs','CEO + dev senior'],
 ['TXT de verificacao de dominio','Planilha interna PAXTER','Google Drive /PAXTER/DNS/','CEO + tecnico responsavel'],
].forEach(function(r,i){
  var c4=i===0||i===1||i===3?RED:i===4?ORNG:DGRAY;
  y=trow(r,[140,100,155,128],y,i%2===0,[NAVY,BLUE,DGRAY,c4]);
});

rodape();

// ═══════════════════════════════════════════════════════════════════════════
// PAG 4 — SISTEMA DE AUTOMACAO (CLI Python)
// ═══════════════════════════════════════════════════════════════════════════
y=novaPagina('SISTEMA DE AUTOMACAO — CLI PYTHON','Ferramenta que cria tudo automaticamente quando voce entra com dados da clinica');

// Conceito do CLI
y=sec('O QUE E O PAXTER CLI — VISAO GERAL',y,NAVY);
rect(M,y,CW,44,NAVY);
rect(M,y,5,44,GOLD);
txt('PAXTER CLI (Command Line Interface = ferramenta de linha de comando)',M+10,y+5,{},GOLD,9,'Helvetica-Bold');
txt('Voce digita os dados de uma nova clinica em um formulario. O programa faz TODO o resto sozinho.',M+10,y+18,{width:CW-14},WHT,8.5,'Helvetica');
txt('Voce apenas APROVA cada etapa que exige cartao de credito. O sistema clona toda a estrutura.',M+10,y+30,{width:CW-14},'#B3E5FC',8.5,'Helvetica');
y+=50;

// Fluxo visual do CLI
y=sec('FLUXO DO PAXTER CLI — DO FORMULARIO AO SISTEMA ATIVO',y,BLUE);
var fw=Math.floor((CW-6*4)/7), fh=38;
['1\nFormulario\nde dados','2\nRegistra\ndominio\n(R$ 40)','3\nCria emails\nZoho\n(US$ 48/ano)','4\nConfigura\nDNS e\n2FA','5\nCompra\nnumero\nTwilio','6\nCria pasta\nGoogle\nDrive','7\nCADASTRA\nno PAWARDS\nSISTEMA'].forEach(function(s,i){
  var bx=M+i*(fw+4), linhas=s.split('\n');
  var bg=[NAVY,BLUE,PURP,CYAN,RED,GREEN,TEAL][i];
  rect(bx,y,fw,fh,bg,TEAL,0.8);
  var ly=y+2; linhas.forEach(function(ln,j){ txt(ln,bx+1,ly+j*10,{width:fw-2,align:'center'},WHT,6.5,'Helvetica-Bold'); });
  if(i<6) txt('\u2192',bx+fw+1,y+fh/2-5,{},TEAL,8,'Helvetica-Bold');
});
y+=fh+4;
txt('Legenda:  [NAVY] Dados  [AZUL] Dominio (aprovacao CEO)  [ROXO] Email (aprovacao CEO)  [CIANO] DNS  [VERMELHO] WhatsApp (aprov.)  [VERDE] Drive  [TEAL] PAWARDS',M,y,{},DGRAY,6.5,'Helvetica');
y+=12;

y=sec('DADOS QUE O CEO DIGITA NO FORMULARIO (INPUT)',y,TEAL);
y=thdr(['Campo','Exemplo','Obrigatorio?','Usado Para'],[130,140,90,163],y);
[['Nome oficial da clinica','Clinica Barros Integrativa','SIM','Nome no Drive, PAWARDS, contrato'],
 ['Nome curto (slug)','barros','SIM','URL do sistema: pawards.com/barros'],
 ['Dominio desejado','clinicabarros.com.br','SIM','Comprar no registro.br + configurar Zoho'],
 ['CNPJ da clinica','12.345.678/0001-99','SIM','Conta Asaas — 1 conta por CNPJ'],
 ['Nome completo do medico','Dr. Joao Barros Silva','SIM','Prontuarios, RAS, ZapSign, e-mails'],
 ['E-mail do medico','joao.barros@gmail.com','SIM','Login inicial no sistema PAWARDS'],
 ['Celular do medico','11987654321 (E.164)','SIM','WhatsApp, teste de mensagem'],
 ['Tipo de licenca','Direta / Sublicenca / Por Demanda','SIM','Calculo de royalty e faturamento'],
 ['Cidade e estado da clinica','Sao Paulo, SP','NAO','Dashboard CEO — mapa de cobertura'],
 ['CRM do medico','CRM/SP 123456','NAO','PDFs de prontuario e RAS'],
].forEach(function(r,i){
  var c3=r[2]==='SIM'?GREEN:ORNG;
  y=trow(r,[130,140,90,163],y,i%2===0,[NAVY,BLUE,c3,DGRAY]);
});
y+=8;

y=sec('ESTRUTURA DO PAXTER CLI — COMO O PROGRAMA FUNCIONA POR DENTRO',y,BLUE);
y=caixa('P1','Arquivo principal: paxter_cli.py — execucao: python paxter_cli.py --clinica nova',[
  'Linguagem: Python 3.11+ (facil de modificar, legivel, amplamente suportado)',
  'Input: formulario interativo no terminal OU arquivo JSON com os dados da clinica',
  'Cada etapa e IDEMPOTENTE: se a etapa ja foi feita, pula automaticamente (nao duplica)',
  'Cada etapa que custa dinheiro: programa pausa e pede aprovacao "Confirmar? S/N"',
  'Log completo de tudo que foi feito salvo em: /PAXTER/Onboarding/[slug]/log_YYYY-MM-DD.json',
],y,BLUE);

y=caixa('P2','Modulo zoho_module.py — cria emails e aliases automaticamente',[
  'Biblioteca: requests (HTTP) + python-dotenv (variaveis de ambiente)',
  'Zoho API: POST /api/organization/{orgId}/accounts — criar caixa de email',
  'Zoho API: POST /api/organization/{orgId}/accounts/{id}/aliases — criar alias',
  'Autenticacao: OAuth 2.0 com o token da conta master do CEO (renovacao automatica)',
  'Recuperacao de conta: API define o e-mail de recuperacao = [email-ceo]@gmail.com automaticamente',
  'Resultado: 4 caixas + 6 aliases criados em menos de 30 segundos',
],y,PURP);

y=caixa('P3','Modulo dns_module.py — configura DNS no registro.br',[
  'API registro.br: autenticacao com certificado digital do CNPJ PAXTER (necessario)',
  'Adiciona automaticamente: TXT verificacao Zoho + 3 MX + SPF + CNAME DKIM + DMARC',
  'Verificacao: aguarda propagacao e testa via mxtoolbox.com/api antes de continuar',
  'ALTERNATIVA se API nao disponivel: gera arquivo PDF com instrucoes copiavel para o DNS manual',
],y,CYAN);

y=caixa('P4','Modulo onboarding_module.py — conecta tudo no sistema PAWARDS',[
  'Google Drive: cria pasta /PAWARDS/[Clinica]/ via Google Drive API',
  'Twilio: compra numero WhatsApp via Twilio API (lista numeros disponiveis, CEO escolhe)',
  'PAWARDS: POST /api/empresas — cadastra a clinica no banco de dados',
  'PAWARDS: POST /api/empresas/{id}/integracoes — salva tokens Google, Twilio, Asaas',
  'E-mail de boas-vindas: envia via Gmail API do CEO com login, senha e link do guia',
],y,GREEN);

rodape();

// ═══════════════════════════════════════════════════════════════════════════
// PAG 5 — PASSO A PASSO MANUAL + TABELA DE CUSTOS + PROXIMO PASSO
// ═══════════════════════════════════════════════════════════════════════════
y=novaPagina('PASSO A PASSO MANUAL + TABELA DE CUSTOS','O que fazer agora com o Instituto Padua + quanto custa escalar para 50 clinicas');

y=sec('PASSO A PASSO MANUAL — FAZER HOJE COM O INSTITUTO PADUA (PILOTO)',y,NAVY);

y=caixa(1,'Verificar se o dominio institutopadua.com.br ja esta comprado (5 min)',[
  'Acesse: registro.br -> entrar com CPF/CNPJ -> ver se o dominio existe na sua conta',
  'Se nao existir: comprar no registro.br por ~R$ 40/ano (1 vez so por ano)',
  'Se ja existir: verificar se o DNS esta apontando para o sistema correto',
  'CNPJ a usar no registro.br: CNPJ da PAXTER (nao o do Instituto Padua — regra da posse)',
],y,NAVY);

y=caixa(2,'Criar conta Zoho Mail master (se ainda nao tiver) (15 min)',[
  'Acesse: mail.zoho.com -> "Sign Up for Free" -> usar [email-ceo]@gmail.com',
  'Verificar e-mail -> ativar 2FA com Google Authenticator -> guardar codigo de backup',
  'Plano: Zoho Mail Lite Anual (US$ 48/ano por dominio = ~R$ 280/ano por clinica)',
  'Esta conta master gerencia TODOS os dominios de TODAS as clinicas da PAXTER',
],y,BLUE);

y=caixa(3,'Adicionar dominio institutopadua.com.br no Zoho (20 min)',[
  'Zoho Admin -> Adicionar Dominio -> digitar: institutopadua.com.br',
  'Zoho gera o codigo TXT de verificacao (algo como: zoho-verification=zb24073810...)',
  'ANOTAR o codigo. Ir para o passo 4 (DNS) para adicionar este codigo',
],y,TEAL);

y=caixa(4,'Configurar DNS no registro.br (30 min)',[
  'Registro.br -> Dominios -> institutopadua.com.br -> Editar DNS -> Adicionar:',
  '  TXT: Host=@, Valor=[codigo de verificacao Zoho do passo 3]',
  '  MX: mx.zoho.com (prioridade 10), mx2.zoho.com (20), mx3.zoho.com (50)',
  '  TXT: Host=@, Valor=v=spf1 include:zoho.com ~all',
  '  CNAME: Host=zmail._domainkey, Valor=[gerado pelo Zoho para DKIM]',
  'Aguardar propagacao: de 1 a 24 horas (verificar em mxtoolbox.com)',
],y,CYAN);

y=caixa(5,'Criar caixas de email e aliases no Zoho (20 min)',[
  'Zoho Admin -> Usuarios -> Adicionar: medico@ / contato@ / agendamento@ / financeiro@',
  'Para CADA caixa: Configuracoes -> E-mail de recuperacao -> [email-ceo]@gmail.com',
  'Para CADA caixa: 2FA ativo com Google Authenticator do CEO',
  'Aliases em contato@: falecom@ / atendimento@ / naoresponda@ / pawards@',
  'Enviar senhas iniciais ao medico responsavel via WhatsApp (nunca por email)',
],y,PURP);

y=caixa(6,'Testar e documentar no Drive (10 min)',[
  'Enviar e-mail de teste de cada caixa e verificar o recebimento',
  'Testar em mail-tester.com: enviar e-mail e verificar pontuacao (meta: 10/10)',
  'Salvar no Google Drive: /PAXTER/Clinicas/Instituto Padua/DNS_configurado_2026-07-16.pdf',
  'Este documento vira o modelo para todas as proximas clinicas licenciadas',
],y,GREEN);
y+=8;

y=sec('TABELA DE CUSTOS — QUANTO CUSTA ESCALAR PARA 50 CLINICAS',y,GOLD);
y=thdr(['Servico','Custo por Clinica','Custo 10 Clinicas','Custo 50 Clinicas','Paga Quem'],[120,100,110,110,83],y,NAVY);
[['Dominio .com.br/ano','R$ 40/ano','R$ 400/ano','R$ 2.000/ano','PAXTER adianta'],
 ['Zoho Mail Lite/ano','US$ 48/ano (~R$ 280)','R$ 2.800/ano','R$ 14.000/ano','PAXTER adianta'],
 ['Numero Twilio WhatsApp','~R$ 5/mes = R$ 60/ano','R$ 600/ano','R$ 3.000/ano','PAXTER adianta'],
 ['Google Cloud (APIs)','~R$ 0/ano (free tier)','R$ 0','R$ 0','PAXTER'],
 ['TOTAL por clinica/ano','~R$ 385/ano por clinica','R$ 3.800/ano','R$ 19.000/ano','PAXTER'],
 ['RECEITA de cada clinica','R$ 2.500/mes x 12','R$ 300.000/ano','R$ 1.500.000/ano','Clinica paga'],
 ['MARGEM BRUTA','R$ 2.115/mes por clinica','R$ 253.200/ano','R$ 1.481.000/ano','PAXTER recebe'],
].forEach(function(r,i){
  var c=[NAVY,BLACK,BLACK,BLACK,ORNG][Math.min(i,4)];
  var bold=i===4||i===5||i===6;
  var cl=i===6?[GREEN,GREEN,GREEN,GREEN,GREEN]:(i===5?[BLUE,BLUE,BLUE,BLUE,BLUE]:(i===4?[ORNG,ORNG,ORNG,ORNG,ORNG]:null));
  y=trow([r[0],r[1],r[2],r[3],r[4]],[120,100,110,110,83],y,i%2===0,cl);
});
y+=8;

// Próximo passo
y=sec('PROXIMO PASSO RECOMENDADO — O QUE FAZER HOJE',y,RED);
y=thdr(['Prioridade','Acao','Tempo Estimado','Responsavel'],[70,250,100,103],y);
[['1 — AGORA','Verificar se institutopadua.com.br esta na conta PAXTER no registro.br','10 minutos','CEO'],
 ['2 — HOJE','Criar conta Zoho Mail master com e-mail do CEO e ativar 2FA','20 minutos','CEO'],
 ['3 — HOJE','Adicionar dominio institutopada.com.br no Zoho e configurar DNS','40 minutos','CEO + Dev'],
 ['4 — AMANHA','Criar caixas medico@ / contato@ / agendamento@ / financeiro@','20 minutos','CEO'],
 ['5 — AMANHA','Testar email em mail-tester.com e documentar no Drive','15 minutos','CEO'],
 ['6 — SEMANA 1','Instalar Python + criar estrutura inicial do PAXTER CLI','2 horas','Dr. Code'],
 ['7 — MES 1','PAXTER CLI automatizando todos os passos para novas clinicas','2 semanas','Dr. Code'],
].forEach(function(r,i){
  var c1=i===0?RED:(i<=2?ORNG:(i<=4?BLUE:TEAL));
  y=trow(r,[70,250,100,103],y,i%2===0,[c1,BLACK,DGRAY,NAVY]);
});
y+=8;

// Frase final
rect(M,y,CW,50,NAVY);
rect(M,y,5,50,GOLD);
txt('A LOGICA DO CONTROLE:',M+12,y+5,{},GOLD,9,'Helvetica-Bold');
txt('Quem tem o dominio, tem o email. Quem tem o email, tem a comunicacao da clinica.',M+12,y+18,{width:CW-16},WHT,8.5,'Helvetica');
txt('Quem tem a comunicacao, mantem o poder de negociacao durante todo o contrato.',M+12,y+30,{width:CW-16},'#B3E5FC',8.5,'Helvetica');
txt('Isso nao e clausula abusiva — e gestao de ativo digital. Igual a uma franqueadora que gerencia a marca.',M+12,y+42,{width:CW-16},GOLD,7.5,'Helvetica');

rodape();
doc.end();
console.log('PDF ZOHO GERADO SEM ERROS:', OUT);
