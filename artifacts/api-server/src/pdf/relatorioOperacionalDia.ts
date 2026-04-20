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

export interface AppointmentResumo {
  hora: string;
  pacienteNome: string;
  profissionalNome: string;
  tipo: string;
  status: string;
}

export interface TaskCardResumo {
  prioridade: string;
  assignedRole: string;
  titulo: string;
  prazoHoras: number | null;
  pacienteNome: string | null;
  status: string;
}

export interface DemandaResumo {
  complexidade: string;
  tipo: string;
  titulo: string;
  pacienteNome: string | null;
  consultorNome: string | null;
  status: string;
}

export interface PayloadOperacionalDia {
  data: string;
  unidadeNome: string;
  geradoEm: string;
  resumo: {
    appointmentsHoje: number;
    appointmentsConfirmados: number;
    appointmentsFaltas: number;
    tasksPendentes: number;
    tasksAtrasadas: number;
    demandasAbertas: number;
    lembretesEnviados: number;
    lembretesFalhos: number;
  };
  appointments: AppointmentResumo[];
  tasks: TaskCardResumo[];
  demandas: DemandaResumo[];
}

const W = 595;
const H = 842;
const MARGIN = 40;

function drawHeader(doc: PDFKit.PDFDocument, p: PayloadOperacionalDia) {
  doc.rect(0, 0, W, 90).fill(CORES.petroleo);
  doc.rect(0, 90, W, 4).fill(CORES.douradoVivo);

  doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.douradoVivo)
    .text("PADCON · MEDCORE · CAPÍTULO V", MARGIN, 18, { characterSpacing: 3 });

  doc.fontSize(20).font("Helvetica-Bold").fillColor(CORES.marfim)
    .text("Operacional do Dia", MARGIN, 32);

  doc.fontSize(10).font("Helvetica").fillColor(CORES.marfim)
    .text(p.unidadeNome, MARGIN, 60);

  doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.douradoVivo)
    .text("PAWARDS", W - MARGIN - 140, 22, { width: 140, align: "right" });
  doc.fontSize(7).font("Helvetica").fillColor(CORES.marfim)
    .text(`Relatório · ${formatDataBR(p.data)}`, W - MARGIN - 140, 40, { width: 140, align: "right" });
  doc.fontSize(6).fillColor(CORES.marfim)
    .text(`Gerado em ${p.geradoEm}`, W - MARGIN - 140, 52, { width: 140, align: "right" });
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
    .text(label.toUpperCase(), x + 10, y + 8, { width: w - 14, characterSpacing: 1.5 });
  doc.fontSize(20).font("Helvetica-Bold").fillColor(cor)
    .text(String(valor), x + 10, y + 22, { width: w - 14 });
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

