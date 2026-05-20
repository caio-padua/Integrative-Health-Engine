// Mockup: 3 variantes visuais da "pagina individual por substancia".
// Caio pediu (18/mai) 3 modelos pra escolher antes de propagar pro RAS.
// Substancia de exemplo: NAD+ Endovenoso (mesma em todas as variantes).
// Texto e placeholder — copy real virara via Dr. Claude apos escolha.
//
// Saida: scripts/.local/samples/mockup-substancia-3-variantes.pdf (3 paginas A4 retrato)

import PDFDocument from "pdfkit";
import { createWriteStream, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const CORES = {
  navyProfundo: "#0F2940",
  navyMedio: "#1F3A5F",
  offWhite: "#F7F6F2",
  creme: "#F2EEDF",
  dourado: "#C7A646",
  douradoQueim: "#C8951A",
  verdeSalvia: "#9DB8A5",
  verdeAcento: "#3E8B5B",
  cinzaTexto: "#1A1A1A",
  cinzaClaro: "#666666",
  cinzaZebra: "#EDE9DC",
  vermelhoAlerta: "#B83227",
  amareloAlerta: "#C28920",
};

interface DadosSubstancia {
  nome: string;
  categoria: string;
  via: string;
  frequencia: string;
  dose: string;
  funcaoPrincipal: string;
  descricaoClinica: string;
  evidenciaCientifica: string;
  sistemasImpactados: string[];
  efeitosPercebidos: string[];
  tempoEfeito: { imediato: string; curto: string; medio: string };
  contraindicacoes: { titulo: string; texto: string }[];
}

const NAD_PLUS: DadosSubstancia = {
  nome: "NAD+ Endovenoso",
  categoria: "Estimulante de Energia Mitocondrial | Neuroprotetor",
  via: "Endovenosa (IV)",
  frequencia: "Semanal",
  dose: "500 mg em solução salina 0,9%",
  funcaoPrincipal:
    "Coenzima essencial para o metabolismo energético celular. Atua como precursora direta de NAD intracelular, restaurando função mitocondrial, reparo de DNA via sirtuínas e sinalização de longevidade celular.",
  descricaoClinica:
    "NAD+ por via endovenosa garante biodisponibilidade integral, contornando degradação gastrointestinal. Indicação principal em fadiga crônica, declínio cognitivo precoce, recuperação pós-viral e protocolos de longevidade. Administração lenta (2-4h) reduz efeitos colaterais (rubor facial, náusea leve).",
  evidenciaCientifica:
    "Estudos clínicos (Trammell 2016; Martens 2018; Yoshino 2018) demonstram aumento sustentado de NAD intracelular, melhora de marcadores mitocondriais e biomarcadores de senescência. Perfil de segurança excelente em doses até 1000 mg/sessão.",
  sistemasImpactados: ["Metabolismo Energético", "Neurocognição", "Longevidade", "Performance Física"],
  efeitosPercebidos: [
    "Aumento de energia e disposição (24-72h)",
    "Clareza mental e foco cognitivo",
    "Melhora de qualidade de sono",
    "Redução de fadiga e brain-fog",
    "Recuperação física acelerada",
    "Sensação geral de bem-estar",
  ],
  tempoEfeito: {
    imediato: "Sensação de leveza ao final da infusão",
    curto: "1-3 sessões — melhora de energia consistente",
    medio: "4-6 semanas — mudança sustentada em marcadores",
  },
  contraindicacoes: [
    { titulo: "Alergia a componentes", texto: "Raro; testar tolerância em 1ª sessão" },
    { titulo: "Gravidez e amamentação", texto: "Não recomendado por falta de estudos" },
    { titulo: "Insuficiência renal grave", texto: "Avaliar função renal previamente" },
  ],
};

const PADUA_HEADER = {
  titulo: "INSTITUTO PÁDUA",
  subtitulo: "Medicina Integrativa · Pawards V485",
  protocolo: "PROTOCOLO RAS-2026-001847 · Sessão 5 de 12 · 17/abr/2026",
};

// ============================================================================
// VARIANTE A — Editorial Classico (fiel ao modelo Padua p-11)
// 2 colunas, serif navy, filetes simples, off-white
// ============================================================================
function variantA(doc: PDFKit.PDFDocument, s: DadosSubstancia) {
  const W = 595, H = 842;
  // Fundo creme
  doc.rect(0, 0, W, H).fill(CORES.offWhite);
  // Filete navy topo
  doc.rect(40, 30, W - 80, 4).fill(CORES.navyMedio);

  // Header com nome + 4 metadados
  doc.fontSize(22).font("Times-Bold").fillColor(CORES.navyMedio)
    .text(s.nome.toUpperCase(), 40, 50, { width: W - 80 });
  doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.cinzaClaro)
    .text("CATEGORIA TERAPÊUTICA", 40, 88, { characterSpacing: 1 });
  doc.fontSize(9).font("Helvetica").fillColor(CORES.cinzaTexto).text(s.categoria, 40, 100, { width: 140 });
  doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.cinzaClaro)
    .text("VIA DE ADMINISTRAÇÃO", 200, 88, { characterSpacing: 1 });
  doc.fontSize(9).font("Helvetica").fillColor(CORES.cinzaTexto).text(s.via, 200, 100);
  doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.cinzaClaro)
    .text("FREQUÊNCIA", 360, 88, { characterSpacing: 1 });
  doc.fontSize(9).font("Helvetica").fillColor(CORES.cinzaTexto).text(s.frequencia, 360, 100);
  doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.cinzaClaro)
    .text("DOSE PADRÃO", 460, 88, { characterSpacing: 1 });
  doc.fontSize(9).font("Helvetica").fillColor(CORES.cinzaTexto).text(s.dose, 460, 100, { width: W - 500 });

  // Filete navy abaixo do header
  doc.rect(40, 138, W - 80, 1.5).fill(CORES.navyMedio);

  // 2 colunas
  const colL = 40, colR = 310, colW = 255;
  let yL = 156, yR = 156;
  const titleStyle = (y: number, x: number, t: string) => {
    doc.fontSize(13).font("Times-Bold").fillColor(CORES.navyMedio).text(t, x, y);
    doc.moveTo(x, y + 18).lineTo(x + colW, y + 18).lineWidth(0.4).stroke(CORES.dourado);
    return y + 26;
  };
  const para = (y: number, x: number, t: string, w = colW) => {
    doc.fontSize(9).font("Helvetica").fillColor(CORES.cinzaTexto).text(t, x, y, { width: w, lineGap: 2, align: "justify" });
    return y + doc.heightOfString(t, { width: w, lineGap: 2 }) + 10;
  };
  const bullet = (y: number, x: number, t: string, w = colW) => {
    doc.fontSize(9).font("Helvetica").fillColor(CORES.dourado).text("▪", x, y);
    doc.fontSize(9).font("Helvetica").fillColor(CORES.cinzaTexto).text(t, x + 12, y, { width: w - 12, lineGap: 2 });
    return y + doc.heightOfString(t, { width: w - 12, lineGap: 2 }) + 5;
  };

  yL = titleStyle(yL, colL, "Função Principal");
  yL = para(yL, colL, s.funcaoPrincipal);
  yL = titleStyle(yL, colL, "Descrição Clínica");
  yL = para(yL, colL, s.descricaoClinica);
  yL = titleStyle(yL, colL, "Evidência Científica Resumida");
  yL = para(yL, colL, s.evidenciaCientifica);
  yL = titleStyle(yL, colL, "Sistemas Impactados");
  // Faixa lateral dourada com sistemas em itálico
  doc.rect(colL, yL, 2, 40).fill(CORES.dourado);
  doc.fontSize(9).font("Helvetica-Oblique").fillColor(CORES.cinzaTexto)
    .text(s.sistemasImpactados.join(", "), colL + 8, yL + 4, { width: colW - 8, lineGap: 2 });

  yR = titleStyle(yR, colR, "Efeitos Percebidos");
  for (const e of s.efeitosPercebidos) yR = bullet(yR, colR, e);
  yR += 4;
  yR = titleStyle(yR, colR, "Tempo para Efeito");
  doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.cinzaTexto).text("Imediato: ", colR, yR, { continued: true })
    .font("Helvetica").text(s.tempoEfeito.imediato);
  yR += 14;
  doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.cinzaTexto).text("Curto prazo: ", colR, yR, { continued: true })
    .font("Helvetica").text(s.tempoEfeito.curto);
  yR += 14;
  doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.cinzaTexto).text("Médio prazo: ", colR, yR, { continued: true })
    .font("Helvetica").text(s.tempoEfeito.medio);
  yR += 18;
  yR = titleStyle(yR, colR, "Contraindicações e Alertas");
  for (const c of s.contraindicacoes) {
    doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.vermelhoAlerta).text(`${c.titulo}: `, colR, yR, { continued: true })
      .font("Helvetica").fillColor(CORES.cinzaTexto).text(c.texto);
    yR += doc.heightOfString(c.titulo + ": " + c.texto, { width: colW }) + 6;
  }
  yR += 6;
  yR = titleStyle(yR, colR, "Observações Editáveis");
  doc.dash(2, { space: 2 }).rect(colR, yR, colW, 50).lineWidth(0.5).stroke(CORES.cinzaClaro).undash();
  doc.fontSize(8).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro)
    .text("[Espaço para anotações clínicas personalizadas, resposta individual ou ajustes de protocolo]",
      colR + 8, yR + 18, { width: colW - 16, align: "center" });

  // Rodape institucional
  rodapeAssinatura(doc, W, H, "light");
  rodapeIdentificacao(doc, W, H);
}

