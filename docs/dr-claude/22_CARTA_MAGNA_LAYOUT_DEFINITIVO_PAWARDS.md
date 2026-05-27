# CARTA MAGNA · LAYOUT DEFINITIVO PAWARDS

> **Data:** 27/mai/2026
> **Autor:** Dr. Replit (sob orientação direta do CEO Caio)
> **Destinatário:** Dr. Claude (Opus 4.7)
> **Finalidade:** Fonte de verdade do sistema visual Pawards. Base para Dr. Claude
> emitir parecer e propor 4 versões alternativas antes da consolidação final.
> **Componente de referência:** `artifacts/mockup-sandbox/src/components/mockups/cockpits-paciente/DashFinalPawards.tsx`
> **Shell que herda as regras:** `artifacts/mockup-sandbox/src/components/mockups/cockpits-paciente/_dashShell.tsx`
> **Tema CSS público:** classe raiz `.tema-final-pawards`

---

## 0. CONTEXTO HUMANO (não-negociável)

Caio (CEO) tem perfil **Asperger + TDAH + TOC**. O sistema é o cockpit
operacional dele e da equipe. Consequências obrigatórias no design:

1. **Zero ruído visual desnecessário.** Cada pixel precisa carregar significado.
2. **Hierarquia explícita.** Nunca dependa do usuário inferir prioridade — o
   layout entrega ordem de leitura por contraste, posição e movimento.
3. **Foco anti-dispersivo.** Em cada tela, **apenas UM elemento "vivo"** por vez
   (regra K1 · Pulso Único). Múltiplas animações simultâneas = colapso cognitivo.
4. **Sensação de "documento jurídico bem formatado".** Layout austero, denso,
   tipografia monoespaçada, retângulos com quina 90° absoluta. Nada de cards
   arredondados estilo SaaS moderno.
5. **PT-BR sempre.** Toda interface, toda mensagem de erro, toda label.
6. **Zero emojis.** Em código, em UI, em logs, em commits.

---

## 1. PALETA SEMÂNTICA OFICIAL

### 1.1. Fundo e Estrutura (canônica em `mockups/chromes-navegacionais/refinados/_design.ts`)

> **Fonte de verdade:** `palette` exportada em `_design.ts`. Reexportada como
> `p` em `_pecasCockpit.tsx`. Não duplicar hex em outros lugares.

| Token             | Valor      | Uso                                          |
|-------------------|------------|----------------------------------------------|
| `navy`            | `#020406`  | Tom mais profundo (sombra extrema)           |
| `navyDeep`        | `#000204`  | Fundo absoluto da página                     |
| `navyPanel`       | `#0A1628`  | Fundo de bloco / cartão / faixa interna      |
| `navyPanelAlt`    | `#0F1E36`  | Fundo de header de bloco / sub-painel        |
| `navyTopBar`      | `#0E1B30`  | Faixa superior sticky                        |
| `border`          | `#1A2D4F`  | Borda padrão de retângulos                   |
| `borderSoft`      | `#172238`  | Borda interna mais discreta                  |
| `ink`             | `#E8EEF7`  | Texto principal (branco firme)               |
| `inkDim`          | `#9FB0C9`  | Texto secundário (cinza claro legível)       |
| `inkMute`         | `#6B7E9E`  | Label/caption (cinza médio)                  |
| `gold`            | `#C89B3C`  | Borda institucional + nick do paciente       |
| `goldSoft`        | `#E6C572`  | Variante clara do gold (badge ativa)         |
| `goldDeep`        | `#8A6A26`  | Variante escura do gold (estado off)         |
| `cyan`            | `#5EE6E6`  | KPI primário · valor numérico destaque       |
| `cyanDim`         | `#3AA0A0`  | Variante apagada do cyan                     |
| `ok`              | `#7CC4A0`  | Estado OK / dentro da meta                   |
| `warn`            | `#E0B062`  | Atenção institucional (não-respiratório)     |
| `danger`          | `#D08A8A`  | Falha institucional (não-respiratório)       |

