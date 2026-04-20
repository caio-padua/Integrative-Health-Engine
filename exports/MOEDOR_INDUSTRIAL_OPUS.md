# 🍖 MOEDOR INDUSTRIAL — Pacote Total PADCON pra Opus Devorar
**Gerado em:** 2026-04-20 06:54:33
**Single-click context bomb.** Tudo que o Opus precisa em um arquivo.

## 1. 🧠 replit.md
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

## 2. 📊 Schema completo (psql \dt + \d das tabelas críticas)
```sql
                        List of relations
 Schema |                Name                 | Type  |  Owner   
--------+-------------------------------------+-------+----------
 public | acoes_agente                        | table | postgres
 public | acompanhamento_cavalo               | table | postgres
 public | acompanhamento_formula              | table | postgres
 public | adesoes_plano                       | table | postgres
 public | agenda_audit_events                 | table | postgres
 public | agenda_blocks                       | table | postgres
 public | agenda_slots                        | table | postgres
 public | agendas_nuvem_liberacao             | table | postgres
 public | agendas_profissionais               | table | postgres
 public | agent_actions                       | table | postgres
 public | agentes_clinica                     | table | postgres
 public | agentes_frases                      | table | postgres
 public | agentes_identidade                  | table | postgres
 public | agentes_motor_escrita               | table | postgres
 public | agentes_personalidade               | table | postgres
 public | agentes_regras                      | table | postgres
 public | agentes_versionamento               | table | postgres
 public | alerta_paciente                     | table | postgres
 public | alertas_notificacao                 | table | postgres
 public | analitos_catalogo                   | table | postgres
 public | analitos_referencia_laboratorio     | table | postgres
 public | analitos_validacoes_log             | table | postgres
 public | anamnese_validacao_template         | table | postgres
 public | anamneses                           | table | postgres
 public | aplicacoes_substancias              | table | postgres
 public | appointment_reschedules             | table | postgres
 public | appointments                        | table | postgres
 public | arquivos_exames                     | table | postgres
 public | assinatura_drive_estrutura          | table | postgres
 public | assinatura_notificacoes             | table | postgres
 public | assinatura_pares_testemunhas        | table | postgres
 public | assinatura_signatarios              | table | postgres
 public | assinatura_solicitacoes             | table | postgres
 public | assinatura_templates                | table | postgres
 public | assinatura_testemunhas              | table | postgres
 public | assinatura_textos_institucionais    | table | postgres
 public | assinatura_toggles_admin            | table | postgres
 public | assinatura_webhook_eventos          | table | postgres
 public | assinaturas_digitais                | table | postgres
 public | auditoria_cascata                   | table | postgres
 public | availability_rules                  | table | postgres
 public | avaliacao_enfermagem                | table | postgres
 public | avaliacoes_cliente                  | table | postgres
 public | blocos                              | table | postgres
 public | cadernos_documentais                | table | postgres
 public | capacidades_agente_clinica          | table | postgres
 public | cascata_validacao_config            | table | postgres
 public | casulo_eventos                      | table | postgres
 public | catalogo_agentes                    | table | postgres
 public | cid10                               | table | postgres
 public | cirurgias                           | table | postgres
 public | clinica_drive_estrutura             | table | postgres
 public | cobertura_manifesto_topicos         | table | postgres
 public | cobrancas_mensais_modulos           | table | postgres
 public | codigos_semanticos                  | table | postgres
 public | codigos_validacao                   | table | postgres
 public | comissoes_config                    | table | postgres
 public | commission_events                   | table | postgres
 public | consultor_unidades                  | table | postgres
 public | consultorias                        | table | postgres
 public | contrato_clinica                    | table | postgres
 public | dados_visita_clinica                | table | postgres
 public | delegacoes                          | table | postgres
 public | demandas_resolucao                  | table | postgres
 public | demandas_servico                    | table | postgres
 public | descontos_config                    | table | postgres
 public | dicionario_graus                    | table | postgres
 public | dietas                              | table | postgres
 public | direcao_favoravel_exame             | table | postgres
 public | disciplinary_events                 | table | postgres
 public | documentos_referencia               | table | postgres
 public | doencas                             | table | postgres
 public | endovenosos                         | table | postgres
 public | estado_saude_paciente               | table | postgres
 public | estoque_itens                       | table | postgres
 public | evento_start                        | table | postgres
 public | eventos_clinicos                    | table | postgres
 public | eventos_cobraveis                   | table | postgres
 public | eventos_programados                 | table | postgres
 public | eventos_saida_operacionais          | table | postgres
 public | exames_base                         | table | postgres
 public | exames_evolucao                     | table | postgres
 public | execucoes_agente                    | table | postgres
 public | farmacias_parceiras                 | table | postgres
 public | fases_plano_template                | table | postgres
 public | faturamento_mensal                  | table | postgres
 public | feedback_formulas                   | table | postgres
 public | feedback_pacientes                  | table | postgres
 public | fila_preceptor                      | table | postgres
 public | filas_operacionais                  | table | postgres
 public | fluxos_aprovacoes                   | table | postgres
 public | followups                           | table | postgres
 public | formula_blend                       | table | postgres
 public | formula_blend_ativo                 | table | postgres
 public | formulas                            | table | postgres
 public | formulas_master                     | table | postgres
 public | implantes                           | table | postgres
 public | injetaveis                          | table | postgres
 public | itens_terapeuticos                  | table | postgres
 public | juridico_termos_bloqueados          | table | postgres
 public | kaizen_melhorias                    | table | postgres
 public | linfonodos_paciente                 | table | postgres
 public | linha_medicacao_evento              | table | postgres
 public | manifestos_estrategicos             | table | postgres
 public | mapa_aderencia_celular              | table | postgres
 public | mapa_anamnese_motor                 | table | postgres
 public | mapa_bloco_exame                    | table | postgres
 public | mapeamento_documental               | table | postgres
 public | matrix_governanca_categoria         | table | postgres
 public | matriz_rastreio                     | table | postgres
 public | memorias_contextuais_agente         | table | postgres
 public | mensagens_catalogo                  | table | postgres
 public | metas_consultor                     | table | postgres
 public | modulos_clinica                     | table | postgres
 public | modulos_contratados                 | table | postgres
 public | modulos_padcon                      | table | postgres
 public | modulos_sistema                     | table | postgres
 public | monitoramento_sinais_vitais         | table | postgres
 public | motor_decisao_clinica               | table | postgres
 public | narrativas_agente                   | table | postgres
 public | niveis_escala_nacional              | table | postgres
 public | niveis_justificativa                | table | postgres
 public | nota_fiscal_eventos                 | table | postgres
 public | notas_fiscais_emitidas              | table | postgres
 public | oportunidades_entrada_nacional      | table | postgres
 public | pacientes                           | table | postgres
 public | padcom_agendamentos                 | table | postgres
 public | padcom_alertas                      | table | postgres
 public | padcom_alertas_regras               | table | postgres
 public | padcom_auditoria                    | table | postgres
 public | padcom_bandas                       | table | postgres
 public | padcom_competencias_regulatorias    | table | postgres
 public | padcom_notificacoes                 | table | postgres
 public | padcom_questionarios                | table | postgres
 public | padcom_respostas                    | table | postgres
 public | padcom_sessoes                      | table | postgres
 public | padcom_validacoes_cascata           | table | postgres
 public | padroes_formula_exame               | table | postgres
 public | pagamentos                          | table | postgres
 public | pedidos_exame                       | table | postgres
 public | perfis_permissoes                   | table | postgres
 public | periodos_dia                        | table | postgres
 public | pesquisa_respostas                  | table | postgres
 public | pesquisa_satisfacao                 | table | postgres
 public | pingue_pongue_log                   | table | postgres
 public | planos_consulta_config              | table | postgres
 public | planos_saas_catalogo                | table | postgres
 public | planos_terapeuticos_template        | table | postgres
 public | procedimento_categorias_nf          | table | postgres
 public | profissional_confianca              | table | postgres
 public | protocolos                          | table | postgres
 public | protocolos_acoes                    | table | postgres
 public | protocolos_fases                    | table | postgres
 public | protocolos_master                   | table | postgres
 public | protocolos_paciente_catalogo        | table | postgres
 public | provedores_assinatura_digital       | table | postgres
 public | provedores_nfe                      | table | postgres
 public | provedores_pagamento                | table | postgres
 public | psicologia                          | table | postgres
 public | queixas_cards                       | table | postgres
 public | questionario_master                 | table | postgres
 public | questionario_respostas              | table | postgres
 public | ras                                 | table | postgres
 public | ras_evolutivo                       | table | postgres
 public | rasx_audit_log                      | table | postgres
 public | recorrencia                         | table | postgres
 public | registro_substancia_uso             | table | postgres
 public | regras_endovenosos                  | table | postgres
 public | regras_implantes                    | table | postgres
 public | regras_injetaveis                   | table | postgres
 public | regras_motor                        | table | postgres
 public | regras_triagem                      | table | postgres
 public | remedios_farmacia                   | table | postgres
 public | remedios_farmacia_componentes       | table | postgres
 public | revo_curvas                         | table | postgres
 public | revo_eventos_medicacao              | table | postgres
 public | revo_medicamentos                   | table | postgres
 public | revo_orgaos                         | table | postgres
 public | revo_patologias                     | table | postgres
 public | revo_proxima_etapa                  | table | postgres
 public | revo_snapshots                      | table | postgres
 public | roteiros_chamada                    | table | postgres
 public | sessoes                             | table | postgres
 public | sintomas                            | table | postgres
 public | sla_monitoring                      | table | postgres
 public | slot_locks                          | table | postgres
 public | smart_release_config                | table | postgres
 public | soberania_config                    | table | postgres
 public | sub_agendas                         | table | postgres
 public | substancias                         | table | postgres
 public | sugestoes_clinicas                  | table | postgres
 public | suplementos_laboratorio             | table | postgres
 public | suplementos_laboratorio_componentes | table | postgres
 public | task_attempts                       | table | postgres
 public | task_card_escalations               | table | postgres
 public | task_card_justificativas            | table | postgres
 public | task_cards                          | table | postgres
 public | task_validations                    | table | postgres
 public | team_members                        | table | postgres
 public | team_positions                      | table | postgres
 public | termos_assinados                    | table | postgres
 public | termos_consentimento                | table | postgres
 public | termos_juridicos                    | table | postgres
 public | tracking_sintomas                   | table | postgres
 public | tratamento_itens                    | table | postgres
 public | tratamentos                         | table | postgres
 public | unidade_eventos_ledger              | table | postgres
 public | unidade_gateway_credenciais         | table | postgres
 public | unidade_modulos_ativos              | table | postgres
 public | unidade_nfe_credenciais             | table | postgres
 public | unidades                            | table | postgres
 public | unidades_conversao                  | table | postgres
 public | usuarios                            | table | postgres
 public | validacoes_cascata                  | table | postgres
 public | validacoes_humanas_agente           | table | postgres
 public | wd_operacionais_inventario          | table | postgres
 public | whatsapp_config                     | table | postgres
 public | whatsapp_mensagens_log              | table | postgres
(218 rows)


-- TABELA unidades
                                             Table "public.unidades"
         Column         |           Type           | Collation | Nullable |               Default                
------------------------+--------------------------+-----------+----------+--------------------------------------
 id                     | integer                  |           | not null | nextval('unidades_id_seq'::regclass)
 nome                   | text                     |           | not null | 
 endereco               | text                     |           |          | 
 cidade                 | text                     |           |          | 
 estado                 | text                     |           |          | 
 telefone               | text                     |           |          | 
 ativa                  | boolean                  |           | not null | true
 criado_em              | timestamp with time zone |           | not null | now()
 atualizado_em          | timestamp with time zone |           | not null | now()
 cnpj                   | text                     |           |          | 
 cep                    | text                     |           |          | 
 tipo                   | text                     |           | not null | 'clinic'::text
 google_calendar_id     | text                     |           |          | 
 cor                    | text                     |           | not null | '#3B82F6'::text
 bairro                 | text                     |           |          | 
 google_calendar_email  | text                     |           |          | 
 consultoria_id         | integer                  |           |          | 
 codigo_interno         | text                     |           |          | 
 nick                   | text                     |           |          | 
 email_geral            | text                     |           |          | 
 email_agenda           | text                     |           |          | 
 email_enfermagem01     | text                     |           |          | 
 email_enfermagem02     | text                     |           |          | 
 email_consultor01      | text                     |           |          | 
 email_consultor02      | text                     |           |          | 
 email_supervisor01     | text                     |           |          | 
 email_supervisor02     | text                     |           |          | 
 email_financeiro01     | text                     |           |          | 
 email_ouvidoria01      | text                     |           |          | 
 timezone               | text                     |           | not null | 'America/Sao_Paulo'::text
 dono_id                | integer                  |           |          | 
 dono_nome              | text                     |           |          | 
 autoliberacao          | boolean                  |           | not null | true
 logotipo_url           | text                     |           |          | 
 logotipo_atualizado_em | timestamp with time zone |           |          | 
Indexes:
    "unidades_pkey" PRIMARY KEY, btree (id)
Foreign-key constraints:
    "unidades_consultoria_id_consultorias_id_fk" FOREIGN KEY (consultoria_id) REFERENCES consultorias(id)
Referenced by:
    TABLE "agenda_blocks" CONSTRAINT "agenda_blocks_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "agenda_slots" CONSTRAINT "agenda_slots_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "agendas_nuvem_liberacao" CONSTRAINT "agendas_nuvem_liberacao_unidade_id_fkey" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "agendas_profissionais" CONSTRAINT "agendas_profissionais_unidade_id_fkey" FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE CASCADE
    TABLE "agent_actions" CONSTRAINT "agent_actions_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "agentes_clinica" CONSTRAINT "agentes_clinica_clinica_id_unidades_id_fk" FOREIGN KEY (clinica_id) REFERENCES unidades(id)
    TABLE "appointments" CONSTRAINT "appointments_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "availability_rules" CONSTRAINT "availability_rules_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "clinica_drive_estrutura" CONSTRAINT "clinica_drive_estrutura_unidade_id_fkey" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "cobrancas_mensais_modulos" CONSTRAINT "cobrancas_mensais_modulos_unidade_id_fkey" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "commission_events" CONSTRAINT "commission_events_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "consultor_unidades" CONSTRAINT "consultor_unidades_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "contrato_clinica" CONSTRAINT "contrato_clinica_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "delegacoes" CONSTRAINT "delegacoes_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "demandas_resolucao" CONSTRAINT "demandas_resolucao_unidade_id_fkey" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "demandas_servico" CONSTRAINT "demandas_servico_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "disciplinary_events" CONSTRAINT "disciplinary_events_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "evento_start" CONSTRAINT "evento_start_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "eventos_saida_operacionais" CONSTRAINT "eventos_saida_operacionais_clinica_id_unidades_id_fk" FOREIGN KEY (clinica_id) REFERENCES unidades(id)
    TABLE "faturamento_mensal" CONSTRAINT "faturamento_mensal_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "feedback_pacientes" CONSTRAINT "feedback_pacientes_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "filas_operacionais" CONSTRAINT "filas_operacionais_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "followups" CONSTRAINT "followups_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "matrix_governanca_categoria" CONSTRAINT "matrix_governanca_categoria_unidade_id_fkey" FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE CASCADE
    TABLE "modulos_clinica" CONSTRAINT "modulos_clinica_clinica_id_unidades_id_fk" FOREIGN KEY (clinica_id) REFERENCES unidades(id)
    TABLE "notas_fiscais_emitidas" CONSTRAINT "notas_fiscais_emitidas_unidade_id_fkey" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "pacientes" CONSTRAINT "pacientes_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "pagamentos" CONSTRAINT "pagamentos_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "pesquisa_satisfacao" CONSTRAINT "pesquisa_satisfacao_clinica_id_unidades_id_fk" FOREIGN KEY (clinica_id) REFERENCES unidades(id)
    TABLE "sessoes" CONSTRAINT "sessoes_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "sla_monitoring" CONSTRAINT "sla_monitoring_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "smart_release_config" CONSTRAINT "smart_release_config_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "sub_agendas" CONSTRAINT "sub_agendas_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "team_members" CONSTRAINT "team_members_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "team_positions" CONSTRAINT "team_positions_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "tratamentos" CONSTRAINT "tratamentos_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "unidade_eventos_ledger" CONSTRAINT "unidade_eventos_ledger_unidade_id_fkey" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "unidade_gateway_credenciais" CONSTRAINT "unidade_gateway_credenciais_unidade_id_fkey" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "unidade_modulos_ativos" CONSTRAINT "unidade_modulos_ativos_unidade_id_fkey" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "unidade_nfe_credenciais" CONSTRAINT "unidade_nfe_credenciais_unidade_id_fkey" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "usuarios" CONSTRAINT "usuarios_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    TABLE "whatsapp_config" CONSTRAINT "whatsapp_config_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)


-- TABELA pacientes
                                             Table "public.pacientes"
         Column         |           Type           | Collation | Nullable |                Default                
------------------------+--------------------------+-----------+----------+---------------------------------------
 id                     | integer                  |           | not null | nextval('pacientes_id_seq'::regclass)
 nome                   | text                     |           | not null | 
 cpf                    | text                     |           |          | 
 data_nascimento        | date                     |           |          | 
 telefone               | text                     |           | not null | 
 email                  | text                     |           |          | 
 unidade_id             | integer                  |           | not null | 
 status_ativo           | boolean                  |           | not null | true
 criado_em              | timestamp with time zone |           | not null | now()
 atualizado_em          | timestamp with time zone |           | not null | now()
 endereco               | text                     |           |          | 
 cep                    | text                     |           |          | 
 google_drive_folder_id | text                     |           |          | 
 complemento            | text                     |           |          | 
 bairro                 | text                     |           |          | 
 cidade                 | text                     |           |          | 
 estado                 | text                     |           |          | 
 pais                   | text                     |           |          | 'Brasil'::text
 senha_validacao        | text                     |           |          | 
 foto_rosto             | text                     |           |          | 
 foto_corpo             | text                     |           |          | 
 plano_acompanhamento   | text                     |           |          | 'cobre'::text
 senha_portal           | text                     |           |          | 
 genero                 | text                     |           | not null | 'nao_informado'::text
 altura_cm              | integer                  |           |          | 
 peso_kg                | numeric(5,2)             |           |          | 
 alergias               | text                     |           |          | 
 condicoes_clinicas     | text                     |           |          | 
 medicamentos_continuos | text                     |           |          | 
 gestante               | boolean                  |           | not null | false
 fototipo_fitzpatrick   | text                     |           |          | 
 atividade_fisica       | text                     |           |          | 
Indexes:
    "pacientes_pkey" PRIMARY KEY, btree (id)
Check constraints:
    "pacientes_atividade_check" CHECK (atividade_fisica IS NULL OR (atividade_fisica = ANY (ARRAY['sedentario'::text, 'leve'::text, 'moderado'::text, 'intenso'::text, 'atleta'::text])))
    "pacientes_fototipo_check" CHECK (fototipo_fitzpatrick IS NULL OR (fototipo_fitzpatrick = ANY (ARRAY['I'::text, 'II'::text, 'III'::text, 'IV'::text, 'V'::text, 'VI'::text])))
    "pacientes_genero_check" CHECK (genero = ANY (ARRAY['masculino'::text, 'feminino'::text, 'outro'::text, 'nao_informado'::text]))
Foreign-key constraints:
    "pacientes_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
Referenced by:
    TABLE "acompanhamento_cavalo" CONSTRAINT "acompanhamento_cavalo_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "acompanhamento_formula" CONSTRAINT "acompanhamento_formula_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "adesoes_plano" CONSTRAINT "adesoes_plano_paciente_id_fkey" FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
    TABLE "alerta_paciente" CONSTRAINT "alerta_paciente_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "anamneses" CONSTRAINT "anamneses_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "appointments" CONSTRAINT "appointments_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "arquivos_exames" CONSTRAINT "arquivos_exames_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "assinatura_drive_estrutura" CONSTRAINT "assinatura_drive_estrutura_paciente_id_fkey" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "assinatura_solicitacoes" CONSTRAINT "assinatura_solicitacoes_paciente_id_fkey" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "assinaturas_digitais" CONSTRAINT "assinaturas_digitais_paciente_id_fkey" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "avaliacao_enfermagem" CONSTRAINT "avaliacao_enfermagem_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "avaliacoes_cliente" CONSTRAINT "avaliacoes_cliente_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "cadernos_documentais" CONSTRAINT "cadernos_documentais_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "codigos_validacao" CONSTRAINT "codigos_validacao_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "dados_visita_clinica" CONSTRAINT "dados_visita_clinica_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "demandas_servico" CONSTRAINT "demandas_servico_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "estado_saude_paciente" CONSTRAINT "estado_saude_paciente_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "evento_start" CONSTRAINT "evento_start_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "eventos_clinicos" CONSTRAINT "eventos_clinicos_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "eventos_programados" CONSTRAINT "eventos_programados_paciente_id_fkey" FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
    TABLE "exames_evolucao" CONSTRAINT "exames_evolucao_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "feedback_formulas" CONSTRAINT "feedback_formulas_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "fila_preceptor" CONSTRAINT "fila_preceptor_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "filas_operacionais" CONSTRAINT "filas_operacionais_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "followups" CONSTRAINT "followups_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "linha_medicacao_evento" CONSTRAINT "linha_medicacao_evento_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "monitoramento_sinais_vitais" CONSTRAINT "monitoramento_sinais_vitais_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "notas_fiscais_emitidas" CONSTRAINT "notas_fiscais_emitidas_paciente_id_fkey" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "pagamentos" CONSTRAINT "pagamentos_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "questionario_respostas" CONSTRAINT "questionario_respostas_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "ras_evolutivo" CONSTRAINT "ras_evolutivo_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "ras" CONSTRAINT "ras_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "rasx_audit_log" CONSTRAINT "rasx_audit_log_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "registro_substancia_uso" CONSTRAINT "registro_substancia_uso_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "revo_curvas" CONSTRAINT "revo_curvas_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "revo_eventos_medicacao" CONSTRAINT "revo_eventos_medicacao_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "revo_medicamentos" CONSTRAINT "revo_medicamentos_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "revo_orgaos" CONSTRAINT "revo_orgaos_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "revo_patologias" CONSTRAINT "revo_patologias_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "revo_proxima_etapa" CONSTRAINT "revo_proxima_etapa_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "revo_snapshots" CONSTRAINT "revo_snapshots_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "sessoes" CONSTRAINT "sessoes_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "sugestoes_clinicas" CONSTRAINT "sugestoes_clinicas_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "task_cards" CONSTRAINT "task_cards_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "termos_assinados" CONSTRAINT "termos_assinados_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "tracking_sintomas" CONSTRAINT "tracking_sintomas_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "tratamentos" CONSTRAINT "tratamentos_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    TABLE "validacoes_cascata" CONSTRAINT "validacoes_cascata_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)


-- TABELA appointments
                                                 Table "public.appointments"
             Column             |           Type           | Collation | Nullable |                 Default                  
--------------------------------+--------------------------+-----------+----------+------------------------------------------
 id                             | integer                  |           | not null | nextval('appointments_id_seq'::regclass)
 slot_id                        | integer                  |           | not null | 
 paciente_id                    | integer                  |           | not null | 
 profissional_id                | integer                  |           | not null | 
 unidade_id                     | integer                  |           | not null | 
 sessao_id                      | integer                  |           |          | 
 tipo_procedimento              | text                     |           | not null | 
 data                           | text                     |           | not null | 
 hora_inicio                    | text                     |           | not null | 
 hora_fim                       | text                     |           | not null | 
 duracao_min                    | integer                  |           | not null | 
 status                         | text                     |           | not null | 'agendado'::text
 google_event_id                | text                     |           |          | 
 google_calendar_id             | text                     |           |          | 
 observacoes                    | text                     |           |          | 
 origem_agendamento             | text                     |           | not null | 'sistema'::text
 criado_em                      | timestamp with time zone |           | not null | now()
 atualizado_em                  | timestamp with time zone |           | not null | now()
 reagendamento_automatico_de_id | integer                  |           |          | 
 motivo_falta                   | text                     |           |          | 
Indexes:
    "appointments_pkey" PRIMARY KEY, btree (id)
Foreign-key constraints:
    "appointments_paciente_id_pacientes_id_fk" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    "appointments_profissional_id_usuarios_id_fk" FOREIGN KEY (profissional_id) REFERENCES usuarios(id)
    "appointments_slot_id_agenda_slots_id_fk" FOREIGN KEY (slot_id) REFERENCES agenda_slots(id)
    "appointments_unidade_id_unidades_id_fk" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
Referenced by:
    TABLE "appointment_reschedules" CONSTRAINT "appointment_reschedules_appointment_id_appointments_id_fk" FOREIGN KEY (appointment_id) REFERENCES appointments(id)
    TABLE "notas_fiscais_emitidas" CONSTRAINT "notas_fiscais_emitidas_appointment_id_fkey" FOREIGN KEY (appointment_id) REFERENCES appointments(id)


-- TABELA notas_fiscais_emitidas
                                           Table "public.notas_fiscais_emitidas"
       Column        |           Type           | Collation | Nullable |                      Default                       
---------------------+--------------------------+-----------+----------+----------------------------------------------------
 id                  | integer                  |           | not null | nextval('notas_fiscais_emitidas_id_seq'::regclass)
 paciente_id         | integer                  |           | not null | 
 appointment_id      | integer                  |           |          | 
 numero_externo      | text                     |           |          | 
 data_emissao        | date                     |           | not null | CURRENT_DATE
 valor               | numeric(12,2)            |           | not null | 
 descricao_blindada  | text                     |           | not null | 
 hash_descricao      | text                     |           | not null | 
 status              | text                     |           | not null | 'RASCUNHO'::text
 provedor_codigo     | text                     |           |          | 
 pdf_url             | text                     |           |          | 
 payload_provedor    | jsonb                    |           |          | 
 criado_em           | timestamp with time zone |           | not null | now()
 atualizado_em       | timestamp with time zone |           | not null | now()
 categoria_codigo    | text                     |           |          | 
 drive_file_id       | text                     |           |          | 
 drive_file_url      | text                     |           |          | 
 unidade_id          | integer                  |           |          | 
 cancelado_em        | timestamp with time zone |           |          | 
 cancelado_por       | text                     |           |          | 
 motivo_cancelamento | text                     |           |          | 
 xml_url             | text                     |           |          | 
 pagamento_id        | integer                  |           |          | 
Indexes:
    "notas_fiscais_emitidas_pkey" PRIMARY KEY, btree (id)
    "nfe_appointment_idx" btree (appointment_id)
    "nfe_paciente_idx" btree (paciente_id)
    "nfe_status_idx" btree (status)
Check constraints:
    "notas_fiscais_emitidas_status_check" CHECK (status = ANY (ARRAY['RASCUNHO'::text, 'EMITIDA'::text, 'CANCELADA'::text, 'ERRO'::text]))
Foreign-key constraints:
    "notas_fiscais_emitidas_appointment_id_fkey" FOREIGN KEY (appointment_id) REFERENCES appointments(id)
    "notas_fiscais_emitidas_categoria_codigo_fkey" FOREIGN KEY (categoria_codigo) REFERENCES procedimento_categorias_nf(codigo)
    "notas_fiscais_emitidas_paciente_id_fkey" FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    "notas_fiscais_emitidas_provedor_codigo_fkey" FOREIGN KEY (provedor_codigo) REFERENCES provedores_assinatura_digital(codigo)
    "notas_fiscais_emitidas_unidade_id_fkey" FOREIGN KEY (unidade_id) REFERENCES unidades(id)
Referenced by:
    TABLE "nota_fiscal_eventos" CONSTRAINT "nota_fiscal_eventos_nf_id_fkey" FOREIGN KEY (nf_id) REFERENCES notas_fiscais_emitidas(id)
Triggers:
    trg_nfe_validar BEFORE INSERT OR UPDATE OF descricao_blindada ON notas_fiscais_emitidas FOR EACH ROW EXECUTE FUNCTION fn_validar_descricao_nf()


-- TABELA provedores_pagamento
                             Table "public.provedores_pagamento"
       Column       |           Type           | Collation | Nullable |       Default        
--------------------+--------------------------+-----------+----------+----------------------
 codigo             | text                     |           | not null | 
 nome_exibicao      | text                     |           | not null | 
 funcao             | text                     |           | not null | 
 porque_existe      | text                     |           | not null | 
 quando_usar        | text                     |           | not null | 
 exemplo_pratico    | text                     |           | not null | 
 metodos_suportados | text[]                   |           | not null | 
 fonte_adapter      | text                     |           | not null | 
 status_integracao  | text                     |           | not null | 'PROVISIONADO'::text
 ativo              | boolean                  |           | not null | true
 criado_em          | timestamp with time zone |           | not null | now()
Indexes:
    "provedores_pagamento_pkey" PRIMARY KEY, btree (codigo)
Referenced by:
    TABLE "unidade_gateway_credenciais" CONSTRAINT "unidade_gateway_credenciais_provedor_codigo_fkey" FOREIGN KEY (provedor_codigo) REFERENCES provedores_pagamento(codigo)


-- TABELA provedores_nfe
                             Table "public.provedores_nfe"
          Column           |           Type           | Collation | Nullable | Default 
---------------------------+--------------------------+-----------+----------+---------
 codigo                    | text                     |           | not null | 
 nome_exibicao             | text                     |           | not null | 
 descricao                 | text                     |           | not null | 
 funcionalidades           | text[]                   |           | not null | 
 cobertura_municipios      | text                     |           | not null | 
 preco_aproximado_por_nota | text                     |           | not null | 
 url_documentacao          | text                     |           |          | 
 recomendado               | boolean                  |           | not null | false
 ativo                     | boolean                  |           | not null | true
 criado_em                 | timestamp with time zone |           | not null | now()
Indexes:
    "provedores_nfe_pkey" PRIMARY KEY, btree (codigo)
Referenced by:
    TABLE "unidade_nfe_credenciais" CONSTRAINT "unidade_nfe_credenciais_provedor_codigo_fkey" FOREIGN KEY (provedor_codigo) REFERENCES provedores_nfe(codigo)


-- TABELA unidade_gateway_credenciais
                                         Table "public.unidade_gateway_credenciais"
     Column      |           Type           | Collation | Nullable |                         Default                         
-----------------+--------------------------+-----------+----------+---------------------------------------------------------
 id              | integer                  |           | not null | nextval('unidade_gateway_credenciais_id_seq'::regclass)
 unidade_id      | integer                  |           | not null | 
 provedor_codigo | text                     |           | not null | 
 ambiente        | text                     |           | not null | 'sandbox'::text
 api_key_cifrada | text                     |           | not null | 
 webhook_secret  | text                     |           |          | 
 metadata        | jsonb                    |           |          | 
 ativo           | boolean                  |           | not null | true
 cadastrado_por  | text                     |           | not null | 
 cadastrado_em   | timestamp with time zone |           | not null | now()
Indexes:
    "unidade_gateway_credenciais_pkey" PRIMARY KEY, btree (id)
    "uq_gateway_unidade_amb" UNIQUE CONSTRAINT, btree (unidade_id, provedor_codigo, ambiente)
Check constraints:
    "ck_gateway_ambiente" CHECK (ambiente = ANY (ARRAY['sandbox'::text, 'producao'::text]))
Foreign-key constraints:
    "unidade_gateway_credenciais_provedor_codigo_fkey" FOREIGN KEY (provedor_codigo) REFERENCES provedores_pagamento(codigo)
    "unidade_gateway_credenciais_unidade_id_fkey" FOREIGN KEY (unidade_id) REFERENCES unidades(id)


-- TABELA unidade_nfe_credenciais
                                              Table "public.unidade_nfe_credenciais"
          Column           |           Type           | Collation | Nullable |                       Default                       
---------------------------+--------------------------+-----------+----------+-----------------------------------------------------
 id                        | integer                  |           | not null | nextval('unidade_nfe_credenciais_id_seq'::regclass)
 unidade_id                | integer                  |           | not null | 
 provedor_codigo           | text                     |           | not null | 
 ambiente                  | text                     |           | not null | 'homologacao'::text
 api_key_cifrada           | text                     |           | not null | 
 certificado_a1_url        | text                     |           |          | 
 certificado_senha_cifrada | text                     |           |          | 
 cnpj_emissor              | text                     |           |          | 
 inscricao_municipal       | text                     |           |          | 
 serie_padrao              | text                     |           |          | 
 proximo_numero            | integer                  |           | not null | 1
 webhook_secret            | text                     |           |          | 
 metadata                  | jsonb                    |           |          | 
 ativo                     | boolean                  |           | not null | true
 cadastrado_por            | text                     |           | not null | 
 cadastrado_em             | timestamp with time zone |           | not null | now()
Indexes:
    "unidade_nfe_credenciais_pkey" PRIMARY KEY, btree (id)
    "uq_nfe_unidade_amb" UNIQUE CONSTRAINT, btree (unidade_id, provedor_codigo, ambiente)
Check constraints:
    "ck_nfe_ambiente" CHECK (ambiente = ANY (ARRAY['homologacao'::text, 'producao'::text]))
Foreign-key constraints:
    "unidade_nfe_credenciais_provedor_codigo_fkey" FOREIGN KEY (provedor_codigo) REFERENCES provedores_nfe(codigo)
    "unidade_nfe_credenciais_unidade_id_fkey" FOREIGN KEY (unidade_id) REFERENCES unidades(id)


-- TABELA nota_fiscal_eventos
                                       Table "public.nota_fiscal_eventos"
   Column    |           Type           | Collation | Nullable |                     Default                     
-------------+--------------------------+-----------+----------+-------------------------------------------------
 id          | integer                  |           | not null | nextval('nota_fiscal_eventos_id_seq'::regclass)
 nf_id       | integer                  |           | not null | 
 tipo_evento | text                     |           | not null | 
 descricao   | text                     |           | not null | 
 payload     | jsonb                    |           |          | 
 responsavel | text                     |           |          | 
 ocorrido_em | timestamp with time zone |           | not null | now()
Indexes:
    "nota_fiscal_eventos_pkey" PRIMARY KEY, btree (id)
    "idx_nf_eventos" btree (nf_id, ocorrido_em DESC)
Foreign-key constraints:
    "nota_fiscal_eventos_nf_id_fkey" FOREIGN KEY (nf_id) REFERENCES notas_fiscais_emitidas(id)


-- TABELA modulos_padcon
                                        Table "public.modulos_padcon"
    Column    |           Type           | Collation | Nullable |                  Default                   
--------------+--------------------------+-----------+----------+--------------------------------------------
 id           | integer                  |           | not null | nextval('modulos_padcon_id_seq'::regclass)
 codigo       | text                     |           | not null | 
 nome         | text                     |           | not null | 
 descricao    | text                     |           |          | 
 preco_mensal | numeric(10,2)            |           | not null | 0
 ordem        | integer                  |           | not null | 0
 grupo        | text                     |           | not null | 
 ativo        | boolean                  |           | not null | true
 criado_em    | timestamp with time zone |           | not null | now()
Indexes:
    "modulos_padcon_pkey" PRIMARY KEY, btree (id)
    "modulos_padcon_codigo_key" UNIQUE CONSTRAINT, btree (codigo)
Referenced by:
    TABLE "cobrancas_mensais_modulos" CONSTRAINT "cobrancas_mensais_modulos_modulo_id_fkey" FOREIGN KEY (modulo_id) REFERENCES modulos_padcon(id)
    TABLE "unidade_modulos_ativos" CONSTRAINT "unidade_modulos_ativos_modulo_id_fkey" FOREIGN KEY (modulo_id) REFERENCES modulos_padcon(id)


-- TABELA eventos_cobraveis
                                         Table "public.eventos_cobraveis"
     Column     |           Type           | Collation | Nullable |                    Default                    
----------------+--------------------------+-----------+----------+-----------------------------------------------
 id             | integer                  |           | not null | nextval('eventos_cobraveis_id_seq'::regclass)
 codigo         | text                     |           | not null | 
 nome           | text                     |           | not null | 
 descricao      | text                     |           |          | 
 preco_unitario | numeric(10,2)            |           | not null | 0
 unidade_medida | text                     |           | not null | 'evento'::text
 grupo          | text                     |           | not null | 
 trigger_origem | text                     |           |          | 
 ativo          | boolean                  |           | not null | true
 criado_em      | timestamp with time zone |           | not null | now()
Indexes:
    "eventos_cobraveis_pkey" PRIMARY KEY, btree (id)
    "eventos_cobraveis_codigo_key" UNIQUE CONSTRAINT, btree (codigo)
Referenced by:
    TABLE "pingue_pongue_log" CONSTRAINT "pingue_pongue_log_evento_cobravel_id_fkey" FOREIGN KEY (evento_cobravel_id) REFERENCES eventos_cobraveis(id)
    TABLE "unidade_eventos_ledger" CONSTRAINT "unidade_eventos_ledger_evento_id_fkey" FOREIGN KEY (evento_id) REFERENCES eventos_cobraveis(id)


-- TABELA assinatura_padcon

-- TABELA faturamento_padcon
```

