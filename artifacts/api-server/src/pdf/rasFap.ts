/**
 * RAS FAP — gerador fiel ao modelo PREMIUM/SIMPLES do CEO (anexos 13/06/2026).
 *
 * RAS  = Registro de Administracao de Substancias.
 * FAP  = padrao de ficha do CEO (Fabio/Familia Padua).
 * PDF  = documento.
 *
 * Reproduz o layout landscape A4 de 1+ pagina(s): cabecalho PAWARDS/PADCON,
 * bloco do paciente, matriz do protocolo (substancias x aplicacoes x frequencia
 * x inicio) e a GRADE de aplicacoes (uma linha por data de visita, contador
 * N/total por substancia), com area de assinaturas/carimbos no rodape.
 *
 * Motor pdfkit (mesmo das demais PDFs do sistema) — controle exato de tabela.
 */
import PDFDocument from "pdfkit";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
export interface SubstanciaFap {
  nome: string;            // ex: "COENZIMA Q10"
  dose?: string;           // ex: "200MG"
  sessoes: number;         // total de aplicacoes
  frequenciaDias: number;  // intervalo de repeticao em DIAS
  inicio: Date;            // data da 1a aplicacao
  via?: string;            // ex: "EV", "IM" (opcional)
}

export interface DadosRasFap {
  nome: string;
  cpf?: string;
  celular?: string;
  idade?: string;
  medicoResponsavel: string;
  enfermeira: string;
  unidade: string;
  dataAtendimento: Date;
  protocoloNumero?: string;
  valorTratamento?: number; // em reais
  substancias: SubstanciaFap[];
}

export type ModoRasFap = "PREMIUM" | "SIMPLES";

