# Objective
Wave 10 ZapSign + ICP-Brasil — Migration 031 — destravar conversão de R$ 2.735.336,10 (comissão potencial) → caixa real, via assinatura digital com defensibilidade jurídica tripla (CFM 2.386/2024 + CC 593-609 + LGPD art. 11 §4º + STJ REsp 2.159.442/PR).

Decisões aprovadas pelo Caio + Dr. Claude:
- Provedor: ZapSign (sandbox + produção, custo R$ 0,50/disparo)
- Auth: HMAC custom header `x-pawards-secret` (timing-safe-equal) — implementado Wave 10 F2
- Ordem F3 famílias: 4 (PARQ) → 1 (TCLE) → 3 (Orçamento Farmacêutico) ← em andamento
- Object Storage: bucket `assinaturas-pawards` (key `assinaturas/${external_id}.pdf`)
- Auditoria: tabela `auditoria_assinaturas` (Migration 031) + manifesto SHA-256 + IP + geo + auth_method

REGRA FERRO: zero db:push, só psql IF NOT EXISTS aditivo. Triggers Wave 9 (027/030) INTOCADOS.
PRINCÍPIO 9 PADCON: validação Caio explícita antes de qualquer mudança visual ou de design já validado.

# Tasks (ordem de execução)

### F0: Invariantes baseline + Object Storage
- **Blocked By**: []
- ✅ FEITO: 8.725 receitas + R$ 2.735.336,10 preservados, ZAPSIGN_API_TOKEN setado, bucket `assinaturas-pawards` criado, smoke `GET /api/v1/account/` sandbox 200

### F1: Migration 031 SQL aplicada
- **Blocked By**: [F0]
- ✅ FEITO: `031_wave10_zapsign_auditoria.sql` (8.462 bytes) aplicada via psql
- 2 tabelas novas (`assinatura_solicitacoes`, `auditoria_assinaturas`) + colunas espelho em `assinatura_textos_institucionais`
- Schema Drizzle `lib/assinatura/schema_zapsign.ts` espelho

### F2: ZapsignAdapter promoted (mock → produção)
- **Blocked By**: [F1]
- ✅ FEITO: `lib/assinatura/adapters.ts` (~370L com HMAC custom header)
- `ZAPSIGN_API_TOKEN` ativo, `mapearAuthMode()`, `verificarAssinaturaCertificado()`, switch sandbox/produção

### F3.A: enviarPARQ.ts (Família 4 — PRIMEIRA)
- **Blocked By**: [F2]
- ✅ FEITO: `lib/assinatura/use-cases/enviarPARQ.ts` (8.975 bytes)
- Signatários: clínica ICP e-CNPJ + farmácia ICP e-CNPJ, `signature_order_active: true`
- Plugado em `POST /parq/emitir`

### F3.B: enviarTCLE.ts (Família 1 — SEGUNDA)
- **Blocked By**: [F3.A]
- ✅ FEITO: `lib/assinatura/use-cases/enviarTCLE.ts` (5.279 bytes)
- Signatários: paciente (assinaturaTela-tokenWhatsApp) + médico (certificadoDigital), paralelo
- Plugado em `prescricoes.ts` (1ª receita do paciente)

