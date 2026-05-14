/**
 * Task #222 — Alerta quando admin entra usando codigo de recuperacao 2FA.
 *
 * Quando o endpoint POST /usuarios/login/2fa-verificar (routes/twoFactor.ts)
 * aceita um codigo de recuperacao (XXXX-XXXX) em vez do TOTP de 6 digitos,
 * este modulo:
 *   1) Insere 1 linha em `alertas_ceo_seguranca` com tipo
 *      '2FA_LOGIN_RECUPERACAO' (CHECK estendido pela Migration 055).
 *   2) Envia email + WhatsApp pro PROPRIO DONO da conta — diferente do
 *      alerta de brute-force (Task #143), que avisa o platform_owner.
 *      A logica e: se o login foi indevido (codigo vazado), o dono real
 *      precisa saber em segundos pra trocar senha + revogar sessoes +
 *      regerar codigos. O CEO/platform_owner so se envolve se virar
 *      escalonamento — e ja consegue ver o alerta na fila Task #152.
 *
 * Defensivo: nunca lanca. O fluxo de auth nao pode ser derrubado por falha
 * em enfileirar alerta secundario (mesmo padrao do alertaBruteForceTotp).
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getGmailClient } from "../google-gmail";
import { logger } from "../logger";
import { enviarWhatsapp } from "../../services/whatsappService";

// Task #222 — seam de injecao pro gmail client. Mesmo padrao do
// alertaBruteForceTotp (Task #163): em producao usa o factory real;
// em testes a suite substitui por stub sem rede.
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

// Task #222 — seam de injecao pro canal WhatsApp (mesmo padrao Task #166).
type EnviarWhatsappFn = typeof enviarWhatsapp;
let enviarWhatsappImpl: EnviarWhatsappFn = enviarWhatsapp;
export function _setEnviarWhatsappParaTestes(f: EnviarWhatsappFn): void {
  enviarWhatsappImpl = f;
}
export function _resetEnviarWhatsappParaTestes(): void {
  enviarWhatsappImpl = enviarWhatsapp;
}

const FROM_LABEL = "PAWARDS - Seguranca";
const FROM_ADDR =
  process.env["PAWARDS_EMAIL_FROM"] || "clinica.padua.agenda@gmail.com";

export interface DispararAlertaLoginRecuperacaoArgs {
  usuarioId: number;
  ip: string;
  userAgent: string;
  /**
   * Quantos codigos de recuperacao ainda restam APOS este consumo. O dono
   * usa essa contagem pra decidir se ja deve regerar (ex: <= 2 restantes).
   */
  codigosRestantes: number;
  /** Total da cota original (CODIGOS_RECUPERACAO_TOTAL). */
  codigosTotal: number;
  /** Quando o login aceitou o codigo. Default = now(). */
  ocorridoEm?: Date;
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
  ip: string;
  userAgent: string;
  ocorridoEm: Date;
  codigosRestantes: number;
  codigosTotal: number;
  linkPerfil: string;
}): string {
  const baixoEstoque = opts.codigosRestantes <= 2;
  return `<!DOCTYPE html><html><body style="font-family: Georgia, serif; color:#1a1a2e; max-width:640px; margin:0 auto; padding:24px;">
  <h2 style="color:#d97a3c; border-bottom: 2px solid #d97a3c; padding-bottom:8px;">[PAWARDS] Login com codigo de recuperacao 2FA</h2>
  <p>Detectamos um login na sua conta <strong>${escapeHtml(opts.usuarioEmail)}</strong> usando um <strong>codigo de recuperacao 2FA</strong> em vez do app autenticador.</p>
  <p style="background:#fff7e6; padding:12px; border-left:4px solid #d97a3c;">
    <strong>Quando:</strong> ${escapeHtml(dataPtBr(opts.ocorridoEm))}<br/>
    <strong>IP:</strong> ${escapeHtml(opts.ip || "(nao registrado)")}<br/>
    <strong>Dispositivo:</strong> ${escapeHtml(opts.userAgent || "(nao registrado)")}<br/>
    <strong>Codigos restantes:</strong> ${opts.codigosRestantes} de ${opts.codigosTotal}
  </p>
  <p><strong>Foi voce?</strong> Se sim, recupere o acesso ao app autenticador (Google Authenticator / Authy / 1Password) o quanto antes — codigos de recuperacao sao um atalho de emergencia, nao a forma normal de entrar.</p>
  <p><strong>Nao foi voce?</strong> Sua conta pode estar comprometida. Acoes imediatas:</p>
  <ol>
    <li>Troque a senha da sua conta PAWARDS.</li>
    <li>Regere os codigos de recuperacao (invalida todos os antigos, inclusive o que acabou de ser usado).</li>
    <li>Revogue todas as sessoes ativas (logout forcado).</li>
  </ol>
  <p><a href="${escapeHtml(opts.linkPerfil)}" style="display:inline-block; background:#7d1d2e; color:#fff; padding:10px 20px; text-decoration:none; border-radius:0;">Abrir minha conta agora</a></p>
  ${baixoEstoque ? `<p style="background:#fdecea; padding:12px; border-left:4px solid #7d1d2e; color:#7d1d2e;"><strong>Atencao:</strong> Restam apenas ${opts.codigosRestantes} codigos de recuperacao. Quando chegarem a zero, perder o app autenticador significa perder acesso a conta. Considere regerar os codigos agora.</p>` : ""}
  <p style="font-size:12px; color:#666; margin-top:32px; border-top:1px solid #ddd; padding-top:8px;">Mensagem automatica do motor PAWARDS. Esse evento ficou registrado em alertas_ceo_seguranca pra auditoria — o platform_owner tambem ve esta ocorrencia na fila de seguranca.</p>
</body></html>`;
}

