/**
 * Wave 13 F3 — Worker diario de carencia LGPD 2FA.
 *
 * Pra cada tenant_admin que ainda NAO ativou 2FA e foi criado ha menos
 * de 30 dias, dispara 1 email por dia avisando "faltam X dias pra ativar
 * 2FA obrigatorio". Idempotente via UNIQUE(usuario_id, dia_brt) na
 * tabela notif_carencia_2fa_envios (Migration 045).
 *
 * Tick: 1h. Lock distribuido: pg_try_advisory_lock(13030245).
 * Janela funcional: dispara 08:00–22:00 BRT (evita madrugada).
 *
 * Defensivo: nunca lanca, log + segue. Falha de email registra status='ERRO'
 * mas mantem UNIQUE pra nao reentrar no mesmo dia (rerun manual no dia
 * seguinte).
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getGmailClient } from "../google-gmail";
import { logger } from "../logger";

const TICK_MS = 60 * 60 * 1000; // 1h
const ADVISORY_LOCK_ID = 13030245;
const CARENCIA_DIAS = 30;
const HORA_MIN_BRT = 8;
const HORA_MAX_BRT = 22;
const FROM_ADDR = "clinica.padua.agenda@gmail.com";

let executandoAgora = false;
let workerStarted = false;

interface AdminCarencia {
  id: number;
  nome: string;
  email: string;
  criado_em: Date;
  dias_decorridos: number;
}

function hojeBrtISO(): string {
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function horaBrt(): number {
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return d.getUTCHours();
}

function sanitizeHeader(s: string): string {
  return s.replace(/[\r\n]/g, " ").trim();
}

function montarEmail(to: string, subject: string, html: string): string {
  const messageParts = [
    `From: PAWARDS - Seguranca <${FROM_ADDR}>`,
    `To: ${sanitizeHeader(to)}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(html).toString("base64"),
  ];
  return Buffer.from(messageParts.join("\r\n")).toString("base64url");
}

function montarHtml(opts: { nome: string; diasRestantes: number }): string {
  const urgente = opts.diasRestantes <= 7;
  const cor = urgente ? "#7d1d2e" : "#3a4a5a";
  return `<!DOCTYPE html>
<html><body style="font-family:JetBrains Mono,monospace;color:#1a1a1a;background:#f5f5f5;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#fff;padding:30px;border-left:4px solid ${cor}">
  <h2 style="margin:0 0 16px 0;color:${cor}">[PAWARDS] Ativacao de 2FA pendente</h2>
  <p>Ola ${opts.nome},</p>
  <p>Sua conta tem perfil <b>tenant_admin</b> (administrador de tenant) e ainda nao
  ativou autenticacao em 2 fatores (2FA).</p>
  <p style="font-size:18px;color:${cor};margin:24px 0"><b>Faltam ${opts.diasRestantes} dia(s)</b>
  pra ativacao se tornar obrigatoria pelo controle LGPD da plataforma.</p>
  <p>Pra ativar, acesse seu painel e siga: <i>Perfil &rarr; Seguranca &rarr; Ativar 2FA</i>.
  Voce vai escanear um QR code com Google Authenticator / Authy / 1Password / Bitwarden
  e confirmar com 1 codigo de 6 digitos.</p>
  <p style="color:#666;font-size:12px;margin-top:30px">Este e um email automatico do
  motor de seguranca PAWARDS. Nao responda.</p>
</div>
</body></html>`;
}

async function tick(): Promise<void> {
  if (executandoAgora) return;
  executandoAgora = true;
  try {
    const hora = horaBrt();
    if (hora < HORA_MIN_BRT || hora >= HORA_MAX_BRT) return;

    const lockResult: any = await db.execute(
      sql`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID}) AS got`,
    );
    const got = (lockResult.rows ?? lockResult)[0]?.got;
    if (!got) return;

    try {
      const dia = hojeBrtISO();
      // Tenant admins ATIVOS sem 2FA, criados nos ultimos 30 dias,
      // sem envio registrado pra hoje.
      const candidatosResult: any = await db.execute(sql`
        SELECT u.id, u.nome, u.email, u.criado_em,
               EXTRACT(DAY FROM (now() - u.criado_em))::int AS dias_decorridos
          FROM usuarios u
         WHERE u.perfil_plataforma = 'tenant_admin'
           AND u.ativo = true
           AND u.totp_ativado_em IS NULL
           AND u.criado_em > now() - INTERVAL '${sql.raw(String(CARENCIA_DIAS))} days'
           AND NOT EXISTS (
             SELECT 1 FROM notif_carencia_2fa_envios n
              WHERE n.usuario_id = u.id AND n.dia_brt = ${dia}::date
           )
      `);
      const candidatos: AdminCarencia[] = candidatosResult.rows ?? candidatosResult;

      if (candidatos.length === 0) return;

      logger.info(
        { total: candidatos.length, dia },
        "[carencia-2fa] enviando lembretes diarios",
      );

      for (const c of candidatos) {
        const diasRestantes = Math.max(0, CARENCIA_DIAS - Number(c.dias_decorridos ?? 0));
        let status: "OK" | "ERRO" = "OK";
        let erro: string | null = null;
        try {
          const gmail = await getGmailClient();
          const html = montarHtml({ nome: c.nome, diasRestantes });
          const subject = `[PAWARDS] 2FA obrigatorio em ${diasRestantes} dia(s)`;
          const raw = montarEmail(c.email, subject, html);
          await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
        } catch (e: any) {
          status = "ERRO";
          erro = (e?.message ?? String(e)).slice(0, 500);
          logger.warn(
            { usuarioId: c.id, erro },
            "[carencia-2fa] falha ao enviar email",
          );
        }
        try {
          await db.execute(sql`
            INSERT INTO notif_carencia_2fa_envios
              (usuario_id, dia_brt, dias_restantes, email_destinatario, status, erro)
            VALUES (${c.id}, ${dia}::date, ${diasRestantes}, ${c.email},
                    ${status}, ${erro})
            ON CONFLICT (usuario_id, dia_brt) DO NOTHING
          `);
        } catch (e: any) {
          logger.error(
            { usuarioId: c.id, err: e?.message ?? String(e) },
            "[carencia-2fa] falha ao registrar envio",
          );
        }
      }
    } finally {
      await db.execute(sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`);
    }
  } catch (e: any) {
    logger.error({ err: e?.message ?? String(e) }, "[carencia-2fa] tick falhou");
  } finally {
    executandoAgora = false;
  }
}

export function iniciarWorkerCarenciaLgpd2fa(): void {
  if (workerStarted) return;
  workerStarted = true;
  logger.info(
    { tickMs: TICK_MS, carenciaDias: CARENCIA_DIAS },
    "[carencia-2fa] worker iniciado",
  );
  setTimeout(() => {
    void tick();
  }, 30_000); // primeira execucao depois de 30s
  setInterval(() => {
    void tick();
  }, TICK_MS);
}
