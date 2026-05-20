// 3 abordagens visuais alternativas da mesma "pagina de substancia"
// Mesmo conteudo (NAD+ Apresentacao D0 parte 1, tudo em topicos, com estrelas).
// Caio escolhe a estetica antes de propagar pras outras substancias.
//
// V1 — DENSIDADE NAVY (atual, base aprovada): header navy cheio, selos quadrados,
//      blocos numerados em sequencia vertical, matriz com estrelas em tabela zebra.
//
// V2 — COLUNA LATERAL PREMIUM: barra navy esquerda fina com numeracao vertical,
//      conteudo em "cards" brancos com sombra sutil, estrelas em fileira horizontal
//      com observacao do lado, sensacao mais "clinica premium / boutique".
//
// V3 — EDITORIAL MAGAZINE: fundo creme cheio, serif Times grande, blocos com filete
//      dourado fino (sem caixas), estrelas em "rating cards" centralizados estilo
//      revista. Sensacao elegante, menos tecnica, mais "documento autoral".
//
// Saida: scripts/.local/samples/mockup-3-abordagens-validacao.pdf

import PDFDocument from "pdfkit";
import { createWriteStream, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const CORES = {
  navyProfundo: "#0F2940",
  navyMedio: "#1F3A5F",
  navyClaro: "#2C4D7A",
  offWhite: "#F7F6F2",
  creme: "#F2EEDF",
  cremeClaro: "#FAF7EC",
  dourado: "#C7A646",
  douradoQueim: "#C8951A",
  verdeSalvia: "#9DB8A5",
  verdeBeneficio: "#3E8B5B",
  verdeBgClaro: "#E8F1EA",
  cinzaTexto: "#1A1A1A",
  cinzaClaro: "#666666",
  cinzaLinha: "#D6D2C4",
  cinzaBgZebra: "#EDE9DC",
  cinzaSombra: "#0000001A",
};

const W = 595;
const H = 842;
const MARG = 42;

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
  evidencia: [
    "Trammell (2016) · Martens (2018) · Yoshino (2018) · Yaku (2021).",
    "Aumento sustentado de NAD intracelular após reposição EV.",
    "Melhora de marcadores mitocondriais e redução de senescência.",
    "Perfil de segurança excelente em doses ≤1000 mg/sessão.",
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

function estrelas(doc: PDFKit.PDFDocument, x: number, y: number, n: number, size = 10, gap = 1) {
  for (let i = 0; i < 5; i++) {
    doc.fontSize(size).font("Helvetica-Bold")
      .fillColor(i < n ? CORES.douradoQueim : CORES.cinzaLinha)
      .text("★", x + i * (size + gap), y, { lineBreak: false });
  }
}

function rodape(doc: PDFKit.PDFDocument, etiquetaVariante: string) {
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
  // Etiqueta da variante (canto sup esq do rodape)
  doc.fontSize(6).font("Helvetica-Bold").fillColor(CORES.douradoQueim)
    .text(etiquetaVariante.toUpperCase(), MARG, yF - 8, { characterSpacing: 0.8, lineBreak: false });
}

// ============================================================================
// V1 — DENSIDADE NAVY (atual aprovado-base)
// ============================================================================
function v1DensidadeNavy(doc: PDFKit.PDFDocument) {
  doc.rect(0, 0, W, H).fill(CORES.offWhite);

  // Header navy cheio
  doc.rect(0, 0, W, 64).fill(CORES.navyProfundo);
  doc.rect(0, 64, W, 2).fill(CORES.dourado);
  doc.rect(MARG, 14, 38, 38).fill(CORES.dourado);
  doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
    .text("RXS", MARG, 20, { width: 38, align: "center", lineBreak: false });
  doc.fontSize(11).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
    .text(NAD.codigo, MARG, 32, { width: 38, align: "center", lineBreak: false });
  doc.fontSize(17).font("Helvetica-Bold").fillColor(CORES.creme)
    .text(NAD.nome, MARG + 50, 16, { width: 320, lineBreak: false });
  doc.fontSize(8.5).font("Helvetica-Oblique").fillColor(CORES.dourado)
    .text(NAD.categoria, MARG + 50, 38, { width: 380, lineBreak: false });
  doc.rect(W - MARG - 130, 14, 130, 18).fill(CORES.verdeSalvia);
  doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
    .text("APRESENTAÇÃO · D0", W - MARG - 130, 19,
      { width: 130, align: "center", characterSpacing: 1, lineBreak: false });

  // Ribbon metadados
  doc.rect(0, 66, W, 28).fill(CORES.creme);
  const metas = [
    ["VIA", NAD.via],
    ["DOSE", NAD.dose],
    ["FREQUÊNCIA", NAD.freq],
  ];
  let cx = MARG;
  for (const [l, v] of metas) {
    doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.cinzaClaro)
      .text(l, cx, 73, { characterSpacing: 0.8, lineBreak: false });
    doc.fontSize(9.5).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
      .text(v, cx, 82, { lineBreak: false });
    cx += (W - MARG * 2) / 3;
  }
  doc.rect(0, 95, W, 1).fill(CORES.cinzaLinha);

  let y = 108;
  const blocoVal = (n: number, t: string, yIn: number) => {
    doc.rect(MARG, yIn, 22, 22).fill(CORES.dourado);
    doc.fontSize(13).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
      .text(String(n).padStart(2, "0"), MARG, yIn + 5, { width: 22, align: "center", lineBreak: false });
    doc.fontSize(11).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
      .text(t.toUpperCase(), MARG + 32, yIn + 7, { characterSpacing: 0.6, lineBreak: false });
    doc.rect(MARG + 32, yIn + 21, W - MARG * 2 - 32, 0.8).fill(CORES.dourado);
    return yIn + 30;
  };
  const bulletsVal = (itens: string[], yIn: number) => {
    let yy = yIn;
    for (const it of itens) {
      doc.fontSize(10).font("Helvetica-Bold").fillColor(CORES.douradoQueim)
        .text("◆", MARG + 36, yy + 1, { lineBreak: false });
      doc.fontSize(9).font("Helvetica").fillColor(CORES.cinzaTexto)
        .text(it, MARG + 50, yy, { width: W - MARG * 2 - 50, lineGap: 2 });
      yy += doc.heightOfString(it, { width: W - MARG * 2 - 50, lineGap: 2 }) + 4;
    }
    return yy + 6;
  };

  y = blocoVal(1, "Por que esta substância", y);
  y = bulletsVal(NAD.porque, y);
  y = blocoVal(2, "Como atua no organismo", y);
  y = bulletsVal(NAD.comoAtua, y);
  y = blocoVal(3, "Impacto esperado por sistema", y);
  // matriz tabela
  const cxSis = MARG + 36, cxEst = MARG + 200, cxObs = MARG + 295;
  doc.rect(cxSis, y, W - MARG * 2 - 36, 14).fill(CORES.navyMedio);
  doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.creme)
    .text("SISTEMA", cxSis + 4, y + 4, { lineBreak: false });
  doc.text("IMPACTO", cxEst, y + 4, { lineBreak: false });
  doc.text("OBSERVAÇÃO", cxObs, y + 4, { lineBreak: false });
  y += 14;
  let zb = false;
  for (const imp of NAD.impactos) {
    if (zb) doc.rect(cxSis, y, W - MARG * 2 - 36, 16).fill(CORES.cinzaBgZebra);
    zb = !zb;
    doc.fontSize(8.5).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
      .text(imp.sistema, cxSis + 4, y + 4, { width: cxEst - cxSis - 6, lineBreak: false });
    estrelas(doc, cxEst, y + 3, imp.n, 10);
    doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto)
      .text(imp.obs, cxObs, y + 4, { width: W - MARG - cxObs - 6, lineBreak: false });
    y += 16;
  }

  rodape(doc, "Variante 1 — Densidade Navy (atual)");
}

