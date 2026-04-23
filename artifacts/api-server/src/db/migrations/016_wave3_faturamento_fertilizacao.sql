-- ════════════════════════════════════════════════════════════════════
-- FATURAMENTO-TSUNAMI · Wave 3 · Fertilização do leito existente
-- 23/abr/2026 · Caio · ZERO drop, 100% aditivo (REGRA FERRO).
-- Aplicado via psql IF NOT EXISTS — idempotente. NUNCA db:push.
-- ════════════════════════════════════════════════════════════════════

-- A · cobrancas_adicionais: rastreio de envio de email branded MEDCORE
ALTER TABLE cobrancas_adicionais
  ADD COLUMN IF NOT EXISTS enviado_em       timestamp with time zone,
  ADD COLUMN IF NOT EXISTS erro_envio       text,
  ADD COLUMN IF NOT EXISTS tentativas_envio integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paciente_id      integer;

-- B · pagamentos: campos de reconciliação webhook (4 gateways)
ALTER TABLE pagamentos
  ADD COLUMN IF NOT EXISTS external_ref       text,
  ADD COLUMN IF NOT EXISTS gateway_name       text,
  ADD COLUMN IF NOT EXISTS gateway_payment_id text;

CREATE INDEX IF NOT EXISTS ix_pagamentos_external_ref
  ON pagamentos(external_ref);
CREATE INDEX IF NOT EXISTS ix_pagamentos_gateway_payment_id
  ON pagamentos(gateway_name, gateway_payment_id);

-- C · pagamento_webhook_eventos: auditoria idempotente de webhooks
CREATE TABLE IF NOT EXISTS pagamento_webhook_eventos (
  id                 serial PRIMARY KEY,
  gateway            text NOT NULL,
  gateway_payment_id text,
  external_ref       text,
  event_type         text NOT NULL,
  status_aplicado    text,
  payload_json       jsonb NOT NULL,
  recebido_em        timestamp with time zone NOT NULL DEFAULT now(),
  processado_em      timestamp with time zone,
  erro               text
);
CREATE INDEX IF NOT EXISTS ix_pwe_gateway_pid
  ON pagamento_webhook_eventos(gateway, gateway_payment_id);
CREATE INDEX IF NOT EXISTS ix_pwe_recebido
  ON pagamento_webhook_eventos(recebido_em DESC);
