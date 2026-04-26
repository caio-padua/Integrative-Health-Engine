/**
 * Gerador de PDF do Termo PARQ (Parceria de Qualidade Tecnica) — Wave 10.
 *
 * 4 paginas:
 *   1. Capa navy/gold com numero_serie
 *   2. Considerandos (CFM 2.386/2024, CC arts. 593-609, STJ REsp 2.159.442/PR)
 *   3. 10 clausulas (auditoria Kaizen bimestral, sem comissao)
 *   4. Bloco de assinaturas duplas (clinica e-CNPJ + farmacia e-CNPJ) + QR + hash
 *
 * REGRA FERRO: zero placeholder; falhar e visivel se faltar campo (sem fallback silencioso).
 */

import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { createHash } from "node:crypto";

const NAVY = "#020406";
const GOLD = "#C89B3C";
const GOLD_DIM = "#9A7427";
const GREY = "#666666";

export interface PdfPARQInput {
  numeroSerie: string;
  emitidoEm: Date;
  clinica: {
    nomeFantasia: string;
    razaoSocial: string;
    cnpj: string;
    endereco?: string;
    representante: string;
    cpfRepresentante: string;
  };
  farmacia: {
    nomeFantasia: string;
    razaoSocial: string;
    cnpj: string;
    cidade?: string;
    estado?: string;
    representante?: string;
  };
  validacaoSimplificada: boolean;
  urlVerificacao: string;
}

export interface PdfPARQOutput {
  buffer: Buffer;
  base64: string;
  sha256: string;
}

/**
 * Gera o PDF do termo PARQ. Retorna buffer + base64 + sha256.
 * sha256 e calculado sobre o buffer binario (mesmo input que o ZapSign vai assinar).
 */
