-- Seed 006 — TSUNAMI PAWARDS · Sangue real
-- Idempotente. Popula PARMAVAULT (farmácias + receitas), PARCLAIM (metas),
-- pacientes fictícios massivos, médicos por clínica, prescrições, snapshots KPI.

-- (sem BEGIN/COMMIT global — cada bloco autônomo, evita rollback total se um falhar)

-- ============================================================
-- 1. FARMÁCIAS PARMAVAULT (3 parceiras)
-- ============================================================
INSERT INTO farmacias_parmavault (nome_fantasia, razao_social, cnpj, cidade, estado,
  meta_receitas_semana, meta_receitas_mes, meta_valor_mes, percentual_comissao, parceira_desde)
SELECT * FROM (VALUES
  ('FAMA Manipulação',          'FAMA FARMACIA MAGISTRAL LTDA',     '12345678000101', 'São Paulo', 'SP', 280, 1200, 380000.00, 30.0, '2024-03-15'::date),
  ('Magistral Pague Menos',     'PAGUE MENOS MAGISTRAL LTDA',       '23456789000102', 'São Paulo', 'SP', 150, 650,  185000.00, 27.5, '2024-08-01'::date),
  ('Maven Manipulação Premium', 'MAVEN MANIPULACAO PREMIUM LTDA',   '34567890000103', 'São Paulo', 'SP', 90,  400,  155000.00, 32.0, '2025-01-10'::date)
) AS v(nome, razao, cnpj, cid, est, mrw, mrm, mvm, pc, pd)
WHERE NOT EXISTS (SELECT 1 FROM farmacias_parmavault f WHERE f.cnpj = v.cnpj);

-- ============================================================
-- 2. MÉDICOS (5 por clínica = 25 médicos)
-- senha = bcrypt placeholder (ninguém faz login com isso, é seed)
-- ============================================================
WITH clinicas AS (
  SELECT id, slug FROM unidades WHERE fat_meta_mensal > 0 ORDER BY id
), medicos_seed AS (
  SELECT
    c.id AS unidade_id,
    c.slug,
    nome,
    crm,
    esp,
    ROW_NUMBER() OVER (PARTITION BY c.id) AS n
  FROM clinicas c
  CROSS JOIN LATERAL (VALUES
    ('Dr. Mariana Albuquerque',   '152340/SP', 'Endocrinologia'),
    ('Dr. Rafael Toledo',         '163455/SP', 'Medicina Integrativa'),
    ('Dra. Camila Vasconcelos',   '174566/SP', 'Ginecologia'),
    ('Dr. Henrique Salgado',      '185677/SP', 'Clínica Geral'),
    ('Dra. Beatriz Montenegro',   '196788/SP', 'Nutrologia')
  ) AS m(nome, crm, esp)
)
INSERT INTO usuarios (nome, email, senha, perfil, unidade_id, crm, especialidade, escopo, pode_validar, pode_assinar)
SELECT
  m.nome,
  lower(m.slug || '.med' || m.n || '@pawards.com.br'),
  '$2b$10$seeddummyhashSEED006plchldrXXXXXXXXXXXXXXXX',
  'medico',
  m.unidade_id,
  m.crm,
  m.esp,
  'medico_clinica',
  true,
  true
