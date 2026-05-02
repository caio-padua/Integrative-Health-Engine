# 🧬 Blueprint Wave 10 ZapSign — Fase B Dia 1 (snapshot 2026-05-01)

> **Para quem**: Dr. Claude (orquestrador) — leitura via raw GitHub
> **Branch**: `feat/dominio-pawards`
> **Commit base deste snapshot**: `1846e4b` ("Harden security by preventing admin token bypass on sensitive routes")
> **Status global**: 🟢 PASS code-review architect (3 rodadas, 7 achados, todos resolvidos)
> **Próxima janela**: Fase B Dia 2 (2026-05-02 manhã, depende de Caio cadastrar ZapSign sandbox)

---

## 📌 TL;DR pra Dr. Claude

| Item | Status |
|------|--------|
| Migration 031 (auditoria_assinaturas + assinatura_solicitacoes) | ✅ aplicada via psql aditivo |
| Migration 032 (pacientes.is_teste) | ✅ aplicada hoje, versionada |
| ZapsignAdapter promoted (mock → produção) | ✅ HMAC custom header timing-safe |
| F3.A enviarPARQ.ts | ✅ plugado em POST /parq/emitir |
| F3.B enviarTCLE.ts | ✅ plugado em prescricoes.ts (1ª receita) |
| F3.C enviarOrcamentoFarmaceutico.ts | ✅ rota POST /orcamentos/:id/disparar (401 sem auth) |
| Hotfix segurança bypass `x-admin-token` em rotas Wave 10 | ✅ requireAuth.ts linhas 70-89 |
| ZAPSIGN_WEBHOOK_SECRET seguro | 🟡 deletado hoje, regenerar amanhã via `requestEnvVar(secret)` |
| Cadastro ZapSign sandbox + ZAPSIGN_API_TOKEN real | 🟡 amanhã (Caio) |
| Disparo real teste (receita Caio id=3104) | 🟡 amanhã |
| F4 webhook handler completo + manifesto | 🟡 pendente |
| F5 frontend timeline + detalhe | 🟡 pendente |
| F6 wrap-up + tag `v031-zapsign-launch` | 🟡 pendente |
| **Invariantes Wave 9 preservados** | ✅ 8.725 receitas PRODUÇÃO + R$ 2.735.336,10 + 5 triggers ativos |

---

## 🔭 Invariantes verificados (smoke final 2026-05-01 23h)

```
receitas_PRODUCAO  = 8725  (WHERE p.is_teste = false)
receitas_TESTE     = 0
comissao_PRODUCAO  = R$ 2.735.336,10  (intacta)
pacientes_TESTE    = 1     (Caio id=3104, ceo@pawards.com.br)
assinatura_solicitacoes = 4
auditoria_assinaturas   = 0
triggers Wave 9 ativas  = 5  (trg_calc_comissao + trg_assin_templates_validar +
                              trg_nfe_validar + trg_parq_plano_prazo_limite +
                              trg_sync_comissao_parq)

Smoke segurança hotfix bypass:
  POST /api/orcamentos/8725/disparar  com x-admin-token  → 401 ✅
  POST /api/parq/emitir                com x-admin-token  → 401 ✅
  POST /api/prescricoes                com x-admin-token  → 401 ✅
  POST /api/orcamentos/8725/disparar  sem auth           → 401 ✅
  POST /api/webhooks/assinatura/zapsign ping             → 200 ✅
  /api/healthz                                            → 200 ✅
```

---

## 🏛️ Arquitetura Wave 10 — fluxo de assinatura digital ICP-Brasil

