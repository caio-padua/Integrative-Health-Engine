'use strict';
const PDFDocument = require('../node_modules/.pnpm/pdfkit@0.18.0/node_modules/pdfkit/js/pdfkit.js');
const fs = require('fs');

const OUT = './GUIA_COMPLETO_CEO_DR_CAIO_26.07.16.pdf';
const doc = new PDFDocument({ size: 'A4', margin: 40 });
doc.pipe(fs.createWriteStream(OUT));

const NAVY='#0B1D2E', CYAN='#00D4FF', CINZA='#1E3A4A', BRANCO='#FFFFFF';
const VERDE='#00C86E', LARANJA='#FF6B35', AMARELO='#FFD700', VERM='#FF4444';
const W = 515;

function bgPage() { doc.rect(0,0,595,842).fill(NAVY); }

function newPage(titulo, sub, pg) {
  bgPage();
  doc.rect(0,0,595,82).fill(CINZA);
  doc.fontSize(8).fillColor(CYAN).font('Helvetica')
     .text('PAWARDS — GUIA COMPLETO CEO DR. CAIO — PADCOM', 40, 12, {align:'center', width:W});
  doc.fontSize(17).fillColor(BRANCO).font('Helvetica-Bold')
     .text(titulo, 40, 26, {align:'center', width:W});
  if (sub) doc.fontSize(9).fillColor(CYAN).text(sub, 40, 52, {align:'center', width:W});
  doc.fontSize(7.5).fillColor('#555').text('Pag. '+pg+' | 16/07/2026', 490, 66);
  return 94;
}

function sec(txt, y, cor) {
  cor = cor || CYAN;
  doc.rect(30, y, W+10, 21).fill(CINZA);
  doc.fontSize(11).fillColor(cor).font('Helvetica-Bold').text(txt, 36, y+5, {width:W});
  return y+27;
}

function step(n, titulo, linhas, y) {
  var h = 24 + linhas.length * 14;
  if (h > 200) h = 200;
  doc.rect(30, y, W+10, h).fill(CINZA);
  doc.rect(30, y, 30, h).fill(CYAN);
  doc.fontSize(13).fillColor(NAVY).font('Helvetica-Bold').text(String(n), 33, y + Math.floor(h/2) - 8);
  doc.fontSize(10).fillColor(AMARELO).font('Helvetica-Bold').text(titulo, 65, y+6, {width:W-40});
  linhas.forEach(function(l, i) {
    doc.fontSize(8.5).fillColor(BRANCO).font('Helvetica').text('* '+l, 65, y+20+i*14, {width:W-38, lineBreak:false});
  });
  return y + h + 7;
}

function linhaTbl(cols, widths, cores, y, bg) {
  doc.rect(30, y, W+10, 18).fill(bg || NAVY);
  var x = 30;
  cols.forEach(function(c, i) {
    var w = widths ? widths[i] : Math.floor((W+10)/cols.length);
    var cor = cores ? cores[i] : BRANCO;
    doc.fontSize(8.5).fillColor(cor).font('Helvetica').text(String(c||''), x+4, y+5, {width:w-6, lineBreak:false});
    x += w;
  });
  return y + 19;
}

function foot() {
  doc.rect(0,800,595,42).fill(CINZA);
  doc.fontSize(7.5).fillColor(CYAN).font('Helvetica-Bold')
     .text('PAWARDS | CEO Dr. Caio Henrique Fernandes Padua | PADCOM | Confidencial', 40,810,{align:'center',width:W});
  doc.fontSize(7).fillColor('#666')
     .text('"Kaizen: melhoria continua, incremental, sem parar. Pequeno e funcional primeiro."', 40,824,{align:'center',width:W});
}

// ══ PAGINA 1 — MISSAO + ORGANOGRAMA + ROADMAP ══
var y = newPage('GUIA COMPLETO — CEO DR. CAIO', 'Missao * Fluxos * APIs * Checklist Diario', 1);

doc.rect(30,y,W+10,42).fill(CYAN);
doc.fontSize(11).fillColor(NAVY).font('Helvetica-Bold').text('MISSAO:', 36, y+5);
doc.fontSize(10).fillColor(NAVY).font('Helvetica')
   .text('Construir o SaaS clinico mais moderno do Brasil. Chegar a R$ 1.500.000/ano com 50 clinicas licenciadas. Comecar pelo Instituto Padua -- 1 paciente real, hoje.', 36, y+18, {width:W-10});
