---
name: Atalho de login de teste (dev-only)
description: Como gatear com segurança um login sem credenciais "só pra testar" no IHE/Pawards.
---

# Atalho de login de teste sem credenciais

CEO às vezes pede "entrar sem email e sem nada apenas para testar" antes de
montar o login real. Implementação segura usada no Pawards:

- Rota `POST /usuarios/dev-login` que emite um JWT **real** reusando o fluxo do
  login normal (`novoJti` + `registrarSessao` + `signJwt`), pra que escopo,
  tenant, kill-switch (`tokens_invalidos_apos`) e auditoria continuem valendo.
- Path entra no `PUBLIC_EXACT` do `requireAuth` (senão o próprio requireAuth
  barra antes da rota rodar).
- Frontend: `loginDev()` no AuthContext + botão **gated por
  `import.meta.env.DEV`** (Vite faz dead-code elimination no build de produção,
  o botão some).

**Regra de ferro — gate do backend deve ser FAIL-CLOSED:**

- NÃO confiar só em `NODE_ENV === "production"` (frágil: deploy pode subir com
  NODE_ENV vazio/errado → rota fica aberta = account takeover por ID).
- Bloquear quando `process.env.REPLIT_DEPLOYMENT` existe (a plataforma Replit
  SEMPRE seta isso em qualquer deploy) **OU** `NODE_ENV === "production"`.
  No workspace de dev nenhum dos dois existe → liberado automaticamente, zero
  fricção pro CEO.
- NÃO aceitar `usuarioId` do body (seria IDOR: impersonar qualquer conta por
  ID). Fixar no usuário de teste (id 1 = CEO, escopo global).

**Why:** code review (architect) 16/06/2026 reprovou a v1 (só NODE_ENV +
usuarioId do body) como "fail-open + impersonação não autenticada". A v2 com
REPLIT_DEPLOYMENT + id fixo fecha os dois furos sem pedir env var manual.

**How to apply:** sempre que for criar qualquer back-door/atalho dev-only,
gatear por REPLIT_DEPLOYMENT (não só NODE_ENV) e nunca aceitar o alvo (id/conta)
do request.
