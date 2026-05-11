// PAWARDS MEDCORE · Wave 10.5 task #39
// Worker de retry pra upload de PDF assinado no bucket.
//
// Contexto: na task #34 o upload do PDF assinado pro bucket eh defensivo.
// Quando falha (rede, sidecar, bucket cheio), `assinatura_webhook_eventos`
// guarda `erro_processamento` com o prefixo `pdf_upload_falhou: ...`. Este
// worker varre esses eventos e retenta:
//   1. Baixa o PDF de novo via adapter (downloadSignedArtifact);
//   2. Faz upload no bucket (uploadPdfAssinado);
//   3. Atualiza `auditoria_assinaturas.pdf_storage_key` (se a auditoria
//      jah existir — pode nao existir se o webhook abortou antes do
//      manifesto, e nesse caso o webhook reentregue ZapSign vai criar);
//   4. Limpa `erro_processamento` e marca `processado = true` no evento;
//   5. Garante que a `assinatura_solicitacoes` esta CONCLUIDO.
//
// Backoff exponencial: 1min, 5min, 15min, 1h, 6h. Maximo 5 tentativas.
// Janela de varredura: ultimos 7 dias (eventos mais antigos sao deixados
// pra inspecao manual — ZapSign tambem nao reentrega indefinidamente).
//
// Tick: 5 minutos (igual ao tick mais agressivo do projeto). Idempotente
// via UPDATE atomico que incrementa `tentativas_retry` antes de tentar.

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { getAdapter } from "../assinatura/adapters";
import { uploadPdfAssinado } from "../assinatura/objectStorage";
import type { ProvedorCodigo } from "../assinatura/types";

const TICK_MS = 5 * 60 * 1000; // 5min
const MAX_TENTATIVAS = 5;
const JANELA_DIAS = 7;
const ADVISORY_LOCK_ID = 30393939; // Wave 10.5 task #39, fixo, sem colisao

// Backoff em minutos por tentativa (indice = tentativas_retry ANTES desta tentativa).
// tentativas_retry=0 -> espera 1min depois do recebido_em
// tentativas_retry=1 -> espera 5min depois da ultima_tentativa_em
// ... ate 6h.
const BACKOFF_MIN: readonly number[] = [1, 5, 15, 60, 360];

let executandoAgora = false;

interface EventoFalho {
  id: number;
  provedor_codigo: ProvedorCodigo;
  envelope_id: string | null;
  payload_bruto: Record<string, unknown>;
  tentativas_retry: number;
}

async function buscarEventosElegiveis(): Promise<EventoFalho[]> {
  // Filtra:
  //  - prefixo do erro
  //  - ainda dentro da janela de 7 dias
  //  - tentativas < MAX
  //  - backoff respeitado: NOW() >= COALESCE(ultima_tentativa_em, recebido_em)
  //                        + interval(BACKOFF_MIN[tentativas_retry])
  // O backoff eh montado em SQL via CASE WHEN pra evitar IO entre selecao
  // e elegibilidade.
  const r: any = await db.execute(sql`
    SELECT id, provedor_codigo, envelope_id, payload_bruto, tentativas_retry
    FROM assinatura_webhook_eventos
    WHERE erro_processamento LIKE 'pdf_upload_falhou:%'
      AND recebido_em > NOW() - INTERVAL '${sql.raw(String(JANELA_DIAS))} days'
      AND tentativas_retry < ${MAX_TENTATIVAS}
      AND NOW() >= COALESCE(ultima_tentativa_em, recebido_em) + (
        CASE tentativas_retry
          WHEN 0 THEN INTERVAL '1 minute'
          WHEN 1 THEN INTERVAL '5 minutes'
          WHEN 2 THEN INTERVAL '15 minutes'
          WHEN 3 THEN INTERVAL '1 hour'
          ELSE INTERVAL '6 hours'
        END
      )
    ORDER BY recebido_em ASC
    LIMIT 50
  `);
  return (r.rows ?? r) as EventoFalho[];
}

async function reservarTentativa(eventoId: number, tentativasAntes: number): Promise<boolean> {
  // UPDATE condicional: so reserva se tentativas_retry ainda for o valor que
  // lemos. Garante que dois ticks concorrentes nao retentem o mesmo evento.
  const r: any = await db.execute(sql`
    UPDATE assinatura_webhook_eventos
    SET tentativas_retry = tentativas_retry + 1,
        ultima_tentativa_em = NOW()
    WHERE id = ${eventoId}
      AND tentativas_retry = ${tentativasAntes}
    RETURNING id
  `);
  return ((r.rows ?? r) as Array<unknown>).length > 0;
}

