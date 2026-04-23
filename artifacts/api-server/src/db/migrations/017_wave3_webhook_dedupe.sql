-- ════════════════════════════════════════════════════════════════════
-- FATURAMENTO-TSUNAMI Wave 3 · Dedupe idempotente do webhook
-- ════════════════════════════════════════════════════════════════════
-- Tech debt levantado pelo architect na review do commit 71b29fb:
--   "Idempotência sub-ótima: race no MAX(id) de processado_em + sem
--    chave única → reentrega do mesmo evento gera linhas duplicadas
--    em pagamento_webhook_eventos."
--
-- Caio = ZERO erro. Fertilizamos AGORA.
--
-- Estratégia: dois índices únicos PARCIAIS (porque eventos podem
-- chegar identificados por gateway_payment_id OU external_ref, nunca
-- ambos garantidos). Combinados com INSERT ... ON CONFLICT DO UPDATE
-- ... RETURNING id no handler, garantem:
--   • Reentrega do mesmo evento → atualiza payload+recebido_em da
--     mesma linha, NÃO cria duplicata.
--   • Update de processado_em usa o id retornado direto (zero MAX,
--     zero race sob concorrência).
--
-- REGRA FERRO Caio: aditivo, IF NOT EXISTS, sem TRUNCATE, sem DROP.
-- ════════════════════════════════════════════════════════════════════

CREATE UNIQUE INDEX IF NOT EXISTS uniq_pwe_gateway_pid_event
  ON pagamento_webhook_eventos (gateway, gateway_payment_id, event_type)
  WHERE gateway_payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_pwe_gateway_extref_event
  ON pagamento_webhook_eventos (gateway, external_ref, event_type)
  WHERE gateway_payment_id IS NULL AND external_ref IS NOT NULL;
