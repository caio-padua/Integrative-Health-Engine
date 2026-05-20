# Estado de Retomada — 20/mai/2026

> **Sessão Claude Code interrompida por limite de arquivos do Claude.ai.**
> Este doc captura tudo que foi descoberto antes do corte, com os comandos
> exatos pra retomar a auditoria de onde parou.

---

## 1. Contexto da sessão

- **Objetivo original:** Auditoria Total do sistema PAWARDS em 8 seções
  (pedido do Caio para o Dr. Claude sintetizar depois).
- **Sessão anterior:** o Dr. Replit alegou ter entregue a Wave 17 RNA
  Mensageiro com 11 arquivos específicos. Antes da auditoria total, o Caio
  pediu uma auditoria técnica dessa entrega. **Nenhum dos 11 arquivos foi
  encontrado.** Detalhes em §3 abaixo e no doc complementar
  `COBRANCA_DR_REPLIT_WAVE17.md`.
- **Pivô:** o Caio decidiu cobrar o Dr. Replit antes de continuar a
  Auditoria Total.

---

## 2. Branch ativa real

| Branch remota | Último commit (UTC) |
|---|---|
| **`origin/feat/dominio-pawards`** ← **branch viva** | 2026-05-17 15:08:20 |
| `origin/replit-agent` | 2026-05-12 01:26:42 |
| `origin/main` | 2026-04-24 11:14:52 |

Comando que apurou:

```bash
git for-each-ref --sort=-committerdate refs/remotes/origin/ \
  --format='%(committerdate:iso8601) %(refname:short)' | head -20
```

**Atenção:** O `gitStatus` do início da sessão apontava `replit-agent` como
branch corrente. A branch realmente em desenvolvimento é
**`feat/dominio-pawards`**.

Último commit dessa branch (2026-05-17): `b8c98c8 Provide raw code access
for clinical workflow`.

---

## 3. Wave 17 RNA Mensageiro — **falsa entrega** (não encontrada)

O Dr. Replit alegou ter entregue os 11 arquivos abaixo. Auditoria via
`Glob` e `Grep` em todo o working tree de `feat/dominio-pawards`:

| # | Caminho alegado | Encontrado? |
|---|---|---|
| 1 | `docs/dr-claude/17_RNA_MENSAGEIRO_UNIFICACAO.md` | ❌ não encontrado |
| 2 | `lib/mensageria-core/src/index.ts` | ❌ (diretório `lib/mensageria-core` não existe) |
| 3 | `lib/mensageria-core/src/types.ts` | ❌ |
| 4 | `lib/mensageria-core/src/canais.ts` | ❌ |
| 5 | `lib/mensageria-core/src/parser.ts` | ❌ |
| 6 | `lib/mensageria-core/src/adapter.ts` | ❌ |
| 7 | `lib/mensageria-core/src/proveniencia.ts` | ❌ |
| 8 | `lib/mensageria-core/src/parser.test.ts` | ❌ |
| 9 | `lib/mensageria-core/src/adapter.test.ts` | ❌ |
| 10 | `artifacts/api-server/src/routes/mensageriaCore.ts` | ❌ (existe `routes/mensagens.ts`, do Wave 2) |
| 11 | `artifacts/mockup-sandbox/src/components/mockups/prescricao-rapida/_teatro.ts` | ❌ (não existe a pasta `prescricao-rapida`) |

**Buscas feitas:**

```bash
# Diretórios/arquivos
Glob "**/17_RNA_MENSAGEIRO*"                  → No files found
Glob "**/mensageria-core/**"                  → No files found
Glob "**/mensageriaCore*"                     → No files found
Glob "**/prescricao-rapida/**"                → No files found
Glob "docs/dr-claude/*"                       → só 00..04 + README

# Identificadores citados no briefing alegado
Grep "mensageria-core|RNA Mensageiro|tokenParaCanal|adaptarParaCanal|mensagens_catalogo|MV2_RESERVADOS"
  → Só achou:
    - scripts/seed-mensageria-opus.sql            (não relacionado, Wave 2)
    - exports/MOEDOR_INDUSTRIAL_OPUS.md           (não relacionado)
    - attached_assets/dossies/dossie_pawards_dr_claude_2026-04-23_08-40_SHA-90f73f5.md
    - artifacts/api-server/src/routes/mensagens.ts (Wave 2 mensageria, não Wave 17)
```

**Conclusão:** a Wave 17 não está em `feat/dominio-pawards` (branch
mais recente), nem em `replit-agent`, nem em `main`. O `docs/dr-claude/`
para no índice `04_BLUEPRINT_WAVE10_FASE_B_DIA1.md`. **Ou o Dr. Replit
não fez `git push`, ou trabalhou em outra branch não publicada, ou não
fez a entrega de fato.** Ver `COBRANCA_DR_REPLIT_WAVE17.md`.

---

