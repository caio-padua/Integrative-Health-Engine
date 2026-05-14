-- ============================================================================
-- Migration 053 · Task #194 — Escalonamento WhatsApp quando o retry de email
-- estoura o cap sem sucesso (alertas_ceo_seguranca)
-- ============================================================================
--
-- O worker `alertaBruteForceRetryEnvio` (Task #167) re-tenta o envio do alerta
-- de brute-force ate RETRY_TENTATIVAS_MAX (default 3). Quando estoura o cap E
-- `notif_email_falhas` continua > 0, hoje o alerta vira "perdido em definitivo"
-- pelo canal email — provavelmente credencial Gmail expirada ou destinatario
-- invalido. Nao ha escalonamento automatico: o CEO so descobre se entrar na
-- fila por conta propria.
--
-- Esta migration adiciona a coluna `escalonado_whatsapp_em` que permite ao
-- worker escalar UMA UNICA VEZ pro canal WhatsApp (CEO_WHATSAPP env var ou
-- telefone do platform_owner) quando:
--   - notif_retry_tentativas atinge o cap
--   - notif_email_falhas > 0 (todos os envios de email falharam)
--   - notif_wpp_enviados == 0 (canal whatsapp original tambem nao saiu)
--   - escalonado_whatsapp_em IS NULL (ainda nao escalou)
--
-- Idempotencia: a coluna marca o timestamp do escalonamento — se for != NULL,
-- o worker NUNCA escala de novo, mesmo que rode de novo no mesmo alerta.
--
-- REGRA FERRO Caio: psql aditivo IF NOT EXISTS, ZERO db:push, sem drop.
-- REGRA NAMING Caio: nomes completos, sem abreviacao.
-- ============================================================================

ALTER TABLE alertas_ceo_seguranca
  ADD COLUMN IF NOT EXISTS escalonado_whatsapp_em timestamptz;

COMMENT ON COLUMN alertas_ceo_seguranca.escalonado_whatsapp_em IS
  'Task #194 - Timestamp do escalonamento UNICO pra WhatsApp do CEO quando '
  'o retry de email do worker alertaBruteForceRetryEnvio (Task #167) estoura '
  'o cap (RETRY_TENTATIVAS_MAX) e notif_email_falhas continua > 0 sem nenhum '
  'envio de WhatsApp original (notif_wpp_enviados = 0). NULL = nunca escalou. '
  'Quando != NULL, o worker NAO escala de novo (idempotencia).';
