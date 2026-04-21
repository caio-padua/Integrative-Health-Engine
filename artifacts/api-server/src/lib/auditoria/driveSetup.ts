/**
 * SETUP do Drive PAWARDS — GESTAO CLINICA + AUDITORIA
 *
 * Idempotente. Roda 1x para preparar a estrutura, depois pode ser
 * reexecutado sem efeito colateral. Persiste os file_id em drive_anchors.
 *
 * Hierarquia criada:
 *   PAWARDS/
 *     GESTAO CLINICA/                    (renomeada de SISTEMAS CLINICO se existir)
 *       Empresas/
 *       AUDITORIA/
 *         AUDITORIA - DASHBOARD          (planilha mestre)
 *         AUDITORIA - ATIVA              (planilha das ultimas 48h)
 *         AUDITORIA - LEGADO             (historico)
 */
import { getDriveClient } from "../google-drive";
import { pool } from "@workspace/db";
import { google } from "googleapis";
import { getAccessToken } from "../google-drive";

async function findChildByName(drive: any, name: string, parentId: string): Promise<{id: string} | null> {
  const q = `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed=false`;
  const r = await drive.files.list({ q, fields: "files(id,name,mimeType)", pageSize: 5 });
  return r.data.files?.[0] || null;
}

async function ensureFolder(drive: any, name: string, parentId?: string): Promise<string> {
  if (parentId) {
    const existing = await findChildByName(drive, name, parentId);
    if (existing) return existing.id;
  }
  const r = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    },
    fields: "id",
  });
  return r.data.id!;
}

async function saveAnchor(chave: string, fileId: string, observacao?: string) {
  const url = `https://drive.google.com/drive/folders/${fileId}`;
  await pool.query(
    `INSERT INTO drive_anchors (chave, drive_file_id, drive_url, observacao, atualizado_em)
     VALUES ($1,$2,$3,$4, now())
     ON CONFLICT (chave) DO UPDATE
       SET drive_file_id=EXCLUDED.drive_file_id, drive_url=EXCLUDED.drive_url,
           observacao=COALESCE(EXCLUDED.observacao, drive_anchors.observacao),
           atualizado_em=now()`,
    [chave, fileId, url, observacao || null]
  );
}

async function findFolderByPath(drive: any, segments: string[]): Promise<string | null> {
  let parent = "root";
  for (const seg of segments) {
    const found = await findChildByName(drive, seg, parent);
    if (!found) return null;
    parent = found.id;
  }
  return parent;
}

/**
 * Roda o setup completo. Retorna o mapa de anchors criados.
 */
