-- Seed 005 — PAINEL PAWARDS MEDCORE
-- Popula 5 clínicas com faixas de faturamento, valor nos blends, 30 parâmetros referência
-- e 90 dias de faturamento_diario coerente.
-- IDEMPOTENTE.

BEGIN;

-- ============================================================
-- A) Slugs e faixas de faturamento por clínica (UPDATE em existentes)
-- ============================================================
UPDATE unidades SET slug='padua-higienopolis',
  fat_minimo_mensal=180000, fat_maximo_mensal=380000,
  fat_meta_mensal=280000, percentual_comissao_magistral=30
WHERE id=1 AND (slug IS NULL OR slug='');

UPDATE unidades SET slug='genesis',
  fat_minimo_mensal=120000, fat_maximo_mensal=250000,
  fat_meta_mensal=190000, percentual_comissao_magistral=30
WHERE id=14 AND (slug IS NULL OR slug='');

UPDATE unidades SET slug='paluzze',
  fat_minimo_mensal=80000,  fat_maximo_mensal=180000,
  fat_meta_mensal=130000, percentual_comissao_magistral=30
WHERE id=16 AND (slug IS NULL OR slug='');

UPDATE unidades SET slug='pazialle',
  fat_minimo_mensal=90000,  fat_maximo_mensal=200000,
  fat_meta_mensal=145000, percentual_comissao_magistral=30
WHERE id=18 AND (slug IS NULL OR slug='');

UPDATE unidades SET slug='barakat',
  fat_minimo_mensal=70000,  fat_maximo_mensal=160000,
  fat_meta_mensal=115000, percentual_comissao_magistral=30
WHERE id=19 AND (slug IS NULL OR slug='');

-- ============================================================
-- B) Valor BRL nos 12 blends (mercado: R$ 80 a R$ 450)
-- ============================================================
UPDATE formula_blend SET valor_brl=180.00 WHERE codigo_blend='FORM_SONO_BLND_ORAL_001' AND valor_brl IS NULL;
UPDATE formula_blend SET valor_brl=220.00 WHERE codigo_blend='FORM_FOCO_BLND_ORAL_002' AND valor_brl IS NULL;
UPDATE formula_blend SET valor_brl=260.00 WHERE codigo_blend='FORM_META_BLND_ORAL_003' AND valor_brl IS NULL;
UPDATE formula_blend SET valor_brl=240.00 WHERE codigo_blend='FORM_HEPA_BLND_ORAL_004' AND valor_brl IS NULL;
UPDATE formula_blend SET valor_brl=320.00 WHERE codigo_blend='BLEND-ANTIOX-01'         AND valor_brl IS NULL;
UPDATE formula_blend SET valor_brl=380.00 WHERE codigo_blend='BLEND-NEURO-01'          AND valor_brl IS NULL;
UPDATE formula_blend SET valor_brl=420.00 WHERE codigo_blend='BLEND-HORM-F01'          AND valor_brl IS NULL;
UPDATE formula_blend SET valor_brl=290.00 WHERE codigo_blend='BLEND-IMUNE-01'          AND valor_brl IS NULL;
UPDATE formula_blend SET valor_brl=270.00 WHERE codigo_blend='BLEND-DETOX-01'          AND valor_brl IS NULL;
UPDATE formula_blend SET valor_brl=190.00 WHERE codigo_blend='BLEND-SLEEP-01'          AND valor_brl IS NULL;
UPDATE formula_blend SET valor_brl=300.00 WHERE codigo_blend='BLEND-METAB-01'          AND valor_brl IS NULL;
UPDATE formula_blend SET valor_brl=440.00 WHERE codigo_blend='BLEND-HORM-M01'          AND valor_brl IS NULL;

