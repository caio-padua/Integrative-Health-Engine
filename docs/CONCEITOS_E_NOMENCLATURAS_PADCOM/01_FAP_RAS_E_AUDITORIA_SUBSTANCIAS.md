# 01 — FAP, RAS e o Fluxo de Auditoria de Substancias

> Fonte: Google Doc "Manual Operacional: Fluxo de Atendimento e Auditoria de Substancias" (CEO Dr. Caio).
> Este e o conceito que faltava travar e gerava confusao (FAP nao e "folha de aplicacao").

---

## 1. As tres siglas centrais (explicadas SEMPRE)

| Sigla | Nome por extenso | O que e, em uma linha |
|---|---|---|
| FAP | Formulario de Auditoria de Procedimentos | Papel fisico impresso, preenchido a CANETA na sala de aplicacao, no momento exato do procedimento |
| RAS | Registro de Assistencia Sistemico | Prontuario digital definitivo do paciente, guardado na nuvem (Drive) |
| Conciliacao de Backoffice | Auditoria de cruzamento | Processo que compara agendamento + FAP (papel) + RAS (nuvem) pra achar divergencia |

Frase de chamada: a FAP e a PROVA FISICA do procedimento; o RAS e a MEMORIA DIGITAL do paciente; a conciliacao casa os dois.

---

## 2. O fluxo operacional (blueprint com setas)

Manha: imprimir FAP → Sala: aplicar e preencher a caneta → Fim do turno: evoluir no RAS (nuvem) → Fechamento: conciliacao tripla → Digitalizar FAP e anexar ao RAS → Triturar o papel (LGPD)

| Passo | Quem faz | O que acontece |
|---|---|---|
| 1. Preparacao | Administrativo / enfermagem | Consulta agendados do dia, imprime a FAP do ciclo, fixa na prancheta |
| 2. Aplicacao | Profissional aplicador | Preenche a caneta: data/hora real, nome+miligem da substancia, lote+validade, assinaturas (profissional carimba/assina, paciente assina ao lado) |
| 3. Evolucao | Profissional de saude | Atualiza o RAS na nuvem: tolerancia, reacoes, salva na pasta segura do paciente |
| 4. Auditoria | Responsavel auditoria | Cruzamento triplo: qualitativo (campos sem rasura), quantitativo (estoque), financeiro (presenca confirmada) |
| 5. Descarte | Auditoria | Escaneia a FAP em alta resolucao, anexa o PDF ao RAS, tritura o papel (descarte seguro LGPD) |

LGPD = Lei Geral de Protecao de Dados (Lei brasileira que protege dado pessoal).

---

## 3. Regras criticas de seguranca e compliance

| Regra inegociavel | Por que existe |
|---|---|

| Regra | Razao |
|---|---|
| Proibido preenchimento retroativo | A FAP e preenchida no momento da aplicacao; nao se assina depois que o paciente saiu |
| Rastreabilidade Anvisa | Lote+validade na FAP e a unica garantia se houver evento adverso tardio (notificar fabricante) |
| Validade juridica | RAS (nuvem) SEM a FAP assinada a caneta nao tem valor legal em contestacao judicial ou estorno |

Anvisa = Agencia Nacional de Vigilancia Sanitaria (orgao federal que regula medicamentos no Brasil).

---

## 4. Ponte com o PAWARDS (o que isto vira no sistema)

| Conceito do papel | Onde vive (ou deve viver) no sistema |
|---|---|

| FAP / RAS | Tradução no PAWARDS |
|---|---|
| RAS (nuvem) | Ja existe: RAS/RASX gerado em PDF, arquivado na pasta Drive do paciente |
| FAP (papel) | A IMPRIMIR por dia/agenda; depois escaneada e anexada na subpasta do paciente |
| Pasta segura do paciente | Ja existe: provisionamento automatico de pasta-raiz no Drive ao criar paciente; subpastas lazy |
| Conciliacao tripla | Cruza agenda + FAP + RAS — alvo do modulo de auditoria/enfermagem |

Frase de chamada: o RAS digital ja roda; a FAP impressa e a conciliacao sao o proximo elo a construir, e foi por isso que precisamos travar este conceito antes de codar.

---

RESUMO EM 1 LINHA: FAP e o papel-prova preenchido na hora da aplicacao, RAS e o prontuario digital na nuvem, e a auditoria casa os dois — sem a FAP assinada, a evolucao no RAS nao tem valor legal.
