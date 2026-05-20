# Auditoria Técnica — Wave 17 RNA Mensageiro

> **Auditor:** Dr. Claude · **Data:** 20/mai/2026
> **Commit auditado:** `2bf3e5d` (feat/mensageria-core)
> **Branch:** `feat/dominio-pawards`
> **Total de arquivos:** 23 (8 lib + 1 rota + 11 mockup + 2 docs + 1 tsconfig raiz)
> **Total de linhas:** ~4.700 (lib+rota+módulos internos)

---

## ⚠️ ACHADO ZERO — Arquivos destruídos

Antes de qualquer análise de código, registro o achado mais crítico:

**Os 23 arquivos da Wave 17 foram commitados em `2bf3e5d` (20/mai 01:07 UTC) e DELETADOS no commit subsequente `e5bae50` (20/mai 06:05 UTC)**, um checkpoint automático do Replit Agent intitulado "Update PDF generation and database migrations with new branding and configurations". O `routes/index.ts` foi editado para remover a linha `import mensageriaCoreRouter` e o `router.use("/mensageria", ...)`.

**Ação obrigatória:** restaurar todos os 23 arquivos e o mounting na rota antes de qualquer outro trabalho. Comandos:

```bash
# Restaurar todos os arquivos da Wave 17
git checkout 2bf3e5d -- \
  lib/mensageria-core/ \
  artifacts/api-server/src/routes/mensageriaCore.ts \
  artifacts/mockup-sandbox/src/components/mockups/prescricao-rapida/ \
  docs/dr-claude/17_RNA_MENSAGEIRO_UNIFICACAO.md \
  docs/dr-claude/raws/17_RNA_MENSAGEIRO_UNIFICACAO.md

# Restaurar o import+mount no routes/index.ts (verificar manualmente)
# Linha 43: import mensageriaCoreRouter from "./mensageriaCore";
# Linha 137: router.use("/mensageria", mensageriaCoreRouter);

git add -A && git commit -m "fix: restaurar Wave 17 RNA Mensageiro (deletada acidentalmente por checkpoint e5bae50)"
git push origin feat/dominio-pawards
```

---

## §1 — Corretude

### ✅ O que está correto

O **parser inline** (`parser.ts`) é um tokenizador single-pass que reconhece 6 tipos de marcação (bold `*`, italic `_`, underline `__`, strike `~`, mono `` ` `` e triple-backtick). Marcadores não fechados degradam graciosamente para texto puro — comportamento intencional e documentado. A ordem de precedência (triple-backtick → backtick → `__` → `*` → `_` → `~`) está correta e evita ambiguidade entre `__sublinhado__` e `_itálico_`.

O **adapter** (`adapter.ts`) faz escape token-aware para Telegram MarkdownV2: aplica `MV2_RESERVADOS` apenas em segmentos de `text`, preservando os marcadores intactos. Isso resolve a classe de erros "400 Bad Request: Can't parse entities" do Telegram. O `escHtml` trata `&`, `<`, `>` corretamente. O `escMv2Code` escapa apenas `` ` `` e `\` dentro de blocos code — correto por spec do Telegram.

As **rotas REST** usam template tags do Drizzle (`sql\`...\``) que parametrizam valores. Sem SQL injection. Validação de tipo no body (`typeof texto !== "string"`, `isCanal()`) é adequada.

### 🐛 Bugs encontrados

**BUG-1 · Validação morta no PUT /catalogo/:chave (severidade ALTA)**

O handler envolve `parseInline(conteudo)` em try/catch para rejeitar gramática inválida com 422. Porém `parseInline` **nunca lança exceção** — marcadores não fechados degradam para `text` silenciosamente. O try/catch é código morto. Qualquer conteúdo passa a "validação", incluindo templates com marcadores quebrados que produziriam mensagens mal formatadas em produção.

Correção proposta:

```typescript
// Nova função em parser.ts
export function validarInline(s: string): { valido: boolean; avisos: string[] } {
  const tokens = parseInline(s);
  const avisos: string[] = [];
  // Detectar marcadores abertos que degradaram para texto
  for (const t of tokens) {
    if (t.tipo === "text") {
      if (/(?:^|[^\\])\*[^ \n]/.test(t.texto)) avisos.push(`Possível *negrito* não fechado: "${t.texto.slice(0, 40)}"`);
      if (/(?:^|[^\\])_[^ \n]/.test(t.texto))  avisos.push(`Possível _itálico_ não fechado: "${t.texto.slice(0, 40)}"`);
    }
  }
  return { valido: avisos.length === 0, avisos };
}
```

**BUG-2 · Conteúdo wrappado em JSON desnecessariamente (severidade MÉDIA)**

