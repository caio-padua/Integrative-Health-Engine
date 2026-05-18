import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePosologia, formatarPosologiaEstruturada, type PosologiaEstruturada } from "@workspace/posologia";
import { desenharPosologiaBlocos } from "./posologiaBlocos.js";

// Logo oficial Pawards MedCore (gold em fundo navy) — carregada uma vez por
// processo (buffer otimizado ~150KB) e ABERTA UMA VEZ por PDFDocument via
// doc.openImage(). Isso garante que a logo apareca na capa + nos 11 cadernos
// referenciando o mesmo objeto interno do PDF (em vez de embedar 12 copias do
// PNG, o que inflaria o arquivo de ~50KB para >15MB).
let _LOGO_PAWARDS_BUF: Buffer | null = null;
function loadLogoBuffer(): Buffer | null {
  if (_LOGO_PAWARDS_BUF) return _LOGO_PAWARDS_BUF;
  try {
    const p = fileURLToPath(new URL("./assets/logo-pawards-optim.png", import.meta.url));
    _LOGO_PAWARDS_BUF = readFileSync(p);
    return _LOGO_PAWARDS_BUF;
  } catch {
    return null;
  }
}
const LOGO_REF = new WeakMap<PDFKit.PDFDocument, unknown>();
function getLogoRef(doc: PDFKit.PDFDocument): unknown | null {
  const cached = LOGO_REF.get(doc);
  if (cached) return cached;
  const buf = loadLogoBuffer();
  if (!buf) return null;
  try {
    // openImage() registra o image uma vez no PDF e retorna handle reutilizavel
    const docAny = doc as unknown as { openImage(b: Buffer): unknown };
    const ref = docAny.openImage(buf);
    LOGO_REF.set(doc, ref);
    return ref;
  } catch {
    return buf; // fallback: passa o buffer direto (cada chamada re-embeda)
  }
}

/**
 * Devolve a frase canônica padronizada da posologia. Preferência por ordem:
 *   1) `estrutura` já persistida (coluna `posologia_estruturada` jsonb) com
 *      `interpretado=true` — fonte de verdade após o backfill da Task #40.
 *   2) `parsePosologia(texto)` em runtime quando o texto casa alguma regra.
 *   3) Texto bruto (fallback) quando nada interpreta.
 * Pure-function chamada no momento do render — espelha o helper de rasxMotorPdf.ts.
 */
function posologiaCanonica(
  texto: string | null | undefined,
  estrutura?: PosologiaEstruturada | null,
): string {
  if (estrutura && estrutura.interpretado) return formatarPosologiaEstruturada(estrutura);
  if (!texto) return "—";
  const parsed = parsePosologia(texto);
  return parsed.interpretado ? formatarPosologiaEstruturada(parsed) : texto;
}

// Paleta Craniotomia V4 — alto contraste, denso, neon-clinico.
// Mantemos os nomes antigos (azulPetroleo etc) pra nao quebrar as 11
// secoes downstream, mas re-tonalizamos pra estetica premium.
const CORES = {
  azulPetroleo: "#0F2940",       // navy profundo (era #1B4F6C)
  azulPetroleoClaro: "#1B4F73",  // navy medio
  offWhite: "#F2EEDF",            // creme institucional
  douradoQueimado: "#C8951A",    // dourado mais saturado
  verdeSalvia: "#3E8B5B",        // verde medico denso
  branco: "#FFFFFF",
  cinzaTexto: "#1A1A1A",         // praticamente preto pra densidade
  cinzaClaro: "#555555",
  cinzaZebra: "#EDE9DC",
  vermelho: "#B83227",
  amarelo: "#C28920",
  verde: "#1F7A3D",
  ciano: "#0E7C8C",
  magenta: "#7A2B5C",
} as const;
// Per-documento context (paginacao, token, codigo semantico). Antes era module-level
// (race condition entre requests concorrentes ao mesmo gerador RASX); agora chaveado
// por PDFDocument via WeakMap pra preservar isolamento sem mudar nenhuma assinatura
// das funcoes draw* downstream.
interface RasxRenderCtx { atual: number; total: number; codigoSemantico: string; tokenHash: string }
const RENDER_CTX = new WeakMap<PDFKit.PDFDocument, RasxRenderCtx>();
function getCtx(doc: PDFKit.PDFDocument): RasxRenderCtx {
  let c = RENDER_CTX.get(doc);
  if (!c) { c = { atual: 0, total: 0, codigoSemantico: "", tokenHash: "" }; RENDER_CTX.set(doc, c); }
  return c;
}

interface RasxPdfData {
  paciente: { nome: string; cpf?: string; dataNascimento?: string; telefone?: string; email?: string; sexo?: string; enderecoCompleto?: string; plano?: string };
  medico: string;
  unidade: string;
  dataBase: string;
  snapshotInicial: any;
  snapshotAtual: any;
  patologias: { diagnosticadas: any[]; potenciais: any[] };
  orgaos: any[];
  medicamentos: any[];
  eventosMedicacao: any[];
  curvas: { doenca: any[]; saude: any[] };
  proximasEtapas: any[];
  // Craniotomia V4 — extensoes opcionais p/ KPI bar + matriz + token rodape
  codigoSemantico?: string;
  tokenHash?: string;
  tituloRelatorio?: string;       // ex: "RAS APRESENTACAO INICIAL" / "RAS EVOLUCAO SEMANA 3"
  subtituloRelatorio?: string;    // ex: "Snapshot D0" / "Comparativo D0 vs D21"
  kpis?: KpiPill[];               // exibidos na capa HEST logo abaixo do bloco paciente
}

