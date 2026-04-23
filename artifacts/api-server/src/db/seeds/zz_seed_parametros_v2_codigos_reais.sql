-- ============================================================================
-- SEED CORRIGIDO v2 — Parâmetros de Referência Integrativa
-- Dr. Claude · 23/abr/2026 · Códigos REAIS do banco (0bb5fe8)
-- ============================================================================
-- CORREÇÕES de drift identificadas pelo Dr. Replit:
--   TESTO_TOTAL      → TESTOSTERONA_TOTAL ✓
--   VIT_D_25OH       → VITAMINA_D ✓
--   PCR_US           → PCR_ULTRA ✓
--   INSULINA_JEJUM   → INSULINA ✓
--   TSH              → TSH ✓ (único que batia)
--   GLICOSE_JEJUM    → GLICOSE_JEJUM ✓ (já existia)
-- ============================================================================
-- METODOLOGIA (Dr. Caio Padua):
--   Faixa ótima dividida em 3 terços iguais.
--   faixa_critica_max = mínimo da faixa (abaixo = alerta vermelho)
--   faixa_baixa_max   = mínimo + range/3 (terço inferior = âmbar)
--   faixa_media_max   = mínimo + 2×range/3 (terço médio = dourado)
--   faixa_superior_max= máximo da faixa (terço superior = verde)
--   Para marcadores BAIXO=melhor: motor usa direcao_favoravel_exame para inverter.
-- ============================================================================

-- ═══════════════════════════════════════════════════════════
-- BLOCO 1 — HORMÔNIOS (usando códigos reais do banco)
-- ═══════════════════════════════════════════════════════════

-- Testosterona Total (H): integrativa 400-1000 ng/dL | terços: 400|600|800|1000
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES ('TESTOSTERONA_TOTAL','Testosterona Total (Homem)','EXAME','ANUAL','ng/dL',
  400,600,800,1000,
  'MI: ótimo 600-1000. <400=alerta. Terços: 400-600 inf | 600-800 med | 800-1000 sup. ALTO=melhor.')
ON CONFLICT (codigo) DO UPDATE SET
  faixa_critica_max=400, faixa_baixa_max=600, faixa_media_max=800, faixa_superior_max=1000,
  unidade_medida='ng/dL', observacao=EXCLUDED.observacao;

-- SHBG: integrativa 20-50 nmol/L | INFERIOR=melhor (muito alto prende testosterona)
-- Terços: 20-30 (sup/ótimo) | 30-40 (med) | 40-50 (inf/pior)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES ('SHBG','SHBG (Globulina Ligadora de Hormônios Sexuais)','EXAME','ANUAL','nmol/L',
  30,40,50,80,
  'MI: alvo 20-30. SHBG alto sequestra testosterona livre. >50=testosterona biodisponível baixa. BAIXO=melhor.')
ON CONFLICT (codigo) DO UPDATE SET
  faixa_critica_max=30, faixa_baixa_max=40, faixa_media_max=50, faixa_superior_max=80,
  unidade_medida='nmol/L', observacao=EXCLUDED.observacao;

-- TSH: integrativa 0.5-2.5 mIU/L | INFERIOR=melhor
-- Terços invertidos: 0.5-1.17 (sup/ótimo) | 1.17-1.83 (med) | 1.83-2.5 (inf/pior)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES ('TSH','TSH (Hormônio Tireoestimulante)','EXAME','ANUAL','uUI/mL',
  1.17,1.83,2.5,4.5,
  'MI: alvo 0.5-2.5 (vs MC 0.5-4.5). <0.5=hipertireoidismo. Terços: 0.5-1.17 ótimo | 1.17-1.83 med | 1.83-2.5 pior. BAIXO=melhor.')
ON CONFLICT (codigo) DO UPDATE SET
  faixa_critica_max=1.17, faixa_baixa_max=1.83, faixa_media_max=2.5, faixa_superior_max=4.5,
  unidade_medida='uUI/mL', observacao=EXCLUDED.observacao;

