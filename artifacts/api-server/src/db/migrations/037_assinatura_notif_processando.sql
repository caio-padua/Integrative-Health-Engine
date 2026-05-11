-- 037 — Task #36 · Status `PROCESSANDO` + timestamp `processando_em`.
--
-- Permite o worker `lib/recorrencia/notifAssinatura.ts` reivindicar linhas
-- atomicamente via UPDATE ... RETURNING antes de processar. Sem isso, dois
-- ticks concorrentes (timer + fire-and-forget do webhook) poderiam ler a
-- mesma linha PENDENTE e enviar duplicado pro CEO.
--
-- Recovery de orfas usa `processando_em` (NAO `criado_em`) — assim retries
-- legitimos antigos nao caem incorretamente no recovery, so linhas que
-- crasharam entre o claim e o UPDATE final.
--
-- Aditivo + idempotente (REGRA FERRO mantida — sem db:push, sem DROP de
-- tabela ou coluna).

ALTER TABLE assinatura_notificacoes
  DROP CONSTRAINT IF EXISTS assinatura_notificacoes_status_check;

ALTER TABLE assinatura_notificacoes
  ADD CONSTRAINT assinatura_notificacoes_status_check
  CHECK (status = ANY (ARRAY[
    'PENDENTE'::text,
    'PROCESSANDO'::text,
    'ENVIADO'::text,
    'FALHA'::text,
    'PULADO_QUIET'::text,
    'PULADO_OPTOUT'::text
  ]));

ALTER TABLE assinatura_notificacoes
  ADD COLUMN IF NOT EXISTS processando_em TIMESTAMPTZ;
