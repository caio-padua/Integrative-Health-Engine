# MANIFESTO PADTEAM — Sistema de Delegação, Trello, Colaboradores e Procedimentos Pós-Protocolo
## Versão 26.07.19 · Dr. Replit Pawards → Dr. Replit Manager

> **Destinatário primário:** Dr. Replit Manager (Paxter)
> **Repositório de origem:** `caio-padua/Integrative-Health-Engine` · branch `ver-l2-dr-claude`
> **Finalidade:** Manifesto total e detalhado para o Manager construir o módulo equivalente.
> **Siglas explicadas SEMPRE:**
> - API (Application Programming Interface) = interface de comunicação entre sistemas
> - SLA (Service Level Agreement) = acordo de nível de serviço / prazo máximo de resposta
> - SDR (Sales Development Representative) = pré-vendedor / fechadora de venda
> - IDOR (Insecure Direct Object Reference) = falha de segurança que expõe dados de outro tenant
> - CRUD (Create Read Update Delete) = operações básicas de banco de dados
> - Drizzle ORM (Object Relational Mapper) = biblioteca TypeScript que abstrai o banco PostgreSQL
> - Zod = biblioteca de validação de dados em TypeScript
> - PADTEAM = nome oficial do módulo de equipe no Pawards

---

## 1. CONCLUSÃO PRIMEIRO

O sistema PADTEAM (módulo de equipe, tarefas e delegação) está **totalmente conceituado e parcialmente implementado** no IHE (Integrative Health Engine = sistema Pawards).

| O que EXISTE no código real | O que está PENDENTE de implementar |
|-----------------------------|------------------------------------|
| Schema Drizzle completo (8 tabelas) | Cron worker `followupEstetico.ts` (criador automático de cards) |
| Rotas backend completas (delegação + task cards) | Sync Trello ativo (faltam 3 secrets: `TRELLO_API_KEY`, `TRELLO_TOKEN`, `TRELLO_BOARD_ID`) |
| Scoring de colaboradores calculado | Migration 105 (campo `carta_encantamento` em pacientes) |
| Trello lib completa (criar/atualizar/mover/deletar cards) | Worker automático de escalamento por prazo vencido |
| Justificativas padronizadas com auditoria | |
| Escalamento 3 níveis (SUPERVISOR/DIRETOR/FILA_PRECEPTOR) | |
| SLA Monitoring com alertas amarelo/vermelho | |

---

## 2. ARQUITETURA — As 3 Camadas do PADTEAM

```
Camada 1 — PESSOAS
  team_positions (cargos) → team_members (colaboradores) → usuarios (login)

Camada 2 — TAREFAS
  delegacoes (board estilo Trello, sync bidirecional) → task_cards (cards automáticos por evento clínico)

Camada 3 — GOVERNANÇA
  sla_monitoring (prazo + alerta) → task_card_justificativas (justificativa obrigatória) →
  task_card_escalations (escalonamento) → commission_events (comissão) →
  disciplinary_events (advertência/demissão)
```

---

## 3. TABELAS DO BANCO — Schema Completo

### 3.1 Cargos (`team_positions`)

