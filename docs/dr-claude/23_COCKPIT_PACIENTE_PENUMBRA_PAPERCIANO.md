# 23 · CARTA MAGNA PAWARDS — Cockpit do Paciente (PENUMBRA PAPER CIANO)

> **Status**: Variante visual aprovada por Caio em **27/mai/2026**.
> Documento promovido a **Carta Magna** do estilo Pawards — vale pra esse
> cockpit e pros futuros sistemas que construirmos juntos.
> **Branch GitHub**: `ver-l2-dr-claude`.
> **Próximo passo bloqueado por Dr. Claude**: opinar antes de a) cruzar
> com SQL real, b) graduar mockup pra rota `/pacientes/:id/cockpit`.

---

## 0 · Resumo executivo pro Dr. Claude

Caio rodou ~2 dias iterando 6 variantes (3 claras + 3 escuras) no
mockup-sandbox. Aprovou **PENUMBRA PAPER CIANO** (claro, accent teal
escuro `#1E7A6E`, glow ciano `#2A9D8F`) como base canônica, com par
escuro **PENUMBRA NAVY CIANO** (navy `#020A14`, accent ciano clínica
`#5FE6CC`).

Esse cockpit é a **tela única do dia-a-dia** do médico e do CEO. Tudo
que um paciente precisa acontece aqui: operação do dia (sessões,
receita, aderência, fila, motor, faltas), alertas críticos do motor
clínico, demandas operacionais por domínio, agenda restante, atalhos,
timeline do paciente (PULSO). **Sem trocar de tela.**

A estética sintetiza 6 referências: documento jurídico bem formatado +
terminal técnico Bloomberg + display de instrumento médico hospitalar
+ painel de cockpit de aeronave + interface de DAW profissional +
visor de microscópio. Não é "moderno", não é "minimal" — é
**denso, técnico, hierárquico, calmo**.

---

## 1 · PRINCÍPIOS FUNDADORES (regra ferro · inegociável)

Esses 20 princípios formam o **DNA visual** do Pawards. Cada princípio
tem nome, regra, justificativa e contra-exemplo. Se Dr. Claude vetar
qualquer um deles, paramos e revisamos — não passamos sem alinhamento.

### P01 · Quina 90° absoluta
**Regra**: `border-radius: 0` em todos os elementos. Sem exceção.
**Por quê**: identidade jurídico-técnica. Quina arredondada vira "app
moderno genérico" e mata o caráter de instrumento.
**Contra-exemplo**: `border-radius: 4px` em botões → rejeitado.

### P02 · JetBrains Mono universal
**Regra**: `'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace`
em 100% do texto (constante `font` no `_pawardsPenumbra.tsx`).
**Por quê**: mono garante alinhamento de número (tabular-nums) e
hierarquia técnica. Tipografia variável quebra a sensação de
"instrumento calibrado".

### P03 · Português BR sempre
**Regra**: nenhum texto de UI em EN. Variável de código pode ser EN
(`bg`, `t1`, `accent`), label de tela jamais.

### P04 · Zero emoji
**Regra**: nenhum emoji na UI renderizada. Caractere unicode técnico
(▾ ▸ ⌕ ◂ ⌘) é permitido só quando funcional, nunca decorativo.

### P05 · Retângulo dentro de retângulo
**Regra**: hierarquia visual via aninhamento de retângulos com bordas
1px. Sem cards arredondados, sem pílulas, sem balões.
**Por quê**: legibilidade de hierarquia em alta densidade.

### P06 · Linha imaginária esquerda · 16px
**Regra**: constante `LINHA_ESQ = 16` rege o `padding-left` de toda
faixa horizontal e bloco. Tudo alinha por essa coluna vertical
invisível.
**Por quê**: olho do Caio (TDAH/TOC) escaneia pela esquerda — quebra
de eixo causa desconforto.

