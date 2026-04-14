export type AcaoEmail = 'INFORMATIVO' | 'LEMBRETE' | 'ALERTA' | 'CONFIRMACAO' | 'AGRADECIMENTO' | 'URGENTE' | 'CONVITE' | 'ACOMPANHAMENTO';

export const ACOES_EMAIL: Record<AcaoEmail, {
  label: string;
  cor: string;
  icone: string;
  tom: string;
}> = {
  INFORMATIVO: {
    label: 'Informativo',
    cor: '#1a1a2e',
    icone: 'ℹ️',
    tom: 'Cordial e objetivo',
  },
  LEMBRETE: {
    label: 'Lembrete',
    cor: '#2e5090',
    icone: '🔔',
    tom: 'Gentil e pontual',
  },
  ALERTA: {
    label: 'Alerta',
    cor: '#c62828',
    icone: '⚠️',
    tom: 'Respeitoso e urgente',
  },
  CONFIRMACAO: {
    label: 'Confirmacao',
    cor: '#0d7377',
    icone: '✅',
    tom: 'Positivo e acolhedor',
  },
  AGRADECIMENTO: {
    label: 'Agradecimento',
    cor: '#5c6bc0',
    icone: '🤝',
    tom: 'Caloroso e elegante',
  },
  URGENTE: {
    label: 'Urgente',
    cor: '#b71c1c',
    icone: '🚨',
    tom: 'Direto e imperativo',
  },
  CONVITE: {
    label: 'Convite',
    cor: '#6a1b9a',
    icone: '📩',
    tom: 'Elegante e convidativo',
  },
  ACOMPANHAMENTO: {
    label: 'Acompanhamento',
    cor: '#00695c',
    icone: '📊',
    tom: 'Profissional e motivador',
  },
};

export type TipoDocumento =
  | 'RAS Evolutivo'
  | 'RAS Documental'
  | 'RAS Pos-Procedimento'
  | 'Receita Medica'
  | 'Solicitacao de Exames'
  | 'Justificativa Medica'
  | 'Atestado Medico'
  | 'Declaracao de Comparecimento'
  | 'Relatorio Clinico'
  | 'Protocolo Injetavel'
  | 'Orientacoes Pos-Sessao'
  | 'Termo de Consentimento';

export interface EmailOpts {
  nick: string;
  medicoNome: string;
  tipoDocumento: TipoDocumento | string;
  acao: AcaoEmail;
  pacienteNome: string;
  tratamento?: string;

  protocolo?: string;
  sessaoAtual?: number;
  totalSessoes?: number;
  aderencia?: number;
  data?: string;
  hora?: string;

  substancias?: string[];

  unidadeNome?: string;
  endereco?: string;
  googleMapsUrl?: string;
  wazeUrl?: string;

  whatsapp?: string;
  telefone?: string;
  emailContato?: string;

  observacoes?: string;
  proximaSessao?: string;
  corpoPrincipal?: string;
}

function formatNome(nome: string): string {
  return nome
    .split(' ')
    .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ');
}

function buildSubject(opts: EmailOpts): string {
  const acao = ACOES_EMAIL[opts.acao];
  return `${opts.nick} - ${opts.medicoNome} - ${opts.tipoDocumento} - ${acao.label}`;
}

