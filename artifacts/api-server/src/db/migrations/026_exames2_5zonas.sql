-- ============================================================
-- Migration 026 — EXAMES-2 5 zonas + nomes proprios Caio
-- REGRA FERRO: 100% aditiva, IF NOT EXISTS, ON CONFLICT DO NOTHING.
-- Dr. Replit (autonomia confirmada por Caio + Dr. Claude).
-- ============================================================

-- ----------------------------------------------------------------
-- BLOCO 1: 8 codes V4.0 novos pros 15 PRG pendentes
-- (Defesa semantica Dr. Replit usando bagagem do projeto)
-- HEMO != HEMG (HEMG ja existe como HEMOGRAMA, exame composto).
-- GGTP nao recriado: ja existe como "GAMA GT", reuso direto.
-- ----------------------------------------------------------------
INSERT INTO codigos_semanticos
  (codigo, tipo, procedimento_ou_significado, b1, b2, b3, b4, seq, tabela_origem, nome_referencia)
VALUES
  ('EXAM CARD GBAS HDLX 0001','EXAME','HDL Colesterol (lipoproteina alta densidade)','EXAM','CARD','GBAS','HDLX','0001','exames_base','HDL'),
  ('EXAM CARD GBAS LDLX 0001','EXAME','LDL Colesterol (lipoproteina baixa densidade)','EXAM','CARD','GBAS','LDLX','0001','exames_base','LDL'),
  ('EXAM CARD GBAS TRIG 0001','EXAME','Triglicerides sericos','EXAM','CARD','GBAS','TRIG','0001','exames_base','TRIGLICERIDES'),
  ('EXAM BINT GBAS HTCR 0001','EXAME','Hematocrito (volume globular)','EXAM','BINT','GBAS','HTCR','0001','exames_base','HEMATOCRITO'),
  ('EXAM BINT GBAS HEMO 0001','EXAME','Hemoglobina (analito isolado, distinto do hemograma completo)','EXAM','BINT','GBAS','HEMO','0001','exames_base','HEMOGLOBINA'),
  ('EXAM BINT GBAS URCA 0001','EXAME','Acido Urico serico','EXAM','BINT','GBAS','URCA','0001','exames_base','ACIDO URICO'),
  ('EXAM MINE GBAS POTA 0001','EXAME','Potassio serico','EXAM','MINE','GBAS','POTA','0001','exames_base','POTASSIO'),
  ('EXAM ENDO GBAS IGF1 0001','EXAME','IGF-1 / Somatomedina C','EXAM','ENDO','GBAS','IGF1','0001','exames_base','IGF-1')
ON CONFLICT (codigo) DO NOTHING;

-- ----------------------------------------------------------------
-- BLOCO 2: Mapear os 15 PRG pendentes ao codigo V4
-- ----------------------------------------------------------------
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM CARD GBAS HDLX 0001'
  WHERE codigo IN ('EXAME_HDL','HDL_H','HDL_M') AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM CARD GBAS LDLX 0001'
  WHERE codigo IN ('EXAME_LDL','LDL') AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM CARD GBAS TRIG 0001'
  WHERE codigo IN ('EXAME_TRIG','TRIGLICERIDES') AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM BINT GBAS GGTP 0001'
  WHERE codigo='GGT' AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM BINT GBAS HTCR 0001'
  WHERE codigo='HCT_H' AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM BINT GBAS HEMO 0001'
  WHERE codigo IN ('HGB_H','HGB_M') AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM BINT GBAS URCA 0001'
  WHERE codigo='ACIDO_URICO' AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM MINE GBAS POTA 0001'
  WHERE codigo='POTASSIO' AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM ENDO GBAS IGF1 0001'
  WHERE codigo IN ('IGF1','IGF1_H_40_60') AND codigo_semantico_v4 IS NULL;

-- ----------------------------------------------------------------
-- BLOCO 3: Nomes proprios das zonas (Caio definiu - filosofia neutra)
-- ALERTA = abaixo do minimo (chama medico interpretar - sem rotular bom/ruim)
-- ATENCAO = acima do maximo (chama medico interpretar - sem rotular bom/ruim)
-- EXCELENTE/ACEITAVEL/RUIM = nomes internos editaveis por exame
-- ----------------------------------------------------------------
ALTER TABLE analitos_catalogo
  ADD COLUMN IF NOT EXISTS nome_zona_excelente TEXT DEFAULT 'EXCELENTE',
  ADD COLUMN IF NOT EXISTS nome_zona_aceitavel TEXT DEFAULT 'ACEITAVEL',
  ADD COLUMN IF NOT EXISTS nome_zona_ruim TEXT DEFAULT 'RUIM',
  ADD COLUMN IF NOT EXISTS nome_zona_alerta TEXT DEFAULT 'ALERTA',
  ADD COLUMN IF NOT EXISTS nome_zona_atencao TEXT DEFAULT 'ATENCAO';

-- Backfill registros existentes que possam ter NULL apos ALTER ADD com DEFAULT
UPDATE analitos_catalogo SET nome_zona_excelente='EXCELENTE' WHERE nome_zona_excelente IS NULL;
UPDATE analitos_catalogo SET nome_zona_aceitavel='ACEITAVEL' WHERE nome_zona_aceitavel IS NULL;
UPDATE analitos_catalogo SET nome_zona_ruim='RUIM' WHERE nome_zona_ruim IS NULL;
UPDATE analitos_catalogo SET nome_zona_alerta='ALERTA' WHERE nome_zona_alerta IS NULL;
UPDATE analitos_catalogo SET nome_zona_atencao='ATENCAO' WHERE nome_zona_atencao IS NULL;

-- ----------------------------------------------------------------
-- BLOCO 4: Verificacao final
-- ----------------------------------------------------------------
-- Esperado: 67 mapeados, 0 pendentes
SELECT
  COUNT(*) FILTER (WHERE tipo='EXAME' AND codigo_semantico_v4 IS NOT NULL) AS prg_mapeados,
  COUNT(*) FILTER (WHERE tipo='EXAME' AND codigo_semantico_v4 IS NULL) AS prg_pendentes,
  COUNT(*) FILTER (WHERE tipo='EXAME') AS prg_total
FROM parametros_referencia_global;
