-- ============================================================================
-- Migration 060 · Task #250 — Estende assinatura_notificacoes_status_check
-- ============================================================================
--
-- Migration 059 (Task #250) introduziu dois novos status no worker pra
-- suportar agrupamento de recusas em digest matinal:
--   - 'AGRUPADO_DIGEST'  : nao-terminal, parqueada esperando o digest worker
--   - 'ENVIADO_AGRUPADO' : terminal, fonte ja consolidada num digest
--
-- O CHECK constraint atual (criado em 037 / herdado da tabela original)
-- nao conhece esses valores e barraria os UPDATEs do worker. Esta
-- migration recria o CHECK com TODOS os status validos historicos +
-- novos (PROCESSANDO da Task #36 / 037 incluso pra defensiva, mesmo em
-- DBs onde 037 nao tenha rodado).
--
-- REGRA FERRO Caio: psql aditivo, idempotente. DROP CONSTRAINT IF EXISTS
-- + ADD CONSTRAINT NAO eh DROP de tabela/coluna — soh recria CHECK.
-- ============================================================================

ALTER TABLE assinatura_notificacoes
  DROP CONSTRAINT IF EXISTS assinatura_notificacoes_status_check;

ALTER TABLE assinatura_notificacoes
  ADD CONSTRAINT assinatura_notificacoes_status_check
  CHECK (status = ANY (ARRAY[
    'PENDENTE'::text,
    'PROCESSANDO'::text,       -- Task #36 / Migration 037
    'ENVIADO'::text,
    'FALHA'::text,
    'PULADO_QUIET'::text,
    'PULADO_OPTOUT'::text,
    'AGRUPADO_DIGEST'::text,   -- Task #250 — recusa parqueada pro digest matinal
    'ENVIADO_AGRUPADO'::text   -- Task #250 — fonte consolidada num digest (terminal)
  ]));

COMMENT ON CONSTRAINT assinatura_notificacoes_status_check
  ON assinatura_notificacoes IS
  'Status validos da fila de notificacoes. AGRUPADO_DIGEST + ENVIADO_AGRUPADO '
  'foram adicionados pela Task #250 (digest matinal de recusas). '
  'AGRUPADO_DIGEST eh ignorado pelo tick principal (so o worker '
  'digestRecusasCEO reivindica). ENVIADO_AGRUPADO eh terminal — a fonte ja '
  'foi consolidada num digest cujo id vai em resposta_provedor.agrupado_em_digest_id.';
