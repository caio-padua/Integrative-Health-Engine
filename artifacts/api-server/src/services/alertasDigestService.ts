/**
 * Task #26 · Service de digest diario dos alertas do Painel PAWARDS.
 *
 * Por que existe:
 *   O endpoint GET /painel-pawards/alertas (routes/painelPawards.ts) ja
 *   identifica clinicas abaixo do faturamento minimo, KPIs fora da faixa
 *   (ocupacao/NPS) e anastomoses pendentes — mas o Caio so descobre se
 *   entrar no dashboard. Este service consulta exatamente os mesmos
 *   criterios e envia 1 email por dia pro CEO + gestores configurados,
 *   garantindo que o alerta chegue mesmo com o painel fechado.
 *
 * Destinatarios:
 *   - CEO_EMAIL (env, default ceo@pawards.com.br)
 *   - ALERTAS_DIGEST_GESTORES (env, lista separada por virgula)
 *
 * Idempotencia:
 *   UNIQUE (dia_brt, destinatario_email) em alertas_digest_envios.
 *   Reenvio manual via { forcar: true } usa ON CONFLICT DO UPDATE.
 *
 * Defensivo: nunca lanca pra fora; toda falha vira { enviado: false, motivo }.
 */

import { db, pool } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getGmailClient } from "../lib/google-gmail";

// Row shapes retornados pelas queries cruas do pool. Sao tipadas explicitamente
// pra nao precisar de `any` — o pg retorna `unknown` por linha quando nao
// passamos generics, e os campos vem como string|number conforme o driver.
interface AbaixoMinRow {
  id: number;
  unidade: string;
  minimo: string | number;
  realizado: string | number;
  pct_minimo: string | number | null;
}

interface KpiRow {
  id: number;
  unidade: string;
  valor: string | number;
  limite: string | number | null;
  kpi: string;
  label: string;
  unidade_medida: string;
}

interface PendenciaRow {
  id: number;
  modulo: string | null;
  criticidade: string | null;
  titulo: string | null;
}

// Resultado retornado por `db.execute` (drizzle-orm node-postgres). O tipo
// publico do drizzle eh `unknown`/`QueryResult` dependendo do dialect — usamos
// um shape minimo que cobre os dois caminhos (`rows` direto ou ja-array).
type ExecuteResult<T> = { rows?: T[] } | T[];

function rowsOf<T>(r: ExecuteResult<T>): T[] {
  if (Array.isArray(r)) return r;
  return r.rows ?? [];
}

const CEO_EMAIL = process.env["CEO_EMAIL"] || "ceo@pawards.com.br";
const FROM_ADDR = "clinica.padua.agenda@gmail.com";

function destinatariosConfigurados(): string[] {
  const set = new Set<string>();
  const ceo = (CEO_EMAIL || "").trim();
  if (ceo && ceo.includes("@")) set.add(ceo.toLowerCase());
  const extras = (process.env["ALERTAS_DIGEST_GESTORES"] || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0 && s.includes("@"));
  for (const e of extras) set.add(e);
  return Array.from(set);
}

