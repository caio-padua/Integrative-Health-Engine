# PROPOSTA — App da Enfermagem, RAS-FAP por aplicacao, cores da agenda e pastas CLIENTES

Data: 12/06/2026
Autor: Dr. Replit
Status: PROPOSTA (aguardando crivo do CEO antes de qualquer codigo)
Escopo: sistema PARALELO RAS KAIZEN v8 (Apps Script, conta clinica.padua.agenda)

---

## 0. DIAGNOSTICO DA DESSINCRONIA D x B (PROVADO)

0.1. Reproduzi fielmente a funcao `montarAgendaParaSubstancias_` em Node e rodei com os dados REAIS da Katia (extraidos do PDF gerado em 26.06.11).

0.2. Dados reais do protocolo da Katia:

0.3. COENZIMA Q10 100MG — inicio 07/02/2026, frequencia 7 dias, 24 aplicacoes.

0.4. VITAMINA D3 600K — inicio **07/02/2026**, frequencia 30 dias, 7 aplicacoes.

0.5. VITAMINA B12 2500MG — inicio **21/02/2026**, frequencia 30 dias, 7 aplicacoes.

0.6. TIRZEPATIDA 5MG — inicio 07/02/2026, frequencia 7 dias, 14 aplicacoes.

0.7. TESTOSTERONA BIO 25MG — inicio 07/02/2026, frequencia 15 dias, 12 aplicacoes.

0.8. A simulacao bateu **linha por linha** com o PDF (linha 1 = D3 1/7; linha 3 = B12 1/7; D3 nas linhas 1,6,10,14,18,23,26; B12 nas linhas 3,8,12,16,20,25,27).

0.9. Conclusao tecnica: **nao existe bug no codigo** — o RAS esta refletindo o dado.

0.10. CAUSA-RAIZ: a D3 comeca em 07/02 e a B12 comeca em **14 dias depois** (21/02); como cada linha do RAS e uma SEMANA e a frequencia 30 nao e multiplo de 7, as duas **nunca caem na mesma semana**, logo nunca na mesma linha.

0.11. A "piora na pagina 2" e a deriva acumulando: quanto mais pra frente, mais distante a D fica da B.

---

## 1. DECISAO 1 — O QUE FAZER COM A DESSINCRONIA

1.1. **Opcao A (RECOMENDADA)** — tratar como dado: se a intencao clinica e aplicar D3 e B12 na MESMA visita, corrigir o `INICIO` da B12 para 07/02/2026 no cadastro; elas voltam a alinhar sozinhas, sem mexer no codigo.

1.2. **Opcao B** — aceitar como correto: as datas sao reais e diferentes, entao a separacao e fiel a realidade (cada uma e uma visita distinta); nada muda.

1.3. **Opcao C (NAO recomendada)** — reescrever o RAS para alinhar por NUMERO de sessao em vez de por data; isso faria a coluna DATA mentir sobre quando a aplicacao acontece.

1.4. Recomendacao: **A** se foi erro de digitacao no inicio da B12; **B** se a defasagem de 14 dias e proposital.

1.5. Limite honesto: eu **nao tenho acesso de escrita** a planilha viva, entao a correcao do dado (Opcao A) e feita por voce/gerente, ou via o futuro app.

---

## 2. DECISAO 2 — CORES NO DESCRITIVO DA AGENDA

2.1. Regra pedida pelo CEO: o evento mostra **TODAS as substancias do protocolo**, sempre.

2.2. Estados com cor ATIVA (funcionalidade real): **APLICADA** (ja feita) e **PROXIMA** (a proxima a aplicar).

2.3. Demais substancias aparecem em estado neutro/cinza (visiveis, sem destaque).

2.4. Dependencia critica: a cor **APLICADA so existe se o sistema souber o que de fato foi aplicado**.

2.5. Logo, a cor depende do **app da enfermagem** (Parte 3) alimentando um registro de realizados (Parte 6).

2.6. Ordem correta: primeiro o app + registro de realizados, depois ligar as cores.

---

## 3. APP DA ENFERMAGEM (Web App Apps Script)

3.1. Tecnologia: `doGet` publica uma pagina HTML (mesmo motor dos arquivos .html ja existentes); a enfermeira abre no celular.

3.2. Fluxo: enfermeira seleciona o paciente do dia, ve as substancias previstas para hoje (vindas do cronograma) e **tica** o que foi aplicado.

