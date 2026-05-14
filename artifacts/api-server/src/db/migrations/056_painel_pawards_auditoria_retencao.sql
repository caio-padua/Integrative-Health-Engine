-- Migration 056 — Retencao da trilha do Painel PAWARDS (Task #232)
--
-- Contexto:
--   `painel_pawards_auditoria` (migration 007) recebe um INSERT a cada GET
--   no Painel PAWARDS — em escala isso vira centenas/milhares de linhas
--   por dia. Sem politica de retencao a tabela cresce indefinidamente,
--   degradando a paginacao e violando recomendacao da LGPD (manter trilha
--   de acesso so pelo prazo necessario).
--
-- O que esta migration faz (IDEMPOTENTE):
--   1. Cria `painel_pawards_auditoria_limpezas` — log de cada execucao
--      do worker (quando rodou, quantas linhas removeu, corte aplicado).
--      Permite ao CEO/auditor enxergar "quem apagou o que e quando".
--
-- Retencao em si:
--   O corte (default 12 meses) e aplicado pelo worker
--   `lib/recorrencia/limpezaAuditoriaPainelPawards.ts`, configuravel via
--   env `PAINEL_PAWARDS_AUDITORIA_RETENCAO_MESES`. Sem schema novo na
--   tabela auditada — a coluna `acessado_em` ja existe e ja tem indice
--   `idx_painel_pawards_auditoria_acessado_em DESC` (migration 007).

CREATE TABLE IF NOT EXISTS painel_pawards_auditoria_limpezas (
  id              serial PRIMARY KEY,
  executado_em    timestamptz NOT NULL DEFAULT now(),
  corte_em        timestamptz NOT NULL,
  meses_retencao  integer     NOT NULL,
  removidas       integer     NOT NULL,
  pulado_por_lock boolean     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_painel_pawards_auditoria_limpezas_executado_em
  ON painel_pawards_auditoria_limpezas(executado_em DESC);
