/**
 * ═══════════════════════════════════════════════════════════════
 * AGENDAMENTO GOOGLE AGENDA — porte PAWARDS MedCore -> Apps Script
 * Origem  : artifacts/api-server/src/lib/google-calendar.ts (TypeScript)
 * Destino : Google Apps Script (runtime V8) — colar no seu Code.gs
 * Data    : 11/06/2026
 * ═══════════════════════════════════════════════════════════════
 *
 * O QUE FAZ
 * - Cria um evento no Google Agenda com descricao rica:
 *   nome do paciente, CPF, procedimentos com 👍/👎 ("maozinhas pra
 *   cima/baixo"), duracao por protocolo, status da sessao, lista de
 *   substancias com quadradinhos de status (🟩🟨🟦⬜), legenda, endereco
 *   com link de Maps/Waze, e COR do evento (amarelo/verde/etc).
 *
 * DIFERENCA CHAVE vs a versao TypeScript do servidor:
 * - No servidor a autenticacao usa googleapis + token (getAccessToken).
 *   AQUI VOCE JOGA ISSO FORA: o CalendarApp do Apps Script ja vem
 *   autenticado com a conta do dono do script. Nao precisa de token.
 *
 * COMO USAR: ver exemplo em exemploCriarAgendamentoRAS() no fim.
 */

// ── Duracao padrao por via/tipo (minutos) ──────────────────────
var TEMPO_POR_TIPO = { im: 15, iv: 30, ev: 30, implant: 60, consulta: 60 };

// ── Mapa de cor do evento por codigo semantico ─────────────────
// Os valores "1".."11" sao os mesmos do colorId da API e tambem os
// valores do enum CalendarApp.EventColor, entao event.setColor() aceita.
//   "1"=PALE_BLUE  "2"=PALE_GREEN  "3"=MAUVE  "7"=CYAN
//   "8"=GRAY      "10"=GREEN      "11"=RED
var COR_POR_CODIGO = {
  CPRE: '1',   // Consulta presencial   (azul claro)
  CONL: '3',   // Consulta online       (lilas)
  CAVL: '7',   // Retorno/avaliacao     (ciano)
  SESS: '10',  // Sessao aplicacao      (verde)
  INFU: '2',   // Infusao longa         (verde claro)
  PROC: '11',  // Procedimento/implante (vermelho)
  EXAM: '8',   // Exame/coleta          (cinza)
};

var CODIGOS_SEMANTICOS = {
  CONSULTA_30_PRESENCIAL:            { codigo: 'CPRE' },
  CONSULTA_60_PRESENCIAL:            { codigo: 'CPRE' },
  CONSULTA_30_ONLINE:               { codigo: 'CONL' },
  CONSULTA_30_TELEMEDICINA:         { codigo: 'CONL' },
  RETORNO_15_PRESENCIAL:            { codigo: 'CAVL' },
  RETORNO_15_TELEMEDICINA:          { codigo: 'CAVL' },
  AVALIACAO_ENF_30_PRESENCIAL:      { codigo: 'CAVL' },
  AVALIACAO_ENFERMAGEM_20_PRESENCIAL: { codigo: 'CAVL' },
  IMPLANTE_120_PRESENCIAL:          { codigo: 'PROC' },
  IM_15_PRESENCIAL:                 { codigo: 'SESS' },
  APLICACAO_IM_15_PRESENCIAL:       { codigo: 'SESS' },
  INFUSAO_CURTA_60_PRESENCIAL:      { codigo: 'SESS' },
  INFUSAO_MEDIA_120_PRESENCIAL:     { codigo: 'SESS' },
  INFUSAO_LONGA_180_PRESENCIAL:     { codigo: 'INFU' },
  INFUSAO_EXTRA_240_PRESENCIAL:     { codigo: 'INFU' },
  EXAME_30_PRESENCIAL:              { codigo: 'EXAM' },
};

var STATUS_ORDER = { disp: 0, prox: 1, aplicada: 2, nao_aplicada: 3 };