function calcIdade(dataNasc: string): number {
  const hoje = new Date();
  const nasc = new Date(dataNasc);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

function corSemaforo(s: string) {
  if (s === "verde") return CORES.verde;
  if (s === "amarelo") return CORES.amarelo;
  return CORES.vermelho;
}

// ============================================================================
// CRANIOTOMIA V4 — funcoes base re-densificadas (faixa unica, KPI pills,
// matriz, selo lateral, zebra reforcada). Substituem as versoes "respiradas"
// da V481 mantendo as mesmas assinaturas pra nao quebrar as 11 secoes.
// ============================================================================

function drawHeader(doc: PDFKit.PDFDocument, titulo: string, codigo: string, isLandscape: boolean) {
  const ctx = getCtx(doc);
  const width = isLandscape ? 842 : 595;
  // Faixa premium 64px navy + filete-ouro inferior (toque classico)
  doc.rect(0, 0, width, 64).fill(CORES.azulPetroleo);
  doc.rect(0, 0, 5, 64).fill(CORES.douradoQueimado);
  // Bordas gold finas (toque editorial-classico)
  doc.rect(0, 60, width, 1).fill(CORES.douradoQueimado);
  doc.rect(0, 63, width, 1).fill(CORES.douradoQueimado);

  // LOGO oficial Pawards MedCore (gold em navy) — canto direito do header
  const logo = getLogoRef(doc);
  const logoH = 48;
  const logoW = 48;
  const logoX = width - logoW - 14;
  const logoY = 8;
  if (logo) {
    try { doc.image(logo, logoX, logoY, { fit: [logoW, logoH] }); }
    catch { /* fallback silencioso pro texto abaixo */ }
  }

  // Linha 1: titulo humano (13pt bold off-white)
  doc.fontSize(13).font("Helvetica-Bold").fillColor(CORES.offWhite)
    .text(titulo.toUpperCase(), 14, 8, { width: width - logoW - 40 });
  // Linha 2: codigo tecnico + caderno X/Y inline (gold 7pt)
  ctx.atual += 1;
  const paginacao = ctx.total > 0
    ? `CADERNO ${ctx.atual.toString().padStart(2, "0")}/${ctx.total.toString().padStart(2, "0")}`
    : `CADERNO ${ctx.atual.toString().padStart(2, "0")}`;
  doc.fontSize(7.5).font("Helvetica-Bold").fillColor(CORES.douradoQueimado)
    .text(`${codigo}  ·  ${paginacao}`, 14, 28, { width: width - logoW - 40 });
  // Linha 3: tagline institucional italica (off-white 6.5pt)
  doc.fontSize(6.5).font("Helvetica-Oblique").fillColor(CORES.offWhite)
    .text("Pawards MedCore  ·  Sistema Clinico Inteligente  ·  RASX-MATRIZ V6  ·  PADCOM v15.2", 14, 40, { width: width - logoW - 40 });
  // Linha 4: token + codigo semantico (mono cinzento 5.5pt) — auditavel
  doc.fontSize(5.5).font("Helvetica").fillColor(CORES.cinzaClaro)
    .text(`token ${ctx.tokenHash || "—"}   ·   semantico ${ctx.codigoSemantico || "—"}   ·   documento clinico assinado`, 14, 51, { width: width - logoW - 40 });
}

// ----------------------------------------------------------------------------
// CAPA PREMIUM — pagina de rosto classica/sofisticada (logo gigante centralizada,
// titulo gold, separadores filete-ouro, bloco paciente, KPIs preview).
// ----------------------------------------------------------------------------
function drawCapa(doc: PDFKit.PDFDocument, data: RasxPdfData) {
  const width = 595;
  const height = 842;
  // Fundo navy cheio (premium)
  doc.rect(0, 0, width, height).fill(CORES.azulPetroleo);
  // Moldura interna gold (filete fino editorial)
  doc.rect(28, 28, width - 56, height - 56).lineWidth(0.8).stroke(CORES.douradoQueimado);
  doc.rect(34, 34, width - 68, height - 68).lineWidth(0.3).stroke(CORES.douradoQueimado);

  // Logo gigante centralizada (320x320 mantendo proporcao)
  const logo = getLogoRef(doc);
  const logoSize = 280;
  if (logo) {
    try {
      doc.image(logo, (width - logoSize) / 2, 90, { fit: [logoSize, logoSize] });
    } catch { /* ignore */ }
  }

  // Linha divisoria gold sob a logo
  const dividerY = 400;
  doc.moveTo(120, dividerY).lineTo(width - 120, dividerY).lineWidth(0.5).stroke(CORES.douradoQueimado);
  doc.moveTo(width / 2 - 6, dividerY - 4).lineTo(width / 2, dividerY).lineTo(width / 2 + 6, dividerY - 4)
    .lineWidth(0.5).stroke(CORES.douradoQueimado);

  // Titulo principal (gold, serif-like) — usa Helvetica-Bold (no PDFkit padrao)
  const titulo = (data.tituloRelatorio || "Relatorio Analitico de Saude").toUpperCase();
  doc.fontSize(22).font("Helvetica-Bold").fillColor(CORES.douradoQueimado)
    .text(titulo, 40, dividerY + 18, { width: width - 80, align: "center" });
  // Subtitulo italico off-white
  if (data.subtituloRelatorio) {
    doc.fontSize(10).font("Helvetica-Oblique").fillColor(CORES.offWhite)
      .text(data.subtituloRelatorio, 40, dividerY + 50, { width: width - 80, align: "center" });
  }
  // Tagline da marca
  doc.fontSize(7.5).font("Helvetica").fillColor(CORES.cinzaClaro)
    .text("PAWARDS MEDCORE  ·  SISTEMA CLINICO INTELIGENTE", 40, dividerY + 70, { width: width - 80, align: "center", characterSpacing: 1.5 });

  // ===== Bloco do paciente (caixa creme com selo gold) =====
  const blockY = dividerY + 110;
  const blockH = 110;
  doc.rect(60, blockY, width - 120, blockH).fill(CORES.cinzaZebra);
  doc.rect(60, blockY, 4, blockH).fill(CORES.douradoQueimado);
  doc.rect(60, blockY, width - 120, blockH).lineWidth(0.3).stroke(CORES.douradoQueimado);
  const p = data.paciente;
  const idade = p.dataNascimento ? `${calcIdade(p.dataNascimento)} anos` : "—";
  const dataNasc = p.dataNascimento ? new Date(p.dataNascimento).toLocaleDateString("pt-BR") : "—";
  // Label "PACIENTE"
  doc.fontSize(6.5).font("Helvetica-Bold").fillColor(CORES.douradoQueimado)
    .text("PACIENTE", 75, blockY + 8, { width: 200, characterSpacing: 2 });
  // Nome grande navy
  doc.fontSize(14).font("Helvetica-Bold").fillColor(CORES.azulPetroleo)
    .text(p.nome.toUpperCase(), 75, blockY + 20, { width: width - 150 });
  // Dados em grid 2 colunas
  const labelStyle = (l: string, x: number, y: number) => {
    doc.fontSize(5.8).font("Helvetica-Bold").fillColor(CORES.cinzaClaro)
      .text(l.toUpperCase(), x, y, { characterSpacing: 1.2 });
  };
  const valueStyle = (v: string, x: number, y: number, w: number) => {
    doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto).text(v, x, y + 7, { width: w });
  };
  labelStyle("CPF",            75, blockY + 46);
  valueStyle(p.cpf || "—",     75, blockY + 46, 140);
  labelStyle("Nascimento",     220, blockY + 46);
  valueStyle(`${dataNasc} (${idade})`, 220, blockY + 46, 140);
  labelStyle("Sexo",           380, blockY + 46);
  valueStyle(p.sexo ? p.sexo.charAt(0).toUpperCase() + p.sexo.slice(1).toLowerCase() : "—", 380, blockY + 46, 100);
  labelStyle("Plano",          75, blockY + 72);
  valueStyle(p.plano || "Particular", 75, blockY + 72, 140);
  labelStyle("WhatsApp",       220, blockY + 72);
  valueStyle(p.telefone || "—", 220, blockY + 72, 140);
  labelStyle("E-mail",         380, blockY + 72);
  valueStyle(p.email || "—",   380, blockY + 72, 155);
  labelStyle("Endereco",       75, blockY + 93);
  doc.fontSize(7).font("Helvetica-Oblique").fillColor(CORES.cinzaTexto)
    .text(p.enderecoCompleto || "—", 130, blockY + 95, { width: width - 200 });

  // ===== Bloco emissor (medico, unidade, data) =====
  const emitY = blockY + blockH + 14;
  doc.fontSize(6.5).font("Helvetica-Bold").fillColor(CORES.douradoQueimado)
    .text("EMITIDO POR", 60, emitY, { width: width - 120, align: "center", characterSpacing: 2 });
  doc.fontSize(10).font("Helvetica-Bold").fillColor(CORES.offWhite)
    .text(data.medico, 60, emitY + 10, { width: width - 120, align: "center" });
  doc.fontSize(8).font("Helvetica").fillColor(CORES.offWhite)
    .text(`${data.unidade}   ·   Data-base ${data.dataBase}`, 60, emitY + 25, { width: width - 120, align: "center" });

  // ===== Rodape capa: assinatura institucional + selo confidencial =====
  const ctx = getCtx(doc);
  // Faixa gold inferior fina
  doc.rect(28, height - 60, width - 56, 1).fill(CORES.douradoQueimado);
  doc.fontSize(6).font("Helvetica-Bold").fillColor(CORES.douradoQueimado)
    .text("DOCUMENTO CLINICO INSTITUCIONAL  ·  USO RESTRITO  ·  PROTEGIDO POR LGPD", 28, height - 54, { width: width - 56, align: "center", characterSpacing: 2 });
  doc.fontSize(6).font("Helvetica").fillColor(CORES.cinzaClaro)
    .text(`token ${ctx.tokenHash || "—"}   ·   semantico ${ctx.codigoSemantico || "—"}   ·   ${ctx.total || 11} cadernos`, 28, height - 44, { width: width - 56, align: "center" });
  doc.fontSize(5.5).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro)
    .text("Developed by Pawards MedCore  ·  Sistema Clinico Inteligente", 28, height - 35, { width: width - 56, align: "center" });
}

function drawPacienteBlock(doc: PDFKit.PDFDocument, data: RasxPdfData, y: number, width: number): number {
  const p = data.paciente;
  const idade = p.dataNascimento ? `${calcIdade(p.dataNascimento)} anos` : "—";
  const dataNasc = p.dataNascimento ? new Date(p.dataNascimento).toLocaleDateString("pt-BR") : "—";
  const sexo = p.sexo ? p.sexo.charAt(0).toUpperCase() + p.sexo.slice(1).toLowerCase() : "—";
  const cpf = p.cpf || "—";
  const tel = p.telefone || "—";
  const email = p.email || "—";
  const endereco = p.enderecoCompleto || "—";
  const plano = p.plano || "Particular";
  const blockH = 48; // compactado de 78 → 48 (Craniotomia density)
  // Caixa creme + selo lateral cor (Endocrino/integrativa)
  doc.rect(40, y, width - 80, blockH).fill(CORES.cinzaZebra);
  doc.rect(40, y, 4, blockH).fill(CORES.douradoQueimado);
  // Linha 1: NOME (10pt bold) + tags direita (PLANO + DATA BASE)
  doc.fontSize(10).font("Helvetica-Bold").fillColor(CORES.azulPetroleo)
    .text(p.nome.toUpperCase(), 50, y + 5, { width: width - 240 });
  // Selo plano (caixa direita)
  const tagW = 90;
  doc.rect(width - 40 - tagW, y + 4, tagW, 10).fill(CORES.azulPetroleo);
  doc.fontSize(6.5).font("Helvetica-Bold").fillColor(CORES.offWhite)
    .text(`PLANO ${plano.toUpperCase()}`, width - 40 - tagW, y + 7, { width: tagW, align: "center" });
  // Linha 2: micro-tabela inline (CPF | Nasc | Idade | Sexo | Tel | Email)
  doc.fontSize(7).font("Helvetica").fillColor(CORES.cinzaTexto)
    .text(`CPF ${cpf}  ·  Nasc ${dataNasc} (${idade})  ·  Sexo ${sexo}  ·  Tel ${tel}  ·  ${email}`, 50, y + 19, { width: width - 100 });
  // Linha 3: endereco (italico cinza)
  doc.fontSize(6.5).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro)
    .text(endereco, 50, y + 30, { width: width - 100, ellipsis: true, height: 9 });
  // Linha 4: data base + medico + unidade (dourado pequeno)
  doc.fontSize(6.5).font("Helvetica-Bold").fillColor(CORES.douradoQueimado)
    .text(`DATA-BASE ${data.dataBase}  ·  ${data.medico}  ·  ${data.unidade}`, 50, y + 39, { width: width - 100 });
  return y + blockH + 6;
}

function drawTextoInstitucional(doc: PDFKit.PDFDocument, y: number): number {
  // Caixa creme densa + selo lateral verde-salvia
  const texto = "Nao somos apenas o que comemos; somos o que absorvemos, metabolizamos e utilizamos. Este relatorio acompanha nao so doencas e medicamentos, mas a recuperacao do terreno biologico, dos orgaos, do sono, da energia, da cognicao e da capacidade funcional.";
  const h = 36;
  doc.rect(40, y, 515, h).fill(CORES.cinzaZebra);
  doc.rect(40, y, 3, h).fill(CORES.verdeSalvia);
  doc.fontSize(6.8).font("Helvetica-Oblique").fillColor(CORES.cinzaTexto)
    .text(texto, 49, y + 5, { width: 500, lineGap: 1.5 });
  return y + h + 6;
}

function drawTableHeader(doc: PDFKit.PDFDocument, cols: { label: string; x: number; w: number }[], y: number) {
  const lastCol = cols[cols.length - 1];
  const totalW = lastCol.x + lastCol.w - cols[0].x;
  // Faixa header densa 13px (vs 18px) + sub-linha gold
  doc.rect(cols[0].x, y, totalW, 13).fill(CORES.azulPetroleo);
  doc.rect(cols[0].x, y + 12, totalW, 1).fill(CORES.douradoQueimado);
  for (const c of cols) {
    doc.fontSize(6.2).font("Helvetica-Bold").fillColor(CORES.offWhite)
      .text(c.label, c.x + 3, y + 3, { width: c.w - 6 });
  }
  return y + 14;
}

