/**
 * Wave 13 F4 — Worker que executa exclusao definitiva de unidades cuja
 * carencia LGPD de 30 dias ja venceu.
 *
 * Politica:
 *  - Pega unidades com status='EXCLUIDO_PENDENTE' E exclusao_carencia_ate <= now()
 *  - Se nao tiver `lgpd_export_url` setado, NAO executa (compliance — recusa
 *    apagar antes do export ter sido gerado, mesmo que a janela tenha vencido).
 *    Loga aviso pra alguem rodar o export manualmente.
 *  - Marca status='EXCLUIDO', preserva timestamps de auditoria.
 *  - NAO faz DROP/DELETE em massa (politica conservadora — soft-delete via
 *    status flag ja mascara a unidade em todas as queries que filtram por
 *    `status IN ('ATIVO','SUSPENSO')`). Purge fisico fica fora deste worker
 *    (decisao Caio: prefere manter dados pra ressuscitacao se Justica pedir).
 *  - Auditoria EXCLUIR_EXECUTAR registrada com executado_por=platform_owner
 *    da unidade no momento (ou Caio id=1 como fallback determinístico).
 *
 * Tick: 1h. Lock: pg_try_advisory_lock(13030246). Idempotente — re-roda
 * sem efeito quando nao ha unidades vencidas.
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../logger";

const TICK_MS = 60 * 60 * 1000;
const ADVISORY_LOCK_ID = 13030246;
const PLATFORM_OWNER_FALLBACK_ID = 1;

let executandoAgora = false;
let workerStarted = false;

interface UnidadeVencida {
  id: number;
  nome: string;
  exclusao_carencia_ate: Date;
  lgpd_export_url: string | null;
  suspenso_por_usuario_id: number | null;
}

async function tick(): Promise<void> {
  if (executandoAgora) return;
  executandoAgora = true;
  try {
    const lock = await db.execute(sql`
      SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID}) AS got
    `);
    const got = (lock.rows[0] as { got: boolean } | undefined)?.got ?? false;
    if (!got) return;

    try {
      const result = await db.execute(sql`
        SELECT id, nome, exclusao_carencia_ate, lgpd_export_url,
               suspenso_por_usuario_id
        FROM unidades
        WHERE status = 'EXCLUIDO_PENDENTE'
          AND exclusao_carencia_ate IS NOT NULL
          AND exclusao_carencia_ate <= now()
      `);
      const vencidas = result.rows as unknown as UnidadeVencida[];
      if (vencidas.length === 0) return;

      for (const u of vencidas) {
        if (!u.lgpd_export_url) {
          logger.warn(
            { unidadeId: u.id, nome: u.nome },
            "[exclusao-carencia] unidade vencida SEM export LGPD — pulando " +
              "(rodar export manual antes da execucao)",
          );
          continue;
        }
        const executor = u.suspenso_por_usuario_id ?? PLATFORM_OWNER_FALLBACK_ID;
        await db.transaction(async (tx) => {
          // Race-safe: se o owner cancelou a exclusao entre o SELECT e o
          // UPDATE, o WHERE nao casa, rowCount=0 e abortamos sem auditar
          // EXCLUIR_EXECUTAR (evita auditoria fantasma).
          const upd = await tx.execute(sql`
            UPDATE unidades
               SET status = 'EXCLUIDO',
                   ativa = false
             WHERE id = ${u.id}
               AND status = 'EXCLUIDO_PENDENTE'
          `);
          const afetadas = upd.rowCount ?? 0;
          if (afetadas === 0) {
            logger.info(
              { unidadeId: u.id, nome: u.nome },
              "[exclusao-carencia] race detectada (cancelada antes de executar)",
            );
            return;
          }
          await tx.execute(sql`
            INSERT INTO auditoria_kill_switch
              (acao, unidade_id, executado_por_usuario_id,
               motivo, ip, user_agent, metadata)
            VALUES (
              'EXCLUIR_EXECUTAR', ${u.id}, ${executor},
              'Carencia LGPD de 30 dias vencida — execucao automatica',
              'worker:exclusao-carencia', 'worker:exclusao-carencia',
              ${JSON.stringify({
                nome: u.nome,
                carencia_ate: u.exclusao_carencia_ate,
                lgpd_export_url: u.lgpd_export_url,
                executado_por_worker: true,
              })}::jsonb
            )
          `);
        });
        logger.info(
          { unidadeId: u.id, nome: u.nome },
          "[exclusao-carencia] unidade excluida apos vencimento",
        );
      }
    } finally {
      await db.execute(sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error({ err: msg }, "[exclusao-carencia] tick falhou");
  } finally {
    executandoAgora = false;
  }
}

export function iniciarWorkerExclusaoCarencia(): void {
  if (workerStarted) return;
  workerStarted = true;
  logger.info({ tickMs: TICK_MS }, "[exclusao-carencia] worker iniciado");
  setTimeout(() => { void tick(); }, 45_000);
  setInterval(() => { void tick(); }, TICK_MS);
}