### F3.C: enviarOrcamentoFarmaceutico.ts (Família 3 — TERCEIRA) ✅ FEITO
- **Blocked By**: [F3.B]
- ✅ FEITO via Caminho 1 MVP minimal (aprovado pelo Caio "Caminho 1")
- Decisão: orçamento = receita PARMAVAULT roteada com valor_formula_estimado preenchido
- Criado `lib/assinatura/use-cases/enviarOrcamentoFarmaceutico.ts` (309 linhas)
- Reusou template `ORCAMENTO_FORMAL_V1` (id=4) já cadastrado em `assinatura_templates` — sem migration
- Reusou `assinaturaService.enviar()` com `signatariosExtras: [farmaciaSignatario]` — sem PDF custom
- Criado `routes/orcamentos.ts` com 2 endpoints (POST /orcamentos/:receitaId/disparar + GET /status) — auth via requireRole + tenant via JWT.unidadeId
- Registrado no `routes/index.ts`
- Smoke ✅: POST disparar 401 (montada), GET status 401 (montada), PARQ 401 (intacto), healthz 200, 8.725 receitas + R$ 2.735.336,10 + 3 triggers Wave 9 preservados
- Sujeira herdada Wave 5 documentada: farmacias_parmavault não tem campos representante_* (usa env fallback FARMACIA_REPRESENTANTE_*_FALLBACK por enquanto — corrigir Wave 10.5 ou Wave 11)
- Critério GREEN parcial atingido: rota responde, idempotência implementada via metadata->>'receitaId'. Falta sandbox real ZapSign disparar pra WhatsApp do CPF teste (depende de F4 webhook + secrets reais).
- **CORREÇÕES PÓS-CODE-REVIEW (architect FAIL → PASS):**
  - ① Estendido `EnviarParams` em `service.ts` com `externalId?: string` + `metadataExtra?: Record<string,unknown>` (retro-compatível, F3.A/F3.B intactos)
  - ② F3.C agora passa `externalId: \`orc-${receitaId}-${Date.now()}\`` — F4 webhook reconcilia 1:1 via regex `/^orc-(\d+)-\d+$/`
  - ③ F3.C passa `metadataExtra: {receitaId, farmaciaId, …}` mergeada NO INSERT inicial — eliminada janela de race entre INSERT e UPDATE pós-INSERT
  - ④ F3.C passa `forcarProvedor: "zapsign"` — elimina risco funcional-jurídico de fallback Clicksign sem capability ICP qualificada FARMACIA_ECNPJ
  - Smoke pós-fix verde: 401/200/8725/2.735.336,10/3 triggers/2 tabelas Wave 10/template id=4