FROM medicos_seed m
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. PACIENTES (300 por clínica = 1500 pacientes)
-- nomes pt-BR plausíveis, idades 18-78, com peso/altura/CPF placeholder
-- ============================================================
WITH primeiros AS (
  SELECT unnest(ARRAY[
    'Ana','Beatriz','Carla','Daniela','Eduarda','Fernanda','Gabriela','Helena','Isabela','Juliana',
    'Karina','Larissa','Mariana','Natália','Olívia','Patrícia','Renata','Sofia','Tatiana','Vanessa',
    'Adriano','Bruno','Carlos','Diego','Eduardo','Felipe','Gustavo','Henrique','Igor','João',
    'Lucas','Marcelo','Nelson','Otávio','Paulo','Rafael','Sérgio','Thiago','Vinícius','Wagner',
    'Cristiane','Débora','Elaine','Flávia','Giovana','Heloísa','Iracema','Jéssica','Letícia','Marina',
    'Aline','Bianca','Camila','Denise','Elisa','Fabiana','Glória','Hortência','Inês','Joana'
  ]) AS pri
), sobrenomes AS (
  SELECT unnest(ARRAY[
    'Silva','Santos','Oliveira','Souza','Rodrigues','Ferreira','Almeida','Costa','Gomes','Martins',
    'Araújo','Pereira','Carvalho','Ribeiro','Barbosa','Cardoso','Pinto','Moreira','Lima','Mendes',
    'Vieira','Castro','Nogueira','Macedo','Sales','Andrade','Cunha','Teixeira','Moura','Coelho',
    'Cavalcanti','Rocha','Borges','Tavares','Nascimento','Fonseca','Monteiro','Cordeiro','Câmara','Marques'
  ]) AS sob
), pacientes_seed AS (
  SELECT
    u.id AS unidade_id,
    u.slug,
    g.n AS seq,
    (SELECT pri FROM primeiros ORDER BY random() LIMIT 1) AS primeiro,
    (SELECT sob FROM sobrenomes ORDER BY random() LIMIT 1) AS sobrenome1,
    (SELECT sob FROM sobrenomes ORDER BY random() LIMIT 1) AS sobrenome2
  FROM unidades u
  CROSS JOIN generate_series(1, 300) AS g(n)
  WHERE u.fat_meta_mensal > 0
)
INSERT INTO pacientes (
  nome, cpf, data_nascimento, telefone, email, unidade_id, status_ativo, genero,
  altura_cm, peso_kg, cidade, estado, plano_acompanhamento
)
SELECT
  p.primeiro || ' ' || p.sobrenome1 || ' ' || p.sobrenome2,
  -- CPF pseudo (não validado, apenas placeholder)
  lpad(((p.unidade_id * 100000) + p.seq)::text, 11, '0'),
  (CURRENT_DATE - ((18 + floor(random() * 60))::int * 365 + floor(random() * 365))::int)::date,
  '11' || lpad(floor(random() * 900000000 + 100000000)::text, 9, '0'),
  lower(p.primeiro) || '.' || lower(p.sobrenome1) || p.seq || '@example.com',
  p.unidade_id,
  random() > 0.08,  -- 92% ativos
  CASE WHEN random() < 0.55 THEN 'feminino'
       WHEN random() < 0.95 THEN 'masculino'
       ELSE 'nao_informado' END,
  150 + floor(random() * 35)::int,
  ROUND((50 + random() * 50)::numeric, 2)::numeric(5,2),
  'São Paulo',
  'SP',
  CASE WHEN random() < 0.5 THEN 'cobre'
       WHEN random() < 0.85 THEN 'prata'
       ELSE 'ouro' END
FROM pacientes_seed p
WHERE NOT EXISTS (
  SELECT 1 FROM pacientes existente
  WHERE existente.cpf = lpad(((p.unidade_id * 100000) + p.seq)::text, 11, '0')
);

-- ============================================================
-- 4. METAS PARCLAIM (5 clínicas × 3 farmácias = 15 metas)
-- ============================================================
WITH cl AS (SELECT id, fat_meta_mensal FROM unidades WHERE fat_meta_mensal > 0),
     fa AS (SELECT id, meta_receitas_mes FROM farmacias_parmavault WHERE ativo)
INSERT INTO parclaim_metas_clinica (
  unidade_id, farmacia_id,
  receitas_minimas_semana, receitas_meta_semana,
  valor_minimo_semana, valor_meta_semana
)
SELECT
  cl.id,
  fa.id,
  GREATEST(5, FLOOR(fa.meta_receitas_mes / 4 / 5))::int,   -- mínimo: 1/5 da fatia da farmácia / 4 semanas
  GREATEST(15, FLOOR(fa.meta_receitas_mes / 4 / 3))::int,  -- meta: 1/3 da fatia
  ROUND(cl.fat_meta_mensal * 0.04, 2),                     -- mínimo R$ semanal = 4% da meta da clínica
  ROUND(cl.fat_meta_mensal * 0.08, 2)                      -- meta R$ semanal = 8% da meta da clínica
FROM cl, fa
ON CONFLICT (unidade_id, farmacia_id) DO NOTHING;

