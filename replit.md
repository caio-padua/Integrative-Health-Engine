# Motor Clínico — Plataforma de Gestão para Clínica Médica Integrativa

## Overview

Motor Clínico is a SaaS clinical engine platform designed for multi-unit integrative medical clinics. It streamlines clinic operations, enhances patient care through data-driven suggestions, and improves administrative efficiency. The platform's core functionality involves patient anamnesis, which triggers a clinical engine to generate suggestions for exams, formulas, injectables (IM/EV), implants, and treatment protocols. Key capabilities include a TDAH-friendly dashboard with operational queues, medical validation workflows, and dedicated modules for follow-up and financial management, all aimed at improving clinical and administrative processes.

## User Preferences

The user prefers that all names be complete and semantic, never abbreviated. For example, `auditoria_cascata` is correct, not `aud_cascata`. Names should be comprehensible without external context. The user explicitly states that the field for user profiles must always be named `perfil` and never `role`, as `role` can be visually confused with routing terms, which are common in the backend framework. The user also requires strict adherence to naming conventions across different layers of the application (database tables, schema files, Drizzle fields, API routes). The user mandates the use of semantic prefixes like `pode_` for boolean permissions, `nunca_` for permanent restrictions, and `requer_` for mandatory conditions. When renaming database tables or fields, the user requires that the old name be referenced in comments for security, and all existing routes must remain functional. Absolute prohibitions include never using `role` as a field, never abbreviating names, never replacing existing table schemas (only adding columns), and never dropping tables with data.

## System Architecture

The system is built as a monorepo using `pnpm workspaces`, Node.js 24, TypeScript 5.9. The frontend uses React, Vite, Tailwind CSS, and shadcn/ui, while the backend is Express 5. PostgreSQL is the database, managed with Drizzle ORM and validated using Zod (v4). API codegen uses Orval, charts use Recharts, and routing uses Wouter.

Key architectural decisions and features:
- **UI/UX Design (PADCOM V15.2):** Features 0px border-radius, pastel blue primary color (hsl(210 45% 65%)), deep navy background (hsl(215 28% 9%)), and JetBrains Mono typography. The design emphasizes a classic, austere, and TDAH-friendly aesthetic, resembling a well-formatted legal document. Tables have visible borders for improved navigation.
- **Access Control:** Role-based access for `enfermeira`, `validador_enfermeiro`, `medico_tecnico`, and `validador_mestre`.
- **Clinical Engine:** Automates suggestions for therapeutic items based on semantic analysis of anamnesis.
- **Operational Queues:** Manages workflow for anamnesis, validation, procedures, follow-up, and payments.
- **Unified Therapeutic Items Catalog (PADCOM V13+V4):** A catalog of 490 real therapeutic items with detailed metadata, classified using the `B1 B2 B3 B4 SEQ` semantic coding system.
- **Multi-unit Management:** Supports full management and configuration of multiple clinic units.
- **Approval Flows:** Parameterized approval processes for different procedure types with stages and conditional bypasses.
- **Dynamic Permissions:** A matrix of permissions per profile with specific flags for various actions and cross-unit visibility.
- **Automated RAS (Registro de Atendimento em Saúde):** Generates detailed, multi-page PDF health records.
- **Sovereignty Toggle:** Activates a preceptor queue for case homologation by a director to ensure medical governance and auditing.
- **Smart Exams (Modulo 38):** Automated classification of exam results into terciles with a traffic light system and trend analysis.
- **Mandatory Schema Fields:** All new database schemas must include `origem`, `versaoSchema`, and `arquivadoEm` for auditability and LGPD compliance.
- **Patient Monitoring:** Includes schemas and routes for tracking vital signs, symptoms, formula adherence, and patient-created alerts.
- **WhatsApp Integration:** Unified service for sending messages via Twilio or Gupshup, with templated clinical messages and status tracking.
- **Google Drive Backup:** Automated full source code backup to Google Drive, including all key project files in multiple formats (Google Doc, TXT, MD) and an accessible JSON endpoint for AI consumption.
- **Painel de Comando:** Real-time command dashboard with micro-matrices showing: substance usage tracking (who uses Vit D, Glutationa, etc.), session status breakdown (agendadas/concluídas/faltas), clinical alerts with severity badges (GRAVE/MODERADO/LEVE), and no-show tracking. Four tabs: Visão Geral, "Quem usa o que?", Sessões da Semana, Alertas Clínicos. API endpoint at `/api/dashboard/comando`.

## External Dependencies

- **PostgreSQL:** Primary database.
- **Drizzle ORM:** Database interaction.
- **ViaCEP API:** Address lookup.
- **Google Calendar API:** Clinic schedule management.
- **Google Drive API:** Structured document storage and source code backup.
- **Gmail API:** Automated email sending.
- **Orval:** OpenAPI-first code generation.
- **Recharts:** Data visualization.
- **Tailwind CSS & shadcn/ui:** Frontend styling and UI components.
- **Twilio:** WhatsApp messaging provider.
- **Gupshup:** WhatsApp messaging provider.