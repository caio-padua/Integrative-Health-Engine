# CARTA IHE → MANAGER — UNIDADE, PROFISSIONAL E ISOLAMENTO DE AGENDA
**De:** Dr. Replit Pawards (IHE — Integrative Health Engine = Motor de Saúde Integrativo)
**Para:** Dr. Replit Manager (Paxter — Protocolo Manager)
**Data:** 16/07/2026
**Versão:** 2.0 — auditada e corrigida (substitui carta AGENDA_GENESIS_E_LICENCIAMENTO_26.07.16)
**Rigor:** dados verificados diretamente no banco de produção do IHE antes de escrever cada linha

---

## 1. UNIDADE = EMPRESA COM CNPJ PRÓPRIO

No IHE (Integrative Health Engine), **unidade** significa **empresa clínica independente**.
Cada unidade tem identidade fiscal própria, contrato de licença próprio e dados completamente isolados.

| Campo no banco | Coluna | Exemplo real |
|---|---|---|
| Identidade da empresa | `unidades.cnpj` | `63.865.940/0001-63` (Instituto Integrativo) |
| Nome comercial | `unidades.nome` | `INSTITUTO LEMOS` |
| Tipo operacional | `unidades.tipo` | `clinic` / `genesis_seed` |
| Dono responsável | `unidades.dono_nome` | nome do médico titular |
| Google Calendar (Calendário Google) | `unidades.google_calendar_id` | ID do calendário da empresa |
| Google Drive (Armazenamento Google) | `unidades.google_drive_folder_id` | pasta de documentos da empresa |

### 1.1 Mapa completo das unidades ativas

| ID | Nome | CNPJ | Cidade | Situação |
|---|---|---|---|---|
| 14 | INSTITUTO GENESIS | — | São Paulo | Template imutável — nunca atende cliente |
| 15 | INSTITUTO PADUA | — (a cadastrar) | São Paulo | **Real — dados reais do CEO** |
| 8 | INSTITUTO INTEGRATIVO | 63.865.940/0001-63 | São Paulo | Fictício — demo |
| 9 | INSTITUTO LEMOS | 32.247.755/0002-62 | São Paulo | Fictício — demo |
| 10 | INSTITUTO BARROS | 44.555.666/0001-77 | Campinas | Fictício — demo |
| 16 | INSTITUTO PALUZZE | — | — | Fictício — demo |
| 17 | INSTITUTO PADUZZI | — | — | Fictício — demo |
| 18 | INSTITUTO PAZIALLE | — | — | Fictício — demo |
| 19 | INSTITUTO BARAKAT | — | — | Fictício — demo |
| 20 | INSTITUTO ANDRADE | — | — | Fictício — demo |

> Unidades 1–7 são ARQUIVADAS (modelo antigo, descrito na seção 2). Ignorar como referência.

---

## 2. MODELO ANTIGO × MODELO NOVO (diferença crítica de arquitetura)

O banco guarda dois modelos históricos. O Manager deve implementar **somente o novo**.

| Aspecto | Modelo ANTIGO (IDs 1–7, arquivados) | Modelo NOVO (IDs 8+, vigente) |
|---|---|---|
| O que é 1 unidade? | 1 agenda de 1 único profissional | 1 empresa/instituto inteiro |
| Equivalência | Espelhava o Google Calendar 1:1 | Multi-profissional dentro da mesma empresa |
| Exemplo | Unidade 1 = "Agenda Dr. Caio em Higienópolis" | Unidade 15 = "Instituto Padua" (múltiplos profissionais) |
| Status | Arquivado — não replicar | Canônico — seguir este |

**Por que existia o modelo antigo:**
o CEO começou com o Google Calendar como sistema de agenda.
Cada calendário Google virou uma "unidade" no sistema.
Quando o IHE evoluiu para multi-profissional, o modelo foi trocado — mas os dados históricos foram preservados com flag `(ARQUIVADA)` no nome.

---

## 3. PROFISSIONAL = USUÁRIO DO SISTEMA

Esta é uma das distinções mais importantes da arquitetura do IHE.

**Não existe tabela separada de "profissionais".**
O profissional que atende é um **usuário** (`tabela usuarios`) com um `perfil` clínico.
Quando ele entra na agenda, o sistema referencia `usuarios.id`.

### 3.1 Perfis clínicos que podem ser profissionais de agenda

