// Variante C REFINADA (TDAH/TOC friendly) — 2 modos:
//   Pagina 1: APRESENTACAO (RAS Inicial, D0) — minucioso, fundamenta o porque
//   Pagina 2: ACOMPANHAMENTO (RAS Evolucao, D21) — melhorias observadas + proximos passos
//
// Substancia exemplo: NAD+ Endovenoso (copy integrativo real, nao placeholder).
// Filosofia: medicina integrativa — restaurar funcao, nao remediar sintoma.
//
// Saida: scripts/.local/samples/mockup-nad-tdah-toc-2-modos.pdf

import PDFDocument from "pdfkit";
import { createWriteStream, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const CORES = {
  navyProfundo: "#0F2940",
  navyMedio: "#1F3A5F",
  navyClaro: "#2C4D7A",
  offWhite: "#F7F6F2",
  creme: "#F2EEDF",
  dourado: "#C7A646",
  douradoQueim: "#C8951A",
  verdeSalvia: "#9DB8A5",
  verdeBeneficio: "#3E8B5B",
  verdeBgClaro: "#E8F1EA",
  cinzaTexto: "#1A1A1A",
  cinzaClaro: "#666666",
  cinzaLinha: "#D6D2C4",
  cinzaBgZebra: "#EDE9DC",
  vermelhoAlerta: "#B83227",
  vermelhoBgClaro: "#F7E4E2",
  amareloAlerta: "#C28920",
  amareloBgClaro: "#F8EFD4",
};

const W = 595;
const H = 842;
const MARG = 42;
const COL_W = W - MARG * 2;

// ============================================================================
// Helpers visuais TDAH/TOC
// ============================================================================

function tag(
  doc: PDFKit.PDFDocument,
  x: number, y: number, texto: string,
  bg: string, fg: string,
): number {
  const padX = 7, padY = 3;
  doc.fontSize(8).font("Helvetica-Bold");
  const w = doc.widthOfString(texto) + padX * 2;
  const h = 14;
  doc.rect(x, y, w, h).fill(bg);
  doc.fillColor(fg).text(texto, x + padX, y + padY + 0.5);
  return w;
}

function blocoNumerado(
  doc: PDFKit.PDFDocument,
  numero: number, titulo: string, y: number,
): number {
  // Selo numerado quadrado dourado + titulo navy
  doc.rect(MARG, y, 22, 22).fill(CORES.dourado);
  doc.fontSize(13).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
    .text(String(numero).padStart(2, "0"), MARG, y + 5, { width: 22, align: "center" });
  doc.fontSize(12).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
    .text(titulo.toUpperCase(), MARG + 32, y + 6, { characterSpacing: 0.8 });
  // Filete dourado fino abaixo
  doc.rect(MARG + 32, y + 21, COL_W - 32, 0.8).fill(CORES.dourado);
  return y + 32;
}

function paragrafo(doc: PDFKit.PDFDocument, t: string, y: number, indent = 32): number {
  const w = COL_W - indent;
  doc.fontSize(9.5).font("Helvetica").fillColor(CORES.cinzaTexto)
    .text(t, MARG + indent, y, { width: w, lineGap: 3, align: "justify" });
  return y + doc.heightOfString(t, { width: w, lineGap: 3 }) + 6;
}

function caixaInfo(
  doc: PDFKit.PDFDocument, y: number,
  bg: string, borda: string, conteudo: (yi: number) => number,
  indent = 32,
): number {
  const xi = MARG + indent;
  const wi = COL_W - indent;
  const yi = y + 8;
  const yFim = conteudo(yi);
  const altura = yFim - y + 4;
  // Desenha a caixa por tras (redesenhamos o conteudo)
  doc.save();
  doc.rect(xi, y, wi, altura).fill(bg);
  doc.rect(xi, y, 3, altura).fill(borda);
  doc.restore();
  conteudo(yi);
  return y + altura + 8;
}

function rodapeInstitucional(doc: PDFKit.PDFDocument) {
  const yFooter = H - 38;
  doc.rect(0, yFooter, W, 38).fill(CORES.navyProfundo);
  doc.fontSize(7.5).font("Helvetica-Oblique").fillColor(CORES.creme)
    .text("Medicina Integrativa de Precisão · Restaura função, não remedia sintoma",
      MARG, yFooter + 10, { width: COL_W - 200 });
  doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.dourado)
    .text("PAWARDS®", W - MARG - 130, yFooter + 8, { width: 130, align: "right" });
  doc.fontSize(7.5).font("Helvetica").fillColor(CORES.creme)
    .text("PADCON® · Plataforma Clínica Integrativa",
      W - MARG - 200, yFooter + 22, { width: 200, align: "right" });
}

