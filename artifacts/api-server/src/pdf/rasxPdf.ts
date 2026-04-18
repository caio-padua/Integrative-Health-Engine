import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

const CORES = {
  azulPetroleo: "#1B4F6C",
  azulPetroleoClaro: "#2A6B8C",
  offWhite: "#F5F0E8",
  douradoQueimado: "#B8860B",
  verdeSalvia: "#6B8E6B",
  branco: "#FFFFFF",
  cinzaTexto: "#333333",
  cinzaClaro: "#666666",
  vermelho: "#C0392B",
  amarelo: "#D4A017",
  verde: "#27AE60",
};

interface RasxPdfData {
  paciente: { nome: string; cpf?: string; dataNascimento?: string; telefone?: string; email?: string; sexo?: string; enderecoCompleto?: string; plano?: string };
  medico: string;
  unidade: string;
  dataBase: string;
  snapshotInicial: any;
  snapshotAtual: any;
  patologias: { diagnosticadas: any[]; potenciais: any[] };
  orgaos: any[];
  medicamentos: any[];
  eventosMedicacao: any[];
  curvas: { doenca: any[]; saude: any[] };
  proximasEtapas: any[];
}

function calcIdade(dataNasc: string): number {
  const hoje = new Date();
  const nasc = new Date(dataNasc);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

function corSemaforo(s: string) {
  if (s === "verde") return CORES.verde;
  if (s === "amarelo") return CORES.amarelo;
  return CORES.vermelho;
}

function drawHeader(doc: PDFKit.PDFDocument, titulo: string, codigo: string, isLandscape: boolean) {
  const width = isLandscape ? 842 : 595;
  doc.rect(0, 0, width, 70).fill(CORES.azulPetroleo);
  doc.fontSize(18).font("Helvetica-Bold").fillColor(CORES.offWhite).text(titulo, 40, 20, { width: width - 250 });
  doc.fontSize(9).font("Helvetica").fillColor(CORES.douradoQueimado).text(codigo, 40, 48);
  doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.douradoQueimado).text("PAWARDS", width - 160, 18, { width: 120, align: "right" });
  doc.fontSize(6).font("Helvetica").fillColor(CORES.offWhite).text("Sistema de Gestao Saude", width - 160, 30, { width: 120, align: "right" });
  doc.fontSize(7).font("Helvetica").fillColor(CORES.offWhite).text("INSTITUTO PADUA", width - 160, 42, { width: 120, align: "right" });
}

function drawPacienteBlock(doc: PDFKit.PDFDocument, data: RasxPdfData, y: number, width: number): number {
  const p = data.paciente;
  const idade = p.dataNascimento ? `${calcIdade(p.dataNascimento)} anos` : "—";
  const dataNasc = p.dataNascimento ? new Date(p.dataNascimento).toLocaleDateString("pt-BR") : "—";
  const sexo = p.sexo ? p.sexo.charAt(0).toUpperCase() + p.sexo.slice(1).toLowerCase() : "—";
  const cpf = p.cpf || "—";
  const tel = p.telefone || "—";
  const email = p.email || "—";
  const endereco = p.enderecoCompleto || "—";
  const plano = p.plano || "Particular";
  const blockH = 78;
  doc.rect(40, y, width - 80, blockH).fill("#E8E4DC");
  // Linha 1: nome + plano
  doc.fontSize(11).font("Helvetica-Bold").fillColor(CORES.cinzaTexto).text(p.nome.toUpperCase(), 50, y + 8, { width: width - 200 });
  doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.azulPetroleo).text(`PLANO: ${plano.toUpperCase()}`, width - 160, y + 10, { width: 110, align: "right" });
  // Linha 2: dados pessoais
  doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaClaro)
    .text(`CPF: ${cpf}   |   Nasc: ${dataNasc} (${idade})   |   Sexo: ${sexo}`, 50, y + 26, { width: width - 100 });
  // Linha 3: contato
  doc.fontSize(7.5).font("Helvetica").fillColor(CORES.cinzaClaro)
    .text(`Tel: ${tel}   |   Email: ${email}`, 50, y + 41, { width: width - 100 });
  // Linha 4: endereco
  doc.fontSize(7).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro)
    .text(`End.: ${endereco}`, 50, y + 54, { width: width - 100, ellipsis: true, height: 10 });
  // Linha 5: rodape do bloco
  doc.fontSize(7).font("Helvetica").fillColor(CORES.azulPetroleo)
    .text(`Data Base: ${data.dataBase}   |   ${data.medico}   |   ${data.unidade}`, 50, y + 65, { width: width - 100 });
  return y + blockH + 10;
}

function drawTextoInstitucional(doc: PDFKit.PDFDocument, y: number): number {
  const texto = "Nos nao somos apenas o que comemos; somos o que absorvemos, metabolizamos e utilizamos. Com a idade, com a inflamacao e com o estresse biologico cronico, a absorcao pode cair, a producao hormonal diminui e o organismo passa a sustentar sintomas e doencas de forma progressiva. Por isso, este relatorio acompanha nao apenas doencas e medicamentos, mas a recuperacao do terreno biologico, dos orgaos, do sono, da energia, da cognicao e da capacidade funcional do paciente.";
  doc.rect(40, y, 515, 70).fill("#F0ECE4");
  doc.fontSize(7.5).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro).text(texto, 50, y + 8, { width: 495, lineGap: 2 });
  return y + 80;
}

function drawTableHeader(doc: PDFKit.PDFDocument, cols: { label: string; x: number; w: number }[], y: number) {
  const lastCol = cols[cols.length - 1];
  doc.rect(cols[0].x, y, lastCol.x + lastCol.w - cols[0].x, 18).fill(CORES.azulPetroleo);
  for (const c of cols) {
    doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.offWhite).text(c.label, c.x + 4, y + 5, { width: c.w - 8 });
  }
  return y + 18;
}

