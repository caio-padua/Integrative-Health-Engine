-- ============================================================================
-- Migration 051 · Task #135 — tracking de emails diarios de vencimento da
--                              carencia LGPD de exclusao de clinica.
-- ============================================================================
--
-- Origem: docs/dr-claude task #135 ("Avisar por email quando uma clínica
-- está perto do vencimento da carência LGPD"). Hoje a janela de 30 dias
-- (status='EXCLUIDO_PENDENTE' + exclusao_carencia_ate) roda em silencio.
-- O worker exclusaoCarenciaExecutor (Wave 13 F4) se recusa a apagar quando
-- a unidade nao tem lgpd_export_url, mas ninguem fica sabendo a tempo. Este
-- worker novo (avisoVencimentoCarenciaLgpd) dispara emails diarios em 4
-- janelas criticas: 7 dias, 3 dias, 1 dia, e VENCIDO_SEM_EXPORT (carencia
-- expirou e ainda nao tem o export LGPD gerado, bloqueando a exclusao
-- automatica).
--
-- Esta tabela serve apenas pra idempotencia diaria (1 envio por janela por
-- unidade por dia BRT) e pra auditabilidade dos avisos enviados.
--
-- REGRA FERRO Caio: psql aditivo IF NOT EXISTS, ZERO db:push.
-- Invariantes Wave 9 INTOCADOS (8.728 receitas + R$ 2.736.536,10).
-- ============================================================================

CREATE TABLE IF NOT EXISTS notif_carencia_lgpd_clinica_envios (
  id bigserial PRIMARY KEY,
  unidade_id integer NOT NULL REFERENCES unidades(id),
  dia_brt date NOT NULL,
  tipo_aviso text NOT NULL,
  dias_restantes integer NOT NULL,
  destinatarios text[] NOT NULL DEFAULT '{}'::text[],
  total_destinatarios integer NOT NULL DEFAULT 0,
  enviados integer NOT NULL DEFAULT 0,
  falhas integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'OK',
  erro text,
  enviado_em timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notif_carencia_lgpd_clinica_dia
  ON notif_carencia_lgpd_clinica_envios (unidade_id, tipo_aviso, dia_brt);

CREATE INDEX IF NOT EXISTS ix_notif_carencia_lgpd_clinica_status
  ON notif_carencia_lgpd_clinica_envios (status, enviado_em DESC);

ALTER TABLE notif_carencia_lgpd_clinica_envios
  DROP CONSTRAINT IF EXISTS notif_carencia_lgpd_clinica_envios_status_check;
ALTER TABLE notif_carencia_lgpd_clinica_envios
  ADD CONSTRAINT notif_carencia_lgpd_clinica_envios_status_check
  CHECK (status IN ('OK', 'ERRO', 'PARCIAL'));

ALTER TABLE notif_carencia_lgpd_clinica_envios
  DROP CONSTRAINT IF EXISTS notif_carencia_lgpd_clinica_envios_tipo_check;
ALTER TABLE notif_carencia_lgpd_clinica_envios
  ADD CONSTRAINT notif_carencia_lgpd_clinica_envios_tipo_check
  CHECK (tipo_aviso IN ('AVISO_7D', 'AVISO_3D', 'AVISO_1D', 'VENCIDO_SEM_EXPORT'));
