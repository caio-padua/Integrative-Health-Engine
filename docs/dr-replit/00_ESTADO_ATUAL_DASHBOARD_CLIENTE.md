# 00 — Estado Atual: Dashboard do Cliente (Quadro Local do Médico)

> **Autor:** Dr. Replit · **Data:** 2026-05-21 · **Branch:** `feat/dominio-pawards`
> **Snapshot HEAD:** `028811e` (Update component registration for dashboard and patient modules)
> **Status:** Pré-spec. Aguardando Dr. Claude escrever spec do Pulso Diário e do Dashboard Local antes de eu codar.

## 🎯 Contexto da demanda (Caio, 20/mai/2026 21h–23h)

Caio (CEO + médico integrativo) testou o sistema por 1h e identificou que
falta um **Dashboard do Cliente operacional no quadro local** — uma tela
unificada que o médico da clínica use **enquanto atende o paciente** no
consultório. Hoje existe um "Cockpit" (visual tático guerra), mas falta
o equivalente "operacional do dia a dia" no padrão das planilhas de
referência (Padcom Acompanhamento V15/V16, vide
`docs/dr-claude/05_BRIEFING_PLANILHA_SANDBOX_PACIENTE.md`).

### 4 demandas concretas do Caio (camada A)

1. **Aba IDENTIDADE & QUADRO CLÍNICO** — cadastro do paciente + objetivo +
   patologias + cirurgias + alergias + medicações **iniciais** (vem da
   anamnese inicial, fixo, snapshot).
2. **Aba PULSO DIÁRIO** (nome aprovado por Dr. Claude na conversa de
   20/mai/2026 23h) — tracking diário de sintomas 0-10 (energia, sono,
   foco, libido, força) + sinais vitais (PA, FC, glicemia, peso, cintura)
   em janelas (manhã/tarde/noite). Entrada via paciente (site responsivo
   ou WhatsApp) **e** profissional.
3. **Aba EXAMES EVOLUÇÃO** — tabela comparativa multi-data com classificação
   por **terços** (Roxo=Preocupante <min, Amarelo=Baixo terço 1,
   Verde=Mediano terço 2, Azul=Ótimo terço 3, Vermelho=Alerta >max) +
   filtros por status (Todos / 🔴 Alterados / 🟠 Atenção / 🟢 Normais).
   Referência visual: `attached_assets/exames_patricia_comparativo_*.html`.
4. **Aba MEDICAÇÕES — TRAJETÓRIA INTEGRATIVA** — visão única que mostra:
   medicações de farmácia iniciais → reduções graduais (mg) → fórmulas
   magistrais introduzidas em substituição → descontinuações. Caio frisou:
   *"como médico integrativo, nosso tratamento visa redução de miligramagens
   até retirada total do remédio de farmácia, e inclusão gradativa de
   fórmulas magistrais"*.

---

## ✅ O QUE JÁ EXISTE NO CÓDIGO (auditável via raw GitHub)

### 1. PULSO DIÁRIO — backend 95% pronto sob outro nome

O conceito "Pulso Diário" do Dr. Claude **já existe parcialmente** no banco
como `tracking_sintomas` + `monitoramento_sinais_vitais` + `acompanhamento_formula`
+ `alerta_paciente`. **Decisão necessária:** renomear pra `pulso_diario` ou
manter nomes atuais? Ver pergunta P001.

