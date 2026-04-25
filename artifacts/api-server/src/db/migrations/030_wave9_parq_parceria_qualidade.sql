-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION 030 — WAVE 9 PARQ (PARCERIA DE QUALIDADE)
-- ════════════════════════════════════════════════════════════════════════════
-- Substitui conceito de "comissão" (vedado CFM 2.217/2018 art.58/59/68/69 +
-- Decreto 20.931/1932 art.16) por Acordo de Parceria de Qualidade Técnica:
-- contraprestação por auditoria Kaizen bimestral juridicamente defensável
-- (CC arts.593-609 + Res. CFM 2.386/2024 + STJ REsp 2.159.442/PR).
--
-- Adaptado do PDF Dr. Claude com decisões A/B/C aprovadas por Caio:
--   A = PKs BIGSERIAL (compatível com sistema atual INTEGER serial)
--   B = Migration 030 (preserva mapa Dr. Claude; 028+029 reservadas)
--   C = Trigger sync BEFORE INSERT OR UPDATE + backfill imediato dos 8.725
--
-- REGRA FERRO: aditivo, idempotente, multi-tenant via unidade_id, zero DROP
-- de tabelas existentes. Trigger 027 (trg_calc_comissao) INTOCADO.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── ENUMs ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE parq_status_acordo AS ENUM ('vigente','denunciado','suspenso','expirado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE parq_assinatura_tipo AS ENUM (
    'icp_brasil','docusign_clicksign','otp_email','manuscrita_upload','aceite_ip_geo'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE parq_visita_status AS ENUM (
    'agendada','em_andamento','concluida','reprovada','remarcada'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE parq_farmacia_status AS ENUM (
    'gold','silver','bronze','em_correcao','suspensa','denunciada'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE parq_plano_status AS ENUM ('aberto','em_andamento','concluido','expirado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── TABELA: parq_acordos ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parq_acordos (
  id                                BIGSERIAL PRIMARY KEY,
  unidade_id                        INTEGER NOT NULL REFERENCES unidades(id),
  farmacia_id                       INTEGER NOT NULL REFERENCES farmacias_parmavault(id),
  numero_serie                      TEXT NOT NULL UNIQUE,
  versao_termo                      INTEGER NOT NULL DEFAULT 1,
  status                            parq_status_acordo NOT NULL DEFAULT 'vigente',
  emitido_em                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  denunciado_em                     TIMESTAMPTZ,
  denunciado_por                    TEXT CHECK (denunciado_por IN ('clinica','farmacia') OR denunciado_por IS NULL),
  motivo_denuncia                   TEXT,
  sha256_hash                       CHARACTER(64) NOT NULL,
  pdf_url                           TEXT,
  certificado_clinica_cpf_cnpj      TEXT,
  certificado_clinica_data          TIMESTAMPTZ,
  certificado_clinica_serial        TEXT,
  assinatura_farmacia_tipo          parq_assinatura_tipo,
  assinatura_farmacia_data          TIMESTAMPTZ,
  assinatura_farmacia_evidencia     JSONB,
  validacao_simplificada            BOOLEAN NOT NULL DEFAULT FALSE,
  toggle_obrigatoriedade_farmacia   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_parq_acordos_unidade ON parq_acordos(unidade_id);
CREATE INDEX IF NOT EXISTS idx_parq_acordos_farmacia ON parq_acordos(farmacia_id);
CREATE INDEX IF NOT EXISTS idx_parq_acordos_status ON parq_acordos(status);

-- ─── TABELA: parq_visitas_bimestrais ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parq_visitas_bimestrais (
  id                              BIGSERIAL PRIMARY KEY,
  acordo_id                       BIGINT NOT NULL REFERENCES parq_acordos(id) ON DELETE RESTRICT,
  unidade_id                      INTEGER NOT NULL REFERENCES unidades(id),
  farmacia_id                     INTEGER NOT NULL REFERENCES farmacias_parmavault(id),
  data_agendada                   TIMESTAMPTZ NOT NULL,
  data_realizada                  TIMESTAMPTZ,
  farmaceutico_tecnico_auditor_id INTEGER REFERENCES usuarios(id),
  medico_responsavel_id           INTEGER REFERENCES usuarios(id),
  status                          parq_visita_status NOT NULL DEFAULT 'agendada',
  observacoes                     TEXT,
  assinatura_digital_relatorio    JSONB,
  score_geral                     NUMERIC(3,2),
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_parq_visitas_acordo ON parq_visitas_bimestrais(acordo_id);
CREATE INDEX IF NOT EXISTS idx_parq_visitas_data ON parq_visitas_bimestrais(data_agendada);
CREATE INDEX IF NOT EXISTS idx_parq_visitas_farmacia ON parq_visitas_bimestrais(farmacia_id);

-- ─── TABELA: parq_checklist_auditoria ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS parq_checklist_auditoria (
  id              BIGSERIAL PRIMARY KEY,
  visita_id       BIGINT NOT NULL REFERENCES parq_visitas_bimestrais(id) ON DELETE CASCADE,
  categoria       TEXT NOT NULL CHECK (categoria IN ('insumos','processamento','atendimento','entrega','qualidade_geral')),
  item_codigo     TEXT NOT NULL,
  item_descricao  TEXT NOT NULL,
  nota            SMALLINT NOT NULL CHECK (nota BETWEEN 1 AND 5),
  observacao      TEXT,
  evidencia_urls  TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_parq_checklist_visita ON parq_checklist_auditoria(visita_id);
CREATE INDEX IF NOT EXISTS idx_parq_checklist_categoria ON parq_checklist_auditoria(categoria);

-- ─── TABELA: parq_evidencias ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parq_evidencias (
  id                      BIGSERIAL PRIMARY KEY,
  visita_id               BIGINT NOT NULL REFERENCES parq_visitas_bimestrais(id) ON DELETE CASCADE,
  tipo                    TEXT NOT NULL CHECK (tipo IN ('foto','certificado_analise','POP','OM','outro')),
  url                     TEXT NOT NULL,
  sha256_hash             CHARACTER(64) NOT NULL,
  consentimento_farmacia  BOOLEAN NOT NULL DEFAULT FALSE,
  capturado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_parq_evidencias_visita ON parq_evidencias(visita_id);

-- ─── TABELA: parq_planos_acao_kaizen ────────────────────────────────────────
-- NOTA: prazo_limite calculado por trigger BEFORE INSERT/UPDATE (PG 16 rejeita
-- GENERATED ALWAYS AS com cast text→INTERVAL por não ser IMMUTABLE).
CREATE TABLE IF NOT EXISTS parq_planos_acao_kaizen (
  id                          BIGSERIAL PRIMARY KEY,
  visita_id                   BIGINT NOT NULL REFERENCES parq_visitas_bimestrais(id) ON DELETE CASCADE,
  descricao_nao_conformidade  TEXT NOT NULL,
  acao_corretiva_proposta     TEXT NOT NULL,
  responsavel                 TEXT,
  prazo_dias                  INTEGER NOT NULL DEFAULT 30,
  prazo_limite                TIMESTAMPTZ,
  status                      parq_plano_status NOT NULL DEFAULT 'aberto',
  evidencia_conclusao_url     TEXT,
  concluido_em                TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_parq_planos_visita ON parq_planos_acao_kaizen(visita_id);
CREATE INDEX IF NOT EXISTS idx_parq_planos_status ON parq_planos_acao_kaizen(status);

-- Trigger que mantém prazo_limite = created_at + prazo_dias dias
CREATE OR REPLACE FUNCTION calc_parq_plano_prazo_limite() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_at IS NULL THEN
    NEW.created_at := NOW();
  END IF;
  NEW.prazo_limite := NEW.created_at + (COALESCE(NEW.prazo_dias, 30) * INTERVAL '1 day');
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_parq_plano_prazo_limite ON parq_planos_acao_kaizen;
CREATE TRIGGER trg_parq_plano_prazo_limite
  BEFORE INSERT OR UPDATE OF prazo_dias, created_at ON parq_planos_acao_kaizen
  FOR EACH ROW EXECUTE FUNCTION calc_parq_plano_prazo_limite();

-- ─── TABELA: parq_status_farmacia (estado atual de cada farmácia parceira) ──
CREATE TABLE IF NOT EXISTS parq_status_farmacia (
  farmacia_id             INTEGER PRIMARY KEY REFERENCES farmacias_parmavault(id),
  status                  parq_farmacia_status NOT NULL DEFAULT 'bronze',
  score_ultima_auditoria  NUMERIC(3,2),
  proxima_visita_em       DATE,
  indicacoes_ativas       BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TABELA: parq_historico_status ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parq_historico_status (
  id              BIGSERIAL PRIMARY KEY,
  farmacia_id     INTEGER NOT NULL REFERENCES farmacias_parmavault(id),
  status_anterior parq_farmacia_status,
  status_novo     parq_farmacia_status NOT NULL,
  motivo          TEXT,
  mudado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mudado_por      INTEGER REFERENCES usuarios(id)
);
CREATE INDEX IF NOT EXISTS idx_parq_hist_farmacia ON parq_historico_status(farmacia_id);

-- ─── TABELA: parq_assinaturas_farmacia_log ──────────────────────────────────
CREATE TABLE IF NOT EXISTS parq_assinaturas_farmacia_log (
  id                        BIGSERIAL PRIMARY KEY,
  acordo_id                 BIGINT NOT NULL REFERENCES parq_acordos(id) ON DELETE CASCADE,
  tipo_assinatura           parq_assinatura_tipo NOT NULL,
  payload_evidencia         JSONB NOT NULL,
  sha256_documento_assinado CHARACTER(64) NOT NULL,
  timestamp_server_iso      CHARACTER(30) NOT NULL,
  valido                    BOOLEAN NOT NULL DEFAULT TRUE,
  observacoes               TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_parq_log_acordo ON parq_assinaturas_farmacia_log(acordo_id);

-- ─── COLUNAS ESPELHO em parmavault_receitas (aditivo, sem DROP) ─────────────
ALTER TABLE parmavault_receitas ADD COLUMN IF NOT EXISTS parq_estimado NUMERIC(12,2);
ALTER TABLE parmavault_receitas ADD COLUMN IF NOT EXISTS parq_pago BOOLEAN DEFAULT FALSE;
ALTER TABLE parmavault_receitas ADD COLUMN IF NOT EXISTS parq_acordo_id BIGINT REFERENCES parq_acordos(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_parmavault_receitas_parq_acordo ON parmavault_receitas(parq_acordo_id);

-- ─── Trigger sync (decisão C: BEFORE INSERT OR UPDATE) ──────────────────────
CREATE OR REPLACE FUNCTION sync_comissao_to_parq() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.parq_estimado := NEW.comissao_estimada;
  ELSIF TG_OP = 'UPDATE' AND NEW.comissao_estimada IS DISTINCT FROM OLD.comissao_estimada THEN
    NEW.parq_estimado := NEW.comissao_estimada;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_comissao_parq ON parmavault_receitas;
CREATE TRIGGER trg_sync_comissao_parq
  BEFORE INSERT OR UPDATE ON parmavault_receitas
  FOR EACH ROW EXECUTE FUNCTION sync_comissao_to_parq();

-- ─── Backfill imediato dos 8.725 (decisão C aprovada) ───────────────────────
UPDATE parmavault_receitas
   SET parq_estimado = comissao_estimada
 WHERE parq_estimado IS NULL
   AND comissao_estimada IS NOT NULL;

-- ─── VIEWS ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_parq_acordos_vigentes AS
  SELECT * FROM parq_acordos WHERE status = 'vigente';

CREATE OR REPLACE VIEW v_farmacias_auditoria_pendente AS
  SELECT psf.farmacia_id, psf.status, psf.proxima_visita_em,
         (psf.proxima_visita_em - CURRENT_DATE) AS dias_restantes
    FROM parq_status_farmacia psf
   WHERE psf.proxima_visita_em <= CURRENT_DATE + INTERVAL '30 days'
     AND psf.status NOT IN ('suspensa','denunciada');

CREATE OR REPLACE VIEW v_farmacias_suspensas AS
  SELECT * FROM parq_status_farmacia
   WHERE status = 'suspensa' AND indicacoes_ativas = FALSE;

CREATE OR REPLACE VIEW v_parq_validacao_simplificada_alert AS
  SELECT id, numero_serie, farmacia_id, assinatura_farmacia_tipo, emitido_em
    FROM parq_acordos
   WHERE validacao_simplificada = TRUE AND status = 'vigente';

COMMIT;
