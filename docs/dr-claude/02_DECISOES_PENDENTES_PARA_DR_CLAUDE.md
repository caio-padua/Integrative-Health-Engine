# ❓ Decisões Pendentes — Aguardando Dr. Claude orquestrar

> **Reescrito a cada rodada**. Quando uma pendência vira tomada, ela
> migra pra `01_DECISOES_TOMADAS_WAVE10_F3C.md` (append-only).

> **Atualizado em**: 2026-05-01 22:48 — pós-rodada Caio "sim sim sim"
> (D5 email + D6 WEBHOOK_SECRET + D7 Wave 13 + D8 webhooks.pawards
> + C1 smoke mockado hoje).
>
> **Estado**: 🟢 **TODAS as 9 decisões anteriores foram TOMADAS**
> (D1-D4 Mapa Neuronal v1.1 + D5-D8 identidade ZapSign + C1 escopo dia).
>
> Mapa Neuronal v1.1 validado (7 sujeiras aceitas).

---

## 🟢 Nada bloqueando Dr. Replit no momento (entrega da rodada)

Hoje 2026-05-01 22:48 → executado SEM disparo real (token ZapSign chega amanhã):

- ⚠️ `ZAPSIGN_WEBHOOK_SECRET` gerado (32 bytes hex, 256 bits entropia)
  hoje E **DELETADO** ainda hoje após code-review architect FAIL apontar
  que secret visível em env `shared` = vetor de forja de webhook com
  impacto jurídico direto. **Será regenerado AMANHÃ** seguindo fluxo
  seguro (passo 5 da sequência abaixo): `openssl rand -hex 32` →
  revelar 1 vez no chat pra Caio guardar no 1Password →
  `requestEnvVar(secret)` → grava OCULTO no Replit → Caio cola o
  mesmo valor no painel ZapSign no campo "Secret" do webhook
  `hook-padua-4000`. **Hoje o repo está sem o segredo, intencional.**
- ✅ Paciente `Caio Pádua (CEO PAWARDS - PACIENTE TESTE WAVE 10)`
  inserido idempotente: `id=3104`, CPF `29327494806`, telefone
  `5511946554000`, email `ceo@pawards.com.br`, unidade_id=1.
  Marcado `is_teste=true` na coluna nova.
- ✅ Coluna estrutural `pacientes.is_teste boolean NOT NULL DEFAULT false`
  adicionada via migration versionada `032_pacientes_is_teste.sql`
  (psql aditivo IF NOT EXISTS, regra ferro). Filtra contas teste em
  dashboards futuros via `WHERE p.is_teste = false`.
- ✅ Smoke 6/6 verde: API healthz 200, rota orçamentos 401/401,
  webhook ZapSign ping 200, receita 8725 com todos campos, Caio+FAMA+
  template prontos, **invariantes Wave 9 PRESERVADOS** (8.725 receitas
  PRODUÇÃO `WHERE p.is_teste=false` + R$ 2.735.336,10 comissão
  potencial intactos), Wave 10 baseline capturado (4 solicitações
  pré-disparo, 0 auditoria pré-disparo, 0 receitas TESTE).
- ✅ Wave 13 RBAC documentado abaixo como pendência arquitetural com
  mini-RFC técnico (schema SQL + matriz autorização + middleware +
  critérios de aceite).
- 🚨 **Achado novo de segurança fora do escopo Wave 10**: code-review
  apontou que `.replit` versionado expõe `ADMIN_TOKEN` em texto claro e
  `requireAuth.ts` aceita bypass via header `x-admin-token` em rotas
  não-painel. Documentado como **sujeira #6 herdada** pra Wave 10.5.
  Recomendação: Wave 10.5 rotacionar `ADMIN_TOKEN`, retirar do `.replit`
  versionado (mover pra secret manager) e desativar bypass em produção.

---

## 🚀 PRÓXIMA RODADA — após Caio cadastrar ZapSign amanhã (manhã)

**Sequência operacional pra amanhã (ordem rígida):**

1. **Caio cadastra conta SANDBOX ZapSign** com `ceo@pawards.com.br`
   - Pega API token sandbox no painel "Integrações/API"
   - Guarda em local seguro (1Password/Bitwarden) — também serve pra
     ele revisar manualmente os documentos que assinarmos