function formatDataBR(s: string): string {
  if (!s) return "";
  const parts = s.split("-");
  if (parts.length !== 3) return s;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

const STATUS_COR: Record<string, string> = {
  agendado: CORES.petroleo,
  confirmado: CORES.verdeMusgo,
  realizado: CORES.verdeMusgo,
  faltou: CORES.borgonha,
  cancelado: CORES.cinzaClaro,
  pendente: CORES.dourado,
  concluido: CORES.verdeMusgo,
  atrasado: CORES.borgonha,
  aberta: CORES.dourado,
  em_andamento: CORES.petroleo,
};

const PRIO_COR: Record<string, string> = {
  critica: CORES.borgonha,
  alta: CORES.borgonha,
  normal: CORES.petroleo,
  baixa: CORES.cinzaClaro,
};

const COMPLEX_COR: Record<string, string> = {
  vermelha: CORES.borgonha,
  amarela: CORES.dourado,
  verde: CORES.verdeMusgo,
};

export function gerarRelatorioOperacionalDia(payload: PayloadOperacionalDia): PassThrough {
  const doc = new PDFDocument({ size: "A4", margin: MARGIN, autoFirstPage: false });
  const stream = new PassThrough();
  doc.pipe(stream);

  let pageNum = 0;
  const novaPagina = () => {
    doc.addPage();
    pageNum++;
    drawHeader(doc, payload);
    drawFooter(doc, pageNum);
    return 110;
  };

  let y = novaPagina();

  // Citação serif Manifesto
  doc.fontSize(9).font("Helvetica-Oblique").fillColor(CORES.tinta)
    .text(`"O dia operacional bem conduzido é o que separa a clínica de excelência da clínica comum."`, MARGIN, y, {
      width: W - MARGIN * 2, align: "center",
    });
  doc.fontSize(7).font("Helvetica").fillColor(CORES.dourado)
    .text("— Manifesto PADCON 2.0", MARGIN, y + 16, { width: W - MARGIN * 2, align: "center" });
  y += 40;

  // KPIs
  y = drawSectionTitle(doc, "Resumo do Dia", "I · INDICADORES", y);
  const kw = (W - MARGIN * 2 - 18) / 4;
  drawKpiCard(doc, MARGIN, y, kw, "Consultas", payload.resumo.appointmentsHoje, CORES.petroleo);
  drawKpiCard(doc, MARGIN + (kw + 6), y, kw, "Confirmadas", payload.resumo.appointmentsConfirmados, CORES.verdeMusgo);
  drawKpiCard(doc, MARGIN + (kw + 6) * 2, y, kw, "Faltas", payload.resumo.appointmentsFaltas, CORES.borgonha);
  drawKpiCard(doc, MARGIN + (kw + 6) * 3, y, kw, "Tarefas Pend.", payload.resumo.tasksPendentes, CORES.dourado);
  y += 60;
  drawKpiCard(doc, MARGIN, y, kw, "Atrasadas", payload.resumo.tasksAtrasadas, CORES.borgonha);
  drawKpiCard(doc, MARGIN + (kw + 6), y, kw, "Demandas", payload.resumo.demandasAbertas, CORES.petroleo);
  drawKpiCard(doc, MARGIN + (kw + 6) * 2, y, kw, "Lembretes OK", payload.resumo.lembretesEnviados, CORES.verdeMusgo);
  drawKpiCard(doc, MARGIN + (kw + 6) * 3, y, kw, "Lembretes Falha", payload.resumo.lembretesFalhos, CORES.borgonha);
  y += 75;

  // Agenda do dia
  y = drawSectionTitle(doc, `Agenda do Dia · ${payload.appointments.length}`, "II · ATENDIMENTOS", y);
  if (payload.appointments.length === 0) {
    doc.fontSize(9).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro)
      .text("Nenhum atendimento registrado para este dia.", MARGIN, y);
    y += 24;
  } else {
    const colsAg = [
      { label: "Hora", w: 60 },
      { label: "Paciente", w: 170 },
      { label: "Profissional", w: 140 },
      { label: "Tipo", w: 100 },
      { label: "Status", w: 45 },
    ];
    y = drawTableHeader(doc, colsAg, y);
    payload.appointments.forEach((a, i) => {
      if (y > H - 70) y = novaPagina();
      y = drawTableRow(doc, [
        { value: `${a.hora}`, w: 60, cor: CORES.petroleo },
        { value: a.pacienteNome, w: 170 },
        { value: a.profissionalNome, w: 140 },
        { value: a.tipo, w: 100, cor: CORES.dourado },
        { value: a.status, w: 45, cor: STATUS_COR[a.status] || CORES.tinta },
      ], y, i % 2 === 0);
    });
    y += 12;
  }

  // Tasks pendentes
  if (y > H - 200) y = novaPagina();
  y = drawSectionTitle(doc, `Tarefas Pendentes · ${payload.tasks.length}`, "III · DELEGAÇÃO", y);
  if (payload.tasks.length === 0) {
    doc.fontSize(9).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro)
      .text("Nenhuma tarefa pendente.", MARGIN, y);
    y += 24;
  } else {
    const colsTk = [
      { label: "Prio", w: 50 },
      { label: "Papel", w: 90 },
      { label: "Título", w: 220 },
      { label: "Paciente", w: 120 },
      { label: "Prazo", w: 35 },
    ];
    y = drawTableHeader(doc, colsTk, y);
    payload.tasks.forEach((t, i) => {
      if (y > H - 70) y = novaPagina();
      y = drawTableRow(doc, [
        { value: t.prioridade.toUpperCase(), w: 50, cor: PRIO_COR[t.prioridade] || CORES.tinta },
        { value: t.assignedRole, w: 90, cor: CORES.dourado },
        { value: t.titulo, w: 220 },
        { value: t.pacienteNome || "—", w: 120 },
        { value: t.prazoHoras != null ? `${t.prazoHoras}h` : "—", w: 35, cor: CORES.petroleo },
      ], y, i % 2 === 0);
    });
    y += 12;
  }

  // Demandas
  if (y > H - 180) y = novaPagina();
  y = drawSectionTitle(doc, `Demandas Abertas · ${payload.demandas.length}`, "IV · ACOMPANHAMENTO", y);
  if (payload.demandas.length === 0) {
    doc.fontSize(9).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro)
      .text("Nenhuma demanda aberta.", MARGIN, y);
  } else {
    const colsDm = [
      { label: "Compl.", w: 55 },
      { label: "Tipo", w: 90 },
      { label: "Título", w: 200 },
      { label: "Paciente", w: 110 },
      { label: "Consultor", w: 60 },
    ];
    y = drawTableHeader(doc, colsDm, y);
    payload.demandas.forEach((d, i) => {
      if (y > H - 70) y = novaPagina();
      y = drawTableRow(doc, [
        { value: d.complexidade.toUpperCase(), w: 55, cor: COMPLEX_COR[d.complexidade] || CORES.tinta },
        { value: d.tipo, w: 90, cor: CORES.dourado },
        { value: d.titulo, w: 200 },
        { value: d.pacienteNome || "—", w: 110 },
        { value: d.consultorNome || "—", w: 60 },
      ], y, i % 2 === 0);
    });
  }

  doc.end();
  return stream;
}
