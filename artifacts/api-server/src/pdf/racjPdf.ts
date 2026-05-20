/**
 * GERADOR DE PDF — RACJ (Registro de Aceite e Consentimento Juridico)
 * Estetica Craniotomia V4 — densa, sem desperdiçar linha, KPI pills + matriz-espelho.
 *
 * Texto juridico integral vem de termos_juridicos.texto_completo (fonte unica
 * de verdade, validado juridicamente, nunca alterado pelo gerador).
 *
 * Personalizacao por categoria de termo (mapa canonico por id, fallback semantico):
 *  - JURI.BASE (1,2,3 — LGPD/Privacidade/NaoGarantia): apenas selo "termo generico"
 *  - JURI.CONS tcle_global (4): sumario consolidado do plano
 *  - JURI.CONS CFOR (5): tabela formula manipulada
 *  - JURI.CONS CIMU (6): matriz densa aplicacoes IM
 *  - JURI.CONS CEND (7): matriz densa aplicacoes EV
 *  - JURI.DIGI (12): selo aceite digital + provedor
 *  - FINA.CIEN (13): bloco financeiro referencial
 *
 * Origem: Plano Dr. Claude 18/mai/2026 + estetica Craniotomia V4 (CEO Caio).
 */

import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import { createHash } from "node:crypto";
import type { TratamentoSessao } from "../lib/clinica/carregarTratamentoSessao";

// ====================== PALETA & GEOMETRIA ======================
const CORES = {
  azulPetroleo: "#1F4E5F",
  azulPetroleoEscuro: "#163B49",
  offWhite: "#F5F0E8",
  douradoQueimado: "#B8860B",
  douradoSuave: "#D4A93E",
  lilas: "#7A5C8A",
  verde: "#4E8D52",
  cinzaTexto: "#333333",
  cinzaMedio: "#555555",
  cinzaClaro: "#888888",
  fundoBloco: "#E8E4DC",
  fundoBlocoClaro: "#F1EDE5",
  fundoLinha: "#FBF8F2",
  separador: "#C8C0AC",
  bloqueado: "#9B2C2C",
};

const W = 595;
const MARGIN = 36;
const CONTENT_W = W - MARGIN * 2;
const FOOTER_Y = 808;
const SAFE_BOTTOM = 780;

type PaletaCategoria = "BASE" | "CONS" | "DIGI" | "FINA";

interface TermoEntrada {
  id: number;
  bloco: string;
  subgrupo: string;
  categoria: string;
  titulo: string;
  textoCompleto: string;
  versao: number;
}

export interface DadosRacjPdf {
  tratamento: TratamentoSessao;
  termos: TermoEntrada[];
  dataAssinatura: string;
  meioAssinatura: "presencial" | "eletronica_zapsign" | "eletronica_clicksign" | "icp_a1";
  envelopeId?: string;
  provedorAssinatura?: string;
  tokenVerificacao?: string;
  observacaoSessao?: string;
}

function corPaleta(p: PaletaCategoria): string {
  if (p === "CONS") return CORES.douradoQueimado;
  if (p === "DIGI") return CORES.lilas;
  if (p === "FINA") return CORES.verde;
  return CORES.azulPetroleo;
}

function paletaPorBloco(termo: TermoEntrada): PaletaCategoria {
  const sub = termo.subgrupo.toUpperCase();
  if (sub.includes("CONS")) return "CONS";
  if (sub.includes("DIGI")) return "DIGI";
  if (termo.bloco.toUpperCase() === "FINA") return "FINA";
  return "BASE";
}

function rotuloCategoria(termo: TermoEntrada): { humano: string; tecnico: string } {
  const cat = termo.categoria.toLowerCase();
  if (cat === "lgpd") return { humano: "Proteção dos seus dados pessoais", tecnico: "JURI.BASE — LGPD Lei 13.709/2018" };
  if (cat === "privacidade") return { humano: "Sigilo médico e privacidade", tecnico: "JURI.BASE — CFM + LGPD" };
  if (cat === "nao_garantia") return { humano: "Ciência sobre não-garantia de resultados", tecnico: "JURI.BASE — Obrigação de meio (CDC 14 §4º)" };
  if (cat === "tcle_global") return { humano: "Consentimento para o plano terapêutico integrado", tecnico: "JURI.CONS — TCLE Global" };
  if (cat === "consentimento_especifico") {
    const t = termo.titulo.toUpperCase();
    if (t.includes("CFOR") || t.includes("MANIPULADA")) return { humano: "Consentimento — fórmulas manipuladas", tecnico: "JURI.CONS — CFOR (RDC 67)" };
    if (t.includes("CIMU") || t.includes("INTRAMUSCULAR")) return { humano: "Consentimento — aplicações intramusculares", tecnico: "JURI.CONS — CIMU" };
    if (t.includes("CEND") || t.includes("ENDOVENOSA")) return { humano: "Consentimento — aplicações endovenosas", tecnico: "JURI.CONS — CEND" };
    return { humano: termo.titulo, tecnico: `${termo.bloco}.${termo.subgrupo}` };
  }
  if (cat === "aceite_digital") return { humano: "Aceite digital e validade jurídica", tecnico: "JURI.DIGI — ICP-Brasil" };
  if (cat === "ciencia_financeira") return { humano: "Ciência financeira do protocolo", tecnico: "FINA.CIEN — Aceitação comercial" };
  return { humano: termo.titulo, tecnico: `${termo.bloco}.${termo.subgrupo}` };
}