O PUT serializa `const payload = JSON.stringify({ texto: conteudo })` e grava como `$4::jsonb`. Isso significa que o campo `conteudo` na tabela armazena `{"texto": "o conteúdo real"}` em vez da string direta. Porém o GET retorna o `conteudo` raw — quem lê o resultado do GET precisa fazer `.conteudo.texto` em vez de `.conteudo`. Inconsistência entre escrita e leitura.

---

## §2 — Segurança

### ✅ Pontos positivos

SQL parametrizado via Drizzle em todas as queries. A rota é montada atrás do middleware de auth upstream (`requireAuth` em `routes/index.ts`). O `isCanal()` usa type guard com whitelist fixa — não aceita valores arbitrários.

### 🔒 Riscos identificados

**SEC-1 · Sem auth próprio no arquivo de rota (risco MÉDIO)**

`mensageriaCore.ts` não declara nenhum middleware de auth. Depende 100% da ordem de montagem no `routes/index.ts`. Se alguém reorganizar o arquivo de rotas e mover o `router.use("/mensageria", ...)` para antes do `requireAuth`, as 5 rotas ficam expostas sem autenticação. Recomendação: adicionar `router.use(requireAuth)` no topo do próprio arquivo.

**SEC-2 · Sem limite de tamanho no input (risco MÉDIO)**

Os campos `texto`, `template` e `conteudo` não têm limite de comprimento. Um payload de 10MB passaria pelo parser (O(n) mas lento em strings enormes) e seria gravado no banco. Recomendação: validar `texto.length <= 10_000` (ou outro limite razoável para templates de mensageria).

**SEC-3 · UPSERT sem controle de tenant (risco ALTO se multi-tenant)**

A rota `PUT /catalogo/:chave` faz UPSERT com `ON CONFLICT (categoria, chave)` sem filtro de `unidade_id` ou `tenant_id`. Se o sistema é multi-tenant (e pela arquitetura do PAWARDS, é), um operador da Clínica A pode sobrescrever templates da Clínica B se as chaves coincidirem. Verificar se `tenantContextMiddleware` injeta filtro automático no Drizzle ou se precisa de WHERE explícito.

---

## §3 — Performance

### ✅ Eficiente

Parser é O(n) single-pass sem regex no hot path (a regex `MV2_RESERVADOS` é compilada no module scope, não por chamada). A lib tem zero dependências externas — pure TypeScript, importável por browser ou Node sem bundle extra.

`GET /canais` retorna um objeto constante (referência estável) — praticamente zero custo.

### ⚡ Oportunidades

`tracarProveniencia` executa `Array.from(template.matchAll(/\{[A-Z_]+\}/g))` que aloca um array intermediário. Para templates com 30+ placeholders isso é negligível, mas poderia usar `for...of` diretamente no iterator para evitar a alocação.

---

## §4 — Edge Cases

| Cenário | Comportamento | Status |
|---|---|---|
| String vazia `""` | `parseInline("")` → `[]` | ✅ Correto |
| Marcador isolado `"*"` | Degrada para `{text, "*"}` | ✅ Correto |
| Marcador duplo `"**"` | Dois tokens text `"*"` + `"*"` | ✅ Correto (WA não usa `**`) |
| `"__sub__ then _ita_"` | Underline reconhecido antes de itálico pela precedência | ✅ Correto |
| Newlines no template | `adaptarParaCanal` split por `\n`, processa por linha | ✅ Correto |
| Placeholder desconhecido `{XPTO}` | `tracarProveniencia` → `tabela: "(desconhecida)"` | ✅ Gracioso |
| Unicode (emoji no template) | Parser trata como texto opaco | ✅ Correto |
| `spoiler` declarado em CANAIS mas não no parser | InlineTokenTipo não inclui "spoiler" | ⚠️ Inconsistência menor — capacidade declarada mas não implementada |
| Template com `{SLOT_TOPO}` sem addons ativos | `renderSlot()` → `""`, placeholder substituído por string vazia | ✅ Correto (pode deixar linhas vazias consecutivas) |

**EDGE-1 · Linhas vazias acumuladas:** quando vários slots/placeholders resolvem para `""`, o template renderizado pode ter 3-4 linhas em branco consecutivas. Recomendação: fazer um `trim` de linhas vazias consecutivas no output final.

---

## §5 — Arquitetura

### ✅ Decisões acertadas

**Single-source-of-truth:** a extração da gramática para `@workspace/mensageria-core` é a decisão arquitetural mais importante da Wave. Elimina o drift entre preview (canvas) e produção (backend). O padrão de re-export em `_teatro.ts` é limpo e não-disruptivo.

**Separação por responsabilidade:** `parser` (texto→tokens), `adapter` (tokens→output canal), `canais` (config), `proveniencia` (auditoria). Cada módulo tem um propósito claro e nenhum faz mais do que deveria.