| Campo | Tipo | Valores / Observação |
|-------|------|----------------------|
| `id` | serial | chave primária |
| `unidade_id` | integer | FK (chave estrangeira) para a clínica — cargo pertence a UMA clínica |
| `cargo` | varchar(100) | nome do cargo (exemplos: "Enfermeira", "Fechadora", "Recepcionista") |
| `indice` | varchar(20) | código curto do cargo (exemplo: "ENF", "FEC", "REC") |
| `codigo_completo` | varchar(50) | código com unidade (exemplo: "IHE-ENF-01") |
| `modalidade` | varchar(50) | `presencial` / `online` / `hibrido` |
| `sla_default` | varchar(100) | SLA (prazo máximo de resposta) padrão do cargo (exemplo: "4h") |
| `reporta_a` | varchar(50) | código do cargo superior |
| `quando_reporta` | text | condições que obrigam reportar ao superior |
| `descricao_funcao` | text | descrição completa da função |
| `objetivos` | text | objetivos do cargo |
| `metas_principais` | jsonb | array de metas (exemplo: `["Taxa resolução > 90%", "NPS > 4.5"]`) |
| `direitos` | jsonb | array de direitos do colaborador |
| `deveres` | jsonb | array de deveres obrigatórios |
| `advertencia_triggers` | jsonb | lista de situações que geram advertência |
| `demissao_triggers` | jsonb | lista de situações que geram demissão simples |
| `justa_causa_triggers` | jsonb | lista de situações que geram demissão por justa causa |
| `permissoes` | jsonb | dicionário de permissões booleanas `{pode_X: true/false}` |
| `pode_supervisionar_outros` | boolean | se pode supervisionar outros colaboradores |
| `pode_auditar_cards` | boolean | se pode auditar task cards |
| `pode_aprovar_despesas` | boolean | se pode aprovar despesas financeiras |
| `pode_editar_protocolos` | boolean | se pode editar protocolos clínicos |
| `pode_acessar_financeiro` | boolean | se pode ver dados financeiros |
| `pode_ver_ouvidoria` | boolean | se pode ver registros de ouvidoria |
| `ativa` | boolean | se o cargo está ativo |

### 3.2 Colaboradores (`team_members`)

| Campo | Tipo | Observação |
|-------|------|------------|
| `id` | serial | chave primária |
| `posicao_id` | integer | FK para `team_positions` (cargo formal do colaborador) |
| `unidade_id` | integer | FK para `unidades` (clínica onde atua) |
| `nome_completo` | varchar(200) | nome completo — nunca abreviado |
| `email_funcional` | varchar(200) | e-mail profissional |
| `telefone` | varchar(30) | telefone no formato E.164 (exemplo: `+5511999990000`) |
| `cpf` | varchar(14) | CPF (Cadastro de Pessoa Física) com pontuação |
| `data_admissao` | varchar(10) | data no formato `dd/mm/aaaa` |
| `data_demissao` | varchar(10) | data no formato `dd/mm/aaaa` — NULL = ativo |
| `status_ativo` | boolean | false = desligado |
| `foto_url` | text | URL da foto do colaborador |
| `observacoes` | text | observações livres |

### 3.3 Delegações — Board Principal (`delegacoes`)

Tabela central do sistema de tarefas. Cada linha é uma tarefa delegada de uma pessoa a outra.

| Campo | Tipo | Valores possíveis |
|-------|------|-------------------|
| `id` | serial | chave primária |
| `titulo` | text | título da tarefa — nunca abreviado |
| `descricao` | text | descrição completa |
| `prioridade` | text (enum) | `urgente` / `alta` / `media` / `baixa` |
| `prazo` | text (enum) | `24h` / `36h` / `48h` / `72h` / `1_semana` |
| `status` | text (enum) | `pendente` / `em_andamento` / `concluido` / `atrasado` / `cancelado` |
| `categoria` | text (enum) | `clinico` / `administrativo` / `financeiro` / `logistica` / `atendimento` / `outro` |
| `delegado_por_id` | integer | FK para `usuarios` — quem criou a tarefa |
| `responsavel_id` | integer | FK para `usuarios` — quem deve executar |
| `unidade_id` | integer | FK para `unidades` — clínica responsável |
| `data_limite` | timestamp | calculada automaticamente a partir do campo `prazo` |
| `concluido_em` | timestamp | preenchido quando status vira `concluido` |
| `observacao_final` | text | observação do responsável ao concluir |
| `nota_qualidade` | integer | nota de 0 a 5 dada pelo delegador ao concluir |
| `trello_card_id` | text | ID do card no Trello (preenchido após sync) |
| `trello_list_id` | text | ID da lista Trello onde o card está |
| `trello_last_sync` | timestamp | quando foi feito o último sync com o Trello |

