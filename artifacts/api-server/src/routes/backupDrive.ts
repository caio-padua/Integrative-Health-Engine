import { Router } from "express";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { execSync } from "child_process";
import fs from "fs";
import PDFDocument from "pdfkit";

const router = Router();

const DRIVE_FOLDER_ID = "1LfolNE3KgJSrnKwxp0WNXTRIRvSS_i7f";
const PROJETO_NOME = "PADCOM";

function sanitizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 \n\r\t\-_.:/()]/g, "")
    .toUpperCase();
}

function sanitizeFileName(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 \-_.]/g, "")
    .toUpperCase();
}

function getTimestamp() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return { data: `${yy}.${mm}.${dd}`, hora: `${hh}:${min}` };
}

function getGitLog(): string {
  try {
    return execSync(
      'git log --oneline -20 --format="%h %s (%cr)"',
      { cwd: "/home/runner/workspace", encoding: "utf-8" }
    ).trim();
  } catch {
    return "GIT LOG INDISPONIVEL";
  }
}

function getFileTree(): string {
  try {
    const tree = execSync(
      'find /home/runner/workspace -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/.local/*" -not -path "*/attached_assets/*" | sort | head -300',
      { encoding: "utf-8" }
    );
    return tree.split("\n").map((f) => f.replace("/home/runner/workspace/", "")).filter(Boolean).join("\n");
  } catch {
    return "ARVORE DE ARQUIVOS INDISPONIVEL";
  }
}

function generatePlainTextContent(resumo: string): string {
  const { data, hora } = getTimestamp();
  const gitLog = getGitLog();
  const fileTree = getFileTree();
  const resumoClean = sanitizeText(resumo);

  return `CODIGO REPLIT ${PROJETO_NOME} ${data} ${hora}
${resumoClean}

========================================
DATA/HORA DO BACKUP
========================================
${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}

========================================
ULTIMOS 20 COMMITS
========================================
${gitLog}

========================================
ARVORE DE ARQUIVOS DO PROJETO
========================================
${fileTree}

========================================
INFORMACOES DO PROJETO
========================================
PROJETO: ${PROJETO_NOME} V15.2 MOTOR CLINICO
STACK: REACT + TYPESCRIPT + EXPRESS + POSTGRESQL + DRIZZLE ORM
AMBIENTE: REPLIT
BRANCH GITHUB: REPLIT-AGENT

========================================
MODULOS PRINCIPAIS
========================================
ARTIFACTS/CLINICA-MOTOR - FRONTEND REACT (MOTOR CLINICO)
ARTIFACTS/API-SERVER - BACKEND EXPRESS API
LIB/DB - SCHEMA POSTGRESQL (DRIZZLE ORM)

========================================
BACKUP AUTOMATICO GERADO VIA MOTOR CLINICO PADCOM V15.2
`;
}

function generatePdfBuffer(resumo: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const { data, hora } = getTimestamp();
    const gitLog = getGitLog();
    const resumoClean = sanitizeText(resumo);

    doc.fontSize(18).font("Helvetica-Bold").text(`CODIGO REPLIT - ${PROJETO_NOME} V15.2`, { align: "center" });
    doc.fontSize(12).font("Helvetica").text(`${data} ${hora}`, { align: "center" });
    doc.moveDown();
    doc.fontSize(14).font("Helvetica-Bold").text("RESUMO DA MELHORIA");
    doc.fontSize(11).font("Helvetica").text(resumoClean);
    doc.moveDown();
    doc.fontSize(14).font("Helvetica-Bold").text("INFORMACOES DO PROJETO");
    doc.fontSize(11).font("Helvetica");
    doc.text(`PROJETO: ${PROJETO_NOME} V15.2 MOTOR CLINICO`);
    doc.text("STACK: REACT + TYPESCRIPT + EXPRESS + POSTGRESQL + DRIZZLE ORM");
    doc.text("AMBIENTE: REPLIT");
    doc.text("BRANCH GITHUB: REPLIT-AGENT");
    doc.moveDown();
    doc.fontSize(14).font("Helvetica-Bold").text("MODULOS PRINCIPAIS");
    doc.fontSize(11).font("Helvetica");
    doc.text("- ARTIFACTS/CLINICA-MOTOR - FRONTEND REACT");
    doc.text("- ARTIFACTS/API-SERVER - BACKEND EXPRESS API");
    doc.text("- LIB/DB - SCHEMA POSTGRESQL (DRIZZLE ORM)");
    doc.moveDown();
    doc.fontSize(14).font("Helvetica-Bold").text("ULTIMOS 20 COMMITS");
    doc.fontSize(9).font("Courier");
    for (const line of gitLog.split("\n").slice(0, 20)) {
      doc.text(line);
    }
    doc.moveDown();
    doc.fontSize(8).font("Helvetica").text("BACKUP AUTOMATICO GERADO VIA MOTOR CLINICO PADCOM V15.2", { align: "center" });
    doc.end();
  });
}

