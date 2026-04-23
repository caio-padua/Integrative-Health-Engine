-- Migration 025 — Bridge codigos_semanticos V4.0 (Dr. Claude · Opção A)
-- REGRA FERRO: psql IF NOT EXISTS aditivo, ZERO db:push, ZERO DROP/DELETE.
--
-- Liga parametros_referencia_global e analitos_catalogo a codigos_semanticos (V4.0)
-- para que o motor de classificação encontre faixa integrativa a partir do nome
-- vindo do OCR do laudo (ex: "Testosterona Total" -> EXAM HORM TOTL TEST 0001).

ALTER TABLE parametros_referencia_global
  ADD COLUMN IF NOT EXISTS codigo_semantico_v4 text
  REFERENCES codigos_semanticos(codigo);

ALTER TABLE analitos_catalogo
  ADD COLUMN IF NOT EXISTS codigo_semantico_v4 text
  REFERENCES codigos_semanticos(codigo);

CREATE INDEX IF NOT EXISTS ix_prg_codigo_semantico_v4
  ON parametros_referencia_global(codigo_semantico_v4)
  WHERE codigo_semantico_v4 IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_analitos_codigo_semantico_v4
  ON analitos_catalogo(codigo_semantico_v4)
  WHERE codigo_semantico_v4 IS NOT NULL;
