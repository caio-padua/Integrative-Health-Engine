/**
 * Backfill do contador historico de bloqueios 2FA expirados — Task #273
 *
 * Contexto:
 *   A Task #160 (Migration 061 `totp_rate_limit_limpezas_diarias`) so comeca
 *   a agregar `total_removidas` por dia BRT a partir do primeiro tick do
 *   worker `limpezaTotpRateLimit` (Task #151) APOS a migration ser aplicada.
 *   Os dias anteriores ficam sem linha — quando o endpoint do CEO calcula
 *   "media historica" a serie comeca enviesada (zero ou poucos pontos),
 *   atrapalhando a deteccao de anomalias.
 *
 *   A unica fonte de dado historico que ainda existe online e a tabela
 *   `totp_rate_limit_tentativas` (Migration 046, Task #144): linhas com
 *   `reseta_em < now()` que ainda NAO foram removidas pelo proximo tick
 *   do worker. Cada uma representa um bloqueio 2FA que expirou no dia
 *   `reseta_em` BRT — exatamente o que o worker contaria.
 *
 *   Logs de servidor de meses anteriores nao estao acessiveis
 *   programaticamente, entao essa estimativa pelo estado vivo e o melhor
 *   proxy disponivel.
 *
 * Estrategia (revisada apos code review):
 *
 *   1. Adquire o MESMO `pg_try_advisory_lock(15101246)` usado pelo worker
 *      `limpezaTotpRateLimit`. Isso impede que o worker rode um tick
 *      simultaneo e processe linhas que o backfill esta consumindo, e
 *      vice-versa. Sem o lock = duas leituras concorrentes da mesma linha
 *      = dupla contagem.
 *
 *   2. Em UMA transacao:
 *        DELETE FROM totp_rate_limit_tentativas
 *         WHERE reseta_em < now() [AND ... >= --desde]
 *         RETURNING reseta_em
 *      Agrupa o resultado por dia BRT de `reseta_em` em JS e UPSERT em
 *      `totp_rate_limit_limpezas_diarias` com
 *        ON CONFLICT (dia_brt) DO UPDATE
 *          SET total_removidas = existing + EXCLUDED.total_removidas,
 *              ticks_executados = existing + 1,
 *              ultima_em = now()
 *      Como o backfill DELETOU as linhas, o proximo tick do worker NAO vai
 *      reencontrar elas e somar de novo (resolve dupla contagem apontada
 *      no review).
 *
 *   3. Idempotencia: re-rodar o script encontra zero linhas pra deletar
 *      (foram consumidas no run anterior; e qualquer linha nova ja teria
 *      sido capturada pelo proprio worker no tick seguinte). UPSERT com
 *      DO UPDATE e seguro porque a query origem ja nao retorna nada =
 *      zero linhas afetadas.
 *
 *   4. Pulado-por-lock: se o worker estiver no meio de um tick, o lock
 *      falha e o script aborta com mensagem clara (sem fazer nada). O
 *      proximo tick do worker (ou re-run do script) cobre a janela.
 *
 * Decisao explicita sobre semantica de `dia_brt`:
 *   O worker oficial (`limpezaTotpRateLimit.ts`) atribui cada tick ao dia
 *   BRT do PROPRIO TICK (`now() AT TIME ZONE 'America/Sao_Paulo'`). Em
 *   regime estavel isso aproxima `reseta_em` porque o tick e horario.
 *   Este backfill usa o dia BRT de `reseta_em` (dia em que o bloqueio
 *   expirou) — o sinal historico real que justifica a existencia do
 *   backfill. Sem isso, todo backlog acumulado cairia num unico bucket
 *   de "hoje" e nao popularia nada retroativo, contradizendo a Task #273.
 *   Para o painel do CEO ler "media de bloqueios por dia", esta semantica
 *   e a mais fiel ao evento. Apos o backfill consumir o backlog, os
 *   ticks subsequentes do worker passam a inserir com tick≈expiry e a
 *   serie volta a se comportar consistentemente.
 *
 * Uso:
 *   pnpm --filter @workspace/scripts run backfill-totp-limpezas-diarias
 *   pnpm --filter @workspace/scripts run backfill-totp-limpezas-diarias -- --desde 2026-04-01
 *   pnpm --filter @workspace/scripts run backfill-totp-limpezas-diarias -- --dry-run
 */

import { db, pool } from "@workspace/db";
import { sql } from "drizzle-orm";

// MESMO id usado em `limpezaTotpRateLimit.ts` — coordena script com worker.
const ADVISORY_LOCK_ID = 15101246;

interface Args {
  desde: string | null;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  let desde: string | null = null;
  let dryRun = false;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--dry-run") {
      dryRun = true;
    } else if (a === "--desde") {
      desde = argv[i + 1] ?? null;
      i += 1;
    } else if (a?.startsWith("--desde=")) {
      desde = a.slice("--desde=".length);
    }
  }
  if (desde !== null && !/^\d{4}-\d{2}-\d{2}$/.test(desde)) {
    throw new Error(`--desde deve ser YYYY-MM-DD (recebido: ${desde})`);
  }
  return { desde, dryRun };
}

async function tabelaExiste(nome: string): Promise<boolean> {
  const r = await db.execute(sql`
    SELECT count(*)::int AS n
      FROM information_schema.tables
     WHERE table_name = ${nome}
  `);
  const row = (r.rows?.[0] ?? {}) as { n?: number | string };
  return Number(row.n) === 1;
}

