-- =====================================================================
-- MIGRATION 011 · ANALYTICS MULTIPLANAR (Onda PARMASUPRA · 22/abr/2026)
-- =====================================================================
-- IDEMPOTENTE. Aplicada via psql direto (regra ferro: SEM db:push).
--
-- 2 tabelas pra cálculo de variação % entre períodos (filosofia Mike Tyson
-- 20 anos × Éder Jofre +1000% em 5 anos: o que importa é a EVOLUÇÃO, não
-- o número absoluto).
--
--  1) analytics_clinica_mes   — snapshot fechado mensal por unidade
--  2) analytics_snapshots     — snapshots agregados livres (jsonb) pra
--                               futuras dimensões (farmácia, blend, médico).
--
-- POPULATE RETROATIVO: 6 meses sintéticos terminando nos valores reais
-- de abril/2026 (curva crescente — todas as parceiras na mesma direção,
-- mas com VELOCIDADES diferentes pra que o comparativo seja interessante).
-- =====================================================================

BEGIN;

-- =====================================================================
-- TABELA 1 · analytics_clinica_mes
-- =====================================================================
CREATE TABLE IF NOT EXISTS analytics_clinica_mes (
  id                BIGSERIAL PRIMARY KEY,
  unidade_id        INTEGER NOT NULL REFERENCES unidades(id) ON DELETE RESTRICT,
  ano_mes           CHAR(7) NOT NULL,                  -- formato YYYY-MM
  faturamento_brl   NUMERIC(14,2) NOT NULL DEFAULT 0,  -- soma valor_formula_real
  comissao_brl      NUMERIC(14,2) NOT NULL DEFAULT 0,  -- soma comissao_estimada
  receitas_count    INTEGER NOT NULL DEFAULT 0,
  pacientes_unicos  INTEGER NOT NULL DEFAULT 0,
  blends_distintos  INTEGER NOT NULL DEFAULT 0,
  ticket_medio_brl  NUMERIC(12,2) NOT NULL DEFAULT 0,
  origem            VARCHAR(20) NOT NULL DEFAULT 'sintetico_seed',  -- 'real_query' | 'sintetico_seed'
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT analytics_clinica_mes_uniq UNIQUE (unidade_id, ano_mes)
);

CREATE INDEX IF NOT EXISTS idx_analytics_clinica_mes_periodo ON analytics_clinica_mes(ano_mes);
CREATE INDEX IF NOT EXISTS idx_analytics_clinica_mes_unidade  ON analytics_clinica_mes(unidade_id);

COMMENT ON TABLE analytics_clinica_mes IS
'Snapshot fechado mensal por unidade. Base de TODOS os comparativos do /admin/analytics.
Onda PARMASUPRA 22/abr/2026.';
COMMENT ON COLUMN analytics_clinica_mes.origem IS
'real_query = recalculado a partir de parmavault_receitas; sintetico_seed = gerado pra demo do analytics.';

-- =====================================================================
-- TABELA 2 · analytics_snapshots (jsonb livre, futuro)
-- =====================================================================
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id            BIGSERIAL PRIMARY KEY,
  dimensao      VARCHAR(40) NOT NULL,    -- 'clinica' | 'farmacia' | 'blend' | 'medico'
  dimensao_id   INTEGER NOT NULL,
  ano_mes       CHAR(7)  NOT NULL,
  metricas      JSONB    NOT NULL DEFAULT '{}'::jsonb,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT analytics_snapshots_uniq UNIQUE (dimensao, dimensao_id, ano_mes)
);

CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_dim    ON analytics_snapshots(dimensao);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_periodo ON analytics_snapshots(ano_mes);

-- =====================================================================
-- POPULATE 1 · Mês corrente (abril/2026) com dados REAIS de parmavault
-- =====================================================================
INSERT INTO analytics_clinica_mes
  (unidade_id, ano_mes, faturamento_brl, comissao_brl, receitas_count, pacientes_unicos, blends_distintos, ticket_medio_brl, origem)
SELECT
  pr.unidade_id,
  to_char(pr.criado_em, 'YYYY-MM') AS ano_mes,
  COALESCE(SUM(COALESCE(pr.valor_formula_real, pr.valor_formula_estimado)), 0)::numeric(14,2) AS faturamento_brl,
  COALESCE(SUM(pr.comissao_estimada), 0)::numeric(14,2) AS comissao_brl,
  COUNT(*)::int AS receitas_count,
  COUNT(DISTINCT pr.paciente_id)::int AS pacientes_unicos,
  COUNT(DISTINCT pr.blend_id)::int AS blends_distintos,
  COALESCE(AVG(COALESCE(pr.valor_formula_real, pr.valor_formula_estimado)), 0)::numeric(12,2) AS ticket_medio_brl,
  'real_query'
