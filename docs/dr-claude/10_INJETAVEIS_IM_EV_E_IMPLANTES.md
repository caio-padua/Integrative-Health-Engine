# 10 — Catálogo de Injetáveis (IM + EV) + Implantes (Pellets)

> **De**: Dr. Replit (codificador)
> **Para**: Dr. Claude (orquestrador)
> **Data**: 17/mai/2026
> **Objetivo**: Materializar pra consulta raw GitHub o catálogo COMPLETO das 3 vias parenterais que o Caio prescreve:
> - **162 injetáveis** (intramuscular IM, endovenoso EV, subcutâneo SC, intradérmico ID)
> - **11 soros endovenosos** (protocolos prontos compostos)
> - **32 implantes/pellets** subcutâneos (HRT bioidêntica + metabólicos)
>
> Junto com os docs [08 — Ignição do Motor](./08_IGNICAO_MOTOR_E_SINAPSES.md) e
> [09 — Catálogo Clínico Estratificado](./09_CATALOGO_CLINICO_ESTRATIFICADO.md),
> fecha o panorama clínico que o Dr. Claude precisa pra desenhar as sinapses
> anamnese → terapêutica.

---

## §1 — REGRA UNIVERSAL DE NOMENCLATURA V4.0 (recap)

| Item | Padrão | Exemplo |
|------|--------|---------|
| **Injetável** | `INJE B2 B3 B4 SEQ` onde `SEQ` = dose em mg (4 dígitos) | `INJE ENDO SUPR VITC 1000` = Vitamina C 1g EV |
| **Implante** | `IMPL HORM SUBC B4 0001` (SEQ sempre `0001`, dosagem definida na manipulação) | `IMPL HORM SUBC TEST 0001` = Testosterona pellet |
| **Soro EV** | `ENDO SORO TERA B4 0001` (composto pronto, sem dose única) | `ENDO SORO TERA IMUN 0001` = Soro Imunidade Base |

**B2 do injetável** indica via principal pretendida:
- `ENDO` = endovenoso (EV) — pode também aceitar IM/SC/ID
- `MUSC` = intramuscular (IM) prioritário
- `SUBC` = subcutâneo (SC) prioritário

A coluna **VIA** do CSV original é a fonte da verdade clínica
(qual via é realmente permitida pelo Caio).

---

## §2 — INJETÁVEIS (162 itens) — agrupados por finalidade

Organizei por **categoria semântica** (extraída do prefixo do `codigo_antigo` =
VITA / NEUR / NUTR / META / IMUN / DERM / ORTO / INFL / HORM) pra Dr. Claude
desenhar as sinapses por bloco.

### §2.1 — VITAMINAS (VITA) — 24 itens

| # | Nome real | Substância | Dose | Via | Código V4.0 |
|---|-----------|------------|------|-----|-------------|
| 11 | ADEK 100000UI (1300 mcg) | ADEK 100000UI | 1300 mcg | — | `INJE ENDO SUPR ADEK 1300` |
| 12 | ADEK 600000UI (1300 mcg) | ADEK 600000UI | 1300 mcg | — | `INJE ENDO SUPR ADE1 1300` |
| 42 | Complexo B | Complexo B | — | — | `INJE ENDO SUPR CPLB 0001` |
| 43 | Complexo B (com B1) (6 mg) | Complexo B | 6 mg | — | `INJE ENDO SUPR CPLB 0006` |
| 44 | Complexo B (sem B1) (50 mg) | Complexo B | 50 mg | — | `INJE ENDO SUPR CPLB 0050` |
| 96 | Metilcobalamina (25 mg) | Metilcobalamina | 25 mg | EV/IM/SC | `INJE ENDO SUPR MTCB 0025` |
| 97 | Metilcobalamina (2500 mcg) | Metilcobalamina | 2500 mcg | EV/IM/SC | `INJE ENDO SUPR MTCB 2500` |
| 98 | Metilcobalamina (500 mcg) | Metilcobalamina | 500 mcg | EV/IM/SC | `INJE ENDO SUPR MTCB 0500` |
| 99 | Metilfolato (3,5 mg) | Metilfolato | 3,5 mg | EV/IM | `INJE ENDO SUPR METI 0001` |
| 120 | Pool Vitaminas Hidrossolúveis | Pool Vitaminas Hidrossolúveis | 1 mg | — | `INJE ENDO SUPR POO7 0001` |
| 146 | Vitamina A (palmitato de retinol) (25.000 UI) | Vitamina A | 25.000 UI | IM | `INJE MUSC SUPR VITA 25000` |
| 147 | Vitamina B1 (Tiamina) (100 mg) | Vitamina B1 | 100 mg | EV/IM/SC | `INJE ENDO SUPR VTB1 0100` |
| 148 | Vitamina B12 (Cianocobalamina) (2500 mcg) | Vitamina B12 | 2500 mcg | EV/IM/SC | `INJE ENDO SUPR VB12 2500` |
| 149 | Vitamina B2 (Riboflavina) (50 mg) | Vitamina B2 | 50 mg | EV/IM | `INJE ENDO SUPR VTB2 0050` |
| 150 | Vitamina B3 (Niacinamida) (30 mg) | Vitamina B3 | 30 mg | EV/IM | `INJE ENDO SUPR VTB3 0030` |
| 151 | Vitamina B5 (D-Pantenol) (40 mg) | Vitamina B5 | 40 mg | EV/IM/SC/ID | `INJE ENDO SUPR VTB5 0040` |
| 152 | Vitamina B6 (Piridoxina) (100 mg) | Vitamina B6 | 100 mg | EV/IM | `INJE ENDO SUPR VTB6 0100` |
| 157 | Vitamina D3 (Colecalciferol) (100.000 UI) | Vitamina D3 | 100.000 UI | IM | `INJE MUSC SUPR VITD 100000` |
| 158 | Vitamina D3 (Colecalciferol) (600.000 UI) | Vitamina D3 | 600.000 UI | IM | `INJE MUSC SUPR VITD 600000` |
| 159 | Vitamina D3 + K2-MK7 (1300 mcg) | Vitamina D3+K2MK7 | 1300 mcg | — | `INJE ENDO SUPR VITD 1300` |
| 160 | Vitamina E (Alfatocoferol) (200 UI) | Vitamina E | 200 UI | IM | `INJE MUSC SUPR VITE 0200` |
| 161 | Vitamina K1 (Fitomenadiona) (10 mg) | Vitamina K1 | 10 mg | IM | `INJE MUSC SUPR VITK 0010` |
| 162 | Vitamina K2-MK7 (1300 mcg) | Vitamina K2-MK7 | 1300 mcg | IM | `INJE MUSC SUPR VITK 1300` |
| 7  | Ácido Fólico (10 mg) | Ácido Fólico | 10 mg | EV/IM | `INJE ENDO SUPR AFOL 0010` |

