# CARTA 09 — Dr. Replit Pawards (IHE) → Dr. Replit Manager (Paxter/Parxis)
# ENGENHARIA COMPLETA DO MÓDULO PADTEAM
# Delegação · Trello · Colaboradores · Hierarquia · Governança de Processo

**Data:** 19/07/2026
**Repositório de origem:** `caio-padua/Integrative-Health-Engine` · branch `ver-l2-dr-claude`
**Assunto:** O CEO (Dr. Caio) quer que você crie as telas, arquitete e faça toda a engenharia
do módulo PADTEAM (equipe + delegação + Trello) no Paxter, ligado ao que já existe no IHE
(Integrative Health Engine = sistema Pawards).

**Siglas explicadas SEMPRE:**
| Sigla | Significado |
|-------|-------------|
| IHE | Integrative Health Engine = sistema Pawards (meu repositório) |
| API | Application Programming Interface = interface de comunicação entre sistemas |
| CRUD | Create Read Update Delete = operações básicas de banco |
| SLA | Service Level Agreement = prazo máximo de resposta acordado |
| SDR | Sales Development Representative = pré-vendedor / fechadora |
| FK | Foreign Key = chave estrangeira (campo que aponta para outra tabela) |
| IDOR | Insecure Direct Object Reference = falha que expõe dados de outro tenant |
| Drizzle | ORM (Object Relational Mapper) que abstrai o PostgreSQL em TypeScript |
| Zod | biblioteca de validação de dados em TypeScript |
| PADTEAM | nome oficial do módulo de equipe no Pawards |
| JSON | JavaScript Object Notation = arquivo de dados estruturado |
| SHA | identificador único de uma gravação no GitHub |
| KPI | Key Performance Indicator = indicador-chave de desempenho |
| NPS | Net Promoter Score = índice de satisfação (0 a 10) |

---

## 1. CONCLUSÃO PRIMEIRO

O IHE tem o módulo PADTEAM **totalmente arquitetado e parcialmente construído**.
Você precisa replicar tudo no Paxter e criar 2 telas novas que eu ainda não tenho:
**Hierarquia Visual** e **Governança de Processos**.

| O que fazer | Complexidade estimada | Onde buscar no IHE |
|-------------|----------------------|--------------------|
| Clonar schema de 8 tabelas | Baixa | `lib/db/src/schema/` |
| Clonar 10 rotas de API (Application Programming Interface) backend | Média | `artifacts/api-server/src/routes/` |
| Clonar tela de Colaboradores (identidade + cargos + disciplinar) | Alta (767 linhas) | `pages/colaboradores.tsx` |
| Clonar tela de Delegação (board kanban + scoring + feedback) | Alta (566 linhas) | `pages/delegacao/index.tsx` |
| Clonar tela de Task Cards (lista com filtros) | Média (182 linhas) | `pages/task-cards/index.tsx` |
| Clonar tela de Filas Operacionais | Média (380 linhas) | `pages/filas/index.tsx` |
| **CRIAR NOVA: Hierarquia Visual** | Alta | não existe — criar do zero |
| **CRIAR NOVA: Governança de Processos** | Alta | não existe — criar do zero |
| Configurar integração Trello (sync bidirecional) | Média | `lib/trello.ts` |

---

## 2. REPOSITÓRIO E ENDEREÇOS

**Base raw para fetch de qualquer arquivo:**
`https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/`

| Arquivo | Caminho completo no repositório |
|---------|---------------------------------|
| Schema delegações | `lib/db/src/schema/delegacao.ts` |
| Schema task cards | `lib/db/src/schema/taskCards.ts` |
| Schema colaboradores | `lib/db/src/schema/colaboradores.ts` |
| Biblioteca Trello | `artifacts/api-server/src/lib/trello.ts` |
| Rota delegações (10 endpoints) | `artifacts/api-server/src/routes/delegacao.ts` |
| Rota task cards (CRUD) | `artifacts/api-server/src/routes/taskCards.ts` |
| Rota colaboradores | `artifacts/api-server/src/routes/colaboradores.ts` |
| Rota filas | `artifacts/api-server/src/routes/filas.ts` |
| Tela colaboradores | `artifacts/clinica-motor/src/pages/colaboradores.tsx` |
| Tela delegação board | `artifacts/clinica-motor/src/pages/delegacao/index.tsx` |
| Tela task cards | `artifacts/clinica-motor/src/pages/task-cards/index.tsx` |
| Tela filas | `artifacts/clinica-motor/src/pages/filas/index.tsx` |
| Manifesto PADTEAM | `docs/MASTERMIND/MANIFESTO_PADTEAM_TRELLO_DELEGACAO_26.07.19.md` |

---

## 3. AS 8 TABELAS — Schema Completo para Replicar

### Tabela 1: `delegacoes` (board de tarefas)