### 3.4 Task Cards — Cards Automáticos por Evento Clínico (`task_cards`)

Gerados automaticamente por eventos do sistema (follow-up, pagamento atrasado, protocolo concluído).
Diferente das `delegacoes` (manuais) — os `task_cards` nascem de lógica automatizada.

| Campo | Tipo | Observação |
|-------|------|------------|
| `id` | serial | chave primária |
| `sessao_id` | integer | FK para `sessoes` — sessão clínica que gerou o card |
| `paciente_id` | integer | FK para `pacientes` — paciente relacionado |
| `assigned_role` | text | perfil do destinatário — exemplos: `fechadora`, `enfermeira`, `clinica_admin` |
| `titulo` | text | título descritivo (exemplo: "Renovar Botox — paciente 1234") |
| `descricao` | text | orientação completa para o responsável |
| `prioridade` | text | `normal` / `alta` / `urgente` |
| `cor_alerta` | text | código hexadecimal da cor (exemplo: `#E8A5D8` para rosa estético) |
| `prazo_horas` | integer | prazo em horas (exemplo: 120 = 5 dias úteis) |
| `status` | text | `pendente` / `em_andamento` / `concluido` / `atrasado` |
| `concluido_em` | timestamp | preenchido ao concluir |

**Nota:** o campo `assigned_role` é legado — o CEO exige `perfil` em campos novos. Este campo específico é exceção documentada.

**Volumes atuais no banco (snapshot 19/05/2026):** 135 cards (66 com `assigned_role='enfermeira'` + 66 com `assigned_role='clinica_admin'`).

### 3.5 Justificativas Obrigatórias (`task_card_justificativas`)

Quando um task card ou follow-up atrasa, o responsável DEVE registrar justificativa padronizada.

| Campo | Motivo padronizado | Significado |
|-------|--------------------|-------------|
| `SEM_CONTATO` | Sem contato | tentativas feitas, paciente não atendeu |
| `PACIENTE_PEDIU_ADIAR` | Paciente pediu adiar | paciente solicitou reagendamento |
| `AGUARDANDO_RETORNO` | Aguardando retorno | respondente aguarda retorno do paciente |
| `ERRO_ATRIBUICAO` | Erro de atribuição | card foi para a pessoa errada |
| `SOBRECARGA` | Sobrecarga | colaborador estava sobrecarregado |
| `INSUMO_INDISPONIVEL` | Insumo indisponível | material/produto necessário estava em falta |
| `PACIENTE_FALTOU` | Paciente faltou | paciente não compareceu |
| `OUTRO` | Outro | requer texto livre obrigatório |

Campos adicionais: `proxima_acao_em` (quando agir novamente), `aceita` (`pendente/aceita/recusada` — supervisor avalia), `observacao_avaliador`.

### 3.6 Escalamento (`task_card_escalations`)

| Campo | Valores | Significado |
|-------|---------|-------------|
| `nivel` | `SUPERVISOR` | primeiro escalamento — para o supervisor da equipe |
| `nivel` | `DIRETOR` | segundo escalamento — para a diretoria |
| `nivel` | `FILA_PRECEPTOR` | fila de preceptoria — caso especial clínico |

### 3.7 SLA Monitoring (`sla_monitoring`)

| Campo | Tipo | Observação |
|-------|------|------------|
| `membro_id` | integer | FK para `team_members` |
| `tipo_sla` | varchar(100) | categoria do SLA (Service Level Agreement) monitorado |
| `prazo_horas` | integer | prazo máximo em horas |
| `inicio_em` | timestamp | quando o SLA começou |
| `vence_em` | timestamp | deadline — calculado: `inicio_em + prazo_horas` |
| `resolvido_em` | timestamp | quando foi resolvido (NULL = ainda aberto) |
| `status` | varchar | `ativo` / `resolvido` / `escalado` / `vencido` |
| `task_card_id` | integer | FK para `task_cards` (opcional) |
| `escalonado_para` | varchar | para quem foi escalado |
| `alerta_amarelo_enviado` | boolean | alerta de 75% do prazo já enviado |
| `alerta_vermelho_enviado` | boolean | alerta de prazo vencido já enviado |

