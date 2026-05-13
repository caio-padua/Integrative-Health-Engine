import { describe, it, beforeEach, before } from "node:test";
import assert from "node:assert/strict";
import {
  estaBloqueadoTotp,
  registrarTentativaErradaTotp,
  resetTentativasTotp,
  getJanelaInicioTotp,
  _resetTodasTentativasTotp,
  _setTotpRateLimitStoreParaTestes,
  criarStoreInMemoryTotp,
  TOTP_TENTATIVAS_MAX,
} from "./rateLimitTotp";

describe("rateLimitTotp (Task #131 + #143 + #144 store persistido)", () => {
  before(() => {
    // Task #144 — em testes usamos o store in-memory pra nao depender do
    // Postgres. Em producao o default e o pgStore (tabela
    // totp_rate_limit_tentativas, migration 046).
    _setTotpRateLimitStoreParaTestes(criarStoreInMemoryTotp());
  });

  beforeEach(async () => {
    await _resetTodasTentativasTotp();
  });

  it("nao bloqueia usuario sem tentativas", async () => {
    assert.equal(await estaBloqueadoTotp(42), false);
    assert.equal(await getJanelaInicioTotp(42), null);
  });

  it("bloqueia apos atingir TOTP_TENTATIVAS_MAX tentativas erradas", async () => {
    for (let i = 0; i < TOTP_TENTATIVAS_MAX - 1; i++) {
      const r = await registrarTentativaErradaTotp(7);
      assert.equal(r.bloqueado, false);
      assert.equal(r.transicaoParaBloqueio, false);
      assert.equal(await estaBloqueadoTotp(7), false);
    }
    const r = await registrarTentativaErradaTotp(7);
    assert.equal(r.bloqueado, true);
    assert.equal(r.transicaoParaBloqueio, true);
    assert.equal(r.count, TOTP_TENTATIVAS_MAX);
    assert.ok(r.janelaInicioEm instanceof Date);
    assert.equal(await estaBloqueadoTotp(7), true);
  });

  it("Task #143 — transicaoParaBloqueio dispara UMA UNICA vez por janela", async () => {
    // Atinge o bloqueio.
    let transicoes = 0;
    for (let i = 0; i < TOTP_TENTATIVAS_MAX; i++) {
      const r = await registrarTentativaErradaTotp(15);
      if (r.transicaoParaBloqueio) transicoes += 1;
    }
    assert.equal(transicoes, 1);
    // Tentativas erradas adicionais na MESMA janela: bloqueado=true mas
    // transicaoParaBloqueio precisa continuar false (no-spam pro alerta CEO).
    for (let i = 0; i < 3; i++) {
      const r = await registrarTentativaErradaTotp(15);
      assert.equal(r.bloqueado, true);
      assert.equal(r.transicaoParaBloqueio, false);
    }
  });

  it("Task #143 — getJanelaInicioTotp devolve a mesma data dentro da janela ativa", async () => {
    const r1 = await registrarTentativaErradaTotp(21);
    const r2 = await registrarTentativaErradaTotp(21);
    const j = await getJanelaInicioTotp(21);
    assert.ok(j !== null);
    assert.equal(j!.getTime(), r1.janelaInicioEm.getTime());
    assert.equal(j!.getTime(), r2.janelaInicioEm.getTime());
  });

  it("isola contagem por usuarioId", async () => {
    for (let i = 0; i < TOTP_TENTATIVAS_MAX; i++) {
      await registrarTentativaErradaTotp(1);
    }
    assert.equal(await estaBloqueadoTotp(1), true);
    assert.equal(await estaBloqueadoTotp(2), false);
  });

  it("resetTentativasTotp libera o usuario imediatamente", async () => {
    for (let i = 0; i < TOTP_TENTATIVAS_MAX; i++) {
      await registrarTentativaErradaTotp(99);
    }
    assert.equal(await estaBloqueadoTotp(99), true);
    await resetTentativasTotp(99);
    assert.equal(await estaBloqueadoTotp(99), false);
    assert.equal(await getJanelaInicioTotp(99), null);
  });
});
