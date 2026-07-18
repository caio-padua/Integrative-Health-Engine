/**
 * gerarPdfsLuxo_v2.ts
 * Gera 4 PDFs da Série Luxo (Dior/Hermès) via PDFKit e faz upload no Drive.
 * Nomenclatura: LUX-X__<Nome>_v2.pdf  (versão 2, conforme CEO)
 * Paleta: marfim · ouro hairline · preto absoluto · champagne
 */
import PDFDocument from "pdfkit";
import { google } from "googleapis";
import { PassThrough } from "stream";

// ── CONEXÃO DRIVE ─────────────────────────────────────────────────────────────
const PASTA_DESTINO_ID = "12lsL8VV7GxoSMKgk70-mOMdw2OHdCuVL";
const CONN_ID = "conn_google-drive_01KNNJP2AQVYCB2AV3SQ3DQ367";

async function getAccessToken(): Promise<string> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME!;
  const replToken = process.env.REPL_IDENTITY ? "repl " + process.env.REPL_IDENTITY : null;
  const resp = await fetch(
    `https://${hostname}/api/v2/connection/${CONN_ID}?include_secrets=true`,
    { headers: { Accept: "application/json", "X-Replit-Token": replToken! } }
  );
  const data = (await resp.json()) as any;
  return data?.settings?.access_token;
}

async function getDriveClient() {
  const token = await getAccessToken();
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });
  return google.drive({ version: "v3", auth });
}

async function uploadPdf(drive: ReturnType<typeof google.drive>, nome: string, buffer: Buffer, desc: string) {
  const { data: busca } = await drive.files.list({
    q: `name='${nome}' and '${PASTA_DESTINO_ID}' in parents and trashed=false`,
    fields: "files(id,name)",
  });
  const { Readable } = await import("stream");
  const body = Readable.from([buffer]);
  if (busca.files && busca.files.length > 0) {
    await drive.files.update({
      fileId: busca.files[0].id!,
      requestBody: { description: desc },
      media: { mimeType: "application/pdf", body },
    });
    console.log(`↺  Atualizado: ${nome}`);
  } else {
    await drive.files.create({
      requestBody: { name: nome, parents: [PASTA_DESTINO_ID], description: desc, mimeType: "application/pdf" },
      media: { mimeType: "application/pdf", body },
      fields: "id,name",
    });
    console.log(`✓  Enviado: ${nome}`);
  }
}

// ── HELPERS PDFKit ────────────────────────────────────────────────────────────
const W = 595.28;
const H = 841.89;
const MONO = "Courier";
const MONO_BOLD = "Courier-Bold";

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0,2),16)/255, parseInt(h.slice(2,4),16)/255, parseInt(h.slice(4,6),16)/255];
}

function linhaHorizontal(doc: PDFKit.PDFDocument, x: number, y: number, largura: number, hex: string, esp = 0.5) {
  doc.save()
    .moveTo(x, y).lineTo(x + largura, y)
    .lineWidth(esp).stroke(hex)
    .restore();
}

function texto(doc: PDFKit.PDFDocument, t: string, x: number, y: number, opts: {
  font?: string; size?: number; color?: string; align?: "left"|"center"|"right"; width?: number; tracking?: number
}) {
  doc.save()
    .font(opts.font ?? MONO)
    .fontSize(opts.size ?? 9)
    .fillColor(opts.color ?? "#0C0C0A");
  if (opts.width) {
    doc.text(t, x, y, { align: opts.align ?? "left", width: opts.width, lineGap: 0, paragraphGap: 0, characterSpacing: opts.tracking ?? 0 });
  } else {
    doc.text(t, x, y, { align: opts.align ?? "left", lineGap: 0, paragraphGap: 0, characterSpacing: opts.tracking ?? 0 });
  }
  doc.restore();
}

function retangulo(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, hexFill: string) {
  doc.save().rect(x, y, w, h).fill(hexFill).restore();
}

function borda(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, hexStroke: string, esp = 0.5) {
  doc.save().rect(x, y, w, h).lineWidth(esp).stroke(hexStroke).restore();
}

// ── DADOS DE EXEMPLO ──────────────────────────────────────────────────────────
const PACIENTE = {
  nome: "Maria Francisca de Oliveira Borges",
  nascimento: "14/03/1978 · 47 anos",
  endereco: "Rua das Acácias, 214 · São Paulo · SP",
  data: "São Paulo, 18 de julho de 2026",
};