y += 50;

y = sec('PIRAMIDE PAWARDS — ORGANOGRAMA', y, AMARELO);
[[AMARELO,'PADCOM','Empresa-mae do CEO','Holding de controle'],
 [CYAN,'  PAWARDS','Sub-empresa de tecnologia','Engenharia e sistemas'],
 [VERDE,'    Instituto Padua (ID=15)','Clinica propria do CEO -- 5.270 pacientes','SUA CLINICA TODAY'],
 [BRANCO,'    Clinicas Licenciadas (futuras)','Barros, Paluzze, Nova Clinica...','Pagam R$2.500/mes'],
].forEach(function(r, i) {
  doc.rect(30,y,W+10,18).fill(i%2===0?'#0B1D2E':'#0F2535');
  doc.fontSize(9).fillColor(r[0]).font('Helvetica-Bold').text(r[1], 34, y+5, {width:185,lineBreak:false});
  doc.fontSize(8.5).fillColor('#CCCCCC').font('Helvetica').text(r[2], 223, y+5, {width:190,lineBreak:false});
  doc.fontSize(8).fillColor(CYAN).text(r[3], 417, y+5, {width:120,lineBreak:false});
  y += 19;
});
y += 8;

y = sec('MATEMATICA DO MILHAO', y, VERDE);
[[10,'R$ 25.000/mes','R$ 300.000/ano',BRANCO],
 [20,'R$ 50.000/mes','R$ 600.000/ano',BRANCO],
 [30,'R$ 75.000/mes','R$ 900.000/ano',BRANCO],
 [50,'R$ 125.000/mes','ESTRELA R$ 1.500.000/ANO',AMARELO],
].forEach(function(r) {
  var bg = r[3]===AMARELO ? '#0D3020' : NAVY;
  doc.rect(30,y,W+10,18).fill(bg);
  doc.fontSize(9).fillColor(r[3]).font(r[3]===AMARELO?'Helvetica-Bold':'Helvetica')
     .text(r[0]+' clinicas x R$2.500/mes', 34, y+5, {width:220,lineBreak:false});
  doc.fillColor(CYAN).text(r[1], 258, y+5, {width:130,lineBreak:false});
  doc.fillColor(r[3]).font('Helvetica-Bold').text(r[2], 392, y+5, {width:150,lineBreak:false});
  y += 19;
});
y += 8;

y = sec('ROADMAP — O QUE CONSTRUIR E QUANDO', y, LARANJA);
[['HOJE','Verificar fluxo completo com 1 paciente real -- 47 minutos',CYAN],
 ['SEMANA 1','Fase C (INSERT) + Tela CEO Swipe entre clinicas',CYAN],
 ['SEMANA 2','IA Clinica: Claude gera atestado + sugere exames automaticamente',AMARELO],
 ['SEMANA 3','ElevenLabs: voz do medico no WhatsApp por tomada de medicacao',AMARELO],
 ['SEMANA 4','Stripe Metered: billing por uso em tempo real (como o Replit)',VERDE],
 ['MES 2','HeyGen: video do medico falando com cada paciente pelo WhatsApp',VERDE],
 ['MES 3','IoT: bioimpedancia + pressao arterial no cadastro automaticamente',VERDE],
 ['MES 5-6','Primeira clinica licenciada pagando R$2.500/mes -- RECEITA REAL',AMARELO],
].forEach(function(r, i) {
  doc.rect(30,y,W+10,18).fill(i%2===0?NAVY:'#0F2535');
  doc.rect(30,y,65,18).fill(CINZA);
  doc.fontSize(8.5).fillColor(r[2]).font('Helvetica-Bold').text(r[0], 33, y+5, {width:61,lineBreak:false});
  doc.fontSize(8.5).fillColor(BRANCO).font('Helvetica').text(r[1], 99, y+5, {width:W-68,lineBreak:false});
  y += 19;
});
foot();

