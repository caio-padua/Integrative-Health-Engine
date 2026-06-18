---
name: Anatomia do layout PENUMBRA (faixas, menu, paineis, blocos)
description: A estrutura obrigatoria de toda tela PENUMBRA — 3 faixas no topo, menu lateral de 3 niveis que minimiza, 2 paineis a direita colapsaveis e blocos de conteudo. Use ao montar qualquer tela nova.
---

# Anatomia do PERFIL COCKPIT (telas operacionais)

> Escopo: esta anatomia (3 faixas + menu + 2 paineis) e o PERFIL COCKPIT, para
> telas operacionais densas (dashboards, cockpits, filas). Landing, formularios
> simples e relatorios herdam o NUCLEO PENUMBRA (P01-P20 + tokens + neon/hover),
> mas adaptam a estrutura — nao precisam das 3 faixas nem dos 2 paineis.

Toda tela operacional do dia-a-dia herda este esqueleto. E uma TELA UNICA: a
informacao vem ate o operador (paineis + blocos), ele nao "navega entre paginas".

```
┌ FAIXA 1 (40px) · controles globais ───────────────────────────────────────┐
│ [LOCAL][GLOBAL]  [1][2][3] [CLARO][ESCURO]  ⌕ENTIDADES  ⌕EVENTOS  ...      │
│                                   ... [NOME OPERADOR · CARGO] | ♪SOM CONFIG SAIR │
├ FAIXA 2 (40px) · breadcrumb ──────────────────────────────────────────────┤
│ PAWARDS ▸ PADUA MATRIZ ▸ DASHBOARD GLOBAL              [badge bloco ativo]  │
├ FAIXA 3 (40px) · contexto/ativo ──────────────────────────────────────────┤
│ ATIVO · GRACO SOUZA PADUA · 34A · M · HAS DM2  [PACIENTE][AGENDA][PRESC]... │
├──────┬─────────────────────────────────────────────────┬────────┬─────────┤
│ MENU │ CORPO · blocos OPE / ALT / DMD (minimizaveis)    │ CONTEXTO│  PULSO  │
│ 18 / │                                                  │  200    │  200    │
│ 66 / │                                                  │   ↕     │   ↕     │
│ 172  │                                                  │         │         │
└──────┴─────────────────────────────────────────────────┴────────┴─────────┘
```

Tudo alinha em `LINHA_ESQ = 16`. Tudo sticky. Chrome com cor fixa (P07).

## 1. As 3 faixas (chrome superior)

- Todas com `height: 40px` e `fontSize: 10` (P08). Cor fixa do perfil (P07).
- **Faixa 1 · controles globais**: escopo `[LOCAL][GLOBAL]` (segmentado) ·
  niveis de densidade `[1][2][3]` · toggle de face `[CLARO][ESCURO]` (segmentado,
  agrupado com os niveis — ambos sao toggles de visualizacao) · duas buscas
  separadas: ENTIDADES (accent teal) e EVENTOS (ambar) · a direita, cluster do
  operador encostado na borda: `NOME · CARGO` | `♪SOM CONFIG SAIR`, com divisor
  1px separando identidade de controles de sistema.
  - Nome do operador formatado: 1o nome completo + iniciais do meio + sobrenome
    (ex.: "Caio Henrique Fernandes Padua" -> "CAIO H. F. PADUA"), uppercase.
  - Cargo dinamico = funcao real do operador (CEO/MEDICO/ENFERMEIRA), nunca fixo.
- **Faixa 2 · breadcrumb**: PAWARDS ▸ UNIDADE ▸ TELA, itens clicaveis (hover
  ciano + tooltip "◂ voltar"); item atual destacado. No fim, o badge do bloco
  ativo (unico elemento da chrome que muda de cor).
- **Faixa 3 · contexto**: registro ATIVO (paciente/unidade) + abas espelhadas
  (PACIENTE/AGENDA/PRESCRICAO/FATURAMENTO) que ACENDEM o menu lateral
  (bidirecional, P18) + relogio/sessao.

## 2. Menu lateral (3 niveis, minimiza)

- **Nivel 1** (18px): tarja vertical, so siglas, `writing-mode: vertical-rl`.
- **Nivel 2** (66px): siglas (DASHB/PACTS/...) com faixa colorida 4px a esquerda.
- **Nivel 3** (172px): sigla + rotulo + sub-info + submenus com L de 90 (P13).
- Troca por atalho `1/2/3`. Item ativo respira na cor do dominio (K1). Hover =
  luz por tras na cor (P09), sem respirar (P10).
- TECLINHA VISIVEL obrigatoria: o menu expoe um botao clicavel (◂) pra recolher
  pro nivel 1, e a tarja do nivel 1 e clicavel pra reabrir. O atalho de teclado
  (`[`) e um ATALHO, nunca o unico caminho — todo colapso tem affordance visivel.

## 3. Os 2 paineis a direita (colapsaveis)

- **CONTEXTO** (accent dourado): agenda restante + atalhos de acao (+RECEITA/
  +EXAME/+MENSAGEM) + bloco TECLADO (dicionario de atalhos, P17).
- **PULSO** (accent2 ciano): timeline do paciente (MSG/EXM/AGD/RXC/FIN) com LED
  de vidro + timestamp relativo.
- Cada um 200px aberto; colapsado vira tarja vertical 18px encostada no topo (P14).
- TECLINHA VISIVEL obrigatoria: cada painel tem um botao clicavel no header (▸)
  pra recolher; colapsado, a propria tarja vertical e clicavel (com ◂) pra
  reabrir. O atalho `]` complementa, nunca substitui o botao visivel.

## 4. Blocos de conteudo (corpo)

- Verticais, minimizaveis individualmente (`▾/▸`), header sticky.
- Header: LED + tag + titulo uppercase + contador + botao de status
  (EM CURSO/OK/FALHA) + toggle. Borda-esquerda 3-5px na cor do dominio.
- Cor do bloco ativo tinge SO o proprio bloco (fundo e header levemente), nunca
  a chrome (P07). Atalhos `q/w/e` trocam bloco ativo no cockpit.
- KPIs: label uppercase 10px + valor 20px tabular-nums + sub-info 9px. Densidade
  alta (preferir 6 KPIs pequenos a 3 grandes).
- Card de alerta: tag de severidade (CRITICO respira vermelho; URGENTE estatico)
  + titulo + paciente + contexto a direita + CTA com hover na cor de severidade.

## 5. Animacoes (catalogo)

- `respira` ~2.8s: item ativo / card CRITICO (na cor). So um por vez (K1).
- hover "luz por tras" ~2.0s: brilho cresce (blur 4->22px, opacity 0.10->0.75)
  sem pulsar continuamente apos fixar.
- Todas `ease-in-out`. Nunca animar `opacity` do conteudo (perde contraste
  TOC-friendly); animar box-shadow/background.

## 6. K1/K2/K3 (as tres leis de atencao)

- **K1 Pulso Unico**: so UM elemento vivo por tela.
- **K2 Tres niveis**: Repouso (texto apagado) -> Foco (borda na cor) -> Acao
  (respira na cor). Nunca pular nivel.
- **K3 Faixa Visivel**: inset 2px `#FFE600` marca submenu nivel-3 expandido.
