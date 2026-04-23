-- ============================================================================
-- SEED · Parâmetros de Referência Integrativa — PAWARDS MEDCORE
-- Gerado por Dr. Claude · 23/abr/2026
-- Baseado na metodologia do Dr. Caio Padua:
--   Faixa ótima dividida em 3 terços iguais.
--   faixa_critica_max = limiar mínimo (abaixo = alerta vermelho)
--   faixa_baixa_max   = limite do terço inferior (âmbar — preocupante)
--   faixa_media_max   = limite do terço médio (dourado — aceitável)
--   faixa_superior_max= limite do terço superior (verde — excelente)
--   acima do superior = alerta (verificar direção favorável)
--
-- Para marcadores onde ALTO é melhor (testosterona, Vit D, HDL...):
--   terço superior = verde = excelente
--   terço médio    = dourado = aceitável
--   terço inferior = âmbar = preocupante
--   abaixo do mín  = vermelho = alerta
--
-- Para marcadores onde BAIXO é melhor (LDL, TSH, glicose, PCR...):
--   O motor usa direcao_favoravel_exame para inverter a interpretação.
--   As faixas aqui são os VALORES ABSOLUTOS — o motor faz o flip de cor.
--
-- REGRA FERRO: aditivo, ON CONFLICT DO NOTHING — nunca sobrescreve manual.
-- ============================================================================

-- ============================================================================
-- BLOCO 1 — HORMÔNIOS MASCULINOS
-- ============================================================================

-- Testosterona Total (H): faixa integrativa 400–1000 ng/dL
-- Terços: 400-600 (inf) | 600-800 (med) | 800-1000 (sup)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('TESTO_TOTAL_H', 'Testosterona Total (Homem)', 'EXAME', 'ANUAL', 'ng/dL',
   400, 600, 800, 1000,
   'Medicina Integrativa: ótimo 600-1000. Abaixo de 400 = alerta. Acima de 1000 verificar contexto clínico.')
ON CONFLICT (codigo) DO NOTHING;

-- Testosterona Livre (H): faixa integrativa 80–250 pg/mL
-- Terços: 80-136 (inf) | 136-193 (med) | 193-250 (sup)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('TESTO_LIVRE_H', 'Testosterona Livre (Homem)', 'EXAME', 'ANUAL', 'pg/mL',
   80, 136, 193, 250,
   'Medicina Integrativa: acima de 193 = terço superior. Abaixo de 80 = deficiência andrôgena.')
ON CONFLICT (codigo) DO NOTHING;

-- DHEA-S (H, 40-60 anos): faixa integrativa 200–500 mcg/dL
-- Terços: 200-300 (inf) | 300-400 (med) | 400-500 (sup)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('DHEAS_H_40_60', 'DHEA-S (Homem 40-60a)', 'EXAME', 'ANUAL', 'mcg/dL',
   200, 300, 400, 500,
   'Medicina Integrativa: hormônio adaptogênico. Valores acima de 400 = excelente resistência ao envelhecimento.')
ON CONFLICT (codigo) DO NOTHING;

-- DHEA-S (M, 40-60 anos): faixa integrativa 90–350 mcg/dL
-- Terços: 90-177 (inf) | 177-263 (med) | 263-350 (sup)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('DHEAS_M_40_60', 'DHEA-S (Mulher 40-60a)', 'EXAME', 'ANUAL', 'mcg/dL',
   90, 177, 263, 350,
   'Medicina Integrativa: marcador de vitalidade. Queda acentuada pós-menopausa indica suporte adrenal necessário.')
ON CONFLICT (codigo) DO NOTHING;

-- IGF-1 (H, 40-60 anos): faixa integrativa 150–300 ng/mL
-- Terços: 150-200 (inf) | 200-250 (med) | 250-300 (sup)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('IGF1_H_40_60', 'IGF-1 / Somatomedina C (Homem 40-60a)', 'EXAME', 'ANUAL', 'ng/mL',
   150, 200, 250, 300,
   'Medicina Integrativa: GH/IGF-1 é o eixo de recuperação e lean mass. Abaixo de 150 considerar GH peptídeos.')
ON CONFLICT (codigo) DO NOTHING;