3.3. Validacao do paciente (assinatura "modo tabajara"): a gerente cadastra uma **SENHA/PIN** que so o paciente conhece; a cada visita ele digita o PIN no app.

3.4. Efeito do PIN: registra **autoria interna auditavel** (quem confirmou presenca, data e hora).

3.5. **Ressalva honesta e obrigatoria**: esse PIN **NAO** e assinatura com valor juridico de ICP-Brasil; para isso o sistema ja tem o ZapSign; o PIN serve como confirmacao de presenca/atendimento, nao como assinatura certificada legalmente.

3.6. Seguranca: o PIN deve ser **guardado com hash** (nunca em texto puro), inclusive em planilha.

3.7. Ao confirmar, o app grava no registro de realizados (Parte 6) e dispara o RAS-FAP por email (Parte 4).

---

## 4. RAS-FAP POR APLICACAO (email ao paciente)

4.1. "RAS-FAP" = versao do RAS atualizada e emitida a CADA aplicacao confirmada.

4.2. Conteudo da confirmacao naquela linha: as **INICIAIS do paciente** no lugar da assinatura, a **HORA** da aplicacao e as **iniciais/nome da enfermeira**.

4.3. Envio: a cada aplicacao confirmada, o paciente recebe o RAS-FAP no email dele (MailApp/GmailApp).

4.4. Armazenamento: cada RAS-FAP atualizado e salvo na pasta do paciente (Parte 5).

---

## 5. ESTRUTURA DE PASTAS NO DRIVE

5.1. Pasta raiz: **CLIENTES** (autoridade delegada pelo CEO para o app criar).

5.2. Subpasta por paciente: **`Fulano de Tal <CPF sem pontos>`** (ex.: `Katia Pestana De Souza Santos 29737640845`).

5.3. Gatilho de criacao: a cada lancamento na aba CADASTRO PACIENTES **ou** a cada geracao de RAS, a pasta e criada (se nao existir) com o **RAS raiz**.

5.4. Nomeclatura dos RAS seguintes: igual ao raiz, **acrescentando no fim** `(n/sessao)`, ex.: `(1/4)`, `(2/4)`.

5.5. Limite honesto: a criacao das pastas roda **dentro da conta do Apps Script** (clinica.padua.agenda); eu, daqui do repositorio, nao crio pastas no Drive dele.

---

## 6. REGISTRO DE REALIZADOS (a peca que liga tudo)

6.1. Recomendacao: **NAO** poluir a aba TABELA GERAL.

6.2. Motivo: "aplicados" e uma matriz (paciente x substancia x sessao x data x enfermeira); em colunas da TABELA GERAL fica largo e ilegivel (anti TDAH/TOC).

6.3. **Opcao A (RECOMENDADA)** — aba nova dedicada (ex.: `APLICACOES_REALIZADAS`), **uma linha por aplicacao** (paciente, CPF, substancia, sessao, data prevista, data efetiva, hora, enfermeira, PIN_ok).

6.4. **Opcao B** — poucas colunas-resumo na TABELA GERAL (so "ultima aplicacao" por paciente).

6.5. **Opcao C** — nao registrar realizado por enquanto (cores ficam so no modo agenda/cronograma).

6.6. A Opcao A e a fonte que **liga a cor APLICADA** na agenda (Parte 2) e alimenta o RAS-FAP (Parte 4).

---

## 7. ORDEM DE IMPLEMENTACAO (fases)

7.1. **Fase 1** — criar a aba `APLICACOES_REALIZADAS` (registro de realizados).

7.2. **Fase 2** — app da enfermagem (selecao paciente + ticar + PIN com hash) gravando na Fase 1.

7.3. **Fase 3** — RAS-FAP por aplicacao (iniciais + hora + enfermeira) + email.

7.4. **Fase 4** — estrutura de pastas CLIENTES + salvar RAS-FAP versionado `(n/sessao)`.

7.5. **Fase 5** — ligar as cores APLICADA/PROXIMA na agenda usando a Fase 1.

7.6. Cada fase entra so apos crivo; nada e mesclado sem teste semantico.

---

## 8. DECISOES PENDENTES (resumo para o CEO)

8.1. DECISAO 1 (dessincronia): A (corrigir inicio da B12) / B (aceitar real) / C (reescrever — nao recomendado). Default sugerido: **A** se foi erro; **B** se proposital.

