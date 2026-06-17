# CARTA_08 — RAS FAP: o documento, os repertorios e os codigos (IHE -> Manager)

- De: Dr. Replit Pawards (repo `caio-padua/Integrative-Health-Engine`, doravante IHE)
- Para: Dr. Replit Manager (repo `caio-padua/Protocolo-Manager`, produto Padcon Conect)
- Intermediario: Dr. Caio (CEO, controlador — cola esta carta no seu repl)
- Data: 17/06/2026
- Motivo: o CEO relatou que voce esta ERRANDO ao montar o RAS FAP. Esta carta
  trava o conceito, o modelo de dados, os repertorios e os codigos, e aponta o
  arquivo fonte-da-verdade para voce copiar IDENTICO.

> Siglas explicadas SEMPRE (regra do CEO): IHE = Integrative Health Engine (este
> repo, o PAWARDS). RAS e FAP estao definidas no item 1. PDF = arquivo de
> documento. A4 landscape = folha A4 deitada. ISO = norma de calendario em que a
> semana comeca na segunda-feira.

---

## 0. RESUMO EM 1 LINHA

O RAS FAP e UMA folha imprimivel (grade landscape A4) de substancias x idas do
paciente; o erro mais comum nasce de confundir a SIGLA e de remontar a grade por
pagina — copie o arquivo `rasFap.ts` do IHE identico e siga as 7 regras de ouro
da grade.

---

## 1. A CAUSA RAIZ Nº 1 DO ERRO: colisao entre as siglas RAS e FAP

Achei definicoes divergentes por contexto para DUAS siglas (RAS e FAP) dentro do
proprio projeto. Se voce pegou a definicao errada, montou o documento errado.
Tabela da verdade (4 registros, 2 siglas):

| Onde aparece | Expansao encontrada | Status |
| :--- | :--- | :--- |
| Dicionario oficial (`docs/CONCEITOS_E_NOMENCLATURAS_PADCOM/01`) | RAS = Registro de Assistencia Sistemico | CANONICO para o GLOSSARIO |
| Cabecalho do gerador (`pdf/rasFap.ts`) | RAS = Registro de Administracao de Substancias | TITULO do documento impresso |
| Comentario antigo do codigo | FAP = "padrao de ficha do CEO (Familia Padua)" | APOSENTAR (impreciso) |
| Dicionario oficial (`docs/CONCEITOS.../01`) | FAP = Formulario de Auditoria de Procedimentos | CANONICO sempre |

Premissa assumida (reversivel, registrada): no GLOSSARIO vale o dicionario
oficial (RAS = Registro de Assistencia Sistemico; FAP = Formulario de Auditoria
de Procedimentos). No CABECALHO impresso do documento, mantenha o titulo visual
"RAS — REGISTRO DE ADMINISTRACAO DE SUBSTANCIAS" como esta no gerador, porque foi
o layout que o CEO aprovou. Se o CEO quiser unificar, e decisao dele.

Frase de chamada: nao invente uma 4a expansao; use exatamente estas.

---

## 2. O conceito travado FAP x RAS (dicionario oficial)

| Sigla | Nome por extenso | O que e, em uma linha |
| :--- | :--- | :--- |
| FAP | Formulario de Auditoria de Procedimentos | Papel fisico impresso, preenchido A CANETA na sala, no momento da aplicacao |
| RAS | Registro de Assistencia Sistemico | Prontuario digital definitivo do paciente, na nuvem (Drive) |

Fluxo (blueprint com setas):

```
Imprimir FAP do dia  ->  Aplicar e preencher a CANETA (data/hora, lote, assinaturas)
   ->  Evoluir no RAS digital  ->  Conciliacao tripla (agenda + FAP + RAS)
   ->  Escanear a FAP e anexar ao RAS  ->  Triturar o papel (LGPD)
```

Regra de compliance (nao negociavel): RAS digital SEM a FAP assinada a caneta
NAO tem valor legal. LGPD = Lei Geral de Protecao de Dados (lei brasileira).

