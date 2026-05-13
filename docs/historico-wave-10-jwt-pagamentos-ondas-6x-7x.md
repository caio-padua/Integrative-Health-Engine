# Histórico Wave 10 ZapSign + JWT + Pagamentos PADCON + Ondas 6.x/7.x

> Arquivado em 13/mai/2026 durante Wave V25 PADCOM Demo. Conteúdo movido
> integralmente do replit.md para reduzir contexto. Invariantes Wave 9
> PRESERVADAS: 8.728 receitas + R$ 2.736.536,10 + 5 triggers ATIVOS.

## Wave 10 ZapSign + ICP-Brasil — Migration 031 (Fase B Dia 1 · 01/mai/2026)

Wave 10 destrava conversão de R$ 2.735.336,10 (comissão potencial Wave 9 PARQ)
em caixa real via assinatura digital com defensibilidade jurídica tripla
(CFM 2.386/2024 + CC 593-609 + LGPD art. 11 §4º + STJ REsp 2.159.442/PR).

### Status fases (11/mai/2026 — Wave 10 F5 fechado)
- ✅ **F0** Invariantes baseline + bucket `assinaturas-pawards`
- ✅ **F1** Migration 031 (`assinatura_solicitacoes` + `auditoria_assinaturas`)
- ✅ **F2** ZapsignAdapter promovido com HMAC custom header (`x-pawards-secret` timing-safe)
- ✅ **F3.A** `enviarPARQ.ts` (Família 4 — clínica e-CNPJ + farmácia e-CNPJ)
- ✅ **F3.B** `enviarTCLE.ts` (Família 1 — paciente avançada + médico e-CPF)
- ✅ **F3.C** `enviarOrcamentoFarmaceutico.ts` (Família 3 — paciente avançada + farmácia e-CNPJ ICP-Brasil), com 4 correções pós code-review (externalId determinístico, metadataExtra atômico, forcarProvedor zapsign, retro-compat)
- ✅ **Fase B Dia 1** preparação completa
- ✅ **Fase B Dia 2** disparo real fim-a-fim FECHADO (noite 11→12 mai/2026): receita teste 8728 (R$ 1.500 + R$ 450 comissão), envelope ZapSign produção `ea9029e8-8d8e-4d4e-ac2b-24551b8f3979`, solicitação id=8 → `CONCLUIDO`, **auditoria_assinaturas 0→1** (1ª assinatura real do projeto inteiro: signer_papel=PACIENTE, auth_method=assinaturaTela, IP real Caio 191.204.182.53, hash SHA-256 64 chars, PDF persistido no cofre `assinaturas/orc-8728-...pdf`). Invariantes Wave 9 PRESERVADAS (8.726 receitas produção + R$ 2.735.636,10 + 5 triggers ATIVOS). Detalhes em `docs/dr-claude/raws/04_session_plan_wave10_atual.md` snapshot final + decisão D9 em `01_DECISOES_TOMADAS`.
- **Dívidas técnicas Wave 10.5** registradas: (1) signatários não atualizados pós-webhook (status fica `ENVIADO` mesmo com solicitação `CONCLUIDO`); (2) auditoria por envelope, deveria ser por signatário; (3) `ZAPSIGN_WEBHOOK_DEV_BYPASS=true` ATIVO em DEV (painel ZapSign não tem campo secret) — decisão estratégica produção: ZapSign Enterprise vs Clicksign vs IP whitelist; (4) `farmaciaAuthMode: "avancada"` no script teste — adicionar guard `NODE_ENV !== production`.
- ✅ **F4** Webhook handler completo + manifesto SHA-256 (doc_signed/refused/removed, helper `registrarManifestoAuditoria` ON CONFLICT signature_id, fixes architect: signer_papel via lookup em `assinatura_signatarios` + signatureId determinístico)
- ✅ **F5** Frontend timeline + detalhe (2 telas mínimas, Wave 10 F5 — 11/mai/2026):
  - `/assinaturas/timeline` — tabela últimas 50 (template, paciente, status, X/Y signatários, marcador auditoria, link detalhe)
  - `/assinaturas/:id` — detalhe (header navy/gold + signatários + manifesto SHA-256 + IP + auth_method + ICP-Brasil + validation_url ZapSign + notificações)
  - **Endpoints novos hardenizados pós code-review FAIL→PASS**: `GET /api/assinaturas/timeline` e `GET /api/assinaturas/:id` agora protegidos por `guardMaster = [requireRole("validador_mestre"), requireMasterEstrito]` (mesmo padrão de `parq.ts`). Bypass via `x-admin-token` BLOQUEADO (403). Mascaramento PII server-side em CPF (`123.***.***-45`), IP (2 primeiros octetos) e geo (só city/region/country, sem lat/lng raw) — defesa em profundidade mesmo com gate master.
  - Smoke: timeline_no_auth=401 · detail_no_auth=401 · admin_bypass=403 (rejeitado por requireMasterEstrito) · healthz=200 · 0 erros TS novos (só pré-existentes seed/prescricaoLembrete/whatsapp/pacientes)
- ✅ **Wave 10.5 ADMIN_TOKEN rotacionado** (11/mai/2026): novo valor 256-bit gerado, mostrado 1 vez no chat pra Caio guardar no 1Password, plugado via `requestEnvVar(secret)`. `.replit` já estava limpo (sem ADMIN_TOKEN versionado). Bypass nas rotas Wave 10 continua bloqueado (regex requireAuth.ts intacta).
- 🟡 **F6** Wrap-up + tag `v031-zapsign-launch` (depende Fase B Dia 2)

### Identidade ZapSign decidida (D5/D6/D8)
- **Email proprietário conta ZapSign**: `ceo@pawards.com.br`
- **Email aliases organizacionais** (todos caem na mesma inbox via filtros):
  - `contratos@pawards.com.br` — recebe `doc_signed`
  - `billing@pawards.com.br` — faturas ZapSign
  - `admin@pawards.com.br` — DPO LGPD + auditoria
- **Webhook nome**: `hook-padua-4000`
- **Webhook URL definitiva**: `https://webhooks.pawards.com.br/api/webhooks/assinatura/zapsign` (CNAME apontando pro Replit deploy)
- **Webhook eventos**: `doc_signed`, `doc_refused`, `doc_removed`

