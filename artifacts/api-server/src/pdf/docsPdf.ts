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
};

interface DocBase {
  paciente: { nome: string; cpf?: string; dataNascimento?: string };
  medico: string;
  unidade: string;
  dataBase: string;
}

function addPage(doc: PDFKit.PDFDocument) {
  doc.addPage({ size: "A4", layout: "portrait", margins: { top: 40, bottom: 40, left: 40, right: 40 } });
}

function header(doc: PDFKit.PDFDocument, titulo: string, codigo: string) {
  doc.rect(0, 0, 595, 70).fill(CORES.azulPetroleo);
  doc.fontSize(18).font("Helvetica-Bold").fillColor(CORES.offWhite).text(titulo, 40, 20, { width: 345 });
  doc.fontSize(9).font("Helvetica").fillColor(CORES.douradoQueimado).text(codigo, 40, 48);
  doc.fontSize(10).font("Helvetica-Bold").fillColor(CORES.offWhite).text("INSTITUTO PADUA", 395, 22, { width: 160, align: "right" });
  doc.fontSize(6).font("Helvetica").fillColor(CORES.douradoQueimado).text("Pawards V15.2 | Padcon Tech", 395, 38, { width: 160, align: "right" });
}

function pacienteBlock(doc: PDFKit.PDFDocument, data: DocBase, y: number): number {
  const idade = data.paciente.dataNascimento
    ? Math.floor((Date.now() - new Date(data.paciente.dataNascimento).getTime()) / 31557600000)
    : "—";
  doc.rect(40, y, 515, 40).fill("#E8E4DC");
  doc.fontSize(10).font("Helvetica-Bold").fillColor(CORES.cinzaTexto).text(`Paciente: ${data.paciente.nome}`, 50, y + 8);
  doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaClaro)
    .text(`Idade: ${idade}  |  Data: ${data.dataBase}  |  Medico: ${data.medico}  |  Unidade: ${data.unidade}`, 50, y + 24);
  return y + 52;
}

function section(doc: PDFKit.PDFDocument, title: string, y: number): number {
  doc.rect(40, y, 4, 16).fill(CORES.douradoQueimado);
  doc.fontSize(11).font("Helvetica-Bold").fillColor(CORES.azulPetroleo).text(title, 52, y + 2);
  return y + 24;
}

function footer(doc: PDFKit.PDFDocument) {
  const footerY = 800;
  doc.moveTo(40, footerY).lineTo(555, footerY).lineWidth(0.3).stroke(CORES.cinzaClaro);
  doc.fontSize(6).font("Helvetica-Bold").fillColor(CORES.cinzaClaro)
    .text("PAWARDS - Sistema Gestao Saude", 40, footerY + 5, { width: 455, align: "center" });
  doc.fontSize(5.5).font("Helvetica").fillColor(CORES.cinzaClaro)
    .text("\u00A9 2024 PADCON - Tecnologia e Desenvolvimento", 40, footerY + 14, { width: 455, align: "center" });
  const badgeW = 52;
  const badgeH = 11;
  const badgeX = 555 - badgeW;
  const badgeY = footerY + 6;
  doc.rect(badgeX, badgeY, badgeW, badgeH).lineWidth(0.4).stroke(CORES.cinzaClaro);
  doc.fontSize(4.5).font("Helvetica").fillColor(CORES.cinzaClaro)
    .text("RASX-MATRIZ", badgeX, badgeY + 3, { width: badgeW, align: "center" });
}

function campo(doc: PDFKit.PDFDocument, label: string, valor: string, y: number): number {
  doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.azulPetroleo).text(`${label}: `, 50, y, { continued: true });
  doc.font("Helvetica").fillColor(CORES.cinzaTexto).text(valor);
  return y + 18;
}

function assinatura(doc: PDFKit.PDFDocument, medico: string, y: number): number {
  y += 30;
  doc.moveTo(150, y).lineTo(450, y).lineWidth(0.5).stroke(CORES.cinzaTexto);
  doc.fontSize(9).font("Helvetica").fillColor(CORES.cinzaClaro)
    .text(medico, 150, y + 6, { width: 300, align: "center" })
    .text("CRM/SP 000000", 150, y + 18, { width: 300, align: "center" });
  return y + 40;
}

