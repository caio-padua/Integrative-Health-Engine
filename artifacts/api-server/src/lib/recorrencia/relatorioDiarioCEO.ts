/**
 * Wave Blindagem CEO PDF Diario · Worker
 *
 * Gera 1 vez por dia (apos 06:00 BRT) um PDF executivo das ultimas 24h e
 * envia por email pro Caio. Idempotente via UNIQUE (dia_brt, destinatario_email)
 * em `relatorio_diario_ceo_envios` (Migration 043).
 *
 * Tick interno: 1h. Lock distribuido: pg_try_advisory_lock(30303032).
 * Janela funcional: so dispara 06:00–23:59 BRT (evita madrugada).
 *
 * Defensivo: nunca lanca, log + segue. Falha email = registra status='ERRO'
 * (UNIQUE garante que nao reentra no mesmo dia automaticamente — rerun manual
 * via POST /api/admin/relatorio-diario/disparar com forcar=true).
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  gerarRelatorioDiarioCEO,
  streamToBuffer,
  type PayloadRelatorioCEO,
  type ReceitaResumo,
  type AssinaturaResumo,
  type AlertaResumo,
} from "../../pdf/relatorioDiarioCEO";
import { getGmailClient } from "../google-gmail";

const TICK_MS = 60 * 60 * 1000; // 1h
const ADVISORY_LOCK_ID = 30303032;
const CEO_EMAIL = process.env["CEO_EMAIL"] || "ceo@pawards.com.br";
const HORA_MINIMA_BRT = 6; // dispara so a partir das 06:00 BRT
const FROM_ADDR = "clinica.padua.agenda@gmail.com";

let executandoAgora = false;
let workerStarted = false;

function hojeBrtISO(): string {
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function horaBrt(): number {
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return d.getUTCHours();
}

function nowBrISO(): string {
  return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function sanitizeHeader(s: string): string {
  return String(s ?? "").replace(/[\r\n]/g, "").trim();
}

function buildEmailRaw(opts: {
  to: string;
  subject: string;
  htmlBody: string;
  pdfBuffer: Buffer;
  pdfFileName: string;
}): string {
  const boundary = `=_pdfceo_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const subjectB64 = Buffer.from(opts.subject).toString("base64");
  const parts = [
    `From: PAWARDS - Painel CEO <${FROM_ADDR}>`,
    `To: ${sanitizeHeader(opts.to)}`,
    `Subject: =?UTF-8?B?${subjectB64}?=`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(opts.htmlBody).toString("base64"),
    "",
    `--${boundary}`,
    "Content-Type: application/pdf",
    `Content-Disposition: attachment; filename="${sanitizeHeader(opts.pdfFileName)}"`,
    "Content-Transfer-Encoding: base64",
    "",
    opts.pdfBuffer.toString("base64").replace(/(.{76})/g, "$1\n"),
    "",
    `--${boundary}--`,
    "",
  ];
  return Buffer.from(parts.join("\r\n")).toString("base64url");
}

async function calcularPayload(diaIso: string, janelaHoras: number): Promise<PayloadRelatorioCEO> {
  const desde = sql.raw(`NOW() - INTERVAL '${janelaHoras} hours'`);

  // KPIs 24h — receitas
  const kpiReceitas: any = await db.execute(sql`
    SELECT
      COUNT(*)::int                                AS receitas_novas,
      COALESCE(SUM(comissao_estimada), 0)::float   AS comissao_potencial_nova
    FROM parmavault_receitas
    WHERE criado_em >= ${desde}
  `);
  const r1 = (kpiReceitas.rows ?? kpiReceitas)[0] ?? {};

  // KPIs 24h — pacientes (exclui contas teste)
  const kpiPacientes: any = await db.execute(sql`
    SELECT COUNT(*)::int AS pacientes_novos
    FROM pacientes
    WHERE criado_em >= ${desde} AND COALESCE(is_teste, false) = false
  `);
  const r2 = (kpiPacientes.rows ?? kpiPacientes)[0] ?? {};

  // KPIs 24h — anamneses
  const kpiAnamneses: any = await db.execute(sql`
    SELECT COUNT(*)::int AS anamneses_novas
    FROM anamneses
    WHERE criado_em >= ${desde}
  `);
  const r3 = (kpiAnamneses.rows ?? kpiAnamneses)[0] ?? {};

  // KPIs 24h — assinaturas
  const kpiAssin: any = await db.execute(sql`
    SELECT
      SUM(CASE WHEN s.criado_em >= ${desde} THEN 1 ELSE 0 END)::int                                       AS enviadas,
      SUM(CASE WHEN s.atualizado_em >= ${desde} AND s.status = 'CONCLUIDO' THEN 1 ELSE 0 END)::int        AS assinadas,
      SUM(CASE WHEN s.atualizado_em >= ${desde} AND s.status = 'REJEITADO' THEN 1 ELSE 0 END)::int        AS rejeitadas,
      SUM(CASE WHEN s.status IN ('ENVIADO','PROCESSANDO','PENDENTE') THEN 1 ELSE 0 END)::int             AS pendentes
    FROM assinatura_solicitacoes s
  `);
  const r4 = (kpiAssin.rows ?? kpiAssin)[0] ?? {};

  // Invariantes globais
  const invar: any = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM parmavault_receitas)::int                              AS receitas_total,
      (SELECT COALESCE(SUM(comissao_estimada), 0) FROM parmavault_receitas)::float AS comissao_total,
      (SELECT COUNT(*) FROM pacientes WHERE COALESCE(is_teste, false) = false)::int AS pacientes_ativos,
      (SELECT COUNT(*) FROM auditoria_assinaturas)::int                            AS auditoria_total
  `);
  const r5 = (invar.rows ?? invar)[0] ?? {};

  // Top receitas 24h
  const topReceitas: any = await db.execute(sql`
    SELECT r.numero_receita      AS numero,
           p.nome                AS paciente_nome,
           p.codigo_semantico    AS codigo_semantico,
           r.valor_formula_estimado::float AS valor_estimado,
           r.comissao_estimada::float      AS comissao_estimada,
           r.status              AS status,
           r.emitida_em::text    AS emitida_em
    FROM parmavault_receitas r
    LEFT JOIN pacientes p ON p.id = r.paciente_id
    WHERE r.criado_em >= ${desde}
    ORDER BY r.comissao_estimada DESC NULLS LAST, r.criado_em DESC
    LIMIT 15
  `);
  const topReceitasRows = ((topReceitas.rows ?? topReceitas) as any[]).map<ReceitaResumo>((row) => ({
    numero: row.numero ?? "—",
    pacienteNome: row.paciente_nome ?? "—",
    codigoSemantico: row.codigo_semantico ?? null,
    valorEstimado: row.valor_estimado ?? null,
    comissaoEstimada: row.comissao_estimada ?? null,
    status: row.status ?? "—",
    emitidaEm: row.emitida_em ?? null,
  }));

  // Top assinaturas 24h
  const topAssin: any = await db.execute(sql`
    SELECT COALESCE(t.nome_exibicao, t.codigo)          AS template,
           COALESCE(p.nome, 'sem paciente')             AS paciente_nome,
           s.status                                     AS status,
           (SELECT COUNT(*) FROM assinatura_signatarios sg
              WHERE sg.solicitacao_id = s.id AND sg.assinado_em IS NOT NULL)::int AS signatarios_ok,
           (SELECT COUNT(*) FROM assinatura_signatarios sg
              WHERE sg.solicitacao_id = s.id)::int      AS signatarios_total,
           s.atualizado_em::text                       AS atualizada_em
    FROM assinatura_solicitacoes s
    LEFT JOIN assinatura_templates t ON t.id = s.template_id
    LEFT JOIN pacientes p            ON p.id = s.paciente_id
    WHERE s.atualizado_em >= ${desde}
    ORDER BY s.atualizado_em DESC
    LIMIT 15
  `);
  const topAssinRows = ((topAssin.rows ?? topAssin) as any[]).map<AssinaturaResumo>((row) => ({
    template: row.template ?? "—",
    pacienteNome: row.paciente_nome ?? "—",
    status: row.status ?? "—",
    signatariosOk: Number(row.signatarios_ok ?? 0),
    signatariosTotal: Number(row.signatarios_total ?? 0),
    atualizadaEm: row.atualizada_em ?? null,
  }));

  // Alertas CEO ultimos 7 dias (defensivo: tabela pode nao existir em ambientes
  // sem Migration 035/038 — Wave 10.6/10.7. Falha = lista vazia, nao quebra PDF).
  let alertasRows: AlertaResumo[] = [];
  try {
    const alertas: any = await db.execute(sql`
      SELECT dia_brt::text       AS dia,
             metrica              AS metrica,
             tipo_transicao       AS tipo_transicao,
             COALESCE(totais_atual->>'email_msg_id', '') AS email_ref,
             cor_atual            AS cor
      FROM alertas_ceo_assinaturas
      WHERE dia_brt >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY dia_brt DESC, id DESC
      LIMIT 20
    `);
    alertasRows = ((alertas.rows ?? alertas) as any[]).map<AlertaResumo>((row) => ({
      dia: row.dia ?? "—",
      metrica: row.metrica ?? "—",
      tipoTransicao: String(row.tipo_transicao ?? "—").toUpperCase(),
      mensagem: `cor=${row.cor ?? "—"}${row.email_ref ? ` · email=ok` : ""}`,
    }));
  } catch (e) {
    console.warn("[relatorioDiarioCEO] alertas_ceo_assinaturas indisponivel:", (e as Error).message);
  }

  return {
    dia: diaIso,
    geradoEm: nowBrISO(),
    janelaHoras,
    kpis: {
      receitasNovas: Number(r1.receitas_novas ?? 0),
      comissaoPotencialNova: Number(r1.comissao_potencial_nova ?? 0),
      pacientesNovos: Number(r2.pacientes_novos ?? 0),
      anamnesesNovas: Number(r3.anamneses_novas ?? 0),
      assinaturasEnviadas: Number(r4.enviadas ?? 0),
      assinaturasAssinadas: Number(r4.assinadas ?? 0),
      assinaturasRejeitadas: Number(r4.rejeitadas ?? 0),
      assinaturasPendentes: Number(r4.pendentes ?? 0),
    },
    invariantesGlobais: {
      receitasTotal: Number(r5.receitas_total ?? 0),
      comissaoPotencialTotal: Number(r5.comissao_total ?? 0),
      pacientesAtivos: Number(r5.pacientes_ativos ?? 0),
      auditoriaAssinaturasTotal: Number(r5.auditoria_total ?? 0),
    },
    topReceitas: topReceitasRows,
    topAssinaturas: topAssinRows,
    alertasCEO: alertasRows,
  };
}

export interface DispararRelatorioOpts {
  destinatarioEmail?: string;
  janelaHoras?: number;
  forcar?: boolean; // se true, ignora UNIQUE diaria (overwrite via UPDATE)
  origem?: string;  // "WORKER" | "MANUAL" | "TEST"
}

export interface DispararRelatorioResult {
  enviado: boolean;
  motivo?: string;
  diaBrt: string;
  destinatario: string;
  pdfBytes?: number;
  gmailMessageId?: string | null;
  envioId?: number | null;
  payloadKpis?: PayloadRelatorioCEO["kpis"];
}

export async function dispararRelatorioDiarioCEO(
  opts: DispararRelatorioOpts = {},
): Promise<DispararRelatorioResult> {
  const dia = hojeBrtISO();
  const destinatario = opts.destinatarioEmail || CEO_EMAIL;
  const janela = opts.janelaHoras ?? 24;
  const origem = opts.origem || "WORKER";

  // Idempotencia: ja enviou hoje?
  if (!opts.forcar) {
    const ja: any = await db.execute(sql`
      SELECT id FROM relatorio_diario_ceo_envios
      WHERE dia_brt = ${dia}::date
        AND destinatario_email = ${destinatario}
        AND status = 'ENVIADO'
      LIMIT 1
    `);
    if ((ja.rows ?? ja)[0]) {
      return { enviado: false, motivo: "ja_enviado_hoje", diaBrt: dia, destinatario };
    }
  }

  let payload: PayloadRelatorioCEO;
  let pdfBuffer: Buffer;
  try {
    payload = await calcularPayload(dia, janela);
    const stream = gerarRelatorioDiarioCEO(payload);
    pdfBuffer = await streamToBuffer(stream);
  } catch (e) {
    console.error("[relatorioDiarioCEO] erro gerar PDF:", (e as Error).message);
    return { enviado: false, motivo: `erro_geracao: ${(e as Error).message}`, diaBrt: dia, destinatario };
  }

  const subject = `📊 Relatório Diário CEO · ${dia} · ${payload.kpis.receitasNovas} receitas · ${payload.kpis.assinaturasAssinadas} assinaturas`;
  const html = `<div style="font-family:ui-monospace,Menlo,Consolas,monospace;background:#1F4E5F;color:#F5F0E8;padding:20px;border-radius:6px">
    <h2 style="color:#C9A227;margin:0 0 12px">PAWARDS · MEDCORE</h2>
    <p>Olá Caio,</p>
    <p>Segue em anexo o relatório executivo das últimas <b>${janela}h</b> (dia ${dia}).</p>
    <ul>
      <li>Receitas novas: <b>${payload.kpis.receitasNovas}</b></li>
      <li>Comissão potencial nova: <b>R$ ${payload.kpis.comissaoPotencialNova.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></li>
      <li>Pacientes novos: <b>${payload.kpis.pacientesNovos}</b></li>
      <li>Anamneses novas: <b>${payload.kpis.anamnesesNovas}</b></li>
      <li>Assinaturas: <b>${payload.kpis.assinaturasEnviadas}</b> enviadas · <b>${payload.kpis.assinaturasAssinadas}</b> assinadas · <b>${payload.kpis.assinaturasRejeitadas}</b> rejeitadas · <b>${payload.kpis.assinaturasPendentes}</b> pendentes</li>
    </ul>
    <p style="color:#C9A227;font-size:11px">— PAWARDS · Painel CEO · Defesa em Profundidade · Wave Blindagem CEO</p>
  </div>`;
  const fileName = `relatorio-diario-ceo-${dia}.pdf`;

  let gmailMessageId: string | null = null;
  try {
    const gmail = await getGmailClient();
    const raw = buildEmailRaw({ to: destinatario, subject, htmlBody: html, pdfBuffer, pdfFileName: fileName });
    const res = await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
    gmailMessageId = String(res.data?.id ?? "");
  } catch (e) {
    console.error("[relatorioDiarioCEO] erro enviar email:", (e as Error).message);
    // Persiste falha pra auditoria
    try {
      await db.execute(sql`
        INSERT INTO relatorio_diario_ceo_envios
          (dia_brt, destinatario_email, status, erro, pdf_bytes, payload_kpis, origem)
        VALUES
          (${dia}::date, ${destinatario}, 'ERRO', ${(e as Error).message},
           ${pdfBuffer.length}, ${JSON.stringify(payload.kpis)}::jsonb, ${origem})
        ON CONFLICT (dia_brt, destinatario_email) DO UPDATE
          SET status = 'ERRO', erro = EXCLUDED.erro, enviado_em = NOW(),
              pdf_bytes = EXCLUDED.pdf_bytes, payload_kpis = EXCLUDED.payload_kpis,
              origem = EXCLUDED.origem
      `);
    } catch (e2) {
      console.error("[relatorioDiarioCEO] erro persistir falha:", (e2 as Error).message);
    }
    return { enviado: false, motivo: `erro_email: ${(e as Error).message}`, diaBrt: dia, destinatario, pdfBytes: pdfBuffer.length };
  }

  // Persiste sucesso
  let envioId: number | null = null;
  try {
    const r: any = await db.execute(sql`
      INSERT INTO relatorio_diario_ceo_envios
        (dia_brt, destinatario_email, status, gmail_message_id, pdf_bytes, payload_kpis, origem)
      VALUES
        (${dia}::date, ${destinatario}, 'ENVIADO', ${gmailMessageId},
         ${pdfBuffer.length}, ${JSON.stringify(payload.kpis)}::jsonb, ${origem})
      ON CONFLICT (dia_brt, destinatario_email) DO UPDATE
        SET status = 'ENVIADO', gmail_message_id = EXCLUDED.gmail_message_id,
            pdf_bytes = EXCLUDED.pdf_bytes, payload_kpis = EXCLUDED.payload_kpis,
            erro = NULL, enviado_em = NOW(), origem = EXCLUDED.origem
      RETURNING id
    `);
    envioId = Number(((r.rows ?? r)[0] || {}).id ?? null) || null;
  } catch (e) {
    console.error("[relatorioDiarioCEO] erro persistir sucesso:", (e as Error).message);
  }

  return {
    enviado: true,
    diaBrt: dia,
    destinatario,
    pdfBytes: pdfBuffer.length,
    gmailMessageId,
    envioId,
    payloadKpis: payload.kpis,
  };
}

async function tickComLock(): Promise<void> {
  if (executandoAgora) return;
  if (horaBrt() < HORA_MINIMA_BRT) return; // fora da janela funcional
  executandoAgora = true;
  let lockOk = false;
  try {
    const r: any = await db.execute(
      sql`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID}) AS got`,
    );
    lockOk = Boolean(((r.rows ?? r)[0] || {}).got);
    if (!lockOk) return;
    const out = await dispararRelatorioDiarioCEO({ origem: "WORKER" });
    if (out.enviado) {
      console.log(
        `[relatorioDiarioCEO] enviado dia=${out.diaBrt} bytes=${out.pdfBytes} gmail_id=${out.gmailMessageId}`,
      );
    } else if (out.motivo && out.motivo !== "ja_enviado_hoje") {
      console.warn(`[relatorioDiarioCEO] nao enviado dia=${out.diaBrt} motivo=${out.motivo}`);
    }
  } catch (e) {
    console.error("[relatorioDiarioCEO] erro fatal tick:", (e as Error).message);
  } finally {
    if (lockOk) {
      try {
        await db.execute(sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`);
      } catch (e) {
        console.error("[relatorioDiarioCEO] erro release lock:", (e as Error).message);
      }
    }
    executandoAgora = false;
  }
}

export function iniciarWorkerRelatorioDiarioCEO(): void {
  if (workerStarted) return;
  workerStarted = true;
  console.log(
    `[relatorioDiarioCEO] Worker iniciado (tick ${TICK_MS / 60000}min, janela >=${HORA_MINIMA_BRT}:00 BRT, idempotente por (dia_brt,destinatario))`,
  );
  setTimeout(() => { void tickComLock(); }, 90 * 1000);
  setInterval(() => { void tickComLock(); }, TICK_MS).unref();
}
