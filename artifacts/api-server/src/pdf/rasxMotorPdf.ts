import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import {
  BlocoRAS, type PayloadRAS, BLOCO_LABELS, SUBGRUPO_LABELS,
  CLASSE_LABELS, type ClasseProcedimento, type ConsentimentoEspecifico,
  SubgrupoCLIN, SubgrupoJURI, SubgrupoFINA, SubgrupoACOM, Subgrupo4100,
} from "../lib/rasxEngine";

const CORES = {
  azulPetroleo: "#1B4F6C",
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

function addPage(doc: PDFKit.PDFDocument, landscape = false) {
  doc.addPage({ size: "A4", layout: landscape ? "landscape" : "portrait", margins: { top: 40, bottom: 40, left: 40, right: 40 } });
}

function drawHeader(doc: PDFKit.PDFDocument, titulo: string, codigo: string, landscape: boolean) {
  const w = landscape ? 842 : 595;
  doc.rect(0, 0, w, 70).fill(CORES.azulPetroleo);
  doc.fontSize(18).font("Helvetica-Bold").fillColor(CORES.offWhite).text(titulo, 40, 20, { width: w - 250 });
  doc.fontSize(9).font("Helvetica").fillColor(CORES.douradoQueimado).text(codigo, 40, 48);
  doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.douradoQueimado).text("PAWARDS", w - 160, 18, { width: 120, align: "right" });
  doc.fontSize(7).font("Helvetica").fillColor(CORES.offWhite).text(payload?.nick || "INSTITUTO PADUA", w - 160, 42, { width: 120, align: "right" });
}

let payload: PayloadRAS | null = null;

let pageCounter = 0;

function drawFooterMotor(doc: PDFKit.PDFDocument, landscape: boolean, p: PayloadRAS) {
  const w = landscape ? 842 : 595;
  const h = landscape ? 595 : 842;
  const fy = h - 52;
  doc.moveTo(40, fy).lineTo(w - 40, fy).lineWidth(0.3).stroke(CORES.cinzaClaro);

  pageCounter++;
  doc.fontSize(5).font("Helvetica").fillColor(CORES.cinzaClaro).text(`Pagina ${pageCounter}`, 40, fy + 4, { width: 60 });

  const nick = p.nick || "INSTITUTO PADUA";
  const rodape = `${nick} — CLINICA PADUCCIA | PADUCCIA CLINICA MEDICA LTDA - EPP | CNPJ 63.865.940/0001-63`;
  doc.fontSize(4.5).font("Helvetica").fillColor(CORES.cinzaClaro).text(rodape, 100, fy + 4, { width: w - 200, align: "center" });
  doc.fontSize(4).text("RUA GUAXUPE, 327 — VILA FORMOSA — SAO PAULO — SP | CNAE 8630-5/03", 100, fy + 12, { width: w - 200, align: "center" });
  doc.fontSize(4).text("Documento gerado pelo sistema RASX-MATRIZ | Developed by Pawards MedCore", 100, fy + 20, { width: w - 200, align: "center" });

  const bw = 60; const bh = 12;
  const bx = w - 40 - bw; const by = fy + 4;
  doc.rect(bx, by, bw, bh).lineWidth(0.3).stroke(CORES.cinzaClaro);
  doc.fontSize(5).font("Helvetica-Bold").fillColor(CORES.cinzaClaro).text(p.versao || "RASX-MATRIZ V6", bx, by + 3, { width: bw, align: "center" });
}

function drawPaciente(doc: PDFKit.PDFDocument, p: PayloadRAS, y: number, w: number): number {
  doc.rect(40, y, w - 80, 44).fill("#E8E4DC");
  doc.fontSize(10).font("Helvetica-Bold").fillColor(CORES.cinzaTexto).text(`Paciente: ${p.nomePaciente}`, 50, y + 6);
  const meta = [
    p.idade ? `Idade: ${p.idade}` : null,
    `Data: ${new Date(p.dataGeracao).toLocaleDateString("pt-BR")}`,
    `Medico: ${p.profissionalResponsavel}`,
    p.crmProfissional || null,
    `Unidade: ${p.unidade}`,
  ].filter(Boolean).join("  |  ");
  doc.fontSize(7).font("Helvetica").fillColor(CORES.cinzaClaro).text(meta, 50, y + 22, { width: w - 100 });
  return y + 54;
}

function drawSection(doc: PDFKit.PDFDocument, title: string, y: number): number {
  doc.rect(40, y, 4, 16).fill(CORES.douradoQueimado);
  doc.fontSize(11).font("Helvetica-Bold").fillColor(CORES.azulPetroleo).text(title, 52, y + 2);
  return y + 24;
}

function drawTH(doc: PDFKit.PDFDocument, cols: { label: string; x: number; w: number }[], y: number): number {
  const last = cols[cols.length - 1];
  doc.rect(cols[0].x, y, last.x + last.w - cols[0].x, 18).fill(CORES.azulPetroleo);
  cols.forEach(c => doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.offWhite).text(c.label, c.x + 4, y + 5, { width: c.w - 8 }));
  return y + 18;
}

function drawTR(doc: PDFKit.PDFDocument, cols: { x: number; w: number }[], vals: string[], y: number, alt: boolean): number {
  const last = cols[cols.length - 1];
  if (alt) doc.rect(cols[0].x, y, last.x + last.w - cols[0].x, 16).fill("#F5F2EC");
  cols.forEach((c, i) => doc.fontSize(7).font("Helvetica").fillColor(CORES.cinzaTexto).text(vals[i] || "—", c.x + 4, y + 4, { width: c.w - 8 }));
  return y + 16;
}

