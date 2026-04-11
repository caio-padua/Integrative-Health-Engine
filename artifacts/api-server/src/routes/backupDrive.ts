import { Router } from "express";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const router = Router();

const DRIVE_FOLDER_ID = "1LfolNE3KgJSrnKwxp0WNXTRIRvSS_i7f";
const PROJETO_NOME = "PADCOM";
const WORKSPACE = "/home/runner/workspace";

const ARQUIVOS_CHAVE = [
  "lib/db/src/schema/index.ts",
  "lib/db/src/schema/usuarios.ts",
  "lib/db/src/schema/pacientes.ts",
  "lib/db/src/schema/anamneses.ts",
  "lib/db/src/schema/examesV4.ts",
  "lib/db/src/schema/substancias.ts",
  "lib/db/src/schema/itensTerapeuticos.ts",
  "lib/db/src/schema/catalogo.ts",
  "lib/db/src/schema/protocolos.ts",
  "lib/db/src/schema/tratamentos.ts",
  "lib/db/src/schema/sugestoes.ts",
  "lib/db/src/schema/regrasMotor.ts",
  "lib/db/src/schema/blocos.ts",
  "lib/db/src/schema/alertasNotificacao.ts",
  "lib/db/src/schema/codigosSemanticos.ts",
  "lib/db/src/schema/codigosValidacao.ts",
  "lib/db/src/schema/soberaniaClinical.ts",
  "lib/db/src/schema/cavaloClinical.ts",
  "lib/db/src/schema/auditoriaCascata.ts",
  "lib/db/src/schema/monitoramentoPaciente.ts",
  "lib/db/src/schema/taskCards.ts",
  "lib/db/src/schema/filas.ts",
  "lib/db/src/schema/fluxos.ts",
  "lib/db/src/schema/sessoes.ts",
  "lib/db/src/schema/unidades.ts",
  "lib/db/src/schema/pagamentos.ts",
  "lib/db/src/schema/pedidosExame.ts",
  "lib/db/src/schema/estoque.ts",
  "lib/db/src/schema/followups.ts",
  "lib/db/src/schema/avaliacaoEnfermagem.ts",
  "lib/db/src/schema/avaliacoesCliente.ts",
  "lib/db/src/schema/questionarioPaciente.ts",
  "lib/db/src/schema/ras.ts",
  "lib/db/src/schema/rasEvolutivo.ts",
  "artifacts/api-server/src/routes/index.ts",
  "artifacts/api-server/src/routes/motorClinico.ts",
  "artifacts/api-server/src/routes/anamnese.ts",
  "artifacts/api-server/src/routes/pacientes.ts",
  "artifacts/api-server/src/routes/usuarios.ts",
  "artifacts/api-server/src/routes/examesInteligente.ts",
  "artifacts/api-server/src/routes/direcaoExame.ts",
  "artifacts/api-server/src/routes/formulaBlend.ts",
  "artifacts/api-server/src/routes/catalogo.ts",
  "artifacts/api-server/src/routes/protocolos.ts",
  "artifacts/api-server/src/routes/substancias.ts",
  "artifacts/api-server/src/routes/blocos.ts",
  "artifacts/api-server/src/routes/alertas.ts",
  "artifacts/api-server/src/routes/alertaPaciente.ts",
  "artifacts/api-server/src/routes/monitoramentoPaciente.ts",
  "artifacts/api-server/src/routes/portalCliente.ts",
  "artifacts/api-server/src/routes/dashboard.ts",
  "artifacts/api-server/src/routes/governanca.ts",
  "artifacts/api-server/src/routes/soberania.ts",
  "artifacts/api-server/src/routes/cavaloClinical.ts",
  "artifacts/api-server/src/routes/auditoriaCascata.ts",
  "artifacts/api-server/src/routes/codigosSemanticos.ts",
  "artifacts/api-server/src/routes/taskCards.ts",
  "artifacts/api-server/src/routes/filas.ts",
  "artifacts/api-server/src/routes/fluxos.ts",
  "artifacts/api-server/src/routes/sessoes.ts",
  "artifacts/api-server/src/routes/financeiro.ts",
  "artifacts/api-server/src/routes/unidades.ts",
  "artifacts/api-server/src/routes/pedidosExame.ts",
  "artifacts/api-server/src/routes/avaliacaoEnfermagem.ts",
  "artifacts/api-server/src/routes/avaliacoesCliente.ts",
  "artifacts/api-server/src/routes/questionarioPaciente.ts",
  "artifacts/api-server/src/routes/rasRoute.ts",
  "artifacts/api-server/src/routes/rasEvolutivo.ts",
  "artifacts/api-server/src/routes/followup.ts",
  "artifacts/api-server/src/routes/googleCalendar.ts",
  "artifacts/api-server/src/routes/googleDrive.ts",
  "artifacts/api-server/src/routes/googleGmail.ts",
  "artifacts/api-server/src/routes/backupDrive.ts",
  "artifacts/api-server/src/routes/health.ts",
  "artifacts/api-server/src/index.ts",
  "artifacts/api-server/build.mjs",
  "artifacts/clinica-motor/src/pages/dashboard.tsx",
  "artifacts/clinica-motor/src/pages/login.tsx",
  "artifacts/clinica-motor/src/pages/configuracoes/index.tsx",
  "artifacts/clinica-motor/src/pages/pacientes/index.tsx",
  "artifacts/clinica-motor/src/pages/pacientes/[id].tsx",
  "artifacts/clinica-motor/src/pages/pacientes/monitoramento.tsx",
  "artifacts/clinica-motor/src/pages/pacientes/questionario.tsx",
  "artifacts/clinica-motor/src/pages/portal/index.tsx",
  "artifacts/clinica-motor/src/pages/anamnese/index.tsx",
  "artifacts/clinica-motor/src/pages/anamnese/nova.tsx",
  "artifacts/clinica-motor/src/pages/anamnese/[id].tsx",
  "artifacts/clinica-motor/src/pages/catalogo/index.tsx",
  "artifacts/clinica-motor/src/pages/substancias/index.tsx",
  "artifacts/clinica-motor/src/pages/itens-terapeuticos/index.tsx",
  "artifacts/clinica-motor/src/pages/protocolos/index.tsx",
  "artifacts/clinica-motor/src/pages/ras/index.tsx",
  "artifacts/clinica-motor/src/pages/ras-evolutivo/index.tsx",
  "artifacts/clinica-motor/src/pages/governanca/index.tsx",
  "artifacts/clinica-motor/src/pages/validacao/index.tsx",
  "artifacts/clinica-motor/src/pages/permissoes/index.tsx",
  "artifacts/clinica-motor/src/pages/task-cards/index.tsx",
  "artifacts/clinica-motor/src/pages/filas/index.tsx",
  "artifacts/clinica-motor/src/pages/fluxos/index.tsx",
  "artifacts/clinica-motor/src/pages/financeiro/index.tsx",
  "artifacts/clinica-motor/src/pages/unidades/index.tsx",
  "artifacts/clinica-motor/src/pages/estoque/index.tsx",
  "artifacts/clinica-motor/src/pages/pedidos-exame/index.tsx",
  "artifacts/clinica-motor/src/pages/codigos-validacao/index.tsx",
  "artifacts/clinica-motor/src/pages/codigos-semanticos/index.tsx",
  "artifacts/clinica-motor/src/pages/agenda/index.tsx",
  "artifacts/clinica-motor/src/pages/avaliacao-enfermagem/index.tsx",
  "artifacts/clinica-motor/src/pages/followup/index.tsx",
  "artifacts/clinica-motor/src/App.tsx",
  "artifacts/clinica-motor/src/main.tsx",
  "artifacts/clinica-motor/src/lib/auth.tsx",
  "artifacts/clinica-motor/vite.config.ts",
  "lib/db/drizzle.config.ts",
  "lib/db/package.json",
  "package.json",
  "replit.md",
];

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

