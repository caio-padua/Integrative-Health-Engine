# Auditoria das sinapses: anamnese, fórmulas e exames

| Identificação da entrega | Informação |
|---|---|
| Responsável | Dr. Replit Pawards |
| Data da verificação | 23/11/2026, horário de Brasília |
| Ambiente | Código deste projeto e banco de desenvolvimento; produção não consultada. |
| Conclusão | Existe um motor determinístico de palavras-chave, com 37 regras ativas e 14 destinos distintos; o grafo antigo é demonstrativo e existem falhas importantes no encadeamento operacional. |
| Segurança da investigação | Consultas de leitura e execução isolada em memória; nenhuma anamnese, sugestão, prescrição ou regra real foi criada ou alterada. |
| Limite | Isto é uma auditoria de funcionamento do software, não homologação médica das indicações cadastradas. |

---

## 1. Links das telas e diferença entre desenho e funcionamento

| Tela | Link | Natureza e orientação |
|---|---|---|
| Grafo de Sinapses | [Abrir o grafo original][grafo] | Protótipo com dados demonstrativos; abertura confirmada visualmente nesta auditoria. |
| Craniotomia visual anterior | [Abrir a versão visual anterior][visual] | Outro componente demonstrativo; não confundir com a página operacional. |
| Matriz densa das sinapses | [Abrir a matriz demonstrativa][matriz] | Variante visual cadastrada na galeria; não representa consulta às regras reais. |
| Craniotomia operacional | [Abrir as regras reais][craniotomia] | Página ligada ao servidor; modos “PRANCHETA” e “TABELA”, botão “+ NOVA SINAPSE”. |
| Galeria de protótipos | [Abrir a galeria][galeria] | Índice das representações visuais anteriores. |
| Questionário mestre | [Abrir cadastro de perguntas][perguntas] | Cadastro de perguntas; não significa que todas sejam interpretadas pelo motor. |
| Lista de anamneses | [Abrir anamneses][anamneses] | Entrada para abrir a avaliação específica de uma pessoa. |
| Nova anamnese | [Abrir nova anamnese][nova] | Criação da avaliação; o preenchimento clínico continua no detalhe. |
| Validação Médica | [Abrir sugestões pendentes][validacao] | Destino comprovado das sugestões do motor; botões de aprovação e rejeição. |
| Itens terapêuticos | [Abrir itens utilizados pelo motor][itens] | Catálogo intermediário que o motor efetivamente consulta. |
| Catálogo clínico | [Abrir catálogo][catalogo] | Para fórmulas, clicar na aba “Formulas”; para exames, na aba “Exames”. |
| Cadastro de exames | [Abrir módulo de exames][exames] | Módulo correlato; não é a fila de sugestões. |
| Pedidos de exame | [Abrir pedidos][pedidos] | Não foi encontrada emissão automática de pedido na rota de aprovação da sugestão. |
| Protocolos | [Abrir protocolos][protocolos] | Cadastro separado; aprovar uma sugestão não cria um protocolo nessa rota. |
| Seletor de atendimento | [Abrir seletor][cockpit] | Permite escolher uma pessoa sem colocar identificadores reais neste documento. |
| Prescrição rápida | [Abrir prescrição rápida][prescricao] | Etapa correlata; não foi encontrada transferência automática pela rota de validação auditada. |
| Anamnese integrativa PADCOM | [Abrir formulário integrativo][padcom] | Fluxo distinto, por sessão, pontuação e bandas; não é o mesmo motor de 37 regras. |
| Administração PADCOM | [Abrir sessões integrativas][padcomadmin] | Administração do fluxo integrativo separado. |
| Painel PADCOM | [Abrir painel integrativo][padcomdashboard] | Acompanhamento do fluxo por bandas. |
| Governança PADCOM | [Abrir governança][padcomgovernanca] | Governança do fluxo integrativo; não confundir com a Craniotomia. |
| Entrada do sistema | [Abrir entrada][entrada] | Usar para autenticar antes das páginas clínicas. |

| Páginas que dependem do registro escolhido | Formato da rota | Como acessar sem inventar um registro |
|---|---|---|
| Detalhe da anamnese | `/anamnese/:id` | Abrir a lista de anamneses e selecionar a avaliação desejada; `:id` representa o número daquela avaliação. |
| Questionário longitudinal | `/pacientes/:id/questionario` | Abrir a pessoa pelo seletor; é outro armazenamento de respostas. |
| Atendimento da pessoa | `/pacientes/:id/cockpit` | Escolher a pessoa em “Seletor de atendimento”. |
| Detalhe da sessão integrativa | `/padcom-admin/:sessaoId` | Abrir uma sessão em “Administração PADCOM”. |

1.1. Correção do endereço enviado anteriormente: `/mockup-canvas/craniotomia/GrafoSinapses` apresentou “404 Page Not Found” na captura.

1.2. O endereço confirmado do desenho antigo é `/__mockup/preview/craniotomia/GrafoSinapses`.

1.3. A Craniotomia operacional abriu, mas o navegador de captura não estava autenticado e recebeu “401 Unauthorized”, isto é, acesso não autorizado por ausência de autenticação.

1.4. Nessa condição, os contadores da tela apareceram zerados junto de “Falha ao ler as regras e o catálogo do motor”; esses zeros não representam ausência de regras no banco.