function drawTableRow(doc: PDFKit.PDFDocument, cols: { x: number; w: number }[], values: string[], y: number, alt: boolean) {
  const lastCol = cols[cols.length - 1];
  if (alt) doc.rect(cols[0].x, y, lastCol.x + lastCol.w - cols[0].x, 16).fill("#F5F2EC");
  for (let i = 0; i < cols.length; i++) {
    doc.fontSize(7).font("Helvetica").fillColor(CORES.cinzaTexto).text(values[i] || "—", cols[i].x + 4, y + 4, { width: cols[i].w - 8 });
  }
  return y + 16;
}

function addPageRetrato(doc: PDFKit.PDFDocument) {
  doc.addPage({ size: "A4", layout: "portrait", margins: { top: 40, bottom: 40, left: 40, right: 40 } });
}

function addPagePaisagem(doc: PDFKit.PDFDocument) {
  doc.addPage({ size: "A4", layout: "landscape", margins: { top: 40, bottom: 40, left: 40, right: 40 } });
}

function drawFooter(doc: PDFKit.PDFDocument, isLandscape: boolean) {
  const width = isLandscape ? 842 : 595;
  const height = isLandscape ? 595 : 842;
  const footerY = height - 36;
  doc.moveTo(40, footerY).lineTo(width - 40, footerY).lineWidth(0.3).stroke(CORES.cinzaClaro);
  doc.fontSize(5.5).font("Helvetica").fillColor(CORES.cinzaClaro)
    .text("Developed by Pawards MedCore", 40, footerY + 5, { width: width - 140, align: "center" });
  const badgeW = 48;
  const badgeH = 10;
  const badgeX = width - 40 - badgeW;
  const badgeY = footerY + 3;
  doc.rect(badgeX, badgeY, badgeW, badgeH).lineWidth(0.3).stroke(CORES.cinzaClaro);
  doc.fontSize(4).font("Helvetica").fillColor(CORES.cinzaClaro)
    .text("RASX-MATRIZ", badgeX, badgeY + 3, { width: badgeW, align: "center" });
}

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string, y: number): number {
  doc.rect(40, y, 4, 16).fill(CORES.douradoQueimado);
  doc.fontSize(11).font("Helvetica-Bold").fillColor(CORES.azulPetroleo).text(title, 52, y + 2);
  return y + 24;
}

function drawCurvaBar(doc: PDFKit.PDFDocument, label: string, valor: number, cor: string, x: number, y: number, maxW: number): number {
  const barW = (valor / 100) * maxW;
  doc.fontSize(7).font("Helvetica").fillColor(CORES.cinzaTexto).text(label, x, y + 2, { width: 150 });
  doc.rect(x + 155, y, maxW, 12).fill("#E0DDD5");
  doc.rect(x + 155, y, barW, 12).fill(cor);
  doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.branco).text(`${valor}%`, x + 157 + barW - 30, y + 2, { width: 28, align: "right" });
  return y + 18;
}

export type RasCategoria = "COMPLETO" | "CLINICO" | "EVOLUTIVO" | "ESTADO_SAUDE";

export const RAS_CATEGORIAS = {
  CLINICO: {
    label: "RAS Clinico",
    descricao: "Cadernos clinicos: estado de saude, patologias, medicamentos, formulas, orgaos, curvas",
    cadernos: ["RACL HEST", "RACL HPOT", "RACL HORG", "RACL HMED", "RACL HFOR", "RACL HCUR", "RACL HATU"],
  },
  EVOLUTIVO: {
    label: "RAS Evolutivo",
    descricao: "Evolucao clinica: timeline medicacao, transicao terapeutica, evolucao comparativa, proximas etapas",
    cadernos: ["RACL HLIN", "RACL HTRN", "RACL HEVO", "RACL HPLA"],
  },
  ESTADO_SAUDE: {
    label: "RAS Estado de Saude",
    descricao: "Resumo atual: estado atual + curvas + proximas etapas",
    cadernos: ["RACL HATU", "RACL HCUR", "RACL HPLA"],
  },
  COMPLETO: {
    label: "RAS Completo",
    descricao: "Todos os cadernos clinicos e evolutivos",
    cadernos: ["RACL HEST", "RACL HPOT", "RACL HORG", "RACL HMED", "RACL HFOR", "RACL HLIN", "RACL HTRN", "RACL HEVO", "RACL HCUR", "RACL HATU", "RACL HPLA"],
  },
};

