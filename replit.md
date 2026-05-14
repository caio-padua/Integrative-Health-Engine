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

## Wave Cadastro Pádua — 4.278 pacientes (13/mai/2026)

Importação completa do Instituto Pádua (`unidade_id=15`) a partir da
planilha Google Sheets (`SHEET_ID=1uR0jIx1rIQE3346EUQZhy52gDkrtslH91NGeIPF7QxY`,
tab "Cadastro Mestre"). Estrutura nova de Drive hierárquica + código semântico
interno + nomenclatura padrão de arquivos.

### Resultado
- **3.872 inseridos + 20 atualizados + 386 pulados sem telefone, 0 erros**
- 3.847 pacientes Pádua com `codigo_semantico` (ex: `PADU-AGRA-ABHI-MASC-1979-9801`)
- Coverage: 2.600 com CPF · 3.847 com tel · 3.792 com WhatsApp · 3.222 com data nascimento
- Idempotência confirmada via `(unidade_id, codigo_externo)` → re-run = `UPDATE` no-op
- Invariantes Wave 9 PRESERVADAS: 8.728 receitas, R$ 2.736.536,10 comissão, 5 triggers ATIVOS

### Migration 040 (`040_pacientes_codigo_semantico.sql`, psql aditivo)
Adiciona em `pacientes`: `codigo_externo`, `codigo_semantico`,
`drive_subpastas jsonb`, `telefone_fixo`, `whatsapp`. Cria tabelas
`arquivos_paciente` (registry de arquivos no Drive) e `importacoes_lote`
(rastreabilidade de batches).

### Libs novas
- `lib/format/canonico.ts` — canonicaliza CPF/tel/email/CEP
- `lib/arquivos/codigoSemantico.ts` — gera `SLUGCLINICA-SOBR-NOME-SEXO-AAAA-DDDD`
- `lib/arquivos/catalogo.ts` — 7 categorias macro
- `lib/arquivos/registry.ts` — persiste arquivo no DB + Drive
- `lib/arquivos/drive.ts` — estrutura PAWARDS > GESTAO CLINICA > EMPRESAS >
  [CLINICA] > CLIENTES [CLINICA] > [paciente] > [categoria] (lazy-create)

### Migration 042 — auto-completar dados cadastrais
5 funções PL/pgSQL (`fn_padcon_calcular_idade`, `fn_padcon_classificar_faixa_etaria`,
`fn_padcon_inferir_sexo_por_nome`, `fn_padcon_inferir_estado_civil_por_idade`,
`fn_padcon_inferir_profissao_padrao`) + trigger `trg_padcon_completar_dados`
BEFORE INSERT/UPDATE em `pacientes`. POST `/pacientes` retorna
`avisoCadastroIncompleto` quando faltam campos críticos.

## Wave V25 PADCOM Demo — Luciano Carvalho (13/mai/2026)

Peça de demonstração executiva: **planilha Google Sheets V25 PADCOM
populada** com dados clinicamente plausíveis (claramente marcada
"DEMONSTRAÇÃO") para o paciente **Luciano Carvalho Torraga Dos Santos**
(id=4587, masc, 38 anos, código `PADU SANT LUCI MASC 1988 6873`).

### Estrutura V25 PADCOM (briefing Dr. Claude)
14 abas — narrativa clínica integrativa "antes → durante → depois":
1. CADASTRO — identidade do paciente (3 datas avaliativas)
2. RESUMO EXECUTIVO — semáforo de classificações
3. CARDIOVASCULAR (6 exames: Colesterol Total, LDL, HDL, Triglicerídeos, hs-CRP, Homocisteína)
4. METABÓLICO (7: Glicose, Insulina, HOMA-IR, HbA1c, TSH, Cortisol, DHEA-S)
5. VITAMINAS_MINERAIS (6: Vit D, B12, Folato, Ferritina, Magnésio, Zinco)
6. AUTOIMUNE (4: FAN, Fator Reumatoide, PCR-us, IgA total)
7. ONCOLÓGICO (3 rastreio masc: PSA total, PSA livre, CEA)
8. NEURO_PSI (5: Cortisol noturno, Melatonina, Triptofano, Vit B6, DHEA-S)
9. GASTRO_HEPÁTICO (5: AST, ALT, GGT, Bilirrubina total, Albumina)
10. RENAL (5: Ureia, Creatinina, eGFR, Ác. úrico, Microalbuminúria)
11. MUSCULO_ESQUELÉTICO (5: CPK, Cálcio iônico, Fósforo, PTH, Osteocalcina)
12. BLENDS (20 slots × 5 ativos cada — protocolo manipulado)
13. CIRURGIAS (registro histórico)
14. PARÂMETROS — legenda de cores + escala terços (PREOCUPANTE / BAIXO / MEDIANO / OTIMO / ALERTA)

### Classificação por terços (cores institucionais)
- 🔴 PREOCUPANTE / ALERTA → vermelho-escuro `#7d1d2e`
- 🟠 BAIXO / ALTO → laranja `#d97a3c`
- 🟡 MEDIANO → amarelo `#e8c547`
- 🟢 OTIMO (terço-alvo do analito) → verde `#3a7d44`

### Lib + Script
- `artifacts/api-server/src/lib/sheets/fichaV25Padcom.ts` — gerador V25
  (cria spreadsheet com 14 abas, formatação por terço, blends, cirurgias)
