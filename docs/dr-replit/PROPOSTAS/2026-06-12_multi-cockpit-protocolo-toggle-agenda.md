# Proposta — 4 cockpits + numero de protocolo + apagar por linha + toggle agenda (RAS KAIZEN v8)

> Data: 12/06/2026
> Autor: Dr. Replit
> Sistema: Apps Script PARALELO (conta clinica.padua.agenda), NAO o PAWARDS nativo.
> Status: AGUARDANDO o "OK" do Caio nos defaults (anti-ectoplasma) antes de codar.

## Contexto real (lido no Code.gs)

1. Hoje existe 1 aba COCKPIT.
   1.1. `estruturarCockpit_` (~L639): paciente em B4, data base em B8:D8,
        substancias nas linhas 13-27 (A:C substancia, D sessoes, E:F freq, G:I inicio).
   1.2. O nome "COCKPIT" e HARDCODED dentro de `aplicarEstruturaCompleta` (~L323/374).
2. `lancarProtocolo` (~L1421) le o COCKPIT e grava na proxima linha vazia da
   TABELA GERAL (nome, CPF, celular, email, datas, blocos de 6 colunas por substancia).
3. A TABELA GERAL NAO tem ID unico por protocolo — identifica por NOME e pela
   LINHA fisica. Existe so a numeracao "#" da coluna A (sequencial, nao por protocolo).
4. RAS Juridico: toggle no Panel (`toggleJuridico`) passa `comJuridico` pro
   `gerarRASSelecionado(rowNum, comJuridico)`. E o padrao que vamos copiar pro toggle de agenda.
5. Bug da dose: o match de substancia usa `normalizeHeader_` (~L125) +
   `findColByHeader_`. "TESTOSTERONA BIO 200 MG" (com espaco) nao casa com
   "200MG" porque a normalizacao mantem o espaco simples entre numero e unidade.
6. Agenda: colunas de controle AGENDA HASH / EVENTOS / LANCADO EM / STATUS;
   `apagarTudoAgendado_` apaga eventos pelos IDs guardados em AGENDA EVENTOS.

## Regra de ferro respeitada

1. Schema so ADITIVO: coluna nova "NUMERO PROTOCOLO" (nunca dropar/renomear as existentes).
2. Nomes semanticos completos, zero abreviacao, zero emoji em texto tecnico.
3. Code.gs e espelho: as features novas moram em .gs novos; o unico hook dentro
   do Code.gs (lancarProtocolo / aplicarEstruturaCompleta) e marcado e aditivo.
4. Operacoes destrutivas (apagar linha) so com confirmacao dupla.

## DECISAO 1 — Quantos cockpits

> Voce disse "ate o 4" e depois "mais 2 abas"; assumo 4 no total.

- **A (recomendada):** 4 cockpits TOTAL — COCKPIT (atual) + COCKPIT 2 + COCKPIT 3 + COCKPIT 4.
- B: 3 cockpits total (COCKPIT + 2 + 3).
- C: outro numero que voce disser.

## DECISAO 2 — Como cada cockpit lanca (sem conflito entre as 4 pessoas)

- **A (recomendada):** 1 botao so, que lanca a partir da ABA ATIVA (a pessoa
  abre o cockpit dela, clica LANCAR; o motor le a aba em que ela esta).
- B: 4 botoes separados (LANCAR COCKPIT 1/2/3/4) no Panel.

## DECISAO 3 — Campo numero de protocolo no cockpit

- **A (recomendada):** uma celula nova "Nº PROTOCOLO" em cada cockpit, dropdown
  de 000 a 100 (texto de 3 digitos, preserva o zero a esquerda).
- B: digitar livre (sem dropdown).

## DECISAO 4 — Dois protocolos pro MESMO paciente

- **A (recomendada):** cada protocolo vira uma LINHA propria na TABELA GERAL,
  distinguida pela coluna nova "NUMERO PROTOCOLO" (mesmo paciente, 2 linhas).
- B: sobrescrever o protocolo anterior do paciente (perde o historico — nao recomendo).

## DECISAO 5 — Apagar protocolo pelo Panel (por numero de linha)