// ══ PAGINA 2 — FLUXO CLINICO COMPLETO ══
doc.addPage();
y = newPage('FLUXO CLINICO COMPLETO', 'Como atender 1 paciente -- do login ao prontuario assinado', 2);

y = sec('FLUXO VISUAL DO ATENDIMENTO', y, AMARELO);
doc.rect(30,y,W+10,26).fill(CINZA);
doc.fontSize(9).fillColor(BRANCO).font('Helvetica-Bold')
   .text('Login  ->  Selecionar Paciente  ->  Nova Sessao  ->  Anamnese V2  ->  Motor Clinico  ->  Gerar RAS  ->  Assinar ICP-Brasil  ->  Drive + E-mail', 36, y+9, {width:W});
y += 34;

y = step(1, 'LOGIN NO SISTEMA (2 min)', [
  'URL IHE (sua clinica): https://replit.com/@caio-padua/Integrative-Health-Engine',
  'E-mail: seu e-mail cadastrado | Senha: sua senha pessoal',
  'Selecionar unidade: Instituto Padua (unidade_id = 15)',
  'Se pedir codigo MFA (autenticacao dupla): abrir Google Authenticator no celular',
  'Dashboard abre com fila operacional do dia -- sessoes de hoje aparecem aqui',
], y);

y = step(2, 'VERIFICAR INTEGRACOES ANTES DO PRIMEIRO ATENDIMENTO (5 min)', [
  'Menu lateral -> Configuracoes -> Integracoes',
  'Google Calendar: deve mostrar CONECTADO | Se "Reconectar": clicar e autorizar',
  'Twilio WhatsApp: clicar "Testar" -> deve chegar mensagem no seu celular em 60s',
  'Asaas: status ATIVO | Se nao: cadastrar conta em asaas.com com CNPJ do Padua',
  'ZapSign: status CONECTADO | Se nao: verificar token em Configuracoes -> Assinatura',
], y);

y = step(3, 'ABRIR PACIENTE REAL E CRIAR SESSAO (10 min)', [
  'Menu -> Pacientes -> buscar pelo nome ou CPF do paciente',
  'Clicar no paciente -> botao "Nova Sessao" (canto superior direito)',
  'Tipo: Consulta Medica | Data: hoje | Hora: horario da consulta',
  'Profissional: Dr. Caio Henrique Fernandes Padua (seu CRM)',
  'Confirmar -> sessao aparece na agenda + Google Calendar sincroniza automaticamente',
  'WhatsApp automatico enviado ao paciente: "Sua consulta e hoje as [hora]"',
], y);

y = step(4, 'ANAMNESE V2 -- MOTOR CLINICO (20 min com o paciente)', [
  'Dentro da sessao: botao "Iniciar Anamnese"',
  'Sistema faz perguntas com skip-logic (pula perguntas irrelevantes automaticamente)',
  'Alarme VERMELHO = urgencia clinica | AMARELO = monitorar | VERDE = normal',
  'Ao finalizar: motor clinico analisa e gera sugestoes automaticas de tratamento',
  'Sugestoes: formulas magistrais + injetaveis + protocolos baseados no historico',
  'Medico revisa, ajusta se necessario, e confirma o protocolo final',
], y);

y = step(5, 'GERAR RAS + ASSINAR ICP-BRASIL (10 min)', [
  'Botao "Gerar RAS" (RAS = Registro de Assistencia Sistemica = prontuario digital)',
  'PDF gerado: nome do paciente + protocolo + substancias + CRM do medico + data',
  'REVISAR o PDF na tela: verificar se CRM esta correto ANTES de assinar',
  'Botao "Assinar com ICP-Brasil" -> ZapSign envia link no seu e-mail/WhatsApp',
  'ICP-Brasil = assinatura digital com validade juridica igual a assinatura fisica',
  'Abrir o link -> assinar -> PDF fica com carimbo de assinatura valido',
], y);

y = step(6, 'UPLOAD DRIVE + E-MAIL AO PACIENTE (5 min -- automatico)', [
  'Apos assinatura: sistema faz upload para pasta do paciente no Google Drive',
  'Estrutura Drive: /PAWARDS/Instituto Padua/Pacientes/[Nome]/RAS_2026-07-16.pdf',
  'E-mail automatico enviado ao paciente com PDF assinado em anexo',
  'Verificar: abrir Drive e confirmar que o arquivo esta na pasta correta',
  'TOTAL: ~47 minutos no primeiro atendimento. A partir do 2o: ~20 minutos.',
], y);
foot();

