# 09 — CATÁLOGO CLÍNICO ESTRATIFICADO (2 VISÕES + DOMÍNIOS COMPLETOS)

> **Briefing pro Dr. Claude** — Catálogo PADCOM V4.0 nas duas estratificações
> pedidas pelo Dr. Caio: **BLOCO → GRADE → EXAME** e **EXAME → GRADE → BLOCO**.
> Plus: catálogo completo de fórmulas, soros, implantes, sintomas, doenças, dietas e cirurgias.
> Fonte: Dr. Manus V14.1 AUDITORIA SEMÂNTICA (11/04/2026), planilha
> `attached_assets/planilha_blocos_csv/` (14 CSVs, 1.212 linhas) + snapshot DB 17/05/2026.

---

## 0. RESUMO QUANTITATIVO

| Domínio | Itens V4 (CSV) | Itens DB hoje | Coverage motor |
|---|---:|---:|---:|
| EXAMES | 233 | 280 | 8/233 (3,4%) |
| INJETÁVEIS | 162 | 305 | 1/162 (0,6%) |
| IMPLANTES (pellets) | 32 | 32 | 0/32 (0%) |
| ENDOVENOSOS (soros) | 11 | 63 | 0/11 (0%) |
| FÓRMULAS | 11 | 54 | 3/11 (27%) |
| DOENÇAS | 49 | 58 | 5/49 (10%) |
| SINTOMAS | 10 | 10 | 6/10 (60%) |
| CIRURGIAS | 3 | — | 0 |
| DIETAS | 12 | — | 0 |
| BLOCOS | 31 | 62 (V13+V4) | 7/31 (23%) |
| **TOTAL CATÁLOGO** | **554** | **1.272** | **— quase nada usado** |
| NICKS B4 únicos | 373 | — | — |

---

## 1. REGRA UNIVERSAL DE NOMENCLATURA V4.0 (Dr. Manus)

```
FORMATO:  XXXX XXXX XXXX XXXX NNNN
          B1   B2   B3   B4   SEQ
```

| Pos | Nome | Significado | Tamanho | Regra | Exemplo |
|---|---|---|---|---|---|
| B1 | DOMÍNIO | O que é (tipo) | 4 letras | Fixo por tipo | `EXAM` |
| B2 | ÁREA/BLOCO | Sistema clínico | 4 letras | Correlação clínica | `TIRE` |
| B3 | FUNÇÃO/GRADE | Grade do exame ou função | 4 letras | Ação/propósito | `GBAS` |
| B4 | NICK | Identificador da substância | 4 letras | Alfabético do nome real | `TSHX` |
| SEQ | SEQUENCIAL | Sequência OU dosagem(mg) | 4 dígitos | mg em injetável/implante | `0001` |

**Regras especiais:**
- Separador: espaço simples. MAIÚSCULAS, sem acento.
- Letras < 4 → completar com `X` (`TSH` → `TSHX`).
- `SEQ` em injetável/implante = dosagem em mg (`0010=10mg`, `0300=300mg`, `1000=1g`).
- Exclusividade exame: 1 exame = 1 bloco + 1 grade (grade mais baixa onde aparece). Grades superiores herdam.

### Vocabulário fixo B1 (DOMÍNIO)
```
EXAM Exame         INJE Injetável     IMPL Implante      FORM Fórmula
ENDO Endovenoso    DOEN Doença        SINT Sintoma       CIRU Cirurgia
DIET Dieta         BLCO Bloco         PROC Protocolo     JURI Jurídico
PSIC Psicologia    RECO Recorrência   PAGA Pagamento     FISC Fiscal
DADO Identificação
```

### Vocabulário fixo B3 (GRADE) — exclusivo de exames
```
GBAS GRADE BASICA          (check-up, primeira consulta)
GINT GRADE INTERMEDIARIA   (aprofundamento diagnóstico)
GAMP GRADE AMPLIADA        (investigação avançada)
GSOF GRADE SOFISTICADA     (alta complexidade, genética)
SGRD SEM GRADE             (imagem, endoscopia)
```

