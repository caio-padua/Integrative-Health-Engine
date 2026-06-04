---
name: penumbra-design-system
description: Sistema de design PENUMBRA do Caio (CEO Pawards) — a moeda PENUMBRA com duas faces, PENUMBRA CLARO (Paper Ciano) e PENUMBRA ESCURO (Navy Ciano). Use SEMPRE que for construir, redesenhar, revisar ou avaliar QUALQUER tela, layout, componente ou UI de QUALQUER projeto do Caio (dashboards, cockpits, formularios, telas operacionais, landing). Carrega os 20 principios fundadores, os tokens de cor das duas faces, a anatomia de 3 faixas + menu lateral + 2 paineis, as regras de neon e hover "luz por tras", a cognicao TDAH/Asperger/TOC do Caio e o checklist anti-ectoplasma. Leia antes de escrever qualquer linha de front-end pro Caio. NAO se aplica a backend, schema de banco, migracoes, rotas ou infra (so a camada visual/UI).
---

# PENUMBRA · Sistema de Design Padrao do Caio

Este e o DNA visual unico de todos os sistemas do Caio (CEO Pawards,
Asperger + TDAH + TOC). Foi destilado de ~2 semanas de iteracoes validadas
ao vivo (21/mai a 03/jun/2026) e das duas Cartas Magnas (docs dr-claude 22 e 23).
Nao e estetica — e arquitetura cognitiva. Cada regra existe porque uma versao
sem ela foi testada e REJEITADA pelo Caio.

> Frase-norte do Caio: "O cockpit definitivo nao e o mais bonito. E o que cabe
> na minha cabeca num turno de 12 horas sem dispersao."

## A MOEDA E SUAS DUAS FACES

- **PENUMBRA** = o layout/sistema (a moeda). Estrutura sempre identica.
- **PENUMBRA CLARO** = face clara, tecnica "Paper Ciano" (papel azulado claro, accent
  teal escuro). Uso: consultorio, dia, luz forte.
- **PENUMBRA ESCURO** = face escura, tecnica "Navy Ciano" (navy profundo, ciano
  clinico). Uso: sala de procedimento, foco, noite.
- As duas faces alternam por um toggle segmentado `[CLARO][ESCURO]` na faixa 1.
- NUNCA criar um terceiro padrao de claro nem de escuro. So existem essas faces.

## DUAS CAMADAS: NUCLEO (universal) x PERFIL COCKPIT (operacional)

Separe sempre as duas camadas ao aplicar a um projeto novo:

- **NUCLEO PENUMBRA (vale pra TODA tela, inclusive landing/form/relatorio):**
  os 20 principios (P01-P20), os tokens das 2 faces, a semantica neon x hover x
  respiracao, a tipografia mono, a quina 90, a linha vertical de 16px, o filtro
  Penumbra++. Isto e inegociavel em qualquer superficie.
- **PERFIL COCKPIT (so telas operacionais densas: dashboards, cockpits, filas):**
  a anatomia de 3 faixas + menu lateral 3 niveis + 2 paineis (secao ANATOMIA
  abaixo). Uma landing ou um formulario simples herdam o NUCLEO mas NAO precisam
  das 3 faixas nem dos 2 paineis — adaptar a estrutura ao tipo de tela.

## REGRAS DE FERRO (resumo — detalhe em reference/02-principios-fundadores.md)

1. Quina 90 graus absoluta — `border-radius: 0` em tudo. Sem excecao.
2. JetBrains Mono universal — 100% do texto, `tabular-nums` em todo numero.
3. Portugues BR em toda label de UI. Zero emoji renderizado.
4. Retangulo dentro de retangulo — hierarquia por aninhamento de bordas 1px.
5. Linha vertical imaginaria — tudo alinha por `LINHA_ESQ = 16px` a esquerda.
6. K1 Pulso Unico — apenas UM elemento "vivo" (animado/respirando) por tela.
7. Hover = "luz por tras" — brilho vem de TRAS (z-index baixo, `::before`),
   envolve os 4 lados, NUNCA pinta o miolo, NUNCA arredonda a quina.
8. Naming semantico completo — `perfil` nunca `role`; prefixos `pode_`,
   `nunca_`, `requer_`; nomes sem abreviacao.
9. Densidade alta sem ruido — preferir 6 KPIs pequenos a 3 grandes.
10. Proposta `.md` antes do codigo (anti-ectoplasma).

## SEMANTICA DE NEON x HOVER (o que e cada um)

