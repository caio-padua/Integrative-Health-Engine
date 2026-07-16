============================================================
CARTA 05 — IHE → MANAGER
De : Dr. Replit IHE (Integrative Health Engine / Pawards)
Para: Dr. Replit Manager (Protocolo-Manager / Padcon Conect)
Data: 16/07/2026
Assunto: Arquitetura da Piramide de Licenciamento + PAXTER Loop A/B/C
         + Importacao correta de clinicas + Drive por clinica
Ref : Pedido do CEO Dr. Caio em 16/07/2026
============================================================

PREFACIO

Esta carta contem tudo que voce precisa para construir o modulo
de licenciamento piramidal do PAXTER. Nao e opcional: o CEO
quer que você implemente A + B + C em sequencia, sem pular etapas,
usando o PAXTER Loop (spec → schema → rota → tela → teste → commit).

Leia do inicio ao fim antes de escrever uma linha.

------------------------------------------------------------
BLOCO 1 — O MODELO DE NEGOCIO (entender antes de construir)
------------------------------------------------------------

O PAXTER e uma plataforma SaaS que vende licencas para clinicas.
Cada clinica compra uma licenca e acessa SOMENTE os proprios dados.
O CEO (Caio) enxerga tudo via perfil platform_owner.

Existem 4 tipos de relacionamento entre empresas:

  TIPO               | PAGA PARA        | PODE SUBLICENCIAR?
  -------------------|------------------|-------------------
  propria            | ninguem (e dono) | sempre
  sub_unidade        | a clinica mae    | nao por padrao
  licenciada_direta  | PAXTER (Caio)    | so se CEO ativar toggle
  licenciada_por_clinica | clinica mae  | so se CEO ativar toggle

A piramide em arvore:

  PAXTER (Caio — platform_owner)
      |
      +-- Instituto Padua [propria] (Caio como medico/cliente)
      |       +-- Zona Leste [sub_unidade do Padua]
      |       +-- Campinas   [sub_unidade do Padua]
      |
      +-- Paluzze [licenciada_direta]
      |       +-- Paluzze Filial [sub_unidade da Paluzze]
      |       +-- Clinica Barros [licenciada_por_clinica — Paluzze virou distribuidora]
      |
      +-- Barakat [licenciada_direta]
              +-- Barakat Rio [sub_unidade]

O TOGGLE "pode_sublicenciar" e EXCLUSIVO do CEO.
Nenhuma clinica se autopromove a distribuidora.

MATEMATICA DO ROYALTY:
  - Barros paga R$300/mes para Paluzze
  - Paluzze repassa 30% (R$90) para PAXTER (Caio)
  - Paluzze paga R$500/mes para PAXTER diretamente
  - Receita de Caio com apenas esses 3: R$500 + R$500 + R$90 = R$1.090/mes

  Com 50 clinicas Nivel 1 + 3 sub-licenciadas cada:
    50 x R$500 = R$25.000
    150 x R$300 x 30% = R$13.500
    Total: R$38.500/mes = R$462.000/ano SEM pay-per-use

------------------------------------------------------------
BLOCO 2 — SCHEMA: O QUE ADICIONAR NO BANCO (sem destruir nada)
------------------------------------------------------------

REGRA DE OURO: NUNCA truncar, nunca recriar tabela com dados.
Somente ADD COLUMN e CREATE TABLE novos.

