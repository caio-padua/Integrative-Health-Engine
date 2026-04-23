# INVENTÁRIO COMPLETO DE EXAMES — pra Dr. Claude

SHA atual: 0bb5fe8 · Data: 2026-04-23

## CONTEXTO — eu errei a query anterior

Filtrei só os que tinham `unidade_padrao_integrativa` preenchida (14).
O catálogo tem MUITO mais. Segue inventário REAL.

## 1) TABELAS DO DOMÍNIO EXAMES

| Tabela | Linhas | Função |
|---|---|---|
| mapa_bloco_exame | 409 | Relação exame ↔ bloco prescritivo |
| arquivos_exames | 327 | PDFs/imagens enviados pelos pacientes |
| analitos_catalogo | 294 | Catálogo mestre de analitos |
| exames_base | 280 | Tabela paralela de exames |
| parametros_referencia_global | 71 | Faixas de referência (17 EXAME inicial + 41 seed Dr. Claude) |
| direcao_favoravel_exame | 46 | Sentido (INFERIOR/MEDIO/SUPERIOR) |
| analitos_referencia_laboratorio | 24 | Faixas por laboratório (legado) |

## 2) SCHEMA analitos_catalogo

```
                                               Table "public.analitos_catalogo"
           Column           |           Type           | Collation | Nullable |                    Default                    
----------------------------+--------------------------+-----------+----------+-----------------------------------------------
 id                         | integer                  |           | not null | nextval('analitos_catalogo_id_seq'::regclass)
 codigo                     | text                     |           | not null | 
 nome                       | text                     |           | not null | 
 sinonimos                  | text[]                   |           |          | 
 grupo                      | text                     |           | not null | 
 unidade_padrao_integrativa | text                     |           | not null | 
 terco_excelente            | text                     |           | not null | 'SUPERIOR'::text
 observacao_clinica         | text                     |           |          | 
 origem_referencia          | text                     |           |          | 
 ativo                      | boolean                  |           | not null | true
 criado_em                  | timestamp with time zone |           | not null | now()
Indexes:
    "analitos_catalogo_pkey" PRIMARY KEY, btree (id)
    "analitos_catalogo_codigo_key" UNIQUE CONSTRAINT, btree (codigo)
Referenced by:
    TABLE "analitos_referencia_laboratorio" CONSTRAINT "analitos_referencia_laboratorio_analito_codigo_fkey" FOREIGN KEY (analito_codigo) REFERENCES analitos_catalogo(codigo) ON DELETE CASCADE

```

## 3) SCHEMA exames_base

```
                                                   Table "public.exames_base"
               Column               |           Type           | Collation | Nullable |                 Default                 
------------------------------------+--------------------------+-----------+----------+-----------------------------------------
 id                                 | integer                  |           | not null | nextval('exames_base_id_seq'::regclass)
 codigo_exame                       | text                     |           | not null | 
 ativo                              | boolean                  |           | not null | true
 grupo_principal                    | text                     |           | not null | 
 subgrupo                           | text                     |           |          | 
 nome_exame                         | text                     |           | not null | 
 modalidade                         | text                     |           |          | 
 material_ou_setor                  | text                     |           |          | 
 agrupamento_pdf                    | text                     |           |          | 
 preparo                            | text                     |           |          | 
 recomendacoes                      | text                     |           |          | 
 corpo_pedido                       | text                     |           |          | 
 hd_1                               | text                     |           |          | 
 cid_1                              | text                     |           |          | 
 hd_2                               | text                     |           |          | 
 cid_2                              | text                     |           |          | 
 hd_3                               | text                     |           |          | 
 cid_3                              | text                     |           |          | 
 justificativa_objetiva             | text                     |           |          | 
 justificativa_narrativa            | text                     |           |          | 
 justificativa_robusta              | text                     |           |          | 
 sexo_aplicavel                     | text                     |           |          | 
 idade_inicial_diretriz             | text                     |           |          | 
 idade_inicial_alto_risco           | text                     |           |          | 
 frequencia_diretriz                | text                     |           |          | 
 frequencia_protocolo_padua         | text                     |           |          | 
 tipo_indicacao                     | text                     |           |          | 
 gatilho_por_sintoma                | text                     |           |          | 
 gatilho_por_doenca                 | text                     |           |          | 
 gatilho_por_historico_familiar     | text                     |           |          | 
 gatilho_por_check_up               | text                     |           |          | 
 exige_validacao_humana             | text                     |           |          | 
 prioridade                         | text                     |           |          | 
 exame_de_rastreio                  | text                     |           |          | 
 exame_de_seguimento                | text                     |           |          | 
 permite_recorrencia_automatica     | text                     |           |          | 
 intervalo_recorrencia_dias         | text                     |           |          | 
 perfil_de_risco                    | text                     |           |          | 
 fonte_da_regra                     | text                     |           |          | 
 fonte_url                          | text                     |           |          | 
 observacao_clinica                 | text                     |           |          | 
 bloco_oficial                      | text                     |           |          | 
 grau_do_bloco                      | text                     |           |          | 
 usa_grade                          | text                     |           |          | 
 ordem_no_bloco                     | integer                  |           |          | 
 finalidade_principal               | text                     |           |          | 
 finalidade_secundaria              | text                     |           |          | 
 objetivo_pratico                   | text                     |           |          | 
 objetivo_tecnico                   | text                     |           |          | 
 interpretacao_pratica              | text                     |           |          | 
 quando_pensar_neste_exame          | text                     |           |          | 
 limitacao_do_exame                 | text                     |           |          | 
 correlacao_clinica                 | text                     |           |          | 
 legenda_rapida                     | text                     |           |          | 
 inflamacao_visual                  | text                     |           |          | 
 oxidacao_visual                    | text                     |           |          | 
 risco_cardiometabolico_visual      | text                     |           |          | 
 valor_clinico_visual               | text                     |           |          | 
 complexidade_interpretativa_visual | text                     |           |          | 
 criado_em                          | timestamp with time zone |           | not null | now()
 atualizado_em                      | timestamp with time zone |           | not null | now()
 codigo_semantico                   | text                     |           |          | 
 b1                                 | text                     |           |          | 
 b2                                 | text                     |           |          | 
 b3                                 | text                     |           |          | 
 b4                                 | text                     |           |          | 
 seq                                | text                     |           |          | 
Indexes:
    "exames_base_pkey" PRIMARY KEY, btree (id)
    "exames_base_codigo_exame_unique" UNIQUE CONSTRAINT, btree (codigo_exame)

```

## 4) SCHEMA parametros_referencia_global

```
                                           Table "public.parametros_referencia_global"
       Column       |           Type           | Collation | Nullable |                         Default                          
--------------------+--------------------------+-----------+----------+----------------------------------------------------------
 id                 | integer                  |           | not null | nextval('parametros_referencia_global_id_seq'::regclass)
 codigo             | text                     |           | not null | 
 label              | text                     |           | not null | 
 tipo               | text                     |           | not null | 
 periodo            | text                     |           | not null | 'MENSAL'::text
 unidade_medida     | text                     |           |          | 
 faixa_critica_max  | numeric(12,2)            |           |          | 
 faixa_baixa_max    | numeric(12,2)            |           |          | 
 faixa_media_max    | numeric(12,2)            |           |          | 
 faixa_superior_max | numeric(12,2)            |           |          | 
 observacao         | text                     |           |          | 
 ativo              | boolean                  |           | not null | true
 criado_em          | timestamp with time zone |           | not null | now()
 atualizado_em      | timestamp with time zone |           | not null | now()
Indexes:
    "parametros_referencia_global_pkey" PRIMARY KEY, btree (id)
    "parametros_referencia_global_codigo_key" UNIQUE CONSTRAINT, btree (codigo)
Check constraints:
    "parametros_referencia_global_periodo_check" CHECK (periodo = ANY (ARRAY['DIARIO'::text, 'SEMANAL'::text, 'MENSAL'::text, 'TRIMESTRAL'::text, 'SEMESTRAL'::text, 'ANUAL'::text]))
    "parametros_referencia_global_tipo_check" CHECK (tipo = ANY (ARRAY['EXAME'::text, 'KPI_FINANCEIRO'::text, 'KPI_CLINICO'::text]))
Referenced by:
    TABLE "parametros_referencia_unidade" CONSTRAINT "parametros_referencia_unidade_parametro_codigo_fkey" FOREIGN KEY (parametro_codigo) REFERENCES parametros_referencia_global(codigo)

```

