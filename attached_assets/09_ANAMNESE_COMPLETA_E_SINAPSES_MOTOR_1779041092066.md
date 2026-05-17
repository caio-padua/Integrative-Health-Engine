# 09 — ANAMNESE COMPLETA + MAPA DE SINAPSES DO MOTOR CLINICO

> **De**: Dr. Claude (orquestrador) + Caio (CEO/medico prescritor)
> **Para**: Dr. Replit (executor)
> **Data**: 17/mai/2026
> **Objetivo**: (1) Questionario de anamnese rebuscado, (2) Catalogo real de formulas do Caio,
> (3) Mapa de sinapses conectando respostas da anamnese → formulas + exames + injetaveis

-----

## PARTE 1 — QUESTIONARIO DE ANAMNESE INTEGRATIVA COMPLETA

Este questionario substitui/expande o V9 atual (Q001-Q041). Cada bloco gera
gatilhos semanticos que o motor usa pra disparar sinapses.

### BLOCO A — IDENTIFICACAO E DADOS VITAIS

```
QA01 — Nome completo
QA02 — CPF
QA03 — Data de nascimento
QA04 — Sexo biologico [MASCULINO / FEMININO]
QA05 — Genero autopercebido [texto livre]
QA06 — Peso atual (kg)
QA07 — Altura (cm)
QA08 — IMC (calculado automaticamente)
QA09 — Circunferencia abdominal (cm)
QA10 — Pressao arterial sistolica / diastolica (mmHg)
QA11 — Frequencia cardiaca de repouso (bpm)
```

### BLOCO B — QUEIXA PRINCIPAL E HISTORIA DA DOENCA ATUAL

```
QB01 — Queixa principal (texto livre)
QB02 — Duracao da queixa [< 1 mes / 1-6 meses / 6-12 meses / > 1 ano / > 5 anos]
QB03 — Intensidade da queixa [1-10 escala visual]
QB04 — Ja tratou antes? [SIM/NAO] — Se SIM: com qual profissional? resultado?
QB05 — Usa medicamentos atualmente? [SIM/NAO] — Se SIM: listar (texto livre)
QB06 — Alergias conhecidas (texto livre)
QB07 — Intolerancia alimentar conhecida [LACTOSE / GLUTEN / FRUTOS DO MAR / NENHUMA / OUTRA]
```

### BLOCO C — SINTOMAS ATUAIS (multiselecao — cada item e um gatilho do motor)

```
QC01 — FADIGA / CANSACO CRONICO
QC02 — INSONIA / DIFICULDADE PARA DORMIR
QC03 — ACORDA DE MADRUGADA
QC04 — SONO NAO REPARADOR
QC05 — ANSIEDADE
QC06 — DEPRESSAO / TRISTEZA PERSISTENTE
QC07 — IRRITABILIDADE / EXPLOSIVIDADE
QC08 — DIFICULDADE DE CONCENTRACAO / FOCO
QC09 — TDAH / DEFICIT DE ATENCAO
QC10 — PERDA DE MEMORIA
QC11 — QUEDA DE CABELO / ALOPECIA
QC12 — UNHAS FRACAS / QUEBRADIÇAS
QC13 — PELE SECA / ENVELHECIDA
QC14 — ACNE
QC15 — GANHO DE PESO / DIFICULDADE DE EMAGRECER
QC16 — RESISTENCIA INSULINICA
QC17 — COMPULSAO ALIMENTAR
QC18 — INCHAÇO / RETENCAO HIDRICA
QC19 — CONSTIPACAO / INTESTINO PRESO
QC20 — DIARREIA FREQUENTE
QC21 — GASES / DISTENSAO ABDOMINAL
QC22 — REFLUXO / AZIA
QC23 — NAUSEAS
QC24 — DOR ARTICULAR / ARTROSE
QC25 — DOR MUSCULAR / FIBROMIALGIA
QC26 — CAIMBRAS FREQUENTES
QC27 — NEUROPATIA / FORMIGAMENTO
QC28 — LIBIDO BAIXA
QC29 — DISFUNCAO ERETIL
QC30 — IRREGULARIDADE MENSTRUAL
QC31 — TPM INTENSA
QC32 — FOGACHOS / ONDAS DE CALOR
QC33 — RESSECAMENTO VAGINAL
QC34 — INFECCOES DE REPETICAO (urinarias, respiratorias)
QC35 — IMUNIDADE BAIXA
QC36 — PALPITACOES
QC37 — FALTA DE AR AO ESFORCO
QC38 — PERNAS PESADAS / VARIZES
QC39 — EDEMA NOS MEMBROS INFERIORES
QC40 — COLESTEROL ALTO / DISLIPIDEMIA
QC41 — HIPERTENSAO
QC42 — CEFALEIA / ENXAQUECA
QC43 — ZUMBIDO NO OUVIDO
QC44 — TONTURA / VERTIGEM
QC45 — ESTRESSE CRONICO / BURNOUT
```

