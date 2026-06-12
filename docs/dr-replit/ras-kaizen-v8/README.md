# RAS KAIZEN v8 — espelho do projeto Apps Script (Instituto Pádua)

> Pasta-ponte criada em 11/06/2026 por Dr. Replit.
> Objetivo: ter o projeto Apps Script do Caio (sistema PARALELO ao PAWARDS)
> versionado no git, legível por inteiro pelo Dr. Code via raw GitHub.

## Conteúdo da pasta

1. `Code.gs` — espelho EXATO do Code.gs do Caio (~3.510 linhas; ganchos
   aditivos do multi-cockpit em 12/06/2026).
2. `Panel.html` — espelho do painel lateral (tema Windows 97) + seção nova
   "Agenda Automática" (5 botões).
3. `AgendamentoGoogleCalendar.gs` — MÓDULO NOVO (Dr. Replit), porte do
   `artifacts/api-server/src/lib/google-calendar.ts` do PAWARDS para Apps Script.
   Monta o evento (título, descrição rica, cor, roteamento).
4. `AgendamentoMotor.gs` — MÓDULO NOVO (Dr. Replit). Motor que lê a TABELA
   GERAL, expande/consolida sessões e lança no Google Agenda. Idempotente.
   Agora roteia CONSULTA/RETORNO pra agenda do MÉDICO em eventos separados.
5. `OrdenacaoCategoriaRas.gs` — MÓDULO NOVO. Ordena as substâncias por
   categoria SÓ na geração do RAS (em memória); nada muda na planilha.
6. `NovoProtocoloCockpit.gs` — MÓDULO NOVO. Botão que limpa só o formulário
   do COCKPIT (B4 + B8:D8 + A13:I27) pra começar outro protocolo.
7. `MultiCockpitProtocolo.gs` — MÓDULO NOVO (12/06/2026). 4 cockpits
   independentes + nº de protocolo (dropdown 000-100) + apagar protocolo por
   linha (exclusão total c/ backup) + testes semânticos.
8. `README.md` — este índice.

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

## O que JÁ está pronto (continuação)

2. `AgendamentoMotor.gs` (FEITO em 11/06/2026):
   2.1. Expansão das sessões + consolidação 1x/semana reusando o motor
        canônico do RAS (`montarAgendaParaSubstancias_`) → a agenda bate
        exatamente com o RAS impresso.
   2.2. HORA do dia: default 09:00, parametrizável em `CONFIG_AGENDA`;
        anti-colisão acha o próximo horário livre nas janelas 08-12 / 14-18;
        domingo (e sábado, por default) caem no próximo dia útil.
   2.3. Roteamento por via (`determineCalendarRouting`): implante/consulta →
        MÉDICO; injetáveis → ENFERMAGEM. Nomes das agendas em `CONFIG_AGENDA`.
   2.4. Idempotência: 3 colunas de controle na TABELA GERAL (AGENDA HASH /
        AGENDA EVENTOS / AGENDA LANCADO EM). Rodar de novo não duplica.
   2.5. 5 botões no Panel: Lançar / Reagendar pendentes / Reagendar tudo /
        Apagar / Testes semânticos.
   2.6. CONSULTA/RETORNO (cadastrados na aba CADASTRO SUBSTANCIAS, categoria
        CONSULTA/RETORNO, sem via) → **AGENDA MEDICO - CAIO PADUA - LOCAL**;
        injetáveis → **AGENDA ENFERMAGEM - LOCAL**. Eventos SEPARADOS, médico
        antes da enfermagem, anti-duplo-agendamento do paciente, try/catch por
        evento. Detecção dupla (categoria E nome), pois CONSULTA/RETORNO não
        estão no array `CATALOGO_SUBSTANCIAS`. Consulta 60min / retorno 30min.

3. `OrdenacaoCategoriaRas.gs` (FEITO em 12/06/2026):
   3.1. Ordem TRAVADA pelo Caio: 1 antioxidante, 2 vitamina, 3 hormônio,
        4 esteroide, 5 peptídeo, 6 mineral, 7 demais.
   3.2. Aplicada SÓ na geração do RAS (em memória), via `ordenarSubstanciasRas_`.
        A planilha (TABELA GERAL, COCKPIT, CADASTRO) NÃO muda.
   3.3. LIGAÇÃO necessária (1 linha aditiva no Code.gs, `montarPaginasRAS_`):
        DE  `var allSubst = paciente.substancias || [];`
        PARA `var allSubst = ordenarSubstanciasRas_(paciente.substancias || []);`
   3.4. Botão "RODAR TESTES SEMANTICOS (ordem por categoria no RAS)" no Panel.

4. `NovoProtocoloCockpit.gs` (FEITO em 12/06/2026):
   4.1. Botão "NOVO PROTOCOLO" (Alt+O) limpa só o formulário do COCKPIT
        (`clearContent` em B4, B8:D8, A13:I27). Não toca em nenhuma outra aba.

5. `MultiCockpitProtocolo.gs` (FEITO em 12/06/2026):
   5.1. 4 abas de cockpit independentes (COCKPIT, COCKPIT 2/3/4). O botão
        LANCAR age na ABA ATIVA (`cockpitAtivo_`); título da aba é dinâmico.
   5.2. Campo "Nº PROTOCOLO" no cockpit (B5, dropdown 000-100, texto 3 dígitos);
        gravado na coluna aditiva "NUMERO PROTOCOLO" da TABELA GERAL +
        "COCKPIT ORIGEM". Mesmo paciente = várias linhas (1 por protocolo).
   5.3. Toggle "LANCAR NA AGENDA AO EMITIR?" (célula F5 do cockpit); se SIM,
        `lancarProtocolo` chama `lancarAgendaTodos_({modo:'novos'})` no fim.
   5.4. Aviso de duplicidade (mesmo paciente + mesmo nº de protocolo já existe)
        — não bloqueia, só alerta no log.
   5.5. Match de substância tolerante a espaço entre número e unidade
        ("200 mg" == "200mg") via `normSemEspaco_`.
   5.6. "aplicar estrutura completa" agora cria/repara os 4 cockpits, garante as
        colunas aditivas e normaliza o espaço da dose nos nomes dos blocos.
   5.7. Botão Panel "APAGAR PROTOCOLO DA LINHA" — exclusão TOTAL (apaga eventos
        da agenda + `deleteRow`), com BACKUP datado antes e confirmação dupla.
   5.8. Botão Panel "RODAR TESTES SEMANTICOS (multi-cockpit + protocolo)".

## O que FALTA (decidir antes de codar)

1. CONFIRMAR com o Caio os nomes EXATOS das agendas no Google Agenda
   (`CONFIG_AGENDA.calendarios`) e o endereço da unidade (`CONFIG_AGENDA.endereco`,
   ativa Maps/Waze na descrição). Sem isso o motor usa a agenda padrão e omite o endereço.

2. RAS-Contingência (imprimível, conferência manual):
   2.1. Clonar `gerarRASSelecionado` com cabeçalho EXATO:
        "RAS - Registro de Administração de Substâncias - FAP - Ficha de Auditoria de Processo".
   2.2. Selo "CONTINGÊNCIA — conferência manual".
   2.3. Decidir layout base: Premium (navy/dourado) ou Simples (P&B).

## Regra de ouro deste projeto (do próprio Code.gs)

- Nunca ler coluna por posição fixa — sempre por cabeçalho (`findColByHeader_`).
- Headers podem ser mesclados (nome do bloco na linha 1, sub-rótulos na linha 2): usar `findBlocoDatas_`.