**Sinapses sugeridas (anamnese → vitamina)**:
- `QC01 FADIGA` + `QD21 ANEMIA` → Metilcobalamina 2500/Ferro + Complexo B
- `QD22 OSTEOPOROSE` → Vitamina D3 600.000 UI IM + K2-MK7
- `QC35 IMUNIDADE BAIXA` → ADEK 600000 + Vitamina C (ver IMUN)
- `QD15 SIBO/DISBIOSE` + `QE01 BARIATRICA` → Complexo B + B12 (má absorção)

---

### §2.2 — NEUROFUNCIONAIS (NEUR) — 13 itens

| # | Nome real | Substância | Dose | Via | Código V4.0 |
|---|-----------|------------|------|-----|-------------|
| 3 | 5-HTP (OH-Triptofano) (20 mg) | 5 HTP | 20 mg | EV/IM | `INJE ENDO SUPR 5HTP 0020` |
| 4 | 5-HTP (OH-Triptofano) (4 mg) | 5 HTP | 4 mg | EV/IM | `INJE ENDO SUPR 5HTP 0004` |
| 15 | Alfa GPC (400 mg) | Alfa GPC | 400 mg | EV/IM | `INJE ENDO SUPR ALFA 0400` |
| 51 | DMAE (50 mg) | DMAE | 50 mg | IM/SC/ID | `INJE MUSC SUPR DMAE 0050` |
| 66 | GABA (30 mg) | GABA | 30 mg | EV/IM | `INJE ENDO SUPR GABA 0030` |
| 87 | L-Theanina (50 mg) | L-Theanina | 50 mg | EV/IM | `INJE ENDO SUPR LTHE 0050` |
| 88 | L-Triptofano (100 mg) | L-Triptofano | 100 mg | EV/IM | `INJE ENDO SUPR TRIP 0100` |
| 108 | Phenibut (50 mg) | Phenibut | 50 mg | EV/IM | `INJE ENDO SUPR PHEN 0050` |
| 111 | Piracetam (500 mg) | Piracetam | 500 mg | EV/IM | `INJE ENDO SUPR PIRA 0500` |
| 117 | Pool Cognitivo (330 mg) | Pool Cognitivo | 330 mg | — | `INJE ENDO SUPR POO4 0330` |
| 122 | PQQ - Pirroloquinolino Quinona (5 mg) | PQQ | 5 mg | EV/IM | `INJE ENDO SUPR PQQP 0005` |
| — | (ver §2.3 Acetil L-Carnitina #3 — também atua neurocognitivo) | — | — | — | — |
| — | (ver §2.7 Resveratrol #127 — neuroprotetor) | — | — | — | — |

**Sinapses sugeridas**:
- `QC02 INSÔNIA` + `QC04 SONO NÃO REPARADOR` → 5-HTP 20 + L-Triptofano + GABA
- `QC05 ANSIEDADE` + `QC45 ESTRESSE CRÔNICO` → L-Theanina + GABA + Phenibut
- `QC08 DIFICULDADE CONCENTRAÇÃO` + `QC10 PERDA MEMÓRIA` → Alfa GPC + DMAE + Piracetam + Pool Cognitivo + PQQ
- `QC09 TDAH` → Alfa GPC + L-Theanina + PQQ

---

### §2.3 — METABÓLICOS / EMAGRECIMENTO (META) — 14 itens

| # | Nome real | Substância | Dose | Via | Código V4.0 |
|---|-----------|------------|------|-----|-------------|
| 3 | Acetil L-Carnitina (800 mg) | Acetil L-Carnitina | 800 mg | EV/IM/SC/ID | `INJE ENDO SUPR CARN 0800` |
| 25 | Beta Alanina (500 mg) | Beta Alanina | 500 mg | EV/IM | `INJE ENDO SUPR BET1 0500` |
| 30 | Citrus Booster (10 mg) | Citrus Booster | 10 mg | — | `INJE ENDO SUPR CITR 0010` |
| 31 | Citrus Booster Plus (5 mg) | Citrus Booster Plus | 5 mg | — | `INJE ENDO SUPR CIT1 0005` |
| 32 | Citrus Red (Morusil) (40 mg) | Citrus Red | 40 mg | IM | `INJE MUSC SUPR CIT2 0040` |
| 34 | Cloreto de Cromo (100 mcg) | Cloreto de Cromo | 100 mcg | EV/IM | `INJE ENDO SUPR CROM 0100` |
| 69 | HMB (Hidroximetilbutirato) (50 mg) | HMB | 50 mg | EV/IM | `INJE ENDO SUPR HMBX 0050` |
| 70 | Inositol (1 g) | Inositol | 1 g | EV/IM | `INJE ENDO SUPR INOS 1000` |
| 71 | Inositol + Taurina (200 mg) | Inositol + Taurina | 200 mg | — | `INJE ENDO SUPR TAUR 0200` |
| 75 | L-Carnitina (600 mg) | L-Carnitina | 600 mg | EV/IM/SC | `INJE ENDO SUPR CARN 0600` |
| 93 | Liporeductyl - | Liporeductyl | — | IM/SC | `INJE MUSC SUPR LIPO 0001` |
| 109 | Picolinato de Cromo (200 mcg) | Picolinato de Cromo | 200 mcg | EV/IM | `INJE ENDO SUPR CROM 0200` |
| 142 | Thermavix (50 mg) | Thermavix | 50 mg | — | `INJE ENDO SUPR THER 0050` |
| — | (ver §2.4 Desoxicolato #49 — lipólise localizada SC) | — | — | — | — |

**Sinapses sugeridas**:
- `QC15 GANHO DE PESO` + `QC16 RESISTÊNCIA INSULÍNICA` → L-Carnitina + Acetil L-Carnitina + Cromo + Inositol
- `QD05 RESIST. INSULÍNICA` + `QD24 SOP` → Mio-inositol (oral F12) + Inositol+Taurina + Cromo
- `QC15` localizada (gordura abdominal) → Liporeductyl IM + Citrus Red + Desoxicolato SC
- `QG04 OBJETIVO HIPERTROFIA` → HMB + Beta Alanina + Acetil L-Carnitina

---

### §2.4 — NUTRACÊUTICOS / SUPORTE GERAL (NUTR) — 51 itens

**Aminoácidos e cofatores**:

| # | Nome real | Dose | Via | Código V4.0 |
|---|-----------|------|-----|-------------|
| 14 | Alanil Glutamina (1 g) | 1 g | EV/IM | `INJE ENDO SUPR GLMN 1000` |
| 16 | Aminoácidos Essenciais (35 mg) | 35 mg | — | `INJE ENDO SUPR AMIN 0035` |
| 23 | BCAA (50 mg) | 50 mg | — | `INJE ENDO SUPR BCAA 0050` |
| 73 | L-Arginina (1 g) | 1 g | EV/IM/SC/ID | `INJE ENDO SUPR ARGI 1000` |
| 74 | L-Arginina + Lidocaína (20 mg) | 20 mg | — | `INJE ENDO SUPR ARGI 0020` |
| 76 | L-Carnosina (100 mg) | 100 mg | EV/IM | `INJE ENDO SUPR CRNS 0100` |
| 77 | L-Fenilalanina (50 mg) | 50 mg | EV/IM | `INJE ENDO SUPR LFEN 0050` |
| 78 | L-Glicina (75 mg) | 75 mg | EV/IM | `INJE ENDO SUPR GLIC 0075` |
| 79 | L-Glutathion (1 g) | 1 g | EV | `INJE ENDO SUPR LGLU 1000` |
| 80 | L-Glutathion (100 mg) | 100 mg | EV/IM | `INJE ENDO SUPR LGLU 0100` |
| 82 | L-Metionina (100 mg) | 100 mg | EV/IM | `INJE ENDO SUPR METI 0100` |
| 83 | L-Ornitina (300 mg) | 300 mg | EV/IM | `INJE ENDO SUPR LORN 0300` |
| 84 | L-Prolina (500 mg) | 500 mg | EV/IM | `INJE ENDO SUPR LPRO 0500` |
| 85 | L-Taurina (150 mg) | 150 mg | EV/IM | `INJE ENDO SUPR LTAU 0150` |
| 86 | L-Taurina (500 mg) | 500 mg | EV/IM | `INJE ENDO SUPR LTAU 0500` |
| 104 | OKG - L-Ornitina Alfa Cetoglutarato (200 mg) | 200 mg | EV/IM | `INJE ENDO SUPR OKGL 0200` |
| 112 | Pool Aminoácidos (27 mg) | 27 mg | — | `INJE ENDO SUPR POOL 0027` |
| 113 | Pool Aminoácidos (5,4 mg) | 5,4 mg | — | `INJE ENDO SUPR POOL 0001` |
| 115 | Pool Aumento de Massa (10 mg) | 10 mg | — | `INJE ENDO SUPR POO2 0010` |

**Antioxidantes / mitocondriais**:

| # | Nome real | Dose | Via | Código V4.0 |
|---|-----------|------|-----|-------------|
| 4-6 | Ácido Alfa Lipóico (10/300/600 mg) | 10/300/600 mg | EV (300/600), EV/IM/SC/ID (10) | `INJE ENDO SUPR AALP 0010/0300/0600` |
| 18 | ATP (20 mg) | 20 mg | EV | `INJE ENDO SUPR ATPX 0020` |
| 19-22 | Azul de Metileno 1%/2% (20/40/50/100 mg) | 20-100 mg | EV | `INJE ENDO SUPR AZUL/AZU1/AZU2 0020/0040/0050/0100` |
| 38 | Coenzima Q10 (100 mg) | 100 mg | IM | `INJE MUSC SUPR COQ0 0100` |
| 48 | D-Ribose (500 mg) | 500 mg | EV/IM | `INJE ENDO SUPR DRIB 0500` |
| 52-53 | DMSO - Dimetilsulfóxido (4995/9990 mg) | 4995/9990 mg | EV | `INJE ENDO SUPR DMSO 4995/9990` |
| 101-102 | MSM - Metilsulfonilmetano (750/1500 mg) | 750/1500 mg | EV / EV+IM+SC (750) | `INJE ENDO SUPR MSMX 0750/1500` |
| 127 | Resveratrol (100 mg) | 100 mg | IM | `INJE MUSC SUPR RESV 0100` |

**Quelantes / detox**:

| # | Nome real | Dose | Via | Código V4.0 |
|---|-----------|------|-----|-------------|
| 55-56 | EDTA Cálcico (750/1500 mg) | 750/1500 mg | EV | `INJE ENDO SUPR EDTA 0750/1500` |
| 57-58 | EDTA Sódico (750/1500 mg) | 750/1500 mg | EV | `INJE ENDO SUPR EDT1/EDT2 0750/1500` |

**Procaínas e anestésicos (terapia neural / Frischknecht)**:

| # | Nome real | Dose | Via | Código V4.0 |
|---|-----------|------|-----|-------------|
| 36 | Cloridrato de Procaína 0,7% (350 mg) | 350 mg | EV/IM/SC/ID | `INJE ENDO SUPR PROC 0350` |
| 37 | Cloridrato de Procaína 50% (5 g) | 5 g | EV/IM/SC/ID | `INJE ENDO SUPR PROC 5000` |
| 123-124 | Procaína Benzoica 2%/4% (40/200 mg) | 40/200 mg | EV/IM/SC/ID | `INJE ENDO SUPR PROC 0040/0200` |
| 89-92 | Lidocaína 1%/2% (10/20/100/200 mg) | 10-200 mg | IM/SC/ID | `INJE MUSC SUPR LIDC 0010/0020/0100/0200` |

**Minerais traço**:

| # | Nome real | Dose | Via | Código V4.0 |
|---|-----------|------|-----|-------------|
| 33 | Cloreto de Cálcio (200 mg) | 200 mg | EV | `INJE ENDO SUPR CLOR 0200` |
| 35 | Cloreto de Magnésio (2 g) | 2 g | EV | `INJE ENDO SUPR CLMG 2000` |
| 67 | Gluconato de Cálcio (1 g) | 1 g | EV | `INJE ENDO SUPR GLCA 1000` |
| 118 | Pool de Minerais (0,7 mg) | 0,7 mg | — | `INJE ENDO SUPR POO5 0001` |
| 119 | Pool Metilador (30 mg) | 30 mg | — | `INJE ENDO SUPR POO6 0030` |
| 134 | Sulfato de Cobre (0,5 mg) | 0,5 mg | EV/IM/ID | `INJE ENDO SUPR SULF 0001` |
| 135-138 | Sulfato de Magnésio 10%/50% (200/500/1000/5000 mg) | 200-5000 mg | EV/IM/SC | `INJE ENDO SUPR MAGN ...` |
| 139 | Sulfato de Manganês (20 mg) | 20 mg | EV/IM | `INJE ENDO SUPR SUL1 0020` |
| 140 | Sulfato de Zinco (20 mg) | 20 mg | EV/IM | `INJE ENDO SUPR ZINC 0020` |
| 145 | Vanádio (50 mcg) | 50 mcg | EV/IM/SC/ID | `INJE ENDO SUPR VANA 0050` |

**Demais nutracêuticos (uso pontual)**:

| # | Nome real | Dose | Via | Código V4.0 |
|---|-----------|------|-----|-------------|
| 13 | ADN (60 mg) | 60 mg | — | `INJE ENDO SUPR ADNX 0060` |
| 17 | Asiaticoside (2 mg) | 2 mg | ID | `INJE ENDO SUPR ASIA 0002` |
| 26-27 | Bicarbonato de Sódio (840 mg / 1 g) | 840/1000 mg | EV | `INJE ENDO SUPR BICA 0840/1000` |
| 29 | Cafeína Benzoica (100 mg) | 100 mg | IM/SC/ID | `INJE MUSC SUPR CAFE 0100` |
| 40 | Colchicina (1 mg) | 1 mg | EV/IM | `INJE ENDO SUPR COLC 0001` |
| 41 | Colina (500 mg) | 500 mg | EV/IM/SC | `INJE ENDO SUPR COLI 0500` |
| 46 | Crisina (100 mcg) | 100 mcg | IM/SC/ID | `INJE MUSC SUPR CRIS 0100` |
| 50 | Dipiridamol (10 mg) | 10 mg | EV | `INJE ENDO SUPR DIPI 0010` |
| 54 | Drenagem Inflamatória | — | — | `INJE ENDO SUPR DREN 0001` |
| 65 | Furosemida (10 mg) | 10 mg | IM | `INJE MUSC SUPR FURO 0010` |
| 68 | Heparina (2500 UI) | 2500 UI | EV | `INJE ENDO SUPR HEPA 2500` |
| 72 | Ioimbina (4 mg) | 4 mg | SC/ID | `INJE SUBC SUPR IOIM 0004` |
| 94 | Mescla Soft | — | ID | `INJE ENDO SUPR MESC 0001` |
| 105 | Pentoxifilina (100 mg) | 100 mg | EV | `INJE ENDO SUPR PENT 0100` |
| 106 | Pentoxifilina (40 mg) | 40 mg | SC/ID | `INJE SUBC SUPR PENT 0040` |
| 107 | Peróxido de Hidrogênio (150 mg) | 150 mg | EV | `INJE ENDO SUPR PERO 0150` |
| 121 | Portfolio Bioprolin (10 mg) | 10 mg | — | `INJE ENDO SUPR PORT 0010` |
| 128 | Rutina + Benzopirona (0,15 mg) | 0,15 mg | — | `INJE ENDO SUPR RUTI 0001` |
| 132-133 | Sulfato de Atropina (0,25 / 0,5 mg) | 0,25/0,5 mg | EV/IM/SC | `INJE ENDO SUPR ATRP 0001/0002` |
| 141 | Teacrina (50 mg) | 50 mg | IM/SC/ID | `INJE MUSC SUPR TEAC 0050` |

**Sinapses sugeridas**:
- `QC01 FADIGA` + `QD32 NEUROPATIA` → Acetil L-Carnitina + ATP + D-Ribose + CoQ10
- `QC25 DOR MUSCULAR` + `QD12 FIBROMIALGIA` → Procaína terapia neural + Mg + L-Glutathion
- `QD18 ESTEATOSE HEPÁTICA` → L-Glutathion + Ácido Alfa Lipóico 600 EV + L-Metionina
- `QC38/QC39 PERNAS PESADAS/EDEMA` → Pentoxifilina + Rutina + Benzopirona
- `QC42 ENXAQUECA` → Mg EV + Procaína

---

### §2.5 — IMUNOMODULADORES (IMUN) — 6 itens

| # | Nome real | Substância | Dose | Via | Código V4.0 |
|---|-----------|------------|------|-----|-------------|
| 81 | L-Lisina (300 mg) | L-Lisina | 300 mg | EV/IM | `INJE ENDO SUPR LLIS 0300` |
| 103 | N-Acetil Cisteína (300 mg) | N-Acetil Cisteína | 300 mg | EV/IM profundo | `INJE ENDO SUPR NACE 0300` |
| 130 | Selênio (80 mcg) | Selênio | 80 mcg | EV/IM | `INJE ENDO SUPR SELE 0080` |
| 143 | Timomodulina (50 mg) | Timomodulina | 50 mg | IM/ID | `INJE MUSC SUPR TIMO 0050` |
| 153-156 | Vitamina C (400/500/1000/10000 mg) | Vit C | 0,4-10 g | EV/IM/SC/ID | `INJE ENDO SUPR VITC ...` |

**Sinapses sugeridas**:
- `QC34 INFECÇÕES REPETIÇÃO` + `QC35 IMUNIDADE BAIXA` → Vitamina C 10g EV + Timomodulina + Selênio + NAC
- `QD11 DOENÇA AUTOIMUNE` → NAC + Selênio (modulação)
- Herpes recorrente → L-Lisina + Vitamina C alta dose

---

### §2.6 — DERMATOLÓGICOS / ESTÉTICA (DERM) — 11 itens

| # | Nome real | Substância | Dose | Via | Código V4.0 |
|---|-----------|------------|------|-----|-------------|
| 8 | Ácido Glicólico (20 mg) | Ác. Glicólico | 20 mg | ID | `INJE ENDO SUPR ACID 0020` |
| 9 | Ácido Hialurônico (10 mg) | Ác. Hialurônico | 10 mg | ID | `INJE ENDO SUPR ACI1 0010` |
| 10 | Ácido Tranexâmico (8 mg) | Ác. Tranexâmico | 8 mg | SC/ID | `INJE SUBC SUPR ATRX 0008` |
| 28 | Biotina (10 mg) | Biotina | 10 mg | EV/IM/SC/ID | `INJE ENDO SUPR BIOT 0010` |
| 59 | Exossomas (2,50%) | Exossomas | — | ID | `INJE ENDO SUPR EXOS 0001` |
| 60 | Exsynutriment (20 mg) | Exsynutriment | 20 mg | IM/SC/ID | `INJE MUSC SUPR EXSY 0020` |
| 61 | Fator Anti-aging (1%) | Fator Anti-aging | 1% | — | `INJE ENDO SUPR FAT1 0001` |
| 62 | Fator Crescimento Alopecia (10 mg) | Fat. Cresc. Alopecia | 10 mg | — | `INJE ENDO SUPR FAT2 0010` |
| 63 | Fator Crescimento Hipercromia (1%) | Fat. Cresc. Hipercromia | 1% | — | `INJE ENDO SUPR FAT3 0001` |
| 100 | Minoxidil (10 mg) | Minoxidil | 10 mg | ID | `INJE ENDO SUPR MINO 0010` |
| 110 | Pill Food (10 mg) | Pill Food | 10 mg | — | `INJE ENDO SUPR PILL 0010` |
| 116 | Pool Capilar (5 mg) | Pool Capilar | 5 mg | — | `INJE ENDO SUPR POO3 0005` |
| 131 | Silício (20 mg) | Silício | 20 mg | IM/SC/ID | `INJE MUSC SUPR SILO 0020` |

**Sinapses sugeridas**:
- `QC11 QUEDA DE CABELO` → Minoxidil ID + Pool Capilar + Pill Food + Fator Crescimento Alopecia
- `QC13 PELE SECA/ENVELHECIDA` → Exossomas ID + Ác. Hialurônico ID + Fator Anti-aging + Exsynutriment
- `QC12 UNHAS FRACAS` → Biotina + Silício + Pool Capilar
- `QC14 ACNE` → Ác. Glicólico ID (peeling)

---

### §2.7 — ORTOPÉDICOS / OSTEOARTICULARES (ORTO) — 5 itens

| # | Nome real | Substância | Dose | Via | Código V4.0 |
|---|-----------|------------|------|-----|-------------|
| 39 | Colágeno (200 mg) | Colágeno | 200 mg | IM/SC/ID | `INJE MUSC SUPR COLA 0200` |
| 45 | Condroitin Sulfato (100 mg) | Condroitin | 100 mg | IM/SC/ID | `INJE MUSC SUPR COND 0100` |
| 47 | Curcumina (200 mg) | Curcumina | 200 mg | IM | `INJE MUSC SUPR CURC 0200` |
| 114 | Pool Artrose (10 mg) | Pool Artrose | 10 mg | — | `INJE ENDO SUPR POO1 0010` |
| 129 | SAMe (200 mg) | SAMe | 200 mg | EV/IM | `INJE ENDO SUPR SAME 0200` |

**Sinapses sugeridas**:
- `QC24 DOR ARTICULAR/ARTROSE` → Pool Artrose + Colágeno + Condroitin + Curcumina + SAMe
- `QD22 OSTEOPOROSE` → Colágeno + Vitamina D3 IM + K2-MK7

---

### §2.8 — LIPÓLISE LOCALIZADA / SUBCUTÂNEOS (SUBC) — 5 itens

| # | Nome real | Substância | Dose | Via | Código V4.0 |
|---|-----------|------------|------|-----|-------------|
| 24 | Benzopirona (1 mg) | Benzopirona | 1 mg | SC/ID | `INJE SUBC SUPR BENZ 0001` |
| 49 | Desoxicolato de Sódio (6,10%) | Desoxicolato | — | SC | `INJE SUBC SUPR DESO 0001` |
| 95 | Mesoglicano (60 mg) | Mesoglicano | 60 mg | SC | `INJE SUBC SUPR MESO 0060` |
| 144 | Tripeptídeo-41 (60 mg) | Tripeptídeo-41 | 60 mg | SC | `INJE SUBC SUPR TRIP 0060` |

**Sinapses sugeridas**:
- Gordura submentoniana/abdominal localizada (sem código anamnese hoje — **gap**) → Desoxicolato SC

---

### §2.9 — HORMONAIS INJETÁVEIS (HORM via IM) — 2 itens

> Nota: progesterona injetável IM existe como adjuvante curto; a HRT
> contínua de progesterona é via **implante** (§4).

| # | Nome real | Substância | Dose | Via | Código V4.0 |
|---|-----------|------------|------|-----|-------------|
| 125 | Progesterona (100 mg) | Progesterona | 100 mg | IM | `INJE MUSC SUPR PROG 0100` |
| 126 | Progesterona (50 mg) | Progesterona | 50 mg | IM | `INJE MUSC SUPR PROG 0050` |

**Sinapses sugeridas**:
- `QC30 IRREGULARIDADE MENSTRUAL` + `QC31 TPM INTENSA` (transitório) → Progesterona 50 IM
- `QH07 SINTOMAS MENOPAUSA` → preferir pellet (ver §4)

---

### §2.10 — FERRO ENDOVENOSO — 1 item

| # | Nome real | Substância | Dose | Via | Código V4.0 |
|---|-----------|------------|------|-----|-------------|
| 64 | Ferro - Carboximaltose Férrica (100 mg) | Ferro | 100 mg | EV | `INJE ENDO SUPR FERR 0100` |

**Sinapses sugeridas**:
- `QD21 ANEMIA` ferropriva refratária → Ferro carboximaltose EV

---

## §3 — SOROS ENDOVENOSOS (11 protocolos prontos)

Compostos prontos `ENDO SORO TERA B4 0001` — Caio prescreve como **bloco
único**, não decompõe em ativos. Cada um responde a um conjunto típico
de sintomas.

| # | Nome | Código V4.0 | Código legado | Indicação típica (anamnese) |
|---|------|-------------|---------------|------------------------------|
| 1 | Soro Aminoácidos Essenciais | `ENDO SORO TERA AMIN 0001` | `ENDO NUTR AMIN 001` | `QG04 PERFORMANCE` + `QD34 SARCOPENIA` + pós-bariátrica |
| 2 | Soro Antiinflamatório Modulador | `ENDO SORO TERA ANT3 0001` | `ENDO INFL MODU 001` | `QD11 AUTOIMUNE` + `QC25 FIBROMIALGIA` + `QC24 ARTROSE` |
| 3 | Soro Antioxidante Padrão | `ENDO SORO TERA OXID 0001` | `ENDO NUTR OXID 001` | Estresse oxidativo, tabagismo `QG05` ativo, idade > 50 |
| 4 | Soro Detox Hepático | `ENDO SORO TERA DETO 0001` | `ENDO HEPA DETO 001` | `QD18 ESTEATOSE` + `QG06 ETILISMO frequente` + medicamento crônico `QB05` |
| 5 | Soro Foco Cognitivo | `ENDO SORO TERA COGN 0001` | `ENDO NEUR FOCO 001` | `QC08 CONCENTRAÇÃO` + `QC09 TDAH` + `QC10 MEMÓRIA` + `QI03` |
| 6 | Soro Imunidade Base | `ENDO SORO TERA IMUN 0001` | `ENDO IMUN BASE 001` | `QC34 INFECÇÕES REPETIÇÃO` + `QC35 IMUNIDADE BAIXA` |
| 7 | Soro Metabólico Emagrecimento | `ENDO SORO TERA META 0001` | `ENDO META EMAG 001` | `QC15 GANHO PESO` + `QD05 R.INSULÍNICA` + `QD06 S.METABÓLICA` |
| 8 | Soro Mitocondrial Longevidade | `ENDO SORO TERA MITO 0001` | `ENDO MITO LONG 001` | `QC01 FADIGA CRÔNICA` + idade > 50 + `QC10 PERDA MEMÓRIA` |
| 9 | Soro Pele Cabelo Unhas | `ENDO SORO TERA PELE 0001` | `ENDO BELE SUPR 001` | `QC11 QUEDA CABELO` + `QC12 UNHAS FRACAS` + `QC13 PELE SECA` |
| 10 | Soro Performance Energético | `ENDO SORO TERA ENER 0001` | `ENDO PERF ENER 001` | `QG04 PERFORMANCE` + `QC01 FADIGA` (atleta) |
| 11 | Soro Recuperação Muscular | `ENDO SORO TERA RECU 0001` | `ENDO PERF RECU 001` | `QC25 DOR MUSCULAR` pós-treino + `QG04 HIPERTROFIA` |

**Importante**: o soro substitui a montagem manual de N injetáveis individuais
— se a anamnese dispara 3+ injetáveis da mesma categoria, motor deve
**preferir o soro pronto** (regra a desenhar com Dr. Claude).

---

## §4 — IMPLANTES (PELLETS) — 32 itens (HRT bioidêntica + metabólicos)

Todos subcutâneos (`B3 = SUBC`), categoria hormonal (`B2 = HORM`). SEQ
sempre `0001` porque a dose real é definida no momento da manipulação
(individualizada). O CSV tem **32 linhas mas 19 substâncias únicas** —
duplicações intencionais representam **dosagens distintas que serão
catalogadas** na fase de operação.

### §4.1 — Hormônios sexuais bioidênticos

| # | Substância | Código V4.0 | Indicação típica (anamnese) |
|---|------------|-------------|------------------------------|
| 1-2 | **Anastrozol** (2 dosagens) | `IMPL HORM SUBC ANAS 0001` | Bloqueio aromatase em HRT masculina (TEST + ANAS) |
| 5-6 | **Estradiol** (2 dosagens) | `IMPL HORM SUBC ESTR 0001` | `QC32 FOGACHOS` + `QH07 MENOPAUSA` + `QD26 CLIMATÉRIO` |
| 7 | **Estriol** | `IMPL HORM SUBC ESTR 0001` | `QC33 RESSECAMENTO VAGINAL` + climatério leve |
| 8-10 | **Gestrinona** (3 dosagens) | `IMPL HORM SUBC GEST 0001` | `QD25 ENDOMETRIOSE` + `QC30 IRREG. MENSTRUAL` + libido feminina |
| 11-12 | **HCG** (2 dosagens) | `IMPL HORM SUBC HCGX 0001` | Adjuvante em HRT masc (preservação testicular) + `QH08 PERFORMANCE` |
| 22-24 | **Progesterona** (3 dosagens) | `IMPL HORM SUBC PROG 0001` | `QC31 TPM INTENSA` + `QC30 IRREG. MENSTRUAL` + `QC02 INSÔNIA` mulher |
| 30-32 | **Testosterona** (3 dosagens) | `IMPL HORM SUBC TEST 0001` | `QD27 ANDROPAUSA` + `QH06 SINT. ANDROPAUSA` + `QC28 LIBIDO` + `QC29 D.ERÉTIL` |

### §4.2 — Hormônios reguladores / suprarrenal

| # | Substância | Código V4.0 | Indicação típica (anamnese) |
|---|------------|-------------|------------------------------|
| 4 | **DHEA** | `IMPL HORM SUBC DHEA 0001` | `QC01 FADIGA` + `QC45 BURNOUT` + idade > 40 |
| 13-15 | **Hidrocortisona** (3 dosagens) | `IMPL HORM SUBC HIDR 0001` | Insuficiência adrenal documentada (cuidado controlado) |
| 21 | **Pregnenolona** | `IMPL HORM SUBC PREG 0001` | `QC10 MEMÓRIA` + `QC45 ESTRESSE CRÔNICO` |
| 26 | **T3+T4** | `IMPL HORM SUBC T3T4 0001` | `QD01 HIPOTIREOIDISMO` refratário a oral |

### §4.3 — Neuro / sono

| # | Substância | Código V4.0 | Indicação típica (anamnese) |
|---|------------|-------------|------------------------------|
| 16 | **Melatonina** | `IMPL HORM SUBC MELA 0001` | `QC02 INSÔNIA` + `QC03 ACORDA MADRUGADA` + jet lag crônico |
| 19 | **NADH** | `IMPL HORM SUBC NADH 0001` | `QC01 FADIGA` + longevidade mitocondrial |
| 20 | **Naltrexona** (baixa dose) | `IMPL HORM SUBC NALT 0001` | `QC17 COMPULSÃO ALIMENTAR` + `QI07 COMPULSÃO` + autoimune `QD11` (LDN) |
| 3 | **Bupropiona** | `IMPL HORM SUBC BUPR 0001` | `QC06 DEPRESSÃO` + tabagismo `QG05` |

### §4.4 — Metabólicos / glicêmicos

| # | Substância | Código V4.0 | Indicação típica (anamnese) |
|---|------------|-------------|------------------------------|
| 17 | **Metformina + Sitagliptina** | `IMPL HORM SUBC METF 0001` | `QD03 DM2` + `QD05 R.INSULÍNICA` |
| 18 | **Metformina** | `IMPL HORM SUBC MET1 0001` | `QD05 R.INSULÍNICA` + `QD24 SOP` + `QC15 GANHO PESO` |
| 25 | **Sitagliptina** | `IMPL HORM SUBC SITA 0001` | Complemento DM2 |

### §4.5 — Performance sexual masculina

| # | Substância | Código V4.0 | Indicação típica (anamnese) |
|---|------------|-------------|------------------------------|
| 27-29 | **Tadalafil** (3 dosagens) | `IMPL HORM SUBC TADA 0001` | `QC29 DISFUNÇÃO ERÉTIL` + `QH02 FUNÇÃO ERÉTIL prejudicada` |

---

## §5 — PRINCÍPIOS DE SINAPSE ENVOLVENDO INJETÁVEIS

Pra Dr. Claude levar em conta ao desenhar as regras_motor envolvendo
essas 3 vias:

1. **Via depende da preferência do paciente** (BLOCO J da anamnese):
   - `QJ02 = NÃO` → bloquear sugestões IM
   - `QJ03 = NÃO` → bloquear sugestões EV (soros + injetáveis EV)
   - `QJ04 = NÃO` → bloquear sugestões de implante
   - Hoje o motor já filtra via `Q030/Q031/Q033/Q041` (ver doc 08 §3
     anomalia #6); migrar pra letras semânticas é Sprint B.

2. **Perfil financeiro** (`QJ07`):
   - `BÁSICO` → bloquear implantes (custo + invasividade) e soros
   - `INTERMEDIÁRIO` → libera soros, bloqueia implante
   - `AVANÇADO` → libera tudo

3. **Soro substitui combo de injetáveis individuais**:
   - Se motor dispararia ≥3 injetáveis da mesma categoria semântica
     (ex: 3 vitaminas), trocar pelo soro correspondente (`SORO IMUN`,
     `SORO PELE`, etc.) — economiza N picadas + custo.

4. **Implante substitui injetável recorrente**:
   - Se paciente vai precisar de IM mensal por > 6 meses (ex:
     testosterona, progesterona, B12), sugerir avaliação de pellet
     (3-6 meses de liberação).

5. **Anastrozol PELLET sempre acompanha Testosterona PELLET masculina**
   (regra clínica do Caio — bloquear aromatização).

6. **Naltrexona Low Dose (LDN)** tem indicação dupla: compulsão
   (`QC17/QI07`) e autoimune (`QD11`) — desenhar 2 regras_motor
   distintas pro mesmo item.

7. **Hidrocortisona pellet é EXCEÇÃO de SEGURANÇA**: só com diagnóstico
   formal de insuf. adrenal (não disparar por sintoma).

---

## §6 — GAPS DETECTADOS (perguntas pro Dr. Claude)

1. **Falta código semântico pra "gordura localizada"** na anamnese
   atual — Desoxicolato + Liporeductyl ficam órfãos. Criar `QC46`?

2. **Soro Performance vs Soro Mitocondrial** — ambos cobrem fadiga.
   Como motor desempata? (Idade < 40 = Performance, ≥ 50 = Mito?)

3. **Implante hormonal feminino requer status menstrual** (`QH03`).
   Hoje o motor não considera. Desenhar bridge `QH03 = MENOPAUSA → libera
   estradiol pellet`?

4. **2 dosagens de Anastrozol / 3 de Progesterona / 3 de Testosterona** —
   regra de desempate por idade, peso, intensidade do sintoma?

5. **Lidocaína / Procaína / EDTA** são utilitários de procedimento, não
   terapia direta — devem mesmo ser sugeridos pelo motor ou ficam como
   "insumo do médico" fora das sugestões automáticas?

6. **Soros prontos** — gravamos como **1 item** (composto) ou como
   **bundle de N ativos** (mais auditável mas mais ruidoso na sugestão)?

---

## §7 — Próximo passo de codificação (após resposta do Dr. Claude)

1. **Migration 058 aditiva**: importar 162 injetáveis + 32 implantes +
   11 soros pra `itens_terapeuticos` com `codigo_v4` correto (já existe
   coluna ou criar via migration aditiva — checar).
2. **Migration 059 aditiva**: pra cada substância, 1 linha em
   `regras_motor` com `codigo_referencia_v4` (Sprint B doc 08) +
   `palavras_chave_anamnese` mapeadas pros QC/QD acima.
3. **Service `bridgePreferenciasParenterais`**: aplica regra §5.1 +
   §5.2 (filtro via + financeiro) — extrair da rota junto com Sprint E.
4. **Heurística "soro substitui combo"** (§5.3) — service novo
   `consolidarSugestoesEmSoro` que roda **depois** do matching.

Zero código tocado nesta entrega — só documento.
