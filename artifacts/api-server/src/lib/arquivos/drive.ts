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

// Caio 18/mai/2026: estopim duplicou pastas na Aceli porque catalogo migrou
// de "01_CADASTRO" (underscore) pra "01 CADASTRO" (espaco) sem migration de
// rename — match exato pelo nome falhava, sistema criava nova vazia ao lado.
// Solucao: lookup tolerante a separadores (espaco/underscore/hifen) e case.
// Lista TODAS as folders do parent (~7 macro por paciente, custo trivial) e
// faz match normalizado em memoria. Funciona pros 4.278 legados Padua.
export function normalizarNomePasta(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s_\-]+/g, "")
    .trim();
}

async function findFolderByName(parentId: string, name: string): Promise<string | null> {
  const drive = await getDrive();
  const q = `'${escapeQ(parentId)}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const r = await drive.files.list({ q, fields: "files(id,name)", spaces: "drive", pageSize: 200 });
  const alvo = normalizarNomePasta(name);
  const hit = (r.data.files ?? []).find((f) => normalizarNomePasta(f.name ?? "") === alvo);
  return hit?.id ?? null;
}

// Helpers expostos pro script de limpeza de duplicatas (Caio 18/mai/2026).
export interface FolderListItem { id: string; name: string; createdTime: string }
export async function listarFoldersDoParent(parentId: string): Promise<FolderListItem[]> {
  const drive = await getDrive();
  const q = `'${escapeQ(parentId)}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const r = await drive.files.list({ q, fields: "files(id,name,createdTime)", spaces: "drive", pageSize: 500 });
  return (r.data.files ?? []).map((f) => ({ id: f.id!, name: f.name ?? "", createdTime: f.createdTime ?? "" }));
}
export async function pastaEstaVazia(folderId: string): Promise<boolean> {
  const drive = await getDrive();
  const q = `'${escapeQ(folderId)}' in parents and trashed=false`;
  const r = await drive.files.list({ q, fields: "files(id)", spaces: "drive", pageSize: 1 });
  return (r.data.files ?? []).length === 0;
}
export async function moverPastaPraLixeira(folderId: string): Promise<void> {
  const drive = await getDrive();
  await drive.files.update({ fileId: folderId, requestBody: { trashed: true } });
}
export interface DriveItem { id: string; name: string; mimeType: string; createdTime: string }
export async function listarTudoDoParent(parentId: string): Promise<DriveItem[]> {
  const drive = await getDrive();
  const q = `'${escapeQ(parentId)}' in parents and trashed=false`;
  const r = await drive.files.list({ q, fields: "files(id,name,mimeType,createdTime)", spaces: "drive", pageSize: 500 });
  return (r.data.files ?? []).map((f) => ({ id: f.id!, name: f.name ?? "", mimeType: f.mimeType ?? "", createdTime: f.createdTime ?? "" }));
}
export async function moverItemParaPasta(itemId: string, novoParentId: string, antigoParentId: string): Promise<void> {
  const drive = await getDrive();
  await drive.files.update({ fileId: itemId, addParents: novoParentId, removeParents: antigoParentId, fields: "id, parents" });
}
export const MIME_FOLDER = "application/vnd.google-apps.folder";

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
  cpf?: string | null; // opcional; se vier, vai pro nome da pasta
}

/**
 * Nome canônico da pasta-raiz do paciente.
 * Decisão Caio (13/mai/2026 madrugada): "NOME COMPLETO + CPF",
 * sem código semântico no nome visível (semântico fica só no DB pra busca).
 *
 * Ex: "ADAUTO DE LIMA FRAGA 23260399801" ou "ADAUTO DE LIMA FRAGA" (sem CPF).
 */
export function nomePastaPaciente(nome: string, cpf?: string | null): string {
  const nomeLimpo = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const cpfDigits = (cpf ?? "").replace(/\D/g, "");
  return cpfDigits ? `${nomeLimpo} ${cpfDigits}` : nomeLimpo;
}