function buildHtml(opts: EmailOpts): string {
  const acao = ACOES_EMAIL[opts.acao];
  const nomeFormatado = formatNome(opts.pacienteNome);

  let detalhesBlock = '';
  if (opts.protocolo || opts.data || opts.hora || opts.sessaoAtual) {
    const rows: string[] = [];
    if (opts.protocolo) rows.push(tr('PROTOCOLO', opts.protocolo));
    if (opts.data) rows.push(tr('DATA', opts.data));
    if (opts.hora) rows.push(tr('HORARIO', opts.hora));
    if (opts.sessaoAtual && opts.totalSessoes)
      rows.push(tr('PROGRESSO', `Sessao ${opts.sessaoAtual} de ${opts.totalSessoes}`));
    if (opts.aderencia != null)
      rows.push(tr('ADERENCIA', `${opts.aderencia}%`));
    if (opts.medicoNome) rows.push(tr('RESPONSAVEL', opts.medicoNome));

    detalhesBlock = `
    <table style="width:100%;border-collapse:collapse;margin:24px 0" cellpadding="0" cellspacing="0">
      ${rows.join('')}
    </table>`;
  }

  let substanciasBlock = '';
  if (opts.substancias && opts.substancias.length > 0) {
    const items = opts.substancias.map(s =>
      `<li style="padding:6px 0;border-bottom:1px solid #f0ece4;font-size:13px;color:#333;letter-spacing:0.3px">${s}</li>`
    ).join('');
    substanciasBlock = `
    <div style="margin:24px 0">
      <div style="font-size:10px;letter-spacing:2px;color:#999;margin-bottom:8px;font-weight:600">SUBSTANCIAS / ITENS DO PROTOCOLO</div>
      <ul style="list-style:none;padding:0;margin:0;border-top:1px solid #e8e4dc">
        ${items}
      </ul>
    </div>`;
  }

  let localBlock = '';
  if (opts.unidadeNome || opts.endereco) {
    let linksHtml = '';
    if (opts.googleMapsUrl || opts.wazeUrl || opts.endereco) {
      const links: string[] = [];
      const mapsUrl = opts.googleMapsUrl || (opts.endereco ? `https://www.google.com/maps/search/${encodeURIComponent(opts.endereco)}` : '');
      const wUrl = opts.wazeUrl || (opts.endereco ? `https://www.waze.com/ul?q=${encodeURIComponent(opts.endereco)}` : '');
      if (mapsUrl) links.push(`<a href="${mapsUrl}" style="color:${acao.cor};text-decoration:none;font-size:12px;font-weight:600;letter-spacing:0.5px">Google Maps</a>`);
      if (wUrl) links.push(`<a href="${wUrl}" style="color:${acao.cor};text-decoration:none;font-size:12px;font-weight:600;letter-spacing:0.5px">Waze</a>`);
      linksHtml = `<div style="margin-top:10px">${links.join('&nbsp;&nbsp;|&nbsp;&nbsp;')}</div>`;
    }

    localBlock = `
    <div style="background:#faf9f7;padding:20px;margin:24px 0;border-left:3px solid ${acao.cor}">
      <div style="font-size:10px;letter-spacing:2px;color:#999;margin-bottom:8px;font-weight:600">LOCAL DE ATENDIMENTO</div>
      ${opts.unidadeNome ? `<div style="font-size:14px;font-weight:600;color:#333;margin-bottom:4px">${opts.unidadeNome}</div>` : ''}
      ${opts.endereco ? `<div style="font-size:13px;color:#666;line-height:1.5">${opts.endereco}</div>` : ''}
      ${linksHtml}
    </div>`;
  }

  let progressBlock = '';
  if (opts.sessaoAtual != null && opts.totalSessoes != null && opts.totalSessoes > 0) {
    const pct = Math.round((opts.sessaoAtual / opts.totalSessoes) * 100);
    progressBlock = `
    <div style="margin:20px 0">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span style="font-size:10px;letter-spacing:2px;color:#999;font-weight:600">PROGRESSO DO PROTOCOLO</span>
        <span style="font-size:13px;font-weight:700;color:${acao.cor}">${pct}%</span>
      </div>
      <div style="background:#e8e4dc;height:6px">
        <div style="background:${acao.cor};height:6px;width:${pct}%"></div>
      </div>
    </div>`;
  }

  let proximaBlock = '';
  if (opts.proximaSessao) {
    proximaBlock = `
    <div style="background:#f0f7ff;padding:16px 20px;margin:24px 0;border-left:3px solid #1565c0">
      <div style="font-size:10px;letter-spacing:2px;color:#999;margin-bottom:6px;font-weight:600">PROXIMA SESSAO</div>
      <div style="font-size:14px;color:#1565c0;font-weight:600">${opts.proximaSessao}</div>
    </div>`;
  }

  let obsBlock = '';
  if (opts.observacoes) {
    obsBlock = `
    <div style="background:#fffbf0;padding:16px 20px;margin:24px 0;border-left:3px solid #d4a017">
      <div style="font-size:10px;letter-spacing:2px;color:#999;margin-bottom:6px;font-weight:600">OBSERVACOES</div>
      <div style="font-size:13px;color:#555;line-height:1.7">${opts.observacoes}</div>
    </div>`;
  }

  let contatoBlock = '';
  if (opts.whatsapp || opts.telefone || opts.emailContato) {
    const canais: string[] = [];
    if (opts.whatsapp)
      canais.push(`<div style="padding:8px 0;border-bottom:1px solid #f0ece4">
        <span style="font-size:10px;letter-spacing:1.5px;color:#999;display:block;margin-bottom:2px">WHATSAPP</span>
        <a href="https://wa.me/55${opts.whatsapp.replace(/\D/g, '')}" style="color:${acao.cor};text-decoration:none;font-size:14px;font-weight:600">${opts.whatsapp}</a>
      </div>`);
    if (opts.telefone)
      canais.push(`<div style="padding:8px 0;border-bottom:1px solid #f0ece4">
        <span style="font-size:10px;letter-spacing:1.5px;color:#999;display:block;margin-bottom:2px">TELEFONE</span>
        <a href="tel:+55${opts.telefone.replace(/\D/g, '')}" style="color:${acao.cor};text-decoration:none;font-size:14px;font-weight:600">+55 ${opts.telefone}</a>
      </div>`);
    if (opts.emailContato)
      canais.push(`<div style="padding:8px 0">
        <span style="font-size:10px;letter-spacing:1.5px;color:#999;display:block;margin-bottom:2px">EMAIL</span>
        <a href="mailto:${opts.emailContato}" style="color:${acao.cor};text-decoration:none;font-size:14px;font-weight:600">${opts.emailContato}</a>
      </div>`);

    contatoBlock = `
    <div style="margin:28px 0">
      <div style="font-size:10px;letter-spacing:2px;color:#999;margin-bottom:12px;font-weight:600">CANAIS DE COMUNICACAO</div>
      <div style="background:#faf9f7;padding:16px 20px">
        ${canais.join('')}
      </div>
    </div>`;
  }

  const corpoPrincipal = opts.corpoPrincipal || buildCorpoPadrao(opts, acao);

  const ctaBlock = opts.acao === 'LEMBRETE' || opts.acao === 'CONFIRMACAO'
    ? `<div style="text-align:center;margin:28px 0">
        <div style="font-size:12px;color:#666;line-height:1.6;font-style:italic">
          Por gentileza, confirme este procedimento atraves dos nossos canais de comunicacao.
        </div>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Georgia','Times New Roman',serif;max-width:600px;margin:0 auto;padding:0;background:#f5f4f0">

  <div style="background:${acao.cor};padding:32px 28px;text-align:center">
    <div style="font-size:10px;letter-spacing:4px;color:rgba(255,255,255,0.5);margin-bottom:10px;font-weight:600">PAWARDS - ${opts.nick}</div>
    <div style="width:40px;height:1px;background:rgba(255,255,255,0.3);margin:0 auto 10px auto"></div>
    <div style="font-size:18px;font-weight:400;color:#fff;letter-spacing:1px">${opts.tipoDocumento}</div>
    <div style="font-size:10px;letter-spacing:3px;color:rgba(255,255,255,0.6);margin-top:8px;font-weight:600">${acao.label.toUpperCase()}</div>
  </div>

  <div style="background:#fff;padding:36px 32px">

    <p style="font-size:15px;color:#333;line-height:1.8;margin:0 0 8px 0">
      Prezado(a) Sr(a). <strong>${nomeFormatado}</strong>,
    </p>
    <p style="font-size:14px;color:#555;line-height:1.8;margin:0 0 24px 0">
      Tudo bem?
    </p>

    <div style="font-size:14px;color:#444;line-height:1.8;margin-bottom:24px">
      ${corpoPrincipal}
    </div>

    ${detalhesBlock}
    ${substanciasBlock}
    ${progressBlock}
    ${localBlock}
    ${proximaBlock}
    ${obsBlock}
    ${ctaBlock}
    ${contatoBlock}

    <div style="border-top:1px solid #e8e4dc;padding-top:24px;margin-top:32px">
      <p style="font-size:13px;color:#555;line-height:1.7;margin:0">
        Atenciosamente,
      </p>
      <p style="font-size:14px;color:#333;font-weight:600;margin:8px 0 2px 0">
        ${opts.medicoNome}
      </p>
      <p style="font-size:12px;color:#888;margin:0;letter-spacing:0.5px">
        ${opts.nick} — Medicina Integrativa e Longevidade
      </p>
    </div>

  </div>

  <div style="padding:20px 28px;text-align:center;background:#faf9f7">
    <div style="font-size:10px;letter-spacing:2px;color:#bbb;margin-bottom:6px;font-weight:600">PAWARDS - ${opts.nick}</div>
    <div style="font-size:9px;color:#ccc;letter-spacing:1px">Developed by Pawards MedCore</div>
  </div>

</body>
</html>`;
}