-- T4 Livre: integrativa 1.0-1.8 ng/dL | SUPERIOR=melhor
-- Terços: 1.0-1.27 inf | 1.27-1.53 med | 1.53-1.8 sup
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES ('T4_LIVRE','T4 Livre (Tiroxina Livre)','EXAME','ANUAL','ng/dL',
  1.0,1.27,1.53,1.8,
  'MI: alvo 1.53-1.80. <1.0=hipotireoidismo. Terços: 1.0-1.27 inf | 1.27-1.53 med | 1.53-1.80 sup. ALTO=melhor.')
ON CONFLICT (codigo) DO UPDATE SET
  faixa_critica_max=1.0, faixa_baixa_max=1.27, faixa_media_max=1.53, faixa_superior_max=1.8,
  unidade_medida='ng/dL', observacao=EXCLUDED.observacao;

-- ═══════════════════════════════════════════════════════════
-- BLOCO 2 — VITAMINAS
-- ═══════════════════════════════════════════════════════════

-- Vitamina D: integrativa 60-100 ng/mL | SUPERIOR=melhor
-- Terços: 60-73 inf | 73-87 med | 87-100 sup
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES ('VITAMINA_D','Vitamina D 25(OH) Colecalciferol','EXAME','SEMESTRAL','ng/mL',
  60,73,87,100,
  'MI: alvo 60-100 ng/mL (vs MC 20-100). <60=deficiência funcional. Terços: 60-73 inf | 73-87 med | 87-100 sup. ALTO=melhor.')
ON CONFLICT (codigo) DO UPDATE SET
  faixa_critica_max=60, faixa_baixa_max=73, faixa_media_max=87, faixa_superior_max=100,
  unidade_medida='ng/mL', observacao=EXCLUDED.observacao;

-- Vitamina B12: integrativa 400-1200 pg/mL | SUPERIOR=melhor
-- Terços: 400-667 inf | 667-933 med | 933-1200 sup
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES ('B12','Vitamina B12 (Cobalamina)','EXAME','SEMESTRAL','pg/mL',
  400,667,933,1200,
  'MI: alvo >933. <400=deficiência neurológica latente. Terços: 400-667 inf | 667-933 med | 933-1200 sup. ALTO=melhor.')
ON CONFLICT (codigo) DO UPDATE SET
  faixa_critica_max=400, faixa_baixa_max=667, faixa_media_max=933, faixa_superior_max=1200,
  unidade_medida='pg/mL', observacao=EXCLUDED.observacao;

-- ═══════════════════════════════════════════════════════════
-- BLOCO 3 — MINERAIS
-- ═══════════════════════════════════════════════════════════

-- Magnésio: integrativa 2.0-2.5 mg/dL | SUPERIOR=melhor
-- Terços: 2.0-2.17 inf | 2.17-2.33 med | 2.33-2.5 sup
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES ('MAGNESIO','Magnésio Sérico','EXAME','SEMESTRAL','mg/dL',
  2.0,2.17,2.33,2.5,
  'MI: mínimo 2.0 (vs MC 1.7). <2.0=depleção funcional. Terços: 2.0-2.17 inf | 2.17-2.33 med | 2.33-2.5 sup. ALTO=melhor.')
ON CONFLICT (codigo) DO UPDATE SET
  faixa_critica_max=2.0, faixa_baixa_max=2.17, faixa_media_max=2.33, faixa_superior_max=2.5,
  unidade_medida='mg/dL', observacao=EXCLUDED.observacao;

-- Zinco: integrativa 85-120 ug/dL | SUPERIOR=melhor
-- Terços: 85-97 inf | 97-108 med | 108-120 sup
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES ('ZINCO','Zinco Sérico','EXAME','ANUAL','ug/dL',
  85,97,108,120,
  'MI: <85=imunodeficiência funcional + queda testosterona. Terços: 85-97 inf | 97-108 med | 108-120 sup. ALTO=melhor.')
