-- =============================================================================
-- Migration 010 · Onda PARMASUPRA · 22/abr/2026
-- Handoff Dr. Claude · features de receita pra Dr. Caio cobrar das clínicas
--
-- 100% IDEMPOTENTE — pode rodar N vezes sem efeito colateral.
-- ZERO db:push (regra ferro: drift de 47+ tabelas, drizzle quer destruir 10).
-- ZERO ALTER em coluna existente.
-- Apenas CREATE IF NOT EXISTS + INSERT ON CONFLICT DO NOTHING.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- HIERARQUIA DE NEGOCIO · tipo_unidade
-- ATENCAO: a coluna 'tipo' JA EXISTE em unidades com valores tecnicos
-- ('clinic','genesis_seed','enfermagem','domiciliar','telemedicina','personal').
-- NAO mexer nela (quebraria 17 linhas). Criamos uma coluna NOVA pra hierarquia
-- do modelo de negocio do Dr. Caio (revelacao 22/abr):
--   LABORATORIO_MESTRE  = Genesis (semeia substancias, nunca recebe paciente)
--   CLINICA_OPERACIONAL = Padua (testa em pacientes reais antes de virar padrao)
--   CLINICA_PARCEIRA    = demais (consomem o que Genesis cria + Padua valida)
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='unidades' AND column_name='tipo_unidade') THEN
    ALTER TABLE unidades ADD COLUMN tipo_unidade text NOT NULL DEFAULT 'CLINICA_PARCEIRA'
      CHECK (tipo_unidade IN ('LABORATORIO_MESTRE','CLINICA_OPERACIONAL','CLINICA_PARCEIRA'));
    RAISE NOTICE 'Migration 010: coluna tipo_unidade adicionada em unidades';
  ELSE
    RAISE NOTICE 'Migration 010: tipo_unidade ja existe — pulando';
  END IF;
END $$;

-- Promove Genesis e Padua na hierarquia
UPDATE unidades SET tipo_unidade = 'LABORATORIO_MESTRE'
  WHERE nome ILIKE '%genesis%' AND tipo_unidade <> 'LABORATORIO_MESTRE';
UPDATE unidades SET tipo_unidade = 'CLINICA_OPERACIONAL'
  WHERE nome ILIKE '%padua%' AND nome NOT ILIKE '%(arquivada)%' AND tipo_unidade <> 'CLINICA_OPERACIONAL';

-- -----------------------------------------------------------------------------
-- TABELA 1 · permissoes_delegadas
-- Toggle "autonomia delegada" por unidade × permissão + preço mensal cobrado.
-- O Dr. Caio liga/desliga e define quanto cobra de cada clínica por mês.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permissoes_delegadas (
  id                              serial PRIMARY KEY,
  unidade_id                      int NOT NULL REFERENCES unidades(id),
  permissao                       text NOT NULL
    CHECK (permissao IN (
      'editar_catalogo_substancias',
      'editar_bloco_template',
      'editar_parametros_exames',
      'incluir_substancia_nova'
    )),
  ativo                           boolean NOT NULL DEFAULT false,
  preco_mensal_brl                numeric(10,2) NOT NULL DEFAULT 0,
  preco_inclusao_substancia_brl   numeric(10,2) NOT NULL DEFAULT 150,
  delegado_por_usuario_id         int,
  delegado_em                     timestamptz NOT NULL DEFAULT now(),
  atualizado_em                   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT permissoes_delegadas_unique UNIQUE (unidade_id, permissao)
);

CREATE INDEX IF NOT EXISTS ix_permissoes_delegadas_unidade
  ON permissoes_delegadas(unidade_id);

-- -----------------------------------------------------------------------------
-- TABELA 2 · cobrancas_adicionais
-- Extrato auditável de tudo que o Dr. Caio cobra a mais das clínicas:
-- inclusão de substância, consultoria avulsa, mensalidade extra etc.
-- O PARCLAIM pode ler daqui pra emitir cobrança.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cobrancas_adicionais (
  id              serial PRIMARY KEY,
  unidade_id      int NOT NULL REFERENCES unidades(id),
  tipo            text NOT NULL,
  descricao       text NOT NULL,
  valor_brl       numeric(10,2) NOT NULL,
  referencia_id   int,                 -- FK opcional (ex: substancia_id)
  referencia_tipo text,                -- ex: 'substancia', 'consultoria', 'modulo'
  status          text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','cobrado','pago','cancelado')),
  criado_por_usuario_id int,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  cobrado_em      timestamptz,
  pago_em         timestamptz
);

CREATE INDEX IF NOT EXISTS ix_cobrancas_adicionais_unidade_status
  ON cobrancas_adicionais(unidade_id, status);
CREATE INDEX IF NOT EXISTS ix_cobrancas_adicionais_criado
  ON cobrancas_adicionais(criado_em DESC);

-- -----------------------------------------------------------------------------
-- SEED: 4 toggles default OFF pra TODAS as clinicas parceiras ativas.
-- (revelacao Dr. Caio 22/abr: a "Ultra" do blueprint era na verdade a Genesis,
--  laboratorio mestre. Genesis NAO precisa de delegacao — ela ja tem tudo.
--  Quem precisa de toggle sao as CLINICA_PARCEIRA.)
-- Precos sugeridos (Caio ajusta na tela /admin/permissoes-delegadas).
-- -----------------------------------------------------------------------------
INSERT INTO permissoes_delegadas (unidade_id, permissao, ativo, preco_mensal_brl, preco_inclusao_substancia_brl)
SELECT u.id, p.permissao, false, p.preco_mensal, 150
FROM unidades u
CROSS JOIN (VALUES
  ('editar_catalogo_substancias', 297::numeric),
  ('editar_bloco_template',       297::numeric),
  ('editar_parametros_exames',    197::numeric),
  ('incluir_substancia_nova',     0::numeric)
) AS p(permissao, preco_mensal)
WHERE u.tipo_unidade = 'CLINICA_PARCEIRA'
  AND u.ativa = true
  AND u.nome NOT ILIKE '%(arquivada)%'
ON CONFLICT (unidade_id, permissao) DO NOTHING;

COMMIT;

-- =============================================================================
-- VERIFICAÇÃO POS-MIGRATION (rode separado pra ver):
-- SELECT count(*) AS permissoes_delegadas FROM permissoes_delegadas;
-- SELECT count(*) AS cobrancas_adicionais  FROM cobrancas_adicionais;
-- =============================================================================