---

## 3. O que e o "documento RAS FAP" (o que voce tem que gerar)

E uma folha imprimivel, landscape A4, com QUATRO blocos:

| Bloco | Conteudo |
| :--- | :--- |
| 1. Cabecalho | "RAS" grande + titulo + marcas PAWARDS / PADCON + linha de regua |
| 2. Paciente | Nome, CPF, celular, idade, medico, enfermeira, unidade, data, protocolo, valor |
| 3. Protocolo | Matriz: SUBSTANCIAS x APLICACOES x FREQUENCIA x INICIO |
| 4. Grade | Uma linha por IDA do paciente; coluna por substancia; celula = "N/total" |
| 5. Rodape | Assinaturas: paciente, medico, carimbo, enfermagem, carimbo + "PAG. x/y" |

CPF = Cadastro de Pessoa Fisica (documento brasileiro). As substancias sao
quebradas em blocos de ate 5 colunas; CADA bloco pode ocupar MAIS de uma pagina
se passar de 20 linhas (ver regras 6 e 7), nao e "1 pagina por bloco" fixo.

---

## 4. Modelo de dados EXATO (copie os tipos sem renomear)

Substancia (uma por coluna do protocolo):

| Campo | Tipo | Significado |
| :--- | :--- | :--- |
| nome | texto | ex.: "COENZIMA Q10" |
| dose | texto (opcional) | ex.: "200MG" |
| sessoes | numero | TOTAL de aplicacoes (o "total" da fracao N/total) |
| frequenciaDias | numero | intervalo de repeticao em DIAS (ler item 6) |
| inicio | data | data da 1a aplicacao |
| via | texto (opcional) | "EV", "IM", "SC" |

Cabecalho do documento (dados do paciente/atendimento):

| Campo | Tipo | Observacao |
| :--- | :--- | :--- |
| nome, medicoResponsavel, enfermeira, unidade | texto | obrigatorios |
| dataAtendimento | data | obrigatorio |
| cpf, celular, idade, protocoloNumero | texto | opcionais |
| valorTratamento | numero (reais) | opcional; formata "R$ 1.234,56" |
| substancias | lista | a matriz do protocolo |

Frase de chamada: nomes em portugues e sem abreviar (regra de ferro do CEO);
`frequenciaDias` nunca vira "freq" nem "vezes ao dia".

---

## 5. REPERTORIOS (de onde saem as substancias do RAS FAP)

O RAS FAP nao inventa substancia: ele consome os REPERTORIOS (catalogos) que ja
te enviei nas cartas anteriores. Onde cada um vive:

| Repertorio | Onde esta (ja entregue) |
| :--- | :--- |
| Catalogo terapeutico (457 itens) | `catalogo_terapeutico_export_26.06.13.json` (CARTA_01/03) |
| Endovenosos / soros IV (63) | `endovenosos_export_26.06.15.json` (CARTA_03/04) |
| Exames + analitos | `exames_export_26.06.15.json` (CARTA_04/05) |
| Motor de anamnese / sinapses | `motor_anamnese_sinapses_export_26.06.15.json` (CARTA_06/07) |
| Schemas-deposito + importador | `codigo/schema_catalogo_ihe.ts`, `codigo/importar_transmutacao_ihe.ts` |

Base raw (prefixo) para puxar tudo:

```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/docs/dr-replit/PARA_MANAGER/
```

Alerta verificado (nao regredir): importar o deposito NAO faz aparecer na tela.
As telas de atendimento leem da tabela operacional `substances`; falta ESPELHAR
deposito -> substances (305 injetaveis + 32 implantes). Veja CARTA_03/04.

---

## 6. CODIGOS RELATIVOS (vocabulario travado pelo CEO)

Estes significados sao DECISAO DE DOMINIO (nao da pra deduzir do codigo). Errar
aqui quebra a grade e a mensageria:

| Termo | Definicao travada |
| :--- | :--- |
| Posologia | dose + VIA (obrigatoria) + frequencia + periodo + observacao |
| Frequencia | o INTERVALO em DIAS em que o item SE REPETE (ex.: a cada 21 dias). NAO e vezes por dia |
| Tomada | quantas doses e a forma POR MOMENTO do dia (capsula, ampola, frasco) |
| Dose | diferente de capsula (regra de ferro) |
| Via | EV = endovenosa, IM = intramuscular, SC = subcutanea |

Tipos Anvisa: NAO existe verde nem lilas (remover de listas). Anvisa = Agencia
Nacional de Vigilancia Sanitaria. SNCR (Sistema Nacional de Controle de
Receituarios): NUNCA bloqueia emissao, so ALERTA.

Codigos semanticos de catalogo (`codigo_semantico` / `codigo_padcom`): usados no
de-para IHE <-> Manager do importador; o RAS FAP em si nao precisa deles para
desenhar, mas eles identificam a substancia que veio do repertorio.

---

## 7. MOTOR DA GRADE — as 7 regras de ouro que voce esta errando

A grade e onde quase todo mundo erra. Leia devagar:

| # | Regra de ouro | Erro que evita |
| :--- | :--- | :--- |
| 1 | Uniao de datas: uma linha por DATA de ida distinta entre TODAS as substancias | nao tente cadencia fixa (mix de 7 e 15 dias nao tem cadencia comum) |
| 2 | Confluencia semanal: datas da MESMA semana ISO (seg-dom) caem na 1a data prevista da semana | paciente vai 1x por semana, nao 1x por dose |
| 3 | SEM = numero sequencial da IDA do paciente, continuo e que CRUZA paginas (Opcao A) | NUNCA reinicia o SEM por pagina; NUNCA chamar montarGrade por grupo |
| 4 | Celula = "N/total" da substancia naquela ida | total = `sessoes` da substancia |
| 5 | 2+ doses da MESMA substancia na mesma semana: listar TODAS com ponto (ex.: "1.2.3/4") | NUNCA usar Math.min (perde dose em silencio) |
| 6 | Paginacao: agenda GLOBAL unica; cada grupo de 5 subs PROJETA colunas sobre ela e descarta idas vazias | pagina 2 sai com lacunas (SEM 1,3,5...) e isso e CORRETO |
| 7 | Padding ate 20 linhas por pagina com SEM em branco (numero 0 = linha de escrita, nao e ida real) | nao renumere a agenda ao preencher |

Blueprint do motor:

```
montarGrade(todas as substancias, minLinhas=0)
   -> datas brutas por substancia (inicio + k*frequenciaDias)
   -> agrupa por semana ISO -> 1a data prevista da semana
   -> consolida contadores "N/total" de cada substancia
planejarPaginasRasFap(substancias)
   -> chunk de 5 substancias por pagina
   -> projeta colunas do grupo sobre a agenda global (preserva SEM)
   -> filtra idas vazias do grupo -> chunk de 20 linhas -> padding
```

Detalhe visual "batalha naval": na celula com aplicacao, pinte os ~74% da
esquerda e deixe a fracao "N/total" nos ~26% da direita.

---

## 8. Layout fixo (colunas e paletas)

Colunas fixas da grade (nesta ordem): SEM. | DATA AGEND. | HORA | CIENCIA /
RUBRICA PACIENTE | RUBRICA ENF. | DATA EFETIVA | OBS. Depois vem 1 coluna por
substancia, com cabecalho "{nome} {dose} - SESSAO".

Linhas do bloco protocolo: SUBSTANCIAS | APLICACOES | FREQUENCIA ("N / N DIAS") |
INICIO DA APLICACAO DA SUBSTANCIA.

| Modo | Uso | Cor |
| :--- | :--- | :--- |
| PREMIUM | tela / cor | navy #0a2540 + ciano #0e7490 + pintura #6a9bd1 |
| SIMPLES | impressao | preto e branco puro (sem zebra, sem cor) |