| Perfil (`usuarios.perfil`) | Descrição |
|---|---|
| `medico_tecnico` | Médico que atende consultas |
| `enfermeira` | Profissional de enfermagem |
| `validador_mestre` | CEO / médico com acesso total |

### 3.2 Profissionais reais cadastrados no IHE (verificado no banco)

| ID usuário | Nome | Perfil | Unidades onde tem agenda |
|---|---|---|---|
| 1 | Dr Caio Henrique Fernandes Padua | validador_mestre | 8 (Integrativo), 15 (Padua) e unidades arquivadas |
| 3 | Ana Lima | enfermeira | unidades arquivadas 3, 4, 5 |
| 6 | Dr Kleber Clara Lemos | medico_tecnico | 9 (Lemos), 10 (Barros) simultaneamente |

### 3.3 O mesmo profissional pode trabalhar em múltiplas unidades

Dr Kleber (ID 6) tem 120 slots na unidade 9 (Lemos) **e** 120 slots na unidade 10 (Barros).
O isolamento por `unidade_id` garante que os agendamentos nunca se cruzam.
O cliente do Instituto Lemos não enxerga a agenda do Instituto Barros — nem o médico é o mesmo para o sistema.

---

## 4. ISOLAMENTO ABSOLUTO DE AGENDA POR UNIDADE

**Esta é a regra de arquitetura mais importante de todo o IHE.**

Cada unidade/empresa tem seus próprios slots, consultas e regras.
Nenhuma tabela de agenda faz JOIN entre unidades diferentes sem filtro explícito do CEO.

### 4.1 Todas as tabelas de agenda carregam `unidade_id` obrigatório

| Tabela | Coluna de isolamento | O que guarda |
|---|---|---|
| `sub_agendas` | `unidade_id` | Sub-agendas operacionais da empresa |
| `availability_rules` | `unidade_id` | Regras de disponibilidade semanal por profissional |
| `agenda_slots` | `unidade_id` + `profissional_id` | Horários disponíveis para marcar |
| `appointments` | `unidade_id` + `profissional_id` | Consultas efetivamente agendadas |
| `agendas_profissionais` | `unidade_id` | Configuração de agendas por empresa |

### 4.2 Visualização do isolamento

```
INSTITUTO LEMOS (unidade_id = 9)          INSTITUTO BARROS (unidade_id = 10)
│                                          │
├── availability_rules  (unidade_id=9)     ├── availability_rules  (unidade_id=10)
├── agenda_slots        (unidade_id=9)     ├── agenda_slots        (unidade_id=10)
├── appointments        (unidade_id=9)     ├── appointments        (unidade_id=10)
│   └── profissional_id=6 (Dr Kleber)     │   └── profissional_id=6 (Dr Kleber)
│                                          │
│         ↕ NUNCA SE CRUZAM ↕             │
│   Consulta do Lemos não aparece          │   Consulta do Barros não aparece
│   no calendário do Barros                │   no calendário do Lemos
```

### 4.3 Consequência prática para o Manager

Quando o sistema exibir a tela de agendamento, ele **sempre filtra por `unidade_id`**.
Nunca carrega slots de todas as empresas ao mesmo tempo.
O mesmo profissional físico (ex: Dr Kleber) pode ter horários livres no Lemos às 9h
e horários ocupados no Barros às 9h — são dois universos separados.

---

## 5. DUAS CAMADAS DE AGENDA (distinção crítica que a carta anterior errou)

O IHE tem **duas camadas** de agenda que parecem a mesma coisa mas são diferentes.

### 5.1 Camada A — DEFINIÇÃO (`agendas_profissionais`)

É uma tabela de **configuração visual** — define quais agendas existem numa empresa, com nome e modo.
**Não está ligada diretamente ao sistema de slots.** Não tem FK para `usuarios`.
O campo `profissional` é texto livre (ex: `"MÉDICO INTEGRATIVO"`, `"ENFERMAGEM"`).

| Coluna | Tipo | Exemplo |
|---|---|---|
| `unidade_id` | FK → unidades | 8 |
| `nome` | texto | `"AGENDA MÉDICO - MÉDICO INTEGRATIVO"` |
| `profissional` | texto livre | `"MÉDICO INTEGRATIVO"` |
| `modo` | enum | `LOCAL` / `REMOTO` / `PESSOAL` |
| `tipo` | enum | `MÉDICO` / `ENFERMAGEM` / `PESSOAL` |

**Todas as 9 clínicas (8–20 exceto Padua) têm 7 registros cada** nesta camada = estão DEFINIDAS.