-- PSA Total: faixa integrativa 0–2.5 ng/mL (mais restrita que MC <4)
-- BAIXO é melhor. Terços invertidos pelo motor via direcao_favoravel_exame.
-- faixa_critica_max=0.83 | faixa_baixa_max=1.67 | faixa_media_max=2.5
-- Interpretação: 0-0.83 = terço superior (ótimo) | 0.83-1.67 = médio | 1.67-2.5 = inferior
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('PSA_TOTAL', 'PSA Total', 'EXAME', 'ANUAL', 'ng/mL',
   0.83, 1.67, 2.5, 4.0,
   'Integrativa: referência máxima 2.5 ng/mL (vs MC <4). Abaixo de 0.83 = excelente. Direção favorável: BAIXO.')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- BLOCO 2 — HORMÔNIOS FEMININOS
-- ============================================================================

-- Estradiol (M, fase folicular): faixa integrativa 50–200 pg/mL
-- Terços: 50-100 (inf) | 100-150 (med) | 150-200 (sup)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('ESTRADIOL_M_FOLIC', 'Estradiol (Mulher - Fase Folicular)', 'EXAME', 'ANUAL', 'pg/mL',
   50, 100, 150, 200,
   'Medicina Integrativa: fase folicular. Abaixo de 50 = deficiência estrogênica clinicamente relevante.')
ON CONFLICT (codigo) DO NOTHING;

-- Progesterona (M, fase lútea): faixa integrativa 10–25 ng/mL
-- Terços: 10-15 (inf) | 15-20 (med) | 20-25 (sup)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('PROGESTERONA_M_LUTEA', 'Progesterona (Mulher - Fase Lútea)', 'EXAME', 'ANUAL', 'ng/mL',
   10, 15, 20, 25,
   'Medicina Integrativa: fase lútea. Abaixo de 10 = deficiência lútea. Acima de 20 = ciclo ovulatório ótimo.')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- BLOCO 3 — TIREOIDE
-- ============================================================================

-- TSH: faixa integrativa 0.5–2.5 mIU/L (vs MC 0.5-4.5)
-- BAIXO é melhor (dentro da faixa). Motor inverte cores.
-- Terços: 0.5-1.17 (terço sup quando invertido) | 1.17-1.83 (med) | 1.83-2.5 (inf = ruim)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('TSH', 'TSH (Hormônio Tireoestimulante)', 'EXAME', 'ANUAL', 'mIU/L',
   0.5, 1.17, 1.83, 2.5,
   'Integrativa: referência ótima 0.5-2.5 (vs MC 0.5-4.5). Abaixo de 0.5 = hipertireoidismo. Direção favorável: BAIXO.')
ON CONFLICT (codigo) DO NOTHING;

-- T3 Livre: faixa integrativa 3.0–4.5 pg/mL (vs MC 2.3-4.2)
-- ALTO é melhor. Terços: 3.0-3.5 (inf) | 3.5-4.0 (med) | 4.0-4.5 (sup)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('T3_LIVRE', 'T3 Livre (Triiodotironina Livre)', 'EXAME', 'ANUAL', 'pg/mL',
   3.0, 3.5, 4.0, 4.5,
   'Integrativa: referência ótima 3.0-4.5. T3 baixo com TSH normal = síndrome de T3 baixo. Alvo: acima de 4.0.')
ON CONFLICT (codigo) DO NOTHING;

-- T4 Livre: faixa integrativa 1.0–1.8 ng/dL
-- ALTO é melhor. Terços: 1.0-1.27 (inf) | 1.27-1.53 (med) | 1.53-1.8 (sup)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('T4_LIVRE', 'T4 Livre (Tiroxina Livre)', 'EXAME', 'ANUAL', 'ng/dL',
   1.0, 1.27, 1.53, 1.8,
   'Integrativa: T4 no terço superior indica boa reserva hormonal tireoidiana. Alvo: 1.53-1.80.')
ON CONFLICT (codigo) DO NOTHING;

-- Anti-TPO: faixa integrativa 0–10 UI/mL (vs MC <35)
-- BAIXO é melhor. Motor inverte. Terços: 0-3.33 (sup/ótimo) | 3.33-6.67 (med) | 6.67-10 (inf/pior)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('ANTI_TPO', 'Anti-TPO (Anticorpo Antitireoperoxidase)', 'EXAME', 'ANUAL', 'UI/mL',
   3.33, 6.67, 10, 35,
   'Integrativa: referência ideal < 10 (vs MC <35). Acima de 10 = processo autoimune tireoidiano ativo. Direção: BAIXO.')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- BLOCO 4 — VITAMINAS
