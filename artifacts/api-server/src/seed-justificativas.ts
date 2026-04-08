import { db } from "@workspace/db";
import { examesBaseTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const justificativasClinicas: Record<string, { objetiva: string; narrativa: string; robusta: string }> = {
  "HEMOGRAMA": {
    objetiva: "Avaliacao quantitativa e qualitativa das series vermelha, branca e plaquetaria para rastreio de anemias, infeccoes e disturbios hematologicos.",
    narrativa: "O hemograma completo e solicitado como parte da avaliacao integrativa inicial para identificar alteracoes nas linhagens celulares sanguineas, permitindo detectar anemias carenciais, processos infecciosos agudos ou cronicos, alteracoes plaquetarias e sinais indiretos de inflamacao sistemica que possam impactar o plano terapeutico do paciente.",
    robusta: "Solicitacao fundamentada na necessidade de avaliacao sistematica das tres linhagens hematologicas (eritrocitaria, leucocitaria e megacariocitica) como parte do protocolo de triagem integrativa. O hemograma fornece dados essenciais para correlacao com sintomas clinicos, deteccao precoce de anemias ferropriva, megaloblastica ou de doenca cronica, identificacao de leucocitoses reacionais ou leucopenias, e monitoramento de plaquetas. Exame indispensavel para estratificacao de risco e definicao de condutas terapeuticas subsequentes."
  },
  "TSH": {
    objetiva: "Avaliacao da funcao tireoideana para rastreio de hipo ou hipertireoidismo e monitoramento de disfuncoes tireoidianas.",
    narrativa: "O TSH e o marcador mais sensivel para deteccao de disfuncoes tireoidianas, sendo solicitado para investigacao de fadiga, alteracoes de peso, disturbios do humor, queda capilar e outros sintomas que possam estar relacionados a desregulacao do eixo hipotalamo-hipofise-tireoide, frequentes na pratica integrativa.",
    robusta: "Dosagem do hormonio tireoestimulante como exame de primeira linha na avaliacao funcional da tireoide, conforme protocolos de rastreio endocrinologico. O TSH ultrassensivel permite detectar tanto hipotireoidismo subclinico quanto hipertireoidismo incipiente, condicoes frequentemente subdiagnosticadas que impactam metabolismo, composicao corporal, funcao cognitiva e bem-estar geral. Essencial para correlacao com T4 livre, T3 e anticorpos tireoidianos quando indicado."
  },
  "VITAMINA D": {
    objetiva: "Dosagem serica de 25-OH vitamina D para avaliacao do status nutricional e metabolismo osseo.",
    narrativa: "A dosagem de vitamina D e solicitada para avaliar a suficiencia desta vitamina-hormonio, cuja deficiencia esta associada a risco aumentado de osteoporose, imunossupressao, fadiga cronica, disturbios do humor e maior suscetibilidade a infeccoes, sendo um dos pilares da avaliacao integrativa.",
    robusta: "Determinacao dos niveis sericos de 25-hidroxivitamina D (calcidiol) como marcador do status nutricional e reserva corporal desta vitamina-hormonio. A avaliacao e fundamentada pela alta prevalencia de hipovitaminose D na populacao e sua correlacao com desmineralizacao ossea, disfuncao imunologica, resistencia insulinica, inflamacao cronica e risco cardiovascular. Resultado essencial para definicao de dose de suplementacao individualizada e monitoramento terapeutico."
  },
  "HEMOGLOBINA GLICADA": {
    objetiva: "Avaliacao do controle glicemico medio dos ultimos 90 dias para rastreio e monitoramento de diabetes.",
    narrativa: "A hemoglobina glicada (HbA1c) reflete a media glicemica dos ultimos 2 a 3 meses, sendo solicitada para rastreio de pre-diabetes e diabetes mellitus, bem como para monitoramento da eficacia de intervencoes dieteticas e terapeuticas na regulacao do metabolismo glicidico.",
    robusta: "Dosagem de hemoglobina glicada (HbA1c) como marcador retrospectivo do controle glicemico, com janela de avaliacao de 90 a 120 dias. Exame padronizado pela ADA e SBD para diagnostico de diabetes (HbA1c >= 6.5%) e pre-diabetes (5.7-6.4%). No contexto integrativo, permite avaliar a eficacia de protocolos nutricionais, suplementacao com cromo, berberina e acido alfa-lipoico, alem de orientar ajustes no plano terapeutico com base em evidencias longitudinais."
  },
  "GLICEMIA DE JEJUM": {
    objetiva: "Dosagem de glicose sanguinea em jejum para rastreio de disglicemias e diabetes mellitus.",
    narrativa: "A glicemia de jejum e solicitada como parte da avaliacao metabolica basal, permitindo identificar estados de resistencia insulinica, pre-diabetes e diabetes mellitus tipo 2, condicoes frequentemente associadas a sindrome metabolica e inflamacao cronica.",
    robusta: "Determinacao da glicemia plasmatica em jejum de 8 a 12 horas como marcador de homeostase glicemica. Valores entre 100-125 mg/dL indicam glicemia de jejum alterada, e acima de 126 mg/dL sugerem diabetes mellitus. No contexto integrativo, a glicemia de jejum e correlacionada com insulina basal para calculo do indice HOMA-IR, permitindo avaliacao precisa da resistencia insulinica e orientacao de intervencoes dietoterapeticas e suplementares personalizadas."
  },
  "INSULINA BASAL": {
    objetiva: "Dosagem de insulina em jejum para avaliacao de resistencia insulinica e risco metabolico.",
    narrativa: "A insulina basal e fundamental para o calculo do HOMA-IR e HOMA-BETA, permitindo identificar hiperinsulinemia compensatoria e resistencia insulinica antes da manifestacao de hiperglicemia, possibilitando intervencao preventiva precoce.",
    robusta: "Dosagem de insulina serica em jejum para calculo dos indices de resistencia (HOMA-IR) e funcao das celulas beta pancreaticas (HOMA-BETA). A hiperinsulinemia compensatoria precede o diagnostico de diabetes em anos, sendo marcador precoce de disfuncao metabolica. No contexto integrativo, orienta prescricao de cromo, vanadio, berberina, inositol e protocolos de jejum intermitente, alem de monitorar resposta terapeutica."
  },
  "COLESTEROL TOTAL": {
    objetiva: "Dosagem de colesterol total serico para avaliacao do perfil lipidico e risco cardiovascular.",
    narrativa: "O colesterol total e solicitado como parte do painel lipidico para avaliacao do risco cardiovascular global, permitindo identificar dislipidemias e orientar intervencoes nutricionais e terapeuticas preventivas.",
    robusta: "Determinacao do colesterol total serico como componente do perfil lipidico completo. Embora o colesterol total isolado tenha limitacoes, sua avaliacao conjunta com fracoes (HDL, LDL, VLDL) e triglicerides permite estratificacao de risco cardiovascular segundo escores validados. No contexto integrativo, orienta prescricao de omega-3, fitosterois, berberina e ajustes dietoterapeticos para otimizacao do perfil lipidico."
  },
  "HDL": {
    objetiva: "Dosagem de HDL-colesterol para avaliacao do fator protetor cardiovascular e perfil lipidico.",
    narrativa: "O HDL-colesterol, conhecido como colesterol bom, e dosado para avaliar a capacidade de transporte reverso de colesterol e fator cardioprotetor. Niveis baixos estao associados a maior risco aterosclerotico e sindrome metabolica.",
    robusta: "Dosagem de lipoproteina de alta densidade (HDL-colesterol) como marcador cardioprotetor e componente essencial da avaliacao lipidica. Niveis inferiores a 40 mg/dL em homens e 50 mg/dL em mulheres constituem fator de risco cardiovascular independente. No contexto integrativo, niveis subotimos de HDL orientam prescricao de exercicio aerobico, omega-3, niacina e ajustes na composicao de macronutrientes da dieta."
  },
  "LDL": {
    objetiva: "Dosagem de LDL-colesterol para avaliacao do risco aterosclerotico e estratificacao cardiovascular.",
    narrativa: "O LDL-colesterol e o principal alvo terapeutico na prevencao cardiovascular, sendo dosado para avaliar a carga aterogenica e definir metas terapeuticas individualizadas conforme o perfil de risco do paciente.",
    robusta: "Determinacao do LDL-colesterol (dosado ou calculado por Friedewald) como principal fator aterogenico e alvo terapeutico primario. Metas variam conforme estratificacao de risco (alto risco: <70 mg/dL, muito alto risco: <50 mg/dL). No contexto integrativo, niveis elevados orientam intervencoes com berberina, fitosterois, fibras soluveis, arroz vermelho fermentado e protocolos anti-inflamatorios, alem de avaliacao de LDL oxidado e particulas pequenas e densas."
  },
  "VLDL": {
    objetiva: "Dosagem de VLDL-colesterol para avaliacao do metabolismo de triglicerides e risco aterogenico residual.",
    narrativa: "O VLDL reflete o metabolismo hepatico de triglicerides e contribui para o risco aterogenico residual, sendo relevante na avaliacao de pacientes com hipertrigliceridemia e sindrome metabolica.",
    robusta: "Determinacao do VLDL-colesterol como marcador do metabolismo hepatico de lipoproteinas ricas em triglicerides. Niveis elevados indicam aumento da lipogenese hepatica e contribuem para o risco aterogenico residual nao capturado pela dosagem isolada de LDL. Avaliacao complementar essencial em pacientes com hipertrigliceridemia, esteatose hepatica e resistencia insulinica."
  },
  "TRIGLICERIDES": {
    objetiva: "Dosagem de triglicerides sericos para avaliacao do metabolismo lipidico e risco cardiometabolico.",
    narrativa: "Os triglicerides sao dosados para investigacao de hipertrigliceridemia, frequentemente associada a resistencia insulinica, consumo excessivo de carboidratos refinados, uso de alcool e risco de pancreatite quando em niveis muito elevados.",
    robusta: "Dosagem de triglicerides sericos em jejum como marcador de metabolismo lipidico e risco cardiometabolico. A razao triglicerides/HDL e marcador indireto de resistencia insulinica (valores >3.0 sugerem RI). Niveis acima de 500 mg/dL aumentam risco de pancreatite aguda. No contexto integrativo, valores elevados orientam reducao de carboidratos refinados, suplementacao com omega-3 em dose terapeutica e avaliacao de esteatose hepatica."
  },
  "TGO": {
    objetiva: "Dosagem de transaminase glutamico-oxalacetica para avaliacao da funcao hepatica e lesao hepatocelular.",
    narrativa: "O TGO (AST) e um marcador de lesao hepatocelular solicitado para rastreio de hepatopatias, sendo tambem encontrado em musculo cardiaco e esqueletico, o que requer correlacao com TGP para especificidade hepatica.",
    robusta: "Dosagem de aspartato aminotransferase (AST/TGO) como marcador de integridade hepatocelular e muscular. A relacao AST/ALT (indice de Ritis) auxilia na diferenciacao etiologica: valores >2 sugerem hepatopatia alcoolica, enquanto <1 sugerem esteatose nao alcoolica. No contexto integrativo, alteracoes orientam avaliacao de sobrecarga hepatica, exposicao a toxinas ambientais e indicacao de protocolos hepatoprotetores com silimarina, NAC e fosfatidilcolina."
  },
  "TGP": {
    objetiva: "Dosagem de transaminase glutamico-piruvica para avaliacao especifica de lesao hepatocelular.",
    narrativa: "O TGP (ALT) e o marcador mais especifico de lesao hepatica, sendo solicitado para rastreio de esteatose hepatica, hepatites e sobrecarga hepatica medicamentosa, com importancia na avaliacao integrativa da funcao de detoxificacao.",
    robusta: "Dosagem de alanina aminotransferase (ALT/TGP) como marcador hepatoespecifico de lesao celular. Elevacoes persistentes acima de 30 U/L em homens e 19 U/L em mulheres (criterios atualizados) podem indicar esteatose hepatica nao alcoolica (DHGNA), presente em ate 30% da populacao. No contexto integrativo, orienta investigacao de sobrecarga toxica, deficiencia de colina, e indicacao de suporte hepatico com cardo-mariano, N-acetilcisteina e betaina."
  },
  "GGT": {
    objetiva: "Dosagem de gama glutamiltransferase para avaliacao de colestase e estresse oxidativo hepatico.",
    narrativa: "A GGT e um marcador sensivel de colestase e indutor hepatico, sendo tambem utilizada como indicador indireto de estresse oxidativo e exposicao a xenobioticos, com relevancia na avaliacao integrativa da capacidade de detoxificacao.",
    robusta: "Dosagem de gama-glutamiltransferase (GGT) como marcador de colestase, inducao enzimatica e estresse oxidativo hepatico. Elevacoes isoladas de GGT, mesmo com transaminases normais, podem indicar exposicao a alcool, medicamentos hepatotoxicos ou depleção de glutationa. No contexto integrativo, GGT elevada orienta suplementacao com NAC, glutationa, e protocolo de suporte as fases I e II da detoxificacao hepatica."
  },
  "FOSFATASE ALCALINA": {
    objetiva: "Dosagem de fosfatase alcalina para avaliacao de colestase e metabolismo osseo.",
    narrativa: "A fosfatase alcalina e solicitada para investigacao de colestase hepatica e doencas osteometabolicas, sendo marcador util na diferenciacao entre causas hepaticas e osseas de sua elevacao quando correlacionada com GGT.",
    robusta: "Dosagem de fosfatase alcalina serica como marcador de colestase hepatobiliar e atividade osteoblastica. Elevacoes concomitantes com GGT sugerem origem hepatica, enquanto elevacao isolada pode indicar doenca ossea metabolica. No contexto integrativo, orienta investigacao de deficiencia de zinco (cofator da FA), avaliacao de saude ossea e integridade das vias biliares."
  },
  "CREATININA": {
    objetiva: "Dosagem de creatinina serica para avaliacao da funcao renal glomerular.",
    narrativa: "A creatinina e o marcador padrao para estimativa da taxa de filtracao glomerular (TFG), sendo essencial para avaliacao da funcao renal e ajuste de doses de suplementos e medicamentos no contexto integrativo.",
    robusta: "Dosagem de creatinina serica para calculo da taxa de filtracao glomerular estimada (TFGe) por CKD-EPI, classificacao de doenca renal cronica e monitoramento da funcao renal. Valores de referencia devem ser interpretados considerando massa muscular, idade e sexo. No contexto integrativo, a funcao renal adequada e pre-requisito para prescricao segura de suplementos como magnesio, potassio e vitamina D em doses elevadas."
  },
  "UREIA": {
    objetiva: "Dosagem de ureia serica para avaliacao da funcao renal e estado de hidratacao.",
    narrativa: "A ureia complementa a creatinina na avaliacao renal e reflete o catabolismo proteico e estado de hidratacao, sendo util na interpretacao do balance nitrogenado do paciente.",
    robusta: "Dosagem de ureia serica como marcador complementar da funcao renal e catabolismo proteico. A relacao ureia/creatinina auxilia na diferenciacao entre causas pre-renais (desidratacao, sangramento gastrointestinal) e renais intrinsecas. No contexto integrativo, valores elevados podem indicar ingestao proteica excessiva, desidratacao ou comprometimento da funcao renal, orientando ajustes dieteticos e de suplementacao."
  },
  "ACIDO URICO": {
    objetiva: "Dosagem de acido urico para avaliacao do metabolismo das purinas e risco cardiovascular.",
    narrativa: "O acido urico e solicitado para rastreio de hiperuricemia, associada a gota, sindrome metabolica, risco cardiovascular e lesao renal, sendo relevante na avaliacao metabólica integrativa.",
    robusta: "Dosagem de acido urico serico como marcador do metabolismo das purinas e indicador de risco cardiometabolico. Hiperuricemia (>7 mg/dL em homens, >6 mg/dL em mulheres) esta associada a artrite gotosa, nefrolitiase, sindrome metabolica e disfuncao endotelial. No contexto integrativo, orienta restricao de frutose e purinas dieteticas, suplementacao com vitamina C e quercetina, e avaliacao da funcao renal para prevencao de complicacoes."
  },
  "FERRITINA": {
    objetiva: "Dosagem de ferritina serica para avaliacao das reservas corporais de ferro e estados inflamatorios.",
    narrativa: "A ferritina reflete as reservas de ferro do organismo, sendo essencial para diagnostico de deficiencia de ferro e sobrecarga ferrica. Por ser tambem proteina de fase aguda, deve ser interpretada junto com PCR para exclusao de elevacao inflamatoria.",
    robusta: "Dosagem de ferritina serica como principal marcador das reservas corporais de ferro. Valores abaixo de 30 ng/mL indicam depleção de ferro mesmo sem anemia manifesta, enquanto valores acima de 200 ng/mL em mulheres e 300 ng/mL em homens requerem investigacao de sobrecarga (hemocromatose). Como proteina de fase aguda, sua interpretacao exige correlacao com PCR. No contexto integrativo, ferritina subotima (< 50 ng/mL) orienta suplementacao de ferro quelado e investigacao de causas de perda ou ma absorcao."
  },
  "FERRO SERICO": {
    objetiva: "Dosagem de ferro serico para avaliacao do metabolismo do ferro e investigacao de anemias.",
    narrativa: "O ferro serico avalia a disponibilidade imediata de ferro circulante, sendo interpretado junto com ferritina, transferrina e saturacao de transferrina para caracterizacao completa do metabolismo ferrico.",
    robusta: "Dosagem de ferro serico como componente do painel ferrico completo. Deve ser interpretado em conjunto com ferritina, TIBC e indice de saturacao de transferrina para diferenciacao entre deficiencia de ferro absoluta, funcional e anemia de doenca cronica. No contexto integrativo, a avaliacao do metabolismo do ferro e essencial para prescricao adequada de suplementacao, evitando tanto deficiencia quanto sobrecarga."
  },
  "VITAMINA B12": {
    objetiva: "Dosagem de vitamina B12 serica para rastreio de deficiencia e avaliacao neurometabolica.",
    narrativa: "A vitamina B12 e essencial para sintese de DNA, mielinizacao neuronal e metabolismo da homocisteina. Sua deficiencia, frequente em vegetarianos, usuarios de metformina e idosos, pode causar anemia megaloblastica e neuropatia periferica.",
    robusta: "Dosagem de cobalamina (vitamina B12) serica para avaliacao do status nutricional e funcao neurometabolica. Deficiencia subclínica (200-400 pg/mL) pode manifestar-se com fadiga, alteracoes cognitivas e neuropatia antes do surgimento de anemia. Populacoes de risco incluem vegetarianos, usuarios de IBP e metformina, idosos e pacientes com doencas autoimunes gastrointestinais. No contexto integrativo, orienta suplementacao com metilcobalamina ou hidroxocobalamina e investigacao de absorcao por fator intrinseco."
  },
  "ACIDO FOLICO": {
    objetiva: "Dosagem de acido folico para avaliacao do status de folato e metabolismo da metilacao.",
    narrativa: "O acido folico e fundamental para sintese de DNA, divisao celular e ciclo da metilacao. Sua deficiencia esta associada a anemia megaloblastica, defeitos do tubo neural e hiperhomocisteinemia.",
    robusta: "Dosagem de folato serico como marcador do status nutricional e funcionalidade do ciclo de metilacao. A deficiencia de folato compromete a conversao de homocisteina em metionina, elevando o risco cardiovascular. Polimorfismos do gene MTHFR (C677T, A1298C) podem reduzir a conversao de acido folico em metilfolato ativo. No contexto integrativo, orienta prescricao de metilfolato (5-MTHF) em vez de acido folico sintetico, especialmente em portadores de polimorfismos MTHFR."
  },
  "MAGNESIO": {
    objetiva: "Dosagem de magnesio serico para avaliacao do status deste mineral essencial para funcoes neuromusculares.",
    narrativa: "O magnesio participa de mais de 300 reacoes enzimaticas e sua deficiencia subclínica, frequentemente nao detectada pelo magnesio serico, esta associada a caibras, insonia, ansiedade, arritmias e resistencia insulinica.",
    robusta: "Dosagem de magnesio serico como avaliacao inicial do status deste mineral cofator de mais de 300 reacoes enzimaticas. O magnesio serico reflete apenas 1% do magnesio corporal total, podendo estar normal mesmo com depleção intracelular significativa. No contexto integrativo, valores na faixa inferior da normalidade (<2.0 mg/dL) ja justificam suplementacao, preferencialmente com formas queladas (bisglicinato, treonato, taurato) conforme objetivo terapeutico especifico."
  },
  "ZINCO": {
    objetiva: "Dosagem de zinco serico para avaliacao do status deste mineral essencial para imunidade e cicatrizacao.",
    narrativa: "O zinco e cofator de mais de 200 enzimas e essencial para funcao imunologica, cicatrizacao, fertilidade e funcao tireoideana. Sua deficiencia e prevalente e subdiagnosticada, especialmente em idosos e vegetarianos.",
    robusta: "Dosagem de zinco serico como marcador do status nutricional deste oligoelemento essencial. O zinco e cofator de metaloproteinas envolvidas em imunidade, cicatrizacao, espermatogenese, funcao tireoideana e protecao antioxidante (superoxido dismutase). Deficiencia afeta ate 30% da populacao e e agravada por uso de diureticos, quelantes e dietas restritivas. No contexto integrativo, orienta suplementacao com zinco quelado e avaliacao da relacao cobre/zinco para equilibrio de oligoelementos."
  },
  "CALCIO TOTAL": {
    objetiva: "Dosagem de calcio total serico para avaliacao do metabolismo osseo e funcao paratireoideana.",
    narrativa: "O calcio total e solicitado para investigacao de hipo e hipercalcemia, avaliacao do metabolismo osseo e funcao das paratireoides, sendo complementado pela dosagem de calcio ionico quando necessario.",
    robusta: "Dosagem de calcio total serico como marcador do metabolismo calcio-fosforo e funcao paratireoideana. Deve ser corrigido pela albumina serica para interpretacao adequada. Hipocalcemia pode indicar deficiencia de vitamina D, hipoparatireoidismo ou hipomagnesemia, enquanto hipercalcemia sugere hiperparatireoidismo ou neoplasia. No contexto integrativo, orienta prescricao de calcio, vitamina D e K2 com base em dados objetivos, evitando suplementacao empirica."
  },
  "PCR ULTRASSENSIVEL": {
    objetiva: "Dosagem de proteina C reativa ultrassensivel para avaliacao de inflamacao subclínica e risco cardiovascular.",
    narrativa: "A PCR-us e o principal marcador de inflamacao subclínica de baixo grau, associada a risco cardiovascular aumentado, resistencia insulinica e envelhecimento acelerado, sendo um pilar da avaliacao integrativa.",
    robusta: "Dosagem de proteina C reativa por metodo ultrassensivel (PCR-us) como marcador de inflamacao sistemica de baixo grau e preditor independente de risco cardiovascular. Valores acima de 3 mg/L indicam alto risco cardiovascular segundo AHA/CDC. No contexto integrativo, PCR-us elevada orienta investigacao de causas inflamatorias (disbiose, permeabilidade intestinal, estresse oxidativo) e intervencoes anti-inflamatorias com omega-3, curcumina, resveratrol e ajustes dieteticos."
  },
  "HOMOCISTEINA": {
    objetiva: "Dosagem de homocisteina plasmatica para avaliacao de risco cardiovascular e funcao de metilacao.",
    narrativa: "A homocisteina e um aminoacido sulfurado cujos niveis elevados estao associados a risco cardiovascular, tromboembolismo, declinio cognitivo e defeitos do tubo neural, refletindo funcionalidade do ciclo de metilacao.",
    robusta: "Dosagem de homocisteina plasmatica como marcador funcional do ciclo de metilacao e fator de risco cardiovascular independente. Hiperhomocisteinemia (>10 umol/L ideal, >15 umol/L elevada) pode resultar de deficiencia de B12, folato, B6 ou polimorfismos MTHFR. No contexto integrativo, orienta suplementacao com metilfolato, metilcobalamina e P5P, alem de monitoramento da resposta terapeutica com dosagens seriadas."
  },
  "T4 LIVRE": {
    objetiva: "Dosagem de T4 livre para avaliacao da funcao tireoideana e disponibilidade de hormonio tireoidiano.",
    narrativa: "O T4 livre representa a fracao ativa e disponivel do hormonio tiroxina, sendo essencial para correlacao com TSH na avaliacao de hipo e hipertireoidismo manifesto e subclinico.",
    robusta: "Dosagem de tiroxina livre (T4L) como marcador da producao tireoideana e disponibilidade hormonal periferica. Interpretado em conjunto com TSH, permite classificar hipotireoidismo (TSH alto, T4L baixo), hipotireoidismo subclinico (TSH alto, T4L normal) e hipertireoidismo (TSH suprimido, T4L elevado). No contexto integrativo, avaliacao de T4L junto com T3 e rT3 permite identificar sindrome do T3 baixo e deficiencia de conversao periferica."
  },
  "T3 TOTAL": {
    objetiva: "Dosagem de T3 total para avaliacao da conversao periferica de hormonio tireoidiano.",
    narrativa: "O T3 e o hormonio tireoidiano metabolicamente ativo, e sua dosagem avalia a eficiencia da conversao de T4 em T3, processo dependente de selenio e zinco, frequentemente comprometido em estados inflamatorios e de estresse.",
    robusta: "Dosagem de triiodotironina total (T3) para avaliacao da conversao periferica de T4 em T3 mediada pela desiodase tipo 1 e 2. A sindrome do T3 baixo (euthyroid sick syndrome) e frequente em doenca critica, jejum prolongado e inflamacao cronica. No contexto integrativo, T3 baixo com T4 normal pode indicar deficiencia de selenio, zinco ou excesso de cortisol, orientando suplementacao de cofatores e manejo do estresse."
  },
  "ANTI TPO": {
    objetiva: "Dosagem de anticorpos anti-peroxidase tireoideana para investigacao de tireoidite autoimune.",
    narrativa: "O anti-TPO e o marcador mais sensivel de tireoidite de Hashimoto, sendo solicitado para investigacao de disfuncao tireoideana autoimune, frequentemente associada a fadiga, ganho de peso e outros sintomas sistemicos.",
    robusta: "Dosagem de anticorpos anti-peroxidase tireoideana (anti-TPO) como marcador de autoimunidade tireoideana. Presente em 90-95% dos casos de tireoidite de Hashimoto e 75% da doenca de Graves. Titulos elevados, mesmo com funcao tireoideana normal, indicam risco aumentado de progressao para hipotireoidismo. No contexto integrativo, positividade de anti-TPO orienta investigacao de gatilhos autoimunes (gluten, permeabilidade intestinal, deficiencia de selenio, vitamina D) e intervencoes imunomoduladoras."
  },
  "PSA TOTAL": {
    objetiva: "Dosagem de antigeno prostatico especifico para rastreio de neoplasia prostatica em homens.",
    narrativa: "O PSA total e solicitado para rastreio de cancer de prostata em homens acima de 50 anos (ou 45 anos em grupos de risco), devendo ser interpretado em contexto clinico com toque retal e, quando indicado, relacao PSA livre/total.",
    robusta: "Dosagem de antigeno prostatico especifico (PSA) total como ferramenta de rastreio de adenocarcinoma prostatico. Valores acima de 4 ng/mL requerem investigacao, porem o PSA pode elevar-se em hiperplasia prostatica benigna, prostatite e apos manipulacao prostatica. A relacao PSA livre/total <25% aumenta especificidade para neoplasia. No contexto integrativo, monitoramento seriado do PSA e correlacionado com fatores de risco modificaveis como inflamacao, obesidade e status hormonal."
  },
  "CORTISOL": {
    objetiva: "Dosagem de cortisol serico para avaliacao do eixo hipotalamo-hipofise-adrenal e estresse cronico.",
    narrativa: "O cortisol matinal e solicitado para avaliacao do eixo adrenal, sendo fundamental na investigacao de fadiga cronica, disturbios do sono, ansiedade e sindrome de burnout, condicoes frequentes na pratica integrativa.",
    robusta: "Dosagem de cortisol serico matinal (7-9h) como marcador da funcao do eixo hipotalamo-hipofise-adrenal (HHA). Valores matinais baixos podem indicar insuficiencia adrenal, enquanto valores cronicamente elevados sugerem hipercortisolismo funcional ou organico. No contexto integrativo, a avaliacao do cortisol orienta intervencoes com adaptogenos (ashwagandha, rhodiola), manejo do estresse, higiene do sono e, quando indicado, investigacao complementar com cortisol salivar em 4 pontos do dia."
  },
  "DHEA S": {
    objetiva: "Dosagem de DHEA-sulfato para avaliacao da funcao adrenal e reserva androgenica.",
    narrativa: "O DHEA-S e o androgeno adrenal mais abundante e marcador de reserva adrenal, declinando progressivamente com a idade. Niveis baixos estao associados a fadiga, perda de massa muscular e envelhecimento acelerado.",
    robusta: "Dosagem de dehidroepiandrosterona sulfato (DHEA-S) como principal marcador da funcao adrenal androgenica. O DHEA-S declina em media 2-3% ao ano apos os 30 anos, e niveis subotimos correlacionam-se com sarcopenia, osteoporose, disfuncao cognitiva e imunossenescencia. No contexto integrativo, valores abaixo do percentil 25 para idade orientam suplementacao com DHEA micronizada sob monitoramento, associada a avaliacao de testosterona, cortisol e perfil estrogenico."
  },
  "TESTOSTERONA TOTAL": {
    objetiva: "Dosagem de testosterona total para avaliacao do eixo gonadal e status androgenico.",
    narrativa: "A testosterona total e dosada para investigacao de hipogonadismo, declinio androgenico relacionado a idade, alteracoes de libido, massa muscular e composicao corporal em ambos os sexos.",
    robusta: "Dosagem de testosterona total serica como marcador do status androgenico. Em homens, valores abaixo de 300 ng/dL associados a sintomas configuram hipogonadismo. Em mulheres, elevacoes podem indicar SOP ou tumor produtor. A testosterona total deve ser interpretada com SHBG para calculo da testosterona livre biodisponivel. No contexto integrativo, orienta intervencoes para otimizacao androgenica incluindo exercicio resistido, manejo do estresse, zinco, vitamina D e, quando indicado, terapia de reposicao hormonal."
  },
  "ESTRADIOL": {
    objetiva: "Dosagem de estradiol para avaliacao do eixo gonadal feminino e status estrogenico.",
    narrativa: "O estradiol e o principal estrogeno biologicamente ativo, sendo dosado para avaliacao do ciclo menstrual, climatério, infertilidade e monitoramento de terapia de reposicao hormonal em mulheres.",
    robusta: "Dosagem de 17-beta-estradiol como principal estrogeno ovariano e marcador de funcao gonadal feminina. Valores variam conforme fase do ciclo menstrual. No climatério, niveis persistentemente baixos correlacionam-se com sintomas vasomotores, perda ossea acelerada e risco cardiovascular aumentado. No contexto integrativo, orienta prescricao de fitoestrogenios, moduladores seletivos de receptores de estrogenio naturais e, quando indicado, terapia de reposicao hormonal bioidentica."
  },
  "PROGESTERONA": {
    objetiva: "Dosagem de progesterona para avaliacao da funcao luteínica e ovulacao.",
    narrativa: "A progesterona e dosada na fase lutea para confirmacao de ovulacao e avaliacao da funcao do corpo luteo, sendo relevante na investigacao de infertilidade, TPM e sindrome de deficiencia de progesterona.",
    robusta: "Dosagem de progesterona serica como marcador de ovulacao (dosagem na fase lutea media, D21-23) e funcao do corpo luteo. Valores >3 ng/mL confirmam ovulacao. Deficiencia de progesterona esta associada a sindrome pre-menstrual, mastalgia, sangramento uterino anormal e infertilidade por fase lutea curta. No contexto integrativo, orienta uso de progesterona bioidentica, vitex agnus-castus e suporte nutricional para producao endogena (vitamina B6, magnesio, zinco)."
  },
  "SOMATOMEDINA C": {
    objetiva: "Dosagem de IGF-1 (somatomedina C) para avaliacao do eixo GH/IGF-1 e envelhecimento.",
    narrativa: "A somatomedina C (IGF-1) reflete a secrecao de hormonio do crescimento e e marcador de vitalidade biologica, com relevancia na avaliacao de sarcopenia, composicao corporal e longevidade saudavel.",
    robusta: "Dosagem de fator de crescimento insulina-simile tipo 1 (IGF-1/somatomedina C) como marcador indireto da secrecao de GH e mediador de seus efeitos anabolicos. Declinio de IGF-1 com a idade correlaciona-se com sarcopenia, osteoporose, aumento de gordura visceral e declinio cognitivo. No contexto integrativo, niveis subotimos orientam intervencoes para otimizacao de GH endogeno: exercicio intenso, sono adequado, jejum intermitente e, quando indicado, secretagogos de GH."
  },
};

function gerarJustificativaGenerica(nomeExame: string, modalidade: string, finalidade: string, bloco: string) {
  const nomeLower = nomeExame.toLowerCase();
  const modalLower = modalidade?.toLowerCase() || "laboratorial";
  const finalLower = finalidade?.toLowerCase() || "avaliacao clinica";
  const blocoClean = bloco?.replace("BLOCO ", "").toLowerCase() || "integrativa";

  const isImagem = ["imagem", "usg", "rm", "tc", "rx", "pet", "mamografia", "densitometria"].some(m => modalLower.includes(m));
  const isProcedimento = ["endoscopia", "colonoscopia", "broncoscopia", "cistoscopia", "histeroscopia", "anuscopia", "nasofibroscopia", "capsulaaendoscopica", "eletro", "holter", "mapa", "polissonografia", "teste ergometrico", "espirometria"].some(p => nomeLower.includes(p.toLowerCase()));

  let tipoExame = "laboratorial";
  if (isImagem) tipoExame = "de imagem";
  if (isProcedimento) tipoExame = "funcional/procedimento";

  const objetiva = `Solicitacao de ${nomeExame} para ${finalLower.toLowerCase()}, conforme protocolo do ${bloco} no contexto de avaliacao clinica integrativa.`;

  const narrativa = `Exame ${tipoExame} solicitado como parte da avaliacao sistematica do ${blocoClean}. ` +
    `O ${nomeExame} e necessario para complementar o raciocinio clinico, ` +
    `permitindo investigacao adequada dentro do escopo de ${finalLower.toLowerCase()}, ` +
    `com objetivo de subsidiar a tomada de decisao terapeutica e o plano de cuidado individualizado do paciente.`;

  const robusta = `Solicitacao fundamentada no protocolo de avaliacao ${blocoClean} do motor clinico integrativo. ` +
    `O exame ${nomeExame} (${tipoExame}) integra o bloco ${bloco} e tem como finalidade primaria a ${finalLower.toLowerCase()}. ` +
    `A realizacao deste exame e necessaria para composicao do perfil diagnostico completo, ` +
    `correlacao com dados clinicos da anamnese, estratificacao de risco e definicao de condutas terapeuticas baseadas em evidencias. ` +
    `O resultado sera utilizado para orientar intervencoes personalizadas dentro do plano de tratamento integrativo, ` +
    `incluindo ajustes de suplementacao, dietoterapia e monitoramento longitudinal da resposta terapeutica.`;

  return { objetiva, narrativa, robusta };
}

async function main() {
  console.log("Gerando justificativas unicas para todos os 220 exames...\n");

  const exames = await db.select().from(examesBaseTable);
  let atualizados = 0;
  let personalizados = 0;
  let genericos = 0;

  for (const exame of exames) {
    const custom = justificativasClinicas[exame.nomeExame];
    let just: { objetiva: string; narrativa: string; robusta: string };

    if (custom) {
      just = custom;
      personalizados++;
    } else {
      just = gerarJustificativaGenerica(
        exame.nomeExame,
        exame.modalidade || "LABORATORIAL",
        exame.finalidadePrincipal || "AVALIACAO CLINICA",
        exame.blocoOficial || "BLOCO INTEGRATIVO"
      );
      genericos++;
    }

    await db.update(examesBaseTable)
      .set({
        justificativaObjetiva: just.objetiva,
        justificativaNarrativa: just.narrativa,
        justificativaRobusta: just.robusta,
      })
      .where(eq(examesBaseTable.codigoExame, exame.codigoExame));

    atualizados++;
  }

  console.log(`Total atualizado: ${atualizados}`);
  console.log(`Justificativas personalizadas (clinicas detalhadas): ${personalizados}`);
  console.log(`Justificativas geradas (baseadas no bloco/modalidade): ${genericos}`);
  console.log("\nVerificando unicidade...");

  const check = await db.execute(
    `SELECT COUNT(DISTINCT justificativa_objetiva) as obj, COUNT(DISTINCT justificativa_narrativa) as nar, COUNT(DISTINCT justificativa_robusta) as rob FROM exames_base`
  );
  console.log("Justificativas unicas:", check);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