function drawParagraph(doc: PDFKit.PDFDocument, text: string, y: number, w = 495): number {
  doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto).text(text, 50, y, { width: w, lineGap: 3 });
  return y + doc.heightOfString(text, { width: w }) + 8;
}

function drawCheckbox(doc: PDFKit.PDFDocument, label: string, y: number): number {
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
    .text("Data: ____/____/________", 50, y)
    .text("Local: __________________________", 310, y);
  return y + 20;
}

function drawPlaceholders(doc: PDFKit.PDFDocument, p: PayloadRAS, y: number): number {
  y += 10;
  doc.fontSize(7).font("Helvetica").fillColor(CORES.cinzaClaro);
  const fields = [
    ["Profissional Responsavel", p.profissionalResponsavel],
    ["CRM", p.crmProfissional || "____________________"],
    ["Executor Tecnico", p.executorTecnico || "____________________"],
    ["Registro Executor", p.registroExecutor || "____________________"],
    ["Data Explicacao Presencial", "____/____/________"],
    ["Plataforma Assinatura Digital", "DOXITE / MANUAL"],
  ];
  fields.forEach(([label, val]) => {
    doc.text(`${label}: ${val}`, 50, y, { width: 495 });
    y += 12;
  });
  return y + 4;
}

function renderCLIN(doc: PDFKit.PDFDocument, p: PayloadRAS): void {
  const has = (sg: string) => p.subgrupos.includes(sg);

  if (has(SubgrupoCLIN.BASE)) {
    addPage(doc);
    drawHeader(doc, "Base Clinica — Estado Inicial", SubgrupoCLIN.BASE, false);
    let y = drawPaciente(doc, p, 80, 595);
    y = drawSection(doc, "Patologias Diagnosticadas", y);
    if (p.patologias.length > 0) {
      const cols = [
        { label: "PATOLOGIA", x: 40, w: 150 }, { label: "TIPO", x: 190, w: 80 },
        { label: "CID", x: 270, w: 60 }, { label: "OBSERVACAO", x: 330, w: 225 },
      ];
      y = drawTH(doc, cols, y);
      p.patologias.forEach((pt, i) => { y = drawTR(doc, cols, [pt.nome, pt.tipo, pt.cid || "—", "—"], y, i % 2 === 0); });
    } else {
      y = drawParagraph(doc, "Nenhuma patologia registrada no inicio do tratamento.", y);
    }
    y += 8;
    y = drawSection(doc, "Medicamentos em Uso no Inicio", y);
    if (p.medicamentos.length > 0) {
      const cols = [
        { label: "MEDICAMENTO + DOSE", x: 40, w: 180 }, { label: "POSOLOGIA", x: 220, w: 120 },
        { label: "EVENTO", x: 340, w: 80 }, { label: "SUBSTITUICAO", x: 420, w: 135 },
      ];
      y = drawTH(doc, cols, y);
      p.medicamentos.forEach((m, i) => { y = drawTR(doc, cols, [m.nome, m.posologia || "—", m.evento || "em uso", m.substituicao || "—"], y, i % 2 === 0); });
    }
    drawFooterMotor(doc, false, p);
  }

  if (has(SubgrupoCLIN.SESS)) {
    addPage(doc, true);
    drawHeader(doc, "Sessao — Medicamentos e Formulas", SubgrupoCLIN.SESS, true);
    let y = drawPaciente(doc, p, 80, 842);
    y = drawSection(doc, "Lista Completa de Medicacao com Dosagem Incorporada", y);
    const cols = [
      { label: "MEDICAMENTO + DOSE", x: 40, w: 160 }, { label: "POSOLOGIA", x: 200, w: 130 },
      { label: "DATA INICIO", x: 330, w: 90 }, { label: "EVENTO", x: 420, w: 80 },
      { label: "SUBSTITUICAO", x: 500, w: 140 }, { label: "OBSERVACAO", x: 640, w: 162 },
    ];
    y = drawTH(doc, cols, y);
    p.medicamentos.forEach((m, i) => {
      if (y > 500) { drawFooterMotor(doc, true, p); addPage(doc, true); drawHeader(doc, "Sessao (cont.)", SubgrupoCLIN.SESS, true); y = 80; y = drawTH(doc, cols, y); }
      y = drawTR(doc, cols, [m.nome, m.posologia || "—", m.dataInicio || "—", m.evento || "em uso", m.substituicao || "—", "—"], y, i % 2 === 0);
    });
    drawFooterMotor(doc, true, p);
  }

  if (has(SubgrupoCLIN.EVOL)) {
    addPage(doc, true);
    drawHeader(doc, "Evolucao Clinica Comparativa", SubgrupoCLIN.EVOL, true);
    let y = drawPaciente(doc, p, 80, 842);
    y = drawSection(doc, "Antes → Transicao → Atual", y);
    if (p.patologias.length > 0) {
      const cols = [
        { label: "PATOLOGIA", x: 40, w: 140 }, { label: "TIPO", x: 180, w: 70 },
        { label: "CID", x: 250, w: 60 }, { label: "MEDICACAO", x: 310, w: 200 },
        { label: "OBSERVACAO", x: 510, w: 292 },
      ];
      y = drawTH(doc, cols, y);
      p.patologias.forEach((pt, i) => {
        const med = p.medicamentos.find(m => m.nome.toLowerCase().includes(pt.nome.toLowerCase().slice(0, 4)));
        y = drawTR(doc, cols, [pt.nome, pt.tipo, pt.cid || "—", med?.nome || "—", "—"], y, i % 2 === 0);
      });
    }
    if (p.curvas && p.curvas.length > 0) {
      y += 12;
      y = drawSection(doc, "Curvas de Acompanhamento", y);
      p.curvas.forEach(c => {
        doc.fontSize(7).font("Helvetica").fillColor(CORES.cinzaTexto).text(`${c.tipo}: ${c.data} — ${c.valor}`, 50, y, { width: 700 });
        y += 14;
      });
    }
    drawFooterMotor(doc, true, p);
  }

  if (has(SubgrupoCLIN.POSP)) {
    addPage(doc);
    drawHeader(doc, "Pos-Procedimento — Orientacoes", SubgrupoCLIN.POSP, false);
    let y = drawPaciente(doc, p, 80, 595);
    y = drawSection(doc, "Orientacoes Pos-Procedimento", y);
    y = drawParagraph(doc, "Prezado(a) paciente, seguem as orientacoes apos o procedimento realizado:", y);
    const orientacoes = [
      "Hidratacao abundante nas proximas 24 horas (minimo 2 litros de agua)",
      "Evitar atividade fisica intensa nas proximas 48 horas",
      "Manter alimentacao leve e equilibrada",
      "Informar imediatamente em caso de: febre acima de 38°C, dor intensa, inchaço ou vermelhidao no local",
      "Retornar para revisao conforme agendamento",
    ];
    orientacoes.forEach(o => { y = drawCheckbox(doc, o, y); });
    y += 8;
    if (p.proximasEtapas && p.proximasEtapas.length > 0) {
      y = drawSection(doc, "Proximos Passos", y);
      p.proximasEtapas.forEach(e => {
        doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto).text(`• ${e.descricao}${e.data ? " — " + e.data : ""}`, 50, y, { width: 495 });
        y += 14;
      });
    }
    y = drawPlaceholders(doc, p, y);
    drawFooterMotor(doc, false, p);
  }
}

