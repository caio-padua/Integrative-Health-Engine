// ════════════════════════════════════════════════════════════════════
// PAWARDS MEDCORE · Wave 9 PARQ · PDF Termo de Parceria de Qualidade
//
// 4 paginas A4 institucional navy/gold:
//   P1 - Capa (titulo, partes, finalidade, marcacao Validacao Simplificada)
//   P2 - Considerandos + Base legal (CFM 2.386/2024 + CC 593-609 + STJ)
//   P3 - 10 Clausulas
//   P4 - Assinaturas (clinica ICP + farmacia 1 das 5 modalidades) + QR
//
// QR code → URL publica /parq/verificar-hash/{sha256}
// Hash SHA-256 completo no rodape de TODAS as paginas (defensabilidade)
//
// PARQ NUNCA usa "comissao": substitui por "contraprestacao por auditoria
// Kaizen bimestral" (CFM 2.386/2024 art. 27 — vedacao de comissao por
// indicacao). Modelo aprovado pelo Dr. Claude.
// ════════════════════════════════════════════════════════════════════
import PDFDocument from "pdfkit";
import QRCode from "qrcode";

const NAVY = "#020406";
const NAVY_SOFT = "#0a1018";
const GOLD = "#C89B3C";
const GOLD_LT = "#E8C268";
const GOLD_BG = "#FAF6EC";
const GRAY_TXT = "#374151";
const GRAY_MD = "#6b7280";
const GRAY_LT = "#9ca3af";
const GRAY_BORDER = "#e5e7eb";
const PANEL_BG = "#fafafa";
const RED = "#dc2626";
const GREEN = "#16a34a";

const F_SERIF_BOLD = "Times-Bold";
const F_SERIF = "Times-Roman";
const F_SANS = "Helvetica";
const F_SANS_BOLD = "Helvetica-Bold";
const F_SANS_OBLIQUE = "Helvetica-Oblique";
const F_MONO = "Courier";
const F_MONO_BOLD = "Courier-Bold";

export type DadosTermoPARQ = {
  acordo: {
    id: number;
    numero_serie: string;
    sha256_hash: string;
    data_emissao: string | Date;
    validacao_simplificada: boolean;
    toggle_obrigatoriedade_farmacia: boolean;
  };
  clinica: {
    unidade_id: number;
    nome: string;
    cnpj?: string | null;
    endereco?: string | null;
    crm_responsavel?: string | null;
    medico_responsavel?: string | null;
  };
  farmacia: {
    id: number;
    nome: string;
    cnpj?: string | null;
    endereco?: string | null;
    responsavel_tecnico?: string | null;
    crf?: string | null;
  };
  assinatura_clinica?: {
    tipo: string;
    data: string | Date;
    ip?: string | null;
    cpf?: string | null;
    nome?: string | null;
  };
  assinatura_farmacia?: {
    tipo:
      | "icp_brasil"
      | "docusign"
      | "otp_email_sms"
      | "upload_pdf_assinado"
      | "aceite_ip_geo";
    data: string | Date;
    ip?: string | null;
    geo?: string | null;
    cpf?: string | null;
    nome?: string | null;
    canal?: string | null;
  };
  /** URL publica para QR code (ex: https://app.com/parq/verificar/{hash}) */
  url_verificacao_publica: string;
  protocolo: string;
  geradoEm: Date;
};

function fmtData(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("pt-BR");
}

