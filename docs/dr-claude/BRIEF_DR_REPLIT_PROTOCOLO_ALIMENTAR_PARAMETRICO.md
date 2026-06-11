# BRIEF — PROTOCOLO ALIMENTAR PARAMETRICO E EDITAVEL (v2)

> De: Dr. Replit (programador senior)
> Para: Dr. Claude (orquestrador)
> Data: 11/06/2026 (v2 — inclui acesso GitHub + sugestao do CEO sobre calorias)
> Audiencia: LLMs de engenharia. NAO escrito para o CEO ler.
> Contrato: anti-ectoplasma. Estado real ancorado em `SELECT count(*)` do banco
>   vivo (11/06/2026). O que e proposta esta marcado PROPOSTO.

---

## 0. ACESSO — COMO LER ESTE E OS ARQUIVOS CITADOS (push CONFIRMADO)

0.1. O push para o GitHub foi feito em 11/06/2026. Commit `ce1f949a` na branch
     `ver-l2-dr-claude` (confirmado via `git ls-remote`). Antes disso os arquivos
     existiam so no ambiente Replit (auto-commit local), NAO no GitHub — por isso
     voces nao viam. Agora veem.

0.2. Raw URL deste brief:
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/docs/dr-claude/BRIEF_DR_REPLIT_PROTOCOLO_ALIMENTAR_PARAMETRICO.md
```

0.3. Raw URL dos 48 seeds reais (materia-prima do conteudo):
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/docs/dr-replit/exports/DIETAS_48_SEEDS_26.06.11.csv
```

0.4. Para clonar/atualizar o repo localmente (comandos):
```
git clone -b ver-l2-dr-claude https://github.com/caio-padua/Integrative-Health-Engine.git
# ou, se ja clonado:
git fetch origin && git checkout ver-l2-dr-claude && git pull origin ver-l2-dr-claude
```

0.5. Carta-mae do estado real do sistema (leia antes):
```
https://raw.githubusercontent.com/caio-padua/Integrative-Health-Engine/ver-l2-dr-claude/docs/dr-code/00_CARTA_ESTADO_REAL_DO_SISTEMA.md
```

---

## 1. PEDIDO EM UMA FRASE

Transformar dieta de catalogo de texto plano em um GERADOR PARAMETRICO onde
TIPO de dieta, BLOCOS de refeicao e CADA CAMPO nutricional (gramas, porcao,
calorias) sao DADO editavel — nunca codigo — e onde criar um tipo novo
(ex: "dieta da selva") e uma operacao de UI, sem deploy.

---

## 2. ESTADO REAL HOJE (tabela `dietas`, 48 linhas, aferido 11/06/2026)

2.1. Estrutura: 4 tipos (CARNIVORA, CETOGENICA, HIPERPROTEICA, LOW CARB)
     x 3 faixas caloricas (1000, 1500, 2000) x 4 refeicoes (CAFE DA MANHA,
     ALMOCO, JANTAR, LANCHE) = 12 planos (`codigo_dieta`), 48 linhas.
2.2. Cada linha guarda 3 alternativas em `opcao_1`, `opcao_2`, `opcao_3` como
     TEXTO LIVRE (ex: "PICANHA COM OVOS"). Tem tambem `b1..b4` (blocos
     semanticos), `seq` e `codigo_semantico` (ex: "DIET CARN GBAS CAFM 0013").
2.3. O que NAO existe hoje: peso em gramas, peso em porcao (1 colher de sopa
     etc.), calorias por item, e qualquer atomicidade — a opcao e uma string.
2.4. NOTA sobre `codigo_semantico`: hoje os 4 digitos finais sao `seq`
     (sequencial sem significado: 0013, 0014...). Ver requisito R7 (CEO).

## 3. O GAP (por que o atual NAO serve como modelo-alvo)

3.1. Texto livre nao e editavel campo-a-campo. Para mudar a grama de um
     alimento eu teria que editar uma string — fragil, sem recalculo.
3.2. Tipo de dieta esta implicito nas LINHAS. Adicionar "dieta da selva"
     significaria inserir linhas na mao. O CEO quer isso como DADO via UI.
3.3. Sem grama e sem porcao, nao da pra escalar porcoes para bater uma faixa
     calorica alvo (o coracao do gerador parametrico).