export function gerarRasxPdf(data: RasxPdfData, categoria: RasCategoria = "COMPLETO"): PassThrough {
  const stream = new PassThrough();
  const doc = new PDFDocument({ size: "A4", layout: "portrait", margins: { top: 40, bottom: 40, left: 40, right: 40 }, autoFirstPage: false });
  doc.pipe(stream);

  const cadernos = RAS_CATEGORIAS[categoria].cadernos;
  const include = (cod: string) => cadernos.includes(cod);

  let y = 0;

  // ========== RACL HEST — Estado Inicial (RETRATO) ==========
  if (include("RACL HEST")) {
  addPageRetrato(doc);
  drawHeader(doc, "Estado Inicial de Saude", "RACL HEST", false);
  y = 80;
  y = drawPacienteBlock(doc, data, y, 595);
  y = drawTextoInstitucional(doc, y);

  y = drawSectionTitle(doc, "Patologias Diagnosticadas", y);
  if (data.patologias.diagnosticadas.length > 0) {
    const cols = [
      { label: "PATOLOGIA", x: 40, w: 140 },
      { label: "ORGAO/SISTEMA", x: 180, w: 100 },
      { label: "INTENSIDADE", x: 280, w: 70 },
      { label: "SEMAFORO", x: 350, w: 60 },
      { label: "LEITURA CLINICA", x: 410, w: 145 },
    ];
    y = drawTableHeader(doc, cols, y);
    data.patologias.diagnosticadas.forEach((p: any, i: number) => {
      y = drawTableRow(doc, cols, [p.nome, p.orgaoSistema || "—", p.intensidadeInicial || p.intensidadeAtual || "—", p.statusSemaforo || "—", p.leituraClinica || "—"], y, i % 2 === 0);
    });
  } else {
    doc.fontSize(8).fillColor(CORES.cinzaClaro).text("Nenhuma patologia registrada no inicio.", 50, y);
    y += 16;
  }
  y += 12;

  y = drawSectionTitle(doc, "Medicamentos em Uso no Inicio", y);
  if (data.medicamentos.length > 0) {
    const medCols = [
      { label: "MEDICAMENTO", x: 40, w: 140 },
      { label: "POSOLOGIA", x: 180, w: 100 },
      { label: "MOTIVO USO", x: 280, w: 120 },
      { label: "STATUS", x: 400, w: 70 },
      { label: "TEMPO USO", x: 470, w: 85 },
    ];
    y = drawTableHeader(doc, medCols, y);
    data.medicamentos.forEach((m: any, i: number) => {
      const inline = m.medicamentoDoseInline || `${m.nome}${m.dose ? " " + m.dose : ""}`;
      y = drawTableRow(doc, medCols, [inline, m.posologia || "—", m.motivoUso || "—", m.statusAtual || "em_uso", m.tempoUso || "—"], y, i % 2 === 0);
    });
  }
  drawFooter(doc, false);
  }

  // ========== RACL HPOT — Patologias Potenciais (RETRATO) ==========
  if (include("RACL HPOT") && data.patologias.potenciais.length > 0) {
    addPageRetrato(doc);
    drawHeader(doc, "Patologias Potenciais", "RACL HPOT", false);
    y = 80;
    y = drawPacienteBlock(doc, data, y, 595);
    y = drawSectionTitle(doc, "Mapa de Progressao Provavel", y);
    const potCols = [
      { label: "PATOLOGIA", x: 40, w: 150 },
      { label: "ORGAO", x: 190, w: 100 },
      { label: "INTENSIDADE", x: 290, w: 80 },
      { label: "SEMAFORO", x: 370, w: 60 },
      { label: "LEITURA CLINICA", x: 430, w: 125 },
    ];
    y = drawTableHeader(doc, potCols, y);
    data.patologias.potenciais.forEach((p: any, i: number) => {
      y = drawTableRow(doc, potCols, [p.nome, p.orgaoSistema || "—", p.intensidadeInicial || "—", p.statusSemaforo || "amarelo", p.leituraClinica || "—"], y, i % 2 === 0);
    });
    drawFooter(doc, false);
  }

  // ========== RACL HORG — Orgaos e Sistemas (PAISAGEM) ==========
  if (include("RACL HORG") && data.orgaos.length > 0) {
    addPagePaisagem(doc);
    drawHeader(doc, "Orgaos e Sistemas Afetados", "RACL HORG", true);
    y = 80;
    y = drawPacienteBlock(doc, data, y, 842);
    y = drawSectionTitle(doc, "Correlacao Patologia → Orgao → Intensidade → Prognostico", y);
    const orgCols = [
      { label: "ORGAO/SISTEMA", x: 40, w: 140 },
      { label: "INTENSIDADE", x: 180, w: 90 },
      { label: "RISCO/PROGNOSTICO", x: 270, w: 110 },
      { label: "PATOLOGIAS RELACIONADAS", x: 380, w: 230 },
      { label: "OBSERVACAO", x: 610, w: 192 },
    ];
    y = drawTableHeader(doc, orgCols, y);
    data.orgaos.forEach((o: any, i: number) => {
      const pats = Array.isArray(o.patologiasRelacionadas) ? o.patologiasRelacionadas.join(", ") : "—";
      y = drawTableRow(doc, orgCols, [o.orgaoSistema, o.intensidade, o.riscoPrognostico, pats, o.observacao || "—"], y, i % 2 === 0);
    });
    drawFooter(doc, true);
  }

  // ========== RACL HMED — Medicamentos em Uso (PAISAGEM) ==========
  if (include("RACL HMED")) {
  const HMED_PAGE_LIMIT = 500;
  addPagePaisagem(doc);
  drawHeader(doc, "Medicamentos em Uso", "RACL HMED", true);
  y = 80;
  y = drawPacienteBlock(doc, data, y, 842);
  y = drawSectionTitle(doc, "Lista Completa de Medicacao com Dosagem Incorporada", y);
  const hmedCols = [
    { label: "MEDICAMENTO + DOSE", x: 40, w: 160 },
    { label: "POSOLOGIA", x: 200, w: 130 },
    { label: "INDICACAO CLINICA", x: 330, w: 130 },
    { label: "STATUS", x: 460, w: 80 },
    { label: "SUBSTITUICAO NATURAL", x: 540, w: 140 },
    { label: "EVIDENCIA MELHORA", x: 680, w: 122 },
  ];
  y = drawTableHeader(doc, hmedCols, y);
  data.medicamentos.forEach((m: any, i: number) => {
    if (y > HMED_PAGE_LIMIT) {
      drawFooter(doc, true);
      addPagePaisagem(doc);
      drawHeader(doc, "Medicamentos em Uso (cont.)", "RACL HMED", true);
      y = 80;
      y = drawPacienteBlock(doc, data, y, 842);
      y = drawTableHeader(doc, hmedCols, y);
    }
    const inline = m.medicamentoDoseInline || `${m.nome}${m.dose ? " " + m.dose : ""}`;
    y = drawTableRow(doc, hmedCols, [inline, m.posologia || "—", m.indicacaoClinica || m.motivoUso || "—", m.statusAtual, m.substituicaoNatural || "—", m.evidenciaMelhora || "—"], y, i % 2 === 0);
  });
  drawFooter(doc, true);
  }

  // ========== RACL HFOR — Formulas Magistrais (RETRATO, paginado) ==========
  const formulas = data.medicamentos.filter((m: any) => m.tipoMed === "formula" && m.componentesFormula && m.componentesFormula.length > 0);
  if (include("RACL HFOR") && formulas.length > 0) {
    const MAX_COMPONENTES_POR_PAGINA = 18;
    formulas.forEach((f: any, fIdx: number) => {
      addPageRetrato(doc);
      drawHeader(doc, `Formula Magistral ${fIdx + 1}/${formulas.length}`, "RACL HFOR", false);
      y = 80;
      y = drawPacienteBlock(doc, data, y, 595);

      y = drawSectionTitle(doc, f.nome || `Formula ${fIdx + 1}`, y);
      if (f.posologia) {
        doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.azulPetroleo).text("Posologia: ", 50, y, { continued: true });
        doc.font("Helvetica").fillColor(CORES.cinzaTexto).text(f.posologia);
        y += 16;
      }
      if (f.motivoUso) {
        doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaClaro).text(`Indicacao: ${f.motivoUso}`, 50, y);
        y += 14;
      }
      y += 4;

      const compCols = [
        { label: "SUBSTANCIA", x: 40, w: 300 },
        { label: "DOSAGEM", x: 340, w: 215 },
      ];
      const comps: Array<{substancia: string; dosagem: string}> = f.componentesFormula;
      let pageComps = 0;

      y = drawTableHeader(doc, compCols, y);
      comps.forEach((c: any, cIdx: number) => {
        y = drawTableRow(doc, compCols, [c.substancia, c.dosagem], y, cIdx % 2 === 0);
        pageComps++;
        if (pageComps >= MAX_COMPONENTES_POR_PAGINA && cIdx < comps.length - 1) {
          drawFooter(doc, false);
          addPageRetrato(doc);
          drawHeader(doc, `Formula Magistral ${fIdx + 1}/${formulas.length} (cont.)`, "RACL HFOR", false);
          y = 80;
          y = drawPacienteBlock(doc, data, y, 595);
          y = drawSectionTitle(doc, `${f.nome || "Formula"} — continuacao`, y);
          y = drawTableHeader(doc, compCols, y);
          pageComps = 0;
        }
      });

      if (f.statusAtual) {
        y += 8;
        doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaClaro).text(`Status: ${f.statusAtual.replace("_", " ")}`, 50, y);
        y += 14;
      }
      if (f.substituicaoNatural) {
        doc.fontSize(8).font("Helvetica").fillColor(CORES.verdeSalvia).text(`Substituicao: ${f.substituicaoNatural}`, 50, y);
        y += 14;
      }
      drawFooter(doc, false);
    });
  }

  // ========== RACL HLIN — Linha Temporal de Medicacao (PAISAGEM) ==========
  if (include("RACL HLIN") && data.eventosMedicacao.length > 0) {
    addPagePaisagem(doc);
    drawHeader(doc, "Linha Temporal de Medicacao", "RACL HLIN", true);
    y = 80;
    y = drawPacienteBlock(doc, data, y, 842);
    y = drawSectionTitle(doc, "Cronologia de Eventos por Medicamento", y);
    const hlinCols = [
      { label: "DATA", x: 40, w: 90 },
      { label: "MEDICAMENTO", x: 130, w: 150 },
      { label: "POSOLOGIA", x: 280, w: 120 },
      { label: "EVENTO", x: 400, w: 80 },
      { label: "SUBSTITUICAO", x: 480, w: 150 },
      { label: "LEITURA CLINICA", x: 630, w: 172 },
    ];
    y = drawTableHeader(doc, hlinCols, y);
    data.eventosMedicacao.forEach((e: any, i: number) => {
      const dt = e.data ? new Date(e.data).toLocaleDateString("pt-BR") : "—";
      y = drawTableRow(doc, hlinCols, [dt, e.apresentacao, e.posologia || "—", e.status, e.substituicaoNatural || "—", e.leituraClinica || "—"], y, i % 2 === 0);
      if (y > 530) {
        drawFooter(doc, true);
        addPagePaisagem(doc);
        drawHeader(doc, "Linha Temporal de Medicacao (cont.)", "RACL HLIN", true);
        y = 80;
        y = drawTableHeader(doc, hlinCols, y);
      }
    });
    drawFooter(doc, true);
  }

  // ========== RACL HTRN — Transicao Terapeutica (PAISAGEM) ==========
  const medsComSub = data.medicamentos.filter((m: any) => m.substituicaoNatural);
  if (include("RACL HTRN") && medsComSub.length > 0) {
    addPagePaisagem(doc);
    drawHeader(doc, "Transicao Terapeutica", "RACL HTRN", true);
    y = 80;
    y = drawPacienteBlock(doc, data, y, 842);
    y = drawSectionTitle(doc, "Remedio → Substituicao Natural → Evidencia Clinica", y);
    const htrnCols = [
      { label: "MEDICAMENTO ORIGINAL", x: 40, w: 160 },
      { label: "STATUS", x: 200, w: 80 },
      { label: "SUBSTITUICAO NATURAL/INTEGRATIVA", x: 280, w: 200 },
      { label: "EVIDENCIA MELHORA", x: 480, w: 170 },
      { label: "CRITERIO REDUCAO", x: 650, w: 152 },
    ];
    y = drawTableHeader(doc, htrnCols, y);
    medsComSub.forEach((m: any, i: number) => {
      const inline = m.medicamentoDoseInline || `${m.nome}${m.dose ? " " + m.dose : ""}`;
      y = drawTableRow(doc, htrnCols, [inline, m.statusAtual, m.substituicaoNatural, m.evidenciaMelhora || "—", m.criterioReducao || "—"], y, i % 2 === 0);
    });
    drawFooter(doc, true);
  }

  // ========== RACL HEVO — Evolucao Clinica Comparativa (PAISAGEM) ==========
  if (include("RACL HEVO") && data.patologias.diagnosticadas.length > 0) {
    addPagePaisagem(doc);
    drawHeader(doc, "Evolucao Clinica Comparativa", "RACL HEVO", true);
    y = 80;
    y = drawPacienteBlock(doc, data, y, 842);
    y = drawSectionTitle(doc, "Antes → Transicao → Atual", y);
    const hevoCols = [
      { label: "PATOLOGIA", x: 40, w: 130 },
      { label: "ORGAO", x: 170, w: 90 },
      { label: "ESTADO INICIAL", x: 260, w: 90 },
      { label: "TRANSICAO", x: 350, w: 100 },
      { label: "ESTADO ATUAL", x: 450, w: 90 },
      { label: "MEDICACAO / SUBSTITUICAO", x: 540, w: 150 },
      { label: "LEITURA CLINICA", x: 690, w: 112 },
    ];
    y = drawTableHeader(doc, hevoCols, y);
    data.patologias.diagnosticadas.forEach((p: any, i: number) => {
      const transicao = p.evolucaoPercentual ? `${p.evolucaoPercentual > 0 ? "↑" : "↓"} ${Math.abs(p.evolucaoPercentual)}%` : "—";
      const medSub = p.substituicaoNatural ? `${p.medicacaoOriginal || "—"} → ${p.substituicaoNatural}` : (p.medicacaoAtual || "—");
      y = drawTableRow(doc, hevoCols, [p.nome, p.orgaoSistema || "—", p.intensidadeInicial || "—", transicao, p.intensidadeAtual || "—", medSub, p.leituraClinica || "—"], y, i % 2 === 0);
    });
    drawFooter(doc, true);
  }

  // ========== RACL HCUR — Curvas Declinante e Ascendente (PAISAGEM) ==========
  if (include("RACL HCUR") && (data.curvas.doenca.length > 0 || data.curvas.saude.length > 0)) {
    addPagePaisagem(doc);
    drawHeader(doc, "Curvas Declinante e Ascendente", "RACL HCUR", true);
    y = 80;
    y = drawPacienteBlock(doc, data, y, 842);

    y = drawSectionTitle(doc, "Curva Declinante — Doencas, Inflamacao, Dependencia", y);
    const latestDoenca: Record<string, number> = {};
    data.curvas.doenca.forEach((c: any) => { latestDoenca[c.indicador] = c.valor; });
    for (const [ind, val] of Object.entries(latestDoenca)) {
      y = drawCurvaBar(doc, ind.replace(/_/g, " "), val, CORES.vermelho, 50, y, 250);
    }
    y += 12;

    y = drawSectionTitle(doc, "Curva Ascendente — Saude Funcional, Resposta Organica, Bem-Estar", y);
    const latestSaude: Record<string, number> = {};
    data.curvas.saude.forEach((c: any) => { latestSaude[c.indicador] = c.valor; });
    for (const [ind, val] of Object.entries(latestSaude)) {
      y = drawCurvaBar(doc, ind.replace(/_/g, " "), val, CORES.verdeSalvia, 50, y, 250);
    }

    y += 20;
    doc.rect(50, y, 700, 30).fill("#F0ECE4");
    doc.fontSize(7).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro)
      .text("Legenda: Barras VERMELHAS representam indicadores de doenca (objetivo: diminuir). Barras VERDES representam indicadores de saude (objetivo: aumentar).", 60, y + 8, { width: 680 });

    drawFooter(doc, true);
  }

  // ========== RACL HATU — Estado Atual de Saude (RETRATO) ==========
  if (include("RACL HATU")) {
  addPageRetrato(doc);
  drawHeader(doc, "Estado Atual de Saude", "RACL HATU", false);
  y = 80;
  y = drawPacienteBlock(doc, data, y, 595);

  const snap = data.snapshotAtual || data.snapshotInicial;
  if (snap) {
    y = drawSectionTitle(doc, "Resumo Clinico Consolidado", y);
    if (snap.resumoClinico) {
      doc.fontSize(9).font("Helvetica").fillColor(CORES.cinzaTexto).text(snap.resumoClinico, 50, y, { width: 495, lineGap: 3 });
      y += doc.heightOfString(snap.resumoClinico, { width: 495 }) + 16;
    }
    if (snap.observacoesMedicas) {
      y = drawSectionTitle(doc, "Observacoes Medicas", y);
      doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaClaro).text(snap.observacoesMedicas, 50, y, { width: 495, lineGap: 2 });
      y += doc.heightOfString(snap.observacoesMedicas, { width: 495 }) + 12;
    }
  }

  y = drawSectionTitle(doc, "Status por Patologia", y);
  data.patologias.diagnosticadas.forEach((p: any) => {
    const cor = corSemaforo(p.statusSemaforo || "amarelo");
    doc.rect(50, y, 8, 8).fill(cor);
    doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.cinzaTexto).text(p.nome, 64, y, { continued: true });
    doc.font("Helvetica").text(` — ${p.intensidadeAtual || "—"} | ${p.leituraClinica || ""}`, { width: 450 });
    y += 14;
  });
  drawFooter(doc, false);
  }

  // ========== RACL HPLA — Proxima Etapa (RETRATO, Opcional) ==========
  if (include("RACL HPLA") && data.proximasEtapas.length > 0) {
    addPageRetrato(doc);
    drawHeader(doc, "Proxima Etapa", "RACL HPLA", false);
    y = 80;
    y = drawPacienteBlock(doc, data, y, 595);
    y = drawSectionTitle(doc, "Proximos Exames, Metas e Pontos de Atencao", y);

    const plaCols = [
      { label: "TIPO", x: 40, w: 80 },
      { label: "DESCRICAO", x: 120, w: 250 },
      { label: "DATA PREVISTA", x: 370, w: 90 },
      { label: "PRIORIDADE", x: 460, w: 70 },
      { label: "STATUS", x: 530, w: 25 },
    ];
    y = drawTableHeader(doc, plaCols, y);
    data.proximasEtapas.forEach((e: any, i: number) => {
      const dt = e.dataPrevista ? new Date(e.dataPrevista).toLocaleDateString("pt-BR") : "—";
      const status = e.concluido ? "✓" : "○";
      y = drawTableRow(doc, plaCols, [e.tipo, e.descricao, dt, e.prioridade || "media", status], y, i % 2 === 0);
    });
    drawFooter(doc, false);
  }

  if (doc.bufferedPageRange().count === 0) {
    addPageRetrato(doc);
    drawHeader(doc, `${RAS_CATEGORIAS[categoria].label}`, `RASX ${categoria}`, false);
    let yFb = 80;
    yFb = drawPacienteBlock(doc, data, yFb, 595);
    yFb = drawSectionTitle(doc, "Sem dados disponiveis para esta categoria", yFb);
    doc.fontSize(9).font("Helvetica").fillColor(CORES.cinzaClaro)
      .text("Nenhum dado clinico encontrado para gerar os cadernos desta categoria. Verifique se o REVO do paciente possui as informacoes necessarias.", 50, yFb, { width: 495, lineGap: 3 });
    drawFooter(doc, false);
  }

  doc.end();
  return stream;
}

