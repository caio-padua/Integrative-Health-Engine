# 03 — ANÁLISE RIGOROSA E SINCERA: PAWARDS x PAXTER

> Autor: Dr. Replit Pawards
> Data: 22/06/2026
> Para: CEO Dr. Caio + Dr. Claude (orquestração)
> Fonte: leitura DIRETA do código do repositório público
> `caio-padua/Protocolo-Manager` (clonado em `.local/paxter-analysis`)
> comparado com o código vivo do Pawards (`artifacts/clinica-motor` +
> `artifacts/api-server`).
> Regra desta análise: zero fantasia — só afirmo o que LI no arquivo.

---

## 0. CONCLUSÃO PRIMEIRO (o veredito em 5 linhas)

1. O Paxter de HOJE é MUITO mais forte do que a memória antiga dizia.
2. Ele JÁ tem motor de anamnese real, catálogo no banco, assinatura
   ICP-Brasil nativa, Gmail, Drive, Agenda, WhatsApp e motor de orçamento.
3. O instinto do CEO está CERTO: o Paxter é de UMA clínica só e é mais
   simples de operar — começar nele é a decisão acertada.
4. O que falta pro Paxter rodar o Instituto Pádua 100% é POUCO e cirúrgico
   (4 frentes), não é refundar nada.
5. As maiores DIFERENÇAS entre os dois não são de funcionalidade — são de
   filosofia: motor de sugestão, rota de assinatura, nome de campo e design.

Siglas usadas nesta seção, explicadas:
- ICP-Brasil = Infraestrutura de Chaves Públicas Brasileira (o carimbo
  digital com validade jurídica de assinatura de documento).
- Gmail = serviço de e-mail do Google usado para disparo automático.

---

## 1. SEMÁFORO — O QUE O PAXTER JÁ TEM (verificado na fonte)

Frase de chamada: tudo abaixo eu ABRI o arquivo e CONFIRMEI; não é suposição.

| Recurso do Paxter conferido linha a linha | Existe hoje? | Onde está no código |
|-------------------------------------------|--------------|---------------------|
| Motor de anamnese (escore + grade)        | SIM, real    | `api-server/src/lib/motor-anamnese.ts` |
| Catálogo no banco (não mais no frontend)  | SIM, real    | rotas `catalogs.ts` + `substances.ts` |
| Assinatura ICP-Brasil NATIVA (certificado A1) | SIM, real | `api-server/src/lib/pdf-signer.ts` |
| Receita / prescrição em PDF               | SIM, real    | `api-server/src/lib/prescription-pdf.ts` |
| E-mail profissional (Gmail)               | SIM, real    | `lib/google-gmail.ts` + `email-service.ts` |
| Google Drive (guarda de documentos)       | SIM, real    | `lib/google-drive.ts` |
| Google Agenda (Calendar)                  | SIM, real    | `lib/google-calendar.ts` |
| WhatsApp (Twilio)                         | SIM, real    | `lib/whatsapp.ts` |
| SNCR (controle de talão/receituário)      | SIM, real    | `lib/sncr.ts` + `sncr-alerts.ts` |
| Catálogo ANVISA                           | SIM, real    | `lib/anvisa-catalog.ts` |
| Braço de farmácia (e-mail p/ farmácia)    | SIM, real    | `lib/pharmacy-email.ts` + rota `pharmacies.ts` |
| Motor de cálculo de orçamento/valores     | SIM, real    | `lib/budget-calc.ts` |
| Portal do paciente                        | SIM, real    | rota `client-portal.ts` + `area-paciente.ts` |
| Tela de entrada com selos de confiança    | SIM, real    | `padcom/src/pages/entrada.tsx` |

Siglas explicadas:
- A1 = tipo de certificado digital que fica em ARQUIVO no servidor (um
  `.pfx` protegido por senha), diferente do A3 que fica em cartão/token.
