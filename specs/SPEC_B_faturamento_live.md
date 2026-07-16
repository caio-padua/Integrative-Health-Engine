# SPEC B — Faturamento Live funcional

**Data:** 16/07/2026
**Método:** Paxter Loop

## Objetivo
Fazer a aba "Faturamento Live" em `/monetizar` retornar dados reais de `cobrancas_mensais_modulos` + `unidade_eventos_ledger`, sem erro 500 e com valores corretos.

## Contexto técnico (auditado)
- Componente `FaturamentoLive` chama `GET /api/ledger/faturamento-live?competencia=YYYY-MM` — rota JÁ EXISTE
- A rota usa `LEFT JOIN unidade_eventos_ledger` (tabela existe, 0 eventos ainda) + subquery `JOIN modulos_padcon` para `total_modulos`
- `modulos_padcon` tem dados (M1–M7), mas o correto para licenciamento IHE é `modulos_sistema`
- `cobrancas_mensais_modulos` tem 100 registros reais — NÃO está sendo usada no cálculo atual
- A tela espera: `{ competencia, totaisPorUnidade: [{unidade_id, unidade_nome, total_eventos, total_modulos}], detalhe: [{...}] }`

## Requisitos exatos
1. Criar rota complementar `GET /api/cobrancas-modulos/resumo?competencia=YYYY-MM` que agrega `cobrancas_mensais_modulos` por empresa → retorna `{unidade_id, total_valor, qtd_modulos, status_geral}`
2. Modificar a subquery `total_modulos` em `/api/ledger/faturamento-live` para usar `modulos_sistema` (não `modulos_padcon`); se `cobrancas_mensais_modulos` tiver dados para a competência, usar a soma de lá; senão, calcular pelos módulos ativos × preço
3. A rota deve retornar dados mesmo com `unidade_eventos_ledger` vazio (LEFT JOIN já garante isso)
4. Criar tela `/admin/cobrancas` que exibe `cobrancas_mensais_modulos` em tabela: empresa, módulo, competência, valor, status (pago/pendente/inadimplente), vencimento
5. Rota na App.tsx: `<Route path="/admin/cobrancas" component={AdminCobrancasPage} />`
6. Link no menu lateral: "Cobranças" no grupo "Admin"

## Casos extremos
- Competência sem nenhum registro → retornar arrays vazios (não 500)
- Empresa sem módulos ativos → total_modulos = 0
- `cobrancas_mensais_modulos` com valor NULL → tratar como 0

## Definição de PRONTO
- [ ] GET `/api/ledger/faturamento-live?competencia=2026-07` retorna 200 com JSON válido
- [ ] `totaisPorUnidade` tem uma entrada por empresa ativa (exceto arquivadas)
- [ ] Valores de `total_modulos` batem com a soma de preços dos módulos ativos de `modulos_sistema`
- [ ] Tela `/monetizar` aba "Faturamento Live" renderiza sem erro
- [ ] Tela `/admin/cobrancas` lista os 100 registros de `cobrancas_mensais_modulos`
- [ ] Link "Cobranças" visível no menu

## Linhas vermelhas
- NÃO alterar estrutura de `cobrancas_mensais_modulos`
- NÃO quebrar as abas existentes de `/monetizar`
