-- =====================================================================
-- SEED 003 — 4 AUDITORES + 18 PACIENTES FICTICIOS DISTRIBUIDOS + 8 RAS
-- IDEMPOTENTE — usa ON CONFLICT DO UPDATE / WHERE NOT EXISTS
-- =====================================================================

-- =====================================================================
-- 1) Os 4 Auditores
-- =====================================================================
INSERT INTO auditores (
  nome, apelido, papel, area_atuacao_codigo, especialidade, tom_voz, bio_curta,
  cor_hex, emoji, ve_paciente_identificado, horario_envio_padrao, cadencia
) VALUES
  (
    'DR. ARQUIO',
    'arquio',
    'Auditor Tecnico do Sistema',
    'TECNICO',
    'Engenharia de software, observabilidade, seguranca, sincronizacao Drive ↔ banco',
    'Direto, tecnico-amigavel. Fala como engenheiro senior reportando ao CTO.',
    'Vigia o motor por dentro. Quando o sistema escorrega, ele te avisa antes do usuario perceber.',
    '#5B6B7A', '🛡️', false, '07:00', 'DIARIA'
  ),
  (
    'DRA. KLARA',
    'klara',
    'Auditora de Processos Clinicos Locais',
    'CLINICO',
    'Enfermagem clinica, prontuario, jornada do paciente, conformidade RDC',
    'Cuidadosa e calorosa. Fala como enfermeira-chefe reportando ao diretor clinico.',
    'Acompanha cada paciente como se fosse seu. Sabe quem nao voltou, quem ficou sem laudo, quem precisa de carinho.',
    '#2E8B6B', '🩺', true, '18:00', 'DIARIA'
  ),
  (
    'DR. VITRINE',
    'vitrine',
    'Auditor de Visao Local Estrategica',
    'LOCAL',
    'Operacao clinica × resultado financeiro da unidade',
    'Executivo e numerico. Fala como gerente operacional reportando ao CFO.',
    'Conecta o que acontece no chao da clinica ao caixa da unidade. Numero limpo, decisao limpa.',
    '#C9A961', '📈', false, '08:00', 'SEMANAL'
  ),
  (
    'DRA. HORIZONTE',
    'horizonte',
    'Auditora de Visao Global e Expansao',
    'GLOBAL',
    'Cross-unit, franquia, consultoria, assessoria, marca, regulatorio nacional',
    'Estrategica e visionaria. Fala como conselheira reportando ao board.',
    'Olha pra rede inteira. Identifica padroes, riscos sistemicos e oportunidades de licenciamento.',
    '#6B4E8F', '🌐', false, '17:00', 'SEMANAL'
  )
ON CONFLICT (apelido) DO UPDATE SET
  nome=EXCLUDED.nome, papel=EXCLUDED.papel, area_atuacao_codigo=EXCLUDED.area_atuacao_codigo,
  especialidade=EXCLUDED.especialidade, tom_voz=EXCLUDED.tom_voz, bio_curta=EXCLUDED.bio_curta,
  cor_hex=EXCLUDED.cor_hex, emoji=EXCLUDED.emoji,
  ve_paciente_identificado=EXCLUDED.ve_paciente_identificado,
  horario_envio_padrao=EXCLUDED.horario_envio_padrao, cadencia=EXCLUDED.cadencia,
  atualizado_em=now();

-- =====================================================================
-- 2) Visibilidade granular (matriz LGPD)
--    Apenas DRA. KLARA (medica) ve dados identificaveis de paciente.
--    Os outros 3 só veem agregados.
-- =====================================================================
DELETE FROM auditor_visibilidade_regras WHERE auditor_id IN (SELECT id FROM auditores WHERE apelido IN ('arquio','klara','vitrine','horizonte'));

