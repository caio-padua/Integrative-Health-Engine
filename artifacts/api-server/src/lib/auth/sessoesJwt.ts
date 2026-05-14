/**
 * Task #202 — Helpers compartilhados pra registrar e marcar uso de
 * sessoes JWT. Centralizado pra que login senha-only (usuarios.ts) e
 * login pos-2FA (twoFactor.ts) usem exatamente a mesma logica de
 * persistencia.
 */
import type { Request } from "express";
import { db } from "@workspace/db";
import { sessoesJwtTable } from "@workspace/db/schema";

export const TTL_SESSAO_SEGUNDOS = 60 * 60 * 8; // 8h, igual ao default do signJwt

export function extrairUserAgent(req: Request): string | null {
  const ua = req.header("user-agent");
  if (!ua) return null;
  return ua.length > 500 ? ua.slice(0, 500) : ua;
}

export function extrairIp(req: Request): string | null {
  const fwd = req.header("x-forwarded-for");
  if (fwd) {
    const primeiro = fwd.split(",")[0]?.trim();
    if (primeiro) return primeiro.slice(0, 64);
  }
  const ip = req.ip || req.socket?.remoteAddress || null;
  return ip ? ip.slice(0, 64) : null;
}

export async function registrarSessao(params: {
  usuarioId: number;
  jti: string;
  userAgent: string | null;
  ip: string | null;
  ttlSeconds?: number;
}): Promise<void> {
  const ttl = params.ttlSeconds ?? TTL_SESSAO_SEGUNDOS;
  const expiraEm = new Date(Date.now() + ttl * 1000);
  await db.insert(sessoesJwtTable).values({
    usuarioId: params.usuarioId,
    jti: params.jti,
    userAgent: params.userAgent,
    ip: params.ip,
    expiraEm,
  });
}