ON CONFLICT (codigo) DO UPDATE SET
  faixa_critica_max=85, faixa_baixa_max=97, faixa_media_max=108, faixa_superior_max=120,
  unidade_medida='ug/dL', observacao=EXCLUDED.observacao;

-- Ferritina: integrativa 50-200 ng/mL | MEDIO=melhor (muito alto = inflamação)
-- Terços: 50-100 inf | 100-150 med | 150-200 sup (mas >200 monitorar)
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES ('FERRITINA','Ferritina Sérica','EXAME','ANUAL','ng/mL',
  50,100,150,200,
  'MI: <50=reservas insuficientes. >200 verificar inflamação/hemocromatose. Terços: 50-100 inf | 100-150 med | 150-200 sup.')
ON CONFLICT (codigo) DO UPDATE SET
  faixa_critica_max=50, faixa_baixa_max=100, faixa_media_max=150, faixa_superior_max=200,
  unidade_medida='ng/mL', observacao=EXCLUDED.observacao;

-- Potássio: integrativa 4.0-5.0 mEq/L | MEDIO=melhor
-- Terços: 4.0-4.33 inf | 4.33-4.67 med | 4.67-5.0 sup
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES ('POTASSIO','Potássio Sérico','EXAME','ANUAL','mEq/L',
  4.0,4.33,4.67,5.0,
  'MI: alvo 4.0-5.0. <3.5=hipocalemia. >5.5=hipercalemia. Terços: 4.0-4.33 inf | 4.33-4.67 med | 4.67-5.0 sup.')
ON CONFLICT (codigo) DO UPDATE SET
  faixa_critica_max=4.0, faixa_baixa_max=4.33, faixa_media_max=4.67, faixa_superior_max=5.0,
  unidade_medida='mEq/L', observacao=EXCLUDED.observacao;

-- ═══════════════════════════════════════════════════════════
-- BLOCO 4 — GLICEMIA E RESISTÊNCIA INSULÍNICA
-- ═══════════════════════════════════════════════════════════

-- Glicose Jejum: integrativa 75-90 mg/dL | INFERIOR=melhor
-- Terços: 75-80 sup/ótimo | 80-85 med | 85-90 inf/pior
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES ('GLICOSE_JEJUM','Glicose em Jejum','EXAME','SEMESTRAL','mg/dL',
  80,85,90,99,
  'MI: alvo <90. <80=ótimo. 90-99=pré-diabetes funcional. Terços: 75-80 ótimo | 80-85 med | 85-90 pior. BAIXO=melhor.')
ON CONFLICT (codigo) DO UPDATE SET
  faixa_critica_max=80, faixa_baixa_max=85, faixa_media_max=90, faixa_superior_max=99,
  unidade_medida='mg/dL', observacao=EXCLUDED.observacao;

-- Insulina: integrativa 2-8 uUI/mL | INFERIOR=melhor
-- Terços: 2-4 sup/ótimo | 4-6 med | 6-8 inf/pior
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES ('INSULINA','Insulina em Jejum','EXAME','ANUAL','uUI/mL',
  4,6,8,25,
  'MI: alvo <8. <4=sensibilidade insulínica excelente. >8=hiperinsulinemia subclínica. Terços: 2-4 ótimo | 4-6 med | 6-8 pior. BAIXO=melhor.')
ON CONFLICT (codigo) DO UPDATE SET
  faixa_critica_max=4, faixa_baixa_max=6, faixa_media_max=8, faixa_superior_max=25,
  unidade_medida='uUI/mL', observacao=EXCLUDED.observacao;

-- ═══════════════════════════════════════════════════════════
-- BLOCO 5 — INFLAMAÇÃO
-- ═══════════════════════════════════════════════════════════

-- PCR Ultrassensível: integrativa 0-1.0 mg/L | INFERIOR=melhor
-- Terços: 0-0.33 sup/ótimo | 0.33-0.67 med | 0.67-1.0 inf/pior
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES ('PCR_ULTRA','PCR Ultrassensível (us-PCR)','EXAME','SEMESTRAL','mg/L',
  0.33,0.67,1.0,3.0,
  'MI: alvo <1.0 (vs MC <3.0). <0.33=inflamação zerada. >1.0=processo inflamatório crônico. BAIXO=melhor.')