interface DrawCtx { doc: PDFKit.PDFDocument; y: number }

function garantirEspaco(ctx: DrawCtx, alturaNecessaria: number): void {
  if (ctx.y + alturaNecessaria > SAFE_BOTTOM) {
    ctx.doc.addPage();
    ctx.y = 60;
  }
}

// ====================== KPI PILL (Craniotomia) ======================
function desenharKpiPill(doc: PDFKit.PDFDocument, x: number, y: number, label: string, value: string, cor: string): number {
  const labelW = doc.widthOfString(label, { font: "Helvetica", size: 6 });
  const valueW = doc.widthOfString(value, { font: "Helvetica-Bold", size: 9 });
  const padX = 5;
  const sepW = 4;
  const totalW = padX + labelW + sepW + valueW + padX;
  const H = 16;
  doc.rect(x, y, totalW, H).fill(CORES.fundoBlocoClaro);
  doc.rect(x, y, 2, H).fill(cor);
  doc.fontSize(6).font("Helvetica").fillColor(CORES.cinzaMedio)
    .text(label, x + padX, y + 4);
  doc.fontSize(9).font("Helvetica-Bold").fillColor(cor)
    .text(value, x + padX + labelW + sepW, y + 3);
  return totalW;
}

function desenharKpiBar(doc: PDFKit.PDFDocument, y: number, pills: Array<{ label: string; value: string; cor: string }>): number {
  let x = MARGIN;
  const gap = 3;
  for (const p of pills) {
    const w = desenharKpiPill(doc, x, y, p.label, p.value, p.cor);
    x += w + gap;
  }
  return y + 18;
}

// ====================== BLOCOS APLICÁVEIS DENSOS ======================
function desenharMiniHeaderAplicavel(ctx: DrawCtx, label: string, cor: string): void {
  ctx.doc.rect(MARGIN, ctx.y, CONTENT_W, 12).fill(cor);
  ctx.doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.offWhite)
    .text(label, MARGIN + 6, ctx.y + 3, { width: CONTENT_W - 12 });
  ctx.doc.fontSize(6).font("Helvetica").fillColor(CORES.offWhite)
    .text("APLICÁVEL A ESTE PACIENTE", MARGIN + 6, ctx.y + 3, { width: CONTENT_W - 12, align: "right" });
  ctx.y += 14;
}

function desenharBlocoAplicavelFormulas(ctx: DrawCtx, formulas: TratamentoSessao["formulas"]): void {
  if (formulas.length === 0) return;
  garantirEspaco(ctx, 50);
  desenharMiniHeaderAplicavel(ctx, "FÓRMULA(S) MANIPULADA(S) ATIVA(S)  ·  fonte: revo_medicamentos", CORES.douradoQueimado);
  for (const f of formulas) {
    const hContent = f.indicacaoClinica ? 42 : 30;
    garantirEspaco(ctx, hContent + 4);
    // selo cor lateral
    ctx.doc.rect(MARGIN, ctx.y, 3, hContent).fill(CORES.douradoQueimado);
    ctx.doc.rect(MARGIN + 3, ctx.y, CONTENT_W - 3, hContent).fill(CORES.fundoLinha);
    ctx.doc.fontSize(8.5).font("Helvetica-Bold").fillColor(CORES.cinzaTexto)
      .text(f.nome, MARGIN + 8, ctx.y + 3, { width: CONTENT_W - 100 });
    if (f.duracaoDescricao) {
      ctx.doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.douradoQueimado)
        .text(`DURAÇÃO: ${f.duracaoDescricao}`, MARGIN + CONTENT_W - 95, ctx.y + 4, { width: 90, align: "right" });
    }
    ctx.doc.fontSize(7.5).font("Helvetica").fillColor(CORES.cinzaMedio)
      .text(`Posologia: ${f.posologia ?? "—"}`, MARGIN + 8, ctx.y + 15, { width: CONTENT_W - 16 });
    if (f.indicacaoClinica) {
      ctx.doc.fontSize(7).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro)
        .text(`Indicação clínica: ${f.indicacaoClinica}`, MARGIN + 8, ctx.y + 27, { width: CONTENT_W - 16 });
    }
    ctx.y += hContent + 3;
  }
}

