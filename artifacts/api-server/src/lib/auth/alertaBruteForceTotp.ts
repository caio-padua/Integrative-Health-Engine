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
import { enviarWhatsapp } from "../../services/whatsappService";

/**
 * Task #162 — Canal WhatsApp espelhando o canal email.
 *
 * Por que env var: o cadastro estruturado de telefone do platform_owner
 * (Task "Cadastrar WhatsApp do CEO pra receber alertas no celular") ainda
 * nao existe. Ate la, mantemos a mesma convencao dos outros workers de
 * alerta (alertaKillSwitchEmailsCEO Task #141, alertaAssinaturasCEO Wave
 * 10.6) que ja leem CEO_WHATSAPP. Isso evita criar duas fontes-de-verdade
 * pra "telefone do CEO" antes da migracao definitiva.
 *
 * Defensivo total: falha no WhatsApp NUNCA derruba email nem o fluxo de
 * auth — try/catch interno + try/catch externo do dispararAlertaBruteForceTotp.
 */
const CEO_WHATSAPP = process.env["CEO_WHATSAPP"] || "";

// Task #163 — seam de injecao pro gmail client. Em producao usa o factory
// real (`getGmailClient`); em testes a suite substitui por um stub sem
// rede via `_setGmailClientFactoryParaTestes`. Mesmo padrao do
// `_setTotpRateLimitStoreParaTestes` (Task #144) — preferimos injecao
// explicita no codigo do que mock de modulo (mais frageis entre versoes).
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
    //    Task #162: na MESMA query ja trazemos `telefone` pra resolver os
    //    destinatarios do canal WhatsApp em paralelo (sem 2a viagem ao DB).
    const ownerRows = await db.execute<{
      email: string | null;
      telefone: string | null;
    }>(sql`
      SELECT email, telefone FROM usuarios
      WHERE ativo = true
        AND (perfil_plataforma = 'platform_owner' OR perfil = 'validador_mestre')
    `);
    const destinatarios = Array.from(
      new Set(
        (ownerRows.rows ?? [])
          .map((r) => (r.email ?? "").trim().toLowerCase())
          .filter((e) => e.includes("@")),
      ),
    );
    // Task #162 — telefones cadastrados do platform_owner. Normaliza removendo
    // tudo que nao e digito; descarta vazios e duplicatas. CEO_WHATSAPP entra
    // como fallback explicito quando nenhum owner tem telefone cadastrado
    // (transicao ate a Task de cadastro estruturado completar).
    const destinatariosWpp = Array.from(
      new Set(
        (ownerRows.rows ?? [])
          .map((r) => (r.telefone ?? "").replace(/\D/g, ""))
          .filter((t) => t.length >= 10),
      ),
    );
    if (destinatariosWpp.length === 0 && CEO_WHATSAPP) {
      const fallback = CEO_WHATSAPP.replace(/\D/g, "");
      if (fallback.length >= 10) destinatariosWpp.push(fallback);
    }

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
      // Ja existia alerta pra esta janela — no-op (sem re-enviar email NEM wpp).
      // A UNIQUE(tipo, usuario_id, janela_inicio_em) garante "1 envio por
      // janela" em AMBOS os canais sem precisar checagem extra.
      return;
    }

    const linkAdmin = `${publicAppUrl()}/plataforma/admins?usuario_id=${args.usuarioId}`;
    const ctxLabel =
      args.contexto === "STEP_UP_PAINEL"
        ? "Step-up 2FA do painel"
        : "Login 2FA";

    // 4) Task #162 — Canal WhatsApp PRIMEIRO (e independente do email).
    //    Por que primeiro: e o canal "real-time pro celular" — em ataques
    //    fora de horario comercial, 1 push de WhatsApp chega em segundos.
    //    Por que independente do email: se o Gmail estiver indisponivel ou
    //    nao houver platform_owner com email cadastrado, o WhatsApp ainda
    //    deve sair. Isolado em try/catch proprio — qualquer excecao aqui
    //    NUNCA bloqueia o canal email nem o fluxo de auth.
    {
      let wppEnviados = 0;
      let wppFalhas = 0;
      if (destinatariosWpp.length === 0) {
        logger.warn(
          { alertaId, usuarioId: args.usuarioId },
          "[alertaBruteForceTotp] sem telefones platform_owner/validador_mestre ativos (canal wpp pulado)",
        );
      } else {
        const linhas = [
          "[PAWARDS][SEGURANCA] Brute-force 2FA bloqueado",
          "",
          `Usuario: ${usuarioNome} (#${args.usuarioId})`,
          `Email: ${usuarioEmail}`,
          `Contexto: ${ctxLabel}`,
          `Tentativas: ${args.tentativas}`,
          `Janela: ${dataPtBr(args.janelaInicioEm)}`,
          `IP: ${args.ip || "(nao registrado)"}`,
          "",
          `Painel: ${linkAdmin}`,
        ];
        const mensagem = linhas.join("\n");
        for (const tel of destinatariosWpp) {
          try {
            const r = await enviarWhatsapp(tel, mensagem);
            if (r.sucesso) {
              wppEnviados++;
            } else {
              wppFalhas++;
              logger.warn(
                { alertaId, tel, erro: r.erro },
                "[alertaBruteForceTotp] whatsapp falhou (provedor)",
              );
            }
          } catch (err) {
            wppFalhas++;
            logger.warn(
              { err, alertaId, tel },
              "[alertaBruteForceTotp] whatsapp lancou excecao (silenciada)",
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
          "[alertaBruteForceTotp] falha ao gravar contadores wpp (silenciada)",
        );
      }
    }

    // 5) Envia email pros destinatarios (sequencial, defensivo).
    //    Isolado em try/catch proprio — falha aqui NAO derruba o fluxo de
    //    auth nem reverte o canal WhatsApp ja enviado acima.
    try {
      if (destinatarios.length === 0) {
        logger.warn(
          { alertaId, usuarioId: args.usuarioId },
          "[alertaBruteForceTotp] sem destinatarios email platform_owner/validador_mestre ativos",
        );
      } else {
        let gmail;
        try {
          gmail = await gmailClientFactory();
        } catch (err) {
          logger.error({ err, alertaId }, "[alertaBruteForceTotp] gmail client indisponivel");
          await db.execute(sql`
            UPDATE alertas_ceo_seguranca
               SET notif_email_falhas = ${destinatarios.length}
             WHERE id = ${alertaId}
          `);
          return;
        }

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
      }
    } catch (err) {
      logger.warn(
        { err, alertaId },
        "[alertaBruteForceTotp] canal email lancou excecao (silenciada — wpp ja saiu)",
      );
    }
  } catch (err) {
    // Defensivo total: nunca derruba o fluxo de auth por causa do alerta.
    logger.error({ err, args }, "[alertaBruteForceTotp] falha inesperada (silenciada)");
  }
}
