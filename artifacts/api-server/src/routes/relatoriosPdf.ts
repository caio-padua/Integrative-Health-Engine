/**
 * PARMASUPRA-TSUNAMI · T4 · PDF Server-Side com PDFKit
 *
 * Substitui window.print() das telas analiticas por geracao server-side
 * fiel aos 2 PDFs aprovados pelo Dr. Caio (`exports/pdfs-ficticios/`):
 *  - rede-mensal           : faturamento por unidade no periodo, sparkline 6M
 *  - comparativo-2unidades : 2 unidades lado a lado por 6 metricas (vencedor por var %)
 *  - drill-paciente        : evolucao paciente vs media unidade vs media rede (T8)
 *
 * Layout fiel aos PDFs aprovados:
 *  - cabecalho navy #020406 com faixa gold #C89B3C de 4px
 *  - logo PAWARDS MEDCORE no topo
 *  - sparkline ASCII-friendly (linha simples desenhada via PDFKit path)
 *  - hash de auditoria deterministico no rodape
 *  - tabelas com cor semantica (verde >=10%, azul >=0%, ambar >=-10%, verm <-10%)
 *  - rodape com regra-ouro Mike Tyson × Eder Jofre
 *
 * Permissao: requireMasterEstrito (mesmo guard do analytics).
 */

import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import PDFDocument from "pdfkit";
import { createHash } from "crypto";
import { requireRole } from "../middlewares/requireRole";
import { requireMasterEstrito } from "../middlewares/requireMasterEstrito";

const router = Router();

// ════════════════════════════════════════════════════════════════════
// PALETA PAWARDS (mesma dos PDFs aprovados + tela admin-analytics)
// ════════════════════════════════════════════════════════════════════
const NAVY = "#020406";
const NAVY_SOFT = "#0a1420";
const GOLD = "#C89B3C";
const GOLD_SOFT = "#8a6a25";
const VERDE = "#2f8f4a";
const AZUL = "#3274b8";
const AMBAR = "#c98a1f";
const VERMELHO = "#b53030";
const CINZA = "#71717a";
const BRANCO = "#ffffff";

// ════════════════════════════════════════════════════════════════════
// HELPERS (validacao, formato, cor semantica) — mesma logica do analytics
// ════════════════════════════════════════════════════════════════════
function validaAnoMes(v: string): string | null {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : null;
}

function variacaoPct(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Number((((atual - anterior) / anterior) * 100).toFixed(2));
}

function corPorVariacao(varPct: number | null): string {
  if (varPct === null) return CINZA;
  if (varPct >= 10) return VERDE;
  if (varPct >= 0) return AZUL;
  if (varPct >= -10) return AMBAR;
  return VERMELHO;
}

function labelPorVariacao(varPct: number | null): string {
  if (varPct === null) return "—";
  if (varPct >= 10) return "EXCELENTE";
  if (varPct >= 0) return "BOM";
  if (varPct >= -10) return "ATENÇÃO";
  return "CRÍTICO";
}