function headerSubstancia(
  doc: PDFKit.PDFDocument,
  nome: string, codigo: string,
  via: string, dose: string, frequencia: string, categoria: string,
  modoEtiqueta: string, modoCor: string,
) {
  // Faixa navy topo cheia (52px de altura)
  doc.rect(0, 0, W, 64).fill(CORES.navyProfundo);
  // Filete dourado embaixo da faixa
  doc.rect(0, 64, W, 2).fill(CORES.dourado);

  // Selo dourado quadrado a esquerda com cod abreviado
  doc.rect(MARG, 14, 38, 38).fill(CORES.dourado);
  doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
    .text("RXS", MARG, 20, { width: 38, align: "center" });
  doc.fontSize(11).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
    .text(codigo, MARG, 32, { width: 38, align: "center" });

  // Nome + categoria
  doc.fontSize(17).font("Helvetica-Bold").fillColor(CORES.creme)
    .text(nome, MARG + 50, 16, { width: COL_W - 200 });
  doc.fontSize(8.5).font("Helvetica-Oblique").fillColor(CORES.dourado)
    .text(categoria, MARG + 50, 38, { width: COL_W - 200, characterSpacing: 0.3 });

  // Etiqueta do modo (canto sup direito)
  doc.rect(W - MARG - 130, 14, 130, 18).fill(modoCor);
  doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
    .text(modoEtiqueta.toUpperCase(), W - MARG - 130, 19,
      { width: 130, align: "center", characterSpacing: 1 });
  // Data infraetiqueta
  doc.fontSize(7.5).font("Helvetica").fillColor(CORES.creme)
    .text("Instituto Pádua · Protocolo RAS-2026-001847",
      W - MARG - 200, 38, { width: 200, align: "right" });
  doc.fontSize(7.5).font("Helvetica").fillColor(CORES.dourado)
    .text("Paciente: Carlúcia (id 3497) · Sessão 5/12",
      W - MARG - 200, 50, { width: 200, align: "right" });

  // Ribbon de 3 metadados (via/dose/frequencia) em chips dourados
  doc.rect(0, 66, W, 28).fill(CORES.cremeClaro = CORES.creme);
  const chipY = 73;
  let cx = MARG;
  const metas = [
    { l: "VIA DE ADMINISTRAÇÃO", v: via },
    { l: "DOSE PADRÃO", v: dose },
    { l: "FREQUÊNCIA", v: frequencia },
  ];
  for (const m of metas) {
    doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.cinzaClaro)
      .text(m.l, cx, chipY, { characterSpacing: 0.8 });
    doc.fontSize(9.5).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
      .text(m.v, cx, chipY + 9);
    cx += (COL_W) / 3;
  }
  // Linha divisora abaixo do ribbon
  doc.rect(0, 95, W, 1).fill(CORES.cinzaLinha);
}

