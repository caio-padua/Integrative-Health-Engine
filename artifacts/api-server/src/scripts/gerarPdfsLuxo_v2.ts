/**
 * SÉRIE LUXO v2 — 4 PDFs de alta qualidade
 * Fontes: DejaVu Serif (editorial elegante) + DejaVu Sans (limpeza)
 * Paleta: marfim · ouro hairline · preto absoluto · champagne
 * Estética: Dior / Hermès — respiro generoso, hierarquia tipográfica, ornamentos cirúrgicos
 */
import PDFDocument from "pdfkit";
import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";

// ── Fontes embarcadas ─────────────────────────────────────────────────────────
const F = {
  serif:      "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
  serifBold:  "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
  sans:       "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  sansBold:   "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  mono:       "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
};

// ── Paleta ────────────────────────────────────────────────────────────────────
const C = {
  marfim:      "#FAF7F1",
  champagne:   "#F4EFE4",
  creme:       "#EDE6D6",
  preto:       "#080808",
  pretoAbs:    "#050403",
  texto:       "#1A1714",
  textoSub:    "#5A524A",
  textoMuted:  "#8C8278",
  ouro:        "#C9A84C",
  ouroDeep:    "#B8982A",
  ouroPale:    "#D4B96A",
  ouroEscuro:  "#7A6420",
  ouroSombra:  "#3A2E18",
  creamLine:   "#D8CFC0",
  creamBlock:  "#EDE7D8",
};

// ── Drive ─────────────────────────────────────────────────────────────────────
const PASTA_ID = "12lsL8VV7GxoSMKgk70-mOMdw2OHdCuVL";
const CONN_ID  = "conn_google-drive_01KNNJP2AQVYCB2AV3SQ3DQ367";

async function getToken(): Promise<string> {
  const host  = process.env.REPLIT_CONNECTORS_HOSTNAME!;
  const ident = process.env.REPL_IDENTITY ? "repl " + process.env.REPL_IDENTITY : "";
  const r = await fetch(`https://${host}/api/v2/connection/${CONN_ID}?include_secrets=true`, {
    headers: { Accept: "application/json", "X-Replit-Token": ident },
  });
  return ((await r.json()) as any)?.settings?.access_token as string;
}

async function driveClient() {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: await getToken() });
  return google.drive({ version: "v3", auth });
}

async function uploadArquivo(drive: ReturnType<typeof google.drive>, nome: string, caminho: string, desc: string) {
  const { size } = fs.statSync(caminho);
  const { data: busca } = await drive.files.list({
    q: `name='${nome}' and '${PASTA_ID}' in parents and trashed=false`,
    fields: "files(id,name)",
  });
  if (busca.files?.length) {
    for (const f of busca.files) await drive.files.delete({ fileId: f.id! });
  }
  const { data } = await drive.files.create({
    requestBody: { name: nome, parents: [PASTA_ID], description: desc, mimeType: "application/pdf" },
    media: { mimeType: "application/pdf", body: fs.createReadStream(caminho) },
    fields: "id,name,size",
  });
  console.log(`  ✓ ${data.name}  ·  ${size.toLocaleString("pt-BR")} bytes  ·  id=${data.id}`);
}