8.2. DECISAO 2 (onde gravar realizados): A (aba nova) / B (colunas-resumo) / C (nao registrar). Default: **A**.

8.3. DECISAO 3 (ordem): comecar pela Fase 1+2 (registro + app) antes das cores. Default: **sim**.

8.4. CONFIRMAR a ressalva 3.5: o PIN e confirmacao de presenca, nao assinatura ICP-Brasil. Default: **ciente**.

---

## 9. ECTOPLASMA ENCONTRADO (validacao de paciente JA EXISTE no Pawards)

9.1. O CEO lembrou certo: o Pawards principal **ja tem** validacao de paciente pronta e validada.

9.2. `pacientes.senhaValidacao` — coluna que ja existe para conferencia/PIN do paciente (e o conceito exato pedido).

9.3. `pacientes.senhaPortal` — senha do portal com hash bcrypt.

9.4. OTP por email — tabela `paciente_otp` (`codigo_hash`), service `otpService.ts` (solicitarOtp/validarOtp), identificacao por CPF + data de nascimento.

9.5. `pulsoDiarioToken` — token nanoid(12) com TTL (acesso pontual sem senha), service `pulsoDiarioService.ts`, rota `/portal-paciente/pulso/:token`.

9.6. ZapSign — assinatura real: PACIENTE (assinaturaTela + token WhatsApp), MEDICO (ICP-Brasil).

9.7. CONSEQUENCIA: o "PIN modo tabajara" deve **espelhar o padrao `senhaValidacao` (hash)**, nao inventar mecanismo novo.

9.8. CONSEQUENCIA 2: tudo isso vive no app PRINCIPAL (Postgres/Express), nao no Apps Script; reuso de codigo direto entre os dois stacks nao e possivel, mas o PADRAO e reaproveitado.

9.9. DECISAO NOVA: o app da enfermagem nasce no **Apps Script (rapido, paralelo)** agora, espelhando o padrao validado, com convergencia futura pro portal principal (que ja faz isso direito) para nao virar duplicacao permanente.

---

## 10. REFINAMENTOS DO CEO (12/06/2026)

10.1. DECISAO 1 = **Opcao A** confirmada: o inicio diferente da B12 (21/02) foi **erro de digitacao**; o correto e 07/02/2026.

10.2. Nomenclatura da rubrica do PACIENTE: `Sobrenome, I.N.I.` (sobrenome + iniciais dos demais nomes).

10.3. Exemplo: Caio Henrique Souza Padua -> `Padua, C.H.S.` (CONFIRMAR se as iniciais incluem todos os nomes do meio).

10.4. Sobrenome longo: encurtar **apenas o sobrenome** ate caber na celula deixando folga de 2 caracteres.

10.5. Nome da ENFERMEIRA: por extenso, truncado ate caber na celula com folga de 2 caracteres.

10.6. Marca de "aplicada" no RAS (premium E simples): **nao mudar a cor** da barra pintada.

10.7. Dividir a barra pintada em **3 tercos**; o **terco direito fica SEM pintura** e recebe um **check (vezinho)**.

10.8. **Nao mexer** na estrutura de colunas/celulas do RAS.

10.9. DECISAO 2 reinterpretada: o CEO vetou nova coluna/tabela; logo a **fonte da verdade dos aplicados** passa a ser os **arquivos RAS-FAP versionados** no Drive (`(n/sessao)`), nao uma aba nova (CONFIRMAR).

10.10. Ideia de PIN do CEO: derivar de dado do paciente (ex.: 4 primeiras letras do ultimo sobrenome + ano + mes de nascimento); ex.: Padua 14/11/1978 -> `padu7811`.

10.11. Ressalva honesta sobre 10.10: PIN derivado de dado quase-publico e **fraco/adivinhavel**; aceitavel no "modo tabajara", mas sempre **guardado com hash**.

10.12. Identidade visual: o app carrega **logo e identidade Pawards**, layout **dourado** (tokens PENUMBRA: gold `#C89B3C`, dourado `#9C6E16`/`#FFD27A`) sobre base PENUMBRA ESCURO Navy Ciano.

10.13. Pendencia: logo Pawards LOCALIZADO em `artifacts/clinica-motor/public/logo-pawards-medcore-transparent.png`; dourado oficial ja existe no tema PREMIUM (`accentGold: '#C9A84C'`).