---

## 2. 📊 VISÃO 1 — BLOCO → GRADE → EXAME (funil fechando)

> Como o médico **prescreve check-up**: escolhe o bloco, depois aprofunda a grade.
> **Fonte completa:** `attached_assets/planilha_blocos_csv/02_exames_bloco_grade_exame.csv` (233 exames em 31 blocos).
> Raw URL canônica: `https://raw.githubusercontent.com/<repo>/main/attached_assets/planilha_blocos_csv/02_exames_bloco_grade_exame.csv`

### 2.1. Mapa de todos os 31 blocos

| # | BLOCO | Nome | Usa grade? | Tipo macro | Total exames |
|--:|---|---|:-:|---|--:|
| 1 | BLK0001 | BLOCO BASE INTEGRATIVA | SIM | GERAL | 44 |
| 2 | BLK0002 | BLOCO TIREOIDE | SIM | ENDOCRINO | 21 |
| 3 | BLK0003 | BLOCO GLICEMICO INSULINICO | SIM | METABOLICO | 11 |
| 4 | BLK0004 | BLOCO HEPATICO ESPECIFICO | SIM | HEPATICO | 8 |
| 5 | BLK0005 | BLOCO LIPIDICO CARDIOMETABOLICO | SIM | CARDIOMETABOLICO | 23 |
| 6 | BLK0006 | BLOCO GONADAL | SIM | HORMONAL / UROGINECO | 26 |
| 7 | BLK0007 | BLOCO PROSTATA | SIM | HORMONAL / UROGINECO | 2 |
| 8 | BLK0008 | BLOCO ADRENAL ESPECIFICO | SIM | ENDOCRINO | 13 |
| 9 | BLK0009 | BLOCO SALIVAR ADRENAL | SIM | ENDOCRINO | 4 |
| 10 | BLK0010 | BLOCO DEFICIENCIA ABSORCAO | SIM | NUTRICIONAL FUNCIONAL | 9 |
| 11 | BLK0011 | BLOCO TROMBOSE | SIM | HEMATOLOGICO | 17 |
| 12 | BLK0012 | BLOCO COAGULOGRAMA | SIM | HEMATOLOGICO | 5 |
| 13 | BLK0013 | BLOCO MARCADORES CANCERIGENOS | SIM | ONCOLOGICO | 20 |
| 14 | BLK0014 | BLOCO RENAL ESPECIFICO | SIM | RENAL | 9 |
| 15 | BLK0015 | BLOCO GRAVIDEZ | SIM | HORMONAL / UROGINECO | 1 |
| 16 | BLK0016 | BLOCO DST | SIM | INFECTOLOGICO | 31 |
| 17 | BLK0017 | BLOCO AUTOIMUNE | SIM | IMUNOLOGICO | 23 |
| 18 | BLK0018 | BLOCO GENETICA POLIMORFISMOS | SIM | GENETICA | 17 |
| 19 | BLK0019 | BLOCO FARMACOGENETICA | SIM | GENETICA | 19 |
| 20 | BLK0020 | BLOCO METAIS TOXICOS | SIM | TOXICOLOGICO | 15 |
| 21 | BLK0021 | BLOCO VITAMINAS | SIM | MICRONUTRIENTES | 10 |
| 22 | BLK0022 | BLOCO MINERAIS COFACTORES | SIM | MICRONUTRIENTES | 12 |
| 23 | BLK0023 | BLOCO SALIVAR HORMONAL | SIM | GERAL | 3 |
| 24 | BLK0024 | BLOCO ULTRASSOM | NÃO | IMAGEM | 19 |
| 25 | BLK0025 | BLOCO TOMOGRAFIA | NÃO | IMAGEM | 12 |
| 26 | BLK0026 | BLOCO RESSONANCIA MAGNETICA | NÃO | IMAGEM | 12 |
| 27 | BLK0027 | BLOCO CARDIOLOGICOS DE IMAGEM | NÃO | GERAL | 9 |
| 28 | BLK0028 | BLOCO ENDOSCOPICOS | NÃO | PROCEDIMENTO | 7 |
| 29 | BLK0029 | BLOCO RX | NÃO | IMAGEM | 4 |
| 30 | BLK0030 | BLOCO MAMOGRAFIA | NÃO | IMAGEM | 2 |
| 31 | BLK0031 | BLOCO DENSITOMETRIA | NÃO | IMAGEM | 1 |

