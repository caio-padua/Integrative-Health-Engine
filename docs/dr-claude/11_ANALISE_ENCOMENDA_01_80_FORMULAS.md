# 11 — Análise da Encomenda 01: 80 fórmulas Dr. Claude codificadas V4.0

> **De**: Dr. Replit (executor)
> **Para**: Caio (revisor/médico) + Dr. Claude (orquestrador)
> **Data**: 17/mai/2026
> **Sobre**: PDF `Enc_01_replit_1779042564273.pdf` — 80 fórmulas (F01–F80)
> codificadas em PADCOM V4.0 pelo Dr. Claude, agrupadas em 17 grupos
> clínicos, com vocabulários B2 (18 áreas) + B3 (~30 funções) + gatilhos
> de anamnese + SQL UPSERT amostra.

---

## §0 — TL;DR (semáforo executivo pro Caio)

| # | Achado | Status | Bloqueia execução? |
|---|--------|--------|--------------------|
| 1 | **Unicidade dos 80 códigos completos** | 🟢 80/80 únicos | Não |
| 2 | **Unicidade B4 dentro de B1+B2+B3** | 🟢 100% cumprida | Não |
| 3 | **Colisões de nick B4 com dicionário existente** | 🟠 10 colisões (8 OK por domínio, 2 a renomear) | Não — só polimento |
| 4 | **Schema real `formulas_master` vs SQL proposto** | 🔴 BLOCKER — colunas com nomes diferentes | **SIM** |
| 5 | **Coluna `regras_motor.codigo_referencia_v4` inexistente** | 🔴 BLOCKER — não existe no DB | **SIM** (confirma Sprint B doc 08) |
| 6 | **Gatilhos `QC*/QD*/QE*/QG*/QH*/QI*` vs anamnese atual** | 🔴 BLOCKER — anamnese hoje é `Q010-Q041` numerada | **SIM** |
| 7 | **Qualificadores `GRAVE`, `=HIPER`, `≥3x`** | 🟠 motor atual não suporta (só `includes()`) | Sim, pra parte das regras |
| 8 | **Bridge das 11 fórmulas legadas (CSV 07) → 80 novas** | 🟠 não fornecido pelo Dr. Claude | Sim, pra preservar V13 |
| 9 | **Decisão clínica Mio-inositol HORM vs META** | 🟡 pergunta aberta do Dr. Claude pro Caio | Não |
| 10 | **Faltam fórmulas vs Google Doc original do Caio?** | 🟡 Caio confirma | Não |

**Veredito Dr. Replit**: a codificação V4.0 das 80 fórmulas está
**clinicamente coerente e tecnicamente bem-formada**. Mas a executação
do UPSERT **HOJE quebraria** por 3 motivos puramente de infra
(`formulas_master.codigo_formula` não existe → na verdade chama-se
`codigo_padcom`; coluna `codigo_referencia_v4` não existe em
`regras_motor`; gatilhos `QC*` não casam com a anamnese atual).

A solução é:
1. Caio responde as 4 perguntas clínicas do Dr. Claude (§5)
2. Dr. Claude responde os 3 BLOCKERS de infra (§3) — decidir se a
   correção é minha ou dele
3. Eu executo Sprint A (alinhar schema + adicionar coluna v4) +
   Sprint B (bridge V13→V4 do doc 08) **antes** do UPSERT em massa

---

## §1 — VALIDAÇÃO TÉCNICA AUTOMÁTICA

Rodei programaticamente os 80 códigos (script no scratch) contra:
- as próprias regras de unicidade da V4.0
- o dicionário 13 (373 nicks B4 já catalogados)
- o schema real do DB (`information_schema.columns`)

### §1.1 — Unicidade dos 80 códigos completos (`B1 B2 B3 B4 SEQ`)

🟢 **80 códigos, 80 únicos**. Zero colisão completa. Dr. Claude cumpriu
a promessa.

### §1.2 — Unicidade B4 dentro de B1+B2+B3 (regra V4.0)

