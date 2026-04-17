-- ============================================================
-- SEED: padcom_alertas_regras — 8 regras default
-- PADCOM V15 — Anamnese Integrativa Estruturada
-- Idempotente: usa ON CONFLICT DO NOTHING
-- ============================================================

INSERT INTO padcom_alertas_regras (id, nome, descricao, condicao, acao_json, severidade, ativo)
VALUES
  (gen_random_uuid(), 'Score crítico (banda vermelha)', 'Score >= 76', '{"campo":"score_final","operador":">=","valor":76}'::jsonb,
   '{"mensagem":"URGENTE: Paciente {{paciente_nome}} atingiu score {{score_final}} (banda vermelha). Requer avaliação médica imediata."}'::jsonb, 'critica', true),
  (gen_random_uuid(), 'Score elevado (banda laranja)', 'Score 51-75', '{"campo":"score_final","operador":"between","valor":[51,75]}'::jsonb,
   '{"mensagem":"ATENÇÃO: Paciente {{paciente_nome}} score {{score_final}} (banda laranja). Conduta protocolar com acompanhamento próximo."}'::jsonb, 'alta', true),
  (gen_random_uuid(), 'Score moderado (banda amarela)', 'Score 26-50', '{"campo":"score_final","operador":"between","valor":[26,50]}'::jsonb,
   '{"mensagem":"Paciente {{paciente_nome}} score {{score_final}} (banda amarela). Suplementação intermediária e revisão em 60 dias."}'::jsonb, 'media', true),
  (gen_random_uuid(), 'Abandono no módulo 1', 'Sessão iniciada e não finalizada com último módulo = 1', '{"campo":"ultimo_modulo_visitado","operador":"=","valor":1,"status":"em_andamento"}'::jsonb,
   '{"mensagem":"Paciente {{paciente_nome}} abandonou o questionário no módulo 1. Acionar consultora para retomada."}'::jsonb, 'baixa', true),
  (gen_random_uuid(), 'Sintomas digestivos críticos', 'Score módulo 3 alto', '{"campo":"score_modulo_3","operador":">=","valor":15}'::jsonb,
   '{"mensagem":"Paciente {{paciente_nome}} apresenta queixas digestivas significativas. Considerar protocolo gut-restoration."}'::jsonb, 'media', true),
  (gen_random_uuid(), 'Saúde mental em risco', 'Score módulo 4 alto', '{"campo":"score_modulo_4","operador":">=","valor":15}'::jsonb,
   '{"mensagem":"Paciente {{paciente_nome}} apresenta sinais de comprometimento de saúde mental/sono. Considerar protocolo neuro-modulação."}'::jsonb, 'alta', true),
  (gen_random_uuid(), 'Polifarmácia detectada', 'Uso de 5+ medicamentos contínuos', '{"campo":"medicamentos_continuos_count","operador":">=","valor":5}'::jsonb,
   '{"mensagem":"Paciente {{paciente_nome}} em polifarmácia. Avaliar interações medicamentosas antes de prescrever."}'::jsonb, 'alta', true),
  (gen_random_uuid(), 'Hábitos de risco múltiplos', 'Score módulo 1 alto', '{"campo":"score_modulo_1","operador":">=","valor":18}'::jsonb,
   '{"mensagem":"Paciente {{paciente_nome}} apresenta múltiplos hábitos de risco. Plano de mudança comportamental prioritário."}'::jsonb, 'media', true)
ON CONFLICT DO NOTHING;
