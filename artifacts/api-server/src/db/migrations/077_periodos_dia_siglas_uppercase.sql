-- Migration 077: Siglas dos Períodos em MAIÚSCULAS — preferência final (Caio 2026-05-19)
-- Data: 2026-05-19 (mesma sessão das 075/076)
-- Autor: Dr. Replit
--
-- CONTEXTO:
-- Caio reviu a preferência: regra geral PAWARDS = SIGLAS SEMPRE MAIÚSCULAS.
-- Esta migration reverte a 076 (que tinha aplicado lowercase) e padroniza
-- definitivamente em MAIÚSCULAS: JE/IM/MM/AL/IT/MT/NO/FN/CE.
--
-- REGRA FERRO: aditivo, idempotente, sem DROP. IDs/ordem preservados.

BEGIN;

-- ============================================================================
-- 1) UPDATE periodos_dia — sigla pra maiúsculas
-- ============================================================================
UPDATE periodos_dia SET sigla = upper(sigla) WHERE sigla <> upper(sigla);

-- ============================================================================
-- 2) Remap JSONB siglas → MAIÚSCULAS em catálogos
-- ============================================================================
UPDATE remedios_farmacia
SET periodos_padrao = (
  SELECT jsonb_agg(to_jsonb(upper(elem #>> '{}')))
  FROM jsonb_array_elements(periodos_padrao) elem
)
WHERE periodos_padrao IS NOT NULL
  AND jsonb_typeof(periodos_padrao) = 'array'
  AND jsonb_array_length(periodos_padrao) > 0
  AND periodos_padrao::text ~ '[a-z]';

UPDATE suplementos_laboratorio
SET periodos_padrao = (
  SELECT jsonb_agg(to_jsonb(upper(elem #>> '{}')))
  FROM jsonb_array_elements(periodos_padrao) elem
)
WHERE periodos_padrao IS NOT NULL
  AND jsonb_typeof(periodos_padrao) = 'array'
  AND jsonb_array_length(periodos_padrao) > 0
  AND periodos_padrao::text ~ '[a-z]';

UPDATE formulas
SET periodos_padrao = (
  SELECT jsonb_agg(to_jsonb(upper(elem #>> '{}')))
  FROM jsonb_array_elements(periodos_padrao) elem
)
WHERE periodos_padrao IS NOT NULL
  AND jsonb_typeof(periodos_padrao) = 'array'
  AND jsonb_array_length(periodos_padrao) > 0
  AND periodos_padrao::text ~ '[a-z]';

-- ============================================================================
-- 3) Validação
-- ============================================================================
DO $$
DECLARE
  v_siglas text;
BEGIN
  SELECT string_agg(sigla, ',' ORDER BY ordem) INTO v_siglas FROM periodos_dia;

  IF v_siglas <> 'JE,IM,MM,AL,IT,MT,NO,FN,CE' THEN
    RAISE EXCEPTION 'Migration 077 FALHOU: siglas esperadas JE,IM,MM,AL,IT,MT,NO,FN,CE — encontradas: %', v_siglas;
  END IF;

  RAISE NOTICE 'Migration 077 OK · siglas em MAIÚSCULAS: %', v_siglas;
END$$;

COMMIT;
