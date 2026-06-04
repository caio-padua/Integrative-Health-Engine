-- Migration 080 — substancias: classificacao multi-eixo de ativos/materias-primas
-- REGRA FERRO: psql IF NOT EXISTS aditivo, ZERO db:push, ZERO DROP/DELETE.
--
-- Contexto: proposta docs/dr-replit/PROPOSTAS/26.06.04_CADASTRO_MATERIAS_PRIMAS_
-- CLASSIFICACAO_ATIVOS.md. Caio pediu cadastro geral de materias-primas com
-- classificacao em 3 eixos (Natureza / Funcao Objetivo / Finalidade), faixa de
-- dose (min/max; dose_padrao ja existente = dose media usual), potencia 1-5 e
-- eficacia 1-5 (REUSA classificacao_estrelas — decisao D003=A, nenhuma coluna nova
-- de eficacia). A COR vem da Natureza (D002=Sim) e usa a coluna `cor` ja existente.
--
-- Esta migration apenas ADICIONA colunas. Nenhuma coluna antiga e tocada.
-- A coluna `categoria` (texto livre) permanece autoritativa; `natureza_ativo`
-- e o eixo 1 estruturado (exclusivo). Funcao/Finalidade sao multi-valor (text[]).

ALTER TABLE substancias
  ADD COLUMN IF NOT EXISTS natureza_ativo   text,
  ADD COLUMN IF NOT EXISTS funcoes_objetivo text[],
  ADD COLUMN IF NOT EXISTS finalidades      text[],
  ADD COLUMN IF NOT EXISTS dose_minima      text,
  ADD COLUMN IF NOT EXISTS dose_maxima      text,
  ADD COLUMN IF NOT EXISTS potencia         integer,
  ADD COLUMN IF NOT EXISTS origem_dado      text NOT NULL DEFAULT 'OPERADOR';

-- Potencia restrita a 1..5 (CHECK aceita NULL). Idempotente via DO block,
-- pois Postgres nao suporta ADD CONSTRAINT IF NOT EXISTS.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'substancias_potencia_1a5'
  ) THEN
    ALTER TABLE substancias
      ADD CONSTRAINT substancias_potencia_1a5
      CHECK (potencia IS NULL OR (potencia BETWEEN 1 AND 5));
  END IF;
END $$;

COMMENT ON COLUMN substancias.natureza_ativo IS
  'Eixo 1 — Natureza/origem do ativo (EXCLUSIVO): Fitoterapico, Hormonio, '
  'Sintetico, Nutraceutico, Mineral/Aminoacido. Define a COR (coluna cor). '
  'Coluna categoria (texto livre) permanece. Migration 080 - 04/jun/2026.';
COMMENT ON COLUMN substancias.funcoes_objetivo IS
  'Eixo 2 — Funcao objetivo (MULTI, editavel D004=B). Ex: Modulador Hormonal, '
  'Adaptogeno, Termogenico/Lipolitico, Neurotransmissor, Despigmentante.';
COMMENT ON COLUMN substancias.finalidades IS
  'Eixo 3 — Finalidade do tratamento (MULTI). Ex: Preventiva, Curativa, '
  'Paliativa/Suporte, Estetica.';
COMMENT ON COLUMN substancias.dose_minima IS 'Faixa de dose — minima. dose_padrao = dose media usual.';
COMMENT ON COLUMN substancias.dose_maxima IS 'Faixa de dose — maxima. dose_padrao = dose media usual.';
COMMENT ON COLUMN substancias.potencia IS 'Potencia 1-5 (forca de acao). Eficacia REUSA classificacao_estrelas (D003=A).';
COMMENT ON COLUMN substancias.origem_dado IS
  'Procedencia do dado: OPERADOR | SEED_RASCUNHO | PLANILHA | VALIDADO_MEDICO. '
  'SEED_RASCUNHO exige validacao medica do Caio antes de virar verdade clinica.';