// ══ PAGINA 3 — GOOGLE + TWILIO ══
doc.addPage();
y = newPage('CADASTRO NAS APIS -- PARTE 1', 'Google (Drive + Calendar + Gmail) e Twilio (WhatsApp)', 3);

y = sec('REGRA DE E-MAILS -- QUAL USAR PARA CADA CLINICA', y, AMARELO);
y = linhaTbl(['Clinica','E-mail recomendado','Observacao'],[160,210,155],[AMARELO,CYAN,VERDE],y,CINZA);
[['Instituto Padua (sua clinica)','contato@institutopádua.com.br ou Gmail','Ja existe -- verificar acesso'],
 ['Nova clinica licenciada','[nomeclinica]@gmail.com','Criar antes do onboarding'],
 ['Google APIs (Drive/Calendar)','Mesmo e-mail da clinica','1 conta Google por clinica'],
 ['Twilio (WhatsApp)','E-mail do CEO (conta master)','1 conta pode ter N numeros'],
 ['Asaas (cobrancas)','E-mail financeiro da clinica','1 conta Asaas por CNPJ'],
 ['ZapSign (assinatura digital)','E-mail do medico + CRM','Vinculada ao CRM do medico'],
].forEach(function(r, i) {
  y = linhaTbl(r,[160,210,155],[VERDE,BRANCO,'#AAAAAA'],y,i%2===0?NAVY:'#0F2535');
});
y += 10;

y = sec('API 1 -- GOOGLE (Drive + Calendar + Gmail) -- PASSO A PASSO', y, '#4285F4');
y = step('G1', 'Criar conta Google para cada clinica (5 min)', [
  'Acesse: accounts.google.com -> "Criar conta" -> "Para minha empresa"',
  'E-mail: [nomeclinica]@gmail.com OU e-mail corporativo proprio da clinica',
  'REGRA DE FERRO: 1 conta Google DIFERENTE por clinica -- nunca misturar',
  'Anotar: e-mail + senha em cofre seguro (LastPass, Bitwarden ou 1Password)',
], y);

y = step('G2', 'Ativar APIs no Google Cloud Console (15 min)', [
  'Acesse: console.cloud.google.com -> Login com a conta DA CLINICA',
  'Clicar "Novo Projeto" -> nomear "[Nome Clinica] Pawards" -> Criar',
  'Menu -> APIs e Servicos -> Biblioteca -> buscar e ATIVAR cada uma:',
  '  Google Drive API (upload de PDFs dos pacientes)',
  '  Google Calendar API (sincronizar agenda de consultas)',
  '  Gmail API (enviar e-mails com PDF assinado)',
  'Credenciais -> "Criar credenciais" -> "ID do cliente OAuth 2.0"',
  'Tipo: Aplicativo da Web | URI autorizado: https://[url-sistema]/api/google/callback',
  'Baixar o JSON de credenciais -> guardar como google_[clinica].json',
], y);

y = step('G3', 'Conectar no sistema Pawards (1 vez por clinica) (5 min)', [
  'Menu -> Configuracoes -> Integracoes -> Google',
  'Colar: Client ID e Client Secret (do arquivo JSON baixado no passo G2)',
  'Clicar "Conectar" -> abre janela Google -> selecionar conta DA CLINICA',
  'Autorizar: Drive (leitura+escrita) + Calendar (leitura+escrita) + Gmail (envio)',
  'Token salvo automaticamente. Valido por 90 dias -- renova sozinho.',
], y);
y += 6;

y = sec('API 2 -- TWILIO (WhatsApp) -- PASSO A PASSO', y, '#F22F46');
y = step('T1', 'Criar conta Twilio -- 1 conta master para todas as clinicas (10 min)', [
  'Acesse: twilio.com -> "Sign up free" -> usar e-mail do CEO (conta principal)',
  'Verificar e-mail + numero de celular (Twilio liga para verificar -- obrigatorio)',
  'Painel Twilio -> copiar: Account SID e Auth Token -> guardar no cofre de senhas',
  'IMPORTANTE: 1 conta Twilio pode ter varios numeros de WhatsApp diferentes',
], y);

