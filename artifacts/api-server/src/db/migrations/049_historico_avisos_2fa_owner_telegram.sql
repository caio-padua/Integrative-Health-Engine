-- ============================================================================
-- Migration 049 · Task #172 — Adicionar Telegram como terceiro canal de aviso
-- de expiracao do 2FA do platform_owner.
--
-- Origem: .local/tasks/task-172.md.
-- Hoje a tabela historico_avisos_2fa_owner (Migration 048, Task #158) registra
-- so canal_email_ok e canal_whatsapp_ok. Esta migration adiciona o flag
-- analogo canal_telegram_ok pra rastrear se o disparo via Telegram Bot API
-- teve sucesso. A coluna canais_aviso_2fa em usuarios (Migration 048, text[])
-- ja aceita string arbitraria — a validacao do valor "telegram" e feita na
-- camada de rota (PATCH /usuarios/me/canais-aviso-2fa) e no worker
-- avisoExpiracao2faOwner. Por isso nenhuma alteracao de schema em usuarios
-- e necessaria aqui.
--
-- REGRA FERRO Caio: psql aditivo IF NOT EXISTS, ZERO db:push.
-- REGRA NAMING Caio: nome semantico completo (canal_telegram_ok), sem
-- abreviacao. Default false pra preservar comportamento legado.
--
-- Invariantes Wave 9 INTOCADOS (8.728 receitas + R$ 2.736.536,10).
-- Invariantes Wave 13 F1 INTOCADOS (perfil_plataforma, totp_*, 2fa cols).
-- ============================================================================

ALTER TABLE historico_avisos_2fa_owner
  ADD COLUMN IF NOT EXISTS canal_telegram_ok boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN historico_avisos_2fa_owner.canal_telegram_ok IS
  'Task #172 - true se o disparo via Telegram Bot API teve sucesso para esta janela. Default false (mesmo padrao de canal_email_ok e canal_whatsapp_ok). Telegram e o terceiro canal opcional ao lado de email e WhatsApp; o worker so tenta enviar se canais_aviso_2fa contiver "telegram" E as env vars TELEGRAM_BOT_TOKEN + CEO_TELEGRAM_CHAT_ID estiverem setadas.';
