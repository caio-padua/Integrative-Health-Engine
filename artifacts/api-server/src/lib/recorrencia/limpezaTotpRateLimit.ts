/**
 * Task #151 — Limpeza periodica de bloqueios de 2FA expirados.
 *
 * Contexto:
 *   A migration 046 criou `totp_rate_limit_tentativas` pra persistir o
 *   contador de tentativas erradas de TOTP por usuario (Task #144). O
 *   helper `rateLimitTotp.ts` faz limpeza preguicosa: so apaga a linha
 *   expirada do usuario X quando esse usuario X volta a tentar. Em escala
 *   de milhares de usuarios isso deixa lixo permanente — quem errou e
 *   nunca mais voltou fica na tabela pra sempre.
 *
 * Comportamento:
 *   - Tick a cada 1h. Em cada tick, deleta TODAS as linhas com
 *     `reseta_em < now()` numa unica query.
 *   - Lock distribuido `pg_try_advisory_lock(15101246)` pra defesa em
 *     profundidade (multi-replica nao duplica trabalho no mesmo tick).
 *   - Loga `removidas` (rowCount) — observabilidade do volume diario.
 *   - Sem mudanca de comportamento pro usuario: a limpeza preguicosa do
 *     `pgStore.estaBloqueado` continua valendo como fallback caso o
 *     worker nao esteja rodando.
 *
 * Defensivo: nunca lanca; falha em silencio com log.
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../logger";

const TICK_MS = 60 * 60 * 1000;
const ADVISORY_LOCK_ID = 15101246;

let executandoAgora = false;
let workerStarted = false;

export interface LimpezaTotpResult {
  removidas: number;
  pulado_por_lock: boolean;
}

export async function rodarLimpezaTotpAgora(): Promise<LimpezaTotpResult> {
  const lock = await db.execute(sql`
    SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID}) AS got
  `);
  const got = (lock.rows[0] as { got: boolean } | undefined)?.got ?? false;
  if (!got) return { removidas: 0, pulado_por_lock: true };

  try {
    const r = await db.execute(sql`
      DELETE FROM totp_rate_limit_tentativas
       WHERE reseta_em < now()
    `);
    const removidas = r.rowCount ?? 0;
    if (removidas > 0) {
      logger.info(
        { removidas },
        "[limpeza-totp] linhas expiradas removidas",
      );
    } else {
      // Zero-deletion runs sao saudaveis (sem lixo acumulado) — loga em
      // debug pra observabilidade do scheduler sem poluir info.
      logger.debug({ removidas: 0 }, "[limpeza-totp] tick sem linhas expiradas");
    }
    return { removidas, pulado_por_lock: false };
  } finally {
    await db.execute(sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`);
  }
}

async function tick(): Promise<void> {
  if (executandoAgora) return;
  executandoAgora = true;
  try {
    await rodarLimpezaTotpAgora();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error({ err: msg }, "[limpeza-totp] tick falhou");
  } finally {
    executandoAgora = false;
  }
}

export function iniciarWorkerLimpezaTotpRateLimit(): void {
  if (workerStarted) return;
  workerStarted = true;
  logger.info({ tickMs: TICK_MS }, "[limpeza-totp] worker iniciado");
  setTimeout(() => { void tick(); }, 60_000).unref();
  setInterval(() => { void tick(); }, TICK_MS).unref();
}