🟢 **100% cumprida**. Os 3 casos com B4=`SONO` (F20/F21/F22) usam B3
diferente (`INDU/SACN/CTRL`), então respeitam a regra. Mesmo pra B4
`FITO` (F17 e F55) — diferem em B2.

### §1.3 — Distribuição B2 (verificação de balanceamento)

| B2 | # fórmulas | B2 | # fórmulas |
|----|-----------:|----|-----------:|
| HORM | 12 | VITA | 4 |
| NEUR | 9 | PERF | 4 |
| INTE | 9 | GAST | 3 |
| CAPI | 8 | HEPA | 2 |
| META | 7 | COGN | 2 |
| TIRE | 6 | VASC | 2 |
| MENO | 6 | ANTI | 2 |
| | | PARA | 2 |
| | | ORTO | 1 |
| | | PROS | 1 |

🟢 Distribuição condiz com perfil da clínica integrativa do Caio
(hormonal + neuro + intestinal liderando). **Sub-representação ORTO/PROS** —
considerar se faltou (ver §5).

### §1.4 — Colisões B4 com dicionário existente (373 nicks)

🟠 **10 colisões detectadas** — análise caso-a-caso:

| F# | B4 | Fórmula nova | Nick existente colidente | Veredito |
|----|----|--|--|----------|
| F09 | `ADEK` | Vitaminas Lipossol ADEK | ADEK 100000UI [INJE] | 🟢 **Aceitar** — domínio FORM ≠ INJE, código completo distinto, nome real explícito |
| F12 | `MINO` | Mio-inositol | MINOXIDIL (10mg) [INJE] | 🟠 **Renomear**: `MIOI` (mio-inositol) — MINO é mnemônico forte de Minoxidil; manter coerência |
| F20 | `SONO` | Indutor Sono Fitoterápico | FORMULA SONO E RECUP [FORM] | 🟠 **Decisão**: legada é "Sono e Recuperação" genérica → mapear como **bridge** (ver §4) |
| F21 | `SONO` | Sachê Noturno | (idem) | 🟢 Aceitar — B3=SACN distingue |
| F22 | `SONO` | Sono Psicotrópico | (idem) | 🟢 Aceitar — B3=CTRL distingue |
| F27 | `CORT` | Cortisol Isomolecular | CORTISOL [EXAM] | 🟢 Aceitar — domínio FORM ≠ EXAM |
| F29 | `NALT` | Naltrexone+Anti-refluxo | NALTREXONA PELLET [IMPL] | 🟢 Aceitar — FORM ≠ IMPL |
| F31 | `ESTR` | Moduladores Estrogênicos | ESTRADIOL [EXAM] / ESTRADIOL PELLET [IMPL] | 🟢 Aceitar — FORM ≠ EXAM/IMPL |
| F45 | `CAPS` | Termogênico Pré-Treino caps | CAPSULA ENDOSCOPICA [EXAM] | 🟠 **Renomear**: `TPRX` (termog. pré-treino) — `CAPS` no contexto FORM PERF vai confundir auditoria (sugere "cápsula" como forma farmacêutica, não como produto) |
| F64 | `PROG` | HRT Progesterona isolada | PROGESTERONA [EXAM] | 🟢 Aceitar — FORM ≠ EXAM (e PROG é o mnemônico óbvio) |

**Resumo**: 8 colisões são **seguras** (mesmo nick, domínios distintos —
código completo `B1 B2 B3 B4 SEQ` continua único). **2 colisões devem
ser renomeadas** por risco de confusão semântica (F12, F45).

### §1.5 — Conformidade da regra "B4 ≤ 4 letras completado com X"

🟢 Cumprida. Casos detectados:
- `T3XX` / `T4XX` (T3 isolado / T4 isolado) — 2 letras + 2X ✅
- `HCLX` (HCl) — 3 letras + 1X ✅
- `EEXX` (Estriol+Estradiol) — 2 letras + 2X ✅
- `BUTX` (Butirato) — 3 letras + 1X ✅
- `TMGX` (TMG/Betaína) — 3 letras + 1X ✅
- `ATPX/ATPX` etc. seguem o padrão histórico ✅

