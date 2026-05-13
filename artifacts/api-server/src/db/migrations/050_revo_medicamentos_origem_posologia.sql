-- =============================================================================
-- Migration 050 — Task #41 (Confirma-ou-corrige posologia)
-- Adiciona coluna `origem_posologia` em `revo_medicamentos` para distinguir
-- estruturas vindas do parser automático ('parser') das estruturas confirmadas
-- ou corrigidas manualmente pelo médico no RevoPanel ('manual').
--
-- REGRA FERRO: psql aditivo IF NOT EXISTS, sem db:push, sem drop. Coluna
-- `posologia` (texto cru) e `posologia_estruturada` (jsonb mirror, migration
-- 034) permanecem intocadas. Default 'parser' preserva semântica histórica
-- das 8.728 receitas Wave 9 (que continuarão lidas como `parser` até serem
-- confirmadas via novo fluxo manual). Triggers Wave 9/10 intocados.
--
-- Aplicada em: 2026-05-13
-- Idempotente: sim (IF NOT EXISTS + DO block para CHECK).
-- =============================================================================

ALTER TABLE revo_medicamentos
  ADD COLUMN IF NOT EXISTS origem_posologia text NOT NULL DEFAULT 'parser';

COMMENT ON COLUMN revo_medicamentos.origem_posologia IS
  'Origem da posologia_estruturada: parser=interpretada automaticamente por @workspace/posologia parsePosologia(); manual=confirmada/corrigida pelo médico via RevoPanel (modo confirma-ou-corrige, task #41).';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'revo_medicamentos_origem_posologia_check'
  ) THEN
    ALTER TABLE revo_medicamentos
      ADD CONSTRAINT revo_medicamentos_origem_posologia_check
      CHECK (origem_posologia IN ('parser', 'manual'));
  END IF;
END$$;

-- =============================================================================
-- Validação (rodar manual após aplicar):
--
-- SELECT origem_posologia, COUNT(*) FROM revo_medicamentos GROUP BY 1;
--   → Esperado: tudo 'parser' até primeiro uso do novo fluxo confirma-ou-corrige.
-- =============================================================================