function renderJURI(doc: PDFKit.PDFDocument, p: PayloadRAS): void {
  const has = (sg: string) => p.subgrupos.includes(sg);

  if (has(SubgrupoJURI.BASE)) {
    addPage(doc);
    drawHeader(doc, "Base Juridica — LGPD e Privacidade", SubgrupoJURI.BASE, false);
    let y = drawPaciente(doc, p, 80, 595);

    const termosBase = getTermosDBPorSubgrupo("JURI.BASE");
    const termoLGPD = termosBase.find(t => t.categoria === "lgpd");
    const termoPriv = termosBase.find(t => t.categoria === "privacidade");
    const termoNGar = termosBase.find(t => t.categoria === "nao_garantia");

    y = drawSection(doc, "Lei Geral de Protecao de Dados (Lei 13.709/2018)", y);
    const lgpdIntro = `Eu, ${p.nomePaciente}${p.cpf ? ", CPF " + p.cpf : ""}, autorizo o ${p.nick || "Instituto Padua"} (PADUCCIA CLINICA MEDICA LTDA, CNPJ 63.865.940/0001-63) e o ${p.profissionalResponsavel} a coletar, armazenar, processar e utilizar meus dados pessoais e dados sensiveis de saude exclusivamente para fins de:`;
    y = drawParagraph(doc, lgpdIntro, y);
    y = drawCheckbox(doc, "Prestacao de servicos medicos e acompanhamento clinico", y);
    y = drawCheckbox(doc, "Elaboracao de prontuario eletronico e relatorios clinicos (RASX/REVO)", y);
    y = drawCheckbox(doc, "Comunicacao via WhatsApp e email para fins clinicos e agendamento", y);
    y = drawCheckbox(doc, "Armazenamento em nuvem (Google Drive) com acesso restrito ao medico responsavel", y);
    y = drawCheckbox(doc, "Geracao de PDFs clinicos, evolutivos e juridicos para uso exclusivo do paciente e equipe medica", y);
    y += 6;
    const lgpdTexto = termoLGPD?.textoCompleto || "Os dados serao mantidos pelo prazo minimo de 20 anos conforme Resolucao CFM 1.821/2007. O titular pode solicitar acesso, correcao, anonimizacao ou eliminacao dos dados (quando permitido por lei) a qualquer momento.";
    y = drawParagraph(doc, lgpdTexto, y);
    if (termoLGPD) { doc.fontSize(4).font("Helvetica").fillColor(CORES.cinzaClaro).text(`[Termo ID ${termoLGPD.id} — v${termoLGPD.versao}]`, 50, y); y += 8; }

    y += 6;
    y = drawSection(doc, "Politica de Privacidade e Sigilo Medico", y);
    const privTexto = termoPriv?.textoCompleto || `O ${p.nick} e o ${p.profissionalResponsavel} comprometem-se a manter sigilo absoluto sobre todas as informacoes clinicas conforme art. 73 do Codigo de Etica Medica e art. 154 do Codigo Penal. Nao compartilhar dados com terceiros sem autorizacao expressa, exceto quando exigido por lei ou ordem judicial.`;
    y = drawParagraph(doc, privTexto, y);
    if (termoPriv) { doc.fontSize(4).font("Helvetica").fillColor(CORES.cinzaClaro).text(`[Termo ID ${termoPriv.id} — v${termoPriv.versao}]`, 50, y); y += 8; }

    y += 6;
    y = drawSection(doc, "Termo de Nao-Garantia de Resultados", y);
    const ngarTexto = termoNGar?.textoCompleto || "A Medicina nao e uma ciencia exata. Resultados variam conforme caracteristicas individuais, adesao ao tratamento, fatores geneticos, ambientais e comportamentais. O medico se compromete a empregar os melhores recursos disponiveis, baseados em evidencias cientificas.";
    y = drawParagraph(doc, ngarTexto, y);
    if (termoNGar) { doc.fontSize(4).font("Helvetica").fillColor(CORES.cinzaClaro).text(`[Termo ID ${termoNGar.id} — v${termoNGar.versao}]`, 50, y); y += 8; }

    y = drawAssinatura(doc, y);
    drawFooterMotor(doc, false, p);
  }

  if (has(SubgrupoJURI.CONS)) {
    addPage(doc);
    const classeInfo = p.classeProcedimento ? CLASSE_LABELS[p.classeProcedimento] : null;
    const tituloConsent = classeInfo
      ? `Consentimento Especifico — ${classeInfo.descricao} (${p.consentimentoEspecifico})`
      : "Consentimento Global para Tratamento (TCLE)";
    drawHeader(doc, tituloConsent, p.consentimentoEspecifico || SubgrupoJURI.CONS, false);
    let y = drawPaciente(doc, p, 80, 595);

    const termoCons = p.consentimentoEspecifico
      ? getTermoDB("JURI.CONS", p.consentimentoEspecifico)
      : getTermoDB("JURI.CONS");
    const termoTCLE = getTermosDBPorSubgrupo("JURI.CONS").find(t => t.categoria === "tcle_global");

    y = drawSection(doc, "Termo de Consentimento Livre e Esclarecido", y);
    const tcleTexto = termoTCLE?.textoCompleto || `Declaro que fui informado(a) pelo ${p.profissionalResponsavel} sobre meu quadro clinico, incluindo diagnosticos, prognosticos, riscos e alternativas terapeuticas.`;
    y = drawParagraph(doc, tcleTexto, y);
    if (termoTCLE) { doc.fontSize(4).font("Helvetica").fillColor(CORES.cinzaClaro).text(`[Termo ID ${termoTCLE.id} — v${termoTCLE.versao}]`, 50, y); y += 8; }

    if (classeInfo) {
      y = drawSection(doc, `Riscos Especificos — ${classeInfo.descricao}`, y);
      y = drawParagraph(doc, `Eixo juridico central: ${classeInfo.eixoJuridico}`, y);
      y += 4;

      const riscosHardcoded: Record<string, string[]> = {
        CFOR: ["Variacao individual na absorcao e resposta as formulas manipuladas", "Interacoes medicamentosas entre componentes da formula", "Necessidade de ajuste de dosagem conforme resposta clinica", "Possiveis efeitos gastrointestinais transitoveis"],
        CIMU: ["Dor local no ponto de aplicacao", "Formacao de hematoma ou nodulo no local", "Necessidade de monitoramento clinico apos aplicacao", "Variacao individual na absorcao intramuscular"],
        CEND: ["Risco de reacao imediata durante infusao endovenosa", "Necessidade de ambiente controlado e supervisionado", "Possibilidade de flebite ou infiltracao no acesso venoso", "Protocolo de seguranca com observacao pos-infusao"],
        CIMP: ["Efeitos sistemicos do implante hormonal/terapeutico", "Necessidade de exames previos e acompanhamento", "Nao reversao imediata apos implantacao", "Possivel necessidade de remocao cirurgica"],
        CEIN: ["Possibilidade de assimetria nos resultados", "Risco de hematoma, edema ou equimose", "Resultado variavel conforme resposta individual", "Necessidade de sessoes complementares"],
        CETE: ["Risco de queimadura por energia termica ou luminosa", "Sensibilidade ao fototipo do paciente", "Possibilidade de hiperpigmentacao ou hipopigmentacao", "Necessidade de cuidados pos-procedimento rigorosos"],
      };

      const riscosFromDB = termoCons?.riscosEspecificos as string[] | undefined;
      const riscos = (riscosFromDB && riscosFromDB.length > 0)
        ? riscosFromDB
        : (p.consentimentoEspecifico ? riscosHardcoded[p.consentimentoEspecifico] || [] : []);
      riscos.forEach(r => { y = drawCheckbox(doc, r, y); });

      if (termoCons) {
        y += 4;
        y = drawParagraph(doc, termoCons.textoCompleto, y);
        doc.fontSize(4).font("Helvetica").fillColor(CORES.cinzaClaro).text(`[Termo ID ${termoCons.id} — v${termoCons.versao}]`, 50, y); y += 8;
      }
    }

    if (p.patologias.length > 0) {
      y += 4;
      y = drawSection(doc, "Patologias em Acompanhamento", y);
      p.patologias.forEach(pt => {
        doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto).text(`• ${pt.nome}${pt.cid ? " (CID: " + pt.cid + ")" : ""}`, 60, y, { width: 480 });
        y += 14;
      });
    }

    if (p.medicamentos.length > 0) {
      y += 4;
      y = drawSection(doc, "Medicamentos / Formulas Prescritos", y);
      p.medicamentos.forEach(m => {
        doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto).text(`• ${m.nome}${m.posologia ? " — " + m.posologia : ""}`, 60, y, { width: 480 });
        y += 14;
      });
    }

    y = drawParagraph(doc, "Autorizo a realizacao dos procedimentos necessarios, incluindo solicitacao de exames complementares, ajuste de posologia e substituicao terapeutica, conforme evolucao clinica.", y);
    y = drawPlaceholders(doc, p, y);
    y = drawAssinatura(doc, y);
    drawFooterMotor(doc, false, p);
  }

  if (has(SubgrupoJURI.IMAG)) {
    addPage(doc);
    drawHeader(doc, "Autorizacao de Uso de Imagem", SubgrupoJURI.IMAG, false);
    let y = drawPaciente(doc, p, 80, 595);

    const termoImag = getTermosDBPorSubgrupo("JURI.IMAG")[0];

    y = drawSection(doc, "Direito de Imagem", y);
    const imagTexto = termoImag?.textoCompleto || `Eu, ${p.nomePaciente}, autorizo / nao autorizo (riscar o que nao se aplica) o uso de minha imagem (fotografias e videos) pelo ${p.nick} para fins de:`;
    y = drawParagraph(doc, imagTexto, y);
    if (!termoImag) {
      y = drawCheckbox(doc, "Documentacao clinica e prontuario medico", y);
      y = drawCheckbox(doc, "Apresentacao em congressos e eventos cientificos (sem identificacao)", y);
      y = drawCheckbox(doc, "Material educativo (sem identificacao)", y);
      y = drawCheckbox(doc, "Divulgacao institucional (com identificacao — requer autorizacao separada)", y);
      y += 8;
      y = drawParagraph(doc, "A autorizacao pode ser revogada a qualquer momento, sem prejuizo do tratamento.", y);
    }
    if (termoImag) { doc.fontSize(4).font("Helvetica").fillColor(CORES.cinzaClaro).text(`[Termo ID ${termoImag.id} — v${termoImag.versao}]`, 50, y); y += 8; }
    y = drawAssinatura(doc, y);
    drawFooterMotor(doc, false, p);
  }

  if (has(SubgrupoJURI.DIGI)) {
    addPage(doc);
    drawHeader(doc, "Aceite Digital e Assinatura", SubgrupoJURI.DIGI, false);
    let y = drawPaciente(doc, p, 80, 595);

    const termoDigi = getTermosDBPorSubgrupo("JURI.DIGI")[0];

    y = drawSection(doc, "Termo de Aceite Digital", y);
    const digiTexto = termoDigi?.textoCompleto || `Declaro que tomei ciencia de todos os termos, consentimentos e documentos apresentados pelo ${p.nick} e pelo ${p.profissionalResponsavel}. A assinatura digital tem validade juridica conforme MP 2.200-2/2001 e Lei 14.063/2020.`;
    y = drawParagraph(doc, digiTexto, y);
    if (!termoDigi) {
      y += 8;
      y = drawSection(doc, "Plataforma de Assinatura", y);
      y = drawCheckbox(doc, "Assinatura presencial em documento fisico", y);
      y = drawCheckbox(doc, "Assinatura digital via plataforma DOXITE", y);
      y = drawCheckbox(doc, "Aceite digital via sistema PAWARDS", y);
    }
    if (termoDigi) { y += 4; doc.fontSize(4).font("Helvetica").fillColor(CORES.cinzaClaro).text(`[Termo ID ${termoDigi.id} — v${termoDigi.versao}]`, 50, y); y += 8; }
    y += 8;
    y = drawPlaceholders(doc, p, y);
    y = drawAssinatura(doc, y);
    drawFooterMotor(doc, false, p);
  }
}

