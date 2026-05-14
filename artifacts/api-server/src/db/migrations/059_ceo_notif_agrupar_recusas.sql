-- ============================================================================
-- Migration 059 · Task #250 — Agrupar recusas em digest matinal por canal
-- ============================================================================
--
-- Task #45 garante que recusas (doc_refused / evento_ceo='REJEITADO') SEMPRE
-- passam, mesmo dentro da janela de descanso do CEO. Em rajadas de madrugada
-- isso pode pingar o celular do Dr. Caio multiplas vezes as 3am. Esta
-- migration adiciona uma opcao por canal pra agrupar recusas que cheguem
-- dentro da janela num unico aviso consolidado, disparado ao fim da janela.
--
-- Modelo:
--   ceo_notif_preferencias.agrupar_recusas (BOOLEAN, default FALSE)
--     Quando TRUE *e* habilitar_quiet_hours=TRUE, recusas chegando dentro
--     da janela ficam com status='AGRUPADO_DIGEST' e o worker
--     `digestRecusasCEO` consolida num unico envio por (canal, destinatario)
--     assim que a janela fecha. Default FALSE preserva comportamento Task
--     #45 (recusa imediata 24/7).
--
--   assinatura_notificacoes.status += 'AGRUPADO_DIGEST'
--     Status nao-terminal: o tick principal (notifAssinatura) IGNORA esse
--     status (so re-pega PENDENTE/PULADO_QUIET). O digest worker reivindica
--     essas linhas, gera UMA nova notificacao consolidada (PENDENTE) e
--     marca as fontes como 'ENVIADO_AGRUPADO' com resposta_provedor
--     apontando pro id consolidado (auditavel).
--
-- Configuravel por canal — o CEO pode optar por digest no e-mail (volume
-- alto, leitura matinal) e manter WhatsApp imediato (urgencia clinica).
--
-- REGRA FERRO Caio: psql aditivo IF NOT EXISTS, ZERO db:push, sem drop.
-- ============================================================================

ALTER TABLE ceo_notif_preferencias
  ADD COLUMN IF NOT EXISTS agrupar_recusas BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN ceo_notif_preferencias.agrupar_recusas IS
  'Task #250 — quando TRUE e habilitar_quiet_hours=TRUE, recusas '
  '(evento_ceo=REJEITADO) que chegam dentro da janela de descanso ficam '
  'com status=AGRUPADO_DIGEST e o worker digestRecusasCEO consolida num '
  'unico envio (por canal/destinatario) ao fim da janela. Default FALSE '
  'preserva Task #45 (recusa sempre imediata 24/7).';

-- Index parcial pra o digest worker varrer rapido apenas as linhas pendentes.
CREATE INDEX IF NOT EXISTS ix_assinatura_notif_agrupado_digest
  ON assinatura_notificacoes (canal, destinatario)
  WHERE status = 'AGRUPADO_DIGEST';