### 3.8 Comissões e Disciplinar

| Tabela | O que guarda |
|--------|--------------|
| `commission_events` | evento de comissão: `valor_base`, `multiplicador`, `valor_final`, `status` (`pendente/pago/bloqueado`) |
| `disciplinary_events` | advertência/demissão: `nivel`, `fundamentacao_clt`, `motivo`, `triggers`, `validade_dias` |
| `task_attempts` | tentativas de contato: `tentativa_numero`, `canal`, `resultado`, `observacoes` |
| `task_validations` | validação de tarefa: `tipo_validacao`, `resultado`, `contatou_paciente`, `nota_paciente` |

---

## 4. PLANOS DE ACOMPANHAMENTO — SLA por Plano do Paciente

O sistema prioriza tasks automaticamente com base no plano do paciente.

| Plano | SLA de resposta | Follow-up ativo | Ligação diária |
|-------|-----------------|-----------------|----------------|
| Diamante | 4 horas | Sim | Sim |
| Ouro | 12 horas | Sim | Não |
| Prata | 24 horas | Sim | Não |
| Cobre | 72 horas | Não | Não |

**Regra:** o worker de follow-up estético dispara primeiro para pacientes Diamante.

---

## 5. INTEGRAÇÃO TRELLO — Como Funciona na Prática

### 5.1 Configuração necessária (3 secrets obrigatórios)

| Secret (variável de ambiente) | O que é | Status atual |
|-------------------------------|---------|--------------|
| `TRELLO_API_KEY` | chave de autenticação da API (Application Programming Interface) do Trello | ❌ missing — não configurada |
| `TRELLO_TOKEN` | token de acesso do usuário Trello | ❌ missing — não configurada |
| `TRELLO_BOARD_ID` | ID do board Trello onde os cards serão criados | ❌ missing — não configurada |

### 5.2 Biblioteca Trello — Funções disponíveis

Arquivo: `artifacts/api-server/src/lib/trello.ts`

| Função | O que faz |
|--------|-----------|
| `isTrelloConfigured()` | verifica se os 3 secrets estão presentes antes de chamar qualquer endpoint |
| `createTrelloCard(listId, name, desc, labels?)` | cria card em uma lista específica |
| `updateTrelloCard(cardId, updates)` | atualiza nome, descrição ou lista do card |
| `deleteTrelloCard(cardId)` | remove o card do Trello |
| `getTrelloBoard(boardId)` | retorna board completo com listas + cards |
| `getTrelloBoardLists(boardId)` | retorna apenas as listas do board |
| `getTrelloListCards(listId)` | retorna cards de uma lista específica |
| `moveTrelloCard(cardId, listId)` | move card entre listas (equivale a arrastar no Kanban) |

### 5.3 Mapeamento de Status → Lista Trello

| Status no banco | Nome da lista no Trello |
|-----------------|-------------------------|
| `pendente` | "Pendente" |
| `em_andamento` | "Em Andamento" |
| `concluido` | "Concluido" |
| `atrasado` | "Atrasado" |
| `cancelado` | "Cancelado" |

**Regra de casamento:** o sistema normaliza o nome da lista (lowercase + underscore) e procura substring. Se nenhuma lista casar, usa a posição ordinal (lista 0 = pendente, lista 1 = em andamento, lista 2 = concluido).

### 5.4 Formato do Card no Trello

```
Nome:     [URGENTE] Realizar cobrança inadimplência Paciente Gomes
Descrição:
  Paciente com 3 parcelas em atraso. Ligar e negociar.

  Responsavel: Fernanda Lima
  Categoria: financeiro
  Prazo: 48h
  Status: pendente
```