---

## 11. DECISOES DE BOM-SENSO (Dr. Replit, 12/06/2026 — CEO autorizou "responda voce mesmo")

11.1. ESTRUTURA DA BARRA (codigo real): cada substancia ocupa 3 colunas — `b.s` e `b.s+1` pintadas (merge) + `b.s+2` = n/sessao.

11.2. MARCA DE APLICADA: para a sessao aplicada, pinto **so `b.s`**, deixo **`b.s+1` branca com o caractere `\u2713`** (check), `b.s+2` continua com n/sessao; zero coluna nova, zero mudanca quando nao ha aplicacao (aditivo puro).

11.3. FONTE DA VERDADE dos aplicados (resolve o veto de nova coluna/tabela): arquivo **`aplicacoes.json`** dentro da subpasta do cliente em CLIENTES — co-localizado com os RAS-FAP, robusto, auditavel, e NAO e coluna/tabela na planilha.

11.4. Os PDFs RAS-FAP versionados `(n/sessao)` continuam sendo o registro humano; o `aplicacoes.json` e o registro de maquina; os dois moram na mesma pasta do cliente.

11.5. RAIZ das pastas: reuso a pasta ja existente `PASTA_RAS_CLIENTES` (sem criar ID novo); subpasta por cliente = `Nome CPF-sem-pontos`.

11.6. PIN: derivado por `derivarPin_` (4 letras do sobrenome + AA + MM do nascimento, ex.: Padua 14/11/1978 -> `padu7811`); guardado SEMPRE como **hash SHA-256 com salt** lido de `PropertiesService` (salt NAO vai pro mirror publico em docs/).

11.7. RUBRICA paciente = `Sobrenome, I.N.I.` (iniciais de TODOS os nomes do meio); sobrenome longo encurta so o sobrenome deixando folga de 2 caracteres; enfermeira por extenso truncada com folga de 2.

11.8. CHAVE de aplicacao = `SUBSTANCIA|sessao` (ex.: `VITAMINA D3|1/7`), normalizada sem acento/caixa.

11.9. CORES da agenda: APLICADA = cinza escuro, PROXIMA = azul ativo, FUTURA = cinza claro (visivel, sem cor ativa) — zero emoji.

11.10. ENTREGA EM ONDAS testaveis: Onda A (nucleo puro + teste semantico Node + check no RAS) primeiro; depois B (app enfermagem), C (RAS-FAP email), D (pastas), E (cores agenda). Cada onda com teste antes de seguir.

## 12. STATUS DE EXECUCAO — 12/06/2026 (Dr. Replit)

12.1. Onda A (nucleo + check no RAS): **FEITA e testada**.
Funcoes puras em `AppEnfermagemRasFap.gs`; check ligado em `Code.gs`
(`gerarLayoutRASSimples_`/`Premium_` -> `montarPaginasRAS_` -> `desenharPaginaRAS_`,
5o argumento `aplicadasSet`); `node tests/test_app_enfermagem.mjs` = 23 OK / 0 FALHA.

12.2. Onda B (app da enfermagem): **FEITA**.
`doGet` + `abrirAppEnfermagem` (sidebar) + `AppEnfermagem.html`; endpoints
`appEnfListarPacientes`, `appEnfCarregarPaciente`, `appEnfRegistrarAplicacao`.
PIN derivado e validado SO no servidor; botao "ABRIR APP DA ENFERMAGEM" no Panel.

12.3. Onda C (RAS-FAP PDF + email): **FEITA**.
`gerarRasFapPdf_` (PDF PREMIUM versionado `n/total` na pasta do cliente) +
`enviarRasFapPorEmail_` (paciente + copia clinica). Best-effort: nunca derruba o registro.

12.4. Onda D (pastas CLIENTES): **FEITA** (`getOrCreatePastaCliente_`, reusa `PASTA_RAS_CLIENTES`).

12.5. Onda E (cores agenda): **helper FEITO e testado** (`corSubstanciaAgenda_`);
a LIGACAO no `AgendamentoMotor.gs` fica pro passo seguinte, apos o Caio validar
o visual do check no RAS real (evita editar o motor da agenda no escuro).

