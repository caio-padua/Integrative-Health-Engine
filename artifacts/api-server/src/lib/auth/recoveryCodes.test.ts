import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CODIGOS_RECUPERACAO_TOTAL,
  contarCodigosRestantes,
  gerarCodigosRecuperacao,
  normalizarCodigoRecuperacao,
  pareceCodigoRecuperacao,
  tentarConsumirCodigoRecuperacao,
} from "./recoveryCodes";

describe("recoveryCodes · Task #123", () => {
  it("gera N codigos formato XXXX-XXXX e armazenaveis bcrypt", async () => {
    const r = await gerarCodigosRecuperacao();
    assert.equal(r.planos.length, CODIGOS_RECUPERACAO_TOTAL);
    assert.equal(r.armazenaveis.length, CODIGOS_RECUPERACAO_TOTAL);
    for (const p of r.planos) {
      assert.match(p, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      // sem 0/O/1/I/L
      assert.ok(!/[01OIL]/.test(p));
    }
    for (const a of r.armazenaveis) {
      assert.match(a.hash, /^\$2[aby]\$/);
      assert.equal(a.usadoEm, null);
    }
    // todos diferentes
    assert.equal(new Set(r.planos).size, r.planos.length);
  });

  it("normaliza aceita lowercase, espacos e hifens", () => {
    assert.equal(normalizarCodigoRecuperacao("abcd-2345"), "ABCD2345");
    assert.equal(normalizarCodigoRecuperacao(" ABCD 2345 "), "ABCD2345");
    assert.equal(normalizarCodigoRecuperacao("ABCD2345"), "ABCD2345");
  });

  it("pareceCodigoRecuperacao distingue de TOTP 6 digitos", () => {
    assert.equal(pareceCodigoRecuperacao("123456"), false);
    assert.equal(pareceCodigoRecuperacao("ABCD-2345"), true);
    assert.equal(pareceCodigoRecuperacao("abcd2345"), true);
    assert.equal(pareceCodigoRecuperacao("1234567"), false); // so digitos
  });

  it("consome codigo valido e marca usadoEm", async () => {
    const r = await gerarCodigosRecuperacao(3);
    const primeiro = r.planos[0]!;
    const out = await tentarConsumirCodigoRecuperacao(r.armazenaveis, primeiro);
    assert.equal(out.consumido, true);
    assert.equal(contarCodigosRestantes(out.atualizados), 2);
    // o item consumido tem usadoEm setado
    const usados = out.atualizados.filter((c) => c.usadoEm).length;
    assert.equal(usados, 1);
  });

  it("rejeita codigo errado e nao marca nada", async () => {
    const r = await gerarCodigosRecuperacao(3);
    const out = await tentarConsumirCodigoRecuperacao(r.armazenaveis, "ZZZZ-ZZZZ");
    assert.equal(out.consumido, false);
    assert.equal(contarCodigosRestantes(out.atualizados), 3);
  });

  it("nao reusa codigo ja consumido", async () => {
    const r = await gerarCodigosRecuperacao(3);
    const primeiro = r.planos[0]!;
    const out1 = await tentarConsumirCodigoRecuperacao(r.armazenaveis, primeiro);
    assert.equal(out1.consumido, true);
    const out2 = await tentarConsumirCodigoRecuperacao(out1.atualizados, primeiro);
    assert.equal(out2.consumido, false);
    assert.equal(contarCodigosRestantes(out2.atualizados), 2);
  });

  it("aceita codigo formatado com hifen, espacos ou lowercase", async () => {
    const r = await gerarCodigosRecuperacao(2);
    const primeiro = r.planos[0]!;
    // primeiro vem como "XXXX-YYYY" — testa variantes
    const semHifen = primeiro.replace("-", "");
    const lower = primeiro.toLowerCase();
    const comEspaco = primeiro.replace("-", " ");
    const a = await tentarConsumirCodigoRecuperacao(r.armazenaveis, semHifen);
    assert.equal(a.consumido, true);
    const b = await tentarConsumirCodigoRecuperacao(r.armazenaveis, lower);
    assert.equal(b.consumido, true);
    const c = await tentarConsumirCodigoRecuperacao(r.armazenaveis, comEspaco);
    assert.equal(c.consumido, true);
  });

  it("contarCodigosRestantes lida com null/undefined/array vazio", () => {
    assert.equal(contarCodigosRestantes(null), 0);
    assert.equal(contarCodigosRestantes(undefined), 0);
    assert.equal(contarCodigosRestantes([]), 0);
  });
});
