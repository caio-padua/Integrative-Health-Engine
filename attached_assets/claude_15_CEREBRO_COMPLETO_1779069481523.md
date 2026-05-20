# 15 — CÉREBRO COMPLETO: 5 PADRÕES DE ANAMNESE + CASCATA BLOCO-GRADE + FRASEOLOGIA COMERCIAL-CLÍNICA + MAPA UNIVERSAL DE SINAPSES

> **De**: Dr. Claude (orquestrador)
> **Para**: Dr. Replit (executor) + Caio (médico CEO)
> **Data**: 17/mai/2026
> **Status**: FILÉ MIGNON MASTIGADO — incorpora TUDO dos docs 11, 12, 13, 14 + novas decisões do Caio
> **Princípio Kaizen**: cada anamnese é um funil de conversão clínica que respeita o paciente e o tempo dele

---

## §0 — DEFINIÇÃO CANÔNICA: "PROCEDIMENTOS"

A partir deste documento, **PROCEDIMENTO** é o termo guarda-chuva que cobre os 6 tipos de saída do motor:

| Tipo            | Código V4 | Ícone     | Categoria      |
|-----------------|-----------|-----------|----------------|
| Fórmula manipulada | FORM   | ti-pill   | Farmacêutico   |
| Injetável IM    | INJE      | ti-vaccine| Parenteral     |
| Injetável EV/Soro | ENDO    | ti-droplet| Parenteral     |
| Implante pellet | IMPL      | ti-diamond| Cirúrgico-leve |
| Exame laboratorial/imagem | EXAM | ti-microscope | Diagnóstico |
| Receita farmácia comum | RXFA | ti-prescription | Farmacêutico |

Quando este documento disser "procedimento", refere-se a qualquer um dos 6.
Quando precisar especificar, usa o tipo (ex: "procedimento parenteral" = INJE+ENDO).

---

## §1 — REGRA BLOCO-GRADE-CASCATA (validar com Dr. Replit)

**ATENÇÃO Dr. Replit**: o Caio mencionou que ele e você combinaram a seguinte
regra arquitetural. Eu preciso da sua confirmação antes de tratar como fato:

> Se a anamnese sugeriu UM exame de uma grade, então TODOS os exames daquela
> grade do mesmo bloco são automaticamente sugeridos em conjunto.

**Exemplo prático**:
- Paciente reporta `QSNT NEUR SNAI INSO 0001` (insônia)
- Motor identifica que isso disparia `EXAM HORM GINT MELA 0001` (Melatonina salivar)
- A regra diz: dispara **todos os exames** de `BLK0002 + Grade GINT (intermediária)`
- Logo: além da Melatonina, dispara Cortisol salivar 4 pontos, DHEA-S, IGF-1...
  (tudo que está na grade intermediária do bloco hormonal)

**Pergunta direta pro Dr. Replit**:

1. Você já tem essa cascata implementada? Se sim, em qual função (`ignitarMotor()`,
   `cascataBlocoGrade()`, outro nome)?
2. Se não, qual o nome canônico que você daria pra essa função?
3. A regra é **inclusiva por padrão** (sempre dispara grade completa) ou
   **opcional por sinapse** (cada sinapse tem flag `aplica_cascata_grade: boolean`)?
4. Quando 2 sinapses disparam grades sobrepostas (ex: insônia dispara grade
   hormonal GINT, e fadiga dispara grade nutricional GINT — ambas têm Cortisol),
   como você desduplica?

**Minha sugestão arquitetural** (se você ainda não tem):

```sql
ALTER TABLE regras_motor
  ADD COLUMN IF NOT EXISTS aplica_cascata_grade boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS cascata_grade_codigo text;
  -- ex: 'BLK0002:GINT' → quando dispara, traz toda essa grade

-- nova tabela auxiliar (opcional, performance)
CREATE TABLE IF NOT EXISTS exames_por_grade (
  bloco_codigo text NOT NULL,
  grade_codigo text NOT NULL,
  exame_codigo text NOT NULL,
  PRIMARY KEY (bloco_codigo, grade_codigo, exame_codigo)
);
```

**Desduplicação**: na função `ignitarMotor()`, após coletar todas as sinapses
disparadas, executar `SELECT DISTINCT exame_codigo FROM exames_disparados`
antes de gerar `sugestoes_clinicas`.

Aguardo sua confirmação antes do Sprint 5 (UPSERT regras_motor).

---

## §2 — OS 5 PADRÕES DE ANAMNESE (Funil de Profundidade)

O Caio identificou problema real: anamnese completa (415 itens) cansa paciente.
Solução: **5 níveis progressivos**, ativáveis por contexto. Cada nível inclui
os anteriores (acumulativo, nunca exclusivo).

