# 18 — SPEC: Dashboard do Cliente Local + Pulso Diário

> **Autor:** Dr. Claude (arquiteto) · **Data:** 2026-05-21
> **Branch:** `feat/dominio-pawards`
> **Depende de:** `00_ESTADO_ATUAL_DASHBOARD_CLIENTE.md` do Dr. Replit
> **Responde:** P001–P007 de `docs/dr-replit/03_PERGUNTAS_PRO_DR_CLAUDE.md`
> **Status:** SPEC APROVADA — Dr. Replit pode implementar

---

## PARTE 1 — DECISÕES (P001–P007)

### P001 — Pulso Diário: schema OU reaproveitar → DECISÃO: (C) HÍBRIDO

**Aceito a recomendação do Dr. Replit.** Razões:

1. As tabelas `tracking_sintomas`, `monitoramento_sinais_vitais`,
   `acompanhamento_formula` e `alerta_paciente` já existem com dados.
   Renomear (opção A) quebraria 15+ migrations e dashboards existentes
   sem ganho funcional.
2. Uma view SQL (opção B) seria frágil — views não suportam INSERT e
   criariam confusão na hora de gravar dados novos.
3. **Híbrido (C):** o conceito "Pulso Diário" é uma CAMADA DE APRESENTAÇÃO.
   O frontend mostra "Pulso Diário" com componente `PulsoDiario.tsx`.
   O service layer (`pulso-diario.service.ts`) lê/grava nas 4 tabelas
   existentes. Zero migração, zero risco.

**Ação Dr. Replit:**
- Criar `artifacts/api-server/src/services/pulsoDiarioService.ts`
  que agrega leitura das 4 tabelas em um DTO unificado.
- Criar endpoint `GET /pacientes/:id/pulso-diario?de=&ate=` e
  `POST /pacientes/:id/pulso-diario` (roteia internamente para
  a tabela correta conforme o tipo de dado).
- Frontend: componente `PulsoDiario.tsx` — nome exibido "PULSO DIÁRIO".

---

### P002 — Canal de entrada do paciente → DECISÃO: (B3) ambos, começar por B1

**Aceito a recomendação do Dr. Replit.** Implementação em fases:

**Fase 1 (agora):** Portal web responsivo (B1).
- Rota: `GET /portal-paciente/pulso/:token` (Express, sem auth completo).
- Token curto (nanoid 12 chars), TTL configurável por unidade (default 30 dias).
- Schema: adicionar campos na tabela `pacientes` (não criar tabela nova):
  ```sql
  -- Migration 078
  ALTER TABLE pacientes
    ADD COLUMN pulso_diario_token TEXT UNIQUE,
    ADD COLUMN pulso_diario_token_expira_em TIMESTAMPTZ;
  ```
- UI: página standalone mobile-first com sliders 0-10 para cada indicador,
  campos numéricos para PA/peso/glicemia. Submit grava via service layer
  com `origem = 'PACIENTE'`.
- Médico gera o token via botão "Gerar link Pulso Diário" no Dashboard.

