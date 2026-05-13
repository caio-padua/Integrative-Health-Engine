-- 051 — Task #45 · Janelas de descanso próprias do CEO (validador_mestre).
--
-- Hoje os alertas operacionais com `is_sistema_ceo=true` (Task #36) bypassam
-- TODO o quiet hours global (notif_config). O Dr. Caio quer regras próprias
-- por canal: silenciar assinaturas de madrugada SEM bloquear recusas.
--
-- Aditivo + idempotente (REGRA FERRO mantida — zero db:push, zero DROP).
--
-- Modelo:
--   ceo_notif_preferencias  →  uma linha por (usuario_id, canal). PK composta.
--                              Default desabilitado pra preservar comportamento
--                              atual (envio 24/7) até o CEO configurar.
--   assinatura_notificacoes.evento_ceo  →  marca origem do alerta CEO
--                              ('ASSINADO' ou 'REJEITADO'). Permite ao worker
--                              decidir aplicar quiet hours só pra ASSINADO.

CREATE TABLE IF NOT EXISTS ceo_notif_preferencias (
  usuario_id              INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  canal                   TEXT    NOT NULL CHECK (canal IN ('EMAIL', 'WHATSAPP')),
  quiet_inicio            TIME    NOT NULL DEFAULT '22:00:00',
  quiet_fim               TIME    NOT NULL DEFAULT '07:00:00',
  tz                      TEXT    NOT NULL DEFAULT 'America/Sao_Paulo',
  habilitar_quiet_hours   BOOLEAN NOT NULL DEFAULT FALSE,
  nunca_silenciar_recusa  BOOLEAN NOT NULL DEFAULT TRUE,
  atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usuario_id, canal)
);

COMMENT ON TABLE ceo_notif_preferencias IS
  'Task #45 — janelas de descanso por canal do CEO/validador_mestre. Sobrescreve quiet hours globais (notif_config) APENAS pros alertas com is_sistema_ceo=true. Default habilitar_quiet_hours=false preserva comportamento Wave 10 (envio 24/7) ate o CEO configurar.';

COMMENT ON COLUMN ceo_notif_preferencias.nunca_silenciar_recusa IS
  'INVARIANTE Task #45: hard-locked TRUE. Recusas (evento_ceo=REJEITADO / doc_refused) SEMPRE passam, independente do horario. Coluna mantida pra compat de schema mas o worker (notifAssinatura.ts pre-check 2b) ignora o valor e o backend (PUT /admin/ceo-notif-preferencias) sempre grava true. Nao expor como configuravel.';

ALTER TABLE assinatura_notificacoes
  ADD COLUMN IF NOT EXISTS evento_ceo TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'assinatura_notificacoes_evento_ceo_chk'
  ) THEN
    ALTER TABLE assinatura_notificacoes
      ADD CONSTRAINT assinatura_notificacoes_evento_ceo_chk
      CHECK (evento_ceo IS NULL OR evento_ceo IN ('ASSINADO', 'REJEITADO'));
  END IF;
END $$;

COMMENT ON COLUMN assinatura_notificacoes.evento_ceo IS
  'Task #45 — discrimina o tipo de alerta CEO (ASSINADO vs REJEITADO) pra o worker decidir se aplica as janelas de descanso (ceo_notif_preferencias). NULL pra notificacoes pre-existentes / nao-CEO.';
