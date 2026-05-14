/**
 * Backfill dos horarios padrao de lembrete em unidades — Task #235
 *
 * A migration 050 adicionou as colunas `lembrete_horarios_padrao` (jsonb,
 * default '[]') e `lembrete_tolerancia_minutos` (integer, default 5) em
 * `unidades`. Unidades cadastradas ANTES da migration ficaram com lista
 * vazia — e o prescricaoLembreteService usa essa lista como fallback
 * quando a propria prescricao nao tem `horariosEnvio` proprio. Resultado:
 * prescricoes que herdariam da unidade nao disparam nenhum lembrete.
 *
 * Este script aplica o padrao sensato (07:00, 13:00, 20:00) APENAS nas
 * unidades operacionais (status = 'ATIVO' AND ativa = true) que estao
 * com `lembrete_horarios_padrao` vazio. Nao toca em quem ja tem horarios
 * configurados (clinica autonoma) nem em unidades suspensas/excluidas.
 *
 * Idempotente — a query de selecao filtra `jsonb_array_length = 0`, entao
 * re-executar e seguro (no-op apos o primeiro run). Tolerancia nao e
 * tocada (default 5 ja foi aplicado pela migration via DEFAULT).
 *
 * Uso:
 *   pnpm --filter @workspace/scripts run backfill-lembrete-horarios-unidades
 *   pnpm --filter @workspace/scripts run backfill-lembrete-horarios-unidades -- --dry-run
 */

import { db, pool, unidadesTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";

const HORARIOS_PADRAO_SUGERIDOS = ["07:00", "13:00", "20:00"];

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  console.log("=".repeat(72));
  console.log("BACKFILL LEMBRETE HORARIOS PADRAO — Task #235");
  console.log("=".repeat(72));
  console.log(`Padrao a aplicar: [${HORARIOS_PADRAO_SUGERIDOS.join(", ")}]`);
  console.log(`Modo: ${dryRun ? "DRY-RUN (nenhuma escrita)" : "EXECUCAO"}`);
  console.log("");

  // Sanity check — confirma que a coluna existe (migration 050 aplicada).
  const check = await db.execute(sql`
    SELECT count(*) AS n
      FROM information_schema.columns
     WHERE table_name = 'unidades'
       AND column_name = 'lembrete_horarios_padrao'
  `);
  const row = (check.rows?.[0] ?? {}) as { n?: string | number };
  if (Number(row.n) !== 1) {
    throw new Error(
      "Coluna lembrete_horarios_padrao ausente — aplicar migration 050 antes do backfill.",
    );
  }

  // Seleciona unidades operacionais com lista vazia.
  const candidatas = await db
    .select({
      id: unidadesTable.id,
      nome: unidadesTable.nome,
      tipo: unidadesTable.tipo,
      status: unidadesTable.status,
      ativa: unidadesTable.ativa,
    })
    .from(unidadesTable)
    .where(
      and(
        eq(unidadesTable.ativa, true),
        eq(unidadesTable.status, "ATIVO"),
        sql`jsonb_array_length(${unidadesTable.lembreteHorariosPadrao}) = 0`,
      ),
    );

  console.log(`Unidades operacionais sem horarios padrao: ${candidatas.length}`);
  for (const u of candidatas) {
    console.log(`  - [${u.id}] ${u.nome} (tipo=${u.tipo})`);
  }

  if (candidatas.length === 0) {
    console.log("\nNada a fazer — todas as unidades ativas ja tem horarios padrao.");
    return;
  }

  if (dryRun) {
    console.log(
      `\n[DRY-RUN] Aplicaria ${HORARIOS_PADRAO_SUGERIDOS.join(", ")} em ${candidatas.length} unidade(s). Nenhuma escrita feita.`,
    );
    return;
  }

  let aplicados = 0;
  for (const u of candidatas) {
    await db
      .update(unidadesTable)
      .set({ lembreteHorariosPadrao: HORARIOS_PADRAO_SUGERIDOS })
      .where(
        and(
          eq(unidadesTable.id, u.id),
          // Defensivo: re-checa vazio dentro do UPDATE pra preservar
          // idempotencia mesmo se outra escrita ocorrer entre SELECT e UPDATE.
          sql`jsonb_array_length(${unidadesTable.lembreteHorariosPadrao}) = 0`,
        ),
      );
    aplicados += 1;
  }

  console.log("\n" + "=".repeat(72));
  console.log("RELATORIO FINAL");
  console.log("=".repeat(72));
  console.log(`Total candidatas: ${candidatas.length}`);
  console.log(`Atualizadas:      ${aplicados}`);
  console.log(`Padrao aplicado:  [${HORARIOS_PADRAO_SUGERIDOS.join(", ")}]`);
  console.log("=".repeat(72));
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("[backfill-lembrete-horarios-unidades] ERRO:", err);
    await pool.end();
    process.exit(1);
  });
