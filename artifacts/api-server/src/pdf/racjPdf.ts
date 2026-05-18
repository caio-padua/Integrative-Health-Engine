/**
 * GERADOR DE PDF — RACJ (Registro de Aceite e Consentimento Juridico)
 * Manifesto Blueprint v2.0 — paleta institucional Pawards.
 *
 * Texto juridico integral vem de termos_juridicos.texto_completo (fonte unica
 * de verdade, validado juridicamente, nunca alterado pelo gerador).
 *
 * Personalizacao por categoria de termo:
 *  - JURI.BASE (LGPD/Privacidade/NaoGarantia): apenas selo "termo generico"
 *  - JURI.CONS tcle_global (id=4): sumario consolidado do plano
 *  - JURI.CONS CFOR (id=5): tabela formula manipulada
 *  - JURI.CONS CIMU (id=6): tabela aplicacoes IM
 *  - JURI.CONS CEND (id=7): tabela aplicacoes EV
 *  - JURI.DIGI (id=12): selo aceite digital + provedor
 *  - FINA.CIEN (id=13): bloco financeiro referencial
 *
 * Origem: Plano Dr. Claude 18/mai/2026.
 */

import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import { createHash } from "node:crypto";
import type { TratamentoSessao } from "../lib/clinica/carregarTratamentoSessao";

const CORES = {
  azulPetroleo: "#1F4E5F",
  azulPetroleoClaro: "#2A6B8C",
  offWhite: "#F5F0E8",
  douradoQueimado: "#B8860B",
  lilas: "#7A5C8A",
  verdeFinanceiro: "#4E8D52",
  cinzaTexto: "#333333",
  cinzaClaro: "#666666",
  fundoBloco: "#E8E4DC",
  fundoBlocoClaro: "#EFEFEF",
  fundoFaixaBase: "#1F4E5F",
  fundoFaixaCons: "#B8860B",
  fundoFaixaDigi: "#7A5C8A",
  fundoFaixaFina: "#4E8D52",
};

const W = 595;
const MARGIN = 40;
const CONTENT_W = W - MARGIN * 2;
const PAGE_H = 842;
const FOOTER_Y = 802;
const SAFE_BOTTOM = 770;

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

function fundoFaixa(p: PaletaCategoria): string {
  if (p === "CONS") return CORES.fundoFaixaCons;
  if (p === "DIGI") return CORES.fundoFaixaDigi;
  if (p === "FINA") return CORES.fundoFaixaFina;
  return CORES.fundoFaixaBase;
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
  if (cat === "lgpd") return { humano: "Proteção dos seus dados pessoais", tecnico: "JURI.BASE — Conformidade LGPD Lei 13.709/2018" };
  if (cat === "privacidade") return { humano: "Sigilo médico e privacidade", tecnico: "JURI.BASE — Conformidade CFM + LGPD" };
  if (cat === "nao_garantia") return { humano: "Ciência sobre não-garantia de resultados", tecnico: "JURI.BASE — Obrigação de meio (CDC art. 14 §4º)" };
  if (cat === "tcle_global") return { humano: "Consentimento para o plano terapêutico integrado", tecnico: "JURI.CONS — TCLE Global do Protocolo" };
  if (cat === "consentimento_especifico") {
    const t = termo.titulo.toUpperCase();
    if (t.includes("CFOR") || t.includes("MANIPULADA")) return { humano: "Consentimento — fórmulas manipuladas", tecnico: "JURI.CONS — CFOR (RDC 67)" };
    if (t.includes("CIMU") || t.includes("INTRAMUSCULAR")) return { humano: "Consentimento — aplicações intramusculares", tecnico: "JURI.CONS — CIMU" };
    if (t.includes("CEND") || t.includes("ENDOVENOSA")) return { humano: "Consentimento — aplicações endovenosas", tecnico: "JURI.CONS — CEND" };
    return { humano: termo.titulo, tecnico: `${termo.bloco}.${termo.subgrupo}` };
  }
  if (cat === "aceite_digital") return { humano: "Aceite digital e validade jurídica", tecnico: "JURI.DIGI — Assinatura eletrônica ICP-Brasil" };
  if (cat === "ciencia_financeira") return { humano: "Ciência financeira do protocolo", tecnico: "FINA.CIEN — Aceitação comercial" };
  return { humano: termo.titulo, tecnico: `${termo.bloco}.${termo.subgrupo}` };
}

