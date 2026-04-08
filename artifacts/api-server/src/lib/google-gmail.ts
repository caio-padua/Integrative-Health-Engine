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
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X-Replit-Token': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

export async function getGmailClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

function sanitizeEmail(email: string): string {
  return email.replace(/[\r\n]/g, '').trim();
}

function createEmailRaw(to: string, subject: string, htmlBody: string, from?: string): string {
  const fromAddr = sanitizeEmail(from || 'clinica.padua.agenda@gmail.com');
  const toAddr = sanitizeEmail(to);

  const messageParts = [
    `From: CLINICA PADUA <${fromAddr}>`,
    `To: ${toAddr}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(htmlBody).toString('base64'),
  ];

  const raw = messageParts.join('\r\n');
  return Buffer.from(raw).toString('base64url');
}

interface SubstanciaEmail {
  nome: string;
  via: string;
  dose: string;
}

function buildPreSessaoHtml(opts: {
  pacienteNome: string;
  data: string;
  hora: string;
  unidade: string;
  endereco?: string;
  tipoProcedimento: string;
  duracaoMin: number;
  substancias: SubstanciaEmail[];
}): string {
  const subsRows = opts.substancias.map(s =>
    `<tr><td style="padding:8px;border:1px solid #ddd">${s.nome.toUpperCase()}</td><td style="padding:8px;border:1px solid #ddd">${s.via.toUpperCase()}</td><td style="padding:8px;border:1px solid #ddd">${s.dose}</td></tr>`
  ).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#1a1a2e;color:#fff;padding:20px;border-radius:8px 8px 0 0;text-align:center">
    <h1 style="margin:0;font-size:24px">CLINICA PADUA</h1>
    <p style="margin:5px 0 0;opacity:0.8">MEDICINA INTEGRATIVA</p>
  </div>
  <div style="background:#fff;padding:20px;border:1px solid #eee">
    <h2 style="color:#1a1a2e">OLA, ${opts.pacienteNome.toUpperCase()}</h2>
    <p>Sua sessao esta agendada:</p>
    <table style="width:100%;border-collapse:collapse;margin:15px 0">
      <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5">DATA</td><td style="padding:8px">${opts.data}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5">HORARIO</td><td style="padding:8px">${opts.hora}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5">LOCAL</td><td style="padding:8px">${opts.unidade.toUpperCase()}</td></tr>
      ${opts.endereco ? `<tr><td style="padding:8px;font-weight:bold;background:#f5f5f5">ENDERECO</td><td style="padding:8px">${opts.endereco.toUpperCase()}</td></tr>` : ''}
      <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5">PROCEDIMENTO</td><td style="padding:8px">${opts.tipoProcedimento}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5">DURACAO</td><td style="padding:8px">${opts.duracaoMin} MINUTOS</td></tr>
    </table>
    <h3 style="color:#1a1a2e;margin-top:20px">SUBSTANCIAS PROGRAMADAS</h3>
    <table style="width:100%;border-collapse:collapse;margin:15px 0">
      <tr style="background:#1a1a2e;color:#fff"><th style="padding:8px;text-align:left">SUBSTANCIA</th><th style="padding:8px;text-align:left">VIA</th><th style="padding:8px;text-align:left">DOSE</th></tr>
      ${subsRows}
    </table>
    <p style="color:#666;font-size:12px;margin-top:20px">Este e um email automatico. Nao responda.</p>
  </div>
  <div style="background:#f5f5f5;padding:10px;text-align:center;border-radius:0 0 8px 8px;font-size:11px;color:#999">
    CLINICA PADUA - clinica.padua.agenda@gmail.com
  </div>
</body>
</html>`;
}

function buildPosSessaoHtml(opts: {
  pacienteNome: string;
  data: string;
  tipoProcedimento: string;
  substancias: (SubstanciaEmail & { status: string })[];
}): string {
  const subsRows = opts.substancias.map(s => {
    const statusLabel = s.status === 'aplicada' ? '🔵 APLICADA' : s.status === 'nao_aplicada' ? '⚫ NAO APLICADA' : '⚪ ' + s.status.toUpperCase();
    return `<tr><td style="padding:8px;border:1px solid #ddd">${s.nome.toUpperCase()}</td><td style="padding:8px;border:1px solid #ddd">${s.via.toUpperCase()}</td><td style="padding:8px;border:1px solid #ddd">${s.dose}</td><td style="padding:8px;border:1px solid #ddd">${statusLabel}</td></tr>`;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#0d7377;color:#fff;padding:20px;border-radius:8px 8px 0 0;text-align:center">
    <h1 style="margin:0;font-size:24px">CLINICA PADUA</h1>
    <p style="margin:5px 0 0;opacity:0.8">RELATORIO POS-SESSAO</p>
  </div>
  <div style="background:#fff;padding:20px;border:1px solid #eee">
    <h2 style="color:#0d7377">SESSAO CONCLUIDA</h2>
    <p>${opts.pacienteNome.toUpperCase()} - ${opts.data}</p>
    <p><strong>PROCEDIMENTO:</strong> ${opts.tipoProcedimento}</p>
    <h3 style="color:#0d7377">SUBSTANCIAS APLICADAS</h3>
    <table style="width:100%;border-collapse:collapse;margin:15px 0">
      <tr style="background:#0d7377;color:#fff"><th style="padding:8px;text-align:left">SUBSTANCIA</th><th style="padding:8px;text-align:left">VIA</th><th style="padding:8px;text-align:left">DOSE</th><th style="padding:8px;text-align:left">STATUS</th></tr>
      ${subsRows}
    </table>
    <p style="color:#666;font-size:12px;margin-top:20px">Este e um email automatico. Nao responda.</p>
  </div>
</body>
</html>`;
}

export async function sendPreSessionEmail(
  toEmail: string,
  opts: {
    pacienteNome: string;
    data: string;
    hora: string;
    unidade: string;
    endereco?: string;
    tipoProcedimento: string;
    duracaoMin: number;
    substancias: SubstanciaEmail[];
  }
): Promise<any> {
  const gmail = await getGmailClient();
  const html = buildPreSessaoHtml(opts);
  const raw = createEmailRaw(
    toEmail,
    `SESSAO AGENDADA - ${opts.data} - ${opts.tipoProcedimento}`,
    html
  );

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  return res.data;
}

export async function sendPostSessionEmail(
  toEmail: string,
  opts: {
    pacienteNome: string;
    data: string;
    tipoProcedimento: string;
    substancias: (SubstanciaEmail & { status: string })[];
  }
): Promise<any> {
  const gmail = await getGmailClient();
  const html = buildPosSessaoHtml(opts);
  const raw = createEmailRaw(
    toEmail,
    `SESSAO CONCLUIDA - ${opts.data} - ${opts.tipoProcedimento}`,
    html
  );

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  return res.data;
}
