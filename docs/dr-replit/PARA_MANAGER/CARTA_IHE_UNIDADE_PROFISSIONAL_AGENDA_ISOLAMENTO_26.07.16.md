# CARTA IHE → MANAGER — UNIDADE, PROFISSIONAL, AGENDA E MÓDULOS
**De:** Dr. Replit Pawards (IHE — Integrative Health Engine = Motor de Saúde Integrativo)
**Para:** Dr. Replit Manager (Paxter — Protocolo Manager)
**Data:** 16/07/2026
**Versão:** 3.0 — auditoria Kaizen (melhoria contínua) completa — dados verificados linha a linha no banco antes de escrever
**Método:** cada afirmação desta carta foi confirmada com query (consulta) SQL (Structured Query Language = linguagem de consulta de banco de dados) direta no banco de produção do IHE

> **AVISO IMPORTANTE:** Esta carta substitui e revoga a versão anterior
> `CARTA_IHE_AGENDA_GENESIS_E_LICENCIAMENTO_26.07.16.md` (commit `d3ed5058ac3c`),
> que continha módulos inventados e conceito errado de catálogo por unidade.

---

## 1. UNIDADE = EMPRESA COM CNPJ PRÓPRIO

No IHE, **unidade** é sinônimo de **empresa clínica independente**.
Cada unidade tem identidade fiscal (CNPJ = Cadastro Nacional de Pessoa Jurídica) própria,
contrato de licença próprio e dados completamente isolados das demais.

### 1.1 Mapa completo das unidades (verificado no banco — 16/07/2026)

| ID | Nome | CNPJ | Cidade | Tipo | Situação |
|---|---|---|---|---|---|
| 14 | INSTITUTO GENESIS | — | São Paulo | genesis_seed | Template imutável — nunca atende cliente |
| 15 | INSTITUTO PADUA | — (a cadastrar) | São Paulo | clinic | **Real — dados do CEO** |
| 8 | INSTITUTO INTEGRATIVO | 63.865.940/0001-63 | São Paulo | clinic | Fictício — demo |
| 9 | INSTITUTO LEMOS | 32.247.755/0002-62 | São Paulo | clinic | Fictício — demo |
| 10 | INSTITUTO BARROS | 44.555.666/0001-77 | Campinas | clinic | Fictício — demo |
| 16 | INSTITUTO PALUZZE | — | — | clinic | Fictício — demo |
| 17 | INSTITUTO PADUZZI | — | — | clinic | Fictício — demo |
| 18 | INSTITUTO PAZIALLE | — | — | clinic | Fictício — demo |
| 19 | INSTITUTO BARAKAT | — | — | clinic | Fictício — demo |
| 20 | INSTITUTO ANDRADE | — | — | clinic | Fictício — demo |

> Unidades 1–7 têm prefixo `(ARQUIVADA)` — são o modelo antigo, não replicar.

### 1.2 Campos relevantes da tabela `unidades`

| Coluna | O que guarda |
|---|---|
| `cnpj` | Identificação fiscal da empresa |
| `tipo` | `clinic` / `genesis_seed` / `telemedicina` / `enfermagem` |
| `dono_id` + `dono_nome` | Médico titular responsável |
| `google_calendar_id` | Calendário Google (Calendário de agendamentos online) da empresa |
| `google_drive_folder_id` | Pasta no Google Drive (armazenamento de arquivos online) da empresa |
| `slug` | Identificador único na URL (Uniform Resource Locator = endereço web) |
| `fat_meta_mensal` | Meta de faturamento mensal |
| `status` | `ativa` / `suspensa` / `cancelada` |

---

## 2. MODELO ANTIGO × MODELO NOVO (diferença crítica de arquitetura)

O banco guarda dois modelos históricos. O Manager deve implementar **somente o novo**.

