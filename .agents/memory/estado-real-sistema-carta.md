---
name: Carta de estado real do sistema + regra DDL-vs-UPSERT
description: Onde vive o retrato sincero do sistema para a equipe de IAs, a regra "esqueleto vs sangue" e a armadilha do pg_stat stale. Ler antes de afirmar o que o sistema "faz".
---

# Estado real do sistema (anti-ectoplasma)

A fonte sincera do que cada engrenagem REALMENTE faz vive em
`docs/dr-code/00_CARTA_ESTADO_REAL_DO_SISTEMA.md` (carta para Dr. Claude
orquestrador + Dr. Code pleno + Dr. Replit senior). Atualizar a cada onda.

## Regra: DDL aditivo = esqueleto, UPSERT idempotente = sangue
Uma feature so e REAL quando schema E dado rodaram. So `ALTER TABLE ADD COLUMN`
deixa a engrenagem LATENTE (gira no vazio).

**Why:** o CEO cobrou por que tantas conversas validadas viraram so coluna nova
(DDL "jogado contra o codigo") sem o SELECT/UPSERT que materializa o dado. Tres
causas reais: (1) Caminho B manda V13 ficar autoritativo ate martelo do CEO,
entao parei antes do UPSERT V4 de proposito; (2) trauma do P008 (db push
dropa pacientes) me fez tratar UPSERT seguro com medo de db push destrutivo;
(3) anti-ectoplasma sequenciou "materializar dado" como Sprint futuro que nunca
foi agendado.

**How to apply:** ao entregar onda, declarar SEMPRE "schema aplicado" E "dado
materializado (N linhas via count real)" — ou marcar LATENTE explicitamente.
UPSERT idempotente de catalogo/regra NAO precisa de martelo do CEO; so SWAP de
fonte-autoritativa (V13->V4) e DELETE precisam.

## Armadilha: pg_stat_user_tables.n_live_tup mente quando ANALYZE nao rodou
Mostrou 0 em tabelas com centenas de linhas (regras_motor, pacientes, etc.).
SEMPRE confirmar com `SELECT count(*)` exato antes de dizer "tabela vazia".
Quase relatei o sistema como morto estando vivo (motor: 37 regras, 16 sugestoes,
457 itens unificados, 5.411 pacientes em 04/06/2026).

## Cuidado ao descrever o sync de catalogo
O `sync-catalogo` do motor NAO e UPSERT: e rebuild transacional (delete+insert).
Nao chamar de UPSERT na doc; e nao afirmar a ORIGEM das linhas (rebuild vs seed)
sem provar — o architect reprovou a carta por esse exagero. Regra geral: so
afirmar causa/teste/transicao que voce viu no codigo; o resto e "NAO PROVADO".