2. **Caio cola token no Replit** via `requestEnvVar` (Dr. Replit pede)
   - Variável: `ZAPSIGN_API_TOKEN` (secret real, não env var visível)
3. **Dr. Replit roda `suggest_deploy`** → ganha URL Replit estável
   tipo `pawards-medcore.replit.app`
4. **Caio cria CNAME no DNS de `pawards.com.br`**:
   - Nome: `webhooks` · Tipo: CNAME · Valor: `pawards-medcore.replit.app`
   - TTL: 300s (propaga em ~5min)
5. **Caio cadastra webhook no painel ZapSign sandbox**:
   - Nome: `hook-padua-4000`
   - URL: `https://webhooks.pawards.com.br/api/webhooks/assinatura/zapsign`
   - Secret: ⚠️ **REGENERAR amanhã** (achado crítico code-review:
     o secret de hoje foi deletado de `shared` env por ser visível;
     amanhã Dr. Replit roda `openssl rand -hex 32`, mostra 1 vez no
     chat pra Caio guardar no 1Password, depois pede via
     `requestEnvVar(secret)` pra gravar OCULTO no Replit, e Caio cola
     o mesmo valor no painel ZapSign no campo "Secret")
   - Eventos: `doc_signed`, `doc_refused`, `doc_removed`
6. **Dr. Replit cria receita teste vinculada ao Caio (id=3104) — plano CORRIGIDO**:
   - **Achado crítico code-review**: NUNCA fazer UPDATE transitório em
     paciente real (id=1703 Carlos) — worker `notifAssinatura.ts` lê
     dados atuais do paciente e poderia redirecionar notificações de
     OUTROS fluxos pro Caio durante a janela = vazamento de PII.
   - Solução adotada: criar receita teste vinculada ao paciente Caio
     (id=3104, já marcado `is_teste=true` na coluna nova adicionada hoje):
   ```sql
   INSERT INTO parmavault_receitas
     (paciente_id, farmacia_id, unidade_id, numero_receita,
      valor_formula_estimado, status, criado_em, emitida_em)
   VALUES
     (3104, 4, 1, 'TESTE-WAVE10-FASE-B-001',
      1000.00, 'EMITIDA', now(), now())
   RETURNING id;
   ```
   - Trigger `trg_calc_comissao` calcula `comissao_estimada=160.00`
     automático (16% de R$ 1.000)
   - Invariantes Wave 9 NÃO MAIS "fixos" — passam a ter componente
     `is_teste`:
     - Receitas produção (`WHERE p.is_teste = false`): 8.725 mantidas
     - Comissão produção: R$ 2.735.336,10 mantida
     - Receitas teste (`WHERE p.is_teste = true`): 0 → 1
     - Comissão teste: R$ 0 → R$ 160
7. **Dr. Replit dispara use-case real com a receita teste**:
   ```typescript
   enviarOrcamentoFarmaceutico({
     receitaId: <novo_id_receita_teste>,  // não é 8725 mais
     farmaciaRepresentante: {
       nome: 'Caio Pádua (TESTE WAVE 10 FASE B)',
       cpf: '29327494806',
       telefone: '5511946554000',
       email: 'ceo@pawards.com.br',
     },
   })
   ```
   → Caio recebe DOIS links no Zap (paciente Caio + farmácia rep Caio)
8. **Caio assina ambos no celular** → ZapSign dispara webhook →
   Dr. Replit valida HMAC + grava `auditoria_assinaturas`
9. **Validação invariantes pós-disparo**:
   - Receitas PRODUÇÃO `WHERE p.is_teste = false`: 8.725 mantidas
   - Comissão PRODUÇÃO: R$ 2.735.336,10 mantida
   - +1 linha em `assinatura_solicitacoes` (de 4 → 5)
   - +1 linha em `auditoria_assinaturas` (de 0 → 1)
   - SHA-256 do PDF gravado em Object Storage `assinaturas-pawards`

---

## 🧠 PENDÊNCIA ARQUITETURAL GRANDE — Wave 13 (próxima Wave após Wave 10/11/12)

