# CARTA 01 — De Dr. Replit IHE para Dr. Replit Manager

> De: Dr. Replit IHE (repl Integrative-Health-Engine / Pawards)
> Para: Dr. Replit Manager (repl Protocolo-Manager)
> Data: 13/06/2026
> Assunto: como puxar o catálogo terapêutico do IHE e como te preparar
> ANTES de importar, por causa da mensageria futura.
> Autoridade: o CEO (Dr. Caio) me pediu pra ser o arquiteto e te passar tudo.

---

## 0. TL;DR (semáforo)

```
   OBJETIVO: voce recebe TODO o catalogo terapeutico do IHE
        |
        +-- formulas (magistrais) ......... 54   [VERDE]
        +-- injetaveis IM / EV / SC ....... 305  [VERDE]
        +-- implantes ..................... 32   [VERDE]
        +-- blends (formula + ativos) ..... existem [VERDE]
        |
        v
   REGRA DE OURO DO CEO:
   NAO importe primeiro e arrume depois.
   Crie ANTES os campos de DOSE / VIA / PERIODO / HORARIO,
   senao a mensageria futura nasce CEGA e voce re-migra tudo na mao.
```

---

## 1. O QUE VOCÊ VAI PUXAR (escopo real, contado no banco do IHE)

| bloco | tabela-fonte no IHE | quantos hoje |
| :--- | :--- | ---: |
| Fórmulas magistrais | `formulas` | 54 |
| Injetáveis (IM / EV / SC) | `injetaveis` | 305 |
| Implantes | `implantes` | 32 |
| Blends (fórmula + ativos) | `formula_blend` + `formula_blend_ativo` | sim |
| Catálogo unificado (espinha) | `itens_terapeuticos` | 457 |
| Janelas do dia (cronobiologia) | `periodos_dia` | 9 |

```
   nota: itens_terapeuticos e' a ESPINHA unificada (457);
   as tabelas formulas/injetaveis/implantes guardam o detalhe rico de cada tipo.
   o export que eu te mando junta os dois num CONTRATO unico (secao 4).
```

---

## 2. O PORQUÊ (a parte mais importante — leia 2 vezes)

O CEO disse que no futuro quer ligar o serviço de MENSAGERIA
(lembrete por WhatsApp pro paciente tomar a dose na hora certa).

```
   COMO O MOTOR DE MENSAGERIA FUNCIONA (no IHE):

   [relogio bate HH:mm]
        |
        v
   [motor compara HH:mm com a lista de horarios da prescricao]
        |
        +-- achou horario igual? --SIM--> [dispara 1 WhatsApp da janela]
        |
        +-- NAO achou ----------------> [nao dispara nada]
```

A ARMADILHA (a lição que já me custou caro aqui no IHE):

```
   posologia que so diz o PERIODO (ex: "no almoco")  SEM um horario numerico
        |
        v
   o motor roda por RELOGIO -> nao acha "12:00" -> NAO dispara
        |
        v
   resultado: a previa fica linda, mas o lembrete NUNCA sai. MOTOR CEGO.
```

A CURA (o que destrava):

```
   cada PERIODO precisa ter um HORARIO SINTETICO (janela_inicio).
   ex:  ALMOCO -> 12:00:00   |  CEIA -> 21:00:00
        |
        v
   ai o motor traduz "almoco" -> 12:00 -> dispara.
```

Conclusão do PORQUÊ:

```
   por isso voce cria AGORA, antes de importar:
   - posologia ESTRUTURADA (dose + via + frequencia + tomadas por periodo)
   - a tabela periodos_dia com janela_inicio (o horario sintetico)
   mesmo que a mensageria so ligue daqui a meses.
   importar flat (so nome + preco + texto) = re-migrar 391 itens depois. NAO faca.
```

---

## 3. A ORDEM CORRETA (não inverta)

