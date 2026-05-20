// 3 hibridos: cabecalho V1 (navy denso) + corpo V3 (creme/serif) + cards V2 (bordas)
// Caio escolhe qual e o ponto de equilibrio entre densidade clinica e elegancia editorial.
//
// V4 — HIBRIDO ORTODOXO: cabecalho V1 identico + creme V3 + cards com borda dourada
//      simples (0.6pt) + serif Times no corpo todo. Maximo de "documento medico autoral".
//
// V5 — HIBRIDO REFINADO: cabecalho V1 mais baixo + cremeClaro + cards com borda dupla
//      (filete superior grosso dourado + borda fina cinza) + serif Times so nos titulos,
//      sans no corpo (mais legivel em volume).
//
// V6 — HIBRIDO LUXUOSO: cabecalho V1 + creme + cards "moldura" com cantos dourados em L
//      (estilo certificado/diploma) + serif Times-Italic nos numeros romanos +
//      titulos Times-Bold + corpo Times-Roman + estrelas maiores.
//
// Saida: scripts/.local/samples/mockup-3-hibridos-validacao.pdf

import PDFDocument from "pdfkit";
import { createWriteStream, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const CORES = {
  navyProfundo: "#0F2940",
  navyMedio: "#1F3A5F",
  offWhite: "#F7F6F2",
  creme: "#F2EEDF",
  cremeClaro: "#FAF7EC",
  dourado: "#C7A646",
  douradoQueim: "#C8951A",
  douradoClaro: "#E8D89A",
  verdeSalvia: "#9DB8A5",
  cinzaTexto: "#1A1A1A",
  cinzaClaro: "#666666",
  cinzaLinha: "#D6D2C4",
};

const W = 595, H = 842, MARG = 42;

const NAD = {
  nome: "NAD+ Endovenoso",
  codigo: "NADE",
  via: "Endovenosa lenta (2-4h)",
  dose: "500 mg em SF 0,9%",
  freq: "1×/semana × 6 semanas",
  categoria: "Cofator Mitocondrial · Restaurador Bioenergético · Anti-senescência",
  porque: [
    "NAD+ não trata doença — repõe um cofator natural que o organismo produz desde o nascimento.",
    "Declínio fisiológico: cai cerca de 50% entre os 30 e 60 anos, silenciosamente.",
    "Essa queda alimenta o envelhecimento celular — perda de energia, sono fragmentado, neblina mental.",
    "Medicina integrativa age antes do sintoma virar diagnóstico: repõe o que falta para restaurar a função.",
  ],
  comoAtua: [
    "Cofator presente em cada uma das ~37 trilhões de células do corpo.",
    "Alimenta a cadeia respiratória mitocondrial — a usina de energia celular.",
    "Ativa as sirtuínas, genes guardiões da longevidade e do reparo de DNA.",
    "Via endovenosa garante 100% de biodisponibilidade (a oral é destruída no trato digestivo).",
  ],
  impactos: [
    { sistema: "Energia Mitocondrial", n: 5, obs: "Mecanismo de ação direto" },
    { sistema: "Neurocognitivo", n: 5, obs: "Clareza, foco, memória de trabalho" },
    { sistema: "Reparo Celular · DNA", n: 5, obs: "Ativa sirtuínas e PARPs" },
    { sistema: "Sono · Ritmo Circadiano", n: 4, obs: "Sono mais profundo" },
    { sistema: "Metabólico", n: 4, obs: "Sensibilidade insulínica" },
    { sistema: "Imunológico", n: 3, obs: "Modulação anti-inflamatória" },
    { sistema: "Cardiovascular", n: 3, obs: "Função endotelial, HRV" },
    { sistema: "Osteomuscular", n: 2, obs: "Recuperação pós-esforço" },
  ],
};

function estrelas(doc: PDFKit.PDFDocument, x: number, y: number, n: number, size = 11, gap = 1) {
  for (let i = 0; i < 5; i++) {
    doc.fontSize(size).font("Helvetica-Bold")
      .fillColor(i < n ? CORES.douradoQueim : CORES.cinzaLinha)
      .text("★", x + i * (size + gap), y, { lineBreak: false });
  }
}

// Cabecalho V1 (navy cheio + selo quadrado) — reutilizado nas 3 hibridas
// altura: padrao 64 + 2 (filete) + 28 (ribbon metadados) = 94
function cabecalhoV1(doc: PDFKit.PDFDocument, alturaHeader = 64) {
  doc.rect(0, 0, W, alturaHeader).fill(CORES.navyProfundo);
  doc.rect(0, alturaHeader, W, 2).fill(CORES.dourado);
  // Selo RXS quadrado
  const seloH = Math.min(38, alturaHeader - 14);
  doc.rect(MARG, (alturaHeader - seloH) / 2, seloH, seloH).fill(CORES.dourado);
  doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
    .text("RXS", MARG, (alturaHeader - seloH) / 2 + 6, { width: seloH, align: "center", lineBreak: false });
  doc.fontSize(11).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
    .text(NAD.codigo, MARG, (alturaHeader - seloH) / 2 + 18, { width: seloH, align: "center", lineBreak: false });
  // Nome substancia
  doc.fontSize(17).font("Helvetica-Bold").fillColor(CORES.creme)
    .text(NAD.nome, MARG + seloH + 12, (alturaHeader - 30) / 2, { width: 320, lineBreak: false });
  doc.fontSize(8.5).font("Helvetica-Oblique").fillColor(CORES.dourado)
    .text(NAD.categoria, MARG + seloH + 12, (alturaHeader - 30) / 2 + 22,
      { width: 380, lineBreak: false });
  // Etiqueta modo
  doc.rect(W - MARG - 130, (alturaHeader - 18) / 2, 130, 18).fill(CORES.verdeSalvia);
  doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
    .text("APRESENTAÇÃO · D0", W - MARG - 130, (alturaHeader - 18) / 2 + 5,
      { width: 130, align: "center", characterSpacing: 1, lineBreak: false });
  // Ribbon metadados
  const yR = alturaHeader + 2;
  doc.rect(0, yR, W, 28).fill(CORES.creme);
  const metas: [string, string][] = [["VIA", NAD.via], ["DOSE", NAD.dose], ["FREQUÊNCIA", NAD.freq]];
  let cx = MARG;
  for (const [l, v] of metas) {
    doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.cinzaClaro)
      .text(l, cx, yR + 6, { characterSpacing: 0.8, lineBreak: false });
    doc.fontSize(9.5).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
      .text(v, cx, yR + 15, { lineBreak: false });
    cx += (W - MARG * 2) / 3;
  }
  doc.rect(0, yR + 28, W, 1).fill(CORES.cinzaLinha);
  return yR + 28 + 12;
}

