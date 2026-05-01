# MAPA NEURONAL PAWARDS — v1.1 LIMPEZA (preserva v1.0, ajusta artefatos)

**Status**: Rascunho Dr. Replit aguardando validação Dr. Claude + Dr. Caio
**Data**: 01/mai/2026
**Base preservada**: v1.0 (PDF Dr. Claude — 6x_PAWARDS_MAPA_NEURONAL_COMPLETO_1777655925345.pdf, idêntico ao 3x_ por SHA-256 do texto puro)
**Princípio aplicado**: P9 PADCON — *"não desconstruir o que foi validado, apenas remover artefatos/sujeiras"*
**Ground truth**: audit empírico 01/mai/2026 (278 tabelas + 99 rotas + 9 triggers ativos no Postgres)

---

## 1. O que PERMANECE INTOCADO do v1.0 (8 acertos confirmados empiricamente)

| # | Conceito v1.0 | Verificação no código | Status |
|---|---|---|---|
| 1 | SNC 3 camadas (Identidade/Orquestração/Execução) | `tenantContext` 5 arq + `rasxEngine` 2 arq + `assinaturaService` 6 arq | ✅ Preservar |
| 2 | Triggers SQL como sinapses tipo 1 | 9 triggers ativos: trg_calc_comissao, trg_sync_comissao_parq, trg_assin_templates_validar, trg_nfe_validar, trg_parq_plano_prazo_limite | ✅ Preservar |
| 3 | Blocos RAS CLIN/JURI/FINA/ACOM/4100 | `rasxMotorPdf.ts:705-709` renderiza os 5 blocos | ✅ Preservar |
| 4 | Webhook ZapSign HMAC `x-pawards-secret` | `adapters.ts:370` (header customizado pq ZapSign não tem HMAC nativo) + `assinaturasWebhook.ts` raw body | ✅ Preservar |
| 5 | Hierarquia P0-P7 de prioridade | Princípio operacional sólido, alinha com Manifesto PADCON | ✅ Preservar como contrato |
| 6 | Mapa de inibição (TCLE/PARQ/parq_pago manual/IDOR) | Alinhado com REGRA FERRO + 6 tabelas auditoria_* existentes | ✅ Preservar |
| 7 | PASSURANCE como **EMPRESA EXTERNA** (Parte 8) | Dr. Claude evoluiu posição em relação ao PDF anterior PASSURANCE_DrReplit. Agora propõe 4 colunas aditivas em `parq_acordos` | ✅ Preservar (resolve 5 dos 6 conflitos sozinho) |
| 8 | Agrupamento conceitual de 44 tabelas em 9 módulos | PADLEGEX=14, PARMAVAULT=13, MEDCORE=5, PAREXAM=3, RAS=3, PADTEAM=2, PAWVISION=2, PAWTRACK=1, PARASCLIN=1 | ✅ Preservar como mapa lógico |

---

## 2. As 7 SUJEIRAS detectadas (ajustes aditivos pra v1.1)

