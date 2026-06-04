# LINHA DO TEMPO · DESIGN PENUMBRA (mai-jun/2026)

> Data: 04/06/2026
> Autor: Dr. Replit (sob orientacao do CEO Caio)
> Finalidade: registrar, pedido a pedido, COMO e POR QUE o Caio pensa layout,
> consolidando a origem do padrao PENUMBRA. Espelho humano da skill
> `.agents/skills/penumbra-design-system/` (que viaja com todos os projetos).
> Fontes: docs/dr-claude/21, 22, 23, 24; .local/tasks/*; .agents/memory/*.

---

## 0. Por que este documento existe

Caio gastou tempo e dinheiro iterando o front por ~2 semanas. Ele pediu que a
gente "volte no tempo", junte TODOS os pedidos de design, monte uma linha do
tempo com o porque/como ele pensa, e a partir disso crie a skill padrao. Este
doc e a parte de leitura humana; a skill e a parte operacional pros agentes.

A moeda chama-se PENUMBRA. Tem duas faces: PENUMBRA CLARO (tecnica Paper Ciano)
e PENUMBRA ESCURO (tecnica Navy Ciano). Estrutura identica; muda so a paleta.

---

## 1. Cronologia

### 21/05/2026 — Triple Focus (L2)
- Pedido: trocar o layout antigo por modelo de "tres focos" (sidebar
  colapsavel + topbar ultrafina + painel de contexto a direita), atalhos `[` `]`.
- Por que: acabar com a sensacao de "telas soltas"; tudo dentro de uma moldura.
- Origem de: chrome estavel, paineis laterais, operacao por teclado.
- Fonte: docs/dr-claude/21_BRIEFING_INTEGRACAO_LAYOUT_TRIPLE_FOCUS.md.

### 23/05/2026 — Dashboards Global vs Local
- Pedido: canvas em coluna vertical unica; separar visao CEO (Global) da visao
  Medico (Local).
- Regra de ouro: o medico local jamais pode saber que a Global existe.
- Por que: seguranca da informacao + menos ruido cognitivo.
- Origem de: escopo LOCAL/GLOBAL na faixa 1.
- Fonte: .local/tasks/canvas-reorganizar-e-dashboards-global-local.md.

### 25/05/2026 — 5 Chromes Navegacionais
- Pedido: 5 variantes de moldura ("chrome") porque se sentia perdido.
- Escolha: hibrida 3-sinais (sidebar mini + breadcrumb topo + status).
- Principio: "comodo de uma casa, nao pagina de site".
- Origem de: as 3 faixas + menu lateral.
- Fonte: .local/tasks/exploracao-5-chromes-navegacionais.md.

### 26/05/2026 — Auditoria UX "Caio"
- Achado: faltava compartimentacao; o "neonzinho dos botoes" tinha sumido; 90%
  das paginas eram brancas sem chrome -> dispersao.
- Por que: ele opera por batida de olho; sem identidade visual ele se perde.
- Origem de: neon = identidade por dominio (memoria espacial por cor).
- Fonte: .local/tasks/_audit-ux-ceo-medico-2026-05-26.md.

### 27/05/2026 — CARTA MAGNA + PENUMBRA (marco zero)
- Pedido: consolidar o Layout Definitivo Pawards.
- Entregue: estetica Craniotomia (deep navy, JetBrains Mono, quina 90) +
  cockpit PENUMBRA (3 faixas + menu 3 niveis + 2 paineis) + 20 principios
  fundadores P01-P20 + decisoes D001-D013.
- Iterou ~2 dias / 6 variantes (3 claras + 3 escuras). Aprovou PENUMBRA PAPER
  CIANO (claro) pareado com PENUMBRA NAVY CIANO (escuro).
- Decisoes-chave: chrome de cor fixa (P07/D008); toggle de face segmentado
  (D011); busca dupla ENTIDADES + EVENTOS (D010); nome do operador formatado +
  cluster a direita (D012); botao SOM (D013).
- Fontes: docs/dr-claude/22 e 23.

### 03/06/2026 — Wave Front-End (neon + hover + claro)
- Pedido: padronizar neon e hover e a transmutacao sistemica pro tema claro.
- Entregue: hover "luz por tras" (tecla retroiluminada) + tokens das 2 faces.
- Fonte: docs/dr-claude/24.

### 04/06/2026 — Batismo da moeda + skill padrao
- Travou os nomes (moeda PENUMBRA, faces CLARO/ESCURO).
- Pediu a skill padrao de design pra todos os projetos.
- Entregue: skill `.agents/skills/penumbra-design-system/` + este documento.

---

## 2. Como o Caio pensa (consolidado)

2.1. TDAH -> anti-dispersao: um unico elemento vivo por tela (K1); leitura por
batida de olho; densidade alta e bem-vinda, scroll pro basico e inimigo.

2.2. Asperger -> ordem explicita e literal: hierarquia dada por posicao/contraste/
moldura, nunca inferida; nomes completos e semanticos; metafora estavel
("instrumento", nao "site").

2.3. TOC -> alinhamento e categorizacao: linha vertical imaginaria de 16px; tudo
embaixo do outro e categorizado; numeros tabulares; quina 90 que "fecha" o
retangulo.

2.4. Estetica: classico, austero, denso, calmo. Documento juridico + Bloomberg +
instrumento medico + cockpit + DAW + microscopio. Penumbra (tela rebaixada),
claro em papel azulado claro, nunca branco hospitalar.

2.5. Neon x hover: neon fixo = ONDE ESTOU (identidade por dominio); hover "luz
por tras" = O QUE FACO (acao). Respiracao so no item ativo.

2.6. Processo: A/B/C com default (nunca pergunta aberta); proposta .md antes do
codigo; profundidade sobre velocidade.

---

## 3. Onde mora a fonte-de-verdade

- Skill operacional: `.agents/skills/penumbra-design-system/SKILL.md` + reference/.
- Cartas Magnas: docs/dr-claude/22 (layout) e 23 (cockpit + P01-P20).
- Tokens: `.../chromes-navegacionais/refinados/_design.ts`.
- Shell + faces: `.../cockpits-paciente/_pawardsPenumbra.tsx`,
  `_perfisPenumbra.ts`, `PenumbraClara2_PaperCiano.tsx`, `PenumbraEscura2_NavyCyan.tsx`.