### P07 · Identidade visual fixa nas chromes
**Regra (nova · 27/mai)**: a **chrome** (faixas 1, 2, 3, menu lateral,
painéis CONTEXTO/PULSO) tem cores fixas tiradas do perfil ativo. Ela
**não tinge** com o bloco ativo (OPE/ALT/DMD). Quem muda de cor é só o
próprio bloco e o item-espelho no menu lateral.
**Por quê**: chrome tingida vira "tema" instável, perde identidade.
Estabilidade da chrome é o que faz Caio reconhecer o sistema em
qualquer estado.
**Contra-exemplo (rejeitado)**: faixas 2 e 3 com `background:
tomFaixaAtiva = corBloco10` + `borderLeft: 5px corBloco`. Foi
implementado e revertido por Caio.

### P08 · Faixas com mesma altura e mesma fonte
**Regra (nova · 27/mai)**: faixas 1, 2, 3 têm `height: 40px` e todos os
elementos textuais delas têm `fontSize: 10`. Sem hierarquia tipográfica
dentro da chrome.
**Por quê**: chrome é mobília, não conteúdo. Tamanhos diferentes na
chrome competem com o conteúdo central.

### P09 · Hover neon vem de TRÁS · envolve 4 lados
**Regra**: classe `.${SID}-elem:hover` aplica:
```css
box-shadow:
  0 0 0 1px var(--ppen-cor),         /* aro 1px */
  0 0 8px 2px var(--ppen-cor-soft),  /* halo médio */
  0 0 18px 4px var(--ppen-cor-soft); /* halo externo */
z-index: 2;
```
**Por quê**: o miolo do elemento fica limpo, o brilho envolve por fora
(acima, abaixo, esquerda, direita). Quina 90° preservada. Quem
escolhe a cor é o elemento via `--ppen-cor` (CSS custom property
injetada por `hoverVars(cor)`).
**Contra-exemplo**: `:hover { background: cor }` pintando o miolo →
mata a quina e perde a sensação de instrumento.

### P10 · Respiração só em SELECIONADO · nunca em hover
**Regra**: animação `@keyframes ${SID}-respira` (4.5s ease-in-out
infinite) aplicada **só** em `.${SID}-selecionado`. Hover marca borda
sem pulsar.
**Por quê**: respiração contínua em hover deixa o cockpit nervoso.
Respirar é privilégio do que está **ativo agora**, não do que o mouse
roça.

### P11 · LED de vidro · não bolinha chapada
**Regra**: componente `<LED cor size />` usa `radial-gradient(circle at
30% 30%, #FFF, cor 55%, cor 100%)` + `box-shadow: 0 0 4px cor, inset
0 -1px 1px rgba(0,0,0,0.3)` + `border: 1px solid cor·aa`.
**Por quê**: bolinha 2D chapada vira sticker. LED 3D vira instrumento.

### P12 · Alto-relevo 3D nos blocos · Windows clássico
**Regra**: classe `.${SID}-bloco-3d` aplica sombra dupla:
```css
box-shadow:
  0 1px 0 rgba(255,255,255,0.5) inset,
  0 -1px 0 rgba(0,0,0,0.05) inset,
  0 2px 0 rgba(0,0,0,0.04),
  0 4px 10px rgba(0,0,0,0.06);
```
**Por quê**: hierarquia tátil. Bloco parece mover-se um pouco pra
fora da tela. Reforço da metáfora "monobloco sobre monobloco".

### P13 · Submenu com L de 90° conectando ao pai
**Regra**: `.${SID}-submenu::before` desenha um L (border-left 2px +
border-bottom 2px) no canto superior esquerdo, conectando o submenu à
faixa colorida do item-pai.
**Por quê**: hierarquia visual de árvore sem precisar de indentação
gritante. Estilo "esquemático elétrico".

### P14 · Tarjas verticais colapsadas · encostadas no topo
**Regra**: quando MENU / CONTEXTO / PULSO estão colapsados, viram
coluna de 18px com a palavra escrita em `writing-mode: vertical-rl`,
`fontSize: 10`, `letterSpacing: 4`, `fontWeight: 900`,
`alignItems: flex-start` + `paddingTop: 4`. Sem símbolos misturados.
**Por quê**: tarja vertical é referência de **onde está o painel**,
não conteúdo dele. Encostada no topo alinha com as 3 faixas.

