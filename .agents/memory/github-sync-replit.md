---
name: Sync GitHub a partir deste repl
description: Como gravar arquivos nos repos GitHub do Caio a partir do repl IHE (topologia de branches, repl-GitHub desync, repos publicos vs privados).
---

# Sync GitHub a partir deste repl

Para operacoes pela integracao, seguir a skill atual e usar `proxyFetch`,
sem extrair credenciais da conexao. A Contents API serve para arquivos individuais,
mas NAO sincroniza o historico Git local. Para sincronizacao solicitada pelo usuario,
usar o fluxo Git autorizado, preservando ambos os historicos e sem envio forcado.

**Why:** a integracao GitHub App pode responder com permissao de escrita enquanto
o remoto Git rejeita a credencial embutida; sao caminhos de autenticacao distintos.
Um segredo alternativo tambem pode estar invalido. Sucesso na integracao nao prova
que `git push` funciona.

**How to apply:** conferir envio real e ancestralidade; diante de autenticacao
rejeitada, usar o fluxo de reconexao documentado. Nao contornar a falha com commits
avulsos pela Contents API, pois isso pode criar mais divergencia.

**Why:** a configuracao de remotos muda entre sessoes e pode conter credenciais
embutidas; nao imprimir `git remote -v`. Existencia de checkpoint local nao
comprova sincronizacao com GitHub.

**How to apply ao reparar sincronizacao:** guardar alteracoes locais antes de
cancelar um rebase e verificar novamente o estado depois. Foi observado um novo
rebase apos um cancelamento bem-sucedido; nao declarar reparo permanente com base
somente no retorno do comando, nem usar envio forcado para contornar recorrencia.

**How to apply:**
- Repos do Caio (todos owner caio-padua): `Integrative-Health-Engine` (IHE, PUBLICO),
  `GENESIS_DE_SKILLS` (PRIVADO), `Protocolo-Manager` (Manager, PUBLICO), `Pactor`,
  `PARAUTTO`, `padcom-saas`.
- **IHE branch topology:** default branch no GitHub = `replit-agent`, mas o conteudo
  vivo/atual (docs/, central doc, docs/dr-claude) so existe no branch de trabalho
  **`ver-l2-dr-claude`** (e o branch onde o repl opera). `main` esta quase vazio
  (404 ate em docs/dr-claude). Para dar raw URL ao Dr. Claude, usar `ver-l2-dr-claude`.
- **repl HEAD pode DESINCRONIZAR do GitHub:** ja vi local HEAD != GitHub HEAD do mesmo
  branch `ver-l2-dr-claude`. Nao confiar que o checkpoint do repl espelha o GitHub na
  hora. Para garantir conteudo no GitHub AGORA, gravar pela Contents API. Se tambem
  precisar do arquivo no repl local, gravar nos DOIS lugares com conteudo IDENTICO
  (merge limpo mesmo com historico divergente).
- **Raw URL so funciona sem token em repo PUBLICO.** `raw.githubusercontent.com/...`
  do GENESIS (privado) da 404; do IHE e Manager (publicos) abre 200. Logo o endereco
  oficial pro Dr. Claude (que le por raw) deve apontar pro IHE publico, nao pro Genesis.
- **So `.local/` esta no `.gitignore`** (verificado 18/06/2026 via `git check-ignore`).
  `.agents/**` NAO esta ignorado e E RASTREADO pelo git (`git ls-files` lista a skill);
  logo a skill `.agents/skills/penumbra-design-system/` VAI pro GitHub e pode ser clonada
  por outro agente (ex.: Paxter) sem precisar espelhar em `docs/`. (Corrige a nota antiga
  errada de que `.agents/**` nao subia.)

- 15/07/2026: listConnections("github") pode voltar VAZIO transitoriamente mesmo tendo funcionado minutos antes na MESMA sessao (queda temporaria do binding do conector). Nao e erro de codigo: aguardar/retentar mais tarde; nao existe GITHUB_TOKEN de ambiente como fallback neste repl.
