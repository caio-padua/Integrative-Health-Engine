/**
 * ═══════════════════════════════════════════════════════════════
 * AGENDAMENTO MOTOR — TABELA GERAL  ->  Google Agenda
 * Projeto : RAS KAIZEN v8 (Instituto Padua)  |  Data: 11/06/2026
 * Autor   : Dr. Replit
 * ═══════════════════════════════════════════════════════════════
 *
 * O QUE FAZ
 * - Le todos os pacientes da TABELA GERAL (reusa lerTodosPacientes_).
 * - Expande cada substancia (inicio + i x FREQ, por SESS sessoes).
 * - CONSOLIDA pela mesma REGRA OURO do RAS (montarAgendaParaSubstancias_):
 *   o paciente vai a clinica no MAXIMO 1x por semana; tudo da semana
 *   cai na PRIMEIRA aplicacao daquela semana -> 1 evento por semana.
 * - Cria o evento no Google Agenda com a descricao rica do
 *   AgendamentoGoogleCalendar.gs (criarAgendamentoRAS).
 * - Roteia a agenda por classe (classificarItemAgenda_):
 *   CONSULTA/RETORNO/implante -> AGENDA MEDICO ; injetaveis -> AGENDA
 *   ENFERMAGEM. CONSULTA e RETORNO viram eventos PROPRIOS (nunca caem
 *   no mesmo evento dos injetaveis), mesmo quando na mesma semana.
 * - ANTI-COLISAO: acha o proximo horario livre na agenda alvo,
 *   comecando 09:00, dentro das janelas seg-sex 08-12 e 14-18.
 * - IDEMPOTENTE: grava HASH do protocolo + IDs dos eventos +
 *   data de lancamento em 3 colunas de controle na propria TABELA
 *   GERAL. Rodar de novo NAO duplica; so mexe em quem mudou.
 *
 * DEPENDE de funcoes que ja existem no projeto:
 *   lerTodosPacientes_, lerPaciente_, pacienteParaRAS_,
 *   montarAgendaParaSubstancias_, findColByHeader_, getSS_,
 *   getLastDataRow_, normalizeHeader_, makeDate_, ymd_,
 *   buscarPacienteCadastro_, ABA_PRINCIPAL, CATALOGO_SUBSTANCIAS,
 *   e do AgendamentoGoogleCalendar.gs: criarAgendamentoRAS,
 *   criarAgendamentoRASComConvite, determineCalendarRouting,
 *   TEMPO_POR_TIPO.
 */

// ── PARAMETROS (ajuste aqui sem mexer no resto) ────────────────
var CONFIG_AGENDA = {
  horaInicioPadrao: 9,        // primeiro horario tentado (09:00)
  minutoInicioPadrao: 0,
  janelaManhaIni: 8,  janelaManhaFim: 12,   // 08:00 - 12:00
  janelaTardeIni: 14, janelaTardeFim: 18,   // 14:00 - 18:00
  atendeSabado: false,        // true = aceita sabado; false = sabado vira segunda
  passoSlotMin: 5,            // granularidade da busca de horario livre
  convidarPaciente: false,    // true = convida o paciente por e-mail (entra na agenda dele)
  unidadeNome: 'INSTITUTO PADUA',
  // Nomes EXATOS das agendas no Google Agenda da conta clinica.padua.agenda@gmail.com.
  // Se nao bater, o motor avisa no log e usa a agenda padrao da conta.
  calendarios: {
    enfermagem: 'AGENDA ENFERMAGEM - LOCAL',
    medico:     'AGENDA MEDICO - CAIO PADUA - LOCAL',
    geral:      'AGENDA GERAL'
  },
  // Endereco da unidade p/ Maps/Waze na descricao. Preencha p/ ativar.
  // Ex: { rua:'Rua X 100', bairro:'Centro', cep:'01000-000', cidade:'Sao Paulo', estado:'SP' }
  endereco: null
};

// Colunas de controle (criadas no fim da TABELA GERAL se faltarem)
var COL_AGENDA_HASH    = 'AGENDA HASH';
var COL_AGENDA_EVENTOS = 'AGENDA EVENTOS';
var COL_AGENDA_LANCADO = 'AGENDA LANCADO EM';
var COL_AGENDA_STATUS  = 'AGENDA STATUS'; // COMPLETO | PARCIAL

// ── Helpers puros ──────────────────────────────────────────────
function pad2_(n) { n = Number(n); return n < 10 ? ('0' + n) : ('' + n); }

