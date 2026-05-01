# 🏛️ Arquitetura Geral do Código — PAWARDS Medcore

> **Para quem é este documento?**
> Para o **Dr. Claude (orquestração)** ter um mapa macro→micro do código real,
> com **links raw GitHub** apontando direto pros arquivos-fonte, sem precisar
> que o Dr. Replit transcreva nada manualmente em cada conversa.
>
> **Como ler?** Comece pela seção 1 (Visão Macro). Se quiser mergulhar num
> domínio específico, pule pra seção 4. Se quiser entender só o que mudou
> nos últimos passos (Wave 10), vá direto pra seção 5.
>
> **Atualizado em**: 2026-05-01 (após fechamento Wave 10 F3.C)
> **Branch ativa**: `feat/dominio-pawards`
> **URL raw base**: `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/`

---

## 📖 Índice

1. [Visão Macro — O que é o PAWARDS Medcore](#1-visão-macro)
2. [Estrutura do Monorepo (pnpm)](#2-estrutura-do-monorepo)
3. [Mapa de Dependências — Autônomos vs Dependentes](#3-mapa-de-dependências)
4. [Domínios Principais (com raw URLs)](#4-domínios-principais)
   - 4.1 🩺 Clínico (anamnese, motor, prescrição, exames)
   - 4.2 💊 Farmácia & Orçamentos (PARMAVAULT, contratos, NFe)
   - 4.3 ⚖️ Jurídico & Compliance (PARQ, TCLE, Assinatura Digital, Auditoria)
   - 4.4 💰 Financeiro & Comissão (cobranças, payments, monetização)
   - 4.5 📊 Painéis & Operação (CEO, dashboard, relatórios)
   - 4.6 🔌 Integrações & Infra (Google, WhatsApp, ZapSign, Object Storage)
5. [Wave 10 ZapSign — Últimos passos detalhados](#5-wave-10-zapsign-detalhada)
6. [Tabela de Raws diretos (cola no Claude)](#6-tabela-de-raws-diretos)
7. [Convenções e Regras Ferro](#7-convenções-e-regras-ferro)

---

## 1. Visão Macro

**PAWARDS Medcore** é um **SaaS clínico multi-tenant** para clínicas
médicas integrativas multi-unidade. O coração é um **motor clínico** que,
a partir da anamnese do paciente, sugere exames, fórmulas magistrais,
injetáveis, implantes e protocolos terapêuticos. Tudo orquestrado num
ambiente TDAH-friendly com filas operacionais, validação médica em
cascata e módulos de follow-up + financeiro.

### Ambição estratégica
- **Conversão potencial Wave 10**: R$ 2.735.336,10 (8.725 receitas
  PARMAVAULT já roteadas) → caixa real após assinatura digital ZapSign
- **Defensibilidade jurídica tripla**: CFM 2.386/2024 + CC arts. 593-609 +
  STJ REsp 2.159.442/PR (substitui o conceito de "comissão" por **PARQ —
  Parceria de Qualidade** com auditoria Kaizen bimestral)
- **LGPD art. 11 §4º**: dados sensíveis de saúde com consentimento
  específico por finalidade (TCLE assinado por paciente)

### Stack
| Camada | Tecnologia |
|--------|------------|
| Monorepo | **pnpm workspaces** |
| Backend | Node.js + **Express** + TypeScript |
| Frontend | React + Vite + TypeScript + TailwindCSS + shadcn/ui |
| DB | **PostgreSQL** (Replit-managed) + **Drizzle ORM** |
| Auth | JWT + bcrypt + middleware `requireRole` |
| API contract | **OpenAPI 3** (`lib/api-spec`) → codegen Zod + React Query |
| Filas / async | Triggers SQL + jobs in-process |
| Integrações | Google (Calendar/Drive/Mail), WhatsApp Business API, **ZapSign** (assinatura ICP-Brasil), Object Storage Replit |

### Triângulo de papéis humanos
- **Caio (CEO)** — TDAH/TOC, 4 personas (🩺 médico / 💰 CEO / 📈 empresário / 🛡️ investidor)
- **Dr. Claude (orquestração)** — você. Lê este doc, valida decisões, pondera trade-offs entre as 4 personas
- **Dr. Replit (código)** — agente Replit. Implementa, smoke-testa, commita, nunca decide design sozinho (PADCON Princípio 9)

---

## 2. Estrutura do Monorepo

```
artifacts-monorepo/
├── artifacts/                    # Aplicações deployáveis
│   ├── api-server/               # Backend Express (porta dinâmica via $PORT)
│   ├── clinica-motor/            # Frontend React/Vite (preview principal)
│   └── mockup-sandbox/           # Sandbox de variantes UI (Canvas)
├── lib/                          # Bibliotecas compartilhadas (composite TS)
│   ├── api-spec/                 # Fonte da verdade OpenAPI 3
│   ├── api-zod/                  # Schemas Zod gerados (validação runtime)
│   ├── api-client-react/         # Hooks React Query gerados
│   └── db/                       # Drizzle schema + migrations source-of-truth
├── docs/dr-claude/               # ESTA pasta — ponte oficial pro Dr. Claude
├── .local/                       # Fonte-de-verdade local (NÃO vai pro git)
└── replit.md                     # Memória persistente do agente
```

**Política**: cada `artifact` é independente, declara suas próprias deps,
e nunca importa de outro artifact. Compartilhamento sempre via `lib/*`.

**Raw URLs base**:
- Estrutura raiz: `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/pnpm-workspace.yaml`
- Memória agente: `https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/replit.md`

---

## 3. Mapa de Dependências

### 🟢 Módulos AUTÔNOMOS (rodam isolados, dependem só de DB + auth)

Podem ser modificados sem afetar outros módulos diretamente:

| Módulo | Função | Dependências |
|--------|--------|--------------|
| `routes/anamnese.ts` | Coleta anamnese paciente | DB pacientes |
| `routes/catalogo.ts` | Catálogo substâncias/itens | DB catálogo |
| `routes/agendasProfissionais.ts` | Agenda médica | DB agenda |
| `routes/colaboradores.ts` | CRUD colaboradores | DB colaboradores |
| `routes/relatoriosPdf.ts` | Geração PDFs (puppeteer) | filesystem temp |
| `routes/genesis.ts` | Sistema linfático/genesis popular | DB sistemaLinfatico |
| `services/whatsappService.ts` | Disparo WhatsApp | env WHATSAPP_TOKEN + templates |
| `services/whatsappTemplates.ts` | Templates HSM aprovados Meta | nenhuma |

### 🟡 Módulos DEPENDENTES (chamam outros módulos)

Mexer aqui pode quebrar quem depende — sempre rodar smoke completo:

| Módulo | Depende de | Motivo |
|--------|------------|--------|
| `services/prescricaoEngine.ts` | anamnese, motorClinico, catalogo | Recebe sugestões → gera receita |
| `services/emitirPrescricaoService.ts` | prescricaoEngine, contratosFarmacia | Roteamento PARMAVAULT |
| `lib/assinatura/use-cases/enviarTCLE.ts` | prescricoes (1ª receita), assinatura/service | Gatilhado no `prescricoes.ts` |
| `lib/assinatura/use-cases/enviarPARQ.ts` | parq (admin), assinatura/service | Gatilhado em `routes/parq.ts` |
| `lib/assinatura/use-cases/enviarOrcamentoFarmaceutico.ts` | prescricoes, contratosFarmacia, assinatura/service | Gatilhado em `routes/orcamentos.ts` |
| `routes/assinaturasWebhook.ts` | service.ts, Object Storage, db.auditoria | Recebe callback ZapSign → grava manifesto |
| `routes/financeiro.ts` | prescricoes, contratosFarmacia, comissão (Wave 9 trigger) | Calcula recebíveis |
| `routes/dashboard.ts` (CEO) | quase tudo (read-only) | Agregações cross-domain |

### 🔴 Triggers SQL Wave 9 (INTOCÁVEIS — regra ferro)
Estão em `artifacts/api-server/src/db/migrations/027_*.sql` e
`030_*.sql`. Calculam comissão automaticamente quando receita PARMAVAULT
é roteada. **Nunca remover, nunca recriar**.

- `trg_calc_comissao` (em `receitas` AFTER INSERT)
- `trg_parq_acordo_vigente` (em `parq_acordos` BEFORE INSERT/UPDATE)
- `trg_audit_cascade_v9` (em `auditoria_cascata` AFTER INSERT)

---

## 4. Domínios Principais

### 4.1 🩺 Clínico

**Função**: anamnese → motor de sugestões → prescrição → emissão.

**Fluxo macro**:
```
Paciente cria anamnese
   ↓ (dispara motor)
Motor gera sugestões (exames, fórmulas, injetáveis, protocolos)
   ↓ (médico valida)
Prescrição emitida
   ↓ (1ª vez do paciente)
TCLE auto-disparado pra assinatura digital
```

**Arquivos-chave + raws**:

| Arquivo | Raw URL |
|---------|---------|
| `routes/anamnese.ts` | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/anamnese.ts) |
| `routes/motorClinico.ts` | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/motorClinico.ts) |
| `routes/prescricoes.ts` | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/prescricoes.ts) |
| `services/prescricaoEngine.ts` | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/services/prescricaoEngine.ts) |
| `services/emitirPrescricaoService.ts` | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/services/emitirPrescricaoService.ts) |
| `lib/db/src/schema/anamneses.ts` | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/lib/db/src/schema/anamneses.ts) |
| `lib/db/src/schema/protocolos.ts` | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/lib/db/src/schema/protocolos.ts) |

