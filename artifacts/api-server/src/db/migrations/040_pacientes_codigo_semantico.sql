-- Migration 040 — Wave Cadastro Pádua
-- Aplicada em 2026-05-13 (psql aditivo, REGRA FERRO: zero db:push)
-- Versionada para reprodutibilidade em outros ambientes.
--
-- Adiciona à tabela `pacientes`:
--   - codigo_externo       (id da planilha origem, idempotência por lote)
--   - codigo_semantico     (SLUGCLINICA-SOBR-NOME-SEXO-AAAA-DDDD)
--   - drive_subpastas      (jsonb lazy-create — 7 categorias macro)
--   - telefone_fixo        (canônico — só dígitos)
--   - whatsapp             (canônico — só dígitos)
--
-- Cria tabelas auxiliares:
--   - arquivos_paciente    (registry de arquivos no Drive por paciente)
--   - importacoes_lote     (rastreabilidade de batches de importação)

ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS codigo_externo   text,
  ADD COLUMN IF NOT EXISTS codigo_semantico text,
  ADD COLUMN IF NOT EXISTS drive_subpastas  jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS telefone_fixo    text,
  ADD COLUMN IF NOT EXISTS whatsapp         text;

CREATE INDEX IF NOT EXISTS idx_pacientes_codigo_externo
  ON pacientes (unidade_id, codigo_externo)
  WHERE codigo_externo IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pacientes_codigo_semantico
  ON pacientes (codigo_semantico)
  WHERE codigo_semantico IS NOT NULL;

CREATE TABLE IF NOT EXISTS arquivos_paciente (
  id              serial PRIMARY KEY,
  paciente_id     integer NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  unidade_id      integer NOT NULL REFERENCES unidades(id),
  categoria_macro text NOT NULL,
  tipo_arquivo    text NOT NULL,
  identificador   text,
  nome_arquivo    text NOT NULL,
  drive_file_id   text,
  drive_file_url  text,
  mime_type       text,
  tamanho_bytes   bigint,
  origem          text,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  metadata        jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_arquivos_paciente_paciente_id
  ON arquivos_paciente (paciente_id);

CREATE INDEX IF NOT EXISTS idx_arquivos_paciente_categoria
  ON arquivos_paciente (paciente_id, categoria_macro);

CREATE TABLE IF NOT EXISTS importacoes_lote (
  id                          serial PRIMARY KEY,
  origem                      text NOT NULL,
  spreadsheet_id              text,
  unidade_id                  integer NOT NULL REFERENCES unidades(id),
  total_linhas                integer NOT NULL DEFAULT 0,
  importados                  integer NOT NULL DEFAULT 0,
  pulados_sem_telefone        integer NOT NULL DEFAULT 0,
  pulados_inadequado          integer NOT NULL DEFAULT 0,
  pulados_duplicado_cpf       integer NOT NULL DEFAULT 0,
  pulados_duplicado_email_tel integer NOT NULL DEFAULT 0,
  erros                       integer NOT NULL DEFAULT 0,
  iniciado_em                 timestamptz NOT NULL DEFAULT now(),
  finalizado_em               timestamptz,
  detalhes                    jsonb DEFAULT '{}'::jsonb
);
