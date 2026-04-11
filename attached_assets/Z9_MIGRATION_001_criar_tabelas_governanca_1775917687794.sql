/**
 * MIGRATION 001: Criar tabelas de governança
 * ============================================
 * 
 * Cria as 4 tabelas novas para implementar os 5 gaps:
 * 1. fila_preceptor — Fila do preceptor com prazo 48h
 * 2. auditoria_cascata — Log de toggle da cascata
 * 3. alertas_twilio — Alertas via WhatsApp/Twilio
 * 4. Atualizar usuarios — Adicionar hierarquia clínica
 * 
 * Executar com:
 * psql -U postgres -d seu_banco < MIGRATION_001_criar_tabelas_governanca.sql
 */

-- ========== 1. ATUALIZAR TABELA usuarios ==========
-- Adicionar coluna "role" e permissões
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'MEDICO_ASSISTENTE',
ADD COLUMN IF NOT EXISTS pode_validar BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pode_assinar BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pode_bypass BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pode_emitir_nf BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pode_ver_dados_outras_empresas BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS nunca_opera BOOLEAN DEFAULT FALSE;

-- Adicionar constraint para role
ALTER TABLE usuarios 
ADD CONSTRAINT usuarios_role_check CHECK (
  role IN (
    'MEDICO_DIRETOR_CLINICO',
    'MEDICO_SUPERVISOR_1',
    'MEDICO_SUPERVISOR_2',
    'MEDICO_SUPERVISOR_3',
    'MEDICO_SUPERVISOR_4',
    'MEDICO_SUPERVISOR_5',
    'MEDICO_ASSISTENTE',
    'ENFERMEIRA',
    'CONSULTOR',
    'PACIENTE'
  )
);

-- ========== 2. CRIAR TABELA fila_preceptor ==========
CREATE TABLE IF NOT EXISTS fila_preceptor (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
  prontuario_id INTEGER,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'VALIDADO', 'ASSINADO', 'REJEITADO')),
  
  -- Prazo 48h
  prazo_maximo TIMESTAMP WITH TIME ZONE NOT NULL,
  prazo_ultim_aviso TIMESTAMP WITH TIME ZONE,
  
  -- Escalation automático
  escalation_ativo BOOLEAN NOT NULL DEFAULT FALSE,
  escalation_enviado_em TIMESTAMP WITH TIME ZONE,
  
  -- Validação
  validado_por_id INTEGER REFERENCES usuarios(id),
  validado_em TIMESTAMP WITH TIME ZONE,
  observacao_validacao TEXT,
  
  -- Rejeição
  rejeitado_em TIMESTAMP WITH TIME ZONE,
  motivo_rejeicao TEXT,
  
  -- Assinatura digital
  assinatura_digital TEXT,
  assinado_em TIMESTAMP WITH TIME ZONE,
  
  -- Rastreabilidade
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fila_preceptor_status ON fila_preceptor(status);
CREATE INDEX idx_fila_preceptor_paciente_id ON fila_preceptor(paciente_id);
CREATE INDEX idx_fila_preceptor_prazo_maximo ON fila_preceptor(prazo_maximo);