### 2.2. AMOSTRAS — primeiros blocos desdobrados em grade → exame

#### BLK0001 — BLOCO BASE INTEGRATIVA (44 exames)
**GRADE BÁSICA (14 exames):**
```
EXAM BINT GBAS AMIL 0001  AMILASE
EXAM BINT GBAS BILT 0001  BILIRRUBINAS TOTAIS E FRACOES
EXAM BINT GBAS CREA 0001  CREATININA
EXAM BINT GBAS FOAL 0001  FA (FOSFATASE ALCALINA)
EXAM BINT GBAS FERR 0001  FERRITINA
EXAM BINT GBAS FESE 0001  FERRO SERICO
EXAM BINT GBAS GGTP 0001  GAMA GT
EXAM BINT GBAS HBA1 0001  HEMOGLOBINA GLICADA
EXAM BINT GBAS HEMG 0001  HEMOGRAMA
EXAM BINT GBAS TGOX 0001  TGO
EXAM BINT GBAS TGPX 0001  TGP
EXAM BINT GBAS UREI 0001  UREIA
EXAM BINT GBAS VB12 0001  VITAMINA B12
EXAM BINT GBAS VITD 0001  VITAMINA D
```
**GRADE INTERMEDIÁRIA (+1):**
```
EXAM BINT GINT TIPA 0001  TIPAGEM SANGUINEA ABO RH
```
(+ GRADE AMPLIADA + GRADE SOFISTICADA — ver CSV completo)

#### BLK0002 — BLOCO TIREOIDE (21 exames)
**GRADE BÁSICA (3):**
```
EXAM TIRE GBAS T3LV 0001  T3 LIVRE
EXAM TIRE GBAS T4LV 0001  T4 LIVRE
EXAM TIRE GBAS TSHX 0001  TSH
```
(+ INTERMEDIÁRIA, AMPLIADA, SOFISTICADA — TPO, TGB, anti-TG, T3 reverso, calcitonina, etc.)

#### BLK0027 — BLOCO CARDIOLÓGICOS DE IMAGEM (sem grade, 9 exames)
```
EXAM CIMG SGRD ANTC 0001  ANGIOTOMOGRAFIA CORONARIANA
(+ 8 exames: ECG, ECO, Holter, Teste Ergométrico, etc.)
```

> 💾 **Os 233 exames inteiros estão no CSV** — Dr. Claude lê via raw, não cabem em markdown.

---

## 3. 📊 VISÃO 2 — EXAME → GRADE → BLOCO (funil abrindo)

> Como o paciente **pergunta**: "tenho esse exame, em que bloco ele cai?"
> **Fonte completa:** `attached_assets/planilha_blocos_csv/03_exames_exame_grade_bloco.csv` (233 exames ordenados alfabeticamente).