function parseEventIds_(val) {
  if (!val) return [];
  try { var a = JSON.parse(val); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}

// Via a partir do nome (os nomes da TABELA carregam o sufixo da via).
function inferirViaPorNome_(nome) {
  var n = String(nome).toUpperCase();
  if (/IMPLANT/.test(n)) return 'implant';
  if (/INTRAMUSCULAR|\bIM\b/.test(n)) return 'im';
  if (/ENDOVEN|INTRAVEN|\bEV\b|\bIV\b/.test(n)) return 'ev';
  if (/SUBCUT|\bSC\b/.test(n)) return 'sc';
  if (/SUBLINGUAL|\bSL\b|\bVO\b|\bORAL\b/.test(n)) return 'vo';
  return '';
}

// via + dose vindos do CATALOGO_SUBSTANCIAS [nome, dose, natureza, via, ...].
function lookupCatalogoAgenda_(nome) {
  var alvo = normalizeHeader_(nome);
  for (var i = 0; i < CATALOGO_SUBSTANCIAS.length; i++) {
    var c = CATALOGO_SUBSTANCIAS[i];
    var cn = normalizeHeader_(c[0]);
    if (cn && (alvo.indexOf(cn) !== -1 || cn.indexOf(alvo) !== -1)) {
      return { via: String(c[3] || '').toLowerCase(), dose: String(c[1] || ''), categoria: String(c[2] || '').toUpperCase() };
    }
  }
  return { via: '', dose: '', categoria: '' };
}

// Duracao do evento consolidado, somando as classes presentes (bate com a
// lista de procedimentos da descricao: IM 15, EV 30, Implante 60).
function calcularDuracaoAgenda_(substancias) {
  var vias = {};
  substancias.forEach(function (s) { vias[(s.via || '').toLowerCase()] = true; });
  var total = 0;
  if (vias['im']) total += TEMPO_POR_TIPO.im;
  if (vias['ev'] || vias['iv']) total += TEMPO_POR_TIPO.ev;
  if (vias['implant']) total += TEMPO_POR_TIPO.implant;
  if (!total) total = 30;
  return total;
}

// Classifica um item do protocolo em ROTA (agenda alvo), GRUPO (bucket que vira
// 1 evento) e TIPO (tipoProcedimento p/ cor + codigo da descricao).
// Detecta CONSULTA/RETORNO por CATEGORIA *ou* pelo NOME — porque o Caio
// cadastrou "CONSULTA DE CAIO" / "RETORNO DR CAIO" so na planilha CADASTRO
// SUBSTANCIAS (nao no array CATALOGO_SUBSTANCIAS); a deteccao por nome garante
// o roteamento mesmo sem a categoria vir do catalogo. (cinto e suspensorio)
//   categoria/nome CONSULTA -> agenda MEDICO  (evento de consulta)
//   categoria/nome RETORNO  -> agenda MEDICO  (evento de retorno/avaliacao)
//   via implant / nome IMPLANT -> agenda MEDICO  (procedimento implante)
//   demais (im / ev / sc)   -> agenda ENFERMAGEM (aplicacao injetavel)
function classificarItemAgenda_(item) {
  var nome = String(item.nome || '').toUpperCase();
  var cat  = String(item.categoria || '').toUpperCase();
  var via  = String(item.via || '').toLowerCase();
  if (cat.indexOf('CONSULTA') !== -1 || /\bCONSULTA\b/.test(nome)) return { rota: 'medico', grupo: 'CONSULTA', tipo: 'CONSULTA_60_PRESENCIAL' };
  if (cat.indexOf('RETORNO')  !== -1 || /\bRETORNO\b/.test(nome))  return { rota: 'medico', grupo: 'RETORNO',  tipo: 'RETORNO_30_PRESENCIAL' };
  if (via === 'implant' || /IMPLANT/.test(nome))                   return { rota: 'medico', grupo: 'IMPLANTE', tipo: 'IMPLANTE_120_PRESENCIAL' };
  return { rota: 'enfermagem', grupo: 'APLICACAO', tipo: 'APLICACAO_IM_15_PRESENCIAL' };
}

// Duracao (min) por grupo: consulta 60, retorno 30, implante 60; injetaveis
// somam por via (IM 15 + EV 30) via calcularDuracaoAgenda_.
function duracaoGrupoAgenda_(grupo, subs) {
  if (grupo === 'CONSULTA') return (typeof TEMPO_POR_TIPO !== 'undefined' && TEMPO_POR_TIPO.consulta) ? TEMPO_POR_TIPO.consulta : 60;
  if (grupo === 'RETORNO')  return (typeof TEMPO_POR_TIPO !== 'undefined' && TEMPO_POR_TIPO.retorno)  ? TEMPO_POR_TIPO.retorno  : 30;
  if (grupo === 'IMPLANTE') return (typeof TEMPO_POR_TIPO !== 'undefined' && TEMPO_POR_TIPO.implant)  ? TEMPO_POR_TIPO.implant  : 60;
  return calcularDuracaoAgenda_(subs);
}

// PURO/TESTAVEL: transforma a agenda consolidada (1 entry por data, com varias
// substancias) numa lista de MARCACOES, separando por agenda alvo + grupo.
// Assim CONSULTA/RETORNO (medico) NUNCA caem no mesmo evento dos injetaveis
// (enfermagem), mesmo na mesma semana. Ordem estavel: no mesmo dia o medico
// vem primeiro (consulta, retorno, implante) e a enfermagem por ultimo; datas
// em ordem cronologica.
var ORDEM_GRUPO_AGENDA = { CONSULTA: 0, RETORNO: 1, IMPLANTE: 2, APLICACAO: 3 };
function montarMarcacoesAgenda_(agenda) {
  var marcacoes = [];
  (agenda || []).forEach(function (entry) {
    var buckets = {}; // grupo -> { rota, grupo, tipo, date, substancias[] }
    (entry.substancias || []).forEach(function (s) {
      var cls = classificarItemAgenda_(s);
      if (!buckets[cls.grupo]) buckets[cls.grupo] = { rota: cls.rota, grupo: cls.grupo, tipo: cls.tipo, date: entry.date, substancias: [] };
      buckets[cls.grupo].substancias.push(s);
    });
    Object.keys(buckets).forEach(function (k) { marcacoes.push(buckets[k]); });
  });
  marcacoes.sort(function (a, b) {
    var dt = a.date.getTime() - b.date.getTime();
    if (dt !== 0) return dt;
    var oa = ORDEM_GRUPO_AGENDA[a.grupo]; oa = (oa == null) ? 9 : oa;
    var ob = ORDEM_GRUPO_AGENDA[b.grupo]; ob = (ob == null) ? 9 : ob;
    return oa - ob;
  });
  return marcacoes;
}

// Domingo -> segunda ; sabado -> segunda (salvo atendeSabado=true).
function ajustarDiaUtilAgenda_(date) {
  var d = new Date(date.getTime());
  for (var guard = 0; guard < 7; guard++) {
    var dow = d.getDay(); // 0=dom ... 6=sab
    if (dow === 0) { d.setDate(d.getDate() + 1); continue; }
    if (dow === 6 && !CONFIG_AGENDA.atendeSabado) { d.setDate(d.getDate() + 2); continue; }
    break;
  }
  return d;
}

// Nucleo PURO do anti-colisao (testavel sem Calendar).
// ocupados/janelas em minutos do dia. Retorna minuto de inicio livre ou -1.
function proximoSlotMinuto_(ocupados, baseMin, duracaoMin, janelas) {
  for (var j = 0; j < janelas.length; j++) {
    var ini = Math.max(janelas[j].ini, baseMin);
    for (var t = ini; t + duracaoMin <= janelas[j].fim; t += CONFIG_AGENDA.passoSlotMin) {
      var colide = ocupados.some(function (o) { return t < o.fim && (t + duracaoMin) > o.ini; });
      if (!colide) return t;
    }
  }
  return -1;
}

// ── Expansao + consolidacao (reusa o motor canonico do RAS) ────
function expandirAgendaPaciente_(pacRAS) {
  var subs = pacRAS.substancias || [];
  if (!subs.length) return [];

  var porNome = {};
  subs.forEach(function (s) {
    var via = inferirViaPorNome_(s.nome);
    var cat = lookupCatalogoAgenda_(s.nome);
    if (!via) via = cat.via;
    porNome[s.nome] = { nome: s.nome, via: via, dose: cat.dose, categoria: cat.categoria };
  });

  // mesmas DATAS do RAS (1 ida por semana, primeira aplicacao da semana)
  var schedule = montarAgendaParaSubstancias_(pacRAS, subs);

  return schedule.map(function (entry) {
    var substancias = Object.keys(entry.sessions).map(function (nome) {
      var base = porNome[nome] || { nome: nome, via: '', dose: '', categoria: '' };
      return {
        nome: base.nome,
        via: base.via,
        dose: base.dose,
        categoria: base.categoria,
        status: 'disp',
        nestaSessao: true,
        sessaoLabel: entry.sessions[nome]
      };
    });
    return { date: entry.date, substancias: substancias };
  });
}

// Hash estavel do protocolo (muda se substancia/sessoes/freq/inicio mudam).
function hashProtocoloAgenda_(pacRAS) {
  var subs = (pacRAS.substancias || []).map(function (s) {
    return [String(s.nome), s.sessoes, s.freq, s.inicio ? ymd_(s.inicio) : ''].join('|');
  }).sort().join('||');
  var raw = String(pacRAS.nome || '') + '#' + subs;
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, raw, Utilities.Charset.UTF_8);
  return bytes.map(function (b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

// ── Acesso ao Google Agenda ────────────────────────────────────
function resolverCalendarioAgenda_(rota, logArr) {
  var nome = CONFIG_AGENDA.calendarios[rota] || CONFIG_AGENDA.calendarios.geral;
  var cals = CalendarApp.getCalendarsByName(nome);
  if (cals && cals.length) return cals[0];
  if (logArr) logArr.push('[AVISO] Agenda "' + nome + '" nao encontrada; usando agenda padrao.');
  return CalendarApp.getDefaultCalendar();
}

// Anti-colisao real: le os eventos do dia e acha o 1o horario livre.
function acharSlotLivreAgenda_(cal, dataBase, duracaoMin, ocupadosPorDia) {
  var dia = ajustarDiaUtilAgenda_(dataBase);
  var janelas = [
    { ini: CONFIG_AGENDA.janelaManhaIni * 60, fim: CONFIG_AGENDA.janelaManhaFim * 60 },
    { ini: CONFIG_AGENDA.janelaTardeIni * 60, fim: CONFIG_AGENDA.janelaTardeFim * 60 }
  ];
  var baseMin = CONFIG_AGENDA.horaInicioPadrao * 60 + CONFIG_AGENDA.minutoInicioPadrao;

  for (var tentativa = 0; tentativa < 14; tentativa++) {
    var inicioDia = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 0, 0, 0);
    var fimDia = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 23, 59, 59);
    var eventos = cal.getEvents(inicioDia, fimDia);
    var ocupados = eventos.map(function (ev) {
      var s = ev.getStartTime(), e = ev.getEndTime();
      return { ini: s.getHours() * 60 + s.getMinutes(), fim: e.getHours() * 60 + e.getMinutes() };
    });
    // Tambem evita choque com outras marcacoes do MESMO paciente no mesmo dia
    // (ex: consulta no medico + injetavel na enfermagem no mesmo dia nao podem
    // cair no mesmo horario porque o paciente e uma pessoa so).
    var diaKey = ymd_(dia);
    if (ocupadosPorDia && ocupadosPorDia[diaKey]) {
      ocupadosPorDia[diaKey].forEach(function (o) { ocupados.push({ ini: o.ini, fim: o.fim }); });
    }
    var min = proximoSlotMinuto_(ocupados, baseMin, duracaoMin, janelas);
    if (min >= 0) {
      var inicio = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), Math.floor(min / 60), min % 60, 0);
      var fim = new Date(inicio.getTime() + duracaoMin * 60000);
      return { inicio: inicio, fim: fim };
    }
    dia = ajustarDiaUtilAgenda_(new Date(dia.getTime() + 86400000)); // dia cheio -> proximo util
  }
  return null;
}

