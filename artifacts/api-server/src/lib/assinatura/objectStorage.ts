/**
 * Wave 10.5 — Armazenamento permanente dos PDFs assinados (task #34).
 *
 * Helper minimalista pro App Storage da Replit (GCS-backed via sidecar).
 * Uso exclusivo do dominio assinaturas: upload de Buffer no path
 * `assinaturas/${external_id}.pdf` + leitura streamada pra rota
 * `/api/assinaturas/:id/pdf-assinado`.
 *
 * Por que helper proprio (em vez de copiar todo o template object-storage)?
 * Aqui nao usamos presigned URL upload (cliente -> GCS direto), porque o
 * webhook eh server-to-server: ZapSign -> nosso backend -> bucket. Entao
 * basta o `bucket.file().save(buffer)` e `createReadStream()` pra servir.
 * ACL framework do template tambem nao se aplica: ninguem assina como
 * "owner" de um audit trail juridico — autorizacao eh feita por
 * guardMaster nas rotas, nao por ACL no objeto.
 */

import { Storage, type Bucket } from "@google-cloud/storage";
import { Readable } from "node:stream";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

let _client: Storage | null = null;
let _bucket: Bucket | null = null;

function getClient(): Storage {
  if (_client) return _client;
  _client = new Storage({
    credentials: {
      audience: "replit",
      subject_token_type: "access_token",
      token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
      type: "external_account",
      credential_source: {
        url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
        format: { type: "json", subject_token_field_name: "access_token" },
      },
      universe_domain: "googleapis.com",
    },
    projectId: "",
  });
  return _client;
}

/**
 * Resolve o bucket fisico onde os PDFs assinados ficam armazenados.
 *
 * Prioridade:
 *  1. ASSINATURAS_BUCKET_ID — se um dia migrarmos pra um bucket dedicado
 *     "assinaturas-pawards" provisionado fora do default.
 *  2. PRIVATE_OBJECT_DIR (formato `/<bucket>/<dir>`) — extrai bucket name.
 *  3. DEFAULT_OBJECT_STORAGE_BUCKET_ID — fallback final.
 */
