# 00 — CARTA DE ESTADO REAL DO SISTEMA PAWARDS

> Autor: Dr. Replit (engenheiro senior, trabalha direto na main)
> Destinatarios: Dr. Claude (orquestrador) e Dr. Code (programador pleno)
> Data de aferição: 04/06/2026
> Audiencia: LLMs de engenharia. NAO escrita para o CEO ler.
> Contrato: sinceridade absoluta. Toda afirmacao aqui esta ancorada em
>   contagem `SELECT count(*)` real do banco vivo ou em arquivo/rota real
>   do repo. Onde algo e proposta e nao codigo, esta marcado PROPOSTO.
>   Anti-ectoplasma: nada de "deve fazer" disfarcado de "faz".

---

## 1. LEGENDA DE STATUS (usar em todo handoff)

- REAL — codigo existe, esta plugado numa rota/serviço e a tabela tem dados.
- LATENTE — schema existe e/ou codigo existe, mas o DADO nao foi materializado
  ou o loop downstream nunca foi exercido. A engrenagem gira no vazio.
- PROPOSTO — so existe `.md` de spec. Zero schema, zero rota, zero dado.

Regra: nunca relatar LATENTE ou PROPOSTO como REAL. Esse e o pecado capital
do projeto (o "ectoplasma").

---

## 2. TOPOLOGIA (o que e o sistema, em 6 linhas)

2.1. Monorepo pnpm. Node 24, TypeScript 5.9.
2.2. Artifacts: `api-server` (Express 5), `clinica-motor` (React+Vite, web),
     `mockup-sandbox` (canvas de prototipos).
2.3. Banco: PostgreSQL + Drizzle ORM. Contrato OpenAPI-first com Orval
     (exceto modulos legados que usam `apiFetch` direto, ex: substancias).
2.4. Schema vive em `lib/db/src/schema/`. Rotas em `artifacts/api-server/src/routes/`.
2.5. Proxy unico roteia por path. `clinica-motor` serve em `/`, api em `/api`.
2.6. Migrations sao SQL numerado aplicado via psql. `db push` e PROIBIDO
     (ver secao 8, regra de ferro — schema `pacientes` dessincronizado, P008).

---

## 3. O RIO PRINCIPAL — MOTOR CLINICO DE SINAPSES (REAL, com ressalva)

Este e o coracao do produto. O fluxo abaixo esta plugado e dispara de verdade.

```
anamneses (a ignicao)
   │  POST /anamnese/:id/ativar-motor   (routes/anamnese.ts)
   ▼
extrai SINAIS semanticos das respostas
   Q010 queixa · Q012 sintomas · Q013 doencas · Q014 historico familiar
   Q032 pref injetavel · Q033 pref implante · Q041 perfil financeiro
   ▼
match contra regras_motor  (palavra_chave  ~  sinal, case-insensitive)
   filtra por preferencia do paciente (ex: "nao quero implante" descarta segmento)
   ▼
lookup do codigo_referencia em itens_terapeuticos  (catalogo unificado)
   ▼
INSERT em sugestoes_clinicas  (status='pendente', justificativa gerada)
   ▼
validacao humana (o MANDRIL)
   POST /motor-clinico/sugestoes/:id/validar  (routes/motorClinico.ts)
   pendente -> validado | rejeitado   (sem transicao automatica para
   em_execucao no endpoint validar — verificado em motorClinico.ts)
```

3.1. Arquivos exatos:
- Motor (extracao + match + persistencia): `routes/anamnese.ts` (handler de `ativar-motor`).
- Gestao de sugestao + validacao: `routes/motorClinico.ts`.
- Sync do catalogo unificado: `POST /motor-clinico/sync-catalogo` — NAO e UPSERT.
  E rebuild transacional: limpa `item_terapeutico_id` das sugestoes, faz
  `delete(itens_terapeuticos)` e reinsere em batch a partir das tabelas legadas
  (verificado em motorClinico.ts). Atencao: rebuild apaga e recria, entao a
  paridade so vale no instante do sync.
- Schema: `lib/db/src/schema/regrasMotor.ts`, `sugestoes.ts`, `itensTerapeuticos.ts`.
- Seed das regras: `seed.ts` (expande arrays de palavra_chave em 1 linha por chave).
- UI que aciona: `clinica-motor/src/pages/anamnese/[id].tsx`.