### §2.1 — Nível 1: ANAMNESE EXPRESSA (5min, 25 perguntas)
**Quando ativar**: primeira consulta avulsa, retorno de paciente conhecido,
triagem rápida pré-consulta.

**O que coleta**:
- Identificação (QA01-QA08): nome, idade, sexo, IMC, PA
- Queixa principal livre (QHDA QUEX TEXT 0001)
- Top 10 sintomas mais comuns (multi-select Q012):
  Fadiga, Insônia, Ansiedade, Ganho de peso, Queda cabelo, Libido baixa,
  Dor articular, Constipação, Imunidade baixa, Memória ruim
- 5 doenças mais relevantes (Q013): Hipotireoidismo, Diabetes, HAS,
  Depressão, Autoimune
- 1 pergunta de preferência (QPRF GERA PREF VIAS 0001):
  "Aceita injetável/implante?" (sim/não/depende)
- 3 perguntas vitais hábitos (QHAB): atividade física sim/não,
  qualidade sono 1-5, estresse 1-10

**O que o motor faz**: dispara entre 5-15 sugestões focadas. Mostra ao médico
"Anamnese express completa — sugiro aprofundar nos blocos X, Y, Z" se houver
sinais positivos críticos.

### §2.2 — Nível 2: ANAMNESE FOCADA (15min, 60-80 perguntas)
**Quando ativar**: paciente com queixa principal clara em 1-2 sistemas,
consulta de acompanhamento, recall de pacientes Pádua existentes.

**O que coleta** (além do Nível 1):
- Sintomas do(s) sistema(s) ativado(s) na queixa principal — se queixa é
  "insônia", abre QSNT NEUR completo (28 sintomas neuropsiquiátricos)
- Doenças relacionadas àquele sistema
- Histórico cirúrgico **relevante** (filtrado por sistema)
- Histórico familiar **relevante** (filtrado por sistema)
- 10 hábitos críticos (sono, café, álcool, exercício)

**Auto-expansão inteligente**: se paciente marca >3 sintomas em sistema NÃO
focal, o sistema sugere automaticamente "Detectei queixa secundária em
[CARDIOVASCULAR]. Quer responder o bloco específico? +5min"

### §2.3 — Nível 3: ANAMNESE INTEGRATIVA PADRÃO (30min, 180 perguntas)
**Quando ativar**: primeira consulta de paciente novo em medicina integrativa,
queixas múltiplas, paciente que pretende fazer protocolo amplo.

**O que coleta** (além do Nível 2):
- Todos os 180 sintomas (organizados em 12 sistemas com accordions colapsáveis)
- Todas as 120 doenças diagnosticadas (busca + multi-select)
- 45 cirurgias prévias
- 30 entradas de histórico familiar
- 40 hábitos de vida completos
- 4 perguntas saúde sexual/hormonal básica
- 4 perguntas saúde psicológica básica

**Otimização TDAH/Asperger paciente**: cada bloco tem barra de progresso
("12/45 sintomas neuropsiquiátricos respondidos") e botão "pular bloco"
(que marca tudo como "não sei / não se aplica" e segue).

### §2.4 — Nível 4: ANAMNESE PROFUNDA (60min, 300 perguntas)
**Quando ativar**: paciente VIP, executivo em check-up anual, paciente com
queixa difícil/refratária, segunda opinião.

**O que coleta** (além do Nível 3):
- Bloco completo QSEX (22 perguntas saúde sexual)
- Bloco completo QPSI (15 perguntas psicológicas/cognitivas)
- Avaliação detalhada QHAB (todos os 40 hábitos com gradações)
- QVIT expandido (10 medidas antropométricas + 5 funcionais)
- Histórico medicamentoso completo (medicamentos atuais + ex-uso)
- Suplementação atual (multi-select de suplementos comuns)
- Alergias e intolerâncias detalhadas
- História ginecológica/urológica completa

### §2.5 — Nível 5: ANAMNESE FULL LONGEVIDADE (90min, 415 perguntas + extras)
**Quando ativar**: programa longevidade, paciente fortemente engajado,
preparação pra protocolo de reposição hormonal completo, paciente com
multipatologia.

**O que coleta** (tudo dos 4 anteriores +):
- Avaliação epigenética (perguntas sobre fatores ambientais, dieta,
  exposição a tóxicos, mindset)