1.5. Os demais endereços foram localizados nas rotas ou no catálogo de componentes; não houve navegação autenticada completa por todas as páginas.

1.6. Estes são endereços de desenvolvimento informados pelo ambiente, não endereços de produção.

---

## 2. Inventário real encontrado no banco

| Estrutura | Quantidade observada | Papel confirmado |
|---|---:|---|
| `regras_motor` | 37 registros, todos ativos | Fonte efetivamente consultada na ativação da anamnese. |
| Famílias distintas de regras | 14 | Agrupam os 37 sinônimos ou gatilhos pelos identificadores cadastrados. |
| Destinos distintos das regras | 14 | Oito painéis de exames, três fórmulas, dois injetáveis e um protocolo. |
| Regras de exame | 22 | São gatilhos, não 22 exames individuais. |
| Regras de fórmula | 7 | São gatilhos para três fórmulas distintas. |
| Regras de injetável | 5 | São gatilhos para dois itens distintos. |
| Regras de protocolo | 3 | Apontam para um único protocolo. |
| Regras de implante | 0 | O filtro de aceite existe, mas não há regra ativa desse segmento neste conjunto. |
| `questionario_master` | 19 registros | Inclui dois registros diferentes com o identificador Q030. |
| `itens_terapeuticos` | 457 registros | Catálogo intermediário consultado pelo motor. |
| `motor_decisao_clinica` | 19 registros | Mapa mais rico, consultável no catálogo, mas não consumido pela ativação auditada. |
| `mapa_anamnese_motor` | 19 registros | Mapa pergunta → doença/eixo → vários destinos; não consumido pela ativação auditada. |
| `mapa_bloco_exame` | 409 registros | Relações de blocos e exames; não percorridas pela ativação auditada. |
| `sugestoes_clinicas` | 31 registros | Saída persistida: 29 pendentes e duas validadas no momento da consulta. |

2.1. Os 14 códigos de destino têm, cada um, um item correspondente disponível neste banco.

2.2. Portanto, não encontrei destino inexistente entre essas 37 regras; os problemas de referência mais ricos estão em outro conjunto de mapas.

2.3. A existência de 31 sugestões comprova registros armazenados, mas não prova que o botão atual do navegador funciona nem comprova quem as gerou.

---

## 3. Como a interação efetivamente acontece

| Etapa | Entrada → processamento → saída | Observação de auditoria |
|---|---|---|
| 1. Abrir a avaliação | Lista de anamneses → detalhe de uma anamnese | O questionário da pessoa é outro fluxo. |
| 2. Salvar | Formulário → respostas clínicas, preferências e financeiras na anamnese | O salvamento marca a anamnese como `concluida`. |
| 3. Pedir ativação | Botão “Ativar Motor Pawards” → rota `/api/anamnese/:id/ativar-motor` | Há incompatibilidade no argumento enviado pelo botão, detalhada adiante. |
| 4. Extrair sinais | Q010 + Q012 + Q013 + Q014 → lista única de textos | Perde-se a origem clínica do texto durante a comparação geral. |
| 5. Ler as regras | Banco → somente regras com `ativo = SIM` | Não há chamada a modelo de inteligência artificial nesta rota. |
| 6. Comparar | Cada sinal ↔ palavra-chave | A comparação aceita um texto contido no outro. |
| 7. Aplicar filtros | “Somente exames”, aceite de injetável, aceite de implante, perfil financeiro | A recusa de fórmula não é aplicada. |
| 8. Remover repetição local | Segmento + código do destino → primeira ocorrência | Só elimina repetição dentro daquela ativação. |
| 9. Resolver o item | Código do destino → primeiro item disponível com aquele código | A consulta não usa blocos e grades para expandir exames. |
| 10. Criar a sugestão | Regra + item → `sugestoes_clinicas` | Estado inicial: `pendente`. |
| 11. Marcar a anamnese | Sinais encontrados + horário do motor → anamnese concluída | Não equivale a prescrição nem execução clínica. |
| 12. Revisar | Fila “Validação Médica” → aprovar ou rejeitar | A rota altera o estado da sugestão, o responsável informado e o horário. |

3.1. A rota de ativação não recebe as respostas editadas no corpo da requisição: lê o que já está salvo no banco.

3.2. Portanto, editar campos e ativar sem salvar pode fazer o motor considerar respostas anteriores.

3.3. Na página atual, o botão só aparece se a anamnese estiver concluída e ainda não tiver horário de ativação.

---

## 4. Pergunta por pergunta: o que o motor lê

