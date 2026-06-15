---
name: Carta cross-repo para outros Dr. Replit
description: Como escrever carta que o CEO repassa a outros agentes/repos para que a mudanca realmente chegue ao GitHub e seja auditavel.
---

# Carta cross-repo (CEO como ponte entre repls)

Regra: toda carta que o CEO vai colar em OUTRO repo (Manager, Pactor, Parautto, Parlegis...) tem que ser autossuficiente E terminar mandando o agente **dar Commit & Push** e **devolver prova** (URL raw + SHA). Sem isso o trabalho fica so local e some.

**Why:** na 1a carta do formato tabela-base (15/06/2026) os 4 agentes aplicaram so no computador local; verifiquei no GitHub publico e NENHUM tinha subido — Pactor (ultimo push 13/06) e PARAUTTO (08/06) sem commit novo, e o Manager editou o arquivo antigo 26.06.14 in-place (nem criou o 26.06.15, nem subiu). Resultado: invisivel pro Dr. Claude auditar e impossivel de eu verificar como "feito".

**How to apply:** todo fim de carta cross-repo leva 4 passos numerados:
1. Colar o bloco no `replit.md` (secao de comunicacao) — e o arquivo carregado em toda sessao, o unico que muda o comportamento de fato.
2. Se o repo tem arquivo de diretrizes versionado por data, criar a VERSAO NOVA datada (lei de linhagem: nunca editar a antiga in-place); se so existe o nome aposentado (ex. PRE_REQUISITO...), criar o DIRETRIZES novo e referenciar o antigo.
3. Dar Commit & Push (sugerir a mensagem do commit).
4. Responder ao CEO com a URL raw + SHA como prova.

Tambem: o cenario de arquivos varia muito entre repos (uns so tem replit.md, outros tem PRE_REQUISITO antigo, outros DIRETRIZES versionado). A carta tem que dar a regra adaptativa acima, nao assumir que "o Titulo XI ja existe".