function drawTableRow(doc: PDFKit.PDFDocument, cols: { x: number; w: number }[], values: string[], y: number, alt: boolean, seloCor?: string) {
  const lastCol = cols[cols.length - 1];
  const totalW = lastCol.x + lastCol.w - cols[0].x;
  const rowH = 13;
  // Zebra alternada cinzaZebra creme
  if (alt) doc.rect(cols[0].x, y, totalW, rowH).fill(CORES.cinzaZebra);
  // Selo lateral cor 2px (semaforo / categoria)
  if (seloCor) doc.rect(cols[0].x, y, 2, rowH).fill(seloCor);
  for (let i = 0; i < cols.length; i++) {
    doc.fontSize(6.8).font("Helvetica").fillColor(CORES.cinzaTexto)
      .text(values[i] || "—", cols[i].x + (i === 0 && seloCor ? 5 : 3), y + 3, { width: cols[i].w - 6, ellipsis: true, height: 8 });
  }
  return y + rowH;
}

// ----- NOVAS: KPI bar horizontal + matriz dos 11 cadernos --------------------

interface KpiPill { label: string; valor: string; unidade?: string; cor: string; delta?: string }

function drawKpiBar(doc: PDFKit.PDFDocument, kpis: KpiPill[], y: number, totalW: number): number {
  const xStart = 40;
  const gap = 4;
  const pillW = (totalW - gap * (kpis.length - 1)) / kpis.length;
  const pillH = 36;
  kpis.forEach((k, i) => {
    const x = xStart + i * (pillW + gap);
    // fundo creme + selo lateral cor 4px (KPI)
    doc.rect(x, y, pillW, pillH).fill(CORES.cinzaZebra);
    doc.rect(x, y, 4, pillH).fill(k.cor);
    // label up (uppercase 5.5pt)
    doc.fontSize(5.5).font("Helvetica-Bold").fillColor(CORES.cinzaClaro)
      .text(k.label.toUpperCase(), x + 7, y + 4, { width: pillW - 10 });
    // valor grande (12pt bold navy)
    doc.fontSize(13).font("Helvetica-Bold").fillColor(CORES.azulPetroleo)
      .text(k.valor, x + 7, y + 13, { width: pillW - 10 });
    // unidade pequena (lado direito linha valor)
    if (k.unidade) {
      doc.fontSize(6).font("Helvetica").fillColor(CORES.cinzaClaro)
        .text(k.unidade, x + 7, y + 27, { width: pillW - 10 });
    }
    // delta (subir/cair) — quando passado
    if (k.delta) {
      doc.fontSize(5.8).font("Helvetica-Bold").fillColor(k.cor)
        .text(k.delta, x + 7, y + 27 + (k.unidade ? 8 : 0), { width: pillW - 10, align: "right" });
    }
  });
  return y + pillH + 6;
}

function drawMatrizCadernos(
  doc: PDFKit.PDFDocument,
  cadernos: Array<{ codigo: string; titulo: string; preenchido: boolean }>,
  y: number,
  totalW: number,
): number {
  const xStart = 40;
  const cellH = 14;
  // Header da matriz
  doc.rect(xStart, y, totalW, 12).fill(CORES.azulPetroleo);
  doc.fontSize(6.5).font("Helvetica-Bold").fillColor(CORES.offWhite)
    .text("MATRIZ DE CADERNOS — RASX-MATRIZ V6 (11 cadernos × estado de preenchimento)", xStart + 4, y + 3);
  let cur = y + 13;
  cadernos.forEach((c, i) => {
    const alt = i % 2 === 0;
    if (alt) doc.rect(xStart, cur, totalW, cellH).fill(CORES.cinzaZebra);
    const seloCor = c.preenchido ? CORES.verde : CORES.amarelo;
    doc.rect(xStart, cur, 3, cellH).fill(seloCor);
    // codigo (mono-narrow)
    doc.fontSize(6.5).font("Helvetica-Bold").fillColor(CORES.azulPetroleo)
      .text(c.codigo, xStart + 7, cur + 3, { width: 70 });
    // titulo humano
    doc.fontSize(6.8).font("Helvetica").fillColor(CORES.cinzaTexto)
      .text(c.titulo, xStart + 80, cur + 3, { width: totalW - 200 });
    // status pill direita
    const stW = 90;
    const stTxt = c.preenchido ? "POPULADO" : "RESERVADO";
    doc.rect(xStart + totalW - stW - 4, cur + 2, stW, 10).fill(c.preenchido ? CORES.verde : CORES.cinzaClaro);
    doc.fontSize(5.5).font("Helvetica-Bold").fillColor(CORES.branco)
      .text(stTxt, xStart + totalW - stW - 4, cur + 5, { width: stW, align: "center" });
    cur += cellH;
  });
  return cur + 6;
}

function addPageRetrato(doc: PDFKit.PDFDocument) {
  doc.addPage({ size: "A4", layout: "portrait", margins: { top: 40, bottom: 40, left: 40, right: 40 } });
}

function addPagePaisagem(doc: PDFKit.PDFDocument) {
  doc.addPage({ size: "A4", layout: "landscape", margins: { top: 40, bottom: 40, left: 40, right: 40 } });
}

function drawFooter(doc: PDFKit.PDFDocument, isLandscape: boolean) {
  const ctx = getCtx(doc);
  const width = isLandscape ? 842 : 595;
  const height = isLandscape ? 595 : 842;
  const footerY = height - 28;
  // Faixa navy slim 22px com selo gold
  doc.rect(0, footerY, width, 22).fill(CORES.azulPetroleo);
  doc.rect(0, footerY, width, 1).fill(CORES.douradoQueimado);
  // Esquerda: token + codigo semantico
  doc.fontSize(5.8).font("Helvetica").fillColor(CORES.offWhite)
    .text(`token ${ctx.tokenHash || "—"}  ·  ${ctx.codigoSemantico || ""}`, 14, footerY + 4, { width: 280 });
  // Centro: legenda semaforos
  doc.fontSize(5.5).font("Helvetica").fillColor(CORES.offWhite)
    .text("Legenda  ▮ verde=meta atingida   ▮ amarelo=em curso   ▮ vermelho=critico", 14, footerY + 13, { width: width - 200 });
  // Direita: PAWARDS + paginacao
  doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.douradoQueimado)
    .text(`PAWARDS · MedCore  ·  Caderno ${ctx.atual.toString().padStart(2, "0")}/${(ctx.total || ctx.atual).toString().padStart(2, "0")}`, width - 240, footerY + 7, { width: 230, align: "right" });
}

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string, y: number, metricaDireita?: string): number {
  const width = doc.page.width - 80;
  // Faixa cheia 14px navy + selo gold 4px + label off-white
  doc.rect(40, y, width, 14).fill(CORES.azulPetroleo);
  doc.rect(40, y, 4, 14).fill(CORES.douradoQueimado);
  doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.offWhite)
    .text(title.toUpperCase(), 50, y + 3, { width: width - (metricaDireita ? 200 : 10) });
  if (metricaDireita) {
    doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.douradoQueimado)
      .text(metricaDireita, 40 + width - 200, y + 3, { width: 195, align: "right" });
  }
  return y + 18;
}

function drawCurvaBar(doc: PDFKit.PDFDocument, label: string, valor: number, cor: string, x: number, y: number, maxW: number): number {
  // Pill curva densa 14px com selo lateral cor + barra fundo creme
  const labelW = 160;
  doc.rect(x, y, labelW + maxW + 50, 14).fill(CORES.cinzaZebra);
  doc.rect(x, y, 3, 14).fill(cor);
  doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.cinzaTexto)
    .text(label, x + 7, y + 3.5, { width: labelW - 10 });
  // Barra
  const barW = Math.max(2, (valor / 100) * maxW);
  doc.rect(x + labelW, y + 3, maxW, 8).fill(CORES.branco).strokeColor(CORES.cinzaClaro).lineWidth(0.3).stroke();
  doc.rect(x + labelW, y + 3, barW, 8).fill(cor);
  doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.azulPetroleo)
    .text(`${valor}%`, x + labelW + maxW + 5, y + 3.5, { width: 40 });
  return y + 16;
}

export type RasCategoria = "COMPLETO" | "CLINICO" | "EVOLUTIVO" | "ESTADO_SAUDE";

export const RAS_CATEGORIAS = {
  CLINICO: {
    label: "RAS Clinico",
    descricao: "Cadernos clinicos: estado de saude, patologias, medicamentos, formulas, orgaos, curvas",
    cadernos: ["RACL HEST", "RACL HPOT", "RACL HORG", "RACL HMED", "RACL HFOR", "RACL HCUR", "RACL HATU"],
  },
  EVOLUTIVO: {
    label: "RAS Evolutivo",
    descricao: "Evolucao clinica: timeline medicacao, transicao terapeutica, evolucao comparativa, proximas etapas",
    cadernos: ["RACL HLIN", "RACL HTRN", "RACL HEVO", "RACL HPLA"],
  },
  ESTADO_SAUDE: {
    label: "RAS Estado de Saude",
    descricao: "Resumo atual: estado atual + curvas + proximas etapas",
    cadernos: ["RACL HATU", "RACL HCUR", "RACL HPLA"],
  },
  COMPLETO: {
    label: "RAS Completo",
    descricao: "Todos os cadernos clinicos e evolutivos",
    cadernos: ["RACL HEST", "RACL HPOT", "RACL HORG", "RACL HMED", "RACL HFOR", "RACL HLIN", "RACL HTRN", "RACL HEVO", "RACL HCUR", "RACL HATU", "RACL HPLA"],
  },
};

