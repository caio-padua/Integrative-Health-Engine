/**
 * GERADOR MESTRE · versao_3
 * Todos os canvas documentais: REC-01..06 + RAS-01..04 + CAP-01..03 + LUX-A..D
 * Fontes: DejaVu Serif (editorial) + DejaVu Sans (limpeza) + DejaVu Mono (códigos)
 * Upload: Google Drive pasta 12lsL8VV7GxoSMKgk70-mOMdw2OHdCuVL
 */
import PDFDocument from "pdfkit";
import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";

// ── Fontes ────────────────────────────────────────────────────────────────────
const F = {
  serif:      "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
  serifBold:  "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
  sans:       "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  sansBold:   "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  mono:       "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
};

// ── Paleta global ─────────────────────────────────────────────────────────────
const C = {
  branco:     "#FFFFFF",
  marfim:     "#FAF7F1",
  champagne:  "#F4EFE4",
  creme:      "#EDE6D6",
  creamBlock: "#EDE7D8",
  creamLine:  "#D8CFC0",
  navy:       "#0F2940",
  navyMid:    "#1F3A5F",
  navyLight:  "#2A4A6F",
  azul:       "#2563EB",
  azulPale:   "#EBF2FF",
  verde:      "#9DB8A5",
  verdeDark:  "#5A8570",
  ciano:      "#06B6D4",
  ouro:       "#C9A84C",
  ouroDeep:   "#B8982A",
  ouroPale:   "#D4B96A",
  ouroEscuro: "#7A6420",
  ouroSombra: "#3A2E18",
  preto:      "#080808",
  pretoAbs:   "#050403",
  texto:      "#1A1714",
  textoPad:   "#111111",
  textoSub:   "#444444",
  textoMuted: "#888888",
  textoCinza: "#666666",
  linhaCinza: "#cccccc",
  linhaSuave: "#e0e0e0",
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

async function uploadArquivo(drive: ReturnType<typeof google.drive>, nome: string, caminho: string) {
  const { size } = fs.statSync(caminho);
  const { data: busca } = await drive.files.list({
    q: `name='${nome}' and '${PASTA_ID}' in parents and trashed=false`,
    fields: "files(id,name)",
  });
  if (busca.files?.length) {
    for (const f of busca.files) await drive.files.delete({ fileId: f.id! });
  }
  const { data } = await drive.files.create({
    requestBody: { name: nome, parents: [PASTA_ID], mimeType: "application/pdf" },
    media: { mimeType: "application/pdf", body: fs.createReadStream(caminho) },
    fields: "id,name,size",
  });
  const kb = (size / 1024).toFixed(1);
  console.log(`  ✓  ${data.name.padEnd(55)}  ${kb.padStart(6)} KB  ·  ${data.id}`);
}

// ── Gerador genérico ──────────────────────────────────────────────────────────
function gerarPdf(fn: (doc: PDFKit.PDFDocument) => void, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const stream = fs.createWriteStream(dest);
    doc.pipe(stream);
    fn(doc);
    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

// ── Dimensões A4 ──────────────────────────────────────────────────────────────
const PW = 595.28, PH = 841.89;

// ── Helpers ──────────────────────────────────────────────────────────────────
const ret  = (d: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, c: string) =>
  d.rect(x, y, w, h).fill(c);
const brd  = (d: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, c: string, esp = 0.5) =>
  d.rect(x, y, w, h).lineWidth(esp).stroke(c);
const lin  = (d: PDFKit.PDFDocument, x1: number, y: number, x2: number, c: string, esp = 0.5) =>
  d.moveTo(x1, y).lineTo(x2, y).lineWidth(esp).stroke(c);
const linV = (d: PDFKit.PDFDocument, x: number, y1: number, y2: number, c: string, esp = 1) =>
  d.moveTo(x, y1).lineTo(x, y2).lineWidth(esp).stroke(c);
const dia  = (d: PDFKit.PDFDocument, cx: number, cy: number, r: number, c: string, solid = false) => {
  const p = d.moveTo(cx, cy - r).lineTo(cx + r, cy).lineTo(cx, cy + r).lineTo(cx - r, cy).closePath();
  solid ? p.fill(c) : p.lineWidth(0.6).stroke(c);
};
const txt  = (
  d: PDFKit.PDFDocument, s: string, x: number, y: number,
  font: string, sz: number, cor: string,
  opts: { align?: "left"|"center"|"right"; width?: number; tracking?: number; lineGap?: number } = {}
) => {
  d.font(font).fontSize(sz).fillColor(cor);
  const o: PDFKit.Mixins.TextOptions = {
    align: opts.align ?? "left",
    lineGap: opts.lineGap ?? 0,
    paragraphGap: 0,
    characterSpacing: opts.tracking ?? 0,
  };
  if (opts.width !== undefined) o.width = opts.width;
  d.text(s, x, y, o);
};

// Dados de paciente e médico (fixture)
const PAC = "Ricardo César da Silva";
const PAC_CPF = "086.250.558-50";
const PAC_END = "Rua Anhumas, 489 · Vila São João Batista · Guarulhos · SP";
const PAC_NASC = "12/04/1985 · 41 anos";
const MED = "Dr. Caio Henrique Fernandes Pádua";
const MED_CRM = "CRM-SP 125475 · CBO 2251-04";
const MED_ESP = "Endocrinologia & Medicina Integrativa";
const CLINICA = "INSTITUTO PÁDUA";
const END_CLI = "Rua Guaxupé, 327 · Vila Formosa · São Paulo · SP · CEP 03186-040";
const TEL_CLI = "(11) 97715-4000 · CNPJ 63.865.940/0001-63";
const DATA = "São Paulo, 18 de julho de 2026";

// ── CABEÇALHO PADRÃO (usado nas receituários clássicos) ──────────────────────
function headerClassico(d: PDFKit.PDFDocument, M: number, UW: number, acento: string) {
  // Quadrado monograma
  d.rect(M, 22, 46, 46).fill(acento === C.branco ? "#333" : acento);
  txt(d, "CP", M + 3, 35, F.sansBold, 14, "#FFFFFF", { align: "center", width: 40, tracking: 1 });
  // Textos clínica
  txt(d, CLINICA, M + 56, 24, F.sansBold, 12, C.textoPad, { tracking: 0.5 });
  txt(d, END_CLI, M + 56, 39, F.sans, 7.5, C.textoCinza);
  txt(d, TEL_CLI, M + 56, 50, F.sans, 7.5, C.textoCinza);
  // Linha inferior header
  lin(d, M, 76, M + UW, C.preto, 2);
}

// Bloco paciente + médico lado a lado (receituários clássicos)
function blocoPacMed(d: PDFKit.PDFDocument, M: number, UW: number, y: number): number {
  const HH = 72, W2 = UW / 2;
  brd(d, M, y, W2, HH, C.linhaCinza, 1);
  brd(d, M + W2, y, W2, HH, C.linhaCinza, 1);
  // Labels
  txt(d, "PACIENTE", M + 10, y + 8, F.sansBold, 6.5, "#555", { tracking: 2 });
  txt(d, "PROFISSIONAL", M + W2 + 10, y + 8, F.sansBold, 6.5, "#555", { tracking: 2 });
  lin(d, M + 10, y + 20, M + W2 - 10, C.linhaSuave, 0.5);
  lin(d, M + W2 + 10, y + 20, M + UW - 10, C.linhaSuave, 0.5);
  // Paciente
  txt(d, PAC, M + 10, y + 23, F.sansBold, 9.5, C.textoPad);
  txt(d, `CPF  ${PAC_CPF}`, M + 10, y + 36, F.sans, 7.5, "#444");
  txt(d, PAC_END, M + 10, y + 47, F.sans, 7, "#444", { width: W2 - 20 });
  // Médico
  txt(d, MED, M + W2 + 10, y + 23, F.sansBold, 9.5, C.textoPad);
  txt(d, MED_ESP, M + W2 + 10, y + 36, F.sans, 7.5, "#444");
  txt(d, MED_CRM, M + W2 + 10, y + 47, F.sans, 7, "#444");
  return y + HH + 12;
}

// Título de seção
function secao(d: PDFKit.PDFDocument, texto: string, x: number, y: number, UW: number, cor = C.textoPad): number {
  txt(d, texto.toUpperCase(), x, y, F.sansBold, 7, cor, { tracking: 3 });
  lin(d, x, y + 13, x + UW, C.linhaSuave, 0.5);
  return y + 20;
}

// Item de prescrição padrão (retorna novo y)
function itemRx(
  d: PDFKit.PDFDocument, M: number, UW: number, y: number,
  n: string, nome: string, dose: string, pos: string, dur: string, obs: string | null,
  corNum = C.textoPad
): number {
  txt(d, n, M, y + 1, F.serifBold, 9, corNum);
  txt(d, nome, M + 28, y, F.sansBold, 10.5, C.textoPad);
  txt(d, dose, M + UW, y + 1, F.sans, 7.5, C.textoSub, { align: "right", width: 140 });
  const iw = UW - 28;
  txt(d, pos, M + 28, y + 14, F.serif, 9, C.textoSub, { width: iw });
  txt(d, dur.toUpperCase(), M + 28, y + 26, F.sans, 6.5, C.textoMuted, { tracking: 0.5 });
  let dy = y + 38;
  if (obs) {
    linV(d, M + 24, dy, dy + 16, C.linhaCinza, 1.5);
    txt(d, obs, M + 28, dy, F.serif, 8, C.textoMuted, { width: iw });
    dy += 18;
  }
  lin(d, M, dy + 4, M + UW, C.linhaSuave, 0.5);
  return dy + 14;
}

// Rodapé assinatura
function rodapeAssinatura(d: PDFKit.PDFDocument, M: number, UW: number, y: number, corLinha = C.textoPad) {
  txt(d, DATA, M, y, F.serif, 8.5, C.textoSub);
  const AX = PW - M - 170;
  lin(d, AX, y + 2, AX + 170, corLinha, 0.6);
  txt(d, "Assinatura e Carimbo", AX, y + 7, F.sans, 7, C.textoMuted, { align: "center", width: 170, tracking: 0.3 });
  txt(d, MED_CRM, AX, y + 18, F.mono, 7, C.textoMuted, { align: "center", width: 170 });
}

// Rodapé endereço
function rodapeEndereco(d: PDFKit.PDFDocument, M: number, UW: number) {
  const RY = PH - 40;
  lin(d, M, RY, M + UW, C.linhaSuave, 0.5);
  txt(d, `${END_CLI}  ·  ${TEL_CLI}`, M, RY + 7, F.sans, 6.5, C.textoMuted, { align: "center", width: UW, tracking: 0.2 });
}

// RX padrão para todos os receituários (3 medicamentos)
const RX3 = [
  { n: "I.",   nome: "Levotiroxina Sódica",   dose: "75 mcg · Comprimido",        pos: "1 comprimido em jejum, 30 minutos antes do café da manhã.", dur: "90 dias · Uso contínuo", obs: "Intervalo mínimo de 4 horas de cálcio ou ferro." },
  { n: "II.",  nome: "Vitamina D3 + K2",      dose: "5.000 UI + 100 mcg · Cáps.", pos: "1 cápsula com a principal refeição do dia.",                dur: "90 dias", obs: null },
  { n: "III.", nome: "Magnésio Dimalato",     dose: "400 mg · Cápsula",            pos: "2 cápsulas com água, à noite antes de dormir.",             dur: "60 dias", obs: "Maior absorção que o óxido de magnésio." },
];

// ═══════════════════════════════════════════════════════════════════════════════
// REC-01 · CLÁSSICO BRANCO
// ═══════════════════════════════════════════════════════════════════════════════
function rec01(d: PDFKit.PDFDocument) {
  const M = 28, UW = PW - M * 2;
  ret(d, 0, 0, PW, PH, C.branco);
  headerClassico(d, M, UW, C.branco);
  let y = 90;
  y = blocoPacMed(d, M, UW, y);
  lin(d, M, y, M + UW, "#999", 0.7);
  y += 14;
  y = secao(d, "Receituário Simples — Validade 30 dias", M, y, UW);
  for (const it of RX3) y = itemRx(d, M, UW, y, it.n, it.nome, it.dose, it.pos, it.dur, it.obs);
  y += 10;
  rodapeAssinatura(d, M, UW, y);
  rodapeEndereco(d, M, UW);
}

// ═══════════════════════════════════════════════════════════════════════════════
// REC-02 · BICOLOR CLÍNICO (barra lateral navy + bloco paciente fundo azul pastel)
// ═══════════════════════════════════════════════════════════════════════════════
function rec02(d: PDFKit.PDFDocument) {
  const M = 28, UW = PW - M * 2;
  ret(d, 0, 0, PW, PH, C.branco);
  // Faixa lateral navy esquerda
  ret(d, 0, 0, 8, PH, C.navy);
  // Header
  ret(d, M, 22, 46, 46, C.navy);
  txt(d, "CP", M + 3, 35, F.sansBold, 14, "#FFFFFF", { align: "center", width: 40, tracking: 1 });
  txt(d, CLINICA, M + 56, 24, F.sansBold, 12, C.navy, { tracking: 0.5 });
  txt(d, "MEDICINA INTEGRATIVA & LONGEVIDADE", M + 56, 38, F.sans, 7, "#555", { tracking: 1 });
  txt(d, `${END_CLI}  ·  ${TEL_CLI}`, M + 56, 50, F.sans, 7, C.textoCinza, { width: UW - 56 });
  lin(d, M, 76, M + UW, C.navy, 1.5);
  lin(d, M, 78, M + UW, "#4A6FA0", 0.4);

  let y = 92;
  // Bloco paciente fundo pastel
  const BH = 64;
  ret(d, M, y, UW, BH, "#EFF4FB");
  brd(d, M, y, UW, BH, "#C8D9EE", 0.5);
  const W2 = UW / 2;
  linV(d, M + W2, y + 8, y + BH - 8, "#C8D9EE", 0.5);
  txt(d, "PACIENTE", M + 10, y + 8, F.sansBold, 6, "#7A9AB8", { tracking: 2 });
  txt(d, PAC, M + 10, y + 20, F.sansBold, 9.5, C.navy);
  txt(d, `CPF ${PAC_CPF}  ·  Nasc. ${PAC_NASC}`, M + 10, y + 33, F.sans, 7, "#444", { width: W2 - 20 });
  txt(d, PAC_END, M + 10, y + 44, F.sans, 7, "#444", { width: W2 - 20 });
  txt(d, "MÉDICO RESPONSÁVEL", M + W2 + 10, y + 8, F.sansBold, 6, "#7A9AB8", { tracking: 2 });
  txt(d, MED, M + W2 + 10, y + 20, F.sansBold, 9.5, C.navy);
  txt(d, MED_ESP, M + W2 + 10, y + 33, F.sans, 7, "#444");
  txt(d, MED_CRM, M + W2 + 10, y + 44, F.mono, 7, "#444");
  y += BH + 16;

  lin(d, M, y, M + UW, C.navy, 0.8);
  y += 14;
  y = secao(d, "Receituário Simples — Validade 30 dias", M, y, UW, C.navy);
  for (const it of RX3) y = itemRx(d, M, UW, y, it.n, it.nome, it.dose, it.pos, it.dur, it.obs, "#3A5F9F");
  y += 10;
  rodapeAssinatura(d, M, UW, y, C.navy);
  rodapeEndereco(d, M, UW);
}

// ═══════════════════════════════════════════════════════════════════════════════
// REC-03 · COM BLOCOS (caixas visualmente distintas por item)
// ═══════════════════════════════════════════════════════════════════════════════
function rec03(d: PDFKit.PDFDocument) {
  const M = 28, UW = PW - M * 2;
  ret(d, 0, 0, PW, PH, C.branco);
  headerClassico(d, M, UW, C.branco);
  let y = 90;

  // Bloco paciente unificado
  brd(d, M, y, UW, 60, C.linhaCinza, 1);
  txt(d, "IDENTIFICAÇÃO DO PACIENTE", M + 10, y + 8, F.sansBold, 6, "#555", { tracking: 2 });
  lin(d, M + 10, y + 20, M + UW - 10, C.linhaSuave, 0.4);
  txt(d, PAC, M + 10, y + 23, F.sansBold, 10, C.textoPad);
  txt(d, `CPF ${PAC_CPF}  ·  Nasc. ${PAC_NASC}`, M + 10, y + 36, F.sans, 7.5, "#444");
  txt(d, PAC_END, M + 10, y + 47, F.sans, 7, "#666", { width: UW - 20 });
  y += 72;

  lin(d, M, y, M + UW, "#999", 0.7);
  y += 12;
  txt(d, "RECEITUÁRIO SIMPLES  ·  Validade 30 dias", M, y, F.sansBold, 7, C.textoPad, { tracking: 2 });
  txt(d, DATA, PW - M, y, F.sans, 7.5, C.textoSub, { align: "right", width: 140 });
  y += 20;

  // Blocos por item com fundo alternado
  const BGALT = ["#F9F9F9", C.branco];
  for (let i = 0; i < RX3.length; i++) {
    const it = RX3[i];
    const bh = it.obs ? 82 : 66;
    ret(d, M, y, UW, bh, BGALT[i % 2]);
    brd(d, M, y, UW, bh, C.linhaSuave, 0.5);
    // Numeração
    ret(d, M, y, 28, bh, "#EEEEEE");
    txt(d, it.n, M, y + (bh / 2) - 7, F.serifBold, 10, "#555", { align: "center", width: 28 });
    const IX = M + 36, IW = UW - 36 - 8;
    txt(d, it.nome, IX, y + 8, F.sansBold, 10.5, C.textoPad);
    txt(d, it.dose, M + UW - 8, y + 8, F.sans, 7.5, C.textoSub, { align: "right", width: 130 });
    txt(d, it.pos, IX, y + 22, F.serif, 9, C.textoSub, { width: IW });
    txt(d, it.dur.toUpperCase(), IX, y + 34, F.sans, 6.5, C.textoMuted, { tracking: 0.5 });
    if (it.obs) txt(d, `* ${it.obs}`, IX, y + 46, F.serif, 7.5, C.textoMuted, { width: IW });
    y += bh + 4;
  }
  y += 16;
  rodapeAssinatura(d, M, UW, y);
  rodapeEndereco(d, M, UW);
}

// ═══════════════════════════════════════════════════════════════════════════════
// REC-04 · COMPACTO (mais denso, mais itens por página)
// ═══════════════════════════════════════════════════════════════════════════════
function rec04(d: PDFKit.PDFDocument) {
  const M = 28, UW = PW - M * 2;
  ret(d, 0, 0, PW, PH, C.branco);

  // Header compacto
  ret(d, M, 18, 42, 42, "#333");
  txt(d, "CP", M + 3, 28, F.sansBold, 13, "#FFF", { align: "center", width: 36, tracking: 1 });
  txt(d, CLINICA, M + 50, 20, F.sansBold, 11.5, C.textoPad, { tracking: 0.5 });
  txt(d, `${END_CLI}  ·  ${TEL_CLI}`, M + 50, 34, F.sans, 6.5, C.textoCinza, { width: UW - 50 });
  lin(d, M, 66, M + UW, C.preto, 1.5);

  let y = 76;
  // Bloco compacto paciente + médico
  const HH = 54, W2 = UW / 2;
  brd(d, M, y, W2, HH, C.linhaCinza, 0.8);
  brd(d, M + W2, y, W2, HH, C.linhaCinza, 0.8);
  txt(d, "PACIENTE", M + 8, y + 6, F.sansBold, 6, "#555", { tracking: 2 });
  txt(d, PAC, M + 8, y + 17, F.sansBold, 9, C.textoPad);
  txt(d, `CPF ${PAC_CPF}  ·  ${PAC_NASC}`, M + 8, y + 29, F.sans, 7, "#444");
  txt(d, PAC_END, M + 8, y + 40, F.sans, 6.5, "#666", { width: W2 - 16 });
  txt(d, "PROFISSIONAL", M + W2 + 8, y + 6, F.sansBold, 6, "#555", { tracking: 2 });
  txt(d, MED, M + W2 + 8, y + 17, F.sansBold, 9, C.textoPad);
  txt(d, MED_ESP, M + W2 + 8, y + 29, F.sans, 7, "#444");
  txt(d, MED_CRM, M + W2 + 8, y + 40, F.mono, 7, "#444");
  y += HH + 10;

  lin(d, M, y, M + UW, "#999", 0.7);
  y += 12;
  txt(d, "RECEITUÁRIO SIMPLES  ·  Validade 30 dias", M, y, F.sansBold, 6.5, C.textoPad, { tracking: 2 });
  y += 16;

  // 5 medicamentos (compacto)
  const RX5 = [
    ...RX3,
    { n: "IV.", nome: "Ômega-3 TG 1.000 mg", dose: "Cáps. gel", pos: "2 cápsulas com o almoço.", dur: "90 dias", obs: null },
    { n: "V.",  nome: "Metformina 850 mg", dose: "Comprimido", pos: "1 comprimido ao almoço e 1 comprimido ao jantar, durante 90 dias.", dur: "90 dias · Uso contínuo", obs: "Monitorar vitamina B12 a cada 6 meses." },
  ];
  for (const it of RX5) {
    txt(d, it.n, M, y, F.serifBold, 8.5, "#555");
    txt(d, it.nome, M + 26, y, F.sansBold, 9.5, C.textoPad);
    txt(d, it.dose, M + UW, y, F.sans, 7, C.textoSub, { align: "right", width: 110 });
    txt(d, it.pos, M + 26, y + 12, F.serif, 8.5, C.textoSub, { width: UW - 26 });
    txt(d, it.dur.toUpperCase(), M + 26, y + 23, F.sans, 6, C.textoMuted, { tracking: 0.5 });
    if (it.obs) txt(d, `* ${it.obs}`, M + 26, y + 32, F.serif, 7.5, C.textoMuted, { width: UW - 26 });
    y += it.obs ? 50 : 38;
    lin(d, M, y, M + UW, C.linhaSuave, 0.4);
    y += 8;
  }
  y += 6;
  rodapeAssinatura(d, M, UW, y);
  rodapeEndereco(d, M, UW);
}

// ═══════════════════════════════════════════════════════════════════════════════
// REC-05 · CONTROLADO AZUL B1/B2 (ANVISA — faixa azul obrigatória)
// ═══════════════════════════════════════════════════════════════════════════════
function rec05(d: PDFKit.PDFDocument) {
  const M = 28, UW = PW - M * 2;
  ret(d, 0, 0, PW, PH, C.branco);

  // Faixa ANVISA azul (obrigatória por lei)
  ret(d, 0, 0, PW, 8, C.azul);
  // Rótulo tipo receita
  ret(d, 0, 8, PW, 24, C.azulPale);
  lin(d, 0, 32, PW, C.azul, 0.8);
  txt(d, "RECEITUÁRIO AZUL B1 — PSICOTRÓPICO", M, 14, F.sansBold, 8, C.azul, { tracking: 2 });
  txt(d, "2 VIAS — RETER 1ª VIA NA FARMÁCIA", PW - M, 15, F.sans, 7.5, "#555", { align: "right", width: 160 });

  // Header navy
  ret(d, 0, 32, PW, 90, C.navy);
  txt(d, CLINICA, M, 48, F.sansBold, 13, "#FFFFFF", { tracking: 1 });
  txt(d, "PADUCCIA CLÍNICA MÉDICA LTDA — EPP  ·  CNPJ 63.865.940/0001-63", M, 64, F.sans, 7.5, "#8BA3C7");
  txt(d, `${END_CLI}  ·  ${TEL_CLI}`, M, 75, F.sans, 7.5, "#8BA3C7");
  // Badge PAWARDS
  txt(d, "PAWARDS", PW - M - 100, 50, F.serifBold, 18, C.ouro, { align: "right", width: 100, tracking: 3 });
  txt(d, "Sistema de Gestão em Saúde", PW - M - 140, 70, F.sans, 6.5, "#8BA3C7", { align: "right", width: 140 });
  brd(d, PW - M - 110, 80, 110, 18, `${C.azul}44`, 0.5);
  txt(d, "CONTROLE ESPECIAL · B1", PW - M - 106, 86, F.sansBold, 6.5, C.azul, { tracking: 1, align: "center", width: 102 });

  let y = 132;
  // Dados paciente (fundo levemente azul)
  ret(d, M, y, UW, 68, "#F5F8FD");
  brd(d, M, y, UW, 68, "#C8D9EE", 0.5);
  txt(d, "PACIENTE", M + 10, y + 8, F.sansBold, 6, "#7A9AB8", { tracking: 2 });
  lin(d, M + 10, y + 20, M + UW - 10, "#D8E6F2", 0.5);
  txt(d, PAC, M + 10, y + 23, F.sansBold, 11, C.navy);
  txt(d, `CPF ${PAC_CPF}  ·  Nasc. ${PAC_NASC}`, M + 10, y + 37, F.sans, 7.5, "#444");
  txt(d, PAC_END, M + 10, y + 49, F.sans, 7, "#666", { width: UW - 20 });
  y += 80;

  lin(d, M, y, M + UW, C.azul, 0.8);
  y += 14;
  txt(d, "PRESCRIÇÃO  —  RECEITUÁRIO DE CONTROLE ESPECIAL AZUL", M, y, F.sansBold, 7, C.azul, { tracking: 2 });
  txt(d, "Validade: 30 dias a contar da data de emissão", M + UW, y, F.sans, 7.5, C.textoMuted, { align: "right", width: 220 });
  y += 20;

  const RX_B1 = [
    { n: "I.",  nome: "Clonazepam 0,5 mg — Comprimido",            pos: "1 comprimido à noite, durante 30 dias. Dispensar para 30 dias de tratamento.", dur: "30 dias", qt: "30 comprimidos (embalagem original)" },
    { n: "II.", nome: "Alprazolam 0,25 mg — Comprimido",           pos: "1 comprimido pela manhã, conforme necessidade. Máximo de 15 dias de uso.", dur: "15 dias", qt: "15 comprimidos (embalagem original)" },
  ];
  for (const it of RX_B1) {
    txt(d, it.n, M, y, F.serifBold, 10, C.azul);
    txt(d, it.nome, M + 28, y, F.sansBold, 11, C.navy);
    y += 14;
    txt(d, it.pos, M + 28, y, F.serif, 9.5, C.textoSub, { width: UW - 28 });
    y += 14;
    txt(d, `Duração: ${it.dur}`, M + 28, y, F.sans, 7, C.textoMuted, { tracking: 0.5 });
    txt(d, `Qt: ${it.qt}`, M + UW, y, F.sans, 7.5, C.textoSub, { align: "right", width: 200 });
    y += 14;
    lin(d, M, y, M + UW, "#D8E6F2", 0.5);
    y += 14;
  }
  y += 8;
  // Nota SNCR
  ret(d, M, y, UW, 36, "#FFF8E6");
  brd(d, M, y, UW, 36, "#E8D0A0", 0.5);
  txt(d, "REGISTRO SNCR (Sistema Nacional de Controle de Receituário)", M + 8, y + 6, F.sansBold, 7, "#8B6A00", { tracking: 0.5 });
  txt(d, "Nº SNCR: ________________________   Identificação da farmácia: _______________________________", M + 8, y + 20, F.mono, 7.5, "#6B5000");
  y += 48;
  rodapeAssinatura(d, M, UW, y, C.azul);
  rodapeEndereco(d, M, UW);
}

// ═══════════════════════════════════════════════════════════════════════════════
// REC-06 · MAGISTRAL + FARMÁCIA (fórmulas manipuladas, cor por fórmula)
// ═══════════════════════════════════════════════════════════════════════════════
function rec06(d: PDFKit.PDFDocument) {
  const M = 28, UW = PW - M * 2;
  ret(d, 0, 0, PW, PH, C.branco);

  // Faixa verde magistral (ANVISA RDC 67)
  ret(d, 0, 0, PW, 8, C.verde);
  ret(d, 0, 8, PW, 24, "#F0F6F2");
  lin(d, 0, 32, PW, "#7FA890", 0.6);
  txt(d, "RECEITUÁRIO MAGISTRAL — RDC 67 ANVISA", M, 14, F.sansBold, 8, C.verdeDark, { tracking: 2 });
  txt(d, "FÓRMULAS MANIPULADAS PERSONALIZADAS", PW - M, 15, F.sans, 7, "#444", { align: "right", width: 200 });

  // Header navy
  ret(d, 0, 32, PW, 90, C.navy);
  txt(d, CLINICA, M, 48, F.sansBold, 13, "#FFFFFF", { tracking: 1 });
  txt(d, MED_ESP, M, 64, F.sans, 7.5, "#8BA3C7");
  txt(d, `${END_CLI}  ·  ${TEL_CLI}`, M, 75, F.sans, 7.5, "#8BA3C7");
  txt(d, "PAWARDS", PW - M - 100, 50, F.serifBold, 18, C.ouro, { align: "right", width: 100, tracking: 3 });
  txt(d, "Sistema de Gestão em Saúde", PW - M - 140, 70, F.sans, 6.5, "#8BA3C7", { align: "right", width: 140 });

  let y = 132;
  // Bloco paciente
  ret(d, M, y, UW, 56, "#F5F8F5");
  brd(d, M, y, UW, 56, "#C0D4C0", 0.5);
  txt(d, "PACIENTE", M + 10, y + 8, F.sansBold, 6, "#5A8070", { tracking: 2 });
  txt(d, PAC, M + 10, y + 20, F.sansBold, 11, C.navy);
  txt(d, `CPF ${PAC_CPF}  ·  Nasc. ${PAC_NASC}  ·  ${PAC_END}`, M + 10, y + 35, F.sans, 7, "#444", { width: UW - 20 });
  y += 68;

  lin(d, M, y, M + UW, C.verde, 0.8);
  y += 14;
  txt(d, "FÓRMULAS MAGISTRAIS PRESCRITAS", M, y, F.sansBold, 7, C.verdeDark, { tracking: 3 });
  txt(d, "Validade: 15 dias  ·  Manipulação exclusiva", M + UW, y, F.sans, 7.5, C.textoMuted, { align: "right", width: 210 });
  y += 20;

  const FORMULAS = [
    {
      num: "FÓRMULA 1 — NEUROPROTETORA", cor: "#2563EB",
      ativos: [
        { a: "Fosfatidilserina", d: "200 mg" },
        { a: "Alpha-GPC (L-alfa glicerilfosforilcolina)", d: "300 mg" },
        { a: "Acetil-L-Carnitina", d: "500 mg" },
        { a: "Hericium erinaceus (extrato padronizado)", d: "300 mg" },
        { a: "Vitamina B12 (metilcobalamina)", d: "1.000 mcg" },
      ],
      pos: "1 cápsula pela manhã, durante 60 dias.",
      qt: "60 cápsulas · Frasco âmbar",
      farm: "Farmácia Modelo — CNPJ 00.000.000/0001-00",
    },
    {
      num: "FÓRMULA 2 — METABÓLICA HORMONAL", cor: "#16A34A",
      ativos: [
        { a: "Berberina HCl", d: "500 mg" },
        { a: "Inositol (D-chiro)", d: "600 mg" },
        { a: "Ácido alfa-lipoico", d: "200 mg" },
      ],
      pos: "1 cápsula ao almoço e 1 cápsula ao jantar, durante 90 dias.",
      qt: "180 cápsulas · Frasco âmbar",
      farm: "Farmácia Modelo — CNPJ 00.000.000/0001-00",
    },
  ];

  for (const f of FORMULAS) {
    // Título da fórmula com badge de cor
    ret(d, M, y, 6, 18, f.cor);
    txt(d, f.num, M + 12, y + 3, F.sansBold, 8.5, f.cor, { tracking: 1 });
    y += 22;
    // Tabela de ativos
    brd(d, M, y, UW, (f.ativos.length * 16) + 8, C.linhaSuave, 0.5);
    let ay = y + 4;
    for (const at of f.ativos) {
      txt(d, `· ${at.a}`, M + 8, ay, F.serif, 8.5, C.textoSub, { width: UW - 80 });
      txt(d, at.d, M + UW - 8, ay, F.mono, 8.5, f.cor, { align: "right", width: 70 });
      ay += 16;
    }
    y = ay + 10;
    txt(d, `Posologia: ${f.pos}`, M, y, F.serif, 9, C.textoSub);
    y += 12;
    txt(d, `Quantidade: ${f.qt}`, M, y, F.sans, 7.5, C.textoMuted);
    txt(d, `Farmácia: ${f.farm}`, M + UW, y, F.sans, 7.5, C.textoMuted, { align: "right", width: UW / 2 });
    y += 20;
    lin(d, M, y, M + UW, C.linhaSuave, 0.5);
    y += 14;
  }
  rodapeAssinatura(d, M, UW, y, C.verde);
  rodapeEndereco(d, M, UW);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RAS-01 · CAPA NAVY GRADIENT (fundo navy sólido, texto branco e ouro)
// ═══════════════════════════════════════════════════════════════════════════════
function ras01(d: PDFKit.PDFDocument) {
  const M = 52, UW = PW - M * 2, cx = PW / 2;
  ret(d, 0, 0, PW, PH, C.navy);
  // Gradient simulado: faixas de navy claro → escuro
  for (let i = 0; i < 20; i++) {
    const t = i / 20;
    const r = Math.round(15 + t * 5);
    const g = Math.round(41 + t * 10);
    const b = Math.round(64 + t * 20);
    const hex = `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
    ret(d, 0, i * (PH / 20), PW, PH / 20 + 1, hex);
  }
  // Faixa ouro topo + base
  ret(d, 0, 0, PW, 3, C.ouro);
  ret(d, 0, PH - 3, PW, 3, C.ouro);

  let y = M;
  txt(d, "INSTITUTO PÁDUA  ·  MEDICINA INTEGRATIVA", M, y, F.sans, 7, C.ouro, { align: "center", width: UW, tracking: 2.5 });
  y += 16;
  lin(d, M + 80, y, M + UW - 80, C.ouroEscuro, 0.5);
  y += 24;
  txt(d, "REGISTRO DE ASSISTÊNCIA", M, y, F.serifBold, 22, "#FFFFFF", { align: "center", width: UW, tracking: 1 });
  y += 30;
  txt(d, "SISTÊMICO — RAS", M, y, F.serifBold, 22, "#FFFFFF", { align: "center", width: UW, tracking: 1 });
  y += 36;
  txt(d, "Cuidado Integrativo e Longevidade", M, y, F.serif, 11, C.ouroPale, { align: "center", width: UW });
  y += 50;
  // Ornamento
  dia(d, cx, y, 18, C.ouro);
  dia(d, cx, y, 10, C.ouro);
  dia(d, cx, y, 4, C.ouro, true);
  y += 36;

  // Caixa paciente
  brd(d, cx - 155, y, 310, 90, C.ouroEscuro, 0.6);
  lin(d, cx - 143, y + 30, cx + 143, C.ouroSombra, 0.4);
  lin(d, cx - 143, y + 60, cx + 143, C.ouroSombra, 0.4);
  txt(d, "PACIENTE", cx - 143, y + 10, F.sans, 6.5, "#8BA3C7", { tracking: 2 });
  txt(d, PAC, cx - 143, y + 10, F.serifBold, 9.5, "#FFFFFF", { align: "right", width: 286 });
  txt(d, "NASCIMENTO", cx - 143, y + 40, F.sans, 6.5, "#8BA3C7", { tracking: 2 });
  txt(d, PAC_NASC, cx - 143, y + 40, F.serif, 9.5, "#F0F4FF", { align: "right", width: 286 });
  txt(d, "CÓDIGO RAS", cx - 143, y + 70, F.sans, 6.5, "#8BA3C7", { tracking: 2 });
  txt(d, "RAS-2026-0047", cx - 143, y + 70, F.serifBold, 9.5, C.ouro, { align: "right", width: 286 });
  y += 110;

  // Médico
  const RY = PH - M - 30;
  lin(d, M, RY - 30, M + UW, C.ouroEscuro, 0.5);
  txt(d, MED, M, RY - 22, F.serifBold, 10, "#FFFFFF");
  txt(d, MED_CRM, M, RY - 10, F.mono, 7.5, "#8BA3C7");
  txt(d, DATA, M + UW, RY - 22, F.serif, 9, "#C8C2B8", { align: "right", width: 160 });
  lin(d, M + UW - 155, RY - 22, M + UW, C.ouro, 0.5);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RAS-02 · CAPA LINHA INFERIOR (branco limpo, acento na base)
// ═══════════════════════════════════════════════════════════════════════════════
function ras02(d: PDFKit.PDFDocument) {
  const M = 52, UW = PW - M * 2, cx = PW / 2;
  ret(d, 0, 0, PW, PH, C.branco);
  // Linha fina topo navy
  ret(d, 0, 0, PW, 4, C.navy);
  // Bloco inferior navy (42% da altura)
  const SY = PH * 0.58;
  ret(d, 0, SY, PW, PH - SY, C.navy);
  // Linha de demarcação tripla
  ret(d, 0, SY - 2, PW, 2, C.ouro);
  ret(d, 0, SY - 5, PW, 2, C.navyMid);

  let y = M + 10;
  // Identidade topo (fundo branco)
  txt(d, CLINICA, M, y, F.sansBold, 20, C.navy, { tracking: 1 });
  y += 26;
  txt(d, "MEDICINA INTEGRATIVA & LONGEVIDADE", M, y, F.sans, 8, "#888", { tracking: 3 });
  y += 12;
  txt(d, "PADUCCIA CLÍNICA MÉDICA LTDA  ·  CNPJ 63.865.940/0001-63", M, y, F.sans, 7.5, "#AAA");
  y += 30;
  lin(d, M, y, M + UW, "#DDD", 0.5);
  y += 18;

  // Título do documento
  txt(d, "REGISTRO DE ASSISTÊNCIA SISTÊMICO", M, y, F.serifBold, 16, C.navy, { tracking: 0.5 });
  y += 22;
  txt(d, "RAS · Documento Completo do Protocolo Terapêutico Integrado", M, y, F.serif, 10, "#666");
  y += 30;

  // Números: RAS nº, data, validade lado a lado
  const fields = [
    ["Nº DO DOCUMENTO", "RAS-2026-0047"],
    ["DATA DE EMISSÃO", "18/07/2026"],
    ["VALIDADE", "90 DIAS"],
  ];
  const fw = UW / 3;
  for (let i = 0; i < fields.length; i++) {
    const fx = M + i * fw;
    if (i > 0) linV(d, fx, y, y + 44, "#DDD", 0.5);
    txt(d, fields[i][0], fx + 10, y + 6, F.sans, 6.5, "#AAA", { tracking: 2 });
    txt(d, fields[i][1], fx + 10, y + 20, F.serifBold, 13, C.navy);
  }
  y += 56;
  lin(d, M, y, M + UW, "#DDD", 0.5);
  y += 16;

  // Dados paciente
  txt(d, "PACIENTE", M, y, F.sansBold, 6.5, "#AAA", { tracking: 3 });
  y += 12;
  txt(d, PAC, M, y, F.serifBold, 14, C.navy);
  y += 18;
  txt(d, `CPF ${PAC_CPF}  ·  Nasc. ${PAC_NASC}`, M, y, F.sans, 8, "#555");
  y += 12;
  txt(d, PAC_END, M, y, F.sans, 7.5, "#777", { width: UW });
  y += 40;
  lin(d, M, y, M + UW, "#DDD", 0.5);

  // Seção inferior (fundo navy)
  const IY = SY + 22;
  txt(d, MED, M, IY, F.serifBold, 11, "#FFFFFF");
  txt(d, MED_CRM, M, IY + 15, F.mono, 7.5, "#8BA3C7");
  txt(d, DATA, M + UW, IY, F.serif, 9, "#8BA3C7", { align: "right", width: 180 });
  lin(d, M + UW - 155, IY + 14, M + UW, C.ouro, 0.6);
  txt(d, "Assinatura", M + UW - 155, IY + 18, F.sans, 7, "#8BA3C7", { tracking: 1 });
  txt(d, `${END_CLI}  ·  ${TEL_CLI}`, M, PH - M - 14, F.sans, 6.5, "#5A7896", { align: "center", width: UW });
}

// ═══════════════════════════════════════════════════════════════════════════════
// RAS-03 · CAPA DOURADO BORDER (moldura ouro dupla, champagne)
// ═══════════════════════════════════════════════════════════════════════════════
function ras03(d: PDFKit.PDFDocument) {
  const M = 52, UW = PW - M * 2, cx = PW / 2, BM = 16;
  ret(d, 0, 0, PW, PH, C.champagne);
  brd(d, BM, BM, PW - BM * 2, PH - BM * 2, C.ouro, 0.8);
  brd(d, BM + 5, BM + 5, PW - (BM + 5) * 2, PH - (BM + 5) * 2, C.creamLine, 0.4);

  let y = M + 8;
  lin(d, M, y, cx - 20, C.ouro, 0.6);
  lin(d, cx + 20, y, M + UW, C.ouro, 0.6);
  dia(d, cx, y, 10, C.ouro); dia(d, cx, y, 4, C.ouro, true);
  y += 22;
  txt(d, "INSTITUTO PÁDUA", M, y, F.sans, 7.5, C.ouroDeep, { align: "center", width: UW, tracking: 5 });
  y += 14;
  txt(d, "MEDICINA INTEGRATIVA & LONGEVIDADE", M, y, F.sans, 7, "#888", { align: "center", width: UW, tracking: 2 });
  y += 22;
  lin(d, M, y, M + UW, C.ouroPale, 0.4);
  lin(d, M, y + 5, M + UW, C.ouro, 0.9);
  lin(d, M, y + 10, M + UW, C.ouroPale, 0.4);
  y += 26;
  txt(d, "REGISTRO DE ASSISTÊNCIA", M, y, F.serifBold, 20, C.navy, { align: "center", width: UW, tracking: 0.8 });
  y += 28;
  txt(d, "SISTÊMICO — RAS", M, y, F.serifBold, 20, C.navy, { align: "center", width: UW, tracking: 0.8 });
  y += 28;
  txt(d, "Protocolo Terapêutico Integrado · Documento Completo", M, y, F.serif, 9.5, "#777", { align: "center", width: UW });
  y += 46;

  // Caixas de números
  brd(d, cx - 155, y, 310, 50, C.creamLine, 0.5);
  const fw = 310 / 3;
  const flds = [["Nº RAS","RAS-2026-0047"],["Emissão","18/07/2026"],["Validade","90 dias"]];
  for (let i = 0; i < flds.length; i++) {
    const fx = cx - 155 + i * fw;
    if (i > 0) linV(d, fx, y + 8, y + 42, C.creamLine, 0.5);
    txt(d, flds[i][0], fx + 6, y + 8, F.sans, 6, "#AAA", { tracking: 2, align: "center", width: fw - 12 });
    txt(d, flds[i][1], fx + 6, y + 22, F.serifBold, 11, C.navy, { align: "center", width: fw - 12 });
  }
  y += 66;

  // Dados paciente
  txt(d, "PACIENTE", M, y, F.sansBold, 6.5, C.textoMuted, { tracking: 3 });
  lin(d, M, y + 13, M + UW, C.creamLine, 0.5);
  txt(d, PAC, M, y + 13, F.serifBold, 9.5, C.navy, { align: "right", width: UW });
  y += 28;
  txt(d, "NASCIMENTO", M, y, F.sans, 6.5, C.textoMuted, { tracking: 2 });
  txt(d, PAC_NASC, M + UW, y, F.serif, 9, "#444", { align: "right", width: UW });
  lin(d, M, y + 13, M + UW, C.creamLine, 0.4);
  y += 28;
  txt(d, "ENDEREÇO", M, y, F.sans, 6.5, C.textoMuted, { tracking: 2 });
  txt(d, PAC_END, M + UW, y, F.serif, 9, "#444", { align: "right", width: UW });
  lin(d, M, y + 13, M + UW, C.creamLine, 0.4);
  y += 36;

  // Médico e assinatura
  lin(d, M, y, cx - 10, C.creamLine, 0.5);
  lin(d, cx + 10, y, M + UW, C.creamLine, 0.5);
  dia(d, cx, y, 6, C.ouro); dia(d, cx, y, 3, C.ouro, true);
  y += 18;
  txt(d, MED, M, y, F.serifBold, 10, C.navy);
  txt(d, MED_CRM, M, y + 13, F.mono, 7.5, "#888");
  lin(d, M + UW - 165, y + 2, M + UW, C.ouro, 0.7);
  txt(d, "Assinatura e Carimbo", M + UW - 165, y + 7, F.sans, 7, "#888", { align: "center", width: 165, tracking: 0.5 });
  txt(d, DATA, M + UW - 165, y + 18, F.serif, 8, "#777", { align: "center", width: 165 });
  y += 38;
  lin(d, M, y, M + UW, C.ouro, 0.4);
  txt(d, `${END_CLI}  ·  ${TEL_CLI}`, M, y + 8, F.sans, 6.5, C.textoMuted, { align: "center", width: UW, tracking: 0.2 });
}

// ═══════════════════════════════════════════════════════════════════════════════
// RAS-04 · BICOLOR AUSTERO (metade superior branca, metade inferior navy)
// ═══════════════════════════════════════════════════════════════════════════════
function ras04(d: PDFKit.PDFDocument) {
  const M = 52, UW = PW - M * 2, cx = PW / 2;
  const SPLIT = PH * 0.50;
  ret(d, 0, 0, PW, SPLIT, C.branco);
  ret(d, 0, SPLIT, PW, PH - SPLIT, C.navy);
  // Borda ouro dividindo as duas áreas
  ret(d, 0, SPLIT - 2, PW, 4, C.ouro);

  let y = M + 10;
  // Área branca — identidade
  txt(d, CLINICA, M, y, F.sansBold, 22, C.navy, { align: "center", width: UW, tracking: 1.5 });
  y += 30;
  txt(d, "MEDICINA INTEGRATIVA & LONGEVIDADE", M, y, F.sans, 7.5, "#888", { align: "center", width: UW, tracking: 4 });
  y += 20;
  lin(d, M + 80, y, M + UW - 80, "#DDD", 0.5);
  y += 16;
  txt(d, "REGISTRO DE ASSISTÊNCIA SISTÊMICO", M, y, F.serifBold, 14, C.navy, { align: "center", width: UW, tracking: 2 });
  y += 18;
  txt(d, "DOCUMENTO OFICIAL DO PROTOCOLO TERAPÊUTICO", M, y, F.sans, 7, "#AAA", { align: "center", width: UW, tracking: 2 });
  y += 30;

  // Caixas de dados (área branca)
  const fw = UW / 3;
  brd(d, M, y, UW, 50, "#EEE", 0.5);
  const flds = [["Nº RAS","RAS-2026-0047"],["Emissão","18/07/2026"],["Validade","90 dias"]];
  for (let i = 0; i < flds.length; i++) {
    const fx = M + i * fw;
    if (i > 0) linV(d, fx, y + 8, y + 42, "#DDD", 0.5);
    txt(d, flds[i][0], fx + 6, y + 8, F.sans, 6.5, "#AAA", { tracking: 2, align: "center", width: fw - 12 });
    txt(d, flds[i][1], fx + 6, y + 24, F.serifBold, 12, C.navy, { align: "center", width: fw - 12 });
  }
  y += 62;

  // Dados paciente (área branca)
  txt(d, "PACIENTE", M, y, F.sansBold, 7, "#AAA", { tracking: 3 });
  y += 12;
  txt(d, PAC, M, y, F.serifBold, 13, C.navy);
  y += 16;
  txt(d, `CPF ${PAC_CPF}  ·  Nasc. ${PAC_NASC}`, M, y, F.sans, 8, "#555");
  y += 10;
  txt(d, PAC_END, M, y, F.sans, 7.5, "#777", { width: UW });

  // Área navy — médico e assinatura
  const NY = SPLIT + 22;
  txt(d, "MÉDICO RESPONSÁVEL", M, NY, F.sansBold, 6.5, C.ouro, { tracking: 3 });
  txt(d, MED, M, NY + 14, F.serifBold, 13, "#FFFFFF");
  txt(d, MED_CRM, M, NY + 29, F.mono, 8, "#8BA3C7");
  txt(d, MED_ESP, M, NY + 41, F.sans, 8, "#8BA3C7");

  lin(d, M + UW - 180, NY + 4, M + UW, C.ouro, 0.7);
  txt(d, "Assinatura e Carimbo", M + UW - 180, NY + 9, F.sans, 7, "#8BA3C7", { align: "center", width: 180, tracking: 0.5 });
  txt(d, DATA, M + UW - 180, NY + 20, F.serif, 8.5, "#C8C2B8", { align: "center", width: 180 });

  txt(d, `${END_CLI}  ·  ${TEL_CLI}`, M, PH - M - 18, F.sans, 6.5, "#5A7896", { align: "center", width: UW });
  ret(d, 0, PH - 3, PW, 3, C.ouro);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAP-01 · CAPA PREMIUM SUBSTÂNCIAS + FARMÁCIA
// ═══════════════════════════════════════════════════════════════════════════════
function cap01(d: PDFKit.PDFDocument) {
  const M = 28, UW = PW - M * 2;
  ret(d, 0, 0, PW, PH, C.branco);
  ret(d, 0, 0, PW, 5, C.ouro);
  // Header navy
  ret(d, 0, 5, PW, 100, C.navy);
  txt(d, CLINICA, M, 22, F.sansBold, 14, "#FFFFFF", { tracking: 1.5 });
  txt(d, "PADUCCIA CLÍNICA MÉDICA LTDA  ·  CNPJ 63.865.940/0001-63", M, 38, F.sans, 7.5, "#8BA3C7");
  txt(d, END_CLI, M, 48, F.sans, 7.5, "#8BA3C7");
  txt(d, "PAWARDS", PW - M - 120, 22, F.serifBold, 20, C.ouro, { align: "right", width: 120, tracking: 3 });
  txt(d, "Sistema de Gestão em Saúde", PW - M - 155, 46, F.sans, 7, "#8BA3C7", { align: "right", width: 155 });
  // Sub-header título
  ret(d, M, 66, UW, 35, `${C.ouro}22`);
  brd(d, M, 66, UW, 35, `${C.ouro}44`, 0.5);
  txt(d, "PROTOCOLO TERAPÊUTICO INTEGRADO", M + 12, 74, F.sansBold, 13, C.ouro, { tracking: 2 });
  txt(d, "RAS — Registro de Assistência Sistêmico · Documento Completo", M + 12, 88, F.sans, 8, "#8BA3C7");
  txt(d, "Nº 2026-07-0047", PW - M - 12, 74, F.serifBold, 10, "#FFFFFF", { align: "right", width: 140 });
  txt(d, "18/07/2026", PW - M - 12, 88, F.sans, 7.5, "#8BA3C7", { align: "right", width: 140 });

  // Dados paciente
  let y = 116;
  ret(d, M, y, UW, 56, "#F4F7FB");
  brd(d, M, y, UW, 56, "#DCE4EF", 0.5);
  const W2 = UW * 0.6;
  linV(d, M + W2, y + 8, y + 48, "#DCE4EF", 0.5);
  txt(d, "PACIENTE", M + 10, y + 8, F.sansBold, 6.5, "#AAA", { tracking: 2 });
  txt(d, PAC, M + 10, y + 21, F.sansBold, 12, C.navy);
  txt(d, `CPF ${PAC_CPF}  ·  Nasc. ${PAC_NASC}`, M + 10, y + 35, F.sans, 7.5, "#555");
  txt(d, PAC_END, M + 10, y + 46, F.sans, 7, "#777", { width: W2 - 20 });
  txt(d, "MÉDICO", M + W2 + 10, y + 8, F.sansBold, 6.5, "#AAA", { tracking: 2 });
  txt(d, MED, M + W2 + 10, y + 21, F.sansBold, 9, C.navy, { width: UW - W2 - 20 });
  txt(d, MED_CRM, M + W2 + 10, y + 35, F.mono, 7, "#666");
  txt(d, MED_ESP, M + W2 + 10, y + 46, F.sans, 7, "#777");
  y += 68;

  lin(d, M, y, M + UW, C.ouro, 0.8);
  y += 14;
  txt(d, "SUBSTÂNCIAS TERAPÊUTICAS PRESCRITAS", M, y, F.sansBold, 7, C.navy, { tracking: 3 });
  y += 18;

  const subs = [
    { nome: "Fosfatidilserina",   cat: "Neuroproteção",  barra: 92, cor: "#7C3AED" },
    { nome: "Alpha-GPC",          cat: "Cognição",       barra: 88, cor: "#2563EB" },
    { nome: "Berberina HCl",      cat: "Metabólico",     barra: 75, cor: "#059669" },
    { nome: "Semaglutida 0,25mg", cat: "GLP-1",          barra: 68, cor: "#EA580C" },
    { nome: "Hericium erinaceus", cat: "Neuroproteção",  barra: 85, cor: "#7C3AED" },
    { nome: "Vitamina D3 10kUI",  cat: "Imuno/Hormonal", barra: 95, cor: C.ouro },
  ];
  for (const s of subs) {
    const barW = (UW - 110) * (s.barra / 100);
    txt(d, s.nome, M, y + 3, F.sansBold, 9, C.navy, { width: 140 });
    brd(d, M + 148, y + 3, UW - 158, 10, "#EEE", 0.4);
    ret(d, M + 148, y + 3, barW > 0 ? barW : 2, 10, s.cor);
    txt(d, s.cat, M + UW - 8, y + 3, F.sans, 7, s.cor, { align: "right", width: 120 });
    txt(d, `${s.barra}%`, M + UW - 8, y + 3, F.mono, 7, "#888", { align: "right", width: 30 });
    y += 18;
  }
  y += 10;
  lin(d, M, y, M + UW, C.linhaSuave, 0.5);
  y += 12;

  // Seção farmácia
  txt(d, "FARMÁCIA DE MANIPULAÇÃO", M, y, F.sansBold, 7, C.navy, { tracking: 3 });
  y += 14;
  brd(d, M, y, UW, 48, C.linhaSuave, 0.5);
  txt(d, "Farmácia Modelo Magistral", M + 10, y + 8, F.sansBold, 10, C.navy);
  txt(d, "CNPJ 00.000.000/0001-00", M + 10, y + 21, F.sans, 8, "#555");
  txt(d, "Rua das Farmácias, 100 · São Paulo · SP", M + 10, y + 32, F.sans, 7.5, "#777");
  txt(d, "Resp. Técnico: Dra. Ana Lima · CRF-SP 12345", PW - M - 10, y + 21, F.sans, 7.5, "#666", { align: "right", width: 220 });
  y += 60;

  rodapeAssinatura(d, M, UW, y, C.navy);
  rodapeEndereco(d, M, UW);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAP-02 · AUSTERO TIPOGRÁFICO (formal, centrado, índice tipo sumário)
// ═══════════════════════════════════════════════════════════════════════════════
function cap02(d: PDFKit.PDFDocument) {
  const M = 44, UW = PW - M * 2, cx = PW / 2;
  ret(d, 0, 0, PW, PH, C.branco);
  ret(d, 0, 0, PW, 4, C.navy);
  ret(d, 0, 4, PW, 2, C.ouro);

  // Cabeçalho centrado formal
  let y = 36;
  txt(d, "MEDICINA INTEGRATIVA E LONGEVIDADE", M, y, F.sans, 7.5, "#888", { align: "center", width: UW, tracking: 5 });
  y += 14;
  txt(d, CLINICA, M, y, F.sansBold, 22, C.navy, { align: "center", width: UW, tracking: 2.5 });
  y += 28;
  txt(d, "PADUCCIA CLÍNICA MÉDICA LTDA — EPP", M, y, F.sans, 8.5, "#666", { align: "center", width: UW, tracking: 1 });
  y += 13;
  txt(d, "CNPJ 63.865.940/0001-63 · RUA GUAXUPÉ, 327 · VILA FORMOSA · SÃO PAULO — SP", M, y, F.sans, 7.5, "#999", { align: "center", width: UW });
  y += 22;
  // Quadrado monograma
  brd(d, cx - 28, y, 56, 56, C.navy, 1.5);
  ret(d, cx - 28, y, 56, 56, "#F8F8F8");
  txt(d, "IP", cx - 28, y + 14, F.serifBold, 14, C.ouro, { align: "center", width: 56, tracking: 1 });
  txt(d, "PÁDUA", cx - 28, y + 32, F.sans, 6.5, C.navy, { align: "center", width: 56, tracking: 2 });
  y += 76;

  // Linha dupla
  d.rect(M, y, UW, 1.5).fill(C.navy);
  d.rect(M, y + 4, UW, 0.5).fill(C.navy);
  y += 18;

  // Título do documento
  txt(d, "DOCUMENTO CLÍNICO OFICIAL", M, y, F.sans, 7.5, "#AAA", { align: "center", width: UW, tracking: 4 });
  y += 14;
  txt(d, "PROTOCOLO TERAPÊUTICO", M, y, F.serifBold, 17, C.navy, { align: "center", width: UW, tracking: 2 });
  y += 22;
  txt(d, "REGISTRO DE ASSISTÊNCIA SISTÊMICO — RAS", M, y, F.sans, 9, "#555", { align: "center", width: UW, tracking: 1 });
  y += 28;

  // Números lado a lado
  const flds = [["Número","RAS-2026-0047"],["Emissão","17/07/2026"],["Validade","90 DIAS"]];
  const fw = 90, gap = 40, startX = cx - (fw * 3 + gap * 2) / 2;
  for (let i = 0; i < flds.length; i++) {
    const fx = startX + i * (fw + gap);
    if (i > 0) linV(d, fx - gap/2, y, y + 40, "#DDD", 0.5);
    txt(d, flds[i][0], fx, y + 4, F.sans, 6.5, "#AAA", { align: "center", width: fw, tracking: 2 });
    txt(d, flds[i][1], fx, y + 20, F.serifBold, 12, C.navy, { align: "center", width: fw });
  }
  y += 56;

  d.rect(M, y, UW, 0.5).fill("#EEE");
  y += 14;

  // Dados paciente
  txt(d, "PACIENTE", M, y, F.sansBold, 6.5, "#AAA", { tracking: 3 });
  y += 14;
  txt(d, PAC, M, y, F.serifBold, 13, C.navy);
  y += 18;
  txt(d, `CPF ${PAC_CPF}  ·  Nasc. ${PAC_NASC}  ·  ${PAC_END}`, M, y, F.sans, 8, "#666", { width: UW });
  y += 30;
  d.rect(M, y, UW, 0.5).fill("#EEE");
  y += 14;

  // Índice tipo sumário
  txt(d, "ÍNDICE DE CADERNOS", M, y, F.sansBold, 7, "#AAA", { tracking: 3 });
  y += 16;
  const cadernos = [
    { cod: "RACL·HMED", nome: "Medicamentos em Uso", pag: "3" },
    { cod: "RACL·FORM", nome: "Fórmulas Magistrais", pag: "5" },
    { cod: "RACL·EXAM", nome: "Exames Solicitados", pag: "8" },
    { cod: "RACL·EVOL", nome: "Evolução Clínica", pag: "11" },
    { cod: "RACJ·TCLE", nome: "Termo de Consentimento Global", pag: "14" },
    { cod: "RACJ·CFOR", nome: "Consentimento Fórmulas", pag: "16" },
    { cod: "FINA·ORÇA", nome: "Orçamento do Protocolo", pag: "18" },
  ];
  for (const c of cadernos) {
    brd(d, M, y, UW, 22, "#F8F8F8", 0.4);
    ret(d, M, y, 80, 22, "#F0F0F0");
    txt(d, c.cod, M + 4, y + 7, F.mono, 7.5, C.navy);
    txt(d, c.nome, M + 90, y + 7, F.sans, 8.5, "#333");
    txt(d, `Pág. ${c.pag}`, M + UW - 8, y + 7, F.mono, 7.5, "#888", { align: "right", width: 50 });
    y += 22;
  }
  y += 16;

  rodapeAssinatura(d, M, UW, y, C.navy);
  rodapeEndereco(d, M, UW);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAP-03 · RADAR SVG → representado como radar textual + barras em PDF
// ═══════════════════════════════════════════════════════════════════════════════
function cap03(d: PDFKit.PDFDocument) {
  const M = 28, UW = PW - M * 2;
  ret(d, 0, 0, PW, PH, C.branco);
  ret(d, 0, 0, PW, 96, C.navy);
  ret(d, 0, 96, PW, 3, "#06B6D4"); // faixa ciano

  // Header
  txt(d, CLINICA, M, 20, F.sansBold, 13, "#FFFFFF", { tracking: 1.5 });
  txt(d, "CNPJ 63.865.940/0001-63 · RUA GUAXUPÉ, 327 — VILA FORMOSA — SP", M, 36, F.sans, 7.5, "#8BA3C7");
  txt(d, "PAWARDS", PW - M - 120, 20, F.serifBold, 18, C.ouro, { align: "right", width: 120, tracking: 3 });
  txt(d, "PROTOCOLO TERAPÊUTICO INTEGRADO", PW - M - 175, 42, F.sans, 7, "#06B6D4", { align: "right", width: 175, tracking: 1 });

  // Sub header ciano
  let y = 110;
  txt(d, "COBERTURA TERAPÊUTICA POR CATEGORIA", M, y, F.sansBold, 8, "#06B6D4", { tracking: 3 });
  txt(d, "(Registro de Assistência Sistêmico — RAS · Nº 2026-0047)", PW - M, y, F.sans, 7.5, C.textoMuted, { align: "right", width: UW / 2 });
  y += 22;

  // RADAR representado como grade radial textual + barras
  const cats = [
    { label: "NEURO",     val: 88, cor: "#7C3AED" },
    { label: "HORMONAL",  val: 72, cor: "#2563EB" },
    { label: "METAB.",    val: 80, cor: "#059669" },
    { label: "IMUNO",     val: 65, cor: "#EA580C" },
    { label: "LONGEVID.", val: 90, cor: C.ouro },
    { label: "ESTÉTICA",  val: 45, cor: "#EC4899" },
  ];
  // Desenhar radar manualmente como hexágono + linhas
  const rcx = M + 120, rcy = y + 115, rr = 90;
  const N = cats.length;
  // Grades concêntricas (25, 50, 75, 100)
  for (const pct of [25, 50, 75, 100]) {
    const pts: string[] = [];
    for (let i = 0; i < N; i++) {
      const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
      const dist = (pct / 100) * rr;
      const px = rcx + dist * Math.cos(angle);
      const py = rcy + dist * Math.sin(angle);
      pts.push(`${i === 0 ? "M" : "L"}${px},${py}`);
    }
    d.path(pts.join(" ") + " Z").lineWidth(0.3).stroke("#DDE");
    // Rótulo de escala
    const py = rcy - (pct / 100) * rr;
    txt(d, `${pct}`, rcx + 2, py - 5, F.mono, 6, "#CCC");
  }
  // Linhas dos eixos
  for (let i = 0; i < N; i++) {
    const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
    d.moveTo(rcx, rcy).lineTo(rcx + rr * Math.cos(angle), rcy + rr * Math.sin(angle)).lineWidth(0.4).stroke("#DDE");
  }
  // Polígono de dados
  const dataPts: string[] = [];
  for (let i = 0; i < N; i++) {
    const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
    const dist = (cats[i].val / 100) * rr;
    const px = rcx + dist * Math.cos(angle);
    const py = rcy + dist * Math.sin(angle);
    dataPts.push(`${i === 0 ? "M" : "L"}${px},${py}`);
  }
  d.path(dataPts.join(" ") + " Z").fillOpacity(0.15).fill("#06B6D4").fillOpacity(1);
  d.path(dataPts.join(" ") + " Z").lineWidth(1.2).stroke("#06B6D4");
  // Pontos e labels
  for (let i = 0; i < N; i++) {
    const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
    const dist = (cats[i].val / 100) * rr;
    const px = rcx + dist * Math.cos(angle);
    const py = rcy + dist * Math.sin(angle);
    d.circle(px, py, 3).fill(cats[i].cor);
    const ldist = rr + 18;
    const lx = rcx + ldist * Math.cos(angle);
    const ly = rcy + ldist * Math.sin(angle);
    txt(d, cats[i].label, lx - 24, ly - 5, F.sansBold, 7, cats[i].cor, { align: "center", width: 48, tracking: 1 });
    txt(d, `${cats[i].val}%`, lx - 20, ly + 5, F.mono, 7, "#888", { align: "center", width: 40 });
  }

  // Substâncias (lado direito do radar)
  const SX = M + 260, SW = UW - 260;
  txt(d, "SUBSTÂNCIAS PRESCRITAS", SX, y, F.sansBold, 7, C.navy, { tracking: 2, width: SW });
  let sy = y + 16;
  const subs = [
    { nome: "Fosfatidilserina 200mg", cat: "NEURO",     prog: 88, cor: "#7C3AED" },
    { nome: "Berberina HCl 500mg",   cat: "METAB.",    prog: 80, cor: "#059669" },
    { nome: "Vitamina D3 10.000UI",  cat: "IMUNO",     prog: 65, cor: "#EA580C" },
    { nome: "Semaglutida 0,25mg",    cat: "HORMONAL",  prog: 72, cor: "#2563EB" },
    { nome: "Resveratrol 250mg",     cat: "LONGEVID.", prog: 90, cor: C.ouro },
  ];
  for (const s of subs) {
    txt(d, s.nome, SX, sy, F.sans, 8, C.navy, { width: SW - 30 });
    txt(d, `${s.prog}%`, SX + SW, sy, F.mono, 8, s.cor, { align: "right", width: 30 });
    sy += 11;
    brd(d, SX, sy, SW, 6, "#EEE", 0.3);
    ret(d, SX, sy, (SW * s.prog) / 100, 6, s.cor);
    sy += 14;
  }

  y += 245;
  lin(d, M, y, M + UW, C.linhaSuave, 0.5);
  y += 12;

  // Paciente
  ret(d, M, y, UW, 52, "#F4F7FB");
  brd(d, M, y, UW, 52, "#DCE4EF", 0.5);
  const W2 = UW * 0.6;
  linV(d, M + W2, y + 8, y + 44, "#DCE4EF", 0.5);
  txt(d, "PACIENTE", M + 10, y + 8, F.sansBold, 6.5, "#AAA", { tracking: 2 });
  txt(d, PAC, M + 10, y + 20, F.sansBold, 11, C.navy);
  txt(d, `CPF ${PAC_CPF}  ·  Nasc. ${PAC_NASC}`, M + 10, y + 34, F.sans, 7.5, "#555");
  txt(d, "MÉDICO", M + W2 + 10, y + 8, F.sansBold, 6.5, "#AAA", { tracking: 2 });
  txt(d, MED, M + W2 + 10, y + 20, F.sansBold, 9, C.navy, { width: UW - W2 - 20 });
  txt(d, MED_CRM, M + W2 + 10, y + 34, F.mono, 7, "#666");
  y += 64;

  rodapeAssinatura(d, M, UW, y, "#06B6D4");
  rodapeEndereco(d, M, UW);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LUX-A, B, C, D — reutilizados do script v2 com mínimas mudanças de naming
// ═══════════════════════════════════════════════════════════════════════════════
function luxA(d: PDFKit.PDFDocument) {
  const M = 54, UW = PW - M * 2, cx = PW / 2;
  ret(d, 0, 0, PW, PH, C.marfim);
  ret(d, 0, 0, PW, 2.5, C.ouro); ret(d, 0, PH - 2.5, PW, 2.5, C.ouro);
  brd(d, cx - 20, 40, 40, 40, C.ouro, 0.7);
  txt(d, "P", cx - 20, 50, F.serifBold, 22, C.ouroDeep, { align: "center", width: 40 });
  let y = 98;
  txt(d, "INSTITUTO PÁDUA", M, y, F.sans, 7, "#8C8278", { align: "center", width: UW, tracking: 3.5 });
  y += 13; txt(d, MED, M, y, F.serifBold, 15, C.texto, { align: "center", width: UW, tracking: 0.3 });
  y += 20; txt(d, MED_ESP, M, y, F.serif, 9, C.textoSub, { align: "center", width: UW, tracking: 0.5 });
  y += 13; txt(d, MED_CRM, M, y, F.mono, 7.5, "#8C8278", { align: "center", width: UW });
  y += 22;
  lin(d, M, y, M + UW, C.ouro, 0.8);
  lin(d, M, y + 4, M + UW, C.ouroPale, 0.3);
  lin(d, M, y + 8, M + UW, C.ouro, 0.4);
  y += 22;
  txt(d, "RECEITUÁRIO MÉDICO", M, y, F.sansBold, 7, C.ouroDeep, { align: "center", width: UW, tracking: 4 });
  y += 12; txt(d, "Receita Simples — Validade 30 dias", M, y, F.sans, 8, "#8C8278", { align: "center", width: UW });
  y += 30;
  ret(d, M, y, UW, 74, C.creamBlock); brd(d, M, y, UW, 74, C.creamLine, 0.5);
  const LP = M + 12, VP = M + 100;
  txt(d, "PACIENTE", LP, y + 8, F.sansBold, 6.5, "#8C8278", { tracking: 2.5 });
  const campos: [string, string, number][] = [
    ["Nome", PAC, y + 22], ["Nascimento", PAC_NASC, y + 40], ["Endereço", PAC_END, y + 56],
  ];
  for (const [l, v, yy] of campos) {
    txt(d, l.toUpperCase(), LP, yy, F.sans, 6.5, "#8C8278", { tracking: 0.5 });
    txt(d, v, VP, yy, F.serifBold, 9.5, C.texto, { width: UW - (VP - M) - 4 });
    if (yy < y + 56) lin(d, LP, yy + 13, M + UW - LP + M, C.creamLine, 0.4);
  }
  y += 88;
  lin(d, M, y, M + UW, C.ouro, 0.6);
  y += 18;
  txt(d, "PRESCRIÇÃO", M, y, F.sansBold, 7, C.ouroDeep, { tracking: 4 });
  y += 20;
  for (const it of RX3) {
    txt(d, it.n, M, y + 1, F.serifBold, 9, C.ouroPale);
    const IX = M + 26, IW = UW - 26;
    txt(d, it.nome, IX, y, F.serifBold, 12, C.texto);
    txt(d, it.dose, IX + 200, y + 2, F.sans, 8, C.textoSub, { align: "right", width: IW - 200 });
    y += 16; txt(d, it.pos, IX, y, F.serif, 9.5, C.textoSub, { width: IW });
    y += 14; txt(d, it.dur.toUpperCase(), IX, y, F.sans, 7, "#8C8278", { tracking: 0.5 });
    y += 11;
    if (it.obs) { linV(d, IX - 5, y, y + 16, C.ouroPale, 1.5); txt(d, it.obs, IX, y, F.serif, 8.5, "#8C8278", { width: IW }); y += 18; }
    lin(d, M, y + 6, M + UW, C.creamLine, 0.5); y += 20;
  }
  y += 8;
  txt(d, DATA, M, y, F.serif, 9, C.textoSub);
  const AX = PW - M - 170;
  lin(d, AX, y + 2, AX + 170, C.ouro, 0.6);
  txt(d, "Assinatura do Médico Responsável", AX, y + 7, F.sans, 7, "#8C8278", { align: "center", width: 170, tracking: 0.3 });
  txt(d, MED_CRM, AX, y + 17, F.mono, 7.5, "#8C8278", { align: "center", width: 170 });
  y += 40;
  lin(d, M, y, M + UW, C.creamLine, 0.5); y += 8;
  txt(d, `${END_CLI}  ·  ${TEL_CLI}`, M, y, F.sans, 7, "#8C8278", { align: "center", width: UW, tracking: 0.3 });
}

function luxB(d: PDFKit.PDFDocument) {
  const M = 48, UW = PW - M * 2;
  ret(d, 0, 0, PW, PH, C.marfim);
  const HH = 172;
  ret(d, 0, 0, PW, HH, C.preto);
  ret(d, PW - 4, 0, 4, HH, C.ouroDeep);
  txt(d, "INSTITUTO PÁDUA  ·  MEDICINA INTEGRATIVA  ·  DESDE 2018", M, 30, F.sans, 6.5, C.ouro, { tracking: 2 });
  txt(d, "Dr. Caio Henrique", M, 50, F.serifBold, 22, "#FFFFFF");
  txt(d, "Fernandes Pádua", M, 76, F.serifBold, 22, "#FFFFFF");
  lin(d, M, 107, M + 52, C.ouroDeep, 1.2);
  txt(d, MED_ESP, M, 115, F.serif, 9, "#9A9189", { tracking: 0.3 });
  txt(d, MED_CRM, M, 130, F.mono, 7.5, "#7A7268");
  brd(d, PW - M - 110, 24, 110, 22, C.ouroEscuro, 0.5);
  txt(d, "RECEITUÁRIO MÉDICO", PW - M - 110, 31, F.sansBold, 6, C.ouroPale, { align: "center", width: 110, tracking: 1.5 });
  lin(d, 0, HH, PW, C.ouroDeep, 1.2);
  let y = HH + 26;
  txt(d, `${DATA}  ·  São Paulo · SP`, M, y, F.serif, 8.5, C.textoSub);
  txt(d, "Receita Simples — Validade 30 dias", PW - M - 170, y, F.sans, 7.5, C.textoMuted, { align: "right", width: 170 });
  y += 28;
  linV(d, M, y, y + 80, C.ouroDeep, 2.5);
  const PX = M + 14;
  txt(d, "PACIENTE", PX, y, F.sansBold, 6.5, C.ouroDeep, { tracking: 3 });
  y += 14; txt(d, PAC, PX, y, F.serifBold, 13, C.texto, { width: UW - 14 });
  y += 18; txt(d, `Nascimento: ${PAC_NASC}`, PX, y, F.serif, 9, C.textoSub);
  y += 14; txt(d, `Endereço: ${PAC_END}`, PX, y, F.serif, 9, C.textoSub);
  y += 24;
  lin(d, M, y, M + UW, C.ouro, 0.8); lin(d, M, y + 5, M + UW, C.creamLine, 0.4);
  y += 22;
  txt(d, "PRESCRIÇÃO", M, y, F.sansBold, 7, C.texto, { tracking: 4 });
  y += 20;
  for (const it of RX3) {
    txt(d, it.n, M, y + 1, F.serifBold, 9, C.ouro);
    const IX = M + 26, IW = UW - 26;
    txt(d, it.nome, IX, y, F.serifBold, 12, C.texto);
    txt(d, it.dose, PW - M - 2, y + 2, F.sans, 8, C.textoSub, { align: "right", width: 170 });
    y += 16; txt(d, it.pos, IX, y, F.serif, 9.5, C.textoSub, { width: IW });
    y += 14; txt(d, it.dur.toUpperCase(), IX, y, F.sans, 7, C.textoMuted, { tracking: 0.5 });
    y += 11;
    if (it.obs) { linV(d, IX - 5, y, y + 16, C.ouro, 1.5); txt(d, it.obs, IX, y, F.serif, 8.5, C.textoMuted, { width: IW }); y += 18; }
    lin(d, M, y + 6, M + UW, C.creamLine, 0.5); y += 20;
  }
  y += 10;
  const AX = PW - M - 180;
  lin(d, AX, y, AX + 180, C.ouro, 0.7);
  txt(d, MED, AX, y + 6, F.serifBold, 9, C.textoSub, { align: "center", width: 180 });
  txt(d, MED_CRM, AX, y + 18, F.mono, 7, C.textoMuted, { align: "center", width: 180 });
  const RY = PH - 48;
  lin(d, M, RY, M + UW, C.creamLine, 0.5);
  txt(d, `${END_CLI}  ·  ${TEL_CLI}`, M, RY + 8, F.sans, 7, C.textoMuted, { align: "center", width: UW, tracking: 0.3 });
  ret(d, 0, PH - 2, PW, 2, C.ouroDeep);
}

function luxC(d: PDFKit.PDFDocument) {
  const M = 60, UW = PW - M * 2, cx = PW / 2, BM = 14;
  ret(d, 0, 0, PW, PH, C.champagne);
  brd(d, BM, BM, PW - BM * 2, PH - BM * 2, C.ouro, 0.7);
  brd(d, BM + 5, BM + 5, PW - (BM + 5) * 2, PH - (BM + 5) * 2, C.creamLine, 0.4);
  let y = M;
  lin(d, M, y, cx - 18, C.ouro, 0.6); lin(d, cx + 18, y, M + UW, C.ouro, 0.6);
  dia(d, cx, y, 8, C.ouro); dia(d, cx, y, 4, C.ouro, true);
  y += 22;
  txt(d, "INSTITUTO PÁDUA", M, y, F.sans, 7, C.ouroDeep, { align: "center", width: UW, tracking: 5 });
  y += 15; txt(d, MED, M, y, F.serifBold, 17, C.texto, { align: "center", width: UW, tracking: 0.2 });
  y += 24; txt(d, MED_ESP, M, y, F.serif, 9.5, C.textoSub, { align: "center", width: UW, tracking: 0.5 });
  y += 26;
  lin(d, M, y, cx - 10, C.creamLine, 0.5); lin(d, cx + 10, y, M + UW, C.creamLine, 0.5);
  d.moveTo(cx - 5, y).lineTo(cx, y - 5).lineTo(cx + 5, y).lineTo(cx, y + 5).closePath().fill(C.ouro);
  y += 18;
  brd(d, cx - 100, y, 200, 24, C.ouroDeep, 0.6);
  txt(d, "RECEITUÁRIO  ·  RECEITA SIMPLES", cx - 100, y + 7, F.sansBold, 6.5, C.ouroDeep, { align: "center", width: 200, tracking: 2 });
  y += 36;
  lin(d, M, y, M + UW, C.ouro, 0.9); lin(d, M, y + 5, M + UW, C.ouro, 0.3);
  y += 20;
  txt(d, "DADOS DO PACIENTE", M, y, F.sansBold, 6.5, C.textoMuted, { tracking: 3 });
  y += 14;
  const PCC: [string, string][] = [
    ["Nome Completo", PAC], ["Data de Nascimento", PAC_NASC],
    ["Endereço", PAC_END], ["Data de Emissão", DATA],
  ];
  for (const [l, v] of PCC) {
    txt(d, l.toUpperCase(), M, y, F.sans, 6.5, C.textoMuted, { tracking: 0.5 });
    txt(d, v, M, y, F.serifBold, 9.5, C.texto, { align: "right", width: UW });
    lin(d, M, y + 14, M + UW, C.creamLine, 0.5); y += 20;
  }
  y += 6;
  lin(d, M, y, M + UW, C.creamLine, 0.4);
  lin(d, M, y + 6, M + UW, C.ouro, 0.8);
  lin(d, M, y + 12, M + UW, C.creamLine, 0.4);
  y += 26;
  txt(d, "PRESCRIÇÃO MÉDICA", M, y, F.sansBold, 7, C.texto, { tracking: 3 });
  txt(d, "Validade: 30 dias", M + UW, y, F.sans, 7.5, C.textoMuted, { align: "right", width: UW });
  y += 20;
  for (const it of RX3) {
    txt(d, it.n, M, y + 1, F.serifBold, 9, C.ouro);
    const IX = M + 26, IW = UW - 26;
    txt(d, it.nome, IX, y, F.serifBold, 12, C.texto);
    txt(d, it.dose, PW - M - 2, y + 2, F.sans, 8, C.textoSub, { align: "right", width: 170 });
    y += 16; txt(d, it.pos, IX, y, F.serif, 9.5, C.textoSub, { width: IW });
    y += 14; txt(d, it.dur.toUpperCase(), IX, y, F.sans, 7, C.textoMuted, { tracking: 0.5 });
    y += 11;
    if (it.obs) { linV(d, IX - 5, y, y + 16, C.ouroPale, 1.5); txt(d, it.obs, IX, y, F.serif, 8.5, C.textoMuted, { width: IW }); y += 18; }
    lin(d, M, y + 6, M + UW, C.creamLine, 0.5); y += 20;
  }
  y += 10;
  txt(d, MED_CRM, M, y, F.mono, 7.5, C.textoMuted);
  const AX = PW - M - 175;
  lin(d, AX, y + 2, AX + 175, C.ouro, 0.7);
  txt(d, "Assinatura e Carimbo", AX, y + 8, F.sans, 7.5, C.textoSub, { align: "center", width: 175, tracking: 0.5 });
  const RY = PH - 58;
  lin(d, M, RY, cx - 12, C.creamLine, 0.5); lin(d, cx + 12, RY, M + UW, C.creamLine, 0.5);
  dia(d, cx, RY, 6, C.ouro); dia(d, cx, RY, 3, C.ouro, true);
  txt(d, `${END_CLI}  ·  ${TEL_CLI}`, M, RY + 12, F.sans, 7, C.textoMuted, { align: "center", width: UW, tracking: 0.3 });
}

function luxD(d: PDFKit.PDFDocument) {
  const M = 58, UW = PW - M * 2, cx = PW / 2, BM = 18;
  ret(d, 0, 0, PW, PH, C.pretoAbs);
  ret(d, 0, 0, PW, 2, C.ouroDeep);
  brd(d, BM, BM, PW - BM * 2, PH - BM * 2, C.ouroEscuro, 0.6);
  let y = M + 10;
  txt(d, "INSTITUTO PÁDUA  ·  MEDICINA INTEGRATIVA", M, y, F.sans, 7, C.ouro, { align: "center", width: UW, tracking: 2.5 });
  y += 14; lin(d, M + 100, y, M + UW - 100, C.ouroEscuro, 0.5);
  y += 22;
  txt(d, "PROTOCOLO TERAPÊUTICO", M, y, F.sans, 7.5, "#8A8278", { align: "center", width: UW, tracking: 3 });
  y += 14; lin(d, cx - 28, y, cx + 28, C.ouroDeep, 0.8);
  y += 22;
  txt(d, "PROTOCOLO DE", M, y, F.serifBold, 26, "#F8F4EE", { align: "center", width: UW, tracking: 1 });
  y += 34; txt(d, "LONGEVIDADE", M, y, F.serifBold, 26, "#F8F4EE", { align: "center", width: UW, tracking: 1 });
  y += 34; txt(d, "Cuidado Integrativo Avançado", M, y, F.serif, 11, C.ouro, { align: "center", width: UW, tracking: 0.8 });
  y += 40;
  const OY = y + 24;
  dia(d, cx, OY, 26, C.ouroEscuro); dia(d, cx, OY, 16, C.ouro); dia(d, cx, OY, 6, C.ouro, true);
  y = OY + 44;
  brd(d, cx - 160, y, 320, 92, C.ouroEscuro, 0.6);
  lin(d, cx - 148, y + 30, cx + 148, C.ouroSombra, 0.4);
  lin(d, cx - 148, y + 60, cx + 148, C.ouroSombra, 0.4);
  const DC: [string, string, number][] = [
    ["PACIENTE", PAC, y + 10],
    ["NASCIMENTO", PAC_NASC, y + 40],
    ["CÓDIGO", "PROT-2026-001847", y + 70],
  ];
  for (const [l, v, yy] of DC) {
    txt(d, l, cx - 148, yy, F.sans, 6.5, "#8A8278", { tracking: 2 });
    txt(d, v, cx - 148, yy, F.serifBold, 10, "#F8F4EE", { align: "right", width: 296 });
  }
  y += 106;
  const RY = PH - M - 24;
  lin(d, M, RY - 34, M + UW, C.ouroEscuro, 0.5);
  lin(d, M, RY - 28, M + UW, C.ouroSombra, 0.3);
  txt(d, MED, M, RY - 20, F.serifBold, 10, "#F8F4EE");
  txt(d, MED_CRM, M, RY - 8, F.mono, 7.5, "#8A8278");
  const AX = PW - M - 155;
  lin(d, AX, RY - 20, AX + 155, C.ouro, 0.6);
  txt(d, "Assinatura", AX, RY - 14, F.sans, 7, "#8A8278", { align: "center", width: 155, tracking: 1 });
  txt(d, DATA, AX, RY - 4, F.serif, 8.5, "#C8C2B8", { align: "center", width: 155 });
  txt(d, `${END_CLI}  ·  ${TEL_CLI}`, M, RY + 8, F.sans, 6.5, C.ouroEscuro, { align: "center", width: UW, tracking: 0.3 });
  ret(d, 0, PH - 2, PW, 2, C.ouroDeep);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANIFESTO DE ARQUIVOS
// ═══════════════════════════════════════════════════════════════════════════════
const ARQUIVOS = [
  { nome: "REC-01__Receituario_Classico_Branco_versao_3.pdf",        fn: rec01 },
  { nome: "REC-02__Receituario_Bicolor_Clinico_versao_3.pdf",        fn: rec02 },
  { nome: "REC-03__Receituario_Com_Blocos_versao_3.pdf",             fn: rec03 },
  { nome: "REC-04__Receituario_Compacto_versao_3.pdf",               fn: rec04 },
  { nome: "REC-05__Receituario_Controlado_Azul_B1_B2_versao_3.pdf",  fn: rec05 },
  { nome: "REC-06__Receituario_Magistral_Farmacia_versao_3.pdf",     fn: rec06 },
  { nome: "RAS-01__Capa_RAS_Navy_Gradient_versao_3.pdf",             fn: ras01 },
  { nome: "RAS-02__Capa_RAS_Linha_Inferior_versao_3.pdf",            fn: ras02 },
  { nome: "RAS-03__Capa_RAS_Dourado_Border_versao_3.pdf",            fn: ras03 },
  { nome: "RAS-04__Capa_RAS_Bicolor_Austero_versao_3.pdf",           fn: ras04 },
  { nome: "CAP-01__Capa_Protocolo_Premium_Substancias_versao_3.pdf", fn: cap01 },
  { nome: "CAP-02__Capa_Protocolo_Austero_Tipografico_versao_3.pdf", fn: cap02 },
  { nome: "CAP-03__Capa_Protocolo_Radar_versao_3.pdf",               fn: cap03 },
  { nome: "LUX-A__Receituario_Maison_Blanche_versao_3.pdf",          fn: luxA },
  { nome: "LUX-B__Receituario_Noir_Excellence_versao_3.pdf",         fn: luxB },
  { nome: "LUX-C__Receituario_Champagne_versao_3.pdf",               fn: luxC },
  { nome: "LUX-D__Capa_Protocolo_Maison_versao_3.pdf",              fn: luxD },
];

async function main() {
  console.log("▶  GERADOR MESTRE · versao_3 · 17 PDFs\n");
  console.log("  Gerando PDFs em /tmp…");
  let falhas = 0;
  for (const arq of ARQUIVOS) {
    const dest = path.join("/tmp", arq.nome);
    await gerarPdf(arq.fn, dest);
    const { size } = fs.statSync(dest);
    if (size < 5000) {
      console.error(`  ✗ SUSPEITO: ${arq.nome} — apenas ${size} bytes`);
      falhas++;
    } else {
      console.log(`  ✓ ${arq.nome.padEnd(60)} ${(size / 1024).toFixed(1)} KB`);
    }
  }
  if (falhas > 0) { console.error(`\n  ${falhas} arquivo(s) suspeito(s). Abortando upload.`); process.exit(1); }

  console.log("\n  Fazendo upload ao Google Drive…\n");
  const drive = await driveClient();
  for (const arq of ARQUIVOS) await uploadArquivo(drive, arq.nome, path.join("/tmp", arq.nome));

  console.log(`\n══════════════════════════════════════════════════════════`);
  console.log(`  17 PDFs versao_3 · CONCLUÍDOS`);
  console.log(`  https://drive.google.com/drive/folders/${PASTA_ID}`);
  console.log(`══════════════════════════════════════════════════════════`);
}

main().catch(console.error);