## 4. Walking deads confirmados no `artifacts/clinica-motor`

Auditoria parcial de rotas (Seção 1 da Auditoria Total) descobriu:

### 4.1 Rotas mencionadas pelo Caio que **não existem**

| Rota pedida | Status |
|---|---|
| `/prescricao-rapida` | ❌ **NÃO EXISTE** — nem página em `src/pages`, nem rota em `App.tsx`. O Caio chamou de "recém-criada". |
| `/dashboard-cockpit` | ❌ **NÃO EXISTE** — sem arquivo, sem rota. O `dashboard.tsx` faz `fetch('/api/dashboard/cockpit')` mas não há rota frontend dedicada. |
| `/pedidos-exame/:id/pdf/solicitacao` (frontend) | ❌ **NÃO EXISTE no frontend** — só `/pedidos-exame` (listagem) está roteada em `App.tsx:200`. Backend tem o handler em `pedidosExame.ts:132`, mas não há página/link no clinica-motor. |

### 4.2 Triplicação de dashboards

`App.tsx` registra 4 rotas com cara de "dashboard":

- `/dashboard` → `pages/dashboard.tsx`
- `/admin/dashboard-global` → `pages/dashboard-global.tsx`
- `/dashboard-local` → `pages/dashboard-local.tsx`
- `/painel-pawards` → também aponta para `DashboardGlobal` (alias)

E ainda `/painel-comando`, `/painel-transmutacao` (paineis específicos).
Não é necessariamente bug — pode ser a separação Global ↔ Local prevista
no menu (§5) — **mas precisa nominação clara para o Caio saber qual é
qual** ao operar.

### 4.3 Volume bruto

- **116 arquivos** `.tsx` em `src/pages/**`.
- **113 rotas** registradas em `App.tsx`.
- **111 arquivos** de rota no backend (`artifacts/api-server/src/routes/`).

A classificação VIVA/SEMI-VIVA/WALKING DEAD/FANTASMA por rota **não foi
concluída** — só ~5 páginas foram lidas com profundidade
(`dashboard.tsx`, `pacientes/index.tsx`, `pedidos-exame/index.tsx`,
`Layout.tsx`, `App.tsx`).

---

## 5. Menu lateral (Seção 2 — parcial)

Localizado em `artifacts/clinica-motor/src/components/Layout.tsx`.

**6 grupos** colapsáveis, com VISIBILIDADE_POR_ESCOPO controlando o que
cada perfil vê (`consultoria_master`, `consultor_campo`, `clinica_medico`,
`clinica_enfermeira`, `clinica_admin`):

1. **DASHBOARD GLOBAL** (☁️ Cloud, `#1F4E5F`) — 9 itens
2. **DASHBOARD LOCAL** (⛰️ Mountain, `#A78B5F`) — 6 itens
3. **AGENDAS & MOTOR** (📅 CalendarDays, `#5C7C8A`) — 5 itens
4. **CLÍNICA & PACIENTES** (👥 Users, `#7B6450`) — 11 itens
5. **CATÁLOGOS GLOBAIS** (🗄️ Database, `#B8941F`) — 8 itens
6. **ESTRUTURA & RH** (🏢 Building, `#1F4E5F`) — 19 itens

**Total: ~58 itens visíveis** no sidebar (sujeito a filtragem por escopo).

A confirmação de **quais itens apontam pra walking dead vs vivos** não
foi concluída — exigiria ler cada página alvo.

---

## 6. Bug PDF 401 (Seção 4 — parcial)

**Arquivo:** `artifacts/api-server/src/routes/pedidosExame.ts` (linhas 1–150
lidas).

**Achado:** o arquivo **não declara nenhum middleware de auth interno**.
Todos os 6 handlers são definidos diretamente sem `requireAuth`,
`authMiddleware` ou similar:

```ts
router.get("/", async (req, res) => { ... })             // listagem
router.get("/:id", async (req, res) => { ... })          // detalhe
router.post("/", async (req, res) => { ... })            // criar
router.get("/:id/previa-justificativas", ...)            // preview
router.post("/:id/validar", ...)                         // validar
router.get("/:id/pdf/solicitacao", async (req, res) => { // PDF — linha 132
  ...
  const medicoRows = await db.execute(sql`SELECT ... FROM usuarios WHERE id = ${pedido.medicoId}`);
  const pacienteRows = await db.execute(sql`SELECT ... FROM pacientes WHERE id = ${pedido.pacienteId}`);
  ...
});
```

**Hipótese:** o 401 vem de middleware **upstream** (provavelmente em
`routes/index.ts` ou `app.ts`) que exige cookie/sessão para todas as
rotas montadas. O navegador, ao chamar a URL diretamente (window.open
ou link), pode não estar enviando o cookie corretamente — possíveis
causas a investigar:
- `SameSite=Strict` no cookie de sessão impedindo navegação top-level.
- Falta de `credentials: 'include'` em algum `fetch`.
- CORS/origin mismatch entre clinica-motor e api-server.
- Token JWT em header `Authorization` que não viaja em `window.open`.

