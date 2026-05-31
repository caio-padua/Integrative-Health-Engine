# Proposta · EditorBlend (3º andar) · VER TODAS clicável + Preview da FOLHA

Data: 31/05/2026
Tema: no bloco 3 (EditorBlend), o modo VER TODAS deve listar todas as fórmulas,
permitir clicar numa pra emoldurar e editar, e oferecer um preview de como toda
a receita sai no papel (todos os ativos + posologia).
Origem: pedido direto do Caio (CEO).
Componente: artifacts/mockup-sandbox/.../prescricao-rapida/GpsPadua.tsx
Display: GPS CLÍNICO (rota/arquivo seguem GpsPadua).

## 1 · Estado atual

1.1. O toggle tem 2 modos: SELECIONADA e VER TODAS.
1.2. VER TODAS hoje só EMPILHA as fórmulas em modo leitura (não dá pra clicar e editar).
1.3. Cada card mostra o mini-preview da própria fórmula, mas não existe a FOLHA inteira consolidada.

## 2 · Gaps que o Caio apontou

2.1. Clicar numa fórmula do VER TODAS deveria EMOLDURAR e abrir pra EDIÇÃO.
2.2. Faltava um preview de como TODAS as fórmulas sairiam na receita (a folha): ativos + posologia de tudo.

## 3 · Decisão 1 — clique no VER TODAS

3.1. Opção A (DEFAULT): clicar no card emoldura a fórmula (borda neon) E troca o editor pra ela, voltando ao modo SELECIONADA já editando.
3.2. Opção B: clicar só seleciona/emoldura na lista; aparece botão EDITAR pra entrar no modo SELECIONADA.
3.3. Opção C: master-detail (lista à esquerda fixa + editor da selecionada à direita).
3.4. Recomendado: A — 1 clique = foco + edição, menos atrito, fiel à fala do Caio.

## 4 · Decisão 2 — preview da FOLHA inteira

4.1. Opção A (DEFAULT): terceira aba FOLHA no toggle (SELECIONADA / VER TODAS / FOLHA) com a receita consolidada como sai no papel: cabeçalho do paciente + cada fórmula com ativos (componentes) + posologia, na ordem das vias.
4.2. Opção B: a folha vive embaixo dos cards dentro do próprio VER TODAS.
4.3. Opção C: botão VER FOLHA abre overlay/modal com a receita inteira.
4.4. Recomendado: A — a folha é densa e merece tela limpa própria; mantém retângulo-dentro-retângulo.

## 5 · Combo recomendado

5.1. 1A + 2A.
5.2. VER TODAS vira clicável (emoldura + edita) e ganha a irmã FOLHA (receita consolidada).

## 6 · Escopo técnico

6.1. EditorBlend ganha prop `selecionarFormula(id)` ligada ao `setEditandoFormula` do pai.
6.2. Toggle vira 3 estados; tipo `modoVis: "SELECIONADA" | "TODAS" | "FOLHA"`.
6.3. Card do VER TODAS: onClick troca a fórmula editada + volta pra SELECIONADA; fórmula atual fica emoldurada (borda neon).
6.4. Novo `FolhaConsolidada` renderiza PACIENTE + por fórmula: ativos (componentes nome+dose) + posologia (PrescricaoPreview na VO, dose+quantidade nas demais vias).
6.5. Só UI no mockup-sandbox; sem migration, sem backend.

## 7 · Fora de escopo

7.1. Reabrir o plano FUNIL DE CATEGORIA (já entregue e merged).
7.2. Mudar formato de posologia já aprovado nas waves anteriores.