> Reaproveita o campo "Nº da linha (TABELA GERAL)" que ja existe no Panel.

- **A (recomendada):** botao "APAGAR PROTOCOLO DA LINHA" que (1) apaga os eventos
  do Google Agenda daquela linha e (2) REMOVE a linha inteira (deleteRow), com
  CONFIRMACAO DUPLA. Aviso: remover a linha desloca as linhas de baixo pra cima
  (os numeros de linha abaixo mudam).
- B: so LIMPA o conteudo da linha (mantem a linha vazia, NAO desloca as outras).
- C: as duas como botoes distintos (apagar-e-remover / apagar-e-manter-vazia).

## DECISAO 6 — Toggle "ja lancar na agenda" ao emitir o protocolo

- **A (recomendada):** uma celula no cockpit "LANCAR NA AGENDA AO EMITIR? SIM/NAO"
  (default NAO); se SIM, ao clicar LANCAR o motor cria os eventos da linha nova na hora.
- B: toggle no Panel (igual ao RAS Juridico), valendo pro proximo lancamento.

## DECISAO 7 — Bug da dose "200 mg" vs "200mg"

- **A (recomendada):** tornar o MATCH tolerante a espaco entre numero e unidade
  (normalizar removendo o espaco antes de mg/ml/mcg/g/ui) — corrige o lancamento
  sem reescrever a planilha (zero risco). Forma canonica de comparacao: "200MG".
- B: alem do match tolerante, o botao "aplicar estrutura completa" REESCREVE os
  nomes na planilha pra forma canonica (mais limpo, porem mexe em texto existente).
- C: so reescrever (sem tolerancia no match) — nao recomendo (fragil).

## DECISAO 8 — Botao "aplicar estrutura completa" expandido

- **A (recomendada):** o botao passa a, numa rodada so:
  - criar/reparar as abas COCKPIT 2/3/4 (idempotente — nao duplica se ja existem);
  - conferir e alinhar os nomes dos BLOCOS DE MEDICACAO da TABELA GERAL com o
    TITULO e com a aba CADASTRO SUBSTANCIAS, corrigindo divergencias;
  - aplicar a tolerancia/normalizacao de dose (Decisao 7);
  - gerar um LOG do que foi corrigido (transparencia, nada silencioso).

## DECISAO 9 — Tirar botoes em excesso do Panel

> Preciso do seu aval no que e "excesso". Proposta default:

- **A (recomendada):** manter os essenciais e remover/agrupar os redundantes;
  eu te mando a LISTA EXATA do que sairia ANTES de remover, pra voce vetar item a item.
- B: voce me diz agora quais botoes quer fora.

## DECISAO 10 — Testes semanticos

- Cobertura pura (sem Sheet/Calendar) pra: numero de protocolo 000-100, match de
  dose tolerante, separacao de linhas por protocolo do mesmo paciente, e o alvo do
  lancamento por aba ativa.
- Botao novo "RODAR TESTES SEMANTICOS (multi-cockpit + protocolo)" no Panel.

## Sugestoes extras (o que sugiro a mais)

1. BACKUP automatico da TABELA GERAL (uma copia datada da aba) ANTES de qualquer
   deleteRow — rede de seguranca pra operacao destrutiva. (recomendo LIGAR)
2. AVISO de duplicidade: se voce lancar paciente + numero de protocolo que JA
   existe na TABELA GERAL, o motor avisa antes de gravar (evita protocolo repetido sem querer).
3. Confirmacao do apagar exigindo DIGITAR o numero da linha de novo (anti-clique-errado).
4. Carimbo de "origem" no cockpit (qual das 4 abas gerou) numa coluna nova
   aditiva, pra auditoria de quem lancou o que.

## Viabilidade

- SIM, da pra fazer tudo SEM quebrar o codigo atual: as features novas ficam em
  arquivos .gs novos + colunas aditivas; o COCKPIT atual continua funcionando.
- Unico ponto que toca o Code.gs e generalizar `lancarProtocolo`/`estruturarCockpit_`
  pra aceitar o nome da aba (mudanca aditiva, com o nome antigo comentado).
