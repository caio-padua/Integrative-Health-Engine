-- ============================================================================
-- Migration 054 · Task #202 — Lista de sessoes JWT ativas + revogacao
-- individual ("encerrar sessao") na tela /perfil/seguranca-2fa.
--
-- Origem: .local/tasks/task-202.md.
-- Antes desta task a unica forma de invalidar uma sessao era bumpar
-- usuarios.tokens_invalidos_apos via Task #154 (forcar logout em massa),
-- o que mata TODAS as sessoes ativas do usuario, inclusive a do proprio
-- admin operando. Esta migration cria o registry persistente de sessoes
-- JWT com `jti` (JWT ID = UUID v4) gerado no signJwt e ecoado de volta
-- como claim, permitindo que requireAuth checa revogacao individual sem
-- afetar outras sessoes legitimas do mesmo usuario.
--
-- Estrutura da tabela:
--   sessoes_jwt
--     id              SERIAL PK
--     usuario_id      FK -> usuarios.id  ON DELETE CASCADE
--     jti             TEXT UNIQUE NOT NULL  (UUID v4 do claim jti)
--     user_agent      TEXT NULL  (header User-Agent capturado no login)
--     ip              TEXT NULL  (X-Forwarded-For primeiro hop ou socket)
--     criada_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
--     ultimo_uso_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()  (best-effort
--                     bumpada no requireAuth a cada request autenticado)
--     expira_em       TIMESTAMPTZ NOT NULL  (iat + TTL_SESSAO_SEGUNDOS = 8h)
--     revogada_em     TIMESTAMPTZ NULL  (preenchido por DELETE
--                     /usuarios/sessoes-ativas/:id; requireAuth rejeita
--                     com codigo SESSAO_REVOGADA quando preenchido)
--     revogada_motivo TEXT NULL  ("encerrada_pelo_usuario" hoje; futuro
--                     pode ter "logout_normal", "kill_switch_cascata", etc)
--
-- Compat: tokens emitidos antes desta migration nao tem claim `jti`, entao
-- requireAuth pula a checagem de revogacao quando jti esta ausente — eles
-- continuam validos ate expirar naturalmente. A partir do proximo login
-- (POST /usuarios/login senha-only OU POST /usuarios/login/2fa-verificar
-- pos-2FA) o token ja sai com jti e a sessao aparece na lista.
--
-- Idempotencia: uso CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS
-- pra que rodar 2x nao quebre nada (padrao das migrations 050+).
-- ============================================================================

CREATE TABLE IF NOT EXISTS sessoes_jwt (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  jti TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  ip TEXT,
  criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultimo_uso_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expira_em TIMESTAMPTZ NOT NULL,
  revogada_em TIMESTAMPTZ,
  revogada_motivo TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessoes_jwt_usuario ON sessoes_jwt(usuario_id);
