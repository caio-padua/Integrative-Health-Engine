# RAS KAIZEN v8 — espelho do projeto Apps Script (Instituto Pádua)

> Pasta-ponte criada em 11/06/2026 por Dr. Replit.
> Objetivo: ter o projeto Apps Script do Caio (sistema PARALELO ao PAWARDS)
> versionado no git, legível por inteiro pelo Dr. Code via raw GitHub.

## Conteúdo da pasta

1. `Code.gs` — espelho EXATO do Code.gs do Caio (3.445 linhas).
2. `Panel.html` — espelho EXATO do painel lateral (tema Windows 97).
3. `AgendamentoGoogleCalendar.gs` — MÓDULO NOVO (Dr. Replit), porte do
   `artifacts/api-server/src/lib/google-calendar.ts` do PAWARDS para Apps Script.
4. `README.md` — este índice.

## Contas Google envolvidas

- `clinica.padua.agenda@gmail.com` — dona do script e das agendas.
- Agendas existentes: GERAL, ENFERMAGEM (L / RE), MÉDICO CAIO.

## Mapa do Code.gs (pontos de integração)

1. Leitura de paciente + substâncias:
   1.1. `lerPaciente_(sheet, row)` (linha ~1537) — lê a linha da TABELA GERAL.
   1.2. Identidade por cabeçalho: NOME DO PACIENTE, CPF, EMAIL, CELULAR, DATA NASCIMENTO (DIA/MES/ANO).
   1.3. Substâncias em blocos de 6 colunas: SIM/NAO, SESS, FREQ, DIA, MES, ANO.

2. Geração do RAS imprimível (hoje):
   2.1. `gerarRASSelecionado(rowNum, comJuridico)` (linha ~2300) — monta planilha temp e exporta PDF.
   2.2. Layouts: `gerarLayoutRASSimples_` (P&B), `gerarLayoutRASPremium_` (navy/dourado).
   2.3. Cabeçalho atual: "REGISTRO DE ADMINISTRAÇÃO DE SUBSTÂNCIAS" + "INSTITUTO PÁDUA — MEDICINA INTEGRATIVA".

3. Fluxo Cockpit → RAS:
   3.1. `lancarProtocolo()` (linha ~1421) + `estruturarCockpit_` (linha ~639).
   3.2. Cockpit: paciente em B4; data base em B8/C8/D8; substâncias em A13:A27 (SESS=D, FREQ=E, override de início em G:I).
   3.3. Transfere pra próxima linha vazia da TABELA GERAL.

4. Painel (Panel.html): botões chamam `run(fn)` ou `runRAS(fn)`; `runRAS` pega o nº da linha em `#linhaPaciente`.

## O que JÁ está pronto

1. `AgendamentoGoogleCalendar.gs`:
   1.1. `criarAgendamentoRAS(dados)` — cria evento com descrição rica (nome, CPF, procedimentos com 👍/👎, duração, status, substâncias com 🟩🟨🟦⬜, legenda, endereço Maps/Waze) + cor do evento.
   1.2. `criarAgendamentoRASComConvite(dados)` — idem + convida o paciente por e-mail (`pacienteEmail`) e o evento entra na agenda dele.
   1.3. `determineCalendarRouting(vias)` — implante/consulta → MÉDICO; resto → ENFERMAGEM.

## O que FALTA (decidir antes de codar)

1. Agendamento automático a partir da TABELA GERAL:
   1.1. Expansão das sessões: cada substância tem início + FREQ (dias) + SESS (qtd) → gerar N datas e agrupar substâncias da MESMA data num único evento.
   1.2. HORA do dia: a planilha só tem DIA/MES/ANO, não tem hora — precisa de regra (default proposto: 09:00, parametrizável).
   1.3. Roteamento por agenda (calendarId de GERAL/ENFERMAGEM/MÉDICO).

2. RAS-Contingência (imprimível, conferência manual):
   2.1. Clonar `gerarRASSelecionado` com cabeçalho EXATO:
        "RAS - Registro de Administração de Substâncias - FAP - Ficha de Auditoria de Processo".
   2.2. Selo "CONTINGÊNCIA — conferência manual".
   2.3. Decidir layout base: Premium (navy/dourado) ou Simples (P&B).

## Regra de ouro deste projeto (do próprio Code.gs)

- Nunca ler coluna por posição fixa — sempre por cabeçalho (`findColByHeader_`).
- Headers podem ser mesclados (nome do bloco na linha 1, sub-rótulos na linha 2): usar `findBlocoDatas_`.
