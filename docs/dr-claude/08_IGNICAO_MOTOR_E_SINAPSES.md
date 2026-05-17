# 08 — IGNIÇÃO DO MOTOR PADCOM + SINAPSES (Anamnese → Sugestões Clínicas)

> **Briefing pro Dr. Claude** — Como a sinapse roda hoje, estado real no banco,
> lacunas mapeadas, e proposta-Replit de correção do matching.
> Atualizado em **17/05/2026** por Dr. Replit, sobre o checkpoint
> `fcc2989348a7f5e1c672df5b5ffbccfa83c93215`.

---

## 1. A CADEIA REAL (FRONT → BACK → DB)

### 1.1. Frontend: o trigger humano
**Arquivo:** `artifacts/clinica-motor/src/pages/anamnese/[id].tsx`

1. Usuário preenche anamnese (Q010–Q041) e clica em **Salvar** (`handleSalvar`, linha 190) → status vira `concluida`.
2. Aparece o botão **"Ativar Motor Pawards"** (linha 251) — botão separado, ato deliberado do clínico.
3. Clique chama `handleAtivarMotor` (linhas 207–217):

```tsx
const handleAtivarMotor = () => {
  ativarMotor.mutate({ data: { anamneseId: id } }, {
    onSuccess: (result) => {
      const total = result?.totalSugestoes || 0;
      toast({ title: `Motor ativado — ${total} sugestoes geradas...` });
      queryClient.invalidateQueries({ queryKey: getObterAnamneseQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListarSugestoesQueryKey({ pacienteId: anamnese?.pacienteId }) });
    }
  });
};
```

### 1.2. Backend: a sinapse atual
**Arquivo:** `artifacts/api-server/src/routes/anamnese.ts` (linhas **182–351**)
**Rota:** `POST /anamnese/:id/ativar-motor`

A lógica está **embutida no handler da rota** (não há service dedicado).
Sequência de 7 passos:

#### Passo 1 — Extração de sinais (linhas 193–227)
```ts
const sinais: string[] = [];
const queixaPrincipal = (respostasClincias.Q010 as string || "").toUpperCase();
if (queixaPrincipal) sinais.push(queixaPrincipal);

const sintomas = respostasClincias.Q012 as string[] || [];
sintomas.forEach(s => sinais.push(s.toUpperCase()));

const rawQ013 = respostasClincias.Q013 || respostasClincias.Q013_legacy || [];
let doencasNomes: string[] = [];
if (Array.isArray(rawQ013) && rawQ013.length > 0) {
  doencasNomes = typeof rawQ013[0] === "string"
    ? rawQ013 as string[]
    : (rawQ013 as Array<{nome:string;status:string}>).map(d => d.nome);
}
doencasNomes.forEach(d => sinais.push(d.toUpperCase()));

const historicoFamiliar = respostasClincias.Q014 as string[] || [];
historicoFamiliar.forEach(h => sinais.push(h.toUpperCase()));

const aceitaInjetavel  = String(respostasPreferencias.Q032 || "NAO").toUpperCase();
const aceitaImplante   = String(respostasPreferencias.Q033 || "NAO").toUpperCase();
const somentExames     = String(respostasPreferencias.Q030 || "NAO").toUpperCase();
const perfilFinanceiro = String(respostasFinanceiras.Q041 || "BASICO").toUpperCase();
if (sinais.length === 0) sinais.push("AVALIACAO_GERAL");
```

#### Passo 2 — Carrega regras (linha 230)
```ts
const todasRegras = await db.select().from(regrasMotorTable).where(eq(regrasMotorTable.ativo, "SIM"));
```

