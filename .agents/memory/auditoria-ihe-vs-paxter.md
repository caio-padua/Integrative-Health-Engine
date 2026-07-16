---
name: Auditoria IHE vs PAXTER — arquitetura multi-tenant
description: Resultados da auditoria profunda de 16/07/2026 comparando IHE (Pawards) com a visão PAXTER SaaS. Decisões e separações arquiteturais validadas.
---

## O que está correto no IHE (não mudar)

- `unidade_id` como chave de tenant: CORRETO. Presente em ~90% das tabelas de negócio.
- `resolverFiltroTenant` + `resolverFiltroTenantEstrito`: middleware de isolamento funcional.
- `perfil_plataforma: platform_owner / tenant_admin / tenant_user` já existe em `usuarios`.
- `platform_owner` bypassa filtro de tenant: implementado.
- `contrato_clinica` + `modulos_sistema`: tabelas relacionais já existem (NÃO é JSONB).
- `/plataforma/*` routes já formam a camada CEO (platform_owner) corretamente.

## As 3 taxonomias de telas (NUNCA misturar)

| Camada | Guard | Exemplos |
|---|---|---|
| PAXTER Admin (CEO) | perfil_plataforma === 'platform_owner' | /admin/*, /plataforma/*, /licenciamento |
| Tenant Ops (clínica) | useClinic() obrigatório | /pacientes, /ras, /agenda, /cockpit |
| Catálogo Global | só autenticação | /substancias, /catalogo, /protocolos |

## Falhas identificadas

- **Falha A**: 80+ telas sem guard de perfil declarado — qualquer tenant acessa URL direta.
- **Falha B**: Unidades 16–20 são tenants PAXTER sem contrato_clinica (fantasmas).
- **Falha C**: Craniotomia/Sinapses é ectoplasma — editor visual sem persistência real.

## PAXTER vs PAWARDS (distinção documentada)

- PAXTER = versão single-clinic simplificada (ICP-Brasil nativo)
- PAWARDS = versão multi-unidade/consultoria (governa múltiplas clínicas)
- Documentado em `docs/dr-replit/PARA_PAXTER/03_ANALISE_RIGOROSA_PAWARDS_VS_PAXTER_26.06.22.md`

## Compartilhamento cross-tenant

Design aprovado: tabela `permissoes_compartilhamento` com:
  empresa_origem_id, empresa_destino_id, tipo_dado, ativo, autorizado_por_id (platform_owner only)
Default = bloqueado. Toggle só na tela CEO.

**Why:** CEO pediu isolamento total por default com toggle manual para cada par de empresas.

## Resposta ao Manager (carta 04)

- Craniotomia no IHE = ectoplasma. Referência real = `/pacientes/:id/cockpit`.
- Agentes IA: 7 tabelas (`agentes_clinica`, `agentes_personalidade`, etc.) — catálogo estático com motor de escrita configurável por parâmetros.
- Monetização IHE: `contrato_clinica` + `modulos_sistema` (relacionais).
- Skip-logic da anamnese: NÃO copiar hardcoded — acopla estrutura de perguntas.

## Manager auditado (16/07/2026)

- Manager corrigiu P1 (token exposure) e P5 (CPF masking) antes do IHE.
- Gap crítico restante no Manager: `clients` sem `empresa_id` → isolamento de pacientes impossível.
- `modulosAtivos` como JSONB no Manager: regredir vs `modulos_sistema` relacional do IHE.
