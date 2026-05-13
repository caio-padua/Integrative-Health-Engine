-- 050 — Task #25 · Mostrar entradas vs saidas reais (nao estimadas) no
-- fluxo de caixa do painel PAWARDS.
--
-- Contexto: o card "Fluxo de Caixa 30d" (GET /painel-pawards/caixa-30d,
-- artifacts/api-server/src/routes/painelPawards.ts ~linha 759) calculava
-- ate hoje as saidas como uma heuristica:
--     saidas = 0.58 * SUM(valor_realizado) + SUM(comissao_magistral_estimada)
-- Isso existia porque ainda nao tinhamos um lugar real pra registrar
-- pagamentos efetivos (folha, custos magistrais pagos, despesas
-- operacionais). Pro Dr. Caio confiar no numero, a tarefa pede trocar a
-- estimativa por dados reais.
--
-- Esta migration cria a tabela `contas_a_pagar`, primeira pedra do
-- modulo financeiro / contas a pagar (ainda nao existia). E o registry
-- canonico de saidas reais; o endpoint /caixa-30d passa a somar dela em
-- vez do calculo 0.58 * entradas.
--
-- REGRA FERRO mantida (aditivo + idempotente): nada e dropado nem
-- substituido, defaults preservam linhas pre-existentes (a tabela e
-- nova, entao nao ha pre-existentes a preservar). Auditoria padrao
-- Pawards (`origem`, `versao_schema`, `arquivado_em`) presente.

CREATE TABLE IF NOT EXISTS contas_a_pagar (
  id                 SERIAL PRIMARY KEY,
  unidade_id         INTEGER REFERENCES unidades(id) ON DELETE SET NULL,
  -- Categoria controla o que entra na legenda do card no dashboard.
  -- 'folha'        = salarios, encargos, pro-labore
  -- 'magistral'    = custo real pago a manipuladora pelas formulas
  -- 'operacional'  = aluguel, energia, insumos, marketing, software
  -- 'outros'       = qualquer saida real nao categorizada acima
  categoria          TEXT NOT NULL CHECK (categoria IN ('folha','magistral','operacional','outros')),
  descricao          TEXT NOT NULL,
  valor_brl          NUMERIC(12,2) NOT NULL CHECK (valor_brl >= 0),
  data_vencimento    DATE,
  -- Soh entra no fluxo de caixa quando data_pagamento NAO e NULL.
  -- Conta em aberto / vencida nao vira saida real ainda.
  data_pagamento     DATE,
  status             TEXT NOT NULL DEFAULT 'aberto'
                       CHECK (status IN ('aberto','pago','cancelado')),
  fornecedor         TEXT,
  observacao         TEXT,
  -- Padrao auditavel Pawards (LGPD + multi-versao de schema).
  origem             TEXT NOT NULL DEFAULT 'manual',
  versao_schema      TEXT NOT NULL DEFAULT 'v1',
  arquivado_em       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices: consulta principal e "saidas pagas em janela de N dias",
-- normalmente filtrada por data_pagamento. Sem isso o card escaneia full.
CREATE INDEX IF NOT EXISTS idx_contas_a_pagar_data_pagamento
  ON contas_a_pagar (data_pagamento)
  WHERE data_pagamento IS NOT NULL AND arquivado_em IS NULL;

CREATE INDEX IF NOT EXISTS idx_contas_a_pagar_unidade_categoria
  ON contas_a_pagar (unidade_id, categoria)
  WHERE arquivado_em IS NULL;

COMMENT ON TABLE contas_a_pagar IS
  'Saidas reais (folha, custos magistrais pagos, despesas operacionais). '
  'Substitui a heuristica 0.58 * entradas no card Fluxo de Caixa 30d. '
  'Task #25.';
