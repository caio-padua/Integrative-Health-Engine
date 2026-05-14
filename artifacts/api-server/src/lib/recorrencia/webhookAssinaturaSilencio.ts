// PAWARDS MEDCORE · Task #256
// Cao-de-guarda do webhook ZapSign: avisa quando ninguem assina nada ha
// muito tempo (webhook silenciosamente quebrado).
//
// Por que existe:
//   A Task #129 documentou que quando o dominio Replit muda, a URL
//   configurada no painel ZapSign aponta pra um endpoint que nao
//   existe mais. O ZapSign continua entregando POSTs, mas chegam num
//   404 — falha em silencio. Resultado: NENHUMA linha nova entra em
//   `auditoria_assinaturas`, mas a fila de assinaturas pendentes infla.
//   Hoje so descobrimos quando alguem repara que a tabela esta vazia.
//
//   Diferente da Task #251 (`upload preso esperando o ZapSign reentregar`)
//   que vigia upload-INDIVIDUAL preso, esta task vigia o SILENCIO
//   AGREGADO da fila inteira.
//
// Comportamento:
//   - Tick a cada 60min (24x/dia).
//   - Pega ultima entrada em `auditoria_assinaturas.criado_em`.
//   - Pega total de `assinatura_solicitacoes` em status PENDENTE/ENVIADO/
//     PROCESSANDO criadas DENTRO da janela.
//   - Se silencio na janela (ultima_auditoria < now() - JANELA OU NULL)
//     E pendentes_no_periodo > 0, dispara aviso unico pro CEO.
//   - Janela configuravel via env `WEBHOOK_ASSINATURA_SILENCIO_HORAS`
//     (default 24h).
//   - Lock distribuido `pg_try_advisory_lock(30303033)` pra defesa
//     em profundidade (cluster sem duplicacao no mesmo tick).
//   - Idempotencia diaria por PRIMARY KEY em
//     `webhook_assinatura_silencio_alertas.dia_brt` + ON CONFLICT DO
//     NOTHING. Mesmo rodando 24x no dia, o Caio recebe APENAS 1 aviso
//     por dia — evita tsunami enquanto o webhook continua quebrado.
//   - Reusa fila `assinatura_notificacoes` com `is_sistema_ceo=true`
//     (bypassa opt-out e quiet hours) e `solicitacao_id=NULL` (nao tem
//     solicitacao unica vinculada — eh o silencio AGREGADO).
//
// Defensivo: nunca lanca; falha em silencio com log.

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const TICK_MS = 60 * 60 * 1000; // 60min
const ADVISORY_LOCK_ID = 30303033; // proximo apos pdfRetryUploadResumoDiario 30303032
const HORAS_JANELA_DEFAULT = 24;

let executandoAgora = false;
let workerStarted = false;

interface CeoDestinatario {
  email: string | null;
  telefone: string | null;
}