export function gerarRasxPdf(data: RasxPdfData, categoria: RasCategoria = "COMPLETO"): PassThrough {
  const stream = new PassThrough();
  const doc = new PDFDocument({ size: "A4", layout: "portrait", margins: { top: 40, bottom: 40, left: 40, right: 40 }, autoFirstPage: false });
  doc.pipe(stream);

  const cadernos = RAS_CATEGORIAS[categoria].cadernos;
  const include = (cod: string) => cadernos.includes(cod);

  // Reset + populate contexto Craniotomia (paginacao, token, semantico) per-doc
  const ctx = getCtx(doc);
  ctx.atual = 0;
  ctx.total = cadernos.length;
  ctx.codigoSemantico = data.codigoSemantico || "";
  ctx.tokenHash = data.tokenHash || "";

  let y = 0;

  // ========== CAPA PREMIUM (pagina de rosto classica) ==========
  doc.addPage({ size: "A4", layout: "portrait", margins: { top: 0, bottom: 0, left: 0, right: 0 } });
  drawCapa(doc, data);

  // ========== RACL HEST — Estado Inicial (RETRATO) ==========
  if (include("RACL HEST")) {
  addPageRetrato(doc);
  drawHeader(doc, data.tituloRelatorio || "Estado Inicial de Saude", "RACL HEST", false);
  y = 78;
  y = drawPacienteBlock(doc, data, y, 595);
  // Craniotomia: subtitulo (cenario/momento clinico)
  if (data.subtituloRelatorio) {
    doc.fontSize(7.5).font("Helvetica-Bold").fillColor(CORES.ciano)
      .text(data.subtituloRelatorio.toUpperCase(), 40, y, { width: 515 });
    y += 12;
  }
  // KPI BAR Craniotomia (4-5 metricas chave do snapshot)
  if (data.kpis && data.kpis.length > 0) {
    y = drawKpiBar(doc, data.kpis, y, 515);
  }
  // MATRIZ de cadernos (mostra todos os 11 e quais foram populados)
  const matrizCadernos = (
    [
      ["RACL HEST", "Estado Inicial de Saude"],
      ["RACL HPOT", "Patologias Potenciais"],
      ["RACL HORG", "Orgaos e Sistemas Afetados"],
      ["RACL HMED", "Medicamentos em Uso"],
      ["RACL HFOR", "Formulas Magistrais"],
      ["RACL HLIN", "Linha Temporal de Medicacao"],
      ["RACL HTRN", "Transicao Terapeutica"],
      ["RACL HEVO", "Evolucao Clinica Comparativa"],
      ["RACL HCUR", "Curvas Declinante e Ascendente"],
      ["RACL HATU", "Estado Atual de Saude"],
      ["RACL HPLA", "Proxima Etapa"],
    ] as Array<[string, string]>
  ).map(([codigo, titulo]) => {
    let preenchido = false;
    if (codigo === "RACL HEST") preenchido = data.patologias.diagnosticadas.length > 0 || data.medicamentos.length > 0;
    else if (codigo === "RACL HPOT") preenchido = data.patologias.potenciais.length > 0;
    else if (codigo === "RACL HORG") preenchido = data.orgaos.length > 0;
    else if (codigo === "RACL HMED") preenchido = data.medicamentos.length > 0;
    else if (codigo === "RACL HFOR") preenchido = data.medicamentos.some((m: any) => m.tipoMed === "formula");
    else if (codigo === "RACL HLIN") preenchido = data.eventosMedicacao.length > 0;
    else if (codigo === "RACL HTRN") preenchido = data.medicamentos.some((m: any) => m.substituicaoNatural);
    else if (codigo === "RACL HEVO") preenchido = data.patologias.diagnosticadas.length > 0;
    else if (codigo === "RACL HCUR") preenchido = data.curvas.doenca.length + data.curvas.saude.length > 0;
    else if (codigo === "RACL HATU") preenchido = !!(data.snapshotAtual || data.snapshotInicial);
    else if (codigo === "RACL HPLA") preenchido = data.proximasEtapas.length > 0;
    return { codigo, titulo, preenchido: preenchido && include(codigo) };
  });
  y = drawMatrizCadernos(doc, matrizCadernos, y, 515);
  y = drawTextoInstitucional(doc, y);

  y = drawSectionTitle(doc, "Patologias Diagnosticadas", y, `${data.patologias.diagnosticadas.length} registradas`);
  if (data.patologias.diagnosticadas.length > 0) {
    const cols = [
      { label: "PATOLOGIA", x: 40, w: 140 },
      { label: "ORGAO/SISTEMA", x: 180, w: 100 },
      { label: "INTENSIDADE", x: 280, w: 70 },
      { label: "SEMAFORO", x: 350, w: 60 },
      { label: "LEITURA CLINICA", x: 410, w: 145 },
    ];
    y = drawTableHeader(doc, cols, y);
    data.patologias.diagnosticadas.forEach((p: any, i: number) => {
      y = drawTableRow(doc, cols, [p.nome, p.orgaoSistema || "—", p.intensidadeInicial || p.intensidadeAtual || "—", p.statusSemaforo || "—", p.leituraClinica || "—"], y, i % 2 === 0);
    });
  } else {
    doc.fontSize(8).fillColor(CORES.cinzaClaro).text("Nenhuma patologia registrada no inicio.", 50, y);
    y += 16;
  }
  y += 12;

  y = drawSectionTitle(doc, "Medicamentos em Uso no Inicio", y);
  if (data.medicamentos.length > 0) {
    // Task #242 — coluna "POSO. ORIGEM" mostra se a posologia foi validada
    // pelo medico (manual) ou interpretada automaticamente (parser).
    const medCols = [
      { label: "MEDICAMENTO", x: 40, w: 130 },
      { label: "POSOLOGIA", x: 170, w: 95 },
      { label: "POSO. ORIGEM", x: 265, w: 70 },
      { label: "MOTIVO USO", x: 335, w: 100 },
      { label: "STATUS", x: 435, w: 55 },
      { label: "TEMPO USO", x: 490, w: 65 },
    ];
    y = drawTableHeader(doc, medCols, y);
    data.medicamentos.forEach((m: any, i: number) => {
      const inline = m.medicamentoDoseInline || `${m.nome}${m.dose ? " " + m.dose : ""}`;
      const origemLabel = !m.posologia
        ? "—"
        : m.origemPosologia === "manual"
          ? "validado medico"
          : "auto (parser)";
      y = drawTableRow(doc, medCols, [inline, posologiaCanonica(m.posologia, m.posologiaEstruturada), origemLabel, m.motivoUso || "—", m.statusAtual || "em_uso", m.tempoUso || "—"], y, i % 2 === 0);
    });
  }
  drawFooter(doc, false);
  }

  // ========== RACL HPOT — Patologias Potenciais (RETRATO) ==========
  if (include("RACL HPOT") && data.patologias.potenciais.length > 0) {
    addPageRetrato(doc);
    drawHeader(doc, "Patologias Potenciais", "RACL HPOT", false);
    y = 80;
    y = drawPacienteBlock(doc, data, y, 595);
    y = drawSectionTitle(doc, "Mapa de Progressao Provavel", y);
    const potCols = [
      { label: "PATOLOGIA", x: 40, w: 150 },
      { label: "ORGAO", x: 190, w: 100 },
      { label: "INTENSIDADE", x: 290, w: 80 },
      { label: "SEMAFORO", x: 370, w: 60 },
      { label: "LEITURA CLINICA", x: 430, w: 125 },
    ];
    y = drawTableHeader(doc, potCols, y);
    data.patologias.potenciais.forEach((p: any, i: number) => {
      y = drawTableRow(doc, potCols, [p.nome, p.orgaoSistema || "—", p.intensidadeInicial || "—", p.statusSemaforo || "amarelo", p.leituraClinica || "—"], y, i % 2 === 0);
    });
    drawFooter(doc, false);
  }

  // ========== RACL HORG — Orgaos e Sistemas (PAISAGEM) ==========
  if (include("RACL HORG") && data.orgaos.length > 0) {
    addPagePaisagem(doc);
    drawHeader(doc, "Orgaos e Sistemas Afetados", "RACL HORG", true);
    y = 80;
    y = drawPacienteBlock(doc, data, y, 842);
    y = drawSectionTitle(doc, "Correlacao Patologia → Orgao → Intensidade → Prognostico", y);
    const orgCols = [
      { label: "ORGAO/SISTEMA", x: 40, w: 140 },
      { label: "INTENSIDADE", x: 180, w: 90 },
      { label: "RISCO/PROGNOSTICO", x: 270, w: 110 },
      { label: "PATOLOGIAS RELACIONADAS", x: 380, w: 230 },
      { label: "OBSERVACAO", x: 610, w: 192 },
    ];
    y = drawTableHeader(doc, orgCols, y);
    data.orgaos.forEach((o: any, i: number) => {
      const pats = Array.isArray(o.patologiasRelacionadas) ? o.patologiasRelacionadas.join(", ") : "—";
      y = drawTableRow(doc, orgCols, [o.orgaoSistema, o.intensidade, o.riscoPrognostico, pats, o.observacao || "—"], y, i % 2 === 0);
    });
    drawFooter(doc, true);
  }

  // ========== RACL HMED — Medicamentos em Uso (PAISAGEM) ==========
  if (include("RACL HMED")) {
  const HMED_PAGE_LIMIT = 500;
  addPagePaisagem(doc);
  drawHeader(doc, "Medicamentos em Uso", "RACL HMED", true);
  y = 80;
  y = drawPacienteBlock(doc, data, y, 842);
  y = drawSectionTitle(doc, "Lista Completa de Medicacao com Dosagem Incorporada", y);
  // Task #242 — coluna "POSO. ORIGEM" sinaliza posologia validada pelo medico
  // (manual) vs interpretada automaticamente pelo parser.
  const hmedCols = [
    { label: "MEDICAMENTO + DOSE", x: 40, w: 150 },
    { label: "POSOLOGIA", x: 190, w: 115 },
    { label: "POSO. ORIGEM", x: 305, w: 75 },
    { label: "INDICACAO CLINICA", x: 380, w: 110 },
    { label: "STATUS", x: 490, w: 65 },
    { label: "SUBSTITUICAO NATURAL", x: 555, w: 130 },
    { label: "EVIDENCIA MELHORA", x: 685, w: 117 },
  ];
  y = drawTableHeader(doc, hmedCols, y);
  let totalManual = 0;
  let totalParser = 0;
  data.medicamentos.forEach((m: any, i: number) => {
    if (y > HMED_PAGE_LIMIT) {
      drawFooter(doc, true);
      addPagePaisagem(doc);
      drawHeader(doc, "Medicamentos em Uso (cont.)", "RACL HMED", true);
      y = 80;
      y = drawPacienteBlock(doc, data, y, 842);
      y = drawTableHeader(doc, hmedCols, y);
    }
    const inline = m.medicamentoDoseInline || `${m.nome}${m.dose ? " " + m.dose : ""}`;
    const origemLabel = !m.posologia
      ? "—"
      : m.origemPosologia === "manual"
        ? "validado medico"
        : "auto (parser)";
    if (m.posologia && m.origemPosologia === "manual") totalManual++;
    if (m.posologia && m.origemPosologia === "parser") totalParser++;
    y = drawTableRow(doc, hmedCols, [inline, posologiaCanonica(m.posologia, m.posologiaEstruturada), origemLabel, m.indicacaoClinica || m.motivoUso || "—", m.statusAtual, m.substituicaoNatural || "—", m.evidenciaMelhora || "—"], y, i % 2 === 0);
  });
  // Task #242 — rodape de qualidade clinica: contagem agregada origem da posologia.
  y += 6;
  doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.azulPetroleo)
    .text(`Qualidade clinica - origem da posologia: ${totalManual} validada(s) pelo medico / ${totalParser} interpretada(s) automaticamente`, 40, y);
  y += 14;
  drawFooter(doc, true);
  }

  // ========== RACL HFOR — Formulas Magistrais (RETRATO, paginado) ==========
  const formulas = data.medicamentos.filter((m: any) => m.tipoMed === "formula" && m.componentesFormula && m.componentesFormula.length > 0);
  if (include("RACL HFOR") && formulas.length > 0) {
    const MAX_COMPONENTES_POR_PAGINA = 18;
    formulas.forEach((f: any, fIdx: number) => {
      addPageRetrato(doc);
      drawHeader(doc, `Formula Magistral ${fIdx + 1}/${formulas.length}`, "RACL HFOR", false);
      y = 80;
      y = drawPacienteBlock(doc, data, y, 595);

      y = drawSectionTitle(doc, f.nome || `Formula ${fIdx + 1}`, y);
      if (f.posologia || f.posologiaEstruturada) {
        // Task #240 + Task #233 — frase base + blocos (fases/ciclo/tomadas/range)
        // em linhas indentadas, preferindo `posologia_estruturada` persistida
        // (backfill Task #40); fallback p/ raw quando interpretado=false.
        doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.azulPetroleo).text("Posologia:", 50, y);
        doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto);
        y = desenharPosologiaBlocos(doc, f.posologiaEstruturada ?? f.posologia, 100, y, 455);
        y += 4;
        // Task #242 — origem da posologia (manual=validada pelo medico /
        // parser=interpretada automaticamente).
        const origemFmt = f.origemPosologia === "manual" ? "validada pelo medico" : "interpretada automaticamente";
        doc.fontSize(7).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro)
          .text(`Origem da posologia: ${origemFmt}`, 100, y);
        y += 12;
      }
      if (f.motivoUso) {
        doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaClaro).text(`Indicacao: ${f.motivoUso}`, 50, y);
        y += 14;
      }
      y += 4;

      const compCols = [
        { label: "SUBSTANCIA", x: 40, w: 300 },
        { label: "DOSAGEM", x: 340, w: 215 },
      ];
      const comps: Array<{substancia: string; dosagem: string}> = f.componentesFormula;
      let pageComps = 0;

      y = drawTableHeader(doc, compCols, y);
      comps.forEach((c: any, cIdx: number) => {
        y = drawTableRow(doc, compCols, [c.substancia, c.dosagem], y, cIdx % 2 === 0);
        pageComps++;
        if (pageComps >= MAX_COMPONENTES_POR_PAGINA && cIdx < comps.length - 1) {
          drawFooter(doc, false);
          addPageRetrato(doc);
          drawHeader(doc, `Formula Magistral ${fIdx + 1}/${formulas.length} (cont.)`, "RACL HFOR", false);
          y = 80;
          y = drawPacienteBlock(doc, data, y, 595);
          y = drawSectionTitle(doc, `${f.nome || "Formula"} — continuacao`, y);
          y = drawTableHeader(doc, compCols, y);
          pageComps = 0;
        }
      });

      if (f.statusAtual) {
        y += 8;
        doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaClaro).text(`Status: ${f.statusAtual.replace("_", " ")}`, 50, y);
        y += 14;
      }
      if (f.substituicaoNatural) {
        doc.fontSize(8).font("Helvetica").fillColor(CORES.verdeSalvia).text(`Substituicao: ${f.substituicaoNatural}`, 50, y);
        y += 14;
      }
      drawFooter(doc, false);
    });
  }

  // ========== RACL HLIN — Linha Temporal de Medicacao (PAISAGEM) ==========
  if (include("RACL HLIN") && data.eventosMedicacao.length > 0) {
    addPagePaisagem(doc);
    drawHeader(doc, "Linha Temporal de Medicacao", "RACL HLIN", true);
    y = 80;
    y = drawPacienteBlock(doc, data, y, 842);
    y = drawSectionTitle(doc, "Cronologia de Eventos por Medicamento", y);
    const hlinCols = [
      { label: "DATA", x: 40, w: 90 },
      { label: "MEDICAMENTO", x: 130, w: 150 },
      { label: "POSOLOGIA", x: 280, w: 120 },
      { label: "EVENTO", x: 400, w: 80 },
      { label: "SUBSTITUICAO", x: 480, w: 150 },
      { label: "LEITURA CLINICA", x: 630, w: 172 },
    ];
    y = drawTableHeader(doc, hlinCols, y);
    data.eventosMedicacao.forEach((e: any, i: number) => {
      const dt = e.data ? new Date(e.data).toLocaleDateString("pt-BR") : "—";
      y = drawTableRow(doc, hlinCols, [dt, e.apresentacao, posologiaCanonica(e.posologia, e.posologiaEstruturada), e.status, e.substituicaoNatural || "—", e.leituraClinica || "—"], y, i % 2 === 0);
      if (y > 530) {
        drawFooter(doc, true);
        addPagePaisagem(doc);
        drawHeader(doc, "Linha Temporal de Medicacao (cont.)", "RACL HLIN", true);
        y = 80;
        y = drawTableHeader(doc, hlinCols, y);
      }
    });
    drawFooter(doc, true);
  }

  // ========== RACL HTRN — Transicao Terapeutica (PAISAGEM) ==========
  const medsComSub = data.medicamentos.filter((m: any) => m.substituicaoNatural);
  if (include("RACL HTRN") && medsComSub.length > 0) {
    addPagePaisagem(doc);
    drawHeader(doc, "Transicao Terapeutica", "RACL HTRN", true);
    y = 80;
    y = drawPacienteBlock(doc, data, y, 842);
    y = drawSectionTitle(doc, "Remedio → Substituicao Natural → Evidencia Clinica", y);
    const htrnCols = [
      { label: "MEDICAMENTO ORIGINAL", x: 40, w: 160 },
      { label: "STATUS", x: 200, w: 80 },
      { label: "SUBSTITUICAO NATURAL/INTEGRATIVA", x: 280, w: 200 },
      { label: "EVIDENCIA MELHORA", x: 480, w: 170 },
      { label: "CRITERIO REDUCAO", x: 650, w: 152 },
    ];
    y = drawTableHeader(doc, htrnCols, y);
    medsComSub.forEach((m: any, i: number) => {
      const inline = m.medicamentoDoseInline || `${m.nome}${m.dose ? " " + m.dose : ""}`;
      y = drawTableRow(doc, htrnCols, [inline, m.statusAtual, m.substituicaoNatural, m.evidenciaMelhora || "—", m.criterioReducao || "—"], y, i % 2 === 0);
    });
    drawFooter(doc, true);
  }

  // ========== RACL HEVO — Evolucao Clinica Comparativa (PAISAGEM) ==========
  if (include("RACL HEVO") && data.patologias.diagnosticadas.length > 0) {
    addPagePaisagem(doc);
    drawHeader(doc, "Evolucao Clinica Comparativa", "RACL HEVO", true);
    y = 80;
    y = drawPacienteBlock(doc, data, y, 842);
    y = drawSectionTitle(doc, "Antes → Transicao → Atual", y);
    const hevoCols = [
      { label: "PATOLOGIA", x: 40, w: 130 },
      { label: "ORGAO", x: 170, w: 90 },
      { label: "ESTADO INICIAL", x: 260, w: 90 },
      { label: "TRANSICAO", x: 350, w: 100 },
      { label: "ESTADO ATUAL", x: 450, w: 90 },
      { label: "MEDICACAO / SUBSTITUICAO", x: 540, w: 150 },
      { label: "LEITURA CLINICA", x: 690, w: 112 },
    ];
    y = drawTableHeader(doc, hevoCols, y);
    data.patologias.diagnosticadas.forEach((p: any, i: number) => {
      const transicao = p.evolucaoPercentual ? `${p.evolucaoPercentual > 0 ? "↑" : "↓"} ${Math.abs(p.evolucaoPercentual)}%` : "—";
      const medSub = p.substituicaoNatural ? `${p.medicacaoOriginal || "—"} → ${p.substituicaoNatural}` : (p.medicacaoAtual || "—");
      y = drawTableRow(doc, hevoCols, [p.nome, p.orgaoSistema || "—", p.intensidadeInicial || "—", transicao, p.intensidadeAtual || "—", medSub, p.leituraClinica || "—"], y, i % 2 === 0);
    });
    drawFooter(doc, true);
  }

  // ========== RACL HCUR — Curvas Declinante e Ascendente (PAISAGEM) ==========
  if (include("RACL HCUR") && (data.curvas.doenca.length > 0 || data.curvas.saude.length > 0)) {
    addPagePaisagem(doc);
    drawHeader(doc, "Curvas Declinante e Ascendente", "RACL HCUR", true);
    y = 80;
    y = drawPacienteBlock(doc, data, y, 842);

    y = drawSectionTitle(doc, "Curva Declinante — Doencas, Inflamacao, Dependencia", y);
    const latestDoenca: Record<string, number> = {};
    data.curvas.doenca.forEach((c: any) => { latestDoenca[c.indicador] = c.valor; });
    for (const [ind, val] of Object.entries(latestDoenca)) {
      y = drawCurvaBar(doc, ind.replace(/_/g, " "), val, CORES.vermelho, 50, y, 250);
    }
    y += 12;

    y = drawSectionTitle(doc, "Curva Ascendente — Saude Funcional, Resposta Organica, Bem-Estar", y);
    const latestSaude: Record<string, number> = {};
    data.curvas.saude.forEach((c: any) => { latestSaude[c.indicador] = c.valor; });
    for (const [ind, val] of Object.entries(latestSaude)) {
      y = drawCurvaBar(doc, ind.replace(/_/g, " "), val, CORES.verdeSalvia, 50, y, 250);
    }

    y += 20;
    doc.rect(50, y, 700, 30).fill("#F0ECE4");
    doc.fontSize(7).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro)
      .text("Legenda: Barras VERMELHAS representam indicadores de doenca (objetivo: diminuir). Barras VERDES representam indicadores de saude (objetivo: aumentar).", 60, y + 8, { width: 680 });

    drawFooter(doc, true);
  }

  // ========== RACL HATU — Estado Atual de Saude (RETRATO) ==========
  if (include("RACL HATU")) {
  addPageRetrato(doc);
  drawHeader(doc, "Estado Atual de Saude", "RACL HATU", false);
  y = 80;
  y = drawPacienteBlock(doc, data, y, 595);

  const snap = data.snapshotAtual || data.snapshotInicial;
  if (snap) {
    y = drawSectionTitle(doc, "Resumo Clinico Consolidado", y);
    if (snap.resumoClinico) {
      doc.fontSize(9).font("Helvetica").fillColor(CORES.cinzaTexto).text(snap.resumoClinico, 50, y, { width: 495, lineGap: 3 });
      y += doc.heightOfString(snap.resumoClinico, { width: 495 }) + 16;
    }
    if (snap.observacoesMedicas) {
      y = drawSectionTitle(doc, "Observacoes Medicas", y);
      doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaClaro).text(snap.observacoesMedicas, 50, y, { width: 495, lineGap: 2 });
      y += doc.heightOfString(snap.observacoesMedicas, { width: 495 }) + 12;
    }
  }

  y = drawSectionTitle(doc, "Status por Patologia", y);
  data.patologias.diagnosticadas.forEach((p: any) => {
    const cor = corSemaforo(p.statusSemaforo || "amarelo");
    doc.rect(50, y, 8, 8).fill(cor);
    doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.cinzaTexto).text(p.nome, 64, y, { continued: true });
    doc.font("Helvetica").text(` — ${p.intensidadeAtual || "—"} | ${p.leituraClinica || ""}`, { width: 450 });
    y += 14;
  });
  drawFooter(doc, false);
  }

  // ========== RACL HPLA — Proxima Etapa (RETRATO, Opcional) ==========
  if (include("RACL HPLA") && data.proximasEtapas.length > 0) {
    addPageRetrato(doc);
    drawHeader(doc, "Proxima Etapa", "RACL HPLA", false);
    y = 80;
    y = drawPacienteBlock(doc, data, y, 595);
    y = drawSectionTitle(doc, "Proximos Exames, Metas e Pontos de Atencao", y);

    const plaCols = [
      { label: "TIPO", x: 40, w: 80 },
      { label: "DESCRICAO", x: 120, w: 250 },
      { label: "DATA PREVISTA", x: 370, w: 90 },
      { label: "PRIORIDADE", x: 460, w: 70 },
      { label: "STATUS", x: 530, w: 25 },
    ];
    y = drawTableHeader(doc, plaCols, y);
    data.proximasEtapas.forEach((e: any, i: number) => {
      const dt = e.dataPrevista ? new Date(e.dataPrevista).toLocaleDateString("pt-BR") : "—";
      const status = e.concluido ? "✓" : "○";
      y = drawTableRow(doc, plaCols, [e.tipo, e.descricao, dt, e.prioridade || "media", status], y, i % 2 === 0);
    });
    drawFooter(doc, false);
  }

  if (doc.bufferedPageRange().count === 0) {
    addPageRetrato(doc);
    drawHeader(doc, `${RAS_CATEGORIAS[categoria].label}`, `RASX ${categoria}`, false);
    let yFb = 80;
    yFb = drawPacienteBlock(doc, data, yFb, 595);
    yFb = drawSectionTitle(doc, "Sem dados disponiveis para esta categoria", yFb);
    doc.fontSize(9).font("Helvetica").fillColor(CORES.cinzaClaro)
      .text("Nenhum dado clinico encontrado para gerar os cadernos desta categoria. Verifique se o REVO do paciente possui as informacoes necessarias.", 50, yFb, { width: 495, lineGap: 3 });
    drawFooter(doc, false);
  }

  doc.end();
  return stream;
}

