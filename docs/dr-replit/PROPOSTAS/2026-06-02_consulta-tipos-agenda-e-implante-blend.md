# Proposta — Consulta (tipos + agenda), Via Sublingual e Implante em Blend

- Data: 02/06/2026
- Tela: mockup `GpsPadua` (prescricao-rapida), paciente mock Graco Souza Pádua
- Origem: pedido Caio 02/06 (4 blocos)
- Status: APROVADA EM DESENVOLVIMENTO (decisões com default; A/B/C no fim)

## 1. Contexto

1.1. A coluna IMPLANTES estava vazia e a CONSULTA não refletia o fluxo real.
1.2. Caio pediu redesenho das duas telas + via Sublingual + tipos de consulta.

## 2. Item 1 — Tipos de consulta clínica (pesquisa de profissionais)

2.1. Medicina integrativa = equipe multidisciplinar (regulamentada, SUS desde 2006).
2.2. Cada tipo de consulta vai para uma AGENDA própria do profissional.
2.3. Lista adotada (tipo -> agenda):

1. Médico Integrativo -> Agenda Médica
2. Nutrólogo -> Agenda Nutrologia
3. Endocrinologista -> Agenda Endocrinologia
4. Nutricionista -> Agenda Nutrição
5. Psicólogo -> Agenda Psicologia
6. Educador Físico -> Agenda Educação Física
7. Farmacêutico Clínico -> Agenda Farmácia
8. Enfermeiro -> Agenda Enfermagem
9. Fisioterapeuta -> Agenda Fisioterapia
10. Terapeuta Integrativo (PICS) -> Agenda Práticas Integrativas

## 3. Item 2 — Via Sublingual (SL)

3.1. Acrescentada como via própria (sigla SL) no dropdown e como coluna.
3.2. Comportamento: DOSE + QUANTIDADE + período/horário simples (genérico), igual
     a uma via de baixa complexidade — pode evoluir depois.

## 4. Item 3 — Tela CONSULTA (PRC consulta)

4.1. Some DOSE e QUANTIDADE da 1ª linha.
4.2. 1ª linha = TIPO DE CONSULTA (dropdown) + AGENDA (derivada do tipo, read-only).
4.3. Linha de agendamento (estilo injetável): PERÍODO + HORÁRIO + DURAÇÃO DO TEMPO
     DE CONSULTA. Sem botão "+ TOMADA".
4.4. Linha de observação (frase) abaixo, igual injetável.
4.5. SESSÕES (= quantas consultas) + FREQUÊNCIA (= intervalo entre consultas).
4.6. MENSAGEM + ÂNCORA + NOTA mantidos.

## 5. Item 4 — Tela IMPLANTES (blend de implantes)

5.1. Médico NÃO define a dose na tela: pellets/implantes vêm do CADASTRO.
5.2. Em cada paciente entram 2+ tipos de implante NO MESMO card (mesma sessão,
     mesmo dia/horário). Ex.: Gestrinona 50 mg + Gestrinona 25 mg + Testosterona 25 mg.
5.3. Cada linha do blend: nome + dose do cadastro (read-only) + QUANTIDADE (não "doses").
5.4. Botão "+ Implante Complementar" adiciona linha NO MESMO card.
5.5. Uma única linha compartilhada de agendamento: PERÍODO + HORÁRIO (todos juntos).
5.6. Custo do card = soma(preço do pellet × quantidade).
5.7. "+ adicionar" da coluna = um NOVO blend futuro (reimplante após o vencimento
     da duração do primeiro), não item solto.

## 6. Decisões (default) e pontos A/B/C

6.1. SL: default = via genérica simples (DOSE+QUANTIDADE).
6.2. Implante: mantém MENSAGEM + ÂNCORA no card (úteis), só remove dose editável.
6.3. A confirmar com Caio depois de ver a tela:
- A (recomendado): manter como acima.
- B: SL herdar o editor de tomadas da VO (doses/dia).
- C: implante sem MENSAGEM/ÂNCORA (mais enxuto).