function desenharBlocoAplicavelAplicacoes(ctx: DrawCtx, aplicacoes: TratamentoSessao["aplicacoesIm"], via: "IM" | "EV"): void {
  if (aplicacoes.length === 0) return;
  garantirEspaco(ctx, 40);
  const label = via === "IM" ? `${aplicacoes.length} APLICAÇÃO(ÕES) INTRAMUSCULAR(ES)  ·  fonte: aplicacoes_substancias` : `${aplicacoes.length} APLICAÇÃO(ÕES) ENDOVENOSA(S)  ·  fonte: aplicacoes_substancias`;
  desenharMiniHeaderAplicavel(ctx, label, CORES.douradoQueimado);

  // Header tabela densa (estilo Craniotomia matriz-espelho)
  const COLS = { selo: 3, sub: 200, dose: 70, via: 30, sessao: 60, cat: 0 };
  COLS.cat = CONTENT_W - COLS.selo - COLS.sub - COLS.dose - COLS.via - COLS.sessao;
  ctx.doc.rect(MARGIN, ctx.y, CONTENT_W, 11).fill(CORES.fundoBloco);
  ctx.doc.fontSize(6).font("Helvetica-Bold").fillColor(CORES.cinzaMedio);
  let x = MARGIN + COLS.selo + 4;
  ctx.doc.text("SUBSTÂNCIA", x, ctx.y + 3, { width: COLS.sub - 8 }); x += COLS.sub;
  ctx.doc.text("DOSE", x, ctx.y + 3, { width: COLS.dose - 4 }); x += COLS.dose;
  ctx.doc.text("VIA", x, ctx.y + 3, { width: COLS.via - 4 }); x += COLS.via;
  ctx.doc.text("SESSÃO", x, ctx.y + 3, { width: COLS.sessao - 4 }); x += COLS.sessao;
  ctx.doc.text("CATEGORIA", x, ctx.y + 3, { width: COLS.cat - 4 });
  ctx.y += 11;

  for (let i = 0; i < aplicacoes.length; i++) {
    const a = aplicacoes[i];
    garantirEspaco(ctx, 14);
    const fundo = i % 2 === 0 ? CORES.fundoLinha : "#FFFFFF";
    ctx.doc.rect(MARGIN, ctx.y, CONTENT_W, 13).fill(fundo);
    ctx.doc.rect(MARGIN, ctx.y, COLS.selo, 13).fill(CORES.douradoQueimado);
    let cx = MARGIN + COLS.selo + 4;
    ctx.doc.fontSize(7.5).font("Helvetica").fillColor(CORES.cinzaTexto)
      .text(a.substanciaNome, cx, ctx.y + 3, { width: COLS.sub - 8, ellipsis: true });
    cx += COLS.sub;
    ctx.doc.font("Helvetica-Bold").fillColor(CORES.cinzaTexto)
      .text(a.dose, cx, ctx.y + 3, { width: COLS.dose - 4 });
    cx += COLS.dose;
    ctx.doc.font("Helvetica-Bold").fillColor(CORES.azulPetroleo)
      .text(a.via.toUpperCase(), cx, ctx.y + 3, { width: COLS.via - 4 });
    cx += COLS.via;
    // sessão N/Total com barra de progresso mini (Craniotomia: peso bar)
    ctx.doc.fontSize(6.5).font("Helvetica").fillColor(CORES.cinzaMedio)
      .text(`${a.numeroSessao}/${a.totalSessoes}`, cx, ctx.y + 2, { width: 22 });
    const barX = cx + 24;
    const barW = COLS.sessao - 28;
    ctx.doc.rect(barX, ctx.y + 5, barW, 3).fill(CORES.fundoBloco);
    ctx.doc.rect(barX, ctx.y + 5, Math.max(1, (a.numeroSessao / Math.max(1, a.totalSessoes)) * barW), 3).fill(CORES.douradoQueimado);
    cx += COLS.sessao;
    ctx.doc.fontSize(7).font("Helvetica-Oblique").fillColor(CORES.cinzaMedio)
      .text(a.categoria, cx, ctx.y + 3, { width: COLS.cat - 4, ellipsis: true });
    ctx.y += 13;
  }
  ctx.y += 4;
}

function desenharBlocoAplicavelSumario(ctx: DrawCtx, t: TratamentoSessao): void {
  garantirEspaco(ctx, 80);
  desenharMiniHeaderAplicavel(ctx, "PLANO TERAPÊUTICO CONSENTIDO NESTA SESSÃO", CORES.douradoQueimado);

  // KPI bar denso
  const ky = ctx.y;
  const pills: Array<{ label: string; value: string; cor: string }> = [
    { label: "FÓRMULAS", value: String(t.formulas.length), cor: CORES.douradoQueimado },
    { label: "IM", value: String(t.aplicacoesIm.length), cor: CORES.azulPetroleo },
    { label: "EV", value: String(t.aplicacoesEv.length), cor: CORES.bloqueado },
  ];
  if (t.outrasAplicacoes.length > 0) pills.push({ label: "OUTRAS", value: String(t.outrasAplicacoes.length), cor: CORES.cinzaMedio });
  ctx.y = desenharKpiBar(ctx.doc, ky, pills);
  ctx.y += 4;

  // Tabela densa: TODOS os itens consentidos (formulas + IMs + EVs em 1 lista)
  const itens: Array<{ tipo: string; cor: string; nome: string; spec: string }> = [
    ...t.formulas.map(f => ({ tipo: "FÓRMULA", cor: CORES.douradoQueimado, nome: f.nome, spec: f.posologia ?? "—" })),
    ...t.aplicacoesIm.map(a => ({ tipo: "IM", cor: CORES.azulPetroleo, nome: a.substanciaNome, spec: `${a.dose}  ·  sessão ${a.numeroSessao}/${a.totalSessoes}  ·  ${a.categoria}` })),
    ...t.aplicacoesEv.map(a => ({ tipo: "EV", cor: CORES.bloqueado, nome: a.substanciaNome, spec: `${a.dose}  ·  sessão ${a.numeroSessao}/${a.totalSessoes}  ·  ${a.categoria}` })),
  ];
  for (let i = 0; i < itens.length; i++) {
    const it = itens[i];
    garantirEspaco(ctx, 14);
    const fundo = i % 2 === 0 ? CORES.fundoLinha : "#FFFFFF";
    ctx.doc.rect(MARGIN, ctx.y, CONTENT_W, 13).fill(fundo);
    ctx.doc.rect(MARGIN, ctx.y, 3, 13).fill(it.cor);
    ctx.doc.fontSize(6.5).font("Helvetica-Bold").fillColor(it.cor)
      .text(it.tipo, MARGIN + 7, ctx.y + 3, { width: 40 });
    ctx.doc.fontSize(7.5).font("Helvetica-Bold").fillColor(CORES.cinzaTexto)
      .text(it.nome, MARGIN + 48, ctx.y + 3, { width: 230, ellipsis: true });
    ctx.doc.fontSize(7).font("Helvetica").fillColor(CORES.cinzaMedio)
      .text(it.spec, MARGIN + 282, ctx.y + 3, { width: CONTENT_W - 286, ellipsis: true });
    ctx.y += 13;
  }
  ctx.y += 4;
}