---

### 4.2 💊 Farmácia & Orçamentos (PARMAVAULT)

**Função**: roteamento de receita pra farmácia parceira → orçamento
formal → reconciliação.

**Conceito-chave**: PARMAVAULT é o nome interno do **cofre de receitas
farmacêuticas roteadas** (8.725 hoje, totalizando R$ 2.735.336,10
potencial).

**Arquivos-chave + raws**:

| Arquivo | Função | Raw |
|---------|--------|-----|
| `routes/contratosFarmacia.ts` | CRUD contratos farmácia parceira | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/contratosFarmacia.ts) |
| `routes/parmavaultReconciliacao.ts` | Reconciliação receitas pagas vs roteadas | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/parmavaultReconciliacao.ts) |
| `routes/orcamentos.ts` | **NOVO Wave 10**: dispara assinatura orçamento farmacêutico | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/orcamentos.ts) |
| `routes/formulaBlend.ts` | Composição fórmulas magistrais | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/formulaBlend.ts) |
| `routes/painelNfe.ts` + `lib/nfe/` | Emissão NFe contraprestação | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/painelNfe.ts) |
| `lib/db/src/schema/farmaciasParceiras.ts` | Tabela `farmacias_parmavault` | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/lib/db/src/schema/farmaciasParceiras.ts) |

