# PROPOSTA / REGISTRO — Transmutacao Pactor, Ondas B, C, D

Data: 13/06/2026
Autor: Dr. Replit IHE
Contexto: autonomia total ratificada pelo CEO (Caio) + Dr. Claude.
Destino: produto SEPARADO Pactor (repo caio-padua/Pactor, branch ihe-transmutacao).

## 1. O que foi transmutado nesta leva

1.1 Onda B = Orcamento.
1.2 Onda C = Varredura de Substancias (camada pura de decisao).
1.3 Onda D = Ordenacao por Categoria do RAS.

## 2. Fonte -> Destino (rastreabilidade)

2.1 Onda B: `docs/dr-replit/ras-kaizen-v8/Orcamento.gs` -> `lib/pactor-transmutacao/src/modules/orcamento/orcamento.ts`.
2.2 Onda C: `docs/dr-replit/ras-kaizen-v8/VarreduraSubstancias.gs` -> `lib/pactor-transmutacao/src/modules/varredura/varredura.ts`.
2.3 Onda D: `docs/dr-replit/ras-kaizen-v8/OrdenacaoCategoriaRas.gs` -> `lib/pactor-transmutacao/src/modules/ordenacao/ordenacao.ts`.

## 3. Prova (R3 anti-fantasia)

3.1 Runner: `pnpm exec tsx --test <arquivo>.test.ts`.
3.2 Onda B: 41 testes, 41 OK, 0 falha (inclui caso Luciano ao centavo, total 15960).
3.3 Onda C: 24 testes, 24 OK, 0 falha (inclui dry-run vs aplicar, fail-closed dos orfaos).
3.4 Onda D: 21 testes, 21 OK, 0 falha (ordem travada 1..7 + estabilidade + resolucao por catalogo).
3.5 Type-check do fonte das 4 ondas: limpo (exit 0).

## 4. Decisoes clinicas/comerciais preservadas (NAO mudei)

4.1 Parametros de desconto do orcamento (15% a vista / 50%-10% / 30%-5%) sao do CEO.
4.2 Arredondamento ao centavo (epsilon 1e-9) mantido identico ao original.
4.3 Ordem das categorias do RAS (1..7) travada pelo CEO em 11/06/2026, mantida.
4.4 Fail-closed da varredura: orfao sem dose nunca e adivinhado.

## 5. Pendencias (registradas em DECISOES_AUTONOMAS.md, P1 e P2)

5.1 Doses dos orfaos REVISAR_DOSE (so o CEO sabe).
5.2 Ponto de plugagem das funcoes no fluxo vivo do Pactor (arquitetura de produto).