```
┌────────────────────────────────────────────────────────────────────────┐
│  CAIO (CEO) ou MÉDICO TENANT                                           │
│  POST /api/orcamentos/:receitaId/disparar                              │
│       (Bearer JWT + body { farmaciaRepresentante })                    │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │ requireAuth (linhas 70-89: bypass admin BLOQUEADO Wave 10)
                                 │ requireRole (médico/secretária do tenant)
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│  routes/orcamentos.ts                                                  │
│  - valida receita pertence a unidade do JWT                            │
│  - lookup paciente, farmácia, template ORCAMENTO_FORMAL_V1 (id=4)      │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│  lib/assinatura/use-cases/enviarOrcamentoFarmaceutico.ts (309L)        │
│  - externalId = `orc-${receitaId}-${Date.now()}` (regex F4 reconcilia) │
│  - metadataExtra = { receitaId, farmaciaId, … }  (no INSERT, sem race) │
│  - forcarProvedor = "zapsign"  (impede fallback Clicksign sem capabil) │
│  - signatariosExtras = [farmaciaRepresentante]                         │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│  lib/assinatura/service.ts (455L)  — assinaturaService.enviar()        │
│  - INSERT assinatura_solicitacoes (idempotente via metadata->>receitaId)│
│  - prepara payload PDF/template + signatários ordenados                │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│  lib/assinatura/adapters.ts (412L)  — ZapsignAdapter                   │
│  - POST https://sandbox.api.zapsign.com.br/api/v1/docs/                │
│  - Authorization: Bearer ${ZAPSIGN_API_TOKEN}                          │
│  - mapearAuthMode(): assinaturaTela-tokenWhatsApp / certificadoDigital │
│  - retorna { providerId, signers[].sign_url }                          │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │
                                 ▼ (assíncrono, pós-assinatura no celular)
┌────────────────────────────────────────────────────────────────────────┐
│  POST /api/webhooks/assinatura/zapsign                                 │
│  - HMAC custom header `x-pawards-secret` (timing-safe-equal)           │
│  - secret = ZAPSIGN_WEBHOOK_SECRET (regenerar amanhã, requestEnvVar)   │
│  - eventos: doc_signed | doc_refused | doc_removed                     │
│                                                                         │
│  routes/assinaturasWebhook.ts → service.processarEventoZapSign()       │
│  - doc_signed → baixa signed_file → SHA-256 → Object Storage           │
│                 → INSERT auditoria_assinaturas (hash + IP + geo)       │
│  - idempotente: ON CONFLICT (signature_id) DO NOTHING                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📂 Arquivos chave Wave 10 — URLs raw GitHub

> Branch **`feat/dominio-pawards`** (commit `1846e4b`).
> Substituir por `main` na URL pra leitura canônica pós-merge.

### 🗄️ Migrações DB (psql aditivo, IF NOT EXISTS)

| Arquivo | Bytes | Raw URL |
|---------|-------|---------|
| `031_wave10_zapsign_auditoria.sql` | 8.462 | <https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/db/migrations/031_wave10_zapsign_auditoria.sql> |
| `032_pacientes_is_teste.sql` | 2.383 | <https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/db/migrations/032_pacientes_is_teste.sql> |

### 🧱 Camada de domínio assinatura

| Arquivo | Linhas | Raw URL |
|---------|--------|---------|
| `lib/assinatura/types.ts` | (espelho schema) | <https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/assinatura/types.ts> |
| `lib/assinatura/adapters.ts` (ZapsignAdapter + Clicksign fallback) | 412 | <https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/assinatura/adapters.ts> |
| `lib/assinatura/service.ts` (orquestrador, INSERT + idempotência) | 455 | <https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/assinatura/service.ts> |
| `lib/assinatura/use-cases/enviarPARQ.ts` (F3.A) | 264 | <https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/assinatura/use-cases/enviarPARQ.ts> |
| `lib/assinatura/use-cases/enviarTCLE.ts` (F3.B) | 145 | <https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/assinatura/use-cases/enviarTCLE.ts> |
| `lib/assinatura/use-cases/enviarOrcamentoFarmaceutico.ts` (F3.C) | 328 | <https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/assinatura/use-cases/enviarOrcamentoFarmaceutico.ts> |

### 🔌 Rotas + middlewares

| Arquivo | Linhas | Raw URL |
|---------|--------|---------|
| `routes/orcamentos.ts` (POST disparar + GET status) | 168 | <https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/orcamentos.ts> |
| `routes/assinaturasWebhook.ts` (handler ZapSign + Clicksign) | 26 | <https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/assinaturasWebhook.ts> |
| `routes/index.ts` (registro rotas Wave 10) | 211 | <https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/index.ts> |
| `middlewares/requireAuth.ts` (**hotfix bypass linhas 70-89**) | 102 | <https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/middlewares/requireAuth.ts> |

### 📜 Documentação Dr. Claude (esta pasta)

| Arquivo | Bytes | Raw URL |
|---------|-------|---------|
| `00_BRIEFING_PAINEL_CEO_PARA_DR_CLAUDE.md` | 5.467 | <https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/docs/dr-claude/00_BRIEFING_PAINEL_CEO_PARA_DR_CLAUDE.md> |
| `01_DECISOES_TOMADAS_WAVE10_F3C.md` | 11.906 | <https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/docs/dr-claude/01_DECISOES_TOMADAS_WAVE10_F3C.md> |
| `02_DECISOES_PENDENTES_PARA_DR_CLAUDE.md` (atualizado HOJE com sujeira #6 + Wave 13 mini-RFC) | 20.226 | <https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/docs/dr-claude/02_DECISOES_PENDENTES_PARA_DR_CLAUDE.md> |
| `03_ARQUITETURA_GERAL_DO_CODIGO.md` | 30.200 | <https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/docs/dr-claude/03_ARQUITETURA_GERAL_DO_CODIGO.md> |
| `04_BLUEPRINT_WAVE10_FASE_B_DIA1.md` (este arquivo) | — | <https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/docs/dr-claude/04_BLUEPRINT_WAVE10_FASE_B_DIA1.md> |
| `raws/01_microscopio_PARMAVAULT_WAVE10.md` | — | <https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/docs/dr-claude/raws/01_microscopio_PARMAVAULT_WAVE10.md> |
| `raws/02_mapa_neuronal_v1.1.md` | — | <https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/docs/dr-claude/raws/02_mapa_neuronal_v1.1.md> |
| `raws/03_arquitetura_bounded_contexts_v1.md` | — | <https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/docs/dr-claude/raws/03_arquitetura_bounded_contexts_v1.md> |
| `raws/04_session_plan_wave10_atual.md` (atualizado HOJE) | — | <https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/docs/dr-claude/raws/04_session_plan_wave10_atual.md> |

### 🧠 Memória Dr. Replit

| Arquivo | Bytes | Raw URL |
|---------|-------|---------|
| `replit.md` (1.618 linhas, contém seção Wave 10 antes de User Preferences) | 144.590 | <https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/replit.md> |

---

## 🔥 7 achados de code-review architect (todas as 3 rodadas)

| # | Severidade | Descrição | Resolução | Arquivo |
|---|-----------|-----------|-----------|---------|
| 1 | 🔴 CRÍTICO | `ZAPSIGN_WEBHOOK_SECRET` gerado em env shared = vetor forja webhook com efeito jurídico | Deletado hoje. Regenerar amanhã via `requestEnvVar(secret)` (oculto). | env (shared deletado) |
| 2 | 🔴 CRÍTICO | Plano original UPDATE telefone do Carlos (id=1703) → vazaria PII via worker `notifAssinatura.ts` | Substituído por criar receita teste vinculada ao Caio (id=3104, `is_teste=true`) | `02_DECISOES_PENDENTES` passo 6 |
| 3 | 🟡 MÉDIO | Paciente teste sem flag estrutural pra filtrar em relatórios | Migration `032_pacientes_is_teste.sql` (psql aditivo + índice parcial) | `032_pacientes_is_teste.sql` |
| 4 | 🟡 MÉDIO | Wave 13 esboço genérico sem viabilidade técnica | Mini-RFC completo: schema SQL aditivo + matriz endpoint×perfil + middleware exemplo + 8 critérios de aceite | `02_DECISOES_PENDENTES` Wave 13 |
| 5 | 🟢 MENOR | Externalid sem padrão pro F4 reconciliar | `externalId: orc-{receitaId}-{Date.now()}` + regex `/^orc-(\d+)-\d+$/` | `enviarOrcamentoFarmaceutico.ts` |
| 6 | 🔴 CRÍTICO (novo, fora do escopo Wave 10) | `ADMIN_TOKEN` em texto claro no `.replit` versionado + bypass `x-admin-token` em qualquer rota = catastrófico pra fluxo jurídico | **Hotfix cirúrgico** em `requireAuth.ts` linhas 70-89: regex bloqueia bypass nas rotas Wave 10 (`/orcamentos/*`, `/parq/*`, `/prescricoes/*` com ou sem `/api/`). Cleanup completo agendado Wave 10.5 (rotação token + remoção do `.replit`) | `requireAuth.ts` |
| 7 | 🟡 MÉDIO | F3.C race condition: INSERT inicial sem metadataExtra → UPDATE pós-INSERT abria janela | Estendido `EnviarParams` com `externalId?` + `metadataExtra?`, mergeado NO INSERT inicial; `forcarProvedor: "zapsign"` impede fallback Clicksign sem capability ICP qualificada FARMACIA_ECNPJ | `service.ts` + `enviarOrcamentoFarmaceutico.ts` |

**Veredito final architect**: 🟢 **PASS** — "estado seguro pra dormir hoje, cleanup obrigatório amanhã sem adiamento"

---

## ❓ Perguntas abertas pra Dr. Claude (priorizar antes de Fase B Dia 2)

Detalhes completos em [`02_DECISOES_PENDENTES_PARA_DR_CLAUDE.md`](./02_DECISOES_PENDENTES_PARA_DR_CLAUDE.md). Resumo:

1. **Bloq #1**: Confirmar que disparo real amanhã com a receita teste do Caio é seguro (apesar do Caio ser também TENANT real PADCON).
2. **Bloq #4**: Validar fluxo de geração+revelação do `ZAPSIGN_WEBHOOK_SECRET` amanhã (`openssl rand -hex 32` → revelar 1x no chat → `requestEnvVar(secret)` oculto → cola no painel ZapSign).
3. **Wave 13** (mini-RFC pronto): aprovar começar imediatamente pós Wave 10 ou priorizar Wave 11/12 antes? Sem RBAC robusto, Wave 10 entrega assinaturas ICP-Brasil sem freios pra suspender tenant problemático.
4. **Wave 10.5 cleanup ADMIN_TOKEN**: confirmar Caio rotaciona amanhã via `requestEnvVar(secret)` + remoção da linha versionada no `.replit`.

---

## 🛠️ Comandos de validação Dr. Claude pode pedir

```bash
# Reconfirmar invariantes Wave 9 + Wave 10:
psql $DATABASE_URL <<'SQL'
SELECT
  COUNT(*) FILTER (WHERE p.is_teste = false) AS receitas_PRODUCAO,
  COUNT(*) FILTER (WHERE p.is_teste = true)  AS receitas_TESTE,
  ROUND(SUM(comissao_estimada) FILTER (WHERE p.is_teste = false)::numeric, 2) AS comissao_PRODUCAO
FROM parmavault_receitas r JOIN pacientes p ON p.id = r.paciente_id;

SELECT COUNT(*) AS triggers_wave9_ativas FROM pg_trigger
WHERE tgname IN ('trg_calc_comissao','trg_assin_templates_validar',
                 'trg_nfe_validar','trg_parq_plano_prazo_limite',
                 'trg_sync_comissao_parq');
SQL

# Confirmar hotfix segurança rotas Wave 10:
for path in "/api/orcamentos/8725/disparar" "/api/parq/emitir" "/api/prescricoes"; do
  curl -s -o /dev/null -w "$path → %{http_code}\n" \
    -X POST -H "x-admin-token: $ADMIN_TOKEN" \
    "https://<deploy-url>$path"
done
# esperado: 401 nos 3
```

---

## 📅 Próximos marcos

- **2026-05-02 manhã (Caio)**: cadastra ZapSign sandbox + cola `ZAPSIGN_API_TOKEN` + rotaciona `ADMIN_TOKEN`
- **2026-05-02 manhã (Dr. Replit)**: gera `ZAPSIGN_WEBHOOK_SECRET` no fluxo seguro + suggest_deploy + CNAME `webhooks.pawards.com.br` + cadastro webhook `hook-padua-4000` + criação receita teste vinculada ao Caio + disparo real
- **2026-05-02 tarde**: F4 webhook handler completo + manifesto auditoria
- **2026-05-03**: F5 frontend timeline + detalhe (2 telas mínimas) + Painel CEO banner
- **2026-05-04**: F6 wrap-up + tag `v031-zapsign-launch` + relatório final

---

_Snapshot gerado por Dr. Replit em 2026-05-01 23:50 BRT após PASS final do code-review architect (3 rodadas)._
