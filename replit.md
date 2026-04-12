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
- **Multi-Clinic Consultancy Model:** Architecture supports a consultancy company (`consultorias` table) managing multiple client clinics (`unidades`). Users have an `escopo` field (consultoria_master, clinica_medico, clinica_enfermeira, clinica_admin) that controls visibility. Clinic staff sees only operational views; consultoria_master sees everything. This enables selling the system as an invisible operational consultancy service.
- **Delegation System (Trello-style):** Board with 4 columns (Pendente, Em Andamento, Concluído, Atrasado). Cards include: título, descrição, prioridade (urgente/alta/média/baixa), prazo (24h/36h/48h/72h/1_semana), categoria, responsável. Auto-detects overdue tasks. API at `/api/delegacao`.
- **Colaborador Scoring:** Ranking of team members by resolution rate, on-time completion, and quality score. Visible in the Resolutividade tab of the Delegation page.
- **Patient Feedback (0-5):** Star-based feedback from patients via WhatsApp/presencial/email/telefone. Summary dashboard with distribution chart, average scores, and per-channel analytics. Stored in `feedback_pacientes` table.
- **Patient Photos:** Schema supports `foto_rosto` and `foto_corpo` fields on both `pacientes` and `usuarios` tables. Upload UI on patient detail page (`/pacientes/:id`). Photos stored as base64 data URLs via `PATCH /api/pacientes/:id/fotos`. Validation: must be `data:image/*`, max 5MB.
- **Consultor Campo Scope:** New `consultor_campo` escopo for field consultants (e.g., Maria fisioterapeuta) who serve multiple clinics via `consultor_unidades` junction table. They see delegation, patients, anamnese, followup, agenda, task-cards, filas, avaliacao-enfermagem, estoque.
- **consultor_unidades Junction Table:** Many-to-many between usuarios and unidades. Enables one consultant to serve 3-20 clinics simultaneously. Seeded via `POST /api/seed-consultoria`.
- **Color-coded Delegation Cards:** Cards show clinic name + colored left border using `unidade.cor`. Filter bar at top allows filtering by clinic. 3 demo clinics: Vitallis Centro (#3B82F6 blue), Bem Estar Alphaville (#10B981 green), Saude Integral Campinas (#F59E0B amber).
- **Escopo-based Sidebar:** Menu items filtered by `escopo` field using `VISIBILIDADE_POR_ESCOPO` map instead of old `perfil`-based filtering. Sidebar shows escopo label (Master, Consultor, etc.) below user name.
- **Context Switcher (Seletor de Contexto):** Dropdown in sidebar below user info. For `consultoria_master`: shows "Todas as Clínicas" + all unidades. For `consultor_campo`: shows linked clinics. For `clinica_*`: locked to their unit. Stored in `ClinicContext.tsx`. Exposes `modoVisao` (arquiteto_mestre | dono_clinica | consultor | operacional) and `modoLabel` computed properties. Shows mode label ("ARQUITETO MESTRE" or "DONO DA CLINICA") below clinic name in switcher.
- **Dashboard Modo Arquiteto Mestre:** When `consultoria_master` + "Todas as Clínicas" selected → "Painel da Consultoria" with consolidated KPIs: Clínicas Ativas, Total Pacientes, Delegações Pendentes, Taxa Resolução Geral. Per-clinic health cards with colored borders and progress bars. Alert banner for overdue delegations. Bar chart of delegations per clinic. API: `GET /api/dashboard/consultoria`.
- **Dashboard Modo Dono da Clínica:** When `consultoria_master` selects a specific clinic → "Painel do Dono da Clínica [Nome]" with clinic-specific data: Pacientes Ativos, Demandas Abertas, Taxa Resolução, Custo Demandas (R$). Sections: Distribuição de Planos (Diamante/Ouro/Prata/Cobre), Demandas por Complexidade (barras de progresso), Delegações (grid 2x2), Filas Operacionais, Últimas Demandas. Colored with the clinic's brand color. API: `GET /api/dashboard/dono-clinica/:unidadeId`.
- **Backend Data Isolation:** Delegacao GET supports `?unidadeId=N` query param to filter by clinic. Pacientes GET already supports `?unidadeId=N`. Dashboard resumo + filas also support it.
- **Planos de Acompanhamento:** 4 tiers (Diamante/Ouro/Prata/Cobre) no campo `plano_acompanhamento` da tabela `pacientes`. Cada tier define SLA de resposta (4h/12h/24h/72h), ligação diária, atendimento semanal online, e follow-up ativo. Dropdown para trocar plano direto na lista de pacientes.
- **Demandas de Serviço:** Tabela `demandas_servico` rastreia cada ação do consultor: tipo (resposta_paciente, ligacao_followup, orientacao_equipe, treinamento, etc.), complexidade (verde=1x, amarela=1.5x, vermelha=2.5x), tempo gasto, plano de origem, status. Custo estimado = R$50 × multiplicador de complexidade.
- **Faturamento por Demanda:** Aba de faturamento mostra custo estimado total, produtividade por consultor (verdes/amarelas/vermelhas), faturamento por clínica, e demandas por plano de origem. Permite cobrar a clínica-cliente por demanda de serviço.
- **Comissão & Metas dos Consultores:** Modelo de remuneração: salário fixo R$1.412 + comissão por demanda (verde R$15, amarela R$25, vermelha R$50) + bônus por faixa de meta (25%=Bronze +5%, 50%=Prata +10%, 75%=Ouro +20%, 100%=Diamante +35%). Meta mensal: 40 demandas. Dashboard do consultor mostra remuneração estimada, progresso visual nas faixas, comissão por complexidade. Painel do gestor mostra ranking de consultores, custo total bruto, configuração de remuneração. Tabela `metas_consultor` criada para futuro tracking mensal persistido. Página: `/comissao`. API: `GET /api/comissao/consultor/:id`, `GET /api/comissao/painel-gestor`, `GET /api/comissao/config`.
- **Q013 Disease Selector:** Categorized disease selector with 12 medical categories, DIAX (Diagnóstico Concluído, red) and POTX (Doença Potencial, orange-red) status badges, and a Funil do Paciente panel for filtered views.
- **100% Semantic Code Coverage:** All 48 dietas codified with B1 B2 B3 B4 SEQ format (DIET KETO/CARN/HPRO/LOWC GBAS/GINT/GAMP CAFM/ALMO/JANT/LANC NNNN). Total coverage now at 100%.

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