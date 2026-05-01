# Microscópio v2 — Wave 10 ZapSign (Assinatura Digital Nativa WhatsApp + ICP-Brasil)
## Pawards MEDCORE · Migration 031 · 26/abr/2026

> Relatório técnico-jurídico completo da Wave 10 ZapSign pra auditoria do
> Dr. Claude **antes** da execução. Zero `db:push`, zero `ALTER COLUMN id`,
> tudo aditivo via `psql IF NOT EXISTS`. Trigger 027 + Migration 030 PARQ
> intocados. Adapter `ZapsignAdapter` já existente é **promovido de mock pra
> produção**, não recriado.

---

## 0.1 Ordem aprovada Dr. Claude / Caio (26/abr/2026)

> Substituição **DocuSign → ZapSign + ICP-Brasil** confirmada. Razão dupla:
> DocuSign tem UX em inglês (trava paciente idoso no 1º clique) + cobertura
> dupla num único provedor (paciente: toque + token WhatsApp avançada Lei
> 14.063 art. 4º II; médico: ICP-Brasil A1/A3 qualificada art. 4º III).

**Sequência de implementação F3 (use-cases) na ordem aprovada:**

| Fase | Família | Documento | Lado clínica | Lado contraparte | Justificativa da prioridade |
|---|---|---|---|---|---|
| **F3.A** | **4** | Acordo PARQ | ICP-Brasil e-CNPJ clínica | ICP-Brasil e-CNPJ farmácia | Fecha o ciclo Wave 9 PARQ; peça de blindagem máxima CFM 2.386/2024 |
| **F3.B** | **1** | TCLE | ICP-Brasil médico | ZapSign toque+WhatsApp paciente | 80% das exposições jurídicas paciente↔clínica passam por aqui |
| **F3.C** | **3** | Orçamento Farmacêutico | ICP-Brasil farmácia | ZapSign toque+WhatsApp paciente | Fecha triângulo PARQ + LGPD art. 11 §4º + protege contra chargeback |

**Backlog confirmado** (não entram na Wave 10, ficam pra Waves 10.x posteriores):
- Família 2 — Termos por evento (NAD+ EV, IV, blends novos)
- Família 5 — Colaboradores (NDA, LGPD, Código Conduta)
- Família 6 — Auditoria interna (atas visita PARQ, planos Kaizen)
- Família 7 — Comercial/adesão (contrato programa, gamificação Loteria Federal)

**Última prioridade absoluta** (round dedicado pós-Wave 10):
- Família 8 — RAS jurídicos (RAS-evolutivo, RAS-distribuir, RAS-revolucionário, contratos formais)

---

## 0.2 Status execução — Round 4 (26/abr/2026 22h25 BRT)

| Fase | Status | Notas |
|---|---|---|
| F0 invariantes baseline | 🟢 GREEN | 8.725 receitas + R$ 2.735.336,10 espelho + trigger 027 vivo |
| F1 Migration 031 SQL | 🟢 GREEN | 7 invariantes (ENUM zapsign_auth_method 6 valores, auditoria_assinaturas + assinatura_oneclick_aceites criadas, zapsign_external_id + zapsign_envelope_clinica/farmacia, 13 índices) |
| F2 ZapsignAdapter promoted | 🟢 GREEN | Sandbox switch automático NODE_ENV, ENV rename `ZAPSIGN_API_TOKEN` (compat fallback), `mapPapelToAuthMode()` ICP-CPF (médico) + ICP-CNPJ (clínica/farmácia) + tokenWhatsApp (paciente), `montarSigners()` E.164 BR + respeita flag `enviarWhatsappAutomatico` (custo R$ 0,50/disparo), `signature_order_active` configurável, `external_id` propagado, webhook `validateWebhookSignature()` virtualizado (default HMAC pra Clicksign / override `timingSafeEqual` literal pra ZapSign no header `x-pawards-secret`), produção rejeita webhook sem secret |
| F3.A enviarPARQ.ts (Família 4) | 🟢 GREEN | `lib/parq/pdfPARQ.ts` 4 páginas (capa navy/gold + considerandos CFM 2.386 + 10 cláusulas + assinaturas+QR), `lib/assinatura/use-cases/enviarPARQ.ts` orquestra (carrega acordo + unidade + farmácia, gera PDF, calcula sha256 binário real, atualiza `parq_acordos.sha256_hash`, dispara `enviarBilateralIcp`, persiste `zapsign_envelope_*`), idempotente (early return se já enviado), early-fail validação ICP (CPF 11 dígitos, email/telefone, nome ≥3), URL verificação usa `numero_serie` estável (não hash), hook em `POST /parq/emitir` graceful (acordo persiste se ZapSign indisponível), template institucional `parq_acordo` cadastrado id=7 |
| F3.B enviarTCLE.ts (Família 1) | 🟡 PENDING | Próximo round |
| F3.C enviarOrcamentoFarmaceutico.ts (Família 3) | 🟡 PENDING | |
| F4 webhook handler + manifesto auditoria | 🟡 PENDING | Código pode ficar pronto antes do `ZAPSIGN_WEBHOOK_SECRET` real |
| F5 frontend timeline + detalhe | 🟡 PENDING | |
| F6 wrap-up + replit.md + tag v031 | 🟡 PENDING | |

**Code review architect** (round 4): 4 bugs P0 corrigidos no mesmo round —
(1) URL QR usava hash provisório sobrescrito → trocada para `numero_serie` estável;
(2) `external_id` não era propagado em `enviar()` padrão → agora gerado antes do `createDocumentEnvelope()` e enviado ao adapter;
(3) `enviarWhatsappAutomatico` flag ignorada pelo adapter → `montarSigners()` agora respeita explicitamente quando `false`;
(4) signatário ICP-CNPJ podia chegar sem CPF/canal → early-fail descritivo antes de gerar PDF.
+ 1 bug P1 segurança: webhook aceitava como válido sem secret configurado → rejeita em `NODE_ENV=production`.

**Smoke 401**: `POST /parq/emitir` sem auth = HTTP 401 ✅

**Build TypeScript**: api-server build verde 386ms, server up porta 8080, todos workers ativos (`motorPlanos`, `lembretePrescricao`, `cobrancaMensal`, `notifAssinatura`, `parqStatus`).

**Secrets pendentes** (Caio em paralelo): `ZAPSIGN_API_TOKEN` + `ZAPSIGN_WEBHOOK_SECRET` (`openssl rand -hex 32`). Sem eles o adapter cai automaticamente em modo MOCK pra dev (envelope `MOCK-ZAPSIGN-…`). Rota B Caio confirmada: codificação F2+F3.A em paralelo à criação da conta sandbox ZapSign.

---

## 0. Sumário executivo

