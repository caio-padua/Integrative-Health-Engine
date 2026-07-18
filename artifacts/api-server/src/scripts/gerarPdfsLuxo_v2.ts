/**
 * gerarPdfsLuxo_v2.ts
 * Série Luxo — 4 PDFs via PDFKit · upload Drive com createReadStream + delete/recreate.
 * Correção: PDFs gerados para /tmp, upload via stream de arquivo real.
 */
import PDFDocument from "pdfkit";
import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";

// ── DRIVE ─────────────────────────────────────────────────────────────────────
const PASTA_ID = "12lsL8VV7GxoSMKgk70-mOMdw2OHdCuVL";
const CONN_ID  = "conn_google-drive_01KNNJP2AQVYCB2AV3SQ3DQ367";

async function getToken(): Promise<string> {
  const host  = process.env.REPLIT_CONNECTORS_HOSTNAME!;
  const ident = process.env.REPL_IDENTITY ? "repl " + process.env.REPL_IDENTITY : "";
  const r = await fetch(`https://${host}/api/v2/connection/${CONN_ID}?include_secrets=true`, {
    headers: { Accept: "application/json", "X-Replit-Token": ident },
  });
  const d = (await r.json()) as any;
  return d?.settings?.access_token as string;
}

async function driveClient() {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: await getToken() });
  return google.drive({ version: "v3", auth });
}

async function uploadArquivo(
  drive: ReturnType<typeof google.drive>,
  nome: string,
  caminho: string,
  desc: string
) {
  const stat = fs.statSync(caminho);
  console.log(`   ${nome}: ${stat.size.toLocaleString("pt-BR")} bytes em disco`);

  // Apagar versão anterior (se existir)
  const { data: busca } = await drive.files.list({
    q: `name='${nome}' and '${PASTA_ID}' in parents and trashed=false`,
    fields: "files(id,name)",
  });
  if (busca.files && busca.files.length > 0) {
    for (const f of busca.files) {
      await drive.files.delete({ fileId: f.id! });
      console.log(`   ✕ Deletado versão antiga: ${f.id}`);
    }
  }

  // Criar novo arquivo com stream real do disco
  const { data } = await drive.files.create({
    requestBody: {
      name: nome,
      parents: [PASTA_ID],
      description: desc,
      mimeType: "application/pdf",
    },
    media: {
      mimeType: "application/pdf",
      body: fs.createReadStream(caminho),
    },
    fields: "id,name,size",
  });
  console.log(`   ✓ Enviado: ${data.name} · id=${data.id} · size=${data.size}`);
}

// ── HELPERS PDFKit (sem save/restore — chamadas diretas) ──────────────────────
const PW = 595.28;
const PH = 841.89;