### BLOCO D — DOENCAS DIAGNOSTICADAS (multiselecao)

```
QD01 — HIPOTIREOIDISMO / HASHIMOTO / TIREOIDITE
QD02 — HIPERTIREOIDISMO / GRAVES
QD03 — DIABETES TIPO 2
QD04 — DIABETES TIPO 1
QD05 — RESISTENCIA INSULINICA / PRE-DIABETES
QD06 — SINDROME METABOLICA
QD07 — OBESIDADE (IMC > 30)
QD08 — DISLIPIDEMIA
QD09 — HIPERTENSAO ARTERIAL
QD10 — DOENCA CARDIOVASCULAR
QD11 — LUPUS / ARTRITE REUMATOIDE / DOENCA AUTOIMUNE
QD12 — FIBROMIALGIA
QD13 — SINDROME DO INTESTINO IRRITAVEL (SII)
QD14 — DOENCA INFLAMATORIA INTESTINAL (CROHN / RETOCOLITE)
QD15 — SIBO / DISBIOSE INTESTINAL
QD16 — DOENÇA CELIACA
QD17 — REFLUXO GASTROESOFAGICO (DRGE)
QD18 — ESTEATOSE HEPATICA (FIGADO GORDUROSO)
QD19 — COLECISTECTOMIA (REMOVEU VESICULA)
QD20 — GOTA / HIPERURICEMIA
QD21 — ANEMIA
QD22 — OSTEOPOROSE / OSTEOPENIA
QD23 — HPB (HIPERPLASIA PROSTATICA)
QD24 — SOP (SINDROME DOS OVARIOS POLICISTICOS)
QD25 — ENDOMETRIOSE
QD26 — MENOPAUSA / CLIMATERIO
QD27 — ANDROPAUSA / HIPOGONADISMO
QD28 — DEPRESSAO DIAGNOSTICADA
QD29 — TRANSTORNO DE ANSIEDADE GENERALIZADA
QD30 — TDAH DIAGNOSTICADO
QD31 — APNEIA DO SONO
QD32 — NEUROPATIA PERIFERICA
QD33 — CANCER (qual tipo? texto livre)
QD34 — SARCOPENIA
QD35 — MIASTENIA GRAVIS
```

### BLOCO E — HISTORICO CIRURGICO (multiselecao)

```
QE01 — CIRURGIA BARIATRICA [BYPASS / SLEEVE / BANDA]
QE02 — COLECISTECTOMIA (VESICULA)
QE03 — HISTERECTOMIA
QE04 — TIREOIDECTOMIA (PARCIAL / TOTAL)
QE05 — CIRURGIA CARDIACA
QE06 — CIRURGIA ORTOPEDICA (PROTESE / ARTROSCOPIA)
QE07 — CIRURGIA ONCOLOGICA
QE08 — APENDICECTOMIA
QE09 — HERNIORRAFIA
QE10 — OUTRA (texto livre)
```

### BLOCO F — HISTORICO FAMILIAR

```
QF01 — Historico familiar de CANCER [SIM/NAO] — qual tipo?
QF02 — Historico familiar de DIABETES [SIM/NAO]
QF03 — Historico familiar de DOENCA CARDIOVASCULAR [SIM/NAO]
QF04 — Historico familiar de TIREOIDE [SIM/NAO]
QF05 — Historico familiar de AUTOIMUNE [SIM/NAO]
QF06 — Historico familiar de ALZHEIMER / DEMENCIA [SIM/NAO]
QF07 — Historico familiar de DEPRESSAO / SUICIDIO [SIM/NAO]
QF08 — Historico familiar de OBESIDADE [SIM/NAO]
```

### BLOCO G — HABITOS DE VIDA