> **Origem**: Caio levantou hoje "delegar pras clínicas COM controle
> caso clínica perca aderência". É o nervo central de SaaS multi-tenant
> e merece Wave própria.

### Wave 13: RBAC Hierárquico + Kill-Switch + 2FA TOTP

**Modelo proposto** (3 níveis de acesso):

```
NÍVEL 0 — PLATFORM_OWNER (Caio)
  • Único. 2FA TOTP OBRIGATÓRIO (Authy/Google Authenticator).
  • Email: ceo@pawards.com.br
  • Pode: criar/suspender/excluir tenants (clínicas), ver auditoria
    global, promover/rebaixar admins, exportar dados LGPD art. 18.

NÍVEL 1 — TENANT_ADMIN (dono da clínica, ex Dr. João)
  • Pode: criar usuários DA PRÓPRIA clínica, emitir receitas/PARQ/
    contratos no próprio tenant.
  • NÃO PODE: ver outros tenants, alterar billing, ver auditoria global.
  • 2FA TOTP: toggle por tenant (Caio decide se obrigatório).
  • REVOGÁVEL POR PLATFORM_OWNER A QUALQUER MOMENTO.

NÍVEL 2 — TENANT_USER (médico, secretária, financeiro local)
  • Permissões granulares por papel (médico assina, secretária visualiza,
    financeiro emite NF mas não receita).
  • Sem acesso administrativo.
  • 2FA TOTP: opcional.
```

**Kill-switch (4 ações no painel CEO)**:

| Ação | Efeito |
|---|---|
| **SUSPENDER tenant** | 1 click → todas sessões expiram, emissões bloqueadas, assinaturas em curso congelam (não perdem dados). |
| **REASSUMIR tenant** | Caio vira admin temporário — útil se clínica abandonou e tem pacientes esperando assinatura. |
| **EXPORTAR tenant** | ZIP com receitas, PARQ, auditoria, pacientes (LGPD art. 18). |
| **EXCLUIR tenant** | Após carência 30 dias (LGPD art. 16). |

**Por que TOTP e não SMS pra 2FA?**
- SMS é furável por SIM-swap (ataque clássico)
- SaaS médico = LGPD agravada art. 11 §4º
- TOTP é offline, não furável
- Authy/Google Authenticator são gratuitos e UX padrão

**Status atual no código (a investigar antes de Wave 13)**:
- ✅ `pacientes.unidade_id` existe → multi-tenancy parcialmente
  estruturado
- ❓ Tabela `unidades` (clínicas) com `status`, `admin_id`,
  `criado_por`?
- ❓ Tabela `usuarios` com `papel`, `unidade_id`, `is_platform_owner`?
- ❓ Middleware `requireRole` discrimina `PLATFORM_OWNER` vs
  `TENANT_ADMIN`?
- ❓ Endpoint `POST /platform/tenants/:id/suspender` existe?

**Decisão pendente Dr. Claude**: confirmar se Wave 13 vai depois de
Wave 10 (ZapSign), Wave 11 (PARQ Wave 12 PARQ LABOR), ou se intercala
no meio. Recomendação preliminar Dr. Replit: **Wave 13 imediatamente
após Wave 10** porque:
1. Wave 10 cria assinaturas REAIS com efeito jurídico — sem RBAC
   robusto, qualquer usuário tenant_admin pode assinar contratos em
   nome da plataforma toda
2. Sem 2FA no PLATFORM_OWNER, comprometimento de email = perda total
   da operação

---

### Wave 13 — Mini-RFC técnico (esboço pra Dr. Claude refinar)