| Identificador | Pergunta ou campo | Uso efetivo na ativação |
|---|---|---|
| Q001 | Nome completo | Não é gatilho clínico. |
| Q002 | Cadastro de Pessoas Físicas | Não é gatilho clínico. |
| Q010 | Queixa principal | Converte o texto inteiro para maiúsculas e o adiciona aos sinais. |
| Q011 | Duração da queixa | Ignorada pelo motor auditado. |
| Q012 | Sintomas atuais | Cada sintoma selecionado vira um sinal. |
| Q013 | Doenças diagnosticadas | Cada nome vira um sinal; se houver objeto com nome e estado, apenas o nome é usado. |
| Q013_legacy | Compatibilidade com respostas antigas | Alternativa para o campo de doenças quando o valor principal é ausente ou falso; uma lista vazia não aciona essa alternativa. |
| Q014 | Histórico familiar | Cada condição vira um sinal igual aos sinais da própria pessoa. |
| Q015 | Cirurgias prévias | Ignorada. |
| Q016 | Internações prévias | Ignorada. |
| Q017 | Alergias ou intolerâncias | Ignorada; não bloqueia fórmula ou injetável nesta rota. |
| Q020 | Preferência de entrega terapêutica | Existe no cadastro mestre, mas não é lida por esta ativação. |
| Q021 | Aceita complemento endovenoso programado | Existe no cadastro mestre, mas não é lida por esta ativação. |
| Q030 nas preferências | Deseja somente exames | Se “SIM”, elimina todos os segmentos diferentes de exame. |
| Q030 no cadastro financeiro | Perfil financeiro | Identificador duplicado no cadastro; esta ativação não o usa para perfil financeiro. |
| Q031 | Aceita fórmula manipulada | É salva pela tela, mas não é lida pelo motor. |
| Q032 | Aceita protocolo injetável | É o valor realmente usado para autorizar o segmento injetável. |
| Q033 | Aceita implante | É lida, embora não existam regras ativas de implante neste conjunto. |
| Q040 | Modelo de investimento | Ignorada na seleção de sugestões. |
| Q041 | Conforto financeiro | “BASICO” bloqueia implantes e protocolos; os demais valores não recebem graduação própria. |

4.1. O texto da pergunta sozinho não define o efeito: é necessário conferir o campo que o código realmente lê.

---

## 5. Matriz completa dos gatilhos ativos

| Família cadastrada | Qualquer um destes textos pode disparar | Destino cadastrado | Código do destino | Prioridade |
|---|---|---|---|---|
| MRE001 | FADIGA; FRAQUEZA; CANSACO | Painel tireoide básico | `EXAM TIRE BASI 001` | Alta |
| MRE002 | HIPOTIREOIDISMO; HASHIMOTO; TIREOIDITE | Painel tireoide ampliado | `EXAM TIRE AMPL 001` | Alta |
| MRE004 | OBESIDADE; SOBREPESO; IMC ALTO — índice de massa corporal alto | Painel base integrativa | `EXAM BASE BASI 001` | Média |
| MRE005 | DIABETES; GLICEMIA; INSULINA | Painel glicêmico ampliado | `EXAM GLIC AMPL 001` | Alta |
| MRE006 | RESISTENCIA INSULINICA; GANHO DE PESO | Painel glicêmico básico | `EXAM GLIC BASI 001` | Alta |
| MRE007 | ARTRITE REUMATOIDE; AUTOIMUNE; LUPUS | Painel autoimune básico | `EXAM AUTO BASI 001` | Alta |
| MRE008 | DISLIPIDEMIA; TRIGLICERIDES; COLESTEROL ALTO | Painel lipídico básico | `EXAM LIPI BASI 001` | Alta |
| MRE009 | ALOPECIA; QUEDA DE CABELO | Painel gonadal básico | `EXAM GONA BASI 001` | Média |
| MRF001 | CANSACO; FADIGA | Fórmula metabólica mitocondrial | `FORM META MITO 001` | Média |
| MRF002 | RESISTENCIA INSULINICA; DIABETES; GANHO DE PESO | Fórmula modulação glicose insulina | `FORM GLIC INSU 001` | Alta |
| MRF003 | HASHIMOTO; HIPOTIREOIDISMO | Fórmula suporte tireoide modulação base | `FORM TIRE MODU 001` | Alta |
| MRI001 | DEFICIENCIA B12; ANEMIA; NEUROPATIA | Metilcobalamina | `INJE VITA METI 001` | Alta |
| MRI002 | IMUNIDADE BAIXA; INFECCOES RECORRENTES | Vitamina C, ácido ascórbico | `INJE IMUN VITA 001` | Média |
| MRP001 | AVALIACAO COMPLETA; LONGEVIDADE; PREVENTIVO | Protocolo metabólico base | `PROC META BASE 001` | Média |

5.1. As letras e números da primeira coluna são os identificadores já cadastrados das regras, não novas siglas clínicas.

5.2. Os textos entre crases são códigos de catálogo; foram preservados exatamente para permitir conferência.

5.3. Esses textos podem vir da queixa, dos sintomas, das doenças ou do histórico familiar; o motor não mantém a separação na comparação geral.

5.4. Para MRI001 e MRI002, o aceite de injetáveis precisa ser “SIM” em Q032.

5.5. Para MRP001, Q041 não pode ser “BASICO”; “somente exames” também bloqueia o protocolo.

5.6. A família MRE003 não aparece no conjunto observado; não presumi que foi apagada nem inventei seu conteúdo.

---

## 6. Exemplos reproduzidos: qual resposta produz o quê