export async function setupDriveAuditoria(): Promise<Record<string,string>> {
  const drive = await getDriveClient();
  const map: Record<string,string> = {};

  // 1) Garante PAWARDS na raiz
  const pawardsId = await ensureFolder(drive, "PAWARDS");
  map.PAWARDS_ROOT = pawardsId;
  await saveAnchor("PAWARDS_ROOT", pawardsId);

  // 2) Renomeia SISTEMAS CLINICO -> GESTAO CLINICA se existir
  const sistemas = await findChildByName(drive, "SISTEMAS CLINICO", pawardsId);
  if (sistemas) {
    await drive.files.update({
      fileId: sistemas.id,
      requestBody: { name: "GESTAO CLINICA" },
    });
  }
  // Garante GESTAO CLINICA (cria se nao existia)
  const gestaoId = await ensureFolder(drive, "GESTAO CLINICA", pawardsId);
  map.GESTAO_CLINICA_ROOT = gestaoId;
  await saveAnchor("GESTAO_CLINICA_ROOT", gestaoId);

  // 3) Garante Empresas
  const empresasId = await ensureFolder(drive, "Empresas", gestaoId);
  map.EMPRESAS_ROOT = empresasId;
  await saveAnchor("EMPRESAS_ROOT", empresasId);

  // 4) Garante AUDITORIA + 3 irmas
  const auditoriaId = await ensureFolder(drive, "AUDITORIA", gestaoId);
  map.AUDITORIA_ROOT = auditoriaId;
  await saveAnchor("AUDITORIA_ROOT", auditoriaId);

  for (const nome of ["AUDITORIA - DASHBOARD", "AUDITORIA - ATIVA", "AUDITORIA - LEGADO"]) {
    const id = await ensureFolder(drive, nome, auditoriaId);
    const chave = nome.replace(/[^A-Z]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
    map[chave] = id;
    await saveAnchor(chave, id, `Pasta irma de auditoria: ${nome}`);
  }

  return map;
}

/**
 * Cria a planilha AA.MM.DD - AUDITORIA dentro de AUDITORIA - ATIVA
 * com 3 abas (EVENTOS, DASHBOARD, CONFIG) e cabeçalhos no padrao Pawards.
 */
export async function criarPlanilhaAuditoriaAtiva(): Promise<{spreadsheetId: string; url: string;}> {
  const access = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: access });
  const sheets = google.sheets({ version: "v4", auth: oauth2Client });
  const drive  = await getDriveClient();

  // Garante anchors
  const anchors = await pool.query(`SELECT chave, drive_file_id FROM drive_anchors WHERE chave='AUDITORIA_ATIVA' LIMIT 1`);
  if (anchors.rowCount === 0) {
    throw new Error("Anchor AUDITORIA_ATIVA nao existe. Rode setupDriveAuditoria() primeiro.");
  }
  const ativaId = anchors.rows[0].drive_file_id;

  const today = new Date();
  const yy = String(today.getFullYear()).slice(2);
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const titulo = `${yy}.${mm}.${dd} - AUDITORIA`;

  // IDEMPOTENCIA: se ja existe planilha do dia em ATIVA, devolve ela
  const existente = await findChildByName(drive, titulo, ativaId);
  if (existente) {
    return {
      spreadsheetId: existente.id,
      url: `https://docs.google.com/spreadsheets/d/${existente.id}`,
    };
  }

  // Cria planilha
  const created = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: titulo },
      sheets: [
        { properties: { title: "EVENTOS" } },
        { properties: { title: "DASHBOARD" } },
        { properties: { title: "CONFIG" } },
      ],
    },
  });
  const spreadsheetId = created.data.spreadsheetId!;

  // Move pra pasta AUDITORIA - ATIVA
  const file = await drive.files.get({ fileId: spreadsheetId, fields: "parents" });
  const prevParents = (file.data.parents || []).join(",");
  await drive.files.update({
    fileId: spreadsheetId,
    addParents: ativaId,
    removeParents: prevParents,
    fields: "id, parents",
  });

  // Cabecalhos EVENTOS
  const cabEventos = [[
    "DATA HORA","TIMESTAMP","QUEM","EMAIL","ACAO","EMPRESA","CNPJ",
    "PACIENTE","CPF","CATEGORIA","PASTA","ARQUIVO","TIPO","TAMANHO",
    "STATUS","SEVERIDADE","MENSAGEM HUMANO","DETALHE TECNICO",
    "SINCRONIZADO PAWARDS","ID PAWARDS","LINK DRIVE","EVENT ID"
  ]];
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "EVENTOS!A1",
    valueInputOption: "RAW",
    requestBody: { values: cabEventos },
  });

  // Cabecalhos DASHBOARD (resumos)
  const cabDashboard = [[
    "INDICADOR","VALOR","COMPARATIVO ONTEM","TENDENCIA","ULTIMO UPDATE"
  ]];
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "DASHBOARD!A1",
    valueInputOption: "RAW",
    requestBody: { values: cabDashboard },
  });

  // Cabecalhos CONFIG
  const cabConfig = [[
    "CHAVE","VALOR","DESCRICAO","ATUALIZADO EM"
  ]];
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "CONFIG!A1",
    valueInputOption: "RAW",
    requestBody: { values: cabConfig },
  });

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
  await saveAnchor("PLANILHA_AUDITORIA_ATIVA", spreadsheetId, `Planilha ativa: ${titulo}`);

  return { spreadsheetId, url };
}