async function uploadSmallFile(
  connectors: ReplitConnectors,
  fileName: string,
  content: Buffer | string,
  mimeType: string
): Promise<any> {
  const boundary = "----BackupBoundary" + Date.now();
  const metadata = JSON.stringify({ name: fileName, parents: [DRIVE_FOLDER_ID] });
  const fileBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf-8");

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const response = await connectors.proxy("google-drive", "/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Drive upload falhou (${response.status}):`, errorText.slice(0, 300));
    throw new Error(`Upload falhou com status ${response.status}`);
  }

  const text = await response.text();
  const parsed = JSON.parse(text);
  if (!parsed.id || !parsed.name) {
    console.error("Drive retornou resposta incompleta:", text.slice(0, 300));
    throw new Error("Upload retornou resposta incompleta do Drive");
  }
  return parsed;
}

async function uploadAsGoogleDoc(
  connectors: ReplitConnectors,
  fileName: string,
  plainTextContent: string
): Promise<any> {
  const boundary = "----BackupBoundary" + Date.now();
  const metadata = JSON.stringify({
    name: fileName,
    parents: [DRIVE_FOLDER_ID],
    mimeType: "application/vnd.google-apps.document",
  });
  const textBuffer = Buffer.from(plainTextContent, "utf-8");

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: text/plain\r\n\r\n`),
    textBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const response = await connectors.proxy("google-drive", "/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Drive Google Doc upload falhou (${response.status}):`, errorText.slice(0, 300));
    throw new Error(`Google Doc upload falhou com status ${response.status}`);
  }

  const text = await response.text();
  const parsed = JSON.parse(text);
  if (!parsed.id || !parsed.name) {
    console.error("Drive retornou resposta incompleta:", text.slice(0, 300));
    throw new Error("Upload retornou resposta incompleta do Drive");
  }
  return parsed;
}

async function deleteFileFromDrive(connectors: ReplitConnectors, fileId: string): Promise<void> {
  const response = await connectors.proxy("google-drive", `/drive/v3/files/${fileId}`, {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 204) {
    console.error(`Falha ao deletar arquivo ${fileId}: status ${response.status}`);
  }
}

router.post("/backup-drive", async (req, res) => {
  try {
    const { resumo } = req.body;
    if (!resumo || typeof resumo !== "string" || resumo.trim().length < 5) {
      return res.status(400).json({ erro: "Informe um resumo da melhoria (minimo 5 caracteres)" });
    }

    const connectors = new ReplitConnectors();
    const { data, hora } = getTimestamp();
    const resumoClean = sanitizeFileName(resumo.trim()).slice(0, 60);
    const baseFileName = `CODIGO REPLIT ${PROJETO_NOME} ${data} ${hora} ${resumoClean}`;
    const resultados: any[] = [];

    const plainText = generatePlainTextContent(resumo.trim());

    const gdocResult = await uploadAsGoogleDoc(connectors, baseFileName, plainText);
    resultados.push({ tipo: "GOOGLE DOC", id: gdocResult.id, nome: gdocResult.name });

    const pdfBuffer = await generatePdfBuffer(resumo.trim());
    const pdfResult = await uploadSmallFile(connectors, `${baseFileName}.pdf`, pdfBuffer, "application/pdf");
    resultados.push({ tipo: "PDF", id: pdfResult.id, nome: pdfResult.name });

    const txtResult = await uploadSmallFile(connectors, `${baseFileName}.txt`, plainText, "text/plain");
    resultados.push({ tipo: "TXT", id: txtResult.id, nome: txtResult.name });

    res.json({
      sucesso: true,
      mensagem: "Backup enviado com sucesso para Google Drive",
      pasta: `https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}`,
      arquivos: resultados,
    });
  } catch (err: any) {
    console.error("Erro backup drive:", err);
    res.status(500).json({ erro: "Erro interno ao fazer backup" });
  }
});

router.get("/backup-drive/status", async (_req, res) => {
  try {
    const connectors = new ReplitConnectors();
    const response = await connectors.proxy(
      "google-drive",
      `/drive/v3/files?q='${DRIVE_FOLDER_ID}'+in+parents&orderBy=createdTime+desc&pageSize=20&fields=files(id,name,createdTime,size,mimeType)`,
      { method: "GET" }
    );
    const data = await response.json();
    res.json({
      pasta: `https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}`,
      ultimosBackups: data.files || [],
    });
  } catch (err: any) {
    console.error("Erro status backup:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

router.delete("/backup-drive/limpar", async (_req, res) => {
  try {
    const connectors = new ReplitConnectors();
    const response = await connectors.proxy(
      "google-drive",
      `/drive/v3/files?q='${DRIVE_FOLDER_ID}'+in+parents&pageSize=100&fields=files(id,name)`,
      { method: "GET" }
    );
    const data = await response.json();
    const files = data.files || [];

    let deletados = 0;
    for (const file of files) {
      await deleteFileFromDrive(connectors, file.id);
      deletados++;
    }

    res.json({
      sucesso: true,
      mensagem: `${deletados} arquivo(s) removido(s) da pasta`,
    });
  } catch (err: any) {
    console.error("Erro limpar backup:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

export default router;
