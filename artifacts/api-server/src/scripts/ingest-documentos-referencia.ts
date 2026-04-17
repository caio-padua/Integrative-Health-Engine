import { db } from "@workspace/db";
import { documentosReferenciaTable } from "@workspace/db/schema";
import { sql } from "drizzle-orm";
import mammoth from "mammoth";
import fs from "node:fs";
import path from "node:path";

const ATTACHED = path.resolve(process.cwd(), "../../attached_assets");

type Categoria =
  | "MANIFESTO"
  | "JURIDICO"
  | "AGENTES"
  | "FORMULAS"
  | "ARQUITETURA"
  | "RAS_EVOLUCAO"
  | "IMPEDIMENTOS"
  | "RECEITA_MODELO"
  | "OUTROS";

type Autoria = "DR_CLAUDE" | "DR_MANUS" | "DR_CHATGPT" | "DR_REPLIT" | "INSTITUTO_PADUA" | "DESCONHECIDA";

function detectAutoria(name: string, conteudo: string): Autoria {
  const n = name.toUpperCase();
  const c = conteudo.toUpperCase().slice(0, 4000);
  if (n.includes("CLAUDE") || c.includes("DR. CLAUDE") || c.includes("DR CLAUDE")) return "DR_CLAUDE";
  if (n.includes("MANUS") || c.includes("DR. MANUS") || c.includes("DR MANUS")) return "DR_MANUS";
  if (n.includes("CHATGPT") || n.includes("CHAT_GPT")) return "DR_CHATGPT";
  if (n.includes("REPLIT") || c.includes("DR. REPLIT")) return "DR_REPLIT";
  if (n.includes("PADUA") || n.includes("INSTITUTO")) return "INSTITUTO_PADUA";
  return "DESCONHECIDA";
}

function detectCategoria(name: string, conteudo: string): { categoria: Categoria; tags: string[] } {
  const n = name.toUpperCase();
  const c = conteudo.toUpperCase();
  const tags = new Set<string>();
  if (/RECEITA/.test(n)) {
    tags.add("RECEITA");
    return { categoria: "RECEITA_MODELO", tags: [...tags] };
  }
  if (/AGENTES?_/.test(n) || /\bAGENTES?\s/.test(c.slice(0, 1000))) tags.add("AGENTES");
  if (/IMPE/.test(n) || /IMPEDIMENT/.test(c.slice(0, 2000))) tags.add("IMPEDIMENTOS");
  if (/REVO|EVOLUTIVO|EVOLUCAO/.test(n) || /RAS EVOLUTIVO/.test(c.slice(0, 2000))) tags.add("RAS_EVOLUCAO");
  if (/MANIFESTO|MANI_/.test(n)) tags.add("MANIFESTO");
  if (/ARQU|ARQUITETURA|SPEC|EXEC/.test(n)) tags.add("ARQUITETURA");
  if (/JURIDIC|TCLE|CONSENTIMENTO|LGPD/.test(c.slice(0, 4000))) tags.add("JURIDICO");
  if (/FORMULA|MOTOR CLINICO|BLEND|POSOLOGIA/.test(c.slice(0, 4000))) tags.add("FORMULAS");

  let categoria: Categoria = "OUTROS";
  if (tags.has("AGENTES")) categoria = "AGENTES";
  else if (tags.has("IMPEDIMENTOS")) categoria = "IMPEDIMENTOS";
  else if (tags.has("RAS_EVOLUCAO")) categoria = "RAS_EVOLUCAO";
  else if (tags.has("ARQUITETURA")) categoria = "ARQUITETURA";
  else if (tags.has("MANIFESTO")) categoria = "MANIFESTO";
  else if (tags.has("JURIDICO")) categoria = "JURIDICO";
  else if (tags.has("FORMULAS")) categoria = "FORMULAS";

  return { categoria, tags: [...tags] };
}

function sanitize(s: string): string {
  // Remove NUL e outros caracteres de controle ilegais para PostgreSQL UTF-8
  return s.replace(/\u0000/g, "").replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, " ");
}

function shortName(file: string, ext: "docx" | "pdf"): string {
  const re = new RegExp(`_\\d{13}\\.${ext}$`, "i");
  return file.replace(re, "").replace(/\.(docx|pdf)$/i, "");
}

function makeCodigo(short: string, tipo: string): string {
  return `${tipo.toUpperCase()}_${short.toUpperCase().replace(/[^A-Z0-9]+/g, "_").slice(0, 100)}`;
}

