/**
 * Drive hierárquico — Wave Cadastro Pádua (13/mai/2026)
 *
 * Hierarquia nova:
 *   PAWARDS > GESTAO CLINICA > EMPRESAS > [CLINICA] > CLIENTES [CLINICA] > [PACIENTE]
 *                                                                            ├── 01_CADASTRO/
 *                                                                            │     └── DOCUMENTOS PESSOAIS/
 *                                                                            ├── 02_CLINICO/
 *                                                                            │     ├── EXAMES/
 *                                                                            │     │    ├── LABORATORIAIS/
 *                                                                            │     │    └── IMAGEM/
 *                                                                            │     └── ...
 *                                                                            └── ...
 *
 * Decisões Caio (13/mai/2026):
 *  - Pasta-raiz do paciente fica em unidades.clientes_subfolder_id (NÃO mais "CLINICA PADUA - CLIENTES").
 *  - Lazy create: subpastas só são criadas quando o sistema vai gravar o 1º arquivo daquela categoria.
 *  - Cache de IDs em pacientes.drive_subpastas jsonb pra evitar re-bater Drive API toda chamada.
 *  - Nome da pasta-raiz = "[CODIGO_SEMANTICO] [NOME PACIENTE]" (ex: "PADU-VIEI-ACEL-FEMI-1945-8420 ACELI GOMES VIEIRA").
 *  - Registro automático em arquivos_paciente em TODO upload (auditoria + busca SQL rápida).
 *
 * Retrocompat: o módulo legado google-drive.ts continua funcional
 * pra rotas antigas (/google-drive/...). Apenas as 5 entradas de geração
 * automática (NF, RAS, GPS, ZapSign, notifAssinatura) migram pra cá.
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { Readable } from "node:stream";
import { google } from "googleapis";
import { getAccessToken } from "../google-drive";
import {
  CATEGORIAS,
  TIPOS_DOCUMENTO,
  type TipoDocumento,
  gerarNomeArquivo,
  type GerarNomeParams,
} from "./catalogo";
import { registrarArquivo } from "./registry";

let driveClientCache: ReturnType<typeof google.drive> | null = null;
let driveClientCachedAt = 0;
const DRIVE_CLIENT_TTL_MS = 50 * 60 * 1000; // 50 min (token Google ~1h)

async function getDrive() {
  const now = Date.now();
  if (driveClientCache && now - driveClientCachedAt < DRIVE_CLIENT_TTL_MS) return driveClientCache;
  const token = await getAccessToken();
  const oauth = new google.auth.OAuth2();
  oauth.setCredentials({ access_token: token });
  driveClientCache = google.drive({ version: "v3", auth: oauth });
  driveClientCachedAt = now;
  return driveClientCache;
}

function escapeQ(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function findFolderByName(parentId: string, name: string): Promise<string | null> {
  const drive = await getDrive();
  const q = `'${escapeQ(parentId)}' in parents and mimeType='application/vnd.google-apps.folder' and name='${escapeQ(name)}' and trashed=false`;
  const r = await drive.files.list({ q, fields: "files(id,name)", spaces: "drive", pageSize: 5 });
  return r.data.files?.[0]?.id ?? null;
}

async function createFolder(parentId: string, name: string): Promise<string> {
  const drive = await getDrive();
  const r = await drive.files.create({
    requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] },
    fields: "id",
  });
  if (!r.data.id) throw new Error(`[drive] Falha ao criar pasta ${name}`);
  return r.data.id;
}

async function findOrCreateFolder(parentId: string, name: string): Promise<string> {
  const found = await findFolderByName(parentId, name);
  if (found) return found;
  return createFolder(parentId, name);
}

// ============================================================================
// PACIENTE: pasta-raiz
// ============================================================================
interface PacienteParaProvisionar {
  id: number;
  nome: string;
  codigoSemantico: string;
  unidadeId: number;
}

/**
 * Devolve (criando se necessário) o ID da pasta-raiz do paciente dentro de
 * unidades.clientes_subfolder_id. Persiste em pacientes.google_drive_folder_id.
 *
 * Nome da pasta: "[CODIGO_SEMANTICO] [NOME PACIENTE LIMPO]"
 */
