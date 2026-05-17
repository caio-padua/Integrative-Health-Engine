# 09 — Código Puro: Anamnese → Motor → Prescrição (15/mai/2026)

> **Para o Dr. Claude — acesso direto ao código fonte real**
> URLs raw GitHub de cada arquivo chave do fluxo clínico.
> Branch: `feat/dominio-pawards`
> ⚠️ **ATENÇÃO**: 4 commits locais ainda não sincronizados com GitHub
> (commits af31fab, 3390928, 3740832, 886d942 — origin está em 5ea524f).
> Se URL retornar 404 ou código antigo, aguardar sync automático Replit (~5min).

---

## BASE RAW URL
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/
```

---

## 1. 🔬 MOTOR CLÍNICO — Backend (Express API)

### Rota principal do motor clínico
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/anamnese.ts
```
**O que tem:** Questionário PADCOM V9 (Q001-Q041), `POST /anamnese/:id/ativar-motor`
(lê `regras_motor` → extrai sinais semânticos → gera `sugestoes`),
GET/POST/PATCH de anamneses.

### Engine de regras do motor
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/motor-toggles.ts
```
**O que tem:** Modalidades ativas (injetável IM/EV, implante, fórmula, protocolo, exame),
caderno de resolução, mapeamento RACL/RACJ obrigatórios e condicionais.

### RASX Engine (gerador de documentos RAS)
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/rasxEngine.ts
```
**O que tem:** Enums `BlocoRAS` (CLIN/JURI/FINA/ACOM/4100), subgrupos, hash SHA-256
manifesto, estrutura dos 5 blocos do documento clínico-jurídico.

---

## 2. 📋 CATÁLOGO TERAPÊUTICO — Backend

### Rota catálogo completo
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/catalogo.ts
```
**O que tem:** GET /injetaveis, /formulas, /implantes, /protocolos, /exames,
/formula-blend, /regras-implantes, e a rota consolidada `GET /catalogo/completo`
(agrega tudo numa resposta).

### Rota exames inteligentes
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/examesInteligente.ts
```

---

## 3. 🖥️ FRONTEND — Páginas React (Motor Clínico)

### Nova Anamnese (seleção de paciente)
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/clinica-motor/src/pages/anamnese/nova.tsx
```

### Anamnese detalhe (preenchimento + ativar motor)
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/clinica-motor/src/pages/anamnese/[id].tsx
```

### Lista de anamneses
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/clinica-motor/src/pages/anamnese/index.tsx
```

### Pedidos de exame
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/clinica-motor/src/pages/pedidos-exame/index.tsx
```

### RAS (prescrições)
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/clinica-motor/src/pages/ras/index.tsx
```

### Paciente detalhe
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/clinica-motor/src/pages/pacientes/[id].tsx
```

---

## 4. 🗄️ DATABASE SCHEMA (Drizzle ORM)

### Schema principal
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/lib/db/src/schema/index.ts
```

### Browse pasta schema completa (GitHub)
```
https://github.com/caio-padua/Integrative-Health-Engine/tree/feat/dominio-pawards/lib/db/src/schema
```

### Migrations (todos os 85 scripts SQL aplicados)
```
https://github.com/caio-padua/Integrative-Health-Engine/tree/feat/dominio-pawards/artifacts/api-server/src/db/migrations
```
Migrations chave:
- `034_*` — coluna `posologia_estruturada` em `itens_terapeuticos`
- `040_*` — `codigo_semantico` em pacientes
- `044_*` — RBAC Wave 13 F1
- `056_*` — retenção auditoria painel
- `060_*` — cão-de-guarda webhook ZapSign silencioso

---

## 5. 🔗 ZapSign / Assinatura Digital ICP-Brasil

### Service de assinatura
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/assinatura/service.ts
```

### Webhook ZapSign
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/routes/assinaturasWebhook.ts
```

### Cão-de-guarda silêncio webhook
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/feat/dominio-pawards/artifacts/api-server/src/lib/recorrencia/webhookAssinaturaSilencio.ts
```

---

## 6. 📁 FÓRMULAS — Estado atual no banco (15/mai/2026)

### 11 fórmulas em `itens_terapeuticos` (disponíveis pro motor)

