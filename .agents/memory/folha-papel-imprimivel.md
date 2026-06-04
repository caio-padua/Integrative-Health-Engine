---
name: FOLHA do GpsPadua em papel imprimível
description: O modo FOLHA do EditorBlend renderiza folha A4 branca (não tela escura), imprimível via window.print.
---

# FOLHA = prescrição em papel/PDF imprimível

O 3º modo do `EditorBlend` (SELECIONADA / VER TODAS / **FOLHA**) em
`prescricao-rapida/GpsPadua.tsx` renderiza a `FolhaConsolidada` como **folha A4
branca** (paleta clara local `papel`), NÃO no tema escuro `tk`.

**Why:** pedido CEO 01/06/2026 — o bloco não podia parecer "tela digital"; tinha
que ser uma prescrição em papel que pudesse ser impressa.

**How to apply:**
- Cores de via no papel usam `viaTinta` (versões escurecidas), não `tk.via` (claras pra fundo escuro).
- Posologia no papel usa `PosologiaPapel` (reaproveita `linhasPrescricao`, mesma lógica do app, em cores de tinta).
- Botão IMPRIMIR chama `window.print()`; CSS `@media print` esconde tudo menos `#folha-papel` e oculta `[data-no-print]`; `@page A4 margin 14mm`.
- Estética inspirada em `pawards-showcase/ReceitaLayout` + `PdfHeaderFooter` (header navy INSTITUTO PÁDUA + PAWARDS dourado, rodapé PADCON/RASX-MATRIZ).
- Assinatura usa "Clínico Responsável" (sem nome de pessoa física, regra Pawards).
- Regras mantidas mesmo em papel: 0px radius, JetBrains Mono, zero emoji, PT-BR.
- Para VER o modo FOLHA num screenshot: `editandoFormula` já default `"blend-vo"`; o EditorBlend renderiza full-width ABAIXO das colunas Pilha (precisa viewport alto ou scroll baixo).
