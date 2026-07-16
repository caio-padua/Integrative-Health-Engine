# CARTA IHE → MANAGER — AGENDA, GENESIS E LICENCIAMENTO
**De:** Dr. Replit Pawards (IHE — Integrative Health Engine)
**Para:** Dr. Replit Manager (Paxter — Protocolo Manager)
**Data:** 16/07/2026
**Assunto:** Estrutura de agendas por profissional, modelo Genesis, licenciamento multi-clínica e monetização por módulo

---

## 1. CONTEXTO: O QUE É UMA "UNIDADE" NO IHE

No IHE (Integrative Health Engine = Motor de Saúde Integrativo), **unidade** é sinônimo de **clínica/instituto**.
Não confundir com "unidade" = "filial geográfica" — aqui cada instituto licenciado é uma unidade independente.

| Campo | Valor no IHE |
|---|---|
| Tabela principal | `unidades` |
| Coluna de tipo | `tipo` |
| Tipos existentes | `clinic`, `telemedicina`, `enfermagem`, `domiciliar`, `genesis_seed`, `personal` |
| ID protegido | `14` = INSTITUTO GENESIS (template imutável, nunca deletar) |
| ID real do CEO | `15` = INSTITUTO PADUA |

---

## 2. MODELO ANTIGO (ARQUIVADO) × MODELO NOVO

Esta distinção é CRÍTICA para entender o histórico do banco.

| Aspecto | Modelo Antigo (IDs 1 a 7, ARQUIVADOS) | Modelo Novo (IDs 8+, ATIVO) |
|---|---|---|
| O que é 1 unidade? | 1 agenda de 1 profissional | 1 clínica/instituto inteiro |
| Exemplo | Unidade 1 = "Agenda Médico Higienópolis Dr. Caio" | Unidade 15 = "Instituto Padua" (com vários profissionais dentro) |
| Origem | Espelhava o Google Calendar (Calendário Google) 1:1 | Multi-profissional dentro da mesma clínica |
| Status | Arquivado — não usar como modelo | Modelo canônico (padrão oficial) |

**Regra:** O Manager deve seguir APENAS o modelo novo (ID ≥ 8).

---

## 3. PADRÃO DE AGENDAS POR CLÍNICA (modelo canônico)

Cada clínica no IHE cria automaticamente **7 agendas** para seus profissionais.
O campo `modo` na tabela `agendas_profissionais` define se é presencial ou remoto.

### 3.1 Blueprint de agendas de uma clínica

```
CLÍNICA (unidade)
│
├── MÉDICO TITULAR
│   ├── AGENDA MÉDICO — LOCAL      (presencial, na clínica)
│   ├── AGENDA MÉDICO — REMOTO     (telemedicina = consulta online)
│   └── AGENDA PESSOAL             (agenda privada do médico, não visível ao cliente)
│
├── ASSISTENTE 01 (médico auxiliar)
│   ├── AGENDA MÉDICO ASSISTENTE — LOCAL
│   └── AGENDA MÉDICO ASSISTENTE — REMOTO
│
└── ENFERMAGEM
    ├── AGENDA ENFERMAGEM — LOCAL
    └── AGENDA ENFERMAGEM — REMOTO
```

### 3.2 Exemplo real: Instituto Integrativo (unidade 8)

| ID agenda | Nome | Profissional | Modo | Tipo |
|---|---|---|---|---|
| 1 | AGENDA MÉDICO - MÉDICO INTEGRATIVO | MÉDICO INTEGRATIVO | LOCAL | MÉDICO |
| 2 | AGENDA MÉDICO - MÉDICO INTEGRATIVO | MÉDICO INTEGRATIVO | REMOTO | MÉDICO |
| 3 | AGENDA PESSOAL - MÉDICO INTEGRATIVO | MÉDICO INTEGRATIVO | PESSOAL | PESSOAL |
| 4 | AGENDA MÉDICO - ASSISTENTE 01 | ASSISTENTE 01 | LOCAL | MÉDICO |
| 5 | AGENDA MÉDICO - ASSISTENTE 01 | ASSISTENTE 01 | REMOTO | MÉDICO |
| 6 | AGENDA ENFERMAGEM | ENFERMAGEM | LOCAL | ENFERMAGEM |
| 7 | AGENDA ENFERMAGEM | ENFERMAGEM | REMOTO | ENFERMAGEM |

