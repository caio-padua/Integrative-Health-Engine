---
name: RAS KAIZEN v8 (Apps Script paralelo do CEO)
description: Como trabalhar no projeto Apps Script espelhado em docs/dr-replit/ras-kaizen-v8 — limites do agente e do Code.gs espelho.
---

# RAS KAIZEN v8 — sistema Apps Script PARALELO (NÃO é o PAWARDS)

Projeto Google Apps Script do CEO (conta operacional da clínica — ver replit.md),
espelhado em `docs/dr-replit/ras-kaizen-v8/` (.gs/.html) só pra versionar e o
Dr. Code ler via GitHub raw. É ES5-ish, escopo GLOBAL (todos os .gs se enxergam).

## Regras de trabalho (durável)

- O agente NÃO executa Apps Script. Validação é o CEO clicando os botões
  "RODAR TESTES ..." no Panel. Por isso toda feature precisa de testes
  semânticos puros (sem Calendar/Sheet) + um botão `runTestes...` no Panel.
- `Code.gs` é ESPELHO do script vivo do CEO (~3.4k linhas). NÃO refatorar.
  Features novas vão em ARQUIVOS .gs NOVOS (o escopo global junta tudo); botões
  funcionam de qualquer arquivo.
- **Exceção inevitável:** quando a feature precisa de um hook DENTRO de uma
  função que mora no `Code.gs` (ex.: ordenar substâncias em `montarPaginasRAS_`),
  não dá pra fazer de fora. Essa 1 linha aditiva é decisão do CEO (editar o
  espelho dessincroniza do vivo) — apresentar A/B/C, default = agente aplica a
  linha aditiva e o CEO re-cola no script vivo.

**Why:** o repo funciona como "fonte que o CEO copia pro Apps Script vivo", não
como mirror passivo — os .gs novos também não existem no script dele até ele
colar. Mas o CEO travou "não editar Code.gs" pra não confundir o espelho, então
qualquer toque no Code.gs vira decisão dele.

## Quirk de edição: `Code.gs` tem fim de linha CRLF

- `Code.gs` (e `Panel.html` tem emoji/box-chars) usa terminador **CRLF** (`\r\n`).
  O tool `edit` casa verbatim com `\n`, então qualquer `old_string` multilinha
  FALHA com "did not appear verbatim" — só edits de 1 linha passam.
- **How to apply:** pra edits multilinha no Code.gs, usar script Node via bash
  (`indexOf` + `slice`, montando blocos com `EOL='\r\n'`), validar unicidade do
  anchor, e `node --check` numa cópia `.js` no fim. Ancorar em tokens ASCII
  (evitar linhas com `═══` e blanks com trailing space).

## Detalhes do domínio que não estão óbvios no código

- Multi-cockpit: 4 abas (COCKPIT, COCKPIT 2/3/4). `lancarProtocolo` mira a ABA
  ATIVA via `cockpitAtivo_` (fallback 'COCKPIT'). Nº protocolo no B5 do cockpit
  (dropdown 000-100, texto 3 díg.), toggle agenda no F5. Grava colunas aditivas
  NUMERO PROTOCOLO + COCKPIT ORIGEM. Mesmo paciente = N linhas (1/protocolo).
- Toggle "lançar ao emitir" usa `lancarAgendaPaciente_(ras, nextRow, {modo:'novos'}, [])`
  — SÓ a linha emitida, NÃO `lancarAgendaTodos_` (esse varre o backlog inteiro e
  surpreende). O primitivo por-linha do motor é `lancarAgendaPaciente_`.
- Match de substância header↔nome é tolerante a espaço número/unidade via
  `normSemEspaco_` (remove TODOS espaços; "200 mg"=="200mg"). `normalizeHeader_`
  do Code.gs mantém 1 espaço — NÃO mexer nela (uso amplo).