function fmtBRL(n: number): string {
  return "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtBRLCurto(n: number): string {
  if (n >= 1e6) return "R$ " + (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return "R$ " + (n / 1e3).toFixed(0) + "k";
  return fmtBRL(n);
}

function fmtPct(n: number | null): string {
  if (n === null) return "—";
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
}

// ════════════════════════════════════════════════════════════════════
// DESENHO: cabecalho PAWARDS (navy + faixa gold) — fiel aos PDFs aprovados
// ════════════════════════════════════════════════════════════════════
function desenhaCabecalho(doc: PDFKit.PDFDocument, titulo: string, periodo: string, hash: string): void {
  const { width } = doc.page;
  const altura = 90;

  // Faixa navy continua
  doc.save()
    .rect(0, 0, width, altura)
    .fill(NAVY);

  // Faixa gold de 4px na borda inferior
  doc.rect(0, altura - 4, width, 4).fill(GOLD);

  // Texto branding
  doc.fillColor(GOLD)
    .font("Helvetica-Bold").fontSize(11)
    .text("PAWARDS  MEDCORE", 36, 18, { characterSpacing: 2 });

  doc.fillColor("#fde68a").font("Helvetica").fontSize(7)
    .text("Sistema de Excelência Médica · Dr. Caio Pádua · ceo@pawards.com.br", 36, 33);

  // Titulo do relatorio
  doc.fillColor(BRANCO).font("Helvetica-Bold").fontSize(15)
    .text(titulo, 36, 50);

  // Periodo
  doc.fillColor("#fde68a").font("Helvetica").fontSize(9)
    .text(`PERÍODO: ${periodo}`, 36, 70, { characterSpacing: 1 });

  // Hash auditoria no canto direito
  doc.fillColor("#fcd34d80").font("Helvetica").fontSize(7)
    .text("DOCUMENTO AUDITÁVEL", width - 200, 18, { width: 164, align: "right" });
  doc.fillColor("#fcd34d80").font("Courier").fontSize(7)
    .text(`hash: ${hash}`, width - 200, 30, { width: 164, align: "right" });

  doc.restore();
  doc.y = altura + 16;
  doc.fillColor("#000");
}

// ════════════════════════════════════════════════════════════════════
// DESENHO: rodape PAWARDS (regra-ouro Mike Tyson × Eder Jofre)
// ════════════════════════════════════════════════════════════════════
function desenhaRodape(doc: PDFKit.PDFDocument, hash: string): void {
  const { width, height } = doc.page;
  doc.save();
  doc.rect(0, height - 32, width, 32).fill(NAVY_SOFT);
  doc.rect(0, height - 32, width, 1).fill(GOLD_SOFT);
  doc.fillColor("#d4d4d8").font("Helvetica").fontSize(7)
    .text(
      "REGRA-OURO PAWARDS  ·  nenhum número absoluto isolado  ·  sempre acompanhado de variação_abs · variação_pct · cor · sparkline  ·  filosofia Mike Tyson × Éder Jofre: variação manda",
      36, height - 24, { width: width - 72, align: "center" }
    );
  doc.fillColor(GOLD).font("Courier").fontSize(6)
    .text(`hash: ${hash}`, 36, height - 14, { width: width - 72, align: "center" });
  doc.restore();
}

// ════════════════════════════════════════════════════════════════════
// DESENHO: sparkline simples (linha de 6 pontos em mini bbox)
// ════════════════════════════════════════════════════════════════════
function desenhaSparkline(
  doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number,
  pontos: number[], cor: string,
): void {
  if (pontos.length < 2) {
    doc.save().fillColor(CINZA).fontSize(7).text("—", x, y + h / 2 - 3); doc.restore();
    return;
  }
  const min = Math.min(...pontos);
  const max = Math.max(...pontos);
  const range = max - min || 1;
  const stepX = w / (pontos.length - 1);
  doc.save();
  doc.lineWidth(1).strokeColor(cor);
  pontos.forEach((p, i) => {
    const px = x + i * stepX;
    const py = y + h - ((p - min) / range) * h;
    if (i === 0) doc.moveTo(px, py);
    else doc.lineTo(px, py);
  });
  doc.stroke();
  doc.restore();
}

// ════════════════════════════════════════════════════════════════════
// DESENHO: badge de cor semantica (variacao % com fundo colorido)
// ════════════════════════════════════════════════════════════════════
function desenhaBadge(
  doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number,
  texto: string, cor: string,
): void {
  doc.save();
  doc.roundedRect(x, y, w, h, 3).fillAndStroke(cor + "33", cor);
  doc.fillColor(cor).font("Helvetica-Bold").fontSize(8)
    .text(texto, x, y + h / 2 - 3, { width: w, align: "center" });
  doc.restore();
}

// ════════════════════════════════════════════════════════════════════
// HELPER: hash determinístico do payload
// ════════════════════════════════════════════════════════════════════
function calcHash(payload: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 8) + "-" + new Date().toISOString().slice(0, 7).replace("-", "");
}

// ════════════════════════════════════════════════════════════════════
// QUERY: rede-mensal (mesma logica de /admin/analytics/crescimento-clinicas)
// ════════════════════════════════════════════════════════════════════
async function consultaRedeMensal(periodoA: string, periodoB: string) {
  const dados = await db.execute(sql`
    WITH a AS (SELECT * FROM analytics_clinica_mes WHERE ano_mes = ${periodoA}),
         b AS (SELECT * FROM analytics_clinica_mes WHERE ano_mes = ${periodoB}),
         spark AS (
           SELECT unidade_id,
                  json_agg(json_build_object('ano_mes', ano_mes, 'fat', faturamento_brl)
                           ORDER BY ano_mes) AS serie
           FROM (
             SELECT unidade_id, ano_mes, faturamento_brl
             FROM analytics_clinica_mes
             WHERE ano_mes >= TO_CHAR(
               (TO_DATE(${periodoB} || '-01', 'YYYY-MM-DD') - INTERVAL '5 months'),
               'YYYY-MM'
             )
             ORDER BY ano_mes DESC
           ) sub GROUP BY unidade_id
         )
    SELECT u.id AS unidade_id, u.nome, u.tipo_unidade,
           COALESCE(a.faturamento_brl, 0)::numeric AS fat_a,
           COALESCE(b.faturamento_brl, 0)::numeric AS fat_b,
           COALESCE(a.receitas_count, 0)           AS rec_a,
           COALESCE(b.receitas_count, 0)           AS rec_b,
           COALESCE(a.pacientes_unicos, 0)         AS pac_a,
           COALESCE(b.pacientes_unicos, 0)         AS pac_b,
           s.serie AS sparkline
    FROM unidades u
    LEFT JOIN a ON a.unidade_id = u.id
    LEFT JOIN b ON b.unidade_id = u.id
    LEFT JOIN spark s ON s.unidade_id = u.id
    WHERE u.id IN (SELECT unidade_id FROM analytics_clinica_mes)
  `);
  return dados.rows.map((r: any) => {
    const fatA = Number(r.fat_a);
    const fatB = Number(r.fat_b);
    const recA = Number(r.rec_a);
    const recB = Number(r.rec_b);
    const pacA = Number(r.pac_a);
    const pacB = Number(r.pac_b);
    return {
      unidade_id: r.unidade_id,
      nome: r.nome,
      tipo_unidade: r.tipo_unidade,
      fatA, fatB, recA, recB, pacA, pacB,
      varFat: variacaoPct(fatB, fatA),
      sparkline: (r.sparkline ?? []).map((p: any) => Number(p.fat)),
    };
  }).sort((x, y) => (y.varFat ?? -999) - (x.varFat ?? -999));
}

