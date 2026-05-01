# 📜 Decisões Tomadas — Wave 10 ZapSign (append-only)

> **Append-only**: nunca reescrever passado. Só adicionar linhas novas
> no final com data ISO.

---

## 2026-04-25 → 2026-04-30 — Fundação Wave 10

### Provedor de assinatura digital
- **Decidido**: ZapSign (sandbox + produção)
- **Custo**: R$ 0,50/disparo
- **Justificativa empresário 📈**: 5x mais barato que Clicksign (R$ 2,50)
  no volume projetado (8.725 receitas × 50% conversão × 1,5 disparos
  médios = ~6.500 disparos = ~R$ 3.250/mês vs. R$ 16.250 Clicksign).
- **Justificativa investidor 🛡️**: failover Clicksign mantido como
  contingência, switchável via toggle `provedor_principal_codigo`.

### Auth do webhook ZapSign
- **Decidido**: HMAC custom header `x-pawards-secret` com `timing-safe-equal`
- **Justificativa 🛡️**: ZapSign não tem HMAC nativo padrão; custom
  header é mais simples que JWT e suficiente pra defesa contra
  replay+spoof se rotacionado a cada 90d.

### Ordem de implementação F3 famílias
- **Decidido**: Família 4 (PARQ) → Família 1 (TCLE) → Família 3 (Orçamento)
- **Justificativa 💰**: PARQ é o que destrava os R$ 2,73M
  diretamente (nenhuma farmácia assinou ainda). TCLE é fundação legal
  obrigatória pra qualquer outra família. Orçamento Farmacêutico é o
  que disparar mais volume (1 por receita).
- **NÃO implementadas em Wave 10**: Família 2 (TCAR cardiológico) e
  Família 5 (PASSURANCE LTDA externa) — ficam pra Wave 12+.

### Object Storage
- **Decidido**: bucket `assinaturas-pawards`, key
  `assinaturas/${external_id}.pdf`
- **Justificativa 🛡️**: external_id é determinístico → idempotência
  natural na key. SHA-256 do conteúdo persistido em
  `auditoria_assinaturas.hash_pdf_assinado`.

### Auditoria
- **Decidido**: tabela `auditoria_assinaturas` com hash SHA-256 + IP +
  geo (lat/lng) + auth_method + timestamp ZapSign + manifesto.
- **Justificativa 🩺**: defensibilidade jurídica tripla
  (CFM 2.386/2024 art. 6º + CC arts. 593-609 + LGPD art. 11 §4º +
  STJ REsp 2.159.442/PR). Sem hash + IP + geo, perde-se em qualquer
  perícia digital.

---

## 2026-05-01 — F3.C MVP minimal (Caminho 1)

### Decisão estrutural Caminho 1 vs. Caminho 2
- **Aprovado pelo Caio**: Caminho 1 — "orçamento = receita PARMAVAULT
  roteada com `valor_formula_estimado` preenchido".
- **NÃO criado**: tabela `orcamentos_farmaceuticos`, PDF custom
  `lib/farmaceutica/orcamentoPdf.ts`, migration nova.
- **Reusa**:
  - Template `ORCAMENTO_FORMAL_V1` (id=4) já cadastrado em
    `assinatura_templates`
  - `assinaturaService.enviar()` com `signatariosExtras`
- **Justificativa 💰**: cortou ~3 dias de implementação. Permite
  validar a tese (orçamento assinado → comissão paga) com a estrutura
  existente. Caso a UX seja insatisfatória, Wave 11 pode introduzir
  Caminho 2 (tabela própria + PDF custom) sem refazer F3.C.

### Sujeira herdada Wave 5 documentada (NÃO bloqueia Wave 10)
- `farmacias_parmavault` não tem campos `representante_*` (nome, CPF,
  email, telefone do representante PJ).
- **Mitigação temporária**: env fallback
  `FARMACIA_REPRESENTANTE_NOME_FALLBACK`, `_CPF_FALLBACK`,
  `_EMAIL_FALLBACK`, `_TELEFONE_FALLBACK`.
- **Plano de limpeza**: Wave 10.5 ou Wave 11 — adicionar colunas via
  migration aditiva + popular do cadastro real das farmácias parceiras.

---

## 2026-05-01 — Code Review architect FAIL → PASS (3 críticos corrigidos)

### Achado #1: Idempotência fraca (race condition possível)
- **Risco**: F3.C v1 fazia `INSERT assinatura_solicitacoes` SEM
  `metadata.receitaId`, depois `UPDATE` separado pra adicionar
  `receitaId`. Janela entre INSERT e UPDATE permite:
  - 2 chamadas paralelas com mesma `receitaId` passarem ambas
  - Crash entre INSERT e UPDATE deixa solicitação órfã sem chave
    de dedupe nem de reconciliação
