# CARTA — Dr. Replit Pawards (IHE) → Dr. Replit Manager (Paxter)
# VERSÃO AMPLIADA — 9 DIFERENÇAS CONCEITUAIS + ENDEREÇOS + TELAS

Assunto: Clonagem do cadastro das EMPRESAS e COLABORADORES do IHE (Integrative Health Engine)
+ explicação das 9 diferenças conceituais que o CEO (Dr. Caio) pediu que eu te passe.

Data: 16/07/2026
Repositório de origem: `caio-padua/Integrative-Health-Engine` (IHE)
Braço vivo: `ver-l2-dr-claude`

**Siglas (explicadas SEMPRE):**

| Sigla | O que significa |
|-------|-----------------|
| IHE | Integrative Health Engine = sistema Pawards (meu repositório) |
| Paxter / Manager | o sistema primo (seu repositório) |
| CNPJ | Cadastro Nacional da Pessoa Jurídica (documento da empresa) |
| CPF | Cadastro de Pessoa Física |
| JSON | JavaScript Object Notation = arquivo de dados estruturado que a máquina lê direto |
| SHA | identificador único de uma gravação no GitHub |
| raw | link do arquivo em texto puro no GitHub (sem HTML) |
| API | Application Programming Interface = interface de comunicação entre sistemas |
| multi-tenant | um único sistema que serve múltiplos clientes isolados (cada clínica é um "tenant") |
| pay-per-use | modelo de cobrança por uso real (não mensalidade fixa) |
| SaaS | Software as a Service = software vendido como serviço na nuvem |
| CRM | Customer Relationship Management = gestão de relacionamento com cliente |
| RAS | Registro de Assistência Sistêmica = prontuário digital do paciente no IHE |
| FAP | Formulário de Auditoria de Procedimentos = documento de conferência |
| Google Calendar ID | identificador único de um calendário Google |

---

## 1. CONCLUSÃO PRIMEIRO

Seu conector GitHub falhou no seu repl, então eu exportei TUDO do banco IHE em um arquivo JSON (JavaScript Object Notation)
e publiquei no GitHub. Além dos dados, este arquivo te explica 9 conceitos que o CEO
definiu e que você precisa replicar corretamente no Paxter. Leia TUDO antes de codar.

---

## 2. ONDE ESTÃO OS DADOS E ARQUIVOS (repertórios completos)

**Base raw:** `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/`

| Arquivo | Caminho no repositório | Conteúdo |
|---------|------------------------|----------|
| PACOTE DE DADOS (o que você importa) | `docs/dr-replit/PARA_MANAGER/DADOS_EMPRESAS_E_COLABORADORES_IHE_26.07.10.json` | 18 empresas + 150 cargos + 150 colaboradores + 143 usuários |
| Esta carta (versão ampliada) | `docs/dr-replit/PARA_MANAGER/CARTA_IHE_EMPRESAS_E_COLABORADORES_PARA_CLONAGEM_26.07.16.md` | 9 diferenças conceituais + endereços + telas |
| Carta anterior (cockpit GPS Pádua) | `docs/dr-replit/PARA_MANAGER/CARTA_IHE_COCKPIT_GPS_PADUA_ARSENAL_TERAPEUTICO_E_KAIZEN_26.07.10.md` | contexto do motor clínico |
| Schema do banco da Agenda | `lib/db/src/schema/agenda.ts` | estrutura completa das tabelas sub_agendas, availability_rules, appointments |
| Schema dos Usuários | `lib/db/src/schema/usuarios.ts` | estrutura dos profissionais e perfis |
| Schema das Unidades (empresas) | `lib/db/src/schema/unidades.ts` | estrutura das clínicas |

**URLs raw prontas para fetch:**

- Dados JSON: `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/docs/dr-replit/PARA_MANAGER/DADOS_EMPRESAS_E_COLABORADORES_IHE_26.07.10.json`
- Schema Agenda: `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/lib/db/src/schema/agenda.ts`

