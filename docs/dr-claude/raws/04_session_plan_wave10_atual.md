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

### F4: Webhook handler completo + manifesto auditoria
- **Blocked By**: [F3.C]
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
