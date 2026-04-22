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
-- SEED: linha exemplar pra Ultra Clínica caso ela exista no banco.
-- Pega a primeira unidade que casa nome ILIKE '%ultra%'. Se nao existir, no-op.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_ultra_id int;
BEGIN
  SELECT id INTO v_ultra_id FROM unidades WHERE nome ILIKE '%ultra%' LIMIT 1;

  IF v_ultra_id IS NOT NULL THEN
    -- 4 toggles desligados por padrão pra Ultra (Caio decide depois)
    INSERT INTO permissoes_delegadas (unidade_id, permissao, ativo, preco_mensal_brl, preco_inclusao_substancia_brl)
    VALUES
      (v_ultra_id, 'editar_catalogo_substancias', false, 297, 150),
      (v_ultra_id, 'editar_bloco_template',       false, 297, 150),
      (v_ultra_id, 'editar_parametros_exames',    false, 197, 150),
      (v_ultra_id, 'incluir_substancia_nova',     false, 0,   150)
    ON CONFLICT (unidade_id, permissao) DO NOTHING;

    RAISE NOTICE 'Migration 010: 4 toggles seedados pra Ultra Clinica id=%', v_ultra_id;
  ELSE
    RAISE NOTICE 'Migration 010: Ultra Clinica nao encontrada (busca por nome ILIKE %ultra%) — pule seed.';
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- VERIFICAÇÃO POS-MIGRATION (rode separado pra ver):
-- SELECT count(*) AS permissoes_delegadas FROM permissoes_delegadas;
-- SELECT count(*) AS cobrancas_adicionais  FROM cobrancas_adicionais;
-- =============================================================================
