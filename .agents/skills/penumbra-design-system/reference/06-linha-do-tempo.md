---
name: Linha do tempo do design PENUMBRA
description: Como o padrao PENUMBRA nasceu, pedido a pedido (mai-jun/2026). Cada marco tem o que o Caio pediu e o PORQUE. Leia para entender a evolucao do raciocinio, nao so o resultado.
---

# Linha do tempo — como o PENUMBRA nasceu

Cronologia dos pedidos de front-end do Caio. De "telas soltas" a um cockpit
unico. Cada marco ensina uma parte do gosto dele.

## 21/05/2026 · Triple Focus (L2) — o fim das "telas soltas"
- Pediu: abandonar o layout antigo por um modelo de "tres focos".
- Feito: sidebar esquerda colapsavel + topbar ultrafina + painel de contexto a
  direita. Atalhos `[` e `]` pra os paineis.
- Por que: reduzir a sensacao de "telas soltas"; trazer o sistema pra dentro de
  uma moldura unica.
- Semente de: chrome estavel, paineis laterais, operacao por teclado.

## 23/05/2026 · Dashboards Global vs Local — segregacao de visao
- Pediu: organizar o canvas em coluna vertical unica e separar estritamente a
  visao CEO (Global) da visao Medico (Local).
- Regra de ouro: o medico local JAMAIS pode saber que a visao Global existe
  (zero vazamento visual).
- Por que: seguranca da informacao + reducao de ruido cognitivo pra quem opera
  uma unica unidade.
- Semente de: escopo LOCAL/GLOBAL na faixa 1.

## 25/05/2026 · 5 Chromes Navegacionais — "comodo, nao site"
- Pediu: 5 variantes de "chrome" (moldura do sistema) porque se sentia perdido
  entre telas.
- Escolha: variante hibrida com 3 sinais (sidebar mini + breadcrumb topo +
  rodape/status).
- Principio: o sistema e "um comodo de uma casa, nao uma pagina de site". Ele se
  localiza pela moldura fixa.
- Semente de: as 3 faixas + menu lateral.

## 26/05/2026 · Auditoria UX "Caio" — o neon que sumiu
- Achado: criticou a falta de compartimentacao e o sumico do "neonzinho nos
  botoes"; 90% das paginas eram telas brancas sem chrome = dispersao.
- Por que: ele opera por batida de olho; tela branca sem identidade o perde.
- Semente de: neon = identidade por dominio (memoria espacial por cor).

## 27/05/2026 · CARTA MAGNA + PENUMBRA — o marco zero
- Pediu: consolidar o Layout Definitivo Pawards.
- Feito: estetica "Craniotomia" (deep navy, JetBrains Mono, quina 90) +
  cockpit PENUMBRA (3 faixas + menu 3 niveis + 2 paineis) + os 20 principios
  fundadores (P01-P20) + decisoes D001-D013.
- Rodou ~2 dias iterando 6 variantes (3 claras + 3 escuras). Aprovou
  PENUMBRA PAPER CIANO (claro) com par PENUMBRA NAVY CIANO (escuro).
- Refinamentos do dia: chrome com cor fixa (nao tinge com bloco, P07/D008);
  toggle de face como botao segmentado (D011); busca dupla facetada ENTIDADES +
  EVENTOS (D010); nome do operador formatado + cluster encostado a direita
  (D012); botao SOM no cluster (D013).
- Docs: dr-claude/22 (layout) e dr-claude/23 (cockpit + P01-P20).

## 03/06/2026 · Wave Front-End — neon e hover padronizados
- Pediu: fechar a semantica de neon e hover e a transmutacao pro tema claro.
- Feito: refino do hover "luz por tras" (tecla retroiluminada) e tematizacao
  sistemica via tokens das duas faces.
- Doc: dr-claude/24.

## 04/06/2026 · Batismo da moeda + esta skill
- Travou os nomes: a moeda e PENUMBRA; faces PENUMBRA CLARO (Paper Ciano) e
  PENUMBRA ESCURO (Navy Ciano). Metafora: uma moeda, duas faces.
- Pediu: esta skill como padrao de design pra TODOS os projetos dele, carregando
  a cognicao + os 20 principios + tokens das 2 faces + anatomia + checklist.

## Sintese da evolucao (o vetor)
telas soltas -> moldura unica -> segregacao de visao -> identidade por cor ->
cockpit denso de tela unica -> duas faces pareadas -> padrao reutilizavel.
O fio condutor e sempre o mesmo: reduzir dispersao e dar ordem explicita a uma
cabeca TDAH/Asperger/TOC operando 12 horas.