ON CONFLICT (codigo) DO UPDATE SET
  faixa_critica_max=0.33, faixa_baixa_max=0.67, faixa_media_max=1.0, faixa_superior_max=3.0,
  unidade_medida='mg/L', observacao=EXCLUDED.observacao;

-- Homocisteína: integrativa 5-10 umol/L | INFERIOR=melhor
-- Terços: 5-6.67 sup/ótimo | 6.67-8.33 med | 8.33-10 inf/pior
INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES ('HOMOCISTEINA','Homocisteína','EXAME','ANUAL','umol/L',
  6.67,8.33,10,15,
  'MI: alvo <10. >10=risco cardiovascular e neurocognitivo. Tratar: metilfolato+B12+B6. BAIXO=melhor.')
ON CONFLICT (codigo) DO UPDATE SET
  faixa_critica_max=6.67, faixa_baixa_max=8.33, faixa_media_max=10, faixa_superior_max=15,
  unidade_medida='umol/L', observacao=EXCLUDED.observacao;

-- ═══════════════════════════════════════════════════════════
-- BLOCO 6 — NOVOS ANALITOS (adicionar ao analitos_catalogo se não existirem)
-- Usando INSERT ON CONFLICT DO NOTHING para não duplicar
-- ═══════════════════════════════════════════════════════════

-- Adicionar HbA1c ao analitos_catalogo (se não existir)
INSERT INTO analitos_catalogo
  (codigo, nome, grupo, unidade_padrao_integrativa, terco_excelente, observacao_clinica)
VALUES
  ('HBA1C','Hemoglobina Glicada HbA1c','GLICEMICO','%','INFERIOR',
   'Marcador de controle glicêmico dos últimos 3 meses. Alvo MI: 4.5-5.4%')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES ('HBA1C','Hemoglobina Glicada (HbA1c)','EXAME','SEMESTRAL','%',
  4.8,5.1,5.4,5.7,
  'MI: alvo 4.5-5.4% (vs MC <5.7%). <4.8=excelente. 5.4-5.7=atenção. BAIXO=melhor.')
ON CONFLICT (codigo) DO NOTHING;

-- Adicionar Colesterol HDL ao analitos_catalogo
INSERT INTO analitos_catalogo
  (codigo, nome, grupo, unidade_padrao_integrativa, terco_excelente, observacao_clinica)
VALUES
  ('HDL_H','Colesterol HDL (Homem)','CARDIOMETABOLICO','mg/dL','SUPERIOR',
   'Colesterol protetor. Alvo MI: >70 mg/dL para homens')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES ('HDL_H','Colesterol HDL (Homem)','EXAME','ANUAL','mg/dL',
  50,60,70,80,
  'MI: alvo 70-80. <50=risco cardiovascular. Terços: 50-60 inf | 60-70 med | 70-80 sup. ALTO=melhor.')
ON CONFLICT (codigo) DO NOTHING;

-- Adicionar Colesterol LDL ao analitos_catalogo
INSERT INTO analitos_catalogo
  (codigo, nome, grupo, unidade_padrao_integrativa, terco_excelente, observacao_clinica)
VALUES
  ('LDL','Colesterol LDL','CARDIOMETABOLICO','mg/dL','INFERIOR',
   'Colesterol "ruim". Alvo MI: <100 mg/dL. Acima de 100 = risco cardiometabólico.')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES ('LDL','Colesterol LDL','EXAME','ANUAL','mg/dL',
  67,83,100,130,
  'MI: alvo <100. <67=excelente. 100-130=risco. Terços invertidos: 0-67 ótimo | 67-83 med | 83-100 pior. BAIXO=melhor.')
ON CONFLICT (codigo) DO NOTHING;

-- Adicionar Triglicérides ao analitos_catalogo
INSERT INTO analitos_catalogo
  (codigo, nome, grupo, unidade_padrao_integrativa, terco_excelente, observacao_clinica)