function getDataHoje(): string {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yy}.${mm}.${dd}`;
}

async function getNextVersion(connectors: ReplitConnectors): Promise<string> {
  let maxVersion = 0;

  const mainResponse = await connectors.proxy(
    "google-drive",
    `/drive/v3/files?q='${DRIVE_FOLDER_ID}'+in+parents+and+trashed=false&pageSize=100&fields=files(name)`,
    { method: "GET" }
  );
  const mainData = await mainResponse.json();
  const allFiles = [...(mainData.files || [])];

  const subResponse = await connectors.proxy(
    "google-drive",
    `/drive/v3/files?q='${DRIVE_FOLDER_ID}'+in+parents+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id)`,
    { method: "GET" }
  );
  const subData = await subResponse.json();
  if (subData.files && subData.files.length > 0) {
    const subId = subData.files[0].id;
    const subFilesResponse = await connectors.proxy(
      "google-drive",
      `/drive/v3/files?q='${subId}'+in+parents+and+trashed=false&pageSize=200&fields=files(name)`,
      { method: "GET" }
    );
    const subFilesData = await subFilesResponse.json();
    allFiles.push(...(subFilesData.files || []));
  }

  const pattern = /V(\d+)/;
  for (const file of allFiles) {
    const match = file.name?.match(pattern);
    if (match) {
      const v = parseInt(match[1], 10);
      if (v > maxVersion) maxVersion = v;
    }
  }

  return `V${String(maxVersion + 1).padStart(2, "0")}`;
}

function getGitLog(): string {
  try {
    return execSync(
      'git log --oneline -20 --format="%h %s (%cr)"',
      { cwd: WORKSPACE, encoding: "utf-8" }
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

function readSourceFiles(): string {
  const sections: string[] = [];
  for (const relPath of ARQUIVOS_CHAVE) {
    const fullPath = path.join(WORKSPACE, relPath);
    try {
      if (!fs.existsSync(fullPath)) continue;
      const content = fs.readFileSync(fullPath, "utf-8");
      if (content.trim().length === 0) continue;
      sections.push(
        `\n${"=".repeat(80)}\nARQUIVO: ${relPath}\n${"=".repeat(80)}\n${content}`
      );
    } catch {
      continue;
    }
  }
  return sections.join("\n");
}

function generatePlainTextContent(resumo: string, dataHoje: string, versao: string): string {
  const gitLog = getGitLog();
  const fileTree = getFileTree();
  const resumoClean = sanitizeText(resumo);
  const sourceCode = readSourceFiles();

  return `CODIGO REPLIT ${PROJETO_NOME} ${dataHoje} ${versao}
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
INFORMACOES DO PROJETO
========================================
PROJETO: ${PROJETO_NOME} V15.2 MOTOR CLINICO
STACK: REACT + TYPESCRIPT + EXPRESS + POSTGRESQL + DRIZZLE ORM
AMBIENTE: REPLIT
BRANCH GITHUB: REPLIT-AGENT
LINK REPLIT: https://replit.com/@caioregister/Integrative-Health-Engine