## 3. 🌱 Seeds vivos
```sql
-- Unidades:
 id |                           nome                           |   cor   |        cnpj        |            logotipo_url            
----+----------------------------------------------------------+---------+--------------------+------------------------------------
  1 | (ARQUIVADA) AGENDA MEDICO - HIGIENOPOLIS - DR CAIO SOUZA | #1E40AF | 33.143.134/0001-10 | 
  2 | (ARQUIVADA) AGENDA MEDICO - TATUAPE - DR CAIO PADUA      | #2563EB |                    | 
  3 | (ARQUIVADA) AGENDA ENFERMAGEM - BIANCA                   | #A78BFA |                    | 
  4 | (ARQUIVADA) AGENDA ENFERMAGEM - DOMICILIAR               | #F87171 |                    | 
  5 | (ARQUIVADA) AGENDA ENFERMAGEM - GUAXUPE                  | #F59E0B |                    | 
  6 | (ARQUIVADA) AGENDA MEDICO - ON LINE - DR CAIO FERNANDES  | #503cb2 |                    | 
  7 | (ARQUIVADA) CAIO PADUA - PESSOAL                         | #4adfdf |                    | 
  8 | INSTITUTO INTEGRATIVO                                    | #1B4F6C | 63.865.940/0001-63 | 
  9 | INSTITUTO LEMOS                                          | #10B981 | 32.247.755/0002-62 | 
 10 | INSTITUTO BARROS                                         | #6366F1 | 44.555.666/0001-77 | 
 14 | INSTITUTO GENESIS                                        | #FFD700 | 63.865.940/0001-63 | 
 15 | INSTITUTO PADUA                                          | #3B82F6 |                    | https://example.com/logo-padua.png
 16 | INSTITUTO PALUZZE                                        | #3B82F6 |                    | 
 17 | INSTITUTO PADUZZI                                        | #3B82F6 |                    | 
 18 | INSTITUTO PAZIALLE                                       | #3B82F6 |                    | 
 19 | INSTITUTO BARAKAT                                        | #3B82F6 |                    | 
 20 | INSTITUTO ANDRADE                                        | #3B82F6 |                    | 
(17 rows)

-- Provedores pagamento:
   codigo    | nome_exibicao | status_integracao 
-------------+---------------+-------------------
 asaas       | Asaas         | PROVISIONADO
 stripe      | Stripe        | PROVISIONADO
 mercadopago | Mercado Pago  | PROVISIONADO
 infinitpay  | InfinitePay   | PROVISIONADO
 vindi       | Vindi         | PROVISIONADO
(5 rows)

-- Provedores NFe:
  codigo   | nome_exibicao  | recomendado 
-----------+----------------+-------------
 focus_nfe | Focus NFe      | t
 enotas    | eNotas Gateway | t
(2 rows)

-- Modulos PADCON:
-- Eventos cobraveis:
```