interface RacjPdfData {
  paciente: { nome: string; cpf?: string; dataNascimento?: string; telefone?: string; email?: string; sexo?: string; enderecoCompleto?: string; plano?: string };
  medico: string;
  unidade: string;
  dataBase: string;
  patologias: string[];
  medicamentos: string[];
}

function drawRacjParagraph(doc: PDFKit.PDFDocument, text: string, y: number, width: number): number {
  doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto).text(text, 50, y, { width, lineGap: 3 });
  return y + doc.heightOfString(text, { width }) + 8;
}

function drawRacjCheckbox(doc: PDFKit.PDFDocument, label: string, y: number): number {
  doc.rect(50, y, 10, 10).lineWidth(0.5).stroke(CORES.cinzaTexto);
  doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto).text(label, 66, y + 1, { width: 480 });
  return y + doc.heightOfString(label, { width: 480 }) + 6;
}

function drawAssinatura(doc: PDFKit.PDFDocument, y: number): number {
  y += 30;
  doc.moveTo(50, y).lineTo(280, y).lineWidth(0.5).stroke(CORES.cinzaTexto);
  doc.moveTo(310, y).lineTo(540, y).lineWidth(0.5).stroke(CORES.cinzaTexto);
  doc.fontSize(7).font("Helvetica").fillColor(CORES.cinzaClaro)
    .text("Assinatura do Paciente / Responsavel", 50, y + 4, { width: 230, align: "center" })
    .text("Assinatura do Medico / CRM", 310, y + 4, { width: 230, align: "center" });
  y += 20;
  doc.fontSize(7).fillColor(CORES.cinzaClaro)
    .text(`Data: ____/____/________`, 50, y)
    .text(`Local: __________________________`, 310, y);
  return y + 20;
}