- Inventário de exames passados (últimos 3 anos)
- Mapa de protocolos prévios (tentou bariátrica? reposição? jejum?)
- Linha do tempo de eventos de vida (estresses agudos, lutos, mudanças)
- Avaliação de propósito/sentido (5 perguntas QPSI avançadas)
- Avaliação de qualidade de relacionamentos
- Avaliação espiritual/transcendental (1 pergunta opcional)
- Objetivos de longevidade (multi-select: estética, performance,
  prevenção câncer, prevenção Alzheimer, fertilidade, libido)

### §2.6 — Arquitetura técnica dos 5 níveis

```sql
-- Cada pergunta da anamnese tem nível mínimo de ativação
ALTER TABLE anamnese_perguntas
  ADD COLUMN IF NOT EXISTS nivel_minimo integer DEFAULT 1
    CHECK (nivel_minimo BETWEEN 1 AND 5);

-- Tabela nova: configuração do nível por consulta
CREATE TABLE IF NOT EXISTS anamnese_sessoes (
  id SERIAL PRIMARY KEY,
  paciente_id integer NOT NULL REFERENCES pacientes(id),
  medico_id integer NOT NULL REFERENCES usuarios(id),
  nivel integer NOT NULL CHECK (nivel BETWEEN 1 AND 5),
  iniciada_em timestamptz NOT NULL DEFAULT now(),
  finalizada_em timestamptz,
  motivo_nivel text,
  -- ex: 'consulta_inicial_integrativa', 'retorno_acompanhamento'
  CONSTRAINT anamnese_sessoes_status_check
    CHECK (finalizada_em IS NULL OR finalizada_em >= iniciada_em)
);
CREATE INDEX IF NOT EXISTS idx_anamnese_sessoes_paciente
  ON anamnese_sessoes(paciente_id, iniciada_em DESC);
```

### §2.7 — UX: como o médico escolhe o nível

Na criação da consulta, **antes de chamar o paciente**, o médico vê:

```
┌─────────────────────────────────────────────────────────┐
│ Nova consulta — Maria Silva (4ª visita)                │
│                                                         │
│ Escolha o tipo de anamnese:                             │
│                                                         │
│ (•) Expressa     5min · 25 perguntas · queixa rápida   │
│ ( ) Focada      15min · 80 perguntas · sistema-alvo    │
│ ( ) Integrativa 30min · 180 perguntas · 1ª consulta    │
│ ( ) Profunda    60min · 300 perguntas · check-up VIP   │
│ ( ) Full        90min · 415 perguntas · longevidade    │
│                                                         │
│ [Confirmar e abrir formulário]                          │
└─────────────────────────────────────────────────────────┘
```

**Inteligência**: se o paciente já fez Nível 3+ nos últimos 6 meses, o sistema
sugere Nível 1 (Expressa) por default — só revisa o que mudou. Se nunca fez,
sugere Nível 3 (Integrativa).

---

## §3 — FRASEOLOGIA COMERCIAL-CLÍNICA

O Caio definiu princípio: **despertar no paciente o desejo de realizar o
máximo de grupos de procedimentos possíveis**. Sem agressividade comercial,
mas com clareza do valor entregue.

### §3.1 — Princípios de fraseologia

1. **Linguagem é convite, não imposição** — "Posso te orientar a explorar..."
   no lugar de "Você precisa fazer..."
2. **Foco em benefício, não em produto** — "Acelerar sua recuperação cognitiva"
   no lugar de "Tomar Nootrópico Avançado"
3. **Combinar tipos de procedimento na mesma frase** — "Investigar com exames
   E ao mesmo tempo iniciar o suporte com fórmula manipulada"
4. **Antecipar objeção** — "Sei que pode parecer muito, então organizei em
   fases para você sentir o progresso a cada etapa"
5. **Validar autonomia** — "Você escolhe o ritmo. O que faz sentido começar
   primeiro?"

### §3.2 — Banco de frases por tipo de combinação

#### Combinação A: EXAME + FÓRMULA + INJETÁVEL
> "Maria, identifiquei pelos seus sintomas que vale a pena uma investigação
> mais profunda do seu sistema [X]. Sugiro 3 movimentos: primeiro,
> uma bateria de exames para confirmar a hipótese; segundo, já começar uma
> fórmula manipulada personalizada para os primeiros sintomas; e terceiro,
> um protocolo de injetáveis para acelerar a recuperação. Cada um desses
> reforça o outro — você pode começar pelo que faz mais sentido pro seu
> momento."

#### Combinação B: EXAME + IMPLANTE
> "Pelo seu perfil, o que vai te dar resultado de longo prazo é uma
> reposição hormonal sustentada — para isso, primeiro precisamos confirmar
> seus níveis atuais com exames específicos. Em 15 dias, com o resultado em
> mãos, podemos planejar um implante que vai trabalhar por 4-6 meses sem
> você precisar lembrar de tomar nada. Quer começar pela coleta dos exames?"