**Sujeira herdada (documentada Wave 10.5)**: `farmacias_parmavault` não
tem campos `representante_*` — usa env fallback
`FARMACIA_REPRESENTANTE_*_FALLBACK` por enquanto.

---

### 4.3 ⚖️ Jurídico & Compliance

**Função**: assinatura digital ICP-Brasil tripla (PARQ + TCLE + Orçamento)
+ auditoria forense + manifesto SHA-256.

**Estrutura `lib/assinatura/`**:
```
artifacts/api-server/src/lib/assinatura/
├── adapters.ts          # ZapsignAdapter (HMAC custom header) + Clicksign fallback
├── service.ts           # assinaturaService.enviar() — orquestra tudo
├── types.ts             # EnviarParams, Signatario, AuthMode, etc
└── use-cases/
    ├── enviarPARQ.ts            # F3.A — Família 4 (clínica + farmácia ICP)
    ├── enviarTCLE.ts            # F3.B — Família 1 (paciente + médico)
    └── enviarOrcamentoFarmaceutico.ts  # F3.C — Família 3 (paciente + farmácia)
```

**Arquivos-chave + raws**:

| Arquivo | Função | Raw |
|---------|--------|-----|
| `lib/assinatura/service.ts` | Orquestrador central | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/assinatura/service.ts) |
| `lib/assinatura/adapters.ts` | ZapsignAdapter promovido (Wave 10 F2) | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/assinatura/adapters.ts) |
| `lib/assinatura/types.ts` | Contratos TypeScript | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/assinatura/types.ts) |
| `lib/assinatura/use-cases/enviarPARQ.ts` | F3.A | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/assinatura/use-cases/enviarPARQ.ts) |
| `lib/assinatura/use-cases/enviarTCLE.ts` | F3.B | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/assinatura/use-cases/enviarTCLE.ts) |
| `lib/assinatura/use-cases/enviarOrcamentoFarmaceutico.ts` | F3.C (último fechado) | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/assinatura/use-cases/enviarOrcamentoFarmaceutico.ts) |
| `routes/assinaturas.ts` | API CRUD genérica | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/assinaturas.ts) |
| `routes/assinaturas-tcle.ts` | API TCLE específica | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/assinaturas-tcle.ts) |
| `routes/assinaturasWebhook.ts` | **F4 PENDENTE**: webhook ZapSign | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/assinaturasWebhook.ts) |
| `routes/parq.ts` | API PARQ (Wave 9) | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/parq.ts) |
| `routes/auditoriaCascata.ts` | Auditoria multi-camada | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/auditoriaCascata.ts) |
| `lib/auditoria/` | Helpers manifesto SHA-256 | [pasta](https://github.com/caio-padua/Integrative-Health-Engine/tree/feat/dominio-pawards/artifacts/api-server/src/lib/auditoria) |
| `lib/juridico/` | Templates jurídicos PARQ/TCLE | [pasta](https://github.com/caio-padua/Integrative-Health-Engine/tree/feat/dominio-pawards/artifacts/api-server/src/lib/juridico) |

**Migration central Wave 10**:
- `db/migrations/031_wave10_zapsign_auditoria.sql` — [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/db/migrations/031_wave10_zapsign_auditoria.sql)
  - Cria `assinatura_solicitacoes` (estado da solicitação)
  - Cria `auditoria_assinaturas` (manifesto SHA-256 + IP + geo + auth_method)
  - Adiciona colunas espelho em `assinatura_textos_institucionais`

---

### 4.4 💰 Financeiro & Comissão

**Função**: cobrança de pacientes, recebíveis de farmácias parceiras
(via PARQ — Wave 9), monetização modular.

**Arquivos-chave + raws**:

| Arquivo | Função | Raw |
|---------|--------|-----|
| `routes/financeiro.ts` | Recebíveis + a pagar | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/financeiro.ts) |
| `routes/cobrancasAdicionais.ts` | Cobranças avulsas | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/cobrancasAdicionais.ts) |
| `routes/comissao.ts` | Comissão Wave 9 (trigger 027) | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/comissao.ts) |
| `routes/payments.ts` | Gateway pagamento (Asaas pendente) | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/payments.ts) |
| `routes/monetizacaoPadcon.ts` | Monetização modular SaaS | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/monetizacaoPadcon.ts) |
| `payments/` | Adapters gateway | [pasta](https://github.com/caio-padua/Integrative-Health-Engine/tree/feat/dominio-pawards/artifacts/api-server/src/payments) |

**Secret pendente**: `ASAAS_API_KEY` (não solicitado ainda — só quando F4
estiver verde e for ativar billing real).

---

### 4.5 📊 Painéis & Operação

**Função**: dashboards CEO/médico/admin, relatórios, alertas, monitoramento.

**Arquivos-chave + raws**:

| Arquivo | Função | Raw |
|---------|--------|-----|
| `routes/dashboard.ts` | Dashboard agregado | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/dashboard.ts) |
| `routes/painelPawards.ts` | Painel Pawards CEO | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/painelPawards.ts) |
| `routes/adminAnalytics.ts` | Analytics admin | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/adminAnalytics.ts) |
| `routes/relatorioOperacionalDia.ts` | Relatório operacional D+0 | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/relatorioOperacionalDia.ts) |
| `routes/relatoriosPdf.ts` | PDFs (puppeteer) | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/relatoriosPdf.ts) |
| `routes/sla.ts` | SLA filas | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/sla.ts) |
| `routes/alertas.ts` | Alertas operacionais | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/alertas.ts) |

