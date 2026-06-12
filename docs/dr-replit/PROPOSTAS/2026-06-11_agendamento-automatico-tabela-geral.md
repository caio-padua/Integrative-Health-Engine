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

11.4. CORREÇÃO (eu tinha errado): a consolidação **JÁ EXISTE no script** como
      comportamento PADRÃO. No cockpit, `lancarProtocolo` usa UMA data de protocolo
      (B8/C8/D8) e cada substância herda **"a data do protocolo"** (Code.gs L1446/L1504/L1518);
      a coluna INICIO é OPCIONAL e só serve pra **intercalar** (L687/L717). Ou seja, por
      padrão TODAS as substâncias do paciente caem num ÚNICO dia. Isso é exatamente o item 10.4.

11.4.1. No PAWARDS isso NÃO está implementado assim (a expansão é por fase em `motorPlanos.ts`).

11.4.2. O QUE REALMENTE FALTA nos dois: garantir a consolidação **ao longo dos ciclos
        recorrentes** quando substâncias têm FREQ diferentes (7/15/30/60) — sem isso, as
        sessões repetidas DRIFTAM pra dias diferentes e quebram a regra "1 dia por semana
        por paciente". O motor novo precisa FORÇAR tudo da janela pro dia eleito.

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

## 13. REGRA DE LIBERAÇÃO POR OCUPAÇÃO — CONFIRMADA NO PAWARDS (sim, existe)

13.1. A regra "manhã enche primeiro, tarde só abre depois de bater um percentual" **EXISTE e está
      ligada** no PAWARDS (não é só tabela). Prova:

13.2. Tabela `smart_release_config`: turno manhã (08:00–12:00), turno tarde (13:00–18:00),
      `limiar_liberacao_percent` (default **60%**), por unidade/profissional.

13.3. Rota motor `POST /agenda-motor/smart-release` (agenda-motor.ts L1295–1345): pra cada dia,
      calcula `% ocupado da manhã`; se `>= limiar` → **libera a tarde** (`liberado=true`);
      se não → mantém a tarde **travada** (`liberado=false`).

13.4. Trava no agendamento (L487–488): tentar marcar slot não liberado dá erro
      "Slot ainda nao liberado (turno da tarde aguardando limiar)".

13.5. NUANCE HONESTA (o que NÃO existe ainda): hoje a tarde é liberada **toda de uma vez** quando
      a manhã bate o limiar. A liberação **gradual por partes da tarde** (1ª parte → 2ª parte →
      última parte, cada uma por percentual) que o Caio descreveu **NÃO** está implementada.

13.6. Conclusão: a sua memória estava CERTA nesta — diferente da consolidação, esta regra
      foi portada pro PAWARDS.

## 14. BOTÕES DO PAINEL (script) — viabilidade e idempotência

14.1. "Lançar tudo da planilha pra agenda": POSSÍVEL. O botão é FÁCIL; o trabalho é o MOTOR
      atrás (consolidação + anti-colisão + cadência). Dificuldade real: MÉDIA.

14.2. IDEMPOTÊNCIA (não repetir o que já foi lançado): adicionar na TABELA GERAL colunas
      ocultas **AGENDADO_EM**, **EVENT_IDS** (ids dos eventos criados) e **HASH_PROTOCOLO**
      (hash de substâncias+datas+freq). Na re-execução: linha com hash igual = PULA;
      hash mudou = reagenda só o delta.

14.3. "Reagendar tudo": apaga eventos pelos EVENT_IDS guardados e recria. FÁCIL.

14.4. "Reagendar só o que não foi reagendado": flag **REAGENDADO_EM** por linha; processa só
      quem não tem a flag. FÁCIL.

14.5. "Apagar tudo que foi agendado" (interpretei "pagar" = APAGAR/deletar): percorre os
      EVENT_IDS e deleta do Google Agenda. FÁCIL. (Se for "marcar como pago/confirmado",
      é outra coisa — confirmar com Caio.)

14.6. TESTES SEMÂNTICOS: dá pra criar `runTestesSemanticos()` no script (harness com asserts):
      datas parseiam, zero colisão, consolidação (semana do paciente num dia só), fallback de
      sábado fechado, expansão FREQ/SESS correta, idempotência (re-run cria 0 novos).

## 15. RECOMENDAÇÃO AFIADA (depois de confirmar o PAWARDS)

15.1. O PAWARDS já tem: janelas (`availability_rules`) + anti-colisão transacional + sync Google
      + **liberação por ocupação** (item 13). O script NÃO tem nada disso.

15.2. Construir botões + motor + testes NO SCRIPT é **reinventar** o que o PAWARDS já faz bem.