### 5.5 Fluxo Sync Bidirecional

```
PAWARDS → Trello  (push):
  POST /api/delegacao/sync-trello
  └─ Para cada delegação:
      ├─ Se não tem trello_card_id → createTrelloCard() → grava card.id no banco
      └─ Se tem trello_card_id → updateTrelloCard() → move para lista correta

Trello → PAWARDS  (pull):
  POST /api/delegacao/pull-trello
  └─ Para cada lista do board:
      └─ Para cada card da lista:
          └─ Se card.id existe em delegacoes.trello_card_id:
              └─ Atualiza status no banco se diferente da lista atual
```

---

## 6. ROTAS BACKEND — API Completa

### 6.1 Delegações (board principal)

| Método | Rota | O que faz |
|--------|------|-----------|
| `GET` | `/api/delegacao` | lista delegações com filtro `?unidadeId=X` — retorna enriched (nomes + status auto-atrasado) |
| `POST` | `/api/delegacao` | cria delegação — calcula `data_limite` a partir do campo `prazo` |
| `PATCH` | `/api/delegacao/:id/status` | atualiza status + `concluido_em` + `observacao_final` + `nota_qualidade` |
| `GET` | `/api/delegacao/scoring` | ranking de colaboradores por taxa de resolução |
| `GET` | `/api/delegacao/feedback` | lista feedbacks de pacientes |
| `POST` | `/api/delegacao/feedback` | registra feedback (nota 0-5, canal, comentário) |
| `GET` | `/api/delegacao/feedback/resumo` | resumo: média geral, distribuição, por canal |
| `GET` | `/api/delegacao/trello/status` | informa se Trello está configurado + qual board |
| `POST` | `/api/delegacao/sync-trello` | PAWARDS → Trello (push) |
| `POST` | `/api/delegacao/pull-trello` | Trello → PAWARDS (pull) |

**Regra de atrasado automático:** no `GET /api/delegacao`, o sistema verifica cada delegação com `data_limite < agora` e status `pendente/em_andamento` — muda automaticamente para `atrasado` no banco antes de responder.

### 6.2 Task Cards

| Método | Rota | Filtros / Body |
|--------|------|----------------|
| `GET` | `/api/task-cards` | `?assignedRole=fechadora` `?status=pendente` `?corAlerta=%23E8A5D8` `?pacienteId=1234` |
| `POST` | `/api/task-cards` | body: todos os campos do schema |
| `PATCH` | `/api/task-cards/:id` | body: `{status, descricao}` — quando status=`concluido`, grava `concluido_em` |
| `DELETE` | `/api/task-cards/:id` | remove card |

### 6.3 Scoring — O que retorna

```
GET /api/delegacao/scoring
→ array ordenado por taxa de resolução decrescente:
[
  {
    id: 5,
    nome: "Fernanda Lima",
    perfil: "clinica_admin",
    total: 42,
    concluidas: 38,
    atrasadas: 2,
    emAndamento: 1,
    pendentes: 1,
    taxaResolucao: 90,       ← (concluidas/total) * 100
    taxaNoPrazo: 95,         ← (concluidas_dentro_prazo/concluidas) * 100
    mediaQualidade: 4.7      ← média das notas_qualidade recebidas
  }
]
```

---

## 7. CENÁRIO FOLLOW-UP ESTÉTICO — A Ponte Principal com Trello

Este é o cenário mais completo do sistema: une mensageria, task card e Trello em um único fluxo.

### 7.1 Gatilho

```
Sessão clínica com via='PRC' (procedimento estético: implante/botox/preenchimento)
  → substancia tem duracao_meses preenchida
  → (data_realizada + duracao_meses - 30 dias) = HOJE
  → Dispara o worker
```

### 7.2 O que o worker faz

