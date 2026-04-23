// ════════════════════════════════════════════════════════════════════
// PARMAVAULT-TSUNAMI Wave 5 · Blocos B2 + B4 + B5 + B6 backend
// Reconciliacao PARMAVAULT — endpoints master-only.
//
// /api/admin/parmavault/comissao/recalcular  (POST)  — job retroativo idempotente
// /api/admin/parmavault/declaracoes          (POST/GET) — declaracao manual + lista
// /api/admin/parmavault/declaracoes/csv      (POST) — upload CSV (texto raw)
// /api/admin/parmavault/repasses             (POST/GET) — registros de entrada $$
// /api/admin/parmavault/matriz               (GET) — farmacia × mes (Previsto/Declarado/Recebido/Gap)
// /api/admin/parmavault/farmacia/:id/percentual  (PATCH) — edita % comissao
// /api/admin/parmavault/relatorios/gerar     (POST) — cria snapshot + PDF + Excel
// /api/admin/parmavault/relatorios           (GET)  — lista historico
// /api/admin/parmavault/relatorios/:id/pdf   (GET) — baixa PDF
// /api/admin/parmavault/relatorios/:id/excel (GET) — baixa Excel
//
// Auth: requireRole("validador_mestre") + requireMasterEstrito.
// REGRA FERRO de negocio:
//   - comissao_paga NUNCA automatico (so manual).
//   - Snapshot do % comissao no relatorio é IMUTAVEL.
//   - Pacientes mostrados em iniciais nos PDFs/Excels (LGPD).
//   - Sistema registra/mostra, nunca bloqueia.
// ════════════════════════════════════════════════════════════════════
import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { requireRole as _requireRole } from "../middlewares/requireRole.js";
import { requireMasterEstrito as _requireMaster } from "../middlewares/requireMasterEstrito.js";
import {
  gerarPdfReconciliacao,
  streamPdfParaBuffer,
  type DadosPdfReconciliacao,
} from "../lib/relatorios/gerarPdfReconciliacao.js";
import {
  gerarExcelReconciliacao,
  type DadosExcelReconciliacao,
} from "../lib/relatorios/gerarExcelReconciliacao.js";

const router = Router();
const guardMaster = [_requireRole("validador_mestre"), _requireMaster];

const RELATORIOS_DIR = path.join(process.cwd(), "tmp", "parmavault_relatorios");