| Aspecto | Modelo ANTIGO (IDs 1–7, arquivados) | Modelo NOVO (IDs 8+, vigente) |
|---|---|---|
| O que é 1 unidade? | 1 agenda de 1 único profissional | 1 empresa/instituto inteiro |
| Origem histórica | Espelhava o Google Calendar 1:1 | Multi-profissional dentro da mesma empresa |
| Exemplo | Unidade 1 = "Agenda Dr. Caio Higienópolis" | Unidade 15 = "Instituto Padua" com vários profissionais |
| Status | Arquivado — NÃO replicar | Canônico — seguir este |

---

## 3. PROFISSIONAL = USUÁRIO DO SISTEMA

**Não existe tabela separada de "profissionais".**
O médico ou enfermeiro que atende é um **usuário** (`tabela usuarios`) referenciado pelo campo `id`.
Quando ele entra no sistema de agenda, o sistema usa `usuarios.id` como chave.

### 3.1 Perfis clínicos que atuam como profissionais de agenda

| Valor em `usuarios.perfil` | Descrição |
|---|---|
| `medico_tecnico` | Médico que realiza consultas |
| `enfermeira` | Profissional de enfermagem |
| `validador_mestre` | CEO / médico com acesso total ao sistema |

### 3.2 Profissionais reais cadastrados no IHE com agenda ativa (verificado no banco)

| ID | Nome | Perfil | Empresas onde tem slots de agenda |
|---|---|---|---|
| 1 | Dr Caio Henrique Fernandes Padua | validador_mestre | 8 (Integrativo), 15 (Padua) + arquivadas |
| 3 | Ana Lima | enfermeira | Unidades arquivadas 3, 4, 5 |
| 6 | Dr Kleber Clara Lemos | medico_tecnico | 9 (Lemos) **e** 10 (Barros) simultaneamente |

### 3.3 O mesmo profissional físico pode trabalhar em múltiplas empresas

Dr Kleber (ID 6) tem 120 slots na unidade 9 (Lemos) **e** 120 slots na unidade 10 (Barros).
O `unidade_id` em cada tabela garante que os dados nunca se cruzam — o que é explicado na seção 4.

---

## 4. ISOLAMENTO ABSOLUTO DE AGENDA POR EMPRESA

**Esta é a regra de arquitetura mais importante de todo o IHE.**
Uma empresa nunca enxerga, herda ou mistura agenda de outra empresa — mesmo que o profissional
físico seja o mesmo. O `unidade_id` é a barreira intransponível.

### 4.1 Todas as tabelas de agenda carregam `unidade_id` obrigatório

| Tabela | O que guarda | Colunas de isolamento |
|---|---|---|
| `agendas_profissionais` | Definição das agendas da empresa | `unidade_id` |
| `sub_agendas` | Sub-agendas operacionais | `unidade_id` |
| `availability_rules` | Regras de disponibilidade semanal | `unidade_id` + `profissional_id` → `usuarios.id` |
| `agenda_slots` | Horários individuais disponíveis | `unidade_id` + `profissional_id` → `usuarios.id` |
| `appointments` | Consultas agendadas | `unidade_id` + `profissional_id` → `usuarios.id` |
| `team_members` | Equipe da empresa | `unidade_id` |
| `team_positions` | Cargos da empresa | `unidade_id` |

### 4.2 Blueprint do isolamento com dados reais

```
INSTITUTO LEMOS (unidade_id = 9)          INSTITUTO BARROS (unidade_id = 10)
│                                          │
├── availability_rules (unidade_id=9)      ├── availability_rules (unidade_id=10)
│   └── profissional_id=6 (Dr Kleber)     │   └── profissional_id=6 (Dr Kleber)
├── agenda_slots       (unidade_id=9)      ├── agenda_slots       (unidade_id=10)
│   └── 120 slots — Dr Kleber             │   └── 120 slots — Dr Kleber
└── appointments       (unidade_id=9)      └── appointments       (unidade_id=10)
        ↕ JAMAIS SE CRUZAM ↕
  Consulta do Lemos não aparece             Consulta do Barros não aparece
  no calendário do Barros                   no calendário do Lemos
```

### 4.3 Consequência prática

Quando o sistema exibe a tela de agendamento, ele filtra **sempre** por `unidade_id`.
O cliente do Instituto Lemos nunca enxerga horários do Instituto Barros.
Mesmo o médico físico sendo o mesmo, para o sistema são dois profissionais em dois contextos distintos.

