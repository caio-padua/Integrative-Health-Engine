/**
 * Wave 10.5 · Task #38 · Worker daily de verificação dos PDFs assinados no cofre.
 *
 * Defesa em profundidade do ciclo ZapSign → bucket `assinaturas-pawards`:
 * a task #34 garante que cada `doc_signed` grave o PDF no Object Storage no
 * momento do webhook. Mas se um objeto for apagado por engano (limpeza
 * indevida, rotação de bucket, falha silenciosa de upload registrada apenas
 * em `assinatura_webhook_eventos.erro_processamento`), ninguém percebe até
 * uma auditoria CFM/judicial tentar baixar o PDF — exatamente quando NÃO
 * pode faltar.
 *
 * Este worker percorre `auditoria_assinaturas` dos últimos 30 dias com
 * `pdf_storage_key IS NOT NULL`, executa `bucket.file(...).exists()` em
 * cada chave e atualiza:
 *   - pdf_verificado_em   timestamptz
 *   - pdf_verificado_ok   boolean
 *   - pdf_verificado_erro text  (mensagem se exists() lançar)
 *
 * Linhas com PDF AUSENTE (exists()=false) ou erro de leitura disparam
 * alerta por e-mail pra `admin@pawards.com.br` (DPO LGPD + auditoria) com
 * o detalhamento de quais signature_ids estão fora do cofre.
 *
 * Roda 1x por dia às 03:30 BRT (06:30 UTC), tick de 60min, lock distribuído
 * via `pg_try_advisory_lock` (id reservado 30303031, vizinho do PARQ
 * 30303030 pra não colidir entre workers).
 *
 * Idempotente: se um dia o worker já rodou (ultimoRunISO === hojeISO), sai
 * sem trabalho extra. Re-execução manual via `rodarVerificacaoPdfsCofreAgora()`.
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { Storage, type Bucket } from "@google-cloud/storage";
import { getGmailClient } from "../google-gmail";

// Tick curto (5min) pra eliminar a corrida do tick de 60min: se o processo
// bootasse às 03:10 BRT, o proximo tick caia em 04:10 e o worker pulava o dia
// inteiro porque ja passou da janela 03:30. Com tick 5min + idempotencia via
// `ultimoRunISO`, garantimos no maximo 1 execucao por dia, sempre apos 03:30
// BRT, independente do minuto de boot do processo.
const TICK_MS = 5 * 60 * 1000;
const HORA_EXEC_BRT = 3;
const MINUTO_EXEC_BRT = 30;
const JANELA_DIAS = 30;
const ADVISORY_LOCK_ID = 30303031;
const ALERTA_EMAIL_DESTINO = "admin@pawards.com.br";
const ALERTA_EMAIL_FROM = "PAWARDS MEDCORE <clinica.padua.agenda@gmail.com>";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

let executandoAgora = false;
let ultimoRunISO: string | null = null;

function nowBrt(): { h: number; m: number } {
  const d = new Date();
  const utcH = d.getUTCHours();
  const utcM = d.getUTCMinutes();
  const h = (utcH - 3 + 24) % 24;
  return { h, m: utcM };
}

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
    "Bucket de assinaturas nao configurado (ASSINATURAS_BUCKET_ID / DEFAULT_OBJECT_STORAGE_BUCKET_ID).",
  );
}

let _client: Storage | null = null;
let _bucket: Bucket | null = null;
function getBucket(): Bucket {
  if (_bucket) return _bucket;
  if (!_client) {
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
  }
  _bucket = _client.bucket(resolveBucketName());
  return _bucket;
}

/**
 * Resolve uma `pdf_storage_key` (qualquer formato historico) pro nome de
 * objeto fisico dentro do bucket atual. Espelha a logica defensiva do
 * `streamPdfAssinado`/`gerarUrlAssinadaPdf` em `lib/assinatura/objectStorage.ts`
 * pra que a verificacao bata 1:1 com o que a rota de leitura faz.
 */