function tableHeader(doc: PDFKit.PDFDocument, cols: { label: string; x: number; w: number }[], y: number): number {
  const last = cols[cols.length - 1];
  doc.rect(cols[0].x, y, last.x + last.w - cols[0].x, 18).fill(CORES.azulPetroleo);
  for (const c of cols) {
    doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.offWhite).text(c.label, c.x + 4, y + 5, { width: c.w - 8 });
  }
  return y + 18;
}

function tableRow(doc: PDFKit.PDFDocument, cols: { x: number; w: number }[], vals: string[], y: number, alt: boolean): number {
  const last = cols[cols.length - 1];
  if (alt) doc.rect(cols[0].x, y, last.x + last.w - cols[0].x, 16).fill("#F5F2EC");
  for (let i = 0; i < cols.length; i++) {
    doc.fontSize(7).font("Helvetica").fillColor(CORES.cinzaTexto).text(vals[i] || "—", cols[i].x + 4, y + 4, { width: cols[i].w - 8 });
  }
  return y + 16;
}

export function gerarFichaCadastroPdf(data: DocBase & { telefone?: string; email?: string }): PassThrough {
  const stream = new PassThrough();
  const doc = new PDFDocument({ size: "A4", layout: "portrait", margins: { top: 40, bottom: 40, left: 40, right: 40 }, autoFirstPage: false });
  doc.pipe(stream);
  addPage(doc);
  header(doc, "Ficha de Cadastro do Paciente", "PCAD 001");
  let y = 80;
  y = pacienteBlock(doc, data, y);
  y = section(doc, "Dados Pessoais", y);
  y = campo(doc, "Nome Completo", data.paciente.nome, y);
  y = campo(doc, "CPF", data.paciente.cpf || "Nao informado", y);
  y = campo(doc, "Data de Nascimento", data.paciente.dataNascimento ? new Date(data.paciente.dataNascimento).toLocaleDateString("pt-BR") : "—", y);
  y = campo(doc, "Telefone", data.telefone || "Nao informado", y);
  y = campo(doc, "Email", data.email || "Nao informado", y);
  y += 12;
  y = section(doc, "Informacoes do Tratamento", y);
  y = campo(doc, "Medico Responsavel", data.medico, y);
  y = campo(doc, "Unidade", data.unidade, y);
  y = campo(doc, "Data de Cadastro", data.dataBase, y);
  y = campo(doc, "Status", "ATIVO", y);
  y = campo(doc, "Modalidade", "Presencial", y);
  y += 20;
  doc.rect(40, y, 515, 30).fill("#F0ECE4");
  doc.fontSize(7).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro)
    .text("Documento gerado automaticamente pelo Pawards V15.2. Powered by Padcon Tech. Todos os direitos reservados.", 50, y + 8, { width: 495 });
  footer(doc);
  doc.end();
  return stream;
}

export function gerarReceitaPdf(data: DocBase & { medicamentos: { nome: string; posologia: string; uso: string }[] }): PassThrough {
  const stream = new PassThrough();
  const doc = new PDFDocument({ size: "A4", layout: "portrait", margins: { top: 40, bottom: 40, left: 40, right: 40 }, autoFirstPage: false });
  doc.pipe(stream);
  addPage(doc);
  header(doc, "Receita Medica", "PREC 001");
  let y = 80;
  y = pacienteBlock(doc, data, y);
  y = section(doc, "Prescricao Medica", y);
  data.medicamentos.forEach((m, i) => {
    doc.rect(40, y, 515, 2).fill(CORES.douradoQueimado);
    y += 6;
    doc.fontSize(10).font("Helvetica-Bold").fillColor(CORES.azulPetroleo).text(`${i + 1}. ${m.nome}`, 50, y);
    y += 16;
    doc.fontSize(9).font("Helvetica").fillColor(CORES.cinzaTexto).text(`Posologia: ${m.posologia}`, 60, y);
    y += 14;
    doc.fontSize(9).font("Helvetica").fillColor(CORES.cinzaClaro).text(`Uso: ${m.uso}`, 60, y);
    y += 20;
  });
  y += 20;
  y = section(doc, "Observacoes", y);
  doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto)
    .text("- Manter acompanhamento clinico conforme agendamento.", 50, y); y += 14;
  doc.text("- Em caso de reacao adversa, suspender e comunicar o medico.", 50, y); y += 14;
  doc.text("- Nao alterar doses sem orientacao medica.", 50, y); y += 30;
  assinatura(doc, data.medico, y);
  footer(doc);
  doc.end();
  return stream;
}

