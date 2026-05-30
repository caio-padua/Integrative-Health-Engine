# PROPOSTA — Funil de categoria, Blend, Posologia e Craniotomia por blocos

Data: 30/05/2026
Autor: Dr. Replit
Status: AGUARDANDO DECISAO DO CAIO (A/B/C)
Protocolo: anti-ectoplasma (decisao em .md antes do codigo)

---

## 1. O QUE O CAIO RELATOU (limbo dentro do ectoplasma)

1.1 Nao consegue editar formulas de todas as formas.
1.2 Falta FORMULA BLEND (varias substancias na MESMA capsula/dose, 1 posologia so).
1.3 No mockup cada ativo tem posologia separada, em vez de dose + via + periodos (dropdown) + horarios.
1.4 A posologia tem que falar 100% com o motor de mensageria.
1.5 Nos injetaveis intramusculares: nao consegue selecionar todas as opcoes.
1.6 Precisa selecionar injetaveis (e endovenosos, implantes, exames) POR CATEGORIA.
1.7 Quer um "cerebro" pra escolher 50+ ativos com filtro por funil de categoria.
1.8 Craniotomia deve sugerir por BLOCOS: indicou 1 exame de um bloco, sugere o bloco inteiro.
1.9 Na validacao pode tirar 1 ou incluir 1 de outro bloco, isolado ou nao.
1.10 Rastrear todos os mockups, ver se algum se apagou, reorganizar um embaixo do outro.

---

## 2. DIAGNOSTICO REAL (operador, codigo lido)

2.1 O prescritor ativo e o GPS Padua (PilhaPorVia + TimelineSessoes consolidados).
2.2 O CatalogoLateral foi rejeitado por voce ("nao TDAH/TOC") — nao mexo nele.

2.3 BLEND ja existe no GPS Padua.
2.3.1 Botao "BLEND" por item, abre EditorBlend (3o andar).
2.3.2 Blend tem posologia UNICA pro conjunto (ex: "1 cap/dia", horarios ["08h","20h"]).
2.3.3 Modelo de dados: campo `componentes` em `_tokens.ts`.

2.4 POSOLOGIA ESTRUTURADA ja existe no GPS (parcial).
2.4.1 Campos: sessoes, frequencia (dropdown), ancora (dropdown), horarios.
2.4.2 Ligacao com mensageria existe (`horarioParaPeriodo` + 9 periodos JE/IM/MM/AL/IT/MT/NO/FN/CE).
2.4.3 FALTA: campo "via de administracao" editavel e dropdown de PERIODO explicito por item.

2.5 BUG CONFIRMADO — "nao consigo selecionar todas as opcoes".
2.5.1 O painel "+ ADICIONAR" do GPS mostra so 3 candidatos por via (`cands.slice(0, 3)`).
2.5.2 O resto do catalogo fica invisivel; nao da pra rolar nem buscar.

2.6 FALTA o FUNIL POR CATEGORIA (o "cerebro").
2.6.1 Hoje o catalogo so separa por VIA (a coluna), nao por categoria terapeutica.
2.6.2 Nao existe campo `categoria` no catalogo.
2.6.3 O catalogo tem ~18 itens de exemplo, nao 50+.

2.7 Onde cada ativo tem posologia separada (sem blend): e o Cockpit Medico V1, nao o GPS.

2.8 CRANIOTOMIA POR BLOCOS — falta a regra que voce descreveu.
2.8.1 A CraniotomiaV4 tem sinapses SE(sinal)->ENTAO(item) e codigo por bloco (prefixo QSNT/QDGN).
2.8.2 NAO existe a regra "indicou 1 do bloco -> sugere o bloco inteiro".
2.8.3 NAO existe "na validacao tiro/incluo isolado de outro bloco".

2.9 CANVAS — 116 shapes no board.
2.9.1 Os mockups de prescricao estao todos la (GPS, Cockpit V1, Craniotomia V4, Motor Mensageria).
2.9.2 Nao afirmo que algum "se apagou" sem varrer os 116 (a leitura veio truncada).

---

## 3. DECISOES (A/B/C + default)

### DECISAO 1 — Por onde comeco
- A) Funil de categoria (o "cerebro") no GPS Padua: catalogo com categoria, sem teto de 3, busca + filtro. [DEFAULT]
- B) Craniotomia por blocos primeiro.
- C) Reorganizar/rastrear o canvas primeiro.
Recomendado: A (e a sua dor mais alta e mais clara).

### DECISAO 2 — Formato do funil ("cerebro")
- A) 3 niveis: VIA -> CATEGORIA TERAPEUTICA -> ATIVO, com busca por texto e lista completa. [DEFAULT]
- B) 2 niveis: CATEGORIA -> ATIVO (a via vira etiqueta).
- C) Busca unica estilo command-palette com chips de categoria.
Recomendado: A (mantem suas 6 colunas por via, soma categoria por dentro).

### DECISAO 3 — Posologia por item
- A) Adicionar VIA editavel + dropdown de PERIODO por item, ligado ao motor de mensageria. [DEFAULT]
- B) Manter como esta (sessoes/freq/ancora/horarios) e so ligar horarios->periodo automatico.
- C) Refazer a posologia do zero.
Recomendado: A (fecha o 1.3 e 1.4 sem quebrar o que ja funciona).

### DECISAO 4 — Craniotomia por blocos (quando chegar a vez dela)
- A) Selecionou 1 item do bloco -> marca o bloco inteiro como sugerido; na validacao da pra desmarcar 1 ou puxar 1 de outro bloco. [DEFAULT]
- B) Sugere o bloco inteiro automatico, sem poder desmarcar isolado.
- C) So sugere item a item (sem bloco).
Recomendado: A (e exatamente o que voce descreveu em 1.8/1.9).

### DECISAO 5 — Canvas (rastrear/reorganizar)
- A) NAO reorganizar agora; te entrego so um indice "existe no codigo vs esta no board". [DEFAULT]
- B) Agrupar so os mockups de prescricao, um embaixo do outro.
- C) Reorganizar todos os 116 shapes um embaixo do outro.
Recomendado: A (mexer em 116 shapes arrisca baguncar seu layout atual).

---

## 4. SE VOCE SO DISSER "VAI"

4.1 Eu executo o pacote default: 1A + 2A + 3A.
4.2 Depois 4A (craniotomia por blocos).
4.3 Canvas fica em 5A (indice, sem reorganizar).
4.4 Tudo dentro do GPS Padua e da CraniotomiaV4, sem tocar no CatalogoLateral rejeitado.
