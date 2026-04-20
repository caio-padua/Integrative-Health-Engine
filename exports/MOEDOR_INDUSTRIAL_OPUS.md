# 🍖 MOEDOR INDUSTRIAL — Pacote Total PADCON pra Opus Devorar
**Single-click context bomb.** Tudo o que o Opus precisa pra fazer revisão estratégica e técnica, num só arquivo.

## 📋 ÍNDICE
1. Memória persistente do projeto (replit.md)
2. DNA do projeto (package.json + artifact.toml)
3. Estrutura de pastas (tree completa)
4. Regras de ferro (anti-padrões)
5. Schema das 8 tabelas novas + 4 legadas críticas
6. Seeds e dados vivos (liberações, preços, drive)
7. Backend completo (monetização + drive + auxiliares)
8. Frontend completo (layout + 3 páginas + contexts)
9. Histórico git recente
10. Achados do code review (críticos pendentes)

---

## 1. 🧠 replit.md — memória persistente
```markdown
# Pawards — Plataforma de Gestão para Clínica Médica Integrativa

## Overview

Pawards is a SaaS clinical engine platform designed for multi-unit integrative medical clinics. It aims to streamline operations, enhance patient care through data-driven suggestions, and improve administrative efficiency. The platform's core functionality includes patient anamnesis, which triggers a clinical engine to generate suggestions for exams, formulas, injectables, implants, and treatment protocols. Key capabilities include TDAH-friendly dashboards with operational queues, medical validation workflows, and dedicated modules for follow-up and financial management. The business vision is to provide an invisible operational consultancy service through a highly efficient and scalable platform, with a comprehensive monetization system for modules and services, targeting multi-unit clinics and consultancy companies.

## User Preferences

The user prefers that all names be complete and semantic, never abbreviated. For example, `auditoria_cascata` is correct, not `aud_cascata`. Names should be comprehensible without external context. The user explicitly states that the field for user profiles must always be named `perfil` and never `role`, as `role` can be visually confused with routing terms, which are common in the backend framework. The user also requires strict adherence to naming conventions across different layers of the application (database tables, schema files, Drizzle fields, API routes). The user mandates the use of semantic prefixes like `pode_` for boolean permissions, `nunca_` for permanent restrictions, and `requer_` for mandatory conditions. When renaming database tables or fields, the user requires that the old name be referenced in comments for security, and all existing routes must remain functional. Absolute prohibitions include never using `role` as a field, never abbreviating names, never replacing existing table schemas (only adding columns), and never dropping tables with data.

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

## System Architecture

The system is built as a monorepo using `pnpm workspaces`, Node.js 24, and TypeScript 5.9. The frontend utilizes React, Vite, Tailwind CSS, and shadcn/ui, while the backend is powered by Express 5. PostgreSQL serves as the database, managed with Drizzle ORM and validated using Zod. API code generation is handled by Orval, charts by Recharts, and routing by Wouter.

Key architectural decisions and features include:

-   **UI/UX Design:** Emphasizes a classic, austere, and TDAH-friendly aesthetic with 0px border-radius, pastel blue primary color, deep navy background, and JetBrains Mono typography, resembling a well-formatted legal document.
-   **Access Control & Multi-unit Management:** Role-based access (e.g., `enfermeira`, `medico_tecnico`) and dynamic permissions with a matrix per profile. Supports full management and configuration of multiple clinic units and a multi-clinic consultancy model with `escopo`-based visibility.
-   **Clinical Engine:** Automates suggestions for therapeutic items based on semantic analysis of anamnesis, utilizing a Unified Therapeutic Items Catalog.
-   **Operational Workflow:** Manages workflows through operational queues (anamnesis, validation, procedures, follow-up, payments) and includes parameterized approval flows with conditional bypasses.
-   **Data Management & Auditability:** All new database schemas must include `origem`, `versaoSchema`, and `arquivadoEm` for auditability and LGPD compliance.
-   **Reporting & Dashboards:** Generates automated RAS (Registro de Atendimento em Saúde) PDFs. Features a TDAH-friendly dashboard with real-time operational queues and comprehensive global/unit KPIs.
-   **Monetization & Commission System:** Implements a "Motor Comercial" with three charging models (Full, Pacote, Por Demanda) and eight sellable modules, including a commission tracking system for consultants.
-   **Delegation System:** A Trello-style board with tasks, priorities, deadlines, and responsibilities, supporting Colaborador Scoring.
-   **SLA Management:** Unified SLA queue with a traffic light system for task cards and follow-ups, requiring mandatory justifications for overdue items with escalation procedures.
-   **Advanced Analytics:** A "Matriz Analítica Cross-Filter" for detailed cross-analysis of clinical data with dynamic facets and server-side pagination.
-   **Agenda Motor:** A comprehensive scheduling engine with transactional slot management, availability rules, appointment booking, rescheduling, and bidirectional Google Calendar synchronization. Includes "Sub-Agendas" for filtering.
-   **Patient Portal:** Allows patients to view appointments, self-reschedule, and manage their profile. Includes an automated "Faltou" (missed appointment) engine.
-   **Smart Slot Release:** Progressively releases appointment slots based on occupancy thresholds (e.g., morning slots released first, afternoon slots released when morning slots are 60% occupied).
-   **Bidirectional Trello Sync:** Synchronizes tasks and statuses between the internal delegation board and Trello.
-   **Team Management Module (Colaboradores & RH):** Provides full team management, including positions, members, task attempts, validations, commission events, and disciplinary events. Features identity cards with detailed information per role.
-   **Virtual Agents Module (Carta Magna PADCOM):** Manages AI agent provisioning, capabilities, execution logs, contextual memories, and human validation queues. Includes extensive configuration for agent personalities and writing engines (e.g., formality, empathy, tone, writing style rules).
-   **Clinic-Aware Filtering:** All major pages dynamically filter data based on the selected clinic using a `useClinic()` context and `?unidadeId` query parameters.
-   **Semantic Code Coverage:** 100% semantic code coverage for dietary plans using the `B1 B2 B3 B4 SEQ` format.
-   **Full CRUD Editing:** Complete Create/Read/Update/Delete functionality for all major entities including Catálogo (Injectables, Formulas, Implants, Protocols, Exams, Diseases), Users, Substances, Sub-Agendas, Units, Semantic Codes, Approval Flows, and Profiles/Permissions.
-   **New CRUD Pages:** Dedicated pages for Dietas, Psicologia protocols, Master Questionnaires, Consultancies, and Contracts, all with full CRUD functionality.
-   **RASX REVO — Dual-Mode Medications:** Supports both traditional "Remédio" and "Fórmula Magistral" (compounded formulas) with distinct data structures and PDF reporting.
-   **RASX-MATRIZ V6 — Semantic Motor Architecture:** A robust document generation engine structured with 5 Master Blocks (CLIN, JURI, FINA, ACOM, 4100), 20 Subgroups, 7 Events, 6 Procedure Classes, and 6 Specific Consents. Generates hashed, officially named PDFs with auditable logs and optional delivery via Drive, Email, or WhatsApp.
-   **Institutional PDF Layout:** Standardized header (PAWARDS + Nick) and footer (page number, institutional details, RASX-MATRIZ V6, Developed by Pawards MedCore) for all generated PDFs.
-   **DB-driven Legal Terms:** Manages legal terms (e.g., LGPD, consent forms) from the database, allowing for versioning and digital signing by patients, integrated into enriched RACJ PDFs.
-   **Instituto Genesis:** A protected, immutable "genesis_seed" unit (ID 14) that serves as a permanent template for colonizing new clinics with predefined catalogs, legal terms, and motor configurations. It allows for additive catalogs where new entries propagate automatically.

## External Dependencies

-   **PostgreSQL:** Primary database.
-   **Drizzle ORM:** Database interaction layer.
-   **ViaCEP API:** Brazilian address lookup service.
-   **Google Calendar API:** Clinic schedule management.
-   **Google Drive API:** Structured document storage and source code backup.
-   **Gmail API:** Automated email sending.
-   **Orval:** OpenAPI-first code generation tool.
-   **Recharts:** JavaScript charting library.
-   **Trello API:** Task board synchronization (configurable via TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_BOARD_ID).
-   **Twilio:** WhatsApp messaging service.
-   **Gupshup:** WhatsApp messaging service.
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
```

## 2. 🧬 DNA — package.json raiz
```json
{
  "name": "workspace",
  "version": "0.0.0",
  "license": "MIT",
  "scripts": {
    "preinstall": "sh -c 'rm -f package-lock.json yarn.lock; case \"$npm_config_user_agent\" in pnpm/*) ;; *) echo \"Use pnpm instead\" >&2; exit 1 ;; esac'",
    "build": "pnpm run typecheck && pnpm -r --if-present run build",
    "typecheck:libs": "tsc --build",
    "typecheck": "pnpm run typecheck:libs && pnpm -r --filter \"./artifacts/**\" --filter \"./scripts\" --if-present run typecheck"
  },
  "private": true,
  "devDependencies": {
    "prettier": "^3.8.1",
    "typescript": "~5.9.2"
  },
  "dependencies": {
    "@replit/connectors-sdk": "^0.4.0",
    "mammoth": "^1.12.0",
    "pdf-parse": "1.1.1",
    "pdfkit": "^0.18.0",
    "tsx": "catalog:",
    "yauzl": "^3.3.0"
  }
}
```

### artifact.toml api-server
```toml
```

### artifact.toml clinica-motor
```toml
```

## 3. 🗺️ Estrutura de pastas relevante
```
=== artifacts/api-server/src ===
artifacts/api-server/src/app.ts
artifacts/api-server/src/index.ts
artifacts/api-server/src/lib/assinatura/adapters.ts
artifacts/api-server/src/lib/assinatura/service.ts
artifacts/api-server/src/lib/assinatura/types.ts
artifacts/api-server/src/lib/branding.ts
artifacts/api-server/src/lib/email-templates.ts
artifacts/api-server/src/lib/google-calendar.ts
artifacts/api-server/src/lib/google-drive.ts
artifacts/api-server/src/lib/google-gmail.ts
artifacts/api-server/src/lib/juridico/notaFiscalDrive.ts
artifacts/api-server/src/lib/juridico/notaFiscal.ts
artifacts/api-server/src/lib/juridico/sanitizer.ts
artifacts/api-server/src/lib/laboratorio/motorClassificacaoIntegrativa.ts
artifacts/api-server/src/lib/logger.ts
artifacts/api-server/src/lib/motor-toggles.ts
artifacts/api-server/src/lib/pacientes/autoProvisionDrive.ts
artifacts/api-server/src/lib/ras-email-template.ts
artifacts/api-server/src/lib/rasxEngine.ts
artifacts/api-server/src/lib/recorrencia/motorPlanos.ts
artifacts/api-server/src/lib/sheets/planilhaPacienteGPS.ts
artifacts/api-server/src/lib/trello.ts
artifacts/api-server/src/middleware/adminAuth.ts
artifacts/api-server/src/middlewares/requireAdminToken.ts
artifacts/api-server/src/middlewares/tenantContext.ts
artifacts/api-server/src/payments/asaas.adapter.ts
artifacts/api-server/src/payments/infinitpay.adapter.ts
artifacts/api-server/src/payments/mercadopago.adapter.ts
artifacts/api-server/src/payments/payment.service.ts
artifacts/api-server/src/payments/stripe.adapter.ts
artifacts/api-server/src/payments/types.ts
artifacts/api-server/src/pdf/docsPdf.ts
artifacts/api-server/src/pdf/gerarPedidoExame.ts
artifacts/api-server/src/pdf/gerarRAS.ts
artifacts/api-server/src/pdf/rasxMotorPdf.ts
artifacts/api-server/src/pdf/rasxPdf.ts
artifacts/api-server/src/routes/acompanhamento.ts
artifacts/api-server/src/routes/agenda-motor.ts
artifacts/api-server/src/routes/agendasProfissionais.ts
artifacts/api-server/src/routes/agentesVirtuais.ts
artifacts/api-server/src/routes/alertaPaciente.ts
artifacts/api-server/src/routes/alertas.ts
artifacts/api-server/src/routes/anamnese.ts
artifacts/api-server/src/routes/assinaturaCRUD.ts
artifacts/api-server/src/routes/assinaturas.ts
artifacts/api-server/src/routes/assinaturasWebhook.ts
artifacts/api-server/src/routes/auditoriaCascata.ts
artifacts/api-server/src/routes/avaliacaoEnfermagem.ts
artifacts/api-server/src/routes/avaliacoesCliente.ts
artifacts/api-server/src/routes/backupDrive.ts
artifacts/api-server/src/routes/blocos.ts
artifacts/api-server/src/routes/catalogo.ts
artifacts/api-server/src/routes/cavaloClinical.ts
artifacts/api-server/src/routes/codigosSemanticos.ts
artifacts/api-server/src/routes/colaboradores.ts
artifacts/api-server/src/routes/comercialAdmin.ts
artifacts/api-server/src/routes/comercial.ts
artifacts/api-server/src/routes/comissao.ts
artifacts/api-server/src/routes/consultoriasRoute.ts
artifacts/api-server/src/routes/contratosRoute.ts
artifacts/api-server/src/routes/dashboard.ts
artifacts/api-server/src/routes/delegacao.ts
artifacts/api-server/src/routes/direcaoExame.ts
artifacts/api-server/src/routes/documentosReferencia.ts
artifacts/api-server/src/routes/drivePawards.ts
artifacts/api-server/src/routes/emailComunicacao.ts
artifacts/api-server/src/routes/examesInteligente.ts
artifacts/api-server/src/routes/exames.ts
artifacts/api-server/src/routes/filas.ts
artifacts/api-server/src/routes/financeiro.ts
artifacts/api-server/src/routes/fluxos.ts
artifacts/api-server/src/routes/followup.ts
artifacts/api-server/src/routes/formulaBlend.ts
artifacts/api-server/src/routes/genesisPopular.ts
artifacts/api-server/src/routes/genesis.ts
artifacts/api-server/src/routes/googleCalendar.ts
artifacts/api-server/src/routes/googleDrive.ts
artifacts/api-server/src/routes/googleGmail.ts
artifacts/api-server/src/routes/governanca.ts
artifacts/api-server/src/routes/health.ts

=== artifacts/clinica-motor/src ===
artifacts/clinica-motor/src/App.tsx
artifacts/clinica-motor/src/components/DoencaSelector.tsx
artifacts/clinica-motor/src/components/Layout.tsx
artifacts/clinica-motor/src/components/PaymentModal.tsx
artifacts/clinica-motor/src/components/RaclRacjPanel.tsx
artifacts/clinica-motor/src/components/RevoPanel.tsx
artifacts/clinica-motor/src/components/ui/accordion.tsx
artifacts/clinica-motor/src/components/ui/alert-dialog.tsx
artifacts/clinica-motor/src/components/ui/alert.tsx
artifacts/clinica-motor/src/components/ui/aspect-ratio.tsx
artifacts/clinica-motor/src/components/ui/avatar.tsx
artifacts/clinica-motor/src/components/ui/badge.tsx
artifacts/clinica-motor/src/components/ui/breadcrumb.tsx
artifacts/clinica-motor/src/components/ui/button-group.tsx
artifacts/clinica-motor/src/components/ui/button.tsx
artifacts/clinica-motor/src/components/ui/calendar.tsx
artifacts/clinica-motor/src/components/ui/card.tsx
artifacts/clinica-motor/src/components/ui/carousel.tsx
artifacts/clinica-motor/src/components/ui/chart.tsx
artifacts/clinica-motor/src/components/ui/checkbox.tsx
artifacts/clinica-motor/src/components/ui/collapsible.tsx
artifacts/clinica-motor/src/components/ui/command.tsx
artifacts/clinica-motor/src/components/ui/context-menu.tsx
artifacts/clinica-motor/src/components/ui/dialog.tsx
artifacts/clinica-motor/src/components/ui/drawer.tsx
artifacts/clinica-motor/src/components/ui/dropdown-menu.tsx
artifacts/clinica-motor/src/components/ui/empty.tsx
artifacts/clinica-motor/src/components/ui/field.tsx
artifacts/clinica-motor/src/components/ui/form.tsx
artifacts/clinica-motor/src/components/ui/hover-card.tsx
artifacts/clinica-motor/src/components/ui/input-group.tsx
artifacts/clinica-motor/src/components/ui/input-otp.tsx
artifacts/clinica-motor/src/components/ui/input.tsx
artifacts/clinica-motor/src/components/ui/item.tsx
artifacts/clinica-motor/src/components/ui/kbd.tsx
artifacts/clinica-motor/src/components/ui/label.tsx
artifacts/clinica-motor/src/components/ui/menubar.tsx
artifacts/clinica-motor/src/components/ui/navigation-menu.tsx
artifacts/clinica-motor/src/components/ui/pagination.tsx
artifacts/clinica-motor/src/components/ui/popover.tsx
artifacts/clinica-motor/src/components/ui/progress.tsx
artifacts/clinica-motor/src/components/ui/radio-group.tsx
artifacts/clinica-motor/src/components/ui/resizable.tsx
artifacts/clinica-motor/src/components/ui/scroll-area.tsx
artifacts/clinica-motor/src/components/ui/select.tsx
artifacts/clinica-motor/src/components/ui/separator.tsx
artifacts/clinica-motor/src/components/ui/sheet.tsx
artifacts/clinica-motor/src/components/ui/sidebar.tsx
artifacts/clinica-motor/src/components/ui/skeleton.tsx
artifacts/clinica-motor/src/components/ui/slider.tsx
artifacts/clinica-motor/src/components/ui/sonner.tsx
artifacts/clinica-motor/src/components/ui/spinner.tsx
artifacts/clinica-motor/src/components/ui/switch.tsx
artifacts/clinica-motor/src/components/ui/table.tsx
artifacts/clinica-motor/src/components/ui/tabs.tsx
artifacts/clinica-motor/src/components/ui/textarea.tsx
artifacts/clinica-motor/src/components/ui/toaster.tsx
artifacts/clinica-motor/src/components/ui/toast.tsx
artifacts/clinica-motor/src/components/ui/toggle-group.tsx
artifacts/clinica-motor/src/components/ui/toggle.tsx
artifacts/clinica-motor/src/components/ui/tooltip.tsx
artifacts/clinica-motor/src/contexts/AuthContext.tsx
artifacts/clinica-motor/src/contexts/ClinicContext.tsx
artifacts/clinica-motor/src/hooks/useLembretesFalhasContagem.ts
artifacts/clinica-motor/src/hooks/use-mobile.tsx
artifacts/clinica-motor/src/hooks/use-payment.ts
artifacts/clinica-motor/src/hooks/use-toast.ts
artifacts/clinica-motor/src/lib/utils.ts
artifacts/clinica-motor/src/main.tsx
artifacts/clinica-motor/src/pages/acompanhamento.tsx
artifacts/clinica-motor/src/pages/admin-comercial.tsx
artifacts/clinica-motor/src/pages/agenda/index.tsx
artifacts/clinica-motor/src/pages/agenda-motor.tsx
artifacts/clinica-motor/src/pages/agendas.tsx
artifacts/clinica-motor/src/pages/agentes-virtuais.tsx
artifacts/clinica-motor/src/pages/anamnese/[id].tsx
artifacts/clinica-motor/src/pages/anamnese/index.tsx
artifacts/clinica-motor/src/pages/anamnese/nova.tsx
artifacts/clinica-motor/src/pages/avaliacao-enfermagem/index.tsx
artifacts/clinica-motor/src/pages/blueprint.tsx
artifacts/clinica-motor/src/pages/catalogo/index.tsx
artifacts/clinica-motor/src/pages/codigos-semanticos/index.tsx
artifacts/clinica-motor/src/pages/codigos-validacao/index.tsx
artifacts/clinica-motor/src/pages/colaboradores.tsx
artifacts/clinica-motor/src/pages/comercial.tsx
artifacts/clinica-motor/src/pages/comissao.tsx
artifacts/clinica-motor/src/pages/configuracoes/index.tsx
artifacts/clinica-motor/src/pages/consultorias/index.tsx
artifacts/clinica-motor/src/pages/contratos/index.tsx
artifacts/clinica-motor/src/pages/dashboard-local.tsx
artifacts/clinica-motor/src/pages/dashboard.tsx
artifacts/clinica-motor/src/pages/delegacao/index.tsx
artifacts/clinica-motor/src/pages/demandas-resolucao.tsx
artifacts/clinica-motor/src/pages/dietas/index.tsx
artifacts/clinica-motor/src/pages/estoque/index.tsx
artifacts/clinica-motor/src/pages/exames.tsx
artifacts/clinica-motor/src/pages/filas/index.tsx
artifacts/clinica-motor/src/pages/financeiro/index.tsx
artifacts/clinica-motor/src/pages/fluxos/index.tsx
artifacts/clinica-motor/src/pages/followup/index.tsx
artifacts/clinica-motor/src/pages/governanca/index.tsx
artifacts/clinica-motor/src/pages/governanca-matrix.tsx
artifacts/clinica-motor/src/pages/inundacao.tsx
artifacts/clinica-motor/src/pages/itens-terapeuticos/index.tsx
artifacts/clinica-motor/src/pages/justificativas.tsx
artifacts/clinica-motor/src/pages/laboratorio-validacao.tsx
artifacts/clinica-motor/src/pages/lembretes-falhas.tsx
artifacts/clinica-motor/src/pages/login.tsx
artifacts/clinica-motor/src/pages/matriz-analitica.tsx
artifacts/clinica-motor/src/pages/mensagens.tsx
artifacts/clinica-motor/src/pages/monetizar.tsx
artifacts/clinica-motor/src/pages/not-found.tsx
artifacts/clinica-motor/src/pages/pacientes/exames-grafico.tsx
artifacts/clinica-motor/src/pages/pacientes/[id].tsx
artifacts/clinica-motor/src/pages/pacientes/index.tsx
artifacts/clinica-motor/src/pages/pacientes/monitoramento.tsx
artifacts/clinica-motor/src/pages/pacientes/questionario.tsx
artifacts/clinica-motor/src/pages/padcom/admin-dashboard.tsx
artifacts/clinica-motor/src/pages/padcom/admin-detalhe.tsx
artifacts/clinica-motor/src/pages/padcom/admin.tsx
```

