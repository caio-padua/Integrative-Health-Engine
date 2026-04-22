/**
 * PARMASUPRA-FECHAMENTO · F4 / WD14 · Worker assinatura notificações
 *
 * Consumidor da fila `assinatura_notificacoes` (status PENDENTE) que o
 * `lib/assinatura/service.ts` já enfileirava sem consumer.
 *
 * Comportamento por canal:
 *  - EMAIL    : envia via Gmail integration real (lib/google-gmail.ts).
 *  - WHATSAPP : envia via lib/services/whatsappService.ts (Twilio/Gupshup
 *               conforme config ativa em whatsapp_config).
 *  - DRIVE    : upload Drive ainda não plugado — FALHA estruturada.
 *
 * Retry exponencial: tentativa 1 → +10min, 2 → +1h, 3 → FALHA permanente.
 * Idempotente: tick pega só PENDENTE com proxima_tentativa_em <= now().
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getGmailClient } from "../google-gmail";
import { enviarWhatsapp } from "../../services/whatsappService";

const TICK_MS = 5 * 60 * 1000; // 5 min
const MAX_TENTATIVAS = 3;
const RETRY_BACKOFF_MIN = [10, 60]; // após tentativa 1 → +10min, após 2 → +1h
const BATCH_LIMIT = 50;

type NotifRow = {
  id: number;
  canal: string;
  momento: string;
  destinatario: string;
  assunto: string | null;
  corpo: string | null;
  anexo_url: string | null;
  tentativas: number;
};

type ProcResult =
  | { status: "ENVIADO"; resposta?: any }
  | { status: "FALHA"; erro: string };

/** Sanitiza email/header — remove CRLF (anti-injection). */
function sanitizeHeader(s: string): string {
  return String(s ?? "").replace(/[\r\n]/g, "").trim();
}

/** Codifica RFC 5322 minimal (assunto base64-UTF8 + corpo HTML base64). */
function buildEmailRaw(to: string, subject: string, htmlBody: string): string {
  const fromAddr = "clinica.padua.agenda@gmail.com";
  const parts = [
    `From: PAWARDS - Instituto Padua <${fromAddr}>`,
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

/** Processa uma única notificação. Defensivo: nunca lança. */
export async function processarNotificacao(row: NotifRow): Promise<ProcResult> {
  try {
    const canal = String(row.canal).toUpperCase();

    if (canal === "EMAIL") {
      // Gmail real via integration google-mail (token gerenciado pelo Replit
      // via REPLIT_CONNECTORS_HOSTNAME). Erro vira FALHA estruturada com
      // mensagem do provedor — retry exponencial pega de novo no próximo tick.
      const dest = sanitizeHeader(row.destinatario);
      if (!dest || !dest.includes("@")) {
        return { status: "FALHA", erro: `email_invalido:${dest}` };
      }
      const assunto = row.assunto || "Notificação PAWARDS";
      // Se corpo veio como HTML usa direto; senão envolve em <pre> para preservar formatação.
      const corpo = row.corpo || "";
      const htmlBody = /<[a-z][\s\S]*>/i.test(corpo)
        ? corpo
        : `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap">${corpo}</pre>`;

      const gmail = await getGmailClient();
      const raw = buildEmailRaw(dest, assunto, htmlBody);
      const res = await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw },
      });
      return {
        status: "ENVIADO",
        resposta: { provider: "google-mail", id: res.data?.id, threadId: res.data?.threadId },
      };
    }

    if (canal === "WHATSAPP") {
      // WhatsApp via lib/services/whatsappService — usa config ativa em
      // whatsapp_config (TWILIO ou GUPSHUP, decidido pelo provedor da row).
      const dest = sanitizeHeader(row.destinatario);
      if (!dest) return { status: "FALHA", erro: "whatsapp_destinatario_vazio" };
      const corpo = row.corpo || row.assunto || "";
      if (!corpo) return { status: "FALHA", erro: "whatsapp_corpo_vazio" };

      const r = await enviarWhatsapp(dest, corpo);
      if (r.sucesso) {
        return {
          status: "ENVIADO",
          resposta: { provider: "whatsapp", msgId: r.provedorMsgId, logId: r.logId },
        };
      }
      return { status: "FALHA", erro: `whatsapp:${r.erro ?? "desconhecido"}` };
    }

    if (canal === "DRIVE") {
      // Upload Drive ainda não plugado nesta onda (Caio não pediu).
      return { status: "FALHA", erro: "drive_upload_pendente" };
    }

    return { status: "FALHA", erro: `canal_desconhecido:${canal}` };
  } catch (e) {
    return { status: "FALHA", erro: `excecao:${(e as Error).message}` };
  }
}

