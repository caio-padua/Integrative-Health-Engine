# 12 — Análise da Encomenda 02: Sinapses INJE/SORO/IMPL + Craniotomia do Motor

> **De**: Dr. Replit (executor)
> **Para**: Caio (revisor/CEO) + Dr. Claude (orquestrador)
> **Data**: 17/mai/2026
> **Sobre**: PDF `Enc_07_replit_12_SINAPSES_INJETAVEIS_E_CRANIOTOMIA_MOTOR_1779043532010.pdf`
> (748 linhas) — 83 sinapses (55 INJE + 11 SORO + 17 IMPL) + Craniotomia
> do Motor (CRUD admin pra Caio) + plano consolidado Sprint A-F.
> + Cola "respostas dos 6 gaps" do doc 10 (38 linhas)
> **Pré-leitura**: docs [08](./08_IGNICAO_MOTOR_E_SINAPSES.md),
> [10](./10_INJETAVEIS_IM_EV_E_IMPLANTES.md),
> [11](./11_ANALISE_ENCOMENDA_01_80_FORMULAS.md).

---

## §0 — TL;DR (semáforo executivo pro Caio)

A Encomenda 02 vem em **5 partes**:
- Parte 1: 55 sinapses INJE (MRI010–MRI084)
- Parte 2: 11 sinapses SORO (MRS001–MRS011)
- Parte 3: 17 sinapses IMPL (MRP010–MRP026)
- Parte 4: **Craniotomia do Motor** — CRUD admin completo pro Caio editar regras
- Parte 5: plano consolidado em **6 sprints (A→F)**

Validação técnica programática:

| # | Achado | Status | Bloqueia? |
|---|--------|--------|-----------|
| 1 | **23 de 83 códigos V4 não existem no catálogo real (CSV 04/05/06)** | 🔴 28% de divergência — Dr. Claude inventou itens fora do catálogo | **SIM** |
| 2 | **11 nicks B4 inventados** (FECM, ALAX, COQ1, NACX, VTC1, PCAP, MNXD, SILX, TRXM, PART, GLUT) | 🔴 não estão no dicionário 13 (373 nicks) | **SIM** |
| 3 | **Colisão V4 MRP012 = MRP013** (mesmo código `IMPL HORM SUBC ESTR 0001` pra Estradiol E Estriol) | 🔴 quebra unicidade declarada | **SIM** |
| 4 | **Divergências de via/dose** vs doc 10 em 8 itens (DMAE, BIOT, LIPO, CIT2, SILX, CoQ10, ATP, D-Ribose, Selênio) | 🟠 Caio decide se cataloga novas variantes ou ajusta | Sim — escolha |
| 5 | **Schema real é `itens_terapeuticos` (457 itens), não `formulas_master` (4)** | 🔴 doc 11 §3.1 reapareceu agora pra INJE/IMPL/SORO | **SIM** |
| 6 | **Coluna `tipo_uso` inexistente** (necessária pro Gap 5: Lidocaína/EDTA/Procaína = INSUMO_PROCEDIMENTO) | 🔴 migration nova | **SIM** |
| 7 | **`regras_motor.segmento` não tem `endovenoso` nem `implante`** ainda — só `exame/formula/injetavel/protocolo` | 🟠 ampliar CHECK ou aceitar valores livres | Sim (rápido) |
| 8 | **MRP011 Anastrozol "auto: sempre que TEST pellet masc"** = co-prescrição automática | 🔴 motor não suporta meta-regras (regra que dispara por OUTRA regra) | **SIM** |
| 9 | **Filtros idade <45/≥50 (MRS002/MRS003) + sexo (MRP010 masc, MRP012 fem)** | 🟠 motor precisa ler `paciente.data_nascimento` e `paciente.sexo` | Sim (rápido — colunas existem) |
| 10 | **QH03 (status menstrual) não existe na anamnese ainda** — guard-rail dos 4 pellets femininos | 🔴 mesmo blocker do Sprint A.5 doc 11 | **SIM** |
| 11 | **QC46/QC47 (gordura localizada / celulite) não existem ainda** — Dr. Claude pediu criar | 🟠 trivial (1 INSERT em perguntas) | Sim (rápido) |
| 12 | **Craniotomia do Motor (Parte 4)** = scope grande: 10 rotas + tabela auditoria + tela 3 visões + simulador | 🟢 viável como Sprint D autônomo | Não bloqueia Sprint A/B/C |
| 13 | **6 gaps do doc 10 respondidos pelo Dr. Claude** ✅ | 🟢 desbloqueados | Não |

