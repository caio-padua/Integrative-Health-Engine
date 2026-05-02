-- =============================================================================
-- Migration 032 — Wave 10 Fase B Dia 1 (correção pós code-review)
-- Achado 3 do code-review architect: paciente teste sem flag estrutural causa
-- poluição de relatórios em produção. Solução: flag `is_teste` em pacientes,
-- aditiva, com default false (zero impacto em queries existentes).
--
-- REGRA FERRO: psql aditivo IF NOT EXISTS, sem db:push, triggers Wave 9
-- (027/030) intocados, invariantes Wave 9 preservados (8.725 receitas
-- PRODUÇÃO + R$ 2.735.336,10 comissão potencial).
--
-- Contrato pra dashboards futuros: TODA query de produção que agregue
-- pacientes/receitas/comissões DEVE filtrar `WHERE p.is_teste = false`.
--
-- Aplicada em: 2026-05-01
-- Idempotente: sim (IF NOT EXISTS + WHERE seguro)
-- =============================================================================

-- 1) Coluna estrutural: flag de paciente teste
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS is_teste boolean NOT NULL DEFAULT false;

-- 2) Marca paciente Caio Pádua (CEO PAWARDS) como teste explícito
--    Idempotente: WHERE id=3104 AND is_teste=false só atualiza 1ª vez
UPDATE pacientes
   SET is_teste = true
 WHERE id = 3104 AND is_teste = false;

-- 3) Índice parcial pra acelerar filtros de relatório (pequeno: ~1 linha hoje)
CREATE INDEX IF NOT EXISTS ix_pacientes_is_teste_true
  ON pacientes (id) WHERE is_teste = true;

-- =============================================================================
-- Validação (rodar manual após aplicar):
-- =============================================================================
-- SELECT
--   '  pacientes_total=' || COUNT(*)
--   || '  pacientes_TESTE=' || SUM(CASE WHEN is_teste THEN 1 ELSE 0 END)
-- FROM pacientes;
-- → esperado hoje: pacientes_total=1558  pacientes_TESTE=1
--
-- SELECT
--   '  receitas_PRODUCAO=' || COUNT(*) FILTER (WHERE p.is_teste = false)
--   || '  receitas_TESTE=' || COUNT(*) FILTER (WHERE p.is_teste = true)
--   || '  comissao_PRODUCAO=R$ ' || COALESCE(ROUND(SUM(comissao_estimada) FILTER (WHERE p.is_teste = false)::numeric,2),0)
-- FROM parmavault_receitas r JOIN pacientes p ON p.id = r.paciente_id;
-- → esperado hoje: receitas_PRODUCAO=8725  receitas_TESTE=0  comissao_PRODUCAO=R$ 2735336.10
-- =============================================================================