| Camada | Antes (Wave 9) | Depois (Wave 10) | Status legal |
|---|---|---|---|
| Provedor | `ZapsignAdapter` em modo MOCK (envelope `MOCK-ZAPSIGN-…`) | ZapSign produção via `ZAPSIGN_API_TOKEN`, sandbox automático em `NODE_ENV!=='production'` | Lei 14.063/2020 ✅ |
| Distribuição | Email + Drive | **WhatsApp nativo R$ 0,50/disparo** (`send_automatic_whatsapp:true`) + cópia assinada (`send_automatic_whatsapp_signed_file:true`) | UX 5/5 idoso ✅ |
| Auth modes | só `assinatura_simples` implícita | 6 modalidades ZapSign: `assinaturaTela`, `assinaturaTela-tokenWhatsApp`, `assinaturaTela-tokenEmail`, `tokenWhatsapp`, `certificadoDigital` (ICP A1/A3), `biometria-facial` | Lei 14.063 art. 4º + STJ REsp 2.159.442 ✅ |
| Webhook | HMAC SHA256 padrão (`x-hub-signature-256`) | **Header customizado `x-pawards-secret`** + `timingSafeEqual` (ZapSign não tem HMAC nativo, define-se header secret) | OWASP A02:2021 ✅ |
| Trilha jurídica | `assinatura_webhook_eventos` (payload bruto) | **`auditoria_assinaturas`** com `signature_id, document_hash_sha256, signer_cpf, signer_ip, signer_geo, user_agent, auth_method, auth_evidence_json, timestamp_utc, icp_brasil_serial, validation_url` (manifesto judicial mínimo) | CFM 1.821/2007 ret. 20 anos ✅ |
| Documentos plugados | nenhum (só infra base) | **4 use-cases**: `enviarTCLE`, `enviarPARQ`, `enviarOrcamentoFarmaceutico`, `enviarTermoUsoOneClick` | Lei 14.063 art. 5º + LGPD art. 11 ✅ |
| Retenção | sem política | Object Storage com `Metadata: { signed-at, doc-token }` + retention policy 20 anos | CFM 1.821/2007 ✅ |

**Régua dos 3 estados (§7 do MANIFESTO):**
- 🟢 **funcional pleno** (após Wave 10): F1 (migration 031 + auditoria_assinaturas), F2 (ZapsignAdapter promoted real), F3 (4 use-cases plugados nos PDFs existentes), F4 (webhook custom-header), F5 (frontend timeline + status), F6 (worker reconcile + replit.md).
- 🟡 **deferido**: certificado A1 hospedado no servidor (`ICP_BRASIL_A1_PFX_PATH`) — médico assina pelo painel ZapSign Web PKI até decisão Caio.
- 🟠 **anastomose futura**: Object Storage retention policy 20 anos é configuração de infra (App Storage tem TTL implícito, política formal vai pra documento de compliance).

---

## 1. Base legal (precedentes citados no PDF ZapSign de 510 linhas)

### 1.1 Lei 14.063/2020 — três níveis de assinatura
**Art. 4º** define níveis: simples, avançada, qualificada (ICP-Brasil).
**Art. 5º, §1º** exige **qualificada apenas** para receituário de medicamento **controlado** e atestado médico. Para **TCLE, orçamento farmacêutico, contrato PARQ, termo de uso** → assinatura **avançada** basta (toque na tela + token WhatsApp + IP + geo + hash SHA-256).

**Como Wave 10 endereça:**
- Paciente assina TCLE/PARQ/orçamento via `auth_mode: 'assinaturaTela-tokenWhatsApp'` → toque + OTP enviado pro WhatsApp do próprio celular = assinatura **avançada** Lei 14.063 art. 4º, II.
- Médico assina via `auth_mode: 'certificadoDigital'` → ICP-Brasil A1/A3 = assinatura **qualificada** Lei 14.063 art. 4º, III.
- Para **receituário controlado** (RECMED já existente no sistema), permanece exigência ICP do médico — Wave 10 **não altera** esse fluxo, apenas adiciona modalidade de signatário.

### 1.2 STJ REsp 2.159.442/2025 (Min. Nancy Andrighi, fev/2025)
> "É lícita assinatura eletrônica fora da ICP-Brasil. A avançada equivale à
> firma reconhecida por semelhança; a qualificada à firma reconhecida por
> autenticidade."

**Como Wave 10 endereça:** assinatura do paciente idoso por toque + token WhatsApp tem **validade jurídica equivalente a firma reconhecida por semelhança**, desde que sistema persista hash SHA-256 + IP + geo + timestamp + evidência do token (todos campos previstos em `auditoria_assinaturas` — §3.2 abaixo).

### 1.3 CFM 2.299/2021 art. 4º — ICP-Brasil obrigatório do lado do médico
Toda documento médico eletrônico exige assinatura ICP-Brasil do prescritor/responsável (e-CNPJ/e-CPF A1 ou A3).

**Como Wave 10 endereça:** todo signatário com `papel: 'MEDICO'` é forçado pelo `service.ts` a usar `auth_mode: 'certificadoDigital'` (ZapSign aceita certificado emitido por AC SERPRO ou pela própria AC ZapSign — §2.2 abaixo).

### 1.4 LGPD art. 11, II, "f" + §4º
Tratamento de dado de saúde sem consentimento explícito é permitido quando "realizado por profissionais de saúde". MAS o §4º exige **consentimento específico** quando há compartilhamento com farmácia além do estritamente necessário → torna **TCLE + PARQ obrigatórios** na prática.

**Como Wave 10 endereça:** `enviarTCLE` é gatilho automático no momento da emissão da primeira receita; `enviarPARQ` é gatilho no `POST /parq/emitir` (Wave 9 já existe, agora dispara assinatura ZapSign após criar acordo).

### 1.5 CFM 1.821/2007 — retenção 20 anos
Documentos médicos eletrônicos devem ser retidos por 20 anos (prontuário) ou 5 anos após óbito (o que for maior).

**Como Wave 10 endereça:**
- PDF assinado é baixado da `signed_file` URL (válida 60min) **dentro** do webhook handler.
- Persistido no App Storage com metadata `signed-at` + `doc-token`.
- `auditoria_assinaturas.pdf_storage_key` aponta pro caminho — busca por hash recupera artefato.
- Retention policy formal: documento de compliance, fora do escopo Wave 10.

---

## 2. Estado atual do código (o que já existe e o que muda)

### 2.1 Arquitetura Adapter — 100 % preservada

