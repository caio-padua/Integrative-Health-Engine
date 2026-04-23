// ════════════════════════════════════════════════════════════════════
// PARMAVAULT-TSUNAMI Wave 5 · Bloco B6 · PDF reconciliacao
// 3 paginas: capa navy/gold + resumo executivo com grafico + tabela
// detalhada por receita (LGPD iniciais).
//
// Renderizado server-side com pdfkit (ja instalado).
// Grafico de barras desenhado nativamente com primitives — evita
// chartjs-node-canvas (deps binarias pesadas).
//
// Rodape em todas as paginas: data + protocolo hash.
// Pressao moral com dados — uso na reuniao presencial com a farmacia.
// ════════════════════════════════════════════════════════════════════
import PDFDocument from "pdfkit";
import { iniciaisPaciente } from "./iniciaisLgpd.js";

const NAVY = "#020406";
const GOLD = "#C89B3C";
const RED = "#dc2626";
const GREEN = "#16a34a";
const GRAY_TXT = "#374151";
const GRAY_LT = "#9ca3af";

export type DadosPdfReconciliacao = {
  farmacia: {
    id: number;
    nome: string;
    cnpj?: string | null;
    percentual_comissao: number;
  };
  periodo: { inicio: string; fim: string };
  resumo: {
    previsto: number;
    declarado: number;
    recebido: number;
    gap: number;
    qtd_receitas: number;
  };
  /** Series mensais para o grafico de barras (max 12 pontos) */
  serie_mensal: Array<{
    mes: string;       // 'YYYY-MM'
    previsto: number;
    declarado: number;
    recebido: number;
  }>;
  receitas: Array<{
    id: number;
    numero_receita?: string | null;
    data: string;       // ISO ou pt-BR
    paciente_nome: string | null;
    valor_formula: number | null;
    comissao_devida: number | null;
    declarado: boolean;
    pago: boolean;
  }>;
  protocolo: string;
  geradoEm: Date;
  contato_dr_caio?: string;
};