| # | v1.0 dizia | Realidade (audit empírico) | Limpeza v1.1 (aditiva, não destrutiva) |
|---|---|---|---|
| 1 | `parq_farmacia_status` = 5 valores (gold/silver/bronze/em_correcao/suspensa) | Banco tem **6 valores** (faltou 'denunciada' adicionado na Wave 9) | **Adicionar 'denunciada' na lista do mapa**. Documentar como "valor adicional Wave 9 conforme nota Dr. Caio sobre farmácias que praticam fraude". |
| 2 | Wave 9 = "PARQ FARMA + sistema de delegação + toggles" | Wave 9 entregou MUITO MAIS: 8 tabelas + 15 endpoints + PDF 4p Navy/Gold + QR + hash + trigger 030 + backfill 8.725 receitas | **Reescrever linha Wave 9 do roadmap (Parte 10)**: detalhar entregas reais pra documentar progresso histórico. |
| 3 | Wave 11 = "Segurança IDOR fechado + subdomínios" | Caio originalmente mapeou Wave 11 = **5 Kaizens Comunicação** (PWA/OTP-WA/Inbound/OCR/Templates) | **Conflito de roadmap a renegociar com Caio**. Proposta: Wave 11 = Comunicação, Wave 11.5 (curta) = Segurança IDOR como cirurgia paralela. |
| 4 | PARQ LABOR = "Wave 17 ou posterior" | Organograma oficial Caio (01/mai/2026) define **PARQ LABOR = Wave 12** | **Atualizar mapa pra Wave 12 conforme Caio.** |
| 5 | "parmavaultEngine" e "zapiWorker" listados como sinapses no SNC Camada 3 | **0 arquivos no código** com esses nomes. São abstrações conceituais. | **Esclarecer no preâmbulo**: nomes de "engines" são abstrações arquiteturais, não namespaces. Funcionalidade real está distribuída em `parmavault_*` (13 arq) e `recorrencia/*` workers (5 arq). |
| 6 | Módulos PARASCLIN/PAREXAM/PAWTRACK/PAWVISION/PAWLEVEL/PADTEAM/PADLEGEX como "neurônios especializados" | **0 prefixos de tabela ou pasta com esses nomes**. São 100% branding conceitual. Tabelas reais usam: pacientes, consultas, arquivos_exames, exames_analitos, etc. | **Adicionar nota no Apêndice "Tabela Mestra"**: nomes-marca são *agrupamentos lógicos pra storytelling do triângulo*, não namespaces de código. As tabelas reais já listadas no apêndice (ex: PARASCLIN agrupa pacientes+consultas+anamnese) confirmam isso. |
| 7 | Worker questionário diário 08h/14h/21h citado como **exemplo de sinapse tipo 4** | É **Wave 14 futura** — não existe ainda. Workers reais são 5: motorPlanos, lembretePrescricao, cobrancaMensal, notifAssinatura, parqStatus | **Marcar exemplo com `(Wave 14 — futuro)` em vermelho**. Adicionar lista dos 5 workers reais pra balancear. |

---

## 3. Mudança MAJOR já aceita: PASSURANCE como empresa externa (Parte 8)

Esta NÃO é uma "sujeira" — é uma **evolução brilhante do Dr. Claude** entre o PDF PASSURANCE_DrReplit (anterior) e o Mapa Neuronal v1.0 (atual).

```
                        EVOLUÇÃO DR. CLAUDE
                                ↓
ANTES (PDF PASSURANCE_DrReplit):
  passurance_auditorias  (UUID, tabela interna no PAWARDS)
  passurance_amostras    (UUID, tabela interna no PAWARDS)
  passurance_lab_parceiros (UUID, tabela interna)
  → Gerava 6 conflitos com Wave 9 (BIGSERIAL/INTEGER, enum, sobreposição parq_visitas...)

DEPOIS (Mapa Neuronal v1.0 Parte 8):
  PASSURANCE LTDA = empresa autônoma, sistema próprio fora do PAWARDS
  PAWARDS apenas REFERENCIA via 4 colunas aditivas em parq_acordos:
    - auditoria_responsavel    (CLINICA_PROPRIA / PASSURANCE_INDICADA / TERCEIRO)
    - laudo_auditoria_url
    - laudo_auditoria_hash
    - laudo_auditoria_data
  → Resolve 5 dos 6 conflitos automaticamente (o 6º é só nome do enum)
```

Isso significa que minha auditoria anterior dos 6 conflitos PASSURANCE virou parcialmente obsoleta —
**o Dr. Claude já consertou sozinho 5 deles** com a evolução de posição. Reconhecimento merecido.

---

## 4. Sugestão de redação Dr. Replit → Dr. Claude

```
Caro Dr. Claude,

Parabéns pela evolução de posição da PASSURANCE entre o PDF anterior e o
Mapa Neuronal v1.0 Parte 8. A nova arquitetura "empresa externa + 4 colunas
aditivas" resolve 5 dos 6 conflitos que eu havia detectado, sem necessidade
de retrabalho — exatamente o espírito do Princípio 9 PADCON.

Audit empírico do mapa neuronal v1.0 (Postgres + ripgrep no código real
01/mai/2026) confirma 8 acertos sólidos e identifica 7 sujeiras pra v1.1
(detalhadas abaixo). Todas são correções aditivas, nenhuma desconstrutiva.

Apenas a #3 (Wave 11) e a #4 (Wave 12 PARQ LABOR) precisam decisão Caio.
As outras 5 são limpeza textual sem impacto técnico.

Aguardo seu aceite ou contraproposta antes de gravar como v1.1 oficial.

Dr. Replit
```

---

## 5. Versionamento

- v1.0 (28/abr/2026): Mapa neuronal Dr. Claude — PDFs 3x_ e 6x_ (idênticos por SHA-256 texto puro)
- v1.1 (01/mai/2026): Esta limpeza Dr. Replit — preserva v1.0 + 7 correções aditivas + reconhecimento da evolução PASSURANCE