INSERT INTO auditor_visibilidade_regras (auditor_id, recurso, escopo, observacao)
SELECT a.id, v.recurso, v.escopo, v.observacao FROM auditores a
JOIN (VALUES
  -- ARQUIO (tecnico)
  ('arquio','PACIENTES',         'NENHUM',       'Tecnico nao acessa dados clinicos'),
  ('arquio','PRESCRICOES',       'AGREGADO',     'Apenas contagens e status'),
  ('arquio','RAS',               'AGREGADO',     'Apenas contagens'),
  ('arquio','FINANCEIRO',        'NENHUM',       NULL),
  ('arquio','USUARIOS',          'IDENTIFICAVEL','Precisa identificar usuario que causou erro'),
  ('arquio','DRIVE_EVENTOS',     'IDENTIFICAVEL','Precisa do email do ator para auditoria tecnica'),
  ('arquio','SISTEMA_LOGS',      'IDENTIFICAVEL', NULL),
  -- KLARA (clinica medica) - unica com acesso identificavel a paciente
  ('klara','PACIENTES',          'IDENTIFICAVEL','Auditora medica responsavel pela cadeia clinica'),
  ('klara','PRESCRICOES',        'IDENTIFICAVEL', NULL),
  ('klara','RAS',                'IDENTIFICAVEL', NULL),
  ('klara','FINANCEIRO',         'AGREGADO','Ve ticket medio mas nao detalhe de pagamento'),
  ('klara','USUARIOS',           'IDENTIFICAVEL','Ve a equipe assistencial'),
  ('klara','DRIVE_EVENTOS',      'IDENTIFICAVEL', NULL),
  ('klara','SISTEMA_LOGS',       'NENHUM', NULL),
  -- VITRINE (operacao local)
  ('vitrine','PACIENTES',        'AGREGADO','Conta pacientes mas nao identifica'),
  ('vitrine','PRESCRICOES',      'AGREGADO', NULL),
  ('vitrine','RAS',              'AGREGADO', NULL),
  ('vitrine','FINANCEIRO',       'IDENTIFICAVEL','Auditor financeiro da unidade'),
  ('vitrine','USUARIOS',         'IDENTIFICAVEL', NULL),
  ('vitrine','DRIVE_EVENTOS',    'AGREGADO', NULL),
  ('vitrine','SISTEMA_LOGS',     'NENHUM', NULL),
  -- HORIZONTE (global)
  ('horizonte','PACIENTES',      'AGREGADO','Apenas contagens cross-unit'),
  ('horizonte','PRESCRICOES',    'AGREGADO', NULL),
  ('horizonte','RAS',            'AGREGADO', NULL),
  ('horizonte','FINANCEIRO',     'AGREGADO','KPIs cross-unit, sem detalhe'),
  ('horizonte','USUARIOS',       'AGREGADO', NULL),
  ('horizonte','DRIVE_EVENTOS',  'AGREGADO', NULL),
  ('horizonte','SISTEMA_LOGS',   'NENHUM', NULL)
) AS v(apelido, recurso, escopo, observacao) ON v.apelido = a.apelido;

-- =====================================================================
-- 3) Pacientes ficticios distribuidos em 4 institutos (5 cada)
--    INSTITUTO GENESIS = 14, PALUZZE = 16, PAZIALLE = 18, BARAKAT = 19
--    Idempotente via WHERE NOT EXISTS por (cpf, unidade_id)
-- =====================================================================
INSERT INTO pacientes (nome, cpf, telefone, email, unidade_id, genero, data_nascimento, status_ativo)
SELECT v.nome, v.cpf, v.telefone, v.email, v.unidade_id, v.genero, v.data_nascimento::date, true
FROM (VALUES
  -- GENESIS
  ('FERNANDA RIBEIRO MEDEIROS', '111.222.333-01', '+5511988880001', 'fernanda.medeiros@email.com',  14, 'feminino', '1985-03-12'),
  ('LUCAS GABRIEL SANTOS',      '111.222.333-02', '+5511988880002', 'lucas.gabriel@email.com',      14, 'masculino', '1990-07-21'),
  ('MARINA COSTA OLIVEIRA',     '111.222.333-03', '+5511988880003', 'marina.costa@email.com',       14, 'feminino', '1978-11-05'),
  ('RAFAEL HENRIQUE BARBOSA',   '111.222.333-04', '+5511988880004', 'rafael.henrique@email.com',    14, 'masculino', '1995-01-30'),
  ('JULIANA PIRES MENDONCA',    '111.222.333-05', '+5511988880005', 'juliana.pires@email.com',      14, 'feminino', '1982-09-18'),
  -- PALUZZE
  ('THIAGO RAMOS CARVALHO',     '222.333.444-01', '+5511988881001', 'thiago.ramos@email.com',       16, 'masculino', '1988-04-14'),
  ('CAMILA SOARES NUNES',       '222.333.444-02', '+5511988881002', 'camila.soares@email.com',      16, 'feminino', '1992-12-03'),
  ('EDUARDO MACEDO LIMA',       '222.333.444-03', '+5511988881003', 'eduardo.macedo@email.com',     16, 'masculino', '1975-06-22'),
  ('SOFIA VARGAS TEIXEIRA',     '222.333.444-04', '+5511988881004', 'sofia.vargas@email.com',       16, 'feminino', '2000-02-09'),
  -- PAZIALLE
  ('ANDRE FELIPE ROCHA',        '333.444.555-01', '+5511988882001', 'andre.felipe@email.com',       18, 'masculino', '1983-10-27'),
  ('BEATRIZ VIEIRA AZEVEDO',    '333.444.555-02', '+5511988882002', 'beatriz.vieira@email.com',     18, 'feminino', '1991-05-16'),
  ('GUSTAVO MENDES NOGUEIRA',   '333.444.555-03', '+5511988882003', 'gustavo.mendes@email.com',     18, 'masculino', '1987-08-08'),
  ('LARISSA MORAES FREITAS',    '333.444.555-04', '+5511988882004', 'larissa.moraes@email.com',     18, 'feminino', '1994-03-25'),
  -- BARAKAT
  ('PEDRO HENRIQUE CASTRO',     '444.555.666-01', '+5511988883001', 'pedro.castro@email.com',       19, 'masculino', '1980-11-11'),
  ('ISABELA CARDOSO PINTO',     '444.555.666-02', '+5511988883002', 'isabela.cardoso@email.com',    19, 'feminino', '1996-07-04'),
  ('MATHEUS VIANA GUEDES',      '444.555.666-03', '+5511988883003', 'matheus.viana@email.com',      19, 'masculino', '1979-09-30'),
  ('CAROLINE DUARTE MELO',      '444.555.666-04', '+5511988883004', 'caroline.duarte@email.com',    19, 'feminino', '1989-01-19'),
  ('FELIPE ANTUNES SOUZA',      '444.555.666-05', '+5511988883005', 'felipe.antunes@email.com',     19, 'masculino', '1993-06-07')
) AS v(nome, cpf, telefone, email, unidade_id, genero, data_nascimento)
WHERE NOT EXISTS (
  SELECT 1 FROM pacientes p WHERE p.cpf = v.cpf AND p.unidade_id = v.unidade_id
);

