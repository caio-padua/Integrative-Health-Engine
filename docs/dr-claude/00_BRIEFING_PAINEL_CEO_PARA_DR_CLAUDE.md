# 🎯 Briefing Painel CEO → Dr. Claude — Wave 10 ZapSign / F4 + F5 + Wave 10.5 fechados

**Data**: 2026-05-11 (atualizado pós-tsunami ~25 follow-ups MERGED entre F5 e hoje)
**Branch**: `feat/dominio-pawards`
**Último marco**: F4 webhook + manifesto SHA-256 + F5 timeline/detalhe (hardenizado FAIL→PASS) + Wave 10.5 (cofre PDF defesa em profundidade + observabilidade CEO em tempo real + UX timeline com export contador/advogado + ADMIN_TOKEN rotacionado 256-bit)

> ⚠️ **Sync GitHub**: o branch local pode estar à frente da raw do
> GitHub. Se um link raw retornar versão antiga, sinalize ao Caio
> que falta apertar Sync no Replit pra empurrar os commits.

---

## 🚦 Semáforo geral Wave 10

| Frente | Status | Cor |
|--------|--------|-----|
| F0 baseline + bucket Object Storage | ✅ feito | 🟢 |
| F1 Migration 031 SQL (auditoria + solicitações) | ✅ feito | 🟢 |
| F2 ZapsignAdapter promovido (HMAC custom header) | ✅ feito | 🟢 |
| F3.A enviarPARQ (família 4 — clínica ICP + farmácia ICP) | ✅ feito | 🟢 |
| F3.B enviarTCLE (família 1 — paciente avançada + médico ICP) | ✅ feito | 🟢 |
| F3.C enviarOrcamentoFarmaceutico (família 3) | ✅ feito + 3 críticos code-review corrigidos | 🟢 |
| **F4 Webhook completo + manifesto SHA-256** | **✅ MERGED** (signer_papel via lookup, signatureId determinístico, ON CONFLICT signature_id) | **🟢** |
| **F5 Frontend timeline + detalhe** | **✅ MERGED** (FAIL→PASS: guardMaster + mascaramento PII server-side em CPF/IP/geo) | **🟢** |
| **Wave 10.5 cofre PDF + observabilidade CEO + UX timeline + ADMIN_TOKEN rotacionado** | **✅ MERGED** (~25 follow-ups, 7 migrations 032-039 aditivas) | **🟢** |
| Fase B Dia 2 disparo real ZapSign sandbox 30min | 🟡 pendente — depende cadastro Caio + CNAME `webhooks.pawards.com.br` | 🟡 |
| F6 Wrap-up + tag `v031-zapsign-launch` | 🟡 pendente — depende Fase B Dia 2 | 🟡 |

---

## 💰 Números do painel CEO (preservados pixel-perfect)

| Métrica | Valor | Origem |
|--------:|------:|:-------|
| Receitas PARMAVAULT cadastradas | **8.726** | empírico, `parmavault_receitas` (+1 vs baseline = trigger 027 ativou pra receita real fora da sessão; **não é regressão**) |
| Valor estimado total das receitas | **~R$ 9.256.540,00** | empírico, soma `valor_formula_estimado` |
| **Comissão potencial (TEÓRICA)** | **R$ 2.735.636,10** | empírico, soma `comissao_estimada` (+R$ 300 da nova receita real) |
| Comissão paga até agora | **R$ 0,00** | empírico — **0 farmácias assinaram PARQ ainda** |
| PARQ acordos assinados | 0 | `parq_acordos` count |
| Triggers Wave 9 (027/030) intactos | 5/5 ATIVOS | `pg_trigger.tgenabled='O'` |
| Tabelas Wave 10 criadas | 2 + 5 Wave 10.5 | `assinatura_solicitacoes` (7 linhas), `auditoria_assinaturas` (0 linhas — Fase B Dia 2 ainda não rodou), + `alertas_ceo_assinaturas`, `assinaturas_cor_diaria`, `pdf_upload_resumo_diario`, `assinatura_webhook_reset_manual`, colunas retry/cofre |

> **Tese central de Wave 10**: o que destrava os R$ 2,73M é a
> assinatura digital com defensibilidade jurídica tripla (CFM 2.386/2024
> + CC arts. 593-609 + LGPD art. 11 §4º + STJ REsp 2.159.442/PR). Sem
> isso, o valor é só "potencial teórico", o caixa real é R$ 0,00.

---

## 🧠 As 4 personas do CEO Caio (repassar a cada conversa)

Quando o Caio faz uma pergunta, ela vem normalmente "amassada" entre
4 personas TDAH/TOC. Dr. Claude precisa identificar de onde a pergunta
está vindo pra responder no registro certo:

| Persona | Símbolo | Pergunta típica | Métrica chave |
|---------|:-------:|-----------------|---------------|
| **Médico** | 🩺 | "Isso é seguro pro paciente? Tem CFM?" | risco clínico, defensibilidade jurídica |
| **CEO** | 💰 | "Quanto isso destrava de caixa? Quando?" | conversão R$ potencial → R$ real |
| **Empresário** | 📈 | "Quanto custa por disparo? Margem?" | custo unitário, escala, fornecedor |
| **Investidor** | 🛡️ | "E se ZapSign cair? E se Anvisa mudar?" | risco fornecedor, regulatório, contingência |

