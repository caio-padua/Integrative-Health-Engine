# 🎯 Briefing Painel CEO → Dr. Claude — Wave 10 ZapSign / F3.C fechado

**Data**: 2026-05-01
**Branch**: `feat/dominio-pawards`
**Último checkpoint Replit**: `e732435` "Add ability to send pharmaceutical budget envelopes for patient prescriptions"

---

## 🚦 Semáforo geral Wave 10

| Frente | Status | Cor |
|--------|--------|-----|
| F0 baseline + bucket Object Storage | ✅ feito | 🟢 |
| F1 Migration 031 SQL (auditoria + solicitações) | ✅ feito | 🟢 |
| F2 ZapsignAdapter promovido (HMAC custom header) | ✅ feito | 🟢 |
| F3.A enviarPARQ (família 4 — clínica ICP + farmácia ICP) | ✅ feito | 🟢 |
| F3.B enviarTCLE (família 1 — paciente avançada + médico ICP) | ✅ feito | 🟢 |
| **F3.C enviarOrcamentoFarmaceutico (família 3)** | **✅ feito + 3 críticos do code-review corrigidos** | **🟢** |
| F4 Webhook completo + manifesto auditoria | 🟡 próximo | 🟡 |
| F5 Frontend timeline + detalhe (2 telas mínimas) | 🟡 pendente | 🟡 |
| F6 Wrap-up + tag `v031-zapsign-launch` | 🟡 pendente | 🟡 |

---

## 💰 Números do painel CEO (preservados pixel-perfect)

| Métrica | Valor | Origem |
|--------:|------:|:-------|
| Receitas PARMAVAULT cadastradas | **8.725** | empírico, `parmavault_receitas` |
| Valor estimado total das receitas | **R$ 9.255.540,00** | empírico, soma `valor_formula_estimado` |
| **Comissão potencial (TEÓRICA)** | **R$ 2.735.336,10** | empírico, soma `comissao_estimada` |
| Comissão paga até agora | **R$ 0,00** | empírico — **0 farmácias assinaram PARQ ainda** |
| PARQ acordos assinados | 0 | `parq_acordos` count |
| Triggers Wave 9 (027/030) intactos | 3/3 | `pg_trigger` |
| Tabelas Wave 10 criadas | 2/2 | `assinatura_solicitacoes`, `auditoria_assinaturas` |

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

## 📜 O que mudou na rodada de hoje (F3.C)

1. **Caminho 1 MVP minimal aprovado pelo Caio** — orçamento = receita
   PARMAVAULT roteada, sem PDF custom, sem migration nova, reusa
   template `ORCAMENTO_FORMAL_V1` (id=4) já cadastrado.
2. **Code review architect retornou FAIL** com 3 críticos:
   1. Idempotência fraca (UPDATE pós-INSERT) → janela de race
   2. Risco fallback Clicksign sem capability ICP qualificada farmácia
   3. Sem chave estável pra F4 webhook reconciliar
3. **3 críticos corrigidos** com extensão retro-compatível de
   `EnviarParams` (`externalId?` + `metadataExtra?`) — F3.A/F3.B
   intactos, smoke verde.

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