// Apaga eventos por id, varrendo as agendas da conta.
function apagarEventosPorIds_(ids) {
  if (!ids || !ids.length) return 0;
  var cals = CalendarApp.getAllCalendars();
  var n = 0;
  ids.forEach(function (id) {
    for (var i = 0; i < cals.length; i++) {
      try {
        var ev = cals[i].getEventById(id);
        if (ev) { ev.deleteEvent(); n++; break; }
      } catch (e) { /* segue tentando nas outras agendas */ }
    }
  });
  return n;
}

function buscarEmailPaciente_(pac) {
  try {
    var c = buscarPacienteCadastro_(pac.nome);
    return (c && c.email) ? c.email : '';
  } catch (e) { return ''; }
}

// Cria/acha as 3 colunas de controle (no fim da TABELA GERAL).
function getOrCreateColAgenda_(sheet, header) {
  var col = findColByHeader_(sheet, header);
  if (col && col !== -1) return col;
  var nova = sheet.getLastColumn() + 1;
  sheet.getRange(1, nova).setValue(header);
  sheet.getRange(2, nova).setValue(header); // convencao 2 linhas de cabecalho
  return nova;
}

// ── Lancamento por paciente ────────────────────────────────────
// opts: { force, modo:'novos'|'pendentes' }
function lancarAgendaPaciente_(sheet, row, opts, logArr) {
  opts = opts || {};
  var pac = lerPaciente_(sheet, row);
  if (!pac.nome) return { pulado: true, motivo: 'sem nome' };

  var pacRAS = pacienteParaRAS_(pac);
  var agenda = expandirAgendaPaciente_(pacRAS);
  if (!agenda.length) return { pulado: true, motivo: 'sem substancia com data/freq/sessoes', nome: pacRAS.nome };

  var colHash = getOrCreateColAgenda_(sheet, COL_AGENDA_HASH);
  var colEv = getOrCreateColAgenda_(sheet, COL_AGENDA_EVENTOS);
  var colLan = getOrCreateColAgenda_(sheet, COL_AGENDA_LANCADO);
  var colStatus = getOrCreateColAgenda_(sheet, COL_AGENDA_STATUS);

  var hash = hashProtocoloAgenda_(pacRAS);
  var hashAtual = String(sheet.getRange(row, colHash).getValue() || '');
  var statusAnterior = String(sheet.getRange(row, colStatus).getValue() || '').toUpperCase();
  var eventosAntigos = parseEventIds_(sheet.getRange(row, colEv).getValue());
  var jaLancado = eventosAntigos.length > 0;
  var inalterado = hashAtual === hash;
  var completo = statusAnterior === 'COMPLETO';

  // So pula quem ja esta COMPLETO. Quem ficou PARCIAL (faltou slot) sempre
  // retenta, mesmo com protocolo inalterado, ate fechar todas as sessoes.
  if (!opts.force) {
    if (opts.modo === 'novos' && jaLancado && completo) return { pulado: true, motivo: 'ja lancado', nome: pacRAS.nome };
    if (jaLancado && inalterado && completo) return { pulado: true, motivo: 'inalterado', nome: pacRAS.nome };
  }

  if (jaLancado) apagarEventosPorIds_(eventosAntigos); // reagendando/retentando: limpa os antigos

  // Separa cada ida em MARCACOES por agenda alvo + grupo. CONSULTA/RETORNO
  // (medico) saem em eventos PROPRIOS, nunca grudados nos injetaveis (enfermagem).
  var marcacoes = montarMarcacoesAgenda_(agenda);
  var idsNovos = [];
  var totalMarc = marcacoes.length;
  var ocupadosPorDia = {}; // ymd -> [{ini,fim}] do PROPRIO paciente (anti duplo-agendamento)

  for (var k = 0; k < marcacoes.length; k++) {
    var m = marcacoes[k];
    var cal = resolverCalendarioAgenda_(m.rota, logArr);
    var duracao = duracaoGrupoAgenda_(m.grupo, m.substancias);
    var slot = acharSlotLivreAgenda_(cal, m.date, duracao, ocupadosPorDia);
    if (!slot) { logArr.push('[AVISO] ' + pacRAS.nome + ': sem horario livre para ' + ymd_(m.date) + ' (' + m.grupo + ')'); continue; }

    // Reserva o horario do paciente NAQUELE dia p/ a proxima marcacao nao colidir,
    // mesmo que seja em outra agenda (o paciente e uma pessoa so).
    var diaKey = ymd_(slot.inicio);
    if (!ocupadosPorDia[diaKey]) ocupadosPorDia[diaKey] = [];
    ocupadosPorDia[diaKey].push({
      ini: slot.inicio.getHours() * 60 + slot.inicio.getMinutes(),
      fim: slot.fim.getHours() * 60 + slot.fim.getMinutes()
    });

    // CONSULTA/RETORNO sao eventos do medico: descricao limpa, sem lista de
    // substancia (a "substancia" aqui e so o gatilho de agendamento).
    var substanciasEvento = (m.grupo === 'CONSULTA' || m.grupo === 'RETORNO') ? [] : m.substancias;

    var email = CONFIG_AGENDA.convidarPaciente ? buscarEmailPaciente_(pac) : '';
    var dados = {
      calendarId: cal.getId(),
      pacienteNome: pacRAS.nome,
      pacienteCpf: pac.cpf,
      pacienteEmail: email,
      tipoProcedimento: m.tipo,
      duracaoMin: duracao,
      dataAgendada: ymd_(slot.inicio),
      horaAgendada: pad2_(slot.inicio.getHours()) + ':' + pad2_(slot.inicio.getMinutes()),
      horaFim: pad2_(slot.fim.getHours()) + ':' + pad2_(slot.fim.getMinutes()),
      numeroMarcacao: k + 1,
      totalMarcacoes: totalMarc,
      unidadeNome: CONFIG_AGENDA.unidadeNome,
      substancias: substanciasEvento,
      endereco: CONFIG_AGENDA.endereco || null
    };

    // ANTI-ERRO: uma falha num evento NAO derruba os demais; vira PARCIAL e
    // o motor retenta na proxima rodada (idempotente).
    try {
      var id = (email)
        ? criarAgendamentoRASComConvite(dados)
        : criarAgendamentoRAS(dados);
      idsNovos.push(id);
    } catch (e) {
      logArr.push('[ERRO] ' + pacRAS.nome + ' ' + ymd_(m.date) + ' (' + m.grupo + '): ' + (e && e.message ? e.message : e));
    }
  }

  var status = (idsNovos.length >= totalMarc) ? 'COMPLETO' : 'PARCIAL';
  sheet.getRange(row, colHash).setValue(hash);
  sheet.getRange(row, colEv).setValue(JSON.stringify(idsNovos));
  sheet.getRange(row, colLan).setValue(new Date());
  sheet.getRange(row, colStatus).setValue(status);
  return { pulado: false, nome: pacRAS.nome, eventos: idsNovos.length, total: totalMarc, status: status };
}