- CONSULTA/RETORNO são itens da aba CADASTRO SUBSTANCIAS (categoria
  CONSULTA/RETORNO, sem via), NÃO estão no array `CATALOGO_SUBSTANCIAS`. Podem
  vir SEM categoria → classificar por categoria E por nome (cinto+suspensório).
- Roteamento de agenda: CONSULTA/RETORNO/IMPLANTE → médico; IM/EV/SC →
  enfermagem. Cada grupo vira evento SEPARADO; médico antes da enfermagem.
- Ordem por categoria no RAS é só EM MEMÓRIA na geração (`ordenarSubstanciasRas_`);
  nada muda na planilha. Ordem travada pelo CEO: antioxidante, vitamina,
  hormônio, esteroide, peptídeo, mineral, demais (POLIFENOL→demais, COMPLEXO
  VIT.→vitamina, ajustáveis em 1 linha).

- Sheets: `range.merge()` que abrange linhas 1-2 do topo QUEBRA com "mesclar
  congeladas com nao congeladas" se a aba ja tinha 1 linha congelada de versao
  antiga. `sheet.clear()` NAO reseta frozenRows. Regra: sempre `setFrozenRows(0)`
  ANTES de mesclar o topo nos rebuilders (garantirCabecalhoCadastro_,
  estruturarCadastroPacientes_, estruturarCockpit_) e recongelar no fim.

## App da Enfermagem (Onda RAS-FAP) — modelo de segurança (durável)

- Fonte da verdade dos "aplicados" é `aplicacoes.json` na subpasta do cliente no
  Drive (NÃO coluna nova — honra o veto de schema da planilha). Chave canônica
  `SUBSTANCIA|sessao`.
- PIN do paciente é fraco por design (derivado do sobrenome+nascimento); a defesa
  REAL é dupla: (1) gate de runtime fail-closed `exigirAcessoApp_` (allowlist
  `APP_ENF_EMAILS_PERMITIDOS` em ScriptProperties + dono sempre passa; email vazio
  NEGA) em TODOS os endpoints e no `doGet`; (2) PIN como 2º fator.
  **Why:** deploy "acesso restrito" sozinho não é enforcement — erro de config
  vazaria dado clínico; o gate em código fecha isso.
- CPF nunca trafega pro cliente; o servidor sempre re-deriva do CADASTRO PACIENTES.

## Teste de integração quando o agente não executa Apps Script (durável)

- Os testes puros (`node`) só cobrem lógica sem API. A camada Sheet/Drive/Cache/PDF
  fica sem prova viva porque o agente não roda Apps Script.
- Padrão "SONDA": uma função `runSonda...()` + botão no Panel que o CEO clica, rodando
  DENTRO da conta dele. Para ser segura ela DEVE: (1) ser SOMENTE LEITURA na planilha;
  (2) fazer escrita só num registro FICTÍCIO isolado e apagar no `finally`;
  (3) nunca gerar PDF/email a paciente real; (4) se mexer no contador de bloqueio de
  PIN de um paciente real, LIMPAR o contador no `finally` (senão trava a enfermeira real).
  **Why:** integração real exige o runtime do Apps Script, mas não pode sujar dado
  clínico nem deixar efeito colateral; a fronteira leitura-real + escrita-fictícia
  resolve os dois. Fabricar linha de paciente na planilha (cobertura máxima, inclui
  PDF) é decisão do CEO com backup antes — não é o default.

## Automacao da sonda + teto do Dr. Code (durável)

- Pra tirar o trabalho manual RECORRENTE: gatilho time-driven instalável
  (`ScriptApp.newTrigger(handler).timeBased().everyDays(1).atHour(6).create()`)
  que roda a sonda sozinha e manda o resultado por email pro dono
  (`Session.getEffectiveUser().getEmail()`). Mínimo de trabalho humano = 1 clique
  UMA vez ("instalar gatilho"). Instalar deve ser idempotente: apagar triggers do
  mesmo `getHandlerFunction()` antes de criar, senão duplica a cada clique.