/**
 * Devolve (criando se necessário) o ID da pasta-raiz do paciente dentro de
 * unidades.clientes_subfolder_id. Persiste em pacientes.google_drive_folder_id.
 *
 * Nome da pasta: "[NOME COMPLETO] [CPF]" (CPF só dígitos; ausente se vazio).
 */
export async function getOrCreatePacienteRootFolder(p: PacienteParaProvisionar): Promise<string> {
  // 1. já cacheado?
  const existing = (await db.execute(sql`
    SELECT google_drive_folder_id, cpf FROM pacientes WHERE id = ${p.id}
  `)) as unknown as { rows: Array<{ google_drive_folder_id: string | null; cpf: string | null }> };
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

  // 3. cria pasta com nome canônico (NOME + CPF)
  const cpfFinal = p.cpf ?? existing.rows[0]?.cpf ?? null;
  const folderName = nomePastaPaciente(p.nome, cpfFinal);
  const folderId = await findOrCreateFolder(clientesParent, folderName);

  // 4. persiste cache
  await db.execute(sql`
    UPDATE pacientes SET google_drive_folder_id = ${folderId} WHERE id = ${p.id}
  `);

  return folderId;
}

// ============================================================================
// EAGER-CREATE — árvore completa de pastas (regra do sistema 13/mai/2026)
// ============================================================================
import { SUBCATEGORIAS } from "./catalogo";

/**
 * Cria EAGER toda a árvore de pastas do paciente (raiz + 7 categorias macro
 * + ~17 subpastas + sub-subs como EXAMES/LABORATORIAIS).
 *
 * Idempotente: re-roda sem duplicar (findOrCreate em cada nó).
 * Persiste TODOS os IDs em pacientes.drive_subpastas (cache jsonb) numa
 * única escrita atômica no fim.
 *
 * Use sempre que quiser garantir estrutura visual completa pro paciente
 * (ex: novo cadastro via POST /pacientes, demo manual, backfill).
 *
 * Custo: ~30 reqs Drive (1 root + 7 cat + ~22 subs/subsubs). ~12-18s.
 */
