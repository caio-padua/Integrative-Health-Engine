-- ============================================================================
-- Migration 046 · Wave 13 — TOTP rate-limit persistido (Task #144)
-- ============================================================================
--
-- Origem: Task #144 ("Sobreviver a reinicio do servidor sem zerar bloqueios
-- de 2FA"). O helper rateLimitTotp criado na Task #131 mantinha o contador
-- de tentativas erradas em memoria do processo (Map<usuarioId, ...>). Se o
-- atacante derrubasse o servidor (ou o deploy reiniciasse) o contador
-- voltava a zero e ele ganhava mais 5 tentativas. Em multi-replica nem
-- compartilhava estado entre instancias.
--
-- Esta tabela persiste o contador no Postgres com TTL de 5 minutos
-- (representado por `reseta_em`). Comportamento preservado:
--   - 5 tentativas erradas em janela deslizante de 5 min por usuario
--   - reset imediato no acerto (DELETE da linha)
--   - janelas expiradas sao tratadas como "sem tentativas" (e o INSERT
--     reaproveita a linha resetando contador=1).
--
-- REGRA FERRO Caio: psql aditivo IF NOT EXISTS, ZERO db:push.
-- Invariantes Wave 9 INTOCADOS (8.728 receitas + R$ 2.736.536,10).
-- ============================================================================

CREATE TABLE IF NOT EXISTS totp_rate_limit_tentativas (
  usuario_id     integer PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  contador       integer NOT NULL DEFAULT 0,
  reseta_em      timestamptz NOT NULL,
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);

-- Indice para varrer linhas expiradas rapidamente (housekeeping opcional).
CREATE INDEX IF NOT EXISTS ix_totp_rate_limit_reseta_em
  ON totp_rate_limit_tentativas (reseta_em);

COMMENT ON TABLE totp_rate_limit_tentativas IS
  'Wave 13 Task #144 — contador persistido de tentativas erradas de codigo '
  'TOTP por usuario. Substitui o Map em memoria do helper rateLimitTotp '
  '(Task #131) pra sobreviver a reinicio do servidor e funcionar entre '
  'replicas. TTL de 5min via coluna reseta_em.';

COMMENT ON COLUMN totp_rate_limit_tentativas.contador IS
  'Quantidade de tentativas erradas dentro da janela atual. Bloqueio em >=5.';
COMMENT ON COLUMN totp_rate_limit_tentativas.reseta_em IS
  'Instante em que a janela expira. Se now() > reseta_em o contador deve '
  'ser tratado como zero (e o proximo registro reabre a janela).';