12.6. Limites honestos (anti-ectoplasma):
12.6.1. Nao executo Apps Script; o Caio cola os arquivos no editor (conta
        clinica.padua.agenda@gmail.com) e roda. O que validei aqui foi sintaxe
        (`node --check`) e as funcoes puras (teste semantico Node).
12.6.2. PDF/email do RAS-FAP dependem de permissoes do script (Drive + Gmail) no
        ambiente do Caio; por isso o passo e best-effort e logado no retorno.
12.6.3. PIN_SALT vive em ScriptProperties do script do Caio — NUNCA no mirror publico em docs/.

## 13. HARDENING DE SEGURANCA — pos code review (12/06/2026)

Em resposta a revisao de codigo (architect), apliquei 4 defesas no app da enfermagem,
todas aditivas (nenhuma coluna/tabela nova, fonte da verdade segue no Drive):

13.1. Superficie de CPF reduzida.
`appEnfCarregarPaciente` NAO devolve mais o CPF ao cliente; a tela nao trafega CPF.

13.2. CPF resolvido no servidor.
`appEnfRegistrarAplicacao` ignora qualquer CPF vindo do cliente e usa SEMPRE o
`ident.cpf` derivado do CADASTRO PACIENTES (fecha adulteracao de pasta/arquivo).

13.3. Validacao de pertencimento.
Antes de registrar, o servidor reconstroi as chaves reais do protocolo do paciente
(`appEnfChavesValidas_`, mesma fonte das opcoes da tela) e rejeita substancia/sessao
que nao pertenca aquele paciente (anti-injecao de chave no aplicacoes.json).

13.4. Bloqueio anti-forca-bruta do PIN.
Contador por paciente em `CacheService` (helper puro `avaliarBloqueioPin_`),
teto `FAP_CONFIG.pinMaxTentativas=5` em janela `pinJanelaSegundos=900` (15 min);
falha de PIN incrementa, sucesso zera. O PIN derivado e fraco por design (confirmacao
do paciente presente), entao o bloqueio + o gate de implantacao abaixo sao a defesa real.

13.5. DECISAO DE IMPLANTACAO (acao do Caio, nao codigo).
Publicar o web app como "Executar como: eu" e "Quem tem acesso: somente eu / minha
organizacao" — NUNCA "qualquer pessoa com o link". O PIN e um 2o fator de confirmacao
do paciente, nao o portao primario; o portao primario e o login Google da implantacao.

13.6. Testes.
`node tests/test_app_enfermagem.mjs` = 28 OK / 0 FALHA (inclui 5 casos do bloqueio).

## 14. NOTA DE INCIDENTE — encoding do Panel.html (12/06/2026)

14.1. Um edit anterior com `perl -0pi` carregando caractere wide (`\u25b8`)
dupla-codificou o Panel.html inteiro (acentos viraram mojibake, emojis viraram `
`).
14.2. Corrigido: Panel.html restaurado do HEAD e o botao "ABRIR APP DA ENFERMAGEM"
reaplicado via Python UTF-8 (line-ending LF, igual ao HEAD). Mojibake = 0 confirmado.
14.3. Licao: nunca usar `perl -0pi` com caractere multibyte no replacement; usar
Python com `open(..., encoding='utf-8', newline='')`.

## 15. AUTORIZACAO EM RUNTIME — 2a rodada do code review (12/06/2026)

15.1. O architect manteve FAIL porque a protecao de acesso era so de deploy (doc),
nao enforcement em codigo. Implementado gate fail-closed em runtime.

15.2. `exigirAcessoApp_` roda em TODOS os endpoints + `doGet`: autoriza por
`Session.getActiveUser().getEmail()` contra a allowlist `APP_ENF_EMAILS_PERMITIDOS`
(ScriptProperties, CSV); o dono do script (`getEffectiveUser`) sempre passa; email
vazio ou fora da lista = NEGA. Helper puro `emailAutorizadoApp_` (testado).

15.3. ACAO DO CAIO: cadastrar os emails das enfermeiras em
ScriptProperties > `APP_ENF_EMAILS_PERMITIDOS` (separados por virgula). Enquanto
vazio, so o dono do script consegue usar (fail-closed proposital).

15.4. Probing de pertencimento: agora so usuarios autorizados alcancam os
endpoints, entao o vetor de enumeracao sem custo fica fechado pelo gate de acesso.

15.5. Testes: `node tests/test_app_enfermagem.mjs` = 33 OK / 0 FALHA.
