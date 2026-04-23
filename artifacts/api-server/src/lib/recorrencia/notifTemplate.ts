/**
 * MENSAGERIA-TSUNAMI Wave 2 · Template HTML branded MEDCORE.
 *
 * Wraps any plain text or HTML body in a navy+gold institutional layout
 * for all WD14 outbound emails. Includes opt-out footer.
 *
 * Cores oficiais:
 *  - navy   #020406  (header / títulos / borders)
 *  - gold   #C89B3C  (acentos / divisor / link opt-out hover)
 *  - cream  #FAFAF7  (fundo do email)
 *  - text   #1A1A1A  (corpo)
 */

const NAVY = "#020406";
const GOLD = "#C89B3C";
const CREAM = "#FAFAF7";
const TEXT = "#1A1A1A";
const MUTED = "#6B6B6B";

export type MomentoNotif = "ENVIO_INICIAL" | "POS_ASSINATURA" | "LEMBRETE";

const MOMENTO_LABEL: Record<MomentoNotif, string> = {
  ENVIO_INICIAL: "Documento para Assinatura",
  POS_ASSINATURA: "Documento Assinado",
  LEMBRETE: "Lembrete",
};

export interface WrapEmailOpts {
  subject: string;
  bodyHtmlOrText: string;
  momento?: MomentoNotif | string;
  pacienteNome?: string;
  optOutUrl?: string;
  unidadeNick?: string;
}

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Detecta se já é HTML (tem alguma tag) — se for plain text, embrulha em <p>. */
function normalizeBody(raw: string): string {
  const s = String(raw ?? "");
  if (/<[a-z][\s\S]*>/i.test(s)) return s;
  // converte quebras de linha em <br>
  return s
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px 0;">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/**
 * Embrulha o conteúdo num email institucional MEDCORE.
 * Retorna HTML completo (com DOCTYPE), pronto para mandar.
 */
export function wrapEmailMedcore(opts: WrapEmailOpts): string {
  const subj = escapeHtml(opts.subject || "Notificação PAWARDS");
  const momentoKey = String(opts.momento || "").toUpperCase();
  const momentoLabel = (MOMENTO_LABEL as any)[momentoKey] || "Notificação";
  const unidade = escapeHtml(opts.unidadeNick || "Instituto Padua");
  const greeting = opts.pacienteNome
    ? `<p style="margin:0 0 18px 0;font-size:15px;color:${TEXT};">Olá, <strong>${escapeHtml(opts.pacienteNome)}</strong>,</p>`
    : "";
  const body = normalizeBody(opts.bodyHtmlOrText);
  const optOutLine = opts.optOutUrl
    ? `<p style="margin:6px 0 0 0;font-size:11px;color:${MUTED};">Se você não deseja mais receber estes emails, <a href="${opts.optOutUrl}" style="color:${GOLD};text-decoration:underline;">cancele sua inscrição aqui</a>.</p>`
    : `<p style="margin:6px 0 0 0;font-size:11px;color:${MUTED};">Para gerenciar suas preferências de comunicação, responda este email.</p>`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${subj}</title>
</head>
<body style="margin:0;padding:0;background:${CREAM};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${TEXT};line-height:1.55;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CREAM};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#FFFFFF;border:1px solid #E5E2D9;border-radius:6px;overflow:hidden;box-shadow:0 2px 8px rgba(2,4,6,0.06);">
        <!-- HEADER navy -->
        <tr>
          <td style="background:${NAVY};padding:28px 32px;border-bottom:3px solid ${GOLD};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:22px;font-weight:700;letter-spacing:1.2px;color:#FFFFFF;">PAWARDS</td>
                <td align="right" style="font-size:11px;letter-spacing:1.5px;color:${GOLD};text-transform:uppercase;">${unidade}</td>
              </tr>
            </table>
            <div style="margin-top:6px;font-size:12px;color:#A8A8A8;letter-spacing:0.5px;text-transform:uppercase;">${escapeHtml(momentoLabel)}</div>
          </td>
        </tr>
        <!-- BODY -->
        <tr>
          <td style="padding:32px;">
            ${greeting}
            <div style="font-size:15px;color:${TEXT};">${body}</div>
            <div style="margin-top:28px;padding-top:18px;border-top:1px solid #EAEAEA;font-size:13px;color:${MUTED};">
              Atenciosamente,<br>
              <strong style="color:${TEXT};">Equipe PAWARDS — ${unidade}</strong>
            </div>
          </td>
        </tr>
        <!-- FOOTER -->
        <tr>
          <td style="background:#F4F2EB;padding:18px 32px;border-top:1px solid #E5E2D9;">
            <p style="margin:0;font-size:11px;color:${MUTED};line-height:1.5;">
              Este email é parte do seu acompanhamento na clínica. Sua privacidade é prioridade — todas as comunicações seguem a LGPD.
            </p>
            ${optOutLine}
            <p style="margin:10px 0 0 0;font-size:10px;color:#A0A0A0;letter-spacing:0.5px;text-transform:uppercase;">Powered by <span style="color:${GOLD};">Pawards MedCore</span></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