#### Passo 3 — Matching por `includes()` bidirecional (linhas 233–245) ⚠️
```ts
const regrasAtivadas = todasRegras.filter(regra => {
  const palavraChave = regra.palavraChave.toUpperCase();
  const matchSinal = sinais.some(sinal =>
    sinal.includes(palavraChave) || palavraChave.includes(sinal)   // ⚠️ BIDIRECIONAL
  );
  const matchPerguntaId =
       regra.perguntaId === "Q030" && somentExames    === palavraChave
    || regra.perguntaId === "Q031" && aceitaInjetavel === palavraChave
    || regra.perguntaId === "Q033" && aceitaImplante  === palavraChave;
  return matchSinal || matchPerguntaId;
});
```

#### Passo 4 — Filtro por preferências (linhas 247–258)
```ts
let regrasEfetivas = regrasAtivadas.filter(regra => {
  if (somentExames === "SIM" && regra.segmento !== "exame") return false;
  if (regra.segmento === "injetavel" && aceitaInjetavel !== "SIM") return false;
  if (regra.segmento === "implante"  && aceitaImplante  !== "SIM") return false;
  if (perfilFinanceiro === "BASICO" && regra.segmento === "implante")  return false;
  if (perfilFinanceiro === "BASICO" && regra.segmento === "protocolo") return false;
  return true;
});
```

#### Passo 5 — Deduplica por `(segmento, codigo_referencia)` (linhas 260–267)
```ts
const codigosVistos = new Set<string>();
regrasEfetivas = regrasEfetivas.filter(r => {
  const key = `${r.segmento}:${r.codigoReferencia}`;
  if (codigosVistos.has(key)) return false;
  codigosVistos.add(key);
  return true;
});
```

#### Passo 6 — Resolve item terapêutico pelo código PADCOM (linhas 270–311)
```ts
const itensDisponiveis = await db.select().from(itensTerapeuticosTable).where(eq(itensTerapeuticosTable.disponivel, true));
const findItemPorCodigo = (codigo) => codigo ? itensDisponiveis.find(i => i.codigoPadcom === codigo) : null;

for (const regra of regrasEfetivas) {
  const item = findItemPorCodigo(regra.codigoReferencia);
  // mapeia segmento → tipo do enum, decide injetavel_im vs ev pelo item.categoria
  sugestoesDados.push({ anamneseId: id, pacienteId, tipo, itemTerapeuticoId: item?.id, itemNome, justificativa, prioridade });
}
```

#### Passo 7 — Fallback + escrita + update da anamnese (linhas 313–351)
```ts
if (sugestoesDados.length === 0) {
  const bloco = itensDisponiveis.find(i => i.codigoPadcom === "EXAM BASE BASI 001");
  if (bloco) sugestoesDados.push({ ...bloco, justificativa: "BLK001 - Avaliacao integrativa base..." });
}
sugestoesGeradas = await db.insert(sugestoesTable).values(sugestoesDados).returning();
await db.update(anamnesesTable).set({
  sinaisSemanticos: [...new Set(sinais)],
  motorAtivadoEm: new Date(),
  status: "concluida",
}).where(eq(anamnesesTable.id, id));
```

---

## 2. ESTADO REAL DAS REGRAS NO BANCO (snapshot 17/05/2026)

```sql
SELECT COUNT(*) FROM regras_motor WHERE ativo='SIM';  -- 37 linhas
```

**Mas atenção:** as 37 linhas são 7 `codigo_referencia` distintos × várias `palavra_chave` cada.
A cobertura real do motor é só **7 regras-mãe** (EXAM ×6, FORM ×3, INJE ×2, PROC ×1):

