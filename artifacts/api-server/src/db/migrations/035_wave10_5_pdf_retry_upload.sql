-- PAWARDS MEDCORE · Wave 10.5 · task #39
-- Worker de retry pra upload de PDF assinado no bucket.
--
-- Aditivo (REGRA FERRO): apenas adiciona colunas + indice parcial em
-- assinatura_webhook_eventos. Nada destrutivo, idempotente.
--
-- Colunas:
--   tentativas_retry      -- contador 0..5 de re-tentativas do worker
--   ultima_tentativa_em   -- ts da ultima execucao do worker pra este evento
--
-- Indice parcial: acelera o WHERE prefix-match do worker (50/tick max),
-- so contempla linhas com erro de upload — alta seletividade.

ALTER TABLE assinatura_webhook_eventos
  ADD COLUMN IF NOT EXISTS tentativas_retry integer NOT NULL DEFAULT 0;

ALTER TABLE assinatura_webhook_eventos
  ADD COLUMN IF NOT EXISTS ultima_tentativa_em timestamptz;

CREATE INDEX IF NOT EXISTS assin_webhook_retry_idx
  ON assinatura_webhook_eventos (recebido_em)
  WHERE erro_processamento LIKE 'pdf_upload_falhou%';
