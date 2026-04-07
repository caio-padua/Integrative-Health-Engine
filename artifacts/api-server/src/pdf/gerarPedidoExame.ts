import PDFDocument from "pdfkit";

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
  nomeMedico: string;
  crm: string;
  nomePaciente: string;
  cpfPaciente: string;
  dataNascimento: string;
  exames: ExamePedido[];
  hipoteseDiagnostica: string | null;
  cidPrincipal: string | null;
  observacao: string | null;
  data: string;
}

interface DadosJustificativa {
  nomeEmpresa: string;
  enderecoEmpresa: string;
  nomeMedico: string;
  crm: string;
  nomePaciente: string;
  cpfPaciente: string;
  exames: Array<{
    nomeExame: string;
    justificativa: string;
  }>;
  tipoJustificativa: string;
  data: string;
}

function addHeader(doc: InstanceType<typeof PDFDocument>, dados: { nomeEmpresa: string; enderecoEmpresa: string; nomeMedico: string; crm: string }) {
  doc.fontSize(14).font("Helvetica-Bold").text(dados.nomeEmpresa, { align: "center" });
  doc.fontSize(8).font("Helvetica").text(dados.enderecoEmpresa, { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(8).text(`${dados.nomeMedico} - CRM: ${dados.crm}`, { align: "center" });
  doc.moveDown(0.5);
  doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke("#333333");
  doc.moveDown(0.5);
}

function addSignature(doc: InstanceType<typeof PDFDocument>, dados: { nomeMedico: string; crm: string; data: string }) {
  doc.moveDown(2);
  const centerX = doc.page.width / 2;
  doc.moveTo(centerX - 100, doc.y).lineTo(centerX + 100, doc.y).stroke("#333333");
  doc.moveDown(0.3);
  doc.fontSize(10).font("Helvetica-Bold").text(dados.nomeMedico, { align: "center" });
  doc.fontSize(8).font("Helvetica").text(`CRM: ${dados.crm}`, { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(8).text(`Data: ${dados.data}`, { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(7).fillColor("#666666").text("Documento assinado digitalmente conforme MP 2.200-2/2001", { align: "center" });
  doc.fillColor("#000000");
}

export function gerarPdfSolicitacao(dados: DadosPedido): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 40, bottom: 40, left: 50, right: 50 },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    addHeader(doc, dados);

    doc.fontSize(12).font("Helvetica-Bold").fillColor("#1a1a1a").text("RECEITUARIO ESPECIAL", { align: "center" });
    doc.moveDown(0.8);

    doc.fontSize(9).font("Helvetica").fillColor("#000000");
    doc.text(`Paciente: `, { continued: true }).font("Helvetica-Bold").text(dados.nomePaciente);
    doc.font("Helvetica").text(`CPF: ${dados.cpfPaciente}    Data de Nascimento: ${dados.dataNascimento}`);
    doc.moveDown(0.8);

    doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke("#cccccc");
    doc.moveDown(0.5);

    doc.fontSize(11).font("Helvetica-Bold").text("SOLICITACAO DE EXAMES:");
    doc.moveDown(0.5);

    dados.exames.forEach((exame, i) => {
      if (doc.y > doc.page.height - 150) {
        doc.addPage();
        addHeader(doc, dados);
      }

      doc.fontSize(9).font("Helvetica-Bold").text(`${i + 1}. ${exame.nomeExame}`);

      doc.fontSize(8).font("Helvetica").fillColor("#333333");
      doc.text(`   ${exame.corpoPedido}`);

      if (exame.preparo) {
        doc.fontSize(7).fillColor("#666666").text(`   Preparo: ${exame.preparo}`);
      }

      doc.fillColor("#000000");
      doc.moveDown(0.3);
    });

    doc.moveDown(0.5);
    doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke("#cccccc");
    doc.moveDown(0.5);

    if (dados.hipoteseDiagnostica || dados.cidPrincipal) {
      doc.fontSize(9).font("Helvetica-Bold").text("HIPOTESE DIAGNOSTICA (HD):");
      if (dados.hipoteseDiagnostica) {
        doc.fontSize(9).font("Helvetica").text(dados.hipoteseDiagnostica);
      }
      if (dados.cidPrincipal) {
        doc.fontSize(9).font("Helvetica").text(`CID: ${dados.cidPrincipal}`);
      }
      doc.moveDown(0.5);
    }

    if (dados.observacao) {
      doc.fontSize(9).font("Helvetica-Bold").text("OBSERVACAO:");
      doc.fontSize(8).font("Helvetica").text(dados.observacao);
      doc.moveDown(0.5);
    }

    addSignature(doc, dados);

    doc.end();
  });
}

export function gerarPdfJustificativa(dados: DadosJustificativa): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 40, bottom: 40, left: 50, right: 50 },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    addHeader(doc, dados);

    doc.fontSize(12).font("Helvetica-Bold").fillColor("#1a1a1a").text("JUSTIFICATIVA PARA SOLICITACAO DE EXAMES", { align: "center" });
    doc.moveDown(0.8);

    doc.fontSize(9).font("Helvetica").fillColor("#000000");
    doc.text(`Paciente: `, { continued: true }).font("Helvetica-Bold").text(dados.nomePaciente);
    doc.font("Helvetica").text(`CPF: ${dados.cpfPaciente}`);
    doc.moveDown(0.5);

    const tipoLabel = dados.tipoJustificativa === "objetiva" ? "Justificativa Objetiva"
      : dados.tipoJustificativa === "narrativa" ? "Justificativa Clinica Narrativa"
      : "Justificativa Tecnica Robusta";

    doc.fontSize(8).font("Helvetica").fillColor("#666666").text(`Tipo: ${tipoLabel}`);
    doc.moveDown(0.8);

    doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke("#cccccc");
    doc.moveDown(0.5);

    dados.exames.forEach((exame, i) => {
      if (doc.y > doc.page.height - 150) {
        doc.addPage();
        addHeader(doc, dados);
      }

      doc.fontSize(10).font("Helvetica-Bold").text(`${i + 1}. ${exame.nomeExame}`);
      doc.moveDown(0.3);
      doc.fontSize(9).font("Helvetica").text(exame.justificativa, {
        align: "justify",
        lineGap: 2,
      });
      doc.moveDown(0.8);
    });

    doc.moveDown(0.5);
    doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke("#cccccc");

    addSignature(doc, dados);

    doc.end();
  });
}