function resolverObjectName(storageKey: string, bucketName: string): string {
  if (storageKey.startsWith(`${bucketName}/`)) {
    return storageKey.slice(bucketName.length + 1);
  }
  if (storageKey.includes("/")) return storageKey;
  // Fallback puro (sem "/" e sem prefixo de bucket): trata como external_id.
  const safe = storageKey.replace(/[^A-Za-z0-9._-]/g, "_");
  const priv = process.env["PRIVATE_OBJECT_DIR"];
  let subdir = "";
  if (priv && priv.startsWith("/")) {
    const parts = priv.replace(/^\//, "").split("/");
    if (parts.length > 1) subdir = parts.slice(1).join("/") + "/";
  }
  return `${subdir}assinaturas/${safe}.pdf`;
}

type LinhaAuditoria = {
  id: number;
  signature_id: string;
  envelope_id: string;
  external_id: string | null;
  signer_name: string;
  signer_papel: string;
  pdf_storage_key: string;
  criado_em: string;
};

type LinhaAusente = LinhaAuditoria & { motivo: string };

export type VerificacaoPdfsResult = {
  total_verificadas: number;
  ok: number;
  ausentes: number;
  erros: number;
  alertou_email: boolean;
  ausentes_detalhe: Array<{ signature_id: string; storage_key: string; motivo: string }>;
};

async function verificarUma(
  bucket: Bucket,
  linha: LinhaAuditoria,
): Promise<{ ok: boolean; erro: string | null }> {
  try {
    const objectName = resolverObjectName(linha.pdf_storage_key, bucket.name);
    const file = bucket.file(objectName);
    const [exists] = await file.exists();
    if (exists) return { ok: true, erro: null };
    // Fallback ultimo recurso: tenta via external_id puro (mesmo
    // comportamento de streamPdfAssinado).
    if (linha.external_id) {
      const fallback = resolverObjectName(linha.external_id, bucket.name);
      if (fallback !== objectName) {
        const [exists2] = await bucket.file(fallback).exists();
        if (exists2) return { ok: true, erro: null };
      }
    }
    return { ok: false, erro: null };
  } catch (e) {
    return { ok: false, erro: (e as Error).message.slice(0, 500) };
  }
}

async function persistirResultado(
  id: number,
  ok: boolean,
  erro: string | null,
): Promise<void> {
  await db.execute(sql`
    UPDATE auditoria_assinaturas
    SET pdf_verificado_em = NOW(),
        pdf_verificado_ok = ${ok},
        pdf_verificado_erro = ${erro}
    WHERE id = ${id}
  `);
}

function montarHtmlAlerta(
  ausentes: LinhaAusente[],
  janelaDias: number,
  runId: string,
): string {
  const linhas = ausentes
    .map(
      (a) => `
      <tr>
        <td style="padding:6px 10px;border:1px solid #1f2937;font-family:monospace;font-size:12px;">${a.signature_id}</td>
        <td style="padding:6px 10px;border:1px solid #1f2937;">${a.signer_name} (${a.signer_papel})</td>
        <td style="padding:6px 10px;border:1px solid #1f2937;font-family:monospace;font-size:12px;">${a.pdf_storage_key}</td>
        <td style="padding:6px 10px;border:1px solid #1f2937;">${a.criado_em}</td>
        <td style="padding:6px 10px;border:1px solid #1f2937;color:#b91c1c;">${a.motivo}</td>
      </tr>`,
    )
    .join("");
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#020406;color:#e5e7eb;font-family:Arial,sans-serif;">
  <div style="max-width:920px;margin:0 auto;background:#0b1117;border:1px solid #1f2937;border-radius:8px;padding:24px;">
    <h1 style="color:#C89B3C;font-size:20px;margin:0 0 8px;">PAWARDS MEDCORE — Alerta de cofre de assinaturas</h1>
    <p style="margin:0 0 16px;color:#cbd5e1;">
      O worker diário <strong>verificarPdfsCofre</strong> (run <code>${runId}</code>) detectou
      <strong style="color:#fca5a5;">${ausentes.length} PDF(s) ausente(s)</strong> no bucket
      de assinaturas, examinando os últimos <strong>${janelaDias} dias</strong> de
      <code>auditoria_assinaturas</code>.
    </p>
    <p style="margin:0 0 16px;color:#cbd5e1;">
      Estes PDFs constam no banco com <code>pdf_storage_key</code> mas não foram encontrados
      no Object Storage. Ação recomendada: investigar logs de webhook e backups.
    </p>
    <table style="width:100%;border-collapse:collapse;background:#020406;color:#e5e7eb;font-size:13px;">
      <thead>
        <tr style="background:#1f2937;">
          <th style="padding:8px 10px;border:1px solid #1f2937;text-align:left;">signature_id</th>
          <th style="padding:8px 10px;border:1px solid #1f2937;text-align:left;">Signatário</th>
          <th style="padding:8px 10px;border:1px solid #1f2937;text-align:left;">storage_key</th>
          <th style="padding:8px 10px;border:1px solid #1f2937;text-align:left;">Criado em</th>
          <th style="padding:8px 10px;border:1px solid #1f2937;text-align:left;">Motivo</th>
        </tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>
    <p style="margin:16px 0 0;color:#94a3b8;font-size:12px;">
      Worker <code>verificarPdfsCofre</code> · janela ${janelaDias}d · execução diária 03:30 BRT.
      Este e-mail é gerado automaticamente, não responda.
    </p>
  </div>
</body></html>`;
}

async function enviarEmailAlerta(
  ausentes: LinhaAusente[],
  janelaDias: number,
  runId: string,
): Promise<boolean> {
  try {
    const gmail = await getGmailClient();
    const html = montarHtmlAlerta(ausentes, janelaDias, runId);
    const subject = `[PAWARDS] Cofre de assinaturas: ${ausentes.length} PDF(s) ausente(s) (${runId})`;
    const raw = Buffer.from(
      [
        `From: ${ALERTA_EMAIL_FROM}`,
        `To: ${ALERTA_EMAIL_DESTINO}`,
        `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
        "MIME-Version: 1.0",
        "Content-Type: text/html; charset=UTF-8",
        "Content-Transfer-Encoding: base64",
        "",
        Buffer.from(html).toString("base64"),
      ].join("\r\n"),
    ).toString("base64url");
    await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
    return true;
  } catch (e) {
    console.error(
      `[verificarPdfsCofre ${runId}] falha ao enviar alerta por e-mail:`,
      (e as Error).message,
    );
    return false;
  }
}

