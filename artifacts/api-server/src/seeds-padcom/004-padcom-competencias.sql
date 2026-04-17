-- ============================================================
-- SEED: padcom_competencias_regulatorias — Catálogo de itens
-- Onda 2 / P1 — Score Competência Reguladora
-- Idempotente: usa ON CONFLICT DO NOTHING (codigo é a chave lógica)
-- ============================================================

INSERT INTO padcom_competencias_regulatorias
  (id, codigo, nome, descricao, categoria, competencia_minima, niveis_cascata, risk_level, exige_certificado_digital, ativo)
VALUES
  -- FÓRMULAS ORAIS (auto-dispensáveis pelo farmacêutico) — N1
  (gen_random_uuid(), 'coq10_100mg_oral', 'CoQ10 100mg cápsula', 'Coenzima Q10 100mg, uso oral diário', 'formula_oral', 'farmaceutico', '["N1"]'::jsonb, 1, false, true),
  (gen_random_uuid(), 'vitamina_d3_10000ui', 'Vitamina D3 10.000UI', 'Colecalciferol 10000UI cápsula', 'formula_oral', 'farmaceutico', '["N1"]'::jsonb, 1, false, true),
  (gen_random_uuid(), 'omega3_1g', 'Ômega 3 1g', 'EPA+DHA 1g cápsula', 'formula_oral', 'farmaceutico', '["N1"]'::jsonb, 1, false, true),
  (gen_random_uuid(), 'magnesio_quelado_200mg', 'Magnésio Quelado 200mg', 'Magnésio bisglicinato 200mg', 'formula_oral', 'farmaceutico', '["N1"]'::jsonb, 1, false, true),
  (gen_random_uuid(), 'b12_metilcobalamina_5000', 'B12 Metilcobalamina 5000mcg', 'Vitamina B12 sublingual', 'formula_oral', 'farmaceutico', '["N1"]'::jsonb, 1, false, true),

  -- INJETÁVEIS IM/EV (exigem médico) — N3
  (gen_random_uuid(), 'b12_im_5000', 'B12 IM 5000mcg', 'Cianocobalamina injetável intramuscular', 'injetavel_im_ev', 'medico', '["N3"]'::jsonb, 3, true, true),
  (gen_random_uuid(), 'glutationa_ev_2g', 'Glutationa EV 2g', 'Antioxidante endovenoso', 'injetavel_im_ev', 'medico', '["N3"]'::jsonb, 4, true, true),
  (gen_random_uuid(), 'vitamina_c_ev_25g', 'Vitamina C EV 25g', 'Megadose endovenosa', 'injetavel_im_ev', 'medico', '["N3"]'::jsonb, 4, true, true),
  (gen_random_uuid(), 'taurina_ev_2g', 'Taurina EV 2g', 'Aminoácido endovenoso', 'injetavel_im_ev', 'medico', '["N3"]'::jsonb, 3, true, true),
  (gen_random_uuid(), 'nad_ev_500mg', 'NAD+ EV 500mg', 'Coenzima endovenosa de longa duração', 'injetavel_im_ev', 'medico', '["N3"]'::jsonb, 5, true, true),

  -- IMPLANTES (exigem médico + preceptor) — N3 com cascata completa
  (gen_random_uuid(), 'implante_testosterona_100mg', 'Implante Testosterona 100mg', 'Implante hormonal subcutâneo', 'implante', 'preceptor', '["N3"]'::jsonb, 5, true, true),
  (gen_random_uuid(), 'implante_estradiol_50mg', 'Implante Estradiol 50mg', 'Implante hormonal feminino', 'implante', 'preceptor', '["N3"]'::jsonb, 5, true, true),
  (gen_random_uuid(), 'implante_gestrinona_10mg', 'Implante Gestrinona 10mg', 'Implante para endometriose', 'implante', 'preceptor', '["N3"]'::jsonb, 5, true, true),

  -- EXAMES (médico solicita) — N2
  (gen_random_uuid(), 'hemograma_completo', 'Hemograma Completo', 'Análise sanguínea básica', 'exame', 'medico', '["N2"]'::jsonb, 2, false, true),
  (gen_random_uuid(), 'vitamina_d_25oh', 'Vitamina D 25-OH', 'Dosagem sérica', 'exame', 'medico', '["N2"]'::jsonb, 2, false, true),
  (gen_random_uuid(), 'ferritina', 'Ferritina', 'Reserva de ferro', 'exame', 'medico', '["N2"]'::jsonb, 2, false, true),
  (gen_random_uuid(), 'tsh_t4l', 'TSH + T4 livre', 'Função tireoidiana', 'exame', 'medico', '["N2"]'::jsonb, 2, false, true),
  (gen_random_uuid(), 'painel_hormonal_completo', 'Painel Hormonal Completo', 'Estradiol, testosterona, DHEA, cortisol', 'exame', 'medico', '["N2"]'::jsonb, 3, false, true),

  -- ORIENTAÇÕES (enfermeira/consultora) — N1
  (gen_random_uuid(), 'orient_dieta_anti_inflam', 'Orientação Dieta Anti-Inflamatória', 'Cardápio educativo', 'orientacao', 'enfermeiro', '["N1"]'::jsonb, 1, false, true),
  (gen_random_uuid(), 'orient_atividade_fisica', 'Orientação Atividade Física', 'Plano de movimento mínimo', 'orientacao', 'enfermeiro', '["N1"]'::jsonb, 1, false, true),
  (gen_random_uuid(), 'orient_higiene_sono', 'Orientação Higiene do Sono', 'Protocolo de sono reparador', 'orientacao', 'enfermeiro', '["N1"]'::jsonb, 1, false, true)
ON CONFLICT DO NOTHING;