15.3. Por isso a recomendação reforça a **opção A** (motor mora no PAWARDS); o que falta lá é só
      consolidação + expansão (e, se quiser, a liberação gradual da tarde do item 13.5).

## 16. EVOLUÇÃO DA REGRA DE OCUPAÇÃO — 4 SUB-BLOCOS + TOGGLE + BIDIRECIONAL (pedido Caio 11/06/2026)

16.1. SUB-DIVISÃO: cada turno vira **2 partes** → 4 sub-blocos no dia:
      manhã-1, manhã-2, tarde-1, tarde-2.

16.2. LIBERAÇÃO GRADUAL: dentro do período ativo, cada sub-bloco abre quando o anterior atinge o
      percentual. Caio sugeriu **~25%** por degrau (parâmetro configurável).

16.3. BIDIRECIONAL (novo): o dia "começa" no período que receber o **1º agendamento**.
      - Se começar pela manhã → tarde só libera quando a **manhã** estiver completa.
      - Se começar pela tarde → manhã só libera quando a **tarde** estiver completa.
      (Hoje o motor só faz manhã→tarde, uma direção.)

16.4. TOGGLE DE EXCEÇÃO POR DIA (novo): botão na ferramenta da agenda "seguir regra" / "quebrar
      regra naquele dia". Caio destrava → faz agendamento manual fora da regra → trava de novo;
      o cadastro feito **permanece**.

16.5. IMPLEMENTAÇÃO PROPOSTA (PAWARDS, aditivo): nova tabela `smart_release_excecoes`
      (unidade_id, profissional_id, data, regra_ativa boolean default true, motivo,
      criado_por_id, criado_em). Quando `regra_ativa=false` para aquele dia:
      - o booking **pula** a verificação de `liberado` (permite manual);
      - o motor smart-release **ignora** aquele dia (não re-trava o que foi marcado).
      Migration via **psql aditiva** (NUNCA db push — P008).

16.6. GAP RESUMIDO (hoje → novo):
      - Hoje: 2 blocos, manhã→tarde, tudo de uma vez a 60%, sem sub-bloco, sem toggle, 1 direção.
      - Novo: 4 sub-blocos, degraus de ~25%, bidirecional, com toggle de exceção por dia.

16.7. VIABILIDADE: **SIM**, tudo possível no PAWARDS. É evolução do motor que já existe
      (item 13), não reescrita. Esforço: **médio**.

16.8. PARÂMETRO A CONFIRMAR: percentual do degrau (default recomendado **25%**) e se o cruzamento
      manhã↔tarde abre a 100% ("completa") ou também por degrau.

## 17. CONSULTA / RETORNO em agenda SEPARADA do médico (decidido + implementado 12/06/2026)

17.1. CONTEXTO: o Caio cadastrou **CONSULTA** e **RETORNO** como itens da aba
      CADASTRO SUBSTANCIAS (categoria CONSULTA / RETORNO, **sem via**). Eles NÃO
      estão no array `CATALOGO_SUBSTANCIAS` (hardcoded) — só na planilha.

17.2. DECISÃO: CONSULTA e RETORNO vão pra **AGENDA MEDICO - CAIO PADUA - LOCAL**;
      injetáveis continuam na **AGENDA ENFERMAGEM - LOCAL**. Cada um vira **evento
      SEPARADO** (consulta nunca grudada no injetável).

17.3. IMPLEMENTAÇÃO (`AgendamentoMotor.gs`):
      - `classificarItemAgenda_` detecta CONSULTA/RETORNO de **dois jeitos**
        (cinto e suspensório): pela **categoria** E pelo **nome** (`\bCONSULTA\b` /
        `\bRETORNO\b`), porque categoria pode vir vazia (item 17.1).
      - `montarMarcacoesAgenda_` divide cada ida por **agenda alvo + grupo** e
        ordena médico (consulta, depois retorno) antes da enfermagem.
      - `duracaoGrupoAgenda_`: consulta **60min**, retorno **30min**.
      - Anti-duplo-agendamento do paciente: `ocupadosPorDia` impede que consulta
        no médico e injetável na enfermagem caiam no mesmo horário (o paciente é
        uma pessoa só).
      - `try/catch` por evento: uma falha não derruba os demais (status PARCIAL,
        idempotente, retenta na próxima rodada).

17.4. TESTES SEMÂNTICOS (9 a 18) no `testesSemanticosAgenda_` + reforço em
      `AgendamentoGoogleCalendar.gs` (`TEMPO_POR_TIPO.retorno=30`,
      `determineCalendarRouting` roteando `retorno` → médico).