y = step('T2', 'Comprar numero WhatsApp por clinica (10 min)', [
  'Painel Twilio -> Phone Numbers -> Buy a Number',
  'Filtrar: Pais = Brasil (+55) | Capacidade = WhatsApp (marcar checkbox)',
  'Custo: ~R$5/mes por numero + R$0,03 por mensagem enviada',
  'Selecionar e comprar -> anotar o numero completo: +5511XXXXXXXX',
  'WhatsApp Business: solicitar aprovacao do numero no painel Twilio (ate 48h)',
], y);

y = step('T3', 'Configurar no sistema Pawards (5 min)', [
  'Menu -> Configuracoes -> Mensageria -> Twilio',
  'Preencher: Account SID + Auth Token + Numero WhatsApp da clinica',
  'Salvar -> clicar "Testar conexao" -> deve aparecer OK',
  'Enviar mensagem de teste para seu celular e confirmar que chegou',
], y);
foot();

// ══ PAGINA 4 -- ASAAS + ZAPSIGN + CLAUDE + ELEVENLABS ══
doc.addPage();
y = newPage('CADASTRO NAS APIS -- PARTE 2', 'Asaas + ZapSign + Claude IA + ElevenLabs + HeyGen', 4);

y = sec('API 3 -- ASAAS (PIX + Boleto + Cartao) -- 1 CONTA POR CNPJ', y, VERDE);
y = step('A1', 'Criar conta Asaas para cada clinica (30 min + 48h aprovacao)', [
  'Acesse: asaas.com -> "Criar conta gratis"',
  'CNPJ: usar o CNPJ DA CLINICA ESPECIFICA (nunca misturar CNPJs)',
  'E-mail: financeiro@[clinica].com.br (e-mail financeiro, nao pessoal)',
  'Documentos: CNPJ + RG do responsavel + comprovante de endereco',
  'Aprovacao: ate 48 horas uteis apos envio dos documentos',
  'Plano indicado: Basic (sem mensalidade, cobra % sobre transacoes)',
], y);

y = step('A2', 'Configurar PIX + Webhook no Asaas (15 min)', [
  'Painel Asaas -> Configuracoes -> Chave PIX -> Cadastrar o CNPJ como chave PIX',
  'Integracoes -> API -> copiar API Key de PRODUCAO (comeca com: $aas_prod_...)',
  'Webhook: URL = https://[url-sistema]/api/asaas/webhook',
  'Ativar eventos: pagamento_recebido | cobranca_vencida | cobranca_cancelada',
  'No sistema: Configuracoes -> Financeiro -> Asaas -> colar API Key -> Salvar',
], y);
y += 6;

y = sec('API 4 -- ZAPSIGN (Assinatura Digital ICP-Brasil) -- 1 CONTA BASTA', y, '#7C3AED');
y = step('Z1', 'Criar conta ZapSign e configurar (15 min)', [
  'Acesse: zapsign.com.br -> "Criar conta"',
  'Plano recomendado: Profissional -- R$79/mes (30 documentos incluidos)',
  'E-mail: e-mail do CEO (1 conta ZapSign serve para todas as clinicas)',
  'Configuracoes -> API -> "Gerar Token" -> copiar o token (comeca com: zs_...)',
  'No sistema: Configuracoes -> Assinatura Digital -> ZapSign -> colar token',
  'Testar: criar documento de teste e assinar -> verificar PDF com carimbo de assinatura',
], y);
y += 6;

y = sec('API 5 -- CLAUDE / ANTHROPIC (IA Clinica) -- SEMANA 2', y, '#CC785C');
y = step('C1', 'Criar conta Anthropic e obter API Key (10 min)', [
  'Acesse: console.anthropic.com -> "Sign up"',
  'E-mail: e-mail do CEO (1 conta para todo o sistema Pawards)',
  'Adicionar cartao de credito (cobranca por token = unidade de texto processado)',
  'API Keys -> "Create Key" -> nomear "Pawards Producao" -> copiar',
  'No sistema: Configuracoes -> IA -> Anthropic API Key -> colar',
  'Custo estimado: US$10--50/mes dependendo do volume de atestados',
], y);

