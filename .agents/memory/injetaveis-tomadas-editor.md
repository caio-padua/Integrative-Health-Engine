---
name: Injetáveis usam o mesmo TomadasEditor da VO
description: Regra de UI da prescrição rápida (GpsPadua) — EV/IM/SC tratados como a VO, com carve-outs.
---

# Injetáveis (EV/IM/SC) na prescrição rápida

Decisão (pedido Caio 31/05/2026): injetáveis devem se comportar como a prescrição
de fórmulas (VO), não como uma "linha única" de período+horário.

Regras:
- EV/IM/SC usam o MESMO `TomadasEditor` da VO → permitem mais de 1 aplicação/dia.
- A miligramagem (campo `dose`) é FIXA do cadastro da fórmula → read-only no cockpit;
  o que o médico edita por injetável é `quantidade` (QTD por aplicação, ex "1 ampola").
- Preview e FolhaConsolidada dos injetáveis passam por `PrescricaoPreview`.
- Bloco "COMO SAI NA RECEITA" do injetável é autocontido: 1a linha = nome+dose
  (prop `comTitulo`, só no card por-via; na folha o nome já vem no cabeçalho),
  2a linha = "Aplicar {qtd} {via} — {período}" SEM relógio (horário vive no campo+mensageria),
  3a linha = "Quantidade: N {unidade-plural} ( 1 {unidade} a cada N dias )" — total (sessões)
  + cadência (frequência traduzida) numa frase só, em linguagem natural sem jargão.
- FREQUÊNCIA: só SC mantém dropdown (datalist); IM/EV são texto livre puro.

**Why:** receita de injetável tem que sair legível como posologia real, não como
resumo seco; e a concentração (mg) é dado de fábrica, não escolha de cockpit.

**How to apply:** o discriminador é `ehInjetavel(via)` (EV|IM|SC). IMP/PRC ficam de
fora — mantêm o resumo curto QUANTIDADE e a linha única período+horário.

# Navegação por teclado (Enter)

`navPorEnter` move o foco pro próximo `input/select/textarea` dentro do card marcado
com `data-campos`; Shift+Enter volta. Setas NÃO são sequestradas — quebrariam o
stepper de número, o seletor de hora e a troca de opção do dropdown (decisão A).
