-- ============================================================================
-- Migration 044 · Wave 13 F1 — RBAC Hierárquico + Kill-Switch + 2FA TOTP
-- ============================================================================
--
-- Origem: docs/dr-claude/02_DECISOES_PENDENTES_PARA_DR_CLAUDE.md (D7 aprovado
-- por Caio "sim sim sim" 2026-05-01).
--
-- ESCOPO F1 (este arquivo): foundation schema apenas. Middleware de
-- enforcement, endpoints kill-switch e fluxo TOTP entram em F2/F3 (próximas
-- rodadas) — esta migration NÃO MUDA comportamento de produção, apenas
-- adiciona colunas/tabelas que ficam dormentes até F2 ativar.
--
-- REGRA FERRO Caio: psql aditivo IF NOT EXISTS, ZERO db:push.
-- REGRA NAMING Caio: SEMPRE `perfil`, NUNCA `role`/`papel`. Por isso o nome
--   do campo novo é `perfil_plataforma` (não "role" e não "papel"). Mantém
--   convenção lowercase já usada nos 5 perfis legados (medico, enfermeira,
--   medico_tecnico, validador_mestre, validador_enfermeiro). O `perfil`
--   legado continua intacto — `perfil_plataforma` é uma DIMENSÃO ORTOGONAL
--   que classifica acesso multi-tenant (não substitui o perfil clínico).
--
-- Invariantes Wave 9 INTOCADOS (8.728 receitas + R$ 2.736.536,10 + 6 triggers).
-- Invariantes Wave 10 INTOCADOS (assinatura_solicitacoes, auditoria_assinaturas).
--
-- Critérios verificáveis pós-aplicação:
--   1) usuarios.perfil_plataforma existe com CHECK
--   2) UNIQUE parcial garante 1 só PLATFORM_OWNER ATIVO
--   3) Caio (usuarios.id=1) marcado como platform_owner
--   4) unidades.status existe com CHECK
--   5) auditoria_kill_switch criada vazia
--   6) Re-run = no-op (idempotente)
-- ============================================================================

-- 1) Estende `usuarios` ----------------------------------------------------
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS perfil_plataforma text NOT NULL DEFAULT 'tenant_user',
  ADD COLUMN IF NOT EXISTS totp_secret_cifrado text,
  ADD COLUMN IF NOT EXISTS totp_ativado_em timestamptz,
  ADD COLUMN IF NOT EXISTS ultimo_login_2fa_em timestamptz;

-- CHECK constraint idempotente (drop + recreate por nome conhecido)
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_perfil_plataforma_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_perfil_plataforma_check
  CHECK (perfil_plataforma IN ('platform_owner','tenant_admin','tenant_user'));

-- Índice parcial: 1 só PLATFORM_OWNER ATIVO (ativo=true) no sistema todo.
-- Defesa em profundidade contra bug que crie 2 owners simultâneos.
CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_owner_unico
  ON usuarios ((perfil_plataforma))
  WHERE perfil_plataforma = 'platform_owner' AND ativo = true;

-- 2) Estende `unidades` ----------------------------------------------------
ALTER TABLE unidades
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ATIVO',
  ADD COLUMN IF NOT EXISTS suspenso_em timestamptz,
  ADD COLUMN IF NOT EXISTS suspenso_por_usuario_id integer REFERENCES usuarios(id),
  ADD COLUMN IF NOT EXISTS suspensao_motivo text,
  ADD COLUMN IF NOT EXISTS exclusao_carencia_ate timestamptz,
  ADD COLUMN IF NOT EXISTS lgpd_export_url text,
  ADD COLUMN IF NOT EXISTS lgpd_export_em timestamptz;

ALTER TABLE unidades DROP CONSTRAINT IF EXISTS unidades_status_check;
ALTER TABLE unidades ADD CONSTRAINT unidades_status_check
  CHECK (status IN ('ATIVO','SUSPENSO','EXCLUIDO_PENDENTE','EXCLUIDO'));

CREATE INDEX IF NOT EXISTS ix_unidades_status ON unidades (status);

-- 3) Auditoria kill-switch (toda ação destrutiva) -------------------------
CREATE TABLE IF NOT EXISTS auditoria_kill_switch (
  id bigserial PRIMARY KEY,
  acao text NOT NULL,
  unidade_id integer NOT NULL REFERENCES unidades(id),
  executado_por_usuario_id integer NOT NULL REFERENCES usuarios(id),
  motivo text,
  ip text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE auditoria_kill_switch DROP CONSTRAINT IF EXISTS auditoria_kill_switch_acao_check;
ALTER TABLE auditoria_kill_switch ADD CONSTRAINT auditoria_kill_switch_acao_check
  CHECK (acao IN (
    'SUSPENDER','REASSUMIR','EXPORTAR_LGPD',
    'EXCLUIR_AGENDAR','EXCLUIR_EXECUTAR','EXCLUIR_CANCELAR',
    'PROMOVER_ADMIN','REBAIXAR_ADMIN'
  ));

CREATE INDEX IF NOT EXISTS ix_aud_kill_unidade
  ON auditoria_kill_switch (unidade_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS ix_aud_kill_executor
  ON auditoria_kill_switch (executado_por_usuario_id, criado_em DESC);

-- 4) Promove Caio (ceo@pawards.com.br · id=1) a PLATFORM_OWNER -----------
-- Idempotente: só atualiza se ainda não for owner. UNIQUE parcial garante
-- que se outro registro já ocupar o slot, este UPDATE falha em vez de
-- silenciosamente criar um 2º owner.
UPDATE usuarios
   SET perfil_plataforma = 'platform_owner'
 WHERE email = 'ceo@pawards.com.br'
   AND perfil_plataforma <> 'platform_owner';

-- 5) Comentários (ferramenta de auditoria pra LSP/Drizzle introspection) -
COMMENT ON COLUMN usuarios.perfil_plataforma IS
  'Wave 13 RBAC hierarquico ortogonal ao `perfil` clinico legado. Valores: '
  'platform_owner (Caio, 1 unico), tenant_admin (dono da clinica), '
  'tenant_user (usuario da clinica). NUNCA usar `papel` ou `role` (regra Caio).';
COMMENT ON COLUMN unidades.status IS
  'Wave 13 kill-switch lifecycle. ATIVO (default) | SUSPENSO (Caio bloqueou) | '
  'EXCLUIDO_PENDENTE (carencia LGPD 30d ativa) | EXCLUIDO (purgado).';
COMMENT ON TABLE auditoria_kill_switch IS
  'Wave 13 — toda acao destrutiva do PLATFORM_OWNER fica registrada aqui '
  'com IP + user_agent + metadata pra defesa juridica LGPD/CFM.';