| `regra_id` | `codigo_referencia` | `bloco` | `segmento` | Palavras-chave (gatilho) |
|---|---|---|---|---|
| MRE001 | `EXAM TIRE BASI 001` | BLK002 Tireoide | exame | FADIGA / FRAQUEZA / CANSACO |
| MRE002 | `EXAM TIRE AMPL 001` | BLK002 Tireoide | exame | HIPOTIREOIDISMO / HASHIMOTO / TIREOIDITE |
| MRE004 | `EXAM BASE BASI 001` | BLK001 Base | exame | OBESIDADE / SOBREPESO / IMC ALTO |
| MRE005 | `EXAM GLIC AMPL 001` | BLK003 Glicêmico | exame | DIABETES / GLICEMIA / INSULINA |
| MRE006 | `EXAM GLIC BASI 001` | BLK003 Glicêmico | exame | RESISTENCIA INSULINICA / GANHO DE PESO |
| MRE007 | `EXAM AUTO BASI 001` | BLK017 Autoimune | exame | ARTRITE REUMATOIDE / AUTOIMUNE / LUPUS |
| MRE008 | `EXAM LIPI BASI 001` | BLK005 Lipídico | exame | DISLIPIDEMIA / TRIGLICERIDES / COLESTEROL ALTO |
| MRE009 | `EXAM GONA BASI 001` | BLK006 Gonadal | exame | ALOPECIA / QUEDA DE CABELO |
| MRF001 | `FORM META MITO 001` | BLK001 Base | formula | CANSACO / FADIGA |
| MRF002 | `FORM GLIC INSU 001` | BLK003 Glicêmico | formula | RESISTENCIA INSULINICA / DIABETES / GANHO DE PESO |
| MRF003 | `FORM TIRE MODU 001` | BLK002 Tireoide | formula | HASHIMOTO / HIPOTIREOIDISMO |
| MRI001 | `INJE VITA METI 001` | BLK001 Base | injetavel | DEFICIENCIA B12 / ANEMIA / NEUROPATIA |
| MRI002 | `INJE IMUN VITA 001` | BLK001 Base | injetavel | IMUNIDADE BAIXA / INFECCOES RECORRENTES |
| MRP001 | `PROC META BASE 001` | BLK001 Base | protocolo | AVALIACAO COMPLETA / LONGEVIDADE / PREVENTIVO |

**MRE003 NÃO EXISTE** (gap na sequência).

### 2.1. Catálogo no banco — quanta munição o motor TEM mas NÃO usa

```
blocos            =  62  (⚠️ duplicação V13 BLK001 vs V4 BLK0001 — ver §4)
exames_base       = 280
formulas          =  54
itens_terapeuticos= 457
injetaveis        = 305
implantes         =  32
endovenosos       =  63
doencas           =  58
sintomas          =  10
regras_motor      =  37  ← apenas 7 codigos_referencia distintos
codigos_semanticos= 521
```

**Razão de cobertura:** o motor referencia **7 itens** de um catálogo de **1.270+ entidades clínicas**. ≈ **0,5%**.

---

## 3. LACUNAS CONFIRMADAS (blocos órfãos do motor)

Dos 31 blocos canônicos V4 (CSV `12_blocos.csv`), **24 não têm nenhuma regra ativa**:

| Bloco | Nome | Status motor | Sintoma/queixa que deveria ativar |
|---|---|---|---|
| BLK0004 | HEPATICO ESPECIFICO | ❌ vazio | dor no hipocôndrio direito, esteatose, GGT alta |
| BLK0007 | PROSTATA | ❌ vazio | jato urinário fraco, PSA, hesitação |
| BLK0008 | ADRENAL ESPECIFICO | ❌ vazio | burnout, insônia, hipotensão postural |
| BLK0009 | SALIVAR ADRENAL | ❌ vazio | curva de cortisol, fadiga adrenal |
| BLK0010 | DEFICIENCIA ABSORCAO | ❌ vazio | distensão pós-prandial, B12 baixa |
| BLK0011 | TROMBOSE | ❌ vazio | histórico trombose, varizes, dor MMII |
| BLK0012 | COAGULOGRAMA | ❌ vazio | pré-operatório, sangramento |
| BLK0013 | MARCADORES CANCERIGENOS | ❌ vazio | history familiar CA, idade ≥50 |
| BLK0014 | RENAL ESPECIFICO | ❌ vazio | edema, hipertensão, creatinina alta |
| BLK0015 | GRAVIDEZ | ❌ vazio | beta-HCG, atraso menstrual |
| BLK0016 | DST | ❌ vazio | atividade sexual desprotegida, rastreio |
| BLK0018 | GENETICA POLIMORFISMOS | ❌ vazio | MTHFR familiar, predisposição |
| BLK0019 | FARMACOGENETICA | ❌ vazio | escolha de medicação, polifarmácia |
| BLK0020 | METAIS TOXICOS | ❌ vazio | exposição ocupacional, fadiga neurológica |
| BLK0021 | VITAMINAS | ❌ vazio | check-up nutricional |
| BLK0022 | MINERAIS COFACTORES | ❌ vazio | câimbra, queda de cabelo, fadiga |
| BLK0023 | SALIVAR HORMONAL | ❌ vazio | curva hormonal, infertilidade |
| BLK0024 | ULTRASSOM | ❌ vazio | dor abdominal, achados de imagem |
| BLK0025 | TOMOGRAFIA | ❌ vazio | investigação de massa, trauma |
| BLK0026 | RESSONANCIA MAGNETICA | ❌ vazio | dor articular crônica, neurológico |
| BLK0027 | CARDIOLOGICOS DE IMAGEM | ❌ vazio | dor torácica, dispneia, palpitação |
| BLK0028 | ENDOSCOPICOS | ❌ vazio | refluxo, sangramento, rastreio CA |
| BLK0029 / BLK0030 / BLK0031 | RX / MAMOGRAFIA / DENSITOMETRIA | ❌ vazio | rastreios padrão |

Soros (`endovenosos`=11), implantes HRT (`implantes`=32), fórmulas modernas (sono, foco, capilar, intestino — `formulas`=11 no CSV V4) também **sem sinapse**.

---

## 4. ANOMALIAS / DÍVIDA TÉCNICA DETECTADAS

### 4.1. Duplicação BLK001 vs BLK0001 (V13 vs V4)
A tabela `blocos` tem **62** linhas onde **deveriam ser 31**:

```
 codigo_bloco | codigo_semantico             | nome_bloco
 BLK0001      | BLCO BINT EXAM GRDE 0001     | BLOCO BASE INTEGRATIVA  ← V4 4-dígitos
 BLK001       | BLCO BINT EXAM GRDE 0001     | BLOCO BASE INTEGRATIVA  ← V13 3-dígitos
 BLK0002      | BLCO TIRE EXAM GRDE 0002     | BLOCO TIREOIDE          ← V4
 BLK002       | BLCO TIRE EXAM GRDE 0002     | BLOCO TIREOIDE          ← V13
 ...
```

Mesmo `codigo_semantico`, mesmo `nome_bloco`, mas `codigo_bloco` divergente. Provável seed rodado 2× (uma vez V13 3-dígitos, outra V4 4-dígitos). **Não dropar** (regra de ouro), mas decidir qual é canônico antes de adicionar novas regras_motor.

### 4.2. `codigo_referencia` das regras está em V13 (4 segmentos)
Todas as 37 linhas usam o padrão V13 `XXXX XXXX XXXX 000` (sem B4=NICK, SEQ 3 dígitos):
- `EXAM TIRE BASI 001` ← deveria virar `EXAM TIRE GBAS TSHX 0001` (V4 5 segs)
- `FORM TIRE MODU 001` ← deveria virar `FORM TIRE MODU SUP2 0001`

O catálogo V4 já tem os códigos novos em `formulas.codigo_semantico` e `codigos_semanticos`. Falta a bridge (espelho da migration 025) para `regras_motor.codigo_referencia_v4` apontar pro V4.

