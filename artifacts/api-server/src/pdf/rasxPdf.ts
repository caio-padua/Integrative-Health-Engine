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
  paciente: { nome: string; cpf?: string; dataNascimento?: string };
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
  doc.fontSize(18).font("Helvetica-Bold").fillColor(CORES.offWhite).text(titulo, 40, 20, { width: width - 200 });
  doc.fontSize(9).font("Helvetica").fillColor(CORES.douradoQueimado).text(codigo, 40, 48);
  doc.fontSize(9).fillColor(CORES.offWhite).text("Instituto Padua", width - 160, 25, { width: 120, align: "right" });
  doc.fontSize(7).fillColor(CORES.douradoQueimado).text("Motor Clinico PADCOM V15.2", width - 160, 40, { width: 120, align: "right" });
}

function drawPacienteBlock(doc: PDFKit.PDFDocument, data: RasxPdfData, y: number, width: number): number {
  const idade = data.paciente.dataNascimento ? calcIdade(data.paciente.dataNascimento) : "—";
  doc.rect(40, y, width - 80, 40).fill("#E8E4DC");
  doc.fontSize(10).font("Helvetica-Bold").fillColor(CORES.cinzaTexto).text(`Paciente: ${data.paciente.nome}`, 50, y + 8);
  doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaClaro)
    .text(`Idade: ${idade}  |  Data Base: ${data.dataBase}  |  Medico: ${data.medico}  |  Unidade: ${data.unidade}`, 50, y + 24);
  return y + 52;
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
  doc.fontSize(6).font("Helvetica").fillColor(CORES.cinzaClaro)
    .text(`RASX V5 | Gerado em ${new Date().toLocaleDateString("pt-BR")} | Motor Clinico PADCOM V15.2`, 40, height - 30, { width: width - 80, align: "center" });
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

export function gerarRasxPdf(data: RasxPdfData): PassThrough {
  const stream = new PassThrough();
  const doc = new PDFDocument({ size: "A4", layout: "portrait", margins: { top: 40, bottom: 40, left: 40, right: 40 }, autoFirstPage: false });
  doc.pipe(stream);

  // ========== RACL HEST — Estado Inicial (RETRATO) ==========
  addPageRetrato(doc);
  drawHeader(doc, "Estado Inicial de Saude", "RACL HEST", false);
  let y = 80;
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

  // ========== RACL HPOT — Patologias Potenciais (RETRATO) ==========
  if (data.patologias.potenciais.length > 0) {
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
  if (data.orgaos.length > 0) {
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
    const inline = m.medicamentoDoseInline || `${m.nome}${m.dose ? " " + m.dose : ""}`;
    y = drawTableRow(doc, hmedCols, [inline, m.posologia || "—", m.indicacaoClinica || m.motivoUso || "—", m.statusAtual, m.substituicaoNatural || "—", m.evidenciaMelhora || "—"], y, i % 2 === 0);
  });
  drawFooter(doc, true);

  // ========== RACL HFOR — Formulas Magistrais (RETRATO, paginado) ==========
  const formulas = data.medicamentos.filter((m: any) => m.tipoMed === "formula" && m.componentesFormula && m.componentesFormula.length > 0);
  if (formulas.length > 0) {
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
  if (data.eventosMedicacao.length > 0) {
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
  if (medsComSub.length > 0) {
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
  if (data.patologias.diagnosticadas.length > 0) {
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
  if (data.curvas.doenca.length > 0 || data.curvas.saude.length > 0) {
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

  // ========== RACL HPLA — Proxima Etapa (RETRATO, Opcional) ==========
  if (data.proximasEtapas.length > 0) {
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

  doc.end();
  return stream;
}
