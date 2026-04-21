/**
 * GERADOR DE PDF — PRESCRIÇÃO PADCON UNIVERSAL
 * Manifesto Blueprint v2.0 — 1 PDF por (cor, destino, fórmula composta)
 * Cores ANVISA + branding PAWARDS (azul petróleo + dourado + off-white)
 */
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import type {
  PdfAgrupado,
  CorPdf,
  DestinoDispensacao,
} from "../services/prescricaoEngine";

const CORES = {
  azulPetroleo: "#1F4E5F",
  azulPetroleoClaro: "#2A6B8C",
  offWhite: "#F5F0E8",
  douradoQueimado: "#B8860B",
  cinzaTexto: "#333333",
  cinzaClaro: "#666666",
  fundoCabecalhoAzul: "#D6E4EC",
  fundoCabecalhoAmarelo: "#FFF4CC",
  fundoCabecalhoLilas: "#E8DAEF",
  fundoCabecalhoVerde: "#D4EFDF",
  fundoCabecalhoMagistral: "#F5F0E8",
  fundoCabecalhoBranco: "#FFFFFF",
};

const FUNDO_POR_COR: Record<CorPdf, string> = {
  azul: CORES.fundoCabecalhoAzul,
  amarelo: CORES.fundoCabecalhoAmarelo,
  lilas: CORES.fundoCabecalhoLilas,
  verde: CORES.fundoCabecalhoVerde,
  magistral: CORES.fundoCabecalhoMagistral,
  branco: CORES.fundoCabecalhoBranco,
};

const ROTULO_DESTINO: Record<DestinoDispensacao, string> = {
  FAMA: "FARMÁCIA DE MANIPULAÇÃO",
  FACO: "FARMÁCIA COMUM (DROGARIA)",
  FAOP: "FARMÁCIA OPCIONAL — PACIENTE ESCOLHE",
  FAMX: "FARMÁCIAS MISTAS",
  INJE: "INJETÁVEL — APLICAÇÃO CLÍNICA",
  FITO: "PRODUTO FITOTERÁPICO",
  HORM: "FARMÁCIA DE MANIPULAÇÃO HORMONAL",
  CONT: "CONTROLADO — RETENÇÃO LEGAL",
};

const ROTULO_TIPO_RECEITA: Record<string, string> = {
  BRANCA_SIMPLES: "RECEITUÁRIO BRANCO COMUM",
  ANTIBIOTICO_RDC20: "RECEITUÁRIO BRANCO — ANTIBIÓTICO RDC 20",
  C1: "RECEITUÁRIO BRANCO — CONTROLE ESPECIAL (2 vias)",
  C2: "RECEITUÁRIO BRANCO — RETINOIDES",
  C3: "RECEITUÁRIO BRANCO — TALIDOMIDA",
  C5: "RECEITUÁRIO BRANCO — ANABOLIZANTES",
  B1: "RECEITUÁRIO AZUL B1 — PSICOTRÓPICO",
  B2: "RECEITUÁRIO AZUL B2 — ANOREXÍGENO",
  A1: "RECEITUÁRIO AMARELO A1 — ENTORPECENTE",
  A2: "RECEITUÁRIO AMARELO A2 — PSICOESTIMULANTE",
  A3: "RECEITUÁRIO AMARELO A3 — PSICOTRÓPICO",
  MAGISTRAL: "RECEITUÁRIO MAGISTRAL — RDC 67",
  LILAS_HORMONAL: "RECEITUÁRIO LILÁS — HORMONAL",
  VERDE_FITO: "RECEITUÁRIO VERDE — FITOTERÁPICO",
};

export interface DadosPrescricaoPdf {
  pdf: PdfAgrupado;
  paciente: {
    nome: string;
    cpf?: string;
    data_nascimento?: string;
    endereco?: string;
  };
  medico: {
    nome: string;
    crm: string;
    uf_crm: string;
    icp_brasil_certificado?: string;
  };
  unidade: {
    razao_social: string;
    cnpj?: string;
    endereco?: string;
  };
  prescricao_id: number;
  pdf_index: number;
  pdf_total: number;
  data_emissao: string; // dd/mm/aaaa
  numero_sncr?: string;
  qr_code_token?: string;
}

/**
 * Gera UM PDF (1 cor / 1 destino / 1 fórmula composta).
 * Retorna um Stream Readable com o PDF binário.
 */