**Composite TypeScript project:** segue o padrão já existente nas outras libs (`posologia`, `exports`). Consistência com o workspace.

### 🏗️ Débitos arquiteturais

**ARQ-1 · `_teatro.ts` faz demais (486 linhas)**

Este módulo acumula: re-exports da lib, definição de 4 cenários, 28 placeholders com metadata, 4 templates iniciais, 6 versículos bíblicos, 10 addons com defaults, matriz de carta de encantamento, funções `resolverPlaceholder`, `renderSlot`, `cartaAtivaPara`, `exemploCartaFuturoPapai`. Deveria ser dividido em pelo menos 3 arquivos: `_cenarios.ts`, `_addons.ts`, `_carta-encantamento.ts`.

**ARQ-2 · `_tokens.ts` mistura design tokens e dados de domínio**

Cores/fontes estão juntas com `CATALOGO` (18 substâncias médicas com preços), `PACIENTE` (mock), `PATOLOGIAS`, `VITAIS`. O catálogo de substâncias é domínio clínico; os tokens visuais são UI. Separar.

**ARQ-3 · Componentes massivos (TeatroMensageriaPadua: 850 linhas, GpsPadua: 1024 linhas)**

Esses são mockups de canvas, então a barra é mais baixa, mas cada um poderia ser decomposto em subcomponentes menores para manutenibilidade.

---

## §6 — Kaizen (melhoria contínua)

| # | Melhoria | Esforço | Impacto |
|---|---|---|---|
| K1 | Implementar `validarInline()` com detecção de marcadores não fechados (BUG-1) | 1h | Alto — sem isso, a validação no UPSERT é teatro |
| K2 | Corrigir o JSON wrap no UPSERT (BUG-2) — gravar string pura ou alinhar o GET | 30min | Médio — evita surpresa pra quem consome a API |
| K3 | Adicionar `router.use(requireAuth)` no próprio `mensageriaCore.ts` (SEC-1) | 10min | Alto — defesa em profundidade |
| K4 | Validar `texto.length <= 10_000` nas rotas POST/PUT (SEC-2) | 15min | Médio — previne DoS |
| K5 | Verificar filtro tenant no UPSERT de catalogo (SEC-3) | 30min | Alto — se multi-tenant, é blocker |
| K6 | Adicionar testes para: string vazia, unicode, multiline, MV2 com emoji | 1h | Médio — cobertura está em 5 casos, ideal ≥15 |
| K7 | Split `_teatro.ts` em 3 módulos menores (ARQ-1) | 1h | Baixo — qualidade, não funcionalidade |
| K8 | Colapsar linhas vazias consecutivas no output renderizado (EDGE-1) | 20min | Baixo — cosmético, mas perceptível pelo paciente |
| K9 | Implementar `spoiler` no parser/adapter (consistência com CANAIS) | 1h | Baixo — feature, não bug |

---

## §7 — Priorização

### 🔴 P0 — Fazer AGORA (bloqueadores)

1. **Restaurar os 23 arquivos** deletados pelo checkpoint `e5bae50` (ver comandos no Achado Zero)
2. **Verificar filtro tenant no UPSERT** (SEC-3) — se o sistema já está multi-tenant, qualquer operador pode sobrescrever templates de outra clínica

### 🟡 P1 — Fazer esta semana

3. **Implementar `validarInline()`** e plugar no PUT /catalogo (BUG-1 + K1)
4. **Adicionar auth próprio** no mensageriaCore.ts (SEC-1 + K3)
5. **Corrigir JSON wrap** no UPSERT (BUG-2 + K2)
6. **Adicionar limites de input** nas rotas (SEC-2 + K4)

### 🟢 P2 — Backlog (próximas waves)

7. Expandir testes (K6)
8. Split `_teatro.ts` (K7)
9. Colapsar linhas vazias (K8)
10. Suporte a spoiler (K9)

---

## Veredicto Final

**A Wave 17 RNA Mensageiro é uma entrega de alta qualidade arquitetural.** A decisão de extrair a gramática para uma lib compartilhada é a coisa certa a fazer e elimina uma classe inteira de bugs de drift entre preview e produção. O parser é elegante na simplicidade, o adapter de escape MV2 é clinicamente correto, e a camada de proveniência é um diferencial raro (auditoria placeholder→tabela.coluna para LGPD).

Porém: (a) os arquivos foram destruídos por um checkpoint automático e precisam ser restaurados imediatamente, (b) a validação de gramática no UPSERT é código morto que precisa de correção, e (c) o filtro multi-tenant no UPSERT precisa ser verificado antes de ir a produção.

Nota: **8/10** — rebaixada de 9 pela destruição acidental e pela validação morta. Corrigidos esses dois pontos, sobe para 9.