> **Observação:** o reforço de contraste do CEO (Penumbra++) sobre branco
> `#E8EEF7` resulta em luminância percebida muito próxima de `#F4F6F9` — o
> seletor de override usa esse último como alvo intencionalmente.

### 1.2. Cores de Identidade por Domínio (menu lateral)

Cada **bloco semântico** do sistema tem **uma cor pastel-neon** própria.
O usuário decora o domínio pela cor (regra fundamental TDAH-friendly).

| Sigla   | Domínio          | Cor       | Hex       | Significado                       |
|---------|------------------|-----------|-----------|-----------------------------------|
| `DASHB` | Dashboard        | Dourado   | `#F5C97A` | Visão geral / overview            |
| `PACTS` | Pacientes        | Azul céu  | `#5BB6FF` | Pessoas / dados clínicos          |
| `AGEND` | Agenda           | Ciano água| `#5FE6CC` | Tempo / fluxo                     |
| `PRESC` | Prescrição       | Lilás     | `#B5A0F0` | Ato médico / fórmulas             |
| `FATUR` | Faturamento      | Verde menta| `#85E0A3`| Dinheiro / financeiro             |
| `MOTOR` | Motor V4         | Rosa      | `#FFA3C8` | Engine clínica / regras           |
| `EQUIP` | Equipe           | Roxo claro| `#C8B6FF` | Pessoas internas / RH             |
| `AUDIT` | Auditoria        | Vermelho  | `#FF9A9A` | Compliance / LGPD                 |

### 1.3. Cores de Severidade (alertas e tags)

| Severidade | Cor       | Hex       | Uso                              |
|------------|-----------|-----------|----------------------------------|
| `CRÍTICO`  | Vermelho  | `#FF9A9A` | Ação imediata (respira)          |
| `URGENTE`  | Dourado   | `#F5C97A` | Ação até fim do turno (estático) |
| `ATENÇÃO`  | Rosa      | `#FFA3C8` | Acompanhar (estático)            |
| `OK`       | Verde     | `#33FF66` | Cumprido / dentro da meta        |
| `OFF`      | Cinza     | `#6B7388` | Inativo / arquivado              |

### 1.4. Cores Especiais

| Token         | Hex       | Uso                                                |
|---------------|-----------|----------------------------------------------------|
| `lupa-ciano`  | `#5FE6CC` | Cursor de busca / lupa / breadcrumb ativo          |
| `verde-on`    | `#33FF66` | Estado LOCAL/GLOBAL/VISIBILIDADE ativo             |
| `azul-glb`    | `#5BB6FF` | Estado GLOBAL inativo / link secundário            |
| `amarelo-vis` | `#FFE600` | Indicador inset 2px no nível 3 visível             |

---

## 2. TIPOGRAFIA

- **Família:** `JetBrains Mono, ui-monospace, Menlo, Consolas, monospace`
- **Pesos usados:** `400` (corpo), `600` (números KPI), `700` (labels/botões)
- **Tamanhos:**
  - `8px` — caption institucional (PACIENTE, label de stat)
  - `9px` — sub-label, breadcrumb, sub-info
  - `10px` — KPI label, sigla de menu
  - `11px` — botão padrão, menu label, breadcrumb principal
  - `12px` — header de bloco
  - `16px` — nome do paciente
  - `20px` — valor KPI
- **Letter-spacing:**
  - `0.06em` (`ls.suave`) — texto corrido
  - `0.10em` — botão padrão
  - `0.14em` (`ls.forte`) — labels uppercase
- **Line-height:** `1.24` nas faixas 2 e 3 (breadcrumbs)
- **Text-transform:** `uppercase` em tudo que é label/botão/breadcrumb
- **Numeric:** `font-variant-numeric: tabular-nums` em todos os números (alinhamento)

---

## 3. REGRAS DE FERRO (inegociáveis)

### 3.1. Border-Radius
**ZERO em tudo.** Toda classe `.pwd-*` interativa tem
`border-radius: 0 !important` forçado. Inclui `.pwd-btn`, `.pwd-menu-item`,
`.pwd-vis`, `.pwd-escopo`, `.pwd-crumb-on`, `.pwd-op-externo`, `.pwd-olho`,
`.pwd-tag`, `.pwd-kpi`, `.pwd-card-alerta`, `.pwd-bloco-toggle`.