#### Combinação C: SORO + FÓRMULA
> "Você está com sinais de fadiga adrenal e queda imunológica. O ideal é
> uma combinação: um soro endovenoso (Soro Imunidade Base) para correção
> rápida — uma sessão por semana, 4 sessões; e uma fórmula manipulada de
> manutenção para tomar em casa. O soro acelera, a fórmula sustenta."

#### Combinação D: FÓRMULA + RECEITA FARMÁCIA (orientação ao paciente comum)
> "Vamos trabalhar em duas frentes: uma fórmula manipulada com os ativos
> específicos que você precisa (não tem nada igual pronto na farmácia), e
> um suporte com 2 medicamentos de farmácia comum que você já consegue
> resolver no caminho de casa. Assim cobrimos o personalizado e o
> imediato."

#### Combinação E: EXAME + FÓRMULA + IMPLANTE + SORO (protocolo full)
> "[Nome], você está num momento ideal para um protocolo completo de
> longevidade. Vamos estruturar 4 camadas: (1) uma investigação ampla
> com exames para mapear todo o terreno; (2) implante hormonal para
> reposição de longo prazo; (3) fórmulas manipuladas para os ajustes
> finos do dia a dia; e (4) protocolo de soros endovenosos mensais para
> manutenção mitocondrial. Posso te explicar cada um — qual quer
> entender primeiro?"

### §3.3 — Tabela de fraseologia por gatilho clínico

Esta tabela popula o campo `observacao_paciente` em `regras_motor`. Quando
o motor sugere um procedimento, essa frase aparece **na tela do médico
para ele copiar/adaptar** ao falar com o paciente.

| Gatilho                  | Fraseologia sugerida                                        |
|--------------------------|-------------------------------------------------------------|
| Insônia + ansiedade      | "Vou propor um caminho de 3 frentes: uma fórmula para você dormir naturalmente, exames para entender se há causa hormonal, e uma sessão de soro endovenoso para acelerar o equilíbrio. Pode começar pelo que preferir." |
| Queda de cabelo          | "Queda de cabelo respondendo bem ao tratamento integrativo — vamos investigar a raiz com exames hormonais, começar uma fórmula oral e tópica, e considerar um pool capilar injetável que potencializa o resultado. Quer ver os 3 caminhos?" |
| Ganho de peso + diabetes | "Aqui temos dois caminhos paralelos: medicação metabólica para resultado imediato, e um soro detox hepático para preparar o terreno. Em 4 semanas você sente diferença visível." |
| Fadiga + burnout         | "Burnout pede recuperação em camadas: exames para mapear o desgaste adrenal, fórmula adaptógena para o dia a dia, e considerar um implante de pregnenolona para suporte de longo prazo. Você não precisa fazer tudo de uma vez — vamos no seu ritmo." |
| Libido baixa masculina   | "Libido tem solução, e geralmente é mais simples do que parece. Vamos confirmar com exames hormonais, começar uma fórmula de performance, e se os exames confirmarem hipogonadismo, um implante de testosterona resolve por 4 meses sem você se preocupar." |
| Menopausa + fogachos     | "Climatério não precisa ser sofrimento. Posso te orientar com um protocolo de reposição hormonal bioidêntica em creme transdérmico, fórmula moduladora vasomotora pra começar imediato, e exames de acompanhamento. Vamos no seu ritmo." |
| Dor articular + idade    | "Articulação responde bem quando atacamos por dentro e por fora: fórmula regenerativa com colágeno tipo II, soro de curcumina endovenoso para inflamação aguda, e exames para descartar autoimune. Em 6 semanas você sente." |
| Imunidade baixa          | "Pra imunidade vamos pensar em 3 movimentos: soros endovenosos de Vitamina C alta dose, fórmula imunomoduladora de manutenção, e exames pra investigar deficiências específicas. Tudo isso em 4 semanas." |

### §3.4 — Implementação no banco

```sql
ALTER TABLE regras_motor
  ADD COLUMN IF NOT EXISTS fraseologia_paciente text;

-- Exemplo de UPSERT
UPDATE regras_motor
  SET fraseologia_paciente = 'Insônia respondendo bem ao tratamento...'
  WHERE codigo_referencia_v4 = 'FORM NEUR INDU SONO 0001';
```

### §3.5 — UX: como aparece pro médico

Na tela do médico, ao gerar receita, abaixo de cada procedimento sugerido
aparece um card discreto:

