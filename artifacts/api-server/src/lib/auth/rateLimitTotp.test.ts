import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  estaBloqueadoTotp,
  registrarTentativaErradaTotp,
  resetTentativasTotp,
  _resetTodasTentativasTotp,
  TOTP_TENTATIVAS_MAX,
} from "./rateLimitTotp";

describe("rateLimitTotp (Task #131)", () => {
  beforeEach(() => {
    _resetTodasTentativasTotp();
  });

  it("nao bloqueia usuario sem tentativas", () => {
    assert.equal(estaBloqueadoTotp(42), false);
  });

  it("bloqueia apos atingir TOTP_TENTATIVAS_MAX tentativas erradas", () => {
    for (let i = 0; i < TOTP_TENTATIVAS_MAX - 1; i++) {
      registrarTentativaErradaTotp(7);
      assert.equal(estaBloqueadoTotp(7), false);
    }
    registrarTentativaErradaTotp(7);
    assert.equal(estaBloqueadoTotp(7), true);
  });

  it("isola contagem por usuarioId", () => {
    for (let i = 0; i < TOTP_TENTATIVAS_MAX; i++) {
      registrarTentativaErradaTotp(1);
    }
    assert.equal(estaBloqueadoTotp(1), true);
    assert.equal(estaBloqueadoTotp(2), false);
  });

  it("resetTentativasTotp libera o usuario imediatamente", () => {
    for (let i = 0; i < TOTP_TENTATIVAS_MAX; i++) {
      registrarTentativaErradaTotp(99);
    }
    assert.equal(estaBloqueadoTotp(99), true);
    resetTentativasTotp(99);
    assert.equal(estaBloqueadoTotp(99), false);
  });
});
