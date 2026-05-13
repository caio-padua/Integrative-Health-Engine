/**
 * Backfill Drive Wave Cadastro Pádua — 13/mai/2026
 *
 * 1. Lista filhos da pasta INSTITUTO PADUA (unidades.google_drive_folder_id)
 * 2. Renomeia "CLIENTES INTITUTO PADUA" → "CLIENTES INSTITUTO PADUA" (typo)
 * 3. Seta unidades.clientes_subfolder_id se vazio
 * 4. Cria pasta-raiz pra cada paciente Pádua via getOrCreatePacienteRootFolder
 *
 * Throttle 8 req/s pra ficar abaixo do limite Drive API (10 req/s soft).
 *
 * Variáveis:
 *   PADUA_BACKFILL_LIMIT=N     → processa só N pacientes (debug)
 *   PADUA_BACKFILL_OFFSET=N    → pula N pacientes (chunks)
 *   PADUA_BACKFILL_DRY_RUN=1   → só lista, não cria
 */
import "dotenv/config";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { google } from "googleapis";
import { getAccessToken } from "../lib/google-drive";
import { getOrCreatePacienteRootFolder } from "../lib/arquivos/drive";

const UNIDADE_ID = 15;
const NOME_CORRETO = "CLIENTES INSTITUTO PADUA";
const NOME_ERRADO = "CLIENTES INTITUTO PADUA";

const LIMIT = process.env.PADUA_BACKFILL_LIMIT ? parseInt(process.env.PADUA_BACKFILL_LIMIT, 10) : 0;
const OFFSET = process.env.PADUA_BACKFILL_OFFSET ? parseInt(process.env.PADUA_BACKFILL_OFFSET, 10) : 0;
const DRY = process.env.PADUA_BACKFILL_DRY_RUN === "1";

async function getDrive() {
  const token = await getAccessToken();
  const oauth = new google.auth.OAuth2();
  oauth.setCredentials({ access_token: token });
  return google.drive({ version: "v3", auth: oauth });
}

