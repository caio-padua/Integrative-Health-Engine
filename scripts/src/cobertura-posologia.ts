/**
 * Cobertura real do parser de posologia — Task #241
 *
 * Lê todos os textos distintos de posologia presentes nas tabelas reais do
 * banco (`itens_terapeuticos.posologia` e `revo_medicamentos.posologia` —
 * equivalentes às "receitas" no domínio Pawards), roda `parsePosologia` em
 * cada um e mede a cobertura efetiva: % interpretado, top 50 textos NÃO
 * interpretados (ordenados por frequência) e top 20 textos mais frequentes
 * de qualquer tipo.
 *
 * Saída salva em CSV em `scripts/out/cobertura-posologia.csv` (uma linha por
 * texto distinto, com colunas: texto, ocorrencias, interpretado, categoria_amostra).
 *
 * Uso:
 *   pnpm --filter @workspace/scripts run cobertura-posologia
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  db,
  pool,
  itensTerapeuticosTable,
  revoMedicamentosTable,
} from "@workspace/db";
import { parsePosologia } from "@workspace/posologia";
import type { ParseContexto } from "@workspace/posologia";
import { isNotNull, sql } from "drizzle-orm";

interface LinhaTexto {
  texto: string;
  ocorrencias: number;
  interpretado: boolean;
  categoriaAmostra: ParseContexto["categoria"];
}

function categoriaItensTerapeuticos(
  cat: string | null,
): ParseContexto["categoria"] {
  switch (cat) {
    case "formula":
    case "injetavel_im":
    case "injetavel_ev":
    case "implante":
    case "exame":
    case "protocolo":
      return cat;
    default:
      return undefined;
  }
}

async function carregarItensTerapeuticos(): Promise<
  Array<{ texto: string; categoria: ParseContexto["categoria"] }>
> {
  const linhas = await db
    .select({
      posologia: itensTerapeuticosTable.posologia,
      categoria: itensTerapeuticosTable.categoria,
    })
    .from(itensTerapeuticosTable)
    .where(isNotNull(itensTerapeuticosTable.posologia));

  const out: Array<{ texto: string; categoria: ParseContexto["categoria"] }> = [];
  for (const l of linhas) {
    if (typeof l.posologia !== "string" || l.posologia.trim().length === 0) continue;
    out.push({
      texto: l.posologia,
      categoria: categoriaItensTerapeuticos(l.categoria),
    });
  }
  return out;
}

async function carregarRevoMedicamentos(): Promise<
  Array<{ texto: string; categoria: ParseContexto["categoria"] }>
> {
  const linhas = await db
    .select({
      posologia: revoMedicamentosTable.posologia,
      tipoMed: revoMedicamentosTable.tipoMed,
    })
    .from(revoMedicamentosTable)
    .where(isNotNull(revoMedicamentosTable.posologia));

  const out: Array<{ texto: string; categoria: ParseContexto["categoria"] }> = [];
  for (const l of linhas) {
    if (typeof l.posologia !== "string" || l.posologia.trim().length === 0) continue;
    out.push({
      texto: l.posologia,
      categoria: l.tipoMed === "formula" ? "revo_formula" : "revo_medicamento",
    });
  }
  return out;
}

function escaparCsv(valor: string): string {
  if (/[",\n\r]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

async function main(): Promise<void> {
  console.log("=".repeat(72));
  console.log("COBERTURA POSOLOGIA — Task #241");
  console.log("=".repeat(72));

  // Sanity check — confirma que as tabelas existem.
  await db.execute(sql`SELECT 1`);

  const todos = [
    ...(await carregarItensTerapeuticos()),
    ...(await carregarRevoMedicamentos()),
  ];

  console.log(
    `\nLidas ${todos.length} linhas com posologia preenchida (itens_terapeuticos + revo_medicamentos).`,
  );

  // Agrupa por texto distinto, mantendo a primeira categoria observada como amostra.
  const mapa = new Map<
    string,
    { ocorrencias: number; categoriaAmostra: ParseContexto["categoria"] }
  >();
  for (const linha of todos) {
    const existente = mapa.get(linha.texto);
    if (existente) {
      existente.ocorrencias += 1;
    } else {
      mapa.set(linha.texto, {
        ocorrencias: 1,
        categoriaAmostra: linha.categoria,
      });
    }
  }

  const distintos: LinhaTexto[] = [];
  for (const [texto, info] of mapa.entries()) {
    const estruturada = parsePosologia(texto, {
      categoria: info.categoriaAmostra,
    });
    distintos.push({
      texto,
      ocorrencias: info.ocorrencias,
      interpretado: estruturada.interpretado,
      categoriaAmostra: info.categoriaAmostra,
    });
  }

  const totalDistintos = distintos.length;
  const interpretadosDistintos = distintos.filter((d) => d.interpretado).length;
  const fallbackDistintos = totalDistintos - interpretadosDistintos;

  // Cobertura ponderada por frequência (cada ocorrência conta).
  let totalOccur = 0;
  let interpOccur = 0;
  for (const d of distintos) {
    totalOccur += d.ocorrencias;
    if (d.interpretado) interpOccur += d.ocorrencias;
  }
  const fallbackOccur = totalOccur - interpOccur;

  const pctDistintos =
    totalDistintos === 0 ? 0 : (interpretadosDistintos / totalDistintos) * 100;
  const pctOccur = totalOccur === 0 ? 0 : (interpOccur / totalOccur) * 100;

  console.log("\n" + "-".repeat(72));
  console.log("RESUMO");
  console.log("-".repeat(72));
  console.log(
    `Textos distintos: ${totalDistintos} | interpretado=${interpretadosDistintos} (${pctDistintos.toFixed(1)}%) | fallback=${fallbackDistintos}`,
  );
  console.log(
    `Ocorrências:      ${totalOccur} | interpretado=${interpOccur} (${pctOccur.toFixed(1)}%) | fallback=${fallbackOccur}`,
  );

  const naoInterpretados = distintos
    .filter((d) => !d.interpretado)
    .sort((a, b) => b.ocorrencias - a.ocorrencias);

  console.log("\n" + "-".repeat(72));
  console.log(
    `TOP 50 TEXTOS NÃO INTERPRETADOS (de ${naoInterpretados.length} distintos)`,
  );
  console.log("-".repeat(72));
  for (const [i, d] of naoInterpretados.slice(0, 50).entries()) {
    console.log(
      `${String(i + 1).padStart(2, "0")}. (${d.ocorrencias}x) [${d.categoriaAmostra ?? "?"}] ${d.texto}`,
    );
  }
  if (naoInterpretados.length === 0) {
    console.log("  (nenhum — 100% interpretado)");
  }

  const maisFrequentes = [...distintos].sort(
    (a, b) => b.ocorrencias - a.ocorrencias,
  );

  console.log("\n" + "-".repeat(72));
  console.log("TOP 20 TEXTOS MAIS FREQUENTES");
  console.log("-".repeat(72));
  for (const [i, d] of maisFrequentes.slice(0, 20).entries()) {
    const flag = d.interpretado ? "OK   " : "FALL ";
    console.log(
      `${String(i + 1).padStart(2, "0")}. ${flag} (${d.ocorrencias}x) [${d.categoriaAmostra ?? "?"}] ${d.texto}`,
    );
  }

  // CSV — uma linha por texto distinto, ordenado por ocorrencias desc.
  const ordenadoCsv = [...distintos].sort(
    (a, b) => b.ocorrencias - a.ocorrencias,
  );
  const linhasCsv = ["texto,ocorrencias,interpretado,categoria_amostra"];
  for (const d of ordenadoCsv) {
    linhasCsv.push(
      [
        escaparCsv(d.texto),
        String(d.ocorrencias),
        d.interpretado ? "true" : "false",
        escaparCsv(d.categoriaAmostra ?? ""),
      ].join(","),
    );
  }

  const aqui = dirname(fileURLToPath(import.meta.url));
  const caminhoCsv = resolve(aqui, "../out/cobertura-posologia.csv");
  mkdirSync(dirname(caminhoCsv), { recursive: true });
  writeFileSync(caminhoCsv, linhasCsv.join("\n") + "\n", "utf8");

  console.log("\n" + "=".repeat(72));
  console.log(`CSV salvo em: ${caminhoCsv}`);
  console.log("=".repeat(72));
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("[cobertura-posologia] ERRO:", err);
    await pool.end();
    process.exit(1);
  });
