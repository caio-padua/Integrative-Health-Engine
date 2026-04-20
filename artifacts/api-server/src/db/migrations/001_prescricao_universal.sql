-- =====================================================================
-- Migration 001 — Onda PRESCRIÇÃO UNIVERSAL PADCON
-- Diretrizes Caio (gravadas em pedra):
--   1. Unidade canônica = DOSE (nunca "comprimido"/"cápsula" no domínio)
--   2. Bloco pode ser MANIPULADO, INDUSTRIALIZADO ou MANIPULADO_DE_INDUSTRIALIZADO
--   3. Período é obrigatório; horário é OPCIONAL (sobrescreve janela do período)
--   4. Posologia varia por SEMANA, e cada semana pode estar "ativa" ou "não ativada"
--   5. Título do cartão = 3 retângulos: CATEGORIA + ABREV-4-LETRAS + APELIDO
--   6. Cor por tipo de receita (norma sanitária + convenção da clínica)
--   7. Pré-seleção pelo motor → médico aceita / tira / acrescenta blocos
--   8. Tipos de receita catalogados (ANVISA + clínica): Branca Simples, B1, B2,
--      A1, A2, A3, Lilás Hormônios, Verde Fito, Magistral
-- Idempotente. Não destrói nada.
-- =====================================================================

-- ===== 1. CATÁLOGO DE TIPOS DE RECEITA (ANVISA + convenção PADCON) =====
CREATE TABLE IF NOT EXISTS tipos_receita_anvisa (
  id serial PRIMARY KEY,
  codigo text UNIQUE NOT NULL,
  nome text NOT NULL,
  cor_visual text NOT NULL,        -- 'roxo','vermelho','azul','amarelo','lilas','verde','branco'
  cor_hex text NOT NULL,
  vias_obrigatorias int NOT NULL DEFAULT 1,
  retem_via boolean NOT NULL DEFAULT false,
  validade_dias int,               -- 30 (B1/B2), 30 (A2/A3), 5 (A1) - null = sem prazo legal
  norma_legal text,
  exige_carimbo boolean NOT NULL DEFAULT true,
  observacoes text,
  ordem int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true
);