| Resposta sintética utilizada | Resultado observado na execução isolada |
|---|---|
| Q012 = FADIGA | Painel tireoide básico + fórmula metabólica mitocondrial. |
| Q010 = NEGA FADIGA | Os mesmos dois destinos; o motor não interpreta a negação. |
| Q014 = DIABETES, somente no histórico familiar | Painel glicêmico ampliado + fórmula de modulação glicose insulina. |
| Q012 = FADIGA e Q031 = NAO | A fórmula continua sendo sugerida, apesar da recusa. |
| Q012 = FADIGA e Q030 = SIM | Somente painel tireoide básico. |
| Q010 = ANEMIA e Q032 = NAO | Nenhum injetável; entra o painel base como alternativa. |
| Q010 = ANEMIA e Q032 = SIM | Metilcobalamina. |
| Q010 = IMUNIDADE BAIXA e Q032 = SIM | Vitamina C. |
| Q012 = ANSIEDADE | Nenhuma regra específica; painel base como alternativa. |
| Q010 = LUPUS | Painel autoimune básico. |
| Q010 = LÚPUS | Não reconhece essa palavra acentuada; painel base como alternativa. |
| Q010 = FAD | Reconhece como trecho de FADIGA; painel tireoide básico + fórmula mitocondrial. |
| Q013 contém nome DIABETES e estado NEGADO | Ainda gera painel glicêmico ampliado + fórmula; o estado não é avaliado. |
| FADIGA e texto de alergia em Q017 | Mantém as mesmas duas sugestões; não consulta Q017 para contraindicações. |
| FADIGA + HIPOTIREOIDISMO | Painel tireoide básico + painel tireoide ampliado + duas fórmulas; não escolhe automaticamente apenas o painel mais profundo. |
| LONGEVIDADE e perfil BASICO | Protocolo bloqueado; painel base como alternativa. |
| LONGEVIDADE e perfil INTERMEDIARIO | Protocolo metabólico base. |
| Nenhuma resposta clínica | Painel base, quando disponível no catálogo. |
| FADIGA, primeira ativação | Duas sugestões gravadas na memória de teste. |
| Mesma anamnese, segunda ativação | Mais duas sugestões; acumulado de quatro, sem bloqueio de repetição no servidor. |

6.1. Foram conferidos 20 cenários do manipulador atual da rota, executado em memória com as 37 regras e 14 destinos consultados.

6.2. Os casos são sintéticos e servem para demonstrar comportamento, não para recomendar conduta clínica.

6.3. O teste não acessou pessoas reais, não fez requisições de escrita ao servidor e não substitui um teste autenticado completo no navegador.

---

## 7. A comparação textual exata

| Aspecto | Funcionamento atual | Consequência |
|---|---|---|
| Maiúsculas e minúsculas | Converte textos para maiúsculas. | “fadiga” e “FADIGA” podem casar. |
| Acentos | Não remove acentos. | “LÚPUS” e “LUPUS” podem produzir resultados diferentes. |
| Palavra inteira | Não exige limite de palavra. | Trechos curtos podem disparar indicações. |
| Comparação bidirecional | Sinal contém palavra-chave OU palavra-chave contém sinal. | “FAD” reconhece “FADIGA”. |
| Negação | Não identifica “nega”, “não tem”, “sem” ou equivalentes. | “NEGA FADIGA” ainda dispara. |
| Sujeito | Não distingue pessoa, familiar ou hipótese na lista geral. | Histórico familiar pode gerar indicação terapêutica da própria pessoa. |
| Estado da doença | No objeto estruturado usa somente `nome`. | Estado diferente de doença confirmada não impede gatilho. |
| Identificador da pergunta | Na comparação geral não restringe o sinal à pergunta da regra. | Uma palavra de outra pergunta pode ativar a regra. |
| Prioridade | É copiada da regra, não calculada pelos sintomas. | Não há escore individual de gravidade nessa etapa. |

7.1. A expressão central é `sinal.includes(palavraChave) || palavraChave.includes(sinal)`, isto é, “um texto está contido no outro”.

7.2. Não foi encontrado processamento de linguagem clínica que interprete causalidade, negação, temporalidade ou contraindicação nessa rota.

---

## 8. Os filtros de preferência e dinheiro

| Campo | Valor ausente no servidor | Efeito real |
|---|---|---|
| Q030: somente exames | “NAO” | Quando “SIM”, mantém apenas exames. |
| Q031: aceita fórmula | Não é lido | A recusa não impede fórmula. |
| Q032: aceita injetável | “NAO” | Quando não é exatamente “SIM” após converter para maiúsculas, bloqueia injetáveis. |
| Q033: aceita implante | “NAO” | Bloqueia implante sem aceite; sem efeito concreto nas 37 regras atuais porque não há regra desse segmento. |
| Q041: perfil financeiro | “BASICO” | Bloqueia implante e protocolo somente quando igual a “BASICO”. |
| Q040: modelo de investimento | Não é lido | Não altera a seleção. |

8.1. A tela usa valores iniciais diferentes em alguns campos: aceite de injetáveis “SIM” e perfil “INTERMEDIARIO”, enquanto o servidor usa “NAO” e “BASICO” se não houver valor salvo.

8.2. Valores financeiros diferentes de “BASICO” não passam por uma escala de orçamento ou custo nessa seleção.

8.3. Existe um erro latente de identificação: a rotina de correspondência especial associa Q031 ao aceite de injetáveis, apesar de o questionário apresentar injetáveis em Q032.

8.4. A rotina também acrescenta o sinal textual `Q031_SIM` quando Q032 é “SIM”.

8.5. Essas duas inconsistências não explicam gatilhos adicionais nas 37 regras observadas, porque todas usam identificadores diferentes de Q030, Q031 e Q033.

---

## 9. Blocos, grades e gravidade: o que existe e o que não acontece

