-- ============================================================================
-- Migration 052 · Task #160 — Contador diario de bloqueios 2FA expirados
-- ============================================================================
--
-- Origem: Task #160 ("Mostrar pro CEO quantos bloqueios de 2FA expiraram por
-- dia"). A rotina de limpeza criada na Task #151
-- (`limpezaTotpRateLimit.ts`) ja registra `removidas` por tick no log do
-- servidor, mas isso fica enterrado nos logs e o CEO nao tem visibilidade
-- de tendencia. Pico de tentativas erradas pode indicar:
--   - ataque de forca-bruta no 2FA (sinal de seguranca)
--   - usuarios com muita dificuldade no 2FA (sinal de UX/treinamento)
--
-- Esta tabela agrega por dia BRT o total de linhas expiradas removidas
-- (somando todos os ticks daquele dia). UPSERT por (dia_brt). Permite
-- comparacao com media historica pra destacar anomalias.
--
-- REGRA FERRO Caio: psql aditivo IF NOT EXISTS, ZERO db:push.
-- Invariantes Wave 9 INTOCADOS (8.728 receitas + R$ 2.736.536,10).
-- ============================================================================

CREATE TABLE IF NOT EXISTS totp_rate_limit_limpezas_diarias (
  dia_brt           date PRIMARY KEY,
  total_removidas   integer     NOT NULL DEFAULT 0,
  ticks_executados  integer     NOT NULL DEFAULT 0,
  primeira_em       timestamptz NOT NULL DEFAULT now(),
  ultima_em         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_totp_rate_limit_limpezas_diarias_dia
  ON totp_rate_limit_limpezas_diarias (dia_brt DESC);

COMMENT ON TABLE totp_rate_limit_limpezas_diarias IS
  'Task #160 — agregado diario (BRT) de bloqueios 2FA expirados removidos '
  'pelo worker `limpezaTotpRateLimit` (Task #151). UPSERT por dia_brt: cada '
  'tick soma `removidas` em `total_removidas` e incrementa `ticks_executados`. '
  'Da visibilidade pro CEO de tendencia de tentativas erradas (forca-bruta '
  'vs dificuldade de UX no 2FA).';

COMMENT ON COLUMN totp_rate_limit_limpezas_diarias.dia_brt IS
  'Dia BRT (America/Sao_Paulo) em que o tick rodou. PK pra UPSERT idempotente.';
COMMENT ON COLUMN totp_rate_limit_limpezas_diarias.total_removidas IS
  'Soma das linhas expiradas removidas em todos os ticks daquele dia BRT.';
COMMENT ON COLUMN totp_rate_limit_limpezas_diarias.ticks_executados IS
  'Quantidade de ticks do worker que efetivamente registraram metrica '
  'naquele dia (inclui ticks com zero remocoes).';
