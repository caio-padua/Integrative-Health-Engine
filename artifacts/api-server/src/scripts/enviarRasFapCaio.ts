/**
 * Gera o RAS FAP do CEO (CAIO HENRIQUE FERNANDES PADUA), sobe no Google Drive
 * (subpasta RAS do paciente) e envia por e-mail (PREMIUM + SIMPLES anexos).
 *
 * RAS  = Registro de Administracao de Substancias.
 * FAP  = Ficha de Auditoria padrao do CEO.
 *
 * Protocolo (CEO 17/06/2026):
 *  COENZIMA Q10        — 5 sessoes, freq 7 dias
 *  PQQ                 — 5 sessoes, freq 15 dias
 *  VITAMINA D          — 5 sessoes, freq 21 dias
 *  VITAMINA B12        — 10 sessoes, freq 15 dias
 *  TESTOSTERONA BIO    — 5 sessoes (PREMISSA ASSUMIDA), freq 7 dias, dose 200MG
 *
 * Premissas assumidas (reversiveis):
 *  - TESTOSTERONA: o CEO informou só a frequencia ("uma a cada sete dias"), nao
 *    o total de sessoes. Assumido 5 sessoes (espelha as demais semanais).
 *  - inicio de todas = 17/06/2026; CPF do cadastro; idade/celular em branco;
 *    valor R$ 0,00.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { gerarRasFapPdf, type DadosRasFap } from "../pdf/rasFap";
import { gerarRasFapExcel } from "../pdf/rasFapExcel";
import {
  getGmailClient,
} from "../lib/google-gmail";
import {
  getOrCreateClientFolder,
  uploadToClientSubfolder,
  formatFileName,
} from "../lib/google-drive";

const NOME = "CAIO HENRIQUE FERNANDES PADUA";
const CPF = "293.274.948-06";
const EMAIL_DESTINO = "ceo@pawards.com.br";

function sanitizeEmail(email: string): string {
  return email.replace(/[\r\n]/g, "").trim();
}

/** Envia 1 e-mail com MULTIPLOS anexos (PREMIUM + SIMPLES) num unico multipart. */
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

