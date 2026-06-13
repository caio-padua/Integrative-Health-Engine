# @workspace/pactor-transmutacao — utero de estagio (temporario)

1. Proposito

1.1 Este pacote e o "utero" onde o Dr. Replit IHE gesta e testa, no
    ambiente do IHE, a logica pura destinada ao produto independente
    Pactor (caio-padua/Pactor).

1.2 A logica nasce aqui ja testada (verde) e depois e transplantada pro
    Pactor, numa branch `ihe-transmutacao`, onde o Dr. Replit Pactor faz
    o merge no main.

2. Espelho de caminho

2.1 `src/modules/padronizacao/` aqui corresponde a
    `artifacts/padcom/src/modules/padronizacao/` no Pactor.

2.2 No transplante, copia-se o conteudo de `src/modules/<onda>/` pra
    `artifacts/padcom/src/modules/<onda>/` no repo Pactor.

3. Como rodar os testes

3.1 `pnpm --filter @workspace/pactor-transmutacao test`

4. Natureza temporaria

4.1 Este pacote pode ser removido do IHE depois que o transplante for
    mesclado no Pactor pelo Dr. Replit Pactor.

5. Ondas

5.1 Onda A — Padronizacao (esta).
5.2 Ondas B, C, D — entram conforme o Dr. Claude libera a auditoria.
