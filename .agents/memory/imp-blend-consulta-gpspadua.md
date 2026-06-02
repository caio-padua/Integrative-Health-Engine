---
name: IMP blend + Consulta no GpsPadua
description: Regras de instanciação do blend de implantes e fonte canônica da duração da consulta no mockup GpsPadua (prescrição rápida Pawards).
---

# IMP blend + Consulta (GpsPadua)

Mockup `prescricao-rapida/GpsPadua.tsx` trata duas vias de forma especial,
diferente das injetáveis/VO (que usam TomadasEditor).

## IMP — Blend de Implantes
Regra: cada `+ ADICIONAR` na coluna IMP cria um **novo blend** (objeto com
`itensImplante: ImplanteLinha[]`), NUNCA um pellet solto.
**Why:** Caio modela reimplante futuro como um novo blend (após o vencimento
do anterior), e os pellets do catálogo são linhas dentro de um card, não cards
soltos. Pellet solto cairia no branch genérico (DOSE+QUANTIDADE+SESSÕES),
quebrando a UX pedida.
**How to apply:** o branch é `instanciarSelecionado(s)` no `addItem` — detecta
`s.via === "IMP" && !Array.isArray(s.itensImplante)` e embrulha em blend com
1ª linha via `linhaImplante(s.id, 1)`. Dose do pellet é read-only (vem do
cadastro); médico só edita QUANTIDADE. EXTENSÃO (sessões/frequência) é omitida
pra blend. Custo = soma(preco×qtd).

## Descritivo em VER TODAS / FOLHA
Regra: blend e consulta NÃO têm dose/posologia, então o descritivo consolidado
(VER TODAS + FolhaConsolidada) precisa de branch próprio — senão cai no genérico
`${f.dose} · ...` e sai vazio (dose="").
**Why:** Caio reportou "não aparece o descritivo na folha e no ver todas" —
os dois pontos liam só `ehConsulta`, deixando o blend sem texto.
**How to apply:** ambos os spots usam
`ehImplanteBlend(f) ? implanteBlendResumo(f) : ehConsulta(f) ? consultaResumo(f) : <genérico>`.
`implanteBlendResumo` lista "Implantar na mesma sessão · N implantes: q× nome dose…".

## PRC — Consulta
Regra: a duração da consulta é canônica em `tempoConsulta`, não em `dose`.
**Why:** a 1ª linha da consulta é TIPO+AGENDA (sem dose/quantidade), e a
duração é editada na linha de agenda. Ler `dose` faz VER TODAS/FOLHA mostrarem
duração legada (60 min) mesmo após o médico mudar o tempo.
**How to apply:** `consultaResumo` lê `s.tempoConsulta ?? s.dose` (dose só
fallback legado). Agenda é derivada do tipo via `agendaDoTipo()`.
