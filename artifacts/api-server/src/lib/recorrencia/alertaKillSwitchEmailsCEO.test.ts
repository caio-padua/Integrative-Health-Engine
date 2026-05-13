/**
 * Task #141 · Cobertura unitaria da funcao `decidir()` do worker
 * alertaKillSwitchEmailsCEO. Sao cenarios puros (sem DB, sem rede), so
 * exercitando a logica de threshold OR + gatilhos especiais
 * (erro!=null, destinatarios=0).
 *
 * Defaults dos envs: ABS_MIN=1, PCT_MIN=50.
 * Esses testes nao sobreescrevem os envs — exercem o comportamento
 * default que e o que vai pra producao.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { decidir, type CandidatoAlerta } from "./alertaKillSwitchEmailsCEO";

function fixture(over: Partial<CandidatoAlerta> = {}): CandidatoAlerta {
  return {
    evento_id: 1,
    tentativa_idx: 1,
    unidade_id: 7,
    unidade_nome: "Unidade Teste",
    acao: "SUSPENDER",
    evento_criado_em: "2026-05-13T19:00:00Z",
    tipo_aviso: "SUSPENSAO",
    destinatarios_arr: [],
    destinatarios_count: 0,
    enviados: 0,
    falhas: 0,
    erro: null,
    aviso_em: "2026-05-13T19:00:00Z",
    ...over,
  };
}

test("decidir · erro nao-vazio sempre dispara (ERRO_NO_ENVIO)", () => {
  const d = decidir(fixture({ erro: "Gmail token expirado", destinatarios_count: 5, falhas: 0 }));
  assert.equal(d.dispara, true);
  assert.equal(d.motivo, "ERRO_NO_ENVIO");
  assert.equal(d.pctFalha, null);
});

test("decidir · destinatarios=0 sempre dispara (SEM_DESTINATARIO)", () => {
  const d = decidir(fixture({ destinatarios_count: 0 }));
  assert.equal(d.dispara, true);
  assert.equal(d.motivo, "SEM_DESTINATARIO");
});

test("decidir · 1 falha em 10 destinatarios (10% pct, 1 abs) DEVE disparar (gatilho ABS, OR logic)", () => {
  // Este eh o cenario que motivou o fix do code-review: com AND, 10% nao
  // batia o limiar de 50% e 1 falha passava silenciosa. Com OR, ABS_MIN=1
  // ja garante o disparo.
  const d = decidir(fixture({ destinatarios_count: 10, enviados: 9, falhas: 1 }));
  assert.equal(d.dispara, true);
  assert.equal(d.motivo, "FALHA_ACIMA_DO_THRESHOLD");
  assert.equal(d.pctFalha, 10);
});

test("decidir · 6 falhas em 10 destinatarios (60% pct) dispara via gatilho PCT", () => {
  const d = decidir(fixture({ destinatarios_count: 10, enviados: 4, falhas: 6 }));
  assert.equal(d.dispara, true);
  assert.equal(d.motivo, "FALHA_ACIMA_DO_THRESHOLD");
  assert.equal(d.pctFalha, 60);
});

test("decidir · zero falhas e dest>0 NAO dispara", () => {
  const d = decidir(fixture({ destinatarios_count: 5, enviados: 5, falhas: 0 }));
  assert.equal(d.dispara, false);
  assert.equal(d.motivo, "OK");
  assert.equal(d.pctFalha, 0);
});

test("decidir · erro como string em branco NAO conta como erro real", () => {
  // Defesa contra avisos persistidos com erro="" ou "  " (alguns paths
  // antigos faziam isso). So texto significativo conta.
  const d = decidir(fixture({ erro: "   ", destinatarios_count: 3, enviados: 3, falhas: 0 }));
  assert.equal(d.dispara, false);
  assert.equal(d.motivo, "OK");
});