```
QG01 — Pratica atividade fisica? [NAO / 1-2x sem / 3-4x sem / 5+ sem]
QG02 — Tipo de atividade [MUSCULACAO / AEROBICO / FUNCIONAL / YOGA / NATACAO / OUTRO]
QG03 — Duracao media do treino [30min / 45min / 60min / 90min+]
QG04 — Objetivo do treino [EMAGRECIMENTO / HIPERTROFIA / SAUDE / PERFORMANCE / REABILITACAO]
QG05 — Tabagismo [NUNCA / EX-FUMANTE / ATUAL — quantos/dia?]
QG06 — Etilismo [NUNCA / SOCIAL / MODERADO / FREQUENTE]
QG07 — Qualidade do sono [OTIMO / BOM / REGULAR / RUIM / PESSIMO]
QG08 — Horas de sono por noite [< 5h / 5-6h / 6-7h / 7-8h / > 8h]
QG09 — Horario habitual de dormir [antes 22h / 22-23h / 23-00h / apos 00h]
QG10 — Nivel de estresse percebido [1-10]
QG11 — Ingesta hidrica diaria [< 1L / 1-2L / 2-3L / > 3L]
QG12 — Padrao alimentar predominante [LIVRE / LOW CARB / CETOGENICA / MEDITERRANEA / VEGETARIANA / VEGANA / OUTRO]
QG13 — Refeicoes por dia [1-2 / 3 / 4-5 / 6+]
QG14 — Jejum intermitente? [NAO / 12h / 16h / 18h / 24h+]
```

### BLOCO H — SAUDE SEXUAL E HORMONAL

```
QH01 — Libido atual [NORMAL / REDUZIDA / AUSENTE / AUMENTADA]
QH02 — Funcao eretil (homens) [NORMAL / DIFICULDADE PARCIAL / DISFUNCAO / NA]
QH03 — Ciclo menstrual (mulheres) [REGULAR / IRREGULAR / AMENORREIA / MENOPAUSA / NA]
QH04 — Usa anticoncepcional? [SIM — qual? / NAO]
QH05 — Ja fez reposicao hormonal? [SIM / NAO]
QH06 — Sintomas de andropausa? [FADIGA / LIBIDO BAIXA / PERDA MUSCULAR / IRRITABILIDADE / NAO]
QH07 — Sintomas de menopausa? [FOGACHO / RESSECAMENTO / INSONIA / IRRITABILIDADE / NAO]
QH08 — Deseja melhorar performance fisica/sexual? [SIM / NAO]
```

### BLOCO I — SAUDE PSICOLOGICA E COGNITIVA

```
QI01 — Sente-se ansioso(a) frequentemente? [NUNCA / AS VEZES / FREQUENTEMENTE / SEMPRE]
QI02 — Sente-se deprimido(a)? [NUNCA / AS VEZES / FREQUENTEMENTE / SEMPRE]
QI03 — Dificuldade de concentracao? [SIM / NAO]
QI04 — Usa medicamento psiquiatrico? [SIM — qual? / NAO]
QI05 — Ja fez acompanhamento psicologico? [SIM / NAO / EM ANDAMENTO]
QI06 — Perda de memoria recente? [SIM / NAO]
QI07 — Compulsao (alimentar, compras, jogos)? [SIM — qual? / NAO]
```

### BLOCO J — PREFERENCIAS E FINANCEIRO

```
QJ01 — Aceita somente exames (sem formulas/injetaveis)? [SIM / NAO]
QJ02 — Aceita injetavel intramuscular? [SIM / NAO]
QJ03 — Aceita injetavel endovenoso (soro)? [SIM / NAO]
QJ04 — Aceita implante subcutaneo? [SIM / NAO]
QJ05 — Aceita manipulados orais? [SIM / NAO]
QJ06 — Aceita topicos (cremes/locoes)? [SIM / NAO]
QJ07 — Perfil financeiro [BASICO / INTERMEDIARIO / AVANCADO]
       BASICO = bloqueia implante e protocolo avancado
QJ08 — Prefere tratamento com fitoterapicos/naturais? [SIM / NAO / INDIFERENTE]
```

-----

## PARTE 2 — CATALOGO REAL DE FORMULAS DO CAIO (extraido do Google Doc)

Estas sao as formulas que o Caio REALMENTE prescreve. Cada uma precisa de:
(a) registro no catalogo do sistema, (b) regra no motor com palavras-chave.

### GRUPO 1 — TIREOIDE E METABOLISMO

|#  |Nome sugerido              |Componentes-chave                                                   |Gatilhos anamnese  |
|---|---------------------------|--------------------------------------------------------------------|-------------------|
|F01|Acido Cloridrico 10%       |HCl 10% gotas                                                       |QC22,QD17,QD19,QE02|
|F02|Lugol 5%                   |Iodo 5% gotas                                                       |QD01,QC01          |
|F03|T3 isolado 10mcg           |Liotironina                                                         |QD01,QC01          |
|F04|T4 isolado 30mcg           |Levotiroxina manipulada                                             |QD01               |
|F05|Blend Tireoide Completo    |Zinco+Selenio+Boro+Anastrozol+Cromo+Coleus+Fucus+KelpIodine+Tirosina|QD01,QC01,QC15,QD06|
|F06|Iodeto de Potassio gotas   |KI 150mcg/gota                                                      |QD01               |
|F07|Iodeto+Selenometionina caps|KI+Se caps                                                          |QD01               |

