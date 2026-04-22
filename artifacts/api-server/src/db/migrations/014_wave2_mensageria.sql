-- MENSAGERIA-TSUNAMI Wave 2 (22/abr/2026 noite)
-- Aditiva, idempotente, aplicada via psql (REGRA FERRO: zero db:push).

-- 1) opt-out por paciente, por canal
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS notif_opt_out_email BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS notif_opt_out_whatsapp BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS opt_out_token TEXT;

-- 2) config global de mensageria (quiet hours)
CREATE TABLE IF NOT EXISTS notif_config (
  id SERIAL PRIMARY KEY,
  quiet_inicio TIME NOT NULL DEFAULT '22:00:00',
  quiet_fim TIME NOT NULL DEFAULT '07:00:00',
  tz TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  habilitar_quiet_hours BOOLEAN NOT NULL DEFAULT TRUE,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO notif_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 3) novos status: PULADO_QUIET (rejeitado por quiet hours, será reagendado)
--                  PULADO_OPTOUT (paciente optou por não receber, terminal)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assinatura_notificacoes_status_check') THEN
    ALTER TABLE assinatura_notificacoes DROP CONSTRAINT assinatura_notificacoes_status_check;
  END IF;
  ALTER TABLE assinatura_notificacoes ADD CONSTRAINT assinatura_notificacoes_status_check
    CHECK (status IN ('PENDENTE','ENVIADO','FALHA','PULADO_QUIET','PULADO_OPTOUT'));
END$$;
