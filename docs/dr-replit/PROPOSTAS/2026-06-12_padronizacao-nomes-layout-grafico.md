# Padronizacao de nomes + layout PENUMBRA + grafico no orcamento

- Data: 12/06/2026
- Autor: Dr. Replit
- Sistema: RAS KAIZEN v8 (Apps Script PARALELO, fora do build PAWARDS)
- Status: motor de NOMES entregue e testado (32 OK / 0 FALHA). Layout e grafico
  especificados aqui, glue do Panel pendente da validacao do CEO.

## 1. Problema real (medido na planilha)

1.1 A mesma substancia aparece com 3 grafias diferentes entre abas.
1.2 Exemplo: `COENZIMA Q10` (CADASTRO) / `Coenzima Q10 injetavel` (ORCAMENTO) /
    `COENZIMA Q10 100MG` (FINANCEIRO).
1.3 Pior: unidade trocada — `VITAMINA B12 2500MCG` no CADASTRO virou
    `VITAMINA B12 2500MG` no FINANCEIRO (mcg != mg).
1.4 Sem nome igual, as abas NAO se comunicam (PROCV/lookup falha).

## 2. Regra de nome canonico (implementada em Padronizacao.gs)

2.1 Formato: `Nome Da Substancia <dosagem colada>` — ex.: `Coenzima Q10 100mg`.
2.2 Sem acentos em tudo.
2.3 Cada palavra: primeira letra maiuscula, resto minusculo.
2.4 Excecao caixa alta: palavra com digito (`Q10`, `B12`, `D3`, `ET-7`, `CT-15`),
    com sinal (`NAD+`), letra unica (`Vitamina C`, `Complexo B`) ou sigla conhecida
    (`NAC`, `HCG`, `DMSA`, `DHEA`, `PQQ`, `ADEK`).
2.5 Dosagem colada na unidade em minusculo: `100 MG` -> `100mg`; `600.000 UI` ->
    `600.000ui`; `2,5MG` -> `2,5mg`.
2.6 CADASTRO SUBSTANCIAS = FONTE DA VERDADE. As outras abas sao casadas contra ele.
2.7 Fail-closed: se o nome livre nao casar por prefixo de palavra inteira, ou a dose
    for ambigua/inexistente, fica marcado SEM_CORRESPONDENCIA e NAO e alterado.

## 3. Varredura sobre os dados REAIS (relatorio_varredura.mjs)

3.1 17 ocorrencias varridas: 13 casadas (corrige grafia/unidade), 4 a revisar.
3.2 A revisar (CEO precisa decidir o apelido -> qual item do CADASTRO):
    - `Testosterona bioidentica` (ORCAMENTO/TABELA L5) — qual dose? 25/200/1000mg
    - `Tirzepatida` sem dose (ORCAMENTO/TABELA L7) — 2,5 / 5 / 10mg
    - `Vitamina D injetavel` (ORCAMENTO/TABELA L9) — casa com `Vitamina D3 600.000ui`?
    - `Peptideo X (emagrecimento)` (TABELA Edneia L6) — nao existe no CADASTRO

## 4. Decisao SEM_CORRESPONDENCIA — opcoes

4.1 A [recomendado]: criar uma aba `APELIDOS SUBSTANCIA` (de -> para) que o CEO
    preenche 1x; a varredura le os apelidos antes de marcar a falta.
4.2 B: corrigir na mao so estas 4 linhas e seguir.
4.3 C: deixar como esta (orcamento nao puxa preco desses itens).

## 5. Layout PENUMBRA TDAH/TOC dos blocos (especificacao)

5.1 Cada bloco = retangulo com MOLDURA PRETA GROSSA externa (borda ~2-3px).
5.2 Primeira linha do bloco = faixa em tom PASTEL (titulo), tambem com moldura preta
    grossa por baixo (linha separadora forte).
5.3 Conteudo interno alinhado A ESQUERDA por uma LINHA VERTICAL unica (mesma coluna
    de inicio pra rotulos e valores), JetBrains Mono, 0px radius.
5.4 Aplicar em: ORCAMENTO (blocos de cenario A/B/C) e FINANCEIRO PACIENTE.
5.5 Glue Apps Script: `aplicarLayoutBloco_(aba, intervalo, corPastel)` + botao Panel.

## 6. Grafico no orcamento pro cliente (especificacao)

6.1 Objetivo: cliente VER o investimento de forma simples.
6.2 A [recomendado]: 1 grafico de COLUNAS comparando "A vista x Entrada+parcelas x
    Parcelado" (valor total de cada cenario) — mostra a economia visualmente.
6.3 B: grafico de PIZZA do total (entrada x saldo).
6.4 C: barra de "quanto recebemos por mes" por cenario.
6.5 Glue Apps Script: `gerarGraficoOrcamento_(aba)` (EmbeddedChartBuilder) + botao Panel.

## 7. O que ja esta PRONTO e TESTADO

7.1 `Padronizacao.gs` — motor puro (nome, dosagem, casamento, desambiguacao por dose,
    plano de varredura). Nenhum AI executa; o glue do Panel aplica quando o CEO clica.
7.2 `tests/test_padronizacao.mjs` — 32 OK / 0 FALHA.
7.3 `tests/relatorio_varredura.mjs` — relatorio BEFORE->AFTER sobre dados reais.

## 8. Proximo passo (depende do CEO)

8.1 Validar a regra de nome (secao 2) e o catalogo canonico (40 itens).
8.2 Decidir 4.x (apelidos), 6.x (tipo de grafico).
8.3 Eu construo o glue (varredura write + layout + grafico) como funcoes + botoes no
    Panel; o CEO clica pra aplicar (nenhum AI roda Apps Script).
