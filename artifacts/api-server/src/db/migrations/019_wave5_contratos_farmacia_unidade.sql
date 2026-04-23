-- ════════════════════════════════════════════════════════════════════
-- PARMAVAULT-TSUNAMI Wave 5 · Migration 019 · Frente A1
-- Contratos de parceria UNIDADE ↔ FARMÁCIA PARMAVAULT.
--
-- Objetivo: catalogar quais unidades têm contrato vigente com quais
-- farmácias parmavault. Habilita a validação CNPJ unidade↔prescrição
-- (frente A2 — warning visível, não bloqueia 30 dias).
--
-- Decisão Dr. Claude: tabela VAZIA + UI primeiro. Caio semeia os 9
-- pares (3 unidades × 3 farmácias) manualmente, evitando assumir
-- parceria errada no banco.
--
-- 100% aditiva, IF NOT EXISTS, REGRA FERRO respeitada. Zero risco
-- de drift mesmo se rodar 2x.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS farmacias_unidades_contrato (
  id                     SERIAL PRIMARY KEY,
  unidade_id             INTEGER NOT NULL REFERENCES unidades(id),
  farmacia_id            INTEGER NOT NULL REFERENCES farmacias_parmavault(id),
  tipo_relacao           TEXT    NOT NULL DEFAULT 'parceira',
  ativo                  BOOLEAN NOT NULL DEFAULT TRUE,
  vigencia_inicio        DATE    NOT NULL DEFAULT CURRENT_DATE,
  vigencia_fim           DATE,
  observacoes            TEXT,
  criado_em              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por_usuario_id  INTEGER
);

-- UNIQUE parcial: só impede DUPLICAR PAR ATIVO. Se o par for desativado
-- (ativo=false), pode reativar criando nova entrada (histórico preservado).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_fuc_par_ativo
  ON farmacias_unidades_contrato (unidade_id, farmacia_id)
  WHERE ativo = TRUE;

-- Lookups rápidos pelo helper validarContratoFarmaciaUnidade
CREATE INDEX IF NOT EXISTS ix_fuc_unidade_ativo
  ON farmacias_unidades_contrato (unidade_id, ativo);

CREATE INDEX IF NOT EXISTS ix_fuc_farmacia_ativo
  ON farmacias_unidades_contrato (farmacia_id, ativo);

COMMENT ON TABLE  farmacias_unidades_contrato IS
  'Wave 5 frente A: contratos vigentes UNIDADE x FARMACIA_PARMAVAULT. '
  'Habilita validacao CNPJ na rota de emissao de prescricao. '
  'Modo B (warning, nao bloqueia) ate baseline 30d ser validado.';

COMMENT ON COLUMN farmacias_unidades_contrato.tipo_relacao IS
  'parceira | preferencial | exclusiva | piloto. Default parceira.';

COMMENT ON COLUMN farmacias_unidades_contrato.vigencia_fim IS
  'NULL = sem fim definido (contrato continuo). Data = vigencia limitada.';