VALUES
  ('TRIGLICERIDES','Triglicérides','CARDIOMETABOLICO','mg/dL','INFERIOR',
   'Triglicérides elevados = resistência insulínica. Alvo MI: <100 mg/dL.')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES ('TRIGLICERIDES','Triglicérides','EXAME','ANUAL','mg/dL',
  67,83,100,150,
  'MI: alvo <100. >100=resistência insulínica latente. Terços: 0-67 ótimo | 67-83 med | 83-100 pior. BAIXO=melhor.')
ON CONFLICT (codigo) DO NOTHING;

-- Adicionar Cortisol Matinal ao analitos_catalogo
INSERT INTO analitos_catalogo
  (codigo, nome, grupo, unidade_padrao_integrativa, terco_excelente, observacao_clinica)
VALUES
  ('CORTISOL_MATINAL','Cortisol Matinal (8h)','ENDOCRINO','mcg/dL','MEDIO',
   'Marcador adrenal. Muito baixo=insuficiência. Muito alto=hipercortisolismo. Alvo MI: 14-17 mcg/dL.')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES ('CORTISOL_MATINAL','Cortisol Matinal (8h)','EXAME','ANUAL','mcg/dL',
  12,14.67,17.33,20,
  'MI: zona ótima 14-17. <12=insuficiência adrenal. >20=hipercortisolismo crônico. Terço médio é o alvo.')
ON CONFLICT (codigo) DO NOTHING;

-- Adicionar IGF-1 ao analitos_catalogo
INSERT INTO analitos_catalogo
  (codigo, nome, grupo, unidade_padrao_integrativa, terco_excelente, observacao_clinica)
VALUES
  ('IGF1','IGF-1 / Somatomedina C','ENDOCRINO','ng/mL','SUPERIOR',
   'Marcador do eixo GH. Abaixo de 150 considerar peptídeos de GH. Alvo MI: 250-300.')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES ('IGF1','IGF-1 / Somatomedina C (40-60a)','EXAME','ANUAL','ng/mL',
  150,200,250,300,
  'MI: eixo recuperação e lean mass. <150 considerar GH peptídeos. Terços: 150-200 inf | 200-250 med | 250-300 sup. ALTO=melhor.')
ON CONFLICT (codigo) DO NOTHING;

-- Adicionar PSA Total ao analitos_catalogo
INSERT INTO analitos_catalogo
  (codigo, nome, grupo, unidade_padrao_integrativa, terco_excelente, observacao_clinica)
VALUES
  ('PSA_TOTAL','PSA Total','ONCOLOGICO','ng/mL','INFERIOR',
   'Marcador prostático. Alvo MI: <2.5 ng/mL (vs MC <4). Acima de 2.5 = investigar.')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES ('PSA_TOTAL','PSA Total','EXAME','ANUAL','ng/mL',
  0.83,1.67,2.5,4.0,
  'MI: referência 2.5 (vs MC <4). <0.83=excelente. Terços: 0-0.83 ótimo | 0.83-1.67 med | 1.67-2.5 pior. BAIXO=melhor.')
ON CONFLICT (codigo) DO NOTHING;

-- Adicionar TGO/AST ao analitos_catalogo
INSERT INTO analitos_catalogo
  (codigo, nome, grupo, unidade_padrao_integrativa, terco_excelente, observacao_clinica)
VALUES
  ('TGO_AST','TGO / AST','HEPATICO','U/L','INFERIOR',
   'Marcador hepático. Alvo MI: <30 U/L (vs MC <40). Acima de 30 = estresse hepático.')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES ('TGO_AST','TGO / AST (Aspartato Aminotransferase)','EXAME','ANUAL','U/L',
  17,23,30,40,
  'MI: <30 (vs MC <40). <17=fígado excelente. Terços: 0-17 ótimo | 17-23 med | 23-30 pior. BAIXO=melhor.')
ON CONFLICT (codigo) DO NOTHING;