## 4. ⚠️ REGRAS DE FERRO (não-negociáveis)
- **NUNCA** rodar `db:push` ou `drizzle-kit push` — drift de 32 tabelas, 31 FKs em `unidades.id`. Schema só via `ALTER`/`CREATE` direto no psql.
- **Backend SEM auth real** ainda — `tenantContextMiddleware` só lê header da unidade. Status quo do projeto inteiro.
- **Porta API**: 8080 (workflow externo mapeia 5000→8080).
- **Preços cravados pelo Caio**: M1=297, M2=497, M3=197, M4=197, M5=397, M6=597, M7=397. E1=47, E2=0.80, E3=1.20, E4=0.15, E5=0.80, E6=4.90, E7=9.90, E8=1997, E9=97/mês.
- **Visão Caio**: SaaS médico multi-tenant. DNA visual: azul petróleo #1F4E5F, off-white, dourado. NUVEM ☁️ (cofre-mãe global) + ROCHA ⛰️ (autonomia local).
- **Pádua é a clínica-mãe** (id=15, ⭐). **Genesis é o cofre semente** (id=14, 🧬). Outras 8 são clientes. Lemos(9)/Barakat(19)=bloqueio_total. Pádua/Genesis=autonomia_plena.

## 5. 📊 Schema das tabelas
```sql
-- =========== 8 TABELAS NOVAS PADCON ===========

-- modulos_padcon --
                                                                   Table "public.modulos_padcon"
    Column    |           Type           | Collation | Nullable |                  Default                   | Storage  | Compression | Stats target | Description 
--------------+--------------------------+-----------+----------+--------------------------------------------+----------+-------------+--------------+-------------
 id           | integer                  |           | not null | nextval('modulos_padcon_id_seq'::regclass) | plain    |             |              | 
 codigo       | text                     |           | not null |                                            | extended |             |              | 
 nome         | text                     |           | not null |                                            | extended |             |              | 
 descricao    | text                     |           |          |                                            | extended |             |              | 
 preco_mensal | numeric(10,2)            |           | not null | 0                                          | main     |             |              | 
 ordem        | integer                  |           | not null | 0                                          | plain    |             |              | 
 grupo        | text                     |           | not null |                                            | extended |             |              | 
 ativo        | boolean                  |           | not null | true                                       | plain    |             |              | 
 criado_em    | timestamp with time zone |           | not null | now()                                      | plain    |             |              | 
Indexes:
    "modulos_padcon_pkey" PRIMARY KEY, btree (id)
    "modulos_padcon_codigo_key" UNIQUE CONSTRAINT, btree (codigo)
Referenced by:
    TABLE "unidade_modulos_ativos" CONSTRAINT "unidade_modulos_ativos_modulo_id_fkey" FOREIGN KEY (modulo_id) REFERENCES modulos_padcon(id)
Access method: heap


-- eventos_cobraveis --
                                                                    Table "public.eventos_cobraveis"
     Column     |           Type           | Collation | Nullable |                    Default                    | Storage  | Compression | Stats target | Description 
----------------+--------------------------+-----------+----------+-----------------------------------------------+----------+-------------+--------------+-------------
 id             | integer                  |           | not null | nextval('eventos_cobraveis_id_seq'::regclass) | plain    |             |              | 
 codigo         | text                     |           | not null |                                               | extended |             |              | 
 nome           | text                     |           | not null |                                               | extended |             |              | 
 descricao      | text                     |           |          |                                               | extended |             |              | 
 preco_unitario | numeric(10,2)            |           | not null | 0                                             | main     |             |              | 
 unidade_medida | text                     |           | not null | 'evento'::text                                | extended |             |              | 
 grupo          | text                     |           | not null |                                               | extended |             |              | 
 trigger_origem | text                     |           |          |                                               | extended |             |              | 
 ativo          | boolean                  |           | not null | true                                          | plain    |             |              | 
 criado_em      | timestamp with time zone |           | not null | now()                                         | plain    |             |              | 
Indexes:
    "eventos_cobraveis_pkey" PRIMARY KEY, btree (id)
    "eventos_cobraveis_codigo_key" UNIQUE CONSTRAINT, btree (codigo)
Referenced by:
    TABLE "pingue_pongue_log" CONSTRAINT "pingue_pongue_log_evento_cobravel_id_fkey" FOREIGN KEY (evento_cobravel_id) REFERENCES eventos_cobraveis(id)
    TABLE "unidade_eventos_ledger" CONSTRAINT "unidade_eventos_ledger_evento_id_fkey" FOREIGN KEY (evento_id) REFERENCES eventos_cobraveis(id)
Access method: heap


-- unidade_modulos_ativos --
                                                                      Table "public.unidade_modulos_ativos"
       Column        |           Type           | Collation | Nullable |                      Default                       | Storage  | Compression | Stats target | Description 
---------------------+--------------------------+-----------+----------+----------------------------------------------------+----------+-------------+--------------+-------------
 id                  | integer                  |           | not null | nextval('unidade_modulos_ativos_id_seq'::regclass) | plain    |             |              | 
 unidade_id          | integer                  |           | not null |                                                    | plain    |             |              | 
 modulo_id           | integer                  |           | not null |                                                    | plain    |             |              | 
 ativo               | boolean                  |           | not null | false                                              | plain    |             |              | 
 preco_personalizado | numeric(10,2)            |           |          |                                                    | main     |             |              | 
 ativado_em          | timestamp with time zone |           |          |                                                    | plain    |             |              | 
 ativado_por         | text                     |           |          |                                                    | extended |             |              | 
 observacao          | text                     |           |          |                                                    | extended |             |              | 
Indexes:
    "unidade_modulos_ativos_pkey" PRIMARY KEY, btree (id)
    "unidade_modulos_ativos_unidade_id_modulo_id_key" UNIQUE CONSTRAINT, btree (unidade_id, modulo_id)
Foreign-key constraints:
    "unidade_modulos_ativos_modulo_id_fkey" FOREIGN KEY (modulo_id) REFERENCES modulos_padcon(id)
    "unidade_modulos_ativos_unidade_id_fkey" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
Access method: heap


-- unidade_eventos_ledger --
                                                                      Table "public.unidade_eventos_ledger"
       Column       |           Type           | Collation | Nullable |                      Default                       | Storage  | Compression | Stats target | Description 
--------------------+--------------------------+-----------+----------+----------------------------------------------------+----------+-------------+--------------+-------------
 id                 | integer                  |           | not null | nextval('unidade_eventos_ledger_id_seq'::regclass) | plain    |             |              | 
 unidade_id         | integer                  |           | not null |                                                    | plain    |             |              | 
 evento_id          | integer                  |           | not null |                                                    | plain    |             |              | 
 valor_cobrado      | numeric(10,2)            |           | not null |                                                    | main     |             |              | 
 referencia_externa | text                     |           |          |                                                    | extended |             |              | 
 metadados          | jsonb                    |           |          |                                                    | extended |             |              | 
 ocorrido_em        | timestamp with time zone |           | not null | now()                                              | plain    |             |              | 
 competencia_mes    | text                     |           | not null | to_char(now(), 'YYYY-MM'::text)                    | extended |             |              | 
 faturado           | boolean                  |           | not null | false                                              | plain    |             |              | 
Indexes:
    "unidade_eventos_ledger_pkey" PRIMARY KEY, btree (id)
    "idx_ledger_unid_comp" btree (unidade_id, competencia_mes)
Foreign-key constraints:
    "unidade_eventos_ledger_evento_id_fkey" FOREIGN KEY (evento_id) REFERENCES eventos_cobraveis(id)
    "unidade_eventos_ledger_unidade_id_fkey" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
Access method: heap


-- agendas_nuvem_liberacao --
                                                                        Table "public.agendas_nuvem_liberacao"
         Column         |           Type           | Collation | Nullable |                       Default                       | Storage  | Compression | Stats target | Description 
------------------------+--------------------------+-----------+----------+-----------------------------------------------------+----------+-------------+--------------+-------------
 id                     | integer                  |           | not null | nextval('agendas_nuvem_liberacao_id_seq'::regclass) | plain    |             |              | 
 unidade_id             | integer                  |           | not null |                                                     | plain    |             |              | 
 agenda_template_codigo | text                     |           | not null |                                                     | extended |             |              | 
 liberada               | boolean                  |           | not null | false                                               | plain    |             |              | 
 estado                 | text                     |           | not null | 'bloqueio_total'::text                              | extended |             |              | 
 liberada_em            | timestamp with time zone |           |          |                                                     | plain    |             |              | 
 liberada_por           | text                     |           |          |                                                     | extended |             |              | 
Indexes:
    "agendas_nuvem_liberacao_pkey" PRIMARY KEY, btree (id)
    "agendas_nuvem_liberacao_unidade_id_agenda_template_codigo_key" UNIQUE CONSTRAINT, btree (unidade_id, agenda_template_codigo)
Foreign-key constraints:
    "agendas_nuvem_liberacao_unidade_id_fkey" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
Access method: heap


-- demandas_resolucao --
                                                                       Table "public.demandas_resolucao"
        Column        |           Type           | Collation | Nullable |                    Default                     | Storage  | Compression | Stats target | Description 
----------------------+--------------------------+-----------+----------+------------------------------------------------+----------+-------------+--------------+-------------
 id                   | integer                  |           | not null | nextval('demandas_resolucao_id_seq'::regclass) | plain    |             |              | 
 unidade_id           | integer                  |           | not null |                                                | plain    |             |              | 
 paciente_id          | integer                  |           |          |                                                | plain    |             |              | 
 canal_origem         | text                     |           | not null |                                                | extended |             |              | 
 assunto              | text                     |           |          |                                                | extended |             |              | 
 resolvido            | boolean                  |           | not null | false                                          | plain    |             |              | 
 resolvido_por        | text                     |           |          |                                                | extended |             |              | 
 resolvido_em         | timestamp with time zone |           |          |                                                | plain    |             |              | 
 turnos_pingue_pongue | integer                  |           | not null | 0                                              | plain    |             |              | 
 caminho_resolucao    | text                     |           |          |                                                | extended |             |              | 
 valor_total_cobrado  | numeric(10,2)            |           | not null | 0                                              | main     |             |              | 
 metadados            | jsonb                    |           |          |                                                | extended |             |              | 
 criado_em            | timestamp with time zone |           | not null | now()                                          | plain    |             |              | 
Indexes:
    "demandas_resolucao_pkey" PRIMARY KEY, btree (id)
    "idx_demandas_unid" btree (unidade_id, resolvido)
Foreign-key constraints:
    "demandas_resolucao_unidade_id_fkey" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
Referenced by:
    TABLE "pingue_pongue_log" CONSTRAINT "pingue_pongue_log_demanda_id_fkey" FOREIGN KEY (demanda_id) REFERENCES demandas_resolucao(id) ON DELETE CASCADE
Access method: heap


-- pingue_pongue_log --
                                                                      Table "public.pingue_pongue_log"
       Column       |           Type           | Collation | Nullable |                    Default                    | Storage  | Compression | Stats target | Description 
--------------------+--------------------------+-----------+----------+-----------------------------------------------+----------+-------------+--------------+-------------
 id                 | integer                  |           | not null | nextval('pingue_pongue_log_id_seq'::regclass) | plain    |             |              | 
 demanda_id         | integer                  |           | not null |                                               | plain    |             |              | 
 turno              | integer                  |           | not null |                                               | plain    |             |              | 
 autor_tipo         | text                     |           | not null |                                               | extended |             |              | 
 autor_nome         | text                     |           |          |                                               | extended |             |              | 
 canal              | text                     |           | not null |                                               | extended |             |              | 
 mensagem           | text                     |           |          |                                               | extended |             |              | 
 evento_cobravel_id | integer                  |           |          |                                               | plain    |             |              | 
 ocorrido_em        | timestamp with time zone |           | not null | now()                                         | plain    |             |              | 
Indexes:
    "pingue_pongue_log_pkey" PRIMARY KEY, btree (id)
    "idx_ppl_demanda" btree (demanda_id, turno)
Foreign-key constraints:
    "pingue_pongue_log_demanda_id_fkey" FOREIGN KEY (demanda_id) REFERENCES demandas_resolucao(id) ON DELETE CASCADE
    "pingue_pongue_log_evento_cobravel_id_fkey" FOREIGN KEY (evento_cobravel_id) REFERENCES eventos_cobraveis(id)
Access method: heap


-- clinica_drive_estrutura --
                                                                       Table "public.clinica_drive_estrutura"
        Column        |           Type           | Collation | Nullable |                       Default                       | Storage  | Compression | Stats target | Description 
----------------------+--------------------------+-----------+----------+-----------------------------------------------------+----------+-------------+--------------+-------------
 id                   | integer                  |           | not null | nextval('clinica_drive_estrutura_id_seq'::regclass) | plain    |             |              | 
 unidade_id           | integer                  |           | not null |                                                     | plain    |             |              | 
 pasta_raiz_id        | text                     |           |          |                                                     | extended |             |              | 
 pasta_clientes_id    | text                     |           |          |                                                     | extended |             |              | 
 pasta_financeiro_id  | text                     |           |          |                                                     | extended |             |              | 
 pasta_recorrentes_id | text                     |           |          |                                                     | extended |             |              | 
 url_raiz             | text                     |           |          |                                                     | extended |             |              | 
 criada_em            | timestamp with time zone |           | not null | now()                                               | plain    |             |              | 
 criada_por           | text                     |           |          |                                                     | extended |             |              | 
Indexes:
    "clinica_drive_estrutura_pkey" PRIMARY KEY, btree (id)
    "clinica_drive_estrutura_unidade_id_key" UNIQUE CONSTRAINT, btree (unidade_id)
Foreign-key constraints:
    "clinica_drive_estrutura_unidade_id_fkey" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
Access method: heap


-- =========== 4 TABELAS LEGADAS CRÍTICAS (FKs apontam pra cá) ===========

-- unidades --
                                                                       Table "public.unidades"
        Column         |           Type           | Collation | Nullable |               Default                | Storage  | Compression | Stats target | Description 
-----------------------+--------------------------+-----------+----------+--------------------------------------+----------+-------------+--------------+-------------
 id                    | integer                  |           | not null | nextval('unidades_id_seq'::regclass) | plain    |             |              | 
 nome                  | text                     |           | not null |                                      | extended |             |              | 
 endereco              | text                     |           |          |                                      | extended |             |              | 
 cidade                | text                     |           |          |                                      | extended |             |              | 
 estado                | text                     |           |          |                                      | extended |             |              | 
 telefone              | text                     |           |          |                                      | extended |             |              | 
 ativa                 | boolean                  |           | not null | true                                 | plain    |             |              | 
 criado_em             | timestamp with time zone |           | not null | now()                                | plain    |             |              | 
 atualizado_em         | timestamp with time zone |           | not null | now()                                | plain    |             |              | 
 cnpj                  | text                     |           |          |                                      | extended |             |              | 
 cep                   | text                     |           |          |                                      | extended |             |              | 
 tipo                  | text                     |           | not null | 'clinic'::text                       | extended |             |              | 
 google_calendar_id    | text                     |           |          |                                      | extended |             |              | 
 cor                   | text                     |           | not null | '#3B82F6'::text                      | extended |             |              | 
 bairro                | text                     |           |          |                                      | extended |             |              | 
 google_calendar_email | text                     |           |          |                                      | extended |             |              | 
 consultoria_id        | integer                  |           |          |                                      | plain    |             |              | 
 codigo_interno        | text                     |           |          |                                      | extended |             |              | 
 nick                  | text                     |           |          |                                      | extended |             |              | 
 email_geral           | text                     |           |          |                                      | extended |             |              | 
 email_agenda          | text                     |           |          |                                      | extended |             |              | 
 email_enfermagem01    | text                     |           |          |                                      | extended |             |              | 
 email_enfermagem02    | text                     |           |          |                                      | extended |             |              | 
 email_consultor01     | text                     |           |          |                                      | extended |             |              | 
 email_consultor02     | text                     |           |          |                                      | extended |             |              | 
 email_supervisor01    | text                     |           |          |                                      | extended |             |              | 
 email_supervisor02    | text                     |           |          |                                      | extended |             |              | 
 email_financeiro01    | text                     |           |          |                                      | extended |             |              | 
 email_ouvidoria01     | text                     |           |          |                                      | extended |             |              | 
 timezone              | text                     |           | not null | 'America/Sao_Paulo'::text            | extended |             |              | 
 dono_id               | integer                  |           |          |                                      | plain    |             |              | 
 dono_nome             | text                     |           |          |                                      | extended |             |              | 
 autoliberacao         | boolean                  |           | not null | true                                 | plain    |             |              | 
Indexes:
    "unidades_pkey" PRIMARY KEY, btree (id)
Foreign-key constraints:
    "unidades_consultoria_id_consultorias_id_fk" FOREIGN KEY (consultoria_id) REFERENCES consultorias(id)

-- usuarios --
                                                                    Table "public.usuarios"
     Column     |           Type           | Collation | Nullable |               Default                | Storage  | Compression | Stats target | Description 
----------------+--------------------------+-----------+----------+--------------------------------------+----------+-------------+--------------+-------------
 id             | integer                  |           | not null | nextval('usuarios_id_seq'::regclass) | plain    |             |              | 
 nome           | text                     |           | not null |                                      | extended |             |              | 
 email          | text                     |           | not null |                                      | extended |             |              | 
 senha          | text                     |           | not null |                                      | extended |             |              | 
 perfil         | text                     |           | not null |                                      | extended |             |              | 
 unidade_id     | integer                  |           |          |                                      | plain    |             |              | 
 ativo          | boolean                  |           | not null | true                                 | plain    |             |              | 
 criado_em      | timestamp with time zone |           | not null | now()                                | plain    |             |              | 
 atualizado_em  | timestamp with time zone |           | not null | now()                                | plain    |             |              | 
 crm            | text                     |           |          |                                      | extended |             |              | 
 cpf            | text                     |           |          |                                      | extended |             |              | 
 cns            | text                     |           |          |                                      | extended |             |              | 
 especialidade  | text                     |           |          |                                      | extended |             |              | 
 telefone       | text                     |           |          |                                      | extended |             |              | 
 pode_validar   | boolean                  |           | not null | false                                | plain    |             |              | 
 pode_assinar   | boolean                  |           | not null | false                                | plain    |             |              | 
 pode_bypass    | boolean                  |           | not null | false                                | plain    |             |              | 
 nunca_opera    | boolean                  |           | not null | false                                | plain    |             |              | 
 escopo         | text                     |           | not null | 'clinica_enfermeira'::text           | extended |             |              | 
 consultoria_id | integer                  |           |          |                                      | plain    |             |              | 
 foto_rosto     | text                     |           |          |                                      | extended |             |              | 
 foto_corpo     | text                     |           |          |                                      | extended |             |              | 
Indexes:
    "usuarios_pkey" PRIMARY KEY, btree (id)
    "usuarios_email_unique" UNIQUE CONSTRAINT, btree (email)
Foreign-key constraints:
    "usuarios_consultoria_id_consultorias_id_fk" FOREIGN KEY (consultoria_id) REFERENCES consultorias(id)
    "usuarios_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
Referenced by:
    TABLE "acompanhamento_cavalo" CONSTRAINT "acompanhamento_cavalo_responsavel_id_usuarios_id_fk" FOREIGN KEY (responsavel_id) REFERENCES usuarios(id)
    TABLE "acompanhamento_formula" CONSTRAINT "acompanhamento_formula_registrado_por_id_usuarios_id_fk" FOREIGN KEY (registrado_por_id) REFERENCES usuarios(id)
    TABLE "agenda_audit_events" CONSTRAINT "agenda_audit_events_usuario_id_usuarios_id_fk" FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    TABLE "agenda_blocks" CONSTRAINT "agenda_blocks_profissional_id_usuarios_id_fk" FOREIGN KEY (profissional_id) REFERENCES usuarios(id)
    TABLE "agenda_slots" CONSTRAINT "agenda_slots_profissional_id_usuarios_id_fk" FOREIGN KEY (profissional_id) REFERENCES usuarios(id)
    TABLE "alerta_paciente" CONSTRAINT "alerta_paciente_responsavel_id_usuarios_id_fk" FOREIGN KEY (responsavel_id) REFERENCES usuarios(id)
    TABLE "alertas_notificacao" CONSTRAINT "alertas_notificacao_confirmado_por_id_usuarios_id_fk" FOREIGN KEY (confirmado_por_id) REFERENCES usuarios(id)
    TABLE "alertas_notificacao" CONSTRAINT "alertas_notificacao_destinatario_id_usuarios_id_fk" FOREIGN KEY (destinatario_id) REFERENCES usuarios(id)

-- agendas_profissionais --
                                                                   Table "public.agendas_profissionais"
    Column    |           Type           | Collation | Nullable |                      Default                      | Storage  | Compression | Stats target | Description 
--------------+--------------------------+-----------+----------+---------------------------------------------------+----------+-------------+--------------+-------------
 id           | integer                  |           | not null | nextval('agendas_profissionais_id_seq'::regclass) | plain    |             |              | 
 unidade_id   | integer                  |           | not null |                                                   | plain    |             |              | 
 nome         | text                     |           | not null |                                                   | extended |             |              | 
 profissional | text                     |           | not null |                                                   | extended |             |              | 
 modo         | text                     |           | not null |                                                   | extended |             |              | 
 tipo         | text                     |           | not null |                                                   | extended |             |              | 
 ordem        | integer                  |           | not null | 0                                                 | plain    |             |              | 
 ativa        | boolean                  |           | not null | true                                              | plain    |             |              | 
 criado_em    | timestamp with time zone |           | not null | now()                                             | plain    |             |              | 
Indexes:
    "agendas_profissionais_pkey" PRIMARY KEY, btree (id)
    "idx_agendas_unidade" btree (unidade_id)
Check constraints:
    "agendas_profissionais_modo_check" CHECK (modo = ANY (ARRAY['LOCAL'::text, 'REMOTO'::text, 'PESSOAL'::text]))
    "agendas_profissionais_tipo_check" CHECK (tipo = ANY (ARRAY['MEDICO'::text, 'ENFERMAGEM'::text, 'PESSOAL'::text]))
Foreign-key constraints:
    "agendas_profissionais_unidade_id_fkey" FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE CASCADE
Access method: heap


-- consultorias --
                                                                   Table "public.consultorias"
    Column     |           Type           | Collation | Nullable |                 Default                  | Storage  | Compression | Stats target | Description 
---------------+--------------------------+-----------+----------+------------------------------------------+----------+-------------+--------------+-------------
 id            | integer                  |           | not null | nextval('consultorias_id_seq'::regclass) | plain    |             |              | 
 nome          | text                     |           | not null |                                          | extended |             |              | 
 cnpj          | text                     |           |          |                                          | extended |             |              | 
 responsavel   | text                     |           | not null |                                          | extended |             |              | 
 email         | text                     |           |          |                                          | extended |             |              | 
 telefone      | text                     |           |          |                                          | extended |             |              | 
 plano         | text                     |           | not null | 'starter'::text                          | extended |             |              | 
 max_unidades  | text                     |           | not null | '3'::text                                | extended |             |              | 
 ativa         | boolean                  |           | not null | true                                     | plain    |             |              | 
 criado_em     | timestamp with time zone |           | not null | now()                                    | plain    |             |              | 
 atualizado_em | timestamp with time zone |           | not null | now()                                    | plain    |             |              | 
Indexes:
    "consultorias_pkey" PRIMARY KEY, btree (id)
Referenced by:
    TABLE "contrato_clinica" CONSTRAINT "contrato_clinica_consultoria_id_consultorias_id_fk" FOREIGN KEY (consultoria_id) REFERENCES consultorias(id)
    TABLE "unidades" CONSTRAINT "unidades_consultoria_id_consultorias_id_fk" FOREIGN KEY (consultoria_id) REFERENCES consultorias(id)
    TABLE "usuarios" CONSTRAINT "usuarios_consultoria_id_consultorias_id_fk" FOREIGN KEY (consultoria_id) REFERENCES consultorias(id)
Access method: heap

```

