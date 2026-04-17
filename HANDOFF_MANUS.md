# 🏥 HANDOFF — DE REPLIT AGENT (cirurgião sênior) PARA MANUS (cirurgião delegado)

> **Documento técnico-operacional para Manus AI**
> **Cliente final**: Dr. Caio Henrique Fernandes Pádua (Instituto Pádua / PADUCCIA)
> **Projeto**: PAWARDS / Motor Clínico — SaaS médico multi-tenant
> **Repositório alvo (este projeto)**: https://github.com/caio-padua/Integrative-Health-Engine — branch `replit-agent`
> **Data**: 17/04/2026
> **Autor**: Replit Agent (Anthropic Claude Sonnet 4.5)
> **Destinatário**: Manus AI (operando em Workspace paralelo)

---

## 📋 Sumário

1. [Quem somos e qual o protocolo cirúrgico](#1-quem-somos-e-qual-o-protocolo-cirúrgico)
2. [O que eu li dos seus repositórios](#2-o-que-eu-li-dos-seus-repositórios)
3. [Avaliação técnica do que você fez](#3-avaliação-técnica-do-que-você-fez)
4. [A "casa" onde o transplante vai acontecer — anatomia técnica](#4-a-casa-onde-o-transplante-vai-acontecer--anatomia-técnica)
5. [Regras de ouro (cláusulas pétreas)](#5-regras-de-ouro-cláusulas-pétreas)
6. [O TRABALHO QUE VOCÊ VAI FAZER](#6-o-trabalho-que-você-vai-fazer)
7. [Checklist de validação que VOCÊ executa antes de entregar](#7-checklist-de-validação-que-você-executa-antes-de-entregar)
8. [Checklist de teste que o Dr. Caio vai executar](#8-checklist-de-teste-que-o-dr-caio-vai-executar)
9. [Formato de entrega para mim](#9-formato-de-entrega-para-mim)
10. [Erros possíveis e mitigações](#10-erros-possíveis-e-mitigações)
11. [Kaizen — onde você pode ir além](#11-kaizen--onde-você-pode-ir-além)
12. [Glossário rápido](#12-glossário-rápido)

---

## 1. Quem somos e qual o protocolo cirúrgico

| Papel | Quem | Responsabilidade |
|---|---|---|
| **Paciente** | Motor Clínico (este repo) | Recebe o "coração" PADCOM |
| **Coração doador** | Anamnesis-Helper (seu repo) | Componente PADCOM V15 |
| **Cirurgião sênior** | Replit Agent (eu) | Autoriza, valida anatomia, executa transplante final |
| **Cirurgião delegado** | Manus AI (você) | Prepara o coração: extrai, adapta, testa, entrega encaixável |
| **Dr. responsável** | Dr. Caio | Cliente final, decisor, validador clínico-comercial |

**Protocolo**:
1. Você (Manus) lê esta carta inteira
2. Você reformata o PADCOM seguindo a "anatomia" deste projeto (seções 4 e 5)
3. Você roda os checklists da seção 7
4. Você entrega no formato da seção 9
5. **Eu** (Replit Agent) recebo, reviso, valido anatomia
6. **Só eu** executo o `git merge` / cópia de arquivos no projeto vivo
7. Dr. Caio testa pela tela final (seção 8)

**Você nunca toca diretamente neste repositório.** Trabalha em fork ou branch isolada.

---

## 2. O que eu li dos seus repositórios

Clonei e analisei **2 repositórios públicos** do Dr. Caio:

### 2.1. `Anamnesis-Helper` (👍 ALVO PRINCIPAL — está alinhado conosco)

**URL**: https://github.com/caio-padua/Anamnesis-Helper
**Stack**: pnpm monorepo, Express 5, Drizzle, React 19 + Vite, Zod, Orval — **idêntico ao nosso**.
**Estrutura**:
```
artifacts/
  api-server/      ← shared API, port 8080
  mockup-sandbox/  ← Vite preview, port 8081
  padcom/          ← PADCOM Anamnese SaaS V15 (UI mocada, sem backend)
lib/
  db/, api-spec/, api-client-react/, api-zod/
```

**O que tem dentro do `padcom/`** (descrito no `replit.md` do próprio repo):
- Questionário clínico de **5 módulos / 34 perguntas**
- Score 0–100 com **4 bandas de conduta**
- **Motor mapping**: exames, fórmula sempre, IM/EV/implantes
- **Funil comercial** integrado
- **Fluxo paciente mobile-first** com autosave em `localStorage` chave `padcom:draft`
- Rotas paciente: `/`, `/anamnese`, `/anamnese/concluido`
- Rotas admin desktop-densas: `/admin`, `/admin/p/:id`, `/admin/dashboard`
- Dashboard com Recharts (distribuição de bandas + funil)

**Citação literal do replit.md dele**:
> "Designed for later integration with the Integrative-Health-Engine Replit project; today fully independent with mocks."

➡️ **Conclusão**: foi **desenhado pra ser absorvido por nós**. Sua missão é exatamente essa.

### 2.2. `padcom-saas` (⚠️ LEGADO — só raspar conceitos)

**URL**: https://github.com/caio-padua/padcom-saas
**Stack**: tRPC, estrutura `client/server/shared` — **NÃO compatível** com nosso REST + monorepo.
**O que tem**:
- 14 schemas (todos no `todo.md`): patients, consultants, anamnesis_questions, anamnesis_sessions, anamnesis_responses, daily_reports, prescriptions, prescription_components, prescription_reports, **alerts**, **alert_rules**, **follow_up_sessions**, exams, **audit_log**
- 27 páginas frontend
- APIs tRPC com motor de alertas categorizáveis

➡️ **O que aproveitamos daqui**: APENAS as **idéias de schema** que nos faltam — `alert_rules`, `follow_up_sessions`, `prescription_components`, `audit_log`. Nada de código direto.

---

## 3. Avaliação técnica do que você fez

Vou ser direto e profissional, sem cerimônia.

### ✅ Acertos do `Anamnesis-Helper`

| Acerto | Por quê é bom |
|---|---|
| Mesma stack do alvo (pnpm/Express/Drizzle/Zod/React 19) | Encaixa sem reescrever |
| Estrutura `artifacts/` espelhada | Posso pegar `artifacts/padcom/` e mover quase intacto |
| Mobile-first com autosave em localStorage | UX sólida, não preciso refazer |
| Scoring isolado em `src/data/scoring.ts` (computeScore, bandFor, motorActions) | Lógica pura, fácil de auditar e portar |
| Mocks separados em `src/data/mockPatients.ts` | Trocar mock por API real é 1 hook |
| Dashboard Recharts | Já temos Recharts no Motor — mesma lib |

### ⚠️ Pontos que precisam atenção (suas tarefas)

| Problema potencial | Por quê | Como resolver |
|---|---|---|
| Nomenclatura em **inglês** (`patients`, `consultants`) | Nosso projeto é **PT-BR puro** (`pacientes`, `colaboradores`) | Renomear tudo antes de entregar |
| Schema sem `pgTable` no `Anamnesis-Helper` (mockado) | Você ainda não materializou o banco | Criar schemas Drizzle PT-BR seguindo o padrão da seção 4.4 |
| `/anamnese` colide com nossa rota existente | Já temos `pages/anamnese/` aqui | Renomear pra `/padcom-anamnese` ou subrota `/motor/padcom` |
| `localStorage` chave `padcom:draft` | Pode conflitar | Prefixar: `pawards:padcom:draft` |
| Não vi tratamento de **multi-tenant** (clinicaId) | Nosso modelo é multi-tenant | Toda tabela nova precisa coluna `clinicaId` (FK opcional inicialmente) |

### ❌ Coisas a NÃO trazer

- Toda a estrutura `client/server/shared` do `padcom-saas` (tRPC) — descarte
- Páginas do `padcom-saas` (27 telas) — design antigo, não combina com PAWARDS
- Mocks de paciente do `Anamnesis-Helper` — temos seed real fictício validado

---

## 4. A "casa" onde o transplante vai acontecer — anatomia técnica

Esta é a **planta hidráulica e elétrica** do projeto. Decore antes de tocar em qualquer coisa.

### 4.1. Stack oficial (versões catalogadas em `pnpm-workspace.yaml`)

| Camada | Tech | Versão |
|---|---|---|
| Package manager | pnpm workspaces | catalog mode |
| Runtime | Node | 24 |
| Linguagem | TypeScript | 5.9 |
| API | Express | 5 |
| ORM | Drizzle | ^0.45.1 |
| Validação | Zod | ^3.25.76 (strict mode V3, **não V4**) |
| Codegen API | Orval (do OpenAPI spec) | — |
| Frontend | React | 19.1.0 |
| Build frontend | Vite | ^7.3.0 |
| Build backend | esbuild | 0.27.3 (CJS bundle) |
| State server | TanStack Query | ^5.90.21 |
| UI | Tailwind CSS | ^4.1.14 |
| Animação | Framer Motion | ^12.23.24 |
| Ícones | Lucide React | ^0.545.0 |
| DB | PostgreSQL (Neon serverless) | — |

**Importante**: Tudo vem do `catalog:` do `pnpm-workspace.yaml`. **Não adicione versões fixas em `package.json`** — use `"react": "catalog:"`.

### 4.2. Topologia de pastas (o "mapa da casa")

```
/
├── artifacts/
│   ├── api-server/             ← Backend Express (port 8080)
│   │   └── src/
│   │       ├── index.ts        ← bootstrap + monta /api → routes/index.ts
│   │       ├── routes/         ← 66 arquivos de rota REST
│   │       ├── seed-*.ts       ← seeds idempotentes
│   │       └── lib/            ← helpers internos (stripe, pino, etc.)
│   ├── clinica-motor/          ← Frontend React (port via $PORT)
│   │   └── src/
│   │       ├── pages/          ← 50 páginas .tsx (rotas)
│   │       ├── components/
│   │       ├── lib/
│   │       └── App.tsx         ← React Router
│   └── mockup-sandbox/         ← Vite preview pra Canvas
│
├── lib/                        ← Pacotes compartilhados (workspace)
│   ├── db/                     ← @workspace/db
│   │   └── src/schema/         ← 48 arquivos de schema, 138+ tabelas
│   ├── api-spec/               ← OpenAPI spec
│   ├── api-zod/                ← Schemas Zod gerados
│   └── api-client-react/       ← Hooks React Query gerados (Orval)
│
├── lib/integrations/           ← Conectores (Google, GitHub, etc.)
├── scripts/
├── attached_assets/            ← Arquivos do Caio (PDFs, imagens, docs)
├── pnpm-workspace.yaml
├── replit.md                   ← Instruções persistentes do projeto
└── .local/CONSOLIDADO_NEGOCIO_DR_CAIO.md  ← BÍBLIA do modelo (LEIA)
```

### 4.3. Como rodam os serviços

| Serviço | Comando | Porta |
|---|---|---|
| API server | `pnpm --filter @workspace/api-server run dev` | 8080 |
| Frontend | `pnpm --filter @workspace/clinica-motor run dev` | `$PORT` |
| Mockup sandbox | `pnpm --filter @workspace/mockup-sandbox run dev` | `$PORT` |

### 4.4. Padrão obrigatório — Schema Drizzle (PT-BR)

```typescript
// lib/db/src/schema/exemploPadcom.ts
import { pgTable, varchar, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const padcomQuestionariosTable = pgTable("padcom_questionarios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clinicaId: varchar("clinica_id"),                   // multi-tenant
  pacienteId: varchar("paciente_id").notNull(),       // FK lógica → pacientes
  modulo: integer("modulo").notNull(),                // 1..5
  ordem: integer("ordem").notNull(),
  pergunta: varchar("pergunta", { length: 500 }).notNull(),
  respostaJson: jsonb("resposta_json"),
  scoreParcial: integer("score_parcial"),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em").notNull().defaultNow(),
});

export const insertPadcomQuestionarioSchema = createInsertSchema(padcomQuestionariosTable);
export const selectPadcomQuestionarioSchema = createSelectSchema(padcomQuestionariosTable);
```

**Regras**:
- Nome do arquivo: `camelCase.ts` (`padcomQuestionarios.ts`)
- Nome da exportação da tabela: `xxxxxxTable` (sufixo `Table`)
- Nome da string SQL: `snake_case` (`padcom_questionarios`)
- ID: **sempre** `varchar` com `gen_random_uuid()` (NUNCA `serial`)
- Timestamps: `criadoEm` / `atualizadoEm` em PT-BR
- Multi-tenant: `clinicaId` em **toda** tabela nova
- Exporte `insertXxxxSchema` e `selectXxxxSchema` no mesmo arquivo
- Adicione o re-export em `lib/db/src/schema/index.ts`

### 4.5. Padrão obrigatório — Rota REST Express

```typescript
// artifacts/api-server/src/routes/padcomQuestionario.ts
import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { padcomQuestionariosTable, insertPadcomQuestionarioSchema } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router();

router.get("/padcom-questionarios", async (req: Request, res: Response): Promise<void> => {
  const rows = await db.select().from(padcomQuestionariosTable).orderBy(asc(padcomQuestionariosTable.ordem));
  res.json(rows);
});

router.post("/padcom-questionarios", async (req: Request, res: Response): Promise<void> => {
  const parsed = insertPadcomQuestionarioSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [row] = await db.insert(padcomQuestionariosTable).values(parsed.data).returning();
  res.status(201).json(row);
});

export default router;
```

**Regras de rota** (PERIGO ZONE — bug que cometi e corrigi):
- O `routes/index.ts` é montado em `/api` no `app.use("/api", routes)` lá no `index.ts`
- **NÃO** prefixe rotas com `/api/...` — use path **relativo** (`/padcom-questionarios`)
- Senão vira `/api/api/padcom-questionarios` → 404
- Sempre `Promise<void>` no handler async
- Sempre `safeParse` antes de inserir
- Sempre `return` após responder em early returns

### 4.6. Padrão obrigatório — Página Frontend

```tsx
// artifacts/clinica-motor/src/pages/padcom-anamnese.tsx
import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";

export default function PadcomAnamnese() {
  const { data, isLoading } = useQuery({
    queryKey: ["padcom-questionarios"],
    queryFn: async () => {
      const r = await fetch("/api/padcom-questionarios");
      if (!r.ok) throw new Error("Falha ao carregar");
      return r.json();
    },
  });

  return (
    <Layout>
      <div className="p-6 space-y-4">
        <h1 className="text-3xl font-bold text-[hsl(var(--pawards-cyan))]">PADCOM Anamnese</h1>
        {/* ... */}
      </div>
    </Layout>
  );
}
```

**Regras de UI**:
- Use `<Layout>` (sidebar PAWARDS já vem) em telas de admin
- Tema dark é o padrão — cores via tokens HSL `--pawards-cyan`, `--pawards-bg`, etc.
- Tailwind utility-first
- TanStack Query para todos fetches
- Registre a rota em `artifacts/clinica-motor/src/App.tsx`

### 4.7. Como o frontend conversa com o backend

- Vite proxy: `/api/*` → `http://localhost:8080/api/*` (configurado em `vite.config.ts`)
- No browser: `fetch("/api/padcom-questionarios")` simples, sem CORS
- Não use URLs absolutas — sempre relativas

### 4.8. Banco de dados — tabelas que JÁ existem (não recriar)

Nomes que já estão no `lib/db/src/schema/` — **não duplique**:
```
acompanhamento, agenda, agentesVirtuais, alertasNotificacao, anamneses,
auditoriaCascata, avaliacaoEnfermagem, avaliacoesCliente, blocos,
cadernosDocumentais, catalogo, cavaloClinical, codigosSemanticos,
codigosValidacao, colaboradores, comercial, comercialConfig, consultorias,
delegacao, estoque, farmaciasParceiras, ... (48 arquivos, 138+ tabelas)
```

Se for tocar em algo que JÁ existe → **não toque**, crie nome novo (`padcomXxx`).

---

## 5. Regras de ouro (cláusulas pétreas)

| # | Regra | Punição se quebrar |
|---|---|---|
| 1 | **ADDITIVE-ONLY** — nunca modifique schema existente, sempre crie novo | Quebra produção |
| 2 | **NUNCA mude tipo de PK** (serial ↔ varchar) | Migration destrutiva |
| 3 | **PT-BR** em tudo (schemas, rotas, vars, UI) | Inconsistência |
| 4 | **Multi-tenant**: toda tabela nova com `clinicaId` (nullable inicialmente) | Vazamento entre clínicas |
| 5 | **Versões via `catalog:`** no package.json | Conflito de versão |
| 6 | **Rotas REST relativas** (sem `/api/` prefix) | Erro 404 |
| 7 | **Zod V3** (`zod` import, NÃO `zod/v4`) | Quebra build |
| 8 | **Drizzle pgTable**, NÃO knex/typeorm/prisma | Conflito ORM |
| 9 | **Prefixar nomes novos** com `padcom_` | Colisão com tabelas existentes |
| 10 | **Não tocar em `attached_assets/`, `.local/`, `replit.md`** | Conteúdo do dono |
| 11 | **Não commitar segredos** (já tem coisa vazada — não piore) | Risco LGPD |
| 12 | **Não rodar `db:push --force`** sem revisão minha | Pode dropar tabelas |

---

## 6. O TRABALHO QUE VOCÊ VAI FAZER

### 6.1. Escopo (Cenário B — recomendado)

Você vai entregar **3 entregáveis** prontos pra eu transplantar:

#### 📦 ENTREGÁVEL 1 — Schemas Drizzle PT-BR

Criar **6 arquivos novos** em `lib/db/src/schema/`:

| Arquivo | Tabelas |
|---|---|
| `padcomQuestionarios.ts` | `padcom_questionarios` (catálogo das 34 perguntas, 5 módulos) |
| `padcomSessoes.ts` | `padcom_sessoes` (sessão por paciente, score final, banda) |
| `padcomRespostas.ts` | `padcom_respostas` (resposta individual de cada Q) |
| `padcomBandas.ts` | `padcom_bandas` (4 bandas de conduta + ações de motor) |
| `padcomAlertas.ts` | `padcom_alertas` + `padcom_alertas_regras` (motor de alertas) |
| `padcomAuditoria.ts` | `padcom_auditoria` (log LGPD) |

Para cada schema, **forneça também** o `INSERT` SQL inicial de seed (as 34 perguntas, 4 bandas, regras default).

#### 📦 ENTREGÁVEL 2 — Rotas REST

Criar **1 arquivo** em `artifacts/api-server/src/routes/padcom.ts` com:
- `GET/POST/PATCH/DELETE /padcom-questionarios`
- `POST /padcom-sessoes` (iniciar sessão)
- `POST /padcom-sessoes/:id/responder` (salvar resposta + recalcular score)
- `POST /padcom-sessoes/:id/finalizar` (computa banda final + dispara alertas)
- `GET /padcom-sessoes/:id` (status + respostas)
- `GET /padcom-bandas` (config das 4 bandas)

E **fornecer o trecho** pra adicionar em `routes/index.ts`:
```typescript
import padcomRouter from "./padcom";
// ...
router.use(padcomRouter);
```

#### 📦 ENTREGÁVEL 3 — UI React

Criar páginas em `artifacts/clinica-motor/src/pages/`:

| Arquivo | Rota | Função |
|---|---|---|
| `padcom/paciente.tsx` | `/padcom` | Fluxo paciente mobile-first com autosave |
| `padcom/concluido.tsx` | `/padcom/concluido` | Tela de "obrigado" + próximos passos |
| `padcom/admin.tsx` | `/padcom-admin` | Fila de sessões + funil chips |
| `padcom/admin-detalhe.tsx` | `/padcom-admin/:sessaoId` | Detalhe da sessão + ações motor |
| `padcom/admin-dashboard.tsx` | `/padcom-admin/dashboard` | Recharts: distribuição bandas + funil |

E **fornecer o diff** do `App.tsx` com as rotas registradas.

### 6.2. Onde você trabalha

**Você NÃO commita neste repo.** Crie:
- Um **fork** seu de `Integrative-Health-Engine`, OU
- Uma **pasta separada** `manus-padcom-bundle/` com toda a estrutura idêntica
- OU empacote tudo num `.zip` / `.tar.gz` com a árvore de pastas correta

### 6.3. O que NÃO fazer

- ❌ Não rode `pnpm install` no nosso projeto
- ❌ Não rode `db:push`
- ❌ Não modifique `pnpm-workspace.yaml`, `replit.md`, `.local/`, `attached_assets/`
- ❌ Não toque em rotas/schemas/páginas existentes (lista 4.8)
- ❌ Não comece a trabalhar antes de ler `.local/CONSOLIDADO_NEGOCIO_DR_CAIO.md` (bíblia do negócio)

---

## 7. Checklist de validação que VOCÊ executa antes de entregar

Marque cada item antes de passar pra mim:

### 7.1. Schema (Entregável 1)
- [ ] Todos os 6 arquivos criados em `lib/db/src/schema/`
- [ ] Re-exports adicionados em `lib/db/src/schema/index.ts`
- [ ] Todo schema tem `clinicaId: varchar("clinica_id")`
- [ ] Todo `id` é `varchar(...).default(sql\`gen_random_uuid()\`)`
- [ ] Cada arquivo exporta `insertXxxSchema` + `selectXxxSchema`
- [ ] Nenhum nome colide com a lista 4.8
- [ ] SQL de seed inicial fornecido pra cada tabela
- [ ] `pnpm --filter @workspace/db typecheck` passa sem erro

### 7.2. Rotas (Entregável 2)
- [ ] Path relativo (sem `/api/` prefix)
- [ ] Handler `Promise<void>`
- [ ] `safeParse` antes de insert
- [ ] Imports vêm de `@workspace/db` (não de path relativo)
- [ ] Trecho de registro em `routes/index.ts` fornecido
- [ ] Testado com `curl` localmente: GET retorna `[]` e POST cria registro

### 7.3. UI (Entregável 3)
- [ ] Layout `<Layout>` usado nas telas de admin
- [ ] TanStack Query em todos os fetches
- [ ] Cores via tokens HSL PAWARDS
- [ ] Autosave em `pawards:padcom:draft` (chave prefixada)
- [ ] Mobile responsive na tela paciente
- [ ] Recharts usado no dashboard (já é a lib do projeto)
- [ ] Diff do `App.tsx` fornecido
- [ ] `pnpm --filter @workspace/clinica-motor typecheck` passa

### 7.4. Documentação de entrega
- [ ] README explicando ordem de aplicação
- [ ] Lista de arquivos novos
- [ ] Lista de arquivos modificados (deve ter SÓ `index.ts` do schema, `routes/index.ts`, `App.tsx`)
- [ ] Comandos pra rodar seed
- [ ] Riscos conhecidos

---

## 8. Checklist de teste que o Dr. Caio vai executar

Ele vai testar pela tela. Garanta que estes fluxos funcionam:

### 8.1. Fluxo Paciente
- [ ] Abre `/padcom` no celular → vê primeira pergunta do módulo 1
- [ ] Responde → autosava (fecha aba e reabre, dado preservado)
- [ ] Avança → barra de progresso mostra 1/34, 2/34, ...
- [ ] Termina → vai pra `/padcom/concluido` com mensagem
- [ ] Mensagem orienta próximo passo (validação 6Q presencial)

### 8.2. Fluxo Médico/Admin
- [ ] Abre `/padcom-admin` → fila com chips coloridos por banda
- [ ] Clica num paciente → vê todas as 34 respostas + score parcial por módulo
- [ ] Vê "ações de motor" sugeridas (exames, fórmula, IM/EV)
- [ ] Botão "Validar e enviar pra anamnese 6Q" funciona
- [ ] `/padcom-admin/dashboard` mostra Recharts com distribuição

### 8.3. Integração com o resto do Motor
- [ ] Sessão PADCOM finalizada cria registro em `pacientes` (se ainda não existir)
- [ ] Anamnese 6Q (já existente) consegue ler `padcom_sessoes` por `pacienteId`
- [ ] Não quebrou nenhuma rota antiga (rodar `/dashboard`, `/agenda`, `/admin-comercial`)

---

## 9. Formato de entrega para mim

Você entrega como **1 ZIP** com a estrutura abaixo:

```
manus-padcom-bundle.zip
├── README.md                              ← visão geral + ordem de aplicação
├── DIFF.md                                ← lista de arquivos novos vs modificados
├── novos/
│   ├── lib/db/src/schema/
│   │   ├── padcomQuestionarios.ts
│   │   ├── padcomSessoes.ts
│   │   ├── padcomRespostas.ts
│   │   ├── padcomBandas.ts
│   │   ├── padcomAlertas.ts
│   │   └── padcomAuditoria.ts
│   ├── artifacts/api-server/src/routes/
│   │   └── padcom.ts
│   └── artifacts/clinica-motor/src/pages/padcom/
│       ├── paciente.tsx
│       ├── concluido.tsx
│       ├── admin.tsx
│       ├── admin-detalhe.tsx
│       └── admin-dashboard.tsx
├── modificados/
│   ├── lib/db/src/schema/index.ts.diff    ← formato unified diff
│   ├── artifacts/api-server/src/routes/index.ts.diff
│   └── artifacts/clinica-motor/src/App.tsx.diff
├── seeds/
│   ├── 001-padcom-questionarios.sql       ← 34 perguntas
│   ├── 002-padcom-bandas.sql              ← 4 bandas
│   └── 003-padcom-alertas-regras.sql      ← regras default
├── tests/
│   ├── curl-tests.sh                      ← script de teste das rotas
│   └── screenshots/                       ← prints das telas funcionando
└── RISCOS.md                              ← o que pode dar errado
```

**Como eu valido**:
1. Descompacto em `/tmp/manus-bundle/`
2. Leio `README.md` + `RISCOS.md`
3. Confiro `DIFF.md` contra a regra 4.8
4. Comparo cada schema novo com nosso padrão da seção 4.4
5. Aplico em **branch separada** do nosso repo
6. Rodo typecheck + restart workflows
7. Rodo `tests/curl-tests.sh`
8. Faço screenshot das 5 telas
9. Se tudo passa → merge na `replit-agent`
10. Se falha → te devolvo com o relatório de problemas

---

## 10. Erros possíveis e mitigações

| Erro provável | Sintoma | Mitigação |
|---|---|---|
| Conflito de FK com `pacientes` | `padcom_sessoes` referencia paciente que não existe | Use FK lógica (sem `references()`), valide na rota |
| `routes/index.ts` mal-mergeado | Rota não responde (404) | Fornecer diff exato, eu aplico manual |
| `App.tsx` com import duplicado | Build quebra | Diff incremental, não reescrever |
| Zod V4 import vazado | `import { z } from "zod/v4"` quebra | Use `import { z } from "zod"` |
| Tipo de ID errado | Migration destrutiva ao `db:push` | Sempre `varchar` UUID |
| `clinicaId` esquecido | Multi-tenant vaza | Linter mental: cada tabela = `clinicaId` |
| localStorage colidindo | Estado misturado entre apps | Prefixo `pawards:padcom:` |
| Cores hardcoded | Tema dark quebra em algum lugar | Use HSL tokens |
| Fonte de catalog | `react: "19.1.0"` causa duplicate React | Use `"catalog:"` |
| Faltou `await` em handler async | Resposta vazia ou crash silencioso | Lint manual + teste com curl |
| RLS / auth não considerado | Endpoint exposto a qualquer um | Documente que falta auth, eu adiciono middleware depois |

---

## 11. Kaizen — onde você pode ir além

Se entregar o básico bem feito, **proponha** (não execute sem ok) estas melhorias:

| Melhoria | Por quê | Esforço |
|---|---|---|
| **Versionar o questionário** (`padcom_questionarios.versao`) | Caio quer evoluir as perguntas sem perder histórico | Baixo |
| **Snapshot imutável da sessão** | Resposta de hoje não pode mudar se a pergunta mudar amanhã | Médio |
| **Calcular score em SQL** (view materialized) ou em job | Performance em escala | Médio |
| **Webhook pra notificar fim de sessão** | Integração com agentes virtuais (já existem aqui) | Baixo |
| **Export PDF da sessão** | Anexo ao prontuário | Médio (já temos lib pdf no mockup-sandbox) |
| **i18n preparado** (mesmo que só PT por ora) | Caio fala em expandir LATAM | Baixo |
| **Telemetria de abandono** | Onde paciente desiste no questionário | Baixo |
| **Rate limit** nas rotas POST | Prevenção spam | Baixo |
| **OpenTelemetry tracing** | Observabilidade do motor de scoring | Médio |
| **Anonimização opcional pro dashboard** | LGPD — médico pode ver dados agregados sem identificar | Baixo |

**Princípio Kaizen aplicado**: você verá oportunidades que eu não vi. Liste-as no `RISCOS.md` ou num `KAIZEN.md` separado. Eu avalio e Caio decide.

---

## 12. Glossário rápido

| Termo | Significado |
|---|---|
| **PAWARDS** | Marca / sistema de design do projeto |
| **PADUCCIA** | Empresa do Dr. Caio |
| **PADCOM** | Componente de anamnese estruturada (versões V1...V22) |
| **Motor Clínico** | Nome interno do app (artifact `clinica-motor`) |
| **Anamnese 6Q** | Anamnese curta de validação pós-PADCOM (já existe aqui) |
| **Banda** | Faixa de score que define conduta clínica (4 bandas: cor/severidade) |
| **Cavalo Clínico** | Schema interno (`cavaloClinical.ts`) — não confundir |
| **Multi-tenant** | Várias clínicas isoladas no mesmo banco via `clinicaId` |
| **Additive-only** | Só adicionar colunas/tabelas, nunca alterar/remover |
| **6Q** | Anamnese de validação de 6 perguntas pós-triagem |
| **RAS / RASX** | Motor de raciocínio clínico interno (V6) |

---

## 🎬 Mensagem final pra você, Manus

Você está prestes a fazer trabalho cirúrgico num paciente vivo (sistema em desenvolvimento mas com lógica de negócio validada com o Dr. Caio em **8 dimensões A-H**). O Dr. Caio é TDAH+TOC+TEA — **previsibilidade**, **clareza** e **PT-BR** importam mais que elegância de código.

Ele me autorizou a delegar a você **UMA** missão clara: **preparar o coração PADCOM** pra eu transplantar. Você não vai operar. Vai entregar o órgão pronto, perfundido, no recipiente certo, com a anatomia do receptor decorada.

Se tiver dúvida em qualquer coisa desse documento, **pergunte ao Dr. Caio** que ele me consulta. Não invente. Inventar = rejeição na revisão.

Boa cirurgia.

— Replit Agent
17 de abril de 2026

---

**Anexos sugeridos pra você ler antes de começar:**

| Arquivo no repo | O que tem |
|---|---|
| `replit.md` | Visão geral + comandos |
| `.local/CONSOLIDADO_NEGOCIO_DR_CAIO.md` | Bíblia do modelo de negócio (validação A–H) |
| `lib/db/src/schema/comercialConfig.ts` | Padrão recente de schema PT-BR multi-config |
| `artifacts/api-server/src/routes/comercialAdmin.ts` | Padrão recente de rota CRUD genérica |
| `artifacts/clinica-motor/src/pages/admin-comercial.tsx` | Padrão recente de UI admin com 6 abas editáveis |
| `artifacts/api-server/src/routes/index.ts` | Como registrar router novo |
| `pnpm-workspace.yaml` | Catálogo de versões |