export async function getOrCreatePacienteRootFolder(p: PacienteParaProvisionar): Promise<string> {
  // 1. já cacheado?
  const existing = (await db.execute(sql`
    SELECT google_drive_folder_id FROM pacientes WHERE id = ${p.id}
  `)) as unknown as { rows: Array<{ google_drive_folder_id: string | null }> };
  const cachedId = existing.rows[0]?.google_drive_folder_id;
  if (cachedId) return cachedId;

  // 2. busca clientes_subfolder_id da unidade
  const u = (await db.execute(sql`
    SELECT clientes_subfolder_id FROM unidades WHERE id = ${p.unidadeId}
  `)) as unknown as { rows: Array<{ clientes_subfolder_id: string | null }> };
  const clientesParent = u.rows[0]?.clientes_subfolder_id;
  if (!clientesParent) {
    throw new Error(
      `[drive] unidade ${p.unidadeId} sem clientes_subfolder_id configurado. ` +
        `Rode UPDATE unidades SET clientes_subfolder_id='...' WHERE id=${p.unidadeId}`
    );
  }

  // 3. cria pasta com nome canônico
  const nomeLimpo = p.nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const folderName = `${p.codigoSemantico} ${nomeLimpo}`;
  const folderId = await findOrCreateFolder(clientesParent, folderName);

  // 4. persiste cache
  await db.execute(sql`
    UPDATE pacientes SET google_drive_folder_id = ${folderId} WHERE id = ${p.id}
  `);

  return folderId;
}

// ============================================================================
// PACIENTE: subpastas (lazy create)
// ============================================================================

/**
 * Devolve (criando se necessário) o ID de uma subpasta categoria/subcategoria
 * dentro da pasta-raiz do paciente. Cache em pacientes.drive_subpastas (jsonb).
 *
 * subcategoria pode ter "/" — ex: "EXAMES/LABORATORIAIS" → cria EXAMES e
 * dentro dela LABORATORIAIS, retorna o ID da folha.
 */
export async function getOrCreateSubpasta(opts: {
  pacienteId: number;
  unidadeId: number;
  pacienteNome: string;
  codigoSemantico: string;
  categoria: string;          // ex: "02_CLINICO"
  subcategoria?: string | null; // ex: "EXAMES/LABORATORIAIS"
}): Promise<{ folderId: string; chave: string }> {
  const chave = opts.subcategoria
    ? `${opts.categoria}/${opts.subcategoria}`
    : opts.categoria;

  // 1. cache?
  const row = (await db.execute(sql`
    SELECT drive_subpastas FROM pacientes WHERE id = ${opts.pacienteId}
  `)) as unknown as { rows: Array<{ drive_subpastas: Record<string, string> | null }> };
  const cache = row.rows[0]?.drive_subpastas ?? {};
  if (cache[chave]) return { folderId: cache[chave], chave };

  // 2. garante root
  const rootId = await getOrCreatePacienteRootFolder({
    id: opts.pacienteId,
    nome: opts.pacienteNome,
    codigoSemantico: opts.codigoSemantico,
    unidadeId: opts.unidadeId,
  });

  // 3. garante categoria-mãe
  let parentId = cache[opts.categoria];
  if (!parentId) {
    parentId = await findOrCreateFolder(rootId, opts.categoria);
    cache[opts.categoria] = parentId;
  }

  // 4. desce subcategoria (suporta "EXAMES/LABORATORIAIS")
  if (opts.subcategoria) {
    const segmentos = opts.subcategoria.split("/");
    let chaveAcum = opts.categoria;
    for (const seg of segmentos) {
      chaveAcum = `${chaveAcum}/${seg}`;
      let segId = cache[chaveAcum];
      if (!segId) {
        segId = await findOrCreateFolder(parentId, seg);
        cache[chaveAcum] = segId;
      }
      parentId = segId;
    }
  }

  // 5. persiste jsonb (merge atômico)
  await db.execute(sql`
    UPDATE pacientes
    SET drive_subpastas = COALESCE(drive_subpastas, '{}'::jsonb) || ${JSON.stringify(cache)}::jsonb
    WHERE id = ${opts.pacienteId}
  `);

  return { folderId: parentId, chave };
}

// ============================================================================
// UPLOAD com auto-registro em arquivos_paciente
// ============================================================================
export interface UploadParams {
  pacienteId: number;
  unidadeId: number;
  pacienteNome: string;
  codigoSemantico: string;

  tipo: TipoDocumento;
  identificador?: string;
  valor?: number | string;
  data?: Date;

  mimeType: string;
  conteudo: Buffer | string;

  // opcional — pra rastreabilidade
  referenciaId?: number;
  referenciaTabela?: string;
  geradoPorUserId?: number;
  metadataExtra?: Record<string, unknown>;
}

export interface UploadResultado {
  arquivoId: number;        // id em arquivos_paciente
  driveFileId: string;
  driveUrl: string;
  driveFolderId: string;
  nomeArquivo: string;
  sha256: string | null;
}

