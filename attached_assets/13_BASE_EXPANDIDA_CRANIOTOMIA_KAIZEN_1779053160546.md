# 13 — BASE ANAMNÉSICA EXPANDIDA + CRANIOTOMIA INTUITIVA + SINAPSES KAIZEN

> **De**: Dr. Claude (orquestrador)
> **Para**: Dr. Replit (executor) + Caio (médico/CEO)
> **Data**: 17/mai/2026
> **Princípio Kaizen**: melhoria contínua, expansão pensando em 1.000+ médicos
> **Filosofia**: códigos semânticos internalizados (não poluem UX do médico)
> **Tom pro Dr. Replit**: perguntas elegantes, sem impor — "o que você acha?"

---

## §0 — CARTA DE APRESENTAÇÃO AO DR. REPLIT

Dr. Replit, este documento traz a expansão completa da base de anamnese
pensando em escala nacional (1.000+ médicos brasileiros). Antes de
qualquer execução, gostaria da sua leitura crítica:

1. **Você já tem alguma estrutura semelhante** a uma tabela mestre de
   sintomas/doenças/cirurgias com taxonomia hierárquica no sistema?
   Se sim, podemos estender — não quero duplicar.
2. **A arquitetura que proponho abaixo** faz sentido pro seu fluxo?
   Tem ajustes técnicos que você sugeriria?
3. **Sobre a Craniotomia**: minha proposta de UI prioriza simplicidade
   pro Caio. Você concorda ou vê risco de simplificar demais?

Os códigos semânticos V4.0 são **internalizados** — aparecem só em
subtítulos quando útil pra auditoria. A UX do médico mostra nomes
amigáveis ("Insônia"), não códigos.

---

## §1 — EXPANSÃO MASSIVA DA BASE ANAMNÉSICA (10x atual)

### §1.1 — SINTOMAS (QSNT) — de 45 para 180 sintomas

Organizados em 12 sistemas. Cada sintoma tem código semântico interno
e nome amigável visível pro médico.

#### SISTEMA NEUROPSIQUIÁTRICO (28 sintomas)
```
QSNT NEUR SNAI FADI 0001 — Fadiga crônica
QSNT NEUR SNAI INSO 0001 — Insônia inicial
QSNT NEUR SNAI INSM 0001 — Insônia de manutenção (acorda madrugada)
QSNT NEUR SNAI INSR 0001 — Sono não reparador
QSNT NEUR SNAI ANSI 0001 — Ansiedade
QSNT NEUR SNAI PANI 0001 — Crises de pânico
QSNT NEUR SNAI DEPR 0001 — Depressão / tristeza persistente
QSNT NEUR SNAI ANED 0001 — Anedonia (perda de prazer)
QSNT NEUR SNAI IRRI 0001 — Irritabilidade / explosividade
QSNT NEUR SNAI FOCO 0001 — Dificuldade de concentração
QSNT NEUR SNAI TDAH 0001 — TDAH / déficit de atenção
QSNT NEUR SNAI MEMO 0001 — Perda de memória recente
QSNT NEUR SNAI BRAI 0001 — Brain fog (névoa mental)
QSNT NEUR SNAI APAT 0001 — Apatia
QSNT NEUR SNAI CEFA 0001 — Cefaleia
QSNT NEUR SNAI ENXA 0001 — Enxaqueca com aura
QSNT NEUR SNAI ZUMB 0001 — Zumbido no ouvido
QSNT NEUR SNAI TONT 0001 — Tontura / vertigem
QSNT NEUR SNAI CAIM 0001 — Câimbras frequentes
QSNT NEUR SNAI FORM 0001 — Formigamento / parestesias
QSNT NEUR SNAI TREM 0001 — Tremores
QSNT NEUR SNAI BURN 0001 — Burnout / esgotamento
QSNT NEUR SNAI BIPL 0001 — Oscilação de humor (bipolar)
QSNT NEUR SNAI TICS 0001 — Tiques nervosos
QSNT NEUR SNAI HIPV 0001 — Hipervigilância
QSNT NEUR SNAI PESA 0001 — Pesadelos frequentes
QSNT NEUR SNAI BRUX 0001 — Bruxismo noturno
QSNT NEUR SNAI APNE 0001 — Apneia percebida (parceiro relata)
```

#### SISTEMA METABÓLICO E ENDÓCRINO (22 sintomas)
```
QSNT META SNAI GPSO 0001 — Ganho de peso
QSNT META SNAI PPSO 0001 — Perda de peso involuntária
QSNT META SNAI COMP 0001 — Compulsão alimentar
QSNT META SNAI DOCE 0001 — Compulsão por doces
QSNT META SNAI SALG 0001 — Compulsão por salgados
QSNT META SNAI INHA 0001 — Inchaço / retenção hídrica
QSNT META SNAI INHR 0001 — Inchaço pós-refeição
QSNT META SNAI SEDE 0001 — Sede excessiva
QSNT META SNAI POLI 0001 — Poliúria (urina muito)
QSNT META SNAI HIPG 0001 — Hipoglicemia entre refeições
QSNT META SNAI FRIO 0001 — Intolerância ao frio
QSNT META SNAI CALR 0001 — Intolerância ao calor
QSNT META SNAI SUDO 0001 — Sudorese excessiva
QSNT META SNAI SUDN 0001 — Sudorese noturna
QSNT META SNAI ACNT 0001 — Acantose nigricans
QSNT META SNAI ESTR 0001 — Estrias recentes
QSNT META SNAI CIRC 0001 — Aumento circunf. abdominal
QSNT META SNAI EDCD 0001 — Edema de membros inferiores
QSNT META SNAI ENFR 0001 — Enfraquecimento ungueal
QSNT META SNAI QPCA 0001 — Queda de cabelo difusa
QSNT META SNAI FBRD 0001 — Fragilidade dental
QSNT META SNAI HALI 0001 — Halitose (mau hálito persistente)
```