function resolveBucketName(): string {
  const explicit = process.env["ASSINATURAS_BUCKET_ID"];
  if (explicit) return explicit;
  const priv = process.env["PRIVATE_OBJECT_DIR"];
  if (priv && priv.startsWith("/")) {
    const parts = priv.replace(/^\//, "").split("/");
    if (parts[0]) return parts[0];
  }
  const def = process.env["DEFAULT_OBJECT_STORAGE_BUCKET_ID"];
  if (def) return def;
  throw new Error(
    "Bucket de assinaturas nao configurado. Defina ASSINATURAS_BUCKET_ID " +
    "ou DEFAULT_OBJECT_STORAGE_BUCKET_ID (rode setupObjectStorage).",
  );
}

function getBucket(): Bucket {
  if (_bucket) return _bucket;
  _bucket = getClient().bucket(resolveBucketName());
  return _bucket;
}

/**
 * Prefixo logico dentro do bucket. Mantem `assinaturas/` independente do
 * bucket (compatibilidade com o pdf_storage_key historico que ja gravava
 * `assinaturas/${external_id}.pdf` apenas como ponteiro logico).
 *
 * Se PRIVATE_OBJECT_DIR estiver no formato `/<bucket>/<subdir>`, prefixa
 * `<subdir>/assinaturas/...` pra respeitar o particionamento padrao do
 * App Storage; senao usa `assinaturas/...` direto.
 */
function pdfObjectName(externalIdOuEnvelope: string): string {
  const safe = externalIdOuEnvelope.replace(/[^A-Za-z0-9._-]/g, "_");
  const priv = process.env["PRIVATE_OBJECT_DIR"];
  let subdir = "";
  if (priv && priv.startsWith("/")) {
    const parts = priv.replace(/^\//, "").split("/");
    if (parts.length > 1) subdir = parts.slice(1).join("/") + "/";
  }
  return `${subdir}assinaturas/${safe}.pdf`;
}

export interface UploadPdfAssinadoResult {
  storageKey: string;
  bucket: string;
  bytes: number;
}

/**
 * Faz upload do PDF assinado no bucket. Idempotente: se ja existir, sobrescreve
 * (defensavel — o conteudo eh determinístico pelo envelope ZapSign + signature).
 *
 * Retorna a chave logica completa (bucket + path) pra gravar em
 * auditoria_assinaturas.pdf_storage_key.
 */
export async function uploadPdfAssinado(
  externalIdOuEnvelope: string,
  pdf: Buffer,
): Promise<UploadPdfAssinadoResult> {
  const bucket = getBucket();
  const objectName = pdfObjectName(externalIdOuEnvelope);
  const file = bucket.file(objectName);
  await file.save(pdf, {
    contentType: "application/pdf",
    resumable: false,
    metadata: {
      cacheControl: "private, max-age=0, no-store",
      metadata: {
        origem: "zapsign_webhook_doc_signed",
        gravado_em: new Date().toISOString(),
      },
    },
  });
  return {
    storageKey: `${bucket.name}/${objectName}`,
    bucket: bucket.name,
    bytes: pdf.length,
  };
}

export class PdfAssinadoNaoEncontradoError extends Error {
  constructor(public readonly storageKey: string) {
    super(`PDF assinado nao encontrado em storage: ${storageKey}`);
    this.name = "PdfAssinadoNaoEncontradoError";
  }
}

/**
 * Resolve uma `pdf_storage_key` (qualquer dos formatos historicos abaixo) pro
 * objeto fisico no bucket e retorna um stream pronto pra pipe na response.
 *
 * Formatos aceitos em pdf_storage_key:
 *  - `<bucket>/<path/to.pdf>`              — formato novo (Wave 10.5+)
 *  - `assinaturas/<external_id>.pdf`       — formato logico antigo (Wave 10 F4)
 *  - `<external_id>` puro                  — fallback ultra-defensivo
 */
export async function streamPdfAssinado(
  storageKey: string,
): Promise<{ stream: NodeJS.ReadableStream; contentType: string; bytes: number | null; objectName: string; bucketName: string }> {
  const bucket = getBucket();
  let objectName: string;
  let bucketName = bucket.name;
  let file;

  if (storageKey.startsWith(`${bucket.name}/`)) {
    objectName = storageKey.slice(bucket.name.length + 1);
    file = bucket.file(objectName);
  } else if (storageKey.includes("/")) {
    objectName = storageKey;
    file = bucket.file(objectName);
  } else {
    objectName = pdfObjectName(storageKey);
    file = bucket.file(objectName);
  }

  const [exists] = await file.exists();
  if (!exists) {
    // Fallback: tenta `assinaturas/<storageKey>.pdf` se o lookup direto falhar
    const fallback = pdfObjectName(storageKey.replace(/^assinaturas\//, "").replace(/\.pdf$/, ""));
    const file2 = bucket.file(fallback);
    const [exists2] = await file2.exists();
    if (!exists2) throw new PdfAssinadoNaoEncontradoError(storageKey);
    objectName = fallback;
    file = file2;
  }

  const [metadata] = await file.getMetadata();
  const stream = file.createReadStream();
  return {
    stream: stream as unknown as NodeJS.ReadableStream,
    contentType: (metadata.contentType as string) || "application/pdf",
    bytes: metadata.size ? Number(metadata.size) : null,
    objectName,
    bucketName,
  };
}

/**
 * Wave 10.5 task #34 — Gera URL assinada GET de TTL curto pro PDF assinado.
 *
 * Usado pela rota `/api/assinaturas/:id/pdf-assinado`: em vez de streamar
 * bytes pelo backend (que segura conexao HTTP por minutos em PDFs grandes
 * e nao escala), redirecionamos 302 pra uma URL GCS direta valida por
 * `ttlSec` segundos (default 300s = 5min, suficiente pra um clique do
 * validador master baixar e fechar).
 *
 * O bucket nao eh publico — a URL assinada eh a unica forma de acesso
 * sem credencial GCS. Como o gate de autorizacao (guardMaster) jah barrou
 * antes, a URL assinada eh efeito do "ja autorizamos voce".
 *
 * Implementacao via sidecar Replit em vez de getSignedUrl() do SDK porque
 * o sidecar usa credencial federada (external_account) e o SDK nao consegue
 * assinar V4 sem service account key local.
 */
export async function gerarUrlAssinadaPdf(
  storageKey: string,
  ttlSec = 300,
): Promise<{ url: string; bucket: string; objectName: string; expiresAt: string }> {
  const bucket = getBucket();
  let objectName: string;

  if (storageKey.startsWith(`${bucket.name}/`)) {
    objectName = storageKey.slice(bucket.name.length + 1);
  } else if (storageKey.includes("/")) {
    objectName = storageKey;
  } else {
    objectName = pdfObjectName(storageKey);
  }

  // Confere existencia ANTES de assinar — evita devolver URL 404 mascarada
  // como redirect 302. Tambem dispara o fallback pra formato logico antigo.
  let file = bucket.file(objectName);
  const [exists] = await file.exists();
  if (!exists) {
    const fallback = pdfObjectName(storageKey.replace(/^assinaturas\//, "").replace(/\.pdf$/, ""));
    const file2 = bucket.file(fallback);
    const [exists2] = await file2.exists();
    if (!exists2) throw new PdfAssinadoNaoEncontradoError(storageKey);
    objectName = fallback;
    file = file2;
  }

  const expiresAt = new Date(Date.now() + ttlSec * 1000).toISOString();
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bucket_name: bucket.name,
        object_name: objectName,
        method: "GET",
        expires_at: expiresAt,
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) {
    throw new Error(
      `Falha ao gerar URL assinada (status ${response.status}): ${await response.text()}`,
    );
  }
  const data = (await response.json()) as { signed_url?: string; url?: string };
  const url = data.signed_url || data.url;
  if (!url) throw new Error("Sidecar nao retornou signed_url");
  return { url, bucket: bucket.name, objectName, expiresAt };
}

/** Exposto so pra teste/diagnostico. */
export const __internal = { resolveBucketName, pdfObjectName, Readable };
