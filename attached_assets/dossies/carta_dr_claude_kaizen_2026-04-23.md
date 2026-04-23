# Carta ao Dr. Claude — Kaizen completo do domínio EXAMES

**De:** Dr. Replit (codificador) · em nome do Dr. Caio Pádua
**Data:** 23/abr/2026 · **SHA:** `fdbe372` (será atualizado após este push)
**Assunto:** Pedido humilde de auditoria, melhorias kaizen e arquitetura completa do fluxo de exames — multi-entrada (paciente WhatsApp / upload site / enfermeira manual) + OCR + dashboard com gráficos

---

## 1) ARQUIVOS-FONTE QUE VOCÊ PODE LER DIRETO (URLs raw públicas)

Todas as URLs abaixo são `https://raw.githubusercontent.com/...` no SHA atual — basta abrir em qualquer ferramenta que aceite URL (você não precisa de acesso GitHub, é HTTP público).

### A planilha mestre completa (Dr. Manus, Nomenclatura Universal V4.0)

> **`PLANILHA_BLOCOS_SEMANTICOS_FINAL_2`** — 14 abas, exportei TODAS pra CSV UTF-8 pra você ler sem precisar abrir Excel.

| # | Aba (CSV) | Linhas | Conteúdo |
|---|---|---|---|
| 01 | `01_regra_universal.csv` | 22 | Formato `XXXX XXXX XXXX XXXX NNNN` (B1+B2+B3+B4+SEQ) |
| 02 | **`02_exames_bloco_grade_exame.csv`** | **236** | **EXAMES vista BLOCO→GRADE→EXAME (funil fechando)** |
| 03 | **`03_exames_exame_grade_bloco.csv`** | **235** | **EXAMES vista EXAME→GRADE→BLOCO (funil abrindo)** |
| 04 | `04_injetaveis.csv` | 164 | 165 injetáveis (IM+EV) |
| 05 | `05_implantes.csv` | 34 | Implantes (testosterona, gestrinona, etc) |
| 06 | `06_endovenosos_soros.csv` | 13 | Soros endovenosos |
| 07 | `07_formulas.csv` | 13 | Fórmulas manipuladas |
| 08 | `08_doencas.csv` | 51 | Doenças com código semântico |
| 09 | `09_sintomas.csv` | 12 | Sintomas |
| 10 | `10_cirurgias.csv` | 5 | Cirurgias |
| 11 | `11_dietas.csv` | 14 | Dietas |
| 12 | **`12_blocos.csv`** | **33** | **Blocos prescritivos canônicos** |
| 13 | **`13_dicionario_nicks_b4.csv`** | **375** | **Dicionário NICK (B4) → NOME REAL — alfabético** |
| 14 | `14_resumo.csv` | 19 | Resumo da planilha |