// ============================================================================
// V2 — COLUNA LATERAL PREMIUM (cards brancos com sombra)
// ============================================================================
function v2ColunaLateralPremium(doc: PDFKit.PDFDocument) {
  doc.rect(0, 0, W, H).fill(CORES.cremeClaro);

  // Coluna lateral navy estreita (esquerda)
  const SIDE = 60;
  doc.rect(0, 0, SIDE, H).fill(CORES.navyProfundo);

  // Identidade vertical na coluna lateral
  doc.save();
  doc.rotate(-90, { origin: [SIDE / 2, 200] });
  doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.dourado)
    .text("INSTITUTO PÁDUA · MEDICINA INTEGRATIVA", SIDE / 2 - 180, 197,
      { width: 360, align: "center", characterSpacing: 2, lineBreak: false });
  doc.restore();

  // Selo dourado redondo no topo da coluna
  doc.circle(SIDE / 2, 40, 18).fill(CORES.dourado);
  doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
    .text("RXS", SIDE / 2 - 12, 31, { width: 24, align: "center", lineBreak: false });
  doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
    .text(NAD.codigo, SIDE / 2 - 14, 41, { width: 28, align: "center", lineBreak: false });

  // Header principal (area de conteudo)
  const CX = SIDE + 16, CW = W - CX - MARG;
  doc.fontSize(20).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
    .text(NAD.nome, CX, 30, { width: CW, lineBreak: false });
  doc.fontSize(8.5).font("Helvetica-Oblique").fillColor(CORES.douradoQueim)
    .text(NAD.categoria, CX, 54, { width: CW, lineBreak: false });

  // Etiqueta modo
  doc.rect(CX, 72, 110, 16).fill(CORES.verdeSalvia);
  doc.fontSize(7.5).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
    .text("APRESENTAÇÃO · D0", CX, 76,
      { width: 110, align: "center", characterSpacing: 1, lineBreak: false });
  // Metadados a direita
  doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.cinzaClaro)
    .text("VIA · DOSE · FREQUÊNCIA", CX + 130, 72,
      { characterSpacing: 0.6, lineBreak: false });
  doc.fontSize(8.5).font("Helvetica").fillColor(CORES.navyProfundo)
    .text(`${NAD.via}  ·  ${NAD.dose}  ·  ${NAD.freq}`, CX + 130, 82,
      { width: CW - 130, lineBreak: false });

  // Filete dourado divisor
  doc.rect(CX, 100, CW, 1.5).fill(CORES.dourado);

  let y = 116;

  // Card branco com sombra
  const card = (titulo: string, n: number, altura: number, render: (yi: number) => void) => {
    // sombra
    doc.rect(CX + 2, y + 2, CW, altura).fill(CORES.cinzaSombra);
    // card
    doc.rect(CX, y, CW, altura).fill("#FFFFFF");
    // filete lateral dourado
    doc.rect(CX, y, 3, altura).fill(CORES.dourado);
    // numero grande
    doc.fontSize(26).font("Helvetica-Bold").fillColor(CORES.cinzaLinha)
      .text(String(n).padStart(2, "0"), CX + 12, y + 8, { lineBreak: false });
    // titulo
    doc.fontSize(11).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
      .text(titulo.toUpperCase(), CX + 56, y + 14, { characterSpacing: 0.6, lineBreak: false });
    doc.rect(CX + 56, y + 30, CW - 70, 0.6).fill(CORES.cinzaLinha);
    render(y + 38);
    y += altura + 10;
  };

  const cardBullets = (titulo: string, n: number, itens: string[]) => {
    let altura = 38 + 14;
    for (const it of itens) altura += doc.fontSize(9).font("Helvetica").heightOfString(it, { width: CW - 70, lineGap: 2 }) + 4;
    card(titulo, n, altura, (yi) => {
      let yy = yi;
      for (const it of itens) {
        doc.fontSize(10).font("Helvetica-Bold").fillColor(CORES.douradoQueim)
          .text("◆", CX + 56, yy + 1, { lineBreak: false });
        doc.fontSize(9).font("Helvetica").fillColor(CORES.cinzaTexto)
          .text(it, CX + 70, yy, { width: CW - 84, lineGap: 2 });
        yy += doc.heightOfString(it, { width: CW - 84, lineGap: 2 }) + 4;
      }
    });
  };

  cardBullets("Por que esta substância", 1, NAD.porque);
  cardBullets("Como atua no organismo", 2, NAD.comoAtua);

  // Card matriz estrelas — sem cabecalho tabela, linha a linha
  const alturaMat = 38 + 14 + NAD.impactos.length * 18;
  card("Impacto esperado por sistema", 3, alturaMat, (yi) => {
    let yy = yi;
    for (const imp of NAD.impactos) {
      doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
        .text(imp.sistema, CX + 56, yy + 3, { width: 140, lineBreak: false });
      estrelas(doc, CX + 200, yy + 2, imp.n, 11, 2);
      doc.fontSize(8).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro)
        .text(imp.obs, CX + 290, yy + 3, { width: CW - 300, lineBreak: false });
      yy += 18;
    }
  });

  rodape(doc, "Variante 2 — Coluna Lateral Premium");
}

