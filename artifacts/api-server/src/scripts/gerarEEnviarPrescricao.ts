import { emitirPrescricao } from "../services/emitirPrescricaoService";
import { getDriveClient, uploadFileToDrive } from "../lib/google-drive";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const PRESCRICAO_ID = Number(process.argv[2] ?? 1);
const FOLDER_NAME = "PRESCRICOES PAWARDS";

async function findOrCreateFolderAtRoot(name: string): Promise<string> {
  const drive = await getDriveClient();
  const q = `mimeType='application/vnd.google-apps.folder' and name='${name.replace(/'/g, "\\'")}' and 'root' in parents and trashed=false`;
  const res = await drive.files.list({ q, fields: "files(id, name)", pageSize: 1 });
  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id as string;
  }
  const created = await drive.files.create({
    requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: ["root"] },
    fields: "id",
  });
  return created.data.id as string;
}

async function main() {
  console.log(`[gerar] emitindo prescrição ${PRESCRICAO_ID}...`);
  const result = await emitirPrescricao({ prescricao_id: PRESCRICAO_ID });
  console.log(`[gerar] ${result.pdfs.length} PDF(s) gerado(s):`);
  for (const p of result.pdfs) {
    console.log(`  - PDF ${p.ordem} (${p.cor}/${p.tipo_receita}/${p.destino}) -> ${p.arquivo}`);
  }
  if (result.alertas.length) console.log("[gerar] alertas:", result.alertas);

  console.log(`[drive] preparando pasta "${FOLDER_NAME}" no Drive raiz...`);
  const folderId = await findOrCreateFolderAtRoot(FOLDER_NAME);
  console.log(`[drive] folder id = ${folderId}`);

  const pdfDir = path.join(process.cwd(), "tmp", "prescricoes");
  const uploads: { name: string; url: string }[] = [];
  for (const p of result.pdfs) {
    const fp = path.join(pdfDir, p.arquivo);
    const buf = await fs.readFile(fp);
    const up = await uploadFileToDrive(folderId, p.arquivo, "application/pdf", buf);
    console.log(`  ✓ ${p.arquivo} -> ${up.fileUrl}`);
    uploads.push({ name: p.arquivo, url: up.fileUrl });
  }

  console.log("\n=== RESUMO ===");
  console.log(`Prescrição #${result.prescricao_id} | ${result.pdfs.length} PDF(s) | pasta: ${FOLDER_NAME}`);
  for (const u of uploads) console.log(`  ${u.name}\n  -> ${u.url}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[gerar] ERRO:", err);
  process.exit(1);
});
