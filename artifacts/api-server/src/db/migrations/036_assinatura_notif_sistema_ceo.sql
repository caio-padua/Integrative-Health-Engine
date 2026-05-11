-- 034 — Task #36 · Marcador `is_sistema_ceo` em assinatura_notificacoes.
--
-- Quando true, identifica notificacao operacional pro CEO (validador_mestre)
-- — nao eh paciente-facing, entao o worker `lib/recorrencia/notifAssinatura.ts`
-- DEVE bypassar:
--   1. opt-out do paciente (paciente_opt_out_email/whatsapp em pacientes)
--   2. quiet hours globais (notif_config)
-- pra garantir alerta tempo real do webhook ZapSign (doc_signed/doc_refused).
--
-- Aditivo + idempotente (REGRA FERRO mantida — zero db:push, zero DROP, default
-- false preserva semantica antiga das 100% das linhas pre-existentes).

ALTER TABLE assinatura_notificacoes
  ADD COLUMN IF NOT EXISTS is_sistema_ceo BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN assinatura_notificacoes.is_sistema_ceo IS
  'Task #36 — quando true, marca alerta sistema pro CEO/validador_mestre. Worker notifAssinatura bypassa opt-out de paciente E quiet hours pra estes (alerta operacional, nao paciente-facing).';

CREATE INDEX IF NOT EXISTS assin_notif_sistema_ceo_ix
  ON assinatura_notificacoes(is_sistema_ceo)
  WHERE is_sistema_ceo = true;
