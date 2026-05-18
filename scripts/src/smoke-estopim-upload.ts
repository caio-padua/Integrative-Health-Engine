// SMOKE TEST do estopim REGRA DO SISTEMA (Caio 17/mai/2026):
// uploadArquivoPaciente deve disparar provisionamento EAGER da arvore +
// ficha cadastral no 1o upload de um paciente legado.
//
// Roda em paciente Padua sem arvore_drive_provisionada_em (legado da Wave
// Cadastro Padua 040). Antes do smoke: 0 pastas. Depois: 32 pastas + ficha.

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const drive = (await import("../../artifacts/api-server/src/lib/arquivos/drive.js" as string)) as {
  uploadArquivoPaciente: (p: Record<string, unknown>) => Promise<{ arquivoId: number; driveFileId: string; driveUrl: string; driveFolderId: string; nomeArquivo: string; sha256: string | null }>;
};

const PACIENTE_ID = Number(process.argv[2] ?? 3106); // Aceli Gomes Vieira

async function main(): Promise<void> {
  const r = (await db.execute(sql`
    SELECT id, nome, codigo_semantico, unidade_id, arvore_drive_provisionada_em, ficha_cadastral_sheet_id, drive_subpastas
    FROM pacientes WHERE id = ${PACIENTE_ID}
  `)) as unknown as { rows: Array<{ id: number; nome: string; codigo_semantico: string; unidade_id: number; arvore_drive_provisionada_em: Date | null; ficha_cadastral_sheet_id: string | null; drive_subpastas: Record<string, string> | null }> };
  const p = r.rows[0];
  if (!p) throw new Error(`paciente ${PACIENTE_ID} nao encontrado`);

  console.log(`=== ESTADO ANTES ===`);
  console.log(`  paciente:                  ${p.nome} (id=${p.id})`);
  console.log(`  codigo_semantico:          ${p.codigo_semantico}`);
  console.log(`  arvore_drive_provisionada: ${p.arvore_drive_provisionada_em ?? "NULL"}`);
  console.log(`  ficha_cadastral_sheet_id:  ${p.ficha_cadastral_sheet_id ?? "NULL"}`);
  console.log(`  pastas em cache:           ${Object.keys(p.drive_subpastas ?? {}).length}`);

  if (p.arvore_drive_provisionada_em) {
    console.log(`\n[!] Paciente JA provisionado — smoke ficaria no-op. Cancelando.`);
    process.exit(0);
  }

  // PDF minusculo (assinatura PDF valida) — "TESTE ESTOPIM SISTEMA"
  const pdfBuffer = Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>>>>>>>endobj\n4 0 obj<</Length 76>>stream\nBT /F1 14 Tf 50 750 Td (TESTE ESTOPIM SISTEMA - pode apagar) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000100 00000 n \n0000000206 00000 n \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n330\n%%EOF\n",
    "binary"
  );

  console.log(`\n[+] Chamando uploadArquivoPaciente (deve disparar estopim)...`);
  const t0 = Date.now();
  const out = await drive.uploadArquivoPaciente({
    pacienteId: p.id,
    unidadeId: p.unidade_id,
    pacienteNome: p.nome,
    codigoSemantico: p.codigo_semantico,
    tipo: "RAS",
    data: new Date(),
    mimeType: "application/pdf",
    conteudo: pdfBuffer,
    geradoPorUserId: 1,
  });
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`  upload concluido em ${dt}s`);
  console.log(`  arquivo: ${out.nomeArquivo}`);
  console.log(`  url:     ${out.driveUrl}`);

  const r2 = (await db.execute(sql`
    SELECT arvore_drive_provisionada_em, ficha_cadastral_sheet_id, ficha_cadastral_sheet_url, drive_subpastas
    FROM pacientes WHERE id = ${PACIENTE_ID}
  `)) as unknown as { rows: Array<{ arvore_drive_provisionada_em: Date | null; ficha_cadastral_sheet_id: string | null; ficha_cadastral_sheet_url: string | null; drive_subpastas: Record<string, string> | null }> };
  const pos = r2.rows[0];

  console.log(`\n=== ESTADO DEPOIS ===`);
  console.log(`  arvore_drive_provisionada: ${pos.arvore_drive_provisionada_em ?? "NULL"}`);
  console.log(`  ficha_cadastral_sheet_id:  ${pos.ficha_cadastral_sheet_id ?? "NULL"}`);
  console.log(`  ficha_cadastral_sheet_url: ${pos.ficha_cadastral_sheet_url ?? "NULL"}`);
  console.log(`  pastas em cache:           ${Object.keys(pos.drive_subpastas ?? {}).length}`);
  console.log(`\n=== RESULTADO ===`);
  console.log(`  ESTOPIM ${pos.arvore_drive_provisionada_em && pos.ficha_cadastral_sheet_id ? "FUNCIONOU" : "FALHOU"}`);
  process.exit(0);
}

main().catch((e) => { console.error("[ERRO]", e); process.exit(1); });
