-- ════════════════════════════════════════════════════════════════════
-- PARMAVAULT-TSUNAMI Wave 5 · Migration 020 · Onda 1
-- Schema rico de regras de roteamento + tabela de métricas mensais
-- + pool expandido de farmácias parceiras (cotação sólida).
--
-- 100% aditiva, IF NOT EXISTS. ZERO db:push. REGRA FERRO respeitada.
-- ════════════════════════════════════════════════════════════════════

-- ─── 1. Estende farmacias_parmavault com regras de roteamento ──────
ALTER TABLE farmacias_parmavault
  ADD COLUMN IF NOT EXISTS nivel_exclusividade   TEXT    NOT NULL DEFAULT 'parceira',
  ADD COLUMN IF NOT EXISTS disponivel_manual     BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS acionavel_por_criterio BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS cota_pct_max          NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS cota_receitas_max_mes INTEGER,
  ADD COLUMN IF NOT EXISTS prioridade            INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS aceita_blocos_tipos   TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS observacoes_roteamento TEXT,
  ADD COLUMN IF NOT EXISTS atualizado_em         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- CHECK (idempotente via DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_farmacias_pmv_nivel_excl') THEN
    ALTER TABLE farmacias_parmavault
      ADD CONSTRAINT ck_farmacias_pmv_nivel_excl
      CHECK (nivel_exclusividade IN ('parceira','preferencial','exclusiva','piloto','backup'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_farmacias_pmv_cota_pct') THEN
    ALTER TABLE farmacias_parmavault
      ADD CONSTRAINT ck_farmacias_pmv_cota_pct
      CHECK (cota_pct_max IS NULL OR (cota_pct_max >= 0 AND cota_pct_max <= 100));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS ix_farmacias_pmv_roteamento
  ON farmacias_parmavault (ativo, acionavel_por_criterio, prioridade);

COMMENT ON COLUMN farmacias_parmavault.nivel_exclusividade IS
  'parceira|preferencial|exclusiva|piloto|backup. Exclusiva ganha de tudo no roteador.';
COMMENT ON COLUMN farmacias_parmavault.disponivel_manual IS
  'Se TRUE aparece no dropdown manual do medico.';
COMMENT ON COLUMN farmacias_parmavault.acionavel_por_criterio IS
  'Se TRUE entra no roteador automatico. FALSE = so manual.';
COMMENT ON COLUMN farmacias_parmavault.cota_pct_max IS
  'Limite % das emissoes do mes corrente. NULL = ilimitado.';
COMMENT ON COLUMN farmacias_parmavault.cota_receitas_max_mes IS
  'Teto absoluto de receitas/mes. NULL = ilimitado.';
COMMENT ON COLUMN farmacias_parmavault.prioridade IS
  'Menor numero = mais alta. Default 100. Ex: exclusiva 1, preferencial 50.';
COMMENT ON COLUMN farmacias_parmavault.aceita_blocos_tipos IS
  'Tipos de bloco que essa farmacia atende. Array vazio = aceita tudo.';

-- ─── 2. Tabela de métricas mensais (pra cota_pct_max) ──────────────
CREATE TABLE IF NOT EXISTS farmacias_emissao_metricas_mes (
  id              SERIAL PRIMARY KEY,
  farmacia_id     INTEGER NOT NULL REFERENCES farmacias_parmavault(id),
  ano_mes         CHAR(7) NOT NULL,                      -- '2026-04'
  qtd_emissoes    INTEGER NOT NULL DEFAULT 0,
  valor_total     NUMERIC(14,2) NOT NULL DEFAULT 0,
  atualizado_em   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_femm_farmacia_mes
  ON farmacias_emissao_metricas_mes (farmacia_id, ano_mes);
CREATE INDEX IF NOT EXISTS ix_femm_ano_mes
  ON farmacias_emissao_metricas_mes (ano_mes);

COMMENT ON TABLE farmacias_emissao_metricas_mes IS
  'Wave 5 onda 1: agregado mensal de emissoes por farmacia. Alimenta '
  'cota_pct_max no roteador. Atualizada via trigger ou job em A2.';

-- ─── 3. Pool expandido (5 farmacias novas pra cotacao solida) ──────
-- CNPJs ficticios formato valido. Caio ajusta via UI quando reais chegarem.
INSERT INTO farmacias_parmavault
  (nome_fantasia, razao_social, cnpj, cidade, estado,
   nivel_exclusividade, disponivel_manual, acionavel_por_criterio,
   cota_pct_max, cota_receitas_max_mes, prioridade, aceita_blocos_tipos,
   observacoes_roteamento, ativo, parceira_desde, percentual_comissao)
VALUES
  ('Galena Manipulação',          'Galena Farmácia de Manipulação Ltda',          '99000001000101', 'São Paulo',     'SP',
   'preferencial', TRUE, TRUE, 25.00, NULL, 50, ARRAY['formula_oral','topico'],
   'Pool Wave 5 — preferencial fórmulas e tópicos', TRUE, NULL, 30.0),

  ('Pharmacore Premium',          'Pharmacore Manipulação Premium S/A',           '99000002000102', 'Rio de Janeiro','RJ',
   'parceira',     TRUE, TRUE, 20.00, NULL, 80, ARRAY['formula_oral','injetavel'],
   'Pool Wave 5 — parceira RJ',                    TRUE, NULL, 30.0),

  ('Lemos Manipulação',           'Lemos Farmácia Magistral Ltda',                '99000003000103', 'Belo Horizonte','MG',
   'backup',       TRUE, TRUE, 10.00, NULL, 200, ARRAY['formula_oral'],
   'Pool Wave 5 — backup capacidade',              TRUE, NULL, 30.0),

  ('Botica Magistral Premium',    'Botica Magistral Premium SP Ltda',             '99000004000104', 'Campinas',      'SP',
   'preferencial', TRUE, TRUE, 25.00, NULL, 60, ARRAY['injetavel','implante'],
   'Pool Wave 5 — especialista injetavel/implante', TRUE, NULL, 30.0),

  ('Essentia Pharma',             'Essentia Manipulação Especializada Ltda',      '99000005000105', 'Curitiba',      'PR',
   'piloto',       TRUE, TRUE, 15.00, NULL, 90, ARRAY[]::TEXT[],
   'Pool Wave 5 — piloto, aceita todos blocos',    TRUE, NULL, 30.0)
ON CONFLICT (cnpj) WHERE cnpj IS NOT NULL DO NOTHING;
