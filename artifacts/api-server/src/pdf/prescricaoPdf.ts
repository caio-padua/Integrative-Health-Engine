/**
 * GERADOR DE PDF — PRESCRIÇÃO PADCON UNIVERSAL · Template V8 (18/mai/2026)
 *
 * V8 — visual cravado por Caio depois de 1 mês de iteração:
 *   - Fundo pastel azulado (#EAF0F7) · cards pastel claro (#F4F7FB)
 *   - Header navy profundo com filete dourado + selos APRESENTAÇÃO/RXS sup-direita
 *   - Faixa paciente navy-médio com NOME em maiúsculas creme + sessão italic
 *   - Posologia enquadrada com 3 colunas (VIA · DOSE · FREQUÊNCIA)
 *   - Cards emoldurados (header navy + corpo pastel separados por gap dourado)
 *   - Bullets em NUMERAIS arábicos dourados (sem unicode decorativo)
 *   - Rodapé navy 44pt: INSTITUTO PÁDUA esq · PAWARDS®/PADCON® dir com Ps alinhados
 *
 * Preserva os elementos legais ANVISA:
 *   - Faixa colorida fina topo c/ rótulo do tipo de receita
 *   - Lista de ativos com dose
 *   - Numeração SNCR (controlados)
 *   - Assinatura médica + CRM + ICP-Brasil + QR token
 *
 * Interface `gerarPrescricaoPdf(DadosPrescricaoPdf): PassThrough` preservada —
 * emitirPrescricaoService não precisa mudar.
 */
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import type {
  PdfAgrupado,
  CorPdf,
  DestinoDispensacao,
} from "../services/prescricaoEngine";

// =========================================================================
// PALETA V8 (cravada pelo Caio)
// =========================================================================
const CORES = {
  navyProfundo: "#0F2940",
  navyMedio: "#1F3A5F",
  pastelFundo: "#EAF0F7",
  pastelCard: "#F4F7FB",
  pastelZebra: "#E5EDF5",
  creme: "#F2EEDF",
  dourado: "#C7A646",
  douradoQueim: "#C8951A",
  verdeSalvia: "#9DB8A5",
  cinzaTexto: "#1A1A1A",
  cinzaClaro: "#5A6A7A",
  cinzaLinha: "#C5D2DF",
  // faixa Anvisa (legal) — cor de fundo do rótulo do tipo de receita
  anvisaAzul: "#D6E4EC",
  anvisaAmarelo: "#FFF4CC",
  anvisaLilas: "#E8DAEF",
  anvisaVerde: "#D4EFDF",
  anvisaMagistral: "#F2EEDF",
  anvisaBranco: "#FFFFFF",
};

const FAIXA_ANVISA_POR_COR: Record<CorPdf, string> = {
  azul: CORES.anvisaAzul,
  amarelo: CORES.anvisaAmarelo,
  lilas: CORES.anvisaLilas,
  verde: CORES.anvisaVerde,
  magistral: CORES.anvisaMagistral,
  branco: CORES.anvisaBranco,
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
  // V8: opcional — número de sessão e nome da clínica pra faixa paciente
  sessao_label?: string;
}

// =========================================================================
// DIMENSÕES A4 V8
// =========================================================================
const W = 595;
const H = 842;
const MARG = 42;
const MROD = 18;