interface DrawCtx {
  doc: PDFKit.PDFDocument;
  y: number;
}

function garantirEspaco(ctx: DrawCtx, alturaNecessaria: number, onAddPage?: () => void): void {
  if (ctx.y + alturaNecessaria > SAFE_BOTTOM) {
    ctx.doc.addPage();
    ctx.y = 60;
    if (onAddPage) onAddPage();
  }
}

function desenharFaixaTopo(doc: PDFKit.PDFDocument, paleta: PaletaCategoria, rotuloEsquerda: string, rotuloDireita: string): void {
  doc.rect(0, 0, W, 22).fill(fundoFaixa(paleta));
  doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.offWhite).text(rotuloEsquerda, MARGIN, 7, { width: CONTENT_W - 120 });
  doc.fontSize(7).font("Helvetica").fillColor(CORES.offWhite).text(rotuloDireita, MARGIN + CONTENT_W - 120, 7, { width: 120, align: "right" });
}

function desenharFooterPagina(doc: PDFKit.PDFDocument, paciente: TratamentoSessao["paciente"], pagAtual: number, pagTotal: number, tokenVerif: string | undefined): void {
  if (tokenVerif) {
    doc.fontSize(6).font("Helvetica").fillColor(CORES.cinzaClaro)
      .text(`Verificação: pawards.med.br/v/${tokenVerif}`, MARGIN, FOOTER_Y - 12, { width: CONTENT_W, align: "center" });
  }
  doc.fontSize(5.5).font("Helvetica").fillColor(CORES.cinzaClaro)
    .text(
      `RACJ — ${paciente.codigoSemantico ?? `paciente#${paciente.id}`} — página ${pagAtual} de ${pagTotal}  •  PAWARDS Instituto Pádua  •  Manifesto Blueprint v2.0  •  Developed by Pawards MedCore`,
      MARGIN, FOOTER_Y, { width: CONTENT_W, align: "center" },
    );
}

function desenharBlocoAplicavelFormulas(ctx: DrawCtx, formulas: TratamentoSessao["formulas"]): void {
  if (formulas.length === 0) return;
  garantirEspaco(ctx, 60);
  ctx.doc.rect(MARGIN, ctx.y, CONTENT_W, 4).fill(CORES.douradoQueimado);
  ctx.y += 8;
  ctx.doc.fontSize(10).font("Helvetica-Bold").fillColor(CORES.azulPetroleo)
    .text("APLICÁVEL A ESTE PACIENTE", MARGIN, ctx.y, { width: CONTENT_W });
  ctx.y += 13;
  ctx.doc.fontSize(7).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro)
    .text(`Fórmula(s) manipulada(s) ativa(s) — fonte: revo_medicamentos`, MARGIN, ctx.y, { width: CONTENT_W });
  ctx.y += 14;
  for (const f of formulas) {
    garantirEspaco(ctx, 56);
    ctx.doc.rect(MARGIN, ctx.y, CONTENT_W, 52).fill(CORES.fundoBloco);
    ctx.doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.cinzaTexto)
      .text(f.nome, MARGIN + 8, ctx.y + 6, { width: CONTENT_W - 16 });
    ctx.doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto)
      .text(`Posologia: ${f.posologia ?? "—"}`, MARGIN + 8, ctx.y + 20, { width: CONTENT_W - 16 });
    if (f.indicacaoClinica) {
      ctx.doc.fontSize(8).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro)
        .text(`Indicação: ${f.indicacaoClinica}`, MARGIN + 8, ctx.y + 33, { width: CONTENT_W - 16 });
    }
    if (f.duracaoDescricao) {
      ctx.doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.douradoQueimado)
        .text(`Duração: ${f.duracaoDescricao}`, MARGIN + 8, ctx.y + 44, { width: CONTENT_W - 16 });
    }
    ctx.y += 58;
  }
}