---

## 5. DUAS CAMADAS DE AGENDA (distinção crítica — auditada)

O IHE tem **duas camadas** de agenda com papéis completamente distintos.
Confundi-las é o erro mais comum ao entender a arquitetura.

### 5.1 Camada A — DEFINIÇÃO (`agendas_profissionais`)

Tabela de **configuração visual** — define quais agendas existem, com nome e modo.
**Não está ligada diretamente ao sistema de slots.**
O campo `profissional` é texto livre (ex: `"MÉDICO INTEGRATIVO"`) — não é FK (chave estrangeira) para `usuarios`.

**Verificado no banco:** todas as 9 empresas (IDs 8–20) têm exatamente 7 registros cada nesta tabela.
(Instituto Padua tem 8 — o 8º é duplicata do médico titular, dado inconsistente pré-existente.)

### 5.2 Camada B — OPERACIONAL (`sub_agendas → regras → slots → consultas`)

Sistema que **realmente agenda consultas**. Ligado a `usuarios.id`.

```
sub_agendas           → define a agenda operacional (com modalidade, sala, Google Calendar)
    ↓ sub_agenda_id
availability_rules    → dias da semana, horários, duração dos slots
    ↓
agenda_slots          → horários individuais gerados pelas regras
    └── profissional_id → usuarios.id
        ↓
appointments          → consultas efetivamente agendadas
    └── profissional_id → usuarios.id
        paciente_id → pacientes.id
        unidade_id → unidades.id
```

### 5.3 Status real de cada empresa (verificado no banco — 16/07/2026)

| Empresa | Camada A | sub_agendas | Slots reais | Consultas agendadas |
|---|---|---|---|---|
| Instituto Padua (15) | 8 agendas | 1 sub-agenda | 14 slots | 4 consultas |
| Integrativo (8) | 7 agendas | Nenhuma | 21 slots (via regra direta) | — |
| Lemos (9) | 7 agendas | Nenhuma | 120 slots (via regra direta) | — |
| Barros (10) | 7 agendas | Nenhuma | 120 slots (via regra direta) | — |
| Genesis (14) | 7 agendas | Nenhuma | 0 slots | 0 consultas |
| Paluzze a Andrade (16–20) | 7 agendas | Nenhuma | 0 slots | 0 consultas |

> **Lição para o Manager:** clonar o Genesis gera a Camada A automaticamente.
> A Camada B precisa ser configurada por empresa — exige criar `sub_agendas` + `availability_rules`
> + vincular ao usuário profissional real (`usuarios.id`).

---

## 6. PADRÃO DAS 7 AGENDAS POR EMPRESA (Camada A)

Cada empresa nasce com 7 agendas definidas no padrão abaixo.
O mesmo profissional físico existe em duas modalidades: LOCAL (presencial) e REMOTO (online).

```
EMPRESA (1 unidade_id único)
│
├── MÉDICO TITULAR
│   ├── Agenda LOCAL   → atende o cliente presencialmente na clínica
│   ├── Agenda REMOTO  → atende online (telemedicina = consulta por vídeo)
│   └── Agenda PESSOAL → compromissos privados — invisível ao cliente
│
├── ASSISTENTE 01 (segundo médico ou médico auxiliar)
│   ├── Agenda LOCAL
│   └── Agenda REMOTO
│
└── ENFERMAGEM
    ├── Agenda LOCAL   → procedimentos presenciais (aplicações, coletas)
    └── Agenda REMOTO  → orientações remotas / domiciliar
```

**Campo que separa os modos:** `agendas_profissionais.modo` = `LOCAL` | `REMOTO` | `PESSOAL`

**Contagem verificada no banco:**

| Modo | Total de agendas cadastradas |
|---|---|
| LOCAL | 31 |
| REMOTO | 30 |
| PESSOAL | 10 |
| **Total** | **71** |

---

## 7. SUB-AGENDAS (Camada B) — colunas ricas para o Manager implementar