function escapeQ(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function main() {
  console.log(`[backfill-drive-padua] início${DRY ? " (DRY-RUN)" : ""}`);

  // 1. busca google_drive_folder_id da unidade
  const u = (await db.execute(sql`
    SELECT google_drive_folder_id, clientes_subfolder_id
    FROM unidades WHERE id = ${UNIDADE_ID}
  `)) as unknown as { rows: Array<{ google_drive_folder_id: string | null; clientes_subfolder_id: string | null }> };
  const empresaFolder = u.rows[0]?.google_drive_folder_id;
  let clientesFolder = u.rows[0]?.clientes_subfolder_id;
  if (!empresaFolder) throw new Error(`unidade ${UNIDADE_ID} sem google_drive_folder_id`);
  console.log(`[1] empresa folder = ${empresaFolder}`);
  console.log(`[1] clientes_subfolder_id atual = ${clientesFolder ?? "(vazio)"}`);

  // 2. lista filhos pra encontrar a CLIENTES (correto OU errado)
  const drive = await getDrive();
  const r = await drive.files.list({
    q: `'${escapeQ(empresaFolder)}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id,name)",
    pageSize: 50,
  });
  const filhos = r.data.files ?? [];
  console.log(`[2] filhos da pasta empresa: ${filhos.map((f) => f.name).join(", ")}`);

  let clientesCorreta = filhos.find((f) => f.name === NOME_CORRETO);
  const clientesErrada = filhos.find((f) => f.name === NOME_ERRADO);

  if (clientesErrada && !clientesCorreta) {
    if (DRY) {
      console.log(`[3] DRY: renomearia ${clientesErrada.id} "${NOME_ERRADO}" → "${NOME_CORRETO}"`);
      clientesFolder = clientesErrada.id ?? clientesFolder;
    } else {
      console.log(`[3] renomeando ${clientesErrada.id} "${NOME_ERRADO}" → "${NOME_CORRETO}"`);
      await drive.files.update({
        fileId: clientesErrada.id!,
        requestBody: { name: NOME_CORRETO },
      });
      clientesCorreta = { ...clientesErrada, name: NOME_CORRETO };
    }
  } else if (!clientesCorreta && !clientesErrada) {
    if (DRY) {
      console.log(`[3] DRY: criaria nova pasta "${NOME_CORRETO}"`);
    } else {
      const c = await drive.files.create({
        requestBody: { name: NOME_CORRETO, mimeType: "application/vnd.google-apps.folder", parents: [empresaFolder] },
        fields: "id",
      });
      clientesCorreta = { id: c.data.id!, name: NOME_CORRETO };
      console.log(`[3] criada nova "${NOME_CORRETO}" id=${clientesCorreta.id}`);
    }
  } else {
    console.log(`[3] "${NOME_CORRETO}" já existe id=${clientesCorreta?.id}`);
  }

  const novoClientesId = clientesCorreta?.id ?? clientesErrada?.id ?? clientesFolder;
  if (!novoClientesId) throw new Error("não consegui resolver clientes folder id");

  // 4. seta unidades.clientes_subfolder_id se mudou
  if (!DRY && clientesFolder !== novoClientesId) {
    await db.execute(sql`
      UPDATE unidades SET
        clientes_subfolder_id = ${novoClientesId},
        clientes_subfolder_name = ${NOME_CORRETO}
      WHERE id = ${UNIDADE_ID}
    `);
    console.log(`[4] unidades.clientes_subfolder_id atualizado para ${novoClientesId}`);
  }

  // 5. busca pacientes Pádua sem google_drive_folder_id
  const limitClause = LIMIT ? sql`LIMIT ${LIMIT}` : sql``;
  const offsetClause = OFFSET ? sql`OFFSET ${OFFSET}` : sql``;
  const pacientes = (await db.execute(sql`
    SELECT id, nome, codigo_semantico
    FROM pacientes
    WHERE unidade_id = ${UNIDADE_ID}
      AND codigo_semantico IS NOT NULL
      AND (google_drive_folder_id IS NULL OR google_drive_folder_id = '')
    ORDER BY id
    ${limitClause} ${offsetClause}
  `)) as unknown as { rows: Array<{ id: number; nome: string; codigo_semantico: string }> };
  console.log(`[5] pacientes Pádua sem pasta-raiz: ${pacientes.rows.length}`);

  if (DRY) {
    console.log("[5] DRY-RUN, primeiros 5:", pacientes.rows.slice(0, 5).map((p) => `${p.codigo_semantico} ${p.nome}`));
    return;
  }

  // 6. backfill com throttle (~8 req/s pra ficar abaixo de 10/s soft limit)
  const inicio = Date.now();
  let ok = 0;
  let erros = 0;
  const errosDetalhe: Array<{ id: number; nome: string; erro: string }> = [];

  for (let i = 0; i < pacientes.rows.length; i++) {
    const p = pacientes.rows[i];
    try {
      await getOrCreatePacienteRootFolder({
        id: p.id,
        nome: p.nome,
        codigoSemantico: p.codigo_semantico,
        unidadeId: UNIDADE_ID,
      });
      ok++;
    } catch (e) {
      erros++;
      errosDetalhe.push({ id: p.id, nome: p.nome, erro: (e as Error).message });
      if (erros <= 5) console.warn(`[err] paciente ${p.id} ${p.nome}: ${(e as Error).message}`);
    }
    if ((i + 1) % 100 === 0) {
      const dt = (Date.now() - inicio) / 1000;
      console.log(`[6] progresso ${i + 1}/${pacientes.rows.length} (ok=${ok} err=${erros}) ${(((i + 1) / dt) | 0)} req/s`);
    }
    // throttle ~8 req/s (each call = ~2 Drive reqs: search+create or just search)
    await new Promise((r) => setTimeout(r, 130));
  }

  const dur = Date.now() - inicio;
  console.log("=".repeat(60));
  console.log(`[backfill-drive-padua] FIM em ${(dur / 1000).toFixed(1)}s`);
  console.log(`  ok:    ${ok}`);
  console.log(`  erros: ${erros}`);
  if (errosDetalhe.length > 0) {
    console.log("  primeiros 10 erros:");
    errosDetalhe.slice(0, 10).forEach((e) => console.log(`    [${e.id}] ${e.nome}: ${e.erro}`));
  }
  console.log("=".repeat(60));
}

main().then(() => process.exit(0)).catch((e) => {
  console.error("[backfill-drive-padua] FALHOU:", e);
  process.exit(1);
});
