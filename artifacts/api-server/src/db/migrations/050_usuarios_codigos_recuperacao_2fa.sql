-- ============================================================================
-- Migration 050 · Task #123 — Codigos de recuperacao caso o admin perca o
-- celular do 2FA.
--
-- Origem: .local/tasks/task-123.md.
-- Hoje, se o platform_owner ou um tenant_admin perder o celular onde esta o
-- app autenticador (Google Authenticator/Authy/etc), ele fica trancado fora
-- do painel — nao tem fluxo de recuperacao. O padrao da industria (Google,
-- GitHub, AWS) e gerar 10 codigos de uso unico no momento da ativacao do
-- 2FA, mostrar UMA UNICA VEZ pro usuario guardar em local seguro, e aceitar
-- esses codigos no fluxo de login 2FA como alternativa ao codigo TOTP.
--
-- Estrutura da coluna:
--   codigos_recuperacao_2fa jsonb DEFAULT '[]'::jsonb
--   Array de objetos { hash: string (bcrypt), usadoEm: string|null (ISO8601) }
--   Quando o usuario consome um codigo no login, marcamos `usadoEm` em vez
--   de remover o item — assim conseguimos mostrar "X de N restantes" e
--   auditar quando cada codigo foi usado.
--
-- REGRA FERRO Caio: psql aditivo IF NOT EXISTS, ZERO db:push.
-- REGRA NAMING Caio: nome semantico completo (codigos_recuperacao_2fa),
-- sem abreviacao. Companheiras: totp_secret_cifrado, totp_ativado_em,
-- ultimo_login_2fa_em (Migration 044).
--
-- Invariantes Wave 9 INTOCADOS (8.728 receitas + R$ 2.736.536,10).
-- Invariantes Wave 13 F1/F3 INTOCADOS (perfil_plataforma, totp_*).
-- ============================================================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS codigos_recuperacao_2fa jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN usuarios.codigos_recuperacao_2fa IS
  'Task #123 - codigos de recuperacao 2FA (bcrypt hashed) gerados na ativacao via POST /usuarios/2fa/iniciar e mostrados UMA UNICA VEZ. Array jsonb de { hash, usadoEm } - hash bcrypt do codigo plano (formato XXXX-XXXX, 8 chars base32 sem padding), usadoEm = ISO8601 quando consumido em /usuarios/login/2fa-verificar (ou null se ainda valido). Aceito como alternativa ao codigo TOTP no segundo fator do login. Pode ser regerado via POST /usuarios/2fa/regenerar-codigos-recuperacao (invalida os anteriores).';
