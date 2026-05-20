# 17 · 🧬 RNA Mensageiro — Unificação `mensageria-core`

> **Entregue 2026-05-19** · Wave RNA Mensageiro · proposta arquitetural Dr. Replit, dirigida a Caio (CEO).
> Status: **MERGED em `main`** · lib + rotas REST + testes verdes.

---

## TL;DR (1 parágrafo)

A camada de **mensageria** (gramática inline + adapter por canal + matriz de proveniência) que antes vivia _apenas_ no Teatro Mensageria do canvas (`mockup-sandbox`) foi extraída para uma **lib compartilhada** `@workspace/mensageria-core` e religada ao `api-server` via novas rotas REST `/api/mensageria/*`. Mesmo DNA roda agora no mockup, no backend real e (em wave futura) no `clinica-motor` — sem cópia/paste. As primitivas (`parseInline`, `adaptarParaCanal`, `tokenParaCanal`, `CANAIS`, `ORIGEM_DB_PLACEHOLDER`, `tracarProveniencia`) viraram **fonte única**. Conclui-se com **SELECT/UPSERT reais** em `mensagens_catalogo`, validando templates pela mesma gramática inline antes de persistir.

---

## 🧠 Metáfora "RNA mensageiro"

| Biologia | PAWARDS |
|---|---|
| DNA no núcleo | `lib/mensageria-core/src/` (fonte única, versionada) |
| RNA mensageiro | `import { … } from "@workspace/mensageria-core"` |
| Ribossomo (mockup) | `TeatroMensageriaPadua.tsx` (renderiza preview no canvas) |
| Ribossomo (backend) | `routes/mensageriaCore.ts` (entrega via REST) |
| Ribossomo (web real) | `clinica-motor` (próxima wave) |

Antes da unificação havia **uma cópia da gramática no mockup**; após esta wave, o backend produz o mesmo texto adaptado bit a bit que o canvas mostra ao Caio.

---

## 📦 Estrutura da nova lib

```
lib/mensageria-core/
├── package.json                 # @workspace/mensageria-core
├── tsconfig.json                # composite + emitDeclarationOnly
└── src/
    ├── index.ts                 # barrel
    ├── types.ts                 # Canal, CapacidadesCanal, InlineToken, …
    ├── canais.ts                # CANAIS (matriz de capacidades por canal)
    ├── parser.ts                # parseInline (gramática WA-canônica)
    ├── adapter.ts               # adaptarParaCanal + tokenParaCanal (token-aware, escape correto MV2)
    ├── proveniencia.ts          # ORIGEM_DB_PLACEHOLDER + tracarProveniencia
    ├── parser.test.ts           # node:test
    └── adapter.test.ts          # node:test (cobre escape MV2 e degrade WA)
```

### Decisões de design

1. **`composite: true` + `emitDeclarationOnly: true`** — segue padrão das outras libs (`lib/posologia`, `lib/exports`).
2. **Sem dependência de runtime** — pure TS, zero imports externos. Pode ser consumido por browser (canvas), Node (api-server) e React Native (clinica-motor mobile, se vier).
3. **`tokenParaCanal` separado de `adaptarParaCanal`** — o primeiro retorna token degradado para render JSX (UI mostra exatamente como vai aparecer no destino); o segundo retorna a **string** pronta pra mandar via API do canal.
4. **Escape MV2 token-aware** — `MV2_RESERVADOS = /([_*\[\]()~\`>#+\-=|{}.!\\])/g` aplicado SÓ em segmentos `text`, jamais nos marcadores. Isso elimina a classe inteira de "Telegram 400 Bad Request: Can't parse entities".

---

## 🔁 Refator no consumidor (mockup-sandbox)

`artifacts/mockup-sandbox/src/components/mockups/prescricao-rapida/_teatro.ts` agora re-exporta as primitivas em vez de duplicá-las:

```ts
export {
  CANAIS,
  ORIGEM_DB_PLACEHOLDER,
  parseInline,
  adaptarParaCanal,
  tokenParaCanal,
  tracarProveniencia,
} from "@workspace/mensageria-core";
export type {
  Canal, CapacidadesCanal, InlineToken, InlineTokenTipo, LinhaProveniencia,
} from "@workspace/mensageria-core";
```

`TeatroMensageriaPadua.tsx` continua importando de `_teatro.ts` — **zero mudança no componente**, porque a re-exportação preserva a superfície pública. Migração não-disruptiva.

---

## 🌐 Novas rotas REST no api-server

Mount: `router.use("/mensageria", mensageriaCoreRouter)` em `artifacts/api-server/src/routes/index.ts`.