-- ============================================================================

-- Vitamina D (25-OH): faixa integrativa 60–100 ng/mL (vs MC 20-100)
-- ALTO é melhor. Terços: 60-73 (inf) | 73-87 (med) | 87-100 (sup)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('VIT_D', 'Vitamina D (25-OH Colecalciferol)', 'EXAME', 'SEMESTRAL', 'ng/mL',
   60, 73, 87, 100,
   'Integrativa: alvo 60-100 ng/mL. Abaixo de 60 = deficiência funcional mesmo dentro do MC. Alvo: acima de 87.')
ON CONFLICT (codigo) DO NOTHING;

-- Vitamina B12: faixa integrativa 400–1200 pg/mL (vs MC 200-900)
-- ALTO é melhor. Terços: 400-667 (inf) | 667-933 (med) | 933-1200 (sup)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('VIT_B12', 'Vitamina B12 (Cobalamina)', 'EXAME', 'SEMESTRAL', 'pg/mL',
   400, 667, 933, 1200,
   'Integrativa: abaixo de 400 = deficiência neurológica latente. Alvo: acima de 933 para função cognitiva ótima.')
ON CONFLICT (codigo) DO NOTHING;

-- Folato sérico: faixa integrativa 10–25 ng/mL
-- ALTO é melhor. Terços: 10-15 (inf) | 15-20 (med) | 20-25 (sup)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('FOLATO', 'Folato Sérico (Ácido Fólico)', 'EXAME', 'ANUAL', 'ng/mL',
   10, 15, 20, 25,
   'Integrativa: essencial para metilação. Valores abaixo de 10 impactam humor, cognição e risco cardiovascular.')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- BLOCO 5 — MINERAIS
-- ============================================================================

-- Magnésio sérico: faixa integrativa 2.0–2.5 mg/dL (vs MC 1.7-2.5)
-- ALTO é melhor. Terços: 2.0-2.17 (inf) | 2.17-2.33 (med) | 2.33-2.5 (sup)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('MAGNESIO', 'Magnésio Sérico', 'EXAME', 'SEMESTRAL', 'mg/dL',
   2.0, 2.17, 2.33, 2.5,
   'Integrativa: referência integrativa mínima 2.0 (vs MC 1.7). Abaixo de 2.0 = depleção funcional. Alvo: 2.33+.')
ON CONFLICT (codigo) DO NOTHING;

-- Zinco sérico: faixa integrativa 85–120 mcg/dL (vs MC 70-120)
-- ALTO é melhor. Terços: 85-97 (inf) | 97-108 (med) | 108-120 (sup)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('ZINCO', 'Zinco Sérico', 'EXAME', 'ANUAL', 'mcg/dL',
   85, 97, 108, 120,
   'Integrativa: zinco abaixo de 85 = imunodeficiência funcional e queda de testosterona. Alvo: 108-120.')
ON CONFLICT (codigo) DO NOTHING;

-- Ferritina (H): faixa integrativa 50–200 ng/mL
-- ALTO é melhor (mas não excessivo - acima de 200 verificar hemocromatose)
-- Terços: 50-100 (inf) | 100-150 (med) | 150-200 (sup)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('FERRITINA_H', 'Ferritina (Homem)', 'EXAME', 'ANUAL', 'ng/mL',
   50, 100, 150, 200,
   'Integrativa: abaixo de 50 = reservas insuficientes mesmo com Hb normal. Acima de 200: verificar inflamação/hemocromatose.')
ON CONFLICT (codigo) DO NOTHING;

-- Ferritina (M): faixa integrativa 40–150 ng/mL
-- Terços: 40-76 (inf) | 76-113 (med) | 113-150 (sup)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('FERRITINA_M', 'Ferritina (Mulher)', 'EXAME', 'ANUAL', 'ng/mL',
   40, 76, 113, 150,
   'Integrativa: mulheres em ciclo menstrual têm depleção frequente. Abaixo de 40 = queda de cabelo, fadiga, déficit cognitivo.')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- BLOCO 6 — LIPIDOGRAMA
-- ============================================================================

-- LDL-c: faixa integrativa 50–100 mg/dL (vs MC <130) — BAIXO é melhor
-- Motor inverte. Terços: 0-67 (sup/ótimo) | 67-83 (med) | 83-100 (inf/pior)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('LDL', 'LDL-c (Colesterol LDL)', 'EXAME', 'ANUAL', 'mg/dL',
   67, 83, 100, 130,
   'Integrativa: alvo <100. Abaixo de 67 = excelente. Acima de 100 = risco cardiometabólico. Direção: BAIXO.')
