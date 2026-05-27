---
name: Sticky header + aside com scroll próprio
description: Padrão pra layout dashboard com header congelado no topo e menu lateral rolável independente, sem desalinhar grid.
---

## Padrão

Quando o usuário pede "header congelado / menu lateral com scroll", a abordagem que funciona em layout `display:grid` com `grid-template-columns: aside main`:

1. **NÃO** envolver tudo em `overflow:auto` no main — isso quebra o sticky e cria 2 scrollbars.
2. **Header**: agrupar todas as faixas superiores em um único `<div style={{position:'sticky', top:0, zIndex:50}}>` ACIMA do grid. O scroll natural é da página inteira (body/window).
3. **Aside (sidebar)**: usar `position:'sticky', top: <altura do header>, alignSelf:'start', maxHeight: 'calc(100vh - <altura>px)', overflowY:'auto'`. Crítico o `alignSelf:start`, senão o grid estica o aside pra altura da row inteira e o sticky não tem espaço pra agir.
4. **Grid wrapper**: precisa de `alignItems:'start'` na row pra reforçar o ponto acima.

**Why:** sticky só funciona dentro de um ancestral scrollável. Se você jogar overflow no main, o sticky do header escapa do contexto. Deixar o scroll na window e fazer ambos (header e aside) sticky dentro do mesmo container resolve sem mexer em altura fixa de container pai.

**How to apply:** Toda vez que o usuário pedir "faixa congelada no topo" + "menu com scroll" em dashboard com sidebar, replicar este padrão. O número mágico da `top` do aside é a soma das alturas das faixas sticky acima dele — medir empiricamente ou usar `getBoundingClientRect` se precisar dinâmico.