function desenharBlocoAplicavelFinanceiro(ctx: DrawCtx, fin: TratamentoSessao["financeiro"]): void {
  garantirEspaco(ctx, 60);
  desenharMiniHeaderAplicavel(ctx, "REFERÊNCIA FINANCEIRA  ·  valores estimados, cobrança em contrato comercial apartado", CORES.verde);
  for (let i = 0; i < fin.itens.length; i++) {
    const it = fin.itens[i];
    garantirEspaco(ctx, 13);
    const fundo = i % 2 === 0 ? CORES.fundoLinha : "#FFFFFF";
    ctx.doc.rect(MARGIN, ctx.y, CONTENT_W, 12).fill(fundo);
    ctx.doc.rect(MARGIN, ctx.y, 3, 12).fill(CORES.verde);
    const valor = it.precoReferencia != null ? `R$ ${it.precoReferencia.toFixed(2).replace(".", ",")}` : "—";
    ctx.doc.fontSize(7.5).font("Helvetica").fillColor(CORES.cinzaTexto)
      .text(it.descricao, MARGIN + 8, ctx.y + 3, { width: CONTENT_W - 110, ellipsis: true });
    ctx.doc.font("Helvetica-Bold").fillColor(it.precoReferencia != null ? CORES.verde : CORES.cinzaClaro)
      .text(valor, MARGIN + CONTENT_W - 95, ctx.y + 3, { width: 85, align: "right" });
    ctx.y += 12;
  }
  if (fin.totalReferencia != null) {
    garantirEspaco(ctx, 16);
    ctx.doc.rect(MARGIN, ctx.y, CONTENT_W, 15).fill(CORES.verde);
    ctx.doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.offWhite)
      .text("TOTAL REFERENCIAL (substâncias):", MARGIN + 8, ctx.y + 4, { width: CONTENT_W - 110 });
    ctx.doc.text(`R$ ${fin.totalReferencia.toFixed(2).replace(".", ",")}`, MARGIN + CONTENT_W - 95, ctx.y + 4, { width: 85, align: "right" });
    ctx.y += 16;
  }
  ctx.doc.fontSize(6.5).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro)
    .text(fin.observacao, MARGIN + 4, ctx.y + 2, { width: CONTENT_W - 8 });
  ctx.y += 12;
}

function desenharBlocoAplicavelDigital(ctx: DrawCtx, dados: DadosRacjPdf): void {
  garantirEspaco(ctx, 40);
  desenharMiniHeaderAplicavel(ctx, "MEIO DE ASSINATURA UTILIZADO  ·  conformidade ICP-Brasil + Lei 14.063/2020", CORES.lilas);
  const linhas: Array<[string, string]> = [["MEIO", dados.meioAssinatura.toUpperCase()]];
  if (dados.provedorAssinatura) linhas.push(["PROVEDOR", dados.provedorAssinatura]);
  if (dados.envelopeId) linhas.push(["ENVELOPE", dados.envelopeId]);
  for (let i = 0; i < linhas.length; i++) {
    const [k, v] = linhas[i];
    garantirEspaco(ctx, 13);
    const fundo = i % 2 === 0 ? CORES.fundoLinha : "#FFFFFF";
    ctx.doc.rect(MARGIN, ctx.y, CONTENT_W, 12).fill(fundo);
    ctx.doc.rect(MARGIN, ctx.y, 3, 12).fill(CORES.lilas);
    ctx.doc.fontSize(6.5).font("Helvetica-Bold").fillColor(CORES.lilas)
      .text(k, MARGIN + 8, ctx.y + 3, { width: 70 });
    ctx.doc.fontSize(7.5).font("Helvetica").fillColor(CORES.cinzaTexto)
      .text(v, MARGIN + 80, ctx.y + 3, { width: CONTENT_W - 86, ellipsis: true });
    ctx.y += 12;
  }
  ctx.y += 2;
}

// ====================== MAPA HANDLER ======================
type AplicavelHandler = "sumario" | "formulas" | "aplicacoesIm" | "aplicacoesEv" | "financeiro" | "digital" | "nenhum";
const MAPA_TERMO_ID_HANDLER: Record<number, AplicavelHandler> = {
  1: "nenhum", 2: "nenhum", 3: "nenhum",
  4: "sumario", 5: "formulas", 6: "aplicacoesIm", 7: "aplicacoesEv",
  12: "digital", 13: "financeiro",
};