async function processarEvento(ev: EventoFalho): Promise<{ ok: boolean; motivo?: string }> {
  const envelopeId = ev.envelope_id || extrairEnvelopeIdDoPayload(ev.payload_bruto);
  if (!envelopeId) return { ok: false, motivo: "envelope_id_ausente" };

  // Solicitacao correspondente. Pode nao ter solicitacao_id setado no evento
  // (fica em branco quando upload falhou antes de ligar o evento), por isso
  // resolvemos via envelope_id + provedor.
  const sol: any = await db.execute(sql`
    SELECT id, status, zapsign_external_id
    FROM assinatura_solicitacoes
    WHERE provedor_envelope_id = ${envelopeId}
      AND provedor_codigo = ${ev.provedor_codigo}
    LIMIT 1
  `);
  const solRow = (sol.rows ?? sol)[0] as { id: number; status: string; zapsign_external_id: string | null } | undefined;
  if (!solRow) return { ok: false, motivo: "solicitacao_nao_encontrada" };

  // 1. Baixa o PDF de novo
  const adapter = getAdapter(ev.provedor_codigo);
  const pdf = await adapter.downloadSignedArtifact(envelopeId);
  if (!pdf || pdf.length === 0) return { ok: false, motivo: "download_vazio" };

  // 2. Upload no bucket
  const up = await uploadPdfAssinado(solRow.zapsign_external_id || envelopeId, pdf);
  const pdfStorageKey = up.storageKey;
  const hashAssinado = createHash("sha256").update(pdf).digest("hex");

  // 3. Atualiza pdf_storage_key na auditoria correspondente (se existir).
  // Usa envelope_id pq signature_id pode variar por signatario; nao queremos
  // inserir manifesto novo aqui (o webhook eh dono dessa logica) — apenas
  // promover o pointer logico pra fisico nas linhas que jah caíram no fallback.
  // Code-review fix Wave 10.5 task #39: capturamos quantas linhas foram
  // atualizadas pra decidir se podemos marcar processado=true. Sem auditoria
  // existente, a finalizacao do evento eh responsabilidade do webhook
  // (gravacao do manifesto SHA-256) — se marcassemos processado aqui,
  // a reentrega ZapSign cairia no caminho de duplicado e o manifesto nunca
  // seria gravado.
  const updRes: any = await db.execute(sql`
    UPDATE auditoria_assinaturas
    SET pdf_storage_key = ${pdfStorageKey}
    WHERE envelope_id = ${envelopeId}
      AND (pdf_storage_key IS NULL OR pdf_storage_key NOT LIKE ${up.bucket + '/%'})
    RETURNING id
  `);
  const auditoriaAtualizada = ((updRes.rows ?? updRes) as Array<unknown>).length > 0;

  // 4. Garante que a solicitacao esta CONCLUIDO (pode estar em ENVIADO se
  // a 1a tentativa abortou antes de marcar concluido). Idempotente.
  if (solRow.status !== "CONCLUIDO" && solRow.status !== "REJEITADO") {
    await db.execute(sql`
      UPDATE assinatura_solicitacoes
      SET status = 'CONCLUIDO',
          concluido_em = COALESCE(concluido_em, NOW()),
          hash_assinado = COALESCE(hash_assinado, ${hashAssinado}),
          atualizado_em = NOW()
      WHERE id = ${solRow.id}
    `);
  }

  if (!auditoriaAtualizada) {
    // Nao ha manifesto — upload OK porem deixamos o evento PENDENTE pra
    // reentrega ZapSign criar o manifesto pelo caminho canonico. Re-grava
    // erro com prefixo proprio pra worker NAO retentar em loop.
    await db.execute(sql`
      UPDATE assinatura_webhook_eventos
      SET erro_processamento = ${'pdf_upload_falhou_sem_manifesto: aguardando webhook reentregar'}
      WHERE id = ${ev.id}
    `);
    return { ok: false, motivo: "auditoria_inexistente_aguardando_webhook" };
  }

  // 5. Manifesto presente + storage atualizado. Limpa erro e marca processado.
  await db.execute(sql`
    UPDATE assinatura_webhook_eventos
    SET erro_processamento = NULL,
        processado = true,
        processado_em = NOW(),
        solicitacao_id = COALESCE(solicitacao_id, ${solRow.id})
    WHERE id = ${ev.id}
  `);

  return { ok: true };
}

