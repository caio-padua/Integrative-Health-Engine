# Motor Clínico — Plataforma de Gestão para Clínica Médica Integrativa

## Overview

Motor Clínico is a SaaS clinical engine platform designed for multi-unit integrative medical clinics. It aims to streamline operations, enhance patient care through data-driven suggestions, and improve administrative efficiency. The platform's core functionality includes patient anamnesis, which triggers a clinical engine to generate suggestions for exams, formulas, injectables, implants, and treatment protocols. Key capabilities include TDAH-friendly dashboards with operational queues, medical validation workflows, and dedicated modules for follow-up and financial management, all contributing to improved clinical and administrative processes. The business vision is to provide an invisible operational consultancy service through a highly efficient and scalable platform, with a comprehensive monetization system for modules and services, targeting multi-unit clinics and consultancy companies.

## User Preferences

The user prefers that all names be complete and semantic, never abbreviated. For example, `auditoria_cascata` is correct, not `aud_cascata`. Names should be comprehensible without external context. The user explicitly states that the field for user profiles must always be named `perfil` and never `role`, as `role` can be visually confused with routing terms, which are common in the backend framework. The user also requires strict adherence to naming conventions across different layers of the application (database tables, schema files, Drizzle fields, API routes). The user mandates the use of semantic prefixes like `pode_` for boolean permissions, `nunca_` for permanent restrictions, and `requer_` for mandatory conditions. When renaming database tables or fields, the user requires that the old name be referenced in comments for security, and all existing routes must remain functional. Absolute prohibitions include never using `role` as a field, never abbreviating names, never replacing existing table schemas (only adding columns), and never dropping tables with data.

## System Architecture

The system is built as a monorepo using `pnpm workspaces`, Node.js 24, and TypeScript 5.9. The frontend utilizes React, Vite, Tailwind CSS, and shadcn/ui, while the backend is powered by Express 5. PostgreSQL serves as the database, managed with Drizzle ORM and validated using Zod. API code generation is handled by Orval, charts by Recharts, and routing by Wouter.

Key architectural decisions and features include:

-   **UI/UX Design (PADCOM V15.2):** Emphasizes a classic, austere, and TDAH-friendly aesthetic with 0px border-radius, pastel blue primary color, deep navy background, and JetBrains Mono typography, resembling a well-formatted legal document.
-   **Access Control & Multi-unit Management:** Role-based access (e.g., `enfermeira`, `medico_tecnico`) and dynamic permissions with a matrix per profile. Supports full management and configuration of multiple clinic units and a multi-clinic consultancy model with `escopo`-based visibility (e.g., `consultoria_master`, `consultor_campo`, `clinica_medico`).
-   **Clinical Engine:** Automates suggestions for therapeutic items based on semantic analysis of anamnesis, utilizing a Unified Therapeutic Items Catalog (PADCOM V13+V4) with 490 classified items.
-   **Operational Workflow:** Manages workflows through operational queues (anamnesis, validation, procedures, follow-up, payments) and includes parameterized approval flows with conditional bypasses.
-   **Data Management & Auditability:** All new database schemas must include `origem`, `versaoSchema`, and `arquivadoEm` for auditability and LGPD compliance. Patient monitoring includes tracking vital signs, symptoms, and formula adherence.
-   **Reporting & Dashboards:** Generates automated RAS (Registro de Atendimento em Saúde) PDFs. Features a TDAH-friendly dashboard with real-time operational queues, a "Painel de Comando" for substance usage and session status, and comprehensive global/unit dashboards with KPIs for consultoria_master and clinic owners.
-   **Monetization & Commission System:** Implements a "Motor Comercial" with three charging models (Full, Pacote, Por Demanda) and eight sellable modules. Includes a "Comissão & Metas dos Consultores" system for tracking consultant remuneration and progress.
-   **Delegation System:** A Trello-style board with tasks, priorities, deadlines, and responsibilities, supporting Colaborador Scoring based on resolution rate and completion.
-   **SLA Management:** Unified SLA queue with a traffic light system for task cards and follow-ups, requiring mandatory justifications for overdue items with escalation procedures.
-   **Advanced Analytics:** A "Matriz Analítica Cross-Filter" for detailed cross-analysis of clinical data with dynamic facets and server-side pagination.
-   **Motor de Agenda (Fase 2):** Complete scheduling engine with transactional slot management. Tables: `availability_rules`, `agenda_slots` (unique constraint on professional+date+time), `slot_locks`, `appointments` (SELECT FOR UPDATE booking), `appointment_reschedules`, `agenda_audit_events`, `agenda_blocks`. 12 semantic procedure types (e.g., CONSULTA_30_PRESENCIAL, INFUSAO_LONGA_180_PRESENCIAL). Slot generation from availability rules. Transactional booking with conflict detection (409). Cancel/reschedule with history. Bidirectional Google Calendar sync (push on book, pull external events). Weekly view API. Page: `/agenda-motor`. API: `/api/agenda-motor/*`.
-   **Clinic-Aware Filtering:** All major pages dynamically filter data based on the selected clinic using a `useClinic()` context and `?unidadeId` query parameters.
-   **Semantic Code Coverage:** 100% semantic code coverage for dietary plans using the `B1 B2 B3 B4 SEQ` format.

## External Dependencies

-   **PostgreSQL:** Primary database.
-   **Drizzle ORM:** Database interaction layer.
-   **ViaCEP API:** Brazilian address lookup service.
-   **Google Calendar API:** Clinic schedule management.
-   **Google Drive API:** Structured document storage and source code backup.
-   **Gmail API:** Automated email sending.
-   **Orval:** OpenAPI-first code generation tool.
-   **Recharts:** JavaScript charting library.
-   **Twilio:** WhatsApp messaging service.
-   **Gupshup:** WhatsApp messaging service.