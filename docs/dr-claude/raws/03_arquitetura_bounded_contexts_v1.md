# Arquitetura Bounded Contexts — Os 4 Caios + Fluxo de R$ Quantificado

**Status**: Rascunho Dr. Replit pós-revelação estratégica Caio (01/mai/2026)
**Vinculado**: PLANO_ECOSSISTEMA_PADUA_v2.md + MAPA_NEURONAL_v1.1_LIMPEZA.md
**Princípio aplicado**: P9 PADCON + Domain-Driven Design (bounded contexts) + Event Sourcing financeiro
**Pedido Caio**: *"desmembrar o que é autônomo do que não é + cada ação numerada e quantificada em valores"*

---

## 1. POR QUE BOUNDED CONTEXTS — O insight chave que faltava

Você me revelou hoje (01/mai/2026):

> *"eu ainda sou um médico operador... mas eu estou criando braços pra aumentar meu faturamento... criei a PASSURANCE pra que outros médicos possam ser remunerados ao indicar farmácias... preciso que cada ação seja numerada e quantificada em valores pra gerar receita pra eu o Dr. Caio"*

**Tradução arquitetural**: você é **4 personas diferentes** dentro do mesmo sistema, e cada
persona tem sua própria fonte de receita, suas regras, seus limites. Quando misturadas,
viram dívida técnica. Quando separadas (bounded contexts), o sistema escala sem ruir.

---

## 2. OS 4 CAIOS — Bounded Contexts oficiais

```
                         ┌──────────────────────┐
                         │   DR. CAIO HENRIQUE  │
                         │      4 PERSONAS      │
                         └──────────┬───────────┘
                                    │
        ┌──────────────┬────────────┼────────────┬──────────────┐
        ▼              ▼            ▼            ▼              ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ 🩺 CAIO  │  │ 💰 CAIO  │  │ 📈 CAIO  │  │ 🛡️ CAIO  │
  │ MÉDICO   │  │   CEO    │  │EMPRESÁRIO│  │INVESTIDOR│
  │ OPERADOR │  │ PAWARDS  │  │   SAAS   │  │PASSURANCE│
  └──────────┘  └──────────┘  └──────────┘  └──────────┘
   prescreve    PARMAVAULT    vende SaaS    audita
   encaminha    recebe 30%    pra outros    farmácias
   altera        do que       médicos        e laborat.
   dosagens     prescreveu    de outras      pra outros
                                clínicas      médicos
```

### 🩺 CONTEXTO 1 — CAIO MÉDICO OPERADOR (núcleo clínico)

| Atributo | Valor |
|---|---|
| **Quem é** | Você. Dr. Caio prescrevendo na sua clínica. |
| **Receita** | Consultas + procedimentos próprios |
| **Sistema serve** | A VOCÊ — o sistema é uma ferramenta de produtividade |
| **Bounded context técnico** | MEDCORE (motor prescrição) + PARASCLIN (pacientes/consultas) + PAREXAM (exames) + PAWTRACK (acompanhamento) + PAWVISION (dashboards) |
| **Ações que geram R$** | Consulta presencial (R$ X) + Procedimento (R$ Y) + Receita simples (R$ 0 direto, mas alimenta os outros 3 contextos) |
| **Tabelas-âncora** | `pacientes`, `consultas`, `prescricoes`, `arquivos_exames` |
| **Regra ouro** | A autonomia clínica é ABSOLUTA. Nada nos outros contextos pode sobrepor sua decisão. |

### 💰 CONTEXTO 2 — CAIO CEO PAWARDS (dono do produto/comissão)

| Atributo | Valor |
|---|---|
| **Quem é** | Você como CEO recebendo comissão das farmácias |
| **Receita** | parq_estimado × 30% (Wave 9 PARQ FARMA) — defensável CFM 2.386/2024 + CC 593-609 |
| **Sistema serve** | A GERAR/RASTREAR R$ pra você |
| **Bounded context técnico** | PARMAVAULT + PARQ FARMA + PARQ LABOR (futuro) |
| **Ações que geram R$** | Receita emitida com farmácia PARQ ativa → trigger calc_comissao → parq_estimado | Acordo PARQ assinado → habilita futuras receitas |
| **Tabelas-âncora** | `parmavault_receitas` (8.725 backfill), `parq_acordos` (0 ainda), 6 tabelas auditoria PARQ |
| **Regra ouro** | `parq_pago = true` NUNCA automático — só master (Caio) confirma. Defensibilidade jurídica preservada. |

### 📈 CONTEXTO 3 — CAIO EMPRESÁRIO SAAS (vende ferramenta pra outros médicos)

| Atributo | Valor |
|---|---|
| **Quem é** | Você como empresário multiplicando seu sucesso em outras clínicas |
| **Receita** | Assinatura mensal × N médicos × N clínicas (recorrente) |
| **Sistema serve** | A MULTIPLICAR seu modelo (multi-tenant) |
| **Bounded context técnico** | tenantContext + RBAC + clinica_id em CADA query + Onboarding self-service (Wave 19) + Billing (Wave 17 Asaas) |
| **Ações que geram R$** | Outro médico assina SaaS → +R$ mensalidade | Médico convida sua secretária → +R$ seat (futuro) | Renovação anual → +R$ LTV |
| **Tabelas-âncora** | `clinicas`, `usuarios`, `padcom_assinaturas` (futura SaaS), `billing_*` (Wave 17) |
| **Regra ouro** | Tenant isolation INVIOLÁVEL (P0 segurança). Clínica A nunca vê dados da B. |