/**
 * Insere o alerta na fila e dispara email + WhatsApp pro proprio dono da
 * conta. Idempotente: UNIQUE(tipo, usuario_id, janela_inicio_em) garante 1
 * linha por instante (na pratica nunca colide pois usamos `ocorridoEm` com
 * resolucao de microssegundos).
 */
export async function dispararAlertaLoginRecuperacao(
  args: DispararAlertaLoginRecuperacaoArgs,
): Promise<void> {
  const ocorridoEm = args.ocorridoEm ?? new Date();
  try {
    // 1) Carrega dados do dono da conta — destinatario do alerta.
    const userRow = await db.execute<{
      id: number;
      nome: string | null;
      email: string | null;
      telefone: string | null;
    }>(sql`
      SELECT id, nome, email, telefone FROM usuarios WHERE id = ${args.usuarioId} LIMIT 1
    `);
    const usuario = (userRow.rows ?? [])[0];
    const usuarioNome = usuario?.nome ?? "(usuario desconhecido)";
    const usuarioEmail = (usuario?.email ?? "").trim();
    const usuarioTelefone = (usuario?.telefone ?? "").replace(/\D/g, "");

    const destinatariosEmail = usuarioEmail.includes("@")
      ? [usuarioEmail.toLowerCase()]
      : [];
    const destinatariosWpp = usuarioTelefone.length >= 10 ? [usuarioTelefone] : [];

    // 2) Insere o alerta. ON CONFLICT DO NOTHING evita spam (defesa extra
    //    pra caso o helper seja chamado duas vezes pro mesmo evento).
    const insertRes = await db.execute<{ id: number }>(sql`
      INSERT INTO alertas_ceo_seguranca
        (tipo, usuario_id, janela_inicio_em, ip, user_agent, contexto, payload, notif_destinatarios)
      VALUES (
        '2FA_LOGIN_RECUPERACAO',
        ${args.usuarioId},
        ${ocorridoEm.toISOString()}::timestamptz,
        ${args.ip || null},
        ${args.userAgent || null},
        'LOGIN_2FA',
        ${JSON.stringify({
          codigosRestantes: args.codigosRestantes,
          codigosTotal: args.codigosTotal,
        })}::jsonb,
        ${JSON.stringify(destinatariosEmail)}::jsonb
      )
      ON CONFLICT (tipo, usuario_id, janela_inicio_em) DO NOTHING
      RETURNING id
    `);
    const alertaId = (insertRes.rows ?? [])[0]?.id;
    if (!alertaId) {
      // Ja existia — no-op (sem re-enviar email NEM wpp).
      return;
    }

    const linkPerfil = `${publicAppUrl()}/plataforma/perfil`;

    // 3) Canal WhatsApp primeiro (mesmo motivo do brute-force: real-time
    //    pro celular do dono — em login indevido fora de horario, segundos
    //    importam).
    {
      let wppEnviados = 0;
      let wppFalhas = 0;
      if (destinatariosWpp.length === 0) {
        logger.warn(
          { alertaId, usuarioId: args.usuarioId },
          "[alertaLoginRecuperacao] dono sem telefone cadastrado (canal wpp pulado)",
        );
      } else {
        const linhas = [
          "[PAWARDS][SEGURANCA] Login com codigo de recuperacao 2FA",
          "",
          `Conta: ${usuarioEmail || usuarioNome}`,
          `Quando: ${dataPtBr(ocorridoEm)}`,
          `IP: ${args.ip || "(nao registrado)"}`,
          `Codigos restantes: ${args.codigosRestantes} de ${args.codigosTotal}`,
          "",
          "Foi voce? Recupere o app autenticador o quanto antes.",
          "Nao foi voce? Troque a senha + regere os codigos AGORA.",
          "",
          `Abrir conta: ${linkPerfil}`,
        ];
        const mensagem = linhas.join("\n");
        for (const tel of destinatariosWpp) {
          try {
            const r = await enviarWhatsappImpl(tel, mensagem);
            if (r.sucesso) {
              wppEnviados++;
            } else {
              wppFalhas++;
              logger.warn(
                { alertaId, tel, erro: r.erro },
                "[alertaLoginRecuperacao] whatsapp falhou (provedor)",
              );
            }
          } catch (err) {
            wppFalhas++;
            logger.warn(
              { err, alertaId, tel },
              "[alertaLoginRecuperacao] whatsapp lancou excecao (silenciada)",
            );
          }
        }
      }

      try {
        await db.execute(sql`
          UPDATE alertas_ceo_seguranca
             SET notif_wpp_enviados = ${wppEnviados},
                 notif_wpp_falhas   = ${wppFalhas}
           WHERE id = ${alertaId}
        `);
      } catch (err) {
        logger.warn(
          { err, alertaId },
          "[alertaLoginRecuperacao] falha ao gravar contadores wpp (silenciada)",
        );
      }
    }

    // 4) Canal email (isolado em try/catch — falha aqui NAO derruba auth).
    try {
      if (destinatariosEmail.length === 0) {
        logger.warn(
          { alertaId, usuarioId: args.usuarioId },
          "[alertaLoginRecuperacao] dono sem email cadastrado (canal email pulado)",
        );
      } else {
        let gmail;
        try {
          gmail = await gmailClientFactory();
        } catch (err) {
          logger.error({ err, alertaId }, "[alertaLoginRecuperacao] gmail client indisponivel");
          await db.execute(sql`
            UPDATE alertas_ceo_seguranca
               SET notif_email_falhas = ${destinatariosEmail.length}
             WHERE id = ${alertaId}
          `);
          return;
        }

        const subject = `[PAWARDS][SEGURANCA] Login com codigo de recuperacao 2FA detectado`;
        const html = htmlAlerta({
          usuarioNome,
          usuarioEmail,
          ip: args.ip,
          userAgent: args.userAgent,
          ocorridoEm,
          codigosRestantes: args.codigosRestantes,
          codigosTotal: args.codigosTotal,
          linkPerfil,
        });

        let enviados = 0;
        let falhas = 0;
        for (const to of destinatariosEmail) {
          try {
            const raw = buildRaw(to, subject, html);
            await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
            enviados++;
          } catch (err) {
            falhas++;
            logger.warn({ err, to, alertaId }, "[alertaLoginRecuperacao] falha ao enviar email");
          }
        }

        await db.execute(sql`
          UPDATE alertas_ceo_seguranca
             SET notif_email_enviados = ${enviados},
                 notif_email_falhas = ${falhas}
           WHERE id = ${alertaId}
        `);
      }
    } catch (err) {
      logger.warn(
        { err, alertaId },
        "[alertaLoginRecuperacao] canal email lancou excecao (silenciada)",
      );
    }
  } catch (err) {
    // Defensivo total: nunca derruba o fluxo de auth.
    logger.error({ err, args }, "[alertaLoginRecuperacao] falha inesperada (silenciada)");
  }
}
