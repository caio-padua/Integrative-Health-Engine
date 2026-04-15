import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings?.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
   const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X-Replit-Token not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-calendar',
    {
      headers: {
        'Accept': 'application/json',
        'X-Replit-Token': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Calendar not connected');
  }
  return accessToken;
}

export async function getCalendarClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

const TEMPO_POR_TIPO: Record<string, number> = {
  im: 15,
  iv: 30,
  ev: 30,
  implant: 60,
  consulta: 60,
};

interface SubstanciaEvento {
  nome: string;
  via: string;
  dose: string;
  status: string;
}

function statusSquare(status: string): { square: string; tag: string } {
  switch (status) {
    case 'disp': return { square: '🟩', tag: 'DISP' };
    case 'aplicada': return { square: '🟦', tag: 'APLI' };
    case 'prox': return { square: '🟨', tag: 'PROX' };
    case 'nao_aplicada': return { square: '⬜', tag: 'INDI' };
    default: return { square: '⬜', tag: status.toUpperCase().slice(0, 4) };
  }
}

function formatCpf(cpf: string | undefined): string {
  if (!cpf) return '';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`;
  }
  return cpf;
}

function determineSessionStatus(substancias: SubstanciaEvento[]): { label: string; square: string } {
  if (!substancias.length) return { label: 'A realizar', square: '🟨' };

  const hasAplicada = substancias.some(s => s.status === 'aplicada');
  const allDone = substancias.every(s => s.status === 'aplicada' || s.status === 'nao_aplicada');
  const hasNaoAplicada = substancias.some(s => s.status === 'nao_aplicada');

  if (allDone && hasAplicada && !hasNaoAplicada) return { label: 'Realizado', square: '🟦' };
  if (allDone && hasNaoAplicada && !hasAplicada) return { label: 'Nao realizado', square: '⬜' };
  if (allDone) return { label: 'Realizado', square: '🟦' };
  return { label: 'A realizar', square: '🟨' };
}

function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function capitalizeSentence(text: string): string {
  return text.split(' ').map((w, i) => i === 0 ? capitalize(w) : w.toLowerCase()).join(' ');
}

export function buildEventDescription(opts: {
  pacienteNome: string;
  pacienteCpf?: string;
  numeroMarcacao?: number;
  totalMarcacoes?: number;
  unidadeNome?: string;
  substancias: SubstanciaEvento[];
  tipoProcedimento: string;
  duracaoMin: number;
  endereco?: {
    rua?: string;
    bairro?: string;
    cep?: string;
    cidade?: string;
    estado?: string;
  };
}): string {
  const { pacienteNome, pacienteCpf, numeroMarcacao, totalMarcacoes, unidadeNome, substancias, tipoProcedimento, duracaoMin, endereco } = opts;

  const vias = new Set(substancias.map(s => s.via?.toLowerCase()));
  const temIM = vias.has('im');
  const temEV = vias.has('iv') || vias.has('ev');
  const temImplante = vias.has('implant');
  const temConsulta = tipoProcedimento.includes('CONSULTA');

  const lines: string[] = [];

  lines.push('Pawards - Protocolos injetaveis');
  lines.push('');
  lines.push(capitalizeSentence(pacienteNome));
  if (pacienteCpf) lines.push(`Cpf ${formatCpf(pacienteCpf)}`);
  if (numeroMarcacao) lines.push(`Marcacao ${numeroMarcacao}${totalMarcacoes ? '/' + totalMarcacoes : ''}`);
  if (unidadeNome) lines.push(`Unidade ${capitalizeSentence(unidadeNome)}`);
  lines.push('');

  lines.push('Procedimentos');
  lines.push('');
  lines.push(`  Consulta [60min]  ${temConsulta ? '✅' : '❎'}`);
  lines.push(`  Aplicacao endovenosa [30min]  ${temEV ? '✅' : '❎'}`);
  lines.push(`  Aplicacao intramuscular [15min]  ${temIM ? '✅' : '❎'}`);
  lines.push(`  Implante [60min]  ${temImplante ? '✅' : '❎'}`);
  lines.push('');
  lines.push(`Duracao total: ${duracaoMin} minutos`);
  lines.push('');

  const sessionStatus = determineSessionStatus(substancias);
  lines.push(`Status: ${sessionStatus.label}  ${sessionStatus.square}`);
  lines.push('');
  lines.push('');

  lines.push('Substancias do protocolo');
  lines.push('');
  for (let i = 0; i < substancias.length; i++) {
    const s = substancias[i];
    const st = statusSquare(s.status);
    const idx = `[${i + 1}/${substancias.length}]`;
    const nome = capitalizeSentence(s.nome);
    const dose = s.dose || '';
    lines.push(`  ${st.square}  ${idx}  ${nome} ${dose}  [${st.tag}]`);
    lines.push('');
  }
  lines.push('');

  lines.push('Legenda');
  lines.push('');
  lines.push('  🟩  [DISP]  Disponivel para aplicacao hoje');
  lines.push('  🟨  [PROX]  Proxima sessao');
  lines.push('  🟦  [APLI]  Substancia ja aplicada');
  lines.push('  ⬜  [INDI]  Indisponivel');
  lines.push('');
  lines.push('');

  if (endereco && endereco.rua) {
    lines.push('Endereco');
    lines.push('');
    lines.push(`  📍  ${capitalizeSentence(endereco.rua)}`);
    if (endereco.bairro) lines.push(`      ${capitalizeSentence(endereco.bairro)}`);
    if (endereco.cep) lines.push(`      Cep ${endereco.cep}`);
    if (endereco.cidade && endereco.estado) lines.push(`      ${capitalizeSentence(endereco.cidade)} - ${endereco.estado.toUpperCase()}`);
    lines.push('');
    lines.push('');

    const enderecoCompleto = [endereco.rua, endereco.bairro, endereco.cidade, endereco.estado, endereco.cep].filter(Boolean).join(', ');
    const enderecoEncoded = encodeURIComponent(enderecoCompleto);
    lines.push('Navegacao');
    lines.push('');
    lines.push(`  Google Maps: https://www.google.com/maps/search/?api=1&query=${enderecoEncoded}`);
    lines.push('');
    lines.push(`  Waze: https://waze.com/ul?q=${enderecoEncoded}&navigate=yes`);
  }

  return lines.join('\n');
}

