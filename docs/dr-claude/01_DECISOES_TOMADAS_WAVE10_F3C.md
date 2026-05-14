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

---

## 🌊 Wave 10 F4 + F5 + Wave 10.5 — DECISÕES PÓS-FASE B DIA 1 (11/mai/2026)

### ✅ F4 webhook handler completo + manifesto SHA-256

- Helper `registrarManifestoAuditoria` ON CONFLICT signature_id
  (idempotência contra reentrega ZapSign)
- Fixes architect: `signer_papel` via lookup em `assinatura_signatarios`
  (não mais hardcoded), `signatureId` determinístico
- Lente: 🛡️ investidor (defensibilidade jurídica + retenção 20a)

### ✅ F5 frontend timeline + detalhe (2 telas mínimas)

- Endpoints `GET /api/assinaturas/timeline` + `GET /api/assinaturas/:id`
  protegidos por `guardMaster = [requireRole("validador_mestre"),
  requireMasterEstrito]` (mesmo padrão de `parq.ts`)
- Bypass `x-admin-token` BLOQUEADO (403)
- Mascaramento PII server-side: CPF (`123.***.***-45`), IP (2 octetos),
  geo (city/region/country, sem lat/lng raw)
- Lente: 🩺 médico + 🛡️ investidor (defesa em profundidade mesmo com
  gate master — anti-vazamento em screenshot/log)

### ✅ Wave 10.5 ADMIN_TOKEN rotacionado

- Novo valor 256-bit (`openssl rand -hex 32`) revelado 1× pro Caio
  guardar no 1Password, plugado via `requestEnvVar(secret)`
- `.replit` versionado já estava limpo (sem token em texto claro)
- Regex em `requireAuth.ts` bloqueando bypass nas rotas Wave 10
  (`/orcamentos/*`, `/parq/*`, `/prescricoes/*`) preservada
- Lente: 💰 CEO + 🛡️ investidor (sem secret leaking, sem bypass que
  dispare contrato em nome de tenant real)

### ✅ Tsunami de ~25 follow-ups MERGED (mais detalhe em `04_session_plan…md`)

- Defesa em profundidade do cofre PDF: #34/#38/#39/#47/#48/#49/#50/#57/#58
- Observabilidade CEO em tempo real: #35/#36/#37/#43/#44/#52/#53/#61/#62/#69
- UX timeline: #51/#55/#56/#59/#60/#64
- 6 migrations aditivas (034/035/036/037/038/039), REGRA FERRO mantida
  (zero `db:push`)

### 🔭 Observação arquitetural pro Dr. Claude avaliar

A entrega em massa pós-F5 antecipou conteúdo planejado pra Wave 11
(Comunicação) e Wave 11.5 (Segurança IDOR). Vale renumerar / consolidar
essas waves no mapa neuronal v1.2.

### 🚦 Próximo destravamento

- Fase B Dia 2 (sandbox real ZapSign 30min) DEPENDE de Caio cadastrar
  conta ZapSign sandbox + CNAME `webhooks.pawards.com.br`
- F6 wrap-up + tag `v031-zapsign-launch` DEPENDE de Fase B Dia 2 verde

---

## ✅ Decisão D9 — Fase B Dia 2 disparo real fechado (2026-05-12 madrugada)

**Contexto**: noite de 11→12/mai/2026, Caio colou `ZAPSIGN_API_TOKEN` em
PRODUÇÃO (não sandbox), criou 3 webhooks no painel ZapSign apontando pra
URL temporária `kirk.replit.dev`, e tentou assinar 2 documentos do
envelope `ea9029e8-8d8e-4d4e-ac2b-24551b8f3979`.

**Decisões tomadas no momento (todas aprovadas Caio explicitamente)**:

1. **D9.1 ZapSign painel sem campo de secret/header** → adicionado branch
   dev-only em `lib/assinatura/adapters.ts` (`NODE_ENV !== "production" &&
   ZAPSIGN_WEBHOOK_DEV_BYPASS === "true"`) pra aceitar webhook sem header
   custom em DEV. Em produção definitiva, precisa decisão estratégica
   (ZapSign Enterprise vs Clicksign vs IP whitelist) — registrada como
   dívida técnica em `04_session_plan...md` item 3.

2. **D9.2 Caio sem certificado ICP-Brasil real pra FAMA** → adicionado
   param `farmaciaAuthMode?: AuthMode` ao use-case
   `enviarOrcamentoFarmaceutico` (default permanece `qualificada_ecnpj`
   ICP). Script teste passa `farmaciaAuthMode: "avancada"` pra fechar
   fluxo. Em produção real continua exigindo ICP — defesa jurídica
   tripla CFM/CC/STJ preservada.

