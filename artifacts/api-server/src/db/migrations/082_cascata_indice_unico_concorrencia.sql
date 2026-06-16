-- 082: blindagem de concorrencia do Motor da Cascata de Validacao (Item 6).
-- ----------------------------------------------------------------------------
-- PROBLEMA (apontado pelo code review): abrirCascata fazia read-then-insert sem
-- garantia no banco; dois pedidos simultaneos podiam criar a MESMA etapa duas
-- vezes (race condition = condicao de corrida).
-- SOLUCAO: indice UNICO aditivo em (entidade_tipo, entidade_id, etapa). Combinado
-- com "ON CONFLICT DO NOTHING" no insert, garante 1 etapa por entidade mesmo
-- sob concorrencia. ADITIVO e idempotente (IF NOT EXISTS); a tabela esta vazia,
-- entao a criacao e segura e nao quebra dado existente.
CREATE UNIQUE INDEX IF NOT EXISTS validacoes_cascata_entidade_etapa_uq
  ON validacoes_cascata (entidade_tipo, entidade_id, etapa);