**Frontend** (artifacts/clinica-motor):

| Página | Raw |
|--------|-----|
| `pages/dashboard-global.tsx` | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/clinica-motor/src/pages/dashboard-global.tsx) |
| `pages/dashboard-local.tsx` | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/clinica-motor/src/pages/dashboard-local.tsx) |
| `pages/admin-parq.tsx` | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/clinica-motor/src/pages/admin-parq.tsx) |
| `pages/admin-parmavault-reconciliacao.tsx` | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/clinica-motor/src/pages/admin-parmavault-reconciliacao.tsx) |
| `pages/comissao.tsx` | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/clinica-motor/src/pages/comissao.tsx) |

---

### 4.6 🔌 Integrações & Infra

**Função**: ligação com mundo externo + persistência de artefatos.

**Arquivos-chave + raws**:

| Integração | Arquivo | Raw |
|------------|---------|-----|
| Google Calendar | `routes/googleCalendar.ts` | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/googleCalendar.ts) |
| Google Drive | `routes/googleDrive.ts` + `routes/drivePawards.ts` + `routes/backupDrive.ts` | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/googleDrive.ts) |
| Google Gmail | `routes/googleGmail.ts` + `routes/emailComunicacao.ts` | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/googleGmail.ts) |
| WhatsApp | `services/whatsappService.ts` + `services/whatsappTemplates.ts` + `routes/whatsapp.ts` | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/services/whatsappService.ts) |
| ZapSign (assinatura) | `lib/assinatura/adapters.ts` (Wave 10) | [raw](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/assinatura/adapters.ts) |
| Object Storage | bucket `assinaturas-pawards` (consumido por `service.ts` e webhook) | (chave: `assinaturas/${external_id}.pdf`) |
| Crypto / HMAC | `lib/crypto/` | [pasta](https://github.com/caio-padua/Integrative-Health-Engine/tree/feat/dominio-pawards/artifacts/api-server/src/lib/crypto) |

**Secrets**:
- ✅ presentes: `SESSION_SECRET`, `ZAPSIGN_API_TOKEN`, `WHATSAPP_TOKEN`,
  `DATABASE_URL`, `GOOGLE_*` (via integração Replit)
- ❌ pendentes: `ASAAS_API_KEY` (Asaas pagamento)

---

## 5. Wave 10 ZapSign — detalhada

### Por que existe?
Sem assinatura digital com defensibilidade jurídica tripla, **as 8.725
receitas roteadas no PARMAVAULT não viram caixa** — falta o documento
contratual que comprove que a farmácia consentiu prestação de serviço
PARQ (CFM 2.386 + CC 593-609 + STJ REsp 2.159.442).

**ZapSign** foi escolhido sobre Clicksign porque:
1. Custo R$ 0,50/disparo (vs R$ 2,80 Clicksign)
2. Suporte ICP-Brasil e-CNPJ qualificado nativo (essencial pra PARQ)
3. API REST simples + webhook HMAC sólido

### Fases

| Fase | O que entrega | Status | Arquivos novos |
|------|---------------|--------|----------------|
| F0 | Baseline invariantes + bucket Object Storage | ✅ | (smokes) |
| F1 | Migration 031 (2 tabelas + colunas espelho) | ✅ | [`031_wave10_zapsign_auditoria.sql`](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/db/migrations/031_wave10_zapsign_auditoria.sql) |
| F2 | ZapsignAdapter promoted (mock → produção) com HMAC custom header `x-pawards-secret` (timing-safe) | ✅ | [`adapters.ts`](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/assinatura/adapters.ts) |
| F3.A | `enviarPARQ.ts` — Família 4 (clínica e-CNPJ + farmácia e-CNPJ, signature_order_active) | ✅ | [`enviarPARQ.ts`](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/assinatura/use-cases/enviarPARQ.ts) |
| F3.B | `enviarTCLE.ts` — Família 1 (paciente assinaturaTela-tokenWhatsApp + médico certificadoDigital, paralelo) | ✅ | [`enviarTCLE.ts`](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/assinatura/use-cases/enviarTCLE.ts) |
| F3.C | `enviarOrcamentoFarmaceutico.ts` — Família 3 (Caminho 1 MVP, reusa template id=4 + signatariosExtras) | ✅ | [`enviarOrcamentoFarmaceutico.ts`](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/assinatura/use-cases/enviarOrcamentoFarmaceutico.ts) + [`routes/orcamentos.ts`](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/orcamentos.ts) |
| F4 | Webhook handler completo + manifesto auditoria | 🟡 PENDENTE | (vai mexer em [`assinaturasWebhook.ts`](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/assinaturasWebhook.ts) + [`service.ts`](https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/assinatura/service.ts)) |
| F5 | Frontend timeline + detalhe (2 telas) | 🟡 PENDENTE | (novas em `clinica-motor/src/pages/`) |
| F6 | Wrap-up: replit.md + tag `v031-zapsign-launch` | 🟡 PENDENTE | — |

### Correções pós code-review architect (F3.C FAIL → PASS)

3 críticos foram apontados pelo architect e corrigidos no mesmo commit:

| # | Problema | Fix |
|---|----------|-----|
| ① | `externalId` random → impossível reconciliar webhook 1:1 | `externalId: \`orc-${receitaId}-${Date.now()}\`` regex em `/^orc-(\d+)-\d+$/` |
| ② | `metadataExtra` setado em UPDATE pós-INSERT (race possível) | Estendi `EnviarParams` em `service.ts` aceitando `metadataExtra`, mergeada NO INSERT inicial (atomicidade) |
| ③ | Risco de fallback Clicksign sem capability ICP qualificada | `forcarProvedor: "zapsign"` explícito |

Todos retro-compatíveis: F3.A e F3.B intactos.

### Smoke pós-fix (verde)
- `POST /orcamentos/:id/disparar` → 401 sem auth (rota montada ✅)
- `GET /orcamentos/:id/status` → 401 sem auth ✅
- `POST /parq/emitir` → 401 (intacto, F3.A não regrediu) ✅
- `GET /api/v1/healthz` → 200 ✅
- 8.725 receitas + R$ 2.735.336,10 + 3 triggers Wave 9 + 2 tabelas Wave 10 + template id=4 → preservados ✅

---

## 6. Tabela de Raws Diretos

**Cole no chat do Dr. Claude**: copia o link, ele baixa o conteúdo via fetch.

### Núcleo Wave 10 (priorize estes)
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/db/migrations/031_wave10_zapsign_auditoria.sql
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/assinatura/service.ts
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/assinatura/adapters.ts
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/assinatura/types.ts
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/assinatura/use-cases/enviarPARQ.ts
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/assinatura/use-cases/enviarTCLE.ts
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/assinatura/use-cases/enviarOrcamentoFarmaceutico.ts
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/orcamentos.ts
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/assinaturasWebhook.ts
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/parq.ts
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/prescricoes.ts
```

### Docs orquestração (esta pasta)
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/docs/dr-claude/README.md
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/docs/dr-claude/00_BRIEFING_PAINEL_CEO_PARA_DR_CLAUDE.md
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/docs/dr-claude/01_DECISOES_TOMADAS_WAVE10_F3C.md
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/docs/dr-claude/02_DECISOES_PENDENTES_PARA_DR_CLAUDE.md
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/docs/dr-claude/03_ARQUITETURA_GERAL_DO_CODIGO.md
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/docs/dr-claude/raws/04_session_plan_wave10_atual.md
```

### Memória persistente do agente
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/replit.md
```

---

## 7. Convenções e Regras Ferro

### Regra Ferro 1 — Migrations
- **NUNCA `pnpm db:push`**
- **SEMPRE** `psql IF NOT EXISTS` aditivo
- Migrations vivem em `artifacts/api-server/src/db/migrations/`
- Numeradas (027, 030, 031…) e nomeadas semanticamente

### Regra Ferro 2 — Triggers Wave 9 (027/030)
- `trg_calc_comissao`, `trg_parq_acordo_vigente`, `trg_audit_cascade_v9`
- **INTOCÁVEIS** — toda Wave nova preserva integralmente

### Regra Ferro 3 — PADCON Princípio 9
- Validação Caio explícita ANTES de qualquer mudança visual ou de design
  já validado
- Dr. Replit nunca decide design sozinho

### Regra Ferro 4 — Naming
- Sem abreviações (`auditoria_cascata`, não `aud_cascata`)
- Campo de perfil de usuário: **sempre `perfil`, nunca `role`**
- Booleanos com prefixos semânticos: `pode_*`, `nunca_*`, `requer_*`
- Renomeação de tabela/campo: comentário com nome antigo + rotas existentes seguem funcionando

### Regra Ferro 5 — Logging server
- **Nunca `console.log` em código de servidor**
- Use `req.log` em handlers, singleton `logger` no resto
- Padrão estruturado JSON

### Regra Ferro 6 — Workspace
- Cada artifact declara suas próprias deps
- Sharing só via `lib/*`
- Catálogo de versões em `pnpm-workspace.yaml` (`catalog:`)

### Regra Ferro 7 — Codegen API
- Fonte da verdade: `lib/api-spec/` (OpenAPI 3)
- Codegen: `pnpm --filter @workspace/api-spec run codegen`
- Server valida com Zod, client usa hooks gerados

---

## 📡 Como o Dr. Claude deve usar este doc

1. **Primeira leitura do dia**: README + `00_BRIEFING` (1-2 min) → saber estado atual
2. **Pra orquestrar próximo passo**: `02_DECISOES_PENDENTES` + (se necessário) seções 3 e 5 deste arquivo
3. **Pra revisar código**: copiar URL raw do arquivo específico desta seção 6 e pedir ao Dr. Claude pra buscar
4. **Pra entender por que algo é assim**: `01_DECISOES_TOMADAS` (append-only, com data + lente de persona)
5. **Pra deep-dive técnico de Wave atual**: `raws/04_session_plan_wave10_atual.md`

---

**Última atualização**: 2026-05-01 — Wave 10 F3.C fechado, F4 PENDENTE
**Próxima atualização prevista**: ao fechar Wave 10 F4 (webhook completo)
