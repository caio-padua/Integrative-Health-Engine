---
name: RACJ termos juridicos — data-binding item prescrito ↔ termo especifico
description: Como casar cada item prescrito ao termo de consentimento especifico certo no PDF RACJ JURIDICO; armadilha da coluna subgrupo.
---

# Data-binding RACJ: item prescrito ↔ termo especifico (ITEM 7, CEO 17/06/2026)

Cada termo de consentimento ESPECIFICO no PDF RACJ JURIDICO deve listar SO os
itens realmente prescritos ao paciente que casam com a SUA via/tipo de
administracao (bloco "Itens Prescritos a Voce Sob Este Termo"). Sem bloco vazio.

## Armadilha principal (custou o bug)
A coluna `termos_juridicos.subgrupo` e GROSSA: vale `JURI.CONS` para TODOS os 7
consentimentos especificos (ids 4-10) — NAO diferencia formula/IM/EV/implante.
Casar por `subgrupo` nunca casa nada.

**O discriminador REAL do tipo e o codigo entre parenteses no TITULO do termo:**
`(CFOR)` formula, `(CIMU)` intramuscular, `(CEND)` endovenosa, `(CIMP)` implante/pellet,
`(CEIN)` estetico invasivo, `(CETE)` estetico por tecnologia. Extrair via regex do titulo.

**Why:** subgrupo foi pensado como agrupador de bloco, nao como tipo fino; o tipo
fino so existe no nome oficial do termo (codigo entre parenteses).

## Regras de casamento (termoCasaMedicamento)
- Casar por `via_administracao` (texto livre, ex.: "Intramuscular profunda...",
  "Endovenosa lenta (2-4h)") E TAMBEM por `tipo` — itens legados (REVO antigo)
  gravam `tipo` ("implante"/"endovenoso") mas deixam via vazia.
- CFOR: formula/oral e EXCLUI qualquer injetavel (ehInjetavel via+tipo).
- CIMP: SO `implante|pellet` — NUNCA `subcut`/`sc` puro. O implante real ja casa
  porque a via dele e "Subcutanea (implante/pellet)" e a forma "Pellet/implante
  subcutaneo". Casar SC puro como implante = associar item ao termo juridico errado.
- NAO ha termo especifico para injetavel SUBCUTANEO puro (so IM/EV/implante) —
  notar ao CEO se isso aparecer.

## Portao DATA-DRIVEN por consentimento_sigla (CEO 18/06/2026)
O CSUB legado foi dividido em 3 codigos especificos no titulo: `(CINC)` analogos
de incretinas / agonistas de GLP-1, `(CPEP)` peptideos+secretagogos de GH, `(CLIP)`
agentes lipoliticos SC. `termoCasaMedicamento` agora PRIORIZA `m.consentimentoSigla`
(dado cadastrado) sobre o regex de nome; CSUB legado agrega CINC+CPEP.

**Armadilha que custou um FAIL do architect:** o gate data-driven so funciona se a
sigla CHEGAR em `medicamentosDetalhados`. O pipeline de meds do RACJ
(`revo_medicamentos` + `prescricao_blocos` em collectPdfData) NAO tem `substancia_id`,
entao a sigla e plumbada por NOME: mapa `substancias.consentimento_sigla` →
casa por palavra inteira (`(^|[^a-z0-9])core([^a-z0-9]|$)`, core sem sufixo entre
parenteses, len>=3, mais especifico primeiro). Sem match = null → cai no regex (zero
regressao). O regex sozinho cobria 29/30; so "Glow (blend)" dependia do plumb.
**Why:** sem o plumb, `m.consentimentoSigla` e sempre undefined e o gate vira codigo morto.
Melhoria futura: vincular por `substancia_id` quando o pipeline tiver (reduz match textual).

## How to apply
- Codigo: `artifacts/api-server/src/pdf/rasxPdf.ts` (codigoEspecificoDoTermo +
  termoCasaMedicamento); montagem de `medicamentosDetalhados` em
  `artifacts/api-server/src/routes/rasxArqu.ts` (3 pontos: GET pdf, enviar, drive).
- Testes: `src/pdf/rasxItem7.test.ts` (registrado no script `test` do api-server).
- Fragilidade conhecida: se o titulo perder o codigo entre parenteses, o binding
  some silenciosamente. Premissa: titulos sao versionados/estaveis. Melhoria futura
  = coluna estruturada `codigo_consentimento_especifico` (migration) com fallback regex.
- Demo: paciente 44 (teste). Prescricao tag `TESTE_ITEM7_DATABIND` foi criada so
  pra validar (IM B12 / EV Glutationa / implante Gestrinona).
