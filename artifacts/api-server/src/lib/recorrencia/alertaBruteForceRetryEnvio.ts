/**
 * Task #167 — Worker que re-tenta o envio do alerta de brute-force 2FA
 * quando o Gmail falhou na primeira leva.
 *
 * Por que existe:
 *   `dispararAlertaBruteForceTotp` (Task #143) e defensivo: se o Gmail
 *   crasha ou o destinatario rejeita, ele grava `notif_email_falhas` em
 *   `alertas_ceo_seguranca` e segue silencioso pra nao derrubar o fluxo
 *   de auth. O resultado e que o platform_owner pode perder um aviso de
 *   ataque ativo e so descobrir quando entrar na fila da Task #152 por
 *   conta propria. Este worker fecha o buraco: varre alertas com falha
 *   de email AINDA NAO VISUALIZADOS e re-tenta o envio com backoff +
 *   cap de tentativas.
 *
 * Comportamento:
 *   - Tick 10min, lock distribuido `pg_try_advisory_lock(30303035)`.
 *     Familia 30303xxx ja em uso: 30 (parqStatus), 31 (alertaCEO +
 *     verificarPdfsCofre), 32 (relatorioDiarioCEO + pdfRetryUploadResumoDiario),
 *     33 (alertaKillSwitchEmailsCEO), 34 (avisoExpiracao2faOwner).
 *     Proximo livre: 35.
 *   - Filtra `notif_email_falhas > 0 AND visualizado_em IS NULL`
 *     (criterio explicito no Done-looks-like da task).
 *   - Cap em RETRY_TENTATIVAS_MAX (default 3) — falhas permanentes
 *     (credencial Gmail expirada, destinatario invalido) param de
 *     reentrar e ficam visiveis na fila pra acao manual.
 *   - Backoff RETRY_BACKOFF_MIN (default 30min) entre tentativas pra
 *     nao spammar a API do Gmail nem o owner caso o problema seja
 *     transiente.
 *   - Re-envia pra TODOS os destinatarios persistidos em
 *     `notif_destinatarios` (helper original nao guarda quem falhou
 *     individualmente). E aceitavel pro caso de uso "alerta de seguranca":
 *     CEO prefere receber duplicado a perder o aviso. A janela de 24h
 *     (RETRY_JANELA_HORAS) limita a varredura aos alertas recentes —
 *     alerta antigo nao visualizado ja virou problema operacional, nao
 *     mais notificacao em tempo real.
 *   - Atualiza `notif_email_enviados += sucessos`, substitui
 *     `notif_email_falhas` pelo numero de falhas DESTA tentativa (se
 *     todas passarem, vira 0 e a linha sai do filtro pro proximo tick),
 *     e SEMPRE incrementa `notif_retry_tentativas` + grava
 *     `notif_ultimo_retry_em = now()` (mesmo se nada saiu) pra evitar
 *     reentry imediato em loop quando o destinatario sumiu.
 *
 * Defensivo: nunca lanca; falha em silencio com log.
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getGmailClient } from "../google-gmail";
import { logger } from "../logger";

const TICK_MS = 10 * 60 * 1000; // 10min
const ADVISORY_LOCK_ID = 30303035;

const RETRY_TENTATIVAS_MAX = Number(
  process.env["BRUTEFORCE_RETRY_TENTATIVAS_MAX"] ?? 3,
);
const RETRY_BACKOFF_MIN = Number(
  process.env["BRUTEFORCE_RETRY_BACKOFF_MIN"] ?? 30,
);
// Janela de varredura: 0 (default) = SEM corte temporal, ou seja, retry
// continua ate `notif_retry_tentativas` atingir o cap OU o CEO marcar
// como visualizado. Mantemos a env var pra permitir corte explicito caso
// um operador queira excluir backlog antigo (ex: setar 168 = 7 dias). Valor
// 0 e o comportamento esperado pela task ("retry ate o cap").
const RETRY_JANELA_HORAS = Number(
  process.env["BRUTEFORCE_RETRY_JANELA_HORAS"] ?? 0,
);

const FROM_LABEL = "PAWARDS - Seguranca";
const FROM_ADDR =
  process.env["PAWARDS_EMAIL_FROM"] || "clinica.padua.agenda@gmail.com";

let executandoAgora = false;
let workerStarted = false;

// Seam de injecao pro gmail client (mesmo padrao do alertaBruteForceTotp).
type GmailLike = Awaited<ReturnType<typeof getGmailClient>>;
let gmailClientFactory: () => Promise<GmailLike> = getGmailClient;
export function _setGmailClientFactoryParaTestes(
  f: () => Promise<GmailLike>,
): void {
  gmailClientFactory = f;
}
export function _resetGmailClientFactoryParaTestes(): void {
  gmailClientFactory = getGmailClient;
}

interface AlertaParaRetry {
  id: number;
  usuario_id: number;
  ip: string | null;
  user_agent: string | null;
  contexto: string | null;
  payload: { tentativas?: number } | null;
  janela_inicio_em: string;
  notif_destinatarios: string[] | null;
  notif_retry_tentativas: number;
  usuario_nome: string | null;
  usuario_email: string | null;
}

function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]/g, "").trim();
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dataPtBr(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function publicAppUrl(): string {
  const fromEnv = process.env["PUBLIC_APP_URL"];
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  const dom = process.env["REPLIT_DOMAINS"];
  if (dom) {
    return `https://${dom.split(",")[0]?.trim() ?? ""}`.replace(/\/+$/, "");
  }
  return "http://localhost:80";
}

function buildRaw(to: string, subject: string, html: string): string {
  const partes = [
    `From: ${FROM_LABEL} <${sanitizeHeader(FROM_ADDR)}>`,
    `To: ${sanitizeHeader(to)}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(html).toString("base64"),
  ];
  return Buffer.from(partes.join("\r\n")).toString("base64url");
}

function htmlRetry(opts: {
  alertaId: number;
  tentativaAtual: number;
  usuarioNome: string;
  usuarioEmail: string;
  usuarioId: number;
  ip: string;
  userAgent: string;
  contexto: string;
  janelaInicioEm: string;
  tentativasBruteForce: number;
  linkAdmin: string;
}): string {
  const ctxLabel =
    opts.contexto === "STEP_UP_PAINEL"
      ? "Step-up 2FA do painel platform_owner"
      : "Login 2FA";
  return `<!DOCTYPE html><html><body style="font-family: Georgia, serif; color:#1a1a2e; max-width:640px; margin:0 auto; padding:24px;">
  <h2 style="color:#7d1d2e; border-bottom: 2px solid #7d1d2e; padding-bottom:8px;">[PAWARDS] Re-tentativa de alerta brute-force 2FA (#${opts.tentativaAtual})</h2>
  <p>Este e o re-envio automatico do alerta original (id=${opts.alertaId}). A primeira tentativa de email nao foi entregue, e o alerta ainda nao foi visualizado no painel.</p>
  <p>O motor de governanca registrou <strong>${opts.tentativasBruteForce} tentativas erradas</strong> de codigo TOTP em menos de 5 minutos contra a conta abaixo. O usuario foi automaticamente bloqueado por 5 minutos (rate-limit Task #131).</p>
  <p style="background:#f5f1e8; padding:12px; border-left:4px solid #7d1d2e;">
    <strong>Usuario:</strong> ${escapeHtml(opts.usuarioNome)} (#${opts.usuarioId})<br/>
    <strong>Email:</strong> ${escapeHtml(opts.usuarioEmail)}<br/>
    <strong>Contexto:</strong> ${escapeHtml(ctxLabel)}<br/>
    <strong>Inicio da janela:</strong> ${escapeHtml(dataPtBr(opts.janelaInicioEm))}<br/>
    <strong>IP:</strong> ${escapeHtml(opts.ip || "(nao registrado)")}<br/>
    <strong>User-Agent:</strong> ${escapeHtml(opts.userAgent || "(nao registrado)")}
  </p>
  <p>Se voce nao reconhece essa atividade, clique no botao abaixo pra <strong>forcar logout imediato</strong> de TODAS as sessoes ativas do usuario (Task #154). Isso invalida tokens JWT ja emitidos sem precisar desativar a conta.</p>
  <p><a href="${escapeHtml(opts.linkAdmin)}" style="display:inline-block; background:#7d1d2e; color:#fff; padding:10px 20px; text-decoration:none; border-radius:0;">Forcar logout agora</a></p>
  <p style="font-size:12px; color:#666; margin-top:32px; border-top:1px solid #ddd; padding-top:8px;">Re-envio automatico do worker alertaBruteForceRetryEnvio (Task #167). Cap de ${RETRY_TENTATIVAS_MAX} tentativas, backoff de ${RETRY_BACKOFF_MIN}min. Marque como visualizado em /plataforma/seguranca pra parar os retries.</p>
</body></html>`;
}

async function buscarCandidatos(): Promise<AlertaParaRetry[]> {
  const r = await db.execute<AlertaParaRetry>(sql`
    SELECT
      a.id,
      a.usuario_id,
      a.ip,
      a.user_agent,
      a.contexto,
      a.payload,
      a.janela_inicio_em,
      a.notif_destinatarios,
      a.notif_retry_tentativas,
      u.nome  AS usuario_nome,
      u.email AS usuario_email
    FROM alertas_ceo_seguranca a
    LEFT JOIN usuarios u ON u.id = a.usuario_id
    WHERE a.notif_email_falhas > 0
      AND a.visualizado_em IS NULL
      AND a.notif_retry_tentativas < ${RETRY_TENTATIVAS_MAX}
      AND (
        ${RETRY_JANELA_HORAS}::int = 0
        OR a.criado_em >= now() - (${RETRY_JANELA_HORAS}::int || ' hours')::interval
      )
      AND (
        a.notif_ultimo_retry_em IS NULL
        OR a.notif_ultimo_retry_em < now() - (${RETRY_BACKOFF_MIN}::int || ' minutes')::interval
      )
    ORDER BY a.criado_em ASC
    LIMIT 50
  `);
  return (r.rows ?? []) as AlertaParaRetry[];
}

export interface RetryEnvioResult {
  candidatos_analisados: number;
  retries_executados: number;
  envios_ok: number;
  envios_falha: number;
}

async function rodarLogica(): Promise<RetryEnvioResult> {
  const candidatos = await buscarCandidatos();
  const out: RetryEnvioResult = {
    candidatos_analisados: candidatos.length,
    retries_executados: 0,
    envios_ok: 0,
    envios_falha: 0,
  };
  if (candidatos.length === 0) return out;

  let gmail: GmailLike | null = null;
  try {
    gmail = await gmailClientFactory();
  } catch (err) {
    // Gmail indisponivel pro tick inteiro: ainda assim marcamos retry +
    // backoff em cada candidato pra nao re-entrar em loop neste minuto.
    logger.error(
      { err: (err as Error)?.message ?? String(err) },
      "[bf-retry] gmail client indisponivel no tick",
    );
    for (const c of candidatos) {
      try {
        await db.execute(sql`
          UPDATE alertas_ceo_seguranca
             SET notif_retry_tentativas = notif_retry_tentativas + 1,
                 notif_ultimo_retry_em = now()
           WHERE id = ${c.id}
        `);
        out.retries_executados += 1;
        out.envios_falha += (c.notif_destinatarios?.length ?? 0);
      } catch (e) {
        logger.warn(
          { err: (e as Error)?.message ?? String(e), alertaId: c.id },
          "[bf-retry] falha ao gravar contadores (factory caido)",
        );
      }
    }
    return out;
  }

  // Task #154 — link aponta pra acao corretiva direta (forcar-logout), igual
  // ao email original (alertaBruteForceTotp). Mantem coerencia entre 1a
  // tentativa e re-envios.
  const linkAdminBase = `${publicAppUrl()}/plataforma/admins`;

  for (const c of candidatos) {
    const destinatarios = Array.isArray(c.notif_destinatarios)
      ? c.notif_destinatarios.filter((e) => typeof e === "string" && e.includes("@"))
      : [];

    const tentativaAtual = (c.notif_retry_tentativas ?? 0) + 1;
    let sucesso = 0;
    let falha = 0;

    if (destinatarios.length > 0) {
      const tentativasBruteForce = Number(c.payload?.tentativas ?? 0);
      const subject =
        `[PAWARDS][SEGURANCA] (re-envio #${tentativaAtual}) Brute-force 2FA bloqueado · ` +
        `${c.usuario_nome ?? "(usuario)"} (#${c.usuario_id})`;
      const html = htmlRetry({
        alertaId: c.id,
        tentativaAtual,
        usuarioNome: c.usuario_nome ?? "(usuario desconhecido)",
        usuarioEmail: c.usuario_email ?? "(sem email)",
        usuarioId: c.usuario_id,
        ip: c.ip ?? "",
        userAgent: c.user_agent ?? "",
        contexto: c.contexto ?? "LOGIN_2FA",
        janelaInicioEm: c.janela_inicio_em,
        tentativasBruteForce,
        linkAdmin: `${linkAdminBase}?usuario_id=${c.usuario_id}&acao=forcar-logout`,
      });

      for (const to of destinatarios) {
        try {
          const raw = buildRaw(to, subject, html);
          await gmail.users.messages.send({
            userId: "me",
            requestBody: { raw },
          });
          sucesso += 1;
        } catch (err) {
          falha += 1;
          logger.warn(
            {
              err: (err as Error)?.message ?? String(err),
              alertaId: c.id,
              to,
              tentativaAtual,
            },
            "[bf-retry] falha re-enviando email",
          );
        }
      }
    } else {
      // Sem destinatarios persistidos no alerta original. Nao adianta
      // re-tentar — incrementa tentativas + grava timestamp pra parar
      // de re-entrar quando atingir o cap.
      logger.warn(
        { alertaId: c.id },
        "[bf-retry] alerta sem destinatarios persistidos; nada a re-enviar",
      );
    }

    try {
      // Quando ha destinatarios, `notif_email_falhas` reflete o resultado
      // DESTA tentativa: se tudo passou vira 0 e o alerta sai do filtro
      // pro proximo tick; se ainda tem falha, fica > 0 e cap+backoff
      // garantem ordem. Quando NAO ha destinatarios persistidos no alerta
      // original, PRESERVAMOS o valor antigo de notif_email_falhas — zerar
      // esconderia a falha real (alerta nunca chegou em ninguem) e tiraria
      // a linha da fila de triagem manual sem ter resolvido nada. O cap +
      // backoff continuam parando o loop via notif_retry_tentativas.
      const houveDestinatarios = destinatarios.length > 0;
      await db.execute(sql`
        UPDATE alertas_ceo_seguranca
           SET notif_email_enviados = notif_email_enviados + ${sucesso},
               notif_email_falhas   = CASE
                 WHEN ${houveDestinatarios} THEN ${falha}
                 ELSE notif_email_falhas
               END,
               notif_retry_tentativas = notif_retry_tentativas + 1,
               notif_ultimo_retry_em  = now()
         WHERE id = ${c.id}
      `);
    } catch (err) {
      logger.error(
        { err: (err as Error)?.message ?? String(err), alertaId: c.id },
        "[bf-retry] falha ao gravar contadores pos-retry",
      );
    }

    out.retries_executados += 1;
    out.envios_ok += sucesso;
    out.envios_falha += falha;
  }

  return out;
}

async function tickComLock(): Promise<void> {
  if (executandoAgora) return;
  executandoAgora = true;
  let lockOk = false;
  try {
    const r = await db.execute<{ got: boolean }>(
      sql`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID}) AS got`,
    );
    lockOk = Boolean(r.rows?.[0]?.got);
    if (!lockOk) return;
    const out = await rodarLogica();
    if (out.retries_executados > 0) {
      logger.info(
        out as unknown as Record<string, unknown>,
        "[bf-retry] tick concluido",
      );
    }
  } catch (err) {
    logger.error(
      { err: (err as Error)?.message ?? String(err) },
      "[bf-retry] erro fatal no tick",
    );
  } finally {
    if (lockOk) {
      try {
        await db.execute(sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`);
      } catch {
        // ignore
      }
    }
    executandoAgora = false;
  }
}

export function iniciarWorkerAlertaBruteForceRetryEnvio(): void {
  if (workerStarted) return;
  workerStarted = true;
  logger.info(
    {
      tickMs: TICK_MS,
      retryMax: RETRY_TENTATIVAS_MAX,
      backoffMin: RETRY_BACKOFF_MIN,
      janelaHoras: RETRY_JANELA_HORAS,
    },
    "[bf-retry] worker iniciado",
  );
  setTimeout(() => {
    void tickComLock();
  }, 90_000).unref();
  setInterval(() => {
    void tickComLock();
  }, TICK_MS).unref();
}

/** Disparo manual pra testes / endpoint admin. */
export async function rodarRetryAlertaBruteForceAgora(): Promise<RetryEnvioResult> {
  return rodarLogica();
}
