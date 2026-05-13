/**
 * Task #141 · Worker proativo de alertas pro CEO quando emails de
 * SUSPENDER/REASSUMIR (kill-switch) comecam a falhar em massa.
 *
 * Por que existe:
 *   O painel da Task #134 ja mostra metadata.avisos[] com falhas, mas o
 *   Caio so descobre se abrir a tela. Se a credencial do Gmail expirar ou
 *   o contato da clinica rejeitar, varias suspensoes rodam em silencio.
 *   Este worker fecha o buraco: escaneia eventos recentes do
 *   `auditoria_kill_switch`, expande `metadata.avisos[]` e, pra cada
 *   tentativa que ultrapassou o threshold, dispara alerta pro CEO no
 *   MESMO canal dos outros alertas (alertaAssinaturasCEO Wave 10.6).
 *
 * Threshold (configuravel via env, logica OR — qualquer condicao dispara):
 *   - destinatarios=0          → sempre alerta (email nao saiu)
 *   - erro != null             → sempre alerta (excecao no envio)
 *   - falhas >= ABS_MIN        → alerta (default 1, ou seja, qualquer falha)
 *   - pct >= PCT_MIN           → alerta (default 50%) [calculado so se dest>0]
 *
 * Por que OR (e nao AND): a regra "qualquer falha ja conta" (Done-looks-like
 * 1) e a regra de threshold percentual sao ambas validas e o operador queria
 * que QUALQUER UMA disparasse. Com AND, 1 falha em 10 destinatarios (10%)
 * passaria batido — exatamente o cenario silencioso que esta task quer fechar.
 * Pra desligar o gatilho absoluto basta setar ABS_MIN muito alto; pra
 * desligar o percentual, setar PCT_MIN=101.
 *
 * Idempotencia:
 *   UNIQUE (evento_id, tentativa_idx) na tabela alertas_ceo_killswitch_emails
 *   garante "no-spam" mesmo entre re-runs do worker e ate entre pods (lock
 *   distribuido pg_try_advisory_lock).
 *
 * Tick: 15min, lock 30303033 (30303030/31/32 ja em uso por outros workers:
 * parqStatus, verificarPdfsCofre/alertaAssinaturas, relatorioDiarioCEO/
 * pdfRetryUploadResumoDiario).
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getGmailClient } from "../google-gmail";
import { enviarWhatsapp } from "../../services/whatsappService";

const TICK_MS = 15 * 60 * 1000; // 15min
const ADVISORY_LOCK_ID = 30303033;
const CEO_EMAIL = process.env["CEO_EMAIL"] || "ceo@pawards.com.br";
const CEO_WHATSAPP = process.env["CEO_WHATSAPP"] || "";

// Threshold configuravel — logica OR. Default ABS=1 implica "qualquer
// falha ja dispara". Pra desligar, basta setar ABS_MIN absurdamente alto
// e PCT_MIN=101.
const FALHA_ABS_MIN = Number(process.env["KILLSWITCH_FALHA_ABS_MIN"] ?? 1);
const FALHA_PCT_MIN = Number(process.env["KILLSWITCH_FALHA_PCT_MIN"] ?? 50);

// Janela de varredura: so olha eventos das ultimas N horas, pra nao re-checar
// historico inteiro a cada tick. UNIQUE garante idempotencia mesmo se
// aumentarmos a janela.
const JANELA_HORAS = Number(process.env["KILLSWITCH_ALERTA_JANELA_HORAS"] ?? 72);

let executandoAgora = false;
let workerStarted = false;

export interface CandidatoAlerta {
  evento_id: number;
  tentativa_idx: number;
  unidade_id: number;
  unidade_nome: string | null;
  acao: string;
  evento_criado_em: string;
  tipo_aviso: string;
  destinatarios_arr: unknown;
  destinatarios_count: number;
  enviados: number;
  falhas: number;
  erro: string | null;
  aviso_em: string;
}

interface DecisaoAlerta {
  dispara: boolean;
  motivo: string;
  pctFalha: number | null;
}

// Exportado pra ser testavel sem precisar subir worker/lock/db.
export function decidir(c: CandidatoAlerta): DecisaoAlerta {
  if (c.erro && c.erro.trim().length > 0) {
    return { dispara: true, motivo: "ERRO_NO_ENVIO", pctFalha: null };
  }
  if (c.destinatarios_count === 0) {
    return { dispara: true, motivo: "SEM_DESTINATARIO", pctFalha: null };
  }
  const pct = Number(((c.falhas / c.destinatarios_count) * 100).toFixed(2));
  // Logica OR: qualquer um dos dois gatilhos dispara. Default ABS=1
  // implica que qualquer falha (mesmo 1 em 100) ja dispara — fechando
  // o cenario silencioso descrito na task #141.
  const gatilhoAbs = c.falhas >= FALHA_ABS_MIN;
  const gatilhoPct = pct >= FALHA_PCT_MIN;
  if (gatilhoAbs || gatilhoPct) {
    return { dispara: true, motivo: "FALHA_ACIMA_DO_THRESHOLD", pctFalha: pct };
  }
  return { dispara: false, motivo: "OK", pctFalha: pct };
}

async function buscarCandidatos(): Promise<CandidatoAlerta[]> {
  const r: any = await db.execute(sql`
    SELECT
      a.id                    AS evento_id,
      a.unidade_id            AS unidade_id,
      u.nome                  AS unidade_nome,
      a.acao                  AS acao,
      a.criado_em             AS evento_criado_em,
      av.ord::int             AS tentativa_idx,
      COALESCE(av.elem->>'tipo', '')                          AS tipo_aviso,
      COALESCE(av.elem->'destinatarios', '[]'::jsonb)         AS destinatarios_arr,
      COALESCE(jsonb_array_length(av.elem->'destinatarios'), 0)::int AS destinatarios_count,
      COALESCE((av.elem->>'enviados')::int, 0)                AS enviados,
      COALESCE((av.elem->>'falhas')::int, 0)                  AS falhas,
      NULLIF(av.elem->>'erro', '')                            AS erro,
      COALESCE(av.elem->>'em', a.criado_em::text)             AS aviso_em
    FROM auditoria_kill_switch a
    LEFT JOIN unidades u ON u.id = a.unidade_id
    CROSS JOIN LATERAL jsonb_array_elements(
      COALESCE(a.metadata->'avisos', '[]'::jsonb)
    ) WITH ORDINALITY AS av(elem, ord)
    WHERE a.acao IN ('SUSPENDER','REASSUMIR')
      AND a.criado_em >= NOW() - (${JANELA_HORAS}::int || ' hours')::interval
      AND NOT EXISTS (
        SELECT 1 FROM alertas_ceo_killswitch_emails x
         WHERE x.evento_id = a.id AND x.tentativa_idx = av.ord::int
      )
  `);
  return (r.rows ?? r) as CandidatoAlerta[];
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function sanitizeHeader(s: string): string {
  return String(s ?? "").replace(/[\r\n]/g, "").trim();
}

function buildEmailRaw(to: string, subject: string, htmlBody: string): string {
  const fromAddr = "clinica.padua.agenda@gmail.com";
  const parts = [
    `From: PAWARDS - Alerta CEO <${fromAddr}>`,
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

function montarMensagem(c: CandidatoAlerta, d: DecisaoAlerta): { assunto: string; corpo: string } {
  const acaoLabel = c.acao === "SUSPENDER" ? "SUSPENSAO" : "REATIVACAO";
  const motivoLabel: Record<string, string> = {
    ERRO_NO_ENVIO: "Excecao no envio do email (Gmail/credencial)",
    SEM_DESTINATARIO: "Nenhum destinatario cadastrado pra clinica",
    FALHA_ACIMA_DO_THRESHOLD: "Taxa de falha acima do limite configurado",
  };
  const corpo = [
    `Olá Caio,`,
    ``,
    `O envio do email de ${acaoLabel} pra clinica "${c.unidade_nome ?? `#${c.unidade_id}`}" `,
    `(unidade_id=${c.unidade_id}, evento=${c.evento_id}, tentativa=${c.tentativa_idx}) `,
    `nao saiu como esperado.`,
    ``,
    `• Acao kill-switch:      ${c.acao}`,
    `• Tipo de aviso:         ${c.tipo_aviso || "—"}`,
    `• Destinatarios:         ${c.destinatarios_count}`,
    `• Enviados / Falhas:     ${c.enviados} / ${c.falhas}`,
    `• % falha:               ${d.pctFalha === null ? "—" : `${d.pctFalha}%`}`,
    `• Erro reportado:        ${c.erro ?? "—"}`,
    `• Motivo do alerta:      ${motivoLabel[d.motivo] ?? d.motivo}`,
    `• Quando:                ${c.aviso_em}`,
    ``,
    `Threshold atual (OR): >=${FALHA_ABS_MIN} falha(s) OU >=${FALHA_PCT_MIN}% dos destinatarios.`,
    ``,
    `Verifica o painel da plataforma (Task #134) pra reenviar o aviso:`,
    `${process.env["PUBLIC_APP_URL"] || ""}/plataforma/auditoria`,
    ``,
    `— PAWARDS MEDCORE · alerta automatico Task #141`,
  ].join("\n");
  const assunto = `🛑 Email de ${acaoLabel} falhou · ${c.unidade_nome ?? `unidade #${c.unidade_id}`}`;
  return { assunto, corpo };
}

async function dispararNotificacoes(
  c: CandidatoAlerta,
  d: DecisaoAlerta,
): Promise<{ emailOk: boolean; wppOk: boolean }> {
  const { assunto, corpo } = montarMensagem(c, d);
  let emailOk = false;
  let wppOk = false;

  try {
    const html = `<pre style="font-family:ui-monospace,Menlo,Consolas,monospace;` +
      `background:#020406;color:#C89B3C;padding:16px;border-radius:6px;` +
      `white-space:pre-wrap;word-break:break-word">${escapeHtml(corpo)}</pre>`;
    const gmail = await getGmailClient();
    const raw = buildEmailRaw(CEO_EMAIL, assunto, html);
    await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
    emailOk = true;
  } catch (e) {
    console.error(
      `[alertaKillSwitchEmails] falha email evento=${c.evento_id} tentativa=${c.tentativa_idx}:`,
      (e as Error).message,
    );
  }

  if (CEO_WHATSAPP) {
    try {
      const r = await enviarWhatsapp(CEO_WHATSAPP, `${assunto}\n\n${corpo}`);
      wppOk = Boolean(r.sucesso);
      if (!r.sucesso) {
        console.error(
          `[alertaKillSwitchEmails] whatsapp falhou evento=${c.evento_id}: ${r.erro ?? "desconhecido"}`,
        );
      }
    } catch (e) {
      console.error(
        `[alertaKillSwitchEmails] erro whatsapp evento=${c.evento_id}:`,
        (e as Error).message,
      );
    }
  }

  return { emailOk, wppOk };
}

export interface AlertaKillSwitchRunResult {
  candidatos_analisados: number;
  alertas_disparados: number;
  ids_inseridos: number[];
}

async function rodarLogica(): Promise<AlertaKillSwitchRunResult> {
  const candidatos = await buscarCandidatos();
  const out: AlertaKillSwitchRunResult = {
    candidatos_analisados: candidatos.length,
    alertas_disparados: 0,
    ids_inseridos: [],
  };

  for (const c of candidatos) {
    const d = decidir(c);
    if (!d.dispara) continue;

    // INSERT idempotente. ON CONFLICT garante que mesmo que duas instancias
    // do worker rodem em paralelo, so 1 dispara notificacao.
    const ins: any = await db.execute(sql`
      INSERT INTO alertas_ceo_killswitch_emails
        (evento_id, tentativa_idx, unidade_id, acao, tipo_aviso,
         destinatarios, enviados, falhas, erro, motivo_alerta, pct_falha)
      VALUES
        (${c.evento_id}, ${c.tentativa_idx}, ${c.unidade_id}, ${c.acao},
         ${c.tipo_aviso && c.tipo_aviso.trim() ? c.tipo_aviso : "DESCONHECIDO"},
         ${c.destinatarios_count}, ${c.enviados},
         ${c.falhas}, ${c.erro}, ${d.motivo}, ${d.pctFalha})
      ON CONFLICT (evento_id, tentativa_idx) DO NOTHING
      RETURNING id
    `);
    const linha = (ins.rows ?? ins)[0];
    if (!linha) continue; // outro pod pegou primeiro

    const id = Number(linha.id);
    out.alertas_disparados += 1;
    out.ids_inseridos.push(id);

    const { emailOk, wppOk } = await dispararNotificacoes(c, d);
    try {
      await db.execute(sql`
        UPDATE alertas_ceo_killswitch_emails
           SET notif_email_ok = ${emailOk},
               notif_wpp_ok   = ${wppOk}
         WHERE id = ${id}
      `);
    } catch (e) {
      console.error(
        `[alertaKillSwitchEmails] erro persistir status notif id=${id}:`,
        (e as Error).message,
      );
    }
  }

  return out;
}

async function tickComLock(): Promise<void> {
  if (executandoAgora) return;
  executandoAgora = true;
  let lockOk = false;
  try {
    const r: any = await db.execute(
      sql`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID}) AS got`,
    );
    lockOk = Boolean(((r.rows ?? r)[0] || {}).got);
    if (!lockOk) {
      console.log("[alertaKillSwitchEmails] lock distribuido nao adquirido, outro pod ja rodando");
      return;
    }
    const out = await rodarLogica();
    if (out.alertas_disparados > 0) {
      console.log(
        `[alertaKillSwitchEmails] tick: candidatos=${out.candidatos_analisados} ` +
        `disparados=${out.alertas_disparados} ids=${out.ids_inseridos.join(",")}`,
      );
    }
  } catch (e) {
    console.error("[alertaKillSwitchEmails] erro fatal no tick:", (e as Error).message);
  } finally {
    if (lockOk) {
      try {
        await db.execute(sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`);
      } catch (e) {
        console.error("[alertaKillSwitchEmails] erro release lock:", (e as Error).message);
      }
    }
    executandoAgora = false;
  }
}

export function iniciarWorkerAlertaKillSwitchEmailsCEO(): void {
  if (workerStarted) return;
  workerStarted = true;
  console.log(
    `[alertaKillSwitchEmails] Worker iniciado (tick ${TICK_MS / 60000}min, ` +
    `threshold abs>=${FALHA_ABS_MIN} & pct>=${FALHA_PCT_MIN}%, janela ${JANELA_HORAS}h)`,
  );
  setTimeout(() => { void tickComLock(); }, 60 * 1000);
  setInterval(() => { void tickComLock(); }, TICK_MS).unref();
}

/** Disparo manual pra testes / endpoint admin. */
export async function rodarAlertaKillSwitchEmailsAgora(): Promise<AlertaKillSwitchRunResult> {
  return rodarLogica();
}
