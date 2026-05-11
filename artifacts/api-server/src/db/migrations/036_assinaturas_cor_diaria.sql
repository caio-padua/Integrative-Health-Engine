-- 036 · Wave 10.6 fix · Snapshot diario de cor por metrica (transicao real)
-- Sem isso, buscarCorAnterior so via alertas critico-perpetua e bloqueia
-- alerta legitimo no proximo bom->critico.
CREATE TABLE IF NOT EXISTS assinaturas_cor_diaria (
  dia_brt    DATE NOT NULL,
  metrica    TEXT NOT NULL CHECK (metrica IN ('rejeitadas_7d','conversao_7d')),
  cor        TEXT NOT NULL,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (dia_brt, metrica)
);
CREATE INDEX IF NOT EXISTS assinaturas_cor_diaria_metrica_idx
  ON assinaturas_cor_diaria (metrica, dia_brt DESC);
