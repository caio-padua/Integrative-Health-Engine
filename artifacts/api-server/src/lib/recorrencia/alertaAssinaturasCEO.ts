/**
 * Wave 10.6 · Worker proativo de alertas pro CEO sobre assinaturas.
 *
 * Por que existe:
 *   O banner /assinaturas/resumo-hoje ja mostra cor semantica 7d. Mas exige o
 *   Caio abrir o painel pra ver vermelho. Quando rejeitadas escalam pra
 *   "critico" (>+10% vs media movel) ou conversao despenca (<-10pp), nao da
 *   pra esperar o login — disparamos alerta direto.
 *
 * Comportamento:
 *   - Tick 6h (4x/dia: ~03/09/15/21 BRT, sem horario fixo, defensivo).
 *   - Reusa `calcularResumoAssinaturas()` (mesma SQL do banner) pra nao
 *     divergir do que o CEO ve.
 *   - Idempotente por (dia_brt, metrica) via UNIQUE em alertas_ceo_assinaturas.
 *     So insere quando a cor TRANSITA pra "critico" — nao re-alerta no mesmo
 *     dia se ja virou critico cedo de manha.
 *   - Dispara duas notificacoes:
 *       canal=EMAIL → ceo@pawards.com.br (worker notifAssinatura entrega)
 *       canal=WHATSAPP → CEO_WHATSAPP env var (opcional; se ausente, skip)
 *   - Defensivo: nunca lanca, log + segue.
 *
 * Lock distribuido: pg_try_advisory_lock(30303031) pra cluster nao duplicar.
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  calcularResumoAssinaturas,
  type Cor,
  type ResumoAssinaturas,
} from "../assinaturas/calcularResumo";
import { getGmailClient } from "../google-gmail";
import { enviarWhatsapp } from "../../services/whatsappService";

const TICK_MS = 6 * 60 * 60 * 1000; // 6h
const ADVISORY_LOCK_ID = 30303031; // proximo apos parqStatus 30303030
const CEO_EMAIL = process.env["CEO_EMAIL"] || "ceo@pawards.com.br";
const CEO_WHATSAPP = process.env["CEO_WHATSAPP"] || ""; // opcional

let executandoAgora = false;

function hojeBrtISO(): string {
  // YYYY-MM-DD em America/Sao_Paulo (UTC-3 sem DST desde 2019).
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

interface AlertaPayload {
  metrica: "rejeitadas_7d" | "conversao_7d";
  corAtual: Cor;
  variacaoPct: number | null;
  conversaoPp: number | null;
  totaisAtual: Record<string, unknown>;
  totaisPrev: Record<string, unknown>;
  assunto: string;
  corpo: string;
}

function montarAlertaRejeitadas(r: ResumoAssinaturas): AlertaPayload {
  const pct = r.variacaoRejeitadasPct;
  const corpo = [
    `Olá Caio,`,
    ``,
    `As REJEIÇÕES de assinatura subiram pra faixa CRÍTICA nos últimos 7 dias.`,
    ``,
    `• Rejeitadas (7d):       ${r.rejeitadas7d} (vs ${r.rejeitadasPrev} no período anterior)`,
    `• Variação:              ${pct === null ? "—" : `${pct > 0 ? "+" : ""}${pct}%`}`,
    `• Enviadas no período:   ${r.enviadas7d}`,
    `• Assinadas no período:  ${r.assinadas7d}`,
    `• Conversão atual:       ${r.taxaConversao === null ? "—" : `${r.taxaConversao}%`}`,
    ``,
    `Recomendo abrir o Painel CEO e checar a timeline de assinaturas:`,
    `${process.env["PUBLIC_APP_URL"] || ""}/assinaturas/timeline`,
    ``,
    `— PAWARDS MEDCORE · alerta automatico Wave 10.6`,
  ].join("\n");
  return {
    metrica: "rejeitadas_7d",
    corAtual: "critico",
    variacaoPct: pct,
    conversaoPp: null,
    totaisAtual: { enviadas: r.enviadas7d, assinadas: r.assinadas7d, rejeitadas: r.rejeitadas7d },
    totaisPrev:  { enviadas: r.enviadasPrev, assinadas: r.assinadasPrev, rejeitadas: r.rejeitadasPrev },
    assunto: `🛑 Rejeições de assinatura em alta · ${r.rejeitadas7d} nos últimos 7d`,
    corpo,
  };
}

function montarAlertaConversao(r: ResumoAssinaturas): AlertaPayload {
  const pp = r.variacaoConversaoPp;
  const corpo = [
    `Olá Caio,`,
    ``,
    `A CONVERSÃO de assinaturas (assinadas / enviadas) caiu pra faixa CRÍTICA.`,
    ``,
    `• Conversão atual (7d):  ${r.taxaConversao === null ? "—" : `${r.taxaConversao}%`}`,
    `• Conversão anterior:    ${r.taxaConversaoPrev === null ? "—" : `${r.taxaConversaoPrev}%`}`,
    `• Variação:              ${pp === null ? "—" : `${pp > 0 ? "+" : ""}${pp} pp`}`,
    `• Enviadas no período:   ${r.enviadas7d}`,
    `• Assinadas no período:  ${r.assinadas7d}`,
    `• Rejeitadas no período: ${r.rejeitadas7d}`,
    ``,
    `Recomendo abrir o Painel CEO e checar a timeline de assinaturas:`,
    `${process.env["PUBLIC_APP_URL"] || ""}/assinaturas/timeline`,
    ``,
    `— PAWARDS MEDCORE · alerta automatico Wave 10.6`,
  ].join("\n");
  return {
    metrica: "conversao_7d",
    corAtual: "critico",
    variacaoPct: null,
    conversaoPp: pp,
    totaisAtual: { conversao: r.taxaConversao, enviadas: r.enviadas7d, assinadas: r.assinadas7d },
    totaisPrev:  { conversao: r.taxaConversaoPrev, enviadas: r.enviadasPrev, assinadas: r.assinadasPrev },
    assunto: `🛑 Conversão de assinaturas em queda · ${r.taxaConversao ?? "—"}% (${pp ?? "—"} pp)`,
    corpo,
  };
}

/**
 * Tenta inserir o alerta. Retorna a linha criada (com id) ou null se ja
 * existe pra (dia, metrica) — caso em que NAO re-disparamos notificacao.
 *
 * UNIQUE(dia_brt, metrica) garante idempotencia mesmo em corrida entre pods.
 */
