-- Wave Cadastro Pádua — 041 — campos faltantes pra ficha cadastral completa
-- (alinhada com a planilha "Cadastro Mestre Unificado de Pacientes" do print Caio)
-- Data: 2026-05-13 madrugada
-- Princípio: REGRA FERRO — psql aditivo IF NOT EXISTS, nada de drop/db:push.

ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS nome_social text;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS rg text;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS plano_saude text;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS numero_plano text;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS nome_pai text;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS nome_conjuge text;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS profissional_responsavel text;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS como_nos_conheceu text;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS observacoes text;

-- Persistência da Spreadsheet "FICHA CADASTRAL" gerada por paciente
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS ficha_cadastral_sheet_id text;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS ficha_cadastral_sheet_url text;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS arvore_drive_provisionada_em timestamp with time zone;
