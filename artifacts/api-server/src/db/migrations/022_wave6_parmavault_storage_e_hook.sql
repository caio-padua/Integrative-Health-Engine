-- Wave 6 PARMAVAULT-TSUNAMI: storage Drive + hook emissao operacional
-- REGRA FERRO: psql IF NOT EXISTS aditivo, ZERO db:push.

-- 1. Drive storage para relatorios (Bloco 1)
ALTER TABLE parmavault_relatorios_gerados
  ADD COLUMN IF NOT EXISTS pdf_drive_id   text,
  ADD COLUMN IF NOT EXISTS excel_drive_id text;

-- 2. UNIQUE em numero_receita pra ON CONFLICT DO NOTHING do hook (Bloco 3)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'parmavault_receitas_numero_receita_key'
      AND conrelid = 'parmavault_receitas'::regclass
  ) THEN
    ALTER TABLE parmavault_receitas
      ADD CONSTRAINT parmavault_receitas_numero_receita_key
      UNIQUE (numero_receita);
  END IF;
END$$;