async function inserirAlertaIdempotente(
  diaIso: string,
  corAnterior: Cor | null,
  payload: AlertaPayload,
): Promise<{ id: number } | null> {
  const r: any = await db.execute(sql`
    INSERT INTO alertas_ceo_assinaturas
      (dia_brt, metrica, cor_anterior, cor_atual, variacao_pct, conversao_pp, totais_atual, totais_prev)
    VALUES
      (${diaIso}::date, ${payload.metrica}, ${corAnterior}, ${payload.corAtual},
       ${payload.variacaoPct}, ${payload.conversaoPp},
       ${JSON.stringify(payload.totaisAtual)}::jsonb,
       ${JSON.stringify(payload.totaisPrev)}::jsonb)
    ON CONFLICT (dia_brt, metrica) DO NOTHING
    RETURNING id
  `);
  const linha = (r.rows ?? r)[0];
  return linha ? { id: Number(linha.id) } : null;
}

/**
 * Dispara email + whatsapp diretamente (sem passar pela fila
 * assinatura_notificacoes — aquela tabela exige solicitacao_id NOT NULL e
 * tem CHECK em momento que nao acomoda 'ALERTA_CEO_*'; alterar essas
 * constraints seria muito mais invasivo do que disparar inline).
 *
 * Defensivo: cada canal isolado em try/catch, falha de um nao impede o outro.
 * Persiste IDs de retorno na linha do alerta pra auditoria.
 */
function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function sanitizeHeader(s: string): string {
  return String(s ?? "").replace(/[\r\n]/g, "").trim();
}

