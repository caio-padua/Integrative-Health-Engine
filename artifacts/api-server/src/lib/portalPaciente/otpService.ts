/**
 * Wave 4 PACIENTE-TSUNAMI · OTP Service
 * Gera código 6 dígitos, salva hash bcrypt em paciente_otp, envia email branded
 * MEDCORE via Gmail integration (mesma stack da Wave 2 — getGmailClient +
 * wrapEmailMedcore). Sessão é gerenciada pelo frontend (localStorage), igual
 * ao login com senha já existente em portalCliente.ts.
 */

import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getGmailClient } from "../google-gmail";
import { wrapEmailMedcore } from "../recorrencia/notifTemplate";

const OTP_TTL_MIN = 10;
const OTP_MAX_TENTATIVAS = 5;
const FROM_ADDR = "clinica.padua.agenda@gmail.com";

function gerarCodigo6Digitos(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function sanitizeHeader(s: unknown): string {
  return String(s ?? "").replace(/[\r\n]/g, "").trim();
}

function buildEmailRaw(to: string, subject: string, htmlBody: string): string {
  const parts = [
    `From: PAWARDS - Instituto Padua <${FROM_ADDR}>`,
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

export interface OtpSolicitarParams {
  pacienteId: number;
  pacienteNome: string;
  email: string;
  unidadeNick?: string;
  ipOrigem?: string;
}

export interface OtpSolicitarResult {
  ok: boolean;
  expiraEm: string;
  destino_mascarado: string;
  erro?: string;
}

/**
 * Gera código, salva hash, envia email branded.
 * NÃO retorna o código em claro.
 */
export async function solicitarOtp(p: OtpSolicitarParams): Promise<OtpSolicitarResult> {
  const email = sanitizeHeader(p.email);
  if (!email || !email.includes("@")) {
    return { ok: false, expiraEm: "", destino_mascarado: "", erro: "email_invalido" };
  }

  // Anti-flood: se já tem OTP válido criado nos últimos 60s, recusa
  const recente = await db.execute(sql`
    SELECT id, criado_em FROM paciente_otp
    WHERE paciente_id = ${p.pacienteId}
      AND usado_em IS NULL
      AND criado_em > now() - interval '60 seconds'
    ORDER BY criado_em DESC LIMIT 1
  `);
  const recRows = (recente as any).rows ?? recente;
  if (Array.isArray(recRows) && recRows.length > 0) {
    return {
      ok: false,
      expiraEm: "",
      destino_mascarado: mascararEmail(email),
      erro: "aguarde_60_segundos",
    };
  }

  const codigo = gerarCodigo6Digitos();
  const codigoHash = await bcrypt.hash(codigo, 10);
  const expiraEm = new Date(Date.now() + OTP_TTL_MIN * 60_000);

  await db.execute(sql`
    INSERT INTO paciente_otp (paciente_id, codigo_hash, destinatario, canal, expira_em, ip_origem)
    VALUES (
      ${p.pacienteId},
      ${codigoHash},
      ${email},
      'EMAIL',
      ${expiraEm.toISOString()}::timestamptz,
      ${p.ipOrigem || null}::inet
    )
  `);

  // Email branded usando o mesmo template MEDCORE da Wave 2
  const subject = "Seu código de acesso ao portal PAWARDS";
  const corpoTexto =
    `Olá, ${p.pacienteNome}.\n\n` +
    `Use o código abaixo para acessar o portal do paciente:\n\n` +
    `<div style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#020406;text-align:center;margin:24px 0;padding:16px;background:#FAF7F0;border:2px dashed #C89B3C;border-radius:8px;">${codigo}</div>\n\n` +
    `O código é válido por <strong>${OTP_TTL_MIN} minutos</strong>.\n\n` +
    `Se você não solicitou este código, ignore este email — ninguém conseguirá entrar na sua conta sem ele.`;

  const html = wrapEmailMedcore({
    subject,
    bodyHtmlOrText: corpoTexto,
    pacienteNome: p.pacienteNome,
    unidadeNick: p.unidadeNick,
  });

  try {
    const gmail = await getGmailClient();
    const raw = buildEmailRaw(email, subject, html);
    await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
  } catch (e: any) {
    return {
      ok: false,
      expiraEm: "",
      destino_mascarado: mascararEmail(email),
      erro: `falha_envio:${String(e?.message || e).slice(0, 100)}`,
    };
  }

  return {
    ok: true,
    expiraEm: expiraEm.toISOString(),
    destino_mascarado: mascararEmail(email),
  };
}

export interface OtpValidarParams {
  pacienteId: number;
  codigo: string;
}

export interface OtpValidarResult {
  ok: boolean;
  erro?: string;
}

export async function validarOtp(p: OtpValidarParams): Promise<OtpValidarResult> {
  const codigoTrim = String(p.codigo || "").trim();
  if (!/^\d{6}$/.test(codigoTrim)) {
    return { ok: false, erro: "codigo_formato_invalido" };
  }

  // Pega o OTP mais recente, ainda válido
  const r = await db.execute(sql`
    SELECT id, codigo_hash, tentativas, expira_em
    FROM paciente_otp
    WHERE paciente_id = ${p.pacienteId}
      AND usado_em IS NULL
      AND expira_em > now()
    ORDER BY criado_em DESC
    LIMIT 1
  `);
  const rows = ((r as any).rows ?? r) as any[];
  if (!rows || rows.length === 0) {
    return { ok: false, erro: "codigo_expirado_ou_inexistente" };
  }
  const row = rows[0];

  if (Number(row.tentativas) >= OTP_MAX_TENTATIVAS) {
    return { ok: false, erro: "tentativas_excedidas" };
  }

  const match = await bcrypt.compare(codigoTrim, row.codigo_hash);
  if (!match) {
    await db.execute(sql`
      UPDATE paciente_otp SET tentativas = tentativas + 1 WHERE id = ${row.id}
    `);
    return { ok: false, erro: "codigo_incorreto" };
  }

  // Sucesso: marca usado_em
  await db.execute(sql`
    UPDATE paciente_otp SET usado_em = now() WHERE id = ${row.id}
  `);
  return { ok: true };
}

function mascararEmail(email: string): string {
  const [user, dom] = email.split("@");
  if (!user || !dom) return "***";
  const userMask =
    user.length <= 2 ? user[0] + "*" : user[0] + "***" + user[user.length - 1];
  return `${userMask}@${dom}`;
}
