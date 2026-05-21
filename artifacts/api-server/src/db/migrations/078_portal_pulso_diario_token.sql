-- 078_portal_pulso_diario_token.sql
-- Wave Dashboard Local + Pulso Diário (21/mai/2026)
-- Spec: docs/dr-claude/18_SPEC_DASHBOARD_CLIENTE_E_PULSO_DIARIO.md (P002 Fase 1)
--
-- Adiciona token curto + TTL na tabela pacientes pra habilitar o portal
-- web responsivo do Pulso Diário (paciente entra sem JWT, só com link).
-- Médico gera o token via botão "Gerar link Pulso Diário" no Dashboard
-- Local. Token é nanoid(12) e TTL default 30 dias por unidade.
--
-- Coluna `pulso_diario_token_expira_em` permite revogar/expirar sem
-- DELETE — basta setar pra timestamp no passado. Mantém histórico de
-- quem teve token quando (auditabilidade LGPD).
--
-- Aditiva, sem DROP, sem RENAME, idempotente.

ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS pulso_diario_token TEXT UNIQUE;

ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS pulso_diario_token_expira_em TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_pacientes_pulso_token
  ON pacientes (pulso_diario_token)
  WHERE pulso_diario_token IS NOT NULL;

COMMENT ON COLUMN pacientes.pulso_diario_token IS
  'Token curto (nanoid 12 chars) para acesso ao portal web responsivo do Pulso Diário sem JWT. Revogável via UPDATE.';

COMMENT ON COLUMN pacientes.pulso_diario_token_expira_em IS
  'TTL do token. Quando NULL ou no passado, token inválido. Default 30 dias após geração.';
