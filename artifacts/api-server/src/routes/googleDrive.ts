import { Router } from "express";
import { db } from "@workspace/db";
import { pacientesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  getOrCreateClientFolder,
  uploadFileToDrive,
  listClientFiles,
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
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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

    const files = await listClientFiles(paciente.googleDriveFolderId);
    res.json({ files, paciente: paciente.nome });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/google-drive/upload/:pacienteId", async (req, res) => {
  try {
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

    const { fileName, mimeType, content } = req.body;
    if (!fileName || !content) {
      res.status(400).json({ error: "fileName e content obrigatorios" });
      return;
    }

    const result = await uploadFileToDrive(
      folderId,
      fileName,
      mimeType || 'application/pdf',
      Buffer.from(content, 'base64')
    );

    res.json({
      success: true,
      fileId: result.fileId,
      fileUrl: result.fileUrl,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