// ── Operacoes em massa (chamadas pelos botoes do painel) ───────
function lancarAgendaTodos_(opts) {
  opts = opts || {};
  var ss = getSS_();
  var sheet = ss.getSheetByName(ABA_PRINCIPAL);
  if (!sheet) return JSON.stringify({ error: 'Aba TABELA GERAL nao encontrada' });

  var colNome = findColByHeader_(sheet, 'NOME DO PACIENTE');
  if (colNome === -1) colNome = 2;
  var lastRow = getLastDataRow_(sheet, colNome);

  var log = [];
  var nLan = 0, nPul = 0, nEv = 0;
  for (var r = 3; r <= lastRow; r++) {
    var nome = String(sheet.getRange(r, colNome).getValue() || '').trim();
    if (!nome) continue;
    var res = lancarAgendaPaciente_(sheet, r, opts, log);
    if (res.pulado) {
      nPul++;
      if (res.motivo && res.motivo !== 'inalterado' && res.motivo !== 'ja lancado') {
        log.push('[PULADO] linha ' + r + ' ' + (res.nome || nome) + ': ' + res.motivo);
      }
    } else {
      nLan++; nEv += res.eventos;
      log.push('[OK] ' + res.nome + ': ' + res.eventos + ' evento(s)');
    }
  }
  log.unshift('[FIM] Agenda | pacientes lancados: ' + nLan + ' | pulados: ' + nPul + ' | eventos criados: ' + nEv);
  return JSON.stringify({ log: log.join('\n') });
}

