import PDFDocument from "pdfkit";

function removeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function clean(str: string): string {
  return removeAccents(str).toUpperCase();
}

function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  return cpf;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

interface SubstanciaRAS {
  nome: string;
  abreviacao: string;
  qtde: number;
  frequenciaDias: number;
  dataInicio: string;
  via: string;
  cor: string;
  dosePadrao: string;
  categoria: string;
  descricao: string;
  funcaoPrincipal: string;
  efeitosPercebidos: string;
  tempoParaEfeito: string;
  beneficioLongevidade: string;
  impactoQualidadeVida: string;
  beneficioSono: string;
  beneficioEnergia: string;
  beneficioLibido: string;
  performanceFisica: string;
  forcaMuscular: string;
  clarezaMental: string;
  peleCabeloUnhas: string;
  suporteImunologico: string;
  contraindicacoes: string;
  evidenciaCientifica: string;
  efeitosSistemasCorporais: Record<string, number>;
}

interface MarcacaoData {
  numero: number;
  dataPrevista: string;
  dataEfetiva: string;
  statusPorSubstancia: Array<{
    substanciaIndex: number;
    numeroSessao: number;
    totalSessoes: number;
    status: string;
  }>;
}

interface TratamentoFinanceiroRAS {
  nome: string;
  valorBruto: number;
  desconto: number;
  valorFinal: number;
  numeroParcelas: number;
  dataInicio: string;
  itens: Array<{
    descricao: string;
    tipo: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
  }>;
}

interface DadosRAS {
  nomePaciente: string;
  cpfPaciente: string;
  celularPaciente: string;
  idadePaciente: number | null;
  medicoResponsavel: string;
  crmMedico: string;
  enfermeira: string;
  agenda: string;
  unidadeEndereco: string;
  dataAtendimento: string;
  substancias: SubstanciaRAS[];
  marcacoes: MarcacaoData[];
  nomeProtocolo: string;
  tratamentoFinanceiro?: TratamentoFinanceiroRAS;
}

const LEFT = 30;
const TOP = 25;
const PAGE_HEIGHT = 595.28;
const PAGE_WIDTH = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - LEFT * 2;

const COLORS = {
  headerBg: "#2C3E50",
  headerText: "#FFFFFF",
  labelBg: "#F5F5F5",
  gridBorder: "#999999",
  gridLight: "#DDDDDD",
  textDark: "#111111",
  textMedium: "#444444",
  textLight: "#888888",
  accent: "#1A5276",
  white: "#FFFFFF",
  statusPendente: "#FFF9C4",
  statusAplicada: "#C8E6C9",
  statusNaoAplicada: "#FFCDD2",
  rowAlt: "#FAFAFA",
};

function drawRASHeader(doc: InstanceType<typeof PDFDocument>, dados: DadosRAS, pageNum: number, totalPages: number) {
  const y = TOP;

  doc.save();
  doc.rect(LEFT, y, CONTENT_WIDTH, 22).fill(COLORS.headerBg);
  doc.restore();

  doc.fontSize(11).font("Helvetica-Bold").fillColor(COLORS.headerText);
  doc.text("RAS - REGISTRO ADMINISTRACAO DE SUBSTANCIAS", LEFT + 8, y + 6, { width: CONTENT_WIDTH - 120 });
  doc.fontSize(7).font("Helvetica").fillColor(COLORS.headerText);
  doc.text(`pag ${pageNum}/${totalPages}`, LEFT + CONTENT_WIDTH - 80, y + 8, { width: 72, align: "right" });

  const infoY = y + 26;
  const colW = CONTENT_WIDTH / 2;
  const rowH = 14;

  doc.rect(LEFT, infoY, colW, rowH * 4).stroke(COLORS.gridBorder);
  doc.rect(LEFT + colW, infoY, colW, rowH * 4).stroke(COLORS.gridBorder);

  const fields = [
    { label: "NOME", value: clean(dados.nomePaciente) },
    { label: "CPF", value: formatCPF(dados.cpfPaciente) },
    { label: "CELULAR", value: formatPhone(dados.celularPaciente) },
    { label: "MEDICO RESPONSAVEL", value: clean(dados.medicoResponsavel) },
  ];
  const fieldsRight = [
    { label: "IDADE", value: dados.idadePaciente ? `${dados.idadePaciente} ANOS` : "N/A" },
    { label: "ENFERMEIRA", value: clean(dados.enfermeira) },
    { label: "UNIDADE", value: clean(dados.agenda) },
    { label: "DATA ATENDIMENTO", value: formatDate(dados.dataAtendimento) },
  ];

  fields.forEach((f, i) => {
    const fy = infoY + i * rowH;
    doc.moveTo(LEFT, fy).lineTo(LEFT + colW, fy).stroke(COLORS.gridLight);
    doc.fontSize(6).font("Helvetica-Bold").fillColor(COLORS.textMedium);
    doc.text(f.label, LEFT + 4, fy + 3, { width: 110 });
    doc.fontSize(7.5).font("Helvetica").fillColor(COLORS.textDark);
    doc.text(f.value, LEFT + 120, fy + 3, { width: colW - 128 });
  });

  fieldsRight.forEach((f, i) => {
    const fy = infoY + i * rowH;
    doc.moveTo(LEFT + colW, fy).lineTo(LEFT + CONTENT_WIDTH, fy).stroke(COLORS.gridLight);
    doc.fontSize(6).font("Helvetica-Bold").fillColor(COLORS.textMedium);
    doc.text(f.label, LEFT + colW + 4, fy + 3, { width: 110 });
    doc.fontSize(7.5).font("Helvetica").fillColor(COLORS.textDark);
    doc.text(f.value, LEFT + colW + 120, fy + 3, { width: colW - 128 });
  });

  doc.fillColor(COLORS.textDark);
  return infoY + rowH * 4 + 4;
}

