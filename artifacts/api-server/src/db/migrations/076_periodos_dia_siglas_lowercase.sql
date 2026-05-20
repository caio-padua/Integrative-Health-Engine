-- Migration 076: Siglas dos Períodos em Minúsculas (Caio 2026-05-19)
-- Data: 2026-05-19 (mesma sessão da 075)
-- Autor: Dr. Replit (validado por Caio · CEO Instituto Pádua)
--
-- CONTEXTO:
-- Migration 075 deixou siglas em MAIÚSCULAS (JE/IM/MM/AL/IT/MT/NO/FN/CE).
-- Caio prefere minúsculas (je/im/mm/al/it/mt/no/fn/ce) — padrão visual mais limpo
-- e alinhado com convenção de keys em JSONB e código TS.
--
-- REGRA FERRO: aditivo, idempotente, sem DROP. Apenas lowercase.
-- IDs (PKs) e ordem preservados. FKs continuam apontando pra mesma linha lógica.

BEGIN;

-- ============================================================================
-- 1) UPDATE periodos_dia — apenas sigla pra minúsculas
-- ============================================================================
UPDATE periodos_dia SET sigla = lower(sigla) WHERE sigla <> lower(sigla);

-- ============================================================================
-- 2) Remap JSONB siglas maiúsculas → minúsculas em catálogos
-- ============================================================================
UPDATE remedios_farmacia
SET periodos_padrao = (
  SELECT jsonb_agg(to_jsonb(lower(elem #>> '{}')))
  FROM jsonb_array_elements(periodos_padrao) elem
)
WHERE periodos_padrao IS NOT NULL
  AND jsonb_typeof(periodos_padrao) = 'array'
  AND jsonb_array_length(periodos_padrao) > 0
  AND periodos_padrao::text ~ '[A-Z]';

UPDATE suplementos_laboratorio
SET periodos_padrao = (
  SELECT jsonb_agg(to_jsonb(lower(elem #>> '{}')))
  FROM jsonb_array_elements(periodos_padrao) elem
)
WHERE periodos_padrao IS NOT NULL
  AND jsonb_typeof(periodos_padrao) = 'array'
  AND jsonb_array_length(periodos_padrao) > 0
  AND periodos_padrao::text ~ '[A-Z]';

UPDATE formulas
SET periodos_padrao = (
  SELECT jsonb_agg(to_jsonb(lower(elem #>> '{}')))
  FROM jsonb_array_elements(periodos_padrao) elem
)
WHERE periodos_padrao IS NOT NULL
  AND jsonb_typeof(periodos_padrao) = 'array'
  AND jsonb_array_length(periodos_padrao) > 0
  AND periodos_padrao::text ~ '[A-Z]';

-- ============================================================================
-- 3) Validação
-- ============================================================================
DO $$
DECLARE
  v_siglas text;
BEGIN
  SELECT string_agg(sigla, ',' ORDER BY ordem) INTO v_siglas FROM periodos_dia;

  IF v_siglas <> 'je,im,mm,al,it,mt,no,fn,ce' THEN
    RAISE EXCEPTION 'Migration 076 FALHOU: siglas esperadas je,im,mm,al,it,mt,no,fn,ce — encontradas: %', v_siglas;
  END IF;

  RAISE NOTICE 'Migration 076 OK · siglas em minúsculas: %', v_siglas;
END$$;

COMMIT;
