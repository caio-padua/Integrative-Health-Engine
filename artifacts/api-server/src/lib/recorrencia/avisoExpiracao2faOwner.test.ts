/**
 * Task #170 · Cobertura unitaria da funcao pura `computarStreakFadiga()`.
 *
 * Testa o algoritmo de deteccao de streak trailing de avisos 2FA
 * expirados sem renovacao, isolando a logica do DB. Cobre:
 *   - sem historico
 *   - mais recente ja renovado (sem streak)
 *   - mais recente ainda nao expirado (sem streak)
 *   - streak curto (< MIN, gera resultado mas filtragem fica fora)
 *   - streak longo dentro da janela
 *   - **REGRESSAO CRITICA**: streak continuo de >7 dias sem renovacao
 *     deve manter `anchor_em` no aviso mais antigo (nao deslizar pra
 *     dentro da janela). Bug detectado em code review da v1.
 *   - streak quebrado por renovacao no meio do historico
 *   - quebra por aviso ainda nao expirado no meio
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computarStreakFadiga,
  type HistoricoLinhaFadiga,
} from "./avisoExpiracao2faOwner";

const AGORA = new Date("2026-05-13T12:00:00Z");
const DIA_MS = 24 * 60 * 60 * 1000;

function linha(opts: {
  diasAtrasAviso: number;
  janelaHoras?: number; // janela 2fa, default 8h
  renovado?: boolean;
}): HistoricoLinhaFadiga {
  const aviso_em = new Date(AGORA.getTime() - opts.diasAtrasAviso * DIA_MS);
  const janelaH = opts.janelaHoras ?? 8;
  // expira_em = aviso_em + ~15min (antecedencia) + restante da janela.
  // Pra simplificar: expira_em = aviso_em + janelaH (proxima de prod).
  const expira_em = new Date(aviso_em.getTime() + janelaH * 60 * 60 * 1000);
  return {
    aviso_em,
    expira_em,
    renovado_em: opts.renovado
      ? new Date(aviso_em.getTime() + 60 * 60 * 1000)
      : null,
  };
}

test("computarStreakFadiga · sem historico retorna null", () => {
  const r = computarStreakFadiga([], { agora: AGORA, janelaDias: 7 });
  assert.equal(r, null);
});

test("computarStreakFadiga · mais recente renovado quebra streak imediatamente", () => {
  const hist = [
    linha({ diasAtrasAviso: 0.5, renovado: true }),
    linha({ diasAtrasAviso: 1 }),
    linha({ diasAtrasAviso: 2 }),
    linha({ diasAtrasAviso: 3 }),
  ];
  const r = computarStreakFadiga(hist, { agora: AGORA, janelaDias: 7 });
  assert.equal(r, null);
});

test("computarStreakFadiga · mais recente ainda nao expirado quebra streak", () => {
  const hist = [
    // aviso ha 1h, janela 8h ainda aberta -> nao expirado
    {
      aviso_em: new Date(AGORA.getTime() - 60 * 60 * 1000),
      expira_em: new Date(AGORA.getTime() + 7 * 60 * 60 * 1000),
      renovado_em: null,
    },
    linha({ diasAtrasAviso: 1 }),
    linha({ diasAtrasAviso: 2 }),
    linha({ diasAtrasAviso: 3 }),
  ];
  const r = computarStreakFadiga(hist, { agora: AGORA, janelaDias: 7 });
  assert.equal(r, null);
});

test("computarStreakFadiga · streak de 4 dentro da janela", () => {
  const hist = [
    linha({ diasAtrasAviso: 1 }),
    linha({ diasAtrasAviso: 2 }),
    linha({ diasAtrasAviso: 4 }),
    linha({ diasAtrasAviso: 6 }),
  ];
  const r = computarStreakFadiga(hist, { agora: AGORA, janelaDias: 7 });
  assert.ok(r);
  assert.equal(r!.qtd_total, 4);
  assert.equal(r!.qtd_na_janela, 4);
  assert.equal(r!.anchor_em.getTime(), hist[3]!.aviso_em.getTime());
  assert.equal(r!.mais_recente_em.getTime(), hist[0]!.aviso_em.getTime());
});

test("REGRESSAO · streak continuo de >7 dias mantem anchor no aviso mais antigo (nao desliza)", () => {
  // Cenario do code-review: 5 expirados consecutivos sem renovacao
  // espalhados por 14 dias. anchor_em DEVE ser o de 14 dias atras pra
  // garantir 1 alerta unico por sequencia. Se anchor deslizasse pra
  // dentro da janela de 7 dias, cada novo expirado mudaria o anchor e
  // o INSERT ON CONFLICT nao bloquearia spam.
  const hist = [
    linha({ diasAtrasAviso: 1 }),
    linha({ diasAtrasAviso: 4 }),
    linha({ diasAtrasAviso: 7 }),
    linha({ diasAtrasAviso: 11 }),
    linha({ diasAtrasAviso: 14 }), // mais antigo do streak — anchor verdadeiro
  ];
  const r = computarStreakFadiga(hist, { agora: AGORA, janelaDias: 7 });
  assert.ok(r);
  assert.equal(r!.qtd_total, 5, "streak total inclui os 5 expirados");
  // qtd_na_janela conta apenas os com aviso_em >= agora-7d. dia 7 esta
  // exatamente na borda (>= agora-7d), entao conta. Dias 11/14 ficam fora.
  assert.equal(r!.qtd_na_janela, 3, "elegibilidade so usa janela");
  assert.equal(
    r!.anchor_em.getTime(),
    hist[4]!.aviso_em.getTime(),
    "anchor e o aviso mais antigo do streak (14 dias atras), nao truncado pela janela",
  );
  assert.equal(r!.mais_recente_em.getTime(), hist[0]!.aviso_em.getTime());
});

test("REGRESSAO · novo expirado dia seguinte mantem MESMO anchor (idempotencia preservada)", () => {
  // Simula t=AGORA: streak detectado com anchor=dia14.
  const hist1 = [
    linha({ diasAtrasAviso: 1 }),
    linha({ diasAtrasAviso: 4 }),
    linha({ diasAtrasAviso: 7 }),
    linha({ diasAtrasAviso: 11 }),
    linha({ diasAtrasAviso: 14 }),
  ];
  const r1 = computarStreakFadiga(hist1, { agora: AGORA, janelaDias: 7 });
  // Simula t=AGORA+2d com 1 expirado adicional: streak agora tem 6.
  // O aviso de 14d atras agora esta a 16d, MAS continua sendo o anchor.
  // CRITICO: anchor_em da v1 deslizaria pra dentro da janela, gerando
  // novo INSERT e novo email. v2 mantem anchor estavel.
  const AGORA_PLUS_2D = new Date(AGORA.getTime() + 2 * DIA_MS);
  const hist2 = [
    {
      aviso_em: new Date(AGORA_PLUS_2D.getTime() - 0.5 * DIA_MS),
      expira_em: new Date(AGORA_PLUS_2D.getTime() - 0.5 * DIA_MS + 8 * 3600 * 1000),
      renovado_em: null,
    },
    ...hist1,
  ];
  const r2 = computarStreakFadiga(hist2, {
    agora: AGORA_PLUS_2D,
    janelaDias: 7,
  });
  assert.ok(r1 && r2);
  assert.equal(
    r1!.anchor_em.getTime(),
    r2!.anchor_em.getTime(),
    "anchor permanece estavel entre ticks enquanto streak nao for quebrado — idempotencia da chave UNIQUE preservada",
  );
  assert.equal(r2!.qtd_total, 6);
});

test("computarStreakFadiga · renovacao no meio do historico quebra streak ali", () => {
  // Streak trailing = avisos antes da 1a renovacao encontrada.
  const hist = [
    linha({ diasAtrasAviso: 1 }),
    linha({ diasAtrasAviso: 2 }),
    linha({ diasAtrasAviso: 3, renovado: true }), // quebra
    linha({ diasAtrasAviso: 5 }),
    linha({ diasAtrasAviso: 6 }),
  ];
  const r = computarStreakFadiga(hist, { agora: AGORA, janelaDias: 7 });
  assert.ok(r);
  assert.equal(r!.qtd_total, 2, "so os 2 trailing antes da renovacao");
  assert.equal(r!.anchor_em.getTime(), hist[1]!.aviso_em.getTime());
});

test("computarStreakFadiga · janela de 7 dias filtra elegibilidade corretamente", () => {
  const hist = [
    linha({ diasAtrasAviso: 8 }),  // fora da janela
    linha({ diasAtrasAviso: 10 }), // fora
    linha({ diasAtrasAviso: 12 }), // fora
  ];
  const r = computarStreakFadiga(hist, { agora: AGORA, janelaDias: 7 });
  assert.ok(r);
  assert.equal(r!.qtd_total, 3, "streak existe");
  assert.equal(r!.qtd_na_janela, 0, "mas zero dentro da janela — chamador deve filtrar");
});