export function gerarRacjPdf(data: RacjPdfData): PassThrough {
  const stream = new PassThrough();
  const doc = new PDFDocument({ size: "A4", layout: "portrait", margins: { top: 40, bottom: 40, left: 40, right: 40 }, autoFirstPage: false });
  doc.pipe(stream);
  const W = 495;

  // ========== RACJ LGPD — Termo LGPD (Secao 15 do Manifesto) ==========
  addPageRetrato(doc);
  drawHeader(doc, "Termo de Consentimento LGPD", "RACJ LGPD", false);
  let y = 80;
  y = drawPacienteBlock(doc, data as any, y, 595);
  y = drawSectionTitle(doc, "Lei Geral de Protecao de Dados (Lei 13.709/2018)", y);
  y = drawRacjParagraph(doc, `Em conformidade com a Lei n. 13.709/2018 (LGPD), eu, ${data.paciente.nome}${data.paciente.cpf ? ", portador(a) do CPF " + data.paciente.cpf : ""}, autorizo a coleta, armazenamento e processamento dos meus dados pessoais e dados sensiveis de saude para fins exclusivos de:`, y, W);
  y = drawRacjCheckbox(doc, "Execucao do protocolo terapeutico", y);
  y = drawRacjCheckbox(doc, "Emissao de documentos clinicos (RAS, receituarios)", y);
  y = drawRacjCheckbox(doc, "Acompanhamento da evolucao clinica", y);
  y = drawRacjCheckbox(doc, "Comunicacao sobre agendamentos e resultados", y);
  y += 6;
  y = drawSectionTitle(doc, "Armazenamento Digital", y);
  y = drawRacjParagraph(doc, "Autorizo o armazenamento digital de todos os registros de atendimento, incluindo o presente termo, no sistema PAWARDS e, quando aplicavel, em ambiente de nuvem seguro (Google Drive), com compartilhamento exclusivo ao meu e-mail cadastrado, em modo somente leitura.", y, W);
  y = drawRacjParagraph(doc, "Tenho ciencia do meu direito de solicitar a exclusao, correcao ou portabilidade dos meus dados a qualquer momento.", y, W);
  y += 4;
  y = drawSectionTitle(doc, "Retencao e Revogacao", y);
  y = drawRacjParagraph(doc, "Os dados serao mantidos pelo prazo minimo de 20 anos conforme Resolucao CFM 1.821/2007. O titular pode solicitar acesso, correcao, anonimizacao ou eliminacao dos dados (quando permitido por lei) a qualquer momento.", y, W);
  y = drawRacjParagraph(doc, "O consentimento pode ser revogado a qualquer momento, sem prejuizo da licitude do tratamento realizado anteriormente. A revogacao nao se aplica a dados cuja retencao e obrigatoria por lei.", y, W);
  y = drawAssinatura(doc, y);
  drawFooter(doc, false);

  // ========== RACJ CGLO — Consentimento Global / TCLE (Secao 14 do Manifesto — 10 Secoes Fixas) ==========
  addPageRetrato(doc);
  drawHeader(doc, "Termo de Consentimento Livre e Esclarecido (TCLE)", "RACJ CGLO", false);
  y = 80;
  y = drawPacienteBlock(doc, data as any, y, 595);

  y = drawSectionTitle(doc, "1. IDENTIFICACAO", y);
  y = drawRacjParagraph(doc, `Eu, ${data.paciente.nome}${data.paciente.cpf ? ", portador(a) do CPF " + data.paciente.cpf : ""}, declaro que fui devidamente informado(a) pelo Dr. ${data.medico} sobre meu quadro clinico, incluindo diagnosticos, prognosticos, riscos e alternativas terapeuticas.`, y, W);

  y = drawSectionTitle(doc, "2. PROCEDIMENTO", y);
  y = drawRacjParagraph(doc, `Autorizo a administracao das seguintes substancias: ${data.medicamentos.length > 0 ? data.medicamentos.join(", ") : "[conforme prescricao medica]"}. Estou ciente de que os procedimentos injetaveis podem incluir aplicacoes por via endovenosa (IV), intramuscular (IM) e/ou subcutanea (SC), bem como implantes subcutaneos.`, y, W);

  y = drawSectionTitle(doc, "3. FINALIDADE TERAPEUTICA", y);
  y = drawRacjParagraph(doc, "O tratamento tem como finalidade a suplementacao de micronutrientes, modulacao bioquimica, terapia antioxidante e demais abordagens integrativas indicadas pelo medico responsavel.", y, W);

  if (data.patologias.length > 0) {
    y = drawSectionTitle(doc, "Patologias em Acompanhamento", y);
    data.patologias.forEach(p => {
      doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto).text(`  \u2022 ${p}`, 50, y, { width: W });
      y += 14;
    });
    y += 4;
  }

  y = drawSectionTitle(doc, "4. RISCOS E EFEITOS ADVERSOS", y);
  y = drawRacjParagraph(doc, "Fui informado(a) sobre os possiveis riscos e efeitos adversos, incluindo: dor e/ou hematoma no local da aplicacao, reacoes alergicas, rubor facial, cefaleia, nausea, hipotensao transitoria e, em casos raros, reacoes anafilaticas.", y, W);

  y = drawSectionTitle(doc, "5. CONTRAINDICACOES INFORMADAS", y);
  y = drawRacjParagraph(doc, "Declaro ter sido questionado(a) e ter informado ao medico sobre: gestacao ou suspeita de gravidez; amamentacao; uso de anticoagulantes; doencas renais, hepaticas ou cardiacas; alergias conhecidas e demais condicoes relevantes.", y, W);

  y = drawAssinatura(doc, y);
  drawFooter(doc, false);

  // ========== RACJ CGLO pagina 2 — Secoes 6 a 10 do TCLE ==========
  addPageRetrato(doc);
  drawHeader(doc, "TCLE — Consentimentos Especificos", "RACJ CGLO", false);
  y = 80;

  y = drawSectionTitle(doc, "6. CONSENTIMENTO VITAMINA C IV (quando aplicavel)", y);
  y = drawRacjParagraph(doc, "No caso de Vitamina C endovenosa em alta dose (acima de 10g), declaro ciencia da necessidade de dosagem previa de G6PD (glicose-6-fosfato desidrogenase). A deficiencia desta enzima pode causar anemia hemolitica. Fui orientado(a) a realizar o exame antes do inicio do protocolo.", y, W);

  y = drawSectionTitle(doc, "7. NAD+ E TERAPIAS DE LONGEVIDADE (quando aplicavel)", y);
  y = drawRacjParagraph(doc, "Fui orientado(a) sobre a velocidade de infusao adequada para NAD+ e possiveis desconfortos, incluindo: desconforto toracico, nausea ou cefaleia durante a infusao. A velocidade de gotejamento sera ajustada conforme tolerancia individual.", y, W);

  y = drawSectionTitle(doc, "8. CONSENTIMENTO POR VIA DE APLICACAO", y);

  y = drawRacjParagraph(doc, "Via Endovenosa (IV): Autorizo procedimentos por via endovenosa. Fui informado(a) que infusoes IV requerem acesso venoso periferico, podendo ocorrer dor no local da puncao, hematoma, flebite e, raramente, infiltracao.", y, W);

  y = drawRacjParagraph(doc, "Via Intramuscular (IM): Autorizo procedimentos por via intramuscular. Estou ciente de que aplicacoes IM podem causar dor local, hematoma, nodulacao transitoria e, em raros casos, lesao nervosa periferica.", y, W);

  y = drawRacjParagraph(doc, "Via Subcutanea (SC): Autorizo procedimentos por via subcutanea. Fui informado(a) que aplicacoes SC podem resultar em nodulos locais, eritema, prurido e dor no ponto de aplicacao. A absorcao e gradual.", y, W);

  y = drawRacjParagraph(doc, "Implante Subcutaneo: Autorizo a realizacao de implante subcutaneo. Estou ciente dos riscos especificos incluindo: necessidade de pequeno procedimento cirurgico, possibilidade de infeccao local, extrusao do implante, formacao de cicatriz, e necessidade de retorno para remocao ao final do periodo terapeutico.", y, W);

  y = drawSectionTitle(doc, "9. ARMAZENAMENTO DIGITAL", y);
  y = drawRacjParagraph(doc, "Autorizo o armazenamento digital de todos os registros de atendimento, incluindo o presente termo, no sistema PAWARDS e, quando aplicavel, em ambiente de nuvem seguro (Google Drive), com compartilhamento exclusivo ao meu e-mail cadastrado, em modo somente leitura.", y, W);

  y = drawSectionTitle(doc, "10. DECLARACAO FINAL", y);
  y = drawRacjParagraph(doc, "Declaro ter lido e compreendido integralmente o presente termo. Todas as minhas duvidas foram esclarecidas pelo medico responsavel. Estou ciente de que posso revogar este consentimento a qualquer momento, sem prejuizo do atendimento ja realizado.", y, W);

  y = drawAssinatura(doc, y);
  drawFooter(doc, false);

  // ========== RACJ RISC — Declaracao de Riscos e Efeitos Adversos ==========
  addPageRetrato(doc);
  drawHeader(doc, "Declaracao de Riscos e Efeitos Adversos", "RACJ RISC", false);
  y = 80;
  y = drawPacienteBlock(doc, data as any, y, 595);
  y = drawSectionTitle(doc, "Ciencia de Riscos Inerentes ao Tratamento", y);
  y = drawRacjParagraph(doc, "Declaro estar ciente de que todo tratamento medico envolve riscos, incluindo mas nao se limitando a:", y, W);
  y = drawRacjCheckbox(doc, "Reacoes adversas a medicamentos, suplementos ou formulas magistrais", y);
  y = drawRacjCheckbox(doc, "Interacoes medicamentosas nao previsiveis entre substancias prescritas", y);
  y = drawRacjCheckbox(doc, "Variacao individual na resposta terapeutica (eficacia e tolerabilidade)", y);
  y = drawRacjCheckbox(doc, "Necessidade de ajustes de dose, substituicao ou suspensao de tratamento", y);
  y = drawRacjCheckbox(doc, "Agravamento temporario de sintomas durante periodo de transicao terapeutica", y);
  y = drawRacjCheckbox(doc, "Resultados que podem diferir das expectativas iniciais", y);
  y += 6;
  y = drawSectionTitle(doc, "Riscos Especificos por Via de Aplicacao", y);
  y = drawRacjCheckbox(doc, "Endovenosa (IV): dor no local da puncao, hematoma, flebite, infiltracao, reacoes anafilaticas (raras)", y);
  y = drawRacjCheckbox(doc, "Intramuscular (IM): dor local, hematoma, nodulacao transitoria, lesao nervosa periferica (rara)", y);
  y = drawRacjCheckbox(doc, "Subcutanea (SC): nodulos locais, eritema, prurido, dor no ponto de aplicacao", y);
  y = drawRacjCheckbox(doc, "Implante: infeccao local, extrusao, cicatriz, necessidade de procedimento cirurgico para remocao", y);
  y += 8;
  y = drawRacjParagraph(doc, "Fui orientado(a) a comunicar imediatamente ao medico responsavel qualquer reacao adversa, desconforto ou piora clinica durante o tratamento.", y, W);
  y = drawRacjParagraph(doc, "O consentimento formal sera registrado presencialmente antes da primeira aplicacao, conforme exigencias da ANVISA e do Conselho Federal de Medicina (CFM). O RAS (Registro de Administracao de Substancias) sera emitido e assinado digitalmente com certificado ICP-Brasil A1 apos cada sessao.", y, W);
  y = drawAssinatura(doc, y);
  drawFooter(doc, false);

  // ========== RACJ NGAR — Termo de Nao-Garantia de Resultados ==========
  addPageRetrato(doc);
  drawHeader(doc, "Termo de Nao-Garantia de Resultados", "RACJ NGAR", false);
  y = 80;
  y = drawPacienteBlock(doc, data as any, y, 595);
  y = drawSectionTitle(doc, "Ausencia de Garantia de Resultado Especifico", y);
  y = drawRacjParagraph(doc, "Declaro estar ciente de que:", y, W);
  y = drawRacjParagraph(doc, "1. A Medicina nao e uma ciencia exata. Resultados clinicos variam conforme caracteristicas individuais, adesao ao tratamento, fatores geneticos, ambientais e comportamentais.", y, W);
  y = drawRacjParagraph(doc, "2. O medico se compromete a empregar os melhores recursos disponiveis, baseados em evidencias cientificas, mas nao pode garantir cura, remissao completa ou resultado especifico.", y, W);
  y = drawRacjParagraph(doc, "3. O acompanhamento evolutivo (REVO) permite monitorar a progressao do tratamento e ajustar condutas conforme necessidade clinica.", y, W);
  y = drawRacjParagraph(doc, "4. A interrupcao unilateral do tratamento sem orientacao medica pode comprometer os resultados alcancados.", y, W);
  y = drawRacjParagraph(doc, "5. O plano terapeutico podera ser alterado a qualquer momento pelo medico responsavel, com base na evolucao clinica, resultados de exames e resposta individual ao tratamento.", y, W);
  y = drawAssinatura(doc, y);
  drawFooter(doc, false);

  // ========== RACJ PRIV — Politica de Privacidade e Sigilo Medico ==========
  addPageRetrato(doc);
  drawHeader(doc, "Politica de Privacidade e Sigilo Medico", "RACJ PRIV", false);
  y = 80;
  y = drawPacienteBlock(doc, data as any, y, 595);
  y = drawSectionTitle(doc, "Compromisso de Sigilo e Confidencialidade", y);
  y = drawRacjParagraph(doc, `O Instituto Padua (PADUCCIA CLINICA MEDICA LTDA, CNPJ 63.865.940/0001-63) e o Dr. ${data.medico} comprometem-se a:`, y, W);
  y = drawRacjParagraph(doc, "1. Manter sigilo absoluto sobre todas as informacoes clinicas do paciente, conforme art. 73 do Codigo de Etica Medica e art. 154 do Codigo Penal.", y, W);
  y = drawRacjParagraph(doc, "2. Armazenar dados em sistemas com criptografia e controle de acesso, conforme Lei 13.709/2018 (LGPD).", y, W);
  y = drawRacjParagraph(doc, "3. Nao compartilhar dados com terceiros sem autorizacao expressa do paciente, exceto quando exigido por lei ou ordem judicial.", y, W);
  y = drawRacjParagraph(doc, "4. Utilizar sistemas de comunicacao (WhatsApp, email) apenas com consentimento previo do paciente para fins exclusivamente clinicos.", y, W);
  y = drawRacjParagraph(doc, "5. Garantir que todos os PDFs e relatorios gerados pelo sistema PAWARDS sao de uso exclusivo do paciente e equipe medica autorizada.", y, W);
  y = drawRacjParagraph(doc, "6. A assinatura digital ICP-Brasil A1 confere validade juridica ao documento (MP 2.200-2/2001). Os documentos assinados digitalmente possuem a mesma validade legal de documentos assinados fisicamente.", y, W);
  y += 6;
  y = drawSectionTitle(doc, "Canais Autorizados de Comunicacao", y);
  y = drawRacjCheckbox(doc, "WhatsApp: comunicacao clinica, envio de relatorios e agendamento", y);
  y = drawRacjCheckbox(doc, "Email: envio de PDFs clinicos e juridicos, codigo de validacao pre-sessao", y);
  y = drawRacjCheckbox(doc, "Google Drive: armazenamento seguro de documentos em 16 subpastas organizadas por categoria", y);
  y += 6;
  y = drawSectionTitle(doc, "Consentimento no E-mail Pre-Sessao", y);
  y = drawRacjParagraph(doc, "Ao prosseguir com o tratamento, o(a) paciente declara estar ciente dos procedimentos a serem realizados, incluindo aplicacoes endovenosas, intramusculares e/ou implantes subcutaneos. O paciente foi informado sobre os beneficios esperados, possiveis efeitos colaterais e contraindicacoes de cada substancia.", y, W);
  y = drawRacjParagraph(doc, "O consentimento formal sera registrado presencialmente antes da primeira aplicacao, conforme exigencias da ANVISA e do Conselho Federal de Medicina (CFM). O RAS (Registro de Administracao de Substancias) sera emitido e assinado digitalmente com certificado ICP-Brasil A1 apos cada sessao.", y, W);
  y = drawAssinatura(doc, y);
  drawFooter(doc, false);

  doc.end();
  return stream;
}