function hojeBrtISO(): string {
  // YYYY-MM-DD em America/Sao_Paulo (UTC-3 sem DST desde 2019)
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export interface DecidirSilencioWebhookInput {
  ultimaAuditoriaEm: Date | null;
  pendentesNoPeriodo: number;
  agora: Date;
  horasJanela: number;
}

export interface DecidirSilencioWebhookOutput {
  dispara: boolean;
  horasDesdeUltima: number;
  motivo:
    | "OK"
    | "SEM_PENDENTES_NA_JANELA"
    | "AUDITORIA_RECENTE"
    | "WEBHOOK_SILENCIOSO_COM_PENDENTES"
    | "WEBHOOK_NUNCA_RECEBEU_COM_PENDENTES";
}

const HORAS_DESDE_ULTIMA_INFINITO = 999_999;

/**
 * Decisao pura — exportada pra testes unitarios sem DB/lock/rede.
 *
 * Regra: dispara somente quando AMBAS condicoes sao verdadeiras:
 *   1. pendentesNoPeriodo > 0
 *      (sem pendentes na janela = nao tem o que assinar; silencio eh
 *      esperado, nao eh sintoma de webhook quebrado)
 *   2. (ultimaAuditoriaEm == null) OR (gap em horas >= horasJanela)
 *      (webhook nunca recebeu OU silencio prolongado)
 *
 * Quando ultimaAuditoriaEm == null usamos sentinel HORAS_DESDE_ULTIMA_INFINITO
 * pra distinguir "nunca recebeu" de gap calculado.
 */
export function decidirSilencioWebhook(
  input: DecidirSilencioWebhookInput,
): DecidirSilencioWebhookOutput {
  const { ultimaAuditoriaEm, pendentesNoPeriodo, agora, horasJanela } = input;

  const horasDesdeUltima = ultimaAuditoriaEm
    ? Math.floor((agora.getTime() - ultimaAuditoriaEm.getTime()) / (60 * 60 * 1000))
    : HORAS_DESDE_ULTIMA_INFINITO;

  if (pendentesNoPeriodo <= 0) {
    return { dispara: false, horasDesdeUltima, motivo: "SEM_PENDENTES_NA_JANELA" };
  }

  if (ultimaAuditoriaEm === null) {
    return { dispara: true, horasDesdeUltima, motivo: "WEBHOOK_NUNCA_RECEBEU_COM_PENDENTES" };
  }

  if (horasDesdeUltima < horasJanela) {
    return { dispara: false, horasDesdeUltima, motivo: "AUDITORIA_RECENTE" };
  }

  return { dispara: true, horasDesdeUltima, motivo: "WEBHOOK_SILENCIOSO_COM_PENDENTES" };
}

function lerHorasJanela(): number {
  const raw = process.env["WEBHOOK_ASSINATURA_SILENCIO_HORAS"];
  if (!raw) return HORAS_JANELA_DEFAULT;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
    return HORAS_JANELA_DEFAULT;
  }
  return n;
}

async function buscarUltimaAuditoria(): Promise<Date | null> {
  const r: any = await db.execute(sql`
    SELECT MAX(criado_em) AS ultima FROM auditoria_assinaturas
  `);
  const row = ((r.rows ?? r) as Array<{ ultima: Date | string | null }>)[0];
  if (!row || !row.ultima) return null;
  return row.ultima instanceof Date ? row.ultima : new Date(String(row.ultima));
}

async function contarPendentesNaJanela(horas: number): Promise<number> {
  // Pendentes = solicitacoes criadas DENTRO da janela e ainda em status
  // que aguarda webhook (PENDENTE/ENVIADO/PROCESSANDO). Solicitacoes
  // antigas fora da janela nao entram pra evitar falso positivo durante
  // o boot do sistema (pendentes legadas de antes da janela).
  const r: any = await db.execute(sql`
    SELECT COUNT(*)::int AS total
      FROM assinatura_solicitacoes
     WHERE status IN ('PENDENTE', 'ENVIADO', 'PROCESSANDO')
       AND criado_em > NOW() - (${horas}::int || ' hours')::interval
  `);
  const row = ((r.rows ?? r) as Array<{ total: number | string }>)[0];
  return row ? Number(row.total) : 0;
}

async function buscarTextoSilencio(): Promise<{ assunto: string; corpo: string } | null> {
  const r: any = await db.execute(sql`
    SELECT assunto, corpo
      FROM assinatura_textos_institucionais
     WHERE codigo = 'WEBHOOK_ASSINATURA_SILENCIO' AND ativo = true
     LIMIT 1
  `);
  const row = ((r.rows ?? r) as Array<{ assunto: string | null; corpo: string }>)[0];
  if (!row) return null;
  return {
    assunto: row.assunto || "[CEO] PAWARDS · Webhook ZapSign silencioso",
    corpo: row.corpo,
  };
}

async function buscarDestinatariosCEO(): Promise<CeoDestinatario[]> {
  const r: any = await db.execute(sql`
    SELECT email, telefone FROM usuarios
     WHERE perfil = 'validador_mestre' AND ativo = true
  `);
  return ((r.rows ?? r) as CeoDestinatario[]);
}

