-- PAWARDS MEDCORE · task #248
-- Permitir reentregar manualmente o webhook ZapSign direto do painel
-- /assinaturas/uploads-falhos quando o evento fica preso no grupo
-- `aguardando_webhook` (sentinel `pdf_upload_falhou_sem_manifesto:`).
--
-- Hoje, quando o alerta CEO da task #67 dispara (24h sem webhook), o Caio
-- precisa abrir o painel ZapSign manualmente e pedir reentrega na unha. O
-- painel PAWARDS so mostra o problema. Esta migration adiciona o cache do
-- ultimo pedido de reentrega no proprio evento — fonte de verdade do
-- "ja pedi reentrega" pra UI esconder/desabilitar o botao e pra auditoria.
--
-- Aditivo (REGRA FERRO): apenas adiciona 3 colunas em
-- `assinatura_webhook_eventos`. Nada destrutivo, idempotente.

ALTER TABLE assinatura_webhook_eventos
  ADD COLUMN IF NOT EXISTS ultima_reentrega_solicitada_em timestamptz;

ALTER TABLE assinatura_webhook_eventos
  ADD COLUMN IF NOT EXISTS ultima_reentrega_solicitada_por text;

ALTER TABLE assinatura_webhook_eventos
  ADD COLUMN IF NOT EXISTS ultima_reentrega_resultado text;

COMMENT ON COLUMN assinatura_webhook_eventos.ultima_reentrega_solicitada_em IS
  'Task #248 — timestamp da ultima vez que o operador apertou "pedir reentrega ao ZapSign" pelo painel /assinaturas/uploads-falhos. Cache pra UI esconder o botao logo apos o pedido (evita spam contra a API ZapSign) e pra trilha de auditoria do alerta CEO aguardando_webhook.';
COMMENT ON COLUMN assinatura_webhook_eventos.ultima_reentrega_solicitada_por IS
  'Task #248 — email/identidade do operador (validador_mestre) que pediu a reentrega. Pareia com ultima_reentrega_solicitada_em.';
COMMENT ON COLUMN assinatura_webhook_eventos.ultima_reentrega_resultado IS
  'Task #248 — texto curto (ok / mock / erro: ...) descrevendo o resultado da chamada a API do provedor (ZapSign POST /api/v1/docs/{token}/resend-webhooks/). Auditavel + diagnostico rapido sem precisar de log.';