### P15 · Naming sem `role` · prefixos `pode_/nunca_/requer_`
**Regra**: campo de perfil é `perfil`, nunca `role` (confunde com
roteamento). Permissões usam prefixo: `pode_emitir_receita`,
`nunca_acessar_financeiro`, `requer_2fa`.

### P16 · Números tabulares
**Regra**: todo número exibido (KPI, contador, valor monetário) tem
`fontVariantNumeric: 'tabular-nums'`.
**Por quê**: número proporcional faz coluna dançar. Tabular alinha
casa decimal verticalmente.

### P17 · Atalhos de teclado obrigatórios
**Regra**: cada cockpit declara seu mapa de teclado. Hoje:
- `1/2/3` → nível do menu lateral
- `q/w/e` → bloco ativo OPE/ALT/DMD
- `[` → toggle painel MENU
- `]` → toggle painel CONTEXTO

Mostrado no painel CONTEXTO em bloco `TECLADO`.
**Por quê**: Caio é TDAH/TOC e opera por teclado. Mouse é fallback.

### P18 · Cor do bloco ativo · acende menu lateral
**Regra**: mapa `BLOCO_PARA_MENU = { OPE: 0 (DASHB), ALT: 5 (MOTOR),
DMD: 1 (PACTS) }`. Ao trocar bloco ativo, o item correspondente no
menu lateral acende com a cor e respira junto.
**Por quê**: navegação espelhada. Médico vê de relance "o que estou
operando" sem perguntar.

### P19 · Toggle CLARO ↔ ESCURO via `perfilPar`
**Regra**: `LayoutPawardsPenumbra` aceita `perfilPar?: PerfilPenumbra`
opcional. Se passado, renderiza botão `ESCURO/CLARO` na faixa 1 que
alterna `t = usarPar ? perfilPar : perfil`. Pares aprovados hoje:
PaperCiano ↔ NavyCyan.
**Por quê**: UI roda em consultório (claro, dia) e sala de
procedimento (escuro, foco). Sem toggle, médico perde acuidade visual.

### P20 · Mock data marcado e nunca confundido com real
**Regra**: nenhum número mockado (`R$ 41.820`, `87%`, `142`, `8.728
receitas`) pode virar afirmação real sem Caio aprovar explicitamente.
Mocks ficam em constantes claramente nomeadas (`KPIS`, `ALERTAS`,
`DMD_ITENS`, `PULSO_ITENS`) no topo do arquivo.

---

## 2 · DECISÕES TOMADAS NESSA RODADA (D001 a D010)

> Numeração contínua. Decisão nova marcada com `[NOVA · 27/mai]`.

### D001 · Layout em 3 faixas horizontais + corpo + 2 painéis laterais

```
┌─ FAIXA 1 (40px) · LOCAL · GLOBAL · 1 · 2 · 3 · busca · CAIO REGISTER · ESCURO · MÉDICO · CONFIG · SAIR ─┐
├─ FAIXA 2 (40px) · PAWARDS ▸ PÁDUA MATRIZ ▸ DASHBOARD GLOBAL · [OPE] ─────────────────────────────────────┤
├─ FAIXA 3 (40px) · ATIVO · GRACO SOUZA PÁDUA · 34A · M · HAS DM2 · [PACIENTE][AGENDA][PRESCRIÇÃO][FATURAMENTO] · SESSÃO 11:30 16MIN ┤
├──────┬──────────────────────────────────────────────────────────────────────┬──────┬──────┤
│ MENU │ CORPO · OPE · ALT · DMD (blocos minimizáveis com `▾/▸`)              │ CTX  │ PUL  │
│ 18 / │                                                                       │ 200  │ 200  │
│ 66 / │                                                                       │  ↕   │  ↕   │
│ 172  │                                                                       │      │      │
└──────┴──────────────────────────────────────────────────────────────────────┴──────┴──────┘
```

