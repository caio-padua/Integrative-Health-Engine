# Card injetável · apresentação em retângulos + concentração calculada

> Data: 01/06/2026
> Componente: `artifacts/mockup-sandbox/src/components/mockups/prescricao-rapida/GpsPadua.tsx`
> Tokens: `.../prescricao-rapida/_tokens.ts`
> Origem: pedido verbal Caio (mockup GPS CLÍNICO, paciente mock Graco Souza Pádua)

## 1. Contexto

1.1. O topo do card injetável tinha 3 campos: **MG · FIXO DA FÓRMULA**, **DOSE · POR APLICAÇÃO** e **APRESENTAÇÃO**.

1.2. Caio pediu que o topo fique **só com a apresentação**.

1.3. A dose por aplicação (nº de ampolas) agora vem do campo **DOSES** da tomada (ao lado de horário/período).

1.4. Caio perguntou: **"cadê o cálculo de mg/mL?"** — a concentração estava **digitada** (fixa), não calculada.

## 2. Decisão tomada (default aplicado)

2.1. Topo do injetável = **só APRESENTAÇÃO**, renderizada em **retângulos** (1 fato por retângulo).

2.2. Cadastro guarda **só os dois fatos de origem**: quantidade por frasco/ampola + volume em mL.
- Ex: `500 mg/frasco · 10 mL`.

2.3. A **concentração (mg/mL) é CALCULADA** (mg ÷ mL), não digitada.
- Mostrada num retângulo **destacado** (borda sólida colorida + `=`), ex: `= 50 mg/mL`.
- Tooltip mostra a fórmula auditável: `500 mg ÷ 10 mL = 50 mg/mL`.
- Sem mL (ex: caneta multidose da semaglutida) → **não** mostra retângulo de concentração.

2.4. A dose por aplicação multiplica posologia + quantidade total + orçamento, lendo de `dosesPorDia(s)` (campo DOSES da tomada). O campo `dosePorAplicacao` foi removido.

2.5. Rodapé do injetável: rótulo **continua "Sessões"** (mantém correspondência com o campo SESSÕES do card); a palavra "aplicações" vai no **valor** → **"Sessões: 6 aplicações"** (correção Caio 01/06).

2.6. Consulta/avaliação (PRC) no 3º andar: linha dedicada
- `2 consultas / avaliação com duração de 60 min · a cada 30 dias`.

## 3. Valores aplicados (mock)

| Ativo | Cadastro | Concentração calculada |
| --- | --- | --- |
| NAD+ Endovenoso | 500 mg/frasco · 10 mL | = 50 mg/mL |
| CoQ10 Ubiquinol + PQQ | 120 mg/ampola · 2 mL | = 60 mg/mL |
| Semaglutida 0,5 mg | 0,5 mg/dose · caneta multidose · 1 aplicação | — (sem mL) |

## 4. Status

4.1. Aplicado no mockup. Typecheck verde.

4.2. **Pendente decisão Caio:** caneta multidose (SC) não tem mg/mL único — manter sem concentração (default) ou exibir mg/dose como concentração?
