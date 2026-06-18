---
name: Siglas de consentimento sao pecas juridicas
description: Por que nunca redefinir uma sigla de consentimento existente; e que "existir na constante" nao significa "ser emitida".
---

# Siglas de consentimento (RACJ) sao artefatos juridicos

Regra: NUNCA redefinir o sentido de uma sigla de consentimento que ja existe
(CSUB, CEND, CIMP, CFOR, CIMU, CEIN, CETE...). So ADICIONAR siglas novas.

**Why:** a sigla fica gravada no titulo e no texto do termo assinado pelo
paciente (PDF hash, ICP-Brasil). Trocar o sentido depois corrompe o significado
de assinaturas ja coletadas. Por isso a decisao do CEO (18/06/2026) de
subdividir o antigo CSUB ("Peptideos/GLP-1/GH") nao redefiniu CSUB: criou
CINC (incretinas/GLP-1), CPEP (peptideos+secretagogos GH+metabolicos
nao-peptidicos como 5-Amino-1MQ/SLU-PP-332/NAD+) e CLIP (lipoliticos),
mantendo CSUB intacto como "guarda-chuva antigo".

**How to apply:** sigla de consentimento e da categoria "irredutivel" (juridica)
da diretriz de autonomia — sempre confirmar com o CEO antes de criar/alterar.
Convencao da casa = 4 letras. Titulo segue a linha de producao
"Consentimento Especifico Informado — <descricao> (SIGLA)" (a sigla entre
parenteses ja faz parte do titulo). Texto novo nasce metadados.revisaoJuridica
= 'PENDENTE'. Insert idempotente por `titulo` (NOT EXISTS).

## Existir na constante != ser emitida

`SIGLAS_RACJ` em `lib/db/src/schema/cadernosDocumentais.ts` apenas DECLARA as
siglas. A EMISSAO por paciente e decidida separadamente em
`artifacts/api-server/src/lib/motor-toggles.ts` (RACJ_SEMPRE + RACJ_CONDICIONAL
por modalidade). CSUB, CREM e IMAG estao na constante mas NAO estao em
motor-toggles -> 0 linhas em `cadernos_documentais` (orfaos). Adicionar a sigla
+ o termo NAO faz o caderno ser emitido; e preciso liga-la no motor-toggles
(decisao clinica). Nao ha modalidade "subcutaneo" separada hoje
(so injetavelIM / injetavelEV / implante / formula).
