-- Migration 081 — Dose Media na faixa de dose de substancias/ativos (ADITIVA).
-- D005=A: valor de referencia preenchido manualmente pelo medico (nem sempre e a
-- media aritmetica entre minima e maxima). Texto livre, mesma natureza de
-- dose_minima/dose_maxima (migration 080). NADA dropado, apenas ADD COLUMN.
-- A unidade (D006=A) reaproveita a coluna existente unidade_dose — sem coluna nova.

ALTER TABLE substancias
  ADD COLUMN IF NOT EXISTS dose_media text;

COMMENT ON COLUMN substancias.dose_media IS
  'Dose de referencia (entre dose_minima e dose_maxima). Texto livre, preenchida manualmente pelo medico. Migration 081 (04/06/2026). Unidade compartilhada vem de unidade_dose.';