export function determineCalendarRouting(vias: string[]): 'medico' | 'enfermagem' {
  const viasLower = vias.map(v => v?.toLowerCase() || '');
  const temImplante = viasLower.includes('implant');
  const temConsulta = viasLower.includes('consulta');
  if (temImplante || temConsulta) return 'medico';
  return 'enfermagem';
}

export interface SessaoCalendarData {
  sessaoId: number;
  pacienteNome: string;
  pacienteCpf?: string;
  profissionalNome: string;
  tipoProcedimento: string;
  duracaoMin: number;
  dataAgendada: string;
  horaAgendada: string;
  horaFim: string;
  calendarId: string;
  numeroMarcacao?: number;
  totalMarcacoes?: number;
  unidadeNome?: string;
  substancias: SubstanciaEvento[];
  endereco?: {
    rua?: string;
    bairro?: string;
    cep?: string;
    cidade?: string;
    estado?: string;
  };
}

const CODIGOS_SEMANTICOS: Record<string, { codigo: string; descricao: string }> = {
  'CONSULTA_30_PRESENCIAL':        { codigo: 'CPRE', descricao: 'Consulta Presencial' },
  'CONSULTA_60_PRESENCIAL':        { codigo: 'CPRE', descricao: 'Consulta Presencial Extensa' },
  'CONSULTA_30_ONLINE':            { codigo: 'CONL', descricao: 'Consulta Online' },
  'CONSULTA_30_TELEMEDICINA':      { codigo: 'CONL', descricao: 'Consulta Telemedicina' },
  'RETORNO_15_PRESENCIAL':         { codigo: 'CAVL', descricao: 'Consulta de Retorno' },
  'RETORNO_15_TELEMEDICINA':       { codigo: 'CAVL', descricao: 'Retorno Telemedicina' },
  'AVALIACAO_ENF_30_PRESENCIAL':   { codigo: 'CAVL', descricao: 'Avaliacao Enfermagem' },
  'AVALIACAO_ENFERMAGEM_20_PRESENCIAL': { codigo: 'CAVL', descricao: 'Avaliacao Enfermagem' },
  'IMPLANTE_120_PRESENCIAL':       { codigo: 'PROC', descricao: 'Procedimento — Implante' },
  'IM_15_PRESENCIAL':              { codigo: 'SESS', descricao: 'Sessao Aplicacao IM' },
  'APLICACAO_IM_15_PRESENCIAL':    { codigo: 'SESS', descricao: 'Sessao Aplicacao IM' },
  'INFUSAO_CURTA_60_PRESENCIAL':   { codigo: 'SESS', descricao: 'Sessao Infusao EV Curta' },
  'INFUSAO_MEDIA_120_PRESENCIAL':  { codigo: 'SESS', descricao: 'Sessao Infusao EV Media' },
  'INFUSAO_LONGA_180_PRESENCIAL':  { codigo: 'INFU', descricao: 'Infusao Longa EV' },
  'INFUSAO_EXTRA_240_PRESENCIAL':  { codigo: 'INFU', descricao: 'Infusao Extra EV' },
  'EXAME_30_PRESENCIAL':           { codigo: 'EXAM', descricao: 'Coleta de Exame' },
};