interface RacjPdfData {
  paciente: { nome: string; cpf?: string; dataNascimento?: string; telefone?: string; email?: string; sexo?: string; enderecoCompleto?: string; plano?: string };
  medico: string;
  unidade: string;
  dataBase: string;
  patologias: string[];
  medicamentos: string[];
}

/**
 * Termo juridico carregado do banco (tabela termos_juridicos).
 * Usado pela versao "anastomosada" de gerarRacjPdf que le textos rebuscados
 * (3.000-6.800 chars cada) ao inves dos 5 textos hardcoded originais.
 */
export interface TermoJuridicoDb {
  id: number;
  bloco: string;
  consentimento: string | null;
  titulo: string;
  texto_completo: string;
  riscos_especificos?: Array<{ titulo?: string; descricao?: string } | string> | null;
}

function drawRacjParagraph(doc: PDFKit.PDFDocument, text: string, y: number, width: number): number {
  doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto).text(text, 50, y, { width, lineGap: 3 });
  return y + doc.heightOfString(text, { width }) + 8;
}

function drawRacjCheckbox(doc: PDFKit.PDFDocument, label: string, y: number): number {
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
    .text(`Data: ____/____/________`, 50, y)
    .text(`Local: __________________________`, 310, y);
  return y + 20;
}