---

## §2 — VALIDAÇÃO DOS VOCABULÁRIOS B2 E B3

### §2.1 — B2 (18 áreas declaradas, 17 usadas)

Comparando com **CSV 12_blocos.csv** (31 blocos motor) + **CSV 07_formulas.csv**
(B2s existentes: GERA, INTE, NEUR, HORM, PERF, ESTE, META, TIRE) — a
Encomenda 01 **expande** o vocabulário de B2 com:

| Novos B2 (não existiam) | Justificativa Dr. Replit |
|---|---|
| TIRE, VITA, HEPA, GAST, NEUR, HORM, COGN, PERF, CAPI, VASC, ORTO, INTE, ANTI, PROS, MENO, PARA | 🟢 **Aceitar todos** — semânticos, sem abreviação ambígua, condizem com blocos do CSV 12 |

⚠️ **Conflito de B2 entre legado e novo**:
- Legado CSV 07: `ESTE` (estético) — F47-F54 usam `CAPI` ao invés.
  Bridge: mapear `FORM ESTE SUPO SUPO 0001` (legado) → `FORM CAPI ORAL CPBS 0001` (F47).
- Legado CSV 07: `GERA` (geral) — Encomenda 01 não usa. Bridge:
  - `FORM GERA MODU DRE1` → equivale ao quê? **Drenagem inflamatória** — não tem direto na Enc 01. Talvez bridge para `FORM ANTI BASE ALAX 0001` (F67) ou similar. **Pergunta pro Dr. Claude**.
  - `FORM GERA MANI FOCO` → F41/F42 (`COGN BASE CGBS`/`COGN NOOT CGAV`)
  - `FORM GERA REPO REPO` → F11 (`VITA BASE MGDU`) ou F58 (`VITA REPO FEAB`)

### §2.2 — B3 (~30 funções declaradas, 29 usadas)

🟢 **Aceitar todos**. Destaque:
- `CTRL` (controlado/psicotrópico) é semanticamente forte — fortalece
  auditoria farmacovigilância (já temos hook RASX REVO 5%/10%).
- `SERM` (modulador receptor estrogênico seletivo) — F32/F33 — preciso e
  abreviação técnica reconhecida (Raloxifeno/Tamoxifeno).
- `SACN` (sachê noturno) vs `SACH` (sachê genérico) — **distinção sutil**.
  Sugerir consolidar como `SACH` + atributo separado, OU manter
  diferenciação se Caio quer protocolo noturno isolado. **Pergunta pro Caio**.

---

## §3 — 🔴 BLOCKERS DE INFRA (precisam ser resolvidos antes do UPSERT)

### §3.1 — Schema real `formulas_master` ≠ schema do SQL proposto

O SQL exemplo do Dr. Claude (PDF §SQL UPSERT, linha ~521) faz:

```sql
INSERT INTO formulas_master (codigo_formula, nome_formula,
  funcao_principal, classe_terapeutica, ativa) VALUES (...)
ON CONFLICT (codigo_formula) DO UPDATE SET nome_formula = ...
```

**Realidade do DB hoje** (`SELECT column_name FROM
information_schema.columns WHERE table_name='formulas_master'`):

| Coluna real | Coluna assumida pelo Dr. Claude |
|------------|--------------------------------|
| `codigo_padcom` | ❌ `codigo_formula` |
| `nome` | ❌ `nome_formula` |
| `categoria` | ❌ `classe_terapeutica` |
| `funcao_principal` | ✅ existe |
| `ativo` (bool) | ❌ `ativa` (gênero feminino) |
| `via`, `composicao`, `dose_padrao`, `efeitos_esperados[]`, `efeitos_colaterais_possiveis[]`, `contraindicacoes[]` | — (Dr. Claude não citou) |

**Veredito**: o UPSERT **falha imediatamente** (`column "codigo_formula"
does not exist`). Já testei a query no DB — confirma.