- `scripts/src/gerar-v25-luciano.ts` — CLI (`pnpm --filter @workspace/scripts run gerar-v25-luciano`)
- Saída: spreadsheet Google compartilhado + URL impressa no console

### Dados simulados (paciente sem prontuário real)
Narrativa "Caso Luciano": homem 38a com déficit Vit D inicial (18 ng/mL,
PREOCUPANTE) + LDL alto (142, ALERTA) + HOMA-IR 3.2 (ALERTA) que
**recupera com protocolo PADCON** ao longo de 3 datas avaliativas
(D1=01/2026, D2=04/2026, D3=05/2026), terminando com Vit D=58 (ÓTIMO),
LDL=115 (ÓTIMO), HOMA-IR=1.8 (ÓTIMO). Demonstra valor clínico do motor.

## Wave Backfill Posologia Estruturada — Task #40 (13/mai/2026)

Backfill único da coluna `posologia_estruturada` (jsonb, migration 034) nos
registros históricos de `itens_terapeuticos` e `revo_medicamentos`. A partir
desta onda, TODOS os PDFs (RASX/REVO/Motor) renderizam a frase canônica
padronizada — antes só novas inserções via `/sync-catalogo` ou UI populavam
o campo, e os históricos caíam no texto bruto.

### Script (`scripts/src/backfill-posologia-estruturada.ts`)
- CLI: `pnpm --filter @workspace/scripts run backfill-posologia-estruturada`
- Lê `posologia_estruturada IS NULL AND posologia IS NOT NULL` em chunks de 500.
- Chama `parsePosologia` (lib pura `@workspace/posologia`) com contexto:
  - `itens_terapeuticos` → `categoria` herdada da própria coluna
  - `revo_medicamentos` → `revo_formula` (tipo_med=formula) ou `revo_medicamento`
- `UPDATE` por id; não toca em `posologia` (texto bruto = fonte de verdade).
- Idempotente: re-run = no-op (query já exclui linhas backfilled).

### Resultado (snapshot 13/mai/2026)
- **itens_terapeuticos: 167 processados | 167 interpretado (100,0%) | 0 fallback**
- **revo_medicamentos: 92 processados | 92 interpretado (100,0%) | 0 fallback**
- **Geral: 259/259 (100,0% interpretado, 0% fallback)**
- Re-execução confirmada idempotente (0 linhas pendentes).
- Migration 034 aplicada antes do backfill (era pré-requisito ausente no DB).

## Wave V232 — Retencao automatica da auditoria do Painel PAWARDS (14/mai/2026)

Task #232 fechada: a tabela `painel_pawards_auditoria` (migration 007) recebia
um INSERT a cada GET no Painel PAWARDS sem nenhuma politica de retencao —
em alguns meses viraria gigante e a paginacao ficaria lenta, alem de violar
recomendacao da LGPD (manter trilha de acesso so pelo prazo necessario).

### Migration 056 (`056_painel_pawards_auditoria_retencao.sql`)
Cria `painel_pawards_auditoria_limpezas` (id, executado_em, corte_em,
meses_retencao, removidas, pulado_por_lock) — log auditavel de cada
execucao do worker. NAO mexe na tabela auditada (so adiciona historico).

### Worker (`lib/recorrencia/limpezaAuditoriaPainelPawards.ts`)
- Tick a cada 24h, primeiro disparo 5min apos boot.
- `DELETE FROM painel_pawards_auditoria WHERE acessado_em < now() - N months`
  numa unica query (usa indice `idx_painel_pawards_auditoria_acessado_em`).
- N configuravel via env `PAINEL_PAWARDS_AUDITORIA_RETENCAO_MESES` (default 12).
- Lock distribuido `pg_try_advisory_lock(15102320)` pra defesa multi-replica.
- Persiste cada execucao em `painel_pawards_auditoria_limpezas`.
- Defensivo: nunca lanca; tick falha = log + segue.
- Wired em `index.ts` via `iniciarWorkerLimpezaAuditoriaPainelPawards()`.

## Wave V46 — WhatsApp do CEO ativado (13/mai/2026)

Task #46 fechada: tela `/plataforma/perfil` agora permite cadastrar o
telefone celular do CEO (validador_mestre) com mascara BR
`(11) 91234-5678` + validacao E.164. O numero e gravado em
`usuarios.telefone` no formato `+55DDD9XXXXXXXX` via `PUT /api/usuarios/:id`
(rota ja aceitava `telefone` em SELF_FIELDS).

**Canal WhatsApp do CEO depende deste cadastro.** Sem `usuarios.telefone`
preenchido pra um usuario com `perfil = '''validador_mestre''' AND ativo = true`,
o service de assinatura (`artifacts/api-server/src/lib/assinatura/service.ts`,
funcao `notificarCeoAssinaturaConcluida`) so consegue enfileirar e-mail
nos eventos `doc_signed`/`doc_refused` (Task #36). Apos o cadastro, o
proximo evento ZapSign ja dispara WhatsApp via Twilio/Gupshup — sem
mudar codigo, sem deploy.

`GET /api/usuarios/perfil-atual` agora devolve `telefone` pra hidratar
a tela. PUT existente continua sendo a rota oficial de escrita.

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
