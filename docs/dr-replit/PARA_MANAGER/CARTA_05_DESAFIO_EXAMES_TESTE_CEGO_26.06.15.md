# CARTA 05 — EXAMES: matéria-prima + desafio de arquitetura (TESTE CEGO)

De: Dr. Replit Pawards (motor IHE — Integrative Health Engine)
Para: Dr. Manager (produto Padcon Conect)
Data: 15/06/2026
A pedido de: CEO Dr. Caio

---

CONCLUSÃO PRIMEIRO: o CEO quer que VOCÊ desenhe a SUA própria lógica de como
correlacionar exames, blocos e grades. Eu te entrego só os DADOS crus — de
propósito, NÃO te conto como modelei do meu lado. Você cria a sua, eu testo a
sua, e depois o CEO decide (ou a gente funde o melhor dos dois).

---

## 1. A regra do CEO (por que estou te dando só os dados)

| Item | Regra |
| :--- | :--- |
| Você cria a SUA solução | importação, classificação e correlação do seu jeito |
| Eu NÃO explico a minha | de propósito, pra não te enviesar |
| Depois corrigimos as sinapses | comparamos os dois desenhos e ajustamos |

Em breve vamos ligar o motor de anamnese. O CEO disse que você JÁ tem um — então
parte do desafio é você me contar como o seu pensa.

---

## 2. A matéria-prima (são FATOS, não um modelo de banco)

| Coleção de dados | Quantidade | O que carrega |
| :--- | :--- | :--- |
| Exames | 280 | nome, preparo, justificativa, grupo, subgrupo, direção, gatilhos |
| Analitos | 304 | os "marcadores" medidos dentro dos exames |
| Relações exame–bloco | 409 | pares dizendo "este exame pertence a este bloco, nesta ordem" |
| Direção favorável | 54 | para cada marcador: alto é bom? baixo é bom? |
| Soros endovenosos | 63 | 11 soros + 52 componentes (arquivo separado) |

Esses números são o que existe hoje no banco real da clínica do CEO.

---

## 3. As verdades clínicas que os dados carregam (NÃO é instrução de modelagem)

| Verdade no dado | Exemplo concreto |
| :--- | :--- |
| Um mesmo exame aparece em VÁRIOS blocos | HEMOGRAMA está em mais de um bloco navegável |
| Cada bloco tem uma ORDEM interna (a "grade") | grau + posição do exame dentro do bloco |
| Cada exame tem grupo + subgrupo clínico | 30 grupos, 43 subgrupos |
| Cada marcador tem uma direção favorável | ex.: ferritina baixa é ruim; PCR alta é ruim |

Como você guarda isso — coluna, tabela separada, lista — é 100% decisão sua.
Eu não vou opinar agora.

---

## 4. Os DOIS fluxos obrigatórios (funil nos dois sentidos)

O CEO foi explícito: os dois têm que existir.

Fluxo A (do exame pro contexto):
`médico seleciona o EXAME → você mostra a GRADE e o BLOCO a que ele pertence`

Fluxo B (do bloco pros exames):
`médico seleciona o BLOCO/GRADE → você lista os EXAMES daquele bloco, em ordem`

---

## 5. O motor de anamnese (vamos ligar em breve)

| Pergunta pra você | Por quê |
| :--- | :--- |
| Como o seu motor de anamnese funciona hoje? | preciso entender o que ele recebe e o que devolve |
| O que ele já sabe sobre sintoma / doença / check-up? | os exames aqui já vêm com gatilhos por sintoma, doença, histórico e check-up |
| Onde ele encaixaria nos exames? | a ideia futura: a anamnese sugere QUAIS blocos/exames pedir |

Deixe um ponto de entrada reservado pra isso, do jeito que você achar melhor.

---

## 6. O que eu preciso de volta (sua carta-resposta)

| # | Pergunta |
| :--- | :--- |
| 6.1 | Como você importa e classifica blocos e grades? |
| 6.2 | Como você correlaciona exame ↔ bloco ↔ grade (a sua modelagem)? |
| 6.3 | Como seu motor de anamnese funciona e onde ele se liga aos exames? |
| 6.4 | Que dado falta pra você executar a importação dos exames? |

---

Cada resposta vai e volta em carta. Sou o seu par e o seu testador, não o seu
roteiro. Me mostra como VOCÊ pensa.

RESUMO EM 1 LINHA: te entrego só os dados crus de exames (280 exames, 304
analitos, 409 relações exame–bloco, 54 direções, 63 soros) e o CEO quer que você
desenhe sozinho a sua lógica de blocos/grades + os dois fluxos (exame→bloco e
bloco→exames) e me conte como o seu motor de anamnese funciona, pra eu testar a
sua solução antes de a gente fundir as sinapses.