function fmtBRL(v: number | null | undefined): string {
  const n = Number(v ?? 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("pt-BR");
}

function gapPct(prev: number, gap: number): number {
  if (!prev || prev <= 0) return 0;
  return (gap / prev) * 100;
}

export function gerarPdfReconciliacao(d: DadosPdfReconciliacao): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });
  const W = doc.page.width;
  const H = doc.page.height;
  const M = 40;

  // ════════ PÁGINA 1 — CAPA ════════
  doc.rect(0, 0, W, H).fill("#ffffff");

  // Faixa navy topo
  doc.rect(0, 0, W, 140).fill(NAVY);
  doc.rect(0, 136, W, 4).fill(GOLD);

  doc
    .fillColor(GOLD)
    .font("Helvetica-Bold")
    .fontSize(28)
    .text("PAWARDS MEDCORE", M, 35, { characterSpacing: 3 });

  doc
    .fillColor("#ffffff")
    .font("Helvetica")
    .fontSize(13)
    .text("Relatório de Reconciliação · PARMAVAULT", M, 75);

  doc
    .fillColor("#fde68a")
    .fontSize(10)
    .text(`Protocolo  ${d.protocolo}`, M, 105);

  // Bloco central com info principal
  const yCentro = 220;
  doc
    .fillColor(NAVY)
    .font("Helvetica-Bold")
    .fontSize(14)
    .text("FARMÁCIA AUDITADA", M, yCentro);

  doc
    .fillColor(NAVY)
    .font("Helvetica-Bold")
    .fontSize(26)
    .text(d.farmacia.nome, M, yCentro + 22);

  if (d.farmacia.cnpj) {
    doc
      .fillColor(GRAY_TXT)
      .font("Helvetica")
      .fontSize(11)
      .text(`CNPJ ${d.farmacia.cnpj}`, M, yCentro + 58);
  }

  doc
    .fillColor(GRAY_TXT)
    .font("Helvetica")
    .fontSize(11)
    .text(`% comissão vigente:  ${Number(d.farmacia.percentual_comissao).toFixed(2)}%`, M, yCentro + 80);

  doc
    .fillColor(NAVY)
    .font("Helvetica-Bold")
    .fontSize(14)
    .text("PERÍODO AUDITADO", M, yCentro + 130);

  doc
    .fillColor(NAVY)
    .font("Helvetica-Bold")
    .fontSize(20)
    .text(`${fmtData(d.periodo.inicio)}  →  ${fmtData(d.periodo.fim)}`, M, yCentro + 152);

  doc
    .fillColor(GRAY_TXT)
    .font("Helvetica")
    .fontSize(11)
    .text(`Documento gerado em ${fmtData(d.geradoEm)} às ${d.geradoEm.toLocaleTimeString("pt-BR")}`, M, yCentro + 185);

  // Caixa "objetivo do documento" no fim
  const yCaixa = H - 200;
  doc.rect(M, yCaixa, W - 2 * M, 130).fill("#f9fafb").stroke(GOLD);
  doc
    .fillColor(NAVY)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text("FINALIDADE", M + 14, yCaixa + 14);
  doc
    .fillColor(GRAY_TXT)
    .font("Helvetica")
    .fontSize(10)
    .text(
      "Documento de reconciliação para reunião presencial entre o representante PAWARDS MEDCORE e o responsável pela farmácia parceira. " +
        "Compara o valor previsto de comissão (com base nas receitas emitidas pelo sistema), o valor declarado pela farmácia e o valor efetivamente recebido. " +
        "Os dados aqui apresentados refletem registros do sistema PAWARDS MEDCORE no momento da geração — protocolo " +
        d.protocolo +
        ".",
      M + 14,
      yCaixa + 32,
      { width: W - 2 * M - 28, align: "justify" },
    );

  // ════════ PÁGINA 2 — RESUMO EXECUTIVO + GRÁFICO ════════
  doc.addPage();

  // Header pequeno
  doc.rect(0, 0, W, 50).fill(NAVY);
  doc.rect(0, 46, W, 4).fill(GOLD);
  doc
    .fillColor(GOLD)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text("RESUMO EXECUTIVO", M, 18, { characterSpacing: 2 });
  doc
    .fillColor("#ffffff")
    .font("Helvetica")
    .fontSize(9)
    .text(`${d.farmacia.nome}  ·  ${fmtData(d.periodo.inicio)} → ${fmtData(d.periodo.fim)}`, M, 32);

  // Métricas grandes em grid 2×2
  const metricas: { label: string; valor: string; cor: string; sub?: string }[] = [
    { label: "PREVISTO", valor: fmtBRL(d.resumo.previsto), cor: NAVY, sub: `${d.resumo.qtd_receitas} receitas` },
    { label: "DECLARADO", valor: fmtBRL(d.resumo.declarado), cor: NAVY, sub: " " },
    { label: "RECEBIDO", valor: fmtBRL(d.resumo.recebido), cor: NAVY, sub: " " },
    {
      label: "GAP",
      valor: fmtBRL(d.resumo.gap),
      cor: d.resumo.gap > 0 ? RED : GREEN,
      sub: `${gapPct(d.resumo.previsto, d.resumo.gap).toFixed(1)}% sobre o previsto`,
    },
  ];
  const cellW = (W - 2 * M - 20) / 2;
  const cellH = 90;
  metricas.forEach((m, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = M + col * (cellW + 20);
    const y = 80 + row * (cellH + 14);
    doc.rect(x, y, cellW, cellH).fill("#f9fafb").stroke("#e5e7eb");
    doc
      .fillColor(GRAY_LT)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(m.label, x + 14, y + 12, { characterSpacing: 1 });
    doc
      .fillColor(m.cor)
      .font("Helvetica-Bold")
      .fontSize(24)
      .text(m.valor, x + 14, y + 30, { width: cellW - 28 });
    if (m.sub && m.sub.trim()) {
      doc
        .fillColor(GRAY_TXT)
        .font("Helvetica")
        .fontSize(9)
        .text(m.sub, x + 14, y + 65, { width: cellW - 28 });
    }
  });

  // Gráfico de barras agrupado: Previsto × Declarado × Recebido por mês
  const yChart = 280;
  const chartH = 240;
  const chartW = W - 2 * M;
  doc
    .fillColor(NAVY)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text("EVOLUÇÃO MENSAL  ·  Previsto vs Declarado vs Recebido (GAP em vermelho)", M, yChart - 18);

  desenharGraficoBarras(doc, M, yChart, chartW, chartH, d.serie_mensal);

  // Legenda
  const yLeg = yChart + chartH + 18;
  desenharLegenda(doc, M, yLeg, [
    { cor: NAVY, label: "Previsto" },
    { cor: GOLD, label: "Declarado" },
    { cor: "#16a34a", label: "Recebido" },
    { cor: RED, label: "GAP" },
  ]);

  // Frase de impacto
  if (d.resumo.gap > 0) {
    doc
      .fillColor(RED)
      .font("Helvetica-Bold")
      .fontSize(13)
      .text(
        `GAP TOTAL DE ${fmtBRL(d.resumo.gap)} (${gapPct(d.resumo.previsto, d.resumo.gap).toFixed(1)}%) NO PERÍODO`,
        M,
        H - 90,
        { width: W - 2 * M, align: "center" },
      );
  } else {
    doc
      .fillColor(GREEN)
      .font("Helvetica-Bold")
      .fontSize(13)
      .text(`SEM GAP NO PERÍODO  ·  ${fmtBRL(d.resumo.recebido)} reconciliados`, M, H - 90, {
        width: W - 2 * M,
        align: "center",
      });
  }

  // ════════ PÁGINA 3 — TABELA DETALHADA ════════
  doc.addPage();
  doc.rect(0, 0, W, 50).fill(NAVY);
  doc.rect(0, 46, W, 4).fill(GOLD);
  doc
    .fillColor(GOLD)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text("DETALHAMENTO POR RECEITA", M, 18, { characterSpacing: 2 });
  doc
    .fillColor("#ffffff")
    .font("Helvetica")
    .fontSize(9)
    .text(`Pacientes exibidos por iniciais (LGPD)  ·  ${d.receitas.length} receita(s)`, M, 32);

  // Cabeçalho tabela
  const colsX = [M, M + 50, M + 110, M + 170, M + 270, M + 360, M + 440];
  const colsW = [50, 60, 60, 100, 90, 80, 75];
  const heads = ["#", "Data", "Paciente", "Nº Receita", "Valor fórm.", "Comissão", "Status"];
  let y = 70;

  const drawHeaderRow = (yy: number) => {
    doc.rect(M, yy - 4, W - 2 * M, 22).fill(NAVY);
    heads.forEach((h, i) => {
      doc
        .fillColor(GOLD)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(h, colsX[i]! + 4, yy + 2, { width: colsW[i]! - 8 });
    });
  };

  drawHeaderRow(y);
  y += 22;

  const linhaHeight = 18;
  d.receitas.forEach((r, idx) => {
    if (y > H - 60) {
      // Nova página de continuação
      doc.addPage();
      doc.rect(0, 0, W, 30).fill(NAVY);
      doc
        .fillColor(GOLD)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("DETALHAMENTO POR RECEITA (continuação)", M, 11);
      y = 50;
      drawHeaderRow(y);
      y += 22;
    }

    if (idx % 2 === 1) {
      doc.rect(M, y - 4, W - 2 * M, linhaHeight).fill("#f3f4f6");
    }

    const status = r.pago
      ? "Pago"
      : r.declarado
        ? "Declarado"
        : "Pendente";
    const statusCor = r.pago ? GREEN : r.declarado ? GOLD : RED;

    const cells = [
      String(idx + 1),
      fmtData(r.data),
      iniciaisPaciente(r.paciente_nome),
      r.numero_receita ?? `#${r.id}`,
      fmtBRL(r.valor_formula),
      fmtBRL(r.comissao_devida),
      status,
    ];
    cells.forEach((c, i) => {
      const cor = i === 6 ? statusCor : GRAY_TXT;
      doc
        .fillColor(cor)
        .font(i === 6 ? "Helvetica-Bold" : "Helvetica")
        .fontSize(8)
        .text(c, colsX[i]! + 4, y + 2, { width: colsW[i]! - 8, ellipsis: true });
    });
    y += linhaHeight;
  });

  // ════════ RODAPÉ EM TODAS AS PÁGINAS ════════
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.rect(0, H - 30, W, 30).fill(NAVY);
    doc
      .fillColor(GRAY_LT)
      .font("Helvetica")
      .fontSize(7)
      .text(
        `Documento gerado em ${fmtData(d.geradoEm)}  ·  PAWARDS MEDCORE  ·  Protocolo ${d.protocolo}  ·  pág. ${i + 1}/${range.count}` +
          (d.contato_dr_caio ? `  ·  ${d.contato_dr_caio}` : ""),
        M,
        H - 18,
        { align: "center", width: W - 2 * M },
      );
  }

  return doc;
}