### Env vars Wave 10
- `ZAPSIGN_API_TOKEN` (secret) — pendente, Caio cola amanhã via `requestEnvVar`
- `ZAPSIGN_WEBHOOK_SECRET` (secret, NÃO mais shared) — ⚠️ regenerar amanhã (achado crítico code-review: o valor gerado hoje em `shared` foi DELETADO porque secret visível = vetor de forja de webhook com impacto jurídico). Amanhã: `openssl rand -hex 32` → mostrar 1 vez no chat pra Caio guardar no 1Password → `requestEnvVar(secret)` → Caio cola o mesmo valor no campo "Secret" do painel ZapSign.
- `ZAPSIGN_BASE_URL` (opcional) — default `https://sandbox.api.zapsign.com.br/api/v1`
- `ZAPSIGN_BRAND_NAME` (opcional) — default `PAWARDS MEDCORE`
- `FARMACIA_REPRESENTANTE_*_FALLBACK` — pendente Wave 10.5 (sujeira #4 Wave 5)

### Endpoints relevantes
- `POST /api/orcamentos/:receitaId/disparar` — dispara use-case F3.C (auth requireRole)
- `GET /api/orcamentos/:receitaId/status` — consulta status assinatura
- `POST /api/webhooks/assinatura/zapsign` — recebe eventos ZapSign (HMAC validado)
- `POST /api/parq/emitir` — F3.A integrado
- `POST /api/prescricoes` — F3.B integrado (1ª receita do paciente dispara TCLE)

### Invariantes Wave 9 PRESERVADAS hoje
- 8.725 receitas em `parmavault_receitas`
- R$ 2.735.336,10 em comissão potencial (`SUM(comissao_estimada)`)
- 5 triggers Wave 9 ativos: `trg_calc_comissao`, `trg_assin_templates_validar`, `trg_nfe_validar`, `trg_parq_plano_prazo_limite`, `trg_sync_comissao_parq`

### Wave 10 baseline (pré-disparo real)
- `assinatura_solicitacoes`: 4 linhas
- `auditoria_assinaturas`: 0 linhas
- Paciente teste Caio Pádua (id=3104) inserido idempotente
- Coluna nova `pacientes.is_teste boolean NOT NULL DEFAULT false` (psql aditivo, achado 3 code-review) — Caio marcado `true`. Relatórios futuros DEVEM filtrar `WHERE p.is_teste = false` pra excluir contas de teste de dashboards de produção.

### Plano amanhã CORRIGIDO (achado 2 code-review)
Cancelado o plano original de UPDATE transitório no telefone do paciente Carlos (id=1703) — worker `notifAssinatura.ts` lê dados atuais do paciente em runtime e poderia redirecionar notificações de OUTROS fluxos pro Caio durante a janela = vazamento PII. Substituído por: criar receita teste vinculada ao próprio Caio (id=3104, paciente teste), filtrável via `is_teste`. Detalhes em `02_DECISOES_PENDENTES_PARA_DR_CLAUDE.md` passo 6.

### Wave 13 RBAC + Kill-Switch + 2FA TOTP (pendência arquitetural)
Detalhada em `docs/dr-claude/02_DECISOES_PENDENTES_PARA_DR_CLAUDE.md` com mini-RFC técnico (schema SQL aditivo + matriz endpoint×perfil + middleware exemplo + 8 critérios de aceite).
Modelo: PLATFORM_OWNER (Caio, 2FA TOTP obrigatório) > TENANT_ADMIN (donos clínica) > TENANT_USER (médicos/secretárias). Kill-switch 4 ações (suspender, reassumir, exportar LGPD art. 18, excluir após carência 30d). Recomendação: implementar imediatamente após Wave 10 (antes de Wave 11/12) porque assinaturas reais sem RBAC robusto criam risco jurídico.

### Hotfix de segurança Wave 10 Fase B Dia 1 (sujeira #6)
Code-review architect detectou que `.replit` versionado expõe `ADMIN_TOKEN` em texto claro + `requireAuth.ts` aceita bypass via header `x-admin-token` em qualquer rota não-painel. Pra fluxo Wave 10 com efeito jurídico (assinaturas ICP-Brasil), bypass admin disparando contratos em nome de tenants reais é catastrófico. **Hotfix HOJE**: editado `requireAuth.ts` linhas 70-89 pra bloquear bypass nas rotas Wave 10 (`/orcamentos/*`, `/parq/*`, `/prescricoes/*` com ou sem prefixo `/api/`) via regex `/^\/(api\/)?(orcamentos|parq|prescricoes)(\/.*)?$/`. Smoke confirmou bloqueio: 5/5 rotas reais Wave 10 retornam 401 mesmo com `x-admin-token` válido. Cleanup completo (rotação token + remoção do `.replit` versionado) agendado pra Wave 10.5 (Caio rotaciona via `requestEnvVar(secret)` amanhã junto com cadastro ZapSign).

> **Histórico Waves 5-8 arquivado** em [`docs/historico-waves-5-a-8.md`](./docs/historico-waves-5-a-8.md)
> (PARMAVAULT-TSUNAMI / Wave 5/6/7/8 / Wave 3 FATURAMENTO). Trim inicial feito 11/mai/2026
> durante Wave 10 F4 — replit.md reduzido de 1618→1198 linhas.
>
> **Histórico Wave 9 PARQ + Onda PRESCRIÇÃO PADCON arquivado** em
> [`docs/historico-waves-9-e-anteriores.md`](./docs/historico-waves-9-e-anteriores.md)
> (Wave 9 PARQ Migration 030, PARMASUPRA-TSUNAMI, Onda LAVAGEM PAWARDS, Manifesto PADCON 2.0,
> Onda MANHÃ PARMAVAULT, Onda PRESCRIÇÃO PADCON Backend + Fundação). Segundo trim feito
> 11/mai/2026 pós Wave 10.5 — replit.md reduzido de 1208→970 linhas. Wave 10 ZapSign
> permanece inline porque é contexto ATIVO; invariantes Wave 9 (8.726 receitas, R$ 2.735.636,10,
> 5 triggers ATIVOS) seguem PRESERVADAS — só o histórico narrativo foi movido.

---

## Onda Blindagem JWT (concluída — 20/abr/2026)

Antes do domínio `pawards.com.br` entrar no ar com aliases reais, a API foi blindada com autenticação JWT real. A auth anterior emitia token fake (`token-{id}-{timestamp}`) e `/perfil-atual` ignorava o token e devolvia o primeiro `validador_mestre` — qualquer um com acesso à URL conseguia operar como Caio.

- **HS256 manual via `node:crypto`** (`api-server/src/lib/auth/jwt.ts`) — sem dependência nova; secret via `JWT_SECRET` ou `SESSION_SECRET`; TTL 8h; header fixo (resiste a `alg:none`); `timingSafeEqual` na verificação.
- **Middleware `requireAuth`** (`api-server/src/middlewares/requireAuth.ts`) montado globalmente em `/api/*` antes do router. Whitelist com **match exato** para rotas estáticas + **prefix com slash** para dinâmicas (evita bypass via `startsWith`). Públicas: `/healthz`, `/health`, `/usuarios/login`, `/portal/*` (paciente), `/padcom-sessoes`, `/padcom-questionarios`, `/padcom-bandas`, `/questionario-paciente`, webhooks de pagamento e assinatura.
- **`/usuarios/login` reescrito**: bcrypt compare (suporta hash `$2*` ou plaintext legacy com auto-upgrade após login bem-sucedido); emite JWT real com `{sub, email, perfil, escopo, unidadeId, consultoriaId}`.
- **`/usuarios/perfil-atual` reescrito**: lê `req.user.sub` do token e busca o usuário real (não mais hardcoded).
- **`PUT /usuarios/:id` endurecido**: campos editáveis split em `SELF_FIELDS` (próprio user) vs `ADMIN_ONLY_FIELDS` (perfil/escopo/permissões só admin); senha exige `senhaAtual` e só o próprio user pode trocar a sua; bcrypt hash sempre.
- **`POST /usuarios` e `DELETE /usuarios/:id`**: só admin (`validador_mestre`/`consultoria_master`); admin não pode se autodeletar.
- **Frontend** (`AuthContext.tsx` + `custom-fetch.ts`): token persistido em `localStorage` (`pawards.auth.token`); `setAuthTokenGetter` registrado no top-level do módulo (injeta `Authorization: Bearer` automaticamente); auto-logout em 401; `queryClient.clear()` no logout.
- **Pen-test interno (Dr. Claude checklist)**: 9/9 passaram — sem token = 401, JWT inválido = 401, JWT expirado = 401, traversal = 401, escalada de perfil bloqueada, senha de outro user bloqueada (403), delete cross-user bloqueado (403), criação de admin por não-admin bloqueada (403), próprio nome editável (200).
- **`SECURITY_DEBT.md` removido do root** (compromisso cumprido).
- **Deferido (próximas ondas)**: cross-tenant isolation total nos handlers (validar `unidadeId` do path bate com escopo do token); refresh token em HttpOnly cookie; access token de 15min ao invés de 8h; rota dedicada de "esqueci minha senha".

## Fix Worker Lembrete Prescrição (concluído)

- **Bug**: worker `[lembretePrescricao]` quebrava a cada 60s porque a tabela master `prescricoes_lembrete` não existia no banco (somente a tabela filha `prescricao_lembrete_envios` estava criada).
- **Correção**: criada a tabela `prescricoes_lembrete` via SQL puro com schema idêntico ao definido em `lib/db/src/schema/prescricoesLembrete.ts` — `id serial PRIMARY KEY`, `paciente_id`/`unidade_id` com FKs, `periodos` jsonb, `horarios_envio` jsonb, timestamps. Padrão de IDs preservado (todas as novas tabelas seguem `serial` consistente com o schema Drizzle).
- **Política de schema deste projeto**: alterações de schema são feitas via SQL puro (sem `db:push`) por causa de ~10 tabelas auxiliares operacionais com dados de produção que existem fora do schema Drizzle, conforme preferência absoluta do usuário ("never dropping tables with data").

## Onda 7 — Motor de Recorrência Programada + Blindagem Multi-Tenant (concluída)

- **4 tabelas novas**: `planos_terapeuticos_template`, `fases_plano_template`, `adesoes_plano`, `eventos_programados`.
- **3 templates canônicos seed**: PLANO_3M_INICIAL (R$ 2.700, 3 fases / 90 dias), PLANO_6M_CONTINUIDADE (R$ 5.400, 3 fases / 180 dias), PLANO_12M_TRANSFORMACAO (R$ 9.600, 6 fases / 365 dias). 12 fases totais com ações esperadas (RAS_INICIAL, AGENDAR_RETORNO, COBRAR_PARCELA, LEMBRETE_RETORNO, RAS_PROGRAMADO, RENOVACAO_AVISO).
- **Função `iniciarAdesao`** (`lib/recorrencia/motorPlanos.ts`): materializa automaticamente todos os eventos programados a partir das fases do template, distribuídos no tempo (RAS_INICIAL no início, RENOVACAO_AVISO 7 dias antes do fim, demais no meio de cada fase).
- **Worker scheduler interno**: `setInterval` 5 min executa eventos pendentes vencidos (`status=PENDENTE AND agendado_para<=now`), com retry até 3 tentativas → status FALHOU. `setInterval` 60 min recalcula score de risco de abandono.
- **Score risco abandono (0-10)**: heurística baseada em dias desde último atendimento + eventos pendentes acumulados. Score ≥ 7 entra na lista de reativação.
- **Middleware `tenantContextMiddleware`** (`middlewares/tenantContext.ts`): injeta `req.tenantContext.unidadeId` a partir de header `x-unidade-id`, query `unidade_id` ou session. Aplicado globalmente em `/api`.
- **6 endpoints REST**: `GET /api/planos-templates`, `POST /api/planos/adesoes`, `GET /api/planos/adesoes`, `GET /api/planos/adesoes/:id/eventos`, `POST /api/planos/admin/executar-pendentes`, `POST /api/planos/admin/recalcular-scores`, `GET /api/planos/inteligencia/risco-abandono`.
- **Cobertura V2 GPT** subiu de 53% → **80% COMPLETO** (12/15 tópicos). 3 Kaizens P10/P9 marcadas IMPLEMENTADAS.

## Onda 6.5 — Manifesto Estratégico Nacional + Kaizen + Escala Industrial (concluída)

- **4 tabelas novas**: `manifestos_estrategicos`, `niveis_escala_nacional`, `oportunidades_entrada_nacional`, `kaizen_melhorias`.
- **Manifesto Nacional V1** (escopo NACIONAL): propósito de vida (medicina integrativa acessível a todos), 3 vetores (escala, recorrência, proteção jurídica), filosofia Kaizen (PDCA, Gemba, 5 Porquês, Kanban, Heijunka, Poka-yoke), inspirações premiadas (Mayo Clinic, Cleveland, Linear, Stripe Atlas, Notion).
- **5 níveis da escada nacional**: CR_SOLO → EQUIPE_MEDICA → REDE_MULTI_CLINICA → FARMACIA_MANIPULACAO → INDUSTRIA_INJETAVEIS. Cada nível com requisitos, oportunidades, marcos-chave e métrica-alvo.
- **6 oportunidades de entrada com gancho neuromarketing**: vitamina D popular (R$ 450 trim.), Rhodiola injetável (R$ 980 mensal), parceria médica (R$ 3500/mês), franquia clínica (R$ 25k/mês), farmácia integrada (R$ 8k/mês), contrato SUS industrial (R$ 1,5M/ano).
- **18 melhorias Kaizen mapeadas** distribuídas em 7 áreas (CLINICO, JURIDICO, FARMACIA, INDUSTRIAL, COMERCIAL, EXPERIENCIA, GOVERNANCA), com impacto/esforço/prioridade/ciclo (PDCA, Gemba, Poka-yoke, Heijunka, 5_Porques) e origem-inspiração (Toyota, Mayo Clinic, Stripe Atlas, etc).
- **4 endpoints REST somente-leitura**: `GET /api/manifesto-nacional`, `GET /api/niveis-escala-nacional`, `GET /api/oportunidades-entrada?nivel=`, `GET /api/kaizen-melhorias?area=&status=` (com resumo agregado).

## Onda 6.4 — Auto-provision Drive + Anastomose Semântica GPS+RAS (concluída)

- **Subpastas Drive expandidas (16 → 20)**: adicionadas `NOTAS FISCAIS`, `ASSINATURAS`, `RAS`, `GPS` como pastas-padrão de todo paciente.
- **Hook `autoProvisionDriveAsync`** (`lib/pacientes/autoProvisionDrive.ts`): fire-and-forget no POST /pacientes; cria pasta raiz + 20 subpastas + planilha GPS+RAS sem bloquear o cadastro.
- **Planilha GPS+RAS** (`lib/sheets/planilhaPacienteGPS.ts`): Google Sheet com 4 abas — `GPS_LINHA_VIDA`, `RAS_RELATORIOS`, `PROTOCOLOS`, `FINANCEIRO_NF` — cabeçalhos bold em azul petróleo, arquivada na subpasta GPS.
- **Auto-upload NF Drive** (`lib/juridico/notaFiscalDrive.ts`): após `emitirNotaFiscalBlindada`, gera HTML fiscal e faz upload na subpasta NOTAS FISCAIS; persiste `drive_file_id`/`drive_file_url` em `notas_fiscais_emitidas`. Endpoint `POST /api/notas-fiscais/:id/reupload-drive` para recuperação manual.
- **Anastomose semântica GPS+RAS**: 7 categorias procedimento + 6 textos institucionais reescritos com siglas embutidas (GPS = Gerenciamento Personalizado de Saúde; RAS = Relatório Assistencial Sistêmico) em tom neuromarketing — "convite à mudança de vida", "assinatura da casa própria", acolhimento + segurança + decisão consciente. Coluna `titulo_curto` adicionada em `assinatura_textos_institucionais` para subjects/push.


---

## Sistema de Pagamentos PADCON (Dr. Manus)

Integrado em 17/04/2026. Adapter pattern com 4 gateways (Asaas, Mercado Pago, Stripe, InfinitPay).

**Backend** (`artifacts/api-server/src/`):
- `payments/` — types, payment.service, 4 adapters
- `routes/payments.ts` — REST + webhooks (montado em `/api/payments`)
- `app.ts` — `express.raw` para `/api/payments/webhooks/stripe`

**Frontend** (`artifacts/clinica-motor/src/`):
- `hooks/use-payment.ts` — hook React (chargePatient, subscribeClinic, polling PIX)
- `components/PaymentModal.tsx` — modal universal B2C/B2B

**Endpoints:** GET /api/payments/gateways · POST /patient · POST /clinic/subscribe · GET/POST /:gateway/:id/status|cancel · POST /webhooks/:gateway

**Credenciais (todas opcionais — gateway só fica disponível se a env existir):**
ASAAS_API_KEY · MERCADOPAGO_ACCESS_TOKEN · STRIPE_SECRET_KEY (+ STRIPE_WEBHOOK_SECRET + 6 STRIPE_PRICE_*) · INFINITPAY_CLIENT_ID/SECRET/WEBHOOK_SECRET

**Webhooks (configurar nos painéis dos gateways):**
- Asaas: `/api/payments/webhooks/asaas`
- Mercado Pago: `/api/payments/webhooks/mercadopago`
- Stripe: `/api/payments/webhooks/stripe` (raw body validado)
- InfinitPay: `/api/payments/webhooks/infinitpay`

**Preços B2C (paciente, centavos):** básico 29700 · intermediário 59700 · avançado 99700 · full 149700
**Preços B2B (clínica, centavos):** starter 29700/mês ou 26700/mês anual · pro 59700/53700 · enterprise 149700/134700

## Reperfusão de Conteúdo (2026-04-17)
- **Tabela `documentos_referencia`** criada (lib/db/src/schema/documentosReferencia.ts) — armazena manifestos/arquitetura/jurídico/agentes de Dr. Claude/Manus/ChatGPT como fonte de verdade no banco. Categorias: MANIFESTO, JURIDICO, AGENTES, FORMULAS, ARQUITETURA, RAS_EVOLUCAO, IMPEDIMENTOS, RECEITA_MODELO, OUTROS.
- **Coluna `formula_blend.formula_id`** (FK → formulas, ON DELETE SET NULL, índice) — religa artéria estrutural fórmulas ↔ blend.
- **Script de ingestão**: `artifacts/api-server/src/scripts/ingest-documentos-referencia.ts` (mammoth p/ DOCX, pdf-parse@1.1.1 p/ PDF, sanitiza NUL byte). 36 documentos / 359KB ingeridos (18 Dr. Claude, 3 Dr. Replit, 15 desconhecida).
- **Endpoints REST** (`artifacts/api-server/src/routes/documentosReferencia.ts`): `GET /api/documentos-referencia` (lista, totals respeitam filtros), `GET /:codigo` (detalhe com conteúdo completo), `GET /_meta/resumo` (agregação por categoria/autoria).
- **Limitação conhecida**: `Ras_evolutivo_manus.pdf` (5.6MB) é PDF scanned-only (14 chars extraídos) — requer OCR futuro.
- **Caio**: nome agora `Dr Caio Henrique Fernandes PaduX`, senha `Padua4321X` (bcrypt atualizado).

## Anastomose Documental — Reificação Sistêmica (2026-04-18)

**Conceito**: encarnar 36 documentos dormentes em `documentos_referencia` (~360KB de texto de Dr. Claude/Manus/ChatGPT) nas tabelas vazias do banco — fim do "walking dead".

**Schema novo**: `mapeamento_documental` (lib/db/src/schema/mapeamentoDocumental.ts) — rastro auditável documento→tabela com status DORMENTE/CLASSIFICADO/EXTRAIDO/MAPEADO/ENCARNADO/VALIDADO/FALHOU.

**Motor de Reificação V1** (`scripts/src/reificacao.ts`, comando `pnpm --filter @workspace/scripts run reificacao`): classifica os 36 docs em 7 categorias e enriquece os 13 termos jurídicos com texto rebuscado baseado em CFM 1.931/2009, LGPD 13.709/2018, CDC, ANVISA RDC 67/2007, MP 2.200-2/2001 e Lei 14.063/2020.

**Resultado primeira execução** (output/reificacao/RELATORIO_REIFICACAO.md):
- 13 termos jurídicos: 3.246 → 56.482 chars (17.4x crescimento)
- Multiplicadores destaque: CFOR 51x, CIMP 49x, CEND 48x, CIMU 38x, CEIN 35x, CETE 30x
- Riscos catalogados como JSONB em `riscos_especificos` para 7 termos específicos por via
- 60 mapeamentos registrados, classificação: 21 JURIDICO_TCLE, 18 ARQUITETURA, 9 AGENTES, 6 RECEITA_TEMPLATE, 2 IMPEDIMENTOS, 2 MANIFESTO, 2 OUTROS

**Religação RACJ→Banco (Onda 2)**: `gerarRacjPdfFromBanco()` em `artifacts/api-server/src/pdf/rasxPdf.ts` substitui as 5 seções hardcoded (LGPD/CGLO/RISC/NGAR/PRIV) lendo TODOS os 13 termos ativos de `termos_juridicos` ordenados por `bloco` (JURI antes de FINA) e `id`. Resultado para Natacha: PDF passou de 5 → **42 páginas**, com 13 cadernos (LGPD, CGLO, NGAR, CFOR, CIMU, CEND, CIMP, CEIN, CETE, IMAG, AEAS, PRIV, FINA), cada termo com seu bloco de paciente, texto rebuscado de 3-7k chars, riscos JSONB catalogados em checkboxes e bloco de assinatura. Suporta placeholders `{{NOME_PACIENTE}}` e `{{CPF_PACIENTE}}` no texto do banco. Fallback para hardcoded se a query retornar vazio. Audit log marca `fonte: "termos_juridicos_db"`.

**Encarnação Receita Modelo Natacha** (`scripts/src/encarnar-natacha.ts`, doc 65): inseridas 9 doenças no catálogo (NATD-001..006 diagnosticadas + NATP-007..009 potenciais), 1 snapshot inicial em `estado_saude_paciente` para paciente_id=43 (condicoes_atuais, sintomas_ativos, medicamentos_em_uso em JSONB; níveis energia=3, dor=6, sono=2, estresse=7) e validação que as 3 fórmulas magistrais (Sono Reparador, Articular, Metabólica) já têm `componentes_formula` JSONB populados. Doc 65 marcado como ENCARNADO em `mapeamento_documental` apontando 3 tabelas-destino.

**Encarnação Motor de Exames PAWARDS (Onda 3)** (`scripts/src/encarnar-exames-pawards.ts`): reificação da "Planilha Geradora Exames Clinica V3" do Drive (TABELAS PLANILHAS EMPRESA, id `1P2QSPsGsdUPegpfZnXAUBxOh1Ahz91f8asKmcHg9DU8`) em duas tabelas:
- **`exames_base`**: UPSERT 34 exames (12 LABORATORIAL, 8 RESSONÂNCIA, 6 CARDIOLÓGICO, 3 USG, 2 TC, 2 ENDOSCOPIA, 1 OSTEOMETABÓLICO) com `hd_1/cid_1`, `hd_2/cid_2`, `hd_3/cid_3` (3 hipóteses diagnósticas + CIDs por exame) + 3 níveis de justificativa (`justificativa_objetiva` ~150c, `justificativa_narrativa` ~250c, `justificativa_robusta` ~400c). Total agora: **280 exames** com 254 já tendo as 3 justificativas.
- **`cid10`** (tabela nova, DDL inline): 66 CIDs únicos extraídos da planilha, classificados em 9 capítulos (IV Endócrinas, IX Circulatório, XIII Osteomuscular, XIV Geniturinário, XVIII Sintomas, XIX Lesões, XXI Fatores influenciam saúde, XI Digestivo, I Infecciosas) com `hd_associado_principal` cruzado.

**REGRA DOS 3 NÍVEIS DE JUSTIFICATIVA — não é aleatório, é robustez crescente:**
- `OBJETIVA` (curta) → convênio que não exige fundamentação
- `NARRATIVA` (média) → padrão de mercado, maioria dos planos
- `ROBUSTA` (longa) → plano exigente, auditoria, glosa frequente
O médico (ou o motor autônomo) escolhe o estilo em runtime via `pedidos_exame.tipo_justificativa`. O gerador `gerarPedidoExame.ts` já recebe esse parâmetro pronto.

**Onda 4 — Hidratação Semântica de Pagamentos + Tabelas Autoexplicativas + Auto-validação TS:**

1. **Tabela `niveis_justificativa`** (nova, autoexplicativa): 3 linhas (OBJETIVA/NARRATIVA/ROBUSTA) com colunas `funcao`, `porque_existe`, `quando_usar`, `exemplo_pratico`, `comprimento_alvo`. Agora o banco SE EXPLICA: qualquer rota pode dar SELECT e mostrar ao médico/admin o que cada nível significa, quando usar e um exemplo do texto gerado. Antes a regra estava só no replit.md.

2. **Tabela `provedores_pagamento`** (nova, autoexplicativa): 4 linhas (asaas/stripe/mercadopago/infinitpay) com mesma estrutura semântica + `metodos_suportados[]` + `fonte_adapter` + `status_integracao`. Documenta no banco POR QUE cada gateway existe (asaas=PIX brasileiro, stripe=internacional/SaaS B2B, mercadopago=público C/D + lotéricas, infinitpay=presencial/maquininha) e em que cenário ele é o certo.

3. **Stack COMPLETA do Claude baixada** → `attached_assets/claude_pagamentos_completo/` (11 arquivos, 64KB):
   - `types.ts` (3.9k) — interfaces `PaymentGateway`, `PaymentResult`, `WebhookEvent`, tipos `Saasplan` e `ProtocolTier`, mapas `SAAS_PRICES` e `PROTOCOL_PRICES`
   - `payment.service.ts` (3.7k) — service singleton com factory de adapters, `defaultGateway`, `isGatewayAvailable`, `chargePatient`, `subscribeClinic`, `getStatus`, `cancel`, `parseWebhook`
   - `payment.routes.ts` (7.5k) — rotas Express prontas
   - `4 adapters` (.adapter.ts) — asaas, stripe, mercadopago, **infinitpay** (este faltava nos baixados anteriores)
   - `use-payment.ts` (5.4k) — hook React pronto
   - `PaymentModal.tsx` (11.9k) — componente React de checkout com seletor de método
   - `INTEGRACAO.ts` (3.7k) — guia passo-a-passo de integração assinado pelo Claude
   - `.env.example` (2.6k) — todas as 12 envs necessárias documentadas (ASAAS_API_KEY, STRIPE_SECRET_KEY + 6 STRIPE_PRICE_*, MERCADOPAGO_ACCESS_TOKEN, INFINITPAY_CLIENT_ID/SECRET/WEBHOOK_SECRET, DEFAULT_GATEWAY, API_PUBLIC_URL)

4. **Modelo de negócio reificado em 2 tabelas autoexplicativas** (extraído dos `SAAS_PRICES` + `PROTOCOL_PRICES` do Claude):
   - **`protocolos_paciente_catalogo` (B2C)** — 4 tiers de protocolo que o paciente paga após anamnese: `basico` R$297/30d, `intermediario` R$597/90d, `avancado` R$997/180d, `full` R$1.497/365d. Cada linha tem função, porquê, quando_usar, exemplo_pratico (com paciente fictício real, ex. Natacha = Avancado) e JSONB `inclui` listando entregáveis.
   - **`planos_saas_catalogo` (B2B)** — 3 planos PADCOM que a clínica assina: `starter` R$297/mês (1 prof, 50 pac), `pro` R$597/mês (5 prof, 200 pac), `enterprise` R$1.497/mês (ilimitado, multi-unidade, white-label). Cada linha com mesmo padrão semântico + `preco_mensal_centavos`/`preco_anual_centavos`/`limite_pacientes`/`limite_profissionais`/`inclui` JSONB.

5. **Estado atual de pagamentos no código**: `routes/payments.ts` (192 linhas) já tem service multi-provedor com webhook signature + raw body. `routes/financeiro.ts` (464 linhas) já tem dashboard. Tabelas `pagamentos` (14 cols, 3 linhas) e `faturamento_mensal` (17 cols, 3 linhas) populadas. Próximo passo: mover os 4 adapters de `attached_assets/claude_pagamentos_completo/` para `artifacts/api-server/src/payments/` e refatorar `routes/payments.ts` para usar o `PaymentService` do Claude (que tem factory completa).

6. **Planilha PADCOM PAGAMENTOS FORNECEDORES** (Drive id `14ojtObTS81ey5YnNRj30o8Mo1vWX0cLOaKWdrvIWY4Y`) mapeada — 5 abas (README, Config, Fornecedores, Boletos, Dashboard). Para próxima onda: criar tabelas `fornecedores` + `boletos` (contas a pagar) + view `dashboard_fornecedores` espelhando essa planilha.

7. **Inventário de tabelas autoexplicativas (padrão PAWARDS):** o banco agora tem 4 catálogos com a triade `funcao` + `porque_existe` + `quando_usar` + `exemplo_pratico`:
   - `niveis_justificativa` (3 linhas) — OBJETIVA/NARRATIVA/ROBUSTA
   - `provedores_pagamento` (4 linhas) — asaas/stripe/mercadopago/infinitpay
   - `protocolos_paciente_catalogo` (4 linhas) — basico/intermediario/avancado/full (B2C)
   - `planos_saas_catalogo` (3 linhas) — starter/pro/enterprise (B2B)
   Esse padrão agora é regra: toda nova tabela de catálogo deve seguir essa estrutura mínima, garantindo que o banco SE EXPLIQUE sem depender de docs externas.

8. **Auto-validador de docstrings** (`scripts/src/validar-docstrings.ts`, novo): script que percorre 11 arquivos TS críticos, detecta cada `function`/`const = (...)` e classifica o JSDoc anterior em 4 estados (OK / SEM_JSDOC / JSDOC_SEM_EXEMPLO / JSDOC_SEM_PORQUE). Padrão obrigatório PAWARDS = triade **(Função, Por que existe, Exemplo prático)**. Execução: `pnpm --filter @workspace/scripts exec tsx src/validar-docstrings.ts`. **Estado inicial revelado: 99 funções, 0% com JSDoc completo, 97 sem nada — alvo crítico de documentação para próximas ondas.** As 6 funções dos scripts de encarnação (encarnar-natacha + encarnar-exames-pawards) já foram documentadas como exemplo do padrão.

**Onda GESTÃO CLÍNICA + AUDITORIA — 4 Auditores Virtuais:**
- **Migration 003**: 8 tabelas (`auditor_areas_atuacao`, `auditores`, `auditor_visibilidade_regras`, `auditor_mensagens`, `auditor_eventos_drive`, `anastomoses_pendentes`, `paciente_email_semanal`, `drive_anchors`) — todas serial PK.
- **4 auditores fictícios**: Arquio 🛡️ TÉCNICO (07h diário), Klara 🩺 CLÍNICO (18h diário, única LGPD-full), Vitrine 📈 LOCAL (seg 08h), Horizonte 🌐 GLOBAL (sex 17h).
- **28 regras de visibilidade LGPD-granular** (PACIENTES/PRESCRICOES/RAS/FINANCEIRO/EXAMES/DRIVE_EVENTOS/MARKETING × NENHUM/AGREGADO/ANONIMIZADO/IDENTIFICAVEL).
- **Hierarquia Drive**: `PAWARDS/GESTAO CLINICA/{Empresas/CNPJ, AUDITORIA/{- DASHBOARD, - ATIVA, - LEGADO}}`. Pastas criadas e ancoradas em `drive_anchors`. Planilha `AA.MM.DD - AUDITORIA` criada em `- ATIVA` com abas EVENTOS/DASHBOARD/CONFIG.
- **Rotas API** (`/api/auditores`, `/api/auditor-mensagens`, `/api/auditor-eventos`, `/api/anastomoses`): GET/POST/PATCH com botões `LI | DECIDIR | ADIAR`.
- **Template HTML e-mail semanal paciente** (A4, page-break-inside avoid, blocos RESUMO/PEDIMOS/INDICADORES).
- **18 stress tests** motor PADCON (entradas vazias, 50 ativos, REGRA 14.3 explosão FAMA, B2/A3, magistral solo, idempotência, Lilás/Verde, unicode).
- **Anastomoses críticas registradas**: `withTenantScope` global, watcher Drive Activity, scheduler 48h ATIVA→LEGADO, assinatura PAdES/ICP, posologia dinâmica PDF.
- **Nomenclatura ferro-fundida**: MAIÚSCULAS, sem acentos/hífen/underline, só espaços. Arquivos `AA.MM.DD - PALAVRA`.

**Onda 5 — Assinatura Digital + Mapa Fiscal/Gateways:**

1. **Tabela `provedores_assinatura_digital`** (nova, autoexplicativa, 6 linhas): catálogo dos 6 provedores cobertos pelo PAWARDS, com mesma tríade (`funcao` + `porque_existe` + `quando_usar` + `exemplo_pratico`) + colunas extras (`tipo_assinatura`, `evidencias_capturadas[]`, `valor_juridico`, `modelo_cobranca`):
   - `dock` — eletrônica avançada com KYC integrado (selfie + RG + biometria); para paciente Avancado/Full
   - `clicksign` — eletrônica avançada brasileira (default PADCOM); SMS/WhatsApp/email
   - `d4sign` — qualificada ICP-Brasil com A1/A3 nativo; obrigatória para receitas controladas (Portaria 344/98) e SNGPC
   - `zapsign` — eletrônica simples via WhatsApp; alto volume baixo custo (paciente Basico)
   - `autentique` — gratuita até 5 docs/mês; fallback para clinica Starter
   - `icp_a1_local` — assinatura local com certificado A1 já existente em `sub_agendas` (sem custo por documento, ideal para NFSe)

2. **Tabela `assinaturas_digitais`** (nova, registro forense central): cada linha é uma evidência jurídica reutilizável. Colunas: `paciente_id`, `usuario_id`, `documento_tipo` (TCLE/RECEITA/RAS/CONTRATO_SAAS/NFSE/PEDIDO_EXAME), `documento_id` (FK polimórfico), `documento_hash_sha256`, `provedor_codigo` FK, `status` (PENDENTE→ENVIADO→ABERTO→ASSINADO), `ip_origem` INET, `geolocalizacao` JSONB, `evidencias` JSONB ({selfie_url, biometria_score, foto_rg_url}), `manifesto_eventos` JSONB (log temporal: enviado/aberto/assinado), `pdf_assinado_url`, `certificado_subject` (CN ICP), `certificado_validade`. 5 índices (paciente, doc_polimórfico, status, provedor, hash). COMMENTs SQL semânticos nas colunas-chave.

3. **Inventário pré-existente do banco que já provê assinatura** (descoberto na varredura):
   - `termos_assinados` (data_assinatura, meio_assinatura, texto_no_momento_assinatura, versao_assinada) — JÁ EXISTIA
   - `termos_consentimento.exige_assinatura_escrita`
   - `cadernos_documentais.assinado_em`
   - `sub_agendas` com 7 colunas de certificado A1 (arquivo_url, cpf_cnpj, nome, senha, validade, requer_certificado_para_prescricao/protocolo)
   - `usuarios.pode_assinar`
   - `validacoes_cascata.assinatura_a1`
   - `padcom_competencias_regulatorias.exige_certificado_digital`
   - `rasx_audit_log.hash_documental` — hash SHA já provisionado
   - `ras.assinatura_paciente` + `ras.assinatura_profissional`
   A nova tabela `assinaturas_digitais` ATA tudo isso via `documento_tipo`+`documento_id`, sem destruir o legado.

4. **Manifesto fiscal extraído** (`PADCOM SAAS MOTOR CLINICO V14.3 — FISCAL GATEWAYS MAPA NF INCORPORADA`, Drive id `15olIby5ao0raV7vmqM7h3AfFJ8UgSSu-uA3z43hAIFM`): 12 abas, 6 críticas exportadas para `scripts/data/v14_3_fiscal_gateways_nf.json`:
   - **FISCAL MAPA OPERACIONAL** — 7 etapas do fluxo `pagamento_confirmado → emissao_NF` (entrada/processamento/saída/trava/ação_se_erro)
   - **FISCAL GATEWAYS** — tabela de tradução `(gateway, status_origem) → status_interno_padrao + gera_recibo + libera_NF + exige_revisao` para os 4 gateways
   - **FISCAL PROCEDIMENTOS** — catálogo de procedimentos com codigo_interno + categoria + texto_base_NF (ex: MC_CONS_001=consulta integrativa, MC_EXM_001=emissão de guias)
   - **FISCAL TEXTO NF** — regras condicionais para gerar texto da nota (R001..Rxx)
   - **FISCAL TESTES SEMANTICOS** — bateria de testes esperados para validar o motor fiscal
   - **FISCAL LEGENDA HUMANA** — dicionário humano de cada conceito
   Próxima onda: encarnar essas 6 abas em tabelas (`fiscal_mapa_etapas`, `fiscal_gateways_mapa`, `fiscal_procedimentos`, `fiscal_regras_texto_nf`).

5. **Manifesto SAAS Motor Clínico** (`DOCUMENTO MANIFESTO SAAS MOTOR CLINICO`, Drive id `19051p4CvLU8S2_nQSvZihU4LGjG8xy15KtuiOsAP1v0`) baixado em `attached_assets/MANIFESTO_SAAS_MOTOR_CLINICO.txt` (10.7KB). Documento de arquitetura assinado pelo Caio definindo: posicionamento institucional (Dr. Caio Henrique Fernandes Pádua / Instituto Pádua / Medicina Integrativa de Alta Performance), assinatura fixa "Developed and Supervised by PADCON", design editorial premium (preto profundo / off-white / dourado), regras de PDF documental + evolutivo, fluxo CAVALO ENTRADA (autônomo/operacional), e regras de bloqueio fiscal (NF só após pagamento concluído + assinatura aprovada).

6. **Inventário consolidado de tabelas autoexplicativas (5 catálogos PAWARDS):**
   - `niveis_justificativa` (3) — justificativa de exame
   - `provedores_pagamento` (4) — gateways
   - `protocolos_paciente_catalogo` (4) — B2C tiers
   - `planos_saas_catalogo` (3) — B2B planos
   - `provedores_assinatura_digital` (6) — Dock/Clicksign/D4Sign/ZapSign/Autentique/ICP-A1
   Total: **20 linhas semânticas** que documentam o produto inteiro só com SQL.

**Onda 6 — Módulo Assinatura Digital PAU ARTS (manifesto Caio integrado):**

Manifesto técnico oficial baixado: `attached_assets/sheet_assinatura/MANIFESTO_assinatura_digital.txt` (13.7KB, 13 seções). Drive id `15syeUGNZHZOPCCvM3FTcLtcfdZyS9JQh`. Decisão arquitetural do Caio: **Clicksign (principal) + ZapSign (failover)** com toggle administrativo, NÃO Dock. Hidratação semântica completa em **12 tabelas** + COMMENTs SQL em todas:

1. **`provedores_assinatura_digital` (6 linhas)** — adicionadas colunas `is_principal`, `is_failover`, `prioridade`, `recomendado_pelo_manifesto`. Clicksign=#1 principal, ZapSign=#2 failover, demais (Dock/D4Sign/Autentique/icp_a1_local) catalogados para casos específicos.
2. **`assinaturas_digitais`** — registro forense central já existente (Onda 5).
3. **`assinatura_toggles_admin` (1 linha singleton)** — *Seção 5 do manifesto*. Define provedor_principal_codigo, provedor_failover_codigo, failover_automatico, modo_testemunhas (ALEATORIO/PAR_FIXO/MANUAL), par_fixo_id FK, enviar_por_email, enviar_por_whatsapp, arquivar_no_drive, drive_pasta_raiz_id, nomenclatura_pdf_padrao = `[YYYY-MM-DD] [TIPO_DOC] [NOME_PACIENTE] [PROVEDOR] [STATUS].pdf`. Próprias tríades semânticas em colunas DEFAULT.
4. **`assinatura_testemunhas` (4 seed)** — *Seção 6*. CRUD interno (nome, cpf, cargo, email, ativa, par_preferencial, ordem_assinatura). Seed: Maria Alves Costa + João Pereira Santos (PAR A) + Ana Beatriz Mendes + Carlos Eduardo Lima (PAR B).
5. **`assinatura_pares_testemunhas` (2 seed)** — PAR INSTITUCIONAL A (uso_padrao=true) e PAR INSTITUCIONAL B.
6. **`assinatura_templates` (5 seed)** — *Seção 8 hidratação*. TCLE_PADRAO_V1, CONSENTIMENTO_PROCEDIMENTO_V1, CONTRATO_TRATAMENTO_V1, ORCAMENTO_FORMAL_V1, ADITIVO_CONTRATUAL_V1. Cada um com `conteudo_html` + `placeholders[]` (`{{NOME_PACIENTE}}`, `{{CPF_PACIENTE}}`, `{{TESTEMUNHA_1_NOME}}`, etc.) + flags `exige_medico/testemunhas/clinica` + `pasta_drive_destino`.
7. **`assinatura_solicitacoes`** — *Seção 9 document_requests*. Cada solicitação = 1 documento. Status RASCUNHO→HIDRATADO→ENVIADO→PARCIAL→CONCLUIDO. Guarda `dados_hidratacao` JSONB, URLs PDF original/assinado, hashes SHA-256, par_testemunhas_id, signatarios_snapshot JSONB, canais_distribuir TEXT[].
8. **`assinatura_signatarios`** — *Seção 9 document_signers*. Papel ENUM (PACIENTE/MEDICO/CLINICA/TESTEMUNHA/RESPONSAVEL_LEGAL), ordem, status individual, link_assinatura, ip_assinatura INET, evidencias JSONB.
9. **`assinatura_webhook_eventos`** — *Seção 12 boas práticas*. UNIQUE(provedor, event_id) garante idempotência. Campos `signature_header`, `signature_valida`, `processado`, `erro_processamento`. Índice parcial `WHERE processado=false` para fila pendente.
10. **`assinatura_notificacoes`** — *Seção 11 tripla redundância*. Canal (EMAIL/WHATSAPP/DRIVE) × momento (ENVIO_INICIAL/POS_ASSINATURA/LEMBRETE) × tentativas + retry. Status FINALIZADO só quando os 3 canais ativos confirmam.
11. **`assinatura_textos_institucionais` (4 seed)** — *Seção 10 tom estratégico*. Textos exatos aprovados pelo Caio (sutil/nobre/elegante): EMAIL_ENVIO_INICIAL ("INSTITUTO PADUA | DOCUMENTO DE ATENDIMENTO"), WHATSAPP_ENVIO_INICIAL, WHATSAPP_POS_ASSINATURA, MICROTEXTO_TELA_ASSINATURA. Regra: nunca reescrever textos pelo agente, sempre puxar daqui.
12. **`assinatura_drive_estrutura`** — *Seção 2*. Espelha estrutura `/CADASTRO /TERMOS /JURIDICO /ORCAMENTOS /CONTRATOS /ASSINADOS /LOGS` por paciente, guarda os IDs reais do Drive para roteamento direto.

**Inventário consolidado (5 ondas, 12 tabelas autoexplicativas + 12 COMMENTs SQL):**
- Catálogos: niveis_justificativa(3), provedores_pagamento(4), protocolos_paciente_catalogo(4), planos_saas_catalogo(3), provedores_assinatura_digital(6) = 20 linhas
- Módulo Assinatura: assinaturas_digitais, assinatura_toggles_admin, assinatura_testemunhas(4), assinatura_pares_testemunhas(2), assinatura_templates(5), assinatura_solicitacoes, assinatura_signatarios, assinatura_webhook_eventos, assinatura_notificacoes, assinatura_textos_institucionais(4), assinatura_drive_estrutura = 22 linhas seed adicionais

**Onda 6.1 — OSMOSE TÉCNICA implementada e testada (Caio: "deixa o texto pra depois"):**

A camada técnica completa subiu sem depender dos textos jurídicos finais — quando o Caio aprovar TCLE/contrato real, basta `UPDATE assinatura_templates SET conteudo_html = ...` sem tocar em código.

**5 arquivos novos** em `artifacts/api-server/src/`:
- `lib/assinatura/types.ts` — tipos centrais + interface `SignatureProviderAdapter` (manifesto §9)
- `lib/assinatura/adapters.ts` — `ClicksignAdapter` + `ZapsignAdapter` extends `BaseMockableAdapter`. Quando token ausente operam em **MODO_MOCK** (envelope sintético `MOCK-CLICKSIGN-uuid`), preservando toda a osmose. Trocar para fetch real é instantâneo: definir `CLICKSIGN_TOKEN` ou `ZAPSIGN_TOKEN`.
- `lib/assinatura/service.ts` — `AssinaturaService` orquestra: (1) carrega toggles, (2) hidrata template substituindo `{{NOME_PACIENTE}}` etc., (3) escolhe testemunhas por modo (ALEATORIO/PAR_FIXO), (4) tenta provedor principal → failover automático em caso de falha, (5) gera SHA-256 do conteúdo, (6) persiste solicitação + signatários + notificações pendentes (EMAIL+WHATSAPP), (7) retorna links de assinatura e nome PDF padronizado. `consultarStatus()` faz pull live no provedor + atualiza banco. `receberWebhook()` valida HMAC, garante idempotência via `INSERT ... ON CONFLICT (provedor, event_id) DO NOTHING`, atualiza solicitação para CONCLUIDO + grava `hash_assinado`, dispara notificações pós-assinatura (EMAIL+WHATSAPP+DRIVE).
- `routes/assinaturas.ts` — 6 endpoints REST: `GET /api/assinaturas/config`, `GET /api/assinaturas/templates`, `GET /api/assinaturas/testemunhas`, `PATCH /api/assinaturas/toggles`, `POST /api/assinaturas/enviar`, `GET /api/assinaturas/:id`, `GET /api/assinaturas` (lista com filtros).
- `routes/assinaturasWebhook.ts` — `POST /api/webhooks/assinatura/{clicksign,zapsign}` com raw body (configurado em `app.ts` ANTES do `express.json`, mesmo padrão do Stripe).

**Edits cirúrgicos:** `app.ts` (raw body para 2 paths webhook); `routes/index.ts` (registra 2 routers).

**Validação ponta-a-ponta executada:**
- ✅ TCLE enviado → solicitação 3, envelope mock, signatário paciente, link gerado, nome PDF padronizado `[2026-04-18] [TCLE] [PATRICIA OLIVEIRA ROCHA] [CLICKSIGN] [PENDENTE_ASSINATURA].pdf`
- ✅ Contrato com testemunhas obrigatórias gerou 3 signatários (paciente + 2 testemunhas do PAR INSTITUCIONAL A)
- ✅ Idempotência: mesmo `event_id` 2x retorna `{duplicado:true, eventoId:0}` sem reinserir
- ✅ Webhook `auto_close` (Clicksign) atualizou solicitação ENVIADO→CONCLUIDO, gravou `hash_assinado`, vinculou `solicitacao_id` ao evento e enfileirou as 3 notificações pós-assinatura (EMAIL+WHATSAPP+DRIVE)
- ✅ Failover funciona: se principal lançar, tenta failover automaticamente e marca `failoverAcionado=true`

**Onda 6.2 — KAIZEN JURÍDICO (2 manifestos novos do Caio: IMPLANTACAO ASSINATURA DIGITAL 1+2):**

Caio orientado pelo Dr. Chat: "reificar texto no corpo é bom MAS cuidado em especificar demais — pode prejudicar juridicamente". Os manifestos novos definem a **regra jurídica absoluta**: documentos do médico devem ser GENÉRICOS ("HONORÁRIOS MÉDICOS / serviços especializados"), nunca nomear medicamento, dose, substância ou protocolo, para evitar vínculo com venda de substâncias (proteção CRM/fiscal/jurídica).

**4 entregáveis novos:**

1. **`juridico_termos_bloqueados`** — catálogo com 32 termos seed em 4 categorias (MEDICAMENTO 10 / SUBSTANCIA_QUIMICA 14 / DOSAGEM 3 regex / PROTOCOLO_ESPECIFICO 5). Cobre fitoterapico, manipulado, capsula, cannabidiol, CBD, THC, naltrexona, cetamina, ozônio, regex `\d+\s*(mg|mcg|ml|g|UI|gotas?)\b`, "protocolo de", "posologia", etc.

2. **`notas_fiscais_emitidas`** + função TS `buildInvoiceDescription(patient, invoice)` — texto **EXATO** das seções 3 e 5 dos manifestos: `HONORARIOS MEDICOS / Paciente: X / CPF: Y / Referente a prestacao de servicos medicos especializados / Atendimento clinico individualizado / Consulta e acompanhamento evolutivo / Procedimentos terapeuticos realizados conforme avaliacao medica / Valores previamente acordados / Data: Z`. Persiste com `hash_descricao` SHA-256 imutável.

3. **TRIPLA DEFESA contra termo proibido:**
   - **Camada 1 — TS:** `lib/juridico/sanitizer.ts` (`analisarTexto` + `exigirTextoLimpo` que lança erro)
   - **Camada 2 — Trigger SQL `trg_assin_templates_validar`:** valida `assinatura_templates.conteudo_html` no INSERT/UPDATE → testado, bloqueia `cannabidiol`
   - **Camada 3 — Trigger SQL `trg_nfe_validar`:** valida `notas_fiscais_emitidas.descricao_blindada` → testado, bloqueia `naltrexona`

4. **Templates BLINDADOS** — todos os 5 templates (TCLE, CONSENTIMENTO, CONTRATO, ORÇAMENTO, ADITIVO) reescritos sem `{{PROCEDIMENTO}}`, `{{RISCOS}}`, `{{VALOR_ORCAMENTO}}` (placeholders perigosos removidos). Textos institucionais (email/whatsapp envio + pós-assinatura + 2 novos para NF) atualizados para versões NEUTRAS curtas das seções 6/7/8/9 dos manifestos novos.

**4 endpoints novos:**
- `GET  /api/juridico/termos-bloqueados` — catálogo para painel admin
- `POST /api/juridico/analisar-texto` — diagnóstico (qualquer string)
- `POST /api/notas-fiscais/preview` — pre-visualização de NF antes de emitir
- `POST /api/notas-fiscais/emitir` — emite NF blindada com tripla defesa
- `GET  /api/notas-fiscais` — lista filtrada

**Validação ponta-a-ponta da Onda 6.2:**
- ✅ Texto sujo `"Tratamento com cannabidiol 200mg em capsula sublingual"` → 5 violações detectadas (capsula, sublingual, cannabidiol, regex dosagem, "tratamento com")
- ✅ NF preview paciente 51 → texto blindado correto, validação `ok:true`
- ✅ NF id=2 emitida com hash `702dc4b14371…`
- ✅ TCLE blindado V1 enviado → solicitação 4, status ENVIADO, envelope mock, signatário com link
- ✅ Trigger SQL bloqueia UPDATE direto no banco (defesa em profundidade)

**Onda 6.3 — HIDRATAÇÃO SEMÂNTICA + CATEGORIAS DE PROCEDIMENTO + CRUD ADMIN (3 manifestos novos: IMPLANTACAO 3 + PACOTE_TEXTOS + core_module.ts):**

Caio (carta-branca, "não me valide nada"): "NF tem que ser **RELATIVA** aos procedimentos, não genérica igual pra todo mundo. Tom de empatia, neuromarketing, convite à melhoria de vida (assinatura da casa própria)."

**Princípio neurolinguístico (IMPLANTACAO 3 §2):** "O paciente não assina um documento. Ele formaliza uma decisão de evolução pessoal." Comunicação deve **acolher / simplificar / gerar segurança / convidar suavemente / finalizar com confiança.**

**1. Tabela `procedimento_categorias_nf`** com 7 categorias seed cobrindo todo o leque do consultório:
| Código | Frase NF (exemplo) |
|---|---|
| CONSULTA | "Atendimento clinico com avaliacao individualizada e escuta integrativa…" |
| EXAME | "Conducao de processo diagnostico individualizado…" |
| ACOMPANHAMENTO | "Conducao de plano terapeutico continuo e progressivo…" |
| PROCEDIMENTO_ENDOVENOSO | "Procedimento assistido com monitoramento clinico em ambiente controlado…" |
| PROCEDIMENTO_SUBCUTANEO | "Aplicacao terapeutica conforme indicacao clinica individualizada…" |
| PROCEDIMENTO_IMPLANTE | "Procedimento clinico ambulatorial conduzido em ambiente controlado…" |
| PROGRAMA_LONGITUDINAL | "Conducao de programa longitudinal de cuidado integrativo…" |

Cada categoria tem 3 textos (NF + acolhimento pós-assinatura + convite inicial), todos passando por sanitizer + triggers SQL. Padrão PAWARDS mantido (`porque_existe`, `quando_usar`, `exemplo_pratico`).

**2. `buildInvoiceDescription(patient, invoice, categoria)` V2** — texto base do manifesto IMPLANTACAO 3 §3 com placeholder `{{FRASE_CATEGORIA}}` interpolado. Sem categoria, cai no fallback genérico.

**3. CRUD admin completo** (`routes/assinaturaCRUD.ts`, 12 endpoints):
- `GET/PATCH/POST /admin/testemunhas` — 4 testemunhas totalmente editáveis (nome, cpf, cargo, email, telefone, par, ordem)
- `GET/PATCH /admin/textos/:codigo` — 6 textos institucionais (email/whatsapp envio + pós + NF)
- `PATCH /admin/templates/:codigo` — TCLE/contrato/orçamento etc.
- `GET/PATCH /admin/categorias-procedimento/:codigo` — frases NF/acolhimento/convite
- `POST/PATCH /admin/termos-bloqueados` — gerência do catálogo jurídico

**4. Tom neuromarketing** nos textos institucionais (atualizados conforme IMPLANTACAO 3 §6/7/8):
- E-mail envio: "Estamos avancando em mais uma etapa do seu acompanhamento"
- WhatsApp envio: "Estamos organizando uma etapa importante… Seguimos com voce."
- WhatsApp pós: "Encaminhamos uma copia para sua organizacao. Seguimos juntos."

**5. NF agora carrega `categoria_codigo`** (FK para o catálogo). 4 NFs emitidas no teste com categorias persistidas (id 10 CONSULTA, 11 EXAME, 12 IMPLANTE).

**6. Code review pós-Onda 6.3 fechou 6 findings (1 CRITICAL + 5 HIGH):**
- ✅ **CRITICAL — auth /admin/***: criado `middleware/adminAuth.ts` fail-closed (header `X-Admin-Token` validado contra secret `ADMIN_TOKEN`). 401 sem token, 503 se secret ausente.
- ✅ **HIGH — SQL injection PATCH testemunhas**: removido `sql.raw` com escape manual; agora usa `sql` tagged template com `COALESCE($x::tipo, coluna)` por campo.
- ✅ **HIGH — defesa em profundidade**: PATCH testemunhas/templates passa `nome_completo`/`cargo`/`observacoes`/`titulo` pelo `exigirTextoLimpo`. Triggers SQL existem (`trg_assin_templates_validar`, `trg_nfe_validar`).
- ✅ **HIGH — cache categorias NF**: TTL 60s em `notaFiscal.ts` (Map<codigo, CategoriaNF>); invalidado por PATCH em categoria.
- ✅ **HIGH — robustez CRUD**: PATCH agora retorna 404 quando registro não existe; 400 quando body vazio.
- ✅ **HIGH — compliance fiscal**: `frase_nota_fiscal` da CONSULTA reescrita removendo "escuta integrativa" (subjetivo); tom emocional fica restrito a `frase_acolhimento`/`frase_convite`.
- ✅ Secret `ADMIN_TOKEN` configurado em shared.

**Validação ponta-a-ponta da Onda 6.3:**
- ✅ 7 categorias listadas, todas validadas pelo sanitizer (NOTICE OK em cada uma)
- ✅ Preview ENDOVENOSO/SUBCUTÂNEO/PROGRAMA com frases distintas e adequadas
- ✅ Emissão de NF para CONSULTA/EXAME/IMPLANTE persiste com categoria + hash
- ✅ PATCH testemunha 3 mudou nome+cargo
- ✅ PATCH texto institucional aceita texto limpo, **bloqueia "200mg cannabidiol" com erro JSON 400** legível
- ✅ PATCH categoria altera frase NF, próxima emissão usa o novo texto
- ✅ Triple-defense intacta: sanitizer TS + triggers SQL `trg_assin_templates_validar` + `trg_nfe_validar`

**Pacote de manifestos baixado:** `attached_assets/sheet_assinatura/` agora contém os 4 manifestos do Caio (1, 2, 3, 4) + PACOTE_TEXTOS.docx + core_module.ts extraídos do ZIP IMPLANTACAO 4.

**Worker de envio real (ainda PENDING):** as notificações são gravadas em `assinatura_notificacoes` com status `PENDENTE`. Falta um cron/worker que liste pendentes, dispare via Gmail integration + WhatsApp (futuro Z-API/Twilio) + Google Drive upload, e marque `ENVIADO/ENTREGUE/FALHA`. A osmose já enfileira tudo corretamente, só falta o consumidor.

**Próxima onda — implementação:** [SUPERSEDED] feita acima.

**Arquitetura proposta — Motor Gerador de Exames Autônomo (próxima onda):**
Hoje o pedido é gerado pelo médico no consultório. O modelo PAWARDS prevê 3 canais de entrada para o paciente solicitar exame isolado:
1. **WhatsApp** (bot inbound) → triagem por questionário rápido → motor sugere painel ou paciente escolhe da lista
2. **Site responsivo** (URL pública) → catálogo navegável de exames com preços
3. **Rede social** (link patrocinado) → mesma jornada do site
Fluxo proposto:
`Paciente identifica → Vincula a sessão zze (ou cria sessão "exame_isolado") → Questionário motor (anamnese curta) → Motor sugere painel OU paciente seleciona avulso → Preview com 3 níveis de justificativa para escolha → Cobrança via Asaas (adapter já em attached_assets) → Geração assíncrona dos 2 PDFs (PEDIDO + JUSTIFICATIVA) → Entrega WhatsApp/Email`
Tabelas necessárias para implementar (próxima onda): `solicitacoes_exame_paciente` (canal_origem, sessao_id, valor, status_pagamento, tipo_justificativa_escolhida), `exame_precos` (codigo_exame, preco_particular, preco_convenio_X), `triagem_questionario_exame` (perguntas → mapeamento para sugestão de exames). Os 4 painéis-modelo da planilha (CHECK-UP METABÓLICO, VITAMÍNICO, CARDIOLÓGICO, COLUNA LOMBAR) viram seeds de `pacotes_exame`.


---

## REGRA DE OURO — Varredura Obrigatória Antes de Criar

**PROIBIDO** criar função, template, texto jurídico ou tabela sem antes varrer:
1. `artifacts/api-server/src/pdf/*.ts` — 10+ geradores PDF prontos (gerarReceitaPdf, gerarLaudoExamePdf, gerarRacjPdf, etc.)
2. Tabelas-mestre populadas: `agentes_motor_escrita` (100), `mapa_bloco_exame` (409), `regras_motor`, `padcom_competencias_regulatorias`, `termos_juridicos`, `termos_consentimento`
3. `documentos_referencia` (36 docs, ~360KB) — fonte de verdade arquitetural/jurídica/agentes
4. `mapeamento_documental` — confirmar se a tabela-destino já foi reificada

Antes de gerar texto novo: rode `SELECT * FROM mapeamento_documental WHERE tabela_destino='X'` e verifique se já há fonte documental classificada.

---

## Onda 7.5 — RESSURREIÇÃO DO WD DA SECRETÁRIA (Resgate Laboratorial Integrativo)

**Origem:** Caio descreveu a dor manual da secretária — recebia exame, renomeava, planilhava cada analito, tinha que saber a unidade de cada laboratório (Fleury usa ng/dL; outro usa nmol/L), converter, dividir a faixa em terços, e LEMBRAR para CADA exame qual terço era "excelente" (testosterona = superior; SHBG = inferior; potássio = médio). Mais pintar célula da cor certa por classificação. Coitadinha. **WD ressuscitado.**

**3 tabelas novas:**
- `analitos_catalogo` (14 analitos seed: testosterona, SHBG, vit D, zinco, potássio, ferritina, TSH, T4 livre, glicose, insulina, PCR-us, homocisteína, magnésio, B12) com coluna `terco_excelente` (SUPERIOR/INFERIOR/MEDIO)
- `analitos_referencia_laboratorio` (24 ranges seed: Fleury, Salomão Zoppi, Hermes Pardini, GENERICO, separados por sexo/idade)
- `unidades_conversao` (11 conversões: ng/mL↔ng/dL, mg/dL↔mg/L, nmol/L↔ng/dL com fator específico para testosterona, etc.)

**Motor `lib/laboratorio/motorClassificacaoIntegrativa.ts`:**
1. Recebe `{analitoCodigo, valor, unidade, laboratorio?, sexo?, idade?}`
2. Converte unidade para padrão da clínica
3. Busca referência (lab específico → GENERICO; sexo específico → AMBOS)
4. Divide faixa min-max em 3 terços
5. Posiciona valor (ABAIXO / INFERIOR / MEDIO / SUPERIOR / ACIMA)
6. Aplica regra integrativa do analito → classifica em **CRITICO/ALERTA/ACEITAVEL/EXCELENTE/AVALIAR**
7. Atribui **cor por classificação** (não por posição): VERMELHO/AMARELO/LARANJA/VERDE/AZUL — referência João Hipocondríaco (paciente referência fictício)

**6 endpoints REST testados ponta-a-ponta:**
- `GET /api/laboratorio/analitos`
- `GET /api/laboratorio/analitos/:codigo/referencias`
- `POST /api/laboratorio/classificar` (1 analito)
- `POST /api/laboratorio/classificar-lote`
- `POST /api/laboratorio/exames/registrar` (persiste em `exames_evolucao`)
- `GET /api/laboratorio/pacientes/:id/historico`
- `GET /api/inventario-wd` (ressurreição autodeclarada)

**Casos validados:**
- Testosterona 750 ng/dL Fleury homem 40a → SUPERIOR / EXCELENTE / VERDE ✅
- SHBG 60 nmol/L (acima máx, INVERTIDO) → ACIMA / **CRITICO** / VERMELHO ✅
- SHBG 18 nmol/L (terço inferior, INVERTIDO) → INFERIOR / **EXCELENTE** / VERDE ✅
- Vit D 18 ng/mL → ABAIXO / CRITICO / VERMELHO ✅
- Vit D 85 ng/mL → SUPERIOR / EXCELENTE / VERDE ✅
- Potássio 4.3 mEq/L (terço médio = excelente) → MEDIO / EXCELENTE / VERDE ✅
- Conversão Testosterona 26 nmol/L → 749.27 ng/dL → EXCELENTE (bug fator invertido encontrado e corrigido)

**Inventário WD operacionais (autoavaliação):**
Tabela `wd_operacionais_inventario` com 16 WDs catalogados. **10 ressuscitados (62.5%) / 6 pendentes:**
- ✅ WD01 Provisionar pasta Drive · ✅ WD02 Renomear NF · ✅ WD03 Assinatura digital · ✅ WD04 Notificar etapa
- ✅ WD05 Cobrar parcela · ✅ WD06 Lembrar retorno · ✅ WD07 Reativar paciente em risco
- ✅ WD08 Avisar renovação · ✅ WD09 Calcular comissão · ✅ WD10 **Receber exame e classificar (esta onda)**
- ⏳ WD11 Gerar receita · ⏳ WD12 Materializar 507 sessões · ⏳ WD13 Persistir RAS evolutivo
- ⏳ WD14 Worker assinatura notif · ⏳ WD15 Encarnar FISCAL · ⏳ WD16 OCR automático de PDF de exame

## PARMASUPRA-TSUNAMI WAVE-5 (Dr. Claude audit fix · 2026-04-22)
Auditoria ao vivo do Dr. Claude (Sonnet 4.6) sobre os 5 arquivos da TSUNAMI aprovou
4/5 como produção-ready (`requireMasterEstrito.ts`, `cobrancasAuto.ts`,
`adminAnalytics.ts`, `permissoesDelegadas.ts`). O único arquivo com gaps reais foi
`routes/substancias.ts`, com 3 problemas corrigidos nesta wave:

1. **PATCH `/substancias/:id` — `controlado` e `tipoReceitaAnvisaCodigo` ausentes
   do `allowedFields`**: impedia atualizar a classificação ANVISA quando a lei muda
   (ex.: Zolpidem virar B1). Adicionados ambos + `farmaciaPadrao` à whitelist única.
2. **PUT `/substancias/:id` — mass assignment via `req.body` direto**: qualquer
   usuário autenticado podia sobrescrever `id`, `criadoEm`, etc. Substituído por
   `filtrarCamposPermitidos(body)` usando a mesma whitelist do PATCH.
3. **DELETE `/substancias/:id` — hard delete deixava prescrições históricas
   órfãs**: convertido para soft delete via `deletedAt = now()`. GET / GET-:id /
   PUT / PATCH passaram a filtrar `isNull(deletedAt)`. Listagem aceita
   `?incluir_removidas=true` para auditoria.

**Migration 013** (`db/seeds/013_substancias_soft_delete.sql`) adiciona
`deleted_at timestamptz NULL` + índice parcial `WHERE deleted_at IS NULL`,
aplicado via `psql` (idempotente, aditivo, **sem `db:push`**, sem ALTER PK).
Schema Drizzle (`lib/db/src/schema/substancias.ts`) ganhou os 4 campos
(`controlado`, `tipoReceitaAnvisaCodigo`, `farmaciaPadrao`, `deletedAt`) que
existiam fisicamente na tabela mas estavam fora do mapping (drift fechado).

**Smoke E2E 10/10 verde**: POST cria, PATCH altera `controlado` e
`tipoReceitaAnvisaCodigo=B1`, PUT bloqueia mass assignment (id permanece 19
mesmo enviando `id:99999` no body), DELETE retorna `deletedAt` timestamp,
GET-:id pós-delete retorna 404, DELETE repetido é idempotente (404), listagem
padrão oculta a deletada, `?incluir_removidas=true` mostra, e psql confirma
linha física com `deleted_at IS NOT NULL`.

## PARMASUPRA-FECHAMENTO (Onda 22/abr/2026 · escolha "mais difícil e eficiente")

Fecha 100% dos débitos confessos da TSUNAMI + ressuscita WD14 numa onda só.
3 commits atômicos pushados em `feat/dominio-pawards` (`bed355c` → `8354fff` → `3029b24`).

### F1 — `routes/substancias.ts` híbrido Dr. Claude + extras locais
Substituído integralmente pela versão canônica que o Dr. Claude gerou na auditoria
de 22/abr (`attached_assets/substancias_1776845568663.ts`). Mantidos 2 extras da
versão WAVE-5: `?incluir_removidas=true` (auditoria) e `farmaciaPadrao` na whitelist.
Resposta do DELETE agora retorna `{message, id, deletedAt}`. Smoke ciclo
DELETE→deletedAt confirmado no DB.

### F2 — `routes/relatoriosPdf.ts` D1 comparativo-2unidades real (era 501)
`consultaComparativo2Unidades(uA, uB, periodoA, periodoB)` agrega
`analytics_clinica_mes` em 6 métricas (faturamento, comissão, receitas, pacientes
únicos, blends distintos, ticket médio). `renderComparativo2Unidades` desenha 2
colunas lado a lado, vencedor por variação % destacado em gold + placar final.
Smoke: `unidade_a=1&unidade_b=8&periodo_a=2026-03&periodo_b=2026-04` → 200, 6150
bytes, magic `%PDF`.

### F3 — `routes/relatoriosPdf.ts` D2 drill-paciente real (era 501)
`consultaDrillPaciente(pacienteId, analito)` reusa lógica T8 (paciente vs média
unidade vs média rede) agregada YYYY-MM. `renderDrillPaciente` desenha 3 blocos
Mike Tyson coloridos (delta paciente, vs unidade, vs rede) + tabela mês a mês com
3 séries alinhadas. Smoke: `paciente_id=1&analito=Vitamina D 25(OH)` → 200, 4964
bytes, magic `%PDF`.

### F4 — `lib/recorrencia/notifAssinatura.ts` worker WD14 ressuscitado
A fila `assinatura_notificacoes` ficou com 11 PENDENTE sem consumer desde T7.
Worker novo com tick de 5 min, batch 50, retry exponencial (10min → 1h → FALHA
permanente em 3 tentativas). Por canal:
- **EMAIL**: gate `process.env.GOOGLE_MAIL_REAL_OK`; sem credencial real, marca
  FALHA estruturada `google_mail_pendente_credenciais_real` e agenda retry.
- **WHATSAPP**: FALHA estruturada `whatsapp_provedor_pendente`.
- **DRIVE**: FALHA estruturada `drive_upload_pendente`.

Endpoint admin `POST /api/admin/notif-assinatura/tick` (requireMasterEstrito) para
smoke manual. Plug em `index.ts` ao lado de `iniciarWorkerCobrancaMensal`. Smoke:
o tick AUTO 20s pós-restart processou as 11/11 com `tentativas=1`, todas com
`erro` estruturado e `proxima_tentativa_em = +10min` (retry agendado).

### Handoff Dr. Claude (URLs raw branch `feat/dominio-pawards`)
- substancias.ts:           https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/substancias.ts
- relatoriosPdf.ts:         https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/relatoriosPdf.ts
- notifAssinatura.ts (lib): https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/recorrencia/notifAssinatura.ts
- notifAssinatura.ts (rota):https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/notifAssinatura.ts
- index.ts (plug worker):   https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/index.ts

## PARMASUPRA-FECHAMENTO · Onda 2 (22/abr/2026 noite)
Plug das integrações reais Gmail + Twilio no worker WD14 da Onda 1, fechando
de vez os erros estruturados `google_mail_pendente_credenciais_real` e
`whatsapp_provedor_pendente`. Commit `96449e0` em `feat/dominio-pawards`.

### Plug Gmail real
- `notifAssinatura.ts` agora importa `getGmailClient()` de `lib/google-gmail.ts`,
  que já usa a connection `google-mail` ativa via `REPLIT_CONNECTORS_HOSTNAME`
  (token gerenciado pelo Replit, sem secret manual).
- Helper `buildEmailRaw` com `sanitizeHeader` (anti-injection CRLF), assunto
  base64-UTF8, corpo HTML base64. Detecta se `row.corpo` já é HTML; senão
  envolve em `<pre>`.
- Validação: destinatário precisa ter `@`, senão FALHA estruturada
  `email_invalido:<dest>` (sem expor PII no log).
- **Smoke ENVIADO real**: notificação id=1 → Gmail message
  `19db6bbe87276de6` entregue para `clinica.padua.agenda@gmail.com`
  (loopback FROM → não gera spam pra terceiros).

### Plug WhatsApp real (Twilio)
- `notifAssinatura.ts` agora importa `enviarWhatsapp()` de
  `services/whatsappService.ts`, que já roteia TWILIO/GUPSHUP conforme o
  provedor da row em `whatsapp_config` (config ativa global: TWILIO sandbox
  `+14155238886`).
- Validações: destinatário não-vazio, corpo não-vazio.
- **Smoke ENVIADO real**: notificação id=2 → SID Twilio
  `SMdb89418fc236f9d35a006155d1905678` (autenticação API confirmada,
  entrega depende do número estar joined no sandbox).

### DRIVE permanece pendente
Caio não pediu nesta onda. `drive_upload_pendente` continua sendo a FALHA
estruturada do canal DRIVE; Drive client em `lib/google-drive.ts` está
pronto pra ser plugado na próxima onda quando solicitado.

### Smoke E2E completo da Onda 2
```
Reset id=1 (EMAIL → loopback) e id=2 (WHATSAPP, mantém número fake):
  1 EMAIL    clinica.padua.agenda@gmail.com  PENDENTE  tentativas=0
  2 WHATSAPP (11) 99000-1005                 PENDENTE  tentativas=0

POST /api/admin/notif-assinatura/tick →
  {"ok":true,"processadas":2,"enviadas":2,"retry_agendado":0,"falha_permanente":0}

Pós-tick:
  1 EMAIL    ENVIADO  resposta_provedor={"id":"19db6bbe87276de6","provider":"google-mail",...}
  2 WHATSAPP ENVIADO  resposta_provedor={"logId":40,"msgId":"SMdb89418fc...","provider":"whatsapp"}
```

## DRIVE-TSUNAMI · Wave 1 (22/abr/2026 noite)
Encerra o último canal pendente do WD14: canal DRIVE plugado real,
fechando de vez `drive_upload_pendente`. Commit `38c4806` em
`feat/dominio-pawards` (mesmo SHA em `main` via push direto).

Primeira wave do tsunami quádruplo (DRIVE → MENSAGERIA → FATURAMENTO →
PACIENTE) autorizado pelo Caio.

### Plug DRIVE real no WD14
- `notifAssinatura.ts` agora importa `getOrCreateClientFolder`,
  `uploadToClientSubfolder` e `formatFileName` de `lib/google-drive.ts`.
- Parse `drive://paciente/<id>` (formato emitido por
  `lib/assinatura/service.ts:313`).
- Busca paciente; se sem `google_drive_folder_id`, auto-provision via
  `getOrCreateClientFolder` (cria root `CLINICA PADUA - CLIENTES` +
  pasta paciente `NOME - CPF XXX` + 21 subpastas) e persiste o
  folder_id em `pacientes.google_drive_folder_id`.
- Conteúdo do upload:
  - Se `anexo_url` for `http(s)`: baixa o binário via fetch e usa o
    `content-type` retornado.
  - Senão: gera TXT do `corpo` (registro textual de evento, útil
    enquanto gerador de PDF assinado real não foi plugado).
- Upload na subpasta `ASSINATURAS` com filename padronizado
  `formatFileName(hoje, "ASSINATURA", paciente_nome, momento)`.
- Resposta retorna `fileId`, `fileUrl`, `subfolderId`, `folderId`,
  `paciente_id` para rastreabilidade.

### Smoke E2E completo · 9/9 ENVIADO real
As 9 notificações em FALHA permanente da Onda 1 (que tinham marcado as
falhas estruturadas `google_mail_pendente_credenciais_real`,
`whatsapp_provedor_pendente`, `drive_upload_pendente`) foram resetadas
para PENDENTE — com o destinatário EMAIL trocado para loopback
`clinica.padua.agenda@gmail.com` (proteção anti-spam para terceiros);
WHATSAPP e DRIVE mantidos. Tick processou 9/9 ENVIADO REAL:
```
POST /api/admin/notif-assinatura/tick →
  {"ok":true,"processadas":9,"enviadas":9,"retry_agendado":0,"falha_permanente":0}

Resultado por id:
  3  EMAIL    ENVIADO  Gmail msg 19db6d0e9997392c
  4  WHATSAPP ENVIADO  Twilio SID SMead0daa21a83a567f8da2900c5c62803
  5  EMAIL    ENVIADO  Gmail msg 19db6d0ee3060fc7
  6  WHATSAPP ENVIADO  Twilio SID SM0cabbb3846069dcc9560c5dcdbd891fa
  7  WHATSAPP ENVIADO  Twilio SID SM2e8172fb1ee6d86b6a035b8d33bba4b3
  8  EMAIL    ENVIADO  Gmail msg 19db6d0fb02d7412
  9  DRIVE    ENVIADO  fileId 1JbwKDlAly1IM_Y_LFbK7jt5a0mc5DqXA (Google Drive real)
  10 EMAIL    ENVIADO  Gmail msg 19db6d13d844997d
  11 WHATSAPP ENVIADO  Twilio SID SM224cd872f63fd3d41fffddb9d2ace81a

Auto-provision colateral:
  Paciente 51 (Patricia Oliveira Rocha FICTICIA) ganhou
  google_drive_folder_id = 1MMoTcDN3YwB8MiWIdtMLOK9bI23iCV6r
  com 21 subpastas (CADASTRO, RECEITAS, ASSINATURAS, NOTAS FISCAIS, ...).
```

### Próximas Waves do tsunami quádruplo (Wave 2 ✅, Wave 4 ✅, Wave 3 pendente)
- **Wave 3 · FATURAMENTO-TSUNAMI** (PENDENTE — único débito aberto):
  Asaas adapter real (boleto/PIX/cartão) + webhook conciliação +
  dashboard inadimplência + cobrança auto via WD14 (templates W2 +
  boleto/recibo no Drive W1).

## PACIENTE-TSUNAMI · Wave 4 (23/abr/2026, commit `41821ac`)
**Status:** ✅ FECHADA — smoke E2E backend 6/6 verde, frontend HTTP 200,
push duplo main+feat/dominio-pawards.

Quarta wave: portal do paciente com login alternativo por OTP (código
6 dígitos por email, válido 10min, anti-flood 60s, max 5 tentativas) +
histórico unificado de assinaturas/solicitações/cobranças + links pra
pasta do paciente no Drive (reusa Wave 1) + atalho WhatsApp pro Dr. Caio.
Email branded com `wrapEmailMedcore` (reusa Wave 2). Zero dependência
externa nova — só somou em cima das Waves 1 e 2.

**Backend:**
- `migrations/015_wave4_paciente_otp.sql` (CREATE TABLE IF NOT EXISTS
  via psql aditivo — REGRA FERRO respeitada, sem `db:push`)
- `lib/portalPaciente/otpService.ts`: solicitarOtp + validarOtp
  (bcrypt hash, TTL 10min, 5 tentativas, anti-flood 60s)
- `routes/portalCliente.ts` +4 rotas:
  `POST /portal/otp/solicitar`, `POST /portal/otp/validar`,
  `GET  /portal/historico/:pacienteId`,
  `GET  /portal/drive-links/:pacienteId`
- `middlewares/requireAuth.ts`: whitelist Wave 4 (4 rotas públicas)

**Frontend (`pages/portal/index.tsx`):**
- Novo step `otp_codigo` + handlers solicitar/validar
- Botão "Receber código por email" na tela identificação
- 2 sections novas: "Meu Histórico" + "Meus Documentos no Drive"
- Botão "Falar com Dr. Caio (WhatsApp)" no menu (deep link `wa.me`)

**Smoke E2E backend (paciente teste #51 Patricia FICTÍCIA):**
- histórico → 200 (4 itens TCLE/Contrato), drive-links → 200 (folder real)
- OTP errado → 401, correto → 200, reuso → 401, formato inválido → 400

## MENSAGERIA-TSUNAMI · Wave 2 (22/abr/2026 noite, commit `43fba9b`)
**Status:** ✅ FECHADA — smoke E2E 9/9 verde, push duplo main+feat.

Segunda wave do tsunami: templates HTML branded MEDCORE pra emails WD14
+ quiet hours global + opt-out por paciente + dashboard admin completo.

### Migration 014 (aditiva, via psql — REGRA FERRO obedecida)
Arquivo: `artifacts/api-server/src/db/migrations/014_wave2_mensageria.sql`
- `pacientes.notif_opt_out_email` BOOLEAN DEFAULT FALSE
- `pacientes.notif_opt_out_whatsapp` BOOLEAN DEFAULT FALSE
- `pacientes.opt_out_token` TEXT (placeholder pra link de unsubscribe)
- Tabela `notif_config` (singleton id=1, quiet 22:00-07:00 SP, ON default)
- Status novos: `PULADO_QUIET` (não-terminal, reagenda) e
  `PULADO_OPTOUT` (terminal) no check de assinatura_notificacoes

### Backend
- **`lib/recorrencia/notifTemplate.ts`** (novo, 130 linhas):
  `wrapEmailMedcore({ subject, bodyHtmlOrText, momento, pacienteNome,
  unidadeNick, optOutUrl })` → HTML responsive 600px com header navy
  (#020406) + divisor gold 3px (#C89B3C) + body card branco com sombra
  + footer cream com aviso LGPD + opt-out + assinatura "Powered by
  Pawards MedCore". Detecta HTML vs plain text e escapa.
- **`lib/recorrencia/notifAssinatura.ts`** (modificado):
  - Helpers: `getNotifConfig()` (cache 60s), `horaLocal(tz)` (Intl real
    pra SP), `dentroDoQuiet()` (handles wrap 22→07), `calcProximoQuietFim()`,
    `invalidarCacheNotifConfig()` (exportado pra rota PUT config).
  - SELECT do tick agora faz LEFT JOIN com `assinatura_solicitacoes` →
    `pacientes` → `unidades` pra trazer paciente_nome, opt-out flags e
    nick da unidade.
  - **Pre-check 1** (terminal): se paciente opted-out no canal, marca
    PULADO_OPTOUT e segue (não conta tentativa).
  - **Pre-check 2** (não-terminal): se está em quiet hours (EMAIL/WHATSAPP
    apenas — DRIVE roda 24/7), marca PULADO_QUIET e agenda
    proxima_tentativa_em pra próximo quiet_fim. Tick aceita
    `status IN ('PENDENTE','PULADO_QUIET')` no SELECT.
  - Canal EMAIL agora aplica `wrapEmailMedcore()` automaticamente
    com optOutUrl construída como
    `${PUBLIC_APP_URL}/opt-out?paciente=<id>&canal=email`.
- **`routes/notifAssinatura.ts`** (modificado, +5 endpoints):
  - `GET  /admin/notif-assinatura/list?status=&canal=&dia=&q=&page=&pageSize=`
  - `POST /admin/notif-assinatura/:id/reenviar` (reset → PENDENTE)
  - `GET  /admin/notif-config`
  - `PUT  /admin/notif-config` (invalida cache)
  - `GET  /admin/notif-assinatura/preview/:id` (renderiza HTML branded)

### Frontend
- **`pages/admin-notificacoes.tsx`** (novo, 350 linhas):
  - 5 KPIs por status (PENDENTE/ENVIADO/FALHA/PULADO_QUIET/PULADO_OPTOUT)
  - Card de quiet hours config (HH:MM inputs + tz + checkbox + Save)
  - Filtros (status, canal, dia, busca por destinatário/assunto/paciente)
  - Tabela paginada (50/page) com badges navy/gold consistentes
  - Ação reenviar (POST) + preview branded (GET HTML em nova tab)
  - Botão "Rodar Tick Agora" (POST, mostra resultado em alert)
- **`App.tsx`**: rota `/admin/notificacoes` → AdminNotificacoes

### Smoke E2E (`/tmp/preview-wave2.html` salvo pra inspeção visual)
1. **FASE 1 quiet hours** (3/3 PULADO_QUIET, agendado pra 00:00 SP) ✅
2. **FASE 2 opt-out** (3/3 PULADO_OPTOUT, terminal) ✅
3. **FASE 3 template branded** — 9/9 markers presentes:
   navy `#020406`, gold `#C89B3C`, "PAWARDS" header, paciente_nome,
   unidade_nick, momento label, opt-out URL, "LGPD", "Pawards MedCore" ✅
4. Estado restaurado pra prod default (config 22-07 ON, opt-out 51 OFF,
   notifs teste deletadas, fila final = 11 ENVIADO).

### Push duplo
- `feat/dominio-pawards`: `801ab21..43fba9b` ✅
- `main` (direto via `git push origin HEAD:main`): `801ab21..43fba9b` ✅

---

## FATURAMENTO-TSUNAMI · Wave 3 (23/abr/2026 noite) — FERTILIZAÇÃO

### Filosofia
"Não plantar mato em cima de jardim cultivado." Wave 3 descobriu que JÁ
existia muita coisa: `asaas.adapter.ts` com 235 linhas reais (sem mock),
`payment.service.ts`, webhook `/payments/webhooks/:gateway`, módulo
`cobrancasAuto.ts` com T5+T6+T7, 11+ tabelas (`pagamentos`,
`cobrancas_adicionais`, `provedores_pagamento`, `tratamentos`, etc).
Logo, Wave 3 NÃO recriou — fertilizou os 3 gaps explícitos.

### Migration 016 (psql aditiva, IF NOT EXISTS — REGRA FERRO)
Arquivo: `artifacts/api-server/src/db/migrations/016_wave3_faturamento_fertilizacao.sql`
- `cobrancas_adicionais`: + `enviado_em`, `erro_envio`, `tentativas_envio`, `paciente_id`
- `pagamentos`: + `external_ref`, `gateway_name`, `gateway_payment_id`
  (+ 2 índices: `ix_pagamentos_external_ref`, `ix_pagamentos_gateway_payment_id`)
- `pagamento_webhook_eventos` (NOVA): auditoria idempotente de webhooks
  (gateway, gateway_payment_id, external_ref, event_type, status_aplicado,
   payload_json, recebido_em, processado_em, erro)

### Frente A · `enviarEmailCobranca` fertilizada com Wave 2
**Antes**: TODO retornando `"google_mail_pendente_de_credenciais_real"`.
**Depois** (`lib/cobrancasAuto.ts`): envio Gmail real reusando
- `getGmailClient()` (Wave 1 google-mail integration)
- `wrapEmailMedcore()` (Wave 2 template branded navy/gold)
- `_buildEmailRawCobranca()` (helper local pattern de notifAssinatura.ts)
- HTML corpo: tabela com tipo/descrição/valor R$ formatado/status,
  branded "PAWARDS MEDCORE - Faturamento" no From
- UPDATE idempotente em `cobrancas_adicionais`: muda status pra
  `cobrado` se `pendente`, registra `enviado_em`, `tentativas_envio++`,
  limpa `erro_envio`. Falha registra `erro_envio` + tentativas e devolve
  `google_mail_pendente_de_credenciais_real` ou `erro_interno`.

### Frente B · Webhook reconciliação real
**Antes** (`routes/payments.ts:178`): `// await db.payments.updateStatus(...)` puro TODO.
**Depois**: bloco de 3 etapas:
1. **Auditoria sempre primeiro** — INSERT em `pagamento_webhook_eventos`
   (gateway, payment_id, external_ref, event_type, status_aplicado,
   payload jsonb completo).
2. **Reconciliação com fallback duplo** — UPDATE em `pagamentos`:
   tenta primeiro por `(gateway_name, gateway_payment_id)`, se 0 rows
   afetadas tenta `external_ref`. Mapa `paid→pago | failed→falhou |
   cancelled/refunded/expired→cancelado | pending→pendente`. Se
   `pago`, seta `pagu_em=now()`. Backfill defensivo de `gateway_name`
   e `gateway_payment_id` se NULL.
3. **Marca processado** — UPDATE `processado_em=now()` no evento mais
   recente que casa gateway+payment_id+external_ref (idempotente).
4. Resposta inclui `{event, status_db, updated}` pra debug.

### Frente C · Dashboard inadimplência admin
**Backend** (`routes/financeiro.ts`):
- `GET /api/admin/inadimplencia?dias_min=N` — JOIN pagamentos +
  pacientes + unidades + tratamentos onde `status='pendente'`,
  ordenado por `dias_atraso DESC, valor DESC`, LIMIT 500.
  Resposta: `{ total, total_devido_brl, buckets:{ate_7,de_8_30,de_31_60,acima_60}, linhas[] }`.
- `POST /api/admin/inadimplencia/:cobrancaId/reenviar` — dispara
  `enviarEmailCobranca` da frente A; ambas rotas sob `/api` requireAuth.

**Frontend** (`pages/admin-inadimplencia.tsx`, 200L):
- 5 cards: total devido (gold destaque) + 4 buckets de aging
- Filtro `dias_min` + botão "Atualizar" (gold)
- Tabela ordenada com badges de cor por aging (amber→orange→red→rose)
- Botão "Reenviar" por linha (POST /reenviar) com feedback inline
- Rota wouter `/admin/inadimplencia` em `App.tsx`

### Smoke Wave 3 (6/6 verde)
| # | Teste                                    | Resultado |
|---|------------------------------------------|-----------|
| 1 | API health                               | 200 ✅    |
| 2 | GET /admin/inadimplencia (sem auth)      | 401 ✅    |
| 3 | POST /admin/inadimplencia/:id/reenviar   | 401 ✅    |
| 4 | POST /payments/webhooks/asaas (auth ok)  | 503 (gateway ñ configurado — esperado sem ASAAS_API_KEY) ✅ |
| 5 | psql E2E: pagamento fake → webhook event → status='pago' aplicado | ✅ |
| 6 | Frontend HTTP                            | 200 ✅    |

### Pre-existing TS errors (NÃO Wave 3 — não tocar)
- `financeiro.ts:157,158` — `codigoSemantico`/`revoPatologiaId` ausentes do schema (pre)
- `payments.ts:107,126` — `string|string[]` em headers webhook (pre)

### Próximo passo (Frente E opcional)
Pedir ao Caio o secret `ASAAS_API_KEY` pra ativar smoke E2E real
contra sandbox Asaas (criar cobrança real via `asaas.adapter.ts`,
receber webhook real, ver linha em `pagamento_webhook_eventos`).

---

## 2026-04-23 · Migration 025 — Bridge V4 (Dr. Claude aprovado)

### Aplicado
- `parametros_referencia_global.codigo_semantico_v4` (FK → codigos_semanticos.codigo)
- `analitos_catalogo.codigo_semantico_v4` (FK → codigos_semanticos.codigo)
- 2 indexes parciais WHERE codigo_semantico_v4 IS NOT NULL
- 23 PRG mapeados aos códigos V4.0 (TSH, B12, Cortisol, DHEAS, Estradiol, Ferritina, Glicose, HBA1C, HDL, LDL, Vitamina D, Testosterona Total, Insulina, Anti-TPO, Ácido Úrico, Creatinina, etc)

### Pendente (kaizen progressivo)
- 44 PRG EXAME ainda sem mapeamento V4 (mapear sob demanda quando exames forem ativados)
- 304 analitos_catalogo sem mapeamento V4 (mapear quando OCR começar a popular valores_extraidos)

### Wave 5 PARMAVAULT-TSUNAMI — STATUS REAL (descoberto 2026-04-23)
- B0 (4 tabelas) ✅ migrations 021+022 aplicadas
- B1 (A2 warning emissão) ✅ emitirPrescricaoService.ts:130
- B2 (job retroativo 8725) ✅ rodado, 8725/8725 com comissão calculada
- B3 (hook nova emissão) ✅ ativo no fluxo de emissão
- B4 (portal CSV+manual) ✅ POST/GET /admin/parmavault/declaracoes
- B5 (painel CEO) ✅ admin-parmavault-reconciliacao.tsx + GET /admin/parmavault/matriz
- B6 (PDF+Excel) ✅ POST relatorios/gerar + GET /:id/pdf|/excel
- B7 (wrap-up) — pendente confirmação de auditoria com Caio

## 2026-04-23 · Migration 026 + EXAMES-2 Frontend (autonomia 4h Caio)

### Backend
- **Migration 026 aplicada**: 8 codes V4 novos (HDLX/LDLX/TRIG/HTCR/HEMO/URCA/POTA/IGF1) + 15 PRG mapeados → **67/67 PRG agora 100%**.
- **5 colunas aditivas em `analitos_catalogo`**: nome_zona_excelente / aceitavel / ruim / alerta / atencao. Defaults editáveis.
- **Endpoint estendido** `GET /api/pacientes/:id/exames/dashboard`: retorna `zona_idx` 0-4, `cor_final` (4 cores incl. ALERTA distinto), `nome_zona`, `posicao_pct`, `sparkline` 6m, `observacao_clinica`, `direcao_favoravel`. JOIN com `analitos_catalogo` via `codigo_semantico_v4`. Compat reversa mantida (`corFinal`).

### Frontend (NOVO)
- `/atendimento/exames/:pacienteId` — **Modo Médico**: KPIs topo, busca + filtros, grid de cards XL com velocímetro mini, régua 5 zonas com bolinha animada, sparkline 6m, modal foco com script clínico. Atalhos: V (vitrine) / / (busca) / R (refresh) / ESC.
- `/atendimento/exames/:pacienteId/vitrine` — **Modo Vitrine Paciente**: fullscreen navy/gold, fonte XL, velocímetro semicírculo 280px, régua animada framer-motion, tradução humana sem jargão, autoplay 8s, navegação ←/→, pirulitos coloridos no rodapé. ESC sai.

### Regra blindada (filosofia Caio abr/26)
- ALERTA (zona 0, abaixo mínimo) e ATENÇÃO (zona 4, acima máximo) são **neutros** — chamam o médico interpretar, não rotulam o número.
- EXCELENTE / ACEITÁVEL / RUIM são **inversíveis** conforme `terco_excelente` (SUPERIOR/INFERIOR/MEDIO).

### Manifesto Dr. Replit
- `MANIFESTO_DR_REPLIT.md` na raiz do projeto. Glossário oficial Caio (Bloco/Fórmula/Prescrição/Exame/Analito/PRG/V4/5 zonas/Comissão estimada vs paga/GAP). Protocolo Dr. Claude → Dr. Replit (ele PEDE o que existe antes de propor; eu RESPONDO com evidência psql/rg, não memória).

### EM PAUSA (commit-and-park)
- Wave 5 PARMAVAULT-TSUNAMI parcial — ver checklist B0–B7 acima. Caio pivotou pra terminar EXAMES-2 frontend; volta na próxima leva.