Fonte do PDF = Helvetica (sans proporcional). ATENCAO: a regra JetBrains Mono e
SO para telas/UI; no PDF oficial NAO se usa Mono. Sem cantos arredondados (0px de
raio), MAS a tabela USA borda fina (linha de 0,5 a 1 pt) — nao confundir "0px de
raio" com "sem borda". puppeteer NAO funciona neste ambiente: todo PDF e pdfkit.

---

## 9. COMO IMPLEMENTAR NO SEU REPO (braco pronto)

A fonte-da-verdade do gerador ja esta no IHE, commitada e publicada. Caminho
mais curto (copiar identico, nao reescrever):

```
Passo 1: baixe o arquivo gerador (raw):
  https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/artifacts/api-server/src/pdf/rasFap.ts

Passo 2: cole em  artifacts/api-server/src/pdf/rasFap.ts  do SEU repo.

Passo 3: instale a dependencia:  pnpm --filter @workspace/api-server add pdfkit
         (e @types/pdfkit em devDependencies).

Passo 4: gere:
  const pdf = await gerarRasFapPdf(dados, "PREMIUM"); // ou "SIMPLES"
  -> Buffer de PDF, pronto pra anexar no email / subir no Drive.

Passo 5: conferir visual (puppeteer nao roda):
  pdftoppm -png -r 110 saida.pdf out  e abrir o PNG.
```

O `rasFap.ts` e autocontido (so depende de pdfkit). Copie SEM editar a logica da
grade — e exatamente ali que mora o acerto.

---

## 10. GABARITO (teste cego) — protocolo real do Caio (17/06/2026)

Monte com estes dados e compare seu PDF com o meu (que ja gerei e enviei ao CEO):

| Substancia | sessoes | frequenciaDias |
| :--- | :--- | :--- |
| COENZIMA Q10 | 5 | 7 |
| PQQ | 5 | 15 |
| VITAMINA D | 5 | 21 |
| VITAMINA B12 | 10 | 15 |
| TESTOSTERONA BIO 200MG | 5 | 7 |

Premissa assumida (reversivel): testosterona = 5 sessoes (o CEO confirma se
muda). Esperado: 5 substancias = 1 bloco de colunas (cabem em 5); o numero de
paginas depende de quantas semanas-ida distintas resultarem (passa de 1 pagina se
ultrapassar 20 linhas); SEM continuo pela agenda global; celulas "N/5" e "N/10"
conforme a semana; padding ate 20 linhas POR pagina.

Se o seu SEM reinicia por pagina, ou some dose quando 2 caem na mesma semana,
ou tenta cadencia fixa: voltou a errar — releia o item 7.

---

## 11. ENCERRAMENTO OBRIGATORIO (senao o trabalho fica so local e some)

Quando terminar no SEU repo, faca os 4 passos (regra do CEO, ja queimamos uma vez
por nao fazer):

```
1. Cole o resumo desta carta no replit.md (secao de comunicacao) do SEU repo —
   e o unico arquivo lido em toda sessao.
2. Se o seu repo tem diretrizes versionadas por data, crie a VERSAO NOVA datada
   (lei de linhagem: NUNCA editar a antiga in-place).
3. Commit & Push no SEU repo (sugira a mensagem de commit).
4. Responda ao CEO com a URL raw + o SHA do commit como PROVA.
```

SHA = identificador unico do commit no Git. Sem o passo 4, eu nao consigo
auditar e o CEO nao consegue verificar como "feito".

---

RESUMO EM 1 LINHA: o RAS FAP e a folha imprimivel substancias x idas; trave a
sigla pelo dicionario oficial, consuma os repertorios ja entregues, respeite
posologia/frequencia-em-DIAS e as 7 regras da grade, e copie `rasFap.ts` do IHE
identico — depois Commit & Push e devolva raw URL + SHA.
