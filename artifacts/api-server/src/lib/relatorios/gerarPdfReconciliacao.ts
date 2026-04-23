// ════════════════════════════════════════════════════════════════════
// PARMAVAULT-TSUNAMI Wave 7 · PDF reconciliacao LUXUOSO CLASSICO
// 3 paginas: capa institucional navy/gold + resumo executivo com
// chart refinado (3 zonas: KPIs topo, grafico medio, legenda+texto base)
// + tabela detalhada por receita (LGPD iniciais).
//
// Renderizado server-side com pdfkit puro (sem chartjs-node-canvas
// para evitar deps binarias pesadas — libcairo etc).
// Estetica luxuosa: Times-Bold builtin pdfkit (serif classica que
// aproxima Playfair Display) + Helvetica corpo + Courier mono protocolo.
//
// Wave 7 upgrades sobre Wave 5:
//   - Cabecalho navy 160px + faixa gold 5px (modelo Dr. Cloud)
//   - Capa: 4 boxes info em grid + finalidade box gold + protocolo navy
//   - P2 layout 3 zonas: 4 KPI cards left-border colorido (terço sup) +
//     grafico grande terço medio + legenda+explicacao+impacto base
//   - Grafico: grade horizontal pontilhada + valores no topo barras
//   - Tabela: zebrada + status colorido + page break refinado
//   - Rodape: gold accent left + protocolo Courier
// ════════════════════════════════════════════════════════════════════
import PDFDocument from "pdfkit";
import { iniciaisPaciente } from "./iniciaisLgpd.js";

const NAVY = "#020406";
const NAVY_SOFT = "#0a1018";
const GOLD = "#C89B3C";
const GOLD_LT = "#E8C268";
const GOLD_BG = "#FAF6EC";
const RED = "#dc2626";
const RED_BG = "#FEF2F2";
const GREEN = "#16a34a";
const GREEN_BG = "#F0FDF4";
const AMBER = "#d97706";
const GRAY_DK = "#1f2937";
const GRAY_TXT = "#374151";
const GRAY_MD = "#6b7280";
const GRAY_LT = "#9ca3af";
const GRAY_BORDER = "#e5e7eb";
const PANEL_BG = "#fafafa";

// Fontes builtin pdfkit
const F_SERIF_BOLD = "Times-Bold"; // Para titulos luxuosos (Playfair-like)
const F_SERIF = "Times-Roman";
const F_SANS = "Helvetica";
const F_SANS_BOLD = "Helvetica-Bold";
const F_SANS_OBLIQUE = "Helvetica-Oblique";
const F_MONO = "Courier";
const F_MONO_BOLD = "Courier-Bold";

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
    mes: string; // 'YYYY-MM'
    previsto: number;
    declarado: number;
    recebido: number;
  }>;
  receitas: Array<{
    id: number;
    numero_receita?: string | null;
    data: string; // ISO ou pt-BR
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

function fmtBRLCompacto(v: number | null | undefined): string {
  // R$ 820.601 (sem centavos, ponto separador)
  const n = Number(v ?? 0);
  return (
    "R$ " +
    Math.round(n).toLocaleString("pt-BR", { maximumFractionDigits: 0 })
  );
}

function fmtData(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("pt-BR");
}

function fmtMesAbrev(yyyymm: string): string {
  // 'YYYY-MM' → 'Mai/25'
  const meses = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  const partes = yyyymm.split("-");
  if (partes.length !== 2) return yyyymm;
  const ano = partes[0]!.slice(2);
  const mesIdx = Number(partes[1]) - 1;
  if (mesIdx < 0 || mesIdx > 11) return yyyymm;
  return `${meses[mesIdx]}/${ano}`;
}

function gapPct(prev: number, gap: number): number {
  if (!prev || prev <= 0) return 0;
  return (gap / prev) * 100;
}

function formatarValorAbreviado(v: number): string {
  if (v >= 1_000_000) {
    const x = v / 1_000_000;
    return (x % 1 === 0 ? x.toFixed(0) : x.toFixed(1)) + "M";
  }
  if (v >= 1_000) {
    const x = v / 1_000;
    return (x % 1 === 0 ? x.toFixed(0) : x.toFixed(1)) + "k";
  }
  return v.toFixed(0);
}

export function gerarPdfReconciliacao(d: DadosPdfReconciliacao): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true });
  const W = doc.page.width; // ~595
  const H = doc.page.height; // ~842
  const M = 40; // margem horizontal padrao

  // ════════════════════════════════════════════════════════════════
  // PÁGINA 1 — CAPA INSTITUCIONAL
  // ════════════════════════════════════════════════════════════════
  desenharCapa(doc, d, W, H, M);

  // ════════════════════════════════════════════════════════════════
  // PÁGINA 2 — RESUMO EXECUTIVO (3 zonas: KPIs / Chart / Legenda)
  // ════════════════════════════════════════════════════════════════
  doc.addPage();
  desenharResumoExecutivo(doc, d, W, H, M);

  // ════════════════════════════════════════════════════════════════
  // PÁGINA 3+ — TABELA DETALHADA (com page break)
  // ════════════════════════════════════════════════════════════════
  doc.addPage();
  desenharTabelaDetalhada(doc, d, W, H, M);

  // ════════════════════════════════════════════════════════════════
  // RODAPÉ — APLICA EM TODAS AS PÁGINAS
  // ════════════════════════════════════════════════════════════════
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    desenharRodape(doc, d, W, H, M, i + 1, range.count);
  }

  return doc;
}