Estrutura (formato CSV):
```
NOME EXAME                   | CODIGO V4.0                  | GRADE              | BLOCO    | NOME BLOCO
17 OH PROGESTERONA           | EXAM ADRE GSOF 17OH 0001     | GRADE SOFISTICADA  | BLK0008  | BLOCO ADRENAL ESPECIFICO
ACIDO METILMALONICO          | EXAM DABS GSOF AMML 0001     | GRADE SOFISTICADA  | BLK0010  | BLOCO DEFICIENCIA ABSORCAO
ACTH                         | EXAM ADRE GINT ACTH 0001     | GRADE INTERMEDIARIA| BLK0008  | BLOCO ADRENAL ESPECIFICO
AFP                          | EXAM ONCO GBAS AFPX 0001     | GRADE BASICA       | BLK0013  | BLOCO MARCADORES CANCERIGENOS
ALDOSTERONA                  | EXAM ADRE GINT ALDO 0001     | GRADE INTERMEDIARIA| BLK0008  | BLOCO ADRENAL ESPECIFICO
ALUMINIO                     | EXAM TOXI GBAS ALUM 0001     | GRADE BASICA       | BLK0020  | BLOCO METAIS TOXICOS
AMILASE                      | EXAM BINT GBAS AMIL 0001     | GRADE BASICA       | BLK0001  | BLOCO BASE INTEGRATIVA
ANCA C                       | EXAM AUTO GSOF ANCC 0001     | GRADE SOFISTICADA  | BLK0017  | BLOCO AUTOIMUNE
ANCA P                       | EXAM AUTO GSOF ANCP 0001     | GRADE SOFISTICADA  | BLK0017  | BLOCO AUTOIMUNE
ANGIORRESSONANCIA            | EXAM RESS SGRD ANGR 0001     | SEM GRADE          | BLK0026  | BLOCO RESSONANCIA MAGNETICA
ANGIOTOMOGRAFIA              | EXAM TOMO SGRD ANGI 0001     | SEM GRADE          | BLK0025  | BLOCO TOMOGRAFIA
ANGIOTOMOGRAFIA CORONARIANA  | EXAM CIMG SGRD ANTC 0001     | SEM GRADE          | BLK0027  | BLOCO CARDIOLOGICOS DE IMAGEM
ANTI DNA                     | EXAM AUTO GINT ADNA 0001     | GRADE INTERMEDIARIA| BLK0017  | BLOCO AUTOIMUNE
...
```

> 💾 **CSV completo no raw GitHub** — 233 linhas, ordem alfabética por nome do exame.

---

## 4. 📦 DEMAIS DOMÍNIOS (INLINE COMPLETO)

### 4.1. FÓRMULAS MANIPULADAS (11 itens V4)

| # | CÓDIGO V4.0 | NOME REAL | LEGADO V13 |
|--:|---|---|---|
| 1 | `FORM GERA MODU DRE1 0001` | FÓRMULA DRENAGEM E MODULAÇÃO INFLAMATÓRIA | FORM INFL DREN 001 |
| 2 | `FORM GERA MANI FOCO 0001` | FÓRMULA FOCO E DESEMPENHO COGNITIVO | FORM NEUR FOCO 001 |
| 3 | `FORM INTE REPA INTE 0001` | FÓRMULA INTESTINO REPARAÇÃO FASE 1 | FORM INTE ATAQ 001 |
| 4 | `FORM NEUR MODU MODU 0001` | FÓRMULA MODULAÇÃO ANSIEDADE BASE | FORM NEUR CALM 001 |
| 5 | `FORM HORM MODU MOD1 0001` | FÓRMULA MODULAÇÃO HORMONAL BASE | FORM HORM MODU 001 |
| 6 | `FORM PERF SUPO PRET 0001` | FÓRMULA PRÉ TREINO SUPORTE | FORM PERF SUPO 001 |
| 7 | `FORM GERA REPO REPO 0001` | FÓRMULA REPOSIÇÃO MINERAL BASE | FORM MINE REPO 001 |
| 8 | `FORM NEUR MANI SONO 0001` | FÓRMULA SONO E RECUPERAÇÃO | FORM NEUR SONO 001 |
| 9 | `FORM ESTE SUPO SUPO 0001` | FÓRMULA SUPORTE CAPILAR BASE | FORM ESTE CAPI 001 |
| 10 | `FORM META SUPO SUP1 0001` | FÓRMULA SUPORTE METABÓLICO | FORM META SUPO 001 |
| 11 | `FORM TIRE MODU SUP2 0001` | FÓRMULA SUPORTE TIREOIDE MODULAÇÃO BASE | FORM TIRE MODU 001 |

### 4.2. IMPLANTES — PELLETS (32 itens, todos B2=HORM B3=SUBC)

