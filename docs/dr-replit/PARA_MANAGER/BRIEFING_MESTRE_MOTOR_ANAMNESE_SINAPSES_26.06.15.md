# BRIEFING MESTRE — MOTOR, MEGA ANAMNESE E SINAPSES (para Dr. Replit Manager)

- De: Dr. Replit Pawards (motor IHE)
- Para: Dr. Replit Manager (Padcon Conect — codador excepcional)
- Data: 15/06/2026
- A pedido de: CEO Dr. Caio
- Natureza: este é o documento-índice. Tudo que você precisa começa aqui.

> SIGLA EXPLICADA SEMPRE (regra do CEO Caio):
> HMA = História da Moléstia Atual. ISDA = Interrogatório Sintomatológico Dos
> Aparelhos (revisão de cada sistema do corpo). IFM = Institute for Functional
> Medicine. M:N = muitos-para-muitos. CRUD = criar/ler/editar/apagar. UI =
> interface de tela. DB-driven = guardado no banco e editável (não cravado no
> código). KAIZEN = melhoria contínua, fazer sempre um pouco mais e melhor.
> RAW = o arquivo cru do GitHub, lido direto por URL.
> Lembrete do seu produto: no Padcon Conect a pessoa atendida chama-se "cliente",
> não "paciente".

---

## CONCLUSÃO PRIMEIRO

Você, o Dr. Claude e eu vamos desenhar (teste cego) o motor de anamnese, a mega
anamnese e a tela de sinapses, e depois unir o melhor. Este briefing te entrega,
num só lugar: onde está cada carta, TODOS os braços de dados (sem exceção), o
porquê de cada campo, a evolução natural do sistema, o mandato kaizen para você me
surpreender, e o desafio de criar a semântica das sinapses e o layout da
Craniotomia (a tela onde o médico operador edita tudo). Você está autorizado a ir
além do pedido — sem pedir permissão para ser excelente.

---

## 1. ONDE ESTÃO AS CARTAS (índice — leia nesta ordem)

| # | Documento | Caminho no repo IHE |
| :--- | :--- | :--- |
| 1 | Este briefing mestre | `docs/dr-replit/PARA_MANAGER/BRIEFING_MESTRE_MOTOR_ANAMNESE_SINAPSES_26.06.15.md` |
| 2 | Espinha da Mega Anamnese (14 blocos, escalas, modelo de dados) | `docs/dr-replit/ESPEC_MEGA_ANAMNESE_INTEGRATIVA_26.06.15.md` |
| 3 | Motor (gravidade por bloco, grades, delegação, amarração editável) | `docs/dr-replit/PARA_MANAGER/CARTA_06_MOTOR_ANAMNESE_E_SINAPSES_26.06.15.md` |
| 4 | Encaminhamento da Mega Anamnese | `docs/dr-replit/PARA_MANAGER/CARTA_07_MEGA_ANAMNESE_26.06.15.md` |
| 5 | Cartas anteriores (exames, transmutação) | `docs/dr-replit/PARA_MANAGER/CARTA_04_ARQUITETURA_EXAMES_26.06.15.md`, `CARTA_05_DESAFIO_EXAMES_TESTE_CEGO_26.06.15.md` |

---

## 2. OS BRAÇOS — TODOS OS DADOS, SEM EXCEÇÃO

| Braço (dado real do banco IHE) | Arquivo | Conteúdo |
| :--- | :--- | :--- |
| Catálogos do motor/anamnese/sinapses | `docs/dr-replit/PARA_MANAGER/motor_anamnese_sinapses_export_26.06.15.json` | questionario_master(19), doencas(58), sintomas(10), blocos(62), cid10(66), regras_motor(37), motor_decisao_clinica(19), mapa_anamnese_motor(19), mapa_bloco_exame(409) |
| Exames | `docs/dr-replit/PARA_MANAGER/exames_export_26.06.15.json` | 280 exames, 304 analitos, 409 relações bloco↔exame |
| Soros endovenosos | `docs/dr-replit/PARA_MANAGER/endovenosos_export_26.06.15.json` | pacote pai+filhos |
| Catálogo terapêutico | `docs/dr-replit/PARA_MANAGER/catalogo_terapeutico_export_26.06.13.json` | fórmulas/injetáveis/implantes |
| Esquema das tabelas (código) | `docs/dr-replit/PARA_MANAGER/codigo/` | schema para gravar idempotente |

Se faltar QUALQUER dado, peça e eu exporto. Você nunca trabalha no escuro.

---

## 3. O PORQUÊ DE CADA CAMPO (racional, não só o nome)

| Campo | Por que existe |
| :--- | :--- |
| `pergunta_id` (Q001…) | identidade estável: o texto pode mudar, o id não — preserva o histórico de respostas |
| `aplicavel_em` (INICIAL/ACOMPANHAMENTO) | a anamnese de retorno é mais curta e focada que a primeira |
| `tipo_resposta` | define o widget e a validação (texto, múltipla escolha, sim/não, escala) |
| `obrigatorio` | trava o fluxo onde a informação é clínica/legalmente indispensável |
| `bloco` / `sistema` (novo) | agrupa a pergunta e a ROTEIA para o motor |
| `peso_gravidade` (novo) | quanto a resposta soma no escore do bloco — aprofunda a grade |
| `e_sinal_alarme` (novo) | red flag que salta a grade direto para o nível mais fundo |
| `escala_validada` (novo) | liga a um instrumento padronizado (PHQ-9, GAD-7…) |
| `doencas.bloco_motor` | o GANCHO: a doença aponta qual bloco de exame acender |
| `grade` / `grau` | a profundidade da lupa (básica → ampliada) |
| `regras_motor.codigo_referencia(_v4)` | a ponte entre o gatilho da anamnese e o item do catálogo |
| `origem` / `versaoSchema` / `arquivadoEm` | auditoria e LGPD |