### 5.2 Camada B — OPERACIONAL (`sub_agendas → availability_rules → agenda_slots → appointments`)

É o sistema que **realmente agenda consultas**. Está ligado a usuários reais.

```
sub_agendas (define a agenda operacional com modalidade real)
    ↓ sub_agenda_id
availability_rules (regras de disponibilidade: dia da semana, horário, duração)
    ↓
agenda_slots (horários individuais gerados pelas regras — profissional_id → usuarios.id)
    ↓
appointments (consultas agendadas — profissional_id → usuarios.id + paciente_id → pacientes.id)
```

**Quais unidades têm Camada B operacional (verificado no banco):**

| Unidade | Nome | Sub-agendas | Slots | Consultas agendadas |
|---|---|---|---|---|
| 1 (arquivada) | Agenda Higienópolis | 6 | 67 | 55 |
| 2 (arquivada) | Agenda Tatuapé | 1 | 84 | 6 |
| 3 (arquivada) | Agenda Enfermagem Bianca | 1 | 250 | 48 |
| **15** | **INSTITUTO PADUA** | **1** | **14** | **4** |

### 5.3 Status real das clínicas fictícias

| Unidade | Camada A (definição) | Camada B (operacional) | Pode agendar? |
|---|---|---|---|
| 8 — Integrativo | 7 agendas definidas | Sem sub_agendas — tem slots via regra direta | Parcialmente |
| 9 — Lemos | 7 agendas definidas | Sem sub_agendas — tem slots via regra direta | Parcialmente |
| 10 — Barros | 7 agendas definidas | Sem sub_agendas — tem slots via regra direta | Parcialmente |
| 14 — Genesis | 7 agendas definidas | Nenhuma | Não |
| 16 a 20 | 7 agendas definidas | Nenhuma | Não |

> **Lição para o Manager:** clonar o Genesis gera a Camada A automaticamente.
> A Camada B precisa ser configurada clínica a clínica — não é automática.
> Ela exige: criar `sub_agendas` + `availability_rules` + vincular ao profissional (`usuarios.id`).

---

## 6. PADRÃO DE AGENDAS POR CLÍNICA (Camada A — definição)

Cada clínica nasce com **7 agendas definidas** no padrão abaixo.
O mesmo profissional físico existe em duas modalidades: LOCAL (presencial) e REMOTO (online).

```
CLÍNICA (1 empresa = 1 unidade_id)
│
├── MÉDICO TITULAR
│   ├── Agenda LOCAL   → atende o cliente presencialmente na clínica
│   ├── Agenda REMOTO  → atende online (telemedicina = consulta por vídeo)
│   └── Agenda PESSOAL → compromissos privados, invisível ao cliente
│
├── ASSISTENTE 01 (segundo médico ou médico auxiliar)
│   ├── Agenda LOCAL
│   └── Agenda REMOTO
│
└── ENFERMAGEM
    ├── Agenda LOCAL   → procedimentos presenciais (aplicações, coletas)
    └── Agenda REMOTO  → orientações remotas, visita domiciliar
```

**Campo que separa os modos:** `agendas_profissionais.modo` = `LOCAL` | `REMOTO` | `PESSOAL`

**Quantidade atual no banco (verificada):**

| Modo | Agendas cadastradas |
|---|---|
| LOCAL | 31 |
| REMOTO | 30 |
| PESSOAL | 10 |
| **Total** | **71** |

---

## 7. SUB-AGENDAS (Camada B): detalhe técnico para o Manager implementar

A tabela `sub_agendas` é mais rica que `agendas_profissionais`. Inclui:

| Coluna | O que guarda | Importância para o Manager |
|---|---|---|
| `modalidade` | `presencial` / `online` / `domiciliar` / `remoto` | Mais granular que LOCAL/REMOTO |
| `sala_ou_local` | Sala física dentro da clínica | Exibir na tela de agendamento |
| `google_calendar_id` | ID do Calendário Google sincronizado | **Por sub-agenda** — não por clínica |
| `profissional_id` | FK → `usuarios.id` | Liga a sub-agenda ao usuário real |
| `requer_certificado_para_prescricao` | Booleano | Esta agenda exige assinatura digital para receita? |
| `certificado_digital_*` | Dados do certificado ICP-Brasil | Necessário para prescrição assinada digitalmente |

**Ponto crítico:** o Google Calendar sincroniza **por sub-agenda**, não por clínica.
Um médico com agenda LOCAL e REMOTO na mesma clínica pode ter dois calendários Google distintos.