async function rodarVerificacao(runId: string): Promise<VerificacaoPdfsResult> {
  const stats: VerificacaoPdfsResult = {
    total_verificadas: 0,
    ok: 0,
    ausentes: 0,
    erros: 0,
    alertou_email: false,
    ausentes_detalhe: [],
  };

  let bucket: Bucket;
  try {
    bucket = getBucket();
  } catch (e) {
    console.error(
      `[verificarPdfsCofre ${runId}] bucket nao configurado, abortando:`,
      (e as Error).message,
    );
    return stats;
  }

  const r: any = await db.execute(sql`
    SELECT id, signature_id, envelope_id, external_id, signer_name, signer_papel,
           pdf_storage_key, criado_em::text AS criado_em
    FROM auditoria_assinaturas
    WHERE pdf_storage_key IS NOT NULL
      AND criado_em >= NOW() - INTERVAL '${sql.raw(String(JANELA_DIAS))} days'
    ORDER BY criado_em DESC
  `);
  const linhas: LinhaAuditoria[] = (r.rows ?? r) as LinhaAuditoria[];
  stats.total_verificadas = linhas.length;

  const ausentes: LinhaAusente[] = [];
  for (const linha of linhas) {
    const { ok, erro } = await verificarUma(bucket, linha);
    try {
      await persistirResultado(linha.id, ok, erro);
    } catch (e) {
      console.error(
        `[verificarPdfsCofre ${runId}] erro persistir id=${linha.id}:`,
        (e as Error).message,
      );
    }
    if (ok) {
      stats.ok += 1;
    } else {
      const motivo = erro ? `erro: ${erro}` : "ausente no bucket";
      if (erro) stats.erros += 1;
      stats.ausentes += 1;
      ausentes.push({ ...linha, motivo });
      stats.ausentes_detalhe.push({
        signature_id: linha.signature_id,
        storage_key: linha.pdf_storage_key,
        motivo,
      });
    }
  }

  if (ausentes.length > 0) {
    stats.alertou_email = await enviarEmailAlerta(ausentes, JANELA_DIAS, runId);
  }

  console.log(
    `[verificarPdfsCofre ${runId}] OK | total=${stats.total_verificadas} ok=${stats.ok} ausentes=${stats.ausentes} erros=${stats.erros} email=${stats.alertou_email}`,
  );
  return stats;
}