| Expectativa | Evidência no funcionamento auditado |
|---|---|
| Uma doença abre todos os exames do bloco | A ativação não consulta `mapa_bloco_exame`; seleciona um item por código. |
| Gravidade aumenta a grade | Não há cálculo de gravidade por bloco nessa ativação. |
| Grade ampliada substitui grade básica | Não há hierarquia entre os códigos; básico e ampliado podem coexistir. |
| `bloco_referencia` controla a expansão | O campo é cadastrado, mas não é lido para montar sugestões nessa rota. |
| O catálogo do item tem bloco e grau | Esses dados existem, mas não são usados para expandir a seleção na ativação. |
| Código da nomenclatura nova orienta o motor | `codigo_referencia_v4` está vazio nas 37 regras e não é lido pela ativação. |
| Tudo do grafo é executável | O grafo antigo importa uma lista estática de demonstração. |

9.1. Um item chamado “Painel tireoide ampliado” não prova que o motor expandiu os exames integrantes desse painel.

9.2. A rota apenas cria uma sugestão com aquele nome e vínculo de item, quando disponível.

9.3. Os documentos históricos descrevem um motor mais amplo por blocos e gravidade, mas a intenção documentada não equivale à implementação dessa ativação.

---

## 10. Os mapas mais ricos: 19 relações que não alimentam esta ativação

| Pergunta no mapa | Gatilho | Fórmula indicada no mapa | Outros vínculos cadastrados |
|---|---|---|---|
| Q012 | FADIGA | `FORM MITO SUPO 001`, nome “NAO ENCONTRADO” | Exame, acetil L-carnitina e protocolo de fadiga. |
| Q012 | CONSTIPACAO | Fórmula intestino reparação fase 1 | Exame intestinal e protocolo de reparação. |
| Q013 | HIPOTIREOIDISMO | Fórmula suporte tireoide modulação base | Exame anti-tireoglobulina e protocolo tireoidiano. |
| Q010 | GANHO DE PESO | Fórmula suporte metabólico | Exame, acetil L-carnitina, implante de naltrexona e protocolo. |
| Q010 | COMPULSAO ALIMENTAR | Fórmula foco e desempenho cognitivo | Exame, ácido gama-aminobutírico injetável, implante de naltrexona e protocolo. |
| Q013 | ENDOMETRIOSE | `FORM GINE ENDO 001`, nome “NAO ENCONTRADO” | Exame, implante de gestrinona e protocolo. |
| Q013 | MENOPAUSA | `FORM GINE MENO 001`, nome “NAO ENCONTRADO” | Exame hormonal e protocolo. |
| Q013 | SINDROME DO OVARIO POLICISTICO | `FORM GINE SOPC 001`, nome “NAO ENCONTRADO” | Exame hormonal e protocolo. |
| Q013 | TDAH — transtorno de déficit de atenção e hiperatividade | Fórmula foco e desempenho cognitivo | Exame e protocolo de foco. |
| Q012 | OBESIDADE | Fórmula suporte metabólico | Exame, acetil L-carnitina, implante de testosterona e protocolo. |
| Q012 | RESISTENCIA INSULINICA | Fórmula suporte metabólico | Exame, acetil L-carnitina, implante de metformina e protocolo. |
| Q012 | ENDOMETRIOSE | Fórmula modulação hormonal base | Exame, progesterona, implante de gestrinona e protocolo. |
| Q012 | MENOPAUSA | Fórmula modulação hormonal base | Exame, progesterona, implante de estradiol e protocolo. |
| Q012 | TDAH — transtorno de déficit de atenção e hiperatividade | Fórmula foco e desempenho cognitivo | Exame, 5-hidroxitriptofano injetável e protocolo. |
| Q012 | ANSIEDADE | Fórmula modulação ansiedade base | Exame, 5-hidroxitriptofano injetável e protocolo. |
| Q012 | HIPOTIREOIDISMO | Fórmula suporte tireoide modulação base | Exame, ácido alfa-lipoico e protocolo hormonal. |
| Q012 | ALOPECIA | Fórmula suporte capilar base | Exame, combinação vitamínica e protocolo capilar. |
| Q012 | LIPOEDEMA | Fórmula drenagem e modulação inflamatória | Exame, acetil L-carnitina e protocolo de lipoedema. |
| Q012 | INSÔNIA | Fórmula sono e recuperação | Exame, 5-hidroxitriptofano injetável e protocolo de sono. |

10.1. A tabela representa o que está cadastrado no mapa, não o que o motor atual dispara nem uma recomendação médica.

10.2. O mapa de decisão clínica tem também 19 casos, com os mesmos temas gerais e campos de múltiplos destinos.

10.3. A busca pelas referências dessas tabelas encontrou leitura e manutenção no catálogo e carga inicial, mas não consumo na rota de ativação da anamnese.

10.4. Portanto, “ANSIEDADE” possuir fórmula no mapa não faz essa fórmula aparecer automaticamente no motor das 37 regras.

10.5. Há nomes literais “NAO ENCONTRADO” e associações que precisam de reconferência de catálogo e homologação médica antes de qualquer conexão operacional.

10.6. Não recomendo ligar esses mapas diretamente sem essa reconferência.

---

## 11. Onde as sugestões aparecem e o que aprovar realmente faz