FROM parmavault_receitas pr
WHERE to_char(pr.criado_em, 'YYYY-MM') = '2026-04'
GROUP BY pr.unidade_id, to_char(pr.criado_em, 'YYYY-MM')
ON CONFLICT (unidade_id, ano_mes) DO UPDATE SET
  faturamento_brl  = EXCLUDED.faturamento_brl,
  comissao_brl     = EXCLUDED.comissao_brl,
  receitas_count   = EXCLUDED.receitas_count,
  pacientes_unicos = EXCLUDED.pacientes_unicos,
  blends_distintos = EXCLUDED.blends_distintos,
  ticket_medio_brl = EXCLUDED.ticket_medio_brl,
  origem           = 'real_query',
  atualizado_em    = now();

-- =====================================================================
-- POPULATE 2 · 5 meses anteriores SINTÉTICOS com curva crescente.
--
-- Filosofia: cada unidade tem uma VELOCIDADE de crescimento diferente
-- pra que o comparativo seja rico (não é só "todo mundo cresceu o mesmo").
-- Velocidade = fator final (1.0 = abril) baseado no id da unidade,
-- pra parecer aleatório mas ser deterministico/reproduzível.
--
-- Curva: cada mês passado é (1 - 0.07*N*velocidade) do valor atual,
-- com leve ruído sazonal de ±5%.
-- =====================================================================

WITH meses(ano_mes, n) AS (
  -- 5 meses ANTES de abril/2026 (nov/2025 a mar/2026)
  VALUES
    ('2025-11', 5),
    ('2025-12', 4),
    ('2026-01', 3),
    ('2026-02', 2),
    ('2026-03', 1)
),
base AS (
  -- pega o real de abril 2026 como ANCORA
  SELECT * FROM analytics_clinica_mes WHERE ano_mes = '2026-04'
),
sazonalidade AS (
  -- perturba cada (unidade,mes) com pseudo-aleatorio reproduzivel
  SELECT
    b.unidade_id,
    m.ano_mes,
    m.n,
    -- velocidade entre 0.06 (cresce devagar) e 0.12 (cresce rapido) por unidade
    (0.06 + (b.unidade_id % 7) * 0.01)::numeric AS velocidade,
    -- ruido +-5% deterministico baseado em hash(unidade,mes)
    (1 + (((hashtext(b.unidade_id::text || m.ano_mes) % 100) / 1000.0)))::numeric AS ruido,
    b.faturamento_brl,
    b.comissao_brl,
    b.receitas_count,
    b.pacientes_unicos,
    b.blends_distintos
  FROM base b CROSS JOIN meses m
)
INSERT INTO analytics_clinica_mes
  (unidade_id, ano_mes, faturamento_brl, comissao_brl, receitas_count, pacientes_unicos, blends_distintos, ticket_medio_brl, origem)
SELECT
  s.unidade_id,
  s.ano_mes,
  GREATEST(0, (s.faturamento_brl  * (1 - s.velocidade * s.n) * s.ruido))::numeric(14,2),
  GREATEST(0, (s.comissao_brl     * (1 - s.velocidade * s.n) * s.ruido))::numeric(14,2),
  GREATEST(0, (s.receitas_count   * (1 - s.velocidade * s.n) * s.ruido))::int,
  GREATEST(0, (s.pacientes_unicos * (1 - s.velocidade * s.n) * s.ruido))::int,
  s.blends_distintos,  -- catalogo nao depende do volume
  CASE WHEN s.receitas_count > 0
       THEN ((s.faturamento_brl * (1 - s.velocidade * s.n)) / s.receitas_count)::numeric(12,2)
       ELSE 0
  END,
  'sintetico_seed'
FROM sazonalidade s
ON CONFLICT (unidade_id, ano_mes) DO UPDATE SET
  faturamento_brl  = EXCLUDED.faturamento_brl,
  comissao_brl     = EXCLUDED.comissao_brl,
  receitas_count   = EXCLUDED.receitas_count,
  pacientes_unicos = EXCLUDED.pacientes_unicos,
  ticket_medio_brl = EXCLUDED.ticket_medio_brl,
  atualizado_em    = now();

COMMIT;

-- VERIFICACAO POS-MIGRATION
SELECT '== analytics_clinica_mes ==' AS bloco;
SELECT ano_mes,
       count(distinct unidade_id) AS clinicas,
       sum(faturamento_brl)::numeric(14,2) AS fat_total,
       sum(receitas_count) AS receitas
FROM analytics_clinica_mes
GROUP BY ano_mes ORDER BY ano_mes;

SELECT '== variacao mes-a-mes (consolidado) ==' AS bloco;
WITH agg AS (
  SELECT ano_mes, sum(faturamento_brl)::numeric AS fat
  FROM analytics_clinica_mes GROUP BY ano_mes
)
SELECT
  ano_mes,
  fat,
  ROUND( (fat / NULLIF(LAG(fat) OVER (ORDER BY ano_mes), 0) - 1) * 100, 2) AS var_pct
FROM agg ORDER BY ano_mes;