y = step('C2', 'O que a IA faz automaticamente (nenhuma acao necessaria depois)', [
  'Atestado medico: paciente pede via portal -> PDF gerado em 3s com CRM + data + CID',
  'Sugestao de exames: paciente descreve queixa -> lista exames relevantes',
  'Resposta ao paciente: mensagem no portal -> IA responde com base no prontuario real',
  'Motor clinico: anamnese preenchida -> IA sugere formulas + injetaveis + protocolos',
], y);
y += 6;

y = sec('API 6 -- ELEVENLABS (Voz do Medico) -- SEMANA 3', y, '#2563EB');
y = step('E1', 'Clonar a voz do medico no ElevenLabs (1 hora de setup)', [
  'Acesse: elevenlabs.io -> "Sign up" -> Plano Starter (US$22/mes)',
  'Voices -> "Add Voice" -> "Professional Voice Clone"',
  'Gravar 2 minutos de audio: medico falando frases variadas, sem ruido, boa qualidade',
  'Upload do audio -> aguardar processamento ate 24h -> voz clonada pronta',
  'Voice ID -> copiar e colar em: Configuracoes -> Mensageria -> ElevenLabs',
  'A voz fica salva -- nao precisa regravar nunca mais',
], y);

y = step('E2', 'Como o audio chega ao paciente (totalmente automatico)', [
  'Sistema detecta: paciente tem tomada de formula as 07h',
  'Gera script: "Bom dia [NOME]. Hora da sua [FORMULA]. Dose: [X]mg."',
  'ElevenLabs converte o texto para audio .mp3 com a VOZ REAL DO MEDICO',
  'Twilio envia o audio via WhatsApp no horario exato da tomada',
  'Paciente ouve a voz do medico -- aderencia ao tratamento aumenta significativamente',
], y);
y += 6;

y = sec('API 7 -- HEYGEN (Avatar em Video do Medico) -- MES 2', y, '#0EA5E9');
y = step('H1', 'Criar avatar do medico e enviar videos personalizados', [
  'Acesse: heygen.com -> "Sign up" -> Plano Creator (US$29/mes, 30 creditos)',
  'Avatar -> "Create Talking Photo" -> enviar video do medico (2 min, fundo neutro)',
  'Sistema gera script: "Bom dia Maria. Lembre da sua formula de longevidade agora."',
  'HeyGen renderiza video de 15s com o avatar do medico falando o nome do paciente',
  'Twilio envia o .mp4 via WhatsApp -> paciente ve o medico "falando com ele"',
  'Resultado: wow factor unico no mercado -- diferencial que fecha contratos de licenca',
], y);
foot();

// ══ PAGINA 5 -- ONBOARDING DE NOVA CLINICA ══
doc.addPage();
y = newPage('ONBOARDING DE NOVA CLINICA LICENCIADA', '6 passos: do contrato assinado a clinica 100% operacional', 5);

y = sec('FLUXO VISUAL DO ONBOARDING', y, AMARELO);
doc.rect(30,y,W+10,24).fill(CINZA);
doc.fontSize(9).fillColor(BRANCO).font('Helvetica-Bold')
   .text('Contrato  ->  Google  ->  Twilio  ->  Asaas  ->  Cadastrar no sistema  ->  CLINICA ATIVA', 36, y+8, {width:W});
y += 32;

y = step(1, 'CONTRATO ASSINADO E DADOS COLETADOS (30 min)', [
  'Definir tipo de licenca: Direta (royalty 30%) | Sublicenca | Por Demanda',
  'Coletar: CNPJ da clinica + e-mail do medico + e-mail financeiro + celular',
  'Definir valor: minimo R$1.500/mes (plano basico) + R$0,15/mensagem WhatsApp',
  'Assinar contrato via ZapSign -- PDF arquivado no Drive /Contratos/',
  'Criar empresa no sistema: Menu -> Empresas -> Nova Empresa',
], y);

y = step(2, 'CRIAR CONTA GOOGLE PARA A CLINICA (15 min)', [
  'Criar Gmail novo: [nomeclinica]@gmail.com (usar e-mail novo, nao pessoal)',
  'Ativar no Google Cloud Console: Drive API + Calendar API + Gmail API',
  'Criar credenciais OAuth -> copiar Client ID e Client Secret',
  'No sistema: Empresas -> [Nome da Clinica] -> Integracoes -> Google -> Conectar',
], y);

