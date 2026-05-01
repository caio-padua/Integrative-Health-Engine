# ❓ Decisões Pendentes — Aguardando Dr. Claude orquestrar

> **Reescrito a cada rodada**. Quando uma pendência vira tomada, ela
> migra pra `01_DECISOES_TOMADAS_WAVE10_F3C.md` (append-only).

> **Atualizado em**: 2026-05-01 — pós-rodada Dr. Claude pausa+revisar
>
> **Estado**: 🟢 **TODAS as 4 decisões anteriores foram TOMADAS**
> (D1 ordem B→C→A · D2 prazo α 90d · D3 enum 3-valor sem BLACKLIST ·
> D4 PARQ LABOR fica Wave 12). Migradas pro `01_*` com lentes 4 personas.
>
> Mapa Neuronal v1.1 validado (7 sujeiras aceitas).

---

## 🟢 Nada bloqueando Dr. Replit no momento

A próxima rodada de pendências vai aparecer **APÓS Fase B verde**
(sandbox real ZapSign disparou e chegou no WhatsApp do Caio):

- Validação de que o link de assinatura abriu corretamente no celular
- Confirmação visual do template `ORCAMENTO_FORMAL_V1` (id=4)
- Decisão sobre eventual ajuste de copy do WhatsApp template HSM
- Se quebrar: triagem do que rever (adapter HMAC? template?
  signatariosExtras? receita teste mal-formada?)

E depois, **APÓS Fase C verde** (alinhamento `externalId` em F3.A/F3.B):
- Confirmar regex genérica F4: `/^(parq|tcle|orc)-(\d+)(-\d+)?-\d+$/`
- Validar que F3.A (PARQ) e F3.B (TCLE) não regrediram

E enfim, **APÓS Fase A (F4 webhook) verde**:
- Decisão sobre qual evento ZapSign aciona qual mudança de status
  na tabela `assinatura_solicitacoes`
- Estratégia de retry pra eventos que chegarem fora de ordem
- Se manifesto SHA-256 deve incluir IP geolocalizado ou só IP cru

---

## 🚧 Bloqueios operacionais (não-decisões — são tarefas Caio)

### Bloq #1 — Sincronizar GitHub novamente
- Doc novo `docs/dr-claude/03_ARQUITETURA_GERAL_DO_CODIGO.md` retornou
  **404** quando Dr. Claude consultou (foi criado depois do último Sync)
- **Ação Caio**: aba ⎇ Git → Sync
- **Por quê importa**: Dr. Claude validar a §3 (mapa autônomos vs
  dependentes) e a §4 (raws por domínio) antes da próxima rodada

### Bloq #2 — Fornecer WhatsApp + CPF de teste pra Fase B
- Dr. Replit precisa de:
  - 1 número WhatsApp ativo (preferencialmente do próprio Caio)
  - 1 CPF de paciente teste já cadastrado no banco (ou Caio sinaliza
    qual usar)
  - Confirmação de qual receita PARMAVAULT usar pra disparo (ID
    específico, ou Dr. Replit escolhe a 1ª disponível com
    `valor_formula_estimado` preenchido)

### Bloq #3 — OK PADCON Princípio 9 pra começar B
- Validação explícita: "pode disparar Fase B" (visual ou design? não,
  é fluxo backend — mas mesmo assim Princípio 9 pede validação Caio)

---

## 🧹 Sujeiras Wave 9 herdadas (carregadas pra Wave 10.5/11)

| # | Sujeira | Severidade | Plano |
|---|---------|------------|-------|
| ⚠️1 | Esperado 4 views, real 2 | baixa | Limpeza Wave 10.5 |
| ⚠️2 | F4 PARQ frontend tem 3 telas (esperado 4) | média | Wave 10 F5 ou 10.5 |
| ⚠️3 | Tag `v030-parq-launch` não confirmada no remote | baixa | `git ls-remote --tags origin` |
| ⚠️4 | `farmacias_parmavault` sem campos `representante_*` (env fallback) | média | Wave 10.5 ou 11 |

---

## 📨 Pra Dr. Claude responder na próxima rodada (após F4 verde)

(Vazio agora — só vai aparecer quando F4 estiver verde.)