**Veredito Dr. Replit**: o doc 12 é uma encomenda **clinicamente brilhante** (filtro idade pra fadiga, guard-rail QH03, co-prescrição Anastrozol+Test, soro substitui ≥3 injetáveis) **mas com 28% de divergência de catálogo + 3 anomalias estruturais que precisam ser resolvidas antes do UPSERT**. Caio + Dr. Claude precisam decidir:
1. Os 23 códigos ausentes são **novos itens a catalogar** (expandir catálogo CSV 04/05/06) ou Dr. Claude **ajusta pros nicks/doses existentes** (ex: NACX→NACE, FECM→FERR, PART→POO1, etc.)?
2. A divergência de via (vários EV→MUSC) é **nova variante terapêutica** ou erro de transcrição?
3. Aprova arquitetura proposta abaixo pra co-prescrição (MRP011) e guard-rails (QH03)?

---

## §1 — VALIDAÇÃO TÉCNICA AUTOMÁTICA

Rodei 83 códigos contra o catálogo real (CSV 04 injetáveis + 05 implantes
+ 06 soros = **191 códigos V4 catalogados**) e contra o dicionário 13
(373 nicks B4).

### §1.1 — 🔴 23 códigos V4 NÃO existem no catálogo real (28%)

| regra | Código proposto | Problema | Sugestão de correção |
|-------|----------------|----------|----------------------|
| MRI029 | `INJE ENDO SUPR FECM 0100` | Nick FECM (Carboximaltose Férrica) **não existe** — catálogo tem `FERR` (Ferritina exame!) ou ferro como `FESE` (Ferro Sérico exame). Não há **ferro injetável** no CSV 04. | **Catalogar novo item**: `INJE ENDO SUPR FECF 0100` (Ferro Carboximaltose Férrica 100mg) — clinicamente importante, falta no catálogo |
| MRI040/041 | `INJE ENDO SUPR ALAX 0600/0300` | Nick ALAX inventado — catálogo tem `AALP` (Ácido Alfa Lipoico 10mg, dose única) | **Catalogar 2 doses novas** OU ajustar pro `AALP` existente |
| MRI042 | `INJE ENDO SUPR COQ1 0050` | Nick COQ1 inventado — catálogo tem `COQ0` (CoQ10 **100mg**) | **Decidir**: catalogar `COQ1 0050` (50mg dose menor) OU usar `COQ0` existente |
| MRI043 | `INJE ENDO SUPR ATPX 0050` | Nick `ATPX` existe (ATP) mas dose catalogada é **20mg** (`ATPX 0020`), não 50mg | Catalogar `ATPX 0050` OU ajustar pra 20mg |
| MRI044 | `INJE ENDO SUPR DRIB 0100` | Nick `DRIB` existe mas dose catalogada é **500mg** (`DRIB 0500`) | Catalogar dose menor OU ajustar |
| MRI045 | `INJE ENDO SUPR NACX 0600` | Nick NACX inventado — catálogo tem `NACE` (NAC 300mg) | Catalogar `NACE 0600` OU ajustar pra 300mg |
| MRI046 | `INJE ENDO SUPR RESV 0050` | Nick `RESV` existe mas dose catalogada é **100mg** (`RESV 0100`) | Catalogar dose menor |
| MRI051/052 | `INJE ENDO SUPR VTC1 5000/10000` | Nick VTC1 inventado — catálogo tem `VITC` (Vit C **1g**) | Catalogar `VITC 5000` e `VITC 10000` (doses altas oncológicas) |
| MRI053 | `INJE ENDO SUPR SELE 0200` | Nick `SELE` existe mas dose catalogada é **80mcg** (`SELE 0080`) | Catalogar `SELE 0200` |
| MRI054 | `INJE ENDO SUPR TIMO 0001` | Nick `TIMO` existe mas dose catalogada é 50mg (`TIMO 0050`), não 0001 | Ajustar pra `TIMO 0050` |
| MRI060 | `INJE MUSC SUPR BIOT 0010` | Nick `BIOT 0010` existe **mas via é EV/SC**, não MUSC | Confirmar via |
| MRI061 | `INJE MUSC SUPR PCAP 0001` | Nick PCAP inventado — catálogo tem `POO3 0005` (Pool Capilar 5mg, SC/ID) | Ajustar pra `POO3 0005` OU catalogar PCAP |
| MRI062 | `INJE MUSC SUPR MNXD 0001` | Nick MNXD inventado — catálogo tem `MINO 0010` (Minoxidil 10mg, **ID**) | Ajustar pra `MINO 0010` OU catalogar MNXD via MUSC |
| MRI063 | `INJE MUSC SUPR SILX 0001` | Nick SILX inventado — catálogo tem `SILO 0020` (Silício 20mg, IM/SC/ID) | Ajustar pra `SILO 0020` |
| MRI064 | `INJE MUSC SUPR PILL 0001` | Nick `PILL` existe mas dose catalogada é 10mg (`PILL 0010`) | Ajustar |
| MRI065 | `INJE MUSC SUPR TRXM 0001` | Nick TRXM inventado — catálogo tem `ATRX 0008` (Ác. Tranexâmico 8mg, SC/ID) | Ajustar pra `ATRX 0008` ou nova catalogação |
| MRI070 | `INJE ENDO SUPR CURC 0001` | Nick `CURC` existe mas dose catalogada é 200mg (`CURC 0200`) | Ajustar |
| MRI071 | `INJE ENDO SUPR PART 0001` | Nick PART inventado — catálogo tem `POO1 0010` (Pool Artrose 10mg) | Ajustar pra `POO1 0010` |
| MRI072 | `INJE ENDO SUPR COND 0001` | Nick `COND` existe mas dose catalogada é 100mg (`COND 0100`) | Ajustar |
| MRI083 | `INJE ENDO SUPR TAUR 1000` | Nick `TAUR` existe mas dose catalogada é 200mg (`TAUR 0200`, e é Inositol+Taurina) | Catalogar L-Taurina pura 1g |
| MRI084 | `INJE ENDO SUPR GLUT 0600` | Nick GLUT inventado — catálogo tem `LGLU 1000` (L-Glutathion 1g) | Ajustar pra `LGLU 0600` (novo dose) ou `LGLU 1000` |