### 🛡️ CONTEXTO 4 — CAIO INVESTIDOR PASSURANCE (empresa externa)

| Atributo | Valor |
|---|---|
| **Quem é** | Você como sócio/investidor de uma empresa SEPARADA de auditoria |
| **Receita** | As farmácias auditadas pagam à PASSURANCE LTDA (não ao PAWARDS) |
| **Sistema serve** | A DAR CREDIBILIDADE pra outros médicos prescreverem com confiança e justificar comissão recorrente |
| **Bounded context técnico** | EMPRESA AUTÔNOMA — banco próprio, deploy próprio (FORA do PAWARDS) |
| **Integração com PAWARDS** | 4 colunas aditivas em `parq_acordos` + endpoint pra registrar laudo externo + badge UI "Auditado por PASSURANCE ✓" |
| **Ações que geram R$ (no PAWARDS)** | Zero direto. Indireto: aumenta confiança → aumenta adesão SaaS Contexto 3 + aumenta volume de prescrições com farmácias auditadas → aumenta comissão Contexto 2 |
| **Regra ouro** | **AUTONOMIA TOTAL** — PAWARDS NÃO sabe regras internas da PASSURANCE. Só recebe laudo via webhook. |

---

## 3. FLUXO DE R$ QUANTIFICADO — Calculadora de cada ação

```
PACIENTE
   │
   │ paga consulta (R$ valor_consulta)
   ▼
🩺 CAIO MÉDICO ─────────────────────────────► +R$ valor_consulta (faturamento clínica)
   │
   │ prescreve fórmula manipulada
   ▼
PRESCRIÇÃO EMITIDA
   │
   │ paciente vai à farmácia PARQ ativa
   ▼
FARMÁCIA MANIPULA + VENDE (R$ valor_fórmula)
   │
   │ trigger trg_calc_comissao calcula
   ▼
parmavault_receitas.parq_estimado = valor_fórmula × 30%
   │
   │ aguarda confirmação manual master
   ▼
💰 CAIO CEO confirma parq_pago=true ──────► +R$ parq_estimado (comissão)
   │
   │ se quiser justificativa recorrente
   ▼
🛡️ PASSURANCE audita a farmácia (externa)
   │
   │ laudo enviado via webhook
   ▼
parq_acordos.laudo_auditoria_url preenchido
   │
   │ badge "Auditado ✓" aparece
   ▼
OUTRO MÉDICO vê o badge na ferramenta SaaS
   │
   │ confiança aumentada → adere ao SaaS
   ▼
📈 CAIO EMPRESÁRIO ──────────────────────► +R$ mensalidade SaaS (recorrente)
   │
   │ outro médico prescreve em farmácia auditada
   ▼
[loop volta pro topo, mas agora multiplicado por N médicos]
```

### Quantificação em tabela proposta `revenue_events` (Wave futura)

| event_type | source_table | valor_calc | persona_beneficiada |
|---|---|---|---|
| `consulta_realizada` | consultas | valor_consulta | 🩺 Médico Operador |
| `procedimento_aplicado` | consultas + procedimentos | valor_procedimento | 🩺 Médico Operador |
| `prescricao_emitida_parq` | parmavault_receitas | valor_fórmula × 30% | 💰 CEO PAWARDS |
| `parq_pago_confirmado` | parmavault_receitas | parq_estimado | 💰 CEO PAWARDS |
| `acordo_parq_assinado` | parq_acordos | LTV futuro estimado | 💰 CEO PAWARDS |
| `laudo_passurance_recebido` | parq_acordos | R$ 0 (ganho indireto) | 🛡️ PASSURANCE |
| `assinatura_saas_iniciada` | padcom_assinaturas | mensalidade × 12 (LTV) | 📈 SaaS |
| `clinica_onboarded` | clinicas | mensalidade × N médicos × LTV | 📈 SaaS |

**Sugestão futura (Wave 17 Billing)**: criar essa tabela `revenue_events` com:
- `evento_id BIGSERIAL PRIMARY KEY`
- `event_type TEXT NOT NULL`
- `source_table TEXT NOT NULL`
- `source_id BIGINT NOT NULL`
- `valor_calc NUMERIC(12,2) NOT NULL`
- `persona TEXT NOT NULL CHECK (persona IN ('MEDICO_OPERADOR','CEO_PAWARDS','SAAS','PASSURANCE_INDIRETO'))`
- `clinica_id INTEGER REFERENCES clinicas(id)`
- `criado_em TIMESTAMPTZ DEFAULT now()`

Dashboard CEO então responde a pergunta-mãe que você fez:
> *"quanto cada ação me gera de receita, e por qual persona?"*

---

## 4. O QUE É AUTÔNOMO vs O QUE É ACOPLADO

