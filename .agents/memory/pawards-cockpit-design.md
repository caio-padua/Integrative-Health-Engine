---
name: Pawards cockpit design
description: Princípios duráveis do sistema visual do cockpit Pawards
---

## Por que existe esse cockpit
CEO Caio é Asperger + TDAH + TOC. O design visual NÃO é estético — é cognitivo.
Toda decisão abaixo existe pra reduzir dispersão e custo de leitura num turno
de 12h. Quando em dúvida sobre uma mudança visual, perguntar: "isso reduz
ou aumenta carga cognitiva pra alguém com TDAH?".

## Regras inegociáveis (com motivo)
- **Zero emojis em UI/código/commits.** CEO rejeita visualmente; mistura
  tipográfica quebra a leitura monoespaçada.
- **JetBrains Mono em tudo, sempre.** Sensação de "documento jurídico /
  log de servidor profissional" — confere autoridade ao sistema.
- **`border-radius: 0` em toda classe `.pwd-*`.** Quina arredondada lê
  como "SaaS amigável" e dilui a sensação de cockpit operacional.
- **Retângulo dentro de retângulo.** Moldura externa + interna concêntrica
  cria hierarquia espacial sem cor adicional.
- **PT-BR sempre.** Toda label, erro, log, comentário público.

## Regra "Luz por trás" (não dar volta na quina)
**Por que existe**: CEO rejeita `box-shadow: 0 0 20px rgba(...)` em hover
porque o halo radial faz o olho ler a quina como arredondada. Quer
sensação de "tecla retroiluminada" — luz vazando atrás, respeitando o
retângulo 90°.
**Como implementar**: pseudo `::before` com background = cor de identidade
+ blur + opacity oscilante. Em ancestor que tem `filter`, NÃO usar
`z-index: -1` (falha em Safari) — usar `isolation: isolate` no pai,
`z-index: 0` no pseudo, `z-index: 1` nos filhos. Verificar overflow do
container ancestor pra não cortar a luz.

## K1 / K2 / K3 — gramática de atenção
- **K1 Pulso Único**: idealmente 1 elemento "vivo" por tela. Pulsos
  simultâneos sobrecarregam atenção TDAH. Status atual: aspiracional
  (ainda não totalmente aplicado).
- **K2 Três Níveis**: repouso (cinza dim) → foco (borda colorida) → ação
  (respiração na cor). Hierarquia única, sem ambiguidade.
- **K3 Faixa Visível**: inset 2px amarelo em sub-menu nível 3 expandido.

## Não brigar contra o sistema próprio
Antes de inventar animação nova em um wrapper de tema, ler o shell base.
Regras `* { animation: none !important }` anulam respirações nativas que
já existem e geram ciclo infinito de "consertar o que eu mesmo quebrei".
Sempre listar SELETIVAMENTE quais elementos zerar animação, nunca
universalmente.

## Seletores por inline-style são frágeis
`[style*="opacity: 0.75"]` parece prático mas: (a) NO-OP se o ancestor
não casar (verificar `.pwd-kpi` vs `.pwd-bloco` no DOM real), (b) captura
elementos não-alvo que tenham mesma string, (c) quebra silencioso quando
o JSX muda formatação inline. Quando precisar de override de tema, criar
CLASSE semântica no JSX (ex: `.pwd-kpi-label`) e estilizar por classe.

## Cores por domínio = decoração mental
8 domínios fixos, cada um com pastel-neon próprio. CEO decora por cor, não
por sigla. Antes de adicionar 9º domínio, propor compactação ou hachura —
não esgotar a paleta sem critério.

## Documentação fonte-de-verdade
Spec completa pro Dr. Claude vive em
`docs/dr-claude/22_CARTA_MAGNA_LAYOUT_DEFINITIVO_PAWARDS.md`.
Toda mudança visual significativa deve atualizar lá antes de propagar
pro `_dashShell.tsx` real.