========================================
MODULOS PRINCIPAIS
========================================
ARTIFACTS/CLINICA-MOTOR - FRONTEND REACT (MOTOR CLINICO)
ARTIFACTS/API-SERVER - BACKEND EXPRESS API
LIB/DB - SCHEMA POSTGRESQL (DRIZZLE ORM)

========================================
DESIGN SYSTEM
========================================
BORDER-RADIUS: 0PX (QUADRADO)
COR PRIMARIA: BLUE PASTEL HSL(210 45% 65%)
BACKGROUND: NAVY HSL(215 28% 9%)
SIDEBAR: BORDER-LEFT-2 PRIMARY
UI: TDAH-FRIENDLY COM SUB-DASHBOARDS (MACRO > DETAIL > MICRO)

========================================
USUARIOS DEMO (SENHA: SENHA123)
========================================
CAIO@CLINICA.COM - VALIDADOR_MESTRE / DIRETOR CLINICO
HELENA@CLINICA.COM - MEDICO_TECNICO
ANA@CLINICA.COM - ENFERMEIRA
CARLOS@CLINICA.COM - VALIDADOR_ENFERMEIRO

========================================
ARVORE DE ARQUIVOS DO PROJETO
========================================
${fileTree}

========================================
CODIGO-FONTE DOS ARQUIVOS PRINCIPAIS
========================================
${sourceCode}

