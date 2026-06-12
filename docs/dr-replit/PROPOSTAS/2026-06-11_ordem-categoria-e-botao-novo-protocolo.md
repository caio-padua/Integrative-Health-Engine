# Proposta — Ordem por categoria + Botao "Novo Protocolo" (RAS KAIZEN v8)

> Data: 11/06/2026
> Autor: Dr. Replit
> Sistema: Apps Script PARALELO (conta clinica.padua.agenda), NAO o PAWARDS nativo.
> Status: AGUARDANDO escolha do Caio (A/B/C) antes de codar (anti-ectoplasma).

## Contexto tecnico

1. O catalogo `CATALOGO_SUBSTANCIAS` (Code.gs) ja tem o campo **categoria** na
   3a posicao: `[nome, dosagem, categoria, via, ...]`.
2. Categorias hoje no catalogo: ANTIOXIDANTE, POLIFENOL, VITAMINA, COMPLEXO VIT.,
   HORMONIO, ESTEROIDE, PEPTIDEO, MINERAL, AMINOACIDO, COENZIMA, METILACAO,
   QUELANTE, FITOTERAPICO, FOSFOLIPIDEO, OXIDATIVO, SILICIO ORG.
3. O COCKPIT monta o protocolo lendo o dropdown da aba **CADASTRO SUBSTANCIAS**
   (coluna A), que e populada a partir do catalogo.
4. A **TABELA GERAL** guarda cada substancia como um **bloco de 6 colunas**
   (com SIM/datas por paciente). `lerPaciente_` varre esses blocos de 6.
5. As colunas de controle da agenda (AGENDA HASH/EVENTOS/LANCADO/STATUS) ficam
   appendadas no FIM da TABELA GERAL.

## Risco

- Reordenar fisicamente as colunas da TABELA GERAL mexe em **dado real de
  paciente** e nos blocos de 6 que o `lerPaciente_` depende. Exige backup e
  cuidado. Mexer no dropdown do cockpit / catalogo NAO tem risco.

## DECISAO 1 — Onde aplicar a ordem por categoria

- **A (recomendada):** Ordenar so o **cadastro/menu de substancias** (dropdown do
  cockpit, via aba CADASTRO SUBSTANCIAS). As funcionarias veem as substancias
  agrupadas por categoria na hora de montar o protocolo. ZERO risco ao dado.
- **B:** Reordenar de fato as **colunas da TABELA GERAL** por categoria. Faco
  backup da aba antes. Mexe no dado real (mais arriscado).
- **C:** As duas (A agora + B depois, com backup e validacao).

## DECISAO 2 — O que o botao "Novo Protocolo" zera

- **A (recomendada):** Limpa so o **formulario do COCKPIT** (paciente, data,
  linhas de substancia) pra comecar outro protocolo. NAO apaga nada da TABELA
  GERAL nem o cadastro do paciente.
- **B:** Apaga os dados de **um paciente especifico** na TABELA GERAL (destrutivo,
  pede confirmacao dupla).
- **C:** Zera a planilha inteira (muito perigoso, nao recomendado).

## Ordem de categorias proposta (default, confirmavel)

> Baseada na sequencia que o Caio travou; esteroide encostado no hormonio.

1. ANTIOXIDANTE (+ POLIFENOL agrupado junto — e antioxidante)
2. VITAMINA (+ COMPLEXO VIT.)
3. HORMONIO
4. ESTEROIDE
5. PEPTIDEO
6. MINERAL
7. NUTRACEUTICO / demais (AMINOACIDO, COENZIMA, METILACAO, QUELANTE,
   FITOTERAPICO, FOSFOLIPIDEO, OXIDATIVO, SILICIO ORG.)

> Observacao: o Caio deu duas sequencias levemente diferentes (peptideo 4o x
> esteroide logo apos hormonio). O default acima resolve o conflito colocando
> esteroide em 4o (encostado no hormonio) e peptideo em 5o. Confirmar/ajustar.