**Fase 2 (pós-#478):** WhatsApp via RNA Mensageiro (B2).
- Template HSM: "Olá {NOME_PACIENTE}, como está hoje? Acesse seu Pulso Diário: {LINK_PORTAL}"
- O WhatsApp dispara o lembrete diário apontando para o link B1.
- Inbound parser (resposta numérica direto no WhatsApp) fica para Wave futura.

---

### P003 — Trajetória Integrativa Medicamentosa → DECISÃO

**(a) Normalização de mg:** NÃO usar equivalência farmacológica tabelada
(complexo demais, varia por paciente). Em vez disso, usar **mg absolutos**
de cada substância independentemente. O gráfico mostra 2 séries separadas:
- Série ALOPÁTICO: soma de mg de cada medicamento de farmácia ao longo do tempo.
- Série MAGISTRAL: soma de mg de cada ativo magistral ao longo do tempo.
- Quando há substituição (`substituicao_natural` no REVO), o gráfico mostra
  um marcador vertical pontilhado conectando a queda no alopático com a
  subida no magistral.

Não soma os dois — são séries independentes no mesmo gráfico. O médico
interpreta visualmente: "losartana desceu de 50mg pra 25mg enquanto o
magistral X subiu de 0 pra 25mg".

**(b) Eventos que viram marcadores visuais no gráfico:**
- `TITULACAO` → triângulo amarelo ▲ (ajuste de dose)
- `DESMAME` → seta vermelha para baixo ↓ (redução programada)
- `SUBSTITUICAO` → losango verde ◆ (magistral entrou no lugar)
- `SUSPENSAO` → X vermelho ✕ (parou)
- `RETOMADA` → seta azul para cima ↑ (reiniciou)
- `FALHA_ADESAO` → alerta laranja ⚠ (paciente parou por conta)

**(c) Granularidade temporal:** mensal por default, com zoom automático
para semanal quando o range selecionado for ≤ 90 dias.

**Ação Dr. Replit:**
- Criar endpoint `GET /pacientes/:id/trajetoria-integrativa?de=&ate=`
  que lê de `revo_medicamentos` + `revo_eventos_medicacao` e retorna
  séries temporais normalizadas.
- Criar componente `TrajetoriaIntegrativa.tsx` com Recharts (2 LineChart
  + ScatterChart de eventos sobrepostos).

---

### P004 — Visual Exames Evolução → DECISÃO: (C) dentro do Dashboard

**Aceito a recomendação do Dr. Replit com adição:**

A tabela comparativa (padrão do HTML Patricia) fica DENTRO da aba
"EXAMES EVOLUÇÃO" do Dashboard do Cliente Local. A tela gráfico atual
(`exames-grafico.tsx`) fica como drill-down: clica no nome do exame na
tabela → abre modal/drawer com o gráfico de linha individual daquele
exame ao longo do tempo com bandas min/max.

**Componente novo:** `ExamesEvolucaoTabela.tsx` — implementa o layout
do HTML Patricia:
- Colunas dinâmicas por data de coleta (máximo 5 datas visíveis,
  scroll horizontal se mais).
- Chips coloridos por zona (chip-red ALERTA, chip-orange ATENÇÃO,
  chip-green NORMAL/ÓTIMO, chip-blue MEDIANO, chip-gray sem dado).
- Setas de tendência (↑↑↑ ↑ ↓ ✓ conforme delta%).
- Filtros pill no topo: Todos / 🔴 Alterados / 🟠 Atenção / 🟢 Normais.
- Agrupamento por `grupo_principal` com header colorido.
- Linha ★ destaque para exames com classificação ALERTA persistente
  (≥ 2 coletas consecutivas em ALERTA).
- Coluna Referência com faixa min-max do analito.

**Dados:** o endpoint `GET /pacientes/:id/exames/dashboard` já retorna
tudo necessário. Se faltar a lista de coletas com valores históricos,
criar `GET /pacientes/:id/exames/comparativo?ultimas=5` que retorna
as N últimas coletas por analito com classificação calculada pelo
motor 5 zonas.

---

### P005 — Dashboard Local: rota nova OU aba → DECISÃO: (C) substituir /pacientes/:id

**Aceito a recomendação do Dr. Replit.**

A rota `/pacientes/:id` atual vira o Dashboard do Cliente Local com
4 abas internas. O cockpit tático (`/pacientes/:id/cockpit`) continua
existindo separado como "modo guerra". A hierarquia fica:

```
/pacientes/:id                 → Dashboard Local (4 abas, modo operação)
/pacientes/:id/cockpit         → Cockpit Tático (modo guerra, dark/neon)
/pacientes/:id/exames/vitrine  → Vitrine exames (existente)
/pacientes/:id/monitoramento   → Monitoramento (existente, pode virar redirect pra aba 2)
```

**4 abas do Dashboard Local:**

| # | Aba | Componente | Fonte de dados |
|---|-----|-----------|----------------|
| 1 | IDENTIDADE & QUADRO | `AbaIdentidadeQuadro.tsx` | `pacientes` + `anamnese` + `patologias` + `cirurgias` + `alergias` + `medicacoes` (snapshot inicial) |
| 2 | PULSO DIÁRIO | `PulsoDiario.tsx` | Service layer → `tracking_sintomas` + `monitoramento_sinais_vitais` + `acompanhamento_formula` + `alerta_paciente` |
| 3 | EXAMES EVOLUÇÃO | `ExamesEvolucaoTabela.tsx` | `exames_evolucao` + `analitos_catalogo` + motor 5 zonas |
| 4 | TRAJETÓRIA MEDICAMENTOSA | `TrajetoriaIntegrativa.tsx` | `revo_medicamentos` + `revo_eventos_medicacao` |

**Visual:** respeitar o design system PAWARDS (deep navy `#0B1220`,
neon ciano `#5EE6E6`, JetBrains Mono UPPERCASE, 0px radius) mas com
tom mais "operacional" — fundo levemente mais claro que o cockpit,
mais espaçamento, tipografia mais legível para leitura prolongada
durante consulta.

---

### P006 — Anamnese × Questionário → DECISÃO: fonte única com tipo_evento

**(a) Fonte única:** usar `questionario_master` existente. Adicionar
campo `aplicavel_em` (enum array: `['INICIAL', 'ACOMPANHAMENTO', 'TRIAGEM']`)
para indicar em quais contextos a pergunta aparece.

```sql
-- Migration 079
ALTER TABLE questionario_master
  ADD COLUMN aplicavel_em TEXT[] DEFAULT ARRAY['INICIAL', 'ACOMPANHAMENTO'];
```

**(b) Modelagem do tipo_evento:** enum na tabela de respostas, não tabela
separada. Adicionar à `questionario_respostas`:

```sql
-- Na mesma migration 079
ALTER TABLE questionario_respostas
  ADD COLUMN IF NOT EXISTS tipo_evento TEXT DEFAULT 'ACOMPANHAMENTO'
  CHECK (tipo_evento IN ('INICIAL', 'ACOMPANHAMENTO', 'TRIAGEM'));
```

**(c) Migração dos catálogos divergentes:**
1. Mapear perguntas que existem nos dois catálogos (provavelmente 80%+
   são equivalentes com texto levemente diferente).
2. Unificar para o texto da `questionario_master`, marcar como
   `aplicavel_em = ARRAY['INICIAL', 'ACOMPANHAMENTO']`.
3. Perguntas exclusivas da anamnese (doenças/cirurgias/alergias pesadas)
   → marcar como `aplicavel_em = ARRAY['INICIAL']`.
4. Respostas existentes: NÃO mexer. Adicionar `tipo_evento` com default
   inferido pela data (primeira resposta do paciente = 'INICIAL', demais
   = 'ACOMPANHAMENTO').

**Ação Dr. Replit:** implementar migration 079, depois ajustar as rotas
de questionário para filtrar por `tipo_evento` e `aplicavel_em`.

---

### P007 — Bugs operacionais → DECISÃO

**Concordo:** atacar #4 (paciente órfão GLOBAL) ANTES do Dashboard.
Paciente sem `unidade_id` quebra todos os filtros multi-unidade que o
Dashboard vai usar. É pré-requisito.

**Ordem sugerida:** #4 (crítico, pré-req) → #3 (modal NF, alta) → #2
(número endereço, média). Pode atacar em paralelo com a spec — são
independentes.

---

## PARTE 2 — SCHEMAS E ENDPOINTS

### Migration 078 — Portal Pulso Diário (token paciente)

```sql
-- 078_portal_pulso_diario_token.sql
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS pulso_diario_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS pulso_diario_token_expira_em TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_pacientes_pulso_token
  ON pacientes (pulso_diario_token)
  WHERE pulso_diario_token IS NOT NULL;

COMMENT ON COLUMN pacientes.pulso_diario_token IS
  'Token curto (nanoid 12) para portal web responsivo do Pulso Diário';
```

### Migration 079 — Unificação Questionário

```sql
-- 079_unificacao_questionario_tipo_evento.sql
ALTER TABLE questionario_master
  ADD COLUMN IF NOT EXISTS aplicavel_em TEXT[]
  DEFAULT ARRAY['INICIAL', 'ACOMPANHAMENTO'];

ALTER TABLE questionario_respostas
  ADD COLUMN IF NOT EXISTS tipo_evento TEXT
  DEFAULT 'ACOMPANHAMENTO'
  CHECK (tipo_evento IN ('INICIAL', 'ACOMPANHAMENTO', 'TRIAGEM'));

COMMENT ON COLUMN questionario_master.aplicavel_em IS
  'Contextos onde esta pergunta aparece: INICIAL, ACOMPANHAMENTO, TRIAGEM';
```

### Endpoints novos

| Método | Rota | Descrição | Service |
|--------|------|-----------|---------|
| `GET` | `/pacientes/:id/pulso-diario?de=&ate=` | Retorna DTO unificado com sintomas + sinais vitais + acompanhamento fórmula + alertas | `pulsoDiarioService.buscar()` |
| `POST` | `/pacientes/:id/pulso-diario` | Grava entrada (roteia internamente para tabela correta conforme `tipo: 'sintoma' | 'sinal_vital' | 'formula'`) | `pulsoDiarioService.registrar()` |
| `POST` | `/pacientes/:id/pulso-diario/gerar-token` | Gera nanoid 12 + TTL, grava na tabela pacientes | direto |
| `GET` | `/portal-paciente/pulso/:token` | Página standalone (sem auth JWT, valida token + TTL) | direto |
| `POST` | `/portal-paciente/pulso/:token` | Submit do paciente (valida token, grava com origem=PACIENTE) | `pulsoDiarioService.registrar()` |
| `GET` | `/pacientes/:id/exames/comparativo?ultimas=5` | Retorna N últimas coletas por analito com classificação 5-zonas | motor existente |
| `GET` | `/pacientes/:id/trajetoria-integrativa?de=&ate=` | Séries temporais alopático/magistral + eventos REVO | agregador novo |

---

## PARTE 3 — WIREFRAMES DAS 4 ABAS

### Aba 1: IDENTIDADE & QUADRO CLÍNICO

```
┌─────────────────────────────────────────────────────────────┐
│ LUCIANO PERSSINOTTO · 51a · M · PADC-2026-LUPE-001        │
│ Obj: SONO ENERGIA FOCO EMAGRECIMENTO PERFORMANCE            │
├──────────────────────┬──────────────────────────────────────┤
│ PATOLOGIAS ATIVAS    │ MEDICAÇÕES INICIAIS (snapshot)       │
│ ┌─ CARDÍACAS (16)    │ ┌─ Losartana 50mg 2x/dia            │
│ │  ★ HAS             │ │  Metformina 850mg 2x/dia          │
│ │    Arritmia         │ │  Rosuvastatina 10mg noite          │
│ ├─ METABÓLICAS (16)  │ │  Levotiroxina 25mcg jejum          │
│ │  ★ DM2             │ └────────────────────────────────────│
│ │    Dislipidemia     │ CIRURGIAS (8 grupos)                │
│ │    Hipotireoidismo  │  (colapsável, expandir por grupo)   │
│ ├─ AUTOIMUNES (13)   │                                      │
│ │    Hashimoto        │ ALERGIAS                            │
│ └────────────────────│  (lista simples)                     │
└──────────────────────┴──────────────────────────────────────┘
```

### Aba 2: PULSO DIÁRIO

```
┌──────────────────────────────────────────────────────────────┐
│ PULSO DIÁRIO              [Gerar link paciente] [+ Registro] │
├──────────────────────────────────────────────────────────────┤
│ Hoje 21/mai/2026                                             │
│ ┌────────────────────────────────────────────────────┐       │
│ │ SONO ████████████████████░░░░  7.4/10    ↑ +0.2    │       │
│ │ ENERGIA █████████████████████░  7.8/10   ↑ +0.4    │       │
│ │ FOCO ████████████████████░░░░  7.5/10    ↑ +0.3    │       │
│ │ LIBIDO ████████████░░░░░░░░░  6.3/10     → 0       │       │
│ │ FORÇA ████████████████░░░░░░  7.0/10     ↑ +0.2    │       │
│ └────────────────────────────────────────────────────┘       │
│                                                              │
│ SINAIS VITAIS     07h        12h        18h                  │
│ PA Sistólica      126        124        122                  │
│ PA Diastólica      78         76         74                  │
│ FC                 72         70         68                  │
│ Glicemia           87         —          —                   │
│ Peso              95.4        —          —                   │
│ Cintura           107         —          —                   │
│                                                              │
│ [Gráfico linha do tempo: últimas 4 semanas sono/energia/foco]│
└──────────────────────────────────────────────────────────────┘
```

### Aba 3: EXAMES EVOLUÇÃO

```
┌──────────────────────────────────────────────────────────────┐
│ EXAMES EVOLUÇÃO                                              │
│ [Todos] [🔴 Alterados] [🟠 Atenção] [🟢 Normais]           │
├──────────────────────────────────────────────────────────────┤
│ 🔬 HORMÔNIOS                                                │
│ ────────────────────────────────────────────────────────────│
│ Exame           │ Jul/2025      │ Out/2025     │ Mar/2026   │ Ref(F)        │
│ ★ Prolactina    │ 🔴 46.96 ↑↑  │ 🔴 30.78 ↑  │ 🔴 40.2 ↑↑ │ 2.8–29.2     │
│   FSH           │ 🟢 8.9 ✓     │ — — —        │ 🟢 5.14 ✓  │ 2.5–10.2     │
│   Estradiol     │ 🟢 143.8 ✓   │ 🟢 76.6 ✓   │ 🟢 23 ✓    │ 19.5–144.2   │
│                                                              │
│ 🦋 TIREOIDE                                                 │
│ ────────────────────────────────────────────────────────────│
│ Exame           │ Jul/2025      │ Out/2025     │ Mar/2026   │ Ref          │
│   TSH           │ 🟢 1.85 ✓    │ — — —        │ 🟢 1.40 ✓  │ 0.35–4.94   │
│   T4 Livre      │ 🟢 1.18 ✓    │ — — —        │ 🟢 1.02 ✓  │ 0.75–1.22   │
│                                                              │
│ [Clica no exame → abre drawer com gráfico linha individual] │
└──────────────────────────────────────────────────────────────┘
```

### Aba 4: TRAJETÓRIA MEDICAMENTOSA INTEGRATIVA

```
┌──────────────────────────────────────────────────────────────┐
│ TRAJETÓRIA INTEGRATIVA       [3m] [6m] [1a] [Tudo]          │
├──────────────────────────────────────────────────────────────┤
│ mg                                                           │
│ 50 ──●━━━━━━━━━●━━━━━━━●                                    │
│      │ losartana         ╲  ◆ substituição                   │
│ 25   │                    ●━━━━━━━●━━━━━                     │
│      │                   ╱magistral blend cardio              │
│  0 ──┼─────┼─────┼─────┼─────┼─────┼─────→ tempo            │
│    jan/26 fev   mar   abr   mai   jun                        │
│                                                              │
│ EVENTOS                                                      │
│ ▲ 15/fev — Titulação losartana 50→25mg (PA controlada)      │
│ ◆ 01/mar — Substituição: Blend Cardio 25mg entra            │
│ ↓ 15/abr — Desmame losartana 25→12.5mg (PA estável)         │
│                                                              │
│ RESUMO: 3 alopáticos iniciais → 2 ativos → 1 em desmame     │
│         2 fórmulas magistrais ativas (Blend Cardio + Hepa)   │
└──────────────────────────────────────────────────────────────┘
```

---

## PARTE 4 — REGRAS DE CLASSIFICAÇÃO (transplante da planilha)

O motor `motorClassificacaoIntegrativa.ts` já implementa as 5 zonas.
Confirmo que a semântica está correta e alinhada com a planilha Padcom:

| Zona | Código | Cor | Chip class | Quando |
|------|--------|-----|------------|--------|
| ALERTA_INFERIOR | P001 | Roxo `#7c3aed` | chip-purple | Valor < mínimo |
| INFERIOR | P002 | Amarelo `#eab308` | chip-yellow | Terço 1 (min → min+⅓range) |
| MEDIANO | P003 | Verde `#22c55e` | chip-green | Terço 2 (⅓ → ⅔) |
| SUPERIOR | P004 | Azul `#3b82f6` | chip-blue | Terço 3 (⅔ → max) |
| ALERTA_SUPERIOR | P005 | Vermelho `#ef4444` | chip-red | Valor > máximo |

**Regra `terco_excelente`:** já implementada. Para exames onde "alto é bom"
(testosterona, HDL), SUPERIOR = ótimo. Para exames onde "baixo é bom"
(PCR, LDL), INFERIOR = ótimo. O motor já inverte a semântica via
`terco_excelente: 'SUPERIOR' | 'INFERIOR' | 'MEDIO'`.

**Faixa ideal integrativa:** campo `ideal_integrativo` (ex: "86.0 a 99"
para glicose) vem do `analitos_catalogo`. Exibir como tooltip no chip
quando hover.

---

## PARTE 5 — PLANO DE IMPLEMENTAÇÃO

### Ordem de execução

| # | Tarefa | Depende de | Esforço |
|---|--------|-----------|---------|
| 0 | Bug #4 — paciente órfão GLOBAL (P007) | nada | 1h |
| 1 | Migration 078 — token Pulso Diário | #0 | 15min |
| 2 | Migration 079 — unificação questionário | #0 | 30min |
| 3 | `pulsoDiarioService.ts` + 2 endpoints | #1 | 2h |
| 4 | Página Dashboard Local com shell de 4 abas | #0 | 1h |
| 5 | Aba 1 — Identidade & Quadro | #4 | 2h |
| 6 | Aba 2 — Pulso Diário (componente + portal paciente) | #3, #4 | 3h |
| 7 | Aba 3 — Exames Evolução Tabela | #4 | 3h |
| 8 | Aba 4 — Trajetória Integrativa (endpoint + Recharts) | #4 | 3h |
| 9 | Bug #3 — modal NF | nada | 1h |
| 10 | Bug #2 — número endereço | nada | 30min |

**Total estimado:** ~17h de implementação.

---

## PARTE 6 — PROTOCOLO BIDIRECIONAL

Confirmo o protocolo proposto pelo Dr. Replit:

1. **Dr. Claude escreve specs** em `docs/dr-claude/` (este documento).
2. **Dr. Replit implementa** e registra desvios em `docs/dr-replit/02_DESVIOS_DA_SPEC.md`.
3. **Dr. Replit pergunta** em `docs/dr-replit/03_PERGUNTAS_PRO_DR_CLAUDE.md`.
4. **Dr. Claude responde** aqui ou em novo doc referenciando o número da pergunta.
5. **Git é o canal.** Caio faz push/pull quando necessário.

**Leitura cruzada prioritária:**
- Dr. Replit lê: `docs/dr-claude/18_SPEC_*.md` (este doc)
- Dr. Claude lê: `docs/dr-replit/00_ESTADO_ATUAL_*.md` + `02_DESVIOS_*.md`

---

## ASSINATURA

Spec aprovada por Dr. Claude em 21/mai/2026.
Dr. Replit pode começar a implementar pela ordem da Parte 5.
Primeiro: Bug #4 (paciente órfão), depois migrations 078+079,
depois service layer, depois componentes das 4 abas.

Dúvidas → append em `docs/dr-replit/03_PERGUNTAS_PRO_DR_CLAUDE.md`.
