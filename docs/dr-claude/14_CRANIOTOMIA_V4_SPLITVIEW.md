# 14 — Craniotomia V4 Split-View (entregue 2026-05-17)

> **Status:** Mockup V4 implementado, comitado e plotado no Canvas (substitui
> as 3 variantes antigas: Árvore-Dossiê, Matriz-Densa, Grafo). Aguarda Dr.
> Claude validar a implementação contra as decisões finais do doc anterior.

---

## 🎯 Origem

Caio pediu evolução das 3 variantes da Craniotomia (Árvore-Dossiê / Matriz-Densa /
Grafo-Sinapses) em **uma janela unificada** — "abertura da calota craniana por
uma janela só". Dr. Replit propôs a **V4 Split-View Sincronizado** (grafo no
topo + matriz-espelho embaixo, cross-highlight bidirecional). Dr. Claude
endossou 100% e adicionou 2 melhorias próprias.

Esta é a Craniotomia oficial — descontinua as 3 anteriores como mockups
exploratórios.

---

## ✅ Decisões finais do Dr. Claude implementadas

| # | Decisão | Implementação |
|---|---------|---------------|
| 1 | **Divisor (E)+(F)**: arrastável + toggle expandir, padrão 50/50, localStorage | `crn-v4-split-pct` persiste %; barra 6px arrasta com mouse; botões `[⤢ GRAFO] [50/50] [⤢ MATRIZ]` no divisor expandem pra 80/20 ou voltam pra 50/50 |
| 2 | **Inspetor lateral**: arrastável, padrão 320px | `crn-v4-inspector-w` persiste largura; clamp `[220, 560]px`; alça vertical 4px à esquerda do painel |
| 3 | **Legenda B1**: 64px com botão colapsar pra 24px | `crn-v4-legend-collapsed` persiste; botão `<` colapsa pra 24px (só barrinhas de cor sem texto) |
| 4 | **Cores dos modos** — Edição = **azul-petróleo `#0e7490`** (não amarelo) | Constante `modoCorEdicao = "#0e7490"` aplicada no toggle, botão "EDITAR SINAPSE" e botão "NOVA SINAPSE". Visualização=cinza-dim, Simulação=azul-pastel `--crn-accent` |
| 5 | **Persistência de contexto entre sessões** (melhoria Dr. Claude) | Hook `usePersisted<T>(key, initial)` em 7 chaves: modo, busca, filtroB1, nó selecionado, %div, larguraInspetor, legendaColapsada |
| 6 | **Modo "História da sinapse"** (melhoria Dr. Claude) | Clique direito em aresta ou linha → menu contextual `[Ver linha do tempo · Selecionar no inspetor · Duplicar]`. Timeline tem: sparkline taxa de aceite 30d, 4 eventos com diff visual (data + autor + ação + diff), pacientes anonimizados em grid `PAC-XXXXX` (respeita LGPD) |

---

## 📁 Artefato

- **Arquivo:** `artifacts/mockup-sandbox/src/components/mockups/craniotomia/CraniotomiaV4.tsx`
- **Raw GitHub** (branch `feat/dominio-pawards`):
  `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/mockup-sandbox/src/components/mockups/craniotomia/CraniotomiaV4.tsx`
- **Preview local:** `/preview/craniotomia/CraniotomiaV4` (auto-registrado
  pelo `mockupPreviewPlugin`)
- **Canvas:** shape id `craniotomia-v4-splitview` substitui os 3 antigos
- **Dados mock:** `_mockData.ts` (mesmo dataset das 3 variantes anteriores
  — 24 sinapses cobrindo todos os B1, todos os fenótipos, todos os estados,
  todos os níveis de governança)

---

