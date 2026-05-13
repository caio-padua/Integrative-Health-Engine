/**
 * Wave 13 F3 — TOTP (RFC 6238) helpers para 2FA do platform_owner / tenant_admin.
 *
 * - Geração de secret base32 + URL otpauth:// (compativel com Google
 *   Authenticator, Authy, 1Password, Bitwarden, etc.)
 * - Encripta o secret em repouso com AES-256-GCM derivado de SESSION_SECRET
 *   (mesmo padrao usado em credentialEncryption.ts, mas com salt proprio
 *   pra dominio "totp" — assim nao colide com outras chaves derivadas).
 * - Verifica codigo 6 digitos com janela ±1 step (≈30s pra cada lado) pra
 *   tolerar drift de relogio do celular.
 *
 * Plug pos-Wave 13 F3: armazena `usuarios.totp_secret_cifrado` (text) e
 * marca `totp_ativado_em` quando o usuario confirma o codigo no enrollment.
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { Secret, TOTP } from "otpauth";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits — recomendado p/ GCM
const TOTP_ISSUER = "PAWARDS";
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30; // segundos
const TOTP_ALGORITHM = "SHA1"; // padrao Google Authenticator

function getEncryptionKey(): Buffer {
  const secret = process.env["SESSION_SECRET"] ?? process.env["JWT_SECRET"];
  if (!secret) {
    throw new Error("SESSION_SECRET (ou JWT_SECRET) e obrigatorio pra cifrar segredos TOTP.");
  }
  return scryptSync(secret, "pawards-totp-salt-v1", 32);
}

export function encryptTotpSecret(plaintextBase32: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintextBase32, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptTotpSecret(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Formato de segredo TOTP cifrado invalido.");
  }
  const key = getEncryptionKey();
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = Buffer.from(parts[2], "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

export interface NovoEnrollmentTotp {
  secretBase32: string;
  otpauthUrl: string;
}

export function gerarNovoSegredoTotp(label: string): NovoEnrollmentTotp {
  const secret = new Secret({ size: 20 }); // 160 bits — RFC 4226 recomenda
  const totp = new TOTP({
    issuer: TOTP_ISSUER,
    label,
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret,
  });
  return {
    secretBase32: secret.base32,
    otpauthUrl: totp.toString(),
  };
}

/**
 * Verifica codigo TOTP de 6 digitos contra um secret cifrado.
 * Janela: ±1 step (tolera +/- 30s de drift). Retorna true se valido.
 */
export function verificarCodigoTotp(
  segredoCifrado: string,
  codigo: string,
  opts: { janela?: number } = {},
): boolean {
  const codigoLimpo = (codigo ?? "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(codigoLimpo)) return false;
  let secretBase32: string;
  try {
    secretBase32 = decryptTotpSecret(segredoCifrado);
  } catch {
    return false;
  }
  const totp = new TOTP({
    issuer: TOTP_ISSUER,
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret: Secret.fromBase32(secretBase32),
  });
  const delta = totp.validate({ token: codigoLimpo, window: opts.janela ?? 1 });
  return delta !== null;
}
