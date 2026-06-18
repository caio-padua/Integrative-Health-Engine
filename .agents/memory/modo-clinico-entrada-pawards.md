---
name: Modo Clínico — entrada do Pawards
description: Decisão de produto sobre a tela/fluxo de entrada do Pawards ao logar (anti "me senti perdido").
---

# Modo Clínico — entrada do Pawards

Regra: ao logar, o Pawards NÃO entra mais na "Visão Global" (que confundia o
CEO — "não sabia onde estava" e cogitou migrar pro Manager). Entra DIRETO na
unidade real do CEO, o **Instituto Pádua (unidade ID 15)**, e mostra uma tela
inicial simples `/inicio` com poucos cartões grandes em PT-BR (Atender / Agenda /
Pacientes / Pendências / Validar / Prescrição rápida) + link "Abrir painel
completo" → `/dashboard`.

Navegação: a sidebar tem dois modos. Default = **menu enxuto** ("DIA A DIA",
8 itens). Botão no rodapé da sidebar alterna pra **menu avançado** (menu
completo `getNavGroups`). A escolha do modo persiste em `localStorage`
`pwx.menu.modo`. O logo do header e o redirect pós-login apontam pra `/inicio`.

Persistência de unidade: a escolha de unidade fica em `localStorage`
`pawards.unidade.selecionada.v1` (`"global"` = Visão Global = null). Só entra no
Pádua automaticamente na 1ª vez (sem escolha salva); depois respeita a última
escolha do usuário, inclusive Visão Global.

**Why:** decisão direta do CEO Caio (18/06/2026), Opção A "Modo Clínico", pra
reduzir sobrecarga cognitiva (TDAH/Asperger). LÓGICA do sistema permanece 100%
intacta — só muda a camada de entrada/navegação, nenhuma rota nova de dados.

**How to apply:** não reintroduzir Visão Global como default de entrada; manter
`/inicio` como porta padrão; menu enxuto é o default. Se mexer no `ClinicContext`,
preservar a auto-seleção do 15 só-na-1ª-vez + persistência (senão o usuário fica
preso ou volta a cair na Global). Existe um plano ESCURO antigo (`.local/session_plan.md`,
Opção B) que o sistema reinjeta sozinho — NÃO é a ordem corrente; o CEO mandou
manter o arquivo, não deletar.