Tudo alinha em `LINHA_ESQ = 16`.

### D002 · Menu lateral com 3 níveis (1 / 2 / 3)
- **Nível 1**: tarja vertical 18px (writing-mode: vertical-rl, encostada no topo).
- **Nível 2**: 66px, só códigos (`DASHB` `PACTS` `AGEND`...) com faixa colorida 4px na esquerda.
- **Nível 3**: 172px, código + rótulo + sub + submenus com L de 90°.
- Atalhos `1/2/3` trocam direto.

### D003 · Blocos OPE / ALT / DMD minimizáveis no corpo
3 blocos verticais. Header colorido (LED + tag + título + contador +
`▾/▸`) + borda-esquerda 5px na cor do domínio (OPE=dourado
`#9C6E16`, ALT=vermelho `#8A2A2A`, DMD=verde-musgo `#3F6E3F`).
Atalhos `q/w/e`. Cor do bloco ativo só tinge o **próprio** bloco
(background `corB·08`, header `corB·14`).

### D004 · Tabs PACIENTE/AGENDA/PRESCRIÇÃO/FATURAMENTO na faixa 3 espelham o menu lateral
Clica em `PRESCRIÇÃO` na faixa 3 → acende `PRESC` no menu lateral (via
`setActDom(3)`). Bidirecional. Estilo: borda + texto + fundo
transparente — idêntico aos botões da faixa 1.

### D005 · Painéis CONTEXTO + PULSO colapsáveis na extrema direita
2 colunas de 200px. CONTEXTO (accent dourado) = agenda restante +
atalhos (+RECEITA/+EXAME/+MENSAGEM) + dicionário de teclado.
PULSO (accent2 ciano) = timeline do paciente (MSG/EXM/AGD/RXC/FIN)
com LED + timestamp relativo. Colapsadas viram tarja vertical 18px.

### D006 · Toggle CLARO ↔ ESCURO via `perfilPar`
Botão na faixa 1, texto alterna `ESCURO/CLARO` conforme `t.modoClaro`.
PaperCiano ↔ NavyCyan pareados. Estado local (`useState`), sem
persistência ainda — ver **Q007**.

### D007 · Hover neon vem de TRÁS envolvendo os 4 lados
Já documentado em **P09**. Detalhe: `--ppen-cor` é injetada via
`hoverVars(cor)` por elemento — cada KPI/card/botão escolhe sua cor
de hover.

### D008 · [NOVA · 27/mai] Identidade visual fixa nas faixas 2 e 3
Removido `tomFaixaAtiva` (background tingido) e `borderLeft` tingido
das faixas 2 e 3. Chrome agora é fixa. Quem muda de cor é só o badge
`OPE/ALT/DMD` no fim da faixa 2 (que é o indicador propriamente
dito, não a chrome).
Ver **P07**.

### D009 · [NOVA · 27/mai] ESCURO/CLARO agrupado com níveis 1·2·3
Caio pediu reposicionar o botão `ESCURO/CLARO` pra ficar **junto** dos
botões de nível (1·2·3) na faixa 1, pois ambos são **toggles de
visualização** (não de domínio). Atual:
```
[LOCAL] [GLOBAL]  [1][2][3]  [busca]  ... [CAIO] [ESCURO] [MÉDICO] [CONFIG] [SAIR]
```
Proposto:
```
[LOCAL] [GLOBAL]  [1][2][3][ESCURO]  [busca]  ... [CAIO] [MÉDICO] [CONFIG] [SAIR]
```

### D010 · [NOVA · 27/mai · IMPLEMENTADA] Busca dupla facetada em funil

Caio propôs e validou visualmente **2 mecanismos de busca** na faixa 1:

**Busca A · ENTIDADES** (accent teal, esquerda das buscas)
- ao **clicar** abre dropdown **ancorado** abaixo do input (opção
  Algolia inline · resposta Q010)
