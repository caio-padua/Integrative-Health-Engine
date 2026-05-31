# Receita injetável — Apresentação (cadastro) vs Dose por aplicação (editável)

Data: 31/05/2026
Tela: prescrição rápida · GpsPadua ("GPS CLÍNICO")
Persona: 🩺 médico (posologia correta) + 💰 CEO (orçamento por ampola)

## 1. Problema relatado pelo Caio

1.1. O campo de cima "QTD · POR APLICAÇÃO" estava **editável** e mostrava "1 frasco".

1.2. Se o médico trocava pra "2 frascos", a posologia mudava de forma errada.

1.3. Esse campo de cima **não deve ser editável** — ele descreve a **apresentação**
do produto (dado de cadastro), ex: "500 mg/mL = 1 dose = 1 ampola 2 mL".

1.4. O que o médico edita de verdade é a **dose por aplicação** = nº de ampolas
(1 ou 2), e isso **deve** mudar posologia, quantidade total e orçamento.

1.5. Regra de negócio: o **preço é por ampola** — logo 2 doses = 2 ampolas = 2× preço.

## 2. Decisão tomada (default A, aplicada)

2.1. Separei dois conceitos no modelo `Substancia` (aditivo, sem remover nada):

2.2. `apresentacao?: string` — texto **read-only** do cadastro (descreve a ampola).

2.3. `dosePorAplicacao?: number` — **editável** no cockpit, default 1 (nº de ampolas).

2.4. O campo `quantidade` foi mantido, agora servindo **só como fonte da unidade**
(ampola / frasco / aplicação) — não é mais editado no card do injetável.

## 3. Comportamento novo no card do injetável

3.1. Campo "MG · FIXO DA FÓRMULA" — read-only (concentração de fábrica).

3.2. Campo "DOSE · POR APLICAÇÃO" — input numérico editável (1, 2, ...).

3.3. Campo "APRESENTAÇÃO · CADASTRO" — read-only, em linha própria.

3.4. Posologia: "Aplicar **2 ampolas** IM — Início da Manhã" (plural automático).

3.5. Rodapé: "Quantidade: **12 ampolas**" (= sessões × dose), "Sessões: 6", "Frequência".

3.6. Orçamento: "12× R$ 235,00" e total = preço × sessões × dose (preço por ampola).

## 4. Onde mexeu (referência)

4.1. `_tokens.ts` — 2 campos novos em `Substancia` + preenchidos nos 3 injetáveis demo.

4.2. `GpsPadua.tsx` — helpers `ampolasPorAplicacao` / `unidadesCobranca` / `custoTotal`;
posologia, rodapé, render dos campos e 5 pontos de orçamento.

## 5. Status

5.1. Implementado e com typecheck verde em 31/05/2026.

5.2. Demo: NAD+ (frasco), CoQ10 (ampola), Semaglutida (aplicação) com dose default 1.