ON CONFLICT (codigo) DO NOTHING;

-- HDL-c (H): faixa integrativa 50–80 mg/dL — ALTO é melhor
-- Terços: 50-60 (inf) | 60-70 (med) | 70-80 (sup)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('HDL_H', 'HDL-c (Colesterol HDL - Homem)', 'EXAME', 'ANUAL', 'mg/dL',
   50, 60, 70, 80,
   'Integrativa: HDL abaixo de 50 = risco cardiovascular elevado em homens. Alvo: 70-80 = proteção ótima.')
ON CONFLICT (codigo) DO NOTHING;

-- HDL-c (M): faixa integrativa 55–90 mg/dL — ALTO é melhor
-- Terços: 55-67 (inf) | 67-78 (med) | 78-90 (sup)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('HDL_M', 'HDL-c (Colesterol HDL - Mulher)', 'EXAME', 'ANUAL', 'mg/dL',
   55, 67, 78, 90,
   'Integrativa: mulheres naturalmente têm HDL maior. Abaixo de 55 = perda de proteção estrogênica. Alvo: 78+.')
ON CONFLICT (codigo) DO NOTHING;

-- Triglicérides: faixa integrativa 50–100 mg/dL (vs MC <150) — BAIXO é melhor
-- Terços invertidos: 0-67 (sup/ótimo) | 67-83 (med) | 83-100 (inf/ruim)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('TRIGLICERIDES', 'Triglicérides', 'EXAME', 'ANUAL', 'mg/dL',
   67, 83, 100, 150,
   'Integrativa: alvo <100. Triglicérides acima de 100 = resistência insulínica latente. Direção: BAIXO.')
ON CONFLICT (codigo) DO NOTHING;

-- Colesterol Total: faixa integrativa 150–200 mg/dL — BAIXO é melhor
-- Terços: 0-167 (sup/ótimo) | 167-183 (med) | 183-200 (inf/ruim)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('COL_TOTAL', 'Colesterol Total', 'EXAME', 'ANUAL', 'mg/dL',
   167, 183, 200, 240,
   'Integrativa: alvo 150-200. Abaixo de 150 = risco para síntese hormonal. Acima de 200 = vigilância. Direção: BAIXO.')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- BLOCO 7 — GLICEMIA E RESISTÊNCIA INSULÍNICA
-- ============================================================================

-- Glicose em jejum: faixa integrativa 75–90 mg/dL (vs MC 70-99) — BAIXO é melhor
-- Terços: 0-80 (sup/ótimo) | 80-85 (med) | 85-90 (inf/ruim)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('GLICOSE_JEJUM', 'Glicose em Jejum', 'EXAME', 'SEMESTRAL', 'mg/dL',
   80, 85, 90, 99,
   'Integrativa: alvo <90. Abaixo de 80 = ótimo. 90-99 = pré-diabetes funcional. Direção: BAIXO.')
ON CONFLICT (codigo) DO NOTHING;

-- Insulina em jejum: faixa integrativa 2–8 mcIU/mL (vs MC 2-25) — BAIXO é melhor
-- Terços: 0-4 (sup/ótimo) | 4-6 (med) | 6-8 (inf/ruim)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('INSULINA_JEJUM', 'Insulina em Jejum', 'EXAME', 'ANUAL', 'mcIU/mL',
   4, 6, 8, 25,
   'Integrativa: alvo <8. Abaixo de 4 = sensibilidade insulínica excelente. Acima de 8 = hiperinsulinemia subclínica. Direção: BAIXO.')
ON CONFLICT (codigo) DO NOTHING;

-- HbA1c: faixa integrativa 4.5–5.4% (vs MC <5.7%) — BAIXO é melhor
-- Terços: 0-4.8 (sup/ótimo) | 4.8-5.1 (med) | 5.1-5.4 (inf/ruim)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('HBA1C', 'Hemoglobina Glicada (HbA1c)', 'EXAME', 'SEMESTRAL', '%',
   4.8, 5.1, 5.4, 5.7,
   'Integrativa: alvo 4.5-5.4%. Abaixo de 4.8 = metabolismo glicídico excelente. Acima de 5.4 = atenção. Direção: BAIXO.')