function hojeBrtISO(): string {
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function nowBrISO(): string {
  return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function dashboardUrl(): string {
  const dom = process.env["PUBLIC_APP_URL"]
    || (process.env["REPLIT_DOMAINS"] ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]!.trim()}` : "")
    || "";
  return dom ? `${dom.replace(/\/$/, "")}/painel-pawards` : "/painel-pawards";
}

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function sanitizeHeader(s: string): string {
  return String(s ?? "").replace(/[\r\n]/g, "").trim();
}

function fmtBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface ClinicaAbaixoMinimo {
  id: number;
  unidade: string;
  minimo: number;
  realizado: number;
  pct_minimo: number | null;
}

export interface KpiForaFaixa {
  id: number;
  unidade: string;
  kpi: string;
  label: string;
  valor: number;
  limite: number | null;
  unidade_medida: string;
}

export interface PendenciaResumo {
  id: number;
  modulo: string | null;
  criticidade: string | null;
  titulo: string | null;
}

export interface PayloadAlertasDigest {
  diaBrt: string;
  geradoEm: string;
  clinicasAbaixoMinimo: ClinicaAbaixoMinimo[];
  kpisForaFaixa: KpiForaFaixa[];
  pendencias: PendenciaResumo[];
  total: number;
}

/**
 * Reproduz a logica do endpoint GET /painel-pawards/alertas (routes/
 * painelPawards.ts secao 11B). Mantemos as queries acopladas via copia
 * literal pra evitar dependencia circular routes <-> services e pra que
 * mudancas na regra de "alerta" do dashboard precisem refletir aqui de
 * forma explicita (eh exatamente o ponto da task).
 */
export async function calcularPayloadDigest(): Promise<PayloadAlertasDigest> {
  const diaBrt = hojeBrtISO();

  const abaixoMin = await pool.query<AbaixoMinRow>(`
    SELECT
      u.id, COALESCE(u.nick, u.nome) AS unidade,
      u.fat_minimo_mensal::numeric AS minimo,
      COALESCE(SUM(fd.valor_realizado), 0)::numeric AS realizado,
      ROUND(
        COALESCE(SUM(fd.valor_realizado), 0) / NULLIF(u.fat_minimo_mensal, 0) * 100, 1
      ) AS pct_minimo
    FROM unidades u
    LEFT JOIN faturamento_diario fd ON fd.unidade_id = u.id
      AND fd.data >= date_trunc('month', CURRENT_DATE)
    WHERE u.fat_minimo_mensal > 0
    GROUP BY u.id
    HAVING COALESCE(SUM(fd.valor_realizado), 0) < u.fat_minimo_mensal
    ORDER BY pct_minimo ASC
  `);

  const kpiOcupacao = await pool.query<KpiRow>(`
    SELECT
      u.id, COALESCE(u.nick, u.nome) AS unidade,
      ROUND(COALESCE(AVG(fd.taxa_ocupacao), 0)::numeric, 1) AS valor,
      (SELECT faixa_baixa_max FROM parametros_referencia_global WHERE codigo='OCUPACAO') AS limite,
      'OCUPACAO' AS kpi, 'Taxa de ocupação baixa' AS label, '%' AS unidade_medida
    FROM unidades u
    LEFT JOIN faturamento_diario fd ON fd.unidade_id = u.id
      AND fd.data >= date_trunc('month', CURRENT_DATE)
    WHERE u.fat_meta_mensal > 0
    GROUP BY u.id
    HAVING COALESCE(AVG(fd.taxa_ocupacao), 0) <
           (SELECT faixa_baixa_max FROM parametros_referencia_global WHERE codigo='OCUPACAO')
  `);

  const kpiNps = await pool.query<KpiRow>(`
    SELECT
      u.id, COALESCE(u.nick, u.nome) AS unidade,
      ROUND(COALESCE(AVG(fd.nps), 0)::numeric, 1) AS valor,
      (SELECT faixa_baixa_max FROM parametros_referencia_global WHERE codigo='NPS') AS limite,
      'NPS' AS kpi, 'NPS abaixo do esperado' AS label, 'pts' AS unidade_medida
    FROM unidades u
    LEFT JOIN faturamento_diario fd ON fd.unidade_id = u.id
      AND fd.data >= date_trunc('month', CURRENT_DATE)
    WHERE u.fat_meta_mensal > 0
    GROUP BY u.id
    HAVING COALESCE(AVG(fd.nps), 0) <
           (SELECT faixa_baixa_max FROM parametros_referencia_global WHERE codigo='NPS')
  `);

  // Tabela `anastomoses_pendentes` eh opcional em alguns ambientes (Wave 10);
  // se nao existir, segue como lista vazia em vez de derrubar o digest.
  const pendencias: { rows: PendenciaRow[] } = await pool
    .query<PendenciaRow>(`
      SELECT id, modulo, criticidade, titulo
      FROM anastomoses_pendentes
      WHERE status = 'aberta'
      ORDER BY
        CASE criticidade WHEN 'critica' THEN 1 WHEN 'alta' THEN 2 WHEN 'media' THEN 3 ELSE 4 END,
        criado_em DESC
      LIMIT 6
    `)
    .catch(() => ({ rows: [] as PendenciaRow[] }));

  const clinicas: ClinicaAbaixoMinimo[] = abaixoMin.rows.map((r) => ({
    id: Number(r.id),
    unidade: String(r.unidade ?? "—"),
    minimo: Number(r.minimo ?? 0),
    realizado: Number(r.realizado ?? 0),
    pct_minimo: r.pct_minimo === null ? null : Number(r.pct_minimo),
  }));

  const kpis: KpiForaFaixa[] = [...kpiOcupacao.rows, ...kpiNps.rows].map((r) => ({
    id: Number(r.id),
    unidade: String(r.unidade ?? "—"),
    kpi: String(r.kpi ?? "—"),
    label: String(r.label ?? "—"),
    valor: Number(r.valor ?? 0),
    limite: r.limite === null || r.limite === undefined ? null : Number(r.limite),
    unidade_medida: String(r.unidade_medida ?? ""),
  }));

  const pend: PendenciaResumo[] = pendencias.rows.map((r) => ({
    id: Number(r.id),
    modulo: r.modulo ?? null,
    criticidade: r.criticidade ?? null,
    titulo: r.titulo ?? null,
  }));

  return {
    diaBrt,
    geradoEm: nowBrISO(),
    clinicasAbaixoMinimo: clinicas,
    kpisForaFaixa: kpis,
    pendencias: pend,
    total: clinicas.length + kpis.length + pend.length,
  };
}

function tabelaClinicas(rows: ClinicaAbaixoMinimo[]): string {
  if (rows.length === 0) return "";
  const linhas = rows
    .map((r) => {
      const pct = r.pct_minimo === null ? "—" : `${r.pct_minimo.toFixed(1)}%`;
      const falta = Math.max(0, r.minimo - r.realizado);
      return `<tr>
        <td style="padding:10px 12px;font-size:13px;color:#333;border-bottom:1px solid #f0ece4">${escapeHtml(r.unidade)}</td>
        <td style="padding:10px 12px;font-size:13px;color:#333;border-bottom:1px solid #f0ece4;text-align:right">${escapeHtml(fmtBRL(r.minimo))}</td>
        <td style="padding:10px 12px;font-size:13px;color:#333;border-bottom:1px solid #f0ece4;text-align:right">${escapeHtml(fmtBRL(r.realizado))}</td>
        <td style="padding:10px 12px;font-size:13px;color:#c62828;border-bottom:1px solid #f0ece4;text-align:right;font-weight:600">${pct}</td>
        <td style="padding:10px 12px;font-size:12px;color:#888;border-bottom:1px solid #f0ece4;text-align:right">${escapeHtml(fmtBRL(falta))}</td>
      </tr>`;
    })
    .join("");
  return `
    <div style="margin:24px 0">
      <div style="font-size:10px;letter-spacing:2px;color:#999;margin-bottom:8px;font-weight:600">CLÍNICAS ABAIXO DO FATURAMENTO MÍNIMO</div>
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #e8e4dc" cellpadding="0" cellspacing="0">
        <thead>
          <tr>
            <th style="padding:8px 12px;font-size:10px;letter-spacing:1.5px;color:#999;text-align:left;border-bottom:1px solid #e8e4dc">CLÍNICA</th>
            <th style="padding:8px 12px;font-size:10px;letter-spacing:1.5px;color:#999;text-align:right;border-bottom:1px solid #e8e4dc">MÍNIMO</th>
            <th style="padding:8px 12px;font-size:10px;letter-spacing:1.5px;color:#999;text-align:right;border-bottom:1px solid #e8e4dc">REALIZADO</th>
            <th style="padding:8px 12px;font-size:10px;letter-spacing:1.5px;color:#999;text-align:right;border-bottom:1px solid #e8e4dc">% MÍNIMO</th>
            <th style="padding:8px 12px;font-size:10px;letter-spacing:1.5px;color:#999;text-align:right;border-bottom:1px solid #e8e4dc">FALTA</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>`;
}

function tabelaKpis(rows: KpiForaFaixa[]): string {
  if (rows.length === 0) return "";
  const linhas = rows
    .map((r) => `<tr>
      <td style="padding:10px 12px;font-size:13px;color:#333;border-bottom:1px solid #f0ece4">${escapeHtml(r.unidade)}</td>
      <td style="padding:10px 12px;font-size:13px;color:#555;border-bottom:1px solid #f0ece4">${escapeHtml(r.label)}</td>
      <td style="padding:10px 12px;font-size:13px;color:#c62828;border-bottom:1px solid #f0ece4;text-align:right;font-weight:600">${r.valor}${escapeHtml(r.unidade_medida)}</td>
      <td style="padding:10px 12px;font-size:12px;color:#888;border-bottom:1px solid #f0ece4;text-align:right">limite ${r.limite ?? "—"}${escapeHtml(r.unidade_medida)}</td>
    </tr>`)
    .join("");
  return `
    <div style="margin:24px 0">
      <div style="font-size:10px;letter-spacing:2px;color:#999;margin-bottom:8px;font-weight:600">KPIs FORA DA FAIXA</div>
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #e8e4dc" cellpadding="0" cellspacing="0">
        <tbody>${linhas}</tbody>
      </table>
    </div>`;
}

function tabelaPendencias(rows: PendenciaResumo[]): string {
  if (rows.length === 0) return "";
  const linhas = rows
    .map((r) => `<tr>
      <td style="padding:10px 12px;font-size:12px;color:#999;border-bottom:1px solid #f0ece4;width:90px">${escapeHtml(String(r.criticidade ?? "—").toUpperCase())}</td>
      <td style="padding:10px 12px;font-size:13px;color:#333;border-bottom:1px solid #f0ece4">${escapeHtml(r.titulo ?? "(sem titulo)")}</td>
      <td style="padding:10px 12px;font-size:12px;color:#888;border-bottom:1px solid #f0ece4;text-align:right">${escapeHtml(r.modulo ?? "—")}</td>
    </tr>`)
    .join("");
  return `
    <div style="margin:24px 0">
      <div style="font-size:10px;letter-spacing:2px;color:#999;margin-bottom:8px;font-weight:600">ANASTOMOSES / PENDÊNCIAS ABERTAS</div>
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #e8e4dc" cellpadding="0" cellspacing="0">
        <tbody>${linhas}</tbody>
      </table>
    </div>`;
}

/**
 * Renderiza o email no estilo institucional MEDCORE (cabecalho colorido,
 * corpo branco, rodape PAWARDS) — mesma diretriz visual de
 * lib/email-templates.ts, mas com layout de digest (multiplas tabelas)
 * em vez de comunicacao 1-paciente.
 */
export function renderHtmlDigest(payload: PayloadAlertasDigest): string {
  const cor = "#c62828"; // ALERTA — cor da diretriz email-templates.ts
  const dashUrl = dashboardUrl();
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Georgia','Times New Roman',serif;max-width:640px;margin:0 auto;padding:0;background:#f5f4f0">
  <div style="background:${cor};padding:32px 28px;text-align:center">
    <div style="font-size:10px;letter-spacing:4px;color:rgba(255,255,255,0.5);margin-bottom:10px;font-weight:600">PAWARDS · MEDCORE</div>
    <div style="width:40px;height:1px;background:rgba(255,255,255,0.3);margin:0 auto 10px auto"></div>
    <div style="font-size:18px;font-weight:400;color:#fff;letter-spacing:1px">Digest Diário de Alertas</div>
    <div style="font-size:10px;letter-spacing:3px;color:rgba(255,255,255,0.6);margin-top:8px;font-weight:600">ALERTA · ${escapeHtml(payload.diaBrt)}</div>
  </div>

  <div style="background:#fff;padding:36px 32px">
    <p style="font-size:15px;color:#333;line-height:1.8;margin:0 0 8px 0">Olá Caio,</p>
    <p style="font-size:14px;color:#555;line-height:1.8;margin:0 0 24px 0">
      O painel PAWARDS identificou <strong>${payload.total}</strong> alerta${payload.total === 1 ? "" : "s"} em aberto hoje.
      Segue o resumo executivo das clínicas abaixo do faturamento mínimo, KPIs fora da faixa
      e pendências operacionais. Para detalhes e ações, acesse o dashboard.
    </p>

    <div style="background:#faf9f7;padding:20px;margin:24px 0;border-left:3px solid ${cor}">
      <table style="width:100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:11px;letter-spacing:1.5px;color:#999;font-weight:600">CLÍNICAS ABAIXO DO MÍNIMO</td>
          <td style="font-size:18px;color:${cor};font-weight:700;text-align:right">${payload.clinicasAbaixoMinimo.length}</td>
        </tr>
        <tr>
          <td style="font-size:11px;letter-spacing:1.5px;color:#999;font-weight:600;padding-top:6px">KPIs FORA DA FAIXA</td>
          <td style="font-size:18px;color:${cor};font-weight:700;text-align:right;padding-top:6px">${payload.kpisForaFaixa.length}</td>
        </tr>
        <tr>
          <td style="font-size:11px;letter-spacing:1.5px;color:#999;font-weight:600;padding-top:6px">PENDÊNCIAS ABERTAS</td>
          <td style="font-size:18px;color:${cor};font-weight:700;text-align:right;padding-top:6px">${payload.pendencias.length}</td>
        </tr>
      </table>
    </div>

    ${tabelaClinicas(payload.clinicasAbaixoMinimo)}
    ${tabelaKpis(payload.kpisForaFaixa)}
    ${tabelaPendencias(payload.pendencias)}

    <div style="text-align:center;margin:32px 0 8px 0">
      <a href="${escapeHtml(dashUrl)}" style="display:inline-block;background:${cor};color:#fff;padding:12px 28px;text-decoration:none;font-size:13px;letter-spacing:1px;font-weight:600">ABRIR DASHBOARD PAWARDS</a>
    </div>

    <div style="border-top:1px solid #e8e4dc;padding-top:24px;margin-top:32px">
      <p style="font-size:13px;color:#555;line-height:1.7;margin:0">Atenciosamente,</p>
      <p style="font-size:14px;color:#333;font-weight:600;margin:8px 0 2px 0">PAWARDS · Painel CEO</p>
      <p style="font-size:12px;color:#888;margin:0;letter-spacing:0.5px">Digest gerado em ${escapeHtml(payload.geradoEm)} (BRT)</p>
    </div>
  </div>

  <div style="padding:20px 28px;text-align:center;background:#faf9f7">
    <div style="font-size:10px;letter-spacing:2px;color:#bbb;margin-bottom:6px;font-weight:600">PAWARDS · MEDCORE</div>
    <div style="font-size:9px;color:#ccc;letter-spacing:1px">Alerta automático · Task #26 · Digest diário</div>
  </div>
</body>
</html>`;
}

function buildSubject(payload: PayloadAlertasDigest): string {
  const partes: string[] = [];
  if (payload.clinicasAbaixoMinimo.length > 0)
    partes.push(`${payload.clinicasAbaixoMinimo.length} abaixo do mínimo`);
  if (payload.kpisForaFaixa.length > 0)
    partes.push(`${payload.kpisForaFaixa.length} KPI${payload.kpisForaFaixa.length === 1 ? "" : "s"} fora da faixa`);
  if (payload.pendencias.length > 0)
    partes.push(`${payload.pendencias.length} pendência${payload.pendencias.length === 1 ? "" : "s"}`);
  const detalhe = partes.length > 0 ? ` · ${partes.join(" · ")}` : "";
  return `⚠️ PAWARDS · Alertas ${payload.diaBrt}${detalhe}`;
}

function buildEmailRaw(opts: { to: string; subject: string; htmlBody: string }): string {
  const subjectB64 = Buffer.from(opts.subject).toString("base64");
  const parts = [
    `From: PAWARDS - Painel CEO <${FROM_ADDR}>`,
    `To: ${sanitizeHeader(opts.to)}`,
    `Subject: =?UTF-8?B?${subjectB64}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(opts.htmlBody).toString("base64"),
  ];
  return Buffer.from(parts.join("\r\n")).toString("base64url");
}

export interface EnviarDigestOpts {
  destinatarios?: string[];
  forcar?: boolean;
  origem?: string; // "WORKER" | "MANUAL" | "TEST"
}

export interface EnvioDigestResultado {
  destinatario: string;
  enviado: boolean;
  motivo?: string;
  gmailMessageId?: string | null;
}

export interface DispararDigestResultado {
  diaBrt: string;
  total: number;
  pulado: boolean;
  motivo?: string;
  envios: EnvioDigestResultado[];
}

/**
 * Disparo principal do digest. Calcula payload, decide se ha alerta,
 * envia email pra cada destinatario e persiste auditoria/idempotencia.
 */
export async function dispararDigestAlertas(
  opts: EnviarDigestOpts = {},
): Promise<DispararDigestResultado> {
  const origem = opts.origem || "WORKER";
  const destinatarios = (opts.destinatarios && opts.destinatarios.length > 0)
    ? Array.from(new Set(opts.destinatarios.map((s) => s.trim().toLowerCase()).filter((s) => s.includes("@"))))
    : destinatariosConfigurados();

  const payload = await calcularPayloadDigest();

  if (payload.total === 0) {
    return {
      diaBrt: payload.diaBrt,
      total: 0,
      pulado: true,
      motivo: "sem_alertas",
      envios: [],
    };
  }

  if (destinatarios.length === 0) {
    return {
      diaBrt: payload.diaBrt,
      total: payload.total,
      pulado: true,
      motivo: "sem_destinatarios",
      envios: [],
    };
  }

  const subject = buildSubject(payload);
  const html = renderHtmlDigest(payload);
  const resumoJson = JSON.stringify({
    clinicasAbaixoMinimo: payload.clinicasAbaixoMinimo.length,
    kpisForaFaixa: payload.kpisForaFaixa.length,
    pendencias: payload.pendencias.length,
    total: payload.total,
  });

  const envios: EnvioDigestResultado[] = [];

  for (const dest of destinatarios) {
    if (!opts.forcar) {
      const ja = (await db.execute(sql`
        SELECT id FROM alertas_digest_envios
        WHERE dia_brt = ${payload.diaBrt}::date
          AND destinatario_email = ${dest}
          AND status = 'ENVIADO'
        LIMIT 1
      `)) as ExecuteResult<{ id: number }>;
      if (rowsOf(ja).length > 0) {
        envios.push({ destinatario: dest, enviado: false, motivo: "ja_enviado_hoje" });
        continue;
      }
    }

    let gmailMessageId: string | null = null;
    let enviadoOk = false;
    let erroMsg: string | null = null;
    try {
      const gmail = await getGmailClient();
      const raw = buildEmailRaw({ to: dest, subject, htmlBody: html });
      const res = await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
      gmailMessageId = String(res.data?.id ?? "");
      enviadoOk = true;
    } catch (e) {
      erroMsg = (e as Error).message;
      console.error(`[alertasDigest] erro enviar email destinatario=${dest}:`, erroMsg);
    }

    try {
      await db.execute(sql`
        INSERT INTO alertas_digest_envios
          (dia_brt, destinatario_email, status, gmail_message_id,
           total_alertas, clinicas_abaixo_min, kpis_fora_faixa, pendencias,
           payload_resumo, erro, origem)
        VALUES
          (${payload.diaBrt}::date, ${dest}, ${enviadoOk ? "ENVIADO" : "ERRO"},
           ${gmailMessageId}, ${payload.total},
           ${payload.clinicasAbaixoMinimo.length},
           ${payload.kpisForaFaixa.length}, ${payload.pendencias.length},
           ${resumoJson}::jsonb, ${erroMsg}, ${origem})
        ON CONFLICT (dia_brt, destinatario_email) DO UPDATE
          SET status = EXCLUDED.status,
              gmail_message_id = EXCLUDED.gmail_message_id,
              total_alertas = EXCLUDED.total_alertas,
              clinicas_abaixo_min = EXCLUDED.clinicas_abaixo_min,
              kpis_fora_faixa = EXCLUDED.kpis_fora_faixa,
              pendencias = EXCLUDED.pendencias,
              payload_resumo = EXCLUDED.payload_resumo,
              erro = EXCLUDED.erro,
              enviado_em = NOW(),
              origem = EXCLUDED.origem
      `);
    } catch (e) {
      console.error(`[alertasDigest] erro persistir envio destinatario=${dest}:`, (e as Error).message);
    }

    envios.push({
      destinatario: dest,
      enviado: enviadoOk,
      motivo: enviadoOk ? undefined : (erroMsg ? `erro_email: ${erroMsg}` : "erro_email"),
      gmailMessageId,
    });
  }

  return {
    diaBrt: payload.diaBrt,
    total: payload.total,
    pulado: false,
    envios,
  };
}
