# Estrategia de validacao do app da enfermagem SEM trabalho manual recorrente

Data: 12/06/2026
Autor: Dr. Replit
Status: IMPLEMENTADO (opcao A, default recomendado)

## 1. Pedido do CEO

1.1 Nao fazer trabalho manual recorrente.

1.2 Guardar as coordenadas de teste no sistema (pasta "sistema paralelo Tabajara").

1.3 Acionar o Dr. Code pra validar; ou eu propor uma estrategia melhor.

## 2. Restricao real (anti-ectoplasma)

2.1 Nenhuma IA executa Apps Script (nem Dr. Replit, nem Dr. Code).

2.2 O runtime do Apps Script so roda na conta Google do script.

2.3 Portanto a execucao viva sempre exige OU 1 clique OU um gatilho automatico
instalado uma unica vez.

## 3. Opcoes

3.1 Opcao A — gatilho automatico + auditoria do Dr. Code. [IMPLEMENTADA, default]
3.1.1 Botao "INSTALAR GATILHO DA SONDA": 1 clique, uma vez.
3.1.2 Depois a sonda roda sozinha todo dia e manda o resultado por email.
3.1.3 Dr. Code audita codigo + coordenadas via raw (pasta Tabajara).
3.1.4 Trabalho manual recorrente: ZERO.

3.2 Opcao B — sonda manual (1 clique sempre que quiser testar).
3.2.1 Sem gatilho; o CEO clica "RODAR SONDA" quando quiser.
3.2.2 Trabalho manual: 1 clique por teste.

3.3 Opcao C — fabricar paciente ficticio na planilha pra cobrir PDF+email.
3.3.1 Cobertura maxima (inclui geracao real de PDF e envio).
3.3.2 ESCREVE em dado real; exige backup antes e remocao no fim.
3.3.3 Decisao do CEO; nao implementada sem OK explicito.

## 4. Decisao

4.1 Default executado: Opcao A.

4.2 Arquivos: `ras-kaizen-v8/GatilhoSonda.gs`,
`sistema-paralelo-tabajara/COORDENADAS_DE_TESTE.md`,
`sistema-paralelo-tabajara/BRIEFING_DR_CODE.md`.

4.3 Botoes novos no Panel: "INSTALAR GATILHO DA SONDA" e "REMOVER GATILHO DA SONDA".

## 5. Limite honesto

5.1 O Dr. Code NAO roda a sonda; ele audita. A prova viva vem do gatilho/clique.

5.2 PDF+email reais seguem fora (Opcao C, pendente de OK do CEO).
