/**
 * Task #26 · Worker diario que dispara o digest de alertas pro Caio +
 * gestores. Reusa a logica do endpoint GET /painel-pawards/alertas via
 * services/alertasDigestService.
 *
 * Padrao igual aos outros workers `recorrencia/`:
 *   - tick interno 1h
 *   - so executa apos HORA_MINIMA_BRT (default 07:00 BRT) — evita madrugada
 *   - lock distribuido pg_try_advisory_lock(30303034) (proximo apos 33 do
 *     alertaKillSwitchEmailsCEO)
 *   - idempotencia por (dia_brt, destinatario_email) na tabela
 *     alertas_digest_envios (Migration 050)
 *
 * Defensivo: nunca lanca, log + segue.
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { dispararDigestAlertas } from "../../services/alertasDigestService";

const TICK_MS = 60 * 60 * 1000; // 1h
const ADVISORY_LOCK_ID = 30303034;
const HORA_MINIMA_BRT = Number(process.env["ALERTAS_DIGEST_HORA_MINIMA_BRT"] ?? 7);

let executandoAgora = false;
let workerStarted = false;

function horaBrt(): number {
  const utcH = new Date().getUTCHours();
  return (utcH - 3 + 24) % 24;
}

async function tickComLock(): Promise<void> {
  if (executandoAgora) return;
  if (horaBrt() < HORA_MINIMA_BRT) return;
  executandoAgora = true;
  let lockOk = false;
  try {
    // db.execute retorna um shape unknown — narrowing manual pra evitar `any`.
    const r = (await db.execute(
      sql`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID}) AS got`,
    )) as { rows?: Array<{ got: boolean }> } | Array<{ got: boolean }>;
    const linha = (Array.isArray(r) ? r[0] : r.rows?.[0]) ?? null;
    lockOk = Boolean(linha?.got);
    if (!lockOk) return;
    const out = await dispararDigestAlertas({ origem: "WORKER" });
    if (out.pulado) {
      if (out.motivo && out.motivo !== "sem_alertas") {
        console.warn(`[alertasDigest] pulado dia=${out.diaBrt} motivo=${out.motivo}`);
      }
      return;
    }
    const enviados = out.envios.filter((e) => e.enviado).length;
    const ja = out.envios.filter((e) => e.motivo === "ja_enviado_hoje").length;
    const erros = out.envios.filter((e) => !e.enviado && e.motivo !== "ja_enviado_hoje").length;
    if (enviados > 0 || erros > 0) {
      console.log(
        `[alertasDigest] dia=${out.diaBrt} total_alertas=${out.total} ` +
          `enviados=${enviados} ja_enviados=${ja} erros=${erros}`,
      );
    }
  } catch (e) {
    console.error("[alertasDigest] erro fatal tick:", (e as Error).message);
  } finally {
    if (lockOk) {
      try {
        await db.execute(sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`);
      } catch (e) {
        console.error("[alertasDigest] erro release lock:", (e as Error).message);
      }
    }
    executandoAgora = false;
  }
}

export function iniciarWorkerAlertasDigestDiario(): void {
  if (workerStarted) return;
  workerStarted = true;
  console.log(
    `[alertasDigest] Worker iniciado (tick ${TICK_MS / 3600000}h, ` +
      `janela >= ${HORA_MINIMA_BRT}:00 BRT, idempotente por (dia_brt,destinatario))`,
  );
  setTimeout(() => { void tickComLock(); }, 90 * 1000);
  setInterval(() => { void tickComLock(); }, TICK_MS).unref();
}

/** Disparo manual pra testes / endpoint admin. */
export async function rodarDigestAlertasAgora(opts?: { forcar?: boolean }) {
  return dispararDigestAlertas({ origem: "MANUAL", forcar: opts?.forcar });
}
