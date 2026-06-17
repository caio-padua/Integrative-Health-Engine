---
name: LayoutPawards já é o container de scroll
description: Regra ao migrar telas para o shell PENUMBRA LayoutPawards — não usar min-h-screen/100vh nos filhos.
---

# LayoutPawards já provê o scroll; filhos NÃO devem ter altura de viewport

Ao envolver uma tela em `<LayoutPawards>` (alias comum `Layout`), o `<main>`
interno já é o container de rolagem: root tem `height:100vh` + flex coluna, e o
`main` tem `flex:1; overflow:auto`. Portanto os children já vivem dentro de uma
área com altura definida e scroll próprio.

**Regra:** filhos NÃO podem usar `min-h-screen` nem `minHeight:"100vh"` — isso
empilha mais ~1 viewport de altura dentro de uma área já cheia e cria scroll
duplo/redundante. Use `min-h-full` (Tailwind) ou `minHeight:"100%"` (inline) pra
preencher exatamente a área visível sem transbordar.

**Why:** code review (architect) flagou scroll redundante em identidade-emails e
painel-transmutacao logo após o wrap; a causa é a dupla altura de viewport.

**How to apply:** sempre que adicionar `<Layout>` em volta de uma página que
tinha `min-h-screen`/`100vh` (telas que antes rodavam sem casca), troque a altura
fixa por `min-h-full`/`100%` no mesmo passo do wrap.

## Migração de casca PENUMBRA — verdade do inventário

Muitas telas marcadas "OLD" por um explorer JÁ TÊM a casca LayoutPawards; o que
está "claro" é só o CONTEÚDO interno (cards shadcn brancos). Padronizar a CASCA
(LayoutPawards) é barato e seguro (troca de import OU wrap children-only,
assinatura `{children}` idêntica entre Layout velho e LayoutPawards). A reescrita
profunda do conteúdo interno (estilo governanca: tokens PW/MONO + Painel + hover
glow) é trilha SEPARADA, bem maior — não confundir os dois níveis ao comunicar.