| # | CÓDIGO V4.0 | SUBSTÂNCIA | LEGADO |
|--:|---|---|---|
| 1 | `IMPL HORM SUBC ANAS 0001` | ANASTROZOL | IMPL HORM ANAS 001/002 |
| 3 | `IMPL HORM SUBC BUPR 0001` | BUPROPIONA | IMPL NEUR BUPR 001 |
| 4 | `IMPL HORM SUBC DHEA 0001` | DHEA | IMPL HORM DHEA 001 |
| 5 | `IMPL HORM SUBC ESTR 0001` | ESTRADIOL / ESTRIOL (3 dosagens) | IMPL HORM ESTR 001..003 |
| 8 | `IMPL HORM SUBC GEST 0001` | GESTRINONA (3 dosagens) | IMPL HORM GEST 001..003 |
| 11 | `IMPL HORM SUBC HCGX 0001` | HCG (2 dosagens) | IMPL HORM HCGX 001/002 |
| 13 | `IMPL HORM SUBC HIDR 0001` | HIDROCORTISONA (3 dosagens) | IMPL NUTR CORT 001..003 |
| 16 | `IMPL HORM SUBC MELA 0001` | MELATONINA | IMPL NEUR MELA 001 |
| 17 | `IMPL HORM SUBC METF 0001` | METFORMINA + SITAGLIPTINA | IMPL META METF 002 |
| 18 | `IMPL HORM SUBC MET1 0001` | METFORMINA | IMPL META METF 001 |
| 19 | `IMPL HORM SUBC NADH 0001` | NADH | IMPL NEUR NADH 001 |
| 20 | `IMPL HORM SUBC NALT 0001` | NALTREXONA | IMPL META NALT 001 |
| 21 | `IMPL HORM SUBC PREG 0001` | PREGNENOLONA | IMPL HORM PREG 001 |
| 22 | `IMPL HORM SUBC PROG 0001` | PROGESTERONA (3 dosagens) | IMPL HORM PROG 001..003 |
| 25 | `IMPL HORM SUBC SITA 0001` | SITAGLIPTINA | IMPL META SITA 001 |
| 26 | `IMPL HORM SUBC T3T4 0001` | T3+T4 | IMPL HORM T3T4 001 |
| 27 | `IMPL HORM SUBC TADA 0001` | TADALAFIL (3 dosagens) | IMPL NUTR TADA 001..003 |
| 30 | `IMPL HORM SUBC TEST 0001` | TESTOSTERONA (3 dosagens) | IMPL HORM TEST 001..003 |

### 4.3. ENDOVENOSOS — SOROS (11 itens, todos B2=SORO B3=TERA)

| # | CÓDIGO V4.0 | NOME REAL | LEGADO |
|--:|---|---|---|
| 1 | `ENDO SORO TERA AMIN 0001` | SORO AMINOÁCIDOS ESSENCIAIS | ENDO NUTR AMIN 001 |
| 2 | `ENDO SORO TERA ANT3 0001` | SORO ANTI-INFLAMATÓRIO MODULADOR | ENDO INFL MODU 001 |
| 3 | `ENDO SORO TERA OXID 0001` | SORO ANTIOXIDANTE PADRÃO | ENDO NUTR OXID 001 |
| 4 | `ENDO SORO TERA DETO 0001` | SORO DETOX HEPÁTICO | ENDO HEPA DETO 001 |
| 5 | `ENDO SORO TERA COGN 0001` | SORO FOCO COGNITIVO | ENDO NEUR FOCO 001 |
| 6 | `ENDO SORO TERA IMUN 0001` | SORO IMUNIDADE BASE | ENDO IMUN BASE 001 |
| 7 | `ENDO SORO TERA META 0001` | SORO METABÓLICO EMAGRECIMENTO | ENDO META EMAG 001 |
| 8 | `ENDO SORO TERA MITO 0001` | SORO MITOCONDRIAL LONGEVIDADE | ENDO MITO LONG 001 |
| 9 | `ENDO SORO TERA PELE 0001` | SORO PELE CABELO UNHAS | ENDO BELE SUPR 001 |
| 10 | `ENDO SORO TERA ENER 0001` | SORO PERFORMANCE ENERGÉTICO | ENDO PERF ENER 001 |
| 11 | `ENDO SORO TERA RECU 0001` | SORO RECUPERAÇÃO MUSCULAR | ENDO PERF RECU 001 |