| Coluna | O que guarda | Observação |
|---|---|---|
| `modalidade` | `presencial` / `online` / `domiciliar` / `remoto` | Mais granular que LOCAL/REMOTO |
| `sala_ou_local` | Sala física dentro da empresa | Exibir na tela de agendamento |
| `google_calendar_id` | ID do Calendário Google | **Por sub-agenda** — não por empresa |
| `profissional_id` | FK → `usuarios.id` | Liga a sub-agenda ao usuário real |
| `requer_certificado_para_prescricao` | Boolean | Exige assinatura digital para receita? |
| `certificado_digital_*` | Dados do certificado ICP-Brasil | Para prescrição com validade jurídica |

**Ponto crítico:** o Google Calendar sincroniza **por sub-agenda**, não por empresa.
Um médico com agenda LOCAL e REMOTO na mesma empresa pode ter dois calendários Google distintos.

---

## 8. EQUIPE POR EMPRESA (`team_members` + `team_positions`)

**Verificado no banco:** 150 membros e 150 cargos — 15 por empresa, distribuídos em 10 unidades.

### 8.1 Cargos padrão por empresa

| Cargo (`team_positions.cargo`) | Quantidade por empresa |
|---|---|
| MÉDICO | 2 |
| GERENTE | 1 |
| SUPERVISOR | 2 |
| ADMINISTRATIVO | 3 |
| ENFERMAGEM | 2 |
| CONSULTOR | 2 |
| FINANCEIRO | 2 |
| OUVIDORIA | 1 |
| **Total** | **15** |

### 8.2 Permissões por cargo (colunas reais em `team_positions`)

| Permissão | O que controla |
|---|---|
| `pode_acessar_financeiro` | Ver faturamento e cobranças da empresa |
| `pode_editar_protocolos` | Alterar protocolos terapêuticos |
| `pode_aprovar_despesas` | Aprovar contas a pagar |
| `pode_auditar_cards` | Ver cartões de tarefas de toda a equipe |
| `pode_supervisionar_outros` | Gerenciar outros profissionais da empresa |
| `pode_ver_ouvidoria` | Acessar reclamações de clientes |

**Importante:** permissões são por cargo dentro de uma empresa. O médico do Instituto Padua não herda automaticamente permissões do Instituto Lemos.

---

## 9. CATÁLOGO TERAPÊUTICO — GLOBAL, NÃO POR EMPRESA

> **CORREÇÃO CRÍTICA em relação à carta anterior:**
> O catálogo NÃO vive no Instituto Padua. O catálogo NÃO pertence a nenhuma empresa.

**Verificado no banco:**
- Tabela `formulas` → **não tem coluna `unidade_id`** — é global
- Tabela `injetaveis` → **não tem coluna `unidade_id`** — é global
- Tabela `itens_terapeuticos` → 457 itens, todos com `unidade_id = NULL` — é global

```
CATÁLOGO TERAPÊUTICO (global — sem unidade_id)
├── formulas        → fórmulas magistrais (medicamentos manipulados)
├── injetaveis      → endovenosos, intramusculares, subcutâneos
├── implantes       → pellets, implantes
├── exames_base     → catálogo de exames laboratoriais
└── itens_terapeuticos → catálogo unificado (457 itens)

TODAS AS EMPRESAS acessam o MESMO catálogo global.
Não existe "catálogo do Padua" nem "catálogo do Genesis".
```

**Consequência para o Manager:** ao clonar o Genesis, o catálogo terapêutico não precisa ser copiado — já é compartilhado globalmente. O Manager deve implementar o mesmo padrão: catálogo global, empresas consomem sem copiar.

---

## 10. GENESIS — MOLDE PARA CRIAR NOVAS EMPRESAS

### 10.1 O que o clone herda automaticamente

```
GENESIS (ID 14) — template imutável
    ↓  CEO licencia nova empresa
NOVA EMPRESA (novo ID, tipo clinic)
    → herda: 7 agendas definidas (Camada A — agendas_profissionais)
    → herda: 15 membros de equipe padrão (team_members)
    → herda: cargos padrão com permissões (team_positions)
    → ACESSA: catálogo global (não copia — é compartilhado)
    → NÃO herda: Camada B (sub_agendas + slots — configurar por empresa)
    → NÃO herda: clientes / pacientes
    → NÃO herda: dados financeiros
    → módulos: configurados individualmente (ver seção 11)
```

