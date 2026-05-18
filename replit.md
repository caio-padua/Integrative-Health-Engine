# Pawards — Plataforma de Gestão para Clínica Médica Integrativa

## Overview

Pawards is a SaaS clinical engine platform designed for multi-unit integrative medical clinics. It aims to streamline operations, enhance patient care through data-driven suggestions, and improve administrative efficiency. The platform's core functionality includes patient anamnesis, which triggers a clinical engine to generate suggestions for exams, formulas, injectables, implants, and treatment protocols. Key capabilities include TDAH-friendly dashboards with operational queues, medical validation workflows, and dedicated modules for follow-up and financial management. The business vision is to provide an invisible operational consultancy service through a highly efficient and scalable platform, with a comprehensive monetization system for modules and services, targeting multi-unit clinics and consultancy companies.

## 🧭 Briefing & Raws para Dr. Claude (orquestração)

> **Atualizado em 2026-05-13 (Wave V25 PADCOM Demo Luciano)**

Os arquivos de fonte-de-verdade local em `.local/*` (microscópio Wave 10,
mapa neuronal v1.1, arquitetura bounded contexts, session plans) **NÃO
vão pro GitHub** porque `.local/` está no `.gitignore`.

A ponte oficial pro Dr. Claude ler tudo via raw GitHub é a pasta
[`docs/dr-claude/`](./docs/dr-claude/), que contém:

- `README.md` — índice + política de atualização + URLs raw por branch
- `00_BRIEFING_PAINEL_CEO_PARA_DR_CLAUDE.md` — semáforo Wave 10, números
  chave (8.728 receitas, R$ 2.736.536,10 potencial, R$ 0 pago), 4 personas
  do Caio, regra ferro
- `01_DECISOES_TOMADAS_WAVE10_F3C.md` — append-only, decisões com data
  ISO e lente de persona (🩺 médico / 💰 CEO / 📈 empresário / 🛡️ investidor)
- `02_DECISOES_PENDENTES_PARA_DR_CLAUDE.md` — perguntas abertas que
  precisam input do Dr. Claude antes do Dr. Replit seguir
- `03_ARQUITETURA_GERAL_DO_CODIGO.md` — **mapa macro→micro do código
  real** com raw URLs por domínio
- `raws/` — espelhos exatos dos docs `.local/*`

## Waves recentes (resumo, detalhes em `docs/historico-wave-v200-plus.md`)

- **Cadastro Pádua (13/mai)** — 3.872 pacientes importados em `unidade_id=15` com `codigo_semantico`, Migration 040/042 (campos pacientes + auto-completar via PL/pgSQL).
- **V25 PADCOM Demo Luciano (13/mai)** — planilha Sheets 14 abas com narrativa "antes→durante→depois" e cores institucionais por terços.
- **Backfill posologia estruturada Task #40 (13/mai)** — 259/259 (100%) interpretados em `itens_terapeuticos` + `revo_medicamentos`.
- **V46 WhatsApp do CEO (13/mai)** — `usuarios.telefone` ativa canal WhatsApp em assinatura digital.
- **V72 Sprint 1 Motor V4 (17/mai)** — Migration 072 ponte aditiva `codigo_referencia` V13 → `codigo_referencia_v4`. Caminho B Dr. Claude: V13 nunca removido.
- **V232 retenção auditoria Painel PAWARDS (14/mai)** — worker 24h limpa `painel_pawards_auditoria` conforme `PAINEL_PAWARDS_AUDITORIA_RETENCAO_MESES`.
- **V256 cão-de-guarda webhook ZapSign silencioso (14/mai)** — worker 60min detecta queda silenciosa e enfileira alerta CEO.
- **V479–V483 demo investidora Carlúcia (18/mai)** — sessão 39 (id=3497, Pádua, 19/mai 07:30): RAS Completo cheio (26.353b, 11 cadernos populados), receita manipulada via `gerarPrescricaoPdf` (Manifesto Blueprint v2.0) roteada pra Galena Manipulação (id=7 em `farmacias_parmavault`), RACJ presencial (9 termos em `termos_assinados`, PDF consolidado 67.541b via novo `gerarPdfRacj`), envelope ZapSign real (solicitação 257, envelope `8f0eb530...`) com link de assinatura enviado por WhatsApp.

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
-   **Reporting & Dashboards:** Generates automated RAS PDFs. Features a TDAH-friendly dashboard with real-time operational queues and comprehensive global/unit KPIs.
-   **Monetization & Commission System:** "Motor Comercial" with 3 charging models (Full/Pacote/Por Demanda) and 8 sellable modules + commission tracking for consultants.
-   **Delegation System:** Trello-style board (tasks, priorities, deadlines, responsibilities) with Colaborador Scoring + bidirectional Trello sync.
-   **SLA Management:** Unified SLA queue with traffic light + mandatory justifications + escalation.
-   **Advanced Analytics:** "Matriz Analítica Cross-Filter" with dynamic facets and server-side pagination.
-   **Agenda Motor:** Scheduling engine with transactional slots, availability rules, booking, rescheduling, bidirectional Google Calendar sync, "Sub-Agendas" filter, smart slot release.
-   **Patient Portal:** Self-reschedule + profile + automated "Faltou" engine.
-   **Team Management Module (Colaboradores & RH):** Full team management with positions, members, attempts, validations, commission events, disciplinary events.
-   **Virtual Agents Module (Carta Magna PADCOM):** AI agent provisioning, capabilities, execution logs, contextual memories, human validation queues, writing engine config (formality, empathy, tone, rules).
-   **Clinic-Aware Filtering:** All major pages filter by selected clinic via `useClinic()` + `?unidadeId`.
-   **Semantic Code Coverage:** 100% semantic coverage for dietary plans (`B1 B2 B3 B4 SEQ` format).
-   **Full CRUD Editing:** Complete CRUD for Catálogo (Injectables/Formulas/Implants/Protocols/Exams/Diseases), Users, Substances, Sub-Agendas, Units, Semantic Codes, Approval Flows, Profiles/Permissions.
-   **RASX REVO — Dual-Mode Medications:** Both "Remédio" and "Fórmula Magistral" with distinct data structures and PDF reporting.
-   **RASX-MATRIZ V6 — Semantic Motor:** 5 Master Blocks (CLIN/JURI/FINA/ACOM/4100), 20 Subgroups, 7 Events, 6 Procedure Classes, 6 Specific Consents. Hashed officially-named PDFs with auditable logs + Drive/Email/WhatsApp delivery.
-   **Institutional PDF Layout:** Standardized header (PAWARDS + Nick) and footer for all generated PDFs.
-   **DB-driven Legal Terms:** Versioned legal terms (LGPD, consents) signed by patient via enriched RACJ PDFs.
-   **Instituto Genesis:** Protected immutable "genesis_seed" unit (ID 14) — permanent template for colonizing new clinics with predefined catalogs, legal terms, motor configurations.