export function gerarRacjPdf(data: RacjPdfData): PassThrough {
  const stream = new PassThrough();
  const doc = new PDFDocument({ size: "A4", layout: "portrait", margins: { top: 40, bottom: 40, left: 40, right: 40 }, autoFirstPage: false });
  doc.pipe(stream);
  const W = 495;

  // ========== RACJ LGPD — Termo LGPD (Secao 15 do Manifesto) ==========
  addPageRetrato(doc);
  drawHeader(doc, "Termo de Consentimento LGPD", "RACJ LGPD", false);
  let y = 80;
  y = drawPacienteBlock(doc, data as any, y, 595);
  y = drawSectionTitle(doc, "Lei Geral de Protecao de Dados (Lei 13.709/2018)", y);
  y = drawRacjParagraph(doc, `Em conformidade com a Lei n. 13.709/2018 (LGPD), eu, ${data.paciente.nome}${data.paciente.cpf ? ", portador(a) do CPF " + data.paciente.cpf : ""}, autorizo a coleta, armazenamento e processamento dos meus dados pessoais e dados sensiveis de saude para fins exclusivos de:`, y, W);
  y = drawRacjCheckbox(doc, "Execucao do protocolo terapeutico", y);
  y = drawRacjCheckbox(doc, "Emissao de documentos clinicos (RAS, receituarios)", y);
  y = drawRacjCheckbox(doc, "Acompanhamento da evolucao clinica", y);
  y = drawRacjCheckbox(doc, "Comunicacao sobre agendamentos e resultados", y);
  y += 6;
  y = drawSectionTitle(doc, "Armazenamento Digital", y);
  y = drawRacjParagraph(doc, "Autorizo o armazenamento digital de todos os registros de atendimento, incluindo o presente termo, no sistema PAWARDS e, quando aplicavel, em ambiente de nuvem seguro (Google Drive), com compartilhamento exclusivo ao meu e-mail cadastrado, em modo somente leitura.", y, W);
  y = drawRacjParagraph(doc, "Tenho ciencia do meu direito de solicitar a exclusao, correcao ou portabilidade dos meus dados a qualquer momento.", y, W);
  y += 4;
  y = drawSectionTitle(doc, "Retencao e Revogacao", y);
  y = drawRacjParagraph(doc, "Os dados serao mantidos pelo prazo minimo de 20 anos conforme Resolucao CFM 1.821/2007. O titular pode solicitar acesso, correcao, anonimizacao ou eliminacao dos dados (quando permitido por lei) a qualquer momento.", y, W);
  y = drawRacjParagraph(doc, "O consentimento pode ser revogado a qualquer momento, sem prejuizo da licitude do tratamento realizado anteriormente. A revogacao nao se aplica a dados cuja retencao e obrigatoria por lei.", y, W);
  y = drawAssinatura(doc, y);
  drawFooter(doc, false);

  // ========== RACJ CGLO — Consentimento Global / TCLE (Secao 14 do Manifesto — 10 Secoes Fixas) ==========
  addPageRetrato(doc);
  drawHeader(doc, "Termo de Consentimento Livre e Esclarecido (TCLE)", "RACJ CGLO", false);
  y = 80;
  y = drawPacienteBlock(doc, data as any, y, 595);

  y = drawSectionTitle(doc, "1. IDENTIFICACAO", y);
  y = drawRacjParagraph(doc, `Eu, ${data.paciente.nome}${data.paciente.cpf ? ", portador(a) do CPF " + data.paciente.cpf : ""}, declaro que fui devidamente informado(a) pelo Dr. ${data.medico} sobre meu quadro clinico, incluindo diagnosticos, prognosticos, riscos e alternativas terapeuticas.`, y, W);

  y = drawSectionTitle(doc, "2. PROCEDIMENTO", y);
  y = drawRacjParagraph(doc, `Autorizo a administracao das seguintes substancias: ${data.medicamentos.length > 0 ? data.medicamentos.join(", ") : "[conforme prescricao medica]"}. Estou ciente de que os procedimentos injetaveis podem incluir aplicacoes por via endovenosa (IV), intramuscular (IM) e/ou subcutanea (SC), bem como implantes subcutaneos.`, y, W);

  y = drawSectionTitle(doc, "3. FINALIDADE TERAPEUTICA", y);
  y = drawRacjParagraph(doc, "O tratamento tem como finalidade a suplementacao de micronutrientes, modulacao bioquimica, terapia antioxidante e demais abordagens integrativas indicadas pelo medico responsavel.", y, W);

  if (data.patologias.length > 0) {
    y = drawSectionTitle(doc, "Patologias em Acompanhamento", y);
    data.patologias.forEach(p => {
      doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto).text(`  \u2022 ${p}`, 50, y, { width: W });
      y += 14;
    });
    y += 4;
  }

  y = drawSectionTitle(doc, "4. RISCOS E EFEITOS ADVERSOS", y);
  y = drawRacjParagraph(doc, "Fui informado(a) sobre os possiveis riscos e efeitos adversos, incluindo: dor e/ou hematoma no local da aplicacao, reacoes alergicas, rubor facial, cefaleia, nausea, hipotensao transitoria e, em casos raros, reacoes anafilaticas.", y, W);

  y = drawSectionTitle(doc, "5. CONTRAINDICACOES INFORMADAS", y);
  y = drawRacjParagraph(doc, "Declaro ter sido questionado(a) e ter informado ao medico sobre: gestacao ou suspeita de gravidez; amamentacao; uso de anticoagulantes; doencas renais, hepaticas ou cardiacas; alergias conhecidas e demais condicoes relevantes.", y, W);

  y = drawAssinatura(doc, y);
  drawFooter(doc, false);

  // ========== RACJ CGLO pagina 2 — Secoes 6 a 10 do TCLE ==========
  addPageRetrato(doc);
  drawHeader(doc, "TCLE — Consentimentos Especificos", "RACJ CGLO", false);
  y = 80;

  y = drawSectionTitle(doc, "6. CONSENTIMENTO VITAMINA C IV (quando aplicavel)", y);
  y = drawRacjParagraph(doc, "No caso de Vitamina C endovenosa em alta dose (acima de 10g), declaro ciencia da necessidade de dosagem previa de G6PD (glicose-6-fosfato desidrogenase). A deficiencia desta enzima pode causar anemia hemolitica. Fui orientado(a) a realizar o exame antes do inicio do protocolo.", y, W);

  y = drawSectionTitle(doc, "7. NAD+ E TERAPIAS DE LONGEVIDADE (quando aplicavel)", y);
  y = drawRacjParagraph(doc, "Fui orientado(a) sobre a velocidade de infusao adequada para NAD+ e possiveis desconfortos, incluindo: desconforto toracico, nausea ou cefaleia durante a infusao. A velocidade de gotejamento sera ajustada conforme tolerancia individual.", y, W);

  y = drawSectionTitle(doc, "8. CONSENTIMENTO POR VIA DE APLICACAO", y);

  y = drawRacjParagraph(doc, "Via Endovenosa (IV): Autorizo procedimentos por via endovenosa. Fui informado(a) que infusoes IV requerem acesso venoso periferico, podendo ocorrer dor no local da puncao, hematoma, flebite e, raramente, infiltracao.", y, W);

  y = drawRacjParagraph(doc, "Via Intramuscular (IM): Autorizo procedimentos por via intramuscular. Estou ciente de que aplicacoes IM podem causar dor local, hematoma, nodulacao transitoria e, em raros casos, lesao nervosa periferica.", y, W);

  y = drawRacjParagraph(doc, "Via Subcutanea (SC): Autorizo procedimentos por via subcutanea. Fui informado(a) que aplicacoes SC podem resultar em nodulos locais, eritema, prurido e dor no ponto de aplicacao. A absorcao e gradual.", y, W);

  y = drawRacjParagraph(doc, "Implante Subcutaneo: Autorizo a realizacao de implante subcutaneo. Estou ciente dos riscos especificos incluindo: necessidade de pequeno procedimento cirurgico, possibilidade de infeccao local, extrusao do implante, formacao de cicatriz, e necessidade de retorno para remocao ao final do periodo terapeutico.", y, W);

  y = drawSectionTitle(doc, "9. ARMAZENAMENTO DIGITAL", y);
  y = drawRacjParagraph(doc, "Autorizo o armazenamento digital de todos os registros de atendimento, incluindo o presente termo, no sistema PAWARDS e, quando aplicavel, em ambiente de nuvem seguro (Google Drive), com compartilhamento exclusivo ao meu e-mail cadastrado, em modo somente leitura.", y, W);

  y = drawSectionTitle(doc, "10. DECLARACAO FINAL", y);
  y = drawRacjParagraph(doc, "Declaro ter lido e compreendido integralmente o presente termo. Todas as minhas duvidas foram esclarecidas pelo medico responsavel. Estou ciente de que posso revogar este consentimento a qualquer momento, sem prejuizo do atendimento ja realizado.", y, W);

  y = drawAssinatura(doc, y);
  drawFooter(doc, false);

  // ========== RACJ RISC — Declaracao de Riscos e Efeitos Adversos ==========
  addPageRetrato(doc);
  drawHeader(doc, "Declaracao de Riscos e Efeitos Adversos", "RACJ RISC", false);
  y = 80;
  y = drawPacienteBlock(doc, data as any, y, 595);
  y = drawSectionTitle(doc, "Ciencia de Riscos Inerentes ao Tratamento", y);
  y = drawRacjParagraph(doc, "Declaro estar ciente de que todo tratamento medico envolve riscos, incluindo mas nao se limitando a:", y, W);
  y = drawRacjCheckbox(doc, "Reacoes adversas a medicamentos, suplementos ou formulas magistrais", y);
  y = drawRacjCheckbox(doc, "Interacoes medicamentosas nao previsiveis entre substancias prescritas", y);
  y = drawRacjCheckbox(doc, "Variacao individual na resposta terapeutica (eficacia e tolerabilidade)", y);
  y = drawRacjCheckbox(doc, "Necessidade de ajustes de dose, substituicao ou suspensao de tratamento", y);
  y = drawRacjCheckbox(doc, "Agravamento temporario de sintomas durante periodo de transicao terapeutica", y);
  y = drawRacjCheckbox(doc, "Resultados que podem diferir das expectativas iniciais", y);
  y += 6;
  y = drawSectionTitle(doc, "Riscos Especificos por Via de Aplicacao", y);
  y = drawRacjCheckbox(doc, "Endovenosa (IV): dor no local da puncao, hematoma, flebite, infiltracao, reacoes anafilaticas (raras)", y);
  y = drawRacjCheckbox(doc, "Intramuscular (IM): dor local, hematoma, nodulacao transitoria, lesao nervosa periferica (rara)", y);
  y = drawRacjCheckbox(doc, "Subcutanea (SC): nodulos locais, eritema, prurido, dor no ponto de aplicacao", y);
  y = drawRacjCheckbox(doc, "Implante: infeccao local, extrusao, cicatriz, necessidade de procedimento cirurgico para remocao", y);
  y += 8;
  y = drawRacjParagraph(doc, "Fui orientado(a) a comunicar imediatamente ao medico responsavel qualquer reacao adversa, desconforto ou piora clinica durante o tratamento.", y, W);
  y = drawRacjParagraph(doc, "O consentimento formal sera registrado presencialmente antes da primeira aplicacao, conforme exigencias da ANVISA e do Conselho Federal de Medicina (CFM). O RAS (Registro de Administracao de Substancias) sera emitido e assinado digitalmente com certificado ICP-Brasil A1 apos cada sessao.", y, W);
  y = drawAssinatura(doc, y);
  drawFooter(doc, false);

  // ========== RACJ NGAR — Termo de Nao-Garantia de Resultados ==========
  addPageRetrato(doc);
  drawHeader(doc, "Termo de Nao-Garantia de Resultados", "RACJ NGAR", false);
  y = 80;
  y = drawPacienteBlock(doc, data as any, y, 595);
  y = drawSectionTitle(doc, "Ausencia de Garantia de Resultado Especifico", y);
  y = drawRacjParagraph(doc, "Declaro estar ciente de que:", y, W);
  y = drawRacjParagraph(doc, "1. A Medicina nao e uma ciencia exata. Resultados clinicos variam conforme caracteristicas individuais, adesao ao tratamento, fatores geneticos, ambientais e comportamentais.", y, W);
  y = drawRacjParagraph(doc, "2. O medico se compromete a empregar os melhores recursos disponiveis, baseados em evidencias cientificas, mas nao pode garantir cura, remissao completa ou resultado especifico.", y, W);
  y = drawRacjParagraph(doc, "3. O acompanhamento evolutivo (REVO) permite monitorar a progressao do tratamento e ajustar condutas conforme necessidade clinica.", y, W);
  y = drawRacjParagraph(doc, "4. A interrupcao unilateral do tratamento sem orientacao medica pode comprometer os resultados alcancados.", y, W);
  y = drawRacjParagraph(doc, "5. O plano terapeutico podera ser alterado a qualquer momento pelo medico responsavel, com base na evolucao clinica, resultados de exames e resposta individual ao tratamento.", y, W);
  y = drawAssinatura(doc, y);
  drawFooter(doc, false);

  // ========== RACJ PRIV — Politica de Privacidade e Sigilo Medico ==========
  addPageRetrato(doc);
  drawHeader(doc, "Politica de Privacidade e Sigilo Medico", "RACJ PRIV", false);
  y = 80;
  y = drawPacienteBlock(doc, data as any, y, 595);
  y = drawSectionTitle(doc, "Compromisso de Sigilo e Confidencialidade", y);
  y = drawRacjParagraph(doc, `O Instituto Padua (PADUCCIA CLINICA MEDICA LTDA, CNPJ 63.865.940/0001-63) e o Dr. ${data.medico} comprometem-se a:`, y, W);
  y = drawRacjParagraph(doc, "1. Manter sigilo absoluto sobre todas as informacoes clinicas do paciente, conforme art. 73 do Codigo de Etica Medica e art. 154 do Codigo Penal.", y, W);
  y = drawRacjParagraph(doc, "2. Armazenar dados em sistemas com criptografia e controle de acesso, conforme Lei 13.709/2018 (LGPD).", y, W);
  y = drawRacjParagraph(doc, "3. Nao compartilhar dados com terceiros sem autorizacao expressa do paciente, exceto quando exigido por lei ou ordem judicial.", y, W);
  y = drawRacjParagraph(doc, "4. Utilizar sistemas de comunicacao (WhatsApp, email) apenas com consentimento previo do paciente para fins exclusivamente clinicos.", y, W);
  y = drawRacjParagraph(doc, "5. Garantir que todos os PDFs e relatorios gerados pelo sistema PAWARDS sao de uso exclusivo do paciente e equipe medica autorizada.", y, W);
  y = drawRacjParagraph(doc, "6. A assinatura digital ICP-Brasil A1 confere validade juridica ao documento (MP 2.200-2/2001). Os documentos assinados digitalmente possuem a mesma validade legal de documentos assinados fisicamente.", y, W);
  y += 6;
  y = drawSectionTitle(doc, "Canais Autorizados de Comunicacao", y);
  y = drawRacjCheckbox(doc, "WhatsApp: comunicacao clinica, envio de relatorios e agendamento", y);
  y = drawRacjCheckbox(doc, "Email: envio de PDFs clinicos e juridicos, codigo de validacao pre-sessao", y);
  y = drawRacjCheckbox(doc, "Google Drive: armazenamento seguro de documentos em 16 subpastas organizadas por categoria", y);
  y += 6;
  y = drawSectionTitle(doc, "Consentimento no E-mail Pre-Sessao", y);
  y = drawRacjParagraph(doc, "Ao prosseguir com o tratamento, o(a) paciente declara estar ciente dos procedimentos a serem realizados, incluindo aplicacoes endovenosas, intramusculares e/ou implantes subcutaneos. O paciente foi informado sobre os beneficios esperados, possiveis efeitos colaterais e contraindicacoes de cada substancia.", y, W);
  y = drawRacjParagraph(doc, "O consentimento formal sera registrado presencialmente antes da primeira aplicacao, conforme exigencias da ANVISA e do Conselho Federal de Medicina (CFM). O RAS (Registro de Administracao de Substancias) sera emitido e assinado digitalmente com certificado ICP-Brasil A1 apos cada sessao.", y, W);
  y = drawAssinatura(doc, y);
  drawFooter(doc, false);

  doc.end();
  return stream;
}

