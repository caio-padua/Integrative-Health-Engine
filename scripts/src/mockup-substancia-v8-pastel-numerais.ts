// V8 — REFINAMENTO FINAL (base V7A escolhida)
//
// Mudancas pedidas pelo Caio:
//   1. Fundo da pagina em pastel azulado ameno (#EAF0F7 — mesmo da obs clinica antiga)
//   2. Fundo dos cards em tom MAIS CLARO do mesmo pastel (#F4F7FB) — degrade de saturacao,
//      nao de cor; sensacao de "mesma familia" entre pagina e cards
//   3. Bullets viraram NUMERAIS "1.", "2.", "3." em dourado-queimado (sem losangos / estrelas
//      decorativas — so estrelas onde tem semantica de "rating de impacto")
//   4. Melhor distribuicao: mais respiro entre cards, mais padding interno, lineGap maior
//
// Saida: scripts/.local/samples/mockup-v8-pastel-numerais.pdf

import PDFDocument from "pdfkit";
import { createWriteStream, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const CORES = {
  navyProfundo: "#0F2940",
  navyMedio: "#1F3A5F",
  pastelFundo: "#EAF0F7",   // fundo da pagina
  pastelCard: "#F4F7FB",    // fundo dos cards (tom mais claro/ameno)
  pastelZebra: "#E5EDF5",   // zebra da matriz
  creme: "#F2EEDF",         // mantido so no ribbon de metadados
  dourado: "#C7A646",
  douradoQueim: "#C8951A",
  verdeSalvia: "#9DB8A5",
  cinzaTexto: "#1A1A1A",
  cinzaClaro: "#5A6A7A",
  cinzaLinha: "#C5D2DF",
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
    "Cofator presente em cada uma das 37 trilhões de células do corpo.",
    "Alimenta a cadeia respiratória mitocondrial — a usina de energia celular.",
    "Ativa as sirtuínas, genes guardiões da longevidade e do reparo de DNA.",
    "Via endovenosa garante 100% de biodisponibilidade (a oral é destruída no trato digestivo).",
  ],
  impactos: [
    { sistema: "Energia Mitocondrial", n: 5, obs: "Mecanismo de ação direto" },
    { sistema: "Neurocognitivo", n: 5, obs: "Clareza, foco, memória" },
    { sistema: "Reparo Celular · DNA", n: 5, obs: "Ativa sirtuínas e PARPs" },
    { sistema: "Sono · Ritmo Circadiano", n: 4, obs: "Sono mais profundo" },
    { sistema: "Metabólico", n: 4, obs: "Sensibilidade insulínica" },
    { sistema: "Imunológico", n: 3, obs: "Modulação anti-inflamatória" },
    { sistema: "Cardiovascular", n: 3, obs: "Função endotelial, HRV" },
    { sistema: "Osteomuscular", n: 2, obs: "Recuperação pós-esforço" },
  ],
};

// =========================================================================
// ESTRELAS VETORIAIS (so na matriz de impacto — semantica de rating)
// =========================================================================
function estrelaVetor(doc: PDFKit.PDFDocument, cx: number, cy: number,
  rOut: number, rIn: number, cor: string) {
  doc.save();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rOut : rIn;
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(ang) * r;
    const y = cy + Math.sin(ang) * r;
    if (i === 0) doc.moveTo(x, y);
    else doc.lineTo(x, y);
  }
  doc.closePath().fill(cor);
  doc.restore();
}

function fileiraEstrelas(doc: PDFKit.PDFDocument, x: number, y: number,
  n: number, tam = 5, gap = 2.5) {
  for (let i = 0; i < 5; i++) {
    estrelaVetor(doc, x + i * (tam * 2 + gap), y,
      tam, tam * 0.45, i < n ? CORES.douradoQueim : CORES.cinzaLinha);
  }
}

