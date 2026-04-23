-- Wave 4 PACIENTE-TSUNAMI · 22/abr/2026
-- Aditivo APENAS (CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS).
-- NUNCA roda db:push --force. NUNCA altera coluna existente.

CREATE TABLE IF NOT EXISTS paciente_otp (
  id            serial PRIMARY KEY,
  paciente_id   integer NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  codigo_hash   text NOT NULL,
  destinatario  text NOT NULL,
  canal         text NOT NULL DEFAULT 'EMAIL',
  expira_em     timestamptz NOT NULL,
  usado_em      timestamptz,
  tentativas    integer NOT NULL DEFAULT 0,
  ip_origem     inet,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paciente_otp_paciente
  ON paciente_otp(paciente_id);

CREATE INDEX IF NOT EXISTS idx_paciente_otp_busca
  ON paciente_otp(paciente_id, expira_em, usado_em);

CREATE INDEX IF NOT EXISTS idx_paciente_otp_recente
  ON paciente_otp(criado_em DESC);

-- Tabela de feedback explicito (idempotente, log only)
DO $$ BEGIN
  RAISE NOTICE 'migration 015 wave4 OK: paciente_otp criada (aditivo, sem ALTER em PKs)';
END $$;