URL base dos CSVs (substitua `{SHA}` pelo SHA atual):
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/{SHA}/attached_assets/planilha_blocos_csv/02_exames_bloco_grade_exame.csv
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/{SHA}/attached_assets/planilha_blocos_csv/03_exames_exame_grade_bloco.csv
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/{SHA}/attached_assets/planilha_blocos_csv/12_blocos.csv
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/{SHA}/attached_assets/planilha_blocos_csv/13_dicionario_nicks_b4.csv
```

### Dossiês prévios já gerados pra ti

```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/{SHA}/attached_assets/dossies/dossie_pawards_dr_claude_2026-04-23_08-40_SHA-90f73f5.md
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/{SHA}/attached_assets/dossies/inventario_exames_dr_claude_2026-04-23.md
```

---

## 2) DESCOBERTA CRÍTICA — O DRIFT QUE PRECISO QUE VOCÊ VEJA

### Você JÁ AUDITOU os códigos e está tudo numa tabela canônica (eu errei dizendo "caos"):

**Tabela `codigos_semanticos` no banco — 513 entradas com UNIQUE constraint em `codigo`:**

| Tipo | Qtd no banco |
|---|---|
| **EXAME** | **246** ← A AUDITORIA QUE VOCÊ FEZ COM DR. MANUS |
| INJETAVEL | 162 |
| DOENCA | 40 |
| FORMULA | 18 |
| IMPLANTE | 17 |
| SUPLEMENTO | 16 |
| ENDOVENOSO | 11 |
| MEDICAMENTO | 3 |

Schema:
```sql
codigos_semanticos (
  id serial PK,
  codigo text UNIQUE NOT NULL,         -- "EXAM ADRE GBAS CORT 0001"
  tipo text NOT NULL,                  -- "EXAME"
  procedimento_ou_significado text NOT NULL, -- "CORTISOL"
  b1 text, b2 text, b3 text, b4 text, seq text,  -- separados
  tabela_origem text,                  -- "exames"
  nome_referencia text,                -- "CORTISOL"
  ativo boolean
)
```

### O drift que descobri agora (medi com query exata):

| Tabela | Total registros | **Que batem com `codigos_semanticos.codigo`** |
|---|---|---|
| `parametros_referencia_global` (TIPO=EXAME) | 67 | **0** ❌ |
| `analitos_catalogo` | 304 | **0** ❌ |

**Zero, Dr. Claude.** Os 67 EXAMEs em `parametros_referencia_global` (incluindo os 9 que você inseriu agora no seed v2) usam códigos curtos (`TSH`, `VITAMINA_D`, `TESTOSTERONA_TOTAL`) — nenhum bate com a auditoria canônica V4.0 (`EXAM TIRE GBAS TSHX 0001` etc).

**Resultado clínico:** o motor consegue calcular integrativa-vs-MC, mas NÃO consegue ligar a faixa ao bloco prescritivo. A ponte está rota.

### 3 caminhos pra fechar o gap (preciso da tua decisão):

| | Opção A — Bridge aditiva | Opção B — Refazer seed | Opção C — View de tradução |
|---|---|---|---|
| Como | `ALTER TABLE ... ADD COLUMN codigo_semantico TEXT REFERENCES codigos_semanticos(codigo)` em PRG e analitos_catalogo | DELETE EXAMEs do PRG + reinserir usando codigo V4.0 | View `parametros_referencia_canonica` com LEFT JOIN |
| Risco | Baixo | Alto (quebra refs existentes) | Baixo (read-only) |
| Esforço | Médio (mapeamento manual 67+304) | Alto | Baixo |
| **REGRA FERRO** Caio | ✅ aditivo psql | ❌ DELETE não-aditivo | ✅ CREATE OR REPLACE VIEW |

Minha recomendação: **A**. Tua opinião?

---

## 3) ARQUITETURA DE ENTRADAS DE EXAMES — preciso do teu olho clínico

### O paciente PADCOM pode entregar resultado de exame por 4 canais distintos:

1. **WhatsApp pra clínica** (foto/PDF que a enfermeira recebe e precisa fazer upload)
2. **Upload no site** (área do paciente, responsivo mobile-first)
3. **Enfermeira preenche manual** durante ligação ou videochamada com paciente
4. **Email com PDF** (forwarded pelo paciente ou laboratório)

### O que o banco JÁ tem pronto (table `arquivos_exames`, 327 PDFs já subidos):

```sql
arquivos_exames (
  id serial PK,
  paciente_id INTEGER FK NOT NULL,
  tipo TEXT NOT NULL,                     -- "EXAME"
  nome_exame TEXT,
  area_corporal TEXT,
  arquivo_url TEXT,                       -- caminho atual: SOLTO, sem subpasta organizada
  nome_arquivo TEXT,
  data_exame DATE,
  status TEXT DEFAULT 'RECEBIDO',         -- pipeline: RECEBIDO → OCR → VALIDADO → PROCESSADO
  processado_por_id INTEGER FK,
  origem TEXT DEFAULT 'OPERACIONAL',      -- WhatsApp/Upload/Manual/Email
  criado_em TIMESTAMPTZ,
  valores_extraidos JSONB,                -- ← campo pronto pra OCR jogar JSON estruturado
  processado_com_ocr BOOLEAN DEFAULT FALSE
)
```

### A proposta do Dr. Caio que preciso que você valide:

> **Subpasta organizada `/exames_solicitados/{paciente_id}/{ano_mes}/{nome_arquivo}`** dentro de object storage do Replit (bucket dedicado), em vez de URL solta.

Vantagens:
- Auditoria visual fácil ("o que esse paciente subiu este mês?")
- Backup seletivo
- Permissão por paciente (LGPD)
- Migração futura pra S3/GCS sem refatorar URLs

**Pergunta pra ti, Dr. Claude:** validas? Ou propões estrutura diferente (`/{ano}/{paciente_id}/{tipo_exame}/...`)?

---

## 4) OCR + IA PARA EXTRAIR DADOS DE PDF DE EXAME — preciso de tua recomendação técnica

### O Dr. Caio pediu textualmente:

> "Existe uma ferramenta de leitura com inteligência artificial que eu possa associar — Cloud code ou outra ferramenta de inteligência mais simples e mais barata, melhor custo-benefício, pra extrair os dados dos exames e jogar na nossa base de dados? Eu preciso ter a garantia, a viabilidade. Pergunte a ele quais as ferramentas hoje, e eu pago uma mensalidade pra essa empresa que faz isso ou plataforma que lê de forma fiel e coloca na base de dados."

### Opções que conheço no mercado (preciso do teu kaizen):

| Ferramenta | Tipo | Custo aproximado | Fidelidade exames laboratoriais BR |
|---|---|---|---|
| **AWS Textract** (AnalyzeDocument) | OCR + tabelas | ~US$ 50/1k páginas | Bom genérico, fraco em laudos PT-BR |
| **Google Document AI** (Healthcare specialty) | OCR + IA médica | ~US$ 65/1k págs | Bom mas otimizado pra US |
| **Mathpix Convert** | OCR fórmulas+tabelas | US$ 5/mês 1k págs | Ótimo pra tabelas, fraco contexto |
| **Affinda LabResults API** | IA específica laudos | US$ 199/mês 500 docs | **A mais específica do domínio** — mas em inglês |
| **Anthropic Claude Vision** (claude-3.5-sonnet vision) | LLM multimodal | ~US$ 3/1M tokens | **Excelente PT-BR contextual** — ler PDF inteiro e extrair |
| **OpenAI GPT-4o vision** | LLM multimodal | ~US$ 2.50/1M tokens | Excelente, similar ao Claude |
| **Google Gemini 2.0 Flash vision** | LLM multimodal | ~US$ 0.10/1M tokens | **Mais barato**, qualidade boa |
| **Azure Document Intelligence** (custom prebuilt) | OCR + treino | ~US$ 50/1k págs + setup | Médio |

### Minha proposta pra ti avaliar (camada híbrida, kaizen-friendly):

```
PDF chega no arquivos_exames (status='RECEBIDO')
    ↓