## 4. 🔧 Backend NOVOS (WD#1+#3+#4+#5+#6)

### artifacts/api-server/src/lib/crypto/credenciais.ts
```typescript
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LEN = 12;
const SALT_LEN = 16;
const TAG_LEN = 16;

function getKey(salt: Buffer): Buffer {
  const secret = process.env["SESSION_SECRET"] ?? process.env["ADMIN_TOKEN"] ?? "";
  if (!secret) throw new Error("SESSION_SECRET/ADMIN_TOKEN nao configurado para cifragem de credenciais");
  return scryptSync(secret, salt, 32);
}

export function cifrarCredencial(plaintext: string): string {
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = getKey(salt);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, tag, enc]).toString("base64");
}

export function decifrarCredencial(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const salt = buf.subarray(0, SALT_LEN);
  const iv = buf.subarray(SALT_LEN, SALT_LEN + IV_LEN);
  const tag = buf.subarray(SALT_LEN + IV_LEN, SALT_LEN + IV_LEN + TAG_LEN);
  const enc = buf.subarray(SALT_LEN + IV_LEN + TAG_LEN);
  const key = getKey(salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export function mascararCredencial(plaintext: string): string {
  if (!plaintext) return "";
  if (plaintext.length <= 8) return "•".repeat(plaintext.length);
  return plaintext.slice(0, 4) + "•".repeat(Math.max(8, plaintext.length - 8)) + plaintext.slice(-4);
}
```

