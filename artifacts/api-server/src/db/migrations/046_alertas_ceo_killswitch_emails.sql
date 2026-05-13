-- 046 · Task #141 · Alertas pro CEO quando emails de suspensao/reativacao
-- comecam a falhar em massa.
--
-- Por que existe:
--   Hoje os eventos de auditoria_kill_switch (acao SUSPENDER/REASSUMIR)
--   guardam em metadata.avisos[] o resultado do envio do email — e o painel
--   da Task #134 mostra falhas. Mas se a credencial do Gmail expirar ou o
--   contato da clinica rejeitar, varias suspensoes rodam em silencio sem
--   ninguem perceber. Esta tabela serve de fila de alertas proativos pro
--   CEO no mesmo modelo do `alertas_ceo_assinaturas` (Wave 10.6).
--
-- Idempotencia:
--   UNIQUE (evento_id, tentativa_idx) — cada entrada do array
--   metadata.avisos[] do evento eh uma "tentativa" (1-indexed via WITH
--   ORDINALITY). Roda re-executa: ON CONFLICT DO NOTHING.
--
-- Aditiva.
CREATE TABLE IF NOT EXISTS alertas_ceo_killswitch_emails (
  id              BIGSERIAL PRIMARY KEY,
  evento_id       BIGINT NOT NULL REFERENCES auditoria_kill_switch(id) ON DELETE CASCADE,
  tentativa_idx   INTEGER NOT NULL,
  unidade_id      INTEGER NOT NULL REFERENCES unidades(id),
  acao            TEXT NOT NULL,
  tipo_aviso      TEXT NOT NULL,
  destinatarios   INTEGER NOT NULL DEFAULT 0,
  enviados        INTEGER NOT NULL DEFAULT 0,
  falhas          INTEGER NOT NULL DEFAULT 0,
  erro            TEXT,
  motivo_alerta   TEXT NOT NULL,
  pct_falha       NUMERIC(6,2),
  notif_email_ok  BOOLEAN NOT NULL DEFAULT FALSE,
  notif_wpp_ok    BOOLEAN NOT NULL DEFAULT FALSE,
  visualizado_em  TIMESTAMPTZ,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT alertas_ceo_killswitch_emails_uniq UNIQUE (evento_id, tentativa_idx)
);

CREATE INDEX IF NOT EXISTS ix_alertas_ceo_killswitch_emails_criado
  ON alertas_ceo_killswitch_emails (criado_em DESC);

COMMENT ON TABLE alertas_ceo_killswitch_emails IS
  'Task #141 — fila de alertas pro CEO quando emails de SUSPENDER/REASSUMIR '
  'falham (metadata.avisos[].falhas > 0 ou destinatarios=0 ou erro != null). '
  'Idempotente por (evento_id, tentativa_idx). Worker '
  'alertaKillSwitchEmailsCEO escaneia eventos recentes e dispara email + WPP '
  'pro Caio no mesmo modelo do alertaAssinaturasCEO (Wave 10.6).';
