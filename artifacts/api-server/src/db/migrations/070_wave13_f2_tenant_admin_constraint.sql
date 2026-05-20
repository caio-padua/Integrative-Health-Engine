-- Migration 070 — Wave 13 F2: constraint DB que garante tenant_admin
-- tem unidade_id definido (defesa em profundidade junto com o middleware).
--
-- Por que so tenant_admin e nao tenant_user:
--   tenant_user pode ser consultor global (unidade_id=null e valido pra eles).
--   tenant_admin e um administrador de uma clinica especifica — sem unidade
--   vinculada, a promocao nao faz sentido semantico.
--
-- Aplicado em: 2026-05-15 por Dr. Replit (Wave 13 F2)
-- Invariantes: 0 tenant_admin existentes — constraint segura de adicionar.
-- Verificacao pre-apply:
--   SELECT COUNT(*) FROM usuarios WHERE perfil_plataforma='tenant_admin' AND unidade_id IS NULL;
--   Resultado esperado: 0

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_tenant_admin_requer_unidade_id'
  ) THEN
    ALTER TABLE usuarios
      ADD CONSTRAINT chk_tenant_admin_requer_unidade_id
      CHECK (
        perfil_plataforma <> 'tenant_admin'
        OR unidade_id IS NOT NULL
      );
  END IF;
END $$;

-- Documenta as rotas protegidas pelo middleware resolverFiltroTenant (Wave 13 F2):
-- GET /pacientes, GET /filas, GET /usuarios,
-- GET /followup, GET /financeiro/pagamentos,
-- GET /demandas, GET /demandas/resumo
-- Lib: artifacts/api-server/src/lib/auth/filtroTenant.ts

COMMENT ON CONSTRAINT chk_tenant_admin_requer_unidade_id ON usuarios IS
  'Wave 13 F2 — tenant_admin deve ter unidade_id definido (admin de clinica especifica)';