// ════════════════════════════════════════════════════════════════════
// RENDER: rede-mensal (PDF completo)
// ════════════════════════════════════════════════════════════════════
function renderRedeMensal(doc: PDFKit.PDFDocument, payload: any) {
  const { periodoA, periodoB, ranking, totA, totB, varTot, hash } = payload;
  desenhaCabecalho(doc, "Relatório de Rede Mensal", `${periodoA}  →  ${periodoB}`, hash);

  // ─── SECAO 1: KPI Consolidado ─────────────────────────────────────
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(12)
    .text("CONSOLIDADO DA REDE", 36, doc.y);
  doc.moveDown(0.3);

  const corConsol = corPorVariacao(varTot);
  const yKpi = doc.y;
  doc.save();
  doc.roundedRect(36, yKpi, 522, 70, 6).fillAndStroke(corConsol + "11", corConsol);
  doc.fillColor("#000").font("Helvetica-Bold").fontSize(20)
    .text(fmtBRL(totB), 50, yKpi + 12);
  doc.fillColor("#52525b").font("Helvetica").fontSize(9)
    .text(`anterior: ${fmtBRL(totA)}  ·  variação abs: ${fmtBRL(totB - totA)}  ·  variação %: ${fmtPct(varTot)}  ·  status: ${labelPorVariacao(varTot)}`, 50, yKpi + 44);
  doc.restore();
  doc.y = yKpi + 80;

  doc.fillColor("#27272a").font("Helvetica").fontSize(8)
    .text(
      "— O que esse número está dizendo: a rede saiu de " + fmtBRL(totA) +
      " para " + fmtBRL(totB) + ", variação " + fmtPct(varTot) +
      ". O eixo da decisão é a EVOLUÇÃO, não o número absoluto.",
      36, doc.y, { width: 522, align: "left" }
    );
  doc.moveDown(0.8);

  // ─── SECAO 2: Tabela ranking com sparkline ───────────────────────
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(12)
    .text("RANKING POR UNIDADE  ·  faturamento + sparkline 6M", 36, doc.y);
  doc.moveDown(0.4);

  const colX = { idx: 36, nome: 60, fatA: 230, fatB: 295, varPct: 360, spark: 430, status: 510 };
  const headY = doc.y;
  doc.save();
  doc.rect(36, headY, 522, 18).fill(NAVY_SOFT);
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(8);
  doc.text("#", colX.idx, headY + 5);
  doc.text("CLÍNICA", colX.nome, headY + 5);
  doc.text(periodoA, colX.fatA, headY + 5, { width: 60, align: "right" });
  doc.text(periodoB, colX.fatB, headY + 5, { width: 60, align: "right" });
  doc.text("VAR %", colX.varPct, headY + 5, { width: 60, align: "center" });
  doc.text("TENDÊNCIA 6M", colX.spark, headY + 5, { width: 70, align: "center" });
  doc.text("STATUS", colX.status, headY + 5, { width: 50, align: "center" });
  doc.restore();
  doc.y = headY + 22;

  ranking.forEach((r: any, idx: number) => {
    if (doc.y > 720) {
      doc.addPage();
      desenhaCabecalho(doc, "Relatório de Rede Mensal (continuação)", `${periodoA}  →  ${periodoB}`, hash);
    }
    const linhaY = doc.y;
    const cor = corPorVariacao(r.varFat);

    if (idx % 2 === 0) {
      doc.save().rect(36, linhaY - 2, 522, 22).fill("#fafafa").restore();
    }

    doc.fillColor(CINZA).font("Courier").fontSize(8).text(String(idx + 1), colX.idx, linhaY + 3);
    doc.fillColor("#18181b").font("Helvetica-Bold").fontSize(9)
      .text(r.nome, colX.nome, linhaY + 1, { width: 165, ellipsis: true });
    doc.fillColor("#71717a").font("Helvetica").fontSize(7)
      .text(r.tipo_unidade, colX.nome, linhaY + 12, { width: 165, ellipsis: true });

    doc.fillColor("#52525b").font("Courier").fontSize(8)
      .text(fmtBRLCurto(r.fatA), colX.fatA, linhaY + 5, { width: 60, align: "right" });
    doc.fillColor(GOLD_SOFT).font("Courier-Bold").fontSize(8)
      .text(fmtBRLCurto(r.fatB), colX.fatB, linhaY + 5, { width: 60, align: "right" });

    desenhaBadge(doc, colX.varPct, linhaY + 4, 60, 13, fmtPct(r.varFat), cor);
    desenhaSparkline(doc, colX.spark + 5, linhaY + 4, 60, 13, r.sparkline, cor);

    doc.fillColor(cor).font("Helvetica-Bold").fontSize(6)
      .text(labelPorVariacao(r.varFat), colX.status, linhaY + 7, { width: 50, align: "center" });

    doc.y = linhaY + 22;
  });

  doc.moveDown(0.5);

  // ─── SECAO 3: Legenda semantica ───────────────────────────────────
  if (doc.y > 720) doc.addPage();
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(9)
    .text("LEGENDA SEMÂNTICA  ·  TDAH/TOC friendly", 36, doc.y);
  doc.moveDown(0.3);
  const legendaY = doc.y;
  const legendas: Array<{ cor: string; label: string; rule: string }> = [
    { cor: VERDE, label: "EXCELENTE", rule: "≥ +10%  ·  alta consistente, replicar prática" },
    { cor: AZUL, label: "BOM", rule: "0% a +10%  ·  estável crescente, manter ritmo" },
    { cor: AMBAR, label: "ATENÇÃO", rule: "-10% a 0%  ·  ligar pro gestor antes de virar problema" },
    { cor: VERMELHO, label: "CRÍTICO", rule: "< -10%  ·  intervenção imediata + plano de recuperação" },
  ];
  legendas.forEach((l, i) => {
    const y = legendaY + i * 14;
    doc.save().rect(36, y + 2, 8, 8).fill(l.cor).restore();
    doc.fillColor("#18181b").font("Helvetica-Bold").fontSize(8).text(l.label, 50, y + 2);
    doc.fillColor("#52525b").font("Helvetica").fontSize(8).text(l.rule, 110, y + 2);
  });
  doc.y = legendaY + legendas.length * 14 + 4;

  desenhaRodape(doc, hash);
}