function rodape(doc: PDFKit.PDFDocument, etiqueta: string) {
  const yF = H - 38;
  doc.rect(0, yF, W, 38).fill(CORES.navyProfundo);
  doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.dourado)
    .text("INSTITUTO PÁDUA", MARG, yF + 8, { width: 300, characterSpacing: 0.6, lineBreak: false });
  doc.fontSize(7.5).font("Helvetica-Oblique").fillColor(CORES.creme)
    .text("Medicina Integrativa de Precisão · Restaura função, não remedia sintoma",
      MARG, yF + 22, { width: 380, lineBreak: false });
  doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.dourado)
    .text("PAWARDS®", W - MARG - 200, yF + 8, { width: 200, align: "right", lineBreak: false });
  doc.fontSize(7.5).font("Helvetica").fillColor(CORES.creme)
    .text("PADCON® · Plataforma Clínica Integrativa",
      W - MARG - 200, yF + 22, { width: 200, align: "right", lineBreak: false });
  doc.fontSize(6).font("Helvetica-Bold").fillColor(CORES.douradoQueim)
    .text(etiqueta.toUpperCase(), MARG, yF - 8, { characterSpacing: 0.8, lineBreak: false });
}

// ============================================================================
// V4 — HIBRIDO ORTODOXO (creme + serif Times no corpo + borda dourada simples)
// ============================================================================
function v4Ortodoxo(doc: PDFKit.PDFDocument) {
  doc.rect(0, 0, W, H).fill(CORES.creme);
  let y = cabecalhoV1(doc, 64);

  const CW = W - MARG * 2;

  const cardSerif = (n: string, titulo: string, alturaConteudo: number,
    render: (yi: number) => void) => {
    const altura = alturaConteudo + 36;
    // borda dourada simples
    doc.rect(MARG, y, CW, altura).fillAndStroke(CORES.cremeClaro, CORES.dourado);
    doc.lineWidth(0.6);
    // titulo serif
    doc.fontSize(11).font("Times-Italic").fillColor(CORES.douradoQueim)
      .text(n, MARG + 14, y + 12, { lineBreak: false });
    doc.fontSize(13).font("Times-Bold").fillColor(CORES.navyProfundo)
      .text(titulo, MARG + 40, y + 11, { width: CW - 50, lineBreak: false });
    doc.rect(MARG + 40, y + 30, CW - 50, 0.4).fill(CORES.dourado);
    render(y + 40);
    y += altura + 10;
  };

  const bulletsSerif = (itens: string[]) => {
    let altura = 0;
    doc.fontSize(10).font("Times-Roman");
    for (const it of itens) altura += doc.heightOfString(it, { width: CW - 60, lineGap: 2 }) + 5;
    return { altura, render: (yi: number) => {
      let yy = yi;
      for (const it of itens) {
        doc.fontSize(10).font("Times-Bold").fillColor(CORES.douradoQueim)
          .text("—", MARG + 18, yy, { lineBreak: false });
        doc.fontSize(10).font("Times-Roman").fillColor(CORES.cinzaTexto)
          .text(it, MARG + 40, yy - 1, { width: CW - 60, lineGap: 2 });
        yy += doc.heightOfString(it, { width: CW - 60, lineGap: 2 }) + 5;
      }
    } };
  };

  let bp = bulletsSerif(NAD.porque);
  cardSerif("I", "Por que esta substância", bp.altura, bp.render);
  bp = bulletsSerif(NAD.comoAtua);
  cardSerif("II", "Como atua no organismo", bp.altura, bp.render);

  // Card matriz impactos — linha-a-linha serif
  const altMat = NAD.impactos.length * 18 + 4;
  cardSerif("III", "Impacto esperado por sistema", altMat, (yi) => {
    let yy = yi;
    for (const imp of NAD.impactos) {
      doc.fontSize(10).font("Times-Bold").fillColor(CORES.navyProfundo)
        .text(imp.sistema, MARG + 18, yy + 3, { width: 150, lineBreak: false });
      estrelas(doc, MARG + 175, yy + 2, imp.n, 11, 1);
      doc.fontSize(9).font("Times-Italic").fillColor(CORES.cinzaClaro)
        .text(imp.obs, MARG + 250, yy + 3, { width: CW - 260, lineBreak: false });
      yy += 18;
    }
  });

  rodape(doc, "Variante 4 — Híbrido Ortodoxo (creme + serif + borda dourada)");
}

