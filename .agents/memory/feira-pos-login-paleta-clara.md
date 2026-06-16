---
name: Feira pós-login = paleta clara chumbada
description: Por que telas pós-login parecem "embaralhadas/feira" no Pawards e como corrigir sem quebrar o tema.
---

# A "feira" pós-login não é bug do tema global

**Fato verificado (16/06/2026):** os tokens de cor globais (`index.css`,
`:root, .dark`) já são ESCUROS e consistentes — `--background` navy profundo,
`--card` navy escuro. Não existe versão clara dos tokens. Provado pela vitrine
pública `/identidade-visual` (renderiza sem login: fundo navy, cartões escuros,
dourado+ciano harmônicos).

**Causa real da "feira":** ~24 telas têm cor CLARA chumbada na mão —
`bg-white` + a paleta "papel" (`--pw-petroleo` = #1F4E5F teal ESCURO,
`--pw-tinta`, classe `pw-card`, `pw-titulo-manifesto` cujo `color` é petroleo).
Cartão branco e título teal-escuro renderizados DENTRO da casca escura
`LayoutPawards` (PENUMBRA navy) = cartão branco no navy + título invisível.

**Como corrigir (regra):** trocar as classes claras chumbadas por tokens
escuros PENUMBRA POR TELA (ex.: `bg-[#0f1e36]` painel, texto `#e6eaf2`,
mute `#94a3b8`, acento `#00d4ff`/`#facc15`, borda `#1a2d4f`).
**Why:** a paleta clara "papel"/`pw-*` é proposital para impressão/FOLHA A4
(print-relatorio.css) — NÃO dá pra flipar o token global pra escuro senão
quebra o modo impressão. O conserto é per-tela, não no token.
**How to apply:** `rg -l "bg-white"` e `rg -l "pw-petroleo|pw-tinta|pw-card"`
em `src/pages` lista os alvos; o dashboard pós-login já foi convertido
(StatCard + título). Faltam as demais.

**Verificação visual:** páginas autenticadas voltam null/branco sem login
(o screenshot tool carrega sessão limpa) — use `/identidade-visual` ou outra
rota pública pra ver tema; o resto exige login real do CEO ou extração
pro mockup-sandbox.
