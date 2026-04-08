# Motor Clínico — Plataforma de Gestão para Clínica Médica Integrativa

## Visão Geral

Sistema SaaS de motor clínico para clínica médica integrativa multiunidades. A anamnese é a porta de entrada que aciona o motor clínico, gerando sugestões de exames, fórmulas, injetáveis (IM/EV), implantes e protocolos. Dashboard TDAH-friendly com filas operacionais, validação médica e módulos de follow-up e financeiro.

## Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: 24
- **Package manager**: pnpm
- **TypeScript**: 5.9
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express 5
- **Banco de dados**: PostgreSQL + Drizzle ORM
- **Validação**: Zod (zod/v4), drizzle-zod
- **API codegen**: Orval (OpenAPI-first)
- **Charts**: Recharts
- **Roteamento**: Wouter

## Perfis de Acesso

- **enfermeira**: anamnese, pacientes, filas, follow-up
- **validador_enfermeiro**: anamnese, validação, filas, follow-up
- **medico_tecnico**: validação, anamnese, itens terapêuticos, protocolos
- **validador_mestre**: acesso completo (dashboard, validação final, configurações)

## Módulos

1. **Dashboard** — KPIs visuais, filas resumidas, métricas do motor clínico (recharts), atividade recente
2. **Anamnese** — Formulário em etapas (clínico → financeiro → preferências), ativação do motor clínico
3. **Motor Clínico** — Gera sugestões automáticas baseadas em sinais semânticos das respostas
4. **Validação** — Fila médica para validar/rejeitar sugestões
5. **Filas Operacionais** — Anamnese, validação, procedimento, follow-up, pagamento
6. **Pacientes** — Cadastro, historico e questionario de saude com evolucao temporal
7. **Itens Terapeuticos** — Visao unificada com 490 itens reais do catalogo PADCOM V13+V4: 305 IM, 63 EV, 11 formulas agrupadas, 32 implantes, 68 blocos exames (96% enriquecidos com 58 colunas V4: modalidade, material, justificativas 3 niveis, sexo, prioridade, rastreio, recorrencia, 5 indicadores visuais, finalidade, interpretacao, legenda rapida), 11 protocolos. Expansao de blocos mostra cada exame individual com dados V4. Tabelas extras: exames_base (220), matriz_rastreio (231), regras_triagem (8), recorrencia (3), dicionario_graus (5)
8. **Protocolos** — Criação e gestão de protocolos compostos
9. **Follow-up** — Agendamento com recorrência (diário, semanal, quinzenal, mensal, trimestral)
10. **Financeiro** — Pagamentos, confirmação, múltiplas formas de pagamento
11. **Unidades** — Gestão multiunidades
12. **Fluxos de Aprovacao** — Fluxos parametrizados por tipo de procedimento (Consulta/Infusao/Implante) com etapas, responsaveis, condicionais e bypass — dados reais PADCOM V15.2
13. **Permissoes** — Matriz de permissoes por perfil (10 perfis PADCOM V15.2) com flags: editar questionario, validar, bypass, emitir NF, ver outras unidades
14. **Catalogo PADCOM** — Base completa com 688 registros: 305 injetaveis IM, 63 endovenosos, 32 implantes, 54 formulas, 11 protocolos, 49 doencas. 6 abas com busca, agrupamento por eixo, composicao expandivel, codigos PADCOM visiveis. Dados importados automaticamente de Google Sheets V13
15. **Pedidos de Exame** — Criar pedidos de exame com busca de paciente e selecao de exames da base V4 (220 exames), validacao medica com opcao de incluir justificativa para convenio/laboratorio (3 niveis: objetiva, narrativa, robusta), previa de justificativas antes de validar, geracao de 2 PDFs layout Variante D (P&B classico, bordas quadradas, elegante): (1) Solicitacao de Exames com logo CP + dados empresa, retangulo dividido paciente/profissional, titulo SOLICITACAO DE EXAMES, lista exames, caixa HD/CID destacada, assinatura com CRM/CNS, rodape certificado digital + QR Code; (2) Justificativa com mesmo layout + texto por exame do nivel escolhido. Tudo maiusculo sem acento. 660 justificativas unicas no PostgreSQL (220 por nivel). Tabela pedidos_exame com JSONB de exames, status RASCUNHO→VALIDADO. Campos adicionados: usuarios (crm, cpf, cns, especialidade, telefone), unidades (cnpj, cep), pacientes (endereco, cep)
16. **Questionario do Paciente** — Subpasta do paciente: questionario de saude com perguntas do Google Sheets, historico de respostas com status (RASCUNHO/VALIDADO/APROVADO/STAND BY), estado de saude temporal (condicoes, sintomas, medicamentos, indicadores subjetivos 1-10, dados fisicos), evolucao do paciente (INICIAL/MELHORADO/ESTAVEL/PIORADO/CURADO), linha do tempo visual. Historico automatico ao registrar novo estado
17. **Substancias PADCOM** — Catalogo unificado de substancias para sessoes (IV, IM, Implantes): 8 substancias seedadas (Glutationa, VitC, Fosfatidilcolina, NAD+, Ozone, VitD3, ComplexoB, Zinco+Selenio) com metadados de saude (beneficios, contraindicacoes, evidencia cientifica), cards expansiveis, filtros por categoria/via, estrelas de classificacao, preco, estoque
18. **Agenda Semanal** — Visao semanal consolidada de sessoes com navegacao por semana, cores por status (agendada/confirmada/em andamento/parcial/concluida/cancelada/nao compareceu), cards expandiveis com substancias aplicadas, indicadores de progresso
19. **Codigos Semanticos PADCOM** — 119 codigos importados da planilha Google Drive com padrao TIPO SISTEMA SUBTIPO SEQUENCIA (16 tipos: EXAM, INJE, FORM, PROC, DOEN, SINT, CIRU, DADO, TERA, FINA, DIET, PSIC, RECO, PAGA, FISC, JURI), filtros por tipo/grupo, colunas de procedimentos (Prescricao/Formula, Injetavel IM, Injetavel EV, Implante, Exame, Protocolo, Dieta) com indicadores visuais coloridos, 45 codigos com procedimentos vinculados
20. **Configuracoes** — Usuarios, permissoes

