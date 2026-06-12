/**
 * GatilhoSonda.gs — automacao da sonda de integracao (Dr. Replit, 12/06/2026)
 *
 * Por que existe:
 *   O CEO nao quer trabalho manual recorrente. A sonda (runSondaEnfermagem)
 *   PRECISA do runtime do Apps Script — nenhuma IA executa Apps Script.
 *   Solucao: um gatilho de tempo (time-driven) que roda a sonda sozinho todo
 *   dia e manda o resultado por email pro dono do script. Trabalho manual do
 *   CEO = UM clique, uma unica vez, no botao "INSTALAR GATILHO DA SONDA".
 *
 * Seguranca: a sonda chamada aqui e a mesma de TesteEnfermagem.gs — somente
 * leitura na planilha, escrita so em paciente ficticio auto-limpo, sem PDF/
 * email a paciente real.
 */

var SONDA_TRIGGER_HANDLER = 'executarSondaEnfermagemAgendada';

/** Instala (idempotente) o gatilho diario da sonda. Retorna JSON {log,links}. */
function instalarGatilhoSondaEnfermagem() {
  removerGatilhosPorHandler_(SONDA_TRIGGER_HANDLER);
  ScriptApp.newTrigger(SONDA_TRIGGER_HANDLER).timeBased().everyDays(1).atHour(6).create();
  return JSON.stringify({
    log: '[OK] Gatilho diario da sonda instalado.\n'
       + 'A sonda passa a rodar sozinha (~06h) e o resultado vai por email pro dono do script.\n'
       + 'Para desligar, use o botao "REMOVER GATILHO DA SONDA".',
    links: []
  });
}

/** Remove o gatilho diario da sonda. Retorna JSON {log,links}. */
function removerGatilhoSondaEnfermagem() {
  var n = removerGatilhosPorHandler_(SONDA_TRIGGER_HANDLER);
  return JSON.stringify({ log: '[OK] ' + n + ' gatilho(s) da sonda removido(s).', links: [] });
}

/** Remove todos os triggers de um handler. Retorna a contagem removida. */
function removerGatilhosPorHandler_(handler) {
  var triggers = ScriptApp.getProjectTriggers();
  var n = 0;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === handler) {
      ScriptApp.deleteTrigger(triggers[i]);
      n++;
    }
  }
  return n;
}

/**
 * Alvo do gatilho: roda a sonda e envia o relatorio por email pro dono.
 * Nao retorna nada util pro Panel — e disparada pelo agendador.
 */
function executarSondaEnfermagemAgendada() {
  var destino = '';
  try { destino = Session.getEffectiveUser().getEmail() || ''; } catch (e) {}

  var corpo = '';
  try {
    var dados = JSON.parse(runSondaEnfermagem());
    corpo = dados.error ? ('[ERRO] ' + dados.error) : (dados.log || '(sem log)');
  } catch (eRun) {
    corpo = '[ERRO] sonda lancou excecao: ' + (eRun && eRun.message || eRun);
  }

  var resumo = '[sonda executada]';
  var linhas = String(corpo).split('\n');
  for (var i = linhas.length - 1; i >= 0; i--) {
    if (linhas[i].indexOf('RESULTADO SONDA') >= 0) { resumo = linhas[i]; break; }
  }

  if (destino) {
    try {
      MailApp.sendEmail({
        to: destino,
        subject: 'SONDA APP ENFERMAGEM — ' + resumo,
        body: 'Relatorio automatico da sonda de integracao do app da enfermagem.\n\n'
            + corpo
            + '\n\n(Gatilho diario. Para desligar: botao "REMOVER GATILHO DA SONDA" no Panel.)'
      });
    } catch (eMail) {}
  }
}
