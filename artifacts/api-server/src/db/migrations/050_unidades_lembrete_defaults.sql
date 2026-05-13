-- Migration 050 · Task #11 — Janelas padrao de envio de lembretes de
-- prescricao por unidade.
--
-- Contexto: a Task #10 entregou o motor de disparo (servico
-- prescricaoLembreteService + worker), com tolerancia fixa de 5 min e
-- horarios definidos exclusivamente em cada prescricao. A clinica precisa:
--   1) Cadastrar horarios padrao por unidade (manha/tarde/noite) que sejam
--      herdados quando a prescricao nao tiver `horariosEnvio` proprio.
--   2) Tornar a tolerancia configuravel por unidade (default 5 min, igual
--      ao comportamento atual).
--
-- Aditivo + idempotente (REGRA FERRO mantida — sem db:push, sem DROP de
-- tabela ou de coluna existente, defaults preservam linhas pre-existentes).
ALTER TABLE unidades
  ADD COLUMN IF NOT EXISTS lembrete_horarios_padrao jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE unidades
  ADD COLUMN IF NOT EXISTS lembrete_tolerancia_minutos integer NOT NULL DEFAULT 5;
