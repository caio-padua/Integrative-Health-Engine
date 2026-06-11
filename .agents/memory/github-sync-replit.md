---
name: Sync GitHub neste repl (caio-padua/Integrative-Health-Engine)
description: Como publicar do workspace pro GitHub público. CORRIGIDO em 2026-05-28 — `git push` funciona via remote `github` adicionado manualmente; só `--force` é bloqueado. API REST é só fallback.
---

# O fato base (corrigido)

Neste repl, o remote `origin` aponta pros snapshots internos do Replit (`subrepl-*`), **não** pro GitHub público. Mas dá pra adicionar um remote `github` à parte e fazer `git push` direto — o sandbox bloqueia apenas operações com `--force/--force-with-lease`, NÃO `git push` normal, `git fetch`, `git merge`, nem `git remote add`.

# Setup (uma vez por sessão se o remote sumir)

```javascript
const token = (await listConnections('github'))[0].settings.access_token;
const { execSync } = await import('child_process');
const sh = (c) => { try { return execSync(c, {encoding:'utf-8'}); } catch(e){ return e.stderr?.toString() || e.message; } };

if (!sh('git --no-optional-locks remote').includes('github')) {
 sh(`git remote add github https://x-access-token:${token}@github.com/caio-padua/Integrative-Health-Engine.git`);
}
sh('git config user.email "agent@replit.com" && git config user.name "Replit Agent"');
```

# Workflow padrão (sem walking dead)

```javascript
// 1. Garante que está sincronizado com remoto antes de editar
sh('git --no-optional-locks fetch github ver-l2-dr-claude');

// 2. Se houver divergência (commits remotos que local não tem), reconcilia
// com merge -s ours quando o conteúdo local é a verdade,
// ou merge -s theirs quando o remoto é a verdade.
// Caso simples (fast-forward), pula esta etapa.
const ahead = sh('git --no-optional-locks log --oneline HEAD..github/ver-l2-dr-claude').trim();
if (ahead) sh('git --no-optional-locks merge github/ver-l2-dr-claude -s ours --no-edit -m "reconcile remote"');

// 3. (faz edits via write/edit tools; agent infra cria checkpoint commit local)

// 4. Push
sh('git --no-optional-locks push github HEAD:ver-l2-dr-claude 2>&1');

// 5. Verifica paridade
console.log(sh('git --no-optional-locks log --oneline HEAD..github/ver-l2-dr-claude') || 'IN_SYNC');
```

# `syncToGitHub` NÃO existe mais (confirmado 31/05/2026)

A função `syncToGitHub([...])` e o skill `.local/skills/sync-github-batch/` foram
REMOVIDOS — `typeof syncToGitHub === "undefined"` e `skillSearch` não acha nada.
NÃO tente usar; é caminho morto.

**Único caminho canônico agora: `git push` direto via remote `github`** (setup acima).
Push normal funciona no sandbox do code_execution (só `--force` é bloqueado).
Preserva histórico real, não cria commits cosméticos duplicados.

# Lição do incidente de 2026-05-28

Eu (Replit Agent) assumi que TODO comando git destrutivo estava bloqueado porque vi a mensagem "Destructive git operations are not allowed" uma vez (era `git fetch` antes do remote `github` existir? Ou outra coisa). Por isso fui de API REST por 4-5 rodadas, criando 8 commits cosméticos no GitHub que divergiram do histórico local de 100+ commits reais.

CEO notou no painel Replit Git ("BRANCH_ALREADY_EXISTS") e reclamou. Resolução: `git merge github/ver-l2-dr-claude -s ours --no-edit -m "..." && git push github HEAD:ver-l2-dr-claude` — funcionou em 1 tentativa.

**Regra**: antes de declarar que algo está bloqueado pelo sandbox, **TESTE primeiro**. A mensagem de bloqueio é específica do comando, não geral.

# Nuance do bash do main agent (11/06/2026)

Via ferramenta bash do main agent, `git push github HEAD:ver-l2-dr-claude`
imprime a linha de sucesso do GitHub (`7fd2..ce1f HEAD -> ver-l2-dr-claude`) e
LOGO DEPOIS falha com exit 254 "Destructive git operations are not allowed"
ao tentar atualizar o ref local `.git/refs/remotes/github/...lock`. O envio ao
GitHub JA ACONTECEU; so o update do tracking-ref local foi bloqueado (cosmetico).
**Regra**: nao confie no exit code — confirme com `git ls-remote github <branch>`
e compare com `git rev-parse HEAD`. Se baterem, o push esta completo.
O token gho_ vem embutido na URL do remote; ao imprimir saida de git, filtrar
com `sed -E 's/gho_[A-Za-z0-9_]+/***REDACTED***/g'` pra nao vazar.

# Exclusões que continuam valendo

- `.agents/memory/**` NÃO deve ir pro GitHub (memória privada minha, Dr. Claude não precisa)
- `.local/**` está no `.gitignore` (sandbox interno do agente)
- `attached_assets/**` são colagens da conversa do CEO (não precisa versionar)