### 10.2 O que configurar após clonar

| Passo | Ação | Tabela |
|---|---|---|
| 1 | Cadastrar usuário profissional real da empresa | `usuarios` |
| 2 | Criar sub_agendas ligadas ao profissional | `sub_agendas` |
| 3 | Definir regras de disponibilidade (dias/horários) | `availability_rules` |
| 4 | Gerar slots para o período desejado | `agenda_slots` |
| 5 | Ativar módulos conforme contrato assinado | `unidade_modulos_ativos` |

---

## 11. MÓDULOS — NOMES REAIS E PREÇOS VERIFICADOS NO BANCO

> **CORREÇÃO CRÍTICA:** a carta anterior listava módulos inventados
> (AGENDA, MENSAGERIA, RAS, ASSINATURAS...). Abaixo estão os módulos REAIS
> da tabela `modulos_sistema`, verificados linha a linha.

### 11.1 Módulos reais (`tabela modulos_sistema`)

| Código real | Nome | Categoria | Preço mensal | Preço por demanda |
|---|---|---|---|---|
| `MSG_WHATSAPP` | Mensagens WhatsApp | comunicacao | R$350,00 | R$5,00 |
| `CONSULTOR_REMOTO` | Consultor Remoto (Home Office) | premium | R$1.800,00 | R$45,00 |
| `FOLLOWUP_ATIVO` | Follow-up Ativo | operacional | R$500,00 | R$12,00 |
| `VALIDACAO_MOTOR` | Motor de Validação Clínica | avancado | R$800,00 | R$20,00 |
| `TREINAMENTO_EQUIPE` | Treinamento de Equipe | operacional | R$400,00 | R$30,00 |
| `GESTAO_ESTOQUE` | Gestão de Estoque | operacional | R$250,00 | — |
| `RELATORIOS_BI` | Relatórios e BI (Business Intelligence = inteligência de negócio) | avancado | R$600,00 | — |
| `AGENDA_INTELIGENTE` | Agenda Inteligente | core | R$200,00 | — |

> `AGENDA_INTELIGENTE` existe na tabela `modulos_sistema` mas ainda não foi atribuído a nenhuma empresa em `unidade_modulos_ativos` — módulo em preparação.

### 11.2 Status real dos módulos por empresa (verificado no banco — 16/07/2026)

| Empresa | MSG_WHATSAPP | CONSULTOR_REMOTO | FOLLOWUP_ATIVO | VALIDACAO_MOTOR | TREINAMENTO | ESTOQUE | BI |
|---|---|---|---|---|---|---|---|
| Padua (15) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Genesis (14) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Integrativo (8) | — | — | — | ✓ | — | — | — |
| Barros (10) | ✓ | — | — | ✓ | — | — | — |
| Paluzze (16) | ✓ | — | — | ✓ | — | — | — |
| Paduzzi (17) | ✓ | — | — | ✓ | — | — | — |
| Pazialle (18) | ✓ | — | — | ✓ | — | — | — |
| Andrade (20) | ✓ | — | — | ✓ | — | — | — |
| Lemos (9) | — | — | — | — | — | — | — |
| Barakat (19) | — | — | — | — | — | — | — |

### 11.3 Fluxo de ativação

```
CEO assina contrato com empresa → INSERT em contrato_clinica
    ↓
CEO ativa módulo → UPDATE unidade_modulos_ativos SET ativo=true
    ↓
Sistema registra cobrança → INSERT cobrancas_mensais_modulos
    ↓  inadimplência confirmada
CEO desativa → ativo=false → funcionalidade bloqueada para a empresa
```

### 11.4 Contratos reais cadastrados (`tabela contrato_clinica`)

| Empresa | Modelo de cobrança | Valor mensal |
|---|---|---|
| Instituto Lemos (9) | por_demanda | — |
| Instituto Barros (10) | full | R$3.500,00 |
| Instituto Integrativo (8) | pacote | — |