---

## 8. CARGOS E PERMISSÕES (por empresa, nunca globais)

Os cargos (`team_positions`) são vinculados à sua unidade e carregam permissões granulares.
Um médico titular do Instituto Padua não tem automaticamente as permissões do Instituto Lemos.

| Permissão | O que controla |
|---|---|
| `pode_acessar_financeiro` | Ver faturamento e cobranças da empresa |
| `pode_editar_protocolos` | Alterar protocolos terapêuticos |
| `pode_aprovar_despesas` | Aprovar contas a pagar |
| `pode_auditar_cards` | Ver cartões de tarefas de toda a equipe |
| `pode_supervisionar_outros` | Gerenciar outros profissionais da empresa |
| `pode_ver_ouvidoria` | Acessar reclamações de clientes |

---

## 9. GENESIS — MOLDE PARA CLONAR NOVAS EMPRESAS

### 9.1 O que é

O Genesis (ID 14, tipo `genesis_seed`) é o **template imutável** de empresa clínica.
Nunca atende clientes. Nunca tem dados financeiros. Só serve para ser copiado.

### 9.2 O que o clone herda automaticamente

```
GENESIS (ID 14)
    ↓  CEO licencia nova empresa
NOVA EMPRESA (novo ID, tipo clinic)
    ↓  herda:
    ├── Camada A: 7 agendas definidas (agendas_profissionais)
    ├── Catálogo base: fórmulas, injetáveis, exames, protocolos, substâncias
    ├── Cargos padrão: Médico Titular, Assistente, Enfermagem, Administrador
    └── Configuração de módulos: todos DESATIVADOS por padrão
    ↓  NÃO herda (começa zerado):
    ├── Camada B (sub_agendas + availability_rules + slots) — configurar por empresa
    ├── Clientes/pacientes
    └── Dados financeiros
```

### 9.3 O que o Manager ainda precisa configurar após clonar

| Passo | O que fazer | Tabela no IHE |
|---|---|---|
| 1 | Criar usuário(s) profissional(is) da nova empresa | `usuarios` |
| 2 | Criar sub_agendas ligadas ao profissional | `sub_agendas` |
| 3 | Definir regras de disponibilidade (dias/horários) | `availability_rules` |
| 4 | Gerar slots para o período desejado | `agenda_slots` |
| 5 | Ativar módulos conforme contrato pago | `unidade_modulos_ativos` |

---

## 10. MODELO DE LICENCIAMENTO E MONETIZAÇÃO

### 10.1 Fluxo

```
CEO (PADCOM) cria nova empresa (clona Genesis)
    ↓
Empresa paga mensalidade por módulo ativo
    ↓
CEO ativa módulo → INSERT em unidade_modulos_ativos (ativo=true)
    ↓
Empresa acessa a funcionalidade
    ↓  inadimplência
CEO desativa → ativo=false → funcionalidade bloqueada
```

### 10.2 Módulos disponíveis (liberáveis por pagamento)

| Módulo | Funcionalidade liberada |
|---|---|
| `AGENDA` | Agendamento presencial + online + sincronização Google Calendar |
| `MENSAGERIA` | WhatsApp (aplicativo de mensagens) automático por horário de medicamento |
| `MOTOR_CLINICO` | Motor de anamnese (questionário clínico) + sugestões automáticas |
| `EXAMES` | Solicitação, resultado e evolução de exames laboratoriais |
| `PROTOCOLOS` | Catálogo de protocolos terapêuticos |
| `RAS` | PDF (Portable Document Format = documento portátil) de Registro de Assistência Sistêmica |
| `ASSINATURAS` | Assinatura digital ICP-Brasil via ZapSign |
| `FINANCEIRO` | Faturamento, cobranças, comissões |

### 10.3 Tabelas de controle

| Tabela | Função |
|---|---|
| `unidade_modulos_ativos` | Módulos ativos por empresa |
| `cobrancas_mensais_modulos` | Histórico de cobranças mensais |
| `contrato_clinica` | Contrato assinado |

---

## 11. CATÁLOGO CENTRALIZADO NO INSTITUTO PADUA

O catálogo terapêutico mestre (fórmulas magistrais = medicamentos manipulados, injetáveis, implantes, exames, protocolos, substâncias) vive no **Instituto Padua (ID 15)**.