- SNCR = Sistema Nacional de Controle de Receituário (o controle legal dos
  talões de receita de substâncias controladas).
- ANVISA = Agência Nacional de Vigilância Sanitária.
- PDF = Portable Document Format (o arquivo de documento que abre igual em
  qualquer lugar).

RESUMO DO BLOCO: a memória antiga ("catálogo fixo no código, sem motor")
está MORTA; o Paxter de hoje é um sistema clínico real e quase completo.

---

## 2. O QUE O PAWARDS TEM E O PAXTER NÃO TEM

Frase de chamada: o Pawards é o "irmão grande" — tem peças que o Paxter
ainda não tem, e são exatamente as peças de "somar os mundos".

| Peça que existe no Pawards e falta no Paxter | Por que importa pro CEO |
|----------------------------------------------|-------------------------|
| Motor liga anamnese a TODOS os procedimentos | hoje o Paxter só sugere EXAME; o Pawards mapeia exame + fórmula + injetável + implante + protocolo |
| Catálogo clínico profundo e estruturado      | fórmula blend, 305 injetáveis, implantes, exames com analitos — base rica já cadastrada |
| Assinatura via ZapSign (provedor externo)    | caminho de assinatura sem depender de guardar certificado no servidor |
| Multi-unidade / multi-clínica / consultoria  | o Pawards governa várias clínicas; o Paxter é de uma só (isto é uma VANTAGEM do Paxter agora, ver seção 4) |
| Design PENUMBRA (padrão visual travado)       | linguagem visual única de todos os seus projetos |
| RAS-MATRIZ e FAP completos                    | modelos de registro assistencial mais maduros |

Siglas explicadas:
- ZapSign = empresa que assina documentos digitalmente com validade
  ICP-Brasil sem você precisar guardar o certificado no seu próprio servidor.
- RAS = Registro de Assistência Sistêmico (o documento-relatório do
  atendimento, guardado na nuvem).
- FAP = Formulário de Auditoria de Procedimentos (a versão em papel/checagem).
- PENUMBRA = nome do seu padrão visual oficial (a "moeda" de duas faces:
  clara Paper Ciano e escura Navy Ciano).

RESUMO DO BLOCO: o que o Pawards tem a mais é, principalmente, PROFUNDIDADE
de catálogo e a amarração da anamnese a procedimentos além de exames.

---

## 3. IGUALDADES (onde os dois já fazem a mesma coisa)

| O que os dois sistemas já têm igual | Observação honesta |
|-------------------------------------|--------------------|
| Banco PostgreSQL + Drizzle          | mesma base técnica de dados |
| E-mail via Gmail                    | os dois disparam e-mail real |
| Google Drive + Agenda               | os dois integram os dois serviços |
| WhatsApp                            | os dois mandam mensagem |
| Geração de PDF de documento clínico | os dois geram, com layouts diferentes |
| Vocabulário "cliente"               | o Paxter usa "cliente"; combina com a regra do Padcon Conect |

Siglas explicadas:
- PostgreSQL = o banco de dados (onde tudo fica guardado).
- Drizzle = a ferramenta que conversa com o banco em linguagem segura.
- Padcon Conect = o produto clínico do Dr. Replit Manager (uma clínica usa
  a palavra "cliente", não "paciente").

---

## 4. DIFERENÇAS DE LÓGICA E DE CÓDIGO (o coração da análise)

Frase de chamada: aqui estão as 5 divergências REAIS que precisam de decisão
sua antes de "fundir os mundos". Cada uma com a verdade do código.

### 4.1 — Motor de anamnese (a diferença mais importante)