**Este padrão de 7 agendas se repete em TODAS as clínicas.**

---

## 4. CLÍNICAS CADASTRADAS NO IHE (universo completo)

### 4.1 Clínicas reais (com dados de pacientes reais)

| ID | Nome | Tipo | Cidade | Estado |
|---|---|---|---|---|
| 15 | INSTITUTO PADUA | clinic | São Paulo | SP |

### 4.2 Genesis (template imutável)

| ID | Nome | Tipo | Finalidade |
|---|---|---|---|
| 14 | INSTITUTO GENESIS | genesis_seed | Semente para criar novas clínicas — NUNCA deletar |

### 4.3 Clínicas fictícias de demonstração (dados simulados)

| ID | Nome | Tipo | Cidade | Estado |
|---|---|---|---|---|
| 8 | INSTITUTO INTEGRATIVO | clinic | São Paulo | SP |
| 9 | INSTITUTO LEMOS | clinic | São Paulo | SP |
| 10 | INSTITUTO BARROS | clinic | Campinas | SP |
| 16 | INSTITUTO PALUZZE | clinic | — | — |
| 17 | INSTITUTO PADUZZI | clinic | — | — |
| 18 | INSTITUTO PAZIALLE | clinic | — | — |
| 19 | INSTITUTO BARAKAT | clinic | — | — |
| 20 | INSTITUTO ANDRADE | clinic | — | — |

> Todas as clínicas fictícias (IDs 8, 9, 10, 16–20) seguem o mesmo padrão de 7 agendas da seção 3.
> Os nomes dos médicos titulares são fictícios: Médico Integrativo, Médico Lemos, Médico Barros, Médico Paluzze, Médico Paduzzi, Médico Pazialle, Médico Barakat, Médico Andrade.

### 4.4 Agendas completas de todas as clínicas fictícias (para replicar no Manager)

| Clínica | Médico Titular | Assistente | Modo disponível |
|---|---|---|---|
| Instituto Integrativo (8) | MÉDICO INTEGRATIVO | ASSISTENTE 01 | LOCAL + REMOTO |
| Instituto Lemos (9) | MÉDICO LEMOS | ASSISTENTE 01 | LOCAL + REMOTO |
| Instituto Barros (10) | MÉDICO BARROS | ASSISTENTE 01 | LOCAL + REMOTO |
| Instituto Paluzze (16) | MÉDICO PALUZZE | ASSISTENTE 01 | LOCAL + REMOTO |
| Instituto Paduzzi (17) | MÉDICO PADUZZI | ASSISTENTE 01 | LOCAL + REMOTO |
| Instituto Pazialle (18) | MÉDICO PAZIALLE | ASSISTENTE 01 | LOCAL + REMOTO |
| Instituto Barakat (19) | MÉDICO BARAKAT | ASSISTENTE 01 | LOCAL + REMOTO |
| Instituto Andrade (20) | MÉDICO ANDRADE | ASSISTENTE 01 | LOCAL + REMOTO |

---

## 5. GENESIS — O QUE É E COMO FUNCIONA

### 5.1 Conceito

O **Genesis** (ID 14, tipo `genesis_seed`) é o **molde imutável** de uma clínica nova.
Quando uma nova clínica é licenciada, ela nasce como uma cópia do Genesis — com todas as agendas, catálogo base e configurações já prontas.