// =========================================================================
// CABECALHO NAVY (mantido — Caio aprovou)
// =========================================================================
function cabecalho(doc: PDFKit.PDFDocument) {
  doc.rect(0, 0, W, 64).fill(CORES.navyProfundo);
  doc.rect(0, 64, W, 2).fill(CORES.dourado);
  doc.rect(MARG, 14, 38, 38).fill(CORES.dourado);
  doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
    .text("RXS", MARG, 20, { width: 38, align: "center", lineBreak: false });
  doc.fontSize(11).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
    .text(NAD.codigo, MARG, 32, { width: 38, align: "center", lineBreak: false });
  doc.fontSize(17).font("Helvetica-Bold").fillColor("#F2EEDF")
    .text(NAD.nome, MARG + 50, 16, { width: 320, lineBreak: false });
  doc.fontSize(8.5).font("Helvetica-Oblique").fillColor(CORES.dourado)
    .text(NAD.categoria, MARG + 50, 38, { width: 380, lineBreak: false });
  doc.rect(W - MARG - 130, 14, 130, 18).fill(CORES.verdeSalvia);
  doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
    .text("APRESENTAÇÃO · D0", W - MARG - 130, 19,
      { width: 130, align: "center", characterSpacing: 1, lineBreak: false });
  // Ribbon metadados em creme (mantem ancora visual)
  doc.rect(0, 66, W, 28).fill(CORES.creme);
  const metas: [string, string][] = [["VIA", NAD.via], ["DOSE", NAD.dose], ["FREQUÊNCIA", NAD.freq]];
  let cx = MARG;
  for (const [l, v] of metas) {
    doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.cinzaClaro)
      .text(l, cx, 73, { characterSpacing: 0.8, lineBreak: false });
    doc.fontSize(9.5).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
      .text(v, cx, 82, { lineBreak: false });
    cx += (W - MARG * 2) / 3;
  }
  doc.rect(0, 95, W, 1).fill(CORES.cinzaLinha);
  return 116; // mais respiro: 116 em vez de 108
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

// =========================================================================
// CARD EMOLDURADO V8 — pastel azulado + numerais nos bullets
// =========================================================================
type RenderFn = (xi: number, yi: number, wi: number) => void;

function cardEmoldurado(
  doc: PDFKit.PDFDocument,
  y: number,
  numero: number,
  titulo: string,
  alturaConteudo: number,
  render: RenderFn,
): number {
  const CW = W - MARG * 2;
  const headerH = 30;
  const padInterno = 14; // mais padding (era 10)
  const alturaTotal = headerH + alturaConteudo + padInterno * 2 - 8;

  // borda externa dourada
  doc.rect(MARG, y, CW, alturaTotal).strokeColor(CORES.dourado).lineWidth(1).stroke();
  // tira do titulo navy
  doc.rect(MARG + 0.5, y + 0.5, CW - 1, headerH).fill(CORES.navyProfundo);
  // filete dourado entre titulo e corpo
  doc.rect(MARG + 0.5, y + headerH, CW - 1, 1).fill(CORES.dourado);
  // corpo: pastel CARD (tom mais claro que o fundo da pagina)
  doc.rect(MARG + 0.5, y + headerH + 1, CW - 1, alturaTotal - headerH - 1.5).fill(CORES.pastelCard);

  // Numeral arabico em quadradinho dourado dentro do header
  doc.rect(MARG + 10, y + 6, 18, 18).fill(CORES.dourado);
  doc.fontSize(12).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
    .text(String(numero), MARG + 10, y + 10, { width: 18, align: "center", lineBreak: false });
  // Titulo em creme sobre navy
  doc.fontSize(11).font("Helvetica-Bold").fillColor("#F2EEDF")
    .text(titulo.toUpperCase(), MARG + 38, y + 10,
      { width: CW - 50, characterSpacing: 0.8, lineBreak: false });

  // conteudo
  render(MARG + padInterno, y + headerH + padInterno, CW - padInterno * 2);

  return y + alturaTotal + 14; // mais respiro entre cards (era 10)
}

