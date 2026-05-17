# Wave 13 F2 — Tenant Isolation RBAC (2026-05-15)

## Status: FECHADO ✅

## Problema
Rotas clínicas aceitavam `?unidadeId=` diretamente do query param sem verificar
o JWT do usuário — um `tenant_user` da unidade 3 podia passar `?unidadeId=7`
e ler dados de outra clínica.

## Solução implementada

### Lib: `lib/auth/filtroTenant.ts`
Função pura `resolverFiltroTenant(req)` que enforça isolamento por perfil:

| perfilPlataforma    | unidadeId no JWT | Comportamento |
|---------------------|-----------------|---------------|
| `platform_owner`    | qualquer        | usa query param livremente (pode filtrar ou ver tudo) |
| `admin` (bypass)    | qualquer        | idem platform_owner |
| `tenant_admin`      | preenchido      | **força JWT**, ignora query |
| `tenant_user`       | preenchido      | **força JWT**, ignora query |
| `tenant_user`       | null            | usa query param (backward compat — consultores globais) |

Invariantes de segurança adicionais:
- query param `0` ou `NaN` → `null` (sem filtro, nunca acesso inválido)
- `isPlatformOwner: boolean` retornado para o caller discriminar

### Rotas protegidas (7 endpoints)
| Arquivo | Rota |
|---------|------|
| `pacientes.ts` | `GET /pacientes` |
| `filas.ts` | `GET /filas` |
| `usuarios.ts` | `GET /usuarios` |
| `followup.ts` | `GET /followup` |
| `financeiro.ts` | `GET /financeiro/pagamentos` |
| `acompanhamento.ts` | `GET /demandas` |
| `acompanhamento.ts` | `GET /demandas/resumo` |

### Migration 070
`ALTER TABLE usuarios ADD CONSTRAINT chk_tenant_admin_requer_unidade_id
CHECK (perfil_plataforma <> 'tenant_admin' OR unidade_id IS NOT NULL)`

Defesa em profundidade: mesmo que o middleware seja contornado via SQL direto,
um `tenant_admin` sem `unidade_id` nunca pode ser inserido/atualizado.

Aplicada em: 2026-05-15 (0 tenant_admin existentes — safe).

## Testes
`src/middlewares/filtroTenant.test.ts` — 9 casos cobrindo todos os perfis,
query param inválido (NaN/0), e backward compat de consultor global.

```
✔ resolverFiltroTenant · Wave 13 F2 — 9/9 pass (0ms falha)
```

## Backward compat
- `platform_owner` (Caio, unidade_id=1) — comportamento inalterado, vê tudo
- Consultores com `unidade_id=null` no JWT — continuam usando query param
- 150 `tenant_user` existentes (0 com unidade_id preenchido no JWT) — backward compat via null→query param

## Próximos passos sugeridos
- F3: populár `unidade_id` no JWT dos `tenant_user` ativos (já há ~150 registros)
- F4: aplicar `resolverFiltroTenant` nas rotas de escrita (POST/PUT/DELETE pacientes, etc.)
- F5: `dashboard.ts` e `comercial.ts` (leitura agregada — menor risco, mas mesmo padrão)