export function gerarAtestadoPdf(data: DocBase & { motivo: string; dias: number; cid?: string }): PassThrough {
  const stream = new PassThrough();
  const doc = new PDFDocument({ size: "A4", layout: "portrait", margins: { top: 40, bottom: 40, left: 40, right: 40 }, autoFirstPage: false });
  doc.pipe(stream);
  addPage(doc);
  header(doc, "Atestado Medico", "PATE 001");
  let y = 80;
  y = pacienteBlock(doc, data, y);
  y += 20;
  y = section(doc, "Atestado", y);
  const texto = `Atesto para os devidos fins que o(a) paciente ${data.paciente.nome}${data.paciente.cpf ? ", CPF " + data.paciente.cpf : ""}, esteve sob cuidados medicos nesta data, necessitando de afastamento de suas atividades por ${data.dias} (${data.dias === 1 ? "um" : data.dias}) dia${data.dias > 1 ? "s" : ""}, a partir de ${data.dataBase}.`;
  doc.fontSize(11).font("Helvetica").fillColor(CORES.cinzaTexto).text(texto, 50, y, { width: 495, lineGap: 4 });
  y += doc.heightOfString(texto, { width: 495 }) + 20;
  if (data.cid) { doc.fontSize(9).font("Helvetica").fillColor(CORES.cinzaClaro).text(`CID-10: ${data.cid}`, 50, y); y += 16; }
  doc.fontSize(9).font("Helvetica").fillColor(CORES.cinzaClaro).text(`Motivo: ${data.motivo}`, 50, y);
  y += 40;
  assinatura(doc, data.medico, y);
  footer(doc);
  doc.end();
  return stream;
}

export function gerarContratoPdf(data: DocBase): PassThrough {
  const stream = new PassThrough();
  const doc = new PDFDocument({ size: "A4", layout: "portrait", margins: { top: 40, bottom: 40, left: 40, right: 40 }, autoFirstPage: false });
  doc.pipe(stream);
  const W = 495;
  addPage(doc);
  header(doc, "Contrato de Prestacao de Servicos Medicos", "PCON 001");
  let y = 80;
  y = pacienteBlock(doc, data, y);

  const p = (text: string, yy: number) => {
    doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto).text(text, 50, yy, { width: W, lineGap: 3 });
    return yy + doc.heightOfString(text, { width: W }) + 8;
  };

  y = section(doc, "Clausula 1 — Objeto", y);
  y = p(`O presente contrato tem por objeto a prestacao de servicos medicos pela PADUCCIA CLINICA MEDICA LTDA (Instituto Padua), CNPJ 63.865.940/0001-63, com sede na Rua Guaxupe, 327, Vila Formosa, Sao Paulo/SP, representada pelo Dr. ${data.medico}, ao CONTRATANTE ${data.paciente.nome}${data.paciente.cpf ? ", CPF " + data.paciente.cpf : ""}, incluindo consultas, exames, procedimentos e acompanhamento clinico conforme protocolo terapeutico individualizado.`, y);
  y = section(doc, "Clausula 2 — Obrigacoes do Contratado", y);
  y = p("O Instituto Padua compromete-se a: a) Prestar atendimento conforme as melhores praticas clinicas; b) Manter sigilo sobre os dados do paciente; c) Fornecer relatorios, receitas e laudos; d) Disponibilizar agendamento eletronico; e) Armazenar documentos em nuvem com controle de acesso.", y);
  y = section(doc, "Clausula 3 — Obrigacoes do Contratante", y);
  y = p("O CONTRATANTE compromete-se a: a) Comparecer as consultas ou reagendar com 24h de antecedencia; b) Seguir orientacoes medicas; c) Informar reacoes adversas; d) Manter dados atualizados; e) Efetuar pagamento conforme acordado.", y);
  y = section(doc, "Clausula 4 — Vigencia e Rescisao", y);
  y = p("Vigencia por tempo indeterminado, podendo ser rescindido por qualquer parte mediante comunicacao escrita com 30 dias de antecedencia.", y);
  y = section(doc, "Clausula 5 — Foro", y);
  y = p("Foro da Comarca de Sao Paulo/SP para quaisquer controversias.", y);

  y += 10;
  doc.moveTo(50, y).lineTo(280, y).lineWidth(0.5).stroke(CORES.cinzaTexto);
  doc.moveTo(310, y).lineTo(540, y).lineWidth(0.5).stroke(CORES.cinzaTexto);
  doc.fontSize(7).font("Helvetica").fillColor(CORES.cinzaClaro)
    .text("Assinatura do Paciente", 50, y + 4, { width: 230, align: "center" })
    .text("Assinatura do Medico", 310, y + 4, { width: 230, align: "center" });
  y += 20;
  doc.fontSize(7).fillColor(CORES.cinzaClaro).text("Data: ____/____/________", 50, y).text("Local: __________________________", 310, y);
  footer(doc);
  doc.end();
  return stream;
}

