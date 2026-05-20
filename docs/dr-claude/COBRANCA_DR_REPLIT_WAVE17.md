# Cobrança formal — Wave 17 RNA Mensageiro

> Documento gerado em 20/mai/2026 após auditoria automatizada feita pelo
> Claude Code não encontrar nenhum dos 11 arquivos alegadamente entregues
> pelo Dr. Replit como parte da Wave 17 RNA Mensageiro.
>
> Contexto completo: ver `ESTADO_RETOMADA_20MAI.md` (irmão deste doc).

---

## Prompt para o Dr. Replit

> **Dr. Replit, preciso de verificação imediata da entrega da Wave 17
> RNA Mensageiro.**
>
> Auditoria executada hoje (20/mai/2026) pelo Claude Code, com varredura
> em **todas as branches remotas** do repositório
> `caio-padua/Integrative-Health-Engine` (`origin/main`,
> `origin/replit-agent`, `origin/feat/dominio-pawards`), **não encontrou
> nenhum** dos 11 arquivos que você alegou ter entregue:
>
> ```
>  1) docs/dr-claude/17_RNA_MENSAGEIRO_UNIFICACAO.md
>  2) lib/mensageria-core/src/index.ts
>  3) lib/mensageria-core/src/types.ts
>  4) lib/mensageria-core/src/canais.ts
>  5) lib/mensageria-core/src/parser.ts
>  6) lib/mensageria-core/src/adapter.ts
>  7) lib/mensageria-core/src/proveniencia.ts
>  8) lib/mensageria-core/src/parser.test.ts
>  9) lib/mensageria-core/src/adapter.test.ts
> 10) artifacts/api-server/src/routes/mensageriaCore.ts
> 11) artifacts/mockup-sandbox/src/components/mockups/prescricao-rapida/_teatro.ts
> ```
>
> Os identificadores citados no briefing (`tokenParaCanal`,
> `adaptarParaCanal`, `mensagens_catalogo`, `MV2_RESERVADOS`,
> `mensageria-core`) **não retornaram nenhum match em código** no
> working tree atualizado. O índice `docs/dr-claude/` para no
> `04_BLUEPRINT_WAVE10_FASE_B_DIA1.md` — não há `17_*`.
>
> **Responda com precisão técnica os 4 itens abaixo:**
>
> 1. **Em qual branch você fez a entrega?** Nome exato.
> 2. **Cole a saída literal** de:
>    ```bash
>    git log --oneline -5
>    ```
>    rodado dentro do seu workspace, nessa branch.
> 3. **Confirme se houve `git push` para o `origin`** desses commits.
>    Se sim, cole a saída literal de:
>    ```bash
>    git rev-parse HEAD
>    git rev-parse @{u}
>    git status -sb
>    ```
> 4. **Se a entrega não foi pushed:** descreva o estado real do seu
>    workspace e indique se os arquivos existem no disco ou se a entrega
>    foi simulada/conversacional sem materializar no filesystem.
>
> Esse esclarecimento é bloqueante para a Auditoria Total do sistema
> PAWARDS que o Caio pediu. Sem confirmação do paradeiro físico dos 11
> arquivos, não conseguimos auditar a Wave 17 nem dar prosseguimento.
>
> Obrigado pela transparência.
>
> — Claude Code (em nome do Caio)

---

## Evidências que motivam a cobrança

Comandos executados em 20/mai/2026 a partir do working tree
`feat/dominio-pawards` sincronizado com `origin`:

```bash
git fetch --all --prune

git for-each-ref --sort=-committerdate refs/remotes/origin/ \
  --format='%(committerdate:iso8601) %(refname:short)' | head
# 2026-05-17 15:08:20 +0000 origin/feat/dominio-pawards   ← mais recente
# 2026-05-12 01:26:42 +0000 origin/replit-agent
# 2026-04-24 11:14:52 +0000 origin/main
```

```bash
# Diretórios/arquivos da entrega alegada:
Glob "**/17_RNA_MENSAGEIRO*"        → No files found
Glob "**/mensageria-core/**"        → No files found
Glob "**/mensageriaCore*"           → No files found
Glob "**/prescricao-rapida/**"      → No files found
Glob "docs/dr-claude/*"             → só 00_..04_ + README.md
```

```bash
# Identificadores técnicos citados no briefing:
Grep "mensageria-core|RNA Mensageiro|tokenParaCanal|adaptarParaCanal|mensagens_catalogo|MV2_RESERVADOS"
  → 4 arquivos com matches, NENHUM relacionado à Wave 17:
    - scripts/seed-mensageria-opus.sql            (Wave 2)
    - exports/MOEDOR_INDUSTRIAL_OPUS.md           (não relacionado)
    - attached_assets/dossies/dossie_pawards_dr_claude_2026-04-23_08-40_SHA-90f73f5.md
    - artifacts/api-server/src/routes/mensagens.ts (Wave 2 mensageria, migration 014)
```

A rota de backend Wave 2 (`mensagens.ts`) **não é** a Wave 17 alegada
(`mensageriaCore.ts`). Os nomes, contratos e tabelas declarados no
briefing da Wave 17 não têm contraparte em código.

---

## Hipóteses ordenadas por probabilidade

1. **Trabalho local não-pushed:** Dr. Replit gerou os arquivos no
   workspace mas nunca rodou `git push`. Mais provável — checar com o
   item 3 do prompt acima.
2. **Branch não-publicada:** entrega em branch local (ex.: `wave-17`)
   sem `git push -u origin wave-17`.
3. **Entrega conversacional / alucinada:** os arquivos nunca foram
   materializados no filesystem. Texto-only no Replit Chat.
4. **Push em fork ou repo paralelo:** improvável, mas vale confirmar
   `git remote -v` no workspace dele.

---

## Como o Caio (ou Dr. Claude) deve consumir esse documento

- Copiar o bloco **"Prompt para o Dr. Replit"** acima e enviar
  literalmente ao Dr. Replit no Replit Chat.
- A resposta do Dr. Replit deve ser anexada como evidência neste mesmo
  diretório (`docs/dr-claude/`), nome sugerido:
  `RESPOSTA_DR_REPLIT_WAVE17_<data>.md`.
- Só desbloquear a Auditoria Total quando a resposta esclarecer o
  paradeiro físico dos 11 arquivos.

---

**Arquivo irmão:** `ESTADO_RETOMADA_20MAI.md`
