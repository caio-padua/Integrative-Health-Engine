import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

const CORES = {
  petroleo: "#1F4E5F",
  petroleoEscuro: "#163842",
  marfim: "#F5F0E8",
  douradoVivo: "#C9A227",
  dourado: "#A88820",
  tinta: "#2A2A2A",
  cinzaClaro: "#9B9B9B",
  borgonha: "#7A1F2B",
  verdeMusgo: "#5C7A4F",
  branco: "#FFFFFF",
};

export interface ReceitaResumo {
  numero: string;
  pacienteNome: string;
  codigoSemantico: string | null;
  valorEstimado: number | null;
  comissaoEstimada: number | null;
  status: string;
  emitidaEm: string | null;
}

export interface AssinaturaResumo {
  template: string;
  pacienteNome: string;
  status: string;
  signatariosOk: number;
  signatariosTotal: number;
  atualizadaEm: string | null;
}

export interface AlertaResumo {
  dia: string;
  metrica: string;
  tipoTransicao: string;
  mensagem: string;
}

export interface PayloadRelatorioCEO {
  dia: string; // YYYY-MM-DD BRT
  geradoEm: string;
  janelaHoras: number; // tipicamente 24
  kpis: {
    receitasNovas: number;
    comissaoPotencialNova: number;
    pacientesNovos: number;
    anamnesesNovas: number;
    assinaturasEnviadas: number;
    assinaturasAssinadas: number;
    assinaturasRejeitadas: number;
    assinaturasPendentes: number;
  };
  invariantesGlobais: {
    receitasTotal: number;
    comissaoPotencialTotal: number;
    pacientesAtivos: number;
    auditoriaAssinaturasTotal: number;
  };
  topReceitas: ReceitaResumo[];
  topAssinaturas: AssinaturaResumo[];
  alertasCEO: AlertaResumo[];
}

const W = 595;
const H = 842;
const MARGIN = 40;

function fmtBRL(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDataBR(s: string | null | undefined): string {
  if (!s) return "—";
  const parts = s.split("-");
  if (parts.length !== 3) return s;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function fmtTimestamp(s: string | null | undefined): string {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
  } catch {
    return s;
  }
}

function drawHeader(doc: PDFKit.PDFDocument, p: PayloadRelatorioCEO) {
  doc.rect(0, 0, W, 100).fill(CORES.petroleo);
  doc.rect(0, 100, W, 4).fill(CORES.douradoVivo);

  doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.douradoVivo)
    .text("PAWARDS · MEDCORE · PAINEL CEO · DIÁRIO 24H", MARGIN, 18, { characterSpacing: 3 });

  doc.fontSize(22).font("Helvetica-Bold").fillColor(CORES.marfim)
    .text("Relatório Diário CEO", MARGIN, 32);

  doc.fontSize(10).font("Helvetica").fillColor(CORES.marfim)
    .text(`Janela ${p.janelaHoras}h · Dia ${fmtDataBR(p.dia)}`, MARGIN, 64);

  doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.douradoVivo)
    .text("PAWARDS", W - MARGIN - 140, 22, { width: 140, align: "right" });
  doc.fontSize(7).font("Helvetica").fillColor(CORES.marfim)
    .text(`Gerado em ${p.geradoEm}`, W - MARGIN - 140, 40, { width: 140, align: "right" });
  doc.fontSize(6).fillColor(CORES.marfim)
    .text("Cofre operacional · Defesa em profundidade", W - MARGIN - 140, 54, { width: 140, align: "right" });
}

function drawFooter(doc: PDFKit.PDFDocument, pageNum: number) {
  const fy = H - 40;
  doc.moveTo(MARGIN, fy).lineTo(W - MARGIN, fy).lineWidth(0.4).stroke(CORES.cinzaClaro);
  doc.fontSize(6).font("Helvetica").fillColor(CORES.cinzaClaro)
    .text(`Página ${pageNum}`, MARGIN, fy + 6, { width: 60 });
  doc.fontSize(6).font("Helvetica-Oblique").fillColor(CORES.dourado)
    .text("PADUCCIA CLINICA MEDICA LTDA-EPP · CNPJ 63.865.940/0001-63 · Pawards MedCore", MARGIN + 70, fy + 6, { width: W - 200, align: "center" });
  doc.fontSize(6).font("Helvetica-Bold").fillColor(CORES.cinzaClaro)
    .text("PADCON 2.0", W - MARGIN - 60, fy + 6, { width: 60, align: "right" });
}

function drawSectionTitle(doc: PDFKit.PDFDocument, titulo: string, capitulo: string, y: number): number {
  doc.rect(MARGIN, y, 4, 26).fill(CORES.douradoVivo);
  doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.dourado)
    .text(capitulo, MARGIN + 12, y + 2, { characterSpacing: 2 });
  doc.fontSize(13).font("Helvetica-Bold").fillColor(CORES.petroleo)
    .text(titulo, MARGIN + 12, y + 12);
  return y + 36;
}