## 5) TODOS os 209 analitos de SANGUE/BIOQUÍMICA (sem imagem)

```
         codigo         |                         nome                          |         grupo         | unidade |  terco   
------------------------+-------------------------------------------------------+-----------------------+---------+----------
 EXAMTIREGAMPCALC0001   | Calcitonina                                           | BLOCO TIREOIDE        |         | SUPERIOR
 EXAMTROMGINTB2GM0001   | Beta 2 Glicoproteina 1 Igm                            | BLOCO TROMBOSE        |         | SUPERIOR
 EXCACCTA               | Angiotomografia De Coronárias (Ccta)                  | CARDIOLÓGICO          |         | SUPERIOR
 EXCAECG                | Ecg De Repouso                                        | CARDIOLÓGICO          |         | SUPERIOR
 EXCAECO                | Ecocardiograma Com Doppler                            | CARDIOLÓGICO          |         | SUPERIOR
 EXCACAC                | Escore De Cálcio Coronariano (Cac)                    | CARDIOLÓGICO          |         | SUPERIOR
 EXCAHOL                | Holter 24h                                            | CARDIOLÓGICO          |         | SUPERIOR
 EXCAMAP                | Mapa 24h                                              | CARDIOLÓGICO          |         | SUPERIOR
 EXAPOCIII              | Apo C Iii                                             | CARDIOMETABOLICO      |         | SUPERIOR
 EXAPOLIPOPROTEINAB     | Apolipoproteina B                                     | CARDIOMETABOLICO      |         | SUPERIOR
 EXCOLESTEROLTOTALEFRAC | Colesterol Total E Fracoes                            | CARDIOMETABOLICO      |         | SUPERIOR
 EXELETROFORESEDELIPOPR | Eletroforese De Lipoproteinas                         | CARDIOMETABOLICO      |         | SUPERIOR
 EXGENOTIPAGEMAPOE      | Genotipagem Apo E                                     | CARDIOMETABOLICO      |         | SUPERIOR
 EXHOMOCISTEINA         | Homocisteina                                          | CARDIOMETABOLICO      |         | INFERIOR
 EXINDICEDEOMEGA3ERITRO | Indice De Omega 3 Eritrocitario                       | CARDIOMETABOLICO      |         | SUPERIOR
 EXLIPOPROTEINAA        | Lipoproteina A                                        | CARDIOMETABOLICO      |         | SUPERIOR
 EXPCRUS                | Pcr Us                                                | CARDIOMETABOLICO      |         | SUPERIOR
 EXPERFILDEACIDOSGRAXOS | Perfil De Acidos Graxos                               | CARDIOMETABOLICO      |         | SUPERIOR
 EXRELACAOAAEPA         | Relacao Aa / Epa                                      | CARDIOMETABOLICO      |         | SUPERIOR
 EX17OHPROGESTERONA     | 17 Oh Progesterona                                    | ENDOCRINO             |         | SUPERIOR
 EXACTH                 | Acth                                                  | ENDOCRINO             |         | SUPERIOR
 EXALDOSTERONA          | Aldosterona                                           | ENDOCRINO             |         | SUPERIOR
 EXANTITG               | Anti Tg                                               | ENDOCRINO             |         | SUPERIOR
 EXANTITPO              | Anti Tpo                                              | ENDOCRINO             |         | INFERIOR
 EXCALCITONINA          | Calcitonina                                           | ENDOCRINO             |         | SUPERIOR
 EXCORTISOL             | Cortisol                                              | ENDOCRINO             |         | SUPERIOR
 EXCORTISOLSALIVARANOIT | Cortisol Salivar - A Noite - Entre 20:00 E 23:00 H    | ENDOCRINO             |         | SUPERIOR
 EXCORTISOLSALIVARATARD | Cortisol Salivar - A Tarde - Entre 16:00 E 18:00 H    | ENDOCRINO             |         | SUPERIOR
 EXCORTISOLSALIVARAOACO | Cortisol Salivar - Ao Acordar - Entre 05:00 E 08:00 H | ENDOCRINO             |         | SUPERIOR
 EXCORTISOLSALIVARMADRU | Cortisol Salivar - Madrugada - Entre 02:00 E 04:00 H  | ENDOCRINO             |         | SUPERIOR
 EXDHEAS                | Dhea S                                                | ENDOCRINO             |         | SUPERIOR
 EXPTH                  | Pth                                                   | ENDOCRINO             |         | SUPERIOR
 EXRENINA               | Renina                                                | ENDOCRINO             |         | SUPERIOR
 EXT3LIVRE              | T3 Livre                                              | ENDOCRINO             |         | SUPERIOR
 EXT3REVERSO            | T3 Reverso                                            | ENDOCRINO             |         | SUPERIOR
 EXT4LIVRE              | T4 Livre                                              | ENDOCRINO             |         | SUPERIOR
 EXTG                   | Tg                                                    | ENDOCRINO             |         | SUPERIOR
 EXTRAB                 | Trab                                                  | ENDOCRINO             |         | SUPERIOR
 EXTSH                  | Tsh                                                   | ENDOCRINO             |         | INFERIOR
 EXAPOE                 | Apoe                                                  | GENETICA              |         | SUPERIOR
 EXBHMT                 | Bhmt                                                  | GENETICA              |         | SUPERIOR
 EXCBS                  | Cbs                                                   | GENETICA              |         | SUPERIOR
 EXCOMT                 | Comt                                                  | GENETICA              |         | SUPERIOR
 EXCYP2C19              | Cyp2c19                                               | GENETICA              |         | SUPERIOR
 EXCYP2C9               | Cyp2c9                                                | GENETICA              |         | SUPERIOR
 EXCYP2D6               | Cyp2d6                                                | GENETICA              |         | SUPERIOR
 EXCYP3A4               | Cyp3a4                                                | GENETICA              |         | SUPERIOR
 EXCYP3A5               | Cyp3a5                                                | GENETICA              |         | SUPERIOR
 EXFTO                  | Fto                                                   | GENETICA              |         | SUPERIOR
 EXMTHFRA1298C          | Mthfr A1298c                                          | GENETICA              |         | SUPERIOR
 EXMTHFRC677T           | Mthfr C677t                                           | GENETICA              |         | SUPERIOR
 EXMTR                  | Mtr                                                   | GENETICA              |         | SUPERIOR
 EXMTRR                 | Mtrr                                                  | GENETICA              |         | SUPERIOR
 EXOPRM1                | Oprm1                                                 | GENETICA              |         | SUPERIOR
 EXSLCO1B1              | Slco1b1                                               | GENETICA              |         | SUPERIOR
 EXTPMT                 | Tpmt                                                  | GENETICA              |         | SUPERIOR
 EXUGT1A1               | Ugt1a1                                                | GENETICA              |         | SUPERIOR
 EXVDR                  | Vdr                                                   | GENETICA              |         | SUPERIOR
 EXVKORC1               | Vkorc1                                                | GENETICA              |         | SUPERIOR
 EXAMILASE              | Amilase                                               | GERAL                 |         | SUPERIOR
 EXANGIORRESSONANCIA    | Angiorressonancia                                     | GERAL                 |         | SUPERIOR
 EXAMCIMGSGRDANGI0001   | Angiotomografia De Coronarias                         | GERAL                 |         | SUPERIOR
 EXBILIRRUBINASTOTAISEF | Bilirrubinas Totais E Fracoes                         | GERAL                 |         | SUPERIOR
 EXAMCIMGSGRDCINT0001   | Cintilografia Miocardica                              | GERAL                 |         | SUPERIOR
 EXCREATININA           | Creatinina                                            | GERAL                 |         | INFERIOR
 EXAMCIMGSGRDECOG0001   | Ecocardiograma                                        | GERAL                 |         | SUPERIOR
 EXELETROCARDIOGRAMA    | Eletrocardiograma                                     | GERAL                 |         | SUPERIOR
 EXAMCIMGSGRDESCO0001   | Escore De Calcio Coronariano                          | GERAL                 |         | SUPERIOR
 EXESTRADIOLSALIVAR     | Estradiol Salivar                                     | GERAL                 |         | SUPERIOR
 EXFA                   | Fa                                                    | GERAL                 |         | SUPERIOR
 EXFERRITINA            | Ferritina                                             | GERAL                 |         | SUPERIOR
 EXFERROSERICO          | Ferro Serico                                          | GERAL                 |         | SUPERIOR
 EXGAMAGT               | Gama Gt                                               | GERAL                 |         | SUPERIOR
 EXHEMOGLOBINAGLICADA   | Hemoglobina Glicada                                   | GERAL                 |         | SUPERIOR
 EXHEMOGRAMA            | Hemograma                                             | GERAL                 |         | SUPERIOR
 EXHOLTER24HORAS        | Holter 24 Horas                                       | GERAL                 |         | SUPERIOR
 EXMAPA24HORAS          | Mapa 24 Horas                                         | GERAL                 |         | SUPERIOR
 EXPROGESTERONASALIVAR  | Progesterona Salivar                                  | GERAL                 |         | SUPERIOR
 EXTESTEERGOMETRICO     | Teste Ergometrico                                     | GERAL                 |         | SUPERIOR
 EXTESTOSTERONASALIVAR  | Testosterona Salivar                                  | GERAL                 |         | SUPERIOR
 EXTGO                  | Tgo                                                   | GERAL                 |         | SUPERIOR
 EXTGP                  | Tgp                                                   | GERAL                 |         | SUPERIOR
 EXTIPAGEMSANGUINEAABOR | Tipagem Sanguinea Abo Rh                              | GERAL                 |         | SUPERIOR
 EXUREIA                | Ureia                                                 | GERAL                 |         | INFERIOR
 EXVITAMINAB12          | Vitamina B12                                          | GERAL                 |         | SUPERIOR
 EXVITAMINAD            | Vitamina D                                            | GERAL                 |         | SUPERIOR
 GLICOSE_JEJUM          | Glicose Jejum                                         | GLICEMICO             | mg/dL   | INFERIOR
 INSULINA               | Insulina                                              | GLICEMICO             | uUI/mL  | INFERIOR
 EXANTICARDIOLIPINAIGG  | Anticardiolipina Igg                                  | HEMATOLOGICO          |         | SUPERIOR
 EXANTICARDIOLIPINAIGM  | Anticardiolipina Igm                                  | HEMATOLOGICO          |         | SUPERIOR
 EXANTICOAGULANTELUPICO | Anticoagulante Lupico                                 | HEMATOLOGICO          |         | SUPERIOR
 EXANTITROMBINAIII      | Antitrombina Iii                                      | HEMATOLOGICO          |         | SUPERIOR
 EXBETA2GLICOPROTEINA1I | Beta 2 Glicoproteina 1 Igg                            | HEMATOLOGICO          |         | SUPERIOR
 EXDDIMERO              | D Dimero                                              | HEMATOLOGICO          |         | SUPERIOR
 EXFATORVLEIDENEMUTACAO | Fator V Leiden E Mutacao Da Protrombina               | HEMATOLOGICO          |         | SUPERIOR
 EXFIBRINOGENIO         | Fibrinogenio                                          | HEMATOLOGICO          |         | SUPERIOR
 EXPROTEINACFUNCIONAL   | Proteina C Funcional                                  | HEMATOLOGICO          |         | SUPERIOR
 EXPROTEINASLIVRE       | Proteina S Livre                                      | HEMATOLOGICO          |         | SUPERIOR
 EXTAP                  | Tap                                                   | HEMATOLOGICO          |         | SUPERIOR
 EXTTPA                 | Ttpa                                                  | HEMATOLOGICO          |         | SUPERIOR
 EXCK18                 | Ck 18                                                 | HEPATICO              |         | SUPERIOR
 EXELFSCORE             | Elf Score                                             | HEPATICO              |         | SUPERIOR
 EXFIB4                 | Fib 4                                                 | HEPATICO              |         | SUPERIOR
 EXFIBROTEST            | Fibrotest                                             | HEPATICO              |         | SUPERIOR
 EXBETAHCG              | Beta Hcg                                              | HORMONAL / UROGINECO  |         | SUPERIOR
 EXDHT                  | Dht                                                   | HORMONAL / UROGINECO  |         | SUPERIOR
 EXESTRADIOL            | Estradiol                                             | HORMONAL / UROGINECO  |         | INFERIOR
 EXFSH                  | Fsh                                                   | HORMONAL / UROGINECO  |         | SUPERIOR
 EXLH                   | Lh                                                    | HORMONAL / UROGINECO  |         | SUPERIOR
 EXPROGESTERONA         | Progesterona                                          | HORMONAL / UROGINECO  |         | SUPERIOR
 EXPROLACTINA           | Prolactina                                            | HORMONAL / UROGINECO  |         | INFERIOR
 EXPSALIVRE             | Psa Livre                                             | HORMONAL / UROGINECO  |         | SUPERIOR
 EXPSATOTAL             | Psa Total                                             | HORMONAL / UROGINECO  |         | INFERIOR
 EXSHBG                 | Shbg                                                  | HORMONAL / UROGINECO  |         | SUPERIOR
 EXTESTOSTERONALIVRE    | Testosterona Livre                                    | HORMONAL / UROGINECO  |         | SUPERIOR
 EXTESTOSTERONATOTAL    | Testosterona Total                                    | HORMONAL / UROGINECO  |         | SUPERIOR
 SHBG                   | SHBG                                                  | HORMONIO              | nmol/L  | INFERIOR
 T4_LIVRE               | T4 Livre                                              | HORMONIO              | ng/dL   | SUPERIOR
 TSH                    | TSH                                                   | HORMONIO              | uUI/mL  | INFERIOR
 TESTOSTERONA_TOTAL     | Testosterona Total                                    | HORMONIO              | ng/dL   | SUPERIOR
 EXANCAC                | Anca C                                                | IMUNOLOGICO           |         | SUPERIOR
 EXANCAP                | Anca P                                                | IMUNOLOGICO           |         | SUPERIOR
 EXANTIDNA              | Anti Dna                                              | IMUNOLOGICO           |         | SUPERIOR
 EXANTIJO1              | Anti Jo 1                                             | IMUNOLOGICO           |         | SUPERIOR
 EXANTIRNP              | Anti Rnp                                              | IMUNOLOGICO           |         | SUPERIOR
 EXANTISCL70            | Anti Scl 70                                           | IMUNOLOGICO           |         | SUPERIOR
 EXANTISM               | Anti Sm                                               | IMUNOLOGICO           |         | SUPERIOR
 EXANTISSARO            | Anti Ssa Ro                                           | IMUNOLOGICO           |         | SUPERIOR
 EXANTISSBLA            | Anti Ssb La                                           | IMUNOLOGICO           |         | SUPERIOR
 EXC3                   | C3                                                    | IMUNOLOGICO           |         | SUPERIOR
 EXC4                   | C4                                                    | IMUNOLOGICO           |         | SUPERIOR
 EXFAN                  | Fan                                                   | IMUNOLOGICO           |         | SUPERIOR
 EXVHS                  | Vhs                                                   | IMUNOLOGICO           |         | SUPERIOR
 EXANTIHBCTOTAL         | Anti Hbc Total                                        | INFECTOLOGICO         |         | SUPERIOR
 EXANTIHBS              | Anti Hbs                                              | INFECTOLOGICO         |         | SUPERIOR
 EXANTIHCV              | Anti Hcv                                              | INFECTOLOGICO         |         | SUPERIOR
 EXCHLAMYDIATRACHOMATIS | Chlamydia Trachomatis Por Pcr                         | INFECTOLOGICO         |         | SUPERIOR
 EXFTAABSIGG            | Fta Abs Igg                                           | INFECTOLOGICO         |         | SUPERIOR
 EXFTAABSIGM            | Fta Abs Igm                                           | INFECTOLOGICO         |         | SUPERIOR
 EXHBSAG                | Hbsag                                                 | INFECTOLOGICO         |         | SUPERIOR
 EXHERPESSIMPLEXIIIIGG  | Herpes Simplex I Ii Igg                               | INFECTOLOGICO         |         | SUPERIOR
 EXHERPESSIMPLEXIIIIGM  | Herpes Simplex I Ii Igm                               | INFECTOLOGICO         |         | SUPERIOR
 EXHIV1E2               | Hiv 1 E 2                                             | INFECTOLOGICO         |         | SUPERIOR
 EXHPVPORPCR            | Hpv Por Pcr                                           | INFECTOLOGICO         |         | SUPERIOR
 EXMYCOPLASMAPORPCR     | Mycoplasma Por Pcr                                    | INFECTOLOGICO         |         | SUPERIOR
 EXNEISSERIAGONORRHOEAE | Neisseria Gonorrhoeae Por Pcr                         | INFECTOLOGICO         |         | SUPERIOR
 EXTRICHOMONASVAGINALIS | Trichomonas Vaginalis Por Pcr                         | INFECTOLOGICO         |         | SUPERIOR
 EXUREAPLASMAPORPCR     | Ureaplasma Por Pcr                                    | INFECTOLOGICO         |         | SUPERIOR
 EXVDRL                 | Vdrl                                                  | INFECTOLOGICO         |         | SUPERIOR
 HOMOCISTEINA           | Homocisteina                                          | INFLAMATORIO          | umol/L  | INFERIOR
 PCR_ULTRA              | PCR Ultrassensivel                                    | INFLAMATORIO          | mg/L    | INFERIOR
 EXLABLIP               | Colesterol Total E Frações                            | LABORATORIAL          |         | SUPERIOR
 EXLABEAS               | Eas                                                   | LABORATORIAL          |         | SUPERIOR
 EXLABHBA1              | Hemoglobina Glicada                                   | LABORATORIAL          |         | SUPERIOR
 EXLABINS               | Insulina De Jejum                                     | LABORATORIAL          |         | SUPERIOR
 EXLABPPF               | Parasitológico De Fezes                               | LABORATORIAL          |         | SUPERIOR
 EXLABPRL               | Prolactina                                            | LABORATORIAL          |         | INFERIOR
 EXLABPROT              | Proteinúria                                           | LABORATORIAL          |         | SUPERIOR
 EXLABT3L               | T3 Livre                                              | LABORATORIAL          |         | SUPERIOR
 EXLABT4L               | T4 Livre                                              | LABORATORIAL          |         | SUPERIOR
 EXLABTSH               | Tsh                                                   | LABORATORIAL          |         | INFERIOR
 EXLABB12               | Vitamina B12                                          | LABORATORIAL          |         | SUPERIOR
 EXLABVD25              | Vitamina D 25-Oh                                      | LABORATORIAL          |         | SUPERIOR
 EXFRUTOSAMINA          | Frutosamina                                           | METABOLICO            |         | SUPERIOR
 EXGLICEMIADEJEJUM      | Glicemia De Jejum                                     | METABOLICO            |         | SUPERIOR
 EXHOMABETA             | Homa Beta                                             | METABOLICO            |         | SUPERIOR
 EXHOMAIR               | Homa Ir                                               | METABOLICO            |         | INFERIOR
 EXINSULINA             | Insulina                                              | METABOLICO            |         | INFERIOR
 EXCERULOPLASMINA       | Ceruloplasmina                                        | MICRONUTRIENTES       |         | SUPERIOR
 EXCOBRE                | Cobre                                                 | MICRONUTRIENTES       |         | SUPERIOR
 EXFOLATO               | Folato                                                | MICRONUTRIENTES       |         | SUPERIOR
 EXMAGNESIOERITROCITARI | Magnesio Eritrocitario                                | MICRONUTRIENTES       |         | SUPERIOR
 EXMAGNESIOINTRAERITROC | Magnesio Intraeritrocitario                           | MICRONUTRIENTES       |         | SUPERIOR
 EXMAGNESIOSERICO       | Magnesio Serico                                       | MICRONUTRIENTES       |         | SUPERIOR
 EXVITAMINAA            | Vitamina A                                            | MICRONUTRIENTES       |         | SUPERIOR
 EXVITAMINAC            | Vitamina C                                            | MICRONUTRIENTES       |         | SUPERIOR
 EXVITAMINAE            | Vitamina E                                            | MICRONUTRIENTES       |         | SUPERIOR
 EXZINCO                | Zinco                                                 | MICRONUTRIENTES       |         | SUPERIOR
 FERRITINA              | Ferritina                                             | MINERAL               | ng/mL   | MEDIO
 MAGNESIO               | Magnesio                                              | MINERAL               | mg/dL   | SUPERIOR
 POTASSIO               | Potassio                                              | MINERAL               | mEq/L   | MEDIO
 ZINCO                  | Zinco                                                 | MINERAL               | ug/dL   | SUPERIOR
 EXACIDOMETILMALONICO   | Acido Metilmalonico                                   | NUTRICIONAL FUNCIONAL |         | SUPERIOR
 EXCTLFTIBC             | Ctlf / Tibc                                           | NUTRICIONAL FUNCIONAL |         | SUPERIOR
 EXHOLOTRANSCIBALAMINA  | Holotranscibalamina                                   | NUTRICIONAL FUNCIONAL |         | SUPERIOR
 EXSATURACAODETRANSFERR | Saturacao De Transferrina                             | NUTRICIONAL FUNCIONAL |         | SUPERIOR
 EXAFP                  | Afp                                                   | ONCOLOGICO            |         | SUPERIOR
 EXBETA2MICROGLOBULINA  | Beta 2 Microglobulina                                 | ONCOLOGICO            |         | SUPERIOR
 EXCA125                | Ca 125                                                | ONCOLOGICO            |         | SUPERIOR
 EXCA153                | Ca 15 3                                               | ONCOLOGICO            |         | SUPERIOR
 EXCA199                | Ca 19 9                                               | ONCOLOGICO            |         | INFERIOR
 EXCA724                | Ca 72 4                                               | ONCOLOGICO            |         | SUPERIOR
 EXCEA                  | Cea                                                   | ONCOLOGICO            |         | INFERIOR
 EXHE4                  | He4                                                   | ONCOLOGICO            |         | SUPERIOR
 EXTIREOGLOBULINA       | Tireoglobulina                                        | ONCOLOGICO            |         | SUPERIOR
 EXDENSO                | Densitometria Óssea                                   | OSTEOMETABÓLICO       |         | SUPERIOR
 EXCISTATINAC           | Cistatina C                                           | RENAL                 |         | SUPERIOR
 EXNGAL                 | Ngal                                                  | RENAL                 |         | SUPERIOR
 EXPENKPROENCEFALINA    | Penk / Proencefalina                                  | RENAL                 |         | SUPERIOR
 EXTFGESTIMADAEGFR      | Tfg Estimada Egfr                                     | RENAL                 |         | SUPERIOR
 EXALUMINIO             | Aluminio                                              | TOXICOLOGICO          |         | SUPERIOR
 EXARSENIO              | Arsenio                                               | TOXICOLOGICO          |         | SUPERIOR
 EXCADMIO               | Cadmio                                                | TOXICOLOGICO          |         | SUPERIOR
 EXCADMIOURINA          | Cadmio Urina                                          | TOXICOLOGICO          |         | SUPERIOR
 EXCHUMBO               | Chumbo                                                | TOXICOLOGICO          |         | SUPERIOR
 EXMERCURIO             | Mercurio                                              | TOXICOLOGICO          |         | SUPERIOR
 EXMERCURIOURINA        | Mercurio Urina                                        | TOXICOLOGICO          |         | SUPERIOR
 B12                    | Vitamina B12                                          | VITAMINA              | pg/mL   | SUPERIOR
 VITAMINA_D             | Vitamina D 25(OH)                                     | VITAMINA              | ng/mL   | SUPERIOR
(209 rows)

```