```
GENESIS (ID 14)
    ↓  clonar
NOVA CLÍNICA (ID novo, tipo clinic)
    → herda: agendas (7 padrão)
    → herda: catálogo base de fórmulas, injetáveis, exames, protocolos
    → herda: configurações de motor, fluxos de aprovação
    → NÃO herda: pacientes (começa vazio)
    → NÃO herda: dados financeiros
```

### 5.2 O que o Manager deve implementar

O Manager deve criar o seu próprio Genesis local com:

| Componente | Conteúdo |
|---|---|
| Clínica Genesis | 1 unidade tipo `genesis_seed` |
| Agendas padrão | 7 agendas (médico titular LOCAL+REMOTO, assistente LOCAL+REMOTO, pessoal, enfermagem LOCAL+REMOTO) |
| Catálogo base | Fórmulas, injetáveis, exames e protocolos do Instituto Padua (enviados no JSON anterior) |
| Configuração de módulos | Todos os módulos desativados por padrão — ativam mediante pagamento |
| Perfis de acesso | Médico Titular, Assistente, Enfermagem, Administrador da Clínica |

---

## 6. MODELO DE LICENCIAMENTO E MONETIZAÇÃO

### 6.1 Princípio central

```
CEO (PADCOM/PAWARDS)
    ↓  licencia
CLÍNICA LICENCIADA
    ↓  paga mensalidade por módulo
MÓDULO LIBERADO → funcionalidade ativa para a clínica
```

### 6.2 Módulos que existem no IHE (liberáveis por pagamento)

| Módulo | O que libera |
|---|---|
| `AGENDA` | Agendamento de consultas (presencial e online) + Google Calendar (Calendário Google) |
| `MENSAGERIA` | Envio de WhatsApp (aplicativo de mensagens) automático por horário de tomada de medicamento |
| `EXAMES` | Solicitação + resultado + evolução de exames laboratoriais |
| `PROTOCOLOS` | Acesso ao catálogo de protocolos terapêuticos |
| `MOTOR_CLINICO` | Motor de anamnese (questionário) + sugestões automáticas de fórmulas, injetáveis, implantes |
| `RAS` | Geração de PDF (Portable Document Format = documento portátil) de Registro de Assistência Sistêmica |
| `ASSINATURAS` | Assinatura digital ICP-Brasil via ZapSign |
| `FINANCEIRO` | Faturamento, cobranças, comissões |

### 6.3 Tabelas de controle no IHE

| Tabela | Função |
|---|---|
| `unidade_modulos_ativos` | Quais módulos estão ativos por clínica |
| `cobrancas_mensais_modulos` | Histórico de cobranças mensais por módulo por clínica |
| `contrato_clinica` | Contrato assinado de licenciamento |
| `consultorias` | Registro de clínicas que são clientes de consultoria |

### 6.4 Fluxo de liberação de módulo

```
CEO libera módulo → INSERT em unidade_modulos_ativos (ativo=true)
    → clínica acessa a funcionalidade
    → sistema registra cobrança em cobrancas_mensais_modulos
    → inadimplência → CEO revoga → ativo=false → funcionalidade bloqueada
```

---

## 7. CATÁLOGO CENTRALIZADO NO INSTITUTO PADUA

### 7.1 Onde vive o catálogo mestre

O catálogo terapêutico completo (fórmulas magistrais = medicamentos manipulados, injetáveis, implantes, exames, protocolos, substâncias) vive no **Instituto Padua (ID 15)** e no **Instituto Genesis (ID 14)**.

```
INSTITUTO PADUA (ID 15) — catálogo real, validado pelo Dr. Caio
    ↓  exportar via JSON (já enviado: DADOS_EMPRESAS_..._26.07.10.json)
GENESIS (ID 14) — cópia template
    ↓  clonar para nova clínica
CLÍNICA LICENCIADA — herda catálogo base, pode expandir localmente
```

### 7.2 Regra de negócio