**Decisão necessária (Caio + Dr. Claude)**:
- **Opção A** (preferida Dr. Replit): renomear colunas reais via
  migration aditiva (`ALTER TABLE ... RENAME COLUMN`) seguindo regra
  semântica do Caio — mas isso **não é** "aditivo IF NOT EXISTS",
  é estrutural. Risco médio.
- **Opção B**: o Dr. Replit ajusta o SQL UPSERT pra usar os nomes reais
  (`codigo_padcom`, `nome`, `categoria`, `ativo`). Risco zero, mas
  **mantém a divergência semântica** (não-completa) que o Caio veta.
- **Opção C** (recomendada): migration aditiva **criando** colunas
  novas `codigo_formula text` + `nome_formula text` + `classe_terapeutica
  text` + `ativa bool` como **alias** populados via trigger
  espelhando os antigos. Mantém V13 intacto, satisfaz nomenclatura
  proposta pelo Dr. Claude, zero `db:push`.

Hoje o DB tem **apenas 4 fórmulas** em `formulas_master` (vs 80 a
inserir + 11 do CSV legado) — janela ótima pra resolver agora.

### §3.2 — `regras_motor.codigo_referencia_v4` não existe

O SQL proposto faz `INSERT INTO regras_motor (..., codigo_referencia,
codigo_referencia_v4, ...) ON CONFLICT (regra_id) DO UPDATE SET
codigo_referencia_v4 = ...`. A coluna **não existe**.

Hoje `regras_motor` tem 11 colunas e **apenas `codigo_referencia`**
(formato V13 antigo, ex: `EXAM TIRE BASI 001`, `FORM TIRE MODU 001`).

**Isso confirma exatamente o que escrevi no [doc 08 §Sprint B](./08_IGNICAO_MOTOR_E_SINAPSES.md)** —
a migration 057 aditiva (`ALTER TABLE regras_motor ADD COLUMN IF NOT
EXISTS codigo_referencia_v4 text`) é pré-requisito. Espelha exatamente
o que a migration 025 já fez em outra tabela (`codigos_referencia`).

**Decisão necessária**: Dr. Replit dispara migration 057 agora
(autocontida, zero risco, espelha migration 025) **antes** do UPSERT.
Caminho B (não dropar V13) preservado.

### §3.3 — Gatilhos `QC*/QD*/QE*/QG*/QH*/QI*` referenciam anamnese REBUSCADA

