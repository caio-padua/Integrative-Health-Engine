-- =====================================================================
-- Migration 003 — AUDITORES + ANASTOMOSES + EMAIL SEMANAL PACIENTE
-- Onda PAWARDS Gestão Clínica (21/abr/2026)
-- IDEMPOTENTE — pode rodar N vezes sem quebrar nada.
-- Convenção rígida: id SERIAL PRIMARY KEY (idêntico ao restante do projeto).
-- =====================================================================

-- =====================================================================
-- 1) Áreas de atuação (catálogo de 4 escopos canônicos)
-- =====================================================================
CREATE TABLE IF NOT EXISTS auditor_areas_atuacao (
  codigo        text PRIMARY KEY,
  rotulo        text NOT NULL,
  descricao     text NOT NULL,
  cor_hex       text NOT NULL,
  emoji         text NOT NULL,
  ordem         integer NOT NULL DEFAULT 0
);

INSERT INTO auditor_areas_atuacao (codigo, rotulo, descricao, cor_hex, emoji, ordem) VALUES
  ('TECNICO',  'Técnico do Sistema',         'Erros, latência, segurança, divergência Drive ↔ banco', '#5B6B7A', '🛡️', 1),
  ('CLINICO',  'Processos Clínicos Locais',  'Movimentação clínica diária da unidade — RAs, prescrições, exames', '#2E8B6B', '🩺', 2),
  ('LOCAL',    'Visão Local Estratégica',    'Operação clínica × resultado financeiro da unidade', '#C9A961', '📈', 3),
  ('GLOBAL',   'Visão Global de Expansão',   'Cross-unit, franquia, consultoria, assessoria, oportunidades', '#6B4E8F', '🌐', 4)
ON CONFLICT (codigo) DO UPDATE SET
  rotulo=EXCLUDED.rotulo, descricao=EXCLUDED.descricao,
  cor_hex=EXCLUDED.cor_hex, emoji=EXCLUDED.emoji, ordem=EXCLUDED.ordem;

-- =====================================================================
-- 2) Auditores (entidades virtuais que vigiam o sistema)
-- =====================================================================
CREATE TABLE IF NOT EXISTS auditores (
  id                    serial PRIMARY KEY,
  nome                  text NOT NULL,
  apelido               text NOT NULL,
  papel                 text NOT NULL,
  area_atuacao_codigo   text NOT NULL REFERENCES auditor_areas_atuacao(codigo),
  especialidade         text NOT NULL,
  tom_voz               text NOT NULL,
  bio_curta             text NOT NULL,
  cor_hex               text NOT NULL,
  emoji                 text NOT NULL,
  foto_avatar_url       text,
  -- visibilidade global: o auditor vê dados identificáveis de paciente?
  ve_paciente_identificado boolean NOT NULL DEFAULT false,
  -- horário diário/semanal padrão de envio (HH:MM em TZ America/Sao_Paulo)
  horario_envio_padrao  text NOT NULL DEFAULT '08:00',
  cadencia              text NOT NULL DEFAULT 'DIARIA' CHECK (cadencia IN ('DIARIA','SEMANAL','MENSAL','TEMPO REAL')),
  fictionario           boolean NOT NULL DEFAULT true,
  ativo                 boolean NOT NULL DEFAULT true,
  criado_em             timestamptz NOT NULL DEFAULT now(),
  atualizado_em         timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS auditores_apelido_uniq ON auditores(apelido);

-- =====================================================================
-- 3) Visibilidade granular por recurso
--    Define o que cada auditor pode ler. Escopos:
--      NENHUM       — não pode acessar
--      AGREGADO     — só números totais (sem pessoa identificável)
--      IDENTIFICAVEL — pode ver nomes, CPFs, prontuários (LGPD-pesado)
-- =====================================================================
CREATE TABLE IF NOT EXISTS auditor_visibilidade_regras (
  id            serial PRIMARY KEY,
  auditor_id    integer NOT NULL REFERENCES auditores(id) ON DELETE CASCADE,
  recurso       text NOT NULL,    -- ex: PACIENTES, PRESCRICOES, RAS, FINANCEIRO, USUARIOS, DRIVE_EVENTOS
  escopo        text NOT NULL CHECK (escopo IN ('NENHUM','AGREGADO','IDENTIFICAVEL')),
  observacao    text,
  UNIQUE (auditor_id, recurso)
);

