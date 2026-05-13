-- ============================================================================
-- Migration 048 · Task #159 — Permitir o platform_owner escolher se quer
-- aviso por email, WhatsApp ou ambos quando o 2FA esta para expirar.
--
-- Origem: .local/tasks/task-159.md.
-- Hoje o worker da Task #146 (Migration 047, avisoExpiracao2faOwner) sempre
-- dispara email + WhatsApp (se CEO_WHATSAPP estiver setado). Em alguns dias
-- o owner pode preferir so WhatsApp (em reuniao, email lota), em outros so
-- email (celular sem sinal). Esta coluna persiste a preferencia do owner
-- por canal, sem precisar mexer em env var.
--
-- REGRA FERRO Caio: psql aditivo IF NOT EXISTS, ZERO db:push.
-- REGRA NAMING Caio: nome semantico completo (canais_aviso_2fa), sem
-- abreviacao. Usa text[] com default '{email,whatsapp}' pra preservar o
-- comportamento atual (todo owner recebe pelos dois canais ate desligar).
--
-- Companheiras: ultimo_login_2fa_em (Migration 044), ultimo_aviso_2fa_em
-- (Migration 047). O worker filtra pelos canais escolhidos antes de chamar
-- Gmail/WhatsApp.
--
-- Invariantes Wave 9 INTOCADOS (8.728 receitas + R$ 2.736.536,10).
-- Invariantes Wave 13 F1 INTOCADOS (perfil_plataforma, totp_*).
-- ============================================================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS canais_aviso_2fa text[] NOT NULL
    DEFAULT ARRAY['email','whatsapp']::text[];

COMMENT ON COLUMN usuarios.canais_aviso_2fa IS
  'Task #159 - canais escolhidos pelo platform_owner pra receber o aviso de expiracao da janela de 8h do 2FA. Valores aceitos: ''email'', ''whatsapp''. Array vazio = mudo (so o banner in-app da Task #130 avisa). Default mantem comportamento legado da Task #146 (email + whatsapp). Usado pelo worker avisoExpiracao2faOwner.';