- dropdown listado **por categoria**, uma embaixo da outra:
  - PACIENTES (por nome / sobrenome / CPF)
  - AGENDAMENTOS
  - PRESCRIÇÕES
  - FATURAS
  - QUADROS CLÍNICOS (doenças, blocos motor)
- conforme digita, **filtra em funil** simultâneo em todas as
  categorias; categorias sem resultado somem; cap de 5 itens por
  categoria com scroll (resposta Q011)
- estilo cmd-K / Linear / Algolia.

**Busca B · EVENTOS** (accent âmbar, direita das buscas, **opção b
da Q012**)
- mensagens recebidas / enviadas (WhatsApp, e-mail)
- alertas do motor (críticos, urgentes)
- notificações operacionais (assinatura pendente, exame retornado)
- logs de auditoria recentes (acesso, edição, exclusão)

Justificativa Caio: "não existe layout de sistema assim". Médico
precisa achar `paciente X` e `mensagem do paciente X` por caminhos
diferentes — misturar tudo numa busca só vira ruído. Cores distintas
(teal vs âmbar) deixam claro que são canais separados.

Status: implementado e aprovado visualmente em 27/mai. Q009-Q012
respondidas — ver §6.

### D011 · [NOVA · 27/mai] CLARO/ESCURO como botão segmentado

**Versão anterior**: botão único alternante (clicar em "ESCURO"
levava ao modo escuro; depois aparecia "CLARO" pra voltar).

**Versão atual**: botão **segmentado** `[CLARO][ESCURO]`, igual
`[LOCAL][GLOBAL]` e `[1][2][3]`. O estado ativo fica destacado
(border+background accent2), o inativo fica neutro e clicável.

**Por quê**: P15 simetria. Modo de exibição é estado bi-modal igual
LOCAL/GLOBAL, então a UI tem que ser visualmente equivalente.
Segmentado deixa as 2 opções sempre visíveis — o operador não
precisa ler o label pra saber o que vai acontecer (TDAH-friendly).

**Posicionamento**: grupo próprio com `marginLeft: 4` depois do
grupo 1·2·3 (D009 atualizado — ESCURO não fica "muito encostado" no
3, tem espacinho).

### D012 · [NOVA · 27/mai] Nome do operador formatado + cluster encostado direita

**Regra de formatação do nome do operador na chrome**:
primeiro nome completo + **iniciais** dos nomes do meio + sobrenome
completo. Ex.: `Caio Henrique Fernandes Pádua` → `CAIO H. F. PÁDUA`.
Maiúsculas, JetBrains Mono, accent teal.

**Por quê**: nome completo polui a chrome (P08 mesma altura/fonte na
chrome); só primeiro nome perde formalidade institucional; iniciais
preservam identidade jurídica completa do operador sem ocupar mais
de ~18 caracteres na largura.

**Posicionamento**: cluster operador encostado na **borda direita**
da faixa 1, com `marginLeft: auto`. Ordem dentro do cluster:

```
[NOME OPERADOR · CARGO] | [♪ SOM] [CONFIG] [SAIR]
   ↑ identidade           ↑ controles sistema
```

Divisor vertical de 1px separa **identidade** (nome+cargo, accent
teal) de **controles de sistema** (som+config+sair, cores funcionais
ok/warn/danger). SAIR fica colado na borda direita.

**Cargo dinâmico**: a string fixa "MÉDICO" da chrome anterior virou
a função real do operador autenticado. Caio é "CEO", uma enfermeira
seria "ENFERMEIRA", um médico colaborador seria "MÉDICO". Mock atual
mostra "CEO".

### D013 · [NOVA · 27/mai] Botão SOM toggle no cluster operador

Toggle dedicado **ON/OFF** pra notificações sonoras (alertas
críticos do motor, mensagens novas, lembretes de sessão).

Estados:
- **ON** (default): ícone `♪` accent ok verde + label "SOM" +
  border ativo
- **OFF**: ícone `♪` com `text-decoration: line-through` + label
  "MUDO" + cor neutra t3 + border default