## External Dependencies

-   **PostgreSQL:** Primary database.
-   **Drizzle ORM:** Database interaction layer.
-   **ViaCEP API:** Brazilian address lookup service.
-   **Google Calendar API:** Clinic schedule management.
-   **Google Drive API:** Structured document storage and source code backup.
-   **Gmail API:** Automated email sending.
-   **Orval:** OpenAPI-first code generation tool.
-   **Recharts:** JavaScript charting library.
-   **Trello API:** Task board synchronization (TRELLO_API_KEY/TOKEN/BOARD_ID).
-   **Twilio + Gupshup:** WhatsApp messaging services.
-   **ZapSign:** Digital signature provider (ICP-Brasil) — Wave 10 production.
-   **Asaas / Mercado Pago / Stripe / InfinitPay:** Payment gateways (adapter pattern).

## ⚠️ AVISO IMPORTANTE — números "8.728 receitas" e "R$ 2.736.536,10"

Caio (CEO) explicitou em 13/mai/2026: esses números **NÃO** são receitas
emitidas nem caixa real. São **projeção de potencial** calculada a partir
das fichas históricas migradas de planilhas (Wave 9 PARQ + Wave Cadastro
Pádua). Caio NÃO emitiu nenhuma receita pelo sistema ainda.

**Regra pra todo agente:** NUNCA citar "8.728 receitas" ou "R$ 2.736.536,10"
como se fossem dado real ou metas atingidas. Sempre que precisar referenciar,
usar "potencial estimado a partir de fichas históricas". Os triggers do banco
continuam válidos como invariantes técnicas (não devem ser dropados).

## Histórico Arquivado

> Conteúdo movido pra reduzir contexto (replit.md ~1031 → ~150 linhas).

- [`docs/historico-waves-5-a-8.md`](./docs/historico-waves-5-a-8.md) —
  PARMAVAULT-TSUNAMI / Wave 5/6/7/8 / Wave 3 FATURAMENTO
- [`docs/historico-waves-9-e-anteriores.md`](./docs/historico-waves-9-e-anteriores.md) —
  Wave 9 PARQ Migration 030, PARMASUPRA-TSUNAMI, Onda LAVAGEM PAWARDS,
  Manifesto PADCON 2.0, Onda MANHÃ PARMAVAULT, Onda PRESCRIÇÃO PADCON
- [`docs/historico-wave-10-jwt-pagamentos-ondas-6x-7x.md`](./docs/historico-wave-10-jwt-pagamentos-ondas-6x-7x.md) —
  Wave 10 ZapSign + ICP-Brasil completa (F0 a F6, Wave 10.5 hardening,
  tsunami follow-ups #34 a #69), Onda Blindagem JWT, Sistema Pagamentos
  PADCON, Reperfusão Conteúdo, Anastomose Documental, Ondas 6.x/7/7.5,
  REGRA DE OURO, PARMASUPRA fechamento