y = step(3, 'COMPRAR NUMERO WHATSAPP TWILIO (10 min)', [
  'Painel Twilio -> Phone Numbers -> Buy a Number -> Brasil (+55)',
  'Comprar numero com capacidade WhatsApp (filtrar pelo checkbox)',
  'Custo: ~R$5/mes por numero',
  'No sistema: Empresas -> [Nome Clinica] -> Mensageria -> Twilio -> colar numero',
], y);

y = step(4, 'CRIAR CONTA ASAAS COM CNPJ DA CLINICA (48h de aprovacao)', [
  'Acesse asaas.com -> nova conta -> CNPJ DA CLINICA LICENCIADA',
  'Enviar documentos -> aguardar aprovacao (ate 48h uteis)',
  'Apos aprovacao: copiar API Key -> Empresas -> Financeiro -> Asaas -> colar',
  'DURANTE a espera: fazer os passos 2, 3 e 5 em paralelo (nao precisa esperar)',
], y);

y = step(5, 'CADASTRAR CLINICA NO SISTEMA (10 min)', [
  'Menu -> Empresas -> Nova Empresa',
  'Preencher: nome + CNPJ + tipo de licenca + royalty % + e-mails',
  'Sistema faz automaticamente: cria pasta no Drive + conecta Calendar + testa WhatsApp',
  'Verificar: tela de status -> todas as integracoes com OK',
], y);

y = step(6, 'VERIFICAR OPERACAO COMPLETA -- HANDOFF PARA O MEDICO (20 min)', [
  'Enviar WhatsApp de teste para o medico licenciado (deve chegar em 60s)',
  'Criar sessao de teste com paciente ficticio -- verificar agenda',
  'Gerar RAS de teste -> assinar -> verificar PDF no Drive',
  'Medico licenciado recebe: login + senha + link para o guia de primeiros passos',
  'Suporte inicial: CEO disponivel via WhatsApp pelos primeiros 30 dias',
], y);

y = sec('ESTRUTURA DE PASTAS GOOGLE DRIVE -- 1 ARVORE POR CLINICA', y, VERDE);
[[AMARELO,'/PAWARDS/','pasta raiz (criada pelo CEO no primeiro setup)'],
 [CYAN,'  /Instituto Padua/','1 pasta por clinica licenciada'],
 [BRANCO,'    /Pacientes/','1 subpasta por paciente (criada automaticamente)'],
 [BRANCO,'      /[Nome Paciente]/','criada no primeiro RAS do paciente'],
 [VERDE,'        RAS_2026-07-16.pdf','nome semantico com data -- nunca sobrescreve'],
 [BRANCO,'    /Contratos/','contrato de licenca assinado'],
 [BRANCO,'    /Relatorios/','relatorios mensais gerados pelo sistema'],
 ['#888','  /Barros Clinica/ (futura)','proxima clinica licenciada'],
].forEach(function(r, i) {
  doc.rect(30,y,W+10,15).fill(i%2===0?NAVY:'#0F2535');
  doc.fontSize(8).fillColor(r[0]).font('Courier').text(r[1], 34, y+4, {width:195,lineBreak:false});
  doc.fontSize(7.5).fillColor('#999').font('Helvetica').text('<- '+r[2], 233, y+4, {width:W-205,lineBreak:false});
  y += 16;
});
foot();

// ══ PAGINA 6 -- CHECKLIST DIARIO + ERROS CRITICOS ══
doc.addPage();
y = newPage('CHECKLIST DIARIO DO CEO', 'O que verificar todo dia + erros que nao podem acontecer', 6);

