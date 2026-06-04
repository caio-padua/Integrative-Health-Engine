---
name: Checklist de entrega + anti-padroes PENUMBRA
description: Rode antes de mostrar qualquer tela PENUMBRA ao Caio. Inclui o checklist por tela, os anti-padroes A01-A13 ja testados e REJEITADOS por ele, e os corolarios A14-A17 derivados dos principios. Nao repetir os anti-padroes.
---

# Checklist de entrega + anti-padroes

## 1. Checklist por tela (rode antes de mostrar ao Caio)

Estrutura
- [ ] 3 faixas no topo, todas 40px e fontSize 10, cor fixa do perfil (P07/P08).
- [ ] Menu lateral 3 niveis (18/66/172) com atalho 1/2/3 e minimiza/expande.
- [ ] 2 paineis a direita colapsaveis; colapsados viram tarja vertical 18px.
- [ ] Tudo alinhado na linha vertical de 16px (LINHA_ESQ). Nada "solto".
- [ ] Tudo sticky onde precisa (faixas + header de bloco).

Estetica de ferro
- [ ] `border-radius: 0` em 100% dos elementos (P01).
- [ ] JetBrains Mono em todo texto; tabular-nums em todo numero (P02/P16).
- [ ] PT-BR em toda label; zero emoji renderizado (P03/P04).
- [ ] Retangulo dentro de retangulo pra hierarquia (P05); sem card arredondado.
- [ ] Filtro Penumbra++ aplicado; claro e papel azulado claro, nao branco puro.

Cor e movimento
- [ ] Neon = identidade/onde-estou (fixo); hover = acao/o-que-faco (transitorio).
- [ ] Exatamente UM elemento vivo na tela (K1). Hover nao respira (P10).
- [ ] Hover e "luz por tras", envolve 4 lados, nao pinta miolo, nao arredonda (P09).
- [ ] LED e de vidro (radial-gradient), nao bolinha chapada (P11).
- [ ] Cor do bloco ativo tinge so o bloco, nunca a chrome (P07).
- [ ] 8 dominios usando as cores oficiais; nenhum hex novo inventado.

Semantica e dados
- [ ] Nomes completos e semanticos; `perfil` nunca `role`; prefixos pode_/nunca_/requer_ (P15).
- [ ] Mock claramente nomeado e nunca apresentado como dado real (P20).
- [ ] Atalhos de teclado declarados e mostrados no bloco TECLADO (P17).
- [ ] As duas faces (CLARO/ESCURO) funcionam via perfilPar; estrutura identica (P19).

Processo
- [ ] Proposta `.md` registrada antes do codigo (anti-ectoplasma).
- [ ] Da pra captar a informacao principal numa batida de olho (<2s)?

## 2. Anti-padroes (NAO repetir)

A01-A13 = testados e REJEITADOS pelo Caio ao vivo (doc dr-claude/23).
A14-A17 = corolarios derivados dos principios (nao foram "testados", mas
violam regra de ferro). Tratar todos como proibidos.

| # | Anti-padrao | Por que foi rejeitado |
|---|-------------|-----------------------|
| A01 | `border-radius` em botoes/cards | Mata carater juridico-tecnico (P01) |
| A02 | Hover pintando o miolo (`:hover{background:cor}`) | Perde quina e respiracao (P09) |
| A03 | Respiracao continua em hover | Cockpit fica nervoso (P10) |
| A04 | Chrome (faixas 2/3) tingindo com bloco ativo | Quebra identidade (P07) |
| A05 | LED bolinha 2D chapada | Vira sticker, nao instrumento (P11) |
| A06 | fontSize diferente entre faixas 1/2/3 | Chrome compete com conteudo (P08) |
| A07 | Botoes com alturas diferentes na mesma faixa | Quebra eixo horizontal de leitura |
| A08 | Submenu sem L conectando ao pai | Perde arvore visual (P13) |
| A09 | Cor de hover global unica | Cada elemento precisa hover na sua cor (P09) |
| A10 | Persistir tema CLARO/ESCURO por horario automatico | Decisao do operador, nao do relogio |
| A11 | Tarja vertical com simbolo (`▸ MENU`) misturado | Simbolo polui (P14) |
| A12 | Busca unica misturando entidades + eventos | Vira ruido; sao canais separados |
| A13 | Mock virando dado real sem aprovacao explicita | Regra dos "8.728 receitas" (P20) |
| A14 | Branco hospitalar puro no tema claro | Cansa; o claro e papel azulado claro |
| A15 | Emoji em UI, codigo, log ou commit | Ruido infantil/nao-profissional (P04) |
| A16 | Abreviar nomes ou usar `role` | Viola naming semantico (P15) |
| A17 | Entregar rapido sem profundidade | Caio manda revisar tudo de novo |
