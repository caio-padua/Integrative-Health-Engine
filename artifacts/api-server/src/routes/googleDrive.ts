import { Router } from "express";
import { db } from "@workspace/db";
import { pacientesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  getOrCreateClientFolder,
  uploadToClientSubfolder,
  sandboxCadastro,
  shareWithPatientAsViewer,
  listClientFiles,
  listSubfolderContents,
  formatFileName,
  getDriveClient,
  escapeDriveQuery,
  CLIENT_SUBFOLDERS,
  type ClientSubfolder,
} from "../lib/google-drive.js";

const router = Router();

router.post("/google-drive/client-folder/:pacienteId", async (req, res) => {
  try {
    const [paciente] = await db.select().from(pacientesTable).where(eq(pacientesTable.id, Number(req.params.pacienteId)));
    if (!paciente) {
      res.status(404).json({ error: "Paciente nao encontrado" });
      return;
    }

    const result = await getOrCreateClientFolder(paciente.nome, paciente.cpf || 'SEM-CPF');

    await db.update(pacientesTable).set({
      googleDriveFolderId: result.folderId,
    }).where(eq(pacientesTable.id, paciente.id));

    res.json({
      success: true,
      folderId: result.folderId,
      folderUrl: result.folderUrl,
      paciente: paciente.nome,
      subfolders: Object.keys(result.subfolders),
      subfoldersCount: Object.keys(result.subfolders).length,
    });
  } catch (err: any) {
    console.error("[GoogleDrive] client-folder error:", err.message);
    res.status(500).json({ error: "Erro ao criar pasta do paciente" });
  }
});

router.post("/google-drive/upload/:pacienteId/:subfolder", async (req, res) => {
  try {
    const subfolder = req.params.subfolder.toUpperCase() as ClientSubfolder;
    if (!CLIENT_SUBFOLDERS.includes(subfolder as any)) {
      res.status(400).json({
        error: `Subpasta invalida. Opcoes: ${CLIENT_SUBFOLDERS.join(', ')}`,
      });
      return;
    }

    const [paciente] = await db.select().from(pacientesTable).where(eq(pacientesTable.id, Number(req.params.pacienteId)));
    if (!paciente) {
      res.status(404).json({ error: "Paciente nao encontrado" });
      return;
    }

    let folderId = paciente.googleDriveFolderId;
    if (!folderId) {
      const folder = await getOrCreateClientFolder(paciente.nome, paciente.cpf || 'SEM-CPF');
      folderId = folder.folderId;
      await db.update(pacientesTable).set({ googleDriveFolderId: folderId }).where(eq(pacientesTable.id, paciente.id));
    }

    const { content, mimeType, customFileName, tipo, extra } = req.body;
    if (!content) {
      res.status(400).json({ error: "content (base64) obrigatorio" });
      return;
    }

    let fileName: string;
    if (customFileName) {
      fileName = customFileName;
    } else {
      const tipoDoc = tipo || subfolder;
      fileName = formatFileName(new Date(), tipoDoc, paciente.nome, extra) + '.pdf';
    }

    if (subfolder === 'CADASTRO') {
      const { movedCount } = await sandboxCadastro(folderId);
      if (movedCount > 0) {
        console.log(`[Drive] Moved ${movedCount} old cadastro(s) to CADASTROS ANTIGOS`);
      }
    }

    const result = await uploadToClientSubfolder({
      clientFolderId: folderId,
      subfolder,
      fileName,
      mimeType: mimeType || 'application/pdf',
      content: Buffer.from(content, 'base64'),
    });

    res.json({
      success: true,
      fileId: result.fileId,
      fileUrl: result.fileUrl,
      fileName,
      subfolder,
      paciente: paciente.nome,
    });
  } catch (err: any) {
    console.error("[GoogleDrive] upload error:", err.message);
    res.status(500).json({ error: "Erro ao fazer upload" });
  }
});

router.get("/google-drive/client-files/:pacienteId", async (req, res) => {
  try {
    const [paciente] = await db.select().from(pacientesTable).where(eq(pacientesTable.id, Number(req.params.pacienteId)));
    if (!paciente) {
      res.status(404).json({ error: "Paciente nao encontrado" });
      return;
    }

    if (!paciente.googleDriveFolderId) {
      res.json({ files: [], message: "Pasta do paciente nao criada ainda" });
      return;
    }

    const { subfolder } = req.query;
    let files;
    if (subfolder && CLIENT_SUBFOLDERS.includes(String(subfolder).toUpperCase() as any)) {
      files = await listSubfolderContents(paciente.googleDriveFolderId, String(subfolder).toUpperCase() as ClientSubfolder);
    } else {
      files = await listClientFiles(paciente.googleDriveFolderId);
    }

    res.json({ files, paciente: paciente.nome, subfolder: subfolder || 'ROOT' });
  } catch (err: any) {
    console.error("[GoogleDrive] list-files error:", err.message);
    res.status(500).json({ error: "Erro ao listar arquivos" });
  }
});