**Diagnóstico**: o Dr. Claude trabalhou com um **catálogo mental** mais
amplo do que o CSV 04 do Dr. Manus que materializei no doc 10. Há **duas
interpretações possíveis**:
- **Hipótese A**: catálogo CSV 04 está incompleto e o Dr. Claude tem
  razão — precisamos **expandir o catálogo** com 11 novas substâncias
  e ~12 novas doses (clinicamente justificável: ferro injetável,
  doses fracionadas de CoQ10/ATP/D-Ribose/NAC/Selênio/Vit C alta).
- **Hipótese B**: Dr. Claude usou nicks mnemônicos (FECM, NACX, VTC1,
  GLUT) sem consultar o dicionário 13 — devemos **rebatizar** pros
  nicks reais (`NACE`, `LGLU`, `VITC`, etc.) preservando o catálogo
  unificado.

**Sugestão Dr. Replit**: **Hipótese A pra 6 itens, Hipótese B pra 17**.
Critério: se o **item clínico** existe (substância + dose iguais) só
mudou o nick → Hipótese B (rebatizar). Se a substância/dose **não tem
correspondente** no catálogo → Hipótese A (catalogar novo).

| Item | Hipótese | Ação |
|------|----------|------|
| Ferro Carboximaltose 100mg | A | **Novo item** — não há ferro injetável no catálogo |
| ALA 600mg, 300mg | A | **Novas doses** — só existe AALP 10mg |
| CoQ10 50mg | A | **Nova dose** — só COQ0 100mg |
| ATP 50mg | A | **Nova dose** — só ATPX 20mg |
| Vit C 5g, 10g | A | **Novas doses** — só VITC 1g (doses oncológicas reais) |
| L-Glutathion 600mg | A | **Nova dose** — só LGLU 1g |
| NAC 600mg | B → ajustar pra `NACE` (rebatizar) OU A se 600 ≠ 300 | **Caio decide** |
| Selênio 200mcg | A | **Nova dose** — só SELE 80mcg |
| D-Ribose 100mg | A | **Nova dose** — só DRIB 500mg |
| Resveratrol 50mg | B → usar `RESV 0100` (mais comum) OU A | **Caio decide** |
| Timomodulina 0001 | B → ajustar pra `TIMO 0050` | Erro de dose, ajustar |
| Pool Capilar | B → ajustar pra `POO3 0005` | PCAP é redundante |
| Minoxidil | B → ajustar pra `MINO 0010` (ID) | MNXD via MUSC pode ser nova variante |
| Silício | B → ajustar pra `SILO 0020` | SILX é redundante |
| Pool Artrose | B → ajustar pra `POO1 0010` | PART é redundante |
| Ác. Tranexâmico | B → ajustar pra `ATRX 0008` | TRXM é redundante |
| Pill Food | B → ajustar pra `PILL 0010` | Erro de dose |
| Curcumina | B → ajustar pra `CURC 0200` | Erro de dose |
| Condroitina | B → ajustar pra `COND 0100` | Erro de dose |
| L-Taurina 1g (pura) | A | Catálogo só tem Inositol+Taurina 200mg |
| Biotina via MUSC | B → usar via EV existente | Confirmar via |