**Próximos passos não executados:**

```bash
# 1. Como pedidosExame é montado:
grep -n "pedidosExame\|requireAuth" artifacts/api-server/src/routes/index.ts

# 2. Auth global do app:
grep -n "use(\|requireAuth\|cookieParser\|session" artifacts/api-server/src/app.ts

# 3. Como o frontend chama o PDF (não há link no clinica-motor):
grep -rn "pdf/solicitacao" artifacts/clinica-motor/src
```

**Observação sobre injection:** o `db.execute(sql\`...\${id}\`)` usa o
template tag do Drizzle, que **parametriza**. Não há SQL injection nesses
trechos. O risco é só de auth.

---

## 7. Auditoria Total — status por seção

| Seção | Status | Notas |
|---|---|---|
| Setup git (preâmbulo) | ✅ completa | Branch ativa identificada: `feat/dominio-pawards` |
| §1 — Inventário rotas clinica-motor | 🟡 parcial | 113 rotas listadas; classificação VIVA/WALKING DEAD não concluída |
| §2 — Inventário menu lateral | 🟡 parcial | 6 grupos + 58 itens mapeados; ligação por escopo OK; conferência item↔rota não feita |
| §3 — Auditoria SQL contra banco real | ❌ **não iniciada** | **Sem credenciais de DB.** Os `.env.*.example` no repo são templates. Sem `DATABASE_URL` no shell. |
| §4 — Bug PDF 401 (auth) | 🟡 parcial | Confirmada ausência de auth interno em `pedidosExame.ts`; mounting upstream não verificado |
| §5 — Verificação de motores | ❌ não iniciada | — |
| §6 — Prometido (INVENTARIO_PAWARDS) vs existente | ❌ não iniciada | — |
| §7+8 — Kaizen, priorização, TOP 10 | ❌ não iniciada | — |

---

## 8. Comandos exatos para retomar

```bash
# 0) Posicionar
cd C:\Users\clini\projetos\Integrative-Health-Engine
git fetch --all --prune
git checkout feat/dominio-pawards
git pull

# 1) Re-verificar Wave 17 (caso Dr. Replit tenha empurrado depois)
git log --all --oneline --grep "RNA\|mensageria-core\|Wave 17" -i | head -20
git ls-files | grep -i 'mensageria-core\|RNA_MENSAGEIRO\|prescricao-rapida' | head

# 2) Seção 3 — SQL: precisa de DATABASE_URL real (Neon/Replit).
#    Pedir ao Caio. Quando tiver, rodar:
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM pacientes;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM pacientes WHERE nome ILIKE '%TESTE MOTOR%';"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM pacientes WHERE nome NOT ILIKE '%TESTE%' AND telefone IS NOT NULL;"
psql "$DATABASE_URL" -c "SELECT unidade_id, COUNT(*) FROM pacientes GROUP BY unidade_id ORDER BY 2 DESC;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM substancias WHERE ativo = true;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM farmacias_parmavault WHERE ativo = true;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM prescricoes;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM pedidos_exame;"

# 3) Seção 4 — fechar auth PDF
grep -n "pedidosExame\|requireAuth" artifacts/api-server/src/routes/index.ts
grep -n "use(\|requireAuth\|cookieParser\|session" artifacts/api-server/src/app.ts
grep -rn "pdf/solicitacao" artifacts/clinica-motor/src

# 4) Seção 5 — motores
grep -rn "motor_decisao_clinica" artifacts/api-server/src
grep -rn "ZAPSIGN_API_KEY\|ZAPSIGN_TOKEN" artifacts/api-server/src
grep -rn "TWILIO_\|WHATSAPP_" artifacts/api-server/src
# Hook comissão PARMAVAULT:
grep -rn "comissao_estimada\|calcularComissaoEstimada" artifacts/api-server/src

# 5) Seção 6 — cruzar tabelas declaradas no INVENTARIO_PAWARDS contra migrations
ls artifacts/api-server/src/db/migrations/
grep -n "CREATE TABLE" artifacts/api-server/src/db/migrations/*.sql | wc -l
```

---

## 9. Recomendação de próximo passo

1. **Enviar ao Dr. Replit** o doc `COBRANCA_DR_REPLIT_WAVE17.md` (irmão
   deste). Bloquear Auditoria Total até confirmar onde está a Wave 17 —
   ou aceitar que foi falsa entrega.
2. Pedir ao Caio o `DATABASE_URL` real (Neon/Replit) para destravar §3.
3. Em paralelo (não bloqueante), continuar §4 (auth PDF) na próxima
   sessão — só precisa de 2 greps pra fechar.

---

**Arquivo irmão:** `COBRANCA_DR_REPLIT_WAVE17.md`