y = sec('CHECKLIST DA MANHA -- 10 MINUTOS TODO DIA', y, AMARELO);
['Abrir Dashboard Global -> todas as clinicas com status OK e ONLINE?',
 'Fila de assinaturas: nenhum RAS deve ficar sem assinar por mais de 24h',
 'WhatsApp: algum lembrete falhou? (icone de alerta na tela de mensageria)',
 'Asaas: cobrancas do dia -- inadimplencias acima de R$500 -> ligar para a clinica',
 'Drive: RAS do dia anterior foram enviados? (verificar pasta do paciente no Drive)',
 'Billing: uso do mes esta dentro da franquia de cada clinica licenciada?',
].forEach(function(item, i) {
  doc.rect(30,y,W+10,18).fill(i%2===0?NAVY:'#0F2535');
  doc.rect(30,y,22,18).fill(CINZA);
  doc.fontSize(9).fillColor(AMARELO).font('Helvetica-Bold').text(String(i+1), 33, y+5);
  doc.fontSize(8.5).fillColor(BRANCO).font('Helvetica').text(item, 56, y+5, {width:W-30,lineBreak:false});
  y += 19;
});
y += 8;

y = sec('CHECKLIST SEMANAL -- SEXTA-FEIRA -- 30 MINUTOS', y, VERDE);
['Relatorio da semana: sessoes, assinaturas, faltas e cobrancas -- tudo confere?',
 'Faturas dos licenciados: todas foram geradas, enviadas e estao pagas?',
 'Alertas do sistema: falhas de Drive? WhatsApp nao entregue? Asaas offline?',
 'Tokens Google OAuth: verificar data de vencimento (90 dias -- renovar antes)',
 'Decisao semanal: qual a prioridade da proxima semana? A ou B ou C (com default)',
].forEach(function(item, i) {
  doc.rect(30,y,W+10,18).fill(i%2===0?NAVY:'#0F2535');
  doc.rect(30,y,22,18).fill(VERDE);
  doc.fontSize(9).fillColor(NAVY).font('Helvetica-Bold').text(String(i+1), 33, y+5);
  doc.fontSize(8.5).fillColor(BRANCO).font('Helvetica').text(item, 56, y+5, {width:W-30,lineBreak:false});
  y += 19;
});
y += 8;

y = sec('ERROS CRITICOS -- O QUE NUNCA PODE ACONTECER', y, VERM);
[['LGPD','Dado de clinica A aparecer para clinica B','Multa R$50 milhoes + processo criminal'],
 ['JURIDICO','RAS assinado com CRM errado ou nome errado','Documento invalido + CRM cancela registro do medico'],
 ['PRONTUARIO','Drive nao faz upload silencioso do RAS','Prontuario perdido para sempre + processo por ma pratica'],
 ['FINANCEIRO','Cobranca do licenciado sem detalhamento','Licenciado cancela contrato + chargeback no cartao'],
 ['OPERACAO','Login cai no meio da consulta com o paciente','Medico sem acesso ao protocolo -- risco clinico real'],
 ['IMAGEM','Avatar fala nome errado do paciente','Constrangimento grave + perda do contrato de licenca'],
].forEach(function(r, i) {
  doc.rect(30,y,W+10,26).fill(i%2===0?'#1A0505':'#200808');
  doc.rect(30,y,68,26).fill(VERM);
  doc.fontSize(7.5).fillColor(BRANCO).font('Helvetica-Bold').text(r[0], 32, y+9, {width:64, align:'center'});
  doc.fontSize(9).fillColor(AMARELO).font('Helvetica-Bold').text('ATENCAO: '+r[1], 102, y+5, {width:W-78,lineBreak:false});
  doc.fontSize(8).fillColor('#FFAAAA').font('Helvetica').text('Consequencia: '+r[2], 102, y+16, {width:W-78,lineBreak:false});
  y += 27;
});
y += 10;

doc.rect(30,y,W+10,50).fill(CYAN);
doc.fontSize(13).fillColor(NAVY).font('Helvetica-Bold').text('LEMBRE TODO DIA:', 36, y+6);
doc.fontSize(10).fillColor(NAVY).font('Helvetica')
   .text('O medico que licencia economiza R$5.800/mes em funcionarias ineficientes.', 36, y+22, {width:W-10});
doc.fontSize(10).fillColor(NAVY).font('Helvetica-Bold')
   .text('Ele paga R$2.500 com GOSTO. 50 medicos = R$1.500.000/ano. Voce esta construindo isso AGORA.', 36, y+35, {width:W-10});

foot();
doc.end();
console.log('PDF GERADO COM SUCESSO:', OUT);