function buildEmailRaw(to: string, subject: string, htmlBody: string): string {
  const fromAddr = "clinica.padua.agenda@gmail.com";
  const parts = [
    `From: PAWARDS - Alerta CEO <${fromAddr}>`,
    `To: ${sanitizeHeader(to)}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(htmlBody).toString("base64"),
  ];
  return Buffer.from(parts.join("\r\n")).toString("base64url");
}

async function dispararNotificacoes(
  alertaId: number,
  payload: AlertaPayload,
): Promise<{ emailEnviado: boolean; wppEnviado: boolean; emailRef: string | null; wppRef: string | null }> {
  let emailEnviado = false;
  let wppEnviado = false;
  let emailRef: string | null = null;
  let wppRef: string | null = null;

  try {
    const html = `<pre style="font-family:ui-monospace,Menlo,Consolas,monospace;` +
      `background:#020406;color:#C89B3C;padding:16px;border-radius:6px;` +
      `white-space:pre-wrap;word-break:break-word">${escapeHtml(payload.corpo)}</pre>`;
    const gmail = await getGmailClient();
    const raw = buildEmailRaw(CEO_EMAIL, payload.assunto, html);
    const res = await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
    emailEnviado = true;
    emailRef = String(res.data?.id ?? "");
  } catch (e) {
    console.error(`[alertaCEO] falha email alerta=${alertaId}:`, (e as Error).message);
  }

  if (CEO_WHATSAPP) {
    try {
      const r = await enviarWhatsapp(CEO_WHATSAPP, `${payload.assunto}\n\n${payload.corpo}`);
      if (r.sucesso) {
        wppEnviado = true;
        wppRef = String(r.provedorMsgId ?? "");
      } else {
        console.error(`[alertaCEO] whatsapp falhou alerta=${alertaId}: ${r.erro ?? "desconhecido"}`);
      }
    } catch (e) {
      console.error(`[alertaCEO] erro whatsapp alerta=${alertaId}:`, (e as Error).message);
    }
  }

  // Persiste ids de auditoria (texto curto, evita coluna nova) — usamos os
  // campos numericos como bool 1/0 e codificamos a referencia em totais_atual.
  try {
    await db.execute(sql`
      UPDATE alertas_ceo_assinaturas
      SET notif_email_id = ${emailEnviado ? 1 : 0},
          notif_wpp_id   = ${wppEnviado ? 1 : 0},
          totais_atual   = totais_atual || ${JSON.stringify({
            email_msg_id: emailRef,
            wpp_msg_id: wppRef,
          })}::jsonb
      WHERE id = ${alertaId}
    `);
  } catch (e) {
    console.error(`[alertaCEO] erro vincular notif ao alerta=${alertaId}:`, (e as Error).message);
  }

  return { emailEnviado, wppEnviado, emailRef, wppRef };
}

/**
 * Busca cor mais recente registrada PRA esta metrica em dia ANTERIOR ao
 * informado. Le do snapshot diario `assinaturas_cor_diaria` (preenchido todo
 * tick), NAO de `alertas_ceo_assinaturas` — a tabela de alertas so tem dias
 * critico, entao se usassemos ela a cor "anterior" ficaria perpetuamente
 * "critico" e nunca dispararia outro alerta apos uma recuperacao.
 *
 * Se nao houver snapshot anterior, retorna null (primeira vez ou worker
 * nunca rodou ainda — caso em que tratamos como transicao valida).
 */
async function buscarCorAnterior(metrica: string, diaIso: string): Promise<Cor | null> {
  const r: any = await db.execute(sql`
    SELECT cor FROM assinaturas_cor_diaria
    WHERE metrica = ${metrica} AND dia_brt < ${diaIso}::date
    ORDER BY dia_brt DESC LIMIT 1
  `);
  const linha = (r.rows ?? r)[0];
  return linha?.cor ?? null;
}

/**
 * Upsert do snapshot de cor do dia. Roda sempre, independente da cor (inclusive
 * quando nao ha alerta) — eh isso que permite detectar transicao real
 * dia-a-dia entre "bom" e "critico" no proximo run.
 */
async function upsertSnapshotCor(diaIso: string, metrica: string, cor: Cor): Promise<void> {
  await db.execute(sql`
    INSERT INTO assinaturas_cor_diaria (dia_brt, metrica, cor)
    VALUES (${diaIso}::date, ${metrica}, ${cor})
    ON CONFLICT (dia_brt, metrica) DO UPDATE
      SET cor = EXCLUDED.cor, atualizado_em = NOW()
  `);
}