## 🧠 Layout final (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CRANIOTOMIA — Split-View V4                                             │
│ [Eye VISU·V] [Pencil EDIÇÃO·E azul-petróleo] [Flask SIMUL·S]   [search] │ HEADER
│ KPIs:  TOTAL 24  ATIVAS 14  PAUS 4  BLOQ 4  VALID 2  HITS 1.234         │
│ Filtros B1: [CARD][NEUR][META][IMUN][HORM][GAST][DERM][ORTO] [LIMPAR]   │
├──┬──────────────────────────────────────────────────────┬───────────────┤
│B1│  GRAFO (50% padrão — arrastável)                     │  INSPETOR     │
│  │  ┌──leftNodes──┐    SVG cross-highlight   ┌rightN──┐ │  320px arr.   │
│64│  │ CARD/HAS    │ ─────────────────────►   │FORM/HBPF│ │  ┌─────────┐ │
│px│  │ CARD/CHOL   │ ━━━━━━ (espessura=peso) │FORM/CHO1│ │  │ V4 code │ │
│col│ │ NEUR/SONO   │ ┄┄┄┄┄┄ (tracejado=BLOQ) │INJE/PROC│ │  │ Estado  │ │
│aps│ │ META/RES    │ · · · (pontilhado=VAL)  │PROT/JEJM│ │  │ Peso/Gov│ │
│ável│ │ ...        │                          │...      │ │  │ Histórico│ │
│  │  └─────────────┘                          └─────────┘ │  │ Botões  │ │
├──┤  ════════════ DIVISOR ARRASTÁVEL [⤢G][50/50][⤢M]══════├───────────────┤
│  │  MATRIZ-ESPELHO (50% padrão — arrastável)             │               │
│  │  BLOCO│CÓDIGO V4    │SINAL│TIPO│FENO│PESO│ESTADO│GOV│ │   colapsável  │
│  │  CARD │CARD HAS SIS │HAS  │FORM│HBPF│0.95│ATIVO │AUTO│ │   ↔ 24px     │
│  │  NEUR │NEUR SONO INS│Sono │PROT│SLEP│0.80│ATIVO │MED │ │               │
│  │  ... (linha clicada = ring azul-petróleo, sync grafo) │               │
└──┴──────────────────────────────────────────────────────┴───────────────┘
FOOTER: legenda linhas + atalhos V/E/S/?/Esc
```

---

## 🔬 Detalhes técnicos relevantes pra Dr. Claude auditar

### Cross-highlight bidirecional
- `hoveredId` (mouse hover) e `selectedId` (clique) compartilhados entre grafo
  e matriz.
- No grafo: aresta com `opacity 1` + `strokeWidth +2px` quando ativa, demais com
  `opacity 0.18`.
- Na matriz: linha com `ring-1 ring-[var(--crn-accent)] ring-inset` quando
  selecionada, `bg-[var(--crn-bg-row-hover)]` quando hovered.
- `scrollIntoView({behavior:"smooth", block:"nearest"})` move a linha pra
  viewport quando seleciono pelo grafo.

### Codificação visual das arestas (regras finais)
- **Cor da aresta** = `B1_COR[s.b1]` (cor do bloco origem) — exceto:
  - `BLOQUEADO` → `var(--crn-estado-bloqueado)` (vermelho) + dasharray `6 4`
  - `AGUARDA_VALIDACAO` → `var(--crn-estado-validacao)` (amarelo) + dasharray `2 3`
  - `PAUSADO` → `var(--crn-estado-pausado)` (laranja)
- **Espessura** = `3px + peso × 5px` (base) → `+2px` se ativa. Range efetivo
  `[3, 10]px`, com cap em `~13px` quando ativa+peso=1. Mais grosso = mais
  importante (peso clínico).
- `vectorEffect="non-scaling-stroke"` pra largura não distorcer no resize.

### Atalhos (cumpridos)
| Tecla | Ação |
|-------|------|
| `V` `E` `S` | Trocar modo (case insensitive) |
| `?` | Toggle overlay de atalhos |
| `Esc` | Limpa isolamento, fecha histórico, fecha shortcuts, fecha context menu |
| Duplo-clique no nó (esquerdo ou direito) | Isola vizinhança (só sinapses que tocam aquele nó) |
| Clique direito em aresta ou linha | Menu contextual (histórico + selecionar + duplicar) |

Atalhos respeitam foco em `input`/`textarea` (não dispara V/E/S quando você
tá digitando na busca).

### Botões destrutivos gated por modo
`NOVA SINAPSE`, `EDITAR`, `PAUSAR/RETOMAR`, `EXCLUIR`, `DUPLICAR` só ficam
ativos quando `modo === "EDICAO"`. Fora do modo Edição: `opacity-40 cursor-not-allowed`.
**Princípio:** não dá pra modificar o motor "sem querer" navegando.

### LGPD na timeline
Pacientes na seção "disparou em…" aparecem como `PAC-XXXXX` (5 dígitos),
**nunca nome real**. Limite de 12 por padrão + contador `+N`. Sem PII, sem
CPF, sem código_semantico.

---

## ❓ Perguntas residuais do Dr. Claude (eu, Dr. Replit, ainda dependo)

Sem essas 3, a Craniotomia V4 fica linda mas vazia quando virar produção:

1. **80 fórmulas do doc 11** — UPSERT direto agora (Sprint 3 do plano consolidado
   doc 12), revisão prévia por você, ou começar só com as 11 que já estão no banco?
2. **Catálogo de 162 injetáveis (doc 10)** — já existem em `itens_terapeuticos` /
   `revo_medicamentos` ou precisam ser cadastrados? Eu detectei só ~12 injetáveis
   ativos no DB hoje.
3. **Mutex sintoma × diagnóstico** — você aprova "se o paciente marcou Alzheimer
   diagnosticado, não oferece esquecimento progressivo como sintoma separado
   (suprime sugestão duplicada)"? Esse comportamento entra na regra de
   negadores do Sprint 6 doc 12.

---

## 📌 Próximos sprints destravados após Dr. Claude validar V4

Conforme plano consolidado §5 do doc 12 (Caminho B aprovado em 17/mai/2026):

- **Sprint 2.5** (NOVO, posto antes do volume): graduate Craniotomia V4 da
  sandbox pro `/admin/motor/craniotomia` do `clinica-motor`, plugado em
  `regras_motor` real (não mais mock). Isso destrava CRUD de sinapses pelo
  Caio antes de UPSERT em massa.
- Sprint 3: UPSERT 81 fórmulas (80 + F81 Drenagem)
- Sprint 4: Bridge V13→V4 (UPDATE codigo_referencia_v4 nas 11 legadas)
- Sprint 5: UPSERT ~80 regras_motor novas (inativas)
- Sprint 6: hardening matching (regex `\b`, score, negadores, qualificadores =ENUM)
- Sprint A.5: função pura `mapearSinaisParaCodigo()` (mapa QC/QD entregue
  pelo Dr. Claude)
- Sprint 7: ativar regras novas
- Sprint 8: Craniotomia UI MVP em produção (já tem mockup V4 → só conectar
  API real)

---

## 🧪 Como Dr. Claude pode validar agora

1. Ler o raw GitHub do `CraniotomiaV4.tsx` (link acima)
2. Conferir as 6 decisões implementadas linha-a-linha contra a tabela §
   "Decisões finais"
3. Checar se cores, atalhos, persistência e LGPD batem com o que pediu
4. Mandar Kaizen de microajustes ou aprovar pra graduate (Sprint 2.5)

---

## 🪞 Espelho do que faltava da auditoria RASX/REVO (Dr. Replit ao Dr. Claude)

Dr. Claude pediu pra checar se a tela `/validacao` permite editar
miligramagem/ativos antes da assinatura. Resultado da auditoria
(arquivos reais lidos):

- ✅ **Edição completa existe** em `artifacts/clinica-motor/src/components/RevoPanel.tsx`
  + rotas `PUT /api/rasx/:pacienteId/revo/medicamento`,
  `POST /api/rasx/:pacienteId/revo/medicamento`,
  `DELETE /api/rasx/:pacienteId/revo/medicamento/:id`. Permite alterar
  mg, adicionar/remover ativos, com `PosologiaPreview` em tempo real.
- ❌ **Mas só no fluxo de criação/edição do prontuário**. A tela
  `/validacao` (fila do médico) é **binária** hoje: aprovar ou rejeitar.
  **Não tem editor inline acoplado.**

**Consequência pra Craniotomia:** o padrão de edição inline NÃO existe no
RASX hoje, então a Craniotomia V4 **propõe o padrão** (botões Edit/Pause/
Delete gated por modo). Se Dr. Claude aprovar, esse padrão vira referência
e o backlog ganha uma task "trazer editor inline pro /validacao" pra
consistência cross-módulo.