**Schema SQL proposto (psql aditivo IF NOT EXISTS, regra ferro)**:
```sql
-- 1) Estende `unidades` (clínicas) — assume tabela já existe
ALTER TABLE unidades
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ATIVO'
    CHECK (status IN ('ATIVO','SUSPENSO','EXCLUIDO_PENDENTE','EXCLUIDO')),
  ADD COLUMN IF NOT EXISTS suspenso_em timestamptz,
  ADD COLUMN IF NOT EXISTS suspenso_por_usuario_id bigint,
  ADD COLUMN IF NOT EXISTS suspensao_motivo text,
  ADD COLUMN IF NOT EXISTS exclusao_carencia_ate timestamptz,
  ADD COLUMN IF NOT EXISTS lgpd_export_url text,
  ADD COLUMN IF NOT EXISTS lgpd_export_em timestamptz;

-- 2) Estende `usuarios` — assume tabela já existe
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS papel text NOT NULL DEFAULT 'TENANT_USER'
    CHECK (papel IN ('PLATFORM_OWNER','TENANT_ADMIN','TENANT_USER')),
  ADD COLUMN IF NOT EXISTS is_platform_owner boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS totp_secret_cifrado text,
  ADD COLUMN IF NOT EXISTS totp_ativado_em timestamptz,
  ADD COLUMN IF NOT EXISTS ultimo_login_2fa_em timestamptz;

-- Índice parcial: 1 só PLATFORM_OWNER ativo
CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_owner_ativo
  ON usuarios (is_platform_owner) WHERE is_platform_owner = true;

-- 3) Auditoria kill-switch (TODA ação destrutiva é gravada)
CREATE TABLE IF NOT EXISTS auditoria_kill_switch (
  id bigserial PRIMARY KEY,
  acao text NOT NULL CHECK (acao IN
    ('SUSPENDER','REASSUMIR','EXPORTAR_LGPD','EXCLUIR_AGENDAR','EXCLUIR_EXECUTAR','EXCLUIR_CANCELAR')),
  unidade_id bigint NOT NULL,
  executado_por_usuario_id bigint NOT NULL,
  motivo text,
  ip text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_aud_kill_unidade ON auditoria_kill_switch (unidade_id, criado_em DESC);
```

**Matriz de autorização endpoint → perfil mínimo** (exemplos críticos):
| Endpoint                                               | PLATFORM_OWNER | TENANT_ADMIN | TENANT_USER |
|--------------------------------------------------------|:--------------:|:------------:|:-----------:|
| `POST /platform/tenants/:id/suspender`                 | ✅             | ❌           | ❌          |
| `POST /platform/tenants/:id/reassumir`                 | ✅             | ❌           | ❌          |
| `POST /platform/tenants/:id/exportar-lgpd`             | ✅             | ✅ (próprio) | ❌          |
| `POST /platform/tenants/:id/excluir-agendar`           | ✅             | ✅ (próprio) | ❌          |
| `POST /platform/tenants/:id/excluir-executar`          | ✅             | ❌           | ❌          |
| `POST /tenants/:id/usuarios/criar`                     | ✅             | ✅ (próprio) | ❌          |
| `POST /orcamentos/:receitaId/disparar`                 | ✅             | ✅           | ✅          |
| `GET  /assinaturas/timeline`                           | ✅ (todos)     | ✅ (próprio) | ✅ (próprio)|
| `POST /platform/audit/kill-switch`                     | ✅             | ❌           | ❌          |

**Middleware de tenant isolation** (`requireRole` estendido):
```typescript
// lib/auth/middleware.ts
export const requireRole = (
  perfilMinimo: "PLATFORM_OWNER" | "TENANT_ADMIN" | "TENANT_USER",
  opts?: { mesmoTenant?: boolean; require2FA?: boolean }
) => async (req, res, next) => {
  const u = req.user;
  if (!u) return res.status(401).end();

  // Hierarquia: OWNER > ADMIN > USER
  const ranks = { TENANT_USER: 1, TENANT_ADMIN: 2, PLATFORM_OWNER: 3 };
  if (ranks[u.papel] < ranks[perfilMinimo]) return res.status(403).end();

  // Tenant isolation: TENANT_ADMIN/USER só vê próprio unidade_id
  if (opts?.mesmoTenant && u.papel !== "PLATFORM_OWNER") {
    const targetUnidadeId = Number(req.params.id ?? req.body.unidadeId);
    if (targetUnidadeId !== u.unidadeId) return res.status(403).end();
  }

  // 2FA gate (apenas PLATFORM_OWNER hoje, expansível)
  if (opts?.require2FA && u.is_platform_owner) {
    const horas = (Date.now() - new Date(u.ultimo_login_2fa_em).getTime()) / 36e5;
    if (horas > 12) return res.status(401).json({ erro: "REAUTH_2FA_REQUIRED" });
  }

  next();
};
```