### GRUPO 2 — VITAMINAS E MINERAIS BASE

|#  |Nome sugerido                   |Componentes-chave                                    |Gatilhos anamnese  |
|---|--------------------------------|-----------------------------------------------------|-------------------|
|F08|Complexo Ferro Bisglicinato XR  |Ferro+VitC+B1+B2+B3+B6+B9+B12+E+K2+Inulina+Famotidina|QD21,QC01,QC27     |
|F09|Vitaminas Liposoluveis ADEK     |D3 10000+A 10000+E 200+K2 300mcg oleosa              |QD22,QC35          |
|F10|Complexo B Noturno              |B3+B6+B9 folico+B9 metilfolato+B12 metilcobalamina   |QC02,QC03,QC04,QC27|
|F11|Magnesio Duo (Dimalato+Treonato)|MgDimalato 200+MgTreonato qsp500                     |QC02,QC26,QC05,QC08|
|F12|Mio-inositol                    |Mio-inositol 500mg                                   |QD24,QD05,QC16     |

### GRUPO 3 — HEPATOPROTETOR E DIGESTIVO

|#  |Nome sugerido                    |Componentes-chave                                                            |Gatilhos anamnese       |
|---|---------------------------------|-----------------------------------------------------------------------------|------------------------|
|F13|Hepatoprotetor Blend             |Silimarina+Metionina+Cisteina+Alcachofra+Boldo+Carqueja+Inositol             |QD18,QD19,QE02          |
|F14|Digestivo Enzimatico XR          |Lactase+DPP-IV+Bile bovina+Lipase+Amilase+Protease+Betaina+Gengibre+Berberina|QD19,QE02,QC21,QC22,QD07|
|F15|Laxante Fitoterápico             |Cascara Sagrada+Senne+Aloina                                                 |QC19                    |
|F16|Bloqueador Absorcao + Termogenico|Cromo+Capsaicina+Cascara+Aloina+Orlistat+Faseolamina                         |QC15,QD06,QD07          |

### GRUPO 4 — ANSIEDADE, ESTRESSE E GASTROPROTETOR

|#  |Nome sugerido           |Componentes-chave                                                      |Gatilhos anamnese  |
|---|------------------------|-----------------------------------------------------------------------|-------------------|
|F17|Ansiolítico Fitoterapico|Passiflora+Rhodiola+Funcho+Melissa+Camomila+Espinheira-santa+L-Theanina|QC05,QC07,QC22,QC45|
|F18|Adaptogeno Adrenal      |Ashwagandha+Schisandra+Rhodiola                                        |QC01,QC45,QC05     |
|F19|Adaptogeno Completo     |Ashwagandha+L-Theanina+Passiflora+Maca+Mucuna+Rhodiola                 |QC01,QC28,QC45,QC05|

### GRUPO 5 — SONO

|#  |Nome sugerido                 |Componentes-chave                                                                              |Gatilhos anamnese  |
|---|------------------------------|-----------------------------------------------------------------------------------------------|-------------------|
|F20|Indutor Sono Fitoterapico     |Triptofano+Theanina+MgBisgli+Passiflora+GABA+Apigenina+Magnolia+P5P+Fosfatidilserina+Melatonina|QC02,QC03,QC04,QD31|
|F21|Sache Noturno Pro-Sono        |Glicina+Taurina+Glutamina+Mio-Inositol+MgBlend(bisgli+taurato+treonato)                        |QC02,QC03,QC04     |
|F22|Sono Psicotrópico (controlado)|Alprazolam+Trazodona+Zolpidem SL                                                               |QC02 GRAVE,QD31    |

### GRUPO 6 — EMAGRECIMENTO E METABOLISMO

|#  |Nome sugerido           |Componentes-chave                                |Gatilhos anamnese  |
|---|------------------------|-------------------------------------------------|-------------------|
|F23|Panax Duo Energetico    |Panax ginseng asiatico XR                        |QC01,QC08          |
|F24|Panax Notoginseng       |Panax notoginseng XR                             |QC01,QD10          |
|F25|Dopaminergico TDAH      |Lisdexanfetamina 15mg XR                         |QC09,QD30          |
|F26|Sibutramina XR          |Sibutramina 5mg                                  |QC15,QC17,QD07     |
|F27|Cortisol Isomolecular   |Cortisol 10mg                                    |QC01 GRAVE,QD27    |
|F28|Bupropiona+Topiramato XR|Bupropiona 180+Topiramato 20                     |QC15,QC17,QD28     |
|F29|Naltrexone+Anti-refluxo |Naltrexone+Bromoprida+Famotidina+Zn+Se           |QC17,QC22,QC15     |
|F30|Termogenico Metabolico  |Cromo+Dapaglifozina+Cafeina+GreenCoffee+Berberina|QC15,QC16,QD05,QD06|