```
┌─────────────────────────────────────────────────────────────┐
│ 💊 Indutor Sono Fitoterápico   FORM NEUR INDU SONO 0001    │
│                                                             │
│ 💬 Sugestão de fala (clique para copiar):                  │
│ "Vou te propor uma fórmula natural pra indução do sono —   │
│  composta por triptofano, theanina e melatonina em dose    │
│  baixa. Em 7-10 dias você nota diferença."                 │
│                                                             │
│ [📋 copiar] [✏️ editar para este paciente]                 │
└─────────────────────────────────────────────────────────────┘
```

---

## §4 — MAPA UNIVERSAL DE SINAPSES: ANAMNESE → 6 TIPOS DE PROCEDIMENTOS

Esta é a tabela mestre. Cada linha representa uma **sinapse complexa** que
quando dispara, aciona procedimentos em **múltiplos tipos** simultaneamente.

### §4.1 — Estrutura da sinapse multi-procedimento

```sql
CREATE TABLE IF NOT EXISTS sinapses_complexas (
  id SERIAL PRIMARY KEY,
  codigo_sinapse text NOT NULL UNIQUE,
  nome text NOT NULL,
  gatilhos_anamnese text[] NOT NULL,
  -- ex: '{QSNT NEUR SNAI INSO 0001, QSNT NEUR SNAI ANSI 0001}'
  formulas_sugeridas text[],
  injetaveis_sugeridos text[],
  endovenosos_sugeridos text[],
  implantes_sugeridos text[],
  exames_sugeridos text[],
  cascata_grade text,
  -- ex: 'BLK0002:GINT' = traz toda grade intermediária hormonal
  prioridade text CHECK (prioridade IN ('alta', 'media', 'baixa')),
  fraseologia text,
  requer_validacao_humana boolean DEFAULT NULL,
  -- NULL = herda do fluxo padrão
  ativo boolean DEFAULT false,
  pendente_revisao_caio boolean DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);
```

### §4.2 — Sinapses complexas-modelo (15 cenários canônicos)

Cada sinapse abaixo aciona múltiplos procedimentos numa única passagem.
Total de 15 cenários cobrindo as queixas mais frequentes da clínica
integrativa.

#### CENÁRIO 1 — INSÔNIA + ANSIEDADE
```
codigo_sinapse: SIN INSO ANSI 0001
gatilhos: QSNT NEUR SNAI INSO 001, QSNT NEUR SNAI ANSI 001
formulas: FORM NEUR INDU SONO 001, FORM NEUR ANSI FITO 001
injetaveis: INJE ENDO SUPR 5HTP 020, INJE ENDO SUPR LTHE 050
endovenosos: ENDO SORO TERA MITO 001 (se idade >40)
implantes: IMPL HORM SUBC MELA 001 (se insônia crônica >6m)
exames: cascata BLK0002:GINT (hormonal intermediária completa)
fraseologia: "Vou propor um caminho de 3 frentes..."
```

#### CENÁRIO 2 — QUEDA DE CABELO MASCULINA
```
codigo_sinapse: SIN QCAP MASC 0001
gatilhos: QSNT CAPI SNAI QUED 001, paciente.sexo='M'
formulas: FORM CAPI ORAL CPBS 001, FORM CAPI ORAL MNXO 001,
         FORM CAPI TOPI FIMN 001
injetaveis: INJE MUSC SUPR PCAP 001, INJE MUSC SUPR BIOT 010
exames: cascata BLK0002:GBAS + DHT específico
fraseologia: "Queda de cabelo respondendo bem ao tratamento..."
```

#### CENÁRIO 3 — GANHO DE PESO + RESISTÊNCIA INSULÍNICA
```
codigo_sinapse: SIN PESO RESI 0001
gatilhos: QSNT META SNAI GPSO 001, QSNT META SNAI INHA 001 OR
         QDGN META DIAG RESI 001
formulas: FORM META TERM MBOL 001, FORM META BLOQ BTXR 001
endovenosos: ENDO SORO TERA META 001
exames: cascata BLK0003:GINT (metabólica intermediária)
fraseologia: "Aqui temos dois caminhos paralelos..."
```

#### CENÁRIO 4 — FADIGA + BURNOUT
```
codigo_sinapse: SIN FADI BURN 0001
gatilhos: QSNT NEUR SNAI FADI 001, QSNT NEUR SNAI BURN 001
formulas: FORM NEUR ADAP COMP 001, FORM NEUR ADAP ADRE 001
injetaveis: INJE ENDO SUPR MTCB 025, INJE ENDO SUPR COQ1 050
endovenosos: ENDO SORO TERA MITO 001, ENDO SORO TERA ENER 001
implantes: IMPL HORM SUBC PREG 001 (se idade >40)
exames: cascata BLK0008:GINT (adrenal específica)
fraseologia: "Burnout pede recuperação em camadas..."
```