ON CONFLICT (codigo) DO NOTHING;

-- HOMA-IR: faixa integrativa 0.5–2.0 — BAIXO é melhor
-- Terços: 0-1.0 (sup/ótimo) | 1.0-1.5 (med) | 1.5-2.0 (inf/ruim)
-- Cálculo: HOMA-IR = (glicose_jejum × insulina_jejum) / 405
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('HOMA_IR', 'HOMA-IR (Índice de Resistência Insulínica)', 'EXAME', 'ANUAL', 'índice',
   1.0, 1.5, 2.0, 3.0,
   'Integrativa: HOMA-IR = (glicose × insulina) / 405. Abaixo de 1.0 = excelente sensibilidade. Direção: BAIXO.')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- BLOCO 8 — MARCADORES INFLAMATÓRIOS
-- ============================================================================

-- PCR ultra-sensível (us-PCR): faixa integrativa 0–1.0 mg/L (vs MC <3.0) — BAIXO é melhor
-- Terços: 0-0.33 (sup/ótimo) | 0.33-0.67 (med) | 0.67-1.0 (inf/ruim)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('PCR_US', 'PCR Ultra-sensível (us-PCR)', 'EXAME', 'SEMESTRAL', 'mg/L',
   0.33, 0.67, 1.0, 3.0,
   'Integrativa: alvo <1.0. Abaixo de 0.33 = inflamação sistêmica zerada. Acima de 1 = processo inflamatório crônico. Direção: BAIXO.')
ON CONFLICT (codigo) DO NOTHING;

-- Homocisteína: faixa integrativa 5–10 mcmol/L (vs MC <15) — BAIXO é melhor
-- Terços: 0-6.67 (sup/ótimo) | 6.67-8.33 (med) | 8.33-10 (inf/ruim)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('HOMOCISTEINA', 'Homocisteína', 'EXAME', 'ANUAL', 'mcmol/L',
   6.67, 8.33, 10, 15,
   'Integrativa: alvo <10. Acima de 10 = risco cardiovascular e neurocognitivo. Tratar com metilfolato + B12 + B6. Direção: BAIXO.')
ON CONFLICT (codigo) DO NOTHING;

-- Fibrinogênio: faixa integrativa 200–350 mg/dL — BAIXO é melhor
-- Terços: 0-250 (sup/ótimo) | 250-300 (med) | 300-350 (inf/ruim)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('FIBRINOGENIO', 'Fibrinogênio', 'EXAME', 'ANUAL', 'mg/dL',
   250, 300, 350, 400,
   'Integrativa: marcador de inflamação e risco trombótico. Acima de 350 = estado pró-inflamatório. Direção: BAIXO.')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- BLOCO 9 — HEMOGRAMA
-- ============================================================================

-- Hemoglobina (H): faixa integrativa 14–17 g/dL — ALTO é melhor
-- Terços: 14-15 (inf) | 15-16 (med) | 16-17 (sup)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('HGB_H', 'Hemoglobina (Homem)', 'EXAME', 'ANUAL', 'g/dL',
   14, 15, 16, 17,
   'Integrativa: abaixo de 14 = anemia em homens adultos. Alvo 16-17 para performance e longevidade.')
ON CONFLICT (codigo) DO NOTHING;

-- Hemoglobina (M): faixa integrativa 12.5–15.5 g/dL — ALTO é melhor
-- Terços: 12.5-13.5 (inf) | 13.5-14.5 (med) | 14.5-15.5 (sup)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('HGB_M', 'Hemoglobina (Mulher)', 'EXAME', 'ANUAL', 'g/dL',
   12.5, 13.5, 14.5, 15.5,
   'Integrativa: abaixo de 12.5 = anemia funcional. Mulheres em ciclo: monitorar ferritina em paralelo.')
ON CONFLICT (codigo) DO NOTHING;

-- Hematócrito (H): faixa integrativa 42–50% — ALTO é melhor
-- Terços: 42-44.67 (inf) | 44.67-47.33 (med) | 47.33-50 (sup)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('HCT_H', 'Hematócrito (Homem)', 'EXAME', 'ANUAL', '%',
   42, 44.67, 47.33, 50,
   'Integrativa: acima de 53% em uso de testosterona = risco trombótico — doação de sangue necessária.')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- BLOCO 10 — FUNÇÃO HEPÁTICA
-- ============================================================================