Resposta **boa** do Dr. Claude = resposta **estruturada nas 4 lentes**.

---

## ⚙️ Triângulo operacional

```
   Caio (CEO 4 personas) ── decisão estratégica
        ↓ valida (Princípio 9 PADCON: 5ª pergunta)
   Dr. Claude (orquestração) ── plano + arbitragem entre frentes
        ↓ delega
   Dr. Replit (código) ── implementa, testa, code-review
        ↑ reporta dopamina + decisão pendente
   Caio (4 personas) ──────────────────────────────────┘
```

---

## 🔒 Regra Ferro (NUNCA quebrar)

- **Zero `db:push`**. Toda mudança de schema é aditiva, via `psql IF NOT EXISTS`.
- Triggers Wave 9 (`trg_calc_comissao`, `trg_sync_comissao_parq`,
  `trg_parq_plano_prazo_limite`) **INTOCADOS**.
- Manifesto **PADCON v1.0 + Princípio 9** ("validado pelo Dr. Caio?")
  antes de qualquer mudança visual ou arquitetural já validada.

---

## 📜 O que mudou desde a última atualização (F3.C → F4 → F5 → Wave 10.5)

1. **F4 webhook MERGED**: handler ZapSign full (`doc_signed`/`refused`/
   `removed`), manifesto SHA-256 idempotente via `ON CONFLICT signature_id`,
   helper `registrarManifestoAuditoria`, signer_papel via lookup em
   `assinatura_signatarios`, signatureId determinístico (architect FAIL→PASS).
2. **F5 frontend MERGED + hardenizado FAIL→PASS**: 2 telas
   (`/assinaturas/timeline` + `/assinaturas/:id`) + endpoints novos
   protegidos por `guardMaster` (mesmo padrão `parq.ts`, bypass
   `x-admin-token` BLOQUEADO 403) + mascaramento PII server-side em
   CPF (`123.***.***-45`), IP (2 octetos) e geo (city/region/country
   sem lat/lng raw). Defesa em profundidade.
3. **Wave 10.5 tsunami ~25 follow-ups MERGED** — 3 grupos:
   - **Cofre PDF**: upload real bucket `assinaturas-pawards` no
     `doc_signed`, worker `verificarPdfsCofre` 03:30 BRT, retry 5x
     exponencial com auto-cura, card CEO "PDFs ausentes", tela admin
     `/uploads-falhos` 4 status, alerta esgotado, resumo diário
     consolidado anti-tsunami
   - **Observabilidade CEO**: banner "Resumo 24h" Painel CEO,
     notificação tempo real ASSINADO/REJEITADO com bypass quiet-hours
     `is_sistema_ceo`, tendência 7d com sparkline, quebra por unidade,
     alerta proativo crítico (>+10% rejeição), alerta de recuperação,
     tela `/alertas-ceo` com abas Todos/Pendentes/Vistos + Desfazer 8s
   - **UX timeline**: filtros clínica/status/datas persistidos URL
     (deep-link), paginação 50→5000, export CSV (`?format=csv`) + XLSX
     navy/gold, 3 colunas extras (`valor_brl` somável + farmácia + médico)
4. **Hotfix segurança Wave 10.5**: `ADMIN_TOKEN` rotacionado 256-bit
   via `requestEnvVar`, `.replit` limpo, bypass `x-admin-token`
   bloqueado em rotas Wave 10 via regex em `requireAuth.ts`.
5. **7 migrations psql aditivas (032-039)** — REGRA FERRO mantida,
   zero `db:push`, triggers Wave 9 INTOCADOS.

Detalhes completos em
[`01_DECISOES_TOMADAS_WAVE10_F3C.md`](./01_DECISOES_TOMADAS_WAVE10_F3C.md).

---

## ❓ Aguardando Dr. Claude

Antes de seguir pra **F4 (webhook completo + manifesto auditoria)**, o
Caio escolheu a opção **C: pausar e revisar com Dr. Claude o microscópio
Wave 10**.

Decisões pendentes que precisam input do Dr. Claude estão em
[`02_DECISOES_PENDENTES_PARA_DR_CLAUDE.md`](./02_DECISOES_PENDENTES_PARA_DR_CLAUDE.md).

---

## 📚 Para deep-dive técnico

Os 4 raws fonte-de-verdade estão em [`raws/`](./raws/):

- `01_microscopio_PARMAVAULT_WAVE10.md` (45 KB) — auditoria empírica
  Wave 10, breakdown PARQ/TCLE/Orçamento, contratos jurídicos
- `02_mapa_neuronal_v1.1.md` (6 KB) — limpeza arquitetural neural
  v1.1, 5 conceitos validados (PAWARDS=casa, MEDCORE=módulos,
  PARMAVAULT, PARQ FARMA, PARQ LABOR Wave 12, PASSURANCE Wave 13)
- `03_arquitetura_bounded_contexts_v1.md` (14 KB) — bounded contexts DDD
- `04_session_plan_wave10_atual.md` (6 KB) — plano de sessão Wave 10 ZapSign