// =========================================================================
// HEADER V8: faixa Anvisa fina (legal) + cabeçalho navy + faixa paciente
// =========================================================================
function desenharHeader(doc: PDFKit.PDFDocument, dados: DadosPrescricaoPdf): number {
  const fundoAnvisa = FAIXA_ANVISA_POR_COR[dados.pdf.cor_visual] || CORES.anvisaBranco;

  // Faixa Anvisa LEGAL (14pt) — rótulo do tipo de receita
  doc.rect(0, 0, W, 14).fill(fundoAnvisa);
  doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
    .text(
      ROTULO_TIPO_RECEITA[dados.pdf.tipo_receita_anvisa_codigo] || dados.pdf.tipo_receita_anvisa_codigo,
      MARG, 4,
      { width: W - MARG * 2, characterSpacing: 0.5, lineBreak: false }
    );
  doc.fontSize(6.5).font("Helvetica").fillColor(CORES.cinzaClaro)
    .text(
      `PDF ${dados.pdf_index}/${dados.pdf_total} · Prescrição #${dados.prescricao_id}`,
      MARG, 5,
      { width: W - MARG * 2, align: "right", lineBreak: false }
    );

  // Header navy profundo (14 → 78)
  doc.rect(0, 14, W, 64).fill(CORES.navyProfundo);
  doc.rect(0, 78, W, 2).fill(CORES.dourado);

  // Título principal (esquerda)
  const tituloPrincipal = dados.pdf.destino_dispensacao === "INJE"
    ? "PRESCRIÇÃO MÉDICA · INJETÁVEL"
    : "PRESCRIÇÃO MÉDICA";
  doc.fontSize(16).font("Helvetica-Bold").fillColor("#F2EEDF")
    .text(tituloPrincipal, MARG, 24, { width: 340, lineBreak: false });
  doc.fontSize(8).font("Helvetica-Oblique").fillColor(CORES.dourado)
    .text(`${ROTULO_DESTINO[dados.pdf.destino_dispensacao]} · Manifesto Blueprint v2.0`,
      MARG, 50, { width: 380, lineBreak: false });

  // 2 retângulos empilhados sup-direita (estilo V8)
  const selW = 130;
  const selX = W - MARG - selW;
  // Topo: APRESENTAÇÃO + cor verde sálvia
  doc.rect(selX, 22, selW, 22).fillAndStroke(CORES.verdeSalvia, CORES.dourado);
  doc.lineWidth(0.6);
  doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
    .text("EMISSÃO · DOCUMENTO LEGAL", selX, 29,
      { width: selW, align: "center", characterSpacing: 0.6, lineBreak: false });
  // Embaixo: RXS + código curto da prescrição
  const codigoCurto = `${dados.pdf.destino_dispensacao}-${dados.prescricao_id}`;
  doc.rect(selX, 48, selW, 22).fillAndStroke(CORES.dourado, CORES.dourado);
  doc.fontSize(10).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
    .text(`RXS  ${codigoCurto}`, selX, 55,
      { width: selW, align: "center", characterSpacing: 1.4, lineBreak: false });

  // Faixa paciente navy-médio (80 → 100)
  const yPac = 80;
  doc.rect(0, yPac, W, 20).fill(CORES.navyMedio);
  doc.fontSize(9.5).font("Helvetica-Bold").fillColor(CORES.creme)
    .text(dados.paciente.nome.toUpperCase(), MARG, yPac + 6,
      { characterSpacing: 0.8, lineBreak: false });
  const sessao = dados.sessao_label || dados.unidade.razao_social;
  doc.fontSize(8).font("Helvetica-Oblique").fillColor(CORES.cinzaLinha)
    .text(`${sessao} · ${dados.data_emissao}`,
      MARG, yPac + 7, { width: W - MARG * 2, align: "right", lineBreak: false });

  return yPac + 20 + 12; // y inicial pro conteúdo
}

// =========================================================================
// FAIXA DE IDENTIFICAÇÃO MÉDICO + UNIDADE (sub-header pastel)
// =========================================================================
function desenharIdentificacao(doc: PDFKit.PDFDocument, dados: DadosPrescricaoPdf, y: number): number {
  const CW = W - MARG * 2;
  const altura = 38;
  doc.rect(MARG, y, CW, altura).fillAndStroke(CORES.pastelCard, CORES.dourado);
  doc.lineWidth(0.5);

  // 2 colunas: MÉDICO (esq) · UNIDADE (dir)
  const colW = CW / 2;

  doc.fontSize(6.5).font("Helvetica-Bold").fillColor(CORES.cinzaClaro)
    .text("MÉDICO RESPONSÁVEL", MARG + 12, y + 6, { characterSpacing: 0.8, lineBreak: false });
  doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
    .text(dados.medico.nome, MARG + 12, y + 16, { width: colW - 16, lineBreak: false });
  doc.fontSize(7.5).font("Helvetica").fillColor(CORES.cinzaTexto)
    .text(`CRM ${dados.medico.uf_crm} ${dados.medico.crm}`, MARG + 12, y + 27, { lineBreak: false });

  // separador vertical dourado
  doc.rect(MARG + colW - 0.3, y + 6, 0.4, altura - 12).fill(CORES.dourado);

  doc.fontSize(6.5).font("Helvetica-Bold").fillColor(CORES.cinzaClaro)
    .text("UNIDADE EMISSORA", MARG + colW + 12, y + 6, { characterSpacing: 0.8, lineBreak: false });
  doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
    .text(dados.unidade.razao_social, MARG + colW + 12, y + 16, { width: colW - 16, lineBreak: false });
  if (dados.unidade.cnpj) {
    doc.fontSize(7.5).font("Helvetica").fillColor(CORES.cinzaTexto)
      .text(`CNPJ ${dados.unidade.cnpj}`, MARG + colW + 12, y + 27, { lineBreak: false });
  }

  return y + altura + 10;
}

