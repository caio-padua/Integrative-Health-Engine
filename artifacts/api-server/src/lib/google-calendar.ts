import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
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

export function buildEventDescription(opts: {
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
  const { substancias, tipoProcedimento, duracaoMin, endereco } = opts;

  const vias = new Set(substancias.map(s => s.via?.toLowerCase()));
  const temIM = vias.has('im');
  const temEV = vias.has('iv') || vias.has('ev');
  const temImplante = vias.has('implant');
  const temConsulta = tipoProcedimento.includes('CONSULTA');

  const lines: string[] = [];

  lines.push('━━━ CHECKLIST DE PROCEDIMENTOS ━━━');
  lines.push(`${temEV ? '✅' : '❌'} APLICACAO ENDOVENOSA - DURACAO: 30 MINUTOS`);
  lines.push(`${temIM ? '✅' : '❌'} APLICACAO INTRAMUSCULAR - DURACAO: 15 MINUTOS`);
  lines.push(`${temImplante ? '✅' : '❌'} IMPLANTE - DURACAO: 60 MINUTOS`);
  lines.push(`${temConsulta ? '✅' : '❌'} CONSULTA - DURACAO: 60 MINUTOS`);
  lines.push('');
  lines.push(`DURACAO TOTAL: ${duracaoMin} MINUTOS`);
  lines.push('');

  lines.push('━━━ SUBSTANCIAS ━━━');
  for (const s of substancias) {
    lines.push(`${statusDot(s.status)} | ${s.nome.toUpperCase()} (${s.via?.toUpperCase() || '-'}) - ${s.dose}`);
  }
  lines.push('');

  if (endereco && endereco.rua) {
    lines.push('━━━ ENDERECO ━━━');
    lines.push(`📍 ${endereco.rua.toUpperCase()}`);
    if (endereco.bairro) lines.push(`   ${endereco.bairro.toUpperCase()}`);
    if (endereco.cep) lines.push(`   CEP ${endereco.cep}`);
    if (endereco.cidade && endereco.estado) lines.push(`   ${endereco.cidade.toUpperCase()} - ${endereco.estado.toUpperCase()}`);
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
  profissionalNome: string;
  tipoProcedimento: string;
  duracaoMin: number;
  dataAgendada: string;
  horaAgendada: string;
  horaFim: string;
  calendarId: string;
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
  endereco?: SessaoCalendarData['endereco']
): Promise<any> {
  const calendar = await getCalendarClient();

  const description = buildEventDescription({
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