### 3.2. Retângulo Dentro de Retângulo
Todo agrupamento visual usa **dois retângulos concêntricos**: externo (borda
fina `#2A3148`) + interno (mesma estrutura, padding menor, borda da cor de
identidade). Cria a sensação de "moldura de quadro" / "documento oficial".

### 3.3. Pulso Único (K1)
**Apenas UM elemento por tela tem animação `breathe` rodando** ao mesmo tempo:
- O item ativo do menu lateral (respiração 2.8s na cor de identidade) **OU**
- O item em hover (respiração 2.0s na cor de identidade) **OU**
- Um card com severidade `CRÍTICO` (respiração vermelha 2.8s)

Todos os outros pulsos (badges, tags, status, vis, escopo) são **estáticos**.

### 3.4. Três Níveis de Atenção (K2)
- **Nível 1 — Repouso:** texto inkDim, borda padrão, sem animação
- **Nível 2 — Foco:** borda na cor de identidade, sem animação, glow inset 1px
- **Nível 3 — Ação:** respiração 2.0s/2.8s na cor + brightness 0.92→1.35

### 3.5. Faixa Visível (K3)
Indicador `inset 2px solid #FFE600` (amarelo neon) em qualquer elemento
marcado como `.pwd-vis-on` (sub-menu nível 3 expandido).

### 3.6. Penumbra++ (filtro global)
A página inteira (`.tema-final-pawards`) recebe:
```css
filter: brightness(0.99) saturate(0.97) contrast(1.16);
```
Razão: reduz cansaço visual em sessões longas e dá sensação de "tela CRT
profissional" / "monitor de hospital".

---

## 4. ANATOMIA DA TELA (top→bottom)

```
┌─────────────────────────────────────────────────────────────────────┐
│ FAIXA 1 · Controles globais (sticky · alta densidade)               │
│  [LOCAL ●] [GLOBAL] [VIS1][VIS2][VIS3]  [🔍 buscar ⌘K]              │
│  ··············································  [CAIO REGISTER]    │
│  ··············································  [PERFIL: MÉDICO]   │
│  ··············································  [CONFIG] [SAIR]    │
├─────────────────────────────────────────────────────────────────────┤
│ FAIXA 2 · Breadcrumbs clicáveis (◂ voltar)                          │
│  PAWARDS · PÁDUA MATRIZ · DASHBOARD GLOBAL · [MODELO 1 · SANFONA]   │
├─────────────────────────────────────────────────────────────────────┤
│ FAIXA 3 · Contexto                                                  │
│  UNIDADE EM OPERAÇÃO    [DASHB] [PACTS] [AGEND] [PRESC]             │
│  PÁDUA MATRIZ · DASH..  [FATUR] [MOTOR] [EQUIP] [AUDIT]             │
├──────┬──────────────────────────────────────────────────────────────┤
│ MENU │ BLOCO OPE · OPERAÇÃO HOJE · 27/MAI/2026 · QUINTA · 11:14 BRT │
│ DASHB│  ╔══════════════════════════════════════════════════════════╗│
│ PACTS│  ║ SESSÕES HOJE │ RECEITA DIA │ ADERÊNCIA │ FILA │ MOTOR │ ║│
│ AGEND│  ║      18      │  R$ 41.820  │    87%    │  23  │  142  │ ║│
│ PRESC│  ║ 12 ok ·...   │ meta R$ 38K │ obj 80%...│ 5 cr.│ regr. │ ║│
│ FATUR│  ╚══════════════════════════════════════════════════════════╝│
│ MOTOR│ BLOCO ALT · ALERTAS CRÍTICOS DO MOTOR · AÇÃO REQUERIDA       │
│ EQUIP│  [CRÍTICO] INTERAÇÃO NAD+ × ATORVASTATINA · Graco S. Pádua   │
│ AUDIT│  [URGENTE] CORTISOL 8h BAIXO · Camila Toledo                 │
│      │  [URGENTE] TSH LIMÍTROFE 4.8 · Lucas Vargas                  │
│      │ BLOCO DMD · DEMANDAS OPERACIONAIS · POR DOMÍNIO              │
└──────┴──────────────────────────────────────────────────────────────┘
```