## 6. 🌱 Seeds e dados vivos em produção
### 6.1 Liberações de agenda (70 linhas)
```
ERROR:  column l.template_codigo does not exist
LINE 1: SELECT u.nome AS clinica, l.template_codigo, l.tipo_liberaca...
                                  ^
```

### 6.2 Eventos cobráveis (preços vivos)
```
ERROR:  column "preco" does not exist
LINE 1: SELECT codigo, nome, preco, unidade_cobranca, descricao FROM...
                             ^
```

### 6.3 Módulos PADCON (mensalidades)
```
 codigo |             nome              | preco_mensal |   grupo    |                   descricao                   
--------+-------------------------------+--------------+------------+-----------------------------------------------
 M1     | Agendamento Sistema           |       297.00 | agenda     | Liberacao das agendas-nuvem dentro do PAWARDS
 M2     | Agendamento + Google Calendar |       497.00 | agenda     | M1 + sincronizacao bidirecional Google
 M3     | Criacao de Agenda Rocha       |       197.00 | agenda     | Autonomia local para criar agenda propria
 M4     | Mensagens WhatsApp            |       197.00 | mensageria | Envio automatico de lembrete e confirmacao
 M5     | IA Resposta (Trello+IA)       |       397.00 | mensageria | IA responde mensagens entrantes
 M6     | SAC Humano PADCON             |       597.00 | mensageria | Atendente humano responde apos IA
 M7     | Ligacao Humana pos-WhatsApp   |       397.00 | mensageria | Operadora liga quando IA+SAC nao fecham
(7 rows)

```

### 6.4 Drive PAWARDS provisionado
```
         nome          |                                 url_raiz                                 
-----------------------+--------------------------------------------------------------------------
 INSTITUTO ANDRADE     | https://drive.google.com/drive/folders/17-NEWHsw2ckXGHfEFQFI8_QWtEiVzG9T
 INSTITUTO BARAKAT     | https://drive.google.com/drive/folders/1eHO-ah9_yIRWQw1A_rTKKz_UWZYvXlA7
 INSTITUTO BARROS      | https://drive.google.com/drive/folders/189-TYzRy4mHqy0VaastW1r3kQPZUpiun
 INSTITUTO GENESIS     | https://drive.google.com/drive/folders/11vZllKpaEYbzrg4u3CFKwPMSvCjzTpPK
 INSTITUTO INTEGRATIVO | https://drive.google.com/drive/folders/1EB_Ri8_N1CMWkqdhMRZ1s1by5yBKoM4G
 INSTITUTO LEMOS       | https://drive.google.com/drive/folders/1P12arunFirDGlzmTZ9xx_dei6622P5aa
 INSTITUTO PADUA       | https://drive.google.com/drive/folders/1VlxM7l33CSdF88Qp78OoYlPKa9i_svgN
 INSTITUTO PADUZZI     | https://drive.google.com/drive/folders/1SlVt83nxCeXjDile5C6RTEBRq_9XW8Ks
 INSTITUTO PALUZZE     | https://drive.google.com/drive/folders/1oqX-aaqf5D3CP-EFLigI5qhv_L1HO0nv
 INSTITUTO PAZIALLE    | https://drive.google.com/drive/folders/1uxTRduErVqyzlqetXf5DDNPYm28Waff0
(10 rows)

```

### 6.5 Matriz módulos × clínicas (estado atual)
```
         nome          | codigo | ativo 
-----------------------+--------+-------
 INSTITUTO ANDRADE     | M1     | t
 INSTITUTO ANDRADE     | M2     | f
 INSTITUTO ANDRADE     | M3     | f
 INSTITUTO ANDRADE     | M4     | t
 INSTITUTO ANDRADE     | M5     | f
 INSTITUTO ANDRADE     | M6     | f
 INSTITUTO ANDRADE     | M7     | f
 INSTITUTO BARAKAT     | M1     | f
 INSTITUTO BARAKAT     | M2     | f
 INSTITUTO BARAKAT     | M3     | f
 INSTITUTO BARAKAT     | M4     | f
 INSTITUTO BARAKAT     | M5     | f
 INSTITUTO BARAKAT     | M6     | f
 INSTITUTO BARAKAT     | M7     | f
 INSTITUTO BARROS      | M1     | t
 INSTITUTO BARROS      | M2     | f
 INSTITUTO BARROS      | M3     | f
 INSTITUTO BARROS      | M4     | t
 INSTITUTO BARROS      | M5     | f
 INSTITUTO BARROS      | M6     | f
 INSTITUTO BARROS      | M7     | f
 INSTITUTO GENESIS     | M1     | t
 INSTITUTO GENESIS     | M2     | t
 INSTITUTO GENESIS     | M3     | t
 INSTITUTO GENESIS     | M4     | t
 INSTITUTO GENESIS     | M5     | t
 INSTITUTO GENESIS     | M6     | t
 INSTITUTO GENESIS     | M7     | t
 INSTITUTO INTEGRATIVO | M1     | f
 INSTITUTO INTEGRATIVO | M2     | f
 INSTITUTO INTEGRATIVO | M3     | f
 INSTITUTO INTEGRATIVO | M4     | t
 INSTITUTO INTEGRATIVO | M5     | f
 INSTITUTO INTEGRATIVO | M6     | f
 INSTITUTO INTEGRATIVO | M7     | f
 INSTITUTO LEMOS       | M1     | f
 INSTITUTO LEMOS       | M2     | f
 INSTITUTO LEMOS       | M3     | f
 INSTITUTO LEMOS       | M4     | f
 INSTITUTO LEMOS       | M5     | f
 INSTITUTO LEMOS       | M6     | f
 INSTITUTO LEMOS       | M7     | f
 INSTITUTO PADUA       | M1     | t
 INSTITUTO PADUA       | M2     | t
 INSTITUTO PADUA       | M3     | t
 INSTITUTO PADUA       | M4     | t
 INSTITUTO PADUA       | M5     | t
 INSTITUTO PADUA       | M6     | t
 INSTITUTO PADUA       | M7     | t
 INSTITUTO PADUZZI     | M1     | t
 INSTITUTO PADUZZI     | M2     | f
 INSTITUTO PADUZZI     | M3     | f
 INSTITUTO PADUZZI     | M4     | t
 INSTITUTO PADUZZI     | M5     | f
 INSTITUTO PADUZZI     | M6     | f
 INSTITUTO PADUZZI     | M7     | f
 INSTITUTO PALUZZE     | M1     | t
 INSTITUTO PALUZZE     | M2     | f
 INSTITUTO PALUZZE     | M3     | f
 INSTITUTO PALUZZE     | M4     | t
 INSTITUTO PALUZZE     | M5     | f
 INSTITUTO PALUZZE     | M6     | f
 INSTITUTO PALUZZE     | M7     | f
 INSTITUTO PAZIALLE    | M1     | t
 INSTITUTO PAZIALLE    | M2     | f
 INSTITUTO PAZIALLE    | M3     | f
 INSTITUTO PAZIALLE    | M4     | t
 INSTITUTO PAZIALLE    | M5     | f
 INSTITUTO PAZIALLE    | M6     | f
 INSTITUTO PAZIALLE    | M7     | f
(70 rows)

```

