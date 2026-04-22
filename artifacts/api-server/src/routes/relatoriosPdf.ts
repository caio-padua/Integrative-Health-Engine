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

    // Tipos previstos mas ainda nao implementados — retorna 501 para o
    // frontend cair no fallback window.print() ate ondas futuras.
    if (tipo === "comparativo-2unidades" || tipo === "drill-paciente") {
      res.status(501).json({ error: `Tipo '${tipo}' previsto mas ainda não implementado nesta onda.` });
      return;
    }

    res.status(400).json({ error: `Tipo de relatório desconhecido: '${tipo}'` });
  }
);

export default router;