3.4. CONCLUSAO: a planilha dos 48 seeds e MATERIA-PRIMA (conteudo real de
     cardapio), nao o modelo final. Reaproveitar o conteudo, descartar a forma.

## 4. REQUISITOS DO CEO (explicitos, 11/06/2026 — vinculantes)

4.1. R1 ATOMICIDADE: cada dado em seu PROPRIO campo, nunca em linha de texto.
4.2. R2 DUPLA MEDIDA: quantidade em GRAMAS e quantidade em PORCAO (valor +
     unidade, ex: "1 colher de sopa", "2 fatias", "1 unidade").
4.3. R3 CALORIAS: por item, somavel por refeicao e por plano.
4.4. R4 TUDO EDITAVEL: campos e blocos de dieta editaveis via UI.
4.5. R5 EXTENSIBILIDADE: criar novos TIPOS de dieta no futuro (ex "dieta da
     selva") como DADO pela UI, sem alterar codigo nem migration.
4.6. R6 PRE-PREENCHIDO: nascer com conteudo pronto (nao tabela vazia).
4.7. R7 CALORIA NO CODIGO SEMANTICO (sugestao CEO 11/06/2026): os 4 digitos
     finais do `codigo_semantico` passam a codificar a QUANTIDADE DE CALORIAS
     (ex: "...CAFM 0350" = cafe da manha de 350 kcal), substituindo o `seq`
     sem significado de hoje. PARECER DO SENIOR (Dr. Replit): otima ideia como
     ESPELHO legivel, MAS a fonte-de-verdade tem que ser uma COLUNA numerica
     `calorias` (R1/R3), nunca so a string. E preciso definir QUAL caloria o
     codigo reflete: a do bloco de REFERENCIA (fixa) ou a do plano ESCALADO
     (varia por faixa). Recomendo: codigo reflete a caloria de REFERENCIA do
     bloco; o plano materializado guarda a caloria escalada em coluna propria.
     Decisao final e do Dr. Claude (ver P-F).

## 5. MODELO DE DADOS ALVO (PROPOSTO por Dr. Replit — voce valida/refina)

Entidades com nomes semanticos completos PT-BR (sem abreviar). Voce ajusta o
que for clinicamente errado e devolve a versao canonica.

5.1. `tipo_dieta` — o tipo como DADO (R5).
     - id, nome (ex CARNIVORA, LOW CARB, DIETA DA SELVA), descricao,
       criado_via (ui|seed), arquivado_em. CRUD pela UI cria tipo novo.

5.2. `alimento` — o ingrediente atomico.
     - id, nome, calorias_por_100_gramas, proteina_por_100_gramas,
       gordura_por_100_gramas, carboidrato_por_100_gramas, observacao.

5.3. `unidade_porcao` — tabela de conversao porcao -> gramas (R2).
     - id, nome (ex "colher de sopa", "fatia", "unidade", "concha"),
       gramas_equivalente. Permite exibir "1 colher de sopa" e ao mesmo tempo
       calcular caloria por grama.

5.4. `bloco_refeicao` — o bloco editavel (R4).
     - id, tipo_dieta_id, periodo_refeicao (ex CAFE DA MANHA), nome_bloco,
       calorias_referencia (R7 — fonte da caloria espelhada no codigo),
       codigo_semantico (4 digitos finais = calorias_referencia), arquivado_em.

5.5. `bloco_refeicao_item` — a LINHA atomica (R1, R2, R3).
     - id, bloco_refeicao_id, alimento_id,
       quantidade_gramas, quantidade_porcao_valor, unidade_porcao_id,
       calorias_calculadas (derivado: calorias_por_100_gramas x gramas / 100),
       ordem. Cada coluna editavel sozinha.

5.6. `dieta_plano` — o plano gerado para um paciente.
     - id, sugestao_id (elo com o motor), paciente_id, tipo_dieta_id,
       faixa_calorica_alvo, numero_refeicoes, origem, versao_schema,
       arquivado_em.

5.7. `dieta_plano_refeicao` — o cardapio materializado e escalado.
     - id, dieta_plano_id, periodo_refeicao, bloco_refeicao_id,
       fator_escala, calorias_escaladas (a caloria real apos escalar).

OBS: este modelo entrega R1-R7 de uma vez. Editar `bloco_refeicao_item` e
edicao campo-a-campo; criar `tipo_dieta` pela UI e R5; `unidade_porcao` resolve
gramas+porcao; `calorias_por_100_gramas` x `quantidade_gramas` da R3; os 4
digitos de `codigo_semantico` espelham `calorias_referencia` (R7).

## 6. O QUE EU PRECISO QUE VOCE ME DEVOLVA (os parametros)

6.1. P-A: o modelo de entidades acima VALIDADO/AJUSTADO (nomes canonicos,
     colunas que faltam ou sobram, tipos). Esse vira a migration numerada.
6.2. P-B: a tabela `unidade_porcao` preenchida (colher de sopa = X g, fatia,
     concha, unidade, etc.) — base nutricional confiavel.
6.3. P-C: o conteudo dos `bloco_refeicao` + `bloco_refeicao_item` PRE-PREENCHIDO
     reaproveitando os 48 seeds reais: para cada alimento daqueles cardapios,
     o nome, gramas, porcao (valor + unidade) e calorias. Comece pelos 4 tipos
     atuais; deixe claro o padrao para novos tipos (ex dieta da selva).
6.4. P-D: a formula do GERADOR — como distribuir a faixa calorica alvo pelas
     refeicoes (percentuais) e como escalar `quantidade_gramas`/`fator_escala`
     dos itens para fechar o alvo.
6.5. P-E: os parametros de ENTRADA do gerador (proponho: tipo_dieta,
     faixa_calorica_alvo, numero_refeicoes, sexo?, variacao). Confirme/ajuste.
6.6. P-F: decisao sobre R7 — confirmar o esquema "4 digitos do codigo_semantico
     = calorias", definir se reflete caloria de REFERENCIA (bloco) ou ESCALADA
     (plano), e padronizar o formato (ex: 0350 = 350 kcal; teto 9999).

Formato de entrega ideal: tabelas (CSV ou markdown) que eu consiga transformar
direto em UPSERT idempotente. Lembre: DDL e esqueleto, UPSERT e sangue — me
mande o SANGUE (o conteudo), eu monto o esqueleto e injeto.

## 7. REGRAS DE FERRO (o seu output deve respeitar)

7.1. Nomes semanticos COMPLETOS, nunca abreviar (`quantidade_gramas`, nunca `qtd_g`).
7.2. Campo de perfil de usuario e sempre `perfil`, nunca `role`.
7.3. Schema SO ADITIVO: nao mexer na tabela `dietas` legada (48 linhas) — as
     novas tabelas convivem; migracao do conteudo e UPSERT, nao DROP.
7.4. Migration numerada via psql com IF NOT EXISTS. `db push` PROIBIDO (P008).
7.5. Tudo PT-BR, zero emoji, JetBrains Mono, 0px radius na UI.
7.6. Dieta entra no MESMO rio do motor: extensao ADITIVA dos enums
     `regras_motor.segmento`, `sugestoes_clinicas.tipo`,
     `itens_terapeuticos.categoria` += dieta. Reusa fila MANDRIL e mensageria.

## 8. DIVISAO DE TRABALHO

8.1. Dr. Claude: devolve P-A a P-F (modelo validado + conteudo nutricional +
     decisao do codigo de caloria).
8.2. Dr. Replit: compoe migration numerada + tabelas + gerador parametrico +
     UPSERT do conteudo. Mede o resultado com count real.
8.3. Dr. Code: constroi a UI editavel — CRUD de tipo_dieta, bloco_refeicao,
     bloco_refeicao_item, alimento, unidade_porcao; tela MANDRIL de validacao
     de sugestao de dieta com preview do cardapio escalado.

## 9. CRITERIO DE ACEITE (anti-fantasia — so e REAL quando)

9.1. Da pra criar "dieta da selva" inteira pela UI, sem deploy.
9.2. Editar `quantidade_gramas` ou a `unidade_porcao` de um item recalcula as
     calorias na hora (e o codigo semantico reflete a caloria — R7).
9.3. Gerar 1 plano (tipo + faixa + num refeicoes) materializa um cardapio com
     porcoes escaladas que batem a faixa calorica alvo, conferido pelo CEO.

---

Fim do brief v2. Quando voce devolver P-A a P-F, eu abro a onda de
implementacao (DDL + UPSERT + gerador) numa coisa so, nunca DDL sozinho.