router.post("/google-drive/share/:pacienteId", async (req, res) => {
  try {
    const [paciente] = await db.select().from(pacientesTable).where(eq(pacientesTable.id, Number(req.params.pacienteId)));
    if (!paciente) {
      res.status(404).json({ error: "Paciente nao encontrado" });
      return;
    }

    if (!paciente.googleDriveFolderId) {
      res.status(400).json({ error: "Pasta do paciente nao criada ainda" });
      return;
    }

    const email = req.body.email || paciente.email;
    if (!email) {
      res.status(400).json({ error: "Email do paciente nao encontrado. Envie 'email' no body." });
      return;
    }

    const result = await shareWithPatientAsViewer(paciente.googleDriveFolderId, email);

    res.json({
      success: true,
      permissionId: result.permissionId,
      sharedWith: email,
      role: 'viewer',
      paciente: paciente.nome,
      folderUrl: `https://drive.google.com/drive/folders/${paciente.googleDriveFolderId}`,
    });
  } catch (err: any) {
    console.error("[GoogleDrive] share error:", err.message);
    res.status(500).json({ error: "Erro ao compartilhar pasta" });
  }
});

router.post("/google-drive/sandbox-cadastro/:pacienteId", async (req, res) => {
  try {
    const [paciente] = await db.select().from(pacientesTable).where(eq(pacientesTable.id, Number(req.params.pacienteId)));
    if (!paciente || !paciente.googleDriveFolderId) {
      res.status(404).json({ error: "Paciente ou pasta nao encontrada" });
      return;
    }

    const result = await sandboxCadastro(paciente.googleDriveFolderId);

    res.json({
      success: true,
      movedCount: result.movedCount,
      message: `${result.movedCount} cadastro(s) antigo(s) movido(s) para CADASTROS ANTIGOS`,
    });
  } catch (err: any) {
    console.error("[GoogleDrive] sandbox error:", err.message);
    res.status(500).json({ error: "Erro ao fazer sandbox do cadastro" });
  }
});

router.get("/google-drive/subfolders", (_req, res) => {
  res.json({ subfolders: CLIENT_SUBFOLDERS });
});

router.get("/google-drive/search", async (req, res) => {
  try {
    const { name, folderId, mimeType } = req.query;
    const drive = await getDriveClient();
    const conditions: string[] = ['trashed=false'];
    if (name) conditions.push(`name contains '${escapeDriveQuery(String(name))}'`);
    if (folderId) conditions.push(`'${String(folderId)}' in parents`);
    if (mimeType) conditions.push(`mimeType='${String(mimeType)}'`);
    const result = await drive.files.list({
      q: conditions.join(' and '),
      fields: 'files(id, name, mimeType, modifiedTime, size, webViewLink)',
      spaces: 'drive',
      pageSize: 100,
      orderBy: 'name',
    });
    res.json(result.data.files || []);
  } catch (err: any) {
    console.error('[Drive] search error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/google-drive/export-text/:fileId", async (req, res) => {
  try {
    const drive = await getDriveClient();
    const fileId = req.params.fileId;
    const meta = await drive.files.get({ fileId, fields: 'mimeType,name' });
    const mime = meta.data.mimeType || '';
    let text = '';
    const isNativeGoogle = mime.includes('google-apps.');
    if (isNativeGoogle && mime.includes('spreadsheet')) {
      const exp = await drive.files.export({ fileId, mimeType: 'text/csv' });
      text = String(exp.data);
    } else if (isNativeGoogle) {
      const exp = await drive.files.export({ fileId, mimeType: 'text/plain' });
      text = String(exp.data);
    } else {
      text = `[Arquivo binario: ${meta.data.name}] — mimeType: ${mime} — Nao e possivel exportar como texto. Use webViewLink para visualizar.`;
    }
    res.json({ name: meta.data.name, mimeType: mime, text });
  } catch (err: any) {
    console.error('[Drive] export error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
