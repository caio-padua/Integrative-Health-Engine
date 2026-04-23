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

-- ============================================================
-- AMPLIACAO MAPEAMENTOS — 52/67 PRG EXAME mapeados (28-Apr Dr. Replit)
-- Aplicado via psql idempotente — todos UPDATE WHERE codigo_semantico_v4 IS NULL.
-- ============================================================
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM TIRE GBAS TSHX 0001' WHERE codigo='EXAME_TSH' AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM BINT GBAS UREI 0001' WHERE codigo='EXAME_UREIA' AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM COAG GINT FIBR 0001' WHERE codigo='FIBRINOGENIO' AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM CARD GBAS HMCS 0001' WHERE codigo='HOMOCISTEINA' AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM MINE GBAS MAGN 0001' WHERE codigo='MAGNESIO' AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM PROS GBAS PSAT 0001' WHERE codigo='PSA_TOTAL' AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM BINT GBAS TGOX 0001' WHERE codigo IN ('EXAME_TGO','TGO_AST') AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM BINT GBAS TGPX 0001' WHERE codigo IN ('EXAME_TGP','TGP_ALT') AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM BINT GBAS VITD 0001' WHERE codigo IN ('EXAME_VITD','VIT_D') AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM BINT GBAS FERR 0001' WHERE codigo IN ('FERRITINA_H','FERRITINA_M') AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM VITA GBAS AFOL 0001' WHERE codigo='FOLATO' AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM GLIC GBAS INSU 0001' WHERE codigo='INSULINA_JEJUM' AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM GONA GBAS PROG 0001' WHERE codigo='PROGESTERONA_M_LUTEA' AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM GONA GBAS SHBG 0001' WHERE codigo='SHBG' AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM TIRE GBAS T3LV 0001' WHERE codigo='T3_LIVRE' AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM TIRE GBAS T4LV 0001' WHERE codigo='T4_LIVRE' AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM GONA GBAS TESL 0001' WHERE codigo='TESTO_LIVRE_H' AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM GONA GBAS TEST 0001' WHERE codigo='TESTO_TOTAL_H' AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM BINT GBAS VB12 0001' WHERE codigo='VIT_B12' AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM MINE GBAS ZINC 0001' WHERE codigo='ZINCO' AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM GLIC GINT HOMA 0002' WHERE codigo='HOMA_IR' AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM CARD GBAS PCRU 0001' WHERE codigo IN ('EXAME_PCR','PCR_ULTRA','PCR_US') AND codigo_semantico_v4 IS NULL;
UPDATE parametros_referencia_global SET codigo_semantico_v4 = 'EXAM RENA GBAS TFGE 0001' WHERE codigo='TFG_ESTIMADA' AND codigo_semantico_v4 IS NULL;

-- PENDENTES (15) — aguardam Dr. Manus criar canonico em codigos_semanticos:
-- ACIDO_URICO, EXAME_HDL, EXAME_LDL, EXAME_TRIG, GGT, HCT_H, HDL_H, HDL_M,
-- HGB_H, HGB_M, IGF1, IGF1_H_40_60, LDL, POTASSIO, TRIGLICERIDES