-- ============================================================
-- C) Parâmetros de referência globais (~30 mín/máx editáveis)
-- ============================================================
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida, faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  -- KPIs financeiros
  ('FAT_MENSAL',      'Faturamento mensal',         'KPI_FINANCEIRO','MENSAL', 'BRL',     80000, 150000, 220000, 320000, 'Faixa global; sobrescrever por clínica'),
  ('TICKET_MEDIO',    'Ticket médio',               'KPI_FINANCEIRO','MENSAL', 'BRL',       600,   900,  1300,   1800, NULL),
  ('RECEBIVEIS',      'Recebíveis em aberto',       'KPI_FINANCEIRO','MENSAL', 'BRL',     50000, 120000, 200000, 300000, NULL),
  ('COMISSAO_FAMA',   'Comissão magistral devida',  'KPI_FINANCEIRO','MENSAL', 'BRL',     15000,  30000,  50000,  80000, '30% do total prescrito'),
  ('CAIXA_LIQUIDO',   'Caixa líquido do mês',       'KPI_FINANCEIRO','MENSAL', 'BRL',     20000,  60000, 120000, 200000, NULL),
  -- KPIs clínicos
  ('OCUPACAO',        'Taxa de ocupação',           'KPI_CLINICO',   'MENSAL', '%',          40,    60,    75,     90, NULL),
  ('NPS',             'NPS',                        'KPI_CLINICO',   'MENSAL', 'pts',        40,    60,    75,     90, NULL),
  ('TAXA_RETORNO',    'Taxa de retorno',            'KPI_CLINICO',   'MENSAL', '%',          30,    50,    70,     85, NULL),
  ('CONVERSAO_AGENDA','Conversão de agenda',        'KPI_CLINICO',   'MENSAL', '%',          50,    65,    80,     92, NULL),
  ('SATISFACAO',      'Satisfação geral',           'KPI_CLINICO',   'MENSAL', '%',          50,    70,    85,     93, NULL),
  ('CONSULTAS_DIA',   'Consultas/dia',              'KPI_CLINICO',   'DIARIO', 'qtd',         8,    14,    22,     35, NULL),
  ('PROCED_DIA',      'Procedimentos/dia',          'KPI_CLINICO',   'DIARIO', 'qtd',         3,     6,    10,     18, NULL),
  ('PACIENTES_NOVOS', 'Pacientes novos',            'KPI_CLINICO',   'MENSAL', 'qtd',        20,    40,    70,    120, NULL),
  -- Exames laboratoriais (faixas didáticas, não substituem laudo médico)
  ('EXAME_VITD',      'Vitamina D 25-OH',           'EXAME',         'MENSAL', 'ng/mL',      20,    30,    60,     80, 'ng/mL'),
  ('EXAME_FERRITINA', 'Ferritina',                  'EXAME',         'MENSAL', 'ng/mL',      30,    80,   200,    400, 'ng/mL'),
  ('EXAME_TSH',       'TSH',                        'EXAME',         'MENSAL', 'mUI/L',     0.4,   1.5,   3.0,    4.0, 'mUI/L'),
  ('EXAME_T4L',       'T4 livre',                   'EXAME',         'MENSAL', 'ng/dL',     0.7,   1.0,   1.5,    1.8, 'ng/dL'),
  ('EXAME_B12',       'Vitamina B12',               'EXAME',         'MENSAL', 'pg/mL',     200,   400,   700,    900, 'pg/mL'),
  ('EXAME_FERRO',     'Ferro sérico',               'EXAME',         'MENSAL', 'µg/dL',      40,    70,   140,    170, 'µg/dL'),
  ('EXAME_GLICEMIA',  'Glicemia jejum',             'EXAME',         'MENSAL', 'mg/dL',      70,    90,    99,    110, 'mg/dL'),
  ('EXAME_HBA1C',     'Hemoglobina glicada',        'EXAME',         'MENSAL', '%',         4.5,   5.6,   6.4,    7.0, '%'),
  ('EXAME_CT_TOTAL',  'Colesterol total',           'EXAME',         'MENSAL', 'mg/dL',     150,   180,   220,    240, 'mg/dL'),
  ('EXAME_HDL',       'HDL',                        'EXAME',         'MENSAL', 'mg/dL',      40,    50,    70,     90, 'mg/dL'),
  ('EXAME_LDL',       'LDL',                        'EXAME',         'MENSAL', 'mg/dL',     100,   130,   160,    190, 'mg/dL'),
  ('EXAME_TRIG',      'Triglicerídeos',             'EXAME',         'MENSAL', 'mg/dL',     100,   150,   200,    250, 'mg/dL'),
  ('EXAME_PCR',       'PCR ultrassensível',         'EXAME',         'MENSAL', 'mg/L',      0.5,   1.0,   3.0,   10.0, 'mg/L'),
  ('EXAME_CREAT',     'Creatinina',                 'EXAME',         'MENSAL', 'mg/dL',     0.6,   0.9,   1.2,    1.4, 'mg/dL'),
  ('EXAME_UREIA',     'Ureia',                      'EXAME',         'MENSAL', 'mg/dL',      15,    30,    45,     50, 'mg/dL'),
  ('EXAME_TGO',       'TGO/AST',                    'EXAME',         'MENSAL', 'U/L',         5,    20,    40,     50, 'U/L'),
  ('EXAME_TGP',       'TGP/ALT',                    'EXAME',         'MENSAL', 'U/L',         5,    25,    50,     65, 'U/L')