function renderFINA(doc: PDFKit.PDFDocument, p: PayloadRAS): void {
  const has = (sg: string) => p.subgrupos.includes(sg);
  const fin = p.financeiro || {};

  if (has(SubgrupoFINA.ORCA)) {
    addPage(doc);
    drawHeader(doc, "Orcamento do Tratamento", SubgrupoFINA.ORCA, false);
    let y = drawPaciente(doc, p, 80, 595);
    y = drawSection(doc, "Detalhamento Financeiro", y);
    if (fin.orcamento && fin.orcamento.length > 0) {
      const cols = [
        { label: "ITEM / SERVICO", x: 40, w: 340 },
        { label: "VALOR (R$)", x: 380, w: 175 },
      ];
      y = drawTH(doc, cols, y);
      fin.orcamento.forEach((item, i) => {
        y = drawTR(doc, cols, [item.item, `R$ ${item.valor.toFixed(2)}`], y, i % 2 === 0);
      });
      y += 8;
      doc.rect(40, y, 515, 22).fill(CORES.azulPetroleo);
      doc.fontSize(10).font("Helvetica-Bold").fillColor(CORES.branco).text(`TOTAL: R$ ${(fin.totalOrcamento || 0).toFixed(2)}`, 50, y + 5, { width: 495, align: "right" });
      y += 30;
    } else {
      y = drawParagraph(doc, "Orcamento detalhado sera apresentado em consulta presencial.", y);
    }
    y = drawParagraph(doc, "Valores sujeitos a alteracao conforme ajustes no protocolo terapeutico. Validade do orcamento: 30 dias.", y);
    drawFooterMotor(doc, false, p);
  }

  if (has(SubgrupoFINA.PAGT)) {
    addPage(doc);
    drawHeader(doc, "Registro de Pagamentos", SubgrupoFINA.PAGT, false);
    let y = drawPaciente(doc, p, 80, 595);
    y = drawSection(doc, "Pagamentos Realizados", y);
    if (fin.pagamentos && fin.pagamentos.length > 0) {
      const cols = [
        { label: "DATA", x: 40, w: 120 },
        { label: "VALOR (R$)", x: 160, w: 120 },
        { label: "FORMA PAGAMENTO", x: 280, w: 275 },
      ];
      y = drawTH(doc, cols, y);
      fin.pagamentos.forEach((pg, i) => {
        y = drawTR(doc, cols, [pg.data, `R$ ${pg.valor.toFixed(2)}`, pg.forma], y, i % 2 === 0);
      });
      y += 8;
      doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.azulPetroleo)
        .text(`Total Pago: R$ ${(fin.totalPago || 0).toFixed(2)}  |  Saldo Restante: R$ ${(fin.saldo || 0).toFixed(2)}`, 50, y);
      y += 20;
    } else {
      y = drawParagraph(doc, "Nenhum pagamento registrado ate o momento.", y);
    }
    drawFooterMotor(doc, false, p);
  }

  if (has(SubgrupoFINA.REEM)) {
    addPage(doc);
    drawHeader(doc, "Documentacao para Reembolso", SubgrupoFINA.REEM, false);
    let y = drawPaciente(doc, p, 80, 595);
    y = drawSection(doc, "Informacoes para Reembolso", y);
    y = drawParagraph(doc, `Declaramos que o(a) paciente ${p.nomePaciente} realizou os seguintes procedimentos/tratamentos em nossa unidade:`, y);
    if (p.medicamentos.length > 0) {
      p.medicamentos.forEach(m => {
        doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto).text(`• ${m.nome}${m.posologia ? " — " + m.posologia : ""}`, 60, y, { width: 480 });
        y += 14;
      });
    }
    y += 8;
    y = drawParagraph(doc, "Este documento pode ser apresentado a operadora de saude ou plano para fins de reembolso, conforme legislacao vigente.", y);
    y = drawPlaceholders(doc, p, y);
    y = drawAssinatura(doc, y);
    drawFooterMotor(doc, false, p);
  }

  if (has(SubgrupoFINA.CIEN)) {
    addPage(doc);
    drawHeader(doc, "Termo de Ciencia Financeira", SubgrupoFINA.CIEN, false);
    let y = drawPaciente(doc, p, 80, 595);
    y = drawSection(doc, "Ciencia de Valores e Condicoes", y);
    y = drawParagraph(doc, `Declaro estar ciente dos valores, condicoes de pagamento e politica financeira do ${p.nick} para o tratamento proposto.`, y);
    y = drawCheckbox(doc, "Estou ciente do valor total do tratamento apresentado no orcamento", y);
    y = drawCheckbox(doc, "Compreendo que ajustes no protocolo podem alterar os valores", y);
    y = drawCheckbox(doc, "Fui informado(a) sobre as formas de pagamento disponiveis", y);
    y = drawCheckbox(doc, "Estou ciente da politica de cancelamento e reembolso", y);
    y = drawCheckbox(doc, "Compreendo que a inadimplencia pode resultar em suspensao do tratamento", y);
    y += 12;
    if (fin.totalOrcamento) {
      doc.fontSize(10).font("Helvetica-Bold").fillColor(CORES.azulPetroleo).text(`Valor de referencia: R$ ${fin.totalOrcamento.toFixed(2)}`, 50, y);
      y += 20;
    }
    y = drawAssinatura(doc, y);
    drawFooterMotor(doc, false, p);
  }
}

