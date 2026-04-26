-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION 031 — WAVE 10 ZAPSIGN (Assinatura Digital Nativa WhatsApp + ICP)
-- ════════════════════════════════════════════════════════════════════════════
-- Substitui DocuSign por ZapSign + ICP-Brasil. Adiciona manifesto judicial
-- de auditoria (Lei 14.063/2020 + STJ REsp 2.159.442/2025 + CFM 2.299/2021
-- art. 4º + CFM 1.821/2007 retenção 20 anos).
--
-- ORDEM aprovada Dr. Claude/Caio (26/abr/2026):
--   F3.A = Família 4 PARQ  (ICP+ICP)
--   F3.B = Família 1 TCLE  (ICP médico + ZapSign paciente WhatsApp)
--   F3.C = Família 3 OrcaF (ICP farmácia + ZapSign paciente WhatsApp)
--
-- REGRA FERRO: zero db:push, zero DROP, zero ALTER em PK. Tudo IF NOT EXISTS.
-- Migration 030 PARQ + Trigger 027 (trg_calc_comissao) INTOCADOS.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── ENUM novo: modalidades de autenticação ZapSign (Lei 14.063 níveis 1-3) ─
DO $$ BEGIN
  CREATE TYPE zapsign_auth_method AS ENUM (
    'assinaturaTela',                    -- toque + nome digitado (simples)
    'assinaturaTela-tokenWhatsApp',      -- toque + OTP WhatsApp (avançada)
    'assinaturaTela-tokenEmail',          -- toque + OTP email (avançada)
    'tokenWhatsapp',                     -- só OTP WhatsApp (sem desenho)
    'certificadoDigital',                -- ICP-Brasil A1/A3 (qualificada)
    'biometria-facial'                   -- selfie + liveness (avançada+)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Tabela auditoria_assinaturas — manifesto judicial mínimo ───────────────
-- Persiste local mesmo se conta ZapSign for cancelada (prova autônoma judicial)
CREATE TABLE IF NOT EXISTS auditoria_assinaturas (
  id                      BIGSERIAL PRIMARY KEY,
  signature_id            TEXT NOT NULL UNIQUE,
  solicitacao_id          INTEGER REFERENCES assinatura_solicitacoes(id),
  envelope_id             TEXT NOT NULL,
  external_id             TEXT,
  document_hash_sha256    TEXT NOT NULL,
  document_hash_assinado  TEXT,
  signer_cpf              TEXT NOT NULL,
  signer_name             TEXT NOT NULL,
  signer_papel            TEXT NOT NULL,
  signer_ip               INET NOT NULL,
  signer_geo              JSONB,
  user_agent              TEXT NOT NULL,
  auth_method             zapsign_auth_method NOT NULL,
  auth_evidence_json      JSONB NOT NULL,
  timestamp_utc           TIMESTAMPTZ NOT NULL,
  icp_brasil_serial       TEXT,
  icp_brasil_ac           TEXT,
  validation_url          TEXT NOT NULL,
  pdf_storage_key         TEXT,
  retencao_ate            DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '20 years'),
  criado_em               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auditoria_assin_envelope_idx ON auditoria_assinaturas(envelope_id);
CREATE INDEX IF NOT EXISTS auditoria_assin_cpf_idx       ON auditoria_assinaturas(signer_cpf);
CREATE INDEX IF NOT EXISTS auditoria_assin_solic_idx     ON auditoria_assinaturas(solicitacao_id);
CREATE INDEX IF NOT EXISTS auditoria_assin_hash_idx      ON auditoria_assinaturas(document_hash_sha256);
CREATE INDEX IF NOT EXISTS auditoria_assin_retencao_idx  ON auditoria_assinaturas(retencao_ate);
CREATE INDEX IF NOT EXISTS auditoria_assin_external_idx  ON auditoria_assinaturas(external_id);

COMMENT ON TABLE auditoria_assinaturas IS
  'Manifesto judicial mínimo (Lei 14.063/2020 + STJ REsp 2.159.442/2025). Prova autônoma local mesmo se conta ZapSign for cancelada.';
COMMENT ON COLUMN auditoria_assinaturas.auth_evidence_json IS
  'Payload completo do signatário no webhook ZapSign — prova criptográfica (token enviado, hora click, hora finalização).';
COMMENT ON COLUMN auditoria_assinaturas.retencao_ate IS
  'CFM 1.821/2007 — retenção 20 anos prontuário médico.';

-- ─── Tabela assinatura_oneclick_aceites — termo de uso (sem PDF, R$ 0,50) ───
-- DEFERIDO Wave 10 (Família 7 backlog). Tabela criada agora pra evitar
-- migration nova quando ativar OneClick. Zero linhas até F3 OneClick rodar.
CREATE TABLE IF NOT EXISTS assinatura_oneclick_aceites (
  id                BIGSERIAL PRIMARY KEY,
  zapsign_token     TEXT NOT NULL UNIQUE,
  paciente_id       INTEGER REFERENCES pacientes(id),
  termo_codigo      TEXT NOT NULL,
  termo_versao      TEXT NOT NULL,
  termo_hash_sha256 TEXT NOT NULL,
  signer_ip         INET NOT NULL,
  signer_geo        JSONB,
  user_agent        TEXT NOT NULL,
  aceito_em         TIMESTAMPTZ NOT NULL,
  validation_url    TEXT NOT NULL,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS oneclick_paciente_idx ON assinatura_oneclick_aceites(paciente_id);
CREATE INDEX IF NOT EXISTS oneclick_termo_idx    ON assinatura_oneclick_aceites(termo_codigo, termo_versao);

COMMENT ON TABLE assinatura_oneclick_aceites IS
  'Aceites de termo de uso via OneClick (sem PDF). R$ 0,50/aceite, equivalente juridicamente a clique-aceite (CPC art. 374, II).';

-- ─── Coluna nova em assinatura_solicitacoes pra reconciliar webhook ─────────
ALTER TABLE assinatura_solicitacoes
  ADD COLUMN IF NOT EXISTS zapsign_external_id TEXT;
CREATE INDEX IF NOT EXISTS assin_solic_external_idx
  ON assinatura_solicitacoes(zapsign_external_id);

COMMENT ON COLUMN assinatura_solicitacoes.zapsign_external_id IS
  'ID interno PAWARDS estável (ex: tcle-12345-ts) enviado ao ZapSign como external_id; usado pra reconciliar webhook→DB sem ambiguidade.';

-- ─── Tabela parq_acordos: alinhar tipo de assinatura com ZapSign ────────────
-- Não alteramos o ENUM existente (parq_assinatura_tipo) por compatibilidade
-- Wave 9. Apenas adicionamos coluna de cross-ref pro signature_id ZapSign.
ALTER TABLE parq_acordos
  ADD COLUMN IF NOT EXISTS zapsign_envelope_clinica TEXT,
  ADD COLUMN IF NOT EXISTS zapsign_envelope_farmacia TEXT;

COMMENT ON COLUMN parq_acordos.zapsign_envelope_clinica IS
  'doc_token ZapSign do envelope assinado pela clínica (ICP e-CNPJ).';
COMMENT ON COLUMN parq_acordos.zapsign_envelope_farmacia IS
  'doc_token ZapSign do envelope assinado pela farmácia (ICP e-CNPJ).';

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
-- INVARIANTES PÓS-MIGRATION (rodar manualmente pra validar)
-- ════════════════════════════════════════════════════════════════════════════
-- (1) ENUM zapsign_auth_method com 6 valores
-- SELECT count(*) FROM pg_enum WHERE enumtypid='zapsign_auth_method'::regtype;
-- → esperado: 6
--
-- (2) auditoria_assinaturas com 0 linhas (tabela nova)
-- SELECT count(*) FROM auditoria_assinaturas; → 0
--
-- (3) assinatura_oneclick_aceites com 0 linhas
-- SELECT count(*) FROM assinatura_oneclick_aceites; → 0
--
-- (4) coluna zapsign_external_id existe e nullable
-- SELECT column_name, is_nullable FROM information_schema.columns
--   WHERE table_name='assinatura_solicitacoes' AND column_name='zapsign_external_id';
--
-- (5) Wave 9 PARQ intocada
-- SELECT count(*) FROM parq_acordos;                      → mantém Wave 9
-- SELECT count(*) FROM parmavault_receitas;               → 8.725
-- SELECT to_char(sum(comissao_estimada),'FM999G999G990D00')
--   FROM parmavault_receitas;                              → 2.735.336,10
--
-- (6) Trigger 027 ainda ativo
-- SELECT tgname FROM pg_trigger WHERE tgname='trg_calc_comissao';  → 1 linha
-- ════════════════════════════════════════════════════════════════════════════
