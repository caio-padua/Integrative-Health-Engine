# 24 · WAVE FRONT-END — TEMA CLARO + PADRONIZACAO NEON/HOVER

> **Data:** 03/06/2026
> **Autor:** Dr. Replit (sob orientacao direta do CEO Caio)
> **Destinatario:** Dr. Claude (Opus) + demais participantes
> **Finalidade:** Abrir a Wave de front-end pedida pelo Caio. Consolidar o que
> JA esta padronizado, listar o que FALTA, e levar as decisoes abertas para
> parecer do Dr. Claude ANTES de qualquer codigo (anti-ectoplasma).
> **Pre-requisito:** validacao das farmacias (glossario v2) esta em STAND-BY a
> pedido do Caio enquanto esta Wave roda.

---

## 0. CONTEXTO HUMANO (nao-negociavel)

Caio (CEO) e Asperger + TDAH + TOC. Design e decisao cognitiva, nao estetica.
Regras de ferro: zero emoji em UI/codigo, JetBrains Mono, quina 90 graus (0px
radius), retangulo dentro de retangulo, PT-BR sempre, K1 (um unico elemento
"vivo" por tela).

---

## 1. O QUE JA ESTA DEFINIDO (nao reabrir sem motivo)

1. **Paleta neon por dominio** — fonte de verdade em
   `mockups/chromes-navegacionais/refinados/_design.ts` e documentada na
   Carta Magna (doc 22). Cada dominio tem UMA cor pastel-neon:
   DASHB dourado, PACTS azul ceu, AGEND ciano agua, PRESC lilas, FATUR verde
   menta, MOTOR rosa, EQUIP roxo claro, AUDIT vermelho.
   - **Semantica do neon:** cor de IDENTIDADE de dominio. O usuario decora o
     dominio pela cor (decoracao mental TDAH-friendly). Neon = "onde eu estou".
2. **Hover ("luz por tras")** — regra ja travada: nada de halo radial
   (`box-shadow: 0 0 20px`), porque o halo faz o olho ler a quina como
   arredondada. Hover = pseudo `::before` com a cor de identidade + blur +
   opacidade oscilante, respeitando a quina 90 graus (sensacao de tecla
   retroiluminada).
   - **Semantica do hover:** feedback de FOCO/ACAO (K2: repouso -> foco ->
     acao). Hover = "o que vai acontecer se eu clicar".
3. **Tema atual = ESCURO (Penumbra / deep navy).** Todos os tokens de cor
   (`navy*`, `ink*`, neon) ja saem de `_design.ts`. As telas NAO tem hex
   hardcoded — consomem token.

> **Conclusao 1:** o padrao neon e hover JA existe e tem semantica clara
> (neon = identidade/onde-estou; hover = foco/o-que-faco). O que falta nao e
> "definir do zero", e sim **criar a versao CLARA dos mesmos tokens**.

---

## 2. O QUE FALTA (escopo desta Wave)

1. **Tokens em versao CLARA** — espelho de cada token escuro para fundo claro
   (navy -> brancos/cinzas, ink -> tinta escura, neon reajustado para manter
   contraste AA sobre fundo claro). O neon puro sobre branco "lava" e perde
   leitura; precisa de variante mais saturada/escura por dominio.
2. **Mecanismo de troca de tema** (toggle) — ja existe o segmento
   `[CLARO][ESCURO]` previsto na chrome da faixa 1 (doc 23). Falta ligar ao
   CSS real.
3. **Regra de transmutacao** — como TODAS as telas passam a herdar o tema sem
   reescrever tela por tela.

---

## 3. DECISOES ABERTAS — PARECER DO DR. CLAUDE

> Formato: Dr. Replit propoe A/B/C + default. Dr. Claude da parecer. Caio bate
> o martelo.

### Q-FE-01 · Como transmutar todas as telas para o claro
- **A (default Dr. Replit):** troca por CAMADA DE TOKENS. Uma classe raiz
  `.tema-claro` redefine os mesmos tokens de `_design.ts`. Como tudo ja usa
  token, e UMA camada, nao N telas. Esforco concentrado, baixo risco.
- **B:** reescrever cada tela manualmente. Caro, lento, propenso a erro.
- **C:** filtro/inversao automatica (`invert()`/`filter`). Rapido mas quebra o
  neon e fica feio. Descartar.
- **Recomendacao:** A.

### Q-FE-02 · Toggle por quadro OU global
- **A (default Dr. Replit):** UM toggle GLOBAL na chrome (ja previsto doc 23),
  aplica a todas as telas. Estado unico, sem ambiguidade (TDAH-friendly).
- **B:** um botao em CADA quadro. Multiplica estado, aumenta ruido, contradiz
  K1 (um pulso por tela). Descartar.
- **C:** global + excecao pontual (ex.: um quadro sempre claro para impressao).
- **Recomendacao:** A (com porta aberta pro C se surgir caso real).

### Q-FE-03 · Neon no claro — manter cor ou reescalar
- **A (default Dr. Replit):** manter a MESMA semantica de cor por dominio, mas
  com variante reescalada (mais saturada/escura) para contraste em fundo claro.
  O usuario continua decorando "PRESC = lilas", so muda o tom.
- **B:** paleta clara totalmente nova. Quebra a memoria de cor ja construida.
  Descartar.
- **Recomendacao:** A.

### Q-FE-04 · Default de abertura (claro ou escuro)
- **A:** abre no ESCURO (atual), claro e opcional.
- **B (default Dr. Replit):** lembra a ultima escolha do usuario (persistir em
  `localStorage` + perfil). Caio decide o default global.
- **Recomendacao:** B.

---

## 4. CUSTO (token e dinheiro) — esclarecimento pro Caio

1. **Dois custos diferentes, nao confundir:**
   1.1. **Construir (uma vez):** e trabalho de desenvolvimento (consumo de
        token do Dr. Replit durante a Wave). A opcao 3.A/Q-FE-01-A e a MAIS
        BARATA porque e UMA camada de tokens, nao N telas refeitas.
   1.2. **Rodar (recorrente):** tema claro/escuro e SO CSS. O usuario clicar
        para trocar de tema NAO consome token nem chamada de API. Custo
        recorrente em producao = ZERO.
2. **Conclusao:** o toggle em si nao gera custo mensal. O unico custo e o
   esforco unico de montar a camada clara. Quanto mais reaproveitarmos os
   tokens existentes, menor o esforco.

---

## 5. DESTINOS POR PARTICIPANTE

1. **Dr. Claude (Opus):** dar parecer em Q-FE-01 a Q-FE-04; opcionalmente
   propor variante clara da paleta por dominio (8 cores reescaladas).
2. **Caio (CEO):** bater o martelo no default global (Q-FE-04) e aprovar a
   abordagem por tokens.
3. **Dr. Replit:** apos parecer + martelo, executar a camada `.tema-claro`,
   ligar o toggle global da chrome e validar com screenshot + architect.
4. **Outros participantes:** registrar objecoes neste doc (append) antes do
   inicio do codigo.

---

## 6. STATUS

- **Codigo:** nenhum escrito ainda. Esta Wave esta em fase de PROPOSTA.
- **Farmacias (glossario v2):** STAND-BY a pedido do Caio.
- **Proximo passo:** aguardar parecer Dr. Claude + martelo Caio nas 4 questoes.
