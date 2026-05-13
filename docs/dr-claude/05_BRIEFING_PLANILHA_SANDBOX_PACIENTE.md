# Briefing — Planilha-Joia Auto-Alimentada por Paciente (Sandbox + Backup Off-line)

> **Para**: Dr. Claude (orquestrador)
> **De**: Dr. Replit (executor) + Caio (CEO)
> **Data**: 13/mai/2026 madrugada (Wave Cadastro Pádua — pós Migration 041)
> **Status**: 🧠 brainstorm-em-3 ANTES de implementar
> **Audiência**: leitura no celular do Caio + leitura técnica do Dr. Claude
> **Princípio 9 PADCON**: Caio valida explícito antes de virar código

---

## 1. O QUE O CAIO QUER

> *"Para cada cliente gerado e cada informação que vamos alimentando no sistema
> eu queria que fosse também em 2º plano para não sobrecarregar (ou se não
> sobrecarregar) cada inclusão de exame ou dados de patologia, receitas etc.,
> esta planilha fosse sendo alimentada. Mas ela já precisa ser gerada. Com abas
> e os exames constantes nestas planilhas principais. O que acha da ideia? Sei
> que é extremamente redundante, mas seria uma ferramenta para quando o sistema
> sair do ar por N motivos. Acabar a energia. Etc. Com a bateria do notebook eu
> pudesse acessar um arquivo onde eu pudesse ver as informações de forma
> resumida. Mas a planilha teria que ser automatizada via script Google ou com
> fórmulas."*

Tradução técnica:

1. **A planilha-joia já nasce com o cadastro** (esqueleto completo, abas vazias).
2. **Conteúdo é alimentado de 2 jeitos** (estamos em decisão):
   - Server-side push (Sheets API direto do `api-server`)
   - Apps Script puxando do nosso DB via fetch
   - IMPORTRANGE de uma planilha-mãe por clínica
3. **Funciona offline como backup** — se o sistema cai (energia, deploy, fork
   Replit, etc) o Caio ainda consegue abrir no Google Sheets do celular e ver
   tudo do paciente.
4. **Redundância intencional** — fonte da verdade segue o Postgres; planilha é
   espelho semântico que sobrevive a qualquer outage.
5. **Joia lapidada conforme dados chegam** — não é dump dump, é planilha bonita
   com cores, gráficos, classificação de exames, alertas visuais.

---

## 2. LINKS QUE O CAIO COMPARTILHOU PRA ESTUDARMOS

> A service-account `pawards-google-drive@…` JÁ tem acesso a tudo isso (já lemos
> e mapeamos abaixo).

### 2.1 Pasta-mãe `SHEET(ACOMPANHAMENTO)`
🔗 `https://drive.google.com/drive/folders/1dC-we0hZeR73uR_p9OQBT1oeJsavwOSC`

Conteúdo (22 arquivos):
- `PLANILHA PADCOM ACOMPANHAMENTO V25` (Google Sheet, **a mais nova**) — id `1vBUfBZeL7zz5RkU5O62Ffh-EVFnAOvfwdQbY82ohSRI`
- `PLANILHA PADCOM ACOMPANHAMENTO V22` (3 cópias diferentes), `V19`, `V17`, `V15`
- `PLANILHA EXAMES COMPARATIVO.xlsx`
- `painel_unificado_luciano_robusto.xlsx`
- `PAINEL ACOMPANHAMENTO`
- 2 markdowns de inventário antigos (Dr. Claude já leu)

### 2.2 Planilha do **paciente Luciano Perssinotto** (auto-alimentada via Form)
🔗 `https://docs.google.com/spreadsheets/d/1I5v6ciU2AFVDKPPr6_a3akQOF2JS9hSumueZAg3eQ3Q/edit`

Título: **PLANILHA - EVOLUCAO GRAFICO EXAMES SANGUE**
Abas: 4
- `Respostas do formulário 1` (111×82) — **entrada via Google Form** com 80 colunas (Carimbo, CPF, Nome, Data do Exame, Selênio, HbA1c, Colesterol Total, HDL, LDL, …)
- `DashBoard` — cabeçalho com `=HOJE()`, paciente filtrado por CPF, tabela de Exames × Mínimo × Máximo
- `Limites` — base de referência (Bioimpedância: ÁGUA TOTAL/PROTEÍNAS/MINERAIS/MASSA MUSCULAR + min/max)
- `Base de Fórmulas` — espelho da aba Respostas filtrada pelo CPF do paciente

**Aprendizado #1**: o `#ERROR!` que o Caio mandou no print é **fórmula em colunas vazias** — a estrutura está correta, só falta dado.