// ── Quadradinho de status por substancia ───────────────────────
function statusSquare_(status) {
  switch (status) {
    case 'disp':         return { square: '🟩', tag: 'DISP' };
    case 'aplicada':     return { square: '🟦', tag: 'APLI' };
    case 'prox':         return { square: '🟨', tag: 'PROX' };
    case 'nao_aplicada': return { square: '⬜', tag: 'INDI' };
    default:             return { square: '⬜', tag: String(status).toUpperCase().slice(0, 4) };
  }
}

function formatCpf_(cpf) {
  if (!cpf) return '';
  var d = String(cpf).replace(/\D/g, '');
  if (d.length === 11) return d.slice(0,3) + '.' + d.slice(3,6) + '.' + d.slice(6,9) + '-' + d.slice(9);
  return cpf;
}

function capitalize_(t) {
  if (!t) return '';
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}
function titleCase_(t) {
  return String(t).split(' ').map(function (w) { return capitalize_(w); }).join(' ');
}
function formatDose_(dose) {
  if (!dose) return '';
  var d = String(dose)
    .replace(/\b\d*\s*(amp|ampola|ampolas|frascos?|frasco)\b/gi, '')
    .replace(/\b\d+[.,]?\d*\s*ml\b/gi, '')
    .replace(/\bml\b/gi, '')
    .trim();
  return d || '';
}
function cleanSubstanceName_(nome) {
  return String(nome)
    .replace(/\s*(ENDOVENOSA|INTRAMUSCULAR|INTRAVENOSA|INTRAVENÓSA|SUBCUTANEA|SUBCUTÂNEA|SUBLINGUAL|ORAL)\s*/gi, ' ')
    .replace(/\s*(EV|IV|IM|SC|SL|VO)\s*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function determineSessionStatus_(subs) {
  if (!subs.length) return { label: 'A realizar', square: '🟨' };
  var hasAplicada = subs.some(function (s) { return s.status === 'aplicada'; });
  var allDone = subs.every(function (s) { return s.status === 'aplicada' || s.status === 'nao_aplicada'; });
  var hasNao = subs.some(function (s) { return s.status === 'nao_aplicada'; });
  if (allDone && hasAplicada && !hasNao) return { label: 'Realizado com Sucesso', square: '🟦' };
  if (allDone && hasNao && !hasAplicada) return { label: 'Não Realizado', square: '⬜' };
  if (allDone) return { label: 'Realizado com Sucesso', square: '🟦' };
  return { label: 'Aplicação Programada', square: '🟨' };
}

function sortSubstancias_(subs) {
  return subs.slice().sort(function (a, b) {
    var aS = a.nestaSessao !== false ? 0 : 1;
    var bS = b.nestaSessao !== false ? 0 : 1;
    if (aS !== bS) return aS - bS;
    return (STATUS_ORDER[a.status] == null ? 4 : STATUS_ORDER[a.status]) -
           (STATUS_ORDER[b.status] == null ? 4 : STATUS_ORDER[b.status]);
  });
}

function resolveCodigoSemantico_(tipoProcedimento, substancias) {
  var match = CODIGOS_SEMANTICOS[tipoProcedimento];
  if (match) return match.codigo;
  var tipo = String(tipoProcedimento).toUpperCase();
  if (tipo.indexOf('ONLINE') !== -1 || tipo.indexOf('TELEMEDICINA') !== -1) return 'CONL';
  if (tipo.indexOf('RETORNO') !== -1 || tipo.indexOf('AVALIACAO') !== -1) return 'CAVL';
  if (tipo.indexOf('IMPLANTE') !== -1) return 'PROC';
  if (tipo.indexOf('INFUSAO_LONGA') !== -1 || tipo.indexOf('INFUSAO_EXTRA') !== -1) return 'INFU';
  if (tipo.indexOf('INFUSAO') !== -1 || tipo.indexOf('IM_') !== -1 || tipo.indexOf('APLICACAO') !== -1) return 'SESS';
  if (tipo.indexOf('EXAME') !== -1 || tipo.indexOf('COLETA') !== -1) return 'EXAM';
  if (tipo.indexOf('CONSULTA') !== -1) return 'CPRE';
  if (substancias && substancias.length) {
    var vias = substancias.map(function (s) { return (s.via || '').toLowerCase(); });
    if (vias.indexOf('implant') !== -1) return 'PROC';
    if (vias.some(function (v) { return v === 'iv' || v === 'ev'; })) return 'SESS';
    if (vias.indexOf('im') !== -1) return 'SESS';
  }
  return 'CPRE';
}

// ── TITULO do evento: "NOME CPF [CODIGO]" ──────────────────────
function buildEventSummary(opts) {
  var nome = String(opts.pacienteNome).toUpperCase();
  var cpf = opts.pacienteCpf ? ' CPF ' + formatCpf_(opts.pacienteCpf) : '';
  var codigo = resolveCodigoSemantico_(opts.tipoProcedimento, opts.substancias);
  return nome + cpf + ' [' + codigo + ']';
}

// ── COR do evento (string aceita por event.setColor) ───────────
function getEventColor(tipoProcedimento, substancias) {
  var codigo = resolveCodigoSemantico_(tipoProcedimento, substancias);
  return COR_POR_CODIGO[codigo] || '1';
}

// ── DESCRICAO rica do evento ───────────────────────────────────
// opts: { pacienteNome, pacienteCpf, numeroMarcacao, totalMarcacoes,
//         unidadeNome, substancias[], tipoProcedimento, duracaoMin,
//         endereco{rua,bairro,cep,cidade,estado} }
// substancia: { nome, via, dose, status, nestaSessao }
//   via    : 'im' | 'ev' | 'iv' | 'sc' | 'implant' | 'vo' ...
//   status : 'disp' | 'aplicada' | 'prox' | 'nao_aplicada'
function buildEventDescription(opts) {
  var pacienteNome = opts.pacienteNome;
  var pacienteCpf = opts.pacienteCpf;
  var numeroMarcacao = opts.numeroMarcacao;
  var totalMarcacoes = opts.totalMarcacoes;
  var unidadeNome = opts.unidadeNome;
  var substancias = opts.substancias || [];
  var tipoProcedimento = opts.tipoProcedimento || '';
  var duracaoMin = opts.duracaoMin || 0;
  var endereco = opts.endereco;

  var viasArr = substancias.filter(function (s) { return s.nestaSessao !== false; })
                           .map(function (s) { return (s.via || '').toLowerCase(); });
  var vias = {};
  viasArr.forEach(function (v) { vias[v] = true; });
  var temIM = !!vias['im'];
  var temEV = !!vias['iv'] || !!vias['ev'];
  var temImplante = !!vias['implant'];
  var temConsulta = tipoProcedimento.indexOf('CONSULTA') !== -1;
  var temRetorno = tipoProcedimento.indexOf('RETORNO') !== -1 || tipoProcedimento.indexOf('AVALIACAO') !== -1;
  var temEspecifico = tipoProcedimento.indexOf('EXAME') !== -1 || tipoProcedimento.indexOf('COLETA') !== -1 ||
    (!temConsulta && !temRetorno && !temEV && !temIM && !temImplante && substancias.length === 0);

  var lines = [];
  lines.push('<b>Developed by: Pawards MedCore</b>');
  lines.push('');
  lines.push('<b>' + titleCase_(pacienteNome) + '</b>');
  if (pacienteCpf) lines.push('CPF.: ' + formatCpf_(pacienteCpf));
  if (numeroMarcacao) lines.push('Agendamento Número: ' + numeroMarcacao + (totalMarcacoes ? '/' + totalMarcacoes : ''));
  if (unidadeNome) lines.push('Unidade: ' + titleCase_(unidadeNome));
  lines.push('');
  lines.push('<b>Procedimentos:</b>');

  var procs = [
    { ativo: temIM, nome: 'Aplicação Intramuscular', min: '15min', ordem: 0 },
    { ativo: temEV, nome: 'Aplicação Endovenosa', min: '30min', ordem: 1 },
    { ativo: temConsulta, nome: 'Consulta', min: '60min', ordem: 2 },
    { ativo: temRetorno, nome: 'Retorno ou Avaliação', min: '30min', ordem: 3 },
    { ativo: temEspecifico, nome: 'Procedimento Específico', min: '60min', ordem: 4 },
    { ativo: temImplante, nome: 'Implante', min: '60min', ordem: 5 },
  ];
  procs.sort(function (a, b) {
    var diff = (b.ativo ? 1 : 0) - (a.ativo ? 1 : 0);
    if (diff !== 0) return diff;
    return a.ordem - b.ordem;
  });
  var PAD_LEN = 30;
  procs.forEach(function (p) {
    var thumb = p.ativo ? '👍' : '👎';            // <- "maozinha" pra cima/baixo
    var padded = (p.nome + Array(PAD_LEN + 1).join(' ')).slice(0, PAD_LEN);
    lines.push(thumb + ' ' + padded + '[' + p.min + ']');
  });
  lines.push('<b>Duração Total:</b> ' + duracaoMin + 'min');
  lines.push('');

  var sessionSubs = substancias.filter(function (s) { return s.nestaSessao !== false; });
  var sessionStatus = determineSessionStatus_(sessionSubs);
  lines.push('<b>Status:</b>');
  lines.push(sessionStatus.square + ' ' + sessionStatus.label);
  lines.push('');

  var sorted = sortSubstancias_(substancias);
  var destaSessao = sorted.filter(function (s) { return s.nestaSessao !== false; });
  var foraDaSessao = sorted.filter(function (s) { return s.nestaSessao === false; });

  lines.push('<b>Substâncias Protocolo:</b>');
  var idx = 0;
  destaSessao.forEach(function (s) {
    idx++;
    var st = statusSquare_(s.status);
    var nome = titleCase_(cleanSubstanceName_(s.nome));
    var dose = formatDose_(s.dose);
    lines.push(st.square + '  [' + idx + '/' + substancias.length + ']  ' + nome + ' ' + dose + '  [' + st.tag + ']');
  });
  foraDaSessao.forEach(function (s) {
    idx++;
    var st = statusSquare_(s.status);
    var nome = titleCase_(cleanSubstanceName_(s.nome));
    var dose = formatDose_(s.dose);
    lines.push(st.square + '  [' + idx + '/' + substancias.length + ']  ' + nome + ' ' + dose + '  [' + st.tag + ']');
  });
  lines.push('');

  var LEG_PAD = 28;
  function padLeg_(t) { return (t + Array(LEG_PAD + 1).join(' ')).slice(0, LEG_PAD); }
  lines.push('<b>Legenda:</b>');
  lines.push('🟩  ' + padLeg_('Disponível para Aplicação') + '[DISP]');
  lines.push('🟨  ' + padLeg_('Disponível Próxima Sessão') + '[PROX]');
  lines.push('🟦  ' + padLeg_('Substância Aplicada') + '[APLI]');
  lines.push('⬜  ' + padLeg_('Substância Indisponível') + '[INDI]');
  lines.push('');

  if (endereco && endereco.rua) {
    lines.push('<b>📍 Endereço:</b>');
    lines.push(titleCase_(endereco.rua));
    if (endereco.bairro) lines.push(titleCase_(endereco.bairro));
    if (endereco.cep) lines.push('CEP ' + endereco.cep);
    if (endereco.cidade && endereco.estado) lines.push(titleCase_(endereco.cidade) + ' - ' + endereco.estado.toUpperCase());
    lines.push('');
    var completo = [endereco.rua, endereco.bairro, endereco.cidade, endereco.estado, endereco.cep]
      .filter(function (x) { return !!x; }).join(', ');
    var enc = encodeURIComponent(completo);
    lines.push('<b>Navegação:</b>');
    lines.push('Google Maps: https://www.google.com/maps/search/?api=1&query=' + enc);
    lines.push('');
    lines.push('Waze: https://waze.com/ul?q=' + enc + '&navigate=yes');
  }

  return lines.join('\n');
}

// ── Roteamento do calendario (medico x enfermagem) ─────────────
function determineCalendarRouting(vias) {
  var v = (vias || []).map(function (x) { return (x || '').toLowerCase(); });
  if (v.indexOf('implant') !== -1 || v.indexOf('consulta') !== -1) return 'medico';
  return 'enfermagem';
}

// ── Helper: monta Date a partir de 'YYYY-MM-DD' e 'HH:MM' ───────
function parseDataHora_(dataAgendada, hora) {
  var d = String(dataAgendada).split('-');
  var h = String(hora).split(':');
  return new Date(Number(d[0]), Number(d[1]) - 1, Number(d[2]), Number(h[0]), Number(h[1]), 0);
}

/**
 * FUNCAO PRINCIPAL — cria o evento no Google Agenda.
 * dados: {
 *   calendarId,            // id do calendario alvo (ou omite p/ o padrao)
 *   pacienteNome, pacienteCpf,
 *   tipoProcedimento,      // ex: 'APLICACAO_IM_15_PRESENCIAL'
 *   duracaoMin,            // ex: 15
 *   dataAgendada,          // 'YYYY-MM-DD'
 *   horaAgendada, horaFim, // 'HH:MM'
 *   numeroMarcacao, totalMarcacoes, unidadeNome,
 *   substancias: [{ nome, via, dose, status, nestaSessao }],
 *   endereco: { rua, bairro, cep, cidade, estado }
 * }
 * Retorna o id do evento criado.
 */
function criarAgendamentoRAS(dados) {
  var cal = dados.calendarId
    ? CalendarApp.getCalendarById(dados.calendarId)
    : CalendarApp.getDefaultCalendar();
  if (!cal) throw new Error('Calendario nao encontrado: ' + dados.calendarId);

  var inicio = parseDataHora_(dados.dataAgendada, dados.horaAgendada);
  var fim = parseDataHora_(dados.dataAgendada, dados.horaFim);

  var titulo = buildEventSummary({
    pacienteNome: dados.pacienteNome,
    pacienteCpf: dados.pacienteCpf,
    tipoProcedimento: dados.tipoProcedimento,
    substancias: dados.substancias,
  });

  var descricao = buildEventDescription({
    pacienteNome: dados.pacienteNome,
    pacienteCpf: dados.pacienteCpf,
    numeroMarcacao: dados.numeroMarcacao,
    totalMarcacoes: dados.totalMarcacoes,
    unidadeNome: dados.unidadeNome,
    substancias: dados.substancias,
    tipoProcedimento: dados.tipoProcedimento,
    duracaoMin: dados.duracaoMin,
    endereco: dados.endereco,
  });

  var evento = cal.createEvent(titulo, inicio, fim, { description: descricao });
  evento.setColor(getEventColor(dados.tipoProcedimento, dados.substancias));
  return evento.getId();
}

// ── EXEMPLO DE USO (rode esta funcao no editor p/ testar) ──────
function exemploCriarAgendamentoRAS() {
  var id = criarAgendamentoRAS({
    pacienteNome: 'maria silva souza',
    pacienteCpf: '12345678901',
    tipoProcedimento: 'APLICACAO_IM_15_PRESENCIAL',
    duracaoMin: 15,
    dataAgendada: '2026-06-15',
    horaAgendada: '09:00',
    horaFim: '09:15',
    numeroMarcacao: 3,
    totalMarcacoes: 6,
    unidadeNome: 'instituto padua',
    substancias: [
      { nome: 'VITAMINA D3 INTRAMUSCULAR', via: 'im', dose: '600.000 UI', status: 'disp', nestaSessao: true },
      { nome: 'VITAMINA B12', via: 'im', dose: '2500MCG', status: 'aplicada', nestaSessao: true },
      { nome: 'GLUTATIONA', via: 'ev', dose: '600MG', status: 'prox', nestaSessao: false }
    ],
    endereco: { rua: 'Rua das Flores 100', bairro: 'Centro', cep: '01000-000', cidade: 'sao paulo', estado: 'sp' }
  });
  Logger.log('Evento criado: ' + id);
}
