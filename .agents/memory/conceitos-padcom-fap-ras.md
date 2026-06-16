---
name: Conceitos PADCOM, FAP e RAS (vocabulario travado)
description: Significado oficial de FAP/RAS, holding PADCOM x PADCON, e onde mora o dicionario de nomenclaturas. Ler antes de nomear qualquer coisa.
---

# Conceitos travados da holding PADCOM

Dicionario oficial vive em `docs/CONCEITOS_E_NOMENCLATURAS_PADCOM/` (irmao da Biblia/Doutrina, referenciado no replit.md item 4 da leitura obrigatoria). Fonte: 2 docs Google do CEO + docx do ecossistema.

## Siglas que eu ja errei antes (corrigidas na fonte)
- **FAP = Formulario de Auditoria de Procedimentos** — papel fisico impresso, preenchido A CANETA na sala de aplicacao no momento do procedimento (prova juridica). NAO e "Folha de Aplicacao".
- **RAS = Registro de Assistencia Sistemico** — prontuario digital definitivo na nuvem (Drive). NAO e "Registro Atendimento Saude".
- Regra de compliance: RAS sem a FAP assinada a caneta NAO tem valor legal.

## Colisao de nomes a validar (fonte de retrabalho)
- **PADCOM** = holding/empresa-mae; **PADCON Platform** = marca de arquitetura no docx; **Padcon Conect** = produto do Manager. Escritos quase igual. `[A VALIDAR]` qual e o guarda-chuva oficial. Premissa atual: PADCOM holding > PAWARDS engenharia > demais sistemas.

## Vocabulario clinico travado pelo CEO (na planilha glossario)
- Posologia = dose + **via (obrigatoria)** + frequencia + periodo + observacao.
- Frequencia = se repete APOS o termino (intervalo), NAO vezes/dia. Tomada = qtd de doses por momento do dia.
- Tipos Anvisa: **nao existe verde nem lilas** (remover de listas).
- Destinos novos pedidos: `farma.manip` / `farma.droga` / `farma.labor` (regra aaaaa.bbbbb 5+5).
- SNCR (Sistema Nacional de Controle de Receituarios): NUNCA bloqueia emissao, so ALERTA.

## Drive do paciente (verdade verificada)
- Provisionamento da pasta-raiz no Drive e REGRA: `POST /pacientes` dispara `autoProvisionDriveAsync`. Subpastas (~17) sao LAZY (criadas no 1o arquivo de cada categoria), cache em `pacientes.drive_ns` jsonb. Falta teste automatizado/prova viva (alvo do E2E Fernandinha).