/**
 * UPLOAD HOLISTICO — porta única do sistema pra gravar arquivo na pasta do
 * paciente seguindo TODAS as regras Wave Cadastro Pádua:
 *
 *  ✅ Pasta-raiz do paciente em unidades.clientes_subfolder_id (lazy create)
 *  ✅ Subpasta categoria/subcategoria (lazy create + cache jsonb)
 *  ✅ Nome do arquivo no padrão YY.MM.DD TIPO [IDENT] CODIGO NOME-PACIENTE.ext
 *  ✅ Registro em arquivos_paciente com SHA-256 + tudo mastigado
 *
 * Use ESTA função em todos os lugares novos. As legadas (uploadToClientSubfolder)
 * ficam só pra retrocompat de rotas antigas.
 */
export async function uploadArquivoPaciente(p: UploadParams): Promise<UploadResultado> {
  const cfg = TIPOS_DOCUMENTO[p.tipo];
  if (!cfg) throw new Error(`[drive] Tipo desconhecido: ${p.tipo}`);

  // 1. nome do arquivo
  const nomeArquivo = gerarNomeArquivo({
    tipo: p.tipo,
    data: p.data,
    identificador: p.identificador,
    valor: p.valor,
    codigoSemantico: p.codigoSemantico,
    nomePaciente: p.pacienteNome,
  });

  // 2. pasta destino (lazy create)
  const { folderId } = await getOrCreateSubpasta({
    pacienteId: p.pacienteId,
    unidadeId: p.unidadeId,
    pacienteNome: p.pacienteNome,
    codigoSemantico: p.codigoSemantico,
    categoria: cfg.categoria,
    subcategoria: cfg.subcategoria,
  });

  // 3. upload Drive
  const drive = await getDrive();
  const buffer = typeof p.conteudo === "string" ? Buffer.from(p.conteudo) : p.conteudo;
  const tamanhoBytes = buffer.byteLength;

  const r = await drive.files.create({
    requestBody: { name: nomeArquivo, parents: [folderId] },
    media: { mimeType: p.mimeType, body: Readable.from(buffer) },
    fields: "id, webViewLink",
  });

  if (!r.data.id) throw new Error(`[drive] Falha ao criar arquivo ${nomeArquivo}`);
  const driveFileId = r.data.id;
  const driveUrl = r.data.webViewLink || `https://drive.google.com/file/d/${driveFileId}/view`;

  // 4. registry
  const registrado = await registrarArquivo({
    pacienteId: p.pacienteId,
    unidadeId: p.unidadeId,
    tipo: p.tipo,
    identificador: p.identificador,
    valor: p.valor,
    data: p.data,
    codigoSemantico: p.codigoSemantico,
    nomePaciente: p.pacienteNome,
    driveFileId,
    driveUrl,
    driveFolderId: folderId,
    mimeType: p.mimeType,
    tamanhoBytes,
    conteudoParaSha256: buffer,
    geradoPorUserId: p.geradoPorUserId,
    referenciaId: p.referenciaId,
    referenciaTabela: p.referenciaTabela,
    metadataExtra: p.metadataExtra,
    origem: "sistema",
  });

  return {
    arquivoId: registrado.id,
    driveFileId,
    driveUrl,
    driveFolderId: folderId,
    nomeArquivo,
    sha256: registrado.sha256,
  };
}

// ============================================================================
// Helper de leitura unificada (pra IA, WhatsApp bot, painel)
// ============================================================================
export interface PacienteContexto {
  id: number;
  nome: string;
  codigoSemantico: string;
  unidadeId: number;
}

/**
 * Garante que o paciente tem código semântico. Se não tem, devolve erro
 * indicativo (resolução: rodar o backfill ou regerar via cadastro).
 */
export async function carregarContextoPaciente(pacienteId: number): Promise<PacienteContexto> {
  const row = (await db.execute(sql`
    SELECT id, nome, codigo_semantico, unidade_id FROM pacientes WHERE id = ${pacienteId}
  `)) as unknown as { rows: Array<{ id: number; nome: string; codigo_semantico: string | null; unidade_id: number }> };
  const r = row.rows[0];
  if (!r) throw new Error(`[drive] paciente ${pacienteId} não encontrado`);
  if (!r.codigo_semantico) {
    throw new Error(
      `[drive] paciente ${pacienteId} sem codigo_semantico. ` +
        `Rode backfillCodigoSemantico() ou re-cadastre via POST /pacientes (Wave Cadastro Pádua).`
    );
  }
  return {
    id: r.id,
    nome: r.nome,
    codigoSemantico: r.codigo_semantico,
    unidadeId: r.unidade_id,
  };
}