| Código | Nome | Observação |
|---|---|---|
| `FORM ESTE CAPI 001` | Fórmula Suporte Capilar Base | — |
| `FORM HORM MODU 001` | Fórmula Modulação Hormonal Base | — |
| `FORM INFL DREN 001` | Fórmula Drenagem e Modulação Inflamatória | — |
| `FORM INTE ATAQ 001` | Fórmula Intestino Reparação Fase 1 | Distensão/constipação |
| `FORM META SUPO 001` | Fórmula Suporte Metabólico | Ajustar estimulantes |
| `FORM MINE REPO 001` | Fórmula Reposição Mineral Base | Reposição básica |
| `FORM NEUR CALM 001` | Fórmula Modulação Ansiedade Base | — |
| `FORM NEUR FOCO 001` | Fórmula Foco e Desempenho Cognitivo | — |
| `FORM NEUR SONO 001` | Fórmula Sono e Recuperação | — |
| `FORM PERF SUPO 001` | Fórmula Pré-Treino Suporte | Ajustável |
| `FORM TIRE MODU 001` | Fórmula Suporte Tireoide Modulação Base | Ajuste farmácia permitido |

### 12 blends em `formula_blend`

| Código | Nome | Função | Via |
|---|---|---|---|
| `BLEND-ANTIOX-01` | Fórmula Antioxidante Master | Antioxidante sistêmico | VO |
| `BLEND-DETOX-01` | Fórmula Hepato-Detox | Detoxificação hepática | VO |
| `BLEND-HORM-F01` | Fórmula Suporte Hormonal Feminino | Modulação hormonal feminina | VO |
| `BLEND-HORM-M01` | Fórmula Suporte Hormonal Masculino | Modulação hormonal masculina | VO |
| `BLEND-IMUNE-01` | Fórmula Imunomoduladora | Suporte imunológico | VO |
| `BLEND-METAB-01` | Fórmula Metabólica Integrativa | Otimização metabólica | VO |
| `BLEND-NEURO-01` | Fórmula Neuroprotetora | Suporte cognitivo e neuroproteção | VO |
| `BLEND-SLEEP-01` | Fórmula Sono Reparador | Regulação ciclo sono-vigília | VO |
| `FORM_FOCO_BLND_ORAL_002` | Blend Foco Dia | Foco e energia | VO |
| `FORM_HEPA_BLND_ORAL_004` | Blend Hepático | Suporte hepático | VO |
| `FORM_META_BLND_ORAL_003` | Blend Metabólico | Metabólico emagrecimento | VO |
| `FORM_SONO_BLND_ORAL_001` | Blend Sono Noite | Sono restauração | VO |

### Regras de motor ativas pra fórmulas (7 regras)
```sql
-- Consulta ao vivo:
SELECT regra_id, palavra_chave, segmento, codigo_referencia, prioridade
FROM regras_motor WHERE segmento='formula' AND ativo='SIM';
```
Cobrem: FADIGA/CANSAÇO → FORM META MITO 001 | RESISTÊNCIA INSULÍNICA/DIABETES/GANHO PESO → FORM GLIC INSU 001 | HIPOTIREOIDISMO/HASHIMOTO → FORM TIRE MODU 001

**Lacuna**: as 8 fórmulas restantes (capilar, hormonal, inflamatória, intestino, mineral, ansiedade, foco, pré-treino) NÃO têm regra de motor ainda — não são sugeridas automaticamente.

---

## 7. ⚠️ GIT SYNC — Status em 15/mai/2026

| Commit | Mensagem | Status |
|---|---|---|
| `af31fab` | Add operational briefing prescribing doctor | ⚠️ só local |
| `3390928` | Update component registration blueprint emails | ⚠️ só local |
| `3740832` | Update documentation system status hosting options | ⚠️ só local |
| `886d942` | Add images documentation Replit Twilio | ⚠️ só local |
| `5ea524f` | Add screenshot Plan vs Build mode toggle | ✅ no GitHub |

**O Dr. Claude lê o GitHub** — se as URLs retornarem código/docs desatualizados,
é porque o Replit ainda não fez o push automático.
Workaround: abrir `github.com/caio-padua/Integrative-Health-Engine/commits/feat/dominio-pawards`
e confirmar se `af31fab` já aparece lá antes de ler os raws.

---

*Atualizado: 2026-05-15 por Dr. Replit.*