/** Roda 1 tick: pega até BATCH_LIMIT notificações elegíveis e processa. */
export async function tickNotifAssinatura(): Promise<{
  processadas: number;
  enviadas: number;
  retry_agendado: number;
  falha_permanente: number;
}> {
  const r: any = await db.execute(sql`
    SELECT id, canal, momento, destinatario, assunto, corpo, anexo_url, tentativas
    FROM assinatura_notificacoes
    WHERE status = 'PENDENTE'
      AND (proxima_tentativa_em IS NULL OR proxima_tentativa_em <= now())
    ORDER BY id ASC
    LIMIT ${BATCH_LIMIT}
  `);
  const rows: NotifRow[] = (r.rows ?? r) as NotifRow[];

  let processadas = 0;
  let enviadas = 0;
  let retry_agendado = 0;
  let falha_permanente = 0;

  for (const row of rows) {
    processadas++;
    const result = await processarNotificacao(row);
    const novasTentativas = (Number(row.tentativas) || 0) + 1;

    if (result.status === "ENVIADO") {
      await db.execute(sql`
        UPDATE assinatura_notificacoes
        SET status = 'ENVIADO',
            enviado_em = now(),
            tentativas = ${novasTentativas},
            erro = NULL,
            resposta_provedor = ${JSON.stringify(result.resposta ?? {})}::jsonb
        WHERE id = ${row.id}
      `);
      enviadas++;
      continue;
    }

    // FALHA — decide retry vs permanente
    if (novasTentativas >= MAX_TENTATIVAS) {
      await db.execute(sql`
        UPDATE assinatura_notificacoes
        SET status = 'FALHA',
            tentativas = ${novasTentativas},
            erro = ${result.erro}
        WHERE id = ${row.id}
      `);
      falha_permanente++;
    } else {
      const backoffMin =
        RETRY_BACKOFF_MIN[novasTentativas - 1] ??
        RETRY_BACKOFF_MIN[RETRY_BACKOFF_MIN.length - 1] ?? 60;
      await db.execute(sql`
        UPDATE assinatura_notificacoes
        SET tentativas = ${novasTentativas},
            erro = ${result.erro},
            proxima_tentativa_em = now() + (${backoffMin} || ' minutes')::interval
        WHERE id = ${row.id}
      `);
      retry_agendado++;
    }
  }

  return { processadas, enviadas, retry_agendado, falha_permanente };
}

let workerStarted = false;

export function iniciarWorkerNotifAssinatura(): void {
  if (workerStarted) return;
  workerStarted = true;

  console.log(
    `[notifAssinatura] WD14 worker iniciado (tick ${TICK_MS / 60000}min, max ${MAX_TENTATIVAS} tentativas, backoff ${RETRY_BACKOFF_MIN.join("/")}min)`
  );

  const tick = async () => {
    try {
      const r = await tickNotifAssinatura();
      if (r.processadas > 0) {
        console.log(
          `[notifAssinatura] tick: ${r.processadas} processadas · ${r.enviadas} enviadas · ${r.retry_agendado} retry · ${r.falha_permanente} falha-perm`
        );
      }
    } catch (e) {
      console.error("[notifAssinatura] erro no tick:", (e as Error).message);
    }
  };

  setTimeout(tick, 20 * 1000);
  setInterval(tick, TICK_MS).unref();
}
