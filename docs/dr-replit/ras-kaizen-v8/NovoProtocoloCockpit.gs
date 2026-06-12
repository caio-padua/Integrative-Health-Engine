/**
 * NovoProtocoloCockpit.gs — BOTAO "NOVO PROTOCOLO" (limpa SO o formulario)
 * ───────────────────────────────────────────────────────────────────────
 * Decisao do CEO (11/06/2026, opcao A): o botao limpa APENAS os campos de
 * entrada do COCKPIT, deixando a aba pronta para digitar outro protocolo.
 * NAO mexe na TABELA GERAL, nem em CADASTRO PACIENTES, nem em nenhuma outra
 * aba — so esvazia o formulario do cockpit (sem apagar titulos, instrucoes,
 * bordas ou as validacoes dos dropdowns).
 *
 * Campos limpos (conforme estruturarCockpit_):
 *   B4        -> 1. paciente (dropdown)
 *   B8:D8     -> 2. dia / mes / ano de inicio do protocolo
 *   A13:I27   -> 3. substancias (nome, sessoes, freq e inicio opcional)
 *
 * Depende (ja existe no projeto, escopo global do Apps Script): getSS_.
 */
function novoProtocoloCockpit_() {
  var ss = getSS_();
  var cockpit = ss.getSheetByName('COCKPIT');
  if (!cockpit) {
    return '[ERRO] Aba COCKPIT nao encontrada. Rode APLICAR ESTRUTURA antes.';
  }

  // clearContent() apaga SO o conteudo — preserva formato, bordas e validacoes.
  cockpit.getRange('B4').clearContent();      // 1. paciente
  cockpit.getRange('B8:D8').clearContent();   // 2. dia/mes/ano de inicio
  cockpit.getRange('A13:I27').clearContent(); // 3. substancias

  return '[OK] Formulario do COCKPIT limpo. Pronto para um novo protocolo.\n' +
         '[INFO] Nada foi apagado na TABELA GERAL nem nas outras abas.';
}

function runNovoProtocolo() { return novoProtocoloCockpit_(); }
