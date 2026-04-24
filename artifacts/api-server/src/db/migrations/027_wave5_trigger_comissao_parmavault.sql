-- ════════════════════════════════════════════════════════════════════
-- Migration 027 — Wave 5 PARMAVAULT — Trigger SQL B3
-- Calcula comissao_estimada na hora do INSERT em parmavault_receitas.
--
-- Aprovado: Manifesto Dilúvio Planetário (Dr. Claude → Caio → Dr. Replit)
-- Fórmula COALESCE: formula_blend.valor_max → valor_formula_real → valor_formula_estimado
--                   * (farmacias_parmavault.percentual_comissao / 100)
--
-- REGRA FERRO: aditivo, idempotente. CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS.
-- Defensivo: se base for NULL/0 ou pct NULL, deixa comissao_estimada NULL.
-- Origem marcada como 'trigger_insert' pra rastreio.
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_calc_comissao_parmavault()
RETURNS TRIGGER AS $$
DECLARE
    v_pct  numeric;
    v_max  numeric;
    v_base numeric;
BEGIN
    -- 1) Já veio preenchido? Não toca (preserva valores explícitos).
    IF NEW.comissao_estimada IS NOT NULL AND NEW.comissao_estimada > 0 THEN
        RETURN NEW;
    END IF;

    -- 2) Busca % comissão da farmácia.
    SELECT fp.percentual_comissao INTO v_pct
    FROM farmacias_parmavault fp
    WHERE fp.id = NEW.farmacia_id;

    -- 3) Busca valor_max do blend (se existir blend_id).
    IF NEW.blend_id IS NOT NULL THEN
        SELECT fb.valor_max INTO v_max
        FROM formula_blend fb
        WHERE fb.id = NEW.blend_id;
    END IF;

    -- 4) Base preferida: valor_max do blend, depois valor real, depois estimado.
    v_base := COALESCE(
        NULLIF(v_max, 0),
        NULLIF(NEW.valor_formula_real, 0),
        NULLIF(NEW.valor_formula_estimado, 0)
    );

    -- 5) Calcula se temos base + pct válidos.
    IF v_base IS NOT NULL AND v_base > 0 AND v_pct IS NOT NULL AND v_pct > 0 THEN
        NEW.comissao_estimada        := ROUND(v_base * (v_pct / 100.0), 2);
        NEW.comissao_estimada_origem := CASE
            WHEN v_max IS NOT NULL AND v_max > 0  THEN 'trigger_insert_formula_blend_valor_max'
            WHEN NEW.valor_formula_real > 0       THEN 'trigger_insert_valor_formula_real'
            ELSE                                       'trigger_insert_valor_formula_estimado'
        END;
        NEW.comissao_estimada_em := now();
    ELSE
        -- Sem base ou sem pct: deixa NULL com origem rastreável.
        NEW.comissao_estimada        := NULL;
        NEW.comissao_estimada_origem := 'trigger_insert_sem_base';
        NEW.comissao_estimada_em     := now();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calc_comissao ON parmavault_receitas;

CREATE TRIGGER trg_calc_comissao
    BEFORE INSERT ON parmavault_receitas
    FOR EACH ROW
    EXECUTE FUNCTION fn_calc_comissao_parmavault();

-- ════════════════════════════════════════════════════════════════════
-- Smoke teste manual (não roda na migration, só referência):
--   BEGIN;
--   INSERT INTO parmavault_receitas (paciente_id, farmacia_id, blend_id, valor_formula_estimado)
--     VALUES (1, (SELECT id FROM farmacias_parmavault WHERE ativo LIMIT 1), NULL, 200.00);
--   SELECT id, comissao_estimada, comissao_estimada_origem FROM parmavault_receitas
--     ORDER BY id DESC LIMIT 1;
--   ROLLBACK;
-- ════════════════════════════════════════════════════════════════════
