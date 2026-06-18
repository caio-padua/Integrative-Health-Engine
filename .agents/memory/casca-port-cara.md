---
name: Casca LayoutPawards portada do CARA
description: Decisões e armadilhas ao transformar o chrome do layout-referência CARA na casca real LayoutPawards (gate de escopo, face override, verificação sem login).
---

# Casca LayoutPawards = chrome do CARA

A casca oficial adotou a moldura do layout-referência aprovado no canvas
(3 faixas + menu por níveis + painel de contexto), mantendo o contrato
`<LayoutPawards face? children>` intacto para todas as telas que a importam.

## Regra de ferro: toda ferramenta de chrome liga na lógica REAL
Botões/toggles do chrome NÃO podem ser decorativos nem fabricar estado.
**Por quê:** o CEO trata "ectoplasma" (UI que finge funcionar) como falha grave.
**Como aplicar:** cada controle chama o hook real (clínica, som, auth, busca ⌘K);
o que não tem fonte de dados real fica "—", nunca um número inventado (ex.: timer
de sessão e KPI "potencial" foram deixados vazios, não chutados).

## Gate de escopo no seletor de unidade (controle de acesso)
O toggle LOCAL/GLOBAL e a troca de unidade DEVEM respeitar o escopo do usuário:
só `consultoria_master`/`consultor_campo` veem "Visão Global"; perfil operacional
(unidade única) fica travado na própria unidade, sem caminho para
`setUnidadeSelecionada(null)`.
**Por quê:** deixar GLOBAL clicável por qualquer perfil é broken access control —
elevação de escopo pela interface (apontado em code review). O ClinicContext já
modela isso (escopo + unidadesDisponiveis); a casca tem que espelhar, não afrouxar.
**Como aplicar:** ao mexer em qualquer switcher de unidade/clínica, derive o gate
do escopo e esconda os controles para quem não tem permissão; não confie só no backend.

## Override de face por usuário sobrepõe a prop da tela
A escolha CLARO/ESCURO do usuário (persistida) sobrepõe a prop `face` que cada
tela passa. **Por quê:** a prop é o default da tela, mas a preferência manual do
usuário vence. **Como aplicar:** face efetiva = override ?? prop; ao adicionar
toggles globais de tema, manter essa precedência.

## Armadilha: screenshot do preview sai SEM a chrome
A ferramenta de screenshot abre o preview deslogado; como a casca faz
`if (!user) return <>{children}</>`, qualquer rota aparece como conteúdo puro,
sem faixas/menu — isso NÃO é bug da casca.
**Como verificar de verdade:** LSP do arquivo zerado + HMR limpo + confirmar nos
logs do api-server que as queries que só existem nas faixas novas dispararam
(prova de que a casca montou com usuário real). Login dev existe mas o screenshot
tool não carrega o cookie.
