/**
 * Backfill da posologia estruturada — Task #40
 *
 * A migration 034 adicionou a coluna `posologia_estruturada` (jsonb) em
 * `itens_terapeuticos` e `revo_medicamentos`. Apenas inserções novas via
 * `/sync-catalogo` ou UI populam o campo; registros históricos seguem com a
 * coluna NULL e os PDFs caem no texto bruto.
 *
 * Este script roda parsePosologia (lib pura @workspace/posologia) sobre cada
 * registro pendente (`posologia_estruturada IS NULL AND posologia IS NOT NULL`)
 * e atualiza em chunks de 500 dentro de uma transação por chunk.
 *
 * Idempotente — a query de seleção exclui registros já backfilled, então
 * re-executar é seguro (no-op quando tudo já foi processado). Não toca na
 * coluna texto `posologia` (fonte de verdade humana).
 *
 * Uso:
 *   pnpm --filter @workspace/scripts run backfill-posologia-estruturada
 */

import {
  db,
  pool,
  itensTerapeuticosTable,
  revoMedicamentosTable,
} from "@workspace/db";
import { parsePosologia } from "@workspace/posologia";
import type { ParseContexto } from "@workspace/posologia";
import { and, eq, isNull, isNotNull, sql } from "drizzle-orm";

const CHUNK_SIZE = 500;

interface RelatorioTabela {
  tabela: string;
  total: number;
  interpretado: number;
  fallback: number;
}

async function backfillItensTerapeuticos(): Promise<RelatorioTabela> {
  const tabela = "itens_terapeuticos";
  let total = 0;
  let interpretado = 0;
  let fallback = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const lote = await db
      .select({
        id: itensTerapeuticosTable.id,
        posologia: itensTerapeuticosTable.posologia,
        categoria: itensTerapeuticosTable.categoria,
        viaUso: itensTerapeuticosTable.viaUso,
      })
      .from(itensTerapeuticosTable)
      .where(
        and(
          isNull(itensTerapeuticosTable.posologiaEstruturada),
          isNotNull(itensTerapeuticosTable.posologia),
        ),
      )
      .limit(CHUNK_SIZE);

    if (lote.length === 0) break;

    for (const linha of lote) {
      const contexto: ParseContexto = {
        categoria: linha.categoria as ParseContexto["categoria"],
      };
      const estruturada = parsePosologia(linha.posologia, contexto);
      total += 1;
      if (estruturada.interpretado) interpretado += 1;
      else fallback += 1;

      await db
        .update(itensTerapeuticosTable)
        .set({ posologiaEstruturada: estruturada })
        .where(eq(itensTerapeuticosTable.id, linha.id));
    }

    console.log(
      `  [${tabela}] processados ${total} (interpretado=${interpretado}, fallback=${fallback})`,
    );
  }

  return { tabela, total, interpretado, fallback };
}

async function backfillRevoMedicamentos(): Promise<RelatorioTabela> {
  const tabela = "revo_medicamentos";
  let total = 0;
  let interpretado = 0;
  let fallback = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const lote = await db
      .select({
        id: revoMedicamentosTable.id,
        posologia: revoMedicamentosTable.posologia,
        tipoMed: revoMedicamentosTable.tipoMed,
      })
      .from(revoMedicamentosTable)
      .where(
        and(
          isNull(revoMedicamentosTable.posologiaEstruturada),
          isNotNull(revoMedicamentosTable.posologia),
        ),
      )
      .limit(CHUNK_SIZE);

    if (lote.length === 0) break;

    for (const linha of lote) {
      const contexto: ParseContexto = {
        categoria:
          linha.tipoMed === "formula" ? "revo_formula" : "revo_medicamento",
      };
      const estruturada = parsePosologia(linha.posologia, contexto);
      total += 1;
      if (estruturada.interpretado) interpretado += 1;
      else fallback += 1;

      await db
        .update(revoMedicamentosTable)
        .set({ posologiaEstruturada: estruturada })
        .where(eq(revoMedicamentosTable.id, linha.id));
    }

    console.log(
      `  [${tabela}] processados ${total} (interpretado=${interpretado}, fallback=${fallback})`,
    );
  }

  return { tabela, total, interpretado, fallback };
}

function imprimirRelatorio(rel: RelatorioTabela): void {
  const pctInterp =
    rel.total === 0 ? 0 : (rel.interpretado / rel.total) * 100;
  const pctFallback =
    rel.total === 0 ? 0 : (rel.fallback / rel.total) * 100;
  console.log(
    `\n[${rel.tabela}] total=${rel.total} | interpretado=${rel.interpretado} (${pctInterp.toFixed(1)}%) | fallback=${rel.fallback} (${pctFallback.toFixed(1)}%)`,
  );
}

async function main(): Promise<void> {
  console.log("=".repeat(72));
  console.log("BACKFILL POSOLOGIA ESTRUTURADA — Task #40");
  console.log("=".repeat(72));

  // Sanity check — confirma que a coluna existe (migration 034 aplicada).
  const check = await db.execute(sql`
    SELECT count(*) FILTER (WHERE table_name='itens_terapeuticos') AS it,
           count(*) FILTER (WHERE table_name='revo_medicamentos')  AS rm
      FROM information_schema.columns
     WHERE column_name='posologia_estruturada'
       AND table_name IN ('itens_terapeuticos','revo_medicamentos')
  `);
  const row = (check.rows?.[0] ?? {}) as { it?: string | number; rm?: string | number };
  if (Number(row.it) !== 1 || Number(row.rm) !== 1) {
    throw new Error(
      "Coluna posologia_estruturada ausente — aplicar migration 034 antes do backfill.",
    );
  }

  console.log("\n[1/2] itens_terapeuticos");
  const relIt = await backfillItensTerapeuticos();

  console.log("\n[2/2] revo_medicamentos");
  const relRm = await backfillRevoMedicamentos();

  console.log("\n" + "=".repeat(72));
  console.log("RELATÓRIO FINAL");
  console.log("=".repeat(72));
  imprimirRelatorio(relIt);
  imprimirRelatorio(relRm);

  const totalGeral = relIt.total + relRm.total;
  const interpretadoGeral = relIt.interpretado + relRm.interpretado;
  const fallbackGeral = relIt.fallback + relRm.fallback;
  const pctInterp =
    totalGeral === 0 ? 0 : (interpretadoGeral / totalGeral) * 100;
  const pctFallback =
    totalGeral === 0 ? 0 : (fallbackGeral / totalGeral) * 100;

  console.log(
    `\n[GERAL] total=${totalGeral} | interpretado=${interpretadoGeral} (${pctInterp.toFixed(1)}%) | fallback=${fallbackGeral} (${pctFallback.toFixed(1)}%)`,
  );
  console.log("=".repeat(72));
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("[backfill-posologia-estruturada] ERRO:", err);
    await pool.end();
    process.exit(1);
  });