#### SISTEMA GASTROINTESTINAL (24 sintomas)
```
QSNT GAST SNAI REFL 0001 — Refluxo / azia
QSNT GAST SNAI AZIA 0001 — Pirose pós-prandial
QSNT GAST SNAI NAUS 0001 — Náuseas
QSNT GAST SNAI VOMI 0001 — Vômitos
QSNT GAST SNAI CONS 0001 — Constipação intestinal
QSNT GAST SNAI DIAR 0001 — Diarreia frequente
QSNT GAST SNAI ALTE 0001 — Alternância constip./diarreia
QSNT GAST SNAI GASE 0001 — Gases / flatulência
QSNT GAST SNAI DIST 0001 — Distensão abdominal
QSNT GAST SNAI DORE 0001 — Dor epigástrica
QSNT GAST SNAI DRAB 0001 — Dor abdominal difusa
QSNT GAST SNAI DRDI 0001 — Dor abdominal pós-refeição
QSNT GAST SNAI MUCO 0001 — Muco nas fezes
QSNT GAST SNAI SANG 0001 — Sangue nas fezes
QSNT GAST SNAI FEZE 0001 — Fezes pastosas/oleosas
QSNT GAST SNAI URGE 0001 — Urgência evacuatória
QSNT GAST SNAI INCV 0001 — Incontinência fecal
QSNT GAST SNAI HEMO 0001 — Hemorroidas
QSNT GAST SNAI ARRO 0001 — Arrotos frequentes
QSNT GAST SNAI GORD 0001 — Intolerância à gordura
QSNT GAST SNAI LACT 0001 — Intolerância a lactose
QSNT GAST SNAI GLUT 0001 — Intolerância a glúten
QSNT GAST SNAI HIST 0001 — Intolerância a histamina
QSNT GAST SNAI FODM 0001 — Sensibilidade a FODMAPs
```

#### SISTEMA CARDIOVASCULAR (14 sintomas)
```
QSNT CARD SNAI PALP 0001 — Palpitações
QSNT CARD SNAI TAQI 0001 — Taquicardia em repouso
QSNT CARD SNAI BRAD 0001 — Bradicardia sintomática
QSNT CARD SNAI ARRI 0001 — Arritmia / batimento irregular
QSNT CARD SNAI DOPE 0001 — Dor torácica em esforço
QSNT CARD SNAI DOTE 0001 — Dor torácica em repouso
QSNT CARD SNAI DISP 0001 — Dispneia ao esforço
QSNT CARD SNAI ORTO 0001 — Ortopneia (falta de ar deitado)
QSNT CARD SNAI SINC 0001 — Síncope / desmaio
QSNT CARD SNAI PRES 0001 — Pressão arterial alta
QSNT CARD SNAI HIPO 0001 — Hipotensão postural
QSNT CARD SNAI EDEM 0001 — Edema vespertino
QSNT CARD SNAI VARI 0001 — Varizes / pernas pesadas
QSNT CARD SNAI CIAN 0001 — Cianose de extremidades
```

#### SISTEMA OSTEOMUSCULAR (16 sintomas)
```
QSNT ORTO SNAI DORA 0001 — Dor articular generalizada
QSNT ORTO SNAI ARTR 0001 — Artrose / dor mecânica
QSNT ORTO SNAI ARRE 0001 — Artrite / dor inflamatória
QSNT ORTO SNAI RIGI 0001 — Rigidez matinal > 30min
QSNT ORTO SNAI DORM 0001 — Dor muscular generalizada
QSNT ORTO SNAI FIBR 0001 — Fibromialgia / pontos dolorosos
QSNT ORTO SNAI LOMB 0001 — Lombalgia crônica
QSNT ORTO SNAI CERV 0001 — Cervicalgia
QSNT ORTO SNAI DORC 0001 — Dor ciática
QSNT ORTO SNAI FRAQ 0001 — Fraqueza muscular
QSNT ORTO SNAI SARC 0001 — Sarcopenia / perda massa
QSNT ORTO SNAI CRES 0001 — Estalos articulares
QSNT ORTO SNAI INCH 0001 — Inchaço articular
QSNT ORTO SNAI TENS 0001 — Tendinite recorrente
QSNT ORTO SNAI ENTE 0001 — Entorses frequentes
QSNT ORTO SNAI MIAL 0001 — Mialgia pós-exercício prolongada
```

#### SISTEMA GENITOURINÁRIO E SEXUAL (22 sintomas)
```
QSNT SEXM SNAI LIBM 0001 — Libido baixa (masculino)
QSNT SEXM SNAI ERET 0001 — Disfunção erétil
QSNT SEXM SNAI EJAC 0001 — Ejaculação precoce
QSNT SEXM SNAI ANEJ 0001 — Anejaculação
QSNT SEXM SNAI INFE 0001 — Infertilidade masculina
QSNT SEXM SNAI VOLT 0001 — Volume ejaculatório reduzido
QSNT SEXF SNAI LIBF 0001 — Libido baixa (feminino)
QSNT SEXF SNAI RESS 0001 — Ressecamento vaginal
QSNT SEXF SNAI DORP 0001 — Dispareunia (dor relação)
QSNT SEXF SNAI ANOR 0001 — Anorgasmia
QSNT SEXF SNAI IRRG 0001 — Ciclo menstrual irregular
QSNT SEXF SNAI AMEN 0001 — Amenorreia
QSNT SEXF SNAI MENO 0001 — Menorragia (sangramento intenso)
QSNT SEXF SNAI TPM1 0001 — TPM intensa
QSNT SEXF SNAI FOGS 0001 — Fogachos / ondas de calor
QSNT SEXF SNAI INFF 0001 — Infertilidade feminina
QSNT SEXF SNAI MAST 0001 — Mastalgia cíclica
QSNT RENA SNAI ITU1 0001 — ITU de repetição
QSNT RENA SNAI INCO 0001 — Incontinência urinária
QSNT RENA SNAI NOCT 0001 — Noctúria
QSNT RENA SNAI URGM 0001 — Urgência miccional
QSNT RENA SNAI HEMU 0001 — Hematúria
```