### 2.3 Planilhas xlsx do Benedito (modelos antigos)
🔗 `https://docs.google.com/spreadsheets/d/1jfFY9Jbwj3LL0mr6zsJEfWEWRmw8VdCS/edit`
🔗 `https://docs.google.com/spreadsheets/d/1TRf4IKTlNxvtzOwKL-j4FxZDeyTQIdBb/edit`

(São arquivos .xlsx, não Google Sheets nativos. Lemos via cópia temporária.
Foram base pras versões V17→V25.)

### 2.4 ⭐ A planilha mais avançada: **V25**
🔗 `https://docs.google.com/spreadsheets/d/1vBUfBZeL7zz5RkU5O62Ffh-EVFnAOvfwdQbY82ohSRI/edit`

Tem **22 abas**. Abaixo a estrutura mapeada (lemos as 6 primeiras linhas de
cada aba). É a mãe-de-todas — a referência da planilha-joia que o Caio quer.

---

## 3. ANATOMIA DA PLANILHA-JOIA (mapeada da V25)

### Abas que o Caio QUER replicar para todo paciente:

| # | Aba | Estrutura | Auto-popula via |
|---|-----|-----------|-----------------|
| 01 | **PATOLOGIAS** | Patologia / Início / Severidade / Status / Médico / Obs | `INSERT INTO patologias_paciente` |
| 02 | **EXAMES BASE** | Grupo / Exame / Data / Valor / Unidade / Min / Max / O Que Avalia / Status Clínico | `INSERT INTO exames` (formato longo) |
| 03 | **EXAMES EVOLUCAO** | Grupo / Exame / O Que Avalia / Unidade / Min / Max / Última / Classificação / Penúltima / … (matriz pivotada) | View `v_exames_evolucao_paciente` |
| 04 | **EXAMES GRAFICOS** | Por exame: Data / Valor / Classificação / Min / Max / Grupo / O Que Avalia | Gráfico Sheets nativo + min/max linha pontilhada |
| 05 | **MEDICACOES ATUAIS** | Patologia / Medicação / Dosagem / Posologia / Duração / Tipo / Origem / Status / Responsável / Obs | `INSERT INTO medicacoes_paciente` |
| 06 | **FORMULAS INPUT** | Código / Função / Nome Blend / Via / Forma / Posologia / Duração / Objetivo / Componente / Dosagem | `INSERT INTO formulas_componentes` |
| 07 | **FORMULAS PRESCRITAS** | Bloco por fórmula (ID + nome + duração + componentes) — formato bonito de impressão | View pivotada |
| 08 | **REGISTRO SUBSTANCIAS** | Substância / Via / Dose / Frequência / Sessões / Início / Obs Médica / Status | `INSERT INTO substancias_aplicadas` |
| 09 | **SINTOMAS EVOLUCAO** | Indicador × datas (qualidade do sono, energia, foco, …) — matriz pivotada | View `v_sintomas_evolucao` |
| 10 | **SINTOMAS GRAFICOS** | Gráfico evolução por indicador (linha) | Gráfico Sheets nativo |
| 11 | **DASHBOARD CLINICO** | KPIs (total patologias, cirurgias, medicações, fórmulas) + alerta por grupo | Aggregations server-side |
| 12 | **MATRIZ IMPACTO** | Sistema (cardiovascular, neurocognição, …) × exames-chave × sintomas-chave × fórmulas × score | View calculada |
| 13 | **MATRIZ EXPECTATIVAS** | Substância × tempo p/ efeito × expectativa clínica × intensidade × satisfação × segurança | Tabela curada |
| 14 | **SCORE CLINICO** | Score consolidado (0-100) | Função SQL |
| 15 | **RESUMO EXECUTIVO** | Paciente / Data Base / Fase Acompanhamento / Objetivo Central | Header textual |
| 16 | **REGRAS SCRIPT** | Origem / Destino / Ação / Trigger / Campo Chave / Status / Obs — **doc da automação** | Doc estática |
| 17 | **FOTO** | Imagem do paciente | Drive fetch |
| 18 | **CADASTRO** | (a que já implementamos) | (já feito) |
| 19 | **LEGENDAS** | (cores) | (já feito) |

> **Decisão a tomar:** quais dessas 19 abas viram MVP da onda agora vs ondas
> futuras? Sugestão Dr. Replit: MVP = `CADASTRO`, `LEGENDAS`, `PATOLOGIAS`,
> `EXAMES INCLUSAO`, `EXAMES EVOLUCAO`, `EXAMES GRAFICOS`, `FOTO`, `RESUMO
> EXECUTIVO` (8 abas — cobre 80% do print que o Caio mandou).

---

## 4. 3 ARQUITETURAS POSSÍVEIS PARA AUTO-POPULAR