// ============================================================================
// V5 — HIBRIDO REFINADO (titulo serif + corpo sans + borda dupla)
// ============================================================================
function v5Refinado(doc: PDFKit.PDFDocument) {
  doc.rect(0, 0, W, H).fill(CORES.cremeClaro);
  let y = cabecalhoV1(doc, 58);

  const CW = W - MARG * 2;

  const cardBordaDupla = (n: string, titulo: string, alturaConteudo: number,
    render: (yi: number) => void) => {
    const altura = alturaConteudo + 40;
    // filete superior grosso dourado
    doc.rect(MARG, y, CW, 3).fill(CORES.dourado);
    // corpo do card com borda fina cinza
    doc.rect(MARG, y + 3, CW, altura - 3).fillAndStroke("#FFFFFF", CORES.cinzaLinha);
    doc.lineWidth(0.4);
    // numero romano serif italic dourado
    doc.fontSize(14).font("Times-Italic").fillColor(CORES.douradoQueim)
      .text(n, MARG + 16, y + 14, { lineBreak: false });
    // titulo serif bold navy
    doc.fontSize(13).font("Times-Bold").fillColor(CORES.navyProfundo)
      .text(titulo, MARG + 44, y + 14, { width: CW - 54, lineBreak: false });
    // filete sob titulo
    doc.rect(MARG + 44, y + 33, 40, 0.8).fill(CORES.dourado);
    render(y + 44);
    y += altura + 10;
  };

  const bulletsSans = (itens: string[]) => {
    let altura = 0;
    doc.fontSize(9).font("Helvetica");
    for (const it of itens) altura += doc.heightOfString(it, { width: CW - 60, lineGap: 2 }) + 4;
    return { altura, render: (yi: number) => {
      let yy = yi;
      for (const it of itens) {
        doc.fontSize(10).font("Helvetica-Bold").fillColor(CORES.douradoQueim)
          .text("◆", MARG + 20, yy + 1, { lineBreak: false });
        doc.fontSize(9).font("Helvetica").fillColor(CORES.cinzaTexto)
          .text(it, MARG + 40, yy, { width: CW - 60, lineGap: 2 });
        yy += doc.heightOfString(it, { width: CW - 60, lineGap: 2 }) + 4;
      }
    } };
  };

  let bp = bulletsSans(NAD.porque);
  cardBordaDupla("I", "Por que esta substância", bp.altura, bp.render);
  bp = bulletsSans(NAD.comoAtua);
  cardBordaDupla("II", "Como atua no organismo", bp.altura, bp.render);

  // Matriz impactos com header tabela elegante
  const altMat = 16 + NAD.impactos.length * 18;
  cardBordaDupla("III", "Impacto esperado por sistema", altMat, (yi) => {
    doc.rect(MARG + 16, yi, CW - 32, 14).fill(CORES.creme);
    doc.fontSize(6.5).font("Helvetica-Bold").fillColor(CORES.cinzaClaro)
      .text("SISTEMA", MARG + 22, yi + 4, { characterSpacing: 1, lineBreak: false });
    doc.text("IMPACTO", MARG + 180, yi + 4, { characterSpacing: 1, lineBreak: false });
    doc.text("OBSERVAÇÃO", MARG + 260, yi + 4, { characterSpacing: 1, lineBreak: false });
    let yy = yi + 16;
    for (const imp of NAD.impactos) {
      doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
        .text(imp.sistema, MARG + 22, yy + 3, { width: 150, lineBreak: false });
      estrelas(doc, MARG + 180, yy + 2, imp.n, 11, 1);
      doc.fontSize(8.5).font("Helvetica").fillColor(CORES.cinzaTexto)
        .text(imp.obs, MARG + 260, yy + 3, { width: CW - 280, lineBreak: false });
      doc.rect(MARG + 16, yy + 17, CW - 32, 0.3).fill(CORES.cinzaLinha);
      yy += 18;
    }
  });

  rodape(doc, "Variante 5 — Híbrido Refinado (serif título + sans corpo + borda dupla)");
}