| Recurso | Arquivo | Raw URL |
|---|---|---|
| Schema `tracking_sintomas` (energia/sono/humor/estresse/foco/libido/força/atividade 0-10 + origem PACIENTE/PROFISSIONAL) | `lib/db/src/schema/monitoramentoPaciente.ts` | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/lib/db/src/schema/monitoramentoPaciente.ts |
| Schema `monitoramento_sinais_vitais` (PA sist/diast, FC, glicemia, peso, cintura, **6 janelas/dia** — bate 1:1 com aba PRESSAO PESO da planilha V16) | `lib/db/src/schema/monitoramentoPaciente.ts` | (mesmo arquivo) |
| Schema `acompanhamento_formula` (aderência + efeito percebido + efeitos colaterais) | `lib/db/src/schema/monitoramentoPaciente.ts` | (mesmo arquivo) |
| Schema `alerta_paciente` (dor aguda, mal-estar, PA alterada — gatilhos automáticos/manuais) | `lib/db/src/schema/monitoramentoPaciente.ts` | (mesmo arquivo) |
| Rotas backend `POST /monitoramento/tracking-sintomas`, `POST /monitoramento/sinais-vitais`, `GET /pacientes/:id/sintomas-grafico` | `artifacts/api-server/src/routes/monitoramentoPaciente.ts` | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/monitoramentoPaciente.ts |
| Tela consolidada de monitoramento (gráficos sintomas + sinais vitais + alertas) | `artifacts/clinica-motor/src/pages/pacientes/monitoramento.tsx` | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/clinica-motor/src/pages/pacientes/monitoramento.tsx |

**Lacunas Pulso Diário:**
- ❌ Sem canal de **entrada pelo paciente** (origem=PACIENTE existe no
  schema mas sem portal web responsivo nem fluxo WhatsApp ativo).
- ❌ Sem **lembrete diário automático** ("oi, como tá sua energia hoje 1-10?").
- ❌ Sem visualização tipo "linha do tempo semanal" (planilha V16 mostra
  4 semanas em colunas — hoje só tem gráfico contínuo).

---

### 2. EXAMES EVOLUÇÃO — backend 100% pronto, falta a UI no padrão Caio

Sistema completo de classificação por terços já implementado (migration 026
do Wave Caio fez exatamente as 5 zonas):

| Recurso | Arquivo | Raw URL |
|---|---|---|
| Schema `exames_base` (catálogo mestre com grupo_principal, diretrizes sexo/idade, flags inflamação/oxidação) | `lib/db/src/schema/examesV4.ts` | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/lib/db/src/schema/examesV4.ts |
| Schema `analitos_catalogo` (com `terco_excelente: SUPERIOR\|INFERIOR\|MEDIO` — define se "alto é bom" ou "alto é ruim" — ex: testosterona vs PCR) | `lib/db/src/schema/examesV4.ts` | (mesmo) |
| Schema `analitos_referencia_laboratorio` (faixas min/max por laboratório, sexo, faixa etária) | `lib/db/src/schema/examesV4.ts` | (mesmo) |
| Schema `exames_evolucao` (histórico, classificação manual+auto, tendência, delta%) | `lib/db/src/schema/cavaloClinical.ts` | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/lib/db/src/schema/cavaloClinical.ts |
| Schema `arquivos_exames` (upload PDF/imagem + flag `processado_com_ocr` + JSONB `valores_extraidos`) | `lib/db/src/schema/cavaloClinical.ts` | (mesmo) |
| Schema `unidades_conversao` (mg/dL ↔ mmol/L) | `lib/db/src/schema/cavaloClinical.ts` | (mesmo) |
| **Motor classificação integrativa** (5 zonas: ALERTA <min, INFERIOR/MÉDIO/SUPERIOR no intervalo, ATENÇÃO >max) | `artifacts/api-server/src/lib/laboratorio/motorClassificacaoIntegrativa.ts` | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/laboratorio/motorClassificacaoIntegrativa.ts |
| Cálculo tendência (SUBINDO/DESCENDO/ESTAVEL, limiar 2%) + delta% | `lib/db/src/schema/cavaloClinical.ts` função `classificarExame` | (mesmo) |
| Migration que cria as 5 zonas "Caio" | `artifacts/api-server/src/db/migrations/026_exames2_5zonas.sql` | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/db/migrations/026_exames2_5zonas.sql |
| Rota `POST /exames/receber` (lançamento manual) + `GET /pacientes/:id/exames/dashboard` (estado atual com semáforo) | `artifacts/api-server/src/routes/examesInteligente.ts` | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/examesInteligente.ts |
| Tela gráficos exames (Recharts, linha do tempo, barras coloridas por zona, comparação média rede/unidade — "Mike Tyson") | `artifacts/clinica-motor/src/pages/pacientes/exames-grafico.tsx` | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/clinica-motor/src/pages/pacientes/exames-grafico.tsx |
| Tela vitrine exames | `artifacts/clinica-motor/src/pages/atendimento/exames/[pacienteId]/vitrine.tsx` | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/clinica-motor/src/pages/atendimento/exames/[pacienteId]/vitrine.tsx |