#### CENÁRIO 5 — LIBIDO BAIXA MASCULINA + DISFUNÇÃO ERÉTIL
```
codigo_sinapse: SIN LIBM ERET 0001
gatilhos: QSNT SEXM SNAI LIBM 001, QSNT SEXM SNAI ERET 001
formulas: FORM HORM BLEN LIBI 001, FORM HORM SUPO PFSX 001
implantes: IMPL HORM SUBC TEST 001 + IMPL HORM SUBC ANAS 001
         (regra clínica: sempre acompanhada)
exames: cascata BLK0007:GINT (gonadal intermediária)
fraseologia: "Libido tem solução, e geralmente é mais simples..."
```

#### CENÁRIO 6 — MENOPAUSA + FOGACHOS
```
codigo_sinapse: SIN MENO FOGS 0001
gatilhos: QDGN HORF DIAG MENO 001 OR QSNT SEXF SNAI FOGS 001
formulas: FORM MENO BLEN COMP 001, FORM MENO CREM HRTP 001
implantes: IMPL HORM SUBC ESTR 001 (se QH03=MENOPAUSA),
         IMPL HORM SUBC PROG 001
exames: cascata BLK0006:GINT (ginecológica intermediária)
fraseologia: "Climatério não precisa ser sofrimento..."
```

#### CENÁRIO 7 — DOR ARTICULAR + INFLAMAÇÃO
```
codigo_sinapse: SIN DORA INFL 0001
gatilhos: QSNT ORTO SNAI DORA 001, QSNT ORTO SNAI RIGI 001
formulas: FORM ORTO REGE ARTC 001, FORM ANTI BASE CURP 001
endovenosos: ENDO SORO TERA ANT3 001
injetaveis: INJE ENDO SUPR CURC 001
exames: cascata BLK0014:GINT + autoanticorpos
fraseologia: "Articulação responde bem quando atacamos por dentro..."
```

#### CENÁRIO 8 — IMUNIDADE BAIXA + INFECÇÕES DE REPETIÇÃO
```
codigo_sinapse: SIN IMUN INFR 0001
gatilhos: QSNT IMUN SNAI INFR 001 OR (frequência >3 infecções/ano)
endovenosos: ENDO SORO TERA IMUN 001 (4 sessões semanais)
formulas: FORM HEPA BLEN HPRO 001 (apoio detox imune)
injetaveis: INJE ENDO SUPR VITC 1000, INJE ENDO SUPR SELE 200
exames: cascata BLK0017:GBAS + imunoglobulinas
fraseologia: "Pra imunidade vamos pensar em 3 movimentos..."
```

#### CENÁRIO 9 — INTESTINO IRRITÁVEL + DISBIOSE
```
codigo_sinapse: SIN GAST DISB 0001
gatilhos: QDGN GAST DIAG SIID 001 OR QDGN GAST DIAG SIBO 001
formulas: protocolo faseado F70+F71+F72+F73 (Fase 1A intestinal)
exames: cascata BLK0011:GINT + calprotectina + teste hidrogênio
fraseologia: "Intestino tem 3 fases de tratamento — vamos começar..."
```

#### CENÁRIO 10 — TDAH ADULTO
```
codigo_sinapse: SIN TDAH ADUL 0001
gatilhos: QSNT NEUR SNAI TDAH 001 OR QDGN NEUR DIAG TDAH 001
formulas: FORM NEUR DOPA LISD 001, FORM COGN NOOT CGAV 001
injetaveis: INJE ENDO SUPR ALFA 400
exames: cascata BLK0008:GBAS + ferritina + zinco
fraseologia: "TDAH em adulto tem caminhos bem definidos..."
```

#### CENÁRIO 11 — DEPRESSÃO LEVE-MODERADA INTEGRATIVA
```
codigo_sinapse: SIN DEPR INTE 0001
gatilhos: QSNT NEUR SNAI DEPR 001 OR QSNT NEUR SNAI ANED 001
formulas: FORM HORM MODU ADLI 001, FORM NEUR ADAP COMP 001
injetaveis: INJE ENDO SUPR 5HTP 020, INJE ENDO SUPR MTCB 025
endovenosos: ENDO SORO TERA COGN 001
exames: cascata BLK0008:GBAS + vitamina D + B12 + folato + TSH
fraseologia: "Depressão integrativa tem ataque por neurotransmissor..."
```