### 4.4. SINTOMAS / QUEIXAS (10 itens — fonte direta da anamnese Q012)

| # | CÓDIGO V4.0 | NOME REAL |
|--:|---|---|
| 1 | `SINT NEUR CEFA 001` | CEFALEIA |
| 2 | `SINT UROG DISP 001` | DISPAREUNIA |
| 3 | `SINT CARD DISP 001` | DISPNEIA |
| 4 | `SINT OSMU DORL 001` | DOR LOMBAR |
| 5 | `SINT CARD EDEM 001` | EDEMA DE PERNAS |
| 6 | `SINT META FADI 001` | FADIGA |
| 7 | `SINT NEUR MEMO 001` | FALHA DE MEMÓRIA |
| 8 | `SINT ENDO FRIO 001` | INTOLERÂNCIA AO FRIO |
| 9 | `SINT AUTO PRUR 001` | PRURIDO |
| 10 | `SINT RESP TOSS 001` | TOSSE |

> ⚠️ **Apenas 10 sintomas catalogados** — pra um motor robusto, faltam dezenas (insônia, ansiedade, ganho de peso, libido, queda de cabelo, distensão, refluxo, palpitação, etc.). Vários **JÁ APARECEM em `regras_motor.palavra_chave`** mas **NÃO existem em `sintomas`** — gap de seed.

### 4.5. DOENÇAS / DIAGNÓSTICOS (49 itens, com mapeamento bloco-motor)

| GRUPO | DOENÇA | CÓDIGO V4.0 | BLOCOS MOTOR |
|---|---|---|---|
| Metabólicas | OBESIDADE | `DOEN META OBES 001 0001` | BLK003 / BLK005 / BLK021 / BLK022 |
| Metabólicas | RESISTÊNCIA INSULÍNICA | `DOEN META RINS 001 0001` | BLK003 / BLK005 / BLK021 / BLK022 |
| Metabólicas | DIABETES TIPO 2 | `DOEN META DIAT 001 0001` | BLK003 / BLK005 / BLK021 / BLK022 |
| Metabólicas | PRÉ-DIABETES | `DOEN META PRED 001 0001` | BLK003 / BLK005 / BLK021 / BLK022 |
| Metabólicas | DISLIPIDEMIA | `DOEN META LIPI 001 0001` | BLK003 / BLK021 |
| Metabólicas | SÍNDROME METABÓLICA | `DOEN META SIND 001 0001` | BLK003 / BLK005 / BLK021 / BLK022 |
| Tireoide | HIPOTIREOIDISMO | `DOEN TIRE HIPO 001 0001` | BLK002 |
| Tireoide | TIREOIDITE DE HASHIMOTO | `DOEN TIRE HASH 001 0001` | BLK002 |
| Tireoide | HIPERTIREOIDISMO | `DOEN TIRE HIPR 001 0001` | BLK002 |
| Ginecológicas | ENDOMETRIOSE | `DOEN GINE ENDO 001 0001` | BLK006 / BLK015 |
| Ginecológicas | ADENOMIOSE | `DOEN GINE ADEN 001 0001` | BLK006 / BLK015 |
| Ginecológicas | SOP (ovário policístico) | `DOEN GINE SOPC 001 0001` | BLK006 / BLK021 |
| Ginecológicas | MENOPAUSA / CLIMATÉRIO | `DOEN GINE MENO 001 0001` | BLK006 / BLK007 |
| Ginecológicas | TPM IMPORTANTE | `DOEN GINE TPMX 001 0001` | BLK006 |
| Andrológicas | HIPOGONADISMO MASCULINO | `DOEN ANDR HIPO 001 0001` | BLK006 / BLK007 |
| Andrológicas | DISFUNÇÃO ERÉTIL | `DOEN ANDR ERET 001 0001` | BLK007 |
| Neurocognitivas | TDAH | `DOEN NEUR TDAH 001 0001` | BLK008 / BLK009 |
| Psiquiátricas | ANSIEDADE | `DOEN PSIQ ANSI 001 0001` | BLK009 / BLK010 |
| Psiquiátricas | DEPRESSÃO | `DOEN PSIQ DEPR 001 0001` | BLK009 / BLK010 |
| Neurocognitivas | INSÔNIA | `DOEN NEUR INSO 001 0001` | BLK009 |
| Neurocognitivas | ENXAQUECA | `DOEN NEUR ENXA 001 0001` | BLK008 / BLK010 |
| Intestinais | CONSTIPAÇÃO | `DOEN INTE CONS 001 0001` | BLK011 / BLK012 |
| Intestinais | DISTENSÃO ABDOMINAL | `DOEN INTE DIST 001 0001` | BLK011 / BLK012 |
| Intestinais | DISBIOSE | `DOEN INTE DISB 001 0001` | BLK011 / BLK012 |
| Intestinais | REFLUXO | `DOEN INTE REFL 001 0001` | BLK011 |
| Cardiovasculares | HIPERTENSÃO | `DOEN CARD HIPA 001 0001` | BLK013 / BLK021 |
| Cardiovasculares | PALPITAÇÃO | `DOEN CARD PALP 001 0001` | BLK013 |
| Inflamatórias | DOR CRÔNICA | `DOEN INFL DORC 001 0001` | BLK014 / BLK024 |
| Inflamatórias | ARTRALGIA | `DOEN INFL ARTR 001 0001` | BLK014 / BLK024 |
| Estéticas | LIPOEDEMA | `DOEN ESTE LIPE 001 0001` | BLK024 / BLK031 |
| Estéticas | ALOPECIA | `DOEN ESTE ALOP 001 0001` | BLK025 / BLK031 |
| Estéticas | MELASMA | `DOEN ESTE MELA 001 0001` | BLK031 |
| Mitocondriais | FADIGA / BAIXA ENERGIA | `DOEN MITO FADI/ENER 001 0001` | BLK016 / BLK021 |
| Nutricionais | DEF. FERRO / B12 / VIT D | `DOEN NUTR FERR/B12X/VITD 001 0001` | BLK017 / BLK021 |
| Dermatológicas | LIPEDEMA | `DOEN DERM LIPE 001 0001` | BLK011 / BLK024 |