### 4.3. Matching `includes()` bidirecional → falsos positivos
```ts
sinal.includes(palavraChave) || palavraChave.includes(sinal)
```
- Sintoma `"DOR"` (3 letras) dá match em regra `"DOR LOMBAR"` (regra dispara errado).
- Queixa `"DIABETES MELLITUS TIPO 2"` dá match em regra `"DIABETES"` (✅ ok), mas regra `"DIABETES"` também dá match em sintoma `"PRE DIABETES"` (✅ ok) **E** em `"NAO TENHO DIABETES"` (❌ falso positivo).
- Como `palavraChave.includes(sinal)` está ativo: sintoma `"GANHO"` (4 letras) ativa regra `"GANHO DE PESO"` (✅ ok), mas sintoma `"A"` ativaria tudo (degenerado).

### 4.4. Sem score / sem prioridade efetiva
A coluna `prioridade` (`alta` / `media` / `baixa`) **é apenas copiada pra sugestão**, mas **não ordena nem desempata**. Se 5 regras ativam pro mesmo paciente, vão todas pro card de sugestões com peso igual.

### 4.5. Sem feedback loop
Sugestão aceita ou rejeitada pelo médico **não retroalimenta** a regra. Não há `regras_motor_estatisticas` (acertos/rejeições).

### 4.6. Q030 `somentExames` quebra `matchPerguntaId`
A linha 240 lê:
```ts
regra.perguntaId === "Q030" && somentExames === (palavraChave) || ...
```
Sem parênteses, isso vira `(matchSinal && perfilA) || perfilB || perfilC`. Há ambiguidade de precedência ali.

---

## 5. SCHEMA EXATO DAS TABELAS-CHAVE

### `regras_motor` (`lib/db/src/schema/regrasMotor.ts`)
```ts
regraId            text PK            -- MRE001, MRF002, MRI001, MRP001
segmento           text               -- exame|formula|injetavel|implante|protocolo
codigoReferencia   text               -- formato V13: EXAM TIRE BASI 001
palavraChave       text               -- texto plano UPPER (FADIGA, HIPOTIREOIDISMO)
blocoReferencia    text               -- BLK001..BLK031 (sem zero-pad consistente)
perguntaId         text               -- Q010..Q041
prioridade         text               -- alta|media|baixa
ativo              text               -- "SIM"|"NAO" (não bool!)
observacao         text
```

### `sugestoes_clinicas` (`lib/db/src/schema/sugestoes.ts`, alias `sugestoesTable`)
```ts
id                  serial PK
anamneseId          int FK
pacienteId          int FK
tipo                enum(exame|formula|injetavel_im|injetavel_ev|implante|protocolo)
itemTerapeuticoId   int FK nullable    -- null se motor não achou o item no catálogo
itemNome            text
itemDescricao       text nullable
justificativa       text               -- "Regra MRE001 (Q012): Sinal FADIGA — ..."
prioridade          enum(baixa|media|alta|urgente)
status              enum(...) default pendente_validacao
```

### `anamneses.sinaisSemanticos` (`anamnesesTable`)
```ts
sinaisSemanticos    jsonb              -- array de strings UPPER dedupado
motorAtivadoEm      timestamp
status              enum(rascunho|concluida|motor_ativado|...)
```

---

## 6. PROPOSTA-REPLIT DE CORREÇÃO DA SINAPSE (`Dr. Replit como codificador`)

> **Caio pediu pra eu tentar surpreender corrigindo a sinapse antes de entregar pro Dr. Claude.**
> Não toquei código (Regra Ferro: nada de db:push, nada de migration sem OK do Dr. Claude).
> Abaixo a proposta cirúrgica em 5 sprints aditivos.

### Sprint A — Hardening do matching (sem mudar schema)
1. **Trocar `includes()` bidirecional por match de palavra inteira** (regex `\b`):
   ```ts
   const re = new RegExp(`\\b${escapeRegex(palavraChave)}\\b`, "i");
   const matchSinal = sinais.some(s => re.test(s));
   ```
   Mata falso positivo de `"DOR"` matchando `"DOR LOMBAR"` quando a regra é só `"DOR"`.

