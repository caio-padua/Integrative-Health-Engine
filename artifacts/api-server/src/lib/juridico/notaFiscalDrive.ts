/**
 * Auto-upload da NF para a subpasta NOTAS FISCAIS do paciente no Drive.
 * Onda 6.4 - Caio: "Voce pode colocar a criacao de todas aquelas subpastas
 * e incluir como rotina a notas fiscais."
 *
 * Gera um HTML simples com a descricao blindada + dados fiscais e faz upload.
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { uploadToClientSubfolder, formatFileName, getOrCreateClientFolder } from "../google-drive";

interface NFRecord { id: number; valor: string | number; descricao_blindada: string; hash_descricao: string; categoria_codigo: string | null; criado_em?: string; }
interface PacienteRecord { id: number; nome: string; cpf: string | null; google_drive_folder_id: string | null; }

// Escape HTML completo - cobre <, >, &, ", ' e / para evitar XSS e quebra
// de atributos (closes code review finding 1.2 da Onda 6.4).
function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\//g, "&#x2F;");
}

function montarHtmlNF(nf: NFRecord, paciente: PacienteRecord): string {
  const valor = typeof nf.valor === "number" ? nf.valor.toFixed(2) : Number(nf.valor).toFixed(2);
  const dataStr = new Date().toLocaleDateString("pt-BR");
  // descricao_blindada ja passou por exigirTextoLimpo - mantem quebras de linha
  const descricaoSafe = esc(nf.descricao_blindada).replace(/\n/g, "<br>");
  const categoriaTrecho = nf.categoria_codigo ? `&middot; Categoria: ${esc(nf.categoria_codigo)}` : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>NF ${esc(nf.id)} - ${esc(paciente.nome)}</title>
<style>body{font-family:Georgia,serif;max-width:780px;margin:40px auto;color:#1F4E5F;line-height:1.6}h1{border-bottom:3px solid #C9A961;padding-bottom:8px}.bloco{background:#FAF7F2;padding:20px;border-left:4px solid #1F4E5F;margin:24px 0;white-space:pre-wrap}.meta{font-size:12px;color:#666}.assinatura{margin-top:60px;text-align:center;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:20px}</style>
</head><body>
<h1>INSTITUTO PADUA &middot; NOTA FISCAL DE ATENDIMENTO MEDICO</h1>
<p class="meta">Documento gerado automaticamente pelo sistema PAWARDS &middot; ${esc(dataStr)} &middot; NF interna #${esc(nf.id)} ${categoriaTrecho}</p>
<div class="bloco">${descricaoSafe}</div>
<p><strong>Valor:</strong> R$ ${esc(valor.replace(".", ","))}</p>
<p class="meta">Hash SHA-256 do documento: <code>${esc(nf.hash_descricao)}</code></p>
<div class="assinatura">Developed and Supervised by PADCON &middot; Sistema PAWARDS</div>
</body></html>`;
}

export async function uploadNFParaDrive(nfId: number): Promise<{ fileUrl: string; fileId: string } | null> {
  const r1 = await db.execute(sql`SELECT id, valor, descricao_blindada, hash_descricao, categoria_codigo, paciente_id FROM notas_fiscais_emitidas WHERE id = ${nfId}`);
  const nf = ((r1 as unknown as { rows?: Array<NFRecord & { paciente_id: number }> }).rows || [])[0];
  if (!nf) throw new Error(`NF ${nfId} nao encontrada`);

  const r2 = await db.execute(sql`SELECT id, nome, cpf, google_drive_folder_id FROM pacientes WHERE id = ${nf.paciente_id}`);
  const pac = ((r2 as unknown as { rows?: PacienteRecord[] }).rows || [])[0];
  if (!pac) throw new Error(`Paciente ${nf.paciente_id} nao encontrado`);

  // Cria pasta se nao existir
  let folderId = pac.google_drive_folder_id;
  if (!folderId) {
    const created = await getOrCreateClientFolder(pac.nome, pac.cpf || "SEM-CPF");
    folderId = created.folderId;
    await db.execute(sql`UPDATE pacientes SET google_drive_folder_id = ${folderId} WHERE id = ${pac.id}`);
  }

  const html = montarHtmlNF(nf, pac);
  const fileName = formatFileName(new Date(), "NF", pac.nome, String(nf.id)) + ".html";
  const result = await uploadToClientSubfolder({
    clientFolderId: folderId!,
    subfolder: "NOTAS FISCAIS",
    fileName,
    mimeType: "text/html",
    content: html,
  });

  await db.execute(sql`UPDATE notas_fiscais_emitidas SET drive_file_id = ${result.fileId}, drive_file_url = ${result.fileUrl} WHERE id = ${nfId}`);

  return { fileUrl: result.fileUrl, fileId: result.fileId };
}