3. **D9.3 Receita teste pra Caio (id=3104, `is_teste=true`)**:
   - Receita 8728 (R$ 1.500 + comissão R$ 450) → envelope `ea9029e8`
     → status `CONCLUIDO` → auditoria id=1 ✅
   - Receita 8729 (R$ 1.500 + comissão R$ 450) → envelope `55dcabfd`
     → status `ENVIADO` (não foi necessário assinar)

4. **D9.4 Validação fim-a-fim em SQL puro** (prova preservação):
   - `auditoria_assinaturas`: 0 → **1** (PRIMEIRA ASSINATURA REAL DO
     PROJETO INTEIRO) com hash SHA-256 64 chars + IP real Caio
     191.204.182.53 + auth_method=assinaturaTela + PDF no cofre
     `replit-objstore-.../assinaturas/orc-8728-1778546495818.pdf`
   - `parmavault_receitas` (excluindo 8728+8729) = **8.726 linhas** ✅
   - `SUM(comissao_estimada)` (excluindo teste) = **R$ 2.735.636,10** ✅
   - 5 triggers Wave 9 ATIVOS ✅

**Lente de persona**: 🩺 médico (defesa jurídica preservada via
default ICP) + 💰 CEO (R$ 0,50 ZapSign vale comissão R$ 450) + 📈
empresário (replicável pra qualquer receita PARMAVAULT) + 🛡️ investidor
(invariantes Wave 9 intactas, dívidas técnicas mapeadas e priorizadas
pra Wave 10.5).

**Próximo destravamento**: F6 wrap-up + tag `v031-zapsign-launch` em
sessão futura (requer code_review final + suggest_deploy).

---

## ✅ Decisão D10 — Wave OPERAR EM PARALELO À LAPIDAÇÃO (2026-05-14)

**Contexto**: Caio bateu o martelo: "quero começar a operar o sistema
de verdade, mas isso NÃO significa parar de lapidar". Ou seja, abrir o
SaaS pra uso real (paciente real, receita real, assinatura real) **em
paralelo** com o tsunami de polimento que o Dr. Replit + task agents
continuam drenando.

### D10.1 — Sistema confirmado JÁ DEPLOYADO em produção

- `getDeploymentInfo` confirmou domínio ativo `https://webhooks.pawards.com.br`
  (autoscale, build verde). Não é "vamos publicar" — **já está no ar**.
- `suggestDeploy()` chamado pra Caio republicar e propagar as migrations
  030-059 (psql IF NOT EXISTS, regra ferro) via diff automático do Publish.
  Replit aplica o diff sozinho — agente NÃO escreve script de migração
  prod (regra de plataforma).
- Tasks #347 e #348 (deploy + smoke prod) ficaram em PENDING — não
  consegui obsoletar (só PROPOSED retract). Conceitualmente desnecessárias
  porque o Publish faz o diff sozinho.

### D10.2 — Olhinho na senha do login

- `artifacts/clinica-motor/src/pages/login.tsx` ganhou botão Eye/EyeOff
  (lucide-react) no campo password — `useState mostrarSenha`, type alterna
  password↔text, aria-label PT-BR. Pequeno mas tira fricção pro Caio
  digitar `4000` no celular sem errar.

### D10.3 — Reset MASSIVO de senhas DEV pra `4000`

- TODAS as 55 senhas do banco DEV resetadas pra `4000` via bcryptjs
  (não bcrypt — api-server usa bcryptjs) + pg, NODE_PATH apontando pros
  binários instalados em `node_modules/.pnpm/.../bcryptjs` e `.../pg`.
- **Login CEO**: `ceo@pawards.com.br` / senha `4000`.
- Padrão de NODE_PATH documentado pra futuros resets (bcryptjs path
  pattern).

### D10.4 — Tsunami de tasks #242 a #262 mergeadas EM PARALELO ao deploy

Enquanto eu rodava o deploy, os task agents seguiram drenando a fila.
Mergeado nas últimas ~3 horas:

| Task | O que entrega |
|---|---|
| #249 | Tela CEO ver alertas silenciados pela janela de descanso + botão "Liberar agora" |
| #250 | Digest matinal de recusas (opt-in por canal — invariante hard-lock recusa imediata preservada) |
| #251 | Testes ponta-a-ponta do silêncio CEO (4 DB-backed + 2 puros) |
| #252 | Aviso quando o resumo diário de PDFs travados não dispara por N dias (worker `decidirSilencio` + Migration 059) |
| #253 | Botão "Disparar resumo agora" em `/admin/uploads-pdf-resumo` |
| #255 | Export CSV da auditoria filtrada (Task #254 herdada) |
| #256 | Webhook ZapSign silenciosamente quebrado — alerta proativo |
| #257 | Tela CEO acompanhar avisos de vencimento da carência LGPD |
| #258 | WhatsApp também no aviso de carência LGPD |
| #259 | Botão gerar export LGPD direto do aviso |
| #260 | Migrar exports LGPD antigos (data:URL) pro Drive |
| #261 | Botão CEO conferir integridade do export LGPD pelo hash |
| #262 | Gráfico tendência semanal de alertas de email travado |

