-- ============================================================================
-- Migration 021 — Wave 5 PARMAVAULT-TSUNAMI Opção 3 (MVP Reconciliação + A2)
-- Aditiva: psql IF NOT EXISTS, REGRA FERRO (zero db:push).
-- 4 tabelas novas + ajuste de NULL em parmavault_receitas.comissao_estimada.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Permitir NULL em comissao_estimada (hoje default 0).
--    Necessário pro caso "sem_valor_base" do job retroativo.
-- ----------------------------------------------------------------------------
ALTER TABLE parmavault_receitas
  ALTER COLUMN comissao_estimada DROP DEFAULT;

ALTER TABLE parmavault_receitas
  ALTER COLUMN comissao_estimada DROP NOT NULL;

-- Coluna de rastreio de origem do cálculo (job retroativo, hook, manual).
ALTER TABLE parmavault_receitas
  ADD COLUMN IF NOT EXISTS comissao_estimada_origem text;

ALTER TABLE parmavault_receitas
  ADD COLUMN IF NOT EXISTS comissao_estimada_em timestamptz;

-- ----------------------------------------------------------------------------
-- 2) parmavault_emissao_warnings — A2 rastreia avisos disparados na emissão.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parmavault_emissao_warnings (
  id                       serial PRIMARY KEY,
  prescricao_id            integer REFERENCES prescricoes(id),
  bloco_id                 integer REFERENCES prescricao_blocos(id),
  unidade_id               integer REFERENCES unidades(id),
  farmacia_id              integer REFERENCES farmacias_parmavault(id),
  motivo                   text NOT NULL,
  detectado_em             timestamptz NOT NULL DEFAULT now(),
  detectado_por_usuario_id integer REFERENCES usuarios(id),
  decidido_em              timestamptz,
  decidido_por_usuario_id  integer REFERENCES usuarios(id),
  decisao                  text,
  observacoes              text
);

CREATE INDEX IF NOT EXISTS ix_pmv_warnings_farmacia_data
  ON parmavault_emissao_warnings (farmacia_id, detectado_em DESC);

CREATE INDEX IF NOT EXISTS ix_pmv_warnings_unidade_data
  ON parmavault_emissao_warnings (unidade_id, detectado_em DESC);

-- ----------------------------------------------------------------------------
-- 3) parmavault_declaracoes_farmacia — declarações da farmácia (CSV/manual).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parmavault_declaracoes_farmacia (
  id                    serial PRIMARY KEY,
  receita_id            integer NOT NULL REFERENCES parmavault_receitas(id),
  farmacia_id           integer NOT NULL REFERENCES farmacias_parmavault(id),
  valor_pago_paciente   numeric(10,2) NOT NULL,
  data_compra           date,
  fonte                 text NOT NULL CHECK (fonte IN ('manual','csv','api')),
  declarado_em          timestamptz NOT NULL DEFAULT now(),
  declarado_por_usuario_id integer REFERENCES usuarios(id),
  observacoes           text,
  -- idempotência: a mesma receita declarada pela mesma farmácia (último vence
  -- por updated, mas o PK aqui é por linha pra preservar histórico).
  ativo                 boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS ix_pmv_decl_receita
  ON parmavault_declaracoes_farmacia (receita_id);

CREATE INDEX IF NOT EXISTS ix_pmv_decl_farmacia_data
  ON parmavault_declaracoes_farmacia (farmacia_id, declarado_em DESC);

-- ----------------------------------------------------------------------------
-- 4) parmavault_repasses — entradas reais de dinheiro registradas pelo CEO.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parmavault_repasses (
  id                serial PRIMARY KEY,
  farmacia_id       integer NOT NULL REFERENCES farmacias_parmavault(id),
  ano_mes           text NOT NULL,           -- 'YYYY-MM'
  valor_repasse     numeric(12,2) NOT NULL,
  data_recebido     date NOT NULL,
  evidencia_texto   text,
  registrado_em     timestamptz NOT NULL DEFAULT now(),
  registrado_por_usuario_id integer REFERENCES usuarios(id),
  observacoes       text,
  ativo             boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS ix_pmv_repasses_farmacia_anomes
  ON parmavault_repasses (farmacia_id, ano_mes);

-- ----------------------------------------------------------------------------
-- 5) parmavault_relatorios_gerados — snapshot imutável dos PDFs/Excels.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parmavault_relatorios_gerados (
  id                          serial PRIMARY KEY,
  farmacia_id                 integer NOT NULL REFERENCES farmacias_parmavault(id),
  periodo_inicio              date NOT NULL,
  periodo_fim                 date NOT NULL,
  protocolo_hash              text NOT NULL UNIQUE,
  gerado_em                   timestamptz NOT NULL DEFAULT now(),
  gerado_por_usuario_id       integer REFERENCES usuarios(id),
  percentual_comissao_snapshot numeric(5,2) NOT NULL,
  total_previsto_snapshot     numeric(12,2) NOT NULL DEFAULT 0,
  total_declarado_snapshot    numeric(12,2) NOT NULL DEFAULT 0,
  total_recebido_snapshot     numeric(12,2) NOT NULL DEFAULT 0,
  total_gap_snapshot          numeric(12,2) NOT NULL DEFAULT 0,
  total_receitas              integer NOT NULL DEFAULT 0,
  pdf_path                    text,
  excel_path                  text,
  observacoes                 text
);

CREATE INDEX IF NOT EXISTS ix_pmv_rel_farmacia_periodo
  ON parmavault_relatorios_gerados (farmacia_id, periodo_inicio DESC);