// ============================================================================
// VARIANTE B — Faixa Lateral Navy (inspirada nas paginas "PROXIMA ETAPA")
// 1/4 esquerda navy com identidade, 3/4 direita conteudo em cards
// ============================================================================
function variantB(doc: PDFKit.PDFDocument, s: DadosSubstancia) {
  const W = 595, H = 842;
  // Fundo branco-creme
  doc.rect(0, 0, W, H).fill("#FBFAF5");
  // Faixa lateral navy 1/4
  const fxW = 140;
  doc.rect(0, 0, fxW, H).fill(CORES.navyProfundo);
  // Filete dourado vertical no limite
  doc.rect(fxW, 0, 2, H).fill(CORES.dourado);

  // Conteudo faixa lateral
  doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.dourado)
    .text("INSTITUTO", 14, 40, { characterSpacing: 3 });
  doc.fontSize(13).font("Times-Bold").fillColor(CORES.offWhite).text("PÁDUA", 14, 50);
  doc.fontSize(6).font("Helvetica-Oblique").fillColor(CORES.creme)
    .text("medicina integrativa", 14, 68);
  doc.rect(14, 84, 40, 0.5).fill(CORES.dourado);

  // Substancia em destaque vertical
  doc.fontSize(10).font("Helvetica-Bold").fillColor(CORES.dourado)
    .text("SUBSTÂNCIA", 14, 110, { characterSpacing: 2 });
  doc.fontSize(15).font("Times-Bold").fillColor(CORES.offWhite)
    .text(s.nome.split(" ")[0], 14, 124, { width: fxW - 28 });
  doc.fontSize(11).font("Helvetica-Oblique").fillColor(CORES.creme)
    .text(s.nome.split(" ").slice(1).join(" "), 14, 144, { width: fxW - 28 });

  // Metadados verticais
  let yF = 200;
  const metaBlock = (label: string, val: string) => {
    doc.fontSize(6).font("Helvetica-Bold").fillColor(CORES.dourado)
      .text(label, 14, yF, { characterSpacing: 1.5 });
    doc.fontSize(8).font("Helvetica").fillColor(CORES.offWhite)
      .text(val, 14, yF + 9, { width: fxW - 28 });
    yF += 9 + doc.heightOfString(val, { width: fxW - 28 }) + 14;
  };
  metaBlock("VIA", s.via);
  metaBlock("FREQUÊNCIA", s.frequencia);
  metaBlock("DOSE PADRÃO", s.dose);
  metaBlock("CATEGORIA", s.categoria);

  // Rodape faixa: data + sessao
  doc.fontSize(6).font("Helvetica").fillColor(CORES.creme)
    .text(PADUA_HEADER.protocolo, 14, H - 60, { width: fxW - 28, lineGap: 2 });

  // Conteudo direita
  const cx = fxW + 24, cw = W - fxW - 48;
  let y = 50;

  // Titulo grande serif
  doc.fontSize(20).font("Times-Bold").fillColor(CORES.navyMedio)
    .text(s.nome.toUpperCase(), cx, y, { width: cw });
  y += 30;
  doc.moveTo(cx, y).lineTo(cx + 60, y).lineWidth(2).stroke(CORES.dourado);
  y += 14;

  // Card "Funcao Principal" — fundo creme
  doc.rect(cx, y, cw, 70).fill(CORES.creme);
  doc.rect(cx, y, 3, 70).fill(CORES.dourado);
  doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.navyMedio)
    .text("FUNÇÃO PRINCIPAL", cx + 10, y + 8, { characterSpacing: 1.5 });
  doc.fontSize(8.5).font("Helvetica").fillColor(CORES.cinzaTexto)
    .text(s.funcaoPrincipal, cx + 10, y + 22, { width: cw - 20, lineGap: 2, align: "justify" });
  y += 80;

  // Card "Descricao Clinica"
  doc.fontSize(11).font("Times-Bold").fillColor(CORES.navyMedio).text("Descrição Clínica", cx, y);
  doc.moveTo(cx, y + 16).lineTo(cx + cw, y + 16).lineWidth(0.3).stroke(CORES.cinzaClaro);
  y += 22;
  doc.fontSize(8.5).font("Helvetica").fillColor(CORES.cinzaTexto)
    .text(s.descricaoClinica, cx, y, { width: cw, lineGap: 2, align: "justify" });
  y += doc.heightOfString(s.descricaoClinica, { width: cw, lineGap: 2 }) + 16;

  // Linha 2 colunas: Efeitos | Tempo
  const c1x = cx, c2x = cx + cw / 2 + 8;
  const ccw = cw / 2 - 8;
  const yEfeitos = y;
  doc.fontSize(11).font("Times-Bold").fillColor(CORES.navyMedio).text("Efeitos Percebidos", c1x, y);
  doc.moveTo(c1x, y + 16).lineTo(c1x + ccw, y + 16).lineWidth(0.3).stroke(CORES.cinzaClaro);
  let yE = y + 22;
  for (const e of s.efeitosPercebidos) {
    doc.fontSize(8).font("Helvetica").fillColor(CORES.dourado).text("●", c1x, yE);
    doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto).text(e, c1x + 10, yE, { width: ccw - 10 });
    yE += doc.heightOfString(e, { width: ccw - 10 }) + 4;
  }
  doc.fontSize(11).font("Times-Bold").fillColor(CORES.navyMedio).text("Tempo para Efeito", c2x, yEfeitos);
  doc.moveTo(c2x, yEfeitos + 16).lineTo(c2x + ccw, yEfeitos + 16).lineWidth(0.3).stroke(CORES.cinzaClaro);
  let yT = yEfeitos + 22;
  const tempos: [string, string][] = [
    ["Imediato", s.tempoEfeito.imediato],
    ["Curto prazo", s.tempoEfeito.curto],
    ["Médio prazo", s.tempoEfeito.medio],
  ];
  for (const [k, v] of tempos) {
    doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.navyMedio).text(k, c2x, yT);
    yT += 12;
    doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto).text(v, c2x, yT, { width: ccw, lineGap: 2 });
    yT += doc.heightOfString(v, { width: ccw, lineGap: 2 }) + 8;
  }
  y = Math.max(yE, yT) + 12;

  // Alerta — caixa amarelo-claro com filete vermelho
  doc.rect(cx, y, cw, 70).fill("#FAF1DE");
  doc.rect(cx, y, 3, 70).fill(CORES.vermelhoAlerta);
  doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.vermelhoAlerta)
    .text("⚠  CONTRAINDICAÇÕES E ALERTAS", cx + 10, y + 8, { characterSpacing: 1 });
  let yC = y + 24;
  for (const c of s.contraindicacoes) {
    doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.cinzaTexto).text(`${c.titulo}: `, cx + 10, yC, { continued: true })
      .font("Helvetica").text(c.texto);
    yC += doc.heightOfString(c.titulo + ": " + c.texto, { width: cw - 20 }) + 3;
  }

  rodapeAssinatura(doc, W, H, "light");
}