// ════════ B2 · JOB RETROATIVO ════════
router.post(
  "/admin/parmavault/comissao/recalcular",
  ...guardMaster,
  async (_req, res): Promise<void> => {
    try {
      const r = await db.execute(sql`
        WITH calc AS (
          SELECT pr.id,
                 COALESCE(NULLIF(pr.valor_formula_real, 0), NULLIF(pr.valor_formula_estimado, 0)) AS base,
                 fp.percentual_comissao
          FROM parmavault_receitas pr
          JOIN farmacias_parmavault fp ON fp.id = pr.farmacia_id
          WHERE pr.comissao_estimada IS NULL
             OR pr.comissao_estimada = 0
        )
        UPDATE parmavault_receitas pr
        SET
          comissao_estimada = CASE
            WHEN c.base IS NOT NULL AND c.base > 0
              THEN ROUND(c.base * (c.percentual_comissao / 100), 2)
            ELSE NULL
          END,
          comissao_estimada_origem = CASE
            WHEN c.base IS NOT NULL AND c.base > 0
              THEN 'job_retroativo_' || to_char(now(), 'YYYY-MM-DD')
            ELSE 'sem_valor_base'
          END,
          comissao_estimada_em = now()
        FROM calc c
        WHERE c.id = pr.id
        RETURNING pr.id, pr.comissao_estimada, pr.comissao_estimada_origem
      `);
      const tocados = r.rows.length;
      const com_base = r.rows.filter((x: any) => x.comissao_estimada !== null).length;
      const sem_base = tocados - com_base;
      res.json({ ok: true, tocados, com_base, sem_base });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  },
);

// ════════ B4 · DECLARACOES da farmacia (manual + CSV) ════════
router.post("/admin/parmavault/declaracoes", ...guardMaster, async (req, res): Promise<void> => {
  try {
    const { receita_id, valor_pago_paciente, data_compra, observacoes } = req.body ?? {};
    if (!receita_id || valor_pago_paciente == null) {
      res.status(400).json({ ok: false, error: "receita_id e valor_pago_paciente obrigatorios" });
      return;
    }
    // Buscar farmacia_id da receita
    const rec = await db.execute(sql`
      SELECT id, farmacia_id FROM parmavault_receitas WHERE id = ${Number(receita_id)}
    `);
    if (rec.rows.length === 0) {
      res.status(404).json({ ok: false, error: "receita nao encontrada" });
      return;
    }
    const farmacia_id = Number((rec.rows[0] as any).farmacia_id);
    const usuarioId = (req as any).user?.id ?? null;
    const ins = await db.execute(sql`
      INSERT INTO parmavault_declaracoes_farmacia
        (receita_id, farmacia_id, valor_pago_paciente, data_compra, fonte,
         declarado_por_usuario_id, observacoes)
      VALUES (${Number(receita_id)}, ${farmacia_id}, ${Number(valor_pago_paciente)},
        ${data_compra || null}, 'manual', ${usuarioId}, ${observacoes ?? null})
      RETURNING id
    `);
    res.status(201).json({ ok: true, id: Number((ins.rows[0] as any).id) });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post(
  "/admin/parmavault/declaracoes/csv",
  ...guardMaster,
  async (req, res): Promise<void> => {
    try {
      const { csv_text } = req.body ?? {};
      if (!csv_text || typeof csv_text !== "string") {
        res.status(400).json({ ok: false, error: "csv_text obrigatorio (string)" });
        return;
      }
      // Parser CSV simples: receita_id,valor_pago,data_compra,observacoes
      const linhas = csv_text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.toLowerCase().startsWith("receita_id"));

      const usuarioId = (req as any).user?.id ?? null;
      let inseridos = 0;
      const erros: { linha: number; motivo: string }[] = [];
      for (let i = 0; i < linhas.length; i++) {
        const cols = linhas[i]!.split(",").map((c) => c.trim());
        const receitaId = Number(cols[0]);
        const valor = Number(cols[1]);
        const data = cols[2] || null;
        const obs = cols[3] || null;
        if (!Number.isFinite(receitaId) || !Number.isFinite(valor)) {
          erros.push({ linha: i + 1, motivo: "receita_id ou valor invalido" });
          continue;
        }
        try {
          const rec = await db.execute(sql`
            SELECT farmacia_id FROM parmavault_receitas WHERE id = ${receitaId}
          `);
          if (rec.rows.length === 0) {
            erros.push({ linha: i + 1, motivo: "receita_id nao existe" });
            continue;
          }
          const farmId = Number((rec.rows[0] as any).farmacia_id);
          await db.execute(sql`
            INSERT INTO parmavault_declaracoes_farmacia
              (receita_id, farmacia_id, valor_pago_paciente, data_compra, fonte,
               declarado_por_usuario_id, observacoes)
            VALUES (${receitaId}, ${farmId}, ${valor}, ${data}, 'csv',
              ${usuarioId}, ${obs})
          `);
          inseridos++;
        } catch (e: any) {
          erros.push({ linha: i + 1, motivo: e.message });
        }
      }
      res.json({ ok: true, inseridos, erros });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  },
);

router.get("/admin/parmavault/declaracoes", ...guardMaster, async (req, res): Promise<void> => {
  try {
    const farmaciaId = req.query.farmacia_id ? Number(req.query.farmacia_id) : null;
    const limite = Math.min(Number(req.query.limite) || 200, 1000);
    const r = await db.execute(sql`
      SELECT d.id, d.receita_id, d.farmacia_id, d.valor_pago_paciente,
             d.data_compra, d.fonte, d.declarado_em, d.observacoes,
             fp.nome_fantasia AS farmacia_nome
      FROM parmavault_declaracoes_farmacia d
      LEFT JOIN farmacias_parmavault fp ON fp.id = d.farmacia_id
      WHERE d.ativo = TRUE
        AND (${farmaciaId}::int IS NULL OR d.farmacia_id = ${farmaciaId}::int)
      ORDER BY d.declarado_em DESC
      LIMIT ${limite}
    `);
    res.json({ ok: true, total: r.rows.length, declaracoes: r.rows });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ════════ Repasses (entradas de $$ confirmadas pelo CEO) ════════
router.post("/admin/parmavault/repasses", ...guardMaster, async (req, res): Promise<void> => {
  try {
    const { farmacia_id, ano_mes, valor_repasse, data_recebido, evidencia_texto, observacoes } =
      req.body ?? {};
    if (!farmacia_id || !ano_mes || valor_repasse == null || !data_recebido) {
      res.status(400).json({
        ok: false,
        error: "farmacia_id, ano_mes (YYYY-MM), valor_repasse e data_recebido obrigatorios",
      });
      return;
    }
    const usuarioId = (req as any).user?.id ?? null;
    const ins = await db.execute(sql`
      INSERT INTO parmavault_repasses
        (farmacia_id, ano_mes, valor_repasse, data_recebido,
         evidencia_texto, registrado_por_usuario_id, observacoes)
      VALUES (${Number(farmacia_id)}, ${String(ano_mes)}, ${Number(valor_repasse)},
        ${data_recebido}, ${evidencia_texto ?? null}, ${usuarioId}, ${observacoes ?? null})
      RETURNING id
    `);
    res.status(201).json({ ok: true, id: Number((ins.rows[0] as any).id) });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/admin/parmavault/repasses", ...guardMaster, async (req, res): Promise<void> => {
  try {
    const farmaciaId = req.query.farmacia_id ? Number(req.query.farmacia_id) : null;
    const r = await db.execute(sql`
      SELECT rp.id, rp.farmacia_id, rp.ano_mes, rp.valor_repasse,
             rp.data_recebido, rp.evidencia_texto, rp.observacoes, rp.registrado_em,
             fp.nome_fantasia AS farmacia_nome
      FROM parmavault_repasses rp
      LEFT JOIN farmacias_parmavault fp ON fp.id = rp.farmacia_id
      WHERE rp.ativo = TRUE
        AND (${farmaciaId}::int IS NULL OR rp.farmacia_id = ${farmaciaId}::int)
      ORDER BY rp.data_recebido DESC, rp.registrado_em DESC
      LIMIT 500
    `);
    res.json({ ok: true, total: r.rows.length, repasses: r.rows });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ════════ B5 · MATRIZ farmacia × mes (Previsto, Declarado, Recebido, Gap) ════════
router.get("/admin/parmavault/matriz", ...guardMaster, async (req, res): Promise<void> => {
  try {
    const farmaciaId = req.query.farmacia_id ? Number(req.query.farmacia_id) : null;
    const meses = Math.max(1, Math.min(Number(req.query.meses) || 6, 36));

    // Lista farmacias
    const farmacias = await db.execute(sql`
      SELECT id, nome_fantasia, percentual_comissao, ativo
      FROM farmacias_parmavault
      WHERE ativo = TRUE
        AND (${farmaciaId}::int IS NULL OR id = ${farmaciaId}::int)
      ORDER BY nome_fantasia
    `);

    // Por farmacia: previsto (sum comissao_estimada), declarado (sum dec.valor*pct),
    // recebido (sum repasses), gap (previsto - recebido).
    const out: any[] = [];
    for (const f of farmacias.rows as any[]) {
      const fid = Number(f.id);
      // Agregado total no periodo
      const tot = await db.execute(sql`
        SELECT
          COUNT(pr.id)::int AS qtd_receitas,
          COALESCE(SUM(pr.comissao_estimada), 0)::numeric AS previsto,
          COALESCE((
            SELECT SUM(d.valor_pago_paciente * (${Number(f.percentual_comissao) / 100}))
            FROM parmavault_declaracoes_farmacia d
            WHERE d.farmacia_id = ${fid}
              AND d.ativo = TRUE
              AND d.declarado_em >= now() - (${meses}::int || ' months')::interval
          ), 0)::numeric AS declarado,
          COALESCE((
            SELECT SUM(rp.valor_repasse)
            FROM parmavault_repasses rp
            WHERE rp.farmacia_id = ${fid}
              AND rp.ativo = TRUE
              AND rp.data_recebido >= (now() - (${meses}::int || ' months')::interval)::date
          ), 0)::numeric AS recebido
        FROM parmavault_receitas pr
        WHERE pr.farmacia_id = ${fid}
          AND pr.emitida_em >= now() - (${meses}::int || ' months')::interval
      `);
      const linha = tot.rows[0] as any;
      const previsto = Number(linha.previsto || 0);
      const declarado = Number(linha.declarado || 0);
      const recebido = Number(linha.recebido || 0);
      const gap = previsto - recebido;

      out.push({
        farmacia_id: fid,
        farmacia_nome: f.nome_fantasia,
        percentual_comissao: Number(f.percentual_comissao),
        qtd_receitas: Number(linha.qtd_receitas || 0),
        previsto,
        declarado,
        recebido,
        gap,
        gap_pct: previsto > 0 ? (gap / previsto) * 100 : 0,
      });
    }

    // KPIs gerais
    const totais = out.reduce(
      (acc, r) => ({
        previsto: acc.previsto + r.previsto,
        declarado: acc.declarado + r.declarado,
        recebido: acc.recebido + r.recebido,
        gap: acc.gap + r.gap,
        qtd: acc.qtd + r.qtd_receitas,
      }),
      { previsto: 0, declarado: 0, recebido: 0, gap: 0, qtd: 0 },
    );

    res.json({ ok: true, meses_janela: meses, kpis: totais, linhas: out });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// PATCH percentual comissao por farmacia (master-only)
router.patch(
  "/admin/parmavault/farmacia/:id/percentual",
  ...guardMaster,
  async (req, res): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const { percentual_comissao } = req.body ?? {};
      const pct = Number(percentual_comissao);
      if (!Number.isFinite(id) || !Number.isFinite(pct) || pct < 0 || pct > 100) {
        res.status(400).json({ ok: false, error: "id e percentual_comissao (0-100) obrigatorios" });
        return;
      }
      await db.execute(sql`
        UPDATE farmacias_parmavault
        SET percentual_comissao = ${pct}, atualizado_em = now()
        WHERE id = ${id}
      `);
      res.json({ ok: true, id, percentual_comissao: pct });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  },
);

// ════════ B6 · GERA RELATORIO (snapshot + PDF + Excel) ════════
router.post("/admin/parmavault/relatorios/gerar", ...guardMaster, async (req, res): Promise<void> => {
  try {
    const { farmacia_id, periodo_inicio, periodo_fim } = req.body ?? {};
    if (!farmacia_id || !periodo_inicio || !periodo_fim) {
      res
        .status(400)
        .json({ ok: false, error: "farmacia_id, periodo_inicio e periodo_fim obrigatorios" });
      return;
    }
    const fid = Number(farmacia_id);

    // Carrega farmacia
    const f = await db.execute(sql`
      SELECT id, nome_fantasia, cnpj, percentual_comissao
      FROM farmacias_parmavault WHERE id = ${fid}
    `);
    if (f.rows.length === 0) {
      res.status(404).json({ ok: false, error: "farmacia nao encontrada" });
      return;
    }
    const farm = f.rows[0] as any;

    // Carrega receitas do periodo + paciente nome (LGPD na renderizacao)
    const recR = await db.execute(sql`
      SELECT pr.id, pr.numero_receita, pr.emitida_em AS data,
             pac.nome AS paciente_nome,
             COALESCE(NULLIF(pr.valor_formula_real, 0), NULLIF(pr.valor_formula_estimado, 0)) AS valor_formula,
             pr.comissao_estimada AS comissao_devida,
             EXISTS(SELECT 1 FROM parmavault_declaracoes_farmacia d
                    WHERE d.receita_id = pr.id AND d.ativo = TRUE) AS declarado,
             COALESCE(pr.comissao_paga, FALSE) AS pago
      FROM parmavault_receitas pr
      LEFT JOIN pacientes pac ON pac.id = pr.paciente_id
      WHERE pr.farmacia_id = ${fid}
        AND pr.emitida_em::date >= ${periodo_inicio}::date
        AND pr.emitida_em::date <= ${periodo_fim}::date
      ORDER BY pr.emitida_em ASC
      LIMIT 5000
    `);

    // Serie mensal pelo periodo
    const serieR = await db.execute(sql`
      WITH meses AS (
        SELECT to_char(generate_series(
          date_trunc('month', ${periodo_inicio}::date),
          date_trunc('month', ${periodo_fim}::date),
          '1 month'::interval
        ), 'YYYY-MM') AS mes
      ),
      previsto AS (
        SELECT to_char(date_trunc('month', emitida_em), 'YYYY-MM') AS mes,
               COUNT(id)::int AS qtd,
               COALESCE(SUM(comissao_estimada), 0)::numeric AS valor
        FROM parmavault_receitas
        WHERE farmacia_id = ${fid}
          AND emitida_em::date BETWEEN ${periodo_inicio}::date AND ${periodo_fim}::date
        GROUP BY 1
      ),
      declarado AS (
        SELECT to_char(date_trunc('month', d.declarado_em), 'YYYY-MM') AS mes,
               COALESCE(SUM(d.valor_pago_paciente * (${Number(farm.percentual_comissao) / 100})), 0)::numeric AS valor
        FROM parmavault_declaracoes_farmacia d
        WHERE d.farmacia_id = ${fid}
          AND d.ativo = TRUE
          AND d.declarado_em::date BETWEEN ${periodo_inicio}::date AND ${periodo_fim}::date
        GROUP BY 1
      ),
      recebido AS (
        SELECT ano_mes AS mes, COALESCE(SUM(valor_repasse), 0)::numeric AS valor
        FROM parmavault_repasses
        WHERE farmacia_id = ${fid}
          AND ativo = TRUE
          AND data_recebido BETWEEN ${periodo_inicio}::date AND ${periodo_fim}::date
        GROUP BY 1
      )
      SELECT m.mes,
             COALESCE(p.qtd, 0)::int   AS qtd_receitas,
             COALESCE(p.valor, 0)::numeric AS previsto,
             COALESCE(d.valor, 0)::numeric AS declarado,
             COALESCE(r.valor, 0)::numeric AS recebido,
             (COALESCE(p.valor, 0) - COALESCE(r.valor, 0))::numeric AS gap
      FROM meses m
      LEFT JOIN previsto  p ON p.mes = m.mes
      LEFT JOIN declarado d ON d.mes = m.mes
      LEFT JOIN recebido  r ON r.mes = m.mes
      ORDER BY m.mes
    `);

    const repassesR = await db.execute(sql`
      SELECT ano_mes, valor_repasse, data_recebido, evidencia_texto
      FROM parmavault_repasses
      WHERE farmacia_id = ${fid}
        AND ativo = TRUE
        AND data_recebido BETWEEN ${periodo_inicio}::date AND ${periodo_fim}::date
      ORDER BY data_recebido ASC
    `);

    // Totais snapshot
    const totalPrevisto = serieR.rows.reduce((s: number, r: any) => s + Number(r.previsto || 0), 0);
    const totalDeclarado = serieR.rows.reduce((s: number, r: any) => s + Number(r.declarado || 0), 0);
    const totalRecebido = serieR.rows.reduce((s: number, r: any) => s + Number(r.recebido || 0), 0);
    const totalGap = totalPrevisto - totalRecebido;
    const totalReceitas = recR.rows.length;

    const protocolo = crypto
      .createHash("sha256")
      .update(`${fid}|${periodo_inicio}|${periodo_fim}|${Date.now()}|${Math.random()}`)
      .digest("hex")
      .slice(0, 10)
      .toUpperCase();

    const usuarioId = (req as any).user?.id ?? null;

    // Insere snapshot
    const ins = await db.execute(sql`
      INSERT INTO parmavault_relatorios_gerados
        (farmacia_id, periodo_inicio, periodo_fim, protocolo_hash,
         gerado_por_usuario_id, percentual_comissao_snapshot,
         total_previsto_snapshot, total_declarado_snapshot,
         total_recebido_snapshot, total_gap_snapshot, total_receitas)
      VALUES (${fid}, ${periodo_inicio}::date, ${periodo_fim}::date, ${protocolo},
        ${usuarioId}, ${Number(farm.percentual_comissao)},
        ${totalPrevisto}, ${totalDeclarado}, ${totalRecebido}, ${totalGap}, ${totalReceitas})
      RETURNING id
    `);
    const relatorioId = Number((ins.rows[0] as any).id);

    // Gera PDF
    const dadosPdf: DadosPdfReconciliacao = {
      farmacia: {
        id: fid,
        nome: String(farm.nome_fantasia),
        cnpj: farm.cnpj,
        percentual_comissao: Number(farm.percentual_comissao),
      },
      periodo: { inicio: periodo_inicio, fim: periodo_fim },
      resumo: {
        previsto: totalPrevisto,
        declarado: totalDeclarado,
        recebido: totalRecebido,
        gap: totalGap,
        qtd_receitas: totalReceitas,
      },
      serie_mensal: serieR.rows.map((r: any) => ({
        mes: String(r.mes),
        previsto: Number(r.previsto || 0),
        declarado: Number(r.declarado || 0),
        recebido: Number(r.recebido || 0),
      })),
      receitas: recR.rows.map((r: any) => ({
        id: Number(r.id),
        numero_receita: r.numero_receita,
        data: r.data,
        paciente_nome: r.paciente_nome,
        valor_formula: r.valor_formula != null ? Number(r.valor_formula) : null,
        comissao_devida: r.comissao_devida != null ? Number(r.comissao_devida) : null,
        declarado: !!r.declarado,
        pago: !!r.pago,
      })),
      protocolo,
      geradoEm: new Date(),
    };
    const pdfDoc = gerarPdfReconciliacao(dadosPdf);
    const pdfBuf = await streamPdfParaBuffer(pdfDoc);

    // Gera Excel
    const dadosExcel: DadosExcelReconciliacao = {
      farmacia: {
        id: fid,
        nome: String(farm.nome_fantasia),
        percentual_comissao: Number(farm.percentual_comissao),
      },
      periodo: { inicio: periodo_inicio, fim: periodo_fim },
      protocolo,
      serie_mensal: serieR.rows.map((r: any) => ({
        mes: String(r.mes),
        qtd_receitas: Number(r.qtd_receitas || 0),
        previsto: Number(r.previsto || 0),
        declarado: Number(r.declarado || 0),
        recebido: Number(r.recebido || 0),
        gap: Number(r.gap || 0),
      })),
      receitas: dadosPdf.receitas,
      repasses: repassesR.rows.map((r: any) => ({
        ano_mes: String(r.ano_mes),
        valor_repasse: Number(r.valor_repasse),
        data_recebido: String(r.data_recebido),
        evidencia_texto: r.evidencia_texto,
      })),
    };
    const excelBuf = gerarExcelReconciliacao(dadosExcel);

    // Persiste em disco
    await fs.mkdir(RELATORIOS_DIR, { recursive: true });
    const pdfPath = path.join(RELATORIOS_DIR, `rel_${relatorioId}_${protocolo}.pdf`);
    const excelPath = path.join(RELATORIOS_DIR, `rel_${relatorioId}_${protocolo}.xlsx`);
    await fs.writeFile(pdfPath, pdfBuf);
    await fs.writeFile(excelPath, excelBuf);

    await db.execute(sql`
      UPDATE parmavault_relatorios_gerados
      SET pdf_path = ${pdfPath}, excel_path = ${excelPath}
      WHERE id = ${relatorioId}
    `);

    res.status(201).json({
      ok: true,
      relatorio_id: relatorioId,
      protocolo,
      farmacia: { id: fid, nome: farm.nome_fantasia },
      periodo: { inicio: periodo_inicio, fim: periodo_fim },
      snapshot: {
        previsto: totalPrevisto,
        declarado: totalDeclarado,
        recebido: totalRecebido,
        gap: totalGap,
        qtd_receitas: totalReceitas,
        percentual_comissao: Number(farm.percentual_comissao),
      },
      pdf_url: `/api/admin/parmavault/relatorios/${relatorioId}/pdf`,
      excel_url: `/api/admin/parmavault/relatorios/${relatorioId}/excel`,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/admin/parmavault/relatorios", ...guardMaster, async (req, res): Promise<void> => {
  try {
    const farmaciaId = req.query.farmacia_id ? Number(req.query.farmacia_id) : null;
    const r = await db.execute(sql`
      SELECT rg.id, rg.farmacia_id, fp.nome_fantasia AS farmacia_nome,
             rg.periodo_inicio, rg.periodo_fim, rg.protocolo_hash,
             rg.gerado_em, rg.percentual_comissao_snapshot,
             rg.total_previsto_snapshot, rg.total_declarado_snapshot,
             rg.total_recebido_snapshot, rg.total_gap_snapshot, rg.total_receitas
      FROM parmavault_relatorios_gerados rg
      LEFT JOIN farmacias_parmavault fp ON fp.id = rg.farmacia_id
      WHERE (${farmaciaId}::int IS NULL OR rg.farmacia_id = ${farmaciaId}::int)
      ORDER BY rg.gerado_em DESC
      LIMIT 200
    `);
    res.json({ ok: true, total: r.rows.length, relatorios: r.rows });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/admin/parmavault/relatorios/:id/pdf", ...guardMaster, async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const r = await db.execute(sql`
      SELECT pdf_path, protocolo_hash FROM parmavault_relatorios_gerados WHERE id = ${id}
    `);
    if (r.rows.length === 0 || !(r.rows[0] as any).pdf_path) {
      res.status(404).json({ error: "relatorio nao encontrado" });
      return;
    }
    const buf = await fs.readFile((r.rows[0] as any).pdf_path);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="reconciliacao_${(r.rows[0] as any).protocolo_hash}.pdf"`,
    );
    res.send(buf);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/parmavault/relatorios/:id/excel", ...guardMaster, async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const r = await db.execute(sql`
      SELECT excel_path, protocolo_hash FROM parmavault_relatorios_gerados WHERE id = ${id}
    `);
    if (r.rows.length === 0 || !(r.rows[0] as any).excel_path) {
      res.status(404).json({ error: "relatorio nao encontrado" });
      return;
    }
    const buf = await fs.readFile((r.rows[0] as any).excel_path);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="reconciliacao_${(r.rows[0] as any).protocolo_hash}.xlsx"`,
    );
    res.send(buf);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Lista warnings de emissao (B1 — pra observabilidade no painel)
router.get("/admin/parmavault/warnings", ...guardMaster, async (req, res): Promise<void> => {
  try {
    const limite = Math.min(Number(req.query.limite) || 200, 1000);
    const r = await db.execute(sql`
      SELECT w.id, w.prescricao_id, w.unidade_id, u.nome AS unidade_nome,
             w.farmacia_id, fp.nome_fantasia AS farmacia_nome,
             w.motivo, w.detectado_em, w.decisao, w.observacoes
      FROM parmavault_emissao_warnings w
      LEFT JOIN unidades u              ON u.id  = w.unidade_id
      LEFT JOIN farmacias_parmavault fp ON fp.id = w.farmacia_id
      ORDER BY w.detectado_em DESC
      LIMIT ${limite}
    `);
    res.json({ ok: true, total: r.rows.length, warnings: r.rows });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