// ============================================================================
// PAGINA 1 — APRESENTACAO (RAS Inicial D0)
// ============================================================================
function paginaApresentacao(doc: PDFKit.PDFDocument) {
  doc.rect(0, 0, W, H).fill(CORES.offWhite);

  headerSubstancia(
    doc,
    "NAD+ Endovenoso",
    "NADE",
    "Endovenosa lenta (2-4h)",
    "500 mg em SF 0,9%",
    "1×/semana × 6 semanas",
    "Cofator Mitocondrial · Restaurador Bioenergético · Anti-senescência",
    "Apresentação · D0",
    CORES.verdeSalvia,
  );

  let y = 108;

  // BLOCO 1 — POR QUE ESTA SUBSTÂNCIA NO SEU PROTOCOLO
  y = blocoNumerado(doc, 1, "Por que esta substância está no seu protocolo", y);
  y = paragrafo(doc,
    "Você não está sendo tratada de uma doença com NAD+. Você está repondo um cofator que seu organismo " +
    "produz naturalmente desde o nascimento, mas que declina cerca de 50% entre os 30 e os 60 anos. Essa " +
    "queda silenciosa é um dos motores centrais do envelhecimento celular — perda de energia, sono " +
    "fragmentado, neblina mental, recuperação lenta. A medicina integrativa repõe o que falta antes da " +
    "doença se instalar; não espera o sintoma virar diagnóstico para agir.",
    y);

  // BLOCO 2 — COMO ATUA NO ORGANISMO
  y = blocoNumerado(doc, 2, "Como atua no seu organismo", y);
  y = paragrafo(doc,
    "NAD+ (nicotinamida adenina dinucleotídeo) é um cofator presente em cada uma das ~37 trilhões de " +
    "células do corpo. Ele alimenta a cadeia respiratória mitocondrial (a usina de energia celular), " +
    "ativa as sirtuínas (genes guardiões da longevidade) e participa do reparo do DNA. A via endovenosa " +
    "garante 100% de biodisponibilidade — a forma oral é amplamente degradada no trato digestivo.",
    y);

  // BLOCO 3 — EVIDENCIA CIENTIFICA (caixa creme)
  y = blocoNumerado(doc, 3, "Evidência científica resumida", y);
  y = caixaInfo(doc, y, CORES.creme, CORES.dourado, (yi) => {
    doc.fontSize(9).font("Helvetica").fillColor(CORES.cinzaTexto)
      .text(
        "Trammell et al. (2016) · Martens et al. (2018) · Yoshino et al. (2018) · Yaku et al. (2021) " +
        "demonstram aumento sustentado de NAD intracelular, melhora de marcadores mitocondriais, " +
        "redução de biomarcadores de senescência e perfil de segurança excelente em doses ≤1000 mg/sessão. " +
        "Reposição contínua tem efeito cumulativo; sessões isoladas têm efeito limitado.",
        MARG + 40, yi, { width: COL_W - 48, lineGap: 3, align: "justify" });
    return yi + doc.heightOfString("x", { width: COL_W - 48, lineGap: 3 }) * 5;
  });

  // BLOCO 4 — SISTEMAS BENEFICIADOS (tags verde salvia)
  y = blocoNumerado(doc, 4, "Sistemas beneficiados", y);
  const sistemas = [
    "Mitocondrial", "Neurocognitivo", "Imunológico", "Metabólico",
    "Cardiovascular", "Reparo de DNA", "Sono · Circadiano",
  ];
  let sx = MARG + 32;
  for (const s of sistemas) {
    const w = tag(doc, sx, y, s, CORES.verdeBgClaro, CORES.verdeBeneficio);
    sx += w + 6;
    if (sx > W - MARG - 100) { sx = MARG + 32; y += 18; }
  }
  y += 24;

  // BLOCO 5 — O QUE VOCE VAI SENTIR + LINHA DO TEMPO
  y = blocoNumerado(doc, 5, "O que você vai sentir · Linha do tempo", y);
  const linhaTempo = [
    { quando: "Durante a infusão", cor: CORES.verdeBgClaro, bd: CORES.verdeBeneficio,
      t: "Leveza geral, possível leve rubor facial (esperado, cede sozinho)." },
    { quando: "24 a 72 horas", cor: CORES.verdeBgClaro, bd: CORES.verdeBeneficio,
      t: "Aumento de energia, melhora da clareza mental, sono mais profundo." },
    { quando: "1 a 3 sessões", cor: CORES.amareloBgClaro, bd: CORES.amareloAlerta,
      t: "Consolidação dos efeitos; algumas pessoas notam onda inicial de cansaço (resposta de adaptação)." },
    { quando: "4 a 6 semanas", cor: CORES.amareloBgClaro, bd: CORES.amareloAlerta,
      t: "Mudança sustentada em marcadores laboratoriais e em sensação de bem-estar de fundo." },
  ];
  for (const item of linhaTempo) {
    doc.rect(MARG + 32, y, 100, 18).fill(item.bd);
    doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.offWhite)
      .text(item.quando, MARG + 32, y + 5, { width: 100, align: "center" });
    doc.fontSize(9).font("Helvetica").fillColor(CORES.cinzaTexto)
      .text(item.t, MARG + 142, y + 4, { width: COL_W - 142, lineGap: 2 });
    y += 24;
  }
  y += 4;

  // BLOCO 6 — CUIDADOS E CONTRAINDICACOES (caixa vermelha clara)
  y = blocoNumerado(doc, 6, "Cuidados e contraindicações", y);
  y = caixaInfo(doc, y, CORES.vermelhoBgClaro, CORES.vermelhoAlerta, (yi) => {
    const itens = [
      "Gravidez e amamentação — não recomendado por ausência de estudos.",
      "Insuficiência renal grave — avaliar função renal antes da 1ª sessão.",
      "Neoplasia ativa em tratamento — discutir com oncologista (sirtuínas têm efeito dual).",
      "Hipersensibilidade conhecida a componentes — testar tolerância em dose reduzida.",
    ];
    let yy = yi;
    for (const it of itens) {
      doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.vermelhoAlerta).text("•", MARG + 40, yy);
      doc.fontSize(9).font("Helvetica").fillColor(CORES.cinzaTexto)
        .text(it, MARG + 52, yy, { width: COL_W - 60, lineGap: 2 });
      yy += doc.heightOfString(it, { width: COL_W - 60, lineGap: 2 }) + 4;
    }
    return yy;
  });

  rodapeInstitucional(doc);
}

