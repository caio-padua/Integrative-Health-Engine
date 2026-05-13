/**
 * Demo Drive 5 pacientes — Wave Cadastro Pádua (13/mai/2026)
 *
 * Pega 5 pacientes Pádua COM dados completos (CPF + nascimento + telefone)
 * e cria no Drive:
 *   - Pasta-raiz "[CODIGO_SEMANTICO] [NOME]"
 *   - 7 categorias macro (01_CADASTRO ... 07_PESQUISA)
 *   - 8 arquivos fictícios vazios (1 por subcategoria) pra validar nomenclatura
 *
 * Garante que unidades.clientes_subfolder_id está setado (típico fluxo já feito).
 *
 * Variáveis:
 *   DEMO_DRY_RUN=1   → só lista quem seria criado
 *   DEMO_QTD=5       → quantos pacientes (default 5)
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { google } from "googleapis";
import { Readable } from "node:stream";
import { getAccessToken } from "../lib/google-drive";
import { getOrCreatePacienteRootFolder, getOrCreateSubpasta } from "../lib/arquivos/drive";
import { gerarNomeArquivo, TIPOS_DOCUMENTO } from "../lib/arquivos/catalogo";

const UNIDADE_ID = 15;
const QTD = process.env.DEMO_QTD ? parseInt(process.env.DEMO_QTD, 10) : 5;
const DRY = process.env.DEMO_DRY_RUN === "1";

interface DemoFile {
  tipo: keyof typeof TIPOS_DOCUMENTO;
  identificador?: string;
  valor?: number;
}

const ARQUIVOS_DEMO: DemoFile[] = [
  { tipo: "RG" },
  { tipo: "ANAMNESE" },
  { tipo: "RAS" },
  { tipo: "EXAME_LAB", identificador: "BIOQUIMICA" },
  { tipo: "RECEITA_SIMPLES" },
  { tipo: "NF", valor: 450 },
  { tipo: "PARQ_ASSINADO" },
  { tipo: "FOTO_PERFIL" },
];

async function getDrive() {
  const token = await getAccessToken();
  const oauth = new google.auth.OAuth2();
  oauth.setCredentials({ access_token: token });
  return google.drive({ version: "v3", auth: oauth });
}

function escapeQ(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function findFile(parentId: string, name: string): Promise<string | null> {
  const drive = await getDrive();
  const r = await drive.files.list({
    q: `'${escapeQ(parentId)}' in parents and name='${escapeQ(name)}' and trashed=false`,
    fields: "files(id,name)",
    pageSize: 5,
  });
  return r.data.files?.[0]?.id ?? null;
}

async function uploadFakeFile(parentId: string, name: string, mimeType: string): Promise<string> {
  const existing = await findFile(parentId, name);
  if (existing) return existing;
  const drive = await getDrive();
  const r = await drive.files.create({
    requestBody: { name, parents: [parentId], mimeType },
    media: { mimeType, body: Readable.from([Buffer.from(`Demo file ${name}\n`)]) },
    fields: "id",
  });
  if (!r.data.id) throw new Error(`falha upload ${name}`);
  return r.data.id;
}

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  sheet: "application/vnd.google-apps.spreadsheet",
};

async function main() {
  console.log(`[demo-drive] início${DRY ? " (DRY)" : ""} QTD=${QTD}`);

  const pacientes = (await db.execute(sql`
    SELECT id, nome, codigo_semantico, cpf, data_nascimento, telefone
    FROM pacientes
    WHERE unidade_id = ${UNIDADE_ID}
      AND codigo_semantico IS NOT NULL
      AND cpf IS NOT NULL AND cpf <> ''
      AND data_nascimento IS NOT NULL
      AND telefone IS NOT NULL AND telefone <> ''
      AND (google_drive_folder_id IS NULL OR google_drive_folder_id = '')
    ORDER BY nome
    LIMIT ${QTD}
  `)) as unknown as { rows: Array<{ id: number; nome: string; codigo_semantico: string }> };

  console.log(`[selecionados]`);
  pacientes.rows.forEach((p) => console.log(`  - ${p.codigo_semantico} | ${p.nome} (id=${p.id})`));

  if (DRY) return;

  for (const p of pacientes.rows) {
    console.log(`\n=== ${p.codigo_semantico} ${p.nome} ===`);

    // 1. pasta-raiz
    const rootId = await getOrCreatePacienteRootFolder({
      id: p.id,
      nome: p.nome,
      codigoSemantico: p.codigo_semantico,
      unidadeId: UNIDADE_ID,
    });
    console.log(`  raiz: ${rootId}`);

    // 2. cria 8 arquivos demo (cada um materializa categoria+subcategoria via getOrCreateSubpasta)
    for (const arq of ARQUIVOS_DEMO) {
      const cfg = TIPOS_DOCUMENTO[arq.tipo];
      const { folderId } = await getOrCreateSubpasta({
        pacienteId: p.id,
        unidadeId: UNIDADE_ID,
        pacienteNome: p.nome,
        codigoSemantico: p.codigo_semantico,
        categoria: cfg.categoria,
        subcategoria: cfg.subcategoria,
      });

      const nomeArquivo = gerarNomeArquivo({
        tipo: arq.tipo,
        codigoSemantico: p.codigo_semantico,
        nomePaciente: p.nome,
        identificador: arq.identificador,
        valor: arq.valor,
        data: new Date(),
      });

      const mime = MIME_BY_EXT[cfg.extensaoPadrao] ?? "application/octet-stream";
      const fileId = await uploadFakeFile(folderId, nomeArquivo, mime);
      console.log(`  + ${cfg.categoria}/${cfg.subcategoria} → ${nomeArquivo} (${fileId.slice(0, 10)}…)`);
    }
  }

  console.log("\n[demo-drive] FIM");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error("[demo-drive] FALHOU:", e);
  process.exit(1);
});