#### SISTEMA DERMATOLÓGICO E CAPILAR (16 sintomas)
```
QSNT CAPI SNAI QUED 0001 — Queda de cabelo
QSNT CAPI SNAI ALOM 0001 — Alopecia androgenética masc
QSNT CAPI SNAI ALOF 0001 — Alopecia feminina
QSNT CAPI SNAI ALOA 0001 — Alopecia areata
QSNT CAPI SNAI UNHF 0001 — Unhas fracas / quebradiças
QSNT DERM SNAI SECO 0001 — Pele seca
QSNT DERM SNAI OLEO 0001 — Pele oleosa
QSNT DERM SNAI ACNE 0001 — Acne adulta
QSNT DERM SNAI ROSA 0001 — Rosácea
QSNT DERM SNAI MELA 0001 — Melasma / manchas
QSNT DERM SNAI VITI 0001 — Vitiligo
QSNT DERM SNAI ECZE 0001 — Eczema / dermatite atópica
QSNT DERM SNAI PSOR 0001 — Psoríase
QSNT DERM SNAI URTI 0001 — Urticária crônica
QSNT DERM SNAI CICR 0001 — Cicatrização lenta
QSNT DERM SNAI EQUI 0001 — Equimoses fáceis
```

#### SISTEMA IMUNOLÓGICO (10 sintomas)
```
QSNT IMUN SNAI INFR 0001 — Infecções de repetição
QSNT IMUN SNAI RESP 0001 — Infecções respiratórias
QSNT IMUN SNAI URIN 0001 — Infecções urinárias rec.
QSNT IMUN SNAI HERP 0001 — Herpes labial recorrente
QSNT IMUN SNAI HERG 0001 — Herpes genital recorrente
QSNT IMUN SNAI SINU 0001 — Sinusite crônica
QSNT IMUN SNAI ALER 0001 — Alergias respiratórias
QSNT IMUN SNAI CAND 0001 — Candidíase recorrente
QSNT IMUN SNAI AFTA 0001 — Aftas recorrentes
QSNT IMUN SNAI FEBR 0001 — Febre recorrente sem causa
```

#### SISTEMA RESPIRATÓRIO (8 sintomas)
```
QSNT RESP SNAI ASMA 0001 — Asma / bronquite
QSNT RESP SNAI TOSS 0001 — Tosse crônica
QSNT RESP SNAI EXPC 0001 — Expectoração crônica
QSNT RESP SNAI CHIA 0001 — Chiado no peito
QSNT RESP SNAI APNS 0001 — Apneia diagnosticada
QSNT RESP SNAI RONC 0001 — Roncos
QSNT RESP SNAI ESPI 0001 — Espirros frequentes
QSNT RESP SNAI CORI 0001 — Coriza crônica
```

#### SISTEMA HEPÁTICO / DETOX (8 sintomas)
```
QSNT HEPA SNAI ICTE 0001 — Icterícia
QSNT HEPA SNAI ESTE 0001 — Esteatose conhecida
QSNT HEPA SNAI ABDA 0001 — Dor em hipocôndrio direito
QSNT HEPA SNAI POSP 0001 — Sensação ressaca matinal s/álcool
QSNT HEPA SNAI INTM 0001 — Intolerância a medicamentos
QSNT HEPA SNAI INTC 0001 — Intolerância a perfumes/químicos
QSNT HEPA SNAI MAUH 0001 — Mau hálito hepático
QSNT HEPA SNAI URIE 0001 — Urina escura recorrente
```

#### SAÚDE COGNITIVA AVANÇADA (6 sintomas)
```
QSNT NEUR SNAI ALZH 0001 — Esquecimento progressivo
QSNT NEUR SNAI EXEC 0001 — Função executiva prejudicada
QSNT NEUR SNAI TPRO 0001 — Tomada de decisão lenta
QSNT NEUR SNAI VERB 0001 — Dificuldade encontrar palavras
QSNT NEUR SNAI ESPA 0001 — Desorientação espacial
QSNT NEUR SNAI REGR 0001 — Regressão funcional percebida
```

#### SAÚDE MENTAL EXPANDIDA (6 sintomas)
```
QSNT PSIC SNAI TRAU 0001 — Trauma não resolvido
QSNT PSIC SNAI PERD 0001 — Luto recente
QSNT PSIC SNAI ISOL 0001 — Isolamento social
QSNT PSIC SNAI AUTO 0001 — Pensamentos auto-críticos
QSNT PSIC SNAI ENGA 0001 — Engajamento profissional baixo
QSNT PSIC SNAI PROP 0001 — Falta de propósito
```

**TOTAL: 180 sintomas catalogados** (anteriormente 45).

### §1.2 — DOENÇAS DIAGNOSTICADAS (QDGN) — de 35 para 120 doenças

Organizadas em 14 grupos. Cada doença com CID-10 quando aplicável.

#### ENDÓCRINAS (18 doenças)
```
QDGN TIRE DIAG HIPO 0001 — Hipotireoidismo (E03)
QDGN TIRE DIAG HASH 0001 — Tireoidite de Hashimoto (E06.3)
QDGN TIRE DIAG HIPR 0001 — Hipertireoidismo (E05)
QDGN TIRE DIAG GRAV 0001 — Doença de Graves (E05.0)
QDGN TIRE DIAG NODT 0001 — Nódulo tireoidiano (E04.1)
QDGN TIRE DIAG CATI 0001 — Câncer de tireoide (C73)
QDGN META DIAG DM2X 0001 — Diabetes mellitus tipo 2 (E11)
QDGN META DIAG DM1X 0001 — Diabetes mellitus tipo 1 (E10)
QDGN META DIAG DMGE 0001 — Diabetes gestacional (O24)
QDGN META DIAG PDM2 0001 — Pré-diabetes (R73.0)
QDGN META DIAG RESI 0001 — Resistência insulínica
QDGN META DIAG SMET 0001 — Síndrome metabólica
QDGN META DIAG OBES 0001 — Obesidade (E66)
QDGN META DIAG OBM3 0001 — Obesidade grau III (E66.01)
QDGN META DIAG DISL 0001 — Dislipidemia (E78)
QDGN HORM DIAG SUPC 0001 — Síndrome de Cushing (E24)
QDGN HORM DIAG ADDI 0001 — Doença de Addison (E27.1)
QDGN HORM DIAG ACRM 0001 — Acromegalia (E22.0)
```