### GRUPO 7 — HORMONAL E PERFORMANCE SEXUAL

|#  |Nome sugerido               |Componentes-chave                                                          |Gatilhos anamnese         |
|---|----------------------------|---------------------------------------------------------------------------|--------------------------|
|F31|Moduladores Estrogenicos    |BioSil+DIM+Ecdisterona+Quercetina+Gamma Oryzanol                           |QD27,QC28,QH06            |
|F32|Raloxifeno 60mg             |SERM — ciclo 90 dias                                                       |QD27,QD22                 |
|F33|Tamoxifeno 15mg             |SERM — ciclo 30 dias junto Raloxifeno                                      |QD27                      |
|F34|Performance Sexual Masculina|Cabergolina+Dutasterida+Tadalafila+Vardenafila                             |QC29,QC28,QD23,QH02       |
|F35|Oxandrolona+NADH SL         |Oxandrolona 2.5+NADH 2.5 sublingual                                        |QD34,QD27,QG04=HIPERTROFIA|
|F36|Oximetolona                 |Oximetolona 5mg                                                            |QD34 GRAVE,QD27           |
|F37|Performance Libido Masculina|Mesterolona+Feno-grego+LongJack+Epimedium+GamaOryzanol+CoQ10+Tadalafil+NADH|QC28,QC29,QH02,QH08       |
|F38|Libido Fitoterapico Avancado|Feno-grego+LongJack+Epimedium+GamaOryzanol+Tadalafil                       |QC28,QC29,QH08            |
|F39|Antidepressivo+Libido       |Paroxetina+Icariin+Hypericum+Ashwagandha                                   |QC28,QD28,QI02            |
|F40|Tadalafila+NADH simples     |Tadalafila 10+NADH 5                                                       |QC29,QH02                 |

### GRUPO 8 — COGNITIVO E NOOTROPICO

|#  |Nome sugerido      |Componentes-chave                                |Gatilhos anamnese  |
|---|-------------------|-------------------------------------------------|-------------------|
|F41|Cognitivo Base     |Fosfatidilserina+Colina+Taurina+Tirosina+AcFolico|QC08,QC10,QI03     |
|F42|Nootropico Avancado|Bacopa+Teacrine+GinkgoBiloba+Vimpocetina         |QC08,QC10,QI06,QC09|

### GRUPO 9 — PERFORMANCE FISICA E PRE-TREINO

|#  |Nome sugerido               |Componentes-chave                                    |Gatilhos anamnese       |
|---|----------------------------|-----------------------------------------------------|------------------------|
|F43|Pre-Treino Sache            |BetaAlanina+Citrulina+Cafeina+Tirosina+Taurina+Colina|QG01≥3x,QG04=PERFORMANCE|
|F44|Pos-Treino Recuperacao Sache|HMB+Creatina+Citrulina+Ecdisterona+Leucina+D3+Mg+K   |QG01≥3x,QG04=HIPERTROFIA|
|F45|Termogenico Pre-Treino caps |Cafeina+GreenCoffee+Cynara+Gengibre                  |QC15,QG04=EMAGRECIMENTO |
|F46|Vasodilatador Beterraba     |Beterraba+Tirosina+Gengibre                          |QG04=PERFORMANCE,QC37   |

### GRUPO 10 — CAPILAR

|#  |Nome sugerido                        |Componentes-chave                                                   |Gatilhos anamnese|
|---|-------------------------------------|--------------------------------------------------------------------|-----------------|
|F47|Capilar Oral                         |Nutricolin+Queratina+Cisteina+Cistina+Biotina+B1+B2+B5+Actrisave+PQQ|QC11,QC12        |
|F48|Minoxidil Oral LDOM                  |Minoxidil 1.5mg                                                     |QC11             |
|F49|Dutasterida Oral (3x/sem)            |Dutasterida 0.5mg                                                   |QC11,QD23        |
|F50|Topico A — Finasterida+Minoxidil HPCH|Finasterida 0.25%+Minoxidil 5%                                      |QC11             |
|F51|Topico B — Dutasterida lipossomal    |Dutasterida 0.02%                                                   |QC11             |
|F52|Topico C — Blend Fina+Duta           |Finasterida 0.05%+Dutasterida 0.01%                                 |QC11             |
|F53|Locao Circulacao Capilar             |Arginina+Beterraba+Cafeina+Nicotinato+Centella                      |QC11             |
|F54|Vasodilatador Capilar Oral           |Arginina+Citrulina+Beterraba+Ginkgo+CoQ10                           |QC11,QC38        |

