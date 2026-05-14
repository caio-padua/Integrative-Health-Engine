-- ============================================================================
-- Migration 051 · Task #154 — Forcar logout do usuario suspeito direto pelo
-- painel.
--
-- Origem: .local/tasks/task-154.md.
-- Hoje a unica forma do platform_owner reagir a uma sessao suspeita
-- (alerta brute-force 2FA Task #143) e desativar a conta manualmente —
-- nao existe endpoint dedicado que invalide JWTs ja emitidos. Resposta
-- rapida a session-hijack precisa de um botao "Forcar logout agora" que
-- invalide TODAS as sessoes ativas do usuario alvo sem precisar mexer
-- em senha, perfil ou flag `ativo` (que tem efeitos colaterais).
--
-- Estrutura da coluna:
--   tokens_invalidos_apos timestamptz NULL DEFAULT NULL
--   Quando NULL, comportamento legado: todos os JWTs validos do usuario
--   passam normalmente. Quando preenchido, `requireAuth` rejeita qualquer
--   JWT cujo `iat` (issued-at em segundos) seja anterior a esse timestamp
--   — efetivamente um "logout em massa" do usuario alvo. O proximo login
--   emite um JWT novo com iat > tokens_invalidos_apos, que volta a passar.
--
-- Tambem amplia o CHECK de `auditoria_kill_switch.acao` pra aceitar a nova
-- acao 'FORCAR_LOGOUT' (registrada por POST /api/plataforma/usuarios/:id/
-- forcar-logout, com guardas platform_owner estrito + 2FA recente).
--
-- REGRA FERRO Caio: psql aditivo IF NOT EXISTS, ZERO db:push.
-- REGRA NAMING Caio: nome semantico completo (`tokens_invalidos_apos`),
-- sem abreviacao. Companheira: `ultimo_login_2fa_em` (Migration 044).
--
-- Invariantes Wave 9 INTOCADOS (8.728 receitas + R$ 2.736.536,10).
-- Invariantes Wave 13 F1/F3 INTOCADOS (perfil_plataforma, totp_*).
-- ============================================================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS tokens_invalidos_apos timestamptz;

COMMENT ON COLUMN usuarios.tokens_invalidos_apos IS
  'Task #154 - kill-switch de sessoes JWT do usuario. Quando preenchido, requireAuth rejeita tokens com iat < tokens_invalidos_apos (logout em massa). NULL = comportamento legado (todos os tokens validos passam). Bumpado por POST /api/plataforma/usuarios/:id/forcar-logout (platform_owner estrito + 2FA recente, registrado em auditoria_kill_switch como FORCAR_LOGOUT). Resposta rapida a session-hijack sem precisar desativar a conta.';

ALTER TABLE auditoria_kill_switch DROP CONSTRAINT IF EXISTS auditoria_kill_switch_acao_check;
ALTER TABLE auditoria_kill_switch ADD CONSTRAINT auditoria_kill_switch_acao_check
  CHECK (acao IN (
    'SUSPENDER','REASSUMIR','EXPORTAR_LGPD',
    'EXCLUIR_AGENDAR','EXCLUIR_EXECUTAR','EXCLUIR_CANCELAR',
    'PROMOVER_ADMIN','REBAIXAR_ADMIN',
    'FORCAR_LOGOUT'
  ));