```
followupEstetico.ts — roda 1x por dia às 06:00 BRT

Passo 1: WhatsApp para o paciente
  └─ template do cenário "followup_estetico"
  └─ placeholders: {NOME_PACIENTE}, {NOME_PROCEDIMENTO}, {DATA_ULTIMA_APLICACAO},
                    {DATA_VENCIMENTO}, {DIAS_RESTANTES}, {NOME_FECHADORA}

Passo 2: Task Card para a fechadora
  └─ assigned_role = "fechadora"
  └─ titulo = "Renovar {procedimento} — paciente {id}"
  └─ descricao = "Vence em 30 dias. WhatsApp já disparado. Ligar nos próximos 5 dias úteis."
  └─ prioridade = "alta"
  └─ cor_alerta = "#E8A5D8"  (rosa estético)
  └─ prazo_horas = 120       (5 dias úteis)
  └─ status = "pendente"
```

### 7.3 Função de escolha da fechadora

```ts
async function escolherFechadora(pacienteId: number): Promise<string>
  └─ busca colaboradora com assigned_role='fechadora' responsável pelo paciente
  └─ critério de balanceamento: menor carga de cards abertos
```

### 7.4 Roles que recebem task cards automáticos

| Role (`assigned_role`) | Quem é | Gerado por qual evento |
|------------------------|--------|------------------------|
| `fechadora` | SDR (Sales Development Representative) / closer de venda | follow-up estético: procedimento vencendo em 30 dias |
| `enfermeira` | profissional de enfermagem | confirmações pré-procedimento, coleta de sinais vitais |
| `clinica_admin` | administrativo da clínica | agendamentos, cobranças, follow-up administrativo |

---

## 8. HIERARQUIA DE COLABORADORES — Modelo CEO

### 8.1 Grupos por função (conforme `catalogo_agentes` — 20 registros)

| Grupo | Roles | Modalidade | Função principal |
|-------|-------|------------|-----------------|
| Administrativo | recepcionista, fechadora, coordenadora | presencial / remoto | agenda, cobrança, captação |
| Enfermagem | enfermeira, técnica de enfermagem | presencial | procedimentos, triagem, sinais vitais |
| Consultor | consultor externo, parceiro | remoto | consultoria comercial |
| Supervisor | supervisor de unidade, supervisor regional | presencial / remoto | gestão de equipe, auditoria |
| Financeiro | financeiro, controler | remoto | cobranças, repasses, comissões |
| Ouvidoria | ouvidor, mediador | remoto | reclamações, NPS (Net Promoter Score) |

### 8.2 Hierarquia de reporte

```
CEO (Dr. Caio)
  └─ Supervisor regional
      └─ Supervisor de unidade
          ├─ Médico fixo (presencial)
          ├─ Médico remoto (teleconsulta)
          ├─ Enfermeira chefe
          │   └─ Técnica de enfermagem
          ├─ Coordenadora administrativa
          │   ├─ Recepcionista
          │   └─ Fechadora (SDR)
          └─ Financeiro de unidade
```

### 8.3 Regras de reportar ao superior (quando_reporta)

| Situação | Quem reporta | Para quem |
|----------|--------------|-----------|
| Task card atrasado > 24h | Responsável | Supervisor de unidade |
| Escalonamento ativo | Supervisor de unidade | Supervisor regional |
| Comissão bloqueada | Financeiro | CEO |
| Justa causa acionada | Supervisor | CEO + Jurídico |
| Feedback paciente ≤ 2 (nota baixa) | Sistema automático | Supervisor + CEO |

---

## 9. PROCEDIMENTOS PÓS-PROTOCOLO — Fluxo Completo

Este é o conjunto de ações que a equipe humana executa APÓS o médico fechar um protocolo clínico.

### 9.1 Fluxo geral pós-protocolo

