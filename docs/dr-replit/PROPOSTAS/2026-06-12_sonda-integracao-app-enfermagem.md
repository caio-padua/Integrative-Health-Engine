# Sonda de integracao do app da enfermagem (teste ponta a ponta)

Data: 12/06/2026
Autor: Dr. Replit
Status: IMPLEMENTADO (opcao B, default recomendado)

## 1. Contexto

1.1. O CEO perguntou se o app foi testado de verdade criando paciente
ficticio e rodando o fluxo com N variaveis.

1.2. Resposta honesta: ate agora so existiam testes PUROS de logica
(tests/test_app_enfermagem.mjs), que rodam no `node` do Dr. Replit.

1.3. O Apps Script NAO roda no ambiente do Dr. Replit.

1.4. Logo, o fluxo que toca Planilha + Drive + Cache + PDF nunca tinha
sido exercitado de ponta a ponta — so a logica isolada.

## 2. Problema

2.1. Um teste de integracao de verdade precisa rodar DENTRO da conta do CEO.

2.2. Mas nao pode sujar dado real: nada de criar linha de paciente que fique
na planilha, nada de mandar PDF/email para paciente real, nada de deixar
paciente real bloqueado por tentativa de PIN.

## 3. Opcoes

3.1. Opcao A — so manter os testes puros.
3.1.1. Custo: zero.
3.1.2. Risco: a camada Planilha/Drive/PDF segue sem nenhuma prova viva.

3.2. Opcao B — SONDA hibrida (RECOMENDADA, default). [IMPLEMENTADA]
3.2.1. Le um paciente real (SOMENTE LEITURA) para provar list/carga/chaves/PIN.
3.2.2. Faz o round-trip de Drive num paciente FICTICIO isolado, e apaga no fim.
3.2.3. Testa PIN errado e bloqueio sem deixar rastro (limpa o cache no fim).
3.2.4. NUNCA gera PDF nem email para paciente real.
3.2.5. Custo: um botao no Panel; risco operacional ~ zero.

3.3. Opcao C — harness que FABRICA uma linha de paciente ficticio na planilha.
3.3.1. Cobertura maxima (inclui montagem de sessoes + RAS-FAP PDF de verdade).
3.3.2. Risco: ESCREVE na TABELA GERAL / CADASTRO PACIENTES; se a limpeza
falhar, sobra lixo na planilha real.
3.3.3. Decisao: NAO implementar agora; so com OK explicito do CEO, e ainda
assim com backup automatico antes de escrever.

## 4. Decisao

4.1. Default executado: Opcao B.

4.2. Arquivo: TesteEnfermagem.gs, funcao runSondaEnfermagem().

4.3. Botao no Panel: "RODAR SONDA (app enfermagem ponta a ponta)".

## 5. O que a sonda valida (baterias)

5.1. A — lista de pacientes nao vazia; acha um paciente com sessao real.

5.2. A2 — a carga da tela NAO vaza cpf nem pin/hash (regressao de seguranca).

5.3. A3 — as chaves validas batem com o que a tela mostra; chave fantasma e negada.

5.4. B — o PIN derivado do nascimento confere; PIN alterado e rejeitado.

5.5. C — o endpoint rejeita substancia/sessao fora do protocolo (antes do PIN).

5.6. D — o endpoint nega PIN errado e informa tentativas restantes; depois LIMPA
o contador de bloqueio do paciente real.

5.7. E — round-trip de Drive num paciente FICTICIO: grava, idempotencia na 2a vez,
PIN errado nao grava; no fim a pasta vai para a lixeira.

5.8. F — mecanica de bloqueio + cache (sintetica, nao toca paciente real).

## 6. Pre-requisitos para rodar

6.1. Rodar com uma conta autorizada (dono do script ou email na allowlist
APP_ENF_EMAILS_PERMITIDOS) — senao a sonda aborta no portao, de proposito.

6.2. A planilha precisa ter ao menos um paciente com protocolo/sessoes; senao
as baterias B-D sao puladas (a sonda avisa).

## 7. Limite honesto

7.1. A sonda NAO testa a geracao real do PDF RAS-FAP nem o envio de email,
porque isso teria efeito colateral em paciente real (Opcao C).

7.2. Para validar PDF/email com seguranca, o caminho e a Opcao C com backup —
pendente de OK do CEO.
