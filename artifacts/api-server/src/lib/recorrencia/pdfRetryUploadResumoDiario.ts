// PAWARDS MEDCORE · Wave 10.7 · Task #58
// Worker DIARIO de resumo consolidado de uploads de PDF esgotados.
//
// Por que existe:
//   A task #50 (worker `pdfRetryUpload.ts` + migration 038) ja dispara 1 alerta
//   por contrato esgotado. Em cenario de degradacao em massa (bucket cai de
//   madrugada e 50 webhooks chegam juntos), isso vira 50 e-mails + 50 WhatsApps
//   em sequencia — alerta-tsunami que afoga o sinal no ruido.
//
//   Este worker varre, uma vez por dia, eventos com `pdf_upload_falhou:%` que
//   esgotaram as 5 tentativas nas ultimas 24h. Se forem >= 3, dispara UM unico
//   alerta consolidado pro CEO com a lista — protege contra o tsunami e ainda
//   da visibilidade de tendencia (0 ontem, 12 hoje = anomalia clara).
//
// Comportamento:
//   - Tick a cada 60min, mas executa a logica pesada APENAS as 08:00 BRT
//     (mesmo padrao defensivo do parqStatusUpdate.ts).
//   - Idempotente por dia via PRIMARY KEY em `pdf_upload_resumo_diario.dia_brt`
//     (ON CONFLICT DO NOTHING). Mesmo que o tick rode varias vezes na janela
//     das 08:00 (ou que dois pods rodem em paralelo), o Caio recebe APENAS
//     1 resumo por dia.
//   - Lock distribuido `pg_try_advisory_lock(30303032)` pra defesa em
//     profundidade (cluster sem duplicacao no mesmo tick).
//   - Threshold: >= 3 eventos esgotados na janela. Abaixo disso, os alertas
//     individuais da task #50 ja sao suficientes — nao precisa consolidar.
//   - Reusa a fila `assinatura_notificacoes` com `is_sistema_ceo=true` (bypassa
//     opt-out e quiet hours) e `solicitacao_id=NULL` (nao tem solicitacao
//     unica vinculada — eh uma agregacao de varias).
//
// Defensivo: nunca lanca; falha em silencio com log.

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { AGUARDANDO_WEBHOOK_LIMITE_HORAS } from "./pdfRetryUpload.js";

const TICK_MS = 60 * 60 * 1000; // 60min
const HORA_EXEC_BRT = 8; // 08:00 BRT (Brasilia, UTC-3 sem DST)
const ADVISORY_LOCK_ID = 30303032; // proximo apos alertaCEO 30303031
const LIMIAR_ESGOTADOS = 3; // a partir de quantos esgotados consolida

let executandoAgora = false;
let workerStarted = false;

interface EventoEsgotado {
  evento_id: number;
  envelope_id: string | null;
  ultima_tentativa_em: string | null;
  motivo: string | null;
  solicitacao_id: number | null;
  template_nome: string | null;
  paciente_nome: string | null;
  // Task #393 — quantas horas o evento esta preso (NOW() - ultima_tentativa_em
  // ou recebido_em). Mesma convencao que /assinaturas/uploads-falhos (task #247).
  preso_ha_horas: number | null;
}

function nowBrtHour(): number {
  // Brasilia eh UTC-3 sempre (sem DST desde 2019)
  const utcH = new Date().getUTCHours();
  return (utcH - 3 + 24) % 24;
}

