-- Migration 006 — TSUNAMI PAWARDS · Sangue real
-- Cria órgãos faltantes do tsunami Dr. Claude (PARMAVAULT + PARCLAIM)
-- Idempotente. NUNCA mexe em IDs existentes.

-- ============================================================
-- ÓRGÃO 1 — farmacias_parmavault
-- ============================================================
CREATE TABLE IF NOT EXISTS farmacias_parmavault (
  id                    serial PRIMARY KEY,
  nome_fantasia         text NOT NULL,
  razao_social          text,
  cnpj                  text,
  cidade                text,
  estado                text,
  meta_receitas_semana  int DEFAULT 0,
  meta_receitas_mes     int DEFAULT 0,
  meta_valor_mes        numeric(12,2) DEFAULT 0,
  percentual_comissao   numeric(5,2) DEFAULT 30.0,
  ativo                 boolean DEFAULT true,
  parceira_desde        date,
  criado_em             timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_farmacias_pmv_cnpj
  ON farmacias_parmavault(cnpj) WHERE cnpj IS NOT NULL;

-- ============================================================
-- ÓRGÃO 2 — parmavault_receitas
-- Receitas magistrais entregues/em-fluxo na farmácia parceira
-- ============================================================
CREATE TABLE IF NOT EXISTS parmavault_receitas (
  id                       serial PRIMARY KEY,
  farmacia_id              int NOT NULL REFERENCES farmacias_parmavault(id),
  unidade_id               int REFERENCES unidades(id),
  paciente_id              int REFERENCES pacientes(id),
  medico_id                int REFERENCES usuarios(id),
  prescricao_id            int REFERENCES prescricoes(id),
  numero_receita           text,
  emitida_em               timestamptz NOT NULL DEFAULT now(),
  entregue_em              timestamptz,
  status                   text NOT NULL DEFAULT 'emitida',  -- emitida | retirada | entregue | cancelada
  valor_formula_estimado   numeric(10,2) DEFAULT 0,
  valor_formula_real       numeric(10,2),
  comissao_estimada        numeric(10,2) DEFAULT 0,
  comissao_paga            boolean DEFAULT false,
  blend_id                 int REFERENCES formula_blend(id),
  criado_em                timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_pmv_receitas_farmacia_data
  ON parmavault_receitas(farmacia_id, entregue_em DESC);
CREATE INDEX IF NOT EXISTS ix_pmv_receitas_unidade_data
  ON parmavault_receitas(unidade_id, entregue_em DESC);
CREATE INDEX IF NOT EXISTS ix_pmv_receitas_status
  ON parmavault_receitas(status);

-- ============================================================
-- ÓRGÃO 3 — parclaim_metas_clinica
-- Metas de receitas magistrais por clínica × farmácia (PARCLAIM)
-- ============================================================
CREATE TABLE IF NOT EXISTS parclaim_metas_clinica (
  id                       serial PRIMARY KEY,
  unidade_id               int NOT NULL REFERENCES unidades(id),
  farmacia_id              int REFERENCES farmacias_parmavault(id),
  receitas_minimas_semana  int DEFAULT 0,
  receitas_meta_semana     int DEFAULT 0,
  valor_minimo_semana      numeric(10,2) DEFAULT 0,
  valor_meta_semana        numeric(10,2) DEFAULT 0,
  ativo                    boolean DEFAULT true,
  criado_em                timestamptz DEFAULT now(),
  UNIQUE (unidade_id, farmacia_id)
);