function drawProtocolHeader(doc: InstanceType<typeof PDFDocument>, dados: DadosRAS, startY: number) {
  let y = startY;
  const subs = dados.substancias;
  const numSubs = subs.length;

  doc.save();
  doc.rect(LEFT, y, CONTENT_WIDTH, 16).fill(COLORS.labelBg);
  doc.restore();
  doc.rect(LEFT, y, CONTENT_WIDTH, 16).stroke(COLORS.gridBorder);
  doc.fontSize(7.5).font("Helvetica-Bold").fillColor(COLORS.accent);
  doc.text("Protocolo Medicamento", LEFT + 4, y + 4);

  const fixedColsWidth = 280;
  const substAreaWidth = CONTENT_WIDTH - fixedColsWidth;
  const substColW = numSubs > 0 ? Math.min(substAreaWidth / numSubs, 90) : 80;

  subs.forEach((sub, i) => {
    const sx = LEFT + fixedColsWidth + i * substColW;
    doc.save();
    const hexColor = sub.cor || "#3B82F6";
    doc.rect(sx, y, substColW, 16).fill(hexColor);
    doc.restore();
    doc.rect(sx, y, substColW, 16).stroke(COLORS.gridBorder);
    doc.fontSize(7).font("Helvetica-Bold").fillColor(COLORS.white);
    doc.text(sub.abreviacao || sub.nome.substring(0, 8), sx + 2, y + 4, {
      width: substColW - 4,
      align: "center",
    });
  });

  y += 16;
  const detailRows = [
    { label: "Numero de Aplicacoes", getter: (s: SubstanciaRAS) => `Qtde  ${s.qtde}` },
    { label: "Frequencia de Aplicacoes", getter: (s: SubstanciaRAS) => `Dias  ${s.frequenciaDias}` },
    { label: "Data Inicio por Substancia", getter: (s: SubstanciaRAS) => formatDate(s.dataInicio) },
  ];

  detailRows.forEach((row) => {
    doc.rect(LEFT, y, fixedColsWidth, 12).stroke(COLORS.gridLight);
    doc.fontSize(6).font("Helvetica").fillColor(COLORS.textMedium);
    doc.text(row.label, LEFT + 8, y + 3, { width: fixedColsWidth - 12 });

    subs.forEach((sub, i) => {
      const sx = LEFT + fixedColsWidth + i * substColW;
      doc.rect(sx, y, substColW, 12).stroke(COLORS.gridLight);
      doc.fontSize(6.5).font("Helvetica").fillColor(COLORS.textDark);
      doc.text(row.getter(sub), sx + 2, y + 3, { width: substColW - 4, align: "center" });
    });
    y += 12;
  });

  return { y, fixedColsWidth, substColW };
}

function drawMarcacoesGrid(
  doc: InstanceType<typeof PDFDocument>,
  dados: DadosRAS,
  marcacoes: MarcacaoData[],
  startY: number,
  fixedColsWidth: number,
  substColW: number
) {
  let y = startY + 2;
  const subs = dados.substancias;
  const numSubs = subs.length;

  const cols = [
    { label: "AGENDA\nMENTO", width: 30 },
    { label: "CIENCIA E\nASSINATURA", width: 65 },
    { label: "ENF", width: 25 },
    { label: "DATA\nPREVISTA", width: 60 },
    { label: "DATA\nEFETIVA", width: 60 },
  ];
  const statusColLabel = "STATUS\nSESSAO";
  const fixedW = cols.reduce((s, c) => s + c.width, 0);
  const remainingFixed = fixedColsWidth - fixedW;

  doc.save();
  doc.rect(LEFT, y, CONTENT_WIDTH, 20).fill(COLORS.headerBg);
  doc.restore();

  let cx = LEFT;
  cols.forEach((col) => {
    doc.rect(cx, y, col.width, 20).stroke(COLORS.gridBorder);
    doc.fontSize(5).font("Helvetica-Bold").fillColor(COLORS.headerText);
    doc.text(col.label, cx + 2, y + 3, { width: col.width - 4, align: "center" });
    cx += col.width;
  });

  if (remainingFixed > 0) {
    cx += remainingFixed;
  }

  subs.forEach((sub, i) => {
    const sx = LEFT + fixedColsWidth + i * substColW;
    doc.save();
    doc.rect(sx, y, substColW, 20).fill(sub.cor || "#3B82F6");
    doc.restore();
    doc.rect(sx, y, substColW, 20).stroke(COLORS.gridBorder);
    doc.fontSize(5).font("Helvetica-Bold").fillColor(COLORS.white);
    doc.text(statusColLabel, sx + 2, y + 3, { width: substColW - 4, align: "center" });
  });

  y += 20;
  const rowH = 28;

  marcacoes.forEach((marc, rowIdx) => {
    const rowY = y + rowIdx * rowH;
    const isAlt = rowIdx % 2 === 1;

    if (isAlt) {
      doc.save();
      doc.rect(LEFT, rowY, CONTENT_WIDTH, rowH).fill(COLORS.rowAlt);
      doc.restore();
    }

    doc.rect(LEFT, rowY, CONTENT_WIDTH, rowH).stroke(COLORS.gridLight);

    let rx = LEFT;

    doc.rect(rx, rowY, cols[0].width, rowH).stroke(COLORS.gridLight);
    doc.fontSize(8).font("Helvetica-Bold").fillColor(COLORS.textDark);
    doc.text(String(marc.numero), rx + 2, rowY + 9, { width: cols[0].width - 4, align: "center" });
    rx += cols[0].width;

    doc.rect(rx, rowY, cols[1].width, rowH).stroke(COLORS.gridLight);
    rx += cols[1].width;

    doc.rect(rx, rowY, cols[2].width, rowH).stroke(COLORS.gridLight);
    rx += cols[2].width;

    doc.rect(rx, rowY, cols[3].width, rowH).stroke(COLORS.gridLight);
    doc.fontSize(6.5).font("Helvetica").fillColor(COLORS.textDark);
    doc.text(formatDate(marc.dataPrevista), rx + 2, rowY + 10, { width: cols[3].width - 4, align: "center" });
    rx += cols[3].width;

    doc.rect(rx, rowY, cols[4].width, rowH).stroke(COLORS.gridLight);
    if (marc.dataEfetiva) {
      doc.text(formatDate(marc.dataEfetiva), rx + 2, rowY + 10, { width: cols[4].width - 4, align: "center" });
    }
    rx += cols[4].width;

    subs.forEach((sub, i) => {
      const sx = LEFT + fixedColsWidth + i * substColW;
      const substStatus = marc.statusPorSubstancia.find((s) => s.substanciaIndex === i);

      let cellBg = COLORS.white;
      let cellText = "";
      if (substStatus) {
        cellText = `${substStatus.numeroSessao} / ${substStatus.totalSessoes}`;
        if (substStatus.status === "aplicada") {
          cellBg = COLORS.statusAplicada;
        } else if (substStatus.status === "nao_aplicada") {
          cellBg = COLORS.statusNaoAplicada;
        } else if (substStatus.status === "pendente") {
          cellBg = COLORS.statusPendente;
        }
      }

      if (cellBg !== COLORS.white) {
        doc.save();
        doc.rect(sx, rowY, substColW, rowH).fill(cellBg);
        doc.restore();
      }
      doc.rect(sx, rowY, substColW, rowH).stroke(COLORS.gridBorder);

      if (cellText) {
        doc.fontSize(7).font("Helvetica-Bold").fillColor(COLORS.textDark);
        doc.text(cellText, sx + 2, rowY + 10, { width: substColW - 4, align: "center" });
      }
    });
  });

  return y + marcacoes.length * rowH;
}

