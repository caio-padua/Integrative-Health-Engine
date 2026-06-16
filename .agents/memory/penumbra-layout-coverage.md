---
name: Cobertura do layout PENUMBRA (LayoutPawards) no clinica-motor
description: Quais telas usam o shell oficial vs o layout antigo, como migrar com seguranca e o risco de ectoplasma.
---

# Cobertura do layout PENUMBRA no clinica-motor

`artifacts/clinica-motor/src/components/LayoutPawards.tsx` e o shell oficial
PENUMBRA (deep navy + neon ciano + dourado, arquitetura E4: 2 strips sticky no
topo + sidebar L2 + painel contexto). Export NOMEADO `LayoutPawards`.

## Padrao de migracao (troca de casca)
Paginas migradas importam `import { LayoutPawards as Layout } from "@/components/LayoutPawards"`
e usam `<Layout>...</Layout>` (children-based, SEM props). O layout antigo e
`import { Layout } from "@/components/Layout"`. Ambos sao children-based e nenhuma
tela passa props ao `<Layout>`, entao a troca de import e MECANICA e de baixo risco
estrutural (compila, sem novos erros de tipo).

## Risco real: ectoplasma visual
Trocar so a casca NAO deixa a tela "muito visual". O conteudo das telas antigas e
claro (Card shadcn com `bg-card` branco). Dentro do shell navy: cards brancos
ficam legiveis (texto escuro em card branco), MAS titulos/textos soltos fora de
card (que herdam cor escura) podem sumir no fundo navy. Logo: migracao completa =
casca + repaginar conteudo pra paleta PENUMBRA (sem card claro orfao).

**Why:** CEO odeia "ectoplasma" (meia-feito feio) e pediu telas "muito bem visuais".
Casca sem repaginacao e foundation, nao entrega final.

## Telas ainda no layout ANTIGO (16/06/2026)
governanca/index (JA troquei a casca), governanca-matrix (JA troquei a casca),
consultorias, delegacao, craniotomia(wrapper), blueprint, task-cards, estoque,
matriz-analitica, permissoes, colaboradores, painel-comando, inundacao, fluxos,
sessoes, unidades, seguranca, configuracoes, perfil/seguranca-2fa.

## Verificacao visual
Telas sao auth-gated: screenshot sem login mostra so o fundo navy do shell. Pra ver
o conteudo real precisa logar (nao da pra validar visual via screenshot anonimo).

## Baseline de typecheck SUJO
`pnpm --filter @workspace/clinica-motor run typecheck` JA falha com erros
PRE-EXISTENTES (assinaturas-timeline, catalogo, colaboradores, dashboard, filas,
fluxos). Nao tratar typecheck verde como gate aqui; checar so se a MINHA mudanca
adicionou erro novo nos arquivos tocados.