3.2. RESSALVA HONESTA (por que "REAL com ressalva"):
- O motor dispara e PERSISTE, mas as 16 sugestoes existentes estao TODAS em
  `status='pendente'` (ver secao 4). O loop de validacao humana -> execucao
  nunca foi fechado com dado real. Nao verifiquei existencia de teste E2E
  cobrindo downstream de uma sugestao VALIDADA (execucao, PDF, mensageria);
  tratar esse downstream como NAO PROVADO ate alguem exercitar fim-a-fim.

---

## 4. ESTADO VIVO DO BANCO (aferição exata 04/06/2026)

Contagens por `SELECT count(*)` real (nao estimativa de planner). Estes
numeros sao a fonte-de-verdade do que esta REAL vs LATENTE.

| Tabela                | Linhas | Leitura                                            |
|-----------------------|--------|----------------------------------------------------|
| pacientes             | 5.411  | REAL — base de pacientes presente neste banco      |
| usuarios              |   140  | REAL                                               |
| unidades              |    17  | REAL — multi-unidade ativo                         |
| anamneses             |    47  | REAL — ignicoes registradas                        |
| regras_motor          |    37  | REAL — motor seedado e ativo                       |
| sugestoes_clinicas    |    16  | LATENTE — todas `pendente`, loop nao fechado       |
| itens_terapeuticos    |   457  | REAL — catalogo unificado povoado (rebuild sync)   |
| injetaveis            |   305  | REAL (legado estratificado)                        |
| endovenosos           |    63  | REAL                                               |
| formulas              |    54  | REAL                                               |
| doencas               |    58  | REAL                                               |
| implantes             |    32  | REAL                                               |
| substancias           |    52  | REAL (ativos das formulas)                         |
| dietas                |    48  | REAL (catalogo PLANO/flat legado, ver secao 7)     |
| questionario_master   |    19  | REAL (perguntas da anamnese)                       |
| protocolos_master     |    11  | REAL                                               |

ATENCAO METODOLOGICA (licao desta sessao): `pg_stat_user_tables.n_live_tup`
retornou numeros STALE (mostrou 0 em tabelas que tem centenas de linhas)
porque o ANALYZE nao tinha rodado. SEMPRE confirmar com `SELECT count(*)`
exato antes de afirmar "tabela vazia". Quase relatei o sistema como morto
quando ele esta vivo. Isto e literalmente o erro que o CEO mais teme.

---

## 5. ENGRENAGENS LATENTES (schema/codigo pronto, dado/loop incompleto)

5.1. PONTE SEMANTICA V4 — a engrenagem que o CEO perguntou diretamente.
- Fato: `regras_motor` tem 37 linhas. `codigo_referencia_v4` esta preenchido
  em 0 de 37 (`com_v4=0, sem_v4=37`).
- O que foi feito: migration 072 fez `ALTER TABLE regras_motor ADD COLUMN
  codigo_referencia_v4` + indice condicional (DDL aditivo, Caminho B).
- O que NAO foi feito: o UPSERT que traduz os codigos V13 -> V4 (Sprint 4/5
  do plano). A coluna existe e esta vazia.
- Status: LATENTE por desenho (ver secao 6 para o porque, que e a pergunta
  central do CEO).

5.2. SUGESTOES NAO VALIDADAS.
- 16 sugestoes, 100% `pendente`. O MANDRIL (validacao humana) nunca rodou
  sobre dado real. Materializar isso = exercitar `validar` e o que vem depois.

5.3. CATALOGO DUPLO (transicao inacabada).
- A verdade vive em DUAS camadas: tabelas legadas estratificadas (`injetaveis`,
  `formulas`, `endovenosos`...) E o catalogo unificado `itens_terapeuticos` (457).
- A rota `/catalogo/itens-unificados` AGREGA dinamicamente das legadas;
  `itens_terapeuticos` tem 457 linhas (fato de banco). A origem exata dessas
  linhas (rebuild via sync-catalogo vs seed) nao foi provada so pelo codigo;
  nao afirmar a causa. Nao ha garantia de paridade continua com as legadas
  apos o rebuild. Convergir essas camadas e divida arquitetural aberta.

---

## 6. A PERGUNTA DO CEO: "POR QUE DDL (SQL contra o codigo) E NAO SELECT/UPSERT?"

Resposta sincera, sem auto-defesa. Tres causas reais, nesta ordem de peso:

6.1. CAMINHO B (decisao do Dr. Claude, deliberada).
- Para a ponte V4, a regra acordada e: o codigo V13 PERMANECE autoritativo
  ate o CEO bater o martelo do swap. Preencher `codigo_referencia_v4` antes
  disso = preparar a troca sem aprovacao.