function drawSignatureArea(doc: InstanceType<typeof PDFDocument>, dados: DadosRAS, startY: number) {
  let y = startY + 15;

  const sigW = CONTENT_WIDTH / 3;
  const sigs = [
    { label: "Paciente:", name: clean(dados.nomePaciente) },
    { label: "Medico Resp.:", name: `${clean(dados.medicoResponsavel)}\n${dados.crmMedico}` },
    { label: "Enfermeiro Resp.:", name: clean(dados.enfermeira) },
  ];

  sigs.forEach((sig, i) => {
    const sx = LEFT + i * sigW;
    const lineY = y + 25;
    doc.moveTo(sx + 10, lineY).lineTo(sx + sigW - 10, lineY).stroke(COLORS.gridBorder);
    doc.fontSize(7).font("Helvetica-Bold").fillColor(COLORS.textDark);
    doc.text(sig.label, sx + 10, lineY + 4, { width: sigW - 20 });
    doc.fontSize(6.5).font("Helvetica").fillColor(COLORS.textMedium);
    doc.text(sig.name, sx + 10, lineY + 14, { width: sigW - 20 });
  });

  return y + 60;
}

function drawSubstanciaInfoPage(doc: InstanceType<typeof PDFDocument>, dados: DadosRAS) {
  let y = TOP;

  doc.save();
  doc.rect(LEFT, y, CONTENT_WIDTH, 22).fill(COLORS.headerBg);
  doc.restore();
  doc.fontSize(10).font("Helvetica-Bold").fillColor(COLORS.headerText);
  doc.text("INFORMACOES DAS SUBSTANCIAS - MATRIZ FUNCIONAL", LEFT + 8, y + 6);
  y += 28;

  const subs = dados.substancias;

  subs.forEach((sub) => {
    if (y > PAGE_HEIGHT - 100) {
      doc.addPage({ layout: "landscape", size: "A4" });
      y = TOP;
    }

    doc.save();
    doc.rect(LEFT, y, CONTENT_WIDTH, 14).fill(sub.cor || "#3B82F6");
    doc.restore();
    doc.rect(LEFT, y, CONTENT_WIDTH, 14).stroke(COLORS.gridBorder);
    doc.fontSize(8).font("Helvetica-Bold").fillColor(COLORS.white);
    doc.text(`${clean(sub.nome)} (${clean(sub.via)}) - ${sub.dosePadrao || ""}`, LEFT + 6, y + 3);
    y += 14;

    const viaLabel = sub.via === "iv" ? "Endovenoso" : sub.via === "im" ? "Intramuscular" : sub.via === "implant" ? "Implante" : sub.via === "oral" ? "Oral" : "Topico";
    const infoLines = [
      `Categoria: ${clean(sub.categoria)} | Via: ${clean(viaLabel)} | Frequencia: a cada ${sub.frequenciaDias} dias`,
      sub.funcaoPrincipal ? `Funcao Principal: ${sub.funcaoPrincipal}` : "",
      sub.descricao ? `Descricao: ${sub.descricao}` : "",
      sub.efeitosPercebidos ? `Efeitos Percebidos: ${sub.efeitosPercebidos}` : "",
      sub.tempoParaEfeito ? `Tempo para Efeito: ${sub.tempoParaEfeito}` : "",
      sub.beneficioLongevidade ? `Longevidade: ${sub.beneficioLongevidade}` : "",
      sub.beneficioEnergia ? `Energia: ${sub.beneficioEnergia}` : "",
      sub.beneficioSono ? `Sono: ${sub.beneficioSono}` : "",
      sub.clarezaMental ? `Clareza Mental: ${sub.clarezaMental}` : "",
      sub.performanceFisica ? `Performance Fisica: ${sub.performanceFisica}` : "",
      sub.forcaMuscular ? `Forca Muscular: ${sub.forcaMuscular}` : "",
      sub.peleCabeloUnhas ? `Pele/Cabelo/Unhas: ${sub.peleCabeloUnhas}` : "",
      sub.suporteImunologico ? `Suporte Imunologico: ${sub.suporteImunologico}` : "",
      sub.beneficioLibido ? `Libido: ${sub.beneficioLibido}` : "",
      sub.impactoQualidadeVida ? `Qualidade de Vida: ${sub.impactoQualidadeVida}` : "",
      sub.evidenciaCientifica ? `Evidencia Cientifica: ${sub.evidenciaCientifica}` : "",
      sub.contraindicacoes ? `Contraindicacoes: ${sub.contraindicacoes}` : "",
    ].filter(Boolean);

    doc.rect(LEFT, y, CONTENT_WIDTH, Math.max(infoLines.length * 9 + 4, 20)).stroke(COLORS.gridLight);
    doc.fontSize(6).font("Helvetica").fillColor(COLORS.textDark);
    infoLines.forEach((line, li) => {
      doc.text(line, LEFT + 6, y + 2 + li * 9, { width: CONTENT_WIDTH - 12 });
    });
    y += Math.max(infoLines.length * 9 + 6, 22);
  });

  y += 10;
  if (y > PAGE_HEIGHT - 200) {
    doc.addPage({ layout: "landscape", size: "A4" });
    y = TOP;
  }

  doc.save();
  doc.rect(LEFT, y, CONTENT_WIDTH, 18).fill(COLORS.accent);
  doc.restore();
  doc.fontSize(9).font("Helvetica-Bold").fillColor(COLORS.white);
  doc.text("MATRIZ DE IMPACTO POR SISTEMA CORPORAL", LEFT + 8, y + 4);
  y += 22;

  const sistemas = [
    "Cardiovascular", "Neurologico", "Metabolismo", "Imunologico",
    "Endocrino", "Musculoesqueletico", "Dermatologico", "Hepatico",
    "Renal", "Respiratorio", "Gastrointestinal", "Reprodutivo",
  ];

  const labelColW = 100;
  const matrixSubColW = subs.length > 0 ? Math.min((CONTENT_WIDTH - labelColW) / subs.length, 80) : 60;

  doc.save();
  doc.rect(LEFT, y, labelColW, 16).fill(COLORS.labelBg);
  doc.restore();
  doc.rect(LEFT, y, labelColW, 16).stroke(COLORS.gridBorder);
  doc.fontSize(6).font("Helvetica-Bold").fillColor(COLORS.textDark);
  doc.text("SISTEMA CORPORAL", LEFT + 4, y + 4);

  subs.forEach((sub, i) => {
    const sx = LEFT + labelColW + i * matrixSubColW;
    doc.save();
    doc.rect(sx, y, matrixSubColW, 16).fill(sub.cor || "#3B82F6");
    doc.restore();
    doc.rect(sx, y, matrixSubColW, 16).stroke(COLORS.gridBorder);
    doc.fontSize(6).font("Helvetica-Bold").fillColor(COLORS.white);
    doc.text(sub.abreviacao || sub.nome.substring(0, 8), sx + 2, y + 4, {
      width: matrixSubColW - 4,
      align: "center",
    });
  });
  y += 16;

  sistemas.forEach((sistema, sysIdx) => {
    const rh = 14;
    const isAlt = sysIdx % 2 === 0;

    if (isAlt) {
      doc.save();
      doc.rect(LEFT, y, labelColW + subs.length * matrixSubColW, rh).fill(COLORS.rowAlt);
      doc.restore();
    }

    doc.rect(LEFT, y, labelColW, rh).stroke(COLORS.gridLight);
    doc.fontSize(6).font("Helvetica").fillColor(COLORS.textDark);
    doc.text(clean(sistema), LEFT + 4, y + 3);

    subs.forEach((sub, i) => {
      const sx = LEFT + labelColW + i * matrixSubColW;
      doc.rect(sx, y, matrixSubColW, rh).stroke(COLORS.gridLight);

      const efeitoKey = sistema.toLowerCase();
      const pct = sub.efeitosSistemasCorporais?.[efeitoKey];
      if (pct && Number(pct) > 0) {
        const pctNum = Number(pct);
        let pctColor = "#4CAF50";
        if (pctNum >= 30) pctColor = "#2E7D32";
        else if (pctNum >= 15) pctColor = "#66BB6A";
        else pctColor = "#A5D6A7";

        doc.fontSize(6.5).font("Helvetica-Bold").fillColor(pctColor);
        doc.text(`+${pctNum}%`, sx + 2, y + 3, { width: matrixSubColW - 4, align: "center" });
      }
    });
    y += rh;
  });

  const beneficioRows = [
    { label: "TEMPO PARA EFEITO", getter: (s: SubstanciaRAS) => s.tempoParaEfeito || "-" },
    { label: "LONGEVIDADE", getter: (s: SubstanciaRAS) => s.beneficioLongevidade || "-" },
    { label: "QUALIDADE DE VIDA", getter: (s: SubstanciaRAS) => s.impactoQualidadeVida || "-" },
    { label: "SONO", getter: (s: SubstanciaRAS) => s.beneficioSono || "-" },
    { label: "ENERGIA", getter: (s: SubstanciaRAS) => s.beneficioEnergia || "-" },
    { label: "CLAREZA MENTAL", getter: (s: SubstanciaRAS) => s.clarezaMental || "-" },
    { label: "PERFORMANCE FISICA", getter: (s: SubstanciaRAS) => s.performanceFisica || "-" },
  ];

  y += 6;
  beneficioRows.forEach((row, ri) => {
    if (y > PAGE_HEIGHT - 30) {
      doc.addPage({ layout: "landscape", size: "A4" });
      y = TOP;
    }
    const rh = 14;
    const isAlt = ri % 2 === 0;
    if (isAlt) {
      doc.save();
      doc.rect(LEFT, y, labelColW + subs.length * matrixSubColW, rh).fill(COLORS.rowAlt);
      doc.restore();
    }

    doc.rect(LEFT, y, labelColW, rh).stroke(COLORS.gridLight);
    doc.fontSize(5.5).font("Helvetica-Bold").fillColor(COLORS.accent);
    doc.text(row.label, LEFT + 4, y + 3);

    subs.forEach((sub, i) => {
      const sx = LEFT + labelColW + i * matrixSubColW;
      doc.rect(sx, y, matrixSubColW, rh).stroke(COLORS.gridLight);
      doc.fontSize(5).font("Helvetica").fillColor(COLORS.textDark);
      const val = row.getter(sub);
      doc.text(val.substring(0, 30), sx + 2, y + 3, { width: matrixSubColW - 4, align: "center" });
    });
    y += rh;
  });

  return y;
}

