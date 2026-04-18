# Pawards — Plataforma de Gestão para Clínica Médica Integrativa

## Overview

Pawards is a SaaS clinical engine platform designed for multi-unit integrative medical clinics. It aims to streamline operations, enhance patient care through data-driven suggestions, and improve administrative efficiency. The platform's core functionality includes patient anamnesis, which triggers a clinical engine to generate suggestions for exams, formulas, injectables, implants, and treatment protocols. Key capabilities include TDAH-friendly dashboards with operational queues, medical validation workflows, and dedicated modules for follow-up and financial management. The business vision is to provide an invisible operational consultancy service through a highly efficient and scalable platform, with a comprehensive monetization system for modules and services, targeting multi-unit clinics and consultancy companies.

## User Preferences

The user prefers that all names be complete and semantic, never abbreviated. For example, `auditoria_cascata` is correct, not `aud_cascata`. Names should be comprehensible without external context. The user explicitly states that the field for user profiles must always be named `perfil` and never `role`, as `role` can be visually confused with routing terms, which are common in the backend framework. The user also requires strict adherence to naming conventions across different layers of the application (database tables, schema files, Drizzle fields, API routes). The user mandates the use of semantic prefixes like `pode_` for boolean permissions, `nunca_` for permanent restrictions, and `requer_` for mandatory conditions. When renaming database tables or fields, the user requires that the old name be referenced in comments for security, and all existing routes must remain functional. Absolute prohibitions include never using `role` as a field, never abbreviating names, never replacing existing table schemas (only adding columns), and never dropping tables with data.

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