function hojeBrtISO(): string {
  // YYYY-MM-DD em America/Sao_Paulo (UTC-3)
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

async function buscarEventosEsgotados24h(): Promise<EventoEsgotado[]> {
  // Esgotado = tentativas_retry >= 5 (MAX do worker pdfRetryUpload) com prefixo
  // `pdf_upload_falhou:` (NAO o sentinel `pdf_upload_falhou_sem_manifesto:` que
  // significa apenas "aguardando webhook reentregar"). A janela usa
  // `ultima_tentativa_em` — eh o instante real do esgotamento.
  const r: any = await db.execute(sql`
    SELECT
      e.id                                  AS evento_id,
      e.envelope_id                         AS envelope_id,
      e.ultima_tentativa_em                 AS ultima_tentativa_em,
      e.erro_processamento                  AS motivo,
      s.id                                  AS solicitacao_id,
      t.nome_exibicao                       AS template_nome,
      p.nome                                AS paciente_nome,
      -- Task #393 — tempo preso em horas decimais (mesma convencao do
      -- endpoint /api/assinaturas/uploads-falhos da task #247). Usa
      -- COALESCE pra cobrir eventos cuja ultima_tentativa_em ainda eh NULL
      -- (situacao rara — esgotado sem nenhuma tentativa marcada).
      ROUND(
        EXTRACT(EPOCH FROM (NOW() - COALESCE(e.ultima_tentativa_em, e.recebido_em)))::numeric / 3600.0,
        1
      )::float8                              AS preso_ha_horas
    FROM assinatura_webhook_eventos e
    LEFT JOIN assinatura_solicitacoes s
      ON s.provedor_envelope_id = e.envelope_id
     AND s.provedor_codigo = e.provedor_codigo
    LEFT JOIN assinatura_templates t ON t.id = s.template_id
    LEFT JOIN pacientes p ON p.id = s.paciente_id
    WHERE e.erro_processamento LIKE 'pdf_upload_falhou:%'
      AND e.tentativas_retry >= 5
      AND e.ultima_tentativa_em > NOW() - INTERVAL '24 hours'
    ORDER BY e.ultima_tentativa_em ASC
    LIMIT 500
  `);
  return ((r.rows ?? r) as EventoEsgotado[]).map((ev) => ({
    ...ev,
    preso_ha_horas: ev.preso_ha_horas != null ? Number(ev.preso_ha_horas) : null,
  }));
}

async function buscarTextoInstitucional(): Promise<{ assunto: string; corpo: string } | null> {
  const r: any = await db.execute(sql`
    SELECT assunto, corpo
    FROM assinatura_textos_institucionais
    WHERE codigo = 'UPLOAD_PDF_RESUMO_DIARIO' AND ativo = true
    LIMIT 1
  `);
  const row = ((r.rows ?? r) as Array<{ assunto: string | null; corpo: string }>)[0];
  if (!row) return null;
  return {
    assunto: row.assunto || "[CEO] PAWARDS · Resumo diario · uploads de PDF esgotados",
    corpo: row.corpo,
  };
}

interface CeoDestinatario {
  email: string | null;
  telefone: string | null;
}

async function buscarDestinatariosCEO(): Promise<CeoDestinatario[]> {
  const r: any = await db.execute(sql`
    SELECT email, telefone FROM usuarios
    WHERE perfil = 'validador_mestre' AND ativo = true
  `);
  return ((r.rows ?? r) as CeoDestinatario[]);
}

function montarLista(eventos: EventoEsgotado[], baseUrl: string): string {
  return eventos.map((ev, i) => {
    const idx = String(i + 1).padStart(2, "0");
    const template = ev.template_nome || "(template desconhecido)";
    const paciente = ev.paciente_nome || "(sem paciente)";
    const envelope = ev.envelope_id || "(envelope ausente)";
    const link = ev.solicitacao_id
      ? `${baseUrl}/assinaturas/${ev.solicitacao_id}`
      : "(sem solicitacao vinculada)";
    const motivoLimpo = (ev.motivo || "")
      .replace(/^pdf_upload_falhou:\s*/, "")
      .slice(0, 120);
    return [
      `${idx}. ${template} — ${paciente}`,
      `    Envelope: ${envelope}`,
      `    Evento: #${ev.evento_id} · ultima falha: ${motivoLimpo}`,
      `    Detalhe: ${link}`,
    ].join("\n");
  }).join("\n\n");
}

/**
 * Reserva o dia + enfileira notificacoes ATOMICAMENTE numa unica transacao.
 *
 * Code-review fix task #58: a versao anterior fazia 2 passos (reservar dia,
 * depois enfileirar). Se o enfileiramento falhasse depois da reserva, o dia
 * ficava marcado como "ja disparado" mas o Caio nunca recebia o resumo —
 * falso positivo permanente de idempotencia. Embrulhando os dois em
 * BEGIN/COMMIT, qualquer falha derruba o INSERT da reserva tambem, e o
 * proximo tick tenta de novo.
 *
 * Tambem troca `sql.raw` por bind parametrizado em `evento_ids` (defesa em
 * profundidade — embora valores venham de IDs numericos do DB, nada de raw).
 *
 * Retorno:
 *   { reservou: true, ... }  → reserva + envio efetivamente realizados
 *   { reservou: false }       → dia ja tinha sido disparado (skip silencioso)
 */
async function reservarEEnfileirarAtomico(
  diaIso: string,
  totalEsgotados: number,
  eventoIds: number[],
  destinatarios: CeoDestinatario[],
  assunto: string,
  corpo: string,
): Promise<{ reservou: boolean; email: number; whatsapp: number }> {
  return await db.transaction(async (tx) => {
    const r: any = await tx.execute(sql`
      INSERT INTO pdf_upload_resumo_diario
        (dia_brt, total_esgotados, evento_ids)
      VALUES
        (${diaIso}::date, ${totalEsgotados}, ${eventoIds}::int[])
      ON CONFLICT (dia_brt) DO NOTHING
      RETURNING dia_brt
    `);
    const reservou = ((r.rows ?? r) as Array<unknown>).length > 0;
    if (!reservou) {
      return { reservou: false, email: 0, whatsapp: 0 };
    }

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
            (NULL, 'EMAIL', 'UPLOAD_PDF_RESUMO_DIARIO', ${emailDest},
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
            (NULL, 'WHATSAPP', 'UPLOAD_PDF_RESUMO_DIARIO', ${telDest},
             ${corpo}, 'PENDENTE', true)
        `);
        whatsapp += 1;
      }
    }
    return { reservou: true, email, whatsapp };
  });
}

export interface ResumoDiarioRunResult {
  executou: boolean;
  motivo_skip?: "fora_da_janela" | "abaixo_do_limiar" | "ja_disparado_hoje" | "sem_texto_institucional" | "sem_destinatarios";
  total_esgotados: number;
  notificacoes_email: number;
  notificacoes_whatsapp: number;
  dia_brt: string;
}

async function rodarLogica(forcar = false): Promise<ResumoDiarioRunResult> {
  const dia = hojeBrtISO();
  const out: ResumoDiarioRunResult = {
    executou: false,
    total_esgotados: 0,
    notificacoes_email: 0,
    notificacoes_whatsapp: 0,
    dia_brt: dia,
  };

  if (!forcar && nowBrtHour() !== HORA_EXEC_BRT) {
    out.motivo_skip = "fora_da_janela";
    return out;
  }

  const eventos = await buscarEventosEsgotados24h();
  out.total_esgotados = eventos.length;

  if (eventos.length < LIMIAR_ESGOTADOS) {
    out.motivo_skip = "abaixo_do_limiar";
    return out;
  }

  const texto = await buscarTextoInstitucional();
  if (!texto) {
    console.warn(`[pdfRetryUploadResumoDiario] texto institucional UPLOAD_PDF_RESUMO_DIARIO ausente — skip`);
    out.motivo_skip = "sem_texto_institucional";
    return out;
  }

  const destinatarios = await buscarDestinatariosCEO();
  if (destinatarios.length === 0) {
    console.warn(`[pdfRetryUploadResumoDiario] nenhum validador_mestre ativo — skip`);
    out.motivo_skip = "sem_destinatarios";
    return out;
  }

  const baseUrl = (
    process.env["PUBLIC_APP_URL"] ||
    (process.env["REPLIT_DOMAINS"] ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0].trim()}` : "") ||
    "http://localhost:80"
  ).replace(/\/+$/, "");
  const lista = montarLista(eventos, baseUrl);
  const assunto = texto.assunto.replace(/\{TOTAL\}/g, String(eventos.length));
  const corpo = texto.corpo
    .replace(/\{TOTAL\}/g, String(eventos.length))
    .replace(/\{LISTA\}/g, lista);

  // Reserva + enfileira na mesma transacao — qualquer falha rola back tudo,
  // evitando falso positivo permanente de idempotencia.
  const eventoIds = eventos.map((e) => e.evento_id);
  const stats = await reservarEEnfileirarAtomico(
    dia, eventos.length, eventoIds, destinatarios, assunto, corpo,
  );
  if (!stats.reservou) {
    out.motivo_skip = "ja_disparado_hoje";
    return out;
  }
  out.executou = true;
  out.notificacoes_email = stats.email;
  out.notificacoes_whatsapp = stats.whatsapp;

  console.log(
    `[pdfRetryUploadResumoDiario] resumo enfileirado dia=${dia} total=${eventos.length} ` +
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
    await rodarLogica(false);
    // Task #252 — verificacao auxiliar de silencio do proprio worker.
    // Encapsulada num try/catch defensivo pra nao quebrar o tick principal
    // se a migration 059 ainda nao tiver sido aplicada.
    try {
      await rodarLogicaSilencio();
    } catch (e) {
      console.error(
        "[pdfRetryUploadResumoDiario:silencio] erro no tick auxiliar:",
        (e as Error).message,
      );
    }
  } catch (e) {
    console.error("[pdfRetryUploadResumoDiario] erro fatal no tick:", (e as Error).message);
  } finally {
    if (lockOk) {
      try {
        await db.execute(sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`);
      } catch (e) {
        console.error("[pdfRetryUploadResumoDiario] erro release lock:", (e as Error).message);
      }
    }
    executandoAgora = false;
  }
}

export function iniciarWorkerPdfRetryUploadResumoDiario(): void {
  if (workerStarted) return;
  workerStarted = true;
  console.log(
    `[pdfRetryUploadResumoDiario] Worker iniciado (tick ${TICK_MS / 60000}min, exec ${HORA_EXEC_BRT}:00 BRT, limiar ${LIMIAR_ESGOTADOS})`,
  );
  setInterval(() => { void tickComLock(); }, TICK_MS).unref();
}

/** Disparo manual pra testes / endpoint admin (forca execucao independente de horario). */
export async function rodarResumoDiarioAgora(): Promise<ResumoDiarioRunResult> {
  return rodarLogica(true);
}

// ============================================================================
// Task #252 — Tick auxiliar: aviso "worker do resumo diario silencioso".
//
// Por que existe: este mesmo worker insere 1 linha por dia em
// `pdf_upload_resumo_diario`. Se o tick agendado das 08:00 cair em silencio
// (cluster mata setInterval, env some, container reinicia exatamente naquela
// janela), nenhuma linha eh escrita e o Caio so descobre quando abrir
// /admin/uploads-pdf-resumo (task #70). Este tick auxiliar fecha o buraco:
// detecta gap >= N dias E confirma que existem eventos esgotados pendentes
// (i.e., o worker DEVERIA ter disparado e nao disparou) — entao manda 1
// aviso unico pro CEO via fila assinatura_notificacoes (mesmo canal do
// resumo, com `is_sistema_ceo=true`).
//
// Idempotencia: PRIMARY KEY em pdf_upload_resumo_diario_silencio_alertas.dia_brt
// + ON CONFLICT DO NOTHING. Mesmo que o tick rode 24x no dia (a cada 60min),
// o Caio recebe APENAS 1 aviso de silencio por dia — evita tsunami enquanto
// o worker continua caido.
//
// Defensivo: nunca lanca; falha em silencio com log.
// ============================================================================

const SILENCIO_DIAS_DEFAULT = 7;
const SILENCIO_LIMIAR_ESGOTADOS_DEFAULT = LIMIAR_ESGOTADOS;
const DIAS_SEM_RESUMO_INFINITO = 9999;

export interface DecidirSilencioInput {
  ultimaEntradaEm: Date | null;
  totalEsgotados24h: number;
  agora: Date;
  diasMin: number;
  limiarEsgotados: number;
}

export interface DecidirSilencioOutput {
  dispara: boolean;
  diasSemResumo: number;
  motivo:
    | "OK"
    | "ABAIXO_DO_LIMIAR_ESGOTADOS"
    | "GAP_ABAIXO_DO_MIN"
    | "WORKER_SILENCIOSO_NUNCA_RODOU"
    | "WORKER_SILENCIOSO_GAP_LONGO";
}

/**
 * Decisao pura — exportada pra testes unitarios sem DB/lock/rede.
 *
 * Regra: dispara somente quando AMBAS condicoes sao verdadeiras:
 *   1. totalEsgotados24h >= limiarEsgotados
 *      (evita falso positivo em periodos saudaveis em que simplesmente nao
 *      houve esgotados — ex.: bucket estavel ha semanas)
 *   2. (ultimaEntradaEm == null) OR (gap em dias >= diasMin)
 *      (worker nunca rodou OU silencio prolongado)
 *
 * `diasSemResumo` eh sempre retornado pra observabilidade, mesmo quando nao
 * dispara. Quando ultimaEntradaEm == null usamos o sentinel
 * DIAS_SEM_RESUMO_INFINITO pra distinguir "nunca rodou" de gap calculado.
 */
export function decidirSilencio(input: DecidirSilencioInput): DecidirSilencioOutput {
  const { ultimaEntradaEm, totalEsgotados24h, agora, diasMin, limiarEsgotados } = input;

  const diasSemResumo = ultimaEntradaEm
    ? Math.floor((agora.getTime() - ultimaEntradaEm.getTime()) / (24 * 60 * 60 * 1000))
    : DIAS_SEM_RESUMO_INFINITO;

  if (totalEsgotados24h < limiarEsgotados) {
    return { dispara: false, diasSemResumo, motivo: "ABAIXO_DO_LIMIAR_ESGOTADOS" };
  }

  if (ultimaEntradaEm === null) {
    return { dispara: true, diasSemResumo, motivo: "WORKER_SILENCIOSO_NUNCA_RODOU" };
  }

  if (diasSemResumo < diasMin) {
    return { dispara: false, diasSemResumo, motivo: "GAP_ABAIXO_DO_MIN" };
  }

  return { dispara: true, diasSemResumo, motivo: "WORKER_SILENCIOSO_GAP_LONGO" };
}

function lerDiasMinSilencio(): number {
  const raw = process.env["PDF_RESUMO_DIARIO_SILENCIO_DIAS_MIN"];
  if (!raw) return SILENCIO_DIAS_DEFAULT;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
    return SILENCIO_DIAS_DEFAULT;
  }
  return n;
}

async function buscarUltimaEntradaResumo(): Promise<Date | null> {
  const r: any = await db.execute(sql`
    SELECT MAX(notificado_em) AS ultima FROM pdf_upload_resumo_diario
  `);
  const row = ((r.rows ?? r) as Array<{ ultima: Date | string | null }>)[0];
  if (!row || !row.ultima) return null;
  return row.ultima instanceof Date ? row.ultima : new Date(String(row.ultima));
}

async function contarEsgotados24h(): Promise<number> {
  const r: any = await db.execute(sql`
    SELECT COUNT(*)::int AS total
      FROM assinatura_webhook_eventos
     WHERE erro_processamento LIKE 'pdf_upload_falhou:%'
       AND tentativas_retry >= 5
       AND ultima_tentativa_em > NOW() - INTERVAL '24 hours'
  `);
  const row = ((r.rows ?? r) as Array<{ total: number | string }>)[0];
  return row ? Number(row.total) : 0;
}

async function buscarTextoSilencio(): Promise<{ assunto: string; corpo: string } | null> {
  const r: any = await db.execute(sql`
    SELECT assunto, corpo
      FROM assinatura_textos_institucionais
     WHERE codigo = 'UPLOAD_PDF_RESUMO_DIARIO_SILENCIO' AND ativo = true
     LIMIT 1
  `);
  const row = ((r.rows ?? r) as Array<{ assunto: string | null; corpo: string }>)[0];
  if (!row) return null;
  return {
    assunto: row.assunto || "[CEO] PAWARDS · Worker do resumo diario de PDFs travados parou",
    corpo: row.corpo,
  };
}

export interface SilencioRunResult {
  executou: boolean;
  motivo_skip?:
    | "abaixo_do_limiar_esgotados"
    | "gap_abaixo_do_min"
    | "ja_disparado_hoje"
    | "sem_texto_institucional"
    | "sem_destinatarios";
  dias_sem_resumo: number;
  total_esgotados_pendentes: number;
  ultima_entrada_em: string | null;
  notificacoes_email: number;
  notificacoes_whatsapp: number;
  dia_brt: string;
}

async function reservarEEnfileirarSilencioAtomico(
  diaIso: string,
  diasSemResumo: number,
  totalEsgotados: number,
  ultimaEntradaEm: Date | null,
  destinatarios: CeoDestinatario[],
  assunto: string,
  corpo: string,
): Promise<{ reservou: boolean; email: number; whatsapp: number }> {
  return await db.transaction(async (tx) => {
    const r: any = await tx.execute(sql`
      INSERT INTO pdf_upload_resumo_diario_silencio_alertas
        (dia_brt, dias_sem_resumo, total_esgotados_pendentes, ultima_entrada_em)
      VALUES
        (${diaIso}::date, ${diasSemResumo}, ${totalEsgotados},
         ${ultimaEntradaEm ? ultimaEntradaEm.toISOString() : null})
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
            (NULL, 'EMAIL', 'UPLOAD_PDF_RESUMO_DIARIO_SILENCIO', ${emailDest},
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
            (NULL, 'WHATSAPP', 'UPLOAD_PDF_RESUMO_DIARIO_SILENCIO', ${telDest},
             ${corpo}, 'PENDENTE', true)
        `);
        whatsapp += 1;
      }
    }
    return { reservou: true, email, whatsapp };
  });
}

async function rodarLogicaSilencio(): Promise<SilencioRunResult> {
  const dia = hojeBrtISO();
  const out: SilencioRunResult = {
    executou: false,
    dias_sem_resumo: 0,
    total_esgotados_pendentes: 0,
    ultima_entrada_em: null,
    notificacoes_email: 0,
    notificacoes_whatsapp: 0,
    dia_brt: dia,
  };

  const diasMin = lerDiasMinSilencio();
  const ultimaEntrada = await buscarUltimaEntradaResumo();
  const totalEsgotados = await contarEsgotados24h();

  out.ultima_entrada_em = ultimaEntrada ? ultimaEntrada.toISOString() : null;
  out.total_esgotados_pendentes = totalEsgotados;

  const decisao = decidirSilencio({
    ultimaEntradaEm: ultimaEntrada,
    totalEsgotados24h: totalEsgotados,
    agora: new Date(),
    diasMin,
    limiarEsgotados: SILENCIO_LIMIAR_ESGOTADOS_DEFAULT,
  });
  out.dias_sem_resumo = decisao.diasSemResumo;

  if (!decisao.dispara) {
    out.motivo_skip = decisao.motivo === "ABAIXO_DO_LIMIAR_ESGOTADOS"
      ? "abaixo_do_limiar_esgotados"
      : "gap_abaixo_do_min";
    return out;
  }

  const texto = await buscarTextoSilencio();
  if (!texto) {
    console.warn(
      `[pdfRetryUploadResumoDiario:silencio] texto institucional UPLOAD_PDF_RESUMO_DIARIO_SILENCIO ausente — skip`,
    );
    out.motivo_skip = "sem_texto_institucional";
    return out;
  }

  const destinatarios = await buscarDestinatariosCEO();
  if (destinatarios.length === 0) {
    console.warn(`[pdfRetryUploadResumoDiario:silencio] nenhum validador_mestre ativo — skip`);
    out.motivo_skip = "sem_destinatarios";
    return out;
  }

  const ultimaEntradaTxt = ultimaEntrada
    ? ultimaEntrada.toISOString().slice(0, 10)
    : "(nunca)";
  const assunto = texto.assunto
    .replace(/\{DIAS\}/g, String(decisao.diasSemResumo))
    .replace(/\{TOTAL_ESGOTADOS\}/g, String(totalEsgotados))
    .replace(/\{ULTIMA_ENTRADA\}/g, ultimaEntradaTxt);
  const corpo = texto.corpo
    .replace(/\{DIAS\}/g, String(decisao.diasSemResumo))
    .replace(/\{TOTAL_ESGOTADOS\}/g, String(totalEsgotados))
    .replace(/\{ULTIMA_ENTRADA\}/g, ultimaEntradaTxt);

  const stats = await reservarEEnfileirarSilencioAtomico(
    dia, decisao.diasSemResumo, totalEsgotados, ultimaEntrada,
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
    `[pdfRetryUploadResumoDiario:silencio] aviso enfileirado dia=${dia} ` +
    `dias_sem_resumo=${decisao.diasSemResumo} esgotados_pendentes=${totalEsgotados} ` +
    `email=${stats.email} whatsapp=${stats.whatsapp}`,
  );
  return out;
}

/** Disparo manual pra testes / endpoint admin (independente de horario). */
export async function rodarSilencioResumoDiarioAgora(): Promise<SilencioRunResult> {
  return rodarLogicaSilencio();
}