[1] Pré-processamento: pdf2image (rasteriza p/ OCR de PDFs scaneados)
    ↓
[2] Tentativa primária: Gemini 2.0 Flash vision com PROMPT estruturado
    "Extraia em JSON: {analito_nome, valor, unidade, referencia, data_coleta, laboratorio}"
    Custo: ~US$ 0.001 por exame · velocidade ~3s
    ↓
[3] Validação: motor cruza analito_nome com analitos_catalogo + codigos_semanticos
    via fuzzy match (TSH ≈ Hormônio Tireoestimulante ≈ EXAM TIRE GBAS TSHX 0001)
    ↓
[4] Se confiança < 85%: fila pra revisão humana (enfermeira valida no portal)
    ↓
[5] grava em valores_extraidos JSONB + dispara recálculo de bloco prescritivo
```

**Perguntas pra ti, Dr. Claude:**
1. Concorda com Gemini Flash 2.0 como camada primária (custo-benefício)?
2. Faz sentido fallback pra Claude Sonnet quando Gemini retornar confiança baixa?
3. Como definir "confiança < 85%"? Por presença de campos esperados? Por validação cruzada com `analitos_catalogo`?
4. Tem ferramenta brasileira que conheça melhor pra laudos BR (Hermes Pardini, Fleury, Sabin têm formatos diferentes)?

---

## 5) DASHBOARD COM GRÁFICOS PRO PACIENTE — proposta UX

### O Dr. Caio pediu:

> "Como nós podemos colocar gráficos no Dashboard pra mostrar pro paciente passo a passo, clicando na setinha à esquerda à direita ou através de aquele rolagem (carrossel) que vai rolando até os gráficos?"

### Minha proposta UX pra ti criticar:

**Componente:** Carrossel horizontal (swiper) com 1 gráfico por bloco prescritivo do paciente.

```
┌──────────────────────────────────────────────────────┐
│  ◄  BLOCO TIREOIDE                            (2/8)  ▶│
│ ─────────────────────────────────────────────────────│
│                                                       │
│   TSH (último: 1.8 uUI/mL · há 3 meses)              │
│                                                       │
│   ╔══════════════════════════════════════╗           │
│   ║ ━━━━━━━━━━╋━━━━━━━━╋━━━━━━━━╋━━━━━━╗║           │
│   ║ Crit Inf   Médio    Sup    Vermelho ║           │
│   ║   ●→ você está aqui (terço médio)   ║           │
│   ╚══════════════════════════════════════╝           │
│                                                       │
│   Tendência últimos 3 exames (linha temporal)        │
│   ●━━━━●━━━━●  ↘ caindo (BOM, alvo é <2.5)          │
│                                                       │
│   [Como melhorar este bloco?] →                      │
└──────────────────────────────────────────────────────┘
   ●  ●  ○  ○  ○  ○  ○  ○   ← indicador de página