// ============================================================================
// V6 — HIBRIDO LUXUOSO (cantos em L estilo certificado + serif total)
// ============================================================================
function v6Luxuoso(doc: PDFKit.PDFDocument) {
  doc.rect(0, 0, W, H).fill(CORES.creme);
  let y = cabecalhoV1(doc, 64);

  const CW = W - MARG * 2;

  // Cantos em L estilo certificado
  const cantosL = (x: number, yy: number, w: number, h: number, cor: string, tam = 14, esp = 1.4) => {
    doc.lineWidth(esp);
    // sup esq
    doc.moveTo(x, yy + tam).lineTo(x, yy).lineTo(x + tam, yy).strokeColor(cor).stroke();
    // sup dir
    doc.moveTo(x + w - tam, yy).lineTo(x + w, yy).lineTo(x + w, yy + tam).stroke();
    // inf esq
    doc.moveTo(x, yy + h - tam).lineTo(x, yy + h).lineTo(x + tam, yy + h).stroke();
    // inf dir
    doc.moveTo(x + w - tam, yy + h).lineTo(x + w, yy + h).lineTo(x + w, yy + h - tam).stroke();
  };

  const cardLuxo = (n: string, titulo: string, alturaConteudo: number,
    render: (yi: number) => void) => {
    const altura = alturaConteudo + 44;
    // fundo creme claro suave
    doc.rect(MARG, y, CW, altura).fill(CORES.cremeClaro);
    // cantos em L dourados
    cantosL(MARG, y, CW, altura, CORES.dourado, 16, 1.6);
    // titulo: numero romano grande serif italic + titulo serif bold
    doc.fontSize(20).font("Times-Italic").fillColor(CORES.douradoQueim)
      .text(n, MARG + 20, y + 14, { lineBreak: false });
    doc.fontSize(14).font("Times-Bold").fillColor(CORES.navyProfundo)
      .text(titulo, MARG + 56, y + 18, { width: CW - 66, lineBreak: false });
    // filete duplo sob titulo
    doc.rect(MARG + 56, y + 38, CW - 72, 0.8).fill(CORES.dourado);
    doc.rect(MARG + 56, y + 40, CW - 72, 0.3).fill(CORES.dourado);
    render(y + 48);
    y += altura + 10;
  };

  const bulletsLuxo = (itens: string[]) => {
    let altura = 0;
    doc.fontSize(10).font("Times-Roman");
    for (const it of itens) altura += doc.heightOfString(it, { width: CW - 70, lineGap: 2.5 }) + 5;
    return { altura, render: (yi: number) => {
      let yy = yi;
      for (const it of itens) {
        doc.fontSize(11).font("Times-Bold").fillColor(CORES.douradoQueim)
          .text("◇", MARG + 22, yy, { lineBreak: false });
        doc.fontSize(10).font("Times-Roman").fillColor(CORES.cinzaTexto)
          .text(it, MARG + 44, yy - 1, { width: CW - 70, lineGap: 2.5 });
        yy += doc.heightOfString(it, { width: CW - 70, lineGap: 2.5 }) + 5;
      }
    } };
  };

  let bp = bulletsLuxo(NAD.porque);
  cardLuxo("I", "Por que esta substância", bp.altura, bp.render);
  bp = bulletsLuxo(NAD.comoAtua);
  cardLuxo("II", "Como atua no organismo", bp.altura, bp.render);

  // Matriz impactos estilo certificado
  const altMat = NAD.impactos.length * 19;
  cardLuxo("III", "Impacto esperado por sistema", altMat, (yi) => {
    let yy = yi;
    for (const imp of NAD.impactos) {
      doc.fontSize(10).font("Times-Bold").fillColor(CORES.navyProfundo)
        .text(imp.sistema, MARG + 22, yy + 3, { width: 160, lineBreak: false });
      estrelas(doc, MARG + 190, yy + 2, imp.n, 12, 2);
      doc.fontSize(9).font("Times-Italic").fillColor(CORES.cinzaClaro)
        .text(imp.obs, MARG + 280, yy + 4, { width: CW - 290, lineBreak: false });
      yy += 19;
    }
  });

  rodape(doc, "Variante 6 — Híbrido Luxuoso (cantos em L estilo certificado + serif total)");
}

// ============================================================================
const out = "scripts/.local/samples/mockup-3-hibridos-validacao.pdf";
mkdirSync(dirname(out), { recursive: true });
const doc = new PDFDocument({ size: "A4", margins: { top: 0, left: 0, right: 0, bottom: 0 } });
doc.pipe(createWriteStream(out));

const pg = { size: "A4" as const, margins: { top: 0, left: 0, right: 0, bottom: 0 } };
v4Ortodoxo(doc);
doc.addPage(pg);
v5Refinado(doc);
doc.addPage(pg);
v6Luxuoso(doc);

doc.end();
doc.on("end", () => console.log("OK ->", out));
