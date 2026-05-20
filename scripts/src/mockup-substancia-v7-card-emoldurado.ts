// V7 — REFINAMENTO V1 com card emoldurado completo
//
// Base: Variante 1 "Densidade Navy" (que o Caio aprovou).
// Refinamentos pedidos:
//   1. Card inteiro com borda dourada completa (titulo + corpo na mesma moldura)
//   2. Titulo em tira navy no topo do card + corpo em creme abaixo, separados por filete
//   3. Numerais comuns 1, 2, 3 (nao 01, 02, 03)
//   4. ZERO caracteres unicode (★ ◆ ◇) — TUDO vetorial pra nao virar "&" em leitor
//
// 2 versoes lado a lado:
//   V7a — SEM degrade (header navy solido + filete dourado + corpo creme solido)
//   V7b — COM degrade suave (header navy → corpo creme via gradient)
//
// Saida: scripts/.local/samples/mockup-v7-card-emoldurado.pdf

import PDFDocument from "pdfkit";
import { createWriteStream, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const CORES = {
  navyProfundo: "#0F2940",
  navyMedio: "#1F3A5F",
  creme: "#F2EEDF",
  cremeClaro: "#FAF7EC",
  dourado: "#C7A646",
  douradoQueim: "#C8951A",
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
// HELPERS VETORIAIS (zero unicode — funciona em qualquer leitor de PDF)
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

function losangoVetor(doc: PDFKit.PDFDocument, cx: number, cy: number,
  tam: number, cor: string) {
  doc.save();
  doc.moveTo(cx, cy - tam)
    .lineTo(cx + tam, cy)
    .lineTo(cx, cy + tam)
    .lineTo(cx - tam, cy)
    .closePath().fill(cor);
  doc.restore();
}

// =========================================================================
// HEADER NAVY V1 (reaproveitado, sem unicode)
// =========================================================================
function cabecalhoV1(doc: PDFKit.PDFDocument) {
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
  return 108;
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
// CARD EMOLDURADO — variante com flag "degrade" liga/desliga
// =========================================================================
type RenderFn = (xi: number, yi: number, wi: number) => void;

function cardEmoldurado(
  doc: PDFKit.PDFDocument,
  y: number,
  numero: number,
  titulo: string,
  alturaConteudo: number,
  comDegrade: boolean,
  render: RenderFn,
): number {
  const CW = W - MARG * 2;
  const headerH = 28;
  const alturaTotal = headerH + alturaConteudo + 16;

  // --- borda externa dourada (envolve titulo + conteudo)
  doc.rect(MARG, y, CW, alturaTotal).strokeColor(CORES.dourado).lineWidth(1).stroke();

  // --- TIRA DO TITULO (em cima) — navy solido OU degrade
  if (comDegrade) {
    const grad = doc.linearGradient(MARG, y, MARG, y + headerH + 8);
    grad.stop(0, CORES.navyProfundo).stop(1, CORES.cremeClaro);
    doc.rect(MARG + 0.5, y + 0.5, CW - 1, headerH).fill(grad);
  } else {
    doc.rect(MARG + 0.5, y + 0.5, CW - 1, headerH).fill(CORES.navyProfundo);
  }

  // --- FILETE DOURADO entre titulo e corpo
  doc.rect(MARG + 0.5, y + headerH, CW - 1, 1).fill(CORES.dourado);

  // --- CORPO (creme solido OU continuacao do degrade)
  if (comDegrade) {
    const grad2 = doc.linearGradient(MARG, y + headerH, MARG, y + alturaTotal);
    grad2.stop(0, CORES.cremeClaro).stop(1, CORES.creme);
    doc.rect(MARG + 0.5, y + headerH + 1, CW - 1, alturaTotal - headerH - 1.5).fill(grad2);
  } else {
    doc.rect(MARG + 0.5, y + headerH + 1, CW - 1, alturaTotal - headerH - 1.5).fill(CORES.cremeClaro);
  }

  // --- NUMERAL COMUM (1, 2, 3) em quadradinho dourado dentro do header
  doc.rect(MARG + 10, y + 5, 18, 18).fill(CORES.dourado);
  doc.fontSize(12).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
    .text(String(numero), MARG + 10, y + 9, { width: 18, align: "center", lineBreak: false });

  // --- TITULO em creme sobre tira navy
  doc.fontSize(11).font("Helvetica-Bold").fillColor(CORES.creme)
    .text(titulo.toUpperCase(), MARG + 38, y + 9,
      { width: CW - 50, characterSpacing: 0.8, lineBreak: false });

  // --- conteudo
  render(MARG + 14, y + headerH + 10, CW - 28);

  return y + alturaTotal + 10;
}

// =========================================================================
// PAGINA — uma versao (comDegrade liga ou desliga)
// =========================================================================
function paginaV7(doc: PDFKit.PDFDocument, comDegrade: boolean) {
  doc.rect(0, 0, W, H).fill("#F7F6F2");
  let y = cabecalhoV1(doc);

  // ---- helpers de conteudo (bullets vetoriais — sem unicode!)
  const bulletsConteudo = (itens: string[]) => {
    let altura = 0;
    doc.fontSize(9).font("Helvetica");
    const wTxt = W - MARG * 2 - 56;
    for (const it of itens) altura += doc.heightOfString(it, { width: wTxt, lineGap: 2 }) + 6;
    return { altura, render: (xi: number, yi: number, _wi: number) => {
      let yy = yi;
      const wT = W - MARG * 2 - 56;
      for (const it of itens) {
        losangoVetor(doc, xi + 14, yy + 6, 3.5, CORES.douradoQueim);
        doc.fontSize(9).font("Helvetica").fillColor(CORES.cinzaTexto)
          .text(it, xi + 28, yy, { width: wT, lineGap: 2 });
        yy += doc.heightOfString(it, { width: wT, lineGap: 2 }) + 6;
      }
    } };
  };

  // BLOCO 1
  let bp = bulletsConteudo(NAD.porque);
  y = cardEmoldurado(doc, y, 1, "Por que esta substância", bp.altura, comDegrade, bp.render);

  // BLOCO 2
  bp = bulletsConteudo(NAD.comoAtua);
  y = cardEmoldurado(doc, y, 2, "Como atua no organismo", bp.altura, comDegrade, bp.render);

  // BLOCO 3 — matriz impactos com cabecalho tabela
  const altMat = 16 + NAD.impactos.length * 16 + 4;
  y = cardEmoldurado(doc, y, 3, "Impacto esperado por sistema", altMat, comDegrade,
    (xi, yi, wi) => {
      // mini-cabecalho tabela
      doc.rect(xi, yi, wi, 14).fill(CORES.navyMedio);
      doc.fontSize(6.8).font("Helvetica-Bold").fillColor(CORES.creme)
        .text("SISTEMA", xi + 6, yi + 4, { characterSpacing: 1, lineBreak: false });
      doc.text("IMPACTO", xi + 168, yi + 4, { characterSpacing: 1, lineBreak: false });
      doc.text("OBSERVAÇÃO", xi + 262, yi + 4, { characterSpacing: 1, lineBreak: false });
      let yy = yi + 16;
      let zb = false;
      for (const imp of NAD.impactos) {
        if (zb) doc.rect(xi, yy, wi, 16).fill("#EDE9DC");
        zb = !zb;
        doc.fontSize(8.5).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
          .text(imp.sistema, xi + 6, yy + 4, { width: 158, lineBreak: false });
        // estrelas vetoriais
        fileiraEstrelas(doc, xi + 168, yy + 8, imp.n, 5, 2.5);
        doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto)
          .text(imp.obs, xi + 262, yy + 4, { width: wi - 268, lineBreak: false });
        yy += 16;
      }
    });

  rodape(doc, comDegrade
    ? "Variante 7B — Card emoldurado COM degradê navy→creme"
    : "Variante 7A — Card emoldurado SEM degradê (navy sólido + creme sólido)");
}

// =========================================================================
const out = "scripts/.local/samples/mockup-v7-card-emoldurado.pdf";
mkdirSync(dirname(out), { recursive: true });
const doc = new PDFDocument({ size: "A4", margins: { top: 0, left: 0, right: 0, bottom: 0 } });
doc.pipe(createWriteStream(out));

const pg = { size: "A4" as const, margins: { top: 0, left: 0, right: 0, bottom: 0 } };
paginaV7(doc, false);
doc.addPage(pg);
paginaV7(doc, true);

doc.end();
doc.on("end", () => console.log("OK ->", out));
