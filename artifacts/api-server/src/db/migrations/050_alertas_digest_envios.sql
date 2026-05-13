-- ============================================================================
-- Migration 050 · Task #26 — Digest diario de alertas pro Caio + gestores
-- ============================================================================
--
-- O endpoint GET /painel-pawards/alertas ja calcula clinicas abaixo do
-- faturamento minimo, KPIs fora da faixa e anastomoses pendentes — mas o
-- Caio so descobre se entrar no dashboard. Esta tabela registra o envio
-- diario do email digest pra garantir idempotencia (1 email por dia por
-- destinatario) e auditoria (quem recebeu o que).
--
-- Worker: lib/recorrencia/alertasDigestDiario.ts (tick 1h, dispara
-- 1x/dia apos HORA_MINIMA_BRT).
-- Service: services/alertasDigestService.ts (calcula payload + envia).
--
-- Idempotencia: UNIQUE (dia_brt, destinatario_email).
--
-- REGRA FERRO Caio: psql aditivo IF NOT EXISTS, ZERO db:push, sem drop.
-- ============================================================================

CREATE TABLE IF NOT EXISTS alertas_digest_envios (
  id                    serial PRIMARY KEY,
  dia_brt               date NOT NULL,
  destinatario_email    text NOT NULL,
  enviado_em            timestamptz NOT NULL DEFAULT now(),
  status                text NOT NULL DEFAULT 'ENVIADO',
  gmail_message_id      text,
  total_alertas         integer NOT NULL DEFAULT 0,
  clinicas_abaixo_min   integer NOT NULL DEFAULT 0,
  kpis_fora_faixa       integer NOT NULL DEFAULT 0,
  pendencias            integer NOT NULL DEFAULT 0,
  payload_resumo        jsonb DEFAULT '{}'::jsonb,
  erro                  text,
  origem                text NOT NULL DEFAULT 'WORKER'
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_alertas_digest_envios_dia_email
  ON alertas_digest_envios (dia_brt, destinatario_email);

CREATE INDEX IF NOT EXISTS ix_alertas_digest_envios_dia
  ON alertas_digest_envios (dia_brt DESC);

COMMENT ON TABLE alertas_digest_envios IS
  'Task #26 - Auditoria + idempotencia do digest diario de alertas pro CEO. '
  'Worker alertasDigestDiario consulta os mesmos criterios do endpoint '
  'GET /painel-pawards/alertas e dispara 1 email por dia por destinatario.';
