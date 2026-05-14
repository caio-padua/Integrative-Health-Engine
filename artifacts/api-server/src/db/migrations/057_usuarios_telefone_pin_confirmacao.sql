-- Migration 057 — Confirmacao por PIN antes de gravar o WhatsApp do CEO (Task #244)
--
-- Contexto:
--   A tela /plataforma/perfil grava `usuarios.telefone` direto via
--   PUT /api/usuarios/:id assim que passa na mascara/E.164. Se o CEO
--   digitar errado, os alertas criticos doc_signed/doc_refused (Task #36)
--   vao silenciosamente pra outra pessoa. Esta migration cria o suporte
--   pra um PIN curto enviado pelo proprio canal WhatsApp ANTES de
--   persistir o numero — assim se o numero estiver errado, o PIN nunca
--   chega e o cadastro nao acontece.
--
-- IDEMPOTENTE: tudo com IF NOT EXISTS.

-- Pendencia ATIVA por usuario. Ao iniciar a confirmacao de um numero
-- novo, qualquer pendencia anterior do mesmo usuario e substituida
-- (UPSERT pela UNIQUE em usuario_id).
CREATE TABLE IF NOT EXISTS usuarios_telefone_pin_pendente (
  id                  serial PRIMARY KEY,
  usuario_id          integer NOT NULL UNIQUE
                       REFERENCES usuarios(id) ON DELETE CASCADE,
  telefone_e164       text NOT NULL,
  pin_hash            text NOT NULL,                    -- bcrypt do PIN de 6 digitos
  criado_em           timestamptz NOT NULL DEFAULT now(),
  expira_em           timestamptz NOT NULL,             -- criado_em + 10min
  tentativas          integer NOT NULL DEFAULT 0,       -- erradas no /confirmar
  consumido_em        timestamptz                       -- NULL = ainda valido
);

CREATE INDEX IF NOT EXISTS idx_usuarios_telefone_pin_pendente_expira_em
  ON usuarios_telefone_pin_pendente(expira_em);

-- Log de cada DISPARO de PIN (rate-limit por usuario: 3 disparos / 1h).
-- Mantido separado da pendencia ativa pra que substituir a pendencia
-- (numero corrigido) NAO zere a contagem do rate-limit.
CREATE TABLE IF NOT EXISTS usuarios_telefone_pin_envios (
  id                  serial PRIMARY KEY,
  usuario_id          integer NOT NULL
                       REFERENCES usuarios(id) ON DELETE CASCADE,
  telefone_e164       text NOT NULL,
  enviado_em          timestamptz NOT NULL DEFAULT now(),
  sucesso             boolean NOT NULL,
  erro_detalhes       text
);

CREATE INDEX IF NOT EXISTS idx_usuarios_telefone_pin_envios_usuario_em
  ON usuarios_telefone_pin_envios(usuario_id, enviado_em DESC);