-- ============================================================
-- 5. RECEITAS PARMAVAULT (90 dias × ~30/dia/farmácia = ~8000 receitas)
-- distribuídas pelas 5 clínicas, ligadas a pacientes e blends reais
-- ============================================================
WITH base AS (
  SELECT
    f.id AS farmacia_id,
    f.percentual_comissao,
    u.id AS unidade_id,
    g.dia,
    -- número de receitas por dia/farmácia/clínica: varia 1-12
    (1 + floor(random() * 12))::int AS qtd
  FROM farmacias_parmavault f
  CROSS JOIN unidades u
  CROSS JOIN generate_series(0, 89) AS g(dia)
  WHERE u.fat_meta_mensal > 0 AND f.ativo
),
expandido AS (
  SELECT b.farmacia_id, b.percentual_comissao, b.unidade_id, b.dia, gen.n
  FROM base b
  CROSS JOIN LATERAL generate_series(1, b.qtd) AS gen(n)
),
com_blend AS (
  SELECT
    e.*,
    -- pega blend aleatório precificado
    (SELECT id FROM formula_blend WHERE valor_brl IS NOT NULL ORDER BY random() LIMIT 1) AS blend_id,
    (SELECT valor_brl FROM formula_blend WHERE valor_brl IS NOT NULL ORDER BY random() LIMIT 1) AS valor_blend
  FROM expandido e
),
com_paciente AS (
  SELECT
    cb.*,
    (SELECT id FROM pacientes WHERE unidade_id = cb.unidade_id AND status_ativo
       ORDER BY random() LIMIT 1) AS paciente_id,
    (SELECT id FROM usuarios WHERE unidade_id = cb.unidade_id AND perfil = 'medico'
       ORDER BY random() LIMIT 1) AS medico_id
  FROM com_blend cb
)
INSERT INTO parmavault_receitas (
  farmacia_id, unidade_id, paciente_id, medico_id,
  numero_receita, emitida_em, entregue_em, status,
  valor_formula_estimado, valor_formula_real, comissao_estimada, comissao_paga, blend_id
)
SELECT
  cp.farmacia_id,
  cp.unidade_id,
  cp.paciente_id,
  cp.medico_id,
  'PMV-' || cp.farmacia_id || '-' || cp.unidade_id || '-' || cp.dia || '-' || cp.n,
  (CURRENT_DATE - cp.dia)::timestamptz + (floor(random() * 12 + 8) || ' hours')::interval,
  CASE WHEN cp.dia > 2 THEN
    (CURRENT_DATE - cp.dia + 2)::timestamptz + (floor(random() * 8 + 9) || ' hours')::interval
  ELSE NULL END,
  CASE
    WHEN cp.dia > 2 AND random() < 0.85 THEN 'entregue'
    WHEN cp.dia > 0 AND random() < 0.70 THEN 'retirada'
    WHEN random() < 0.05 THEN 'cancelada'
    ELSE 'emitida'
  END,
  ROUND((cp.valor_blend * (1 + floor(random() * 4)))::numeric, 2),  -- 1 a 4 blocos
  CASE WHEN cp.dia > 2 THEN ROUND((cp.valor_blend * (1 + floor(random() * 4)) * (0.95 + random() * 0.10))::numeric, 2) ELSE NULL END,
  ROUND((cp.valor_blend * (1 + floor(random() * 4)) * cp.percentual_comissao / 100.0)::numeric, 2),
  cp.dia > 30 AND random() < 0.80,
  cp.blend_id
FROM com_paciente cp
WHERE cp.paciente_id IS NOT NULL AND cp.medico_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. PRESCRIÇÕES (200 prescrições, 40 por clínica)
-- ============================================================
WITH base AS (
  SELECT
    u.id AS unidade_id,
    g.n
  FROM unidades u
  CROSS JOIN generate_series(1, 40) AS g(n)
  WHERE u.fat_meta_mensal > 0
),
com_pm AS (
  SELECT
    b.unidade_id,
    b.n,
    (SELECT id FROM pacientes WHERE unidade_id = b.unidade_id AND status_ativo
       ORDER BY random() LIMIT 1) AS paciente_id,
    (SELECT id FROM usuarios WHERE unidade_id = b.unidade_id AND perfil='medico'
       ORDER BY random() LIMIT 1) AS medico_id
  FROM base b
)
INSERT INTO prescricoes (paciente_id, medico_id, unidade_id, data_emissao, duracao_dias, status, origem, emitida_em)
SELECT
  cp.paciente_id,
  cp.medico_id,
  cp.unidade_id,
  (CURRENT_DATE - floor(random() * 60)::int)::date,
  (30 + floor(random() * 60))::int,
  CASE WHEN random() < 0.7 THEN 'emitida' WHEN random() < 0.9 THEN 'validada' ELSE 'rascunho' END,
  'CONSULTA',
  (CURRENT_DATE - floor(random() * 60)::int)::timestamptz + (floor(random() * 8 + 9) || ' hours')::interval
