-- ============================================================================
-- Migration 055 · Task #222 — Alerta quando admin entra com codigo de
-- recuperacao 2FA (em vez do app autenticador)
-- ============================================================================
--
-- Hoje a Migration 046 (Task #143) restringe `alertas_ceo_seguranca.tipo` a
-- '2FA_BRUTE_FORCE' apenas. A Task #222 introduz um segundo tipo de alerta
-- de seguranca: '2FA_LOGIN_RECUPERACAO', emitido toda vez que o login
-- (POST /usuarios/login/2fa-verificar) aceita um codigo de recuperacao
-- (XXXX-XXXX) em vez do TOTP de 6 digitos.
--
-- Por que e alerta de seguranca:
--   - Codigos de recuperacao sao "atalho" pra entrar sem o app autenticador.
--     Uso normal e raro (perdeu o celular, trocou de aparelho). Uso frequente
--     ou nao-reconhecido pelo dono da conta = sinal de codigo vazado.
--   - Ao registrar em alertas_ceo_seguranca, reaproveitamos toda a infra de
--     auditoria, retry, escalonamento WhatsApp e tela de visualizacao
--     (Tasks #143, #152, #167, #194).
--
-- Idempotencia: o UNIQUE(tipo, usuario_id, janela_inicio_em) ja existente
-- garante 1 alerta por evento. Como cada login com codigo de recuperacao
-- e um evento distinto, usamos `now()` como janela_inicio_em na chamada
-- — sem colisao na pratica (resolucao de microssegundos).
--
-- REGRA FERRO Caio: psql aditivo IF NOT EXISTS, ZERO db:push, sem drop.
-- REGRA NAMING Caio: nomes semanticos completos sem abreviacao.
-- Invariantes Wave 9 INTOCADOS (8.728 receitas + R$ 2.736.536,10).
-- ============================================================================

ALTER TABLE alertas_ceo_seguranca
  DROP CONSTRAINT IF EXISTS alertas_ceo_seguranca_tipo_check;

ALTER TABLE alertas_ceo_seguranca
  ADD CONSTRAINT alertas_ceo_seguranca_tipo_check
  CHECK (tipo IN ('2FA_BRUTE_FORCE', '2FA_LOGIN_RECUPERACAO'));

COMMENT ON CONSTRAINT alertas_ceo_seguranca_tipo_check ON alertas_ceo_seguranca IS
  'Task #222 - Estende o CHECK da Migration 046 (Task #143) pra aceitar tambem '
  '2FA_LOGIN_RECUPERACAO (login aceitou codigo de recuperacao XXXX-XXXX em vez '
  'do TOTP). Quando aparecer um terceiro tipo de alerta de seguranca, basta '
  'adicionar aqui (sem drop de dados).';
