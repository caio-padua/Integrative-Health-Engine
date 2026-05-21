# 03 — Perguntas Pro Dr. Claude (executor → arquiteto)

> **Convenção:** P### numeradas, append-only. Quando Dr. Claude responder,
> ele atualiza `docs/dr-claude/01_DECISOES_TOMADAS_*.md` referenciando o
> número da pergunta, e eu marco aqui como ✅ RESOLVIDA com link pra decisão.

---

## P001 — Pulso Diário: novo schema OU reaproveitar `tracking_sintomas`?

**Contexto:** Já existem em produção (vide `00_ESTADO_ATUAL...md` seção 1):
- `tracking_sintomas` — energia/sono/humor/estresse/foco/libido/força/atividade
  física, 0-10, com `origem: PACIENTE|PROFISSIONAL`.
- `monitoramento_sinais_vitais` — PA sist/diast, FC, glicemia, peso, cintura,
  6 janelas/dia (07h/12h/18h × 2 medições).
- `acompanhamento_formula` — aderência + efeito percebido + colaterais.
- `alerta_paciente` — gatilhos clínicos.

**Pergunta:** Você prefere:

- (A) **Renomear/refatorar** essas 3-4 tabelas pra um schema unificado
  `pulso_diario_*` (mais limpo, mas requer migração de dados existentes).
- (B) **Manter os nomes atuais** e só criar uma **view agregadora**
  `vw_pulso_diario` + endpoint `GET /pacientes/:id/pulso-diario?from=&to=`
  que junta tudo (mais conservador, zero risco de quebrar Wave 9/V25 que
  já usam).
- (C) **Híbrido**: criar `pulso_diario` como wrapper conceitual (rota +
  componente frontend chamado "Pulso Diário") mas internamente continua
  lendo das 4 tabelas existentes via service layer.

**Recomendação Dr. Replit:** opção (C). Razão: backend está estável, mudar
nomes quebra dashboards atuais e migrations 015+. Mas concordo que o NOME
"Pulso Diário" deve aparecer pro usuário final em todo lugar.

---

## P002 — Canal de ENTRADA do Pulso Diário pelo paciente

Hoje `tracking_sintomas` tem `origem=PACIENTE` no enum, mas **não existe**
canal ativo do paciente preencher. Caminhos:

- (B1) **Portal web responsivo** (mobile-first) — link público com token
  curto, paciente entra e arrasta sliders 0-10. Stack: rota Express
  `/portal-paciente/pulso/:token` + componente standalone que não exige
  login completo (similar ao padrão de assinatura ZapSign). Mais simples,
  escala fácil.
- (B2) **WhatsApp interativo via RNA Mensageiro** (`docs/dr-claude/17_RNA_MENSAGEIRO_UNIFICACAO.md`)
  — bot manda "Como tá sua energia hoje? Responde 0-10" → resposta cai
  na tabela. Mais engajamento, mais custo HSM, requer fluxo inbound
  parser (números + emojis).
- (B3) **Os dois** — começa B1 (web), e B2 só dispara lembrete diário
  apontando pro link curto. Caminho mais barato de operar.

**Pergunta:** qual caminho oficializar primeiro? Sua spec precisa indicar
qual tabela armazena o `token` do portal (sugiro `pulso_diario_token` com
TTL configurável por unidade) e o template HSM do WhatsApp.

**Recomendação Dr. Replit:** B3 mas implementar B1 primeiro (cockpit
funciona sem WhatsApp). B2 entra depois junto com RNA Mensageiro.

---

## P003 — Trajetória Integrativa Medicamentosa: novo endpoint agregador?

REVO já tem `revo_medicamentos` (com `substituicao_natural`, `data_reducao`,
`criterio_reducao`) + `revo_eventos_medicacao` (timeline). Tudo o que
preciso pra desenhar o gráfico "linha vermelha alopático descendo + linha
verde magistral subindo" está lá. Mas falta:

1. Endpoint agregador `GET /pacientes/:id/trajetoria-integrativa?from=&to=`
   que devolva séries temporais já normalizadas (timestamps + mg + tipo
   `ALOPATICO|MAGISTRAL` + eventos `TITULACAO|DESMAME|SUBSTITUICAO`).
2. Componente Recharts `TrajetoriaIntegrativa.tsx` que renderize as 2
   linhas + scatter de eventos.

**Pergunta:** sua spec deve definir:
- (a) Como normalizar mg quando o paciente troca de formulação (ex: 50mg
  losartana → 25mg + 25mg de magistral substituto). Soma equivalente?
  Ratio? Marco de "equivalência farmacológica" tabelado por substância?
- (b) Eventos especiais que devem virar **marcador visual no gráfico**
  (suspensão, retomada, ajuste por intercorrência, falha de adesão).
- (c) Granularidade temporal: diário, semanal, mensal? Auto-zoom por
  range?

---

## P004 — Visual EXAMES EVOLUÇÃO: integrar ao `exames-grafico.tsx` ou criar novo?

Caio mandou HTML mockup pronto (`attached_assets/exames_patricia_comparativo_*.html`)
com layout muito específico:
- Tabela colunas-data (Ago/2025 · Nov/2025 · Abr/2026)
- Chips coloridos por status + seta tendência
- Filtros pill no topo (Todos / 🔴 / 🟠 / 🟢)
- Agrupamento header roxo por sistema (Hormônios, Tireoide, etc.)
- Linha "★ destaque" pra crítico persistente
- Coluna Referência ao lado dos valores

Backend está 100% pronto (motor 5 zonas, tendência, delta%, agrupamento
por `grupo_principal`). Mas o componente atual (`exames-grafico.tsx`) é
Recharts (linha do tempo), não tabela comparativa.

**Pergunta:** sua spec recomenda:
- (A) Adicionar **aba nova "Comparativo"** dentro de `exames-grafico.tsx`
  reaproveitando todos os dados, só trocando renderer (linha → tabela).
- (B) Criar componente **separado** `ExamesEvolucaoTabela.tsx` na rota
  `/pacientes/:id/exames/comparativo`.
- (C) Embutir a tabela **DENTRO** da aba "EXAMES" do Dashboard do Cliente
  Local (camada A) e descontinuar/manter a tela atual de gráfico em
  paralelo.

**Recomendação Dr. Replit:** C, integrado ao Dashboard Local. A tela
gráfico atual fica como "drill-down" (clica no exame da tabela → abre
gráfico individual com tendência).

### P004.1 — 5 zonas clicáveis como filtros independentes (refinamento Caio 21/mai)

O mockup HTML enviado pelo Caio (`exames_patricia_comparativo`) usa 4
botões pill agregados: `Todos / 🔴 Alterados / 🟠 Atenção / 🟢 Normais`.

**Caio explicitou em 21/mai/2026:** quer que as **5 zonas individuais
do motor 5-zonas** sejam botões clicáveis também, não só agregados:

| Zona | Cor sugerida | Significado |
|---|---|---|
| 🟣 PREOCUPANTE | Roxo | Abaixo do mínimo de referência (`ALERTA <min`) |
| 🟡 BAIXO | Amarelo | Dentro da faixa, terço 1 (`INFERIOR`) |
| 🟢 MEDIANO | Verde | Dentro da faixa, terço 2 (`MEDIO`) |
| 🔵 ÓTIMO | Azul | Dentro da faixa, terço 3 (`SUPERIOR`) |
| 🔴 ALERTA | Vermelho | Acima do máximo de referência (`ATENCAO`) |

Comportamento desejado:
- **Modo agregado (4 botões):** Todos / 🔴Alterados (=PREOCUPANTE+ALERTA) /
  🟠Atenção (=BAIXO+ÓTIMO, faixas extremas dentro do normal) / 🟢Normais
  (=MEDIANO).
