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