// ── Helper: gerar PDF para arquivo ───────────────────────────────────────────
function gerarPdf(desenhar: (doc: PDFKit.PDFDocument) => void, destino: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const stream = fs.createWriteStream(destino);
    doc.pipe(stream);
    desenhar(doc);
    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

// ── Helpers de desenho ────────────────────────────────────────────────────────
const PW = 595.28;
const PH = 841.89;

function faixa(doc: PDFKit.PDFDocument, y: number, h: number, hex: string) {
  doc.rect(0, y, PW, h).fill(hex);
}

function linha(doc: PDFKit.PDFDocument, x1: number, y: number, x2: number, hex: string, esp = 0.5) {
  doc.moveTo(x1, y).lineTo(x2, y).lineWidth(esp).stroke(hex);
}

function linhaV(doc: PDFKit.PDFDocument, x: number, y1: number, y2: number, hex: string, esp = 1) {
  doc.moveTo(x, y1).lineTo(x, y2).lineWidth(esp).stroke(hex);
}

function retang(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, hex: string) {
  doc.rect(x, y, w, h).fill(hex);
}

function borda(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, hex: string, esp = 0.5) {
  doc.rect(x, y, w, h).lineWidth(esp).stroke(hex);
}

// Losango ornamental centrado
function losango(doc: PDFKit.PDFDocument, cx: number, cy: number, r: number, hex: string, esp = 0.7, solid = false) {
  const path = doc.moveTo(cx, cy - r).lineTo(cx + r, cy).lineTo(cx, cy + r).lineTo(cx - r, cy).closePath();
  if (solid) path.fill(hex);
  else path.lineWidth(esp).stroke(hex);
}

// Texto com fonte e estilo
function txt(
  doc: PDFKit.PDFDocument,
  texto: string,
  x: number,
  y: number,
  opts: {
    font: string;
    size: number;
    color: string;
    align?: "left" | "center" | "right";
    width?: number;
    tracking?: number;
    lineGap?: number;
  }
) {
  const d = doc
    .font(opts.font)
    .fontSize(opts.size)
    .fillColor(opts.color);
  if (opts.width !== undefined) {
    d.text(texto, x, y, {
      align: opts.align ?? "left",
      width: opts.width,
      lineGap: opts.lineGap ?? 0,
      paragraphGap: 0,
      characterSpacing: opts.tracking ?? 0,
    });
  } else {
    d.text(texto, x, y, {
      align: opts.align ?? "left",
      lineGap: opts.lineGap ?? 0,
      paragraphGap: 0,
      characterSpacing: opts.tracking ?? 0,
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// LUX-A — MAISON BLANCHE
// Estética Dior: fundo marfim, tipografia serif elegante, ouro hairline, respiro máximo
// ════════════════════════════════════════════════════════════════════════════════
function desenharLuxoA(doc: PDFKit.PDFDocument) {
  const M = 54, UW = PW - M * 2, cx = PW / 2;

  // ── Fundo & faixas ──────────────────────────────────────────────────────────
  retang(doc, 0, 0, PW, PH, C.marfim);
  faixa(doc, 0, 2.5, C.ouro);
  faixa(doc, PH - 2.5, 2.5, C.ouro);

  // ── Monograma P ─────────────────────────────────────────────────────────────
  const MY = 40;
  borda(doc, cx - 20, MY, 40, 40, C.ouro, 0.7);
  doc.font(F.serifBold).fontSize(22).fillColor(C.ouroDeep)
     .text("P", cx - 20, MY + 9, { align: "center", width: 40 });

  // ── Identidade ──────────────────────────────────────────────────────────────
  let y = MY + 56;
  txt(doc, "INSTITUTO PÁDUA", M, y, { font: F.sans, size: 7, color: C.textoMuted, align: "center", width: UW, tracking: 3.5 });
  y += 13;
  txt(doc, "Dr. Caio Henrique Fernandes Pádua", M, y, { font: F.serifBold, size: 15, color: C.texto, align: "center", width: UW, tracking: 0.3 });
  y += 20;
  txt(doc, "Endocrinologia & Medicina Integrativa", M, y, { font: F.serif, size: 9, color: C.textoSub, align: "center", width: UW, tracking: 0.5 });
  y += 13;
  txt(doc, "CRM 123456 · SP · CBO 2251-04", M, y, { font: F.mono, size: 7.5, color: C.textoMuted, align: "center", width: UW });
  y += 22;

  // ── Fio triplo ouro ─────────────────────────────────────────────────────────
  linha(doc, M, y, M + UW, C.ouro, 0.8);
  linha(doc, M, y + 4, M + UW, C.ouroPale, 0.3);
  linha(doc, M, y + 8, M + UW, C.ouro, 0.4);
  y += 22;

  // ── Rótulo do documento ──────────────────────────────────────────────────────
  txt(doc, "RECEITUÁRIO MÉDICO", M, y, { font: F.sansBold, size: 7, color: C.ouroDeep, align: "center", width: UW, tracking: 4 });
  y += 12;
  txt(doc, "Receita Simples — Validade 30 dias", M, y, { font: F.sans, size: 8, color: C.textoMuted, align: "center", width: UW });
  y += 30;

  // ── Bloco paciente ───────────────────────────────────────────────────────────
  retang(doc, M, y, UW, 74, C.creamBlock);
  borda(doc, M, y, UW, 74, C.creamLine, 0.5);
  const LP = M + 12, VP = M + 100;
  txt(doc, "PACIENTE", LP, y + 8, { font: F.sansBold, size: 6.5, color: C.textoMuted, tracking: 2.5 });
  const campos: [string, string, number][] = [
    ["Nome",       "Maria Francisca de Oliveira Borges", y + 22],
    ["Nascimento", "14/03/1978  ·  47 anos",             y + 40],
    ["Endereço",   "Rua das Acácias, 214 · São Paulo · SP", y + 56],
  ];
  for (const [l, v, yy] of campos) {
    txt(doc, l.toUpperCase(), LP, yy, { font: F.sans, size: 6.5, color: C.textoMuted, tracking: 0.5 });
    txt(doc, v, VP, yy, { font: F.serifBold, size: 9.5, color: C.texto, width: UW - (VP - M) - 4 });
    if (yy < y + 56) linha(doc, LP, yy + 13, M + UW - LP + M, C.creamLine, 0.4);
  }
  y += 88;

  // ── Separador ouro ──────────────────────────────────────────────────────────
  linha(doc, M, y, M + UW, C.ouro, 0.6);
  y += 18;

  // ── Prescrição ───────────────────────────────────────────────────────────────
  txt(doc, "PRESCRIÇÃO", M, y, { font: F.sansBold, size: 7, color: C.ouroDeep, tracking: 4 });
  y += 20;

  const RX = [
    { n: "I.",   nome: "Levotiroxina Sódica",  dose: "75 mcg · Comprimido",       pos: "1 comprimido em jejum, 30 minutos antes do café da manhã.", dur: "90 dias · Uso contínuo", obs: "Intervalo mínimo de 4 horas de cálcio ou ferro." },
    { n: "II.",  nome: "Vitamina D3 + K2",     dose: "5.000 UI + 100 mcg · Cáps.", pos: "1 cápsula com a principal refeição do dia.",               dur: "90 dias", obs: null },
    { n: "III.", nome: "Magnésio Dimalato",    dose: "400 mg · Cápsula",           pos: "2 cápsulas com água, à noite antes de dormir.",            dur: "60 dias", obs: "Maior absorção que o óxido de magnésio." },
  ];

  for (const it of RX) {
    // Numeral romano em ouro
    txt(doc, it.n, M, y + 1, { font: F.serifBold, size: 9, color: C.ouroPale });
    const IX = M + 26, IW = UW - 26;
    // Nome do medicamento
    txt(doc, it.nome, IX, y, { font: F.serifBold, size: 12, color: C.texto });
    // Dose à direita
    txt(doc, it.dose, IX + 200, y + 2, { font: F.sans, size: 8, color: C.textoSub, align: "right", width: IW - 200 });
    y += 16;
    // Posologia
    txt(doc, it.pos, IX, y, { font: F.serif, size: 9.5, color: C.textoSub, width: IW });
    y += 14;
    // Duração
    txt(doc, it.dur.toUpperCase(), IX, y, { font: F.sans, size: 7, color: C.textoMuted, tracking: 0.5 });
    y += 11;
    // Observação com barra lateral ouro
    if (it.obs) {
      linhaV(doc, IX - 5, y, y + 16, C.ouroPale, 1.5);
      txt(doc, it.obs, IX, y, { font: F.serif, size: 8.5, color: C.textoMuted, width: IW });
      y += 18;
    }
    linha(doc, M, y + 6, M + UW, C.creamLine, 0.5);
    y += 20;
  }

  // ── Assinatura & data ────────────────────────────────────────────────────────
  y += 8;
  txt(doc, "São Paulo, 18 de julho de 2026", M, y, { font: F.serif, size: 9, color: C.textoSub });
  const AX = PW - M - 170;
  linha(doc, AX, y + 2, AX + 170, C.ouro, 0.6);
  txt(doc, "Assinatura do Médico Responsável", AX, y + 7, { font: F.sans, size: 7, color: C.textoMuted, align: "center", width: 170, tracking: 0.3 });
  txt(doc, "CRM 123456 · SP", AX, y + 17, { font: F.mono, size: 7.5, color: C.textoMuted, align: "center", width: 170 });
  y += 40;

  // ── Rodapé ───────────────────────────────────────────────────────────────────
  linha(doc, M, y, M + UW, C.creamLine, 0.5);
  y += 8;
  txt(doc, "Av. Paulista, 1.000 · Conj. 1205 · São Paulo · SP  ·  (11) 3456-7890", M, y,
      { font: F.sans, size: 7, color: C.textoMuted, align: "center", width: UW, tracking: 0.3 });
}

// ════════════════════════════════════════════════════════════════════════════════
// LUX-B — NOIR EXCELLENCE
// Estética Hermès: header preto monolítico, nome grande em branco, ouro hairline
// ════════════════════════════════════════════════════════════════════════════════
function desenharLuxoB(doc: PDFKit.PDFDocument) {
  const M = 48, UW = PW - M * 2;

  // ── Fundo & header preto ─────────────────────────────────────────────────────
  retang(doc, 0, 0, PW, PH, C.marfim);
  const HH = 172;
  retang(doc, 0, 0, PW, HH, C.preto);
  // Barra vertical ouro direita
  retang(doc, PW - 4, 0, 4, HH, C.ouroDeep);

  // ── Conteúdo do header ───────────────────────────────────────────────────────
  txt(doc, "INSTITUTO PÁDUA  ·  MEDICINA INTEGRATIVA  ·  DESDE 2018", M, 30, {
    font: F.sans, size: 6.5, color: C.ouro, tracking: 2,
  });
  txt(doc, "Dr. Caio Henrique", M, 50, { font: F.serifBold, size: 22, color: "#FFFFFF" });
  txt(doc, "Fernandes Pádua", M, 76, { font: F.serifBold, size: 22, color: "#FFFFFF" });
  linha(doc, M, 107, M + 52, C.ouroDeep, 1.2);
  txt(doc, "Endocrinologia & Medicina Integrativa", M, 115, { font: F.serif, size: 9, color: "#9A9189", tracking: 0.3 });
  txt(doc, "CRM 123456 · SP · CBO 2251-04", M, 130, { font: F.mono, size: 7.5, color: "#7A7268" });
  // Badge tipo documento
  borda(doc, PW - M - 110, 24, 110, 22, C.ouroEscuro, 0.5);
  txt(doc, "RECEITUÁRIO MÉDICO", PW - M - 110, 31, { font: F.sansBold, size: 6, color: C.ouroPale, align: "center", width: 110, tracking: 1.5 });

  // ── Separador ouro ───────────────────────────────────────────────────────────
  linha(doc, 0, HH, PW, C.ouroDeep, 1.2);

  let y = HH + 26;

  // ── Data + validade ──────────────────────────────────────────────────────────
  txt(doc, "18 de julho de 2026  ·  São Paulo · SP", M, y, { font: F.serif, size: 8.5, color: C.textoSub });
  txt(doc, "Receita Simples — Validade 30 dias", PW - M - 170, y, { font: F.sans, size: 7.5, color: C.textoMuted, align: "right", width: 170 });
  y += 28;

  // ── Bloco paciente (barra vertical ouro esquerda) ────────────────────────────
  linhaV(doc, M, y, y + 80, C.ouroDeep, 2.5);
  const PX = M + 14;
  txt(doc, "PACIENTE", PX, y, { font: F.sansBold, size: 6.5, color: C.ouroDeep, tracking: 3 });
  y += 14;
  txt(doc, "Maria Francisca de Oliveira Borges", PX, y, { font: F.serifBold, size: 13, color: C.texto, width: UW - 14 });
  y += 18;
  txt(doc, "Nascimento:", PX, y, { font: F.sans, size: 8, color: C.textoMuted });
  txt(doc, "14/03/1978  ·  47 anos", PX + 68, y, { font: F.serif, size: 9, color: C.textoSub });
  y += 14;
  txt(doc, "Endereço:", PX, y, { font: F.sans, size: 8, color: C.textoMuted });
  txt(doc, "Rua das Acácias, 214  ·  São Paulo · SP", PX + 68, y, { font: F.serif, size: 9, color: C.textoSub });
  y += 24;

  // ── Dupla linha divisora ─────────────────────────────────────────────────────
  linha(doc, M, y, M + UW, C.ouro, 0.8);
  linha(doc, M, y + 5, M + UW, C.creamLine, 0.4);
  y += 22;

  // ── Prescrição ───────────────────────────────────────────────────────────────
  txt(doc, "PRESCRIÇÃO", M, y, { font: F.sansBold, size: 7, color: C.texto, tracking: 4 });
  y += 20;

  const RXB = [
    { n: "I.",   nome: "Levotiroxina Sódica",  dose: "75 mcg · Comprimido",        pos: "1 comprimido em jejum, 30 min antes do café da manhã.", dur: "90 dias · Uso contínuo", obs: "Intervalo mínimo de 4 horas de cálcio ou ferro." },
    { n: "II.",  nome: "Vitamina D3 + K2",     dose: "5.000 UI + 100 mcg · Cáps.", pos: "1 cápsula com a principal refeição do dia.",            dur: "90 dias", obs: null },
    { n: "III.", nome: "Magnésio Dimalato",    dose: "400 mg · Cápsula",            pos: "2 cápsulas com água, à noite.",                         dur: "60 dias", obs: "Maior absorção que o óxido de magnésio." },
  ];

  for (const it of RXB) {
    txt(doc, it.n, M, y + 1, { font: F.serifBold, size: 9, color: C.ouro });
    const IX = M + 26, IW = UW - 26;
    txt(doc, it.nome, IX, y, { font: F.serifBold, size: 12, color: C.texto });
    txt(doc, it.dose, PW - M - 2, y + 2, { font: F.sans, size: 8, color: C.textoSub, align: "right", width: 170 });
    y += 16;
    txt(doc, it.pos, IX, y, { font: F.serif, size: 9.5, color: C.textoSub, width: IW });
    y += 14;
    txt(doc, it.dur.toUpperCase(), IX, y, { font: F.sans, size: 7, color: C.textoMuted, tracking: 0.5 });
    y += 11;
    if (it.obs) {
      linhaV(doc, IX - 5, y, y + 16, C.ouro, 1.5);
      txt(doc, it.obs, IX, y, { font: F.serif, size: 8.5, color: C.textoMuted, width: IW });
      y += 18;
    }
    linha(doc, M, y + 6, M + UW, C.creamLine, 0.5);
    y += 20;
  }

  // ── Assinatura ────────────────────────────────────────────────────────────────
  y += 10;
  const AX = PW - M - 180;
  linha(doc, AX, y, AX + 180, C.ouro, 0.7);
  txt(doc, "Dr. Caio H. F. Pádua", AX, y + 6, { font: F.serifBold, size: 9, color: C.textoSub, align: "center", width: 180 });
  txt(doc, "CRM 123456 · SP  ·  Endocrinologista", AX, y + 18, { font: F.mono, size: 7, color: C.textoMuted, align: "center", width: 180 });

  // ── Rodapé ────────────────────────────────────────────────────────────────────
  const RY = PH - 48;
  linha(doc, M, RY, M + UW, C.creamLine, 0.5);
  txt(doc, "Av. Paulista, 1.000 · Conj. 1205 · São Paulo · SP  ·  (11) 3456-7890", M, RY + 8,
      { font: F.sans, size: 7, color: C.textoMuted, align: "center", width: UW, tracking: 0.3 });

  // Faixa ouro base
  faixa(doc, PH - 2, 2, C.ouroDeep);
}

// ════════════════════════════════════════════════════════════════════════════════
// LUX-C — CHAMPAGNE
// Estética editorial: champagne, moldura dupla, losango, espaço negativo, serif puro
// ════════════════════════════════════════════════════════════════════════════════
function desenharLuxoC(doc: PDFKit.PDFDocument) {
  const M = 60, UW = PW - M * 2, cx = PW / 2;
  const BM = 14; // margem da borda externa

  // ── Fundo champagne ──────────────────────────────────────────────────────────
  retang(doc, 0, 0, PW, PH, C.champagne);

  // ── Moldura dupla ────────────────────────────────────────────────────────────
  borda(doc, BM, BM, PW - BM * 2, PH - BM * 2, C.ouro, 0.7);
  borda(doc, BM + 5, BM + 5, PW - (BM + 5) * 2, PH - (BM + 5) * 2, C.creamLine, 0.4);

  let y = M;

  // ── Ornamento topo: linha + losango duplo + linha ─────────────────────────────
  linha(doc, M, y, cx - 18, C.ouro, 0.6);
  linha(doc, cx + 18, y, M + UW, C.ouro, 0.6);
  losango(doc, cx, y, 8, C.ouro, 0.7);
  losango(doc, cx, y, 4, C.ouro, 0, true);
  y += 22;

  // ── Identidade ──────────────────────────────────────────────────────────────
  txt(doc, "INSTITUTO PÁDUA", M, y, { font: F.sans, size: 7, color: C.ouroDeep, align: "center", width: UW, tracking: 5 });
  y += 15;
  txt(doc, "Dr. Caio Henrique Fernandes Pádua", M, y, { font: F.serifBold, size: 17, color: C.texto, align: "center", width: UW, tracking: 0.2 });
  y += 24;
  txt(doc, "Endocrinologia & Medicina Integrativa", M, y, { font: F.serif, size: 9.5, color: C.textoSub, align: "center", width: UW, tracking: 0.5 });
  y += 26;

  // ── Ornamento meio: linha + quadrado girado + linha ──────────────────────────
  linha(doc, M, y, cx - 10, C.creamLine, 0.5);
  linha(doc, cx + 10, y, M + UW, C.creamLine, 0.5);
  doc.moveTo(cx - 5, y).lineTo(cx, y - 5).lineTo(cx + 5, y).lineTo(cx, y + 5).closePath().fill(C.ouro);
  y += 18;

  // ── Caixa rótulo ─────────────────────────────────────────────────────────────
  borda(doc, cx - 100, y, 200, 24, C.ouroDeep, 0.6);
  txt(doc, "RECEITUÁRIO  ·  RECEITA SIMPLES", cx - 100, y + 7,
      { font: F.sansBold, size: 6.5, color: C.ouroDeep, align: "center", width: 200, tracking: 2 });
  y += 36;

  // ── Separador ────────────────────────────────────────────────────────────────
  linha(doc, M, y, M + UW, C.ouro, 0.9);
  linha(doc, M, y + 5, M + UW, C.ouro, 0.3);
  y += 20;

  // ── Paciente ─────────────────────────────────────────────────────────────────
  txt(doc, "DADOS DO PACIENTE", M, y, { font: F.sansBold, size: 6.5, color: C.textoMuted, tracking: 3 });
  y += 14;

  const PCC: [string, string][] = [
    ["Nome Completo", "Maria Francisca de Oliveira Borges"],
    ["Data de Nascimento", "14/03/1978  ·  47 anos"],
    ["Endereço", "Rua das Acácias, 214  ·  São Paulo · SP"],
    ["Data", "São Paulo, 18 de julho de 2026"],
  ];
  for (const [l, v] of PCC) {
    txt(doc, l.toUpperCase(), M, y, { font: F.sans, size: 6.5, color: C.textoMuted, tracking: 0.5 });
    txt(doc, v, M, y, { font: F.serifBold, size: 9.5, color: C.texto, align: "right", width: UW });
    linha(doc, M, y + 14, M + UW, C.creamLine, 0.5);
    y += 20;
  }
  y += 6;

  // ── Separador triplo ─────────────────────────────────────────────────────────
  linha(doc, M, y, M + UW, C.creamLine, 0.4);
  linha(doc, M, y + 6, M + UW, C.ouro, 0.8);
  linha(doc, M, y + 12, M + UW, C.creamLine, 0.4);
  y += 26;

  // ── Prescrição ───────────────────────────────────────────────────────────────
  txt(doc, "PRESCRIÇÃO MÉDICA", M, y, { font: F.sansBold, size: 7, color: C.texto, tracking: 3 });
  txt(doc, "Validade: 30 dias", M + UW, y, { font: F.sans, size: 7.5, color: C.textoMuted, align: "right", width: UW });
  y += 20;

  const RXC = [
    { n: "I.",   nome: "Levotiroxina Sódica",  dose: "75 mcg · Comprimido",        pos: "1 comprimido em jejum, 30 min antes do café da manhã.", dur: "90 DIAS  ·  USO CONTÍNUO", obs: "Intervalo mínimo de 4 h de cálcio ou ferro." },
    { n: "II.",  nome: "Vitamina D3 + K2",     dose: "5.000 UI + 100 mcg · Cáps.", pos: "1 cápsula com a principal refeição do dia.",            dur: "90 DIAS", obs: null },
    { n: "III.", nome: "Magnésio Dimalato",    dose: "400 mg · Cápsula",            pos: "2 cápsulas com água, à noite.",                         dur: "60 DIAS", obs: "Maior absorção que o óxido de magnésio." },
  ];

  for (const it of RXC) {
    txt(doc, it.n, M, y + 1, { font: F.serifBold, size: 9, color: C.ouro });
    const IX = M + 26, IW = UW - 26;
    txt(doc, it.nome, IX, y, { font: F.serifBold, size: 12, color: C.texto });
    txt(doc, it.dose, PW - M - 2, y + 2, { font: F.sans, size: 8, color: C.textoSub, align: "right", width: 170 });
    y += 16;
    txt(doc, it.pos, IX, y, { font: F.serif, size: 9.5, color: C.textoSub, width: IW });
    y += 14;
    txt(doc, it.dur, IX, y, { font: F.sans, size: 7, color: C.textoMuted, tracking: 0.5 });
    y += 11;
    if (it.obs) {
      linhaV(doc, IX - 5, y, y + 16, C.ouroPale, 1.5);
      txt(doc, it.obs, IX, y, { font: F.serif, size: 8.5, color: C.textoMuted, width: IW });
      y += 18;
    }
    linha(doc, M, y + 6, M + UW, C.creamLine, 0.5);
    y += 20;
  }

  // ── Assinatura ────────────────────────────────────────────────────────────────
  y += 10;
  txt(doc, "CRM 123456 · SP  ·  CBO 2251-04", M, y, { font: F.mono, size: 7.5, color: C.textoMuted });
  const AX = PW - M - 175;
  linha(doc, AX, y + 2, AX + 175, C.ouro, 0.7);
  txt(doc, "Assinatura e Carimbo", AX, y + 8, { font: F.sans, size: 7.5, color: C.textoSub, align: "center", width: 175, tracking: 0.5 });

  // ── Ornamento rodapé ─────────────────────────────────────────────────────────
  const RY = PH - 58;
  linha(doc, M, RY, cx - 12, C.creamLine, 0.5);
  linha(doc, cx + 12, RY, M + UW, C.creamLine, 0.5);
  losango(doc, cx, RY, 6, C.ouro, 0.6);
  losango(doc, cx, RY, 3, C.ouro, 0, true);
  txt(doc, "Av. Paulista, 1.000 · Conj. 1205 · São Paulo · SP  ·  (11) 3456-7890", M, RY + 12,
      { font: F.sans, size: 7, color: C.textoMuted, align: "center", width: UW, tracking: 0.3 });
}

// ════════════════════════════════════════════════════════════════════════════════
// LUX-D — CAPA PROTOCOLO MAISON
// Estética Hermès/Cartier: página totalmente preta, ouro hairline, serif branco, ornamento
// ════════════════════════════════════════════════════════════════════════════════
function desenharLuxoD(doc: PDFKit.PDFDocument) {
  const M = 58, UW = PW - M * 2, cx = PW / 2;
  const BM = 18;

  // ── Fundo preto absoluto ─────────────────────────────────────────────────────
  retang(doc, 0, 0, PW, PH, C.pretoAbs);
  faixa(doc, 0, 2, C.ouroDeep);

  // ── Borda interna ouro ───────────────────────────────────────────────────────
  borda(doc, BM, BM, PW - BM * 2, PH - BM * 2, C.ouroEscuro, 0.6);

  let y = M + 10;

  // ── Identidade topo ──────────────────────────────────────────────────────────
  txt(doc, "INSTITUTO PÁDUA  ·  MEDICINA INTEGRATIVA", M, y,
      { font: F.sans, size: 7, color: C.ouro, align: "center", width: UW, tracking: 2.5 });
  y += 14;
  linha(doc, M + 100, y, M + UW - 100, C.ouroEscuro, 0.5);
  y += 22;

  // ── Tipo documento ───────────────────────────────────────────────────────────
  txt(doc, "PROTOCOLO TERAPÊUTICO", M, y, { font: F.sans, size: 7.5, color: "#8A8278", align: "center", width: UW, tracking: 3 });
  y += 14;
  linha(doc, cx - 28, y, cx + 28, C.ouroDeep, 0.8);
  y += 22;

  // ── Título principal ─────────────────────────────────────────────────────────
  txt(doc, "PROTOCOLO DE", M, y, { font: F.serifBold, size: 26, color: "#F8F4EE", align: "center", width: UW, tracking: 1 });
  y += 34;
  txt(doc, "LONGEVIDADE", M, y, { font: F.serifBold, size: 26, color: "#F8F4EE", align: "center", width: UW, tracking: 1 });
  y += 34;
  txt(doc, "Cuidado Integrativo Avançado", M, y, { font: F.serif, size: 11, color: C.ouro, align: "center", width: UW, tracking: 0.8 });
  y += 40;

  // ── Ornamento: losango triplo aninhado ────────────────────────────────────────
  const OY = y + 24;
  losango(doc, cx, OY, 26, C.ouroEscuro, 0.5);
  losango(doc, cx, OY, 16, C.ouro, 0.8);
  losango(doc, cx, OY, 6, C.ouro, 0, true);
  y = OY + 44;

  // ── Caixa de dados do paciente ────────────────────────────────────────────────
  borda(doc, cx - 160, y, 320, 92, C.ouroEscuro, 0.6);
  linha(doc, cx - 148, y + 30, cx + 148, C.ouroSombra, 0.4);
  linha(doc, cx - 148, y + 60, cx + 148, C.ouroSombra, 0.4);

  // Labels e valores
  const DC: [string, string, number][] = [
    ["PACIENTE",   "Maria Francisca de Oliveira Borges", y + 10],
    ["NASCIMENTO", "14/03/1978  ·  47 anos",             y + 40],
    ["CÓDIGO",     "PROT-2026-001847",                   y + 70],
  ];
  for (const [l, v, yy] of DC) {
    txt(doc, l, cx - 148, yy, { font: F.sans, size: 6.5, color: "#8A8278", tracking: 2 });
    txt(doc, v, cx - 148, yy, { font: F.serifBold, size: 10, color: "#F8F4EE", align: "right", width: 296 });
  }
  y += 106;

  // ── Espaço central negativo — respiro máximo ──────────────────────────────────
  // (intencionalmente vazio — estética de luxo)

  // ── Rodapé ────────────────────────────────────────────────────────────────────
  const RY = PH - M - 24;
  linha(doc, M, RY - 34, M + UW, C.ouroEscuro, 0.5);
  linha(doc, M, RY - 28, M + UW, C.ouroSombra, 0.3);

  // Médico esquerda
  txt(doc, "Dr. Caio H. F. Pádua", M, RY - 20, { font: F.serifBold, size: 10, color: "#F8F4EE" });
  txt(doc, "CRM 123456 · SP  ·  Endocrinologista", M, RY - 8, { font: F.mono, size: 7.5, color: "#8A8278" });

  // Assinatura direita
  const AX = PW - M - 155;
  linha(doc, AX, RY - 20, AX + 155, C.ouro, 0.6);
  txt(doc, "Assinatura", AX, RY - 14, { font: F.sans, size: 7, color: "#8A8278", align: "center", width: 155, tracking: 1 });
  txt(doc, "São Paulo  ·  18/07/2026", AX, RY - 4, { font: F.serif, size: 8.5, color: "#C8C2B8", align: "center", width: 155 });

  // Endereço base
  txt(doc, "Av. Paulista, 1.000 · Conj. 1205 · São Paulo · SP  ·  (11) 3456-7890", M, RY + 8,
      { font: F.sans, size: 6.5, color: C.ouroEscuro, align: "center", width: UW, tracking: 0.3 });

  // Faixa ouro base
  faixa(doc, PH - 2, 2, C.ouroDeep);
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════════
const PDFS = [
  { nome: "LUX-A__Receituario_Maison_Blanche_v2.pdf",  fn: desenharLuxoA, desc: "Série Luxo A v2 — Maison Blanche · serif elegante · marfim + ouro · estilo Dior" },
  { nome: "LUX-B__Receituario_Noir_Excellence_v2.pdf", fn: desenharLuxoB, desc: "Série Luxo B v2 — Noir Excellence · header preto + ouro hairline · estilo Hermès" },
  { nome: "LUX-C__Receituario_Champagne_v2.pdf",       fn: desenharLuxoC, desc: "Série Luxo C v2 — Champagne · moldura dupla + losango · editorial serif" },
  { nome: "LUX-D__Capa_Protocolo_Maison_v2.pdf",       fn: desenharLuxoD, desc: "Série Luxo D v2 — Protocolo Maison · preto absoluto + ouro + losango triplo" },
];

async function main() {
  console.log("▶  Série Luxo v2 · Fontes: DejaVu Serif + Sans (embarcadas)\n");

  // 1. Gerar em /tmp com verificação
  for (const p of PDFS) {
    const dest = path.join("/tmp", p.nome);
    await gerarPdf(p.fn, dest);
    const { size } = fs.statSync(dest);
    if (size < 5000) { console.error(`ERRO: ${p.nome} suspeito — apenas ${size} bytes`); process.exit(1); }
    console.log(`  PDF: ${p.nome}  ·  ${size.toLocaleString("pt-BR")} bytes`);
  }

  // 2. Upload Drive
  console.log("\n  Enviando ao Drive…");
  const drive = await driveClient();
  for (const p of PDFS) {
    await uploadArquivo(drive, p.nome, path.join("/tmp", p.nome), p.desc);
  }

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  4 PDFs Série Luxo v2 — CONCLUÍDOS");
  console.log(`  https://drive.google.com/drive/folders/${PASTA_ID}`);
  console.log("══════════════════════════════════════════════════════════");
}

main().catch(console.error);
