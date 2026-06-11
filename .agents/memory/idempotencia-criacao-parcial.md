---
name: Idempotencia com criacao parcial
description: Token de idempotencia nunca pode marcar "completo" quando so parte das operacoes externas teve sucesso.
---

Quando um motor cria N recursos externos (eventos de calendario, chamadas de API)
e grava um token/hash de idempotencia pra nao repetir, o token so pode ser marcado
COMPLETO quando `criados === total`. Se faltar (ex.: sem slot livre), grave um
status PARCIAL e NAO trate a linha como "inalterada" na proxima rodada — senao as
operacoes que faltaram nunca sao tentadas de novo.

**Why:** No motor de agenda RAS KAIZEN v8 (Apps Script), gravar o hash mesmo apos
criacao parcial fazia o paciente parecer "ja lancado/inalterado", travando o retry
das sessoes que ficaram sem horario. Achado pela review architect (veredito FAIL).

**How to apply:** Use uma coluna/campo de status separado (COMPLETO|PARCIAL). Skip
de idempotencia so vale pra COMPLETO; PARCIAL sempre reprocessa (apaga os parciais
via IDs gravados e recria tudo). Cubra com teste o caso "operacao sem recurso -> -1".
