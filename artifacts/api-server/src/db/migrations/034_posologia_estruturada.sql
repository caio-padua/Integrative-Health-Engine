-- =============================================================================
-- Migration 034 — Task #7 (Posologia estruturada)
-- Adiciona coluna JSONB `posologia_estruturada` em `itens_terapeuticos` e em
-- `revo_medicamentos` para armazenar a estrutura normalizada devolvida pela
-- função pura `parsePosologia` (lib `@workspace/posologia`).
--
-- REGRA FERRO: psql aditivo IF NOT EXISTS, sem db:push, sem drop. Coluna `posologia`
-- existente (TEXT) permanece intocada como fonte de verdade humana — a coluna
-- nova é espelho normalizado, opcional e nullable. Triggers Wave 9/10
-- (027/030/031) intocados.
--
-- Aplicada em: 2026-05-11
-- Idempotente: sim (IF NOT EXISTS).
-- =============================================================================

ALTER TABLE itens_terapeuticos
  ADD COLUMN IF NOT EXISTS posologia_estruturada jsonb;

COMMENT ON COLUMN itens_terapeuticos.posologia_estruturada IS
  'Estrutura normalizada PosologiaEstruturada produzida por @workspace/posologia parsePosologia(). Espelho aditivo da coluna texto `posologia`. Sempre nullable; consumidores devem cair no texto bruto quando ausente ou interpretado=false.';

ALTER TABLE revo_medicamentos
  ADD COLUMN IF NOT EXISTS posologia_estruturada jsonb;

COMMENT ON COLUMN revo_medicamentos.posologia_estruturada IS
  'Estrutura normalizada PosologiaEstruturada produzida por @workspace/posologia parsePosologia(). Espelho aditivo da coluna texto `posologia`. Sempre nullable; consumidores devem cair no texto bruto quando ausente ou interpretado=false.';

-- =============================================================================
-- Validação (rodar manual após aplicar):
-- =============================================================================
-- SELECT column_name, data_type FROM information_schema.columns
--  WHERE table_name IN ('itens_terapeuticos','revo_medicamentos')
--    AND column_name = 'posologia_estruturada';
-- → esperado: 2 linhas, ambas data_type=jsonb
-- =============================================================================
