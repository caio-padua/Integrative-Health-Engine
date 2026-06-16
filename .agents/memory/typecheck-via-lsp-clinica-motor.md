---
name: Typecheck via LSP no clinica-motor
description: Como validar tipos/compilacao no artifact clinica-motor quando o tsc do projeto inteiro estoura o timeout do sandbox.
---

# Verificar tipos no clinica-motor sem rodar tsc inteiro

O `tsc`/typecheck do artifact `clinica-motor` e grande e leva muito mais que
os 120s maximos do bash tool. Rodar destacado (setsid/nohup/disown) NAO ajuda:
o sandbox mata o processo quando o comando de foreground retorna (log fica com
0 bytes, sem flag de done).

**Caminho rapido e confiavel para validar uma edicao de arquivo:**
1. `getLatestLspDiagnostics({ filePath })` via code_execution — o tsserver (LSP)
   ja esta carregado com o projeto, entao retorna erros de tipo do arquivo em
   segundos. Zero diagnostics = tipos OK.
2. Confirmar que o Vite HMR recompilou o arquivo SEM erro no console (prova que
   sintaxe + imports estao validos; esbuild transform passou).
3. Opcional: `restart_workflow` do web e checar logs sem error.

**Why:** o typecheck completo nao cabe no orcamento de tempo do sandbox e
processos destacados sao mortos; LSP + HMR cobrem tipo, sintaxe e import sem
esse custo.
**How to apply:** sempre que editar arquivos do clinica-motor e quiser validar
sem esperar o tsc inteiro travar.