/**
 * Reserva o dia + enfileira notificacoes ATOMICAMENTE numa unica transacao.
 *
 * Se o INSERT da reserva falhar (conflito = ja disparou hoje), nao enfileira
 * nada. Se o enfileiramento falhar, a transacao rola back tambem — evita
 * falso positivo permanente de idempotencia em que o dia ficaria marcado
 * mas o Caio nunca recebe.
 */
async function reservarEEnfileirarAtomico(
  diaIso: string,
  horasJanela: number,
  pendentes: number,
  ultimaAuditoria: Date | null,
  destinatarios: CeoDestinatario[],
  assunto: string,
  corpo: string,
): Promise<{ reservou: boolean; email: number; whatsapp: number }> {
  return await db.transaction(async (tx) => {
    const r: any = await tx.execute(sql`
      INSERT INTO webhook_assinatura_silencio_alertas
        (dia_brt, horas_janela, pendentes_no_periodo, ultima_auditoria_em)
      VALUES
        (${diaIso}::date, ${horasJanela}, ${pendentes},
         ${ultimaAuditoria ? ultimaAuditoria.toISOString() : null})
      ON CONFLICT (dia_brt) DO NOTHING
      RETURNING dia_brt
    `);
    const reservou = ((r.rows ?? r) as Array<unknown>).length > 0;
    if (!reservou) return { reservou: false, email: 0, whatsapp: 0 };

    let email = 0;
    let whatsapp = 0;
    for (const ceo of destinatarios) {
      const emailDest = (ceo.email || "").trim();
      if (emailDest && emailDest.includes("@")) {
        await tx.execute(sql`
          INSERT INTO assinatura_notificacoes
            (solicitacao_id, canal, momento, destinatario, assunto, corpo,
             status, is_sistema_ceo)
          VALUES
            (NULL, 'EMAIL', 'WEBHOOK_ASSINATURA_SILENCIO', ${emailDest},
             ${assunto}, ${corpo}, 'PENDENTE', true)
        `);
        email += 1;
      }
      const telDest = (ceo.telefone || "").trim();
      if (telDest) {
        await tx.execute(sql`
          INSERT INTO assinatura_notificacoes
            (solicitacao_id, canal, momento, destinatario, corpo,
             status, is_sistema_ceo)
          VALUES
            (NULL, 'WHATSAPP', 'WEBHOOK_ASSINATURA_SILENCIO', ${telDest},
             ${corpo}, 'PENDENTE', true)
        `);
        whatsapp += 1;
      }
    }
    return { reservou: true, email, whatsapp };
  });
}

export interface WebhookSilencioRunResult {
  executou: boolean;
  motivo_skip?:
    | "sem_pendentes_na_janela"
    | "auditoria_recente"
    | "ja_disparado_hoje"
    | "sem_texto_institucional"
    | "sem_destinatarios";
  horas_janela: number;
  horas_desde_ultima: number;
  pendentes_no_periodo: number;
  ultima_auditoria_em: string | null;
  notificacoes_email: number;
  notificacoes_whatsapp: number;
  dia_brt: string;
}