export function gerarPrescricaoPdf(dados: DadosPrescricaoPdf): PassThrough {
  const stream = new PassThrough();
  const doc = new PDFDocument({
    size: "A4",
    layout: "portrait",
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    bufferPages: true,
  });
  doc.pipe(stream);

  const W = 595;
  const fundo = FUNDO_POR_COR[dados.pdf.cor_visual];

  // ===== FAIXA DE COR LEGAL ANVISA (topo, full-bleed) =====
  doc.rect(0, 0, W, 28).fill(fundo);
  doc
    .fontSize(8)
    .font("Helvetica-Bold")
    .fillColor(CORES.cinzaTexto)
    .text(
      ROTULO_TIPO_RECEITA[dados.pdf.tipo_receita_anvisa_codigo] ||
        dados.pdf.tipo_receita_anvisa_codigo,
      40,
      9,
      { width: 515 }
    );
  doc
    .fontSize(7)
    .font("Helvetica")
    .fillColor(CORES.cinzaClaro)
    .text(
      `PDF ${dados.pdf_index} de ${dados.pdf_total}  •  Prescrição #${dados.prescricao_id}`,
      40,
      18,
      { width: 515, align: "right" }
    );

  // ===== HEADER PAWARDS =====
  doc.rect(0, 28, W, 60).fill(CORES.azulPetroleo);
  doc
    .fontSize(16)
    .font("Helvetica-Bold")
    .fillColor(CORES.offWhite)
    .text("PRESCRIÇÃO MÉDICA", 40, 38, { width: 360 });
  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor(CORES.douradoQueimado)
    .text("PADCON UNIVERSAL  •  Manifesto Blueprint v2.0", 40, 60);
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(CORES.douradoQueimado)
    .text("PAWARDS", 435, 36, { width: 120, align: "right" });
  doc
    .fontSize(6)
    .font("Helvetica")
    .fillColor(CORES.offWhite)
    .text("Sistema de Gestão Clínica Integrativa", 435, 48, {
      width: 120,
      align: "right",
    });
  doc
    .fontSize(7)
    .font("Helvetica")
    .fillColor(CORES.offWhite)
    .text("INSTITUTO PÁDUA", 435, 60, { width: 120, align: "right" });

  let y = 100;

  // ===== UNIDADE =====
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(CORES.azulPetroleo)
    .text(dados.unidade.razao_social, 40, y, { width: 515 });
  if (dados.unidade.cnpj) {
    doc
      .fontSize(7)
      .font("Helvetica")
      .fillColor(CORES.cinzaClaro)
      .text(`CNPJ: ${dados.unidade.cnpj}`, 40, y + 12);
  }
  if (dados.unidade.endereco) {
    doc
      .fontSize(7)
      .font("Helvetica")
      .fillColor(CORES.cinzaClaro)
      .text(dados.unidade.endereco, 40, y + 22);
  }
  y += 40;

  // ===== DESTINO + FÓRMULA COMPOSTA =====
  doc.rect(40, y, 515, 28).fill("#EFEFEF");
  doc
    .fontSize(8)
    .font("Helvetica-Bold")
    .fillColor(CORES.azulPetroleo)
    .text("DESTINO:", 50, y + 6);
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(CORES.cinzaTexto)
    .text(
      `${dados.pdf.destino_dispensacao} — ${ROTULO_DESTINO[dados.pdf.destino_dispensacao]}`,
      105,
      y + 6
    );

  if (dados.pdf.marcacao_manipular_junto) {
    doc
      .fontSize(7)
      .font("Helvetica-Bold")
      .fillColor(CORES.douradoQueimado)
      .text(`★ ${dados.pdf.marcacao_manipular_junto}`, 50, y + 18, {
        width: 495,
      });
  }
  y += 36;

  // ===== PACIENTE =====
  doc.rect(40, y, 515, 40).fill("#E8E4DC");
  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor(CORES.cinzaTexto)
    .text(`PACIENTE: ${dados.paciente.nome}`, 50, y + 8);
  const idade = dados.paciente.data_nascimento
    ? Math.floor(
        (Date.now() - new Date(dados.paciente.data_nascimento).getTime()) /
          31557600000
      ) + " anos"
    : "—";
  const cpf = dados.paciente.cpf ?? "—";
  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor(CORES.cinzaClaro)
    .text(
      `CPF: ${cpf}    •    Idade: ${idade}    •    Data: ${dados.data_emissao}`,
      50,
      y + 24
    );
  y += 52;

  // ===== BLOCOS =====
  for (const bloco of dados.pdf.blocos) {
    // Cabeçalho do bloco (2 camadas — Manifesto REGRA 01)
    doc.rect(40, y, 4, 28).fill(CORES.douradoQueimado);
    // Camada humana (negrito grande)
    doc
      .fontSize(13)
      .font("Helvetica-Bold")
      .fillColor(CORES.azulPetroleo)
      .text(bloco.apelido, 52, y, { width: 503 });
    // Camada técnica (itálico cinza pequeno)
    doc
      .fontSize(8)
      .font("Helvetica-Oblique")
      .fillColor(CORES.cinzaClaro)
      .text(
        `FORM ${bloco.destino_dispensacao} ${bloco.codigo_mafia4} — Via ${bloco.via_administracao}`,
        52,
        y + 16,
        { width: 503 }
      );
    y += 32;

    // Ativos
    for (const ativo of bloco.ativos) {
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor(CORES.cinzaTexto)
        .text(
          `• ${ativo.nome}`,
          60,
          y,
          { width: 350, continued: false }
        );
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor(CORES.cinzaTexto)
        .text(
          `${ativo.dose_valor} ${ativo.dose_unidade}`,
          410,
          y,
          { width: 145, align: "right" }
        );
      if (ativo.observacao) {
        y += 12;
        doc
          .fontSize(8)
          .font("Helvetica-Oblique")
          .fillColor(CORES.cinzaClaro)
          .text(`   (${ativo.observacao})`, 60, y, { width: 495 });
      }
      y += 16;
    }

    // Forma farmacêutica sugerida (REGRA 09)
    if ((bloco as any).forma_farmaceutica_sugestao) {
      y += 6;
      doc
        .fontSize(9)
        .font("Helvetica-Oblique")
        .fillColor(CORES.cinzaClaro)
        .text(
          `${(bloco as any).forma_farmaceutica_sugestao} (sugestão à farmácia)`,
          60,
          y,
          { width: 495 }
        );
      y += 14;
    }

    // Posologia placeholder — virá da tabela prescricao_bloco_dose
    y += 10;
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor(CORES.azulPetroleo)
      .text("POSOLOGIA:", 60, y);
    y += 14;
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(CORES.cinzaTexto)
      .text(
        `1 Dose(s) - Via ${bloco.via_administracao} - Conforme orientação`,
        60,
        y,
        { width: 495 }
      );
    y += 24;

    if (bloco.observacoes) {
      doc
        .fontSize(8)
        .font("Helvetica-Oblique")
        .fillColor(CORES.cinzaClaro)
        .text(`Obs: ${bloco.observacoes}`, 60, y, { width: 495 });
      y += 16;
    }

    y += 12;

    // Quebra de página se passar do limite
    if (y > 720) {
      doc.addPage();
      y = 60;
    }
  }

  // ===== NUMERAÇÃO SNCR (se aplicável) =====
  if (dados.numero_sncr) {
    y += 10;
    doc.rect(40, y, 515, 24).fill("#FFF4CC");
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor(CORES.cinzaTexto)
      .text(
        `NUMERAÇÃO ANVISA / SNCR: ${dados.numero_sncr}`,
        50,
        y + 7
      );
    y += 32;
  }

  // ===== ASSINATURA =====
  y = Math.max(y, 700);
  doc
    .moveTo(150, y)
    .lineTo(450, y)
    .lineWidth(0.5)
    .stroke(CORES.cinzaTexto);
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(CORES.cinzaTexto)
    .text(dados.medico.nome, 150, y + 4, { width: 300, align: "center" });
  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor(CORES.cinzaClaro)
    .text(
      `CRM ${dados.medico.uf_crm} ${dados.medico.crm}`,
      150,
      y + 18,
      { width: 300, align: "center" }
    );
  if (dados.medico.icp_brasil_certificado) {
    doc
      .fontSize(7)
      .font("Helvetica-Oblique")
      .fillColor(CORES.cinzaClaro)
      .text(
        `ICP-Brasil A3: ${dados.medico.icp_brasil_certificado}`,
        150,
        y + 30,
        { width: 300, align: "center" }
      );
  }

  // ===== QR CODE token (placeholder textual) =====
  if (dados.qr_code_token) {
    doc
      .fontSize(6)
      .font("Helvetica")
      .fillColor(CORES.cinzaClaro)
      .text(
        `Verificação: pawards.med.br/v/${dados.qr_code_token}`,
        40,
        780,
        { width: 515, align: "center" }
      );
  }

  // ===== FOOTER =====
  doc
    .fontSize(5.5)
    .font("Helvetica")
    .fillColor(CORES.cinzaClaro)
    .text(
      "Documento gerado pelo PAWARDS — Sistema de Gestão Clínica Integrativa do Instituto Pádua",
      40,
      810,
      { width: 515, align: "center" }
    );

  doc.end();
  return stream;
}

/**
 * Coleta um PDFKit stream em Buffer (útil para salvar em disco/banco).
 */
export function streamParaBuffer(stream: PassThrough): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (c) => chunks.push(c));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}