```sql
CREATE TABLE delegacoes (
  id              SERIAL PRIMARY KEY,
  titulo          TEXT NOT NULL,
  descricao       TEXT,
  prioridade      TEXT NOT NULL DEFAULT 'media'
                  CHECK (prioridade IN ('urgente','alta','media','baixa')),
  prazo           TEXT NOT NULL DEFAULT '48h'
                  CHECK (prazo IN ('24h','36h','48h','72h','1_semana')),
  status          TEXT NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente','em_andamento','concluido','atrasado','cancelado')),
  categoria       TEXT NOT NULL DEFAULT 'administrativo'
                  CHECK (categoria IN ('clinico','administrativo','financeiro','logistica','atendimento','outro')),
  delegado_por_id INTEGER NOT NULL REFERENCES usuarios(id),
  responsavel_id  INTEGER NOT NULL REFERENCES usuarios(id),
  unidade_id      INTEGER REFERENCES unidades(id),
  data_limite     TIMESTAMPTZ,
  concluido_em    TIMESTAMPTZ,
  observacao_final TEXT,
  nota_qualidade  INTEGER,
  trello_card_id  TEXT,          -- ID do card no Trello (Application Programming Interface)
  trello_list_id  TEXT,          -- ID da lista onde o card está
  trello_last_sync TIMESTAMPTZ,  -- último sync com Trello
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Tabela 2: `task_cards` (cards automáticos por evento clínico)

```sql
CREATE TABLE task_cards (
  id            SERIAL PRIMARY KEY,
  sessao_id     INTEGER REFERENCES sessoes(id),
  paciente_id   INTEGER REFERENCES pacientes(id),
  assigned_role TEXT NOT NULL,     -- "fechadora" / "enfermeira" / "clinica_admin"
  titulo        TEXT NOT NULL,
  descricao     TEXT,
  prioridade    TEXT NOT NULL DEFAULT 'normal',
  cor_alerta    TEXT,              -- hex: "#E8A5D8" = rosa estético
  prazo_horas   INTEGER,
  status        TEXT NOT NULL DEFAULT 'pendente',
  concluido_em  TIMESTAMPTZ,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Tabela 3: `task_card_justificativas` (justificativa obrigatória de atraso)

```sql
CREATE TABLE task_card_justificativas (
  id                   SERIAL PRIMARY KEY,
  task_card_id         INTEGER REFERENCES task_cards(id),
  followup_id          INTEGER,
  entity_type          TEXT NOT NULL CHECK (entity_type IN ('TASK','FOLLOWUP')),
  entity_id            INTEGER NOT NULL,
  motivo_padrao        TEXT NOT NULL CHECK (motivo_padrao IN (
                         'SEM_CONTATO','PACIENTE_PEDIU_ADIAR','AGUARDANDO_RETORNO',
                         'ERRO_ATRIBUICAO','SOBRECARGA','INSUMO_INDISPONIVEL',
                         'PACIENTE_FALTOU','OUTRO')),
  justificativa        TEXT NOT NULL,
  proxima_acao_em      TIMESTAMPTZ,
  registrado_por_id    INTEGER,
  aceita               TEXT NOT NULL DEFAULT 'pendente'
                         CHECK (aceita IN ('pendente','aceita','recusada')),
  avaliado_por_id      INTEGER,
  avaliado_em          TIMESTAMPTZ,
  observacao_avaliador TEXT,
  criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Tabela 4: `task_card_escalations` (escalonamento 3 níveis)

```sql
CREATE TABLE task_card_escalations (
  id              SERIAL PRIMARY KEY,
  entity_type     TEXT NOT NULL CHECK (entity_type IN ('TASK','FOLLOWUP')),
  entity_id       INTEGER NOT NULL,
  nivel           TEXT NOT NULL CHECK (nivel IN ('SUPERVISOR','DIRETOR','FILA_PRECEPTOR')),
  motivo          TEXT NOT NULL,
  observacao      TEXT,
  escalado_por_id INTEGER,
  resolvido_em    TIMESTAMPTZ,
  resolvido_por_id INTEGER,
  resolucao       TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Tabela 5: `team_positions` (cargos formais)

```sql
CREATE TABLE team_positions (
  id                       SERIAL PRIMARY KEY,
  unidade_id               INTEGER REFERENCES unidades(id),
  cargo                    VARCHAR(100) NOT NULL,
  indice                   VARCHAR(20) NOT NULL,
  codigo_completo          VARCHAR(50) NOT NULL,
  modalidade               VARCHAR(50) NOT NULL DEFAULT 'presencial',
  sla_default              VARCHAR(100),               -- SLA padrão do cargo
  reporta_a                VARCHAR(50),                -- código do cargo superior
  quando_reporta           TEXT,
  descricao_funcao         TEXT,
  objetivos                TEXT,
  metas_principais         JSONB,                      -- array de strings
  direitos                 JSONB,                      -- array de strings
  deveres                  JSONB,                      -- array de strings
  advertencia_triggers     JSONB,                      -- situações que geram advertência
  demissao_triggers        JSONB,                      -- situações que geram demissão
  justa_causa_triggers     JSONB,                      -- situações que geram justa causa
  permissoes               JSONB,                      -- {"pode_acessar_financeiro": true}
  pode_supervisionar_outros BOOLEAN DEFAULT FALSE,
  pode_auditar_cards       BOOLEAN DEFAULT FALSE,
  pode_aprovar_despesas    BOOLEAN DEFAULT FALSE,
  pode_editar_protocolos   BOOLEAN DEFAULT FALSE,
  pode_acessar_financeiro  BOOLEAN DEFAULT FALSE,
  pode_ver_ouvidoria       BOOLEAN DEFAULT FALSE,
  ativa                    BOOLEAN DEFAULT TRUE,
  criado_em                TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em            TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabela 6: `team_members` (colaboradores reais)

```sql
CREATE TABLE team_members (
  id               SERIAL PRIMARY KEY,
  posicao_id       INTEGER NOT NULL REFERENCES team_positions(id),
  unidade_id       INTEGER NOT NULL REFERENCES unidades(id),
  nome_completo    VARCHAR(200) NOT NULL,
  email_funcional  VARCHAR(200),
  telefone         VARCHAR(30),
  cpf              VARCHAR(14),
  data_admissao    VARCHAR(10),
  data_demissao    VARCHAR(10),           -- NULL = ainda ativo
  status_ativo     BOOLEAN DEFAULT TRUE,
  foto_url         TEXT,
  observacoes      TEXT,
  criado_em        TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em    TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabela 7: `sla_monitoring` (monitoramento de prazo com alertas)

```sql
CREATE TABLE sla_monitoring (
  id                     SERIAL PRIMARY KEY,
  membro_id              INTEGER NOT NULL REFERENCES team_members(id),
  unidade_id             INTEGER REFERENCES unidades(id),
  tipo_sla               VARCHAR(100) NOT NULL,
  prazo_horas            INTEGER NOT NULL,
  inicio_em              TIMESTAMPTZ DEFAULT NOW(),
  vence_em               TIMESTAMPTZ NOT NULL,      -- inicio_em + prazo_horas
  resolvido_em           TIMESTAMPTZ,
  status                 VARCHAR(30) NOT NULL DEFAULT 'ativo',
  task_card_id           INTEGER,
  escalonado_para        VARCHAR(50),
  alerta_amarelo_enviado BOOLEAN DEFAULT FALSE,     -- 75% do prazo atingido
  alerta_vermelho_enviado BOOLEAN DEFAULT FALSE,    -- prazo vencido
  criado_em              TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabela 8: `commission_events` + `disciplinary_events`

```sql
CREATE TABLE commission_events (
  id                SERIAL PRIMARY KEY,
  membro_id         INTEGER NOT NULL REFERENCES team_members(id),
  unidade_id        INTEGER REFERENCES unidades(id),
  categoria         VARCHAR(100) NOT NULL,
  valor_base        REAL NOT NULL,
  multiplicador     REAL NOT NULL DEFAULT 1.0,
  valor_final       REAL NOT NULL,
  task_card_id      INTEGER,
  validacao_id      INTEGER,
  bloqueado_por     TEXT,                          -- "atraso_escalonado" etc.
  status            VARCHAR(30) NOT NULL DEFAULT 'pendente',
  periodo_referencia VARCHAR(20),
  criado_em         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE disciplinary_events (
  id                  SERIAL PRIMARY KEY,
  membro_id           INTEGER NOT NULL REFERENCES team_members(id),
  unidade_id          INTEGER REFERENCES unidades(id),
  nivel               VARCHAR(50) NOT NULL,        -- "advertencia" / "demissao" / "justa_causa"
  fundamentacao_clt   VARCHAR(200),
  motivo              TEXT NOT NULL,
  triggers            JSONB,
  validade_dias       INTEGER,
  data_expiracao      VARCHAR(10),
  aplicado_por_id     INTEGER,
  status              VARCHAR(30) NOT NULL DEFAULT 'ativa',
  observacoes         TEXT,
  criado_em           TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. AS 10 ROTAS BACKEND — Implementar Exatamente Assim

### 4.1 Delegações

| Método | Rota | O que faz | Regra especial |
|--------|------|-----------|----------------|
| `GET` | `/api/delegacao` | lista com `?unidadeId=X` | atualiza status para `atrasado` automaticamente se `data_limite < now()` |
| `POST` | `/api/delegacao` | cria delegação | calcula `data_limite` a partir do prazo: 24h=24h, 36h=36h, 48h=48h, 72h=72h, 1_semana=168h |
| `PATCH` | `/api/delegacao/:id/status` | atualiza status | ao concluir: grava `concluido_em` + aceita `observacao_final` + `nota_qualidade` |
| `GET` | `/api/delegacao/scoring` | ranking de colaboradores | ordena por `taxa_resolucao` decrescente |
| `GET` | `/api/delegacao/feedback` | lista feedbacks | — |
| `POST` | `/api/delegacao/feedback` | registra feedback | `nota` 0-5, `canal` enum |
| `GET` | `/api/delegacao/feedback/resumo` | agregado por canal | — |
| `GET` | `/api/delegacao/trello/status` | verifica se Trello está configurado | retorna `{configurado: bool, boardId: string\|null}` |
| `POST` | `/api/delegacao/sync-trello` | IHE → Trello (push) | cria card se não tem `trello_card_id`, atualiza se tem |
| `POST` | `/api/delegacao/pull-trello` | Trello → IHE (pull) | sincroniza status dos cards de volta para o banco |

### 4.2 Task Cards

| Método | Rota | Filtros aceitos |
|--------|------|-----------------|
| `GET` | `/api/task-cards` | `?assignedRole=fechadora` `?status=pendente` `?corAlerta=%23E8A5D8` `?pacienteId=1234` |
| `POST` | `/api/task-cards` | body com todos os campos |
| `PATCH` | `/api/task-cards/:id` | body: `{status, descricao}` — ao concluir: grava `concluido_em` |
| `DELETE` | `/api/task-cards/:id` | remove card |

### 4.3 Cálculo de scoring (lógica exata — copiar)

```typescript
// Para cada usuário ativo:
const total = tarefas.length;
const concluidas = tarefas.filter(t => t.status === "concluido").length;
const atrasadas = tarefas.filter(t => t.status === "atrasado").length;
const emAndamento = tarefas.filter(t => t.status === "em_andamento").length;
const noPrazo = tarefas.filter(t =>
  t.status === "concluido" &&
  t.dataLimite &&
  t.concluidoEm &&
  new Date(t.concluidoEm) <= new Date(t.dataLimite)
).length;

const taxaResolucao = total > 0 ? Math.round((concluidas / total) * 100) : 0;
const taxaNoPrazo = concluidas > 0 ? Math.round((noPrazo / concluidas) * 100) : 0;
const mediaQualidade = notas.length > 0
  ? Math.round(notas.reduce((a, b) => a + b, 0) / notas.length * 10) / 10
  : null;
```

---

## 5. BIBLIOTECA TRELLO — Copiar Este Arquivo Inteiro

Arquivo: `artifacts/api-server/src/lib/trello.ts`
Raw URL: `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/artifacts/api-server/src/lib/trello.ts`

```typescript
// Secrets (variáveis de ambiente) necessários:
// TRELLO_API_KEY  — chave de autenticação da API do Trello
// TRELLO_TOKEN    — token de acesso do usuário Trello
// TRELLO_BOARD_ID — identificador do board onde os cards serão criados

const TRELLO_API_BASE = "https://api.trello.com/1";

export function isTrelloConfigured(): boolean {
  return !!(process.env.TRELLO_API_KEY && process.env.TRELLO_TOKEN);
}

// Funções disponíveis (copiar implementação completa do raw):
export async function createTrelloCard(listId, name, desc, labels?) // cria card
export async function updateTrelloCard(cardId, updates)             // atualiza card
export async function deleteTrelloCard(cardId)                      // deleta card
export async function getTrelloBoard(boardId)                        // board completo
export async function getTrelloBoardLists(boardId)                  // só as listas
export async function getTrelloListCards(listId)                    // cards de uma lista
export async function moveTrelloCard(cardId, listId)                // mover entre listas

// Mapa de status do banco → nome da lista no Trello:
export const TRELLO_STATUS_MAP = {
  pendente:    "Pendente",
  em_andamento: "Em Andamento",
  concluido:   "Concluido",
  atrasado:    "Atrasado",
  cancelado:   "Cancelado",
};
```

**Como o casamento lista ↔ status funciona:**
O sistema normaliza o nome de cada lista do board Trello (lowercase + underscore) e procura substring.
Se "Em Andamento" → `em_andamento` casa.
Se nenhuma lista casar → usa posição ordinal (posição 0 = pendente, 1 = em_andamento, 2 = concluido).

**Formato do card Trello gerado:**
```
Nome:     [URGENTE] Realizar cobrança — cliente Gomes
Descrição:
  Texto da tarefa aqui.

  Responsavel: Fernanda Lima
  Categoria: financeiro
  Prazo: 48h
  Status: pendente
```

---

## 6. TELAS PARA CLONAR — Descrição Visual + Estrutura

### 6.1 Tela de Colaboradores (`/plataforma/colaboradores`)

**Arquivo no IHE:** `artifacts/clinica-motor/src/pages/colaboradores.tsx` (767 linhas)

O que a tela tem:
- Filtros: por unidade, por cargo, por status (ativo/desligado), busca por nome
- Cada colaborador = `IdentityCard` expandível com 5 sub-abas:
  - **FUNCAO** → descrição da função em 1 linha + objetivos
  - **METAS** → lista de metas principais (checkboxes visuais)
  - **DIREITOS** → lista de direitos do colaborador
  - **DEVERES** → lista de deveres formais
  - **RÉGUA** → 3 blocos: advertência (amarelo) + demissão (vermelho claro) + justa causa (vermelho escuro)
- Cada cargo tem cor própria (mapear por cargo no seu sistema)
- Botão "Novo Colaborador" → modal com formulário completo
- Status ativo/desligado visível no card
- Informações exibidas: cargo, unidade, quando reporta, e-mail, telefone

### 6.2 Tela de Delegação Board (`/plataforma/delegacao`)

**Arquivo no IHE:** `artifacts/clinica-motor/src/pages/delegacao/index.tsx` (566 linhas)

O que a tela tem (3 abas):

**Aba BOARD (kanban principal):**
- 4 colunas: Pendente → Em Andamento → Concluído → Atrasado
- Cada card mostra: prioridade (badge colorido), título, responsável, data limite, categoria, unidade
- Cores por prioridade:
  - `urgente` → vermelho
  - `alta` → laranja
  - `media` → azul
  - `baixa` → cinza
- Botão "Sync Trello" → `POST /api/delegacao/sync-trello`
- Botão "Pull Trello" → `POST /api/delegacao/pull-trello`
- Botão "Nova Tarefa" → modal com campos: título, descrição, prioridade, prazo, categoria, responsável, unidade
- Filtro por unidade

**Aba SCORING:**
- Tabela de ranking com colunas: nome, perfil, total de tarefas, concluídas, atrasadas, taxa de resolução (%), taxa no prazo (%), média de qualidade (0-5)
- Ordenado por taxa de resolução decrescente

**Aba FEEDBACK:**
- Resumo: total de feedbacks, média geral (0-5), distribuição por nota, por canal (WhatsApp / presencial / e-mail / telefone)
- Lista de feedbacks individuais
- Botão "Registrar Feedback" → modal com campos: nota (1-5), comentário, canal

### 6.3 Tela de Task Cards (`/plataforma/task-cards`)

**Arquivo no IHE:** `artifacts/clinica-motor/src/pages/task-cards/index.tsx` (182 linhas)

O que a tela tem:
- Filtros: por `assignedRole` (fechadora / enfermeira / clinica_admin), por status (pendente / em_andamento / concluido), por cor de alerta
- Lista de cards com borda lateral colorida por cor de alerta
- Cada card mostra: título, descrição, assigned role, prioridade, prazo em horas, status
- Ação: mudar status (botão CONCLUIR / EM ANDAMENTO)
- Ação: deletar card
- **No seu sistema:** adaptar "paciente" → "cliente"

### 6.4 Tela de Filas Operacionais (`/plataforma/filas`)

**Arquivo no IHE:** `artifacts/clinica-motor/src/pages/filas/index.tsx` (380 linhas)

O que a tela tem:
- Lista de filas por tipo: anamnese, validação, procedimentos, pagamentos, follow-up
- Filtro por unidade (`useClinic()`)
- Cada item da fila tem: prioridade (urgente/alta/média/baixa), status, data de entrada
- Modal de movimentação: escolhe novo status + observação
- Cores por prioridade seguindo o padrão PENUMBRA:
  - urgente → danger
  - alta → warn
  - media → ciano
  - baixa → muted

---

## 7. AS 2 TELAS NOVAS — Criar do Zero

### 7.1 TELA NOVA: Hierarquia Visual (`/plataforma/hierarquia`)

**O CEO quer ver:** quem reporta para quem, em qual clínica, com nome + cargo + foto.

**Estrutura visual sugerida (blueprint):**

```
┌─────────────────────────────────────────────────────────┐
│  HIERARQUIA — Instituto Pádua          [Filtrar clínica] │
├─────────────────────────────────────────────────────────┤
│                                                          │
│                    [CEO — Dr. Caio]                      │
│                          │                              │
│              ┌───────────┴───────────┐                  │
│     [Supervisor Regional]     [Supervisor Regional]      │
│              │                       │                  │
│     ┌────────┴────────┐        ┌─────┴──────┐           │
│  [Médico Fixo]  [Enfermeira]  [Médico]  [Recepcionista] │
│                  [Técnica]                               │
└─────────────────────────────────────────────────────────┘
```

**Fonte dos dados:** tabela `team_positions` (campo `reporta_a` define o vínculo pai → filho)
**Query necessária:**

```typescript
// Buscar todos os cargos da unidade
const cargos = await db
  .select()
  .from(teamPositionsTable)
  .where(eq(teamPositionsTable.unidadeId, unidadeId));

// Montar árvore: cargos sem reporta_a = raízes
// cargos com reporta_a = filhos do cargo cujo indice = reporta_a
function montarArvore(cargos) {
  const raizes = cargos.filter(c => !c.reportaA);
  function filhos(indice) {
    return cargos.filter(c => c.reportaA === indice);
  }
  // recursão para montar nós
}
```

**Rota nova necessária (criar no backend):**
`GET /api/hierarquia?unidadeId=X`

```typescript
// Retorna cargos com colaboradores:
[
  {
    id: 1,
    cargo: "Supervisor de Unidade",
    indice: "SUP",
    reportaA: null,       // é raiz
    modalidade: "presencial",
    colaboradores: [
      { id: 5, nomeCompleto: "Fernanda Lima", statusAtivo: true, fotoUrl: "..." }
    ],
    filhos: [
      {
        cargo: "Enfermeira",
        indice: "ENF",
        reportaA: "SUP",
        colaboradores: [...],
        filhos: [...]
      }
    ]
  }
]
```

**Componente React sugerido:**

```tsx
// HierarquiaNodo.tsx — componente recursivo
function HierarquiaNodo({ nodo, nivel }: { nodo: CargoComFilhos, nivel: number }) {
  return (
    <div style={{ marginLeft: nivel * 32 }}>
      {/* Card do cargo */}
      <div className="border-l-4" style={{ borderColor: corDoCargo }}>
        <div className="font-black text-xs uppercase">{nodo.cargo}</div>
        <div className="text-[10px] text-muted">{nodo.modalidade}</div>
        {/* Colaboradores deste cargo */}
        {nodo.colaboradores.map(c => (
          <div key={c.id} className="flex items-center gap-2 mt-1">
            <img src={c.fotoUrl} className="w-6 h-6 rounded-full" />
            <span className="text-xs">{c.nomeCompleto}</span>
          </div>
        ))}
      </div>
      {/* Filhos recursivos */}
      <div className="ml-8 border-l border-muted">
        {nodo.filhos.map(filho => (
          <HierarquiaNodo key={filho.id} nodo={filho} nivel={nivel + 1} />
        ))}
      </div>
    </div>
  );
}
```

### 7.2 TELA NOVA: Governança de Processos (`/plataforma/governanca`)

**O CEO quer ver:** quais processos existem, quem é responsável, qual o prazo (SLA), o que acontece quando atrasa (escalonamento), e o histórico de ocorrências.

**A tela tem 4 abas:**

---

**Aba 1 — PROCESSOS ATIVOS (SLA Monitoring)**

Fonte: tabela `sla_monitoring`

```
┌────────────────────────────────────────────────────────────────────┐
│ # │ Processo          │ Responsável     │ Prazo  │ Vence em │ Situação │
├───┼───────────────────┼─────────────────┼────────┼──────────┼──────────┤
│ 1 │ Follow-up estético│ Fernanda Lima   │ 120 h  │ 21/07    │ 🟡 50%   │
│ 2 │ Resposta dúvida   │ Recepção Pádua  │ 4 h    │ VENCIDO  │ 🔴 100%  │
└────────────────────────────────────────────────────────────────────┘
```

Coluna "Situação" usa semáforo:
- Verde (🟢): menos de 50% do prazo consumido
- Amarelo (🟡): entre 50% e 99%
- Vermelho (🔴): vencido ou `alerta_vermelho_enviado = true`

**Rota necessária:**
`GET /api/governanca/sla-ativos?unidadeId=X`

---

**Aba 2 — JUSTIFICATIVAS PENDENTES**

Fonte: tabela `task_card_justificativas` onde `aceita = 'pendente'`

```
┌─────────────────────────────────────────────────────────────────────┐
│ Card │ Motivo              │ Responsável  │ Próxima ação │ Avaliar   │
├──────┼─────────────────────┼──────────────┼──────────────┼───────────┤
│ #45  │ SEM_CONTATO         │ Ana Luiza    │ 20/07 14h    │ [✓] [✗]  │
│ #67  │ PACIENTE_PEDIU_ADIAR│ Fernanda     │ 22/07        │ [✓] [✗]  │
└─────────────────────────────────────────────────────────────────────┘
```

**Rotas necessárias:**
- `GET /api/governanca/justificativas-pendentes`
- `PATCH /api/governanca/justificativas/:id` body: `{aceita: "aceita"|"recusada", observacaoAvaliador: "..."}`

---

**Aba 3 — ESCALONAMENTOS**

Fonte: tabela `task_card_escalations`

```
┌──────────────────────────────────────────────────────────────────┐
│ # │ Nível      │ Motivo                   │ Escalado em │ Status  │
├───┼────────────┼──────────────────────────┼─────────────┼─────────┤
│ 1 │ SUPERVISOR │ Card atrasado 48h        │ 18/07       │ Aberto  │
│ 2 │ DIRETOR    │ Reincidência escalamento │ 15/07       │ Resolvido│
└──────────────────────────────────────────────────────────────────┘
```

**Rota necessária:**
`GET /api/governanca/escalamentos?unidadeId=X&status=aberto`

---

**Aba 4 — DISCIPLINAR**

Fonte: tabela `disciplinary_events`

```
┌────────────────────────────────────────────────────────────────────┐
│ Colaborador    │ Nível          │ Motivo          │ Validade │ Status│
├────────────────┼────────────────┼─────────────────┼──────────┼───────┤
│ João Almeida   │ advertencia    │ Atraso recorrente│ 90 dias  │ ativa │
│ Maria Santos   │ demissao       │ Ausência 3x     │ —        │ ativa │
└────────────────────────────────────────────────────────────────────┘
```

**Rotas necessárias:**
- `GET /api/governanca/disciplinar?unidadeId=X`
- `POST /api/governanca/disciplinar` body: `{membroId, nivel, motivo, triggers, validadeDias, aplicadoPorId}`

---

## 8. FLUXO COMPLETO — Como Tudo Conecta no Paxter

```
Evento clínico acontece (follow-up, pagamento, protocolo concluído)
  │
  ├─► Sistema cria task_card automaticamente
  │     assigned_role = "fechadora" / "enfermeira" / "clinica_admin"
  │     prazo_horas = X (conforme tipo do evento)
  │
  ├─► Sistema cria sla_monitoring
  │     vence_em = agora + prazo_horas
  │     status = "ativo"
  │
  ├─► Tela Task Cards exibe o card para o responsável
  │
  ├─► Worker de SLA (roda a cada hora):
  │     Se (agora > vence_em * 0.75) e alerta_amarelo_enviado = false
  │       → envia notificação WhatsApp ao responsável
  │       → alerta_amarelo_enviado = true
  │     Se (agora > vence_em) e alerta_vermelho_enviado = false
  │       → cria task_card_escalation (nivel = SUPERVISOR)
  │       → alerta_vermelho_enviado = true
  │
  ├─► Responsável justifica o atraso → task_card_justificativas
  │     Supervisor avalia → aceita ou recusa
  │
  ├─► Se concluído com nota ≥ 90% taxa_resolucao:
  │     commission_events.multiplicador = 1.2 (+20% de comissão)
  │
  ├─► Se atrasado e escalado:
  │     commission_events.bloqueado_por = "atraso_escalonado"
  │
  └─► Tela Governança exibe o estado de tudo em tempo real
```

---

## 9. FLUXO ESPECIAL — Follow-up Estético com Trello

```
Todo dia às 06:00 BRT — worker cron (Application Programming Interface cron job)
  │
  └─► Query: sessoes com via='PRC' e
      (data_realizada + duracao_meses - 30 dias) = HOJE
      │
      ├─► Para cada procedimento vencendo:
      │     1. Enfileira WhatsApp ao cliente
      │           template: "followup_estetico"
      │           placeholders: nome_procedimento, data_vencimento, nome_fechadora
      │
      │     2. Cria task_card
      │           assigned_role = "fechadora"
      │           cor_alerta = "#E8A5D8"
      │           prazo_horas = 120
      │           prioridade = "alta"
      │
      │     3. sync-trello → card criado no board Trello da fechadora
      │
      └─► Resultado: fechadora acorda, abre o board Trello,
          já tem o card + o WhatsApp já foi enviado
```

---

## 10. SLA POR PLANO DO CLIENTE

| Plano | SLA (prazo de resposta) | Follow-up ativo |
|-------|-------------------------|-----------------|
| Diamante | 4 horas | Sim |
| Ouro | 12 horas | Sim |
| Prata | 24 horas | Sim |
| Cobre | 72 horas | Não |

**Regra de priorização:** ao criar sla_monitoring para evento do cliente Diamante,
usar `prioridade = "urgente"` no task_card correspondente.

---

## 11. HIERARQUIA DE COLABORADORES — Modelo CEO (importar do JSON)

Os colaboradores reais do IHE estão no arquivo:
`docs/dr-replit/PARA_MANAGER/DADOS_EMPRESAS_E_COLABORADORES_IHE_26.07.10.json`

```
Raw URL:
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/docs/dr-replit/PARA_MANAGER/DADOS_EMPRESAS_E_COLABORADORES_IHE_26.07.10.json
```

**Conteúdo:** 18 empresas + 150 cargos + 150 colaboradores + 143 usuários

**Hierarquia do modelo CEO:**
```
CEO (Dr. Caio) — escopo global
  └─ Supervisor Regional — múltiplas clínicas
      └─ Supervisor de Unidade — 1 clínica
          ├─ Médico Fixo (presencial)
          ├─ Médico Remoto (teleconsulta / online)
          ├─ Enfermeira Chefe
          │   └─ Técnica de Enfermagem
          ├─ Coordenadora Administrativa
          │   ├─ Recepcionista
          │   └─ Fechadora (SDR = vendedora / closer)
          └─ Financeiro de Unidade
```

**Grupos de roles nos task_cards (assigned_role):**
| assigned_role | Quem é | Evento que gera o card |
|---------------|--------|------------------------|
| `fechadora` | SDR / closer de vendas | procedimento estético vencendo, follow-up comercial |
| `enfermeira` | profissional de enfermagem | confirmações pré-procedimento, coleta de sinais vitais |
| `clinica_admin` | administrativo da clínica | agendamentos, cobranças, documentos |

---

## 12. REGRAS DE FERRO — Nunca Violar

| Regra | Por quê |
|-------|---------|
| Perfil sempre `perfil`, nunca `role` | `role` confunde com rota de backend no Express.js — exceção legada: `assigned_role` nos task_cards (documentado e travado) |
| Nomes completos e semânticos | `cargo_colaborador` certo; `cargo_col` proibido |
| Booleanos de permissão com prefixo `pode_` | `pode_acessar_financeiro`, `pode_auditar_cards` |
| Toda query com filtro de `unidade_id` | proteção contra IDOR — nunca retornar dados de outra clínica |
| Trello fail-graceful (sem quebra silenciosa) | se `TRELLO_API_KEY` ausente → responde 400 com mensagem clara; nunca lança exceção oculta |
| Justificativa obrigatória no atraso | task_card atrasado DEVE registrar motivo antes de escalar |
| No Paxter: atendido = "cliente", nunca "paciente" | regra do CEO para o Manager |
| Comissão só paga após validação | `commission_events.status = "pendente"` até supervisor aprovar → `"pago"` |

---

## 13. SECRETS (VARIÁVEIS DE AMBIENTE) NECESSÁRIOS

| Secret | O que é | Status no IHE |
|--------|---------|----------------|
| `TRELLO_API_KEY` | chave de autenticação da Application Programming Interface do Trello | ❌ não configurada |
| `TRELLO_TOKEN` | token de acesso do usuário no Trello | ❌ não configurada |
| `TRELLO_BOARD_ID` | identificador do board Trello que será espelhado | ❌ não configurada |

Como obter:
1. Acessar `https://trello.com/app-key` → copiar `TRELLO_API_KEY`
2. Na mesma página, gerar token → copiar `TRELLO_TOKEN`
3. Acessar o board desejado no Trello → URL tem `/b/{TRELLO_BOARD_ID}/` → copiar o ID

---

## 14. CHECKLIST DE IMPLEMENTAÇÃO — Passo a Passo

```
Passo A: Criar as 8 tabelas no banco do Paxter (seção 3) →
Passo B: Criar rotas backend delegação (10 endpoints da seção 4.1) →
Passo C: Criar rotas backend task cards (seção 4.2) →
Passo D: Copiar biblioteca Trello (seção 5) e adaptar →
Passo E: Clonar tela Colaboradores (seção 6.1) adaptando "paciente"→"cliente" →
Passo F: Clonar tela Delegação Board (seção 6.2) →
Passo G: Clonar tela Task Cards (seção 6.3) →
Passo H: Clonar tela Filas Operacionais (seção 6.4) →
Passo I: CRIAR NOVA tela Hierarquia Visual (seção 7.1) →
Passo J: CRIAR NOVA tela Governança de Processos (seção 7.2) →
Passo K: Configurar os 3 secrets do Trello →
Passo L: Testar sync bidirecional com board Trello real →
Passo M: Criar cron job do follow-up estético (seção 9) →
Passo N: Commit & Push + devolver ao CEO: URL raw + SHA do commit
```

---

## 15. ROTAS NOVAS NECESSÁRIAS NO PAXTER (não existem no IHE)

| Rota | O que retorna |
|------|---------------|
| `GET /api/hierarquia?unidadeId=X` | árvore de cargos + colaboradores aninhados |
| `GET /api/governanca/sla-ativos?unidadeId=X` | todos sla_monitoring ativos com semáforo |
| `GET /api/governanca/justificativas-pendentes` | task_card_justificativas com aceita='pendente' |
| `PATCH /api/governanca/justificativas/:id` | avalia justificativa (aceita/recusa) |
| `GET /api/governanca/escalamentos?unidadeId=X` | task_card_escalations com filtro de status |
| `GET /api/governanca/disciplinar?unidadeId=X` | disciplinary_events da unidade |
| `POST /api/governanca/disciplinar` | registra advertência/demissão |

---

## 16. FECHAMENTO OBRIGATÓRIO (regra de ouro entre agentes)

Ao terminar, você TEM que:
1. Fazer Commit & Push no repositório do Paxter
2. Devolver ao CEO: URL raw do que mudou + SHA (identificador único) do commit

Sem prova, o trabalho "evapora" na percepção do CEO. Prova é obrigatória.

---

RESUMO EM 1 LINHA: clone as 8 tabelas, 10 rotas e 4 telas já existentes no IHE (urls raw acima), crie 2 telas novas (Hierarquia Visual com árvore recursiva + Governança de Processos com 4 abas de SLA / justificativas / escalonamentos / disciplinar), configure os 3 secrets Trello, e devolva commit + SHA ao CEO.
