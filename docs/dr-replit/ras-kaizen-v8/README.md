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
8. `AppEnfermagemRasFap.gs` — MÓDULO NOVO (12/06/2026). App da enfermagem
   (PIN do paciente) + check de sessão aplicada no RAS + pastas CLIENTES +
   RAS-FAP (PDF versionado + email). Funções puras cobertas por teste Node.
9. `AppEnfermagem.html` — tela do app da enfermagem (web app `doGet` ou
   sidebar): seleciona paciente, lista sessões, registra aplicação com PIN.
10. `tests/test_app_enfermagem.mjs` — teste semântico das funções puras
    (extrai do `.gs` por brace-match; roda com `node`).
11. `README.md` — este índice.

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

6. `AppEnfermagemRasFap.gs` + `AppEnfermagem.html` (FEITO em 12/06/2026):
   6.1. Onda A — check de sessão APLICADA no RAS: na barra "batalha naval",
        a sessão aplicada pinta SÓ `b.s`, deixa `b.s+1` branca com o caractere
        `\u2713`; `b.s+2` mantém n/sessão. Aditivo puro (set vazio = zero mudança).
        Fonte da verdade = `aplicacoes.json` na subpasta do cliente (sem coluna nova).
   6.2. Onda B — app da enfermagem: `doGet` (app da web) + `abrirAppEnfermagem`
        (sidebar). Endpoints `appEnfListarPacientes`, `appEnfCarregarPaciente`,
        `appEnfRegistrarAplicacao`. PIN derivado e validado 100% no servidor
        (nunca trafega o segredo); hash SHA-256 + salt em `PropertiesService`.
   6.3. Onda C — RAS-FAP: a cada aplicação registrada, `gerarRasFapPdf_` gera o
        PDF PREMIUM (já com os checks) versionado `(n/total)` na pasta do cliente
        e `enviarRasFapPorEmail_` envia ao paciente + cópia clínica. Best-effort
        (try/catch): falha de PDF/email nunca derruba o registro da aplicação.
   6.4. Onda D — pastas CLIENTES: `getOrCreatePastaCliente_` reusa
        `PASTA_RAS_CLIENTES` (sem ID novo); subpasta = `Nome CPF-sem-pontos`.
   6.5. Onda E — `corSubstanciaAgenda_` (APLICADA cinza / PRÓXIMA azul / FUTURA
        cinza claro). Helper puro + testado; ligar no `AgendamentoMotor.gs` é o
        próximo passo (decisão de plugar a cor por estado real no lançamento).
   6.6. Hardening de seguranca (pos code review): CPF nao trafega mais pro cliente
        e e resolvido no servidor; o registro so aceita substancia/sessao que pertence
        ao protocolo real do paciente; bloqueio anti-forca-bruta do PIN (5 tentativas
        por paciente em 15 min via `CacheService`). Gate de autorizacao em RUNTIME
        (`exigirAcessoApp_`, fail-closed: allowlist `APP_ENF_EMAILS_PERMITIDOS` em
        ScriptProperties + dono sempre passa) em todos os endpoints e no `doGet`.
        Implantar tambem como "Executar como: eu" + acesso restrito (PIN = 2o fator).
   6.7. Testes puros: `node tests/test_app_enfermagem.mjs` → 54 OK / 0 FALHA.
        Sintaxe dos `.gs` validada por `node --check` (copia `.js` temporaria).
   6.8. Sonda de integracao (roda DENTRO da conta do CEO): botao
        "RODAR SONDA (app enfermagem ponta a ponta)" no Panel chama
        `runSondaEnfermagem()` em `TesteEnfermagem.gs`. Exercita list/carga/chaves/PIN
        de um paciente real (SOMENTE LEITURA), round-trip de Drive num paciente
        FICTICIO auto-limpo, idempotencia, e bloqueio de PIN sem deixar rastro.
        NAO gera PDF/email a paciente real. Decisao + limites em
        `docs/dr-replit/PROPOSTAS/2026-06-12_sonda-integracao-app-enfermagem.md`.
   6.9. Automacao (zero clique recorrente): `GatilhoSonda.gs` +
        botoes "INSTALAR/REMOVER GATILHO DA SONDA" no Panel. Um clique instala
        um gatilho diario que roda a sonda sozinha e manda o resultado por email
        pro dono. Coordenadas completas e briefing pro Dr. Code em
        `docs/dr-replit/sistema-paralelo-tabajara/`. Decisao em
        `docs/dr-replit/PROPOSTAS/2026-06-12_estrategia-validacao-sem-trabalho-manual.md`.

## O que FALTA (decidir antes de codar)

1. CONFIRMAR com o Caio os nomes EXATOS das agendas no Google Agenda
   (`CONFIG_AGENDA.calendarios`) e o endereço da unidade (`CONFIG_AGENDA.endereco`,
   ativa Maps/Waze na descrição). Sem isso o motor usa a agenda padrão e omite o endereço.

2. Onda E (ligação): chamar `corSubstanciaAgenda_(estado)` dentro do
   `AgendamentoMotor.gs`/`AgendamentoGoogleCalendar.gs` para colorir o evento por
   estado real (aplicada/próxima/futura). Helper já existe e está testado; falta só
   o ponto de chamada — feito após o Caio validar o visual do check no RAS real.

3. RAS-FAP cabeçalho dedicado (opcional): hoje o RAS-FAP reusa o layout PREMIUM.
   Se o Caio quiser cabeçalho EXATO "RAS - FAP - Ficha de Auditoria de Processo"
   + selo "CONTINGÊNCIA — conferência manual", clonar `gerarLayoutRASPremium_`.

## Regra de ouro deste projeto (do próprio Code.gs)

- Nunca ler coluna por posição fixa — sempre por cabeçalho (`findColByHeader_`).
- Headers podem ser mesclados (nome do bloco na linha 1, sub-rótulos na linha 2): usar `findBlocoDatas_`.

## Pre-requisito de implantacao do app da enfermagem (CRITICO)

O gate `exigirAcessoApp_` autoriza por `Session.getActiveUser().getEmail()`.
Esse email so vem preenchido se a implantacao expoe a identidade do usuario:

- Implantar o web app com acesso restrito ao DOMINIO/organizacao ou a usuarios
  especificos (NUNCA "qualquer pessoa com o link" anonimo) — assim o
  `ActiveUser().getEmail()` chega populado e a allowlist funciona.
- Se a implantacao for anonima, `ActiveUser().getEmail()` volta VAZIO e o gate
  (fail-closed) NEGA todos — comportamento proposital, mas trava o uso legitimo.
- Cadastrar os emails das enfermeiras em ScriptProperties >
  `APP_ENF_EMAILS_PERMITIDOS` (CSV). O dono do script sempre passa.

Checklist de validacao antes do rollout:
1. Allowlist preenchida; 2. acesso da implantacao = dominio/usuarios (nao anonimo);
3. testar com a conta de uma enfermeira (deve abrir) e uma conta de fora (deve negar).