function resolverHandler(termo: TermoEntrada): AplicavelHandler {
  if (MAPA_TERMO_ID_HANDLER[termo.id]) return MAPA_TERMO_ID_HANDLER[termo.id];
  const cat = termo.categoria.toLowerCase();
  if (cat === "tcle_global") return "sumario";
  if (cat === "ciencia_financeira") return "financeiro";
  if (cat === "aceite_digital") return "digital";
  if (cat === "consentimento_especifico") {
    const t = termo.titulo.toUpperCase();
    if (t.includes("CFOR") || t.includes("MANIPULADA")) return "formulas";
    if (t.includes("CIMU") || t.includes("INTRAMUSCULAR")) return "aplicacoesIm";
    if (t.includes("CEND") || t.includes("ENDOVENOSA")) return "aplicacoesEv";
    console.warn(`[racjPdf] termo id=${termo.id} sem mapeamento`);
  }
  return "nenhum";
}

function selecionarBlocoAplicavel(ctx: DrawCtx, termo: TermoEntrada, dados: DadosRacjPdf): boolean {
  const h = resolverHandler(termo);
  if (h === "sumario") { desenharBlocoAplicavelSumario(ctx, dados.tratamento); return true; }
  if (h === "formulas") { desenharBlocoAplicavelFormulas(ctx, dados.tratamento.formulas); return true; }
  if (h === "aplicacoesIm") { desenharBlocoAplicavelAplicacoes(ctx, dados.tratamento.aplicacoesIm, "IM"); return true; }
  if (h === "aplicacoesEv") { desenharBlocoAplicavelAplicacoes(ctx, dados.tratamento.aplicacoesEv, "EV"); return true; }
  if (h === "financeiro") { desenharBlocoAplicavelFinanceiro(ctx, dados.tratamento.financeiro); return true; }
  if (h === "digital") { desenharBlocoAplicavelDigital(ctx, dados); return true; }
  return false;
}

// ====================== HEADER / FOOTER ======================
function desenharCabecalhoCaderno(doc: PDFKit.PDFDocument, termo: TermoEntrada, totalCadernos: number, indiceCaderno: number, continuacao = false): number {
  const paleta = paletaPorBloco(termo);
  const cor = corPaleta(paleta);
  // Faixa colorida 16px topo com [bloco.sub vN] + [categoria humana inline] + [caderno X/Y]
  doc.rect(0, 0, W, 16).fill(cor);
  doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.offWhite)
    .text(`${termo.bloco}.${termo.subgrupo}  v${termo.versao}${continuacao ? "  ·  CONTINUAÇÃO" : ""}`, MARGIN, 4, { width: 150 });
  const rot = rotuloCategoria(termo);
  doc.fontSize(7).font("Helvetica").fillColor(CORES.offWhite)
    .text(rot.tecnico, MARGIN + 155, 4, { width: CONTENT_W - 260 });
  doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.offWhite)
    .text(`Caderno ${String(indiceCaderno).padStart(2, "0")} de ${String(totalCadernos).padStart(2, "0")}`, MARGIN + CONTENT_W - 100, 4, { width: 100, align: "right" });

  if (continuacao) {
    // continuação compacta: faixa + 1 linha de "continuação de Caderno X — Titulo humano"
    doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaMedio)
      .text(`continuação · ${rot.humano}`, MARGIN, 22, { width: CONTENT_W });
    return 38;
  }

  // Selo cor 3px lateral + título humano grande inline
  doc.rect(MARGIN, 22, 3, 30).fill(cor);
  doc.fontSize(13).font("Helvetica-Bold").fillColor(CORES.azulPetroleoEscuro)
    .text(rot.humano, MARGIN + 9, 22, { width: CONTENT_W - 9 });
  doc.fontSize(7).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro)
    .text(termo.titulo, MARGIN + 9, 40, { width: CONTENT_W - 9, ellipsis: true });
  // Régua sutil
  doc.moveTo(MARGIN, 56).lineTo(MARGIN + CONTENT_W, 56).lineWidth(0.4).stroke(CORES.separador);
  return 62;
}

function desenharFooterPagina(doc: PDFKit.PDFDocument, dados: DadosRacjPdf, pagAtual: number, pagTotal: number): void {
  // Legenda densa de cores (igual Craniotomia footer)
  const ly = FOOTER_Y - 14;
  doc.fontSize(6).font("Helvetica").fillColor(CORES.cinzaMedio);
  let lx = MARGIN;
  const itens: Array<[string, string]> = [
    ["■", CORES.azulPetroleo], ["JURI.BASE", "label"],
    ["■", CORES.douradoQueimado], ["JURI.CONS", "label"],
    ["■", CORES.lilas], ["JURI.DIGI", "label"],
    ["■", CORES.verde], ["FINA", "label"],
  ];
  for (let i = 0; i < itens.length; i += 2) {
    const [sym, cor] = itens[i];
    const [label] = itens[i + 1];
    doc.fillColor(cor).text(sym, lx, ly);
    lx += 8;
    doc.fillColor(CORES.cinzaMedio).text(label, lx, ly);
    lx += doc.widthOfString(label, { font: "Helvetica", size: 6 }) + 10;
  }
  doc.fillColor(CORES.cinzaClaro).text(`espessura do selo = bloco · cor = paleta institucional`, lx, ly);

  // Token + identificação + paginação
  if (dados.tokenVerificacao) {
    doc.fontSize(6).font("Helvetica").fillColor(CORES.cinzaMedio)
      .text(`Verificação: pawards.med.br/v/${dados.tokenVerificacao}`, MARGIN, FOOTER_Y - 2, { width: 280 });
  }
  doc.fontSize(6).font("Helvetica").fillColor(CORES.cinzaMedio)
    .text(`RACJ · ${dados.tratamento.paciente.codigoSemantico ?? `paciente#${dados.tratamento.paciente.id}`} · ${dados.tratamento.unidade.nome}`, MARGIN, FOOTER_Y + 8, { width: 360 });
  doc.fontSize(6).font("Helvetica-Bold").fillColor(CORES.cinzaMedio)
    .text(`pág ${pagAtual} / ${pagTotal}`, MARGIN + CONTENT_W - 60, FOOTER_Y + 8, { width: 60, align: "right" });
  doc.fontSize(5.5).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro)
    .text("PAWARDS — Sistema de Gestão Clínica Integrativa  ·  Manifesto Blueprint v2.0  ·  Developed by Pawards MedCore", MARGIN, FOOTER_Y + 16, { width: CONTENT_W, align: "center" });
}