| Aspecto do motor | PAXTER (hoje) | PAWARDS (hoje) |
|------------------|---------------|----------------|
| Cálculo de escore por bloco | SIM, limpo e organizado | fraco (compara texto solto) |
| Grade global do escore (níveis) | SIM (1 / 7 / 15 / 25) | não estruturado |
| Liga pergunta a sintoma e a doença | SIM | parcial |
| Liga doença a EXAME | SIM (até 40 exames) | SIM |
| Liga doença a FÓRMULA | NÃO | SIM (mapas existem) |
| Liga doença a INJETÁVEL | NÃO | SIM (mapas existem) |
| Liga doença a IMPLANTE | NÃO | SIM (mapas existem) |
| Liga doença a PROTOCOLO | NÃO | SIM (mapas existem) |

Verdade verificada: busquei no `motor-anamnese.ts` do Paxter as palavras
"fórmula", "injetável", "implante" e "protocolo" — NÃO aparecem. O motor
dele sugere SÓ EXAME. Essa é a peça nº 1 a "somar".

Melhor dos dois mundos = pegar a LÓGICA limpa de escore/grade do Paxter e
plugar a AMARRAÇÃO multi-procedimento que o Pawards já mapeou.

Siglas explicadas:
- Anamnese = a entrevista clínica inicial (as perguntas que o cliente
  responde sobre saúde dele).
- Escore = a nota/soma que o sistema calcula a partir das respostas.
- Grade = o nível em que aquela nota cai (ex.: básica, intermediária...).

### 4.2 — Assinatura digital (precisa de decisão sua)

| Aspecto | PAXTER | PAWARDS |
|---------|--------|---------|
| Como assina | certificado A1 NATIVO no servidor | via ZapSign (provedor externo) |
| Depende de | guardar o `.pfx` + senha `CERT_PASSWORD` | conta e token da ZapSign |
| Validade jurídica | ICP-Brasil | ICP-Brasil |
| Já funciona hoje | SIM, no Paxter | SIM, no Pawards |

Verdade verificada: procurei "zapsign" em TODO o repositório do Paxter — ZERO
ocorrência. O Paxter NÃO usa ZapSign; ele assina sozinho com o certificado A1.
Ou seja: o seu pedido "deixar a assinatura ICP-Brasil pronta no Paxter" JÁ
ESTÁ ATENDIDO — só que pelo caminho nativo, não pela ZapSign.

### 4.3 — Nome do campo de perfil (viola sua regra de ferro)

Verdade verificada: na tabela de profissionais do Paxter o campo se chama
`role` (`role: text("role").notNull().default("executor")`).
Sua regra travada é: NUNCA `role`, SEMPRE `perfil` (porque "role" confunde
com rota do backend). Isto é uma dívida a corrigir na fusão.

Sigla explicada:
- `role` / `perfil` = o campo que diz QUAL é a função da pessoa no sistema
  (médico, enfermeira, executor...).

### 4.4 — Restrição de CPF na tabela de clientes (boa notícia)

Verdade verificada: hoje no Paxter o CPF do cliente é só `text("cpf")` —
SEM "obrigatório" e SEM "único". A memória antiga dizia que era obrigatório
e único (o que rejeitaria a sua base do Instituto Pádua). Isso foi afrouxado:
a base do Instituto Pádua JÁ PODE ser importada sem esbarrar nessa trava.

Sigla explicada:
- CPF = Cadastro de Pessoa Física (o número do documento da pessoa).

### 4.5 — Design (decisão de marca, não de função)

| Aspecto visual | PAXTER | PAWARDS |
|----------------|--------|---------|
| Estilo | 3D com relevo, brilho, LED, dourado/navy | PENUMBRA plano, austero, 0px |
| Cantos | arredondados (rounded) | retos (0px) |
| Tipografia | variada | JetBrains Mono universal |
| Filosofia | "tátil/luxuoso" | "documento jurídico sério" |

Estes dois são OPOSTOS. Não há certo/errado — é escolha sua de qual face o
Paxter vai vestir (ver decisão D-04 na seção 6).

---

## 5. BLUEPRINT — FLUXO ALVO DO INSTITUTO PÁDUA NO PAXTER