2. **Bloquear negações** (`"NAO TENHO X"`, `"NEGA X"`, `"SEM X"`):
   ```ts
   const NEGADORES = /^(NAO TENHO |NEGA |SEM |NUNCA |NÃO )/;
   const sinaisLimpos = sinais.filter(s => !NEGADORES.test(s));
   ```

3. **Mínimo de 4 caracteres** na palavra-chave pra evitar trigger por letra solta.

4. **Score ponderado em vez de booleano**:
   ```ts
   const SCORE_FONTE = { Q010: 5, Q013: 4, Q012: 3, Q014: 2 };  // queixa > diagnóstico > sintoma > familiar
   const SCORE_PRIO  = { alta: 3, media: 2, baixa: 1 };
   const score = SCORE_FONTE[origem] * SCORE_PRIO[regra.prioridade];
   ```
   Persistir em `sugestoes_clinicas.score` (nova coluna nullable, migration aditiva).

### Sprint B — Bridge V13 → V4 no `codigo_referencia`
Espelhar a `migration 025` (que fez isso pra exames) agora pra regras:
```sql
-- migration 057_regras_motor_codigo_referencia_v4.sql (aditivo)
ALTER TABLE regras_motor
  ADD COLUMN IF NOT EXISTS codigo_referencia_v4 text
    REFERENCES codigos_semanticos(codigo);

-- popular as 14 existentes:
UPDATE regras_motor SET codigo_referencia_v4 = 'EXAM TIRE GBAS TSHX 0001' WHERE regra_id = 'MRE001';
-- (Dr. Claude decide o mapeamento canônico bloco-a-bloco)
```
Motor passa a tentar `codigo_referencia_v4` primeiro, com fallback no V13. **Zero ruptura**.

### Sprint C — Cobertura dos 24 blocos órfãos
Cada bloco órfão recebe **1 regra-mãe + 3-5 palavras-chave** seguindo o template:

| Bloco | regra_id sugerida | codigo_referencia_v4 | palavras-chave |
|---|---|---|---|
| BLK0008 ADRENAL | MRE010 | EXAM ADRE GBAS COR1 0001 | BURNOUT / EXAUSTAO / INSONIA CRONICA |
| BLK0010 ABSORÇÃO | MRE011 | EXAM DABS GBAS B12X 0001 | DISTENSAO POS PRANDIAL / DEFICIENCIA B12 |
| BLK0011 TROMBOSE | MRE012 | EXAM TROM GBAS DDIM 0001 | TROMBOSE PREVIA / VARIZ DOLOROSA |
| BLK0013 ONCO | MRE013 | EXAM ONCO GBAS CEAX 0001 | HISTORICO CA FAMILIAR / RASTREIO |
| BLK0014 RENAL | MRE014 | EXAM RENA GBAS CIST 0001 | EDEMA / CREATININA ALTA |
| BLK0021 VITAMINAS | MRE015 | EXAM VITA GBAS VITD 0001 | CHECK UP NUTRICIONAL |
| BLK0022 MINERAIS | MRE016 | EXAM MINE GBAS MAGN 0001 | CAIMBRA / QUEDA DE CABELO / FADIGA |
| (+17 outros blocos seguindo o mesmo padrão) | | | |

Sprint C carrega **~24 regras-mãe novas × 4 palavras-chave médias = ~96 linhas em `regras_motor`**, todas via psql aditivo.