function renderACOM(doc: PDFKit.PDFDocument, p: PayloadRAS): void {
  const has = (sg: string) => p.subgrupos.includes(sg);

  if (has(SubgrupoACOM.REVO)) {
    addPage(doc, true);
    drawHeader(doc, "Revisao Evolutiva", SubgrupoACOM.REVO, true);
    let y = drawPaciente(doc, p, 80, 842);
    y = drawSection(doc, "Devolutiva Periodica de Evolucao", y);
    if (p.patologias.length > 0) {
      const cols = [
        { label: "PATOLOGIA", x: 40, w: 160 }, { label: "TIPO", x: 200, w: 80 },
        { label: "CID", x: 280, w: 60 }, { label: "MEDICACAO ATUAL", x: 340, w: 200 },
        { label: "OBSERVACAO", x: 540, w: 262 },
      ];
      y = drawTH(doc, cols, y);
      p.patologias.forEach((pt, i) => {
        const med = p.medicamentos.find(m => m.nome.toLowerCase().includes(pt.nome.toLowerCase().slice(0, 4)));
        y = drawTR(doc, cols, [pt.nome, pt.tipo, pt.cid || "—", med?.nome || "—", "—"], y, i % 2 === 0);
      });
    }
    y += 12;
    y = drawSection(doc, "Medicamentos Atuais", y);
    p.medicamentos.forEach(m => {
      doc.fontSize(7).font("Helvetica").fillColor(CORES.cinzaTexto).text(`• ${m.nome}${m.posologia ? " — " + m.posologia : ""}`, 50, y, { width: 750 });
      y += 12;
    });
    drawFooterMotor(doc, true, p);
  }

  if (has(SubgrupoACOM.JORN)) {
    addPage(doc, true);
    drawHeader(doc, "Jornada do Paciente", SubgrupoACOM.JORN, true);
    let y = drawPaciente(doc, p, 80, 842);
    y = drawSection(doc, "Timeline do Tratamento", y);
    const cols = [
      { label: "DATA", x: 40, w: 100 }, { label: "MEDICAMENTO", x: 140, w: 200 },
      { label: "POSOLOGIA", x: 340, w: 140 }, { label: "EVENTO", x: 480, w: 100 },
      { label: "SUBSTITUICAO", x: 580, w: 222 },
    ];
    y = drawTH(doc, cols, y);
    p.medicamentos.forEach((m, i) => {
      y = drawTR(doc, cols, [m.dataInicio || "—", m.nome, m.posologia || "—", m.evento || "em uso", m.substituicao || "—"], y, i % 2 === 0);
      if (y > 500) { drawFooterMotor(doc, true, p); addPage(doc, true); drawHeader(doc, "Jornada (cont.)", SubgrupoACOM.JORN, true); y = 80; y = drawTH(doc, cols, y); }
    });
    drawFooterMotor(doc, true, p);
  }

  if (has(SubgrupoACOM.META)) {
    addPage(doc);
    drawHeader(doc, "Metas Terapeuticas", SubgrupoACOM.META, false);
    let y = drawPaciente(doc, p, 80, 595);
    y = drawSection(doc, "Objetivos e Progresso", y);
    if (p.proximasEtapas && p.proximasEtapas.length > 0) {
      const cols = [
        { label: "DESCRICAO", x: 40, w: 300 },
        { label: "DATA PREVISTA", x: 340, w: 100 },
        { label: "STATUS", x: 440, w: 115 },
      ];
      y = drawTH(doc, cols, y);
      p.proximasEtapas.forEach((e, i) => {
        y = drawTR(doc, cols, [e.descricao, e.data || "—", "pendente"], y, i % 2 === 0);
      });
    } else {
      y = drawParagraph(doc, "Metas terapeuticas serao definidas na proxima consulta.", y);
    }
    drawFooterMotor(doc, false, p);
  }

  if (has(SubgrupoACOM.ALER)) {
    addPage(doc);
    drawHeader(doc, "Alertas Clinicos", SubgrupoACOM.ALER, false);
    let y = drawPaciente(doc, p, 80, 595);
    y = drawSection(doc, "Alertas e Orientacoes Importantes", y);
    const alertas = [
      "Monitorar sinais vitais e relatar qualquer alteracao significativa",
      "Informar imediatamente em caso de reacao adversa a medicamentos",
      "Manter hidratacao adequada (minimo 2 litros de agua/dia)",
      "Respeitar os horarios de medicacao conforme prescricao",
      "Nao interromper medicacao sem orientacao medica",
    ];
    alertas.forEach(a => { y = drawCheckbox(doc, a, y); });
    y += 12;
    y = drawSection(doc, "Contatos de Emergencia", y);
    y = drawParagraph(doc, `Clinica: (11) 3555-2000 | WhatsApp: (11) 97715-4000`, y);
    y = drawParagraph(doc, `Email: clinica.padua.agenda@gmail.com`, y);
    drawFooterMotor(doc, false, p);
  }
}