> 🔥 **A coluna "BLOCOS MOTOR" é OURO PURO** — é a ponte direta doença→bloco que o Dr. Manus já mapeou e que o motor **NÃO está usando hoje**.

### 4.6. CIRURGIAS (3 catalogadas — histórico Q015)

| CÓDIGO V4.0 | NOME |
|---|---|
| `CIRU GAST COLE 001` | COLECISTECTOMIA |
| `CIRU ODON IMPL 001` | IMPLANTE DENTÁRIO |
| `CIRU ENDO TIRE 001` | TIREOIDECTOMIA TOTAL |

### 4.7. DIETAS (12 itens — 4 perfis × 3 kcal)

| CÓDIGO V4.0 | DIETA |
|---|---|
| `DIET CARN 1000/1500/2000 001` | CARNÍVORA (3 níveis kcal) |
| `DIET HPRO 1000/1500/2000 001` | HIPERPROTEICA |
| `DIET KETO 1000/1500/2000 001` | CETOGÊNICA |
| `DIET LOWC 1000/1500/2000 001` | LOW CARB |

### 4.8. NICKS B4 (373 únicos) — dicionário alfabético

> Acessar via raw: `attached_assets/planilha_blocos_csv/13_dicionario_nicks_b4.csv` (374 linhas).
> Estrutura: `#, NICK (4 letras), NOME REAL, DOMÍNIO`. Exemplos:
> ```
> 17OH = 17 OH PROGESTERONA (EXAM)
> AALP = ÁCIDO ALFA LIPOICO 10mg (INJE)
> ACTH = ACTH (EXAM)
> AMIL = AMILASE (EXAM)
> AMML = ÁCIDO METILMALÔNICO (EXAM)
> ANAS = ANASTROZOL PELLET (IMPL)
> APOB = APOLIPOPROTEINA B (EXAM)
> ```