function desenharBlocoAplicavelAplicacoes(ctx: DrawCtx, aplicacoes: TratamentoSessao["aplicacoesIm"], rotuloVia: string): void {
  if (aplicacoes.length === 0) return;
  garantirEspaco(ctx, 40);
  ctx.doc.rect(MARGIN, ctx.y, CONTENT_W, 4).fill(CORES.douradoQueimado);
  ctx.y += 8;
  ctx.doc.fontSize(10).font("Helvetica-Bold").fillColor(CORES.azulPetroleo)
    .text("APLICÁVEL A ESTE PACIENTE", MARGIN, ctx.y, { width: CONTENT_W });
  ctx.y += 13;
  ctx.doc.fontSize(7).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro)
    .text(`Aplicação(ões) ${rotuloVia} agendada(s) nesta sessão — fonte: aplicacoes_substancias`, MARGIN, ctx.y, { width: CONTENT_W });
  ctx.y += 14;
  // header tabela
  ctx.doc.rect(MARGIN, ctx.y, CONTENT_W, 14).fill(CORES.fundoBlocoClaro);
  ctx.doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.cinzaTexto);
  ctx.doc.text("Substância", MARGIN + 6, ctx.y + 4, { width: 220 });
  ctx.doc.text("Dose", MARGIN + 230, ctx.y + 4, { width: 80 });
  ctx.doc.text("Via", MARGIN + 314, ctx.y + 4, { width: 40 });
  ctx.doc.text("Sessão", MARGIN + 358, ctx.y + 4, { width: 50 });
  ctx.doc.text("Categoria", MARGIN + 412, ctx.y + 4, { width: 103 });
  ctx.y += 14;
  for (const a of aplicacoes) {
    garantirEspaco(ctx, 16);
    ctx.doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto);
    ctx.doc.text(a.substanciaNome, MARGIN + 6, ctx.y + 3, { width: 220 });
    ctx.doc.text(a.dose, MARGIN + 230, ctx.y + 3, { width: 80 });
    ctx.doc.text(a.via.toUpperCase(), MARGIN + 314, ctx.y + 3, { width: 40 });
    ctx.doc.text(`${a.numeroSessao}/${a.totalSessoes}`, MARGIN + 358, ctx.y + 3, { width: 50 });
    ctx.doc.text(a.categoria, MARGIN + 412, ctx.y + 3, { width: 103 });
    ctx.y += 14;
    ctx.doc.moveTo(MARGIN, ctx.y).lineTo(MARGIN + CONTENT_W, ctx.y).lineWidth(0.3).stroke(CORES.cinzaClaro);
  }
  ctx.y += 6;
}

function desenharBlocoAplicavelSumario(ctx: DrawCtx, t: TratamentoSessao): void {
  garantirEspaco(ctx, 80);
  ctx.doc.rect(MARGIN, ctx.y, CONTENT_W, 4).fill(CORES.douradoQueimado);
  ctx.y += 8;
  ctx.doc.fontSize(10).font("Helvetica-Bold").fillColor(CORES.azulPetroleo)
    .text("PLANO TERAPÊUTICO CONSENTIDO NESTA SESSÃO", MARGIN, ctx.y, { width: CONTENT_W });
  ctx.y += 14;
  const linhas = [
    `${t.formulas.length} fórmula(s) manipulada(s) ativa(s)`,
    `${t.aplicacoesIm.length} aplicação(ões) intramuscular(es) (IM) agendada(s)`,
    `${t.aplicacoesEv.length} aplicação(ões) endovenosa(s) (EV) agendada(s)`,
  ];
  if (t.outrasAplicacoes.length > 0) linhas.push(`${t.outrasAplicacoes.length} aplicação(ões) por outras vias`);
  ctx.doc.fontSize(9).font("Helvetica").fillColor(CORES.cinzaTexto);
  for (const l of linhas) {
    ctx.doc.text(`• ${l}`, MARGIN + 10, ctx.y, { width: CONTENT_W - 20 });
    ctx.y += 13;
  }
  ctx.y += 4;
}