-- ========== 3. CRIAR TABELA auditoria_cascata ==========
CREATE TABLE IF NOT EXISTS auditoria_cascata (
  id SERIAL PRIMARY KEY,
  
  -- Ação
  acao TEXT NOT NULL CHECK (acao IN ('LIGOU', 'DESLIGOU', 'ALTEROU_ETAPA')),
  
  -- Etapa afetada
  etapa TEXT CHECK (etapa IN ('ENFERMEIRA03', 'CONSULTOR03', 'MEDICO03', 'MEDICO_SENIOR')),
  
  -- Valores
  valor_anterior BOOLEAN,
  valor_novo BOOLEAN,
  
  -- Quem fez
  realizado_por_id INTEGER NOT NULL REFERENCES usuarios(id),
  
  -- Por quê
  motivo TEXT,
  
  -- Quando
  realizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auditoria_cascata_etapa ON auditoria_cascata(etapa);
CREATE INDEX idx_auditoria_cascata_realizado_por_id ON auditoria_cascata(realizado_por_id);
CREATE INDEX idx_auditoria_cascata_realizado_em ON auditoria_cascata(realizado_em);

-- ========== 4. CRIAR TABELA alertas_twilio ==========
CREATE TABLE IF NOT EXISTS alertas_twilio (
  id SERIAL PRIMARY KEY,
  
  -- Tipo de alerta
  tipo TEXT NOT NULL CHECK (tipo IN ('FILA_PRECEPTOR_PENDENTE', 'CASCATA_ALTERADA', 'EXAME_RECEBIDO', 'ALERTA_CLINICO')),
  
  -- Destinatário
  destinatario_id INTEGER NOT NULL REFERENCES usuarios(id),
  numero_whatsapp TEXT NOT NULL,
  
  -- Conteúdo
  mensagem TEXT NOT NULL,
  link_acao TEXT,
  
  -- Status de confirmação
  status TEXT NOT NULL DEFAULT 'ENVIADO' CHECK (status IN ('ENVIADO', 'ENTREGUE', 'LIDO', 'CONFIRMADO', 'EXPIRADO')),
  
  -- Confirmação de leitura
  confirmado_em TIMESTAMP WITH TIME ZONE,
  confirmado_por_id INTEGER REFERENCES usuarios(id),
  
  -- Expiração (24h)
  expira_em TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Rastreabilidade
  enviado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  entregue_em TIMESTAMP WITH TIME ZONE,
  
  -- Webhook Twilio
  twilio_sid TEXT,
  twilio_status TEXT
);

CREATE INDEX idx_alertas_twilio_destinatario_id ON alertas_twilio(destinatario_id);
CREATE INDEX idx_alertas_twilio_status ON alertas_twilio(status);
CREATE INDEX idx_alertas_twilio_expira_em ON alertas_twilio(expira_em);
CREATE INDEX idx_alertas_twilio_twilio_sid ON alertas_twilio(twilio_sid);

-- ========== 5. CRIAR TABELA cascata_validacao_config ==========
-- (Se não existir — pode ser que já exista no schema)
CREATE TABLE IF NOT EXISTS cascata_validacao_config (
  id SERIAL PRIMARY KEY,
  
  -- Flags de etapas
  requer_enfermeira03 BOOLEAN NOT NULL DEFAULT TRUE,
  requer_consultor03 BOOLEAN NOT NULL DEFAULT TRUE,
  requer_medico03 BOOLEAN NOT NULL DEFAULT TRUE,
  requer_medico_senior BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Certificado A1 obrigatório
  certificado_a1_obrigatorio BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Rastreabilidade
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ========== 6. CRIAR TRIGGER PARA atualizado_em ==========
CREATE OR REPLACE FUNCTION atualizar_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger nas tabelas novas
DROP TRIGGER IF EXISTS trigger_atualizar_atualizado_em_fila_preceptor ON fila_preceptor;
CREATE TRIGGER trigger_atualizar_atualizado_em_fila_preceptor
BEFORE UPDATE ON fila_preceptor
FOR EACH ROW
EXECUTE FUNCTION atualizar_atualizado_em();

DROP TRIGGER IF EXISTS trigger_atualizar_atualizado_em_cascata_validacao_config ON cascata_validacao_config;
CREATE TRIGGER trigger_atualizar_atualizado_em_cascata_validacao_config
BEFORE UPDATE ON cascata_validacao_config
FOR EACH ROW
EXECUTE FUNCTION atualizar_atualizado_em();

-- ========== 7. COMENTÁRIOS PARA DOCUMENTAÇÃO ==========
COMMENT ON TABLE fila_preceptor IS 'Fila do preceptor (Dr. Caio) com prontuários aguardando validação. Prazo máximo: 48h. Escalation automática se não validar.';
COMMENT ON TABLE auditoria_cascata IS 'Log completo de quem ligou/desligou a cascata de validação e por quê.';
COMMENT ON TABLE alertas_twilio IS 'Alertas enviados via WhatsApp/Twilio com confirmação de leitura (ACK).';
COMMENT ON TABLE cascata_validacao_config IS 'Configuração da cascata de validação com flags por etapa.';

COMMENT ON COLUMN fila_preceptor.nunca_opera IS 'Flag especial para Dr. Caio: nunca opera (cria, edita, deleta), apenas valida e supervisiona.';
COMMENT ON COLUMN alertas_twilio.status IS 'Status do alerta: ENVIADO → ENTREGUE → LIDO → CONFIRMADO. Expira em 24h.';

-- ========== 8. VERIFICAR CRIAÇÃO ==========
SELECT 
  table_name 
FROM 
  information_schema.tables 
WHERE 
  table_schema = 'public' 
  AND table_name IN ('fila_preceptor', 'auditoria_cascata', 'alertas_twilio', 'cascata_validacao_config')
ORDER BY 
  table_name;