-- TGO/AST: faixa integrativa 10–30 U/L (vs MC <40) — BAIXO é melhor
-- Terços: 0-17 (sup/ótimo) | 17-23 (med) | 23-30 (inf/ruim)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('TGO_AST', 'TGO / AST (Aspartato Aminotransferase)', 'EXAME', 'ANUAL', 'U/L',
   17, 23, 30, 40,
   'Integrativa: alvo <30. Abaixo de 17 = fígado em excelente condição. Acima de 30 = estresse hepático. Direção: BAIXO.')
ON CONFLICT (codigo) DO NOTHING;

-- TGP/ALT: faixa integrativa 10–30 U/L (vs MC <56) — BAIXO é melhor
-- Terços: 0-17 (sup/ótimo) | 17-23 (med) | 23-30 (inf/ruim)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('TGP_ALT', 'TGP / ALT (Alanina Aminotransferase)', 'EXAME', 'ANUAL', 'U/L',
   17, 23, 30, 56,
   'Integrativa: ALT é mais específica para fígado que AST. Acima de 30 = verificar gordura hepática. Direção: BAIXO.')
ON CONFLICT (codigo) DO NOTHING;

-- GGT: faixa integrativa 10–25 U/L (vs MC <73) — BAIXO é melhor
-- Terços: 0-15 (sup/ótimo) | 15-20 (med) | 20-25 (inf/ruim)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('GGT', 'GGT (Gama-Glutamiltransferase)', 'EXAME', 'ANUAL', 'U/L',
   15, 20, 25, 73,
   'Integrativa: GGT acima de 25 = hepatotoxicidade ou álcool. Excelente marcador de carga tóxica hepática. Direção: BAIXO.')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- BLOCO 11 — FUNÇÃO RENAL
-- ============================================================================

-- Creatinina (H): faixa integrativa 0.8–1.2 mg/dL — MÉDIO é melhor
-- Muito baixa = sarcopenia. Muito alta = disfunção renal.
-- Terços: 0.8-0.93 (inf) | 0.93-1.07 (med/ótimo) | 1.07-1.2 (sup — monitorar)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('CREATININA_H', 'Creatinina (Homem)', 'EXAME', 'ANUAL', 'mg/dL',
   0.8, 0.93, 1.07, 1.2,
   'Integrativa: creatinina <0.8 sugere sarcopenia. >1.2 monitorar função renal. Alvo: 0.93-1.07 (zona média).')
ON CONFLICT (codigo) DO NOTHING;

-- TFG estimada (eGFR): faixa integrativa 90–120 mL/min/1.73m² — ALTO é melhor
-- Terços: 90-100 (inf) | 100-110 (med) | 110-120 (sup)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('TFG_ESTIMADA', 'TFG Estimada (eGFR)', 'EXAME', 'ANUAL', 'mL/min/1.73m²',
   90, 100, 110, 120,
   'Integrativa: acima de 110 = função renal excelente. Abaixo de 90 = início de declínio (mesmo dentro do MC normal).')
ON CONFLICT (codigo) DO NOTHING;

-- Ácido Úrico: faixa integrativa 3.5–6.0 mg/dL — BAIXO é melhor (mas não muito baixo)
-- Terços invertidos: 3.5-4.17 (sup/ótimo) | 4.17-4.83 (med) | 4.83-6.0 (inf/ruim)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('ACIDO_URICO', 'Ácido Úrico', 'EXAME', 'ANUAL', 'mg/dL',
   4.17, 4.83, 6.0, 7.0,
   'Integrativa: alvo 3.5-5.5. Acima de 6.0 = hiperuricemia e risco de gota + síndrome metabólica. Direção: BAIXO.')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- BLOCO 12 — SUPRARRENAL E ESTRESSE
-- ============================================================================

-- Cortisol matinal (8h): faixa integrativa 12–20 mcg/dL — MÉDIO é melhor
-- Muito baixo = insuficiência adrenal. Muito alto = hipercortisolismo crônico.
-- Terços: 12-14.67 (inf/ruim) | 14.67-17.33 (med/ótimo) | 17.33-20 (sup — monitorar)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES
  ('CORTISOL_MATINAL', 'Cortisol Matinal (8h)', 'EXAME', 'ANUAL', 'mcg/dL',
   12, 14.67, 17.33, 20,
   'Integrativa: 14-17 = zona ótima. Abaixo de 12 = insuficiência adrenal. Acima de 20 = hipercortisolismo crônico.')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- VERIFICAÇÃO FINAL (executar após seed para confirmar)
