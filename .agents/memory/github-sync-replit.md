---
name: Sync GitHub neste repl (caio-padua/Integrative-Health-Engine)
description: Como publicar mudanças do workspace local pro GitHub público do Caio. Resumo do diagnóstico que custou tempo descobrir, e a regra prática pra não cair de novo.
---

# O fato base

Neste repl, **`git push origin` do shell NÃO funciona** pra publicar no GitHub.

**Por quê:**

1. O remote `origin` aponta pros snapshots internos do Replit (URLs do tipo `subrepl-*git+ssh://git@ssh.kirk.replit.dev:/home/runner/workspace`), não pro `github.com/caio-padua/Integrative-Health-Engine`.
2. O sandbox do main agent **bloqueia** `git fetch`, `git push`, `git reset`, `git checkout`, `git rebase`, `git clean` — qualquer destrutivo. Mensagem: "Destructive git operations are not allowed in the main agent. Use the project_tasks skill to propose a new background Project Task".
3. Os commits que aparecem no painel "Git" do Replit são commits internos (checkpoints), independentes do que está no GitHub público.

# Como publicar (regra de ferro)

**Use SEMPRE `syncToGitHub([{path, msg}, ...])`** via `code_execution`. A função está documentada em `.local/skills/sync-github-batch/SKILL.md` e faz:

1. `GET /repos/:owner/:repo/contents/:path?ref=:branch` → pega o sha remoto se existir
2. Calcula git blob SHA local (`sha1("blob <size>\0<content>")`)
3. Se SHAs batem → `IN_SYNC`, nada a fazer
4. Senão → `PUT /contents` com `sha` do remoto (se update) ou sem `sha` (se create)

**Por quê batch e não arquivo a arquivo manualmente:** evita o "walking dead" que Caio teme (arquivo num lugar, commit em outro). O audit por git blob SHA garante paridade verificável.

# Gotchas

- **409 SHA stale**: se você fizer 2 syncs do mesmo arquivo na mesma sessão, o segundo pode falhar porque o cache local tem o sha antigo. Resolução: simplesmente repetir o sync — o segundo GET pega o sha novo.
- **`.agents/memory/**` e `.local/**`** NÃO devem ir pro GitHub. `.local` está no `.gitignore` do projeto; `.agents/memory` é minha memória privada — Dr. Claude não precisa ver e não deveria poder.
- **`attached_assets/**`** são imagens/textos colados pelo Caio na conversa. Não sincronizar pro GitHub.
- A pasta canônica pra Dr. Claude ler é **`docs/dr-claude/`**. Tudo que vai pra lá precisa ir pro GitHub via `syncToGitHub`.

# Quando essa regra deixa de valer

Quando o Caio configurar um remote `origin` real do GitHub no Replit (ou pedir explicitamente um Project Task em background pra fazer `git push`). Até lá, é `syncToGitHub` sempre.