// ============================================================================
// VARIANTE C — Densidade Craniotomia (estilo RAS atual, navy denso, alto contraste)
// Header navy com selo gold, cards densos, tags coloridas, grid Compacto
// ============================================================================
function variantC(doc: PDFKit.PDFDocument, s: DadosSubstancia) {
  const W = 595, H = 842;
  doc.rect(0, 0, W, H).fill("#FFFFFF");
  // Header navy faixa cheia
  doc.rect(0, 0, W, 80).fill(CORES.navyProfundo);
  doc.rect(0, 80, W, 4).fill(CORES.dourado);

  // Selo gold lateral esq
  doc.rect(20, 14, 6, 52).fill(CORES.dourado);
  doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.dourado)
    .text("CATÁLOGO TERAPÊUTICO · CÓDIGO PADCON", 36, 18, { characterSpacing: 2 });
  doc.fontSize(18).font("Helvetica-Bold").fillColor(CORES.offWhite)
    .text(s.nome.toUpperCase(), 36, 30, { width: W - 200, characterSpacing: 1 });
  doc.fontSize(8).font("Helvetica-Oblique").fillColor(CORES.creme)
    .text(s.categoria, 36, 56, { width: W - 200 });

  // Tag dourada canto sup direito
  doc.rect(W - 130, 20, 110, 22).fill(CORES.dourado);
  doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
    .text("RXS · NADE", W - 125, 27, { characterSpacing: 2 });
  doc.fontSize(6).font("Helvetica").fillColor(CORES.navyProfundo)
    .text("cod-substancia-026", W - 125, 38, { characterSpacing: 1 });

  // Linha de metadados densa abaixo do header (estilo "ribbon")
  let y = 92;
  const metaR = (x: number, label: string, val: string, w: number) => {
    doc.fontSize(6.5).font("Helvetica-Bold").fillColor(CORES.douradoQueim)
      .text(label, x, y, { characterSpacing: 1.5 });
    doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.cinzaTexto).text(val, x, y + 10, { width: w });
  };
  doc.rect(20, y - 4, W - 40, 36).fill(CORES.cinzaZebra);
  metaR(30, "VIA", s.via, 130);
  metaR(170, "FREQUÊNCIA", s.frequencia, 110);
  metaR(290, "DOSE", s.dose, 160);
  metaR(460, "EVIDÊNCIA", "Nível 2A · IUS", 100);
  y = 142;

  // Section title estilo RAS atual: faixa cheia navy + selo gold + label
  const sectionTitle = (t: string) => {
    doc.rect(20, y, W - 40, 16).fill(CORES.navyProfundo);
    doc.rect(20, y, 4, 16).fill(CORES.dourado);
    doc.fontSize(8.5).font("Helvetica-Bold").fillColor(CORES.offWhite)
      .text(t.toUpperCase(), 32, y + 4, { characterSpacing: 2 });
    y += 22;
  };
  const paragraph = (t: string, w = W - 40) => {
    doc.fontSize(8.5).font("Helvetica").fillColor(CORES.cinzaTexto)
      .text(t, 24, y, { width: w - 8, lineGap: 2.5, align: "justify" });
    y += doc.heightOfString(t, { width: w - 8, lineGap: 2.5 }) + 12;
  };

  sectionTitle("Função Principal & Descrição Clínica");
  paragraph(s.funcaoPrincipal + " " + s.descricaoClinica);

  sectionTitle("Evidência Científica");
  paragraph(s.evidenciaCientifica);

  // Sistemas impactados como TAGS coloridas
  sectionTitle("Sistemas Impactados");
  let xt = 24;
  for (const sis of s.sistemasImpactados) {
    const tw = doc.fontSize(8).font("Helvetica-Bold").widthOfString(sis) + 16;
    doc.rect(xt, y, tw, 16).fill(CORES.verdeSalvia);
    doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.navyProfundo)
      .text(sis, xt + 8, y + 4, { lineBreak: false });
    xt += tw + 6;
    if (xt > W - 80) { xt = 24; y += 20; }
  }
  y += 26;

  // Grid 2 colunas: Efeitos | Tempo+Contraind
  const gy = y;
  const c1 = 20, c2 = W / 2 + 4, gw = W / 2 - 24;
  // Coluna 1: Efeitos
  doc.rect(c1, gy, gw, 16).fill(CORES.navyProfundo);
  doc.rect(c1, gy, 4, 16).fill(CORES.dourado);
  doc.fontSize(8.5).font("Helvetica-Bold").fillColor(CORES.offWhite)
    .text("EFEITOS PERCEBIDOS", c1 + 12, gy + 4, { characterSpacing: 2 });
  let yE = gy + 22;
  for (let i = 0; i < s.efeitosPercebidos.length; i++) {
    const e = s.efeitosPercebidos[i];
    if (i % 2 === 0) doc.rect(c1, yE - 2, gw, 14).fill(CORES.cinzaZebra);
    doc.fontSize(8).font("Helvetica").fillColor(CORES.dourado).text("✓", c1 + 6, yE);
    doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto).text(e, c1 + 18, yE, { width: gw - 22 });
    yE += 14;
  }

  // Coluna 2: Tempo + Contraind
  doc.rect(c2, gy, gw, 16).fill(CORES.navyProfundo);
  doc.rect(c2, gy, 4, 16).fill(CORES.dourado);
  doc.fontSize(8.5).font("Helvetica-Bold").fillColor(CORES.offWhite)
    .text("TEMPO PARA EFEITO", c2 + 12, gy + 4, { characterSpacing: 2 });
  let yT = gy + 22;
  const tempos: [string, string, string][] = [
    ["IMEDIATO", s.tempoEfeito.imediato, CORES.verdeAcento],
    ["CURTO", s.tempoEfeito.curto, CORES.amareloAlerta],
    ["MÉDIO", s.tempoEfeito.medio, CORES.douradoQueim],
  ];
  for (const [k, v, col] of tempos) {
    doc.rect(c2, yT, 50, 14).fill(col);
    doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.offWhite).text(k, c2 + 4, yT + 3, { characterSpacing: 1 });
    doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto).text(v, c2 + 56, yT, { width: gw - 60, lineGap: 2 });
    yT += Math.max(16, doc.heightOfString(v, { width: gw - 60, lineGap: 2 }) + 4);
  }
  yT += 6;
  doc.rect(c2, yT, gw, 16).fill(CORES.vermelhoAlerta);
  doc.rect(c2, yT, 4, 16).fill(CORES.dourado);
  doc.fontSize(8.5).font("Helvetica-Bold").fillColor(CORES.offWhite)
    .text("⚠  CONTRAINDICAÇÕES", c2 + 12, yT + 4, { characterSpacing: 1.5 });
  yT += 22;
  for (const c of s.contraindicacoes) {
    doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.vermelhoAlerta).text(`${c.titulo}: `, c2, yT, { continued: true })
      .font("Helvetica").fillColor(CORES.cinzaTexto).text(c.texto);
    yT += doc.heightOfString(c.titulo + ": " + c.texto, { width: gw }) + 4;
  }
  y = Math.max(yE, yT) + 12;

  // Observacoes editaveis
  doc.rect(20, y, W - 40, 16).fill(CORES.navyProfundo);
  doc.rect(20, y, 4, 16).fill(CORES.dourado);
  doc.fontSize(8.5).font("Helvetica-Bold").fillColor(CORES.offWhite)
    .text("OBSERVAÇÕES CLÍNICAS — CAMPO EDITÁVEL", 32, y + 4, { characterSpacing: 2 });
  y += 22;
  doc.dash(2, { space: 2 }).rect(20, y, W - 40, 50).lineWidth(0.5).stroke(CORES.cinzaClaro).undash();

  rodapeAssinatura(doc, W, H, "light");
}