| Ponto | Funcionamento confirmado |
|---|---|
| Armazenamento | A constante do código `sugestoesTable` grava na tabela física `sugestoes_clinicas`; não são dois motores distintos. |
| Estado inicial | `pendente`, definido no esquema da tabela. |
| Detalhe da anamnese | Consulta sugestões da pessoa e filtra pelo identificador da anamnese no navegador. |
| Validação Médica | Consulta sugestões com estado pendente. |
| Aprovar | Altera o estado para `validado`, registra responsável informado, observação e horário. |
| Rejeitar | Altera o estado para `rejeitado`, com os mesmos campos de registro. |
| Pedido de exame | Não é criado pela rota de validação auditada. |
| Prescrição | Não é criada pela rota de validação auditada. |
| Protocolo executável | Não é criado pela rota de validação auditada. |
| Reavaliação de interações | Não há consulta a alergias, medicamentos em uso ou contraindicações nessa rota de aprovação. |

11.1. A busca pelas referências da tabela de sugestões no servidor encontrou anamnese, motor clínico, painel e carga inicial; não foi encontrada ponte automática dessa tabela para prescrição ou pedido na cadeia auditada.

11.2. Isso não significa que não exista prescrição ou emissão de pedido no produto; significa que essa aprovação não realiza a transferência.

---

## 12. Falhas e riscos encontrados, por impacto

| Ordem | Achado | Evidência e consequência |
|---|---|---|
| 1 | Botão de ativação incompatível com a função cliente | A página envia `{ data: { anamneseId: id } }`, mas a função espera `{ id }`; a composição local produz `/api/anamnese/undefined/ativar-motor`. |
| 2 | Recusa de fórmula não respeitada | Q031 não é lida; cenário sintético com recusa manteve a sugestão de fórmula. |
| 3 | Histórico familiar tratado como sinal terapêutico direto | DIABETES em Q014 gerou também fórmula da pessoa no teste isolado. |
| 4 | Negação não interpretada | “NEGA FADIGA” gerou as mesmas sugestões de fadiga. |
| 5 | Alergias não consideradas | Q017 não participa da ativação nem da aprovação auditada. |
| 6 | 37 regras sem pergunta cadastrada correspondente | `pergunta_id` contém valores como MRE001 e MRF001, não Q010 ou Q012; as 37 referências falham no confronto com `questionario_master`. |
| 7 | Origem da resposta não restringe o gatilho | A comparação geral usa todos os sinais juntos, independentemente da pergunta da regra. |
| 8 | Injetável com divergência de via | A observação de MRI002 descreve vitamina C endovenosa, mas seu item está categorizado como `injetavel_im`, isto é, intramuscular; essa categoria prevalece na saída. |
| 9 | Reativação acumula sugestões | Duas ativações consecutivas de fadiga produziram quatro registros no ambiente isolado. |
| 10 | Salvar e ativar são operações separadas | O motor lê o banco, não as alterações ainda não salvas no formulário. |
| 11 | Blocos e grades não são expandidos | Não há consulta ao mapa de 409 relações na ativação. |
| 12 | Mapas mais ricos desconectados | Os 19 vínculos de anamnese e 19 casos clínicos não são consultados pela ativação. |
| 13 | Diferença por acentuação e fragmentos | “LÚPUS” não casa com “LUPUS”; “FAD” casa com “FADIGA”. |
| 14 | Q030 duplicada | O mesmo identificador designa preferência por exames e perfil financeiro no cadastro mestre. |
| 15 | Identificação de Q031 e Q032 misturada | A correspondência especial e o sinal sintético usam Q031 para o aceite de injetável de Q032. |
| 16 | Alternativa genérica pode esconder falta de regra | Se nada for gerado, o painel base pode surgir mesmo quando não existe correspondência clínica específica. |
| 17 | Sem garantia atômica de gravação | Inserção de sugestões e atualização da anamnese são operações separadas, fora de uma transação conjunta nessa rota. |
| 18 | Sem versão completa da decisão | A justificativa guarda texto de regra, mas não uma versão imutável completa de respostas, catálogo, regra e motivo de cada bloqueio. |
| 19 | Aprovação sem autorização clínica específica nesta rota | Há autenticação geral, mas não foi encontrada exigência local de perfil médico ou permissão de validação. |
| 20 | Responsável da aprovação vem do corpo recebido | A rota utiliza `validadoPorId` enviado pelo cliente em vez de derivá-lo da identidade autenticada. |
| 21 | Isolamento por unidade insuficiente nas rotas auditadas | Listagens leem conjuntos sem filtro de unidade na consulta; detalhe, ativação e validação não verificam explicitamente vínculo com a unidade nessas rotas. |
| 22 | Sincronização do catálogo rompe vínculos antigos | A rotina existente anula os vínculos de item nas sugestões e recria o catálogo; não é uma simples atualização incremental. |
| 23 | Contagem visual pode ser enganosa sem sessão | A Craniotomia mostra zeros junto de erro de leitura quando não há autenticação. |
| 24 | Desenho antigo parece mais completo que o motor | O grafo exibiu 28 sinapses demonstrativas, enquanto o banco real tem 37 registros com outra estrutura. |

12.1. O achado do botão foi comprovado por inspeção da chamada e reprodução local da composição do endereço; não disparei a requisição de escrita contra uma anamnese real.

12.2. Os achados de autorização são de inspeção de código e composição das rotas; não realizei ataque nem tentativa de acesso entre unidades.

12.3. A rotina de sincronização destrutiva de catálogo foi apenas lida, não executada.

