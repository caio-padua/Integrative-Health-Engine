# README — TRANSPLANTE do braço (IHE -> Manager)

> De: Dr. Replit Pawards (repo `caio-padua/Integrative-Health-Engine`)
> Para: Dr. Replit Manager (repo `caio-padua/Protocolo-Manager`)
> Data: 15/06/2026

## O QUE E ISTO

O "braço" pronto da transmutação: você (Manager) não precisa escrever a migração
nem o importador. Eu já escrevi, no formato exato do seu repl (Drizzle + `drizzle-kit
push` + script `tsx` no pacote `@workspace/scripts`). Você só PUXA, encaixa e RODA.

## REGRA DE OURO (inegociável)

So ADICIONAR tabela/coluna nova ou AFROUXAR restrição que barra dado.
Nunca apagar tabela, nunca dropar dado, nunca trocar schema que já funciona.
Tudo entra com etiqueta `origem_transmutacao = 'IHE_TRANSMUTACAO_26.06.13'` —
da pra limpar e refazer (idempotente). Rodar 2x NAO duplica.

## OS 4 ARQUIVOS DESTE BRAÇO (raw GitHub do IHE, branch `ver-l2-dr-claude`)

| arquivo (raw)                       | vira no seu repl                          |
| :---------------------------------- | :---------------------------------------- |
| `codigo/schema_catalogo_ihe.ts`     | `lib/db/src/schema/catalogo-ihe.ts`       |
| `codigo/clients_PATCH.md`           | instruções de edição de `lib/db/src/schema/clients.ts` |
| `codigo/importar_transmutacao_ihe.ts` | `scripts/src/importar-transmutacao-ihe.ts` |
| `codigo/README_TRANSPLANTE.md`      | este guia                                 |

Base do prefixo raw:
`https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/docs/dr-replit/PARA_MANAGER/`

As 2 bases de dados (catálogo e pacientes) o importador baixa sozinho do raw;
não precisa copiar os JSON.

## PASSO A PASSO (4 passos)

### Passo 1 — schema do catálogo
1.1 Crie `lib/db/src/schema/catalogo-ihe.ts` com o conteúdo de `schema_catalogo_ihe.ts`.
1.2 No `lib/db/src/schema/index.ts`, acrescente no fim:
    `export * from "./catalogo-ihe";`

### Passo 2 — patch do clients
2.1 Aplique `clients_PATCH.md` em `lib/db/src/schema/clients.ts`:
    afrouxar `cpf/email/phone` + adicionar 4 colunas aditivas + importar `jsonb`.

### Passo 3 — aplicar no banco
3.1 Rode: `pnpm --filter @workspace/db run push`
3.2 Confirme que criou as 7 tabelas novas e afrouxou o `clients` (sem unique no cpf).

### Passo 4 — importador
4.1 Crie `scripts/src/importar-transmutacao-ihe.ts` com `importar_transmutacao_ihe.ts`.
4.2 No `scripts/package.json`:
    - em `"scripts"`, adicione: `"transmutar": "tsx ./src/importar-transmutacao-ihe.ts"`
    - em `"dependencies"`, adicione: `"@workspace/db": "workspace:*"`
    - garanta `"drizzle-orm": "catalog:"` nas dependências do pacote scripts.
4.3 Rode (atrás do seu token de admin):
    `ADMIN_TOKEN=<seu_token> pnpm --filter @workspace/scripts run transmutar`

## CONFERENCIA FINAL (o que o relatório deve bater)

| coleção          | esperado |
| :--------------- | -------: |
| periodos_dia     |        9 |
| itens            |      457 |
| formulas         |       54 |
| injetaveis       |      305 |
| implantes        |       32 |
| blends           |       12 |
| blend_ativos     |       63 |
| pacientes        |    5.416 |

O relatório do importador imprime: criados / atualizados / em_revisao por coleção.
Pacientes marcados `[REVISAR_DUP_CPF]` em `notes` = CPF colidiu com nome diferente
(mãe/filha) e por segurança NÃO foram fundidos — revisar a mão depois.

## SE PRECISAR LIMPAR E REFAZER

Tudo tem `origem_transmutacao = 'IHE_TRANSMUTACAO_26.06.13'`. Para refazer do zero,
apague só as linhas com essa etiqueta (catálogo) e os clients com
`origem_transmutacao` igual — o resto do seu banco fica intacto.

RESUMO EM 1 LINHA: 4 arquivos prontos no raw do IHE; você cria 2 arquivos, aplica 1 patch, roda `db push` e o `transmutar`, e confere as contagens — sem escrever migração nem importador.
