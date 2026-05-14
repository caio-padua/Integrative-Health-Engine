-- ============================================================================
-- Migration 067 · Task #267 — Tipo novo de alerta de seguranca:
-- DESTINATARIO_AVISO_QUEBRADO (email/telefone que falha N vezes seguidas
-- nos avisos de kill-switch — sinal de cadastro obsoleto).
-- ============================================================================
--
-- A Migration 046 (Task #143) restringiu `alertas_ceo_seguranca.tipo` aos
-- alertas de auth (2FA_BRUTE_FORCE), depois a Migration 055 (Task #222)
-- adicionou 2FA_LOGIN_RECUPERACAO. Esta migration adiciona um terceiro
-- tipo, alimentado pelo worker `avisoDestinatarioQuebrado` (Task #267):
--
--   DESTINATARIO_AVISO_QUEBRADO — disparado quando o worker varre os
--   `metadata.avisos[]` de eventos kill-switch recentes (suspensao,
--   reativacao, reenvio) e detecta que o MESMO email/telefone falhou
--   em N tentativas consecutivas no MESMO evento (default N=3). Sinal
--   forte de email obsoleto, numero trocado, caixa cheia ou destinatario
--   bloqueado pelo provedor — exige acao manual do platform_owner pra
--   atualizar cadastro da clinica antes do proximo ciclo.
--
-- O worker reusa toda a infra de auditoria/exibicao ja existente
-- (alertas_ceo_seguranca + GET /alertas-seguranca + painel Task #152).
-- O `usuario_id` recebe o `executado_por_usuario_id` do evento original
-- (quem suspendeu/reativou) — garante FK integra e identifica o operador
-- da acao no painel. O `payload` carrega:
--   - unidade_id        : clinica afetada
--   - unidade_nome      : nome legivel da clinica
--   - acao              : SUSPENDER / REASSUMIR / etc (kill-switch acao)
--   - canal             : EMAIL / WHATSAPP
--   - destinatario      : email ou telefone normalizado
--   - falhas_consecutivas : contador no momento do disparo (>= N)
--   - evento_id         : id da linha em auditoria_kill_switch
--   - ultima_falha_em   : ISO timestamp da falha mais recente (fingerprint)
--
-- Idempotencia: a UNIQUE legada da migration 046
-- (tipo, usuario_id, janela_inicio_em) NAO basta pra este tipo, porque
-- dois destinatarios distintos podem compartilhar
-- (executado_por_usuario_id, ultima_falha_em) no MESMO evento — a
-- UNIQUE legada dropava silenciosamente o segundo insert.
-- Solucao: indice parcial UNIQUE pelo fingerprint
-- (evento_id, canal, destinatario), restrito ao tipo novo, garantindo
-- 1 linha por (evento, canal, destinatario) sem afetar os demais tipos.
-- O worker usa `ON CONFLICT DO NOTHING RETURNING id` (sem target) pra
-- catch tanto a UNIQUE legada quanto a nova — RETURNING devolve 0 linhas
-- quando o insert virou no-op, permitindo metricas honestas.
--
-- REGRA FERRO Caio: psql aditivo IF NOT EXISTS, ZERO db:push, sem drop
-- de dados. Invariantes Wave 9 INTOCADOS (8.728 receitas + R$ 2.736.536,10).
-- REGRA NAMING Caio: nomes semanticos completos sem abreviacao.
-- ============================================================================

ALTER TABLE alertas_ceo_seguranca
  DROP CONSTRAINT IF EXISTS alertas_ceo_seguranca_tipo_check;

ALTER TABLE alertas_ceo_seguranca
  ADD CONSTRAINT alertas_ceo_seguranca_tipo_check
  CHECK (tipo IN (
    '2FA_BRUTE_FORCE',
    '2FA_LOGIN_RECUPERACAO',
    'DESTINATARIO_AVISO_QUEBRADO'
  ));

COMMENT ON CONSTRAINT alertas_ceo_seguranca_tipo_check ON alertas_ceo_seguranca IS
  'Task #267 - Estende o CHECK das Migrations 046 (Task #143) e 055 (Task #222) '
  'pra aceitar tambem DESTINATARIO_AVISO_QUEBRADO (worker '
  'avisoDestinatarioQuebrado detectou >=N falhas consecutivas pro mesmo '
  'email/telefone num mesmo evento kill-switch). Quando aparecer um quarto '
  'tipo de alerta, basta adicionar aqui (sem drop de dados).';

-- Indice parcial UNIQUE pelo fingerprint (evento_id, canal, destinatario)
-- restrito ao tipo novo. Garante 1 linha por (evento, canal, destinatario)
-- mesmo quando dois destinatarios falham no MESMO timestamp/operador
-- (cenario que a UNIQUE legada da migration 046 dropava silenciosamente).
-- Filtrado por tipo pra nao impactar os demais tipos do alerta.
CREATE UNIQUE INDEX IF NOT EXISTS uq_alertas_ceo_seguranca_destinatario_quebrado_fp
  ON alertas_ceo_seguranca (
    (payload->>'evento_id'),
    (payload->>'canal'),
    (payload->>'destinatario')
  )
  WHERE tipo = 'DESTINATARIO_AVISO_QUEBRADO';
