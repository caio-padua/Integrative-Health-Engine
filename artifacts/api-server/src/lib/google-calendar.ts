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

function statusDot(status: string): string {
  switch (status) {
    case 'disp': return '🟢 DISP';
    case 'aplicada': return '🔵 APLICADA';
    case 'prox': return '🟤 PROX';
    case 'nao_aplicada': return '⚫ N/A';
    default: return '⚪ ' + status.toUpperCase();
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

function determineSessionStatus(substancias: SubstanciaEvento[]): { label: string; dot: string } {
  if (!substancias.length) return { label: 'A REALIZAR', dot: '🟡' };

  const hasAplicada = substancias.some(s => s.status === 'aplicada');
  const allDone = substancias.every(s => s.status === 'aplicada' || s.status === 'nao_aplicada');
  const hasNaoAplicada = substancias.some(s => s.status === 'nao_aplicada');

  if (allDone && hasAplicada && !hasNaoAplicada) return { label: 'REALIZADO', dot: '🔵' };
  if (allDone && hasNaoAplicada && !hasAplicada) return { label: 'NAO REALIZADO', dot: '⚫' };
  if (allDone) return { label: 'REALIZADO', dot: '🔵' };
  return { label: 'A REALIZAR', dot: '🟡' };
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

  lines.push('PADCOM - PROTOCOLOS INJETAVEIS');
  lines.push('');
  lines.push(pacienteNome.toUpperCase());
  if (pacienteCpf) lines.push(`CPF ${formatCpf(pacienteCpf)}`);
  if (numeroMarcacao) lines.push(`Marcacao ${numeroMarcacao}${totalMarcacoes ? '/' + totalMarcacoes : ''}`);
  if (unidadeNome) lines.push(`Unidade ${unidadeNome}`);
  lines.push('');

  lines.push('PROCEDIMENTO:');
  lines.push(`CONSULTA - DURACAO: 60 MINUTOS ${temConsulta ? '✅' : '❎'}`);
  lines.push(`APLICACAO ENDOVENOSA - DURACAO: 30 MINUTOS ${temEV ? '✅' : '❎'}`);
  lines.push(`APLICACAO INTRAMUSCULAR - DURACAO: 15 MINUTOS ${temIM ? '✅' : '❎'}`);
  lines.push(`IMPLANTE - DURACAO: 60 MINUTOS ${temImplante ? '✅' : '❎'}`);
  lines.push('');
  lines.push(`DURACAO TOTAL: ${duracaoMin} MINUTOS`);
  lines.push('');

  const sessionStatus = determineSessionStatus(substancias);
  lines.push(`STATUS: ${sessionStatus.label} ${sessionStatus.dot}`);
  lines.push('');

  lines.push('SUBSTANCIAS DO PROTOCOLO:');
  for (const s of substancias) {
    lines.push(`${statusDot(s.status)} ${s.nome.toUpperCase()} (${s.via?.toUpperCase() || '-'}) - ${s.dose}`);
  }
  lines.push('');

  lines.push('---');
  lines.push('LEGENDA');
  lines.push('🟢 DISP - DISPONIVEL PARA APLICACAO HOJE');
  lines.push('🔵 APLICADA - SUBSTANCIA JA APLICADA');
  lines.push('🟤 PROX - PROXIMA SESSAO');
  lines.push('⚫ N/A - NAO APLICAVEL');
  lines.push('');

  if (endereco && endereco.rua) {
    lines.push('━━━ ENDERECO ━━━');
    lines.push(`📍 ${endereco.rua.toUpperCase()}`);
    if (endereco.bairro) lines.push(`   ${endereco.bairro.toUpperCase()}`);
    if (endereco.cep) lines.push(`   CEP ${endereco.cep}`);
    if (endereco.cidade && endereco.estado) lines.push(`   ${endereco.cidade.toUpperCase()} - ${endereco.estado.toUpperCase()}`);
    lines.push('');

    const enderecoCompleto = [endereco.rua, endereco.bairro, endereco.cidade, endereco.estado, endereco.cep].filter(Boolean).join(', ');
    const enderecoEncoded = encodeURIComponent(enderecoCompleto);
    lines.push('━━━ NAVEGACAO ━━━');
    lines.push(`🗺️ GOOGLE MAPS: https://www.google.com/maps/search/?api=1&query=${enderecoEncoded}`);
    lines.push(`🧭 WAZE: https://waze.com/ul?q=${enderecoEncoded}&navigate=yes`);
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

const COR_POR_TIPO: Record<string, string> = {
  'APLICACAO ENDOVENOSA': '9',
  'APLICACAO INTRAMUSCULAR': '5',
  'IMPLANTE': '11',
  'CONSULTA': '7',
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

  const event = {
    summary: `${data.pacienteNome.toUpperCase()} - ${data.tipoProcedimento}`,
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

  const response = await calendar.events.patch({
    calendarId: calendarId || 'primary',
    eventId,
    requestBody: { description },
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