// ────────────────────────────────────────────────────────────
// Gráfico de barras agrupado (4 séries: previsto/declarado/recebido + gap vermelho)
// ────────────────────────────────────────────────────────────
function desenharGraficoBarras(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  serie: DadosPdfReconciliacao["serie_mensal"],
): void {
  // Fundo
  doc.rect(x, y, w, h).fill("#ffffff").stroke("#e5e7eb");

  if (serie.length === 0) {
    doc
      .fillColor(GRAY_LT)
      .font("Helvetica-Oblique")
      .fontSize(10)
      .text("(sem dados no período)", x, y + h / 2 - 6, { width: w, align: "center" });
    return;
  }

  // Eixo Y: pega max de previsto/declarado/recebido
  let maxV = 0;
  serie.forEach((s) => {
    maxV = Math.max(maxV, s.previsto, s.declarado, s.recebido);
  });
  if (maxV <= 0) maxV = 1;

  const padL = 50;
  const padB = 30;
  const padT = 10;
  const padR = 10;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  // Linhas de grade horizontais (4 níveis)
  doc.lineWidth(0.5).strokeColor("#e5e7eb");
  for (let i = 0; i <= 4; i++) {
    const yy = y + padT + (innerH * i) / 4;
    doc.moveTo(x + padL, yy).lineTo(x + w - padR, yy).stroke();
    const valor = maxV * (1 - i / 4);
    doc
      .fillColor(GRAY_LT)
      .font("Helvetica")
      .fontSize(7)
      .text(formatarValorAbreviado(valor), x + 4, yy - 4, { width: padL - 8, align: "right" });
  }

  // Barras agrupadas
  const groupW = innerW / serie.length;
  const barW = Math.min(14, (groupW * 0.7) / 3);
  const gap = (groupW - 3 * barW) / 2;

  serie.forEach((s, idx) => {
    const xg = x + padL + idx * groupW + gap / 2;
    const baseY = y + padT + innerH;

    // Previsto (navy)
    const hPrev = (s.previsto / maxV) * innerH;
    doc.rect(xg, baseY - hPrev, barW, hPrev).fill(NAVY);
    // Declarado (gold)
    const hDecl = (s.declarado / maxV) * innerH;
    doc.rect(xg + barW + 2, baseY - hDecl, barW, hDecl).fill(GOLD);
    // Recebido (verde)
    const hRec = (s.recebido / maxV) * innerH;
    doc.rect(xg + 2 * (barW + 2), baseY - hRec, barW, hRec).fill("#16a34a");

    // Indicador de GAP (vermelho) — diferença previsto-recebido
    const gapVal = Math.max(0, s.previsto - s.recebido);
    if (gapVal > 0) {
      const hGap = (gapVal / maxV) * innerH;
      doc.rect(xg + 3 * (barW + 2), baseY - hGap, 4, hGap).fill(RED);
    }

    // Label do mês
    doc
      .fillColor(GRAY_TXT)
      .font("Helvetica")
      .fontSize(7)
      .text(s.mes.slice(2), xg, baseY + 6, { width: groupW, align: "left" });
  });
}

function desenharLegenda(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  itens: { cor: string; label: string }[],
): void {
  let cx = x;
  itens.forEach((it) => {
    doc.rect(cx, y, 10, 10).fill(it.cor);
    doc
      .fillColor(GRAY_TXT)
      .font("Helvetica")
      .fontSize(9)
      .text(it.label, cx + 14, y, { lineBreak: false });
    cx += 14 + doc.widthOfString(it.label) + 18;
  });
}

function formatarValorAbreviado(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1).replace(".0", "") + "k";
  return v.toFixed(0);
}

export async function streamPdfParaBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}
