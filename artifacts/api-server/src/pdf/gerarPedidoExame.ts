import PDFDocument from "pdfkit";

function removeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function clean(str: string): string {
  return removeAccents(str).toUpperCase();
}

interface ExamePedido {
  nomeExame: string;
  corpoPedido: string;
  preparo: string | null;
  hd: string | null;
  cid: string | null;
}

interface DadosPedido {
  nomeEmpresa: string;
  enderecoEmpresa: string;
  cepEmpresa: string;
  cnpjEmpresa: string;
  telefoneEmpresa: string;
  nomeMedico: string;
  crm: string;
  cpfMedico: string;
  cnsMedico: string;
  especialidade: string;
  nomePaciente: string;
  cpfPaciente: string;
  enderecoPaciente: string;
  telefonePaciente: string;
  exames: ExamePedido[];
  hipoteseDiagnostica: string | null;
  cidPrincipal: string | null;
  observacao: string | null;
  data: string;
}

interface DadosJustificativa {
  nomeEmpresa: string;
  enderecoEmpresa: string;
  cepEmpresa: string;
  cnpjEmpresa: string;
  telefoneEmpresa: string;
  nomeMedico: string;
  crm: string;
  cpfMedico: string;
  cnsMedico: string;
  especialidade: string;
  nomePaciente: string;
  cpfPaciente: string;
  enderecoPaciente: string;
  telefonePaciente: string;
  exames: Array<{
    nomeExame: string;
    justificativa: string;
  }>;
  tipoJustificativa: string;
  hipoteseDiagnostica: string | null;
  cidPrincipal: string | null;
  data: string;
}

const LEFT = 40;
const RIGHT_LIMIT = 555;
const PAGE_WIDTH = 595;
const CONTENT_WIDTH = RIGHT_LIMIT - LEFT;
const HALF_WIDTH = CONTENT_WIDTH / 2;

function drawHeader(doc: InstanceType<typeof PDFDocument>, dados: {
  nomeEmpresa: string;
  enderecoEmpresa: string;
  cepEmpresa: string;
  cnpjEmpresa: string;
  telefoneEmpresa: string;
}) {
  const topY = 30;

  doc.save();
  doc.rect(LEFT, topY, 50, 50).fill("#444444");
  doc.fontSize(16).font("Helvetica-Bold").fillColor("#ffffff").text("CP", LEFT + 10, topY + 16, { width: 30, align: "center" });
  doc.restore();

  doc.fillColor("#111111");
  doc.fontSize(12).font("Helvetica-Bold").text(clean(dados.nomeEmpresa), LEFT + 62, topY + 6);
  doc.fontSize(7).font("Helvetica").fillColor("#666666");
  doc.text(`ENDERECO  ${clean(dados.enderecoEmpresa)}  CEP ${dados.cepEmpresa}`, LEFT + 62, topY + 24);
  doc.text(`CNPJ  ${dados.cnpjEmpresa}  |  TELEFONE  ${dados.telefoneEmpresa}`, LEFT + 62, topY + 34);

  doc.fillColor("#000000");
  const lineY = topY + 54;
  doc.moveTo(LEFT, lineY).lineTo(RIGHT_LIMIT, lineY).lineWidth(2).stroke("#222222");
  doc.lineWidth(1);

  return lineY + 10;
}

function drawPatientProfessionalBox(doc: InstanceType<typeof PDFDocument>, startY: number, dados: {
  nomePaciente: string;
  cpfPaciente: string;
  enderecoPaciente: string;
  telefonePaciente: string;
  nomeMedico: string;
  crm: string;
  cpfMedico: string;
  especialidade: string;
}) {
  const boxH = 80;

  doc.rect(LEFT, startY, HALF_WIDTH, boxH).stroke("#cccccc");
  doc.rect(LEFT + HALF_WIDTH, startY, HALF_WIDTH, boxH).stroke("#cccccc");

  const labelY = startY + 6;
  doc.fontSize(6).font("Helvetica-Bold").fillColor("#555555");
  doc.text("PACIENTE", LEFT + 10, labelY);
  doc.moveTo(LEFT + 10, labelY + 10).lineTo(LEFT + HALF_WIDTH - 10, labelY + 10).stroke("#e0e0e0");

  doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#111111");
  doc.text(clean(dados.nomePaciente), LEFT + 10, labelY + 16, { width: HALF_WIDTH - 20 });

  const patientInfoY = labelY + 30;
  doc.fontSize(7).font("Helvetica").fillColor("#444444");
  doc.text(`CPF  ${dados.cpfPaciente}`, LEFT + 10, patientInfoY);
  doc.text(`ENDERECO  ${clean(dados.enderecoPaciente)}`, LEFT + 10, patientInfoY + 10, { width: HALF_WIDTH - 20 });
  doc.text(`TELEFONE  ${dados.telefonePaciente}`, LEFT + 10, patientInfoY + 28);

  const rightX = LEFT + HALF_WIDTH;
  doc.fontSize(6).font("Helvetica-Bold").fillColor("#555555");
  doc.text("PROFISSIONAL", rightX + 10, labelY);
  doc.moveTo(rightX + 10, labelY + 10).lineTo(rightX + HALF_WIDTH - 10, labelY + 10).stroke("#e0e0e0");

  doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#111111");
  doc.text(clean(dados.nomeMedico), rightX + 10, labelY + 16, { width: HALF_WIDTH - 20 });

  doc.fontSize(7).font("Helvetica").fillColor("#444444");
  doc.text(clean(dados.especialidade), rightX + 10, patientInfoY);
  doc.text(dados.crm, rightX + 10, patientInfoY + 10);
  doc.text(`CPF ${dados.cpfMedico}`, rightX + 10, patientInfoY + 20);

  doc.fillColor("#000000");
  return startY + boxH + 10;
}