-- ===== 2. GRUPOS / SUBGRUPOS CLÍNICOS (a árvore da biblioteca) =====
CREATE TABLE IF NOT EXISTS grupos_clinicos (
  id serial PRIMARY KEY,
  codigo text UNIQUE NOT NULL,
  nome text NOT NULL,
  cor_hex text,
  emoji text,
  ordem int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS subgrupos_clinicos (
  id serial PRIMARY KEY,
  grupo_id int NOT NULL REFERENCES grupos_clinicos(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  nome text NOT NULL,
  ordem int NOT NULL DEFAULT 0,
  UNIQUE(grupo_id, codigo)
);

-- ===== 3. BIBLIOTECA DO MÉDICO — BLOCOS-TEMPLATE =====
-- Aqui mora o "esqueleto" do Caio. O motor sugere a partir daqui.
CREATE TABLE IF NOT EXISTS bloco_template (
  id serial PRIMARY KEY,
  medico_id int REFERENCES usuarios(id),    -- null = template-mestre da clínica
  unidade_id int,
  -- TÍTULO DO CARTÃO (3 retângulos):
  titulo_categoria text NOT NULL,           -- 'FÓRMULA' | 'REMÉDIO' | 'FITO' | 'INJETÁVEL' | 'BLEND'
  titulo_abrev_principal text,              -- 'ASHW' (4 letras do ativo principal)
  titulo_apelido text NOT NULL,             -- 'Libido e Desejo'
  -- CLASSIFICAÇÃO:
  tipo_bloco text NOT NULL,                 -- 'MANIPULADO_FARMACIA','INDUSTRIALIZADO','MANIPULADO_DE_INDUSTRIALIZADO','FITO','BLEND_INJETAVEL'
  tipo_receita_id int REFERENCES tipos_receita_anvisa(id),
  cor_visual text,
  grupo_id int REFERENCES grupos_clinicos(id),
  subgrupo_id int REFERENCES subgrupos_clinicos(id),
  -- ENVELOPE FARMACÊUTICO:
  via_administracao text NOT NULL,          -- 'ORAL','SUBLINGUAL','IM','EV','TOPICA','VAGINAL','INALATORIA','RETAL'
  forma_farmaceutica text,                  -- 'CAPSULA_VEGETAL','CAPSULA_DRcaps','SOLUCAO_ORAL','SACHE','POMADA','AMPOLA','GOTAS'
  veiculo_excipiente text,
  apresentacao text,                        -- '30 doses (30 cápsulas)' / '60ml em 2 frascos de 30ml'
  qtd_doses int,                            -- total no frasco/cartela
  duracao_dias int,
  restricoes_alimentares text,
  observacoes text,
  -- USO:
  favorito boolean NOT NULL DEFAULT false,
  contagem_uso int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_bloco_template_grupo ON bloco_template(grupo_id, subgrupo_id);
CREATE INDEX IF NOT EXISTS ix_bloco_template_medico ON bloco_template(medico_id, favorito DESC);

CREATE TABLE IF NOT EXISTS bloco_template_ativo (
  id serial PRIMARY KEY,
  bloco_template_id int NOT NULL REFERENCES bloco_template(id) ON DELETE CASCADE,
  ordem int NOT NULL,
  nome_ativo text NOT NULL,
  ativo_canonico_id int,                    -- FK futura para tabela de ativos canônicos
  dose_valor numeric NOT NULL,
  dose_unidade text NOT NULL,               -- 'mg','mcg','g','UI','ml','gotas'
  observacao text                           -- 'Lipossomal', 'XR liberação entérica', 'P-5-P'
);

-- LINEARIDADE: cada semana é uma linha; pode estar ATIVA ou NÃO ATIVADA
CREATE TABLE IF NOT EXISTS bloco_template_semana (
  id serial PRIMARY KEY,
  bloco_template_id int NOT NULL REFERENCES bloco_template(id) ON DELETE CASCADE,
  numero_semana int NOT NULL,               -- 1,2,3,4...
  ativa boolean NOT NULL DEFAULT true,      -- false = paciente faz pausa nessa semana
  observacao text,
  UNIQUE(bloco_template_id, numero_semana)
);

-- DOSE DE UMA SEMANA EM UM PERÍODO (com horário OPCIONAL)
CREATE TABLE IF NOT EXISTS bloco_template_dose (
  id serial PRIMARY KEY,
  semana_id int NOT NULL REFERENCES bloco_template_semana(id) ON DELETE CASCADE,
  periodo_id int NOT NULL REFERENCES periodos_dia(id),
  qtd_doses int NOT NULL,                   -- 1 dose, 2 doses, etc.
  hora_especifica time,                     -- opcional; se NULL usa janela do período
  observacao text                           -- 'em jejum', 'com água morna'
);

-- ===== 4. PRESCRIÇÃO REAL EMITIDA AO PACIENTE =====
CREATE TABLE IF NOT EXISTS prescricoes (
  id serial PRIMARY KEY,
  paciente_id int NOT NULL REFERENCES pacientes(id),
  medico_id int NOT NULL REFERENCES usuarios(id),
  unidade_id int,
  consulta_id int,                          -- FK opcional pra sessão/consulta
  data_emissao date NOT NULL DEFAULT CURRENT_DATE,
  duracao_dias int,
  cids text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'rascunho',  -- 'rascunho','emitida','dispensada','cancelada'
  observacoes_gerais text,
  versao int NOT NULL DEFAULT 1,
  prescricao_pai_id int REFERENCES prescricoes(id),  -- renovação / versionamento
  origem text NOT NULL DEFAULT 'CONSULTA',  -- 'CONSULTA','RENOVACAO','MOTOR_SUGESTAO'
  emitida_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_prescricoes_paciente ON prescricoes(paciente_id, data_emissao DESC);
CREATE INDEX IF NOT EXISTS ix_prescricoes_medico ON prescricoes(medico_id, data_emissao DESC);

CREATE TABLE IF NOT EXISTS prescricao_blocos (
  id serial PRIMARY KEY,
  prescricao_id int NOT NULL REFERENCES prescricoes(id) ON DELETE CASCADE,
  ordem int NOT NULL,
  bloco_template_origem_id int REFERENCES bloco_template(id),  -- null = feito do zero
  editado_manualmente boolean NOT NULL DEFAULT false,
  -- SNAPSHOT IMUTÁVEL dos campos (receita emitida não deve mudar se editar template depois):
  titulo_categoria text NOT NULL,
  titulo_abrev_principal text,
  titulo_apelido text NOT NULL,
  tipo_bloco text NOT NULL,
  tipo_receita_id int REFERENCES tipos_receita_anvisa(id),
  cor_visual text,
  via_administracao text NOT NULL,
  forma_farmaceutica text,
  veiculo_excipiente text,
  apresentacao text,
  qtd_doses int,
  duracao_dias int,
  restricoes_alimentares text,
  observacoes text,
  -- DESTINO: comprado pronto OU encaminhado pra manipulação
  destino_dispensacao text NOT NULL DEFAULT 'FARMACIA_COMUM',
  -- 'FARMACIA_COMUM','MANIPULACAO','AMBOS_OPCAO_PACIENTE'
  farmacia_indicada_id int REFERENCES farmacias_parceiras(id)
);
CREATE INDEX IF NOT EXISTS ix_prescricao_blocos_prescricao ON prescricao_blocos(prescricao_id, ordem);

CREATE TABLE IF NOT EXISTS prescricao_bloco_ativos (
  id serial PRIMARY KEY,
  bloco_id int NOT NULL REFERENCES prescricao_blocos(id) ON DELETE CASCADE,
  ordem int NOT NULL,
  nome_ativo text NOT NULL,
  ativo_canonico_id int,
  dose_valor numeric NOT NULL,
  dose_unidade text NOT NULL,
  observacao text
);

CREATE TABLE IF NOT EXISTS prescricao_bloco_semana (
  id serial PRIMARY KEY,
  bloco_id int NOT NULL REFERENCES prescricao_blocos(id) ON DELETE CASCADE,
  numero_semana int NOT NULL,
  ativa boolean NOT NULL DEFAULT true,
  observacao text,
  UNIQUE(bloco_id, numero_semana)
);

CREATE TABLE IF NOT EXISTS prescricao_bloco_dose (
  id serial PRIMARY KEY,
  semana_id int NOT NULL REFERENCES prescricao_bloco_semana(id) ON DELETE CASCADE,
  periodo_id int NOT NULL REFERENCES periodos_dia(id),
  qtd_doses int NOT NULL,
  hora_especifica time,
  observacao text
);
