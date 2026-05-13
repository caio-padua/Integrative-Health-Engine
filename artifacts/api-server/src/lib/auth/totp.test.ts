import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

before(() => {
  process.env["SESSION_SECRET"] =
    process.env["SESSION_SECRET"] ?? "test-secret-dev-only-totp-32bytes-min!";
});

describe("totp · enrollment + verify roundtrip", () => {
  it("gera secret base32 + otpauth url e codigo recente valida", async () => {
    const { gerarNovoSegredoTotp, encryptTotpSecret, verificarCodigoTotp } = await import("./totp");
    const { Secret, TOTP } = await import("otpauth");
    const enroll = gerarNovoSegredoTotp("teste@pawards.com.br");
    assert.match(enroll.secretBase32, /^[A-Z2-7]+=*$/);
    assert.match(enroll.otpauthUrl, /^otpauth:\/\/totp\//);
    const cifrado = encryptTotpSecret(enroll.secretBase32);
    const totp = new TOTP({
      issuer: "PAWARDS",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(enroll.secretBase32),
    });
    const codigoNow = totp.generate();
    assert.equal(verificarCodigoTotp(cifrado, codigoNow), true);
  });

  it("rejeita codigo com formato errado (nao 6 digitos)", async () => {
    const { gerarNovoSegredoTotp, encryptTotpSecret, verificarCodigoTotp } = await import("./totp");
    const enroll = gerarNovoSegredoTotp("a@b.c");
    const cifrado = encryptTotpSecret(enroll.secretBase32);
    assert.equal(verificarCodigoTotp(cifrado, "12345"), false);
    assert.equal(verificarCodigoTotp(cifrado, "1234567"), false);
    assert.equal(verificarCodigoTotp(cifrado, "abcdef"), false);
    assert.equal(verificarCodigoTotp(cifrado, ""), false);
  });

  it("rejeita codigo errado", async () => {
    const { gerarNovoSegredoTotp, encryptTotpSecret, verificarCodigoTotp } = await import("./totp");
    const enroll = gerarNovoSegredoTotp("a@b.c");
    const cifrado = encryptTotpSecret(enroll.secretBase32);
    assert.equal(verificarCodigoTotp(cifrado, "000000"), false);
  });

  it("encrypt/decrypt e idempotente em roundtrip", async () => {
    const { encryptTotpSecret, decryptTotpSecret } = await import("./totp");
    const original = "JBSWY3DPEHPK3PXP";
    const cifrado1 = encryptTotpSecret(original);
    const cifrado2 = encryptTotpSecret(original);
    assert.notEqual(cifrado1, cifrado2, "IV aleatorio garante ciphertexts diferentes");
    assert.equal(decryptTotpSecret(cifrado1), original);
    assert.equal(decryptTotpSecret(cifrado2), original);
  });
});
