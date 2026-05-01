# ❓ Decisões Pendentes — Aguardando Dr. Claude orquestrar

> **Reescrito a cada rodada**. Quando uma pendência vira tomada, ela
> migra pra `01_DECISOES_TOMADAS_WAVE10_F3C.md` (append-only).

---

## 🚦 Decisão MASTER pendente: o que fazer a seguir?

O Caio escolheu **opção C** ("pausar e revisar com Dr. Claude o
microscópio Wave 10") na rodada anterior. Antes de decidir o próximo
passo concreto, Dr. Claude precisa pesar 3 caminhos não-mutuamente
exclusivos:

### Caminho A — F4 webhook completo (2-3h work, alto valor)
Implementa o handler ZapSign completo pra eventos `doc_signed`,
`doc_refused`, `doc_removed`, com manifesto SHA-256 + IP + geo +
auth_method gravado em `auditoria_assinaturas`.

- **Prós 💰**: destrava de fato a defensibilidade jurídica → habilita o
  primeiro PARQ assinado virar receita real → primeira gota dos R$ 2,73M
- **Prós 🩺**: completa o triângulo CFM/CC/LGPD/STJ
- **Contras 🛡️**: ainda não foi validado sandbox real chega no WhatsApp do
  CPF teste (Caminho B faz isso primeiro)
- **Estimativa**: 2-3h Dr. Replit + 30min smoke

### Caminho B — Validar F3.C com sandbox real ZapSign (30min, baixo risco)
Disparar 1 orçamento de receita teste pra teu WhatsApp e ver chegar
ANTES de seguir pra F4.

- **Prós 🩺**: dopamina visual ("o link chegou no meu Zap, eu vi"),
  reduz risco de F4 ser construído sobre F3.C com bug oculto
- **Prós 🛡️**: valida toda a cadeia adapter+HMAC+template em produção
  sandbox antes de adicionar mais complexidade
- **Contras 💰**: +30min de "delay" pro caixa
- **Estimativa**: 30min total (escolher 1 receita teste, disparar,
  aguardar Zap)

### Caminho C — Refatorar F3.A/F3.B pra usar mesmo padrão `externalId`+`metadataExtra` (1h)
F3.A/F3.B funcionam, mas usam o `externalId` auto-gerado padrão
(`${templateCodigo}-${pacienteId}-${Date.now()}`). Pra **consistência
arquitetural** e pra simplificar F4 webhook, vale alinhar os 3
use-cases pra usarem o mesmo padrão determinístico:
- PARQ:    `parq-${parqAcordoId}-${ts}`
- TCLE:    `tcle-${pacienteId}-${prescricaoId}-${ts}`
- Orçamento: `orc-${receitaId}-${ts}`  (já feito)

- **Prós 📈**: F4 webhook fica mais simples (1 regex genérica em vez
  de N estratégias por família)
- **Contras 💰**: 1h "perdida" sem destravar caixa novo
- **Risco 🛡️**: mexer em F3.A/F3.B já estável tem risco de regressão.
  Se for fazer, **fazer agora** (antes de F4) é menos arriscado do que
  fazer depois.

---

## 🎯 Recomendação operacional do Dr. Replit (pra Dr. Claude pesar)

**Ordem sugerida**: B → C → A
1. **B primeiro (30min)** — dopamina + validação de cadeia. Se quebrar,
   melhor descobrir agora antes de F4.
2. **C em seguida (1h)** — alinhamento arquitetural enquanto a
   memória da estrutura `EnviarParams` está fresca.
3. **A por último (2-3h)** — F4 webhook fica mais limpo com B+C feitos.

**Total**: ~4h para fechar Wave 10 inteira (F4 + smoke + tag v031).

Mas **Dr. Claude pode discordar** — talvez o pull seja maior pra fazer
A direto e B+C como follow-up Wave 10.5. Decisão estratégica.

---

## 🔬 Decisões secundárias (não bloqueiam Wave 10, mas vale Dr. Claude opinar)

### Wave 11 Decisão E (paradigma de prazo limite)
- **α**: prazo absoluto (90d a partir do disparo)
- **β**: prazo relativo (45d após assinatura do paciente)
- **γ**: prazo dinâmico (faixa 30-90d conforme `comissao_estimada`,
  receitas de maior valor têm prazo maior pra evitar pressão)
- **Recomendação Dr. Replit**: γ (dinâmico) — alinha incentivo
  comercial com risco operacional. Mas **investidor 🛡️** pode
  preferir α (simplicidade auditável).

### Wave 11 Decisão A (status farmácia)
- Farmácia hoje tem só `ativo: boolean`. Faz sentido evoluir pra
  enum `status: 'ATIVA' | 'SUSPENSA_TEMP' | 'INATIVA' | 'BLACKLIST'`?
- **Risco 🛡️**: BLACKLIST exige processo legal documentado pra não
  virar discriminação injustificada (CDC + LGPD).

### Wave 11 Decisão C (PARQ LABOR)
- Família contratual pra colaboradores PJ da clínica (médicos
  associados). Diferente de PARQ FARMA (que é pra farmácias).
- **Status**: backlog Wave 12, mas **médico 🩺** pediu pra antecipar
  pra Wave 11 porque a primeira contratação PJ está marcada pra
  junho/2026.

---

## 🧹 Sujeiras Wave 9 herdadas (não bloqueiam Wave 10)

| # | Sujeira | Severidade | Plano |
|---|---------|------------|-------|
| ⚠️1 | Esperado 4 views, real 2 (`v_parq_acordos_vigentes`, `v_parq_validacao_simplificada_alert`) — faltam 2 | baixa | Limpeza v1.1 |
| ⚠️2 | F4 PARQ frontend tem 3 telas, esperado 4 (faltam `wizard-emissao` e `historico-timeline`) | média | Limpeza v1.1 ou Wave 10 F5 |
| ⚠️3 | Tag `v030-parq-launch` não encontrada local — verificar se foi criada no remote | baixa | Verificar `git ls-remote --tags origin` |

---

## 📨 Pra Dr. Claude responder, idealmente:

1. **Endorso ou contraproposta da ordem B→C→A?**
2. **Wave 11 Decisão E**: α, β ou γ?
3. **Wave 11 Decisão A**: vale o esforço de migrar pra enum agora ou
   esperar dor real?
4. **Wave 11 Decisão C (PARQ LABOR)**: antecipar pra Wave 11 ou manter
   Wave 12?

Quando Dr. Claude responder, atualizamos `01_DECISOES_TOMADAS_*.md` e
re-orientamos o Dr. Replit.