========================================
BACKUP AUTOMATICO GERADO VIA MOTOR CLINICO PADCOM V15.2
`;
}

function generateMdContent(resumo: string, dataHoje: string, versao: string): string {
  const gitLog = getGitLog();
  const fileTree = getFileTree();
  const resumoClean = sanitizeText(resumo);
  const sourceCode = readSourceFiles();

  return `# ${dataHoje} ${versao} CODIGO REPLIT
## ${resumoClean}

### DATA/HORA DO BACKUP
${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}

### ULTIMOS 20 COMMITS
\`\`\`
${gitLog}
\`\`\`

### INFORMACOES DO PROJETO
- **PROJETO**: ${PROJETO_NOME} V15.2 MOTOR CLINICO
- **STACK**: REACT + TYPESCRIPT + EXPRESS + POSTGRESQL + DRIZZLE ORM
- **AMBIENTE**: REPLIT
- **BRANCH GITHUB**: REPLIT-AGENT
- **LINK REPLIT**: https://replit.com/@caioregister/Integrative-Health-Engine

### DESIGN SYSTEM
- **BORDER-RADIUS**: 0PX (QUADRADO)
- **COR PRIMARIA**: BLUE PASTEL HSL(210 45% 65%)
- **BACKGROUND**: NAVY HSL(215 28% 9%)
- **SIDEBAR**: BORDER-LEFT-2 PRIMARY
- **UI**: TDAH-FRIENDLY COM SUB-DASHBOARDS (MACRO > DETAIL > MICRO)

### USUARIOS DEMO (SENHA: SENHA123)
| EMAIL | PERFIL | PAPEL |
|-------|--------|-------|
| CAIO@CLINICA.COM | VALIDADOR_MESTRE | DIRETOR CLINICO |
| HELENA@CLINICA.COM | MEDICO_TECNICO | MEDICA |
| ANA@CLINICA.COM | ENFERMEIRA | ENFERMAGEM |
| CARLOS@CLINICA.COM | VALIDADOR_ENFERMEIRO | ENFERMEIRO VALIDADOR |

### MODULOS PRINCIPAIS
- **ARTIFACTS/CLINICA-MOTOR** - FRONTEND REACT (MOTOR CLINICO)
- **ARTIFACTS/API-SERVER** - BACKEND EXPRESS API
- **LIB/DB** - SCHEMA POSTGRESQL (DRIZZLE ORM)

### ARVORE DE ARQUIVOS DO PROJETO
\`\`\`
${fileTree}
\`\`\`

---

### CODIGO-FONTE DOS ARQUIVOS PRINCIPAIS

${formatSourceForMd(sourceCode)}

---
*BACKUP AUTOMATICO GERADO VIA MOTOR CLINICO PADCOM V15.2*
`;
}

function formatSourceForMd(sourceCode: string): string {
  const blocks = sourceCode.split(/={80}/);
  const result: string[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (block.startsWith("ARQUIVO:")) {
      const fileName = block.replace("ARQUIVO:", "").trim();
      const ext = fileName.split(".").pop() || "ts";
      const codeBlock = (blocks[i + 1] || "").trim();
      if (codeBlock) {
        result.push(`#### \`${fileName}\`\n\`\`\`${ext}\n${codeBlock}\n\`\`\``);
        i++;
      }
    }
  }
  return result.join("\n\n");
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

const SUBPASTA_ANTIGOS_NOME = "BANCO CODIGOS REPLIT (ANTIGOS)";

async function getOrCreateSubpastaAntigos(connectors: ReplitConnectors): Promise<string> {
  const searchResponse = await connectors.proxy(
    "google-drive",
    `/drive/v3/files?q='${DRIVE_FOLDER_ID}'+in+parents+and+name='${SUBPASTA_ANTIGOS_NOME}'+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name)`,
    { method: "GET" }
  );
  const searchData = await searchResponse.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  const createResponse = await connectors.proxy(
    "google-drive",
    "/drive/v3/files",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: SUBPASTA_ANTIGOS_NOME,
        mimeType: "application/vnd.google-apps.folder",
        parents: [DRIVE_FOLDER_ID],
      }),
    }
  );
  if (!createResponse.ok) {
    throw new Error(`Falha ao criar subpasta: status ${createResponse.status}`);
  }
  const created = await createResponse.json();
  console.log(`Subpasta criada: ${SUBPASTA_ANTIGOS_NOME} (${created.id})`);
  return created.id;
}

