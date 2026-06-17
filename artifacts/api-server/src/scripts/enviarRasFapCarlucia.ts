/**
 * Entrega do RAS FAP (já gerado e no Drive) por DOIS canais, a pedido do CEO:
 *  - E-MAIL: carlucia.fernandes.vendas@gmail.com (2 PDFs anexos)
 *  - CELULAR (WhatsApp): 11977154000 (texto com os links do Drive)
 *
 * RAS = Registro de Administracao de Substancias; FAP = Ficha de Auditoria.
 *
 * Reaproveita os arquivos PDF locais gerados na rodada anterior e os links do
 * Drive ja existentes (NAO re-sobe, pra nao duplicar arquivos na pasta).
 */
import { readFileSync } from "node:fs";
import { pool } from "@workspace/db";
import { getGmailClient } from "../lib/google-gmail";
import { enviarWhatsapp } from "../services/whatsappService";

const NOME = "CAIO HENRIQUE FERNANDES PADUA";
const EMAIL_DESTINO = "carlucia.fernandes.vendas@gmail.com";
const TELEFONE = "11977154000"; // formatarTelefone prefixa 55 -> 5511977154000
const UNIDADE_ID = 15; // Instituto Padua

const AUDIT = `${process.cwd()}/../../.local/.audit_work`;
const PDF_PREMIUM = `${AUDIT}/RAS_FAP_CAIO_PREMIUM_26.06.17_v2.pdf`;
const PDF_SIMPLES = `${AUDIT}/RAS_FAP_CAIO_SIMPLES_26.06.17_v2.pdf`;

// Links do Drive criados na rodada anterior (pasta RAS do paciente).
const DRIVE = {
  premium: "https://drive.google.com/file/d/1DSc_oEmknU6dfXtBHl0B7KVKunhzWroz/view?usp=drivesdk",
  simples: "https://drive.google.com/file/d/1n3gtlNIEMfJ3QjgHBuEDnzXEVE5SipmU/view?usp=drivesdk",
  xlsx: "https://docs.google.com/spreadsheets/d/1e9x5tXCAc1B44D8eHuho9ugnIsGjC3DY/edit?usp=drivesdk",
  pasta: "https://drive.google.com/drive/folders/1AlHstRKqDI29oA0NPhMkQnpqY6i2IHmm",
};

function sanitizeEmail(email: string): string {
  return email.replace(/[\r\n]/g, "").trim();
}

async function enviarEmailComAnexos(
  toEmail: string,
  subject: string,
  htmlBody: string,
  anexos: { filename: string; content: Buffer; mimeType: string }[],
): Promise<string> {
  const gmail = await getGmailClient();
  const boundary = `b_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const partes: string[] = [
    `From: PAWARDS - Instituto Padua <clinica.padua.agenda@gmail.com>`,
    `To: ${sanitizeEmail(toEmail)}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(htmlBody).toString("base64"),
    "",
  ];
  for (const a of anexos) {
    partes.push(
      `--${boundary}`,
      `Content-Type: ${a.mimeType}`,
      `Content-Disposition: attachment; filename="${a.filename}"`,
      "Content-Transfer-Encoding: base64",
      "",
      a.content.toString("base64"),
      "",
    );
  }
  partes.push(`--${boundary}--`);
  const raw = Buffer.from(partes.join("\r\n")).toString("base64url");
  const res = await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
  return res.data.id || "";
}

function montarHtml(): string {
  const linhas = [
    ["COENZIMA Q10", "5", "7 / 7 dias"],
    ["PQQ", "5", "15 / 15 dias"],
    ["VITAMINA D", "5", "21 / 21 dias"],
    ["VITAMINA B12", "10", "15 / 15 dias"],
    ["TESTOSTERONA BIO 200MG", "5", "7 / 7 dias"],
  ]
    .map(
      ([n, s, f]) =>
        `<tr><td style="padding:7px;border:1px solid #ccc">${n}</td><td style="padding:7px;border:1px solid #ccc;text-align:center">${s}</td><td style="padding:7px;border:1px solid #ccc;text-align:center">${f}</td></tr>`,
    )
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:20px;color:#222">
  <div style="background:#0b1e2d;color:#fff;padding:18px 20px">
    <div style="font-size:22px;font-weight:bold;letter-spacing:1px">RAS — REGISTRO DE ADMINISTRACAO DE SUBSTANCIAS</div>
    <div style="opacity:.85;font-size:12px;margin-top:4px">PAWARDS · INSTITUTO PADUA</div>
  </div>
  <div style="border:1px solid #eee;border-top:none;padding:20px">
    <p>Ola.</p>
    <p>Segue em anexo o RAS FAP de <strong>${NOME}</strong> nas versoes
       <strong>PREMIUM</strong> (cor) e <strong>SIMPLES</strong> (preto e branco,
       pronta para impressao).</p>
    <h3 style="margin:18px 0 8px;border-bottom:2px solid #0b1e2d;padding-bottom:4px">PROTOCOLO</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <tr style="background:#0b1e2d;color:#fff">
        <th style="padding:7px;text-align:left">SUBSTANCIA</th>
        <th style="padding:7px">SESSOES</th>
        <th style="padding:7px">FREQUENCIA</th>
      </tr>
      ${linhas}
    </table>
    <p style="color:#666;font-size:12px;margin-top:18px">Documento gerado automaticamente pelo PAWARDS.</p>
  </div>
</body></html>`;
}

function montarWhatsapp(): string {
  return (
    `Ola! Aqui e do Instituto Padua (PAWARDS).\n\n` +
    `Segue o RAS FAP (Registro de Administracao de Substancias) de ${NOME}:\n\n` +
    `1. PREMIUM (cor)\n   ${DRIVE.premium}\n\n` +
    `2. SIMPLES (impressao)\n   ${DRIVE.simples}\n\n` +
    `3. PLANILHA (.xlsx)\n   ${DRIVE.xlsx}\n\n` +
    `Pasta completa:\n   ${DRIVE.pasta}\n\n` +
    `Equipe PAWARDS · Instituto Padua`
  );
}

async function main() {
  const premium = readFileSync(PDF_PREMIUM);
  const simples = readFileSync(PDF_SIMPLES);

  // 1) E-MAIL com os 2 PDFs anexos.
  const emailId = await enviarEmailComAnexos(
    EMAIL_DESTINO,
    "RAS FAP — CAIO HENRIQUE FERNANDES PADUA — 17/06/2026",
    montarHtml(),
    [
      { filename: "26.06.17 RAS FAP PREMIUM CAIO.pdf", content: premium, mimeType: "application/pdf" },
      { filename: "26.06.17 RAS FAP SIMPLES CAIO.pdf", content: simples, mimeType: "application/pdf" },
    ],
  );
  console.log(`[OK] e-mail enviado para ${EMAIL_DESTINO} (id=${emailId})`);

  // 2) CELULAR (WhatsApp) com os links do Drive.
  const r = await enviarWhatsapp(TELEFONE, montarWhatsapp(), { unidadeId: UNIDADE_ID });
  console.log(
    `[${r.sucesso ? "OK" : "FALHOU"}] WhatsApp para ${TELEFONE}` +
      `${r.provedorMsgId ? ` (msgId=${r.provedorMsgId})` : ""}` +
      `${r.erro ? ` — ${r.erro}` : ""}`,
  );

  await pool.end();
  process.exit(r.sucesso ? 0 : 2);
}

main().catch(async (e) => {
  console.error("[ERRO]", e);
  try { await pool.end(); } catch {}
  process.exit(1);
});
