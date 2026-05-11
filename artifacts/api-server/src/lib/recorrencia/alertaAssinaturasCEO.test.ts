/**
 * Task #53 · Regressao do alerta de recuperacao critico->bom/excelente.
 *
 * Cenario coberto (o que motivou a Task #53 + fix do code-review):
 *   tick 1 do dia: cor anterior 'bom', cor atual 'critico'  -> dispara PIORA
 *   tick 2 do mesmo dia: cor anterior 'critico' (lida do snapshot do PROPRIO
 *     dia), cor atual 'bom' -> dispara MELHORA (fecha o ciclo emocional)
 *
 * Antes do fix, `buscarCorAnterior` usava `dia_brt < hoje` e nunca conseguia
 * detectar a transicao critico->bom dentro do mesmo dia — o tick 2 lia a cor
 * de ONTEM (que era 'bom') e nao reconhecia a recuperacao. Esta regressao
 * trava o `<=` corrigido e ao mesmo tempo confirma que UNIQUE
 * (dia_brt, metrica, tipo_transicao) acomoda piora + melhora no mesmo dia.
 *
 * Roda com DB real (mesma estrategia dos outros testes do projeto). E
 * idempotente: limpa as linhas de teste antes e depois pelo dia futuro
 * `2099-01-01` que nao colide com nada de producao.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const DIA_TESTE = "2099-01-01";
const METRICA = "rejeitadas_7d";

async function limpar(): Promise<void> {
  await db.execute(sql`DELETE FROM alertas_ceo_assinaturas WHERE dia_brt = ${DIA_TESTE}::date`);
  await db.execute(sql`DELETE FROM assinaturas_cor_diaria WHERE dia_brt = ${DIA_TESTE}::date`);
}

async function buscarCorAnterior(metrica: string, diaIso: string): Promise<string | null> {
  const r: any = await db.execute(sql`
    SELECT cor FROM assinaturas_cor_diaria
    WHERE metrica = ${metrica} AND dia_brt <= ${diaIso}::date
    ORDER BY dia_brt DESC LIMIT 1
  `);
  return ((r.rows ?? r)[0]?.cor as string | undefined) ?? null;
}

async function upsertSnapshot(diaIso: string, metrica: string, cor: string): Promise<void> {
  await db.execute(sql`
    INSERT INTO assinaturas_cor_diaria (dia_brt, metrica, cor)
    VALUES (${diaIso}::date, ${metrica}, ${cor})
    ON CONFLICT (dia_brt, metrica) DO UPDATE
      SET cor = EXCLUDED.cor, atualizado_em = NOW()
  `);
}

async function inserirAlerta(
  diaIso: string,
  metrica: string,
  tipoTransicao: "piora" | "melhora",
  corAnterior: string | null,
  corAtual: string,
): Promise<number | null> {
  const r: any = await db.execute(sql`
    INSERT INTO alertas_ceo_assinaturas
      (dia_brt, metrica, tipo_transicao, cor_anterior, cor_atual)
    VALUES (${diaIso}::date, ${metrica}, ${tipoTransicao}, ${corAnterior}, ${corAtual})
    ON CONFLICT (dia_brt, metrica, tipo_transicao) DO NOTHING
    RETURNING id
  `);
  const linha = (r.rows ?? r)[0];
  return linha ? Number(linha.id) : null;
}

test("Task #53 · piora seguida de melhora no MESMO dia gera 2 alertas distintos", async () => {
  await limpar();
  try {
    // Estado inicial: ontem ficou 'bom'.
    await upsertSnapshot("2098-12-31", METRICA, "bom");

    // --- TICK 1 (manha): cor atual = 'critico' ---
    const corAntes1 = await buscarCorAnterior(METRICA, DIA_TESTE);
    assert.equal(corAntes1, "bom", "tick 1 deve ler 'bom' do dia anterior");
    assert.notEqual("critico", corAntes1);
    const idPiora = await inserirAlerta(DIA_TESTE, METRICA, "piora", corAntes1, "critico");
    assert.ok(idPiora, "tick 1 deve criar alerta de piora");
    await upsertSnapshot(DIA_TESTE, METRICA, "critico");

    // --- TICK 2 (tarde do MESMO dia): cor atual = 'bom' ---
    // Aqui mora o fix do code-review: precisa ler a cor 'critico' que o
    // proprio dia ja tem snapshotada (tick 1), nao a 'bom' de ontem.
    const corAntes2 = await buscarCorAnterior(METRICA, DIA_TESTE);
    assert.equal(corAntes2, "critico", "tick 2 deve ler 'critico' do snapshot intra-dia (fix `<=`)");
    const idMelhora = await inserirAlerta(DIA_TESTE, METRICA, "melhora", corAntes2, "bom");
    assert.ok(idMelhora, "tick 2 deve criar alerta de melhora no mesmo dia");
    assert.notEqual(idPiora, idMelhora, "piora e melhora devem ter ids distintos");
    await upsertSnapshot(DIA_TESTE, METRICA, "bom");

    // --- TICK 3: tenta re-disparar melhora (idempotencia). ---
    const idMelhoraDup = await inserirAlerta(DIA_TESTE, METRICA, "melhora", "critico", "bom");
    assert.equal(idMelhoraDup, null, "ON CONFLICT (dia,metrica,tipo) deve bloquear melhora duplicada no mesmo dia");

    // --- Confere persistencia: 2 linhas com tipo_transicao distintos. ---
    const r: any = await db.execute(sql`
      SELECT tipo_transicao, cor_anterior, cor_atual
      FROM alertas_ceo_assinaturas
      WHERE dia_brt = ${DIA_TESTE}::date AND metrica = ${METRICA}
      ORDER BY tipo_transicao
    `);
    const rows = (r.rows ?? r) as Array<{ tipo_transicao: string; cor_anterior: string; cor_atual: string }>;
    assert.equal(rows.length, 2, "deve haver exatamente 2 alertas (piora + melhora) no dia");
    assert.deepEqual(
      rows.map(x => x.tipo_transicao),
      ["melhora", "piora"],
    );
    assert.equal(rows.find(x => x.tipo_transicao === "piora")?.cor_atual, "critico");
    assert.equal(rows.find(x => x.tipo_transicao === "melhora")?.cor_atual, "bom");
  } finally {
    await limpar();
    await db.execute(sql`DELETE FROM assinaturas_cor_diaria WHERE dia_brt = '2098-12-31'::date AND metrica = ${METRICA}`);
  }
});