ON CONFLICT (codigo) DO UPDATE SET
  label=EXCLUDED.label,
  tipo=EXCLUDED.tipo,
  periodo=EXCLUDED.periodo,
  unidade_medida=EXCLUDED.unidade_medida,
  faixa_critica_max=EXCLUDED.faixa_critica_max,
  faixa_baixa_max=EXCLUDED.faixa_baixa_max,
  faixa_media_max=EXCLUDED.faixa_media_max,
  faixa_superior_max=EXCLUDED.faixa_superior_max,
  observacao=EXCLUDED.observacao,
  atualizado_em=now();

-- ============================================================
-- D) 90 dias de faturamento_diario simulado p/ as 5 clínicas
--    Usa fat_meta_mensal/30 como base + ruído + sazonalidade leve (fim de semana 30% mais fraco)
-- ============================================================
INSERT INTO faturamento_diario (
  unidade_id, data,
  valor_realizado, valor_previsto,
  consultas_realizadas, consultas_agendadas, procedimentos_realizados,
  ticket_medio, receitas_fama_count, comissao_magistral_estimada,
  pacientes_novos, pacientes_retorno, nps, taxa_ocupacao
)
SELECT
  u.id,
  (CURRENT_DATE - (g.dia || ' days')::interval)::date AS data,
  -- fim de semana 30% mais fraco
  ROUND(((u.fat_meta_mensal / 30.0)
         * (CASE WHEN extract(dow FROM (CURRENT_DATE - (g.dia || ' days')::interval)) IN (0,6) THEN 0.65 ELSE 1.0 END)
         * (0.78 + random() * 0.42))::numeric, 2)::numeric AS valor_realizado,
  ROUND((u.fat_meta_mensal / 30.0)::numeric, 2)::numeric AS valor_previsto,
  (CASE WHEN extract(dow FROM (CURRENT_DATE - (g.dia || ' days')::interval)) IN (0,6) THEN 4 ELSE 12 END
    + floor(random() * 14))::int AS consultas_realizadas,
  (CASE WHEN extract(dow FROM (CURRENT_DATE - (g.dia || ' days')::interval)) IN (0,6) THEN 6 ELSE 16 END
    + floor(random() * 10))::int AS consultas_agendadas,
  (3 + floor(random() * 12))::int AS procedimentos_realizados,
  ROUND((1100 + random() * 900)::numeric, 2)::numeric AS ticket_medio,
  (CASE WHEN extract(dow FROM (CURRENT_DATE - (g.dia || ' days')::interval)) IN (0,6) THEN 2 ELSE 8 END
    + floor(random() * 14))::int AS receitas_fama_count,
  ROUND((((u.fat_meta_mensal / 30.0) * 0.30) * (0.78 + random() * 0.42))::numeric, 2)::numeric AS comissao_magistral_estimada,
  (1 + floor(random() * 6))::int  AS pacientes_novos,
  (4 + floor(random() * 12))::int AS pacientes_retorno,
  ROUND((68 + random() * 25)::numeric, 1)::numeric AS nps,
  ROUND((55 + random() * 38)::numeric, 1)::numeric AS taxa_ocupacao
FROM unidades u
CROSS JOIN generate_series(0, 89) AS g(dia)
WHERE u.fat_meta_mensal > 0 AND u.id IN (1, 14, 16, 18, 19)
ON CONFLICT (unidade_id, data) DO NOTHING;

-- ============================================================
-- E) Snapshot KPI global inicial
-- ============================================================
INSERT INTO kpi_global_snapshot (
  total_clinicas, total_pacientes,
  fat_realizado_mes, fat_meta_total_mes, fat_minimo_total_mes, fat_maximo_total_mes,
  total_consultas_hoje, total_receitas_fama_mes, comissao_magistral_total
)
SELECT
  (SELECT COUNT(*) FROM unidades WHERE fat_meta_mensal > 0)::int,
  (SELECT COUNT(*) FROM pacientes WHERE status_ativo = true)::int,
  COALESCE((SELECT SUM(valor_realizado) FROM faturamento_diario WHERE data >= date_trunc('month', CURRENT_DATE)), 0),
  COALESCE((SELECT SUM(fat_meta_mensal) FROM unidades WHERE fat_meta_mensal > 0), 0),
  COALESCE((SELECT SUM(fat_minimo_mensal) FROM unidades WHERE fat_meta_mensal > 0), 0),
  COALESCE((SELECT SUM(fat_maximo_mensal) FROM unidades WHERE fat_meta_mensal > 0), 0),
  COALESCE((SELECT SUM(consultas_realizadas) FROM faturamento_diario WHERE data = CURRENT_DATE), 0)::int,
  COALESCE((SELECT SUM(receitas_fama_count) FROM faturamento_diario WHERE data >= date_trunc('month', CURRENT_DATE)), 0)::int,
  COALESCE((SELECT SUM(comissao_magistral_estimada) FROM faturamento_diario WHERE data >= date_trunc('month', CURRENT_DATE)), 0);

COMMIT;
