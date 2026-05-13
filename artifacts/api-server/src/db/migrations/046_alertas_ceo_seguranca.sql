-- ============================================================================
-- Migration 046 · Task #143 — Fila de alertas de seguranca pro CEO
-- ============================================================================
--
-- Quando o helper `estaBloqueadoTotp()` (Task #131) devolve true pela 1a vez
-- na janela deslizante, o servidor enfileira aqui um alerta com tipo
-- '2FA_BRUTE_FORCE' contendo usuario_id, ip e user_agent. O platform_owner
-- recebe email com link pra acao corretiva (forcar logout / desativar conta).
--
-- Idempotencia / no-spam: UNIQUE(tipo, usuario_id, janela_inicio_em) garante
-- 1 alerta por bloqueio, mesmo que outras tentativas erradas continuem
-- chegando dentro da MESMA janela de 5min.
--
-- REGRA FERRO Caio: psql aditivo IF NOT EXISTS, ZERO db:push.
-- REGRA NAMING Caio: nomes completos, sem abreviacao.
-- ============================================================================

CREATE TABLE IF NOT EXISTS alertas_ceo_seguranca (
  id                  bigserial PRIMARY KEY,
  tipo                text NOT NULL,
  usuario_id          integer NOT NULL REFERENCES usuarios(id),
  janela_inicio_em    timestamptz NOT NULL,
  ip                  text,
  user_agent          text,
  contexto            text,
  payload             jsonb NOT NULL DEFAULT '{}'::jsonb,
  notif_email_enviados integer NOT NULL DEFAULT 0,
  notif_email_falhas  integer NOT NULL DEFAULT 0,
  notif_destinatarios jsonb NOT NULL DEFAULT '[]'::jsonb,
  visualizado_em      timestamptz,
  visualizado_por_usuario_id integer REFERENCES usuarios(id),
  criado_em           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE alertas_ceo_seguranca DROP CONSTRAINT IF EXISTS alertas_ceo_seguranca_tipo_check;
ALTER TABLE alertas_ceo_seguranca ADD CONSTRAINT alertas_ceo_seguranca_tipo_check
  CHECK (tipo IN ('2FA_BRUTE_FORCE'));

-- 1 alerta por bloqueio: UNIQUE garante no-spam por janela.
CREATE UNIQUE INDEX IF NOT EXISTS uq_alertas_ceo_seguranca_janela
  ON alertas_ceo_seguranca (tipo, usuario_id, janela_inicio_em);

CREATE INDEX IF NOT EXISTS ix_alertas_ceo_seguranca_criado
  ON alertas_ceo_seguranca (criado_em DESC);

CREATE INDEX IF NOT EXISTS ix_alertas_ceo_seguranca_nao_vistos
  ON alertas_ceo_seguranca (criado_em DESC)
  WHERE visualizado_em IS NULL;

-- ----------------------------------------------------------------------------
-- Task #162 — Canal WhatsApp pro alerta de brute-force 2FA.
-- Adicionado aditivamente: colunas pra contabilizar envios/falhas no canal
-- WhatsApp (Gupshup/Twilio via services/whatsappService.ts), espelhando o
-- modelo das colunas notif_email_*. Defaults 0 garantem compat com linhas
-- existentes (Wave 13). UPDATE acontece sempre que houver pelo menos 1
-- destinatario WhatsApp resolvido (telefone cadastrado em usuarios OU
-- fallback CEO_WHATSAPP); contadores ficam em zero quando nao ha destinatario.
-- ----------------------------------------------------------------------------
ALTER TABLE alertas_ceo_seguranca
  ADD COLUMN IF NOT EXISTS notif_wpp_enviados integer NOT NULL DEFAULT 0;
ALTER TABLE alertas_ceo_seguranca
  ADD COLUMN IF NOT EXISTS notif_wpp_falhas   integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN alertas_ceo_seguranca.notif_wpp_enviados IS
  'Task #162 - Quantidade de mensagens WhatsApp entregues com sucesso pro '
  'platform_owner (CEO_WHATSAPP). 0 quando o canal esta desligado.';
COMMENT ON COLUMN alertas_ceo_seguranca.notif_wpp_falhas IS
  'Task #162 - Quantidade de mensagens WhatsApp que falharam (provedor '
  'rejeitou ou excecao). Falha no WPP NUNCA bloqueia email nem o fluxo '
  'de auth — defensivo total como o resto do helper.';

COMMENT ON TABLE alertas_ceo_seguranca IS
  'Task #143 - Fila de alertas de seguranca pro platform_owner. Alimentada pelo '
  'helper dispararAlertaBruteForceTotp quando estaBloqueadoTotp transita pra true.';
COMMENT ON COLUMN alertas_ceo_seguranca.janela_inicio_em IS
  'Inicio da janela do rate-limit TOTP. Usado no UNIQUE pra garantir 1 alerta '
  'por bloqueio (nao 1 por tentativa errada).';
