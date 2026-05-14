-- ============================================================================
-- Migration 061 · Task #258 — preferencia de canais (email/WhatsApp) por
--                              owner pro aviso de vencimento da carencia LGPD
--                              (Task #135 + extensao WhatsApp da Task #258).
-- ============================================================================
--
-- Origem: code review da Task #258. A primeira versao ligava WhatsApp
-- incondicionalmente pra todo platform_owner / validador_mestre com
-- usuarios.telefone setado. Pela "regra do mesmo padrao" da Task #146
-- (Migration 048, canais_aviso_2fa), o owner precisa poder OPTAR OUT
-- por canal sem mexer em env var. Esta coluna persiste a preferencia
-- por canal especifica do aviso de carencia LGPD.
--
-- Por que coluna nova (em vez de reusar canais_aviso_2fa):
--   canais_aviso_2fa eh semanticamente "canais pra aviso de expiracao
--   do 2FA" (Task #159). Misturar dominios diferentes na mesma coluna
--   confunde quem le o codigo e amarra mudancas de UX (owner pode
--   querer WhatsApp pra carencia LGPD mas nao pra 2FA, ou vice-versa).
--   Coluna dedicada respeita o naming semantico completo (regra ferro
--   Caio: nada de abreviar / generalizar de mais).
--
-- Default '{email,whatsapp}' preserva comportamento desejado pos-Task
-- #258 (todos os owners recebem pelos dois canais ate desligar
-- explicitamente). Array vazio = mudo (so o banner in-app / SELECT
-- direto na tabela de envios mostra).
--
-- REGRA FERRO Caio: psql aditivo IF NOT EXISTS, ZERO db:push.
-- Invariantes Wave 9 INTOCADOS (8.728 receitas + R$ 2.736.536,10).
-- ============================================================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS canais_aviso_carencia_lgpd text[] NOT NULL
    DEFAULT ARRAY['email','whatsapp']::text[];

COMMENT ON COLUMN usuarios.canais_aviso_carencia_lgpd IS
  'Task #258 - canais escolhidos pelo platform_owner / validador_mestre pra receber avisos de vencimento da carencia LGPD de exclusao de clinica (worker avisoVencimentoCarenciaLgpd, Task #135). Valores aceitos: ''email'', ''whatsapp''. Array vazio = mudo. Default mantem comportamento da Task #258 (email + whatsapp). NAO confundir com canais_aviso_2fa (Migration 048, dominio 2FA).';
