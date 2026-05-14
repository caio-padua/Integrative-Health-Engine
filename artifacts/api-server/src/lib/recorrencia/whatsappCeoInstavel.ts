// PAWARDS MEDCORE · Task #274
// Cao-de-guarda do canal WhatsApp do CEO: avisa quando o provedor
// (Twilio/Gupshup) esta entregando muitas falhas seguidas.
//
// Por que existe:
//   A Task #166 garantiu que falhas isoladas no envio do WhatsApp NUNCA
//   derrubam o login do CEO (canal email continua funcionando em
//   paralelo). Efeito colateral: se Twilio/Gupshup ficar fora do ar por
//   horas, o CEO simplesmente para de receber alertas WhatsApp em
//   silencio — o canal email mantem o tradicional, ninguem repara que
//   metade dos avisos criticos nao chegou no celular dele.
//
//   Hoje so descobririamos isso revisando manualmente
//   `alertas_ceo_seguranca.notif_wpp_enviados` vs `notif_wpp_falhas`.
//   Este worker transforma esse padrao em um alerta proativo na propria
//   fila de seguranca do CEO (tipo `WHATSAPP_CEO_INSTAVEL`), reusando o
//   painel /plataforma/alertas-seguranca da Task #152.
//
// Comportamento:
//   - Tick 30min, lock distribuido `pg_try_advisory_lock(30303037)`.
//     Familia 30303xxx em uso pelos demais workers: 30, 31, 32, 33, 34,
//     35, 36 (avisoDestinatarioQuebrado). Proximo livre: 37.
//   - Pega `SUM(notif_wpp_enviados)` + `SUM(notif_wpp_falhas)` em
//     `alertas_ceo_seguranca` criadas DENTRO da janela (default 6h).
//   - Funcao pura `decidirWhatsappInstavel()` aplica regra "AND":
//     dispara so quando total_tentativas >= MIN_TENTATIVAS (default 5)
//     E percentual_falhas >= LIMIAR_PERCENT (default 50%). Sem amostra
//     suficiente NAO dispara — protege de "1 falha em 1 tentativa = 100%".
//   - Idempotencia diaria por PRIMARY KEY em
//     `whatsapp_ceo_instavel_alertas.dia_brt` + ON CONFLICT DO NOTHING.
//     Mesmo rodando 48x no dia, o CEO recebe APENAS 1 aviso por dia —
//     evita tsunami enquanto o provedor continua quebrado.
//   - Insere a linha gerada em `alertas_ceo_seguranca` (tipo
//     WHATSAPP_CEO_INSTAVEL) com payload completo da medicao —
//     aparece no painel automaticamente.
//
// Defensivo: nunca lanca; falha em silencio com log + segue.

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../logger";

const TICK_MS = 30 * 60 * 1000; // 30min
const PRIMEIRO_DISPARO_MS = 5 * 60 * 1000; // 5min apos boot
const ADVISORY_LOCK_ID = 30303037;

const JANELA_HORAS_DEFAULT = 6;
const LIMIAR_PERCENT_DEFAULT = 50;
const MIN_TENTATIVAS_DEFAULT = 5;

let executandoAgora = false;
let workerStarted = false;

function lerInteiroPositivo(envName: string, fallback: number): number {
  const raw = process.env[envName];
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return fallback;
  return n;
}