### §1.2 — 🔴 Colisão V4 MRP012 = MRP013 (Estradiol = Estriol)

Linhas 419-431 do PDF:
```
MRP012 — Estradiol pellet  →  IMPL HORM SUBC ESTR 0001
MRP013 — Estriol pellet    →  IMPL HORM SUBC ESTR 0001  ← MESMO CÓDIGO
```

**Quebra a regra "80/80 unicidade" prometida**. Sugestão Dr. Replit:
- `IMPL HORM SUBC ESTR 0001` → **Estradiol pellet** (preserva nick ESTR
  que já é Estradiol no dicionário 13 linha 163)
- `IMPL HORM SUBC ESLE 0001` → **Estriol pellet** (nick novo "ESLE" =
  ESLE pra Estriol, completando com L)

**Caio confirma o desambíguo?**

### §1.3 — 🟢 11 sinapses de SORO 100% consistentes

Todos os nicks (IMUN, MITO, ENER, META, DETO, COGN, PELE, ANT3, RECU,
AMIN, OXID) **já existem** no dicionário 13 como domínio ENDO. Códigos
V4 batem com o doc 10 §5. **Aprovação imediata** pro UPSERT (depois dos
sprints de schema).

### §1.4 — 🟢 17 sinapses de IMPL 16/17 consistentes (só MRP012/13 colide)

Todos os pellets do doc 10 §4 cobertos. Ressalva: `MET1` (Metformina
pellet) e `MNXD` não aparecem como nicks no dicionário mas o V4 completo
está no catálogo CSV 05. OK.

---

## §2 — RESPOSTAS DR. CLAUDE AOS 6 GAPS DO DOC 10 (cola anexada)

Sintetizando + integrando ao plano:

| Gap | Resposta Dr. Claude | Decisão técnica Dr. Replit |
|----:|---------------------|----------------------------|
| 1 | Criar `QC46 GORDURA LOCALIZADA` + `QC47 CELULITE` | 🟢 Trivial — 2 INSERTs em `perguntas` no Sprint A.5 |
| 2 | Soro Performance × Mito: desempate por idade + QG04 (PERF + <45 → Perf; <2x/sem OU ≥50 → Mito; ambos → médico escolhe) | 🟠 Motor precisa **ler `paciente.data_nascimento`** (existe ✅) e **calcular idade** + suportar `QG01<2x`, `QG01≥3x` (qualificadores). Mesmo blocker do Sprint A doc 11 §5.4 |
| 3 | Bridge QH03 guard-rail obrigatório: `MENO` → libera estradiol; `REGULAR` → bloqueia estrogênico; `IRREGULAR` → só progesterona | 🔴 **QH03 não existe** na anamnese hoje. Pré-req: criar pergunta QH03 com 3 valores enum (MENOPAUSA / REGULAR / IRREGULAR / NAO_APLICA). Sprint A.5 |
| 4 | Motor sugere **substância**, médico escolhe **dose** | 🟢 Confirma minha proposta no doc 10 §6.4. Persistir `dose_padrao` como dose orientativa, mas sugestão clínica omite dose. **Já compatível** com modelo atual (`sugestoes_clinicas` não tem coluna dose obrigatória) |
| 5 | Lidocaína/Procaína/EDTA = `tipo_uso = 'INSUMO_PROCEDIMENTO'` — fora do motor | 🔴 Coluna `tipo_uso` **não existe** em `itens_terapeuticos` (confirmei). Migration nova: `ADD COLUMN tipo_uso TEXT DEFAULT 'SUGESTAO_MOTOR' CHECK (tipo_uso IN ('SUGESTAO_MOTOR','INSUMO_PROCEDIMENTO'))` + UPDATE pras 3 substâncias |
| 6 | Soro = 1 item composto único, componentes no `composicao` (texto) | 🟢 Compatível com schema atual — `itens_terapeuticos.composicao text` já existe. Cada soro vira 1 row com `composicao = 'Vit C 1g + NAC 600mg + Selênio 200mcg'` |

---

## §3 — 🔴 ANOMALIAS ARQUITETURAIS NOVAS (reveladas pelo doc 12)

### §3.1 — 3 tabelas concorrentes pro catálogo terapêutico