function drawConsentPage(doc: InstanceType<typeof PDFDocument>, dados: DadosRAS) {
  let y = TOP;

  doc.save();
  doc.rect(LEFT, y, CONTENT_WIDTH, 22).fill(COLORS.headerBg);
  doc.restore();
  doc.fontSize(10).font("Helvetica-Bold").fillColor(COLORS.headerText);
  doc.text("TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO", LEFT + 8, y + 6);
  y += 30;

  const sections = [
    {
      title: "1. CONSENTIMENTO PARA TERAPIA ENDOVENOSA (IV)",
      text: `Eu, ${clean(dados.nomePaciente)}, portador(a) do CPF ${formatCPF(dados.cpfPaciente)}, declaro que fui devidamente informado(a) pelo(a) Dr(a). ${clean(dados.medicoResponsavel)} (${dados.crmMedico}) sobre os procedimentos de terapia endovenosa (IV) aos quais serei submetido(a), incluindo a administracao de substancias por via intravenosa.

Estou ciente de que a terapia endovenosa consiste na infusao direta de substancias terapeuticas na corrente sanguinea, e que os beneficios esperados incluem maior biodisponibilidade, efeito terapeutico mais rapido e eficaz. Fui informado(a) sobre os possiveis efeitos colaterais, que podem incluir: dor ou desconforto no local da puncao, hematoma, flebite (inflamacao da veia), reacoes alergicas, alteracoes na pressao arterial, tontura, nauseas, e em casos raros, reacoes anafilaticas.

Compreendo que o profissional de saude responsavel pela aplicacao tomara todas as medidas de seguranca necessarias, incluindo avaliacao previa, monitoramento durante o procedimento e orientacoes pos-aplicacao.`,
    },
    {
      title: "2. CONSENTIMENTO PARA TERAPIA INTRAMUSCULAR (IM)",
      text: `Declaro ter sido informado(a) sobre os procedimentos de aplicacao intramuscular das substancias prescritas no protocolo terapeutico personalizado. A via intramuscular permite a administracao de substancias no tecido muscular, proporcionando absorcao gradual e sustentada.

Os possiveis efeitos colaterais incluem: dor no local da aplicacao, nodulacao, hematoma, raramente abscesso ou reacao alergica local. Estou ciente de que devo informar imediatamente a equipe medica em caso de qualquer reacao adversa, dor intensa ou sinais de infeccao no local da aplicacao.`,
    },
    {
      title: "3. CONSENTIMENTO PARA FORMULACOES ORAIS E TOPICAS",
      text: `Fui orientado(a) sobre as formulacoes magistrais prescritas para uso oral e/ou topico, incluindo suas indicacoes, posologia, possíveis interacoes medicamentosas e efeitos colaterais. Compreendo que as formulacoes sao personalizadas e preparadas em farmacia de manipulacao conforme prescricao medica individualizada.

Comprometo-me a seguir rigorosamente as orientacoes de uso, armazenamento e posologia, e a comunicar imediatamente ao medico responsavel qualquer efeito adverso ou intercorrencia.`,
    },
    {
      title: "4. CONSENTIMENTO PARA IMPLANTES HORMONAIS E TERAPEUTICOS",
      text: `Declaro ter sido esclarecido(a) sobre o procedimento de implantacao subcutanea de pellets/implantes terapeuticos, incluindo: a natureza do procedimento cirurgico (minimamente invasivo), os riscos inerentes (infeccao, extracao, encapsulamento, deslocamento do implante), o tempo de liberacao gradual das substancias, a necessidade de acompanhamento laboratorial periodico, e os beneficios terapeuticos esperados.

Estou ciente de que os implantes sao inseridos mediante anestesia local e que o procedimento requer cuidados pos-operatorios especificos que me foram detalhadamente explicados.`,
    },
    {
      title: "5. DECLARACAO GERAL",
      text: `Declaro que todas as informacoes sobre meu historico de saude, alergias, medicamentos em uso e condicoes preexistentes foram por mim fornecidas de forma veridica e completa. Autorizo a equipe medica a realizar os procedimentos descritos neste protocolo e estou ciente de que posso revogar este consentimento a qualquer momento, mediante comunicacao escrita ao medico responsavel.

Declaro ainda que recebi copia deste documento, que todas as minhas duvidas foram esclarecidas, e que consinto de forma livre, voluntaria e esclarecida com a realizacao do tratamento proposto.

Os resultados variam individualmente e nao ha garantia de resultados especificos. O acompanhamento medico regular e fundamental para a seguranca e eficacia do tratamento.`,
    },
  ];

  sections.forEach((section) => {
    if (y > PAGE_HEIGHT - 120) {
      doc.addPage({ layout: "landscape", size: "A4" });
      y = TOP;
    }

    doc.fontSize(8).font("Helvetica-Bold").fillColor(COLORS.accent);
    doc.text(section.title, LEFT, y, { width: CONTENT_WIDTH });
    y += 14;

    doc.fontSize(6.5).font("Helvetica").fillColor(COLORS.textDark);
    const textHeight = doc.heightOfString(section.text, { width: CONTENT_WIDTH - 20, lineGap: 1.5 });
    doc.text(section.text, LEFT + 10, y, { width: CONTENT_WIDTH - 20, lineGap: 1.5 });
    y += textHeight + 12;
  });

  y += 10;
  if (y > PAGE_HEIGHT - 100) {
    doc.addPage({ layout: "landscape", size: "A4" });
    y = TOP + 20;
  }

  const sigW = CONTENT_WIDTH / 2;

  doc.fontSize(7).font("Helvetica").fillColor(COLORS.textDark);
  doc.text(`Local: ________________________________  Data: ____/____/________`, LEFT, y);
  y += 30;

  const lineW = sigW - 40;

  doc.moveTo(LEFT + 10, y).lineTo(LEFT + 10 + lineW, y).stroke(COLORS.gridBorder);
  doc.moveTo(LEFT + sigW + 10, y).lineTo(LEFT + sigW + 10 + lineW, y).stroke(COLORS.gridBorder);

  doc.fontSize(7).font("Helvetica-Bold").fillColor(COLORS.textDark);
  doc.text("Assinatura do Paciente", LEFT + 10, y + 4, { width: lineW });
  doc.text(`${clean(dados.medicoResponsavel)} - ${dados.crmMedico}`, LEFT + sigW + 10, y + 4, { width: lineW });

  doc.fontSize(6).font("Helvetica").fillColor(COLORS.textMedium);
  doc.text(clean(dados.nomePaciente), LEFT + 10, y + 14, { width: lineW });
  doc.text(`CPF: ${formatCPF(dados.cpfPaciente)}`, LEFT + 10, y + 22, { width: lineW });

  y += 40;

  doc.fontSize(5).font("Helvetica").fillColor(COLORS.textLight);
  doc.text(
    `PADCOM V15 - Motor Clinico | Documento gerado eletronicamente em ${new Date().toLocaleDateString("pt-BR")} | ${clean(dados.agenda)}`,
    LEFT,
    y,
    { width: CONTENT_WIDTH, align: "center" }
  );

  return y;
}

