-- PAWARDS MEDCORE · Wave 10.5 · task #206
-- Auditoria server-side de cada download do extrato da timeline de assinaturas
-- (CSV/XLSX). Hoje o arquivo já carrega timestamp + filtros no cabeçalho
-- (Task #86), mas o Caio não consegue ver na tela QUEM da equipe baixou
-- qual extrato — quando o anexo chega num contador/advogado externo, falta
-- a ponta server-side pra rastrear a origem do arquivo.
--
-- Esta tabela é append-only — uma linha por download de /timeline.csv ou
-- /timeline.xlsx. A tela do CEO (/assinaturas/timeline) lê os últimos 50
-- registros via novo endpoint GET /assinaturas/timeline/exports.
--
-- Aditivo (REGRA FERRO): só CRIA tabela + indices. Nenhuma alteração em
-- tabelas existentes.

CREATE TABLE IF NOT EXISTS assinaturas_timeline_exports (
  id              bigserial PRIMARY KEY,
  -- Quem baixou. Snapshot de id + e-mail + nome (perfil pode mudar com o
  -- tempo). usuario_id pode ser NULL se a sessão não tiver id parseável,
  -- mas operador (texto livre, nunca NULL) sempre identifica algo.
  usuario_id      bigint,
  operador        text NOT NULL,
  operador_email  text,
  -- Filtros aplicados no momento do download — espelha exatamente o que
  -- vai no cabeçalho do CSV/aba Metadados do XLSX (Task #86). jsonb com
  -- chaves: unidade_id, status[], desde, ate, ordenar_por.
  filtros         jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Tokens de ordenação aplicados (formato cru, ex: "valor_desc,criado_asc").
  -- Vazio quando default ID DESC.
  ordenacao       text NOT NULL DEFAULT '',
  total_linhas    integer NOT NULL DEFAULT 0,
  formato         text NOT NULL CHECK (formato IN ('csv', 'xlsx')),
  -- truncado=true quando o cap de 5000 cortou registros (Task #75/#199).
  truncado        boolean NOT NULL DEFAULT false,
  criado_em       timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS assinaturas_timeline_exports_criado_idx
  ON assinaturas_timeline_exports (criado_em DESC);

CREATE INDEX IF NOT EXISTS assinaturas_timeline_exports_usuario_idx
  ON assinaturas_timeline_exports (usuario_id, criado_em DESC);

COMMENT ON TABLE assinaturas_timeline_exports IS
  'Auditoria append-only de downloads do extrato da timeline de assinaturas (task #206). Cada GET /assinaturas/timeline.csv ou .xlsx grava 1 linha. A tela /assinaturas/timeline lista os últimos 50 registros em painel lateral.';
