# HANDOFF — Motor de Prescrição PADCON + Mensageria dos 4 Auditores

> **Para:** Dr. Claude · **De:** Dr. Replit · **Branch ativo:** `feat/dominio-pawards`
> **Projeto:** PAWARDS — SaaS médico multi-tenant da Clínica Pádua (Dr. Caio Henrique Fernandes Padua, CEO).
> **DNA visual:** azul petróleo `#1F4E5F`, off-white, dourado. Qualidade Hermès/Dior.
> **Idioma do código:** PT-BR. **Nomenclatura ferro-fundida:** MAIÚSCULAS, sem acento/hífen/underline, só espaços. Arquivos `AA.MM.DD - PALAVRA`.

---

## 0. TL;DR (30 segundos)

Existe **um motor puro** (`prescricaoEngine.ts`, 482 linhas, 41 testes verdes) que recebe blocos de prescrição e devolve a lista ordenada de PDFs a emitir, aplicando 4 regras (REGRA 04/05/13/14) da RDC 471/2021 + RDC 344/1998. Por cima dele existe **uma camada de mensageria** com 4 auditores virtuais (Arquio/Klara/Vitrine/Horizonte) que conversam com o CEO via uma "Caixa do CEO" — 8 tabelas, 28 regras LGPD-granular, isolamento multi-tenant por JWT.

A base de mensageria já é genérica o bastante para hospedar um **5º auditor antifraude de comissões de farmácia de manipulação** sem refatorar nada. Ver §6.

---

## 1. MOTOR PADCON UNIVERSAL (`prescricaoEngine.ts`)

### 1.1 Função
Receber `BlocoEntrada[]` (apelido + via_administracao + ativos[]) → devolver `{ blocosProcessados, pdfs: PdfAgrupado[] }` prontos pra emissão.

### 1.2 Quatro REGRAs aplicadas em sequência (ANVISA)

| Regra | O que faz |
|---|---|
| **REGRA 04** | Detecta cor da receita por `tipo_receita_anvisa_codigo` do ativo. 6 cores: `azul` (B1/B2), `amarelo` (A1/A2/A3), `branco` (BRANCA_SIMPLES industrializado), `magistral`, `lilas` (hormonal), `verde` (fito). |
| **REGRA 05** | Define destino de dispensação. Tudo que é magistral/manipulado → **FAMA**. Industrializado → drogaria comum. |
| **REGRA 13** | Marcação `MANIPULAR JUNTO` — quando o médico declara fórmula composta (mais de um ativo numa mesma cápsula), o PDF carrega o apelido da fórmula composta. |
| **REGRA 14.3** | "Explosão FAMA": um único bloco do médico com ativos de cores diferentes vira **N PDFs distintos** (um por código ANVISA), todos com destino FAMA quando manipulado. Ex.: B1 + A2 + C1 + Magistral = **4 PDFs**. |

### 1.3 Chave de agrupamento
`(tipo_receita_anvisa_codigo, destino_dispensacao, formula_composta_apelido)` — receita Azul B1 não pode conter ativo Amarela A2; cada cor exige sua folha; fórmulas compostas distintas ficam separadas mesmo partilhando cor.

### 1.4 Ordem dos PDFs no output
`branco → magistral → lilás → verde → azul → amarelo` (rotina primeiro, controlados por último — checklist mental do farmacêutico).

### 1.5 Invariantes garantidos pelos 41 testes
- **Idempotência:** mesma entrada 2× → mesma saída determinística.
- **Magistral solo:** cor `magistral`, destino `FAMA`, `exige_sncr=false`.
- **B1/B2 + A1/A2/A3 controlados:** sempre `exige_sncr=true` (vai pro SNCR consumo log).
- **Industrial + Magistral coexistindo no mesmo bloco:** 2 PDFs (1 por código).
- **Lilás hormonal e Verde fito:** fluxos especiais reconhecidos.
- **Robustez:** doses NaN/zero/negativas, 50 ativos num bloco, unicode/emoji em nome de ativo, blocos vazios — nenhum crasha.

### 1.6 Arquivos-chave do motor
- `artifacts/api-server/src/services/prescricaoEngine.ts` — motor puro (sem I/O, sem DB).
- `artifacts/api-server/src/services/prescricaoEngine.test.ts` — 23 testes do exemplo "Sr. José" (caso clínico real).
- `artifacts/api-server/src/services/prescricaoEngine.stress.test.ts` — 18 testes adversariais (edge cases extremos).
- `artifacts/api-server/src/routes/prescricoes.ts` — orquestração HTTP, único lugar com `withTenantScope` aplicado (ver §5 anastomose crítica).