---

## 12. GLOSSÁRIO — TERMOS IHE × MANAGER

| Termo no IHE | Como o Manager deve tratar |
|---|---|
| `unidade` | Empresa licenciada com CNPJ próprio |
| `paciente` | **"cliente"** — vocabulário travado no Manager |
| `perfil` | Nunca chamar de `role` — o campo se chama `perfil` em todo o IHE |
| `agendas_profissionais` | Camada A (definição visual) — NÃO confundir com agendamento real |
| `sub_agendas` | Camada B (operacional) — aqui o agendamento real acontece |
| `modo LOCAL` | Atendimento presencial na empresa |
| `modo REMOTO` | Atendimento online / telemedicina |
| `genesis_seed` | Template — nunca deletar, nunca atender cliente real |
| `itens_terapeuticos` | Catálogo global — não pertence a nenhuma empresa |
| `modulos_sistema` | Tabela dos módulos vendáveis com código, preço e funcionalidades |
| `unidade_modulos_ativos` | Quais módulos estão ativados por empresa |

---

## 13. CHECKLIST DE IMPLEMENTAÇÃO PARA O MANAGER

| Prioridade | O que implementar | Referência |
|---|---|---|
| 1 | `unidade_id` em toda tabela de agenda — isolamento absoluto | Seção 4 |
| 2 | Profissional = usuário (`usuarios.id`) — sem tabela separada | Seção 3 |
| 3 | Distinguir Camada A (definição) de Camada B (operacional) | Seção 5 |
| 4 | Catálogo global — NÃO copiar por empresa | Seção 9 |
| 5 | Módulos com códigos reais: `MSG_WHATSAPP`, `VALIDACAO_MOTOR` etc. | Seção 11.1 |
| 6 | Criar as 10 empresas com CNPJ, membros e agendas definidas | Seções 1.1 e 6 |
| 7 | Camada B precisa configuração manual por empresa (não automática) | Seção 5.3 |
| 8 | Google Calendar por sub-agenda — não por empresa | Seção 7 |
| 9 | Cargos e permissões por empresa — nunca globais | Seção 8 |
| 10 | 3 modelos de contrato: `por_demanda`, `full`, `pacote` | Seção 11.4 |

---

## 14. ÍNDICE DE TODOS OS ARQUIVOS ENVIADOS AO MANAGER

| Arquivo | Conteúdo | SHA (código de verificação) GitHub |
|---|---|---|
| `DADOS_EMPRESAS_E_COLABORADORES_IHE_26.07.10.json` | 18 unidades, 150 cargos, 150 membros, 143 usuários | `aa4bee4a6fd2` |
| `CARTA_IHE_EMPRESAS_E_COLABORADORES_PARA_CLONAGEM_26.07.10.md` | Carta v1 estrutura geral | `68a7e370fe65` |
| `CARTA_IHE_EMPRESAS_E_COLABORADORES_PARA_CLONAGEM_26.07.16.md` | Carta v2 — 9 diferenças + endereços + 13 telas | `cbf576b26887` |
| `CARTA_IHE_AGENDA_GENESIS_E_LICENCIAMENTO_26.07.16.md` | Versão anterior **REVOGADA** — módulos inventados | `d3ed5058ac3c` |
| `CARTA_IHE_UNIDADE_PROFISSIONAL_AGENDA_ISOLAMENTO_26.07.16.md` | **Esta carta — versão 3.0 auditada** | (a publicar) |

**Branch (ramo de versão) GitHub:** `ver-l2-dr-claude`
**Repositório:** `caio-padua/Integrative-Health-Engine`
**Pasta:** `docs/dr-replit/PARA_MANAGER/`

---

**RESUMO EM 1 LINHA:** Unidade = empresa com CNPJ; profissional = usuário; catálogo é global (não por empresa); módulos têm códigos e preços reais (`MSG_WHATSAPP` R$350, `VALIDACAO_MOTOR` R$800...); `unidade_id` em toda tabela de agenda garante isolamento absoluto entre empresas.
