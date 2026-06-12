/**
 * TesteEnfermagem.gs — SONDA DE INTEGRACAO do app da enfermagem (Dr. Replit, 12/06/2026)
 *
 * Por que existe:
 *   Os testes em tests/test_app_enfermagem.mjs cobrem so as funcoes PURAS
 *   (rodam no `node` do Dr. Replit). Eles NAO tocam Planilha/Drive/CacheService
 *   porque o Apps Script nao roda no ambiente do Dr. Replit.
 *   Esta sonda fecha esse buraco: roda DENTRO da conta do CEO (botao no Panel)
 *   e exercita o fluxo ponta a ponta com varias variaveis.
 *
 * Garantias de seguranca da sonda (ler antes de rodar):
 *   1. NAO escreve, edita nem apaga nenhuma linha de paciente na planilha (so leitura).
 *   2. NAO gera PDF nem envia email para nenhum paciente real.
 *   3. O unico dado gravado e uma pasta FICTICIA "ZZ SONDA AUTOMATICA <ts>" no Drive,
 *      que e enviada para a lixeira no fim (bloco finally).
 *   4. Se ela testar o PIN errado de um paciente real, LIMPA o contador de bloqueio
 *      desse paciente no fim — a enfermeira de verdade nunca fica travada.
 *
 * Decisoes em docs/dr-replit/PROPOSTAS/2026-06-12_sonda-integracao-app-enfermagem.md
 *
 * Acionamento: botao "RODAR SONDA (app enfermagem ponta a ponta)" no Panel,
 * ou rodar runSondaEnfermagem() direto no editor (precisa estar autorizado).
 */

/** true se a carga de um paciente tem pelo menos uma sessao parametrizada. */
function sondaTemSessao_(carga) {
  if (!carga || !carga.substancias) return false;
  for (var i = 0; i < carga.substancias.length; i++) {
    if (carga.substancias[i].sessoes && carga.substancias[i].sessoes.length) return true;
  }
  return false;
}

/**
 * Roda a bateria completa de integracao do app da enfermagem.
 * Retorna JSON string { log, links } no formato que o Console do Panel entende.
 */
