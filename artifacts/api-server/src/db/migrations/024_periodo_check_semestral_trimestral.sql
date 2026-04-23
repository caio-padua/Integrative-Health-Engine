-- Migration 024 — REGRA FERRO: psql aditivo IF EXISTS / IF NOT EXISTS
-- Expandir CHECK constraint de parametros_referencia_global.periodo
-- pra incluir TRIMESTRAL e SEMESTRAL (necessario pro seed integrativo
-- do Dr. Claude com Vit D semestral, Magnesio semestral, B12 semestral, etc).
-- Aplicado em 23/abr/2026 via psql.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.check_constraints
             WHERE constraint_name = 'parametros_referencia_global_periodo_check') THEN
    ALTER TABLE parametros_referencia_global
      DROP CONSTRAINT parametros_referencia_global_periodo_check;
  END IF;
END$$;

ALTER TABLE parametros_referencia_global
  ADD CONSTRAINT parametros_referencia_global_periodo_check
  CHECK (periodo = ANY (ARRAY['DIARIO'::text,'SEMANAL'::text,'MENSAL'::text,
                              'TRIMESTRAL'::text,'SEMESTRAL'::text,'ANUAL'::text]));