// ============================================================================
// Rodape institucional reusavel — PAWARDS / PADCON em 2 linhas
// ============================================================================
function rodapeAssinatura(doc: PDFKit.PDFDocument, W: number, H: number, theme: "light" | "dark") {
  const navy = theme === "dark" ? "#1F3A5F" : CORES.navyMedio;
  const sub = theme === "dark" ? CORES.creme : CORES.cinzaClaro;
  const yBase = H - 26;
  // mini filetes
  doc.moveTo(W / 2 - 90, yBase - 4).lineTo(W / 2 + 90, yBase - 4).lineWidth(0.4).stroke(navy);
  doc.fontSize(7).font("Helvetica-Bold").fillColor(navy)
    .text("PAWARDS\u00ae", W / 2 - 80, yBase, { width: 80, align: "right", characterSpacing: 1.5, lineBreak: false });
  doc.fontSize(6).font("Helvetica-Oblique").fillColor(sub)
    .text("Clinical Intelligence System", W / 2 - 5, yBase + 0.5, { width: 200, lineBreak: false });
  doc.fontSize(7).font("Helvetica-Bold").fillColor(navy)
    .text("PADCON\u00ae", W / 2 - 80, yBase + 10, { width: 80, align: "right", characterSpacing: 1.5, lineBreak: false });
  doc.fontSize(6).font("Helvetica-Oblique").fillColor(sub)
    .text("Advanced Systems Architecture", W / 2 - 5, yBase + 10.5, { width: 200, lineBreak: false });
  doc.moveTo(W / 2 - 90, yBase + 21).lineTo(W / 2 + 90, yBase + 21).lineWidth(0.4).stroke(navy);
}