### Sprint D — Feedback loop (aprendizado supervisionado)
Nova tabela aditiva:
```sql
CREATE TABLE IF NOT EXISTS regras_motor_estatisticas (
  regra_id          text REFERENCES regras_motor(regra_id),
  total_disparos    int DEFAULT 0,
  total_aceitas     int DEFAULT 0,    -- médico clicou "aceitar sugestão"
  total_rejeitadas  int DEFAULT 0,    -- médico clicou "rejeitar"
  total_ignoradas   int DEFAULT 0,    -- caducou sem ação
  ultima_atualizacao timestamp,
  PRIMARY KEY (regra_id)
);
```
Trigger em `sugestoes_clinicas` `AFTER UPDATE OF status` incrementa o contador correto.
Dashboard `/painel/motor/efetividade` mostra taxa de aceitação por regra.

### Sprint E — Extração de service dedicado
Mover linhas 182–351 da rota pra `services/motorClinico/ignicao.ts`:
```ts
export async function ignitarMotorClinico(anamneseId: number, db: Db): Promise<ResultadoMotor> {
  const sinais = await extrairSinais(anamneseId, db);          // passo 1
  const regras = await carregarRegrasAtivas(db);                // passo 2
  const ativadas = filtrarPorMatching(regras, sinais);          // passo 3 (com fixes do Sprint A)
  const efetivas = aplicarPreferencias(ativadas, sinais);       // passo 4
  const sugestoes = await montarSugestoes(efetivas, db);        // passos 5-6
  const fallback = aplicarFallbackSeVazio(sugestoes);           // passo 7a
  await persistirSugestoes(fallback, db);                       // passo 7b
  await atualizarAnamnese(anamneseId, sinais, db);              // passo 7c
  return { sinais, regrasAtivadas: efetivas.length, sugestoesGeradas: fallback };
}
```
Rota vira casca de 5 linhas. Testabilidade ↑↑↑ (unit test cada função pura).

---

## 7. ARQUIVOS DE CONSULTA RAW (pra Dr. Claude trabalhar)

| Arquivo | Conteúdo | Linhas |
|---|---|---|
| `artifacts/api-server/src/routes/anamnese.ts` | Sinapse atual (rota POST) | 182–351 |
| `artifacts/clinica-motor/src/pages/anamnese/[id].tsx` | Trigger FE | 190, 207–217, 251–261 |
| `lib/db/src/schema/regrasMotor.ts` | Schema da regra | inteiro |
| `lib/db/src/schema/sugestoes.ts` | Schema da sugestão | inteiro |
| `artifacts/api-server/src/db/migrations/025_bridge_codigo_semantico_v4.sql` | **Template** da bridge V13→V4 (espelhar pra regras) | inteiro |
| `attached_assets/planilha_blocos_csv/01_regra_universal.csv` | Regra V4 Dr. Manus oficial | 21 |
| `docs/dr-claude/09_CATALOGO_CLINICO_ESTRATIFICADO.md` | Catálogo nas 2 visões | — |

---

## 8. PERGUNTAS ABERTAS PRO DR. CLAUDE (decidir antes do Sprint B)

1. **BLK001 vs BLK0001** — qual é canônico? Sugiro **manter V4 (BLK0001)** e arquivar (não dropar) as 31 linhas V13 com flag `arquivadoEm`. Confirma?
2. **Bridge `codigo_referencia_v4`** — preencho via migration aditiva ou criamos uma tela admin `/admin/motor/regras` pra editar via UI?
3. **24 blocos órfãos** — você revisa as palavras-chave que sugeri no Sprint C antes do seed?
4. **Score** — concorda com `Q010=5, Q013=4, Q012=3, Q014=2` × `alta=3, media=2, baixa=1`?
5. **Matching com `\b` word-boundary** — ok? Ou prefere fuzzy (Levenshtein ≤2) pra absorver erro de digitação tipo `"hashimotto"` → `"hashimoto"`?
6. **Negadores** — minha lista `(NAO TENHO|NEGA|SEM|NUNCA|NÃO)` cobre o que a anamnese aceita em texto livre?

Aguardando seu OK pra o Dr. Replit codar Sprint A + Sprint B em paralelo (independentes), seguidos de C, D, E sequenciais.