```
src/lib/assinatura/
├── types.ts        (85 L) — SignatureProviderAdapter interface ✅ INTOCADO
├── adapters.ts    (231 L) — ClicksignAdapter + ZapsignAdapter ⚠️ ZapsignAdapter promovido
└── service.ts     (325 L) — orquestrador ✅ recebe 1 método novo (registrarManifestoAuditoria)

src/routes/
├── assinaturas.ts        (120 L) — POST /enviar, GET /status ✅ INTOCADO
├── assinaturaCRUD.ts     (224 L) — CRUD templates/testemunhas ✅ INTOCADO
└── assinaturasWebhook.ts  (26 L) — POST /webhooks/assinatura/{provedor} ⚠️ +1 rota

Tabelas (pre-Wave 10):
├── assinatura_solicitacoes        (envelope_id, status, hash, signatarios JSONB)
├── assinatura_signatarios          (1:N solicitação)
├── assinatura_templates            (HTML hidratado)
├── assinatura_testemunhas          (par fixo / aleatório)
├── assinatura_pares_testemunhas
├── assinatura_textos_institucionais
├── assinatura_toggles_admin        (singleton — provedor_principal_codigo, failover)
├── assinatura_drive_estrutura
├── assinatura_notificacoes
└── assinatura_webhook_eventos      (payload bruto recebido)
```

**Decisão arquitetural:** NÃO criar `lib/zapsign/`. Adapter existente é o único ponto de contato com a API ZapSign. Use-cases novos (`enviarTCLE`, `enviarPARQ`, etc) chamam `assinaturaService.enviar({...})` — service escolhe adapter via `assinatura_toggles_admin.provedor_principal_codigo`. Pra forçar ZapSign, basta `UPDATE assinatura_toggles_admin SET provedor_principal_codigo='zapsign'`.

### 2.2 O que muda no `ZapsignAdapter` (promoção mock → produção)

Diff conceitual contra estado atual (linhas 172–219 de `adapters.ts`):

| Ponto | Antes (Wave 9) | Depois (Wave 10) |
|---|---|---|
| Token env | `ZAPSIGN_TOKEN` | **`ZAPSIGN_API_TOKEN`** (alinhado ao PDF) |
| Base URL | hardcoded `api.zapsign.com.br` | **switch automático**: `production` → `ZAPSIGN_BASE_URL`, dev → `ZAPSIGN_SANDBOX_URL` |
| `auth_mode` por signatário | não envia (default ZapSign = simples) | **mapeia papel → auth_mode**: PACIENTE → `assinaturaTela-tokenWhatsApp`; MEDICO → `certificadoDigital`; TESTEMUNHA → `assinaturaTela-tokenEmail` |
| WhatsApp distribuição | só email | `send_automatic_whatsapp: true` quando `phone_number` presente; `send_automatic_whatsapp_signed_file: true` pra entregar cópia assinada |
| Webhook validação | HMAC SHA256 (`x-hub-signature-256`) | **header custom `x-pawards-secret`** com `timingSafeEqual` contra `ZAPSIGN_WEBHOOK_SECRET` (ZapSign não emite HMAC, doc oficial confirma) |
| Brand name | não enviado | `brand_name: process.env.ZAPSIGN_BRAND_NAME || 'PAWARDS MEDCORE'` |
| `external_id` | não enviado | mapeado pro `solicitacao_id` interno → permite reconciliar webhook → DB sem ambiguidade |

### 2.3 O que muda no `service.ts`

Apenas **1 método novo** (`registrarManifestoAuditoria`) chamado dentro de `processarWebhook` quando evento é `doc_signed`:

```typescript
private async registrarManifestoAuditoria(opts: {
  solicitacaoId: number;
  envelopeId: string;
  signersFromZapSign: Array<{ token: string; name: string; cpf: string;
    sign_at: string; ip: string; geo_location: { lat: number; long: number; };
    user_agent: string; auth_mode: string; signature_image_url: string;
    icp_brasil_serial?: string; }>;
  pdfHashSha256: string;
}): Promise<void> {
  for (const signer of opts.signersFromZapSign) {
    await db.execute(sql`
      INSERT INTO auditoria_assinaturas (
        signature_id, solicitacao_id, envelope_id,
        document_hash_sha256, signer_cpf, signer_name,
        signer_ip, signer_geo, user_agent,
        auth_method, auth_evidence_json,
        timestamp_utc, icp_brasil_serial, validation_url
      ) VALUES (
        ${signer.token}, ${opts.solicitacaoId}, ${opts.envelopeId},
        ${opts.pdfHashSha256}, ${signer.cpf}, ${signer.name},
        ${signer.ip}::inet, ${JSON.stringify(signer.geo_location)}::jsonb,
        ${signer.user_agent},
        ${signer.auth_mode}, ${JSON.stringify(signer)}::jsonb,
        ${signer.sign_at}::timestamptz, ${signer.icp_brasil_serial || null},
        ${`https://app.zapsign.com.br/verificar/${opts.envelopeId}`}
      ) ON CONFLICT (signature_id) DO NOTHING;
    `);
  }
}
```

---

## 3. Migration 031 — DDL (preview, será aplicada em F1)

> Aplicada via `psql "$DATABASE_URL" < migrations/031_wave10_zapsign_auditoria.sql`.
> **REGRA FERRO:** todos `CREATE … IF NOT EXISTS`. Zero `DROP`. Zero `ALTER`.
> Tabelas Wave 9 PARQ + trigger 027 intocados.

### 3.1 ENUM novo

```sql
-- Modalidades de autenticação ZapSign (Lei 14.063/2020 níveis 1-3)
DO $$ BEGIN
  CREATE TYPE zapsign_auth_method AS ENUM (
    'assinaturaTela',                    -- toque + nome digitado (simples)
    'assinaturaTela-tokenWhatsApp',      -- toque + OTP WhatsApp (avançada) — paciente padrão
    'assinaturaTela-tokenEmail',          -- toque + OTP email (avançada) — testemunha padrão
    'tokenWhatsapp',                     -- só OTP WhatsApp (sem desenho)
    'certificadoDigital',                -- ICP-Brasil A1/A3 (qualificada) — médico padrão
    'biometria-facial'                   -- selfie + liveness (avançada+)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

### 3.2 Tabela `auditoria_assinaturas` — manifesto judicial

```sql
CREATE TABLE IF NOT EXISTS auditoria_assinaturas (
  id                      BIGSERIAL PRIMARY KEY,
  signature_id            TEXT NOT NULL UNIQUE,             -- token do signatário no ZapSign
  solicitacao_id          INTEGER REFERENCES assinatura_solicitacoes(id),
  envelope_id             TEXT NOT NULL,                    -- doc_token ZapSign
  external_id             TEXT,                             -- nosso ID interno (ex.: 'tcle-12345')
  document_hash_sha256    TEXT NOT NULL,                    -- hash do PDF original (antes de assinar)
  document_hash_assinado  TEXT,                             -- hash do PDF assinado (preenchido no doc_signed)
  signer_cpf              TEXT NOT NULL,
  signer_name             TEXT NOT NULL,
  signer_papel            TEXT NOT NULL,                    -- PACIENTE | MEDICO | CLINICA | TESTEMUNHA | RESPONSAVEL_LEGAL
  signer_ip               INET NOT NULL,
  signer_geo              JSONB,                            -- { lat, long, accuracy }
  user_agent              TEXT NOT NULL,
  auth_method             zapsign_auth_method NOT NULL,
  auth_evidence_json      JSONB NOT NULL,                   -- payload completo do signer no webhook (prova)
  timestamp_utc           TIMESTAMPTZ NOT NULL,
  icp_brasil_serial       TEXT,                             -- serial do certificado A1/A3 (se qualificada)
  icp_brasil_ac           TEXT,                             -- AC emissora (SERPRO, ZapSign, Caixa, etc)
  validation_url          TEXT NOT NULL,                    -- URL pública de verificação ZapSign
  pdf_storage_key         TEXT,                             -- chave no Object Storage onde PDF assinado mora
  retencao_ate            DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '20 years'),
  criado_em               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auditoria_assin_envelope_idx ON auditoria_assinaturas(envelope_id);