function drawTitleBar(doc: InstanceType<typeof PDFDocument>, startY: number, title: string) {
  doc.save();
  const barH = 24;
  doc.rect(LEFT, startY, CONTENT_WIDTH, barH).fill("#f8f8f8").stroke("#999999");
  doc.restore();
  doc.rect(LEFT, startY, CONTENT_WIDTH, barH).stroke("#999999");

  doc.fontSize(10).font("Helvetica-Bold").fillColor("#111111");
  doc.text(title, LEFT, startY + 7, { width: CONTENT_WIDTH, align: "center" });

  doc.fillColor("#000000");
  return startY + barH + 8;
}

function drawSignature(doc: InstanceType<typeof PDFDocument>, dados: {
  nomeMedico: string;
  crm: string;
  cnsMedico: string;
  especialidade: string;
}) {
  const sigY = doc.page.height - 100;
  const centerX = PAGE_WIDTH / 2;

  doc.moveTo(centerX - 90, sigY).lineTo(centerX + 90, sigY).stroke("#222222");
  doc.fontSize(9).font("Helvetica-Bold").fillColor("#111111");
  doc.text(clean(dados.nomeMedico), LEFT, sigY + 4, { width: CONTENT_WIDTH, align: "center" });
  doc.fontSize(7).font("Helvetica").fillColor("#666666");
  doc.text(clean(dados.especialidade), LEFT, sigY + 16, { width: CONTENT_WIDTH, align: "center" });
  doc.text(dados.crm, LEFT, sigY + 26, { width: CONTENT_WIDTH, align: "center" });
  doc.text(`CNS ${dados.cnsMedico}`, LEFT, sigY + 36, { width: CONTENT_WIDTH, align: "center" });
  doc.fillColor("#000000");
}

function drawFooter(doc: InstanceType<typeof PDFDocument>, dados: {
  nomeMedico: string;
  crm: string;
  data: string;
}) {
  const footY = doc.page.height - 48;
  doc.moveTo(LEFT, footY).lineTo(RIGHT_LIMIT, footY).stroke("#cccccc");

  doc.fontSize(5.5).font("Helvetica").fillColor("#aaaaaa");
  doc.text(`DOCUMENTO ASSINADO DIGITALMENTE - ${clean(dados.nomeMedico)} - ${dados.crm}`, LEFT, footY + 4, { width: CONTENT_WIDTH - 50 });
  doc.text(`DATA DE EMISSAO  ${dados.data}`, LEFT, footY + 12, { width: CONTENT_WIDTH - 50 });
  doc.text("A ASSINATURA DIGITAL DESTE DOCUMENTO PODERA SER VERIFICADA EM HTTPS://VALIDAR.ITI.GOV.BR", LEFT, footY + 20, { width: CONTENT_WIDTH - 50 });
  doc.text("ACESSE O DOCUMENTO DIGITAL EM HTTPS://PRESCRICAO.SUPPORTCLINIC.COM.BR/CONSULTA-DOCUMENTO", LEFT, footY + 28, { width: CONTENT_WIDTH - 50 });

  const qrX = RIGHT_LIMIT - 40;
  const qrY = footY + 4;
  doc.rect(qrX, qrY, 36, 36).fill("#f0f0f0").stroke("#dddddd");
  doc.fontSize(4.5).fillColor("#bbbbbb").text("QR CODE", qrX + 4, qrY + 14);

  doc.fillColor("#000000");
}

function addFullPageLayout(doc: InstanceType<typeof PDFDocument>, dados: DadosPedido | DadosJustificativa) {
  const afterHeader = drawHeader(doc, dados);
  const afterBox = drawPatientProfessionalBox(doc, afterHeader, dados);
  drawSignature(doc, dados);
  drawFooter(doc, dados);
  return afterBox;
}

