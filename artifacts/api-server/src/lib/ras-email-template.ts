export function buildRasEmailHtml(opts: {
  pacienteNome: string;
  protocolo: string;
  sessaoAtual?: number;
  totalSessoes?: number;
  aderencia?: number;
  substanciasAplicadas?: number;
  substanciasTotal?: number;
  proximaSessao?: string;
  medicoNome: string;
  unidade: string;
  data: string;
  tipoRas: 'evolutivo' | 'documental' | 'pos-procedimento';
}): { subject: string; html: string } {
  const firstName = opts.pacienteNome.split(' ')[0];
  const firstNameCapitalized = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

  const tipoLabels: Record<string, { titulo: string; subtitulo: string; corPrimaria: string; emoji: string }> = {
    evolutivo: {
      titulo: 'Acompanhamento do Seu Protocolo',
      subtitulo: 'RAS EVOLUTIVO',
      corPrimaria: '#0d7377',
      emoji: '',
    },
    documental: {
      titulo: 'Documentacao Completa do Protocolo',
      subtitulo: 'RAS DOCUMENTAL',
      corPrimaria: '#1a1a2e',
      emoji: '',
    },
    'pos-procedimento': {
      titulo: 'Registro do Seu Procedimento',
      subtitulo: 'RAS POS-PROCEDIMENTO',
      corPrimaria: '#2e5090',
      emoji: '',
    },
  };

  const tipo = tipoLabels[opts.tipoRas] || tipoLabels.evolutivo;

  let progressBar = '';
  if (opts.sessaoAtual != null && opts.totalSessoes != null && opts.totalSessoes > 0) {
    const pct = Math.round((opts.sessaoAtual / opts.totalSessoes) * 100);
    progressBar = `
    <div style="margin:20px 0">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:12px;color:#666">Sessao ${opts.sessaoAtual} de ${opts.totalSessoes}</span>
        <span style="font-size:12px;font-weight:bold;color:${tipo.corPrimaria}">${pct}%</span>
      </div>
      <div style="background:#e0e0e0;height:8px;border-radius:0">
        <div style="background:${tipo.corPrimaria};height:8px;width:${pct}%;border-radius:0"></div>
      </div>
    </div>`;
  }

  let aderenciaBlock = '';
  if (opts.aderencia != null) {
    const aderColor = opts.aderencia >= 90 ? '#2e7d32' : opts.aderencia >= 70 ? '#e65100' : '#c62828';
    const aderLabel = opts.aderencia >= 90 ? 'EXCELENTE' : opts.aderencia >= 70 ? 'BOA' : opts.aderencia >= 50 ? 'REGULAR' : 'ATENCAO';
    aderenciaBlock = `
    <div style="background:#f8f9fa;padding:12px 16px;margin:12px 0;border-left:3px solid ${aderColor}">
      <span style="font-size:11px;color:#666;letter-spacing:1px">ADERENCIA</span>
      <div style="font-size:20px;font-weight:bold;color:${aderColor};margin-top:2px">${opts.aderencia}% ${aderLabel}</div>
    </div>`;
  }

  let aplicacoesBlock = '';
  if (opts.substanciasAplicadas != null && opts.substanciasTotal != null) {
    aplicacoesBlock = `
    <div style="background:#f8f9fa;padding:12px 16px;margin:12px 0;border-left:3px solid ${tipo.corPrimaria}">
      <span style="font-size:11px;color:#666;letter-spacing:1px">SUBSTANCIAS NESTA SESSAO</span>
      <div style="font-size:16px;font-weight:bold;color:${tipo.corPrimaria};margin-top:2px">${opts.substanciasAplicadas} de ${opts.substanciasTotal} aplicadas</div>
    </div>`;
  }

  const proximaBlock = opts.proximaSessao ? `
    <div style="background:#e3f2fd;padding:12px 16px;margin:12px 0;border-left:3px solid #1565c0">
      <span style="font-size:11px;color:#666;letter-spacing:1px">PROXIMA SESSAO</span>
      <div style="font-size:14px;color:#1565c0;margin-top:2px;font-weight:600">${opts.proximaSessao}</div>
    </div>` : '';

  const subject = `${tipo.subtitulo} - ${opts.protocolo} - ${opts.data}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;padding:0;background:#f5f5f5">
  <div style="background:${tipo.corPrimaria};padding:28px 24px;text-align:center">
    <div style="font-size:11px;letter-spacing:3px;color:rgba(255,255,255,0.6);margin-bottom:8px">PAWARDS - ${opts.unidade}</div>
    <div style="font-size:20px;font-weight:700;color:#fff;letter-spacing:0.5px">${tipo.titulo}</div>
  </div>

  <div style="background:#fff;padding:28px 24px">
    <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 20px 0">
      ${firstNameCapitalized},
      <br><br>
      Segue em anexo o <strong>${tipo.subtitulo}</strong> referente ao seu protocolo.
      Este documento contem o registro detalhado da sua sessao e pode ser consultado a qualquer momento.
    </p>

    <div style="background:#fafafa;padding:16px;margin:16px 0">
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:6px 0;font-size:11px;color:#999;letter-spacing:1px;width:120px">PROTOCOLO</td>
          <td style="padding:6px 0;font-size:13px;color:#333;font-weight:600">${opts.protocolo}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:11px;color:#999;letter-spacing:1px">DATA</td>
          <td style="padding:6px 0;font-size:13px;color:#333">${opts.data}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:11px;color:#999;letter-spacing:1px">UNIDADE</td>
          <td style="padding:6px 0;font-size:13px;color:#333">${opts.unidade}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:11px;color:#999;letter-spacing:1px">RESPONSAVEL</td>
          <td style="padding:6px 0;font-size:13px;color:#333">${opts.medicoNome}</td>
        </tr>
      </table>
    </div>

    ${progressBar}
    ${aderenciaBlock}
    ${aplicacoesBlock}
    ${proximaBlock}

    <div style="background:#f0f7f7;padding:14px 16px;margin:20px 0;border-left:3px solid ${tipo.corPrimaria}">
      <p style="margin:0;font-size:12px;color:#555;line-height:1.6">
        O PDF em anexo contem todas as informacoes clinicas da sessao.
        Guarde este documento para seu acompanhamento pessoal.
      </p>
    </div>

    <p style="font-size:12px;color:#999;margin-top:24px;line-height:1.5">
      Qualquer duvida, entre em contato pelo telefone ou WhatsApp da clinica.
      <br>Estamos cuidando de voce.
    </p>
  </div>

  <div style="padding:16px 24px;text-align:center">
    <div style="font-size:11px;color:#999;letter-spacing:1px;margin-bottom:4px">PAWARDS - ${opts.unidade}</div>
    <div style="font-size:10px;color:#bbb">Medicina Integrativa e Longevidade</div>
    <div style="font-size:9px;color:#ccc;margin-top:8px">Developed by Pawards MedCore</div>
  </div>
</body>
</html>`;

  return { subject, html };
}