CREATE INDEX IF NOT EXISTS auditoria_assin_cpf_idx       ON auditoria_assinaturas(signer_cpf);
CREATE INDEX IF NOT EXISTS auditoria_assin_solic_idx     ON auditoria_assinaturas(solicitacao_id);
CREATE INDEX IF NOT EXISTS auditoria_assin_hash_idx      ON auditoria_assinaturas(document_hash_sha256);
CREATE INDEX IF NOT EXISTS auditoria_assin_retencao_idx  ON auditoria_assinaturas(retencao_ate);

COMMENT ON TABLE auditoria_assinaturas IS
  'Manifesto judicial mínimo (Lei 14.063/2020 + STJ REsp 2.159.442/2025). Persiste local mesmo se conta ZapSign for cancelada — prova autônoma.';
COMMENT ON COLUMN auditoria_assinaturas.auth_evidence_json IS
  'Payload completo do signatário no webhook ZapSign — prova de evidência criptográfica (token enviado, hora click, hora finalização).';
```

### 3.3 Tabela `assinatura_oneclick_aceites` — termo de uso (sem PDF)

```sql
CREATE TABLE IF NOT EXISTS assinatura_oneclick_aceites (
  id                BIGSERIAL PRIMARY KEY,
  zapsign_token     TEXT NOT NULL UNIQUE,                 -- token OneClick devolvido pela ZapSign
  paciente_id       INTEGER REFERENCES pacientes(id),
  termo_codigo      TEXT NOT NULL,                        -- 'termo_uso_v1', 'politica_privacidade_v2', etc
  termo_versao      TEXT NOT NULL,                        -- versão do texto aceito
  termo_hash_sha256 TEXT NOT NULL,                        -- hash do texto exato
  signer_ip         INET NOT NULL,
  signer_geo        JSONB,
  user_agent        TEXT NOT NULL,
  aceito_em         TIMESTAMPTZ NOT NULL,
  validation_url    TEXT NOT NULL,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS oneclick_paciente_idx ON assinatura_oneclick_aceites(paciente_id);
CREATE INDEX IF NOT EXISTS oneclick_termo_idx    ON assinatura_oneclick_aceites(termo_codigo, termo_versao);

COMMENT ON TABLE assinatura_oneclick_aceites IS
  'Aceites de termo de uso via OneClick (sem PDF). R$ 0,50/aceite, equivalente juridicamente a clique-aceite (CPC art. 374, II).';
```

### 3.4 Coluna `assinatura_solicitacoes.zapsign_external_id`

```sql
-- Permite reconciliação webhook → solicitação por ID estável (não envelope_id)
ALTER TABLE assinatura_solicitacoes
  ADD COLUMN IF NOT EXISTS zapsign_external_id TEXT;
CREATE INDEX IF NOT EXISTS assin_solic_external_idx
  ON assinatura_solicitacoes(zapsign_external_id);
```

### 3.5 Invariantes pós-migration

```sql
-- (1) ENUM zapsign_auth_method com 6 valores
SELECT count(*) FROM pg_enum
  WHERE enumtypid = 'zapsign_auth_method'::regtype;       -- esperado: 6

-- (2) auditoria_assinaturas com 0 linhas (tabela nova)
SELECT count(*) FROM auditoria_assinaturas;               -- esperado: 0

-- (3) assinatura_oneclick_aceites com 0 linhas
SELECT count(*) FROM assinatura_oneclick_aceites;          -- esperado: 0

-- (4) coluna zapsign_external_id existe e nullable
SELECT column_name, is_nullable FROM information_schema.columns
  WHERE table_name='assinatura_solicitacoes' AND column_name='zapsign_external_id';

-- (5) Wave 9 PARQ intocada
SELECT count(*) FROM parq_acordos;                         -- esperado: invariante Wave 9
SELECT count(*) FROM parmavault_receitas;                  -- esperado: 8.725
SELECT to_char(sum(comissao_estimada), 'FM999G999G990D00')
  FROM parmavault_receitas;                                -- esperado: 2.735.336,10

-- (6) Trigger 027 ainda ativo
SELECT count(*) FROM pg_trigger WHERE tgname='trg_calc_comissao';  -- esperado: 1
```

---

## 4. Faseamento F0 → F6

### F0 — Invariantes baseline + Object Storage configurado
- **Blocked By**: []
- **Entregáveis**:
  - Confirma 8.725 receitas + R$ 2.735.336,10 + Wave 9 PARQ intacta (SELECTs §3.5).
  - Configura App Storage bucket `assinaturas-pawards` (via blueprint object-storage do projeto).
  - Verifica `ZAPSIGN_API_TOKEN` setado (smoke `GET /api/v1/account/` no sandbox).
- **Critério GREEN**: 6 invariantes do §3.5 passando + bucket criado + curl sandbox 200.

### F1 — Migration 031 SQL aplicada
- **Blocked By**: [F0]
- **Entregáveis**:
  - `artifacts/api-server/src/db/migrations/031_wave10_zapsign_auditoria.sql` (DDL §3 inteiro).
  - Aplicação via `psql` direto (REGRA FERRO: zero db:push).
  - Drizzle schema `artifacts/api-server/src/lib/assinatura/schema_zapsign.ts` espelho das 2 tabelas novas.
- **Critério GREEN**: 6 invariantes §3.5 + Wave 9 invariantes preservadas.

### F2 — `ZapsignAdapter` promoted (mock → produção)
- **Blocked By**: [F1]
- **Entregáveis**: refactor `lib/assinatura/adapters.ts` (target ~280L, +50L vs atual):
  - Renomeia env `ZAPSIGN_TOKEN` → `ZAPSIGN_API_TOKEN` (mantém fallback temporário pro antigo por 1 release).
  - `baseUrl` switch automático sandbox/produção.
  - `mapearAuthMode(papel: PapelSignatario): AuthMode` — função pura.
  - `createReal` envia `auth_mode`, `send_automatic_whatsapp`, `send_automatic_whatsapp_signed_file`, `external_id`, `brand_name`, `qualification`.
  - `handleWebhook` override pra header `x-pawards-secret` + `timingSafeEqual`.
  - Helper `verificarAssinaturaCertificado(serial: string)` — chama `GET /docs/{token}/` e valida `icp_brasil_serial` retornado.
- **Critério GREEN**:
  - Smoke `POST /api/v1/docs/` no sandbox ZapSign retorna `{token, signers[]}` válido.
  - Webhook teste com header válido → 200; sem header → 401; header errado → 401.
  - Lint/TypeScript sem erros.

### F3 — Use-cases plugados nos PDFs existentes (ordem aprovada)
- **Blocked By**: [F2]
- **Entregáveis**: criar `artifacts/api-server/src/lib/assinatura/use-cases/`:

  **F3.A — `enviarPARQ.ts` (Família 4 — PRIMEIRA)**
  - Chamado em `POST /parq/emitir` (Wave 9 já existe — adiciona `await enviarPARQ(...)`).
  - Signatários: clínica (ICP e-CNPJ) + farmácia (ICP e-CNPJ), `signature_order_active: true` (clínica primeiro).
  - Documento base: `lib/parq/pdf.ts` (já entregue Wave 9).
  - Volume: ~5-10 acordos/clínica, valor por acordo R$ milhares — custo R$ 0,50/disparo é irrisório.

  **F3.B — `enviarTCLE.ts` (Família 1 — SEGUNDA)**
  - Chamado no momento da 1ª receita emitida pro paciente (gancho em `prescricoes.ts`).
  - Signatários: paciente (`assinaturaTela-tokenWhatsApp`) + médico (`certificadoDigital`), paralelo.
  - Documento base: gerador `lib/juridico/tclePdf.ts` (criar se não existir; reaproveitar template `assinatura_textos_institucionais` `codigo='tcle_v1'`).
  - Volume: 1 por paciente novo, alto throughput — gargalo de defesa em qualquer litígio.

  **F3.C — `enviarOrcamentoFarmaceutico.ts` (Família 3 — TERCEIRA)**
  - Chamado quando farmácia gera orçamento (gancho em `roteamentoFarmacia.ts`).
  - Signatários: paciente (`assinaturaTela-tokenWhatsApp`) + farmácia (`certificadoDigital`), paralelo.
  - Documento base: `lib/farmaceutica/orcamentoPdf.ts` (Wave 5).
  - Volume: 1 por fórmula manipulada — fecha triângulo PARQ + LGPD art. 11 §4º.

  **DEFERIDO (não entra Wave 10):**
  - `enviarTermoUsoOneClick.ts` — Família 7 backlog
  - Demais use-cases de famílias 2, 5, 6 — backlog confirmado
- Cada use-case:
  1. Carrega PDF base64 do gerador respectivo (`lib/parq/pdf.ts` etc — já existem).
  2. Calcula `hash_original = sha256(pdfBuffer)`.
  3. Insere `assinatura_solicitacoes` com `provedor_codigo='zapsign'`, `zapsign_external_id` único.
  4. Chama `assinaturaService.enviar(...)` → adapter.createReal → recebe `envelopeId` + `signers[].sign_url`.
  5. Persiste `envelope_id` e atualiza `status='ENVIADO'`.
- **Critério GREEN**:
  - 4 documentos disparados em sandbox; cada um chega no WhatsApp do CPF de teste do Caio com link "Assinar".
  - `assinatura_solicitacoes` registra 4 linhas com `provedor_codigo='zapsign'` e `status='ENVIADO'`.

### F4 — Webhook handler completo + manifesto auditoria
- **Blocked By**: [F3]
- **Entregáveis**:
  - `assinaturasWebhook.ts` (+1 método; promove handler ZapSign pra full).
  - `service.ts` ganha `processarEventoZapSign(evento)`:
    1. `event_type === 'doc_signed'` → baixa PDF da `signed_file`, calcula `hash_assinado`, salva no Object Storage com key `assinaturas/${external_id}.pdf`, chama `registrarManifestoAuditoria` (§2.3).
    2. `event_type === 'doc_refused'` → `UPDATE assinatura_solicitacoes SET status='REJEITADO'`.
    3. `event_type === 'doc_removed'` → `UPDATE assinatura_solicitacoes SET status='EXPIRADO'`.
  - Idempotência: `INSERT … ON CONFLICT (signature_id) DO NOTHING` (sem reentrada se ZapSign reenvia).
- **Critério GREEN**:
  - Assinar documento sandbox dispara webhook → 200 → 1 linha em `auditoria_assinaturas` com hash + IP + geo + auth_method.
  - PDF assinado existe em `assinaturas-pawards/assinaturas/{external_id}.pdf`.
  - Reenvio do mesmo webhook (curl manual) → 200 + 0 linhas extras (idempotente).

### F5 — Frontend: 2 telas mínimas
- **Blocked By**: [F4]
- **Entregáveis** em `artifacts/clinica-motor`:
  - `/assinaturas/timeline` — tabela das últimas 50 solicitações (template, signatário, status, hora, link verificação ZapSign).
  - `/assinaturas/[id]` — detalhe: signatários × status × auth_method × IP × geo no mapa Leaflet (já está nas dependencies).
  - Banner Painel CEO: "Assinaturas hoje: X enviadas | Y assinadas | Z rejeitadas".
  - Botão "Reenviar lembrete WhatsApp" (chama `POST /api/v1/docs/{token}/resend/`).
- **Critério GREEN**: 2 telas renderizam; click em "verificar" abre URL ZapSign correta.

### F6 — Wrap-up
- **Blocked By**: [F1, F2, F3, F4, F5]
- **Entregáveis**:
  - `replit.md` atualizado com Wave 10 ZapSign (env vars novas, fluxo, gateway adapter).
  - Microscópio v2 (este doc) marcado COMPLETED com SELECTs prova.
  - `.local/.commit_message` Wave 10.
  - Commit + tag `v031-zapsign-launch` (operações destrutivas pendem autorização Caio).
  - Restart workflows + smoke 200 em `/healthz` + 401 em `/webhooks/assinatura/zapsign` sem header.

---

## 5. Secrets necessários (request explícita)

Pra Caio criar conta em zapsign.com.br e fornecer:

| Secret | Origem | Default seguro | Bloqueia fase |
|---|---|---|---|
| `ZAPSIGN_API_TOKEN` | Painel ZapSign → Configurações → API → Bearer | — | F2 (sem isso, adapter fica em mock) |
| `ZAPSIGN_BASE_URL` | constante: `https://api.zapsign.com.br/api/v1` | já hardcoded fallback | nenhuma |
| `ZAPSIGN_SANDBOX_URL` | constante: `https://sandbox.api.zapsign.com.br/api/v1` | já hardcoded fallback | nenhuma |
| `ZAPSIGN_WEBHOOK_SECRET` | string aleatória 32+ chars (Caio define) | obrigatório | F4 (webhook 401 sem isso) |
| `ZAPSIGN_BRAND_NAME` | constante: `PAWARDS MEDCORE` | fallback no código | nenhuma |
| `ZAPSIGN_DEFAULT_LANG` | constante: `pt-br` | fallback no código | nenhuma |
| `ICP_BRASIL_A1_PFX_PATH` (opcional) | upload do .pfx do médico no `/secrets/` | — | só F2 modo "servidor assina" |
| `ICP_BRASIL_A1_PFX_PASSWORD` (opcional) | senha do .pfx | — | só F2 modo "servidor assina" |
| `ASAAS_API_KEY` (Wave 11) | painel ASAAS | — | não bloqueia Wave 10 |

**Os 2 críticos pra Wave 10**: `ZAPSIGN_API_TOKEN` e `ZAPSIGN_WEBHOOK_SECRET`. Os 6 restantes têm fallback no código ou são opcionais.

---

## 6. Mapeamento `papel → auth_mode` (§F2)

```typescript
// src/lib/assinatura/adapters.ts (helper interno do ZapsignAdapter)
function mapearAuthMode(papel: PapelSignatario, opts?: {
  exigirICP?: boolean;
}): AuthMode {
  // Override explícito: prescritor de medicamento controlado SEMPRE ICP
  if (opts?.exigirICP) return 'certificadoDigital';

  switch (papel) {
    case 'MEDICO':
      // CFM 2.299/2021 art. 4º — médico SEMPRE ICP
      return 'certificadoDigital';

    case 'CLINICA':
      // e-CNPJ A1 da clínica (instituicional)
      return 'certificadoDigital';

    case 'PACIENTE':
      // Lei 14.063 art. 4º, II + STJ REsp 2.159.442 — assinatura avançada basta
      // toque + OTP WhatsApp = firma reconhecida por semelhança
      return 'assinaturaTela-tokenWhatsApp';

    case 'TESTEMUNHA':
      // Testemunha do ato — toque + OTP email (não tem WhatsApp obrigatório)
      return 'assinaturaTela-tokenEmail';

    case 'RESPONSAVEL_LEGAL':
      // Mesmo regime do paciente
      return 'assinaturaTela-tokenWhatsApp';

    default:
      return 'assinaturaTela';
  }
}
```

---

## 7. Use-cases — esqueleto de código (F3)

### 7.1 `enviarTCLE.ts`

```typescript
// src/lib/assinatura/use-cases/enviarTCLE.ts
import { createHash } from 'node:crypto';
import { db } from '@workspace/db';
import { sql } from 'drizzle-orm';
import { assinaturaService } from '../service';

export interface EnviarTCLEInput {
  pacienteId: number;
  medicoId: number;
}

export async function enviarTCLE(input: EnviarTCLEInput) {
  // 1) Carrega paciente + médico
  const { rows: [paciente] } = await db.execute(sql`
    SELECT id, nome, cpf, telefone, data_nascimento
      FROM pacientes WHERE id = ${input.pacienteId}
  `) as { rows: Array<{ id: number; nome: string; cpf: string; telefone: string; data_nascimento: string }> };

  const { rows: [medico] } = await db.execute(sql`
    SELECT id, nome, email FROM colaboradores
     WHERE id = ${input.medicoId} AND papel = 'MEDICO'
  `) as { rows: Array<{ id: number; nome: string; email: string }> };

  if (!paciente || !medico) throw new Error('Paciente ou médico não encontrado');

  // 2) Gera PDF TCLE (lib já existe — placeholder se não houver, usa template HTML)
  const pdfBuffer = await gerarPdfTCLE({ paciente, medico });
  const hashOriginal = createHash('sha256').update(pdfBuffer).digest('hex');
  const externalId = `tcle-${input.pacienteId}-${Date.now()}`;

  // 3) Insere solicitação
  const { rows: [solic] } = await db.execute(sql`
    INSERT INTO assinatura_solicitacoes
      (paciente_id, template_id, provedor_codigo, status,
       hash_original, zapsign_external_id, signatarios_snapshot)
    VALUES
      (${input.pacienteId},
       (SELECT id FROM assinatura_templates WHERE codigo='tcle_v1' LIMIT 1),
       'zapsign', 'HIDRATADO',
       ${hashOriginal}, ${externalId},
       ${JSON.stringify([
         { papel: 'PACIENTE', nome: paciente.nome, cpf: paciente.cpf, telefone: paciente.telefone, ordem: 1 },
         { papel: 'MEDICO',   nome: medico.nome,   email: medico.email,                              ordem: 2 },
       ])}::jsonb)
    RETURNING id
  `) as { rows: Array<{ id: number }> };

  // 4) Envia via ZapSign (adapter resolve auth_mode + WhatsApp + ICP)
  const resultado = await assinaturaService.enviar({
    solicitacaoId: solic.id,
    pdfBase64: pdfBuffer.toString('base64'),
    externalId,
    nome: `TCLE - ${paciente.nome}`,
    signatarios: [
      {
        papel: 'PACIENTE',
        nome: paciente.nome,
        cpf: paciente.cpf,
        telefone: paciente.telefone,
        ordem: 1,
        // adapter mapeia → auth_mode: 'assinaturaTela-tokenWhatsApp'
        // + send_automatic_whatsapp: true
      },
      {
        papel: 'MEDICO',
        nome: medico.nome,
        email: medico.email,
        ordem: 2,
        // adapter mapeia → auth_mode: 'certificadoDigital'
      },
    ],
    forcarProvedor: 'zapsign',
  });

  return {
    solicitacaoId: solic.id,
    envelopeId: resultado.envelopeId,
    signUrlPaciente: resultado.linksAssinatura.find(l => l.papel === 'PACIENTE')?.url,
  };
}
```

### 7.2 `enviarPARQ.ts`, `enviarOrcamentoFarmaceutico.ts`

Mesmo esqueleto, trocando:
- Template (`parq_v1` / `orcamento_farma_v1`)
- Geração PDF (`lib/parq/pdf.ts` já existe pra PARQ; orçamento usa `lib/farmaceutica/orcamentoPdf.ts` — Wave 5)
- Signatários: PARQ tem 2 (clínica e farmácia, ambos ICP); orçamento tem 2 (paciente WhatsApp + farmácia ICP)

### 7.3 `enviarTermoUsoOneClick.ts` (sem PDF)

```typescript
// OneClick: aceite via link, sem envelope. Custo R$ 0,50/aceite.
export async function enviarTermoUsoOneClick(input: { pacienteId: number; termoCodigo: string }) {
  const zapsign = getAdapter('zapsign');
  const { rows: [termo] } = await db.execute(sql`
    SELECT codigo, versao, conteudo_html, sha256(conteudo_html::bytea)::text AS hash
      FROM assinatura_textos_institucionais
     WHERE codigo = ${input.termoCodigo} AND ativo = true
  `) as { rows: Array<{ codigo: string; versao: string; conteudo_html: string; hash: string }> };

  // Cria OneClick (endpoint específico ZapSign — POST /api/v1/oneclick/)
  const r = await fetch(`${process.env.ZAPSIGN_BASE_URL}/oneclick/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.ZAPSIGN_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `${termo.codigo} v${termo.versao}`,
      content: termo.conteudo_html,
      external_id: `oneclick-${input.pacienteId}-${termo.codigo}`,
    }),
  });
  const { token, sign_url } = await r.json();

  // Persiste expectativa de aceite (preenchido depois pelo webhook)
  await db.execute(sql`
    INSERT INTO assinatura_oneclick_aceites
      (zapsign_token, paciente_id, termo_codigo, termo_versao, termo_hash_sha256,
       signer_ip, signer_geo, user_agent, aceito_em, validation_url)
    VALUES (${token}, ${input.pacienteId}, ${termo.codigo}, ${termo.versao}, ${termo.hash},
            '0.0.0.0'::inet, '{}'::jsonb, 'pendente', now(), ${sign_url})
    ON CONFLICT (zapsign_token) DO NOTHING
  `);

  return { token, signUrl: sign_url };
}
```

---

## 8. Webhook handler completo (F4)

```typescript
// src/routes/assinaturasWebhook.ts (substitui o handler atual ZapSign)
router.post('/webhooks/assinatura/zapsign', async (req, res) => {
  const headerSecret = req.headers['x-pawards-secret'] as string | undefined;
  const expected = process.env.ZAPSIGN_WEBHOOK_SECRET;

  if (!headerSecret || !expected) return res.status(401).json({ ok: false });
  try {
    const a = Buffer.from(headerSecret);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(401).json({ ok: false });
    }
  } catch { return res.status(401).json({ ok: false }); }

  const { event_type, doc_token, external_id, signers } = req.body as {
    event_type: 'doc_signed' | 'doc_refused' | 'doc_removed';
    doc_token: string;
    external_id: string;
    signers: Array<{
      token: string; name: string; cpf: string;
      sign_at: string; ip: string; geo_location: { lat: number; long: number };
      user_agent: string; auth_mode: string; icp_brasil_serial?: string;
    }>;
  };

  // Reconcilia solicitação por external_id
  const { rows: [solic] } = await db.execute(sql`
    SELECT id, hash_original FROM assinatura_solicitacoes
     WHERE zapsign_external_id = ${external_id} LIMIT 1
  `) as { rows: Array<{ id: number; hash_original: string }> };

  if (!solic) return res.status(202).json({ ok: false, reason: 'external_id desconhecido' });

  if (event_type === 'doc_signed') {
    // Baixa PDF assinado
    const adapter = getAdapter('zapsign');
    const pdfBuffer = await adapter.downloadSignedArtifact(doc_token);
    const hashAssinado = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    // Persiste no Object Storage (App Storage SDK)
    const storageKey = `assinaturas/${external_id}.pdf`;
    await objectStorage.upload({
      bucket: 'assinaturas-pawards',
      key: storageKey,
      body: pdfBuffer,
      contentType: 'application/pdf',
      metadata: { 'doc-token': doc_token, 'signed-at': new Date().toISOString() },
    });

    await db.execute(sql`
      UPDATE assinatura_solicitacoes
         SET status='CONCLUIDO', concluido_em=now(),
             hash_assinado=${hashAssinado}, pdf_assinado_url=${storageKey}
       WHERE id=${solic.id}
    `);

    // Manifesto judicial (1 linha por signatário)
    for (const signer of signers) {
      await db.execute(sql`
        INSERT INTO auditoria_assinaturas (
          signature_id, solicitacao_id, envelope_id, external_id,
          document_hash_sha256, document_hash_assinado,
          signer_cpf, signer_name, signer_papel,
          signer_ip, signer_geo, user_agent,
          auth_method, auth_evidence_json, timestamp_utc,
          icp_brasil_serial, validation_url, pdf_storage_key
        ) VALUES (
          ${signer.token}, ${solic.id}, ${doc_token}, ${external_id},
          ${solic.hash_original}, ${hashAssinado},
          ${signer.cpf}, ${signer.name},
          ${papelDoSnapshot(solic.id, signer.cpf)},
          ${signer.ip}::inet, ${JSON.stringify(signer.geo_location)}::jsonb,
          ${signer.user_agent},
          ${signer.auth_mode}::zapsign_auth_method, ${JSON.stringify(signer)}::jsonb,
          ${signer.sign_at}::timestamptz,
          ${signer.icp_brasil_serial || null},
          ${`https://app.zapsign.com.br/verificar/${doc_token}`},
          ${storageKey}
        ) ON CONFLICT (signature_id) DO NOTHING
      `);
    }
  } else if (event_type === 'doc_refused') {
    await db.execute(sql`UPDATE assinatura_solicitacoes SET status='REJEITADO' WHERE id=${solic.id}`);
  } else if (event_type === 'doc_removed') {
    await db.execute(sql`UPDATE assinatura_solicitacoes SET status='EXPIRADO' WHERE id=${solic.id}`);
  }

  return res.status(200).json({ ok: true });
});
```

---

## 9. Frontend mínimo (F5)

### 9.1 Rota `/assinaturas/timeline`
- Tabela paginada (50/pg) com colunas: ID interno, Template, Paciente, Médico, Status (badge cor), Enviado em, Concluído em, Provedor, Link verificar.
- Filtros: status (multi), provedor, intervalo data, paciente.
- API: `GET /api/assinaturas?limit=50&offset=...` (já existe; adicionar campos `zapsign_external_id`, `auth_method` — JOIN com `auditoria_assinaturas`).

### 9.2 Rota `/assinaturas/[id]`
- Header: nome do template, status global, hash original × hash assinado.
- Cards por signatário: papel, nome, CPF, hora assinou, IP, geo no mapa Leaflet, auth_method (badge: AVANÇADA/QUALIFICADA), serial ICP (se houver), botão "Validar no ZapSign" (abre `validation_url`).
- Botão "Baixar PDF assinado" (chama `GET /api/assinaturas/:id/pdf` → stream do App Storage).
- Botão "Reenviar lembrete WhatsApp" (chama `POST /api/assinaturas/:id/lembrete`).

### 9.3 Banner Painel CEO
- Card no `/painel-ceo`: "Assinaturas hoje: X enviadas | Y assinadas | Z rejeitadas | T pendentes >24h".
- Click no número → drill-down filtrado.

---

## 10. Riscos, mitigações e decisões pendentes

| Risco | Mitigação | Decisão Caio |
|---|---|---|
| ZapSign sai do ar / sobe preço | Adapter pattern já permite trocar pra ClickSign sem refatorar use-cases. Auditoria local = prova autônoma. | aceitar adapter, ClickSign reserva |
| Idoso não recebe WhatsApp (sem internet, etc) | Fallback automático: se 24h sem assinar, dispara lembrete email + cópia link no portal do paciente. | configurar via worker (Wave 10.5) |
| Médico sem ICP-Brasil A1 | 2 caminhos: (a) `auth_mode: 'biometria-facial'` (avançada+) — válida pra termo PARQ mas NÃO pra receita controlada; (b) ZapSign emite e-CNPJ A1 próprio (R$ 200/ano). | escolher (b), Wave 10.5 |
| Webhook fora de ordem (signed antes de criado) | `INSERT … ON CONFLICT DO NOTHING` + `external_id` busca → 202 quando solicitação ainda não existe. ZapSign reenvia em 27h se não recebe 200. | aceito |
| LGPD: passar CPF + geo do paciente pra ZapSign | DPA contratual (cláusula obrigatória ao fechar plano). ZapSign tem ISO 27001. Auditoria local = trilha mesmo se ZapSign apagar. | exigir DPA na contratação |
| Object Storage 20 anos retention | App Storage não tem retention policy formal — registramos `retencao_ate` no manifesto, política de exclusão respeita esse campo. | aceito Wave 10, formalizar Wave 11 |
| Servidor assina A1 (`ICP_BRASIL_A1_PFX_PATH`) | Risco: certificado em disco. Por ora médico assina pelo painel ZapSign Web PKI (token físico). | DEFERIR — Wave 10.5 |

---

## 11. Plano de teste e2e (F2 → F4)

### Sandbox (em `NODE_ENV=development`):

1. **F2 smoke**: `curl -X POST $ZAPSIGN_SANDBOX_URL/docs/ -H "Authorization: Bearer $ZAPSIGN_API_TOKEN" -d '{...payload mock...}'` → esperado: `{token, signers}`.
2. **F3 e2e TCLE**: `POST /api/assinaturas/enviar-tcle { pacienteId: <CAIO_TESTE>, medicoId: <CAIO_TESTE> }` → confirma WhatsApp do Caio recebe link → assina com dedo → confirma email do médico → assina com ICP teste.
3. **F4 webhook**: ZapSign sandbox dispara `doc_signed` → `auditoria_assinaturas` ganha 2 linhas (paciente + médico) → PDF assinado existe no bucket → `assinatura_solicitacoes.status='CONCLUIDO'`.
4. **F4 idempotência**: re-curl o webhook manualmente → 200 + zero linhas extras.
5. **F4 segurança**: curl webhook sem header → 401; com header errado → 401; com header certo mas timing-safe-equal mal escrito → testar com strings de tamanhos diferentes (a.length !== b.length).

### Produção (após Caio validar sandbox):
1. `assinatura_toggles_admin.provedor_principal_codigo = 'zapsign'`.
2. Disparar TCLE pra paciente real piloto (Caio + 1 paciente voluntário).
3. Auditar `auditoria_assinaturas` 1 semana.
4. Liberar geral.

---

## 12. SELECTs de prova final (F6)

```sql
-- (1) Manifesto auditoria preenchido
SELECT count(*) AS assinaturas_registradas,
       count(DISTINCT envelope_id) AS envelopes_distintos,
       count(DISTINCT signer_cpf) AS cpfs_distintos
  FROM auditoria_assinaturas;

-- (2) Distribuição auth_method (deve refletir Lei 14.063)
SELECT auth_method, count(*)
  FROM auditoria_assinaturas
 GROUP BY auth_method ORDER BY count(*) DESC;
-- Esperado: assinaturaTela-tokenWhatsApp (pacientes) > certificadoDigital (médicos)

-- (3) Wave 9 PARQ preservada
SELECT count(*) FROM parmavault_receitas;                           -- 8.725
SELECT count(*) FROM parq_acordos;                                   -- mantém Wave 9
SELECT to_char(sum(comissao_estimada), 'FM999G999G990D00')
  FROM parmavault_receitas;                                          -- 2.735.336,10

-- (4) Trigger 027 ainda ativo
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname='trg_calc_comissao';

-- (5) Retenção 20 anos garantida
SELECT min(retencao_ate), max(retencao_ate) FROM auditoria_assinaturas;

-- (6) PDFs no Object Storage = entradas em auditoria
SELECT count(*) FROM auditoria_assinaturas WHERE pdf_storage_key IS NOT NULL;
```

---

## 13. Status do microscópio

| Fase | Status | Observação |
|---|---|---|
| §0 Sumário executivo | ✅ escrito | aguarda audit Dr. Claude |
| §1 Base legal | ✅ escrito | 4 normas mapeadas |
| §2 Estado atual + diff | ✅ escrito | preserva adapter pattern |
| §3 Migration 031 | ✅ DDL pronto | aplicação em F1 |
| §4 Faseamento F0-F6 | ✅ escrito | aguarda autorização Caio |
| §5 Secrets | ✅ listados | aguarda Caio criar conta ZapSign |
| §6 Mapeamento auth | ✅ escrito | função pura |
| §7 Use-cases | ✅ esqueletos | F3 implementa |
| §8 Webhook handler | ✅ pseudocódigo | F4 implementa |
| §9 Frontend | ✅ escopo definido | F5 implementa |
| §10 Riscos | ✅ 7 mapeados | 1 deferida (servidor A1) |
| §11 Plano de teste | ✅ escrito | F2-F4 sandbox + produção piloto |
| §12 SELECTs prova | ✅ escrito | rodam em F6 |

**Próximo passo:** aguardar Caio (1) criar conta zapsign.com.br e (2) fornecer `ZAPSIGN_API_TOKEN` + `ZAPSIGN_WEBHOOK_SECRET`. Com esses 2 secrets em mãos, F0 → F2 podem rodar em sequência sem nova interrupção.