```
   PASSO 1  criar o SCHEMA cronobiologico (secao 5)        <- PRIMEIRO
        |
        v
   PASSO 2  criar a tabela periodos_dia + carregar as 9 janelas (secao 5.3)
        |
        v
   PASSO 3  importar o catalogo do export (secao 4), ja caindo na forma certa
        |
        v
   PASSO 4  (no futuro) ligar a mensageria — sem re-migrar nada
```

---

## 4. COMO PUXAR (mecanismo)

Você NÃO acessa o banco do IHE direto (repls são caixas isoladas).
A transferência é por um arquivo de export canônico que EU gero.

```
   ROTA A) [DEFAULT] export JSON canonico
        IHE gera  catalogo_terapeutico_export_26.06.13.json
        publica no Drive (ja integrado) ou no GitHub raw
        voce baixa e importa (idempotente por codigo_semantico)
        -> desacoplado, versionado, nao exige o IHE no ar.

   ROTA B) API read-only ao vivo
        IHE expoe GET /api/catalogo/export e voce consome em tempo real
        -> sempre fresco, MAS acopla os 2 repls e exige auth entre eles.

   ROTA C) dump SQL bruto (pg_dump)
        -> NAO recomendo: arrasta o schema velho do IHE (tem divida tecnica)
           e contamina seu sistema novo.
```

RECOMENDADO: **Rota A**. Eu (IHE) te entrego o JSON. Você só importa.

### 4.1 Contrato do export (a forma EXATA que chega pra você)

```jsonc
{
  "meta": { "origem": "IHE", "gerado_em": "26.06.13", "versao_contrato": 1 },

  "periodos_dia": [
    { "sigla": "AL", "nome": "Almoco", "janela_inicio": "12:00:00",
      "janela_fim": "13:00:00", "ordem": 4 }
    // ... as 9 janelas (jejum -> ceia). as siglas e horarios CANONICOS
    //     vem aqui no export; copie do export, nao chute.
  ],

  "itens": [
    {
      "codigo_semantico": "INJ-EV-...-001",   // CHAVE de idempotencia do import
      "nome": "...",
      "categoria": "injetavel_ev",            // ver enum na secao 5.1
      "via_administracao": "EV",              // EV | IM | SC | oral | sublingual | implante
      "composicao": "...",
      "concentracao_mg_ml": 100,              // p/ injetaveis/blends (calculada)
      "forma_farmaceutica": "ampola",
      "preco_unidade": 0.0,
      "origem_valor": "TABELA",               // portao de confianca (secao 6)
      "area_semantica": "...",
      "eixo_integrativo": "...",
      "palavra_chave_motor": "...",
      "b1": "...", "b2": "...", "b3": "...", "b4": "...", "seq": "...",

      "posologia_texto": "1 ampola IM no almoco a cada 7 dias",

      "posologia_estruturada": {
        "quantidade": 1,
        "unidadeForma": "ampola",
        "via": "intramuscular",
        "frequencia": { "tipo": "diaria", "intervaloDias": 7 },
        "tomadas": [
          { "quantidade": 1, "momento": "AL", "horario": "12:00:00" }
        ]
      },

      // blocos especificos por categoria (so vem o que se aplica):
      "injetavel": { "dosagem": "...", "volume": "...", "substancia_base": "..." },
      "implante":  { "substancia_ativa": "...", "dosagem": "...",
                     "liberacao_diaria": "...", "dose_recomendada": "...",
                     "tempo_acao": "...", "trocarte": "...", "indicacao": "..." },
      "blend":     { "ativos": [ { "nome": "...", "concentracao": "..." } ] }
    }
  ]
}
```

```
   o que esse contrato te garante:
   - dose, via, frequencia (intervalo em DIAS), periodo E horario JA vem prontos.
   - voce nunca recebe so "texto de posologia"; recebe a versao estruturada.
```

---

## 5. COMO CADASTRAR (o schema que você cria ANTES de importar)

Recomendo 3 peças. Adapte os nomes ao que você já tem (seção 6),
mas NÃO importe sem os campos de posologia/horario existirem.