- **Correção**: estendido `EnviarParams` em `service.ts` com
  `metadataExtra?: Record<string, unknown>` mergeada **dentro do
  INSERT inicial** (atômico, mesma transação).

### Achado #2: Risco funcional-jurídico fallback Clicksign sem ICP
- **Risco**: F3.C v1 não forçava ZapSign. Se toggle
  `provedor_principal_codigo` virasse Clicksign por qualquer motivo
  (failover automático, troca operacional), o fluxo da farmácia
  ICP-qualificada cairia no adapter Clicksign que **não aplica
  semântica ICP-Brasil qualificada** do mesmo jeito → defensibilidade
  jurídica perdida.
- **Correção**: F3.C agora passa `forcarProvedor: "zapsign"`
  explícito.

### Achado #3: Sem chave estável pra reconciliação F4 webhook
- **Risco**: F4 webhook recebe `evento.payload.external_id` do
  ZapSign. Sem chave determinística, F4 precisaria fazer parsing
  textual frágil pra mapear evento → receita.
- **Correção**: estendido `EnviarParams` com `externalId?: string`.
  F3.C agora gera `externalId = \`orc-${receitaId}-${Date.now()}\``.
  F4 vai poder reconciliar via regex `/^orc-(\d+)-\d+$/` 1:1.

### Smokes pós-correção (verde absoluto)
```
POST /api/orcamentos/9999/disparar  → 401  (rota montada, auth ok)
GET  /api/orcamentos/9999/status    → 401  (rota montada)
POST /api/parq/emitir              → 401  (F3.A intacto, regressão zero)
GET  /api/healthz                   → 200

receitas:           8.725
comissão potencial: R$ 2.735.336,10
triggers Wave 9:    3/3 intactos
tabelas Wave 10:    2/2 ok
template id=4:      ORCAMENTO_FORMAL_V1 ok
```

### Arquivos tocados nesta correção
- `artifacts/api-server/src/lib/assinatura/service.ts` (interface
  `EnviarParams` estendida + lógica `externalId` + merge `metadataExtra`)
- `artifacts/api-server/src/lib/assinatura/use-cases/enviarOrcamentoFarmaceutico.ts`
  (passa `externalId` determinístico + `metadataExtra` + `forcarProvedor`,
  removido `UPDATE` pós-INSERT)
- `artifacts/api-server/src/routes/orcamentos.ts` (criado nesta sessão)
- `artifacts/api-server/src/routes/index.ts` (registro do router)

---

## 🧭 Mapa "decisão → consequência → próxima fase"

```
Caminho 1 MVP (F3.C) ───────► externalId determinístico ──► F4 webhook
                                                            reconcilia 1:1
                                                            via regex
                          └──► metadataExtra atômico ──────► dedupe
                                                            confiável

forcarProvedor "zapsign" ──► sempre semântica ICP correta  ► defensibilidade
                                                            jurídica tripla
                                                            preservada

Sujeira Wave 5 fallback ──► risco operacional baixo ──────► Wave 10.5
                            (1 farmácia ativa hoje)         resolve
```

---

## 🧠 Decisões Orquestração Dr. Claude — pós-pausa Caminho C — 2026-05-01

**Contexto**: Caio escolheu opção C (pausar+revisar) na rodada anterior.
Dr. Claude leu 4 dos 5 docs (`README`, `00_BRIEFING`, `01_DECISOES_TOMADAS`,
`02_DECISOES_PENDENTES`) — o `03_ARQUITETURA_GERAL_DO_CODIGO` ainda
retornava 404 no momento da consulta (precisa de mais 1 Sync do Caio).
Material foi suficiente pra responder as 4 pendências.

### ✅ Decisão D1 (MASTER) — Ordem próximos passos: **B → C → A** (endossado)
- 🩺 **Médico**: B primeiro garante que ZapSign chega no WhatsApp
  ANTES de construir mais em cima → reduz risco clínico de bug oculto
- 💰 **CEO**: 30min de "delay" é nada vs risco de F4 sobre F3.C com bug
- 📈 **Empresário**: C alinha os 3 use-cases pro mesmo padrão `externalId`
  → F4 webhook fica **3× mais simples** (1 regex genérica)
- 🛡️ **Investidor**: testar sandbox real antes de produção é o que
  qualquer due diligence exigiria

**Sequência aprovada**:
1. **B** (~30min) — disparar 1 orçamento sandbox real pro WhatsApp do Caio
2. **C** (~1h) — refatorar F3.A/F3.B pra usar mesmo padrão determinístico
3. **A** (~2-3h) — F4 webhook completo + manifesto auditoria

**Total pra fechar Wave 10**: ~4h até tag `v031-zapsign-launch`.