- NENHUMA IA executa Apps Script — o Dr. Code (Claude) só AUDITA via GitHub raw,
  nunca roda. "Pedir pro Dr. Code validar no ambiente Apps Script" tem esse teto;
  execução viva = clique do CEO ou gatilho.
- Ponte de coordenadas de teste pro Dr. Code: `docs/dr-replit/sistema-paralelo-tabajara/`
  (README + COORDENADAS_DE_TESTE + BRIEFING_DR_CODE), raw URLs na branch ativa.

## Armadilha de encoding ao editar via shell (durável)

- NUNCA usar `perl -0pi` com caractere multibyte (ex.: `\u25b8`) no replacement:
  ele faz "upgrade" da string e re-grava o arquivo INTEIRO dupla-codificado
  (acentos viram `Â...`, emoji vira `ð`). Já corrompeu o `Panel.html` inteiro.
  **How to apply:** editar via Python `open(..., encoding='utf-8', newline='')`,
  detectar CRLF/LF e preservar; conferir `dupla-cod==0` por contagem de bytes.

## Motor de orcamento (Orcamento.gs) — 12/06/2026
- Parametros de desconto/entrada sao da PROPRIA planilha do CEO (paciente Luciano,
  total 15960): a vista 15%, entrada 50% com 10%, entrada 30% com 5%, calculadora
  livre sobre o TOTAL CHEIO (sem desconto) com taxa de cartao digitavel. Reproduzir
  esses parametros, nao inventar outros.
- CADASTRO SUBSTANCIAS ja tem PRECO UNIT + PRECO 3M/6M/12M (preco unitario por faixa
  de DURACAO do programa em meses, mais barato quanto maior o compromisso) + FREQ/SESSOES.
  Orcamento puxa preco/freq/sessoes da substancia por NOME+DOSAGEM.
- Aba ORCAMENTO: col E=INCLUIR (1/vazio) zera o subtotal se vazio; SUBTOTAL = SESSOES x VALOR UNIT.
- "Quanto recebemos por mes" = receita mensal = saldo/parcelas (entrada) ou total/parcelas
  (parcelado) ou total (a vista). Lancar no FINANCEIRO so ADITIVO (veto de schema).
- **Why:** evita ectoplasma — numeros de negocio sao do CEO, nao chutes do agente.

## Push GitHub pode 401 (token expira) — 12/06/2026
- `git push github` falha com "Password authentication is not supported" quando o token
  do remoto expira; nenhum agente conserta o token. O CEO precisa RECONECTAR o provedor
  GitHub no painel Git do Replit. Commits/checkpoints locais ficam seguros enquanto isso.

## Padronizacao de nomes de substancia — 12/06/2026
- CADASTRO SUBSTANCIAS e a FONTE DA VERDADE; ORCAMENTO/FINANCEIRO/TABELA tem nomes
  livres que sao CASADOS contra ele (nunca o contrario).
- Nome canonico = "Coenzima Q10 100mg": sem acento, Title Case por palavra, MAS
  palavra com digito/sinal/sigla/letra-unica fica CAIXA ALTA (Q10/B12/ET-7/NAD+/NAC/
  HCG/DMSA/DHEA/PQQ/ADEK/Vitamina C/Complexo B); dosagem colada+minuscula (600.000ui).
- ARMADILHA (bug que o relatorio real pegou): substancia com VARIAS dosagens
  (Testosterona Bio 25/200/1000, Tirzepatida 2,5/5/10, HCG 500/5000) NAO pode casar
  so por nome — tem que DESAMBIGUAR pela dose do texto livre; sem dose ou dose
  inexistente => fail-closed (SEM_CORRESPONDENCIA), nunca chutar a 1a dose.
- **Why:** casar por nome pegava sempre a 1a dose do catalogo e gravava preco errado
  no FINANCEIRO. Validar SEMPRE com o relatorio sobre dados reais, nao so unit tests.
