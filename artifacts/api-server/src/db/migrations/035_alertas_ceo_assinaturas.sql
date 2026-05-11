-- 035 · Wave 10.6 · Fila de alertas do CEO sobre assinaturas
-- Aditiva, idempotente. UNIQUE(dia_brt, metrica) garante no-spam.
CREATE TABLE IF NOT EXISTS alertas_ceo_assinaturas (
  id              BIGSERIAL PRIMARY KEY,
  dia_brt         DATE NOT NULL,
  metrica         TEXT NOT NULL CHECK (metrica IN ('rejeitadas_7d','conversao_7d')),
  cor_anterior    TEXT,
  cor_atual       TEXT NOT NULL,
  variacao_pct    NUMERIC(8,2),
  conversao_pp    NUMERIC(8,2),
  totais_atual    JSONB NOT NULL DEFAULT '{}'::jsonb,
  totais_prev     JSONB NOT NULL DEFAULT '{}'::jsonb,
  notif_email_id  BIGINT,
  notif_wpp_id    BIGINT,
  visualizado_em  TIMESTAMPTZ,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT alertas_ceo_assinaturas_uniq UNIQUE (dia_brt, metrica)
);
CREATE INDEX IF NOT EXISTS alertas_ceo_assinaturas_criado_idx
  ON alertas_ceo_assinaturas (criado_em DESC);