#### CARDIOVASCULARES (12 doenças)
```
QDGN CARD DIAG HASS 0001 — Hipertensão arterial sistêmica (I10)
QDGN CARD DIAG IAMP 0001 — Infarto prévio (I25.2)
QDGN CARD DIAG ICCO 0001 — Insuficiência cardíaca (I50)
QDGN CARD DIAG FIAT 0001 — Fibrilação atrial (I48)
QDGN CARD DIAG AVCC 0001 — AVC prévio (I63)
QDGN CARD DIAG TVAS 0001 — Trombose venosa profunda (I80)
QDGN CARD DIAG TEPP 0001 — TEP prévio (I26)
QDGN CARD DIAG ANEU 0001 — Aneurisma (I71)
QDGN CARD DIAG VARI 0001 — Varizes graves (I83)
QDGN CARD DIAG COAR 0001 — Coronariopatia (I25)
QDGN CARD DIAG VALV 0001 — Valvopatia (I34)
QDGN CARD DIAG MIOC 0001 — Cardiomiopatia (I42)
```

#### AUTOIMUNES (14 doenças)
```
QDGN AUTO DIAG LUPU 0001 — Lúpus eritematoso sistêmico (M32)
QDGN AUTO DIAG ARRE 0001 — Artrite reumatoide (M05/M06)
QDGN AUTO DIAG ESCL 0001 — Esclerose sistêmica (M34)
QDGN AUTO DIAG SJOG 0001 — Síndrome de Sjögren (M35)
QDGN AUTO DIAG ESPM 0001 — Espondilite anquilosante (M45)
QDGN AUTO DIAG MIAS 0001 — Miastenia gravis (G70)
QDGN AUTO DIAG ESCM 0001 — Esclerose múltipla (G35)
QDGN AUTO DIAG GUIL 0001 — Síndrome Guillain-Barré (G61)
QDGN AUTO DIAG VITM 0001 — Vitiligo (L80)
QDGN AUTO DIAG PSOR 0001 — Psoríase (L40)
QDGN AUTO DIAG CELA 0001 — Doença celíaca (K90)
QDGN AUTO DIAG CRON 0001 — Doença de Crohn (K50)
QDGN AUTO DIAG RETU 0001 — Retocolite ulcerativa (K51)
QDGN AUTO DIAG HASA 0001 — Hashimoto autoimune (E06.3)
```

#### GASTROINTESTINAIS (12 doenças)
```
QDGN GAST DIAG SIID 0001 — Síndrome intestino irritável (K58)
QDGN GAST DIAG SIBO 0001 — SIBO (sobrecresc. bacteriano)
QDGN GAST DIAG DISB 0001 — Disbiose intestinal
QDGN GAST DIAG ESTE 0001 — Esteatose hepática (K76.0)
QDGN GAST DIAG NASH 0001 — NASH (K75.81)
QDGN GAST DIAG DRGE 0001 — DRGE (K21)
QDGN GAST DIAG ULCG 0001 — Úlcera gástrica (K25)
QDGN GAST DIAG HPYL 0001 — H. pylori positivo (B96.81)
QDGN GAST DIAG DIVE 0001 — Diverticulose (K57)
QDGN GAST DIAG POLP 0001 — Pólipos intestinais (K63.5)
QDGN GAST DIAG GAST 0001 — Gastrite crônica (K29.5)
QDGN GAST DIAG INTC 0001 — Intoxicação por candida (B37)
```

#### GINECOLÓGICAS (10 doenças)
```
QDGN HORF DIAG SOPP 0001 — Síndrome ovários policísticos (E28.2)
QDGN HORF DIAG ENDM 0001 — Endometriose (N80)
QDGN HORF DIAG MIOM 0001 — Miomatose uterina (D25)
QDGN HORF DIAG MENC 0001 — Menopausa precoce (E28.3)
QDGN HORF DIAG MENO 0001 — Menopausa (N95.1)
QDGN HORF DIAG PREM 0001 — Pré-menopausa (N95.0)
QDGN HORF DIAG ADEM 0001 — Adenomiose
QDGN HORF DIAG INSF 0001 — Insuficiência ovariana (E28.3)
QDGN HORF DIAG CAMM 0001 — Câncer mama prévio (C50)
QDGN HORF DIAG CAEN 0001 — Câncer endométrio (C54)
```

#### UROLÓGICAS E MASCULINAS (8 doenças)
```
QDGN HORM DIAG HBPP 0001 — HBP (N40)
QDGN HORM DIAG PSAA 0001 — PSA alterado
QDGN HORM DIAG CAPR 0001 — Câncer próstata prévio (C61)
QDGN HORM DIAG HIPM 0001 — Hipogonadismo masculino (E29.1)
QDGN HORM DIAG ANDR 0001 — Andropausa
QDGN HORM DIAG VARI 0001 — Varicocele (I86.1)
QDGN HORM DIAG INFR 0001 — Infertilidade masc (N46)
QDGN HORM DIAG PROS 0001 — Prostatite crônica (N41)
```

#### NEUROLÓGICAS E PSIQUIÁTRICAS (12 doenças)
```
QDGN NEUR DIAG DEPM 0001 — Depressão maior (F33)
QDGN NEUR DIAG TAGE 0001 — Transt. ansiedade generalizada (F41.1)
QDGN NEUR DIAG TPCC 0001 — Transt. de pânico (F41.0)
QDGN NEUR DIAG TOCC 0001 — TOC (F42)
QDGN NEUR DIAG BIPL 0001 — Transt. bipolar (F31)
QDGN NEUR DIAG ESQZ 0001 — Esquizofrenia (F20)
QDGN NEUR DIAG TDAH 0001 — TDAH diagnosticado (F90)
QDGN NEUR DIAG TEPT 0001 — TEPT (F43.1)
QDGN NEUR DIAG TASS 0001 — Transt. abuso substâncias (F19)
QDGN NEUR DIAG ALZH 0001 — Alzheimer (G30)
QDGN NEUR DIAG PARK 0001 — Parkinson (G20)
QDGN NEUR DIAG ENXM 0001 — Enxaqueca crônica (G43)
```