## 7. 🔧 BACKEND COMPLETO


### `artifacts/api-server/src/app.ts`
```typescript
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { tenantContextMiddleware } from "./middlewares/tenantContext";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
// Stripe webhook precisa do raw body para validar assinatura — DEVE vir antes do express.json
app.use(
  "/api/payments/webhooks/stripe",
  express.raw({ type: "application/json" }),
);
// Webhooks Clicksign + ZapSign tambem usam raw body para HMAC SHA-256
app.use("/api/webhooks/assinatura/clicksign", express.raw({ type: "*/*" }));
app.use("/api/webhooks/assinatura/zapsign",   express.raw({ type: "*/*" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api", tenantContextMiddleware, router);

export default app;
```

### `artifacts/api-server/src/routes/index.ts`
```typescript
import { Router, type IRouter } from "express";
import healthRouter from "./health";
import comercialAdminRouter from "./comercialAdmin";
import paymentsRouter from "./payments";
import unidadesRouter from "./unidades";
import usuariosRouter from "./usuarios";
import pacientesRouter from "./pacientes";
import anamneseRouter from "./anamnese";
import motorClinicoRouter from "./motorClinico";
import blocosRouter from "./blocos";
import protocolosRouter from "./protocolos";
import filasRouter from "./filas";
import followupRouter from "./followup";
import financeiroRouter from "./financeiro";
import dashboardRouter from "./dashboard";
import fluxosRouter from "./fluxos";
import catalogoRouter from "./catalogo";
import questionarioPacienteRouter from "./questionarioPaciente";
import pedidosExameRouter from "./pedidosExame";
import substanciasRouter from "./substancias";
import sessoesRouter from "./sessoes";
import rasRouter from "./rasRoute";
import codigosSemanticosRouter from "./codigosSemanticos";
import googleCalendarRouter from "./googleCalendar";
import googleDriveRouter from "./googleDrive";
import googleGmailRouter from "./googleGmail";
import avaliacaoEnfermagemRouter from "./avaliacaoEnfermagem";
import taskCardsRouter from "./taskCards";
import rasEvolutivoRouter from "./rasEvolutivo";
import avaliacoesClienteRouter from "./avaliacoesCliente";
import portalClienteRouter from "./portalCliente";
import cavaloClinicalRouter from "./cavaloClinical";
import soberaniaRouter from "./soberania";
import auditoriaCascataRouter from "./auditoriaCascata";
import alertasRouter from "./alertas";
import mensagensRouter from "./mensagens";
import governancaRouter from "./governanca";
import examesInteligenteRouter from "./examesInteligente";
import monitoramentoPacienteRouter from "./monitoramentoPaciente";
import alertaPacienteRouter from "./alertaPaciente";
import direcaoExameRouter from "./direcaoExame";
import formulaBlendRouter from "./formulaBlend";
import backupDriveRouter from "./backupDrive";
import whatsappRouter from "./whatsapp";
import seedSemanticoRouter from "./seedSemantico";
import semanticoRouter from "./semantico";
import segurancaRouter from "./seguranca";
import delegacaoRouter from "./delegacao";
import seedConsultoriaRouter from "./seedConsultoria";
import acompanhamentoRouter from "./acompanhamento";
import comissaoRouter from "./comissao";
import comercialRouter from "./comercial";
import slaRouter from "./sla";
import matrixRouter from "./matrix";
import agendaMotorRouter from "./agenda-motor";
import colaboradoresRouter from "./colaboradores";
import agentesVirtuaisRouter from "./agentesVirtuais";
import rasDistribuirRouter from "./rasDistribuir";
import consultoriasRouter from "./consultoriasRoute";
import inundacaoRouter from "./inundacao";
import contratosRouter from "./contratosRoute";
import raclRacjRouter from "./raclRacj";
import rasxRevoRouter from "./rasxRevo";
import rasxArquRouter from "./rasxArqu";
import emailComunicacaoRouter from "./emailComunicacao";
import termosJuridicosRouter from "./termosJuridicos";
import genesisRouter from "./genesis";
import genesisPopularRouter from "./genesisPopular";
import documentosReferenciaRouter from "./documentosReferencia";
import assinaturasRouter from "./assinaturas";
import assinaturasWebhookRouter from "./assinaturasWebhook";
import juridicoNotaFiscalRouter from "./juridicoNotaFiscal";
import assinaturaCRUDRouter from "./assinaturaCRUD";
import manifestoNacionalRouter from "./manifestoNacional";
import planosTerapeuticosRouter from "./planosTerapeuticos";
import laboratorioIntegrativoRouter from "./laboratorioIntegrativo";
import prescricoesLembreteRouter from "./prescricoesLembrete";
import examesRouter from "./exames";
import agendasProfissionaisRouter from "./agendasProfissionais";
import matrixGovernancaCategoriaRouter from "./matrixGovernancaCategoria";
import monetizacaoPadconRouter from "./monetizacaoPadcon";
import drivePawardsRouter from "./drivePawards";

const router: IRouter = Router();

router.use(healthRouter);
router.use(unidadesRouter);
router.use(usuariosRouter);
router.use(pacientesRouter);
router.use(anamneseRouter);
router.use(motorClinicoRouter);
router.use(blocosRouter);
router.use(protocolosRouter);
router.use(filasRouter);
router.use(followupRouter);
router.use(financeiroRouter);
router.use(dashboardRouter);
router.use(fluxosRouter);
router.use("/catalogo", catalogoRouter);
router.use(questionarioPacienteRouter);
router.use("/pedidos-exame", pedidosExameRouter);
router.use(substanciasRouter);
router.use(sessoesRouter);
router.use(rasRouter);
router.use(codigosSemanticosRouter);
router.use(googleCalendarRouter);
router.use(googleDriveRouter);
router.use(googleGmailRouter);
router.use(avaliacaoEnfermagemRouter);
router.use(taskCardsRouter);
router.use(rasEvolutivoRouter);
router.use(avaliacoesClienteRouter);
router.use(portalClienteRouter);
router.use(cavaloClinicalRouter);
router.use(soberaniaRouter);
router.use(auditoriaCascataRouter);
router.use(alertasRouter);
router.use(mensagensRouter);
router.use(governancaRouter);
router.use(examesInteligenteRouter);
router.use(monitoramentoPacienteRouter);
router.use(alertaPacienteRouter);
router.use(direcaoExameRouter);
router.use(formulaBlendRouter);
router.use(backupDriveRouter);
router.use(whatsappRouter);
router.use("/seed-semantico", seedSemanticoRouter);
router.use("/semantico", semanticoRouter);
router.use(segurancaRouter);
router.use("/delegacao", delegacaoRouter);
router.use("/seed-consultoria", seedConsultoriaRouter);
router.use(acompanhamentoRouter);
router.use(comissaoRouter);
router.use(comercialRouter);
router.use(slaRouter);
router.use(matrixRouter);
router.use(agendaMotorRouter);
router.use("/colaboradores", colaboradoresRouter);
router.use("/agentes-virtuais", agentesVirtuaisRouter);
router.use(rasDistribuirRouter);
router.use(consultoriasRouter);
router.use(inundacaoRouter);
router.use(contratosRouter);
router.use(raclRacjRouter);
router.use(rasxRevoRouter);
router.use(rasxArquRouter);
router.use(emailComunicacaoRouter);
router.use(termosJuridicosRouter);
router.use("/genesis", genesisRouter);
router.use("/genesis-popular", genesisPopularRouter);
router.use(documentosReferenciaRouter);
router.use(assinaturasRouter);
router.use(assinaturasWebhookRouter);
router.use(juridicoNotaFiscalRouter);
router.use(assinaturaCRUDRouter);
router.use(manifestoNacionalRouter);
router.use(planosTerapeuticosRouter);
router.use(laboratorioIntegrativoRouter);
router.use(prescricoesLembreteRouter);
router.use(examesRouter);
router.use(agendasProfissionaisRouter);
router.use(matrixGovernancaCategoriaRouter);
router.use(monetizacaoPadconRouter);
router.use(drivePawardsRouter);
router.use("/payments", paymentsRouter);
router.use(comercialAdminRouter);

// PADCOM V15 — Anamnese Integrativa Estruturada (Manus Bundle)
import padcomRouter from "./padcom";
router.use(padcomRouter);

export default router;
```

### `artifacts/api-server/src/middlewares/tenantContext.ts`
```typescript
import type { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      tenantContext?: {
        unidadeId: number | null;
        origem: "header" | "query" | "session" | "default";
      };
    }
  }
}

export function tenantContextMiddleware(req: Request, _res: Response, next: NextFunction) {
  const headerVal = req.header("x-unidade-id");
  const queryVal = typeof req.query["unidade_id"] === "string" ? req.query["unidade_id"] : undefined;
  const sessionVal = (req as any).session?.unidadeId;

  let unidadeId: number | null = null;
  let origem: "header" | "query" | "session" | "default" = "default";

  if (headerVal && !Number.isNaN(Number(headerVal))) { unidadeId = Number(headerVal); origem = "header"; }
  else if (queryVal && !Number.isNaN(Number(queryVal))) { unidadeId = Number(queryVal); origem = "query"; }
  else if (sessionVal != null && !Number.isNaN(Number(sessionVal))) { unidadeId = Number(sessionVal); origem = "session"; }

  req.tenantContext = { unidadeId, origem };
  next();
}
```

### `artifacts/api-server/src/middlewares/requireAdminToken.ts`
```typescript
import type { Request, Response, NextFunction } from "express";

export function requireAdminToken(req: Request, res: Response, next: NextFunction) {
  const expected = process.env["ADMIN_TOKEN"];
  if (!expected) {
    return res.status(503).json({ error: "ADMIN_TOKEN nao configurado no servidor" });
  }
  const provided = req.header("x-admin-token");
  if (!provided || provided !== expected) {
    return res.status(403).json({ error: "Token administrativo invalido ou ausente" });
  }
  next();
}
```

