import { Router } from "express";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { execSync } from "child_process";
import fs from "fs";
import PDFDocument from "pdfkit";

const router = Router();

const DRIVE_FOLDER_ID = "1LfolNE3KgJSrnKwxp0WNXTRIRvSS_i7f";
const PROJETO_NOME = "PADCOM V15.2 Motor Clinico";

function getTimestamp() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${yy}.${mm}.${dd} ${hh}.${min}`;
}

function getGitLog(): string {
  try {
    return execSync(
      'git log --oneline -20 --format="%h %s (%cr)"',
      { cwd: "/home/runner/workspace", encoding: "utf-8" }
    ).trim();
  } catch {
    return "Git log indisponivel";
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
    return "Arvore de arquivos indisponivel";
  }
}

function generateMdContent(resumo: string): string {
  const timestamp = getTimestamp();
  const gitLog = getGitLog();
  const fileTree = getFileTree();

  return `# ${timestamp} CODIGO REPLIT "${PROJETO_NOME}"

## Resumo da Melhoria
${resumo}

## Data/Hora do Backup
${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}

## Ultimos 20 Commits
\`\`\`
${gitLog}
\`\`\`

## Arvore de Arquivos do Projeto
\`\`\`
${fileTree}
\`\`\`

## Informacoes do Projeto
- **Projeto**: ${PROJETO_NOME}
- **Stack**: React + TypeScript + Express + PostgreSQL + Drizzle ORM
- **Ambiente**: Replit
- **Branch GitHub**: replit-agent

## Modulos Principais
- \`artifacts/clinica-motor\` — Frontend React (Motor Clinico)
- \`artifacts/api-server\` — Backend Express API
- \`lib/db\` — Schema PostgreSQL (Drizzle ORM)

---
*Backup automatico gerado via Motor Clinico PADCOM V15.2*
`;
}

async function generatePdfBuffer(resumo: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const timestamp = getTimestamp();
    const gitLog = getGitLog();

    doc.fontSize(18).font("Helvetica-Bold").text(`CODIGO REPLIT - ${PROJETO_NOME}`, { align: "center" });
    doc.moveDown();
    doc.fontSize(12).font("Helvetica").text(`Data: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`);
    doc.text(`Timestamp: ${timestamp}`);
    doc.moveDown();
    doc.fontSize(14).font("Helvetica-Bold").text("Resumo da Melhoria");
    doc.fontSize(11).font("Helvetica").text(resumo);
    doc.moveDown();
    doc.fontSize(14).font("Helvetica-Bold").text("Informacoes do Projeto");
    doc.fontSize(11).font("Helvetica");
    doc.text(`Projeto: ${PROJETO_NOME}`);
    doc.text("Stack: React + TypeScript + Express + PostgreSQL + Drizzle ORM");
    doc.text("Ambiente: Replit");
    doc.text("Branch GitHub: replit-agent");
    doc.moveDown();
    doc.fontSize(14).font("Helvetica-Bold").text("Modulos Principais");
    doc.fontSize(11).font("Helvetica");
    doc.text("- artifacts/clinica-motor — Frontend React (Motor Clinico)");
    doc.text("- artifacts/api-server — Backend Express API");
    doc.text("- lib/db — Schema PostgreSQL (Drizzle ORM)");
    doc.moveDown();
    doc.fontSize(14).font("Helvetica-Bold").text("Ultimos 20 Commits");
    doc.fontSize(9).font("Courier");
    for (const line of gitLog.split("\n").slice(0, 20)) {
      doc.text(line);
    }
    doc.moveDown();
    doc.fontSize(8).font("Helvetica").text("Backup automatico gerado via Motor Clinico PADCOM V15.2", { align: "center" });
    doc.end();
  });
}

function tarProject(): string {
  const tarPath = "/tmp/backup_codigo_replit.tar.gz";
  if (fs.existsSync(tarPath)) fs.unlinkSync(tarPath);
  execSync(
    `cd /home/runner/workspace && tar czf ${tarPath} --exclude='node_modules' --exclude='.git' --exclude='dist' --exclude='.local' --exclude='attached_assets' --exclude='.cache' .`,
    { timeout: 60000 }
  );
  return tarPath;
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

router.post("/backup-drive", async (req, res) => {
  try {
    const { resumo, incluirCodigo } = req.body;
    if (!resumo || typeof resumo !== "string" || resumo.trim().length < 5) {
      return res.status(400).json({ erro: "Informe um resumo da melhoria (minimo 5 caracteres)" });
    }

    const connectors = new ReplitConnectors();
    const timestamp = getTimestamp();
    const baseFileName = `${timestamp} CODIGO REPLIT ${PROJETO_NOME}`;
    const resumoShort = resumo.trim().slice(0, 60);
    const resultados: any[] = [];

    const mdContent = generateMdContent(resumo.trim());
    const mdResult = await uploadSmallFile(connectors, `${baseFileName} - ${resumoShort}.md`, mdContent, "text/markdown");
    resultados.push({ tipo: "MD", id: mdResult.id, nome: mdResult.name });

    const pdfBuffer = await generatePdfBuffer(resumo.trim());
    const pdfResult = await uploadSmallFile(connectors, `${baseFileName} - ${resumoShort}.pdf`, pdfBuffer, "application/pdf");
    resultados.push({ tipo: "PDF", id: pdfResult.id, nome: pdfResult.name });

    if (incluirCodigo === true) {
      const tarPath = tarProject();
      try {
        const fileSize = fs.statSync(tarPath).size;
        if (fileSize > 800 * 1024) {
          resultados.push({
            tipo: "TAR.GZ",
            aviso: `Arquivo muito grande (${(fileSize / 1024 / 1024).toFixed(1)}MB) para upload via proxy. Codigo disponivel no GitHub branch replit-agent.`,
          });
        } else {
          const tarBuffer = fs.readFileSync(tarPath);
          const tarResult = await uploadSmallFile(
            connectors,
            `${baseFileName} - CODIGO COMPLETO.tar.gz`,
            tarBuffer,
            "application/gzip"
          );
          resultados.push({ tipo: "TAR.GZ", id: tarResult.id, nome: tarResult.name });
        }
      } finally {
        if (fs.existsSync(tarPath)) fs.unlinkSync(tarPath);
      }
    }

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
      `/drive/v3/files?q='${DRIVE_FOLDER_ID}'+in+parents&orderBy=createdTime+desc&pageSize=10&fields=files(id,name,createdTime,size)`,
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

export default router;