-- =====================================================================
-- 4) Mensagens dos auditores ao CEO (caixa do CEO)
-- =====================================================================
CREATE TABLE IF NOT EXISTS auditor_mensagens (
  id              serial PRIMARY KEY,
  auditor_id      integer NOT NULL REFERENCES auditores(id),
  ceo_usuario_id  integer NOT NULL REFERENCES usuarios(id),
  unidade_id      integer REFERENCES unidades(id),  -- NULL = visão global
  titulo          text NOT NULL,                     -- MAIÚSCULA, curto
  bullets         jsonb NOT NULL DEFAULT '[]'::jsonb, -- ate 5 bullets
  pergunta        text,                              -- fechada
  prioridade      text NOT NULL DEFAULT 'NORMAL' CHECK (prioridade IN ('BAIXA','NORMAL','ALTA','CRITICA')),
  status          text NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE','LIDA','DECIDIDA','ADIADA','EXPIRADA')),
  decisao         text,                              -- LI / DECIDIR / ADIAR / texto livre
  decisao_payload jsonb,
  ref_categoria   text,                              -- RA / PRESCRICAO / EXAME / FINANCEIRO / SISTEMA
  ref_id          integer,
  link_externo    text,
  criada_em       timestamptz NOT NULL DEFAULT now(),
  lida_em         timestamptz,
  decidida_em     timestamptz,
  proximo_lembrete_em timestamptz
);
CREATE INDEX IF NOT EXISTS auditor_msgs_status_ix ON auditor_mensagens(status, prioridade DESC, criada_em DESC);
CREATE INDEX IF NOT EXISTS auditor_msgs_ceo_ix    ON auditor_mensagens(ceo_usuario_id, status);

-- =====================================================================
-- 5) Eventos do Drive capturados (alimenta planilha de auditoria)
-- =====================================================================
CREATE TABLE IF NOT EXISTS auditor_eventos_drive (
  id              serial PRIMARY KEY,
  evento_uuid     text NOT NULL,
  ts              timestamptz NOT NULL DEFAULT now(),
  ator_email      text,
  ator_nome       text,
  acao            text NOT NULL,            -- CRIOU / INCLUIU / MOVEU / RENOMEOU / EXCLUIU / COMPARTILHOU
  empresa_nome    text,
  empresa_cnpj    text,
  paciente_nome   text,
  paciente_cpf    text,
  categoria       text,                      -- RA / PRESCRICAO / EXAME / MENSAGEM / CONTRATO / FINANCEIRO / OUTRO
  pasta_caminho   text,
  arquivo_nome    text,
  arquivo_tipo    text,
  arquivo_tamanho_bytes bigint,
  status          text NOT NULL DEFAULT 'OK' CHECK (status IN ('OK','AVISO','ERRO')),
  severidade      text NOT NULL DEFAULT 'info' CHECK (severidade IN ('info','warn','error','critical')),
  mensagem_humano text,
  detalhe_json    jsonb,
  drive_file_id   text,
  link_drive      text,
  sincronizado_pawards text NOT NULL DEFAULT 'PENDENTE' CHECK (sincronizado_pawards IN ('SIM','PENDENTE','NAO','NA')),
  ref_pawards_id  integer,
  ref_pawards_tabela text
);
CREATE UNIQUE INDEX IF NOT EXISTS auditor_eventos_uuid_uniq ON auditor_eventos_drive(evento_uuid);
CREATE INDEX IF NOT EXISTS auditor_eventos_ts_ix ON auditor_eventos_drive(ts DESC);

-- =====================================================================
-- 6) Anastomoses pendentes (registra "walking deads" para serem fechados)
-- =====================================================================
CREATE TABLE IF NOT EXISTS anastomoses_pendentes (
  id              serial PRIMARY KEY,
  modulo          text NOT NULL,            -- ex: PRESCRICAO_PADCON, AUDITORIA, EMAIL_PACIENTE
  titulo          text NOT NULL,
  descricao       text NOT NULL,
  criticidade     text NOT NULL DEFAULT 'media' CHECK (criticidade IN ('baixa','media','alta','critica')),
  status          text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','em_andamento','fechada','descartada')),
  responsavel     text,
  proximo_passo   text,
  criada_em       timestamptz NOT NULL DEFAULT now(),
  fechada_em      timestamptz,
  fechamento_nota text
);
CREATE INDEX IF NOT EXISTS anastomoses_status_ix ON anastomoses_pendentes(status, criticidade DESC);

-- =====================================================================
-- 7) E-mail semanal do paciente (controle de envios)
-- =====================================================================
CREATE TABLE IF NOT EXISTS paciente_email_semanal (
  id              serial PRIMARY KEY,
  paciente_id     integer NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  semana_iso      text NOT NULL,            -- "2026-W17"
  enviado_em      timestamptz,
  destinatario    text NOT NULL,
  assunto         text NOT NULL,
  html_snapshot   text,
  status          text NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado','enviado','falha','suprimido')),
  erro            text,
  message_id      text,
  UNIQUE (paciente_id, semana_iso)
);
CREATE INDEX IF NOT EXISTS pac_email_sem_status_ix ON paciente_email_semanal(status, semana_iso);

-- =====================================================================
-- 8) Drive root anchors da estrutura GESTAO CLINICA / AUDITORIA
--    Guarda os file_id das pastas mestras pra não recriar/buscar toda hora
-- =====================================================================
CREATE TABLE IF NOT EXISTS drive_anchors (
  id              serial PRIMARY KEY,
  chave           text NOT NULL UNIQUE,     -- ex: GESTAO_CLINICA_ROOT, AUDITORIA_ROOT, AUDITORIA_DASHBOARD, AUDITORIA_ATIVA, AUDITORIA_LEGADO
  drive_file_id   text NOT NULL,
  drive_url       text,
  observacao      text,
  atualizado_em   timestamptz NOT NULL DEFAULT now()
);