---

## 3. AS 5 EMPRESAS PRINCIPAIS (a verdade dos números)

| Grupo | IDs | Empresas | Observação |
|-------|-----|----------|------------|
| EMPRESAS VIVAS (as 5 que o CEO quer) | 8, 9, 10, 14, 15 | INSTITUTO INTEGRATIVO, INSTITUTO LEMOS, INSTITUTO BARROS, INSTITUTO GENESIS, INSTITUTO PADUA | Genesis (14) é o molde-mestre; Pádua (15) é a operacional com pacientes reais |
| Arquivadas (histórico) | 1 a 7 | marcadas "(ARQUIVADA)" | importe só se quiser histórico |
| Cascas ainda vazias | 16-20 | PALUZZE, PADUZZI, PAZIALLE, BARAKAT, ANDRADE | criadas mas sem endereço/CNPJ ainda |
| Teste descartável | 21 | — | NÃO importar |

---

## 4. DIFERENÇA 1 — CADA CLÍNICA TEM SEUS PRÓPRIOS PROFISSIONAIS

No IHE, o profissional é vinculado à clínica por `usuarios.unidade_id`.
No Paxter, você precisa replicar este vínculo.

Regra: `profissional → pertence a → clínica (unidade)`.

| Nível | Campo no IHE | O que controla |
|-------|--------------|----------------|
| Vínculo principal | `usuarios.unidade_id` | em qual clínica o profissional atua |
| Escopo global | `usuarios.unidade_id = NULL` | acesso a todas (plataforma) |
| Vínculo de cargo (Recursos Humanos) | `team_members.unidade_id + team_members.posicao_id` | cargo formal do colaborador na clínica |

No JSON exportado, os 143 usuários trazem o campo `unidade_id`.
110 deles têm `unidade_id = NULL` (escopo global).
Os outros 33 têm vínculo direto com uma clínica específica.

**Regra para clonagem:** ao criar os profissionais no Paxter, preserve o `unidade_id`.
Nunca misture profissionais de clínicas diferentes na mesma listagem sem filtrar por clínica.

---

## 5. DIFERENÇA 2 — AGENDAS NÃO SÃO EMPRESAS (são universos separados)

No IHE, a agenda (sub_agenda) é uma entidade FILHA da clínica (unidade).
Cada sub-agenda pertence a UMA única clínica pelo campo `sub_agendas.unidade_id`.

Blueprint: `clínica (unidade_id = 8) → sub_agenda (unidade_id = 8) → availability_rules → agenda_slots → appointments`

| Tabela | Campo de vínculo | O que representa |
|--------|------------------|------------------|
| `sub_agendas` | `unidade_id` | agenda pertenece a UMA clínica |
| `sub_agendas` | `profissional_id` | profissional responsável pela agenda |
| `sub_agendas` | `google_calendar_id` | calendário Google (API) vinculado a esta agenda |
| `availability_rules` | `unidade_id + profissional_id + sub_agenda_id` | horários disponíveis do profissional nesta clínica |
| `agenda_slots` | `unidade_id + profissional_id + sub_agenda_id` | slots de horário gerados |
| `appointments` | `unidade_id + profissional_id + paciente_id` | consulta agendada |

**Regra de ouro:** ao listar agendas para qualquer dropdown, SEMPRE filtrar por `unidade_id` da clínica selecionada.
Nunca carregar agendas sem filtro — isso misturaria clínicas.

---

## 6. DIFERENÇA 3 — O BUG DO CAMPO "CLÍNICA DE ORIGEM" NO CADASTRO DE PACIENTE

O CEO relatou que no cadastro de paciente do Paxter existe um campo chamado
"Clínica de Origem" com um dropdown que puxa as AGENDAS, mas está puxando
errado — mostra as agendas do Instituto Pádua (unidade_id = 15) para QUALQUER clínica.

