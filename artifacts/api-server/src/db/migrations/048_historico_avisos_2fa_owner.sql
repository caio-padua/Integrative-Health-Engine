-- ============================================================================
-- Migration 048 · Task #158 — Historico de avisos de 2FA enviados ao owner
--
-- Origem: .local/tasks/task-158.md.
-- A Task #146 grava `usuarios.ultimo_aviso_2fa_em` (Migration 047) por
-- sessao, mas e um unico timestamp que sobrescreve a cada nova janela de
-- 8h. Sem historico nao da pra responder "fui avisado quantas vezes essa
-- semana? quantas vezes deixei expirar mesmo assim?". Esta tabela registra
-- 1 linha por aviso enviado pelo worker `avisoExpiracao2faOwner` e
-- correlaciona com a renovacao subsequente (proximo login 2FA antes da
-- expiracao da janela).
--
-- Modelo:
--   - 1 linha por (usuario_id, ultimo_login_2fa_em) — idempotente via UNIQUE.
--   - `aviso_em`: quando o worker enviou (email/whatsapp).
--   - `expira_em`: ultimo_login_2fa_em + 8h (cacheado pra UI ler rapido).
--   - `renovado_em`: NULL ate o usuario relogar 2FA dentro da janela.
--                   Preenchido pelo proprio worker em ticks subsequentes
--                   (sweep antes de mandar avisos novos).
--
-- REGRA FERRO Caio: psql aditivo IF NOT EXISTS, ZERO db:push.
-- REGRA NAMING Caio: nomes semanticos completos sem abreviacao.
-- Invariantes Wave 9 INTOCADOS (8.728 receitas + R$ 2.736.536,10).
-- Invariantes Wave 13 F1 INTOCADOS (perfil_plataforma, totp_*, 2fa cols).
-- ============================================================================

CREATE TABLE IF NOT EXISTS historico_avisos_2fa_owner (
  id                     bigserial PRIMARY KEY,
  usuario_id             integer NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  ultimo_login_2fa_em    timestamptz NOT NULL,
  aviso_em               timestamptz NOT NULL DEFAULT now(),
  expira_em              timestamptz NOT NULL,
  renovado_em            timestamptz,
  canal_email_ok         boolean NOT NULL DEFAULT false,
  canal_whatsapp_ok      boolean NOT NULL DEFAULT false,
  criado_em              timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_historico_avisos_2fa_owner_janela
  ON historico_avisos_2fa_owner (usuario_id, ultimo_login_2fa_em);

CREATE INDEX IF NOT EXISTS ix_historico_avisos_2fa_owner_aviso_em
  ON historico_avisos_2fa_owner (aviso_em DESC);

COMMENT ON TABLE historico_avisos_2fa_owner IS
  'Task #158 - 1 linha por aviso de expiracao 2FA enviado ao platform_owner. Renovado_em e preenchido pelo worker quando o owner relogar dentro da janela (ultimo_login_2fa_em > aviso_em E <= expira_em).';