- Logo eu (Dr. Replit) fiz a parte SEGURA e reversivel (adicionar coluna
  vazia, DDL aditivo) e PAREI antes do UPSERT, por desenho. Isso e correto
  para a V4. O erro nao e ter parado; e nao ter deixado VISIVEL que parou
  (ficou parecendo engrenagem pronta quando e engrenagem latente).

6.2. TRAUMA DO P008 (medo de escrever dado).
- O schema Drizzle de `pacientes` esta dessincronizado ~24 colunas vs banco
  real. `db push` poderia DROPAR colunas reais. Isso me deixou hiper-cauteloso
  com QUALQUER escrita que nao fosse estritamente aditiva.
- Consequencia colateral: passei a tratar UPSERT de dado (que e seguro e
  reversivel) com o mesmo medo de um `db push` (que e destrutivo). Sao coisas
  diferentes. UPSERT idempotente em tabela de catalogo/regra NAO e perigoso.
  Esse excesso de cautela travou materializacoes que eram seguras.

6.3. PROTOCOLO ANTI-ECTOPLASMA mal sequenciado.
- Toda conversa validada virava `.md` de proposta (docs/dr-replit/PROPOSTAS,
  docs/MASTERMIND). Otimo para rastreabilidade.
- Mas a etapa "materializar o dado (seed/UPSERT)" virava um "Sprint N" futuro
  que, sem ser agendado, nunca rodava. Resultado: muitas engrenagens pararam
  em "schema + proposta aprovada", sem o INSERT que as acende.

6.4. CONCLUSAO OPERACIONAL (regra nova para a equipe):
- DDL aditivo e o ESQUELETO. UPSERT idempotente e o SANGUE. Uma feature so e
  REAL quando os dois rodaram. Ao entregar, declarar explicitamente:
  "schema aplicado" E "dado materializado (N linhas)" — ou marcar LATENTE.
- UPSERT idempotente de catalogo/regra NAO precisa de martelo do CEO; o que
  precisa de martelo e SWAP de fonte-autoritativa (ex: V13 -> V4) e DELETE.

---

## 7. NOVA FERRAMENTA — PROTOCOLO INTEGRATIVO (DIETA + TREINO)

Origem: spec do Dr. Claude (doc "26 — SPEC PROTOCOLO INTEGRATIVO", destinada
a docs/MASTERMIND/PROPOSTAS). Decisoes do CEO: 4.1A (gerador parametrico),
4.2A (Dr. Claude gera base, CEO valida por amostragem), 4.3A (4 templates de
treino), 4.4 (modulo proprio que sai junto no mesmo PDF/WhatsApp), 4.5A.

7.1. ESTADO REAL HOJE (sincero):
- `dietas` (48 linhas) EXISTE, mas e o catalogo LEGADO FLAT: colunas
  `codigo_dieta, modelo_dieta, faixa_calorica, refeicao, opcao_1..3, b1..b4, seq`.
  NAO e o gerador parametrico da spec.
- As tabelas da spec (`dieta_blocos_refeicao`, `dieta_planos`,
  `dieta_plano_refeicoes`, `treino_templates`, `treino_sessoes`,
  `treino_exercicios`, `treino_planos`) NAO EXISTEM. Confirmado via
  information_schema: zero linhas de resultado.
- TREINO: PROPOSTO puro. Zero schema, zero rota, zero dado.

7.2. INSIGHT ARQUITETURAL DA SPEC (valido e barato):
- Dieta e Treino NAO sao ilha nova. Entram como NOVAS CATEGORIAS no mesmo rio
  da secao 3, via extensao ADITIVA de 3 enums:
  - `regras_motor.segmento` += dieta, treino, aconselhamento
  - `sugestoes_clinicas.tipo` += dieta, treino, aconselhamento
  - `itens_terapeuticos.categoria` += dieta, treino, aconselhamento
- Assim reusam: mesma fila de validacao (MANDRIL), mesma mensageria
  cronobiologica (9 periodos JE-CE), mesmo PDF/WhatsApp.

7.3. O GERADOR PARAMETRICO (por que e a escolha certa, 4.1A):
- A matriz e 4 tipos x 2 sexos x 7 faixas kcal x 2 num_refeicoes x 2 variacao
  = 448 cardapios. Escrever 448 docs estaticos = ectoplasma maximo.
- Solucao: ~120 blocos modulares (`dieta_blocos_refeicao`) com macros base;
  o gerador distribui kcal_alvo pelas refeicoes (%) e ESCALA porcoes na hora.
  Trocar um alimento = editar 1 bloco; todos os cardapios atualizam.

