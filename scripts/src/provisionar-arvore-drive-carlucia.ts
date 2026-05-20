// Provisiona EAGER toda a arvore de pastas Drive da Carlucia usando a
// funcao oficial criarArvoreCompletaPaciente() de lib/arquivos/drive.ts.
// Cria as 7 categorias macro + ~22 subpastas dentro da hierarquia
// PAWARDS > GESTAO CLINICA > EMPRESAS > INSTITUTO PADUA >
// CLIENTES INSTITUTO PADUA > [CARLUCIA] > [7 categorias] > [subs].

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const drive = (await import("../../artifacts/api-server/src/lib/arquivos/drive.js" as string)) as {
  criarArvoreCompletaPaciente: (p: { id: number; nome: string; codigoSemantico: string; unidadeId: number; cpf?: string }) => Promise<{ rootId: string; pastasCriadas: number; cache: Record<string, string> }>;
};

async function main(): Promise<void> {
  const r = (await db.execute(sql`SELECT id, nome, cpf, codigo_semantico, unidade_id FROM pacientes WHERE id=3497`)) as unknown as { rows: Array<{ id: number; nome: string; cpf: string; codigo_semantico: string; unidade_id: number }> };
  const p = r.rows[0];
  if (!p) throw new Error("Carlucia nao encontrada");

  console.log(`[1/2] Provisionando arvore EAGER pra ${p.nome} (codigo=${p.codigo_semantico})...`);
  console.log("  (~30 requests Drive, 12-18s)");
  const t0 = Date.now();
  const out = await drive.criarArvoreCompletaPaciente({
    id: p.id, nome: p.nome, cpf: p.cpf, codigoSemantico: p.codigo_semantico, unidadeId: p.unidade_id,
  });
  const dt = ((Date.now() - t0) / 1000).toFixed(1);

  console.log(`\n[2/2] Concluido em ${dt}s.`);
  console.log(`  rootId:        ${out.rootId}`);
  console.log(`  pastas criadas: ${out.pastasCriadas} (sera < ${Object.keys(out.cache).length} se ja havia algumas pre-existentes)`);
  console.log(`  total de paths no cache: ${Object.keys(out.cache).length}`);
  console.log(`\n=== ARVORE DRIVE DA CARLUCIA ===`);
  for (const k of Object.keys(out.cache).sort()) {
    const depth = k.split("/").length;
    const indent = "  ".repeat(depth);
    console.log(`${indent}[${k}] -> https://drive.google.com/drive/folders/${out.cache[k]}`);
  }
  process.exit(0);
}

main().catch((err) => { console.error("[ERRO]", err); process.exit(1); });
