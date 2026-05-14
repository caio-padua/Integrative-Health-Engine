/**
 * Task #232 — Retencao automatica da trilha de auditoria do Painel PAWARDS.
 *
 * Contexto:
 *   `painel_pawards_auditoria` (migration 007) recebe um INSERT a cada GET
 *   no Painel PAWARDS pra trilha de compliance/LGPD. Em escala isso vira
 *   centenas/milhares de linhas por dia. Sem politica de retencao a
 *   tabela cresce indefinidamente, a paginacao fica lenta e a LGPD
 *   recomenda manter trilha de acesso so pelo prazo necessario.
 *
 * Comportamento:
 *   - Tick a cada 24h. Em cada tick, deleta TODAS as linhas com
 *     `acessado_em < now() - interval N months` numa unica query.
 *   - N = `PAINEL_PAWARDS_AUDITORIA_RETENCAO_MESES` (default 12).
 *   - Lock distribuido `pg_try_advisory_lock(15102320)` pra defesa em
 *     profundidade (multi-replica nao duplica trabalho no mesmo tick).
 *   - Loga `removidas` e o `corte_em` aplicado. Persiste em
 *     `painel_pawards_auditoria_limpezas` (migration 056) pra observabilidade.
 *
 * Defensivo: nunca lanca; falha em silencio com log.
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../logger";

const TICK_MS = 24 * 60 * 60 * 1000;
const ADVISORY_LOCK_ID = 15102320;
const DEFAULT_MESES = 12;

let executandoAgora = false;
let workerStarted = false;

export interface LimpezaAuditoriaResult {
  removidas: number;
  meses_retencao: number;
  corte_em: string | null;
  pulado_por_lock: boolean;
}

function lerMesesRetencao(): number {
  const raw = process.env["PAINEL_PAWARDS_AUDITORIA_RETENCAO_MESES"];
  if (!raw) return DEFAULT_MESES;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
    logger.warn(
      { raw },
      "[limpeza-auditoria-painel-pawards] PAINEL_PAWARDS_AUDITORIA_RETENCAO_MESES invalido — usando default 12",
    );
    return DEFAULT_MESES;
  }
  return n;
}

export async function rodarLimpezaAuditoriaPainelPawardsAgora(): Promise<LimpezaAuditoriaResult> {
  const meses = lerMesesRetencao();

  const lock = await db.execute(sql`
    SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID}) AS got
  `);
  const got = (lock.rows[0] as { got: boolean } | undefined)?.got ?? false;
  if (!got) {
    return { removidas: 0, meses_retencao: meses, corte_em: null, pulado_por_lock: true };
  }

  try {
    const corteRow = await db.execute(sql`
      SELECT (now() - (${meses}::int || ' months')::interval) AS corte
    `);
    const corte = (corteRow.rows[0] as { corte: Date | string } | undefined)?.corte ?? null;
    const corteIso = corte instanceof Date ? corte.toISOString() : (corte ? String(corte) : null);

    const r = await db.execute(sql`
      DELETE FROM painel_pawards_auditoria
       WHERE acessado_em < now() - (${meses}::int || ' months')::interval
    `);
    const removidas = r.rowCount ?? 0;

    if (removidas > 0) {
      logger.info(
        { removidas, meses_retencao: meses, corte_em: corteIso },
        "[limpeza-auditoria-painel-pawards] linhas antigas removidas",
      );
    } else {
      logger.debug(
        { meses_retencao: meses, corte_em: corteIso },
        "[limpeza-auditoria-painel-pawards] tick sem linhas a remover",
      );
    }

    try {
      await db.execute(sql`
        INSERT INTO painel_pawards_auditoria_limpezas
          (corte_em, meses_retencao, removidas, pulado_por_lock)
        VALUES
          (now() - (${meses}::int || ' months')::interval,
           ${meses}, ${removidas}, false)
      `);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.warn(
        { err: msg },
        "[limpeza-auditoria-painel-pawards] falha registrar limpeza (migration 056 ausente?) — segue",
      );
    }

    return { removidas, meses_retencao: meses, corte_em: corteIso, pulado_por_lock: false };
  } finally {
    await db.execute(sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`);
  }
}

async function tick(): Promise<void> {
  if (executandoAgora) return;
  executandoAgora = true;
  try {
    await rodarLimpezaAuditoriaPainelPawardsAgora();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error({ err: msg }, "[limpeza-auditoria-painel-pawards] tick falhou");
  } finally {
    executandoAgora = false;
  }
}

export function iniciarWorkerLimpezaAuditoriaPainelPawards(): void {
  if (workerStarted) return;
  workerStarted = true;
  logger.info({ tickMs: TICK_MS }, "[limpeza-auditoria-painel-pawards] worker iniciado");
  setTimeout(() => { void tick(); }, 5 * 60_000).unref();
  setInterval(() => { void tick(); }, TICK_MS).unref();
}