async function main(): Promise<void> {
  const { desde, dryRun } = parseArgs(process.argv.slice(2));

  console.log("=".repeat(72));
  console.log("BACKFILL TOTP LIMPEZAS DIARIAS — Task #273");
  console.log("=".repeat(72));
  console.log(`Desde: ${desde ?? "(sem filtro — todas as linhas expiradas)"}`);
  console.log(`Modo:  ${dryRun ? "DRY-RUN (nenhuma escrita)" : "EXECUCAO"}`);
  console.log("");

  for (const t of [
    "totp_rate_limit_tentativas",
    "totp_rate_limit_limpezas_diarias",
  ]) {
    if (!(await tabelaExiste(t))) {
      throw new Error(
        `Tabela ${t} ausente — aplicar migrations 046 e 061 antes do backfill.`,
      );
    }
  }

  // Adquire o lock do worker pra impedir tick concorrente (evita dupla
  // contagem entre backfill e worker).
  const lock = await db.execute<{ got: boolean }>(sql`
    SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID}) AS got
  `);
  const got = (lock.rows?.[0]?.got ?? false) === true;
  if (!got) {
    console.error(
      `\n[abort] nao consegui o advisory lock ${ADVISORY_LOCK_ID} — ` +
        "worker `limpezaTotpRateLimit` provavelmente esta em tick. " +
        "Tente novamente em 1-2 minutos.",
    );
    process.exitCode = 2;
    return;
  }

  try {
    const filtroDesde = desde
      ? sql`AND (reseta_em AT TIME ZONE 'America/Sao_Paulo')::date >= ${desde}::date`
      : sql``;

    if (dryRun) {
      // DRY-RUN: SELECT em vez de DELETE pra previa, sem mutar nada.
      const previa = await db.execute<{ dia_brt: string; n: number }>(sql`
        SELECT (reseta_em AT TIME ZONE 'America/Sao_Paulo')::date::text AS dia_brt,
               count(*)::int AS n
          FROM totp_rate_limit_tentativas
         WHERE reseta_em < now()
           ${filtroDesde}
         GROUP BY 1
         ORDER BY 1 ASC
      `);
      const linhas = previa.rows ?? [];
      console.log(`Dias com linhas expiradas vivas: ${linhas.length}`);
      for (const g of linhas) {
        console.log(`  - ${g.dia_brt}: ${g.n} linha(s)`);
      }
      const total = linhas.reduce((acc, g) => acc + Number(g.n), 0);
      console.log(
        `\n[DRY-RUN] Consumiria ${total} linha(s) e UPSERT em ${linhas.length} dia(s). Nenhuma escrita feita.`,
      );
    } else {
      // EXECUCAO: DELETE+RETURNING + UPSERT, dentro de transacao.
      const grupos = await db.transaction(async (tx) => {
        const del = await tx.execute<{ reseta_em: Date | string }>(sql`
          DELETE FROM totp_rate_limit_tentativas
           WHERE reseta_em < now()
             ${filtroDesde}
          RETURNING reseta_em
        `);
        const rows = del.rows ?? [];

        // Agrupa por dia BRT de reseta_em em JS pra atribuicao temporal
        // historica fiel (ver decisao na docstring).
        const porDia = new Map<string, number>();
        for (const r of rows) {
          const d = new Date(r.reseta_em as string | Date);
          const diaBrt = new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Sao_Paulo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(d); // formato YYYY-MM-DD
          porDia.set(diaBrt, (porDia.get(diaBrt) ?? 0) + 1);
        }

        const ordenado = [...porDia.entries()].sort(([a], [b]) =>
          a.localeCompare(b),
        );
        for (const [diaBrt, n] of ordenado) {
          await tx.execute(sql`
            INSERT INTO totp_rate_limit_limpezas_diarias
              (dia_brt, total_removidas, ticks_executados, primeira_em, ultima_em)
            VALUES
              (${diaBrt}::date, ${n}, 1, now(), now())
            ON CONFLICT (dia_brt) DO UPDATE
              SET total_removidas  = totp_rate_limit_limpezas_diarias.total_removidas
                                     + EXCLUDED.total_removidas,
                  ticks_executados = totp_rate_limit_limpezas_diarias.ticks_executados + 1,
                  ultima_em        = now()
          `);
        }
        return ordenado;
      });

      console.log(`Dias backfilled: ${grupos.length}`);
      for (const [diaBrt, n] of grupos) {
        console.log(`  - ${diaBrt}: +${n} linha(s)`);
      }
      const total = grupos.reduce((acc, [, n]) => acc + n, 0);
      console.log(`\nTotal de linhas consumidas: ${total}`);
      if (grupos.length === 0) {
        console.log(
          "Nada a backfillar — `totp_rate_limit_tentativas` nao tem linhas expiradas vivas.",
        );
      }
    }

    // Estatistica final pra dar contexto: quantos pontos a serie historica
    // tem agora e qual a nova media.
    const stats = await db.execute<{ dias: number; media: string | null }>(sql`
      SELECT count(*)::int AS dias,
             avg(total_removidas)::text AS media
        FROM totp_rate_limit_limpezas_diarias
    `);
    const s = (stats.rows?.[0] ?? {}) as {
      dias?: number;
      media?: string | null;
    };
    const dias = Number(s.dias ?? 0);
    const media =
      s.media === null || s.media === undefined
        ? "n/a"
        : Number(s.media).toFixed(2);
    console.log("");
    console.log("=".repeat(72));
    console.log("SERIE HISTORICA APOS BACKFILL");
    console.log("=".repeat(72));
    console.log(`Dias com dado:                ${dias}`);
    console.log(`Media historica (linhas/dia): ${media}`);
    console.log("=".repeat(72));
  } finally {
    await db.execute(sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`);
  }
}

main()
  .then(async () => {
    await pool.end();
    process.exit(process.exitCode ?? 0);
  })
  .catch(async (err) => {
    console.error("[backfill-totp-limpezas-diarias] ERRO:", err);
    await pool.end();
    process.exit(1);
  });
