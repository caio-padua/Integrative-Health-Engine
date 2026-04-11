/**
 * SEED 002: Hierarquia clínica e dados iniciais
 * ==============================================
 * 
 * Popula as tabelas com:
 * 1. Dr. Caio como MEDICO_DIRETOR_CLINICO (nunca_opera = true)
 * 2. 5 supervisores
 * 3. Enfermeiras e consultores
 * 4. Configuração inicial da cascata
 * 
 * Executar com:
 * psql -U postgres -d seu_banco < SEED_002_hierarquia_e_dados_iniciais.sql
 */

-- ========== 1. ATUALIZAR DR. CAIO ==========
-- Buscar ID do Dr. Caio (email: caio@clinica.com)
UPDATE usuarios 
SET 
  role = 'MEDICO_DIRETOR_CLINICO',
  pode_validar = TRUE,
  pode_assinar = TRUE,
  pode_bypass = TRUE,
  pode_emitir_nf = TRUE,
  pode_ver_dados_outras_empresas = TRUE,
  nunca_opera = TRUE  -- ⚠️ CRÍTICO: Dr. Caio nunca opera
WHERE 
  email = 'caio@clinica.com';

-- ========== 2. CRIAR 5 SUPERVISORES ==========
-- Supervisor 1
INSERT INTO usuarios (
  nome, email, senha, role, 
  pode_validar, pode_assinar, pode_bypass, pode_emitir_nf, pode_ver_dados_outras_empresas,
  unidade_id, crm, cpf, cns, especialidade, telefone, ativo
) VALUES (
  'Dr. Supervisor 1',
  'supervisor1@clinica.com',
  '$2a$10$...',  -- Hash bcrypt de 'senha123'
  'MEDICO_SUPERVISOR_1',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  1, '125476', '12345678901', '1234567890123', 'Medicina Integrativa', '(11) 97715-4001', TRUE
) ON CONFLICT (email) DO UPDATE SET role = 'MEDICO_SUPERVISOR_1';

-- Supervisor 2
INSERT INTO usuarios (
  nome, email, senha, role,
  pode_validar, pode_assinar, pode_bypass, pode_emitir_nf, pode_ver_dados_outras_empresas,
  unidade_id, crm, cpf, cns, especialidade, telefone, ativo
) VALUES (
  'Dra. Supervisor 2',
  'supervisor2@clinica.com',
  '$2a$10$...',
  'MEDICO_SUPERVISOR_2',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  1, '125477', '12345678902', '1234567890124', 'Medicina Integrativa', '(11) 97715-4002', TRUE
) ON CONFLICT (email) DO UPDATE SET role = 'MEDICO_SUPERVISOR_2';

-- Supervisor 3
INSERT INTO usuarios (
  nome, email, senha, role,
  pode_validar, pode_assinar, pode_bypass, pode_emitir_nf, pode_ver_dados_outras_empresas,
  unidade_id, crm, cpf, cns, especialidade, telefone, ativo
) VALUES (
  'Dr. Supervisor 3',
  'supervisor3@clinica.com',
  '$2a$10$...',
  'MEDICO_SUPERVISOR_3',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  1, '125478', '12345678903', '1234567890125', 'Medicina Integrativa', '(11) 97715-4003', TRUE
) ON CONFLICT (email) DO UPDATE SET role = 'MEDICO_SUPERVISOR_3';

-- Supervisor 4
INSERT INTO usuarios (
  nome, email, senha, role,
  pode_validar, pode_assinar, pode_bypass, pode_emitir_nf, pode_ver_dados_outras_empresas,
  unidade_id, crm, cpf, cns, especialidade, telefone, ativo
) VALUES (
  'Dra. Supervisor 4',
  'supervisor4@clinica.com',
  '$2a$10$...',
  'MEDICO_SUPERVISOR_4',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  1, '125479', '12345678904', '1234567890126', 'Medicina Integrativa', '(11) 97715-4004', TRUE
) ON CONFLICT (email) DO UPDATE SET role = 'MEDICO_SUPERVISOR_4';