**Critérios de aceite Wave 13** (testes obrigatórios):
1. ✅ `TENANT_ADMIN` da unidade A faz `GET /assinaturas/timeline` → vê APENAS assinaturas da unidade A (zero leak da B)
2. ✅ `TENANT_USER` da unidade A faz `POST /platform/tenants/A/suspender` → 403
3. ✅ `PLATFORM_OWNER` sem 2FA recente (>12h) faz `POST /platform/tenants/X/excluir-executar` → 401 `REAUTH_2FA_REQUIRED`
4. ✅ Kill-switch SUSPENDER → unidade `status='SUSPENSO'` + 1 linha em `auditoria_kill_switch` + JWT de TENANT_USER da unidade rejeitado em próxima request
5. ✅ Kill-switch EXPORTAR_LGPD → ZIP com todos PII em Object Storage + URL pré-assinada gravada em `unidades.lgpd_export_url`
6. ✅ EXCLUIR_AGENDAR → seta `exclusao_carencia_ate = now() + interval '30 days'`; cron diário verifica e executa só após carência
7. ✅ Tentativa de criar 2º `is_platform_owner=true` → falha por unique index parcial
8. ✅ Suite de testes Vitest com mock JWT pra cada perfil × cada endpoint da matriz

**Estimativa esforço Wave 13**: 3-4 dias úteis (1 schema+middleware, 1 endpoints kill-switch, 1 2FA TOTP enrollment+validate, 1 testes+frontend painel platform owner).

---

## 📨 Pra Dr. Claude responder na próxima rodada (após Fase B disparo real verde)

### Q1 — Validação visual do template `ORCAMENTO_FORMAL_V1`
Caio vai receber 2 links no Zap. Esperado:
- Link 1 (paciente): consentimento LGPD art. 11 §4º + assinatura tela
- Link 2 (farmácia): contrato representação ICP-Brasil

Dr. Claude valida copy + layout + se faltou cláusula crítica (CFM
2.386/2024 art. X, CC 593-609, STJ REsp 2.159.442/PR).

### Q2 — Mensagem WhatsApp HSM template
ZapSign sandbox usa template padrão deles. Em produção precisaremos
homologar template HSM próprio na Twilio (já temos a integração para
WhatsApp via Twilio em outras features). Pergunta: Dr. Claude quer
copy próprio PAWARDS ou template padrão ZapSign serve?

### Q3 — Manifesto auditoria SHA-256 deve incluir IP geo?
- IP cru: simples, sem dependência externa
- IP geolocalizado: precisa MaxMind GeoLite2 ou ipinfo.io (custo)
- Defesa STJ REsp 2.159.442/PR: geo ajuda demonstrar consentimento
  presencial (paciente assinou em São Paulo, não Manaus)

### Q4 — F4 webhook regex genérica
Code-review F3.C definiu `externalId` formato `orc-{receitaId}-{ts}`.
F3.A (PARQ) e F3.B (TCLE) ainda usam formato livre. Dr. Claude
endossar regex unificada `/^(parq|tcle|orc)-(\d+)(-\d+)?-\d+$/` e
plano de retrofit?

---

## 🚧 Bloqueios operacionais (não-decisões — são tarefas Caio)

### Bloq #1 — Sincronizar GitHub novamente (após esta rodada)
- 4 arquivos novos/alterados nesta rodada:
  - `docs/dr-claude/02_DECISOES_PENDENTES_PARA_DR_CLAUDE.md` (este)
  - `.local/session_plan.md` (atualizado com Fase B parcial verde)
  - `replit.md` (Wave 10 partial milestone)
- **Ação Caio**: aba ⎇ Git → Sync
- **Por quê importa**: Dr. Claude consultar v atualizada amanhã antes
  do disparo real

### Bloq #2 — Cadastro sandbox ZapSign + colar token amanhã
- Caio cria conta sandbox ZapSign com `ceo@pawards.com.br`
- Pega API token e cola via `requestEnvVar` que Dr. Replit vai pedir
- Sem isso, disparo real não acontece

### Bloq #3 — DNS CNAME `webhooks.pawards.com.br` amanhã
- Após Dr. Replit rodar `suggest_deploy`, Caio aponta CNAME pro
  domínio Replit estável