- A clínica licenciada **não paga pelo catálogo** — ele é incluído na licença base.
- A clínica **paga por módulo** (agenda, mensageria, motor clínico etc.).
- Atualizações do catálogo mestre no Instituto Padua são opcionalmente propagadas às clínicas licenciadas (mecanismo de sincronização a implementar).

---

## 8. O QUE O MANAGER DEVE IMPLEMENTAR — CHECKLIST

| Prioridade | Item | Referência |
|---|---|---|
| 1 | Criar Genesis local no Manager com as 7 agendas padrão | Seção 3 + 5 |
| 2 | Importar catálogo base do JSON enviado (fórmulas, injetáveis, exames, protocolos) | JSON `DADOS_EMPRESAS_..._26.07.10.json` |
| 3 | Criar as 8 clínicas fictícias com médicos e agendas da seção 4.4 | Seção 4.3 e 4.4 |
| 4 | Implementar tabela de módulos por clínica (ativar/desativar) | Seção 6.2 e 6.3 |
| 5 | Implementar tela de licenciamento — CEO libera módulo mediante pagamento | Seção 6.4 |
| 6 | Separar agenda LOCAL (presencial) de REMOTO (online) na interface | Seção 3.1 |
| 7 | Proteger ID Genesis (nunca deletar, nunca sobrescrever) | Seção 5 |
| 8 | Catálogo mestre fica no Instituto Padua — clínicas licenciadas herdam | Seção 7 |

---

## 9. DIFERENÇAS CONCEITUAIS CRÍTICAS ENTRE IHE E MANAGER

> Complementa a carta anterior (`CARTA_IHE_EMPRESAS_E_COLABORADORES_PARA_CLONAGEM_26.07.16.md`).

| Conceito | No IHE | O que o Manager deve entender |
|---|---|---|
| "Unidade" | Clínica/instituto licenciado | Equivale a "empresa" ou "cliente" no Manager |
| "Agenda" | Sub-entidade da clínica, por profissional e modo | 1 clínica tem N agendas (nunca 1 agenda = 1 clínica) |
| "Modo" da agenda | LOCAL (presencial) ou REMOTO (online) | O mesmo profissional tem 2 agendas: 1 para cada modo |
| "Pessoal" | Agenda privada do médico (sem cliente) | Não confundir com agenda de atendimento |
| "Genesis" | Semente imutável para clonagem | Template que nunca atende paciente real |
| "Módulo" | Funcionalidade vendável separadamente | O pagamento do módulo ativa/desativa a feature |
| "Cliente" | Pessoa atendida (no Manager = "cliente", não "paciente") | Vocabulário travado — nunca usar "paciente" no Manager |

---

## 10. DADOS JÁ ENVIADOS PARA O MANAGER

| Arquivo | Conteúdo | Commit SHA (Secure Hash Algorithm = código de verificação) |
|---|---|---|
| `DADOS_EMPRESAS_E_COLABORADORES_IHE_26.07.10.json` | 18 unidades, 150 cargos, 150 membros, 143 usuários | `aa4bee4a6fd2` |
| `CARTA_IHE_EMPRESAS_E_COLABORADORES_PARA_CLONAGEM_26.07.10.md` | Carta v1 clonagem | `68a7e370fe65` |
| `CARTA_IHE_EMPRESAS_E_COLABORADORES_PARA_CLONAGEM_26.07.16.md` | Carta v2 com 9 diferenças conceituais | `cbf576b26887` |
| `CARTA_IHE_AGENDA_GENESIS_E_LICENCIAMENTO_26.07.16.md` | Esta carta | — |

**Branch GitHub:** `ver-l2-dr-claude`
**Repositório:** `caio-padua/Integrative-Health-Engine`
**Pasta:** `docs/dr-replit/PARA_MANAGER/`

---

**RESUMO EM 1 LINHA:** Cada clínica = 7 agendas (titular+assistente+enfermagem, cada um LOCAL+REMOTO+pessoal); Genesis = molde para clonar; catálogo mora no Instituto Padua; módulos se pagam separado para liberar acesso.
