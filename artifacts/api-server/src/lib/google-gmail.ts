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

interface SubstanciaEmailDetalhada extends SubstanciaEmail {
  funcaoPrincipal?: string;
  efeitosPercebidos?: string;
  tempoParaEfeito?: string;
  beneficioEnergia?: string;
  beneficioSono?: string;
  clarezaMental?: string;
  suporteImunologico?: string;
  contraindicacoes?: string;
}

const viaLabel: Record<string, string> = {
  iv: 'ENDOVENOSA (IV)',
  im: 'INTRAMUSCULAR (IM)',
  sc: 'SUBCUTANEA (SC)',
  oral: 'ORAL',
  topica: 'TOPICA',
  implante: 'IMPLANTE',
};

function buildPreSessaoHtml(opts: {
  pacienteNome: string;
  data: string;
  hora: string;
  unidade: string;
  endereco?: string;
  tipoProcedimento: string;
  duracaoMin: number;
  substancias: SubstanciaEmail[];
  isPrimeiraSessao?: boolean;
  substanciasDetalhadas?: SubstanciaEmailDetalhada[];
  medicoNome?: string;
}): string {
  const subsRows = opts.substancias.map(s =>
    `<tr><td style="padding:8px;border:1px solid #ddd">${s.nome.toUpperCase()}</td><td style="padding:8px;border:1px solid #ddd">${(viaLabel[s.via] || s.via).toUpperCase()}</td><td style="padding:8px;border:1px solid #ddd">${s.dose}</td></tr>`
  ).join('');

  let detalhesSection = '';
  if (opts.isPrimeiraSessao && opts.substanciasDetalhadas && opts.substanciasDetalhadas.length > 0) {
    const detalhes = opts.substanciasDetalhadas.map(s => {
      const beneficios: string[] = [];
      if (s.beneficioEnergia) beneficios.push(`Energia: ${s.beneficioEnergia}`);
      if (s.beneficioSono) beneficios.push(`Sono: ${s.beneficioSono}`);
      if (s.clarezaMental) beneficios.push(`Clareza Mental: ${s.clarezaMental}`);
      if (s.suporteImunologico) beneficios.push(`Imunidade: ${s.suporteImunologico}`);

      return `
      <div style="background:#f8f9fa;border-left:4px solid #1a1a2e;padding:12px;margin:8px 0">
        <h4 style="color:#1a1a2e;margin:0 0 6px 0">${s.nome.toUpperCase()} (${(viaLabel[s.via] || s.via).toUpperCase()})</h4>
        ${s.funcaoPrincipal ? `<p style="margin:4px 0;color:#333"><strong>Funcao:</strong> ${s.funcaoPrincipal}</p>` : ''}
        ${s.efeitosPercebidos ? `<p style="margin:4px 0;color:#2e7d32"><strong>Efeitos Esperados:</strong> ${s.efeitosPercebidos}</p>` : ''}
        ${s.tempoParaEfeito ? `<p style="margin:4px 0;color:#e65100"><strong>Tempo para Efeito:</strong> ${s.tempoParaEfeito}</p>` : ''}
        ${beneficios.length > 0 ? `<p style="margin:4px 0;color:#1565c0"><strong>Beneficios:</strong> ${beneficios.join(' | ')}</p>` : ''}
        ${s.contraindicacoes ? `<p style="margin:4px 0;color:#c62828;font-size:11px"><strong>Atencao:</strong> ${s.contraindicacoes}</p>` : ''}
      </div>`;
    }).join('');

    detalhesSection = `
    <h3 style="color:#1a1a2e;margin-top:25px;border-bottom:2px solid #1a1a2e;padding-bottom:5px">DETALHES DAS SUBSTANCIAS</h3>
    <p style="color:#666;font-size:12px;margin-bottom:10px">Por ser sua primeira sessao, preparamos informacoes detalhadas sobre cada substancia do seu protocolo:</p>
    ${detalhes}`;
  }

  const prepSection = opts.isPrimeiraSessao ? `
    <div style="background:#e8f5e9;padding:15px;margin:15px 0;border-left:4px solid #2e7d32">
      <h3 style="color:#2e7d32;margin:0 0 8px 0">ORIENTACOES PARA SUA PRIMEIRA SESSAO</h3>
      <ul style="margin:0;padding-left:20px;color:#333">
        <li>Venha alimentado(a) — evite jejum prolongado</li>
        <li>Traga documento com foto e CPF</li>
        <li>Use roupas confortaveis, preferencialmente com manga curta</li>
        <li>Informe qualquer medicamento em uso atual</li>
        <li>Chegue com 15 minutos de antecedencia para avaliacao de enfermagem</li>
        <li>Hidrate-se bem antes da sessao</li>
      </ul>
    </div>` : '';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#1a1a2e;color:#fff;padding:20px;text-align:center">
    <h1 style="margin:0;font-size:24px">CLINICA PADUA</h1>
    <p style="margin:5px 0 0;opacity:0.8">MEDICINA INTEGRATIVA</p>
  </div>
  <div style="background:#fff;padding:20px;border:1px solid #eee">
    <h2 style="color:#1a1a2e">OLA, ${opts.pacienteNome.toUpperCase()}</h2>
    <p>Sua sessao esta agendada${opts.isPrimeiraSessao ? ' — <strong>sua primeira sessao conosco!</strong>' : ':'}
    ${opts.medicoNome ? `<br>Profissional responsavel: <strong>Dr(a). ${opts.medicoNome}</strong>` : ''}</p>
    <table style="width:100%;border-collapse:collapse;margin:15px 0">
      <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5">DATA</td><td style="padding:8px">${opts.data}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5">HORARIO</td><td style="padding:8px">${opts.hora}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5">LOCAL</td><td style="padding:8px">${opts.unidade.toUpperCase()}</td></tr>
      ${opts.endereco ? `<tr><td style="padding:8px;font-weight:bold;background:#f5f5f5">ENDERECO</td><td style="padding:8px">${opts.endereco.toUpperCase()}</td></tr>` : ''}
      <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5">PROCEDIMENTO</td><td style="padding:8px">${opts.tipoProcedimento}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5">DURACAO</td><td style="padding:8px">${opts.duracaoMin} MINUTOS</td></tr>
    </table>
    ${prepSection}
    <h3 style="color:#1a1a2e;margin-top:20px">SUBSTANCIAS PROGRAMADAS</h3>
    <table style="width:100%;border-collapse:collapse;margin:15px 0">
      <tr style="background:#1a1a2e;color:#fff"><th style="padding:8px;text-align:left">SUBSTANCIA</th><th style="padding:8px;text-align:left">VIA</th><th style="padding:8px;text-align:left">DOSE</th></tr>
      ${subsRows}
    </table>
    ${detalhesSection}
    <p style="color:#666;font-size:12px;margin-top:20px">Este e um email automatico. Nao responda.</p>
  </div>
  <div style="background:#f5f5f5;padding:10px;text-align:center;font-size:11px;color:#999">
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
  sessaoNumero?: number;
  totalSessoes?: number;
  aderencia?: number;
  proximaSessao?: string;
  observacoes?: string;
}): string {
  const subsRows = opts.substancias.map(s => {
    const isAplicada = s.status === 'aplicada';
    const statusLabel = isAplicada ? 'APLICADA' : s.status === 'nao_aplicada' ? 'NAO APLICADA' : s.status.toUpperCase();
    const statusColor = isAplicada ? '#2e7d32' : '#c62828';
    const statusDot = isAplicada ? '&#9679;' : '&#9675;';
    return `<tr>
      <td style="padding:8px;border:1px solid #ddd">${s.nome.toUpperCase()}</td>
      <td style="padding:8px;border:1px solid #ddd">${(viaLabel[s.via] || s.via).toUpperCase()}</td>
      <td style="padding:8px;border:1px solid #ddd">${s.dose}</td>
      <td style="padding:8px;border:1px solid #ddd;color:${statusColor};font-weight:bold">${statusDot} ${statusLabel}</td>
    </tr>`;
  }).join('');

  const totalAplicadas = opts.substancias.filter(s => s.status === 'aplicada').length;
  const totalSubs = opts.substancias.length;

  let progressSection = '';
  if (opts.sessaoNumero != null || opts.aderencia != null) {
    const progressParts: string[] = [];
    if (opts.sessaoNumero != null && opts.totalSessoes != null) {
      const pct = Math.round((opts.sessaoNumero / opts.totalSessoes) * 100);
      progressParts.push(`
      <div style="margin:8px 0">
        <strong>Progresso do Protocolo:</strong> Sessao ${opts.sessaoNumero} de ${opts.totalSessoes}
        <div style="background:#e0e0e0;height:12px;margin-top:4px">
          <div style="background:#0d7377;height:12px;width:${pct}%"></div>
        </div>
      </div>`);
    }
    if (opts.aderencia != null) {
      progressParts.push(`<p><strong>Aderencia ao Protocolo:</strong> <span style="color:${opts.aderencia >= 80 ? '#2e7d32' : opts.aderencia >= 50 ? '#e65100' : '#c62828'};font-size:18px;font-weight:bold">${opts.aderencia}%</span></p>`);
    }

    progressSection = `
    <div style="background:#e0f2f1;padding:15px;margin:15px 0;border-left:4px solid #0d7377">
      <h3 style="color:#0d7377;margin:0 0 8px 0">ACOMPANHAMENTO</h3>
      ${progressParts.join('')}
    </div>`;
  }

  const proximaSection = opts.proximaSessao ? `
    <div style="background:#e3f2fd;padding:12px;margin:15px 0;border-left:4px solid #1565c0">
      <p style="margin:0"><strong>Proxima sessao:</strong> ${opts.proximaSessao}</p>
    </div>` : '';

  const obsSection = opts.observacoes ? `
    <div style="background:#fff8e1;padding:12px;margin:15px 0;border-left:4px solid #f9a825">
      <p style="margin:0"><strong>Observacoes:</strong> ${opts.observacoes}</p>
    </div>` : '';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#0d7377;color:#fff;padding:20px;text-align:center">
    <h1 style="margin:0;font-size:24px">CLINICA PADUA</h1>
    <p style="margin:5px 0 0;opacity:0.8">RELATORIO POS-SESSAO</p>
  </div>
  <div style="background:#fff;padding:20px;border:1px solid #eee">
    <h2 style="color:#0d7377">SESSAO CONCLUIDA</h2>
    <p>${opts.pacienteNome.toUpperCase()} - ${opts.data}</p>
    <p><strong>PROCEDIMENTO:</strong> ${opts.tipoProcedimento}</p>
    <p style="color:#666">Substancias aplicadas: <strong>${totalAplicadas}/${totalSubs}</strong></p>
    <h3 style="color:#0d7377">SUBSTANCIAS</h3>
    <table style="width:100%;border-collapse:collapse;margin:15px 0">
      <tr style="background:#0d7377;color:#fff"><th style="padding:8px;text-align:left">SUBSTANCIA</th><th style="padding:8px;text-align:left">VIA</th><th style="padding:8px;text-align:left">DOSE</th><th style="padding:8px;text-align:left">STATUS</th></tr>
      ${subsRows}
    </table>
    ${progressSection}
    ${proximaSection}
    ${obsSection}
    <p style="color:#666;font-size:12px;margin-top:20px">Este e um email automatico. Nao responda.</p>
  </div>
  <div style="background:#f5f5f5;padding:10px;text-align:center;font-size:11px;color:#999">
    CLINICA PADUA - clinica.padua.agenda@gmail.com
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
    isPrimeiraSessao?: boolean;
    substanciasDetalhadas?: SubstanciaEmailDetalhada[];
    medicoNome?: string;
  }
): Promise<any> {
  const gmail = await getGmailClient();
  const html = buildPreSessaoHtml(opts);
  const subjectPrefix = opts.isPrimeiraSessao ? 'PRIMEIRA SESSAO' : 'SESSAO AGENDADA';
  const raw = createEmailRaw(
    toEmail,
    `${subjectPrefix} - ${opts.data} - ${opts.tipoProcedimento}`,
    html
  );

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  return res.data;
}