// ---------------------------------------------------------------------------
// Helpers de data e texto
// ---------------------------------------------------------------------------
function addDays(d: Date, n: number): Date {
  const r = new Date(d.getTime());
  r.setDate(r.getDate() + n);
  return r;
}
function chaveDia(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtData(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function fmtMoeda(v: number): string {
  return `R$ ${v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}
function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ---------------------------------------------------------------------------
// Motor da grade: uma linha por data de visita (uniao das datas de todas as
// substancias). Cada celula = "N/total" se a substancia se aplica naquela data.
// ---------------------------------------------------------------------------
export interface LinhaGrade {
  numero: number;
  data?: Date;
  contadores: (string | null)[]; // por substancia (na ordem do grupo)
}

export function montarGrade(subs: SubstanciaFap[], minLinhas = 20): LinhaGrade[] {
  const todasDatas = new Map<string, Date>();
  const datasPorSub: string[][] = subs.map((s) => {
    const chaves: string[] = [];
    for (let k = 0; k < s.sessoes; k++) {
      const d = addDays(s.inicio, k * s.frequenciaDias);
      const c = chaveDia(d);
      chaves.push(c);
      if (!todasDatas.has(c)) todasDatas.set(c, d);
    }
    return chaves;
  });

  const ordenadas = Array.from(todasDatas.values()).sort((a, b) => a.getTime() - b.getTime());
  const linhas: LinhaGrade[] = ordenadas.map((d, idx) => {
    const c = chaveDia(d);
    const contadores = subs.map((s, si) => {
      const pos = datasPorSub[si].indexOf(c);
      return pos >= 0 ? `${pos + 1}/${s.sessoes}` : null;
    });
    return { numero: idx + 1, data: d, contadores };
  });

  while (linhas.length < minLinhas) {
    linhas.push({ numero: linhas.length + 1, contadores: subs.map(() => null) });
  }
  return linhas;
}

// ---------------------------------------------------------------------------
// Paletas
// ---------------------------------------------------------------------------
interface Paleta {
  ink: string;
  brand: string;
  accent: string;
  labelInk: string;
  border: string;
  gridFill: string;
  protoFill: string;
  protoInk: string;
  zebra: string | null;
  sessaoInk: string;
}
const PALETAS: Record<ModoRasFap, Paleta> = {
  PREMIUM: {
    ink: "#0f172a",
    brand: "#0a2540",
    accent: "#0e7490",
    labelInk: "#475569",
    border: "#7c8ba1",
    gridFill: "#e6f4f8",
    protoFill: "#0a2540",
    protoInk: "#ffffff",
    zebra: "#f3f7fa",
    sessaoInk: "#0e7490",
  },
  SIMPLES: {
    ink: "#000000",
    brand: "#000000",
    accent: "#000000",
    labelInk: "#333333",
    border: "#000000",
    gridFill: "#ffffff",
    protoFill: "#ffffff",
    protoInk: "#000000",
    zebra: null,
    sessaoInk: "#000000",
  },
};

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
const PAGE_W = 841.89;
const PAGE_H = 595.28;
const M = 22;
const CW = PAGE_W - 2 * M;

const COLS_FIXAS = [
  { key: "sem", label: "SEM.", w: 26 },
  { key: "agend", label: "DATA AGEND.", w: 60 },
  { key: "hora", label: "HORA", w: 32 },
  { key: "cienciaPac", label: "CIENCIA / RUBRICA PACIENTE", w: 122 },
  { key: "rubEnf", label: "RUBRICA ENF.", w: 66 },
  { key: "efetiva", label: "DATA EFETIVA", w: 60 },
  { key: "obs", label: "OBS.", w: 62 },
];
const FIXED_W = COLS_FIXAS.reduce((a, c) => a + c.w, 0);

const MAX_SUBS_POR_PAGINA = 5;
const LINHAS_POR_PAGINA = 20;

type Doc = InstanceType<typeof PDFDocument>;

function celula(
  doc: Doc,
  pal: Paleta,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: {
    text?: string;
    fill?: string;
    bold?: boolean;
    size?: number;
    align?: "left" | "center" | "right";
    color?: string;
    border?: boolean;
    wrap?: boolean;
    valign?: "middle" | "top";
  } = {},
) {
  if (opts.fill) doc.rect(x, y, w, h).fill(opts.fill);
  if (opts.border !== false) doc.lineWidth(0.5).rect(x, y, w, h).stroke(pal.border);
  if (opts.text) {
    const size = opts.size ?? 7;
    const wrap = opts.wrap ?? false;
    const ty = opts.valign === "top" ? y + 2.5 : y + (h - size) / 2 - 0.5;
    doc
      .font(opts.bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(size)
      .fillColor(opts.color ?? pal.ink)
      .text(semAcento(opts.text), x + 3, ty, {
        width: w - 6,
        align: opts.align ?? "left",
        lineBreak: wrap,
        height: wrap ? h - 3 : undefined,
        ellipsis: false,
      });
  }
}

function desenharCabecalho(doc: Doc, pal: Paleta, y: number): number {
  doc.font("Helvetica-Bold").fontSize(26).fillColor(pal.brand).text("RAS", M, y - 4, { lineBreak: false });
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(pal.ink)
    .text("REGISTRO DE ADMINISTRACAO DE SUBSTANCIAS", M + 62, y + 7, { lineBreak: false });

  const rEnd = PAGE_W - M;
  doc.font("Helvetica-Bold").fontSize(9).fillColor(pal.brand).text("PAWARDS", rEnd - 320, y, { width: 150, align: "right", lineBreak: false });
  doc.font("Helvetica").fontSize(6.5).fillColor(pal.labelInk).text("Clinical Intelligence System", rEnd - 320, y + 11, { width: 150, align: "right", lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(9).fillColor(pal.brand).text("PADCON", rEnd - 165, y, { width: 165, align: "right", lineBreak: false });
  doc.font("Helvetica").fontSize(6.5).fillColor(pal.labelInk).text("Advanced Systems Architecture", rEnd - 165, y + 11, { width: 165, align: "right", lineBreak: false });

  const yl = y + 24;
  doc.lineWidth(1).moveTo(M, yl).lineTo(PAGE_W - M, yl).stroke(pal.accent);
  return yl + 6;
}

function desenharPaciente(doc: Doc, pal: Paleta, dados: DadosRasFap, y: number): number {
  const rowH = 14;
  const nRows = 5;
  const blocoH = rowH * nRows;
  const half = CW / 2;
  const labelW = 118;

  doc.rect(M, y, CW, blocoH).stroke(pal.border);
  doc.lineWidth(0.5).moveTo(M + half, y).lineTo(M + half, y + blocoH).stroke(pal.border);

  const esq: [string, string][] = [
    ["NOME", dados.nome],
    ["CPF", dados.cpf || ""],
    ["CELULAR", dados.celular || ""],
    ["MEDICO RESPONSAVEL", dados.medicoResponsavel],
    ["PROTOCOLO", dados.protocoloNumero || ""],
  ];
  const dir: [string, string][] = [
    ["IDADE", dados.idade || ""],
    ["ENFERMEIRA", dados.enfermeira],
    ["UNIDADE", dados.unidade],
    ["DATA ATENDIMENTO", fmtData(dados.dataAtendimento)],
    ["VALOR TRATAMENTO", fmtMoeda(dados.valorTratamento || 0)],
  ];

  const linha = (x0: number, idx: number, par: [string, string]) => {
    const ly = y + idx * rowH;
    if (idx > 0) doc.lineWidth(0.3).moveTo(x0, ly).lineTo(x0 + half, ly).stroke("#cfd8e3");
    doc.font("Helvetica-Bold").fontSize(6.5).fillColor(pal.labelInk).text(semAcento(par[0]), x0 + 5, ly + 4, { width: labelW - 8, lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(8).fillColor(pal.ink).text(semAcento(par[1]), x0 + labelW, ly + 3, { width: half - labelW - 6, lineBreak: false });
  };
  esq.forEach((p, i) => linha(M, i, p));
  dir.forEach((p, i) => linha(M + half, i, p));

  return y + blocoH + 6;
}

function desenharProtocolo(doc: Doc, pal: Paleta, grupo: SubstanciaFap[], y: number): number {
  const subW = (CW - FIXED_W) / grupo.length;
  const rowH = 15;

  doc.font("Helvetica-Bold").fontSize(8).fillColor(pal.accent).text("PROTOCOLO", M, y, { lineBreak: false });
  let cy = y + 12;

  const linhas: { label: string; valor: (s: SubstanciaFap) => string; destaque?: boolean }[] = [
    { label: "SUBSTANCIAS", valor: (s) => `${s.nome}${s.dose ? " " + s.dose : ""}`, destaque: true },
    { label: "APLICACOES", valor: (s) => String(s.sessoes) },
    { label: "FREQUENCIA", valor: (s) => `${s.frequenciaDias} / ${s.frequenciaDias} DIAS` },
    { label: "INICIO DA APLICACAO DA SUBSTANCIA", valor: (s) => fmtData(s.inicio) },
  ];

  for (const ln of linhas) {
    const rh = ln.destaque ? 22 : rowH;
    celula(doc, pal, M, cy, FIXED_W, rh, {
      text: ln.label,
      bold: true,
      size: ln.label.length > 18 ? 6.5 : 7.5,
      color: pal.labelInk,
      fill: pal.zebra ?? undefined,
    });
    grupo.forEach((s, i) => {
      const x = M + FIXED_W + i * subW;
      celula(doc, pal, x, cy, subW, rh, {
        text: ln.valor(s),
        bold: true,
        size: ln.destaque ? 7 : 7.5,
        align: "center",
        fill: ln.destaque ? pal.protoFill : pal.gridFill,
        color: ln.destaque ? pal.protoInk : pal.ink,
        wrap: ln.destaque,
        valign: ln.destaque ? "top" : "middle",
      });
    });
    cy += rh;
  }
  return cy + 4;
}

function desenharGrade(
  doc: Doc,
  pal: Paleta,
  grupo: SubstanciaFap[],
  linhas: LinhaGrade[],
  yTopo: number,
  yRodape: number,
): void {
  const subW = (CW - FIXED_W) / grupo.length;
  const headH = 26;
  const rowH = Math.min(15, (yRodape - yTopo - headH) / LINHAS_POR_PAGINA);

  // Cabecalho da grade
  let x = M;
  for (const c of COLS_FIXAS) {
    celula(doc, pal, x, yTopo, c.w, headH, {
      text: c.label,
      bold: true,
      size: 5.8,
      align: "center",
      fill: pal.gridFill,
      color: pal.labelInk,
      wrap: true,
      valign: "top",
    });
    x += c.w;
  }
  grupo.forEach((s, i) => {
    const sx = M + FIXED_W + i * subW;
    celula(doc, pal, sx, yTopo, subW, headH, {
      text: `${s.nome}${s.dose ? " " + s.dose : ""} - SESSAO`,
      bold: true,
      size: 5.8,
      align: "center",
      fill: pal.gridFill,
      color: pal.brand,
      wrap: true,
      valign: "top",
    });
  });

  // Linhas
  let ry = yTopo + headH;
  linhas.forEach((ln, idx) => {
    const zebra = pal.zebra && idx % 2 === 1 ? pal.zebra : undefined;
    let cx = M;
    const fixedVals: Record<string, string> = {
      sem: String(ln.numero),
      agend: ln.data ? fmtData(ln.data) : "",
      hora: "",
      cienciaPac: "",
      rubEnf: "",
      efetiva: "",
      obs: "",
    };
    for (const c of COLS_FIXAS) {
      celula(doc, pal, cx, ry, c.w, rowH, {
        text: fixedVals[c.key],
        size: 6.6,
        align: c.key === "sem" || c.key === "agend" ? "center" : "left",
        bold: c.key === "sem",
        fill: zebra,
      });
      cx += c.w;
    }
    grupo.forEach((s, i) => {
      const sx = M + FIXED_W + i * subW;
      const v = ln.contadores[i];
      celula(doc, pal, sx, ry, subW, rowH, {
        text: v ?? "",
        bold: true,
        size: 7.2,
        align: "center",
        color: pal.sessaoInk,
        fill: zebra,
      });
    });
    ry += rowH;
  });
}

function desenharAssinaturas(doc: Doc, pal: Paleta, dados: DadosRasFap, pageNum: number, totalPages: number): void {
  const y = PAGE_H - M - 34;
  const slots = [
    { label: "ASSINATURA DO PACIENTE", w: 170 },
    { label: "MEDICO RESPONSAVEL", w: 150 },
    { label: "CARIMBO", w: 90 },
    { label: "ENFERMAGEM RESPONSAVEL", w: 170 },
    { label: "CARIMBO", w: 90 },
  ];
  const gap = 12;
  const totalW = slots.reduce((a, s) => a + s.w, 0) + gap * (slots.length - 1);
  let x = M + (CW - totalW) / 2;
  for (const s of slots) {
    doc.lineWidth(0.6).moveTo(x, y).lineTo(x + s.w, y).stroke(pal.border);
    doc.font("Helvetica").fontSize(6.2).fillColor(pal.labelInk).text(semAcento(s.label), x, y + 3, { width: s.w, align: "center", lineBreak: false });
    x += s.w + gap;
  }
  doc
    .font("Helvetica")
    .fontSize(6.5)
    .fillColor(pal.labelInk)
    .text(`PAG. ${pageNum} / ${totalPages}`, PAGE_W - M - 90, PAGE_H - M - 8, { width: 90, align: "right", lineBreak: false });
}

// ---------------------------------------------------------------------------
// Geracao
// ---------------------------------------------------------------------------
function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export function gerarRasFapPdf(dados: DadosRasFap, modo: ModoRasFap = "PREMIUM"): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pal = PALETAS[modo];
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
    const bufs: Buffer[] = [];
    doc.on("data", (b: Buffer) => bufs.push(b));
    doc.on("end", () => resolve(Buffer.concat(bufs)));
    doc.on("error", reject);

    const grupos = chunk(dados.substancias, MAX_SUBS_POR_PAGINA);
    // calcula paginas: cada grupo gera ceil(linhas/LINHAS_POR_PAGINA) paginas.
    // Padding ate 20 linhas e feito POR PAGINA (nao global) — a ultima pagina de
    // um protocolo longo (>20 datas) tambem sai completa com 20 linhas.
    const planoPaginas: { grupo: SubstanciaFap[]; linhas: LinhaGrade[] }[] = [];
    for (const g of grupos) {
      const grade = montarGrade(g, 0); // sem padding global
      const paginasLinhas = chunk(grade, LINHAS_POR_PAGINA);
      if (paginasLinhas.length === 0) paginasLinhas.push([]);
      for (const pl of paginasLinhas) {
        let prox = (pl.length ? pl[pl.length - 1].numero : 0) + 1;
        while (pl.length < LINHAS_POR_PAGINA) {
          pl.push({ numero: prox++, contadores: g.map(() => null) });
        }
        planoPaginas.push({ grupo: g, linhas: pl });
      }
    }
    const totalPages = planoPaginas.length;

    planoPaginas.forEach((p, idx) => {
      if (idx > 0) doc.addPage({ size: "A4", layout: "landscape", margin: 0 });
      let y = M;
      y = desenharCabecalho(doc, pal, y);
      y = desenharPaciente(doc, pal, dados, y);
      y = desenharProtocolo(doc, pal, p.grupo, y);
      const yRodape = PAGE_H - M - 44;
      desenharGrade(doc, pal, p.grupo, p.linhas, y, yRodape);
      desenharAssinaturas(doc, pal, dados, idx + 1, totalPages);
    });

    doc.end();
  });
}
