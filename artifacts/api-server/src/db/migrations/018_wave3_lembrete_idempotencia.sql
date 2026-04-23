-- ════════════════════════════════════════════════════════════════════
-- FATURAMENTO-TSUNAMI Wave 3 · Migration 018
-- Fecha observação Dr. Claude (auditoria pre-Wave 5):
--   "ON CONFLICT DO NOTHING sem constraint explícita em
--    cobrancas_adicionais era silenciosamente um INSERT comum."
--
-- Solução: idempotência semântica em código (janela 5 min em
-- enviarLembreteInadimplencia) — permite reenvio legítimo dias depois,
-- bloqueia apenas race de cliques rápidos. Aqui só plantamos o índice
-- acelerador do pre-check.
--
-- Aditiva, IF NOT EXISTS, REGRA FERRO respeitada.
-- ════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS ix_cob_lembrete_lookup
  ON cobrancas_adicionais (referencia_tipo, referencia_id, tipo, criado_em DESC);

COMMENT ON INDEX ix_cob_lembrete_lookup IS
  'Wave 3 fix Dr. Claude: acelera pre-check de idempotencia em '
  'enviarLembreteInadimplencia (janela 5min, evita duplicata em race).';