### artifacts/api-server/src/lib/nfe/adapters/types.ts
```typescript
export interface DadosEmissaoNFe {
  unidadeId: number;
  pacienteNome: string;
  pacienteCpf?: string | null;
  valor: number;
  descricao: string;
  serviceCode?: string;
  numeroExterno?: string;
  logotipoUrl?: string | null;
  cnpjEmissor?: string;
  inscricaoMunicipal?: string;
  ambiente: "homologacao" | "producao";
  apiKey: string;
  metadata?: Record<string, any>;
}

export interface ResultadoEmissaoNFe {
  sucesso: boolean;
  numeroNota?: string;
  protocolo?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  status: "PROCESSANDO" | "EMITIDA" | "ERRO";
  mensagem?: string;
  payloadProvedor?: any;
}

export interface DadosCancelamentoNFe {
  numeroExterno: string;
  motivo: string;
  apiKey: string;
  ambiente: "homologacao" | "producao";
}

export interface ResultadoCancelamento {
  sucesso: boolean;
  cancelamentoId?: string;
  mensagem?: string;
  payloadProvedor?: any;
}

export interface ProvedorNFeAdapter {
  codigo: string;
  emitir(dados: DadosEmissaoNFe): Promise<ResultadoEmissaoNFe>;
  cancelar(dados: DadosCancelamentoNFe): Promise<ResultadoCancelamento>;
  consultar(numeroExterno: string, apiKey: string, ambiente: "homologacao" | "producao"): Promise<ResultadoEmissaoNFe>;
}
```

### artifacts/api-server/src/lib/nfe/adapters/focus.ts
```typescript
import type {
  ProvedorNFeAdapter,
  DadosEmissaoNFe,
  DadosCancelamentoNFe,
  ResultadoEmissaoNFe,
  ResultadoCancelamento,
} from "./types";

const BASE = (amb: "homologacao" | "producao") =>
  amb === "producao" ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br";

function authHeader(apiKey: string): string {
  return "Basic " + Buffer.from(`${apiKey}:`).toString("base64");
}

export const focusAdapter: ProvedorNFeAdapter = {
  codigo: "focus_nfe",

  async emitir(d: DadosEmissaoNFe): Promise<ResultadoEmissaoNFe> {
    if (!d.apiKey) return { sucesso: false, status: "ERRO", mensagem: "Credencial Focus NFe nao cadastrada para esta unidade" };
    if (!d.cnpjEmissor) return { sucesso: false, status: "ERRO", mensagem: "CNPJ emissor obrigatorio" };

    const ref = d.numeroExterno ?? `PAW-${Date.now()}-${d.unidadeId}`;
    const body = {
      cnpj_prestador: d.cnpjEmissor.replace(/\D/g, ""),
      data_emissao: new Date().toISOString().slice(0, 10),
      valor_servicos: d.valor,
      discriminacao: d.descricao,
      tomador: { razao_social: d.pacienteNome, cpf: d.pacienteCpf?.replace(/\D/g, "") ?? "" },
      ...(d.metadata ?? {}),
    };

    try {
      const r = await fetch(`${BASE(d.ambiente)}/v2/nfse?ref=${encodeURIComponent(ref)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader(d.apiKey) },
        body: JSON.stringify(body),
      });
      const json: any = await r.json().catch(() => ({}));
      if (!r.ok) return { sucesso: false, status: "ERRO", mensagem: json?.mensagem ?? `HTTP ${r.status}`, payloadProvedor: json };
      return {
        sucesso: true,
        status: json.status === "autorizado" ? "EMITIDA" : "PROCESSANDO",
        numeroNota: json.numero ?? ref,
        protocolo: json.codigo_verificacao ?? json.protocolo,
        pdfUrl: json.url ?? json.caminho_xml_nota_fiscal,
        xmlUrl: json.caminho_xml_nota_fiscal,
        payloadProvedor: json,
      };
    } catch (e: any) {
      return { sucesso: false, status: "ERRO", mensagem: e.message };
    }
  },

  async cancelar(d: DadosCancelamentoNFe): Promise<ResultadoCancelamento> {
    if (!d.apiKey) return { sucesso: false, mensagem: "Credencial Focus NFe nao cadastrada" };
    try {
      const r = await fetch(`${BASE(d.ambiente)}/v2/nfse/${encodeURIComponent(d.numeroExterno)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: authHeader(d.apiKey) },
        body: JSON.stringify({ justificativa: d.motivo }),
      });
      const json: any = await r.json().catch(() => ({}));
      if (!r.ok) return { sucesso: false, mensagem: json?.mensagem ?? `HTTP ${r.status}`, payloadProvedor: json };
      return { sucesso: true, cancelamentoId: json.codigo_cancelamento ?? json.numero_protocolo, payloadProvedor: json };
    } catch (e: any) {
      return { sucesso: false, mensagem: e.message };
    }
  },

  async consultar(ref, apiKey, ambiente): Promise<ResultadoEmissaoNFe> {
    try {
      const r = await fetch(`${BASE(ambiente)}/v2/nfse/${encodeURIComponent(ref)}`, {
        headers: { Authorization: authHeader(apiKey) },
      });
      const json: any = await r.json().catch(() => ({}));
      if (!r.ok) return { sucesso: false, status: "ERRO", mensagem: json?.mensagem };
      return {
        sucesso: true,
        status: json.status === "autorizado" ? "EMITIDA" : json.status === "cancelado" ? "ERRO" : "PROCESSANDO",
        numeroNota: json.numero,
        pdfUrl: json.url,
        payloadProvedor: json,
      };
    } catch (e: any) {
      return { sucesso: false, status: "ERRO", mensagem: e.message };
    }
  },
};
```

### artifacts/api-server/src/lib/nfe/adapters/enotas.ts
```typescript
import type {
  ProvedorNFeAdapter,
  DadosEmissaoNFe,
  DadosCancelamentoNFe,
  ResultadoEmissaoNFe,
  ResultadoCancelamento,
} from "./types";

const BASE = "https://api.enotasgw.com.br/v2";

export const enotasAdapter: ProvedorNFeAdapter = {
  codigo: "enotas",

  async emitir(d: DadosEmissaoNFe): Promise<ResultadoEmissaoNFe> {
    if (!d.apiKey) return { sucesso: false, status: "ERRO", mensagem: "Credencial eNotas nao cadastrada para esta unidade" };
    const empresaId = d.metadata?.["empresaId"];
    if (!empresaId) return { sucesso: false, status: "ERRO", mensagem: "metadata.empresaId obrigatorio (cadastro eNotas)" };

    const ref = d.numeroExterno ?? `PAW-${Date.now()}-${d.unidadeId}`;
    const body = {
      tipo: "NFS-e",
      idExterno: ref,
      ambienteEmissao: d.ambiente === "producao" ? "Producao" : "Homologacao",
      cliente: {
        nome: d.pacienteNome,
        cpfCnpj: d.pacienteCpf?.replace(/\D/g, "") ?? "",
        tipoPessoa: "F",
      },
      servico: {
        descricao: d.descricao,
        valorTotal: d.valor,
        codigoServicoMunicipio: d.serviceCode ?? "",
      },
    };

    try {
      const r = await fetch(`${BASE}/empresas/${empresaId}/nfes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${d.apiKey}` },
        body: JSON.stringify(body),
      });
      const json: any = await r.json().catch(() => ({}));
      if (!r.ok) return { sucesso: false, status: "ERRO", mensagem: json?.mensagem ?? `HTTP ${r.status}`, payloadProvedor: json };
      return {
        sucesso: true,
        status: "PROCESSANDO",
        numeroNota: ref,
        protocolo: json.id,
        payloadProvedor: json,
      };
    } catch (e: any) {
      return { sucesso: false, status: "ERRO", mensagem: e.message };
    }
  },

  async cancelar(d: DadosCancelamentoNFe): Promise<ResultadoCancelamento> {
    if (!d.apiKey) return { sucesso: false, mensagem: "Credencial eNotas nao cadastrada" };
    try {
      const r = await fetch(`${BASE}/nfes/${encodeURIComponent(d.numeroExterno)}/cancelamento`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${d.apiKey}` },
        body: JSON.stringify({ motivo: d.motivo }),
      });
      const json: any = await r.json().catch(() => ({}));
      if (!r.ok) return { sucesso: false, mensagem: json?.mensagem ?? `HTTP ${r.status}`, payloadProvedor: json };
      return { sucesso: true, cancelamentoId: json.id, payloadProvedor: json };
    } catch (e: any) {
      return { sucesso: false, mensagem: e.message };
    }
  },

  async consultar(ref, apiKey, _amb): Promise<ResultadoEmissaoNFe> {
    try {
      const r = await fetch(`${BASE}/nfes/porIdExterno/${encodeURIComponent(ref)}`, {
        headers: { Authorization: `Basic ${apiKey}` },
      });
      const json: any = await r.json().catch(() => ({}));
      if (!r.ok) return { sucesso: false, status: "ERRO", mensagem: json?.mensagem };
      return {
        sucesso: true,
        status: json.status === "Autorizada" ? "EMITIDA" : json.status === "Cancelada" ? "ERRO" : "PROCESSANDO",
        numeroNota: json.numero,
        pdfUrl: json.linkDownloadPDF,
        xmlUrl: json.linkDownloadXML,
        payloadProvedor: json,
      };
    } catch (e: any) {
      return { sucesso: false, status: "ERRO", mensagem: e.message };
    }
  },
};

export function getAdapterByCodigo(codigo: string): ProvedorNFeAdapter | null {
  if (codigo === "focus_nfe") return require("./focus").focusAdapter;
  if (codigo === "enotas") return enotasAdapter;
  return null;
}
```

### artifacts/api-server/src/lib/recorrencia/cobrancaMensal.ts
```typescript
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const COMPETENCIA_FORMAT = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

const VENCIMENTO_DIA = 5;
const INADIMPLENCIA_GRACE_DIAS = 5;

export async function gerarCobrancasMensais(competenciaParam?: string) {
  const hoje = new Date();
  const competencia = competenciaParam ?? COMPETENCIA_FORMAT(hoje);
  const [ano, mes] = competencia.split("-").map((n) => parseInt(n, 10));
  const vencimento = new Date(Date.UTC(ano, (mes ?? 1) - 1, VENCIMENTO_DIA));

  const ativos = await db.execute(sql`
    SELECT
      uma.unidade_id,
      uma.modulo_id,
      COALESCE(uma.preco_personalizado, m.preco_mensal) AS valor
    FROM unidade_modulos_ativos uma
    JOIN modulos_padcon m ON m.id = uma.modulo_id
    JOIN unidades u ON u.id = uma.unidade_id
    WHERE uma.ativo = TRUE
      AND m.ativo = TRUE
      AND u.id NOT BETWEEN 1 AND 7
  `);

  let inseridas = 0;
  for (const row of ativos.rows as any[]) {
    const r = await db.execute(sql`
      INSERT INTO cobrancas_mensais_modulos (unidade_id, modulo_id, competencia_mes, valor, vencimento, status)
      VALUES (${row.unidade_id}, ${row.modulo_id}, ${competencia}, ${row.valor}, ${vencimento.toISOString().slice(0, 10)}, 'PENDENTE')
      ON CONFLICT (unidade_id, modulo_id, competencia_mes) DO NOTHING
      RETURNING id
    `);
    if (r.rows.length > 0) inseridas++;
  }
  return { competencia, vencimento: vencimento.toISOString().slice(0, 10), candidatas: ativos.rows.length, inseridas };
}

export async function marcarInadimplencia() {
  const r = await db.execute(sql`
    UPDATE cobrancas_mensais_modulos
    SET status = 'INADIMPLENTE',
        inadimplente_desde = COALESCE(inadimplente_desde, CURRENT_DATE)
    WHERE status = 'PENDENTE'
      AND vencimento < CURRENT_DATE - (${INADIMPLENCIA_GRACE_DIAS}::int)
    RETURNING id
  `);
  return { marcadas: r.rows.length };
}

let workerStarted = false;
export function iniciarWorkerCobrancaMensal() {
  if (workerStarted) return;
  workerStarted = true;

  const TICK_MS = 6 * 60 * 60 * 1000; // 6h: leve, idempotente
  console.log("[cobrancaMensal] Worker iniciado (tick " + TICK_MS / 1000 / 60 + "min, vencimento dia " + VENCIMENTO_DIA + ", grace " + INADIMPLENCIA_GRACE_DIAS + "d)");

  const tick = async () => {
    try {
      const ger = await gerarCobrancasMensais();
      if (ger.inseridas > 0) {
        console.log(`[cobrancaMensal] competencia ${ger.competencia}: ${ger.inseridas}/${ger.candidatas} cobrancas geradas`);
      }
      const inad = await marcarInadimplencia();
      if (inad.marcadas > 0) {
        console.log(`[cobrancaMensal] ${inad.marcadas} cobrancas marcadas como INADIMPLENTE`);
      }
    } catch (e) {
      console.error("[cobrancaMensal] erro no tick:", (e as Error).message);
    }
  };

  setTimeout(tick, 30 * 1000);
  setInterval(tick, TICK_MS).unref();
}
```

### artifacts/api-server/src/middlewares/requireAdminToken.ts
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

### artifacts/api-server/src/routes/painelNfe.ts
```typescript
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdminToken } from "../middlewares/requireAdminToken.js";
import { decifrarCredencial } from "../lib/crypto/credenciais.js";
import { focusAdapter } from "../lib/nfe/adapters/focus.js";
import { enotasAdapter } from "../lib/nfe/adapters/enotas.js";