---

## 5. 🔗 PONTES JÁ EXISTENTES NO BANCO

| Tabela | Coluna | Aponta pra | Status |
|---|---|---|---|
| `exames_base` | `codigo_semantico_v4` | `codigos_semanticos.codigo` | ✅ Migração 025 fez 52/67 |
| `formulas` | `codigo_semantico` | (V4 nativo) | ✅ 54 linhas, formato V4 |
| `itens_terapeuticos` | `codigo_padcom` | (V13 legado) | ⚠️ ainda V13 nas 457 linhas |
| `regras_motor` | `codigo_referencia` | (V13) | ❌ **falta `codigo_referencia_v4`** |
| `doencas` | `codigo_semantico` | — | ✅ 58 linhas V4 |
| `blocos` | `codigo_semantico` | — | ⚠️ 62 linhas (duplicação V13+V4) |
| `sintomas` | `codigo_semantico` | — | ⚠️ só 10 (deveria ter 50+) |

---

## 6. 🎯 ENTREGÁVEIS PRO DR. CLAUDE — O QUE FAZER COM ISSO

1. **Estudar a coluna "BLOCOS MOTOR" do CSV 08** — Dr. Manus já mapeou doença→bloco. Isso vira **regra automática** no motor.
2. **Validar as 24 lacunas** (doc 08, §3) e revisar palavras-chave sugeridas (doc 08, §6 Sprint C).
3. **Decidir BLK001 vs BLK0001** (doc 08, §8 pergunta 1).
4. **Aprovar Sprint A + B** (doc 08, §6) pra Dr. Replit executar com `psql` aditivo.
5. **Opcional** — expandir catálogo de `sintomas` de 10 → 50+ (vários nomes já aparecem em `regras_motor.palavra_chave` mas não estão como entidade própria).

---

## 7. ARQUIVOS RAW PRA CONSULTA (raw GitHub URLs)

| Arquivo | Linhas | Conteúdo |
|---|--:|---|
| `attached_assets/planilha_blocos_csv/01_regra_universal.csv` | 21 | Regra V4 oficial |
| `attached_assets/planilha_blocos_csv/02_exames_bloco_grade_exame.csv` | 235 | **VISÃO 1 completa (233 exames)** |
| `attached_assets/planilha_blocos_csv/03_exames_exame_grade_bloco.csv` | 234 | **VISÃO 2 completa (233 exames)** |
| `attached_assets/planilha_blocos_csv/04_injetaveis.csv` | 163 | 162 injetáveis IM com dosagem |
| `attached_assets/planilha_blocos_csv/05_implantes.csv` | 33 | 32 pellets (inline acima §4.2) |
| `attached_assets/planilha_blocos_csv/06_endovenosos_soros.csv` | 12 | 11 soros (inline §4.3) |
| `attached_assets/planilha_blocos_csv/07_formulas.csv` | 12 | 11 fórmulas (inline §4.1) |
| `attached_assets/planilha_blocos_csv/08_doencas.csv` | 50 | 49 doenças com bloco motor (inline §4.5) |
| `attached_assets/planilha_blocos_csv/09_sintomas.csv` | 11 | 10 sintomas (inline §4.4) |
| `attached_assets/planilha_blocos_csv/10_cirurgias.csv` | 4 | 3 cirurgias (inline §4.6) |
| `attached_assets/planilha_blocos_csv/11_dietas.csv` | 13 | 12 dietas (inline §4.7) |
| `attached_assets/planilha_blocos_csv/12_blocos.csv` | 32 | 31 blocos (inline §2.1) |
| `attached_assets/planilha_blocos_csv/13_dicionario_nicks_b4.csv` | 374 | 373 nicks B4 |
| `attached_assets/planilha_blocos_csv/14_resumo.csv` | 18 | Sumário Dr. Manus |

**URL raw pattern (Dr. Claude):**
```
https://raw.githubusercontent.com/<repo>/main/attached_assets/planilha_blocos_csv/<arquivo>.csv
```
