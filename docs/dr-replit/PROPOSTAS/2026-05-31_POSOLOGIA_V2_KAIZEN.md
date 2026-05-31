# PROPOSTA — Posologia V2 Kaizen (GPS Clinico)

Data: 31/05/2026
Tema: evolucao da posologia campo-a-campo + 3o andar (editor de blend) + preview A4.
Status: AGUARDANDO escolha do Caio (A/B/C por item). Anti-ectoplasma: proposta antes do codigo.

## 0. Confirmacao de escopo

0.1 O que esta sendo construido e o DESIGN (mockup) GPS Clinico.
0.2 Consolida o caminho B+C, 6 vias (EV/IM/SC/VO/IMP/PRC), 3 modos toggle (PILHA/TIMELINE/GPS).
0.3 Vive na skill de canvas/mockup (board branco) para o Caio ver antes de ir pro app real.
0.4 Os blocos SAO interligados: substancias selecionadas alimentam o 3o andar, que alimenta a mensageria, a carta de encantamento e o preview A4. Mesmo estado, um fluxo so.

## 1. REGRA 1 — PERIODO AUTO mostra o periodo apos o horario (FEITO)

1.1 Antes: em AUTO o campo so dizia "AUTO . pelo horario".
1.2 Agora: ao digitar o HORARIO, o periodo derivado aparece (ex: "AUTO -> IM . Inicio da Manha").
1.3 Implementado nesta rodada, sem decisao pendente.

## 2. REGRA 2 — DURACAO (digitar OU selecionar)

2.1 Opcao A (RECOMENDADO) — 1 campo combobox: lista de presets (7/15/30/45/60/90 dias, 6 meses, continuo) MAS editavel (pode digitar um numero proprio).
2.2 Opcao B — 2 campos: um numero digitavel + um seletor de unidade (dias/meses).
2.3 Opcao C — manter so o seletor fixo de presets (atual).
2.4 Recomendacao: A. Um campo so, mantem a linha imaginaria, melhor dos dois mundos.

## 3. REGRA 3 — Injetaveis: frequencia de aplicacao + encaminhamento de exame

### 3a. Frequencia de aplicacao (intervalo entre sessoes)
3a.1 Opcao A (RECOMENDADO) — novo campo INTERVALO visivel so nas vias injetaveis (EV/IM/SC/IMP), com presets (diario, a cada 2/3/7/15/21/30 dias) e editavel.
3a.2 Opcao B — reusar o campo frequencia atual (diaria/semanal/quinzenal...).
3a.3 Recomendacao: A. "A cada N dias" e mais claro para o protocolo injetavel que o Caio descreveu.

### 3b. Ancora = encaminhamento de exame especifico
3b.1 Hoje a ACAO da ancora ja tem "Exame / Encaminhamento", mas e generica.
3b.2 Opcao A (RECOMENDADO) — quando ACAO = "Exame / Encaminhamento", abre um sub-campo EXAME (multi-selecao de um catalogo de exames: testosterona, vitamina D, B12, perfil hormonal, hemograma, etc) + canais de envio (email/whats/telegram).
3b.3 Opcao B — deixar o exame como texto livre na NOTA DA ANCORA.
3b.4 Recomendacao: A. Catalogo de exames selecionavel, ancorado ao marco (ex: ultima sessao / fim da formula), com disparo por email+whats+telegram para o paciente refazer o exame e comparar niveis.

## 4. REGRA 4 — Dose por tomada por periodo (KAIZEN)

4.1 Caso real do Caio: 1 dose pela manha, 2 doses no almoco (quantidades diferentes por janela).
4.2 Opcao A (RECOMENDADO, Kaizen) — "Mapa de Doses": para cada horario/periodo selecionado no 3o andar, um stepper de numero de doses (1/2/3...). O total/dia recalcula sozinho e o PING mostra "2 doses".
4.3 Opcao B — campo texto livre "1 manha, 2 almoco".
4.4 Opcao C — manter dose unica (atual).
4.5 Recomendacao: A. Mantem o alinhamento dos quadradinhos, e visual, e o paciente recebe a contagem certa na mensagem.

## 5. PINGs editaveis (pergunta do Caio)

5.1 Hoje cada PING e derivado automatico (1 por periodo com horario marcado).
5.2 A "edicao" util do PING e o numero de doses por periodo (= REGRA 4, opcao A).
5.3 As janelas de horario de cada periodo (jejum 05-07h, etc) sao configuraveis no painel de mensageria de PRODUCAO, nao por paciente (invariante do sistema).

## 6. MATRIZ DE INJECAO — marcar quadradinho = frase aparece

6.1 Conceito: uma matriz periodo x sessao (espelho da Carta de Encantamento) para os injetaveis.
6.2 Opcao A (RECOMENDADO) — ao marcar um quadradinho (ex: 4a sessao IM), aparece o campo da frase/encaminhamento daquele ponto.
6.3 Opcao B — lista linear em vez de matriz.
6.4 Recomendacao: A. Coerente com a matriz que o Caio ja aprovou na Carta de Encantamento.

## 7. VER TODAS as formulas no 3o andar

7.1 Hoje o 3o andar edita 1 formula por vez (selecionada).
7.2 Opcao A (RECOMENDADO) — toggle "VER TODAS" que empilha todas as formulas selecionadas no 3o andar.
7.3 Opcao B — manter 1 por vez.
7.4 Recomendacao: A. Mantem o "selecionar para editar" e soma a visao geral.

## 8. PREVIEW A4 / PDF da prescricao

8.1 Caio e muito ligado a estetica e quer aprovar o layout impresso.
8.2 Opcao A (RECOMENDADO) — novo bloco/modo "PRE-VISUALIZACAO A4" que renderiza a prescricao no formato impresso (cabecalho PAWARDS + Nick, formulas, posologia, rodape institucional), pronto pra virar PDF.
8.3 Opcao B — adiar para depois.
8.4 Recomendacao: A. Alto valor, fecha o ciclo "monto -> vejo como sai -> aprovo".

## 9. Default consolidado recomendado

9.1 Tudo "A" (combobox duracao, intervalo injetavel, catalogo de exames, mapa de doses, matriz injecao, ver todas, preview A4).
9.2 Se o Caio aprovar "tudo A", construo em uma rodada e atualizo o board.
