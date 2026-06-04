---
name: 20 Principios Fundadores PENUMBRA (P01-P20)
description: Os 20 principios inegociaveis do DNA visual PENUMBRA, cada um com regra, porque e contra-exemplo. Regra de ferro — se for vetar algum, pare e alinhe com o Caio antes.
---

# 20 Principios Fundadores (P01-P20)

DNA visual do PENUMBRA. Cada principio: regra + porque + contra-exemplo
(o que ja foi rejeitado). Origem: docs/dr-claude/23.

## P01 · Quina 90 graus absoluta
- Regra: `border-radius: 0` em todos os elementos. Sem excecao.
- Por que: identidade juridico-tecnica; quina arredondada vira "app moderno
  generico" e mata o carater de instrumento.
- Contra-exemplo: `border-radius: 4px` em botoes -> rejeitado.

## P02 · JetBrains Mono universal
- Regra: `'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace` em 100%
  do texto.
- Por que: mono garante alinhamento de numero (tabular-nums) e hierarquia
  tecnica. Tipografia variavel quebra a sensacao de "instrumento calibrado".

## P03 · Portugues BR sempre
- Regra: nenhum texto de UI em EN. Variavel de codigo pode ser EN (`bg`, `t1`,
  `accent`); label de tela jamais.

## P04 · Zero emoji
- Regra: nenhum emoji na UI renderizada. Caractere unicode tecnico
  (▾ ▸ ⌕ ◂ ⌘) e permitido so quando funcional, nunca decorativo.

## P05 · Retangulo dentro de retangulo
- Regra: hierarquia visual via aninhamento de retangulos com bordas 1px. Sem
  cards arredondados, sem pilulas, sem baloes.
- Por que: legibilidade de hierarquia em alta densidade.

## P06 · Linha imaginaria esquerda · 16px
- Regra: constante `LINHA_ESQ = 16` rege o `padding-left` de toda faixa
  horizontal e bloco. Tudo alinha por essa coluna vertical invisivel.
- Por que: o olho do Caio (TDAH/TOC) escaneia pela esquerda; quebra de eixo
  causa desconforto.

## P07 · Identidade visual fixa nas chromes
- Regra: a chrome (faixas 1/2/3, menu lateral, paineis CONTEXTO/PULSO) tem cores
  fixas do perfil ativo. NAO tinge com o bloco ativo. Quem muda de cor e so o
  proprio bloco e o item-espelho no menu lateral.
- Por que: chrome tingida vira "tema" instavel e perde identidade. A
  estabilidade da chrome e o que faz o Caio reconhecer o sistema em qualquer estado.
- Contra-exemplo: faixas 2 e 3 com background tingido pela cor do bloco +
  borderLeft colorida. Implementado e revertido pelo Caio.

## P08 · Faixas com mesma altura e mesma fonte
- Regra: faixas 1, 2, 3 tem `height: 40px` e todos os elementos textuais
  `fontSize: 10`. Sem hierarquia tipografica dentro da chrome.
- Por que: chrome e mobilia, nao conteudo; tamanhos diferentes competem com o
  conteudo central.

## P09 · Hover neon vem de TRAS · envolve os 4 lados
- Regra: hover aplica halo por tras (nunca pinta o miolo):
  ```css
  box-shadow:
    0 0 0 1px var(--ppen-cor),         /* aro 1px */
    0 0 8px 2px var(--ppen-cor-soft),  /* halo medio */
    0 0 18px 4px var(--ppen-cor-soft); /* halo externo */
  z-index: 2;
  ```
  Variante por `::before` (luz por tras): background = cor de identidade + blur
  4->22px + opacity 0.10->0.75, `z-index: -1` no filho + `isolation: isolate`
  no pai. A luz vaza pelos 4 lados respeitando o retangulo, NAO da a volta na quina.
- Por que: o miolo fica limpo, o brilho envolve por fora; quina 90 preservada.
  Cada elemento escolhe sua cor via `--ppen-cor` (helper `hoverVars(cor)`).