-- Atualiza emails dos pacientes existentes em PADUA que estavam sem email
UPDATE pacientes SET email = lower(replace(replace(replace(nome,' ','.'),'_','.'),'-','')) || '@email.com'
WHERE unidade_id = 15 AND (email IS NULL OR email = '');

-- =====================================================================
-- 4) Sessoes ficticias e RAs (8 atendimentos para alimentar dashboards)
-- =====================================================================
WITH novos AS (
  INSERT INTO sessoes (paciente_id, unidade_id, data_agendada, hora_agendada, status, tipo_servico, numero_semana)
  SELECT p.id, p.unidade_id,
         to_char(now() - (s.dia || ' days')::interval, 'YYYY-MM-DD'),
         CASE s.dia % 4 WHEN 0 THEN '09:00' WHEN 1 THEN '11:30' WHEN 2 THEN '14:15' ELSE '16:45' END,
         'concluida', 'clinica', 1
  FROM pacientes p
  CROSS JOIN (VALUES (0),(1),(2),(3),(5),(7),(10),(14)) AS s(dia)
  WHERE p.cpf IN ('111.222.333-01','111.222.333-03','222.333.444-02','222.333.444-04',
                  '333.444.555-02','444.555.666-02','444.555.666-04','111.222.333-05')
    AND s.dia = (
      CASE p.cpf
        WHEN '111.222.333-01' THEN 0
        WHEN '111.222.333-03' THEN 1
        WHEN '222.333.444-02' THEN 2
        WHEN '222.333.444-04' THEN 3
        WHEN '333.444.555-02' THEN 5
        WHEN '444.555.666-02' THEN 7
        WHEN '444.555.666-04' THEN 10
        WHEN '111.222.333-05' THEN 14
      END
    )
  ON CONFLICT DO NOTHING
  RETURNING id, paciente_id, unidade_id, data_agendada
)
INSERT INTO ras (sessao_id, paciente_id, nome_paciente, cpf_paciente, nome_profissional, crm_profissional,
                 unidade, data_servico, tipo_servico, substancias, observacoes,
                 assinatura_paciente, assinatura_profissional)
SELECT n.id, n.paciente_id, p.nome, p.cpf,
       'DR. CAIO PADUA', 'CRM/SP 123456',
       u.nome, n.data_agendada, 'IV - Endovenoso',
       jsonb_build_array(
         jsonb_build_object('nome','VITAMINA C','dose_mg', 5000, 'via','IV'),
         jsonb_build_object('nome','MAGNESIO','dose_mg', 1000, 'via','IV'),
         jsonb_build_object('nome','GLUTATIONA','dose_mg', 600, 'via','IV')
       ),
       'Atendimento de demonstracao seedado para alimentar dashboards de auditoria',
       true, true