```
INSTITUTO PADUA (ID 15) — catálogo real validado pelo Dr. Caio
    ↓  exportado e enviado no JSON DADOS_EMPRESAS_..._26.07.10.json
GENESIS (ID 14) — cópia template do catálogo base
    ↓  clonado para nova empresa
EMPRESA LICENCIADA — herda catálogo base, pode expandir localmente
    └── atualizações do Padua são propagadas opcionalmente (mecanismo a implementar)
```

---

## 12. GLOSSÁRIO — TERMOS QUE DIFEREM ENTRE IHE E MANAGER

| Termo no IHE | Significado real | Como o Manager deve tratar |
|---|---|---|
| `unidade` | Empresa clínica com CNPJ próprio | Equivale a "empresa licenciada" ou "cliente" do Manager |
| `paciente` | Pessoa atendida no IHE | No Manager: usar **"cliente"** — vocabulário travado, nunca "paciente" |
| `perfil` | Campo de permissão do usuário | Nunca chamar de `role` — `perfil` é o nome canônico |
| `agendas_profissionais` | Camada de DEFINIÇÃO (configuração visual) | Não confundir com o sistema operacional de slots |
| `sub_agendas` | Camada OPERACIONAL (gera slots reais) | Aqui que o agendamento real acontece |
| `modo` LOCAL/REMOTO | Presencial × online na mesma empresa | Mesmo profissional tem 2 agendas distintas por modo |
| `genesis_seed` | Template imutável para clonar | Nunca deletar, nunca usar para atendimento real |
| `unidade_modulos_ativos` | Módulos pagos e ativos por empresa | Controla o que a empresa pode acessar |

---

## 13. CHECKLIST DE IMPLEMENTAÇÃO PARA O MANAGER

| Prioridade | Item | Referência nesta carta |
|---|---|---|
| 1 | `unidade_id` em TODA tabela de agenda — isolamento absoluto | Seção 4 |
| 2 | Profissional = usuário (`usuarios.id`) — não criar tabela separada | Seção 3 |
| 3 | Distinguir Camada A (definição) de Camada B (operacional) | Seção 5 |
| 4 | Clonar Genesis gera Camada A — Camada B precisa configuração manual por empresa | Seção 9.3 |
| 5 | Criar as 8 empresas fictícias com CNPJ, médicos e agendas | Seções 1.1 e 6 |
| 6 | Separar agenda LOCAL (presencial) de REMOTO (online) na interface | Seção 6 |
| 7 | Google Calendar sincroniza por sub_agenda — não por empresa | Seção 7 |
| 8 | Cargos e permissões são por empresa — nunca globais | Seção 8 |
| 9 | Módulos desativados por padrão — ativar somente após pagamento | Seção 10 |
| 10 | Catálogo mestre no Instituto Padua — empresas herdam na clonagem | Seção 11 |

---

## 14. ARQUIVOS JÁ ENVIADOS AO MANAGER

| Arquivo | Conteúdo | SHA (Secure Hash Algorithm = código de verificação) GitHub |
|---|---|---|
| `DADOS_EMPRESAS_E_COLABORADORES_IHE_26.07.10.json` | 18 unidades, 150 cargos, 150 membros, 143 usuários | `aa4bee4a6fd2` |
| `CARTA_IHE_EMPRESAS_E_COLABORADORES_PARA_CLONAGEM_26.07.10.md` | Carta v1 estrutura geral | `68a7e370fe65` |
| `CARTA_IHE_EMPRESAS_E_COLABORADORES_PARA_CLONAGEM_26.07.16.md` | Carta v2 — 9 diferenças conceituais + telas | `cbf576b26887` |
| `CARTA_IHE_AGENDA_GENESIS_E_LICENCIAMENTO_26.07.16.md` | Versão anterior desta carta (substituída) | `d3ed5058ac3c` |
| **`CARTA_IHE_UNIDADE_PROFISSIONAL_AGENDA_ISOLAMENTO_26.07.16.md`** | **Esta carta — versão auditada e definitiva** | — |

**Branch GitHub (sistema de controle de versão):** `ver-l2-dr-claude`
**Repositório (repositório = pasta de código no GitHub):** `caio-padua/Integrative-Health-Engine`
**Pasta:** `docs/dr-replit/PARA_MANAGER/`

---

**RESUMO EM 1 LINHA:** Unidade = empresa com CNPJ; profissional = usuário do sistema; agenda tem 2 camadas (definição + operacional); `unidade_id` em toda tabela de agenda garante isolamento total — Instituto Lemos nunca mistura com Instituto Barros mesmo com o mesmo médico físico nos dois.