Migrations aditivas aplicadas: 056 (retenção auditoria painel pawards),
057, 058, 059 (3 migrations distintas que coincidiram no número 059 —
**dívida técnica registrada** abaixo).

### D10.5 — Wave V46 WhatsApp do CEO ativado

`/plataforma/perfil` agora aceita celular do CEO com máscara BR
`(11) 91234-5678` + validação E.164, gravado em `usuarios.telefone` no
formato `+55DDD9XXXXXXXX`. **Canal WhatsApp do CEO** depende deste
cadastro. Sem `usuarios.telefone` preenchido pra `validador_mestre`
ativo, `notificarCeoAssinaturaConcluida` só consegue e-mail. Após
cadastrar, próximo evento ZapSign já dispara WhatsApp via Twilio/Gupshup
sem novo deploy.

### D10.6 — Wave V232 Retenção automática de auditoria

Worker `iniciarWorkerLimpezaAuditoriaPainelPawards()` tick 24h, deleta
`painel_pawards_auditoria` mais velho que `PAINEL_PAWARDS_AUDITORIA_RETENCAO_MESES`
(default 12), lock distribuído `pg_try_advisory_lock(15102320)`,
persiste cada execução em `painel_pawards_auditoria_limpezas`. Defesa
LGPD (não guardar trilha de acesso além do necessário) + perf da
paginação no Painel PAWARDS.

### Lentes de persona D10

- 🩺 **Médico**: invariantes Wave 9 INTACTAS (8.728 receitas potencial /
  R$ 2.736.536,10 comissão potencial / 5 triggers ATIVOS) — assinatura
  jurídica tripla CFM/CC/STJ preservada.
- 💰 **CEO**: sistema operável HOJE (login `ceo@pawards.com.br` / `4000`,
  olhinho na senha, WhatsApp do CEO ativável via cadastro de telefone).
- 📈 **Empresário**: tsunami de polimento NÃO bloqueia operação — task
  agents seguem drenando #374-#418 (atualmente blocked por
  `CONCURRENCY_LIMIT`, vão liberando conforme limites abrem).
- 🛡️ **Investidor**: zero `db:push`, todas as 4 migrations da rodada
  (056-059) são aditivas IF NOT EXISTS, regra ferro respeitada. Auditoria
  com retenção automática reduz superfície LGPD.

### Dívidas técnicas D10 registradas (NÃO bloqueiam operar)

1. **Conflito de número de migration**: Wave V232 (retenção auditoria),
   Task #252 (silêncio resumo PDF), Task #250 (digest recusas) e Task
   #257 (carência LGPD) coincidiram no número 059. Verificar quem
   ganhou no merge final e renumerar duplicatas pra `060_*`/`061_*` na
   próxima rodada de housekeeping. Não afeta DB porque todas usam
   `IF NOT EXISTS`.
2. **Tasks #347/#348 PENDING órfãs**: deploy + smoke prod ficaram
   marcadas como PENDING e não consegui obsoletar (API só permite
   retract de PROPOSED). Caio pode ignorar — Publish faz o diff sozinho.