### GRUPO 11 — VASCULAR E CIRCULATORIO

|#  |Nome sugerido         |Componentes-chave                                                          |Gatilhos anamnese|
|---|----------------------|---------------------------------------------------------------------------|-----------------|
|F55|Diuretico Fitoterapico|Furosemida+K+MgTaurato+DenteDeleao+Cavalinha+Urtica+Hibiscus+ChaVerde+CoQ10|QC18,QC39,QC41   |
|F56|Vasotonico Avancado XR|Diosmina+Hesperidina+Rutina+Ginkgo+Vitis+Centella+Nattokinase+Pycnogenol   |QC38,QC39,QC40   |

### GRUPO 12 — ORTOPEDIA E NEUROPATIA

|#  |Nome sugerido             |Componentes-chave                                                       |Gatilhos anamnese|
|---|--------------------------|------------------------------------------------------------------------|-----------------|
|F57|Articular Regenerativo    |UC-II+AcHialuronico+MSM+Boswellia+Curcumina+K2+Silicio                  |QC24,QC25        |
|F58|Ferro+Cofatores Absorcao  |Fe bisgli+VitC+Metilfolato+L.plantarum+Polifenois+Quercetina            |QD21,QC01        |
|F59|Neuropatia Mitocondrial XR|Benfotiamina+P5P+5MTHF+MetilB12+ALA+AcetilCarnitina+NAC+CoQ10+MgTreonato|QC27,QD32,QD03   |

### GRUPO 13 — PROSTATA

|#  |Nome sugerido        |Componentes-chave                   |Gatilhos anamnese|
|---|---------------------|------------------------------------|-----------------|
|F60|Prostata Fitoterapico|Saw Palmetto+Tansulosina+Finasteride|QD23             |

### GRUPO 14 — MENOPAUSA / CLIMATERIO

|#  |Nome sugerido                           |Componentes-chave                                                                         |Gatilhos anamnese  |
|---|----------------------------------------|------------------------------------------------------------------------------------------|-------------------|
|F61|Balanco Vasomotor caps                  |Cimicifuga+Magnolia+L-Teanina+Safranal+VitE                                               |QC32,QD26,QH07     |
|F62|Menopausa Completo                      |TrifolioPratense+Cimicifuga+Ashwagandha+Magnolia+Passiflora+GamaOryzanol+Salvia+Pycnogenol|QD26,QC32,QC02,QH07|
|F63|HRT Progesterona+Estriol+Estradiol creme|Progesterona15+Estriol2+Estradiol0.5 transdermico                                         |QD26,QH07          |
|F64|HRT Progesterona isolada creme          |Progesterona 20mg transdermico D15-D30                                                    |QD26,QC30          |
|F65|HRT Estriol+Estradiol alta dose creme   |Estriol4+Estradiol1 transdermico D1-D14                                                   |QD26,QH07          |
|F66|HRT Testosterona feminina creme         |Testosterona 5mg transdermico                                                             |QC28 fem,QD26      |

### GRUPO 15 — ANTIOXIDANTE E ANTI-INFLAMATORIO

|#  |Nome sugerido        |Componentes-chave       |Gatilhos anamnese     |
|---|---------------------|------------------------|----------------------|
|F67|ALA Gastrorresistente|Acido Alfa Lipoico 300mg|QC27,QD03,QD32        |
|F68|Curcumina+Piperina   |Curcuma 300+Piperina 5  |QC24,QC25,QD11        |
|F69|Betaina Anidra       |TMG 500mg               |QD40=HOMOCISTEINA,QD18|

### GRUPO 16 — INTESTINAL / PROBIOTICO (protocolo faseado)

|#  |Nome sugerido                              |Componentes-chave                                              |Gatilhos anamnese       |
|---|-------------------------------------------|---------------------------------------------------------------|------------------------|
|F70|Probiotico Fase 1A — Assentamento          |L.plantarum+L.rhamnosus+L.reuteri+B.lactis+B.longum+B.coagulans|QD15,QD13,QC21,QC19,QC20|
|F71|Probiotico Fase 1B — Saccharomyces         |S.boulardii 250mg separado                                     |QD15,QC20               |
|F72|Prebiotico Fase 1C — PHGG+GOS              |PHGG 6g+GOS 3g sache                                           |QD15,QC19               |
|F73|Barreira Intestinal — Glutamina+ZnCarnosina|L-Glutamina 5g+ZnCarnosina+NAG                                 |QD15,QD13,QD14          |
|F74|Probiotico Fase 2A — Diversidade           |L.paracasei+L.gasseri+B.breve+B.bifidum+L.plantarum+B.coagulans|QD15 (mes 3-4)          |
|F75|Prebiotico Fase 2C — GOS+Inulina           |GOS 5g+Inulina 2g                                              |QD15 (mes 3-4)          |
|F76|Butirato                                   |Sodio/Mg butirato 300-600mg                                    |QD15,QD14               |
|F77|Probiotico Fase 3A — Consolidacao          |L.plantarum+L.rhamnosus+L.paracasei+B.longum+B.lactis          |QD15 (mes 5-6)          |
|F78|Prebiotico Fase 3C — Amido+Arabinogalactana|Amido resistente+Arabinogalactana+PHGG                         |QD15 (mes 5-6)          |