---

## 2. CATÁLOGO ANVISA E DE FÓRMULAS (NÃO TOCAR — DADOS CURADOS)

| Tabela | Conteúdo | Por que é precioso |
|---|---|---|
| `tipos_receita_anvisa` | 12 códigos (B1, B2, A1, A2, A3, C1, BRANCA_SIMPLES, MAGISTRAL, LILAS_HORMONAL, VERDE_FITO, …) | Mapa direto cor↔legislação. |
| `formula_blend` | 12 BLENDs proprietários, 63 ativos | Fórmulas-base do Dr. Caio. |
| `formulas_master` | 4 templates clínicos | Atalhos de prescrição. |
| `periodos_dia` | 9 períodos curados (J/IM/MM/AL/T/IN/N/NF/C) com cores+emojis | Posologia visual. |

**Drift conhecido vs Drizzle schema.ts:** ~30 tabelas. O sistema sobrevive porque o acesso é via `pool.query(SQL)` direto. Migrações novas usam `CREATE TABLE IF NOT EXISTS` + `ALTER ADD COLUMN IF NOT EXISTS`.

---

## 3. MENSAGERIA DOS 4 AUDITORES — ARQUITETURA

### 3.1 As 4 personas (vivos no banco)
| ID | Persona | Área | Cadência | LGPD |
|---|---|---|---|---|
| 1 | **DR. ARQUIO** 🛡️ | TÉCNICO (sistema) | Diária 07:00 | **Não** vê paciente identificável |
| 2 | **DRA. KLARA** 🩺 | CLÍNICO | Diária 18:00 | **Vê paciente identificável** (única) |
| 3 | **DR. VITRINE** 📈 | LOCAL (vendas/receita) | Semanal segunda 08:00 | Não vê paciente identificável |
| 4 | **DRA. HORIZONTE** 🌐 | GLOBAL (mercado/concorrência) | Semanal sexta 17:00 | Não vê paciente identificável |

### 3.2 As 8 tabelas (migration 003)
| Tabela | Função |
|---|---|
| `auditor_areas_atuacao` | Catálogo natural-key (TECNICO/CLINICO/LOCAL/GLOBAL). |
| `auditores` | As 4 personas com bio, tom de voz, emoji, cor hex. |
| `auditor_visibilidade_regras` | **28 regras LGPD-granular** (recurso × escopo). |
| `auditor_mensagens` | A "Caixa do CEO". Cada msg tem título, bullets[], pergunta, prioridade, status. |
| `auditor_eventos_drive` | Log de eventos de Drive observados (criação/edição/deleção). |
| `anastomoses_pendentes` | Walking deads — pendências internas que o sistema lembra de cobrar. |
| `paciente_email_semanal` | Registro de envios semanais por paciente. |
| `drive_anchors` | IDs reais das pastas Drive (chave `nome` → `drive_file_id`). |

### 3.3 Modelo LGPD-granular (28 regras)
Cada auditor declara, para cada **recurso** (`PACIENTES`/`PRESCRICOES`/`RAS`/`FINANCEIRO`/`EXAMES`/`DRIVE_EVENTOS`/`MARKETING`), seu **escopo**:
- `NENHUM` — não vê.
- `AGREGADO` — vê só métrica (ex.: "ticket médio R$ 1.450").
- `ANONIMIZADO` — vê fato, sem nome ("paciente XYZ123").
- `IDENTIFICAVEL` — vê com nome, CPF, prontuário.

Só Klara tem `IDENTIFICAVEL` em `PACIENTES`. Vitrine vê `FINANCEIRO=AGREGADO`. Horizonte vê só dados de mercado externo.

### 3.4 Botões de resposta do CEO
`👍 LI | 🎯 DECIDIR | ⏰ ADIAR` — endpoint `POST /api/auditor-mensagens/:id/confirmar-leitura` move status (`PENDENTE → LIDA/DECIDIDA/ADIADA`) e agenda `proximo_lembrete_em` se ADIAR.