---

## 5. COMPONENTES (especificação técnica)

### 5.1. Faixa 1 · Controles Globais
- Altura: `~52px` · Padding: `12px 20px` · Background: `navyDeep`
- Esquerda: `[LOCAL]` (verde quando ativo) + `[GLOBAL]` (azul quando ativo)
  - Quando ativo: respira 2.8s na cor + borda 2px + inset glow
- Centro-esquerda: 3 botões de visibilidade `[1][2][3]` quadrados 28×28
- Centro: campo de busca largura mínima 160px, ícone lupa #5FE6CC à esquerda,
  placeholder "buscar", atalho `⌘K` à direita
- Centro-direita: `CAIO REGISTER` (botão dourado, nick + role)
- Direita: `[PERFIL: MÉDICO]` (badge dropdown) + `[CONFIG]` + `[SAIR]` (vermelho)

### 5.2. Faixa 2 · Breadcrumbs
- Altura: `~36px` · line-height: `1.24` · color: `#F4F6F9`
- Separador: `·` (ponto centralizado, color `inkMute`)
- Cada item clicável tem class `.pwd-final-crumb-clicavel`:
  - Hover: cor ciano `#5FE6CC` + text-shadow neon + tooltip "◂ voltar"
- Item atual (último): background `gold` + color `navyDeep` + sem hover

### 5.3. Faixa 3 · Contexto + Sub-menu Horizontal
- Esquerda: 2 linhas — "UNIDADE EM OPERAÇÃO" / "{nome unidade} · {visão}"
- Direita: 8 botões de domínio (mesmo set do menu lateral) em estado
  visual reduzido — só sigla, hover na cor de identidade

### 5.4. Menu Lateral (3 níveis)
- **Nível 1 (recolhido total):** barra 32px de largura, só ícones siglas
- **Nível 2 (compacto):** barra 80px, sigla + label curta, sem sub-info
- **Nível 3 (expandido):** barra 160px, sigla + label + sub-info de 3 dígitos
- **Hover (qualquer nível):** respira 2.0s + "luz por trás" (pseudo `::before`
  com background = cor de identidade + blur 4→22px + opacity 0.10→0.75).
  A luz é POR TRÁS (z-index -1, isolation isolate) — não dá volta na quina,
  vaza pelos 4 lados respeitando o retângulo 90°.
- **Ativo:** respira 2.8s + borda 1px currentColor em volta do item inteiro
  + box-shadow inset + glow 8+16px na cor de identidade

### 5.5. Blocos de Conteúdo (`.pwd-bloco`)
- Estrutura: `border-left: 3px solid {cor}` + background `navyPanel`
- Header: "[SIGLA 3 LETRAS] · TÍTULO UPPERCASE" + tag de status à direita
  + botão `EM CURSO / OK / FALHA` + botão `▾ FECHAR / ▸ EXPANDIR`
- Conteúdo: grid de KPIs ou lista de cards
- Cada KPI:
  - Label uppercase 10px color `#F4F6F9` (CEO 27/mai: forçado opacity 1)
  - Valor 20px tabular-nums color `ink`
  - Sub-info 9px color `inkDim` com letter-spacing suave

### 5.6. Card de Alerta (`.pwd-card-alerta`)
- Tag de severidade no canto superior esquerdo:
  - `CRÍTICO` (vermelho) → respira 2.8s na cor vermelha (regra K1)
  - `URGENTE` (dourado) → estático
- Título 11px bold uppercase
- Paciente 10px color `inkDim`
- Contexto 9px alinhado à direita
- Botão de ação CTA com borda 1px + hover na cor de severidade

---

## 6. ANIMAÇÕES (catálogo definitivo)