function runSondaEnfermagem() {
  var L = [];
  var okN = 0, falhaN = 0;
  function diz(s) { L.push(s); }
  function asser(nome, cond) {
    if (cond) { okN++; diz('[OK] ' + nome); }
    else { falhaN++; diz('[FALHA] ' + nome); }
  }

  diz('=== SONDA APP ENFERMAGEM — ' + new Date().toISOString() + ' ===');
  diz('Somente leitura na planilha. Sem PDF/email a paciente real. Pasta ficticia auto-limpa.');

  // ── PORTAO — a sonda so roda para quem o app autoriza (fail-closed). ──────────
  try {
    exigirAcessoApp_();
    var quem = '';
    try { quem = Session.getActiveUser().getEmail() || '(sem email)'; } catch (e) { quem = '(sem email)'; }
    diz('[OK] acesso autorizado para ' + quem);
    okN++;
  } catch (eAcc) {
    return JSON.stringify({ error: 'Sonda abortada: ' + (eAcc && eAcc.message || eAcc) });
  }

  // ── BATERIA A — listar pacientes e achar um com sessao real ───────────────────
  var nomes = [];
  try { nomes = appEnfListarPacientes() || []; }
  catch (eList) { falhaN++; diz('[FALHA] listar pacientes: ' + (eList && eList.message || eList)); }
  asser('lista de pacientes nao vazia (' + nomes.length + ')', nomes.length > 0);

  var alvo = null, carga = null;
  for (var i = 0; i < nomes.length && i < 50; i++) {
    var c;
    try { c = appEnfCarregarPaciente(nomes[i]); } catch (eC) { c = null; }
    if (c && c.ok && sondaTemSessao_(c)) { alvo = nomes[i]; carga = c; break; }
  }

  if (!alvo) {
    diz('[AVISO] nenhum dos 50 primeiros pacientes tem sessao parametrizada — baterias B-D puladas.');
  } else {
    diz('[INFO] paciente-alvo (real, SOMENTE LEITURA): ' + alvo);

    // ── BATERIA A2 — seguranca: carga nunca vaza segredo ────────────────────────
    asser('carga NAO vaza cpf', typeof carga.cpf === 'undefined');
    asser('carga NAO vaza pin/hash', typeof carga.pin === 'undefined' && typeof carga.pinHash === 'undefined');
    asser('carga traz substancias', !!(carga.substancias && carga.substancias.length > 0));

    var sub = carga.substancias[0];
    var primeiraSessao = sub.sessoes[0].label;

    // ── BATERIA A3 — chavesValidas casa com a tela ──────────────────────────────
    var chaves = appEnfChavesValidas_(alvo);
    asser('chave real pertence ao protocolo', !!chaves[chaveAplicacao_(sub.substancia, primeiraSessao)]);
    asser('chave fantasma NAO pertence', !chaves[chaveAplicacao_('SUBSTANCIA FANTASMA XYZ', '9/9')]);

    // ── BATERIA B — PIN derivado bate (zero escrita) ────────────────────────────
    var ident = buscarPacienteCadastro_(alvo);
    if (ident.found && String(ident.nascAno) !== '') {
      var partes = removerAcentosFap_(alvo).trim().split(/\s+/).filter(Boolean);
      var sobre = partes.length ? partes[partes.length - 1] : '';
      var pinCerto = derivarPin_(sobre, ident.nascDia, ident.nascMes, ident.nascAno);
      var h = hashPin_(pinCerto);
      asser('PIN correto confere', verificarPin_(pinCerto, h) === true);
      asser('PIN errado NAO confere', verificarPin_(pinCerto + 'x', h) === false);
    } else {
      diz('[AVISO] paciente-alvo sem nascimento no CADASTRO — bateria B (PIN) pulada.');
    }

    // ── BATERIA C — endpoint rejeita substancia fora do protocolo (antes do PIN) ─
    var rejFalsa = appEnfRegistrarAplicacao({
      nome: alvo, substancia: 'SUBSTANCIA FANTASMA XYZ', sessao: '9/9',
      enfermeiraNome: 'SONDA', pinDigitado: '0000'
    });
    asser('endpoint rejeita substancia fora do protocolo', !!(rejFalsa && rejFalsa.ok === false));

    // ── BATERIA D — endpoint nega PIN errado (e DEPOIS limpa o bloqueio do real) ─
    var chaveBloqueioReal = 'pinfail:' + removerAcentosFap_(alvo).trim().toUpperCase().replace(/\s+/g, ' ');
    try {
      var pinErr = appEnfRegistrarAplicacao({
        nome: alvo, substancia: sub.substancia, sessao: primeiraSessao,
        enfermeiraNome: 'SONDA', pinDigitado: 'PIN_ERRADO_SONDA'
      });
      asser('endpoint nega PIN errado', !!(pinErr && pinErr.ok === false && pinErr.pinInvalido === true));
      asser('endpoint informa tentativas restantes', typeof pinErr.tentativasRestantes === 'number');
    } finally {
      try { CacheService.getScriptCache().remove(chaveBloqueioReal); } catch (eRm) {}
      diz('[INFO] contador de bloqueio do paciente-alvo limpo (enfermeira real nao trava).');
    }
  }

  // ── BATERIA E — round-trip de Drive ISOLADO (paciente ficticio, auto-limpeza) ──
  var fakeNome = 'ZZ SONDA AUTOMATICA ' + Date.now();
  var fakeCpf = '00000000000';
  var pastaId = null;
  try {
    var pinFake = 'teste';
    var hFake = hashPin_(pinFake);
    var r1 = registrarAplicacao_({
      nome: fakeNome, cpf: fakeCpf, substancia: 'AGUA DESTILADA SONDA', sessao: '1/1',
      enfermeiraNome: 'SONDA', pinDigitado: pinFake, pinHash: hFake, observacao: 'teste automatico'
    });
    asser('Drive: 1a aplicacao gravada', !!(r1 && r1.ok === true));
    pastaId = r1 && r1.pastaId;
    var r2 = registrarAplicacao_({
      nome: fakeNome, cpf: fakeCpf, substancia: 'AGUA DESTILADA SONDA', sessao: '1/1',
      enfermeiraNome: 'SONDA', pinDigitado: pinFake, pinHash: hFake
    });
    asser('Drive: 2a aplicacao = idempotente (jaAplicada)', !!(r2 && r2.ok === false && r2.jaAplicada === true));
    var r3 = registrarAplicacao_({
      nome: fakeNome, cpf: fakeCpf, substancia: 'AGUA DESTILADA SONDA', sessao: '2/2',
      enfermeiraNome: 'SONDA', pinDigitado: 'errado', pinHash: hFake
    });
    asser('Drive: PIN errado NAO grava', !!(r3 && r3.ok === false && r3.pinInvalido === true));
  } catch (eDrive) {
    falhaN++; diz('[FALHA] bateria E (Drive): ' + (eDrive && eDrive.message || eDrive));
  } finally {
    try {
      if (!pastaId) { var pAch = acharPastaClienteSeExistir_(fakeNome, fakeCpf); pastaId = pAch ? pAch.getId() : null; }
      if (pastaId) { DriveApp.getFolderById(pastaId).setTrashed(true); diz('[INFO] pasta ficticia da sonda enviada para a lixeira.'); }
    } catch (eDel) {
      diz('[AVISO] limpeza da pasta ficticia falhou (' + (eDel && eDel.message || eDel) + ') — apagar manualmente: ' + fakeNome + '.');
    }
  }

  // ── BATERIA F — mecanica de bloqueio + cache (sintetica, nao toca paciente) ───
  var keySint = 'pinfail:ZZ_SONDA_SINTETICA_' + Date.now();
  var cache = CacheService.getScriptCache();
  try {
    asser('bloqueio: 0 tentativas nao bloqueia',
      avaliarBloqueioPin_(0, FAP_CONFIG.pinMaxTentativas).bloqueado === false);
    asser('bloqueio: teto bloqueia',
      avaliarBloqueioPin_(FAP_CONFIG.pinMaxTentativas, FAP_CONFIG.pinMaxTentativas).bloqueado === true);
    cache.put(keySint, '3', 30);
    asser('cache round-trip', Number(cache.get(keySint)) === 3);
  } finally {
    try { cache.remove(keySint); } catch (eK) {}
  }

  diz('');
  diz('=== RESULTADO SONDA: ' + okN + ' OK / ' + falhaN + ' FALHA ===');
  return JSON.stringify({ log: L.join('\n'), links: [] });
}