12.4. A escrita das regras globais na Craniotomia possui proteção adicional de proprietário da plataforma; não confundir essa proteção com a autorização de validar sugestões.

---

## 13. O que já acontecia antes: comparação histórica verificável

| Fonte ou momento | Resultado |
|---|---|
| Exportação local de 15/06/2026 | Contém 37 regras, 19 mapas de anamnese, 19 casos de decisão e 409 relações de blocos e exames. |
| Banco de desenvolvimento em 23/11/2026 | Mantém essas mesmas quantidades nos quatro conjuntos. |
| Comparação de regras | Os 37 registros coincidem nos oito campos operacionais comparados: identificador da regra, identificador da pergunta, palavra-chave, segmento, código de destino, bloco, prioridade e ativação. |
| Resultado da comparação | Nenhuma inclusão ou retirada nesses campos em relação à exportação consultada. |
| Limite histórico | Igualdade desses dados não prova disponibilidade contínua, funcionamento histórico de botões nem igualdade de produção. |
| Documentação anterior | Descreve evolução pretendida por blocos, gravidade e delegação; não deve substituir a verificação atual. |

13.1. Assim, é possível reconstruir os gatilhos que estavam cadastrados em 15/06/2026 sem inventar uma história de execução que não foi medida.

13.2. Não usei contagens antigas escritas em relatórios como prova do estado atual; recalculei os números no banco.

---

## 14. Os três fluxos de anamnese não são intercambiáveis

| Fluxo | Armazenamento e comportamento | Ligação com as 37 regras |
|---|---|---|
| Anamnese clínica tradicional | Respostas guardadas na anamnese; botão de ativação solicita sugestões. | É a origem diretamente lida pelo motor auditado. |
| Questionário longitudinal da pessoa | Usa `questionario_respostas` e registros de estado de saúde. | Nas rotas verificadas, não há transferência automática para a ativação da anamnese. |
| Anamnese integrativa PADCOM | Sessões, respostas com peso, soma de pontuações, bandas e governança própria. | É outro mecanismo; finalizar uma sessão não equivale a executar a rota de 37 regras. |

14.1. Na finalização PADCOM examinada, a pontuação é calculada pela soma dos pontos parciais dividida por quantidade de respostas vezes dez, convertida em percentual e comparada às bandas cadastradas.

14.2. Esse resumo não é uma auditoria completa de todas as ações posteriores do fluxo PADCOM; foi usado para não misturar mecanismos diferentes.

---

## 15. Evidências e limites de verificação

| Evidência | Localização no projeto | O que sustenta |
|---|---|---|
| Ativação e extração dos sinais | `artifacts/api-server/src/routes/anamnese.ts`, rota `POST /anamnese/:id/ativar-motor` | Comparação, filtros, alternativa genérica, gravação e marcação da anamnese. |
| Manutenção de regras e validação | `artifacts/api-server/src/routes/motorClinico.ts` | Craniotomia, catálogo intermediário e alteração de estado da sugestão. |
| Página de detalhe | `artifacts/clinica-motor/src/pages/anamnese/[id].tsx` | Campos, salvamento, condição do botão e argumento incorreto. |
| Contrato cliente | `lib/api-client-react/src/generated/api.ts`, função `getAtivarMotorClinicoMutationOptions` | Argumento esperado `{ id }`. |
| Página operacional das sinapses | `artifacts/clinica-motor/src/pages/craniotomia.tsx` e `craniotomia-loteamento.tsx` | Consulta às regras e aos itens, prancheta e edição persistente. |
| Grafo antigo | `artifacts/mockup-sandbox/src/components/mockups/craniotomia/GrafoSinapses.tsx` | Importação de dados de `_mockData`, isto é, dados demonstrativos. |
| Fila de aprovação | `artifacts/clinica-motor/src/pages/validacao/index.tsx` | Consulta das sugestões pendentes e ações de aprovação ou rejeição. |
| Catálogo rico | `artifacts/api-server/src/routes/catalogo.ts` | Acesso aos mapas e aos cadastros clínicos. |
| Questionário longitudinal | `artifacts/api-server/src/routes/questionarioPaciente.ts` | Armazenamento separado de respostas e estado de saúde. |
| Fluxo integrativo | `artifacts/api-server/src/routes/padcom.ts` | Sessões, pontuação e bandas. |
| Estado inicial da sugestão | `lib/db/src/schema/sugestoes.ts` | Tabela física e valor padrão `pendente`. |
| Histórico dos dados | `docs/dr-replit/PARA_MANAGER/motor_anamnese_sinapses_export_26.06.15.json` | Comparação com o cadastro histórico. |
| Reprodutor isolado | `.local/auditoria-sinapses/verificar.cjs` | Executa a rota atual em memória, sem banco ou rede. |
| Resultado dos cenários | `.local/auditoria-sinapses/resultados.json` | Vinte cenários e reprodução do endereço incorreto do botão. |
| Exportações da auditoria | `.local/auditoria-sinapses/` | Regras, perguntas e dois mapas em arquivos tabulares. |