function drawFinancialContractPage(doc: InstanceType<typeof PDFDocument>, dados: DadosRAS) {
  const totalPages = dados.tratamentoFinanceiro ? 5 : 4;
  let y = drawRASHeader(doc, dados, totalPages, totalPages);
  y += 5;

  const trat = dados.tratamentoFinanceiro!;
  const fmtMoney = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  doc.save();
  doc.rect(LEFT, y, CONTENT_WIDTH, 18).fill(COLORS.accent);
  doc.restore();
  doc.fontSize(9).font("Helvetica-Bold").fillColor(COLORS.white);
  doc.text("CONTRATO FINANCEIRO E CONDICOES DO TRATAMENTO", LEFT + 8, y + 4, { width: CONTENT_WIDTH - 16 });
  y += 24;

  doc.fontSize(7).font("Helvetica-Bold").fillColor(COLORS.textDark);
  doc.text("1. IDENTIFICACAO DAS PARTES", LEFT + 5, y);
  y += 12;

  doc.fontSize(6.5).font("Helvetica").fillColor(COLORS.textDark);
  const contratoPartes = [
    `CONTRATANTE: ${clean(dados.nomePaciente)}, CPF: ${formatCPF(dados.cpfPaciente)}, Telefone: ${formatPhone(dados.celularPaciente)}`,
    `CONTRATADA: CLINICA PADUA MEDICINA INTEGRATIVA, sob responsabilidade de ${clean(dados.medicoResponsavel)} - ${dados.crmMedico}`,
    `TRATAMENTO: ${clean(trat.nome)} | Protocolo: ${clean(dados.nomeProtocolo)}`,
    `DATA DE INICIO: ${formatDate(trat.dataInicio)} | UNIDADE: ${clean(dados.agenda)}`,
  ];
  contratoPartes.forEach(line => {
    doc.text(line, LEFT + 10, y, { width: CONTENT_WIDTH - 20, lineGap: 1 });
    y += 10;
  });
  y += 6;

  doc.fontSize(7).font("Helvetica-Bold").fillColor(COLORS.textDark);
  doc.text("2. COMPOSICAO DO TRATAMENTO E CUSTOS", LEFT + 5, y);
  y += 14;

  const colWidths = [CONTENT_WIDTH * 0.35, CONTENT_WIDTH * 0.15, CONTENT_WIDTH * 0.12, CONTENT_WIDTH * 0.14, CONTENT_WIDTH * 0.12, CONTENT_WIDTH * 0.12];
  const headers = ["ITEM", "TIPO", "QTDE", "VALOR UNIT.", "TOTAL", ""];
  const tableX = LEFT + 5;
  const rowH = 14;

  doc.save();
  doc.rect(tableX, y, CONTENT_WIDTH - 10, rowH).fill(COLORS.headerBg);
  doc.restore();
  doc.fontSize(6).font("Helvetica-Bold").fillColor(COLORS.white);
  let xPos = tableX + 4;
  headers.forEach((h, i) => {
    if (i < colWidths.length) {
      doc.text(h, xPos, y + 3, { width: colWidths[i] - 8 });
      xPos += colWidths[i];
    }
  });
  y += rowH;

  const tipoLabels: Record<string, string> = {
    substancia: "Substancia",
    insumo: "Insumo",
    taxa_administrativa: "Taxa Adm.",
    reserva_tecnica: "Reserva Tecnica",
    honorario_medico: "Hon. Medico",
    honorario_enfermagem: "Hon. Enfermagem",
  };

  trat.itens.forEach((item, idx) => {
    const bg = idx % 2 === 0 ? COLORS.white : COLORS.rowAlt;
    doc.save();
    doc.rect(tableX, y, CONTENT_WIDTH - 10, rowH).fill(bg);
    doc.rect(tableX, y, CONTENT_WIDTH - 10, rowH).stroke(COLORS.gridLight);
    doc.restore();

    doc.fontSize(6).font("Helvetica").fillColor(COLORS.textDark);
    xPos = tableX + 4;
    const vals = [
      clean(item.descricao),
      tipoLabels[item.tipo] || item.tipo,
      item.quantidade.toString(),
      fmtMoney(item.valorUnitario),
      fmtMoney(item.valorTotal),
    ];
    vals.forEach((v, i) => {
      doc.text(v, xPos, y + 3, { width: colWidths[i] - 8 });
      xPos += colWidths[i];
    });
    y += rowH;
  });

  y += 4;
  doc.save();
  doc.rect(tableX, y, CONTENT_WIDTH - 10, rowH + 4).fill(COLORS.labelBg);
  doc.rect(tableX, y, CONTENT_WIDTH - 10, rowH + 4).stroke(COLORS.gridBorder);
  doc.restore();

  doc.fontSize(7).font("Helvetica-Bold").fillColor(COLORS.textDark);
  const sumX = tableX + colWidths[0] + colWidths[1] + colWidths[2];
  doc.text("VALOR BRUTO:", sumX + 4, y + 3);
  doc.text(fmtMoney(trat.valorBruto), sumX + colWidths[3] + 4, y + 3);

  if (trat.desconto > 0) {
    y += rowH + 6;
    doc.save();
    doc.rect(tableX, y, CONTENT_WIDTH - 10, rowH).fill(COLORS.white);
    doc.restore();
    doc.fontSize(6.5).font("Helvetica").fillColor(COLORS.textDark);
    doc.text("DESCONTO:", sumX + 4, y + 3);
    doc.text(`- ${fmtMoney(trat.desconto)}`, sumX + colWidths[3] + 4, y + 3);
  }

  y += rowH + 4;
  doc.save();
  doc.rect(tableX, y, CONTENT_WIDTH - 10, rowH + 6).fill(COLORS.accent);
  doc.restore();
  doc.fontSize(8).font("Helvetica-Bold").fillColor(COLORS.white);
  doc.text("VALOR FINAL DO TRATAMENTO:", sumX - 60, y + 4);
  doc.text(fmtMoney(trat.valorFinal), sumX + colWidths[3] + 4, y + 4);

  if (trat.numeroParcelas > 1) {
    y += rowH + 8;
    doc.fontSize(6.5).font("Helvetica").fillColor(COLORS.textDark);
    const valorParcela = trat.valorFinal / trat.numeroParcelas;
    doc.text(`CONDICAO DE PAGAMENTO: ${trat.numeroParcelas}x de ${fmtMoney(valorParcela)}`, tableX + 4, y + 2);
  }

  y += 20;
  doc.fontSize(7).font("Helvetica-Bold").fillColor(COLORS.textDark);
  doc.text("3. CLAUSULA DE DESISTENCIA E RETENCAO", LEFT + 5, y);
  y += 14;

  const custosRetencao = trat.itens.reduce((acc, item) => {
    if (item.tipo === "substancia" || item.tipo === "insumo") {
      acc.insumos += item.valorTotal;
    } else if (item.tipo === "reserva_tecnica" || item.tipo === "honorario_enfermagem") {
      acc.reservaTecnica += item.valorTotal;
    } else if (item.tipo === "taxa_administrativa") {
      acc.logistica += item.valorTotal;
    }
    return acc;
  }, { insumos: 0, reservaTecnica: 0, logistica: 0 });

  const totalRetencao = custosRetencao.insumos + custosRetencao.reservaTecnica + custosRetencao.logistica;

  const clausulas = [
    `3.1. Em caso de desistencia do tratamento por parte do CONTRATANTE, ficam retidos os seguintes valores referentes a custos ja incorridos pela CONTRATADA:`,
    `     a) Insumos e substancias ja adquiridos exclusivamente para o paciente: ${fmtMoney(custosRetencao.insumos)}`,
    `     b) Reserva tecnica e honorarios de enfermagem (tempo ja reservado): ${fmtMoney(custosRetencao.reservaTecnica)}`,
    `     c) Taxa administrativa e logistica (agendamento, preparacao, estoque): ${fmtMoney(custosRetencao.logistica)}`,
    `     TOTAL RETIDO EM CASO DE DESISTENCIA: ${fmtMoney(totalRetencao)}`,
    ``,
    `3.2. Os insumos (seringas, equipos, materiais descartaveis) adquiridos exclusivamente para o tratamento do CONTRATANTE nao sao reaproveitaveis e serao descontados integralmente.`,
    `3.3. O tempo tecnico da equipe de enfermagem ja reservado para as sessoes agendadas constitui custo operacional irreversivel.`,
    `3.4. O estoque de substancias adquirido especificamente para o protocolo do CONTRATANTE, quando nao reutilizavel para outros pacientes, sera integralmente retido.`,
    `3.5. O valor excedente ao total retido sera devolvido ao CONTRATANTE em ate 30 (trinta) dias uteis apos a formalizacao da desistencia.`,
  ];

  doc.fontSize(6.5).font("Helvetica").fillColor(COLORS.textDark);
  clausulas.forEach(line => {
    if (line.includes("TOTAL RETIDO")) {
      doc.font("Helvetica-Bold");
    }
    doc.text(line, LEFT + 10, y, { width: CONTENT_WIDTH - 20, lineGap: 1.2 });
    y += line === "" ? 4 : 9;
    doc.font("Helvetica");
  });

  y += 6;
  doc.fontSize(7).font("Helvetica-Bold").fillColor(COLORS.textDark);
  doc.text("4. DECLARACAO DO CONTRATANTE", LEFT + 5, y);
  y += 14;

  doc.fontSize(6.5).font("Helvetica").fillColor(COLORS.textDark);
  const declaracao = `Declaro que li e compreendi todas as condicoes deste contrato, incluindo a composicao detalhada dos custos do tratamento, as condicoes de pagamento e a clausula de desistencia com os respectivos valores de retencao. Estou ciente de que a desistencia implica retencao dos custos ja incorridos pela clinica, conforme detalhado na clausula 3 acima. Assumo integral responsabilidade pelo cumprimento das obrigacoes financeiras aqui estabelecidas.`;
  const declH = doc.heightOfString(declaracao, { width: CONTENT_WIDTH - 20, lineGap: 1.5 });
  doc.text(declaracao, LEFT + 10, y, { width: CONTENT_WIDTH - 20, lineGap: 1.5 });
  y += declH + 15;

  if (y > PAGE_HEIGHT - 90) {
    y = PAGE_HEIGHT - 90;
  }

  doc.fontSize(7).font("Helvetica").fillColor(COLORS.textDark);
  doc.text(`Local: ________________________________  Data: ____/____/________`, LEFT, y);
  y += 25;

  const sigW = CONTENT_WIDTH / 2;
  const lineW = sigW - 40;

  doc.moveTo(LEFT + 10, y).lineTo(LEFT + 10 + lineW, y).stroke(COLORS.gridBorder);
  doc.moveTo(LEFT + sigW + 10, y).lineTo(LEFT + sigW + 10 + lineW, y).stroke(COLORS.gridBorder);

  doc.fontSize(7).font("Helvetica-Bold").fillColor(COLORS.textDark);
  doc.text("Assinatura do Contratante (Paciente)", LEFT + 10, y + 4, { width: lineW });
  doc.text("Assinatura da Contratada (Clinica)", LEFT + sigW + 10, y + 4, { width: lineW });

  doc.fontSize(6).font("Helvetica").fillColor(COLORS.textMedium);
  doc.text(clean(dados.nomePaciente), LEFT + 10, y + 14, { width: lineW });
  doc.text(`CPF: ${formatCPF(dados.cpfPaciente)}`, LEFT + 10, y + 22, { width: lineW });
  doc.text(`${clean(dados.medicoResponsavel)} - ${dados.crmMedico}`, LEFT + sigW + 10, y + 14, { width: lineW });

  y += 38;
  doc.fontSize(5).font("Helvetica").fillColor(COLORS.textLight);
  doc.text(
    `PADCOM V15.2 - Motor Clinico | Contrato Financeiro gerado eletronicamente em ${new Date().toLocaleDateString("pt-BR")} | ${clean(dados.agenda)}`,
    LEFT, y, { width: CONTENT_WIDTH, align: "center" }
  );
}

