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
10. **Financeiro** — Modulo completo de tratamentos com billing por tratamento (nao por insumo), itens detalhados (substancia/insumo/taxa_administrativa/reserva_tecnica), baixa parcial com saldo devedor, desistencia com retencao calculada (insumos + reserva tecnica + logistica), dashboard com 4 KPIs (total recebido, total pendente, tratamentos ativos, inadimplencia), tratamentos expandiveis com historico de pagamentos
11. **Unidades** — Gestao multiunidades com edicao completa: nome, endereco (rua+numero), bairro, cidade, UF, CEP (busca automatica via ViaCEP), CNPJ, telefone, tipo (clinica/enfermagem/domiciliar/personal), cor, Google Calendar Email/ID. 7 unidades reais mapeadas dos calendarios clinica.padua.agenda@gmail.com: Higienopolis, Tatuape, Enfermagem Bianca, Enfermagem Domiciliar, Enfermagem Guaxupe, On Line Dr Caio Fernandes, Caio Padua Pessoal
12. **Fluxos de Aprovacao** — Fluxos parametrizados por tipo de procedimento (Consulta/Infusao/Implante) com etapas, responsaveis, condicionais e bypass — dados reais PADCOM V15.2
13. **Permissoes** — Matriz de permissoes por perfil (10 perfis PADCOM V15.2) com flags: editar questionario, validar, bypass, emitir NF, ver outras unidades
14. **Catalogo PADCOM** — Base completa com 688+ registros: 305 injetaveis IM, 63 endovenosos, 32 implantes, 54 formulas, 11 protocolos, 220 exames base, 49 doencas. 7 abas com busca (Injetaveis IM, Endovenosos, Implantes, Formulas, Protocolos, Exames, Doencas), agrupamento por eixo/grupo, composicao expandivel, codigos PADCOM visiveis. Dados importados de Google Sheets V13. **Sync Catalogo**: endpoint POST /motor-clinico/sync-catalogo sincroniza tabelas especializadas → itens_terapeuticos (447 itens: 162 IM + 11 EV + 32 impl + 11 form + 11 proto + 220 exames) em transacao atomica com parsing BRL correto e protecao FK sugestoes
15. **Pedidos de Exame** — Criar pedidos de exame com busca de paciente e selecao de exames da base V4 (220 exames), validacao medica com opcao de incluir justificativa para convenio/laboratorio (3 niveis: objetiva, narrativa, robusta), previa de justificativas antes de validar, geracao de 2 PDFs layout Variante D (P&B classico, bordas quadradas, elegante): (1) Solicitacao de Exames com logo CP + dados empresa, retangulo dividido paciente/profissional, titulo SOLICITACAO DE EXAMES, lista exames, caixa HD/CID destacada, assinatura com CRM/CNS, rodape certificado digital + QR Code; (2) Justificativa com mesmo layout + texto por exame do nivel escolhido. Tudo maiusculo sem acento. 660 justificativas unicas no PostgreSQL (220 por nivel). Tabela pedidos_exame com JSONB de exames, status RASCUNHO→VALIDADO. Campos adicionados: usuarios (crm, cpf, cns, especialidade, telefone), unidades (cnpj, cep), pacientes (endereco, cep)
16. **Questionario do Paciente** — Subpasta do paciente: questionario de saude com perguntas do Google Sheets, historico de respostas com status (RASCUNHO/VALIDADO/APROVADO/STAND BY), estado de saude temporal (condicoes, sintomas, medicamentos, indicadores subjetivos 1-10, dados fisicos), evolucao do paciente (INICIAL/MELHORADO/ESTAVEL/PIORADO/CURADO), linha do tempo visual. Historico automatico ao registrar novo estado
17. **Substancias PADCOM** — Catalogo unificado de substancias para sessoes (IV, IM, Implantes): 8 substancias seedadas (Glutationa, VitC, Fosfatidilcolina, NAD+, Ozone, VitD3, ComplexoB, Zinco+Selenio) com metadados de saude (beneficios, contraindicacoes, evidencia cientifica), cards expansiveis, filtros por categoria/via, estrelas de classificacao, preco, estoque
18. **Agenda Semanal** — Visao semanal consolidada de sessoes com navegacao por semana, cores por status (agendada/confirmada/em andamento/parcial/concluida/cancelada/nao compareceu), cards expandiveis com substancias aplicadas (badges IM/EV/IMPL por via), indicadores de progresso. **CALCULO AUTOMATICO DE TEMPO**: IM=15min fixo, EV=30min fixo, Implante=60min fixo, combinacoes SOMAM (IM+EV=45min, IM+EV+IMPL=105min, EV+IMPL=90min). **TIPO DE PROCEDIMENTO** automatico: APLICACAO INTRAMUSCULAR, APLICACAO ENDOVENOSA, IMPLANTE, ou combinacoes (ex: "APLICACAO INTRAMUSCULAR, APLICACAO ENDOVENOSA E IMPLANTE"). Exibe hora inicio→fim e duracao total em cada card. Endpoint de check-in valida semanticamente e muda status para em_andamento. Endpoint validar-tempo para auditoria
19. **RAS** — Registro de Atendimento em Saude: geracao automatica a partir de sessoes (puxa paciente, profissional, unidade, substancias aplicadas), tabela expandivel com detalhes completos (substancias, doses, sessao/total, status), observacoes, assinaturas paciente/profissional. **PDF FISICO 4 PAGINAS** (paisagem A4): Pag 1-2: header (NOME, CPF, CELULAR, MEDICO, ENFERMEIRA, UNIDADE, DATA) + protocolo medicamento (substancias com qtde/frequencia/data inicio) + grid 20 marcacoes (10/pagina) com colunas: #, Ciencia/Assinatura, ENF, Data Prevista, Data Efetiva, STATUS por substancia (verde=aplicada, amarelo=pendente, vermelho=nao aplicada) + area assinatura (Paciente, Medico, Enfermeiro). Pag 3: Informacoes das Substancias (funcao, categoria, via, beneficios, longevidade, energia, sono, clareza mental) + Matriz de Impacto por Sistema Corporal (12 sistemas x substancias com % melhoria). Pag 4: Termo de Consentimento Livre e Esclarecido (5 secoes: IV, IM, Formulacoes, Implantes, Declaracao Geral) com areas de assinatura. Design TDAH-friendly: grid clara para seguir horizontal com o dedo, cores por substancia, bordas definidas. Botao "Gerar RAS PDF" na pagina do paciente
20. **Codigos Validacao** — Codigos alfanumericos de 6 digitos para validacao de sessoes (expiracao 1h), geracao, verificacao (VALIDO/INVALIDO/EXPIRADO/JA USADO), dashboard com stats (Total/Ativos/Usados/Expirados), input de verificacao com tracking-widest monospace
21. **Estoque de Substancias** — Controle de estoque com quantidade/minimo, alertas visuais BAIXO (vermelho) vs OK (verde), filtro de itens abaixo do minimo, lote, validade, fornecedor, custo unitario, edicao inline, cor da substancia vinculada
22. **Codigos Semanticos PADCOM** — 119 codigos importados da planilha Google Drive com padrao TIPO SISTEMA SUBTIPO SEQUENCIA (16 tipos: EXAM, INJE, FORM, PROC, DOEN, SINT, CIRU, DADO, TERA, FINA, DIET, PSIC, RECO, PAGA, FISC, JURI), filtros por tipo/grupo, colunas de procedimentos (Prescricao/Formula, Injetavel IM, Injetavel EV, Implante, Exame, Protocolo, Dieta) com indicadores visuais coloridos, 45 codigos com procedimentos vinculados
23. **Google Calendar** — Integracao real com OAuth via clinica.padua.agenda@gmail.com: 8 calendarios mapeados. Descricao do evento: NOME sem prefixo, CPF formatado, Marcacao X/Y (nao "Semana"), Unidade, procedimentos com emojis ❎✅ a DIREITA, STATUS (🟡 A REALIZAR / 🔵 REALIZADO / ⚫ NAO REALIZADO), substancias com status (🟢 DISP → 🔵 APLICADA ao confirmar). Reagendar = excluir evento antigo + criar novo. Maps+Waze links
24. **Google Drive** — Estrutura completa de 15 subpastas por paciente: CADASTRO (com CADASTROS ANTIGOS sandbox), PATOLOGIAS, EXAMES, AVALIACOES, RECEITAS, PROTOCOLOS, FINANCEIRO, CONTRATOS, ATESTADOS, LAUDOS, TERMOS, FOTO PERFIL, IMAGENS, PESQUISA, OUVIDORIA. Nomenclatura padronizada YYYY.MM.DD TIPO NOME_PACIENTE.pdf. Sandbox automatico de cadastro (antigo→CADASTROS ANTIGOS, so fica o atual). Upload por subpasta, listagem por subpasta, compartilhamento com paciente como visualizador. Campo googleDriveFolderId em pacientes
25. **Gmail** — Emails automaticos pre-sessao e pos-sessao com branding Clinica Padua. **Pre-sessao 1a sessao**: detalhes completos de cada substancia (funcao, efeitos esperados, tempo para efeito, beneficios, contraindicacoes), orientacoes para primeira sessao (alimentacao, documentos, roupas, hidratacao). **Pre-sessao seguintes**: info resumida (data, hora, local, substancias). **Pos-sessao**: relatorio com status aplicada/nao-aplicada, barra de progresso do protocolo (sessao X de Y), aderencia % com cor (verde>=80%, laranja>=50%, vermelho<50%), proxima sessao agendada
26. **Avaliacao de Enfermagem** — Registro de sinais vitais (PA, FC, peso — sempre visiveis), composicao corporal com 7 dobras cutaneas + 8 circunferencias (toggle), alertas clinicos (verde=log, amarelo=1 task card->enfermeira 36h, vermelho=2 task cards->enfermeira+medico imediato)
27. **Task Cards** — Cards de alerta gerados automaticamente pelas avaliacoes de enfermagem, filtros por status (Pendente/Em Andamento/Concluido), role e cor, atribuicao por perfil
28. **RAS Evolutivo** — Acompanhamento longitudinal de sessoes com progresso, aderencia e tolerancia, gerado automaticamente ao concluir sessao
29. **Portal do Cliente** — Pagina publica (sem login) para pacientes: identificacao por CPF + data nascimento, upload de arquivos por categoria, protegido por LGPD (Lei 13.709/2018)
30. **TCLE Dinamico** — Termo de Consentimento no PDF gerado dinamicamente conforme vias presentes no protocolo: clausulas especificas para IV (com sub-clausulas G6PD para Vitamina C e NAD+), IM, SC, Implante, Oral/Topica. Secoes fixas: Identificacao, Finalidade, Riscos, Contraindicacoes, LGPD, Armazenamento Digital, Declaracao Final
31. **Configuracoes** — Usuarios, permissoes
32. **Cavalo de Acompanhamento Longitudinal** — 8 tabelas + rotas CRUD completas para os Cavalos 4 e 5 do Motor Clinico: acompanhamento_cavalo (checkins mensais, visitas, retornos, intercorrencias com classificacao Verde/Amarelo/Vermelho), exames_evolucao (valores com classificacao PREOCUPANTE/BAIXO/MEDIANO/OTIMO/ALERTA), feedback_formulas (MELHORA/SEM_EFEITO/PIORA/EFEITO_COLATERAL), dados_visita_clinica (antropometria completa), arquivos_exames (upload com tipo), formulas_master (catalogo com arrays), cascata_validacao_config (toggles), validacoes_cascata (ENFERMEIRA03→CONSULTOR03→MEDICO03→MEDICO_SENIOR com controle hierarquico de perfil). Rotas: /cavalo/* (8 endpoints GET/POST/PATCH). Origem OPERACIONAL vs AUTONOMA
33. **Toggle de Soberania Medica** — Implementacao 8 do manifesto Claude: 4 tabelas novas (soberania_config, profissional_confianca, fila_preceptor, eventos_clinicos). Toggle global: quando ATIVADO, casos passam pela Fila do Preceptor para homologacao do Diretor (48h configuravel); quando DESATIVADO, supervisor escalado e soberano. Confianca delegada por profissional: Diretor pode isentar profissionais da fila. Motor de decisao: POST /soberania/verificar-fluxo (3 caminhos). Fila do Preceptor: AGUARDANDO→HOMOLOGADO/DEVOLVIDO/VENCIDO. Auditoria obrigatoria de TODAS as alteracoes em eventos_clinicos. Regras: (1) So validador_mestre altera soberania, (2) So validador_mestre delega confianca, (3) Validacao paralela dentro do mesmo nivel — 1 validou = validado, (4) Carimbo medico obrigatorio para toda conduta, (5) Medicos tem peso igual (sem hierarquia entre si). 103 testes semanticos passando (ZERO falhas)

34. **Auditoria da Cascata** — Tabela auditoria_cascata para log completo de TODAS as alteracoes nos toggles da cascata de validacao (LIGOU/DESLIGOU/ALTEROU por etapa). Rotas: GET /auditoria-cascata (historico com filtros), POST /auditoria-cascata/toggle (altera etapa com auditoria automatica, so validador_mestre), GET /auditoria-cascata/stats (contagem por acao/etapa + ultima alteracao)
35. **Alertas e Notificacoes** — Tabela alertas_notificacao para sistema de alertas internos (FILA_PENDENTE, CASCATA_ALTERADA, EXAME_RECEBIDO, ALERTA_CLINICO, PRAZO_EXPIRANDO). Canal SISTEMA (expansivel para WHATSAPP/EMAIL). Rotas: POST /alertas (criar), GET /alertas?destinatarioId= (listar com tempo restante), POST /alertas/:id/confirmar (confirmar alerta), GET /alertas/stats (contagem por status + expirados), POST /alertas/limpar-expirados (marcar expirados)
36. **Governanca e Semaforo** — Painel unificado de governanca clinica com 3 KPIs semaforo (fila pendente, validacoes cascata, alertas abertos). Rotas: GET /governanca/painel (dashboard completo com status VERDE/AMARELO/VERMELHO), GET /governanca/semaforo (semaforo critico da fila preceptor com prazo), GET /governanca/timeline (ultimos eventos clinicos), GET /fila-preceptor/stats (contagem por status + expirados)
37. **Hierarquia de Permissoes** — 4 colunas booleanas adicionadas em usuarios: pode_validar, pode_assinar, pode_bypass, nunca_opera. Campo perfil MANTIDO como autoridade principal. Mapeamento por perfil exportado como PERMISSOES_POR_PERFIL. Helper verificarPodeOperar() e verificarPodeValidar()

## Estrutura do Projeto

```
artifacts/
  api-server/          # Backend Express 5
    src/routes/        # Rotas: anamnese, motorClinico, filas, followup, financeiro, dashboard, avaliacaoEnfermagem, taskCards, rasEvolutivo, avaliacoesCliente, portalCliente, googleGmail, googleCalendar, googleDrive...
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

## Design System — PADCOM V15.2

- **Bordas**: radius=0px (quadradas em tudo — cards, inputs, badges, botões)
- **Primary**: Azul pastel hsl(210 45% 65%) — clássico, elegante, identidade DP
- **Background**: Navy profundo hsl(215 28% 9%)
- **Logo**: Logotipo DP (Clinica Padua) em public/logo-dp.png, fundo transparente
- **Sidebar**: Indicador ativo = border-left-2 primary color
- **Tipografia**: JetBrains Mono; labels uppercase com tracking-wider
- **Tabelas**: Bordas visíveis para TDAH (seguir com o dedo)
- **Filosofia**: Clássico, austero, TDAH-friendly, como documento legal bem formatado
- **RAS PDF Pagina 5**: Contrato financeiro automatico quando paciente tem tratamento ativo — itemizacao, clausula desistencia com retencao calculada, assinaturas

## Preparado para Google Sheets

A base de dados está estruturada para receber dados consolidados das planilhas Google Sheets. A camada de API pode ser expandida com rotas de importação que normalizam os dados das sheets para as tabelas existentes.

## Usuários de Demo (Seed)

| Email | Senha | Perfil |
|-------|-------|--------|
| rafael@clinica.com | senha123 | Validador Mestre |
| ana@clinica.com | senha123 | Enfermeira |
| carlos@clinica.com | senha123 | Validador Enfermeiro |
| marina@clinica.com | senha123 | Médico Técnico |

## Constituicao de Nomenclatura — PADCOM V15.2

Regras permanentes para TODO o codigo deste projeto. Qualquer IA, humano ou ferramenta que trabalhe neste codebase DEVE seguir estas regras.

### 1. Nomes completos e semanticos — NUNCA abreviar
- CORRETO: `auditoria_cascata`, `alertas_notificacao`, `governanca`
- ERRADO: `aud_cascata`, `alert_notif`, `gov`
- O nome deve ser compreensivel sem contexto. Se alguem ler o nome isolado, deve entender o que e

### 2. Campo de perfil de usuario — NUNCA usar "role"
- O campo de perfil do usuario e `perfil` (NAO `role`)
- Motivo TDAH: `role` confunde visualmente com `router`, `route`, `Router` — palavras que aparecem em TODA rota Express
- Valores validos de perfil: `enfermeira`, `validador_enfermeiro`, `medico_tecnico`, `validador_mestre`
- PROIBIDO criar campo `role` em qualquer tabela

### 3. Convencoes de nomes por camada
| Camada | Convencao | Exemplo |
|--------|-----------|---------|
| Tabela no banco (pgTable) | snake_case completo | `auditoria_cascata`, `alertas_notificacao` |
| Nome do arquivo schema | camelCase completo | `auditoriaCascata.ts`, `alertasNotificacao.ts` |
| Export da table | camelCase + Table | `auditoriaCascataTable`, `alertasNotificacaoTable` |
| Nome do arquivo rota | camelCase completo | `auditoriaCascata.ts`, `alertas.ts` |
| Path da rota (URL) | kebab-case completo | `/auditoria-cascata`, `/alertas-notificacao` |
| Import do router | camelCase + Router | `auditoriaCascataRouter`, `alertasRouter` |
| Colunas no banco | snake_case | `pode_validar`, `nunca_opera`, `realizado_por_id` |
| Campos Drizzle (TS) | camelCase | `podeValidar`, `nuncaOpera`, `realizadoPorId` |

### 4. Prefixos semanticos (quando necessario)
| Prefixo | Significado | Exemplo |
|---------|-------------|---------|
| pode_ | Permissao booleana | `pode_validar`, `pode_assinar`, `pode_bypass` |
| nunca_ | Restricao permanente | `nunca_opera` |
| requer_ | Condicao obrigatoria | `requer_enfermeira03`, `requer_medico03` |

### 5. Alias de seguranca
Quando renomear uma tabela ou campo, SEMPRE:
1. Renomear no banco via ALTER TABLE RENAME (nao dropar/recriar)
2. Manter referencia ao nome antigo em comentario no schema
3. Testar que todas as rotas ainda funcionam apos rename

### 6. Proibicoes absolutas
- NUNCA usar `role` como campo (confunde com Router/route)
- NUNCA abreviar nomes de tabelas ou campos
- NUNCA substituir schema de tabela existente (sempre ADD COLUMN IF NOT EXISTS)
- NUNCA dropar tabela que tenha dados
- NUNCA usar prefixos curtos sem significado (ex: `aud_`, `gov_`, `alrt_`)

### 7. Mapeamento de soberania (termos de negocio)
| Perfil tecnico | Termo clinico | Nivel |
|---------------|---------------|-------|
| validador_mestre | Diretor Clinico | Maximo |
| medico_tecnico | Supervisor / Assistente | Medio |
| validador_enfermeiro | Consultor | Base |
| enfermeira | Enfermeira | Operacional |