| Método | Path | Função |
|---|---|---|
| `GET` | `/api/mensageria/canais` | Retorna matriz `CANAIS` (capacidades por canal) — usado por UIs de seleção de canal |
| `POST` | `/api/mensageria/adaptar` | `{texto, canal}` → texto adaptado (escape correto, degrade gracioso) |
| `POST` | `/api/mensageria/proveniencia` | `{template, valores}` → linhas `LinhaProveniencia[]` (placeholder → tabela.coluna) |
| `GET` | `/api/mensageria/catalogo/:chave` | **SELECT** template canônico do `mensagens_catalogo` |
| `PUT` | `/api/mensageria/catalogo/:chave` | **UPSERT** template editado (valida gramática via `parseInline` antes de persistir) |

Todas atrás de `requireAuth` (autenticação CEO/operador, multi-tenant via `tenantContextMiddleware`).

---

## 🗄️ SELECT/UPSERT — comandos finais reais

### SELECT (carrega template canônico)

```sql
SELECT id, categoria, chave, ordem, conteudo, ativo, atualizado_em
FROM mensagens_catalogo
WHERE chave = $1 AND ativo = true
LIMIT 1;
```

Exemplo de `chave`: `abertura.IM` (abertura de Início da Manhã), `fala_caio.semana_kaizen`, `obs.dose`.

### UPSERT (salva template editado pelo CEO)

```sql
INSERT INTO mensagens_catalogo (categoria, chave, ordem, conteudo, ativo, atualizado_em)
VALUES ($1, $2, $3, $4::jsonb, true, now())
ON CONFLICT (categoria, chave) DO UPDATE
  SET conteudo      = EXCLUDED.conteudo,
      ordem         = EXCLUDED.ordem,
      ativo         = true,
      atualizado_em = now()
RETURNING id, categoria, chave, ordem, conteudo, atualizado_em;
```

> **Invariante crítica:** o handler `PUT /catalogo/:chave` chama `parseInline(conteudo)` ANTES do UPSERT.
> Se a gramática inline estiver quebrada (marcadores não fechados, etc.), retorna `422` e **nada é gravado**.
> Isso impede que um template editado pelo Caio derrube o disparo da Beatriz Romanov em produção.

A tabela `mensagens_catalogo` já existe desde a Migration `014_wave2_mensageria.sql` — nenhuma migration nova foi necessária nesta wave (regra ferro: nunca dropar/substituir tabelas com dados).

---

## ✅ Validação

- `pnpm --filter @workspace/mensageria-core test` → **7 pass / 0 fail** (cobre parseInline + adapter WA/MV2/HTML + degrade)
- `npx tsc -b lib/mensageria-core` → **build limpo**
- api-server workflow restartou sem erro após mount da nova rota
- O Teatro Mensageria no canvas (shape `motor-mensageria-padua`, 2800×3700) continua funcionando idêntico — agora consumindo da lib

---

## 🔗 Raw URLs (substitua `<BRANCH>` por `main` ou a branch atual)

Padrão: `https://raw.githubusercontent.com/<OWNER>/<REPO>/<BRANCH>/<path>`

**Lib:**
- `lib/mensageria-core/package.json`
- `lib/mensageria-core/src/index.ts`
- `lib/mensageria-core/src/types.ts`
- `lib/mensageria-core/src/canais.ts`
- `lib/mensageria-core/src/parser.ts`
- `lib/mensageria-core/src/adapter.ts`
- `lib/mensageria-core/src/proveniencia.ts`
- `lib/mensageria-core/src/parser.test.ts`
- `lib/mensageria-core/src/adapter.test.ts`

**Backend:**
- `artifacts/api-server/src/routes/mensageriaCore.ts`
- `artifacts/api-server/src/routes/mensagens.ts` (CRUD pré-existente, continua válido)
- `artifacts/api-server/src/db/migrations/014_wave2_mensageria.sql` (schema da `mensagens_catalogo`)

**Consumidor mockup (após refator):**
- `artifacts/mockup-sandbox/src/components/mockups/prescricao-rapida/_teatro.ts`
- `artifacts/mockup-sandbox/src/components/mockups/prescricao-rapida/TeatroMensageriaPadua.tsx`

**Wiring do workspace:**
- `tsconfig.json` (root — `references` inclui `./lib/mensageria-core`)
- `pnpm-workspace.yaml`

---

## 📌 Próximos passos sugeridos (não executados nesta wave)

1. **Migrar `clinica-motor`** (web real) a consumir `@workspace/mensageria-core` no editor de templates do painel CEO — atualmente ainda usa lógica local antiga.
2. **`prescricoesLembrete.ts`** — re-roteear o gerador de lembrete para passar o texto canônico por `adaptarParaCanal()` antes do `whatsappService.enviar()`, eliminando o último ponto onde escape MV2 podia escapar.
3. **Adicionar `link_inline` ao parser** — hoje degradado pra texto puro nos 3 canais; é o único item da matriz de capacidades ainda não implementado no `parseInline`.
4. **Disparo real WhatsApp Twilio pro celular do CEO** — follow-up #478 já registrado, fora do escopo desta wave.

---

> _Notação Dr. Claude:_ esta wave fecha a divergência arquitetural entre canvas e produção. Toda gramática de mensageria do PAWARDS agora respira do mesmo pulmão.