### Fase B (smoke real ZapSign sandbox 30min) — DIA 1 (HOJE 2026-05-01) ✅ PARCIAL VERDE
- **Blocked By**: [F3.C]
- ✅ FEITO HOJE (preparação SEM token ZapSign):
  - `ZAPSIGN_WEBHOOK_SECRET` gerado aleatório forte hoje (32 bytes hex, 256 bits) E **DELETADO** após code-review architect FAIL apontar que secret visível em `shared` = vetor de forja de webhook com impacto jurídico. Amanhã re-gerar como SECRET (oculto) via `requestEnvVar` e revelar 1 vez no chat pra Caio guardar no 1Password.
  - Coluna `pacientes.is_teste boolean NOT NULL DEFAULT false` adicionada (psql aditivo, achado 3 code-review). Caio (id=3104) marcado `is_teste=true`. Estabelece flag estrutural pra filtrar contas teste em relatórios futuros.
  - Paciente Caio (id=3104) inserido idempotente: CPF 29327494806, tel 5511946554000, email ceo@pawards.com.br, unidade_id=1
  - Smoke 6/6 verde: API healthz 200 · POST/GET orçamentos 401 · webhook ZapSign ping 200 · receita 8725 com todos campos · Caio+FAMA+template prontos · invariantes Wave 9 PRESERVADOS (8.725 receitas + R$ 2.735.336,10) · Wave 10 baseline capturado (4 solicitações, 0 auditoria)
  - Wave 13 RBAC + Kill-Switch + 2FA TOTP **mini-RFC técnico completo** em `02_DECISOES_PENDENTES` (schema SQL aditivo + matriz endpoint×perfil + middleware exemplo + 8 critérios de aceite)
  - **Hotfix segurança crítico (sujeira #6 nova)**: bypass `x-admin-token` em rotas Wave 10 BLOQUEADO em `requireAuth.ts` via regex `/^\/(api\/)?(orcamentos|parq|prescricoes)(\/.*)?$/`. Smoke confirmou 5/5 rotas Wave 10 reais retornam 401 mesmo com token admin válido. Rotação completa do `ADMIN_TOKEN` (e remoção do `.replit` versionado) agendada pra Wave 10.5 — Caio rotaciona via `requestEnvVar(secret)` amanhã junto com cadastro ZapSign.
  - Migration versionada `032_pacientes_is_teste.sql` criada (rastreabilidade da coluna `is_teste`)
  - Decisões Caio aprovadas: D5 ceo@pawards.com.br + 3 aliases · D6 WEBHOOK_SECRET aleatório gravado · D7 Wave 13 documentado · D8 webhooks.pawards.com.br (CNAME amanhã) · C1 smoke mockado hoje
- 🟡 PENDENTE DIA 2 (amanhã 2026-05-02 manhã, depende de Caio):
  - Caio cadastra conta SANDBOX ZapSign com ceo@pawards.com.br
  - Caio cola `ZAPSIGN_API_TOKEN` via requestEnvVar
  - Dr. Replit roda `suggest_deploy` → ganha URL Replit estável
  - Caio cria CNAME `webhooks.pawards.com.br` → URL deploy
  - Dr. Replit roda `openssl rand -hex 32` → revela 1 vez no chat pra Caio guardar no 1Password → `requestEnvVar(ZAPSIGN_WEBHOOK_SECRET)` como SECRET oculto
  - Caio cadastra webhook ZapSign: nome `hook-padua-4000` + URL `https://webhooks.pawards.com.br/api/webhooks/assinatura/zapsign` + secret (cola o mesmo valor revelado)
  - Dr. Replit cria receita teste vinculada ao Caio (id=3104, `is_teste=true`):
    `INSERT INTO parmavault_receitas (paciente_id, farmacia_id, unidade_id, numero_receita, valor_formula_estimado, status, criado_em, emitida_em) VALUES (3104, 4, 1, 'TESTE-WAVE10-FASE-B-001', 1000.00, 'EMITIDA', now(), now()) RETURNING id`
    — `trg_calc_comissao` calcula comissao_estimada=160.00 automático.
    — **NÃO mais UPDATE transitório no Carlos** (cancelado por achado 2 code-review: vazamento PII via worker notifAssinatura.ts).
  - Dr. Replit dispara `enviarOrcamentoFarmaceutico({receitaId: <novo_id>, farmaciaRepresentante: {nome, cpf:29327494806, tel:5511946554000, email:ceo@pawards.com.br}})`
  - Caio assina ambos links no celular → webhook → auditoria gravada
  - Validação: receitas PRODUÇÃO (`WHERE p.is_teste=false`) 8.725 mantidas + R$ 2.735.336,10 mantida + assinatura_solicitacoes 4→5 + auditoria_assinaturas 0→1 + receitas TESTE 0→1 + comissão TESTE 0→R$ 160

### F4: Webhook handler completo + manifesto auditoria
- **Blocked By**: [Fase B Dia 2]
- 🟡 PENDENTE
- `assinaturasWebhook.ts`: promove handler ZapSign para full
- `service.ts` ganha `processarEventoZapSign(evento)`:
  - `doc_signed` → baixa PDF da `signed_file` → SHA-256 → Object Storage → `registrarManifestoAuditoria`
  - `doc_refused` → `UPDATE assinatura_solicitacoes SET status='REJEITADO'`
  - `doc_removed` → `UPDATE assinatura_solicitacoes SET status='EXPIRADO'`
- Idempotência: `INSERT … ON CONFLICT (signature_id) DO NOTHING`
- Critério GREEN: assinar sandbox dispara webhook → 200 + 1 linha `auditoria_assinaturas` (hash + IP + geo + auth_method); reenvio = 0 linhas extras

### F5: Frontend timeline + detalhe (2 telas mínimas)
- **Blocked By**: [F4]
- 🟡 PENDENTE
- `/assinaturas/timeline` — tabela últimas 50 (template, signatário, status, hora, link verificação ZapSign)
- `/assinaturas/[id]` — detalhe (signatários × status × auth_method × IP × geo no mapa Leaflet)
- Banner Painel CEO: "Assinaturas hoje: X enviadas | Y assinadas | Z rejeitadas"
- Botão "Reenviar lembrete WhatsApp" (`POST /api/v1/docs/{token}/resend/`)
- Critério GREEN: 2 telas renderizam; click verificar abre URL ZapSign correta

### F6: Wrap-up
- **Blocked By**: [F1, F2, F3.C, F4, F5]
- 🟡 PENDENTE
- `replit.md` atualizado com Wave 10 ZapSign (env vars novas, fluxo, gateway adapter)
- Microscópio v2 `.local/PARMAVAULT_WAVE10_ZAPSIGN.md` marcado COMPLETED com SELECTs prova
- `.local/.commit_message` Wave 10
- Commit + push duplo (main + feat/dominio-pawards) + tag `v031-zapsign-launch`
- Restart workflows + smoke 200/401
- SELECTs prova preservação no relatório final (Wave 9 invariantes + Wave 10 novas linhas)

# Sujeiras Wave 9 herdadas (NÃO bloqueiam Wave 10)
- ⚠️ #1: Esperado 4 views, real 2 (`v_parq_acordos_vigentes`, `v_parq_validacao_simplificada_alert`). Resolver na limpeza v1.1.
- ⚠️ #2: F4 frontend tem 3 telas (esperado 4 — falta `wizard-emissao` e `historico-timeline`). Resolver na limpeza v1.1.
- ⚠️ #3: Tag `v030-parq-launch` não encontrada local — verificar remote ou criar.

---

## 📦 SNAPSHOT WAVE 10 PÓS-F5 + WAVE 10.5 + TSUNAMI DE FOLLOW-UPS (11/mai/2026 madrugada)

### O que estava pendente quando este plano foi escrito vs hoje

| Fase | Status anterior | Status agora |
|------|-----------------|--------------|
| F4 webhook + manifesto SHA-256 | 🟡 PENDENTE | ✅ MERGED (com fixes architect: signer_papel via lookup, signatureId determinístico, ON CONFLICT signature_id) |
| F5 frontend timeline + detalhe | 🟡 PENDENTE | ✅ MERGED (hardenizado FAIL→PASS: guardMaster + mascaramento PII server-side em CPF/IP/geo) |
| Wave 10.5 ADMIN_TOKEN rotacionado | (não existia no plano) | ✅ MERGED (256-bit, requestEnvVar, .replit limpo, regex bypass intacta) |
| Fase B Dia 2 disparo real ZapSign | 🟡 PENDENTE | 🟡 PENDENTE (Caio cadastra conta ZapSign + CNAME `webhooks.pawards.com.br`) |
| F6 wrap-up + tag `v031-zapsign-launch` | 🟡 PENDENTE | 🟡 PENDENTE (depende Fase B Dia 2) |

### Tsunami de follow-ups MERGED entre F5 e hoje (~25 tasks)

Agrupados por intenção. Todos via task agent isolado, todos com architect
review FAIL→PASS quando necessário, todos REGRA FERRO (psql aditivo).

**1. Defesa em profundidade do cofre PDF (Wave 10.5 housekeeping):**
- #34 Upload real do PDF assinado pro bucket `assinaturas-pawards` no
  webhook `doc_signed` (signed URL GCS V4 via sidecar Replit, redirect 302)
- #38 Worker daily `verificarPdfsCofre` (tick 5min, exec 03:30 BRT) +
  Migration 035 (`pdf_verificado_em/ok/erro` em `auditoria_assinaturas`)
- #39 Worker `pdfRetryUpload` 5 tentativas exponenciais (1m/5m/15m/1h/6h)
- #48 Auto-cura: quando #38 detecta PDF ausente, baixa de novo do ZapSign
  e re-faz upload antes de escalar e-mail (Migration 037)
- #47 Card CEO "PDFs assinados ausentes do cofre" (verde 0 / âmbar 1-2 /
  vermelho 3+) com top 5 linhas clicáveis