**Diagnóstico do bug (o que provavelmente aconteceu):**

| Passo | O que deveria ser | O que está acontecendo |
|-------|-------------------|------------------------|
| 1. Usuário seleciona "Clínica de Origem" | sistema lê o ID da clínica selecionada | sistema usa um ID fixo ou pega o padrão do contexto que aponta pra Pádua |
| 2. Dropdown de agendas carrega | `GET /sub-agendas?unidade_id={clinicaSelecionada}` | `GET /sub-agendas` sem filtro, retorna tudo, ou filtrado sempre em `unidade_id=15` |
| 3. Lista exibida | agendas da clínica escolhida | agendas só do Instituto Pádua |

**A correção correta:**

O fetch de agendas DEVE passar o `unidade_id` da clínica que o usuário selecionou no campo "Clínica de Origem":

```
GET /sub-agendas?unidade_id=<id_da_clinica_selecionada>&ativa=true
```

No backend, a query deve filtrar por `unidade_id`:

```sql
SELECT * FROM sub_agendas
WHERE unidade_id = $clinicaSelecionadaId
  AND ativa = true
ORDER BY ordem ASC;
```

**Nunca hardcodar `unidade_id = 15`** (Instituto Pádua) nem carregar todas as
agendas sem filtro. O campo "Clínica de Origem" deve ser o acionador do filtro.

---

## 7. DIFERENÇA 4 — GRUPO DE PROFISSIONAIS POR CLÍNICA (modelo CEO)

O CEO conceituou que cada clínica deve ter um grupo padrão de profissionais com dois tipos de médico:

| Tipo de profissional | Presença | Modalidade | Campo no sistema |
|----------------------|----------|------------|-----------------|
| Médico fixo | Sempre na clínica física | Presencial | `modalidade = "presencial"` na sub_agenda |
| Médico remoto | Atende de outro local | Teleconsulta / online | `modalidade = "online"` na sub_agenda |
| Enfermeira | Na clínica | Presencial | `tipo = "enfermagem"` na sub_agenda |
| Recepcionista | Na clínica | Presencial | perfil `recepcao` |
| Nutricionista (se houver) | Presencial ou remoto | Ambos | conforme cadastro |

No IHE, a tabela `sub_agendas` já tem o campo `modalidade` com valores possíveis:
`presencial`, `online`, `hibrido`.

**Regra para clonagem:** no Paxter, o cadastro de profissional deve permitir definir
se ele é fixo (presencial) ou remoto (online) para cada clínica onde atua.
Um mesmo médico pode ser "fixo" na clínica A e "remoto" na clínica B.

---

## 8. DIFERENÇA 5 — ENDEREÇOS E REPERTÓRIOS PARA CLONAR TUDO

**Repositório IHE (fonte de tudo):**

| Item | URL / Caminho |
|------|---------------|
| Repositório GitHub (interface web) | `https://github.com/caio-padua/Integrative-Health-Engine` |
| Branch viva | `ver-l2-dr-claude` |
| Pasta de entrega pro Paxter | `docs/dr-replit/PARA_MANAGER/` |
| Schema banco (todos os arquivos) | `lib/db/src/schema/` |
| Rotas da API (Application Programming Interface) backend | `artifacts/api-server/src/routes/` |
| Telas frontend | `artifacts/clinica-motor/src/pages/` |
| Documentação de decisões | `docs/dr-claude/` |
| Migrações do banco (histórico completo) | `db/migrations/` |

**Como acessar qualquer arquivo via raw:**
`https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/{CAMINHO_DO_ARQUIVO}`

Exemplo: `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/lib/db/src/schema/agenda.ts`

---

## 9. DIFERENÇA 6 — PAXTER É MULTI-TENANT COM LICENCIAMENTO PAY-PER-USE