- Contra-exemplo: `:hover { background: cor }` pintando o miolo -> mata a quina.

## P10 · Respiracao so em SELECIONADO · nunca em hover
- Regra: animacao `respira` (ease-in-out infinite) so em `.selecionado`. Hover
  marca borda/luz sem pulsar continuamente.
- Por que: respiracao em hover deixa o cockpit nervoso. Respirar e privilegio do
  que esta ativo agora.

## P11 · LED de vidro · nao bolinha chapada
- Regra: `<LED cor size />` usa `radial-gradient(circle at 30% 30%, #FFF, cor 55%,
  cor 100%)` + `box-shadow: 0 0 4px cor, inset 0 -1px 1px rgba(0,0,0,0.3)` +
  `border: 1px solid cor`.
- Por que: bolinha 2D chapada vira sticker; LED 3D vira instrumento.

## P12 · Alto-relevo 3D nos blocos · Windows classico
- Regra: bloco usa sombra dupla (inset claro em cima, inset escuro embaixo +
  sombra externa) pra parecer levemente saliente.
- Por que: hierarquia tatil; reforco da metafora "monobloco sobre monobloco".

## P13 · Submenu com L de 90 graus conectando ao pai
- Regra: `submenu::before` desenha um L (border-left 2px + border-bottom 2px) no
  canto superior esquerdo, ligando o submenu a faixa colorida do item-pai.
- Por que: arvore visual sem indentacao gritante; estilo "esquematico eletrico".

## P14 · Tarjas verticais colapsadas · encostadas no topo
- Regra: MENU/CONTEXTO/PULSO colapsados viram coluna de 18px com a palavra em
  `writing-mode: vertical-rl`, `fontSize: 10`, `letterSpacing: 4`,
  `fontWeight: 900`, alinhada ao topo. Sem simbolos misturados.
- Por que: a tarja indica ONDE esta o painel, nao o conteudo. Encostada no topo
  alinha com as 3 faixas.

## P15 · Naming sem `role` · prefixos `pode_/nunca_/requer_`
- Regra: campo de perfil e `perfil`, nunca `role` (confunde com roteamento).
  Permissoes com prefixo: `pode_emitir_receita`, `nunca_acessar_financeiro`,
  `requer_2fa`. Nomes completos, sem abreviacao.

## P16 · Numeros tabulares
- Regra: todo numero exibido tem `fontVariantNumeric: 'tabular-nums'`.
- Por que: numero proporcional faz a coluna dancar; tabular alinha a casa decimal.

## P17 · Atalhos de teclado obrigatorios
- Regra: cada tela declara seu mapa de teclado e mostra num bloco TECLADO no
  painel CONTEXTO. Padrao do cockpit: `1/2/3` nivel do menu; `q/w/e` bloco ativo;
  `[` toggle MENU; `]` toggle CONTEXTO.
- Por que: Caio e TDAH/TOC e opera por teclado; mouse e fallback.

## P18 · Cor do bloco ativo acende o menu lateral
- Regra: trocar o bloco ativo acende o item correspondente no menu lateral na
  cor do dominio (navegacao espelhada/bidirecional).
- Por que: o medico ve de relance "o que estou operando".

## P19 · Toggle CLARO <-> ESCURO via `perfilPar`
- Regra: o layout aceita um `perfilPar` opcional (a face oposta); botao
  segmentado `[CLARO][ESCURO]` na faixa 1 alterna entre as faces. Par aprovado:
  Paper Ciano <-> Navy Ciano.
- Por que: UI roda em consultorio (claro/dia) e sala de procedimento (escuro/foco);
  sem toggle o medico perde acuidade visual.

## P20 · Mock data marcado · nunca confundido com real
- Regra: nenhum numero mockado pode virar afirmacao real sem o Caio aprovar.
  Mocks ficam em constantes claramente nomeadas no topo do arquivo. (Caso
  emblematico: "8.728 receitas" / "R$ 2.736.536,10" sao POTENCIAL estimado de
  fichas historicas, nunca caixa real.)