// ============================================================================
// PAGINA 2 — ACOMPANHAMENTO (RAS Evolucao D21)
// ============================================================================
function paginaAcompanhamento(doc: PDFKit.PDFDocument) {
  doc.rect(0, 0, W, H).fill(CORES.offWhite);

  headerSubstancia(
    doc,
    "NAD+ Endovenoso",
    "NADE",
    "Endovenosa lenta (2-4h)",
    "500 mg em SF 0,9%",
    "1×/semana — 3 de 6 aplicadas",
    "Cofator Mitocondrial · Restaurador Bioenergético · Anti-senescência",
    "Acompanhamento · D21",
    CORES.dourado,
  );

  let y = 108;

  // BLOCO 1 — RESUMO DO QUE OBSERVAMOS
  y = blocoNumerado(doc, 1, "Resumo das 3 primeiras semanas", y);
  y = paragrafo(doc,
    "Três infusões aplicadas (D0, D7, D14), tolerância excelente em todas. Nenhum efeito adverso " +
    "registrado. Adesão integral ao protocolo. Resposta clínica subjetiva acima da média esperada — " +
    "Carlúcia relata mudanças perceptíveis já a partir da segunda infusão, padrão consistente com a " +
    "literatura para reposição em mulheres na 5ª década com sinais prévios de declínio bioenergético.",
    y);

  // BLOCO 2 — ANTES x DEPOIS (tabela 2 colunas)
  y = blocoNumerado(doc, 2, "Antes (D0) × Depois (D21) — Relato da paciente", y);
  const comparativo = [
    { dim: "Energia matinal", antes: "Acorda exausta, leva 2-3h pra render", depois: "Acorda disposta, render imediato" },
    { dim: "Clareza mental", antes: "Brain-fog persistente após almoço", depois: "Foco sustentado tarde toda" },
    { dim: "Qualidade do sono", antes: "Acorda 2-3× por noite", depois: "Sono contínuo 6-7h" },
    { dim: "Recuperação física", antes: "Dores musculares 48h após exercício", depois: "Recuperação em 12-24h" },
    { dim: "Humor de fundo", antes: "Irritabilidade frequente", depois: "Estabilidade emocional perceptível" },
  ];
  const colDim = MARG + 32, colA = MARG + 170, colD = MARG + 360;
  // Cabecalho tabela
  doc.rect(colDim, y, COL_W - 32, 18).fill(CORES.navyMedio);
  doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.creme)
    .text("DIMENSÃO", colDim + 6, y + 5, { characterSpacing: 0.8 });
  doc.text("ANTES (D0)", colA + 6, y + 5, { characterSpacing: 0.8 });
  doc.text("DEPOIS (D21)", colD + 6, y + 5, { characterSpacing: 0.8 });
  y += 18;
  let zebra = false;
  for (const c of comparativo) {
    const alt = 32;
    if (zebra) doc.rect(colDim, y, COL_W - 32, alt).fill(CORES.cinzaBgZebra);
    zebra = !zebra;
    doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
      .text(c.dim, colDim + 6, y + 8, { width: 132 });
    doc.fontSize(8.5).font("Helvetica").fillColor(CORES.cinzaTexto)
      .text(c.antes, colA + 6, y + 8, { width: 184, lineGap: 1 });
    doc.fontSize(8.5).font("Helvetica-Bold").fillColor(CORES.verdeBeneficio)
      .text(c.depois, colD + 6, y + 8, { width: 195, lineGap: 1 });
    y += alt;
  }
  y += 10;

  // BLOCO 3 — MARCADORES OBSERVADOS (chips verdes)
  y = blocoNumerado(doc, 3, "Marcadores laboratoriais & fisiológicos", y);
  const marcadores = [
    { l: "PCR ultrassensível", v: "1,8 → 0,9 mg/L", melhora: true },
    { l: "Variabilidade FC (HRV)", v: "32 → 41 ms", melhora: true },
    { l: "Tempo de sono profundo", v: "48 → 71 min/noite", melhora: true },
    { l: "Escala FACIT-fadiga", v: "28 → 41 (de 52)", melhora: true },
  ];
  let mx = MARG + 32, my = y;
  for (const m of marcadores) {
    const w = 235;
    doc.rect(mx, my, w, 30).fill(CORES.verdeBgClaro);
    doc.rect(mx, my, 3, 30).fill(CORES.verdeBeneficio);
    doc.fontSize(7.5).font("Helvetica-Bold").fillColor(CORES.cinzaClaro)
      .text(m.l, mx + 10, my + 5, { characterSpacing: 0.5 });
    doc.fontSize(11).font("Helvetica-Bold").fillColor(CORES.verdeBeneficio)
      .text(m.v, mx + 10, my + 15);
    mx += w + 10;
    if (mx + 235 > W - MARG) { mx = MARG + 32; my += 38; }
  }
  y = my + 42;

  // BLOCO 4 — PROXIMAS ETAPAS DO PROTOCOLO
  y = blocoNumerado(doc, 4, "Próximas etapas previstas", y);
  y = caixaInfo(doc, y, CORES.creme, CORES.dourado, (yi) => {
    const etapas = [
      "Sessões 4, 5 e 6 (D28, D35, D42): manter dose e cadência atuais — resposta dentro do esperado.",
      "Após sessão 6: pausa de 8 semanas com reavaliação laboratorial completa (NAD intra-eritrocitário, sirtuínas, marcadores inflamatórios).",
      "Decisão de ciclo de manutenção mensal será feita conjuntamente com base nos novos marcadores.",
    ];
    let yy = yi;
    for (let i = 0; i < etapas.length; i++) {
      doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.dourado)
        .text(`${i + 1}.`, MARG + 40, yy);
      doc.fontSize(9).font("Helvetica").fillColor(CORES.cinzaTexto)
        .text(etapas[i], MARG + 56, yy, { width: COL_W - 64, lineGap: 2 });
      yy += doc.heightOfString(etapas[i], { width: COL_W - 64, lineGap: 2 }) + 6;
    }
    return yy;
  });

  // BLOCO 5 — OBSERVACOES DO MEDICO RESPONSAVEL (caixa navy clara)
  y = blocoNumerado(doc, 5, "Observação clínica do médico responsável", y);
  y = caixaInfo(doc, y, "#EAF0F7", CORES.navyMedio, (yi) => {
    doc.fontSize(9).font("Helvetica-Oblique").fillColor(CORES.navyProfundo)
      .text(
        "Resposta robusta e consistente. Carlúcia atingiu em 3 semanas o que costuma se observar em " +
        "6-8 sessões. Mantemos o plano original sem ajustes; pausa pós-sessão 6 será essencial para " +
        "consolidar a resposta. Nenhum sinal de tolerância ou efeito paradoxal.",
        MARG + 40, yi, { width: COL_W - 48, lineGap: 3, align: "justify" });
    const h = doc.heightOfString("x", { width: COL_W - 48, lineGap: 3 }) * 4;
    doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.navyMedio)
      .text("— Dra. Responsável · CRM-PR 00000 · 18/mai/2026", MARG + 40, yi + h);
    return yi + h + 14;
  });

  rodapeInstitucional(doc);
}

// ============================================================================
// MAIN
// ============================================================================
const out = "scripts/.local/samples/mockup-nad-tdah-toc-2-modos.pdf";
mkdirSync(dirname(out), { recursive: true });
const doc = new PDFDocument({ size: "A4", margins: { top: 0, left: 0, right: 0, bottom: 0 } });
doc.pipe(createWriteStream(out));

paginaApresentacao(doc);
doc.addPage({ size: "A4", margins: { top: 0, left: 0, right: 0, bottom: 0 } });
paginaAcompanhamento(doc);

doc.end();
doc.on("end", () => console.log("OK ->", out));