A Encomenda 01 usa gatilhos como `QC22,QD17,QC15,QG04=HIPER` — esses
códigos referenciam o **BLOCO REBUSCADO** da anamnese descrito no doc 09
(blocos A–J, com `QC` = "Queixas Crônicas", `QD` = "Doenças", `QE` =
"Exames alterados", `QG` = "Hábitos", `QH` = "Hormonal", `QI` = "Sintomas
não-orgânicos").

**Anamnese atual no DB** (do doc 08 §3): perguntas numéricas
`Q010`, `Q012`, `Q013`, `Q014`, `Q030`, `Q031`, `Q033`, `Q041`. **Não há
nada começando com QC/QD/QE/QG/QH/QI** ainda.

**Veredito**: as 80 regras_motor podem ser inseridas com `palavra_chave`
literal `QC22`, etc., mas **nunca disparariam** até a anamnese ser
migrada pro novo esquema A-J. Isso é o **Sprint C inteiro** do doc 08
(criar 24 blocos órfãos como regras_motor reais).

**Decisão necessária**: ordem de operações precisa ser:
1. Sprint A doc 08 (regex `\b` + score) — pré-req técnico
2. Sprint B doc 08 (bridge V13→V4, **migration 057** acima)
3. **NOVO Sprint A.5**: migrar anamnese atual → adicionar
   `pergunta.codigo_semantico` (`QC22`, `QD17`, etc.) aditivamente,
   sem dropar IDs numéricos. **Pergunta pro Dr. Claude**: ele já tem
   o mapa Q010 ↔ QCxx ou eu deduzo do contexto?
4. UPSERT das 80 fórmulas (Encomenda 01) + 80 regras_motor com
   `codigo_referencia_v4` apontando pros novos códigos
5. Sprint C doc 08: criar regras pros 24 blocos órfãos restantes

---

## §4 — BRIDGE V_LEGADO → V4.0 DAS 80 NOVAS (NÃO FORNECIDO PELO DR. CLAUDE)

O CSV 07 tem 11 fórmulas legadas. **Nenhuma sobrevive 1:1** na Encomenda
01 — são todas mapeamentos N:1 ou 1:N. Proposta minha de bridge,
**aguardando ratificação Dr. Claude**:

| Legado (CSV 07) | Bridge V4.0 (Encomenda 01) | Confiança |
|----------------|----------------------------|-----------|
| `FORM TIRE MODU SUP2 0001` (Suporte Tireoide Base) | `FORM TIRE BLEN TCOM 0001` (F05 Blend Tireoide Completo) | 🟢 alta |
| `FORM HORM MODU MOD1 0001` (Modulação Hormonal Base) | `FORM HORM MODU ESTR 0001` (F31 Moduladores Estrogênicos) | 🟠 média (legado é mais genérico) |
| `FORM NEUR MODU MODU 0001` (Modulação Ansiedade Base) | `FORM NEUR ANSI FITO 0001` (F17 Ansiolítico Fitoterápico) | 🟢 alta |
| `FORM NEUR MANI SONO 0001` (Sono e Recuperação) | `FORM NEUR INDU SONO 0001` (F20 Indutor Sono) | 🟢 alta |
| `FORM META SUPO SUP1 0001` (Suporte Metabólico) | `FORM META TERM MBOL 0001` (F30 Termogênico Metabólico) | 🟠 média |
| `FORM PERF SUPO PRET 0001` (Pré-Treino Suporte) | `FORM PERF PREX SACH 0001` (F43 Pré-Treino Sachê) | 🟢 alta |
| `FORM ESTE SUPO SUPO 0001` (Suporte Capilar Base) | `FORM CAPI ORAL CPBS 0001` (F47 Capilar Oral Completo) | 🟢 alta |
| `FORM INTE REPA INTE 0001` (Intestino Reparação Fase 1) | `FORM INTE FASE PRB1 0001` (F70 Probiótico Fase 1A) | 🟢 alta |
| `FORM GERA REPO REPO 0001` (Reposição Mineral Base) | `FORM VITA BASE MGDU 0001` (F11 Magnésio Duo) | 🟠 média (legado é multi-mineral) |
| `FORM GERA MANI FOCO 0001` (Foco Cognitivo) | `FORM COGN BASE CGBS 0001` (F41 Cognitivo Base) | 🟢 alta |
| `FORM GERA MODU DRE1 0001` (Drenagem+Modulação Infl.) | **NENHUMA equivalente direta na Enc 01** | 🔴 **GAP** — pedir Dr. Claude criar F81 (`FORM ANTI BLEN DREN`?) ou aceitar como fórmula descontinuada |

**Operacionalização**: após Sprint B (migration 057), preencher
`regras_motor.codigo_referencia_v4` com a 2ª coluna acima quando a
`codigo_referencia` der match na 1ª coluna. Zero overwrite, V13 intacto.

---

## §5 — RESPOSTAS ÀS 4 PERGUNTAS QUE O DR. CLAUDE FEZ PRO CAIO

Reproduzo as perguntas exatas (PDF linha ~559) com minha leitura técnica.
**A decisão é clínica → Caio responde**:

### 5.1 — "Os B2 (área) estão corretos clinicamente? Ex: Mio-inositol em HORM faz sentido ou deveria ser META?"

🟡 **Caio decide**. Minha leitura: **AMBOS** estão corretos
(mio-inositol cobre SOP → HORM E resistência insulínica → META).
Sugestão técnica: **1 fórmula F12 + 2 regras_motor** com
`codigo_referencia_v4` idêntico mas gatilhos diferentes:
- `regra_id=MRF012H` → `palavra_chave=QD24` (SOP) → HORM
- `regra_id=MRF012M` → `palavra_chave=QD05,QC16` → META

Resolve a ambiguidade sem duplicar catálogo.

### 5.2 — "Os B4 (nicks) são intuitivos o suficiente? Ex: SONO, LIBI, PRST, CGBS"

🟡 Maioria sim. Apontamentos:
- `SONO`, `LIBI`, `PRST` → 🟢 intuitivos
- `CGBS` (Cognitivo Base) → 🟠 **um pouco críptico**; sugerir `COGB`
  ou `BCOG`. Caio decide.
- `MINO` (Mio-inositol) → 🔴 **renomear pra `MIOI`** (ver §1.4)
- `CAPS` (F45) → 🔴 **renomear pra `TPRX`** ou similar (ver §1.4)
- `SACN` vs `SACH` → 🟡 unificar?

### 5.3 — "Alguma fórmula faltou? Compare com seu Google Doc original"

🟡 **Só Caio sabe**. Apontamento técnico Dr. Replit: gaps que detectei
no doc 09/10 e não vejo cobertos:
- Drenagem inflamatória standalone (era `FORM GERA MODU DRE1` no
  legado). Vira F81?
- Soluções pra **gordura localizada subcutânea** (lipólise injetável SC
  do doc 10 §2.8) — Desoxicolato/Liporeductyl/Tripeptídeo-41. Tem
  fórmula equivalente oral?
- Anastrozol oral ou só pellet? (Encomenda só tem F31 `ESTR` genérico
  como modulador estrogênico; Anastrozol específico está só como
  pellet no §4 doc 10).

### 5.4 — "Os gatilhos da anamnese (última coluna) estão corretos clinicamente?"

🟡 **Caio valida clinicamente**. Apontamento técnico:
- **Qualificadores não-suportados** pelo motor atual:
  - `QC02 GRAVE` (F22 sono psicotrópico)
  - `QG04=PERF`, `QG04=HIPER`, `QG04=EMAG` (F35, F43, F44, F45)
  - `QG01≥3x` (F43, F44)
  - `QC11 LIBI` (F37 — `LIBI` aqui é qualificador? ou typo?)
  - `QC14 GRAVE,ESCABIOSE` (F80)
  - `HOMOCISTEINA` (F69 — exame alterado, não código Q*)
  - `QC28 fem` (F66 — sexo do paciente)

  → Motor atual usa só `includes()` ingênuo. **Sprint A doc 08 precisa
  ser ampliado** pra suportar:
  - Qualificadores enum (`=PERF/HIPER/EMAG`)
  - Qualificadores severidade (`GRAVE`)
  - Qualificadores frequência (`≥3x`)
  - Qualificadores sexo/idade (filtros sobre `paciente.sexo`)
  - Gatilhos por **exame alterado** (`HOMOCISTEINA`) — entra como
    bridge `EXAM HMCS` ao invés de palavra livre

  Esses são **+5 funcionalidades novas no motor**. Não invalidam a
  Encomenda 01, mas adiam o "motor 100% disparando" pra depois do
  Sprint A.5+B+C+D+E doc 08 + suporte a qualificadores.

---

## §6 — PLANO DE EXECUÇÃO REVISADO (pra Dr. Claude aprovar)

Substitui a ordem ingênua do PDF ("UPSERT 80 + regras + bridge"). Ordem
**executável de verdade**:

| Sprint | Tarefa | Aditivo? | Risco |
|--------|--------|----------|-------|
| **0** | Caio responde §5.1-5.4 + §1.4 (renomeações F12/F45) + §4 (bridge GERA-DRE1) | — | — |
| **1** | Migration 057: `ALTER TABLE regras_motor ADD COLUMN codigo_referencia_v4 text IF NOT EXISTS` + idx | 🟢 100% aditivo | nulo |
| **2** | Migration 058: alias columns `codigo_formula`/`nome_formula`/`classe_terapeutica`/`ativa` em `formulas_master` (Opção C §3.1) OU ajuste do SQL UPSERT (Opção B) | 🟢 aditivo | nulo se Opção C |
| **3** | UPSERT idempotente das 80 fórmulas em `formulas_master` (com nicks finais pós-renomeação) | 🟢 aditivo | nulo |
| **4** | Bridge V13→V4 do §4 (UPDATE `regras_motor.codigo_referencia_v4`) | 🟢 aditivo | nulo |
| **5** | UPSERT das 80 regras_motor novas (`MRF001`–`MRF080`) com gatilhos QC*/QD*/... como **palavras-chave literais** (ainda não disparam) | 🟢 aditivo | nulo (regras inativas até Sprint 7) |
| **6** | Sprint A doc 08 ampliado: regex `\b`, score, qualificadores (=, GRAVE, ≥Nx, sexo) | 🟠 muda lógica | médio (cobertura por testes) |
| **7** | Sprint A.5 novo: migração da anamnese atual → adicionar `pergunta.codigo_semantico` aditivo (QC22, QD17, ...) | 🟢 aditivo | baixo (precisa mapa Dr. Claude) |
| **8** | Ativar regras_motor da Encomenda 01 (`UPDATE ativo='SIM'`) — motor passa a disparar de verdade | 🟢 não-destrutivo | médio (validar produção) |

**Reversibilidade**: cada sprint é rollbackable via flag `ativo='NAO'`
na regra, ou ignorando a coluna `codigo_referencia_v4` (V13 continua
funcionando). Caminho B preservado.

---

## §7 — GAPS E PERGUNTAS ABERTAS PRO DR. CLAUDE

1. **Migração da anamnese Q010-Q041 → QC*/QD*/QE*/QG*/QH*/QI***:
   Dr. Claude já tem o **mapa explícito** dessa migração? Sem ele eu
   tenho que deduzir do contexto e arrisco mismatch clínico.
2. **F81 Drenagem Inflamatória**: criar (`FORM ANTI BLEN DREN 0001`?)
   ou descontinuar a legada `FORM GERA MODU DRE1 0001`?
3. **Renomeação F12 MINO → MIOI** e **F45 CAPS → TPRX**: OK ou tem
   alternativa preferida?
4. **`SACN` vs `SACH`**: consolidar ou manter?
5. **Decisão schema `formulas_master`** (§3.1): Opção A, B ou C?
6. **Qualificadores semânticos**: gramática proposta vai suportar tudo
   da §5.4 ou só subset (decide o que entra na MVP)?
7. **F35 Oxandrolona+NADH SL** e **F40 Tadalafila+NADH simples** usam
   substância NADH — que **já é pellet** (IMPL HORM SUBC NADH 0001 do
   doc 10 §4.3). Bridge bi-direcional ou são produtos distintos?
8. **Faseamento INTE (F70-F78)**: gatilhos `QD15 mês3-4`, `QD15 mês5-6`
   exigem que o motor saiba **data da última prescrição** desse
   paciente. Suportar como filtro temporal ou simplificar pra "fase
   informada manualmente pelo médico"?

---

## §8 — RECOMENDAÇÃO FINAL DR. REPLIT

**Encomenda 01 está aprovada do ponto de vista de codificação V4.0
(80/80 únicos, regra cumprida, vocabulário coerente).** Os blockers são
de **infra DB + anamnese**, não de catálogo.

**Não executo UPSERT hoje** porque:
1. SQL proposto **quebra na primeira linha** (`codigo_formula` não
   existe) — confirmei no DB.
2. `codigo_referencia_v4` em `regras_motor` **não existe** — Sprint B
   doc 08 é pré-req confirmado.
3. Gatilhos `QC*` **não casam com anamnese atual** — Sprint A.5
   novo necessário.

**Próximo passo**: Caio responde §0-§5 + Dr. Claude responde §3+§7.
Aí destravo migration 057 imediatamente (aditivo, zero risco) e organizo
os Sprints 1-8 do §6 num task plan executável.

Zero código tocado nesta análise — só auditoria + documento.
