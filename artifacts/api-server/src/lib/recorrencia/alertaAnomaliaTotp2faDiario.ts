/**
 * Task #272 — Worker diario que avisa o CEO por email quando os bloqueios
 * 2FA do dia ANTERIOR deram sinal de ataque (flag = ANOMALIA).
 *
 * Por que existe:
 *   A Task #160 ja calcula a flag NORMAL/ATENCAO/ANOMALIA no endpoint
 *   GET /api/admin/seguranca/totp-bloqueios-expirados a partir do agregado
 *   diario `totp_rate_limit_limpezas_diarias` (Migration 052). O sinal e
 *   PUXADO — o CEO so descobre se abrir o painel. Se o ataque acontece
 *   numa madrugada de domingo o aviso nao chega em tempo de defesa.
 *
 *   Este worker fecha o ciclo: tick a cada 1h, janela funcional
 *   apos 06:00 BRT (garante que o agregado do DIA ANTERIOR ja esteja
 *   fechado), reavalia a serie dos ultimos 30 dias e dispara email pro
 *   CEO quando a heuristica `classificarAnomaliaTotp` (lib pura
 *   compartilhada com a rota da Task #160) retorna flag = ANOMALIA pro
 *   dia anterior.
 *
 * Idempotencia:
 *   UNIQUE (dia_brt, destinatario_email) na `alertas_anomalia_2fa_diaria`
 *   (Migration 067) garante "no-spam": re-run do worker no mesmo dia =
 *   no-op via ON CONFLICT DO NOTHING. Multi-replica protegida adicional-
 *   mente por `pg_try_advisory_lock(27227227)`.
 *
 * Defensivo: nunca lanca; falha = log + segue. Falha do email registra
 *   linha com status='ERRO' (UNIQUE garante que nao re-tenta automatica-
 *   mente — rerun manual via `dispararAlertaAnomalia2faAgora({forcar:true})`
 *   apaga primeiro a linha pra reabrir o slot do dia).
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getGmailClient } from "../google-gmail";
import { logger } from "../logger";
import {
  classificarAnomaliaTotp,
  type AnomaliaTotpResultado,
  type LinhaSerieAnomalia,
} from "../seguranca/anomaliaTotp";

const TICK_MS = 60 * 60 * 1000; // 1h
const ADVISORY_LOCK_ID = 27227227;
const HORA_MINIMA_BRT = 6;
const JANELA_DIAS = 30;
const CEO_EMAIL = process.env["CEO_EMAIL"] || "ceo@pawards.com.br";
const FROM_ADDR = "clinica.padua.agenda@gmail.com";

let executandoAgora = false;
let workerStarted = false;

function diaAnteriorBrtISO(base: Date = new Date()): string {
  // BRT = UTC-3. Subtrai 3h do "agora" pra cair no dia BRT corrente,
  // depois subtrai mais 24h pra pegar o dia anterior fechado.
  const d = new Date(base.getTime() - 3 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function horaBrt(base: Date = new Date()): number {
  const d = new Date(base.getTime() - 3 * 60 * 60 * 1000);
  return d.getUTCHours();
}

function sanitizeHeader(s: string): string {
  return String(s ?? "").replace(/[\r\n]/g, "").trim();
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function buildEmailRaw(to: string, subject: string, htmlBody: string): string {
  const parts = [
    `From: PAWARDS - Alerta CEO <${FROM_ADDR}>`,
    `To: ${sanitizeHeader(to)}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(htmlBody).toString("base64"),
  ];
  return Buffer.from(parts.join("\r\n")).toString("base64url");
}

interface SerieRow {
  dia: string;
  totalRemovidas: number;
}

async function carregarSerie(janelaDias: number): Promise<SerieRow[]> {
  const r: any = await db.execute(sql`
    SELECT dia_brt::text       AS dia,
           total_removidas     AS total_removidas
      FROM totp_rate_limit_limpezas_diarias
     WHERE dia_brt >= ((now() AT TIME ZONE 'America/Sao_Paulo')::date
                       - (${janelaDias - 1} || ' days')::interval)
     ORDER BY dia_brt DESC
  `);
  const rows = (r.rows ?? r) as Array<{
    dia: string;
    total_removidas: number | string;
  }>;
  return rows.map((row) => ({
    dia: row.dia,
    totalRemovidas: Number(row.total_removidas ?? 0),
  }));
}

function montarGraficoAscii(serie: SerieRow[]): string {
  // Ordem cronologica ascendente, ultimos 7 dias.
  const ult7 = [...serie].sort((a, b) => a.dia.localeCompare(b.dia)).slice(-7);
  if (ult7.length === 0) return "(sem dados)";
  const max = Math.max(1, ...ult7.map((l) => l.totalRemovidas));
  const largura = 30;
  return ult7
    .map((l) => {
      const n = Math.round((l.totalRemovidas / max) * largura);
      const barra = "█".repeat(n) + "░".repeat(largura - n);
      const tot = String(l.totalRemovidas).padStart(4, " ");
      return `${l.dia}  ${barra}  ${tot}`;
    })
    .join("\n");
}

function montarMensagem(opts: {
  dia: string;
  serie: SerieRow[];
  an: AnomaliaTotpResultado;
}): { assunto: string; corpoTxt: string; corpoHtml: string } {
  const { dia, serie, an } = opts;
  const grafico = montarGraficoAscii(serie);
  const corpoTxt = [
    `Ola Caio,`,
    ``,
    `O agregado de bloqueios 2FA expirados do dia ${dia} (BRT) cruzou o`,
    `limiar conservador de ANOMALIA da Task #160:`,
    ``,
    `  • Total removidas no dia:   ${an.hojeTotal}`,
    `  • Media historica (${JANELA_DIAS - 1}d):  ${an.mediaHistorica}`,
    `  • Desvio padrao:            ${an.desvioPadrao}`,
    `  • Razao hoje / media:       ${an.razaoVsMedia}x`,
    `  • Z-score:                  ${an.zScoreHoje}`,
    `  • Flag:                     ${an.flag}`,
    ``,
    `Ultimos 7 dias (barras proporcionais ao maximo da janela):`,
    ``,
    grafico,
    ``,
    `Possiveis causas:`,
    `  • ataque de forca-bruta no 2FA (sinal de seguranca)`,
    `  • picos de usuarios com dificuldade no 2FA (UX/treinamento)`,
    ``,
    `Verificar painel: ${process.env["PUBLIC_APP_URL"] || ""}/plataforma/painel-pawards`,
    ``,
    `— PAWARDS MEDCORE · alerta automatico Task #272 · diario apos 06:00 BRT`,
  ].join("\n");
  const corpoHtml =
    `<pre style="font-family:ui-monospace,Menlo,Consolas,monospace;` +
    `background:#020406;color:#C89B3C;padding:16px;border-radius:6px;` +
    `white-space:pre-wrap;word-break:break-word">${escapeHtml(corpoTxt)}</pre>`;
  const assunto =
    `🛑 Anomalia 2FA · ${dia} · ${an.hojeTotal} bloqueios (${an.razaoVsMedia}x media)`;
  return { assunto, corpoTxt, corpoHtml };
}

export interface DispararAlertaOpts {
  destinatarioEmail?: string;
  forcar?: boolean;
  origem?: string; // 'WORKER' | 'MANUAL' | 'TEST'
  agora?: Date;
}

export interface DispararAlertaResult {
  enviado: boolean;
  motivo?: string;
  diaBrt: string;
  destinatario: string;
  flag?: AnomaliaTotpResultado["flag"];
  hojeTotal?: number;
  gmailMessageId?: string | null;
  alertaId?: number | null;
}

export async function dispararAlertaAnomalia2faAgora(
  opts: DispararAlertaOpts = {},
): Promise<DispararAlertaResult> {
  const dia = diaAnteriorBrtISO(opts.agora);
  const destinatario = opts.destinatarioEmail || CEO_EMAIL;
  const origem = opts.origem || "WORKER";

  // Idempotencia: ja avaliou/enviou esse dia pra esse destinatario?
  if (!opts.forcar) {
    const ja: any = await db.execute(sql`
      SELECT id FROM alertas_anomalia_2fa_diaria
       WHERE dia_brt = ${dia}::date
         AND destinatario_email = ${destinatario}
       LIMIT 1
    `);
    if ((ja.rows ?? ja)[0]) {
      return { enviado: false, motivo: "ja_processado_hoje", diaBrt: dia, destinatario };
    }
  } else {
    // Forcar: remove a linha pra reabrir o slot UNIQUE.
    await db.execute(sql`
      DELETE FROM alertas_anomalia_2fa_diaria
       WHERE dia_brt = ${dia}::date
         AND destinatario_email = ${destinatario}
    `);
  }

  const serie = await carregarSerie(JANELA_DIAS);
  const linhaDia = serie.find((l) => l.dia === dia);
  const hojeTotal = linhaDia?.totalRemovidas ?? 0;
  const historico: LinhaSerieAnomalia[] = serie.filter((l) => l.dia !== dia);

  const an = classificarAnomaliaTotp(hojeTotal, historico);

  if (an.flag !== "ANOMALIA") {
    return {
      enviado: false,
      motivo: `flag_${an.flag.toLowerCase()}`,
      diaBrt: dia,
      destinatario,
      flag: an.flag,
      hojeTotal,
    };
  }

  const { assunto, corpoHtml } = montarMensagem({ dia, serie, an });

  let gmailMessageId: string | null = null;
  let erroEnvio: string | null = null;
  try {
    const gmail = await getGmailClient();
    const raw = buildEmailRaw(destinatario, assunto, corpoHtml);
    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });
    gmailMessageId = String(res.data?.id ?? "");
  } catch (e) {
    erroEnvio = (e as Error).message;
    logger.error(
      { err: erroEnvio, dia, destinatario },
      "[alertaAnomalia2fa] falha enviar email",
    );
  }

  // Persiste auditoria + idempotencia (mesmo em ERRO, pra nao re-tentar
  // tsunami no mesmo dia — rerun manual via opts.forcar=true).
  let alertaId: number | null = null;
  try {
    const ins: any = await db.execute(sql`
      INSERT INTO alertas_anomalia_2fa_diaria
        (dia_brt, destinatario_email, flag, hoje_total,
         media_historica, desvio_padrao, razao_vs_media, z_score,
         janela_dias, status, erro, gmail_message_id, origem)
      VALUES
        (${dia}::date, ${destinatario}, ${an.flag}, ${an.hojeTotal},
         ${an.mediaHistorica}, ${an.desvioPadrao}, ${an.razaoVsMedia}, ${an.zScoreHoje},
         ${JANELA_DIAS}, ${erroEnvio ? "ERRO" : "ENVIADO"}, ${erroEnvio},
         ${gmailMessageId}, ${origem})
      ON CONFLICT (dia_brt, destinatario_email) DO NOTHING
      RETURNING id
    `);
    alertaId = Number(((ins.rows ?? ins)[0] || {}).id ?? 0) || null;
  } catch (e) {
    logger.error(
      { err: (e as Error).message, dia, destinatario },
      "[alertaAnomalia2fa] falha persistir auditoria",
    );
  }

  if (erroEnvio) {
    return {
      enviado: false,
      motivo: `erro_email: ${erroEnvio}`,
      diaBrt: dia,
      destinatario,
      flag: an.flag,
      hojeTotal,
      alertaId,
    };
  }

  logger.info(
    { dia, destinatario, alertaId, gmailMessageId, hojeTotal, razao: an.razaoVsMedia },
    "[alertaAnomalia2fa] anomalia notificada",
  );
  return {
    enviado: true,
    diaBrt: dia,
    destinatario,
    flag: an.flag,
    hojeTotal,
    gmailMessageId,
    alertaId,
  };
}

async function tickComLock(): Promise<void> {
  if (executandoAgora) return;
  if (horaBrt() < HORA_MINIMA_BRT) return; // janela funcional: apos 06:00 BRT
  executandoAgora = true;
  let lockOk = false;
  try {
    const r: any = await db.execute(
      sql`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID}) AS got`,
    );
    lockOk = Boolean(((r.rows ?? r)[0] || {}).got);
    if (!lockOk) return;
    const out = await dispararAlertaAnomalia2faAgora({ origem: "WORKER" });
    if (out.enviado) {
      logger.info(
        { dia: out.diaBrt, gmail_id: out.gmailMessageId, hojeTotal: out.hojeTotal },
        "[alertaAnomalia2fa] tick: anomalia notificada",
      );
    } else if (out.motivo && out.motivo !== "ja_processado_hoje" && !out.motivo.startsWith("flag_")) {
      logger.warn({ dia: out.diaBrt, motivo: out.motivo }, "[alertaAnomalia2fa] tick nao enviou");
    }
  } catch (e) {
    logger.error({ err: (e as Error).message }, "[alertaAnomalia2fa] erro fatal tick");
  } finally {
    if (lockOk) {
      try {
        await db.execute(sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`);
      } catch (e) {
        logger.warn({ err: (e as Error).message }, "[alertaAnomalia2fa] release lock falhou");
      }
    }
    executandoAgora = false;
  }
}

export function iniciarWorkerAlertaAnomaliaTotp2faDiario(): void {
  if (workerStarted) return;
  workerStarted = true;
  logger.info(
    { tick_min: TICK_MS / 60000, hora_min_brt: HORA_MINIMA_BRT, janela_dias: JANELA_DIAS },
    "[alertaAnomalia2fa] worker iniciado",
  );
  setTimeout(() => { void tickComLock(); }, 90 * 1000).unref();
  setInterval(() => { void tickComLock(); }, TICK_MS).unref();
}

// Exportado pra tests / endpoint admin.
export const _internals = {
  diaAnteriorBrtISO,
  horaBrt,
  montarGraficoAscii,
  montarMensagem,
};