## 6) AMOSTRA exames_base (10 primeiras linhas)

```
 id |     codigo_exame     | ativo |    grupo_principal    |        subgrupo         |     nome_exame      |  modalidade  |   material_ou_setor   |        agrupamento_pdf        | preparo | recomendacoes |         corpo_pedido         | hd_1 | cid_1 | hd_2 | cid_2 | hd_3 | cid_3 |                                                                       justificativa_objetiva                                                                        |                                                                                                                                                                      justificativa_narrativa                                                                                                                                                                       |                                                                                                                                                                                                                                                                                                                                         justificativa_robusta                                                                                                                                                                                                                                                                                                                                          | sexo_aplicavel | idade_inicial_diretriz | idade_inicial_alto_risco | frequencia_diretriz | frequencia_protocolo_padua |         tipo_indicacao          | gatilho_por_sintoma | gatilho_por_doenca | gatilho_por_historico_familiar | gatilho_por_check_up | exige_validacao_humana | prioridade | exame_de_rastreio | exame_de_seguimento | permite_recorrencia_automatica | intervalo_recorrencia_dias |    perfil_de_risco    |         fonte_da_regra         | fonte_url |                                  observacao_clinica                                  |         bloco_oficial         |    grau_do_bloco    | usa_grade | ordem_no_bloco |    finalidade_principal    |        finalidade_secundaria        |               objetivo_pratico                |                   objetivo_tecnico                    |                       interpretacao_pratica                        |          quando_pensar_neste_exame           |           limitacao_do_exame            |           correlacao_clinica           |                legenda_rapida                | inflamacao_visual | oxidacao_visual | risco_cardiometabolico_visual | valor_clinico_visual | complexidade_interpretativa_visual |          criado_em           |       atualizado_em        |     codigo_semantico     |  b1  |  b2  |  b3  |  b4  | seq  
----+----------------------+-------+-----------------------+-------------------------+---------------------+--------------+-----------------------+-------------------------------+---------+---------------+------------------------------+------+-------+------+-------+------+-------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+----------------+------------------------+--------------------------+---------------------+----------------------------+---------------------------------+---------------------+--------------------+--------------------------------+----------------------+------------------------+------------+-------------------+---------------------+--------------------------------+----------------------------+-----------------------+--------------------------------+-----------+--------------------------------------------------------------------------------------+-------------------------------+---------------------+-----------+----------------+----------------------------+-------------------------------------+-----------------------------------------------+-------------------------------------------------------+--------------------------------------------------------------------+----------------------------------------------+-----------------------------------------+----------------------------------------+----------------------------------------------+-------------------+-----------------+-------------------------------+----------------------+------------------------------------+------------------------------+----------------------------+--------------------------+------+------+------+------+------
 35 | EX17OHPROGESTERONA   | t     | ENDOCRINO             | ADRENAL ESPECIFICO      | 17 OH PROGESTERONA  | LABORATORIAL | SORO                  | BLOCO ADRENAL ESPECIFICO      |         |               | SOLICITO 17 OH PROGESTERONA  |      |       |      |       |      |       | Solicitacao de 17 OH PROGESTERONA para avaliacao do eixo adrenal, conforme protocolo do BLOCO ADRENAL ESPECIFICO no contexto de avaliacao clinica integrativa.      | Exame laboratorial solicitado como parte da avaliacao sistematica do adrenal especifico. O 17 OH PROGESTERONA e necessario para complementar o raciocinio clinico, permitindo investigacao adequada dentro do escopo de avaliacao do eixo adrenal, com objetivo de subsidiar a tomada de decisao terapeutica e o plano de cuidado individualizado do paciente.     | Solicitacao fundamentada no protocolo de avaliacao adrenal especifico do motor clinico integrativo. O exame 17 OH PROGESTERONA (laboratorial) integra o bloco BLOCO ADRENAL ESPECIFICO e tem como finalidade primaria a avaliacao do eixo adrenal. A realizacao deste exame e necessaria para composicao do perfil diagnostico completo, correlacao com dados clinicos da anamnese, estratificacao de risco e definicao de condutas terapeuticas baseadas em evidencias. O resultado sera utilizado para orientar intervencoes personalizadas dentro do plano de tratamento integrativo, incluindo ajustes de suplementacao, dietoterapia e monitoramento longitudinal da resposta terapeutica.        | AMBOS          |                        |                          |                     |                            | BLOCO / GRAU / VALIDACAO HUMANA |                     |                    |                                |                      | SIM                    | MEDIA      | NAO               | SIM                 | NAO                            |                            | ENDOCRINO             | VALIDACOES DOS BLOCOS E GRADES |           | EXAME MAPEADO PARA O NOVO MOTOR GENERICO COM BASE NAS VALIDACOES DE BLOCOS E GRADES. | BLOCO ADRENAL ESPECIFICO      | GRADE SOFISTICADA   | SIM       |              6 | AVALIACAO DO EIXO ADRENAL  | ESTRESSE, CORTISOL E RITMO HORMONAL | ORGANIZAR INVESTIGACAO DE CORTISOL E ADRENAIS | MEDIR EIXO HIPOTALAMO HIPOFISE ADRENAL                | Ajuda a correlacionar sintomas de fadiga, estresse e eixo adrenal. | FADIGA, INSÔNIA, HIPOTENSAO, ESTRESSE        | Alta dependência de contexto e horário  | Eixo HHA, cortisol, renina-aldosterona | EXAME DE EIXO HORMONAL, NAO DE RASTREIO CEGO | ★★★☆☆             | ★★★☆☆           | ★★★☆☆                         | ★★★★☆                | ★★★★☆                              | 2026-04-07 20:58:24.61091+00 | 2026-04-12 01:47:19.199+00 | EXAM ADRE GSOF 17OH 0001 | EXAM | ADRE | GSOF | 17OH | 0001
 36 | EXACIDOMETILMALONICO | t     | NUTRICIONAL FUNCIONAL | DEFICIENCIA ABSORCAO    | ACIDO METILMALONICO | LABORATORIAL | SORO                  | BLOCO DEFICIENCIA ABSORCAO    |         |               | SOLICITO ACIDO METILMALONICO |      |       |      |       |      |       | Solicitacao de ACIDO METILMALONICO para avaliacao clinica dirigida, conforme protocolo do BLOCO DEFICIENCIA ABSORCAO no contexto de avaliacao clinica integrativa.  | Exame laboratorial solicitado como parte da avaliacao sistematica do deficiencia absorcao. O ACIDO METILMALONICO e necessario para complementar o raciocinio clinico, permitindo investigacao adequada dentro do escopo de avaliacao clinica dirigida, com objetivo de subsidiar a tomada de decisao terapeutica e o plano de cuidado individualizado do paciente. | Solicitacao fundamentada no protocolo de avaliacao deficiencia absorcao do motor clinico integrativo. O exame ACIDO METILMALONICO (laboratorial) integra o bloco BLOCO DEFICIENCIA ABSORCAO e tem como finalidade primaria a avaliacao clinica dirigida. A realizacao deste exame e necessaria para composicao do perfil diagnostico completo, correlacao com dados clinicos da anamnese, estratificacao de risco e definicao de condutas terapeuticas baseadas em evidencias. O resultado sera utilizado para orientar intervencoes personalizadas dentro do plano de tratamento integrativo, incluindo ajustes de suplementacao, dietoterapia e monitoramento longitudinal da resposta terapeutica.  | AMBOS          |                        |                          |                     |                            | BLOCO / GRAU / VALIDACAO HUMANA |                     |                    |                                |                      | SIM                    | MEDIA      | NAO               | SIM                 | NAO                            |                            | NUTRICIONAL FUNCIONAL | VALIDACOES DOS BLOCOS E GRADES |           | EXAME MAPEADO PARA O NOVO MOTOR GENERICO COM BASE NAS VALIDACOES DE BLOCOS E GRADES. | BLOCO DEFICIENCIA ABSORCAO    | GRADE SOFISTICADA   | SIM       |              4 | AVALIACAO CLINICA DIRIGIDA | REFINAMENTO DO RACIOCINIO CLINICO   | APOIAR DECISAO PRATICA                        | MEDIR O ALVO CLINICO DO BLOCO                         | Exame ou procedimento alinhado ao bloco clínico.                   | QUANDO O BLOCO FOR DISPARADO PELO MOTOR      | Interpretar sempre com contexto clínico | Correlacao clínica com o bloco oficial | EXAME VINCULADO AO BLOCO OFICIAL             | ★★☆☆☆             | ★★☆☆☆           | ★★☆☆☆                         | ★★★★☆                | ★★★☆☆                              | 2026-04-07 20:58:24.61091+00 | 2026-04-12 01:47:19.221+00 | EXAM DABS GSOF AMML 0001 | EXAM | DABS | GSOF | AMML | 0001
 37 | EXACTH               | t     | ENDOCRINO             | ADRENAL ESPECIFICO      | ACTH                | LABORATORIAL | SORO                  | BLOCO ADRENAL ESPECIFICO      |         |               | SOLICITO ACTH                |      |       |      |       |      |       | Solicitacao de ACTH para avaliacao do eixo adrenal, conforme protocolo do BLOCO ADRENAL ESPECIFICO no contexto de avaliacao clinica integrativa.                    | Exame laboratorial solicitado como parte da avaliacao sistematica do adrenal especifico. O ACTH e necessario para complementar o raciocinio clinico, permitindo investigacao adequada dentro do escopo de avaliacao do eixo adrenal, com objetivo de subsidiar a tomada de decisao terapeutica e o plano de cuidado individualizado do paciente.                   | Solicitacao fundamentada no protocolo de avaliacao adrenal especifico do motor clinico integrativo. O exame ACTH (laboratorial) integra o bloco BLOCO ADRENAL ESPECIFICO e tem como finalidade primaria a avaliacao do eixo adrenal. A realizacao deste exame e necessaria para composicao do perfil diagnostico completo, correlacao com dados clinicos da anamnese, estratificacao de risco e definicao de condutas terapeuticas baseadas em evidencias. O resultado sera utilizado para orientar intervencoes personalizadas dentro do plano de tratamento integrativo, incluindo ajustes de suplementacao, dietoterapia e monitoramento longitudinal da resposta terapeutica.                      | AMBOS          |                        |                          |                     |                            | BLOCO / GRAU / VALIDACAO HUMANA |                     |                    |                                |                      | SIM                    | MEDIA      | NAO               | SIM                 | NAO                            |                            | ENDOCRINO             | VALIDACOES DOS BLOCOS E GRADES |           | EXAME MAPEADO PARA O NOVO MOTOR GENERICO COM BASE NAS VALIDACOES DE BLOCOS E GRADES. | BLOCO ADRENAL ESPECIFICO      | GRADE INTERMEDIARIA | SIM       |              3 | AVALIACAO DO EIXO ADRENAL  | ESTRESSE, CORTISOL E RITMO HORMONAL | ORGANIZAR INVESTIGACAO DE CORTISOL E ADRENAIS | MEDIR EIXO HIPOTALAMO HIPOFISE ADRENAL                | Ajuda a correlacionar sintomas de fadiga, estresse e eixo adrenal. | FADIGA, INSÔNIA, HIPOTENSAO, ESTRESSE        | Alta dependência de contexto e horário  | Eixo HHA, cortisol, renina-aldosterona | EXAME DE EIXO HORMONAL, NAO DE RASTREIO CEGO | ★★★☆☆             | ★★★☆☆           | ★★★☆☆                         | ★★★★☆                | ★★★★☆                              | 2026-04-07 20:58:24.61091+00 | 2026-04-12 01:47:19.191+00 | EXAM ADRE GINT ACTH 0001 | EXAM | ADRE | GINT | ACTH | 0001
 38 | EXAFP                | t     | ONCOLOGICO            | MARCADORES CANCERIGENOS | AFP                 | LABORATORIAL | SORO                  | BLOCO MARCADORES CANCERIGENOS |         |               | SOLICITO AFP                 |      |       |      |       |      |       | Solicitacao de AFP para avaliacao clinica dirigida, conforme protocolo do BLOCO MARCADORES CANCERIGENOS no contexto de avaliacao clinica integrativa.               | Exame laboratorial solicitado como parte da avaliacao sistematica do marcadores cancerigenos. O AFP e necessario para complementar o raciocinio clinico, permitindo investigacao adequada dentro do escopo de avaliacao clinica dirigida, com objetivo de subsidiar a tomada de decisao terapeutica e o plano de cuidado individualizado do paciente.              | Solicitacao fundamentada no protocolo de avaliacao marcadores cancerigenos do motor clinico integrativo. O exame AFP (laboratorial) integra o bloco BLOCO MARCADORES CANCERIGENOS e tem como finalidade primaria a avaliacao clinica dirigida. A realizacao deste exame e necessaria para composicao do perfil diagnostico completo, correlacao com dados clinicos da anamnese, estratificacao de risco e definicao de condutas terapeuticas baseadas em evidencias. O resultado sera utilizado para orientar intervencoes personalizadas dentro do plano de tratamento integrativo, incluindo ajustes de suplementacao, dietoterapia e monitoramento longitudinal da resposta terapeutica.            | AMBOS          |                        |                          |                     |                            | BLOCO / GRAU / VALIDACAO HUMANA |                     |                    |                                |                      | SIM                    | MEDIA      | NAO               | SIM                 | NAO                            |                            | ONCOLOGICO            | VALIDACOES DOS BLOCOS E GRADES |           | EXAME MAPEADO PARA O NOVO MOTOR GENERICO COM BASE NAS VALIDACOES DE BLOCOS E GRADES. | BLOCO MARCADORES CANCERIGENOS | GRADE BASICA        | SIM       |              2 | AVALIACAO CLINICA DIRIGIDA | REFINAMENTO DO RACIOCINIO CLINICO   | APOIAR DECISAO PRATICA                        | MEDIR O ALVO CLINICO DO BLOCO                         | Exame ou procedimento alinhado ao bloco clínico.                   | QUANDO O BLOCO FOR DISPARADO PELO MOTOR      | Interpretar sempre com contexto clínico | Correlacao clínica com o bloco oficial | EXAME VINCULADO AO BLOCO OFICIAL             | ★★☆☆☆             | ★★☆☆☆           | ★★☆☆☆                         | ★★★★☆                | ★★★☆☆                              | 2026-04-07 20:58:24.61091+00 | 2026-04-12 01:47:19.258+00 | EXAM ONCO GBAS AFPX 0001 | EXAM | ONCO | GBAS | AFPX | 0001
 39 | EXALDOSTERONA        | t     | ENDOCRINO             | ADRENAL ESPECIFICO      | ALDOSTERONA         | LABORATORIAL | SORO                  | BLOCO ADRENAL ESPECIFICO      |         |               | SOLICITO ALDOSTERONA         |      |       |      |       |      |       | Solicitacao de ALDOSTERONA para avaliacao do eixo adrenal, conforme protocolo do BLOCO ADRENAL ESPECIFICO no contexto de avaliacao clinica integrativa.             | Exame laboratorial solicitado como parte da avaliacao sistematica do adrenal especifico. O ALDOSTERONA e necessario para complementar o raciocinio clinico, permitindo investigacao adequada dentro do escopo de avaliacao do eixo adrenal, com objetivo de subsidiar a tomada de decisao terapeutica e o plano de cuidado individualizado do paciente.            | Solicitacao fundamentada no protocolo de avaliacao adrenal especifico do motor clinico integrativo. O exame ALDOSTERONA (laboratorial) integra o bloco BLOCO ADRENAL ESPECIFICO e tem como finalidade primaria a avaliacao do eixo adrenal. A realizacao deste exame e necessaria para composicao do perfil diagnostico completo, correlacao com dados clinicos da anamnese, estratificacao de risco e definicao de condutas terapeuticas baseadas em evidencias. O resultado sera utilizado para orientar intervencoes personalizadas dentro do plano de tratamento integrativo, incluindo ajustes de suplementacao, dietoterapia e monitoramento longitudinal da resposta terapeutica.               | AMBOS          |                        |                          |                     |                            | BLOCO / GRAU / VALIDACAO HUMANA |                     |                    |                                |                      | SIM                    | MEDIA      | NAO               | SIM                 | NAO                            |                            | ENDOCRINO             | VALIDACOES DOS BLOCOS E GRADES |           | EXAME MAPEADO PARA O NOVO MOTOR GENERICO COM BASE NAS VALIDACOES DE BLOCOS E GRADES. | BLOCO ADRENAL ESPECIFICO      | GRADE INTERMEDIARIA | SIM       |              4 | AVALIACAO DO EIXO ADRENAL  | ESTRESSE, CORTISOL E RITMO HORMONAL | ORGANIZAR INVESTIGACAO DE CORTISOL E ADRENAIS | MEDIR EIXO HIPOTALAMO HIPOFISE ADRENAL                | Ajuda a correlacionar sintomas de fadiga, estresse e eixo adrenal. | FADIGA, INSÔNIA, HIPOTENSAO, ESTRESSE        | Alta dependência de contexto e horário  | Eixo HHA, cortisol, renina-aldosterona | EXAME DE EIXO HORMONAL, NAO DE RASTREIO CEGO | ★★★☆☆             | ★★★☆☆           | ★★★☆☆                         | ★★★★☆                | ★★★★☆                              | 2026-04-07 20:58:24.61091+00 | 2026-04-12 01:47:19.194+00 | EXAM ADRE GINT ALDO 0001 | EXAM | ADRE | GINT | ALDO | 0001
 40 | EXALUMINIO           | t     | TOXICOLOGICO          | METAIS TOXICOS          | ALUMINIO            | LABORATORIAL | SORO                  | BLOCO METAIS TOXICOS          |         |               | SOLICITO ALUMINIO            |      |       |      |       |      |       | Solicitacao de ALUMINIO para avaliacao clinica dirigida, conforme protocolo do BLOCO METAIS TOXICOS no contexto de avaliacao clinica integrativa.                   | Exame laboratorial solicitado como parte da avaliacao sistematica do metais toxicos. O ALUMINIO e necessario para complementar o raciocinio clinico, permitindo investigacao adequada dentro do escopo de avaliacao clinica dirigida, com objetivo de subsidiar a tomada de decisao terapeutica e o plano de cuidado individualizado do paciente.                  | Solicitacao fundamentada no protocolo de avaliacao metais toxicos do motor clinico integrativo. O exame ALUMINIO (laboratorial) integra o bloco BLOCO METAIS TOXICOS e tem como finalidade primaria a avaliacao clinica dirigida. A realizacao deste exame e necessaria para composicao do perfil diagnostico completo, correlacao com dados clinicos da anamnese, estratificacao de risco e definicao de condutas terapeuticas baseadas em evidencias. O resultado sera utilizado para orientar intervencoes personalizadas dentro do plano de tratamento integrativo, incluindo ajustes de suplementacao, dietoterapia e monitoramento longitudinal da resposta terapeutica.                         | AMBOS          |                        |                          |                     |                            | BLOCO / GRAU / VALIDACAO HUMANA |                     |                    |                                |                      | SIM                    | MEDIA      | NAO               | SIM                 | NAO                            |                            | TOXICOLOGICO          | VALIDACOES DOS BLOCOS E GRADES |           | EXAME MAPEADO PARA O NOVO MOTOR GENERICO COM BASE NAS VALIDACOES DE BLOCOS E GRADES. | BLOCO METAIS TOXICOS          | GRADE BASICA        | SIM       |              1 | AVALIACAO CLINICA DIRIGIDA | REFINAMENTO DO RACIOCINIO CLINICO   | APOIAR DECISAO PRATICA                        | MEDIR O ALVO CLINICO DO BLOCO                         | Exame ou procedimento alinhado ao bloco clínico.                   | QUANDO O BLOCO FOR DISPARADO PELO MOTOR      | Interpretar sempre com contexto clínico | Correlacao clínica com o bloco oficial | EXAME VINCULADO AO BLOCO OFICIAL             | ★★☆☆☆             | ★★☆☆☆           | ★★☆☆☆                         | ★★★★☆                | ★★★☆☆                              | 2026-04-07 20:58:24.61091+00 | 2026-04-12 01:47:19.429+00 | EXAM TOXI GBAS ALUM 0001 | EXAM | TOXI | GBAS | ALUM | 0001
 41 | EXAMILASE            | t     | GERAL                 | BASE INTEGRATIVA        | AMILASE             | LABORATORIAL | SORO                  | BLOCO BASE INTEGRATIVA        |         |               | SOLICITO AMILASE             |      |       |      |       |      |       | Solicitacao de AMILASE para triagem integrativa ampla, conforme protocolo do BLOCO BASE INTEGRATIVA no contexto de avaliacao clinica integrativa.                   | Exame laboratorial solicitado como parte da avaliacao sistematica do base integrativa. O AMILASE e necessario para complementar o raciocinio clinico, permitindo investigacao adequada dentro do escopo de triagem integrativa ampla, com objetivo de subsidiar a tomada de decisao terapeutica e o plano de cuidado individualizado do paciente.                  | Solicitacao fundamentada no protocolo de avaliacao base integrativa do motor clinico integrativo. O exame AMILASE (laboratorial) integra o bloco BLOCO BASE INTEGRATIVA e tem como finalidade primaria a triagem integrativa ampla. A realizacao deste exame e necessaria para composicao do perfil diagnostico completo, correlacao com dados clinicos da anamnese, estratificacao de risco e definicao de condutas terapeuticas baseadas em evidencias. O resultado sera utilizado para orientar intervencoes personalizadas dentro do plano de tratamento integrativo, incluindo ajustes de suplementacao, dietoterapia e monitoramento longitudinal da resposta terapeutica.                       | AMBOS          |                        |                          |                     |                            | BLOCO / GRAU / VALIDACAO HUMANA |                     |                    |                                |                      | SIM                    | MEDIA      | NAO               | SIM                 | NAO                            |                            | GERAL                 | VALIDACOES DOS BLOCOS E GRADES |           | EXAME MAPEADO PARA O NOVO MOTOR GENERICO COM BASE NAS VALIDACOES DE BLOCOS E GRADES. | BLOCO BASE INTEGRATIVA        | GRADE BASICA        | SIM       |             11 | TRIAGEM INTEGRATIVA AMPLA  | MAPEAR CARENCIAS E FUNCOES BASICAS  | ABRIR O CHECK UP COM BASE AMPLA               | COBRIR TRIAGEM CLINICA, HEPATICA, RENAL E NUTRICIONAL | Base de entrada ampla e eficiente.                                 | CHECK UP, FADIGA, CARENCIAS, TRIAGEM INICIAL | Nao substitui blocos específicos        | Triagem ampla inicial                  | BLOCO DE ENTRADA DO SISTEMA                  | ★★★☆☆             | ★★☆☆☆           | ★★★☆☆                         | ★★★★★                | ★★☆☆☆                              | 2026-04-07 20:58:24.61091+00 | 2026-04-12 01:47:19.017+00 | EXAM BINT GBAS AMIL 0001 | EXAM | BINT | GBAS | AMIL | 0001
 42 | EXANCAC              | t     | IMUNOLOGICO           | AUTOIMUNE               | ANCA C              | LABORATORIAL | SORO                  | BLOCO AUTOIMUNE               |         |               | SOLICITO ANCA C              |      |       |      |       |      |       | Solicitacao de ANCA C para avaliacao clinica dirigida, conforme protocolo do BLOCO AUTOIMUNE no contexto de avaliacao clinica integrativa.                          | Exame laboratorial solicitado como parte da avaliacao sistematica do autoimune. O ANCA C e necessario para complementar o raciocinio clinico, permitindo investigacao adequada dentro do escopo de avaliacao clinica dirigida, com objetivo de subsidiar a tomada de decisao terapeutica e o plano de cuidado individualizado do paciente.                         | Solicitacao fundamentada no protocolo de avaliacao autoimune do motor clinico integrativo. O exame ANCA C (laboratorial) integra o bloco BLOCO AUTOIMUNE e tem como finalidade primaria a avaliacao clinica dirigida. A realizacao deste exame e necessaria para composicao do perfil diagnostico completo, correlacao com dados clinicos da anamnese, estratificacao de risco e definicao de condutas terapeuticas baseadas em evidencias. O resultado sera utilizado para orientar intervencoes personalizadas dentro do plano de tratamento integrativo, incluindo ajustes de suplementacao, dietoterapia e monitoramento longitudinal da resposta terapeutica.                                     | AMBOS          |                        |                          |                     |                            | BLOCO / GRAU / VALIDACAO HUMANA |                     |                    |                                |                      | SIM                    | MEDIA      | NAO               | SIM                 | NAO                            |                            | IMUNOLOGICO           | VALIDACOES DOS BLOCOS E GRADES |           | EXAME MAPEADO PARA O NOVO MOTOR GENERICO COM BASE NAS VALIDACOES DE BLOCOS E GRADES. | BLOCO AUTOIMUNE               | GRADE SOFISTICADA   | SIM       |             12 | AVALIACAO CLINICA DIRIGIDA | REFINAMENTO DO RACIOCINIO CLINICO   | APOIAR DECISAO PRATICA                        | MEDIR O ALVO CLINICO DO BLOCO                         | Exame ou procedimento alinhado ao bloco clínico.                   | QUANDO O BLOCO FOR DISPARADO PELO MOTOR      | Interpretar sempre com contexto clínico | Correlacao clínica com o bloco oficial | EXAME VINCULADO AO BLOCO OFICIAL             | ★★☆☆☆             | ★★☆☆☆           | ★★☆☆☆                         | ★★★★☆                | ★★★☆☆                              | 2026-04-07 20:58:24.61091+00 | 2026-04-12 01:47:19.362+00 | EXAM AUTO GSOF ANCC 0001 | EXAM | AUTO | GSOF | ANCC | 0001
 43 | EXANCAP              | t     | IMUNOLOGICO           | AUTOIMUNE               | ANCA P              | LABORATORIAL | SORO                  | BLOCO AUTOIMUNE               |         |               | SOLICITO ANCA P              |      |       |      |       |      |       | Solicitacao de ANCA P para avaliacao clinica dirigida, conforme protocolo do BLOCO AUTOIMUNE no contexto de avaliacao clinica integrativa.                          | Exame laboratorial solicitado como parte da avaliacao sistematica do autoimune. O ANCA P e necessario para complementar o raciocinio clinico, permitindo investigacao adequada dentro do escopo de avaliacao clinica dirigida, com objetivo de subsidiar a tomada de decisao terapeutica e o plano de cuidado individualizado do paciente.                         | Solicitacao fundamentada no protocolo de avaliacao autoimune do motor clinico integrativo. O exame ANCA P (laboratorial) integra o bloco BLOCO AUTOIMUNE e tem como finalidade primaria a avaliacao clinica dirigida. A realizacao deste exame e necessaria para composicao do perfil diagnostico completo, correlacao com dados clinicos da anamnese, estratificacao de risco e definicao de condutas terapeuticas baseadas em evidencias. O resultado sera utilizado para orientar intervencoes personalizadas dentro do plano de tratamento integrativo, incluindo ajustes de suplementacao, dietoterapia e monitoramento longitudinal da resposta terapeutica.                                     | AMBOS          |                        |                          |                     |                            | BLOCO / GRAU / VALIDACAO HUMANA |                     |                    |                                |                      | SIM                    | MEDIA      | NAO               | SIM                 | NAO                            |                            | IMUNOLOGICO           | VALIDACOES DOS BLOCOS E GRADES |           | EXAME MAPEADO PARA O NOVO MOTOR GENERICO COM BASE NAS VALIDACOES DE BLOCOS E GRADES. | BLOCO AUTOIMUNE               | GRADE SOFISTICADA   | SIM       |             13 | AVALIACAO CLINICA DIRIGIDA | REFINAMENTO DO RACIOCINIO CLINICO   | APOIAR DECISAO PRATICA                        | MEDIR O ALVO CLINICO DO BLOCO                         | Exame ou procedimento alinhado ao bloco clínico.                   | QUANDO O BLOCO FOR DISPARADO PELO MOTOR      | Interpretar sempre com contexto clínico | Correlacao clínica com o bloco oficial | EXAME VINCULADO AO BLOCO OFICIAL             | ★★☆☆☆             | ★★☆☆☆           | ★★☆☆☆                         | ★★★★☆                | ★★★☆☆                              | 2026-04-07 20:58:24.61091+00 | 2026-04-12 01:47:19.366+00 | EXAM AUTO GSOF ANCP 0001 | EXAM | AUTO | GSOF | ANCP | 0001
 44 | EXANGIORRESSONANCIA  | t     | GERAL                 | CARDIOLOGICOS DE IMAGEM | ANGIORRESSONANCIA   | RM           | IMAGEM / PROCEDIMENTO | BLOCO CARDIOLOGICOS DE IMAGEM |         |               | SOLICITO ANGIORRESSONANCIA   |      |       |      |       |      |       | Solicitacao de ANGIORRESSONANCIA para avaliacao clinica dirigida, conforme protocolo do BLOCO CARDIOLOGICOS DE IMAGEM no contexto de avaliacao clinica integrativa. | Exame de imagem solicitado como parte da avaliacao sistematica do cardiologicos de imagem. O ANGIORRESSONANCIA e necessario para complementar o raciocinio clinico, permitindo investigacao adequada dentro do escopo de avaliacao clinica dirigida, com objetivo de subsidiar a tomada de decisao terapeutica e o plano de cuidado individualizado do paciente.   | Solicitacao fundamentada no protocolo de avaliacao cardiologicos de imagem do motor clinico integrativo. O exame ANGIORRESSONANCIA (de imagem) integra o bloco BLOCO CARDIOLOGICOS DE IMAGEM e tem como finalidade primaria a avaliacao clinica dirigida. A realizacao deste exame e necessaria para composicao do perfil diagnostico completo, correlacao com dados clinicos da anamnese, estratificacao de risco e definicao de condutas terapeuticas baseadas em evidencias. O resultado sera utilizado para orientar intervencoes personalizadas dentro do plano de tratamento integrativo, incluindo ajustes de suplementacao, dietoterapia e monitoramento longitudinal da resposta terapeutica. | AMBOS          |                        |                          |                     |                            | BLOCO / GRAU / VALIDACAO HUMANA |                     |                    |                                |                      | SIM                    | ALTA       | NAO               | SIM                 | NAO                            |                            | GERAL                 | VALIDACOES DOS BLOCOS E GRADES |           | EXAME MAPEADO PARA O NOVO MOTOR GENERICO COM BASE NAS VALIDACOES DE BLOCOS E GRADES. | BLOCO RESSONANCIA MAGNETICA   | SEM GRADE           | NAO       |              8 | AVALIACAO CLINICA DIRIGIDA | REFINAMENTO DO RACIOCINIO CLINICO   | APOIAR DECISAO PRATICA                        | MEDIR O ALVO CLINICO DO BLOCO                         | Exame ou procedimento alinhado ao bloco clínico.                   | QUANDO O BLOCO FOR DISPARADO PELO MOTOR      | Interpretar sempre com contexto clínico | Correlacao clínica com o bloco oficial | EXAME VINCULADO AO BLOCO OFICIAL             | ★★☆☆☆             | ★★☆☆☆           | ★★☆☆☆                         | ★★★★☆                | ★★★☆☆                              | 2026-04-07 20:58:24.61091+00 | 2026-04-12 01:47:19.564+00 | EXAM RESS SGRD ANGR 0001 | EXAM | RESS | SGRD | ANGR | 0001
(10 rows)

```

## 7) parametros_referencia_global ATUAL — 71 linhas (TUDO)

```
ERROR:  column "dominio" does not exist
LINE 1: SELECT id, dominio, codigo, descricao, valor_min, valor_max,...
                   ^
```

## 8) DECISÃO QUE PRECISO DE TI, DR. CLAUDE

Dos 209 analitos de sangue, 195 estão sem `unidade_padrao_integrativa`.
Para popular `parametros_referencia_global` em massa preciso saber:

a) Faço primeiro UPDATE em analitos_catalogo preenchendo `unidade_padrao_integrativa` + `terco_excelente` dos 195?
   (UPDATE puro, idempotente, IF NULL THEN preencher)

b) Depois INSERT em parametros_referencia_global com os 195?
   (uma faixa MC + faixa integrativa por analito ≈ 390 INSERTs)

c) OU prefere outra estratégia (ex: só os 60-80 mais usados na clínica)?

Critério Caio: quer todos os exames de SANGUE com faixa, terço e cor (frontend depois).