-- Supervisor 5
INSERT INTO usuarios (
  nome, email, senha, role,
  pode_validar, pode_assinar, pode_bypass, pode_emitir_nf, pode_ver_dados_outras_empresas,
  unidade_id, crm, cpf, cns, especialidade, telefone, ativo
) VALUES (
  'Dr. Supervisor 5',
  'supervisor5@clinica.com',
  '$2a$10$...',
  'MEDICO_SUPERVISOR_5',
  TRUE, TRUE, TRUE, FALSE, FALSE,
  1, '125480', '12345678905', '1234567890127', 'Medicina Integrativa', '(11) 97715-4005', TRUE
) ON CONFLICT (email) DO UPDATE SET role = 'MEDICO_SUPERVISOR_5';

-- ========== 3. ATUALIZAR ENFERMEIRAS E CONSULTORES ==========
-- Enfermeira (Ana Lima)
UPDATE usuarios 
SET 
  role = 'ENFERMEIRA',
  pode_validar = FALSE,
  pode_assinar = FALSE,
  pode_bypass = FALSE
WHERE 
  email = 'ana@clinica.com';

-- Validador Enfermeiro → CONSULTOR
UPDATE usuarios 
SET 
  role = 'CONSULTOR',
  pode_validar = FALSE,
  pode_assinar = FALSE,
  pode_bypass = FALSE
WHERE 
  email = 'carlos@clinica.com';

-- ========== 4. CRIAR CONFIGURAÇÃO INICIAL DA CASCATA ==========
INSERT INTO cascata_validacao_config (
  requer_enfermeira03,
  requer_consultor03,
  requer_medico03,
  requer_medico_senior,
  certificado_a1_obrigatorio
) VALUES (
  TRUE,   -- Enfermeira03 obrigatória
  TRUE,   -- Consultor03 obrigatório
  TRUE,   -- Médico03 obrigatório
  TRUE,   -- Médico Senior obrigatório
  TRUE    -- Certificado A1 obrigatório
) ON CONFLICT DO NOTHING;

-- ========== 5. CRIAR ENTRADA INICIAL NA AUDITORIA ==========
-- Registrar a criação da hierarquia
INSERT INTO auditoria_cascata (
  acao,
  etapa,
  realizado_por_id,
  motivo,
  realizado_em
) VALUES (
  'LIGOU',
  'ENFERMEIRA03',
  (SELECT id FROM usuarios WHERE email = 'caio@clinica.com' LIMIT 1),
  'Inicialização da cascata de validação',
  NOW()
);

-- ========== 6. VERIFICAR DADOS INSERIDOS ==========
SELECT 
  'Usuários por role' as verificacao,
  role,
  COUNT(*) as total
FROM 
  usuarios
GROUP BY 
  role
ORDER BY 
  role;

-- Verificar Dr. Caio
SELECT 
  'Dr. Caio' as usuario,
  nome,
  role,
  nunca_opera,
  pode_validar,
  pode_assinar
FROM 
  usuarios
WHERE 
  email = 'caio@clinica.com';

-- Verificar configuração da cascata
SELECT 
  'Cascata Config' as config,
  requer_enfermeira03,
  requer_consultor03,
  requer_medico03,
  requer_medico_senior,
  certificado_a1_obrigatorio
FROM 
  cascata_validacao_config
LIMIT 1;

-- ========== 7. NOTAS IMPORTANTES ==========
/*
 * IMPORTANTE: Os hashes de senha acima ($2a$10$...) são PLACEHOLDERS!
 * 
 * Para gerar hashes bcrypt reais, use:
 * 
 * Node.js:
 * const bcrypt = require('bcryptjs');
 * const hash = await bcrypt.hash('senha123', 10);
 * console.log(hash);
 * 
 * Python:
 * import bcrypt
 * hash = bcrypt.hashpw(b'senha123', bcrypt.gensalt(10))
 * print(hash.decode())
 * 
 * Bash:
 * echo -n 'senha123' | htpasswd -BinC 10 /dev/stdin
 * 
 * Depois, substitua os hashes no script acima.
 */
