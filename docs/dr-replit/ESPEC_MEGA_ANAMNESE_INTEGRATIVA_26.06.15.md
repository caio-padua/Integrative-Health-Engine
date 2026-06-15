# ESPECIFICAÇÃO — MEGA ANAMNESE INTEGRATIVA PAWARDS (classe mundial)

- Autor: Dr. Replit Pawards (visão: programador sênior + medicina de hospital de ponta)
- Data: 15/06/2026
- A pedido de: CEO Dr. Caio
- Destino: subsídio único para Dr. Replit Manager e Dr. Claude desenharem em paralelo

> SIGLA EXPLICADA SEMPRE (regra do CEO):
> HMA = História da Moléstia Atual (a história da queixa).
> ISDA = Interrogatório Sintomatológico Dos Aparelhos (revisão de cada sistema do corpo).
> OPQRST = roteiro da dor/sintoma: Onset(início), Provoca/alivia, Qualidade,
> Região/irradiação, Severidade(intensidade 0-10), Tempo(evolução).
> PHQ-9 = Patient Health Questionnaire-9, rastreio de depressão (9 perguntas).
> GAD-7 = Generalized Anxiety Disorder-7, rastreio de ansiedade.
> AUDIT-C = teste curto de consumo de álcool (3 perguntas).
> CAGE = rastreio de alcoolismo (4 perguntas).
> Bristol = escala da forma das fezes (tipos 1 a 7).
> Epworth = escala de sonolência diurna.
> IPSS = escore internacional de sintomas da próstata.
> IFM = Institute for Functional Medicine (matriz da medicina funcional).
> maços-ano = (cigarros por dia dividido por 20) multiplicado pelos anos fumando.
> M:N = muitos-para-muitos. DB-driven = guardado no banco e editável (não cravado no código).

---

## CONCLUSÃO PRIMEIRO

A anamnese de hoje tem só 19 perguntas, rasa. Esta especificação amplia para uma
anamnese de classe mundial (modelo de grandes hospitais + medicina funcional),
organizada em 14 blocos, com escalas validadas, e — o mais importante — cada
pergunta vira GATILHO que liga a sintomas/doenças, aciona blocos de exame e
alimenta o escore de gravidade que aprofunda a grade (a lógica já travada na
CARTA_06). Tudo editável, nada cravado no código.

---

## 1. ESTADO ATUAL (conferido no banco, 15/06/2026) — anti-ectoplasma

| Item | Número | Observação |
| :--- | :--- | :--- |
| Perguntas em `questionario_master` | 19 | rasa |
| Blocos existentes | IDENTIFICACAO(2), CLINICO(8), PREFERENCIA(4), PREFERENCIAS(2), FINANCEIRO(3) | já há embrião de cirurgias/internações/alergias/familiar |
| anamneses preenchidas | 48 | REAL |
| questionario_respostas | 1 | quase vazio |

Dívidas a corrigir: blocos `PREFERENCIA` e `PREFERENCIAS` duplicados (typo);
`Q030` repetido em dois blocos. Regra do CEO: corrigir SEM dropar dado, só
ajustar/migrar.

Colunas atuais de `questionario_master`: `bloco`, `pergunta_id`, `pergunta`,
`tipo_resposta`, `obrigatorio`, `exemplo`, `observacao`, `aplicavel_em` (INICIAL/
ACOMPANHAMENTO).

---

## 2. ARQUITETURA DA MEGA ANAMNESE (14 blocos)

| Bloco | Conteúdo | Aciona no motor |
| :--- | :--- | :--- |
| A. Identificação e contexto | idade, sexo biológico, ancestralidade, profissão, escolaridade | farmacogenética; perfil de risco |
| B. Queixa principal + HMA | OPQRST, intensidade 0-10, evolução, tratamentos tentados | suspeita central |
| C. Revisão por sistemas (ISDA) | 13 aparelhos, um a um | mapeia sintomas → blocos |
| D. Antecedentes patológicos | doenças crônicas + CID + ano + controle | doença → bloco direto |
| E. Cirurgias e internações | datas, complicações, anestesia | risco peri-operatório |
| F. Alergias e reações adversas | medicamento/alimento/ambiental + tipo | segurança da prescrição |
| G. Medicações e suplementos em uso | alopáticos, fitoterápicos, doses, adesão | interações |
| H. Imunizações | calendário e reforços | prevenção |
| I. Hábitos e estilo de vida | tabagismo, etilismo, vícios, sono, dieta, atividade, estresse | grandes gatilhos de gravidade |
| J. História familiar (heredograma) | 1º grau: cardio, câncer, diabetes, autoimune, psiquiátrica, neuro | sobe grade de blocos hereditários |
| K. História psicossocial e ocupacional | trabalho/exposições, suporte, espiritualidade, segurança | eixo mente-corpo, tóxicos |
| L. Gineco-obstétrica / andrológica | ciclo, menopausa, gestações; próstata, função erétil | blocos gonadal/hormonal |
| M. Eixos da medicina funcional (IFM) | digestão, imunidade, energia, detox, hormônios, mente-corpo | correlação integrativa |
| N. Preferências terapêuticas e financeiras | entrega, fórmula/injetável/implante, investimento | já existe — manter |

---

## 3. BLOCO C — REVISÃO POR SISTEMAS (o coração da ampliação)

