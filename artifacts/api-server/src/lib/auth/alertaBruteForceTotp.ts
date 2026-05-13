/**
 * Task #143 — Alerta CEO quando alguem fica bloqueado no 2FA por brute-force.
 *
 * Quando o helper `estaBloqueadoTotp()` (Task #131) transita pra true pela 1a
 * vez na janela de 5min, este modulo:
 *   1) Insere 1 linha em `alertas_ceo_seguranca` (UNIQUE garante no-spam).
 *   2) Envia email pro platform_owner com link pra acao corretiva.
 *
 * Defensivo: nunca lanca. O fluxo de auth nao pode ser derrubado por falha
 * em enfileirar alerta secundario.
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getGmailClient } from "../google-gmail";
import { logger } from "../logger";

const FROM_LABEL = "PAWARDS - Seguranca";
const FROM_ADDR =
  process.env["PAWARDS_EMAIL_FROM"] || "clinica.padua.agenda@gmail.com";

export type ContextoBruteForce = "LOGIN_2FA" | "STEP_UP_PAINEL";

export interface DispararAlertaBruteForceArgs {
  usuarioId: number;
  ip: string;
  userAgent: string;
  janelaInicioEm: Date;
  contexto: ContextoBruteForce;
  /** Quantidade de tentativas erradas que dispararam o bloqueio (>= TOTP_TENTATIVAS_MAX). */
  tentativas: number;
}

function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]/g, "").trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dataPtBr(d: Date): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

