---
name: Injetáveis usam o mesmo TomadasEditor da VO
description: Regra de UI da prescrição rápida (GpsPadua) — EV/IM/SC tratados como a VO, com carve-outs.
---

# Injetáveis (EV/IM/SC) na prescrição rápida

Decisão (pedido CEO 31/05/2026): injetáveis devem se comportar como a prescrição
de fórmulas (VO), não como uma "linha única" de período+horário.

Regras:
- EV/IM/SC usam o MESMO `TomadasEditor` da VO → permitem mais de 1 aplicação/dia.
- A miligramagem (campo `dose`) é FIXA do cadastro da fórmula → read-only no cockpit.
- APRESENTAÇÃO (pedido CEO 01/06, simplifica o de 31/05): topo do injetável mostra
 SÓ a apresentação, em retângulos (1 fato por chip). Removidos os campos MG e DOSE
 POR APLICAÇÃO do topo.
 - `apresentacao` (string) = read-only, separada por "·"; guarda SÓ os fatos de
 origem: qtd/frasco-ampola + volume mL ("500 mg/frasco · 10 mL"). Caneta pode ter
 fatos sem mL ("0,5 mg/dose · caneta multidose · 1 aplicação").
 - Concentração mg/mL NÃO se digita: é CALCULADA (`concentracaoCalculada`, mg ÷ mL)
 e exibida num chip DESTACADO (borda sólida na cor da via + "= 50 mg/mL"), com a
 fórmula no tooltip. Sem mL → sem chip de concentração.
 - `dosePorAplicacao` foi REMOVIDO. A dose por aplicação (nº de ampolas) agora vem
 do campo DOSES da tomada → `ampolasPorAplicacao(s) = Math.floor(dosesPorDia(s))`.
 O campo `quantidade` serve SÓ como fonte da unidade (ampola/frasco/aplicação).
- Preço do injetável é POR AMPOLA: helpers `ampolasPorAplicacao` / `unidadesCobranca`
 (=ehInjetavel? sessoes×ampolas : sessoes) / `custoTotal` (=preco×unidadesCobranca).
 `ampolasPorAplicacao(s)` = `Math.floor(dosesPorDia(s))` = SOMA das doses do dia.
 Serve SÓ para cobrança e para o TOTAL do rodapé (`sessoes × soma-do-dia`).
- ATENÇÃO (bug CEO 01/06): cada LINHA de período no "COMO SAI NA RECEITA" usa a dose
 da PRÓPRIA tomada (`n = t.doses`), NUNCA `ampolasPorAplicacao` (a soma). Ex: 2 frascos
 de manhã + 1 à noite → duas linhas "Aplicar 2 frascos" e "Aplicar 1 frasco"; o rodapé
 soma 3. Usar a soma na linha fazia TODOS os períodos mostrarem "3 frascos".
 **Why:** posologia é por janela do dia; a soma só vale pro total dispensado/orçamento.
- Consulta/avaliação (PRC, `ehConsulta` = via PRC && nome ~/consulta|avalia/): no 3º
 andar (VER TODAS + FOLHA) usa `consultaResumo` → "N consultas / avaliação com
 duração de {dose} · {frequenciaNatural minúsculo}".
- Preview e FolhaConsolidada dos injetáveis passam por `PrescricaoPreview`.
- Bloco "COMO SAI NA RECEITA" do injetável é autocontido: 1a linha = nome+dose
 (prop `comTitulo`, só no card por-via; na folha o nome já vem no cabeçalho),
 2a linha = "Aplicar {qtd} {via} — {período}" SEM relógio (horário vive no campo+mensageria),
 rodapé = 3 linhas ROTULADAS (preferência final CEO 31/05, um fato por linha (baixa dispersao)):
 "Quantidade: N {unidade-plural}" / "Sessões: N aplicações" / "Frequência: A cada 7 dias".
 ATENÇÃO: o rótulo é "Sessões" (mantém correspondência com o campo SESSÕES do card);
 a palavra "aplicações" vai no VALOR, não no rótulo (correção CEO 01/06).
 Unidade lida do campo QTD; frequência traduzida por `frequenciaNatural` (1×/sem→"A cada 7 dias",
 quinzenal→15, mensal→30, diária→"Diária", única→"Dose única"). Render via `rodape?` em
 linhasPrescricao + branch em PrescricaoPreview; VO/IMP/PRC usam `quantidade` string single-line.
- FREQUÊNCIA: só SC mantém dropdown (datalist); IM/EV são texto livre puro.

**Why:** receita de injetável tem que sair legível como posologia real, não como
resumo seco; e a concentração (mg) é dado de fábrica, não escolha de cockpit.

**How to apply:** o discriminador é `ehInjetavel(via)` (EV|IM|SC). IMP/PRC ficam de
fora — mantêm o resumo curto QUANTIDADE e a linha única período+horário.

# Navegação por teclado (Enter)

`navPorEnter` move o foco pro próximo `input/select/textarea` dentro do card marcado
com `data-campos`; Shift+Enter volta. Setas NÃO são sequestradas — quebrariam o
stepper de número, o seletor de hora e a troca de opção do dropdown (decisão A).
