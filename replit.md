# Motor Clínico — Plataforma de Gestão para Clínica Médica Integrativa

## Overview

This project is a SaaS clinical engine platform designed for multi-unit integrative medical clinics. Its core functionality revolves around patient anamnesis, which triggers a clinical engine to generate suggestions for exams, formulas, injectables (IM/EV), implants, and treatment protocols. The system features a TDAH-friendly dashboard with operational queues, medical validation workflows, and dedicated modules for follow-up and financial management. The overarching business vision is to streamline clinic operations, enhance patient care through data-driven suggestions, and improve administrative efficiency across multiple clinic units.

## User Preferences

The user prefers that all names be complete and semantic, never abbreviated. For example, `auditoria_cascata` is correct, not `aud_cascata`. Names should be comprehensible without external context. The user explicitly states that the field for user profiles must always be named `perfil` and never `role`, as `role` can be visually confused with routing terms, which are common in the backend framework. The user also requires strict adherence to naming conventions across different layers of the application (database tables, schema files, Drizzle fields, API routes). The user mandates the use of semantic prefixes like `pode_` for boolean permissions, `nunca_` for permanent restrictions, and `requer_` for mandatory conditions. When renaming database tables or fields, the user requires that the old name be referenced in comments for security, and all existing routes must remain functional. Absolute prohibitions include never using `role` as a field, never abbreviating names, never replacing existing table schemas (only adding columns), and never dropping tables with data.

## System Architecture

The system is built as a monorepo using `pnpm workspaces`, with Node.js 24 and TypeScript 5.9. The frontend utilizes React, Vite, Tailwind CSS, and shadcn/ui, while the backend is powered by Express 5. PostgreSQL is the chosen database, managed with Drizzle ORM and validated using Zod (v4). API codegen is handled by Orval (OpenAPI-first), charts by Recharts, and routing by Wouter.

Key architectural decisions and features include:
- **UI/UX Design (PADCOM V15.2):** Features 0px border-radius for a squared, classic aesthetic. The primary color is a pastel blue (hsl(210 45% 65%)), with a deep navy background (hsl(215 28% 9%)). The logo is the Clinica Padua DP logo. The sidebar uses a left border indicator for active items. Typography is JetBrains Mono, with uppercase, wider-tracking labels. Tables have visible borders for TDAH-friendly navigation. The overall philosophy emphasizes a classic, austere, and TDAH-friendly design, resembling a well-formatted legal document.
- **Access Control:** Defined roles include `enfermeira`, `validador_enfermeiro`, `medico_tecnico`, and `validador_mestre`, each with specific module access.
- **Clinical Engine:** Automates suggestions for exams, formulas, injectables, implants, and protocols based on semantic analysis of anamnesis responses.
- **Operational Queues:** Manages workflow for anamnesis, validation, procedures, follow-up, and payments.
- **Unified Therapeutic Items Catalog (PADCOM V13+V4):** A comprehensive catalog of 490 real therapeutic items, including injectables, formulas, implants, and exam blocks, enriched with detailed metadata.
- **Multi-unit Management:** Allows for the full management and configuration of multiple clinic units, including address, contact information, type, and Google Calendar integration.
- **Approval Flows:** Parameterized approval processes for different procedure types (Consultation/Infusion/Implant) with stages, responsible parties, and conditional bypasses.
- **Dynamic Permissions:** A matrix of permissions per profile with specific flags for questionnaire editing, validation, bypass, invoice issuance, and cross-unit visibility.
- **Automated RAS (Registro de Atendimento em Saúde):** Generates detailed, multi-page PDF health records from sessions, including substance details, patient/professional signatures, and consent forms.
- **Sovereignty Toggle:** A critical feature allowing a global toggle to activate a preceptor queue for case homologation by a director, ensuring medical governance and auditing.
- **Smart Exams (Modulo 38):** Automated classification of exam results into terciles (below min, lower, middle, upper, above max) with a traffic light system (red, yellow, green), automatic trend analysis, and manual override by medical professionals.
- **Mandatory Schema Fields:** All new database schemas must include `origem`, `versaoSchema`, and `arquivadoEm` fields for auditability, schema evolution, and data archiving (LGPD compliance).

## External Dependencies

- **PostgreSQL:** Primary database for all application data.
- **Drizzle ORM:** Used for interacting with the PostgreSQL database.
- **ViaCEP API:** For automatic lookup of address details based on CEP.
- **Google Calendar API:** Integrated for managing clinic schedules across multiple units.
- **Google Drive API:** Used for structured storage of patient-related documents within dedicated folders.
- **Gmail API:** For sending automated pre- and post-session emails to patients.
- **Orval:** OpenAPI-first code generation tool for API clients and Zod schemas.
- **Recharts:** For data visualization within dashboards.
- **Tailwind CSS & shadcn/ui:** Frontend styling and UI component library.