function publicAppUrl(): string {
  const fromEnv = process.env["PUBLIC_APP_URL"];
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  const dom = process.env["REPLIT_DOMAINS"];
  if (dom) return `https://${dom.split(",")[0]?.trim() ?? ""}`.replace(/\/+$/, "");
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

function htmlAlerta(opts: {
  usuarioNome: string;
  usuarioEmail: string;
  usuarioId: number;
  ip: string;
  userAgent: string;
  contexto: ContextoBruteForce;
  janelaInicioEm: Date;
  tentativas: number;
  linkAdmin: string;
}): string {
  const ctxLabel =
    opts.contexto === "STEP_UP_PAINEL"
      ? "Step-up 2FA do painel platform_owner"
      : "Login 2FA";
  return `<!DOCTYPE html><html><body style="font-family: Georgia, serif; color:#1a1a2e; max-width:640px; margin:0 auto; padding:24px;">
  <h2 style="color:#7d1d2e; border-bottom: 2px solid #7d1d2e; padding-bottom:8px;">[PAWARDS] Possivel brute-force no 2FA</h2>
  <p>O motor de governanca detectou <strong>${opts.tentativas} tentativas erradas</strong> de codigo TOTP em menos de 5 minutos contra a conta abaixo. O usuario foi automaticamente bloqueado por 5 minutos (rate-limit Task #131).</p>
  <p style="background:#f5f1e8; padding:12px; border-left:4px solid #7d1d2e;">
    <strong>Usuario:</strong> ${escapeHtml(opts.usuarioNome)} (#${opts.usuarioId})<br/>
    <strong>Email:</strong> ${escapeHtml(opts.usuarioEmail)}<br/>
    <strong>Contexto:</strong> ${escapeHtml(ctxLabel)}<br/>
    <strong>Inicio da janela:</strong> ${escapeHtml(dataPtBr(opts.janelaInicioEm))}<br/>
    <strong>IP:</strong> ${escapeHtml(opts.ip || "(nao registrado)")}<br/>
    <strong>User-Agent:</strong> ${escapeHtml(opts.userAgent || "(nao registrado)")}
  </p>
  <p>Se voce nao reconhece essa atividade, abra o painel de admins e <strong>desative a conta</strong> ou rebaixe o perfil pra forcar logout do atacante antes que ele consiga adivinhar o codigo.</p>
  <p><a href="${escapeHtml(opts.linkAdmin)}" style="display:inline-block; background:#7d1d2e; color:#fff; padding:10px 20px; text-decoration:none; border-radius:0;">Abrir painel de admins</a></p>
  <p style="font-size:12px; color:#666; margin-top:32px; border-top:1px solid #ddd; padding-top:8px;">Mensagem automatica do motor PAWARDS. Idempotente: 1 alerta por bloqueio (nao 1 por tentativa errada). Detalhes auditaveis em alertas_ceo_seguranca.</p>
</body></html>`;
}

/**
 * Insere o alerta na fila e dispara email pro platform_owner. Idempotente:
 * UNIQUE(tipo, usuario_id, janela_inicio_em) garante 1 linha por bloqueio.
 * Se a linha ja existia (ON CONFLICT), o email NAO e re-enviado.
 */
export async function dispararAlertaBruteForceTotp(
  args: DispararAlertaBruteForceArgs,
): Promise<void> {
  try {
    // 1) Carrega dados do usuario alvo (apenas pra enriquecer o email).
    const userRow = await db.execute<{ id: number; nome: string | null; email: string | null }>(sql`
      SELECT id, nome, email FROM usuarios WHERE id = ${args.usuarioId} LIMIT 1
    `);
    const usuario = (userRow.rows ?? [])[0];
    const usuarioNome = usuario?.nome ?? "(usuario desconhecido)";
    const usuarioEmail = usuario?.email ?? "(sem email)";

    // 2) Resolve destinatarios: platform_owner ATIVO (1 unico por UNIQUE).
    //    Fallback compat: validador_mestre ATIVO (mesma policy do alerta de
    //    upload PDF esgotado em pdfRetryUpload.ts).
    const ownerRows = await db.execute<{ email: string | null }>(sql`
      SELECT email FROM usuarios
      WHERE ativo = true
        AND email IS NOT NULL
        AND (perfil_plataforma = 'platform_owner' OR perfil = 'validador_mestre')
    `);
    const destinatarios = Array.from(
      new Set(
        (ownerRows.rows ?? [])
          .map((r) => (r.email ?? "").trim().toLowerCase())
          .filter((e) => e.includes("@")),
      ),
    );

    // 3) Tenta inserir o alerta. ON CONFLICT DO NOTHING garante no-spam.
    //    `RETURNING id` so devolve linha quando a INSERT efetivamente entrou
    //    — usamos isso pra decidir se o email vai ou nao.
    const insertRes = await db.execute<{ id: number }>(sql`
      INSERT INTO alertas_ceo_seguranca
        (tipo, usuario_id, janela_inicio_em, ip, user_agent, contexto, payload, notif_destinatarios)
      VALUES (
        '2FA_BRUTE_FORCE',
        ${args.usuarioId},
        ${args.janelaInicioEm.toISOString()}::timestamptz,
        ${args.ip || null},
        ${args.userAgent || null},
        ${args.contexto},
        ${JSON.stringify({ tentativas: args.tentativas })}::jsonb,
        ${JSON.stringify(destinatarios)}::jsonb
      )
      ON CONFLICT (tipo, usuario_id, janela_inicio_em) DO NOTHING
      RETURNING id
    `);
    const alertaId = (insertRes.rows ?? [])[0]?.id;
    if (!alertaId) {
      // Ja existia alerta pra esta janela — no-op (sem re-enviar email).
      return;
    }

    // 4) Envia email pros destinatarios (sequencial, defensivo).
    if (destinatarios.length === 0) {
      logger.warn(
        { alertaId, usuarioId: args.usuarioId },
        "[alertaBruteForceTotp] sem destinatarios platform_owner/validador_mestre ativos",
      );
      return;
    }

    let gmail;
    try {
      gmail = await getGmailClient();
    } catch (err) {
      logger.error({ err, alertaId }, "[alertaBruteForceTotp] gmail client indisponivel");
      await db.execute(sql`
        UPDATE alertas_ceo_seguranca
           SET notif_email_falhas = ${destinatarios.length}
         WHERE id = ${alertaId}
      `);
      return;
    }

    const linkAdmin = `${publicAppUrl()}/plataforma/admins?usuario_id=${args.usuarioId}`;
    const subject = `[PAWARDS][SEGURANCA] Brute-force 2FA bloqueado · ${usuarioNome} (#${args.usuarioId})`;
    const html = htmlAlerta({
      usuarioNome,
      usuarioEmail,
      usuarioId: args.usuarioId,
      ip: args.ip,
      userAgent: args.userAgent,
      contexto: args.contexto,
      janelaInicioEm: args.janelaInicioEm,
      tentativas: args.tentativas,
      linkAdmin,
    });

    let enviados = 0;
    let falhas = 0;
    for (const to of destinatarios) {
      try {
        const raw = buildRaw(to, subject, html);
        await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
        enviados++;
      } catch (err) {
        falhas++;
        logger.warn({ err, to, alertaId }, "[alertaBruteForceTotp] falha ao enviar email");
      }
    }

    await db.execute(sql`
      UPDATE alertas_ceo_seguranca
         SET notif_email_enviados = ${enviados},
             notif_email_falhas = ${falhas}
       WHERE id = ${alertaId}
    `);
  } catch (err) {
    // Defensivo total: nunca derruba o fluxo de auth por causa do alerta.
    logger.error({ err, args }, "[alertaBruteForceTotp] falha inesperada (silenciada)");
  }
}