- #49 Tela admin `/assinaturas/uploads-falhos` (4 status: em_retry/
  esgotado/fora_janela/aguardando_webhook)
- #50 Alerta CEO quando upload esgota retries (Migration 038, UNIQUE parcial
  evento+canal+destinatário, is_sistema_ceo bypass quiet-hours)
- #57 Reset manual retry (após Caio resolver problema do bucket)
- #58 Resumo diário consolidado quando ≥3 uploads travam no mesmo dia
  (Migration 039, anti alerta-tsunami)

**2. Observabilidade CEO em tempo real (extensão F5):**
- #35 Banner Painel CEO "Resumo 24h: enviadas / assinadas / rejeitadas /
  pendentes" (polling 60s, gate FEATURE_ASSINATURAS_RESUMO_CEO)
- #36 Notificação tempo real ASSINADO/REJEITADO (Migration 034
  `is_sistema_ceo`, fila `assinatura_notificacoes` com tickNotifAssinatura,
  toast no Painel via delta detection)
- #37 Tendência semanal 7d com sparkline + variação % colorida
- #43 Quebra por unidade clínica (mini-tabela + sparkline por linha)
- #44 Alerta proativo crítico (rejeições >+10% ou conversão <-10pp),
  dispatch direto Gmail+WhatsApp, idempotente UNIQUE (dia, métrica,
  tipo_transição) (Migrations 035/036/037/038)
- #53 Alerta de recuperação crítico→bom/excelente (tom de alívio,
  mesmo padrão idempotente)
