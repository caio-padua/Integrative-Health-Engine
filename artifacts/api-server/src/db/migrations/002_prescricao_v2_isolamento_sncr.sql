-- =====================================================================
-- Migration 002 — PRESCRIÇÃO PADCON UNIVERSAL v2.0
-- Manifesto Blueprint v2.0 — REGRA 14 (Isolamento Legal de Controlados)
-- + Cotas SNCR + ICP-Brasil A3 + MAFIA-4 deduzido + marcação manipular junto
-- IDEMPOTENTE — todas operações usam IF NOT EXISTS / IF EXISTS / DO blocks.
-- Não destrói nada. Não toca em IDs (todas serial PK preservadas).
-- =====================================================================

-- ===== 1. AMPLIAR prescricao_blocos COM COLUNAS DA REGRA 14 =====
DO $$ BEGIN
  -- Código MAFIA-4 deduzido pelo motor (ex: 'B1__', 'HABN', 'HMIX')
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='prescricao_blocos' AND column_name='codigo_mafia4') THEN
    ALTER TABLE prescricao_blocos ADD COLUMN codigo_mafia4 text;
  END IF;

  -- Sugestão não-vinculante de forma farmacêutica à magistral (REGRA 08)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='prescricao_blocos' AND column_name='forma_farmaceutica_sugestao') THEN
    ALTER TABLE prescricao_blocos ADD COLUMN forma_farmaceutica_sugestao text;
  END IF;

  -- Marcação "MANIPULAR JUNTO — Fórmula Composta {apelido}" (REGRA 14.3)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='prescricao_blocos' AND column_name='marcacao_manipular_junto') THEN
    ALTER TABLE prescricao_blocos ADD COLUMN marcacao_manipular_junto text;
  END IF;

  -- Quando bloco foi explodido pela REGRA 14, este aponta pro bloco original
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='prescricao_blocos' AND column_name='bloco_pai_id') THEN
    ALTER TABLE prescricao_blocos ADD COLUMN bloco_pai_id int REFERENCES prescricao_blocos(id);
  END IF;

  -- Apelido humano da Fórmula Composta (vínculo entre PDFs irmãos)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='prescricao_blocos' AND column_name='formula_composta_apelido') THEN
    ALTER TABLE prescricao_blocos ADD COLUMN formula_composta_apelido text;
  END IF;
END $$;

-- ===== 2. CADASTRO SNCR + ICP-BRASIL NO PERFIL DO MÉDICO =====
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='usuarios' AND column_name='numero_certificado_icp_brasil') THEN
    ALTER TABLE usuarios ADD COLUMN numero_certificado_icp_brasil text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='usuarios' AND column_name='cota_sncr_b1') THEN
    ALTER TABLE usuarios ADD COLUMN cota_sncr_b1 int NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='usuarios' AND column_name='cota_sncr_b2') THEN
    ALTER TABLE usuarios ADD COLUMN cota_sncr_b2 int NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='usuarios' AND column_name='cota_sncr_a1') THEN
    ALTER TABLE usuarios ADD COLUMN cota_sncr_a1 int NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='usuarios' AND column_name='cota_sncr_a2') THEN
    ALTER TABLE usuarios ADD COLUMN cota_sncr_a2 int NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='usuarios' AND column_name='cota_sncr_a3') THEN
    ALTER TABLE usuarios ADD COLUMN cota_sncr_a3 int NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='usuarios' AND column_name='numeracao_local_vigilancia') THEN
    ALTER TABLE usuarios ADD COLUMN numeracao_local_vigilancia text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='usuarios' AND column_name='data_ultima_atualizacao_cota') THEN
    ALTER TABLE usuarios ADD COLUMN data_ultima_atualizacao_cota timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='usuarios' AND column_name='uf_atuacao_principal') THEN
    ALTER TABLE usuarios ADD COLUMN uf_atuacao_principal text;
  END IF;
END $$;

-- ===== 3. LOG DE CONSUMO SNCR (auditoria sanitária) =====
CREATE TABLE IF NOT EXISTS sncr_consumo_log (
  id serial PRIMARY KEY,
  medico_id int NOT NULL REFERENCES usuarios(id),
  prescricao_id int REFERENCES prescricoes(id),
  bloco_id int REFERENCES prescricao_blocos(id),
  tipo_receita_codigo text NOT NULL,    -- 'B1','B2','A1','A2','A3'
  numero_consumido text NOT NULL,       -- número SNCR (white-label manual hoje)
  cota_restante_apos int,               -- saldo após decremento
  pdf_arquivo text,                     -- caminho do PDF gerado
  consumido_em timestamptz NOT NULL DEFAULT now(),
  observacoes text
);
CREATE INDEX IF NOT EXISTS ix_sncr_log_medico ON sncr_consumo_log(medico_id, consumido_em DESC);
CREATE INDEX IF NOT EXISTS ix_sncr_log_prescricao ON sncr_consumo_log(prescricao_id);