### 3.5 Endpoints HTTP (`routes/auditores.ts`)
| Método | Path | Quem pode |
|---|---|---|
| GET | `/api/auditores` | Qualquer autenticado (catálogo público) |
| GET | `/api/auditores/:apelido` | Idem + traz visibilidade |
| GET | `/api/auditor-mensagens?status=PENDENTE` | Escopado por `unidade_id` do JWT (master vê todas) |
| POST | `/api/auditor-mensagens` | Não-master forçado na sua unidade |
| POST | `/api/auditor-mensagens/:id/confirmar-leitura` | Idem |
| GET | `/api/auditor-eventos` | Escopado por unidade |
| GET | `/api/anastomoses` | **Apenas master** (`validador_mestre`/`consultoria_master`) |
| PATCH | `/api/anastomoses/:id` | Apenas master |

### 3.6 Helper de escopo (sem leak de PII)
```ts
const PERFIS_CROSS_TENANT = new Set(["validador_mestre", "consultoria_master"]);
function escopo(req) {
  const perfil = String(req.user?.perfil ?? "");
  return { isMaster: PERFIS_CROSS_TENANT.has(perfil), unidadeId: req.user?.unidadeId ?? null };
}
function fail(res, code, msg, e) {
  if (e) console.error(`[auditores] ${msg}:`, e?.message ?? e);
  res.status(code).json({ error: msg }); // mensagem genérica pro cliente
}
```

---

## 4. INTEGRAÇÃO DRIVE (já operante)

### 4.1 Hierarquia que existe na conta Google
```
PAWARDS/
└─ GESTAO CLINICA/
   ├─ Empresas/CNPJ/...           (cadastros)
   └─ AUDITORIA/
      ├─ AUDITORIA - DASHBOARD    (planilhas-mãe acumuladas)
      ├─ AUDITORIA - ATIVA        (planilha viva das últimas 48h)
      └─ AUDITORIA - LEGADO       (histórico arquivado)
```

### 4.2 Planilha do dia (idempotente)
`AA.MM.DD - AUDITORIA` em `- ATIVA`, com 3 abas (`EVENTOS` / `DASHBOARD` / `CONFIG`), cabeçalhos CAIXA-ALTA. Chamar `criarPlanilhaAuditoriaAtiva()` 2× no mesmo dia devolve o **mesmo `spreadsheetId`** (verificação prévia por nome).

### 4.3 Arquivos-chave
- `artifacts/api-server/src/lib/google-drive.ts` — `getDriveClient()` OAuth2.
- `artifacts/api-server/src/lib/auditoria/driveSetup.ts` — `setupDriveAuditoria()` (cria 7 pastas) + `criarPlanilhaAuditoriaAtiva()` (idempotente).
- `artifacts/api-server/src/lib/emailPaciente/templateSemanal.ts` — template HTML A4 do relatório semanal ao paciente (RESUMO 5SEG / O QUE ACONTECEU / PEDIMOS / INDICADORES).

---

## 5. ANASTOMOSES ABERTAS (8 walking deads que o sistema cobra)

| # | Crit. | Módulo | Título |
|---|---|---|---|
| 5 | **CRÍTICA** | IDOR | `withTenantScope` global nas demais rotas (pacientes/ras/sessoes/exames) — só `/prescricoes` e `/auditores` têm hoje |
| 8 | ALTA | AUDITORIA | Watcher Drive Activity em tempo real (hoje só captura writes próprios) |
| 1 | ALTA | PRESCRICAO_PADCON | Assinatura PAdES/ICP-Brasil real (RDC 471/2021) — falta `node-signpdf` + cert ICP-Brasil A3 |
| 7 | média | AUDITORIA | Rotação 48h ATIVA → LEGADO (esqueleto pronto, scheduler `node-cron` desligado) |
| 4 | média | PRESCRICAO_PADCON | Validação Zod nas POSTs de prescrição |
| 3 | média | EMAIL_PACIENTE | Job semanal de envio do template (template existe; falta cron + integração Gmail) |
| 6 | média | PRESCRICAO_PADCON | Posologia dinâmica do PDF (hoje string fixa; deve ler de `prescricao_bloco_dose`) |
| 2 | baixa | TRELLO | Webhook bidirecional PAWARDS ↔ Trello (aguardando token) |

> Todas vivas em `anastomoses_pendentes`. `GET /api/anastomoses` (master) lista. `PATCH /api/anastomoses/:id` fecha.

---

## 6. PONTE PRO ANTIFRAUDE DE COMISSÃO DE FARMÁCIA

### 6.1 Tese do Dr. Caio
Farmácias de manipulação devem ~**30% de comissão sobre fórmulas prescritas** ao médico/clínica que originou a receita. Na prática, **não pagam ou subnotificam**. Faltam: (a) prova auditável de que a receita saiu do consultório, (b) prova auditável do que a farmácia efetivamente vendeu, (c) reconciliação automática.