function drawKpiCard(doc: PDFKit.PDFDocument, x: number, y: number, w: number, label: string, valor: string | number, cor = CORES.petroleo) {
  doc.rect(x, y, w, 50).fill(CORES.marfim);
  doc.rect(x, y, 3, 50).fill(cor);
  doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.dourado)
    .text(label.toUpperCase(), x + 10, y + 8, { width: w - 14, characterSpacing: 1.2 });
  doc.fontSize(16).font("Helvetica-Bold").fillColor(cor)
    .text(String(valor), x + 10, y + 24, { width: w - 14 });
}

function drawTableHeader(doc: PDFKit.PDFDocument, cols: { label: string; w: number }[], y: number): number {
  let x = MARGIN;
  doc.rect(MARGIN, y, W - MARGIN * 2, 20).fill(CORES.petroleo);
  cols.forEach((c) => {
    doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.marfim)
      .text(c.label.toUpperCase(), x + 6, y + 6, { width: c.w - 8, characterSpacing: 1 });
    x += c.w;
  });
  return y + 20;
}

function drawTableRow(doc: PDFKit.PDFDocument, cols: { value: string; w: number; cor?: string }[], y: number, zebra: boolean): number {
  if (zebra) doc.rect(MARGIN, y, W - MARGIN * 2, 18).fill(CORES.marfim);
  let x = MARGIN;
  cols.forEach((c) => {
    doc.fontSize(8).font("Helvetica").fillColor(c.cor || CORES.tinta)
      .text(c.value, x + 6, y + 5, { width: c.w - 8, ellipsis: true, height: 12 });
    x += c.w;
  });
  return y + 18;
}

const STATUS_ASSIN_COR: Record<string, string> = {
  CONCLUIDO: CORES.verdeMusgo,
  ENVIADO: CORES.petroleo,
  PROCESSANDO: CORES.dourado,
  REJEITADO: CORES.borgonha,
  EXPIRADO: CORES.cinzaClaro,
  PENDENTE: CORES.dourado,
};

