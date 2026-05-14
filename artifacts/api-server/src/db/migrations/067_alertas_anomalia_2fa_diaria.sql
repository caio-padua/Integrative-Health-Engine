-- ============================================================================
-- Migration 067 · Task #272 — Aviso por email pro CEO quando bloqueios 2FA
--                              do dia anterior dao sinal de ataque (ANOMALIA)
-- ============================================================================
--
-- Contexto:
--   A Task #160 ja calcula a flag (NORMAL/ATENCAO/ANOMALIA) no endpoint
--   GET /api/admin/seguranca/totp-bloqueios-expirados a partir do agregado
--   `totp_rate_limit_limpezas_diarias` (Migration 052). O problema: o sinal
--   e PUXADO — o CEO so descobre se abrir o painel. Se o ataque acontece
--   numa madrugada de domingo o aviso nao chega em tempo de defesa.
--
--   Esta task fecha o ciclo: worker diario (apos 06:00 BRT) reavalia o
--   agregado fechado do DIA ANTERIOR e dispara email pro CEO quando flag =
--   ANOMALIA. A tabela abaixo registra cada envio (auditoria + idempotencia
--   por (dia_brt, destinatario)) — re-run do worker = no-op via UNIQUE.
--
-- REGRA FERRO Caio: psql aditivo, IF NOT EXISTS, ZERO db:push.
-- Invariantes Wave 9 INTOCADOS (8.728 receitas + R$ 2.736.536,10).
-- ============================================================================

CREATE TABLE IF NOT EXISTS alertas_anomalia_2fa_diaria (
  id                   serial      PRIMARY KEY,
  dia_brt              date        NOT NULL,
  destinatario_email   text        NOT NULL,
  flag                 text        NOT NULL,
  hoje_total           integer     NOT NULL DEFAULT 0,
  media_historica      numeric(12,4) NOT NULL DEFAULT 0,
  desvio_padrao        numeric(12,4) NOT NULL DEFAULT 0,
  razao_vs_media       numeric(12,4) NOT NULL DEFAULT 0,
  z_score              numeric(12,4) NOT NULL DEFAULT 0,
  janela_dias          integer     NOT NULL DEFAULT 30,
  status               text        NOT NULL DEFAULT 'ENVIADO',
  erro                 text        NULL,
  gmail_message_id     text        NULL,
  origem               text        NOT NULL DEFAULT 'WORKER',
  enviado_em           timestamptz NOT NULL DEFAULT now(),
  criado_em            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT alertas_anomalia_2fa_diaria_unq
    UNIQUE (dia_brt, destinatario_email),
  CONSTRAINT alertas_anomalia_2fa_diaria_flag_check
    CHECK (flag IN ('ANOMALIA','ATENCAO','NORMAL')),
  CONSTRAINT alertas_anomalia_2fa_diaria_status_check
    CHECK (status IN ('ENVIADO','ERRO'))
);

CREATE INDEX IF NOT EXISTS ix_alertas_anomalia_2fa_diaria_dia
  ON alertas_anomalia_2fa_diaria (dia_brt DESC);

COMMENT ON TABLE alertas_anomalia_2fa_diaria IS
  'Task #272 — auditoria + idempotencia diaria do email "anomalia de '
  'bloqueios 2FA" pro CEO. UNIQUE (dia_brt, destinatario_email): re-run '
  'do worker no mesmo dia nao re-envia. Fonte do sinal: agregado '
  '`totp_rate_limit_limpezas_diarias` (Migration 052, Task #160). Flag '
  'derivada da mesma heuristica do endpoint /admin/seguranca/totp-'
  'bloqueios-expirados (extraida pra lib/seguranca/anomaliaTotp.ts).';

COMMENT ON COLUMN alertas_anomalia_2fa_diaria.dia_brt IS
  'Dia BRT (America/Sao_Paulo) AVALIADO — sempre o dia ANTERIOR ao tick, '
  'pra que o agregado ja esteja fechado.';
COMMENT ON COLUMN alertas_anomalia_2fa_diaria.flag IS
  'Resultado da heuristica no momento do envio. Por design o worker so '
  'INSERE quando flag=ANOMALIA, mas o CHECK aceita os 3 valores pra dar '
  'flexibilidade futura (forcar=true via endpoint admin pra teste).';
COMMENT ON COLUMN alertas_anomalia_2fa_diaria.status IS
  'ENVIADO = email saiu com sucesso (gmail_message_id preenchido). '
  'ERRO = falha no envio (mensagem em `erro`). UNIQUE garante que mesmo '
  'em ERRO nao re-tenta no mesmo dia automaticamente — rerun manual via '
  'origem=MANUAL apaga primeiro a linha pra reabrir o slot.';
