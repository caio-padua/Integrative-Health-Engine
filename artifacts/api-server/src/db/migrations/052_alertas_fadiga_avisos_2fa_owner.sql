-- ============================================================================
-- Migration 052 · Task #170 — Alerta de fadiga de avisos 2FA do owner
--
-- Origem: .local/tasks/task-170.md.
-- A Task #158 (Migration 048) ja registra em `historico_avisos_2fa_owner`
-- quais janelas expiraram apos aviso (renovado_em IS NULL E expira_em <= now()).
-- Quando o owner deixa 3+ avisos consecutivos expirarem na mesma janela de
-- 7 dias, e sinal de fadiga de aviso ou perda de canal (email caiu no spam,
-- WhatsApp sem internet, Telegram silenciado). Este alerta de SEGUNDA ORDEM
-- avisa o owner de forma agregada — "voce ignorou 3 avisos seguidos —
-- confira email/WhatsApp" — e aumenta a chance de recuperacao do habito.
--
-- Modelo de idempotencia:
--   - 1 linha por (usuario_id, anchor_em) onde anchor_em e o aviso_em do
--     PRIMEIRO expirado da sequencia atual (MIN aviso_em do streak trailing
--     de expirados sem renovacao). Enquanto o streak nao for quebrado por
--     uma renovacao, o anchor permanece o mesmo e o UNIQUE bloqueia spam.
--   - Quando o owner relogar 2FA dentro da janela (renovado_em preenchido
--     pelo sweep), o streak quebra. O proximo expirado inicia novo streak
--     com novo anchor — gerando NOVO alerta apenas se 3+ se acumularem
--     novamente.
--
-- REGRA FERRO Caio: psql aditivo IF NOT EXISTS, ZERO db:push.
-- REGRA NAMING Caio: nomes semanticos completos sem abreviacao.
-- Invariantes Wave 9 INTOCADOS (8.728 receitas + R$ 2.736.536,10).
-- Invariantes Wave 13 F1 INTOCADOS (perfil_plataforma, totp_*, 2fa cols).
-- ============================================================================

CREATE TABLE IF NOT EXISTS alertas_fadiga_avisos_2fa_owner (
  id                bigserial PRIMARY KEY,
  usuario_id        integer NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  anchor_em         timestamptz NOT NULL,
  qtd_expirados     integer NOT NULL,
  mais_recente_em   timestamptz NOT NULL,
  janela_dias       integer NOT NULL DEFAULT 7,
  email_ok          boolean NOT NULL DEFAULT false,
  criado_em         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_alertas_fadiga_avisos_2fa_owner_streak
  ON alertas_fadiga_avisos_2fa_owner (usuario_id, anchor_em);

CREATE INDEX IF NOT EXISTS ix_alertas_fadiga_avisos_2fa_owner_criado_em
  ON alertas_fadiga_avisos_2fa_owner (criado_em DESC);

COMMENT ON TABLE alertas_fadiga_avisos_2fa_owner IS
  'Task #170 - 1 linha por sequencia de 3+ avisos 2FA expirados consecutivos sem renovacao em 7 dias por owner. Anchor_em = MIN aviso_em do streak; UNIQUE garante 1 alerta por sequencia (no-spam ate o owner quebrar o streak renovando).';
