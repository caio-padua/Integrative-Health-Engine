-- ============================================================================
-- Migration 050 · Task #12 — Permitir configurar janelas de envio padrao
-- (manha/tarde/noite) e tolerancia em minutos por UNIDADE.
--
-- Origem: .local/tasks/task-12.md.
--
-- Hoje os horarios de envio do lembrete sao definidos por prescricao (campo
-- horarios_envio em prescricoes_lembrete) e a tolerancia e fixa em 5 minutos
-- no codigo do worker. A tarefa pede que cada UNIDADE possua horarios padrao
-- (ex.: 07:00, 13:00, 20:00) e tolerancia configuravel, herdados pela
-- prescricao quando ela nao definir os proprios.
--
-- Estrategia (REGRA FERRO Caio: psql aditivo IF NOT EXISTS, ZERO db:push):
--   1) Adiciona lembrete_horarios_padrao (jsonb) com default
--      ["07:00","13:00","20:00"] — janela classica manha/tarde/noite.
--   2) Adiciona lembrete_tolerancia_minutos (integer) com default 5,
--      preservando o comportamento legado do worker (tolerancia fixa = 5).
--
-- REGRA NAMING Caio: nomes semanticos completos, sem abreviacao
-- (lembrete_horarios_padrao, NUNCA lembr_hor_pad).
--
-- Invariantes Wave 9 INTOCADOS (8.728 receitas + R$ 2.736.536,10).
-- Invariantes Wave 13 F1 INTOCADOS (perfil_plataforma, totp_*, killswitch).
-- ============================================================================

ALTER TABLE unidades
  ADD COLUMN IF NOT EXISTS lembrete_horarios_padrao jsonb NOT NULL
    DEFAULT '["07:00", "13:00", "20:00"]'::jsonb;

ALTER TABLE unidades
  ADD COLUMN IF NOT EXISTS lembrete_tolerancia_minutos integer NOT NULL
    DEFAULT 5;

COMMENT ON COLUMN unidades.lembrete_horarios_padrao IS
  'Task #12 - janelas padrao de envio de lembretes de prescricao por unidade (array jsonb de strings HH:MM, ex: ["07:00","13:00","20:00"]). Usadas pelo worker prescricaoLembreteService como fallback quando prescricoes_lembrete.horarios_envio esta vazio.';

COMMENT ON COLUMN unidades.lembrete_tolerancia_minutos IS
  'Task #12 - tolerancia em minutos para o disparo do lembrete APOS o horario alvo. Preserva ticks perdidos sem adiantar o envio. Default 5 (mesmo valor antes hardcoded no worker).';