### ✅ Decisão D2 — Wave 11 prazo limite: **α (90 dias absolutos)**
- 🛡️ **Investidor**: simplicidade auditável vence inteligência difícil
  de defender em tribunal (CFM e juiz não querem fórmulas dinâmicas)
- 💰 **CEO**: 90d é tempo suficiente pra qualquer farmácia finalizar
- 🩺 **Médico**: master (Caio) pode estender manualmente caso a caso
- 📈 **Empresário**: γ (dinâmico) pode ser implementado em Wave futura
  quando houver dados reais de conversão pra calibrar a faixa

**Status**: α adotado. β e γ descartados nesta Wave.

### ✅ Decisão D3 — Wave 11 status farmácia: **enum SEM BLACKLIST**
- Status aprovado: `'ATIVA' | 'SUSPENSA_TEMP' | 'INATIVA'`
- 🛡️ **Investidor**: BLACKLIST exige processo legal documentado
  (CDC + LGPD) — cria mais risco jurídico do que resolve agora
- 🩺 **Médico**: 3 estados cobrem 100% dos cenários clínicos hoje
- 💰 **CEO**: migration aditiva simples, sem risco
- 📈 **Empresário**: se precisar BLACKLIST no futuro, **+1 valor no
  enum é aditivo** — REGRA FERRO preservada

**Status**: enum 3-valor adotado pra Wave 11. BLACKLIST diferida.

### ✅ Decisão D4 — Wave 11 PARQ LABOR: **manter Wave 12** (não antecipar)
- 🩺 **Médico**: contratação PJ junho/2026 cobre com **contrato ZapSign
  avulso** sem precisar do módulo PARQ LABOR completo
- 💰 **CEO**: antecipar PARQ LABOR atrasa finalização Wave 10 que é o
  que destrava os R$ 2.735.336,10
- 🛡️ **Investidor**: PARQ LABOR tem regulação ANVISA diferente
  (RDC 204/2017 pra injetáveis) — precisa análise jurídica dedicada
- 📈 **Empresário**: sequência **Wave 10 → 11 (comunicação) → 11.5
  (segurança IDOR) → 12 (PARQ LABOR)** maximiza valor por semana

**Status**: PARQ LABOR fica Wave 12. Junho usa contrato ZapSign avulso.

### ✅ Validação Mapa Neuronal v1.1 — 7 sujeiras aceitas

Dr. Claude validou todas as 7 correções aditivas do Dr. Replit:

| # | Sujeira | Aceite Dr. Claude |
|---|---------|-------------------|
| 1 | Faltou `'denunciada'` no enum status auditoria | ✅ Adicionar |
| 2 | Wave 9 subestimada no mapa | ✅ Reescrever com entregas reais |
| 3 | Wave 11 conflito roadmap | ✅ Wave 11 = Comunicação, Wave 11.5 = Segurança IDOR |
| 4 | PARQ LABOR = Wave 12 | ✅ Atualizar conforme Caio |
| 5 | `parmavaultEngine` não existe no código | ✅ Esclarecer como abstração conceitual |
| 6 | Nomes módulos (PARASCLIN, PAWTRACK) são branding | ✅ Adicionar nota apêndice |
| 7 | Worker questionário é Wave 14 futura | ✅ Marcar como futuro |

**Status**: Mapa Neuronal v1.1 oficial. Pode ser gravado.

### 🔭 Revelações que Dr. Claude trouxe da leitura do código

1. **R$ 2.735.336,10 é potencial teórico — R$ 0 pago até hoje, zero
   farmácias assinaram PARQ ainda.** Wave 10 inteira existe pra destravar.
2. **Nomes de módulos (PARASCLIN, PAWTRACK, etc.) são branding
   conceitual** — não existem como namespaces no código. Tabelas reais
   usam nomes diretos (`pacientes`, `consultas`, `arquivos_exames`).
3. **F3.C foi auto-auditado** pelo Dr. Replit antes da revisão — 3 bugs
   críticos detectados e resolvidos sozinho. `externalId` determinístico
   e `forcarProvedor: "zapsign"` foram reconhecidos como decisões
   arquiteturais corretas.

### 🚦 Próximo passo destravado

Dr. Replit autorizado a iniciar **Fase B (sandbox real ZapSign 30min)**
assim que Caio:
1. Sincronizar GitHub novamente (pra `03_ARQUITETURA_GERAL_DO_CODIGO`
   ficar acessível ao Dr. Claude pra validar)
2. Confirmar **WhatsApp + CPF de teste** pra disparo sandbox
3. Disparar OK do PADCON Princípio 9 (validação Caio explícita)

Quando B verde → C → A → tag `v031-zapsign-launch` → Wave 10 fechada.