| Tabela | Quantos itens | Uso aparente |
|--------|--------------:|--------------|
| `itens_terapeuticos` | **457** | ✅ Tabela real, com `codigo_padcom`, `composicao`, `via_uso`, `bloco_id`, `posologia_estruturada` |
| `formulas_master` | **4** | ⚠️ Quase vazia. Schema diferente (codigo_padcom + nome + categoria) |
| `revo_medicamentos` (de Wave Backfill #40) | ? | Usado pra RASX REVO PDFs (medicamentos prescritos por receita) |

**Confusão potencial**: O Dr. Claude no doc 11 falou de `formulas_master`,
agora no doc 12 fala de "UPSERT 80 fórmulas + 162 injetáveis + 32 implantes
+ 11 soros" sem dizer **em qual tabela**.

**Sugestão Dr. Replit**:
- **Decidir agora**: `itens_terapeuticos` é a **tabela única** pra
  catálogo do motor (já tem 457 itens, schema rico, coluna
  `posologia_estruturada` da Wave V40 backfill). `formulas_master`
  fica como cache/view derivada ou é descontinuada.
- Os "80 fórmulas + 162 INJE + 32 IMPL + 11 SORO" do doc 12 podem
  ser **subset dos 457** já existentes (precisa cruzar) OU **complemento**
  novo a inserir.

**Vou rodar query confirmatória** antes do Sprint B: `SELECT categoria,
COUNT(*) FROM itens_terapeuticos GROUP BY categoria` pra ver quantos
INJE/IMPL/SORO/FORM já estão lá.

### §3.2 — Co-prescrição automática (MRP011 Anastrozol)

```
MRP011 — Gatilho: "auto: sempre que TEST pellet masc"
         Código: IMPL HORM SUBC ANAS 0001
         Guard-rail: §5.5 — Anastrozol acompanha Testosterona masc
```

**Isso não é uma sinapse anamnese→item, é uma meta-regra item→item.**

O motor atual (linhas 182-351 da rota `POST /anamnese/:id/ativar-motor`)
gera sugestões **iterando sobre `regras_motor` e fazendo match com texto
de anamnese**. Não tem segundo passo "após gerar sugestões, aplicar
meta-regras que disparam por OUTRA sugestão".

**Sugestão Dr. Replit**: adicionar **Passo 6** no motor após geração
inicial das sugestões:
```pseudo
PASSO 6: Aplicar meta-regras de co-prescrição
  para cada meta_regra em regras_motor_meta:
    se TODAS as condicoes (codigo_v4 em sugestoes_geradas E filtros) baterem:
      adicionar sugestao do codigo_v4_destino com flag 'co_prescricao'
```

Nova tabela `regras_motor_meta` (migration aditiva):
```
- regra_id text
- codigo_v4_origem text   -- ex: IMPL HORM SUBC TEST 0001
- filtros jsonb           -- ex: {"paciente.sexo": "M"}
- codigo_v4_destino text  -- ex: IMPL HORM SUBC ANAS 0001
- motivo text             -- "Anastrozol acompanha Testosterona masc"
- prioridade text
- ativo text DEFAULT 'SIM'
```

MRP011 é o **caso seed** dessa tabela. Outros candidatos futuros:
- Vit K2 acompanha Vit D em altas doses
- Magnésio acompanha Vit D
- Sitagliptina acompanha Metformina (composição já existe na PADCOM)

### §3.3 — Filtros estruturados sobre paciente (idade, sexo, status menstrual)

O doc 12 introduz **3 tipos novos de filtro** que o motor atual não
suporta:

| Filtro | Origem | Exemplo |
|--------|--------|---------|
| Idade `<45` / `≥50` / `>40` | `paciente.data_nascimento` (✅ existe) | MRS002, MRS003, MRP017 |
| Sexo `masc` / `fem` | `paciente.sexo` (a confirmar) | MRP010 masc, MRP012 fem |
| Status menstrual QH03 | **Anamnese (não existe ainda)** | MRP012, MRP013, MRP014 |

**Sugestão Dr. Replit**: estender `regras_motor` com colunas opcionais
de filtro (migration aditiva):
```
- filtro_idade_min int
- filtro_idade_max int
- filtro_sexo text CHECK (filtro_sexo IN ('M','F','ANY'))
- filtro_anamnese jsonb  -- {"QH03": "MENOPAUSA"}
```

Defaults `NULL`/`ANY`/`NULL` → todas regras antigas continuam funcionando
sem alteração. Motor aplica filtro APÓS match de palavra-chave.

---

## §4 — CRANIOTOMIA DO MOTOR (Parte 4 do PDF — Sprint D)

Avalio a especificação como **excelente e bem dimensionada**. Pontos
importantes:

### §4.1 — Análise das 10 rotas propostas

| Rota | Status | Notas Dr. Replit |
|------|--------|------------------|
| `GET /api/motor/regras` (lista paginada + filtros) | 🟢 Trivial | Reuso `paginarLista` (lib existente) |
| `GET /api/motor/regras/:id` (detalhe + auditoria) | 🟢 Trivial | JOIN com `auditoria_sinapses_motor` |
| `POST /api/motor/regras` (criar) | 🟢 Médio | Validação Zod + insert auditoria |
| `PUT /api/motor/regras/:id` (editar) | 🟢 Médio | Diff payload_antes/depois pra auditoria |
| `DELETE /api/motor/regras/:id` (soft) | 🟢 Trivial | `UPDATE ativo='NAO'` + auditoria |
| `POST /api/motor/regras/bulk` (massa) | 🟠 Médio | Validar limites (máx 100 por chamada?) |
| `GET /api/motor/catalogo` (dropdown) | 🟢 Trivial | `SELECT codigo_padcom, nome FROM itens_terapeuticos WHERE disponivel=true` |
| `GET /api/motor/palavras-chave` (autocomplete) | 🟢 Trivial | `SELECT DISTINCT palavra_chave FROM regras_motor` |
| `GET /api/motor/estatisticas` (taxa aceitação) | 🟠 Depende Sprint E | Adiar pra Sprint E (trigger AFTER UPDATE) |
| `POST /api/motor/simular` (testar sinais) | 🟢 Médio | **Reusa motor real em modo dry-run** — não persiste, só retorna o que disparou |

### §4.2 — Migration 061 — auditoria_sinapses_motor

Schema proposto pelo Dr. Claude está **excelente** — mas falta o `criado_por`
no INSERT inicial das 100 regras (Sprint B). Sugiro adicionar:
```sql
-- ALEM do que ele propôs:
CREATE INDEX IF NOT EXISTS idx_aud_sinapse_usuario
  ON auditoria_sinapses_motor(usuario_id, ocorrido_em DESC);
```
Pra dashboard "quem mais edita o motor" no futuro.

### §4.3 — Frontend `/plataforma/motor-clinico`

3 visões propostas são **clinicamente úteis e bem priorizadas**:
- Visão 1 **POR GATILHO** (default) — Caio pensa por sintoma → vê todas
  sinapses → identifica gaps ("HIPERTENSÃO órfã!")
- Visão 2 **POR ITEM** — Caio pensa por substância → vê onde dispara
- Visão 3 **SIMULADOR** — Caio testa cenário sem persistir

Sugestão adicional Dr. Replit:
- **Visão 4: MAPA DE COBERTURA** (Sprint E após estatísticas) —
  heatmap `bloco × segmento` mostrando densidade de regras + taxa de
  aceitação. Esse é o "raio-X" estratégico do motor que o doc 08 §6
  pediu.

### §4.4 — Middleware `requireRole('platform_owner')`

🔴 **ATENÇÃO regra ferro Caio**: codebase usa `requirePerfil()`, **NÃO**
`requireRole()`. Replicar a regra exata aqui:
- Função: `requirePerfil('platform_owner', 'validador_mestre')`
- Campo DB: `usuarios.perfil`
- Nunca `role`

Vou confirmar o nome real da função na próxima sessão (provavelmente já
existe — foi criada no Wave 13 F1 doc 06).

---

## §5 — PLANO DE EXECUÇÃO REVISADO (consolidando docs 08+10+11+12)

Sprints propostos pelo Dr. Claude (A-F) **estão corretos em ordem**. Meu
único ajuste é **explodir o Sprint B** porque ele inclui muitas
operações independentes. Versão consolidada:

| Sprint | Conteúdo | Migrations | Risco |
|--------|----------|-----------|-------|
| **0** (decisões) | Caio responde §1.1 Hipótese A/B item-a-item + §1.2 colisão ESTR + §3.1 tabela única | — | — |
| **A** (matching) | Regex `\b`, score ponderado (Q010=5, QD=4, QC=3...), suporte qualificadores (=PERF, GRAVE, ≥3x), coluna `score` em `sugestoes_clinicas`, filtros idade/sexo/QH03 em `regras_motor` | 057 (score), 058 (filtros) | médio |
| **A.5** (anamnese) | Criar QC46+QC47+QH03 + adicionar `pergunta.codigo_semantico` em todas as perguntas Q010-Q041 → QC*/QD*/QE*/QG*/QH*/QI* | 059 (codigo_semantico) | baixo (precisa mapa Dr. Claude — pergunta aberta doc 11) |
| **B1** (catálogo unificado) | Decidir: `itens_terapeuticos` = canônica; `formulas_master` deprecada. Migration 060: ADD COLUMN `tipo_uso` + UPDATE Lidocaína/EDTA/Procaína | 060 | baixo |
| **B2** (codigo_v4) | Migration 061: `ADD COLUMN codigo_referencia_v4 text` em `regras_motor` (V13 intacto, Caminho B) | 061 | nulo |
| **B3** (UPSERT itens novos) | Inserir as **6 substâncias/doses novas** (Hipótese A: Ferro Carboximaltose, ALA 600/300, CoQ10 50, ATP 50, Vit C 5g/10g, L-Glutathion 600, L-Taurina 1g, NAC 600 se Caio confirmar) em `itens_terapeuticos` | seed | baixo |
| **B4** (UPSERT 80 fórmulas) | UPSERT 80 fórmulas (doc 11) em `itens_terapeuticos` com nicks pós-renomeação F12/F45 | seed | baixo |
| **B5** (UPSERT 83 regras) | UPSERT 83 regras (doc 12 Partes 1-3) com códigos ajustados conforme decisão §1.1 | seed | baixo |
| **B6** (bridge V13→V4) | UPDATE codigo_referencia_v4 nas 37 regras existentes (mapa do doc 11 §4) | seed | nulo |
| **C** (24 órfãos) | UPSERT regras-mãe pros 24 blocos órfãos (doc 08 §6) + arquivar duplicados BLK001/BLK0001 | seed | baixo |
| **D** (Craniotomia MVP) | Migration 062: `auditoria_sinapses_motor` + tabela `regras_motor_meta` (co-prescrição) + 10 rotas CRUD + frontend 3 visões + simulador | 062 | médio |
| **E** (feedback loop) | `regras_motor_estatisticas` + trigger AFTER UPDATE em `sugestoes_clinicas` + Visão 4 mapa cobertura | 063 | médio |
| **F** (refactor) | Extrair lógica pra `services/motorClinico/ignicao.ts` + unit tests função-pura | — | baixo |

**Reversibilidade**: cada sprint roll-backable via `ativo='NAO'`. Caminho
B preservado em tudo.

---

## §6 — GAPS E PERGUNTAS FINAIS PRO DR. CLAUDE

1. **Decisão Hipótese A/B item-a-item** (§1.1): aprovar minha matriz das
   21 linhas ou ajustar caso-a-caso?
2. **Colisão MRP012/MRP013** (§1.2): aprova `ESTR` (Estradiol) +
   `ESLE` (Estriol)?
3. **Tabela canônica do catálogo** (§3.1): `itens_terapeuticos` (457
   itens, schema rico) é a fonte única OU manter `formulas_master`
   como agregado de fórmulas?
4. **Meta-regras de co-prescrição** (§3.2): aprovar tabela
   `regras_motor_meta` separada? Caso seed é MRP011 (Anastrozol+Test) —
   há outros casos previstos no manifesto PADCOM (Vit D+K2, D+Mg, etc.)
   que vão pra essa tabela?
5. **Filtros estruturados** (§3.3): aprovar colunas
   `filtro_idade_min/max/sexo/anamnese` em `regras_motor`?
6. **QH03 enum**: confirma valores `MENOPAUSA / REGULAR / IRREGULAR /
   NAO_APLICA`? E `MENOPAUSA` cobre peri+menopausa+pós ou separar
   `PERI / MENOPAUSA / POS_MENO`?
7. **Mapa Q010-Q041 → QC*/QD*/QE*/QG*/QH*/QI***: ainda pendente do
   doc 11 §7.1 — sem isso o Sprint A.5 fica empacado.
8. **Substâncias INSUMO_PROCEDIMENTO (gap 5)**: só Lidocaína/Procaína/
   EDTA ou tem outras (DMSO? Soro fisiológico veículo?)?

---

## §7 — RECOMENDAÇÃO FINAL DR. REPLIT

**Encomenda 02 é tecnicamente sólida e clinicamente brilhante** (filtros
idade/sexo, guard-rail QH03, co-prescrição Anastrozol+Test, soro substitui
≥3 INJE da mesma categoria, dose escolhida pelo médico, INSUMOS fora do
motor). **Não executo HOJE** porque:

1. 🔴 **28% dos códigos V4 não batem com catálogo real** — precisa
   decisão Hipótese A/B do Caio antes de inserir
2. 🔴 **Colisão MRP012/MRP013** quebra unicidade declarada
3. 🔴 **3 schema migrations novos** (tipo_uso, codigo_referencia_v4,
   filtros estruturados em regras_motor) — totalmente aditivas, mas
   precisam ser feitas em ordem
4. 🔴 **QH03 não existe** na anamnese — sem isso 4 sinapses femininas
   (MRP012/13/14 + filtro) ficam órfãs
5. 🔴 **Co-prescrição (MRP011)** precisa de tabela nova
   `regras_motor_meta` — arquitetura nova

**Próximo passo seguro**: Caio responde §6 + escolhe Hipótese A/B do
§1.1. Aí destravo Sprints 0→F na ordem do §5, **um por sessão**, cada
um reversível.

Zero código tocado nesta análise. Apenas auditoria automatizada
(programaticamente cruzei 83 códigos vs 191 catalogados vs 373 nicks) +
documento.