function render4100(doc: PDFKit.PDFDocument, p: PayloadRAS): void {
  const has = (sg: string) => p.subgrupos.includes(sg);

  if (has(Subgrupo4100.S4101)) {
    addPage(doc, true);
    drawHeader(doc, "Patologias — Doencas Diagnosticadas e Potenciais", Subgrupo4100.S4101, true);
    let y = drawPaciente(doc, p, 80, 842);
    y = drawSection(doc, "Mapa Completo de Patologias", y);
    if (p.patologias.length > 0) {
      const cols = [
        { label: "PATOLOGIA", x: 40, w: 200 }, { label: "TIPO", x: 240, w: 100 },
        { label: "CID-10", x: 340, w: 80 }, { label: "OBSERVACAO", x: 420, w: 382 },
      ];
      y = drawTH(doc, cols, y);
      p.patologias.forEach((pt, i) => { y = drawTR(doc, cols, [pt.nome, pt.tipo, pt.cid || "—", "—"], y, i % 2 === 0); });
    } else {
      y = drawParagraph(doc, "Nenhuma patologia registrada.", y);
    }
    drawFooterMotor(doc, true, p);
  }

  if (has(Subgrupo4100.S4102)) {
    addPage(doc);
    drawHeader(doc, "Fatores de Risco e Prevencao", Subgrupo4100.S4102, false);
    let y = drawPaciente(doc, p, 80, 595);
    y = drawSection(doc, "Analise de Risco", y);
    const potenciais = p.patologias.filter(pt => pt.tipo === "potencial");
    if (potenciais.length > 0) {
      potenciais.forEach(pt => {
        doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.vermelho).text(`⚠ ${pt.nome}`, 50, y, { width: 495 });
        y += 12;
        if (pt.cid) { doc.fontSize(7).font("Helvetica").fillColor(CORES.cinzaClaro).text(`CID: ${pt.cid}`, 60, y); y += 12; }
      });
    } else {
      y = drawParagraph(doc, "Nenhuma patologia potencial/de risco identificada no momento.", y);
    }
    y += 8;
    y = drawSection(doc, "Recomendacoes Preventivas", y);
    y = drawParagraph(doc, "Manter acompanhamento periodico para monitoramento de fatores de risco. Realizar exames conforme protocolo de revisao semestral.", y);
    drawFooterMotor(doc, false, p);
  }

  if (has(Subgrupo4100.S4103)) {
    addPage(doc, true);
    drawHeader(doc, "Medicacoes — Farmacoterapia e Integrativa", Subgrupo4100.S4103, true);
    let y = drawPaciente(doc, p, 80, 842);
    y = drawSection(doc, "Lista Completa de Medicacoes", y);
    if (p.medicamentos.length > 0) {
      const cols = [
        { label: "MEDICAMENTO + DOSE", x: 40, w: 200 }, { label: "POSOLOGIA", x: 240, w: 140 },
        { label: "DATA INICIO", x: 380, w: 100 }, { label: "EVENTO", x: 480, w: 100 },
        { label: "SUBSTITUICAO", x: 580, w: 222 },
      ];
      y = drawTH(doc, cols, y);
      p.medicamentos.forEach((m, i) => {
        if (y > 500) { drawFooterMotor(doc, true, p); addPage(doc, true); drawHeader(doc, "Medicacoes (cont.)", Subgrupo4100.S4103, true); y = 80; y = drawTH(doc, cols, y); }
        y = drawTR(doc, cols, [m.nome, m.posologia || "—", m.dataInicio || "—", m.evento || "em uso", m.substituicao || "—"], y, i % 2 === 0);
      });
    } else {
      y = drawParagraph(doc, "Nenhuma medicacao registrada.", y);
    }
    drawFooterMotor(doc, true, p);
  }

  if (has(Subgrupo4100.S4104)) {
    addPage(doc, true);
    drawHeader(doc, "Substituicoes — Transicao e Desmame Terapeutico", Subgrupo4100.S4104, true);
    let y = drawPaciente(doc, p, 80, 842);
    y = drawSection(doc, "Remedio → Substituicao Natural → Evidencia", y);
    const comSub = p.medicamentos.filter(m => m.substituicao);
    if (comSub.length > 0) {
      const cols = [
        { label: "MEDICAMENTO ORIGINAL", x: 40, w: 200 }, { label: "EVENTO", x: 240, w: 100 },
        { label: "SUBSTITUICAO", x: 340, w: 250 }, { label: "POSOLOGIA", x: 590, w: 212 },
      ];
      y = drawTH(doc, cols, y);
      comSub.forEach((m, i) => { y = drawTR(doc, cols, [m.nome, m.evento || "—", m.substituicao || "—", m.posologia || "—"], y, i % 2 === 0); });
    } else {
      y = drawParagraph(doc, "Nenhuma substituicao registrada ate o momento. Transicao terapeutica em avaliacao.", y);
    }
    drawFooterMotor(doc, true, p);
  }
}