O CEO definiu: o Paxter será um sistema SaaS (Software as a Service) multi-tenant
onde cada clínica é um "tenant" (inquilino) isolado dentro do mesmo sistema.

**Conceito multi-tenant:**

| Conceito | O que significa na prática |
|----------|---------------------------|
| Tenant | cada clínica licenciada é um tenant — seus dados são isolados dos demais |
| Licenciamento | o CEO licencia o acesso ao Paxter para cada clínica |
| Pay-per-use | a clínica paga pelo que usa (não mensalidade fixa) |
| Isolamento | clínica A jamais vê dados da clínica B |
| Painel do CEO | visão de todas as clínicas ao mesmo tempo (escopo global) |

**Implicação técnica:**
Toda tabela que armazena dado clínico deve ter `tenant_id` (ou equivalente `clinica_id`).
Toda rota que lê dado deve filtrar por `tenant_id` do usuário autenticado.
Nunca retornar dados sem checar o tenant — isso seria uma falha grave de segurança (IDOR).

**Blueprint do fluxo:**
`CEO cadastra clínica → clínica recebe tenant_id → módulos liberados conforme pagamento → profissionais fazem login dentro do tenant → dados isolados por tenant`

---

## 10. DIFERENÇA 7 — HIERARQUIA E GOVERNANÇA (já explicada anteriormente)

| Nível | Quem é | O que pode |
|-------|--------|------------|
| CEO (Dr. Caio) | proprietário do sistema | acesso total, decide tudo, visão global |
| Platform Owner | administrador da clínica | acessa só sua clínica, configura profissionais e módulos |
| Médico | profissional clínico | atende pacientes/clientes da sua clínica |
| Enfermeira | profissional da saúde | triagem, procedimentos de enfermagem |
| Recepcionista | administrativo | agenda, cadastro de clientes |

Regra de campo: o perfil do usuário se chama SEMPRE `perfil`, nunca `role`.
O campo `role` é proibido pelo CEO (confunde com "rota" no backend).
Use `perfil` em todas as tabelas, telas e APIs.

---

## 11. DIFERENÇA 8 — MONETIZAÇÃO CRIATIVA: MÓDULOS LIBERADOS POR PAGAMENTO

O CEO definiu: o Paxter deve ter uma lógica de módulos onde cada funcionalidade
é um módulo vendável, liberado conforme pagamento e aquisição.

**Módulos previstos (referência do IHE para clonar):**

| Módulo | O que faz | Status no IHE |
|--------|-----------|---------------|
| Motor Clínico | sugere exames, fórmulas, protocolos com base na anamnese | ativo |
| Agenda Motor | agendamento com slots + Google Calendar (API) | ativo |
| RAS (Registro de Assistência Sistêmica) | prontuário digital + PDF | ativo |
| Prescrição Digital | receituário RASX/REVO com assinatura ICP-Brasil | ativo |
| Mensageria | WhatsApp automático com cronobiologia | ativo |
| Portal do Paciente | acesso do paciente ao próprio histórico | parcial |
| Delegação | board Trello-style de tarefas com scoring | ativo |
| Financeiro | faturamento, comissões, inadimplência | parcial |

**Lógica de liberação por pagamento:**

Blueprint: `Clínica adquire módulo → pagamento confirmado → flag ativa no banco → frontend exibe ou esconde o módulo → profissional acessa`

Campo sugerido no banco:
```sql
modulos_ativos JSONB -- exemplo: {"motor_clinico": true, "agenda": true, "ras": false}
```

**Regra:** nunca esconder módulo só no frontend — a API (Application Programming Interface)
do backend também deve checar se o módulo está ativo para o tenant antes de responder.
Segurança dupla: frontend oculta, backend bloqueia.

---

## 12. DIFERENÇA 9 — TELAS DO IHE PARA CLONAR (respeitando identidade do Paxter)

O CEO quer que você replique as telas abaixo no Paxter, mas adaptadas à identidade
visual e conceitos do Paxter (não copie o design IHE pixel a pixel — adapte).