// ════════════════════════════════════════════════════════════════════
// ROTA: GET /api/admin/relatorios/:tipo.pdf
// ════════════════════════════════════════════════════════════════════
router.get(
  "/admin/relatorios/:tipoPdf",
  requireRole("validador_mestre"),
  requireMasterEstrito,
  async (req: Request, res: Response): Promise<void> => {
    // Aceita "rede-mensal.pdf" e extrai tipo
    const raw = req.params.tipoPdf || "";
    if (!raw.endsWith(".pdf")) {
      res.status(400).json({ error: "URL deve terminar em .pdf" });
      return;
    }
    const tipo = raw.slice(0, -4);

    if (tipo === "rede-mensal") {
      // Defaults: ultimo vs penultimo mes em analytics_clinica_mes
      let periodoA = (req.query.periodo_a as string) || "";
      let periodoB = (req.query.periodo_b as string) || "";
      if (!periodoA || !periodoB) {
        const ult = await db.execute(sql`
          SELECT DISTINCT ano_mes FROM analytics_clinica_mes ORDER BY ano_mes DESC LIMIT 2
        `);
        if (ult.rows.length < 2) {
          res.status(400).json({ error: "Snapshots insuficientes para comparar." });
          return;
        }
        periodoB = (ult.rows[0] as any).ano_mes;
        periodoA = (ult.rows[1] as any).ano_mes;
      } else {
        const a = validaAnoMes(periodoA), b = validaAnoMes(periodoB);
        if (!a || !b) {
          res.status(400).json({ error: "periodo_a/periodo_b devem ser YYYY-MM" });
          return;
        }
        periodoA = a; periodoB = b;
      }

      const ranking = await consultaRedeMensal(periodoA, periodoB);
      const totA = ranking.reduce((s, r) => s + r.fatA, 0);
      const totB = ranking.reduce((s, r) => s + r.fatB, 0);
      const varTot = variacaoPct(totB, totA);
      const hash = calcHash({ tipo, periodoA, periodoB, totA, totB, qtd: ranking.length });

      const doc = new PDFDocument({ size: "A4", margin: 36, bufferPages: true });
      const filename = `pawards_rede_mensal_${periodoB}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      doc.pipe(res);

      renderRedeMensal(doc, { periodoA, periodoB, ranking, totA, totB, varTot, hash });
      doc.end();
      return;
    }

    if (tipo === "comparativo-2unidades") {
      const uA = Number(req.query.unidade_a);
      const uB = Number(req.query.unidade_b);
      const periodoA = String(req.query.periodo_a || "");
      const periodoB = String(req.query.periodo_b || "");
      if (!uA || !uB || !validaAnoMes(periodoA) || !validaAnoMes(periodoB)) {
        res.status(400).json({
          error: "params: unidade_a, unidade_b, periodo_a (YYYY-MM), periodo_b (YYYY-MM)",
        });
        return;
      }
      const dados = await consultaComparativo2Unidades(uA, uB, periodoA, periodoB);
      if (!dados.unidadeA || !dados.unidadeB) {
        res.status(404).json({ error: "Uma das unidades não tem snapshots no período." });
        return;
      }
      const hash = calcHash({ tipo, uA, uB, periodoA, periodoB });
      const doc = new PDFDocument({ size: "A4", margin: 36, bufferPages: true });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="pawards_comparativo_${uA}_vs_${uB}_${periodoB}.pdf"`
      );
      doc.pipe(res);
      renderComparativo2Unidades(doc, { ...dados, periodoA, periodoB, hash });
      doc.end();
      return;
    }

    if (tipo === "drill-paciente") {
      const pacienteId = Number(req.query.paciente_id);
      const analito = String(req.query.analito || "").trim();
      if (!pacienteId || !analito) {
        res.status(400).json({ error: "params: paciente_id, analito" });
        return;
      }
      const dados = await consultaDrillPaciente(pacienteId, analito);
      if (!dados.paciente) {
        res.status(404).json({ error: "Paciente não encontrado." });
        return;
      }
      const hash = calcHash({ tipo, pacienteId, analito });
      const doc = new PDFDocument({ size: "A4", margin: 36, bufferPages: true });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="pawards_drill_paciente_${pacienteId}_${analito}.pdf"`
      );
      doc.pipe(res);
      renderDrillPaciente(doc, { ...dados, analito, hash });
      doc.end();
      return;
    }

    res.status(400).json({ error: `Tipo de relatório desconhecido: '${tipo}'` });
  }
);

// ════════════════════════════════════════════════════════════════════
// QUERY: comparativo-2unidades — 2 clinicas lado a lado, 6 metricas
// PARMASUPRA-FECHAMENTO · F2 / D1
// ════════════════════════════════════════════════════════════════════
async function consultaComparativo2Unidades(
  unidadeA: number, unidadeB: number, periodoA: string, periodoB: string
) {
  const r: any = await db.execute(sql`
    SELECT u.id AS unidade_id, u.nome, u.tipo_unidade,
           a.faturamento_brl  AS fat_a,  b.faturamento_brl  AS fat_b,
           a.comissao_brl     AS com_a,  b.comissao_brl     AS com_b,
           a.receitas_count   AS rec_a,  b.receitas_count   AS rec_b,
           a.pacientes_unicos AS pac_a,  b.pacientes_unicos AS pac_b,
           a.blends_distintos AS bld_a,  b.blends_distintos AS bld_b,
           a.ticket_medio_brl AS tic_a,  b.ticket_medio_brl AS tic_b
    FROM unidades u
    LEFT JOIN analytics_clinica_mes a ON a.unidade_id = u.id AND a.ano_mes = ${periodoA}
    LEFT JOIN analytics_clinica_mes b ON b.unidade_id = u.id AND b.ano_mes = ${periodoB}
    WHERE u.id IN (${unidadeA}, ${unidadeB})
  `);
  const rows = (r.rows ?? r) as any[];
  const norm = (row: any) => row && {
    id: Number(row.unidade_id),
    nome: String(row.nome ?? "—"),
    tipo: String(row.tipo_unidade ?? "—"),
    metricas: {
      faturamento: { a: Number(row.fat_a ?? 0), b: Number(row.fat_b ?? 0) },
      comissao:    { a: Number(row.com_a ?? 0), b: Number(row.com_b ?? 0) },
      receitas:    { a: Number(row.rec_a ?? 0), b: Number(row.rec_b ?? 0) },
      pacientes:   { a: Number(row.pac_a ?? 0), b: Number(row.pac_b ?? 0) },
      blends:      { a: Number(row.bld_a ?? 0), b: Number(row.bld_b ?? 0) },
      ticket:      { a: Number(row.tic_a ?? 0), b: Number(row.tic_b ?? 0) },
    },
  };
  return {
    unidadeA: norm(rows.find((x) => Number(x.unidade_id) === unidadeA)),
    unidadeB: norm(rows.find((x) => Number(x.unidade_id) === unidadeB)),
  };
}

// ════════════════════════════════════════════════════════════════════
// RENDER: comparativo-2unidades (2 colunas + vencedor por var %)
// ════════════════════════════════════════════════════════════════════
function renderComparativo2Unidades(doc: PDFKit.PDFDocument, p: any) {
  const { unidadeA, unidadeB, periodoA, periodoB, hash } = p;
  desenhaCabecalho(
    doc,
    `Comparativo: ${unidadeA.nome} × ${unidadeB.nome}`,
    `${periodoA}  →  ${periodoB}`,
    hash
  );

  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(11)
    .text("FILOSOFIA MIKE TYSON × ÉDER JOFRE", 36, doc.y);
  doc.fillColor("#52525b").font("Helvetica").fontSize(8)
    .text(
      "Cada métrica abaixo mostra a variação % de cada clínica no período. " +
      "O vencedor é destacado em ouro — não pelo número absoluto, mas pela variação.",
      36, doc.y, { width: 522 }
    );
  doc.moveDown(0.8);

  const metricas: Array<{ chave: keyof typeof unidadeA.metricas; rotulo: string; fmt: (n: number) => string }> = [
    { chave: "faturamento", rotulo: "Faturamento",       fmt: fmtBRLCurto },
    { chave: "comissao",    rotulo: "Comissão",          fmt: fmtBRLCurto },
    { chave: "receitas",    rotulo: "Receitas emitidas", fmt: (n) => String(n) },
    { chave: "pacientes",   rotulo: "Pacientes únicos",  fmt: (n) => String(n) },
    { chave: "blends",      rotulo: "Blends distintos",  fmt: (n) => String(n) },
    { chave: "ticket",      rotulo: "Ticket médio",      fmt: fmtBRLCurto },
  ];

  // Header da tabela
  const headY = doc.y;
  const colXMet = 36, colXNomeA = 200, colXNomeB = 380;
  doc.save().rect(36, headY, 522, 20).fill(NAVY_SOFT).restore();
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(8)
    .text("MÉTRICA", colXMet + 6, headY + 6)
    .text(unidadeA.nome.toUpperCase(), colXNomeA, headY + 6, { width: 170, align: "center", ellipsis: true })
    .text(unidadeB.nome.toUpperCase(), colXNomeB, headY + 6, { width: 170, align: "center", ellipsis: true });
  doc.y = headY + 24;

  let placarA = 0, placarB = 0;

  metricas.forEach((m, idx) => {
    if (doc.y > 700) {
      doc.addPage();
      desenhaCabecalho(doc, "Comparativo (continuação)", `${periodoA}  →  ${periodoB}`, hash);
    }
    const linhaY = doc.y;
    if (idx % 2 === 0) doc.save().rect(36, linhaY - 2, 522, 56).fill("#fafafa").restore();

    // Coluna métrica
    doc.fillColor("#18181b").font("Helvetica-Bold").fontSize(9)
      .text(m.rotulo, colXMet + 6, linhaY + 4);

    const mA = unidadeA.metricas[m.chave];
    const mB = unidadeB.metricas[m.chave];
    const varA = variacaoPct(mA.b, mA.a);
    const varB = variacaoPct(mB.b, mB.a);

    // Vencedor por variação %
    let vencedor: "A" | "B" | "TIE" = "TIE";
    if (varA !== null && varB !== null) {
      if (varA > varB) { vencedor = "A"; placarA++; }
      else if (varB > varA) { vencedor = "B"; placarB++; }
    } else if (varA !== null) { vencedor = "A"; placarA++; }
    else if (varB !== null) { vencedor = "B"; placarB++; }

    // Coluna A
    const corA = corPorVariacao(varA);
    if (vencedor === "A") {
      doc.save().roundedRect(colXNomeA - 4, linhaY, 178, 50, 4)
        .fillAndStroke(GOLD + "11", GOLD).restore();
    }
    doc.fillColor("#52525b").font("Courier").fontSize(8)
      .text("antes: " + m.fmt(mA.a), colXNomeA, linhaY + 4, { width: 170, align: "center" });
    doc.fillColor("#000").font("Courier-Bold").fontSize(11)
      .text(m.fmt(mA.b), colXNomeA, linhaY + 16, { width: 170, align: "center" });
    desenhaBadge(doc, colXNomeA + 50, linhaY + 32, 70, 13, fmtPct(varA), corA);

    // Coluna B
    const corB = corPorVariacao(varB);
    if (vencedor === "B") {
      doc.save().roundedRect(colXNomeB - 4, linhaY, 178, 50, 4)
        .fillAndStroke(GOLD + "11", GOLD).restore();
    }
    doc.fillColor("#52525b").font("Courier").fontSize(8)
      .text("antes: " + m.fmt(mB.a), colXNomeB, linhaY + 4, { width: 170, align: "center" });
    doc.fillColor("#000").font("Courier-Bold").fontSize(11)
      .text(m.fmt(mB.b), colXNomeB, linhaY + 16, { width: 170, align: "center" });
    desenhaBadge(doc, colXNomeB + 50, linhaY + 32, 70, 13, fmtPct(varB), corB);

    doc.y = linhaY + 56;
  });

  // Placar final
  doc.moveDown(0.5);
  if (doc.y > 720) doc.addPage();
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(11)
    .text("PLACAR FINAL  ·  vencedor por número de métricas com maior variação %", 36, doc.y);
  doc.moveDown(0.4);
  const placarY = doc.y;
  const corCampeao = placarA > placarB ? GOLD : placarB > placarA ? GOLD : CINZA;
  doc.save();
  doc.roundedRect(36, placarY, 522, 50, 6).fillAndStroke(corCampeao + "11", corCampeao);
  doc.fillColor("#000").font("Helvetica-Bold").fontSize(13)
    .text(unidadeA.nome, 50, placarY + 10, { width: 240 })
    .text(unidadeB.nome, 318, placarY + 10, { width: 240, align: "right" });
  doc.fillColor(corCampeao).font("Helvetica-Bold").fontSize(20)
    .text(String(placarA), 50, placarY + 24, { width: 240 })
    .text(String(placarB), 318, placarY + 24, { width: 240, align: "right" });
  doc.fillColor("#52525b").font("Helvetica").fontSize(8)
    .text(
      placarA === placarB
        ? "Empate técnico — ambas evoluíram no mesmo número de frentes."
        : `${placarA > placarB ? unidadeA.nome : unidadeB.nome} venceu ${Math.max(placarA, placarB)} de ${metricas.length} métricas no período.`,
      50, placarY + 38, { width: 508, align: "center" }
    );
  doc.restore();
  doc.y = placarY + 60;

  desenhaRodape(doc, hash);
}

// ════════════════════════════════════════════════════════════════════
// QUERY: drill-paciente — paciente vs media unidade vs media rede
// PARMASUPRA-FECHAMENTO · F3 / D2 — reusa logica T8 (laboratorioIntegrativo)
// ════════════════════════════════════════════════════════════════════
async function consultaDrillPaciente(pacienteId: number, analito: string) {
  const pac: any = await db.execute(sql`
    SELECT p.id, p.nome, p.unidade_id, u.nome AS unidade_nome
    FROM pacientes p
    LEFT JOIN unidades u ON u.id = p.unidade_id
    WHERE p.id = ${pacienteId}
  `);
  const paciente = (pac.rows ?? pac)[0];
  if (!paciente) return { paciente: null };

  const seriePac: any = await db.execute(sql`
    SELECT TO_CHAR(data_coleta, 'YYYY-MM') AS mes,
           valor::float AS valor
    FROM exames_evolucao
    WHERE paciente_id = ${pacienteId}
      AND nome_exame = ${analito}
      AND data_coleta IS NOT NULL
      AND valor IS NOT NULL
    ORDER BY data_coleta ASC
  `);

  let serieUnidade: any[] = [];
  if (paciente.unidade_id) {
    const u: any = await db.execute(sql`
      SELECT TO_CHAR(ee.data_coleta, 'YYYY-MM') AS mes,
             ROUND(AVG(ee.valor)::numeric, 4)::float AS valor_medio,
             COUNT(DISTINCT ee.paciente_id)::int AS n_pacientes
      FROM exames_evolucao ee
      JOIN pacientes p ON p.id = ee.paciente_id
      WHERE ee.nome_exame = ${analito}
        AND p.unidade_id = ${paciente.unidade_id}
        AND ee.data_coleta IS NOT NULL
        AND ee.valor IS NOT NULL
      GROUP BY mes ORDER BY mes ASC
    `);
    serieUnidade = (u.rows ?? u);
  }

  const r: any = await db.execute(sql`
    SELECT TO_CHAR(ee.data_coleta, 'YYYY-MM') AS mes,
           ROUND(AVG(ee.valor)::numeric, 4)::float AS valor_medio,
           COUNT(DISTINCT ee.paciente_id)::int AS n_pacientes
    FROM exames_evolucao ee
    WHERE ee.nome_exame = ${analito}
      AND ee.data_coleta IS NOT NULL
      AND ee.valor IS NOT NULL
    GROUP BY mes ORDER BY mes ASC
  `);
  const serieRede = (r.rows ?? r);

  return {
    paciente: {
      id: paciente.id,
      nome: paciente.nome,
      unidade_id: paciente.unidade_id,
      unidade_nome: paciente.unidade_nome ?? "—",
    },
    seriePaciente: (seriePac.rows ?? seriePac).map((x: any) => ({
      mes: x.mes, valor: Number(x.valor),
    })),
    serieUnidade: serieUnidade.map((x: any) => ({
      mes: x.mes, valor: Number(x.valor_medio), n: Number(x.n_pacientes),
    })),
    serieRede: serieRede.map((x: any) => ({
      mes: x.mes, valor: Number(x.valor_medio), n: Number(x.n_pacientes),
    })),
  };
}

// ════════════════════════════════════════════════════════════════════
// RENDER: drill-paciente (3 sparklines + bloco Mike Tyson com delta %)
// ════════════════════════════════════════════════════════════════════
function renderDrillPaciente(doc: PDFKit.PDFDocument, p: any) {
  const { paciente, seriePaciente, serieUnidade, serieRede, analito, hash } = p;
  const periodo =
    seriePaciente.length > 0
      ? `${seriePaciente[0].mes}  →  ${seriePaciente[seriePaciente.length - 1].mes}`
      : "—";
  desenhaCabecalho(doc, `Drill paciente · ${analito}`, periodo, hash);

  // Identificação
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(12)
    .text("PACIENTE", 36, doc.y);
  doc.moveDown(0.2);
  const yIdent = doc.y;
  doc.save().roundedRect(36, yIdent, 522, 38, 4).fillAndStroke("#fafafa", "#e4e4e7").restore();
  doc.fillColor("#000").font("Helvetica-Bold").fontSize(13)
    .text(paciente.nome, 50, yIdent + 8);
  doc.fillColor("#52525b").font("Helvetica").fontSize(8)
    .text(`Unidade: ${paciente.unidade_nome}  ·  ID #${paciente.id}  ·  Analito: ${analito}`, 50, yIdent + 24);
  doc.y = yIdent + 48;

  // Bloco Mike Tyson — delta % do paciente vs unidade vs rede
  const ultPac = seriePaciente[seriePaciente.length - 1]?.valor ?? null;
  const priPac = seriePaciente[0]?.valor ?? null;
  const ultUni = serieUnidade[serieUnidade.length - 1]?.valor ?? null;
  const ultRede = serieRede[serieRede.length - 1]?.valor ?? null;

  const varPac = priPac && ultPac !== null ? variacaoPct(ultPac, priPac) : null;
  const varVsUni = ultPac !== null && ultUni !== null && ultUni > 0
    ? Number((((ultPac - ultUni) / ultUni) * 100).toFixed(2))
    : null;
  const varVsRede = ultPac !== null && ultRede !== null && ultRede > 0
    ? Number((((ultPac - ultRede) / ultRede) * 100).toFixed(2))
    : null;

  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(11)
    .text("ANÁLISE COMPARATIVA  ·  filosofia Mike Tyson", 36, doc.y);
  doc.moveDown(0.3);

  const blocos = [
    { titulo: "Evolução do paciente", varVal: varPac, sub: priPac !== null && ultPac !== null ? `${priPac} → ${ultPac}` : "—" },
    { titulo: "vs média da unidade",   varVal: varVsUni, sub: ultUni !== null ? `unidade: ${ultUni}` : "—" },
    { titulo: "vs média da rede",      varVal: varVsRede, sub: ultRede !== null ? `rede: ${ultRede}` : "—" },
  ];
  const bx = 36, bw = 170, bh = 60;
  blocos.forEach((b, i) => {
    const x = bx + i * (bw + 6);
    const y = doc.y;
    const cor = corPorVariacao(b.varVal);
    doc.save().roundedRect(x, y, bw, bh, 6).fillAndStroke(cor + "11", cor);
    doc.fillColor("#52525b").font("Helvetica-Bold").fontSize(7)
      .text(b.titulo.toUpperCase(), x + 8, y + 8, { width: bw - 16, characterSpacing: 1 });
    doc.fillColor(cor).font("Helvetica-Bold").fontSize(20)
      .text(fmtPct(b.varVal), x + 8, y + 22, { width: bw - 16 });
    doc.fillColor("#71717a").font("Helvetica").fontSize(7)
      .text(b.sub, x + 8, y + 46, { width: bw - 16 });
    doc.restore();
  });
  doc.y += bh + 12;

  // Tabela mês a mês
  if (doc.y > 700) doc.addPage();
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(11)
    .text("EVOLUÇÃO MÊS A MÊS  ·  paciente · unidade · rede", 36, doc.y);
  doc.moveDown(0.3);

  // Index por mes para alinhar 3 series
  const mesesSet = new Set<string>();
  seriePaciente.forEach((x: any) => mesesSet.add(x.mes));
  serieUnidade.forEach((x: any) => mesesSet.add(x.mes));
  serieRede.forEach((x: any) => mesesSet.add(x.mes));
  const meses = Array.from(mesesSet).sort();

  const colMes = 36, colP = 150, colU = 270, colR = 390, colVarPU = 490;
  const headY2 = doc.y;
  doc.save().rect(36, headY2, 522, 18).fill(NAVY_SOFT).restore();
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(8)
    .text("MÊS", colMes + 6, headY2 + 5)
    .text("PACIENTE (gold)", colP, headY2 + 5, { width: 110, align: "center" })
    .text("MÉDIA UNIDADE (azul)", colU, headY2 + 5, { width: 110, align: "center" })
    .text("MÉDIA REDE (cinza)", colR, headY2 + 5, { width: 90, align: "center" })
    .text("Δ vs UNI", colVarPU, headY2 + 5, { width: 64, align: "center" });
  doc.y = headY2 + 22;

  meses.forEach((mes, idx) => {
    if (doc.y > 740) {
      doc.addPage();
      desenhaCabecalho(doc, "Drill paciente (continuação)", periodo, hash);
    }
    const y = doc.y;
    if (idx % 2 === 0) doc.save().rect(36, y - 2, 522, 18).fill("#fafafa").restore();

    const pac = seriePaciente.find((x: any) => x.mes === mes);
    const uni = serieUnidade.find((x: any) => x.mes === mes);
    const rede = serieRede.find((x: any) => x.mes === mes);

    doc.fillColor("#18181b").font("Courier").fontSize(8)
      .text(mes, colMes + 6, y + 3);
    doc.fillColor(GOLD_SOFT).font("Courier-Bold").fontSize(9)
      .text(pac ? String(pac.valor) : "—", colP, y + 3, { width: 110, align: "center" });
    doc.fillColor(AZUL).font("Courier").fontSize(9)
      .text(uni ? String(uni.valor) : "—", colU, y + 3, { width: 110, align: "center" });
    doc.fillColor(CINZA).font("Courier").fontSize(9)
      .text(rede ? String(rede.valor) : "—", colR, y + 3, { width: 90, align: "center" });

    const varCel = pac && uni && uni.valor > 0
      ? Number((((pac.valor - uni.valor) / uni.valor) * 100).toFixed(2))
      : null;
    const corCel = corPorVariacao(varCel);
    desenhaBadge(doc, colVarPU, y + 2, 60, 13, fmtPct(varCel), corCel);

    doc.y = y + 18;
  });

  desenhaRodape(doc, hash);
}

export default router;
