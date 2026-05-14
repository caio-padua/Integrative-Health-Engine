-- PAWARDS MEDCORE · task #205
-- Registro de mensagens INBOUND do WhatsApp pra calcular a janela de 24h.
--
-- Hoje só processamos eventos de STATUS (delivered/read/failed) no webhook
-- /webhooks/whatsapp/status. Não temos tracking de mensagens RECEBIDAS,
-- então o painel não consegue afirmar com certeza se um aviso enviado
-- como texto livre (fora de template HSM) foi de fato bloqueado pelo
-- provedor — fica sempre conservador, mostrando alerta amarelo mesmo
-- quando o destinatário acabou de falar com a clínica.
--
-- Esta migração cria a tabela `whatsapp_inbound`, append-only, indexada
-- por (telefone_origem, recebido_em DESC) pra a helper `janela24hAberta`
-- conseguir responder em milissegundos se houve inbound nas últimas 24h.
--
-- Aditivo (REGRA FERRO): só CRIA tabela + indices. Nada existente é
-- alterado.

CREATE TABLE IF NOT EXISTS whatsapp_inbound (
  id              serial PRIMARY KEY,
  config_id       integer REFERENCES whatsapp_config(id),
  unidade_id      integer REFERENCES unidades(id),
  provedor        text NOT NULL CHECK (provedor IN ('TWILIO','GUPSHUP')),
  provedor_msg_id text,
  -- Telefone normalizado (só dígitos, com prefixo 55 quando BR), pra
  -- casar com `whatsapp_mensagens_log.telefone_destino`.
  telefone_origem text NOT NULL,
  tipo_mensagem   text,
  conteudo        text,
  payload_bruto   jsonb,
  recebido_em     timestamptz NOT NULL DEFAULT NOW()
);

-- Índice principal pra `janela24hAberta(telefone)` — busca o inbound mais
-- recente de um telefone em O(log n).
CREATE INDEX IF NOT EXISTS whatsapp_inbound_telefone_recebido_idx
  ON whatsapp_inbound (telefone_origem, recebido_em DESC);

-- Índice por unidade pra relatórios futuros do painel do CEO
-- (quantos inbounds por clínica nas últimas 24h, etc.).
CREATE INDEX IF NOT EXISTS whatsapp_inbound_unidade_idx
  ON whatsapp_inbound (unidade_id, recebido_em DESC);