function rodapeIdentificacao(doc: PDFKit.PDFDocument, W: number, H: number) {
  doc.fontSize(6).font("Helvetica").fillColor(CORES.cinzaClaro)
    .text(PADUA_HEADER.protocolo, 40, H - 50, { width: W - 80, align: "center" });
}

// ============================================================================
// GERADOR
// ============================================================================
function gerar() {
  const out = "scripts/.local/samples/mockup-substancia-3-variantes.pdf";
  mkdirSync(dirname(out), { recursive: true });
  const doc = new PDFDocument({ size: "A4", layout: "portrait", margins: { top: 0, bottom: 0, left: 0, right: 0 }, autoFirstPage: false });
  doc.pipe(createWriteStream(out));

  doc.addPage();
  variantA(doc, NAD_PLUS);
  rotuloVariante(doc, "A", "Editorial Clássico (modelo Pádua p-11)");

  doc.addPage();
  variantB(doc, NAD_PLUS);
  rotuloVariante(doc, "B", "Faixa Lateral Navy (estilo Próxima Etapa)");

  doc.addPage();
  variantC(doc, NAD_PLUS);
  rotuloVariante(doc, "C", "Densidade Craniotomia (estilo RAS atual)");

  doc.end();
  console.log("OK ->", out);
}

function rotuloVariante(doc: PDFKit.PDFDocument, letra: string, descricao: string) {
  const W = 595;
  // Selo no canto sup esquerdo "VARIANTE A/B/C — descricao" pra ajudar Caio a referenciar
  doc.rect(0, 0, 26, 26).fill(CORES.dourado);
  doc.fontSize(14).font("Helvetica-Bold").fillColor(CORES.navyProfundo).text(letra, 0, 6, { width: 26, align: "center" });
  doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.cinzaTexto)
    .text(`VARIANTE ${letra} — ${descricao}`, 30, 9, { width: W - 36, characterSpacing: 1 });
}

gerar();
