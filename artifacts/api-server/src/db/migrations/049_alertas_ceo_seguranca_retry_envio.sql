-- ============================================================================
-- Migration 049 · Task #167 — Retry de envio dos alertas de seguranca pro CEO
-- ============================================================================
--
-- Hoje, quando o Gmail falha em entregar o alerta de brute-force 2FA, o helper
-- `dispararAlertaBruteForceTotp` (Task #143) grava `notif_email_falhas` em
-- `alertas_ceo_seguranca` e segue silencioso. O platform_owner so descobre que
-- perdeu o aviso se entrar na tela de seguranca por conta propria (Task #152).
--
-- Esta migration adiciona as colunas que o worker periodico
-- `alertaBruteForceRetryEnvio` precisa pra re-tentar envio sem entrar em loop:
--   - notif_ultimo_retry_em : quando o worker rodou retry pela ultima vez
--                             (cap de backoff entre tentativas)
--   - notif_retry_tentativas: contador de retries ja feitos (cap de N maximo)
--
-- O worker filtra `notif_email_falhas > 0 AND visualizado_em IS NULL` (alvo
-- da task) e respeita backoff + cap pra nunca spammar.
--
-- REGRA FERRO Caio: psql aditivo IF NOT EXISTS, ZERO db:push, sem drop.
-- REGRA NAMING Caio: nomes completos, sem abreviacao.
-- ============================================================================

ALTER TABLE alertas_ceo_seguranca
  ADD COLUMN IF NOT EXISTS notif_ultimo_retry_em timestamptz;

ALTER TABLE alertas_ceo_seguranca
  ADD COLUMN IF NOT EXISTS notif_retry_tentativas integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN alertas_ceo_seguranca.notif_ultimo_retry_em IS
  'Task #167 - Timestamp da ultima rodada do worker '
  'alertaBruteForceRetryEnvio nesta linha. NULL = nunca re-tentou. '
  'Usado pelo worker pra aplicar backoff entre tentativas (nao reentrar '
  'antes de RETRY_BACKOFF_MIN minutos).';

COMMENT ON COLUMN alertas_ceo_seguranca.notif_retry_tentativas IS
  'Task #167 - Quantas vezes o worker ja re-tentou enviar este alerta. '
  'Cap em RETRY_TENTATIVAS_MAX (default 3) pra nao retentar em loop quando '
  'a falha e permanente (credencial Gmail expirada, destinatario invalido).';

-- Indice parcial pro worker varrer rapido somente as linhas elegiveis pra
-- retry: falha de email registrada E o CEO ainda nao viu o alerta. Sem o
-- partial, o scan ficaria O(N) sobre toda a tabela mesmo quando a fila
-- esta vazia (caso comum em producao).
CREATE INDEX IF NOT EXISTS ix_alertas_ceo_seguranca_retry_pendente
  ON alertas_ceo_seguranca (notif_ultimo_retry_em NULLS FIRST, criado_em)
  WHERE notif_email_falhas > 0 AND visualizado_em IS NULL;
