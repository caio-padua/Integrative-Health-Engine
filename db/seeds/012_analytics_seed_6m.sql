-- =====================================================================
-- Seed 012 — Analytics 6 meses para todas as unidades ativas
-- =====================================================================
-- PARMASUPRA-TSUNAMI T3 (22/abr/2026)
--
-- Expansao do seed 011: cobertura completa das 9 unidades ATIVAS x 6 meses
-- (nov/2025 a abril/2026), com numeros plausiveis baseados em meta_mensal.
--
-- Unidades cobertas neste seed (alem das 5 ja em 011):
--   8  INSTITUTO INTEGRATIVO    crescimento moderado (~5%/mes)
--   9  INSTITUTO LEMOS          oscilacao + queda recente (atencao)
--   10 INSTITUTO BARROS         queda consistente (critico)
--   15 INSTITUTO PADUA          tendencia crescente forte (+12-15%/mes) <- ALVO Dr. Claude
--   17 INSTITUTO PADUZZI        plato (variacao baixa)
--   20 INSTITUTO ANDRADE        queda inicial -> recuperacao (Eder Jofre) <- ALVO Dr. Claude
--
-- IDEMPOTENTE: usa ON CONFLICT (uniq unidade_id+ano_mes) DO NOTHING.
-- Re-execucao nao duplica nem altera linhas ja existentes.
-- =====================================================================

INSERT INTO analytics_clinica_mes
  (unidade_id, ano_mes, faturamento_brl, comissao_brl, receitas_count, pacientes_unicos, blends_distintos, ticket_medio_brl, origem)
VALUES
  -- INSTITUTO INTEGRATIVO (id 8) — crescimento moderado
  (8,  '2025-11',  72400.00,  5792.00,  46,  31,  18,  1573.91, 'sintetico_seed_012'),
  (8,  '2025-12',  78900.00,  6312.00,  49,  34,  19,  1610.20, 'sintetico_seed_012'),
  (8,  '2026-01',  84200.00,  6736.00,  52,  36,  20,  1619.23, 'sintetico_seed_012'),
  (8,  '2026-02', 152300.00, 12184.00,  78,  53,  24,  1952.56, 'sintetico_seed_012'),
  (8,  '2026-03', 162100.00, 12968.00,  82,  56,  25,  1976.83, 'sintetico_seed_012'),
  (8,  '2026-04', 178400.00, 14272.00,  89,  61,  27,  2004.49, 'sintetico_seed_012'),

  -- INSTITUTO LEMOS (id 9) — oscilacao + queda recente
  (9,  '2025-11',  88700.00,  7096.00,  42,  29,  16,  2111.90, 'sintetico_seed_012'),
  (9,  '2025-12',  92100.00,  7368.00,  44,  31,  17,  2093.18, 'sintetico_seed_012'),
  (9,  '2026-01',  79800.00,  6384.00,  39,  27,  16,  2046.15, 'sintetico_seed_012'),
  (9,  '2026-02',  94600.00,  7568.00,  45,  31,  17,  2102.22, 'sintetico_seed_012'),
  (9,  '2026-03',  88450.00,  7076.00,  43,  30,  17,  2057.00, 'sintetico_seed_012'),
  (9,  '2026-04',  92300.00,  7384.00,  41,  28,  16,  2251.22, 'sintetico_seed_012'),

  -- INSTITUTO BARROS (id 10) — queda consistente (critico)
  (10, '2025-11',  82400.00,  6592.00,  38,  26,  15,  2168.42, 'sintetico_seed_012'),
  (10, '2025-12',  78900.00,  6312.00,  36,  25,  15,  2191.67, 'sintetico_seed_012'),
  (10, '2026-01',  74200.00,  5936.00,  34,  24,  14,  2182.35, 'sintetico_seed_012'),
  (10, '2026-02',  76800.00,  6144.00,  35,  24,  14,  2194.29, 'sintetico_seed_012'),
  (10, '2026-03',  71200.00,  5696.00,  32,  22,  13,  2225.00, 'sintetico_seed_012'),
  (10, '2026-04',  64700.00,  5176.00,  28,  19,  12,  2310.71, 'sintetico_seed_012'),

  -- INSTITUTO PADUA (id 15) — tendencia crescente forte (alvo Dr. Claude)
  (15, '2025-11',  98400.00,  7872.00,  56,  37,  22,  1757.14, 'sintetico_seed_012'),
  (15, '2025-12', 112700.00,  9016.00,  63,  42,  24,  1789.68, 'sintetico_seed_012'),
  (15, '2026-01', 128300.00, 10264.00,  71,  47,  26,  1807.04, 'sintetico_seed_012'),
  (15, '2026-02', 145800.00, 11664.00,  79,  52,  28,  1845.57, 'sintetico_seed_012'),
  (15, '2026-03', 168400.00, 13472.00,  89,  58,  31,  1892.13, 'sintetico_seed_012'),
  (15, '2026-04', 196200.00, 15696.00, 102,  66,  34,  1923.53, 'sintetico_seed_012'),

  -- INSTITUTO PADUZZI (id 17) — plato (variacao baixa)
  (17, '2025-11',  68900.00,  5512.00,  41,  28,  16,  1680.49, 'sintetico_seed_012'),
  (17, '2025-12',  71200.00,  5696.00,  43,  29,  16,  1655.81, 'sintetico_seed_012'),
  (17, '2026-01',  69800.00,  5584.00,  42,  28,  16,  1661.90, 'sintetico_seed_012'),
  (17, '2026-02',  72400.00,  5792.00,  44,  30,  17,  1645.45, 'sintetico_seed_012'),
  (17, '2026-03',  70900.00,  5672.00,  43,  29,  16,  1648.84, 'sintetico_seed_012'),
  (17, '2026-04',  73100.00,  5848.00,  45,  31,  17,  1624.44, 'sintetico_seed_012'),

  -- INSTITUTO ANDRADE (id 20) — queda inicial + recuperacao Eder Jofre (alvo Dr. Claude)
  (20, '2025-11',  62300.00,  4984.00,  34,  23,  14,  1832.35, 'sintetico_seed_012'),
  (20, '2025-12',  58400.00,  4672.00,  31,  21,  13,  1883.87, 'sintetico_seed_012'),
  (20, '2026-01',  52100.00,  4168.00,  28,  19,  12,  1860.71, 'sintetico_seed_012'),
  (20, '2026-02',  54800.00,  4384.00,  30,  20,  13,  1826.67, 'sintetico_seed_012'),
  (20, '2026-03',  62700.00,  5016.00,  35,  24,  15,  1791.43, 'sintetico_seed_012'),
  (20, '2026-04',  78900.00,  6312.00,  44,  29,  17,  1793.18, 'sintetico_seed_012')
ON CONFLICT (unidade_id, ano_mes) DO NOTHING;

-- Verificacao
DO $$
DECLARE
  total_linhas INT;
  unidades_cobertas INT;
BEGIN
  SELECT count(*), count(DISTINCT unidade_id)
    INTO total_linhas, unidades_cobertas
    FROM analytics_clinica_mes;
  RAISE NOTICE '[seed 012] analytics_clinica_mes: % linhas, % unidades distintas',
    total_linhas, unidades_cobertas;
END $$;