| Nome                      | Duração | Aplicado em                          | Efeito                               |
|---------------------------|---------|--------------------------------------|--------------------------------------|
| `pwd-breathe`             | 2.8s    | LOCAL/GLOBAL ativo                   | Respira verde                        |
| `pwd-breathe-red`         | 2.8s    | Card CRÍTICO                         | Respira vermelho                     |
| `pwd-breathe-cor`         | 2.8s    | Menu ativo · hover botões            | Respira na cor de identidade         |
| `pwd-pulse-glow`          | variável| Indicadores numéricos                | Pulso curto                          |
| `pwd-final-hover-pulso`   | 2.0s    | Hover do menu lateral (texto)        | text-shadow 2→12px · bright 0.92→1.35|
| `pwd-final-hover-luz-tras`| 2.0s    | Hover do menu lateral (`::before`)   | opacity 0.10→0.75 · blur 4→22px      |

**Todas as animações usam `ease-in-out infinite` por padrão.**

---

## 7. ACESSIBILIDADE E USABILIDADE

- **Contraste mínimo:** texto principal `#F4F6F9` sobre fundo `#0A0E1A` =
  contraste 15.7:1 (excede WCAG AAA · 7:1)
- **Áreas clicáveis:** mínimo 28×28px (botões VIS) · padrão 36×36px (botões header)
- **Tooltip:** todo breadcrumb e botão de ícone tem `title=""` semântico
- **Foco visual:** `:focus-visible` herda o estilo de hover (mesmo glow)
- **Atalhos:** `⌘K` para busca · `Esc` fecha modais · setas navegam menu lateral
- **Sem dependência de cor:** todo estado também é comunicado por ícone, posição
  ou tipografia (essencial pra daltônicos · 8% dos médicos brasileiros)

---

## 8. PRINCÍPIOS DE COMPOSIÇÃO

1. **Densidade alta, sem ruído.** Caio prefere ver 6 KPIs por linha em vez
   de 3 grandes. A escolha é deliberada.
2. **Sem ícones decorativos.** Só ícones funcionais (lupa, atalho, seta).
   Toda decoração é tipográfica.
3. **Hierarquia por borda esquerda colorida.** Cada bloco semântico se
   identifica pela barra vertical de 3px à esquerda (cor de identidade).
4. **Sticky-first.** Faixas 1, 2, 3 e header de bloco são todos sticky.
5. **Toggle por bloco.** Cada bloco pode FECHAR/EXPANDIR individualmente.
6. **Botão de status sempre visível.** Cada bloco mostra EM CURSO / OK /
   FALHA no header, mesmo quando recolhido.

---

## 9. PERGUNTAS PARA O DR. CLAUDE

1. **Hierarquia tipográfica:** o uso exclusivo de JetBrains Mono em TODOS
   os tamanhos (de 8px a 20px) prejudica leitura em telas <13"? Vale
   reservar uma humanist sans (Inter?) só pra parágrafos >12px?

2. **Densidade vs respiração:** o filtro Penumbra++
   (`brightness(0.99) saturate(0.97) contrast(1.16)`) some em telas OLED
   recentes (Mac M3, Samsung 4K). Faz sentido detectar `prefers-color-scheme`
   e ajustar?

3. **Luz por trás (hover):** a técnica de `::before` com `currentColor + blur`
   + `z-index: -1` + `isolation: isolate` no pai funciona consistente em
   Safari iOS 17/18? Há fallback necessário?

4. **Pulso Único:** quando o usuário faz hover SOBRE um item enquanto
   outro está respirando (ativo), são 2 respirações simultâneas. Viola K1.
   Sugere parar o ativo durante o hover, ou aceitar a sobreposição?

5. **8 domínios fixos:** o sistema cresce. Quando chegar a 12 domínios,
   esgotamos pasteis-neon distintos. Sugerir paleta secundária ou
   trocar por padrão de hachura/textura?

6. **Sub-menu nível 3:** atualmente abre com inset amarelo `#FFE600`.
   O amarelo entra em conflito visual com o dourado institucional `#F5C97A`?
   Vale trocar por outro hex?

7. **Faixa de breadcrumbs:** atualmente line-height 1.24 + intensidade igual à
   faixa 3. CEO aprovou. Você sugere algo que mantenha legibilidade e
   reforce ainda mais a sensação "documento jurídico"?