export async function criarArvoreCompletaPaciente(p: PacienteParaProvisionar): Promise<{
  rootId: string;
  pastasCriadas: number;
  cache: Record<string, string>;
}> {
  // 1. raiz
  const rootId = await getOrCreatePacienteRootFolder(p);

  // 2. carrega cache atual
  const row = (await db.execute(sql`
    SELECT drive_subpastas FROM pacientes WHERE id = ${p.id}
  `)) as unknown as { rows: Array<{ drive_subpastas: Record<string, string> | null }> };
  const cache: Record<string, string> = row.rows[0]?.drive_subpastas ?? {};

  let pastasCriadas = 0;

  // 3. percorre catálogo: pra cada categoria, garante categoria-mãe + descida
  //    completa de cada subcategoria (suporta "EXAMES/LABORATORIAIS").
  for (const categoria of Object.keys(SUBCATEGORIAS)) {
    let catId = cache[categoria];
    if (!catId) {
      catId = await findOrCreateFolder(rootId, categoria);
      cache[categoria] = catId;
      pastasCriadas++;
    }

    for (const sub of SUBCATEGORIAS[categoria]) {
      const segmentos = sub.split("/");
      let parentId = catId;
      let chaveAcum = categoria;
      for (const seg of segmentos) {
        chaveAcum = `${chaveAcum}/${seg}`;
        let segId = cache[chaveAcum];
        if (!segId) {
          segId = await findOrCreateFolder(parentId, seg);
          cache[chaveAcum] = segId;
          pastasCriadas++;
        }
        parentId = segId;
      }
    }
  }

  // 4. persiste cache + marca timestamp de provisionamento
  await db.execute(sql`
    UPDATE pacientes
    SET drive_subpastas = COALESCE(drive_subpastas, '{}'::jsonb) || ${JSON.stringify(cache)}::jsonb,
        arvore_drive_provisionada_em = now()
    WHERE id = ${p.id}
  `);

  return { rootId, pastasCriadas, cache };
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
  categoria: string;          // ex: "02 CLINICO"
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
 * ESTOPIM — REGRA DO SISTEMA (Caio, 13/mai/2026):
 * O 1o arquivo gravado pra um paciente dispara o provisionamento EAGER da
 * arvore completa (32 pastas) + ficha cadastral em Google Sheets.
 *
 * Necessario porque pacientes legados (Wave Padua = 4.278 importados em massa)
 * NUNCA passaram pelo POST /pacientes (unico ponto que tinha o hook). Sem
 * este estopim, eles ficavam com lazy create parcial e sem ficha Sheets.
 *
 * Idempotente: pacientes.arvore_drive_provisionada_em IS NOT NULL = no-op.
 * Sincrono: o upload PRECISA das pastas criadas antes de gravar o arquivo.
 * Import dinamico p/ evitar ciclo (autoProvisionDrive.ts importa drive.ts).
 */
async function garantirArvoreProvisionada(p: UploadParams): Promise<void> {
  const r = (await db.execute(sql`
    SELECT arvore_drive_provisionada_em, cpf
    FROM pacientes WHERE id = ${p.pacienteId}
  `)) as unknown as { rows: Array<{ arvore_drive_provisionada_em: Date | null; cpf: string | null }> };
  const row = r.rows[0];
  if (!row) throw new Error(`[drive] paciente ${p.pacienteId} nao encontrado`);
  if (row.arvore_drive_provisionada_em) return; // ja provisionada — no-op

  const mod = await import("../pacientes/autoProvisionDrive.js");
  await mod.provisionarDriveCompleto({
    id: p.pacienteId,
    nome: p.pacienteNome,
    codigoSemantico: p.codigoSemantico,
    unidadeId: p.unidadeId,
    cpf: row.cpf,
  });
}

/**
 * UPLOAD HOLISTICO — porta única do sistema pra gravar arquivo na pasta do
 * paciente seguindo TODAS as regras Wave Cadastro Pádua:
 *
 *  ✅ ESTOPIM: provisiona arvore EAGER no 1o upload (regra Caio)
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

  // 0. ESTOPIM — garante arvore + ficha cadastral provisionadas (idempotente)
  await garantirArvoreProvisionada(p);

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
// EXPORT LGPD da UNIDADE — arquivo permanente no Drive (Task #136)
// ============================================================================
//
// O export LGPD não pertence a um paciente específico — é um snapshot da
// CLÍNICA inteira. Por isso vai numa pasta "EXPORTS LGPD" criada como sibling
// de CLIENTES [CLINICA] dentro da pasta da empresa (parent comum apurado via
// Drive API a partir de unidades.clientes_subfolder_id).
//
// Decisão Caio (Task #136): a v1 embutia o JSON como data:URL em
// unidades.lgpd_export_url — quebrava pra clínicas grandes. Agora subimos
// pro Drive e guardamos só link http(s) + sha256 pra prova de integridade.
//
// Idempotente: se a pasta "EXPORTS LGPD" já existe, reaproveita.
// ============================================================================
import { createHash } from "node:crypto";

export interface ExportLgpdUploadResultado {
  driveFileId: string;
  driveUrl: string;
  driveFolderId: string;
  nomeArquivo: string;
  sha256: string;
  tamanhoBytes: number;
}

/**
 * Resolve o parent (pasta da empresa) a partir de clientes_subfolder_id da
 * unidade. Cria/encontra a pasta "EXPORTS LGPD" como sibling.
 */
async function getOrCreateExportsLgpdFolder(unidadeId: number): Promise<string> {
  const u = (await db.execute(sql`
    SELECT clientes_subfolder_id FROM unidades WHERE id = ${unidadeId}
  `)) as unknown as { rows: Array<{ clientes_subfolder_id: string | null }> };
  const clientesId = u.rows[0]?.clientes_subfolder_id;
  if (!clientesId) {
    throw new Error(
      `[drive] unidade ${unidadeId} sem clientes_subfolder_id configurado. ` +
        `Rode UPDATE unidades SET clientes_subfolder_id='...' WHERE id=${unidadeId}`,
    );
  }

  const drive = await getDrive();
  const meta = await drive.files.get({
    fileId: clientesId,
    fields: "parents",
    supportsAllDrives: true,
  });
  const parents = meta.data.parents ?? [];
  const empresaFolderId = parents[0];
  if (!empresaFolderId) {
    throw new Error(
      `[drive] clientes_subfolder_id ${clientesId} (unidade ${unidadeId}) sem parent — ` +
        `não consigo posicionar a pasta EXPORTS LGPD.`,
    );
  }

  return findOrCreateFolder(empresaFolderId, "EXPORTS LGPD");
}

/**
 * Sobe o JSON do export LGPD da clínica como arquivo permanente no Drive.
 * Devolve URL canônica (webViewLink), file id, sha256 e tamanho em bytes.
 *
 * Nome do arquivo: `YY.MM.DD EXPORT LGPD [NICK_OU_NOME].json`
 */
export async function uploadExportLgpdUnidade(opts: {
  unidadeId: number;
  unidadeNome: string;
  nick?: string | null;
  json: string;
  data?: Date;
}): Promise<ExportLgpdUploadResultado> {
  const folderId = await getOrCreateExportsLgpdFolder(opts.unidadeId);

  const data = opts.data ?? new Date();
  const yy = String(data.getFullYear()).slice(-2);
  const mm = String(data.getMonth() + 1).padStart(2, "0");
  const dd = String(data.getDate()).padStart(2, "0");
  const hh = String(data.getHours()).padStart(2, "0");
  const mi = String(data.getMinutes()).padStart(2, "0");
  const ss = String(data.getSeconds()).padStart(2, "0");
  const rotulo = (opts.nick && opts.nick.trim()) || opts.unidadeNome;
  const rotuloLimpo = rotulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const nomeArquivo = `${yy}.${mm}.${dd} ${hh}${mi}${ss} EXPORT LGPD ${rotuloLimpo}.json`;

  const buffer = Buffer.from(opts.json, "utf8");
  const tamanhoBytes = buffer.byteLength;
  const sha256 = createHash("sha256").update(buffer).digest("hex");

  const drive = await getDrive();
  const r = await drive.files.create({
    requestBody: { name: nomeArquivo, parents: [folderId] },
    media: { mimeType: "application/json", body: Readable.from(buffer) },
    fields: "id, webViewLink",
    supportsAllDrives: true,
  });
  if (!r.data.id) throw new Error(`[drive] Falha ao subir export LGPD ${nomeArquivo}`);

  const driveFileId = r.data.id;
  const driveUrl = r.data.webViewLink || `https://drive.google.com/file/d/${driveFileId}/view`;

  return { driveFileId, driveUrl, driveFolderId: folderId, nomeArquivo, sha256, tamanhoBytes };
}

/**
 * Baixa o conteudo bruto de um arquivo do Drive como Buffer.
 * Usado pelo botao "Verificar integridade" do export LGPD (Task #261):
 * o navegador nao consegue baixar direto do Drive (CORS + redirect),
 * entao o backend faz proxy de leitura e devolve os bytes pro client
 * recalcular o SHA-256 e comparar com `unidades.lgpd_export_sha256`.
 */
export async function baixarArquivoDriveComoBuffer(
  driveFileId: string,
): Promise<{ buffer: Buffer; mimeType: string | null; nome: string | null }> {
  const drive = await getDrive();
  const meta = await drive.files.get({
    fileId: driveFileId,
    fields: "name, mimeType",
    supportsAllDrives: true,
  });
  const r = await drive.files.get(
    { fileId: driveFileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" },
  );
  const data = r.data as ArrayBuffer | Buffer;
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return {
    buffer,
    mimeType: meta.data.mimeType ?? null,
    nome: meta.data.name ?? null,
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
