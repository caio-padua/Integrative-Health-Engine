/**
 * PARMASUPRA-FECHAMENTO · F4 / WD14 · Worker assinatura notificações
 *
 * Consumidor da fila `assinatura_notificacoes` (status PENDENTE) que o
 * `lib/assinatura/service.ts` já enfileirava sem consumer.
 *
 * Comportamento por canal:
 *  - EMAIL    : tenta via integration google-mail; sem credencial real,
 *               marca FALHA com erro estruturado e agenda retry.
 *  - WHATSAPP : provedor (Z-API/Twilio) ainda não plugado — FALHA estruturada.
 *  - DRIVE    : upload Drive ainda não plugado — FALHA estruturada.
 *
 * Retry exponencial: tentativa 1 → +10min, 2 → +1h, 3 → FALHA permanente.
 * Idempotente: tick pega só PENDENTE com proxima_tentativa_em <= now().
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

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

/** Processa uma única notificação. Defensivo: nunca lança. */
export async function processarNotificacao(row: NotifRow): Promise<ProcResult> {
  try {
    const canal = String(row.canal).toUpperCase();

    if (canal === "EMAIL") {
      // Por ora, sem credencial real do conector google-mail no API server,
      // marca FALHA com erro estruturado para que o retry seja agendado e
      // a fila não trave. Quando a integração real for plugada, basta trocar
      // este bloco pela chamada gmail.users.messages.send().
      const credenciaisOk = !!process.env["GOOGLE_MAIL_REAL_OK"]; // gate explícito
      if (!credenciaisOk) {
        return {
          status: "FALHA",
          erro: "google_mail_pendente_credenciais_real",
        };
      }
      // Branch ativada apenas se GOOGLE_MAIL_REAL_OK=1 (placeholder de wiring).
      return { status: "ENVIADO", resposta: { provider: "google-mail-stub" } };
    }

    if (canal === "WHATSAPP") {
      return { status: "FALHA", erro: "whatsapp_provedor_pendente" };
    }

    if (canal === "DRIVE") {
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