// ====================== GERADOR PRINCIPAL ======================
export function gerarPdfRacj(dados: DadosRacjPdf): PassThrough {
  const stream = new PassThrough();
  const doc = new PDFDocument({ size: "A4", margins: { top: 36, bottom: 50, left: MARGIN, right: MARGIN }, bufferPages: true });
  doc.pipe(stream);

  const totalCadernos = dados.termos.length;
  const t = dados.tratamento;
  const dataFmt = new Date(dados.dataAssinatura + "T00:00:00").toLocaleDateString("pt-BR");
  const idade = t.paciente.dataNascimento ? Math.floor((Date.now() - new Date(t.paciente.dataNascimento).getTime()) / 31557600000) + " anos" : "—";

  // =================================================================
  // CAPA DENSA (estilo Craniotomia: header + KPI bar + matriz-espelho)
  // =================================================================
  // Header institucional (faixa cinza + azul petróleo) — 60px total
  doc.rect(0, 0, W, 14).fill(CORES.fundoBlocoClaro);
  doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.azulPetroleoEscuro)
    .text("RACJ · REGISTRO DE ACEITE E CONSENTIMENTO JURÍDICO", MARGIN, 4, { width: CONTENT_W - 120 });
  doc.fontSize(6).font("Helvetica").fillColor(CORES.cinzaMedio)
    .text(`Sessão ${t.sessao.id}  ·  ${dataFmt}  ·  ${dados.meioAssinatura.toUpperCase()}`, MARGIN + CONTENT_W - 200, 4, { width: 200, align: "right" });

  doc.rect(0, 14, W, 46).fill(CORES.azulPetroleo);
  doc.fontSize(20).font("Helvetica-Bold").fillColor(CORES.offWhite).text("RACJ", MARGIN, 22, { width: 100 });
  doc.fontSize(8).font("Helvetica").fillColor(CORES.douradoSuave)
    .text("Registro de Aceite e Consentimento Jurídico  ·  Manifesto Blueprint v2.0", MARGIN + 60, 26, { width: 360 });
  doc.fontSize(7).font("Helvetica").fillColor(CORES.offWhite)
    .text("PADCON UNIVERSAL  ·  Espelho semântico do tratamento desta sessão", MARGIN + 60, 38, { width: 360 });
  doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.douradoSuave)
    .text("PAWARDS", MARGIN + CONTENT_W - 120, 22, { width: 120, align: "right" });
  doc.fontSize(6).font("Helvetica").fillColor(CORES.offWhite)
    .text(t.unidade.nome.toUpperCase(), MARGIN + CONTENT_W - 120, 34, { width: 120, align: "right" });
  doc.fontSize(6).font("Helvetica").fillColor(CORES.offWhite)
    .text("Gestão Clínica Integrativa", MARGIN + CONTENT_W - 120, 44, { width: 120, align: "right" });

  let y = 68;

  // Identificação compacta (2 linhas, fundo bege)
  doc.rect(MARGIN, y, CONTENT_W, 30).fill(CORES.fundoBloco);
  doc.rect(MARGIN, y, 3, 30).fill(CORES.douradoQueimado);
  doc.fontSize(11).font("Helvetica-Bold").fillColor(CORES.cinzaTexto)
    .text(t.paciente.nome, MARGIN + 8, y + 3, { width: CONTENT_W - 16 });
  doc.fontSize(7).font("Helvetica").fillColor(CORES.cinzaMedio)
    .text(`CPF ${t.paciente.cpf ?? "—"}  ·  ${idade}  ·  ${t.paciente.genero ?? "—"}  ·  CS ${t.paciente.codigoSemantico ?? "—"}  ·  ${t.paciente.whatsapp ?? t.paciente.telefone ?? "—"}`, MARGIN + 8, y + 18, { width: CONTENT_W - 16 });
  y += 33;

  // Linha médico + unidade
  doc.rect(MARGIN, y, CONTENT_W, 22).fill(CORES.fundoBlocoClaro);
  doc.rect(MARGIN, y, 3, 22).fill(CORES.azulPetroleo);
  doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.azulPetroleoEscuro)
    .text(t.profissional.nome, MARGIN + 8, y + 3, { width: 280 });
  doc.fontSize(7).font("Helvetica").fillColor(CORES.cinzaMedio)
    .text(t.profissional.crm ?? "—", MARGIN + 8, y + 13, { width: 280 });
  const endereco = [t.unidade.endereco, t.unidade.bairro, t.unidade.cidade ? `${t.unidade.cidade}/${t.unidade.estado ?? ""}` : null, t.unidade.cep ? `CEP ${t.unidade.cep}` : null].filter(Boolean).join(" · ");
  doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.azulPetroleoEscuro)
    .text(t.unidade.nome, MARGIN + 295, y + 3, { width: CONTENT_W - 303, align: "right" });
  doc.fontSize(6.5).font("Helvetica").fillColor(CORES.cinzaMedio)
    .text(endereco || "—", MARGIN + 295, y + 13, { width: CONTENT_W - 303, align: "right" });
  y += 26;

  // ===== KPI BAR (estilo Craniotomia header) =====
  y = desenharKpiBar(doc, y, [
    { label: "TERMOS", value: String(totalCadernos), cor: CORES.azulPetroleo },
    { label: "FÓRMULAS", value: String(t.formulas.length), cor: CORES.douradoQueimado },
    { label: "INJ. IM", value: String(t.aplicacoesIm.length), cor: CORES.azulPetroleo },
    { label: "INJ. EV", value: String(t.aplicacoesEv.length), cor: CORES.bloqueado },
    { label: "SESSÃO", value: `#${t.sessao.id}`, cor: CORES.lilas },
    { label: "MEIO", value: dados.meioAssinatura === "presencial" ? "PRESENCIAL" : "ELETRÔNICO", cor: CORES.verde },
    { label: "STATUS", value: "ATIVO", cor: CORES.verde },
  ]);
  y += 4;

  // ===== MATRIZ-ESPELHO (estilo Craniotomia matriz: 1 linha por termo) =====
  doc.rect(MARGIN, y, CONTENT_W, 14).fill(CORES.azulPetroleoEscuro);
  doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.offWhite)
    .text("MATRIZ-ESPELHO  ·  todos os termos consentidos  ·  espelhada com os cadernos individuais a seguir", MARGIN + 6, y + 4, { width: CONTENT_W - 12 });
  y += 14;

  // Header tabela matriz
  doc.rect(MARGIN, y, CONTENT_W, 11).fill(CORES.fundoBloco);
  doc.fontSize(6).font("Helvetica-Bold").fillColor(CORES.cinzaMedio);
  doc.text("#", MARGIN + 6, y + 3, { width: 14 });
  doc.text("BLOCO.SUB", MARGIN + 22, y + 3, { width: 60 });
  doc.text("CATEGORIA HUMANA", MARGIN + 86, y + 3, { width: 220 });
  doc.text("vN", MARGIN + 308, y + 3, { width: 24 });
  doc.text("PERSONALIZAÇÃO APLICÁVEL", MARGIN + 336, y + 3, { width: 130 });
  doc.text("CADERNO", MARGIN + CONTENT_W - 50, y + 3, { width: 46, align: "right" });
  y += 11;

  for (let i = 0; i < dados.termos.length; i++) {
    const termo = dados.termos[i];
    const paleta = paletaPorBloco(termo);
    const cor = corPaleta(paleta);
    const rot = rotuloCategoria(termo);
    const h = resolverHandler(termo);
    const aplLabel: Record<AplicavelHandler, string> = {
      sumario: "sumário consolidado",
      formulas: `${t.formulas.length} fórmula(s)`,
      aplicacoesIm: `${t.aplicacoesIm.length} injetável(eis) IM`,
      aplicacoesEv: `${t.aplicacoesEv.length} injetável(eis) EV`,
      financeiro: "tabela de valores",
      digital: "envelope + provedor",
      nenhum: "— termo genérico —",
    };
    const fundo = i % 2 === 0 ? CORES.fundoLinha : "#FFFFFF";
    doc.rect(MARGIN, y, CONTENT_W, 13).fill(fundo);
    doc.rect(MARGIN, y, 3, 13).fill(cor);
    doc.fontSize(7).font("Helvetica").fillColor(CORES.cinzaMedio)
      .text(String(i + 1).padStart(2, "0"), MARGIN + 6, y + 3, { width: 14 });
    doc.fontSize(7).font("Helvetica-Bold").fillColor(cor)
      .text(`${termo.bloco}.${termo.subgrupo}`, MARGIN + 22, y + 3, { width: 60 });
    doc.fontSize(7.5).font("Helvetica").fillColor(CORES.cinzaTexto)
      .text(rot.humano, MARGIN + 86, y + 3, { width: 220, ellipsis: true });
    doc.fontSize(7).font("Helvetica").fillColor(CORES.cinzaMedio)
      .text(`v${termo.versao}`, MARGIN + 308, y + 3, { width: 24 });
    doc.fontSize(7).font(h === "nenhum" ? "Helvetica-Oblique" : "Helvetica-Bold").fillColor(h === "nenhum" ? CORES.cinzaClaro : CORES.douradoQueimado)
      .text(aplLabel[h], MARGIN + 336, y + 3, { width: 130, ellipsis: true });
    doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.azulPetroleoEscuro)
      .text(String(i + 2).padStart(2, "0"), MARGIN + CONTENT_W - 50, y + 3, { width: 46, align: "right" });
    y += 13;
  }

  y += 6;
  // Faixa final capa (declaração de aceite)
  doc.rect(MARGIN, y, CONTENT_W, 22).fill(CORES.douradoQueimado);
  doc.fontSize(7.5).font("Helvetica-Bold").fillColor(CORES.offWhite)
    .text(`Pelo aceite a seguir, ${t.paciente.nome.split(" ")[0]} consente integralmente os ${totalCadernos} termos jurídicos abaixo, na versão vigente em ${dataFmt}.`, MARGIN + 8, y + 4, { width: CONTENT_W - 16 });
  doc.fontSize(6).font("Helvetica").fillColor(CORES.offWhite)
    .text("Texto integral imutável  ·  fonte: termos_juridicos  ·  hash auditado em termos_assinados", MARGIN + 8, y + 14, { width: CONTENT_W - 16 });

  // =================================================================
  // CADERNOS POR TERMO (cabeçalho denso 50px)
  // =================================================================
  let indiceCaderno = 1;
  for (const termo of dados.termos) {
    doc.addPage();
    const ctx: DrawCtx = { doc, y: desenharCabecalhoCaderno(doc, termo, totalCadernos, indiceCaderno) };

    selecionarBlocoAplicavel(ctx, termo, dados);

    // Texto jurídico integral (com listener de continuação)
    garantirEspaco(ctx, 18);
    ctx.doc.rect(MARGIN, ctx.y, CONTENT_W, 11).fill(CORES.fundoBloco);
    ctx.doc.fontSize(6.5).font("Helvetica-Bold").fillColor(CORES.cinzaMedio)
      .text("TEXTO JURÍDICO INTEGRAL  ·  termos_juridicos  ·  versionado  ·  hash auditado", MARGIN + 6, ctx.y + 3, { width: CONTENT_W - 12 });
    ctx.y += 13;

    const onPageAdded = () => {
      const yCont = desenharCabecalhoCaderno(doc, termo, totalCadernos, indiceCaderno, true);
      doc.y = yCont;
    };
    doc.on("pageAdded", onPageAdded);
    try {
      ctx.doc.fontSize(8.5).font("Helvetica").fillColor(CORES.cinzaTexto)
        .text(termo.textoCompleto, MARGIN, ctx.y, { width: CONTENT_W, align: "justify", lineGap: 1 });
    } finally {
      doc.off("pageAdded", onPageAdded);
    }
    ctx.y = doc.y + 10;

    // Bloco assinatura denso (nunca órfão)
    if (ctx.y + 50 > SAFE_BOTTOM) {
      doc.addPage();
      ctx.y = desenharCabecalhoCaderno(doc, termo, totalCadernos, indiceCaderno, true);
    }
    ctx.doc.rect(MARGIN, ctx.y, CONTENT_W, 30).fill(CORES.fundoBlocoClaro);
    ctx.doc.rect(MARGIN, ctx.y, 3, 30).fill(corPaleta(paletaPorBloco(termo)));
    ctx.doc.fontSize(6.5).font("Helvetica-Bold").fillColor(CORES.cinzaMedio)
      .text("ACEITE", MARGIN + 8, ctx.y + 4, { width: 60 });
    ctx.doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.cinzaTexto)
      .text(t.paciente.nome, MARGIN + 8, ctx.y + 13, { width: 240 });
    ctx.doc.fontSize(6.5).font("Helvetica").fillColor(CORES.cinzaMedio)
      .text(`paciente · CPF ${t.paciente.cpf ?? "—"}`, MARGIN + 8, ctx.y + 22, { width: 240 });
    ctx.doc.fontSize(6.5).font("Helvetica-Bold").fillColor(CORES.cinzaMedio)
      .text("VALIDAÇÃO MÉDICA", MARGIN + 260, ctx.y + 4, { width: 120 });
    ctx.doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.cinzaTexto)
      .text(t.profissional.nome, MARGIN + 260, ctx.y + 13, { width: CONTENT_W - 268 });
    ctx.doc.fontSize(6.5).font("Helvetica").fillColor(CORES.cinzaMedio)
      .text(`médico responsável · ${t.profissional.crm ?? ""}`, MARGIN + 260, ctx.y + 22, { width: CONTENT_W - 268 });
    ctx.y += 32;
    ctx.doc.fontSize(6.5).font("Helvetica-Bold").fillColor(CORES.douradoQueimado)
      .text(`Assinado ${dados.meioAssinatura === "presencial" ? "presencialmente" : "eletronicamente"} em ${dataFmt}${dados.observacaoSessao ? "  ·  " + dados.observacaoSessao : ""}`, MARGIN, ctx.y, { width: CONTENT_W, align: "center" });

    indiceCaderno++;
  }

  // FOOTER em todas as páginas
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    desenharFooterPagina(doc, dados, i + 1, range.count);
  }

  doc.end();
  return stream;
}

export function streamParaBufferRacj(stream: PassThrough): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (c) => chunks.push(c));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

export function tokenVerificacaoRacj(pacienteId: number, sessaoId: number, dataAssinatura: string): string {
  return createHash("sha256")
    .update(`racj-${pacienteId}-${sessaoId}-${dataAssinatura}`)
    .digest("hex")
    .slice(0, 16);
}
