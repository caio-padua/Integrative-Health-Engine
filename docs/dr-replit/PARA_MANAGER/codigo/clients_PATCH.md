# PATCH do `clients` (Manager) — afrouxar restricoes + colunas aditivas

> Destino: `lib/db/src/schema/clients.ts` no repl do Manager.
> REGRA DE OURO: so afrouxar e ADICIONAR. Nao apagar coluna, nao dropar dado.
> Aplicar com: `pnpm --filter @workspace/db run push`.

## 1) Afrouxar as 3 restricoes que VAO BARRAR a base do IHE

Hoje (rejeita a base — ha paciente sem CPF e CPF repetido mae/filha):

```ts
cpf: text("cpf").notNull().unique(),
email: text("email").notNull(),
phone: text("phone").notNull(),
```

Trocar por (a de-dup passa a ser do importador, nao do banco):

```ts
cpf: text("cpf"),
email: text("email"),
phone: text("phone"),
```

## 2) Adicionar 4 colunas ADITIVAS (rastreio + ficha clinica + etiqueta de origem)

Inserir dentro do `pgTable("clients", { ... })`, antes de `createdAt`:

```ts
  // --- TRANSMUTACAO IHE (aditivo, rastreio e limpeza idempotente) ---
  codigoOrigemIhe: text("codigo_origem_ihe"),
  unidadeOrigemIhe: integer("unidade_origem_ihe"),
  fichaClinicaIhe: jsonb("ficha_clinica_ihe"),
  origemTransmutacao: text("origem_transmutacao"),
```

## 3) Ajustar os imports do topo do arquivo

Garantir que `jsonb` esteja importado:

```ts
import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
```

## 4) Observacao sobre o `insertClientSchema`

O `createInsertSchema(clientsTable)` ja absorve as colunas novas automaticamente.
As 3 colunas afrouxadas viram opcionais no Zod — o importador preenche o que tiver.

RESUMO EM 1 LINHA: tirar `notNull/unique` de cpf/email/phone, somar 4 colunas aditivas (codigo_origem_ihe, unidade_origem_ihe, ficha_clinica_ihe jsonb, origem_transmutacao) e importar `jsonb`; depois `pnpm --filter @workspace/db run push`.
