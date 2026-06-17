---
name: PDFKit rodapé auto-paginação fantasma
description: Por que rodapés/blocos desenhados abaixo da margem inferior criam páginas em branco no PDFKit e como evitar.
---

# Páginas-fantasma do PDFKit (rodapé abaixo da margem)

## A regra
No PDFKit, qualquer `doc.text(..., { width })` passa pelo LineWrapper, que
**auto-pagina quando o y atual ultrapassa `maxY()` (= altura − margem inferior)**,
mesmo com `lineBreak:false`. Um rodapé desenhado perto da borda (y > maxY) gera
uma página em branco POR PÁGINA — num caderno multi-folha isso dobra o total.

`doc.text()` SEM a opção `width` segue o caminho simples e NÃO pagina — por isso
um elemento (ex.: assinatura institucional) pode não disparar fantasma enquanto
os vizinhos com `width` disparam.

## Como aplicar
- Ao desenhar rodapé/qualquer texto com `width` abaixo da margem: salvar
  `doc.page.margins.bottom`, zerar (`= 0`) antes de desenhar e restaurar depois.
  Isso faz `maxY()` virar a borda real da página, então nada pagina.
- SEMPRE proteger o restore com `try/finally` — exceção no meio do desenho
  deixaria a margem em 0 pro resto do page context (regressão silenciosa).
- `lineBreak:false` ajuda como higiene, mas NÃO basta sozinho — a margem é a
  causa-raiz.

## Como verificar (puppeteer não roda no sandbox)
- `pdfinfo arq.pdf | grep Pages` para contar páginas.
- `pdftotext -bbox arq.pdf out.xml` + contar `<word>` por `<page>`; página com
  < ~15 palavras é fantasma. Render visual via `pdftoppm -png` + ler o PNG.

**Why:** caderno jurídico RACJ saía com 96 páginas (48 em branco); causa real era
o `drawFooter` em y≈818 com `maxY()`=802. Fix derrubou pra 24 páginas, zero
fantasma. Vale pra TODO gerador PDFKit do repo (rasxPdf compartilha drawFooter
entre JURIDICO e COMPLETO).
