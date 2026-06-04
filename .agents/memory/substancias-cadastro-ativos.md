---
name: Cadastro de substancias/ativos (catalogo de formulas)
description: Como funciona o modulo de substancias (catalogo de ativos das formulas magistrais) — portao de confianca do dado, ausencia de OpenAPI, classificacao multi-eixo.
---

# Modulo de substancias (ativos das formulas)

## origemDado e portao de confianca clinica
A coluna `origem_dado` (`OPERADOR` / `SEED_RASCUNHO` / `VALIDADO_MEDICO`) NAO e
gravavel pelo cliente. Foi deixada FORA de `ALLOWED_FIELDS` (PUT/PATCH) e e
removida do payload no POST (cai no DEFAULT 'OPERADOR' do banco).

**Why:** decisao D001 do Caio — dado seedado de fontes publicas e RASCUNHO e
so vira `VALIDADO_MEDICO` apos validacao medica explicita. Se o cliente
pudesse setar `origemDado` livre, burlaria o portao de confianca clinica
(elevacao indevida de confianca do dado).

**How to apply:** qualquer transicao `SEED_RASCUNHO -> VALIDADO_MEDICO` deve
ser via script/fluxo administrativo dedicado com auditoria, nunca por edicao
livre da substancia. Ao adicionar campos sensiveis novos, repetir esse padrao.

## Substancias NAO usa OpenAPI/Orval
A UI (`artifacts/clinica-motor/src/pages/substancias/index.tsx`) chama
`/api/substancias` direto via `apiFetch`. POST valida com
`insertSubstanciaSchema.safeParse`; PUT/PATCH usam `filtrarCampos(ALLOWED_FIELDS)`
como whitelist anti-mass-assignment. Mudou campo no banco? Atualizar o schema
Drizzle E o array `ALLOWED_FIELDS` da rota juntos.

## Cor vem da Natureza (D002) e eficacia reusa estrelas (D003)
Natureza do ativo auto-preenche `cor` (editavel) via helper `naturezaAtivo.ts`
(2 faces PENUMBRA claro/escuro). Eficacia NAO ganhou coluna nova: reusa
`classificacao_estrelas` (1-5). `potencia` e coluna nova com CHECK 1..5.

## Padrao de input numerico no modal
Campos numericos novos guardam STRING no estado e convertem no submit com
`numOuNull` (`"" | null -> null`, senao `Number`). Isso deixa o usuario LIMPAR
o campo (virar null). Os campos antigos genericos ainda usam `Number(e.target.value)`
que vira 0 ao limpar — divida tecnica pre-existente, fora do escopo desta onda.