async function moveFilesToSubpasta(connectors: ReplitConnectors, subpastaId: string): Promise<number> {
  const listResponse = await connectors.proxy(
    "google-drive",
    `/drive/v3/files?q='${DRIVE_FOLDER_ID}'+in+parents+and+mimeType!='application/vnd.google-apps.folder'+and+trashed=false&pageSize=100&fields=files(id,name)`,
    { method: "GET" }
  );
  const listData = await listResponse.json();
  const files = listData.files || [];

  let movidos = 0;
  for (const file of files) {
    const moveResponse = await connectors.proxy(
      "google-drive",
      `/drive/v3/files/${file.id}?addParents=${subpastaId}&removeParents=${DRIVE_FOLDER_ID}`,
      { method: "PATCH" }
    );
    if (moveResponse.ok) {
      movidos++;
    } else {
      console.error(`Falha ao mover arquivo ${file.name} (${file.id}): status ${moveResponse.status}`);
    }
  }
  return movidos;
}

router.post("/backup-drive", async (req, res) => {
  try {
    const { resumo } = req.body;
    if (!resumo || typeof resumo !== "string" || resumo.trim().length < 5) {
      return res.status(400).json({ erro: "Informe um resumo da melhoria (minimo 5 caracteres)" });
    }

    const connectors = new ReplitConnectors();

    const versao = await getNextVersion(connectors);
    const dataHoje = getDataHoje();

    const subpastaId = await getOrCreateSubpastaAntigos(connectors);
    const movidos = await moveFilesToSubpasta(connectors, subpastaId);
    console.log(`${movidos} arquivo(s) antigo(s) movido(s) para subpasta`);

    const resumoClean = sanitizeFileName(resumo.trim()).slice(0, 60);
    const baseFileName = `${dataHoje} ${versao} CODIGO REPLIT ${resumoClean}`;
    const resultados: any[] = [];

    const plainText = generatePlainTextContent(resumo.trim(), dataHoje, versao);

    const gdocResult = await uploadAsGoogleDoc(connectors, baseFileName, plainText);
    resultados.push({ tipo: "GOOGLE DOC", id: gdocResult.id, nome: gdocResult.name });

    const txtResult = await uploadSmallFile(connectors, `${baseFileName}.txt`, plainText, "text/plain");
    resultados.push({ tipo: "TXT", id: txtResult.id, nome: txtResult.name });

    const mdContent = generateMdContent(resumo.trim(), dataHoje, versao);
    const mdResult = await uploadSmallFile(connectors, `${baseFileName}.md`, mdContent, "text/markdown");
    resultados.push({ tipo: "MD", id: mdResult.id, nome: mdResult.name });

    res.json({
      sucesso: true,
      mensagem: `Backup enviado! ${movidos > 0 ? `${movidos} arquivo(s) antigo(s) arquivado(s).` : "Nenhum backup anterior encontrado."}`,
      pasta: `https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}`,
      arquivos: resultados,
      arquivados: movidos,
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
      `/drive/v3/files?q='${DRIVE_FOLDER_ID}'+in+parents+and+mimeType!='application/vnd.google-apps.folder'+and+trashed=false&pageSize=100&fields=files(id,name)`,
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
      mensagem: `${deletados} arquivo(s) removido(s) da pasta (subpasta ANTIGOS preservada)`,
    });
  } catch (err: any) {
    console.error("Erro limpar backup:", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

export default router;