export interface TermoJuridicoDB {
  id: number;
  bloco: string;
  subgrupo: string;
  consentimento: string | null;
  titulo: string;
  textoCompleto: string;
  categoria: string;
  riscosEspecificos: any;
  versao: number;
}

let termosDB: TermoJuridicoDB[] = [];

export function setTermosDB(termos: TermoJuridicoDB[]) {
  termosDB = termos;
}

function getTermoDB(subgrupo: string, consentimento?: string | null): TermoJuridicoDB | undefined {
  if (consentimento) {
    return termosDB.find(t => t.consentimento === consentimento);
  }
  return termosDB.find(t => t.subgrupo === subgrupo && !t.consentimento);
}

function getTermosDBPorSubgrupo(subgrupo: string): TermoJuridicoDB[] {
  return termosDB.filter(t => t.subgrupo === subgrupo);
}

export function gerarMotorPdf(p: PayloadRAS): PassThrough {
  payload = p;
  pageCounter = 0;
  const stream = new PassThrough();
  const doc = new PDFDocument({ size: "A4", layout: "portrait", margins: { top: 40, bottom: 40, left: 40, right: 40 }, autoFirstPage: false });
  doc.pipe(stream);

  switch (p.bloco) {
    case BlocoRAS.CLIN: renderCLIN(doc, p); break;
    case BlocoRAS.JURI: renderJURI(doc, p); break;
    case BlocoRAS.FINA: renderFINA(doc, p); break;
    case BlocoRAS.ACOM: renderACOM(doc, p); break;
    case BlocoRAS.P4100: render4100(doc, p); break;
  }

  if (doc.bufferedPageRange().count === 0) {
    addPage(doc);
    drawHeader(doc, BLOCO_LABELS[p.bloco]?.nome || "RAS", p.bloco, false);
    let y = drawPaciente(doc, p, 80, 595);
    y = drawSection(doc, "Sem dados suficientes para gerar este bloco", y);
    drawParagraph(doc, "Verifique se os dados do paciente (REVO) estao populados para gerar este bloco documental.", y);
    drawFooterMotor(doc, false, p);
  }

  doc.end();
  payload = null;
  return stream;
}