export function gerarPdfSolicitacao(dados: DadosPedido): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 30, bottom: 50, left: LEFT, right: 40 },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    let cursorY = addFullPageLayout(doc, dados);
    cursorY = drawTitleBar(doc, cursorY, "SOLICITACAO DE EXAMES");

    dados.exames.forEach((exame, i) => {
      if (cursorY > doc.page.height - 180) {
        doc.addPage();
        cursorY = addFullPageLayout(doc, dados);
        cursorY = drawTitleBar(doc, cursorY, "SOLICITACAO DE EXAMES (CONTINUACAO)");
      }

      doc.fontSize(8.5).font("Helvetica").fillColor("#222222");
      doc.text(clean(exame.nomeExame), LEFT, cursorY);
      cursorY += 12;

      doc.moveTo(LEFT, cursorY).lineTo(RIGHT_LIMIT, cursorY).dash(1, { space: 2 }).stroke("#dddddd");
      doc.undash();
      cursorY += 4;
    });

    cursorY += 6;

    if (dados.hipoteseDiagnostica || dados.cidPrincipal) {
      if (cursorY > doc.page.height - 180) {
        doc.addPage();
        cursorY = addFullPageLayout(doc, dados);
      }

      doc.save();
      const boxH = 30;
      doc.rect(LEFT, cursorY, CONTENT_WIDTH, boxH).fill("#fafafa").stroke("#cccccc");
      doc.restore();
      doc.rect(LEFT, cursorY, CONTENT_WIDTH, boxH).stroke("#cccccc");

      doc.fontSize(7.5).font("Helvetica").fillColor("#111111");
      if (dados.hipoteseDiagnostica) {
        doc.font("Helvetica-Bold").text("HD", LEFT + 10, cursorY + 6, { continued: true });
        doc.font("Helvetica").text(`  ${clean(dados.hipoteseDiagnostica)}`);
      }
      if (dados.cidPrincipal) {
        const cidY = dados.hipoteseDiagnostica ? cursorY + 17 : cursorY + 6;
        doc.font("Helvetica-Bold").text("CID", LEFT + 10, cidY, { continued: true });
        doc.font("Helvetica").text(`  ${clean(dados.cidPrincipal)}`);
      }

      doc.fillColor("#000000");
      cursorY += 36;
    }

    if (dados.observacao) {
      if (cursorY > doc.page.height - 180) {
        doc.addPage();
        cursorY = addFullPageLayout(doc, dados);
      }
      doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#111111");
      doc.text("OBSERVACAO", LEFT, cursorY);
      cursorY += 12;
      doc.fontSize(7).font("Helvetica").fillColor("#444444");
      doc.text(clean(dados.observacao), LEFT, cursorY, { width: CONTENT_WIDTH });
    }

    doc.end();
  });
}

export function gerarPdfJustificativa(dados: DadosJustificativa): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 30, bottom: 50, left: LEFT, right: 40 },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    let cursorY = addFullPageLayout(doc, dados);

    const tipoLabel = dados.tipoJustificativa === "objetiva" ? "JUSTIFICATIVA OBJETIVA"
      : dados.tipoJustificativa === "narrativa" ? "JUSTIFICATIVA CLINICA NARRATIVA"
      : "JUSTIFICATIVA TECNICA ROBUSTA";

    cursorY = drawTitleBar(doc, cursorY, `JUSTIFICATIVA - ${tipoLabel}`);

    const SAFE_BOTTOM = doc.page.height - 160;

    dados.exames.forEach((exame, i) => {
      const justText = clean(exame.justificativa);
      doc.fontSize(7.5).font("Helvetica");
      const textHeight = doc.heightOfString(justText, {
        width: CONTENT_WIDTH,
        align: "justify",
        lineGap: 1.5,
      });
      const blockHeight = 12 + textHeight + 10;

      if (cursorY + blockHeight > SAFE_BOTTOM) {
        doc.addPage();
        cursorY = addFullPageLayout(doc, dados);
        cursorY = drawTitleBar(doc, cursorY, `JUSTIFICATIVA (CONTINUACAO)`);
      }

      doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#111111");
      doc.text(`${i + 1}  ${clean(exame.nomeExame)}`, LEFT, cursorY);
      cursorY += 12;

      doc.fontSize(7.5).font("Helvetica").fillColor("#333333");
      doc.text(justText, LEFT, cursorY, {
        width: CONTENT_WIDTH,
        align: "justify",
        lineGap: 1.5,
      });
      cursorY += textHeight + 10;
    });

    if (dados.hipoteseDiagnostica || dados.cidPrincipal) {
      if (cursorY > doc.page.height - 180) {
        doc.addPage();
        cursorY = addFullPageLayout(doc, dados);
      }

      cursorY += 4;
      doc.save();
      const boxH = 30;
      doc.rect(LEFT, cursorY, CONTENT_WIDTH, boxH).fill("#fafafa").stroke("#cccccc");
      doc.restore();
      doc.rect(LEFT, cursorY, CONTENT_WIDTH, boxH).stroke("#cccccc");

      doc.fontSize(7.5).font("Helvetica").fillColor("#111111");
      if (dados.hipoteseDiagnostica) {
        doc.font("Helvetica-Bold").text("HD", LEFT + 10, cursorY + 6, { continued: true });
        doc.font("Helvetica").text(`  ${clean(dados.hipoteseDiagnostica)}`);
      }
      if (dados.cidPrincipal) {
        const cidY = dados.hipoteseDiagnostica ? cursorY + 17 : cursorY + 6;
        doc.font("Helvetica-Bold").text("CID", LEFT + 10, cidY, { continued: true });
        doc.font("Helvetica").text(`  ${clean(dados.cidPrincipal)}`);
      }
      doc.fillColor("#000000");
    }

    doc.end();
  });
}
