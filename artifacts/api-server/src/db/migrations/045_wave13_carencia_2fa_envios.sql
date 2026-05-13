-- ============================================================================
-- Migration 045 · Wave 13 F3 — tracking de emails diarios de carencia LGPD 2FA
-- ============================================================================
--
-- Origem: docs/dr-claude/06_WAVE13_F1_FOUNDATION_RBAC_2FA.md (resposta #3
-- Dr. Claude pos-F1: "email diario pro TENANT_ADMIN durante o countdown,
-- com registro auditavel de cada notificacao enviada").
--
-- Esta tabela serve apenas pra idempotencia diaria (1 envio por dia por
-- usuario) e auditabilidade de quando cada countdown foi enviado.
--
-- REGRA FERRO Caio: psql aditivo IF NOT EXISTS, ZERO db:push.
-- Invariantes Wave 9 INTOCADOS (8.728 receitas + R$ 2.736.536,10).
-- ============================================================================

CREATE TABLE IF NOT EXISTS notif_carencia_2fa_envios (
  id bigserial PRIMARY KEY,
  usuario_id integer NOT NULL REFERENCES usuarios(id),
  dia_brt date NOT NULL,
  dias_restantes integer NOT NULL,
  email_destinatario text NOT NULL,
  status text NOT NULL DEFAULT 'OK',
  erro text,
  enviado_em timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notif_carencia_2fa_dia
  ON notif_carencia_2fa_envios (usuario_id, dia_brt);

CREATE INDEX IF NOT EXISTS ix_notif_carencia_2fa_status
  ON notif_carencia_2fa_envios (status, enviado_em DESC);

ALTER TABLE notif_carencia_2fa_envios DROP CONSTRAINT IF EXISTS notif_carencia_2fa_envios_status_check;
ALTER TABLE notif_carencia_2fa_envios ADD CONSTRAINT notif_carencia_2fa_envios_status_check
  CHECK (status IN ('OK', 'ERRO'));