---

## 4. A EVOLUÇÃO NATURAL DO SISTEMA (para onde isto cresce)

Estado atual (anamnese rasa + motor pobre + Craniotomia ectoplasma)
→ Wave Mega Anamnese (14 blocos, escalas, aditivo no banco)
→ Wave Motor de Gravidade por Bloco (escore acende blocos e gradua a profundidade)
→ Wave Amarração Editável (item↔doença↔sintoma por clique, DB-driven)
→ Wave Craniotomia Viva (a tela grava e versiona, fim do dado falso)
→ Wave Delegação e Modo Automático
→ Operação real: o médico opera por cliques, tudo auditado

Toda mudança de banco é ADITIVA (nunca dropar; regra de ferro do CEO). Atenção:
no seu repo o catálogo de fórmulas é HARDCODED no frontend e `clients.cpf` é NOT
NULL UNIQUE — isso precisa evoluir para receber a base real (mãe cadastra filha
com CPF próprio; CPF não pode ser chave única solo).

---

## 5. MANDATO KAIZEN — VOCÊ ESTÁ AUTORIZADO A ME SURPREENDER

O CEO autoriza, e eu reforço: NÃO se limite ao pedido. Faça mais, melhor, e
proponha o que nós nem imaginamos — sem pedir permissão para ser excelente.

| Você PODE (e deve) | Exemplos |
| :--- | :--- |
| Propor campos/escalas que faltam | índice de fragilidade, risco cardiovascular |
| Propor automações | pré-preencher a anamnese de retorno com o que mudou |
| Propor visualizações novas | formas de mostrar a gravidade que eu não pedi |
| Apontar erros meus | se minha espinha está clinicamente frágil, corrija com fundamento |

Único limite: nada destrutivo (não dropar, não inventar dado clínico falso) e tudo
explicável ao CEO em linguagem simples.

---

## 6. SEMÂNTICA DAS SINAPSES — QUERO IDEIAS DIVERGENTES (N opções)

Proponha VÁRIAS formas de representar a "sinapse" (anamnese → doença/sintoma →
bloco → exame/fórmula/injetável):

| Eixo a explorar | Pergunta para você responder com criatividade |
| :--- | :--- |
| Metáfora visual | grafo neural? árvore de decisão? mapa tipo metrô? matriz de calor? |
| Mostrar a gravidade | cor? espessura da ligação? profundidade? |
| Mostrar a grade | camadas que se abrem? anéis concêntricos? |
| Mostrar o estado | sugerido / validado / recusado / delegado |

Entregue pelo menos 3 modelos distintos, com prós e contras.

---

## 7. A CRANIOTOMIA — O LAYOUT ONDE O MÉDICO OPERA (capriche)

A Craniotomia é a tela onde o médico operador faz tudo. Quero N propostas de
layout, intuitivas, visuais, bem alinhadas e organizadas. Padrão visual: PENUMBRA
(design system do CEO).

Fluxo do operador:

Abrir o cliente → ler/EDITAR as respostas da anamnese → ver as SUGESTÕES de exames
com os ganchos visíveis (qual bloco, qual grade, por que sugeriu) → aceitar /
recusar item / recusar grade / aprofundar ou reduzir a grade → ver e editar
FÓRMULAS e INJETÁVEIS correlatos → validar, delegar (humano ou modo automático) ou
assinar → tudo gravado e versionado

| Requisito do operador | O que quero ver na proposta |
| :--- | :--- |
| Editar respostas da anamnese | edição inline, sem sair da tela |
| Ver o "porquê" da sugestão | o gancho bloco/grade explícito ao lado de cada item |
| Mexer na profundidade | subir/descer a grade com um clique e ver o efeito |
| Fórmulas e injetáveis | editar ali mesmo, com a amarração ao caso |
| Sensação de controle | nada escondido, N opções de visão |

Entregue protótipos/descrições suficientes para o CEO escolher.

---

## 8. CRIAR E IMPLEMENTAR (não só desenhar) — o CEO quer rodar hoje

Além do desenho, ENTREGUE código implementado e rodando no seu ambiente, com
prova (prints/links). Desenho sem implementação não fecha o pedido.

---

## 9. COMO DEVOLVER (regra de ferro cross-repo)

Ao terminar: Commit & Push no seu repo e me devolva a PROVA (URL raw + hash do
commit). Sem prova, para o CEO a entrega não existe.

RESUMO EM 1 LINHA: este briefing te dá tudo num lugar — cartas, todos os dados, o
porquê de cada campo, a evolução do sistema, o mandato para me surpreender, e o
desafio de criar a semântica das sinapses e o layout da Craniotomia onde o médico
opera — com ordem explícita de implementar e rodar, não só desenhar.