export function buildRasWhatsappMessage(opts: {
  pacienteNome: string;
  protocolo: string;
  sessaoAtual?: number;
  totalSessoes?: number;
  aderencia?: number;
  data: string;
  medicoNome: string;
  tipoRas: 'evolutivo' | 'documental' | 'pos-procedimento';
}): string {
  const firstName = opts.pacienteNome.split(' ')[0];
  const firstNameCapitalized = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

  const tipoEmoji: Record<string, string> = {
    evolutivo: '📊',
    documental: '📋',
    'pos-procedimento': '✅',
  };

  const tipoLabel: Record<string, string> = {
    evolutivo: 'RAS Evolutivo',
    documental: 'RAS Documental',
    'pos-procedimento': 'RAS Pos-Procedimento',
  };

  const emoji = tipoEmoji[opts.tipoRas] || '📋';
  const label = tipoLabel[opts.tipoRas] || 'RAS';

  const lines: string[] = [];

  lines.push(`${emoji} *${label}*`);
  lines.push('');
  lines.push(`${firstNameCapitalized},`);
  lines.push(`Segue o registro da sua sessao.`);
  lines.push('');
  lines.push(`📌 *Protocolo*`);
  lines.push(opts.protocolo);
  lines.push('');
  lines.push(`📅 *Data*`);
  lines.push(opts.data);

  if (opts.sessaoAtual != null && opts.totalSessoes != null) {
    const pct = Math.round((opts.sessaoAtual / opts.totalSessoes) * 100);
    lines.push('');
    lines.push(`📈 *Progresso*`);
    lines.push(`Sessao ${opts.sessaoAtual} de ${opts.totalSessoes} (${pct}%)`);
  }

  if (opts.aderencia != null) {
    const aderLabel = opts.aderencia >= 90 ? 'Excelente' : opts.aderencia >= 70 ? 'Boa' : opts.aderencia >= 50 ? 'Regular' : 'Atencao';
    lines.push('');
    lines.push(`🎯 *Aderencia*`);
    lines.push(`${opts.aderencia}% — ${aderLabel}`);
  }

  lines.push('');
  lines.push(`*${opts.medicoNome}*`);
  lines.push('PAWARDS - Instituto Padua');
  lines.push('');
  lines.push('_Developed by Pawards MedCore_');

  return lines.join('\n');
}