### GRUPO 17 — ANTIPARASITARIO

|#  |Nome sugerido               |Componentes-chave                                                                 |Gatilhos anamnese   |
|---|----------------------------|----------------------------------------------------------------------------------|--------------------|
|F79|Antiparasitario Oral ciclico|Ivermectina 12+Tinidazol 250 — 4 ciclos 3d/sem                                    |QC34,QD15           |
|F80|Antiparasitario Topico      |Tiabendazol+BenzoatoBenzila+Ivermectina+Enxofre+Lidocaina+Mentol+Prometazina locao|QC14 GRAVE,ESCABIOSE|

-----

## PARTE 3 — MAPA DE SINAPSES (REGRAS DO MOTOR)

Cada sinapse conecta: GATILHO (resposta da anamnese) → ITEM (formula/exame/injetavel).
O Dr. Replit deve fazer UPSERT na tabela `regras_motor` para CADA linha abaixo.

### FORMATO DO UPSERT:

```sql
INSERT INTO regras_motor (segmento, palavras_chave, codigo_referencia, prioridade, observacao, ativo)
VALUES ('formula', 'INSONIA,SONO RUIM,ACORDA MADRUGADA,SONO NAO REPARADOR', 'F20', 'alta', 'Indutor sono fitoterapico', true)
ON CONFLICT (codigo_referencia) DO UPDATE SET
  palavras_chave = EXCLUDED.palavras_chave,
  prioridade = EXCLUDED.prioridade,
  observacao = EXCLUDED.observacao,
  ativo = true;
```

### TABELA DE SINAPSES POR GATILHO CLINICO:

