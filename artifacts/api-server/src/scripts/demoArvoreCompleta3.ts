/**
 * Demo Wave Cadastro Pádua — 3 pacientes com ÁRVORE COMPLETA + FICHA CADASTRAL.
 *
 * 13/mai/2026 madrugada — Caio aprovou: "criar apenas 3 pastas de clientes
 * pra ver se vai sair certo quando os cadastros gerados criam a árvore".
 *
 * Pega 3 pacientes Pádua COM dados completos (CPF + nascimento + telefone)
 * que ainda NÃO têm google_drive_folder_id, e dispara
 * `provisionarDriveCompleto()` — a mesma função que o POST /pacientes vai
 * chamar a partir de agora.
 *
 * Resultado esperado por paciente:
 *   - Pasta-raiz "[NOME COMPLETO] [CPF]" (sem código semântico no nome)
 *   - Árvore COMPLETA: 7 categorias + ~22 subpastas (eager)
 *   - Spreadsheet "[NOME] - FICHA CADASTRAL" em 01 CADASTRO/DADOS PESSOAIS/
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { provisionarDriveCompleto } from "../lib/pacientes/autoProvisionDrive";

const UNIDADE_ID = 15;
const QTD = process.env.DEMO_QTD ? parseInt(process.env.DEMO_QTD, 10) : 3;

async function main() {
  console.log(`[demo-arvore] início — provisionando ${QTD} pacientes COMPLETOS\n`);

  const result = (await db.execute(sql`
    SELECT id, nome, codigo_semantico, cpf
    FROM pacientes
    WHERE unidade_id = ${UNIDADE_ID}
      AND codigo_semantico IS NOT NULL
      AND cpf IS NOT NULL AND cpf <> ''
      AND data_nascimento IS NOT NULL
      AND telefone IS NOT NULL AND telefone <> ''
      AND (google_drive_folder_id IS NULL OR google_drive_folder_id = '')
    ORDER BY nome
    LIMIT ${QTD}
  `)) as unknown as { rows: Array<{ id: number; nome: string; codigo_semantico: string; cpf: string | null }> };

  console.log("[selecionados]");
  result.rows.forEach((p) => console.log(`  - id=${p.id} ${p.nome} (CPF ${p.cpf})`));
  console.log("");

  for (const p of result.rows) {
    console.log(`=== ${p.nome} (id=${p.id}) ===`);
    const t0 = Date.now();
    const r = await provisionarDriveCompleto({
      id: p.id,
      nome: p.nome,
      codigoSemantico: p.codigo_semantico,
      unidadeId: UNIDADE_ID,
      cpf: p.cpf,
    });
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`  raiz:           ${r.rootId}`);
    console.log(`  pastas criadas: ${r.pastasCriadas}`);
    console.log(`  ficha:          ${r.fichaUrl}${r.fichaJaExistia ? " (já existia)" : ""}`);
    console.log(`  duração:        ${dt}s\n`);
  }

  console.log("[demo-arvore] FIM");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error("[demo-arvore] FALHOU:", e);
  process.exit(1);
});
