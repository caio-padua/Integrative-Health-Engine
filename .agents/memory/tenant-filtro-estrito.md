---
name: Filtro de tenant estrito em rotas clínicas
description: Quando usar resolverFiltroTenantEstrito vs resolverFiltroTenant para não vazar dados entre unidades (IDOR).
---

# Filtro de tenant: resolver normal vs estrito

Em `artifacts/api-server/src/lib/auth/filtroTenant.ts` existem dois resolvers de
unidade (tenant) para queries multiunidade:

- `resolverFiltroTenant` — para não-owner SEM `unidadeId` no JWT, cai em fallback
  por `?unidadeId=` da query string (backward-compat de usuário legado/consultor
  global sem unidade).
- `resolverFiltroTenantEstrito` — para não-owner SEM `unidadeId` no JWT, retorna
  `unidadeId=null` e NUNCA olha o query param; o chamador deve negar (fail-closed).

**Regra:** rotas que devolvem **dados clínicos/pessoais multiunidade**
(paciente, cascata, prontuário) devem usar o resolver **estrito** + tratar
`unidadeId===null` como negar (lista vazia ou 403). Usar o resolver normal nessas
rotas é um **IDOR**: um usuário não-owner legado passa `?unidadeId=<alvo>` e lê
dados de outra clínica.

**Why:** no painel ao vivo de cascata de governança, duas iterações de code review
pegaram exatamente esse vazamento — primeiro o "ver tudo" quando unidade era null,
depois o fallback por query param que ainda deixava escolher unidade alvo.

**How to apply:**
- Filtrar SEMPRE no SQL (`WHERE pacientes.unidade_id = unidadeId`), não em memória
  depois de ler tudo (reduz superfície e custo).
- platform_owner/admin continua podendo refinar/ver tudo via `?unidadeId`.
- Ao criar nova rota clínica sensível, prefira o resolver estrito por padrão.