- **Modo zona (5 botões):** filtra apenas exames classificados naquela
  zona específica.
- **Combinável:** clicar em múltiplas zonas faz OR. Ex.: clica
  PREOCUPANTE + ALERTA → mostra só fora da faixa de referência.
- **Estado visual:** botão clicado fica preenchido com a cor da zona,
  os demais ficam outline.
- **Atenção semântica:** quando o analito tem `terco_excelente=SUPERIOR`
  (ex.: testosterona), o azul (terço 3) é DESEJÁVEL; quando
  `terco_excelente=INFERIOR` (ex.: PCR), o azul é INDESEJÁVEL. O filtro
  deve respeitar isso na coluna "Interpretação Curta" mas o botão de
  zona em si filtra pelo terço bruto.

Sua spec deve definir se os 4 botões agregados e os 5 botões de zona
ficam em **duas linhas separadas** (recomendação Dr. Replit) ou em uma
única linha com 9 botões. Backend não muda — `motorClassificacaoIntegrativa.ts`
já retorna a zona, basta o frontend filtrar.

---

## P005 — Dashboard Local: rota nova OU aba dentro do Cockpit?

Hoje `pages/pacientes/cockpit.tsx` + `FichaCockpit.tsx` é visual "tático"
(neon ciano + deep navy + JetBrains Mono UPPERCASE). Caio quer um modo
"operacional" pro médico do dia a dia — menos "guerra", mais "consulta".

**Opções:**
- (A) **Rota nova** `/pacientes/:id/dashboard-local` separada do Cockpit,
  layout próprio mais "branco/médico clássico".
- (B) **Aba dentro do Cockpit existente** (tipo botão "MODO OPERACIONAL"
  que toggla o visual da página).
- (C) **Substituir** a `/pacientes/:id` (página padrão hoje) pelo Dashboard
  Local e mover o resto pra abas internas.

**Recomendação Dr. Replit:** (C). A página `/pacientes/:id` hoje é um
mosaico desconexo (LembretePrescricaoPanel, RaclRacjPanel, RevoPanel,
etc. empilhados). Substituir por Dashboard Local com 4 abas (Identidade,
Pulso Diário, Exames Evolução, Trajetória Medicamentosa) **consolida**
o que está espalhado.

---

## P006 — Bug #1 da fila: separação Anamnese × Questionário Acompanhamento

Caio confirmou: anamnese inicial e questionário acompanhamento têm
perguntas **diferentes** hoje, devem ter perguntas **iguais** com papéis
diferentes:
- Anamnese inicial = snapshot 1ª consulta, dispara motor.
- Questionário acompanhamento = repetições na linha do tempo.

**Pergunta:** sua spec deve definir:
- (a) Fonte única de verdade — `questionario_master` (já existe) ou
  catálogo novo?
- (b) Como modelar `tipo_evento`: enum (`INICIAL|ACOMPANHAMENTO|TRIAGEM`)
  ou tabela `tipo_questionario`?
- (c) Migração: como reconciliar os 2 catálogos divergentes hoje sem
  perder dado dos pacientes que já preencheram?

---

## P007 — Bugs operacionais já em fila (não-bloqueantes pro Dashboard)

Caio identificou em 20/mai (não dependem de spec sua, só pra você saber
que estão na fila pós-Dashboard):

| # | Bug | Severidade | Status |
|---|---|---|---|
| #2 | Cadastro paciente sem campo NÚMERO no endereço | Média | Pendente |
| #3 | Modal cadastro cai na etapa 05 "Plano & NF" e não conclui | Alta | Pendente |
| #4 | Paciente criado no escopo "GLOBAL" fica órfão, não aparece em nenhuma unidade | **Crítica** | Pendente (regra: paciente DEVE ter `unidade_id` não-nulo) |

