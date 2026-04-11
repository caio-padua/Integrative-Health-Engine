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

## Módulos V22 (Implementação 9)

### Schema: `monitoramentoPaciente.ts`
- **`direcao_favoravel_exame`** — GAP A: Tabela de referência dizendo se cada exame é SUBIR_BOM ou DESCER_BOM. 46 exames seedados da V22. Função `interpretarTendenciaExame()` converte tendência + direção → MELHORA/PIORA/ESTAVEL.
- **`formula_blend` + `formula_blend_ativo`** — GAP B: Blends compostos com ativos filhos (ordem, componente, dosagem, unidade). 4 blends V22 seedados (Sono 7 ativos, Foco 6, Metabólico 5, Hepático 6).
- **`registro_substancia_uso`** — GAP C: Visão consolidada blend + medicação por paciente com status ATIVO/PAUSADO/CONCLUIDO/CANCELADO.
- **`acompanhamento_formula`** — GAP D: Tracking rico de aderência (ALTA/MEDIA/BAIXA), bem-estar, resultado (SIM/PARCIAL/NAO), efeitos colaterais (até 2), observação. Origem PACIENTE ou PROFISSIONAL.
- **`monitoramento_sinais_vitais`** — GAP E: 6 indicadores × 6 slots/dia (hora1-hora6 valor+horário). Indicadores: PA_SISTOLICA, PA_DIASTOLICA, FREQUENCIA_CARDIACA, GLICEMIA_JEJUM, PESO, CINTURA.
- **`tracking_sintomas`** — 15 indicadores (sono, energia, disposicao, atividadeFisica, foco, concentracao, libido, forca, emagrecimento, hipertrofia, definicao, resistencia, massaMagra, estresse, humor). Estresse é INVERTIDO (alto=ruim). Classificação automática: PREOCUPANTE/BAIXO/MEDIANO/OTIMO.
- **`alerta_paciente`** — Card tipo Trello: paciente cria alerta (10 tipos) → assistente responde (texto + flag contato telefônico) → status ABERTO→EM_ATENDIMENTO→RESPONDIDO→FECHADO.

### Rotas Backend
- `monitoramentoPaciente.ts` — POST sinais vitais (unitário/lote), GET sinais por paciente, POST tracking sintomas, GET sintomas+gráfico por paciente, POST acompanhamento fórmula, GET acompanhamentos por paciente
- `alertaPaciente.ts` — CRUD alertas, PATCH responder/fechar, GET stats por status+gravidade
- `direcaoExame.ts` — GET/POST direção favorável, POST seed (46 exames V22)
- `formulaBlend.ts` — GET/POST blends com ativos, POST seed V22, CRUD registro substâncias uso

### Frontend
- **Portal do Cliente** (`/portal`) — Hub self-service com 5 seções: Sinais Vitais (até 4 medições/dia), Sintomas (15 sliders 0-10), Fórmulas (feedback aderência/efeitos), Alertas (card para equipe), Upload documentos
- **Monitoramento do Paciente** (`/pacientes/:id/monitoramento`) — Dashboard médico com 4 KPIs + grid sinais vitais (replica V22) + tracking sintomas com classificação + alertas com resposta inline

## Backup Google Drive
- **Endpoint**: `POST /api/backup-drive` — Envia MD + PDF de resumo para pasta BANCO CODIGOS REPLIT GITHUB no Google Drive
- **Formato nomes**: `yy.mm.dd hh.mm CODIGO REPLIT "PADCOM V15.2 Motor Clinico" "Resumo da melhoria"`
- **Conteúdo MD/PDF**: Resumo, data/hora, últimos 20 commits, árvore de arquivos, info do projeto
- **Status**: `GET /api/backup-drive/status` — Lista últimos 10 backups na pasta
- **UI**: Card na página `/configuracoes` com campo de resumo e botão "Enviar Backup"
- **Pasta Drive**: `1LfolNE3KgJSrnKwxp0WNXTRIRvSS_i7f`
- **Código fonte**: Versionado automaticamente no GitHub branch `replit-agent` (não vai no Drive por limite de tamanho do proxy)