## Estrutura do Projeto

```
artifacts/
  api-server/          # Backend Express 5
    src/routes/        # Rotas: anamnese, motorClinico, filas, followup, financeiro, dashboard...
  clinica-motor/       # Frontend React + Vite
    src/pages/         # Todas as páginas da aplicação
    src/components/    # Componentes reutilizáveis
lib/
  api-spec/            # OpenAPI spec (openapi.yaml)
  api-client-react/    # Hooks React Query gerados
  api-zod/             # Schemas Zod gerados
  db/
    src/schema/        # Schemas Drizzle: unidades, usuarios, pacientes, anamneses, etc.
```

## Comandos Principais

- `pnpm run typecheck` — verificação de tipos completa
- `pnpm --filter @workspace/api-spec run codegen` — regenerar hooks e schemas do OpenAPI
- `pnpm --filter @workspace/db run push` — aplicar schema no banco
- `pnpm --filter @workspace/api-server run dev` — rodar API localmente
- `pnpm --filter @workspace/clinica-motor run dev` — rodar frontend localmente

## Preparado para Google Sheets

A base de dados está estruturada para receber dados consolidados das planilhas Google Sheets. A camada de API pode ser expandida com rotas de importação que normalizam os dados das sheets para as tabelas existentes.

## Usuários de Demo (Seed)

| Email | Senha | Perfil |
|-------|-------|--------|
| rafael@clinica.com | senha123 | Validador Mestre |
| ana@clinica.com | senha123 | Enfermeira |
| carlos@clinica.com | senha123 | Validador Enfermeiro |
| marina@clinica.com | senha123 | Médico Técnico |