export function iniciarWorkerVerificarPdfsCofre(): void {
  console.log(
    `[verificarPdfsCofre] Worker daily iniciado (tick ${TICK_MS / 60000}min, exec ${HORA_EXEC_BRT}:${String(MINUTO_EXEC_BRT).padStart(2, "0")} BRT, janela ${JANELA_DIAS}d)`,
  );
  setInterval(() => {
    void (async () => {
      if (executandoAgora) return;
      const { h, m } = nowBrt();
      // hojeISO em fuso BRT (UTC-3) — usamos pra idempotencia "1x por dia
      // BRT" alinhado com a janela de execucao 03:30 BRT, evitando que um
      // tick logo apos meia-noite UTC dispare outra execucao no mesmo "dia
      // brasileiro".
      const nowBrtMs = Date.now() - 3 * 60 * 60 * 1000;
      const hojeISO = new Date(nowBrtMs).toISOString().slice(0, 10);
      // Janela alvo: a qualquer momento APOS 03:30 BRT do dia. Evita pular o
      // dia se o processo bootar depois de 03:30 (com tick 60min antigo, boot
      // 03:10 fazia o proximo tick cair em 04:10 e o worker nunca rodava).
      // Ceiling em 23h pra nao colidir com a virada de dia (00h~02h).
      const aposJanelaInicio =
        h > HORA_EXEC_BRT || (h === HORA_EXEC_BRT && m >= MINUTO_EXEC_BRT);
      if (!aposJanelaInicio || h >= 23) return;
      if (ultimoRunISO === hojeISO) return;

      executandoAgora = true;
      const runId = `run_${hojeISO}_${Date.now()}`;
      let lockAdquirido = false;
      try {
        const lockRes: any = await db.execute(
          sql`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID}) AS got`,
        );
        const linhaLock = (lockRes.rows ?? lockRes)[0];
        lockAdquirido = Boolean(linhaLock?.got);
        if (!lockAdquirido) {
          console.log(
            `[verificarPdfsCofre ${runId}] lock distribuido nao adquirido, outro pod ja roda`,
          );
          return;
        }
        await rodarVerificacao(runId);
        ultimoRunISO = hojeISO;
      } catch (e) {
        console.error(
          `[verificarPdfsCofre ${runId}] erro fatal:`,
          (e as Error).message,
        );
      } finally {
        if (lockAdquirido) {
          try {
            await db.execute(sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`);
          } catch (e) {
            console.error(
              `[verificarPdfsCofre ${runId}] erro release lock:`,
              (e as Error).message,
            );
          }
        }
        executandoAgora = false;
      }
    })();
  }, TICK_MS);
}

/** Exposto pra teste manual / endpoint admin. */
export async function rodarVerificacaoPdfsCofreAgora(): Promise<VerificacaoPdfsResult> {
  const runId = `manual_${Date.now()}`;
  return rodarVerificacao(runId);
}