// ============================================================================
// V3 — EDITORIAL MAGAZINE (serif, filetes, sem caixas)
// ============================================================================
function v3EditorialMagazine(doc: PDFKit.PDFDocument) {
  doc.rect(0, 0, W, H).fill(CORES.creme);

  // Filete dourado triplo no topo (estilo editorial)
  doc.rect(MARG, 32, W - MARG * 2, 1.2).fill(CORES.dourado);
  doc.rect(MARG, 36, W - MARG * 2, 0.4).fill(CORES.dourado);

  // Eyebrow + categoria
  doc.fontSize(7.5).font("Helvetica-Bold").fillColor(CORES.douradoQueim)
    .text("INSTITUTO PÁDUA · CADERNO DE SUBSTÂNCIAS · APRESENTAÇÃO D0",
      MARG, 44, { characterSpacing: 1.8, lineBreak: false });

  // Titulo serif grande
  doc.fontSize(28).font("Times-Bold").fillColor(CORES.navyProfundo)
    .text(NAD.nome, MARG, 62, { width: W - MARG * 2, lineBreak: false });
  // Sub-titulo serif italic
  doc.fontSize(11).font("Times-Italic").fillColor(CORES.cinzaTexto)
    .text(NAD.categoria, MARG, 98, { width: W - MARG * 2 - 100, lineBreak: false });

  // Metadados (chips minimalistas direita)
  const chip = (l: string, v: string, x: number, y: number) => {
    doc.fontSize(6.5).font("Helvetica-Bold").fillColor(CORES.cinzaClaro)
      .text(l.toUpperCase(), x, y, { characterSpacing: 1.2, lineBreak: false });
    doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
      .text(v, x, y + 9, { width: 130, lineBreak: false });
  };
  chip("Via", NAD.via, W - MARG - 140, 64);
  chip("Dose", NAD.dose, W - MARG - 140, 82);
  chip("Frequência", NAD.freq, W - MARG - 140, 100);

  // Filete divisor
  doc.rect(MARG, 128, W - MARG * 2, 0.4).fill(CORES.cinzaLinha);

  let y = 144;

  const tituloEditorial = (n: string, t: string, yIn: number) => {
    // Numero romano dourado serif + titulo serif
    doc.fontSize(11).font("Times-Italic").fillColor(CORES.douradoQueim)
      .text(n, MARG, yIn + 2, { lineBreak: false });
    doc.fontSize(14).font("Times-Bold").fillColor(CORES.navyProfundo)
      .text(t, MARG + 30, yIn, { width: W - MARG * 2 - 30, lineBreak: false });
    doc.rect(MARG, yIn + 22, W - MARG * 2, 0.4).fill(CORES.dourado);
    return yIn + 32;
  };
  const bulletsEditorial = (itens: string[], yIn: number) => {
    let yy = yIn;
    for (const it of itens) {
      doc.fontSize(8.5).font("Times-Bold").fillColor(CORES.douradoQueim)
        .text("—", MARG, yy, { lineBreak: false });
      doc.fontSize(10).font("Times-Roman").fillColor(CORES.cinzaTexto)
        .text(it, MARG + 14, yy - 1, { width: W - MARG * 2 - 14, lineGap: 2 });
      yy += doc.heightOfString(it, { width: W - MARG * 2 - 14, lineGap: 2 }) + 4;
    }
    return yy + 8;
  };

  y = tituloEditorial("I", "Por que esta substância", y);
  y = bulletsEditorial(NAD.porque, y);
  y = tituloEditorial("II", "Como atua no organismo", y);
  y = bulletsEditorial(NAD.comoAtua, y);
  y = tituloEditorial("III", "Impacto esperado por sistema", y);

  // Rating cards em 2 colunas (4+4)
  const linha = (imp: { sistema: string; n: number; obs: string }, x: number, yy: number) => {
    doc.fontSize(10).font("Times-Bold").fillColor(CORES.navyProfundo)
      .text(imp.sistema, x, yy, { width: 140, lineBreak: false });
    estrelas(doc, x + 145, yy, imp.n, 11, 1);
    doc.fontSize(8).font("Times-Italic").fillColor(CORES.cinzaClaro)
      .text(imp.obs, x, yy + 12, { width: 220, lineBreak: false });
  };
  const colW2 = (W - MARG * 2) / 2;
  const yStart = y;
  for (let i = 0; i < NAD.impactos.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = MARG + col * colW2;
    const yy = yStart + row * 32;
    linha(NAD.impactos[i], x, yy);
  }

  rodape(doc, "Variante 3 — Editorial Magazine (serif)");
}

// ============================================================================
// MAIN
// ============================================================================
const out = "scripts/.local/samples/mockup-3-abordagens-validacao.pdf";
mkdirSync(dirname(out), { recursive: true });
const doc = new PDFDocument({ size: "A4", margins: { top: 0, left: 0, right: 0, bottom: 0 } });
doc.pipe(createWriteStream(out));

const pg = { size: "A4" as const, margins: { top: 0, left: 0, right: 0, bottom: 0 } };
v1DensidadeNavy(doc);
doc.addPage(pg);
v2ColunaLateralPremium(doc);
doc.addPage(pg);
v3EditorialMagazine(doc);

doc.end();
doc.on("end", () => console.log("OK ->", out));
