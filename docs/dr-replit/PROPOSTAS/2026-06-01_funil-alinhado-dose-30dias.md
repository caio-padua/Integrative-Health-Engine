# Proposta — Funil alinhado, regra DOSE e preço por 30 dias

Data: 01/06/2026
Componente: prescricao-rapida/GpsPadua.tsx + _tokens.ts
Origem: pedido Caio 01/06 (mensagem única, várias frentes).

## 1. Funil de categorias alinhado (painel + ADICIONAR)

1.1. Problema: os chips de categoria quebram de linha de forma irregular (flex-wrap).

1.2. Decisão (A, default): grid fixo de 3 colunas, todos os chips na mesma largura, encostados numa linha vertical à esquerda.

1.3. Andares de 3 categorias relacionadas por linha (ordem por função agrupa afins).

1.4. Dois botões de ordenação: FUNÇÃO (ordem canônica por afinidade, default) e A–Z (alfabética).

1.5. Botão TODAS continua como reset.

## 2. Sem dropdown em DOSES, SESSÕES e FREQUÊNCIA

2.1. DOSES e SESSÕES já são campos numéricos (mantидos).

2.2. FREQUÊNCIA do SC perde o datalist e vira texto livre puro, igual IM/EV.

## 3. Apresentação do injetável em 3 retângulos

3.1. Retângulo 1: a quantidade por recipiente (ex: "500 mg/frasco").

3.2. Retângulo 2: recipiente + volume (ex: "Frasco = 10 mL"); recipiente lido do denominador.

3.3. Retângulo 3: concentração calculada (ex: "50 mg/mL").

3.4. Caneta (sem mL): cai de pé mostrando os fatos disponíveis, sem forçar volume/concentração.

## 4. Regra DOSE (nunca cápsula/comprimido) nas fórmulas VO

4.1. Campos dose/quantidade das fórmulas VO trocam "cáps" por "dose" (cadastro + placeholder).

4.2. Descritivo do card da fórmula passa a ser: "1 dose = N substâncias ou ativos" (texto literal).

4.3. Nota no cockpit da fórmula VO, logo abaixo: "1 (uma) dose pode ser composta por 2 (duas) ou mais cápsulas, pois os componentes da fórmula nem sempre cabem em uma única cápsula."

## 5. Preço da fórmula = tratamento de 30 dias atrelado à posologia

5.1. Problema: custo VO usava preço × sessões (380 × 30 = R$ 11.400), errado.

5.2. Decisão (A, default): o preço cadastrado é o valor de um tratamento de 30 dias na posologia padrão.

5.3. Novo campo semântico `dosesDiaPadrao` no cadastro VO = doses/dia da posologia padrão à qual o preço se refere.

5.4. Fórmula do custo VO:
`custo = preco × (dosesPorDia_atual / dosesDiaPadrao) × (diasTratamento / 30)`
com `diasTratamento = duração em dias` (contínuo/vazio = 30).

5.5. Na posologia padrão e 30 dias, o custo é exatamente o preço cadastrado.

5.6. Editar tomadas/dia ou duração no cockpit reescala proporcionalmente.

5.7. Quebra por item passa a mostrar "N dias · M doses/dia" em vez de "30× R$".

## 6. Fora de escopo

6.1. IMP/PRC mantêm preço × sessões (implante/consulta não são por 30 dias).