| O que não foi realizado | Motivo ou limite |
|---|---|
| Alteração ou correção do sistema | O pedido foi de auditoria e links. |
| Consulta de produção | O ambiente auditado foi o desenvolvimento. |
| Disparo de prescrição, mensagem ou pedido | Não era necessário e produziria efeitos reais. |
| Navegação autenticada completa | Não foi necessária para comprovar os algoritmos e exigiria interação com dados clínicos. |
| Aprovação médica das indicações | Depende de revisão clínica, principalmente antes de conectar mapas desconectados. |
| Agentes paralelos | O trabalho foi executado em fila pelo agente principal. |

---

## 16. Sequência recomendada, sem execução automática

| Ordem | Correção ou decisão recomendada | Resultado esperado |
|---|---|---|
| 1 | Corrigir o argumento do botão e tornar explícita a exigência de salvar antes de ativar. | O acionamento aponta para a avaliação correta. |
| 2 | Respeitar recusa de fórmula, separar histórico familiar e tratar negações e contraindicações. | Reduzir sugestões indevidas antes de ampliar cobertura. |
| 3 | Fechar autorização clínica, identidade do validador e isolamento por unidade. | Cada operador acessa e decide somente no âmbito autorizado. |
| 4 | Impedir repetição de ativação e gravar decisão de forma atômica e versionada. | Repetir a solicitação não duplica sugestões nem deixa estados parciais. |
| 5 | Corrigir identificadores de perguntas, duplicidade Q030 e divergência de via do injetável. | Cadastro, tela e execução passam a usar o mesmo significado. |
| 6 | Homologar mapas e só então conectar blocos, grades, gravidade e saída para pedidos e prescrições. | Expandir o motor com rastreabilidade, não apenas com aparência de conexão. |

16.1. Esta sequência é recomendação da auditoria, não autorização para implementação nem criação de tarefas paralelas.

**RESUMO EM 1 LINHA:** O motor atual usa 37 gatilhos para 14 destinos, mas ignora parte do contexto clínico, não percorre blocos e grades e possui falhas entre preenchimento, ativação e validação.

[grafo]: https://2ef80136-fd8b-403c-a5cc-938820e2c326-00-2uutpqmzoo9c3.worf.replit.dev/__mockup/preview/craniotomia/GrafoSinapses
[visual]: https://2ef80136-fd8b-403c-a5cc-938820e2c326-00-2uutpqmzoo9c3.worf.replit.dev/__mockup/preview/craniotomia/CraniotomiaV4
[matriz]: https://2ef80136-fd8b-403c-a5cc-938820e2c326-00-2uutpqmzoo9c3.worf.replit.dev/__mockup/preview/craniotomia/MatrizDensa
[craniotomia]: https://2ef80136-fd8b-403c-a5cc-938820e2c326-00-2uutpqmzoo9c3.worf.replit.dev/craniotomia
[galeria]: https://2ef80136-fd8b-403c-a5cc-938820e2c326-00-2uutpqmzoo9c3.worf.replit.dev/galeria-mockups
[perguntas]: https://2ef80136-fd8b-403c-a5cc-938820e2c326-00-2uutpqmzoo9c3.worf.replit.dev/questionario-master
[anamneses]: https://2ef80136-fd8b-403c-a5cc-938820e2c326-00-2uutpqmzoo9c3.worf.replit.dev/anamnese
[nova]: https://2ef80136-fd8b-403c-a5cc-938820e2c326-00-2uutpqmzoo9c3.worf.replit.dev/anamnese/nova
[validacao]: https://2ef80136-fd8b-403c-a5cc-938820e2c326-00-2uutpqmzoo9c3.worf.replit.dev/validacao
[itens]: https://2ef80136-fd8b-403c-a5cc-938820e2c326-00-2uutpqmzoo9c3.worf.replit.dev/itens-terapeuticos
[catalogo]: https://2ef80136-fd8b-403c-a5cc-938820e2c326-00-2uutpqmzoo9c3.worf.replit.dev/catalogo
[exames]: https://2ef80136-fd8b-403c-a5cc-938820e2c326-00-2uutpqmzoo9c3.worf.replit.dev/exames
[pedidos]: https://2ef80136-fd8b-403c-a5cc-938820e2c326-00-2uutpqmzoo9c3.worf.replit.dev/pedidos-exame
[protocolos]: https://2ef80136-fd8b-403c-a5cc-938820e2c326-00-2uutpqmzoo9c3.worf.replit.dev/protocolos
[cockpit]: https://2ef80136-fd8b-403c-a5cc-938820e2c326-00-2uutpqmzoo9c3.worf.replit.dev/cockpit
[prescricao]: https://2ef80136-fd8b-403c-a5cc-938820e2c326-00-2uutpqmzoo9c3.worf.replit.dev/prescricao-rapida
[padcom]: https://2ef80136-fd8b-403c-a5cc-938820e2c326-00-2uutpqmzoo9c3.worf.replit.dev/padcom
[padcomadmin]: https://2ef80136-fd8b-403c-a5cc-938820e2c326-00-2uutpqmzoo9c3.worf.replit.dev/padcom-admin
[padcomdashboard]: https://2ef80136-fd8b-403c-a5cc-938820e2c326-00-2uutpqmzoo9c3.worf.replit.dev/padcom-admin/dashboard
[padcomgovernanca]: https://2ef80136-fd8b-403c-a5cc-938820e2c326-00-2uutpqmzoo9c3.worf.replit.dev/padcom-governanca
[entrada]: https://2ef80136-fd8b-403c-a5cc-938820e2c326-00-2uutpqmzoo9c3.worf.replit.dev/