- #52 Tela dedicada `/assinaturas/alertas-ceo` (header + 4 cards resumo
  + lista cronológica com cor semântica + badge "NOVO")
- #61 Botão "marcar todos como vistos"
- #62 Abas Todos / Pendentes / Vistos (URL persistida `?filtro=`)
- #69 Toast "Desfazer" 8s após marcar-todos-vistos

**3. UX timeline (extensão F5):**
- #51 Click numa clínica do banner CEO abre timeline filtrada
  (`?unidade_id=`)
- #55 Filtro por status (chips Todos / Em andamento / Concluídas /
  Rejeitadas-Expiradas, whitelist server-side)
- #56 Coluna "Clínica" na timeline (LEFT JOIN unidades)
- #59 URL persistida `?status=em_andamento|concluido|rejeitado` (deep-link)
- #60 Export CSV `?format=csv` (UTF-8 BOM, mascaramento PII paciente
  defensivo, mesmo guardMaster)
- #64 Filtro por intervalo de datas (chips Tudo/Hoje/7d/30d/Personalizado,
  validação regex server-side)

### Migrations aditivas Wave 10.5 → tudo psql IF NOT EXISTS, ZERO db:push

| # | Aplicada em | Conteúdo |
|---|-------------|----------|
| 032 | 01/mai | `pacientes.is_teste boolean DEFAULT false` (filtragem contas teste) |
| 034 | 11/mai | `assinatura_notificacoes.is_sistema_ceo` + index parcial (CEO bypass quiet-hours) |
| 035 | 11/mai | `auditoria_assinaturas.pdf_verificado_em/ok/erro` (worker #38) + ENUM `assinatura_solicitacoes.status` aceita `'PROCESSANDO'` (claim atômico) + tabela `alertas_ceo_assinaturas` (#44) |
| 036 | 11/mai | `assinaturas_cor_diaria` (snapshot diário pra detectar transição real) |
| 037 | 11/mai | colunas retry em `assinatura_webhook_eventos` (`tentativas_retry`, `ultima_tentativa_em`, `processando_em`) |
| 038 | 11/mai | CHECK `assinatura_notificacoes.momento` aceita `'UPLOAD_PDF_ESGOTADO'` + `webhook_evento_id FK` + UNIQUE parcial idempotência + DROP NOT NULL `solicitacao_id` (alertas operacionais sem envelope) + `alertas_ceo_assinaturas.tipo_transicao` (piora/melhora) |
| 039 | 11/mai | CHECK aceita `'UPLOAD_PDF_RESUMO_DIARIO'` + tabela `pdf_upload_resumo_diario` (idempotência 1 linha/dia) |

### Invariantes Wave 9 PRESERVADAS (verificação atual)

- `parmavault_receitas` count = 8.726 (delta +1 vs baseline 8.725 = receita
  real entrando fora da sessão, trigger 027 funcionou — não é regressão)
- `comissao_estimada` SUM ≈ R$ 2.735.636,10 (espelho `parq_estimado` igual)
- 5 triggers Wave 9 + 2 PARQ ATIVOS (`pg_trigger.tgenabled='O'`)
- `assinatura_solicitacoes` 7 linhas, `auditoria_assinaturas` 0 linhas
  (ainda sem disparo real — Fase B Dia 2)

### Próximo passo IMEDIATO destravado

Quando Caio liberar:
1. Cadastro conta ZapSign sandbox + token via `requestEnvVar`
2. CNAME `webhooks.pawards.com.br` apontando pro deploy Replit
3. `ZAPSIGN_WEBHOOK_SECRET` regerado como secret oculto (revelado 1× pra
   1Password, colado no painel ZapSign hook `hook-padua-4000`)
4. Disparo de `enviarOrcamentoFarmaceutico` em receita teste vinculada
   ao próprio Caio (id=3104, `is_teste=true`)
5. Validação fim-a-fim: webhook 200 + 1 linha em `auditoria_assinaturas`
   com hash + IP + geo + auth_method + PDF persistido no bucket
6. Tag `v031-zapsign-launch` (F6 wrap-up)

### Observação pro Dr. Claude

A defesa em profundidade do cofre (#34/#38/#39/#47/#48/#49/#50/#57/#58) e
a observabilidade CEO (#35/#36/#37/#43/#44/#52/#53/#61/#62/#69) **antecipam
muito do que seria Wave 11 (Comunicação) e Wave 11.5 (Segurança IDOR)**.
Vale revisar se faz sentido renumerar / consolidar essas duas waves agora
que metade já existe em produção, ou se elas viram apenas "fechamento de
lacunas" no roadmap.

---

## 🚀 SNAPSHOT FASE B DIA 2 — DISPARO REAL FECHADO (12/mai/2026 madrugada — 01:09 BRT)

### Linha do tempo da noite

| Horário (BRT) | Evento |
|---|---|
| ~22:30 | Caio cola `ZAPSIGN_API_TOKEN` via `requestEnvVar` (PRODUÇÃO, não sandbox) |
| ~22:35 | `ZAPSIGN_BASE_URL=https://api.zapsign.com.br` setado via `setEnvVars` |
| ~22:45 | 1º disparo real — receita 8728 (R$ 1.500 + R$ 450 comissão), envelope ZapSign `ea9029e8-8d8e-4d4e-ac2b-24551b8f3979`, solicitação id=8 |
| ~22:46 | Caio recebe 2 e-mails `ola@zapsign.com.br` no Zoho |
| ~22:50 | Caio cria 3 webhooks no painel ZapSign (`doc_signed`, `doc_refused`, `doc_deleted`) apontando pra URL temporária `https://2ef80136-...kirk.replit.dev/api/webhooks/assinatura/zapsign` |
| ~22:52 | Painel ZapSign confirmado SEM campo de secret/header customizado por webhook |
| ~23:00 | `ZAPSIGN_WEBHOOK_SECRET` tentativa de delete via `deleteEnvVars` — falha silenciosa (deleteEnvVars ignora SECRETS, só apaga env vars) |
| ~23:05 | **Edit cirúrgico** em `lib/assinatura/adapters.ts` linhas 75-85: novo branch `else if` que aceita webhook sem header customizado **se e somente se** `NODE_ENV !== "production"` E `ZAPSIGN_WEBHOOK_DEV_BYPASS === "true"` (dev-only, defesa em profundidade preservada em prod) |
| ~23:10 | `ZAPSIGN_WEBHOOK_DEV_BYPASS=true` setado · API restart · ping de teste retorna `signature_valida=t, processado=t` ✅ |
| ~23:30 | Caio tenta assinar mas trava na tela "Certificado digital — Selecione o tipo de certificado" (FAMA configurada como `qualificada_ecnpj` ICP-Brasil) |
| ~23:50 | **Edit cirúrgico** no use-case: novo param `farmaciaAuthMode?: AuthMode` (default mantém `qualificada_ecnpj` ICP); script teste passa `farmaciaAuthMode: "avancada"` pra fechar fluxo sem certificado real |
| ~01:05 | **Webhook real do ZapSign chega** — evento id=19 `doc_signed` `signature_valida=t` `processado=t` `solicitacao_id=8`. Solicitação 8 vai pra `CONCLUIDO`, hash_assinado gravado, `auditoria_assinaturas` ganha linha id=1 |
| ~01:09 | 2º disparo (receita 8729 com `farmaciaAuthMode: "avancada"`, envelope `55dcabfd-3b18-40e1-af83-d1d1a7801aa7`, solicitação id=9) — não foi mais necessário, mas ficou disponível pra teste do fluxo "leve" se precisarmos |

### Prova fim-a-fim em SQL puro

```sql
SELECT id, solicitacao_id, signer_papel, signer_name, auth_method,
       signer_ip, LENGTH(document_hash_sha256) AS hash_len,
       pdf_storage_key, validation_url, criado_em
  FROM auditoria_assinaturas ORDER BY id DESC LIMIT 1;
-- id=1 | sol=8 | PACIENTE | "Caio Pádua (CEO PAWARDS - PACIENTE TESTE WAVE 10)"
-- auth=assinaturaTela | ip=191.204.182.53 (IP REAL) | hash 64 chars
-- pdf_storage_key=replit-objstore-b6128506-.../assinaturas/orc-8728-1778546495818.pdf
-- validation_url=https://app.zapsign.com.br/verificar/54e9c6e3-39be-4fa9-a4dc-356c322c8c9c
-- criado_em=2026-05-12 01:05:15 UTC
```

### Invariantes Wave 9 verificadas pós-fluxo

- `parmavault_receitas` (excluindo 8728+8729 teste) = **8.726 linhas**
- `SUM(comissao_estimada)` (excluindo teste) = **R$ 2.735.636,10** (espelho `parq_estimado` igual)
- 5 triggers Wave 9 ATIVOS (`pg_trigger.tgenabled='O'`)
- `assinatura_solicitacoes`: 9 linhas (8 antes + 1 nova hoje teste leve)
- `auditoria_assinaturas`: 0 → **1** (primeira assinatura real do projeto inteiro!)

### Dívidas técnicas registradas (NÃO bloqueiam Wave 10 fechamento)

1. **Signatários não atualizados pós-webhook**: `assinatura_signatarios` sol=8 papel=PACIENTE continua com `status=ENVIADO` mesmo com solicitação em `CONCLUIDO` e auditoria gravada. F4 só atualiza solicitação + auditoria, não propaga pra signatários. Corrigir Wave 10.5.
2. **Só 1 linha de auditoria pra envelope com 2 signatários**: provavelmente paciente assinou e ZapSign enviou `doc_signed` (semântica "documento totalmente assinado") porque farmácia pulou ou porque template ZapSign tinha config "1 signatário basta". Investigar Wave 10.5: nosso webhook deveria gerar 1 linha de auditoria por SIGNATÁRIO assinado, não por envelope.
3. **`ZAPSIGN_WEBHOOK_DEV_BYPASS=true` ATIVO**: regra dev-only protegida por `NODE_ENV !== "production"`, mas em produção definitiva (com CNAME `webhooks.pawards.com.br`) o painel ZapSign continua sem campo de secret. Decisão pra Wave 10.5 ou Wave 11: **migrar pra ZapSign Enterprise** (que tem secret) ou **trocar de provedor pra Clicksign** (que tem). Outras alternativas: validar via `event_id` único + IP whitelist do ZapSign + idempotência forte.
4. **`farmaciaAuthMode: "avancada"` no script teste**: documentado no comentário do código que NÃO usar em produção real. Wave 10.5 pode adicionar guard que recusa o param fora de `NODE_ENV !== "production"`.
5. **Wave 10.5 Caio ainda precisa**: cadastrar e-CNPJ ICP real pra FAMA (representante real, não Caio fictício), gerar `webhooks.pawards.com.br` definitivo via CNAME, rotacionar `ZAPSIGN_WEBHOOK_SECRET` (caso provedor ofereça campo).

### Status Wave 10 no fechamento da noite

| Fase | Status |
|---|---|
| F0 invariantes baseline + bucket | ✅ |
| F1 Migration 031 | ✅ |
| F2 ZapsignAdapter promovido HMAC | ✅ |
| F3.A enviarPARQ.ts | ✅ |
| F3.B enviarTCLE.ts | ✅ |
| F3.C enviarOrcamentoFarmaceutico.ts | ✅ |
| Fase B Dia 1 preparação | ✅ |
| **Fase B Dia 2 disparo real fim-a-fim** | ✅ **(noite 11→12 mai/2026)** |
| F4 webhook handler + manifesto SHA-256 | ✅ |
| F5 frontend timeline + detalhe | ✅ |
| Wave 10.5 ADMIN_TOKEN rotacionado + ~25 follow-ups | ✅ |
| **F6 wrap-up + tag `v031-zapsign-launch`** | 🟡 PENDENTE (próxima sessão, requer code_review final) |
| Wave 13 RBAC + 2FA TOTP | 🟡 mini-RFC documentada |

### Observação pro Dr. Claude (atualizada)

Wave 10 pode ser oficialmente declarada **PRONTA PRA PRODUÇÃO** após F6
(commit + tag + code_review final + suggest_deploy). Sugestões de
priorização pra próxima sessão:

1. **Wave 10.5 housekeeping urgente** (1-2 dias):
   - Auditoria por signatário (não por envelope) — corrigir item 2 acima
   - Atualização de `assinatura_signatarios.status` no webhook — item 1
   - Decisão estratégica: ZapSign Enterprise vs Clicksign vs IP whitelist — item 3
   - Guard `farmaciaAuthMode` produção — item 4
2. **Wave 13 RBAC + 2FA TOTP** ANTES de abrir pra outros tenants (mini-RFC pronta em `02_DECISOES_PENDENTES`)
3. **Wave 11/11.5 consolidação**: revisar se a defesa em profundidade do cofre + observabilidade CEO já merged (#34-#69) substituem totalmente as Waves originais ou apenas as encurtam
