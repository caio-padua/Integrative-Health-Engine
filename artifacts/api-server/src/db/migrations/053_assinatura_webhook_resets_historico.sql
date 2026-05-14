-- PAWARDS MEDCORE · Wave 10.5 · task #196
-- Histórico completo de resets manuais por evento de webhook.
--
-- Hoje, `assinatura_webhook_eventos` (migration 039) só guarda o ÚLTIMO
-- reset (`ultimo_reset_em`, `ultimo_reset_por`, `ultimo_reset_motivo`)
-- mais um contador acumulado (`resets_manuais_count`). Pra investigação
-- linha-a-linha o Caio precisa abrir tooltip e só vê o último.
--
-- Esta tabela mantém UM REGISTRO POR RESET — append-only — pra que a
-- tela /assinaturas/uploads-falhos consiga abrir um painel lateral
-- com timeline completa (todos os resets, não só o último).
--
-- Aditivo (REGRA FERRO): só CRIA tabela + indices. As colunas antigas
-- de "ultimo reset" continuam funcionando (mantidas como cache do
-- último registro pra ordenação rápida + tooltip de hover).

CREATE TABLE IF NOT EXISTS assinatura_webhook_resets (
  id              bigserial PRIMARY KEY,
  evento_id       bigint NOT NULL
                  REFERENCES assinatura_webhook_eventos(id) ON DELETE CASCADE,
  resetado_em     timestamptz NOT NULL DEFAULT NOW(),
  -- Operador identificado por e-mail/nome (mesmo formato gravado em
  -- `assinatura_webhook_eventos.ultimo_reset_por`). Se a sessão não
  -- tiver e-mail nem nome, gravamos "(desconhecido)".
  operador        text NOT NULL,
  -- Snapshot do id de usuario quando disponivel (req.user.id), pra
  -- auditoria forense caso o e-mail mude depois.
  operador_id    bigint,
  motivo          text,
  -- Snapshot do `tentativas_retry` ANTES do reset, pra auditar quanto
  -- progresso o worker tinha feito quando o operador interveio.
  tentativas_antes integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS assinatura_webhook_resets_evento_idx
  ON assinatura_webhook_resets (evento_id, resetado_em DESC);

CREATE INDEX IF NOT EXISTS assinatura_webhook_resets_operador_idx
  ON assinatura_webhook_resets (operador);

COMMENT ON TABLE assinatura_webhook_resets IS
  'Histórico append-only de resets manuais de upload de PDF assinado (task #196). Cada chamada a POST /assinaturas/uploads-falhos/:eventoId/resetar grava 1 linha. As colunas ultimo_reset_* em assinatura_webhook_eventos viram cache do último registro pra ordenação rápida.';