async function gerarEmDisco(gerador: (doc: PDFKit.PDFDocument) => void, destino: string) {
  return new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const stream = fs.createWriteStream(destino);
    doc.pipe(stream);
    gerador(doc);
    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

// ── LUX-A — MAISON BLANCHE ────────────────────────────────────────────────────
function luxoA(doc: PDFKit.PDFDocument) {
  const M = 52, UW = PW - M * 2;

  doc.rect(0, 0, PW, PH).fill("#FAF7F1");
  doc.rect(0, 0, PW, 3).fill("#C9A84C");

  // Monograma
  doc.rect(PW/2 - 18, 52, 36, 36).lineWidth(0.5).stroke("#C9A84C");
  doc.font("Courier-Bold").fontSize(14).fillColor("#B8982A")
     .text("P", PW/2 - 18, 62, { align: "center", width: 36 });

  // Header
  doc.font("Courier").fontSize(7).fillColor("#6B6358")
     .text("INSTITUTO PADUA  ·  MEDICINA INTEGRATIVA", M, 104, { align: "center", width: UW, characterSpacing: 2 });
  doc.font("Courier-Bold").fontSize(13).fillColor("#080808")
     .text("DR. CAIO H. F. PADUA", M, 118, { align: "center", width: UW, characterSpacing: 1 });
  doc.font("Courier").fontSize(7).fillColor("#9A9189")
     .text("CRM 123456  ·  SP  ·  ENDOCRINOLOGISTA  ·  CBO 2251-04", M, 136, { align: "center", width: UW, characterSpacing: 1 });

  // Fio triplo
  doc.moveTo(M, 154).lineTo(M + UW, 154).lineWidth(0.7).stroke("#C9A84C");
  doc.moveTo(M, 158).lineTo(M + UW, 158).lineWidth(0.3).stroke("#C9A84C");

  // Rótulo
  doc.font("Courier-Bold").fontSize(7).fillColor("#B8982A")
     .text("RECEITUARIO MEDICO", M, 168, { align: "center", width: UW, characterSpacing: 3 });
  doc.font("Courier").fontSize(7).fillColor("#9A9189")
     .text("Receita Comum  ·  Validade 30 dias", M, 180, { align: "center", width: UW });

  // Bloco paciente
  doc.rect(M, 202, UW, 70).fill("#F0EBE0");
  doc.rect(M, 202, UW, 70).lineWidth(0.5).stroke("#D5CBB8");
  doc.font("Courier").fontSize(7).fillColor("#9A9189").text("PACIENTE", M + 10, 210, { characterSpacing: 2 });

  const pcampos: [string, string, number][] = [
    ["NOME",       "Maria Francisca de Oliveira Borges", 222],
    ["NASCIMENTO", "14/03/1978  ·  47 anos",             239],
    ["ENDERECO",   "Rua das Acacias, 214  ·  Sao Paulo · SP", 256],
  ];
  for (const [l, v, yy] of pcampos) {
    doc.font("Courier").fontSize(7).fillColor("#9A9189").text(l, M + 10, yy, { characterSpacing: 1 });
    doc.font("Courier-Bold").fontSize(9).fillColor("#0C0C0A").text(v, M + 82, yy, { width: UW - 92 });
    if (yy < 256) doc.moveTo(M + 10, yy + 13).lineTo(M + UW - 10, yy + 13).lineWidth(0.5).stroke("#D5CBB8");
  }

  // Separador
  doc.moveTo(M, 280).lineTo(M + UW, 280).lineWidth(0.5).stroke("#C9A84C");
  doc.font("Courier-Bold").fontSize(7).fillColor("#B8982A")
     .text("PRESCRICAO", M, 294, { characterSpacing: 3 });

  // Item I
  doc.font("Courier-Bold").fontSize(8).fillColor("#D4B96A").text("I.", M, 312);
  doc.font("Courier-Bold").fontSize(11).fillColor("#0C0C0A").text("Levotiroxina Sodica", M + 28, 312);
  doc.font("Courier").fontSize(8).fillColor("#6B6358").text("75 mcg · Comprimido", M + 246, 314);
  doc.font("Courier").fontSize(9).fillColor("#6B6358")
     .text("1 comprimido em jejum  ·  30 min antes do cafe da manha", M + 28, 327, { width: UW - 28 });
  doc.font("Courier").fontSize(7).fillColor("#9A9189").text("90 DIAS  ·  USO CONTINUO", M + 28, 340, { characterSpacing: 1 });
  doc.moveTo(M + 22, 350).lineTo(M + 22, 364).lineWidth(1.5).stroke("#D4B96A");
  doc.font("Courier").fontSize(8).fillColor("#9A9189")
     .text("Intervalo minimo de 4 h de calcio ou ferro.", M + 28, 351, { width: UW - 28 });
  doc.moveTo(M, 372).lineTo(M + UW, 372).lineWidth(0.5).stroke("#D5CBB8");

  // Item II
  doc.font("Courier-Bold").fontSize(8).fillColor("#D4B96A").text("II.", M, 388);
  doc.font("Courier-Bold").fontSize(11).fillColor("#0C0C0A").text("Vitamina D3 + K2", M + 28, 388);
  doc.font("Courier").fontSize(8).fillColor("#6B6358").text("5.000 UI + 100 mcg · Capsula", M + 246, 390);
  doc.font("Courier").fontSize(9).fillColor("#6B6358").text("1 capsula com refeicao matinal", M + 28, 403, { width: UW - 28 });
  doc.font("Courier").fontSize(7).fillColor("#9A9189").text("90 DIAS", M + 28, 416, { characterSpacing: 1 });
  doc.moveTo(M, 428).lineTo(M + UW, 428).lineWidth(0.5).stroke("#D5CBB8");

  // Item III
  doc.font("Courier-Bold").fontSize(8).fillColor("#D4B96A").text("III.", M, 444);
  doc.font("Courier-Bold").fontSize(11).fillColor("#0C0C0A").text("Magnesio Dimalato", M + 28, 444);
  doc.font("Courier").fontSize(8).fillColor("#6B6358").text("400 mg · Capsula", M + 246, 446);
  doc.font("Courier").fontSize(9).fillColor("#6B6358").text("2 capsulas com agua a noite", M + 28, 459, { width: UW - 28 });
  doc.font("Courier").fontSize(7).fillColor("#9A9189").text("60 DIAS", M + 28, 472, { characterSpacing: 1 });
  doc.moveTo(M + 22, 482).lineTo(M + 22, 496).lineWidth(1.5).stroke("#D4B96A");
  doc.font("Courier").fontSize(8).fillColor("#9A9189")
     .text("Superior ao oxido de magnesio em absorcao.", M + 28, 483, { width: UW - 28 });
  doc.moveTo(M, 504).lineTo(M + UW, 504).lineWidth(0.5).stroke("#D5CBB8");

  // Assinatura
  doc.font("Courier").fontSize(9).fillColor("#6B6358").text("Sao Paulo, 18 de julho de 2026", M, 524);
  const ax = PW - M - 165;
  doc.moveTo(ax, 526).lineTo(ax + 165, 526).lineWidth(0.5).stroke("#C9A84C");
  doc.font("Courier").fontSize(7).fillColor("#6B6358")
     .text("ASSINATURA DO MEDICO", ax, 532, { align: "center", width: 165, characterSpacing: 1 });
  doc.font("Courier").fontSize(7).fillColor("#9A9189")
     .text("CRM 123456  ·  SP", ax, 542, { align: "center", width: 165 });

  // Rodapé
  doc.moveTo(M, 564).lineTo(M + UW, 564).lineWidth(0.5).stroke("#D5CBB8");
  doc.font("Courier").fontSize(7).fillColor("#9A9189")
     .text("AV. PAULISTA, 1.000  ·  CONJ. 1205  ·  SAO PAULO  ·  SP  ·  (11) 3456-7890",
           M, 572, { align: "center", width: UW, characterSpacing: 1 });

  doc.rect(0, PH - 2, PW, 2).fill("#C9A84C");
}

// ── LUX-B — NOIR EXCELLENCE ───────────────────────────────────────────────────
function luxoB(doc: PDFKit.PDFDocument) {
  const M = 48, UW = PW - M * 2, HH = 165;

  doc.rect(0, 0, PW, PH).fill("#F8F4EE");
  doc.rect(0, 0, PW, HH).fill("#080808");
  doc.rect(PW - 3, 0, 3, HH).fill("#B8982A");

  doc.font("Courier").fontSize(7).fillColor("#C9A84C")
     .text("INSTITUTO PADUA  ·  EST. 2018", M, 34, { characterSpacing: 3 });
  doc.font("Courier-Bold").fontSize(18).fillColor("#FFFFFF").text("DR. CAIO H. F.", M, 52);
  doc.font("Courier-Bold").fontSize(18).fillColor("#FFFFFF").text("PADUA", M, 72);
  doc.moveTo(M, 98).lineTo(M + 40, 98).lineWidth(1).stroke("#B8982A");
  doc.font("Courier").fontSize(7.5).fillColor("#8A8278")
     .text("ENDOCRINOLOGIA  &  MEDICINA INTEGRATIVA", M, 106, { characterSpacing: 1 });
  doc.font("Courier").fontSize(7).fillColor("#8A8278")
     .text("CRM 123456  ·  SP", M, 120, { characterSpacing: 1 });

  doc.moveTo(0, HH).lineTo(PW, HH).lineWidth(1).stroke("#B8982A");

  let y = HH + 22;
  doc.font("Courier-Bold").fontSize(7).fillColor("#B8982A")
     .text("RECEITUARIO MEDICO", M, y, { characterSpacing: 3 });
  doc.font("Courier").fontSize(8).fillColor("#6B6358")
     .text("18/07/2026  ·  Sao Paulo · SP", PW - M - 160, y, { align: "right", width: 160 });
  y += 24;

  // Paciente barra ouro
  doc.rect(M, y, 2, 78).fill("#B8982A");
  doc.font("Courier").fontSize(7).fillColor("#B8982A").text("PACIENTE", M + 12, y, { characterSpacing: 2 });
  y += 14;
  doc.font("Courier-Bold").fontSize(12).fillColor("#0C0C0A").text("Maria Francisca de Oliveira Borges", M + 12, y, { width: UW - 14 });
  y += 17;
  doc.font("Courier").fontSize(8).fillColor("#6B6358").text("14/03/1978  ·  47 anos", M + 12, y);
  y += 13;
  doc.font("Courier").fontSize(8).fillColor("#6B6358").text("Rua das Acacias, 214  ·  Sao Paulo  ·  SP", M + 12, y, { width: UW - 14 });
  y += 22;

  doc.moveTo(M, y).lineTo(M + UW, y).lineWidth(0.7).stroke("#C9A84C");
  doc.moveTo(M, y + 5).lineTo(M + UW, y + 5).lineWidth(0.5).stroke("#D8D0C0");
  y += 20;

  doc.font("Courier-Bold").fontSize(7).fillColor("#1A1714").text("PRESCRICAO", M, y, { characterSpacing: 3 });
  y += 18;

  const rxb = [
    { n: "I.",   nm: "Levotiroxina Sodica",  ds: "75 mcg · Comprimido",       ps: "1 comprimido em jejum  ·  30 min antes do cafe da manha", dr: "90 DIAS  ·  USO CONTINUO", ob: "Intervalo minimo de 4 h de calcio ou ferro." },
    { n: "II.",  nm: "Vitamina D3 + K2",     ds: "5.000 UI + 100 mcg · Cap.", ps: "1 capsula com refeicao matinal",                           dr: "90 DIAS", ob: null },
    { n: "III.", nm: "Magnesio Dimalato",    ds: "400 mg · Capsula",           ps: "2 capsulas com agua a noite",                              dr: "60 DIAS", ob: "Superior ao oxido de magnesio em absorcao." },
  ];
  for (const it of rxb) {
    doc.font("Courier-Bold").fontSize(8).fillColor("#C9A84C").text(it.n, M, y);
    doc.font("Courier-Bold").fontSize(11).fillColor("#0C0C0A").text(it.nm, M + 26, y);
    doc.font("Courier").fontSize(7.5).fillColor("#6B6358").text(it.ds, M + 252, y + 2);
    y += 15;
    doc.font("Courier").fontSize(9).fillColor("#6B6358").text(it.ps, M + 26, y, { width: UW - 26 });
    y += 13;
    doc.font("Courier").fontSize(7).fillColor("#9A9189").text(it.dr, M + 26, y, { characterSpacing: 1 });
    y += 10;
    if (it.ob) {
      doc.font("Courier").fontSize(8).fillColor("#9A9189").text(it.ob, M + 26, y, { width: UW - 26 });
      y += 14;
    }
    doc.moveTo(M, y + 4).lineTo(M + UW, y + 4).lineWidth(0.5).stroke("#D8D0C0");
    y += 16;
  }

  y += 12;
  const ax = PW - M - 180;
  doc.moveTo(ax, y).lineTo(ax + 180, y).lineWidth(0.5).stroke("#C9A84C");
  doc.font("Courier").fontSize(7.5).fillColor("#5E5750")
     .text("DR. CAIO H. F. PADUA", ax, y + 6, { align: "center", width: 180 });
  doc.font("Courier").fontSize(7).fillColor("#9A9189")
     .text("CRM 123456  ·  SP", ax, y + 16, { align: "center", width: 180 });

  const ry = PH - 48;
  doc.moveTo(M, ry).lineTo(M + UW, ry).lineWidth(0.5).stroke("#D8D0C0");
  doc.font("Courier").fontSize(7).fillColor("#9A9189")
     .text("AV. PAULISTA, 1.000  ·  CONJ. 1205  ·  SAO PAULO  ·  SP  ·  (11) 3456-7890",
           M, ry + 8, { align: "center", width: UW, characterSpacing: 1 });
  doc.rect(0, PH - 1, PW, 1).fill("#B8982A");
}

// ── LUX-C — CHAMPAGNE ─────────────────────────────────────────────────────────
function luxoC(doc: PDFKit.PDFDocument) {
  const M = 58, UW = PW - M * 2, BM = 12, cx = PW / 2;

  doc.rect(0, 0, PW, PH).fill("#F9F5EC");
  doc.rect(BM, BM, PW - BM * 2, PH - BM * 2).lineWidth(0.5).stroke("#C9A84C");
  doc.rect(BM + 4, BM + 4, PW - (BM + 4) * 2, PH - (BM + 4) * 2).lineWidth(0.5).stroke("#D8D0BC");

  let y = M;

  // Ornamento topo
  doc.moveTo(M, y).lineTo(cx - 14, y).lineWidth(0.5).stroke("#C9A84C");
  doc.moveTo(cx + 14, y).lineTo(M + UW, y).lineWidth(0.5).stroke("#C9A84C");
  doc.moveTo(cx, y - 5).lineTo(cx + 6, y).lineTo(cx, y + 5).lineTo(cx - 6, y)
     .closePath().lineWidth(1).stroke("#C9A84C");
  y += 20;

  doc.font("Courier").fontSize(7).fillColor("#A8882A")
     .text("INSTITUTO PADUA", M, y, { align: "center", width: UW, characterSpacing: 4 });
  y += 16;
  doc.font("Courier-Bold").fontSize(16).fillColor("#0C0C0A")
     .text("DR. CAIO H. F. PADUA", M, y, { align: "center", width: UW, characterSpacing: 1 });
  y += 22;
  doc.font("Courier").fontSize(7.5).fillColor("#7A7368")
     .text("ENDOCRINOLOGIA  ·  MEDICINA INTEGRATIVA", M, y, { align: "center", width: UW, characterSpacing: 2 });
  y += 22;

  // Ornamento divisor
  doc.moveTo(M, y).lineTo(cx - 8, y).lineWidth(0.5).stroke("#D8D0BC");
  doc.moveTo(cx + 8, y).lineTo(M + UW, y).lineWidth(0.5).stroke("#D8D0BC");
  doc.moveTo(cx, y - 4).lineTo(cx + 4, y).lineTo(cx, y + 4).lineTo(cx - 4, y)
     .closePath().fill("#C9A84C");
  y += 18;

  // Caixa rótulo
  doc.rect(cx - 95, y, 190, 20).lineWidth(0.5).stroke("#A8882A");
  doc.font("Courier-Bold").fontSize(7).fillColor("#A8882A")
     .text("RECEITUARIO  ·  RECEITA COMUM", cx - 95, y + 6,
           { align: "center", width: 190, characterSpacing: 2 });
  y += 32;

  doc.moveTo(M, y).lineTo(M + UW, y).lineWidth(1).stroke("#C9A84C");
  doc.moveTo(M, y + 5).lineTo(M + UW, y + 5).lineWidth(0.5).stroke("#D8D0BC");
  y += 18;

  // Paciente
  doc.font("Courier").fontSize(6.5).fillColor("#A8A098")
     .text("DADOS DO PACIENTE", M, y, { characterSpacing: 3 });
  y += 14;
  const pcc: [string, string][] = [
    ["NOME COMPLETO", "Maria Francisca de Oliveira Borges"],
    ["NASCIMENTO",    "14/03/1978  ·  47 anos"],
    ["LOCALIDADE",    "Rua das Acacias, 214  ·  Sao Paulo  ·  SP"],
    ["DATA",          "Sao Paulo, 18 de julho de 2026"],
  ];
  for (const [l, v] of pcc) {
    doc.font("Courier").fontSize(6.5).fillColor("#A8A098").text(l, M, y, { characterSpacing: 1 });
    doc.font("Courier-Bold").fontSize(9).fillColor("#0C0C0A")
       .text(v, M + 110, y, { align: "right", width: UW - 110 });
    doc.moveTo(M, y + 13).lineTo(M + UW, y + 13).lineWidth(0.5).stroke("#D8D0BC");
    y += 18;
  }

  doc.moveTo(M, y).lineTo(M + UW, y).lineWidth(0.5).stroke("#D8D0BC");
  doc.moveTo(M, y + 6).lineTo(M + UW, y + 6).lineWidth(0.7).stroke("#C9A84C");
  doc.moveTo(M, y + 12).lineTo(M + UW, y + 12).lineWidth(0.5).stroke("#D8D0BC");
  y += 24;

  doc.font("Courier-Bold").fontSize(6.5).fillColor("#0C0C0A").text("PRESCRICAO MEDICA", M, y, { characterSpacing: 3 });
  doc.font("Courier").fontSize(6.5).fillColor("#A8A098")
     .text("Validade: 30 dias", PW - M - 80, y, { align: "right", width: 80 });
  y += 18;

  const rxc = [
    { n: "I.",   nm: "Levotiroxina Sodica",  ds: "75 MCG  ·  COMPRIMIDO",       ps: "1 comprimido em jejum · 30 min antes do cafe da manha", dr: "90 DIAS · USO CONTINUO", ob: "Intervalo minimo de 4 h de calcio ou ferro." },
    { n: "II.",  nm: "Vitamina D3 + K2",     ds: "5.000 UI + 100 MCG  ·  CAP.", ps: "1 capsula com refeicao matinal",                         dr: "90 DIAS", ob: null },
    { n: "III.", nm: "Magnesio Dimalato",    ds: "400 MG  ·  CAPSULA",           ps: "2 capsulas com agua a noite",                            dr: "60 DIAS", ob: "Superior ao oxido de magnesio em absorcao." },
  ];
  for (const it of rxc) {
    doc.font("Courier-Bold").fontSize(8).fillColor("#C9A84C").text(it.n, M, y);
    doc.font("Courier-Bold").fontSize(11).fillColor("#0C0C0A").text(it.nm, M + 22, y);
    y += 14;
    doc.font("Courier").fontSize(7.5).fillColor("#7A7368").text(it.ds, M + 22, y, { characterSpacing: 1 });
    y += 12;
    doc.font("Courier").fontSize(9).fillColor("#5E5750").text(it.ps, M + 22, y, { width: UW - 22 });
    y += 12;
    doc.font("Courier").fontSize(7).fillColor("#A8A098").text(it.dr, M + 22, y, { characterSpacing: 1 });
    y += 10;
    if (it.ob) {
      doc.moveTo(M + 20, y).lineTo(M + 20, y + 12).lineWidth(0.5).stroke("#C9A84C");
      doc.font("Courier").fontSize(8).fillColor("#A8A098").text(it.ob, M + 26, y, { width: UW - 26 });
      y += 14;
    }
    doc.moveTo(M, y + 4).lineTo(M + UW, y + 4).lineWidth(0.5).stroke("#D8D0BC");
    y += 16;
  }

  y += 10;
  doc.font("Courier").fontSize(7).fillColor("#A8A098").text("CRM 123456  ·  SP", M, y, { characterSpacing: 1 });
  doc.font("Courier").fontSize(7).fillColor("#A8A098").text("CBO 2251-04", M, y + 10);
  const ax = PW - M - 170;
  doc.moveTo(ax, y + 2).lineTo(ax + 170, y + 2).lineWidth(0.5).stroke("#C9A84C");
  doc.font("Courier").fontSize(7.5).fillColor("#5E5750")
     .text("ASSINATURA E CARIMBO", ax, y + 8, { align: "center", width: 170, characterSpacing: 1 });

  // Ornamento rodapé
  const ry = PH - 52;
  doc.moveTo(M, ry).lineTo(cx - 8, ry).lineWidth(0.5).stroke("#D8D0BC");
  doc.moveTo(cx + 8, ry).lineTo(M + UW, ry).lineWidth(0.5).stroke("#D8D0BC");
  doc.moveTo(cx, ry - 4).lineTo(cx + 4, ry).lineTo(cx, ry + 4).lineTo(cx - 4, ry)
     .closePath().lineWidth(0.5).stroke("#C9A84C");
  doc.font("Courier").fontSize(7).fillColor("#A8A098")
     .text("AV. PAULISTA, 1.000  ·  CONJ. 1205  ·  SAO PAULO  ·  SP  ·  (11) 3456-7890",
           M, ry + 10, { align: "center", width: UW, characterSpacing: 1 });
}

// ── LUX-D — CAPA PROTOCOLO MAISON ────────────────────────────────────────────
function luxoD(doc: PDFKit.PDFDocument) {
  const M = 56, UW = PW - M * 2, cx = PW / 2;

  doc.rect(0, 0, PW, PH).fill("#050403");
  doc.rect(16, 16, PW - 32, PH - 32).lineWidth(0.5).stroke("#7A6420");
  doc.rect(0, 0, PW, 1.5).fill("#B8982A");

  let y = M + 10;
  doc.font("Courier").fontSize(7).fillColor("#B8982A")
     .text("INSTITUTO PADUA  ·  MEDICINA INTEGRATIVA", M, y, { align: "center", width: UW, characterSpacing: 3 });
  y += 14;
  doc.moveTo(M + 80, y).lineTo(M + UW - 80, y).lineWidth(0.5).stroke("#7A6420");
  y += 18;

  doc.font("Courier").fontSize(7).fillColor("#8A8278")
     .text("PROTOCOLO TERAPEUTICO", M, y, { align: "center", width: UW, characterSpacing: 3 });
  y += 14;
  doc.moveTo(cx - 24, y).lineTo(cx + 24, y).lineWidth(0.7).stroke("#B8982A");
  y += 18;

  doc.font("Courier-Bold").fontSize(22).fillColor("#F8F4EE")
     .text("PROTOCOLO DE", M, y, { align: "center", width: UW });
  y += 30;
  doc.font("Courier-Bold").fontSize(22).fillColor("#F8F4EE")
     .text("LONGEVIDADE", M, y, { align: "center", width: UW });
  y += 30;
  doc.font("Courier").fontSize(9).fillColor("#C9A84C")
     .text("CUIDADO INTEGRATIVO AVANCADO", M, y, { align: "center", width: UW, characterSpacing: 2 });
  y += 36;

  // Losango triplo
  const oy = y + 22;
  doc.moveTo(cx, oy - 22).lineTo(cx + 22, oy).lineTo(cx, oy + 22).lineTo(cx - 22, oy)
     .closePath().lineWidth(0.5).stroke("#B8982A");
  doc.moveTo(cx, oy - 14).lineTo(cx + 14, oy).lineTo(cx, oy + 14).lineTo(cx - 14, oy)
     .closePath().lineWidth(0.8).stroke("#B8982A");
  doc.moveTo(cx, oy - 4).lineTo(cx + 4, oy).lineTo(cx, oy + 4).lineTo(cx - 4, oy)
     .closePath().fill("#B8982A");
  y = oy + 38;

  // Caixa de dados
  doc.rect(cx - 150, y, 300, 84).lineWidth(0.5).stroke("#7A6420");
  const dados: [string, string][] = [
    ["PACIENTE",    "Maria Francisca de Oliveira Borges"],
    ["NASCIMENTO",  "14/03/1978  ·  47 anos"],
    ["CODIGO",      "PROT-2026-001847"],
  ];
  let dy = y + 10;
  for (const [l, v] of dados) {
    doc.font("Courier").fontSize(6.5).fillColor("#8A8278").text(l, cx - 140, dy, { characterSpacing: 2 });
    doc.font("Courier-Bold").fontSize(9).fillColor("#F8F4EE")
       .text(v, cx - 140, dy, { align: "right", width: 280 });
    doc.moveTo(cx - 140, dy + 13).lineTo(cx + 140, dy + 13).lineWidth(0.5).stroke("#3A2E18");
    dy += 22;
  }
  y += 94;

  // Rodapé
  const ry = PH - M - 22;
  doc.moveTo(M, ry - 32).lineTo(M + UW, ry - 32).lineWidth(0.5).stroke("#7A6420");
  doc.moveTo(M, ry - 26).lineTo(M + UW, ry - 26).lineWidth(0.3).stroke("#3A2E18");
  doc.font("Courier-Bold").fontSize(9).fillColor("#F8F4EE").text("DR. CAIO H. F. PADUA", M, ry - 18);
  doc.font("Courier").fontSize(7).fillColor("#8A8278")
     .text("CRM 123456  ·  SP  ·  ENDOCRINOLOGISTA", M, ry - 6, { characterSpacing: 1 });
  doc.moveTo(PW - M - 140, ry - 20).lineTo(PW - M, ry - 20).lineWidth(0.5).stroke("#B8982A");
  doc.font("Courier").fontSize(7).fillColor("#8A8278")
     .text("ASSINATURA", PW - M - 140, ry - 14, { align: "center", width: 140, characterSpacing: 1 });
  doc.font("Courier").fontSize(8).fillColor("#C8C2B8")
     .text("Sao Paulo  ·  18/07/2026", PW - M - 140, ry - 4, { align: "center", width: 140 });
  doc.font("Courier").fontSize(6.5).fillColor("#7A6420")
     .text("AV. PAULISTA, 1.000  ·  CONJ. 1205  ·  SAO PAULO  ·  SP  ·  (11) 3456-7890",
           M, ry + 10, { align: "center", width: UW, characterSpacing: 1 });

  doc.rect(0, PH - 1.5, PW, 1.5).fill("#B8982A");
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
const PDFS = [
  { nome: "LUX-A__Receituario_Maison_Blanche_v2.pdf",  fn: luxoA, desc: "Série Luxo A v2 — Maison Blanche · marfim + ouro hairline · Dior" },
  { nome: "LUX-B__Receituario_Noir_Excellence_v2.pdf", fn: luxoB, desc: "Série Luxo B v2 — Noir Excellence · header preto + ouro · Hermès" },
  { nome: "LUX-C__Receituario_Champagne_v2.pdf",       fn: luxoC, desc: "Série Luxo C v2 — Champagne · creme + borda dupla + losango" },
  { nome: "LUX-D__Capa_Protocolo_Maison_v2.pdf",       fn: luxoD, desc: "Série Luxo D v2 — Protocolo Maison · preto + ouro + losango triplo" },
];

async function main() {
  console.log("▶  Série Luxo v2 — gerando em /tmp e fazendo upload…\n");

  // 1) Gerar para disco
  for (const p of PDFS) {
    const dest = path.join("/tmp", p.nome);
    await gerarEmDisco(p.fn, dest);
    const { size } = fs.statSync(dest);
    if (size < 1000) { console.error(`ERRO: ${p.nome} suspeito (${size} bytes)`); process.exit(1); }
    console.log(`   PDF: ${p.nome}  ·  ${size.toLocaleString("pt-BR")} bytes  ✓`);
  }

  // 2) Upload
  console.log("\n   Conectando ao Drive…");
  const drive = await driveClient();
  for (const p of PDFS) {
    await uploadArquivo(drive, p.nome, path.join("/tmp", p.nome), p.desc);
  }

  console.log("\n══════════════════════════════════════════════");
  console.log("  4 PDFs Série Luxo v2 — enviados com sucesso");
  console.log(`  https://drive.google.com/drive/folders/${PASTA_ID}`);
  console.log("══════════════════════════════════════════════");
}

main().catch(console.error);