function tr(label: string, value: string): string {
  return `<tr>
    <td style="padding:10px 12px;font-size:10px;letter-spacing:1.5px;color:#999;font-weight:600;width:130px;vertical-align:top;border-bottom:1px solid #f0ece4">${label}</td>
    <td style="padding:10px 12px;font-size:13px;color:#333;font-weight:500;border-bottom:1px solid #f0ece4">${value}</td>
  </tr>`;
}

function buildCorpoPadrao(opts: EmailOpts, acao: typeof ACOES_EMAIL[AcaoEmail]): string {
  const nick = opts.nick;

  switch (opts.acao) {
    case 'INFORMATIVO':
      return `O <strong>${nick}</strong> vem, atraves deste, informa-lo(a) sobre ${opts.tipoDocumento ? `o documento <strong>${opts.tipoDocumento}</strong>` : 'o procedimento'} referente ao seu ${opts.tratamento ? `tratamento de <strong>${opts.tratamento}</strong>` : 'protocolo em andamento'}. Em anexo, segue a documentacao completa para seu acompanhamento pessoal.`;

    case 'LEMBRETE':
      return `O <strong>${nick}</strong> vem, atraves deste, lembra-lo(a) sobre seu agendamento${opts.tratamento ? ` referente ao protocolo de <strong>${opts.tratamento}</strong>` : ''}. Confira os detalhes abaixo e, por gentileza, confirme sua presenca.`;

    case 'ALERTA':
      return `O <strong>${nick}</strong> vem, atraves deste, alertar sobre uma informacao importante referente ao seu ${opts.tratamento ? `tratamento de <strong>${opts.tratamento}</strong>` : 'acompanhamento clinico'}. Solicitamos sua atencao aos detalhes abaixo.`;

    case 'CONFIRMACAO':
      return `O <strong>${nick}</strong> vem, atraves deste, confirmar ${opts.tipoDocumento ? `o registro de <strong>${opts.tipoDocumento}</strong>` : 'seu procedimento'}${opts.tratamento ? ` referente ao protocolo de <strong>${opts.tratamento}</strong>` : ''}. Em anexo, segue a documentacao para seu arquivo pessoal.`;

    case 'AGRADECIMENTO':
      return `O <strong>${nick}</strong> agradece sua confianca e dedicacao ao seu tratamento. ${opts.tratamento ? `Seu comprometimento com o protocolo de <strong>${opts.tratamento}</strong> e fundamental para os melhores resultados.` : 'Sua presenca e comprometimento sao essenciais para o sucesso do tratamento.'}`;

    case 'URGENTE':
      return `O <strong>${nick}</strong> solicita sua atencao <strong>imediata</strong> para o assunto abaixo. ${opts.tratamento ? `Trata-se de uma questao referente ao seu protocolo de <strong>${opts.tratamento}</strong>.` : 'Por favor, entre em contato pelos canais abaixo o mais breve possivel.'}`;

    case 'CONVITE':
      return `O <strong>${nick}</strong> tem o prazer de convida-lo(a) ${opts.tratamento ? `para dar continuidade ao seu protocolo de <strong>${opts.tratamento}</strong>` : 'para um novo procedimento'}. Confira os detalhes abaixo.`;

    case 'ACOMPANHAMENTO':
      return `O <strong>${nick}</strong> esta realizando o acompanhamento do seu ${opts.tratamento ? `protocolo de <strong>${opts.tratamento}</strong>` : 'tratamento'}. Confira abaixo o andamento e os proximos passos.`;

    default:
      return `O <strong>${nick}</strong> vem, atraves deste, comunicar informacoes referentes ao seu tratamento.`;
  }
}