// =========================================================================
// CARD EMOLDURADO V8 — header navy + corpo pastel separados por gap
// =========================================================================
function cardEmoldurado(
  doc: PDFKit.PDFDocument,
  y: number,
  numero: number,
  titulo: string,
  alturaConteudo: number,
  render: (xi: number, yi: number, wi: number) => void,
): number {
  const CW = W - MARG * 2;
  const headerH = 26;
  const padInterno = 12;
  const gap = 3;
  const corpoH = alturaConteudo + padInterno * 2 - 8;

  // Header navy
  doc.rect(MARG, y, CW, headerH).fillAndStroke(CORES.navyProfundo, CORES.dourado);
  doc.lineWidth(0.8);
  doc.rect(MARG + 6, y + 5, 16, 16).fill(CORES.dourado);
  doc.fontSize(11).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
    .text(String(numero), MARG + 6, y + 8, { width: 16, align: "center", lineBreak: false });
  doc.fontSize(10).font("Helvetica-Bold").fillColor("#F2EEDF")
    .text(titulo.toUpperCase(), MARG + 30, y + 8,
      { width: CW - 40, characterSpacing: 0.7, lineBreak: false });

  // Corpo pastel
  const yCorpo = y + headerH + gap;
  doc.rect(MARG, yCorpo, CW, corpoH).fillAndStroke(CORES.pastelCard, CORES.dourado);
  doc.lineWidth(0.8);

  render(MARG + padInterno, yCorpo + padInterno, CW - padInterno * 2);

  return yCorpo + corpoH + 10;
}

// =========================================================================
// RODAPÉ V8 — INSTITUTO PÁDUA esq · PAWARDS®/PADCON® dir (Ps alinhados)
// =========================================================================
function desenharRodape(doc: PDFKit.PDFDocument, dados: DadosPrescricaoPdf): void {
  const altF = 44;
  const yF = H - altF;
  doc.rect(0, yF, W, altF).fill(CORES.navyProfundo);
  doc.rect(0, yF, W, 1.5).fill(CORES.dourado);

  // Esquerda: INSTITUTO PÁDUA + slogan
  const nomeUnidade = (dados.unidade.razao_social || "INSTITUTO PÁDUA").toUpperCase();
  doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.dourado)
    .text(nomeUnidade, MROD, yF + 10, { width: 300, characterSpacing: 0.6, lineBreak: false });
  doc.fontSize(7.5).font("Helvetica-Oblique").fillColor(CORES.creme)
    .text("Medicina Integrativa de Precisão · Restaura função, não remedia sintoma",
      MROD, yF + 25, { width: 380, lineBreak: false });

  // Direita: PAWARDS® / PADCON® alinhados
  const larguraDescritor = 165;
  const larguraMarca = 95;
  const gap = 8;
  const xDireitaTotal = W - MROD;
  const xDesc = xDireitaTotal - larguraDescritor;
  const xMarca = xDesc - gap - larguraMarca;

  doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.dourado)
    .text("P A W A R D S ®", xMarca, yF + 10,
      { width: larguraMarca, align: "left", characterSpacing: 1.6, lineBreak: false });
  doc.fontSize(8.5).font("Times-Italic").fillColor(CORES.creme)
    .text("Clinical Intelligence System", xDesc, yF + 11,
      { width: larguraDescritor, align: "left", lineBreak: false });

  doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.dourado)
    .text("P A D C O N ®", xMarca, yF + 25,
      { width: larguraMarca, align: "left", characterSpacing: 1.6, lineBreak: false });
  doc.fontSize(8.5).font("Times-Italic").fillColor(CORES.creme)
    .text("Advanced Systems Architecture", xDesc, yF + 26,
      { width: larguraDescritor, align: "left", lineBreak: false });

  // QR token (se houver) — micro texto acima do rodapé
  if (dados.qr_code_token) {
    doc.fontSize(6).font("Helvetica").fillColor(CORES.cinzaClaro)
      .text(`Verificação: pawards.med.br/v/${dados.qr_code_token}`,
        MARG, yF - 14, { width: W - MARG * 2, align: "center", lineBreak: false });
  }
}