FROM com_pm cp
WHERE cp.paciente_id IS NOT NULL AND cp.medico_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM prescricoes p
    WHERE p.paciente_id = cp.paciente_id
      AND p.data_emissao = (CURRENT_DATE - floor(random() * 60)::int)::date
  );

-- ============================================================
-- 7. SNAPSHOTS KPI globais (30 snapshots, 1 por dia, últimos 30 dias)
-- ============================================================
INSERT INTO kpi_global_snapshot (
  snapshot_em, total_clinicas, total_pacientes, fat_realizado_mes,
  fat_meta_total_mes, fat_minimo_total_mes, fat_maximo_total_mes, media_nps, media_ocupacao,
  total_consultas_hoje, total_receitas_fama_mes, comissao_magistral_total,
  clinica_topo_id, clinica_lanterna_id
)
SELECT
  (CURRENT_DATE - g.dia)::timestamptz + interval '20 hours',
  (SELECT count(*) FROM unidades WHERE fat_meta_mensal > 0),
  (SELECT count(*) FROM pacientes WHERE status_ativo),
  COALESCE((SELECT SUM(valor_realizado) FROM faturamento_diario
    WHERE data BETWEEN date_trunc('month', CURRENT_DATE - g.dia) AND (CURRENT_DATE - g.dia)), 0),
  (SELECT SUM(fat_meta_mensal)   FROM unidades WHERE fat_meta_mensal > 0),
  (SELECT SUM(fat_minimo_mensal) FROM unidades WHERE fat_meta_mensal > 0),
  (SELECT SUM(fat_maximo_mensal) FROM unidades WHERE fat_meta_mensal > 0),
  78 + (random() * 8)::numeric,
  70 + (random() * 12)::numeric,
  COALESCE((SELECT SUM(consultas_realizadas) FROM faturamento_diario
    WHERE data = CURRENT_DATE - g.dia), 0),
  COALESCE((SELECT SUM(receitas_fama_count) FROM faturamento_diario
    WHERE data BETWEEN date_trunc('month', CURRENT_DATE - g.dia) AND (CURRENT_DATE - g.dia)), 0),
  COALESCE((SELECT SUM(comissao_magistral_estimada) FROM faturamento_diario
    WHERE data BETWEEN date_trunc('month', CURRENT_DATE - g.dia) AND (CURRENT_DATE - g.dia)), 0),
  (SELECT unidade_id FROM faturamento_diario
    WHERE data BETWEEN date_trunc('month', CURRENT_DATE - g.dia) AND (CURRENT_DATE - g.dia)
    GROUP BY unidade_id ORDER BY SUM(valor_realizado) DESC LIMIT 1),
  (SELECT unidade_id FROM faturamento_diario
    WHERE data BETWEEN date_trunc('month', CURRENT_DATE - g.dia) AND (CURRENT_DATE - g.dia)
    GROUP BY unidade_id ORDER BY SUM(valor_realizado) ASC LIMIT 1)
FROM generate_series(0, 29) AS g(dia)
WHERE NOT EXISTS (
  SELECT 1 FROM kpi_global_snapshot
  WHERE date(snapshot_em) = (CURRENT_DATE - g.dia)
);

-- Sumário final
SELECT
  (SELECT count(*) FROM farmacias_parmavault)         AS farmacias_pmv,
  (SELECT count(*) FROM parmavault_receitas)          AS receitas_pmv,
  (SELECT count(*) FROM parclaim_metas_clinica)       AS metas_parclaim,
  (SELECT count(*) FROM pacientes WHERE status_ativo) AS pacientes_ativos,
  (SELECT count(*) FROM usuarios WHERE perfil='medico') AS medicos,
  (SELECT count(*) FROM prescricoes)                  AS prescricoes,
  (SELECT count(*) FROM kpi_global_snapshot)          AS snapshots;
