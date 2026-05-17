-- Migration 069 — Correcao de referencias quebradas no motor clinico
-- Problema: 35/37 regras em regras_motor apontam para codigos que nao existem
-- em itens_terapeuticos. O motor existia e funcionava, mas retornava sugestoes
-- sem nome/descricao (fallback para o codigo cru).
-- Solucao: INSERT idempotente dos itens faltando + UPDATE dos injetaveis
-- cujos codigos existem com nomes diferentes.
-- Regra ferro: psql IF NOT EXISTS / ON CONFLICT DO NOTHING — nunca destrutivo.
-- Aplicado em: 2026-05-15 por Dr. Replit (correcao pra operacao segunda-feira)

-- ============================================================
-- BLOCO 1 — PAINEIS DE EXAME (8 paineis-bloco que o motor sugere)
-- O motor sugere paineis (grupos semanticos), nao exames individuais.
-- Cada painel representa um conjunto de exames do mesmo eixo.
-- ============================================================

INSERT INTO itens_terapeuticos
  (nome, descricao, categoria, sub_categoria, disponivel, codigo_padcom,
   bloco_id, grau, area_semantica, exige_validacao_humana)
VALUES
  (
    'PAINEL TIREOIDE BASICO',
    'TSH + T3 Livre + T4 Livre — rastreio inicial de disfuncao tireoidiana',
    'exame', 'painel', true, 'EXAM TIRE BASI 001',
    'BLK002', 'GRADE BASICA', 'TIREOIDE', false
  ),
  (
    'PAINEL TIREOIDE AMPLIADO',
    'TSH + T3L + T4L + Anti-TPO + Anti-TG + T3 Reverso + PTH — avaliacao completa autoimune tireoidiana',
    'exame', 'painel', true, 'EXAM TIRE AMPL 001',
    'BLK002', 'GRADE AMPLIADA', 'TIREOIDE', false
  ),
  (
    'PAINEL BASE INTEGRATIVA',
    'Hemograma + Glicemia + Ferritina + Fe Serico + TGO + TGP + GGT + Creatinina + Ureia + Vit D + Vit B12',
    'exame', 'painel', true, 'EXAM BASE BASI 001',
    'BLK001', 'GRADE BASICA', 'BASE', false
  ),
  (
    'PAINEL GLICEMICO AMPLIADO',
    'Glicemia jejum + Insulina + HOMA-IR + HbA1c + Peptideo C — avaliacao completa resistencia insulinica',
    'exame', 'painel', true, 'EXAM GLIC AMPL 001',
    'BLK003', 'GRADE AMPLIADA', 'METABOLICO', false
  ),
  (
    'PAINEL GLICEMICO BASICO',
    'Glicemia jejum + Insulina + HOMA-IR — rastreio inicial metabolico',
    'exame', 'painel', true, 'EXAM GLIC BASI 001',
    'BLK003', 'GRADE BASICA', 'METABOLICO', false
  ),
  (
    'PAINEL AUTOIMUNE BASICO',
    'FAN + Fator Reumatoide + PCR ultra-sensivel + Complemento C3/C4 — rastreio autoimune',
    'exame', 'painel', true, 'EXAM AUTO BASI 001',
    'BLK007', 'GRADE BASICA', 'AUTOIMUNE', false
  ),
  (
    'PAINEL LIPIDICO BASICO',
    'Colesterol Total + LDL + HDL + Triglicerideos — perfil cardiovascular basico',
    'exame', 'painel', true, 'EXAM LIPI BASI 001',
    'BLK004', 'GRADE BASICA', 'CARDIOVASCULAR', false
  ),
  (
    'PAINEL GONADAL BASICO',
    'Testosterona Total + FSH + LH + Prolactina + SHBG — avaliacao eixo gonadal',
    'exame', 'painel', true, 'EXAM GONA BASI 001',
    'BLK006', 'GRADE BASICA', 'HORMONAL', false
  )
ON CONFLICT (codigo_padcom) DO NOTHING;

-- ============================================================
-- BLOCO 2 — FORMULAS FALTANDO (2 formulas que o motor referencia
-- mas nao existiam em itens_terapeuticos)
-- ============================================================

INSERT INTO itens_terapeuticos
  (nome, descricao, categoria, sub_categoria, disponivel, codigo_padcom,
   area_semantica, exige_validacao_humana)
VALUES
  (
    'FORMULA METABOLICA MITOCONDRIAL',
    'Coenzima Q10 + PQQ + L-Carnitina + Alpha Lipoico + NAD precursor — suporte mitocondrial e energia celular',
    'formula', 'manipulado', true, 'FORM META MITO 001',
    'METABOLICO', false
  ),
  (
    'FORMULA MODULACAO GLICOSE INSULINA',
    'Berberina + Cromo + ALA + Inositol + Canela — modulacao da resistencia insulinica e glicemia',
    'formula', 'manipulado', true, 'FORM GLIC INSU 001',
    'METABOLICO', false
  )
ON CONFLICT (codigo_padcom) DO NOTHING;

-- ============================================================
-- BLOCO 3 — INJETAVEIS: atualizar motor rules para usar codigos
-- que JA EXISTEM em itens_terapeuticos (remapeamento semantico)
-- INJE META B12C 001 → INJE VITA METI 001 (Metilcobalamina 500mcg)
-- INJE VITA CEND 001 → INJE IMUN VITA 001 (Vitamina C 400mg)
-- ============================================================

UPDATE regras_motor
SET codigo_referencia = 'INJE VITA METI 001'
WHERE codigo_referencia = 'INJE META B12C 001'
  AND ativo = 'SIM';

UPDATE regras_motor
SET codigo_referencia = 'INJE IMUN VITA 001'
WHERE codigo_referencia = 'INJE VITA CEND 001'
  AND ativo = 'SIM';

-- ============================================================
-- VERIFICACAO FINAL — deve retornar 0 referencias quebradas
-- (deixado como comentario para rodar manualmente se necessario)
-- SELECT rm.regra_id, rm.segmento, rm.codigo_referencia,
--        CASE WHEN it.id IS NULL THEN 'QUEBRADA' ELSE 'OK' END
-- FROM regras_motor rm
-- LEFT JOIN itens_terapeuticos it ON it.codigo_padcom = rm.codigo_referencia
-- WHERE rm.ativo = 'SIM'
-- ORDER BY 4 DESC;
-- ============================================================
