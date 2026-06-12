# COORDENADAS DE TESTE — app da enfermagem (RAS-FAP), RAS KAIZEN v8

Atualizado em 12/06/2026 por Dr. Replit.

Duas frentes: (A) testes puros que ja rodam no ambiente do Dr. Replit;
(B) sonda de integracao que roda no Apps Script (1 clique ou gatilho).

---

## A. Testes puros — `tests/test_app_enfermagem.mjs`

Comando: `node docs/dr-replit/ras-kaizen-v8/tests/test_app_enfermagem.mjs`
Resultado atual: 54 OK / 0 FALHA.
Metodo: o teste LE o `.gs` real e extrai cada funcao pura por casamento de
chaves (zero copia paralela — nao tem drift entre teste e fonte).

| Familia | Funcao | Variaveis cobertas | Esperado |
|---|---|---|---|
| Iniciais/rubrica | `iniciaisNomesDoMeio_`, `rubricaPaciente_` | nome composto, acento, nome unico, 2 partes, espacos repetidos, vazio, sobrenome longo (trunca so o sobrenome) | rubrica `Sobrenome, I.N.` dentro do limite |
| Nome enfermeira | `ajustarNomeCelula_` | curto intacto, longo truncado a max-2 | string <= largura |
| PIN | `derivarPin_` | acento, sobrenome <4, hifen, apostrofo, mes 1 e 2 digitos, ano 2 e 4 digitos, ano 1 digito, sempre minusculo | `sobre4+aa+mm` minusculo |
| Pastas/arquivos | `nomePastaCliente_`, `nomeArquivoRasFap_` | com/sem CPF, CPF com ponto/hifen, sufixo `(n/total)`, n=0 sem sufixo | nome canonico |
| Chave/estado | `chaveAplicacao_`, `montarSetAplicadas_` | acento/caixa/espaco, trim, sessao nula, set vazio | `SUBSTANCIA|sessao` normalizado |
| Cores agenda | `corSubstanciaAgenda_` | aplicada, proxima, futura (default) | token correto |
| Bloqueio PIN | `avaliarBloqueioPin_` | 0, max-1, max, max+1, max=0 (desligado), restantes nunca negativo | bloqueado bool + restantes >= 0 |
| Autorizacao | `emailAutorizadoApp_` | dono, vazio (nega), allowlist, fora (nega), lista vazia+nao-dono (nega), case-insensitive, separador `;`, espacos | fail-closed |

Criterio de aprovacao: 0 FALHA. Cases exatos: ver o arquivo via raw.

---

## B. Sonda de integracao — `TesteEnfermagem.gs` -> `runSondaEnfermagem()`

Acionamento: botao "RODAR SONDA (app enfermagem ponta a ponta)" no Panel,
ou gatilho automatico (secao C). Retorna JSON `{log, links}` que cai no
Console do Panel.

Invariantes de seguranca da sonda (devem valer SEMPRE):
- nao escreve/edita/apaga linha de paciente na planilha;
- nao gera PDF nem email a paciente real;
- pasta ficticia "ZZ SONDA AUTOMATICA <ts>" e enviada pra lixeira no fim;
- contador de bloqueio do paciente real e limpo no fim (nao trava a enfermeira).

| Bateria | Coordenada (o que faz) | Entrada | Resultado esperado | Criterio |
|---|---|---|---|---|
| Portao | `exigirAcessoApp_()` | conta que roda | autoriza dono/allowlist; aborta se nao | log "acesso autorizado" |
| A | listar pacientes | — | lista nao vazia | `nomes.length > 0` |
| A (sel) | achar paciente real com sessao (SO LEITURA) | ate 50 nomes | acha 1 alvo OU pula B-D com aviso | nao cria pasta de paciente real |
| A2 | seguranca da carga | alvo | carga NAO tem `cpf`, `pin`, `pinHash`; tem substancias | sem vazamento |
| A3 | chaves validas | alvo | chave real pertence; chave fantasma NAO | bool correto |
| B | PIN derivado | nascimento real do alvo | PIN certo confere; PIN alterado nao | `verificarPin_` true/false |
| C | substancia fora do protocolo | substancia fantasma + PIN qualquer | endpoint rejeita ANTES do PIN | `ok === false` |
| D | PIN errado no endpoint | substancia real + PIN errado | nega + informa `tentativasRestantes`; limpa cache do alvo no fim | `pinInvalido === true` |
| E | round-trip Drive ISOLADO | paciente FICTICIO | 1a grava (`ok`), 2a `jaAplicada`, PIN errado nao grava; pasta apagada | 3 asserts + limpeza |
| F | mecanica bloqueio + cache | sintetico | 0 nao bloqueia, teto bloqueia, cache round-trip | sem tocar paciente real |

Criterio de aprovacao: linha final "RESULTADO SONDA: X OK / 0 FALHA".
Se algum paciente nao tiver sessao parametrizada, B-D sao puladas com aviso
(nao e falha).

---

## C. Automacao (zero clique recorrente) — `GatilhoSonda.gs`

| Funcao | O que faz |
|---|---|
| `instalarGatilhoSondaEnfermagem()` | cria gatilho diario (~06h) idempotente que roda a sonda e manda o resultado por email pro dono |
| `removerGatilhoSondaEnfermagem()` | remove o gatilho |
| `executarSondaEnfermagemAgendada()` | alvo do gatilho: roda `runSondaEnfermagem()` e envia o relatorio por email |

Trabalho manual total: 1 clique em "INSTALAR GATILHO DA SONDA", uma unica vez.

---

## D. O que ainda NAO e coberto (honesto)

D.1 Geracao real do PDF RAS-FAP e envio de email ao paciente.

D.2 Motivo: so da pra exercitar isso de ponta a ponta fabricando uma linha de
paciente FICTICIO na planilha (com backup antes e remocao no fim), o que
ESCREVE em dado real — decisao do CEO, ainda pendente.