function extrairEnvelopeIdDoPayload(payload: Record<string, unknown>): string | null {
  // ZapSign coloca em `token` ou `external_id`; Clicksign em `document.key`.
  const p = payload as { token?: string; external_id?: string; document?: { key?: string } };
  return p.token || p.external_id || p.document?.key || null;
}

async function rodarCiclo(runId: string): Promise<{ tentados: number; sucesso: number; falhou: number; bloqueados: number }> {
  const stats = { tentados: 0, sucesso: 0, falhou: 0, bloqueados: 0 };
  const eventos = await buscarEventosElegiveis();
  for (const ev of eventos) {
    const reservou = await reservarTentativa(ev.id, ev.tentativas_retry);
    if (!reservou) {
      stats.bloqueados += 1;
      continue;
    }
    stats.tentados += 1;
    try {
      const r = await processarEvento(ev);
      if (r.ok) {
        stats.sucesso += 1;
        console.log(`[pdfRetryUpload ${runId}] OK evento=${ev.id} envelope=${ev.envelope_id} tentativa=${ev.tentativas_retry + 1}`);
      } else {
        stats.falhou += 1;
        // Code-review fix Wave 10.5 task #39: motivo `auditoria_inexistente_*`
        // significa que processarEvento JA gravou o marcador
        // `pdf_upload_falhou_sem_manifesto:` (que NAO matcha o filtro de
        // elegibilidade). Sobrescrever aqui com o prefixo retriable colocaria
        // o evento de volta na fila — exatamente o oposto da intencao. Apenas
        // logamos.
        if (r.motivo && r.motivo.startsWith("auditoria_inexistente")) {
          console.warn(`[pdfRetryUpload ${runId}] aguardando webhook reentregar evento=${ev.id} motivo=${r.motivo}`);
        } else {
          // Re-grava motivo claro pra inspecao manual; mantem prefixo pra
          // proximo ciclo continuar varrendo (ate atingir MAX_TENTATIVAS).
          await db.execute(sql`
            UPDATE assinatura_webhook_eventos
            SET erro_processamento = ${'pdf_upload_falhou: retry ' + (ev.tentativas_retry + 1) + ' ' + (r.motivo ?? 'desconhecido')}
            WHERE id = ${ev.id}
          `);
          console.warn(`[pdfRetryUpload ${runId}] FALHOU evento=${ev.id} motivo=${r.motivo}`);
        }
      }
    } catch (e) {
      stats.falhou += 1;
      const msg = (e as Error).message || "erro_desconhecido";
      await db.execute(sql`
        UPDATE assinatura_webhook_eventos
        SET erro_processamento = ${'pdf_upload_falhou: retry ' + (ev.tentativas_retry + 1) + ' ' + msg}
        WHERE id = ${ev.id}
      `);
      console.error(`[pdfRetryUpload ${runId}] erro evento=${ev.id}:`, msg);
    }
  }
  return stats;
}

export function iniciarWorkerPdfRetryUpload(): void {
  console.log(`[pdfRetryUpload] Worker iniciado (tick ${TICK_MS / 60000}min, max ${MAX_TENTATIVAS} tentativas, janela ${JANELA_DIAS}d)`);
  setInterval(() => {
    void (async () => {
      if (executandoAgora) return;
      executandoAgora = true;
      const runId = `run_${Date.now()}`;
      let lockAdquirido = false;
      try {
        const lockRes: any = await db.execute(sql`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID}) AS got`);
        lockAdquirido = Boolean(((lockRes.rows ?? lockRes)[0] as { got?: boolean })?.got);
        if (!lockAdquirido) return;
        const stats = await rodarCiclo(runId);
        if (stats.tentados > 0 || stats.bloqueados > 0) {
          console.log(`[pdfRetryUpload ${runId}] tentados=${stats.tentados} sucesso=${stats.sucesso} falhou=${stats.falhou} bloqueados=${stats.bloqueados}`);
        }
      } catch (e) {
        console.error(`[pdfRetryUpload ${runId}] erro fatal:`, (e as Error).message);
      } finally {
        if (lockAdquirido) {
          try { await db.execute(sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`); } catch { /* defensivo */ }
        }
        executandoAgora = false;
      }
    })();
  }, TICK_MS);
}

// Exposto pra teste manual / endpoint admin
export async function rodarPdfRetryUploadAgora(): Promise<{ tentados: number; sucesso: number; falhou: number; bloqueados: number }> {
  return rodarCiclo(`manual_${Date.now()}`);
}