### `artifacts/api-server/src/routes/monetizacaoPadcon.ts`
```typescript
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

// ═══════════════════════════════════════════════════════════════════
// MÓDULOS PADCON (M1-M7) — catálogo + ativação por unidade
// ═══════════════════════════════════════════════════════════════════

router.get("/modulos-padcon", async (_req, res): Promise<void> => {
  try {
    const result = await db.execute(sql`
      SELECT id, codigo, nome, descricao, preco_mensal, ordem, grupo, ativo
      FROM modulos_padcon
      WHERE ativo = TRUE
      ORDER BY ordem
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/modulos-padcon/matriz", async (_req, res): Promise<void> => {
  try {
    const result = await db.execute(sql`
      SELECT
        u.id AS unidade_id,
        u.nome AS unidade_nome,
        u.cor AS unidade_cor,
        m.id AS modulo_id,
        m.codigo AS modulo_codigo,
        m.nome AS modulo_nome,
        m.preco_mensal,
        m.grupo,
        COALESCE(uma.ativo, FALSE) AS ativo,
        uma.preco_personalizado,
        uma.ativado_em,
        uma.ativado_por
      FROM unidades u
      CROSS JOIN modulos_padcon m
      LEFT JOIN unidade_modulos_ativos uma ON uma.unidade_id = u.id AND uma.modulo_id = m.id
      WHERE u.id NOT BETWEEN 1 AND 7 AND m.ativo = TRUE
      ORDER BY u.id, m.ordem
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/modulos-padcon/ativar/:unidadeId/:moduloId", async (req, res): Promise<void> => {
  const { unidadeId, moduloId } = req.params;
  const { ativo, usuario, precoPersonalizado } = req.body ?? {};
  if (typeof ativo !== "boolean") {
    res.status(400).json({ error: "ativo (boolean) obrigatorio" });
    return;
  }
  try {
    const result = await db.execute(sql`
      INSERT INTO unidade_modulos_ativos (unidade_id, modulo_id, ativo, ativado_em, ativado_por, preco_personalizado)
      VALUES (${parseInt(unidadeId, 10)}, ${parseInt(moduloId, 10)}, ${ativo}, NOW(), ${usuario ?? "caio"}, ${precoPersonalizado ?? null})
      ON CONFLICT (unidade_id, modulo_id)
      DO UPDATE SET ativo = ${ativo}, ativado_em = NOW(), ativado_por = ${usuario ?? "caio"},
                    preco_personalizado = COALESCE(${precoPersonalizado ?? null}, unidade_modulos_ativos.preco_personalizado)
      RETURNING *
    `);
    res.json(result.rows[0] ?? null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// EVENTOS COBRÁVEIS (E1-E9) — catálogo + disparo (CORAÇÃO)
// ═══════════════════════════════════════════════════════════════════

router.get("/eventos-cobraveis", async (_req, res): Promise<void> => {
  try {
    const result = await db.execute(sql`
      SELECT id, codigo, nome, descricao, preco_unitario, unidade_medida, grupo, trigger_origem
      FROM eventos_cobraveis WHERE ativo = TRUE ORDER BY codigo
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CORAÇÃO: endpoint genérico que QUALQUER ação interna chama pra registrar consumo
router.post("/eventos-cobraveis/disparar", async (req, res): Promise<void> => {
  const { unidadeId, eventoCodigo, referenciaExterna, metadados } = req.body ?? {};
  if (!unidadeId || !eventoCodigo) {
    res.status(400).json({ error: "unidadeId e eventoCodigo obrigatorios" });
    return;
  }
  try {
    const evt = await db.execute(sql`
      SELECT id, preco_unitario FROM eventos_cobraveis WHERE codigo = ${eventoCodigo} AND ativo = TRUE
    `);
    if (evt.rows.length === 0) {
      res.status(404).json({ error: `Evento ${eventoCodigo} nao encontrado` });
      return;
    }
    const evento: any = evt.rows[0];
    const result = await db.execute(sql`
      INSERT INTO unidade_eventos_ledger (unidade_id, evento_id, valor_cobrado, referencia_externa, metadados)
      VALUES (${unidadeId}, ${evento.id}, ${evento.preco_unitario}, ${referenciaExterna ?? null}, ${metadados ? JSON.stringify(metadados) : null}::jsonb)
      RETURNING *
    `);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// LEDGER + FATURAMENTO LIVE
// ═══════════════════════════════════════════════════════════════════

router.get("/ledger/faturamento-live", async (req, res): Promise<void> => {
  const competencia = (req.query.competencia as string) ?? new Date().toISOString().slice(0, 7);
  try {
    const result = await db.execute(sql`
      SELECT
        u.id AS unidade_id,
        u.nome AS unidade_nome,
        u.cor AS unidade_cor,
        e.grupo,
        e.codigo AS evento_codigo,
        e.nome AS evento_nome,
        COUNT(l.id) AS qtd,
        COALESCE(SUM(l.valor_cobrado), 0) AS subtotal
      FROM unidades u
      LEFT JOIN unidade_eventos_ledger l ON l.unidade_id = u.id AND l.competencia_mes = ${competencia}
      LEFT JOIN eventos_cobraveis e ON e.id = l.evento_id
      WHERE u.id NOT BETWEEN 1 AND 7
      GROUP BY u.id, u.nome, u.cor, e.grupo, e.codigo, e.nome
      ORDER BY u.id, e.grupo NULLS LAST, e.codigo NULLS LAST
    `);
    const totaisPorUnidade = await db.execute(sql`
      SELECT
        u.id AS unidade_id,
        u.nome AS unidade_nome,
        COALESCE(SUM(l.valor_cobrado), 0) AS total_eventos,
        (SELECT COALESCE(SUM(m.preco_mensal), 0)
           FROM unidade_modulos_ativos uma
           JOIN modulos_padcon m ON m.id = uma.modulo_id
          WHERE uma.unidade_id = u.id AND uma.ativo = TRUE) AS total_modulos
      FROM unidades u
      LEFT JOIN unidade_eventos_ledger l ON l.unidade_id = u.id AND l.competencia_mes = ${competencia}
      WHERE u.id NOT BETWEEN 1 AND 7
      GROUP BY u.id, u.nome
      ORDER BY u.id
    `);
    res.json({ competencia, detalhe: result.rows, totaisPorUnidade: totaisPorUnidade.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// AGENDAS NUVEM — LIBERAÇÃO POR UNIDADE
// ═══════════════════════════════════════════════════════════════════

router.get("/agendas-nuvem-liberacao", async (_req, res): Promise<void> => {
  try {
    const result = await db.execute(sql`
      SELECT
        u.id AS unidade_id,
        u.nome AS unidade_nome,
        u.cor AS unidade_cor,
        l.agenda_template_codigo,
        l.liberada,
        l.estado,
        l.liberada_em,
        l.liberada_por
      FROM unidades u
      JOIN agendas_nuvem_liberacao l ON l.unidade_id = u.id
      WHERE u.id NOT BETWEEN 1 AND 7
      ORDER BY u.id, l.agenda_template_codigo
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/agendas-nuvem-liberacao/:unidadeId/:templateCodigo", async (req, res): Promise<void> => {
  const { unidadeId, templateCodigo } = req.params;
  const { liberada, estado, usuario } = req.body ?? {};
  try {
    const result = await db.execute(sql`
      UPDATE agendas_nuvem_liberacao
      SET liberada = COALESCE(${liberada ?? null}, liberada),
          estado = COALESCE(${estado ?? null}, estado),
          liberada_em = NOW(),
          liberada_por = ${usuario ?? "caio"}
      WHERE unidade_id = ${parseInt(unidadeId, 10)} AND agenda_template_codigo = ${templateCodigo}
      RETURNING *
    `);
    res.json(result.rows[0] ?? null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// DEMANDAS DE RESOLUÇÃO — Robô / IA / Humano + ping-pong
// ═══════════════════════════════════════════════════════════════════

router.get("/demandas-resolucao", async (req, res): Promise<void> => {
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : null;
  try {
    const result = await db.execute(sql`
      SELECT
        d.*,
        u.nome AS unidade_nome,
        u.cor AS unidade_cor
      FROM demandas_resolucao d
      JOIN unidades u ON u.id = d.unidade_id
      WHERE (${unidadeId}::int IS NULL OR d.unidade_id = ${unidadeId}::int)
      ORDER BY d.criado_em DESC
      LIMIT 200
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/demandas-resolucao", async (req, res): Promise<void> => {
  const { unidadeId, pacienteId, canalOrigem, assunto } = req.body ?? {};
  if (!unidadeId || !canalOrigem) {
    res.status(400).json({ error: "unidadeId e canalOrigem obrigatorios" });
    return;
  }
  try {
    const result = await db.execute(sql`
      INSERT INTO demandas_resolucao (unidade_id, paciente_id, canal_origem, assunto)
      VALUES (${unidadeId}, ${pacienteId ?? null}, ${canalOrigem}, ${assunto ?? null})
      RETURNING *
    `);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/demandas-resolucao/:id/turno", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { autorTipo, autorNome, canal, mensagem, eventoCobravelCodigo } = req.body ?? {};
  if (!autorTipo || !canal) {
    res.status(400).json({ error: "autorTipo e canal obrigatorios" });
    return;
  }
  try {
    const evtId = eventoCobravelCodigo
      ? (await db.execute(sql`SELECT id FROM eventos_cobraveis WHERE codigo = ${eventoCobravelCodigo}`)).rows[0]?.id ?? null
      : null;

    const turnoRes = await db.execute(sql`
      SELECT COALESCE(MAX(turno), 0) + 1 AS proximo FROM pingue_pongue_log WHERE demanda_id = ${id}
    `);
    const turno = (turnoRes.rows[0] as any).proximo;

    const inserted = await db.execute(sql`
      INSERT INTO pingue_pongue_log (demanda_id, turno, autor_tipo, autor_nome, canal, mensagem, evento_cobravel_id)
      VALUES (${id}, ${turno}, ${autorTipo}, ${autorNome ?? null}, ${canal}, ${mensagem ?? null}, ${evtId})
      RETURNING *
    `);

    // Atualiza contador da demanda + dispara evento cobrável se houver
    await db.execute(sql`
      UPDATE demandas_resolucao
      SET turnos_pingue_pongue = turnos_pingue_pongue + 1
      WHERE id = ${id}
    `);

    // Se há evento cobrável: dispara e contabiliza no ledger + valor_total da demanda
    if (evtId) {
      const demanda = (await db.execute(sql`SELECT unidade_id FROM demandas_resolucao WHERE id = ${id}`)).rows[0] as any;
      const evento = (await db.execute(sql`SELECT preco_unitario FROM eventos_cobraveis WHERE id = ${evtId}`)).rows[0] as any;
      await db.execute(sql`
        INSERT INTO unidade_eventos_ledger (unidade_id, evento_id, valor_cobrado, referencia_externa)
        VALUES (${demanda.unidade_id}, ${evtId}, ${evento.preco_unitario}, ${"demanda#" + id})
      `);
      await db.execute(sql`
        UPDATE demandas_resolucao SET valor_total_cobrado = valor_total_cobrado + ${evento.preco_unitario} WHERE id = ${id}
      `);
    }

    res.status(201).json(inserted.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/demandas-resolucao/:id/concluir", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { resolvidoPor, caminhoResolucao } = req.body ?? {};
  if (!resolvidoPor) {
    res.status(400).json({ error: "resolvidoPor (robo/ia/humano) obrigatorio" });
    return;
  }
  try {
    const result = await db.execute(sql`
      UPDATE demandas_resolucao
      SET resolvido = TRUE,
          resolvido_por = ${resolvidoPor},
          resolvido_em = NOW(),
          caminho_resolucao = ${caminhoResolucao ?? null}
      WHERE id = ${id}
      RETURNING *
    `);
    res.json(result.rows[0] ?? null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/demandas-resolucao/:id/timeline", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  try {
    const result = await db.execute(sql`
      SELECT p.*, e.codigo AS evento_codigo, e.preco_unitario AS evento_preco
      FROM pingue_pongue_log p
      LEFT JOIN eventos_cobraveis e ON e.id = p.evento_cobravel_id
      WHERE p.demanda_id = ${id}
      ORDER BY p.turno
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

### `artifacts/api-server/src/routes/drivePawards.ts`
```typescript
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getDriveClient, escapeDriveQuery } from "../lib/google-drive.js";

const router: IRouter = Router();

const PAWARDS_ROOT = "PAWARDS";
const SISTEMAS_CLINICO = "Sistemas Clinico";
const EMPRESAS = "Empresas";
const SUBPASTAS = ["Clientes", "Financeiro"] as const;
const SUBSUB_FINANCEIRO = ["Recorrentes", "Avulsos", "Faturas Mensais"] as const;

async function findOrCreate(drive: any, name: string, parentId?: string): Promise<{ id: string; created: boolean }> {
  const safe = escapeDriveQuery(name);
  const q = parentId
    ? `name='${safe}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
    : `name='${safe}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const list = await drive.files.list({ q, fields: "files(id,name)", spaces: "drive" });
  if (list.data.files && list.data.files.length > 0) return { id: list.data.files[0].id, created: false };
  const meta: any = { name, mimeType: "application/vnd.google-apps.folder" };
  if (parentId) meta.parents = [parentId];
  const created = await drive.files.create({ requestBody: meta, fields: "id" });
  return { id: created.data.id, created: true };
}

// Provisiona estrutura PAWARDS completa pra TODAS as 10 clínicas (ou só uma específica)
router.post("/drive-pawards/provisionar", async (req, res): Promise<void> => {
  const rawId = req.body?.unidadeId;
  const parsed = rawId !== undefined && rawId !== null && rawId !== "" ? Number(rawId) : null;
  if (rawId !== undefined && rawId !== null && rawId !== "" && !Number.isInteger(parsed)) {
    res.status(400).json({ error: "unidadeId invalido" });
    return;
  }
  const unidadeIdOnly = Number.isInteger(parsed) ? parsed : null;
  try {
    const drive = await getDriveClient();
    const root = await findOrCreate(drive, PAWARDS_ROOT);
    const sistemasClinico = await findOrCreate(drive, SISTEMAS_CLINICO, root.id);
    const empresas = await findOrCreate(drive, EMPRESAS, sistemasClinico.id);

    const unidades = await db.execute(sql`
      SELECT id, nome FROM unidades
      WHERE id NOT BETWEEN 1 AND 7
      ${unidadeIdOnly ? sql`AND id = ${unidadeIdOnly}` : sql``}
      ORDER BY id
    `);

    const provisionadas: any[] = [];
    for (const u of unidades.rows as any[]) {
      const empresa = await findOrCreate(drive, u.nome, empresas.id);
      const clientes = await findOrCreate(drive, "Clientes", empresa.id);
      const financeiro = await findOrCreate(drive, "Financeiro", empresa.id);
      const recorrentes = await findOrCreate(drive, "Recorrentes", financeiro.id);
      for (const sub of SUBSUB_FINANCEIRO.slice(1)) {
        await findOrCreate(drive, sub, financeiro.id);
      }

      await db.execute(sql`
        INSERT INTO clinica_drive_estrutura (unidade_id, pasta_raiz_id, pasta_clientes_id, pasta_financeiro_id, pasta_recorrentes_id, url_raiz, criada_por)
        VALUES (${u.id}, ${empresa.id}, ${clientes.id}, ${financeiro.id}, ${recorrentes.id},
                ${"https://drive.google.com/drive/folders/" + empresa.id}, 'caio_provisionar')
        ON CONFLICT (unidade_id) DO UPDATE SET
          pasta_raiz_id = EXCLUDED.pasta_raiz_id,
          pasta_clientes_id = EXCLUDED.pasta_clientes_id,
          pasta_financeiro_id = EXCLUDED.pasta_financeiro_id,
          pasta_recorrentes_id = EXCLUDED.pasta_recorrentes_id,
          url_raiz = EXCLUDED.url_raiz
      `);

      provisionadas.push({
        unidadeId: u.id,
        nome: u.nome,
        empresaFolderId: empresa.id,
        clientesFolderId: clientes.id,
        financeiroFolderId: financeiro.id,
        recorrentesFolderId: recorrentes.id,
        url: `https://drive.google.com/drive/folders/${empresa.id}`,
      });
    }

    res.json({
      success: true,
      pawardsRootId: root.id,
      pawardsRootUrl: `https://drive.google.com/drive/folders/${root.id}`,
      empresasContainerId: empresas.id,
      provisionadas,
      total: provisionadas.length,
    });
  } catch (err: any) {
    console.error("[DrivePawards] provisionar error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/drive-pawards/estrutura", async (_req, res): Promise<void> => {
  try {
    const result = await db.execute(sql`
      SELECT
        cde.unidade_id,
        u.nome AS unidade_nome,
        u.cor AS unidade_cor,
        cde.pasta_raiz_id,
        cde.pasta_clientes_id,
        cde.pasta_financeiro_id,
        cde.pasta_recorrentes_id,
        cde.url_raiz,
        cde.criada_em
      FROM clinica_drive_estrutura cde
      JOIN unidades u ON u.id = cde.unidade_id
      WHERE u.id NOT BETWEEN 1 AND 7
      ORDER BY cde.unidade_id
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

### `artifacts/api-server/src/routes/unidades.ts`
```typescript
import { Router } from "express";
import { db, unidadesTable } from "@workspace/db";
import { eq, and, gt, sql } from "drizzle-orm";
import { CriarUnidadeBody } from "@workspace/api-zod";

const router = Router();

router.get("/unidades", async (req, res): Promise<void> => {
  // Por padrao filtra arquivadas (ids 1-7 sao agendas-historicas confundidas).
  // ?incluirArquivadas=true para auditoria.
  const incluirArquivadas = req.query.incluirArquivadas === "true";
  const unidades = incluirArquivadas
    ? await db.select().from(unidadesTable).orderBy(unidadesTable.id)
    : await db.select().from(unidadesTable).where(gt(unidadesTable.id, 7)).orderBy(unidadesTable.id);
  res.json(unidades);
});

router.post("/unidades", async (req, res): Promise<void> => {
  const parsed = CriarUnidadeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [unidade] = await db.insert(unidadesTable).values(parsed.data).returning();
  res.status(201).json(unidade);
});

router.get("/unidades/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [unidade] = await db.select().from(unidadesTable).where(eq(unidadesTable.id, id));
  if (!unidade) { res.status(404).json({ error: "Unidade não encontrada" }); return; }
  res.json(unidade);
});

router.put("/unidades/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [existente] = await db.select().from(unidadesTable).where(eq(unidadesTable.id, id));
  if (!existente) { res.status(404).json({ error: "Unidade nao encontrada" }); return; }
  if (existente.tipo === "genesis_seed") {
    res.status(403).json({ error: "Instituto Genesis e semente perene — somente o administrador geral pode altera-la." });
    return;
  }
  const allowedFields = [
    "nome", "endereco", "bairro", "cidade", "estado", "cep", "cnpj",
    "telefone", "tipo", "googleCalendarId", "googleCalendarEmail", "cor", "ativa", "nick",
    "emailGeral", "emailAgenda", "emailEnfermagem01", "emailEnfermagem02",
    "emailConsultor01", "emailConsultor02", "emailSupervisor01", "emailSupervisor02",
    "emailFinanceiro01", "emailOuvidoria01",
  ];
  const updates: Record<string, any> = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nenhum campo para atualizar" });
    return;
  }
  const [updated] = await db.update(unidadesTable).set(updates).where(eq(unidadesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Unidade não encontrada" }); return; }
  res.json(updated);
});

router.delete("/unidades/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [unidade] = await db.select().from(unidadesTable).where(eq(unidadesTable.id, id));
  if (!unidade) { res.status(404).json({ error: "Unidade nao encontrada" }); return; }
  if (unidade.tipo === "genesis_seed") {
    res.status(403).json({ error: "Instituto Genesis e semente perene — nao pode ser excluido. Apenas adicoes sao permitidas." });
    return;
  }
  const [deleted] = await db.delete(unidadesTable).where(eq(unidadesTable.id, id)).returning();
  res.json({ ok: true });
});

export default router;
```

### `artifacts/api-server/src/routes/usuarios.ts`
```typescript
import { Router } from "express";
import { db, usuariosTable, unidadesTable, consultorUnidadesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CriarUsuarioBody, LoginUsuarioBody } from "@workspace/api-zod";

const router = Router();

router.get("/usuarios", async (req, res): Promise<void> => {
  const perfil = req.query.perfil as string | undefined;
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : undefined;

  let usuarios = await db
    .select({
      id: usuariosTable.id,
      nome: usuariosTable.nome,
      email: usuariosTable.email,
      perfil: usuariosTable.perfil,
      escopo: usuariosTable.escopo,
      unidadeId: usuariosTable.unidadeId,
      unidadeNome: unidadesTable.nome,
      consultoriaId: usuariosTable.consultoriaId,
      crm: usuariosTable.crm,
      cpf: usuariosTable.cpf,
      cns: usuariosTable.cns,
      especialidade: usuariosTable.especialidade,
      telefone: usuariosTable.telefone,
      ativo: usuariosTable.ativo,
      podeValidar: usuariosTable.podeValidar,
      podeAssinar: usuariosTable.podeAssinar,
      podeBypass: usuariosTable.podeBypass,
      nuncaOpera: usuariosTable.nuncaOpera,
      criadoEm: usuariosTable.criadoEm,
    })
    .from(usuariosTable)
    .leftJoin(unidadesTable, eq(usuariosTable.unidadeId, unidadesTable.id));

  if (perfil) {
    usuarios = usuarios.filter(u => u.perfil === perfil);
  }
  if (unidadeId) {
    usuarios = usuarios.filter(u => u.unidadeId === unidadeId);
  }

  res.json(usuarios);
});

router.post("/usuarios", async (req, res): Promise<void> => {
  const parsed = CriarUsuarioBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [usuario] = await db.insert(usuariosTable).values(parsed.data).returning();
  const { senha: _senha, ...safeUsuario } = usuario;
  res.status(201).json(safeUsuario);
});

router.post("/usuarios/login", async (req, res): Promise<void> => {
  const parsed = LoginUsuarioBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, senha } = parsed.data;
  const [usuario] = await db
    .select()
    .from(usuariosTable)
    .where(and(eq(usuariosTable.email, email), eq(usuariosTable.senha, senha)));
  if (!usuario) {
    res.status(401).json({ error: "Credenciais inválidas" });
    return;
  }
  const { senha: _senha, ...safeUsuario } = usuario;

  const vinculosConsultor = await db
    .select({ unidadeId: consultorUnidadesTable.unidadeId, unidadeNome: unidadesTable.nome, unidadeCor: unidadesTable.cor })
    .from(consultorUnidadesTable)
    .leftJoin(unidadesTable, eq(consultorUnidadesTable.unidadeId, unidadesTable.id))
    .where(and(eq(consultorUnidadesTable.usuarioId, usuario.id), eq(consultorUnidadesTable.ativo, true)));

  res.json({
    token: `token-${usuario.id}-${Date.now()}`,
    usuario: { ...safeUsuario, unidadesVinculadas: vinculosConsultor },
  });
});

router.get("/usuarios/perfil-atual", async (_req, res): Promise<void> => {
  const [usuario] = await db
    .select({
      id: usuariosTable.id,
      nome: usuariosTable.nome,
      email: usuariosTable.email,
      perfil: usuariosTable.perfil,
      escopo: usuariosTable.escopo,
      unidadeId: usuariosTable.unidadeId,
      consultoriaId: usuariosTable.consultoriaId,
      unidadeNome: unidadesTable.nome,
      ativo: usuariosTable.ativo,
      criadoEm: usuariosTable.criadoEm,
    })
    .from(usuariosTable)
    .leftJoin(unidadesTable, eq(usuariosTable.unidadeId, unidadesTable.id))
    .where(eq(usuariosTable.perfil, "validador_mestre"))
    .limit(1);
  if (!usuario) {
    res.status(404).json({ error: "Nenhum usuário encontrado" });
    return;
  }

  let unidadesVinculadas: { unidadeId: number; unidadeNome: string | null; unidadeCor: string | null }[];

  if (usuario.escopo === "consultoria_master") {
    const vinculos = await db.selectDistinct({ unidadeId: consultorUnidadesTable.unidadeId }).from(consultorUnidadesTable);
    const idsConsultoria = vinculos.map(v => v.unidadeId);
    const todasUnidades = await db.select({ unidadeId: unidadesTable.id, unidadeNome: unidadesTable.nome, unidadeCor: unidadesTable.cor }).from(unidadesTable);
    unidadesVinculadas = idsConsultoria.length > 0
      ? todasUnidades.filter(u => idsConsultoria.includes(u.unidadeId))
      : todasUnidades;
  } else {
    unidadesVinculadas = await db
      .select({ unidadeId: consultorUnidadesTable.unidadeId, unidadeNome: unidadesTable.nome, unidadeCor: unidadesTable.cor })
      .from(consultorUnidadesTable)
      .leftJoin(unidadesTable, eq(consultorUnidadesTable.unidadeId, unidadesTable.id))
      .where(and(eq(consultorUnidadesTable.usuarioId, usuario.id), eq(consultorUnidadesTable.ativo, true)));
  }

  res.json({ ...usuario, unidadesVinculadas });
});

router.put("/usuarios/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id <= 0) { res.status(400).json({ error: "ID invalido" }); return; }
  const allowedFields = ["nome", "email", "perfil", "unidadeId", "ativo", "escopo", "consultoriaId", "crm", "cpf", "cns", "especialidade", "telefone", "podeValidar", "podeAssinar", "podeBypass", "nuncaOpera"];
  const updateData: Record<string, any> = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) updateData[key] = req.body[key];
  }
  if (req.body.senha && req.body.senha.trim().length >= 6) {
    updateData.senha = req.body.senha;
  }
  try {
    const [updated] = await db.update(usuariosTable).set(updateData).where(eq(usuariosTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Usuario nao encontrado" }); return; }
    const { senha: _s, ...safe } = updated;
    res.json(safe);
  } catch (e: any) { res.status(500).json({ error: e.message || "Erro interno" }); }
});

router.delete("/usuarios/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id <= 0) { res.status(400).json({ error: "ID invalido" }); return; }
  try {
    const [deleted] = await db.delete(usuariosTable).where(eq(usuariosTable.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Usuario nao encontrado" }); return; }
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message || "Erro interno" }); }
});

export default router;
```

## 8. 🎨 FRONTEND COMPLETO


### `artifacts/clinica-motor/src/App.tsx`
```tsx
import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ClinicProvider } from "@/contexts/ClinicContext";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Anamneses from "@/pages/anamnese";
import NovaAnamnese from "@/pages/anamnese/nova";
import AnamneseDetalhe from "@/pages/anamnese/[id]";
import Validacao from "@/pages/validacao";
import Filas from "@/pages/filas";
import Pacientes from "@/pages/pacientes";
import ExamesGrafico from "@/pages/pacientes/exames-grafico";
import LaboratorioValidacao from "@/pages/laboratorio-validacao";
import PacienteDetalhe from "@/pages/pacientes/[id]";
import ItensTerapeuticos from "@/pages/itens-terapeuticos";
import Protocolos from "@/pages/protocolos";
import Followup from "@/pages/followup";
import Financeiro from "@/pages/financeiro";
import Unidades from "@/pages/unidades";
import Configuracoes from "@/pages/configuracoes";
import Fluxos from "@/pages/fluxos";
import Permissoes from "@/pages/permissoes";
import Catalogo from "@/pages/catalogo";
import QuestionarioPaciente from "@/pages/pacientes/questionario";
import PedidosExame from "@/pages/pedidos-exame";
import Substancias from "@/pages/substancias";
import AgendaSemanal from "@/pages/agenda";
import CodigosSemanticos from "@/pages/codigos-semanticos";
import RasPage from "@/pages/ras";
import CodigosValidacaoPage from "@/pages/codigos-validacao";
import EstoquePage from "@/pages/estoque";
import TaskCardsPage from "@/pages/task-cards";
import AvaliacaoEnfermagemPage from "@/pages/avaliacao-enfermagem";
import RasEvolutivoPage from "@/pages/ras-evolutivo";
import PortalClientePage from "@/pages/portal";
import GovernancaPage from "@/pages/governanca";
import MonitoramentoPacientePage from "@/pages/pacientes/monitoramento";
import SegurancaPage from "@/pages/seguranca";
import PainelComandoPage from "@/pages/painel-comando";
import PainelTransmutacao from "@/pages/painel-transmutacao";
import ProtocoloNatacha from "@/pages/protocolo-natacha";
import DelegacaoPage from "@/pages/delegacao";
import ColaboradoresPage from "@/pages/colaboradores";
import AgentesVirtuaisPage from "@/pages/agentes-virtuais";
import AcompanhamentoPage from "@/pages/acompanhamento";
import ComissaoPage from "@/pages/comissao";
import ComercialPage from "@/pages/comercial";
import JustificativasPage from "@/pages/justificativas";
import MatrizAnaliticaPage from "@/pages/matriz-analitica";
import AgendaMotorPage from "@/pages/agenda-motor";
import DietasPage from "@/pages/dietas";
import PsicologiaPage from "@/pages/psicologia";
import QuestionarioMasterPage from "@/pages/questionario-master";
import ConsultoriasPage from "@/pages/consultorias";
import ContratosPage from "@/pages/contratos";
import AdminComercialPage from "@/pages/admin-comercial";
import InundacaoPage from "@/pages/inundacao";
import BlueprintPage from "@/pages/blueprint";
// PADCOM V15 — Anamnese Integrativa Estruturada (Manus Bundle)
import PadcomPaciente from "@/pages/padcom/paciente";
import PadcomConcluido from "@/pages/padcom/concluido";
import PadcomAdmin from "@/pages/padcom/admin";
import PadcomAdminDetalhe from "@/pages/padcom/admin-detalhe";
import PadcomAdminDashboard from "@/pages/padcom/admin-dashboard";
import PadcomGovernanca from "@/pages/padcom/governanca";
import PadcomAgendaRetornos from "@/pages/padcom/agenda-retornos";
import LembretesFalhasPage from "@/pages/lembretes-falhas";
import MensagensPage from "@/pages/mensagens";
import ExamesPage from "@/pages/exames";
import AgendasPage from "@/pages/agendas";
import GovernancaMatrixPage from "@/pages/governanca-matrix";
import MonetizarPage from "@/pages/monetizar";
import DashboardLocalPage from "@/pages/dashboard-local";
import DemandasResolucaoPage from "@/pages/demandas-resolucao";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/anamnese" component={Anamneses} />
      <Route path="/anamnese/nova" component={NovaAnamnese} />
      <Route path="/anamnese/:id" component={AnamneseDetalhe} />
      <Route path="/validacao" component={Validacao} />
      <Route path="/filas" component={Filas} />
      <Route path="/pacientes" component={Pacientes} />
      <Route path="/pacientes/:id/questionario" component={QuestionarioPaciente} />
      <Route path="/pacientes/:id/exames-grafico" component={ExamesGrafico} />
      <Route path="/laboratorio/validacao" component={LaboratorioValidacao} />
      <Route path="/pacientes/:id" component={PacienteDetalhe} />
      <Route path="/itens-terapeuticos" component={ItensTerapeuticos} />
      <Route path="/protocolos" component={Protocolos} />
      <Route path="/followup" component={Followup} />
      <Route path="/financeiro" component={Financeiro} />
      <Route path="/unidades" component={Unidades} />
      <Route path="/configuracoes" component={Configuracoes} />
      <Route path="/fluxos" component={Fluxos} />
      <Route path="/permissoes" component={Permissoes} />
      <Route path="/pedidos-exame" component={PedidosExame} />
      <Route path="/catalogo" component={Catalogo} />
      <Route path="/substancias" component={Substancias} />
      <Route path="/agenda" component={AgendaSemanal} />
      <Route path="/codigos-semanticos" component={CodigosSemanticos} />
      <Route path="/ras" component={RasPage} />
      <Route path="/codigos-validacao" component={CodigosValidacaoPage} />
      <Route path="/inundacao" component={InundacaoPage} />
      <Route path="/blueprint" component={BlueprintPage} />
      <Route path="/agendas" component={AgendasPage} />
      <Route path="/governanca-matrix" component={GovernancaMatrixPage} />
      <Route path="/estoque" component={EstoquePage} />
      <Route path="/task-cards" component={TaskCardsPage} />
      <Route path="/avaliacao-enfermagem" component={AvaliacaoEnfermagemPage} />
      <Route path="/ras-evolutivo" component={RasEvolutivoPage} />
      <Route path="/pacientes/:id/monitoramento" component={MonitoramentoPacientePage} />
      <Route path="/portal" component={PortalClientePage} />
      <Route path="/governanca" component={GovernancaPage} />
      <Route path="/seguranca" component={SegurancaPage} />
      <Route path="/painel-comando" component={PainelComandoPage} />
      <Route path="/painel-transmutacao" component={PainelTransmutacao} />
      <Route path="/protocolo-natacha" component={ProtocoloNatacha} />
      <Route path="/delegacao" component={DelegacaoPage} />
      <Route path="/colaboradores" component={ColaboradoresPage} />
      <Route path="/agentes-virtuais" component={AgentesVirtuaisPage} />
      <Route path="/acompanhamento" component={AcompanhamentoPage} />
      <Route path="/comissao" component={ComissaoPage} />
      <Route path="/comercial" component={ComercialPage} />
      <Route path="/justificativas" component={JustificativasPage} />
      <Route path="/matriz-analitica" component={MatrizAnaliticaPage} />
      <Route path="/agenda-motor" component={AgendaMotorPage} />
      <Route path="/dietas" component={DietasPage} />
      <Route path="/psicologia" component={PsicologiaPage} />
      <Route path="/questionario-master" component={QuestionarioMasterPage} />
      <Route path="/consultorias" component={ConsultoriasPage} />
      <Route path="/contratos" component={ContratosPage} />
      <Route path="/admin-comercial" component={AdminComercialPage} />
      {/* ══════ PADCOM V15 — Anamnese Integrativa (Manus Bundle) ══════ */}
      <Route path="/padcom" component={PadcomPaciente} />
      <Route path="/padcom/concluido" component={PadcomConcluido} />
      <Route path="/padcom-admin/dashboard" component={PadcomAdminDashboard} />
      <Route path="/padcom-admin/:sessaoId" component={PadcomAdminDetalhe} />
      <Route path="/padcom-admin" component={PadcomAdmin} />
      <Route path="/padcom-governanca" component={PadcomGovernanca} />
      <Route path="/padcom-agenda-retornos" component={PadcomAgendaRetornos} />
      <Route path="/lembretes-falhas" component={LembretesFalhasPage} />
      <Route path="/mensagens" component={MensagensPage} />
      <Route path="/exames" component={ExamesPage} />
      <Route path="/monetizar" component={MonetizarPage} />
      <Route path="/dashboard-local" component={DashboardLocalPage} />
      <Route path="/demandas-resolucao" component={DemandasResolucaoPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ClinicProvider>
            <Router />
            <Toaster />
          </ClinicProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
```

### `artifacts/clinica-motor/src/components/Layout.tsx`
```tsx
import { ReactNode, useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
import { useLembretesFalhasContagem } from "@/hooks/useLembretesFalhasContagem";
import {
  LayoutDashboard, ClipboardList, CheckSquare, ListOrdered, Users, Pill, BookOpen, CalendarClock, CreditCard,
  Building2, Settings, LogOut, GitBranch, ShieldCheck, Database, FileText, FlaskConical, CalendarDays,
  FileCheck, KeyRound, Package, ClipboardCheck, AlertTriangle, BarChart3, Shield, Lock, Radar, Send,
  ChevronDown, ChevronRight, Globe, Diamond, DollarSign, TrendingUp, Scale, Grid3X3, UserCheck, Bot, Apple, Brain,
  ClipboardList as ClipboardListIcon, Building, FileSignature, BellRing, MessageSquareText, Cloud, Mountain, Heart, MessageCircle,
} from "lucide-react";
import { Button } from "./ui/button";

function ClinicSwitcher() {
  const { unidadeSelecionada, setUnidadeSelecionada, unidadesDisponiveis, nomeUnidadeSelecionada, corUnidadeSelecionada, isTodasClinicas, escopo } = useClinic();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const canSwitch = escopo === "consultoria_master" || (escopo === "consultor_campo" && unidadesDisponiveis.length > 1);
  if (unidadesDisponiveis.length === 0) return null;

  // Pádua (15) e Genesis (14) sobem pro topo com destaque
  const padua = unidadesDisponiveis.find((u) => u.unidadeId === 15);
  const genesis = unidadesDisponiveis.find((u) => u.unidadeId === 14);
  const outras = unidadesDisponiveis.filter((u) => u.unidadeId !== 14 && u.unidadeId !== 15);

  const decorarNome = (uid: number, nome: string) => {
    if (uid === 15) return `⭐ ${nome}`;
    if (uid === 14) return `🧬 ${nome}`;
    return nome;
  };

  return (
    <div ref={ref} className="px-3 py-2 border-b border-border relative">
      <button
        onClick={() => canSwitch && setOpen(!open)}
        className={`w-full flex items-center gap-2 px-2 py-1.5 text-left transition-colors rounded ${canSwitch ? "hover:bg-sidebar-accent/50 cursor-pointer" : "cursor-default"}`}
        data-testid="clinic-switcher-toggle"
      >
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: corUnidadeSelecionada || "hsl(210, 45%, 65%)" }} />
        <div className="flex-1 min-w-0">
          <span className="text-[12px] font-medium text-sidebar-foreground truncate block">
            {unidadeSelecionada ? decorarNome(unidadeSelecionada, nomeUnidadeSelecionada) : nomeUnidadeSelecionada}
          </span>
          <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: isTodasClinicas ? "hsl(210, 45%, 65%)" : corUnidadeSelecionada || "#6B7280" }}>
            {isTodasClinicas ? "Visao Global" : "Visao Local"}
          </span>
        </div>
        {canSwitch && <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>
      {open && (
        <div className="absolute left-2 right-2 top-full mt-1 bg-card border border-border rounded shadow-lg z-50 py-1 max-h-72 overflow-y-auto">
          {(escopo === "consultoria_master" || escopo === "consultor_campo") && (
            <button
              onClick={() => { setUnidadeSelecionada(null); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-sidebar-accent/50 transition-colors ${isTodasClinicas ? "bg-primary/10 text-primary font-semibold" : "text-sidebar-foreground"}`}
              data-testid="clinic-option-todas"
            >
              <Globe className="w-3.5 h-3.5" />
              Todas as Clínicas
            </button>
          )}
          {padua && (
            <button
              key={padua.unidadeId}
              onClick={() => { setUnidadeSelecionada(padua.unidadeId); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-[#B8941F]/10 transition-colors border-l-2 ${unidadeSelecionada === padua.unidadeId ? "bg-[#B8941F]/15 font-semibold border-l-[#B8941F]" : "border-l-[#B8941F]/40 text-sidebar-foreground"}`}
              data-testid="clinic-option-padua"
            >
              <span className="text-base">⭐</span>
              <span className="font-medium">{padua.unidadeNome}</span>
              <span className="ml-auto text-[9px] text-[#B8941F] uppercase font-bold">PRINCIPAL</span>
            </button>
          )}
          {genesis && (
            <button
              key={genesis.unidadeId}
              onClick={() => { setUnidadeSelecionada(genesis.unidadeId); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-purple-500/10 transition-colors border-l-2 ${unidadeSelecionada === genesis.unidadeId ? "bg-purple-500/15 font-semibold border-l-purple-500" : "border-l-purple-500/40 text-sidebar-foreground"}`}
              data-testid="clinic-option-genesis"
            >
              <span className="text-base">🧬</span>
              <span className="font-medium">{genesis.unidadeNome}</span>
              <span className="ml-auto text-[9px] text-purple-500 uppercase font-bold">COFRE</span>
            </button>
          )}
          {(padua || genesis) && outras.length > 0 && <div className="my-1 mx-3 border-t border-border" />}
          {outras.map((u) => (
            <button
              key={u.unidadeId}
              onClick={() => { setUnidadeSelecionada(u.unidadeId); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-sidebar-accent/50 transition-colors ${unidadeSelecionada === u.unidadeId ? "bg-primary/10 font-semibold" : "text-sidebar-foreground"}`}
              data-testid={`clinic-option-${u.unidadeId}`}
            >
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: u.unidadeCor || "#6B7280" }} />
              {u.unidadeNome}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type Item = { name: string; path: string; icon: any; slug: string };
type Grupo = { id: string; nome: string; icon: any; cor?: string; items: Item[] };

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { unidadeSelecionada, setUnidadeSelecionada, unidadesDisponiveis } = useClinic();
  const { total: falhasLembrete } = useLembretesFalhasContagem(unidadeSelecionada);

  // Default Pádua APENAS na primeira sessão (não anula escolha "Todas as Clínicas")
  useEffect(() => {
    const jaInicializou = localStorage.getItem("padua_default_aplicado");
    if (!jaInicializou && unidadeSelecionada === null && unidadesDisponiveis.length > 0) {
      const padua = unidadesDisponiveis.find((u) => u.unidadeId === 15);
      if (padua) {
        setUnidadeSelecionada(15);
        localStorage.setItem("padua_default_aplicado", "1");
      }
    }
  }, [unidadesDisponiveis, unidadeSelecionada, setUnidadeSelecionada]);

  // Estado de colapso por grupo (lembrar via localStorage) — DEVE vir antes do early return
  const [colapsados, setColapsados] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("layout_grupos_colapsados") || "{}");
    } catch { return {}; }
  });
  const toggleGrupo = (id: string) => {
    setColapsados((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem("layout_grupos_colapsados", JSON.stringify(next));
      return next;
    });
  };

  if (!user) return <>{children}</>;

  const VISIBILIDADE_POR_ESCOPO: Record<string, string[]> = {
    consultoria_master: [
      "dashboard", "dashboard-local", "monetizar", "demandas-resolucao",
      "painel-comando", "governanca", "justificativas", "matriz-analitica",
      "agenda-motor", "anamnese", "validacao",
      "filas", "pacientes", "itens-terapeuticos", "protocolos", "followup",
      "financeiro", "unidades", "fluxos", "pedidos-exame", "substancias",
      "agenda", "ras", "codigos-validacao", "estoque", "avaliacao-enfermagem",
      "task-cards", "ras-evolutivo", "catalogo", "permissoes", "seguranca",
      "configuracoes", "delegacao", "colaboradores", "agentes-virtuais", "acompanhamento", "comissao", "comercial",
      "dietas", "psicologia", "questionario-master", "consultorias", "contratos", "lembretes-falhas", "mensagens",
      "exames", "inundacao", "blueprint", "agendas", "governanca-matrix",
    ],
    consultor_campo: [
      "delegacao", "colaboradores", "pacientes", "anamnese", "followup", "agenda",
      "task-cards", "filas", "avaliacao-enfermagem", "estoque", "acompanhamento", "comissao",
      "justificativas", "lembretes-falhas", "dashboard-local", "demandas-resolucao",
    ],
    clinica_medico: ["anamnese","validacao","pacientes","itens-terapeuticos","pedidos-exame","agenda","ras","ras-evolutivo","followup","delegacao","colaboradores","lembretes-falhas","dashboard-local"],
    clinica_enfermeira: ["anamnese","filas","pacientes","followup","agenda","estoque","avaliacao-enfermagem","task-cards","delegacao","colaboradores","lembretes-falhas","dashboard-local"],
    clinica_admin: ["anamnese","filas","pacientes","followup","agenda","estoque","avaliacao-enfermagem","task-cards","financeiro","delegacao","colaboradores","lembretes-falhas","dashboard-local"],
  };

  const grupos: Grupo[] = [
    {
      id: "global",
      nome: "DASHBOARD GLOBAL",
      icon: Cloud,
      cor: "#1F4E5F",
      items: [
        { name: "Visão Geral", path: "/dashboard", icon: LayoutDashboard, slug: "dashboard" },
        { name: "Painel de Comando", path: "/painel-comando", icon: Radar, slug: "painel-comando" },
        { name: "💰 Monetizar PADCON", path: "/monetizar", icon: Heart, slug: "monetizar" },
        { name: "🛡️ Matrix Governança", path: "/governanca-matrix", icon: Shield, slug: "governanca-matrix" },
        { name: "Governança Geral", path: "/governanca", icon: Shield, slug: "governanca" },
        { name: "SLA Justificativas", path: "/justificativas", icon: Scale, slug: "justificativas" },
        { name: "Matriz Analítica", path: "/matriz-analitica", icon: Grid3X3, slug: "matriz-analitica" },
        { name: "🏛️ Blueprint Arquitetura", path: "/blueprint", icon: Building, slug: "blueprint" },
        { name: "💧 Inundação Genesis", path: "/inundacao", icon: Database, slug: "inundacao" },
      ],
    },
    {
      id: "local",
      nome: "DASHBOARD LOCAL",
      icon: Mountain,
      cor: "#A78B5F",
      items: [
        { name: "⛰️ Visão da Clínica", path: "/dashboard-local", icon: Mountain, slug: "dashboard-local" },
        { name: "🏷️ Demandas Resolução", path: "/demandas-resolucao", icon: MessageCircle, slug: "demandas-resolucao" },
        { name: "Lembretes & Falhas", path: "/lembretes-falhas", icon: BellRing, slug: "lembretes-falhas" },
        { name: "Mensagens", path: "/mensagens", icon: MessageSquareText, slug: "mensagens" },
        { name: "Acompanhamento", path: "/acompanhamento", icon: Diamond, slug: "acompanhamento" },
      ],
    },
    {
      id: "agendas",
      nome: "AGENDAS & MOTOR",
      icon: CalendarDays,
      cor: "#5C7C8A",
      items: [
        { name: "🏔️ Matriz de Agenda", path: "/agendas", icon: CalendarDays, slug: "agendas" },
        { name: "Motor de Agenda", path: "/agenda-motor", icon: CalendarDays, slug: "agenda-motor" },
        { name: "Agenda Semanal", path: "/agenda", icon: CalendarDays, slug: "agenda" },
        { name: "Follow-up", path: "/followup", icon: CalendarClock, slug: "followup" },
      ],
    },
    {
      id: "pacientes",
      nome: "CLÍNICA & PACIENTES",
      icon: Users,
      cor: "#7B6450",
      items: [
        { name: "Anamnese", path: "/anamnese", icon: ClipboardList, slug: "anamnese" },
        { name: "Validação", path: "/validacao", icon: CheckSquare, slug: "validacao" },
        { name: "Filas", path: "/filas", icon: ListOrdered, slug: "filas" },
        { name: "Pacientes", path: "/pacientes", icon: Users, slug: "pacientes" },
        { name: "Pedidos de Exame", path: "/pedidos-exame", icon: FileText, slug: "pedidos-exame" },
        { name: "RAS", path: "/ras", icon: FileCheck, slug: "ras" },
        { name: "RAS Evolutivo", path: "/ras-evolutivo", icon: BarChart3, slug: "ras-evolutivo" },
        { name: "Aval. Enfermagem", path: "/avaliacao-enfermagem", icon: ClipboardCheck, slug: "avaliacao-enfermagem" },
        { name: "Task Cards", path: "/task-cards", icon: AlertTriangle, slug: "task-cards" },
        { name: "Dietas", path: "/dietas", icon: Apple, slug: "dietas" },
        { name: "Psicologia", path: "/psicologia", icon: Brain, slug: "psicologia" },
      ],
    },
    {
      id: "catalogos",
      nome: "CATÁLOGOS GLOBAIS",
      icon: Database,
      cor: "#B8941F",
      items: [
        { name: "Catalogo Pawards", path: "/catalogo", icon: Database, slug: "catalogo" },
        { name: "Itens Terapêuticos", path: "/itens-terapeuticos", icon: Pill, slug: "itens-terapeuticos" },
        { name: "Protocolos", path: "/protocolos", icon: BookOpen, slug: "protocolos" },
        { name: "Substâncias", path: "/substancias", icon: FlaskConical, slug: "substancias" },
        { name: "Exames (Catálogo)", path: "/exames", icon: FlaskConical, slug: "exames" },
        { name: "Estoque", path: "/estoque", icon: Package, slug: "estoque" },
        { name: "Códigos Validação", path: "/codigos-validacao", icon: KeyRound, slug: "codigos-validacao" },
        { name: "Questionário Master", path: "/questionario-master", icon: ClipboardListIcon, slug: "questionario-master" },
      ],
    },
    {
      id: "estrutura",
      nome: "ESTRUTURA & RH",
      icon: Building,
      cor: "#1F4E5F",
      items: [
        { name: "Unidades", path: "/unidades", icon: Building2, slug: "unidades" },
        { name: "Consultorias", path: "/consultorias", icon: Building, slug: "consultorias" },
        { name: "Contratos", path: "/contratos", icon: FileSignature, slug: "contratos" },
        { name: "Colaboradores & RH", path: "/colaboradores", icon: UserCheck, slug: "colaboradores" },
        { name: "Delegação", path: "/delegacao", icon: Send, slug: "delegacao" },
        { name: "Agentes Virtuais", path: "/agentes-virtuais", icon: Bot, slug: "agentes-virtuais" },
        { name: "Comissão & Metas", path: "/comissao", icon: DollarSign, slug: "comissao" },
        { name: "Comercial", path: "/comercial", icon: TrendingUp, slug: "comercial" },
        { name: "Financeiro", path: "/financeiro", icon: CreditCard, slug: "financeiro" },
        { name: "Fluxos Aprovação", path: "/fluxos", icon: GitBranch, slug: "fluxos" },
        { name: "Permissões", path: "/permissoes", icon: ShieldCheck, slug: "permissoes" },
        { name: "Segurança", path: "/seguranca", icon: Lock, slug: "seguranca" },
        { name: "Configurações", path: "/configuracoes", icon: Settings, slug: "configuracoes" },
      ],
    },
  ];

  const escopo = (user as any).escopo || "consultoria_master";
  const modulosPermitidos = VISIBILIDADE_POR_ESCOPO[escopo] || VISIBILIDADE_POR_ESCOPO.consultoria_master;
  const escopoLabel = escopo === "consultoria_master" ? "Master" : escopo === "consultor_campo" ? "Consultor" : escopo.replace("clinica_", "").replace("_", " ");

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
        <div className="h-16 flex items-center px-5 border-b border-border">
          <div className="w-9 h-9 flex items-center justify-center bg-white/90 border border-border mr-3 p-1">
            <img src={`${import.meta.env.BASE_URL}logo-dp.png`} alt="DP" className="w-full h-full object-contain invert-0" />
          </div>
          <div>
            <span className="font-bold text-sm text-sidebar-foreground tracking-tight uppercase">Pawards</span>
            <span className="block text-[10px] text-muted-foreground tracking-widest uppercase">Developed by Pawards MedCore</span>
          </div>
        </div>
        <div className="px-5 py-3 border-b border-border">
          <div className="text-sm font-semibold text-sidebar-foreground truncate">{user.nome}</div>
          <div className="text-[11px] text-muted-foreground capitalize tracking-wide">{user.perfil.replace("_", " ")}</div>
          <div className="text-[9px] text-primary/70 uppercase tracking-widest mt-0.5">{escopoLabel}</div>
        </div>
        <ClinicSwitcher />
        <nav className="flex-1 overflow-y-auto py-2 px-1">
          {grupos.map((g) => {
            const items = g.items.filter((i) => modulosPermitidos.includes(i.slug));
            if (items.length === 0) return null;
            const colapsado = !!colapsados[g.id];
            const GIcon = g.icon;
            return (
              <div key={g.id} className="mb-1.5">
                <button
                  onClick={() => toggleGrupo(g.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground transition-colors"
                  data-testid={`grupo-toggle-${g.id}`}
                >
                  <GIcon className="w-3 h-3" style={{ color: g.cor }} />
                  <span className="flex-1 text-left">{g.nome}</span>
                  <ChevronRight className={`w-3 h-3 transition-transform ${colapsado ? "" : "rotate-90"}`} />
                </button>
                {!colapsado && (
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const Icon = item.icon;
                      const isActive = location === item.path || location.startsWith(item.path + "/");
                      return (
                        <Link
                          key={item.path}
                          href={item.path}
                          className={`flex items-center px-3 py-1.5 text-[12px] transition-colors border-l-2 ${
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold border-l-primary"
                              : "text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground border-l-transparent"
                          }`}
                          data-testid={`menu-${item.slug}`}
                        >
                          <Icon className="mr-2.5 h-3.5 w-3.5 flex-shrink-0" />
                          <span className="flex-1 truncate">{item.name}</span>
                          {item.slug === "lembretes-falhas" && falhasLembrete > 0 ? (
                            <span data-testid="badge-lembretes-falhas"
                              className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-600 text-white text-[10px] font-semibold leading-none">
                              {falhasLembrete > 99 ? "99+" : falhasLembrete}
                            </span>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t border-border">
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground text-xs" onClick={logout}>
            <LogOut className="mr-3 h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}
```

### `artifacts/clinica-motor/src/contexts/AuthContext.tsx`
```tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useObterPerfilAtual, useLoginUsuario, Usuario, LoginBody } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: Usuario | null;
  isLoading: boolean;
  login: (data: LoginBody) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: perfilAtual, isLoading: isLoadingPerfil, error } = useObterPerfilAtual({
    query: {
      retry: false,
    }
  });

  const [user, setUser] = useState<Usuario | null>(null);
  const { toast } = useToast();

  const loginMutation = useLoginUsuario();

  useEffect(() => {
    if (perfilAtual) {
      setUser(perfilAtual);
    }
  }, [perfilAtual]);

  const login = (data: LoginBody) => {
    loginMutation.mutate({ data }, {
      onSuccess: (res) => {
        setUser(res.usuario);
        toast({ title: "Login realizado com sucesso." });
      },
      onError: () => {
        toast({ title: "Erro no login", variant: "destructive" });
      }
    });
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading: isLoadingPerfil, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
```

### `artifacts/clinica-motor/src/contexts/ClinicContext.tsx`
```tsx
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";

interface UnidadeVinculada {
  unidadeId: number;
  unidadeNome: string;
  unidadeCor: string;
}

type ModoVisao = "arquiteto_mestre" | "dono_clinica" | "consultor" | "operacional";

interface ClinicContextType {
  unidadeSelecionada: number | null;
  setUnidadeSelecionada: (id: number | null) => void;
  unidadesDisponiveis: UnidadeVinculada[];
  nomeUnidadeSelecionada: string;
  corUnidadeSelecionada: string | null;
  isTodasClinicas: boolean;
  escopo: string;
  modoVisao: ModoVisao;
  modoLabel: string;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export function ClinicProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<number | null>(null);

  const escopo = (user as any)?.escopo || "consultoria_master";
  const unidadesVinculadas: UnidadeVinculada[] = (user as any)?.unidadesVinculadas || [];

  const unidadesDisponiveis: UnidadeVinculada[] = (() => {
    if (escopo === "consultoria_master") {
      return unidadesVinculadas;
    }
    if (escopo === "consultor_campo") {
      return unidadesVinculadas;
    }
    if ((user as any)?.unidadeId) {
      return [{
        unidadeId: (user as any).unidadeId,
        unidadeNome: (user as any).unidadeNome || "Minha Clínica",
        unidadeCor: "#6B7280",
      }];
    }
    return [];
  })();

  useEffect(() => {
    if (escopo === "consultoria_master") {
      setUnidadeSelecionada(null);
    } else if (escopo === "consultor_campo") {
      setUnidadeSelecionada(null);
    } else if (unidadesDisponiveis.length === 1) {
      setUnidadeSelecionada(unidadesDisponiveis[0].unidadeId);
    }
  }, [escopo, user]);

  const selecionada = unidadesDisponiveis.find(u => u.unidadeId === unidadeSelecionada);
  const nomeUnidadeSelecionada = selecionada?.unidadeNome || "Todas as Clínicas";
  const corUnidadeSelecionada = selecionada?.unidadeCor || null;
  const isTodasClinicas = unidadeSelecionada === null;

  const modoVisao: ModoVisao = (() => {
    if (escopo === "consultoria_master" && isTodasClinicas) return "arquiteto_mestre";
    if (escopo === "consultoria_master" && !isTodasClinicas) return "dono_clinica";
    if (escopo === "consultor_campo") return "consultor";
    return "operacional";
  })();

  const modoLabel = (() => {
    switch (modoVisao) {
      case "arquiteto_mestre": return "Visao Global";
      case "dono_clinica": return "Visao Local";
      case "consultor": return "Consultor";
      case "operacional": return "Operacional";
    }
  })();

  return (
    <ClinicContext.Provider value={{
      unidadeSelecionada,
      setUnidadeSelecionada,
      unidadesDisponiveis,
      nomeUnidadeSelecionada,
      corUnidadeSelecionada,
      isTodasClinicas,
      escopo,
      modoVisao,
      modoLabel,
    }}>
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  const context = useContext(ClinicContext);
  if (!context) {
    throw new Error("useClinic must be used within a ClinicProvider");
  }
  return context;
}
```

### `artifacts/clinica-motor/src/pages/monetizar.tsx`
```tsx
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Activity, DollarSign, Calendar, MessageSquare, Sparkles, Cloud, Mountain, Heart } from "lucide-react";

type Aba = "agenda" | "aplicacao" | "mensageria" | "provisionamento" | "live";

const ABAS: { id: Aba; nome: string; icon: any; cor: string }[] = [
  { id: "agenda", nome: "Monetizar Agenda", icon: Calendar, cor: "#1F4E5F" },
  { id: "aplicacao", nome: "Monetizar Aplicação", icon: Sparkles, cor: "#A78B5F" },
  { id: "mensageria", nome: "Monetizar Mensageria", icon: MessageSquare, cor: "#5C7C8A" },
  { id: "provisionamento", nome: "Monetizar Provisionamento", icon: Cloud, cor: "#7B6450" },
  { id: "live", nome: "Faturamento Live", icon: Activity, cor: "#B8941F" },
];

const fmt = (v: any) => `R$ ${Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MonetizarPage() {
  const [aba, setAba] = useState<Aba>("agenda");
  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3 pb-3 border-b border-border">
        <Heart className="w-7 h-7 text-[#B8941F]" />
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-[#1F4E5F]">💰 Monetizar PADCON</h1>
          <p className="text-xs text-muted-foreground">Coração que bombeia: cada ação clínica = 1 evento gravado no ledger = 1 centavo cobrado</p>
        </div>
      </header>

      <div className="flex gap-1 border-b border-border overflow-x-auto" data-testid="tabs-monetizar">
        {ABAS.map((a) => {
          const Icon = a.icon;
          const ativo = aba === a.id;
          return (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              data-testid={`tab-${a.id}`}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                ativo
                  ? "border-[#B8941F] text-[#1F4E5F] bg-[#B8941F]/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Icon className="w-4 h-4" style={{ color: ativo ? a.cor : undefined }} />
              {a.nome}
            </button>
          );
        })}
      </div>

      {aba === "live" ? <FaturamentoLive /> : <MatrizModulosEventos grupo={aba} />}
    </div>
  );
}

function MatrizModulosEventos({ grupo }: { grupo: Exclude<Aba, "live"> }) {
  const qc = useQueryClient();
  const { data: matriz = [], isLoading } = useQuery<any[]>({
    queryKey: ["modulos-padcon-matriz"],
    queryFn: () => fetch("/api/modulos-padcon/matriz").then((r) => r.json()),
  });
  const { data: eventos = [] } = useQuery<any[]>({
    queryKey: ["eventos-cobraveis"],
    queryFn: () => fetch("/api/eventos-cobraveis").then((r) => r.json()),
  });

  const mut = useMutation({
    mutationFn: ({ unidadeId, moduloId, ativo }: any) =>
      fetch(`/api/modulos-padcon/ativar/${unidadeId}/${moduloId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo, usuario: "caio" }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["modulos-padcon-matriz"] }),
  });

  const dispMut = useMutation({
    mutationFn: ({ unidadeId, eventoCodigo }: any) =>
      fetch(`/api/eventos-cobraveis/disparar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unidadeId, eventoCodigo, referenciaExterna: "teste-manual-painel" }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["faturamento-live"] }),
  });

  const matrizFiltrada = useMemo(() => matriz.filter((m: any) => m.grupo === grupo), [matriz, grupo]);
  const eventosFiltrados = useMemo(() => eventos.filter((e: any) => e.grupo === grupo), [eventos, grupo]);

  const unidades = useMemo(() => {
    const seen = new Set();
    return matrizFiltrada
      .filter((m: any) => (seen.has(m.unidade_id) ? false : (seen.add(m.unidade_id), true)))
      .map((m: any) => ({ id: m.unidade_id, nome: m.unidade_nome, cor: m.unidade_cor }));
  }, [matrizFiltrada]);

  const modulos = useMemo(() => {
    const seen = new Set();
    return matrizFiltrada
      .filter((m: any) => (seen.has(m.modulo_id) ? false : (seen.add(m.modulo_id), true)))
      .map((m: any) => ({ id: m.modulo_id, codigo: m.modulo_codigo, nome: m.modulo_nome, preco: m.preco_mensal }));
  }, [matrizFiltrada]);

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando matriz...</div>;

  return (
    <div className="space-y-6">
      {/* MÓDULOS — mensalidade */}
      <Card className="p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#1F4E5F] mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4" /> MÓDULOS (mensalidade)
        </h2>
        {modulos.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem módulos neste grupo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left p-2 font-semibold">Módulo</th>
                  <th className="text-right p-2 font-semibold">Preço/mês</th>
                  {unidades.map((u: any) => (
                    <th key={u.id} className="text-center p-2 font-semibold">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: u.cor || "#999" }} />
                        <span className="text-[10px] uppercase">{u.nome.replace("INSTITUTO ", "")}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modulos.map((m: any) => (
                  <tr key={m.id} className="border-b border-border/40 hover:bg-muted/30">
                    <td className="p-2 font-mono text-[11px]">
                      <span className="text-[#B8941F] font-bold">{m.codigo}</span> {m.nome}
                    </td>
                    <td className="p-2 text-right font-mono text-[11px] font-semibold text-[#1F4E5F]">{fmt(m.preco)}</td>
                    {unidades.map((u: any) => {
                      const cell = matrizFiltrada.find((x: any) => x.unidade_id === u.id && x.modulo_id === m.id);
                      const ativo = cell?.ativo ?? false;
                      return (
                        <td key={u.id} className="p-2 text-center">
                          <Switch
                            checked={ativo}
                            onCheckedChange={(v) => mut.mutate({ unidadeId: u.id, moduloId: m.id, ativo: v })}
                            data-testid={`switch-${m.codigo}-${u.id}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* EVENTOS — pay per use */}
      <Card className="p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#1F4E5F] mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4" /> EVENTOS COBRÁVEIS (pay-per-use)
        </h2>
        {eventosFiltrados.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem eventos neste grupo.</p>
        ) : (
          <div className="space-y-2">
            {eventosFiltrados.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between p-2 rounded border border-border/40 bg-muted/20">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono">
                    <span className="text-[#B8941F] font-bold">{e.codigo}</span> · {e.nome}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    Trigger: <code className="text-[#5C7C8A]">{e.trigger_origem ?? "—"}</code>
                  </div>
                </div>
                <div className="text-right ml-3">
                  <div className="text-sm font-mono font-bold text-[#1F4E5F]">{fmt(e.preco_unitario)}</div>
                  <div className="text-[9px] text-muted-foreground uppercase">por {e.unidade_medida}</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-3 text-[10px] h-7"
                  onClick={() => {
                    const u = prompt("ID da unidade pra disparar teste? (ex: 15 = Pádua)");
                    if (u) dispMut.mutate({ unidadeId: parseInt(u, 10), eventoCodigo: e.codigo });
                  }}
                  data-testid={`btn-disparar-${e.codigo}`}
                >
                  Disparar
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function FaturamentoLive() {
  const competencia = new Date().toISOString().slice(0, 7);
  const { data, isLoading } = useQuery<any>({
    queryKey: ["faturamento-live", competencia],
    queryFn: () => fetch(`/api/ledger/faturamento-live?competencia=${competencia}`).then((r) => r.json()),
    refetchInterval: 10000,
  });

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando faturamento...</div>;
  if (!data) return null;

  const totais = data.totaisPorUnidade ?? [];

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-gradient-to-r from-[#1F4E5F]/5 to-[#B8941F]/5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#1F4E5F] mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#B8941F]" /> Faturamento Live · Competência {competencia}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {totais.map((t: any) => {
            const total = Number(t.total_eventos ?? 0) + Number(t.total_modulos ?? 0);
            return (
              <div key={t.unidade_id} className="p-3 rounded border border-border bg-card" data-testid={`fatura-card-${t.unidade_id}`}>
                <div className="text-[11px] uppercase font-semibold text-muted-foreground">{t.unidade_nome}</div>
                <div className="text-2xl font-mono font-bold text-[#1F4E5F] mt-1">{fmt(total)}</div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 pt-1.5 border-t border-border/40">
                  <span>Módulos: {fmt(t.total_modulos)}</span>
                  <span>Eventos: {fmt(t.total_eventos)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Detalhamento por evento</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left p-2">Unidade</th>
                <th className="text-left p-2">Grupo</th>
                <th className="text-left p-2">Evento</th>
                <th className="text-right p-2">Qtd</th>
                <th className="text-right p-2">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {data.detalhe.filter((d: any) => d.evento_codigo).map((d: any, i: number) => (
                <tr key={i} className="border-b border-border/30">
                  <td className="p-2">{d.unidade_nome}</td>
                  <td className="p-2 text-muted-foreground uppercase text-[10px]">{d.grupo}</td>
                  <td className="p-2 font-mono"><span className="text-[#B8941F]">{d.evento_codigo}</span> · {d.evento_nome}</td>
                  <td className="p-2 text-right font-mono">{d.qtd}</td>
                  <td className="p-2 text-right font-mono font-semibold text-[#1F4E5F]">{fmt(d.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
```

### `artifacts/clinica-motor/src/pages/dashboard-local.tsx`
```tsx
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { useClinic } from "@/contexts/ClinicContext";
import { AlertTriangle, Activity, Syringe, MessageSquareWarning, CalendarClock, FileText, DollarSign, Mountain } from "lucide-react";

const fmt = (v: any) => `R$ ${Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export default function DashboardLocalPage() {
  const { unidadeSelecionada, nomeUnidadeSelecionada, corUnidadeSelecionada, isTodasClinicas } = useClinic();

  const competencia = new Date().toISOString().slice(0, 7);
  const { data: faturamento } = useQuery<any>({
    queryKey: ["faturamento-live-local", competencia, unidadeSelecionada],
    queryFn: () => fetch(`/api/ledger/faturamento-live?competencia=${competencia}`).then((r) => r.json()),
    refetchInterval: 15000,
    enabled: !isTodasClinicas,
  });

  if (isTodasClinicas) {
    return (
      <Card className="p-6 text-center">
        <Mountain className="w-12 h-12 mx-auto text-[#1F4E5F]/40 mb-3" />
        <h2 className="text-lg font-bold text-[#1F4E5F]">Selecione uma clínica no canto superior esquerdo</h2>
        <p className="text-sm text-muted-foreground mt-1">O Dashboard Local mostra o que está acontecendo dentro da unidade escolhida.</p>
      </Card>
    );
  }

  const meuFat = faturamento?.totaisPorUnidade?.find((t: any) => t.unidade_id === unidadeSelecionada);
  const totalLocal = Number(meuFat?.total_eventos ?? 0) + Number(meuFat?.total_modulos ?? 0);

  const cards = [
    { titulo: "Pacientes com demanda atrasada", valor: "—", icon: AlertTriangle, cor: "#C0392B" },
    { titulo: "Em atendimento agora", valor: "—", icon: Activity, cor: "#27AE60" },
    { titulo: "Atrasos de aplicação semanal", valor: "—", icon: Syringe, cor: "#E67E22" },
    { titulo: "Reclamações da unidade", valor: "—", icon: MessageSquareWarning, cor: "#8E44AD" },
    { titulo: "Reagendamentos pendentes", valor: "—", icon: CalendarClock, cor: "#2980B9" },
    { titulo: "Log de atividades local", valor: "—", icon: FileText, cor: "#5C7C8A" },
  ];

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3 pb-3 border-b border-border">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: corUnidadeSelecionada || "#999" }} />
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-[#1F4E5F]">⛰️ {nomeUnidadeSelecionada}</h1>
          <p className="text-xs text-muted-foreground">Dashboard Local · visão da clínica selecionada</p>
        </div>
      </header>

      <Card className="p-4 bg-gradient-to-r from-[#B8941F]/10 to-transparent">
        <div className="flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-[#B8941F]" />
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Consumo PADCON · {competencia}</div>
            <div className="text-3xl font-mono font-bold text-[#1F4E5F]">{fmt(totalLocal)}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Módulos: {fmt(meuFat?.total_modulos)} · Eventos: {fmt(meuFat?.total_eventos)}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <Card key={i} className="p-4 hover:shadow-md transition-shadow" data-testid={`local-card-${i}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{c.titulo}</div>
                  <div className="text-3xl font-mono font-bold mt-1" style={{ color: c.cor }}>{c.valor}</div>
                </div>
                <Icon className="w-6 h-6 opacity-60" style={{ color: c.cor }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 italic">Em breve · ligando ao banco real</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
```

### `artifacts/clinica-motor/src/pages/demandas-resolucao.tsx`
```tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClinic } from "@/contexts/ClinicContext";
import { Bot, Brain, User, CheckCircle2, MessageCircle, Phone } from "lucide-react";

const fmt = (v: any) => `R$ ${Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const RESOLVEDORES = [
  { tipo: "robo", nome: "🤖 Robô", icon: Bot, cor: "#5C7C8A" },
  { tipo: "ia", nome: "🧠 IA", icon: Brain, cor: "#7B6450" },
  { tipo: "humano", nome: "🙋 Humano", icon: User, cor: "#B8941F" },
];

export default function DemandasResolucaoPage() {
  const { unidadeSelecionada, isTodasClinicas } = useClinic();
  const qc = useQueryClient();
  const [demandaAberta, setDemandaAberta] = useState<number | null>(null);

  const { data: demandas = [] } = useQuery<any[]>({
    queryKey: ["demandas-resolucao", unidadeSelecionada],
    queryFn: () =>
      fetch(`/api/demandas-resolucao${!isTodasClinicas ? `?unidadeId=${unidadeSelecionada}` : ""}`).then((r) => r.json()),
  });

  const concluir = useMutation({
    mutationFn: ({ id, resolvidoPor }: any) =>
      fetch(`/api/demandas-resolucao/${id}/concluir`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolvidoPor, caminhoResolucao: `concluido-via-${resolvidoPor}` }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["demandas-resolucao"] }),
  });

  const criarSeed = useMutation({
    mutationFn: () =>
      fetch(`/api/demandas-resolucao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unidadeId: unidadeSelecionada || 15,
          canalOrigem: "whatsapp",
          assunto: "Confirmação de retorno - paciente teste",
        }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["demandas-resolucao"] }),
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-[#1F4E5F]">🏷️ Demandas de Resolução</h1>
          <p className="text-xs text-muted-foreground">Pingue-pongue até a conclusão · Robô / IA / Humano</p>
        </div>
        <Button onClick={() => criarSeed.mutate()} variant="outline" data-testid="btn-criar-demanda-teste">
          + Demanda de teste
        </Button>
      </header>

      <Card className="p-4">
        {demandas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma demanda registrada ainda. Clique em "+ Demanda de teste".</p>
        ) : (
          <div className="space-y-2">
            {demandas.map((d: any) => (
              <div key={d.id} className="border border-border/50 rounded p-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px]">#{d.id}</Badge>
                      <span className="text-xs text-muted-foreground">{d.unidade_nome}</span>
                      {d.resolvido && (
                        <Badge className="bg-green-600 text-[10px]"><CheckCircle2 className="w-3 h-3 mr-1" /> Concluída</Badge>
                      )}
                    </div>
                    <div className="text-sm font-medium mt-1">{d.assunto || "(sem assunto)"}</div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        {d.canal_origem === "whatsapp" ? <MessageCircle className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                        {d.canal_origem}
                      </span>
                      <span>🔁 {d.turnos_pingue_pongue} turnos</span>
                      <span className="font-mono font-semibold text-[#B8941F]">{fmt(d.valor_total_cobrado)}</span>
                      {d.resolvido_por && <span>Resolvido por: <strong>{d.resolvido_por}</strong></span>}
                    </div>
                  </div>
                  {!d.resolvido && (
                    <div className="flex gap-1">
                      {RESOLVEDORES.map((r) => {
                        const Icon = r.icon;
                        return (
                          <Button
                            key={r.tipo}
                            size="sm"
                            variant="outline"
                            onClick={() => concluir.mutate({ id: d.id, resolvidoPor: r.tipo })}
                            data-testid={`btn-concluir-${d.id}-${r.tipo}`}
                            style={{ borderColor: r.cor, color: r.cor }}
                            className="text-[10px] h-7"
                          >
                            <Icon className="w-3 h-3 mr-1" /> {r.nome}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
```

## 9. 📜 Histórico git recente
```
770dd14 Pacote Opus completo + limpeza Walking Dead (2 ícones zumbis)
488dc32 Add images to the assets folder for clinic resources
698fd1e Consolida pacote PADCON monetização para revisão Opus
a272baa Update images related to user interface elements
8ce5ae0 Update images related to user interface elements
a17ad6d Add core financial and operational modules to the application
0f15b5a Add core financial and operational modules to the application
9a9b5de Add visual evidence of identified issues for clarification
aba68db Add visual evidence of identified issues for clarification
5483e76 Implementar sistema de controle de acesso para unidades e categorias clínicas
bcfe749 Implementar sistema de controle de acesso para unidades e categorias clínicas
a377688 Add dashboard cards displaying key metrics for Padua and Genesis institutes
43cb5b9 Add dashboard cards displaying key metrics for Padua and Genesis institutes
376ddfb Update visual confirmation for agenda data
704e2e6 Update visual confirmation for agenda data
```

## 10. 🚨 Achados de code review pendentes (próxima rodada)
Da última revisão arquitetural (severidade ↓):

- **[CRITICAL] Broken access control**: `monetizacaoPadcon.ts` e `drivePawards.ts` expõem operações sensíveis (ativação de módulos, lançamento em ledger, provisionamento Drive) sem validação de perfil. Status quo do projeto inteiro — não há `req.user` no servidor.
- **[HIGH] `/eventos-cobraveis/disparar` precisa endurecer**: validação Zod, idempotência por `referenciaExterna`, respostas 4xx previsíveis, transação quando encadeado.
- **[MEDIUM] Inconsistência de padrão DB**: novos endpoints misturam `drizzle query builder` com `db.execute(sql``)`. Falta camada Zod comum.
- **[MEDIUM] Tratamento de erro**: alguns endpoints retornam 200 null para não-encontrado em vez de 404. Operações multi-step sem transação.
- **[LOW]**: React hooks no Layout estão respeitados. NaN guard no Drive já corrigido. Default Pádua não anula mais 'Todas as Clínicas'.

---
**Fim do moedor.** Bom apetite, Opus. 🦾