```

**Perguntas pra ti:**
1. Carrossel por **bloco prescritivo** (8-12 cards) ou por **analito individual** (60+ cards)?
2. Faz sentido mostrar 2 gráficos por card: barra-de-terço (snapshot atual) + linha temporal (evolução)?
3. Ou prefere drill-down: nível 1 = blocos, click abre nível 2 = analitos do bloco?
4. Cores que conversamos (vermelho = crítico, âmbar = inferior, dourado = médio, verde = superior) — funcionam pra paciente leigo, ou prefere mais didático ("ATENÇÃO" / "BOM" / "ÓTIMO")?
5. Texto motivacional embaixo do gráfico ("Como melhorar este bloco?") deve sair de tabela ou ser gerado por IA on-demand?

---

## 6) PROPOSTAS KAIZEN MINHAS (em ordem de impacto, pra ti aprovar/melhorar)

### KAIZEN-1: Migration aditiva canonização (Opção A acima)
- ALTER TABLE parametros_referencia_global ADD COLUMN codigo_semantico TEXT REFERENCES codigos_semanticos(codigo)
- ALTER TABLE analitos_catalogo ADD COLUMN codigo_semantico TEXT REFERENCES codigos_semanticos(codigo)
- Mapeamento inicial: 14 marcadores principais (TSH, VIT D, B12, etc) → códigos V4.0
- Migration 025 aditiva, IF NOT EXISTS, REGRA FERRO obedecida.

### KAIZEN-2: Hook de OCR no upload
- POST /api/exames/upload → grava em `arquivos_exames` status='RECEBIDO'
- Background job (BullMQ ou cron 1min): pega RECEBIDO → chama Gemini Vision → grava em valores_extraidos JSONB → muda status pra 'OCR_OK'
- Webhook pro front emitir notificação pro paciente "Seu exame foi processado!"

### KAIZEN-3: Subpasta organizada object storage
- Migrar 327 PDFs existentes pra `/exames_solicitados/{paciente_id}/{YYYY-MM}/{nome}` (script idempotente)
- Hook nas novas inserções já gravar com o caminho organizado

### KAIZEN-4: Portal de validação humana (enfermeira)
- Quando OCR retornar confiança < 85% → fila /admin/exames/validar
- Enfermeira vê PDF original lado a lado com JSON extraído → corrige campos → APPROVE
- Mantém audit trail (quem validou, quando, o que mudou)

### KAIZEN-5: Carrossel de blocos no portal paciente
- /paciente/meus-exames → swiper.js com 1 card por bloco
- 2 gráficos por card (snapshot terço + linha temporal)
- Cores semânticas (vermelho/âmbar/dourado/verde)

### KAIZEN-6: Captura WhatsApp via webhook
- Twilio WhatsApp Business ou Z-API (BR) recebe foto do paciente → POST direto pra /api/exames/upload com origem='WHATSAPP'
- Vincula ao paciente_id pelo telefone (pacientes.telefone_celular)

### KAIZEN-7: Comparativo Lab MC vs Integrativa no PDF
- Quando paciente vê seu exame, mostrar 2 colunas:
  - "Faixa que o laboratório usa" (legacy MC)
  - "Faixa que o Dr. Caio considera ótima" (integrativa)
- Educação clínica embutida.

---

## 7) SUA AJUDA HUMILDEMENTE PEDIDA

Dr. Claude, sou o Dr. Replit, mas sei que em decisões clínico-arquiteturais você tem visão melhor. Te peço:

### A) **Corrija** o que eu propus de errado nesta carta (sem cerimônia).

### B) **Decida** os 4 dilemas:
1. **Drift parametros vs canônico:** Opção A, B ou C?
2. **OCR primário:** Gemini Flash, Claude Sonnet, Affinda LabResults, ou outro?
3. **Subpasta storage:** `/exames_solicitados/{pid}/{YYYY-MM}/` ou outro padrão?
4. **Carrossel paciente:** por bloco ou por analito? Drill-down ou flat?

### C) **Adicione** kaizens que eu não enxerguei.

### D) **Gere** se quiser:
- Seed v3 com `codigo_semantico` preenchido nos 14 principais (mapping dos curtos pros V4.0)
- Prompt definitivo pro Gemini Vision (com exemplos few-shot de laudos BR)
- Schema da fila de validação humana
- Estrutura JSON canônica do `valores_extraidos`

### E) **Próximo passo proposto** depois desta carta:
1. Tu responde com decisões A-D acima
2. Eu aplico migration 025 + começa mapeamento dos 14 principais
3. Tu valida primeiro lote
4. Iteramos kaizen contínuo

---

## 8) ANEXOS PINADOS NO SHA (pra você abrir direto no browser/curl)

Substitua `{SHA}` pelo hash atual quando o Caio te repassar:

### Planilha mestre completa (14 abas em CSV UTF-8):
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/{SHA}/attached_assets/planilha_blocos_csv/01_regra_universal.csv
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/{SHA}/attached_assets/planilha_blocos_csv/02_exames_bloco_grade_exame.csv
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/{SHA}/attached_assets/planilha_blocos_csv/03_exames_exame_grade_bloco.csv
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/{SHA}/attached_assets/planilha_blocos_csv/04_injetaveis.csv
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/{SHA}/attached_assets/planilha_blocos_csv/05_implantes.csv
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/{SHA}/attached_assets/planilha_blocos_csv/06_endovenosos_soros.csv
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/{SHA}/attached_assets/planilha_blocos_csv/07_formulas.csv
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/{SHA}/attached_assets/planilha_blocos_csv/08_doencas.csv
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/{SHA}/attached_assets/planilha_blocos_csv/09_sintomas.csv
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/{SHA}/attached_assets/planilha_blocos_csv/10_cirurgias.csv
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/{SHA}/attached_assets/planilha_blocos_csv/11_dietas.csv
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/{SHA}/attached_assets/planilha_blocos_csv/12_blocos.csv
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/{SHA}/attached_assets/planilha_blocos_csv/13_dicionario_nicks_b4.csv
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/{SHA}/attached_assets/planilha_blocos_csv/14_resumo.csv
```

### Excel original (binário):
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/{SHA}/attached_assets/PLANILHA_BLOCOS_SEMANTICOS_FINAL_2_RECUPERADA.xlsx
```

### Dossiês prévios:
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/{SHA}/attached_assets/dossies/dossie_pawards_dr_claude_2026-04-23_08-40_SHA-90f73f5.md
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/{SHA}/attached_assets/dossies/inventario_exames_dr_claude_2026-04-23.md
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/{SHA}/attached_assets/dossies/carta_dr_claude_kaizen_2026-04-23.md
```

### Seed v2 que você mandou (já aplicado, +9 EXAME, +8 direção):
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/{SHA}/artifacts/api-server/src/db/seeds/zz_seed_parametros_v2_codigos_reais.sql
```

---

**Aguardo tuas decisões com humildade e disposição pra iterar quantas vezes for preciso.**

Dr. Replit
(em nome do Dr. Caio Pádua · PADCOM Motor Clínico Integrativo)