#### CENÁRIO 12 — BARIÁTRICA — REPOSIÇÃO PÓS-CIRÚRGICA
```
codigo_sinapse: SIN BARI REPO 0001
gatilhos: QCIR GAST PROC BARI 001 OR QCIR GAST PROC BYPS 001 OR
         QCIR GAST PROC SLEE 001
formulas: FORM VITA REPO FEAB 001 (ferro+cofatores absorção)
injetaveis: INJE ENDO SUPR MTCB 2500 (mensal), INJE MUSC SUPR VITD 100000,
         INJE ENDO SUPR CPLB 050 (complexo B sem B1)
exames: cascata BLK0010:GAMP (deficiência absorção ampla)
fraseologia: "Bariátrica exige reposição vitalícia — vamos estruturar..."
```

#### CENÁRIO 13 — HASHIMOTO / HIPOTIREOIDISMO AUTOIMUNE
```
codigo_sinapse: SIN TIRE AUTO 0001
gatilhos: QDGN TIRE DIAG HIPO 001 OR QDGN TIRE DIAG HASH 001
formulas: FORM TIRE BLEN TCOM 001, FORM TIRE SUPO IOSE 001
exames: cascata BLK0002:GINT + Anti-TPO + Anti-Tg + USG tireoide
injetaveis: INJE ENDO SUPR SELE 200 (selênio para autoimunidade)
fraseologia: "Hashimoto responde bem ao tratamento integrativo..."
```

#### CENÁRIO 14 — LONGEVIDADE PREVENTIVA (paciente >40 saudável)
```
codigo_sinapse: SIN LONG PREV 0001
gatilhos: idade>40 + IMC<28 + sem doenças graves + interesse declarado
endovenosos: ENDO SORO TERA OXID 001 (mensal manutenção)
implantes: IMPL HORM SUBC DHEA 001, IMPL HORM SUBC NADH 001
formulas: FORM ANTI BASE ALAX 001, FORM PERF VASO BETE 001
exames: cascata BLK0001:GSOF (sofisticada longevidade)
fraseologia: "Você está num momento ideal para um protocolo completo..."
```

#### CENÁRIO 15 — CHECK-UP ANUAL EXECUTIVO
```
codigo_sinapse: SIN EXEC ANUA 0001
gatilhos: nenhum sintoma grave + paciente solicita "check-up"
exames: cascata BLK0001:GAMP (base ampla anual) + cardio + imagem
formulas: nenhuma de partida (aguarda resultado dos exames)
fraseologia: "Vamos fazer o mapeamento completo..."
```

### §4.3 — Total de UPSERTs

Quando o Dr. Replit executar:
- **415 perguntas anamnese** (10 B1: QSNT/QDGN/QCIR/QFAM/QHAB/QSEX/QPSI/QPRF/QVIT/QHDA)
- **80 fórmulas** (catálogo, 11 ativas + 69 pendentes revisão)
- **162 injetáveis** (12 ativas + 30 pendentes prioridade alta + 120 pendentes baixa)
- **11 soros endovenosos**
- **32 implantes**
- **+233 exames** (que já existem no sistema, segundo doc 09)
- **15 sinapses complexas-modelo**
- **~150 sinapses simples** (1 gatilho → 1 procedimento)

**Total: ~1.100 itens cadastrados no Sprint 3+5+6.**

---

## §5 — INTEGRAÇÃO COM A CRANIOTOMIA V4 (do doc 14)

A Craniotomia V4 Split-View do Dr. Replit precisa ganhar **3 visões novas**
no modo Visualização:

### §5.1 — Visão "Funil de Anamnese"
Mostra as 415 perguntas agrupadas pelos 5 níveis (Expressa→Full).
Toggle por nível: liga/desliga qual nível ativa cada pergunta.
Permite Caio personalizar quais perguntas entram em cada nível.

### §5.2 — Visão "Cascata Bloco-Grade"
Mostra a relação bloco → grade → exames cascateados.
Permite ligar/desligar `aplica_cascata_grade` por sinapse.
Mostra grades sobrepostas com badge "duplicação evitada".

### §5.3 — Visão "Sinapses Complexas"
Mostra as 15 sinapses-modelo (Cenários 1-15) como "templates" que disparam
múltiplos procedimentos. Cada uma editável (mudar quais procedimentos
sugere, qual fraseologia, qual prioridade).

---

## §6 — INSTRUÇÕES OPERACIONAIS PRO DR. REPLIT

### §6.1 — Sequência atualizada de Sprints