-- ===== 4. PDFs EMITIDOS (1 prescrição → N PDFs vinculados) =====
CREATE TABLE IF NOT EXISTS prescricao_pdfs_emitidos (
  id serial PRIMARY KEY,
  prescricao_id int NOT NULL REFERENCES prescricoes(id) ON DELETE CASCADE,
  ordem int NOT NULL,
  tipo_receita_id int REFERENCES tipos_receita_anvisa(id),
  cor_visual text NOT NULL,             -- 'azul','amarelo','branco','lilas','verde','magistral'
  destino_dispensacao text NOT NULL,    -- 'FAMA','FACO','FAOP','INJE','HORM'
  arquivo_path text NOT NULL,           -- caminho local ou URL
  qr_code_token text,                   -- token único para validação
  numero_sncr text,                     -- se exigir numeração controlada
  marcacao_manipular_junto text,        -- "MANIPULAR JUNTO — Fórmula Composta X"
  blocos_inclusos int[] NOT NULL DEFAULT '{}',  -- IDs de prescricao_blocos contidos
  hash_documento text,                  -- SHA256 do conteúdo (imutabilidade)
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_pdfs_prescricao ON prescricao_pdfs_emitidos(prescricao_id, ordem);
CREATE INDEX IF NOT EXISTS ix_pdfs_qr ON prescricao_pdfs_emitidos(qr_code_token) WHERE qr_code_token IS NOT NULL;

-- ===== 5. CATÁLOGO DE ATIVOS — colunas para o motor de dedução =====
-- O motor precisa saber: (a) qual cor ANVISA cada ativo dispara,
--                        (b) qual farmácia padrão (FAMA/FACO/INJE).
-- O catálogo principal de ativos pode ter nome diferente; vamos ampliar
-- a tabela mais provável (substancias) E a tabela bloco_template_ativo
-- com colunas-cache pra evitar JOINs no motor.

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='substancias') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_name='substancias' AND column_name='tipo_receita_anvisa_codigo') THEN
      ALTER TABLE substancias ADD COLUMN tipo_receita_anvisa_codigo text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_name='substancias' AND column_name='farmacia_padrao') THEN
      ALTER TABLE substancias ADD COLUMN farmacia_padrao text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_name='substancias' AND column_name='controlado') THEN
      ALTER TABLE substancias ADD COLUMN controlado boolean NOT NULL DEFAULT false;
    END IF;
  END IF;

  -- E nas TAGS dos ativos da prescrição/template (cache p/ motor):
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='prescricao_bloco_ativos' AND column_name='tipo_receita_anvisa_codigo') THEN
    ALTER TABLE prescricao_bloco_ativos ADD COLUMN tipo_receita_anvisa_codigo text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='prescricao_bloco_ativos' AND column_name='farmacia_padrao') THEN
    ALTER TABLE prescricao_bloco_ativos ADD COLUMN farmacia_padrao text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='prescricao_bloco_ativos' AND column_name='controlado') THEN
    ALTER TABLE prescricao_bloco_ativos ADD COLUMN controlado boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='bloco_template_ativo' AND column_name='tipo_receita_anvisa_codigo') THEN
    ALTER TABLE bloco_template_ativo ADD COLUMN tipo_receita_anvisa_codigo text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='bloco_template_ativo' AND column_name='farmacia_padrao') THEN
    ALTER TABLE bloco_template_ativo ADD COLUMN farmacia_padrao text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='bloco_template_ativo' AND column_name='controlado') THEN
    ALTER TABLE bloco_template_ativo ADD COLUMN controlado boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ===== 6. SEED MÍNIMO — atualizar tipos_receita com cor_visual canônica =====
-- (idempotente, só ajusta se já houver registros)
UPDATE tipos_receita_anvisa SET cor_visual='branco', cor_hex='#FFFFFF' WHERE codigo='BRANCA_SIMPLES' AND cor_visual IS NULL;
UPDATE tipos_receita_anvisa SET cor_visual='magistral', cor_hex='#F5F0E6' WHERE codigo='MAGISTRAL' AND cor_visual IS NULL;

-- ===== FIM Migration 002 =====