// =========================================================================
// BULLETS NUMERADOS (1., 2., 3., 4.) — substitui losangos
// =========================================================================
function bulletsNumerados(itens: string[]) {
  return {
    medirAltura: (doc: PDFKit.PDFDocument, wi: number) => {
      doc.fontSize(9.5).font("Helvetica");
      const wTxt = wi - 28;
      let alt = 0;
      for (const it of itens) alt += doc.heightOfString(it, { width: wTxt, lineGap: 3 }) + 8;
      return alt;
    },
    desenhar: (doc: PDFKit.PDFDocument, xi: number, yi: number, wi: number) => {
      const wTxt = wi - 28;
      let yy = yi;
      for (let i = 0; i < itens.length; i++) {
        doc.fontSize(10).font("Helvetica-Bold").fillColor(CORES.douradoQueim)
          .text(`${i + 1}.`, xi, yy, { width: 22, lineBreak: false });
        doc.fontSize(9.5).font("Helvetica").fillColor(CORES.cinzaTexto)
          .text(itens[i], xi + 24, yy, { width: wTxt, lineGap: 3 });
        yy += doc.heightOfString(itens[i], { width: wTxt, lineGap: 3 }) + 8;
      }
    },
  };
}

// =========================================================================
// PAGINA
// =========================================================================
function paginaV8(doc: PDFKit.PDFDocument) {
  // Fundo pastel azulado (cor que Caio gostou na obs clinica antiga)
  doc.rect(0, 0, W, H).fill(CORES.pastelFundo);
  let y = cabecalho(doc);

  // BLOCO 1 — Por que esta substância
  {
    const CW = W - MARG * 2;
    const bp = bulletsNumerados(NAD.porque);
    const alt = bp.medirAltura(doc, CW - 28);
    y = cardEmoldurado(doc, y, 1, "Por que esta substância", alt, (xi, yi, wi) => {
      bp.desenhar(doc, xi, yi, wi);
    });
  }

  // BLOCO 2 — Como atua no organismo
  {
    const CW = W - MARG * 2;
    const bp = bulletsNumerados(NAD.comoAtua);
    const alt = bp.medirAltura(doc, CW - 28);
    y = cardEmoldurado(doc, y, 2, "Como atua no organismo", alt, (xi, yi, wi) => {
      bp.desenhar(doc, xi, yi, wi);
    });
  }

  // BLOCO 3 — Impacto por sistema (matriz com estrelas — UNICO local com estrela)
  {
    const altMat = 16 + NAD.impactos.length * 18;
    y = cardEmoldurado(doc, y, 3, "Impacto esperado por sistema", altMat, (xi, yi, wi) => {
      // mini-cabecalho da tabela
      doc.rect(xi, yi, wi, 14).fill(CORES.navyMedio);
      doc.fontSize(6.8).font("Helvetica-Bold").fillColor("#F2EEDF")
        .text("SISTEMA", xi + 6, yi + 4, { characterSpacing: 1, lineBreak: false });
      doc.text("IMPACTO", xi + 170, yi + 4, { characterSpacing: 1, lineBreak: false });
      doc.text("OBSERVAÇÃO", xi + 270, yi + 4, { characterSpacing: 1, lineBreak: false });
      let yy = yi + 16;
      let zb = false;
      for (const imp of NAD.impactos) {
        if (zb) doc.rect(xi, yy, wi, 18).fill(CORES.pastelZebra);
        zb = !zb;
        doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
          .text(imp.sistema, xi + 6, yy + 5, { width: 160, lineBreak: false });
        fileiraEstrelas(doc, xi + 170, yy + 9, imp.n, 5, 2.5);
        doc.fontSize(8.5).font("Helvetica").fillColor(CORES.cinzaTexto)
          .text(imp.obs, xi + 270, yy + 5, { width: wi - 276, lineBreak: false });
        yy += 18;
      }
    });
  }

  rodape(doc, "Variante 8 — pastel azulado + numerais + cards emoldurados");
}

// =========================================================================
const out = "scripts/.local/samples/mockup-v8-pastel-numerais.pdf";
mkdirSync(dirname(out), { recursive: true });
const doc = new PDFDocument({ size: "A4", margins: { top: 0, left: 0, right: 0, bottom: 0 } });
doc.pipe(createWriteStream(out));
paginaV8(doc);
doc.end();
doc.on("end", () => console.log("OK ->", out));