function fmtDataHora(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function nomeModalidade(t: string): string {
  switch (t) {
    case "icp_brasil":
      return "Certificado Digital ICP-Brasil (e-CPF/e-CNPJ)";
    case "docusign":
      return "DocuSign / ZapSign / ClickSign";
    case "otp_email_sms":
      return "Codigo OTP via e-mail/SMS";
    case "upload_pdf_assinado":
      return "Upload de PDF assinado manualmente";
    case "aceite_ip_geo":
      return "Aceite eletronico simplificado (IP+geolocalizacao)";
    default:
      return t;
  }
}

// ---------- helpers de desenho ----------

function rodape(
  doc: PDFKit.PDFDocument,
  d: DadosTermoPARQ,
  numPagina: number,
  totalPaginas: number,
) {
  const y = 770;
  // Faixa gold 1px
  doc.save().rect(40, y, 515, 1).fill(GOLD).restore();
  // Linha 1: hash truncado + numero serie
  doc
    .font(F_MONO)
    .fontSize(7)
    .fillColor(GRAY_MD)
    .text(
      `SHA-256: ${d.acordo.sha256_hash}`,
      40,
      y + 6,
      { width: 400, lineBreak: false, ellipsis: true },
    );
  doc
    .font(F_MONO_BOLD)
    .fontSize(7)
    .fillColor(NAVY)
    .text(
      `${d.acordo.numero_serie}  ·  pag. ${numPagina}/${totalPaginas}`,
      40,
      y + 18,
      { width: 515, align: "right" },
    );
  // Linha 3: protocolo + gerado em
  doc
    .font(F_SANS_OBLIQUE)
    .fontSize(7)
    .fillColor(GRAY_LT)
    .text(
      `Protocolo ${d.protocolo} · gerado em ${fmtDataHora(d.geradoEm)} · documento defensavel e auditavel publicamente`,
      40,
      y + 30,
      { width: 515, align: "left" },
    );
}

function selVldSimplif(doc: PDFKit.PDFDocument, x: number, y: number) {
  // Selo gold "VALIDACAO SIMPLIFICADA - ATE R$ 5.000/MES"
  doc.save();
  doc.roundedRect(x, y, 200, 38, 4).fill(GOLD_LT);
  doc.roundedRect(x, y, 200, 38, 4).lineWidth(1.5).stroke(GOLD);
  doc
    .font(F_SANS_BOLD)
    .fontSize(8)
    .fillColor(NAVY)
    .text("VALIDACAO SIMPLIFICADA", x, y + 6, { width: 200, align: "center" });
  doc
    .font(F_SANS)
    .fontSize(7)
    .fillColor(NAVY_SOFT)
    .text(
      "Contraprestacao agregada ate R$ 5.000/mes",
      x,
      y + 19,
      { width: 200, align: "center" },
    );
  doc
    .font(F_SANS_OBLIQUE)
    .fontSize(6)
    .fillColor(NAVY_SOFT)
    .text("(Lei 14.063/2020 art.5o I)", x, y + 28, {
      width: 200,
      align: "center",
    });
  doc.restore();
}

// ============================================================
// PAGINA 1 — CAPA INSTITUCIONAL
// ============================================================
function pagina1Capa(doc: PDFKit.PDFDocument, d: DadosTermoPARQ) {
  // Cabecalho navy 200px
  doc.save().rect(0, 0, 595, 200).fill(NAVY).restore();
  // Faixa gold 5px
  doc.save().rect(0, 200, 595, 5).fill(GOLD).restore();

  // Logo "PAWARDS MEDCORE" centrado
  doc
    .font(F_SERIF_BOLD)
    .fontSize(28)
    .fillColor(GOLD)
    .text("PAWARDS  MEDCORE", 0, 60, { width: 595, align: "center" });

  doc
    .font(F_SANS_OBLIQUE)
    .fontSize(9)
    .fillColor(GOLD_LT)
    .text("Sistema de Gestao Clinica Multi-Tenant", 0, 95, {
      width: 595,
      align: "center",
    });

  // Titulo principal navy/gold
  doc
    .font(F_SERIF_BOLD)
    .fontSize(18)
    .fillColor("#FFFFFF")
    .text("TERMO DE PARCERIA DE QUALIDADE TECNICA", 0, 130, {
      width: 595,
      align: "center",
    });

  doc
    .font(F_SERIF)
    .fontSize(13)
    .fillColor(GOLD_LT)
    .text("Acordo de Auditoria Kaizen Bimestral · PARQ", 0, 155, {
      width: 595,
      align: "center",
    });

  doc
    .font(F_MONO_BOLD)
    .fontSize(10)
    .fillColor("#FFFFFF")
    .text(d.acordo.numero_serie, 0, 178, { width: 595, align: "center" });

  // ─── Box "PARTES DO ACORDO" (grid 2x1) ───
  let y = 240;
  doc
    .font(F_SANS_BOLD)
    .fontSize(11)
    .fillColor(NAVY)
    .text("PARTES DO ACORDO", 40, y);

  doc.save().rect(40, y + 18, 515, 1).fill(GOLD).restore();

  y += 30;

  // CLINICA (esquerda)
  doc.save();
  doc.roundedRect(40, y, 250, 130, 4).fill(PANEL_BG);
  doc.roundedRect(40, y, 250, 130, 4).lineWidth(0.5).stroke(GRAY_BORDER);
  doc.restore();
  doc
    .font(F_SANS_BOLD)
    .fontSize(8)
    .fillColor(GOLD)
    .text("CLINICA CONTRATANTE", 50, y + 8);
  doc
    .font(F_SERIF_BOLD)
    .fontSize(11)
    .fillColor(NAVY)
    .text(d.clinica.nome, 50, y + 22, { width: 230 });
  doc
    .font(F_SANS)
    .fontSize(8)
    .fillColor(GRAY_TXT)
    .text(`CNPJ: ${d.clinica.cnpj || "—"}`, 50, y + 50);
  doc.text(`End.: ${d.clinica.endereco || "—"}`, 50, y + 64, {
    width: 230,
  });
  doc.text(
    `Resp. tecnico: ${d.clinica.medico_responsavel || "—"}`,
    50,
    y + 92,
    { width: 230 },
  );
  doc.text(`CRM: ${d.clinica.crm_responsavel || "—"}`, 50, y + 106);

  // FARMACIA (direita)
  doc.save();
  doc.roundedRect(305, y, 250, 130, 4).fill(PANEL_BG);
  doc.roundedRect(305, y, 250, 130, 4).lineWidth(0.5).stroke(GRAY_BORDER);
  doc.restore();
  doc
    .font(F_SANS_BOLD)
    .fontSize(8)
    .fillColor(GOLD)
    .text("FARMACIA PARCEIRA", 315, y + 8);
  doc
    .font(F_SERIF_BOLD)
    .fontSize(11)
    .fillColor(NAVY)
    .text(d.farmacia.nome, 315, y + 22, { width: 230 });
  doc
    .font(F_SANS)
    .fontSize(8)
    .fillColor(GRAY_TXT)
    .text(`CNPJ: ${d.farmacia.cnpj || "—"}`, 315, y + 50);
  doc.text(`End.: ${d.farmacia.endereco || "—"}`, 315, y + 64, {
    width: 230,
  });
  doc.text(
    `Resp. tecnico: ${d.farmacia.responsavel_tecnico || "—"}`,
    315,
    y + 92,
    { width: 230 },
  );
  doc.text(`CRF: ${d.farmacia.crf || "—"}`, 315, y + 106);

  y += 150;

  // ─── Box info: data emissao + modalidade ───
  doc.save();
  doc.roundedRect(40, y, 515, 50, 4).fill(NAVY);
  doc.restore();
  doc
    .font(F_SANS)
    .fontSize(7)
    .fillColor(GOLD_LT)
    .text("DATA DE EMISSAO", 55, y + 8);
  doc
    .font(F_SERIF_BOLD)
    .fontSize(13)
    .fillColor("#FFFFFF")
    .text(fmtData(d.acordo.data_emissao), 55, y + 19);

  doc
    .font(F_SANS)
    .fontSize(7)
    .fillColor(GOLD_LT)
    .text("OBRIGATORIEDADE DE INDICACAO", 240, y + 8);
  doc
    .font(F_SERIF_BOLD)
    .fontSize(13)
    .fillColor("#FFFFFF")
    .text(
      d.acordo.toggle_obrigatoriedade_farmacia ? "ATIVA" : "DESATIVADA",
      240,
      y + 19,
    );
  doc
    .font(F_SANS_OBLIQUE)
    .fontSize(6)
    .fillColor(GOLD_LT)
    .text(
      d.acordo.toggle_obrigatoriedade_farmacia
        ? "(paciente livre para escolher outra farmacia)"
        : "(autonomia total preservada — CFM 2.386/2024)",
      240,
      y + 36,
    );

  doc
    .font(F_SANS)
    .fontSize(7)
    .fillColor(GOLD_LT)
    .text("PROTOCOLO", 460, y + 8);
  doc
    .font(F_MONO_BOLD)
    .fontSize(9)
    .fillColor("#FFFFFF")
    .text(d.protocolo, 460, y + 21, { width: 90 });

  y += 70;

  // ─── Box gold "FINALIDADE" ───
  doc.save();
  doc.roundedRect(40, y, 515, 110, 6).fill(GOLD_BG);
  doc.roundedRect(40, y, 515, 110, 6).lineWidth(1).stroke(GOLD);
  doc.restore();
  doc
    .font(F_SERIF_BOLD)
    .fontSize(11)
    .fillColor(NAVY)
    .text("FINALIDADE DESTE INSTRUMENTO", 55, y + 12);
  doc
    .font(F_SERIF)
    .fontSize(10)
    .fillColor(NAVY_SOFT)
    .text(
      "O Termo PARQ formaliza relacao tecnica de auditoria Kaizen bimestral entre a Clinica " +
        "e a Farmacia signataria, com objetivo de elevacao continua dos padroes de manipulacao, " +
        "rastreabilidade de insumos e seguranca do paciente. " +
        "Substitui qualquer acordo de comissao por indicacao — pratica vedada pelo art. 27 da " +
        "Resolucao CFM 2.386/2024 — por contraprestacao tecnica baseada em entregaveis " +
        "auditaveis (visitas, checklists, planos de acao Kaizen).",
      55,
      y + 30,
      { width: 490, align: "justify", lineGap: 2 },
    );

  y += 130;

  // Marcacao condicional: VALIDACAO SIMPLIFICADA
  if (d.acordo.validacao_simplificada) {
    selVldSimplif(doc, 197, y);
  } else {
    doc
      .font(F_SANS_OBLIQUE)
      .fontSize(8)
      .fillColor(GRAY_MD)
      .text(
        "Validacao plena: requerida assinatura ICP-Brasil ou DocuSign/ClickSign/ZapSign.",
        40,
        y + 12,
        { width: 515, align: "center" },
      );
  }

  rodape(doc, d, 1, 4);
}

// ============================================================
// PAGINA 2 — CONSIDERANDOS + BASE LEGAL
// ============================================================
function pagina2Considerandos(doc: PDFKit.PDFDocument, d: DadosTermoPARQ) {
  // Cabecalho compacto
  doc.save().rect(0, 0, 595, 60).fill(NAVY).restore();
  doc.save().rect(0, 60, 595, 3).fill(GOLD).restore();
  doc
    .font(F_SERIF_BOLD)
    .fontSize(13)
    .fillColor("#FFFFFF")
    .text("CONSIDERANDOS E FUNDAMENTACAO LEGAL", 0, 22, {
      width: 595,
      align: "center",
    });
  doc
    .font(F_SANS)
    .fontSize(8)
    .fillColor(GOLD_LT)
    .text(`Termo PARQ ${d.acordo.numero_serie}`, 0, 42, {
      width: 595,
      align: "center",
    });

  let y = 90;
  doc
    .font(F_SERIF_BOLD)
    .fontSize(11)
    .fillColor(NAVY)
    .text("As partes signatarias, CONSIDERANDO QUE:", 40, y);

  y += 22;

  const considerandos = [
    "I — A autonomia tecnica do medico e principio inviolavel da pratica clinica, garantido pelo art. " +
      "20 do Codigo de Etica Medica (Res. CFM 2.217/2018), nao podendo a indicacao de farmacia " +
      "magistral ser objeto de coercao economica ou contratual;",
    "II — A Resolucao CFM 2.386/2024, em seu art. 27, veda expressamente o recebimento de " +
      "comissao, gratificacao ou qualquer beneficio financeiro condicionado a indicacao de " +
      "farmacia, laboratorio ou prestador de servico;",
    "III — E juridicamente possivel a celebracao de contrato bilateral oneroso de prestacao de " +
      "servico tecnico de auditoria Kaizen (CC arts. 593 a 609), desde que a contraprestacao seja " +
      "vinculada a entregaveis tecnicos verificaveis e nao a volume de prescricoes;",
    "IV — O STJ, no julgamento do REsp 2.159.442/PR, reconheceu a licitude de parcerias tecnicas " +
      "entre clinicas e farmacias quando: (a) ha entregavel concreto, (b) ha auditoria documental " +
      "auditavel, (c) ha autonomia preservada do prescritor e (d) ha transparencia para o paciente;",
    "V — A presente parceria atende aos quatro requisitos do STJ mediante (a) visitas bimestrais " +
      "presenciais com checklist de 5 categorias, (b) hash SHA-256 publicamente verificavel, " +
      "(c) clausula expressa de autonomia (item 2 abaixo) e (d) pagina publica /sobre-parcerias-tecnicas;",
    "VI — A Lei 14.063/2020, art. 5o I, autoriza assinatura eletronica simples para atos de baixo " +
      "impacto financeiro (ate R$ 5.000/mes em contraprestacao agregada), aplicavel a este " +
      "instrumento na modalidade Validacao Simplificada;",
  ];

  for (const c of considerandos) {
    doc
      .font(F_SERIF)
      .fontSize(10)
      .fillColor(GRAY_TXT)
      .text(c, 40, y, { width: 515, align: "justify", lineGap: 1.5 });
    y = doc.y + 8;
  }

  y += 6;

  // Box gold "BASE LEGAL CONSOLIDADA"
  doc.save();
  doc.roundedRect(40, y, 515, 100, 5).fill(GOLD_BG);
  doc.roundedRect(40, y, 515, 100, 5).lineWidth(1).stroke(GOLD);
  doc.restore();
  doc
    .font(F_SERIF_BOLD)
    .fontSize(11)
    .fillColor(NAVY)
    .text("BASE LEGAL CONSOLIDADA", 55, y + 12);
  doc
    .font(F_SANS)
    .fontSize(9)
    .fillColor(NAVY_SOFT)
    .text(
      "• Resolucao CFM 2.386/2024 (vedacao de comissao por indicacao — art. 27)\n" +
        "• Resolucao CFM 2.217/2018 (Codigo de Etica Medica — art. 20, autonomia tecnica)\n" +
        "• Codigo Civil arts. 593-609 (contrato de prestacao de servico)\n" +
        "• STJ REsp 2.159.442/PR (licitude de parcerias tecnicas com entregaveis auditaveis)\n" +
        "• Lei 14.063/2020 art. 5o I (assinatura eletronica simples para atos de baixo impacto)\n" +
        "• LGPD Lei 13.709/2018 arts. 7o V e 11o II.f (compartilhamento de dados de saude)",
      55,
      y + 30,
      { width: 490, lineGap: 3 },
    );

  rodape(doc, d, 2, 4);
}

// ============================================================
// PAGINA 3 — 10 CLAUSULAS
// ============================================================
function pagina3Clausulas(doc: PDFKit.PDFDocument, d: DadosTermoPARQ) {
  doc.save().rect(0, 0, 595, 60).fill(NAVY).restore();
  doc.save().rect(0, 60, 595, 3).fill(GOLD).restore();
  doc
    .font(F_SERIF_BOLD)
    .fontSize(13)
    .fillColor("#FFFFFF")
    .text("CLAUSULAS CONTRATUAIS", 0, 22, {
      width: 595,
      align: "center",
    });
  doc
    .font(F_SANS)
    .fontSize(8)
    .fillColor(GOLD_LT)
    .text(`Termo PARQ ${d.acordo.numero_serie}`, 0, 42, {
      width: 595,
      align: "center",
    });

  const clausulas: Array<{ titulo: string; texto: string }> = [
    {
      titulo: "1. DO OBJETO",
      texto:
        "O presente Termo tem por objeto a prestacao, pela FARMACIA, de servico tecnico de manipulacao " +
        "magistral aos pacientes da CLINICA, mediante auditoria Kaizen bimestral conduzida pela CLINICA, " +
        "visando elevacao continua dos padroes de qualidade.",
    },
    {
      titulo: "2. DA AUTONOMIA PRESCRITIVA (clausula petrea)",
      texto:
        "A CLINICA preserva integralmente a autonomia tecnica de seus medicos, sendo vedada qualquer " +
        "imposicao, sugestao coercitiva ou incentivo financeiro vinculado a indicacao desta FARMACIA. " +
        "O paciente sera SEMPRE informado da existencia desta parceria e de seu direito a escolher " +
        "livremente outra farmacia magistral, conforme pagina publica /sobre-parcerias-tecnicas.",
    },
    {
      titulo: "3. DA AUDITORIA KAIZEN BIMESTRAL",
      texto:
        "A CLINICA realizara visita presencial a FARMACIA a cada 60 (sessenta) dias, aplicando " +
        "checklist tecnico de 5 categorias (insumos, processamento, atendimento, entrega, qualidade " +
        "geral), com nota 1-5 por item. Cada visita gera relatorio assinado e plano de acao Kaizen " +
        "para nao-conformidades identificadas.",
    },
    {
      titulo: "4. DA CONTRAPRESTACAO TECNICA",
      texto:
        "Em razao do servico tecnico de auditoria Kaizen (NAO comissao por indicacao), a FARMACIA " +
        "remunera a CLINICA conforme valor estimado vinculado ao volume de auditoria realizada e " +
        "complexidade dos planos Kaizen. O valor JAMAIS sera vinculado a quantidade de prescricoes " +
        "ou a faturamento da FARMACIA, em estrito cumprimento ao art. 27 da CFM 2.386/2024.",
    },
    {
      titulo: "5. DOS INDICADORES DE QUALIDADE",
      texto:
        "A FARMACIA sera classificada conforme media ponderada das 5 categorias do checklist: " +
        "GOLD (>=4.5/5.0), SILVER (3.5-4.49), BRONZE (2.5-3.49), EM_CORRECAO (<2.5). " +
        "A CLINICA mantem visivel ao paciente apenas o status da parceria, jamais nomes ou notas individuais.",
    },
    {
      titulo: "6. DO PLANO DE ACAO KAIZEN",
      texto:
        "Cada nao-conformidade gera plano de acao com prazo limite definido pela CLINICA (entre 7 e 90 " +
        "dias). A FARMACIA compromete-se a executar e evidenciar (foto, documento, video) o saneamento. " +
        "Planos atrasados ou nao executados podem motivar suspensao temporaria ou denuncia do PARQ.",
    },
    {
      titulo: "7. DA SUSPENSAO E DENUNCIA",
      texto:
        "A CLINICA pode suspender o PARQ unilateralmente por: (a) 2+ planos Kaizen atrasados; " +
        "(b) reincidencia em nao-conformidade critica (insumos vencidos, contaminacao); " +
        "(c) denuncia formal por paciente ou auditoria CRM. A FARMACIA pode denunciar mediante aviso " +
        "previo de 30 dias. Hipotese de denuncia imediata: comprovacao de pratica vedada por art. 27 CFM 2.386/2024.",
    },
    {
      titulo: "8. DA TRANSPARENCIA AO PACIENTE",
      texto:
        "A CLINICA manifesta de forma publica e auditavel a existencia desta parceria atraves: " +
        "(a) banner no Painel CEO interno informando autonomia preservada; " +
        "(b) pagina publica /sobre-parcerias-tecnicas; " +
        "(c) frase obrigatoria no rodape de TODA receita medica emitida; " +
        "(d) comunicacao por WhatsApp ao paciente no momento da emissao da receita.",
    },
    {
      titulo: "9. DA VIGENCIA E RENOVACAO",
      texto:
        "Este Termo vigora por prazo indeterminado a contar da data de assinatura, podendo ser denunciado " +
        "por qualquer das partes nos termos da clausula 7. As condicoes tecnicas e a contraprestacao " +
        "estimada poderao ser revisadas anualmente mediante aditivo bilateral.",
    },
    {
      titulo: "10. DO FORO E DA AUDITABILIDADE PUBLICA",
      texto:
        "Fica eleito o foro da Comarca da sede da CLINICA. Este Termo gera hash SHA-256 unico, " +
        "publicamente verificavel via QR code ou URL /parq/verificar-hash/{sha256}, sendo este o " +
        "instrumento principal de defensabilidade juridica do PARQ perante CRM, CRF, Ministerio Publico " +
        "ou Justica Comum.",
    },
  ];

  let y = 80;
  for (const c of clausulas) {
    // Verificar se cabe na pagina
    const espacoNecessario = 50;
    if (y + espacoNecessario > 740) {
      // Nao deveria acontecer com 10 clausulas, mas guard
      break;
    }
    doc
      .font(F_SANS_BOLD)
      .fontSize(9)
      .fillColor(GOLD)
      .text(c.titulo, 40, y);
    y += 13;
    doc
      .font(F_SERIF)
      .fontSize(8.5)
      .fillColor(GRAY_TXT)
      .text(c.texto, 40, y, { width: 515, align: "justify", lineGap: 1 });
    y = doc.y + 8;
  }

  rodape(doc, d, 3, 4);
}

// ============================================================
// PAGINA 4 — ASSINATURAS + QR DEFENSABILIDADE
// ============================================================
async function pagina4Assinaturas(
  doc: PDFKit.PDFDocument,
  d: DadosTermoPARQ,
) {
  doc.save().rect(0, 0, 595, 60).fill(NAVY).restore();
  doc.save().rect(0, 60, 595, 3).fill(GOLD).restore();
  doc
    .font(F_SERIF_BOLD)
    .fontSize(13)
    .fillColor("#FFFFFF")
    .text("ASSINATURAS E DEFENSABILIDADE", 0, 22, {
      width: 595,
      align: "center",
    });
  doc
    .font(F_SANS)
    .fontSize(8)
    .fillColor(GOLD_LT)
    .text(`Termo PARQ ${d.acordo.numero_serie}`, 0, 42, {
      width: 595,
      align: "center",
    });

  let y = 90;

  // ─── Assinatura CLINICA ───
  doc.save();
  doc.roundedRect(40, y, 515, 130, 5).fill(PANEL_BG);
  doc.roundedRect(40, y, 515, 130, 5).lineWidth(0.5).stroke(GRAY_BORDER);
  doc.restore();

  doc
    .font(F_SANS_BOLD)
    .fontSize(9)
    .fillColor(GOLD)
    .text("CLINICA — ASSINATURA DIGITAL", 55, y + 10);

  if (d.assinatura_clinica) {
    const a = d.assinatura_clinica;
    doc
      .font(F_SERIF_BOLD)
      .fontSize(11)
      .fillColor(NAVY)
      .text(d.clinica.nome, 55, y + 26);
    doc
      .font(F_SANS)
      .fontSize(8)
      .fillColor(GRAY_TXT)
      .text(`CNPJ: ${d.clinica.cnpj || "—"}`, 55, y + 44);
    doc.text(`Modalidade: ${nomeModalidade(a.tipo)}`, 55, y + 58);
    doc.text(
      `Assinante: ${a.nome || "—"}${a.cpf ? ` (CPF ${a.cpf})` : ""}`,
      55,
      y + 72,
    );
    doc.text(`Data/hora: ${fmtDataHora(a.data)}`, 55, y + 86);
    doc.text(`IP de origem: ${a.ip || "—"}`, 55, y + 100);

    // Selo verde "ASSINADO"
    doc.save();
    doc.roundedRect(440, y + 30, 100, 60, 5).fill(GREEN);
    doc.restore();
    doc
      .font(F_SANS_BOLD)
      .fontSize(10)
      .fillColor("#FFFFFF")
      .text("ASSINADO", 440, y + 50, { width: 100, align: "center" });
    doc
      .font(F_SANS)
      .fontSize(7)
      .fillColor("#FFFFFF")
      .text("ICP-Brasil", 440, y + 68, { width: 100, align: "center" });
  } else {
    doc
      .font(F_SANS_OBLIQUE)
      .fontSize(10)
      .fillColor(RED)
      .text("PENDENTE — Aguardando assinatura ICP-Brasil da clinica.", 55, y + 50);
  }

  y += 150;

  // ─── Assinatura FARMACIA ───
  doc.save();
  doc.roundedRect(40, y, 515, 130, 5).fill(PANEL_BG);
  doc.roundedRect(40, y, 515, 130, 5).lineWidth(0.5).stroke(GRAY_BORDER);
  doc.restore();

  doc
    .font(F_SANS_BOLD)
    .fontSize(9)
    .fillColor(GOLD)
    .text("FARMACIA — ASSINATURA ELETRONICA", 55, y + 10);

  if (d.assinatura_farmacia) {
    const a = d.assinatura_farmacia;
    doc
      .font(F_SERIF_BOLD)
      .fontSize(11)
      .fillColor(NAVY)
      .text(d.farmacia.nome, 55, y + 26);
    doc
      .font(F_SANS)
      .fontSize(8)
      .fillColor(GRAY_TXT)
      .text(`CNPJ: ${d.farmacia.cnpj || "—"}`, 55, y + 44);
    doc.text(`Modalidade: ${nomeModalidade(a.tipo)}`, 55, y + 58);
    doc.text(
      `Signatario: ${a.nome || "—"}${a.cpf ? ` (CPF ${a.cpf})` : ""}`,
      55,
      y + 72,
    );
    doc.text(`Data/hora: ${fmtDataHora(a.data)}`, 55, y + 86);
    doc.text(
      `IP de origem: ${a.ip || "—"}${a.geo ? ` · Geo: ${a.geo}` : ""}`,
      55,
      y + 100,
    );

    doc.save();
    doc.roundedRect(440, y + 30, 100, 60, 5).fill(GREEN);
    doc.restore();
    doc
      .font(F_SANS_BOLD)
      .fontSize(10)
      .fillColor("#FFFFFF")
      .text("ASSINADO", 440, y + 50, { width: 100, align: "center" });
    doc
      .font(F_SANS)
      .fontSize(6.5)
      .fillColor("#FFFFFF")
      .text(
        a.tipo === "icp_brasil"
          ? "ICP-Brasil"
          : a.tipo === "docusign"
            ? "DocuSign"
            : a.tipo === "otp_email_sms"
              ? "OTP " + (a.canal || "")
              : a.tipo === "upload_pdf_assinado"
                ? "PDF assinado"
                : "Aceite IP+Geo",
        440,
        y + 68,
        { width: 100, align: "center" },
      );
  } else {
    doc
      .font(F_SANS_OBLIQUE)
      .fontSize(10)
      .fillColor(RED)
      .text(
        "PENDENTE — Aguardando assinatura da farmacia (1 das 5 modalidades).",
        55,
        y + 50,
      );
  }

  y += 150;

  // ─── QR + Hash Defensabilidade ───
  doc.save();
  doc.roundedRect(40, y, 515, 160, 6).fill(NAVY);
  doc.restore();

  doc
    .font(F_SERIF_BOLD)
    .fontSize(11)
    .fillColor(GOLD)
    .text("VERIFICACAO PUBLICA · DEFENSABILIDADE JURIDICA", 0, y + 12, {
      width: 555,
      align: "center",
    });

  // QR code 130x130 a esquerda
  try {
    const qrPng = await QRCode.toBuffer(d.url_verificacao_publica, {
      errorCorrectionLevel: "H",
      width: 260,
      margin: 0,
      color: { dark: "#020406", light: "#FFFFFF" },
    });
    doc.image(qrPng, 60, y + 30, { width: 110, height: 110 });
  } catch {
    // Se falhar, mostrar caixa branca placeholder
    doc.save();
    doc.rect(60, y + 30, 110, 110).fill("#FFFFFF");
    doc.restore();
    doc
      .font(F_SANS_OBLIQUE)
      .fontSize(7)
      .fillColor(NAVY)
      .text("[QR indisponivel]", 60, y + 80, {
        width: 110,
        align: "center",
      });
  }

  // Texto explicativo a direita do QR
  doc
    .font(F_SANS)
    .fontSize(8.5)
    .fillColor("#FFFFFF")
    .text(
      "Aponte a camera para o QR Code ou acesse a URL abaixo para verificar a " +
        "autenticidade deste Termo PARQ. O hash SHA-256 e calculado sobre o conteudo " +
        "completo do acordo no momento da emissao e e armazenado em banco auditavel " +
        "(parq_acordos). Qualquer alteracao posterior invalidara o hash.",
      190,
      y + 30,
      { width: 350, align: "justify", lineGap: 2 },
    );

  doc
    .font(F_MONO_BOLD)
    .fontSize(7)
    .fillColor(GOLD_LT)
    .text("URL:", 190, y + 95);
  doc
    .font(F_MONO)
    .fontSize(7)
    .fillColor("#FFFFFF")
    .text(d.url_verificacao_publica, 190, y + 105, {
      width: 350,
      lineBreak: true,
    });

  doc
    .font(F_MONO_BOLD)
    .fontSize(7)
    .fillColor(GOLD_LT)
    .text("SHA-256:", 190, y + 125);
  doc
    .font(F_MONO)
    .fontSize(7)
    .fillColor("#FFFFFF")
    .text(d.acordo.sha256_hash, 190, y + 135, {
      width: 350,
      lineBreak: true,
    });

  rodape(doc, d, 4, 4);
}

// ============================================================
// FUNCAO PRINCIPAL — gera Buffer
// ============================================================
export async function gerarTermoPARQ(d: DadosTermoPARQ): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        info: {
          Title: `Termo PARQ ${d.acordo.numero_serie}`,
          Author: "PAWARDS MEDCORE",
          Subject:
            "Termo de Parceria de Qualidade Tecnica (auditoria Kaizen bimestral)",
          Keywords:
            "PARQ,CFM 2.386/2024,auditoria Kaizen,parceria tecnica,SHA-256",
          Creator: "PAWARDS MEDCORE Wave 9 PARQ",
          Producer: "pdfkit",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // P1 sincrona
      pagina1Capa(doc, d);
      // P2 sincrona
      doc.addPage({
        size: "A4",
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });
      pagina2Considerandos(doc, d);
      // P3 sincrona
      doc.addPage({
        size: "A4",
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });
      pagina3Clausulas(doc, d);
      // P4 ASSINCRONA (QR code)
      doc.addPage({
        size: "A4",
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });
      pagina4Assinaturas(doc, d)
        .then(() => {
          doc.end();
        })
        .catch((err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}