**Por quê**: ambiente clínico tem momentos em que o som é essencial
(alerta motor durante anamnese remota) e momentos em que é hostil
(sala de exame, paciente sensível). Toggle global de 1 clique
resolve. Pertence ao cluster operador (preferência pessoal, não
config global).

**Posicionamento**: primeiro botão depois do divisor identidade ↔
sistema, antes de CONFIG.

---

## 3 · ARQUITETURA DO CÓDIGO (mapa pra Dr. Claude navegar)

### 3.1 · Arquivo-fonte único
`artifacts/mockup-sandbox/src/components/mockups/cockpits-paciente/_pawardsPenumbra.tsx`
(803 linhas) — exporta `LayoutPawardsPenumbra` e o type
`PerfilPenumbra`. Esse arquivo concentra TODA a lógica visual.

### 3.2 · Estado React (10 useState)
```ts
usarPar         boolean             // toggle CLARO/ESCURO
actDom          number              // 0..7 · item ativo no menu
menuOpen        boolean             // painel MENU aberto
ctxOpen         boolean             // painel CONTEXTO aberto
pulsoOpen       boolean             // painel PULSO aberto
blocoAtivo      "OPE"|"ALT"|"DMD"
nivelViz        1|2|3               // densidade do menu lateral
local           boolean             // LOCAL vs GLOBAL
minimizados     Set<string>         // blocos minimizados
```

### 3.3 · Constantes de dados (4 arrays)
`KPIS`, `ALERTAS`, `DMD_ITENS`, `PULSO_ITENS` — todos mockados, todos
no topo do arquivo. Ver **P20**.

### 3.4 · Tema (`PerfilPenumbra` · 21 campos)
`bg / bg2 / bg3 / bg4` (4 níveis de fundo) ·
`border / borderAccent` ·
`t1 / t2 / t3` (3 níveis de texto) ·
`accent / accent2 / accentGlow` ·
`ok / warn / danger` ·
`doms[8]` (cor por domínio do menu) ·
`modoClaro` (boolean).

### 3.5 · CSS-in-JS injetado por instância (`SID = ppen-${t.id}`)
Garante isolamento entre variantes claras e escuras coexistirem na
mesma página. Animações `respira` e `respira-borda` exclusivas por
SID.

### 3.6 · Helpers
- `LED({ cor, size })` — bolinha radial-gradient.
- `Gauge({ valor, max, label, cor, t, size })` — donut SVG 270°
  com texto centralizado e filtro `drop-shadow`.
- `Spark({ data, cor, w, h })` — sparkline polyline com ponto final
  destacado.
- `hoverVars(cor)` — injeta `--ppen-cor`, `--ppen-cor-soft`,
  `--ppen-cor-borda-min` por elemento.

---

## 4 · RAW URLs GitHub (branch `ver-l2-dr-claude`)

| Arquivo | Função | Raw URL |
|---|---|---|
| Layout base | Componente reutilizado pelas 6 variantes | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/artifacts/mockup-sandbox/src/components/mockups/cockpits-paciente/_pawardsPenumbra.tsx |
| Perfis pareados | PAPER_CIANO ↔ NAVY_CIANO | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/artifacts/mockup-sandbox/src/components/mockups/cockpits-paciente/_perfisPenumbra.ts |
| Variante CLARA aprovada | PenumbraClara2_PaperCiano | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/artifacts/mockup-sandbox/src/components/mockups/cockpits-paciente/PenumbraClara2_PaperCiano.tsx |
| Variante ESCURA pareada | PenumbraEscura2_NavyCyan | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/artifacts/mockup-sandbox/src/components/mockups/cockpits-paciente/PenumbraEscura2_NavyCyan.tsx |
| (referência) PapelGold | Variante clara descartada | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/artifacts/mockup-sandbox/src/components/mockups/cockpits-paciente/PenumbraClara1_PapelGold.tsx |
| (referência) NavyGold | Variante escura descartada | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/artifacts/mockup-sandbox/src/components/mockups/cockpits-paciente/PenumbraEscura1_NavyGold.tsx |
| (referência) PaperLilás | Variante clara descartada | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/artifacts/mockup-sandbox/src/components/mockups/cockpits-paciente/PenumbraClara3_PaperLilas.tsx |
| (referência) NoirLilás | Variante escura descartada | https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/artifacts/mockup-sandbox/src/components/mockups/cockpits-paciente/PenumbraEscura3_NoirLilas.tsx |

