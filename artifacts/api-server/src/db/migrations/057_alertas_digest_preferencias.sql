-- ============================================================================
-- Migration 057 · Task #239 — Preferencias por destinatario do digest diario
-- ============================================================================
--
-- O service alertasDigestService (Task #26) envia o mesmo bundle (clinicas
-- abaixo do minimo + KPIs fora da faixa + pendencias) pra TODOS os emails
-- listados em ALERTAS_DIGEST_GESTORES. Com mais gestores entrando, alguns
-- so querem clinicas (gerente comercial), outros so pendencias (gerente
-- operacional). Esta tabela guarda, por destinatario, quais blocos ele
-- aceita receber — o service filtra o payload antes de renderizar.
--
-- Default por design: se NAO existe linha pra um email, recebe TUDO
-- (mantem comportamento legado / nao quebra envios pre-existentes).
--
-- REGRA FERRO Caio: psql aditivo IF NOT EXISTS, ZERO db:push, sem drop.
-- ============================================================================

CREATE TABLE IF NOT EXISTS alertas_digest_preferencias (
  id                  serial PRIMARY KEY,
  destinatario_email  text NOT NULL,
  nome                text,
  recebe_clinicas     boolean NOT NULL DEFAULT true,
  recebe_kpis         boolean NOT NULL DEFAULT true,
  recebe_pendencias   boolean NOT NULL DEFAULT true,
  observacao          text,
  criado_em           timestamptz NOT NULL DEFAULT now(),
  atualizado_em       timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_alertas_digest_preferencias_email
  ON alertas_digest_preferencias (lower(destinatario_email));

COMMENT ON TABLE alertas_digest_preferencias IS
  'Task #239 - Preferencia por destinatario do digest diario de alertas. '
  'Service alertasDigestService filtra clinicas/KPIs/pendencias por email. '
  'Sem linha = recebe tudo (preserva comportamento legado da Task #26).';
