# BRIEF — PROTOCOLO ALIMENTAR PARAMETRICO E EDITAVEL

> De: Dr. Replit (programador senior)
> Para: Dr. Claude (orquestrador)
> Data: 11/06/2026
> Audiencia: LLMs de engenharia. NAO escrito para o CEO ler.
> Contrato: anti-ectoplasma. Estado real ancorado em `SELECT count(*)` do banco
>   vivo (11/06/2026). O que e proposta esta marcado PROPOSTO.
> Objetivo deste documento: o CEO Caio elevou os requisitos da ferramenta de
>   dieta. Eu (Dr. Replit) preciso que voce (Dr. Claude) me devolva os
>   PARAMETROS (modelo de dados validado + conteudo nutricional pre-preenchido)
>   para eu compor a migration e o gerador, e o Dr. Code construir a UI editavel.

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
     semanticos) e `seq`, `codigo_semantico`.
2.3. O que NAO existe hoje: peso em gramas, peso em porcao (1 colher de sopa
     etc.), calorias por item, e qualquer atomicidade — a opcao e uma string,
     nao um conjunto de campos editaveis.

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
       gramas_equivalente. E o que permite exibir "1 colher de sopa" e ao
       mesmo tempo calcular caloria por grama.

5.4. `bloco_refeicao` — o bloco editavel (R4).
     - id, tipo_dieta_id, periodo_refeicao (ex CAFE DA MANHA), nome_bloco,
       faixa_calorica_referencia, arquivado_em.

5.5. `bloco_refeicao_item` — a LINHA atomica (R1, R2, R3).
     - id, bloco_refeicao_id, alimento_id,
       quantidade_gramas, quantidade_porcao_valor, unidade_porcao_id,
       calorias_calculadas (derivado), ordem. Cada coluna editavel sozinha.

5.6. `dieta_plano` — o plano gerado para um paciente.
     - id, sugestao_id (elo com o motor), paciente_id, tipo_dieta_id,
       faixa_calorica_alvo, numero_refeicoes, origem, versao_schema,
       arquivado_em.

5.7. `dieta_plano_refeicao` — o cardapio materializado e escalado.
     - id, dieta_plano_id, periodo_refeicao, bloco_refeicao_id,
       fator_escala (para bater a faixa calorica alvo).

OBS: este modelo entrega R1-R6 de uma vez. Editar `bloco_refeicao_item` e
edicao campo-a-campo; criar `tipo_dieta` pela UI e R5; `unidade_porcao` resolve
gramas+porcao; `calorias_por_100_gramas` x `quantidade_gramas` da R3.

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

Formato de entrega ideal: tabelas (CSV ou markdown) que eu consiga transformar
direto em UPSERT idempotente. Lembre: DDL e esqueleto, UPSERT e sangue — me
mande o SANGUE (o conteudo), eu monto o esqueleto e injeto.

## 7. REGRAS DE FERRO (o seu output deve respeitar)

7.1. Nomes semanticos COMPLETOS, nunca abreviar (`quantidade_gramas`, nunca `qtd_g`).
7.2. Campo de perfil de usuario e sempre `perfil`, nunca `role` (nao se aplica
     aqui, mas vale como lembrete de padrao).
7.3. Schema SO ADITIVO: nao mexer na tabela `dietas` legada (48 linhas) — as
     novas tabelas convivem; migracao do conteudo e UPSERT, nao DROP.
7.4. Migration numerada via psql com IF NOT EXISTS. `db push` PROIBIDO (P008).
7.5. Tudo PT-BR, zero emoji, JetBrains Mono, 0px radius na UI.
7.6. Dieta entra no MESMO rio do motor: extensao ADITIVA dos enums
     `regras_motor.segmento`, `sugestoes_clinicas.tipo`,
     `itens_terapeuticos.categoria` += dieta. Reusa fila MANDRIL e mensageria.

## 8. DIVISAO DE TRABALHO

8.1. Dr. Claude: devolve P-A a P-E (modelo validado + conteudo nutricional).
8.2. Dr. Replit: compoe migration numerada + tabelas + gerador parametrico +
     UPSERT do conteudo. Mede o resultado com count real.
8.3. Dr. Code: constroi a UI editavel — CRUD de tipo_dieta, bloco_refeicao,
     bloco_refeicao_item, alimento, unidade_porcao; tela MANDRIL de validacao
     de sugestao de dieta com preview do cardapio escalado.

## 9. CRITERIO DE ACEITE (anti-fantasia — so e REAL quando)

9.1. Da pra criar "dieta da selva" inteira pela UI, sem deploy.
9.2. Editar `quantidade_gramas` ou a `unidade_porcao` de um item recalcula as
     calorias na hora.
9.3. Gerar 1 plano (tipo + faixa + num refeicoes) materializa um cardapio com
     porcoes escaladas que batem a faixa calorica alvo, conferido pelo CEO.

---

Fim do brief. Quando voce devolver P-A a P-E, eu abro a onda de implementacao
(DDL + UPSERT + gerador) numa coisa so, nunca DDL sozinho.
