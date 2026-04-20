import { createHmac, timingSafeEqual } from "node:crypto";

export interface JwtPayload {
  sub: number;
  email: string;
  perfil: string;
  escopo: string | null;
  unidadeId: number | null;
  consultoriaId: number | null;
  iat: number;
  exp: number;
}

const HEADER_B64 = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));

function getSecret(): string {
  const secret = process.env["JWT_SECRET"] || process.env["SESSION_SECRET"];
  if (!secret) {
    throw new Error("JWT_SECRET (ou SESSION_SECRET) nao esta definido no ambiente");
  }
  return secret;
}

function base64UrlEncode(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input: string): Buffer {
  const pad = input.length % 4;
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/") + (pad ? "=".repeat(4 - pad) : "");
  return Buffer.from(normalized, "base64");
}

function sign(headerAndPayload: string): string {
  return base64UrlEncode(createHmac("sha256", getSecret()).update(headerAndPayload).digest());
}

export function signJwt(payload: Omit<JwtPayload, "iat" | "exp">, ttlSeconds = 60 * 60 * 8): string {
  const iat = Math.floor(Date.now() / 1000);
  const full: JwtPayload = { ...payload, iat, exp: iat + ttlSeconds };
  const payloadB64 = base64UrlEncode(JSON.stringify(full));
  const headerAndPayload = `${HEADER_B64}.${payloadB64}`;
  const signature = sign(headerAndPayload);
  return `${headerAndPayload}.${signature}`;
}

export function verifyJwt(token: string): JwtPayload {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Formato de token invalido");
  const [headerB64, payloadB64, signatureB64] = parts;
  if (headerB64 !== HEADER_B64) throw new Error("Header de token invalido");

  const expected = sign(`${headerB64}.${payloadB64}`);
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureB64);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Assinatura de token invalida");
  }

  const payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf8")) as JwtPayload;
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) throw new Error("Token expirado");
  return payload;
}