```
Médico fecha protocolo / sessão clínica
  │
  ├─► Task card automático: "Confirmar agendamento próxima sessão"
  │     assigned_role = clinica_admin
  │     prazo_horas = 24
  │
  ├─► Task card automático: "Enviar RAS (Registro de Assistência Sistêmica) + receita ao paciente"
  │     assigned_role = clinica_admin
  │     prazo_horas = 4
  │
  ├─► Task card automático (se injetável/implante): "Preparar insumos para próxima sessão"
  │     assigned_role = enfermeira
  │     prazo_horas = 48
  │
  └─► Se plano Diamante: Task card imediato: "Ligar para paciente — satisfação pós-protocolo"
        assigned_role = fechadora
        prazo_horas = 4
```

### 9.2 Fechamento de venda (responsabilidade da fechadora)

```
Follow-up estético vencendo em 30 dias:
  │
  ├─► Dia 0: WhatsApp automático disparado pelo sistema
  ├─► Dia 1: Fechadora recebe task card — ligar para o paciente
  ├─► Dia 3: Se sem resposta → task_attempts registra SEM_CONTATO + nova tentativa
  ├─► Dia 5: Se ainda sem resposta → escalonamento para SUPERVISOR
  └─► Dia 7: Supervisor assume ou cancela card com justificativa obrigatória
```

### 9.3 Resposta a dúvidas do paciente

```
Paciente envia dúvida (WhatsApp / portal):
  │
  ├─► SLA (Service Level Agreement) por plano:
  │     Diamante → 4 horas para primeira resposta
  │     Ouro     → 12 horas
  │     Prata    → 24 horas
  │     Cobre    → 72 horas
  │
  ├─► Sistema cria sla_monitoring com vence_em calculado
  ├─► Em 75% do prazo: alerta_amarelo_enviado → notifica responsável
  ├─► Em 100% do prazo: alerta_vermelho_enviado → escala para supervisor
  └─► Resolvido: sla_monitoring.resolvido_em gravado, status = "resolvido"
```

---

## 10. SCORING DE COLABORADORES — Métricas e Ranking

### 10.1 Como é calculado

```
GET /api/delegacao/scoring

Para cada colaborador ativo:
  total          = todas as delegações onde é responsavel_id
  concluidas     = status = "concluido"
  atrasadas      = status = "atrasado"
  em_andamento   = status = "em_andamento"
  pendentes      = total - concluidas - atrasadas - em_andamento

  taxa_resolucao = (concluidas / total) * 100        ← principal KPI
  taxa_no_prazo  = (concluidas_no_prazo / concluidas) * 100
  media_qualidade = média das nota_qualidade recebidas (0-5)
```

### 10.2 Impacto no `commission_events`

| Critério de scoring | Impacto na comissão |
|---------------------|---------------------|
| `taxa_resolucao` ≥ 90% | `multiplicador = 1.2` (+20%) |
| `taxa_resolucao` entre 70-89% | `multiplicador = 1.0` (normal) |
| `taxa_resolucao` < 70% | `multiplicador = 0.8` (-20%) |
| Card atrasado que gerou escalonamento | `bloqueado_por = "atraso_escalonado"` |

---

## 11. MÓDULO DE DELEGAÇÃO — Telas Frontend Existentes

Caminho base no repositório: `artifacts/clinica-motor/src/pages/delegacao/`

| Tela | Rota no sistema | O que mostra |
|------|-----------------|--------------|
| Board principal | `/plataforma/delegacao` | kanban de delegações com colunas por status |
| Scoring | `/plataforma/delegacao/scoring` | ranking de colaboradores |
| Colaboradores | `/plataforma/colaboradores` | CRUD (Create Read Update Delete) de equipe |
| Task Cards | `/plataforma/task-cards` | lista de cards automáticos por assigned_role |
| Filas operacionais | `/plataforma/filas` | fila de atendimento por prioridade |
| Permissões | `/plataforma/admin-permissoes-delegadas` | gestão de acesso por perfil |

---

## 12. REGRAS DE FERRO — Nunca Violar

