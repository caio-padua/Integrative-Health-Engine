# PROPOSTA — Agendamento automático a partir da TABELA GERAL (RAS KAIZEN v8)

- Data: 11/06/2026
- Autor: Dr. Replit
- Sistema: RAS KAIZEN v8 (Apps Script, Instituto Pádua) — PARALELO ao PAWARDS
- Status: aguardando decisão do item 8 (Caio)

## 1. Decisões já travadas pelo Caio (11/06/2026)

1.1. Agenda das medicações injetáveis = **AGENDA ENFERMAGEM LOCAL**.

1.2. RAS enviado AO PACIENTE = **modelo Premium** (navy/dourado).

1.3. Layout do RAS deve ser **idêntico ao do script atual** (clone fiel, sem reinventar).

1.4. Gerar **TODOS os agendamentos de uma vez**, sem colisão de horário.

## 2. Janelas de atendimento (capacidade)

2.1. Segunda a sexta: **08:00–12:00** e **14:00–18:00**.

2.2. Sábado: **09:00–13:00**.

2.3. Domingo: fechado.

## 3. Âncora e cadência

3.1. Primeira data: **sábado 13/06/2026**.

3.2. Cadência declarada pelo Caio: **a cada 15 dias**.

## 4. Algoritmo anti-colisão (resolve "não batam um no outro")

4.1. Cada visita tem uma **duração** (item 5).

4.2. O motor mantém um mapa de **ocupação** por dia e só encaixa a visita no **próximo slot livre** dentro das janelas do item 2.

4.3. Se o dia âncora encher, transborda para os dias úteis seguintes da mesma quinzena (respeitando 08–12 / 14–18 / sáb 09–13).

4.4. Nunca sobrepõe outra visita já alocada nesta geração.

4.5. Granularidade dos slots: 5 minutos (parametrizável no topo do arquivo).

## 5. Duração por tipo (TEMPO_POR_TIPO — já portado)

5.1. A duração da visita vem do tipo de via/procedimento (EV, IM, SC, IMP, PRC).

5.2. Quando há várias substâncias na mesma visita, a duração é a **soma** dos tempos.

## 6. RAS Premium pro paciente

6.1. Reaproveita a função existente `gerarRASSelecionado(linha, false)` (Premium).

6.2. Anexa/Link o PDF no convite enviado ao paciente (e-mail + agenda dele).

## 7. RAS-Contingência (conferência manual)

7.1. Variante do mesmo layout com cabeçalho EXATO:
     "RAS - Registro de Administração de Substâncias - FAP - Ficha de Auditoria de Processo".

7.2. Selo "CONTINGÊNCIA — conferência manual".

7.3. Entrega separada (não vai pro paciente; é interno).

## 8. DECISÃO ABERTA (única que muda o resultado) — A/B/C

8.1. A planilha tem, por substância, um **FREQ próprio** (7, 15, 30, 60 dias) e um **nº de sessões (SESS)**.

8.2. O Caio disse "a cada 15 dias começando 13/06". Preciso saber como casar isso com o FREQ de cada substância:

8.3. **A (RECOMENDADA):** cadência ÚNICA de **15 dias pra todo mundo**, 1ª onda 13/06/2026; o paciente vem de 15 em 15 dias e recebe o que estiver previsto; o nº de visitas = maior SESS do protocolo. (Simples, casa com a fala do Caio.)

8.4. **B:** respeitar o **FREQ individual de cada substância** (semanal vai semanal, mensal vai mensal), só usando 13/06 como ponto de partida; pode gerar visitas fora da quinzena.

8.5. **C:** **híbrido** — a base é 15 dias (item A), mas substâncias de FREQ menor (ex.: 7 dias) ganham visitas intermediárias extras.

## 9. Roteamento de agenda

9.1. Injetáveis → **AGENDA ENFERMAGEM LOCAL** (resolvida por nome via `CalendarApp.getCalendarsByName`).

9.2. Consulta/implante → agenda médica (regra `determineCalendarRouting`, ajustável).

## 10. Regras de calendário CONFIRMADAS pelo Caio (11/06/2026)

10.1. Cadência = **sábado a cada 15 dias**, 1ª onda **13/06/2026**.

10.2. Se o sábado estiver **aberto** (dentro da janela) → marca no sábado.

10.3. Se o sábado **não** estiver aberto → marca no **primeiro dia útil** seguinte.

10.4. REGRA NOVA (consolidação): como os pacientes são **empresários**, TODAS as aplicações da
      semana daquele paciente (seg→dom) vão num **ÚNICO dia** eleito pra ele.

10.5. Ou seja, o paciente vem 1x por janela quinzenal e recebe tudo que está previsto naquele ciclo.

## 11. COMPARAÇÃO — PAWARDS (TypeScript) vs Script Google (resposta ao Caio)

11.1. As regras **NÃO são as mesmas** hoje. Detalhe:

11.2. PAWARDS TEM motor de agenda real: janelas de disponibilidade (`availability_rules`),
      slots transacionais com trava (`FOR UPDATE` + índice único anti-colisão) e sync Google.

11.3. Script Google NÃO tem motor de slots/anti-colisão — só lê a planilha e gera RAS;
      o agendamento com anti-colisão é COISA NOVA que estou criando agora.

11.4. A regra de **consolidação (item 10.4) NÃO existe em NENHUM dos dois** — é IP clínica nova.

11.5. Expansão protocolo→sessões datadas: PAWARDS tem PARCIAL (`motorPlanos.ts`), script não tem.

11.6. Conclusão: PAWARDS já tem os 80% difíceis (janela + anti-colisão + sync); faltam só
      consolidação (10.4) e expansão completa.

## 12. DECISÃO ESTRATÉGICA ABERTA — onde mora o motor (A/B/C)

12.1. **A (RECOMENDADA):** terminar no **PAWARDS** (sistema real) — só faltam 10.4 + expansão;
      começar a usar o PAWARDS pra agendar; script vira quebra-galho SÓ pra imprimir RAS.
      Dependência: os protocolos (substâncias por paciente) precisam estar no PAWARDS.

12.2. **B:** motor completo no **script Google** agora (rápido, usa a planilha que já tem dados,
      porém é código descartável).

12.3. **C:** **híbrido** — motor mínimo no script agora pra destravar JÁ + mesma regra no PAWARDS
      em paralelo (regra definida 1x neste `.md` como fonte única).
