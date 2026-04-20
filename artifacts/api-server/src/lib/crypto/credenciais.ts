import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LEN = 12;
const SALT_LEN = 16;
const TAG_LEN = 16;

function getKey(salt: Buffer): Buffer {
  const secret = process.env["SESSION_SECRET"] ?? process.env["ADMIN_TOKEN"] ?? "";
  if (!secret) throw new Error("SESSION_SECRET/ADMIN_TOKEN nao configurado para cifragem de credenciais");
  return scryptSync(secret, salt, 32);
}

export function cifrarCredencial(plaintext: string): string {
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = getKey(salt);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, tag, enc]).toString("base64");
}

export function decifrarCredencial(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const salt = buf.subarray(0, SALT_LEN);
  const iv = buf.subarray(SALT_LEN, SALT_LEN + IV_LEN);
  const tag = buf.subarray(SALT_LEN + IV_LEN, SALT_LEN + IV_LEN + TAG_LEN);
  const enc = buf.subarray(SALT_LEN + IV_LEN + TAG_LEN);
  const key = getKey(salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export function mascararCredencial(plaintext: string): string {
  if (!plaintext) return "";
  if (plaintext.length <= 8) return "•".repeat(plaintext.length);
  return plaintext.slice(0, 4) + "•".repeat(Math.max(8, plaintext.length - 8)) + plaintext.slice(-4);
}