**Lacuna principal:** o **layout HTML enviado pelo Caio** (`exames_patricia_comparativo`)
tem visual que NÃO existe hoje na UI Pawards:
- Tabela comparativa **multi-data em colunas** (Ago/2025 · Nov/2025 · Abr/2026)
- **Chips coloridos por status** com seta de tendência (↑↑↑ ↑ ↓ ✓)
- **Filtros pill** no topo (Todos / 🔴 Alterados / 🟠 Atenção / 🟢 Normais)
- **Agrupamento por sistema** com header roxo (Hormônios / Tireoide / Ferro-Vitaminas / Inflamação-Metabólico)
- **Linha "destaque"** com ★ para exames críticos persistentes
- Coluna **Referência** ao lado dos valores
- Suporte a `chip-gray "—"` para data sem coleta

**Decisão necessária:** integrar esse layout dentro do `exames-grafico.tsx`
existente (como nova aba) ou criar componente novo `ExamesEvolucaoTabela.tsx`?
Ver P004.

---

### 3. MEDICAÇÕES — TRAJETÓRIA INTEGRATIVA — backend muito sofisticado

Sistema REVO (Registro Evolutivo de Objetivos) já modela exatamente o que
Caio descreveu (titulação, desmame, substituição natural):

| Recurso | Arquivo | Raw URL |
|---|---|---|
| Schema `revo_medicamentos` (ciclo "inicial" → "atual" → "transição") com `data_reducao`, `criterio_reducao`, `substituicao_natural` ← campo explícito que liga fórmula nova ao alopático que ela substitui | `lib/db/src/schema/rasxRevo.ts` | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/lib/db/src/schema/rasxRevo.ts |
| Schema `revo_eventos_medicacao` (timeline de eventos: titulação, desmame, descontinuação) | `lib/db/src/schema/rasxRevo.ts` | (mesmo) |
| Schema `revo_snapshots` (foto do estado da medicação em pontos no tempo) | `lib/db/src/schema/rasxRevo.ts` | (mesmo) |
| Schema `blocos` (agrupamento reutilizável de substâncias+posologia) | `lib/db/src/schema/blocos.ts` | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/lib/db/src/schema/blocos.ts |
| Schema `substancias` (catálogo ativos magistrais) + `itens_terapeuticos` (substância → categoria/indicação) | `lib/db/src/schema/substancias.ts`, `lib/db/src/schema/itensTerapeuticos.ts` | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/lib/db/src/schema/substancias.ts |
| Rotas REVO: `POST /revo/start` (cadastro inicial alopáticos) + `POST /revo/medicamento` (titulação/inclusão) | `artifacts/api-server/src/routes/rasxRevo.ts` | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/rasxRevo.ts |
| Parser de posologia em linguagem natural ("1 cap VO 12/12h" → estruturado) | `lib/posologia/src/parsePosologia.ts` | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/lib/posologia/src/parsePosologia.ts |
| Motor prescrição (consolida itens + protocolos + fórmulas) | `artifacts/api-server/src/services/prescricaoEngine.ts` | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/services/prescricaoEngine.ts |
| Geração receita PDF + assinatura digital | `artifacts/api-server/src/services/emitirPrescricaoService.ts` | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/services/emitirPrescricaoService.ts |
| Painel REVO no cockpit médico ("confirma-ou-corrige" posologias + timeline de eventos) | `artifacts/clinica-motor/src/components/RevoPanel.tsx` | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/clinica-motor/src/components/RevoPanel.tsx |
| Tela prescrição rápida (seleção ágil + montagem fórmulas em tempo real) | `artifacts/clinica-motor/src/pages/prescricao-rapida.tsx` | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/clinica-motor/src/pages/prescricao-rapida.tsx |
| **Admin Conciliação Magistral** ← painel que JÁ relaciona alopático ↔ fórmula magistral substituta | `artifacts/clinica-motor/src/pages/admin-conciliacao-magistral.tsx` | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/clinica-motor/src/pages/admin-conciliacao-magistral.tsx |
| Lembrete prescrição (aderência paciente) | `artifacts/clinica-motor/src/components/LembretePrescricaoPanel.tsx` | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/clinica-motor/src/components/LembretePrescricaoPanel.tsx |