function resolveCodigoSemantico(tipoProcedimento: string, substancias?: SubstanciaEvento[]): string {
  const match = CODIGOS_SEMANTICOS[tipoProcedimento];
  if (match) return match.codigo;

  const tipo = tipoProcedimento.toUpperCase();
  if (tipo.includes('ONLINE') || tipo.includes('TELEMEDICINA')) return 'CONL';
  if (tipo.includes('RETORNO') || tipo.includes('AVALIACAO')) return 'CAVL';
  if (tipo.includes('IMPLANTE')) return 'PROC';
  if (tipo.includes('INFUSAO_LONGA') || tipo.includes('INFUSAO_EXTRA')) return 'INFU';
  if (tipo.includes('INFUSAO') || tipo.includes('IM_') || tipo.includes('APLICACAO')) return 'SESS';
  if (tipo.includes('EXAME') || tipo.includes('COLETA')) return 'EXAM';
  if (tipo.includes('CONSULTA')) return 'CPRE';

  if (substancias?.length) {
    const vias = substancias.map(s => s.via?.toLowerCase());
    if (vias.includes('implant')) return 'PROC';
    if (vias.some(v => v === 'iv' || v === 'ev')) return 'SESS';
    if (vias.includes('im')) return 'SESS';
  }

  return 'CPRE';
}

export function buildEventSummary(opts: {
  pacienteNome: string;
  pacienteCpf?: string;
  tipoProcedimento: string;
  substancias?: SubstanciaEvento[];
}): string {
  const nome = opts.pacienteNome.toUpperCase();
  const cpf = opts.pacienteCpf ? ` CPF ${formatCpf(opts.pacienteCpf)}` : '';
  const codigo = resolveCodigoSemantico(opts.tipoProcedimento, opts.substancias);
  return `${nome}${cpf} [${codigo}]`;
}

const COR_POR_TIPO: Record<string, string> = {
  'APLICACAO ENDOVENOSA': '9',
  'APLICACAO INTRAMUSCULAR': '5',
  'IMPLANTE': '11',
  'CONSULTA': '7',
  'INFUSAO': '9',
  'EXAME': '3',
};

function getEventColor(tipoProcedimento: string): string {
  for (const [key, color] of Object.entries(COR_POR_TIPO)) {
    if (tipoProcedimento.includes(key)) return color;
  }
  return '1';
}

export async function createCalendarEvent(data: SessaoCalendarData): Promise<any> {
  const calendar = await getCalendarClient();

  const startDateTime = `${data.dataAgendada}T${data.horaAgendada}:00`;
  const endDateTime = `${data.dataAgendada}T${data.horaFim}:00`;

  const description = buildEventDescription({
    pacienteNome: data.pacienteNome,
    pacienteCpf: data.pacienteCpf,
    numeroMarcacao: data.numeroMarcacao,
    totalMarcacoes: data.totalMarcacoes,
    unidadeNome: data.unidadeNome,
    substancias: data.substancias,
    tipoProcedimento: data.tipoProcedimento,
    duracaoMin: data.duracaoMin,
    endereco: data.endereco,
  });

  const summary = buildEventSummary({
    pacienteNome: data.pacienteNome,
    pacienteCpf: data.pacienteCpf,
    tipoProcedimento: data.tipoProcedimento,
    substancias: data.substancias,
  });

  const event = {
    summary,
    description,
    start: {
      dateTime: startDateTime,
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: endDateTime,
      timeZone: 'America/Sao_Paulo',
    },
    colorId: getEventColor(data.tipoProcedimento),
  };

  const response = await calendar.events.insert({
    calendarId: data.calendarId || 'primary',
    requestBody: event,
  });

  return response.data;
}

export async function updateCalendarEventDescription(
  calendarId: string,
  eventId: string,
  substancias: SubstanciaEvento[],
  tipoProcedimento: string,
  duracaoMin: number,
  endereco?: SessaoCalendarData['endereco'],
  extra?: { pacienteNome?: string; pacienteCpf?: string; numeroMarcacao?: number; totalMarcacoes?: number; unidadeNome?: string }
): Promise<any> {
  const calendar = await getCalendarClient();

  const description = buildEventDescription({
    pacienteNome: extra?.pacienteNome || '',
    pacienteCpf: extra?.pacienteCpf,
    numeroMarcacao: extra?.numeroMarcacao,
    totalMarcacoes: extra?.totalMarcacoes,
    unidadeNome: extra?.unidadeNome,
    substancias,
    tipoProcedimento,
    duracaoMin,
    endereco,
  });

  const summary = buildEventSummary({
    pacienteNome: extra?.pacienteNome || '',
    pacienteCpf: extra?.pacienteCpf,
    tipoProcedimento,
    substancias,
  });

  const response = await calendar.events.patch({
    calendarId: calendarId || 'primary',
    eventId,
    requestBody: { summary, description },
  });

  return response.data;
}

export async function deleteCalendarEvent(calendarId: string, eventId: string): Promise<void> {
  const calendar = await getCalendarClient();
  await calendar.events.delete({
    calendarId: calendarId || 'primary',
    eventId,
  });
}

export async function listCalendarEvents(calendarId: string, timeMin: string, timeMax: string): Promise<any[]> {
  const calendar = await getCalendarClient();

  const response = await calendar.events.list({
    calendarId: calendarId || 'primary',
    timeMin: new Date(timeMin).toISOString(),
    timeMax: new Date(timeMax).toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  return response.data.items || [];
}

export async function listCalendars(): Promise<any[]> {
  const calendar = await getCalendarClient();
  const response = await calendar.calendarList.list();
  return response.data.items || [];
}