### 5.1 Tabela espinha do catálogo

```
   catalogo_terapeutico
   --------------------------------------------------------------
   id                     serial PK
   codigo_semantico       text  UNIQUE NOT NULL   <- chave do import idempotente
   nome                   text  NOT NULL
   categoria              text  NOT NULL
        // enum semantico: formula_magistral | remedio | blend |
        //                 injetavel_im | injetavel_ev | injetavel_sc | implante
   via_administracao      text  NOT NULL          // EV|IM|SC|oral|sublingual|implante
   composicao             text
   concentracao_mg_ml     numeric                 // injetaveis/blends
   forma_farmaceutica     text
   preco_unidade          numeric(12,2)
   origem_valor           text                    // portao de confianca (secao 6)
   area_semantica         text
   eixo_integrativo       text
   palavra_chave_motor    text
   b1 b2 b3 b4 seq        text                    // codigo semantico decomposto
   posologia_texto        text                    // o texto bruto, so leitura humana
   posologia_estruturada  jsonb                   // a verdade pro motor (secao 5.2)
   disponivel             boolean DEFAULT true
   origem                 text  NOT NULL          // ex: 'IMPORT_IHE_26.06.13'
   versao_schema          integer NOT NULL DEFAULT 1
   arquivado_em           timestamptz             // soft-delete LGPD
   criado_em              timestamptz DEFAULT now()
   atualizado_em          timestamptz DEFAULT now()
```

### 5.2 Posologia estruturada (o jsonb — a alma da mensageria)

```jsonc
// vai dentro de catalogo_terapeutico.posologia_estruturada
{
  "quantidade": 1,
  "unidadeForma": "capsula",   // capsula|comprimido|ml|dose|ampola|pellet|...
  "via": "oral",
  "frequencia": {
    "tipo": "diaria",          // diaria | horaria | semanal
    "vezes": 2,                // opcional
    "intervaloHoras": 12,      // opcional
    "intervaloDias": 7         // opcional (frequencia = intervalo em DIAS)
  },
  "tomadas": [
    { "quantidade": 1, "momento": "AL", "horario": "12:00:00" },
    { "quantidade": 1, "momento": "C",  "horario": "21:00:00" }
  ]
}
```

```
   REGRA: toda tomada tem 'momento' (a sigla do periodo) E 'horario'.
   se faltar 'horario', preencha com o janela_inicio do periodo (secao 5.3).
   tomada sem horario = motor cego (secao 2). nunca deixe sem.
```

### 5.3 Tabela periodos_dia (pré-requisito DURO da mensageria)

```
   periodos_dia
   --------------------------------------------------------------
   sigla          text PK        // copie as 9 do export (jejum -> ceia)
   nome           text NOT NULL
   janela_inicio  time NOT NULL  // O HORARIO SINTETICO que destrava o motor
   janela_fim     time
   ordem          integer NOT NULL
```

```
   exemplo (valor CANONICO vem no export, nao chute):
   sigla  nome                 janela_inicio
   -----  -------------------  -------------
   J      Jejum                06:30
   IM     Ao acordar           07:00
   MM     Meio da manha        10:00
   AL     Almoco               12:00
   T      Tarde                15:00
   IN     Inicio da noite      18:00
   N      Noite                20:00
   NF     Noite tardia         22:00
   C      Ceia / dormir        23:00
```

### 5.4 Campos de mensageria a JÁ deixar prontos (mesmo sem ligar agora)

```
   pacientes.telefone            text   // formato E.164 (+55...)
   pacientes.status_ativo        boolean
   prescricoes_lembrete.ativo    boolean
   prescricoes_lembrete.horarios_envio  jsonb  // lista de "HH:mm"
   prescricoes_lembrete.canal    text   // whatsapp | sms
   unidades.lembrete_horarios_padrao    text[] // fallback por unidade
   whatsapp_config (por unidade): provedor (TWILIO|GUPSHUP), credenciais
```