export function buildEmail(opts: EmailOpts): { subject: string; html: string } {
  return {
    subject: buildSubject(opts),
    html: buildHtml(opts),
  };
}

export function buildWhatsappFormal(opts: EmailOpts): string {
  const acao = ACOES_EMAIL[opts.acao];
  const nomeFormatado = formatNome(opts.pacienteNome);
  const lines: string[] = [];

  lines.push(`${acao.icone} *${opts.nick} - ${acao.label}*`);
  lines.push('');
  lines.push(`Prezado(a) Sr(a). ${nomeFormatado},`);
  lines.push('Tudo bem?');
  lines.push('');

  switch (opts.acao) {
    case 'LEMBRETE':
      lines.push(`O ${opts.nick} vem atraves deste lembra-lo(a) sobre seu agendamento.`);
      break;
    case 'INFORMATIVO':
      lines.push(`O ${opts.nick} vem atraves deste informa-lo(a) sobre ${opts.tipoDocumento}.`);
      break;
    case 'CONFIRMACAO':
      lines.push(`O ${opts.nick} confirma seu procedimento.`);
      break;
    case 'ALERTA':
      lines.push(`O ${opts.nick} solicita sua atencao para uma informacao importante.`);
      break;
    default:
      lines.push(`O ${opts.nick} comunica informacoes sobre seu tratamento.`);
  }

  if (opts.tratamento) {
    lines.push('');
    lines.push(`📌 *${opts.tipoDocumento}*`);
    lines.push(opts.tratamento);
  }

  if (opts.substancias && opts.substancias.length > 0) {
    lines.push('');
    lines.push('💊 *Protocolo*');
    opts.substancias.forEach(s => lines.push(`  • ${s}`));
  }

  if (opts.data) {
    lines.push('');
    lines.push(`📅 *Data*: ${opts.data}`);
  }
  if (opts.hora) {
    lines.push(`🕐 *Horario*: ${opts.hora}`);
  }

  if (opts.unidadeNome || opts.endereco) {
    lines.push('');
    lines.push('📍 *Local de Atendimento*');
    if (opts.unidadeNome) lines.push(opts.unidadeNome);
    if (opts.endereco) lines.push(opts.endereco);
    if (opts.googleMapsUrl || opts.endereco) {
      const url = opts.googleMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(opts.endereco || '')}`;
      lines.push(`Google Maps: ${url}`);
    }
  }

  if (opts.acao === 'LEMBRETE' || opts.acao === 'CONFIRMACAO') {
    lines.push('');
    lines.push('Por gentileza, confirme este procedimento atraves dos nossos canais de comunicacao.');
  }

  if (opts.whatsapp || opts.telefone || opts.emailContato) {
    lines.push('');
    if (opts.whatsapp) lines.push(`📱 WhatsApp: ${opts.whatsapp}`);
    if (opts.telefone) lines.push(`📞 Telefone: +55 ${opts.telefone}`);
    if (opts.emailContato) lines.push(`✉️ Email: ${opts.emailContato}`);
  }

  lines.push('');
  lines.push('Atenciosamente,');
  lines.push(`*${opts.medicoNome}*`);
  lines.push(`PAWARDS - ${opts.nick}`);
  lines.push('');
  lines.push('_Developed by Pawards MedCore_');

  return lines.join('\n');
}