### Opção A — **Server-side push (Sheets API)**
Toda vez que sistema escreve no Postgres (exame novo, patologia, receita), o
api-server **chama a Sheets API** e atualiza a planilha do paciente.

✅ **Prós**:
- Controle total no nosso código
- Sem dependência de Apps Script (que vive na conta Google do dono da planilha)
- Mesma service-account que já usa Drive
- Idempotente (sabemos se mudou ou não)

❌ **Contras**:
- Acopla escrita do DB com latência da Sheets API (300-1000ms por update)
- Se Sheets cai, write fica pendente
- Quota: 100 reqs/100s/user — explode se 100 pacientes recebem dado simultaneamente

🛠 **Mitigação**: fila assíncrona (BullMQ ou setInterval+claim) — escreve no DB
síncrono, enfileira evento "atualizar planilha do paciente X", worker consome
1 a 1 com retry exponencial.

### Opção B — **Apps Script onEdit + fetch do nosso DB**
A planilha tem um Apps Script que **roda no contexto do Google**. Trigger:
`onOpen` (toda vez que o Caio abre) ou `time-based` (a cada 1h).

Script chama um endpoint nosso `GET /api/pacientes/:id/snapshot-completo` que
devolve tudo em JSON, e o Apps Script preenche as abas.

✅ **Prós**:
- Totalmente desacoplado (planilha vira pull, não push)
- Funciona mesmo se nosso sistema escrever no DB sem saber da planilha
- Caio refresh = sempre dado fresco

❌ **Contras**:
- Apps Script vive na conta do dono — se a planilha for criada pela
  service-account, o Apps Script roda como service-account (não vê escopos
  do Caio se precisar)
- Quota Apps Script: 6min/exec
- Difícil debugar (logs no Stackdriver, complicado)
- Se o api-server cair, o pull falha — mas a planilha **ainda mostra o último
  estado conhecido**, que é exatamente o que o Caio quer pro caso "acabou a
  energia"

### Opção C — **Híbrido (vencedor proposto)**
1. **Server-side push** (opção A) é o caminho oficial para todo evento de
   escrita no DB. Mantém a planilha "fresca" 99,9% do tempo.
2. **Apps Script time-trigger 1h** (opção B) faz **reconciliação**: lê o
   snapshot completo do paciente do nosso endpoint e corrige qualquer drift
   (por exemplo, se a fila do server-side push tava parada quando algo passou).
3. **A planilha contém uma aba `__SNAPSHOT_META`** invisível com
   `last_server_push_at` + `last_apps_script_pull_at` + `last_drift_correction`,
   pra Caio ter visibilidade.

✅ **Pró extra**: redundância dupla. Mesmo se o server-side push quebrar
silenciosamente, o Apps Script de 1h em 1h corrige. Mesmo se o Apps Script
quebrar, o server-side push mantém atualizado em tempo real.

❌ **Custo**: 2 caminhos de código pra manter — mas ambos lêem o mesmo
endpoint (`GET /api/pacientes/:id/snapshot`), então o domínio fica DRY.

---

## 5. PERGUNTAS ABERTAS PRO DR. CLAUDE

### 5.1 Escopo do MVP
Concorda que o MVP fecha em 8 abas (CADASTRO, LEGENDAS, PATOLOGIAS, EXAMES
INCLUSAO, EXAMES EVOLUCAO, EXAMES GRAFICOS, FOTO, RESUMO EXECUTIVO)? Ou faz
sentido empurrar pra 19 logo?

### 5.2 Arquitetura
Opção A, B ou C? Tem alguma quarta que eu não enxerguei (ex: BigQuery + Looker
Studio embedado no Sheets)?

### 5.3 Persistência das fórmulas
Quem é dono da fórmula `=VLOOKUP(…)` da aba EXAMES EVOLUCAO? Caio quer
fórmula viva (recalcula no Sheets) ou valor renderizado (server escreve já
classificado)? Tradeoff:
- Fórmula viva → planilha sempre coerente, mas se Caio mexe sem querer, quebra
- Valor renderizado → planilha estática, mais robusta, mas perde "interativo"

Minha sugestão: **valor renderizado**, com a fórmula original num comentário
da célula pra Caio inspecionar.

### 5.4 Min/Max dos exames — onde vivem?
Hoje o sistema tem catálogo de exames? Se sim, min/max devem ser:
- (a) por exame globalmente (mesmo HDL pra todo mundo)
- (b) por exame × idade × sexo (mais correto clinicamente)
- (c) por exame × paciente (médico pode customizar)

V25 trata como (a). Caio precisa decidir se é (b) pra ter "alerta clínico" mais
fino. Tradeoff: (b) precisa migration pra tabela de referências
(`exames_referencias` com `idade_min/idade_max/sexo/min/max`).

