/**
 * Task #146 · Worker periodico que avisa o platform_owner por email +
 * WhatsApp quando a janela de 8h do 2FA esta para expirar (~15min antes).
 *
 * Por que existe:
 *   O banner discreto da Task #130 (Platform2faExpiryBanner.tsx) so aparece
 *   se o owner tiver uma aba do /plataforma/* aberta. Quando ele esta longe
 *   do navegador (almoco, reuniao, fora do escritorio), nao ve o aviso e
 *   volta com a janela ja expirada — descobrindo via 403 no meio de uma
 *   acao destrutiva. Email/WhatsApp cobre esse buraco com antecedencia real.
 *
 * Comportamento:
 *   - Tick 5min (lock distribuido pg_try_advisory_lock(30303034)).
 *   - Varre `usuarios` com perfil_plataforma='platform_owner' AND ativo=true
 *     AND ultimo_login_2fa_em ENTRE (now-8h) e (now-7h45min) — janela de
 *     15min (a antecedencia inteira do task) que cobre 3 ticks consecutivos
 *     sem buraco. A idempotencia por sessao (ultimo_aviso_2fa_em <
 *     ultimo_login_2fa_em) garante que so 1 envio sai por janela de 8h
 *     mesmo com a janela varrida sendo larga.
 *   - Idempotencia por janela ativa: so envia se ultimo_aviso_2fa_em IS NULL
 *     OR ultimo_aviso_2fa_em < ultimo_login_2fa_em (1 aviso por janela 8h).
 *   - Email obrigatorio (Gmail), WhatsApp best-effort (so se CEO_WHATSAPP
 *     env var existir — owner pode ainda nao ter cadastrado celular).
 *   - Defensivo: nunca lanca, log + segue. Mesmo se email falhar, gravamos
 *     ultimo_aviso_2fa_em pra evitar reentrar e spammar — o banner in-app
 *     continua sendo o fallback se ele abrir o painel.
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getGmailClient } from "../google-gmail";
import { logger } from "../logger";
import { enviarWhatsapp } from "../../services/whatsappService";

const TICK_MS = 5 * 60 * 1000; // 5min
// IDs ja em uso na familia 30303xxx: 30303030 (parqStatus), 30303031
// (alertaCEO + verificarPdfsCofre — colisao pre-existente, nao deste task),
// 30303032 (relatorioDiarioCEO + pdfRetryUploadResumoDiario), 30303033
// (alertaKillSwitchEmailsCEO). Pegamos o proximo livre: 30303034.
const ADVISORY_LOCK_ID = 30303034;
const JANELA_2FA_MIN = 8 * 60; // 480min = 8h
const ANTECEDENCIA_MIN = 15; // avisar ~15min antes
const FROM_ADDR =
  process.env["PAWARDS_EMAIL_FROM"] || "clinica.padua.agenda@gmail.com";
const CEO_WHATSAPP = process.env["CEO_WHATSAPP"] || "";

let executandoAgora = false;
let workerStarted = false;

interface OwnerCandidato {
  id: number;
  nome: string;
  email: string;
  ultimo_login_2fa_em: Date;
}

function sanitizeHeader(s: string): string {
  return String(s ?? "").replace(/[\r\n]/g, "").trim();
}

function buildEmailRaw(to: string, subject: string, htmlBody: string): string {
  const parts = [
    `From: PAWARDS - Seguranca Plataforma <${FROM_ADDR}>`,
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

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function urlPlataforma(): string {
  const base =
    process.env["PUBLIC_APP_URL"] ||
    (process.env["REPLIT_DOMAINS"]
      ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]?.trim() ?? ""}`
      : "");
  return `${base}/plataforma`;
}

function montarHtml(opts: {
  nome: string;
  minutosRestantes: number;
  url: string;
}): string {
  return `<!DOCTYPE html>
<html><body style="font-family:JetBrains Mono,monospace;color:#1a1a1a;background:#f5f5f5;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#fff;padding:30px;border-left:4px solid #d97a3c">
  <h2 style="margin:0 0 16px 0;color:#d97a3c">[PAWARDS] Seu 2FA do painel /plataforma expira em ~${opts.minutosRestantes}min</h2>
  <p>Ola ${escapeHtml(opts.nome)},</p>
  <p>A janela de 8h do seu 2FA esta prestes a expirar. Se voce esta no meio
  de algo (suspensao de unidade, exclusao, promocao de admin) ou pretende
  voltar pro painel logo, renove agora pra nao ser interrompido.</p>
  <p style="margin:24px 0">
    <a href="${escapeHtml(opts.url)}"
       style="background:#3a4a5a;color:#fff;padding:12px 20px;text-decoration:none;display:inline-block">
      Renovar 2FA agora
    </a>
  </p>
  <p style="color:#666;font-size:12px;margin-top:30px">Este e um email automatico
  do motor de seguranca PAWARDS (Task #146). Voce so recebe 1 aviso por
  sessao de 8h. Nao responda.</p>
</div>
</body></html>`;
}

function montarTextoWhatsapp(opts: { minutosRestantes: number; url: string }): string {
  return [
    `[PAWARDS] Seu 2FA do painel /plataforma expira em ~${opts.minutosRestantes}min.`,
    `Renove agora em: ${opts.url}`,
  ].join("\n");
}

async function tick(): Promise<void> {
  if (executandoAgora) return;
  executandoAgora = true;
  let lockOk = false;
  try {
    const lockResult: any = await db.execute(
      sql`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID}) AS got`,
    );
    lockOk = Boolean(((lockResult.rows ?? lockResult)[0] || {}).got);
    if (!lockOk) return;

    // Janela: ultimo_login_2fa_em entre (now - 8h) e (now - 7h45min) —
    // exatamente os 15min de antecedencia pedidos pelo task. Cobre 3 ticks
    // consecutivos de 5min sem buraco. A idempotencia por sessao
    // (ultimo_aviso_2fa_em < ultimo_login_2fa_em) garante 1 unico envio
    // por janela de 8h mesmo varrendo intervalo largo.
    const minMin = JANELA_2FA_MIN - ANTECEDENCIA_MIN; // 465min = 7h45
    const maxMin = JANELA_2FA_MIN;                    // 480min = 8h

    const candidatosResult: any = await db.execute(sql`
      SELECT id, nome, email, ultimo_login_2fa_em
        FROM usuarios
       WHERE perfil_plataforma = 'platform_owner'
         AND ativo = true
         AND ultimo_login_2fa_em IS NOT NULL
         AND email IS NOT NULL AND email <> ''
         AND ultimo_login_2fa_em <= now() - INTERVAL '${sql.raw(String(minMin))} minutes'
         AND ultimo_login_2fa_em >  now() - INTERVAL '${sql.raw(String(maxMin))} minutes'
         AND (
           ultimo_aviso_2fa_em IS NULL
           OR ultimo_aviso_2fa_em < ultimo_login_2fa_em
         )
    `);
    const candidatos: OwnerCandidato[] =
      candidatosResult.rows ?? candidatosResult;

    if (candidatos.length === 0) return;

    logger.info(
      { total: candidatos.length },
      "[aviso-2fa-owner] enviando avisos de expiracao",
    );

    const url = urlPlataforma();

    for (const c of candidatos) {
      const ultimoMs = new Date(c.ultimo_login_2fa_em).getTime();
      const expiraMs = ultimoMs + JANELA_2FA_MIN * 60_000;
      const minutosRestantes = Math.max(
        1,
        Math.round((expiraMs - Date.now()) / 60_000),
      );

      // Email — alvo principal (sempre tenta).
      try {
        const gmail = await getGmailClient();
        const html = montarHtml({
          nome: c.nome,
          minutosRestantes,
          url,
        });
        const subject = `[PAWARDS] 2FA do painel expira em ~${minutosRestantes}min`;
        const raw = buildEmailRaw(c.email, subject, html);
        await gmail.users.messages.send({
          userId: "me",
          requestBody: { raw },
        });
      } catch (e: any) {
        logger.warn(
          { usuarioId: c.id, err: e?.message ?? String(e) },
          "[aviso-2fa-owner] falha ao enviar email",
        );
      }

      // WhatsApp — best-effort (so se CEO_WHATSAPP estiver setado).
      if (CEO_WHATSAPP) {
        try {
          const r = await enviarWhatsapp(
            CEO_WHATSAPP,
            montarTextoWhatsapp({ minutosRestantes, url }),
          );
          if (!r.sucesso) {
            logger.warn(
              { usuarioId: c.id, erro: r.erro },
              "[aviso-2fa-owner] whatsapp retornou falha",
            );
          }
        } catch (e: any) {
          logger.warn(
            { usuarioId: c.id, err: e?.message ?? String(e) },
            "[aviso-2fa-owner] erro whatsapp",
          );
        }
      }

      // Idempotencia: marca o owner mesmo se email/whatsapp falharam.
      // Caso contrario o proximo tick re-tenta e gera spam. O banner
      // in-app permanece como fallback caso ele abra o painel.
      try {
        await db.execute(sql`
          UPDATE usuarios
             SET ultimo_aviso_2fa_em = now()
           WHERE id = ${c.id}
        `);
      } catch (e: any) {
        logger.error(
          { usuarioId: c.id, err: e?.message ?? String(e) },
          "[aviso-2fa-owner] falha ao gravar ultimo_aviso_2fa_em",
        );
      }
    }
  } catch (e: any) {
    logger.error(
      { err: e?.message ?? String(e) },
      "[aviso-2fa-owner] tick falhou",
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

export function iniciarWorkerAvisoExpiracao2faOwner(): void {
  if (workerStarted) return;
  workerStarted = true;
  logger.info(
    { tickMs: TICK_MS, antecedenciaMin: ANTECEDENCIA_MIN },
    "[aviso-2fa-owner] worker iniciado",
  );
  setTimeout(() => {
    void tick();
  }, 45_000);
  setInterval(() => {
    void tick();
  }, TICK_MS).unref();
}

/** Disparo manual pra testes. */
export async function rodarAvisoExpiracao2faOwnerAgora(): Promise<void> {
  await tick();
}