const MEDICO = {
  nome: "Dr. Caio H. F. Pádua",
  crm: "CRM 123456 · SP",
  especialidade: "Endocrinologista · CBO 2251-04",
  endereco: "Av. Paulista, 1.000 · Conj. 1205 · São Paulo · SP",
  tel: "(11) 3456-7890",
};

const PRESCRICAO = [
  { n: "I.",   nome: "Levotiroxina Sódica",  dose: "75 mcg · Comprimido", pos: "1 comprimido em jejum · 30 min antes do café da manhã", dur: "90 dias · Uso contínuo", obs: "Intervalo mínimo de 4 h de cálcio ou ferro." },
  { n: "II.",  nome: "Vitamina D3 + K2",     dose: "5.000 UI + 100 mcg · Cápsula", pos: "1 cápsula com refeição matinal", dur: "90 dias", obs: null },
  { n: "III.", nome: "Magnésio Dimalato",    dose: "400 mg · Cápsula", pos: "2 cápsulas com água à noite", dur: "60 dias", obs: "Superior ao óxido de magnésio em absorção." },
];

// ═══════════════════════════════════════════════════════════════════════════════
// LUX-A — MAISON BLANCHE
// Marfim · fio ouro triplo · header centrado · numerais romanos
// ═══════════════════════════════════════════════════════════════════════════════
function gerarLuxoA(): Buffer {
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  const bufs: Buffer[] = [];
  doc.on("data", (c) => bufs.push(c));

  const M = 52;
  const UW = W - M * 2;

  // Fundo marfim
  retangulo(doc, 0, 0, W, H, "#FAF7F1");

  // Faixa topo ouro
  retangulo(doc, 0, 0, W, 3, "#C9A84C");

  let y = M;

  // Monograma
  borda(doc, W/2 - 18, y, 36, 36, "#C9A84C", 0.5);
  texto(doc, "P", W/2 - 18, y + 8, { font: MONO_BOLD, size: 14, color: "#B8982A", align: "center", width: 36 });
  y += 48;

  // Instituição
  texto(doc, "Instituto Pádua · Medicina Integrativa".toUpperCase(), M, y, { size: 7, color: "#6B6358", align: "center", width: UW, tracking: 2 });
  y += 14;
  texto(doc, MEDICO.nome.toUpperCase(), M, y, { font: MONO_BOLD, size: 13, align: "center", width: UW, tracking: 1 });
  y += 18;
  texto(doc, (MEDICO.crm + " · " + MEDICO.especialidade).toUpperCase(), M, y, { size: 7, color: "#9A9189", align: "center", width: UW, tracking: 1 });
  y += 18;

  // Fio triplo
  linhaHorizontal(doc, M, y, UW, "#C9A84C", 0.7);
  linhaHorizontal(doc, M, y + 4, UW, "#C9A84C", 0.3);
  y += 14;

  // Rótulo documento
  texto(doc, "RECEITUÁRIO MÉDICO", M, y, { font: MONO_BOLD, size: 7, color: "#B8982A", align: "center", width: UW, tracking: 3 });
  y += 12;
  texto(doc, "Receita Comum · Validade 30 dias", M, y, { size: 7, color: "#9A9189", align: "center", width: UW });
  y += 22;

  // Bloco paciente
  retangulo(doc, M, y, UW, 66, "#F0EBE0");
  borda(doc, M, y, UW, 66, "#D5CBB8", 0.5);
  const py = y + 8;
  texto(doc, "PACIENTE", M + 10, py, { size: 7, color: "#9A9189", tracking: 2 });
  const campos = [["Nome", PACIENTE.nome], ["Nascimento", PACIENTE.nascimento], ["Endereço", PACIENTE.endereco]];
  let ry = py + 10;
  for (const [l, v] of campos) {
    linhaHorizontal(doc, M + 10, ry + 12, UW - 20, "#D5CBB8", 0.5);
    texto(doc, l.toUpperCase(), M + 10, ry, { size: 7, color: "#9A9189", tracking: 1 });
    texto(doc, v, M + 80, ry, { font: MONO_BOLD, size: 9, width: UW - 90 });
    ry += 17;
  }
  y += 74;

  // Linha ouro
  linhaHorizontal(doc, M, y, UW, "#C9A84C", 0.5);
  y += 14;

  // Prescrição
  texto(doc, "PRESCRIÇÃO", M, y, { font: MONO_BOLD, size: 7, color: "#B8982A", tracking: 3 });
  y += 16;

  for (const item of PRESCRICAO) {
    // numeral romano
    texto(doc, item.n, M, y + 1, { font: MONO_BOLD, size: 8, color: "#D4B96A" });
    const ix = M + 28;
    const iw = UW - 28;
    texto(doc, item.nome, ix, y, { font: MONO_BOLD, size: 11 });
    texto(doc, item.dose, ix + 220, y + 2, { size: 8, color: "#6B6358" });
    y += 14;
    texto(doc, item.pos, ix, y, { size: 9, color: "#6B6358", width: iw });
    y += 12;
    texto(doc, item.dur.toUpperCase(), ix, y, { size: 7, color: "#9A9189", tracking: 1 });
    y += 10;
    if (item.obs) {
      // barra lateral ouro
      doc.save().moveTo(ix - 6, y).lineTo(ix - 6, y + 14).lineWidth(1.5).stroke("#D4B96A").restore();
      texto(doc, item.obs, ix, y, { size: 8, color: "#9A9189", width: iw });
      y += 14;
    }
    linhaHorizontal(doc, M, y + 4, UW, "#D5CBB8", 0.5);
    y += 16;
  }

  // Assinatura
  y += 8;
  texto(doc, PACIENTE.data, M, y, { size: 9, color: "#6B6358" });
  // linha assinatura direita
  const assx = W - M - 160;
  linhaHorizontal(doc, assx, y + 2, 160, "#C9A84C", 0.5);
  texto(doc, "ASSINATURA DO MÉDICO", assx, y + 6, { size: 7, color: "#6B6358", align: "center", width: 160, tracking: 1 });
  texto(doc, MEDICO.crm, assx, y + 16, { size: 7, color: "#9A9189", align: "center", width: 160 });
  y += 36;

  // Rodapé
  linhaHorizontal(doc, M, y, UW, "#D5CBB8", 0.5);
  y += 8;
  texto(doc, (MEDICO.endereco + " · " + MEDICO.tel).toUpperCase(), M, y, { size: 7, color: "#9A9189", align: "center", width: UW, tracking: 1 });

  // Faixa base
  retangulo(doc, 0, H - 2, W, 2, "#C9A84C");

  doc.end();
  return Buffer.concat(bufs);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LUX-B — NOIR EXCELLENCE
// Header preto monolítico · corpo marfim · ouro hairline
// ═══════════════════════════════════════════════════════════════════════════════
function gerarLuxoB(): Buffer {
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  const bufs: Buffer[] = [];
  doc.on("data", (c) => bufs.push(c));

  const M = 48;
  const UW = W - M * 2;

  // Fundo marfim
  retangulo(doc, 0, 0, W, H, "#F8F4EE");

  // Header preto
  const HEADER_H = 160;
  retangulo(doc, 0, 0, W, HEADER_H, "#080808");

  // Linha ouro lateral direita no header
  retangulo(doc, W - 3, 0, 3, HEADER_H, "#B8982A");

  // Conteúdo header
  texto(doc, "Instituto Pádua · Est. 2018".toUpperCase(), M, 36, { size: 7, color: "#C9A84C", tracking: 3 });
  texto(doc, MEDICO.nome.replace("Dr. ", "DR.\n"), M, 54, { font: MONO_BOLD, size: 18, color: "#FFFFFF" });
  linhaHorizontal(doc, M, 100, 40, "#B8982A", 1);
  texto(doc, "Endocrinologia & Medicina Integrativa".toUpperCase(), M, 108, { size: 7.5, color: "#8A8278", tracking: 1 });
  texto(doc, MEDICO.crm.toUpperCase(), M, 120, { size: 7, color: "#8A8278", tracking: 1 });

  // Linha ouro separador header/corpo
  linhaHorizontal(doc, 0, HEADER_H, W, "#B8982A", 1);

  let y = HEADER_H + 24;

  // Rótulo + data
  texto(doc, "Receituário Médico".toUpperCase(), M, y, { font: MONO_BOLD, size: 7, color: "#B8982A", tracking: 3 });
  texto(doc, "18/07/2026  ·  São Paulo · SP", W - M - 140, y, { size: 8, color: "#6B6358", align: "right", width: 140 });
  y += 22;

  // Bloco paciente com barra ouro esquerda
  retangulo(doc, M, y, 2, 72, "#B8982A");
  texto(doc, "PACIENTE", M + 12, y, { size: 7, color: "#B8982A", tracking: 2 });
  y += 14;
  texto(doc, PACIENTE.nome, M + 12, y, { font: MONO_BOLD, size: 12 });
  y += 16;
  texto(doc, PACIENTE.nascimento, M + 12, y, { size: 8, color: "#6B6358" });
  y += 12;
  texto(doc, PACIENTE.endereco, M + 12, y, { size: 8, color: "#6B6358" });
  y += 20;

  // Linha dupla
  linhaHorizontal(doc, M, y, UW, "#C9A84C", 0.7);
  linhaHorizontal(doc, M, y + 5, UW, "#D8D0C0", 0.5);
  y += 20;

  // Prescrição
  texto(doc, "PRESCRIÇÃO", M, y, { font: MONO_BOLD, size: 7, color: "#1A1714", tracking: 3 });
  y += 16;

  for (const item of PRESCRICAO) {
    const ix = M + 26;
    const iw = UW - 26;
    texto(doc, item.n, M, y + 2, { font: MONO_BOLD, size: 8, color: "#C9A84C" });
    // nome + dose em linha
    texto(doc, item.nome, ix, y, { font: MONO_BOLD, size: 11 });
    texto(doc, item.dose, ix + 210, y + 2, { size: 7.5, color: "#6B6358" });
    y += 14;
    texto(doc, item.pos, ix, y, { size: 9, color: "#6B6358", width: iw });
    y += 12;
    texto(doc, item.dur.toUpperCase(), ix, y, { size: 7, color: "#9A9189", tracking: 1 });
    y += 10;
    if (item.obs) {
      linhaHorizontal(doc, ix - 1, y, UW - 26, "#EDED ED", 0); // divisor
      doc.save().rect(ix, y, 0.5, 12).fill("#D8D0C0").restore();
      texto(doc, item.obs, ix + 6, y, { size: 8, color: "#9A9189", width: iw - 6 });
      y += 14;
    }
    linhaHorizontal(doc, M, y + 4, UW, "#D8D0C0", 0.5);
    y += 16;
  }

  y += 10;
  // Assinatura direita
  const assx = W - M - 180;
  linhaHorizontal(doc, assx, y, 180, "#C9A84C", 0.5);
  texto(doc, MEDICO.nome.toUpperCase(), assx, y + 6, { size: 7.5, color: "#5E5750", align: "center", width: 180 });
  texto(doc, MEDICO.crm, assx, y + 16, { size: 7, color: "#9A9189", align: "center", width: 180 });

  // Rodapé
  const rodY = H - 48;
  linhaHorizontal(doc, M, rodY, UW, "#D8D0C0", 0.5);
  texto(doc, (MEDICO.endereco + " · " + MEDICO.tel).toUpperCase(), M, rodY + 8, { size: 7, color: "#9A9189", align: "center", width: UW, tracking: 1 });

  // Linha base ouro
  retangulo(doc, 0, H - 1, W, 1, "#B8982A");

  doc.end();
  return Buffer.concat(bufs);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LUX-C — CHAMPAGNE
// Creme · borda dupla · losango · espaço negativo
// ═══════════════════════════════════════════════════════════════════════════════
function gerarLuxoC(): Buffer {
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  const bufs: Buffer[] = [];
  doc.on("data", (c) => bufs.push(c));

  const M = 58;
  const UW = W - M * 2;
  const BM = 12; // borda margem

  // Fundo creme
  retangulo(doc, 0, 0, W, H, "#F9F5EC");

  // Borda dupla
  borda(doc, BM, BM, W - BM*2, H - BM*2, "#C9A84C", 0.5);
  borda(doc, BM+4, BM+4, W - (BM+4)*2, H - (BM+4)*2, "#D8D0BC", 0.5);

  let y = M;

  // Ornamento — linha + losango + linha
  const cx = W / 2;
  linhaHorizontal(doc, M, y, UW/2 - 14, "#C9A84C", 0.5);
  linhaHorizontal(doc, cx + 14, y, UW/2 - 14, "#C9A84C", 0.5);
  // losango (diamond)
  doc.save()
    .moveTo(cx, y - 5).lineTo(cx + 6, y).lineTo(cx, y + 5).lineTo(cx - 6, y)
    .closePath().lineWidth(1).stroke("#C9A84C").restore();
  y += 18;

  // Instituto
  texto(doc, "INSTITUTO PÁDUA".toUpperCase(), M, y, { size: 7, color: "#A8882A", align: "center", width: UW, tracking: 4 });
  y += 16;
  texto(doc, MEDICO.nome.toUpperCase(), M, y, { font: MONO_BOLD, size: 16, align: "center", width: UW, tracking: 1 });
  y += 20;
  texto(doc, "Endocrinologia · Medicina Integrativa".toUpperCase(), M, y, { size: 7.5, color: "#7A7368", align: "center", width: UW, tracking: 2 });
  y += 22;

  // Ornamento base header
  const cy2 = y;
  linhaHorizontal(doc, M, cy2, UW/2 - 8, "#D8D0BC", 0.5);
  linhaHorizontal(doc, cx + 8, cy2, UW/2 - 8, "#D8D0BC", 0.5);
  doc.save().rect(cx - 3, cy2 - 3, 6, 6).rotate(45, {origin:[cx, cy2]}).fill("#C9A84C").restore();
  y += 18;

  // Caixa rótulo documento
  borda(doc, cx - 90, y, 180, 20, "#A8882A", 0.5);
  texto(doc, "RECEITUÁRIO · RECEITA COMUM", cx - 90, y + 6, { font: MONO_BOLD, size: 7, color: "#A8882A", align: "center", width: 180, tracking: 2 });
  y += 32;

  // Linha dupla
  linhaHorizontal(doc, M, y, UW, "#C9A84C", 1);
  linhaHorizontal(doc, M, y + 5, UW, "#D8D0BC", 0.5);
  y += 18;

  // Paciente
  texto(doc, "DADOS DO PACIENTE", M, y, { size: 6.5, color: "#A8A098", tracking: 3 });
  y += 12;
  const camposC = [
    ["Nome Completo", PACIENTE.nome],
    ["Nascimento", PACIENTE.nascimento],
    ["Localidade", PACIENTE.endereco],
    ["Data", "São Paulo, 18 de julho de 2026"],
  ];
  for (const [l, v] of camposC) {
    linhaHorizontal(doc, M, y + 12, UW, "#D8D0BC", 0.5);
    texto(doc, l.toUpperCase(), M, y, { size: 6.5, color: "#A8A098", tracking: 1 });
    texto(doc, v, M + 110, y, { font: MONO_BOLD, size: 9, align: "right", width: UW - 110 });
    y += 18;
  }

  // Linha tripla
  linhaHorizontal(doc, M, y, UW, "#D8D0BC", 0.5);
  linhaHorizontal(doc, M, y + 6, UW, "#C9A84C", 0.7);
  linhaHorizontal(doc, M, y + 12, UW, "#D8D0BC", 0.5);
  y += 24;

  // Prescrição
  texto(doc, "PRESCRIÇÃO MÉDICA", M, y, { font: MONO_BOLD, size: 6.5, tracking: 3 });
  texto(doc, "Validade: 30 dias", W - M - 80, y, { size: 6.5, color: "#A8A098", align: "right", width: 80 });
  y += 16;

  for (const item of PRESCRICAO) {
    const ix = M + 22;
    const iw = UW - 22;
    texto(doc, item.n, M, y + 2, { font: MONO_BOLD, size: 8, color: "#C9A84C" });
    texto(doc, item.nome, ix, y, { font: MONO_BOLD, size: 11 });
    y += 14;
    texto(doc, item.dose.toUpperCase(), ix, y, { size: 7.5, color: "#7A7368", tracking: 1 });
    y += 12;
    texto(doc, item.pos, ix, y, { size: 9, color: "#5E5750", width: iw });
    y += 12;
    texto(doc, item.dur.toUpperCase(), ix, y, { size: 7, color: "#A8A098", tracking: 1 });
    y += 10;
    if (item.obs) {
      linhaHorizontal(doc, ix, y, iw, "#D8D0BC", 0.5);
      y += 6;
      doc.save().moveTo(ix, y).lineTo(ix, y+12).lineWidth(0.5).stroke("#C9A84C").restore();
      texto(doc, item.obs, ix + 6, y, { size: 8, color: "#A8A098", width: iw - 6 });
      y += 14;
    }
    linhaHorizontal(doc, M, y + 4, UW, "#D8D0BC", 0.5);
    y += 16;
  }

  // Assinatura
  y += 8;
  const asslx = M + 4;
  texto(doc, MEDICO.crm, asslx, y, { size: 7, color: "#A8A098", tracking: 1 });
  texto(doc, "CBO 2251-04", asslx, y + 10, { size: 7, color: "#A8A098", tracking: 1 });
  const assrx = W - M - 170;
  linhaHorizontal(doc, assrx, y + 2, 170, "#C9A84C", 0.5);
  texto(doc, "Assinatura e Carimbo", assrx, y + 8, { size: 7.5, color: "#5E5750", align: "center", width: 170, tracking: 1 });

  // Rodapé
  const rodY = H - 52;
  // ornamento linha + losango
  linhaHorizontal(doc, M, rodY, UW/2 - 8, "#D8D0BC", 0.5);
  linhaHorizontal(doc, cx + 8, rodY, UW/2 - 8, "#D8D0BC", 0.5);
  doc.save().moveTo(cx, rodY - 4).lineTo(cx + 4, rodY).lineTo(cx, rodY + 4).lineTo(cx - 4, rodY).closePath().lineWidth(0.5).stroke("#C9A84C").restore();
  texto(doc, (MEDICO.endereco + " · " + MEDICO.tel).toUpperCase(), M, rodY + 10, { size: 7, color: "#A8A098", align: "center", width: UW, tracking: 1 });

  doc.end();
  return Buffer.concat(bufs);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LUX-D — CAPA PROTOCOLO MAISON
// Fundo preto absoluto · ouro hairline · ornamento losango · centrado
// ═══════════════════════════════════════════════════════════════════════════════
function gerarLuxoD(): Buffer {
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  const bufs: Buffer[] = [];
  doc.on("data", (c) => bufs.push(c));

  const M = 56;
  const UW = W - M * 2;
  const cx = W / 2;

  // Fundo preto
  retangulo(doc, 0, 0, W, H, "#050403");

  // Borda interna
  borda(doc, 16, 16, W - 32, H - 32, "#7A6420", 0.5);

  // Faixa ouro topo
  retangulo(doc, 0, 0, W, 1.5, "#B8982A");

  let y = M + 10;

  // Instituto
  texto(doc, "Instituto Pádua · Medicina Integrativa".toUpperCase(), M, y, { size: 7, color: "#B8982A", align: "center", width: UW, tracking: 3 });
  y += 14;

  // Fio fino
  linhaHorizontal(doc, M + 80, y, UW - 160, "#7A6420", 0.5);
  y += 18;

  // Tipo documento
  texto(doc, "Protocolo Terapêutico".toUpperCase(), M, y, { size: 7, color: "#8A8278", align: "center", width: UW, tracking: 3 });
  y += 14;

  // Fio ouro
  linhaHorizontal(doc, cx - 24, y, 48, "#B8982A", 0.7);
  y += 16;

  // Título principal
  texto(doc, "PROTOCOLO DE", M, y, { font: MONO_BOLD, size: 22, color: "#F8F4EE", align: "center", width: UW });
  y += 28;
  texto(doc, "LONGEVIDADE", M, y, { font: MONO_BOLD, size: 22, color: "#F8F4EE", align: "center", width: UW });
  y += 28;
  texto(doc, "Cuidado Integrativo Avançado".toUpperCase(), M, y, { size: 9, color: "#C9A84C", align: "center", width: UW, tracking: 2 });
  y += 32;

  // Ornamento losango triplo
  const oy = y + 20;
  // externo
  doc.save().moveTo(cx, oy - 22).lineTo(cx + 22, oy).lineTo(cx, oy + 22).lineTo(cx - 22, oy).closePath().lineWidth(0.5).stroke("#B8982A").restore();
  // médio
  doc.save().moveTo(cx, oy - 14).lineTo(cx + 14, oy).lineTo(cx, oy + 14).lineTo(cx - 14, oy).closePath().lineWidth(0.8).stroke("#B8982A").restore();
  // núcleo sólido
  doc.save().moveTo(cx, oy - 4).lineTo(cx + 4, oy).lineTo(cx, oy + 4).lineTo(cx - 4, oy).closePath().fill("#B8982A").restore();
  y = oy + 36;

  // Caixa de dados
  borda(doc, cx - 150, y, 300, 80, "#7A6420", 0.5);
  const dados = [
    ["Paciente", PACIENTE.nome],
    ["Nascimento", PACIENTE.nascimento],
    ["Código", "PROT-2026-001847"],
  ];
  let dy = y + 10;
  for (const [l, v] of dados) {
    texto(doc, l.toUpperCase(), cx - 140, dy, { size: 6.5, color: "#8A8278", tracking: 2 });
    texto(doc, v, cx - 140, dy, { size: 9, font: MONO_BOLD, color: "#F8F4EE", align: "right", width: 280 });
    linhaHorizontal(doc, cx - 140, dy + 13, 280, "#3A2E18", 0.5);
    dy += 20;
  }
  y += 90;

  // Rodapé
  const rodY = H - M - 20;
  linhaHorizontal(doc, M, rodY - 30, UW, "#7A6420", 0.5);
  linhaHorizontal(doc, M, rodY - 24, UW, "#3A2E18", 0.3);

  texto(doc, MEDICO.nome.toUpperCase(), M, rodY - 16, { font: MONO_BOLD, size: 9, color: "#F8F4EE" });
  texto(doc, (MEDICO.crm + " · Endocrinologista").toUpperCase(), M, rodY - 4, { size: 7, color: "#8A8278", tracking: 1 });

  // Assinatura direita
  linhaHorizontal(doc, W - M - 140, rodY - 20, 140, "#B8982A", 0.5);
  texto(doc, "Assinatura", W - M - 140, rodY - 14, { size: 7, color: "#8A8278", align: "center", width: 140, tracking: 1 });
  texto(doc, "São Paulo · 18/07/2026", W - M - 140, rodY - 4, { size: 8, color: "#C8C2B8", align: "center", width: 140 });

  // Endereço base
  texto(doc, (MEDICO.endereco + " · " + MEDICO.tel).toUpperCase(), M, rodY + 10, { size: 6.5, color: "#7A6420", align: "center", width: UW, tracking: 1 });

  // Faixa ouro base
  retangulo(doc, 0, H - 1.5, W, 1.5, "#B8982A");

  doc.end();
  return Buffer.concat(bufs);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log("▶  Gerando PDFs Série Luxo v2…");

  const pdfs = [
    { nome: "LUX-A__Receituario_Maison_Blanche_v2.pdf",  gerador: gerarLuxoA, desc: "Série Luxo A v2 — Maison Blanche · marfim + ouro hairline · estilo Dior" },
    { nome: "LUX-B__Receituario_Noir_Excellence_v2.pdf", gerador: gerarLuxoB, desc: "Série Luxo B v2 — Noir Excellence · header preto + ouro hairline · estilo Hermès" },
    { nome: "LUX-C__Receituario_Champagne_v2.pdf",       gerador: gerarLuxoC, desc: "Série Luxo C v2 — Champagne · creme + borda dupla + losango" },
    { nome: "LUX-D__Capa_Protocolo_Maison_v2.pdf",       gerador: gerarLuxoD, desc: "Série Luxo D v2 — Protocolo Maison · fundo preto + ouro + ornamento losango" },
  ];

  console.log("   Gerando buffers…");
  const buffers = pdfs.map(p => ({ ...p, buffer: p.gerador() }));
  console.log(`   ${buffers.length} PDFs gerados em memória.`);

  console.log("   Conectando ao Drive…");
  const drive = await getDriveClient();

  for (const p of buffers) {
    await uploadPdf(drive, p.nome, p.buffer, p.desc);
  }

  console.log("\n══════════════════════════════════════════════");
  console.log(`  ${pdfs.length} PDFs enviados — Série Luxo v2`);
  console.log(`  https://drive.google.com/drive/folders/${PASTA_DESTINO_ID}`);
  console.log("══════════════════════════════════════════════");
}

main().catch(console.error);