// ──────────────────────────────────────────────────────────────────────────
// VERSAO ANASTOMOSADA — le termos_juridicos do banco (Reificacao V1)
// ──────────────────────────────────────────────────────────────────────────

const PAGE_BOTTOM_LIMIT = 760;

function drawRacjBlocoTexto(doc: PDFKit.PDFDocument, texto: string, y: number, width: number, paciente?: { nome: string; cpf?: string }): number {
  let renderText = texto;
  if (paciente) {
    renderText = renderText
      .replace(/\{\{\s*NOME_PACIENTE\s*\}\}/gi, paciente.nome)
      .replace(/\{\{\s*CPF_PACIENTE\s*\}\}/gi, paciente.cpf || "_____________");
  }
  const paragrafos = renderText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  for (const par of paragrafos) {
    const trimmed = par.trim();
    const altura = doc.fontSize(8).font("Helvetica").heightOfString(trimmed, { width, lineGap: 3 }) + 8;
    if (y + altura > PAGE_BOTTOM_LIMIT) {
      drawFooter(doc, false);
      addPageRetrato(doc);
      drawHeader(doc, "(continuacao)", "RACJ", false);
      y = 80;
    }
    const ehTitulo = (trimmed.length < 110 && /^[A-Z0-9 IVXÇÃÕÉÊÍÓÚÁÂÔÀ\.\-—]{6,}$/.test(trimmed)) ||
                     (/^\d+\.\s+[A-ZÇÃ]/.test(trimmed) && trimmed.length < 80);
    if (ehTitulo) {
      y = drawSectionTitle(doc, trimmed, y);
    } else {
      y = drawRacjParagraph(doc, trimmed, y, width);
    }
  }
  return y;
}