const router: IRouter = Router();

function getAdapter(codigo: string) {
  if (codigo === "focus_nfe") return focusAdapter;
  if (codigo === "enotas") return enotasAdapter;
  return null;
}

// ═════════════ CATÁLOGO ═════════════
router.get("/provedores-nfe", async (_req, res): Promise<void> => {
  try {
    const r = await db.execute(sql`SELECT * FROM provedores_nfe WHERE ativo = TRUE ORDER BY recomendado DESC, codigo`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/provedores-pagamento", async (_req, res): Promise<void> => {
  try {
    const r = await db.execute(sql`SELECT * FROM provedores_pagamento WHERE ativo = TRUE ORDER BY codigo`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ═════════════ DASH NFe — PAINEL VISUAL ═════════════
router.get("/painel-nfe/dashboard", async (req, res): Promise<void> => {
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : null;
  try {
    const filtro = unidadeId ? sql`WHERE nf.unidade_id = ${unidadeId}` : sql``;
    const stats = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'RASCUNHO') AS rascunho,
        COUNT(*) FILTER (WHERE status = 'EMITIDA') AS emitida,
        COUNT(*) FILTER (WHERE status = 'CANCELADA') AS cancelada,
        COUNT(*) FILTER (WHERE status = 'ERRO') AS erro,
        COALESCE(SUM(valor) FILTER (WHERE status = 'EMITIDA'), 0) AS valor_emitido,
        COALESCE(SUM(valor) FILTER (WHERE status = 'CANCELADA'), 0) AS valor_cancelado
      FROM notas_fiscais_emitidas nf ${filtro}
    `);
    const recentes = await db.execute(sql`
      SELECT nf.id, nf.numero_externo, nf.data_emissao, nf.valor, nf.status, nf.provedor_codigo,
             nf.unidade_id, u.nome AS unidade_nome, u.cor AS unidade_cor,
             p.nome AS paciente_nome, nf.pdf_url, nf.cancelado_em, nf.motivo_cancelamento
      FROM notas_fiscais_emitidas nf
      LEFT JOIN unidades u ON u.id = nf.unidade_id
      LEFT JOIN pacientes p ON p.id = nf.paciente_id
      ${filtro}
      ORDER BY nf.criado_em DESC
      LIMIT 50
    `);
    res.json({ estatisticas: stats.rows[0], recentes: recentes.rows });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ═════════════ EMITIR ═════════════
const emitirSchema = z.object({
  unidadeId: z.number().int().positive(),
  pacienteId: z.number().int().positive(),
  appointmentId: z.number().int().positive().optional(),
  valor: z.number().positive(),
  descricao: z.string().min(10).max(2000),
  categoriaCodigo: z.string().optional(),
  serviceCode: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

router.post("/painel-nfe/emitir", requireAdminToken, async (req, res): Promise<void> => {
  const parsed = emitirSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Body invalido", detalhes: parsed.error.flatten() }); return; }
  const d = parsed.data;
  try {
    const cred = await db.execute(sql`
      SELECT c.*, p.codigo AS provedor FROM unidade_nfe_credenciais c
      JOIN provedores_nfe p ON p.codigo = c.provedor_codigo
      WHERE c.unidade_id = ${d.unidadeId} AND c.ativo = TRUE
      ORDER BY c.cadastrado_em DESC LIMIT 1
    `);
    if (cred.rows.length === 0) { res.status(412).json({ error: "Unidade nao tem credencial NFe cadastrada. Va em Painel NFe > Credenciais." }); return; }
    const c: any = cred.rows[0];

    const pac = await db.execute(sql`SELECT id, nome, cpf FROM pacientes WHERE id = ${d.pacienteId} LIMIT 1`);
    if (pac.rows.length === 0) { res.status(404).json({ error: "Paciente nao encontrado" }); return; }
    const p: any = pac.rows[0];

    const unid = await db.execute(sql`SELECT logotipo_url FROM unidades WHERE id = ${d.unidadeId} LIMIT 1`);
    const logoUrl = (unid.rows[0] as any)?.logotipo_url ?? null;

    const adapter = getAdapter(c.provedor);
    if (!adapter) { res.status(412).json({ error: `Provedor ${c.provedor} sem adapter` }); return; }

    const ref = `PAW-U${d.unidadeId}-N${Date.now()}`;
    const apiKeyClara = decifrarCredencial(c.api_key_cifrada);

    const ins = await db.execute(sql`
      INSERT INTO notas_fiscais_emitidas (paciente_id, appointment_id, unidade_id, numero_externo, valor, descricao_blindada, hash_descricao, status, provedor_codigo, categoria_codigo)
      VALUES (${d.pacienteId}, ${d.appointmentId ?? null}, ${d.unidadeId}, ${ref}, ${d.valor}, ${d.descricao}, ${"sha-" + Date.now()}, 'RASCUNHO', ${c.provedor}, ${d.categoriaCodigo ?? null})
      RETURNING id
    `);
    const nfId = (ins.rows[0] as any).id;

    const result = await adapter.emitir({
      unidadeId: d.unidadeId,
      pacienteNome: p.nome,
      pacienteCpf: p.cpf,
      valor: d.valor,
      descricao: d.descricao,
      serviceCode: d.serviceCode,
      numeroExterno: ref,
      logotipoUrl: logoUrl,
      cnpjEmissor: c.cnpj_emissor,
      inscricaoMunicipal: c.inscricao_municipal,
      ambiente: c.ambiente,
      apiKey: apiKeyClara,
      metadata: { ...(c.metadata ?? {}), ...(d.metadata ?? {}) },
    });

    await db.execute(sql`
      UPDATE notas_fiscais_emitidas
      SET status = ${result.status === "EMITIDA" ? "EMITIDA" : result.status === "ERRO" ? "ERRO" : "RASCUNHO"},
          pdf_url = ${result.pdfUrl ?? null},
          xml_url = ${result.xmlUrl ?? null},
          payload_provedor = ${JSON.stringify(result.payloadProvedor ?? {})}::jsonb,
          atualizado_em = NOW()
      WHERE id = ${nfId}
    `);

    await db.execute(sql`
      INSERT INTO nota_fiscal_eventos (nf_id, tipo_evento, descricao, payload, responsavel)
      VALUES (${nfId}, 'EMISSAO', ${result.sucesso ? "Emitida via " + c.provedor : "Erro: " + (result.mensagem ?? "?")},
              ${JSON.stringify({ resultado: result, ref })}::jsonb, 'admin')
    `);

    res.status(result.sucesso ? 201 : 502).json({ nfId, ref, ...result });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ═════════════ CANCELAR ═════════════
const cancelarSchema = z.object({ motivo: z.string().min(10).max(255) });

router.post("/painel-nfe/:id/cancelar", requireAdminToken, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "id invalido" }); return; }
  const parsed = cancelarSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "motivo obrigatorio (10-255 chars)", detalhes: parsed.error.flatten() }); return; }

  try {
    const nf = await db.execute(sql`SELECT * FROM notas_fiscais_emitidas WHERE id = ${id} LIMIT 1`);
    if (nf.rows.length === 0) { res.status(404).json({ error: "NF nao encontrada" }); return; }
    const n: any = nf.rows[0];
    if (n.status === "CANCELADA") { res.status(409).json({ error: "NF ja esta cancelada" }); return; }
    if (!n.unidade_id || !n.provedor_codigo || !n.numero_externo) {
      res.status(412).json({ error: "NF sem unidade/provedor/numero_externo (rascunho local). Use DELETE /painel-nfe/:id" });
      return;
    }
    const cred = await db.execute(sql`
      SELECT * FROM unidade_nfe_credenciais
      WHERE unidade_id = ${n.unidade_id} AND provedor_codigo = ${n.provedor_codigo} AND ativo = TRUE LIMIT 1
    `);
    if (cred.rows.length === 0) { res.status(412).json({ error: "Credencial nao cadastrada" }); return; }
    const c: any = cred.rows[0];

    const adapter = getAdapter(c.provedor_codigo);
    if (!adapter) { res.status(412).json({ error: "Adapter ausente" }); return; }

    const result = await adapter.cancelar({
      numeroExterno: n.numero_externo,
      motivo: parsed.data.motivo,
      apiKey: decifrarCredencial(c.api_key_cifrada),
      ambiente: c.ambiente,
    });

    if (!result.sucesso) {
      await db.execute(sql`
        INSERT INTO nota_fiscal_eventos (nf_id, tipo_evento, descricao, payload, responsavel)
        VALUES (${id}, 'CANCELAMENTO_FALHOU', ${result.mensagem ?? "?"}, ${JSON.stringify(result)}::jsonb, 'admin')
      `);
      res.status(502).json({ error: "Falha ao cancelar no provedor", detalhes: result }); return;
    }

    await db.execute(sql`
      UPDATE notas_fiscais_emitidas
      SET status = 'CANCELADA', cancelado_em = NOW(), cancelado_por = 'admin', motivo_cancelamento = ${parsed.data.motivo}, atualizado_em = NOW()
      WHERE id = ${id}
    `);
    await db.execute(sql`
      INSERT INTO nota_fiscal_eventos (nf_id, tipo_evento, descricao, payload, responsavel)
      VALUES (${id}, 'CANCELAMENTO', ${"Motivo: " + parsed.data.motivo}, ${JSON.stringify(result)}::jsonb, 'admin')
    `);
    res.json({ sucesso: true, id, ...result });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ═════════════ EDITAR (só rascunho) ═════════════
router.patch("/painel-nfe/:id", requireAdminToken, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "id invalido" }); return; }
  const { descricao, valor, categoriaCodigo } = req.body ?? {};
  try {
    const nf = await db.execute(sql`SELECT status FROM notas_fiscais_emitidas WHERE id = ${id} LIMIT 1`);
    if (nf.rows.length === 0) { res.status(404).json({ error: "NF nao encontrada" }); return; }
    if ((nf.rows[0] as any).status !== "RASCUNHO") { res.status(409).json({ error: "Edicao permitida apenas em RASCUNHO. Para emitidas, use cancelamento + reemissao." }); return; }

    const r = await db.execute(sql`
      UPDATE notas_fiscais_emitidas SET
        descricao_blindada = COALESCE(${descricao ?? null}, descricao_blindada),
        valor = COALESCE(${valor ?? null}, valor),
        categoria_codigo = COALESCE(${categoriaCodigo ?? null}, categoria_codigo),
        atualizado_em = NOW()
      WHERE id = ${id} RETURNING *
    `);
    await db.execute(sql`
      INSERT INTO nota_fiscal_eventos (nf_id, tipo_evento, descricao, payload, responsavel)
      VALUES (${id}, 'EDICAO_RASCUNHO', 'Campos editados antes da emissao', ${JSON.stringify(req.body ?? {})}::jsonb, 'admin')
    `);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ═════════════ APAGAR (só rascunho) ═════════════
router.delete("/painel-nfe/:id", requireAdminToken, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "id invalido" }); return; }
  try {
    const nf = await db.execute(sql`SELECT status FROM notas_fiscais_emitidas WHERE id = ${id} LIMIT 1`);
    if (nf.rows.length === 0) { res.status(404).json({ error: "NF nao encontrada" }); return; }
    if ((nf.rows[0] as any).status !== "RASCUNHO") { res.status(409).json({ error: "Apagar so permitido em RASCUNHO. Para emitidas, cancele." }); return; }
    await db.execute(sql`DELETE FROM nota_fiscal_eventos WHERE nf_id = ${id}`);
    await db.execute(sql`DELETE FROM notas_fiscais_emitidas WHERE id = ${id}`);
    res.json({ sucesso: true, id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ═════════════ TIMELINE ═════════════
router.get("/painel-nfe/:id/eventos", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "id invalido" }); return; }
  try {
    const r = await db.execute(sql`SELECT * FROM nota_fiscal_eventos WHERE nf_id = ${id} ORDER BY ocorrido_em DESC`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
```

### artifacts/api-server/src/routes/credenciaisProvedores.ts
```typescript
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdminToken } from "../middlewares/requireAdminToken.js";
import { cifrarCredencial, mascararCredencial, decifrarCredencial } from "../lib/crypto/credenciais.js";

const router: IRouter = Router();

// ═════════════ GATEWAY DE PAGAMENTO ═════════════
const gatewayCredSchema = z.object({
  unidadeId: z.number().int().positive(),
  provedorCodigo: z.enum(["asaas", "stripe", "mercadopago", "infinitpay", "vindi"]),
  ambiente: z.enum(["sandbox", "producao"]).default("sandbox"),
  apiKey: z.string().min(8).max(2048),
  webhookSecret: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

router.post("/credenciais/gateway", requireAdminToken, async (req, res): Promise<void> => {
  const parsed = gatewayCredSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Body invalido", detalhes: parsed.error.flatten() }); return; }
  const d = parsed.data;
  try {
    const cifrada = cifrarCredencial(d.apiKey);
    const r = await db.execute(sql`
      INSERT INTO unidade_gateway_credenciais (unidade_id, provedor_codigo, ambiente, api_key_cifrada, webhook_secret, metadata, cadastrado_por)
      VALUES (${d.unidadeId}, ${d.provedorCodigo}, ${d.ambiente}, ${cifrada}, ${d.webhookSecret ?? null}, ${d.metadata ? JSON.stringify(d.metadata) : null}::jsonb, 'admin')
      ON CONFLICT (unidade_id, provedor_codigo, ambiente) DO UPDATE SET
        api_key_cifrada = EXCLUDED.api_key_cifrada,
        webhook_secret = EXCLUDED.webhook_secret,
        metadata = EXCLUDED.metadata,
        ativo = TRUE,
        cadastrado_em = NOW()
      RETURNING id, unidade_id, provedor_codigo, ambiente, ativo, cadastrado_em
    `);
    res.status(201).json({ ...r.rows[0], apiKeyMasked: mascararCredencial(d.apiKey) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/credenciais/gateway", async (req, res): Promise<void> => {
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : null;
  try {
    const r = await db.execute(sql`
      SELECT c.id, c.unidade_id, u.nome AS unidade_nome, u.cor AS unidade_cor,
             c.provedor_codigo, p.nome_exibicao AS provedor_nome,
             c.ambiente, c.api_key_cifrada, c.ativo, c.cadastrado_em
      FROM unidade_gateway_credenciais c
      JOIN unidades u ON u.id = c.unidade_id
      JOIN provedores_pagamento p ON p.codigo = c.provedor_codigo
      ${unidadeId ? sql`WHERE c.unidade_id = ${unidadeId}` : sql``}
      ORDER BY c.unidade_id, c.provedor_codigo
    `);
    const rows = (r.rows as any[]).map((row) => ({
      ...row,
      api_key_cifrada: undefined,
      apiKeyMasked: mascararCredencial(decifrarCredencial(row.api_key_cifrada)),
    }));
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete("/credenciais/gateway/:id", requireAdminToken, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "id invalido" }); return; }
  try {
    await db.execute(sql`UPDATE unidade_gateway_credenciais SET ativo = FALSE WHERE id = ${id}`);
    res.json({ sucesso: true, id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ═════════════ NFe ═════════════
const nfeCredSchema = z.object({
  unidadeId: z.number().int().positive(),
  provedorCodigo: z.enum(["focus_nfe", "enotas"]),
  ambiente: z.enum(["homologacao", "producao"]).default("homologacao"),
  apiKey: z.string().min(8).max(2048),
  cnpjEmissor: z.string().min(14).max(20).optional(),
  inscricaoMunicipal: z.string().max(40).optional(),
  certificadoA1Url: z.string().url().optional(),
  certificadoSenha: z.string().min(1).max(120).optional(),
  webhookSecret: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

router.post("/credenciais/nfe", requireAdminToken, async (req, res): Promise<void> => {
  const parsed = nfeCredSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Body invalido", detalhes: parsed.error.flatten() }); return; }
  const d = parsed.data;
  try {
    const apiCif = cifrarCredencial(d.apiKey);
    const senhaCif = d.certificadoSenha ? cifrarCredencial(d.certificadoSenha) : null;
    const r = await db.execute(sql`
      INSERT INTO unidade_nfe_credenciais
        (unidade_id, provedor_codigo, ambiente, api_key_cifrada, certificado_a1_url, certificado_senha_cifrada, cnpj_emissor, inscricao_municipal, webhook_secret, metadata, cadastrado_por)
      VALUES (${d.unidadeId}, ${d.provedorCodigo}, ${d.ambiente}, ${apiCif}, ${d.certificadoA1Url ?? null}, ${senhaCif}, ${d.cnpjEmissor ?? null}, ${d.inscricaoMunicipal ?? null}, ${d.webhookSecret ?? null}, ${d.metadata ? JSON.stringify(d.metadata) : null}::jsonb, 'admin')
      ON CONFLICT (unidade_id, provedor_codigo, ambiente) DO UPDATE SET
        api_key_cifrada = EXCLUDED.api_key_cifrada,
        certificado_a1_url = EXCLUDED.certificado_a1_url,
        certificado_senha_cifrada = EXCLUDED.certificado_senha_cifrada,
        cnpj_emissor = EXCLUDED.cnpj_emissor,
        inscricao_municipal = EXCLUDED.inscricao_municipal,
        webhook_secret = EXCLUDED.webhook_secret,
        metadata = EXCLUDED.metadata,
        ativo = TRUE,
        cadastrado_em = NOW()
      RETURNING id, unidade_id, provedor_codigo, ambiente, ativo, cadastrado_em
    `);
    res.status(201).json({ ...r.rows[0], apiKeyMasked: mascararCredencial(d.apiKey) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/credenciais/nfe", async (req, res): Promise<void> => {
  const unidadeId = req.query.unidadeId ? parseInt(req.query.unidadeId as string, 10) : null;
  try {
    const r = await db.execute(sql`
      SELECT c.id, c.unidade_id, u.nome AS unidade_nome, u.cor AS unidade_cor,
             c.provedor_codigo, p.nome_exibicao AS provedor_nome,
             c.ambiente, c.api_key_cifrada, c.cnpj_emissor, c.inscricao_municipal,
             c.certificado_a1_url, c.ativo, c.cadastrado_em
      FROM unidade_nfe_credenciais c
      JOIN unidades u ON u.id = c.unidade_id
      JOIN provedores_nfe p ON p.codigo = c.provedor_codigo
      ${unidadeId ? sql`WHERE c.unidade_id = ${unidadeId}` : sql``}
      ORDER BY c.unidade_id, c.provedor_codigo
    `);
    const rows = (r.rows as any[]).map((row) => ({
      ...row,
      api_key_cifrada: undefined,
      apiKeyMasked: mascararCredencial(decifrarCredencial(row.api_key_cifrada)),
    }));
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ═════════════ LOGOTIPO DA CLINICA ═════════════
const logoSchema = z.object({
  unidadeId: z.number().int().positive(),
  logotipoUrl: z.string().url().max(2048),
});

router.put("/credenciais/logo", requireAdminToken, async (req, res): Promise<void> => {
  const parsed = logoSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Body invalido", detalhes: parsed.error.flatten() }); return; }
  try {
    const r = await db.execute(sql`
      UPDATE unidades SET logotipo_url = ${parsed.data.logotipoUrl}, logotipo_atualizado_em = NOW()
      WHERE id = ${parsed.data.unidadeId}
      RETURNING id, nome, logotipo_url, logotipo_atualizado_em
    `);
    if (r.rows.length === 0) { res.status(404).json({ error: "Unidade nao encontrada" }); return; }
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/credenciais/logo", async (_req, res): Promise<void> => {
  try {
    const r = await db.execute(sql`
      SELECT id, nome, cor, logotipo_url, logotipo_atualizado_em
      FROM unidades WHERE id NOT BETWEEN 1 AND 7 ORDER BY id
    `);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
```

### artifacts/api-server/src/routes/monetizacaoPadcon.ts
```typescript
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdminToken } from "../middlewares/requireAdminToken.js";

const router: IRouter = Router();

const dispararSchema = z.object({
  unidadeId: z.number().int().positive(),
  eventoCodigo: z.string().min(1).max(32),
  referenciaExterna: z.string().min(1).max(128).optional(),
  metadados: z.record(z.string(), z.any()).optional(),
});

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

router.patch("/modulos-padcon/ativar/:unidadeId/:moduloId", requireAdminToken, async (req, res): Promise<void> => {
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
// Hardening: Zod + idempotência via referencia_externa (UNIQUE parcial no DB)
router.post("/eventos-cobraveis/disparar", async (req, res): Promise<void> => {
  const parsed = dispararSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Body invalido", detalhes: parsed.error.flatten() });
    return;
  }
  const { unidadeId, eventoCodigo, referenciaExterna, metadados } = parsed.data;

  try {
    // Idempotência: se já existe lançamento com mesma referência, retorna o existente (200, não 201)
    if (referenciaExterna) {
      const existente = await db.execute(sql`
        SELECT * FROM unidade_eventos_ledger WHERE referencia_externa = ${referenciaExterna} LIMIT 1
      `);
      if (existente.rows.length > 0) {
        res.status(200).json({ ...existente.rows[0], idempotente: true });
        return;
      }
    }

    const evt = await db.execute(sql`
      SELECT id, preco_unitario FROM eventos_cobraveis WHERE codigo = ${eventoCodigo} AND ativo = TRUE
    `);
    if (evt.rows.length === 0) {
      res.status(404).json({ error: `Evento ${eventoCodigo} nao encontrado` });
      return;
    }
    const evento: any = evt.rows[0];

    // Confirma que unidade existe (4xx limpo se não)
    const unid = await db.execute(sql`SELECT id FROM unidades WHERE id = ${unidadeId} LIMIT 1`);
    if (unid.rows.length === 0) {
      res.status(404).json({ error: `Unidade ${unidadeId} nao encontrada` });
      return;
    }

    try {
      const result = await db.execute(sql`
        INSERT INTO unidade_eventos_ledger (unidade_id, evento_id, valor_cobrado, referencia_externa, metadados)
        VALUES (${unidadeId}, ${evento.id}, ${evento.preco_unitario}, ${referenciaExterna ?? null}, ${metadados ? JSON.stringify(metadados) : null}::jsonb)
        RETURNING *
      `);
      res.status(201).json(result.rows[0]);
    } catch (insertErr: any) {
      // Race condition: outra requisição inseriu entre nossa checagem e o INSERT
      if (insertErr.code === "23505" && referenciaExterna) {
        const existente = await db.execute(sql`
          SELECT * FROM unidade_eventos_ledger WHERE referencia_externa = ${referenciaExterna} LIMIT 1
        `);
        res.status(200).json({ ...existente.rows[0], idempotente: true });
        return;
      }
      throw insertErr;
    }
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

### artifacts/api-server/src/routes/drivePawards.ts
```typescript
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getDriveClient, escapeDriveQuery } from "../lib/google-drive.js";
import { requireAdminToken } from "../middlewares/requireAdminToken.js";

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
router.post("/drive-pawards/provisionar", requireAdminToken, async (req, res): Promise<void> => {
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

## 5. 🎨 Frontend NOVOS

### artifacts/clinica-motor/src/pages/painel-nfe.tsx
```tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, Ban, Pencil, Trash2, Shield, Eye, RefreshCcw, AlertTriangle } from "lucide-react";

const fmt = (v: any) => `R$ ${Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleString("pt-BR") : "—";

const STATUS_COR: Record<string, string> = {
  RASCUNHO: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  EMITIDA: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  CANCELADA: "bg-rose-500/15 text-rose-700 border-rose-500/30",
  ERRO: "bg-red-500/15 text-red-700 border-red-500/30",
};

export default function PainelNfePage() {
  const qc = useQueryClient();
  const [adminToken, setAdminToken] = useState<string>(localStorage.getItem("padcon_admin_token") ?? "");
  const [tokenSalvo, setTokenSalvo] = useState(!!adminToken);
  const [nfSelecionada, setNfSelecionada] = useState<number | null>(null);
  const [motivo, setMotivo] = useState("");
  const [filtroUnidade, setFiltroUnidade] = useState<string>("");

  const { data: dash, isLoading } = useQuery<any>({
    queryKey: ["painel-nfe", filtroUnidade],
    queryFn: () => fetch(`/api/painel-nfe/dashboard${filtroUnidade ? `?unidadeId=${filtroUnidade}` : ""}`).then((r) => r.json()),
    refetchInterval: 30_000,
  });

  const { data: provedoresNfe } = useQuery<any[]>({
    queryKey: ["provedores-nfe"],
    queryFn: () => fetch("/api/provedores-nfe").then((r) => r.json()),
  });

  const { data: eventos } = useQuery<any[]>({
    queryKey: ["nf-eventos", nfSelecionada],
    queryFn: () => fetch(`/api/painel-nfe/${nfSelecionada}/eventos`).then((r) => r.json()),
    enabled: !!nfSelecionada,
  });

  const cancelar = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/painel-nfe/${id}/cancelar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
        body: JSON.stringify({ motivo }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Falha");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["painel-nfe"] }); setMotivo(""); setNfSelecionada(null); },
  });

  const apagar = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/painel-nfe/${id}`, { method: "DELETE", headers: { "x-admin-token": adminToken } });
      if (!r.ok) throw new Error((await r.json()).error ?? "Falha");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["painel-nfe"] }),
  });

  const salvarToken = () => {
    localStorage.setItem("padcon_admin_token", adminToken);
    setTokenSalvo(true);
  };

  const stats = dash?.estatisticas ?? {};
  const recentes = dash?.recentes ?? [];

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3 pb-3 border-b border-border">
        <FileText className="w-7 h-7 text-[#1F4E5F]" />
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-[#1F4E5F]">📑 DASH NFe</h1>
          <p className="text-xs text-muted-foreground">Painel interno: emitir, cancelar, editar e auditar notas — sem sair do PADCON</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {tokenSalvo ? (
            <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
              <Shield className="w-3 h-3 mr-1" />Master conectado
            </Badge>
          ) : (
            <Badge className="bg-amber-500/15 text-amber-700 border border-amber-500/30">Master desconectado</Badge>
          )}
        </div>
      </header>

      {/* Master Token */}
      <Card className="p-4 border-l-4 border-l-[#B8941F]">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-[#B8941F]" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-[#1F4E5F]">Código Master</div>
            <div className="text-xs text-muted-foreground">Necessário pra cancelar, editar e apagar. Fica salvo só no seu navegador.</div>
          </div>
          <Input
            type="password"
            placeholder="Cole seu código master..."
            value={adminToken}
            onChange={(e) => { setAdminToken(e.target.value); setTokenSalvo(false); }}
            className="max-w-xs"
            data-testid="input-admin-token"
          />
          <Button onClick={salvarToken} size="sm" className="bg-[#B8941F] hover:bg-[#9a7a18]" data-testid="btn-salvar-token">Salvar</Button>
        </div>
      </Card>

      {/* Provedores NFe disponíveis */}
      <div className="grid grid-cols-2 gap-3">
        {(provedoresNfe ?? []).map((p) => (
          <Card key={p.codigo} className="p-4 border-l-4 border-l-[#1F4E5F]">
            <div className="flex items-center justify-between mb-1">
              <div className="font-bold text-[#1F4E5F]">{p.nome_exibicao}</div>
              {p.recomendado && <Badge className="bg-[#B8941F]/15 text-[#B8941F] border border-[#B8941F]/30">Recomendado</Badge>}
            </div>
            <div className="text-xs text-muted-foreground mb-2">{p.descricao}</div>
            <div className="flex flex-wrap gap-1 mb-2">
              {(p.funcionalidades ?? []).slice(0, 6).map((f: string) => (
                <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground">💸 {p.preco_aproximado_por_nota} • 🌎 {p.cobertura_municipios}</div>
          </Card>
        ))}
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: "Rascunhos", val: stats.rascunho ?? 0, cor: "#A78B5F" },
          { label: "Emitidas", val: stats.emitida ?? 0, cor: "#1F4E5F" },
          { label: "Canceladas", val: stats.cancelada ?? 0, cor: "#B85C5C" },
          { label: "Erros", val: stats.erro ?? 0, cor: "#7B6450" },
          { label: "R$ Emitido", val: fmt(stats.valor_emitido), cor: "#B8941F" },
          { label: "R$ Cancelado", val: fmt(stats.valor_cancelado), cor: "#5C7C8A" },
        ].map((s) => (
          <Card key={s.label} className="p-3 text-center">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</div>
            <div className="text-lg font-bold mt-1" style={{ color: s.cor }}>{s.val}</div>
          </Card>
        ))}
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Filtrar por unidade:</span>
        <Input
          type="number"
          placeholder="ID da unidade (vazio = todas)"
          value={filtroUnidade}
          onChange={(e) => setFiltroUnidade(e.target.value)}
          className="max-w-xs"
          data-testid="input-filtro-unidade"
        />
        <Button size="sm" variant="ghost" onClick={() => qc.invalidateQueries({ queryKey: ["painel-nfe"] })}>
          <RefreshCcw className="w-3 h-3 mr-1" />Atualizar
        </Button>
      </div>

      {/* Tabela de notas */}
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Nº</th>
              <th className="px-3 py-2 text-left">Data</th>
              <th className="px-3 py-2 text-left">Paciente</th>
              <th className="px-3 py-2 text-left">Unidade</th>
              <th className="px-3 py-2 text-left">Provedor</th>
              <th className="px-3 py-2 text-right">Valor</th>
              <th className="px-3 py-2 text-center">Status</th>
              <th className="px-3 py-2 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} className="text-center py-6 text-muted-foreground">Carregando...</td></tr>
            ) : recentes.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">Nenhuma nota fiscal ainda.</td></tr>
            ) : recentes.map((nf: any) => (
              <tr key={nf.id} className="border-t border-border hover:bg-muted/30" data-testid={`nf-row-${nf.id}`}>
                <td className="px-3 py-2 font-mono text-xs">{nf.id}</td>
                <td className="px-3 py-2 font-mono text-xs">{nf.numero_externo ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{nf.data_emissao}</td>
                <td className="px-3 py-2">{nf.paciente_nome ?? "—"}</td>
                <td className="px-3 py-2">
                  {nf.unidade_nome ? (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: (nf.unidade_cor ?? "#1F4E5F") + "22", color: nf.unidade_cor ?? "#1F4E5F" }}>{nf.unidade_nome}</span>
                  ) : "—"}
                </td>
                <td className="px-3 py-2 text-xs">{nf.provedor_codigo ?? "—"}</td>
                <td className="px-3 py-2 text-right font-mono">{fmt(nf.valor)}</td>
                <td className="px-3 py-2 text-center">
                  <Badge className={`text-[10px] border ${STATUS_COR[nf.status] ?? ""}`}>{nf.status}</Badge>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1 justify-center">
                    <Button size="icon" variant="ghost" title="Ver eventos" onClick={() => setNfSelecionada(nf.id)} data-testid={`btn-ver-${nf.id}`}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    {nf.pdf_url && (
                      <a href={nf.pdf_url} target="_blank" rel="noreferrer" className="text-xs text-[#1F4E5F] hover:underline">PDF</a>
                    )}
                    {nf.status === "EMITIDA" && (
                      <Button size="icon" variant="ghost" title="Cancelar" onClick={() => setNfSelecionada(nf.id)} disabled={!tokenSalvo} data-testid={`btn-cancelar-${nf.id}`}>
                        <Ban className="w-3.5 h-3.5 text-rose-600" />
                      </Button>
                    )}
                    {nf.status === "RASCUNHO" && (
                      <>
                        <Button size="icon" variant="ghost" title="Editar" disabled={!tokenSalvo}>
                          <Pencil className="w-3.5 h-3.5 text-amber-600" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Apagar"
                          onClick={() => { if (confirm("Apagar este rascunho?")) apagar.mutate(nf.id); }}
                          disabled={!tokenSalvo}
                          data-testid={`btn-apagar-${nf.id}`}>
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Drawer cancelar / eventos */}
      {nfSelecionada && (
        <Card className="p-4 border-l-4 border-l-[#B8941F]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-[#1F4E5F]">NF #{nfSelecionada} — Eventos & Cancelamento</h3>
            <Button size="sm" variant="ghost" onClick={() => setNfSelecionada(null)}>Fechar</Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Cancelar (motivo obrigatório)</h4>
              <Textarea
                placeholder="Ex: Pagamento estornado pelo banco em 20/04/2026..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={4}
                data-testid="textarea-motivo"
              />
              <Button
                className="mt-2 w-full bg-rose-600 hover:bg-rose-700"
                disabled={motivo.length < 10 || !tokenSalvo || cancelar.isPending}
                onClick={() => cancelar.mutate(nfSelecionada)}
                data-testid="btn-confirmar-cancelar"
              >
                <Ban className="w-4 h-4 mr-1" />
                {cancelar.isPending ? "Cancelando..." : "Cancelar nota no provedor"}
              </Button>
              {cancelar.error && (
                <div className="mt-2 text-xs text-rose-700 bg-rose-50 p-2 rounded flex items-start gap-1">
                  <AlertTriangle className="w-3 h-3 mt-0.5" />{(cancelar.error as Error).message}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Timeline da nota</h4>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {(eventos ?? []).length === 0 ? (
                  <div className="text-xs text-muted-foreground">Sem eventos.</div>
                ) : (eventos ?? []).map((ev: any) => (
                  <div key={ev.id} className="text-xs border-l-2 border-[#1F4E5F]/30 pl-2 py-1">
                    <div className="font-semibold text-[#1F4E5F]">{ev.tipo_evento}</div>
                    <div className="text-muted-foreground">{ev.descricao}</div>
                    <div className="text-[10px] text-muted-foreground">{fmtDate(ev.ocorrido_em)} · {ev.responsavel}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
```

### artifacts/clinica-motor/src/pages/gateways-pagamento.tsx
```tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Plus, Shield, KeyRound, CheckCircle2 } from "lucide-react";

export default function GatewaysPagamentoPage() {
  const qc = useQueryClient();
  const [adminToken, setAdminToken] = useState<string>(localStorage.getItem("padcon_admin_token") ?? "");
  const [form, setForm] = useState({
    unidadeId: "" as any,
    provedorCodigo: "mercadopago" as "asaas" | "stripe" | "mercadopago" | "infinitpay" | "vindi",
    ambiente: "sandbox" as "sandbox" | "producao",
    apiKey: "",
    webhookSecret: "",
  });

  const { data: provedores } = useQuery<any[]>({
    queryKey: ["provedores-pagamento"],
    queryFn: () => fetch("/api/provedores-pagamento").then((r) => r.json()),
  });

  const { data: cadastradas } = useQuery<any[]>({
    queryKey: ["credenciais-gateway"],
    queryFn: () => fetch("/api/credenciais/gateway").then((r) => r.json()),
  });

  const { data: unidades } = useQuery<any[]>({
    queryKey: ["unidades-cadastradas"],
    queryFn: () => fetch("/api/unidades").then((r) => r.json()),
  });

  const cadastrar = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/credenciais/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
        body: JSON.stringify({
          unidadeId: parseInt(form.unidadeId, 10),
          provedorCodigo: form.provedorCodigo,
          ambiente: form.ambiente,
          apiKey: form.apiKey,
          webhookSecret: form.webhookSecret || undefined,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Falha");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credenciais-gateway"] });
      setForm((f) => ({ ...f, apiKey: "", webhookSecret: "" }));
    },
  });

  const desativar = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/credenciais/gateway/${id}`, { method: "DELETE", headers: { "x-admin-token": adminToken } });
      if (!r.ok) throw new Error("Falha");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["credenciais-gateway"] }),
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3 pb-3 border-b border-border">
        <CreditCard className="w-7 h-7 text-[#1F4E5F]" />
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-[#1F4E5F]">💳 Gateways de Pagamento</h1>
          <p className="text-xs text-muted-foreground">5 braços disponíveis. Cadastre as credenciais sandbox/produção por clínica.</p>
        </div>
      </header>

      {/* Master Token */}
      <Card className="p-4 border-l-4 border-l-[#B8941F]">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-[#B8941F]" />
          <div className="flex-1 text-sm">Código master pra cadastrar credenciais</div>
          <Input
            type="password"
            placeholder="Master token..."
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
            className="max-w-xs"
            data-testid="input-admin-token"
          />
          <Button size="sm" className="bg-[#B8941F] hover:bg-[#9a7a18]"
            onClick={() => localStorage.setItem("padcon_admin_token", adminToken)}>Salvar</Button>
        </div>
      </Card>

      {/* Catálogo de provedores */}
      <div className="grid grid-cols-5 gap-3">
        {(provedores ?? []).map((p) => (
          <Card key={p.codigo} className="p-3 text-center border-l-4 border-l-[#1F4E5F]">
            <div className="font-bold text-[#1F4E5F] text-sm">{p.nome_exibicao}</div>
            <div className="text-[10px] text-muted-foreground mt-1 line-clamp-3">{p.funcao}</div>
            <div className="mt-2 flex flex-wrap gap-1 justify-center">
              {(p.metodos_suportados ?? []).slice(0, 3).map((m: string) => (
                <Badge key={m} variant="outline" className="text-[9px]">{m}</Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Cadastrar credencial */}
      <Card className="p-4 border-l-4 border-l-[#B8941F]">
        <h3 className="font-bold text-[#1F4E5F] mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4" />Cadastrar / atualizar credencial
        </h3>
        <div className="grid grid-cols-5 gap-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Unidade</label>
            <select
              className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background"
              value={form.unidadeId}
              onChange={(e) => setForm({ ...form, unidadeId: e.target.value })}
              data-testid="select-unidade"
            >
              <option value="">Selecione...</option>
              {(unidades ?? []).filter((u) => u.id > 7).map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Provedor</label>
            <select
              className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background"
              value={form.provedorCodigo}
              onChange={(e) => setForm({ ...form, provedorCodigo: e.target.value as any })}
              data-testid="select-provedor"
            >
              <option value="mercadopago">Mercado Pago</option>
              <option value="asaas">Asaas</option>
              <option value="stripe">Stripe</option>
              <option value="infinitpay">InfinitePay</option>
              <option value="vindi">Vindi</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Ambiente</label>
            <select
              className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background"
              value={form.ambiente}
              onChange={(e) => setForm({ ...form, ambiente: e.target.value as any })}
              data-testid="select-ambiente"
            >
              <option value="sandbox">Sandbox</option>
              <option value="producao">Produção</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">API Key</label>
            <Input type="password" placeholder="API Key" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} data-testid="input-api-key" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Webhook Secret (opc)</label>
            <Input type="password" placeholder="Webhook secret" value={form.webhookSecret} onChange={(e) => setForm({ ...form, webhookSecret: e.target.value })} data-testid="input-webhook-secret" />
          </div>
        </div>
        <Button
          className="mt-3 bg-[#1F4E5F] hover:bg-[#163e4d]"
          disabled={!form.unidadeId || form.apiKey.length < 8 || cadastrar.isPending}
          onClick={() => cadastrar.mutate()}
          data-testid="btn-cadastrar"
        >
          <KeyRound className="w-4 h-4 mr-1" />{cadastrar.isPending ? "Salvando..." : "Salvar credencial"}
        </Button>
        {cadastrar.error && <div className="mt-2 text-xs text-rose-700">{(cadastrar.error as Error).message}</div>}
        {cadastrar.isSuccess && <div className="mt-2 text-xs text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Credencial cadastrada/atualizada.</div>}
      </Card>

      {/* Credenciais cadastradas */}
      <Card className="overflow-hidden">
        <div className="px-4 py-2 bg-muted/50 text-xs uppercase tracking-widest font-bold text-muted-foreground">Credenciais cadastradas</div>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Unidade</th>
              <th className="px-3 py-2 text-left">Provedor</th>
              <th className="px-3 py-2 text-center">Ambiente</th>
              <th className="px-3 py-2 text-left">API Key</th>
              <th className="px-3 py-2 text-center">Status</th>
              <th className="px-3 py-2 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(cadastradas ?? []).length === 0 ? (
              <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">Nenhuma credencial ainda.</td></tr>
            ) : (cadastradas ?? []).map((c: any) => (
              <tr key={c.id} className="border-t border-border" data-testid={`cred-row-${c.id}`}>
                <td className="px-3 py-2">
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: (c.unidade_cor ?? "#1F4E5F") + "22", color: c.unidade_cor ?? "#1F4E5F" }}>{c.unidade_nome}</span>
                </td>
                <td className="px-3 py-2">{c.provedor_nome}</td>
                <td className="px-3 py-2 text-center text-xs">{c.ambiente}</td>
                <td className="px-3 py-2 font-mono text-xs">{c.apiKeyMasked}</td>
                <td className="px-3 py-2 text-center">
                  {c.ativo ? <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">Ativa</Badge> : <Badge variant="outline">Desativada</Badge>}
                </td>
                <td className="px-3 py-2 text-center">
                  {c.ativo && (
                    <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => { if (confirm("Desativar credencial?")) desativar.mutate(c.id); }} data-testid={`btn-desativar-${c.id}`}>
                      Desativar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
```

### artifacts/clinica-motor/src/pages/credenciais-nfe.tsx
```tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Receipt, Shield, KeyRound, Image as ImageIcon, CheckCircle2 } from "lucide-react";

export default function CredenciaisNfePage() {
  const qc = useQueryClient();
  const [adminToken, setAdminToken] = useState<string>(localStorage.getItem("padcon_admin_token") ?? "");
  const [form, setForm] = useState({
    unidadeId: "" as any,
    provedorCodigo: "focus_nfe" as "focus_nfe" | "enotas",
    ambiente: "homologacao" as "homologacao" | "producao",
    apiKey: "",
    cnpjEmissor: "",
    inscricaoMunicipal: "",
    certificadoA1Url: "",
    certificadoSenha: "",
    metadataExtra: "",
  });
  const [logoForm, setLogoForm] = useState({ unidadeId: "" as any, logotipoUrl: "" });

  const { data: provedoresNfe } = useQuery<any[]>({
    queryKey: ["provedores-nfe"],
    queryFn: () => fetch("/api/provedores-nfe").then((r) => r.json()),
  });
  const { data: cadastradas } = useQuery<any[]>({
    queryKey: ["credenciais-nfe"],
    queryFn: () => fetch("/api/credenciais/nfe").then((r) => r.json()),
  });
  const { data: unidades } = useQuery<any[]>({
    queryKey: ["unidades-cadastradas"],
    queryFn: () => fetch("/api/unidades").then((r) => r.json()),
  });
  const { data: logos } = useQuery<any[]>({
    queryKey: ["logos-clinicas"],
    queryFn: () => fetch("/api/credenciais/logo").then((r) => r.json()),
  });

  const cadastrarNfe = useMutation({
    mutationFn: async () => {
      let metadata: any = undefined;
      if (form.metadataExtra.trim()) {
        try { metadata = JSON.parse(form.metadataExtra); } catch { throw new Error("Metadata extra precisa ser JSON válido"); }
      }
      const r = await fetch("/api/credenciais/nfe", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
        body: JSON.stringify({
          unidadeId: parseInt(form.unidadeId, 10),
          provedorCodigo: form.provedorCodigo,
          ambiente: form.ambiente,
          apiKey: form.apiKey,
          cnpjEmissor: form.cnpjEmissor || undefined,
          inscricaoMunicipal: form.inscricaoMunicipal || undefined,
          certificadoA1Url: form.certificadoA1Url || undefined,
          certificadoSenha: form.certificadoSenha || undefined,
          metadata,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Falha");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credenciais-nfe"] });
      setForm((f) => ({ ...f, apiKey: "", certificadoSenha: "" }));
    },
  });

  const salvarLogo = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/credenciais/logo", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
        body: JSON.stringify({ unidadeId: parseInt(logoForm.unidadeId, 10), logotipoUrl: logoForm.logotipoUrl }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Falha");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logos-clinicas"] });
      setLogoForm({ unidadeId: "", logotipoUrl: "" });
    },
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3 pb-3 border-b border-border">
        <Receipt className="w-7 h-7 text-[#1F4E5F]" />
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-[#1F4E5F]">📜 Credenciais NFe & Logos</h1>
          <p className="text-xs text-muted-foreground">Cadastre Focus NFe / eNotas e o logotipo de cada clínica (puxado pra notas, RAS e receitas)</p>
        </div>
      </header>

      {/* Master Token */}
      <Card className="p-4 border-l-4 border-l-[#B8941F]">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-[#B8941F]" />
          <div className="flex-1 text-sm">Código master pra cadastrar credenciais e logos</div>
          <Input type="password" placeholder="Master token..." value={adminToken} onChange={(e) => setAdminToken(e.target.value)} className="max-w-xs" data-testid="input-admin-token" />
          <Button size="sm" className="bg-[#B8941F] hover:bg-[#9a7a18]" onClick={() => localStorage.setItem("padcon_admin_token", adminToken)}>Salvar</Button>
        </div>
      </Card>

      {/* Catálogo */}
      <div className="grid grid-cols-2 gap-3">
        {(provedoresNfe ?? []).map((p) => (
          <Card key={p.codigo} className="p-4 border-l-4 border-l-[#1F4E5F]">
            <div className="flex items-center justify-between mb-1">
              <div className="font-bold text-[#1F4E5F]">{p.nome_exibicao}</div>
              {p.recomendado && <Badge className="bg-[#B8941F]/15 text-[#B8941F] border border-[#B8941F]/30">Recomendado</Badge>}
            </div>
            <div className="text-xs text-muted-foreground mb-2">{p.descricao}</div>
            <div className="text-[10px] text-muted-foreground">💸 {p.preco_aproximado_por_nota} • 🌎 {p.cobertura_municipios}</div>
            <a href={p.url_documentacao} target="_blank" rel="noreferrer" className="text-[10px] text-[#1F4E5F] hover:underline">📖 Documentação →</a>
          </Card>
        ))}
      </div>

      {/* Cadastrar credencial NFe */}
      <Card className="p-4 border-l-4 border-l-[#B8941F]">
        <h3 className="font-bold text-[#1F4E5F] mb-3 flex items-center gap-2"><KeyRound className="w-4 h-4" />Cadastrar credencial NFe</h3>
        <div className="grid grid-cols-3 gap-2">
          <select className="border border-border rounded px-2 py-1.5 text-sm bg-background" value={form.unidadeId} onChange={(e) => setForm({ ...form, unidadeId: e.target.value })} data-testid="select-unidade">
            <option value="">Unidade...</option>
            {(unidades ?? []).filter((u) => u.id > 7).map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
          <select className="border border-border rounded px-2 py-1.5 text-sm bg-background" value={form.provedorCodigo} onChange={(e) => setForm({ ...form, provedorCodigo: e.target.value as any })} data-testid="select-provedor">
            <option value="focus_nfe">Focus NFe</option>
            <option value="enotas">eNotas</option>
          </select>
          <select className="border border-border rounded px-2 py-1.5 text-sm bg-background" value={form.ambiente} onChange={(e) => setForm({ ...form, ambiente: e.target.value as any })}>
            <option value="homologacao">Homologação</option>
            <option value="producao">Produção</option>
          </select>
          <Input type="password" placeholder="API Key" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} data-testid="input-api-key" />
          <Input placeholder="CNPJ emissor" value={form.cnpjEmissor} onChange={(e) => setForm({ ...form, cnpjEmissor: e.target.value })} />
          <Input placeholder="Inscrição municipal" value={form.inscricaoMunicipal} onChange={(e) => setForm({ ...form, inscricaoMunicipal: e.target.value })} />
          <Input placeholder="URL do certificado A1 (opc)" value={form.certificadoA1Url} onChange={(e) => setForm({ ...form, certificadoA1Url: e.target.value })} />
          <Input type="password" placeholder="Senha do certificado (opc)" value={form.certificadoSenha} onChange={(e) => setForm({ ...form, certificadoSenha: e.target.value })} />
          <Input placeholder='Metadata extra JSON (ex: {"empresaId":"abc"})' value={form.metadataExtra} onChange={(e) => setForm({ ...form, metadataExtra: e.target.value })} />
        </div>
        <Button className="mt-3 bg-[#1F4E5F] hover:bg-[#163e4d]" disabled={!form.unidadeId || form.apiKey.length < 8 || cadastrarNfe.isPending} onClick={() => cadastrarNfe.mutate()} data-testid="btn-cadastrar-nfe">
          {cadastrarNfe.isPending ? "Salvando..." : "Salvar credencial NFe"}
        </Button>
        {cadastrarNfe.error && <div className="mt-2 text-xs text-rose-700">{(cadastrarNfe.error as Error).message}</div>}
        {cadastrarNfe.isSuccess && <div className="mt-2 text-xs text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Credencial cadastrada.</div>}
      </Card>

      {/* Tabela credenciais NFe */}
      <Card className="overflow-hidden">
        <div className="px-4 py-2 bg-muted/50 text-xs uppercase tracking-widest font-bold text-muted-foreground">Credenciais NFe cadastradas</div>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Unidade</th>
              <th className="px-3 py-2 text-left">Provedor</th>
              <th className="px-3 py-2 text-center">Ambiente</th>
              <th className="px-3 py-2 text-left">CNPJ</th>
              <th className="px-3 py-2 text-left">API Key</th>
              <th className="px-3 py-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {(cadastradas ?? []).length === 0 ? (
              <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">Nenhuma credencial ainda.</td></tr>
            ) : (cadastradas ?? []).map((c: any) => (
              <tr key={c.id} className="border-t border-border" data-testid={`cred-nfe-${c.id}`}>
                <td className="px-3 py-2">
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: (c.unidade_cor ?? "#1F4E5F") + "22", color: c.unidade_cor ?? "#1F4E5F" }}>{c.unidade_nome}</span>
                </td>
                <td className="px-3 py-2">{c.provedor_nome}</td>
                <td className="px-3 py-2 text-center text-xs">{c.ambiente}</td>
                <td className="px-3 py-2 text-xs font-mono">{c.cnpj_emissor ?? "—"}</td>
                <td className="px-3 py-2 text-xs font-mono">{c.apiKeyMasked}</td>
                <td className="px-3 py-2 text-center">
                  {c.ativo ? <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">Ativa</Badge> : <Badge variant="outline">Desativada</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Logotipos */}
      <Card className="p-4 border-l-4 border-l-[#A78B5F]">
        <h3 className="font-bold text-[#1F4E5F] mb-3 flex items-center gap-2"><ImageIcon className="w-4 h-4" />Logotipo da clínica</h3>
        <p className="text-xs text-muted-foreground mb-3">O logo é puxado automaticamente pras receitas (RAS), notas fiscais e documentos. Cole a URL pública (Drive, S3, CDN).</p>
        <div className="grid grid-cols-3 gap-2">
          <select className="border border-border rounded px-2 py-1.5 text-sm bg-background" value={logoForm.unidadeId} onChange={(e) => setLogoForm({ ...logoForm, unidadeId: e.target.value })} data-testid="select-unidade-logo">
            <option value="">Unidade...</option>
            {(unidades ?? []).filter((u) => u.id > 7).map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
          <Input className="col-span-2" placeholder="https://..." value={logoForm.logotipoUrl} onChange={(e) => setLogoForm({ ...logoForm, logotipoUrl: e.target.value })} data-testid="input-logo-url" />
        </div>
        <Button className="mt-3 bg-[#A78B5F] hover:bg-[#8a724b]" disabled={!logoForm.unidadeId || !logoForm.logotipoUrl || salvarLogo.isPending} onClick={() => salvarLogo.mutate()} data-testid="btn-salvar-logo">
          {salvarLogo.isPending ? "Salvando..." : "Salvar logotipo"}
        </Button>
        {salvarLogo.error && <div className="mt-2 text-xs text-rose-700">{(salvarLogo.error as Error).message}</div>}

        <div className="grid grid-cols-5 gap-3 mt-4">
          {(logos ?? []).map((u: any) => (
            <Card key={u.id} className="p-2 text-center">
              <div className="text-[10px] font-semibold text-[#1F4E5F] truncate">{u.nome}</div>
              {u.logotipo_url ? (
                <img src={u.logotipo_url} alt={u.nome} className="w-full h-16 object-contain mt-1 bg-white rounded border" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="w-full h-16 mt-1 bg-muted rounded flex items-center justify-center text-[10px] text-muted-foreground">Sem logo</div>
              )}
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
```

### artifacts/clinica-motor/src/pages/monetizar.tsx
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

## 6. 📜 Git log (últimos 30)
```
84c6d8c feat(WD#1+#5): Painel NFe + 5 gateways + 2 provedores NFe + logo por clinica
51805cc WD#3,4,6: Zod+idempotencia em /eventos-cobraveis/disparar + requireAdminToken nos sensiveis + worker cobrancaMensal (geracao M1-M7 + inadimplencia automatica)
ce92304 Add a new image asset to the project
e878262 Add a new image asset to the project
6314487 Add industrial meat grinder for processing information
2836af1 Add industrial meat grinder for processing information
adfb13a MOEDOR INDUSTRIAL: contexto total PADCON em arquivo único pra Opus
770dd14 Pacote Opus completo + limpeza Walking Dead (2 ícones zumbis)
3aadbb7 Add images to the assets folder for clinic resources
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
22dd50c Add professional and nursing schedules to the application interface
880b568 Add professional and nursing schedules to the application interface
c1c1836 Update component map to include Sahara Noir panel
fde919c Update component map to include Sahara Noir panel
df4f150 Update clinic schedules to use generic medical professional names
9910678 Update clinic schedules to use generic medical professional names
a6f34dd Update clinic agenda naming conventions to avoid conflicts
```

## 7. 🚨 REGRAS DE FERRO
- **NUNCA db:push** — drift de 32 tabelas / 31 FKs em unidades.id
- SEMPRE ALTER/CREATE direto via psql
- NUNCA renomear coluna existente (só ADD)
- Naming: `perfil` nunca `role`, `auditoria_cascata` nunca `aud_cascata`
- Multi-tenant: toda nova tabela com dados clínicos precisa unidade_id FK
- requireAdminToken em todo POST/PUT/DELETE/PATCH sensível
- Cifragem: SESSION_SECRET + scrypt + AES-256-GCM