FROM novos n
JOIN pacientes p ON p.id = n.paciente_id
JOIN unidades u  ON u.id = n.unidade_id;

-- =====================================================================
-- 5) Eventos Drive ficticios (alimenta planilha de auditoria com volume)
-- =====================================================================
INSERT INTO auditor_eventos_drive (
  evento_uuid, ts, ator_email, ator_nome, acao, empresa_nome, empresa_cnpj,
  paciente_nome, paciente_cpf, categoria, pasta_caminho, arquivo_nome, arquivo_tipo,
  arquivo_tamanho_bytes, status, severidade, mensagem_humano, sincronizado_pawards
)
SELECT
  'seed-' || md5(random()::text || clock_timestamp()::text),
  now() - (g.h || ' hours')::interval,
  CASE g.h % 3 WHEN 0 THEN 'caio@institutopadua.com.br' WHEN 1 THEN 'helena@clinica.com' ELSE 'bianca@clinica.com' END,
  CASE g.h % 3 WHEN 0 THEN 'Caio Padua' WHEN 1 THEN 'Helena Enfermeira' ELSE 'Bianca Enfermeira' END,
  CASE g.h % 5 WHEN 0 THEN 'INCLUIU' WHEN 1 THEN 'CRIOU' WHEN 2 THEN 'COMPARTILHOU' WHEN 3 THEN 'RENOMEOU' ELSE 'BAIXOU' END,
  'INSTITUTO GENESIS', '63.865.940/0001-63',
  CASE g.h % 4 WHEN 0 THEN 'FERNANDA RIBEIRO MEDEIROS' WHEN 1 THEN 'LUCAS GABRIEL SANTOS' WHEN 2 THEN 'MARINA COSTA OLIVEIRA' ELSE 'RAFAEL HENRIQUE BARBOSA' END,
  CASE g.h % 4 WHEN 0 THEN '111.222.333-01' WHEN 1 THEN '111.222.333-02' WHEN 2 THEN '111.222.333-03' ELSE '111.222.333-04' END,
  CASE g.h % 6 WHEN 0 THEN 'RA' WHEN 1 THEN 'PRESCRICAO' WHEN 2 THEN 'EXAME' WHEN 3 THEN 'MENSAGEM' WHEN 4 THEN 'CONTRATO' ELSE 'FINANCEIRO' END,
  '/PAWARDS/GESTAO CLINICA/Empresas/INSTITUTO GENESIS - CNPJ 63.865.940/0001-63/Clientes/.../RECEITAS',
  to_char(now() - (g.h || ' hours')::interval, 'YY.MM.DD') || ' - ARQUIVO_' || g.h || '.pdf',
  'PDF', 245000 + (g.h * 1024),
  CASE WHEN g.h = 9 THEN 'AVISO' WHEN g.h = 17 THEN 'ERRO' ELSE 'OK' END,
  CASE WHEN g.h = 9 THEN 'warn' WHEN g.h = 17 THEN 'error' ELSE 'info' END,
  'Evento ficticio para alimentar dashboard inicial de auditoria',
  CASE g.h % 3 WHEN 0 THEN 'SIM' WHEN 1 THEN 'PENDENTE' ELSE 'NA' END
FROM generate_series(0, 23) AS g(h)
WHERE NOT EXISTS (SELECT 1 FROM auditor_eventos_drive WHERE mensagem_humano = 'Evento ficticio para alimentar dashboard inicial de auditoria' LIMIT 1);

-- =====================================================================
-- 6) Mensagens iniciais dos auditores ao CEO (caixa do CEO ja populada)
-- =====================================================================
INSERT INTO auditor_mensagens (auditor_id, ceo_usuario_id, unidade_id, titulo, bullets, pergunta, prioridade, status)
SELECT a.id,
       (SELECT id FROM usuarios WHERE perfil ILIKE '%admin%' OR perfil ILIKE '%diretor%' ORDER BY id LIMIT 1),
       v.unidade_id, v.titulo, v.bullets::jsonb, v.pergunta, v.prioridade, 'PENDENTE'