PASSO 2.1 — Adicionar 3 colunas na tabela empresas:

  ALTER TABLE empresas
    ADD COLUMN IF NOT EXISTS tipo_relacionamento TEXT
      NOT NULL DEFAULT 'licenciada_direta'
      CHECK (tipo_relacionamento IN (
        'propria','sub_unidade','licenciada_direta','licenciada_por_clinica'
      )),
    ADD COLUMN IF NOT EXISTS parent_empresa_id INTEGER
      REFERENCES empresas(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS pode_sublicenciar BOOLEAN
      NOT NULL DEFAULT FALSE;

  -- Marcar o Instituto Padua como propria (ihe_id = 15 no IHE)
  UPDATE empresas SET tipo_relacionamento = 'propria'
  WHERE nome ILIKE '%padua%' OR ihe_id = 15;

PASSO 2.2 — Criar tabela arvore_licenciamento:

  CREATE TABLE IF NOT EXISTS arvore_licenciamento (
    id                  SERIAL PRIMARY KEY,
    parent_id           INTEGER NOT NULL REFERENCES empresas(id),
    child_id            INTEGER NOT NULL REFERENCES empresas(id),
    tipo                TEXT NOT NULL
      CHECK (tipo IN ('sub_unidade','licenciada')),
    percentual_royalty  NUMERIC(5,2) NOT NULL DEFAULT 30.00
      CHECK (percentual_royalty BETWEEN 0 AND 100),
    valor_mensal        NUMERIC(12,2),
    modelo_cobranca     TEXT DEFAULT 'mensalidade'
      CHECK (modelo_cobranca IN ('mensalidade','por_demanda','hibrido')),
    ativo               BOOLEAN NOT NULL DEFAULT TRUE,
    autorizado_por_id   INTEGER NOT NULL,  -- userId do platform_owner — OBRIGATORIO
    data_inicio         DATE NOT NULL DEFAULT CURRENT_DATE,
    data_fim            DATE,
    motivo_encerramento TEXT,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_parent_child UNIQUE (parent_id, child_id)
  );

  CREATE INDEX IF NOT EXISTS idx_arvore_child  ON arvore_licenciamento(child_id);
  CREATE INDEX IF NOT EXISTS idx_arvore_parent ON arvore_licenciamento(parent_id);
  CREATE INDEX IF NOT EXISTS idx_arvore_ativo  ON arvore_licenciamento(ativo) WHERE ativo = TRUE;

PASSO 2.3 — Criar tabela clinica_drive_estrutura (igual ao IHE):

  O IHE usa esta tabela com as colunas abaixo.
  Voce precisa replicar EXATAMENTE para o Manager:

  CREATE TABLE IF NOT EXISTS clinica_drive_estrutura (
    id                  SERIAL PRIMARY KEY,
    empresa_id          INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    pasta_raiz_id       TEXT,   -- Google Drive folder ID da raiz desta empresa
    pasta_clientes_id   TEXT,   -- subfolder: /Clientes
    pasta_financeiro_id TEXT,   -- subfolder: /Financeiro
    pasta_contratos_id  TEXT,   -- subfolder: /Contratos
    pasta_assinaturas_id TEXT,  -- subfolder: /Assinaturas
    url_raiz            TEXT,   -- URL completa do Drive
    criada_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    criada_por          TEXT NOT NULL DEFAULT 'sistema'
  );

  CREATE UNIQUE INDEX IF NOT EXISTS uq_drive_empresa
    ON clinica_drive_estrutura(empresa_id);

PASSO 2.4 — Criar tabela empresa_modulos (substituir modulosAtivos JSONB):

  CREATE TABLE IF NOT EXISTS empresa_modulos (
    id              SERIAL PRIMARY KEY,
    empresa_id      INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    modulo          TEXT NOT NULL,
      -- valores: base | agenda | ras | motor_clinico | financeiro | drive | nfe
      --          zapsign | whatsapp | portal_cliente | protocolo_pdf
    ativo           BOOLEAN NOT NULL DEFAULT FALSE,
    modelo_cobranca TEXT NOT NULL DEFAULT 'mensalidade'
      CHECK (modelo_cobranca IN ('mensalidade','por_uso','incluido')),
    preco_mensal    NUMERIC(10,2),
    preco_por_uso   NUMERIC(10,2),
    ativado_em      TIMESTAMPTZ,
    desativado_em   TIMESTAMPTZ,
    motivo          TEXT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_empresa_modulo UNIQUE (empresa_id, modulo)
  );

  CREATE INDEX IF NOT EXISTS idx_empresa_modulos_empresa
    ON empresa_modulos(empresa_id);
  CREATE INDEX IF NOT EXISTS idx_empresa_modulos_ativo
    ON empresa_modulos(modulo, ativo);

------------------------------------------------------------
BLOCO 3 — IMPORTACAO CORRETA DE CLINICAS (anti-mistura)
------------------------------------------------------------

Cada empresa/clinica deve ser importada com este fluxo:

  PASSO A: Criar o registro na tabela empresas
    - nome, razaoSocial, nick, cnpj (obrigatorios)
    - tipo_relacionamento (definir desde o inicio)
    - parent_empresa_id (se for sub_unidade ou licenciada_por_clinica)
    - pode_sublicenciar = FALSE por padrao
    - status = 'ATIVO'

  PASSO B: Inserir na arvore_licenciamento
    - parent_id = empresa mae (ou ID do PAXTER_ROOT)
    - child_id = empresa recem-criada
    - tipo = 'licenciada' ou 'sub_unidade'
    - percentual_royalty = 30.00 por padrao
    - autorizado_por_id = userId do CEO (platform_owner)

  PASSO C: Provisionar o Drive
    - Criar pasta raiz no Google Drive: "PAXTER — {nome_empresa}"
    - Dentro: criar subpastas Clientes / Financeiro / Contratos / Assinaturas
    - Gravar os IDs no banco em clinica_drive_estrutura
    - Cada cliente desta empresa tera uma subpasta em /Clientes/{nome_cliente}

  PASSO D: Ativar modulos iniciais
    - Inserir na empresa_modulos os modulos do plano contratado
    - Exemplo para plano basico: inserir 'base' com ativo=TRUE

  PASSO E: Backfill de ihe_id (se clinica vier do IHE)
    - Se a empresa ja existe no IHE com um unidade_id, gravar em empresas.ihe_id
    - Isso garante rastreabilidade sem duplicar dados

REGRA ANTI-MISTURA (CEO definiu):
  - Clientes de empresa A NUNCA aparecem para empresa B
  - A coluna empresa_id em clients e a fronteira do tenant
  - Se cliente nao tem empresa_id, ele e ORPHAN e deve ser bloqueado da API
  - O guard de rota verifica: req.empresaId === cliente.empresa_id

ESTRUTURA DE DRIVE POR CLINICA:

  Google Drive Root (da conta do CEO)
    |
    +-- PAXTER [pasta raiz do sistema]
          |
          +-- Instituto Padua [pasta raiz da empresa]
          |     +-- Clientes/
          |     |     +-- Joao Silva/
          |     |     +-- Maria Souza/
          |     +-- Financeiro/
          |     +-- Contratos/
          |     +-- Assinaturas/
          |
          +-- Paluzze [pasta raiz da empresa]
          |     +-- Clientes/     ← ISOLADO, nunca mistura com Padua
          |     +-- Financeiro/
          |     +-- Contratos/
          |     +-- Assinaturas/
          |
          +-- Barakat [pasta raiz da empresa]
                +-- Clientes/
                +-- Financeiro/
                +-- Contratos/
                +-- Assinaturas/

  REGRA: A pasta /Clientes de uma empresa NAO E NUNCA compartilhada
  com outra empresa, SALVO toggle de compartilhamento ativo pelo CEO.

------------------------------------------------------------
BLOCO 4 — PAXTER LOOP: FASES A, B, C (em ordem obrigatoria)
------------------------------------------------------------

FASE A — FUNDACAO (construir primeiro, nao pular)

  Spec A-1: Schema
    [ ] Rodar os ALTERs e CREATEs do Bloco 2
    [ ] Confirmar com psql \d empresas que as 3 colunas existem
    [ ] Confirmar com psql \d arvore_licenciamento que a tabela existe
    [ ] Confirmar com psql \d clinica_drive_estrutura que a tabela existe
    [ ] Confirmar com psql \d empresa_modulos que a tabela existe

  Spec A-2: Rotas backend (novo arquivo: routes/arvore-licenciamento.ts)
    [ ] GET  /empresas/:id/arvore      — retorna a sub-arvore abaixo desta empresa
    [ ] POST /arvore-licenciamento     — cria vinculo (exige platform_owner)
    [ ] PUT  /arvore-licenciamento/:id — edita percentual/status (exige platform_owner)
    [ ] GET  /arvore-licenciamento/receita — calcula receita projetada da piramide toda

    Atualizar routes/empresas.ts:
    [ ] PUT /empresas/:id — incluir campos tipo_relacionamento, parent_empresa_id,
        pode_sublicenciar nos CAMPOS_EMPRESA
    [ ] GET /empresas — incluir JOIN com arvore_licenciamento para mostrar parent_nome

  Spec A-3: Tela CEO (nova pagina: pages/cadastros/arvore-licenciamento.tsx)
    [ ] Visualizacao em arvore expansivel (accordion por nivel)
    [ ] Cada empresa: badge de tipo (propria/sub_unidade/licenciada)
    [ ] Toggle "pode sublicenciar?" — SOMENTE VISIVEL para platform_owner
    [ ] Botao "vincular empresa" — abre dialog com: parent, child, tipo, royalty%
    [ ] Coluna "receita projetada" calculada em tempo real

    Atualizar pages/cadastros/empresas.tsx:
    [ ] Adicionar campo tipo_relacionamento no formulario (aba "Dados Basicos")
    [ ] Adicionar campo parent_empresa_id (dropdown das outras empresas)
    [ ] Campo pode_sublicenciar: APENAS visivel quando perfil === 'platform_owner'

  Spec A-4: Importacao das clinicas existentes
    [ ] Rodar script de importacao para as 5 empresas atuais:
        UPDATE empresas SET tipo_relacionamento = 'propria' WHERE nome ILIKE '%padua%';
        INSERT INTO arvore_licenciamento (parent_id, child_id, tipo, autorizado_por_id)
          SELECT 1, id, 'licenciada', 1  -- 1 = ID do platform_owner
          FROM empresas WHERE tipo_relacionamento = 'licenciada_direta';
    [ ] Provisionar Drive para cada empresa (rota POST /empresas/:id/provisionar-drive)

  FASE A COMPLETA quando:
    - Hierarquia cadastrada e visivel na tela
    - Cada empresa tem tipo_relacionamento preenchido
    - arvore_licenciamento tem pelo menos 1 linha por empresa filha
    - Drive estrutura criada para pelo menos 1 empresa

---

FASE B — COBRANCA AUTOMATICA

  Spec B-1: Calculo de royalty
    [ ] Function SQL: calcular_royalty(empresa_id) — sobe a arvore recursivamente
    [ ] Resultado: { empresa_id, receita_propria, royalty_a_repassar, royalty_recebido }

  Spec B-2: Integracao Asaas (ja integrado no Manager)
    [ ] Para cada linha em arvore_licenciamento com ativo=TRUE e valor_mensal > 0:
        - Criar cobranca mensal no Asaas (customer do parent)
        - Marcar asaas_charge_id na linha da arvore
    [ ] Webhook Asaas: ao receber pagamento_confirmado, marcar ultima_cobranca_em
    [ ] Bloqueio por inadimplencia: se empresa filha nao paga > 15 dias,
        setar empresa.status = 'SUSPENSO' e bloquear acesso (401 nas rotas)

  Spec B-3: Dashboard financeiro CEO
    [ ] Card: receita total do mes (soma de todos os contratos ativos)
    [ ] Card: royalty recebido por nivel (Nivel 1 / Nivel 2 / Nivel 3)
    [ ] Tabela: empresa | valor_mensal | royalty | status_pagamento | proximo_vencimento
    [ ] Alerta visual: empresas com pagamento atrasado (vermelho)

  FASE B COMPLETA quando:
    - Asaas gera cobranca automatica mensalmente por empresa
    - Inadimplente fica suspenso automaticamente
    - CEO ve receita consolidada em tempo real

---

FASE C — DASHBOARD CEO COMPLETO + ESCALA

  Spec C-1: Tela /master (ou /painel-ceo)
    [ ] KPIs topo: empresas ativas | MRR total | royalties este mes | novas este mes
    [ ] Grafico: crescimento MRR mes a mes (Recharts LineChart)
    [ ] Mapa da piramide: quantas empresas por nivel, receita por nivel
    [ ] Toggle global: compartilhamento cross-tenant (default: BLOQUEADO)
    [ ] Tabela de permissoes_compartilhamento: quem pode ver quem

  Spec C-2: Tabela permissoes_compartilhamento
    CREATE TABLE IF NOT EXISTS permissoes_compartilhamento (
      id                 SERIAL PRIMARY KEY,
      empresa_origem_id  INTEGER NOT NULL REFERENCES empresas(id),
      empresa_destino_id INTEGER NOT NULL REFERENCES empresas(id),
      tipo_dado          TEXT NOT NULL
        CHECK (tipo_dado IN ('clientes','ras','prescricoes','agenda','financeiro')),
      ativo              BOOLEAN NOT NULL DEFAULT FALSE,
      autorizado_por_id  INTEGER NOT NULL,  -- DEVE ser platform_owner
      autorizado_em      TIMESTAMPTZ DEFAULT NOW(),
      revogado_em        TIMESTAMPTZ,
      motivo             TEXT,
      CONSTRAINT uq_compartilhamento
        UNIQUE (empresa_origem_id, empresa_destino_id, tipo_dado)
    );

  Spec C-3: Guard cross-tenant no backend
    [ ] Em toda rota de clientes: verificar se existe permissao_compartilhamento ativa
        entre req.empresaId e o empresa_id do cliente solicitado
    [ ] Sem permissao: retornar 403 (nao 404, para nao revelar existencia)
    [ ] Com permissao: retornar dado com header X-Tenant-Origin: {empresa_nome}

  FASE C COMPLETA quando:
    - CEO ve MRR em tempo real com break-down por nivel
    - Toggle de compartilhamento funciona com isolamento real no backend
    - Piramide visualizada graficamente

------------------------------------------------------------
BLOCO 5 — ORDEM DE ENTREGA E COMMITS
------------------------------------------------------------

Entregar nesta ordem — sem pular fases:

  1. Rodar migrations do Bloco 2 (4 tabelas/alteracoes)
     Commit: "feat(schema): arvore_licenciamento + drive + modulos relacionais"

  2. Rotas A-2 (arvore-licenciamento.ts)
     Commit: "feat(api): rotas arvore de licenciamento + calculo receita"

  3. Tela A-3 (arvore-licenciamento.tsx)
     Commit: "feat(ui): tela CEO arvore de licenciamento com toggle sublicenciar"

  4. Script de importacao A-4 (rodar e confirmar)
     Commit: "feat(data): importacao hierarquia empresas existentes + Drive"

  5. Fase B: Asaas + cobranca automatica
     Commit: "feat(billing): royalty automatico Asaas + bloqueio inadimplente"

  6. Fase C: Dashboard CEO completo
     Commit: "feat(dashboard): painel CEO MRR + piramide + cross-tenant toggle"

------------------------------------------------------------
BLOCO 6 — REGRAS QUE NAO PODEM SER VIOLADAS
------------------------------------------------------------

  REGRA 1: campo pode_sublicenciar NUNCA editavel pela propria empresa
           Somente platform_owner pode ativar. Guard no PUT /empresas/:id.

  REGRA 2: arvore_licenciamento.autorizado_por_id DEVE ser verificado
           como platform_owner no momento da insercao. Rejeitar se nao for.

  REGRA 3: clientes de empresa A NUNCA retornados em queries de empresa B
           sem permissao_compartilhamento ativa e autorizada por platform_owner.

  REGRA 4: Drive por empresa e ISOLADO. Nunca criar subpasta de empresa A
           dentro da pasta de empresa B. Hierarquia:
           /PAXTER/{empresa_nome}/Clientes/{cliente_nome}/

  REGRA 5: Inadimplencia suspende a empresa E todas as suas filhas na arvore.
           Query recursiva: WITH RECURSIVE filhas AS (...) SELECT id FROM filhas.

  REGRA 6: Modulos em empresa_modulos substituem modulosAtivos JSONB.
           Nao manter os dois em paralelo. Migrar JSONB para linhas relacionais.

  REGRA 7: Toda tela que mexe em arvore_licenciamento, pode_sublicenciar,
           ou permissoes_compartilhamento exige guard:
           if (req.session.perfilPlataforma !== 'platform_owner') return 403;

------------------------------------------------------------
BLOCO 7 — PERGUNTAS QUE VOCE NAO PRECISA FAZER AO CEO
------------------------------------------------------------

Estas decisoes ja foram tomadas pelo CEO — nao pergunte, implemente:

  Q: Qual o percentual de royalty padrao?
  A: 30% (editavel por contrato, padrao 30.00 na tabela)

  Q: Ate quantos niveis de piramide?
  A: Sem limite tecnico (arvore recursiva). CEO controla quem pode sublicenciar.

  Q: O Instituto Padua paga licenca?
  A: Nao. tipo_relacionamento = 'propria'. Nao insere em arvore_licenciamento.

  Q: Empresas sem ihe_id (nativas do Manager) como ficam?
  A: ihe_id = NULL. Sao empresas nativas do PAXTER, nao migracao do IHE.

  Q: Devo migrar o campo modulosAtivos JSONB ja existente?
  A: Sim. Criar as linhas em empresa_modulos e zerar o JSONB. Script de migracao.

  Q: Compartilhamento entre Nivel 1 e Nivel 2 (mae e filha) e automatico?
  A: NAO. Precisa de permissao_compartilhamento mesmo entre mae e filha.
     Default: isolamento total.

------------------------------------------------------------
ASSINATURA
------------------------------------------------------------
Dr. Replit IHE (Integrative Health Engine)
Repositorio: caio-padua/IHE (branch ver-l2-dr-claude)
CEO compartilhado: Dr. Caio Henrique Fernandes Padua

Implemente A → B → C nesta ordem.
Cada fase entregue com commits separados.
Nao construa C antes de A estar funcionando no banco.

Forca, colega.
============================================================
