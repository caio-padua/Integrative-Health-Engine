/**
 * Task #267 · Cobertura unitaria da funcao pura
 * `detectarDestinatariosQuebrados()` do worker `avisoDestinatarioQuebrado`.
 * Cenarios sem DB / sem rede que exercem a regra de streak:
 *   - sucesso=true RESETA streak
 *   - sucesso=false acumula
 *   - dispara apenas quando streak >= minimoFalhas
 *   - normaliza email (lowercase) e telefone (so digitos) pra dedup
 *   - nao reage a registros antigos sem detalhes_email[] / detalhes_whatsapp[]
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detectarDestinatariosQuebrados,
  offsetMicrossegundosFingerprint,
} from "./avisoDestinatarioQuebrado";

function evento(over: Partial<Parameters<typeof detectarDestinatariosQuebrados>[0]> = {}) {
  return {
    id: 99,
    unidade_id: 7,
    acao: "SUSPENDER",
    executado_por_usuario_id: 1,
    unidade_nome: "Clinica X",
    metadata: { avisos: [] },
    ...over,
  };
}

test("detectarDestinatariosQuebrados · 3 falhas seguidas pro mesmo email DISPARA", () => {
  const ev = evento({
    metadata: {
      avisos: [
        { canal: "EMAIL", em: "2026-05-01T10:00:00Z", detalhes_email: [{ destinatario: "x@y.com", sucesso: false }] },
        { canal: "EMAIL", em: "2026-05-02T10:00:00Z", detalhes_email: [{ destinatario: "x@y.com", sucesso: false }] },
        { canal: "EMAIL", em: "2026-05-03T10:00:00Z", detalhes_email: [{ destinatario: "x@y.com", sucesso: false }] },
      ],
    },
  });
  const r = detectarDestinatariosQuebrados(ev);
  assert.equal(r.length, 1);
  assert.equal(r[0]?.canal, "EMAIL");
  assert.equal(r[0]?.destinatario, "x@y.com");
  assert.equal(r[0]?.falhasConsecutivas, 3);
  assert.equal(r[0]?.ultimaFalhaEm, "2026-05-03T10:00:00Z");
  assert.equal(r[0]?.unidadeId, 7);
});

test("detectarDestinatariosQuebrados · sucesso=true RESETA o streak", () => {
  const ev = evento({
    metadata: {
      avisos: [
        { em: "2026-05-01T10:00:00Z", detalhes_email: [{ destinatario: "x@y.com", sucesso: false }] },
        { em: "2026-05-02T10:00:00Z", detalhes_email: [{ destinatario: "x@y.com", sucesso: false }] },
        { em: "2026-05-03T10:00:00Z", detalhes_email: [{ destinatario: "x@y.com", sucesso: true }] },
        { em: "2026-05-04T10:00:00Z", detalhes_email: [{ destinatario: "x@y.com", sucesso: false }] },
      ],
    },
  });
  assert.deepEqual(detectarDestinatariosQuebrados(ev), []);
});

test("detectarDestinatariosQuebrados · 2 falhas seguidas NAO dispara (default min=3)", () => {
  const ev = evento({
    metadata: {
      avisos: [
        { em: "2026-05-01T10:00:00Z", detalhes_email: [{ destinatario: "a@b.com", sucesso: false }] },
        { em: "2026-05-02T10:00:00Z", detalhes_email: [{ destinatario: "a@b.com", sucesso: false }] },
      ],
    },
  });
  assert.deepEqual(detectarDestinatariosQuebrados(ev), []);
});

test("detectarDestinatariosQuebrados · email normalizado lowercase pra dedup", () => {
  const ev = evento({
    metadata: {
      avisos: [
        { em: "2026-05-01T10:00:00Z", detalhes_email: [{ destinatario: "X@Y.COM", sucesso: false }] },
        { em: "2026-05-02T10:00:00Z", detalhes_email: [{ destinatario: "x@y.com", sucesso: false }] },
        { em: "2026-05-03T10:00:00Z", detalhes_email: [{ destinatario: "X@y.COM", sucesso: false }] },
      ],
    },
  });
  const r = detectarDestinatariosQuebrados(ev);
  assert.equal(r.length, 1);
  assert.equal(r[0]?.destinatario, "x@y.com");
});

test("detectarDestinatariosQuebrados · telefone normalizado so digitos", () => {
  const ev = evento({
    metadata: {
      avisos: [
        { em: "2026-05-01T10:00:00Z", detalhes_whatsapp: [{ destinatario: "(55) 11 99999-1234", sucesso: false }] },
        { em: "2026-05-02T10:00:00Z", detalhes_whatsapp: [{ destinatario: "+5511999991234", sucesso: false }] },
        { em: "2026-05-03T10:00:00Z", detalhes_whatsapp: [{ destinatario: "5511999991234", sucesso: false }] },
      ],
    },
  });
  const r = detectarDestinatariosQuebrados(ev);
  assert.equal(r.length, 1);
  assert.equal(r[0]?.canal, "WHATSAPP");
  assert.equal(r[0]?.destinatario, "5511999991234");
  assert.equal(r[0]?.falhasConsecutivas, 3);
});

test("detectarDestinatariosQuebrados · destinatarios distintos contam separados", () => {
  const ev = evento({
    metadata: {
      avisos: [
        {
          em: "2026-05-01T10:00:00Z",
          detalhes_email: [
            { destinatario: "a@x.com", sucesso: false },
            { destinatario: "b@x.com", sucesso: true },
          ],
        },
        {
          em: "2026-05-02T10:00:00Z",
          detalhes_email: [
            { destinatario: "a@x.com", sucesso: false },
            { destinatario: "b@x.com", sucesso: false },
          ],
        },
        {
          em: "2026-05-03T10:00:00Z",
          detalhes_email: [
            { destinatario: "a@x.com", sucesso: false },
            { destinatario: "b@x.com", sucesso: false },
          ],
        },
      ],
    },
  });
  const r = detectarDestinatariosQuebrados(ev);
  // Only "a" hits 3 — "b" only has 2 consecutive failures (success on first).
  assert.equal(r.length, 1);
  assert.equal(r[0]?.destinatario, "a@x.com");
});

test("detectarDestinatariosQuebrados · registros antigos sem detalhes_*[] sao ignorados", () => {
  const ev = evento({
    metadata: {
      avisos: [
        // Registros antigos (Task #148/#176) so traziam agregados; nao da
        // pra atribuir falha por destinatario individual.
        { em: "2026-05-01T10:00:00Z" },
        { em: "2026-05-02T10:00:00Z" },
        { em: "2026-05-03T10:00:00Z" },
      ],
    },
  });
  assert.deepEqual(detectarDestinatariosQuebrados(ev), []);
});

test("detectarDestinatariosQuebrados · sem metadata.avisos retorna vazio", () => {
  assert.deepEqual(detectarDestinatariosQuebrados(evento({ metadata: null })), []);
  assert.deepEqual(detectarDestinatariosQuebrados(evento({ metadata: { avisos: [] } })), []);
});

test("detectarDestinatariosQuebrados · DOIS destinatarios falhando no MESMO timestamp ambos retornados (regressao Task #267 code review)", () => {
  // Cobertura explicita do bug que o code review pegou: quando dois
  // destinatarios distintos compartilham o MESMO `em` (timestamp),
  // ambos precisam aparecer no resultado pra que o caller insira UM
  // alerta por destinatario. A persistencia (ON CONFLICT DO NOTHING +
  // partial UNIQUE da migration 067 + offset deterministico) garante
  // que ambos sobrevivam no DB; aqui validamos a etapa anterior.
  const ev = evento({
    metadata: {
      avisos: [
        {
          em: "2026-05-01T10:00:00Z",
          detalhes_email: [
            { destinatario: "a@x.com", sucesso: false },
            { destinatario: "b@x.com", sucesso: false },
          ],
        },
        {
          em: "2026-05-01T10:00:00Z",
          detalhes_email: [
            { destinatario: "a@x.com", sucesso: false },
            { destinatario: "b@x.com", sucesso: false },
          ],
        },
        {
          em: "2026-05-01T10:00:00Z",
          detalhes_email: [
            { destinatario: "a@x.com", sucesso: false },
            { destinatario: "b@x.com", sucesso: false },
          ],
        },
      ],
    },
  });
  const r = detectarDestinatariosQuebrados(ev);
  const dests = r.map((x) => x.destinatario).sort();
  assert.deepEqual(dests, ["a@x.com", "b@x.com"]);
  // Offsets deterministicos diferentes garantem que mesmo na UNIQUE
  // legada (tipo, usuario_id, janela_inicio_em) eles nao colidem.
  const offA = offsetMicrossegundosFingerprint("EMAIL:a@x.com");
  const offB = offsetMicrossegundosFingerprint("EMAIL:b@x.com");
  assert.notEqual(offA, offB);
});

test("offsetMicrossegundosFingerprint · deterministico e dentro do range", () => {
  const o1 = offsetMicrossegundosFingerprint("EMAIL:foo@bar.com");
  const o2 = offsetMicrossegundosFingerprint("EMAIL:foo@bar.com");
  assert.equal(o1, o2);
  assert.ok(o1 >= 0 && o1 < 1_000_000);
  // Canais diferentes → fingerprints diferentes pra mesmo destinatario.
  assert.notEqual(
    offsetMicrossegundosFingerprint("EMAIL:foo@bar.com"),
    offsetMicrossegundosFingerprint("WHATSAPP:foo@bar.com"),
  );
});

test("detectarDestinatariosQuebrados · minimoFalhas customizavel", () => {
  const ev = evento({
    metadata: {
      avisos: [
        { em: "2026-05-01T10:00:00Z", detalhes_email: [{ destinatario: "z@z.com", sucesso: false }] },
        { em: "2026-05-02T10:00:00Z", detalhes_email: [{ destinatario: "z@z.com", sucesso: false }] },
      ],
    },
  });
  // minimo=2 dispara, minimo=3 nao.
  assert.equal(detectarDestinatariosQuebrados(ev, 2).length, 1);
  assert.equal(detectarDestinatariosQuebrados(ev, 3).length, 0);
});