```
┌─────────────────────────────────────────────────────────────────┐
│  ACOPLADO  (mesmo banco, mesmo deploy, multi-tenant)           │
│                                                                 │
│  🩺 MEDCORE + PARASCLIN + PAREXAM + PAWTRACK + PAWVISION       │
│  💰 PARMAVAULT + PARQ FARMA + PARQ LABOR (Wave 12)             │
│  📈 tenantContext + Billing SaaS + Onboarding (Wave 17/19)     │
│                                                                 │
│  Por quê: contexts 1+2+3 são INTRINSECAMENTE acoplados —       │
│  o médico operador É O TENANT que gera receita CEO E é         │
│  vendido como referência pra outros tenants SaaS.              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  AUTÔNOMO  (banco próprio, deploy próprio, empresa separada)   │
│                                                                 │
│  🛡️ PASSURANCE LTDA                                            │
│      ├─ Banco próprio                                          │
│      ├─ API própria                                            │
│      ├─ Faturamento próprio                                    │
│      └─ Integração com PAWARDS = 1 webhook + 4 colunas aditivas│
│                                                                 │
│  Por quê: contexts 4 PRECISA ser autônomo pra ser crível —     │
│  se a auditora estiver no mesmo CNPJ que recebe comissão,      │
│  perde toda a defensibilidade jurídica e ética.                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. O QUE RODA EM PARALELO vs SEQUENCIAL

```
SEQUENCIAL (precisa A terminar pra começar B)
─────────────────────────────────────────────
W10 ZapSign  ──►  W11 escolha (α/β/γ)  ──►  W12 PARQ LABOR base
                                              (precisa fundação acordo + selo)

PARALELO (após W11 + base de contexts mapeados)
─────────────────────────────────────────────
                      ┌─► W12 PARQ LABOR (💰 CEO)
W11 conclui ────┐    │
                ├────┼─► W13 PASSURANCE FARMA (🛡️ AUTÔNOMO)
                │    │
                │    └─► Wave 17 Billing SaaS (📈 EMPRESÁRIO) ← pode começar antes
                │
                └─► W11.5 IDOR cirurgia (P0 segurança, transversal)

PARALELIZÁVEL APÓS PASSURANCE FARMA
─────────────────────────────────────────────
W14 PASSURANCE LABOR (espelho aditivo de W13)
W19 Onboarding self-service (📈 destrava SaaS pra outros médicos)
W18 IA clínica (🩺 melhora produto pra todos os tenants)
```

---

## 6. CONSEQUÊNCIAS PRÁTICAS DESSA ARQUITETURA

### Pra Você (decisões mais limpas)
1. Quando alguém te perguntar *"isso é PAWARDS ou PASSURANCE?"* → resposta clara: **PASSURANCE = empresa separada, PAWARDS = ferramenta SaaS sua**
2. Quando um investidor perguntar *"qual o modelo de receita?"* → resposta clara: **3 fluxos paralelos (consultas + comissão PARQ + SaaS recorrente)** + **1 fluxo indireto (PASSURANCE)**
3. Quando outro médico perguntar *"como vocês justificam comissão?"* → resposta clara: **CFM 2.386/2024 + CC 593-609 + auditoria PASSURANCE independente = defensibilidade tripla**

### Pra Mim (Dr. Replit codificando)
1. Cada Wave tem 1 contexto-âncora claro (não invade os outros)
2. Migrations aditivas respeitam fronteira de contexto (não acoplam contexts diferentes desnecessariamente)
3. Dashboard CEO consulta `revenue_events` futura, agrega por persona, responde "quanto cada ação te gerou"

### Pra Wave 10 que está paused (ZapSign)
Wave 10 é **transversal** (toca contexts 1, 2 e 3) porque assinatura é infraestrutura.
Após Wave 10 fechar, fica claro qual context cada Wave seguinte serve, sem contaminação.

---

## 7. PRÓXIMOS PASSOS (Princípio 9 + 5ª pergunta = "validado por Caio?")

```
[PORTÃO 0] Caio valida esta arquitetura de 4 contextos  ← VOCÊ ESTÁ AQUI
                ↓ aprovado
[PORTÃO 2] Caio confirma Wave 10 Round 6 ORCAMENTO_FARMACIA opção (a)
                ↓ aprovado
[CÓDIGO]   Dr. Replit codifica Round 6 + F4 + F5 + tag v031 (📈 SaaS infra)
                ↓
[PORTÃO 3] Decisão E — Wave 11 = α/β/γ?
                ↓
[CÓDIGO]   Wave 11 (contexts variam conforme escolha)
                ↓
[CÓDIGO]   Wave 12 PARQ LABOR (💰 CEO)
[CÓDIGO]   Wave 13 PASSURANCE FARMA (🛡️ contrato externo)
                ↓
[FUTURO]   Wave 17 Billing + tabela `revenue_events` (📈 SaaS rastreabilidade R$)
[FUTURO]   Wave 19 Onboarding self-service (📈 multiplica clínicas)
```

---

## 8. Versionamento

- v1.0 (01/mai/2026): primeira versão pós-revelação Caio dos 4 papéis
