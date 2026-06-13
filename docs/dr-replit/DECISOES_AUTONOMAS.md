# DECISOES AUTONOMAS — Transmutacao RAS KAIZEN v8 -> Pactor

Registro append-only (anti-ectoplasma). Formato: numero | o que decidi | por que.
Autonomia total ratificada pelo CEO (2 cartas, 12/06/2026).

1 | Runner de teste = `tsx --test` (node:test nativo), nunca Vitest | E o padrao real do repositorio IHE; o app Pactor nao tinha runner. Roda em segundos, zero dependencia extra.

2 | Estrutura = `lib/pactor-transmutacao/src/modules/<dominio>/<dominio>.ts` + `.test.ts` co-localizado | Um modulo por dominio, teste ao lado do fonte, facil de transplantar pasta a pasta pro Pactor.

3 | Nomes de funcao perdem o sufixo `_` do Apps Script e viram `export` em camelCase semantico | No Apps Script `_` era a convencao de "privado de arquivo"; em TS modulo o controle e o `export`. Nomes completos, sem abreviar (regra do CEO).

4 | Zero comentario inline; so um cabecalho curto de proveniencia por arquivo | Regra no-comments do ambiente; o cabecalho de proveniencia (qual .gs originou) e auditoria legitima (R7).

5 | Ordem das ondas = A Padronizacao, B Orcamento, C Varredura, D Ordenacao | Escolhi os 4 modulos que sao LOGICA PURA com contrato de teste de referencia (test_*.mjs / testes no proprio .gs). Garante onda verde real, sem fantasia (R3).

6 | Protocolos / Pacientes / Enfermagem-completo NAO viraram ondas de logica pura | Esses .gs sao majoritariamente GLUE de Sheet/UI/Drive/Calendar; transmutar como "logica pura" seria fino e fantasioso. Pertencem a camada de APP do Pactor (Instrucao 03), nao a esta transmutacao de nucleo.

7 | Onda C (Varredura) transmuta SO a camada pura de decisao | O `VarreduraSubstancias.gs` original era impuro (lia/escrevia Sheet). Separei: a decisao (diff BEFORE->AFTER + lista de write-backs) e pura e testavel; a I/O real (ler/gravar planilha ou banco) fica pra camada de app.

8 | Onda C reusa o motor da Onda A (import de `padronizacao.ts`); Onda D reusa `removerAcentos` | Evita duplicar logica (drift zero). O catalogo, que no Apps Script era global `CATALOGO_SUBSTANCIAS`, entra por parametro — no Pactor vem do banco.

9 | `arredondar2` mantem o epsilon `1e-9` do original | Preserva o resultado ao centavo da planilha real do CEO (caso Luciano, total 15960). Mudar isso mudaria numero — proibido.

10 | Transplante pro Pactor via clone temporario + branch `ihe-transmutacao` | E a unica forma de levar os arquivos pro repo separado caio-padua/Pactor sem misturar a arvore do IHE. Aditivo, isolado, nao toca o build existente do Pactor.

## PENDENCIAS DE DECISAO DO CEO (clinicas/comerciais — eu NAO decido)

P1 | Orfaos REVISAR_DOSE (ex.: "Testosterona bioidentica", "Tirzepatida" sem mg) | So o CEO sabe a dose; o motor mantem fail-closed (nao adivinha). Precisa o CEO preencher o APELIDOS/dose.

P2 | Hook das funcoes no fluxo vivo do Pactor (onde plugar orcamento/varredura/ordenacao na UI/banco) | E decisao de arquitetura de produto do CEO + Dr. Claude; a logica pura ja esta pronta e testada pra ser plugada.