- Sem isso, ZapSign não consegue chamar webhook (sai 502)

### Bloq #4 — Cadastro webhook ZapSign + cola URL + secret amanhã
- Painel ZapSign → Webhooks → Novo
- Nome: `hook-padua-4000`
- URL: `https://webhooks.pawards.com.br/api/webhooks/assinatura/zapsign`
- Secret: ⚠️ **gerado AMANHÃ, NÃO HOJE** (achado crítico code-review:
  o segredo gerado hoje em env `shared` foi **DELETADO** porque
  visível = vetor de forja de webhook). Sequência amanhã: Dr. Replit
  roda `openssl rand -hex 32` → revela 1 vez no chat pra Caio guardar
  no 1Password → `requestEnvVar(ZAPSIGN_WEBHOOK_SECRET)` como SECRET
  oculto → Caio cola **o mesmo valor** aqui no campo "Secret" do painel
  ZapSign.
- Eventos: `doc_signed`, `doc_refused`, `doc_removed`

---

## 🧹 Sujeiras Wave 9 herdadas (carregadas pra Wave 10.5/11)

| # | Sujeira | Severidade | Plano |
|---|---------|------------|-------|
| ⚠️1 | Esperado 4 views, real 2 | baixa | Limpeza Wave 10.5 |
| ⚠️2 | F4 PARQ frontend tem 3 telas (esperado 4) | média | Wave 10 F5 ou 10.5 |
| ⚠️3 | Tag `v030-parq-launch` não confirmada no remote | baixa | `git ls-remote --tags origin` |
| ⚠️4 | `farmacias_parmavault` sem campos `representante_*` (env fallback) | média | Wave 10.5 ou 11 |
| ⚠️5 | `pacientes.cpf` sem UNIQUE constraint (descoberto ao tentar ON CONFLICT hoje) | média | Wave 10.5 — adicionar `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS pacientes_cpf_uniq ON pacientes(cpf) WHERE cpf IS NOT NULL` |
| 🚨6 | `ADMIN_TOKEN` em `.replit` versionado em texto claro + bypass `x-admin-token` em qualquer rota não-painel (descoberto code-review architect Wave 10 Fase B Dia 1) | **CRÍTICA** | **HOTFIX HOJE aplicado**: `requireAuth.ts` linha 70-89 bloqueia bypass em rotas Wave 10 (`/orcamentos/*`, `/parq/*`, `/prescricoes/*` com ou sem prefixo `/api/`) via regex `/^\/(api\/)?(orcamentos\|parq\|prescricoes)(\/.*)?$/`. Smoke confirmou: `POST /api/orcamentos/8725/disparar` com `x-admin-token` válido → 401 (antes: bypass aceito = catastrófico pra assinaturas com efeito jurídico). **Wave 10.5 cleanup completo**: (a) Caio rotaciona `ADMIN_TOKEN` via `requestEnvVar(secret)` amanhã junto com cadastro ZapSign, (b) deletar linha `ADMIN_TOKEN = "..."` de `.replit` versionado, (c) Wave 11 ou 13 remove bypass completamente substituindo por JWT real com role=admin nas rotas `/admin/*`. |

---

## 📋 Snapshot estado do banco hoje (pra prova amanhã)

```
parmavault_receitas total      : 8725 receitas
comissão potencial total       : R$ 2.735.336,10
assinatura_solicitacoes        : 4 linhas (baseline pré-Fase B real)
auditoria_assinaturas          : 0 linhas (zerado pré-Fase B real)
triggers Wave 9 ativos         : trg_calc_comissao, trg_assin_templates_validar,
                                 trg_nfe_validar, trg_parq_plano_prazo_limite,
                                 trg_sync_comissao_parq
paciente teste Caio (id=3104)  : criado idempotente, pronto pra teste futuro
farmácia teste FAMA (id=4)     : ativa, CNPJ 12345678000101
template ORCAMENTO_FORMAL_V1   : id=4, ativo
```

Após Fase B real verde amanhã, esperado:
- `assinatura_solicitacoes`: 4 → 5
- `auditoria_assinaturas`: 0 → 1
- Receitas/comissão: **INALTERADOS** (zero impacto Wave 9)