function desenharBlocoAplicavelFinanceiro(ctx: DrawCtx, fin: TratamentoSessao["financeiro"]): void {
  garantirEspaco(ctx, 60);
  ctx.doc.rect(MARGIN, ctx.y, CONTENT_W, 4).fill(CORES.verdeFinanceiro);
  ctx.y += 8;
  ctx.doc.fontSize(10).font("Helvetica-Bold").fillColor(CORES.azulPetroleo)
    .text("REFERÊNCIA FINANCEIRA", MARGIN, ctx.y, { width: CONTENT_W });
  ctx.y += 14;
  ctx.doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto);
  for (const it of fin.itens) {
    garantirEspaco(ctx, 14);
    const valor = it.precoReferencia != null ? `R$ ${it.precoReferencia.toFixed(2).replace(".", ",")}` : "—";
    ctx.doc.text(it.descricao, MARGIN + 10, ctx.y, { width: CONTENT_W - 110 });
    ctx.doc.text(valor, MARGIN + CONTENT_W - 90, ctx.y, { width: 80, align: "right" });
    ctx.y += 13;
  }
  ctx.y += 4;
  if (fin.totalReferencia != null) {
    ctx.doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.verdeFinanceiro)
      .text(`Total referencial (substâncias): R$ ${fin.totalReferencia.toFixed(2).replace(".", ",")}`, MARGIN + 10, ctx.y, { width: CONTENT_W - 20, align: "right" });
    ctx.y += 14;
  }
  ctx.doc.fontSize(7).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro)
    .text(fin.observacao, MARGIN + 10, ctx.y, { width: CONTENT_W - 20 });
  ctx.y += 16;
}

function desenharBlocoAplicavelDigital(ctx: DrawCtx, dados: DadosRacjPdf): void {
  garantirEspaco(ctx, 50);
  ctx.doc.rect(MARGIN, ctx.y, CONTENT_W, 4).fill(CORES.lilas);
  ctx.y += 8;
  ctx.doc.fontSize(10).font("Helvetica-Bold").fillColor(CORES.azulPetroleo)
    .text("MEIO DE ASSINATURA UTILIZADO", MARGIN, ctx.y, { width: CONTENT_W });
  ctx.y += 14;
  const linhas = [
    `Meio: ${dados.meioAssinatura.toUpperCase()}`,
  ];
  if (dados.provedorAssinatura) linhas.push(`Provedor: ${dados.provedorAssinatura}`);
  if (dados.envelopeId) linhas.push(`Envelope: ${dados.envelopeId}`);
  ctx.doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto);
  for (const l of linhas) {
    ctx.doc.text(l, MARGIN + 10, ctx.y, { width: CONTENT_W - 20 });
    ctx.y += 12;
  }
  ctx.y += 4;
}

// Mapa canonico (id de termo_juridicos → handler de personalizacao).
// Estavel contra mudanca de titulo. Categoria/subgrupo servem como fallback.
type AplicavelHandler = "sumario" | "formulas" | "aplicacoesIm" | "aplicacoesEv" | "financeiro" | "digital" | "nenhum";