async function rodarLogica(): Promise<WebhookSilencioRunResult> {
  const dia = hojeBrtISO();
  const horasJanela = lerHorasJanela();
  const out: WebhookSilencioRunResult = {
    executou: false,
    horas_janela: horasJanela,
    horas_desde_ultima: 0,
    pendentes_no_periodo: 0,
    ultima_auditoria_em: null,
    notificacoes_email: 0,
    notificacoes_whatsapp: 0,
    dia_brt: dia,
  };

  const ultimaAuditoria = await buscarUltimaAuditoria();
  const pendentes = await contarPendentesNaJanela(horasJanela);

  out.ultima_auditoria_em = ultimaAuditoria ? ultimaAuditoria.toISOString() : null;
  out.pendentes_no_periodo = pendentes;

  const decisao = decidirSilencioWebhook({
    ultimaAuditoriaEm: ultimaAuditoria,
    pendentesNoPeriodo: pendentes,
    agora: new Date(),
    horasJanela,
  });
  out.horas_desde_ultima = decisao.horasDesdeUltima;

  if (!decisao.dispara) {
    out.motivo_skip = decisao.motivo === "SEM_PENDENTES_NA_JANELA"
      ? "sem_pendentes_na_janela"
      : "auditoria_recente";
    return out;
  }

  const texto = await buscarTextoSilencio();
  if (!texto) {
    console.warn(
      `[webhookAssinaturaSilencio] texto institucional WEBHOOK_ASSINATURA_SILENCIO ausente — skip`,
    );
    out.motivo_skip = "sem_texto_institucional";
    return out;
  }

  const destinatarios = await buscarDestinatariosCEO();
  if (destinatarios.length === 0) {
    console.warn(`[webhookAssinaturaSilencio] nenhum validador_mestre ativo — skip`);
    out.motivo_skip = "sem_destinatarios";
    return out;
  }

  const ultimaTxt = ultimaAuditoria
    ? ultimaAuditoria.toISOString().slice(0, 16).replace("T", " ") + " UTC"
    : "(nunca)";
  const horasTxt = decisao.horasDesdeUltima === HORAS_DESDE_ULTIMA_INFINITO
    ? `>=${horasJanela}`
    : String(decisao.horasDesdeUltima);
  const assunto = texto.assunto
    .replace(/\{HORAS\}/g, horasTxt)
    .replace(/\{PENDENTES\}/g, String(pendentes))
    .replace(/\{ULTIMA_AUDITORIA\}/g, ultimaTxt);
  const corpo = texto.corpo
    .replace(/\{HORAS\}/g, horasTxt)
    .replace(/\{PENDENTES\}/g, String(pendentes))
    .replace(/\{ULTIMA_AUDITORIA\}/g, ultimaTxt);

  const stats = await reservarEEnfileirarAtomico(
    dia, horasJanela, pendentes, ultimaAuditoria,
    destinatarios, assunto, corpo,
  );
  if (!stats.reservou) {
    out.motivo_skip = "ja_disparado_hoje";
    return out;
  }
  out.executou = true;
  out.notificacoes_email = stats.email;
  out.notificacoes_whatsapp = stats.whatsapp;

  console.log(
    `[webhookAssinaturaSilencio] aviso enfileirado dia=${dia} ` +
    `horas_desde_ultima=${horasTxt} pendentes=${pendentes} ` +
    `email=${stats.email} whatsapp=${stats.whatsapp}`,
  );
  return out;
}

async function tickComLock(): Promise<void> {
  if (executandoAgora) return;
  executandoAgora = true;
  let lockOk = false;
  try {
    const r: any = await db.execute(
      sql`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID}) AS got`,
    );
    lockOk = Boolean(((r.rows ?? r)[0] || {}).got);
    if (!lockOk) return;
    await rodarLogica();
  } catch (e) {
    console.error("[webhookAssinaturaSilencio] erro fatal no tick:", (e as Error).message);
  } finally {
    if (lockOk) {
      try {
        await db.execute(sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`);
      } catch (e) {
        console.error("[webhookAssinaturaSilencio] erro release lock:", (e as Error).message);
      }
    }
    executandoAgora = false;
  }
}

export function iniciarWorkerWebhookAssinaturaSilencio(): void {
  if (workerStarted) return;
  workerStarted = true;
  console.log(
    `[webhookAssinaturaSilencio] Worker iniciado (tick ${TICK_MS / 60000}min, ` +
    `janela default ${HORAS_JANELA_DEFAULT}h via WEBHOOK_ASSINATURA_SILENCIO_HORAS)`,
  );
  // Primeiro tick com folga pra app subir + outras conexoes pegarem fila.
  setTimeout(() => { void tickComLock(); }, 5 * 60 * 1000).unref();
  setInterval(() => { void tickComLock(); }, TICK_MS).unref();
}

/** Disparo manual pra testes / endpoint admin (independente de horario). */
export async function rodarWebhookSilencioAgora(): Promise<WebhookSilencioRunResult> {
  return rodarLogica();
}