-- Adicionar TGP/ALT ao analitos_catalogo
INSERT INTO analitos_catalogo
  (codigo, nome, grupo, unidade_padrao_integrativa, terco_excelente, observacao_clinica)
VALUES
  ('TGP_ALT','TGP / ALT','HEPATICO','U/L','INFERIOR',
   'Marcador hepático mais específico. Alvo MI: <30 U/L. Acima = verificar gordura hepática.')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES ('TGP_ALT','TGP / ALT (Alanina Aminotransferase)','EXAME','ANUAL','U/L',
  17,23,30,56,
  'MI: <30. Acima de 30 = verificar gordura hepática. Terços: 0-17 ótimo | 17-23 med | 23-30 pior. BAIXO=melhor.')
ON CONFLICT (codigo) DO NOTHING;

-- Adicionar Hemoglobina ao analitos_catalogo
INSERT INTO analitos_catalogo
  (codigo, nome, grupo, unidade_padrao_integrativa, terco_excelente, observacao_clinica)
VALUES
  ('HGB_H','Hemoglobina (Homem)','HEMATOLOGICO','g/dL','SUPERIOR',
   'Capacidade de transporte de O2. Alvo MI: 16-17 g/dL para performance e longevidade.')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO parametros_referencia_global
  (codigo, label, tipo, periodo, unidade_medida,
   faixa_critica_max, faixa_baixa_max, faixa_media_max, faixa_superior_max, observacao)
VALUES ('HGB_H','Hemoglobina (Homem)','EXAME','ANUAL','g/dL',
  14,15,16,17,
  'MI: alvo 16-17. <14=anemia. Terços: 14-15 inf | 15-16 med | 16-17 sup. ALTO=melhor.')
ON CONFLICT (codigo) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- VERIFICAÇÃO — rodar após seed para confirmar
-- ═══════════════════════════════════════════════════════════
-- SELECT codigo, label, faixa_critica_max, faixa_baixa_max,
--        faixa_media_max, faixa_superior_max
-- FROM parametros_referencia_global
-- WHERE tipo = 'EXAME'
-- ORDER BY codigo;
--
-- Resultado esperado: ~71 linhas (17 originais + 41 seed v1 + novos v2)
-- ═══════════════════════════════════════════════════════════

-- ATUALIZA direcao_favoravel_exame para os marcadores onde BAIXO é melhor
-- (se já não existirem)
INSERT INTO direcao_favoravel_exame (nome_exame, direcao_favoravel, grupo_exame, descricao)
VALUES
  ('TSH','INFERIOR','HORMONIO','TSH baixo dentro da faixa = tireóide mais ativa = melhor'),
  ('PCR_ULTRA','INFERIOR','INFLAMATORIO','PCR baixo = menos inflamação = melhor'),
  ('HOMOCISTEINA','INFERIOR','INFLAMATORIO','Homocisteína baixa = menor risco cardiovascular'),
  ('INSULINA','INFERIOR','GLICEMICO','Insulina baixa = maior sensibilidade insulínica'),
  ('GLICOSE_JEJUM','INFERIOR','GLICEMICO','Glicose baixa em jejum = melhor controle glicêmico'),
  ('HBA1C','INFERIOR','GLICEMICO','HbA1c baixa = melhor controle glicêmico crônico'),
  ('LDL','INFERIOR','CARDIOMETABOLICO','LDL baixo = menor risco aterosclerótico'),
  ('TRIGLICERIDES','INFERIOR','CARDIOMETABOLICO','Triglicérides baixos = melhor perfil metabólico'),
  ('PSA_TOTAL','INFERIOR','ONCOLOGICO','PSA baixo = menor risco prostático'),
  ('TGO_AST','INFERIOR','HEPATICO','AST baixa = fígado mais saudável'),
  ('TGP_ALT','INFERIOR','HEPATICO','ALT baixa = fígado mais saudável'),
  ('SHBG','INFERIOR','HORMONIO','SHBG baixo = mais testosterona livre disponível')
ON CONFLICT (nome_exame) DO NOTHING;
