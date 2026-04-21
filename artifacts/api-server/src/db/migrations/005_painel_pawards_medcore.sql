-- Migration 005 — PAINEL PAWARDS MEDCORE
-- Onda: faturamento global, ranking clínicas, parâmetros referência editáveis (global + unidade), valor nos blocos.
-- IDEMPOTENTE. Tudo IF NOT EXISTS / IF EXISTS / ON CONFLICT.

-- ============================================================
-- 1) ALTER unidades: faixas de faturamento + comissão + slug
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='unidades' AND column_name='slug') THEN
    ALTER TABLE unidades ADD COLUMN slug text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='unidades' AND column_name='fat_minimo_mensal') THEN
    ALTER TABLE unidades ADD COLUMN fat_minimo_mensal numeric(12,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='unidades' AND column_name='fat_maximo_mensal') THEN
    ALTER TABLE unidades ADD COLUMN fat_maximo_mensal numeric(12,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='unidades' AND column_name='fat_meta_mensal') THEN
    ALTER TABLE unidades ADD COLUMN fat_meta_mensal numeric(12,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='unidades' AND column_name='percentual_comissao_magistral') THEN
    ALTER TABLE unidades ADD COLUMN percentual_comissao_magistral numeric(5,2) DEFAULT 30;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS unidades_slug_uniq ON unidades(slug) WHERE slug IS NOT NULL;

-- ============================================================
-- 2) ALTER formula_blend: valor BRL por blend
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='formula_blend' AND column_name='valor_brl') THEN
    ALTER TABLE formula_blend ADD COLUMN valor_brl numeric(10,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='formula_blend_ativo' AND column_name='valor_brl') THEN
    ALTER TABLE formula_blend_ativo ADD COLUMN valor_brl numeric(10,2);
  END IF;
END $$;

-- ============================================================
-- 3) Faturamento diário por clínica
-- ============================================================
CREATE TABLE IF NOT EXISTS faturamento_diario (
  id                          serial PRIMARY KEY,
  unidade_id                  integer NOT NULL REFERENCES unidades(id),
  data                        date NOT NULL,
  valor_realizado             numeric(12,2) NOT NULL DEFAULT 0,
  valor_previsto              numeric(12,2) NOT NULL DEFAULT 0,
  consultas_realizadas        integer NOT NULL DEFAULT 0,
  consultas_agendadas         integer NOT NULL DEFAULT 0,
  procedimentos_realizados    integer NOT NULL DEFAULT 0,
  ticket_medio                numeric(10,2) NOT NULL DEFAULT 0,
  receitas_fama_count         integer NOT NULL DEFAULT 0,
  comissao_magistral_estimada numeric(12,2) NOT NULL DEFAULT 0,
  pacientes_novos             integer NOT NULL DEFAULT 0,
  pacientes_retorno           integer NOT NULL DEFAULT 0,
  nps                         numeric(5,2),
  taxa_ocupacao               numeric(5,2),
  criado_em                   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unidade_id, data)
);
CREATE INDEX IF NOT EXISTS faturamento_diario_unidade_data_idx ON faturamento_diario(unidade_id, data DESC);
CREATE INDEX IF NOT EXISTS faturamento_diario_data_idx ON faturamento_diario(data DESC);

-- ============================================================
-- 4) KPI global snapshot (rolling, alimentado por job/endpoint)
-- ============================================================
CREATE TABLE IF NOT EXISTS kpi_global_snapshot (
  id                       serial PRIMARY KEY,
  snapshot_em              timestamptz NOT NULL DEFAULT now(),
  total_clinicas           integer NOT NULL DEFAULT 0,
  total_pacientes          integer NOT NULL DEFAULT 0,
  fat_realizado_mes        numeric(14,2) NOT NULL DEFAULT 0,
  fat_meta_total_mes       numeric(14,2) NOT NULL DEFAULT 0,
  fat_minimo_total_mes     numeric(14,2) NOT NULL DEFAULT 0,
  fat_maximo_total_mes     numeric(14,2) NOT NULL DEFAULT 0,
  media_nps                numeric(5,2),
  media_ocupacao           numeric(5,2),
  total_consultas_hoje     integer NOT NULL DEFAULT 0,
  total_receitas_fama_mes  integer NOT NULL DEFAULT 0,
  comissao_magistral_total numeric(14,2) NOT NULL DEFAULT 0,
  clinica_topo_id          integer,
  clinica_lanterna_id      integer
);

-- ============================================================
-- 5) Parâmetros de referência (faixas mín/máx editáveis)
--    Tipos: 'EXAME' | 'KPI_FINANCEIRO' | 'KPI_CLINICO'
--    Periodo: 'DIARIO' | 'SEMANAL' | 'MENSAL' (padrão MENSAL p/ KPIs)
-- ============================================================
CREATE TABLE IF NOT EXISTS parametros_referencia_global (
  id              serial PRIMARY KEY,
  codigo          text NOT NULL UNIQUE,
  label           text NOT NULL,
  tipo            text NOT NULL CHECK (tipo IN ('EXAME','KPI_FINANCEIRO','KPI_CLINICO')),
  periodo         text NOT NULL DEFAULT 'MENSAL' CHECK (periodo IN ('DIARIO','SEMANAL','MENSAL','ANUAL')),
  unidade_medida  text,
  faixa_critica_max numeric(12,2),
  faixa_baixa_max   numeric(12,2),
  faixa_media_max   numeric(12,2),
  faixa_superior_max numeric(12,2),
  observacao      text,
  ativo           boolean NOT NULL DEFAULT true,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parametros_referencia_unidade (
  id              serial PRIMARY KEY,
  parametro_codigo text NOT NULL REFERENCES parametros_referencia_global(codigo),
  unidade_id      integer NOT NULL REFERENCES unidades(id),
  faixa_critica_max numeric(12,2),
  faixa_baixa_max   numeric(12,2),
  faixa_media_max   numeric(12,2),
  faixa_superior_max numeric(12,2),
  observacao      text,
  atualizado_em   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parametro_codigo, unidade_id)
);

-- ============================================================
-- 6) Anastomose: PARMAVAULT depende de farmacias_parmavault (não existe)
-- ============================================================
INSERT INTO anastomoses_pendentes (
  modulo, criticidade, titulo, descricao, status, criado_em, atualizado_em
) VALUES (
  'PARMAVAULT', 'media',
  'Tabela farmacias_parmavault inexistente',
  'Endpoints /api/painel-pawards/parmavault/* dependem da tabela farmacias_parmavault e farmavault_receitas. Migrar de farmacias_parceiras quando definirmos o contrato. Por ora endpoints retornam 501.',
  'aberta', now(), now()
)
ON CONFLICT DO NOTHING;