function apagarTudoAgendado_() {
  var ss = getSS_();
  var sheet = ss.getSheetByName(ABA_PRINCIPAL);
  if (!sheet) return JSON.stringify({ error: 'Aba TABELA GERAL nao encontrada' });

  var colNome = findColByHeader_(sheet, 'NOME DO PACIENTE');
  if (colNome === -1) colNome = 2;
  var colEv = getOrCreateColAgenda_(sheet, COL_AGENDA_EVENTOS);
  var colHash = getOrCreateColAgenda_(sheet, COL_AGENDA_HASH);
  var colLan = getOrCreateColAgenda_(sheet, COL_AGENDA_LANCADO);
  var colStatus = getOrCreateColAgenda_(sheet, COL_AGENDA_STATUS);

  var lastRow = getLastDataRow_(sheet, colNome);
  var nPac = 0, nEv = 0;
  for (var r = 3; r <= lastRow; r++) {
    var ids = parseEventIds_(sheet.getRange(r, colEv).getValue());
    if (ids.length) { nEv += apagarEventosPorIds_(ids); nPac++; }
    sheet.getRange(r, colEv).clearContent();
    sheet.getRange(r, colHash).clearContent();
    sheet.getRange(r, colLan).clearContent();
    sheet.getRange(r, colStatus).clearContent();
  }
  return JSON.stringify({ log: '[FIM] Apagados ' + nEv + ' evento(s) de ' + nPac + ' paciente(s); colunas de controle limpas.' });
}