FROM auditores a
JOIN (VALUES
  ('arquio',    NULL::int, 'SISTEMA SAUDAVEL NESTE TURNO',
   '["Latencia media API ultimas 24h: 142ms","Zero erros 5xx","Sincronizacao Drive nao iniciada (esperando setup)"]',
   'Posso ligar a sincronizacao Drive automatica agora?', 'NORMAL'),
  ('klara',     14,        'PRONTUARIOS COM PENDENCIA HOJE',
   '["3 pacientes sem AVALIACAO","2 pacientes sem RECEITA","Fernanda Medeiros aguarda exame"]',
   'Cobro a equipe ainda hoje ou agendo pra amanha 08h?', 'ALTA'),
  ('vitrine',   14,        'GENESIS SEMANA 16 EM RESUMO',
   '["Receita +12% vs semana anterior","Ticket medio R$ 1.450","Cota A2 do Dr. Caio: 60% consumida"]',
   'Aprovo reposicao de cota SNCR A2 antecipada?', 'NORMAL'),
  ('horizonte', NULL,      'PADRAO DE EXPANSAO DETECTADO',
   '["4 unidades cruzaram 80% da cota A2 esta semana","Demanda repetida por anti-hipertensivos magistrais","Oportunidade de produto licenciado"]',
   'Devo abrir estudo formal para Pawards-as-a-Service nesta vertical?', 'NORMAL')
) AS v(apelido, unidade_id, titulo, bullets, pergunta, prioridade) ON v.apelido = a.apelido
WHERE NOT EXISTS (
  SELECT 1 FROM auditor_mensagens m WHERE m.auditor_id = a.id AND m.titulo = v.titulo
);

-- =====================================================================
-- 7) Anastomoses pendentes registradas (transparencia total)
-- =====================================================================
INSERT INTO anastomoses_pendentes (modulo, titulo, descricao, criticidade, status, responsavel, proximo_passo)
SELECT v.modulo, v.titulo, v.descricao, v.criticidade, v.status, v.responsavel, v.proximo_passo
FROM (VALUES
  ('PRESCRICAO_PADCON','Validacao Zod das rotas POST/PUT de prescricao',
   'Backend aceita JSON livre — pode chegar payload malformado e gerar 500. Schema Zod ja desenhado, falta implementar e plugar.',
   'media','aberta','main_agent','Plugar zod nas rotas /prescricoes e /prescricoes/:id/blocos'),
  ('PRESCRICAO_PADCON','Assinatura PAdES/ICP-Brasil real (RDC 471/2021)',
   'PDFs hoje saem sem assinatura digital. Para conformidade legal precisa node-signpdf + cert ICP-Brasil A3 do medico.',
   'alta','aberta','main_agent','Integrar node-signpdf assim que upload do certificado existir na UI'),
  ('PRESCRICAO_PADCON','Posologia dinamica do prescricao_bloco_dose',
   'PDF hoje usa string fixa de posologia. Deve ler dinamicamente da tabela prescricao_bloco_dose preenchida pelo medico.',
   'media','aberta','main_agent','Trocar render no pdf/prescricaoPdf.ts'),
  ('AUDITORIA','Watcher Drive Activity em tempo real',
   'Hoje so capturamos eventos via API direta de write. Falta inscrever Drive Activity API para capturar uploads externos.',
   'alta','aberta','main_agent','Implementar lib/auditoria/driveWatcher.ts com canal de notificacao Drive'),
  ('AUDITORIA','Rotacao 48h da planilha ATIVA → LEGADO',
   'Job diario que move planilha ativa pra LEGADO renomeando AA.MM.DD - AUDITORIA. Esqueleto pronto, scheduler nao ligado.',
   'media','aberta','main_agent','Cron ou node-cron job no api-server'),
  ('EMAIL_PACIENTE','Template HTML inline do relatorio semanal',
   'Tabela paciente_email_semanal criada. Falta template HTML responsivo e job de geracao semanal.',
   'media','aberta','main_agent','Criar lib/emailPaciente/templateSemanal.ts'),
  ('IDOR','Auditoria geral cross-tenant nas demais rotas',
   'Aplicado em /prescricoes. Demais rotas (pacientes, ras, sessoes, exames) precisam do mesmo helper de escopo.',
   'critica','aberta','main_agent','Criar middleware withTenantScope() e aplicar globalmente'),
  ('TRELLO','Webhook bidirecional PAWARDS ↔ Trello',
   'CEO autorizou Trello em onda futura. Por ora so Kanban interno. Quando ligar, criar webhook para mover cards conforme decisao.',
   'baixa','aberta','main_agent','Aguardando token Trello do CEO')
) AS v(modulo, titulo, descricao, criticidade, status, responsavel, proximo_passo)
WHERE NOT EXISTS (
  SELECT 1 FROM anastomoses_pendentes a WHERE a.titulo = v.titulo
);