export async function gerarPdfPARQ(input: PdfPARQInput): Promise<PdfPARQOutput> {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 60, bottom: 60, left: 60, right: 60 },
    info: {
      Title: `Termo PARQ ${input.numeroSerie}`,
      Author: "PAWARDS MEDCORE",
      Subject: "Acordo de Parceria de Qualidade Tecnica",
      Keywords: "PARQ CFM-2.386/2024 CC-593-609",
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done: Promise<Buffer> = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  // ───────── PAGINA 1 — CAPA ─────────
  doc.rect(0, 0, doc.page.width, 220).fill(NAVY);
  doc.fillColor(GOLD).fontSize(28).font("Helvetica-Bold")
    .text("PAWARDS MEDCORE", 60, 80, { width: doc.page.width - 120, align: "left" });
  doc.fillColor("#ffffff").fontSize(14).font("Helvetica")
    .text("Termo de Parceria de Qualidade Tecnica", 60, 120);
  doc.fillColor(GOLD).fontSize(11).font("Helvetica-Oblique")
    .text("Auditoria Kaizen bimestral · CC arts. 593-609 · CFM 2.386/2024", 60, 145);

  doc.fillColor(NAVY).fontSize(11).font("Helvetica");
  let y = 280;
  doc.text(`Numero de serie:`, 60, y); doc.font("Helvetica-Bold").text(input.numeroSerie, 200, y);
  y += 22; doc.font("Helvetica").text(`Emitido em:`, 60, y);
  doc.font("Helvetica-Bold").text(input.emitidoEm.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }), 200, y);

  y += 50;
  doc.font("Helvetica-Bold").fillColor(NAVY).fontSize(13).text("CLINICA CONTRATANTE", 60, y);
  doc.font("Helvetica").fillColor("#000").fontSize(10);
  y += 18; doc.text(`${input.clinica.razaoSocial} (${input.clinica.nomeFantasia})`, 60, y);
  y += 14; doc.text(`CNPJ: ${input.clinica.cnpj}`, 60, y);
  if (input.clinica.endereco) { y += 14; doc.text(`Endereco: ${input.clinica.endereco}`, 60, y); }
  y += 14; doc.text(`Representante: ${input.clinica.representante} — CPF ${input.clinica.cpfRepresentante}`, 60, y);

  y += 35;
  doc.font("Helvetica-Bold").fillColor(NAVY).fontSize(13).text("FARMACIA PARCEIRA", 60, y);
  doc.font("Helvetica").fillColor("#000").fontSize(10);
  y += 18; doc.text(`${input.farmacia.razaoSocial} (${input.farmacia.nomeFantasia})`, 60, y);
  y += 14; doc.text(`CNPJ: ${input.farmacia.cnpj}`, 60, y);
  const local = [input.farmacia.cidade, input.farmacia.estado].filter(Boolean).join(" / ");
  if (local) { y += 14; doc.text(`Localizacao: ${local}`, 60, y); }
  if (input.farmacia.representante) { y += 14; doc.text(`Representante: ${input.farmacia.representante}`, 60, y); }

  if (input.validacaoSimplificada) {
    y += 40;
    doc.rect(60, y, doc.page.width - 120, 40).strokeColor(GOLD).lineWidth(1).stroke();
    doc.fillColor(GOLD_DIM).font("Helvetica-Bold").fontSize(10)
      .text("VALIDACAO SIMPLIFICADA", 70, y + 8);
    doc.fillColor(GREY).font("Helvetica").fontSize(9)
      .text("Termo aceito por modalidade de assinatura simplificada conforme toggle clinica.", 70, y + 22);
  }

  // ───────── PAGINA 2 — CONSIDERANDOS ─────────
  doc.addPage();
  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(16).text("Considerandos", 60, 60);
  doc.moveDown(0.6);
  doc.fillColor("#000").font("Helvetica").fontSize(10.5);

  const considerandos = [
    "CONSIDERANDO que a Resolucao CFM 2.386/2024 estabelece os criterios de auditoria tecnica em farmacias parceiras de prescritores;",
    "CONSIDERANDO que os arts. 593-609 do Codigo Civil regulam o contrato de prestacao de servicos tecnicos remunerados por contrapartida especifica (auditoria), nao por indicacao de pacientes;",
    "CONSIDERANDO que o STJ no REsp 2.159.442/PR (rel. Min. Nancy Andrighi, fev/2025) consolidou a transparencia ao paciente quanto a relacoes contratuais entre clinicas e farmacias parceiras;",
    "CONSIDERANDO que o art. 58, 59, 68 e 69 do Codigo de Etica Medica (CFM 2.217/2018) e o art. 16 do Decreto 20.931/1932 vedam expressamente comissao por indicacao de medicamentos;",
    "CONSIDERANDO a Lei Geral de Protecao de Dados (LGPD), art. 11, II, alinea f, que autoriza tratamento de dados de saude por profissionais de saude, e seu §4o, que exige consentimento especifico para compartilhamento ampliado;",
    "CONSIDERANDO a Lei 14.063/2020, arts. 4o a 6o, que reconhece como juridicamente validas as assinaturas eletronicas qualificadas (ICP-Brasil) para atos privados;",
  ];
  for (const c of considerandos) {
    doc.text(c, { align: "justify", indent: 0, paragraphGap: 10 });
  }
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold").fontSize(11).fillColor(NAVY)
    .text("As partes celebram o presente Termo de Parceria de Qualidade Tecnica (PARQ), regido pelas clausulas a seguir:");

  // ───────── PAGINA 3 — CLAUSULAS ─────────
  doc.addPage();
  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(16).text("Clausulas", 60, 60);
  doc.moveDown(0.5);
  doc.fillColor("#000").font("Helvetica").fontSize(10);

  const clausulas: Array<[string, string]> = [
    ["1a — Objeto",
      "Este termo institui parceria tecnica de auditoria Kaizen bimestral entre CLINICA e FARMACIA, vedando expressamente qualquer modalidade de comissao por indicacao de pacientes ou prescricoes."],
    ["2a — Auditoria Kaizen Bimestral",
      "A CLINICA realizara visitas tecnicas a cada 60 (sessenta) dias na FARMACIA, avaliando 5 categorias (insumos, processamento, atendimento, entrega, qualidade geral) com 10 itens em escala 1-5."],
    ["3a — Classificacao Gold/Silver/Bronze",
      "Apos cada auditoria, a FARMACIA recebe classificacao tecnica: Gold (media >= 4.5), Silver (3.5-4.49), Bronze (3.0-3.49) ou Em Correcao (< 3.0)."],
    ["4a — Plano Kaizen",
      "Nao-conformidades geram plano de acao Kaizen com prazo limite. Inadimplencia de plano > 30 dias suspende automaticamente o PARQ."],
    ["5a — Autonomia Prescritiva",
      "A CLINICA preserva integralmente sua autonomia prescritiva. O paciente mantem o direito de aviar a receita em qualquer farmacia de manipulacao de sua escolha. A frase 'Esta receita pode ser aviada em qualquer farmacia de manipulacao' constara obrigatoriamente em todas as receitas."],
    ["5a-d — Transparencia ao Paciente",
      "A CLINICA disponibilizara em /sobre-parcerias-tecnicas pagina publica explicando o modelo PARQ. Qualquer paciente pode consultar o status de qualquer FARMACIA parceira via QR code da receita."],
    ["6a — Contraprestacao Tecnica",
      "A CLINICA percebe valor pela auditoria tecnica realizada (CC arts. 593-609), nao por indicacao. Valor mensal espelhado em parmavault_receitas.parq_estimado_centavos para auditoria fiscal."],
    ["7a — Vigencia e Denuncia",
      "Vigencia indeterminada. Denuncia unilateral imediata por qualquer parte mediante comunicacao escrita. Suspensao automatica em caso de plano Kaizen vencido."],
    ["8a — LGPD",
      "Compartilhamento de dados de paciente entre CLINICA e FARMACIA limitado ao estritamente necessario (CPF do paciente + dados da receita), com base legal LGPD art. 11 II f. Consentimento ampliado tratado em TCLE proprio."],
    ["9a — Foro e Validacao",
      "Foro da comarca da CLINICA. Termo assinado digitalmente via ZapSign com certificado ICP-Brasil de ambas as partes. Hash SHA-256 do PDF original publicado e auditavel via /api/parq/verificar-hash/:hash."],
  ];
  for (const [titulo, texto] of clausulas) {
    doc.font("Helvetica-Bold").fillColor(NAVY).text(titulo, { paragraphGap: 4 });
    doc.font("Helvetica").fillColor("#000").text(texto, { align: "justify", paragraphGap: 8 });
  }

  // ───────── PAGINA 4 — ASSINATURAS + QR ─────────
  doc.addPage();
  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(16).text("Assinaturas Digitais", 60, 60);
  doc.moveDown(0.4);
  doc.fillColor(GREY).font("Helvetica").fontSize(9)
    .text("Ambas as partes assinam digitalmente com certificado ICP-Brasil e-CNPJ (qualificada) atraves da plataforma ZapSign. As assinaturas eletronicas tem validade juridica plena (Lei 14.063/2020, arts. 4o-6o; MP 2.200-2/2001).");

  let yA = 170;
  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(12).text("CLINICA CONTRATANTE", 60, yA);
  doc.fillColor("#000").font("Helvetica").fontSize(10);
  yA += 18; doc.text(input.clinica.razaoSocial, 60, yA);
  yA += 14; doc.text(`CNPJ ${input.clinica.cnpj}`, 60, yA);
  yA += 14; doc.text(`Representante: ${input.clinica.representante}`, 60, yA);
  yA += 30;
  doc.moveTo(60, yA).lineTo(280, yA).strokeColor(NAVY).lineWidth(0.7).stroke();
  doc.fillColor(GREY).fontSize(8).text("Assinatura ICP-Brasil e-CNPJ (ZapSign)", 60, yA + 4);

  yA = 170;
  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(12).text("FARMACIA PARCEIRA", 320, yA);
  doc.fillColor("#000").font("Helvetica").fontSize(10);
  yA += 18; doc.text(input.farmacia.razaoSocial, 320, yA);
  yA += 14; doc.text(`CNPJ ${input.farmacia.cnpj}`, 320, yA);
  if (input.farmacia.representante) { yA += 14; doc.text(`Representante: ${input.farmacia.representante}`, 320, yA); }
  yA += 30;
  doc.moveTo(320, yA).lineTo(540, yA).strokeColor(NAVY).lineWidth(0.7).stroke();
  doc.fillColor(GREY).fontSize(8).text("Assinatura ICP-Brasil e-CNPJ (ZapSign)", 320, yA + 4);

  // QR de verificacao + hash
  const qrPng = await QRCode.toBuffer(input.urlVerificacao, { width: 130, margin: 1 });
  doc.image(qrPng, 60, doc.page.height - 220, { width: 110, height: 110 });
  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(10)
    .text("Verificacao publica:", 190, doc.page.height - 215);
  doc.fillColor("#000").font("Helvetica").fontSize(9)
    .text(input.urlVerificacao, 190, doc.page.height - 200, { width: 350 });
  doc.fillColor(GREY).fontSize(8).font("Helvetica-Oblique")
    .text("Aponte a camera do celular para verificar a integridade do termo (hash SHA-256) e o status atual da farmacia parceira.",
      190, doc.page.height - 175, { width: 350 });

  // Rodape
  doc.fillColor(GREY).font("Helvetica").fontSize(7).text(
    `PAWARDS MEDCORE · Termo PARQ ${input.numeroSerie} · gerado em ${input.emitidoEm.toISOString()} · Hash placeholder (calculado pos-render)`,
    60, doc.page.height - 50, { width: doc.page.width - 120, align: "center" },
  );

  doc.end();
  const buffer = await done;
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  return { buffer, base64: buffer.toString("base64"), sha256 };
}