---

## 5 · ANTI-PADRÕES (já testados e rejeitados por Caio)

| # | Anti-padrão | Por que foi rejeitado |
|---|---|---|
| A01 | `border-radius: 4px` em botões | Mata caráter jurídico-técnico (P01) |
| A02 | Hover pintando o miolo do elemento (`:hover { background: cor }`) | Perde quina e respiração (P09) |
| A03 | Respiração contínua em hover | Cockpit fica nervoso (P10) |
| A04 | Chrome (faixas 2 e 3) tingindo com bloco ativo | Quebra identidade visual (P07, D008) |
| A05 | LED bolinha 2D chapada (`background: cor`) | Vira sticker, não instrumento (P11) |
| A06 | fontSize diferente entre faixa 1, 2 e 3 | Chrome compete com conteúdo (P08) |
| A07 | Botões com alturas diferentes na mesma faixa | Quebra eixo horizontal de leitura |
| A08 | Submenu sem L conectando ao pai | Perde árvore visual (P13) |
| A09 | Cor de hover global única | Cada elemento precisa hover na sua cor (P09) |
| A10 | Persistência de tema CLARO/ESCURO por horário | Decisão pendente, ver Q007 |
| A11 | Tarja vertical com símbolo (`▸ MENU`) misturado | Símbolo polui (P14) |
| A12 | Busca única misturando entidades + eventos | Vira ruído (D010, Q009) |
| A13 | Mock virando dado real sem aprovação explícita | Regra dos 8.728 receitas (P20) |

---

## 6 · PERGUNTAS PENDENTES PRO DR. CLAUDE (Q001 a Q012)

> Q001 a Q008 estavam abertas na versão anterior. Q009 a Q012 são
> consequência direta da decisão D010 (busca dupla facetada).

### Q001 · Cockpit como tela única
6 fluxos numa só tela (operação, alertas, demandas, contexto, pulso,
navegação). É arquitetura sustentável ou em algum momento vira
multi-tela? Se sim, qual o gatilho?

### Q002 · Hierarquia OPE > ALT > DMD
OPE topo, ALT meio, DMD baixo. Faz sentido pro fluxo do médico, ou
ALT deveria estar no topo (porque pode matar)?

### Q003 · Fonte dos KPIs operacionais
Quais tabelas reais alimentam SESSÕES / RECEITA / ADERÊNCIA / FILA /
MOTOR / FALTAS? Hoje mockados — preciso saber pra fase SQL.

### Q004 · Alertas críticos do motor
Vêm de `alerta_paciente` ou view materializada de `regras_motor` ×
últimos exames? Regra de deduplicação se o mesmo alerta dispara
várias vezes?

### Q005 · Demandas operacionais (DMD)
Fila unificada ou filas separadas por domínio? SLA entre elas?

### Q006 · Tabs faixa 3 vs menu lateral
Hoje **acendem** o menu. Deveriam **navegar** pra páginas separadas?
Ou virar **drawers** sobre o cockpit?

### Q007 · Persistência do toggle CLARO ↔ ESCURO
`usuarios.preferencias.tema`, `localStorage` ou auto por horário?

### Q008 · Outros 4 perfis (PapelGold, PaperLilás, NavyGold, NoirLilás)
Manter como referência, parear todos pra ter 3 pares com toggle, ou
deletar?

### Q009 · [RESPONDIDA · 27/mai] Busca: 1 retângulo ou 2?
**Resposta Caio**: 2 retângulos, lado a lado na faixa 1. ENTIDADES
(teal) e EVENTOS (âmbar) com cores distintas pra reforçar canais
separados. Ver D010.

