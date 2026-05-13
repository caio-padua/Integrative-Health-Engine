-- ============================================================================
-- Migration 047 · Task #146 — Aviso fora do app (email/WhatsApp) quando o 2FA
-- do platform_owner esta para expirar (~15min antes do fim da janela de 8h).
--
-- Origem: .local/tasks/task-146.md.
-- O banner discreto da Task #130 (Platform2faExpiryBanner.tsx) so aparece
-- quando o owner tem uma aba do /plataforma/* aberta. Se ele estiver longe
-- do navegador (almoco, reuniao, fora do escritorio), nao ve o aviso e
-- a janela expira no meio de uma acao destrutiva. O worker novo dispara
-- email + WhatsApp ~15min antes pra cobrir esse buraco.
--
-- Esta migration apenas adiciona 1 coluna idempotente em `usuarios` que serve
-- de flag por janela ativa de 2FA: gravamos o timestamp do ultimo aviso
-- enviado e usamos a regra "ultimo_aviso_2fa_em IS NULL OR ultimo_aviso_2fa_em
-- < ultimo_login_2fa_em" pra garantir 1 unico envio por janela de 8h.
--
-- REGRA FERRO Caio: psql aditivo IF NOT EXISTS, ZERO db:push.
-- REGRA NAMING Caio: nome semantico completo (ultimo_aviso_2fa_em), sem
-- abreviacao. Comentario aponta a coluna companheira ultimo_login_2fa_em
-- (Migration 044) que serve como "marca de janela ativa".
--
-- Invariantes Wave 9 INTOCADOS (8.728 receitas + R$ 2.736.536,10).
-- Invariantes Wave 13 F1 INTOCADOS (perfil_plataforma, totp_*, ultimo_login_2fa_em).
-- ============================================================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS ultimo_aviso_2fa_em timestamptz;

COMMENT ON COLUMN usuarios.ultimo_aviso_2fa_em IS
  'Task #146 - timestamp do ultimo aviso de expiracao 2FA enviado por email/whatsapp. Idempotencia: so dispara novo aviso quando NULL ou < ultimo_login_2fa_em (Migration 044). Usado pelo worker avisoExpiracao2faOwner (tick 5min, janela 7h45-7h55 atras).';