| Regra | Fundamento |
|-------|------------|
| Campo de perfil = `perfil`, NUNCA `role` | `role` confunde com rotas de backend (Express.js); exceção legada = `assigned_role` em `task_cards` |
| Nomes completos e semânticos | nunca abreviados; `cargo_colaborador` correto, `cargo_col` proibido |
| Booleanos de permissão com prefixo `pode_` | `pode_auditar_cards`, `pode_acessar_financeiro` |
| Filtrar por `unidade_id` em TODA query | nunca retornar dados sem filtro de clínica — proteção contra IDOR |
| Trello fail-graceful | se `TRELLO_API_KEY` ausente, API (Application Programming Interface) responde 400 com mensagem clara; nunca lança exceção silenciosa |
| Justificativa obrigatória no atraso | card com prazo vencido DEVE registrar motivo em `task_card_justificativas` antes de escalar |
| Comissão só é paga quando validada | `commission_events.status = "pendente"` até validação; supervisor aprova → `"pago"` |

---

## 13. CHECKLIST PARA O DR. REPLIT MANAGER IMPLEMENTAR

Passo A: Clonar schema das 8 tabelas (3.1 a 3.8 acima) no banco do Paxter →
Passo B: Configurar os 3 secrets Trello (`TRELLO_API_KEY`, `TRELLO_TOKEN`, `TRELLO_BOARD_ID`) →
Passo C: Copiar `lib/trello.ts` e adaptar ao padrão do Paxter →
Passo D: Implementar rotas de delegação (item 6.1) com Trello sync bidirecional →
Passo E: Implementar rotas de task cards (item 6.2) →
Passo F: Implementar cron worker de follow-up estético (item 7) →
Passo G: Implementar SLA Monitoring com alertas amarelo/vermelho (item 3.7) →
Passo H: Implementar telas kanban + scoring (item 11) →
Passo I: Testar sync bidirecional com board Trello real →
Passo J: Commit & Push + devolver prova (URL raw + SHA do commit) ao CEO

---

## 14. ARQUIVOS FONTE NO REPOSITÓRIO IHE

| Arquivo | Caminho | O que contém |
|---------|---------|--------------|
| Schema delegações | `lib/db/src/schema/delegacao.ts` | tabela `delegacoes` + `feedback_pacientes` |
| Schema task cards | `lib/db/src/schema/taskCards.ts` | 3 tabelas: `task_cards`, `task_card_justificativas`, `task_card_escalations` |
| Schema colaboradores | `lib/db/src/schema/colaboradores.ts` | 8 tabelas: `team_positions`, `team_members`, `task_attempts`, `task_validations`, `commission_events`, `disciplinary_events`, `agent_actions`, `sla_monitoring` |
| Biblioteca Trello | `artifacts/api-server/src/lib/trello.ts` | 8 funções + `TRELLO_STATUS_MAP` |
| Rota delegações | `artifacts/api-server/src/routes/delegacao.ts` | 10 endpoints incluindo sync bidirecional |
| Rota task cards | `artifacts/api-server/src/routes/taskCards.ts` | CRUD (Create Read Update Delete) completo |
| Spec mensageria/Trello | `docs/dr-claude/16_TEATRO_MENSAGERIA_CENARIOS.md` | cenário follow-up estético completo |
| Inventário do sistema | `INVENTARIO_PAWARDS.md` | visão geral de todas as tabelas e rotas |

**Como acessar via raw GitHub:**
`https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/{CAMINHO}`

---

RESUMO EM 1 LINHA: o PADTEAM (módulo de equipe, delegação e Trello) tem schema completo em 8 tabelas, 10 rotas de API (Application Programming Interface) incluindo sync bidirecional Trello, scoring automático de colaboradores, SLA (Service Level Agreement) por plano do paciente (4h Diamante → 72h Cobre), escalamento 3 níveis, e um worker de follow-up estético que dispara WhatsApp + task card para a fechadora 30 dias antes do vencimento do procedimento — tudo documentado acima com nomes de arquivos, campos, fluxos e regras de ferro para o Manager replicar sem retrabalho.