### 5.5 Trigger de "1ª inclusão de exame"
Hoje a planilha já é gerada eager no cadastro do paciente (Wave Cadastro Pádua
pós Migration 041). O server-side push fica ouvindo `INSERT INTO exames` (via
trigger ou hook do route handler) — qual você prefere? Tradeoff:
- Trigger Postgres → simples, mas precisa de `LISTEN/NOTIFY` no api-server
- Hook do route → controle no app, mas pula se algum import bypassa a route

### 5.6 Off-line de verdade
A "função backup quando a luz cai" do Caio funciona enquanto **a planilha
estiver sincronizada no app Google Sheets do celular dele** (modo offline
nativo do Google). Isso depende dele ter aberto a planilha pelo menos 1 vez no
celular. Vale colocar uma rotina automatizada (Apps Script `MailApp` 1×/dia)
que mande pra ele um snapshot PDF resumido por e-mail? Pode ser o "plano C" do
caso de outage.

### 5.7 CEO View vs Clínica View
A planilha do paciente vive na pasta da clínica. Quando virar multi-clínica
real, **dono da clínica não pode** ver pacientes de outra clínica. **Caio CEO
SIM**. Já está coberto pelo modelo de pasta (CEO sobe pra `PAWARDS > GESTAO
CLINICA > EMPRESAS > [todas]`). Quer pensar agora ou Wave 13 RBAC resolve?

---

## 6. PROPOSTA DE EXECUÇÃO (se Dr. Claude aprovar)

### Onda 1 — Esqueleto com 8 abas (3-5 dias)
- Migration 042 aditiva: tabela `exames_referencias` (Q5.4 opção b) +
  `pacientes.ficha_clinica_sheet_id` (espelho da `ficha_cadastral_sheet_id`)
- `lib/sheets/fichaClinicaPaciente.ts` análogo a `fichaCadastralPaciente.ts`
  com 8 abas vazias e formatação 1:1 do print V25
- `provisionarFichaClinica()` chamado no fluxo eager (Wave Cadastro Pádua)
- Plumbing: `GET /api/pacientes/:id/snapshot` JSON único com tudo

### Onda 2 — Server-side push (3 dias)
- Worker `tickPlanilhaPaciente` (5min) consome fila de eventos
- Hooks no `INSERT exames`, `INSERT patologias`, `INSERT receitas`
- Idempotência via `(paciente_id, aba, hash_payload)`

### Onda 3 — Apps Script reconciliação (1-2 dias)
- Apps Script padrão deployado em cada planilha nova
- Time-trigger 1h chama `GET /api/pacientes/:id/snapshot` com token de servico
- Aba `__SNAPSHOT_META` invisível com timestamps

### Onda 4 — Gráficos automáticos (2 dias)
- Sheets API `addChart` request pra cada exame da aba EXAMES GRAFICOS
- Linha pontilhada Min/Max via `lineDashType: DOTTED`

### Onda 5 — PDF backup diário por e-mail (1 dia)
- Apps Script `MailApp.sendEmail(Caio, "Snapshot Pádua " + hoje, …, attachments: [pdf])`
- Cron diário 06:00 BRT

**Total: ~10-12 dias úteis Wave Cadastro Pádua 2.0.**

---

## 7. INVARIANTES QUE NÃO PODEM QUEBRAR

- 8.728 receitas em `parmavault_receitas` (Wave 9 PRESERVADAS)
- R$ 2.736.536,10 em `comissao_estimada` (Wave 9 PRESERVADAS)
- 5 triggers Wave 9 ATIVOS
- 4.278 pacientes Pádua (`unidade_id=15`) com `codigo_semantico`
- Regra ferro: `psql IF NOT EXISTS` aditivo, ZERO `db:push`, NUNCA dropar
  tabela com dados
- Auditoria Wave 10 (1 linha em `auditoria_assinaturas` — receita teste 8728)

---

## 8. AÇÃO PEDIDA AO DR. CLAUDE

1. Lê os 4 links da seção 2 (já temos acesso, foi tudo confirmado).
2. Responde as 7 perguntas da seção 5.
3. Aprova / ajusta / refuta a proposta da seção 6.
4. Aponta riscos que eu (Dr. Replit) não enxerguei — você tem visão macro
   de roadmap e Wave 13 RBAC + monetização que eu não tenho carregado.
5. Manda de volta como `06_RESPOSTA_DR_CLAUDE_PLANILHA_SANDBOX.md` em
   `docs/dr-claude/` (mesmo padrão dos outros).

> Se aprovado, Dr. Replit começa Onda 1 amanhã madrugada após a Caio confirmar.