export function gerarRelatorioDiarioCEO(payload: PayloadRelatorioCEO): PassThrough {
  const doc = new PDFDocument({ size: "A4", margin: MARGIN, autoFirstPage: false });
  const stream = new PassThrough();
  doc.pipe(stream);

  let pageNum = 0;
  const novaPagina = () => {
    doc.addPage();
    pageNum++;
    drawHeader(doc, payload);
    drawFooter(doc, pageNum);
    return 120;
  };

  let y = novaPagina();

  // Citação
  doc.fontSize(9).font("Helvetica-Oblique").fillColor(CORES.tinta)
    .text(`"O relatório diário é o cofre psicológico do CEO — se a luz cair, o Gmail guarda o que o sistema lembrava."`, MARGIN, y, {
      width: W - MARGIN * 2, align: "center",
    });
  doc.fontSize(7).font("Helvetica").fillColor(CORES.dourado)
    .text("— Manifesto PADCON 2.0 · Defesa em Profundidade", MARGIN, y + 24, { width: W - MARGIN * 2, align: "center" });
  y += 48;

  // KPIs últimas 24h — 4 cards
  y = drawSectionTitle(doc, `Movimento das Últimas ${payload.janelaHoras}h`, "I · INDICADORES OPERACIONAIS", y);
  const kw = (W - MARGIN * 2 - 18) / 4;
  drawKpiCard(doc, MARGIN, y, kw, "Receitas Novas", payload.kpis.receitasNovas, CORES.petroleo);
  drawKpiCard(doc, MARGIN + (kw + 6), y, kw, "Comissão Potencial", fmtBRL(payload.kpis.comissaoPotencialNova), CORES.verdeMusgo);
  drawKpiCard(doc, MARGIN + (kw + 6) * 2, y, kw, "Pacientes Novos", payload.kpis.pacientesNovos, CORES.dourado);
  drawKpiCard(doc, MARGIN + (kw + 6) * 3, y, kw, "Anamneses Novas", payload.kpis.anamnesesNovas, CORES.petroleo);
  y += 60;

  // KPIs assinaturas
  drawKpiCard(doc, MARGIN, y, kw, "Assin. Enviadas", payload.kpis.assinaturasEnviadas, CORES.petroleo);
  drawKpiCard(doc, MARGIN + (kw + 6), y, kw, "Assinadas", payload.kpis.assinaturasAssinadas, CORES.verdeMusgo);
  drawKpiCard(doc, MARGIN + (kw + 6) * 2, y, kw, "Rejeitadas", payload.kpis.assinaturasRejeitadas, CORES.borgonha);
  drawKpiCard(doc, MARGIN + (kw + 6) * 3, y, kw, "Pendentes", payload.kpis.assinaturasPendentes, CORES.dourado);
  y += 75;

  // Invariantes globais (cofre histórico)
  if (y > H - 220) y = novaPagina();
  y = drawSectionTitle(doc, "Cofre Acumulado · Estado Atual", "II · INVARIANTES GLOBAIS", y);
  drawKpiCard(doc, MARGIN, y, kw, "Receitas Total", payload.invariantesGlobais.receitasTotal.toLocaleString("pt-BR"), CORES.petroleo);
  drawKpiCard(doc, MARGIN + (kw + 6), y, kw, "Comissão Total", fmtBRL(payload.invariantesGlobais.comissaoPotencialTotal), CORES.verdeMusgo);
  drawKpiCard(doc, MARGIN + (kw + 6) * 2, y, kw, "Pacientes Ativos", payload.invariantesGlobais.pacientesAtivos.toLocaleString("pt-BR"), CORES.dourado);
  drawKpiCard(doc, MARGIN + (kw + 6) * 3, y, kw, "Auditoria Assin.", payload.invariantesGlobais.auditoriaAssinaturasTotal, CORES.petroleo);
  y += 75;

  // Top receitas 24h
  if (y > H - 200) y = novaPagina();
  y = drawSectionTitle(doc, `Receitas das Últimas ${payload.janelaHoras}h · ${payload.topReceitas.length}`, "III · MOVIMENTO COMERCIAL", y);
  if (payload.topReceitas.length === 0) {
    doc.fontSize(9).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro)
      .text("Nenhuma receita nova no período.", MARGIN, y);
    y += 24;
  } else {
    const cols = [
      { label: "Número", w: 110 },
      { label: "Paciente (cód)", w: 175 },
      { label: "Valor", w: 80 },
      { label: "Comissão", w: 80 },
      { label: "Status", w: 70 },
    ];
    y = drawTableHeader(doc, cols, y);
    payload.topReceitas.forEach((r, i) => {
      if (y > H - 70) y = novaPagina();
      const codigo = r.codigoSemantico ? r.codigoSemantico.split(" ").slice(0, 3).join(" ") : "—";
      y = drawTableRow(doc, [
        { value: r.numero, w: 110, cor: CORES.petroleo },
        { value: `${r.pacienteNome} · ${codigo}`, w: 175 },
        { value: fmtBRL(r.valorEstimado), w: 80 },
        { value: fmtBRL(r.comissaoEstimada), w: 80, cor: CORES.verdeMusgo },
        { value: r.status, w: 70, cor: CORES.dourado },
      ], y, i % 2 === 0);
    });
    y += 12;
  }

  // Top assinaturas 24h
  if (y > H - 200) y = novaPagina();
  y = drawSectionTitle(doc, `Assinaturas das Últimas ${payload.janelaHoras}h · ${payload.topAssinaturas.length}`, "IV · CONFORMIDADE JURÍDICA", y);
  if (payload.topAssinaturas.length === 0) {
    doc.fontSize(9).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro)
      .text("Nenhuma assinatura nova no período.", MARGIN, y);
    y += 24;
  } else {
    const cols = [
      { label: "Template", w: 120 },
      { label: "Paciente", w: 200 },
      { label: "Status", w: 80 },
      { label: "Signat.", w: 50 },
      { label: "Atualizada", w: 65 },
    ];
    y = drawTableHeader(doc, cols, y);
    payload.topAssinaturas.forEach((a, i) => {
      if (y > H - 70) y = novaPagina();
      y = drawTableRow(doc, [
        { value: a.template, w: 120, cor: CORES.dourado },
        { value: a.pacienteNome, w: 200 },
        { value: a.status, w: 80, cor: STATUS_ASSIN_COR[a.status] || CORES.tinta },
        { value: `${a.signatariosOk}/${a.signatariosTotal}`, w: 50, cor: CORES.petroleo },
        { value: fmtTimestamp(a.atualizadaEm), w: 65 },
      ], y, i % 2 === 0);
    });
    y += 12;
  }

  // Alertas CEO ativos
  if (y > H - 180) y = novaPagina();
  y = drawSectionTitle(doc, `Alertas CEO Ativos · ${payload.alertasCEO.length}`, "V · OBSERVABILIDADE", y);
  if (payload.alertasCEO.length === 0) {
    doc.fontSize(9).font("Helvetica-Oblique").fillColor(CORES.verdeMusgo)
      .text("Nenhum alerta CEO ativo. Sistema em verde.", MARGIN, y);
  } else {
    const cols = [
      { label: "Dia", w: 70 },
      { label: "Métrica", w: 120 },
      { label: "Transição", w: 90 },
      { label: "Mensagem", w: 235 },
    ];
    y = drawTableHeader(doc, cols, y);
    payload.alertasCEO.forEach((a, i) => {
      if (y > H - 70) y = novaPagina();
      y = drawTableRow(doc, [
        { value: fmtDataBR(a.dia), w: 70, cor: CORES.petroleo },
        { value: a.metrica, w: 120, cor: CORES.dourado },
        { value: a.tipoTransicao, w: 90, cor: a.tipoTransicao === "PIORA" ? CORES.borgonha : CORES.verdeMusgo },
        { value: a.mensagem, w: 235 },
      ], y, i % 2 === 0);
    });
  }

  doc.end();
  return stream;
}

export async function streamToBuffer(stream: PassThrough): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}
