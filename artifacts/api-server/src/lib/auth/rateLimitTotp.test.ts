import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  estaBloqueadoTotp,
  registrarTentativaErradaTotp,
  resetTentativasTotp,
  getJanelaInicioTotp,
  _resetTodasTentativasTotp,
  TOTP_TENTATIVAS_MAX,
} from "./rateLimitTotp";

describe("rateLimitTotp (Task #131 + #143)", () => {
  beforeEach(() => {
    _resetTodasTentativasTotp();
  });

  it("nao bloqueia usuario sem tentativas", () => {
    assert.equal(estaBloqueadoTotp(42), false);
    assert.equal(getJanelaInicioTotp(42), null);
  });

  it("bloqueia apos atingir TOTP_TENTATIVAS_MAX tentativas erradas", () => {
    for (let i = 0; i < TOTP_TENTATIVAS_MAX - 1; i++) {
      const r = registrarTentativaErradaTotp(7);
      assert.equal(r.bloqueado, false);
      assert.equal(r.transicaoParaBloqueio, false);
      assert.equal(estaBloqueadoTotp(7), false);
    }
    const r = registrarTentativaErradaTotp(7);
    assert.equal(r.bloqueado, true);
    assert.equal(r.transicaoParaBloqueio, true);
    assert.equal(r.count, TOTP_TENTATIVAS_MAX);
    assert.ok(r.janelaInicioEm instanceof Date);
    assert.equal(estaBloqueadoTotp(7), true);
  });

  it("Task #143 — transicaoParaBloqueio dispara UMA UNICA vez por janela", () => {
    // Atinge o bloqueio.
    let transicoes = 0;
    for (let i = 0; i < TOTP_TENTATIVAS_MAX; i++) {
      const r = registrarTentativaErradaTotp(15);
      if (r.transicaoParaBloqueio) transicoes += 1;
    }
    assert.equal(transicoes, 1);
    // Tentativas erradas adicionais na MESMA janela: bloqueado=true mas
    // transicaoParaBloqueio precisa continuar false (no-spam pro alerta CEO).
    for (let i = 0; i < 3; i++) {
      const r = registrarTentativaErradaTotp(15);
      assert.equal(r.bloqueado, true);
      assert.equal(r.transicaoParaBloqueio, false);
    }
  });

  it("Task #143 — getJanelaInicioTotp devolve a mesma data dentro da janela ativa", () => {
    const r1 = registrarTentativaErradaTotp(21);
    const r2 = registrarTentativaErradaTotp(21);
    const j = getJanelaInicioTotp(21);
    assert.ok(j !== null);
    assert.equal(j!.getTime(), r1.janelaInicioEm.getTime());
    assert.equal(j!.getTime(), r2.janelaInicioEm.getTime());
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
    assert.equal(getJanelaInicioTotp(99), null);
  });
});
