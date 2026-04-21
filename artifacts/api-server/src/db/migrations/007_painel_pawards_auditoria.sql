-- Migration 007 — Trilha de auditoria do Painel PAWARDS
-- Cada GET no /painel-pawards/* grava um registro identificado.
-- IDEMPOTENTE.

CREATE TABLE IF NOT EXISTS painel_pawards_auditoria (
  id            serial PRIMARY KEY,
  usuario_id    integer,
  email         text,
  perfil        text,
  metodo        text NOT NULL,
  endpoint      text NOT NULL,
  ip            text,
  user_agent    text,
  acessado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_painel_pawards_auditoria_acessado_em
  ON painel_pawards_auditoria(acessado_em DESC);

CREATE INDEX IF NOT EXISTS idx_painel_pawards_auditoria_usuario
  ON painel_pawards_auditoria(usuario_id);