| Sistema | Exemplos de sintoma rastreado | Bloco de exame que aciona |
| :--- | :--- | :--- |
| Geral/constitucional | febre, perda de peso, sudorese noturna, fadiga | ALARME → marcadores cancerígenos |
| Pele e fâneros | queda de cabelo, unhas fracas, acne | tireoide, minerais/cofatores |
| Cabeça/olhos/ORL | cefaleia, zumbido, sinusite | neuro, inflamatório |
| Cardiovascular | dor torácica, palpitação, edema | lipídico cardiometabólico, cardio imagem |
| Respiratório | tosse, falta de ar, chiado | pulmonar, autoimune |
| Digestório | azia, constipação, diarreia, distensão | hepático, intestinal, absorção |
| Geniturinário | ardência, noctúria, alteração de urina | renal específico |
| Musculoesquelético | dor articular, rigidez, fraqueza | autoimune, vitaminas |
| Neurológico | tontura, formigamento, memória | neuro, metais tóxicos |
| Endócrino/metabólico | sede, ganho de peso, intolerância ao frio | glicêmico insulínico, tireoide, adrenal |
| Hematológico/linfático | palidez, hematomas, gânglios | trombose, marcadores |
| Psiquiátrico/humor | tristeza, ansiedade, insônia (PHQ-9, GAD-7) | adrenal, neuro |
| Reprodutor | libido, ciclo, função sexual | gonadal |

---

## 4. BLOCO I — HÁBITOS E VÍCIOS (o que o CEO enfatizou)

| Hábito | Como medir | Gatilho de gravidade |
| :--- | :--- | :--- |
| Tabagismo | status, maços-ano, anos, tentativas de parar | maços-ano alto → pulmonar + cardio + cancerígeno |
| Etilismo | tipo, dose semanal, AUDIT-C, CAGE | positivo → hepático + nutricional |
| Outras drogas/vícios | maconha, cocaína, cafeína, açúcar, jogo, telas | conforme o agente |
| Atividade física | tipo, frequência, sedentarismo | sedentário → cardiometabólico |
| Sono | horas, qualidade, ronco/apneia (Epworth) | apneia → cardio + metabólico |
| Alimentação | padrão, ultraprocessados, jejum, restrições | inflamatório, glicêmico |
| Estresse/saúde mental | percepção, sobrecarga | eixo adrenal/HPA |
| Exposição a tóxicos | ocupacional, metais, ambiental | metais tóxicos, detox |
| Função intestinal | escala de Bristol | intestinal, absorção |
| Saúde sexual | libido, função | gonadal/hormonal |

---

## 5. ESCALAS VALIDADAS A EMBUTIR

| Escala | Para quê |
| :--- | :--- |
| PHQ-9 | depressão |
| GAD-7 | ansiedade |
| AUDIT-C / CAGE | álcool |
| Epworth | sonolência/apneia |
| Bristol | função intestinal |
| IPSS | próstata (homem) |
| OPQRST | caracterizar a queixa |

Cada escala devolve um número → entra no escore de gravidade do bloco correlato.

---

## 6. AMARRAÇÃO AO MOTOR (como a anamnese vira exame)

Pergunta respondida
→ a resposta casa SINTOMA(s) e/ou DOENÇA(s) (amarração editável, ver CARTA_06 seção 7)
→ a doença/sintoma acende o(s) BLOCO(s) (via `doencas.bloco_motor`)
→ o peso da resposta + sinais de alarme somam o ESCORE DE GRAVIDADE por bloco
→ cada bloco abre na GRADE correspondente (básica → ampliada)
→ entram exames + fórmulas/injetáveis amarrados → fila AGUARDA_VALIDACAO
→ médico valida/recusa/delega (humano ou modo automático)

Exemplo: diabético, tabagista pesado, com perda de peso e história familiar de
câncer → acende glicêmico (sofisticada), lipídico (sofisticada), renal (ampliada
se já há sinal renal), pulmonar e marcadores cancerígenos (ampliada pelo alarme +
familiar).

---

## 7. MODELO DE DADOS (aditivo, nunca destrutivo — regra do CEO)

Ampliar `questionario_master` SEM dropar nada:

| Acréscimo | Função |
| :--- | :--- |
| coluna `sistema` | qual aparelho da revisão (bloco C) |
| coluna `escala_validada` | PHQ9/GAD7/AUDITC/etc, quando aplicável |
| coluna `peso_gravidade` | quanto a resposta pesa no escore |
| coluna `e_sinal_alarme` (boolean) | marca red flags |
| ligação M:N `pergunta_sintoma` | pergunta → sintoma(s) |
| ligação M:N `pergunta_doenca` | pergunta → doença(s) |

Tudo editável por clique (DB-driven). Enriquecer o catálogo `sintomas` (hoje só
10) e preencher os 229 itens órfãos de bloco/grade (ver CARTA_06).

---

## 8. O QUE PEÇO AOS DOIS AGENTES

1. Desenhem a SUA mega-anamnese a partir desta espinha (teste cego).
2. Devolvam: o conjunto de perguntas por bloco, as escalas, o modelo de dados, e
   como cada pergunta amarra a sintoma/doença/bloco/escore.
3. Digam, com sinceridade, o que é REAL, PARCIAL ou ECTOPLASMA do lado de vocês.
4. Ao terminar: Commit & Push + devolver a PROVA (URL raw + hash).

RESUMO EM 1 LINHA: esta espinha transforma 19 perguntas rasas numa anamnese de
classe mundial em 14 blocos com escalas validadas, onde cada resposta acende
blocos de exame e gradua a profundidade pela gravidade, tudo editável e ligado ao
motor já travado na CARTA_06.