### Q010 · [RESPONDIDA · 27/mai] Dropdown facetado · onde abrir?
**Resposta Caio**: dropdown **ancorado** abaixo do input (Algolia
inline), `position: absolute, top: calc(100% + 2px)`. Overlay
cmd-K rejeitado — quebraria continuidade visual com a chrome.

### Q011 · [RESPONDIDA · 27/mai] Funil de digitação · debounce?
**Resposta Caio**: filtragem instantânea a cada tecla (sem
debounce, dataset cliente-side pequeno). Cap de **5 itens por
categoria** com scroll interno. Sem link "ver todos" por
enquanto — adicionar quando dataset real ultrapassar 5.

### Q012 · [RESPONDIDA · 27/mai] Busca B (Eventos) · posicionamento
**Resposta Caio**: opção **b** — mesma faixa 1, ao lado da Busca A,
antes do cluster operador. Preserva P05 e P14, mantém ambas as
buscas no campo de visão único. Implementado.

### Q013 · [NOVA] Persistência do som
Toggle SOM (D013) é por sessão ou persiste no perfil do operador?
Se persiste, onde armazenar — `usuarios.preferencias_ui` JSONB?

### Q014 · [NOVA] Cargo dinâmico do operador
Mock atual mostra "CEO" hardcoded. No banco, a fonte da verdade é
`usuarios.perfil` (enum: enfermeira, medico_tecnico, ceo, etc) ou
um campo separado `usuarios.cargo_exibicao` (string livre, ex.:
"Sócio-Diretor Clínico")? Caio precisa decidir.

### Q015 · [NOVA] Formatação do nome operador
D012 define "primeiro + iniciais meios + último". Funções pra
casos especiais:
- Nome simples ("Ana Silva") → "ANA SILVA" (sem iniciais, ok)
- Sobrenome composto ("Caio Pádua Filho") → "CAIO P. FILHO" ou
  "CAIO PÁDUA FILHO" (preservar "Filho/Junior/Neto" como parte
  do sobrenome composto)?
- Hifenizado ("Maria José Sá-Pereira") → "MARIA J. SÁ-PEREIRA"?
- Nomes com partícula ("Ana de Souza") → "ANA DE SOUZA" ou
  "ANA D. SOUZA"?

Caio decide regra única ou abrimos exceções catalogadas no
`utils/formatarNomeOperador.ts`?

---

## 7 · CARTA MAGNA — APLICAÇÃO FUTURA

Esses 20 princípios + 13 anti-padrões valem pra **todo sistema
Pawards** que construirmos daqui pra frente:
- Portal do Paciente
- Portal Comercial (vendas + comissões)
- Carta Magna PADCOM (agentes virtuais)
- Motor V4 admin (craniotomia)
- Padsite (portal de clínicas-cliente)
- Padcon Cobrança
- Qualquer dashboard ou cockpit novo

**Regra de ouro**: se uma nova tela precisar quebrar algum princípio,
o pedido vai pro Dr. Claude **antes** de codar. Princípio quebrado
sem justificativa = retrabalho.

**Regra de naming**: as 6 variantes que descartamos ficam no repo
como referência histórica até decisão final (Q008). Nada se deleta
sem alinhamento explícito.

---

## 8 · PRÓXIMOS PASSOS PROPOSTOS

1. **Dr. Claude responde Q001 a Q012**.
2. **Caio decide D009 e D010** (ESCURO junto com 1·2·3 · busca dupla).
3. **Fase 2 · SQL contra código** (cruza KPIs/alertas/DMD/PULSO com
   `tracking_sintomas`, `alerta_paciente`, `monitoramento_sinais_vitais`,
   `agenda`, `ras`, `faturamento`).
4. **Fase 3 · Graduate** o mockup pra rota real `/pacientes/:id/cockpit`
   (artifact `clinica-motor`).

---

_Atualizado em 2026-05-27 por Dr. Replit (agente Replit) · revisão 2
(promovido a Carta Magna)._
