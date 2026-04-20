import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getDriveClient, escapeDriveQuery } from "../lib/google-drive.js";

const router: IRouter = Router();

const PAWARDS_ROOT = "PAWARDS";
const SISTEMAS_CLINICO = "Sistemas Clinico";
const EMPRESAS = "Empresas";
const SUBPASTAS = ["Clientes", "Financeiro"] as const;
const SUBSUB_FINANCEIRO = ["Recorrentes", "Avulsos", "Faturas Mensais"] as const;

async function findOrCreate(drive: any, name: string, parentId?: string): Promise<{ id: string; created: boolean }> {
  const safe = escapeDriveQuery(name);
  const q = parentId
    ? `name='${safe}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
    : `name='${safe}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const list = await drive.files.list({ q, fields: "files(id,name)", spaces: "drive" });
  if (list.data.files && list.data.files.length > 0) return { id: list.data.files[0].id, created: false };
  const meta: any = { name, mimeType: "application/vnd.google-apps.folder" };
  if (parentId) meta.parents = [parentId];
  const created = await drive.files.create({ requestBody: meta, fields: "id" });
  return { id: created.data.id, created: true };
}

// Provisiona estrutura PAWARDS completa pra TODAS as 10 clínicas (ou só uma específica)
router.post("/drive-pawards/provisionar", async (req, res): Promise<void> => {
  const rawId = req.body?.unidadeId;
  const parsed = rawId !== undefined && rawId !== null && rawId !== "" ? Number(rawId) : null;
  if (rawId !== undefined && rawId !== null && rawId !== "" && !Number.isInteger(parsed)) {
    res.status(400).json({ error: "unidadeId invalido" });
    return;
  }
  const unidadeIdOnly = Number.isInteger(parsed) ? parsed : null;
  try {
    const drive = await getDriveClient();
    const root = await findOrCreate(drive, PAWARDS_ROOT);
    const sistemasClinico = await findOrCreate(drive, SISTEMAS_CLINICO, root.id);
    const empresas = await findOrCreate(drive, EMPRESAS, sistemasClinico.id);

    const unidades = await db.execute(sql`
      SELECT id, nome FROM unidades
      WHERE id NOT BETWEEN 1 AND 7
      ${unidadeIdOnly ? sql`AND id = ${unidadeIdOnly}` : sql``}
      ORDER BY id
    `);

    const provisionadas: any[] = [];
    for (const u of unidades.rows as any[]) {
      const empresa = await findOrCreate(drive, u.nome, empresas.id);
      const clientes = await findOrCreate(drive, "Clientes", empresa.id);
      const financeiro = await findOrCreate(drive, "Financeiro", empresa.id);
      const recorrentes = await findOrCreate(drive, "Recorrentes", financeiro.id);
      for (const sub of SUBSUB_FINANCEIRO.slice(1)) {
        await findOrCreate(drive, sub, financeiro.id);
      }

      await db.execute(sql`
        INSERT INTO clinica_drive_estrutura (unidade_id, pasta_raiz_id, pasta_clientes_id, pasta_financeiro_id, pasta_recorrentes_id, url_raiz, criada_por)
        VALUES (${u.id}, ${empresa.id}, ${clientes.id}, ${financeiro.id}, ${recorrentes.id},
                ${"https://drive.google.com/drive/folders/" + empresa.id}, 'caio_provisionar')
        ON CONFLICT (unidade_id) DO UPDATE SET
          pasta_raiz_id = EXCLUDED.pasta_raiz_id,
          pasta_clientes_id = EXCLUDED.pasta_clientes_id,
          pasta_financeiro_id = EXCLUDED.pasta_financeiro_id,
          pasta_recorrentes_id = EXCLUDED.pasta_recorrentes_id,
          url_raiz = EXCLUDED.url_raiz
      `);

      provisionadas.push({
        unidadeId: u.id,
        nome: u.nome,
        empresaFolderId: empresa.id,
        clientesFolderId: clientes.id,
        financeiroFolderId: financeiro.id,
        recorrentesFolderId: recorrentes.id,
        url: `https://drive.google.com/drive/folders/${empresa.id}`,
      });
    }

    res.json({
      success: true,
      pawardsRootId: root.id,
      pawardsRootUrl: `https://drive.google.com/drive/folders/${root.id}`,
      empresasContainerId: empresas.id,
      provisionadas,
      total: provisionadas.length,
    });
  } catch (err: any) {
    console.error("[DrivePawards] provisionar error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/drive-pawards/estrutura", async (_req, res): Promise<void> => {
  try {
    const result = await db.execute(sql`
      SELECT
        cde.unidade_id,
        u.nome AS unidade_nome,
        u.cor AS unidade_cor,
        cde.pasta_raiz_id,
        cde.pasta_clientes_id,
        cde.pasta_financeiro_id,
        cde.pasta_recorrentes_id,
        cde.url_raiz,
        cde.criada_em
      FROM clinica_drive_estrutura cde
      JOIN unidades u ON u.id = cde.unidade_id
      WHERE u.id NOT BETWEEN 1 AND 7
      ORDER BY cde.unidade_id
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
