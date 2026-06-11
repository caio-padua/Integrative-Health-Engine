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
 * - Roteia a agenda por via (determineCalendarRouting):
 *   implante/consulta -> MEDICO ; injetaveis -> ENFERMAGEM.
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
    enfermagem: 'ENFERMAGEM',
    medico:     'MEDICO CAIO',
    geral:      'GERAL'
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
      return { via: String(c[3] || '').toLowerCase(), dose: String(c[1] || '') };
    }
  }
  return { via: '', dose: '' };
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
    porNome[s.nome] = { nome: s.nome, via: via, dose: cat.dose };
  });

  // mesmas DATAS do RAS (1 ida por semana, primeira aplicacao da semana)
  var schedule = montarAgendaParaSubstancias_(pacRAS, subs);

  return schedule.map(function (entry) {
    var substancias = Object.keys(entry.sessions).map(function (nome) {
      var base = porNome[nome] || { nome: nome, via: '', dose: '' };
      return {
        nome: base.nome,
        via: base.via,
        dose: base.dose,
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
function acharSlotLivreAgenda_(cal, dataBase, duracaoMin) {
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

  var idsNovos = [];
  var totalMarc = agenda.length;
  for (var k = 0; k < agenda.length; k++) {
    var entry = agenda[k];
    var vias = entry.substancias.map(function (s) { return s.via; });
    var rota = determineCalendarRouting(vias);
    var cal = resolverCalendarioAgenda_(rota, logArr);
    var duracao = calcularDuracaoAgenda_(entry.substancias);
    var slot = acharSlotLivreAgenda_(cal, entry.date, duracao);
    if (!slot) { logArr.push('[AVISO] ' + pacRAS.nome + ': sem horario livre para ' + ymd_(entry.date)); continue; }

    var email = CONFIG_AGENDA.convidarPaciente ? buscarEmailPaciente_(pac) : '';
    var dados = {
      calendarId: cal.getId(),
      pacienteNome: pacRAS.nome,
      pacienteCpf: pac.cpf,
      pacienteEmail: email,
      tipoProcedimento: '',
      duracaoMin: duracao,
      dataAgendada: ymd_(slot.inicio),
      horaAgendada: pad2_(slot.inicio.getHours()) + ':' + pad2_(slot.inicio.getMinutes()),
      horaFim: pad2_(slot.fim.getHours()) + ':' + pad2_(slot.fim.getMinutes()),
      numeroMarcacao: k + 1,
      totalMarcacoes: totalMarc,
      unidadeNome: CONFIG_AGENDA.unidadeNome,
      substancias: entry.substancias,
      endereco: CONFIG_AGENDA.endereco || null
    };

    var id = (email)
      ? criarAgendamentoRASComConvite(dados)
      : criarAgendamentoRAS(dados);
    idsNovos.push(id);
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

  var resumo = '[TESTES SEMANTICOS] ' + ok + ' passou, ' + falhas.length + ' falhou';
  if (falhas.length) resumo += '\n - ' + falhas.join('\n - ');
  return JSON.stringify({ log: resumo });
}