// ── Wrappers dos botoes (Panel.html -> run('runX')) ────────────
function runLancarAgendaTodos()   { return lancarAgendaTodos_({ modo: 'novos' }); }   // so quem nunca foi lancado
function runReagendarPendentes()  { return lancarAgendaTodos_({ modo: 'pendentes' }); } // novos + quem teve o protocolo alterado
function runReagendarAgendaTudo() { return lancarAgendaTodos_({ force: true }); }       // apaga tudo e recria
function runApagarAgenda()        { return apagarTudoAgendado_(); }
function runTestesSemanticosAgenda() { return testesSemanticosAgenda_(); }

// ── Harness de testes semanticos (puro, sem Calendar/Sheet) ────
function testesSemanticosAgenda_() {
  var falhas = [], ok = 0;
  function check(cond, msg) { if (cond) ok++; else falhas.push(msg); }

  // dados: 2 substancias na MESMA semana (sabado 13/06/2026)
  var pac = { nome: 'TESTE', substancias: [
    { nome: 'TIRZEPATIDA', sessoes: 4, freq: 7,  inicio: makeDate_(13, 6, 2026) },
    { nome: 'VITAMINA D3', sessoes: 1, freq: 30, inicio: makeDate_(13, 6, 2026) }
  ]};
  var ag = expandirAgendaPaciente_(pac);

  // 1. expansao semanal: 4 idas (Tirzepatida em 4 semanas distintas)
  check(ag.length === 4, '1. esperado 4 datas semanais, veio ' + ag.length);

  // 2. consolidacao: a 1a semana junta as 2 substancias num so evento
  check(ag.length && ag[0].substancias.length === 2, '2. consolidacao falhou na 1a semana');

  // 3. espacamento de 7 dias entre semanas
  if (ag.length >= 2) {
    var dif = Math.round((ag[1].date.getTime() - ag[0].date.getTime()) / 86400000);
    check(dif === 7, '3. espacamento esperado 7 dias, veio ' + dif);
  }

  // 4. via inferida pelo nome
  check(inferirViaPorNome_('VITAMINA D3 INTRAMUSCULAR') === 'im', '4. via inferida errada');

  // 5. dia util: 14/06/2026 (domingo) deve virar segunda
  check(ajustarDiaUtilAgenda_(makeDate_(14, 6, 2026)).getDay() === 1, '5. domingo nao virou segunda');

  // 6. anti-colisao: 09:00-09:30 ocupado -> proximo livre 09:30 (570)
  var slot = proximoSlotMinuto_([{ ini: 540, fim: 570 }], 540, 30,
    [{ ini: 480, fim: 720 }, { ini: 840, fim: 1080 }]);
  check(slot === 570, '6. slot esperado 570 (09:30), veio ' + slot);
  check(!(slot < 570 && slot + 30 > 540), '6b. slot colidiu com 09:00-09:30');

  // 7. idempotencia: hash estavel e sensivel a mudanca de sessoes
  var h1 = hashProtocoloAgenda_(pacienteParaRAS_({ nome: 'X', substancias: pac.substancias }));
  var h2 = hashProtocoloAgenda_(pacienteParaRAS_({ nome: 'X', substancias: pac.substancias }));
  check(h1 === h2, '7. hash deveria ser estavel');
  var pac2 = { nome: 'X', substancias: [
    { nome: 'TIRZEPATIDA', sessoes: 5, freq: 7, inicio: makeDate_(13, 6, 2026) },
    pac.substancias[1]
  ]};
  var h3 = hashProtocoloAgenda_(pacienteParaRAS_(pac2));
  check(h1 !== h3, '7b. hash deveria mudar quando sessoes muda');

  // 8. sem slot: janelas 100% ocupadas -> -1 (origem do status PARCIAL/retry)
  var cheio = [{ ini: 480, fim: 720 }, { ini: 840, fim: 1080 }];
  var semSlot = proximoSlotMinuto_(cheio, 540, 30, cheio);
  check(semSlot === -1, '8. dia lotado deveria devolver -1, veio ' + semSlot);

  // ── CONSULTA / RETORNO -> AGENDA MEDICO (separados dos injetaveis) ──
  // 9/10. classifica por categoria
  check(classificarItemAgenda_({ nome: 'CONSULTA DE CAIO', via: '', categoria: 'CONSULTA' }).rota === 'medico', '9. consulta(cat) deveria ir pro medico');
  check(classificarItemAgenda_({ nome: 'RETORNO DR CAIO', via: '', categoria: 'RETORNO' }).rota === 'medico', '10. retorno(cat) deveria ir pro medico');

  // 10b/10c. classifica SO pelo nome (CONSULTA/RETORNO nao estao no
  //          CATALOGO_SUBSTANCIAS hardcoded; vem so da planilha -> categoria vazia)
  check(classificarItemAgenda_({ nome: 'CONSULTA DE CAIO', via: '', categoria: '' }).grupo === 'CONSULTA', '10b. consulta por nome falhou');
  check(classificarItemAgenda_({ nome: 'RETORNO DR CAIO', via: '', categoria: '' }).grupo === 'RETORNO', '10c. retorno por nome falhou');

  // 10d. substancia normal NAO pode cair como consulta/retorno por engano
  check(classificarItemAgenda_({ nome: 'GLUTATIONA', via: 'ev', categoria: 'ANTIOXIDANTE' }).grupo === 'APLICACAO', '10d. glutationa virou consulta/retorno por engano');

  // 11/12. injetavel IM -> enfermagem ; implante -> medico
  check(classificarItemAgenda_({ nome: 'VITAMINA D3', via: 'im', categoria: 'VITAMINA' }).rota === 'enfermagem', '11. IM deveria ir pra enfermagem');
  check(classificarItemAgenda_({ nome: 'TESTOSTERONA IMPLANTE', via: 'implant', categoria: 'HORMONIO' }).rota === 'medico', '12. implante deveria ir pro medico');

  // 13. duracoes por grupo
  check(duracaoGrupoAgenda_('CONSULTA', []) === 60, '13. consulta deveria durar 60min, veio ' + duracaoGrupoAgenda_('CONSULTA', []));
  check(duracaoGrupoAgenda_('RETORNO', []) === 30, '13b. retorno deveria durar 30min, veio ' + duracaoGrupoAgenda_('RETORNO', []));

  // 14/15. mesma semana: consulta(medico) + injetavel(enfermagem) -> 2 eventos
  //        SEPARADOS, medico vindo ANTES da enfermagem, cada um com sua substancia.
  var agendaMix = [{ date: makeDate_(15, 6, 2026), substancias: [
    { nome: 'VITAMINA D3', via: 'im', categoria: 'VITAMINA', status: 'disp', nestaSessao: true },
    { nome: 'CONSULTA DE CAIO', via: '', categoria: 'CONSULTA', status: 'disp', nestaSessao: true }
  ]}];
  var mix = montarMarcacoesAgenda_(agendaMix);
  check(mix.length === 2, '14. consulta+injetavel na mesma semana deveria virar 2 eventos, veio ' + mix.length);
  check(mix.length === 2 && mix[0].rota === 'medico' && mix[1].rota === 'enfermagem', '15. ordem/rotas erradas (medico antes da enfermagem)');
  check(mix.length === 2 && mix[0].substancias.length === 1 && mix[1].substancias.length === 1, '15b. cada evento deveria ter exatamente sua substancia');

  // 16. consolidacao injetavel preservada: a agenda base (2 injetaveis, 1a semana
  //     junta) vira 4 marcacoes (1 por semana), nenhuma no medico.
  var marc = montarMarcacoesAgenda_(ag);
  check(marc.length === 4, '16. esperado 4 marcacoes de injetavel, veio ' + marc.length);
  check(marc.every(function (mm) { return mm.rota === 'enfermagem'; }), '16b. injetavel nao deveria ir pro medico');

  // 17. anti-duplo-agendamento do paciente: 09:00-10:00 ja ocupado por ele ->
  //     a proxima marcacao do mesmo dia comeca 10:00 (600).
  var slot2 = proximoSlotMinuto_([{ ini: 540, fim: 600 }], 540, 30,
    [{ ini: 480, fim: 720 }, { ini: 840, fim: 1080 }]);
  check(slot2 === 600, '17. apos consulta 09-10h, injetavel deveria comecar 10:00 (600), veio ' + slot2);

  // 18. consulta E retorno no mesmo dia -> 2 eventos no medico (consulta antes)
  var agendaCR = [{ date: makeDate_(15, 6, 2026), substancias: [
    { nome: 'RETORNO DR CAIO', via: '', categoria: 'RETORNO', status: 'disp', nestaSessao: true },
    { nome: 'CONSULTA DE CAIO', via: '', categoria: 'CONSULTA', status: 'disp', nestaSessao: true }
  ]}];
  var cr = montarMarcacoesAgenda_(agendaCR);
  check(cr.length === 2 && cr[0].grupo === 'CONSULTA' && cr[1].grupo === 'RETORNO', '18. consulta deveria vir antes do retorno');
  check(cr.length === 2 && cr[0].rota === 'medico' && cr[1].rota === 'medico', '18b. consulta e retorno deveriam ir ambos pro medico');

  var resumo = '[TESTES SEMANTICOS] ' + ok + ' passou, ' + falhas.length + ' falhou';
  if (falhas.length) resumo += '\n - ' + falhas.join('\n - ');
  return JSON.stringify({ log: resumo });
}