export function gerarMotorPdfConsolidado(payloads: PayloadRAS[]): PassThrough {
  pageCounter = 0;
  const stream = new PassThrough();
  const doc = new PDFDocument({ size: "A4", layout: "portrait", margins: { top: 40, bottom: 40, left: 40, right: 40 }, autoFirstPage: false });
  doc.pipe(stream);

  for (const p of payloads) {
    payload = p;
    switch (p.bloco) {
      case BlocoRAS.CLIN: renderCLIN(doc, p); break;
      case BlocoRAS.JURI: renderJURI(doc, p); break;
      case BlocoRAS.FINA: renderFINA(doc, p); break;
      case BlocoRAS.ACOM: renderACOM(doc, p); break;
      case BlocoRAS.P4100: render4100(doc, p); break;
    }
  }

  if (doc.bufferedPageRange().count === 0) {
    addPage(doc);
    const first = payloads[0];
    drawHeader(doc, "RAS Consolidado", "RASX", false);
    if (first) {
      let y = drawPaciente(doc, first, 80, 595);
      y = drawSection(doc, "Documento vazio", y);
      drawParagraph(doc, "Nenhum dado encontrado para gerar os blocos solicitados.", y);
      drawFooterMotor(doc, false, first);
    }
  }

  doc.end();
  payload = null;
  return stream;
}