#### ONCOLÓGICAS (12 doenças prévias)
```
QDGN ONCO DIAG CAMM 0001 — Câncer mama
QDGN ONCO DIAG CAPM 0001 — Câncer pulmão
QDGN ONCO DIAG CAES 0001 — Câncer estômago
QDGN ONCO DIAG CACL 0001 — Câncer colorretal
QDGN ONCO DIAG CAPR 0001 — Câncer próstata
QDGN ONCO DIAG CAEN 0001 — Câncer endométrio
QDGN ONCO DIAG CAOV 0001 — Câncer ovário
QDGN ONCO DIAG CATI 0001 — Câncer tireoide
QDGN ONCO DIAG MELA 0001 — Melanoma
QDGN ONCO DIAG LINF 0001 — Linfoma
QDGN ONCO DIAG LEUK 0001 — Leucemia
QDGN ONCO DIAG OUTC 0001 — Outro câncer (texto livre)
```

#### NUTRICIONAIS E HEMATOLÓGICAS (8 doenças)
```
QDGN VITA DIAG ANEM 0001 — Anemia ferropriva (D50)
QDGN VITA DIAG ANME 0001 — Anemia megaloblástica (D51)
QDGN VITA DIAG ANHE 0001 — Anemia hemolítica (D55)
QDGN VITA DIAG OSTM 0001 — Osteoporose (M81)
QDGN VITA DIAG OSPN 0001 — Osteopenia (M85.8)
QDGN VITA DIAG DEFD 0001 — Deficiência de vitamina D
QDGN VITA DIAG DEB12 0001 — Deficiência de B12
QDGN VITA DIAG GOTA 0001 — Gota / hiperuricemia (M10)
```

#### OUTRAS RELEVANTES (14 doenças)
```
QDGN RENA DIAG IRCC 0001 — Insuficiência renal crônica (N18)
QDGN RENA DIAG LITT 0001 — Litíase renal (N20)
QDGN GAST DIAG COLE 0001 — Colelitíase (K80)
QDGN RESP DIAG ASMM 0001 — Asma (J45)
QDGN RESP DIAG DPCC 0001 — DPOC (J44)
QDGN RESP DIAG APNS 0001 — Apneia do sono (G47.3)
QDGN GERA DIAG FIBR 0001 — Fibromialgia (M79.7)
QDGN GERA DIAG SFAD 0001 — Síndrome fadiga crônica (G93.3)
QDGN GERA DIAG MIAS 0001 — Miastenia gravis (G70)
QDGN ORTO DIAG ARTC 0001 — Artrose cervical (M47.812)
QDGN ORTO DIAG ARTL 0001 — Artrose lombar (M47.817)
QDGN ORTO DIAG HENN 0001 — Hérnia de disco (M51)
QDGN GERA DIAG SARC 0001 — Sarcopenia (M62.84)
QDGN GERA DIAG FRAG 0001 — Síndrome de fragilidade
```

**TOTAL: 120 doenças** (anteriormente 35).

### §1.3 — CIRURGIAS / PROCEDIMENTOS PRÉVIOS (QCIR) — de 10 para 45

```
QCIR GAST PROC BARI 0001 — Cirurgia bariátrica (genérica)
QCIR GAST PROC BYPS 0001 — Bypass gástrico Y-de-Roux
QCIR GAST PROC SLEE 0001 — Sleeve gástrico
QCIR GAST PROC BAND 0001 — Banda gástrica
QCIR GAST PROC SADI 0001 — SADI-S / Switch duodenal
QCIR GAST PROC REVI 0001 — Revisão bariátrica
QCIR GAST PROC COLE 0001 — Colecistectomia
QCIR GAST PROC APEN 0001 — Apendicectomia
QCIR GAST PROC GAST 0001 — Gastrectomia parcial/total
QCIR GAST PROC HERR 0001 — Herniorrafia abdominal
QCIR GAST PROC HEAI 0001 — Hérnia inguinal
QCIR GAST PROC COLO 0001 — Colostomia/colectomia
QCIR HORF PROC HIST 0001 — Histerectomia total
QCIR HORF PROC HISP 0001 — Histerectomia parcial
QCIR HORF PROC OFOR 0001 — Ooforectomia uni/bilateral
QCIR HORF PROC SALP 0001 — Salpingectomia
QCIR HORF PROC LAQU 0001 — Laqueadura
QCIR HORF PROC CSEC 0001 — Cesárea(s)
QCIR HORF PROC CURE 0001 — Curetagem
QCIR HORM PROC VASE 0001 — Vasectomia
QCIR HORM PROC PROS 0001 — Prostatectomia
QCIR HORM PROC HIDR 0001 — Cirurgia hidrocele
QCIR TIRE PROC TIRT 0001 — Tireoidectomia total
QCIR TIRE PROC TIRP 0001 — Tireoidectomia parcial
QCIR TIRE PROC PARA 0001 — Paratireoidectomia
QCIR CARD PROC CRMV 0001 — CRM (ponte safena/mamária)
QCIR CARD PROC ANGI 0001 — Angioplastia
QCIR CARD PROC MARC 0001 — Marca-passo
QCIR CARD PROC VALV 0001 — Troca valvar
QCIR CARD PROC ABAR 0001 — Ablação por radiofrequência
QCIR ORTO PROC ARTR 0001 — Artroscopia (joelho/ombro)
QCIR ORTO PROC PROT 0001 — Prótese articular
QCIR ORTO PROC FUSA 0001 — Artrodese coluna
QCIR ORTO PROC HERN 0001 — Cirurgia hérnia de disco
QCIR ORTO PROC OSTE 0001 — Osteotomia
QCIR NEUR PROC CRAN 0001 — Craniotomia
QCIR NEUR PROC SHUN 0001 — Derivação ventricular
QCIR NEUR PROC ESTI 0001 — DBS / estim. cerebral profunda
QCIR ONCO PROC MAMM 0001 — Mastectomia
QCIR ONCO PROC TUMR 0001 — Ressecção tumoral genérica
QCIR ONCO PROC QUIM 0001 — Quimioterapia prévia
QCIR ONCO PROC RADI 0001 — Radioterapia prévia
QCIR DERM PROC BARI 0001 — Cirurgia plástica grande porte
QCIR DERM PROC LIPO 0001 — Lipoaspiração
QCIR GERA PROC TRPL 0001 — Transplante de órgão
```

