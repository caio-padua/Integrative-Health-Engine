---
name: Drizzle .select() com coluna fantasma
description: Por que o drizzle lança "Cannot convert undefined or null to object" e como o desync do schema pacientes vira crash de rota.
---

# Drizzle `.select()` referenciando coluna inexistente no schema

Quando um `.select({ x: tabela.colunaQueNaoExisteNoSchemaDrizzle })` referencia
um campo que **não está definido no schema Drizzle** (ex.: `pacientesTable.celular`,
`pacientesTable.idade` — a tabela só tem `telefone` e `dataNascimento`), o valor
vira `undefined`. O drizzle-orm então quebra em `orderSelectedFields`
(`Object.entries(undefined)`) com a mensagem genérica:

> TypeError: Cannot convert undefined or null to object

**Pegadinha:** o erro NÃO é de banco e NÃO aponta a coluna culpada — o stack só
mostra `drizzle-orm/utils.ts orderSelectedFields`. Parece bug do PDF/serviço, mas
é projeção inválida montada antes de tocar o Postgres.

**Why:** o schema Drizzle de `pacientes` está dessincronizado em ~24 colunas vs o
banco real (dívida técnica conhecida; `db push` é perigoso). Rotas legadas que
projetam colunas "que deveriam existir" passam a quebrar silenciosamente.

**How to apply:**
1. Ao ver "Cannot convert undefined or null to object" com stack em
   `orderSelectedFields`, procure no `.select()` por campo `tabela.coluna` que NÃO
   exista no arquivo `lib/db/src/schema/*.ts` daquela tabela.
2. Conserto = mapear para a coluna real existente (não inventar coluna nem rodar
   `db push`). Ex.: `celular`→`telefone`, `idade`→derivar de `dataNascimento`.
3. Antes de afirmar conserto, reabra o stack expondo `err.stack` temporário na
   resposta (dev) — o `console.error` só logava `err.message`, sem stack.

## Nota lateral — RAS distribuir grava em subpasta fora da convenção
`POST /ras/distribuir/:sessaoId` faz upload via `uploadToClientSubfolder` numa
subpasta literal **"PROTOCOLOS"**, que NÃO segue a árvore numerada padrão do Drive
do paciente (`01 CADASTRO` … `07 PESQUISA`). O documento cai certo, mas fora do
padrão — candidato a alinhar com `03 PRESCRICOES`/`02 CLINICO` no futuro.
