# 📦 PACOTE DR. CLAUDE — Wave V25 PADCOM

> Documento de bootstrap pra Dr. Claude entender o catálogo completo,
> o template visual V8 definitivo aprovado, e a estrutura dos modelos RAS.
> **Data:** 18/mai/2026 · véspera demo Carlúcia (sessão 39, 19/mai 07:30, Pádua).

---

## 🎨 1. TEMPLATE VISUAL V8 — definitivo cravado

**Princípios aprovados pelo Caio (após V1 → V7A → V8 + refinamentos):**

- Fundo da página em **pastel azulado ameno (#EAF0F7)**
- Cards em **pastel claro (#F4F7FB)** — degradê de saturação, mesma família cromática
- Cabeçalho **navy profundo (#0F2940)** denso com filete dourado (#C7A646) fino abaixo
- Nome da substância grande em creme + categoria em italic dourado
- Canto sup-direito: **2 retângulos empilhados verticalmente** — APRESENTAÇÃO·D0 (verde sálvia) em cima + RXS NADE (dourado, linha única lado a lado) embaixo
- Faixa navy-médio com **NOME PACIENTE EM MAIÚSCULAS** (creme bold) + **frase italic clara** (Sessão · Unidade · Data) à direita
- Posologia em **caixa enquadrada creme** com 3 colunas (VIA · DOSE · FREQUÊNCIA) separadas por filete dourado fino
- Cada bloco de conteúdo = **2 retângulos separados com gap 4pt**: header navy emoldurado + corpo pastel emoldurado, ambos com borda dourada própria
- Numerais arábicos `1.` `2.` `3.` em dourado-queimado pros bullets (zero unicode decorativo — `★◆◇` viram `&` em alguns leitores)
- **Estrelas vetoriais (path moveTo/lineTo)** só onde tem semântica de rating de impacto
- Rodapé navy 44pt: INSTITUTO PÁDUA + slogan à esquerda · **P A W A R D S ® / P A D C O N ®** à direita, com os "P" alinhados na MESMA coluna vertical + descritores serif-italic alinhados também
- Margens laterais reduzidas a 18pt no rodapé pra colar nas extremidades
- Tipografia: **Helvetica** (sans corpo) + **Times-Italic** (serif descritores) + **JetBrains Mono** (mono, código)

**Amostra visual aprovada (NAD+ Endovenoso pra Carlúcia):**
https://drive.google.com/file/d/1mfRsZcFfBirHThildJowe8bmU_yOMX-N/view?usp=drivesdk

**Código fonte do template:** `scripts/src/mockup-substancia-v8-pastel-numerais.ts`

---

## 📑 2. CATÁLOGO DOS MODELOS DE RAS (RASX-MATRIZ V6)

### 2.1 RAS Clínico (RACL) — `artifacts/api-server/src/pdf/rasxPdf.ts`

Definido em `RAS_CATEGORIAS` (linha 676):

| Categoria | Label | Cadernos |
|---|---|---|
| CLINICO | RAS Clínico | RACL HEST · HPOT · HORG · HMED · HFOR · HCUR · HATU |
| EVOLUTIVO | RAS Evolutivo | RACL HLIN · HTRN · HEVO · HPLA |
| ESTADO_SAUDE | RAS Estado de Saúde | RACL HATU · HCUR · HPLA |
| COMPLETO | RAS Completo | TODOS os 11 cadernos acima |

**Glossário dos cadernos:**
- **HEST** — Histórico de Estado (patologias instaladas)
- **HPOT** — Histórico Potencial (riscos/preditivos)
- **HORG** — Histórico de Órgãos/Sistemas (matriz de intensidade)
- **HMED** — Histórico de Medicamentos em uso
- **HFOR** — Histórico de Fórmulas manipuladas
- **HLIN** — Histórico de Linha Evolutiva (timeline)
- **HTRN** — Histórico de Transições terapêuticas
- **HEVO** — Histórico Evolutivo (deltas)
- **HCUR** — Histórico de Curvas (biomarcadores)
- **HATU** — Histórico Atual (snapshot)
- **HPLA** — Histórico de Planejamento futuro

### 2.2 RAS Jurídico (RACJ) — `artifacts/api-server/src/pdf/racjPdf.ts`

| Subgrupo | Categoria | Humano | Técnico |
|---|---|---|---|
| JURI.BASE | lgpd | Proteção dos seus dados pessoais | LGPD Lei 13.709/2018 |
| JURI.BASE | privacidade | Sigilo médico e privacidade | CFM + LGPD |
| JURI.BASE | nao_garantia | Ciência sobre não-garantia de resultados | Obrigação de meio (CDC 14 §4º) |
| JURI.CONS | tcle_global | Consentimento plano terapêutico integrado | TCLE Global |
| JURI.CONS | CFOR | Consentimento fórmulas manipuladas | RDC 67 |
| JURI.CONS | CIMU | Consentimento aplicações intramusculares | — |
| JURI.CONS | CEND | Consentimento aplicações endovenosas | — |
| JURI.DIGI | aceite_digital | Aceite digital e validade jurídica | ICP-Brasil |

### 2.3 Outros PDFs do sistema

| Arquivo | Função |
|---|---|
| `pdf/prescricaoPdf.ts` (443l) | Receita Branca/Azul/Amarela (Anvisa) |
| `pdf/gerarPedidoExame.ts` | Pedido de exames laboratoriais |
| `pdf/gerarTermoPARQ.ts` | Termo de Anamnese PARQ |
| `pdf/docsPdf.ts` | Documentos gerais paciente |
| `pdf/relatorioDiarioCEO.ts` | Relatório CEO diário |
| `pdf/relatorioOperacionalDia.ts` | Operacional unidade |
| `pdf/rasxMotorPdf.ts` | RAS Motor (multi-página consolidado) |

**Total estimado de variantes de PDF emitido pelo sistema:** ~40+ combinações (4 RAS clínicos × 5 perfis assinante + 8 termos RACJ + 3 receitas Anvisa + 2 exames + relatórios + ...)

---

## 💊 3. CATÁLOGO DE INSUMOS TERAPÊUTICOS — 527 itens cadastrados

### 3.1 SUBSTÂNCIAS (15 itens) — base do motor clínico

Tabela `substancias` — **cada uma tem rating estrela 0-5 nos 8 sistemas**:
`beneficio_longevidade · beneficio_sono · beneficio_energia · beneficio_libido · performance_fisica · forca_muscular · clareza_mental · pele_cabelo_unhas · suporte_imunologico · impacto_qualidade_vida`

| ID | Código | Nome | Categoria | Via | Dose padrão | Duração | Preço ref |
|---|---|---|---|---|---|---|---|
| 7 | VITA.COGN.ENER.CB.01 | **Complexo B** | Vitaminas | im | 2 ml ml | 15min | R$ 75 |
| 3 | LIPT.META.LIPT.FC.01 | **Fosfatidilcolina** | Lipoliticos | iv | 100 mg mg | 30min | R$ 85 |
| 1 | ANTX.ENRG.ANTI.GLT.01 | **Glutationa** | Antioxidantes | iv | 100 mg mg | 30min | R$ 85 |
| 15 | PROD_GLUT_001 | **Glutationa EV 1200mg (placeholder)** | antioxidante | iv | 1200 mg | 30min | R$ 350 |
| 4 | ANTX.ENRG.META.NAD.01 | **NAD+** | Metabolicos | iv | 250 mg mg | 30min | R$ 350 |
| 5 | TERA.OXID.TERA.OZ.01 | **Ozone Terapia** | Terapia Oxidativa | iv | 200 ml ml | 30min | R$ 180 |
| 16 | — | **PARMASUPRA-TSUNAMI-TESTE-T5** | controlado | oral | —  | 30min | R$ — |
| 17 | — | **PARMASUPRA-TSUNAMI-TESTE-T5-DUP** | controlado | oral | —  | 30min | R$ — |
| 18 | — | **TSUNAMI-T5-NO-UNIT** | controlado | oral | —  | 30min | R$ — |
| 9 | IMPL.HORM.TEST.TP.01 | **Testosterona Pellet** | Hormonios | implant | 200mg mg | 60min | R$ 850 |
| 14 | PROD_VITB12_001 | **Vitamina B12 (Metilcobalamina) IM (placeholder)** | vitamina_hidrossoluvel | im | 5000 mcg | 10min | R$ 120 |
| 2 | VITA.IMUN.ANTI.VC.01 | **Vitamina C Endovenosa** | Vitaminas | iv | 20 mg mg | 30min | R$ 120 |
| 6 | VITA.IMUN.ANTI.VD3.02 | **Vitamina D3 2000UI** | Vitaminas | im | 2000 UI UI | 15min | R$ 95 |
| 13 | PROD_VITD3_001 | **Vitamina D3 5000UI IM (placeholder)** | vitamina_lipossoluvel | im | 5000 UI | 10min | R$ 180 |
| 8 | MINE.IMUN.ANTI.ZS.01 | **Zinco + Selenio** | Minerais | im | 100 mg mg | 15min | R$ 65 |

**Detalhamento por substância (descrição + função + estrelas por sistema):**

#### Complexo B (CompB) — `VITA.COGN.ENER.CB.01`
- **Descrição:** Complexo de vitaminas B1, B2, B3, B5, B6, B12
- **Função principal:** Metabolismo energetico e funcao neurologica
- **Efeitos percebidos:** Mais energia, concentracao, humor estavel
- **Tempo para efeito:** 1-2 semanas

#### Fosfatidilcolina (Fosfa) — `LIPT.META.LIPT.FC.01`
- **Descrição:** Fosfolipidio essencial para metabolismo de gorduras
- **Função principal:** Lipolitico e hepatoprotetor
- **Efeitos percebidos:** Reducao de medidas, mais disposicao
- **Tempo para efeito:** 4-6 semanas

#### Glutationa (Gluta) — `ANTX.ENRG.ANTI.GLT.01`
- **Descrição:** Tripeptideo composto por glutamato, cisteina e glicina. Principal antioxidante endogeno do organismo.
- **Função principal:** Desintoxicacao hepatica e protecao celular contra danos oxidativos
- **Efeitos percebidos:** Pele mais luminosa, disposicao aumentada, reducao de fadiga
- **Tempo para efeito:** 2-4 semanas para efeitos visiveis
- **Contraindicações:** Hipersensibilidade ao composto. Cautela em gestantes.
- **Evidência:** Alta - multiplos estudos randomizados
- **Ratings por sistema (0-5 estrelas):**
  - Longevidade: ☆☆☆☆☆ (0/5)
  - Qualidade de vida: ☆☆☆☆☆ (0/5)
  - Sono: ☆☆☆☆☆ (0/5)
  - Energia: ☆☆☆☆☆ (0/5)
  - Libido: ☆☆☆☆☆ (0/5)
  - Performance física: ☆☆☆☆☆ (0/5)
  - Força muscular: ☆☆☆☆☆ (0/5)
  - Clareza mental: ☆☆☆☆☆ (0/5)
  - Pele/Cabelo/Unhas: ☆☆☆☆☆ (0/5)
  - Suporte imunológico: ☆☆☆☆☆ (0/5)

#### Glutationa EV 1200mg (placeholder) (GLUT-FIC) — `PROD_GLUT_001`
- **Descrição:** Protocolo padrão: 6 sessões EV quinzenais. Detox, antioxidante master, pele.
- **Função principal:** Detoxificação e antioxidação celular
- **Efeitos percebidos:** Pele, energia, sono
- **Tempo para efeito:** 15-45 dias

#### NAD+ (NAD) — `ANTX.ENRG.META.NAD.01`
- **Descrição:** Nicotinamida adenina dinucleotideo - coenzima essencial
- **Função principal:** Reparo de DNA e producao de energia celular
- **Efeitos percebidos:** Energia mental e fisica, anti-aging
- **Tempo para efeito:** 1-3 sessoes

#### Ozone Terapia (Ozone) — `TERA.OXID.TERA.OZ.01`
- **Descrição:** Autohemoterapia maior com ozonio
- **Função principal:** Oxigenacao tecidual e modulacao imunologica
- **Efeitos percebidos:** Mais energia, menos infeccoes
- **Tempo para efeito:** 3-5 sessoes

#### PARMASUPRA-TSUNAMI-TESTE-T5 — `—`

#### PARMASUPRA-TSUNAMI-TESTE-T5-DUP — `—`

#### TSUNAMI-T5-NO-UNIT — `—`

#### Testosterona Pellet (TestP) — `IMPL.HORM.TEST.TP.01`
- **Descrição:** Implante subcutaneo de testosterona pellet
- **Função principal:** Reposicao hormonal

#### Vitamina B12 (Metilcobalamina) IM (placeholder) (VITB12-FIC) — `PROD_VITB12_001`
- **Descrição:** Protocolo padrão: 10 sessões IM semanais. Fadiga, neuropatia, deficiência.
- **Função principal:** Energia, função neurológica, formação sanguínea
- **Efeitos percebidos:** Disposição, foco
- **Tempo para efeito:** 7-21 dias

#### Vitamina C Endovenosa (VitC) — `VITA.IMUN.ANTI.VC.01`
- **Descrição:** Acido ascorbico em alta dose endovenosa
- **Função principal:** Antioxidante potente e suporte imunologico
- **Efeitos percebidos:** Mais disposicao, menos gripes, pele melhor
- **Tempo para efeito:** 1-2 semanas

#### Vitamina D3 2000UI (VitD3+) — `VITA.IMUN.ANTI.VD3.02`
- **Descrição:** Colecalciferol em dose endovenosa
- **Função principal:** Regulacao de calcio e suporte imunologico
- **Efeitos percebidos:** Ossos mais fortes, menos fadiga
- **Tempo para efeito:** 4-8 semanas

#### Vitamina D3 5000UI IM (placeholder) (VITD3-FIC) — `PROD_VITD3_001`
- **Descrição:** Protocolo padrão: 5 sessões IM quinzenais. Reposição em deficiência confirmada.
- **Função principal:** Reposição de vitamina D
- **Efeitos percebidos:** Energia, humor, sono
- **Tempo para efeito:** 30-60 dias

#### Zinco + Selenio (ZnSe) — `MINE.IMUN.ANTI.ZS.01`
- **Descrição:** Combinacao de zinco e selenio intramuscular
- **Função principal:** Suporte imunologico e antioxidante
- **Efeitos percebidos:** Menos gripes, cabelo e unhas mais fortes
- **Tempo para efeito:** 2-4 semanas

---

### 3.2 INJETÁVEIS IM/EV (305 itens)

Tabela `injetaveis`. Coluna `via` diferencia IM/EV/SC.

| Código | Nome exibição | Dosagem | Vol | Via | Classificação | Eixo integrativo |
|---|---|---|---|---|---|---|
| INJE NEUR 5HTP 001 | **5 HTP (OH-TRIPTOFANO)** | 20 MG | 5 ML | EV / IM | SIMPLES | NEUROCOGNITIVO |
| INJE NEUR 5HTP 002 | **5 HTP (OH-TRIPTOFANO)** | 4 MG | 2 ML | EV / IM | SIMPLES | NEUROCOGNITIVO |
| INJE META CARN 001 | **ACETIL L-CARNITINA** | 800 MG | 2 ML | EV / IM / SC / ID | SIMPLES | METABOLICO |
| INJE NEUR PCOG 001 | **ACETIL L-CARNITINA** | 330 MG | — | — | COMPONENTE | NEUROCOGNITIVO |
| INJE NUTR ACID 001 | **ACIDO ALFA LIPOICO** | 10 MG | 2 ML | EV / IM / SC / ID | SIMPLES | ORTOMOLECULAR |
| INJE NUTR ACID 002 | **ACIDO ALFA LIPOICO** | 300 MG | 10 ML | EV | SIMPLES | ORTOMOLECULAR |
| INJE NUTR ACID 003 | **ACIDO ALFA LIPOICO** | 600 MG | 24 ML | EV | SIMPLES | ORTOMOLECULAR |
| INJE NUTR ACID 004 | **ACIDO FOLICO** | 10 MG | 2 ML | EV / IM | SIMPLES | ORTOMOLECULAR |
| INJE NUTR ACID 005 | **ACIDO GLICOLICO** | 20 MG | 2 ML | ID | SIMPLES | ORTOMOLECULAR |
| INJE NUTR PAMI 001 | **ACIDO GLUTAMICO** | 5,4 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR PAMI 002 | **ACIDO GLUTAMICO** | 27 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR ADNX 001 | **ACIDO HIALURONICO** | 15 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE DERM ACID 001 | **ACIDO HIALURONICO** | 10 MG | 2 ML | ID | SIMPLES | DERMATOLOGICO |
| INJE DERM FATO 003 | **ACIDO KOJICO** | 2 MG | — | — | COMPONENTE | DERMATOLOGICO |
| INJE NUTR PAMI 001 | **ACIDO L-ASPARTICO** | 4,8 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR PAMI 002 | **ACIDO L-ASPARTICO** | 24 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR ACID 006 | **ACIDO TRANEXAMICO** | 8 MG | 1 ML | SC / ID | SIMPLES | ORTOMOLECULAR |
| INJE NUTR ALAN 001 | **ALANIL GLUTAMINA** | 1 G | 10 ML | EV / IM | SIMPLES | ORTOMOLECULAR |
| INJE NEUR ALFA 001 | **ALFA GPC** | 400 MG | 4 ML | EV / IM | SIMPLES | NEUROCOGNITIVO |
| INJE NUTR ASIA 001 | **ASIATICOSIDE** | 2 MG | 1 ML | ID | SIMPLES | ORTOMOLECULAR |
| INJE NUTR ATPX 001 | **ATP** | 20 MG | 2 ML | EV | SIMPLES | ORTOMOLECULAR |
| INJE NUTR AZUL 001 | **AZUL DE METILENO 1%** | 20 MG | 2 ML | EV | SIMPLES | ORTOMOLECULAR |
| INJE NUTR AZUL 002 | **AZUL DE METILENO 1%** | 50 MG | 5 ML | EV | SIMPLES | ORTOMOLECULAR |
| INJE NUTR AZUL 003 | **AZUL DE METILENO 2%** | 40 MG | 2 ML | EV | SIMPLES | ORTOMOLECULAR |
| INJE NUTR AZUL 004 | **AZUL DE METILENO 2%** | 100 MG | 5 ML | EV | SIMPLES | ORTOMOLECULAR |
| INJE NUTR BCOM 001 | **B1 + B2 + B3 + B5 + B6 + B12** | — | — | — | NUTRICIONAL | DEFICIENCIA |
| INJE NUTR BENZ 001 | **BENZOPIRONA** | 1 MG | 2 ML | SC / ID | SIMPLES | ORTOMOLECULAR |
| INJE NUTR RUTI 001 | **BENZOPIRONA** | 0,15 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR POOL 001 | **BETA ALANINA** | 150 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE META BETA 001 | **BETA ALANINA** | 500 MG | 2 ML | EV / IM | SIMPLES | METABOLICO |
| INJE DERM FATO 002 | **BFGF** | — | — | — | COMPONENTE | DERMATOLOGICO |
| INJE NUTR BICA 002 | **BICARBONATO DE SODIO** | 1 G | 10 ML | EV | SIMPLES | ORTOMOLECULAR |
| INJE NUTR BICA 001 | **BICARBONATO DE SODIO** | 840 MG | 10 ML | EV | SIMPLES | ORTOMOLECULAR |
| INJE DERM BIOT 001 | **BIOTINA** | 10 MG | 2 ML | EV / IM / SC / ID | SIMPLES | DERMATOLOGICO |
| INJE DERM PCAP 001 | **BIOTINA** | 10 MG | — | — | COMPONENTE | DERMATOLOGICO |
| INJE DERM FATO 002 | **BIOTINA** | 10 MG | — | — | COMPONENTE | DERMATOLOGICO |
| INJE DERM PILL 001 | **BIOTINA** | 10 MG | — | — | COMPONENTE | DERMATOLOGICO |
| INJE DERM FATO 003 | **BLEND** | — | 1 ML | ID | COMPOSTO | DERMATOLOGICO |
| INJE DERM FATO 001 | **BLEND** | — | 2 ML | ID | COMPOSTO | DERMATOLOGICO |
| INJE NUTR ADNX 001 | **BLEND** | — | 3 ML | ID | COMPOSTO | ORTOMOLECULAR |
| INJE META CITB 001 | **BLEND** | — | 3 ML | IM | COMPOSTO | METABOLICO |
| INJE META CBPL 001 | **BLEND** | — | 3 ML | IM | COMPOSTO | METABOLICO |
| INJE NUTR LARG 002 | **BLEND** | — | 2 ML | IM / SC / ID | COMPOSTO | ORTOMOLECULAR |
| INJE ORTO PART 001 | **BLEND** | — | 10 ML | EV | COMPOSTO | OSTEOARTICULAR |
| INJE DERM PCAP 001 | **BLEND** | — | 2 ML | IM / SC / ID | COMPOSTO | DERMATOLOGICO |
| INJE NUTR PMIN 001 | **BLEND** | — | 2 ML | EV / IM | COMPOSTO | ORTOMOLECULAR |
| INJE NUTR RUTI 001 | **BLEND** | — | 2 ML | IM / SC / ID | COMPOSTO | ORTOMOLECULAR |
| INJE DERM PILL 001 | **BLEND** | — | 2 ML | EV / IM / ID | COMPOSTO | DERMATOLOGICO |
| INJE META INOS 002 | **BLEND** | — | 2 ML | EV / IM | COMPOSTO | METABOLICO |
| INJE INFL DREN 001 | **BLEND** | — | 5 ML | IM / EV | INFLAMATORIO | LIPOEDEMA |
| INJE NUTR BCOM 001 | **BLEND** | — | 2 ML | IM | NUTRICIONAL | DEFICIENCIA |
| INJE VITA ADEK 001 | **BLEND** | — | 2 ML | IM | COMPOSTO | VITAMINICO |
| INJE VITA ADEK 002 | **BLEND** | — | 2 ML | IM | COMPOSTO | VITAMINICO |
| INJE NUTR AMIN 001 | **BLEND** | — | 10 ML | EV / IM | COMPOSTO | ORTOMOLECULAR |
| INJE VITA VDK2 001 | **BLEND** | — | 1 ML | IM | COMPOSTO | VITAMINICO |
| INJE NUTR BCAA 001 | **BLEND** | — | 10 ML | EV / IM | COMPOSTO | ORTOMOLECULAR |
| INJE META THER 001 | **BLEND** | — | 3 ML | IM / SC / ID | COMPOSTO | METABOLICO |
| INJE NEUR PCOG 001 | **BLEND** | — | 2 ML | EV / IM | COMPOSTO | NEUROCOGNITIVO |
| INJE NUTR POOL 001 | **BLEND** | — | 5 ML | IM | COMPOSTO | ORTOMOLECULAR |
| INJE VITA POOL 001 | **BLEND** | — | 2 ML | EV / IM | COMPOSTO | VITAMINICO |
| INJE VITA COMP 001 | **BLEND** | — | 2 ML | EV / IM / SC | COMPOSTO | VITAMINICO |
| INJE NUTR BIOP 001 | **BLEND** | — | 5 ML | EV / IM / SC / ID | COMPOSTO | ORTOMOLECULAR |
| INJE NUTR PMET 001 | **BLEND** | — | 2 ML | EV / IM | COMPOSTO | ORTOMOLECULAR |
| INJE NUTR PAMI 001 | **BLEND** | — | 2 ML | EV / IM | COMPOSTO | ORTOMOLECULAR |
| INJE NUTR PAMI 002 | **BLEND** | — | 10 ML | EV / IM | COMPOSTO | ORTOMOLECULAR |
| INJE VITA COMP 002 | **BLEND** | — | 2 ML | EV / IM / SC | COMPOSTO | VITAMINICO |
| INJE DERM FATO 002 | **BLEND** | — | 2 ML | ID | COMPOSTO | DERMATOLOGICO |
| INJE ORTO PART 001 | **BORO** | 0,66 MG | — | — | COMPONENTE | OSTEOARTICULAR |
| INJE META CBPL 001 | **CAFEINA** | 120 MG | — | — | COMPONENTE | METABOLICO |
| INJE META CITB 001 | **CAFEINA** | 120 MG | — | — | COMPONENTE | METABOLICO |
| INJE NUTR CAFE 001 | **CAFEINA BENZOICA** | 100 MG | 2 ML | IM / SC / ID | SIMPLES | ORTOMOLECULAR |
| INJE META CITB 001 | **CITRUS RED** | 40 MG | — | — | COMPONENTE | METABOLICO |
| INJE META CBPL 001 | **CITRUS RED** | 40 MG | — | — | COMPONENTE | METABOLICO |
| INJE META CITR 001 | **CITRUS RED (MORUSIL)** | 40 MG | 2 ML | IM | SIMPLES | METABOLICO |
| INJE NUTR CLOR 001 | **CLORETO DE CALCIO** | 200 MG | 2 ML | EV | SIMPLES | ORTOMOLECULAR |
| INJE META CLOR 001 | **CLORETO DE CROMO** | 100 MCG | 2 ML | EV / IM | SIMPLES | METABOLICO |
| INJE NUTR PMIN 001 | **CLORETO DE CROMO** | 200 MCG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE ORTO CLOR 001 | **CLORETO DE MAGNESIO** | 2 G | 10 ML | EV | SIMPLES | OSTEOARTICULAR |
| INJE NUTR CLOR 003 | **CLORIDRATO DE PROCAINA 0,7%** | 350 MG | 50 ML | EV / IM / SC / ID | SIMPLES | ORTOMOLECULAR |
| INJE NUTR CLOR 002 | **CLORIDRATO DE PROCAINA 50%** | 5 G | 10 ML | EV / IM / SC / ID | SIMPLES | ORTOMOLECULAR |
| INJE NUTR COEN 001 | **COENZIMA Q10** | 100 MG | 2 ML | IM | SIMPLES | ORTOMOLECULAR |
| INJE ORTO COLA 001 | **COLAGENO** | 200 MG | 2 ML | IM / SC / ID | SIMPLES | OSTEOARTICULAR |
| INJE NUTR COLC 001 | **COLCHICINA** | 1 MG | 2 ML | EV / IM | SIMPLES | ORTOMOLECULAR |
| INJE NUTR COLI 001 | **COLINA** | 500 MG | 2 ML | EV / IM / SC | SIMPLES | ORTOMOLECULAR |
| INJE NEUR PCOG 001 | **COLINA CLORETO** | 330 MG | — | — | COMPONENTE | NEUROCOGNITIVO |
| INJE NUTR ADNX 001 | **CONDROITIN** | 60 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE ORTO COND 001 | **CONDROITIN SULFATO** | 100 MG | 2 ML | IM / SC / ID | SIMPLES | OSTEOARTICULAR |
| INJE DERM FATO 002 | **COOPER PEPTIDEO** | — | — | — | COMPONENTE | DERMATOLOGICO |
| INJE NUTR CRIS 001 | **CRISINA** | 100 MCG | 2 ML | IM / SC / ID | SIMPLES | ORTOMOLECULAR |
| INJE ORTO CURC 001 | **CURCUMINA** | 200 MG | 2 ML | IM | SIMPLES | OSTEOARTICULAR |
| INJE DERM FATO 002 | **D-PANTENOL** | 40 MG | — | — | COMPONENTE | DERMATOLOGICO |
| INJE NUTR BIOP 001 | **D-PANTENOL** | 50 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE DERM PILL 001 | **D-PANTENOL** | 10 MG | — | — | COMPONENTE | DERMATOLOGICO |
| INJE NEUR PCOG 001 | **D-PANTENOL** | 80 MG | — | — | COMPONENTE | NEUROCOGNITIVO |
| INJE NUTR DRIB 001 | **D-RIBOSE** | 500 MG | 2 ML | EV / IM | SIMPLES | ORTOMOLECULAR |
| INJE NUTR DESO 001 | **DESOXICOLATO DE SODIO *** | 6,10% | 2 ML | SC | SIMPLES | ORTOMOLECULAR |
| INJE NUTR DIPI 001 | **DIPIRIDAMOL** | 10 MG | 2 ML | EV | SIMPLES | ORTOMOLECULAR |
| INJE NEUR DMAE 001 | **DMAE** | 50 MG | 2 ML | IM / SC / ID | SIMPLES | NEUROCOGNITIVO |
| INJE NUTR DMSO 002 | **DMSO - DIMETILSULFOXIDO** | 9990 MG | 10 ML | EV | SIMPLES | ORTOMOLECULAR |
| INJE NUTR DMSO 001 | **DMSO - DIMETILSULFOXIDO** | 4995 MG | 5 ML | EV | SIMPLES | ORTOMOLECULAR |
| INJE NUTR EDTA 001 | **EDTA CALCICO** | 750 MG | 5 ML | EV | SIMPLES | ORTOMOLECULAR |
| INJE NUTR EDTA 002 | **EDTA CALCICO** | 1500 MG | 10 ML | EV | SIMPLES | ORTOMOLECULAR |
| INJE NUTR EDTA 004 | **EDTA SODICO** | 1500 MG | 10 ML | EV | SIMPLES | ORTOMOLECULAR |
| INJE NUTR EDTA 003 | **EDTA SODICO** | 750 MG | 5 ML | EV | SIMPLES | ORTOMOLECULAR |
| INJE DERM EXOS 001 | **EXOSSOMAS** | 2,50% | 2 ML | ID | SIMPLES | DERMATOLOGICO |
| INJE DERM EXSY 001 | **EXSYNUTRIMENT** | 20 MG | 2 ML | IM / SC / ID | SIMPLES | DERMATOLOGICO |
| INJE NUTR FERR 001 | **FERRO - CARBOXIMALTOSSE FERRICA** | 100 MG | 2 ML | EV | SIMPLES | ORTOMOLECULAR |
| INJE META CBPL 001 | **FUROSEMIDA** | 5 MG | — | — | COMPONENTE | METABOLICO |
| INJE NUTR FURO 001 | **FUROSEMIDA** | 10 MG | 2 ML | IM | SIMPLES | ORTOMOLECULAR |
| INJE NEUR GABA 001 | **GABA** | 30 MG | 2 ML | EV / IM | SIMPLES | NEUROCOGNITIVO |
| INJE NUTR GLUC 001 | **GLUCONATO DE CALCIO** | 1 G | 10 ML | EV | SIMPLES | ORTOMOLECULAR |
| INJE NUTR HEPA 001 | **HEPARINA** | 2500 UI | 1 ML | EV | SIMPLES | ORTOMOLECULAR |
| INJE META THER 001 | **HMB** | 50 MG | — | — | COMPONENTE | METABOLICO |
| INJE NUTR POOL 001 | **HMB (HIDROXIMETILBUTIRATO)** | 50 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE META HMBH 001 | **HMB (HIDROXIMETILBUTIRATO)** | 50 MG | 2 ML | EV / IM | SIMPLES | METABOLICO |
| INJE DERM FATO 001 | **IDP2** | 1% | — | — | COMPONENTE | DERMATOLOGICO |
| INJE DERM FATO 001 | **IGF** | 1% | — | — | COMPONENTE | DERMATOLOGICO |
| INJE DERM FATO 002 | **IGF** | — | — | — | COMPONENTE | DERMATOLOGICO |
| INJE META INOS 002 | **INOSITOL** | 200 MG | — | — | COMPONENTE | METABOLICO |
| INJE META CBPL 001 | **INOSITOL** | 100 MG | — | — | COMPONENTE | METABOLICO |
| INJE META CITB 001 | **INOSITOL** | 100 MG | — | — | COMPONENTE | METABOLICO |
| INJE META INOS 001 | **INOSITOL** | 1 G | 10 ML | EV / IM | SIMPLES | METABOLICO |
| INJE NUTR IOIM 001 | **IOIMBINA** | 4 MG | 2 ML | SC / ID | SIMPLES | ORTOMOLECULAR |
| INJE NUTR AMIN 001 | **ISOLEUCINA** | 74 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR BCAA 001 | **ISOLEUCINA** | 150 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE INFL DREN 001 | **L CARNITINA + ALCACHOFRA + SILICIO** | — | — | — | INFLAMATORIO | LIPOEDEMA |
| INJE NUTR PAMI 001 | **L-ALANINA** | 14,6 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR PAMI 002 | **L-ALANINA** | 73 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR PAMI 002 | **L-ARGININA** | 56 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR PAMI 001 | **L-ARGININA** | 11,2 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR LARG 002 | **L-ARGININA** | 1 G | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR LARG 001 | **L-ARGININA** | 1 G | 2 ML | EV / IM / SC / ID | SIMPLES | ORTOMOLECULAR |
| INJE NUTR POOL 001 | **L-CARNITINA** | 150 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE META CBPL 001 | **L-CARNITINA** | 300 MG | — | — | COMPONENTE | METABOLICO |
| INJE META CARN 002 | **L-CARNITINA** | 600 MG | 2 ML | EV / IM / SC | SIMPLES | METABOLICO |
| INJE META CITB 001 | **L-CARNITINA** | 300 MG | — | — | COMPONENTE | METABOLICO |
| INJE META THER 001 | **L-CARNITINA** | 250 MG | — | — | COMPONENTE | METABOLICO |
| INJE NUTR LCAR 001 | **L-CARNOSINA** | 100 MG | 2 ML | EV / IM | SIMPLES | ORTOMOLECULAR |
| INJE NUTR AMIN 001 | **L-FENILALANINA** | 65 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR LFEN 001 | **L-FENILALANINA** | 50 MG | 2 ML | EV / IM | SIMPLES | ORTOMOLECULAR |
| INJE NUTR LGLI 001 | **L-GLICINA** | 75 MG | 2 ML | EV / IM | SIMPLES | ORTOMOLECULAR |
| INJE NUTR PAMI 002 | **L-GLICINA** | 74 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR PAMI 001 | **L-GLICINA** | 14,8 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR LGLU 001 | **L-GLUTHATION** | 100 MG | 2 ML | EV / IM | SIMPLES | ORTOMOLECULAR |
| INJE NUTR LGLU 002 | **L-GLUTHATION** | 1 G | 10 ML | EV | SIMPLES | ORTOMOLECULAR |
| INJE NUTR PAMI 001 | **L-HISTIDINA** | 9,2 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR PAMI 002 | **L-HISTIDINA** | 46 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR AMIN 001 | **L-LEUCINA** | 98 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR BCAA 001 | **L-LEUCINA** | 50 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR POOL 001 | **L-LEUCINA** | 10 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR AMIN 001 | **L-LISINA** | 72 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR PAMI 002 | **L-LISINA** | 97 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE IMUN LLIS 001 | **L-LISINA** | 300 MG | 2 ML | EV / IM | SIMPLES | IMUNOLOGICO |
| INJE NUTR PAMI 001 | **L-LISINA** | 19,4 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR AMIN 001 | **L-METIONINA** | 35 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE DERM PCAP 001 | **L-METIONINA** | 30 MG | — | — | COMPONENTE | DERMATOLOGICO |
| INJE DERM PILL 001 | **L-METIONINA** | 25 MG | — | — | COMPONENTE | DERMATOLOGICO |
| INJE NUTR LMET 001 | **L-METIONINA** | 100 MG | 2 ML | EV / IM | SIMPLES | ORTOMOLECULAR |
| INJE NUTR PAMI 001 | **L-METONINA** | 9,4 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR PAMI 002 | **L-METONINA** | 47 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR LORN 001 | **L-ORNITINA** | 300 MG | 2 ML | EV / IM | SIMPLES | ORTOMOLECULAR |
| INJE NUTR PAMI 001 | **L-ORNITINA** | 5,2 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR PAMI 002 | **L-ORNITINA** | 26 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR PAMI 002 | **L-PROLINA** | 84 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR LPRO 001 | **L-PROLINA** | 500 MG | 2 ML | EV / IM | SIMPLES | ORTOMOLECULAR |
| INJE DERM PILL 001 | **L-PROLINA** | 10 MG | — | — | COMPONENTE | DERMATOLOGICO |
| INJE ORTO PART 001 | **L-PROLINA** | 330 MG | — | — | COMPONENTE | OSTEOARTICULAR |
| INJE NUTR BIOP 001 | **L-PROLINA** | 10 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR PAMI 001 | **L-PROLINA** | 16,8 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR PAMI 002 | **L-SERINA** | 25 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR PAMI 001 | **L-SERINA** | 5,0 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR LTAU 002 | **L-TAURINA** | 500 MG | 5 ML | EV / IM | SIMPLES | ORTOMOLECULAR |
| INJE DERM PILL 001 | **L-TAURINA** | 50 MG | — | — | COMPONENTE | DERMATOLOGICO |
| INJE NUTR LTAU 001 | **L-TAURINA** | 150 MG | 2 ML | EV / IM | SIMPLES | ORTOMOLECULAR |
| INJE NEUR LTHE 001 | **L-THEANINA** | 50 MG | 2 ML | EV / IM | SIMPLES | NEUROCOGNITIVO |
| INJE NUTR PAMI 001 | **L-TREONINA** | 5,8 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR PAMI 002 | **L-TREONINA** | 29 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR AMIN 001 | **L-TREONINA** | 56 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR PAMI 002 | **L-TRIPTOFANO** | 18 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR LTRI 001 | **L-TRIPTOFANO** | 100 MG | 10 ML | EV / IM | SIMPLES | ORTOMOLECULAR |
| INJE NUTR PAMI 001 | **L-TRIPTOFANO** | 3,6 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR AMIN 001 | **L-TRIPTOFANO** | 18 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR BCAA 001 | **L-VALINA** | 150 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR PAMI 001 | **L-VALINA** | 8,6 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR POOL 001 | **L-VALINA** | 10 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR AMIN 001 | **L-VALINA** | 83 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR PAMI 002 | **L-VALINA** | 43 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE META CITB 001 | **LIDOCAINA** | 10 MG | — | — | COMPONENTE | METABOLICO |
| INJE NUTR LARG 002 | **LIDOCAINA** | 20 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE META CBPL 001 | **LIDOCAINA** | 10 MG | — | — | COMPONENTE | METABOLICO |
| INJE NUTR LIDO 001 | **LIDOCAINA 1%** | 10 MG | 1 ML | IM / SC / ID | SIMPLES | ORTOMOLECULAR |
| INJE NUTR LIDO 002 | **LIDOCAINA 1%** | 100 MG | 10 ML | IM / SC / ID | SIMPLES | ORTOMOLECULAR |
| INJE NUTR LIDO 003 | **LIDOCAINA 2%** | 20 MG | 1 ML | IM / SC / ID | SIMPLES | ORTOMOLECULAR |
| INJE NUTR LIDO 004 | **LIDOCAINA 2%** | 200 MG | 10 ML | IM / SC / ID | SIMPLES | ORTOMOLECULAR |
| INJE META LIPO 001 | **LIPOREDUCTYL -** | — | 2 ML | IM / SC | SIMPLES | METABOLICO |
| INJE NUTR MESC 001 | **MESCLA SOFT -** | — | 10 ML | ID | SIMPLES | ORTOMOLECULAR |
| INJE NUTR MESO 001 | **MESOGLICANO** | 60 MG | 2 ML | SC | SIMPLES | ORTOMOLECULAR |
| INJE VITA METI 001 | **METILCOBALAMINA** | 500 MCG | 1 ML | EV / IM / SC | SIMPLES | VITAMINICO |
| INJE NUTR PMET 001 | **METILCOBALAMINA** | 2,5 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE VITA METI 003 | **METILCOBALAMINA** | 25 MG | 1 ML | EV / IM / SC | SIMPLES | VITAMINICO |
| INJE VITA POOL 001 | **METILCOBALAMINA** | 1MG | — | — | COMPONENTE | VITAMINICO |
| INJE VITA METI 002 | **METILCOBALAMINA** | 2500 MCG | 1 ML | EV / IM / SC | SIMPLES | VITAMINICO |
| INJE NUTR PMET 001 | **METILFOLATO** | 3,5 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE VITA METI 004 | **METILFOLATO** | 3,5 MG | 2 ML | EV / IM | SIMPLES | VITAMINICO |
| INJE NUTR BIOP 001 | **METILFOLATO** | 500 MCG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE DERM MINO 001 | **MINOXIDIL** | 10 MG | 2 ML | ID | SIMPLES | DERMATOLOGICO |
| INJE NUTR MSMM 001 | **MSM - METILSULFONILMETANO** | 750 MG | 5 ML | EV / IM / SC | SIMPLES | ORTOMOLECULAR |
| INJE NUTR MSMM 002 | **MSM - METILSULFONILMETANO** | 1500 MG | 10 ML | EV | SIMPLES | ORTOMOLECULAR |
| INJE IMUN NACE 001 | **N-ACETIL CISTEINA** | 300 MG | 2 ML | EV / IM PROFUNDO | SIMPLES | IMUNOLOGICO |
| INJE NUTR OKGL 001 | **OKG - L-ORNITINA ALFA CETOGLUTARATO** | 200 MG | 2 ML | EV / IM | SIMPLES | ORTOMOLECULAR |
| INJE NUTR PENT 002 | **PENTOXIFILINA** | 100 MG | 5 ML | EV | SIMPLES | ORTOMOLECULAR |
| INJE NUTR PENT 001 | **PENTOXIFILINA** | 40 MG | 2 ML | SC / ID | SIMPLES | ORTOMOLECULAR |
| INJE NUTR PERO 001 | **PEROXIDO DE HIDROGENIO** | 150 MG | 5 ML | EV | SIMPLES | ORTOMOLECULAR |
| INJE NEUR PHEN 001 | **PHENIBUT** | 50 MG | 2 ML | EV / IM | SIMPLES | NEUROCOGNITIVO |
| INJE META THER 001 | **PICOLINATO DE CROMO** | 100 MCG | — | — | COMPONENTE | METABOLICO |
| INJE META PICO 001 | **PICOLINATO DE CROMO** | 200 MCG | 2 ML | EV / IM | SIMPLES | METABOLICO |
| INJE NEUR PIRA 001 | **PIRACETAM** | 500 MG | 2 ML | EV / IM | SIMPLES | NEUROCOGNITIVO |
| INJE NUTR PMET 001 | **PIRIDOXAL 5-FOSFATO** | 30 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NEUR PQQP 001 | **PQQ - PIRROLOQUINOLINO QUINONA** | 5 MG | 2 ML | EV / IM | SIMPLES | NEUROCOGNITIVO |
| INJE NUTR PROC 001 | **PROCAINA BENZOICA 2%** | 40 MG | 2 ML | EV / IM / SC / ID | SIMPLES | ORTOMOLECULAR |
| INJE NUTR PROC 002 | **PROCAINA BENZOICA 4%** | 200 MG | 5 ML | EV / IM / SC / ID | SIMPLES | ORTOMOLECULAR |
| INJE HORM PROG 002 | **PROGESTERONA** | 100 MG | 2 ML | IM | HORMONAL | AMENORREIA |
| INJE HORM PROG 001 | **PROGESTERONA** | 50 MG | 2 ML | IM | HORMONAL | MENOPAUSA |
| INJE NUTR RESV 001 | **RESVERATROL** | 100 MG | 2 ML | IM | SIMPLES | ORTOMOLECULAR |
| INJE DERM PILL 001 | **RIBOFLAVINA** | 5 MG | — | — | COMPONENTE | DERMATOLOGICO |
| INJE NUTR RUTI 001 | **RUTINA** | 50 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE ORTO SAME 001 | **SAME** | 200 MG | 2 ML | EV / IM | SIMPLES | OSTEOARTICULAR |
| INJE NUTR PMIN 001 | **SELENIO** | 50 MCG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR BIOP 001 | **SELENIO** | 80 MCG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE IMUN SELE 001 | **SELENIO** | 80 MCG | 2 ML | EV / IM | SIMPLES | IMUNOLOGICO |
| INJE DERM SILI 001 | **SILICIO** | 20 MG | 2 ML | IM / SC / ID | SIMPLES | DERMATOLOGICO |
| INJE DERM PCAP 001 | **SILICIO** | 5 MG | — | — | COMPONENTE | DERMATOLOGICO |
| INJE NUTR BIOP 001 | **SILICIO** | 150 MCG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR PMIN 001 | **SULF. COBRE** | 0,7 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR PMIN 001 | **SULF. MAGNESIO** | 500 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR PMIN 001 | **SULF. MANGANES** | 25 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR PMIN 001 | **SULF. ZINCO** | 25 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE NUTR SULF 002 | **SULFATO DE ATROPINA** | 0,5 MG | 1 ML | EV / IM / SC | SIMPLES | ORTOMOLECULAR |
| INJE NUTR SULF 001 | **SULFATO DE ATROPINA** | 0,25 MG | 1 ML | EV / IM / SC | SIMPLES | ORTOMOLECULAR |
| INJE NUTR SULF 003 | **SULFATO DE COBRE** | 0,5 MG | 2 ML | EV / IM / ID | SIMPLES | ORTOMOLECULAR |
| INJE ORTO SULF 003 | **SULFATO DE MAGNESIO 10%** | 1 G | 10 ML | EV / IM | SIMPLES | OSTEOARTICULAR |
| INJE ORTO SULF 001 | **SULFATO DE MAGNESIO 10%** | 200 MG | 2 ML | EV / IM / SC | SIMPLES | OSTEOARTICULAR |
| INJE ORTO SULF 002 | **SULFATO DE MAGNESIO 10%** | 500 MG | 5 ML | EV / IM | SIMPLES | OSTEOARTICULAR |
| INJE ORTO SULF 004 | **SULFATO DE MAGNESIO 50%** | 5 G | 10 ML | EV / IM | SIMPLES | OSTEOARTICULAR |
| INJE NUTR SULF 004 | **SULFATO DE MANGANES** | 20 MG | 2 ML | EV / IM | SIMPLES | ORTOMOLECULAR |
| INJE NUTR SULF 005 | **SULFATO DE ZINCO** | 20 MG | 2 ML | EV / IM | SIMPLES | ORTOMOLECULAR |
| INJE ORTO PART 001 | **SULFATO MAGNESIO** | 660 MG | — | — | COMPONENTE | OSTEOARTICULAR |
| INJE ORTO PART 001 | **SULFATO MANGANES** | 10 MG | — | — | COMPONENTE | OSTEOARTICULAR |
| INJE META INOS 002 | **TAURINA** | 200 MG | — | — | COMPONENTE | METABOLICO |
| INJE DERM PCAP 001 | **TAURINA** | 50 MG | — | — | COMPONENTE | DERMATOLOGICO |
| INJE META THER 001 | **TEACRINA** | 50 MG | — | — | COMPONENTE | METABOLICO |
| INJE NUTR TEAC 001 | **TEACRINA** | 50 MG | 2 ML | IM / SC / ID | SIMPLES | ORTOMOLECULAR |
| INJE DERM FATO 001 | **TGF B3** | 1% | — | — | COMPONENTE | DERMATOLOGICO |
| INJE DERM FATO 003 | **TGP2** | 1% | — | — | COMPONENTE | DERMATOLOGICO |
| INJE IMUN TIMO 001 | **TIMOMODULINA** | 50 MG | 2 ML | IM / ID | SIMPLES | IMUNOLOGICO |
| INJE NUTR TRIP 001 | **TRIPEPTIDEO-41** | 60 MG | 2 ML | SC | SIMPLES | ORTOMOLECULAR |
| INJE NUTR VANA 001 | **VANADIO** | 50 MCG | 1 ML | EV / IM / SC / ID | SIMPLES | ORTOMOLECULAR |
| INJE DERM FATO 002 | **VEGF1%** | — | — | — | COMPONENTE | DERMATOLOGICO |
| INJE VITA ADEK 001 | **VITAMINA A** | 50.000 UI | — | — | COMPONENTE | VITAMINICO |
| INJE VITA ADEK 002 | **VITAMINA A** | 50.000 UI | — | — | COMPONENTE | VITAMINICO |
| INJE VITA VITA 001 | **VITAMINA A (PALMITATO DE RETINOL)** | 25.000 UI | 1 ML | IM | SIMPLES | VITAMINICO |
| INJE VITA COMP 001 | **VITAMINA B1** | 8 MG | — | — | COMPONENTE | VITAMINICO |
| INJE VITA VITA 002 | **VITAMINA B1 (TIAMINA)** | 100 MG | 1 ML | EV / IM / SC | SIMPLES | VITAMINICO |
| INJE VITA VITA 007 | **VITAMINA B12 (CIANOCOBALAMINA)** | 2500 MCG | 1 ML | EV / IM / SC | SIMPLES | VITAMINICO |
| INJE VITA COMP 002 | **VITAMINA B2** | 15 MG | — | — | COMPONENTE | VITAMINICO |
| INJE VITA POOL 001 | **VITAMINA B2** | 10MG | — | — | COMPONENTE | VITAMINICO |
| INJE NUTR BIOP 001 | **VITAMINA B2** | 10 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE VITA COMP 001 | **VITAMINA B2** | 2 MG | — | — | COMPONENTE | VITAMINICO |
| INJE VITA VITA 003 | **VITAMINA B2 (RIBOFLAVINA)** | 50 MG | 2 ML | EV / IM | SIMPLES | VITAMINICO |
| INJE VITA COMP 002 | **VITAMINA B3** | 10 MG | — | — | COMPONENTE | VITAMINICO |
| INJE NUTR BIOP 001 | **VITAMINA B3** | 10 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE VITA POOL 001 | **VITAMINA B3** | 30MG | — | — | COMPONENTE | VITAMINICO |
| INJE DERM PILL 001 | **VITAMINA B3** | 10 MG | — | — | COMPONENTE | DERMATOLOGICO |
| INJE DERM PCAP 001 | **VITAMINA B3** | 10 MG | — | — | COMPONENTE | DERMATOLOGICO |
| INJE VITA COMP 001 | **VITAMINA B3** | 40 MG | — | — | COMPONENTE | VITAMINICO |
| INJE VITA VITA 004 | **VITAMINA B3 (NIACINAMIDA)** | 30 MG | 2 ML | EV / IM | SIMPLES | VITAMINICO |
| INJE VITA COMP 001 | **VITAMINA B5** | 6 MG | — | — | COMPONENTE | VITAMINICO |
| INJE VITA POOL 001 | **VITAMINA B5** | 30MG | — | — | COMPONENTE | VITAMINICO |
| INJE DERM PCAP 001 | **VITAMINA B5** | 25 MG | — | — | COMPONENTE | DERMATOLOGICO |
| INJE VITA COMP 002 | **VITAMINA B5** | 50 MG | — | — | COMPONENTE | VITAMINICO |
| INJE VITA VITA 005 | **VITAMINA B5 (D-PANTENOL)** | 40 MG | 2 ML | EV / IM / SC / ID | SIMPLES | VITAMINICO |
| INJE VITA COMP 001 | **VITAMINA B6** | 4 MG | — | — | COMPONENTE | VITAMINICO |
| INJE VITA COMP 002 | **VITAMINA B6** | 10 MG | — | — | COMPONENTE | VITAMINICO |
| INJE VITA POOL 001 | **VITAMINA B6** | 80MG | — | — | COMPONENTE | VITAMINICO |
| INJE NUTR BIOP 001 | **VITAMINA B6** | 10 MG | — | — | COMPONENTE | ORTOMOLECULAR |
| INJE DERM PILL 001 | **VITAMINA B6** | 10 MG | — | — | COMPONENTE | DERMATOLOGICO |
| INJE VITA VITA 006 | **VITAMINA B6 (PIRIDOXINA, CLORIDRATO)** | 100 MG | 2 ML | EV / IM | SIMPLES | VITAMINICO |
| INJE IMUN VITA 001 | **VITAMINA C (ACIDO ASCORBICO)** | 400 MG | 2 ML | EV / IM / SC / ID | SIMPLES | IMUNOLOGICO |
| INJE IMUN VITA 003 | **VITAMINA C (ACIDO ASCORBICO)** | 1 G | 5 ML | EV / IM / SC / ID | SIMPLES | IMUNOLOGICO |
| INJE IMUN VITA 004 | **VITAMINA C (ACIDO ASCORBICO)** | 10 G | 50 ML | EV / IM / SC / ID | SIMPLES | IMUNOLOGICO |
| INJE IMUN VITA 002 | **VITAMINA C (ACIDO ASCORBICO)** | 500 MG | 5 ML | EV / IM / SC / ID | SIMPLES | IMUNOLOGICO |
| INJE VITA ADEK 001 | **VITAMINA D** | 100.000 UI | — | — | COMPONENTE | VITAMINICO |
| INJE VITA ADEK 002 | **VITAMINA D** | 600.000 UI | — | — | COMPONENTE | VITAMINICO |
| INJE VITA VDK2 001 | **VITAMINA D3** | 600.000 UI | — | — | COMPONENTE | VITAMINICO |
| INJE VITA VITA 009 | **VITAMINA D3 (COLECALCIFEROL)** | 600.000 UI | 1 ML | IM | SIMPLES | VITAMINICO |
| INJE VITA VITA 008 | **VITAMINA D3 (COLECALCIFEROL)** | 100.000 UI | 1 ML | IM | SIMPLES | VITAMINICO |
| INJE VITA ADEK 001 | **VITAMINA E** | 500 UI | — | — | COMPONENTE | VITAMINICO |
| INJE VITA ADEK 002 | **VITAMINA E** | 500 UI | — | — | COMPONENTE | VITAMINICO |
| INJE VITA VITA 010 | **VITAMINA E (ALFATOCOFEROL)** | 200 UI | 1 ML | IM | SIMPLES | VITAMINICO |
| INJE VITA VITA 011 | **VITAMINA K1 (FITOMENADIONA)** | 10 MG | 1 ML | IM | SIMPLES | VITAMINICO |
| INJE VITA ADEK 001 | **VITAMINA K2 MK7** | 1300 MCG | — | — | COMPONENTE | VITAMINICO |
| INJE VITA VDK2 001 | **VITAMINA K2 MK7** | 1300 MCG | — | — | COMPONENTE | VITAMINICO |
| INJE VITA ADEK 002 | **VITAMINA K2 MK7** | 1300 MCG | — | — | COMPONENTE | VITAMINICO |
| INJE VITA VITA 012 | **VITAMINA K2-MK7** | 1300 MCG | 1 ML | IM | SIMPLES | VITAMINICO |
| INJE NUTR BIOP 001 | **ZINCO** | 10 MG | — | — | COMPONENTE | ORTOMOLECULAR |

---

### 3.3 FÓRMULAS BLEND (12 itens)

Tabela `formula_blend` — blends padronizados de manipulação.

| Código | Nome | Função | Via | Forma | Posologia | Duração | Objetivo |
|---|---|---|---|---|---|---|---|
| FORM_FOCO_BLND_ORAL_002 | **BLEND FOCO DIA** | FOCO E ENERGIA | VO | CAPSULA | 1 CAPSULA AO ACORDAR | 30 DIAS | MELHORAR FOCO ENERGIA E PRODUTIVIDADE |
| FORM_HEPA_BLND_ORAL_004 | **BLEND HEPATICO** | SUPORTE HEPATICO | VO | CAPSULA | 1 CAPSULA NO ALMOCO E 1 CAPSULA NO JANTAR | 60 DIAS | DESINFLAMAR E PROTEGER FIGADO |
| FORM_META_BLND_ORAL_003 | **BLEND METABOLICO** | METABOLICO EMAGRECIMENTO | VO | CAPSULA | 1 CAPSULA 30 MIN ANTES DO ALMOCO E JANTAR | 60 DIAS | AJUDAR SACIEDADE E SENSIBILIDADE INSULINICA |
| FORM_SONO_BLND_ORAL_001 | **BLEND SONO NOITE** | SONO RESTAURACAO | VO | CAPSULA | 1 CAPSULA 1 HORA ANTES DE DORMIR | 30 DIAS | MELHORAR SONO E RECUPERACAO |
| BLEND-ANTIOX-01 | **Formula Antioxidante Master** | Antioxidante sistêmico | VO | CAPSULA | 2 capsulas 2x/dia | 90 dias | Reduzir estresse oxidativo e inflamacao cronica |
| BLEND-DETOX-01 | **Formula Hepato-Detox** | Detoxificação hepática | VO | PO | 1 sache diluido em agua manha | 30 dias | Suporte fase I e II detoxificacao hepatica |
| BLEND-IMUNE-01 | **Formula Imunomoduladora** | Suporte imunológico | VO | LIQUIDO | 5ml 2x/dia sublingual | 90 dias | Modular resposta imune e reduzir autoimunidade |
| BLEND-METAB-01 | **Formula Metabolica Integrativa** | Otimização metabólica | VO | CAPSULA | 2 capsulas almoco | 90 dias | Melhorar sensibilidade insulinica e metabolismo lipidico |
| BLEND-NEURO-01 | **Formula Neuroprotetora** | Suporte cognitivo e neuroproteção | VO | CAPSULA | 1 capsula manha e 1 noite | 120 dias | Otimizar funcao cognitiva e neuroplasticidade |
| BLEND-SLEEP-01 | **Formula Sono Reparador** | Regulação do ciclo sono-vigília | VO | CAPSULA | 2 capsulas 30min antes dormir | 60 dias | Melhorar qualidade do sono e reduzir latencia |
| BLEND-HORM-F01 | **Formula Suporte Hormonal Feminino** | Modulação hormonal feminina | VO | CAPSULA | 1 capsula 2x/dia | 60 dias | Equilibrar eixo HPG feminino |
| BLEND-HORM-M01 | **Formula Suporte Hormonal Masculino** | Modulação hormonal masculina | VO | CAPSULA | 1 capsula 2x/dia | 90 dias | Otimizar eixo HPG masculino |

---

### 3.4 IMPLANTES (32 itens)

Tabela `implantes` — implantes hormonais subcutâneos.

| Código | Nome implante | Substância ativa | Dosagem | Liberação/dia | Tempo ação | Indicação |
|---|---|---|---|---|---|---|
| IMPL HORM ANAS 002 | **ANASTROZOL PELLET** | ANASTROZOL | 10MG | 0,08-0,1MG/DIA | 4 A 6 MESES | AROMATIZACAO / HIPERESTROGENISMO |
| IMPL HORM ANAS 001 | **ANASTROZOL PELLET** | ANASTROZOL | 5MG | 0,04MG/DIA | 4 A 6 MESES | AROMATIZACAO / HIPERESTROGENISMO |
| IMPL NEUR BUPR 001 | **BUPROPIONA PELLET** | BUPROPIONA | 200MG | — | 4 A 6 MESES | COMPULSAO / OBESIDADE |
| IMPL HORM DHEA 001 | **DHEA PELLET** | DHEA | 200MG | 1-1,2MG/DIA | 4 A 6 MESES | ENERGIA / LIBIDO / ENVELHECIMENTO |
| IMPL HORM ESTR 001 | **ESTRADIOL PELLET** | ESTRADIOL | 12,5MG | 0,1MG/DIA | 4 A 6 MESES | HIPOESTROGENISMO / MENOPAUSA |
| IMPL HORM ESTR 002 | **ESTRADIOL PELLET** | ESTRADIOL | 25MG | 0,2MG/DIA | 4 A 6 MESES | HIPOESTROGENISMO / MENOPAUSA |
| IMPL HORM ESTR 003 | **ESTRIOL PELLET** | ESTRIOL | 75MG | 0,4MG/DIA | 4 A 6 MESES | MENOPAUSA / SUPORTE ESTROGENICO |
| IMPL HORM GEST 003 | **GESTRINONA PELLET** | GESTRINONA | 50MG | 0,2-0,3MG/DIA | 4 A 6 MESES | ENDOMETRIOSE / AMENORREIA / SOP / MASSA MAGRA |
| IMPL HORM GEST 001 | **GESTRINONA PELLET** | GESTRINONA | 25MG | 0,2-0,3MG/DIA | 2 A 3 MESES | ENDOMETRIOSE / AMENORREIA / SOP / MASSA MAGRA |
| IMPL HORM GEST 002 | **GESTRINONA PELLET** | GESTRINONA | 35MG | 0,2-0,3MG/DIA | 2 A 3 MESES | ENDOMETRIOSE / AMENORREIA / SOP / MASSA MAGRA |
| IMPL HORM HCGX 001 | **HCG PELLET** | HCG | 5000UI | 100-125UI/DIA | 40 A 60 DIAS | SUPORTE GONADAL / FERTILIDADE |
| IMPL HORM HCGX 002 | **HCG PELLET** | HCG | 10000UI | 100-125UI/DIA | 90 A 120 DIAS | SUPORTE GONADAL / FERTILIDADE |
| IMPL NUTR CORT 001 | **HIDROCORTISONA PELLET** | HIDROCORTISONA | 200MG | 1,0-1,5MG/DIA | 4 A 6 MESES | SUPORTE ADRENAL |
| IMPL NUTR CORT 003 | **HIDROCORTISONA PELLET** | HIDROCORTISONA | 50MG | 0,4MG/DIA | 4 A 6 MESES | SUPORTE ADRENAL |
| IMPL NUTR CORT 002 | **HIDROCORTISONA PELLET** | HIDROCORTISONA | 100MG | 0,8-1MG/DIA | 4 A 6 MESES | SUPORTE ADRENAL |
| IMPL NEUR MELA 001 | **MELATONINA PELLET** | MELATONINA | 100MG | 0,5-0,8MG/DIA | 4 A 6 MESES | SONO / RITMO CIRCADIANO |
| IMPL META METF 002 | **METFORMINA + SITAGLIPTINA PELLET** | METFORMINA + SITAGLIPTINA | 150+50MG | 0,8MG/DIA + 0,2MG/DIA | 4 A 6 MESES | RESISTENCIA INSULINICA / OBESIDADE |
| IMPL META METF 001 | **METFORMINA PELLET** | METFORMINA | 200MG | 1,0-1,5MG/DIA | 4 A 6 MESES | RESISTENCIA INSULINICA |
| IMPL NEUR NADH 001 | **NADH PELLET** | NADH | 200MG | 0,8-1,0MG/DIA | 4 A 6 MESES | ENERGIA / COGNICAO |
| IMPL META NALT 001 | **NALTREXONA PELLET** | NALTREXONA | 100MG | — | 4 A 6 MESES | COMPULSAO / OBESIDADE |
| IMPL HORM PREG 001 | **PREGNENOLONA PELLET** | PREGNENOLONA | 200MG | 1,1-1,6MG/DIA | 4 A 6 MESES | NEUROESTEROIDE / FADIGA |
| IMPL HORM PROG 003 | **PROGESTERONA PELLET** | PROGESTERONA | 50MG | 0,4MG/DIA | 4 A 6 MESES | TPM / MENOPAUSA / OPOSICAO ESTROGENICA |
| IMPL HORM PROG 001 | **PROGESTERONA PELLET** | PROGESTERONA | 200MG | 1,0-1,5MG/DIA | 4 A 6 MESES | TPM / MENOPAUSA / OPOSICAO ESTROGENICA |
| IMPL HORM PROG 002 | **PROGESTERONA PELLET** | PROGESTERONA | 100MG | 0,8-1,0MG/DIA | 4 A 6 MESES | TPM / MENOPAUSA / OPOSICAO ESTROGENICA |
| IMPL META SITA 001 | **SITAGLIPTINA PELLET** | SITAGLIPTINA | 200MG | 1,1-1,6MG/DIA | 4 A 6 MESES | CONTROLE GLICEMICO |
| IMPL HORM T3T4 001 | **T3+T4 PELLET** | T3+T4 | VARIAVELMG | — | 4 A 6 MESES | METABOLISMO / TIREOIDE |
| IMPL NUTR TADA 003 | **TADALAFIL PELLET** | TADALAFIL | 200MG | 1,0-1,5MG/DIA | 4 A 6 MESES | PERFUSAO / LIBIDO |
| IMPL NUTR TADA 001 | **TADALAFIL PELLET** | TADALAFIL | 25MG | 0,2MG/DIA | 4 A 6 MESES | PERFUSAO / LIBIDO |
| IMPL NUTR TADA 002 | **TADALAFIL PELLET** | TADALAFIL | 50MG | 0,4MG/DIA | 4 A 6 MESES | PERFUSAO / LIBIDO |
| IMPL HORM TEST 002 | **TESTOSTERONA PELLET** | TESTOSTERONA | 150MG | 1-1,2MG/DIA | 4 A 6 MESES | MASSA MAGRA / HIPOANDROGENISMO / PERFORMANCE |
| IMPL HORM TEST 001 | **TESTOSTERONA PELLET** | TESTOSTERONA | 200MG | 1-1,2MG/DIA | 4 A 6 MESES | MASSA MAGRA / HIPOANDROGENISMO / PERFORMANCE |
| IMPL HORM TEST 003 | **TESTOSTERONA PELLET** | TESTOSTERONA | 75MG | 0,6MG/DIA | 4 A 6 MESES | MASSA MAGRA / HIPOANDROGENISMO / PERFORMANCE |

---

## 🏥 4. SUGESTÃO: "LAPAROTOMIA" — área de cadastro/edição massiva

**Proposta do Caio:** em vez de uma `Craniotomia` (que é o nome do mockup atual de revisão visual no canvas-sandbox), criar uma `Laparotomia` — uma interface tipo planilha gigante onde o Dr. Claude (e o Caio) podem editar em massa os textos descritivos das 527 substâncias/injetáveis/blends/implantes.

**Como deveria funcionar (arquitetura proposta):**

- Componente novo: `artifacts/mockup-sandbox/src/components/mockups/laparotomia/LaparotomiaV1.tsx`
- Layout: grid editável tipo Airtable, 1 linha por item, colunas dinâmicas por tipo de catálogo
- 4 abas verticais: `SUBSTÂNCIAS (15)` · `INJETÁVEIS (305)` · `BLENDS (12)` · `IMPLANTES (32)`
- Por linha: nome, código, função/indicação, posologia/dose, contraindicação, evidência, **e os 8-10 sliders de estrelas por sistema** (longevidade/sono/energia/libido/performance/força/clareza/pele/imune)
- Edição inline com debounce 500ms → PATCH `/api/catalogo/:tipo/:id`
- Backend já tem as rotas CRUD do Catálogo (vide replit.md "Full CRUD Editing")
- Acesso pro Dr. Claude: link de acesso restrito via JWT temporário ou via integração de canvas-sandbox

**Como Dr. Claude teria acesso:**
- Opção A (mais simples): exportar este markdown + JSON do catálogo via Drive (anyone reader) — Dr. Claude lê, devolve sugestões de texto, Caio aplica via `LaparotomiaV1`
- Opção B (mais sofisticada): API key dedicada `DR_CLAUDE_API_KEY` que permite PATCH só nas colunas de texto descritivo (não em preço/dose/via — campos clínicos críticos ficam read-only pro IA)
- Opção C (longo prazo): integração via MCP server expondo `listSubstancias()`, `updateDescricao(id, texto)`, `setEstrelaSistema(id, sistema, n)` — Dr. Claude trabalha direto

**Recomendação minha:** começar com Opção A pra demo amanhã (este pacote já resolve), evoluir pra Opção B na semana que vem, Opção C como visão longa.

---

## 📥 5. PRÓXIMOS PASSOS PRA DR. CLAUDE

1. **Ler este documento inteiro** — entender catálogo + template V8 + estrutura RAS
2. **Visualizar a amostra V8** no link acima (mockup NAD+ pra Carlúcia)
3. **Escrever os textos descritivos** das substâncias que faltam (algumas têm `descricao` vazio na tabela)
4. **Atribuir estrelas 0-5** nos 8 sistemas pra cada substância (algumas estão zeradas)
5. **Escrever roteiro narrativo** dos 4 blocos pra cada substância: "Por que esta substância" · "Como atua no organismo" · "Impacto esperado por sistema" · "Posologia & contraindicações"
6. **Devolver:** 1 arquivo markdown por substância + 1 JSON com os ratings → Caio cola na Laparotomia

---

## 📚 6. ARQUIVOS DE REFERÊNCIA NO REPO

- `replit.md` — visão geral PAWARDS/PADCON
- `docs/dr-claude/` — pasta com briefings, decisões tomadas/pendentes, arquitetura macro
- `docs/dr-claude/03_ARQUITETURA_GERAL_DO_CODIGO.md` — mapa macro→micro do código real
- `artifacts/api-server/src/pdf/` — todos os geradores de PDF
- `scripts/src/mockup-substancia-v8-pastel-numerais.ts` — template V8 fonte

---

*Gerado em 18/mai/2026 por Replit Agent · Wave V25 PADCOM · Pacote bootstrap Dr. Claude*