**TOTAL: 45 cirurgias** (anteriormente 10).

### §1.4 — HISTÓRICO FAMILIAR (QFAM) — de 8 para 30

```
QFAM ONCO REDE CAMM 0001 — Câncer mama familiar
QFAM ONCO REDE CAOV 0001 — Câncer ovário familiar
QFAM ONCO REDE CAPR 0001 — Câncer próstata familiar
QFAM ONCO REDE CACL 0001 — Câncer colorretal familiar
QFAM ONCO REDE CAES 0001 — Câncer estômago familiar
QFAM ONCO REDE CAPM 0001 — Câncer pulmão familiar
QFAM ONCO REDE CATI 0001 — Câncer tireoide familiar
QFAM ONCO REDE MELA 0001 — Melanoma familiar
QFAM ONCO REDE BRCA 0001 — Mutação BRCA familiar
QFAM CARD REDE CVDF 0001 — Doença cardiovascular familiar
QFAM CARD REDE IAMP 0001 — Infarto prematuro familiar (<55)
QFAM CARD REDE AVCC 0001 — AVC familiar
QFAM CARD REDE HAFM 0001 — HAS familiar
QFAM CARD REDE COLF 0001 — Colesterol familiar alto
QFAM META REDE DMFA 0001 — Diabetes familiar
QFAM META REDE OBEF 0001 — Obesidade familiar
QFAM TIRE REDE TIRF 0001 — Tireoidopatia familiar
QFAM AUTO REDE LUPU 0001 — Lúpus familiar
QFAM AUTO REDE ARRE 0001 — Artrite reumatoide familiar
QFAM AUTO REDE ESCM 0001 — Esclerose múltipla familiar
QFAM AUTO REDE CELI 0001 — Celíaco familiar
QFAM NEUR REDE ALZF 0001 — Alzheimer / demência familiar
QFAM NEUR REDE PARK 0001 — Parkinson familiar
QFAM NEUR REDE DEPF 0001 — Depressão familiar
QFAM NEUR REDE SUIC 0001 — Suicídio familiar
QFAM NEUR REDE ESQZ 0001 — Esquizofrenia familiar
QFAM RENA REDE NEFR 0001 — Doença renal familiar
QFAM HEPA REDE HEPF 0001 — Hepatopatia familiar
QFAM GERA REDE LONG 0001 — Longevidade > 95 anos
QFAM GERA REDE COSF 0001 — Consanguinidade
```

**TOTAL: 30 entradas de histórico familiar** (anteriormente 8).

### §1.5 — HÁBITOS DE VIDA (QHAB) — de 14 para 40

```
QHAB GERA COMP ATIV 0001 — Pratica atividade física
QHAB GERA COMP FRQT 0001 — Frequência de treino semanal
QHAB GERA COMP TPAT 0001 — Tipo de atividade física
QHAB GERA COMP DURA 0001 — Duração média treino
QHAB GERA COMP OBJT 0001 — Objetivo do treino
QHAB GERA COMP SEDR 0001 — Sedentarismo
QHAB GERA COMP TABG 0001 — Tabagismo atual
QHAB GERA COMP EXTB 0001 — Ex-tabagismo
QHAB GERA COMP CARG 0001 — Carga tabágica (anos-maço)
QHAB GERA COMP ALCO 0001 — Etilismo
QHAB GERA COMP ALCF 0001 — Frequência etilismo
QHAB GERA COMP DROG 0001 — Uso outras substâncias
QHAB NEUR COMP SONH 0001 — Horas de sono
QHAB NEUR COMP SONQ 0001 — Qualidade do sono
QHAB NEUR COMP DEIT 0001 — Horário de deitar
QHAB NEUR COMP ACOR 0001 — Horário de acordar
QHAB NEUR COMP COCH 0001 — Cochilo diurno
QHAB NEUR COMP TELA 0001 — Uso de tela antes dormir
QHAB NEUR COMP ESTR 0001 — Nível de estresse 1-10
QHAB NEUR COMP MEDI 0001 — Pratica meditação
QHAB NEUR COMP RESP 0001 — Pratica respiração
QHAB GAST COMP HIDR 0001 — Ingesta hídrica diária
QHAB GAST COMP CAFE 0001 — Consumo café diário
QHAB GAST COMP CHA1 0001 — Consumo chá diário
QHAB GAST COMP REFR 0001 — Consumo refrigerante
QHAB META COMP PADR 0001 — Padrão alimentar
QHAB META COMP REFD 0001 — Refeições por dia
QHAB META COMP JEJU 0001 — Pratica jejum intermitente
QHAB META COMP ULTR 0001 — Consumo ultraprocessados
QHAB META COMP GLUT 0001 — Consome glúten
QHAB META COMP LACT 0001 — Consome lácteos
QHAB META COMP CARN 0001 — Consome carne vermelha
QHAB META COMP PEIX 0001 — Frequência peixe
QHAB META COMP OVOS 0001 — Frequência ovos
QHAB META COMP VEGE 0001 — Porções vegetais/dia
QHAB META COMP FRUT 0001 — Porções frutas/dia
QHAB GERA COMP SOLR 0001 — Exposição solar diária
QHAB GERA COMP CONT 0001 — Vida em contato com natureza
QHAB GERA COMP REDS 0001 — Tempo redes sociais
QHAB GERA COMP TRAB 0001 — Horas trabalho diário
```

**TOTAL: 40 hábitos** (anteriormente 14).

---

## §2 — RESUMO DA EXPANSÃO