function createEmailWithAttachment(
  to: string,
  subject: string,
  htmlBody: string,
  attachment: { filename: string; content: Buffer; mimeType: string },
  from?: string
): string {
  const fromAddr = sanitizeEmail(from || 'clinica.padua.agenda@gmail.com');
  const toAddr = sanitizeEmail(to);
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const messageParts = [
    `From: CLINICA PADUA <${fromAddr}>`,
    `To: ${toAddr}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(htmlBody).toString('base64'),
    '',
    `--${boundary}`,
    `Content-Type: ${attachment.mimeType}`,
    `Content-Disposition: attachment; filename="${attachment.filename}"`,
    'Content-Transfer-Encoding: base64',
    '',
    attachment.content.toString('base64'),
    '',
    `--${boundary}--`,
  ];

  const raw = messageParts.join('\r\n');
  return Buffer.from(raw).toString('base64url');
}

export async function sendEmailWithPdf(
  toEmail: string,
  subject: string,
  htmlBody: string,
  pdfBuffer: Buffer,
  pdfFilename: string
): Promise<any> {
  const gmail = await getGmailClient();
  const raw = createEmailWithAttachment(
    toEmail, subject, htmlBody,
    { filename: pdfFilename, content: pdfBuffer, mimeType: 'application/pdf' }
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
    sessaoNumero?: number;
    totalSessoes?: number;
    aderencia?: number;
    proximaSessao?: string;
    observacoes?: string;
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