export function gerarOrcamentoFinanceiroPdf(data: DocBase & { itens: { descricao: string; valor: number }[]; total: number }): PassThrough {
  const stream = new PassThrough();
  const doc = new PDFDocument({ size: "A4", layout: "portrait", margins: { top: 40, bottom: 40, left: 40, right: 40 }, autoFirstPage: false });
  doc.pipe(stream);
  addPage(doc);
  header(doc, "Orcamento e Comprovante Financeiro", "PFIN 001");
  let y = 80;
  y = pacienteBlock(doc, data, y);
  y = section(doc, "Detalhamento dos Servicos", y);
  const cols = [
    { label: "DESCRICAO", x: 40, w: 350 },
    { label: "VALOR (R$)", x: 390, w: 165 },
  ];
  y = tableHeader(doc, cols, y);
  data.itens.forEach((item, i) => {
    y = tableRow(doc, cols, [item.descricao, `R$ ${item.valor.toFixed(2)}`], y, i % 2 === 0);
  });
  y += 8;
  doc.rect(390, y, 165, 20).fill(CORES.azulPetroleo);
  doc.fontSize(10).font("Helvetica-Bold").fillColor(CORES.offWhite).text(`TOTAL: R$ ${data.total.toFixed(2)}`, 394, y + 4, { width: 157, align: "right" });
  y += 32;
  y = section(doc, "Condicoes de Pagamento", y);
  doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto)
    .text("• PIX, cartao de credito ou boleto bancario", 50, y); y += 14;
  doc.text("• Parcelamento em ate 12x no cartao", 50, y); y += 14;
  doc.text("• Orcamento valido por 30 dias", 50, y);
  footer(doc);
  doc.end();
  return stream;
}

export function gerarLaudoExamePdf(data: DocBase & { exames: { nome: string; justificativa: string }[] }): PassThrough {
  const stream = new PassThrough();
  const doc = new PDFDocument({ size: "A4", layout: "portrait", margins: { top: 40, bottom: 40, left: 40, right: 40 }, autoFirstPage: false });
  doc.pipe(stream);
  addPage(doc);
  header(doc, "Laudo e Solicitacao de Exames", "PEXM 001");
  let y = 80;
  y = pacienteBlock(doc, data, y);
  y = section(doc, "Exames Solicitados", y);
  data.exames.forEach((e, i) => {
    doc.rect(40, y, 515, 2).fill(CORES.douradoQueimado);
    y += 6;
    doc.fontSize(10).font("Helvetica-Bold").fillColor(CORES.azulPetroleo).text(`${i + 1}. ${e.nome}`, 50, y);
    y += 16;
    doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaClaro).text(`Justificativa: ${e.justificativa}`, 60, y, { width: 480 });
    y += doc.heightOfString(`Justificativa: ${e.justificativa}`, { width: 480 }) + 8;
  });
  y += 20;
  y = section(doc, "Observacoes", y);
  doc.fontSize(9).font("Helvetica").fillColor(CORES.cinzaTexto)
    .text("Exames para acompanhamento e evolucao terapeutica.", 50, y); y += 14;
  doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaClaro)
    .text("Jejum de 12h quando aplicavel.", 50, y);
  y += 30;
  assinatura(doc, data.medico, y);
  footer(doc);
  doc.end();
  return stream;
}