function drawRacjRiscos(doc: PDFKit.PDFDocument, riscos: TermoJuridicoDb["riscos_especificos"], y: number, width: number): number {
  if (!riscos || !Array.isArray(riscos) || riscos.length === 0) return y;
  if (y + 60 > PAGE_BOTTOM_LIMIT) {
    drawFooter(doc, false); addPageRetrato(doc);
    drawHeader(doc, "Riscos Especificos (continuacao)", "RACJ", false); y = 80;
  }
  y = drawSectionTitle(doc, "Riscos Especificos Catalogados", y);
  for (const r of riscos) {
    const titulo = typeof r === "string" ? "" : (r.titulo || "");
    const descricao = typeof r === "string" ? r : (r.descricao || JSON.stringify(r));
    const linha = titulo ? `${titulo}: ${descricao}` : descricao;
    const altura = doc.fontSize(8).font("Helvetica").heightOfString(linha, { width: width - 16, lineGap: 3 }) + 8;
    if (y + altura > PAGE_BOTTOM_LIMIT) {
      drawFooter(doc, false); addPageRetrato(doc);
      drawHeader(doc, "Riscos Especificos (continuacao)", "RACJ", false); y = 80;
    }
    y = drawRacjCheckbox(doc, linha, y);
  }
  return y + 4;
}

function deriveCodigoRacj(termo: TermoJuridicoDb): string {
  if (termo.consentimento) return `RACJ ${termo.consentimento}`;
  const t = termo.titulo.toLowerCase();
  if (t.includes("lgpd") || t.includes("dados pessoais")) return "RACJ LGPD";
  if (t.includes("privacidade") || t.includes("sigilo")) return "RACJ PRIV";
  if (t.includes("nao-garantia") || t.includes("nao garantia") || t.includes("obrigacao de meio")) return "RACJ NGAR";
  if (t.includes("imagem") || t.includes("voz")) return "RACJ IMAG";
  if (t.includes("aceite digital") || t.includes("assinatura eletronica")) return "RACJ AEAS";
  if (t.includes("financeira") || t.includes("comercial")) return "RACJ FINA";
  if (t.includes("tcle") || t.includes("consentimento livre")) return "RACJ CGLO";
  return "RACJ JURI";
}

/**
 * RACJ "anastomosado" — le termos_juridicos do banco (3.000-6.800 chars cada,
 * baseados em CFM 1931/2009, LGPD 13.709/2018, CDC, ANVISA RDC 67/2007).
 * Cada termo gera 1+ pagina(s) com header proprio, texto rebuscado, riscos
 * especificos catalogados e bloco de assinatura.
 *
 * Fallback: se termos vazio, chama gerarRacjPdf hardcoded original.
 */
export function gerarRacjPdfFromBanco(data: RacjPdfData, termos: TermoJuridicoDb[]): PassThrough {
  if (!termos || termos.length === 0) return gerarRacjPdf(data);

  const stream = new PassThrough();
  const doc = new PDFDocument({ size: "A4", layout: "portrait", margins: { top: 40, bottom: 40, left: 40, right: 40 }, autoFirstPage: false });
  doc.pipe(stream);
  const W = 495;

  const ordenados = [...termos].sort((a, b) => {
    if (a.bloco !== b.bloco) return a.bloco === "JURI" ? -1 : 1;
    return a.id - b.id;
  });

  for (const termo of ordenados) {
    try {
    addPageRetrato(doc);
    const codigo = deriveCodigoRacj(termo);
    drawHeader(doc, String(termo.titulo || "Termo"), codigo, false);
    let y = 80;
    y = drawPacienteBlock(doc, data as any, y, 595);
    y = drawRacjBlocoTexto(doc, String(termo.texto_completo || ""), y, W, data.paciente);
    y = drawRacjRiscos(doc, termo.riscos_especificos, y, W);

    if (codigo === "RACJ CGLO" && (data.patologias.length > 0 || data.medicamentos.length > 0)) {
      if (y + 100 > PAGE_BOTTOM_LIMIT) {
        drawFooter(doc, false); addPageRetrato(doc);
        drawHeader(doc, `${termo.titulo} (anexo)`, codigo, false); y = 80;
      }
      if (data.patologias.length > 0) {
        y = drawSectionTitle(doc, "Patologias em Acompanhamento", y);
        for (const p of data.patologias) {
          doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto).text(`  \u2022 ${p}`, 50, y, { width: W });
          y += 14;
          if (y + 20 > PAGE_BOTTOM_LIMIT) { drawFooter(doc, false); addPageRetrato(doc); drawHeader(doc, `${termo.titulo} (anexo)`, codigo, false); y = 80; }
        }
        y += 6;
      }
      if (data.medicamentos.length > 0) {
        y = drawSectionTitle(doc, "Medicamentos em Acompanhamento", y);
        for (const m of data.medicamentos) {
          doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto).text(`  \u2022 ${m}`, 50, y, { width: W });
          y += 14;
          if (y + 20 > PAGE_BOTTOM_LIMIT) { drawFooter(doc, false); addPageRetrato(doc); drawHeader(doc, `${termo.titulo} (anexo)`, codigo, false); y = 80; }
        }
        y += 6;
      }
    }

    if (y + 90 > PAGE_BOTTOM_LIMIT) {
      drawFooter(doc, false); addPageRetrato(doc);
      drawHeader(doc, `${termo.titulo} (assinatura)`, codigo, false); y = 80;
    }
    drawAssinatura(doc, y);
    drawFooter(doc, false);
    } catch (err: any) {
      console.error(`[gerarRacjPdfFromBanco] Erro no termo id=${termo?.id} titulo=${termo?.titulo}:`, err.message, err.stack);
      throw err;
    }
  }

  doc.end();
  return stream;
}