| Bloco anamnese | Antes | Agora | Crescimento |
|----------------|------:|------:|------------:|
| Sintomas (QSNT) | 45 | 180 | 4x |
| Doenças (QDGN) | 35 | 120 | 3.4x |
| Cirurgias (QCIR) | 10 | 45 | 4.5x |
| Histórico familiar (QFAM) | 8 | 30 | 3.75x |
| Hábitos (QHAB) | 14 | 40 | 2.85x |
| **TOTAL** | **112** | **415** | **3.7x** |

Cada uma das 415 perguntas pode ser:
- Gatilho de sinapse → dispara fórmulas/exames/injetáveis/implantes
- Filtro de segurança → bloqueia sugestões contraindicadas
- Métrica de risco → pondera prioridade da sugestão

---

## §3 — CRANIOTOMIA DO MOTOR — UX MASTIGADA

A UI precisa ser tão simples que o Caio consiga editar regras enquanto
toma café. Princípios:

1. **Códigos escondidos** — aparecem só em tooltips/subtítulos
2. **Drag & drop** — arrastar sintoma para sugestão cria sinapse
3. **Toggle visível** — botão liga/desliga grande, sem submenu
4. **Cores semânticas** — verde=ativa, cinza=inativa, amarelo=rascunho
5. **Busca universal** — uma barra que encontra tudo
6. **Histórico inline** — quem mudou, quando, por quê (sem sair da tela)
7. **Simulador embutido** — testar antes de salvar

### §3.1 — Tela principal (mobile-friendly, TDAH-friendly)

```
┌───────────────────────────────────────────────────────────────┐
│  🧠 CRANIOTOMIA DO MOTOR                          [Dr. Caio ▼]│
├───────────────────────────────────────────────────────────────┤
│  🔍 [Buscar sintoma, doença, fórmula, código...]              │
│                                                               │
│  [SINAPSES] [GATILHOS] [SUGESTÕES] [SIMULADOR] [AUDITORIA]    │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ▼ INSÔNIA — 5 sugestões ativas                  [✏️] [➕]    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 🟢 Indutor Sono Fitoterápico        ALTA   [ON] [✏️][🗑️]│ │
│  │ 🟢 Sachê Noturno Pro-Sono           MÉDIA  [ON] [✏️][🗑️]│ │
│  │ 🟢 5-HTP 20mg (injetável)           ALTA   [ON] [✏️][🗑️]│ │
│  │ 🟢 Melatonina pellet                MÉDIA  [ON] [✏️][🗑️]│ │
│  │ 🟢 Cortisol salivar noturno (exame) MÉDIA  [ON] [✏️][🗑️]│ │
│  │ ➕ Adicionar nova sugestão para INSÔNIA                  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ▼ TDAH — 2 sugestões ativas, 3 órfãs            [✏️] [➕]    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 🟢 Lisdexanfetamina XR              ALTA   [ON] [✏️][🗑️]│ │
│  │ 🟢 Nootrópico Avançado              MÉDIA  [ON] [✏️][🗑️]│ │
│  │ ⚠️ Falta: INJETÁVEL, EXAME, IMPLANTE                     │ │
│  │ ➕ Adicionar sugestão para TDAH                          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ▼ HIPERTENSÃO — 🔴 ZERO sugestões                [✏️] [➕]   │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ ⚠️ Gatilho órfão — conectar agora                        │ │
│  │ ➕ Conectar HIPERTENSÃO a sugestões                      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### §3.2 — Modal "Editar sinapse" (1 clique no ✏️)

```
┌───────────────────────────────────────────────────────────────┐
│  ✏️ EDITAR: INSÔNIA → Indutor Sono Fitoterápico        [X]    │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Quando o paciente reportar:                                  │
│  [INSÔNIA ✓]  [SONO RUIM ✓]  [ACORDA MADRUGADA ✓]            │
│  [SONO NÃO REPARADOR ✓]  ➕ adicionar sintoma                 │
│                                                               │
│  Sugerir:                                                     │
│  📋 Indutor Sono Fitoterápico                                 │
│     Código: FORM NEUR INDU SONO 0001 (i)                      │
│                                                               │
│  Prioridade:  ( ) Alta  (•) Média  ( ) Baixa                  │
│                                                               │
│  Justificativa clínica:                                       │
│  [Combinação de fitoterápicos para indução do sono...]        │
│                                                               │
│  Esta sugestão precisa de validação?                          │
│  (•) Sim, médico aprova antes de gerar receita                │
│  ( ) Não, auto-aprovar (uso interno)                          │
│                                                               │
│  ┌─ Governança ──────────────────────────────────────────┐   │
│  │ Quem pode editar esta sinapse: [Dr. Caio (CEO) ▼]    │   │
│  │ Quem pode usar em prescrição:  [Todos médicos ▼]     │   │
│  │ Bloqueada para perfil:         [Nenhum ▼]            │   │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  📊 Histórico:                                                │
│  • Criada por Dr. Caio em 12/05/2026 14:23                    │
│  • Editada por Dr. Caio em 15/05/2026 09:10 (prioridade)      │
│  • Disparou em 23 consultas, aceita em 18 (taxa: 78%)         │
│                                                               │
│  [🧪 TESTAR]  [💾 SALVAR]  [⏸️ DESATIVAR]  [🗑️ EXCLUIR]      │
└───────────────────────────────────────────────────────────────┘
```

### §3.3 — Simulador embutido

```
┌───────────────────────────────────────────────────────────────┐
│  🧪 SIMULADOR — Testar sem gravar                       [X]   │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Selecione sintomas/doenças que o paciente reportaria:        │
│  [INSÔNIA ✓] [ANSIEDADE ✓] [GANHO DE PESO]                   │
│  [TDAH] [QUEDA CABELO] [+ adicionar]                          │
│                                                               │
│  Sexo: (•) Feminino ( ) Masculino     Idade: [42]             │
│  Aceita injetável: (•) Sim ( ) Não                            │
│  Perfil financeiro: (•) Intermediário                         │
│                                                               │
│  [▶ SIMULAR MOTOR]                                            │
│                                                               │
│  RESULTADO — 12 sugestões disparariam:                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ FÓRMULAS (4)                                            │ │
│  │ • Indutor Sono Fitoterápico     score 15  [INSO+ANSI] │ │
│  │ • Ansiolítico Fitoterápico      score 12  [ANSI]      │ │
│  │ • Sachê Noturno                 score 10  [INSO]      │ │
│  │ • Adaptógeno Completo           score  9  [BURNOUT]   │ │
│  │                                                         │ │
│  │ INJETÁVEIS (3)                                          │ │
│  │ • 5-HTP 20mg                    score 15  [INSO]      │ │
│  │ • L-Theanina 50mg               score 12  [ANSI]      │ │
│  │ • Metilcobalamina 25mg          score  8  [FADIGA]    │ │
│  │                                                         │ │
│  │ SOROS (1)                                               │ │
│  │ • Soro Mitocondrial             score 10  [combo]     │ │
│  │                                                         │ │
│  │ IMPLANTES (1)                                           │ │
│  │ • Melatonina pellet             score  8  [INSO]      │ │
│  │                                                         │ │
│  │ EXAMES (3)                                              │ │
│  │ • Cortisol salivar 4 pontos     score 14              │ │
│  │ • TSH + T3L + T4L               score 10              │ │
│  │ • Vitamina B12 + Folato         score  9              │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Nada foi gravado. Esta é apenas uma simulação.               │
└───────────────────────────────────────────────────────────────┘
```

### §3.4 — Modo Drag & Drop (avançado, mas opcional)

```
SINTOMAS                          SUGESTÕES
┌────────────┐                    ┌──────────────────────┐
│ INSÔNIA   ━┿━━━━━━━━━━━━━━━━━━▶ Indutor Sono Fito     │
│ ANSIEDADE  │   ←━ arrastar ━→  │ Ansiolítico Fito     │
│ TDAH       │                   │ Lisdexanfetamina     │
│ FADIGA     │                   │ 5-HTP                │
│ ...        │                   │ ...                  │
└────────────┘                    └──────────────────────┘