1. **Sprint 2.5** (já em curso): Craniotomia V4 codada como mockup no Canvas
2. **Sprint A** (paralelo): Validação da regra bloco-grade comigo (§1 deste doc)
3. **Sprint 3**: UPSERT 81 fórmulas (com flags `pendente_revisao_caio`)
4. **Sprint 4**: Bridge V13→V4 nas 11 regras legadas
5. **Sprint 5**: UPSERT 415 perguntas anamnese (com `nivel_minimo`)
6. **Sprint 6**: UPSERT 162 injetáveis + 11 soros + 32 implantes
7. **Sprint 7**: UPSERT 15 sinapses complexas-modelo + ~150 simples
8. **Sprint 8**: Hardening matching (regex \b + score + negadores) — do doc 08
9. **Sprint 9**: Ativar regras (mudar `ativo=false` → `true` em lote curado)
10. **Sprint 10**: Craniotomia V4 codada de verdade (UI real conectada ao banco)
11. **Sprint 11**: Tela de seleção de nível de anamnese (5 níveis)
12. **Sprint 12**: Feedback loop (taxa aceitação por sinapse)

### §6.2 — Perguntas pra você responder antes de codar

1. **Regra bloco-grade-cascata**: você confirma que já tem isso implementado?
   Se não, aceita a arquitetura que propus em §1?

2. **Tabela `sinapses_complexas` vs estender `regras_motor`**: você prefere
   criar tabela nova (com FKs múltiplos pra cada tipo de procedimento) ou
   estender `regras_motor` com colunas array `formulas_sugeridas[]`,
   `injetaveis_sugeridos[]`, etc?

3. **`anamnese_sessoes` vs reaproveitar `consultas`**: você já tem tabela
   `consultas` ou similar? Faz sentido `anamnese_sessoes` ser tabela própria
   ou uma view filtrada de `consultas`?

4. **Fraseologia**: aceita guardar no campo `fraseologia_paciente` em
   `regras_motor` (uma string por regra) ou prefere tabela `fraseologias`
   separada com versionamento (várias fraseologias por regra, médico
   escolhe)?

5. **Sobre o catálogo de exames (233 itens já existentes no sistema)**: você
   confirma que a estrutura bloco→grade está implementada e que eu posso
   referenciar grades como `BLK0002:GINT` sem precisar criar nada novo?

6. **Sobre o catálogo de injetáveis**: o Caio quer saber se você prefere
   puxar os 30 mais usados do histórico das 8.728 receitas ou se ele deve
   mandar lista manual. Sua recomendação técnica?

### §6.3 — Princípios inegociáveis

- Caminho B preservado (zero ruptura do V13)
- Zero `db:push`, apenas migrations aditivas `IF NOT EXISTS`
- Campo `perfil` (nunca `role`)
- Códigos semânticos internalizados (UI mostra nome amigável)
- Sem emojis, ícones tabler `ti-*`
- Sem drag-and-drop
- Toggles ON/OFF (não checkbox)
- Diff lado a lado em ações destrutivas
- Validação dupla (digitação de código) em exclusão permanente
- Governança herdada de `fluxos_aprovacoes` (NUNCA recriar)
- Auditoria append-only em `craniotomia_edicoes`

### §6.4 — Invariantes intocadas

- 5.408 pacientes Pádua
- 8.728 receitas em produção
- R$ 2.736.536,10 em comissão potencial
- 6 triggers Wave 9
- 37 regras_motor V13 ativas
- Governança N1→N2→N3 (cascata existente)
- Validador Mestre (nunca_opera=true)

---

## §7 — RESUMO EXECUTIVO PRO CAIO

Caio, este é o cérebro completo do sistema. Quando o Dr. Replit executar
os Sprints 2.5 a 12 (estimativa: 4-6 semanas de trabalho focado):

- **Anamnese**: 5 padrões progressivos (Expressa 5min → Full 90min),
  415 perguntas catalogadas, ativação inteligente por contexto
- **Procedimentos**: 6 tipos definidos (Fórmula, Injetável IM, Soro EV,
  Implante, Exame, Receita farmácia), ~530 itens catalogados
- **Sinapses**: ~150 simples + 15 complexas-modelo, cascata bloco-grade,
  desduplicação automática, fraseologia comercial-clínica integrada
- **Craniotomia V4**: split-view sincronizado, edição inline, simulador
  embutido, governança herdada, auditoria append-only
- **Funil comercial**: cada gatilho clínico sugere múltiplos tipos de
  procedimento simultaneamente, com fraseologia que desperta desejo
  sem agressividade

Você opera a clínica. O sistema opera o cérebro.

**Próximo passo**: Dr. Replit responde §6.2 (6 perguntas técnicas) e
inicia Sprint A (validação regra bloco-grade) em paralelo com a
conclusão do mockup Craniotomia V4.