function lerNumeroPositivo(envName: string, fallback: number): number {
  const raw = process.env[envName];
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function hojeBrtISO(): string {
  // YYYY-MM-DD em America/Sao_Paulo (UTC-3 sem DST desde 2019)
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export interface DecidirWhatsappInstavelInput {
  totalEnviados: number;
  totalFalhas: number;
  minTentativas: number;
  limiarPercent: number;
}

export interface DecidirWhatsappInstavelOutput {
  dispara: boolean;
  totalTentativas: number;
  percentualFalhas: number;
  motivo:
    | "OK"
    | "AMOSTRA_INSUFICIENTE"
    | "TAXA_ABAIXO_DO_LIMIAR"
    | "RAJADA_FALHAS_WHATSAPP";
}

/**
 * Decisao pura — exportada pra testes unitarios sem DB/lock/rede.
 *
 * Regra "AND": dispara so quando AMBAS as condicoes sao verdadeiras:
 *   1. totalTentativas >= minTentativas
 *      (evita falso positivo "1 falha em 1 tentativa = 100%" — sem
 *      amostra suficiente, a metrica nao tem significado estatistico)
 *   2. percentualFalhas >= limiarPercent
 *      (taxa de falhas significativa indicando provedor quebrado)
 *
 * Calcula percentual com 2 casas decimais. Quando totalTentativas == 0
 * o percentual eh 0 e a primeira condicao ja barra o disparo.
 */
export function decidirWhatsappInstavel(
  input: DecidirWhatsappInstavelInput,
): DecidirWhatsappInstavelOutput {
  const { totalEnviados, totalFalhas, minTentativas, limiarPercent } = input;
  const totalTentativas = totalEnviados + totalFalhas;
  const percentualFalhas =
    totalTentativas > 0
      ? Math.round((totalFalhas / totalTentativas) * 10000) / 100
      : 0;

  if (totalTentativas < minTentativas) {
    return {
      dispara: false,
      totalTentativas,
      percentualFalhas,
      motivo: "AMOSTRA_INSUFICIENTE",
    };
  }
  if (percentualFalhas < limiarPercent) {
    return {
      dispara: false,
      totalTentativas,
      percentualFalhas,
      motivo: "TAXA_ABAIXO_DO_LIMIAR",
    };
  }
  return {
    dispara: true,
    totalTentativas,
    percentualFalhas,
    motivo: "RAJADA_FALHAS_WHATSAPP",
  };
}

interface AgregadoRow {
  total_enviados: number | string | null;
  total_falhas: number | string | null;
}

async function agregarJanela(
  janelaHoras: number,
): Promise<{ totalEnviados: number; totalFalhas: number }> {
  const r: any = await db.execute(sql`
    SELECT COALESCE(SUM(notif_wpp_enviados), 0)::int AS total_enviados,
           COALESCE(SUM(notif_wpp_falhas),   0)::int AS total_falhas
      FROM alertas_ceo_seguranca
     WHERE criado_em > now() - (${janelaHoras}::int || ' hours')::interval
  `);
  const row = ((r.rows ?? r) as AgregadoRow[])[0];
  return {
    totalEnviados: row ? Number(row.total_enviados ?? 0) : 0,
    totalFalhas: row ? Number(row.total_falhas ?? 0) : 0,
  };
}

interface DonoRow {
  id: number;
}

/**
 * Resolve um usuario_id valido pra preencher o NOT NULL FK da linha em
 * `alertas_ceo_seguranca`. Mesma policy do helper de brute-force:
 * platform_owner ATIVO; fallback validador_mestre ATIVO. Retorna NULL
 * quando nao ha nenhum — caso em que o worker pula o disparo.
 */
async function buscarUsuarioDono(): Promise<number | null> {
  const r: any = await db.execute(sql`
    SELECT id FROM usuarios
     WHERE ativo = true
       AND (perfil_plataforma = 'platform_owner' OR perfil = 'validador_mestre')
     ORDER BY (perfil_plataforma = 'platform_owner') DESC, id ASC
     LIMIT 1
  `);
  const row = ((r.rows ?? r) as DonoRow[])[0];
  return row ? Number(row.id) : null;
}

export interface WhatsappInstavelRunResult {
  executou: boolean;
  motivo_skip?:
    | "amostra_insuficiente"
    | "taxa_abaixo_do_limiar"
    | "ja_disparado_hoje"
    | "sem_dono";
  janela_horas: number;
  limiar_percent: number;
  min_tentativas: number;
  total_tentativas: number;
  total_falhas: number;
  percentual_falhas: number;
  dia_brt: string;
  alerta_seguranca_id: number | null;
}

/**
 * Reserva o dia + insere a linha em `alertas_ceo_seguranca` numa unica
 * transacao. Se o INSERT da reserva falhar (conflito = ja disparou hoje),
 * nao insere nada. Se o INSERT do alerta falhar, a transacao rola back
 * tambem — evita falso positivo permanente em que o dia ficaria marcado
 * mas o painel ficaria sem a linha.
 */
async function reservarEInserirAtomico(args: {
  diaIso: string;
  janelaHoras: number;
  limiarPercent: number;
  totalTentativas: number;
  totalFalhas: number;
  percentualFalhas: number;
  donoId: number;
}): Promise<{ reservou: boolean; alertaId: number | null }> {
  return await db.transaction(async (tx) => {
    const reservaRes: any = await tx.execute(sql`
      INSERT INTO whatsapp_ceo_instavel_alertas
        (dia_brt, janela_horas, total_tentativas, total_falhas,
         percentual_falhas, limiar_percent)
      VALUES
        (${args.diaIso}::date, ${args.janelaHoras},
         ${args.totalTentativas}, ${args.totalFalhas},
         ${args.percentualFalhas}, ${args.limiarPercent})
      ON CONFLICT (dia_brt) DO NOTHING
      RETURNING dia_brt
    `);
    const reservou = ((reservaRes.rows ?? reservaRes) as Array<unknown>).length > 0;
    if (!reservou) return { reservou: false, alertaId: null };

    const payload = {
      janela_horas: args.janelaHoras,
      limiar_percent: args.limiarPercent,
      total_tentativas: args.totalTentativas,
      total_falhas: args.totalFalhas,
      percentual_falhas: args.percentualFalhas,
      observado_em: new Date().toISOString(),
    };
    const alertaRes: any = await tx.execute(sql`
      INSERT INTO alertas_ceo_seguranca
        (tipo, usuario_id, janela_inicio_em, contexto, payload)
      VALUES (
        'WHATSAPP_CEO_INSTAVEL',
        ${args.donoId},
        now() - (${args.janelaHoras}::int || ' hours')::interval,
        ${`canal_wpp_taxa_falha=${args.percentualFalhas}%`},
        ${JSON.stringify(payload)}::jsonb
      )
      RETURNING id
    `);
    const alertaId = ((alertaRes.rows ?? alertaRes) as Array<{ id: number }>)[0]?.id ?? null;

    if (alertaId !== null) {
      await tx.execute(sql`
        UPDATE whatsapp_ceo_instavel_alertas
           SET alerta_seguranca_id = ${alertaId}
         WHERE dia_brt = ${args.diaIso}::date
      `);
    }
    return { reservou: true, alertaId };
  });
}

async function rodarLogica(): Promise<WhatsappInstavelRunResult> {
  const dia = hojeBrtISO();
  const janelaHoras = lerInteiroPositivo(
    "WHATSAPP_CEO_INSTAVEL_JANELA_HORAS",
    JANELA_HORAS_DEFAULT,
  );
  const limiarPercent = lerNumeroPositivo(
    "WHATSAPP_CEO_INSTAVEL_LIMIAR_PERCENT",
    LIMIAR_PERCENT_DEFAULT,
  );
  const minTentativas = lerInteiroPositivo(
    "WHATSAPP_CEO_INSTAVEL_MIN_TENTATIVAS",
    MIN_TENTATIVAS_DEFAULT,
  );

  const out: WhatsappInstavelRunResult = {
    executou: false,
    janela_horas: janelaHoras,
    limiar_percent: limiarPercent,
    min_tentativas: minTentativas,
    total_tentativas: 0,
    total_falhas: 0,
    percentual_falhas: 0,
    dia_brt: dia,
    alerta_seguranca_id: null,
  };

  const { totalEnviados, totalFalhas } = await agregarJanela(janelaHoras);
  const decisao = decidirWhatsappInstavel({
    totalEnviados,
    totalFalhas,
    minTentativas,
    limiarPercent,
  });

  out.total_tentativas = decisao.totalTentativas;
  out.total_falhas = totalFalhas;
  out.percentual_falhas = decisao.percentualFalhas;

  if (!decisao.dispara) {
    out.motivo_skip =
      decisao.motivo === "AMOSTRA_INSUFICIENTE"
        ? "amostra_insuficiente"
        : "taxa_abaixo_do_limiar";
    return out;
  }

  const donoId = await buscarUsuarioDono();
  if (donoId === null) {
    logger.warn(
      "[whatsappCeoInstavel] sem platform_owner/validador_mestre ativo (skip)",
    );
    out.motivo_skip = "sem_dono";
    return out;
  }

  const stats = await reservarEInserirAtomico({
    diaIso: dia,
    janelaHoras,
    limiarPercent,
    totalTentativas: decisao.totalTentativas,
    totalFalhas,
    percentualFalhas: decisao.percentualFalhas,
    donoId,
  });
  if (!stats.reservou) {
    out.motivo_skip = "ja_disparado_hoje";
    return out;
  }
  out.executou = true;
  out.alerta_seguranca_id = stats.alertaId;

  logger.info(
    {
      dia,
      janelaHoras,
      limiarPercent,
      totalTentativas: decisao.totalTentativas,
      totalFalhas,
      percentualFalhas: decisao.percentualFalhas,
      alertaId: stats.alertaId,
    },
    "[whatsappCeoInstavel] aviso enfileirado",
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
  } catch (err) {
    logger.error(
      { err: (err as Error).message },
      "[whatsappCeoInstavel] erro fatal no tick",
    );
  } finally {
    if (lockOk) {
      try {
        await db.execute(sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`);
      } catch (err) {
        logger.error(
          { err: (err as Error).message },
          "[whatsappCeoInstavel] erro release lock",
        );
      }
    }
    executandoAgora = false;
  }
}

export function iniciarWorkerWhatsappCeoInstavel(): void {
  if (workerStarted) return;
  workerStarted = true;
  logger.info(
    {
      tickMs: TICK_MS,
      janelaHorasDefault: JANELA_HORAS_DEFAULT,
      limiarPercentDefault: LIMIAR_PERCENT_DEFAULT,
      minTentativasDefault: MIN_TENTATIVAS_DEFAULT,
    },
    "[whatsappCeoInstavel] worker iniciado",
  );
  setTimeout(() => {
    void tickComLock();
  }, PRIMEIRO_DISPARO_MS).unref();
  setInterval(() => {
    void tickComLock();
  }, TICK_MS).unref();
}

/** Disparo manual pra testes / endpoint admin (independente de horario). */
export async function rodarWhatsappCeoInstavelAgora(): Promise<WhatsappInstavelRunResult> {
  return rodarLogica();
}

export const _internoParaTestes = {
  ADVISORY_LOCK_ID,
  JANELA_HORAS_DEFAULT,
  LIMIAR_PERCENT_DEFAULT,
  MIN_TENTATIVAS_DEFAULT,
};