export function gerarPdfRAS(dados: DadosRAS): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const hasFinanceiro = !!dados.tratamentoFinanceiro;
    const totalPages = hasFinanceiro ? 5 : 4;
    const marcacoes1 = dados.marcacoes.slice(0, 10);
    const marcacoes2 = dados.marcacoes.slice(10, 20);

    const doc = new PDFDocument({
      layout: "landscape",
      size: "A4",
      margins: { top: TOP, bottom: 20, left: LEFT, right: 30 },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    let y = drawRASHeader(doc, dados, 1, totalPages);
    const { y: afterProto, fixedColsWidth, substColW } = drawProtocolHeader(doc, dados, y);
    drawMarcacoesGrid(doc, dados, marcacoes1, afterProto, fixedColsWidth, substColW);

    doc.addPage({ layout: "landscape", size: "A4" });
    y = drawRASHeader(doc, dados, 2, totalPages);
    const proto2 = drawProtocolHeader(doc, dados, y);
    const afterGrid2 = drawMarcacoesGrid(doc, dados, marcacoes2, proto2.y, proto2.fixedColsWidth, proto2.substColW);
    drawSignatureArea(doc, dados, afterGrid2);

    doc.addPage({ layout: "landscape", size: "A4" });
    drawSubstanciaInfoPage(doc, dados);

    doc.addPage({ layout: "landscape", size: "A4" });
    drawConsentPage(doc, dados);

    if (hasFinanceiro) {
      doc.addPage({ layout: "landscape", size: "A4" });
      drawFinancialContractPage(doc, dados);
    }

    doc.end();
  });
}
