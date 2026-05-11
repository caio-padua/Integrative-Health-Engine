-- 038 · Wave 10.7 · Tipo de transicao no alerta CEO (piora/melhora)
--
-- Por que existe:
--   Ate hoje o worker `alertaAssinaturasCEO` so disparava no caminho
--   bom->critico (piora). Quando o quadro normalizava (rejeicoes caiam,
--   conversao subia), o Caio nao recebia nada e ficava achando que ainda
--   estava em crise. Esta migration habilita o segundo lado da transicao:
--   critico->bom/excelente, com tom "respira aliviado".
--
-- Aditiva, idempotente. Recria UNIQUE incluindo tipo_transicao pra que no
-- mesmo dia caibam ate 2 linhas por metrica (1 piora + 1 melhora).
ALTER TABLE alertas_ceo_assinaturas
  ADD COLUMN IF NOT EXISTS tipo_transicao TEXT NOT NULL DEFAULT 'piora'
  CHECK (tipo_transicao IN ('piora','melhora'));

ALTER TABLE alertas_ceo_assinaturas
  DROP CONSTRAINT IF EXISTS alertas_ceo_assinaturas_uniq;

ALTER TABLE alertas_ceo_assinaturas
  ADD CONSTRAINT alertas_ceo_assinaturas_uniq
  UNIQUE (dia_brt, metrica, tipo_transicao);