-- ============================================================================

-- SELECT codigo, label, faixa_critica_max, faixa_baixa_max,
--        faixa_media_max, faixa_superior_max, observacao
-- FROM parametros_referencia_global
-- WHERE tipo = 'EXAME'
-- ORDER BY codigo;

-- ============================================================================
-- SEED COMPLEMENTAR — analitos_referencia_laboratorio (PAWARDS_INTEGRATIVA)
-- Para uso no motor motorClassificacaoIntegrativa.ts
-- laboratorio = 'PAWARDS_INTEGRATIVA' marca como faixas do Dr. Caio
-- ============================================================================

-- Testosterone Total (H) — faixa integrativa PAWARDS
INSERT INTO analitos_referencia_laboratorio
  (analito_codigo, laboratorio, sexo, faixa_etaria_min, faixa_etaria_max,
   valor_min_ref, valor_max_ref, unidade_origem, observacao)
VALUES
  ('TESTO_TOTAL', 'PAWARDS_INTEGRATIVA', 'M', 18, 99,
   400, 1000, 'ng/dL',
   'Faixa integrativa Dr. Caio: terço sup 800-1000 | med 600-800 | inf 400-600')
ON CONFLICT (analito_codigo, laboratorio, sexo, faixa_etaria_min, faixa_etaria_max) DO NOTHING;

-- Vitamina D — faixa integrativa PAWARDS
INSERT INTO analitos_referencia_laboratorio
  (analito_codigo, laboratorio, sexo, faixa_etaria_min, faixa_etaria_max,
   valor_min_ref, valor_max_ref, unidade_origem, observacao)
VALUES
  ('VIT_D_25OH', 'PAWARDS_INTEGRATIVA', 'AMBOS', 18, 99,
   60, 100, 'ng/mL',
   'Faixa integrativa Dr. Caio: terço sup 87-100 | med 73-87 | inf 60-73')
ON CONFLICT (analito_codigo, laboratorio, sexo, faixa_etaria_min, faixa_etaria_max) DO NOTHING;

-- TSH — faixa integrativa PAWARDS (mais restrita)
INSERT INTO analitos_referencia_laboratorio
  (analito_codigo, laboratorio, sexo, faixa_etaria_min, faixa_etaria_max,
   valor_min_ref, valor_max_ref, unidade_origem, observacao)
VALUES
  ('TSH', 'PAWARDS_INTEGRATIVA', 'AMBOS', 18, 99,
   0.5, 2.5, 'mIU/L',
   'Faixa integrativa Dr. Caio (vs MC 0.5-4.5): alvo <1.17 = ótimo. Direção favorável: BAIXO.')
ON CONFLICT (analito_codigo, laboratorio, sexo, faixa_etaria_min, faixa_etaria_max) DO NOTHING;

-- PCR ultra-sensível — faixa integrativa PAWARDS
INSERT INTO analitos_referencia_laboratorio
  (analito_codigo, laboratorio, sexo, faixa_etaria_min, faixa_etaria_max,
   valor_min_ref, valor_max_ref, unidade_origem, observacao)
VALUES
  ('PCR_US', 'PAWARDS_INTEGRATIVA', 'AMBOS', 18, 99,
   0, 1.0, 'mg/L',
   'Faixa integrativa Dr. Caio: alvo <0.33 = ótimo. Direção favorável: BAIXO.')
ON CONFLICT (analito_codigo, laboratorio, sexo, faixa_etaria_min, faixa_etaria_max) DO NOTHING;

-- Insulina em jejum — faixa integrativa PAWARDS
INSERT INTO analitos_referencia_laboratorio
  (analito_codigo, laboratorio, sexo, faixa_etaria_min, faixa_etaria_max,
   valor_min_ref, valor_max_ref, unidade_origem, observacao)
VALUES
  ('INSULINA_JEJUM', 'PAWARDS_INTEGRATIVA', 'AMBOS', 18, 99,
   2, 8, 'mcIU/mL',
   'Faixa integrativa Dr. Caio (vs MC 2-25): alvo <4 = sensibilidade insulínica ótima. Direção: BAIXO.')
ON CONFLICT (analito_codigo, laboratorio, sexo, faixa_etaria_min, faixa_etaria_max) DO NOTHING;
