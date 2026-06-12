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