### 6.2 Por que a base atual já cobre 70% disso
- O motor PADCON **já gera uma chave única por PDF emitido** (`codigo_pdf` + apelido + ativos), com destino `FAMA` quando manipulado → **lado A do contrato** (o que foi prescrito).
- A camada de mensageria **já tem auditor + caixa + LGPD-granular** → basta um 5º auditor `COMERCIAL` (apelido sugerido **`COMISSARIO`** 💼) que compara prescrições emitidas × extratos de farmácia × pagamentos recebidos e abre mensagem prioridade ALTA quando detecta divergência.
- A pasta Drive **já tem `AUDITORIA - DASHBOARD`** pra acumular as planilhas-mãe semanais de comissão.
- O modelo de **anastomose pendente** já existe — cada divergência vira 1 anastomose criticidade `alta` até quitação.

### 6.3 O que o Dr. Claude precisa desenhar (próxima onda)
1. **Tabela `farmacia_extrato`** (CNPJ farmácia × período × hash de receita × valor vendido × valor comissão devida × valor pago).
2. **Reconciliador** que cruza `prescricao_pdfs_emitidos` (motor PADCON) × `farmacia_extrato` por hash da receita.
3. **5º auditor COMISSARIO** com visibilidade `FINANCEIRO=IDENTIFICAVEL` e `PRESCRICOES=ANONIMIZADO` (não precisa de nome de paciente — só do hash).
4. **Mensagem semanal automática** ao CEO listando: emitido / cobrado / pago / divergência%.
5. (Opcional) Selo de **assinatura PAdES** no PDF da receita resolve simultaneamente a anastomose #1 + ancora juridicamente o lado A do contrato.

---

## 7. DECISÕES JÁ FECHADAS (não reabrir)

- **PostgreSQL Replit** como banco, acesso direto via `pool.query` de `@workspace/db`. Drizzle drift aceito; migrações via SQL idempotente em `artifacts/api-server/src/db/migrations/`.
- **JWT custom** com `SESSION_SECRET` (ainda não Clerk). Payload: `{ id, email, perfil, unidadeId }`.
- **CEO real:** id=1, `ceo@pawards.com.br`, perfil `validador_mestre`, unidade_id=1 (migration 004).
- **Mensagens dos auditores:** sempre títulos em CAIXA-ALTA, máx 3 bullets, máx 1 pergunta, sempre 1 prioridade declarada.
- **Drive:** os 7 IDs de pasta vivem em `drive_anchors` (chave nominal). NUNCA hardcodear ID de pasta no código.

---

## 8. ARQUIVOS-CHAVE PRA ABRIR (na ordem)

1. `artifacts/api-server/src/services/prescricaoEngine.ts` — **comece por aqui**, é o coração.
2. `artifacts/api-server/src/services/prescricaoEngine.test.ts` — exemplo Sr. José explica o motor melhor que qualquer doc.
3. `artifacts/api-server/src/services/prescricaoEngine.stress.test.ts` — invariantes adversariais.
4. `artifacts/api-server/src/db/migrations/003_auditores_anastomoses_emailpaciente.sql` — schema completo da mensageria.
5. `artifacts/api-server/src/db/seeds/003_auditores_e_pacientes.sql` — 4 auditores + 28 regras LGPD + 18 pacientes fictícios.
6. `artifacts/api-server/src/routes/auditores.ts` — endpoints com escopo multi-tenant.
7. `artifacts/api-server/src/lib/auditoria/driveSetup.ts` — Drive idempotente.
8. `artifacts/api-server/src/lib/emailPaciente/templateSemanal.ts` — template A4.
9. `replit.md` — DNA do projeto e histórico de ondas.
10. `.local/handoffs/HANDOFF-CLAUDE-MOTOR-PRESCRICAO-E-MENSAGERIA.md` — este arquivo.

---

## 9. CONTAGENS REAIS NO BANCO HOJE (snapshot)

| O que | Quantidade |
|---|---|
| Auditores ativos | **4** |
| Regras LGPD-granular | **28** |
| Mensagens na Caixa do CEO | **4** (1 LIDA, 3 PENDENTE) |
| Eventos Drive registrados | **24** |
| Anastomoses abertas | **8** |
| Pastas Drive ancoradas | **8** |
| Testes passando do motor | **41** (23 caso real + 18 stress) |

---

**Fim do handoff.** Branch: `feat/dominio-pawards`. Última atualização: pós-migration 004 (CEO email/nome corrigidos).
