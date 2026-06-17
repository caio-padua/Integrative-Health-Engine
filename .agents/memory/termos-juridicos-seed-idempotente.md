---
name: Termos juridicos — seed idempotente e casamento por nome (CSUB)
description: Por que o seed de termos_juridicos tem que ser idempotente por titulo e como o termo especifico casa medicamento sem dupla listagem.
---

# Seed de termos_juridicos idempotente + casamento item 7

## Regra: seed guardado por "tabela vazia?" PULA termos novos
Um seed que aborta com `if (existing.length > 0) return` so roda em tabela vazia.
Em ambiente JA semeado (DB de producao, clinica colonizada do Genesis) um termo
NOVO (ex.: CSUB) NUNCA entra por esse seed — fica so no UPSERT manual avulso.

**Why:** ao adicionar o termo CSUB (peptideos/GLP-1/GH) o seed all-or-nothing
deixaria todos os ambientes ja inicializados sem o termo; o architect pegou isso.

**How to apply:** seed de catalogo legal/clinico deve ser idempotente por chave
natural (aqui = `titulo`): `SELECT` os titulos existentes, inserir SO os
faltantes, reportar quantos ja existiam. Roda quantas vezes precisar, aditivo,
nunca duplica, nunca dropa. A linha viva do DB e o seed devem carregar os mesmos
metadados-chave (ex.: `metadados.revisaoJuridica = "PENDENTE"` ate advogado
ratificar — texto juridico nasce PENDENTE, mesma regra do distrato).

## Item 7 — termo ESPECIFICO so lista o que CASA (anti-dupla-listagem)
No gerador RAS JURIDICO (rasxPdf.ts) o codigo do termo sai do titulo entre
parenteses (`codigoEspecificoDoTermo`), nao do subgrupo (grosso demais). O
casamento (`termoCasaMedicamento`) e por via/tipo, MENOS o CSUB que casa por
NOME da substancia (semaglutida, tirzepatida, somatropina, BPC-157, TB-500, e a
sigla isolada `\bgh\b`) e e EXCLUIDO de CFOR/CIMU/CEND/CIMP. O termo GLOBAL CGLO
lista tudo por designo.

**Why:** peptideo subcutaneo cairia em varios termos por via; casar por nome +
excluir dos demais evita o mesmo item listado em dois consentimentos. Aliases
clinicos curtos (GH) sao falso-negativo juridico se faltarem no matcher.

**How to apply:** ao criar termo especifico novo, adicionar o codigo no regex de
`codigoEspecificoDoTermo`, um case em `termoCasaMedicamento`, e travar com teste
em rasxItem7.test.ts (positivo + exclusao dos outros termos). Validar ao vivo no
paciente de teste 44: `GET /api/rasx/44/arqu/pdf/JURIDICO` (token em
.local/.audit_work/.tok) e conferir pdftotext (caderno + item, sem repeticao).