7.4. SEQUENCIA RECOMENDADA PARA NAO REPETIR O ERRO DA SECAO 6:
- Passo 1 (DDL): migration aditiva — extensao dos 3 enums + tabelas novas.
- Passo 2 (DADO, obrigatorio na MESMA onda): UPSERT idempotente dos ~120
  blocos + 4 templates de treino + regras de seed (D1, D2, D3, T1, A1 da spec).
  Sem o Passo 2, a feature nasce LATENTE.
- Passo 3 (loop): plugar no `ativar-motor` para que anamnese gere sugestao
  tipo dieta/treino, validavel no MANDRIL, e materializavel em plano.

---

## 8. REGRAS DE FERRO (inegociaveis — Dr. Code, leia antes de tocar codigo)

8.1. Zero emoji em UI, codigo, commits e docs. JetBrains Mono. 0px border-radius.
8.2. Tudo em PT-BR. Nomes semanticos COMPLETOS, nunca abreviar
     (`auditoria_cascata`, nunca `aud_cascata`).
8.3. Campo de perfil de usuario e SEMPRE `perfil`, NUNCA `role`
     (`role` se confunde com rota no Express).
8.4. Schema: SO ADICIONAR coluna. NUNCA substituir, dropar ou recriar tabela
     com dado. Ao renomear, manter nome antigo em comentario.
8.5. Migration numerada explicita via psql com `IF NOT EXISTS`. `db push`
     PROIBIDO ate P008 resolvido (schema `pacientes` dessincronizado ~24 colunas).
8.6. Prefixos semanticos de boolean: `pode_` (permissao), `nunca_` (restricao
     permanente), `requer_` (condicao obrigatoria).
8.7. Anti-ectoplasma: proposta `.md` antes do codigo, em
     docs/dr-replit/PROPOSTAS/<data>_<tema>.md, consolidada em docs/MASTERMIND/.
8.8. Arquivos versionados: `<NOME_SEMANTICO>_<aa.mm.dd>`.
8.9. Design: obedecer `.agents/skills/penumbra-design-system/` (faces CLARO
     Paper Ciano / ESCURO Navy Ciano) em qualquer front-end.
8.10. NUNCA citar "8.728 receitas" ou "R$ 2.736.536,10" como real — sao
      POTENCIAL estimado de fichas historicas, nao caixa nem receita emitida.

---

## 9. DIVISAO DE TRABALHO DA EQUIPE

9.1. Dr. Claude (orquestrador): decide arquitetura macro, sequencia de sprints,
     resolve decisoes pendentes (docs/dr-claude/02). Escreve specs numeradas.
9.2. Dr. Code (pleno): implementa dentro de uma onda bem escopada, seguindo
     spec aprovada + regras de ferro. Foco em executar DDL + DADO juntos.
9.3. Dr. Replit (senior): trabalha direto na main, faz a aferição de verdade
     (counts reais), revisa, integra, fecha o loop e marca REAL vs LATENTE.
9.4. Protocolo de handoff: nenhuma onda fecha sem (a) count real do dado
     materializado e (b) declaracao explicita de status por engrenagem.

---

## 10. PROXIMAS ENGRENAGENS A MATERIALIZAR (priorizado, sem inventar)

10.1. P008 — sincronizar schema Drizzle de `pacientes` (~24 colunas) com o
      banco real. Destrava `db push` e remove o medo da secao 6.2. RISCO ALTO,
      fazer com migration aditiva + reconciliacao de schema, nunca push cego.
10.2. Fechar o loop do motor — validar ao menos 1 anamnese fim-a-fim
      (sugestao pendente -> validada -> execucao -> PDF/WhatsApp) para provar
      o rio inteiro com dado real, nao so com teste.
10.3. Ponte V4 — quando o CEO bater o martelo do swap, rodar o UPSERT
      V13 -> V4 (Sprint 4/5). Ate la, manter LATENTE e VISIVEL.
10.4. Protocolo Integrativo (Dieta+Treino) — executar a secao 7.4 inteira
      numa onda so (DDL + DADO + loop), nunca DDL sozinho.
10.5. P009 — importar perguntas da planilha Drive -> `questionario_master`.

---

Fim da carta. Atualizar este documento a cada onda que mude o estado REAL/
LATENTE/PROPOSTO de qualquer engrenagem. Se um numero desta carta divergir
do `SELECT count(*)` de hoje, o banco vence — corrija a carta.