function montarHtml(folderUrl: string): string {
  const linhas = [
    ["COENZIMA Q10", "5", "7 / 7 dias"],
    ["PQQ", "5", "15 / 15 dias"],
    ["VITAMINA D", "5", "21 / 21 dias"],
    ["VITAMINA B12", "10", "15 / 15 dias"],
    ["TESTOSTERONA BIO 200MG", "5 (premissa)", "7 / 7 dias"],
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
    <p>Ola, <strong>${NOME}</strong>.</p>
    <p>Segue em anexo o seu RAS FAP nas versoes <strong>PREMIUM</strong> (cor) e
       <strong>SIMPLES</strong> (preto e branco, pronta para impressao). A planilha
       (.xlsx) e as duas versoes tambem estao na sua pasta do Google Drive.</p>
    <h3 style="margin:18px 0 8px;border-bottom:2px solid #0b1e2d;padding-bottom:4px">PROTOCOLO</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <tr style="background:#0b1e2d;color:#fff">
        <th style="padding:7px;text-align:left">SUBSTANCIA</th>
        <th style="padding:7px">SESSOES</th>
        <th style="padding:7px">FREQUENCIA</th>
      </tr>
      ${linhas}
    </table>
    <p style="font-size:12px;color:#b4601a;margin-top:10px">Premissa assumida: total de sessoes da
       TESTOSTERONA = 5 (voce informou só a frequencia). Avise se for outro numero.</p>
    <p style="margin-top:16px"><a href="${folderUrl}" style="background:#0b1e2d;color:#fff;padding:10px 16px;text-decoration:none;display:inline-block">ABRIR PASTA NO GOOGLE DRIVE</a></p>
    <p style="color:#666;font-size:12px;margin-top:18px">Documento gerado automaticamente pelo PAWARDS.</p>
  </div>
</body></html>`;
}

async function main() {
  const inicio = new Date(2026, 5, 17); // 17/06/2026
  const dados: DadosRasFap = {
    nome: NOME,
    cpf: CPF,
    celular: "",
    idade: "",
    medicoResponsavel: "DR. CAIO PADUA",
    enfermeira: "EQUIPE DE ENFERMAGEM PADUA",
    unidade: "INSTITUTO PADUA",
    dataAtendimento: inicio,
    protocoloNumero: "",
    valorTratamento: 0,
    substancias: [
      { nome: "COENZIMA Q10", sessoes: 5, frequenciaDias: 7, inicio },
      { nome: "PQQ", sessoes: 5, frequenciaDias: 15, inicio },
      { nome: "VITAMINA D", sessoes: 5, frequenciaDias: 21, inicio },
      { nome: "VITAMINA B12", sessoes: 10, frequenciaDias: 15, inicio },
      { nome: "TESTOSTERONA BIO", dose: "200MG", sessoes: 5, frequenciaDias: 7, inicio },
    ],
  };

  // 1) Gera os 3 arquivos.
  const premium = await gerarRasFapPdf(dados, "PREMIUM");
  const simples = await gerarRasFapPdf(dados, "SIMPLES");
  const xlsx = await gerarRasFapExcel(dados);

  const outDir = `${process.cwd()}/../../.local/.audit_work`;
  mkdirSync(outDir, { recursive: true });
  const nPrem = "RAS_FAP_CAIO_PREMIUM_26.06.17_v2.pdf";
  const nSimp = "RAS_FAP_CAIO_SIMPLES_26.06.17_v2.pdf";
  const nXlsx = "RAS_FAP_CAIO_26.06.17_v2.xlsx";
  writeFileSync(`${outDir}/${nPrem}`, premium);
  writeFileSync(`${outDir}/${nSimp}`, simples);
  writeFileSync(`${outDir}/${nXlsx}`, xlsx);
  console.log(`[OK] arquivos gerados: PREMIUM=${premium.length}b SIMPLES=${simples.length}b XLSX=${xlsx.length}b`);

  // 2) Google Drive — pasta do paciente, subpasta RAS.
  const pasta = await getOrCreateClientFolder(NOME, CPF);
  const fnPrem = formatFileName(inicio, "RAS FAP", NOME, "PREMIUM");
  const fnSimp = formatFileName(inicio, "RAS FAP", NOME, "SIMPLES");
  const fnXlsx = formatFileName(inicio, "RAS FAP", NOME, "PLANILHA");
  const upPrem = await uploadToClientSubfolder({
    clientFolderId: pasta.folderId,
    subfolder: "RAS",
    fileName: `${fnPrem}.pdf`,
    mimeType: "application/pdf",
    content: premium,
  });
  const upSimp = await uploadToClientSubfolder({
    clientFolderId: pasta.folderId,
    subfolder: "RAS",
    fileName: `${fnSimp}.pdf`,
    mimeType: "application/pdf",
    content: simples,
  });
  const upXlsx = await uploadToClientSubfolder({
    clientFolderId: pasta.folderId,
    subfolder: "RAS",
    fileName: `${fnXlsx}.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    content: xlsx,
  });
  console.log(`[OK] Drive PREMIUM: ${upPrem.fileUrl}`);
  console.log(`[OK] Drive SIMPLES: ${upSimp.fileUrl}`);
  console.log(`[OK] Drive XLSX:    ${upXlsx.fileUrl}`);
  console.log(`[OK] Pasta:         ${pasta.folderUrl}`);

  // 3) E-mail com os 2 PDFs anexos + link da pasta.
  const emailId = await enviarEmailComAnexos(
    EMAIL_DESTINO,
    "RAS FAP — CAIO HENRIQUE FERNANDES PADUA — 17/06/2026",
    montarHtml(pasta.folderUrl),
    [
      { filename: `${fnPrem}.pdf`, content: premium, mimeType: "application/pdf" },
      { filename: `${fnSimp}.pdf`, content: simples, mimeType: "application/pdf" },
    ],
  );
  console.log(`[OK] e-mail enviado para ${EMAIL_DESTINO} (id=${emailId})`);
}

main().catch((e) => {
  console.error("[ERRO]", e);
  process.exit(1);
});
