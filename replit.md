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