async function main() {
  console.log(`[ingest] Lendo ${ATTACHED}`);
  const all = fs.readdirSync(ATTACHED);
  const docxFiles = all.filter((f) => /\.docx$/i.test(f));
  const pdfFiles = all.filter((f) => /\.pdf$/i.test(f));

  const seenDocx = new Map<string, string>();
  for (const f of docxFiles) {
    const s = shortName(f, "docx");
    if (!seenDocx.has(s)) seenDocx.set(s, f);
  }
  const seenPdf = new Map<string, string>();
  for (const f of pdfFiles) {
    const s = shortName(f, "pdf");
    if (!seenPdf.has(s)) seenPdf.set(s, f);
  }

  let inserted = 0,
    updated = 0,
    skipped = 0;

  // ===== DOCX =====
  for (const [short, file] of seenDocx) {
    const buf = fs.readFileSync(path.join(ATTACHED, file));
    const { value: conteudo } = await mammoth.extractRawText({ buffer: buf });
    if (!conteudo || conteudo.trim().length < 20) {
      skipped++;
      continue;
    }
    const { categoria, tags } = detectCategoria(short, conteudo);
    const autoria = detectAutoria(short, conteudo);
    const codigo = makeCodigo(short, "DOCX");
    const titulo = short.replace(/_/g, " ").trim().slice(0, 250);
    const res = await db
      .insert(documentosReferenciaTable)
      .values({
        codigo,
        titulo,
        categoria,
        tipoOrigem: "docx",
        autoria,
        nomeArquivoOriginal: file,
        conteudoCompleto: sanitize(conteudo),
        bytes: Buffer.byteLength(sanitize(conteudo), "utf8"),
        tags,
        metadados: { fonte: "attached_assets", chars: conteudo.length },
      })
      .onConflictDoUpdate({
        target: documentosReferenciaTable.codigo,
        set: {
          titulo,
          categoria,
          tipoOrigem: "docx",
          autoria,
          nomeArquivoOriginal: file,
          conteudoCompleto: sanitize(conteudo),
          bytes: Buffer.byteLength(sanitize(conteudo), "utf8"),
          tags,
          versao: sql`${documentosReferenciaTable.versao} + 1`,
        },
      })
      .returning({ id: documentosReferenciaTable.id, versao: documentosReferenciaTable.versao });
    if (res[0]?.versao === 1) inserted++;
    else updated++;
    console.log(`  [DOCX] ${categoria.padEnd(14)} ${autoria.padEnd(16)} ${codigo} (${conteudo.length}c)`);
  }

  // ===== PDF (a partir de /tmp/pdf_dump.json) =====
  let pdfDump: Record<string, string> = {};
  if (seenPdf.size > 0) {
    if (!fs.existsSync("/tmp/pdf_dump.json")) {
      throw new Error(
        `[ingest] FATAL: ${seenPdf.size} PDF(s) encontrados em ${ATTACHED} mas /tmp/pdf_dump.json ausente. ` +
          `Re-gere com: cd artifacts/api-server && node -e \"const pdf=require('pdf-parse');...\" (ver README ingest).`,
      );
    }
    pdfDump = JSON.parse(fs.readFileSync("/tmp/pdf_dump.json", "utf8"));
  }
  for (const [short, file] of seenPdf) {
    const conteudo = pdfDump[short];
    if (!conteudo || conteudo.trim().length < 200) {
      skipped++;
      continue;
    }
    const { categoria, tags } = detectCategoria(short, conteudo);
    const autoria = detectAutoria(short, conteudo);
    const codigo = makeCodigo(short, "PDF");
    const titulo = short.replace(/_/g, " ").trim().slice(0, 250);
    const res = await db
      .insert(documentosReferenciaTable)
      .values({
        codigo,
        titulo,
        categoria,
        tipoOrigem: "pdf",
        autoria,
        nomeArquivoOriginal: file,
        conteudoCompleto: sanitize(conteudo),
        bytes: Buffer.byteLength(sanitize(conteudo), "utf8"),
        tags,
        metadados: { fonte: "attached_assets", chars: conteudo.length },
      })
      .onConflictDoUpdate({
        target: documentosReferenciaTable.codigo,
        set: {
          titulo,
          categoria,
          tipoOrigem: "pdf",
          autoria,
          nomeArquivoOriginal: file,
          conteudoCompleto: sanitize(conteudo),
          bytes: Buffer.byteLength(sanitize(conteudo), "utf8"),
          tags,
          versao: sql`${documentosReferenciaTable.versao} + 1`,
        },
      })
      .returning({ id: documentosReferenciaTable.id, versao: documentosReferenciaTable.versao });
    if (res[0]?.versao === 1) inserted++;
    else updated++;
    console.log(`  [PDF ] ${categoria.padEnd(14)} ${autoria.padEnd(16)} ${codigo} (${conteudo.length}c)`);
  }

  console.log(`\n[ingest] inserted=${inserted} updated=${updated} skipped=${skipped}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("[ingest] FAIL:", e);
  process.exit(1);
});