export function gerarRelatorioPatologiasPdf(data: DocBase & { patologias: { nome: string; orgao: string; intensidade: string; semaforo: string; leitura: string }[] }): PassThrough {
  const stream = new PassThrough();
  const doc = new PDFDocument({ size: "A4", layout: "portrait", margins: { top: 40, bottom: 40, left: 40, right: 40 }, autoFirstPage: false });
  doc.pipe(stream);
  addPage(doc);
  header(doc, "Relatorio de Patologias", "PPAT 001");
  let y = 80;
  y = pacienteBlock(doc, data, y);
  y = section(doc, "Patologias Diagnosticadas e em Acompanhamento", y);
  const cols = [
    { label: "PATOLOGIA", x: 40, w: 130 },
    { label: "ORGAO", x: 170, w: 90 },
    { label: "INTENSIDADE", x: 260, w: 70 },
    { label: "SEMAFORO", x: 330, w: 55 },
    { label: "LEITURA CLINICA", x: 385, w: 170 },
  ];
  y = tableHeader(doc, cols, y);
  data.patologias.forEach((p, i) => {
    y = tableRow(doc, cols, [p.nome, p.orgao, p.intensidade, p.semaforo, p.leitura], y, i % 2 === 0);
  });
  y += 20;
  y = section(doc, "Resumo", y);
  doc.fontSize(9).font("Helvetica").fillColor(CORES.cinzaTexto)
    .text(`Total de patologias em acompanhamento: ${data.patologias.length}`, 50, y); y += 14;
  const vermelhas = data.patologias.filter(p => p.semaforo === "vermelho").length;
  const amarelas = data.patologias.filter(p => p.semaforo === "amarelo").length;
  const verdes = data.patologias.filter(p => p.semaforo === "verde").length;
  doc.text(`Semaforo: ${vermelhas} vermelho, ${amarelas} amarelo, ${verdes} verde`, 50, y);
  footer(doc);
  doc.end();
  return stream;
}

export function gerarTermoConsentimentoPdf(data: DocBase & { procedimento: string }): PassThrough {
  const stream = new PassThrough();
  const doc = new PDFDocument({ size: "A4", layout: "portrait", margins: { top: 40, bottom: 40, left: 40, right: 40 }, autoFirstPage: false });
  doc.pipe(stream);
  addPage(doc);
  header(doc, "Termo de Consentimento para Procedimento", "PTER 001");
  let y = 80;
  y = pacienteBlock(doc, data, y);
  y = section(doc, "Consentimento Informado", y);
  const W = 495;
  const p = (text: string, yy: number) => {
    doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto).text(text, 50, yy, { width: W, lineGap: 3 });
    return yy + doc.heightOfString(text, { width: W }) + 8;
  };
  y = p(`Eu, ${data.paciente.nome}${data.paciente.cpf ? ", CPF " + data.paciente.cpf : ""}, declaro que fui devidamente informado(a) pelo Dr. ${data.medico} sobre o procedimento de ${data.procedimento}, incluindo:`, y);
  y = p("1. Natureza e objetivo do procedimento;", y);
  y = p("2. Riscos e beneficios esperados;", y);
  y = p("3. Alternativas terapeuticas disponiveis;", y);
  y = p("4. Possibilidade de reacoes adversas ou complicacoes;", y);
  y = p("5. Liberdade de revogar este consentimento a qualquer momento.", y);
  y += 8;
  y = p("Declaro que tive oportunidade de esclarecer todas as minhas duvidas e que autorizo a realizacao do procedimento acima descrito.", y);
  y += 10;
  doc.moveTo(50, y).lineTo(280, y).lineWidth(0.5).stroke(CORES.cinzaTexto);
  doc.moveTo(310, y).lineTo(540, y).lineWidth(0.5).stroke(CORES.cinzaTexto);
  doc.fontSize(7).font("Helvetica").fillColor(CORES.cinzaClaro)
    .text("Assinatura do Paciente", 50, y + 4, { width: 230, align: "center" })
    .text("Assinatura do Medico", 310, y + 4, { width: 230, align: "center" });
  y += 20;
  doc.fontSize(7).fillColor(CORES.cinzaClaro).text("Data: ____/____/________", 50, y);
  footer(doc);
  doc.end();
  return stream;
}