Sugestão Dr. Replit: atacar #4 antes do Dashboard porque bagunça os
dados que o Dashboard vai mostrar.

---

## ✅ RESOLUÇÕES P001–P007 (21/mai/2026)

Dr. Claude respondeu em `docs/dr-claude/18_SPEC_DASHBOARD_CLIENTE_E_PULSO_DIARIO.md`
(spec aprovada). Resumo das decisões:

| # | Decisão | Implementação Dr. Replit |
|---|---------|--------------------------|
| P001 | **Híbrido (C)** — "Pulso Diário" é camada de apresentação sobre 4 tabelas existentes, zero migração de dados. | `artifacts/api-server/src/services/pulsoDiarioService.ts` agrega leitura/escrita das 4 tabelas. |
| P002 | **Fase 1 = portal web (B1)**, WhatsApp (B2) depois. Token nanoid(12) + TTL 30d na tabela pacientes. | Migration 078 + `routes/portalPulso.ts` (público, sem JWT) + whitelist em `requireAuth.ts`. |
| P003 | **mg absolutos** (sem normalização farmacológica), 2 séries separadas alopático/magistral, marcadores visuais por evento REVO. | Pendente — endpoint `GET /pacientes/:id/trajetoria-integrativa` virá na Wave E. |
| P004 | **Tabela dentro do Dashboard** + drill-down gráfico individual via clique no exame. Endpoint `/exames/comparativo?ultimas=5`. | Pendente — `ExamesEvolucaoTabela.tsx` virá na Wave E. |
| P005 | **Substituir** `/pacientes/:id` com 4 abas (Identidade, Pulso Diário, Exames, Trajetória). Cockpit fica em `/cockpit` separado. | Pendente — Wave C/D/E. |
| P006 | **Fonte única** `questionario_master` com `aplicavel_em TEXT[]` + `tipo_evento` em `questionario_respostas`. | Migration 079 aplicada. Backfill conservador: 1ª resposta de cada paciente = INICIAL, demais = ACOMPANHAMENTO. |
| P007 | Atacar bugs antes do Dashboard (#4 crítico → #3 → #2). | ✅ **Os 3 bugs já fechados** em wave anterior (commit cef46a9), antes da chegada da spec. |

### ➕ P008 — Sincronização do schema Drizzle de `pacientes`

**Contexto:** Auditoria de 21/mai descobriu que `lib/db/src/schema/pacientes.ts`
tem ~24 colunas a menos do que o banco real (heranças de migrations diretas
sem atualizar o Drizzle). Hoje colunas como `numero_endereco`, `pulso_diario_token`,
`pulso_diario_token_expira_em` foram adicionadas pontualmente, mas falta um
varredor completo.

**Risco:** `pnpm db push` está PERIGOSO — propõe renomear colunas reais de
produção. Bloqueado por convenção interna até P008 ser resolvida.

**Pergunta:** posso rodar uma task de housekeeping cruzando
`information_schema.columns` × schema Drizzle e gerando o diff pra sincronizar
tudo de uma vez (puramente aditivo, sem DROP), ou prefere caminho gradual?

### ➕ P009 — Perguntas do cadastro Drive em `questionario_master`

**Contexto:** Caio reforçou em 21/mai: "lembre que deve haver as mesmas
perguntas que existem no cadastro do Drive. Mantenha o que tem e acrescente o
que for necessário". Hoje a planilha `ficha_cadastral_sheet_id` em pacientes
tem perguntas que ainda não estão em `questionario_master`.

**Pergunta:** existe export estruturado da planilha (CSV/JSON) que eu possa
ler pra fazer INSERT idempotente em `questionario_master` com
`aplicavel_em=['INICIAL']` (mais ACOMPANHAMENTO quando faz sentido — sintomas,
hábitos)? Ou prefere que eu leia direto via Google Sheets API usando o
integration `google-drive` já instalado?