|Gatilho (palavra-chave)                 |Formulas sugeridas             |Exames sugeridos                                        |
|----------------------------------------|-------------------------------|--------------------------------------------------------|
|INSONIA,SONO RUIM,ACORDA MADRUGADA      |F20,F21,F11                    |Cortisol noturno, Melatonina salivar                    |
|ANSIEDADE,NERVOSISMO,PANICO             |F17,F19,F11                    |Cortisol, GABA, Serotonina                              |
|DEPRESSAO,TRISTEZA,APATIA               |F39,F10,F19                    |Vitamina D, B12, Folato, TSH                            |
|TDAH,DEFICIT ATENCAO,DESCONCENTRACAO    |F25,F42,F41                    |Ferritina, Zinco, Magnesio, TSH                         |
|FADIGA,CANSACO,FRAQUEZA                 |F08,F18,F23                    |Hemograma, Ferritina, B12, TSH, T3L, T4L                |
|HIPOTIREOIDISMO,HASHIMOTO,TSH ALTO      |F03,F04,F05,F02,F06            |TSH,T3L,T4L,AntiTPO,AntiTG                              |
|GANHO PESO,OBESIDADE,IMC ALTO           |F26,F28,F30,F16                |Insulina,Glicose,HOMA-IR,HbA1c,Lipidograma              |
|RESISTENCIA INSULINICA,DIABETES,GLICEMIA|F30,F12,F14                    |Insulina,Glicose,HOMA-IR,HbA1c,Peptideo C               |
|COLESTEROL,DISLIPIDEMIA,TRIGLICERIDES   |F56,F68,F69                    |Lipidograma completo,ApoB,Lp(a),PCR-us                  |
|QUEDA CABELO,ALOPECIA,CALVICIE          |F47,F48,F49,F50,F51,F52,F53,F54|Ferritina,Zinco,TSH,T3L,DHT,Testosterona,DHEA           |
|LIBIDO BAIXA MASC,DISFUNCAO ERETIL      |F37,F38,F40,F34                |Testosterona total/livre,SHBG,Estradiol,Prolactina,PSA  |
|LIBIDO BAIXA FEM,RESSECAMENTO           |F66,F63,F19                    |Estradiol,Progesterona,Testosterona,FSH,LH              |
|MENOPAUSA,FOGACHO,CLIMATERIO            |F61,F62,F63,F64,F65            |FSH,LH,Estradiol,Progesterona,TSH                       |
|ANDROPAUSA,HIPOGONADISMO                |F31,F32,F33,F35,F27            |Testosterona total/livre,SHBG,LH,FSH,Estradiol,PSA      |
|DOR ARTICULAR,ARTROSE,ARTRITE           |F57,F68                        |VHS,PCR,FAN,Fator Reumatoide,Acido Urico                |
|NEUROPATIA,FORMIGAMENTO                 |F59,F10                        |B12,Folato,Glicose,HbA1c,EMG                            |
|CONSTIPACAO,INTESTINO PRESO             |F15,F72                        |Calprotectina fecal                                     |
|DISBIOSE,SIBO,GASES,DISTENSAO           |F70,F71,F72,F73                |Calprotectina,Teste hidrogeno expirado                  |
|REFLUXO,AZIA,GASTROPATIA                |F01,F14,F17                    |Endoscopia,H.pylori                                     |
|ANEMIA,FERRITINA BAIXA                  |F08,F58                        |Hemograma,Ferritina,Ferro serico,Transferrina,B12,Folato|
|IMUNIDADE BAIXA,INFECCOES REPETICAO     |F09,F79                        |Hemograma,IgA,IgG,IgM,Vitamina D,Zinco                  |
|EDEMA,RETENCAO HIDRICA,PERNAS PESADAS   |F55,F56                        |Albumina,Proteinas totais,TSH,Funcao renal              |
|HIPERTENSAO                             |F55,F56                        |Funcao renal,Potassio,Sodio,Aldosterona                 |
|ESTEATOSE,FIGADO GORDUROSO              |F13,F68,F69                    |TGO,TGP,GGT,Bilirrubinas,Ferritina,USG abdomen          |
|SEM VESICULA,COLECISTECTOMIA            |F13,F14                        |TGO,TGP,GGT,Fosfatase alcalina                          |
|PROSTATA,HPB                            |F60                            |PSA total/livre,USG prostata                            |
|SOP,OVARIOS POLICISTICOS                |F12,F31                        |Insulina,HOMA-IR,Testosterona,DHEA-S,17OH-Progesterona  |
|OSTEOPOROSE,OSTEOPENIA                  |F09,F57                        |Calcio,Fosforo,PTH,VitaminaD,Densitometria              |
|HIPERTROFIA,GANHO MUSCULAR              |F35,F44,F43                    |Testosterona,CK,Creatinina,Ureia                        |
|EMAGRECIMENTO,PERDA PESO                |F26,F28,F30,F45                |Insulina,TSH,Cortisol,Lipidograma                       |
|ESTRESSE,BURNOUT                        |F18,F19,F21                    |Cortisol,DHEA-S,Magnesio eritrocitario                  |
|CAIMBRAS                                |F11                            |Magnesio,Calcio,Potassio,Sodio                          |
|PERFORMANCE FISICA                      |F43,F44,F46                    |CK,LDH,Hemograma,Ferritina                              |

-----

## PARTE 4 — INSTRUCOES PRO DR. REPLIT

### Passo 1 — Catalogar as 80 formulas

Cada formula acima (F01-F80) precisa existir no catalogo do sistema.
Use a tabela canonical (decidir qual: `formulas` ou `itens_terapeuticos` ou `formulas_master`).
UPSERT com codigo semantico PADCOM.

### Passo 2 — Criar regras do motor

Cada linha da tabela de sinapses (Parte 3) vira um UPSERT em `regras_motor`.
Meta: 37 regras atuais → 150+ regras cobrindo todos os gatilhos acima.

### Passo 3 — Expandir questionario na UI

Substituir Q001-Q041 (V9) pelos blocos QA-QJ acima.
Cada resposta positiva gera um gatilho semantico que o motor cruza com as regras.

### Passo 4 — Testar ciclo completo

Login → Paciente → Anamnese nova (preencher blocos) → Ativar motor →
Ver sugestoes (devem aparecer formulas F01-F80 + exames relevantes) →
Aprovar → Gerar receita RAS.

### Passo 5 — Craniotomia do Motor (UI)

Depois de popular, construir a tela /plataforma/sinapses-motor (ja aprovada pelo Dr. Claude)
pra Caio editar/criar/desativar sinapses sozinho sem depender do Dr. Replit.

### INVARIANTES

- 5.408 pacientes + 8.728 receitas + 6 triggers Wave 9 INTOCADOS
- Zero db:push, apenas migrations aditivas IF NOT EXISTS
- Campo `perfil` (nunca `role`) no middleware
- Acesso craniotomia = somente validador_mestre/platform_owner