**Atenção:** no Paxter o atendido é chamado de "cliente", nunca "paciente".

| Tela no IHE | Caminho no repositório | O que faz |
|-------------|------------------------|-----------|
| Dashboard principal | `pages/dashboard.tsx` | visão geral da clínica: clientes, agendamentos, faturamento |
| Dashboard cockpit | `pages/dashboard-cockpit/` | painel de operação em tempo real |
| Cadastro de cliente | `pages/pacientes/` (adaptar: "paciente" → "cliente") | formulário de cadastro com clínica de origem e dados pessoais |
| Agenda Motor | `pages/agenda-motor.tsx` | calendário de agendamentos com slots e sub-agendas |
| Colaboradores | `pages/colaboradores.tsx` | gestão de equipe (cargos, vínculos, pontuação) |
| Gestão de clínicas | `pages/admin-clinicas.tsx` | CRUD (Create Read Update Delete) das unidades/empresas |
| Configurações | `pages/configuracoes/` | parâmetros por clínica |
| Financeiro | `pages/financeiro/` | faturamento, comissões |
| Filas operacionais | `pages/filas/` | fila de atendimento, triagem |
| Permissões | `pages/admin-permissoes-delegadas.tsx` | gestão de acesso por perfil |
| Módulos / Monetização | `pages/monetizar.tsx` | painel de ativação de módulos (adaptar para pay-per-use) |
| Delegação de tarefas | `pages/delegacao/` | board de tarefas com prioridades |
| Agentes Virtuais | `pages/agentes-virtuais.tsx` | Inteligência Artificial de suporte (quando implementado) |

**Como acessar as telas via raw:**
`https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/artifacts/clinica-motor/src/pages/{NOME_DA_TELA}`

**Regra do CEO para TODAS as telas:**
- Nada hardcoded: dados vêm do banco, não do código
- Tudo editável via tela de menu (não precisa abrir código para configurar)
- Nomes completos e semânticos (nunca abreviados)
- Campos booleanos de permissão usam prefixo `pode_` (exemplo: `pode_ver_financeiro`)

---

## 13. RECEITA DE IMPORTAÇÃO (passo a passo)

Passo A: fetch do JSON pelo raw →
Passo B: criar tabelas `empresas`, `cargos`, `colaboradores` no Paxter (adicionar colunas, nunca dropar o que existe) →
Passo C: importar as 5 principais (ids 8 INTEGRATIVO, 9 LEMOS, 10 BARROS, 14 GENESIS, 15 PADUA) + colaboradores/cargos delas →
Passo D: decidir com o CEO se importa arquivadas (1-7) e cascas (16-20) →
Passo E: criar telas de menu para ver/editar tudo (nada só hardcoded) →
Passo F: corrigir o bug da "Clínica de Origem" conforme item 6 →
Passo G: implementar lógica multi-tenant com isolamento por `tenant_id` →
Passo H: implementar liberação de módulos por pagamento →
Passo I: Commit & Push + devolver prova (URL raw + SHA do commit) ao CEO

---

## 14. FECHAMENTO OBRIGATÓRIO (regra de ouro entre agentes)

Ao terminar, você TEM que:
1. Fazer Commit & Push no repositório do Paxter
2. Devolver ao CEO: URL raw do que mudou + SHA (identificador) do commit

Sem prova, o trabalho "evapora" na percepção do CEO. Prova é obrigatória.

---

RESUMO EM 1 LINHA: os dados das 5 clínicas principais + 9 diferenças conceituais (profissionais por clínica, agendas separadas, bug clínica-de-origem, grupos de profissionais, repertórios completos, multi-tenant pay-per-use, hierarquia, monetização por módulo, e 13 telas para clonar) estão todos aqui — leia tudo, depois code, e devolva a prova (raw + SHA) ao CEO.
