/**
 * AppEnfermagemRasFap.gs — MODULO NOVO (Dr. Replit, 12/06/2026)
 *
 * Onda A do "App da Enfermagem + RAS-FAP + Pastas CLIENTES".
 * Espelha o padrao de validacao de paciente JA validado no Pawards principal
 * (pacientes.senhaValidacao com hash), agora no Apps Script paralelo.
 *
 * Decisoes em docs/dr-replit/PROPOSTAS/2026-06-12_arquitetura-app-enfermagem-ras-fap-pastas-clientes.md
 *
 * REGRA: nada de coluna/tabela nova na planilha. A fonte da verdade dos
 * aplicados e o arquivo `aplicacoes.json` dentro da subpasta do cliente,
 * co-localizado com os PDFs RAS-FAP versionados (n/sessao).
 *
 * As funcoes "puras" (sem API do Apps Script) sao cobertas por teste semantico
 * em tests/test_app_enfermagem.mjs (rodar com `node`).
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const FAP_CONFIG = {
  // Raiz reusa a pasta de clientes ja existente (Code.gs) — sem ID novo.
  pastaRaizClientesId: (typeof PASTA_RAS_CLIENTES !== 'undefined') ? PASTA_RAS_CLIENTES : '',
  arquivoEstado: 'aplicacoes.json',
  marcaCheck: '\u2713',                 // "vezinho" pedido pelo CEO (caractere, nao emoji)
  larguraRubricaPaciente: 32,           // capacidade ~ do campo CIENCIA/RUBRICA PACIENTE
  larguraRubricaEnfermeira: 22,         // capacidade ~ do campo RUBRICA ENF.
  remetenteNome: 'PAWARDS - Instituto Padua',
  pinMaxTentativas: 5,                  // teto de tentativas de PIN por paciente (anti-forca-bruta)
  pinJanelaSegundos: 900                // janela do bloqueio (15 min) via CacheService
};

// ─────────────────────────────────────────────────────────────────────────────
// FUNCOES PURAS (testaveis em Node) — nomes semanticos completos
// ─────────────────────────────────────────────────────────────────────────────

/** Remove acentos preservando as letras base. */
function removerAcentosFap_(txt) {
  return String(txt == null ? '' : txt).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Apenas digitos de um texto (CPF, telefone). */
function somenteDigitosFap_(txt) {
  return String(txt == null ? '' : txt).replace(/\D/g, '');
}

/**
 * Iniciais de TODOS os nomes do meio (tudo menos o ultimo sobrenome).
 * "Caio Henrique Souza Padua" -> "C.H.S."
 */
function iniciaisNomesDoMeio_(nomeCompleto) {
  var partes = removerAcentosFap_(nomeCompleto).trim().split(/\s+/).filter(Boolean);
  if (partes.length <= 1) return '';
  var meio = partes.slice(0, partes.length - 1);
  return meio.map(function (p) { return p.charAt(0).toUpperCase(); }).join('.') + '.';
}

/**
 * Rubrica do paciente no formato `Sobrenome, I.N.I.`.
 * "Caio Henrique Souza Padua" -> "Padua, C.H.S."
 * Sobrenome longo: encurta SO o sobrenome ate caber deixando folga de 2 chars.
 */
function rubricaPaciente_(nomeCompleto, maxChars) {
  var max = Number(maxChars) || FAP_CONFIG.larguraRubricaPaciente;
  var partes = removerAcentosFap_(nomeCompleto).trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '';
  if (partes.length === 1) {
    var unico = partes[0];
    return (unico.length <= max) ? unico : unico.slice(0, Math.max(1, max - 2));
  }
  var sobrenome = partes[partes.length - 1];
  var fixo = ', ' + iniciaisNomesDoMeio_(nomeCompleto);   // ", C.H.S."
  var base = sobrenome + fixo;
  if (base.length <= max) return base;
  var permitidoSobrenome = (max - 2) - fixo.length;        // folga de 2 caracteres
  if (permitidoSobrenome < 1) permitidoSobrenome = 1;
  return sobrenome.slice(0, permitidoSobrenome) + fixo;
}

/**
 * Nome da enfermeira por extenso, truncado pra caber deixando folga de 2 chars.
 */
function ajustarNomeCelula_(nome, maxChars) {
  var max = Number(maxChars) || FAP_CONFIG.larguraRubricaEnfermeira;
  var limpo = String(nome == null ? '' : nome).trim().replace(/\s+/g, ' ');
  if (limpo.length <= max) return limpo;
  return limpo.slice(0, Math.max(1, max - 2));
}

/**
 * PIN "modo tabajara" derivado de dado do paciente.
 * 4 letras do sobrenome (sem acento, minusculas) + AA (ano 2 digitos) + MM (mes).
 * Padua, 14/11/1978 -> "padu7811".
 * ATENCAO: fraco/adivinhavel; sempre armazenar como hash (hashPin_).
 */
function derivarPin_(sobrenome, dia, mes, ano) {
  var s4 = removerAcentosFap_(sobrenome).toLowerCase().replace(/[^a-z]/g, '').slice(0, 4);
  var yy = String(ano == null ? '' : ano).replace(/\D/g, '');
  yy = yy.slice(-2);
  if (yy.length < 2) yy = ('00' + yy).slice(-2);
  var mm = String(mes == null ? '' : mes).replace(/\D/g, '');
  mm = ('00' + mm).slice(-2);
  return s4 + yy + mm;
}

/** Nome da subpasta do cliente: "Nome CPF-sem-pontos". */
function nomePastaCliente_(nome, cpf) {
  var nomeLimpo = String(nome == null ? '' : nome).trim().replace(/\s+/g, ' ');
  var cpfDigits = somenteDigitosFap_(cpf);
  return cpfDigits ? (nomeLimpo + ' ' + cpfDigits) : nomeLimpo;
}

/**
 * Nome do arquivo RAS-FAP versionado. n<=0 ou total<=0 -> sem sufixo (RAS raiz).
 * ("RAS Katia", 1, 4) -> "RAS Katia (1/4)".
 */
function nomeArquivoRasFap_(base, n, total) {
  var b = String(base == null ? '' : base).trim();
  var nn = Number(n) || 0;
  var tt = Number(total) || 0;
  if (nn <= 0 || tt <= 0) return b;
  return b + ' (' + nn + '/' + tt + ')';
}

/** Chave canonica de uma aplicacao: "SUBSTANCIA|sessao". */
function chaveAplicacao_(substancia, sessao) {
  return removerAcentosFap_(substancia).trim().toUpperCase().replace(/\s+/g, ' ')
    + '|' + String(sessao == null ? '' : sessao).trim();
}

/** Set { 'SUBSTANCIA|sessao': true } a partir do estado lido do Drive. */
function montarSetAplicadas_(estado) {
  var set = {};
  if (estado && estado.aplicacoes) {
    Object.keys(estado.aplicacoes).forEach(function (k) { set[k] = true; });
  }
  return set;
}

/** Cor da substancia na agenda por estado. APLICADA/PROXIMA = cor ativa. */
function corSubstanciaAgenda_(estado) {
  switch (String(estado == null ? '' : estado).toUpperCase()) {
    case 'APLICADA': return { token: 'APLICADA', hex: '#7C7C7C' };
    case 'PROXIMA':  return { token: 'PROXIMA',  hex: '#5B9BD5' };
    default:         return { token: 'FUTURA',   hex: '#D6DCE4' };
  }
}

/**
 * Decide o bloqueio anti-forca-bruta do PIN.
 * tentativas = falhas ja contabilizadas na janela; max = teto permitido.
 * Bloqueia quando as tentativas atingem o teto. Funcao pura (testavel).
 */
function avaliarBloqueioPin_(tentativas, max) {
  var t = Number(tentativas) || 0;
  var m = Number(max) || 0;
  var bloqueado = m > 0 && t >= m;
  return { bloqueado: bloqueado, restantes: Math.max(0, m - t) };
}

/**
 * Decide se um email pode usar o app da enfermagem (fail-closed).
 * Dono do script sempre pode; demais so se estiverem na allowlist (CSV).
 * Sem identidade (email vazio) = NEGA. Funcao pura (testavel).
 */
function emailAutorizadoApp_(emailAtual, emailDono, listaPermitidosCsv) {
  var atual = String(emailAtual || '').trim().toLowerCase();
  if (!atual) return false;
  var dono = String(emailDono || '').trim().toLowerCase();
  if (dono && atual === dono) return true;
  var lista = String(listaPermitidosCsv || '').toLowerCase()
    .split(/[,;\s]+/).map(function (s) { return s.trim(); }).filter(Boolean);
  for (var i = 0; i < lista.length; i++) { if (lista[i] === atual) return true; }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCOES COM API DO APPS SCRIPT (escritas; rodam no editor do CEO)
// ─────────────────────────────────────────────────────────────────────────────

/** Salt do hash do PIN: vive em ScriptProperties (NAO no mirror publico). */
function obterSaltPin_() {
  var props = PropertiesService.getScriptProperties();
  var salt = props.getProperty('PIN_SALT');
  if (!salt) {
    salt = Utilities.getUuid();
    props.setProperty('PIN_SALT', salt);
  }
  return salt;
}

/** Hash SHA-256 hex do PIN + salt. */
function hashPin_(pin) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(pin) + '::' + obterSaltPin_(),
    Utilities.Charset.UTF_8
  );
  return bytes.map(function (b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

/** Confere PIN digitado contra hash armazenado. */
function verificarPin_(pinDigitado, hashArmazenado) {
  if (!pinDigitado || !hashArmazenado) return false;
  return hashPin_(pinDigitado) === String(hashArmazenado).trim();
}

/** Acha (ou cria) a subpasta do cliente dentro de CLIENTES. */
function getOrCreatePastaCliente_(nome, cpf) {
  var raiz = DriveApp.getFolderById(FAP_CONFIG.pastaRaizClientesId);
  var nomePasta = nomePastaCliente_(nome, cpf);
  var it = raiz.getFoldersByName(nomePasta);
  return it.hasNext() ? it.next() : raiz.createFolder(nomePasta);
}

/**
 * Acha a subpasta do cliente SEM criar (null se nao existir).
 * Usado nos caminhos de SO LEITURA (carregar/visualizar) pra nunca criar pasta
 * vazia so por abrir um paciente — a pasta nasce no registro/PDF.
 */
function acharPastaClienteSeExistir_(nome, cpf) {
  var raiz = DriveApp.getFolderById(FAP_CONFIG.pastaRaizClientesId);
  var it = raiz.getFoldersByName(nomePastaCliente_(nome, cpf));
  return it.hasNext() ? it.next() : null;
}

/** Le o estado de aplicacoes (aplicacoes.json) da pasta do cliente. */
function lerEstadoAplicacoes_(pastaCliente) {
  var it = pastaCliente.getFilesByName(FAP_CONFIG.arquivoEstado);
  if (!it.hasNext()) return { aplicacoes: {} };
  try {
    var obj = JSON.parse(it.next().getBlob().getDataAsString('UTF-8'));
    if (!obj.aplicacoes) obj.aplicacoes = {};
    return obj;
  } catch (e) {
    return { aplicacoes: {} };
  }
}

/** Grava o estado de aplicacoes (cria ou sobrescreve aplicacoes.json). */
function salvarEstadoAplicacoes_(pastaCliente, estado) {
  var conteudo = JSON.stringify(estado, null, 2);
  var it = pastaCliente.getFilesByName(FAP_CONFIG.arquivoEstado);
  if (it.hasNext()) {
    var f = it.next();
    f.setContent(conteudo);
    return f;
  }
  return pastaCliente.createFile(FAP_CONFIG.arquivoEstado, conteudo, 'application/json');
}

/**
 * Registra UMA aplicacao (uma substancia numa sessao).
 * dados: { nome, cpf, substancia, sessao, enfermeiraNome, pinDigitado, pinHash, observacao }
 * Valida PIN, grava no aplicacoes.json (idempotente por chave), retorna o resultado.
 * A geracao do PDF RAS-FAP + email ficam na Onda C (funcoes dedicadas).
 */
function registrarAplicacao_(dados) {
  if (!verificarPin_(dados.pinDigitado, dados.pinHash)) {
    return { ok: false, pinInvalido: true, erro: 'PIN do paciente nao confere.' };
  }
  var pasta = getOrCreatePastaCliente_(dados.nome, dados.cpf);
  var estado = lerEstadoAplicacoes_(pasta);
  var chave = chaveAplicacao_(dados.substancia, dados.sessao);
  if (estado.aplicacoes[chave]) {
    return { ok: false, jaAplicada: true, erro: 'Esta sessao ja foi registrada como aplicada.' };
  }
  var agora = new Date();
  estado.aplicacoes[chave] = {
    substancia: dados.substancia,
    sessao: dados.sessao,
    dataHoraIso: agora.toISOString(),
    enfermeira: dados.enfermeiraNome,
    rubricaPaciente: rubricaPaciente_(dados.nome),
    rubricaEnfermeira: ajustarNomeCelula_(dados.enfermeiraNome),
    observacao: dados.observacao || ''
  };
  salvarEstadoAplicacoes_(pasta, estado);
  return { ok: true, chave: chave, pastaId: pasta.getId() };
}

/** Le o set de aplicadas direto da pasta do cliente (fonte da verdade). */
function lerSetAplicadasCliente_(nome, cpf) {
  try {
    var pasta = acharPastaClienteSeExistir_(nome, cpf);
    if (!pasta) return {};
    return montarSetAplicadas_(lerEstadoAplicacoes_(pasta));
  } catch (e) {
    return {};
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ONDA B — APP DA ENFERMAGEM (web app doGet + endpoints google.script.run)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Resolve a LINHA do paciente na TABELA GERAL por nome (match normalizado exato).
 * Le SO a coluna do nome de uma vez (nao chama lerPaciente_ por linha) p/ aguentar
 * milhares de fichas (Instituto Padua ~3.872). Retorna -1 se nao achar.
 */
function acharLinhaPacientePorNome_(nome) {
  var ss = getSS_();
  var sheet = ss.getSheetByName(ABA_PRINCIPAL);
  if (!sheet) return -1;
  var mapa = findColsByHeaders_(sheet);
  var colNome = 0;
  for (var key in mapa) { if (key.indexOf('NOME DO PACIENTE') !== -1) { colNome = mapa[key]; break; } }
  if (colNome < 1) return -1;
  var ultima = sheet.getLastRow();
  if (ultima < 3) return -1;
  var valores = sheet.getRange(3, colNome, ultima - 2, 1).getValues();
  var alvo = removerAcentosFap_(nome).trim().toUpperCase().replace(/\s+/g, ' ');
  for (var i = 0; i < valores.length; i++) {
    var atual = removerAcentosFap_(valores[i][0]).trim().toUpperCase().replace(/\s+/g, ' ');
    if (atual && atual === alvo) return i + 3;
  }
  return -1;
}

/**
 * Lista [{ substancia, sessoes:[label,...] }] de UM paciente ja convertido p/ RAS.
 * Reusa montarAgendaParaSubstancias_ (mesma fonte do RAS) p/ as sessoes reais.
 */
function appEnfSessoesDoPaciente_(pacRas) {
  var subst = pacRas.substancias || [];
  var schedule = montarAgendaParaSubstancias_(pacRas, subst);
  return subst.map(function (s) {
    var sessoes = [];
    for (var i = 0; i < schedule.length; i++) {
      var item = schedule[i];
      var label = item && item.sessions ? item.sessions[s.nome] : '';
      if (label) sessoes.push(String(label));
    }
    return { substancia: s.nome, sessoes: sessoes };
  });
}

/**
 * Conjunto { 'SUBSTANCIA|sessao': true } com TODAS as chaves reais do protocolo
 * do paciente (mesma fonte das opcoes mostradas na tela). Usado p/ impedir que o
 * cliente registre uma substancia/sessao que nao pertence ao paciente.
 */
function appEnfChavesValidas_(nome) {
  var set = {};
  var ss = getSS_();
  var sheet = ss.getSheetByName(ABA_PRINCIPAL);
  if (!sheet) return set;
  var linha = acharLinhaPacientePorNome_(nome);
  if (linha < 3) return set;
  var pac = lerPaciente_(sheet, linha);
  if (!pac.nome) return set;
  var pacRas = pacienteParaRAS_(pac);
  appEnfSessoesDoPaciente_(pacRas).forEach(function (g) {
    g.sessoes.forEach(function (label) { set[chaveAplicacao_(g.substancia, label)] = true; });
  });
  return set;
}

/**
 * Portao de acesso em RUNTIME do app da enfermagem (defesa alem do deploy).
 * Allowlist em ScriptProperties 'APP_ENF_EMAILS_PERMITIDOS' (CSV); dono sempre passa.
 * fail-closed: sem identidade ou fora da lista -> lanca erro.
 */
function exigirAcessoApp_() {
  var atual = '';
  var dono = '';
  try { atual = Session.getActiveUser().getEmail() || ''; } catch (e) {}
  try { dono = Session.getEffectiveUser().getEmail() || ''; } catch (e) {}
  var lista = PropertiesService.getScriptProperties().getProperty('APP_ENF_EMAILS_PERMITIDOS') || '';
  if (!emailAutorizadoApp_(atual, dono, lista)) {
    throw new Error('Acesso nao autorizado. Peca ao administrador para liberar seu email no app da enfermagem.');
  }
  return true;
}

/** Ponto de entrada do web app da enfermagem (deploy "Implantar como app da web"). */
function doGet(e) {
  try { exigirAcessoApp_(); } catch (err) {
    return HtmlService.createHtmlOutput(
      '<p style="font-family:monospace;padding:24px">Acesso nao autorizado.</p>')
      .setTitle('PAWARDS - Acesso negado');
  }
  return HtmlService.createHtmlOutputFromFile('AppEnfermagem')
    .setTitle('PAWARDS - Aplicacao de Enfermagem')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Abre o app da enfermagem como sidebar dentro da planilha (atalho do Panel). */
function abrirAppEnfermagem() {
  var html = HtmlService.createHtmlOutputFromFile('AppEnfermagem')
    .setTitle('PAWARDS - Aplicacao de Enfermagem');
  SpreadsheetApp.getUi().showSidebar(html);
}

/** Lista os nomes de pacientes do CADASTRO PACIENTES (coluna A, a partir da linha 3). */
function appEnfListarPacientes() {
  exigirAcessoApp_();
  var ss = getSS_();
  var cad = ss.getSheetByName('CADASTRO PACIENTES');
  if (!cad) return [];
  var ultima = cad.getLastRow();
  if (ultima < 3) return [];
  var col = cad.getRange(3, 1, ultima - 2, 1).getValues();
  var nomes = [];
  for (var i = 0; i < col.length; i++) {
    var nm = String(col[i][0] || '').trim();
    if (nm) nomes.push(nm);
  }
  nomes.sort(function (a, b) { return removerAcentosFap_(a).localeCompare(removerAcentosFap_(b)); });
  return nomes;
}

/**
 * Carrega substancias/sessoes + estado de aplicadas de UM paciente p/ a tela.
 * NUNCA devolve PIN nem hash ao cliente (validacao e 100% server-side no registro).
 */
function appEnfCarregarPaciente(nome) {
  exigirAcessoApp_();
  var ss = getSS_();
  var sheet = ss.getSheetByName(ABA_PRINCIPAL);
  if (!sheet) return { ok: false, erro: 'Aba TABELA GERAL nao encontrada.' };
  var linha = acharLinhaPacientePorNome_(nome);
  if (linha < 3) return { ok: false, erro: 'Paciente nao encontrado na TABELA GERAL: ' + nome };
  var pac = lerPaciente_(sheet, linha);
  if (!pac.nome) return { ok: false, erro: 'Linha sem paciente.' };
  var pacRas = pacienteParaRAS_(pac);
  var grupos = appEnfSessoesDoPaciente_(pacRas);
  var aplicadas = lerSetAplicadasCliente_(pac.nome, pac.cpf);
  var substancias = grupos.map(function (g) {
    return {
      substancia: g.substancia,
      sessoes: g.sessoes.map(function (label) {
        return { label: label, aplicada: !!aplicadas[chaveAplicacao_(g.substancia, label)] };
      })
    };
  });
  return {
    ok: true,
    nome: pac.nome,
    substancias: substancias
  };
}

/**
 * Registra UMA aplicacao a partir da tela da enfermagem.
 * O PIN esperado e DERIVADO no servidor a partir do nascimento (CADASTRO PACIENTES)
 * e comparado por hash — o segredo nunca trafega pro cliente.
 * payload: { nome, cpf, substancia, sessao, enfermeiraNome, pinDigitado, observacao }
 */
function appEnfRegistrarAplicacao(payload) {
  exigirAcessoApp_();
  payload = payload || {};
  if (!payload.nome || !payload.substancia || !payload.sessao) {
    return { ok: false, erro: 'Dados incompletos (nome/substancia/sessao).' };
  }
  if (!payload.enfermeiraNome) return { ok: false, erro: 'Informe o nome da enfermeira responsavel.' };
  if (!payload.pinDigitado) return { ok: false, erro: 'Informe o PIN do paciente.' };

  // ── Bloqueio anti-forca-bruta do PIN (por paciente, janela curta via Cache). ──
  var chaveBloqueio = 'pinfail:' + removerAcentosFap_(payload.nome).trim().toUpperCase().replace(/\s+/g, ' ');
  var cache = CacheService.getScriptCache();
  var tentativas = Number(cache.get(chaveBloqueio) || 0);
  if (avaliarBloqueioPin_(tentativas, FAP_CONFIG.pinMaxTentativas).bloqueado) {
    return { ok: false, bloqueado: true,
      erro: 'Muitas tentativas de PIN para este paciente. Aguarde alguns minutos.' };
  }

  // ── So aceita substancia/sessao que pertence ao protocolo real do paciente. ──
  var chavesValidas = appEnfChavesValidas_(payload.nome);
  if (!chavesValidas[chaveAplicacao_(payload.substancia, payload.sessao)]) {
    return { ok: false, erro: 'Substancia/sessao nao pertence ao protocolo deste paciente.' };
  }

  var ident = buscarPacienteCadastro_(payload.nome);
  var partes = removerAcentosFap_(payload.nome).trim().split(/\s+/).filter(Boolean);
  var sobrenome = partes.length ? partes[partes.length - 1] : '';
  var pinEsperado = derivarPin_(sobrenome, ident.nascDia, ident.nascMes, ident.nascAno);
  var pinHash = hashPin_(pinEsperado);

  var res = registrarAplicacao_({
    nome: payload.nome,
    cpf: ident.cpf,
    substancia: payload.substancia,
    sessao: payload.sessao,
    enfermeiraNome: payload.enfermeiraNome,
    pinDigitado: payload.pinDigitado,
    pinHash: pinHash,
    observacao: payload.observacao || ''
  });

  // ── Falha de PIN conta pro bloqueio; sucesso zera o contador. ──
  if (res.pinInvalido) {
    cache.put(chaveBloqueio, String(tentativas + 1), FAP_CONFIG.pinJanelaSegundos);
    res.tentativasRestantes = avaliarBloqueioPin_(tentativas + 1, FAP_CONFIG.pinMaxTentativas).restantes;
  }
  if (!res.ok) return res;
  cache.remove(chaveBloqueio);

  // ── ONDA C — RAS-FAP (PDF + email) e BEST-EFFORT: nunca derruba o registro. ──
  res.fap = { gerado: false };
  try {
    var fap = gerarRasFapPdf_(payload.nome, ident.cpf);
    res.fap.gerado = true;
    res.fap.url = fap.url;
    res.fap.arquivo = fap.nome;
    try {
      var email = String(ident.email || '').trim();
      res.fap.email = enviarRasFapPorEmail_(email, fap.blob, {
        nome: payload.nome, substancia: payload.substancia, sessao: payload.sessao,
        enfermeira: payload.enfermeiraNome, n: fap.n, total: fap.total
      });
    } catch (eMail) { res.fap.emailErro = String(eMail && eMail.message || eMail); }
  } catch (eFap) { res.fap.erro = String(eFap && eFap.message || eFap); }

  return res;
}

// ═════════════════════════════════════════════════════════════════════════════
// ONDA C — RAS-FAP: PDF versionado na pasta do cliente + email
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Gera o RAS-FAP (layout PREMIUM, ja com os checks das sessoes aplicadas),
 * exporta em PDF, salva na subpasta do cliente com nome versionado (n/total)
 * e devolve { blob, url, nome, n, total }.
 */
function gerarRasFapPdf_(nome, cpf) {
  var ss = getSS_();
  var sheet = ss.getSheetByName(ABA_PRINCIPAL);
  var linha = acharLinhaPacientePorNome_(nome);
  if (linha < 3) throw new Error('Paciente nao encontrado p/ RAS-FAP: ' + nome);
  var pac = lerPaciente_(sheet, linha);

  // contadores p/ versao (n/total): n = aplicadas; total = aplicadas + agendadas restantes
  var pasta = getOrCreatePastaCliente_(pac.nome, cpf || pac.cpf);
  var estado = lerEstadoAplicacoes_(pasta);
  var n = Object.keys(estado.aplicacoes || {}).length;
  var pacRas = pacienteParaRAS_(pac);
  var totalSessoes = 0;
  appEnfSessoesDoPaciente_(pacRas).forEach(function (g) { totalSessoes += g.sessoes.length; });
  var total = Math.max(n, totalSessoes);

  var temp = gerarLayoutRASPremium_(pac, 'RAS_FAP');
  SpreadsheetApp.flush();
  Utilities.sleep(2000);
  var blob = exportSheetAsPDF_(temp.getId());
  var baseNome = dataFormatada_() + ' RAS-FAP ' + pac.nome + ' ' + somenteDigitosFap_(cpf || pac.cpf);
  var nomeArq = nomeArquivoRasFap_(baseNome, n, total) + '.pdf';
  blob.setName(nomeArq);
  try { DriveApp.getFileById(temp.getId()).setTrashed(true); } catch (e) {}

  var arquivo = pasta.createFile(blob);
  return { blob: blob, url: arquivo.getUrl(), nome: nomeArq, n: n, total: total };
}

/**
 * Envia o RAS-FAP por email pro paciente (se houver email) com copia pra clinica.
 * Retorna { enviadoPaciente, enviadoClinica }.
 */
function enviarRasFapPorEmail_(emailPaciente, blob, dados) {
  var assunto = 'RAS-FAP — ' + dados.nome + ' — ' + dados.substancia + ' (' + dados.sessao + ')';
  var corpo =
    'PAWARDS — Registro de Aplicacao (RAS-FAP)\n\n' +
    'Paciente: ' + dados.nome + '\n' +
    'Substancia: ' + dados.substancia + '\n' +
    'Sessao: ' + dados.sessao + '\n' +
    'Enfermeira responsavel: ' + dados.enfermeira + '\n' +
    'Progresso: ' + dados.n + '/' + dados.total + ' sessoes aplicadas\n\n' +
    'Documento anexo gerado automaticamente. Nao responda este email.';
  var resultado = { enviadoPaciente: false, enviadoClinica: false };
  var emailClinica = '';
  try { emailClinica = Session.getActiveUser().getEmail() || ''; } catch (e) {}

  if (emailPaciente) {
    MailApp.sendEmail({ to: emailPaciente, subject: assunto, body: corpo,
      name: FAP_CONFIG.remetenteNome, attachments: [blob] });
    resultado.enviadoPaciente = true;
  }
  if (emailClinica && emailClinica !== emailPaciente) {
    MailApp.sendEmail({ to: emailClinica, subject: '[COPIA CLINICA] ' + assunto, body: corpo,
      name: FAP_CONFIG.remetenteNome, attachments: [blob] });
    resultado.enviadoClinica = true;
  }
  return resultado;
}
