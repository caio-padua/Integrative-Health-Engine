-- ============================================================================
-- Migration 060 · Task #258 — adiciona colunas de auditoria do canal WhatsApp
--                              na tabela de envios de aviso de vencimento da
--                              carencia LGPD (Task #135).
-- ============================================================================
--
-- Origem: docs/dr-claude task #258 ("Avisar por WhatsApp tambem quando a
-- carencia LGPD da clinica esta vencendo"). A Task #135 manda email diario
-- pras 4 janelas criticas (7d/3d/1d/vencido_sem_export), mas o
-- platform_owner pode estar longe do email. Reaproveitando o padrao das
-- Tasks #146 (avisoExpiracao2faOwner) e #194 (alertaBruteForceRetryEnvio),
-- o worker passa a disparar tambem WhatsApp best-effort pro telefone do
-- platform_owner / validador_mestre (ou fallback CEO_WHATSAPP env).
--
-- Estas colunas servem APENAS pra auditabilidade: registram quantos
-- destinatarios WhatsApp foram resolvidos, quantos envios saíram com
-- sucesso, e qual erro resumido (se algum) — analogo as colunas existentes
-- de email (destinatarios, total_destinatarios, enviados, falhas, erro).
-- A flag `canal_whatsapp_ok` resume o resultado em booleano:
--   true  -> pelo menos 1 destinatario resolveu E pelo menos 1 envio OK
--   false -> sem destinatarios OU todos os envios falharam
-- Falha do canal WhatsApp NAO bloqueia idempotencia do email (UNIQUE
-- (unidade_id, tipo_aviso, dia_brt) continua valendo independente do
-- resultado WhatsApp).
--
-- REGRA FERRO Caio: psql aditivo IF NOT EXISTS, ZERO db:push.
-- Invariantes Wave 9 INTOCADOS (8.728 receitas + R$ 2.736.536,10).
-- ============================================================================

ALTER TABLE notif_carencia_lgpd_clinica_envios
  ADD COLUMN IF NOT EXISTS whatsapp_destinatarios text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE notif_carencia_lgpd_clinica_envios
  ADD COLUMN IF NOT EXISTS whatsapp_total_destinatarios integer NOT NULL DEFAULT 0;

ALTER TABLE notif_carencia_lgpd_clinica_envios
  ADD COLUMN IF NOT EXISTS whatsapp_enviados integer NOT NULL DEFAULT 0;

ALTER TABLE notif_carencia_lgpd_clinica_envios
  ADD COLUMN IF NOT EXISTS whatsapp_falhas integer NOT NULL DEFAULT 0;

ALTER TABLE notif_carencia_lgpd_clinica_envios
  ADD COLUMN IF NOT EXISTS whatsapp_erro text;

ALTER TABLE notif_carencia_lgpd_clinica_envios
  ADD COLUMN IF NOT EXISTS canal_whatsapp_ok boolean NOT NULL DEFAULT false;
