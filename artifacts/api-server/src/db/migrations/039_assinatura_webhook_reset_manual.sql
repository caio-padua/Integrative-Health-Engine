-- PAWARDS MEDCORE · Wave 10.5 · task #57
-- Permitir resetar manualmente o retry de upload de PDF assinado depois que
-- o Caio (validador_mestre) corrigir a causa raiz (bucket cheio, credencial,
-- rede). Hoje, quando `tentativas_retry` chega a 5, o evento fica preso
-- pra sempre — sem este reset o PDF nunca sobe ao bucket e o risco juridico
-- (LGPD/CFM 20 anos) continua aberto.
--
-- Aditivo (REGRA FERRO): apenas adiciona 4 colunas em
-- `assinatura_webhook_eventos`. Nada destrutivo, idempotente.
--
-- Colunas:
--   resets_manuais_count   -- contador acumulado de resets manuais
--   ultimo_reset_em        -- ts do ultimo reset manual
--   ultimo_reset_por       -- email/identidade do operador (validador_mestre)
--   ultimo_reset_motivo    -- texto livre opcional pra rastreabilidade

ALTER TABLE assinatura_webhook_eventos
  ADD COLUMN IF NOT EXISTS resets_manuais_count integer NOT NULL DEFAULT 0;

ALTER TABLE assinatura_webhook_eventos
  ADD COLUMN IF NOT EXISTS ultimo_reset_em timestamptz;

ALTER TABLE assinatura_webhook_eventos
  ADD COLUMN IF NOT EXISTS ultimo_reset_por text;

ALTER TABLE assinatura_webhook_eventos
  ADD COLUMN IF NOT EXISTS ultimo_reset_motivo text;