const MAPA_TERMO_ID_HANDLER: Record<number, AplicavelHandler> = {
  1: "nenhum",      // LGPD
  2: "nenhum",      // Privacidade
  3: "nenhum",      // Nao-Garantia
  4: "sumario",     // TCLE Global
  5: "formulas",    // CFOR
  6: "aplicacoesIm",// CIMU
  7: "aplicacoesEv",// CEND
  12: "digital",    // Aceite Digital
  13: "financeiro", // Ciencia Financeira
};

function resolverHandler(termo: TermoEntrada): AplicavelHandler {
  if (MAPA_TERMO_ID_HANDLER[termo.id]) return MAPA_TERMO_ID_HANDLER[termo.id];
  // Fallback por categoria semantica
  const cat = termo.categoria.toLowerCase();
  if (cat === "tcle_global") return "sumario";
  if (cat === "ciencia_financeira") return "financeiro";
  if (cat === "aceite_digital") return "digital";
  if (cat === "consentimento_especifico") {
    const t = termo.titulo.toUpperCase();
    if (t.includes("CFOR") || t.includes("MANIPULADA")) return "formulas";
    if (t.includes("CIMU") || t.includes("INTRAMUSCULAR")) return "aplicacoesIm";
    if (t.includes("CEND") || t.includes("ENDOVENOSA")) return "aplicacoesEv";
    console.warn(`[racjPdf] termo id=${termo.id} categoria=${cat} sem mapeamento aplicavel — renderizado sem personalizacao`);
  }
  return "nenhum";
}

function selecionarBlocoAplicavel(ctx: DrawCtx, termo: TermoEntrada, dados: DadosRacjPdf): void {
  const h = resolverHandler(termo);
  if (h === "sumario") return desenharBlocoAplicavelSumario(ctx, dados.tratamento);
  if (h === "formulas") return desenharBlocoAplicavelFormulas(ctx, dados.tratamento.formulas);
  if (h === "aplicacoesIm") return desenharBlocoAplicavelAplicacoes(ctx, dados.tratamento.aplicacoesIm, "intramuscular");
  if (h === "aplicacoesEv") return desenharBlocoAplicavelAplicacoes(ctx, dados.tratamento.aplicacoesEv, "endovenosa");
  if (h === "financeiro") return desenharBlocoAplicavelFinanceiro(ctx, dados.tratamento.financeiro);
  if (h === "digital") return desenharBlocoAplicavelDigital(ctx, dados);
}

function desenharCabecalhoCaderno(doc: PDFKit.PDFDocument, termo: TermoEntrada, totalCadernos: number, indiceCaderno: number, continuacao = false): number {
  const paleta = paletaPorBloco(termo);
  desenharFaixaTopo(
    doc, paleta,
    `${termo.bloco}.${termo.subgrupo} — versão ${termo.versao}${continuacao ? "  •  (continuação)" : ""}`,
    `Caderno ${indiceCaderno} de ${totalCadernos}`,
  );
  doc.rect(MARGIN, 38, 4, 38).fill(CORES.douradoQueimado);
  const rot = rotuloCategoria(termo);
  doc.fontSize(continuacao ? 12 : 14).font("Helvetica-Bold").fillColor(CORES.azulPetroleo)
    .text(rot.humano + (continuacao ? " (continuação)" : ""), MARGIN + 12, 38, { width: CONTENT_W - 12 });
  doc.fontSize(8).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro)
    .text(rot.tecnico, MARGIN + 12, 58, { width: CONTENT_W - 12 });
  if (!continuacao) {
    doc.fontSize(7).font("Helvetica").fillColor(CORES.cinzaClaro)
      .text(termo.titulo, MARGIN + 12, 70, { width: CONTENT_W - 12 });
    return 92;
  }
  return 80;
}

