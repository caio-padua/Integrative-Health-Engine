# ❓ Decisões Pendentes — Aguardando Dr. Claude orquestrar

> **Reescrito a cada rodada**. Quando uma pendência vira tomada, ela
> migra pra `01_DECISOES_TOMADAS_WAVE10_F3C.md` (append-only).

> **Atualizado em**: 2026-05-14 (tarde) — pós parecer Dr. Claude D11
> 5/5 + Q1 já executado (renumeração 11 migrations).
>
> **Estado**: 🟢 sistema **JÁ EM PRODUÇÃO** em
> `https://webhooks.pawards.com.br`. Dr. Claude bateu martelo: ordem
> oficial = **F2 RBAC middleware AGORA** (PRIORIDADE MÁXIMA, 1-2 dias)
> → mapa v1.2 → tag `v031-zapsign-rbac-launch` (renomeada).

---

## 🟢 Nada bloqueando o Dr. Replit no momento

Hoje 2026-05-14 → operação iniciada + tsunami #242-#262 mergeado em
paralelo ao deploy. Detalhes completos em D10 do
[`01_DECISOES_TOMADAS_WAVE10_F3C.md`](./01_DECISOES_TOMADAS_WAVE10_F3C.md).

Ações já executadas nesta rodada:
- ✅ `suggestDeploy()` disparado pra propagar migrations 030-059
- ✅ Olhinho Eye/EyeOff no campo senha do login
- ✅ Reset de TODAS as 55 senhas DEV pra `4000`
- ✅ Wave V46 WhatsApp CEO (cadastro de telefone em `/plataforma/perfil`)
- ✅ Wave V232 retenção automática de `painel_pawards_auditoria` (12 meses)
- ✅ 13 tasks (#249/#250/#251/#252/#253/#255/#256/#257/#258/#259/#260/#261/#262) MERGED

---

## 🚀 Fase atual — OPERAR + LAPIDAR em paralelo

### Operar (Caio)
1. **Logar em produção** com `ceo@pawards.com.br` / `4000` (todas as
   senhas DEV resetadas; em PROD seguir mesma rotina se necessário).
2. **Cadastrar próprio celular** em `/plataforma/perfil` pra ativar canal
   WhatsApp do CEO (Wave V46) — sem isso, só recebe e-mail.
3. **Emitir as primeiras receitas reais** pelo sistema (até agora os
   "8.728 / R$ 2.736.536,10" são **PROJEÇÃO** de potencial migrado de
   planilhas históricas, NÃO receita real — regra de ferro).
4. **Primeira assinatura real em PROD** vai validar:
   - WhatsApp CEO chega (canal Twilio/Gupshup)
   - PDF cofre upload OK (cofre `assinaturas-pawards`)
   - Auditoria SHA-256 grava
   - Painel CEO mostra `assinatura_solicitacoes` + `auditoria_assinaturas` reais

### Lapidar (Dr. Replit + task agents em background)
- Fila #374-#418 atualmente blocked por `CONCURRENCY_LIMIT`. Vão
  drenando conforme limites abrem. Inclui:
  - #401/#402/#403 — fechar o loop visual do digest matinal de recusas (#250)
  - #404 — UI de preferências de silêncio CEO
  - #407 — incluir detalhes de envio no CSV de auditoria
  - #408/#409/#410/#411 — fechar loop CSV/visualizado/teste WhatsApp do
    aviso de carência LGPD
  - #412/#413/#414 — fechar loop do alerta de webhook quebrado (#256)
  - #415/#416/#417/#418 — fechar loop visual da integridade LGPD (#261)
    e do gráfico de tendência (#262)

---

## ❓ Perguntas abertas pro Dr. Claude orquestrar

### Q1 — Renumerar migrations 059 duplicadas?
Wave V232, Task #250, Task #252 e Task #257 coincidiram no número 059.
Todas são aditivas `IF NOT EXISTS` (DB não quebra), mas o histórico de
migrations fica ambíguo. Dr. Claude endossa renumerar pra
`060_*`/`061_*`/`062_*` numa task de housekeeping?

### Q2 — Wave 13 F2 (middleware enforcement) destrava agora?
Wave 13 F1 entregou (Migration 044 RBAC + Caio promovido a
`platform_owner` + 2FA TOTP foundation). F2/F3/F4 estão 🟡 PENDENTE.
Detalhes em [`06_WAVE13_F1_FOUNDATION_RBAC_2FA.md`](./06_WAVE13_F1_FOUNDATION_RBAC_2FA.md).
Com sistema operando em PROD, **F2 (middleware enforcement) virou
prioridade alta** — sem ele, qualquer `tenant_admin` pode disparar
contrato em nome da plataforma toda. Dr. Claude endossa subir F2 pro
topo da fila?

### Q3 — Decisão estratégica ZapSign Enterprise vs Clicksign?
Dívida técnica D9.3: painel ZapSign sandbox não tem campo de secret pro
webhook custom header. Em PROD definitiva precisa decisão: (a) migrar
pra ZapSign Enterprise (campo de secret), (b) trocar pra Clicksign
(campo de secret nativo), (c) IP whitelist + idempotência forte. Dr.
Claude tem preferência baseada em custo / cobertura ICP-Brasil?

### Q4 — Mapa neuronal v1.2?
Tsunami pós-F5 (#34-#69) + tsunami #242-#262 antecipou conteúdo
planejado pra Wave 11 (Comunicação) e Wave 11.5 (Segurança IDOR). Vale
consolidar essas waves no mapa neuronal v1.2 ou manter histórico fiel
ao planejamento original?

### Q5 — F6 wrap-up + tag `v031-zapsign-launch`
Wave 10 está pronta pra produção (já está em PROD). Falta só a tag
oficial `v031-zapsign-launch` + code_review final consolidado. Dr.
Claude endossa abrir essa task agora ou esperar Wave 13 F2 fechar?

---

## 🚧 Bloqueios operacionais (tarefas Caio)

### Bloq #1 — Cadastrar celular no /plataforma/perfil
Pra destravar WhatsApp do CEO (Wave V46). Sem isso, só e-mail.

### Bloq #2 — (Opcional) emitir 1ª receita real em PROD
Pra trocar "potencial estimado" por "caixa real" e validar fluxo
ponta-a-ponta em produção.

---

## 🧹 Sujeiras herdadas + dívidas técnicas D10 ativas

| # | Sujeira | Severidade | Plano |
|---|---------|------------|-------|
| ⚠️D10.1 | 4 migrations coincidiram no número 059 | baixa (DB ok via IF NOT EXISTS) | Housekeeping renumerar pra 060/061/062 |
| ⚠️D10.2 | Tasks #347/#348 PENDING órfãs (deploy/smoke prod) | nula | Caio pode ignorar — Publish faz diff sozinho |
| ⚠️D10.3 | Digest #250 sem tela de auditoria | média | #401/#402/#403 já propostas |
| 🚨D9.1 | ZapSign painel sem campo de secret/header | alta | Q3 acima — decisão estratégica |
| ⚠️D9.2 | `farmaciaAuthMode: "avancada"` no script teste | baixa | Wave 10.5 ou Wave 11 |
| ⚠️D9.3 | Auditoria por envelope, não por signatário | média | Wave 10.5 ou Wave 11 |

---

## 📋 Snapshot estado atual (2026-05-14)

```
SISTEMA EM PRODUÇÃO              : https://webhooks.pawards.com.br (autoscale)
parmavault_receitas total        : 8.728 (PROJEÇÃO migrada — NÃO caixa real)
comissão potencial total         : R$ 2.736.536,10 (PROJEÇÃO — NÃO caixa real)
comissão paga até agora          : R$ 0,00
assinatura_solicitacoes          : 9 linhas (8 dev + 1 teste real noite 11→12 mai)
auditoria_assinaturas            : 1 linha (primeira real 12/mai/2026)
triggers Wave 9 ativos           : 5/5
pacientes Pádua (unidade=15)     : 4.278 (Wave Cadastro Pádua, 13/mai/2026)
posologia_estruturada coverage   : 259/259 (100% interpretado, 0% fallback)
login CEO                        : ceo@pawards.com.br / 4000
WhatsApp CEO                     : depende de cadastro de telefone (Wave V46)
retenção auditoria painel        : 12 meses (Wave V232, worker 24h)
tasks na fila (blocked CONCY)    : #374-#418
```

---

## ⚠️ REGRA DE OURO REFORÇADA

**NUNCA citar "8.728 receitas" ou "R$ 2.736.536,10" como receita real
ou meta atingida.** São **PROJEÇÃO de potencial** calculada das fichas
históricas migradas. Caio NÃO emitiu nenhuma receita real pelo sistema
ainda. Sempre referenciar como "potencial estimado a partir de fichas
históricas". Os triggers do banco continuam invariantes técnicas
válidas (não devem ser dropados).