// ────────────────────────────────────────────────────────────
// PÁGINA 1 · CAPA
// ────────────────────────────────────────────────────────────
function desenharCapa(
  doc: PDFKit.PDFDocument,
  d: DadosPdfReconciliacao,
  W: number,
  H: number,
  M: number,
): void {
  // Fundo branco
  doc.rect(0, 0, W, H).fill("#ffffff");

  // ── Cabecalho luxuoso navy 160px + faixa gold 5px ──
  doc.rect(0, 0, W, 160).fill(NAVY);
  doc.rect(0, 155, W, 5).fill(GOLD);

  // Brand "PAWARDS MEDCORE" — Times-Bold com letterspacing alto
  doc
    .fillColor(GOLD)
    .font(F_SERIF_BOLD)
    .fontSize(30)
    .text("PAWARDS MEDCORE", M, 50, { characterSpacing: 4 });

  // Subtitle institucional
  doc
    .fillColor("#ffffff")
    .font(F_SANS)
    .fontSize(10)
    .text(
      "SISTEMA DE EXCELÊNCIA MÉDICA  ·  RECONCILIAÇÃO PARMAVAULT",
      M,
      90,
      { characterSpacing: 1.2 },
    );

  // Selo "CONFIDENCIAL" canto direito
  doc
    .fillColor(GOLD_LT)
    .font(F_MONO_BOLD)
    .fontSize(8)
    .text("CONFIDENCIAL", W - M - 80, 50, { width: 80, align: "right" });
  doc
    .fillColor("rgba(255,255,255,0.5)" as any)
    .fillColor("#cbd5e1")
    .font(F_MONO)
    .fontSize(7)
    .text(
      `Documento ${d.protocolo}`,
      W - M - 120,
      66,
      { width: 120, align: "right" },
    );

  // ── Zona MEIO: nome farmacia + grid info ──
  const yMeio = 200;

  doc
    .fillColor(GOLD)
    .font(F_SANS_BOLD)
    .fontSize(9)
    .text("FARMÁCIA AUDITADA", M, yMeio, { characterSpacing: 1.8 });

  doc
    .fillColor(NAVY)
    .font(F_SERIF_BOLD)
    .fontSize(32)
    .text(d.farmacia.nome, M, yMeio + 18);

  if (d.farmacia.cnpj) {
    doc
      .fillColor(GRAY_MD)
      .font(F_SANS)
      .fontSize(11)
      .text(`CNPJ ${d.farmacia.cnpj}`, M, yMeio + 60);
  }

  // ── Grid 2×2 de boxes informativos ──
  const yGrid = yMeio + 100;
  const boxW = (W - 2 * M - 16) / 2;
  const boxH = 88;

  const boxes: Array<{
    label: string;
    valor: string;
    sub: string;
    accent?: string;
    valorCor?: string;
  }> = [
    {
      label: "PERÍODO AUDITADO",
      valor: `${fmtData(d.periodo.inicio)} → ${fmtData(d.periodo.fim)}`,
      sub: `${d.resumo.qtd_receitas} receitas no período`,
      accent: NAVY,
    },
    {
      label: "% COMISSÃO VIGENTE",
      valor: `${Number(d.farmacia.percentual_comissao).toFixed(2)}%`,
      sub: `Snapshot imutável · ${fmtData(d.geradoEm)}`,
      accent: GOLD,
    },
    {
      label: "PREVISTO TOTAL",
      valor: fmtBRLCompacto(d.resumo.previsto),
      sub: "Base: % sobre valor das fórmulas",
      accent: NAVY,
    },
    {
      label: "GAP TOTAL",
      valor: fmtBRLCompacto(d.resumo.gap),
      sub:
        d.resumo.previsto > 0
          ? `${gapPct(d.resumo.previsto, d.resumo.gap).toFixed(1)}% pendente de reconciliação`
          : "Sem base de comparação",
      accent: d.resumo.gap > 0 ? RED : GREEN,
      valorCor: d.resumo.gap > 0 ? RED : GREEN,
    },
  ];

  boxes.forEach((b, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = M + col * (boxW + 16);
    const y = yGrid + row * (boxH + 14);

    // Box com borda esquerda colorida (left-accent)
    doc.rect(x, y, boxW, boxH).fill("#ffffff").stroke(GRAY_BORDER);
    doc.rect(x, y, 4, boxH).fill(b.accent ?? NAVY);

    doc
      .fillColor(GRAY_LT)
      .font(F_SANS_BOLD)
      .fontSize(8)
      .text(b.label, x + 16, y + 12, { characterSpacing: 1.2 });

    doc
      .fillColor(b.valorCor ?? NAVY)
      .font(F_SERIF_BOLD)
      .fontSize(20)
      .text(b.valor, x + 16, y + 28, { width: boxW - 24 });

    doc
      .fillColor(GRAY_MD)
      .font(F_SANS)
      .fontSize(9)
      .text(b.sub, x + 16, y + 65, { width: boxW - 24 });
  });

  // ── Zona INFERIOR: Caixa "Finalidade" + protocolo ──
  const yFinal = yGrid + 2 * (boxH + 14) + 24;

  // Caixa finalidade — fundo gold suave
  doc.rect(M, yFinal, W - 2 * M, 100).fill(GOLD_BG).stroke(GOLD);
  doc
    .fillColor(GOLD)
    .font(F_SANS_BOLD)
    .fontSize(9)
    .text("FINALIDADE DESTE DOCUMENTO", M + 16, yFinal + 14, {
      characterSpacing: 1.5,
    });
  doc
    .fillColor(GRAY_DK)
    .font(F_SERIF)
    .fontSize(10)
    .text(
      "Relatório de reconciliação de comissões referente às receitas de manipulação encaminhadas durante o período auditado. " +
        "Apresenta o volume de receitas emitidas, o valor de comissão esperado, o status de declaração e o status de recebimento. " +
        "Documento preparado para reunião de alinhamento comercial entre o representante PAWARDS MEDCORE e o responsável administrativo da farmácia parceira.",
      M + 16,
      yFinal + 32,
      { width: W - 2 * M - 32, align: "justify", lineGap: 2 },
    );

  // Box protocolo — barra navy/gold no rodape da capa (acima do rodape global)
  const yProto = H - 80;
  doc.rect(M, yProto, W - 2 * M, 40).fill(NAVY);
  doc.rect(M, yProto, 4, 40).fill(GOLD);
  doc
    .fillColor(GOLD)
    .font(F_SANS_BOLD)
    .fontSize(8)
    .text("PROTOCOLO DE AUDITORIA", M + 16, yProto + 8, {
      characterSpacing: 1.5,
    });
  doc
    .fillColor("#ffffff")
    .font(F_MONO_BOLD)
    .fontSize(14)
    .text(d.protocolo, M + 16, yProto + 20);

  doc
    .fillColor("#94a3b8")
    .font(F_MONO)
    .fontSize(8)
    .text(
      `Gerado em ${fmtData(d.geradoEm)} às ${d.geradoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
      M,
      yProto + 22,
      { width: W - 2 * M - 16, align: "right" },
    );
}

// ────────────────────────────────────────────────────────────
// PÁGINA 2 · RESUMO EXECUTIVO (3 zonas)
// ────────────────────────────────────────────────────────────
function desenharResumoExecutivo(
  doc: PDFKit.PDFDocument,
  d: DadosPdfReconciliacao,
  W: number,
  H: number,
  M: number,
): void {
  doc.rect(0, 0, W, H).fill("#ffffff");

  // ── Cabecalho fixo: navy 60px + gold 4px ──
  doc.rect(0, 0, W, 60).fill(NAVY);
  doc.rect(0, 56, W, 4).fill(GOLD);

  doc
    .fillColor(GOLD)
    .font(F_SANS_BOLD)
    .fontSize(11)
    .text("RESUMO EXECUTIVO", M, 18, { characterSpacing: 2 });
  doc
    .fillColor("#ffffff")
    .font(F_SERIF)
    .fontSize(11)
    .text(
      `${d.farmacia.nome}  ·  ${fmtData(d.periodo.inicio)} → ${fmtData(d.periodo.fim)}`,
      M,
      36,
    );
  doc
    .fillColor("#94a3b8")
    .font(F_MONO)
    .fontSize(8)
    .text(`Protocolo ${d.protocolo}`, M, 18, {
      width: W - 2 * M,
      align: "right",
    });

  // ════════════════════════════════════════════════════════════════
  // ZONA 1 · TERÇO SUPERIOR — 4 KPI cards grandes
  // ════════════════════════════════════════════════════════════════
  const yKpi = 80;
  const kpiH = 80;
  const kpiW = (W - 2 * M - 3 * 12) / 4;

  const kpis: Array<{
    label: string;
    valor: string;
    sub: string;
    pct?: string;
    pctBg?: string;
    pctCor?: string;
    accent: string;
    valorCor: string;
  }> = [
    {
      label: "PREVISTO",
      valor: fmtBRLCompacto(d.resumo.previsto),
      sub: `${d.resumo.qtd_receitas} receitas`,
      accent: NAVY,
      valorCor: NAVY,
    },
    {
      label: "DECLARADO",
      valor: fmtBRLCompacto(d.resumo.declarado),
      sub: d.resumo.declarado > 0 ? "pela farmácia" : "nada declarado",
      accent: GOLD,
      valorCor: NAVY,
    },
    {
      label: "RECEBIDO",
      valor: fmtBRLCompacto(d.resumo.recebido),
      sub: d.resumo.recebido > 0 ? "confirmado em conta" : "nada recebido",
      accent: GREEN,
      valorCor: NAVY,
    },
    {
      label: "GAP",
      valor: fmtBRLCompacto(d.resumo.gap),
      sub:
        d.resumo.gap > 0
          ? "previsto − recebido"
          : "reconciliação completa",
      pct:
        d.resumo.previsto > 0
          ? `${gapPct(d.resumo.previsto, d.resumo.gap).toFixed(1)}%`
          : undefined,
      pctBg: d.resumo.gap > 0 ? RED_BG : GREEN_BG,
      pctCor: d.resumo.gap > 0 ? RED : GREEN,
      accent: d.resumo.gap > 0 ? RED : GREEN,
      valorCor: d.resumo.gap > 0 ? RED : GREEN,
    },
  ];

  kpis.forEach((k, i) => {
    const x = M + i * (kpiW + 12);
    doc.rect(x, yKpi, kpiW, kpiH).fill(PANEL_BG).stroke(GRAY_BORDER);
    doc.rect(x, yKpi, 3, kpiH).fill(k.accent);

    doc
      .fillColor(GRAY_LT)
      .font(F_SANS_BOLD)
      .fontSize(7)
      .text(k.label, x + 12, yKpi + 10, { characterSpacing: 1.2 });

    doc
      .fillColor(k.valorCor)
      .font(F_SERIF_BOLD)
      .fontSize(17)
      .text(k.valor, x + 12, yKpi + 26, { width: kpiW - 18 });

    doc
      .fillColor(GRAY_MD)
      .font(F_SANS)
      .fontSize(7.5)
      .text(k.sub, x + 12, yKpi + 60, { width: kpiW - 18 });

    // Pct badge (apenas no GAP)
    if (k.pct && k.pctBg && k.pctCor) {
      const badgeW = 38;
      const badgeH = 16;
      const bx = x + kpiW - badgeW - 8;
      const by = yKpi + 8;
      doc.roundedRect(bx, by, badgeW, badgeH, 3).fill(k.pctBg);
      doc
        .fillColor(k.pctCor)
        .font(F_MONO_BOLD)
        .fontSize(8)
        .text(k.pct, bx, by + 4, { width: badgeW, align: "center" });
    }
  });

  // ════════════════════════════════════════════════════════════════
  // ZONA 2 · TERÇO MÉDIO — Gráfico de barras agrupado refinado
  // ════════════════════════════════════════════════════════════════
  const yChartTitle = yKpi + kpiH + 30;
  doc
    .fillColor(NAVY)
    .font(F_SANS_BOLD)
    .fontSize(10)
    .text(
      "EVOLUÇÃO MENSAL  ·  PREVISTO × DECLARADO × RECEBIDO",
      M,
      yChartTitle,
      { characterSpacing: 1.5 },
    );
  doc
    .fillColor(GRAY_MD)
    .font(F_SANS)
    .fontSize(8)
    .text(
      `Série de ${d.serie_mensal.length} mês(es) · Indicador GAP em vermelho à direita de cada grupo`,
      M,
      yChartTitle + 14,
    );

  const yChart = yChartTitle + 36;
  const chartH = 220;
  const chartW = W - 2 * M;
  desenharGraficoBarras(doc, M, yChart, chartW, chartH, d.serie_mensal);

  // ════════════════════════════════════════════════════════════════
  // ZONA 3 · TERÇO INFERIOR — Legenda + Explicação + Frase impacto
  // ════════════════════════════════════════════════════════════════
  const yLeg = yChart + chartH + 18;
  desenharLegenda(doc, M, yLeg, [
    { cor: NAVY, label: "Previsto (% × valor fórmulas)" },
    { cor: GOLD, label: "Declarado (pela farmácia)" },
    { cor: GREEN, label: "Recebido (confirmado)" },
    { cor: RED, label: "GAP (previsto − recebido)" },
  ]);

  // Texto explicativo logo abaixo da legenda
  const yExpl = yLeg + 26;
  doc
    .fillColor(GRAY_TXT)
    .font(F_SERIF)
    .fontSize(9.5)
    .text(
      "Cada grupo de barras corresponde a um mês do período auditado. As três séries comparam o " +
        "valor de comissão previsto pelo sistema, o valor declarado pela farmácia parceira e o valor " +
        "efetivamente recebido. A barra vermelha à direita indica o GAP — diferença entre previsto e recebido.",
      M,
      yExpl,
      { width: W - 2 * M, align: "justify", lineGap: 2 },
    );

  // Frase de impacto — box destaque colorido (acima do rodape global)
  const yImpacto = H - 80;
  if (d.resumo.gap > 0) {
    doc.rect(M, yImpacto, W - 2 * M, 36).fill(RED_BG).stroke(RED);
    doc.rect(M, yImpacto, 4, 36).fill(RED);
    doc
      .fillColor(RED)
      .font(F_SERIF_BOLD)
      .fontSize(13)
      .text(
        `GAP TOTAL DE ${fmtBRLCompacto(d.resumo.gap)}` +
          (d.resumo.previsto > 0
            ? `  (${gapPct(d.resumo.previsto, d.resumo.gap).toFixed(1)}%)`
            : "") +
          "  NO PERÍODO AUDITADO",
        M,
        yImpacto + 11,
        { width: W - 2 * M, align: "center" },
      );
  } else if (d.resumo.previsto > 0) {
    doc.rect(M, yImpacto, W - 2 * M, 36).fill(GREEN_BG).stroke(GREEN);
    doc.rect(M, yImpacto, 4, 36).fill(GREEN);
    doc
      .fillColor(GREEN)
      .font(F_SERIF_BOLD)
      .fontSize(13)
      .text(
        `RECONCILIAÇÃO COMPLETA  ·  ${fmtBRLCompacto(d.resumo.recebido)} CONFIRMADOS NO PERÍODO`,
        M,
        yImpacto + 11,
        { width: W - 2 * M, align: "center" },
      );
  }
}

// ────────────────────────────────────────────────────────────
// PÁGINA 3+ · TABELA DETALHADA
// ────────────────────────────────────────────────────────────
function desenharTabelaDetalhada(
  doc: PDFKit.PDFDocument,
  d: DadosPdfReconciliacao,
  W: number,
  H: number,
  M: number,
): void {
  doc.rect(0, 0, W, H).fill("#ffffff");

  // Cabecalho navy 60px + gold 4px
  doc.rect(0, 0, W, 60).fill(NAVY);
  doc.rect(0, 56, W, 4).fill(GOLD);

  doc
    .fillColor(GOLD)
    .font(F_SANS_BOLD)
    .fontSize(11)
    .text("DETALHAMENTO POR RECEITA", M, 18, { characterSpacing: 2 });
  doc
    .fillColor("#ffffff")
    .font(F_SERIF)
    .fontSize(10)
    .text(
      `Pacientes exibidos por iniciais (LGPD)  ·  ${d.receitas.length} receita(s) no período`,
      M,
      36,
    );
  doc
    .fillColor("#94a3b8")
    .font(F_MONO)
    .fontSize(8)
    .text(`Protocolo ${d.protocolo}`, M, 18, {
      width: W - 2 * M,
      align: "right",
    });

  // Estrutura de colunas
  const colsX = [M, M + 36, M + 92, M + 158, M + 270, M + 360, M + 450];
  const colsW = [36, 56, 66, 112, 90, 90, 65];
  const heads = [
    "#",
    "DATA",
    "PACIENTE",
    "Nº RECEITA",
    "VALOR FÓRM.",
    "COMISSÃO",
    "STATUS",
  ];
  const linhaH = 18;
  let y = 80;

  const drawHeaderRow = (yy: number): number => {
    doc.rect(M, yy, W - 2 * M, 22).fill(NAVY);
    doc.rect(M, yy + 21, W - 2 * M, 1).fill(GOLD);
    heads.forEach((h, i) => {
      doc
        .fillColor(GOLD)
        .font(F_SANS_BOLD)
        .fontSize(8)
        .text(h, colsX[i]! + 6, yy + 7, {
          width: colsW[i]! - 10,
          characterSpacing: 0.8,
          align: i === 0 ? "left" : i >= 4 ? "right" : "left",
        });
    });
    return yy + 22;
  };

  y = drawHeaderRow(y);

  if (d.receitas.length === 0) {
    doc
      .fillColor(GRAY_LT)
      .font(F_SANS_OBLIQUE)
      .fontSize(11)
      .text(
        "(Nenhuma receita encontrada no período auditado)",
        M,
        y + 30,
        { width: W - 2 * M, align: "center" },
      );
    return;
  }

  d.receitas.forEach((r, idx) => {
    // Page break automatico
    if (y > H - 80) {
      doc.addPage();
      doc.rect(0, 0, W, H).fill("#ffffff");
      doc.rect(0, 0, W, 40).fill(NAVY);
      doc.rect(0, 36, W, 4).fill(GOLD);
      doc
        .fillColor(GOLD)
        .font(F_SANS_BOLD)
        .fontSize(9)
        .text(
          `DETALHAMENTO POR RECEITA  ·  ${d.farmacia.nome}  ·  CONTINUAÇÃO`,
          M,
          14,
          { characterSpacing: 1.2 },
        );
      y = 60;
      y = drawHeaderRow(y);
    }

    // Zebra
    if (idx % 2 === 1) {
      doc.rect(M, y, W - 2 * M, linhaH).fill(PANEL_BG);
    }

    const status = r.pago ? "PAGO" : r.declarado ? "DECLARADO" : "PENDENTE";
    const statusCor = r.pago ? GREEN : r.declarado ? AMBER : RED;

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
      const isStatus = i === 6;
      const cor = isStatus ? statusCor : GRAY_TXT;
      const fnt = isStatus ? F_SANS_BOLD : i === 3 ? F_MONO : F_SANS;
      doc
        .fillColor(cor)
        .font(fnt)
        .fontSize(isStatus ? 7.5 : 8)
        .text(c, colsX[i]! + 6, y + 5, {
          width: colsW[i]! - 10,
          align: i === 0 || i === 1 || i === 2 || i === 3 ? "left" : "right",
          ellipsis: true,
        });
    });
    y += linhaH;
  });

  // Linha total (apenas se ha receitas)
  if (d.receitas.length > 0 && y < H - 50) {
    y += 6;
    doc.rect(M, y, W - 2 * M, 22).fill(NAVY);
    doc
      .fillColor(GOLD)
      .font(F_SANS_BOLD)
      .fontSize(9)
      .text("TOTAL DO PERÍODO", colsX[2]! + 6, y + 7, {
        width: colsW[2]! + colsW[3]! - 10,
        characterSpacing: 1,
      });
    const totalValor = d.receitas.reduce(
      (acc, r) => acc + Number(r.valor_formula ?? 0),
      0,
    );
    const totalComissao = d.receitas.reduce(
      (acc, r) => acc + Number(r.comissao_devida ?? 0),
      0,
    );
    doc
      .fillColor("#ffffff")
      .font(F_SERIF_BOLD)
      .fontSize(9)
      .text(fmtBRL(totalValor), colsX[4]! + 6, y + 7, {
        width: colsW[4]! - 10,
        align: "right",
      });
    doc
      .fillColor(GOLD)
      .font(F_SERIF_BOLD)
      .fontSize(9)
      .text(fmtBRL(totalComissao), colsX[5]! + 6, y + 7, {
        width: colsW[5]! - 10,
        align: "right",
      });
  }
}

// ────────────────────────────────────────────────────────────
// CHART · Barras agrupadas refinado (4 séries + grade pontilhada)
// ────────────────────────────────────────────────────────────
function desenharGraficoBarras(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  serie: DadosPdfReconciliacao["serie_mensal"],
): void {
  // Fundo do chart
  doc.rect(x, y, w, h).fill(PANEL_BG).stroke(GRAY_BORDER);

  if (serie.length === 0) {
    doc
      .fillColor(GRAY_LT)
      .font(F_SANS_OBLIQUE)
      .fontSize(11)
      .text("(sem dados no período)", x, y + h / 2 - 6, {
        width: w,
        align: "center",
      });
    return;
  }

  // Eixo Y: max de previsto/declarado/recebido
  let maxV = 0;
  serie.forEach((s) => {
    maxV = Math.max(maxV, s.previsto, s.declarado, s.recebido);
  });
  if (maxV <= 0) maxV = 1;

  // Arredonda maxV pra cima pra ter eixo Y limpo
  const escalaTopo = arredondarParaCima(maxV);

  const padL = 56;
  const padB = 30;
  const padT = 16;
  const padR = 16;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  // ── Linhas de grade horizontais pontilhadas (5 níveis) ──
  doc.lineWidth(0.4).strokeColor(GRAY_BORDER);
  for (let i = 0; i <= 4; i++) {
    const yy = y + padT + (innerH * i) / 4;
    // dash pattern
    doc.dash(2, { space: 2 });
    doc
      .moveTo(x + padL, yy)
      .lineTo(x + w - padR, yy)
      .stroke();
    doc.undash();
    const valor = escalaTopo * (1 - i / 4);
    doc
      .fillColor(GRAY_MD)
      .font(F_MONO)
      .fontSize(7)
      .text(formatarValorAbreviado(valor), x + 4, yy - 4, {
        width: padL - 8,
        align: "right",
      });
  }

  // ── Eixo X (linha base solida) ──
  doc.lineWidth(0.8).strokeColor(GRAY_LT);
  const baseY = y + padT + innerH;
  doc.moveTo(x + padL, baseY).lineTo(x + w - padR, baseY).stroke();

  // ── Barras agrupadas: 3 series + indicador GAP ──
  const groupW = innerW / serie.length;
  const groupPad = groupW * 0.18;
  const usableW = groupW - 2 * groupPad;
  const series = 4; // previsto, declarado, recebido, gap
  const barGap = 2;
  const barW = (usableW - (series - 1) * barGap) / series;

  serie.forEach((s, idx) => {
    const xg = x + padL + idx * groupW + groupPad;

    const hPrev = (s.previsto / escalaTopo) * innerH;
    const hDecl = (s.declarado / escalaTopo) * innerH;
    const hRec = (s.recebido / escalaTopo) * innerH;
    const gapVal = Math.max(0, s.previsto - s.recebido);
    const hGap = (gapVal / escalaTopo) * innerH;

    // Sombra sutil sob cada barra (offset 1px)
    const drawBar = (bx: number, bh: number, cor: string) => {
      if (bh < 0.5) return;
      // Sombra
      doc
        .fillColor("#00000010" as any)
        .fillColor("#cbd5e1")
        .opacity(0.3)
        .rect(bx + 1, baseY - bh + 1, barW, bh)
        .fill();
      doc.opacity(1);
      // Barra
      doc.fillColor(cor).rect(bx, baseY - bh, barW, bh).fill();
    };

    drawBar(xg, hPrev, NAVY);
    drawBar(xg + barW + barGap, hDecl, GOLD);
    drawBar(xg + 2 * (barW + barGap), hRec, GREEN);
    drawBar(xg + 3 * (barW + barGap), hGap, RED);

    // Valor previsto no topo da maior barra (apenas se > 0)
    if (s.previsto > 0 && hPrev > 18) {
      doc
        .fillColor(NAVY)
        .font(F_MONO_BOLD)
        .fontSize(6)
        .text(
          formatarValorAbreviado(s.previsto),
          xg - 4,
          baseY - hPrev - 9,
          { width: 4 * barW + 3 * barGap + 8, align: "left" },
        );
    }

    // Label do mes abaixo da base
    doc
      .fillColor(GRAY_TXT)
      .font(F_SANS_BOLD)
      .fontSize(7)
      .text(fmtMesAbrev(s.mes), xg, baseY + 8, {
        width: 4 * barW + 3 * barGap,
        align: "center",
      });
  });

  // Rotulo eixo Y
  doc.save();
  doc.rotate(-90, { origin: [x + 12, y + h / 2] });
  doc
    .fillColor(GRAY_LT)
    .font(F_SANS_BOLD)
    .fontSize(7)
    .text("VALOR (R$)", x + 12 - 30, y + h / 2 - 4, {
      width: 60,
      align: "center",
      characterSpacing: 1,
    });
  doc.restore();
}

function arredondarParaCima(v: number): number {
  if (v <= 0) return 1;
  // Encontra magnitude
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const norm = v / base;
  let arred: number;
  if (norm <= 1) arred = 1;
  else if (norm <= 2) arred = 2;
  else if (norm <= 2.5) arred = 2.5;
  else if (norm <= 5) arred = 5;
  else arred = 10;
  return arred * base;
}

function desenharLegenda(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  itens: { cor: string; label: string }[],
): void {
  let cx = x;
  itens.forEach((it) => {
    doc.roundedRect(cx, y + 1, 12, 12, 2).fill(it.cor);
    doc
      .fillColor(GRAY_TXT)
      .font(F_SANS)
      .fontSize(8.5)
      .text(it.label, cx + 17, y + 3, { lineBreak: false });
    cx += 17 + doc.widthOfString(it.label) + 22;
  });
}

// ────────────────────────────────────────────────────────────
// RODAPÉ — aplicado em TODAS as páginas
// ────────────────────────────────────────────────────────────
function desenharRodape(
  doc: PDFKit.PDFDocument,
  d: DadosPdfReconciliacao,
  W: number,
  H: number,
  M: number,
  pgAtual: number,
  pgTotal: number,
): void {
  // Barra navy 30px com accent gold left
  doc.rect(0, H - 30, W, 30).fill(NAVY);
  doc.rect(0, H - 30, 4, 30).fill(GOLD);

  // Texto centro
  doc
    .fillColor("#94a3b8")
    .font(F_MONO)
    .fontSize(7)
    .text(
      `Documento gerado em ${fmtData(d.geradoEm)}  ·  PAWARDS MEDCORE  ·  Protocolo ${d.protocolo}` +
        (d.contato_dr_caio ? `  ·  ${d.contato_dr_caio}` : ""),
      M,
      H - 18,
      { width: W - 2 * M - 60, align: "left" },
    );

  // Numero pagina em gold mono no canto direito
  doc
    .fillColor(GOLD)
    .font(F_MONO_BOLD)
    .fontSize(8)
    .text(`${pgAtual} / ${pgTotal}`, W - M - 40, H - 19, {
      width: 40,
      align: "right",
    });
}

export async function streamPdfParaBuffer(
  doc: PDFKit.PDFDocument,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}