export function gerarPdfRacj(dados: DadosRacjPdf): PassThrough {
  const stream = new PassThrough();
  const doc = new PDFDocument({ size: "A4", margins: { top: MARGIN, bottom: 40, left: MARGIN, right: MARGIN }, bufferPages: true });
  doc.pipe(stream);

  const totalCadernos = dados.termos.length;

  // =================================================================
  // CAPA — Manifesto Blueprint v2.0
  // =================================================================
  doc.rect(0, 0, W, 28).fill(CORES.fundoBlocoClaro);
  doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.azulPetroleo)
    .text("RACJ — REGISTRO DE ACEITE E CONSENTIMENTO JURÍDICO", MARGIN, 9, { width: CONTENT_W });

  doc.rect(0, 28, W, 70).fill(CORES.azulPetroleo);
  doc.fontSize(18).font("Helvetica-Bold").fillColor(CORES.offWhite).text("RACJ", MARGIN, 42, { width: 360 });
  doc.fontSize(9).font("Helvetica").fillColor(CORES.douradoQueimado)
    .text("Registro de Aceite e Consentimento Jurídico", MARGIN, 64);
  doc.fontSize(8).font("Helvetica").fillColor(CORES.offWhite)
    .text("PADCON UNIVERSAL  •  Manifesto Blueprint v2.0", MARGIN, 78);
  doc.fontSize(9).font("Helvetica-Bold").fillColor(CORES.douradoQueimado)
    .text("PAWARDS", 435, 42, { width: 120, align: "right" });
  doc.fontSize(6).font("Helvetica").fillColor(CORES.offWhite)
    .text("Sistema de Gestão Clínica Integrativa", 435, 54, { width: 120, align: "right" });
  doc.fontSize(7).font("Helvetica").fillColor(CORES.offWhite)
    .text(dados.tratamento.unidade.nome.toUpperCase(), 435, 66, { width: 120, align: "right" });

  let y = 120;

  // ===== Identificação refinada =====
  doc.rect(MARGIN, y, CONTENT_W, 4).fill(CORES.douradoQueimado);
  y += 8;
  doc.fontSize(10).font("Helvetica-Bold").fillColor(CORES.azulPetroleo)
    .text("IDENTIFICAÇÃO DA PARTE SIGNATÁRIA", MARGIN, y, { width: CONTENT_W });
  y += 14;
  doc.rect(MARGIN, y, CONTENT_W, 70).fill(CORES.fundoBloco);
  const idadeMs = dados.tratamento.paciente.dataNascimento ? Date.now() - new Date(dados.tratamento.paciente.dataNascimento).getTime() : 0;
  const idade = idadeMs ? Math.floor(idadeMs / 31557600000) + " anos" : "—";
  doc.fontSize(10).font("Helvetica-Bold").fillColor(CORES.cinzaTexto)
    .text(dados.tratamento.paciente.nome, MARGIN + 8, y + 6, { width: CONTENT_W - 16 });
  doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto)
    .text(`CPF: ${dados.tratamento.paciente.cpf ?? "—"}    •    Idade: ${idade}    •    Gênero: ${dados.tratamento.paciente.genero ?? "—"}`, MARGIN + 8, y + 22, { width: CONTENT_W - 16 });
  doc.fontSize(7).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro)
    .text(`Código semântico interno: ${dados.tratamento.paciente.codigoSemantico ?? "—"}`, MARGIN + 8, y + 34, { width: CONTENT_W - 16 });
  const endLinha = [dados.tratamento.unidade.endereco, dados.tratamento.unidade.bairro, `${dados.tratamento.unidade.cidade ?? ""}/${dados.tratamento.unidade.estado ?? ""}`, `CEP ${dados.tratamento.unidade.cep ?? "—"}`].filter(Boolean).join(" — ");
  doc.fontSize(7).font("Helvetica").fillColor(CORES.cinzaTexto)
    .text(`Clínica: ${dados.tratamento.unidade.nome}`, MARGIN + 8, y + 46, { width: CONTENT_W - 16 });
  doc.fontSize(7).font("Helvetica").fillColor(CORES.cinzaClaro)
    .text(endLinha, MARGIN + 8, y + 56, { width: CONTENT_W - 16 });
  y += 80;

  // ===== Médico responsável + data + meio =====
  doc.rect(MARGIN, y, CONTENT_W, 32).fill(CORES.fundoBlocoClaro);
  doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.cinzaTexto)
    .text(`MÉDICO RESPONSÁVEL: ${dados.tratamento.profissional.nome}`, MARGIN + 8, y + 6, { width: CONTENT_W - 16 });
  doc.fontSize(7).font("Helvetica").fillColor(CORES.cinzaClaro)
    .text(`${dados.tratamento.profissional.crm ?? ""}    •    Data: ${new Date(dados.dataAssinatura + "T00:00:00").toLocaleDateString("pt-BR")}    •    Meio: ${dados.meioAssinatura.toUpperCase()}`, MARGIN + 8, y + 18, { width: CONTENT_W - 16 });
  y += 42;

  // ===== Plano terapêutico desta assinatura =====
  doc.rect(MARGIN, y, CONTENT_W, 4).fill(CORES.douradoQueimado);
  y += 8;
  doc.fontSize(10).font("Helvetica-Bold").fillColor(CORES.azulPetroleo)
    .text("PLANO TERAPÊUTICO DESTA ASSINATURA", MARGIN, y, { width: CONTENT_W });
  y += 14;
  doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto);
  const itensCapa: string[] = [];
  for (const f of dados.tratamento.formulas) itensCapa.push(`Fórmula manipulada — ${f.nome}`);
  for (const a of dados.tratamento.aplicacoesIm) itensCapa.push(`IM — ${a.substanciaNome} (${a.dose})`);
  for (const a of dados.tratamento.aplicacoesEv) itensCapa.push(`EV — ${a.substanciaNome} (${a.dose})`);
  for (const a of dados.tratamento.outrasAplicacoes) itensCapa.push(`${a.via.toUpperCase()} — ${a.substanciaNome} (${a.dose})`);
  if (itensCapa.length === 0) itensCapa.push("(nenhum item terapêutico ativo nesta sessão)");
  for (const i of itensCapa) {
    doc.text(`•  ${i}`, MARGIN + 10, y, { width: CONTENT_W - 20 });
    y += 12;
  }
  y += 8;

  // ===== Índice categorizado =====
  doc.rect(MARGIN, y, CONTENT_W, 4).fill(CORES.douradoQueimado);
  y += 8;
  doc.fontSize(10).font("Helvetica-Bold").fillColor(CORES.azulPetroleo)
    .text("ÍNDICE DE TERMOS ASSINADOS", MARGIN, y, { width: CONTENT_W });
  y += 14;
  const grupos: Record<string, TermoEntrada[]> = { "JURI.BASE": [], "JURI.CONS": [], "JURI.DIGI": [], "FINA": [] };
  for (const t of dados.termos) {
    const k = t.bloco === "FINA" ? "FINA" : `${t.bloco}.${t.subgrupo}`;
    if (!grupos[k]) grupos[k] = [];
    grupos[k].push(t);
  }
  doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto);
  let n = 1;
  for (const [grupo, ts] of Object.entries(grupos)) {
    if (ts.length === 0) continue;
    doc.fontSize(8).font("Helvetica-Bold").fillColor(CORES.douradoQueimado)
      .text(grupo, MARGIN + 4, y, { width: CONTENT_W - 8 });
    y += 12;
    doc.fontSize(8).font("Helvetica").fillColor(CORES.cinzaTexto);
    for (const t of ts) {
      doc.text(`${String(n).padStart(2, "0")}. ${rotuloCategoria(t).humano}  —  versão ${t.versao}`, MARGIN + 14, y, { width: CONTENT_W - 14 });
      y += 12;
      n++;
    }
    y += 4;
  }

  // =================================================================
  // CADERNOS POR TERMO
  // =================================================================
  let indiceCaderno = 1;
  for (const termo of dados.termos) {
    doc.addPage();
    const ctx: DrawCtx = { doc, y: desenharCabecalhoCaderno(doc, termo, totalCadernos, indiceCaderno) };

    // Bloco APLICÁVEL (se houver pra essa categoria)
    selecionarBlocoAplicavel(ctx, termo, dados);

    // Texto jurídico integral.
    // Registra listener pra redesenhar cabecalho de continuacao em CADA nova
    // pagina disparada pelo fluxo de texto (PDFKit pode quebrar varias vezes).
    garantirEspaco(ctx, 20);
    ctx.doc.fontSize(8).font("Helvetica-Oblique").fillColor(CORES.cinzaClaro)
      .text("TEXTO JURÍDICO INTEGRAL — fonte: termos_juridicos (versionado, hash auditado)", MARGIN, ctx.y, { width: CONTENT_W });
    ctx.y += 14;

    const onPageAdded = () => {
      const yCont = desenharCabecalhoCaderno(doc, termo, totalCadernos, indiceCaderno, true);
      doc.y = yCont;
    };
    doc.on("pageAdded", onPageAdded);
    try {
      ctx.doc.fontSize(9).font("Helvetica").fillColor(CORES.cinzaTexto)
        .text(termo.textoCompleto, MARGIN, ctx.y, { width: CONTENT_W, align: "justify", lineGap: 2 });
    } finally {
      doc.off("pageAdded", onPageAdded);
    }
    ctx.y = doc.y + 16;

    // Bloco de assinatura (nunca órfão; se forçar nova página, redesenha header de continuação)
    if (ctx.y + 70 > SAFE_BOTTOM) {
      doc.addPage();
      ctx.y = desenharCabecalhoCaderno(doc, termo, totalCadernos, indiceCaderno, true);
    }
    ctx.doc.moveTo(MARGIN + 20, ctx.y).lineTo(MARGIN + 240, ctx.y).lineWidth(0.5).stroke(CORES.cinzaTexto);
    ctx.doc.moveTo(MARGIN + 290, ctx.y).lineTo(MARGIN + CONTENT_W - 20, ctx.y).lineWidth(0.5).stroke(CORES.cinzaTexto);
    ctx.doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.cinzaTexto)
      .text(dados.tratamento.paciente.nome, MARGIN + 20, ctx.y + 4, { width: 220, align: "center" });
    ctx.doc.fontSize(7).font("Helvetica").fillColor(CORES.cinzaClaro)
      .text(`paciente — CPF ${dados.tratamento.paciente.cpf ?? "—"}`, MARGIN + 20, ctx.y + 16, { width: 220, align: "center" });
    ctx.doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.cinzaTexto)
      .text(dados.tratamento.profissional.nome, MARGIN + 290, ctx.y + 4, { width: CONTENT_W - 310, align: "center" });
    ctx.doc.fontSize(7).font("Helvetica").fillColor(CORES.cinzaClaro)
      .text(`médico responsável — ${dados.tratamento.profissional.crm ?? ""}`, MARGIN + 290, ctx.y + 16, { width: CONTENT_W - 310, align: "center" });
    ctx.y += 36;
    ctx.doc.fontSize(7).font("Helvetica-Bold").fillColor(CORES.douradoQueimado)
      .text(
        `Assinado ${dados.meioAssinatura === "presencial" ? "presencialmente" : "eletronicamente"} em ${new Date(dados.dataAssinatura + "T00:00:00").toLocaleDateString("pt-BR")}${dados.observacaoSessao ? " — " + dados.observacaoSessao : ""}`,
        MARGIN, ctx.y, { width: CONTENT_W, align: "center" },
      );

    indiceCaderno++;
  }

  // =================================================================
  // FOOTER em todas as páginas
  // =================================================================
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    desenharFooterPagina(doc, dados.tratamento.paciente, i + 1, range.count, dados.tokenVerificacao);
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