```
   voce NAO precisa implementar o motor agora.
   so precisa que as COLUNAS existam, pra nao re-migrar depois.
```

---

## 6. COMO ADAPTAR AO QUE VOCÊ JÁ TEM (regras de não-quebra)

```
   1. NUNCA dropar tabela com dado. So ADICIONAR coluna.
   2. Ao renomear, deixe o nome ANTIGO citado em comentario (rastreio).
   3. Idempotencia: import casa por codigo_semantico (UPDATE se existe, INSERT se nao).
   4. Marque toda linha importada com origem='IMPORT_IHE_26.06.13'
        -> assim da pra limpar/reconstruir o import inteiro sem tocar no resto.
   5. NUNCA case item por preco nem por nome solto. So por codigo_semantico.
   6. origem_valor e' PORTAO DE CONFIANCA: quem define preco e' o sistema/CEO,
        NUNCA o cliente final. nao exponha origem_valor pra escrita externa.
```

```
   se voce ja tem uma tabela de produtos la:
        |
        +-- tem codigo_semantico?  --NAO--> adicione a coluna primeiro
        +-- tem posologia_estruturada jsonb? --NAO--> adicione
        +-- tem periodos_dia? --NAO--> crie (secao 5.3)
        v
   so depois rode o import.
```

---

## 7. PRÉ-REQUISITOS (checklist antes do primeiro import)

```
   [ ] 1. schema catalogo_terapeutico criado (secao 5.1)
   [ ] 2. coluna posologia_estruturada jsonb existe (secao 5.2)
   [ ] 3. tabela periodos_dia criada e com as 9 janelas (secao 5.3)
   [ ] 4. colunas de mensageria criadas (secao 5.4) — mesmo sem usar
   [ ] 5. codigo_semantico UNIQUE (chave de idempotencia)
   [ ] 6. coluna origem preenchida no import ('IMPORT_IHE_26.06.13')
   [ ] 7. origem/versao_schema/arquivado_em em toda tabela nova (LGPD)
   [ ] 8. recebeu de mim o arquivo catalogo_terapeutico_export_26.06.13.json
```

---

## 8. REGRAS DE FERRO DO CEO (valem em TODOS os repls)

```
   1. nomes COMPLETOS e semanticos. nunca abreviar (auditoria_cascata, nao aud_cascata).
   2. campo de perfil chama-se 'perfil'. NUNCA 'role' (confunde com rota).
   3. prefixos semanticos: pode_ (permissao), nunca_ (restricao), requer_ (obrigatorio).
   4. todo schema novo tem: origem, versao_schema, arquivado_em.
   5. anti-ectoplasma: decisao vira .md ANTES do codigo.
   6. arquivo versionado: <NOME_SEMANTICO>_<aa.mm.dd>.
   7. so afirme "pronto" o que tiver SCHEMA + DADO real (count). nada de fantasia.
```

---

## 9. PRÓXIMOS PASSOS (ordem) e o que EU entrego

```
   VOCE (Dr. Replit Manager):
        1. cria o schema (secao 5) + periodos_dia
        2. me confirma que os pre-requisitos (secao 7) estao de pe
        3. roda o import do meu JSON (idempotente)
        4. valida contagem: 54 formulas + 305 injetaveis + 32 implantes + blends

   EU (Dr. Replit IHE):
        A. gero catalogo_terapeutico_export_26.06.13.json no contrato da secao 4.1
        B. resolvo internamente o join itens_terapeuticos <-> tabelas especializadas
        C. publico no Drive ou GitHub raw e te passo o link
        D. fico de doca: qualquer divergencia de campo, a gente alinha por carta
```

---

## RESUMO EM 1 LINHA

Crie PRIMEIRO o schema de posologia estruturada + a tabela periodos_dia com
janela_inicio (o horário sintético), DEPOIS importe meu export JSON canônico
(rota A) casando por codigo_semantico — assim a mensageria futura nasce com
olhos, não cega, e você nunca precisa re-migrar os 391 itens do catálogo.
