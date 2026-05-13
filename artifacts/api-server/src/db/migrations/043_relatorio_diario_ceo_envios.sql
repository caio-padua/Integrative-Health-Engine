-- Migration 043 — Wave Blindagem CEO PDF diário
-- Aplicada em 2026-05-13 (psql aditivo, REGRA FERRO: zero db:push)
--
-- Tabela `relatorio_diario_ceo_envios`:
--   Auditoria + idempotência diária do PDF resumo CEO enviado por email
--   pro Caio. Worker `relatorioDiarioCEO` (lib/recorrencia/) tick interno
--   1h consulta + dispara 1x/dia se ainda não enviou hoje.
--
-- Idempotência: UNIQUE (dia_brt, destinatario_email)

CREATE TABLE IF NOT EXISTS relatorio_diario_ceo_envios (
  id                    serial PRIMARY KEY,
  dia_brt               date NOT NULL,
  destinatario_email    text NOT NULL,
  enviado_em            timestamptz NOT NULL DEFAULT now(),
  status                text NOT NULL DEFAULT 'ENVIADO',
  gmail_message_id      text,
  pdf_bytes             integer,
  payload_kpis          jsonb DEFAULT '{}'::jsonb,
  erro                  text,
  origem                text NOT NULL DEFAULT 'WORKER'
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_relatorio_diario_ceo_dia_email
  ON relatorio_diario_ceo_envios (dia_brt, destinatario_email);

CREATE INDEX IF NOT EXISTS idx_relatorio_diario_ceo_dia
  ON relatorio_diario_ceo_envios (dia_brt DESC);
