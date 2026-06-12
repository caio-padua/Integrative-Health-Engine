# Acoplar o sistema de ORCAMENTO ao RAS KAIZEN v8 (Pacientes + Substancias + Financeiro)

Data: 12/06/2026
Autor: Dr. Replit
Status: ANALISE + MOTOR PURO E TESTES ENTREGUES; camada de escrita viva pendente de OK

## 1. O que o CEO pediu

1.1 Acoplar a planilha de orcamento numa aba ORCAMENTO (ja criada por ele).

1.2 A aba conversa com CADASTRO PACIENTES, CADASTRO SUBSTANCIAS e FINANCEIRO.

1.3 Ao fechar, o orcamento e lancado no FINANCEIRO com colunas novas de forma de
pagamento por paciente e quanto recebemos por mes.

1.4 Analisar tudo, verificar viabilidade e ja rodar os testes semanticos.

## 2. Diagnostico das planilhas anexadas (analise)

2.1 `RAS_TRANSFERENCIA_FINAL` ja tem as abas: TABELA GERAL, CADASTRO PACIENTES,
CADASTRO SUBSTANCIAS, COCKPIT 1-4, FINANCEIRO PACIENTE, ORCAMENTO, LEGENDA, FINANCEIRO.

2.2 ORCAMENTO (colunas): A=SUBSTANCIA/SERVICO, B=DOSE, C=SESSOES, D=FREQ (DIAS),
E=INCLUIR (1/vazio), F=VALOR UNIT, G=SUBTOTAL. SUBTOTAL = SESSOES x VALOR UNIT se INCLUIR.

2.3 CADASTRO SUBSTANCIAS ja tem preco: G=PRECO UNIT, H=PRECO 3M, I=PRECO 6M,
J=PRECO 12M, alem de E=FREQ (DIAS) e F=SESSOES. Ou seja, a aba ORCAMENTO pode puxar
preco/freq/sessoes da substancia automaticamente.

2.4 CADASTRO PACIENTES: A=NOME, B=CPF, C=CELULAR, D=EMAIL, nascimento dia/mes/ano.

2.5 FINANCEIRO PACIENTE: A=PACIENTE, B=VALOR TRATAMENTO, C=VALOR PAGO, D=VALOR PENDENTE.

2.6 FINANCEIRO: dashboard (pacientes ativos, total tratamentos, recebido, pendente,
% inadimplencia, substancias mais prescritas, pacientes com pendencia).

## 3. Viabilidade — ALTA (provada por numeros reais)

3.1 Todos os insumos ja existem nas abas; nada precisa ser inventado.

3.2 A matematica do orcamento e 100% deterministica, entao virou motor puro testavel.

3.3 Os parametros de desconto sao os da PROPRIA planilha do CEO (paciente Luciano,
total 15960): a vista 15% (13566), entrada 50% com 10% (14364 / 7182 / 2x 3591 /
3x 2394), entrada 30% com 5% (15162 / 4548,6 / 2x 5306,7 / 3x 3537,8), calculadora
livre sobre o total cheio (entrada 20% = 3192, saldo 12768, 2x com taxa 5,59% =
13523,99). O motor reproduz esses numeros (ver testes).

## 4. Decisoes que precisam do CEO (A/B/C com default)

4.1 Faixa de preco da substancia (PRECO UNIT vs 3M/6M/12M):
4.1.1 A [DEFAULT]: escolher a faixa pela DURACAO do programa em meses (>=12 -> 12M,
      >=6 -> 6M, >=3 -> 3M, senao UNIT). E o significado natural das colunas.
4.1.2 B: usar sempre PRECO UNIT (ignorar faixas).
4.1.3 C: deixar o operador escolher a faixa manualmente por item.

4.2 Colunas novas no FINANCEIRO (forma de pagamento + receita mensal):
4.2.1 A [DEFAULT]: aditivas no FINANCEIRO PACIENTE -> E=FORMA PAGAMENTO,
      F=VALOR ENTRADA, G=PARCELAS, H=VALOR PARCELA, I=RECEITA MENSAL. Mantem as
      colunas A-D atuais intactas (so ADICIONA, honra o veto de schema).
4.2.2 B: criar aba nova FINANCEIRO RECORRENTE so com a projecao mensal.
4.2.3 C: nao tocar no FINANCEIRO; so gerar o orcamento.

4.3 Como o orcamento vira lancamento:
4.3.1 A [DEFAULT]: botao no Panel "GERAR ORCAMENTO DO PACIENTE" (le itens da aba
      ORCAMENTO, calcula cenarios) + "LANCAR ORCAMENTO NO FINANCEIRO" (grava a linha
      do paciente com forma de pagamento e receita mensal).
4.3.2 B: lancamento automatico ao marcar um status "FECHADO" na aba ORCAMENTO.
4.3.3 C: so calcular, lancamento manual pelo operador.

## 5. O que ja foi entregue nesta rodada

5.1 `ras-kaizen-v8/Orcamento.gs` — motor PURO (subtotal, total, descontos, cenarios
A/B/C, calculadora livre com taxa de cartao, receita mensal, faixa de preco por meses,
montagem de itens a partir do catalogo, e DTO de lancamento no financeiro).

5.2 `ras-kaizen-v8/tests/test_orcamento.mjs` — testes semanticos que extraem as
funcoes reais do .gs (zero drift) e batem com os numeros reais da planilha do CEO.

## 6. Limite honesto

6.1 A LEITURA/ESCRITA viva nas abas (puxar substancias, gravar no FINANCEIRO) precisa
do runtime do Apps Script — entra como botoes no Panel + sonda, igual ao app da
enfermagem, apos o CEO escolher 4.1/4.2/4.3.

6.2 Push pro GitHub: o token atual esta invalido/expirado (auth falhou); o CEO precisa
reconectar o provedor GitHub no painel pra eu conseguir empurrar os commits.