**Lacuna principal:** falta uma **VISUALIZAÇÃO TEMPORAL UNIFICADA**
("trajetória integrativa") que mostre no mesmo gráfico/timeline:
- linha vermelha = mg de alopático ao longo do tempo (descendo)
- linha verde = doses de magistral ao longo do tempo (subindo)
- pontos = eventos de titulação (mg X → mg Y, data Z)
- marcadores = "substituição natural" (fórmula F entrou no lugar do remédio R)

Tudo o que precisa pra desenhar isso JÁ está nas tabelas REVO. É só
endpoint agregador + componente Recharts.

---

### 4. ANAMNESE INICIAL × QUESTIONÁRIO ACOMPANHAMENTO — bug ativo

| Recurso | Arquivo | Raw URL |
|---|---|---|
| Schema `estado_saude_paciente` (snapshot clínico + níveis subjetivos + evolução) | `lib/db/src/schema/questionarioPaciente.ts` | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/lib/db/src/schema/questionarioPaciente.ts |
| Schema `questionario_master` + `questionario_respostas` (catálogo perguntas + respostas paciente) | `lib/db/src/schema/catalogo.ts`, `lib/db/src/schema/questionarioPaciente.ts` | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/lib/db/src/schema/catalogo.ts |
| Rota `GET /pacientes/:id/questionario/perguntas` + `POST /pacientes/:id/estado-saude` | `artifacts/api-server/src/routes/questionarioPaciente.ts` | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/questionarioPaciente.ts |
| Tela questionário (ScaleInput 0-10 pra energia/dor/sono/estresse) | `artifacts/clinica-motor/src/pages/pacientes/questionario.tsx` | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/clinica-motor/src/pages/pacientes/questionario.tsx |
| Tela anamneses (lista global) | `artifacts/clinica-motor/src/pages/anamnese/` (vide print Caio 20/mai) | https://github.com/caio-padua/Integrative-Health-Engine/tree/feat/dominio-pawards/artifacts/clinica-motor/src/pages/anamnese |

**Bug confirmado pelo Caio:** os 2 questionários têm perguntas/respostas
**diferentes** (não compartilham catálogo). A regra dele é:
- **Anamnese inicial** (1ª consulta) = snapshot fixo, dispara motor PADCON, conteúdo "pesado" (doenças/cirurgias/alergias).
- **Questionário acompanhamento** (aba paciente) = repetições ao longo da
  jornada, atrelado a **linha do tempo**, mesmas perguntas com `tipo_evento`
  diferente (INICIAL vs ACOMPANHAMENTO).

**Hoje:** 2 catálogos separados divergiram. **Fix:** unificar fonte de
perguntas, diferenciar só pelo `tipo_evento`. Ver P006.

---

### 5. COCKPIT TÁTICO — base visual disponível pra reaproveitar