8. **Animação amplificada:** após teste Playwright, amplifiquei o pulso
   pra `brightness 0.92→1.35` e `opacity 0.10→0.75 / blur 4→22px`. Está
   no limite do "muito intenso"? Sugere envelope mais sutil que ainda seja
   perceptível em monitor profissional calibrado?

---

## 10. ENTREGA ESPERADA DO DR. CLAUDE

Por favor entregue **4 versões alternativas** do mesmo cockpit
`DashFinalPawards`, mantendo o esqueleto de 3 faixas + menu lateral + blocos,
mas explorando:

- **V1 · Densidade máxima** — mais KPIs visíveis sem scroll
- **V2 · Respiração mínima** — pulsos ainda menores, foco no estático
- **V3 · Modo claro espelhado** — paleta invertida (fundo claro, texto navy)
  pra uso em ambulatório com luz forte
- **V4 · Mobile/tablet** — adaptação pra tela 9"–11" mantendo as regras

Para cada versão, entregar:
1. Lista de mudanças vs versão atual
2. Justificativa de cada mudança em relação às regras K1/K2/K3
3. Mockup HTML/CSS estático (1 arquivo, sem dependência) que eu (Dr. Replit)
   possa importar pro mockup-sandbox e o CEO comparar lado-a-lado

---

## 10.1. STATUS NORMATIVO vs ASPIRACIONAL

Esta carta mistura **regras já implementadas** com **propostas em discussão**.
Marcação por seção:

| Seção                                  | Status        |
|----------------------------------------|---------------|
| 1. Paleta semântica                    | NORMATIVO     |
| 2. Tipografia                          | NORMATIVO     |
| 3.1, 3.2 Border-radius + Retângulos    | NORMATIVO     |
| 3.3 K1 Pulso Único                     | ASPIRACIONAL  |
| 3.4 K2 Níveis                          | NORMATIVO     |
| 3.5 K3 Faixa Visível                   | NORMATIVO     |
| 3.6 Penumbra++                         | NORMATIVO     |
| 4. Anatomia                            | NORMATIVO     |
| 5. Componentes                         | NORMATIVO     |
| 6. Catálogo de animações               | NORMATIVO     |
| 7. Acessibilidade                      | PARCIAL       |
| 8. Princípios                          | NORMATIVO     |
| 9. Perguntas                           | ABERTAS       |

**K1 Pulso Único é aspiracional**: hoje o menu ativo continua respirando
SIMULTANEAMENTE com o item em hover e com cards CRÍTICO via `:has()`. A
regra está documentada mas não plenamente aplicada — é exatamente um dos
pontos pedidos ao Dr. Claude (pergunta 4).

---

## 11. ARQUIVOS DE FONTE A CONSULTAR

URLs raw (branch `main`):

- [`artifacts/mockup-sandbox/src/components/mockups/cockpits-paciente/DashFinalPawards.tsx`](https://raw.githubusercontent.com/{REPO}/main/artifacts/mockup-sandbox/src/components/mockups/cockpits-paciente/DashFinalPawards.tsx)
- [`artifacts/mockup-sandbox/src/components/mockups/cockpits-paciente/_dashShell.tsx`](https://raw.githubusercontent.com/{REPO}/main/artifacts/mockup-sandbox/src/components/mockups/cockpits-paciente/_dashShell.tsx)
- [`artifacts/mockup-sandbox/src/components/mockups/cockpits-paciente/_pecasCockpit.tsx`](https://raw.githubusercontent.com/{REPO}/main/artifacts/mockup-sandbox/src/components/mockups/cockpits-paciente/_pecasCockpit.tsx)

---

## 12. ASSINATURA

**Dr. Replit** · agente Pawards · 27/mai/2026 · 11:35 BRT
**Aguardando parecer do Dr. Claude antes de migrar regras pro `_dashShell.tsx`
real e consolidar a skill `.local/skills/pawards-cockpit-design/SKILL.md`.**

> _"O cockpit definitivo não é o mais bonito. É o que cabe na cabeça do Caio
> num turno de 12 horas sem dispersão."_ — CEO, 27/mai/2026
