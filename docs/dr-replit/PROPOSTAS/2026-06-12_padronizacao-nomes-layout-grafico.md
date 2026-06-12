# Padronizacao de nomes + layout PENUMBRA + grafico no orcamento

- Data: 12/06/2026
- Autor: Dr. Replit
- Sistema: RAS KAIZEN v8 (Apps Script PARALELO, fora do build PAWARDS)
- Status: motor de NOMES + APELIDOS entregue e testado (54 OK / 0 FALHA). Grafico
  7.A com glue pronto-pra-colar (OrcamentoGrafico.gs). Layout PENUMBRA especificado,
  glue do Panel pendente. Decisoes do CEO em 12/06 incorporadas (secao 9).

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

## 9. Atualizacao 12/06 — decisoes do CEO incorporadas

9.1 Item 5 = A: aba `APELIDOS SUBSTANCIA` (de -> para -> status) IMPLEMENTADA no motor.
    A resolucao agora consulta o apelido ANTES do catalogo (prioridade absoluta) e
    valida o "para" contra o catalogo (apelido que aponta pra item inexistente NAO
    resolve — fail-closed).

9.2 Item 4 (REGRA DE OURO): a IDENTIDADE da substancia e NOME + DOSE juntos
    ("Coenzima Q10 100mg"). Doses diferentes = itens diferentes. Por isso nome sem
    dose com varias doses (Testosterona Bio, Tirzepatida) NUNCA e chutado.

9.3 Apelidos pre-preenchidos por mim (fenotipo -> genotipo), como o CEO faria:
    - `Vitamina D injetavel`        -> `Vitamina D3 600.000ui`   (ATIVO, so existe 1 D)
    - `Vitamina B12 2500mg` (typo)  -> `Vitamina B12 2500mcg`    (ATIVO, so existe 1 B12)
    - `Testosterona bioidentica`    -> (vazio)  status REVISAR_DOSE  (25/200/1000mg: so o CEO sabe)
    - `Tirzepatida`                 -> (vazio)  status REVISAR_DOSE  (2,5/5/10mg: so o CEO sabe)
    - `Peptideo X (emagrecimento)`  -> (vazio)  status SEM_CADASTRO  (cadastrar antes)

9.4 Resultado da varredura real: 17 ocorrencias | 14 casadas | 3 sem correspondencia
    (so as 3 que dependem de decisao clinica do CEO: 9.3 ultimas tres).

9.5 Item 7 = A: grafico de COLUNAS dos 3 cenarios entregue como glue pronto-pra-colar
    em `OrcamentoGrafico.gs` (funcao pura `montarDadosGraficoOrcamento_` + glue
    `gerarGraficoOrcamento_`). Reusa os cenarios de Orcamento.gs (numero identico).

9.6 Testes: `tests/test_padronizacao.mjs` = 51 OK / 0 FALHA (inclui bateria de apelidos:
    ATIVO resolve, REVISAR_DOSE/SEM_CADASTRO orfao intencional, apelido vence catalogo,
    apelido pra inexistente fail-closed, retrocompat sem 3o arg, casa por chave acento/caixa).

9.7 GitHub: push resolvido INTERNAMENTE via token da integracao (conexao healthy);
    branch `ver-l2-dr-claude` empurrada. Nao depende mais de print do CEO.

9.8 Falta so do CEO: as 3 doses/cadastro de 9.3 (preencher coluna "para" da aba
    APELIDOS). O resto do glue (varredura write-back + layout PENUMBRA) eu monto como
    botoes do Panel; o CEO clica (nenhum AI roda Apps Script).

## 10. Atualizacao 12/06 (2a leva) — peptideos + glue write-back

10.1 Item 4 = SIM (dose-no-nome confirmado pelo CEO): identidade = nome + dose.
     `Vitamina B12 2500mcg` e `Vitamina D3 600.000ui` validados. `Vitamina ADEK 600.000ui`
     cadastrado.

10.2 Peptideo X resolvido: apelido `Peptideo X (emagrecimento)` -> `Tesamorelin 10mg`
     (status ATIVO). O teste que afirmava "Peptideo X -> null" foi ATUALIZADO.

10.3 Peptideos ADICIONADOS ao catalogo (grafia oficial do CEO, preservada pelo motor):
     AOD 9604 10mg, Ipamorelin 5mg, PT 141 10mg, CJC 1296 + Ipamorelin 5/5mg,
     GLOW 10/10/5mg, GHK-Cu 100mg, Selank 10mg, MOTS-C 10mg, BPC 157 + TB 500 10/10mg.

10.4 Motor (`Padronizacao.gs`): novos acronimos AOD/PT/CJC/BPC/TB/GLOW/MOTS/GHK em caixa
     alta ("Cu" de cobre NAO e sigla -> fica `GHK-Cu`). `normalizarPalavraSub_` refatorado
     com `normalizarTokenBase_` pra tratar hifen SEM digito (GHK-Cu, MOTS-C) sem recursao,
     preservando ET-7/NAD+/NAC N-Acetil. Regressao coberta por teste.

10.5 Glue write-back (`VarreduraSubstancias.gs`, NOVO) — BOTAO pedido pelo CEO:
     - `runReplicarSubstancias` -> aba REPLICA SUBSTANCIAS (espelho consolidado legivel
       do CADASTRO + APELIDOS; fonte da verdade continua CADASTRO + APELIDOS).
     - `runVarreduraPreview` -> aba VARREDURA PREVIEW (dry-run, NAO altera nada): diff
       BEFORE->AFTER com STATUS/VIA por linha.
     - `runVarreduraAplicar` -> grava o nome canonico de volta nas abas-alvo, fail-closed
       (so escreve status OK + que mudou; orfaos ficam intactos).
     - `ALVOS_VARREDURA` configuravel (aba/coluna/linhaInicio). Vazio = nada e tocado.
     3 botoes novos no Panel.html (secao "Padronizacao de Substancias").

10.6 Testes: `tests/test_padronizacao.mjs` = 66 OK / 0 FALHA (inclui bateria dos 9
     peptideos + regressao hifen). `node --check` OK nos 3 .gs + glue novo.

10.7 Code review (architect) = PASS. Ressalva registrada: REPLICA e espelho, nao fonte
     editavel — comportamento intencional e documentado no cabecalho do glue.