Frase de chamada: este é o caminho ponta a ponta que queremos rodando 100%.

```
CLIENTE responde ANAMNESE
        ↓
MOTOR calcula escore + grade
        ↓
MOTOR sugere  →  EXAMES  +  FÓRMULAS  +  INJETÁVEIS  +  IMPLANTES  +  PROTOCOLOS
        ↓                         (peça a somar do Pawards)
MÉDICO valida as sugestões (aprova / ajusta)
        ↓
RECEITA / RAS em PDF
        ↓
ASSINATURA ICP-Brasil (A1 nativo já pronto)
        ↓
ENTREGA  →  E-MAIL (Gmail) + WhatsApp + Google Drive
        ↓
BRAÇO FARMÁCIA recebe a receita
        ↓
CONTROLE DE VALORES das receitas (motor de orçamento)
```

Legenda das siglas do blueprint:
- RAS = Registro de Assistência Sistêmico (relatório do atendimento).
- ICP-Brasil = o carimbo digital com validade jurídica.
- A1 = certificado em arquivo, no servidor.
- Gmail = e-mail do Google.
- Motor de orçamento = a parte do código que calcula preços e descontos.

---

## 6. DECISÕES QUE PRECISO DE VOCÊ (com padrão recomendado)

Frase de chamada: cada decisão tem opções A/B/C e a minha recomendação.
Uma decisão de cada vez, todas reversíveis exceto onde eu marcar.

| Código | Decisão | Opção A | Opção B | Opção C | Recomendo |
|--------|---------|---------|---------|---------|-----------|
| D-01 | Onde operar primeiro | Paxter (1 clínica) | Pawards (multi) | os dois juntos | **A (Paxter)** |
| D-02 | Assinatura no Paxter | manter A1 nativo (já pronto) | trocar por ZapSign | os dois | **A (A1 nativo)** |
| D-03 | Motor multi-procedimento | portar do Pawards p/ o Paxter | reescrever do zero | deixar só exame | **A (portar)** |
| D-04 | Design do Paxter | manter 3D atual | vestir PENUMBRA | híbrido | **B (PENUMBRA)** |
| D-05 | Campo `role` | renomear p/ `perfil` | manter `role` | — | **A (renomear)** |

Observação honesta sobre D-02: você pediu "ZapSign pronto no Paxter", mas o
Paxter JÁ assina ICP-Brasil sozinho. Trocar por ZapSign seria TRABALHO a mais
para ter o MESMO resultado jurídico. Por isso recomendo manter o nativo (A).
Se você quiser ZapSign por outro motivo (ex.: não guardar certificado no
servidor), me diga que eu sigo no caminho B.

---

## 7. O QUE FALTA PRO PAXTER RODAR O INSTITUTO PÁDUA 100%

Frase de chamada: são 4 frentes; nenhuma é refundação.

| # | Frente | Estado hoje no Paxter | O que falta |
|---|--------|------------------------|-------------|
| 1 | E-mail profissional | integração Gmail pronta | confirmar conta/assinatura institucional |
| 2 | Assinatura ICP-Brasil | A1 nativo pronto | registrar o certificado A1 real da clínica |
| 3 | Receita com sugestões | só exame hoje | portar amarração de fórmula/injetável/implante/protocolo |
| 4 | Braço farmácia + valores | e-mail + orçamento prontos | ligar custo da farmácia ao preço da receita |

RESUMO DO BLOCO: 2 frentes são só CONFIGURAR (e-mail e certificado), 2 são
DESENVOLVER (motor multi-procedimento e ponte custo-farmácia).

---

## RESUMO EM 1 LINHA

O Paxter já é um sistema clínico real e quase completo para uma clínica; para
operar o Instituto Pádua 100% faltam só 4 frentes cirúrgicas, e a única peça
pesada a "somar do Pawards" é ligar a anamnese a fórmula/injetável/implante/
protocolo (hoje o Paxter só sugere exame).