export interface AlertaCEORunResult {
  resumo: ResumoAssinaturas;
  rejeitadas_alerta_disparado: boolean;
  conversao_alerta_disparado: boolean;
  rejeitadas_alerta_id: number | null;
  conversao_alerta_id: number | null;
}

async function rodarLogica(): Promise<AlertaCEORunResult> {
  const resumo = await calcularResumoAssinaturas();
  const dia = hojeBrtISO();
  const out: AlertaCEORunResult = {
    resumo,
    rejeitadas_alerta_disparado: false,
    conversao_alerta_disparado: false,
    rejeitadas_alerta_id: null,
    conversao_alerta_id: null,
  };

  // --- Metrica 1: Rejeitadas (cor "critico" = >+10% vs janela anterior) ---
  // IMPORTANTE: le cor anterior do snapshot diario ANTES de upsertar a de
  // hoje, senao "anterior" seria a propria de hoje (sempre igual).
  const anteriorRejeitadas = await buscarCorAnterior("rejeitadas_7d", dia);
  if (resumo.corRejeitadas === "critico" && anteriorRejeitadas !== "critico") {
    const payload = montarAlertaRejeitadas(resumo);
    const inserted = await inserirAlertaIdempotente(dia, anteriorRejeitadas, payload);
    if (inserted) {
      out.rejeitadas_alerta_disparado = true;
      out.rejeitadas_alerta_id = inserted.id;
      await dispararNotificacoes(inserted.id, payload);
    }
  }
  // Snapshot de hoje sempre upsertado, mesmo que nao tenha disparado alerta.
  await upsertSnapshotCor(dia, "rejeitadas_7d", resumo.corRejeitadas);

  // --- Metrica 2: Conversao (cor "critico" = <-10pp vs janela anterior) ---
  const anteriorConversao = await buscarCorAnterior("conversao_7d", dia);
  if (resumo.corConversao === "critico" && anteriorConversao !== "critico") {
    const payload = montarAlertaConversao(resumo);
    const inserted = await inserirAlertaIdempotente(dia, anteriorConversao, payload);
    if (inserted) {
      out.conversao_alerta_disparado = true;
      out.conversao_alerta_id = inserted.id;
      await dispararNotificacoes(inserted.id, payload);
    }
  }
  await upsertSnapshotCor(dia, "conversao_7d", resumo.corConversao);

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
    if (!lockOk) {
      console.log("[alertaCEO] lock distribuido nao adquirido, outro pod ja rodando");
      return;
    }
    const out = await rodarLogica();
    if (out.rejeitadas_alerta_disparado || out.conversao_alerta_disparado) {
      console.log(
        `[alertaCEO] tick: rejeitadas_disparado=${out.rejeitadas_alerta_disparado} ` +
        `conversao_disparado=${out.conversao_alerta_disparado} ` +
        `rejeitadas7d=${out.resumo.rejeitadas7d} conversao=${out.resumo.taxaConversao}`,
      );
    }
  } catch (e) {
    console.error("[alertaCEO] erro fatal no tick:", (e as Error).message);
  } finally {
    if (lockOk) {
      try {
        await db.execute(sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`);
      } catch (e) {
        console.error("[alertaCEO] erro release lock:", (e as Error).message);
      }
    }
    executandoAgora = false;
  }
}

let workerStarted = false;

export function iniciarWorkerAlertaAssinaturasCEO(): void {
  if (workerStarted) return;
  workerStarted = true;
  console.log(
    `[alertaCEO] Worker iniciado (tick ${TICK_MS / 3600000}h, idempotente por (dia_brt,metrica))`,
  );
  // Primeiro tick com folga pra app subir + outras conexoes pegarem fila.
  setTimeout(() => { void tickComLock(); }, 60 * 1000);
  setInterval(() => { void tickComLock(); }, TICK_MS).unref();
}

/** Disparo manual pra testes / endpoint admin. */
export async function rodarAlertaCEOAgora(): Promise<AlertaCEORunResult> {
  return rodarLogica();
}