// =========================================================================
// MEDIDA: altura aproximada de N ativos
// =========================================================================
function alturaAtivos(doc: PDFKit.PDFDocument, ativos: any[], larg: number): number {
  let alt = 14; // mini-header da tabela
  for (const a of ativos) {
    const linha = `${a.nome}    ${a.dose_valor} ${a.dose_unidade}`;
    alt += Math.max(16, doc.heightOfString(linha, { width: larg - 16 }) + 4);
    if (a.observacao) alt += 12;
  }
  return alt;
}

// =========================================================================
// GERADOR PRINCIPAL — preserva assinatura
// =========================================================================
export function gerarPrescricaoPdf(dados: DadosPrescricaoPdf): PassThrough {
  const stream = new PassThrough();
  const doc = new PDFDocument({
    size: "A4",
    layout: "portrait",
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    bufferPages: true,
  });
  doc.pipe(stream);

  // Fundo pastel V8
  doc.rect(0, 0, W, H).fill(CORES.pastelFundo);

  // Header + identificação
  let y = desenharHeader(doc, dados);
  y = desenharIdentificacao(doc, dados, y);

  // Marcação "manipular junto" (se houver) — destaque dourado
  if (dados.pdf.marcacao_manipular_junto) {
    const CW = W - MARG * 2;
    doc.rect(MARG, y, CW, 22).fillAndStroke(CORES.creme, CORES.douradoQueim);
    doc.lineWidth(0.6);
    doc.fontSize(8.5).font("Helvetica-Bold").fillColor(CORES.douradoQueim)
      .text(`OBSERVAÇÃO FARMÁCIA · ${dados.pdf.marcacao_manipular_junto}`,
        MARG + 12, y + 7, { width: CW - 24, lineBreak: false });
    y += 30;
  }

  // ===== BLOCOS TERAPÊUTICOS =====
  let numero = 1;
  for (const bloco of dados.pdf.blocos) {
    // Mede altura do conteúdo do bloco (ativos + posologia + forma + obs)
    const CW = W - MARG * 2;
    const larguraInterna = CW - 24;
    let alt = alturaAtivos(doc, bloco.ativos, larguraInterna);
    alt += 36; // posologia
    if ((bloco as any).forma_farmaceutica_sugestao) alt += 14;
    if (bloco.observacoes) alt += 16;

    // Se não cabe na página, quebra
    if (y + alt + 100 > H - 50) {
      desenharRodape(doc, dados);
      doc.addPage();
      doc.rect(0, 0, W, H).fill(CORES.pastelFundo);
      y = 40;
    }

    const titulo = bloco.apelido || bloco.via_administracao;
    y = cardEmoldurado(doc, y, numero, titulo, alt, (xi, yi, wi) => {
      // mini-header da tabela de ativos
      doc.rect(xi, yi, wi, 14).fill(CORES.navyMedio);
      doc.fontSize(6.8).font("Helvetica-Bold").fillColor("#F2EEDF")
        .text("ATIVO", xi + 6, yi + 4, { characterSpacing: 1, lineBreak: false });
      doc.text("DOSE", xi + wi - 130, yi + 4,
        { width: 120, align: "right", characterSpacing: 1, lineBreak: false });

      let yy = yi + 16;
      let zb = false;
      for (const ativo of bloco.ativos) {
        if (zb) doc.rect(xi, yy, wi, 16).fill(CORES.pastelZebra);
        zb = !zb;
        doc.fontSize(9).font("Helvetica").fillColor(CORES.cinzaTexto)
          .text(ativo.nome, xi + 6, yy + 4, { width: wi - 140, lineBreak: false });
        doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
          .text(`${ativo.dose_valor} ${ativo.dose_unidade}`, xi + wi - 130, yy + 4,
            { width: 124, align: "right", lineBreak: false });
        yy += 16;
        if (ativo.observacao) {
          doc.fontSize(7.5).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro)
            .text(`(${ativo.observacao})`, xi + 12, yy, { width: wi - 16, lineBreak: true });
          yy += 12;
        }
      }

      // Forma farmacêutica sugestão
      if ((bloco as any).forma_farmaceutica_sugestao) {
        doc.fontSize(8).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro)
          .text(`Forma sugerida à farmácia: ${(bloco as any).forma_farmaceutica_sugestao}`,
            xi + 6, yy + 4, { width: wi - 12, lineBreak: false });
        yy += 14;
      }

      // POSOLOGIA — caixa enquadrada V8 com 3 colunas
      yy += 6;
      const posoH = 30;
      doc.rect(xi, yy, wi, posoH).fillAndStroke(CORES.creme, CORES.dourado);
      doc.lineWidth(0.5);
      const cw = wi / 3;
      const metas: [string, string][] = [
        ["VIA", bloco.via_administracao || "—"],
        ["DOSE", bloco.ativos.length === 1
          ? `${bloco.ativos[0].dose_valor} ${bloco.ativos[0].dose_unidade}`
          : `${bloco.ativos.length} ativos`],
        ["FREQUÊNCIA", "Conforme orientação clínica"],
      ];
      for (let i = 0; i < 3; i++) {
        const xc = xi + i * cw;
        doc.fontSize(6.5).font("Helvetica-Bold").fillColor(CORES.cinzaClaro)
          .text(metas[i][0], xc + 8, yy + 6, { characterSpacing: 1, lineBreak: false });
        doc.fontSize(8.5).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
          .text(metas[i][1], xc + 8, yy + 16, { width: cw - 16, lineBreak: false });
        if (i < 2) doc.rect(xc + cw - 0.3, yy + 4, 0.4, posoH - 8).fill(CORES.dourado);
      }
      yy += posoH + 4;

      // Observações livre do bloco
      if (bloco.observacoes) {
        doc.fontSize(8).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro)
          .text(`Obs: ${bloco.observacoes}`, xi + 6, yy, { width: wi - 12 });
      }
    });
    numero++;
  }

  // Numeração SNCR (se controlado)
  if (dados.numero_sncr) {
    const CW = W - MARG * 2;
    if (y + 30 > H - 100) {
      desenharRodape(doc, dados);
      doc.addPage();
      doc.rect(0, 0, W, H).fill(CORES.pastelFundo);
      y = 40;
    }
    doc.rect(MARG, y, CW, 24).fillAndStroke(CORES.anvisaAmarelo, CORES.douradoQueim);
    doc.lineWidth(0.6);
    doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
      .text(`NUMERAÇÃO ANVISA / SNCR: ${dados.numero_sncr}`, MARG + 12, y + 8,
        { width: CW - 24, lineBreak: false });
    y += 34;
  }

  // ===== ASSINATURA MÉDICA =====
  // Garante espaço pra assinatura sem colidir com rodapé
  const yMinAss = H - 130;
  if (y < yMinAss) y = yMinAss;
  if (y > H - 80) {
    desenharRodape(doc, dados);
    doc.addPage();
    doc.rect(0, 0, W, H).fill(CORES.pastelFundo);
    y = H - 130;
  }
  doc.moveTo(180, y).lineTo(W - 180, y).lineWidth(0.6).stroke(CORES.navyProfundo);
  doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
    .text(dados.medico.nome, 180, y + 4, { width: W - 360, align: "center", lineBreak: false });
  doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaClaro)
    .text(`CRM ${dados.medico.uf_crm} ${dados.medico.crm}`, 180, y + 17,
      { width: W - 360, align: "center", lineBreak: false });
  if (dados.medico.icp_brasil_certificado) {
    doc.fontSize(7).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro)
      .text(`Assinatura digital ICP-Brasil A3: ${dados.medico.icp_brasil_certificado}`,
        180, y + 29, { width: W - 360, align: "center", lineBreak: false });
  }

  // Rodapé final
  desenharRodape(doc, dados);

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
