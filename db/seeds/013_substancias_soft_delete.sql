-- Migration 013 PARMASUPRA-TSUNAMI WAVE-5 (Dr. Claude audit fix #3)
-- Adiciona coluna deleted_at para soft delete em substancias.
-- ADITIVA, IDEMPOTENTE, NUNCA db:push, NUNCA ALTER em PK.
-- Justificativa: hard delete deixa prescricoes/aplicacoes/estoque historicos
-- com FK orfa caso uma substancia seja apagada por engano.

ALTER TABLE substancias ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_substancias_deleted_at_null
  ON substancias (id) WHERE deleted_at IS NULL;