Soltar a linha cria a sinapse instantaneamente (modo edição).
```

---

## §4 — PERGUNTAS PRO DR. REPLIT (TOM ELEGANTE, NÃO IMPOSITIVO)

Dr. Replit, antes de você codar, gostaria do seu olhar técnico:

### Sobre a expansão da base anamnésica:

1. **Você já tem alguma tabela mestre de sintomas/doenças/cirurgias**
   no banco? Se sim, em qual schema? Estou propondo 415 itens, mas se
   parte já existe, prefiro estender ao invés de duplicar.

2. **A escolha de B1 múltiplos (QSNT/QDGN/QCIR/QFAM/QHAB/QSEX/QPSI/
   QPRF/QVIT/QHDA)** faz sentido pro seu motor de busca, ou você
   preferiria 1 B1 só com B2 carregando o tipo? Confio no seu
   julgamento técnico aqui.

3. **CID-10 em paralelo ao código semântico**: você acha valioso
   armazenar ambos (CID em `codigo_cid10`, semântico em
   `codigo_padcom`)? Pra futuro de integração com SUS/operadoras.

### Sobre a Craniotomia:

4. **Frontend stack atual**: você está em React + Tailwind, certo?
   A Craniotomia que desenhei usa componentes padrão (modal, accordion,
   drag-drop). Tem alguma lib de drag-drop que você já usa, ou
   recomenda eu pedir uma específica?

5. **Sobre o simulador embutido**: ele precisa rodar a mesma engine
   do motor de produção, só sem gravar `sugestoes_clinicas`. Você
   acha viável fazer um `mode: 'simulation'` na função `ignitar()`,
   ou prefere uma rota separada `/api/motor/simular`?

6. **Sobre toggles de governança**: o Caio mencionou que vocês já
   conversaram sobre quem valida o quê. Você se recorda do escopo
   exato que validaram? Quero alinhar a UI com o que já foi
   acordado, não inventar conceito novo.

### Sobre execução:

7. **Volume de UPSERT**: 415 perguntas + 81 fórmulas + 162 injetáveis
   + 32 implantes + 11 soros = ~700 itens novos. Você prefere fazer
   em 1 migration grande ou várias menores por domínio (sintomas,
   doenças, cirurgias, etc.)? Pelo padrão da migration 025/072,
   parece que você prefere isolar por escopo.

8. **Performance do motor**: com 415 gatilhos × 700 itens, podemos
   ter ~2000 regras_motor potenciais. Você acha que precisamos de
   índice composto em (segmento, palavra_chave, ativo) ou só os
   atuais bastam?

9. **Sobre o que já existe**: tem alguma rota admin, painel CEO ou
   página de configuração que JÁ tenha algum embrião dessa Craniotomia?
   Mesmo que seja só uma listagem de regras_motor sem edição?
   Quero estender, não recriar.

10. **Próximo passo recomendado por você**: depois de ler tudo isso,
    qual sprint você atacaria primeiro? O plano atual é:
    Sprint 2 (alias formulas_master) → 3 (UPSERT 81 fórmulas) →
    4 (bridge V13→V4) → 5 (UPSERT regras) → 6 (matching hardening)
    → 7 (ativar regras) → 8 (Craniotomia UI).

    Mantém essa ordem ou sugere reordenar pra entregar valor visível
    pro Caio mais cedo?

---

## §5 — INSTRUÇÕES FINAIS PRO DR. REPLIT

1. **Responda as 10 perguntas acima ANTES de executar qualquer SQL**
2. **Comigo (Dr. Claude)**: aguardo suas respostas pra ajustar o SQL
3. **Com o Caio**: peça aprovação clínica pras 415 entradas (alguns
   sintomas/doenças podem precisar de ajuste no nome amigável)
4. **Invariantes**: 5.408 pacientes + 8.728 receitas + 6 triggers
   intocados. Caminho B preservado. Zero db:push.

Estou trabalhando contigo, não acima de você. Suas observações
técnicas são valiosas — me dizem onde minha proposta colide com a
realidade do código que você conhece melhor que eu.

Aguardo sua leitura.