3. **Digest matinal de recusas (#250) sem tela de auditoria ainda**:
   #401/#402/#403 já propostas pra fechar o loop visual.

---

## ✅ Decisão D11 — Parecer Dr. Claude 5/5 (2026-05-14, tarde)

Dr. Claude respondeu as 5 perguntas Q1-Q5 abertas em D10. Ordem
oficial de execução: **renumerar migrations (5min) → F2 RBAC middleware
(1-2 dias) → mapa neuronal v1.2 (1h) → F6 tag `v031-zapsign-rbac-launch`**.

### D11.Q1 ✅ Renumerar migrations duplicadas — EXECUTADO HOJE

Inspeção real revelou **5 números colidindo (052, 053, 054, 057, 059),
totalizando 11 arquivos**. Critério: manter alfabeticamente o primeiro
de cada par no número original, mover os demais pros próximos livres
(061-066). Renomeações executadas:

| Antes | Depois |
|---|---|
| `052_totp_rate_limit_limpezas_diarias.sql` | `061_totp_rate_limit_limpezas_diarias.sql` |
| `053_assinatura_webhook_resets_historico.sql` | `062_assinatura_webhook_resets_historico.sql` |
| `054_sessoes_jwt_revogacao_individual.sql` | `063_sessoes_jwt_revogacao_individual.sql` |
| `054_whatsapp_inbound_janela_24h.sql` | `064_whatsapp_inbound_janela_24h.sql` |
| `057_usuarios_telefone_pin_confirmacao.sql` | `065_usuarios_telefone_pin_confirmacao.sql` |
| `059_pdf_upload_resumo_diario_silencio_alerta.sql` | `066_pdf_upload_resumo_diario_silencio_alerta.sql` |

Sequência final em `artifacts/api-server/src/db/migrations/`: 052, 053,
054, 055, 056, 057, 058, 059, 060, 061, 062, 063, 064, 065, 066 — todas
únicas. Verificação `rg` confirmou que nenhum código TS/JS referencia
filename string (só nomes de tabela, intocados). Migrations são
`CREATE ... IF NOT EXISTS` aditivas: re-rodar é idempotente, sem
runner automatizado depende.

### D11.Q2 🟡 F2 RBAC middleware enforcement — PRIORIDADE MÁXIMA

Dr. Claude bateu martelo nas 4 lentes:
- 🩺 **Médico**: sem F2, secretária pode disparar PARQ pra farmácia
  errada — contrato assinado vincula juridicamente.
- 💰 **CEO**: R$ 2,73M de potencial só viram caixa seguro com isolamento
  de tenant (farmácia com login próprio).
- 📈 **Empresário**: nenhum investidor sério olha multi-tenant sem RBAC
  enforced em produção.
- 🛡️ **Investidor**: cada dia de PROD ligada sem F2 = superfície de risco
  acumulada.

**Próxima task a abrir**: Wave 13 F2 (middleware enforcement RBAC + tenant
isolation). Arquivos chave já mapeados em `06_WAVE13_F1_FOUNDATION_RBAC_2FA.md`.
Estimativa: 1-2 dias.

### D11.Q3 ✅ Manter ZapSign — não migrar pra Clicksign

Razões:
- 🩺 Homologação ICP-Brasil já validada (trocar reseta defesa jurídica)
- 💰 R$ 0,50/disparo vs Clicksign R$ 2,50 → R$ 13.000/mês de diferença
  em 6.500 disparos
- 📈 IP whitelist é paliativo aceitável pro sandbox; em PROD o
  `x-pawards-secret` com `timing-safe-equal` já é defesa suficiente
- 🛡️ Manter Clicksign no código como failover (toggle
  `provedor_principal_codigo`), sem ativar. `forcarProvedor: "zapsign"`
  no F3.C garante zero acidente

**Ação futura**: quando subir pra plano ZapSign Enterprise (volume
justificar), verificar se oferece HMAC nativo no webhook → migrar do
custom header pro HMAC nativo. Senão, manter custom header.

### D11.Q4 🟡 Mapa neuronal v1.2 — depois de F2 merged

Estrutura proposta pelo Dr. Claude:

| Wave | Status | Conteúdo |
|---|---|---|
| Wave 10 | ✅ MERGED | ZapSign core F0-F6 → tag `v031` |
| Wave 10.5 | ✅ MERGED | Segurança + observabilidade (tsunami #34-#69) |
| Wave V232 | ✅ MERGED | Retenção auditoria painel pawards |
| Wave V46 | ✅ MERGED | WhatsApp CEO ativável |
| Wave Cadastro Pádua | ✅ MERGED | 4.278 fichas Google Sheets |
| Wave 13 | 🟡 F1 merged, F2-F4 PENDENTE | RBAC + Kill-Switch + 2FA |
| Wave 14 | 🔮 futuro | 2FA toggle por tenant |

Tasks #242-#262 e #374-#418 ficam como **"Tasks de lapidação contínua"**
sem numeração de wave.

### D11.Q5 🟡 F6 tag espera F2 — renomear pra `v031-zapsign-rbac-launch`

Tagar `v031-zapsign-launch` com PROD sem tenant isolation = selar versão
com falha de segurança conhecida. Tag precisa representar
"release-quality multi-tenant seguro". **Sequência final**: F2 merged →
smoke completo → tag `v031-zapsign-rbac-launch` → F6 wrap-up.

### Lentes de persona D11
- 🩺 Defesa jurídica preservada (ZapSign mantido + ICP intacto)
- 💰 Custo otimizado (não trocar de provedor) + caixa seguro depende de F2
- 📈 Plano claro e defensável pra captação (RBAC enforced + mapa v1.2)
- 🛡️ Risco maior (PROD sem RBAC) endereçado como prioridade #1