- **NEON (cor de identidade, fixo)** = "ONDE EU ESTOU". Cada dominio tem uma cor
  pastel-neon propria; o usuario decora o dominio pela cor, nao pela sigla.
  Neon fixo marca o item ATIVO. Ver as 8 cores em reference/03-tokens-cores.md.
- **HOVER ("luz por tras", transitorio)** = "O QUE ACONTECE SE EU CLICAR".
  Feedback de foco/acao. Tecnica exata em reference/02 (P09) e reference/04.
- **Respiracao (animacao continua)** = privilegio do que esta ATIVO agora (K1),
  nunca do hover. Hover marca borda/luz sem pulsar continuamente.
- Os 3 niveis de atencao (K2): Repouso (texto apagado) -> Foco (borda na cor) ->
  Acao (respira na cor). Nunca pule niveis.

## ANATOMIA DO PERFIL COCKPIT (telas operacionais — reference/04)

> Obrigatoria em telas operacionais densas (dashboards/cockpits/filas).
> Landing e formularios simples herdam so o NUCLEO; ver "DUAS CAMADAS" acima.

```
FAIXA 1 (40px) · escopo LOCAL/GLOBAL · niveis 1·2·3 · [CLARO][ESCURO] · busca
                  ENTIDADES + busca EVENTOS · ... · operador+cargo · SOM CONFIG SAIR
FAIXA 2 (40px) · breadcrumb PAWARDS > UNIDADE > TELA · badge do bloco ativo
FAIXA 3 (40px) · ATIVO · contexto/paciente · abas espelhadas · sessao/relogio
[MENU 18/66/172] [ CORPO · blocos minimizaveis ] [CONTEXTO 200] [PULSO 200]
```

- Menu lateral: 3 niveis (18px tarja vertical / 66px siglas / 172px completo),
  troca por atalho `1/2/3`, minimiza/expande.
- 2 paineis a direita colapsaveis (CONTEXTO + PULSO); colapsados viram tarja
  vertical 18px encostada no topo.
- Chrome (faixas + menu + paineis) tem cor FIXA do perfil — NAO tinge com o bloco
  ativo. Quem muda de cor e so o proprio bloco e o item-espelho do menu.
- Tudo sticky. Tudo alinhado em LINHA_ESQ=16.

## COMO USAR ESTA SKILL

1. Antes de qualquer front-end pro Caio, leia esta SKILL inteira + os reference
   relevantes a tarefa.
2. Para entender o PORQUE e o COMO o Caio pensa: reference/01-cognicao-caio.md.
3. Para regras detalhadas (P01-P20): reference/02-principios-fundadores.md.
4. Para cores exatas das 2 faces + 8 dominios: reference/03-tokens-cores.md.
5. Para montar a tela (faixas/menu/paineis/blocos): reference/04-anatomia-layout.md.
6. Antes de entregar, rode reference/05-checklist-anti-padroes.md (inclui os
   anti-padroes A01-A13 ja rejeitados pelo Caio + corolarios A14-A17 — nao repetir).
7. Para contexto historico de como chegamos aqui: reference/06-linha-do-tempo.md.

## FONTES DE VERDADE NO CODIGO (Pawards)

- Tokens: `artifacts/mockup-sandbox/src/components/mockups/chromes-navegacionais/refinados/_design.ts`
- Shell Penumbra: `.../cockpits-paciente/_pawardsPenumbra.tsx` (LayoutPawardsPenumbra)
- Perfis pareados (faces): `.../cockpits-paciente/_perfisPenumbra.ts`
- Face clara aprovada: `.../cockpits-paciente/PenumbraClara2_PaperCiano.tsx`
- Face escura pareada: `.../cockpits-paciente/PenumbraEscura2_NavyCyan.tsx`
- Cartas Magnas: `docs/dr-claude/22_*` (layout) e `docs/dr-claude/23_*` (cockpit + P01-P20).

## REGRAS DE COMUNICACAO COM O CAIO (ao reportar trabalho de UI)

- Topicos enumerados (1, 1.1, 1.2), uma frase por linha, negrito so em palavra
  critica, zero emoji em texto tecnico, datas dd/mm/aaaa.
- Toda decisao com opcoes A/B/C + default recomendado. Nunca pergunta aberta.
- Proposta `.md` antes do codigo: `docs/dr-replit/PROPOSTAS/<data>_<tema>.md`.
- Arquivo versionado: `<NOME_SEMANTICO>_<aa.mm.dd>`.
