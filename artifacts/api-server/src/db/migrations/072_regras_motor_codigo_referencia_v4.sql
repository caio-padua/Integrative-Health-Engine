-- Migration 072 — regras_motor: codigo_referencia_v4 (Caminho B — V13 intacto)
-- REGRA FERRO: psql IF NOT EXISTS aditivo, ZERO db:push, ZERO DROP/DELETE.
--
-- Contexto: docs/dr-claude/08 e 11 e 12 mapearam que o motor de sinapses
-- precisa migrar do codigo_referencia V13 (ex: "EXAM TIRE BASI 001") para o
-- codigo V4.0 com nick B4 (ex: "EXAM TIRE GBAS TSHX 0001"). Caminho B do
-- Dr. Claude: a coluna antiga NUNCA e removida, V13 continua autoritativo
-- ate Caio aprovar o swap. As 37 regras existentes seguem funcionando.
--
-- Esta migration apenas ADICIONA a coluna nova vazia + indice condicional
-- (espelho exato da migration 025 que ja fez o mesmo pra parametros_referencia_
-- global e analitos_catalogo). O preenchimento dela e feito por UPSERTs
-- subsequentes (Sprint 4 do plano consolidado — bridge V13->V4 das 11 regras
-- legadas + Sprint 5 — UPSERT de ~80 regras novas).

ALTER TABLE regras_motor
  ADD COLUMN IF NOT EXISTS codigo_referencia_v4 text;

-- Indice condicional: so indexa as linhas ja migradas pra V4. Mesmo padrao
-- de ix_prg_codigo_semantico_v4 / ix_analitos_codigo_semantico_v4 da 025.
CREATE INDEX IF NOT EXISTS ix_regras_motor_codigo_referencia_v4
  ON regras_motor(codigo_referencia_v4)
  WHERE codigo_referencia_v4 IS NOT NULL;

-- Comentario de documentacao na coluna (registra historico semantico):
COMMENT ON COLUMN regras_motor.codigo_referencia_v4 IS
  'Codigo V4.0 (B1 B2 B3 B4 SEQ) - bridge aditivo. Coluna codigo_referencia '
  '(V13) permanece autoritativa ate decisao Caio/Dr.Claude (Caminho B). '
  'Doc: docs/dr-claude/11 §3.2 + 12 §5 Sprint B2. Migration 072 - 17/mai/2026.';