| Recurso | Arquivo | Raw URL |
|---|---|---|
| `FichaCockpit` (visual dark/neon, consolidando RAS + alertas + exames + sinais vitais) | `artifacts/clinica-motor/src/components/cockpit/FichaCockpit.tsx` | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/clinica-motor/src/components/cockpit/FichaCockpit.tsx |
| `GpsPadua` (navegador dentro da jornada) | `artifacts/clinica-motor/src/components/cockpit/GpsPadua.tsx` | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/clinica-motor/src/components/cockpit/GpsPadua.tsx |
| Página cockpit paciente | `artifacts/clinica-motor/src/pages/pacientes/cockpit.tsx` | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/clinica-motor/src/pages/pacientes/cockpit.tsx |
| Seletor cockpit (busca tática) | `artifacts/clinica-motor/src/pages/cockpit/index.tsx` | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/clinica-motor/src/pages/cockpit/index.tsx |

**Decisão necessária:** Dashboard do Cliente Local deve ser **rota nova
separada** (`/pacientes/:id/dashboard-local`) ou **aba dentro do cockpit
existente**? Caio sugeriu separação ("modo guerra" vs "modo operação").
Ver P005.

---

## 🧱 Constraints e padrões PAWARDS (Dr. Claude precisa respeitar)

1. **Migrations:** próxima disponível é **078** (071–077 ocupadas, vide
   `replit.md`). Migrations são **append-only**, idempotentes,
   nunca dropam tabela com dado.
2. **Naming:** nomes semânticos completos. Sem abreviação. Campo de perfil
   é **`perfil`** (NUNCA `role`). Booleans com prefixo `pode_` / `nunca_` / `requer_`.
3. **Auditabilidade LGPD:** todo schema novo precisa de `origem`,
   `versao_schema`, `arquivado_em`.
4. **Multi-unidade:** todo recurso de paciente carrega `unidade_id`.
   Filtros respeitam `useClinic()` + `?unidadeId` no frontend.
5. **UI:** deep navy `#0B1220`, neon ciano `#5EE6E6`, JetBrains Mono UPPERCASE,
   border-radius 0px. TDAH-friendly.
6. **Codegen OpenAPI:** rotas novas devem ter Zod schema em `lib/api-spec`
   e rodar `pnpm --filter @workspace/api-spec run codegen` pra gerar
   hooks React Query no frontend.
7. **Testes:** padrão `tsx --test` por arquivo. Hoje 148/150 passando
   (2 falhas pré-existentes em `alertaBruteForceTotp.test.ts` não-relacionadas).

---

## 🔥 Por que NÃO codei nada ainda

Porque já existem **3 tabelas overlapping** (`tracking_sintomas`,
`monitoramento_sinais_vitais`, `estado_saude_paciente`) que cobrem o
mesmo terreno que Dr. Claude propõe pra `pulso_diario`. Codar antes
da spec gera retrabalho ou tabela órfã. Preciso da spec consolidada
do Dr. Claude (ver P001 em `03_PERGUNTAS_PRO_DR_CLAUDE.md`).

---

## 📎 Anexos enviados pelo Caio

| Anexo | Localização local | Propósito |
|---|---|---|
| Planilha Padcom V15 (executiva) | (Google Sheet 1p78XgBE...) | Subset Luciano Perssinotto |
| Planilha Padcom V16 (completa, 17 abas) | (Google Sheet 1G-xknbf...) | Fonte de verdade do modelo Pulso Diário + Exames Evolução |
| `exames_patricia_comparativo_*.html` | `attached_assets/` | Mockup HTML pronto do visual desejado pra aba EXAMES EVOLUÇÃO (com filtros pill, chips coloridos, agrupamento por sistema) |
| Print Patricia | `attached_assets/image_1779326653376.png` | Print rendered do HTML acima |
| Print João Pimpão erro hooks | `attached_assets/image_1779321240857.png` | Bug resolvido em `LembretePrescricaoPanel.tsx` (commit 220d4aa) |
